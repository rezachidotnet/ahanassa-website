import { getAppEnv } from "@/lib/env";
import { runFullCatalogSync, runIncrementalCatalogSync, type CatalogSyncResult } from "./sync-runner";
import {
  acquireCatalogSyncLease,
  getCatalogSyncState,
  recordSyncAttemptStart,
  recordSyncFailure,
  recordSyncSuccess,
  releaseCatalogSyncLease,
  type CatalogSyncType,
} from "./sync-state-repository";

/**
 * Scheduled Catalog Synchronization coordinator — the ONLY new
 * orchestration layer this integration adds (DOCUMENT_AUDIT_REPORT.md
 * DAR-040, docs/CATALOG_SYNC_OPERATIONS.md). It does not reimplement
 * fetch/plan/apply logic — every actual sync operation is delegated to the
 * existing, already-proven `lib/catalog/sync-runner.ts` primitives
 * (`runIncrementalCatalogSync`/`runFullCatalogSync`, unchanged except for
 * the plausibility guard added directly to `runFullCatalogSync` itself).
 * This module only adds: lease-guarded concurrency, durable state
 * read/write (`lib/catalog/sync-state-repository.ts`), and a structured
 * observability summary.
 *
 * Callers: `workers/entry.ts#scheduled()` (Cron-triggered) and
 * `scripts/catalog-sync.ts` (the manual operator path) — never a public
 * HTTP route.
 */

const LEASE_DURATION_MS = 10 * 60 * 1000; // generous vs. an expected multi-second run; short enough that a crashed run recovers well before the next scheduled invocation (every 3h/daily)

export interface ScheduledSyncSummary {
  environment: string;
  syncType: CatalogSyncType;
  startedAt: string;
  completedAt: string;
  status: "ok" | "skipped_lease_held" | "not_configured" | "failed";
  upstreamObservedCount?: number;
  created?: number;
  updated?: number;
  deactivated?: number;
  unchanged?: number;
  watermarkBefore: string | null;
  watermarkAfter?: string | null;
  reasonCode?: string;
}

function logSummary(summary: ScheduledSyncSummary): void {
  // A single structured line, no secrets, no response bodies — Stage G.
  console.log(`CATALOG_SYNC ${JSON.stringify(summary)}`);
}

/**
 * Runs one Catalog synchronization pass (`incremental` or `full`) under the
 * DB-backed lease, recording durable before/after state either way.
 *
 * Concurrency: if another run currently holds the lease (a duplicate
 * scheduled delivery, or an overlapping incremental/full run), this call
 * returns `status: "skipped_lease_held"` immediately without touching
 * anything else — never a queued wait, never a second concurrent
 * fetch/apply. The lease always has a TTL (`LEASE_DURATION_MS`), so a
 * crashed execution can never block Catalog sync forever — the next
 * scheduled invocation (or a manual run) recovers automatically once the
 * lease expires.
 */
export async function runScheduledCatalogSync(type: CatalogSyncType): Promise<ScheduledSyncSummary> {
  const environment = getAppEnv();
  const startedAt = new Date().toISOString();
  const stateBefore = await getCatalogSyncState();

  const lease = await acquireCatalogSyncLease(LEASE_DURATION_MS);
  if (!lease.acquired) {
    const summary: ScheduledSyncSummary = {
      environment,
      syncType: type,
      startedAt,
      completedAt: new Date().toISOString(),
      status: "skipped_lease_held",
      watermarkBefore: stateBefore.lastIncrementalWatermark,
    };
    logSummary(summary);
    return summary;
  }

  try {
    await recordSyncAttemptStart(type);

    let result: CatalogSyncResult;
    if (type === "full") {
      result = await runFullCatalogSync();
    } else if (!stateBefore.lastIncrementalWatermark) {
      // No prior watermark yet — the very first successful FULL
      // reconciliation (its own independent daily cadence) is what
      // establishes both the catalog and a real watermark going forward;
      // silently substituting a full pull here would blur the two job
      // types' distinct semantics. Not a failure — a normal, expected,
      // transient pre-first-full-run state.
      result = { status: "not_configured", totalSeen: 0, created: 0, updated: 0, deactivated: 0, unchanged: 0, reasonCode: "CATALOG_SYNC_NO_WATERMARK_YET" };
    } else {
      result = await runIncrementalCatalogSync(stateBefore.lastIncrementalWatermark);
    }

    if (result.status === "ok") {
      await recordSyncSuccess(type, { totalSeen: result.totalSeen, maxObservedUpdatedAt: result.maxObservedUpdatedAt });
      // Both full and incremental successes can advance the watermark
      // (recordSyncSuccess — a full reconciliation re-observes everything,
      // so it is exactly as valid a watermark source, and is what
      // establishes the very first watermark before any incremental run
      // has ever succeeded). Re-read only when something could have
      // changed, to avoid an unnecessary extra read otherwise.
      const watermarkAfter = result.maxObservedUpdatedAt ? (await getCatalogSyncState()).lastIncrementalWatermark : stateBefore.lastIncrementalWatermark;
      const summary: ScheduledSyncSummary = {
        environment,
        syncType: type,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "ok",
        upstreamObservedCount: result.totalSeen,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        unchanged: result.unchanged,
        watermarkBefore: stateBefore.lastIncrementalWatermark,
        watermarkAfter,
      };
      logSummary(summary);
      return summary;
    }

    if (result.status === "not_configured") {
      const summary: ScheduledSyncSummary = {
        environment,
        syncType: type,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "not_configured",
        reasonCode: result.reasonCode,
        watermarkBefore: stateBefore.lastIncrementalWatermark,
      };
      logSummary(summary);
      return summary;
    }

    // status === "failed" — includes: pagination failure (fetchAllPages),
    // the empty-upstream/implausible-drop guard, or any other propagated
    // reasonCode. DB_PUBLIC's Catalog rows are structurally untouched in
    // every one of these cases (sync-runner.ts never calls applyPlan on a
    // failed/implausible pull) — only this state row's failure counters
    // change.
    await recordSyncFailure(type, result.reasonCode ?? "CATALOG_SYNC_UNKNOWN_FAILURE");
    const summary: ScheduledSyncSummary = {
      environment,
      syncType: type,
      startedAt,
      completedAt: new Date().toISOString(),
      status: "failed",
      upstreamObservedCount: result.totalSeen,
      reasonCode: result.reasonCode,
      watermarkBefore: stateBefore.lastIncrementalWatermark,
    };
    logSummary(summary);
    return summary;
  } finally {
    await releaseCatalogSyncLease(lease.runId);
  }
}
