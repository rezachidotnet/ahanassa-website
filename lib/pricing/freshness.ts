import { FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS } from "./normalize.ts";
import { countMissedExpectedCycles, type ProviderPublicationPolicy } from "./provider-policy.ts";
import type { FreshnessState } from "./types.ts";

/**
 * The definitive Homepage freshness classifier (PRICE-P2,
 * PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md §D/§E, spec §24.2). Pure,
 * deterministic, D1-free, React-free, provider-name-free — every input it
 * needs is passed in explicitly, including `now` (never reads
 * `Date.now()`/the system clock itself), so it is fully testable without
 * the wall clock and safely importable under plain `node --test`.
 *
 * Supersedes the legacy binary fresh/stale model this task replaces
 * (`lib/pricing/quote-selection.ts`'s old flat `STALE_THRESHOLD_MS = 24h`
 * boolean) with the frozen 4-state model:
 *
 *   FRESH       — 0 missed expected publication cycles
 *   AGING       — exactly 1 missed expected publication cycle
 *   STALE       — 2+ missed expected publication cycles
 *   UNAVAILABLE — freshness cannot be safely established at all (no
 *                 policy, malformed/impossible timestamp) — never a
 *                 universal default of any kind.
 *
 * The actual missed-cycle arithmetic (cadence-aware, timezone-aware,
 * weekday-aware for day-granularity policies) lives in
 * `lib/pricing/provider-policy.ts#countMissedExpectedCycles` — this module
 * owns only the FRESH/AGING/STALE/UNAVAILABLE decision boundary and the
 * timestamp-authority/fail-closed rules around it.
 */

export interface ClassifyQuoteFreshnessInput {
  /** Injected current time — production callers pass `new Date()`; tests pass a fixed value. Never read from the system clock inside this function. */
  now: Date;
  /** The freshness AUTHORITY (task §5) — the provider's own effective/as-of time, when present. */
  sourceTimestamp: string | null;
  /** Ingestion/audit timestamp — used ONLY as a fallback when `sourceTimestamp` is genuinely absent, exactly as `lib/pricing/repository.ts`'s pre-P2 behavior already did. Never overrides a present `sourceTimestamp`, and re-syncing an unchanged quote (which only advances `syncedAt`) can never make an old `sourceTimestamp` look fresher than it is — this function only ever reads `syncedAt` when `sourceTimestamp` is `null`. */
  syncedAt: string;
  /** The quote's provider's publication-cadence policy — `null` (missing/unresolvable policy) always classifies as UNAVAILABLE, never a universal fallback threshold. */
  policy: ProviderPublicationPolicy | null;
}

export function classifyQuoteFreshness(input: ClassifyQuoteFreshnessInput): FreshnessState {
  if (!input.policy) {
    // Missing/invalid provider policy (task §14/§17) — never the old 24h
    // rule, never any other universal default. A configured benchmark
    // whose provider has no valid policy is simply not classifiable.
    return "unavailable";
  }

  const effectiveTimestampRaw = input.sourceTimestamp ?? input.syncedAt;
  const effectiveMs = Date.parse(effectiveTimestampRaw);
  if (Number.isNaN(effectiveMs)) {
    // Malformed timestamp — fail closed (task §5/§14), never guessed.
    return "unavailable";
  }

  if (effectiveMs > input.now.getTime() + FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS) {
    // An impossible/materially-future effective timestamp (task §6) —
    // `lib/pricing/normalize.ts` already rejects this at ingestion time
    // using the exact same tolerance, so a genuinely-normalized quote
    // should never reach here in this state at all; this is a defensive
    // fail-closed check for this function's own direct callers (e.g.
    // future tests, or a future caller that doesn't route through
    // normalize.ts), not a second, looser tolerance invented for this
    // module. Never silently treated as fresh.
    return "unavailable";
  }

  const missedCycles = countMissedExpectedCycles(input.policy, new Date(effectiveMs), input.now);
  if (missedCycles === null) {
    // Unsupported/unrecognized cadence unit (task §14 "unsupported
    // cadence") — should be unreachable given
    // `validateProviderPublicationPolicy` already rejects this shape, but
    // this function never assumes its `policy` input was necessarily
    // constructed through that validator.
    return "unavailable";
  }

  if (missedCycles === 0) return "fresh";
  if (missedCycles === 1) return "aging";
  return "stale";
}
