/**
 * Pure Catalog Sync Health evaluation — this task's §3 "one acceptable gap"
 * (Catalog Sync Health observability: last_success_at, failure count, age
 * since success). No external alerting vendor integration — a read
 * primitive for whatever surface (internal CLI/log line/future admin view)
 * chooses to consume it. Split from `sync-state-repository.ts` (D1/`cloudflare:workers`-touching)
 * the same way `sync.ts` is split from `repository.ts`, so this stays
 * directly unit-testable.
 */

export interface CatalogSyncHealth {
  lastSuccessAt: string | null;
  /** `null` when a successful sync has never run at all. */
  ageSinceSuccessMs: number | null;
  consecutiveFailureCount: number;
  lastFailureReasonCode: string | null;
  /** No successful sync in over 24h, or 3+ consecutive failures — a conservative, documented threshold, not tuned against real incident data (none exists yet). */
  isHealthy: boolean;
}

const STALE_SYNC_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const UNHEALTHY_FAILURE_STREAK = 3;

export interface CatalogSyncHealthInput {
  lastSuccessAt: string | null;
  consecutiveFailureCount: number;
  lastFailureReasonCode: string | null;
}

export function evaluateCatalogSyncHealth(state: CatalogSyncHealthInput, nowMs: number): CatalogSyncHealth {
  const ageSinceSuccessMs = state.lastSuccessAt ? nowMs - Date.parse(state.lastSuccessAt) : null;
  const isStale = ageSinceSuccessMs === null || ageSinceSuccessMs > STALE_SYNC_THRESHOLD_MS;
  const isFailing = state.consecutiveFailureCount >= UNHEALTHY_FAILURE_STREAK;
  return {
    lastSuccessAt: state.lastSuccessAt,
    ageSinceSuccessMs,
    consecutiveFailureCount: state.consecutiveFailureCount,
    lastFailureReasonCode: state.lastFailureReasonCode,
    isHealthy: !isStale && !isFailing,
  };
}
