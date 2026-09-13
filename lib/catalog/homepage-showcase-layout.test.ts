import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  HOMEPAGE_SHOWCASE_MAX_CARDS,
  SHOWCASE_COLUMNS_BY_TIER_AND_COUNT,
  SHOWCASE_TIER_MIN_WIDTHS,
  showcaseColumns,
  showcaseCountAttribute,
  showcaseRows,
  type ShowcaseTier,
} from "./homepage-showcase-layout.ts";

/**
 * Product Showcase V2.0 §25/§73.1 — the frozen 0–8 wide-desktop layout
 * matrix — plus the §27/§28/§30/§31/§73.2 responsive column contract.
 *
 * The composition itself executes in CSS (`styles/theme-extensions.css`),
 * keyed on the `data-count` attribute the component emits. These tests pin
 * BOTH halves: the canonical table here, and a source-text assertion that
 * the stylesheet still declares the same numbers (the established
 * source-text-invariant convention this repo already uses in
 * homepage-projection-invariants.test.ts / homepage-source-isolation.test.ts).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

// ---------------------------------------------------------------------------
// The frozen wide-desktop matrix (§25, restated at §73.1 and §82)
// ---------------------------------------------------------------------------

test("wide desktop reproduces the frozen 0–8 layout matrix exactly", () => {
  const expected: Record<number, number[]> = {
    0: [], //        section omitted entirely
    1: [1], //       one standard-width card, centred
    2: [2], //       centred pair
    3: [3], //       centred three
    4: [4], //       one full four-card row
    5: [3, 2], //    3 + 2, trailing pair centred — never 4 + 1
    6: [3, 3], //    3 + 3 — never 4 + 2
    7: [4, 3], //    4 + 3, trailing three centred
    8: [4, 4], //    4 + 4
  };

  for (const [count, rows] of Object.entries(expected)) {
    assert.deepEqual(showcaseRows(Number(count), "wide"), rows, `wide desktop composition for ${count} card(s)`);
  }
});

test("0 cards produces no layout and no data-count attribute — the section is omitted, not laid out empty", () => {
  assert.deepEqual(showcaseRows(0, "wide"), []);
  assert.equal(showcaseColumns(0, "wide"), 0);
  assert.equal(showcaseCountAttribute(0), undefined);
});

test("no wide-desktop row ever exceeds the 4-column maximum (§27)", () => {
  for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
    for (const row of showcaseRows(count, "wide")) {
      assert.ok(row <= 4, `count ${count} produced a row of ${row}, exceeding the 4-column wide-desktop maximum`);
    }
  }
});

test("a balanced composition is preferred over an orphan row wherever the spec names one (§29)", () => {
  // The two cases §29 calls out explicitly, as concrete regressions.
  assert.deepEqual(showcaseRows(5, "wide"), [3, 2], "5 must compose as 3+2, not 4+1");
  assert.deepEqual(showcaseRows(6, "wide"), [3, 3], "6 must compose as 3+3, not 4+2");
});

test("card width stays stable for small counts — 1 and 2 cards ride the same 3-column track as 3 (§26/§36)", () => {
  // A single card must NOT stretch to fill the container; it stays standard
  // width and is centred by the flex container instead.
  assert.equal(showcaseColumns(1, "wide"), 3);
  assert.equal(showcaseColumns(2, "wide"), 3);
  assert.equal(showcaseColumns(3, "wide"), 3);
});

// ---------------------------------------------------------------------------
// Responsive column contract (§28/§30/§31/§73.2)
// ---------------------------------------------------------------------------

test("responsive column ceilings per tier (PS-P3): wide 4, every narrower tier 1", () => {
  const ceilings: Record<ShowcaseTier, number> = { wide: 4, medium: 1, tablet: 1, mobile: 1, narrowMobile: 1 };

  for (const [tier, ceiling] of Object.entries(ceilings) as [ShowcaseTier, number][]) {
    for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
      const columns = showcaseColumns(count, tier);
      assert.ok(columns <= ceiling, `${tier} tier used ${columns} columns for ${count} cards, exceeding its ${ceiling}-column maximum`);
      assert.ok(columns >= 1, `${tier} tier produced a non-positive column count for ${count} cards`);
    }
  }
});

test("tablet stacks every card in its own row (PS-P3) — no 2-column tablet grid", () => {
  for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
    assert.deepEqual(showcaseRows(count, "tablet"), Array(count).fill(1), `tablet should stack ${count} card(s) one per row`);
  }
});

test("medium (1024px) also stacks every card in its own row (PS-P3) — no 3-column track at tablet-ish widths", () => {
  for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
    assert.deepEqual(showcaseRows(count, "medium"), Array(count).fill(1), `medium should stack ${count} card(s) one per row`);
  }
});

test("card width never inflates to fill space — a tier's column count is constant except where §25 mandates a 4-wide row", () => {
  // §26: "Do NOT stretch 2 cards -> each card becomes ~50% container width
  // solely to fill space. Maintain a coherent preferred Product Card width
  // and center smaller sets."
  //
  // Regression guard for a real defect caught by live measurement: medium
  // once dropped 4 cards to 2 columns to get a "balanced" 2+2, which
  // measured 481px per card (~half the container). Every tier below wide
  // desktop must therefore use ONE column count for every count — and, per
  // PS-P3, that one column count is always 1.
  for (const tier of ["narrowMobile", "mobile", "tablet", "medium"] as ShowcaseTier[]) {
    const widths = new Set<number>();
    for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) widths.add(showcaseColumns(count, tier));
    assert.deepEqual(widths, new Set([1]), `${tier} must be single-column for every count, got columns ${[...widths].join("/")}`);
  }

  // Wide desktop varies ONLY between the 3-wide and 4-wide tracks the frozen
  // matrix itself requires — never a third, wider track.
  const wide = new Set<number>();
  for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) wide.add(showcaseColumns(count, "wide"));
  assert.deepEqual([...wide].sort(), [3, 4], "wide desktop must use exactly the 3- and 4-column tracks §25 defines");
});

test("every tier below wide (narrow mobile, mobile, tablet, medium/1024px) collapses to a single column for every count (PS-P3)", () => {
  for (const tier of ["narrowMobile", "mobile", "tablet", "medium"] as ShowcaseTier[]) {
    for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
      assert.equal(showcaseColumns(count, tier), 1, `${tier} should be 1 column for ${count} card(s)`);
    }
  }
});

test("only wide (>= 1280px) ever composes multi-column — every narrower tier stays single-column up to and including 1024px (PS-P3, no tablet 2-column grid)", () => {
  for (const tier of ["narrowMobile", "mobile", "tablet", "medium"] as ShowcaseTier[]) {
    for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
      assert.ok(showcaseColumns(count, tier) < 2, `${tier} must never go multi-column (found ${showcaseColumns(count, tier)} columns for ${count} cards)`);
    }
  }
});

// ---------------------------------------------------------------------------
// Max-8 cap (§7/§24/§82)
// ---------------------------------------------------------------------------

test("the 8-card maximum is never exceeded, and an over-limit count clamps instead of collapsing", () => {
  assert.equal(HOMEPAGE_SHOWCASE_MAX_CARDS, 8);
  assert.equal(showcaseCountAttribute(12), "8");
  const rows = showcaseRows(12, "wide");
  assert.equal(
    rows.reduce((a, b) => a + b, 0),
    8,
    "an over-limit count must clamp to 8 cards, never lay out more",
  );
});

test("showcaseCountAttribute emits a plain integer string for every renderable count", () => {
  for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
    assert.equal(showcaseCountAttribute(count), String(count));
  }
});

// ---------------------------------------------------------------------------
// The stylesheet must not drift from the table above
// ---------------------------------------------------------------------------

test("styles/theme-extensions.css declares the same columns per tier that this module specifies", () => {
  const css = readSource("styles/theme-extensions.css");

  // Isolate the component layer block that owns the showcase grid.
  const gridStart = css.indexOf(".aa-showcase-grid {");
  assert.ok(gridStart !== -1, ".aa-showcase-grid must exist in the stylesheet");
  const gridCss = css.slice(gridStart);

  // Each responsive tier must be present at exactly the min-width this module names.
  for (const [tier, minWidth] of Object.entries(SHOWCASE_TIER_MIN_WIDTHS) as [ShowcaseTier, number][]) {
    if (minWidth === 0) continue;
    assert.ok(gridCss.includes(`@media (min-width: ${minWidth}px)`), `stylesheet is missing the ${tier} tier at min-width ${minWidth}px`);
  }

  /** The `--aa-showcase-columns` value a given count resolves to inside one tier's media block. */
  function declaredColumns(tierCss: string, count: number): number {
    // A count-specific override wins over the block's default.
    const override = new RegExp(`\\[data-count="${count}"\\][^{}]*\\{[^}]*--aa-showcase-columns:\\s*(\\d+)`).exec(tierCss);
    if (override) return Number(override[1]);
    const fallback = /--aa-showcase-columns:\s*(\d+)/.exec(tierCss);
    assert.ok(fallback, "each tier block must declare a default --aa-showcase-columns");
    return Number(fallback![1]);
  }

  const tiersInOrder: ShowcaseTier[] = ["mobile", "tablet", "medium", "wide"];
  for (const [index, tier] of tiersInOrder.entries()) {
    const start = gridCss.indexOf(`@media (min-width: ${SHOWCASE_TIER_MIN_WIDTHS[tier]}px)`);
    const next = tiersInOrder[index + 1];
    const end = next ? gridCss.indexOf(`@media (min-width: ${SHOWCASE_TIER_MIN_WIDTHS[next]}px)`) : gridCss.length;
    const tierCss = gridCss.slice(start, end);

    for (let count = 1; count <= HOMEPAGE_SHOWCASE_MAX_CARDS; count++) {
      assert.equal(
        declaredColumns(tierCss, count),
        SHOWCASE_COLUMNS_BY_TIER_AND_COUNT[tier][count],
        `stylesheet/module drift: ${tier} tier, ${count} card(s)`,
      );
    }
  }
});

test("the grid centres its rows and sizes cards from the column variable — the mechanism the matrix depends on", () => {
  const css = readSource("styles/theme-extensions.css");
  const gridCss = css.slice(css.indexOf(".aa-showcase-grid {"));

  assert.ok(/justify-content:\s*center/.test(gridCss), "rows must be centred, otherwise partial rows left-align and 5/7 stop matching the frozen matrix");
  assert.ok(/flex-wrap:\s*wrap/.test(gridCss), "the composition relies on natural flex wrapping");
  assert.ok(/width:\s*calc\(100%\s*\/\s*var\(--aa-showcase-columns\)\)/.test(gridCss), "card width must derive from the column variable");
});

test("the Showcase grid uses no carousel/horizontal-scroll mechanism (§32/§82)", () => {
  const css = readSource("styles/theme-extensions.css");
  const gridCss = css.slice(css.indexOf(".aa-showcase-grid {"), css.indexOf(".aa-showcase-grid {") + 4000);
  for (const forbidden of ["overflow-x", "scroll-snap", "scroll-behavior"]) {
    assert.ok(!gridCss.includes(forbidden), `the Product Showcase grid must not use ${forbidden} — no horizontal carousel is permitted`);
  }
});

test("component emits data-count from the shared helper rather than a dynamically-built Tailwind class", () => {
  const source = readSource("components/home/product-showcase.tsx");

  assert.ok(source.includes("showcaseCountAttribute(items.length)"), "the <ul> must label itself with the canonical count attribute");
  assert.ok(source.includes("aa-showcase-grid"), "the <ul> must carry the composition class the stylesheet targets");
  // Dynamically interpolated utility classes are invisible to Tailwind's
  // scanner and would be purged from the compiled CSS.
  assert.ok(!/grid-cols-\$\{/.test(source), "must not build Tailwind column classes by interpolation");
  assert.ok(!/`[^`]*(sm|md|lg|xl):grid-cols-\$/.test(source), "must not build responsive Tailwind column classes by interpolation");
});
