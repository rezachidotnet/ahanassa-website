import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import { applyIncrementalWatermarkMargin } from "./sync-safety";

/**
 * Durable Scheduled Catalog Synchronization state — DB_PUBLIC-backed,
 * `cloudflare:workers`-dependent (mirrors `lib/catalog/repository.ts`'s own
 * role: never unit-tested directly, verified live against real staging D1
 * instead — DOCUMENT_AUDIT_REPORT.md DAR-040,
 * docs/CATALOG_SYNC_OPERATIONS.md).
 *
 * Single-row (`id = 'catalog'`) state table — `migrations_public/0003_catalog_sync_state.sql`.
 */

const SINGLETON_ID = "catalog";

export type CatalogSyncType = "incremental" | "full";

export interface CatalogSyncState {
  lastAttemptedAt: string | null;
  lastAttemptedType: CatalogSyncType | null;
  lastSuccessAt: string | null;
  lastSuccessType: CatalogSyncType | null;
  lastIncrementalWatermark: string | null;
  lastFullReconciliationAt: string | null;
  lastFullUpstreamCount: number | null;
  consecutiveFailureCount: number;
  lastFailureAt: string | null;
  lastFailureType: CatalogSyncType | null;
  lastFailureReasonCode: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
}

interface CatalogSyncStateRow {
  id: string;
  last_attempted_at: string | null;
  last_attempted_type: CatalogSyncType | null;
  last_success_at: string | null;
  last_success_type: CatalogSyncType | null;
  last_incremental_watermark: string | null;
  last_full_reconciliation_at: string | null;
  last_full_upstream_count: number | null;
  consecutive_failure_count: number;
  last_failure_at: string | null;
  last_failure_type: CatalogSyncType | null;
  last_failure_reason_code: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
}

function mapRow(row: CatalogSyncStateRow): CatalogSyncState {
  return {
    lastAttemptedAt: row.last_attempted_at,
    lastAttemptedType: row.last_attempted_type,
    lastSuccessAt: row.last_success_at,
    lastSuccessType: row.last_success_type,
    lastIncrementalWatermark: row.last_incremental_watermark,
    lastFullReconciliationAt: row.last_full_reconciliation_at,
    lastFullUpstreamCount: row.last_full_upstream_count,
    consecutiveFailureCount: row.consecutive_failure_count,
    lastFailureAt: row.last_failure_at,
    lastFailureType: row.last_failure_type,
    lastFailureReasonCode: row.last_failure_reason_code,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export async function getCatalogSyncState(): Promise<CatalogSyncState> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT * FROM catalog_sync_state WHERE id = ?`).bind(SINGLETON_ID).first<CatalogSyncStateRow>();
  if (!row) {
    // The migration inserts this singleton row unconditionally — reaching
    // here means migrations_public/0003_catalog_sync_state.sql was never
    // applied to this environment, a deployment/ops error, not a runtime
    // condition to silently work around.
    throw new Error("catalog_sync_state singleton row missing — migrations_public/0003_catalog_sync_state.sql not applied to this DB_PUBLIC");
  }
  return mapRow(row);
}

export type LeaseAcquireResult = { acquired: true; runId: string } | { acquired: false };

/**
 * Atomic, DB-backed lease acquisition (docs/CATALOG_SYNC_OPERATIONS.md
 * "Concurrency") — a single conditional `UPDATE`, which D1/SQLite executes
 * atomically per-statement: `changes = 0` unambiguously means another,
 * still-valid lease already exists; `changes = 1` means this call
 * definitely won it. No read-then-write race window exists because there is
 * no separate read step — the condition is evaluated as part of the same
 * write. A stale (expired) lease is always recoverable — the `WHERE`
 * clause's `lease_expires_at < ?` branch treats it as free.
 */
export async function acquireCatalogSyncLease(leaseDurationMs: number): Promise<LeaseAcquireResult> {
  const db = getPublicDb();
  const runId = ulid();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();

  const result = await db
    .prepare(`UPDATE catalog_sync_state SET lease_owner = ?, lease_expires_at = ?, updated_at = ? WHERE id = ? AND (lease_owner IS NULL OR lease_expires_at < ?)`)
    .bind(runId, expiresAt, nowIso, SINGLETON_ID, nowIso)
    .run();

  return result.meta.changes > 0 ? { acquired: true, runId } : { acquired: false };
}

/** Only releases the lease if `runId` still owns it — a run whose lease already expired and was taken over by another delivery must never clear the new owner's lease. */
export async function releaseCatalogSyncLease(runId: string): Promise<void> {
  const db = getPublicDb();
  await db
    .prepare(`UPDATE catalog_sync_state SET lease_owner = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_owner = ?`)
    .bind(new Date().toISOString(), SINGLETON_ID, runId)
    .run();
}

export async function recordSyncAttemptStart(type: CatalogSyncType): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE catalog_sync_state SET last_attempted_at = ?, last_attempted_type = ?, updated_at = ? WHERE id = ?`)
    .bind(now, type, now, SINGLETON_ID)
    .run();
}

export interface RecordSuccessInput {
  totalSeen: number;
  /** Present only when at least one item was actually observed — an empty incremental result must never erase the previous good watermark. */
  maxObservedUpdatedAt?: string;
}

/**
 * Records a successful run. The durable watermark is advanced from
 * `maxObservedUpdatedAt` after EITHER a successful full OR incremental run
 * — a full reconciliation inherently re-observes the entire active catalog,
 * so it is exactly as valid a "we've now seen up to at least this point"
 * source as an incremental pull, and this is also what breaks the
 * otherwise-circular dependency where incremental sync could never run for
 * the very first time without a prior watermark to start from (the first
 * successful full reconciliation establishes it). The watermark is
 * advanced ONLY when a real `maxObservedUpdatedAt` was produced (i.e. the
 * pull was non-empty) — an empty "nothing changed upstream" incremental
 * result is still a genuine success (resets the failure streak) but must
 * never overwrite the last real watermark with nothing
 * (docs/CATALOG_SYNC_OPERATIONS.md "Watermark safety"). This function is
 * only ever called after the entire application has already succeeded —
 * the watermark can never advance before that.
 */
export async function recordSyncSuccess(type: CatalogSyncType, input: RecordSuccessInput): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  const watermark = input.maxObservedUpdatedAt ? applyIncrementalWatermarkMargin(input.maxObservedUpdatedAt) : null;

  if (type === "full") {
    if (watermark) {
      await db
        .prepare(
          `UPDATE catalog_sync_state SET last_success_at = ?, last_success_type = 'full', last_full_reconciliation_at = ?, last_full_upstream_count = ?, last_incremental_watermark = ?, consecutive_failure_count = 0, updated_at = ? WHERE id = ?`,
        )
        .bind(now, now, input.totalSeen, watermark, now, SINGLETON_ID)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE catalog_sync_state SET last_success_at = ?, last_success_type = 'full', last_full_reconciliation_at = ?, last_full_upstream_count = ?, consecutive_failure_count = 0, updated_at = ? WHERE id = ?`,
        )
        .bind(now, now, input.totalSeen, now, SINGLETON_ID)
        .run();
    }
    return;
  }

  if (watermark) {
    await db
      .prepare(
        `UPDATE catalog_sync_state SET last_success_at = ?, last_success_type = 'incremental', last_incremental_watermark = ?, consecutive_failure_count = 0, updated_at = ? WHERE id = ?`,
      )
      .bind(now, watermark, now, SINGLETON_ID)
      .run();
  } else {
    await db
      .prepare(`UPDATE catalog_sync_state SET last_success_at = ?, last_success_type = 'incremental', consecutive_failure_count = 0, updated_at = ? WHERE id = ?`)
      .bind(now, now, SINGLETON_ID)
      .run();
  }
}

/** Records a failed run. Deliberately never touches `last_incremental_watermark`/`last_full_upstream_count` — the last-good values remain exactly as they were, usable for the next retry. */
export async function recordSyncFailure(type: CatalogSyncType, reasonCode: string): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE catalog_sync_state SET last_failure_at = ?, last_failure_type = ?, last_failure_reason_code = ?, consecutive_failure_count = consecutive_failure_count + 1, updated_at = ? WHERE id = ?`,
    )
    .bind(now, type, reasonCode, now, SINGLETON_ID)
    .run();
}
