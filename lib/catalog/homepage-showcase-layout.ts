/**
 * Homepage Product Showcase composition table — the canonical, testable
 * encoding of the frozen 0–8 wide-desktop layout matrix
 * (docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md
 * §25 "Complete Wide-Desktop Layout Matrix", restated identically at §73.1),
 * overridden below `wide` per PS-P3 (owner-approved staging-defect-fix,
 * docs/homepage/PRODUCT_SHOWCASE_STAGING_DEFECT_FIX_REPORT.md): every
 * narrower tier is single-column, one card per row, no exceptions.
 *
 * Pure data + pure functions: no D1, no `cloudflare:workers`, no React — so
 * this is directly `node --test`-able, unlike `editorial-repository.ts`.
 *
 * The actual layout is executed in CSS (`styles/theme-extensions.css`,
 * `.aa-showcase-grid`), keyed on the `data-count` attribute this module
 * produces. That split is deliberate: CSS does the work so the composition
 * survives with zero JavaScript (§79 "CSS/native layout where practical"),
 * while this module remains the single readable statement of the rule that
 * `homepage-showcase-layout.test.ts` asserts the stylesheet still matches.
 * If the two ever drift, that test fails.
 */

/** Hard cap from V2.0 §7/§24/§82 — the Homepage never shows more than 8 cards. */
export const HOMEPAGE_SHOWCASE_MAX_CARDS = 8;

/**
 * Responsive tiers. The pixel values are the `min-width` of each tier's
 * media query in `styles/theme-extensions.css`. Tier names/breakpoints are
 * kept from the original spec's vocabulary (§73.2) even though, per PS-P3,
 * every tier below `wide` now shares the identical single-column behavior —
 * keeping them distinct (rather than collapsing to one "not-wide" tier)
 * preserves the existing CSS/module-drift test convention and leaves the
 * breakpoints addressable if a future task reintroduces per-tier variation.
 */
export const SHOWCASE_TIER_MIN_WIDTHS = {
  narrowMobile: 0,
  mobile: 380,
  tablet: 640,
  medium: 1024,
  wide: 1280,
} as const;

export type ShowcaseTier = keyof typeof SHOWCASE_TIER_MIN_WIDTHS;

/**
 * Cards per FULL row, per tier, per card count (index = count, 0 unused).
 *
 * PS-P3 (owner-approved staging-defect-fix): every tier below `wide` is a
 * single, full-width column for every count — cards stack vertically, one
 * per row, with no 2-column mobile/tablet track and no 3-column `medium`
 * (1024px) track. `medium` in particular previously switched to 3 columns,
 * which is exactly the "1024px tablet becomes multi-column" behavior this
 * fix forbids. Only `wide` (>= 1280px) still composes multi-column, per the
 * frozen matrix below, unchanged.
 *
 * Wide desktop reproduces §25 exactly:
 *   1 -> 3-column track, one card centred (standard width, never stretched — §26/§36)
 *   2 -> 3-column track, centred pair
 *   3 -> 3, one full row
 *   4 -> 4, one full row
 *   5 -> 3, wrapping to 3+2 with the trailing pair centred (§29: 3+2 over 4+1)
 *   6 -> 3, wrapping to 3+3 (§29: 3+3 over 4+2)
 *   7 -> 4, wrapping to 4+3 with the trailing three centred
 *   8 -> 4, wrapping to 4+4
 */
const COLUMNS_BY_TIER_AND_COUNT: Record<ShowcaseTier, readonly number[]> = {
  //                    count: 0  1  2  3  4  5  6  7  8
  narrowMobile: [0, 1, 1, 1, 1, 1, 1, 1, 1],
  mobile: [0, 1, 1, 1, 1, 1, 1, 1, 1],
  tablet: [0, 1, 1, 1, 1, 1, 1, 1, 1],
  medium: [0, 1, 1, 1, 1, 1, 1, 1, 1],
  wide: [0, 3, 3, 3, 4, 3, 3, 4, 4],
};

export const SHOWCASE_COLUMNS_BY_TIER_AND_COUNT = COLUMNS_BY_TIER_AND_COUNT;

/** Cards per full row for a given count at a given tier. 0 cards has no layout. */
export function showcaseColumns(count: number, tier: ShowcaseTier): number {
  if (count <= 0) return 0;
  const table = COLUMNS_BY_TIER_AND_COUNT[tier];
  // Above the frozen maximum the query layer has already truncated to 8; the
  // stylesheet's un-suffixed default applies, which is the last table entry.
  return table[Math.min(count, HOMEPAGE_SHOWCASE_MAX_CARDS)];
}

/**
 * The resulting row grouping, e.g. `showcaseRows(5, "wide")` -> `[3, 2]` and
 * `showcaseRows(7, "wide")` -> `[4, 3]`. This is what natural flex wrapping
 * produces for the column count above; it exists so the frozen matrix can be
 * asserted directly rather than inferred from a column number.
 */
export function showcaseRows(count: number, tier: ShowcaseTier): number[] {
  if (count <= 0) return [];
  const capped = Math.min(count, HOMEPAGE_SHOWCASE_MAX_CARDS);
  const columns = showcaseColumns(capped, tier);
  const rows: number[] = [];
  for (let remaining = capped; remaining > 0; remaining -= columns) {
    rows.push(Math.min(columns, remaining));
  }
  return rows;
}

/**
 * The `data-count` attribute value for the Showcase's <ul>. Clamped to the
 * frozen maximum so an unexpected over-limit list can never select a
 * composition the stylesheet has no rule for — it falls back to each tier's
 * default column count instead of collapsing.
 *
 * Returns `undefined` for an empty list: 0 cards renders no <ul> at all
 * (§35 "Product Showcase omitted"), so there is nothing to label.
 */
export function showcaseCountAttribute(count: number): string | undefined {
  if (count <= 0) return undefined;
  return String(Math.min(count, HOMEPAGE_SHOWCASE_MAX_CARDS));
}
