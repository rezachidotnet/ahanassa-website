import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { attachRfqPublicCategories, findCatalogItemByXid, groupCatalogItemsForSelector } from "./catalog-selector.ts";
import { indexPublicCategoriesByGroupCode, resolveRfqPublicCategory } from "../catalog/public-categories.ts";
import { buildCatalogItemRecord } from "./catalog-preselection.ts";
import { buildRfqItemInput, createCatalogRowFromSelection } from "./item-row-validation.ts";
import type { RfqCatalogSelection } from "../catalog/editorial-repository.ts";
import type { PublicCatalogCategory } from "../catalog/types.ts";

// RFQ selector categories come from the locale's own public-category snapshot
// (catalog_public_categories, Odoo /api/v1/catalog/categories) through the same
// group_codes membership /products?category= filters on — never from the
// Persian-only product_variants.family_name, and never from a Website mapping.

type Loc = "fa" | "en" | "ar";

// Test fixture shaped exactly like the staging snapshot of 2026-09-30 (Odoo
// order, names and group_codes per locale). Fixture data only: the code under
// test reads whatever the snapshot contains.
const SNAPSHOT: Record<Loc, Array<[string, string, string[]]>> = {
  fa: [["REBAR", "میلگرد", ["REBAR"]], ["BEAM", "تیرآهن", ["BEAMS"]], ["ANGLE", "نبشی", ["ANGLE"]], ["CHANNEL", "ناودانی", ["CHANNEL"]], ["BOX_SECTION", "قوطی", ["RHS", "SHS"]], ["SHEET_PLATE", "ورق", ["SHEET_PLATE"]], ["PIPE", "لوله", ["SEAMLESS_PIPE"]]],
  en: [["REBAR", "Rebar", ["REBAR"]], ["BEAM", "Beams", ["BEAMS"]], ["ANGLE", "Angle Bar", ["ANGLE"]], ["CHANNEL", "Channel", ["CHANNEL"]], ["BOX_SECTION", "Box Section", ["RHS", "SHS"]], ["SHEET_PLATE", "Sheet & Plate", ["SHEET_PLATE"]], ["PIPE", "Pipe", ["SEAMLESS_PIPE"]]],
  ar: [["REBAR", "حديد التسليح", ["REBAR"]], ["BEAM", "كمرات فولاذية", ["BEAMS"]], ["ANGLE", "زوايا فولاذية", ["ANGLE"]], ["CHANNEL", "مقاطع U فولاذية", ["CHANNEL"]], ["BOX_SECTION", "مقاطع صندوقية", ["RHS", "SHS"]], ["SHEET_PLATE", "صفائح وألواح فولاذية", ["SHEET_PLATE"]], ["PIPE", "أنابيب فولاذية", ["SEAMLESS_PIPE"]]],
};
const categories = (loc: Loc): PublicCatalogCategory[] =>
  SNAPSHOT[loc].map(([code, name, groupCodes], i) => ({ code, name, sequence: (i + 1) * 10, groupCodes, templateCount: 0, variantCount: 0 }));

// The staging variant distribution (256 active public variants) with the
// Persian-only family names the sync actually stores.
const DISTRIBUTION: Array<[group: string, family: string, familyName: string, templates: number, variants: number]> = [
  ["SHEET_PLATE", "FLAT_PRODUCTS", "محصولات تخت (ورق و کلاف)", 4, 74],
  ["RHS", "HOLLOW_SECTIONS_PROFILES", "قوطی و پروفیل", 1, 38],
  ["SHS", "HOLLOW_SECTIONS_PROFILES", "قوطی و پروفیل", 1, 29],
  ["ANGLE", "LONG_PRODUCTS", "محصولات طویل (مقاطع نوردی)", 1, 5],
  ["BEAMS", "LONG_PRODUCTS", "محصولات طویل (مقاطع نوردی)", 2, 39],
  ["CHANNEL", "LONG_PRODUCTS", "محصولات طویل (مقاطع نوردی)", 2, 14],
  ["REBAR", "LONG_PRODUCTS", "محصولات طویل (مقاطع نوردی)", 4, 45],
  ["SEAMLESS_PIPE", "PIPES_TUBES", "لوله", 1, 12],
];

function selections(): RfqCatalogSelection[] {
  const out: RfqCatalogSelection[] = [];
  let n = 0;
  for (const [group, family, familyName, templates, variants] of DISTRIBUTION) {
    for (let i = 0; i < variants; i += 1) {
      n += 1;
      out.push({
        variantXid: `CVAR-${String(n).padStart(6, "0")}`,
        templateXid: `CTMPL-${group}-${i % templates}`,
        sku: `AA-${group}-${i}`,
        variantSpecLabel: `${i}`,
        productLabel: `${group} product ${i % templates}`,
        templateSlug: `${group.toLowerCase()}-${i % templates}`,
        categoryCode: family,
        categoryLabel: familyName,
        groupCode: group,
      });
    }
  }
  return out;
}

const PERSIAN = /[؀-ۿ]/;
const ARABIC_ONLY_SCRIPT_BUT_NOT_PERSIAN_LETTERS = /[پچژگکی]/; // letters that exist in Persian but not in Arabic

for (const loc of ["fa", "en", "ar"] as const) {
  test(`${loc}: every selector category label is the ${loc} snapshot name, in snapshot order`, () => {
    const { items, unresolvedGroupCodes } = attachRfqPublicCategories(selections(), categories(loc), loc);
    const groups = groupCatalogItemsForSelector(items, loc);
    assert.deepEqual(unresolvedGroupCodes, []);
    assert.deepEqual(
      groups.map((g) => [g.categoryCode, g.categoryLabel]),
      SNAPSHOT[loc].map(([code, name]) => [code, name]),
    );
  });
}

test("en: no Persian category label reaches the selector", () => {
  const groups = groupCatalogItemsForSelector(attachRfqPublicCategories(selections(), categories("en"), "en").items, "en");
  for (const g of groups) assert.doesNotMatch(g.categoryLabel, PERSIAN, `en label must not be Persian: ${g.categoryLabel}`);
});

test("ar: no Persian category label reaches the selector", () => {
  const groups = groupCatalogItemsForSelector(attachRfqPublicCategories(selections(), categories("ar"), "ar").items, "ar");
  for (const g of groups) {
    assert.doesNotMatch(g.categoryLabel, ARABIC_ONLY_SCRIPT_BUT_NOT_PERSIAN_LETTERS, `ar label must not be Persian: ${g.categoryLabel}`);
    assert.ok(!DISTRIBUTION.some(([, , familyName]) => familyName === g.categoryLabel), `ar label must not be a Persian family_name: ${g.categoryLabel}`);
  }
});

test("RHS and SHS group under the one localized BOX_SECTION category", () => {
  for (const [loc, label] of [["fa", "قوطی"], ["en", "Box Section"], ["ar", "مقاطع صندوقية"]] as const) {
    const groups = groupCatalogItemsForSelector(attachRfqPublicCategories(selections(), categories(loc), loc).items, loc);
    const box = groups.filter((g) => g.categoryCode === "BOX_SECTION");
    assert.equal(box.length, 1, `${loc}: exactly one BOX_SECTION group`);
    assert.equal(box[0].categoryLabel, label);
    assert.deepEqual([...new Set(box[0].templates.map((t) => t.groupCode))].sort(), ["RHS", "SHS"]);
    assert.equal(box[0].templates.flatMap((t) => t.variants).length, 67);
  }
});

test("BEAMS resolves to BEAM and SEAMLESS_PIPE resolves to PIPE through the snapshot", () => {
  for (const loc of ["fa", "en", "ar"] as const) {
    const index = indexPublicCategoriesByGroupCode(categories(loc));
    assert.equal(resolveRfqPublicCategory(index, loc, "BEAMS", null).code, "BEAM");
    assert.equal(resolveRfqPublicCategory(index, loc, "SEAMLESS_PIPE", null).code, "PIPE");
  }
  assert.equal(resolveRfqPublicCategory(indexPublicCategoriesByGroupCode(categories("en")), "en", "BEAMS", null).label, "Beams");
  assert.equal(resolveRfqPublicCategory(indexPublicCategoriesByGroupCode(categories("ar")), "ar", "SEAMLESS_PIPE", null).label, "أنابيب فولاذية");
});

test("the mapping is read from the snapshot, not hard-coded: a different snapshot yields a different grouping", () => {
  const custom: PublicCatalogCategory[] = [{ code: "HOLLOW", name: "Hollow", sequence: 1, groupCodes: ["RHS"], templateCount: 0, variantCount: 0 }];
  const index = indexPublicCategoriesByGroupCode(custom);
  assert.equal(resolveRfqPublicCategory(index, "en", "RHS", null).code, "HOLLOW");
  assert.equal(resolveRfqPublicCategory(index, "en", "SHS", null).resolved, false);
});

test("unknown group: en/ar fall back to the neutral group_code, fa to the Persian family_name, and it is reported once", () => {
  const extra: RfqCatalogSelection = { ...selections()[0], variantXid: "CVAR-X1", groupCode: "WIRE_ROD", categoryLabel: "محصولات طویل (مقاطع نوردی)" };
  const extra2: RfqCatalogSelection = { ...extra, variantXid: "CVAR-X2" };
  for (const loc of ["en", "ar"] as const) {
    const { items, unresolvedGroupCodes } = attachRfqPublicCategories([...selections(), extra, extra2], categories(loc), loc);
    const item = findCatalogItemByXid(items, "CVAR-X1")!;
    assert.equal(item.publicCategoryLabel, "WIRE_ROD");
    assert.equal(item.publicCategoryCode, "group:WIRE_ROD", "an unresolved key must not collide with a real category code");
    assert.deepEqual(unresolvedGroupCodes, ["WIRE_ROD"], "one report per unresolved group, not per variant");
    const groups = groupCatalogItemsForSelector(items, loc);
    assert.equal(groups.at(-1)!.categoryLabel, "WIRE_ROD", "unresolved groups sort after every snapshot category");
  }
  const fa = findCatalogItemByXid(attachRfqPublicCategories([extra], categories("fa"), "fa").items, "CVAR-X1")!;
  assert.equal(fa.publicCategoryLabel, "محصولات طویل (مقاطع نوردی)");
});

test("a variant with no group_code at all falls into the localized 'other' bucket, never dropped", () => {
  const orphan: RfqCatalogSelection = { ...selections()[0], variantXid: "CVAR-X9", groupCode: null, categoryLabel: null };
  const groups = groupCatalogItemsForSelector(attachRfqPublicCategories([orphan], categories("en"), "en").items, "en");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].categoryCode, null);
  assert.equal(groups[0].categoryLabel, "Other categories");
});

test("all 256 selectable variants remain available, each exactly once, in every locale", () => {
  for (const loc of ["fa", "en", "ar"] as const) {
    const input = selections();
    const { items } = attachRfqPublicCategories(input, categories(loc), loc);
    const grouped = groupCatalogItemsForSelector(items, loc).flatMap((g) => g.templates.flatMap((t) => t.variants));
    assert.equal(input.length, 256);
    assert.equal(grouped.length, 256);
    assert.deepEqual(new Set(grouped.map((v) => v.variantXid)), new Set(input.map((v) => v.variantXid)));
  }
});

test("RFQ values are unchanged: persisted category and wire payload do not depend on the display category", () => {
  const { items } = attachRfqPublicCategories(selections(), categories("en"), "en");
  const rhs = items.find((i) => i.groupCode === "RHS")!;
  // Product label, SKU, spec label and the persisted family category are untouched.
  const original = selections().find((s) => s.variantXid === rhs.variantXid)!;
  for (const key of ["variantXid", "templateXid", "sku", "variantSpecLabel", "productLabel", "categoryCode", "categoryLabel", "groupCode"] as const) {
    assert.equal(rhs[key], original[key], `${key} must be unchanged`);
  }
  const record = buildCatalogItemRecord(rhs, { quantityText: "5 تن", quantityValue: 5, quantityScale: 0 }, null, { code: "ton", label: "ton" });
  assert.equal(record.categoryRef, "HOLLOW_SECTIONS_PROFILES");
  assert.equal(record.categoryLabel, "قوطی و پروفیل");
  assert.equal(record.variantRef, rhs.variantXid);
  // A preselected row keeps its CVAR id; the wire payload carries only the variant id.
  const row = createCatalogRowFromSelection({ categoryCode: rhs.publicCategoryCode, templateXid: rhs.templateXid, variantXid: rhs.variantXid });
  assert.ok(row.fields.mode === "catalog");
  assert.equal(row.fields.categoryCode, "BOX_SECTION");
  const wire = buildRfqItemInput({ ...row.fields, quantityValue: "5", unit: "ton" }, "en");
  assert.ok(wire && "catalogVariantXid" in wire);
  assert.equal(wire.catalogVariantXid, rhs.variantXid);
  assert.ok(!("categoryCode" in wire) && !("categoryLabel" in wire), "no category travels on the wire");
});

// --- locale isolation / caching -------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const read = (p: string) => readFileSync(path.join(repoRoot, p), "utf8");

test("fa and en selector data cannot be served to each other: per-locale JSON path, no cache layer, locale bound on both reads", () => {
  // Static /contact (architecture V1.1 §4.2): the form loads its locale's own
  // /data/rfq-catalog.<locale>.json, built by buildPublicRfqCatalog(locale).
  const form = read("components/contact/static-enquiry-form.tsx");
  assert.match(form, /fetch\(publicRfqCatalogPath\(locale\)\)/);
  const builder = read("lib/catalog/public-rfq-catalog.ts");
  assert.match(builder, /listRfqSelectableCatalogItems\(locale\)/);
  for (const src of [read("app/[locale]/contact/page.tsx"), builder]) {
    for (const marker of ["revalidate", "\"use cache\"", "unstable_cache", "force-static", "cacheLife", "cacheTag"]) {
      assert.ok(!src.includes(marker), `/contact selector data must not introduce a cache (${marker}) — it is per-locale`);
    }
  }

  const repo = read("lib/catalog/editorial-repository.ts");
  const fn = repo.slice(repo.indexOf("export async function listRfqSelectableCatalogItems"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /listPublicCatalogCategories\(locale\)/, "the category snapshot is read for the requested locale");
  assert.match(body, /\.bind\(locale\)/, "the variant/editorial read is bound to the requested locale");
  assert.match(body, /attachRfqPublicCategories\(selections, categories, locale\)/);
  assert.ok(!/new Map|WeakMap|globalThis/.test(body), "no module-level memo that could leak one locale's result into another");

  // And the pure step is a function of the locale's snapshot only.
  const fa = attachRfqPublicCategories(selections(), categories("fa"), "fa").items.map((i) => i.publicCategoryLabel);
  const en = attachRfqPublicCategories(selections(), categories("en"), "en").items.map((i) => i.publicCategoryLabel);
  assert.notDeepEqual(fa, en);
});

test("an empty or unreadable snapshot keeps all 256 variants selectable and still no Persian label on en/ar", () => {
  for (const loc of ["en", "ar"] as const) {
    const { items, unresolvedGroupCodes } = attachRfqPublicCategories(selections(), [], loc);
    assert.equal(items.length, 256);
    assert.equal(unresolvedGroupCodes.length, DISTRIBUTION.length);
    for (const g of groupCatalogItemsForSelector(items, loc)) assert.doesNotMatch(g.categoryLabel, PERSIAN);
  }
  const repo = read("lib/catalog/editorial-repository.ts");
  assert.match(
    repo,
    /listPublicCatalogCategories\(locale\)\.catch\([\s\S]*?console\.error\("RFQ_SELECTOR_CATEGORIES_READ_ERROR"[\s\S]*?return \[\] as PublicCatalogCategory\[\];/,
    "a failed category read (e.g. migration 0011 missing) must degrade, never take down /contact",
  );
});

test("unresolved groups are logged once each, with locale and group_code only", () => {
  const repo = read("lib/catalog/editorial-repository.ts");
  assert.match(repo, /for \(const groupCode of unresolvedGroupCodes\) \{\n\s+console\.warn\("RFQ_SELECTOR_CATEGORY_UNRESOLVED", JSON\.stringify\(\{ locale, groupCode \}\)\);/);
});

// --- prefetch ----------------------------------------------------------------

function linkTags(src: string): string[] {
  return [...src.matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]);
}

test("every per-variant /contact?variant= RFQ link is a plain anchor that cannot prefetch", () => {
  // Architecture V1.1 §4.2 (A1): the project Link is a plain <a> — no prefetch exists at all.
  const files = ["components/products/variant-spec-table.tsx"];
  let found = 0;
  for (const f of files) {
    const src = read(f);
    assert.match(src, /import Link from "@\/components\/ui\/link";/, `${f}: must use the project Link (plain <a>)`);
    assert.ok(!src.includes('"next/link"'), `${f}: must not use next/link`);
    for (const tag of linkTags(src).filter((t) => t.includes("?variant="))) {
      found += 1;
      assert.match(tag, /localizedPath\(locale, "\/contact"\)\}\?variant=\$\{encodeURIComponent\(variant\.xid\)\}/, "destination unchanged");
      assert.match(tag, /aria-label=\{t\.requestAria\(/, "accessible name unchanged");
    }
  }
  assert.equal(found, 1, "the spec table is the only per-variant RFQ link");
});

test("no component passes a prefetch prop any more (plain anchors have none)", () => {
  for (const f of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx", "components/products/catalog-template-grid.tsx", "app/[locale]/products/[slug]/page.tsx"]) {
    const src = read(f);
    assert.ok(!/\bprefetch=/.test(src), `${f}: plain anchors take no prefetch prop`);
  }
});
