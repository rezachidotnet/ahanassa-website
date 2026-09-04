/**
 * Pure assembly of one Homepage Price Strip benchmark item (PRICE-P3) —
 * split out from lib/pricing/repository.ts (D1-touching) so the
 * selection/assembly logic itself is unit-testable under plain
 * `node --test`, matching this repo's established pure/impure split
 * (freshness.ts, quote-selection.ts, variant-integrity.ts). This is also
 * the SOLE place a `QuoteCandidate[]` + a resolved catalog anchor become a
 * `PublicPriceStripItem` — lib/pricing/repository.ts only fetches raw rows
 * and calls this, never re-implements any part of the selection policy
 * itself (task §13: never two competing selection implementations).
 *
 * `variantAnchor: null` (the catalog/exact-variant resolution failed, or
 * the row is not currently publication-eligible) fails this ONE item
 * closed — returns `null` — without throwing, so a caller iterating many
 * display rows can skip just this one and continue (task §18 "one bad
 * benchmark must not poison every valid benchmark").
 */

import { selectWinningQuote, type QuoteCandidate, type TargetBasis } from "./quote-selection.ts";
import { rialToTomanForDisplay } from "./money.ts";
import type { ProviderPublicationPolicy } from "./provider-policy.ts";
import type { FreshnessState, PublicPriceStripItem } from "./types.ts";

export interface PriceStripDisplayInput {
  displayPriceId: string;
  /** `price_display_products.product_key` — `catalog_products.template_xid`. */
  templateXid: string;
  /** `price_display_products.variant_key` — required (never null; a null-variant_key row is excluded by the caller before it ever reaches this function, task §4). */
  variantXid: string;
  target: TargetBasis;
}

export interface PriceStripVariantAnchor {
  title: string;
  slug: string;
  specification: string;
}

/**
 * `selectWinningQuote` is typed against the full 4-state `FreshnessState`
 * domain union, but structurally never returns `"stale"`/`"unavailable"` as
 * a winner (PRICE-P2). This asserts that invariant at the exact boundary
 * where the domain type is narrowed into the public contract's
 * `"fresh" | "aging"` field, rather than merely hoping it continues to
 * hold — an unexpected value here throws, which the caller's per-item
 * try/catch turns into "skip this one item," never a corrupted public
 * value.
 */
function toPublicFreshnessState(freshness: FreshnessState): "fresh" | "aging" {
  if (freshness === "fresh" || freshness === "aging") return freshness;
  throw new Error(`PRICE_STRIP_INVARIANT_VIOLATION: selectWinningQuote returned unexpected freshness state "${freshness}"`);
}

/** Defense-in-depth against a malformed row (task §18) — `price_amount_irr` is a `NOT NULL INTEGER` column, but a quote candidate reaching this function is never trusted to be commercially sane without checking. */
function hasValidPriceAmount(candidate: QuoteCandidate): boolean {
  return Number.isSafeInteger(candidate.priceAmountIrr) && candidate.priceAmountIrr > 0;
}

export function buildPriceStripItem(
  display: PriceStripDisplayInput,
  candidates: QuoteCandidate[],
  providerPriorityOrder: string[],
  policies: Map<string, ProviderPublicationPolicy>,
  variantAnchor: PriceStripVariantAnchor | null,
  now: Date = new Date(),
): PublicPriceStripItem | null {
  if (!variantAnchor) return null;

  const validCandidates = candidates.filter(hasValidPriceAmount);
  const winner = selectWinningQuote(validCandidates, display.target, providerPriorityOrder, policies, now);
  if (!winner) return null;

  const { toman } = rialToTomanForDisplay(winner.candidate.priceAmountIrr);
  const effectiveTimestamp = winner.candidate.sourceTimestamp ?? winner.candidate.syncedAt;

  return {
    displayPriceId: display.displayPriceId,
    templateXid: display.templateXid,
    variantXid: display.variantXid,
    title: variantAnchor.title,
    specification: variantAnchor.specification,
    priceToman: toman,
    unit: display.target.unit,
    marketOrLocation: display.target.marketOrLocation ?? undefined,
    deliveryBasis: display.target.deliveryBasis ?? undefined,
    freshnessState: toPublicFreshnessState(winner.freshness),
    effectiveTimestamp,
    href: `/products/${variantAnchor.slug}?variant=${display.variantXid}`,
  };
}
