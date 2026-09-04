/**
 * Definitive quote-selection policy (docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md
 * §D, PRICE-P2) — pure, D1-free, so it's independently unit-testable (same
 * split pattern as lib/pricing/sync-safety.ts):
 *
 *   1. Exact configured basis only (unit/currency/market/delivery-basis,
 *      and exact Product/Variant identity when the target has curated one
 *      — PRICE-P1's `variant_key`) — never a different basis, even when
 *      nothing else matches.
 *   2. Among exact-basis matches, classify each candidate's freshness
 *      (`lib/pricing/freshness.ts#classifyQuoteFreshness`) using its own
 *      provider's publication policy.
 *   3. FRESH candidates are preferred over AGING, regardless of provider
 *      priority.
 *   4. Among candidates within the SAME eligible freshness tier, pick by
 *      configured provider priority (the order `ENABLED_PRICE_PROVIDERS`
 *      was declared in).
 *   5. STALE and UNAVAILABLE candidates are NEVER returned — no fallback.
 *      This is the frozen V2.1 supersession of the legacy behavior ("no
 *      fresh quote exists -> return the highest-priority stale quote,
 *      visibly marked stale"), which PRICE-P0/§20 of the frozen decisions
 *      explicitly retires for the Homepage.
 *   6. Never average.
 */

import { classifyQuoteFreshness } from "./freshness.ts";
import type { ProviderPublicationPolicy } from "./provider-policy.ts";
import type { FreshnessState } from "./types.ts";

export interface QuoteCandidate {
  providerId: string;
  unit: string;
  currency: string;
  marketOrLocation: string | null;
  deliveryBasis: string | null;
  /** Exact Product Variant identity (PRICE-P1 `variant_key`), when this quote's mapping was curated to variant-level precision — `null` for a template-only (backward-compatible) mapping. */
  variantKey: string | null;
  priceAmountIrr: number;
  sourceTimestamp: string | null;
  syncedAt: string;
}

export interface TargetBasis {
  unit: string;
  currency: string;
  marketOrLocation: string | null;
  deliveryBasis: string | null;
  /** The curated display entry's exact target variant, when it has one. `null` means this display entry is template-level only — any candidate's `variantKey` (curated or not) is accepted, preserving pre-P1 behavior exactly for unqualified display items. A NON-null target requires an EXACT candidate `variantKey` match — a candidate with no variant identity, or a different one, never satisfies an exact-variant target (never silently substituted). */
  variantKey: string | null;
}

export interface WinningQuote {
  candidate: QuoteCandidate;
  freshness: FreshnessState;
}

function matchesBasis(candidate: QuoteCandidate, target: TargetBasis): boolean {
  const basisMatches =
    candidate.unit === target.unit &&
    candidate.currency === target.currency &&
    candidate.marketOrLocation === target.marketOrLocation &&
    candidate.deliveryBasis === target.deliveryBasis;
  if (!basisMatches) return false;

  // Exact-variant targeting (PRICE-P1/P2): only enforced when the display
  // entry has actually curated a variant_key. A template-only target
  // (`target.variantKey === null`) imposes no variant constraint at all —
  // this is the exact pre-P1 behavior for every display entry that has not
  // yet been curated to variant-level precision, never broken by this change.
  if (target.variantKey !== null) {
    return candidate.variantKey === target.variantKey;
  }
  return true;
}

/**
 * `policies` maps `providerId -> ProviderPublicationPolicy` — different
 * candidates may belong to different providers, each with its own cadence
 * policy (PRICE-P1 §7: policy is provider-owned, never a single global
 * value). A provider with no entry in this map is treated identically to
 * an explicitly-missing policy (`classifyQuoteFreshness` receives `null`)
 * — UNAVAILABLE, never a default fallback.
 */
export function selectWinningQuote(
  candidates: QuoteCandidate[],
  target: TargetBasis,
  providerPriorityOrder: string[],
  policies: Map<string, ProviderPublicationPolicy>,
  now: Date = new Date(),
): WinningQuote | null {
  const exactBasis = candidates.filter((c) => matchesBasis(c, target));
  if (exactBasis.length === 0) return null;

  const priorityOf = (providerId: string) => {
    const idx = providerPriorityOrder.indexOf(providerId);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const classified: WinningQuote[] = exactBasis.map((candidate) => ({
    candidate,
    freshness: classifyQuoteFreshness({
      now,
      sourceTimestamp: candidate.sourceTimestamp,
      syncedAt: candidate.syncedAt,
      policy: policies.get(candidate.providerId) ?? null,
    }),
  }));

  const byPriority = (a: WinningQuote, b: WinningQuote) => priorityOf(a.candidate.providerId) - priorityOf(b.candidate.providerId);

  const fresh = classified.filter((c) => c.freshness === "fresh").sort(byPriority);
  if (fresh.length > 0) return fresh[0];

  const aging = classified.filter((c) => c.freshness === "aging").sort(byPriority);
  if (aging.length > 0) return aging[0];

  // STALE and UNAVAILABLE candidates exist here but are deliberately never
  // returned — the Homepage V2.1 supersession of the legacy stale-fallback
  // behavior. No averaging, no substitution.
  return null;
}
