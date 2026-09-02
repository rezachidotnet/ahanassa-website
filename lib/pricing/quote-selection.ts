/**
 * Definitive quote-selection policy (docs/pricing/PRICE_PROVIDER_CONTRACT.md,
 * point 10) — pure, D1-free, so it's independently unit-testable (same
 * split pattern as lib/pricing/sync-safety.ts):
 *
 *   1. Exact configured basis only (unit/currency/market/delivery-basis) —
 *      never a different basis, even when nothing else matches.
 *   2. Among exact-basis matches, fresh (non-stale) quotes are preferred
 *      over stale quotes, REGARDLESS of provider priority.
 *   3. Among fresh compatible quotes, pick by configured provider
 *      priority (the order `ENABLED_PRICE_PROVIDERS` was declared in).
 *   4. Only when no fresh compatible quote exists at all, fall back to
 *      the highest-priority STALE compatible quote (visibly marked stale
 *      by the caller) rather than showing nothing for that product.
 *   5. Never average.
 */

export interface QuoteCandidate {
  providerId: string;
  unit: string;
  currency: string;
  marketOrLocation: string | null;
  deliveryBasis: string | null;
  priceAmountIrr: number;
  sourceTimestamp: string | null;
  syncedAt: string;
}

export interface TargetBasis {
  unit: string;
  currency: string;
  marketOrLocation: string | null;
  deliveryBasis: string | null;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function matchesBasis(candidate: QuoteCandidate, target: TargetBasis): boolean {
  return (
    candidate.unit === target.unit &&
    candidate.currency === target.currency &&
    candidate.marketOrLocation === target.marketOrLocation &&
    candidate.deliveryBasis === target.deliveryBasis
  );
}

function effectiveTimestamp(candidate: QuoteCandidate): string {
  return candidate.sourceTimestamp ?? candidate.syncedAt;
}

function isFresh(candidate: QuoteCandidate, nowMs: number): boolean {
  return nowMs - Date.parse(effectiveTimestamp(candidate)) <= STALE_THRESHOLD_MS;
}

export function selectWinningQuote(candidates: QuoteCandidate[], target: TargetBasis, providerPriorityOrder: string[], nowMs: number = Date.now()): QuoteCandidate | null {
  const exactBasis = candidates.filter((c) => matchesBasis(c, target));
  if (exactBasis.length === 0) return null;

  const priorityOf = (providerId: string) => {
    const idx = providerPriorityOrder.indexOf(providerId);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const fresh = exactBasis.filter((c) => isFresh(c, nowMs)).sort((a, b) => priorityOf(a.providerId) - priorityOf(b.providerId));
  if (fresh.length > 0) return fresh[0];

  const stale = [...exactBasis].sort((a, b) => priorityOf(a.providerId) - priorityOf(b.providerId));
  return stale[0] ?? null;
}
