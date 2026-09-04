/**
 * Centralized Price Strip display configuration (PRICE-P3 §17) — mirrors
 * lib/catalog/homepage-config.ts's own "no scattered magic numbers"
 * convention. Pure constant, no D1/env dependency.
 *
 * Applied by lib/pricing/repository.ts AFTER Homepage eligibility
 * (freshness + exact-variant catalog resolution) is computed for every
 * active curated row — never as a pre-filter SQL `LIMIT`, so a
 * later-`sort_order` row that IS eligible is never dropped in favor of an
 * earlier one that turns out not to be.
 */
export const MAX_HOMEPAGE_PRICE_STRIP_ITEMS = 6;
