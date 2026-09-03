/**
 * Continuous exponential time-decay — this task's §13-22 explicit preference
 * over hard day-boundary buckets. Pure, no D1/Date.now() dependency (the
 * caller supplies "now" so this stays deterministically testable).
 */

/**
 * Half-life in days: after this many days, a signal's weight is exactly
 * half. Deliberately conservative and explicit, not fitted/tuned against
 * any real data (this task's own "constants must be explicit/documented/
 * conservative, not fake-tuned"). 30 days is chosen because it is roughly
 * one B2B purchasing/quoting cycle for steel procurement — old enough that
 * a single RFQ six months ago should barely move today's ranking, recent
 * enough that a real current demand spike is reflected within days.
 */
export const DEMAND_HALF_LIFE_DAYS = 30;

/** Weight in (0, 1] — 1.0 at ageInDays=0, asymptotically approaching 0, never negative, never NaN for a valid non-negative age. */
export function exponentialDecayWeight(ageInDays: number, halfLifeDays: number = DEMAND_HALF_LIFE_DAYS): number {
  if (!Number.isFinite(ageInDays) || ageInDays < 0) return 0;
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 0;
  return Math.pow(0.5, ageInDays / halfLifeDays);
}

/** Convenience: age in whole days between an ISO timestamp and "now" (caller-supplied, in ms since epoch) — never negative (a clock-skewed future timestamp is treated as age 0, not a negative/boosted age). */
export function ageInDaysSince(occurredAtIso: string, nowMs: number): number {
  const occurredMs = Date.parse(occurredAtIso);
  if (!Number.isFinite(occurredMs)) return Number.POSITIVE_INFINITY;
  const diffMs = nowMs - occurredMs;
  return diffMs <= 0 ? 0 : diffMs / (24 * 60 * 60 * 1000);
}
