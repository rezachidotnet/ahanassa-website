import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CatalogApiCategory, CatalogApiProduct } from "./odoo-api-client.ts";
import { resolveCatalogMedia, resolveCategoryMedia } from "./media-registry.ts";
import { findCategoryForVariant, parseCategoryRow, toPublicCatalogCategory } from "./public-categories.ts";
import type { PublicCatalogCategory } from "./types.ts";
import { CATEGORY_MARKET_NAMES, groupProductFamilies, withMarketName } from "../content/category-nav.ts";
import { CATEGORIES_WITHOUT_CALCULATOR, CATEGORY_SEO, categorySeo } from "../content/category-seo.ts";
import { EXPORT_COPY } from "../content/export.ts";
import { getAllowedUomsForCatalogGroup, LAUNCH_DEFERRED_UOMS } from "../rfq/uom-policy.ts";
import { matchLine } from "../rfq/extract/match.ts";
import type { PublicRfqCatalogItem } from "../rfq/catalog-selector.ts";
import type { ExtractedLine } from "../rfq/extract/lines.ts";
import { assembleSnapshotTables } from "../content-pipeline/assemble.ts";
import type { D1Source } from "../content-pipeline/d1-source.ts";
import { selectTableSql } from "../content-pipeline/d1-source.ts";
import type { OdooSource } from "../content-pipeline/odoo-source.ts";
import { categoryReplaceBatches } from "../content-pipeline/publication-sql.ts";
import { validateSource } from "../content-pipeline/validate.ts";
import { readSnapshotFile } from "../static/snapshot-io.ts";
import { BUILD_ONLY_COLUMNS_DDL, type SnapshotV1 } from "../contracts/snapshot-v1.ts";

/**
 * W17.4 — the website side of the six W9.8 flat templates (Odoo ahanassa_catalog_flat_raw): galvanized coil
 * and cut sheet DX51D+Z, PPGI coil, HRC coil S235JR, CRC coil and cut sheet DC01, under the public categories
 * GALVANIZED_SHEET, PREPAINTED_SHEET, HOT_ROLLED_COIL, COLD_ROLLED (Form-level mappings,
 * ahanassa_marketplace 19.0.53.0.0). Fixture: fixtures/snapshot/w98-flat-2026-10-14.snapshot.json
 * (scripts/static/w98-flat-fixture.ts).
 */

const repo = path.resolve(import.meta.dirname, "../..");
const FIXTURE = path.join(repo, "fixtures/snapshot/w98-flat-2026-10-14.snapshot.json");
const NEW = ["GALVANIZED_SHEET", "PREPAINTED_SHEET", "HOT_ROLLED_COIL", "COLD_ROLLED"];

const cat = (code: string, name: string, groupCodes: string[], formCodes: string[] = []): PublicCatalogCategory => ({ code, name, sequence: 0, groupCodes, formCodes, templateCount: 1, variantCount: 1 });
const FA: PublicCatalogCategory[] = [
  cat("REBAR", "میلگرد", ["REBAR"]),
  cat("BOX_SECTION", "قوطی", ["RHS", "SHS"]),
  cat("SHEET_PLATE", "ورق", ["SHEET_PLATE"]),
  cat("GALVANIZED_SHEET", "ورق گالوانیزه", ["FLAT_COILS", "SHEET_PLATE"], ["GALVANIZED", "GALVANIZED_COIL"]),
  cat("PREPAINTED_SHEET", "ورق رنگی (پیش‌رنگ‌شده)", ["FLAT_COILS"], ["PREPAINTED_COIL"]),
  cat("HOT_ROLLED_COIL", "ورق سیاه رول (کلاف گرم)", ["FLAT_COILS"], ["HOT_ROLLED_COIL"]),
  cat("COLD_ROLLED", "ورق روغنی (کلاف سرد)", ["FLAT_COILS", "SHEET_PLATE"], ["COLD_ROLLED", "COLD_ROLLED_COIL"]),
  cat("PIPE", "لوله", ["SEAMLESS_PIPE"]),
];

// --- 1. labels -------------------------------------------------------------------------------------------

test("fa market names replace Odoo's fa name of the four flat categories only; en/ar and every other category keep Odoo's", () => {
  const fa = FA.map((c) => withMarketName(c, "fa"));
  assert.deepEqual(fa.filter((c) => NEW.includes(c.code)).map((c) => c.name), ["ورق گالوانیزه", "ورق رنگی (PPGI)", "ورق سیاه رول (کلاف گرم)", "ورق روغنی (نورد سرد)"]);
  assert.equal(fa.find((c) => c.code === "SHEET_PLATE")?.name, "ورق");
  assert.equal(withMarketName(cat("COLD_ROLLED", "Cold-Rolled Sheet & Coil (CRC)", ["FLAT_COILS"]), "en").name, "Cold-Rolled Sheet & Coil (CRC)");
  assert.deepEqual(Object.keys(CATEGORY_MARKET_NAMES).sort(), [...NEW].sort());
  const repoSource = fs.readFileSync(path.join(repo, "lib/catalog/editorial-repository.ts"), "utf8");
  assert.match(repoSource, /\.map\(\(c\) => withMarketName\(c, locale\)\)/, "applied once, at the single category read every surface uses");
});

test("category pages: copy for all four in fa/ar/en, with the catalog's grade, standard and the market words", () => {
  const facts: Record<string, RegExp[]> = {
    GALVANIZED_SHEET: [/DX51D\+Z/, /EN 10346/, /رول/, /شیت/],
    PREPAINTED_SHEET: [/PPGI/, /EN 10169/, /DX51D\+Z/, /رول/],
    HOT_ROLLED_COIL: [/S235JR/, /ST37/, /EN 10051/, /کلاف/, /رول/],
    COLD_ROLLED: [/DC01/, /ST12/, /EN 10130/, /روغنی/, /شیت/, /رول/],
  };
  for (const code of NEW) {
    const fa = categorySeo(code, "fa", false)!;
    for (const fact of facts[code]) assert.match(`${fa.title} ${fa.description} ${fa.intro}`, fact, `${code} fa: ${fact}`);
    for (const locale of ["en", "ar"] as const) assert.ok(categorySeo(code, locale, false), `${code} ${locale}`);
    assert.ok(CATEGORIES_WITHOUT_CALCULATOR.has(code), `${code}: the calculator has no coil shape, so no calculator link`);
  }
  assert.ok(!CATEGORIES_WITHOUT_CALCULATOR.has("SHEET_PLATE"));
  // Thickness ranges are the catalog's (ahanassa_catalog_flat_raw tools/build_catalog.py).
  assert.match(CATEGORY_SEO.GALVANIZED_SHEET.en.intro, /0\.4 to 3 mm/);
  assert.match(CATEGORY_SEO.PREPAINTED_SHEET.en.intro, /0\.4 to 0\.7 mm/);
  assert.match(CATEGORY_SEO.HOT_ROLLED_COIL.en.intro, /2 to 15 mm/);
  assert.match(CATEGORY_SEO.COLD_ROLLED.en.intro, /0\.4 to 2 mm.*0\.5 to 2 mm/);
});

test("export page (en/ar) names the four flat categories once Odoo publishes them", () => {
  for (const locale of ["en", "ar"] as const) for (const code of NEW) assert.ok(EXPORT_COPY[locale].categories[code], `${locale} ${code}`);
});

// --- 6. navigation ---------------------------------------------------------------------------------------

test("navigation: the sheet categories collapse into one «ورق» entry at the first one's place, in Odoo's order", () => {
  const items = FA.map((c) => withMarketName(c, "fa")).map((c) => ({ code: c.code, name: c.name }));
  const entries = groupProductFamilies(items, "fa");
  assert.deepEqual(entries.map((e) => e.code), ["REBAR", "BOX_SECTION", "family:SHEET", "PIPE"]);
  const family = entries[2];
  assert.equal(family.name, "ورق");
  assert.deepEqual("children" in family && family.children?.map((c) => [c.code, c.name]), [
    ["SHEET_PLATE", "ورق سیاه و پلیت"],
    ["GALVANIZED_SHEET", "ورق گالوانیزه"],
    ["PREPAINTED_SHEET", "ورق رنگی (PPGI)"],
    ["HOT_ROLLED_COIL", "ورق سیاه رول (کلاف گرم)"],
    ["COLD_ROLLED", "ورق روغنی (نورد سرد)"],
  ]);
  assert.equal(groupProductFamilies(items, "en")[2].name, "Sheet & coil");
  assert.equal(groupProductFamilies(items, "ar")[2].name, "الصاج واللفائف");
});

test("navigation: with fewer than two sheet categories (today) nothing changes; the 8-entry cap counts entries", () => {
  const today = [cat("REBAR", "میلگرد", ["REBAR"]), cat("SHEET_PLATE", "ورق", ["SHEET_PLATE"]), cat("PIPE", "لوله", ["SEAMLESS_PIPE"])].map((c) => ({ code: c.code, name: c.name }));
  assert.deepEqual(groupProductFamilies(today, "fa"), today);
  const repoSource = fs.readFileSync(path.join(repo, "lib/catalog/editorial-repository.ts"), "utf8");
  assert.match(repoSource, /groupProductFamilies\(categories\.map\(\(c\) => \(\{ code: c\.code, name: c\.name \}\)\), locale\)\.slice\(0, MAX_HEADER_PRODUCT_SHORTCUTS\)/);
  // Header + drawer render a family as a heading over its links — never a second disclosure level.
  const drawer = fs.readFileSync(path.join(repo, "components/layout/mobile-nav-drawer.tsx"), "utf8");
  assert.match(drawer, /item\.children \? \(/);
  assert.match(fs.readFileSync(path.join(repo, "components/layout/header-nav-disclosure.tsx"), "utf8"), /item\.children \? \(/);
});

// --- membership (W9.8 Form-level mappings) ---------------------------------------------------------------

test("each W9.8 Form lands in its own category; black sheet and plate stay in SHEET_PLATE", () => {
  const of = (g: string, f: string) => findCategoryForVariant(FA, g, f)?.code;
  assert.equal(of("FLAT_COILS", "GALVANIZED_COIL"), "GALVANIZED_SHEET");
  assert.equal(of("SHEET_PLATE", "GALVANIZED"), "GALVANIZED_SHEET");
  assert.equal(of("FLAT_COILS", "PREPAINTED_COIL"), "PREPAINTED_SHEET");
  assert.equal(of("FLAT_COILS", "HOT_ROLLED_COIL"), "HOT_ROLLED_COIL");
  assert.equal(of("FLAT_COILS", "COLD_ROLLED_COIL"), "COLD_ROLLED");
  assert.equal(of("SHEET_PLATE", "COLD_ROLLED"), "COLD_ROLLED");
  assert.equal(of("SHEET_PLATE", "HOT_ROLLED_PLATE"), "SHEET_PLATE");
  assert.equal(of("SHEET_PLATE", "HOT_ROLLED_SHEET"), "SHEET_PLATE");
});

// --- 2. RFQ units ----------------------------------------------------------------------------------------

test("RFQ units match Odoo allowed_commercial_units: coils kg/ton only (never «coil»), cut sheets kg/ton/sheet", () => {
  assert.deepEqual(getAllowedUomsForCatalogGroup("FLAT_COILS"), ["kg", "ton"]);
  assert.deepEqual(getAllowedUomsForCatalogGroup("SHEET_PLATE"), ["kg", "ton", "sheet"]);
  assert.ok(LAUNCH_DEFERRED_UOMS.includes("coil"));
  const snapshot = readSnapshotFile(FIXTURE);
  for (const v of snapshot.tables.product_variants.filter((x) => x.family_code === "FLAT_PRODUCTS")) {
    const odoo = (v.allowed_commercial_units ?? "").split(",").map((u) => u.trim());
    assert.deepEqual([...getAllowedUomsForCatalogGroup(v.group_code)], odoo, `${v.sku}: website units = Odoo allowed_commercial_units`);
  }
});

// --- 3. media --------------------------------------------------------------------------------------------

test("media: no flat product borrows the black-plate photo; new categories show the generic illustration", () => {
  const media = (groupCode: string, formCode: string) => resolveCatalogMedia({ templateXid: "CTMPL-9", groupCode, familyCode: "FLAT_PRODUCTS", formCode });
  for (const [g, f] of [["SHEET_PLATE", "GALVANIZED"], ["SHEET_PLATE", "COLD_ROLLED"], ["SHEET_PLATE", "PREPAINTED_SHEET"], ["FLAT_COILS", "GALVANIZED_COIL"], ["FLAT_COILS", "HOT_ROLLED_COIL"]]) {
    assert.equal(media(g, f).source, "generic_fallback", `${g}/${f}`);
  }
  assert.equal(media("SHEET_PLATE", "HOT_ROLLED_PLATE").src, "/images/products/sheet-plate.jpg");
  assert.equal(media("SHEET_PLATE", "HOT_ROLLED_SHEET").src, "/images/products/sheet-plate.jpg");
  for (const code of NEW) assert.equal(resolveCategoryMedia(code).source, "generic_fallback", code);
});

// --- RFQ instant extraction ------------------------------------------------------------------------------

/** One extracted row: the product column (quantity is its own column in a real extraction). */
const line = (text: string): ExtractedLine => ({ rawText: text, product: text } as ExtractedLine);
const item = (xid: string, templateXid: string, groupCode: string, publicCategoryCode: string, size: string): PublicRfqCatalogItem =>
  ({ variantXid: xid, templateXid, sku: xid, variantSpecLabel: size, productLabel: templateXid, templateSlug: templateXid.toLowerCase(), categoryCode: "FLAT_PRODUCTS", groupCode, publicCategoryCode, publicCategoryLabel: publicCategoryCode }) as PublicRfqCatalogItem;
const CATALOG = [
  item("V1", "T-PLATE-S235", "SHEET_PLATE", "SHEET_PLATE", "10×1500×6000"),
  item("V2", "T-GI-COIL", "FLAT_COILS", "GALVANIZED_SHEET", "0.5×1250"),
  item("V3", "T-GI-SHEET", "SHEET_PLATE", "GALVANIZED_SHEET", "0.5×1250×2500"),
  item("V4", "T-PPGI", "FLAT_COILS", "PREPAINTED_SHEET", "0.5×1250 آبی"),
  item("V5", "T-HRC", "FLAT_COILS", "HOT_ROLLED_COIL", "3×1250"),
  item("V6", "T-CRC", "FLAT_COILS", "COLD_ROLLED", "1×1250"),
];

test("extraction: galvanized, PPGI, oiled and hot-rolled coil lines reach their own category, never black plate", () => {
  assert.equal(matchLine(line("ورق گالوانیزه ۰.۵ ۱۲۵۰ ۲۵۰۰"), CATALOG).variant?.variantXid, "V3");
  assert.equal(matchLine(line("ورق رنگی آبی ۰.۵ ۱۲۵۰"), CATALOG).categoryCode, "PREPAINTED_SHEET");
  assert.equal(matchLine(line("ورق روغنی رول ۱ میل ۱۲۵۰"), CATALOG).variant?.variantXid, "V6");
  assert.equal(matchLine(line("ورق سیاه رول ۳ میل عرض ۱۲۵۰"), CATALOG).variant?.variantXid, "V5");
  assert.equal(matchLine(line("HRC coil 3mm 1250"), CATALOG).variant?.variantXid, "V5");
  assert.equal(matchLine(line("galvanized coil DX51D+Z 0.5x1250"), CATALOG).variant?.variantXid, "V2", "the grade's digits are not a size");
  assert.equal(matchLine(line("ورق پلیت ۱۰ ST37 ۱۵۰۰×۶۰۰۰"), CATALOG).variant?.variantXid, "V1");
});

test("extraction: a coated qualifier on another family, or a flat line Odoo has not published, is still not in the catalog", () => {
  assert.equal(matchLine(line("لوله گالوانیزه ۲ اینچ ۱۰ شاخه"), CATALOG).status, "not_in_catalog");
  assert.equal(matchLine(line("پروفیل رنگی ۴۰×۴۰ ۱ تن"), CATALOG).status, "not_in_catalog");
  const noFlat = CATALOG.filter((i) => i.publicCategoryCode === "SHEET_PLATE");
  assert.equal(matchLine(line("ورق گالوانیزه ۰.۵ ۲ تن"), noFlat).status, "not_in_catalog");
  assert.equal(matchLine(line("ورق روغنی ۱ میل ۲ تن"), noFlat).status, "not_in_catalog");
});

// --- 5. the daily publish / price run ----------------------------------------------------------------------

function product(sku: string, tmpl: string, group: string, form: string): CatalogApiProduct {
  return {
    id: null, template_id: null, canonical_id: `CVAR-${sku}`, canonical_template_id: tmpl, sku, name: `[${sku}] x`, template_name: tmpl, commercial_size: "1", section_size: null, schedule: "",
    classification: { family: { code: "FLAT_PRODUCTS", name: "x" }, group: { code: group, name: "x" }, form: { code: form, name: "x" } },
    grade: { code: "S235JR", name: "S235JR" }, standard: { code: null, name: null }, dimensions: { thickness_mm: 1 }, nominal_weight: { kg_m2: 7.85 },
    allowed_commercial_units: "kg, ton", inventory_uom: "kg", active: true, updated_at: "2026-10-14 06:00:00",
  } as CatalogApiProduct;
}
function w98Source(categories: CatalogApiCategory[], products: CatalogApiProduct[]): OdooSource {
  const forms = [...new Set(products.map((p) => p.classification.form.code!))];
  const groups = [...new Set(products.map((p) => p.classification.group.code!))];
  const pg = [{ id: "SHEET_PROCESSING", name: "x", sequence: 10, active: true, updated_at: "2026-09-19 20:31:53" }];
  const named = (suffix: string) => categories.map((c) => ({ ...c, name: `${c.code} ${suffix}` }));
  return {
    schema: "odoo-source.v1", base_url: "https://odoo.example", fetched_at: "2026-10-14T07:00:00.000Z", finished_at: "2026-10-14T07:00:06.000Z", requests: [],
    meta: { families: [{ code: "FLAT_PRODUCTS", name: "x" }], groups: groups.map((code) => ({ code, name: "x" })), forms: forms.map((code) => ({ code, name: "x" })), grades: [{ code: "S235JR", name: "x" }], standards: [] },
    categories: { fa: named("فا"), en: named("en"), ar: named("ar") },
    categories_last_modified: { fa: null, en: null, ar: null },
    products, products_reported_total: products.length,
    processing_groups: { fa: pg, en: pg, ar: pg },
  } as OdooSource;
}
const emptyTables = (): SnapshotV1["tables"] => ({ catalog_public_categories: [], catalog_products: [], product_variants: [], product_seo_contents: [], public_processing_groups: [], route_redirects: [], homepage_product_rank: [], catalog_group_labels: [], published_prices: [], published_price_history: [], published_factory_prices: [], published_imported_prices: [], published_articles: [], published_indicators: [], published_indicator_points: [] });
const d1 = (): D1Source => ({ schema: "d1-source.v1", read_at: "2026-10-14T07:00:00.000Z", tables: emptyTables(), publication: { active_version: null, versions: [] } });
const W98_PRODUCTS = [
  product("PL1", "CTMPL-1", "SHEET_PLATE", "HOT_ROLLED_PLATE"),
  product("GC1", "CTMPL-2", "FLAT_COILS", "GALVANIZED_COIL"),
  product("GS1", "CTMPL-3", "SHEET_PLATE", "GALVANIZED"),
  product("HR1", "CTMPL-4", "FLAT_COILS", "HOT_ROLLED_COIL"),
];
const W98_CATEGORIES: CatalogApiCategory[] = [
  { code: "SHEET_PLATE", name: "", sequence: 60, group_codes: ["SHEET_PLATE"], form_codes: [], template_count: 1, variant_count: 1 },
  { code: "GALVANIZED_SHEET", name: "", sequence: 62, group_codes: ["FLAT_COILS", "SHEET_PLATE"], form_codes: ["GALVANIZED", "GALVANIZED_COIL"], template_count: 2, variant_count: 2 },
  { code: "HOT_ROLLED_COIL", name: "", sequence: 66, group_codes: ["FLAT_COILS"], form_codes: ["HOT_ROLLED_COIL"], template_count: 1, variant_count: 1 },
];

test("daily run: Odoo's W9.8 category set (SHEET_PLATE shared by Form) validates — no «group in both», counts by Form", () => {
  const odoo = w98Source(W98_CATEGORIES, W98_PRODUCTS);
  const tables = assembleSnapshotTables(odoo, d1(), odoo.fetched_at);
  const result = validateSource(odoo, tables);
  assert.deepEqual(result.errors, []);
  assert.ok(!result.warnings.some((w) => /in no public category/.test(w)), "every template is in a category");
  assert.deepEqual(JSON.parse(tables.catalog_public_categories.find((c) => c.code === "GALVANIZED_SHEET")!.form_codes_json!), ["GALVANIZED", "GALVANIZED_COIL"]);
});

test("daily run: a real Odoo inconsistency still blocks — a Form claimed twice, or counts that disagree", () => {
  const twice = structuredClone(W98_CATEGORIES);
  twice[2].form_codes = ["HOT_ROLLED_COIL", "GALVANIZED_COIL"];
  const a = w98Source(twice, W98_PRODUCTS);
  assert.ok(validateSource(a, assembleSnapshotTables(a, d1(), a.fetched_at)).errors.some((e) => /form GALVANIZED_COIL is in both GALVANIZED_SHEET and HOT_ROLLED_COIL/.test(e)));
  const wrong = structuredClone(W98_CATEGORIES);
  wrong[0].variant_count = 2; // Odoo would never count the galvanized sheet under SHEET_PLATE
  const b = w98Source(wrong, W98_PRODUCTS);
  assert.ok(validateSource(b, assembleSnapshotTables(b, d1(), b.fetched_at)).errors.some((e) => /SHEET_PLATE: Odoo says 2 variants, the fetched products give 1/.test(e)));
});

test("daily run: form_codes_json is build-only — never selected from nor written to DB_PUBLIC (no remote migration)", () => {
  assert.doesNotMatch(selectTableSql("catalog_public_categories"), /form_codes_json/);
  const db = new DatabaseSync(":memory:");
  const dir = path.join(repo, "migrations_public");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const snapshot = readSnapshotFile(FIXTURE);
  for (const batch of categoryReplaceBatches(snapshot.tables)) {
    assert.doesNotMatch(batch, /form_codes_json/);
    db.exec(batch); // the real DB_PUBLIC schema, which has no form_codes_json column
  }
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM catalog_public_categories").get() as { n: number }).n, 33);
  db.prepare(selectTableSql("catalog_public_categories")).all();
});

test("fixture: the six templates, 154 variants and four categories load into the build database with their forms", () => {
  const snapshot = readSnapshotFile(FIXTURE);
  const flat = snapshot.tables.product_variants.filter((v) => /^CVAR-9/.test(v.xid));
  assert.equal(new Set(flat.map((v) => v.product_id)).size, 6);
  assert.equal(flat.length, 154);
  assert.ok(!JSON.stringify(snapshot).includes("RAL"), "internal colour codes never reach a public snapshot");
  // The static build's load (lib/static/build-runtime/snapshot-d1.ts — not importable under node --test): migrations, the build-only column, the rows.
  assert.match(fs.readFileSync(path.join(repo, "lib/static/build-runtime/snapshot-d1.ts"), "utf8"), /db\.exec\(BUILD_ONLY_COLUMNS_DDL\)/);
  const db = new DatabaseSync(":memory:");
  const dir = path.join(repo, "migrations_public");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  db.exec(BUILD_ONLY_COLUMNS_DDL);
  for (const row of snapshot.tables.catalog_public_categories) {
    const columns = Object.keys(row);
    db.prepare(`INSERT INTO catalog_public_categories (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(...(columns.map((c) => (row as Record<string, unknown>)[c]) as never[]));
  }
  const rows = db.prepare("SELECT code, name, sequence, group_codes_json, form_codes_json, template_count, variant_count FROM catalog_public_categories WHERE locale = 'fa' ORDER BY position").all() as never[];
  const categories = rows.map(parseCategoryRow).filter((c): c is PublicCatalogCategory => c !== null);
  assert.deepEqual(categories.map((c) => c.code), ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", ...NEW, "PIPE"]);
  for (const c of categories) {
    const members = flat.concat(snapshot.tables.product_variants.filter((v) => !/^CVAR-9/.test(v.xid))).filter((v) => findCategoryForVariant(categories, v.group_code, v.form_code)?.code === c.code);
    assert.equal(members.length, c.variantCount, `${c.code}: rendered membership = Odoo's count`);
  }
  assert.deepEqual(toPublicCatalogCategory(W98_CATEGORIES[1]).formCodes, ["GALVANIZED", "GALVANIZED_COIL"]);
});
