import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import type { ProcessingLocale } from "./odoo-api-client";

/**
 * Durable Processing sync state — DB_PUBLIC-backed, `cloudflare:workers`-
 * dependent (mirrors `lib/catalog/sync-state-repository.ts`'s own role:
 * never unit-tested directly against real D1 in this environment — this
 * repo's established convention for D1-touching orchestration code, see
 * that file's own header). Single-row (`id = 'processing'`) state table —
 * `migrations_public/0007_processing_groups.sql`.
 */

const SINGLETON_ID = "processing";

export interface ProcessingSyncState {
  lastAttemptedAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailureCount: number;
  lastFailureAt: string | null;
  lastFailureReasonCode: string | null;
  etagFa: string | null;
  etagEn: string | null;
  etagAr: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
}

interface ProcessingSyncStateRow {
  id: string;
  last_attempted_at: string | null;
  last_success_at: string | null;
  consecutive_failure_count: number;
  last_failure_at: string | null;
  last_failure_reason_code: string | null;
  etag_fa: string | null;
  etag_en: string | null;
  etag_ar: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
}

function mapRow(row: ProcessingSyncStateRow): ProcessingSyncState {
  return {
    lastAttemptedAt: row.last_attempted_at,
    lastSuccessAt: row.last_success_at,
    consecutiveFailureCount: row.consecutive_failure_count,
    lastFailureAt: row.last_failure_at,
    lastFailureReasonCode: row.last_failure_reason_code,
    etagFa: row.etag_fa,
    etagEn: row.etag_en,
    etagAr: row.etag_ar,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
  };
}

function etagColumn(locale: ProcessingLocale): "etag_fa" | "etag_en" | "etag_ar" {
  return locale === "fa" ? "etag_fa" : locale === "en" ? "etag_en" : "etag_ar";
}

export function etagForLocale(state: ProcessingSyncState, locale: ProcessingLocale): string | null {
  return locale === "fa" ? state.etagFa : locale === "en" ? state.etagEn : state.etagAr;
}

export async function getProcessingSyncState(): Promise<ProcessingSyncState> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT * FROM processing_sync_state WHERE id = ?`).bind(SINGLETON_ID).first<ProcessingSyncStateRow>();
  if (!row) {
    throw new Error("processing_sync_state singleton row missing — migrations_public/0007_processing_groups.sql not applied to this DB_PUBLIC");
  }
  return mapRow(row);
}

export type LeaseAcquireResult = { acquired: true; runId: string } | { acquired: false };

/** Same atomic single-UPDATE lease pattern as `lib/catalog/sync-state-repository.ts#acquireCatalogSyncLease` — see that file for the full reasoning. */
export async function acquireProcessingSyncLease(leaseDurationMs: number): Promise<LeaseAcquireResult> {
  const db = getPublicDb();
  const runId = ulid();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();

  const result = await db
    .prepare(`UPDATE processing_sync_state SET lease_owner = ?, lease_expires_at = ?, updated_at = ? WHERE id = ? AND (lease_owner IS NULL OR lease_expires_at < ?)`)
    .bind(runId, expiresAt, nowIso, SINGLETON_ID, nowIso)
    .run();

  return result.meta.changes > 0 ? { acquired: true, runId } : { acquired: false };
}

export async function releaseProcessingSyncLease(runId: string): Promise<void> {
  const db = getPublicDb();
  await db
    .prepare(`UPDATE processing_sync_state SET lease_owner = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_owner = ?`)
    .bind(new Date().toISOString(), SINGLETON_ID, runId)
    .run();
}

export async function recordProcessingSyncAttemptStart(): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  await db.prepare(`UPDATE processing_sync_state SET last_attempted_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, SINGLETON_ID).run();
}

/**
 * Records overall run success (task §13) and, independently, the fresh
 * ETag for whichever locales actually returned a new `200` this run (a
 * locale that returned `304`/was skipped keeps its previously stored
 * ETag — never overwritten with `undefined`/null, matching
 * `lib/catalog/sync-state-repository.ts#recordSyncSuccess`'s own
 * "never erase a known-good value with nothing" convention for its
 * watermark).
 */
export async function recordProcessingSyncSuccess(freshEtags: Partial<Record<ProcessingLocale, string>>): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();

  const sets = ["last_success_at = ?", "consecutive_failure_count = 0", "updated_at = ?"];
  const binds: unknown[] = [now, now];
  for (const locale of Object.keys(freshEtags) as ProcessingLocale[]) {
    const etag = freshEtags[locale];
    if (!etag) continue;
    sets.push(`${etagColumn(locale)} = ?`);
    binds.push(etag);
  }
  binds.push(SINGLETON_ID);

  await db.prepare(`UPDATE processing_sync_state SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
}

/**
 * Records a run in which at least one locale failed. `freshEtags` carries
 * any OTHER locale's genuinely successful ETag from the same run — a
 * sibling locale's failure must never discard a locale that itself
 * succeeded (task's per-locale failure-isolation requirement, §14/§25 —
 * "failure isolation"). The locales that failed simply keep whatever ETag
 * they already had, so the next run retries them with the same
 * conditional-GET value.
 */
export async function recordProcessingSyncFailure(reasonCode: string, freshEtags: Partial<Record<ProcessingLocale, string>> = {}): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();

  const sets = ["last_failure_at = ?", "last_failure_reason_code = ?", "consecutive_failure_count = consecutive_failure_count + 1", "updated_at = ?"];
  const binds: unknown[] = [now, reasonCode, now];
  for (const locale of Object.keys(freshEtags) as ProcessingLocale[]) {
    const etag = freshEtags[locale];
    if (!etag) continue;
    sets.push(`${etagColumn(locale)} = ?`);
    binds.push(etag);
  }
  binds.push(SINGLETON_ID);

  await db.prepare(`UPDATE processing_sync_state SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
}
