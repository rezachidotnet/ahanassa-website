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
import { isPublicOnFirstPublish, PUBLIC_ON_FIRST_PUBLISH } from "./variant-publication-allowlist.ts";
import { PAGES_ON_FIRST_PUBLISH, pageForTemplateSkus, validatePageAllowlist } from "./editorial-page-allowlist.ts";
import {
  DOMESTIC_CHANNEL_NOTE,
  isDomesticChannel,
  isMillWallPipe,
  isThinGalvanizedCoil,
  MILL_WALL_PIPE_NOTE,
  PLATE_S235JR_SIZE_NOTE,
  PLATE_S355JR_SIZE_NOTE,
  publicNominalWeight,
  REBAR_D36_D40_NOTE,
  THIN_GALVANIZED_COIL_NOTE,
  variantPageNotes,
} from "../catalog/specification-presenter.ts";
import { planSectionDrawing, SECTION_SHAPES } from "../downloads/sections.ts";
import { renderSpecSheet } from "../downloads/pdf/render.ts";
import type { DownloadCategory } from "../downloads/model.ts";
import { buildCalculatorProducts, FORM_SHAPES, resolveVariantBasis } from "../weight-calculator/model.ts";
import { attachRfqPublicCategories } from "../rfq/catalog-selector.ts";
import { findCategoryForVariant } from "../catalog/public-categories.ts";
import type { ProductVariant } from "../catalog/types.ts";

/**
 * W9.13 (owner decisions 2026-10-21; ahanassa-odoo w9-13/catalog-phase2): the phase-2 SKUs public on first
 * publish, the three non-standard templates' approved pages, the domestic channel never shown as UPN, and the
 * page notes.
 */

const repo = path.resolve(import.meta.dirname, "../..");
const W913 = "W9.13 catalog phase 2, owner 2026-10-21 (ahanassa-odoo w9-13/catalog-phase2)";
const LOCALES = ["fa", "en", "ar"] as const;
/** The en page rules: no Arabic script, no price word. */
const EN_FORBIDDEN = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]|\bpric|\bcost|\btoman|\brial|\birr\b/i;
/** The ar page rules: no letter or digit only Persian has. */
const PERSIAN_SPECIFIC = /[پچژگکی۰-۹]/;

// --- the variant list ----------------------------------------------------------------------------------------

test("variant list: the 95 W9.13 SKUs of groups 1–5 and 7–9, exactly as the Odoo session's file, one decision", () => {
  const w913 = PUBLIC_ON_FIRST_PUBLISH.filter((v) => v.decision === W913).map((v) => v.sku);
  const count = (re: RegExp) => w913.filter((s) => re.test(s)).length;
  assert.equal(w913.length, 95);
  assert.equal(new Set(PUBLIC_ON_FIRST_PUBLISH.map((v) => v.sku)).size, PUBLIC_ON_FIRST_PUBLISH.length, "unique across W9.12 and W9.13");
  assert.equal(count(/^AA-AN-EQ-S\d+X\d+X\d+(P5)?$/), 29, "1. equal angles (22 + the 7 added by the Odoo session 2026-10-21)");
  assert.equal(count(/^AA-CH-UPN-S(220|240|260|280|300)$/), 5, "2. UPN 220–300");
  assert.equal(count(/^AA-PP-SMLS-A106B-/), 14, "3. seamless pipe SCH80/SCH40");
  assert.equal(count(/^AA-SH-HR-S235JR-/), 16, "4. plate S235JR");
  assert.equal(count(/^AA-SH-HR-S355JR-S(12|25|40)X2000X12000$/), 3, "4. plate S355JR");
  assert.equal(count(/^AA-RB-AJ400-D(36|40)-L12$/), 2, "5. rebar Ø36/40");
  assert.equal(count(/^AA-CH-DOM-S\d+-L(6|12)$/), 18, "7. domestic channel");
  assert.equal(count(/^AA-PP-SMLS-MW-/), 4, "8. mill-wall pipe");
  assert.equal(count(/^AA-CL-GI-S0P3(5)?X(1000|1250)$/), 4, "9. thin galvanized coil");
  // The list matches the input file exactly (when it is present on this machine; CI has only the committed list).
  const file = path.join(process.env.HOME ?? "", "claude-reports/ahanassa/W9_13_ALLOWLIST.md");
  if (fs.existsSync(file)) {
    const groups = fs.readFileSync(file, "utf8").split(/^## /m).filter((s) => /^[1-57-9]\./.test(s));
    const fromFile = groups.flatMap((s) => [...s.matchAll(/```\n([\s\S]*?)```/g)].flatMap((b) => b[1].trim().split("\n")));
    assert.deepEqual([...w913].sort(), [...fromFile].sort());
  }
  assert.equal(isPublicOnFirstPublish("AA-CH-UPN-S200"), false, "an existing UPN size is not re-listed");
});

// --- assemble / mirror / validate --------------------------------------------------------------------------

function variant(canonical_id: string, sku: string, template: string, over: Partial<CatalogApiProduct> = {}): CatalogApiProduct {
  return {
    id: null,
    template_id: null,
    canonical_id,
    canonical_template_id: template,
    sku,
    name: `[${sku}] Domestic channel`,
    template_name: "Domestic channel",
    commercial_size: "100 (6 m)",
    section_size: null,
    schedule: "",
    classification: { family: { code: "LONG_PRODUCTS", name: "x" }, group: { code: "CHANNEL", name: "x" }, form: { code: "DOMESTIC_CHANNEL", name: "x" } },
    grade: { code: null, name: null },
    standard: { code: null, name: null },
    dimensions: { height_mm: 100, length_mm: 6000 },
    nominal_weight: null,
    allowed_commercial_units: "kg, ton",
    inventory_uom: "kg",
    active: true,
    updated_at: "2026-10-21 08:00:00",
    ...over,
  } as CatalogApiProduct;
}

function odooSource(products: CatalogApiProduct[]): OdooSource {
  const templates = new Set(products.map((p) => p.canonical_template_id)).size;
  const cat = (name: string) => ({ code: "CHANNEL", name, sequence: 40, group_codes: ["CHANNEL"], template_count: templates, variant_count: products.length });
  const pg = (name: string) => [{ id: "SHEET_PROCESSING", name, sequence: 10, active: true, updated_at: "2026-09-19 20:31:53" }];
  return {
    schema: "odoo-source.v1",
    base_url: "https://odoo.example",
    fetched_at: "2026-10-21T08:00:00.000Z",
    finished_at: "2026-10-21T08:00:06.000Z",
    requests: [],
    meta: { families: [{ code: "LONG_PRODUCTS", name: "x" }], groups: [{ code: "CHANNEL", name: "x" }], forms: [{ code: "DOMESTIC_CHANNEL", name: "x" }, { code: "UPN", name: "x" }], grades: [], standards: [] },
    categories: { fa: [cat("ناودانی")], en: [cat("Channel")], ar: [cat("مقاطع U فولاذية")] },
    categories_last_modified: { fa: "2026-09-27T16:49:29.000Z", en: "2026-09-27T16:49:29.000Z", ar: "2026-09-27T16:49:29.000Z" },
    products,
    products_reported_total: products.length,
    processing_groups: { fa: pg("فرآوری ورق"), en: pg("Sheet processing"), ar: pg("معالجة الصفائح") },
  } as unknown as OdooSource;
}

function emptyTables(): SnapshotV1["tables"] {
  return { catalog_public_categories: [], catalog_products: [], product_variants: [], product_seo_contents: [], public_processing_groups: [], route_redirects: [], homepage_product_rank: [], catalog_group_labels: [], published_prices: [], published_price_history: [], published_factory_prices: [], published_articles: [], published_indicators: [], published_indicator_points: [] };
}
const d1 = (tables: SnapshotV1["tables"]): D1Source => ({ schema: "d1-source.v1", read_at: "2026-10-21T08:00:00.000Z", tables, publication: { active_version: null, versions: [] } });

const DOMESTIC = [variant("CVAR-913001", "AA-CH-DOM-S100-L6", "CTMPL-000913"), variant("CVAR-913002", "AA-CH-DOM-S100-L12", "CTMPL-000913", { commercial_size: "100 (12 m)", dimensions: { height_mm: 100, length_mm: 12000 } })];

test("pages: a new domestic-channel template starts public with approved, published fa/en/ar pages and public SKUs", () => {
  const tables = assembleSnapshotTables(odooSource(DOMESTIC), d1(emptyTables()), "2026-10-21T08:00:00.000Z");
  const product = tables.catalog_products.find((p) => p.template_xid === "CTMPL-000913");
  assert.equal(product?.is_public, 1);
  const pages = tables.product_seo_contents.filter((s) => s.entity_id === product!.id);
  assert.deepEqual(pages.map((s) => s.locale).sort(), ["ar", "en", "fa"]);
  for (const s of pages) {
    assert.equal(s.content_quality_status, "approved");
    assert.equal(s.index_status, "index");
    assert.ok(s.published_at);
    assert.equal(s.slug, "domestic-channel");
  }
  assert.deepEqual(Object.fromEntries(pages.map((s) => [s.locale, s.h1])), { fa: "ناودانی داخلی", en: "Domestic channel", ar: "مجرى محلي" });
  assert.ok(tables.product_variants.every((v) => v.is_public === 1));
  assert.deepEqual(validatePageAllowlist(tables), []);
});

test("pages: absent before Odoo publishes the draft templates — nothing seeded, no warning; another new template gets no page", () => {
  const other = [variant("CVAR-913101", "AA-CH-UPN-S220", "CTMPL-000018", { classification: { family: { code: "LONG_PRODUCTS", name: "x" }, group: { code: "CHANNEL", name: "x" }, form: { code: "UPN", name: "x" } } } as Partial<CatalogApiProduct>)];
  const tables = assembleSnapshotTables(odooSource(other), d1(emptyTables()), "2026-10-21T08:00:00.000Z");
  assert.equal(tables.product_seo_contents.length, 0);
  assert.equal(tables.catalog_products[0].is_public, 0, "a template not on the list stays not public");
  assert.deepEqual(validatePageAllowlist(tables), []);
  assert.equal(pageForTemplateSkus(["AA-CH-DOM-S40-L6", "AA-CH-UPN-S220"]), undefined, "a mixed template is never matched");
});

test("pages: a slug already used in a locale skips the whole entry (never a partial page) and the run warns", () => {
  const taken = { ...emptyTables(), product_seo_contents: [{ id: "x", entity_type: "product", entity_id: "cp-other", locale: "en", slug: "domestic-channel", h1: "x", intro: null, body_json: null, seo_title: null, seo_description: null, faq_json: null, index_status: "draft", content_quality_status: "incomplete", published_at: null, updated_at: "2026-10-01T00:00:00.000Z" }] } as SnapshotV1["tables"];
  const tables = assembleSnapshotTables(odooSource(DOMESTIC), d1(taken), "2026-10-21T08:00:00.000Z");
  assert.equal(tables.product_seo_contents.length, 1);
  assert.equal(tables.catalog_products.find((p) => p.template_xid === "CTMPL-000913")?.is_public, 0);
  assert.match(validatePageAllowlist(tables)[0], /CTMPL-000913 \(domestic-channel\).*not public/);
});

test("pages: the D1 mirror inserts the seeded rows once; after that DB_PUBLIC owns them (an editor's unpublish is kept)", () => {
  const db = new DatabaseSync(":memory:");
  const dir = path.join(repo, "migrations_public");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const odoo = odooSource(DOMESTIC);
  const first = assembleSnapshotTables(odoo, d1(emptyTables()), odoo.fetched_at);
  assert.deepEqual(validateSource(odoo, first).errors, []);
  for (const s of mirrorStatements(first)) db.exec(s);
  const rows = () => db.prepare("SELECT locale, h1, published_at FROM product_seo_contents ORDER BY locale").all() as { locale: string; h1: string; published_at: string | null }[];
  assert.deepEqual(rows().map((r) => r.h1), ["مجرى محلي", "Domestic channel", "ناودانی داخلی"]);

  db.exec("UPDATE product_seo_contents SET published_at = NULL, h1 = 'edited' WHERE locale = 'en'"); // the editorial CLI
  const fromD1 = { ...emptyTables(), catalog_products: db.prepare("SELECT * FROM catalog_products").all(), product_variants: db.prepare("SELECT * FROM product_variants").all(), product_seo_contents: db.prepare("SELECT * FROM product_seo_contents").all() } as unknown as SnapshotV1["tables"];
  const second = assembleSnapshotTables(odoo, d1(fromD1), odoo.fetched_at);
  for (const s of mirrorStatements(second)) db.exec(s);
  assert.deepEqual({ ...rows().find((r) => r.locale === "en") }, { locale: "en", h1: "edited", published_at: null }, "the list never re-seeds an existing template");
  assert.match(validatePageAllowlist(second).join("\n"), /no published page in en/);
});

test("pages: factual text — h1 = SEO title, meta ≤ 160, en without Persian or price words, ar without Persian-only letters", () => {
  assert.deepEqual(PAGES_ON_FIRST_PUBLISH.map((p) => p.key), ["domestic-channel", "seamless-pipe-mill-wall", "galvanized-steel-coil-thin-gauge"]);
  for (const page of PAGES_ON_FIRST_PUBLISH) {
    assert.equal(page.decision, W913);
    assert.ok(!EN_FORBIDDEN.test(page.pages.en.h1 + page.pages.en.intro), `${page.key} en`);
    assert.ok(!PERSIAN_SPECIFIC.test(page.pages.ar.h1 + page.pages.ar.intro), `${page.key} ar`);
    for (const l of LOCALES) assert.ok(!/(stock|supplier|factory|کارخانه آزمایشی|موجودی|تأمین‌کننده)/i.test(page.pages[l].intro), `${page.key} ${l}: no stock/supplier claim`);
  }
  // The mill-wall pipe and the thin coil never claim an ASME schedule or a grade standard.
  const mill = PAGES_ON_FIRST_PUBLISH[1].pages;
  assert.ok(!/SCH\s?\d/i.test(mill.en.intro + mill.fa.intro + mill.ar.intro));
});

// --- the domestic channel is never UPN ------------------------------------------------------------------------

test("domestic channel: its page says it is not UPN, and no label (H1, slug, SEO title) names it UPN", () => {
  const page = PAGES_ON_FIRST_PUBLISH.find((p) => p.key === "domestic-channel")!;
  assert.ok(!/UPN/i.test(page.slug));
  for (const l of LOCALES) assert.ok(!/UPN/i.test(page.pages[l].h1), l);
  assert.match(page.pages.fa.intro, /ناودانی UPN نیست/);
  assert.match(page.pages.en.intro, /it is not a UPN channel/);
  assert.match(page.pages.ar.intro, /وليس مجرى UPN/);
  assert.match(page.pages.en.intro, /no standard drawing or standard weight/);
});

test("domestic channel: no drawing, no calculator, no nominal weight even if a row carries one", () => {
  assert.equal(SECTION_SHAPES.DOMESTIC_CHANNEL, undefined);
  assert.equal(planSectionDrawing({ formCode: "DOMESTIC_CHANNEL", commercialSize: "100 (6 m)", dimensions: { height_mm: 100, width_mm: 50, web_thickness_mm: 6, flange_thickness_mm: 8.5, root_radius_mm: 8.5, toe_radius_mm: 4.5, flange_slope_pct: 8 }, standard: null }), null);
  assert.equal(FORM_SHAPES.DOMESTIC_CHANNEL, undefined);
  assert.equal(publicNominalWeight({ sku: "AA-CH-DOM-S100-L6", formCode: "DOMESTIC_CHANNEL" }, { kg_m: 10.6 }), null);
  assert.equal(publicNominalWeight({ sku: "AA-CH-DOM-S100-L6", formCode: null }, { kg_m: 10.6 }), null, "by SKU family too");
  assert.deepEqual(publicNominalWeight({ sku: "AA-CH-UPN-S100", formCode: "UPN" }, { kg_m: 10.6 }), { kg_m: 10.6 }, "UPN keeps its weight");
  const v = { xid: "CVAR-913001", sku: "AA-CH-DOM-S100-L6", commercialSize: "100 (6 m)", sectionSize: null, dimensions: { height_mm: 100, length_mm: 6000 }, nominalWeight: null, group: { code: "CHANNEL", name: null }, form: { code: "DOMESTIC_CHANNEL", name: null } } as unknown as ProductVariant;
  assert.equal(resolveVariantBasis(FORM_SHAPES.DOMESTIC_CHANNEL ?? null, v), null);
  assert.deepEqual(buildCalculatorProducts([{ templateXid: "CTMPL-000913", label: "Domestic channel", variants: [v] }]), []);
});

test("domestic channel: spec-sheet PDF row has its own name and size, no UPN label, no weight column, the note", async () => {
  const category: DownloadCategory = {
    code: "CHANNEL",
    segment: "channel",
    name: "Channel",
    nameFa: "ناودانی",
    templates: [{ slug: "domestic-channel", name: "Domestic channel", updatedAt: "2026-10-21T08:00:00.000Z", variants: [{ sku: "AA-CH-DOM-S100-L6", xid: "CVAR-913001", size: "100 (6 m)", formCode: "DOMESTIC_CHANNEL", dimensions: { height_mm: 100, length_mm: 6000 }, nominalWeight: null, standard: null, grade: null }] }],
  };
  const text = (await renderSpecSheet(category, "en", new Date("2026-10-21T08:00:00Z"))).texts.join(" ");
  assert.ok(text.includes("Domestic channel") && text.includes("100 (6 m)"));
  assert.ok(!text.includes("Nominal weight (kg/m)"), "no weight column");
  assert.ok(text.includes(DOMESTIC_CHANNEL_NOTE.en));
  assert.ok(!text.replace(DOMESTIC_CHANNEL_NOTE.en, "").includes("UPN"), "UPN only inside the owner's comparison note");
});

test("domestic channel: lands in the CHANNEL category (the RFQ selector, /prices, the category page) under its own product name", () => {
  const categories = [{ code: "CHANNEL", name: "Channel", sequence: 40, groupCodes: ["CHANNEL"], formCodes: [], templateCount: 3, variantCount: 32 }];
  assert.equal(findCategoryForVariant(categories, "CHANNEL", "DOMESTIC_CHANNEL")?.code, "CHANNEL");
  const { items, unresolvedGroupCodes } = attachRfqPublicCategories(
    [{ variantXid: "CVAR-913001", templateXid: "CTMPL-000913", sku: "AA-CH-DOM-S100-L6", variantSpecLabel: "100 (6 m)", productLabel: "Domestic channel", templateSlug: "domestic-channel", categoryCode: "LONG_PRODUCTS", categoryLabel: null, groupCode: "CHANNEL" }],
    categories,
    "en",
    { "CVAR-913001": "DOMESTIC_CHANNEL" },
  );
  assert.deepEqual(unresolvedGroupCodes, []);
  assert.equal(items[0].publicCategoryCode, "CHANNEL");
  assert.ok(!/UPN/.test(`${items[0].productLabel} ${items[0].variantSpecLabel}`));
});

// --- notes ---------------------------------------------------------------------------------------------------

test("notes: the owner's text (en as decided 2026-10-21), en/ar page rules", () => {
  assert.equal(DOMESTIC_CHANNEL_NOTE.en, "Domestic channel, non-standard: an Iranian mill section, lighter than the European UPN. It has no standard drawing or standard weight; sold per kg by actual weight.");
  assert.equal(MILL_WALL_PIPE_NOTE.en, "Mill wall (non-ASME): sold in the Iranian market as 'Schedule 20', but it is not an ASME B36.10M schedule. The wall thickness is as the sellers state it.");
  assert.equal(PLATE_S355JR_SIZE_NOTE.en, "Also 2000×12000 mm at 12, 25 and 40 mm (EN 10029).");
  for (const note of [DOMESTIC_CHANNEL_NOTE, MILL_WALL_PIPE_NOTE, THIN_GALVANIZED_COIL_NOTE, REBAR_D36_D40_NOTE, PLATE_S235JR_SIZE_NOTE, PLATE_S355JR_SIZE_NOTE]) {
    assert.ok(!EN_FORBIDDEN.test(note.en), note.en);
    assert.ok(!PERSIAN_SPECIFIC.test(note.ar), note.ar);
  }
});

test("notes: only on a table they are true of; plate notes per grade; the category intro gets the three required ones", () => {
  const notes = (skus: string[], scope?: "required" | "all") => variantPageNotes(skus.map((sku) => ({ sku })), "en", scope);
  assert.deepEqual(notes(["AA-CH-UPN-S100", "AA-CH-UPE-S100"]), [], "a UPN/UPE page has no domestic note");
  assert.deepEqual(variantPageNotes([{ sku: "AA-CH-DOM-S40-L6", formCode: "DOMESTIC_CHANNEL" }], "fa"), [DOMESTIC_CHANNEL_NOTE.fa]);
  assert.deepEqual(notes(["AA-PP-SMLS-MW-S21P3X2P5-L6"]), [MILL_WALL_PIPE_NOTE.en]);
  assert.deepEqual(notes(["AA-PP-SMLS-A106B-S21P3X3P73-L6"]), [], "the ASME pipe has no mill-wall note");
  assert.deepEqual(notes(["AA-CL-GI-S0P3X1000"]), [THIN_GALVANIZED_COIL_NOTE.en]);
  assert.deepEqual(variantPageNotes([{ sku: "AA-CL-GI-DX51D-S0P5X1000", standard: "EN 10346" }], "en"), [], "the DX51D+Z coil has no thin-coil note");
  assert.deepEqual(notes(["AA-RB-AJ400-D32-L12"]), []);
  assert.deepEqual(notes(["AA-RB-AJ400-D32-L12", "AA-RB-AJ400-D40-L12"]), [REBAR_D36_D40_NOTE.en]);
  assert.deepEqual(notes(["AA-SH-HR-S235JR-S10X1500X6000"]), [], "before Odoo serves the new plate sizes: no note");
  assert.deepEqual(notes(["AA-SH-HR-S235JR-S8X1250X6000"]), [PLATE_S235JR_SIZE_NOTE.en]);
  assert.deepEqual(notes(["AA-SH-HR-S355JR-S25X2000X12000"]), [PLATE_S355JR_SIZE_NOTE.en], "S355JR: only its own 2000×12000 sizes");
  assert.deepEqual(notes(["AA-CH-DOM-S40-L6", "AA-RB-AJ400-D40-L12"], "required"), [DOMESTIC_CHANNEL_NOTE.en], "category intro: required notes only");
  assert.ok(isDomesticChannel({ formCode: "DOMESTIC_CHANNEL" }) && isMillWallPipe({ sku: "AA-PP-SMLS-MW-S48P3X2P8-L6" }) && isThinGalvanizedCoil({ standard: "EN10143" }));
});

test("mill-wall pipe: no ASME schedule label — not in the calculator (ASME basis), drawing without a standard line", () => {
  const v = { xid: "CVAR-913201", sku: "AA-PP-SMLS-MW-S21P3X2P5-L6", commercialSize: "21.3×2.5 mill wall", sectionSize: null, dimensions: { outside_diameter_mm: 21.3, wall_thickness_mm: 2.5, length_mm: 6000 }, nominalWeight: { kg_m: 1.159, per_branch: 6.954 }, group: { code: "SEAMLESS_PIPE", name: null }, form: { code: "SEAMLESS_PIPE_FORM", name: null } } as unknown as ProductVariant;
  assert.equal(resolveVariantBasis("pipe", v), null);
  const plan = planSectionDrawing({ formCode: "SEAMLESS_PIPE_FORM", commercialSize: v.commercialSize, dimensions: v.dimensions, standard: null, kgPerM: 1.159 });
  assert.equal(plan?.status, "drawn");
  const texts = plan?.status === "drawn" ? plan.drawing.layers.TEXT.flatMap((p) => (p.kind === "text" ? [p.text] : [])).join(" ") : "";
  assert.ok(!/SCH|ASME|Standard:/.test(texts), texts);
});

test("wiring: product table, spec-sheet PDF and category intro render variantPageNotes", () => {
  const read = (f: string) => fs.readFileSync(path.join(repo, f), "utf8");
  assert.match(read("components/products/variant-spec-table.tsx"), /variantPageNotes\(variants\.map\(\(v\) => \(\{ sku: v\.sku, formCode: v\.form\.code, standard: v\.standard\.code \?\? v\.standard\.name \}\)\), locale\)/);
  assert.match(read("lib/downloads/pdf/render.ts"), /const notes = variantPageNotes\(variants, locale\);/);
  assert.match(read("app/[locale]/products/category/[category]/page.tsx"), /variantPageNotes\([\s\S]*?"required"\)/);
  assert.match(read("lib/catalog/editorial-repository.ts"), /nominalWeight: publicNominalWeight\(/);
});
