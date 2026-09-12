import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { marketsCopy, industriesCopy } from "./pages.ts";

/**
 * docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md
 * acceptance-gate regression coverage (§16, §19).
 *
 * This file owns the PAGE-LEVEL contract — which sections exist, in what
 * order, which are conditional, and which are excluded. Per-component content
 * and semantics stay in each component's own frozen-spec invariants file; the
 * two layers deliberately do not duplicate each other.
 *
 * Same convention as the sibling invariants files: `app/[locale]/page.tsx` is
 * JSX with a `cloudflare:workers` import, so it is pinned as source-text
 * invariants rather than rendered (no React render-testing framework exists in
 * this repo). Section ORDER is therefore asserted as source order, which is
 * exactly what determines render order in this component — the page returns
 * one flat fragment with no reordering wrapper, and that flatness is itself
 * asserted below so the technique cannot silently stop being valid.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const PAGE = "app/[locale]/page.tsx";
const PAGE_SOURCE = readSource(PAGE);
const PAGE_CODE = readCode(PAGE);
const COMPOSITION = readSource("docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md");

/** The rendered JSX only — everything after the single `return (`. */
const RENDERED = PAGE_CODE.slice(PAGE_CODE.indexOf("return ("));

/** Every component the Homepage composes, in frozen order (§4). */
const SECTIONS = [
  "components/home/hero.tsx",
  "components/home/price-strip.tsx",
  "components/home/product-showcase.tsx",
  "components/home/buyer-value.tsx",
  "components/home/industries.tsx",
  "components/home/final-cta.tsx",
];

/** The three conditional sections that may omit themselves entirely (§9). */
const CONDITIONAL = ["components/home/price-strip.tsx", "components/home/product-showcase.tsx", "components/home/industries.tsx"];

/**
 * A section "has a heading" if it renders an `<h2>` itself OR delegates to
 * the shared `SectionHeading`, which renders one. Product Showcase takes the
 * delegated route; the rest render their own.
 */
function headingMarkerIndex(code: string): number {
  const own = code.indexOf("<h2");
  const shared = code.indexOf("<SectionHeading");
  const candidates = [own, shared].filter((i) => i > -1);
  return candidates.length === 0 ? -1 : Math.min(...candidates);
}

function orderOf(tag: string): number {
  return RENDERED.indexOf(`<${tag}`);
}

// ---------------------------------------------------------------------------
// The frozen authority is present and is what these tests encode
// ---------------------------------------------------------------------------

test("the frozen Composition and Visual System authorities are imported into the repository", () => {
  for (const doc of [
    "docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md",
    "docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md",
    "docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md",
  ]) {
    assert.ok(existsSync(path.join(REPO_ROOT, doc)), `${doc} must exist — it is the authority these assertions encode`);
  }
});

test("the frozen composition really is the one asserted here (§4)", () => {
  // Guards against this test file drifting from the document it claims to
  // encode: §4's own ordering block must name these sections in this order.
  const section4 = COMPOSITION.slice(COMPOSITION.indexOf("## 4. Authoritative Homepage composition"), COMPOSITION.indexOf("## 5. Component status matrix"));
  const expected = ["Global Header", "Hero", "Price Strip [conditional]", "Product Showcase", "Buyer Value / Service Promise", "Verified Evidence [conditional]", "Industries / Use Cases [conditional]", "Final CTA", "Global Footer"];
  let cursor = -1;
  for (const name of expected) {
    const at = section4.indexOf(name, cursor + 1);
    assert.ok(at > cursor, `§4 must list "${name}" after the previous section`);
    cursor = at;
  }
});

// ---------------------------------------------------------------------------
// Rendered order — §4, §16.1-§16.4, §19.1
// ---------------------------------------------------------------------------

test("the page returns one flat fragment, so source order IS render order", () => {
  assert.equal((PAGE_CODE.match(/return \(/g) ?? []).length, 1, "exactly one return, so there is one composition to reason about");
  assert.match(RENDERED, /return \(\s*<>/, "the sections are returned as a flat fragment");
  // No wrapper could reorder or conditionally drop a whole group of sections.
  assert.ok(!/\.reverse\(\)|sort\(/.test(RENDERED), "sections must not be reordered programmatically");
});

test("the rendered Homepage order matches the frozen composition (§4, §16.1)", () => {
  const order = ["Hero", "PriceStrip", "ProductShowcase", "BuyerValue", "Industries", "FinalCta"];
  const positions = order.map((tag) => ({ tag, at: orderOf(tag) }));

  for (const { tag, at } of positions) {
    assert.ok(at > -1, `${tag} must be rendered on the Homepage`);
  }
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i - 1].at < positions[i].at, `§4: ${positions[i - 1].tag} must precede ${positions[i].tag}`);
  }
});

test("Hero comes first and precedes Product Showcase, which precedes Buyer Value (§16.1-§16.4)", () => {
  assert.ok(orderOf("Hero") < orderOf("ProductShowcase"), "§16.2");
  assert.ok(orderOf("ProductShowcase") < orderOf("BuyerValue"), "§16.4: Buyer Value appears after product exploration");
  assert.ok(orderOf("BuyerValue") < orderOf("FinalCta"), "§4: Final CTA closes the journey");
});

test("Price Strip sits between Hero and Product Showcase when it renders (§4, §16.2)", () => {
  assert.ok(orderOf("Hero") < orderOf("PriceStrip"), "§4: the Price Strip follows the Hero");
  assert.ok(orderOf("PriceStrip") < orderOf("ProductShowcase"), "§16.2: Hero is followed by Price Strip only when eligible, otherwise directly by Product Showcase");
});

// ---------------------------------------------------------------------------
// Supersession — §8, §16.5, §16.6, §19.5, §19.6
// ---------------------------------------------------------------------------

test("Evaluation/Assurance no longer appears as an independent Homepage section (§16.5, §19.5)", () => {
  assert.ok(!/<EvaluationAssurance/.test(PAGE_CODE), "§8: SUPERSEDED FOR HOMEPAGE — replaced by Buyer Value");
  assert.ok(!PAGE_SOURCE.includes("@/components/home/evaluation-assurance"), "the superseded Homepage import must be gone");
});

test("Purchase Process no longer appears as an independent Homepage section (§16.6, §19.6)", () => {
  assert.ok(!/<Process[\s/>]/.test(PAGE_CODE), "§8: RETAINED OUTSIDE HOMEPAGE — reserved for the dedicated /process page");
  assert.ok(!PAGE_SOURCE.includes("@/components/home/process"), "the superseded Homepage import must be gone");
});

test("Reach no longer appears as an independent Homepage section (§16.11)", () => {
  // Superseded for the Homepage by the frozen Industries V1.0 component. Its
  // five generic industry names were never wrong — they are simply not the
  // frozen three-sector composition, and they continue to serve /industries
  // and /markets.
  assert.ok(!/<Reach[\s/>]/.test(PAGE_CODE), "§8: SUPERSEDED FOR HOMEPAGE — replaced by Industries");
  assert.ok(!PAGE_SOURCE.includes("@/components/home/reach"), "the superseded Homepage import must be gone");
});

test("supersession removed RENDERING only — every superseded file survives (§8)", () => {
  // §8: "Historical specifications and files SHOULD NOT be deleted solely
  // because they are no longer active."
  for (const retained of [
    "components/home/evaluation-assurance.tsx",
    "components/home/process.tsx",
    "components/home/reach.tsx",
    "lib/content/evaluation-assurance.ts",
    "lib/content/purchase-process.ts",
    "lib/content/pages.ts",
    "docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md",
    "docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md",
  ]) {
    assert.ok(existsSync(path.join(REPO_ROOT, retained)), `${retained} must NOT be deleted — it is superseded/relocated, not retired`);
  }

  // The retained components must survive INTACT, not be gutted into stubs.
  assert.match(readCode("components/home/reach.tsx"), /m\.industries\.map/, "the retained Reach component must still render its list");
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.ok(homepageCopy[locale].reach.title.trim().length > 0, `${locale}: homepageCopy.reach content must survive the supersession`);
  }
});

test("the shared CtaBand is no longer the Homepage's closing CTA, but is UNCHANGED and still serves six other pages (§8)", () => {
  // The Final CTA V1.0 phase is a different shape of supersession from the
  // three above. `components/ui/cta-band.tsx` is a SHARED component: replacing
  // its content in place would have silently changed six pages this phase does
  // not govern. So the Homepage stopped importing it and nothing else moved.
  assert.ok(!/<CtaBand[\s/>]/.test(PAGE_CODE), "the Homepage renders the frozen FinalCta instead");
  assert.ok(!PAGE_SOURCE.includes("@/components/ui/cta-band"), "the Homepage import must be gone");
  assert.ok(existsSync(path.join(REPO_ROOT, "components/ui/cta-band.tsx")), "cta-band.tsx must NOT be deleted — it is still live on six other pages");

  // It must survive INTACT, not be gutted, and must still be really used.
  const ctaBand = readCode("components/ui/cta-band.tsx");
  assert.match(ctaBand, /export function CtaBand\(/, "the retained component must still export its component");
  assert.match(ctaBand, /<Link/, "the retained component must still render its own actions");
  for (const consumer of [
    "app/[locale]/products/page.tsx",
    "app/[locale]/products/[slug]/page.tsx",
    "app/[locale]/industries/page.tsx",
    "app/[locale]/markets/page.tsx",
    "app/[locale]/about/page.tsx",
    "app/[locale]/services/page.tsx",
  ]) {
    const source = readSource(consumer);
    assert.ok(source.includes("@/components/ui/cta-band"), `${consumer} must still import the shared CtaBand`);
    assert.match(source, /<CtaBand locale=\{locale\} \/>/, `${consumer} must still render the shared CtaBand unchanged`);
  }
});

test("the Hero's four-step journey is not repeated later on the Homepage (§16.7, §19.7)", () => {
  // §7 gives the "Short four-step purchase path" one sole owner: the Hero.
  // Structural proof, which is stronger than any copy scan: the Hero is the
  // only Homepage section that renders the `process` step array at all
  // (`t.process.map(...)`, where `t` is `homepageCopy[locale].hero`).
  const consumers = SECTIONS.filter((file) => /\bt\.process\b|\.hero\.process\b/.test(readCode(file)));
  assert.deepEqual(consumers, ["components/home/hero.tsx"], "only the Hero may render the four-step micro-journey");

  // And the Hero really does still render it — this test must fail loudly if
  // the rail is ever removed, not quietly pass because nothing renders it.
  assert.match(readCode("components/home/hero.tsx"), /t\.process\.map\(/, "the Hero must keep its four-step micro-journey");
});

test("detailed process content is reserved for /process, and no link to it is invented (§16.8, §12)", () => {
  assert.ok(!existsSync(path.join(REPO_ROOT, "app/[locale]/process")), "no /process route exists yet — creating one is a future phase");
  assert.ok(!/["'`]\/process["'`]/.test(PAGE_CODE), "§12/checklist: do not add links to a nonexistent route");
});

// ---------------------------------------------------------------------------
// Excluded legacy sections — §8, §16.12, §19.11
// ---------------------------------------------------------------------------

test("no legacy Homepage section is silently reintroduced (§16.12, §19.11)", () => {
  // §8's register: RiskGrid, RoleComparison, ControlPillars, generic TrustBand
  // and SuitabilityFaq are excluded from the current Homepage, and a
  // standalone ProcessSteps section is not reintroduced separately.
  for (const legacy of ["RiskGrid", "RoleComparison", "ControlPillars", "TrustBand", "SuitabilityFaq", "ProcessSteps", "Capabilities"]) {
    assert.ok(!new RegExp(`<${legacy}[\\s/>]`).test(PAGE_CODE), `§16.12: the legacy ${legacy} section must not render on the Homepage`);
    assert.ok(!PAGE_SOURCE.includes(`@/components/home/${legacy.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`), `no import of the legacy ${legacy} component`);
  }
});

test("no legacy Homepage component file lingers in the tree to be re-imported by accident", () => {
  for (const file of [
    "components/home/risk-grid.tsx",
    "components/home/role-comparison.tsx",
    "components/home/control-pillars.tsx",
    "components/home/trust-band.tsx",
    "components/home/suitability-faq.tsx",
    "components/home/process-steps.tsx",
    "components/home/capabilities.tsx",
    "components/home/assurance.tsx",
  ]) {
    assert.ok(!existsSync(path.join(REPO_ROOT, file)), `${file} was already retired in an earlier phase and must stay gone`);
  }
});

// ---------------------------------------------------------------------------
// Conditional sections and failure isolation — §9, §10, §15, §16.13, §19.12
// ---------------------------------------------------------------------------

test("every conditional section omits itself as a WHOLE semantic section (§9, §16.13)", () => {
  // §9: "it is omitted as a complete semantic section; no empty H2,
  // placeholder card, promotional substitute, or unexplained whitespace
  // remains." Each conditional component returns null BEFORE emitting any
  // markup, so nothing — heading, wrapper, or background band — survives.
  for (const file of ["components/home/price-strip.tsx", "components/home/product-showcase.tsx"]) {
    const code = readCode(file);
    assert.ok(/return null;/.test(code), `${file} must be able to omit itself entirely`);
    const nullAt = code.indexOf("return null;");
    const sectionAt = code.indexOf("<section");
    assert.ok(nullAt < sectionAt, `${file}: the omission must short-circuit BEFORE any <section> markup, leaving no empty shell`);
  }
});

test("Buyer Value and the Final CTA are unconditional — no data failure can suppress them (§9, §16.14)", () => {
  // §9: an omission "does not change Header, Hero, Buyer Value, Final CTA, or
  // Footer availability".
  for (const file of ["components/home/buyer-value.tsx", "components/home/final-cta.tsx", "components/home/hero.tsx"]) {
    assert.ok(!/return null/.test(readCode(file)), `${file} must always render — it is an always-present section`);
  }
  assert.match(PAGE_CODE, /<BuyerValue locale=\{locale\} \/>/, "rendered directly, with no conditional wrapper");
  assert.match(PAGE_CODE, /<FinalCta locale=\{locale\} \/>/, "§16.14: the Final CTA remains present regardless of conditional availability");
});

test("conditional sections fail INDEPENDENTLY — one failure cannot suppress another (§9, §15)", () => {
  // §9: "A Price Strip failure MUST NOT suppress products, and an evidence
  // failure MUST NOT suppress Industries or Final CTA."
  const priceAt = PAGE_CODE.indexOf("getHomepagePriceStrip");
  const tryAt = PAGE_CODE.indexOf("try {", PAGE_CODE.indexOf("let homepageProducts"));
  const catchAt = PAGE_CODE.indexOf("} catch (error) {", tryAt);

  assert.ok(priceAt > -1 && tryAt > priceAt, "the price read runs on its own path, before and outside the Showcase's failure boundary");
  const showcaseTryBody = PAGE_CODE.slice(tryAt, catchAt);
  assert.ok(!showcaseTryBody.includes("getHomepagePriceStrip"), "a Showcase failure must not be able to take the Price Strip down with it");
  assert.ok(PAGE_CODE.indexOf("return (") > catchAt, "rendering happens after both reads — no section is rendered inside a failure boundary");
});

test("a Product Showcase data failure still leaves every other section rendering (§10.5)", () => {
  // §10.5's documented fail-closed output: Hero -> [Price Strip] -> Buyer
  // Value -> [Evidence] -> [Industries] -> Final CTA. Since the Showcase's
  // catch only empties its own candidate list, that state falls out
  // automatically — nothing else reads `homepageProducts`.
  assert.equal((PAGE_CODE.match(/homepageProducts/g) ?? []).length, 3, "declaration, assignment, and exactly one consumer");
  assert.match(PAGE_CODE, /<ProductShowcase locale=\{locale\} items=\{homepageProducts\} \/>/, "only the Showcase consumes the candidate list");
});

// ---------------------------------------------------------------------------
// Product Showcase is REQUIRED architecture — §6.3, §16.3, §19.4
// ---------------------------------------------------------------------------

test("Product Showcase remains part of the required Homepage architecture (§16.3, §19.4)", () => {
  // §6.3: it "MUST NOT be treated as intentionally removed merely because it
  // is absent in a local or unsynchronized environment". Its ABSENCE at
  // runtime is a data state; its absence from this file would be an
  // architecture change, and that is what this test forbids.
  assert.ok(orderOf("ProductShowcase") > -1, "the component must stay in the composition even when it renders zero cards");
  assert.match(PAGE_CODE, /listHomepageProductCandidates/, "the projection read must stay wired up");
});

test("the Homepage never renders sample/fabricated catalog data (§6.3)", () => {
  // PAGE_CODE, not PAGE_SOURCE: both files' doc comments legitimately name
  // `lib/content/catalog-sample.ts` in order to record that it is never read.
  assert.ok(!PAGE_CODE.includes("catalog-sample"), "§6.3 forbids fabricated products");
  assert.ok(!readCode("components/home/product-showcase.tsx").includes("catalog-sample"), "the Showcase must read only the real projection");
});

// ---------------------------------------------------------------------------
// Verified Evidence — §6.5, §16.9, §16.10, §19.8, §19.9
// ---------------------------------------------------------------------------

test("Verified Evidence is omitted, and no marketing substitute stands in for it (§6.5, §16.9)", () => {
  // §6.5: "Until evidence becomes eligible, this component is omitted. A
  // marketing substitute MUST NOT be rendered in its place." No evidence
  // metric, calculation window, quality gate or publication contract exists
  // anywhere in this repository, so the section correctly does not exist.
  assert.ok(!/<VerifiedEvidence|<Evidence[\s/>]/.test(PAGE_CODE), "no Evidence section may render before its gate exists");
  assert.ok(!existsSync(path.join(REPO_ROOT, "components/home/verified-evidence.tsx")), "no Evidence component has been invented to fill the slot");
});

test("no unsourced operational statistic is published anywhere on the Homepage (§6.5, §19.9)", () => {
  // §6.5 forbids "aspirational, manually invented, or weak-sample metrics",
  // and §19.9 gates any public speed claim behind >=100 eligible records plus
  // the data-quality gates. Scoped to the Homepage's own editorial copy.
  const claimShapes = [
    /\b\d{1,3}\s*%/, // "98%"
    /\b\d+\s*(hours?|hrs?|minutes?|mins?|days?)\b/i, // "within 24 hours"
    /\b\d+\s*(ساعت|دقیقه|روز)\b/, // FA
    /\b\d+\s*(ساعة|دقيقة|يوم)\b/, // AR
  ];
  for (const locale of ["fa", "en", "ar"] as const) {
    const text = JSON.stringify(homepageCopy[locale]);
    for (const shape of claimShapes) {
      assert.ok(!shape.test(text), `${locale}: an ungoverned operational metric matching ${shape} must not be published`);
    }
  }
});

test("the active evidence threshold recorded by the freeze is 100 ELIGIBLE records, not raw rows (§6.5, §19.9)", () => {
  // Pinned so a future implementer cannot quietly reinstate the historical
  // 1000 figure or soften "eligible" into "rows".
  assert.ok(COMPOSITION.includes("100 eligible operational records"), "§6.5/§19.9 must state the 100-eligible-record threshold");
  assert.ok(COMPOSITION.includes("reaching 100 raw rows alone does not override data-quality failures".toLowerCase()) || /100 raw rows alone does not override data-quality failures/i.test(COMPOSITION), "§6.5 must keep raw rows distinct from eligible records");
});

// ---------------------------------------------------------------------------
// Industries / Use Cases — §6.6, §16.11, §19.10
// ---------------------------------------------------------------------------

test("the Industries slot is filled by the frozen V1.0 component (§6.6, §16.11)", () => {
  // The slot's occupant changed in the Industries V1.0 phase: `Reach`'s five
  // generic industry names were replaced by the three frozen sectors. Detailed
  // copy, semantics, layout and image-policy assertions live in
  // lib/content/industries-frozen-spec-invariants.test.ts; this file asserts
  // only that the slot is correctly occupied and correctly ordered.
  assert.ok(existsSync(path.join(REPO_ROOT, "docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md")), "the frozen authority must be imported");
  assert.ok(orderOf("Industries") > -1, "§4: the Industries slot must be occupied");
  assert.ok(orderOf("BuyerValue") < orderOf("Industries"), "§4: Industries follows Buyer Value (and, when eligible, Evidence)");
  assert.ok(orderOf("Industries") < orderOf("FinalCta"), "§4: Industries precedes the Final CTA");
});

test("the Industries section renders only already-approved, non-fabricated content (§6.6, §16.11)", () => {
  // §6.6 forbids inventing "projects, customers, industries served, volumes,
  // logos, or case studies". The three sectors are the owner's declared
  // intended service scope, pinned character-for-character against the frozen
  // document by the component's own invariants file.
  const industries = readCode("components/home/industries.tsx");
  assert.ok(industries.includes("homepageCopy"), "the Industries content must come from the localized content module");
  assert.ok(industries.includes("t.sectors.map"), "it must render the frozen three-sector array");
  assert.ok(!/logo/i.test(industries), "§6.6: no customer/supplier logo wall");
  assert.ok(!/case stud|testimonial|aggregateRating/i.test(industries), "§6.6: no case studies or testimonials");

  // §6.6: "use generic stock-image tiles with no meaningful buyer
  // information" is also forbidden — every sector carries real localized
  // guidance text, not a bare captioned tile.
  for (const locale of ["fa", "en", "ar"] as const) {
    const sectors = homepageCopy[locale].industries.sectors;
    assert.equal(sectors.length, 3, `${locale}: the frozen composition is exactly three sectors`);
    for (const sector of sectors) {
      assert.ok(sector.body.trim().length > 40, `${locale}: each sector must carry meaningful buyer information, not a bare label`);
    }
  }
});

test("the retained /industries and /markets lists are untouched by the Homepage change (§8)", () => {
  // The Homepage stopped rendering `Reach`, but the pages that publish these
  // lists did not change and must stay consistent with each other.
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.deepEqual(marketsCopy[locale].industries, industriesCopy[locale].industries, `${locale}: /markets and /industries must keep publishing the same list`);
    assert.ok(marketsCopy[locale].industries.length > 0, `${locale}: the retained list must not have been emptied`);
  }
});

// ---------------------------------------------------------------------------
// Heading structure and SEO composition — §14, §16.13
// ---------------------------------------------------------------------------

test("there is exactly one Homepage H1, and it belongs to the Hero (§14)", () => {
  const sections = ["components/home/hero.tsx", "components/home/price-strip.tsx", "components/home/product-showcase.tsx", "components/home/buyer-value.tsx", "components/home/industries.tsx", "components/home/final-cta.tsx"];
  const withH1 = sections.filter((file) => /<h1[\s>]/.test(readCode(file)));
  assert.deepEqual(withH1, ["components/home/hero.tsx"], "§14: there MUST be exactly one Homepage H1");
});

test("every rendered Homepage section carries a real H2 (§14)", () => {
  // Product Showcase and Reach delegate their <h2> to the shared
  // SectionHeading; Price Strip, Buyer Value and the Final CTA render their
  // own. Either satisfies §14's "meaningful semantic heading structure".
  for (const file of SECTIONS.filter((f) => f !== "components/home/hero.tsx")) {
    assert.ok(headingMarkerIndex(readCode(file)) > -1, `${file} must have a meaningful semantic heading`);
  }
  assert.ok(/<h2[\s>]/.test(readCode("components/ui/section-heading.tsx")), "the shared SectionHeading must render a real h2");
});

test("an omitted conditional section leaves no placeholder heading behind (§9, §14)", () => {
  // Both conditional components return null before any heading is ever
  // constructed, so an omission cannot create a heading-level jump or leave an
  // empty <h2> on the page.
  for (const file of CONDITIONAL) {
    const code = readCode(file);
    const heading = headingMarkerIndex(code);
    assert.ok(heading > -1, `${file} must render a heading when it is eligible`);
    assert.ok(code.indexOf("return null;") < heading, `${file}: the heading must not survive an omission`);
  }
});

// ---------------------------------------------------------------------------
// CTA progression — §11, §16.14
// ---------------------------------------------------------------------------

test("the Homepage keeps ONE primary conversion goal and no competing third action (§11)", () => {
  // §11: Buyer Value is "Normally explanatory; MUST NOT add a competing
  // primary CTA by default". Evidence/Industries may carry contextual links
  // only. The Hero and Final CTA own conversion.
  assert.ok(!readCode("components/home/buyer-value.tsx").includes("<Link"), "§11: Buyer Value must not add a competing primary CTA");
  assert.ok(readCode("components/home/final-cta.tsx").includes("<ButtonLink"), "§6.7: the Final CTA must return the buyer to the primary RFQ action");
});

test("nothing on the Homepage implies checkout or an automatic purchase (§11)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const text = JSON.stringify(homepageCopy[locale]).toLowerCase();
    for (const forbidden of ["add to cart", "buy now", "checkout", "سبد خرید", "پرداخت آنلاین", "سلة التسوق"]) {
      assert.ok(!text.includes(forbidden), `${locale}: §11 forbids implying checkout ("${forbidden}")`);
    }
  }
  // The Hero's non-commitment reassurance is preserved (§6.1, §6.7).
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.ok(homepageCopy[locale].hero.reassurance.trim().length > 0, `${locale}: the Hero's non-commitment reassurance must survive`);
  }
});

// ---------------------------------------------------------------------------
// Visual-system composition sanity — Visual System §7, §14, §21
// ---------------------------------------------------------------------------

test("at least two different section archetypes follow the Hero (Visual System §21.5)", () => {
  // Product Showcase / Reach use White (`bg-background`); Buyer Value uses
  // Warm Cream; the Final CTA uses the Navy high-emphasis surface. That is
  // three distinct archetypes after the Hero, not one repeated card.
  assert.ok(readCode("components/home/product-showcase.tsx").includes("bg-background"), "Product Showcase is a light Content Section");
  assert.ok(readCode("components/home/buyer-value.tsx").includes("--aa-color-bg-warm"), "Buyer Value is a Warm Cream Content Section");
  assert.ok(/className="[^"]*\bbg-navy\b/.test(readCode("components/home/final-cta.tsx")), "the Final CTA is the Navy high-emphasis surface");
});

test("no two consecutive heavy Navy sections, even when conditional sections are omitted (Visual System §14, §21.6)", () => {
  // Visual System §14: "It MUST NOT place multiple heavy Navy sections
  // consecutively without a deliberate light transition." There are exactly
  // two Navy surfaces in the composition — the Hero (§8's flagship field) and
  // the Final CTA (§9's simplified Navy high-emphasis surface) — and they sit
  // at opposite ends of the page.
  const navy = SECTIONS.filter((file) => /className="[^"]*\bbg-navy(-\d+)?\b/.test(readCode(file)));
  assert.deepEqual(navy, ["components/home/hero.tsx", "components/home/final-cta.tsx"], "only the Hero and the Final CTA may be heavy Navy surfaces");

  // The load-bearing part: between them sit Buyer Value and the Final CTA's
  // immediate predecessor, BOTH of which are always-present light sections.
  // So even in §10.4's most reduced state (no prices, no evidence, no
  // industries -> Hero -> Products -> Buyer Value -> Final CTA) and in §10.5's
  // product-failure state (Hero -> Buyer Value -> Final CTA), a light section
  // always separates the two Navy bands. That is structural, not incidental.
  const alwaysPresentLight = ["components/home/buyer-value.tsx"];
  for (const file of alwaysPresentLight) {
    const code = readCode(file);
    assert.ok(!/className="[^"]*\bbg-navy(-\d+)?\b/.test(code), `${file} must stay a light surface — it is the guaranteed transition between the two Navy bands`);
    assert.ok(!/return null/.test(code), `${file} must be unconditional, or the transition could disappear`);
  }
  const heroAt = orderOf("Hero");
  const buyerValueAt = orderOf("BuyerValue");
  const ctaAt = orderOf("FinalCta");
  assert.ok(heroAt < buyerValueAt && buyerValueAt < ctaAt, "the always-present light section must sit between the two Navy surfaces");
});

test("Buyer Value reads as a flat Content Section, visually distinct from the actionable product cards (Visual System §21.3, §21.4)", () => {
  const buyerValue = readCode("components/home/buyer-value.tsx");
  const showcase = readCode("components/home/product-showcase.tsx");

  // Product cards are actionable: bordered, hoverable anchors.
  assert.ok(showcase.includes("<Link") && showcase.includes("hover:"), "product cards stay independently actionable");
  // Buyer Value promises are neither.
  assert.ok(!buyerValue.includes("<Link") && !buyerValue.includes("hover:"), "§21.3/§14: service promises must not be styled like clickable product cards");
  assert.ok(!/\brounded\b|\bshadow\b/.test(buyerValue), "Visual System §7: no Card Soup — flat grouped layout, not four floating cards");
});

test("all Homepage sections align to the one shared container (Visual System §13, §21.12)", () => {
  for (const file of ["components/home/hero.tsx", "components/home/price-strip.tsx", "components/home/product-showcase.tsx", "components/home/buyer-value.tsx", "components/home/industries.tsx", "components/home/final-cta.tsx"]) {
    assert.ok(readCode(file).includes("container-x"), `${file} must use the shared container/gutter system`);
  }
});

// ---------------------------------------------------------------------------
// AI / GEO safety — §14, Buyer Value §17
// ---------------------------------------------------------------------------

test("no hidden crawler-only or agent-only content layer exists on the Homepage", () => {
  for (const file of [PAGE, "components/home/hero.tsx", "components/home/product-showcase.tsx", "components/home/buyer-value.tsx", "components/home/industries.tsx", "components/home/final-cta.tsx"]) {
    const code = readCode(file);
    assert.ok(!/<noscript[\s>]/.test(code), `${file}: no <noscript> content duplicate`);
    assert.ok(!/dangerouslySetInnerHTML/.test(code) || file === PAGE, `${file}: no injected markup`);
    assert.ok(!/display:\s*none|visibility:\s*hidden|text-indent:\s*-/.test(code), `${file}: no visually hidden keyword layer`);
  }
});

test("structured data describes only the site itself, never omitted or invented content (§14)", () => {
  // §14: "Structured data MUST describe only visible, eligible content" and
  // "Hidden or omitted products, evidence, industries, or FAQs MUST NOT remain
  // represented as if visible and current." The Homepage emits Organization +
  // WebSite only — nothing derived from the conditional sections.
  assert.match(PAGE_CODE, /jsonLdGraph\(\[organizationSchema\(\), websiteSchema\(\)\]\)/, "only Organization and WebSite are emitted");
  for (const forbidden of ["ProductSchema", "productSchema", "faqSchema", "reviewSchema", "aggregateRating", "offerSchema"]) {
    assert.ok(!PAGE_CODE.includes(forbidden), `${forbidden} would describe content the Homepage does not reliably render`);
  }
});
