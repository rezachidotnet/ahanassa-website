import { getAppEnv } from "@/lib/env";
import { runProcessingLocaleSync, type ProcessingLocaleSyncResult } from "./sync-runner";
import {
  acquireProcessingSyncLease,
  etagForLocale,
  getProcessingSyncState,
  recordProcessingSyncAttemptStart,
  recordProcessingSyncFailure,
  recordProcessingSyncSuccess,
  releaseProcessingSyncLease,
} from "./sync-state-repository";
import type { ProcessingLocale } from "./odoo-api-client";

/**
 * Scheduled Processing Groups synchronization coordinator — mirrors
 * `lib/catalog/scheduled-sync.ts`'s role: lease-guarded concurrency +
 * durable state read/write + a structured observability summary, wrapping
 * `lib/processing/sync-runner.ts`'s per-locale primitive without
 * reimplementing fetch/validate/plan/apply.
 *
 * Background execution (task §14): deliberately NOT registered as its own
 * new Cloudflare Cron Trigger. `wrangler.jsonc`'s own comments document a
 * real prior incident (2026-09-03) where the account's Workers Free plan
 * 5-Cron-Trigger cap was exceeded mid-deploy; production already runs
 * exactly 3 Cron Triggers today. Adding 1-2 more dedicated Processing
 * triggers would push the account to (or past) that same cap again for a
 * sync job covering a handful of rows — exactly the "unnecessarily complex
 * pipeline for three rows" task §14 itself warns against. Instead,
 * `workers/entry.ts#scheduled()` calls `runScheduledProcessingSync()`
 * alongside the existing Catalog sync inside the SAME two already-registered
 * cron branches (`CATALOG_INCREMENTAL_CRON` / `CATALOG_FULL_RECONCILIATION_CRON`)
 * — see that file's updated comment for the exact wiring and the explicit
 * failure-isolation guarantee (one job's failure/throw must never prevent
 * the other from running).
 *
 * Callers: `workers/entry.ts#scheduled()` only — never a public HTTP route
 * (same rule `lib/catalog/scheduled-sync.ts` follows).
 */

const LEASE_DURATION_MS = 10 * 60 * 1000; // generous vs. an expected few-second run (3 locales x a handful of rows each)
const LOCALES: ProcessingLocale[] = ["fa", "en", "ar"];

export interface ScheduledProcessingSyncSummary {
  environment: string;
  startedAt: string;
  completedAt: string;
  status: "ok" | "partial_failure" | "skipped_lease_held" | "failed";
  locales?: ProcessingLocaleSyncResult[];
}

function logSummary(summary: ScheduledProcessingSyncSummary): void {
  // A single structured line, no secrets, no response bodies — matches
  // lib/catalog/scheduled-sync.ts#logSummary's own convention.
  console.log(`PROCESSING_SYNC ${JSON.stringify(summary)}`);
}

/**
 * Runs one Processing Groups synchronization pass across all three
 * locales, under a single DB-backed lease.
 *
 * Per-locale failure isolation (task §14/§25): each locale's fetch/apply is
 * independent — `Promise.allSettled`-equivalent sequential execution here
 * (never `Promise.all`, which would let one locale's rejection abort
 * others already in flight) — one locale failing never prevents another
 * locale's genuine success from being applied to DB_PUBLIC or having its
 * fresh ETag recorded.
 *
 * Concurrency: if another run currently holds the lease, this call returns
 * `status: "skipped_lease_held"` immediately — never a queued wait, never a
 * second concurrent fetch/apply, identical convention to
 * `lib/catalog/scheduled-sync.ts#runScheduledCatalogSync`.
 */
export async function runScheduledProcessingSync(): Promise<ScheduledProcessingSyncSummary> {
  const environment = getAppEnv();
  const startedAt = new Date().toISOString();

  const lease = await acquireProcessingSyncLease(LEASE_DURATION_MS);
  if (!lease.acquired) {
    const summary: ScheduledProcessingSyncSummary = { environment, startedAt, completedAt: new Date().toISOString(), status: "skipped_lease_held" };
    logSummary(summary);
    return summary;
  }

  try {
    await recordProcessingSyncAttemptStart();
    const state = await getProcessingSyncState();

    const results: ProcessingLocaleSyncResult[] = [];
    for (const locale of LOCALES) {
      // Sequential, not parallel — D1/the Worker's per-request subrequest
      // budget is not a concern for 3 small requests, and sequential
      // execution keeps each locale's try/catch-free result fully
      // independent and easy to reason about/log.
      results.push(await runProcessingLocaleSync(locale, etagForLocale(state, locale)));
    }

    const failedLocales = results.filter((r) => r.status === "failed");
    const freshEtags: Partial<Record<ProcessingLocale, string>> = {};
    for (const r of results) {
      if (r.status === "ok" && r.etag) freshEtags[r.locale] = r.etag;
    }

    if (failedLocales.length === 0) {
      await recordProcessingSyncSuccess(freshEtags);
    } else {
      // At least one locale failed — record failure (increments the
      // failure counter, keeps the failed locale's own ETag unchanged for
      // its next retry) while still persisting any OTHER locale's genuine
      // fresh ETag from this same run (sync-state-repository.ts's own
      // isolation guarantee).
      const primaryReasonCode = failedLocales[0].reasonCode ?? "PROCESSING_SYNC_UNKNOWN_FAILURE";
      await recordProcessingSyncFailure(primaryReasonCode, freshEtags);
    }

    const summary: ScheduledProcessingSyncSummary = {
      environment,
      startedAt,
      completedAt: new Date().toISOString(),
      status: failedLocales.length === 0 ? "ok" : failedLocales.length === results.length ? "failed" : "partial_failure",
      locales: results,
    };
    logSummary(summary);
    return summary;
  } finally {
    await releaseProcessingSyncLease(lease.runId);
  }
}
