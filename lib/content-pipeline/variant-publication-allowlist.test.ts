import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CatalogApiProduct } from "../catalog/odoo-api-client.ts";
import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { assembleSnapshotTables } from "./assemble.ts";
import type { D1Source } from "./d1-source.ts";
import type { OdooSource } from "./odoo-source.ts";
import { mirrorStatements } from "./publication-sql.ts";
import { validateSource } from "./validate.ts";
import { isPublicOnFirstPublish, PUBLIC_ON_FIRST_PUBLISH, validateVariantAllowlist } from "./variant-publication-allowlist.ts";
import { HOLLOW_SECTION_MASS_NOTE, isEn10219HollowSection } from "../catalog/specification-presenter.ts";

/** W9.12 — the 24 EN 10219-2 hollow sections: public on first publish (reviewed list), and the mass note. */

const repo = path.resolve(import.meta.dirname, "../..");
const NEW_SKU = "AA-PF-SHS-S20X20X2-L6";
const OTHER_NEW_SKU = "AA-PF-SHS-S20X20X9-L6"; // a new Odoo variant NOT on the list

function hollow(canonical_id: string, sku: string): CatalogApiProduct {
  return {
    id: null,
    template_id: null,
    canonical_id,
    canonical_template_id: "CTMPL-000050",
    sku,
    name: `[${sku}] name`,
    template_name: "SHS",
    commercial_size: "20×20×2",
    section_size: null,
    schedule: "",
    classification: { family: { code: "HOLLOW_SECTIONS_PROFILES", name: "x" }, group: { code: "SHS", name: "x" }, form: { code: "SHS_FORM", name: "x" } },
    grade: { code: "S235JRH", name: "S235JRH" },
    standard: { code: "EN10219-2", name: "EN 10219-2" },
    dimensions: { height_mm: 20, width_mm: 20, thickness_mm: 2 },
    nominal_weight: { kg_m: 1.05 },
    allowed_commercial_units: "kg, ton",
    inventory_uom: "kg",
    active: true,
    updated_at: "2026-10-20 20:00:00",
  };
}

function odooSource(products: CatalogApiProduct[]): OdooSource {
  const cat = (name: string) => ({ code: "BOX_SECTION", name, sequence: 10, group_codes: ["SHS"], template_count: 1, variant_count: products.length });
  const pg = (name: string) => [{ id: "SHEET_PROCESSING", name, sequence: 10, active: true, updated_at: "2026-09-19 20:31:53" }];
  return {
    schema: "odoo-source.v1",
    base_url: "https://odoo.example",
    fetched_at: "2026-10-21T08:00:00.000Z",
    finished_at: "2026-10-21T08:00:06.000Z",
    requests: [],
    meta: { families: [{ code: "HOLLOW_SECTIONS_PROFILES", name: "x" }], groups: [{ code: "SHS", name: "x" }], forms: [{ code: "SHS_FORM", name: "x" }], grades: [{ code: "S235JRH", name: "S235JRH" }], standards: [] },
    categories: { fa: [cat("قوطی")], en: [cat("Hollow sections")], ar: [cat("الحديد المربع")] },
    categories_last_modified: { fa: "2026-09-27T16:49:29.000Z", en: "2026-09-27T16:49:29.000Z", ar: "2026-09-27T16:49:29.000Z" },
    products,
    products_reported_total: products.length,
    processing_groups: { fa: pg("فرآوری ورق"), en: pg("Sheet processing"), ar: pg("معالجة الصفائح") },
  };
}

function emptyTables(): SnapshotV1["tables"] {
  return { catalog_public_categories: [], catalog_products: [], product_variants: [], product_seo_contents: [], public_processing_groups: [], route_redirects: [], homepage_product_rank: [], catalog_group_labels: [], published_prices: [], published_price_history: [], published_factory_prices: [], published_articles: [], published_indicators: [], published_indicator_points: [] };
}

const d1 = (tables: SnapshotV1["tables"]): D1Source => ({ schema: "d1-source.v1", read_at: "2026-10-21T08:00:00.000Z", tables, publication: { active_version: null, versions: [] } });
const flag = (tables: SnapshotV1["tables"], sku: string) => tables.product_variants.find((v) => v.sku === sku)?.is_public;

test("the list: exactly the 24 W9.12 SKUs (15 SHS + 9 RHS), unique, each with its decision; never a pattern", () => {
  // W9.13 added its own entries (variant-publication-allowlist-w913.test.ts); the W9.12 decision covers exactly these.
  const w912 = PUBLIC_ON_FIRST_PUBLISH.filter((v) => v.decision.startsWith("W9.12"));
  const skus = w912.map((v) => v.sku);
  assert.equal(skus.length, 24);
  assert.equal(new Set(skus).size, 24);
  assert.equal(skus.filter((s) => s.startsWith("AA-PF-SHS-")).length, 15);
  assert.equal(skus.filter((s) => s.startsWith("AA-PF-RHS-")).length, 9);
  for (const v of w912) {
    assert.match(v.sku, /^AA-PF-(SHS|RHS)-S\d+X\d+X\d+(P5)?-L6$/);
    assert.match(v.decision, /owner 2026-10-20/);
  }
  // The three sizes the owner dropped (no official EN 10219-2 catalogue) are not on it.
  for (const dropped of ["AA-PF-SHS-S20X20X2P5-L6", "AA-PF-SHS-S90X90X2-L6", "AA-PF-SHS-S90X90X2P5-L6"]) assert.equal(isPublicOnFirstPublish(dropped), false);
  assert.equal(isPublicOnFirstPublish(OTHER_NEW_SKU), false);
});

test("assemble: a listed SKU Odoo introduces starts public; any other new variant stays not public", () => {
  const out = assembleSnapshotTables(odooSource([hollow("CVAR-009001", NEW_SKU), hollow("CVAR-009002", OTHER_NEW_SKU)]), d1(emptyTables()), "2026-10-21T08:00:00.000Z");
  assert.equal(flag(out, NEW_SKU), 1);
  assert.equal(flag(out, OTHER_NEW_SKU), 0, "never «all new variants»");
});

test("absent: before Odoo #33 is deployed the listed SKUs are simply missing — assemble and validate pass, no warning", () => {
  const odoo = odooSource([hollow("CVAR-009002", OTHER_NEW_SKU)]);
  const tables = assembleSnapshotTables(odoo, d1(emptyTables()), odoo.fetched_at);
  assert.equal(tables.product_variants.length, 1);
  assert.deepEqual(validateVariantAllowlist(tables.product_variants), []);
  assert.ok(!validateSource(odoo, tables).warnings.some((w) => w.includes("public-on-first-publish")));
});

test("after the first publish DB_PUBLIC owns the flag: the mirror persists 1, an editor's 0 is kept, and the list never re-enables it", () => {
  const db = new DatabaseSync(":memory:");
  const dir = path.join(repo, "migrations_public");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const odoo = odooSource([hollow("CVAR-009001", NEW_SKU)]);
  const first = assembleSnapshotTables(odoo, d1(emptyTables()), odoo.fetched_at);
  for (const s of mirrorStatements(first)) db.exec(s);
  const stored = () => (db.prepare("SELECT is_public FROM product_variants WHERE sku = ?").get(NEW_SKU) as { is_public: number }).is_public;
  assert.equal(stored(), 1, "the new row is inserted whole, public");

  db.exec(`UPDATE product_variants SET is_public = 0 WHERE sku = '${NEW_SKU}'`); // the editorial switch-off
  const fromD1 = { ...emptyTables(), catalog_products: db.prepare("SELECT * FROM catalog_products").all(), product_variants: db.prepare("SELECT * FROM product_variants").all() } as unknown as SnapshotV1["tables"];
  const second = assembleSnapshotTables(odoo, d1(fromD1), odoo.fetched_at);
  assert.equal(flag(second, NEW_SKU), 0, "an existing row keeps DB_PUBLIC's flag");
  for (const s of mirrorStatements(second)) db.exec(s);
  assert.equal(stored(), 0, "the mirror never writes is_public on an existing row");
  assert.equal(validateVariantAllowlist(second.product_variants).length, 1, "…and the run warns about it");
  assert.match(validateVariantAllowlist(second.product_variants)[0], /not public in DB_PUBLIC/);
});

test("mass note: the owner's text in fa/en/ar; SHS/RHS with EN 10219-2 only", () => {
  assert.equal(HOLLOW_SECTION_MASS_NOTE.fa, "وزن اسمی طبق EN 10219-2؛ وزن واقعی هر شاخه بسته به کارخانه ممکن است بیشتر باشد.");
  assert.equal(HOLLOW_SECTION_MASS_NOTE.en, "Nominal mass to EN 10219-2; the actual weight of a bar may be higher depending on the mill.");
  assert.equal(HOLLOW_SECTION_MASS_NOTE.ar, "الوزن الاسمي وفق EN 10219-2؛ قد يكون الوزن الفعلي للقطعة أعلى حسب المصنع.");
  assert.ok(!/[پچژگکی]/.test(HOLLOW_SECTION_MASS_NOTE.ar), "ar: Arabic letters only");
  assert.ok(!/[؀-ۿ]/.test(HOLLOW_SECTION_MASS_NOTE.en), "en: no Arabic script");
  assert.equal(isEn10219HollowSection({ groupCode: "SHS", standard: "EN10219-2" }), true);
  assert.equal(isEn10219HollowSection({ formCode: "RHS_FORM", standard: "EN 10219-2" }), true, "download variants: form code + display name");
  assert.equal(isEn10219HollowSection({ groupCode: "SHS", standard: "EN 10210-2" }), false, "another standard: no note");
  assert.equal(isEn10219HollowSection({ groupCode: "REBAR", standard: "EN10219-2" }), false);
  assert.equal(isEn10219HollowSection({ groupCode: "SHS", standard: null }), false);
});

test("mass note wiring: product variant table and spec-sheet PDF, under the weights", () => {
  const table = fs.readFileSync(path.join(repo, "components/products/variant-spec-table.tsx"), "utf8");
  assert.match(table, /weightColumns\.length > 0 && variants\.some\(\(v\) => isEn10219HollowSection\(\{ groupCode: v\.group\.code, formCode: v\.form\.code, standard: v\.standard\.code \?\? v\.standard\.name \}\)\) && <p[^>]*>\{HOLLOW_SECTION_MASS_NOTE\[locale\]\}<\/p>/);
  const pdf = fs.readFileSync(path.join(repo, "lib/downloads/pdf/render.ts"), "utf8");
  assert.match(pdf, /if \(weightKeys\.length && variants\.some\(\(v\) => isEn10219HollowSection\(v\)\)\) \{[\s\S]*?HOLLOW_SECTION_MASS_NOTE\[locale\]/);
});
