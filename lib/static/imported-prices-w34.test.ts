import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePricing, type PricingSource } from "../content-pipeline/pricing.ts";
import { validatePricingHistory } from "../content-pipeline/pricing-history.ts";
import { PUBLISHED_IMPORTED_PRICES_BUILD_DDL, PUBLISHED_PRICES_BUILD_DDL, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { BUILD_ONLY_SNAPSHOT_TABLES, snapshotV1 } from "../contracts/snapshot-v1.ts";
import { canonicalTablesJson } from "./snapshot-io.ts";
import { priceGateInput, scanPrices } from "./price-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { buildPriceTableRows, filterOptions } from "../pricing/price-page.ts";
import { presentPriceCell, priceBlockDataFromRow, PRICE_ORIGIN_COPY, renderedAmount } from "../pricing/product-page-price.ts";
import { newestPublishedPriceAt } from "../../scripts/ops/health/checks.ts";

/**
 * W34 — the website side of Odoo W9.14 (owner 2026-10-21): domestic and imported prices are shown apart, never
 * compared or mixed, and the same code reads Odoo before and after W9.14. SYNTHETIC data only (no real price,
 * factory or market source).
 */

const REPO = path.resolve(import.meta.dirname, "../..");
type Fixture = { synthetic: boolean; fetched_at: string; response: { data: Array<Record<string, unknown>>; meta: Record<string, unknown> } };
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")) as Fixture;
const AFTER = read("fixtures/pricing/synthetic-pricing-current-imported.json");
const BEFORE = read("fixtures/pricing/synthetic-pricing-current-factories.json");
const CATALOG = [
  { canonical_id: "CVAR-000031", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D10-L12" },
  { canonical_id: "CVAR-000032", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D12-L12" },
  { canonical_id: "CVAR-000033", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D14-L12" },
  { canonical_id: "CVAR-000053", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S120-L12" },
  { canonical_id: "CVAR-000054", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S140-L12" },
  { canonical_id: "CVAR-000237", canonical_template_id: "CTMPL-000016", sku: "AA-PP-SMLS-A106B-S114P3X6P02-L6" },
  { canonical_id: "CVAR-000238", canonical_template_id: "CTMPL-000016", sku: "AA-PP-SMLS-A106B-S141P3X6P553-L6" },
];
const ok = (b: unknown): PricingSource => ({ status: "ok", http_status: 200, etag: '"x"', body: b });
const run = (b: unknown, previous: number | null = 4, previousImported: number | null = null) => validatePricing(ok(b), CATALOG, AFTER.fetched_at, previous, previousImported);
type Row = Record<string, unknown> & { factory_prices?: Array<Record<string, unknown>>; imported_lowest?: Record<string, unknown> | null };
const after = () => structuredClone(AFTER.response) as { data: Row[]; meta: Record<string, unknown> };
const rowOf = (b: { data: Row[] }, id: string) => b.data.find((r) => r.canonical_id === id)!;

// --- ingest: before and after Odoo W9.14 -----------------------------------------------------------------------

test("fixture is synthetic, names no market website, and is the W9.14 shape", () => {
  assert.equal(AFTER.synthetic, true);
  assert.ok(!/https?:|www\.|\.com|\.ir\b|source/i.test(JSON.stringify(AFTER.response)));
  assert.ok(AFTER.response.data.every((r) => Object.hasOwn(r, "imported_lowest")));
});

test("before W9.14 (no is_imported, no imported_lowest): nothing imported, every other result unchanged", () => {
  const r = run(BEFORE.response);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, [], "no unknown-field warning, nothing dropped");
  assert.deepEqual(r.importedRows, []);
  assert.equal(r.counts.prices_imported, 0);
  assert.equal(r.factoryRows.length, 9);
  assert.equal(r.summary, "4 price(s) published, 1 on request; 9 factory price(s)", "the run summary reads exactly as before W34");
});

test("after W9.14: the v1 rows and factory rows are domestic only; the imported lowest is its own row", () => {
  const r = run(AFTER.response);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  const before = run(BEFORE.response);
  // The five old rows are untouched by the new keys; the pipe adds one domestic lowest.
  assert.deepEqual(r.rows.filter((x) => x.canonical_variant_id !== "CVAR-000237"), before.rows);
  assert.deepEqual(r.rows.find((x) => x.canonical_variant_id === "CVAR-000237")?.factory_name_fa, "کارخانه آزمایشی لوله");
  assert.ok(!r.rows.some((x) => x.canonical_variant_id === "CVAR-000238"), "an imported-only variant has no domestic row");
  assert.ok(!r.factoryRows.some((x) => x.factory_name_fa.startsWith("وارداتی")), "imported factory rows are never stored as domestic factory rows");
  assert.equal(r.factoryRows.length, 10);
  assert.deepEqual(
    r.importedRows.map((x) => [x.canonical_variant_id, x.factory_name_fa, x.price_irr_per_kg, x.previous_price_irr_per_kg]),
    [
      ["CVAR-000237", "وارداتی (چین)", 1187000, 1199000],
      ["CVAR-000238", "وارداتی (چین)", 1176000, null],
    ],
  );
  assert.deepEqual(r.counts, { prices_published: 5, prices_on_request: 2, prices_imported: 2 });
  assert.match(r.summary, /5 price\(s\) published, 2 on request; 2 imported price\(s\); 10 factory price\(s\)/);
  // The imported price is lower here on purpose: nothing takes the lower of the two.
  assert.equal(r.rows.find((x) => x.canonical_variant_id === "CVAR-000237")!.price_irr_per_kg, 1318000);
});

test("an imported-only variant keeps every other variant's factory rows (no false 'price_on_request has factory_prices')", () => {
  const b = after();
  rowOf(b, "CVAR-000237").imported_lowest = null;
  rowOf(b, "CVAR-000237").factory_prices = rowOf(b, "CVAR-000237").factory_prices!.filter((f) => !(f.factory as { is_imported: boolean }).is_imported);
  const r = run(b);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.factoryRows.length, 10);
  assert.deepEqual(r.importedRows.map((x) => x.canonical_variant_id), ["CVAR-000238"]);
});

test("the v1 price must be domestic: an imported factory there makes the set invalid", () => {
  const b = after();
  (rowOf(b, "CVAR-000031").factory as Record<string, unknown>).is_imported = true;
  const r = run(b);
  assert.equal(r.outcome, "blocked");
  assert.ok(r.errors.some((e) => /the v1 price's factory is imported/.test(e)));
  (rowOf(b, "CVAR-000031").factory as Record<string, unknown>).is_imported = "no";
  assert.ok(run(b).errors.some((e) => /is_imported: not true or false/.test(e)));
});

test("bad imported data drops every imported row (never half a set) and keeps the domestic prices", () => {
  for (const mutate of [
    (b: { data: Row[] }) => ((rowOf(b, "CVAR-000237").imported_lowest!.factory as Record<string, unknown>).is_imported = false),
    (b: { data: Row[] }) => (rowOf(b, "CVAR-000237").imported_lowest!.price_irr_per_kg = 0),
    (b: { data: Row[] }) => (rowOf(b, "CVAR-000238").imported_lowest!.location = null),
    (b: { data: Row[] }) => (rowOf(b, "CVAR-000238").imported_lowest = null), // imported factory rows without an imported lowest
    (b: { data: Row[] }) => (rowOf(b, "CVAR-000237").factory_prices![2].price_irr_per_kg = 1100000), // an imported factory below its lowest
    (b: { data: Row[] }) => (rowOf(b, "CVAR-000237").factory_prices![2].is_lowest = true), // two imported lowest
  ]) {
    const b = after();
    mutate(b);
    const r = run(b);
    assert.deepEqual(r.errors, []);
    assert.equal(r.outcome, "published");
    assert.deepEqual(r.importedRows, []);
    assert.equal(r.rows.length, 5, "the domestic prices publish as before");
    assert.ok(r.warnings.some((w) => /imported prices dropped/.test(w)), r.warnings.join("\n"));
  }
});

test("a domestic and an imported factory list are each checked against their own lowest", () => {
  const b = after();
  // A domestic factory below the imported lowest is fine (never compared across origins) …
  const r = run(b);
  assert.deepEqual(r.warnings, []);
  // … but two domestic lowest rows still drop the domestic factory rows (W20.7, unchanged).
  rowOf(b, "CVAR-000237").factory_prices!.push({ ...rowOf(b, "CVAR-000237").factory_prices![0], factory: { code: "FAC-9102", name: { fa: "کارخانه آزمایشی لوله ۲", en: null, ar: null }, is_imported: false } });
  const dropped = run(b);
  assert.deepEqual(dropped.factoryRows, []);
  assert.equal(dropped.importedRows.length, 2, "the imported rows do not depend on the domestic factory list");
});

test("a live site with imported prices blocks a run that would wipe them; an unusable set counts them too", () => {
  const b = after();
  (rowOf(b, "CVAR-000237").imported_lowest!.factory as Record<string, unknown>).is_imported = false;
  const blocked = run(b, 4, 2);
  assert.equal(blocked.outcome, "blocked");
  assert.match(blocked.summary, /live site shows 2 imported price\(s\)/);
  // Only imported prices live (no domestic one): a failed fetch is refused, never an empty price set.
  const failed = validatePricing({ status: "failed", http_status: 500, etag: null, body: null }, CATALOG, AFTER.fetched_at, 0, 3);
  assert.equal(failed.outcome, "blocked");
  assert.match(failed.summary, /live site shows 3 price\(s\)/);
  assert.equal(validatePricing({ status: "failed", http_status: 500, etag: null, body: null }, CATALOG, AFTER.fetched_at, 0, 0).outcome, "empty_fetch_failed");
});

test("history: imported_prices / imported_price_at_window_start are known and dropped (no warning, the domestic series only)", () => {
  const r = run(AFTER.response);
  const history = {
    data: r.rows.map((row) => ({ id: null, canonical_id: row.canonical_variant_id, canonical_template_id: CATALOG.find((c) => c.canonical_id === row.canonical_variant_id)!.canonical_template_id, sku: CATALOG.find((c) => c.canonical_id === row.canonical_variant_id)!.sku, unit: "kg", currency: "IRR", vat_included: true, price_at_window_start: null, prices: [{ price_irr_per_kg: row.price_irr_per_kg, price_on_request: false, published_at_utc: row.published_at, factory: { code: "X", name: { fa: row.factory_name_fa, en: null, ar: null }, is_imported: false }, location: { fa: row.location_fa, en: null, ar: null } }], imported_price_at_window_start: null, imported_prices: [] })),
    meta: { days: 90, total_prices: r.rows.length, updated_at_utc: AFTER.response.meta.updated_at_utc, unit: "kg", currency: "IRR", vat_included: true },
  };
  const h = validatePricingHistory(ok(history), r.rows, AFTER.fetched_at);
  assert.deepEqual(h.ignored, []);
  assert.ok(!h.warnings.some((w) => /ignored/.test(w)), h.warnings.join("\n"));
});

// --- snapshot -----------------------------------------------------------------------------------------------

const SNAPSHOT_BASE = JSON.parse(fs.readFileSync(path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json"), "utf8"));
const IMPORTED_ROW: PublishedPriceRow = run(AFTER.response).importedRows[1];

test("snapshot: published_imported_prices is build-only, same columns as published_prices, one row per known variant", () => {
  assert.ok(BUILD_ONLY_SNAPSHOT_TABLES.has("published_imported_prices"));
  assert.equal(PUBLISHED_IMPORTED_PRICES_BUILD_DDL, PUBLISHED_PRICES_BUILD_DDL.replace("published_prices", "published_imported_prices"));
  const withRow = { ...SNAPSHOT_BASE, tables: { ...SNAPSHOT_BASE.tables, published_imported_prices: [IMPORTED_ROW] } };
  assert.ok(snapshotV1.safeParse(withRow).success, "an imported-only variant needs no domestic price");
  const dup = { ...SNAPSHOT_BASE, tables: { ...SNAPSHOT_BASE.tables, published_imported_prices: [IMPORTED_ROW, IMPORTED_ROW] } };
  assert.ok(!snapshotV1.safeParse(dup).success);
  const unknown = { ...SNAPSHOT_BASE, tables: { ...SNAPSHOT_BASE.tables, published_imported_prices: [{ ...IMPORTED_ROW, canonical_variant_id: "CVAR-999999" }] } };
  assert.ok(!snapshotV1.safeParse(unknown).success);
  const extra = { ...SNAPSHOT_BASE, tables: { ...SNAPSHOT_BASE.tables, published_imported_prices: [{ ...IMPORTED_ROW, country: "x" }] } };
  assert.ok(!snapshotV1.safeParse(extra).success, "exactly the published_prices columns");
});

test("snapshot: without imported prices the canonical tables JSON (the content hash) is unchanged", () => {
  const parsed = snapshotV1.parse(SNAPSHOT_BASE);
  assert.deepEqual(parsed.tables.published_imported_prices, [], "an older snapshot defaults to none");
  assert.ok(!canonicalTablesJson(parsed.tables).includes("published_imported_prices"));
});

// --- price tables: two rows, never compared --------------------------------------------------------------------

const TEMPLATES = [{ slug: "seamless-pipe", productName: "لوله مانیسمان", variants: [{ xid: "CVAR-000237", size: "114.3×6.02", groupCode: "SEAMLESS_PIPE", familyName: null }, { xid: "CVAR-000238", size: "141.3×6.553", groupCode: "SEAMLESS_PIPE", familyName: null }] }];
const FAMILY = () => ({ code: "PIPES", label: "لوله", position: 1 });
const domestic = new Map(run(AFTER.response).rows.filter((r) => r.canonical_variant_id === "CVAR-000237").map((r) => [r.canonical_variant_id, priceBlockDataFromRow(r)]));
const imported = new Map(run(AFTER.response).importedRows.map((r) => [r.canonical_variant_id, priceBlockDataFromRow(r)]));

test("price table rows: the domestic row, then the imported row apart; an imported-only size has one imported row", () => {
  const rows = buildPriceTableRows("fa", TEMPLATES, domestic, FAMILY, new Map(), imported);
  assert.deepEqual(rows.map((r) => [r.xid, r.origin, r.factory]), [
    ["CVAR-000237", "domestic", "کارخانه آزمایشی لوله"],
    ["CVAR-000237", "imported", "وارداتی (چین)"],
    ["CVAR-000238", "imported", "وارداتی (چین)"],
  ]);
  assert.ok(rows.filter((r) => r.origin === "imported").every((r) => r.factoryPrices.length === 0), "an imported row never carries factory rows (no 'lowest' mark)");
  assert.deepEqual(filterOptions(rows).factories, ["کارخانه آزمایشی لوله", "وارداتی (چین)"]);
  const ar = buildPriceTableRows("ar", TEMPLATES, domestic, FAMILY, null, imported);
  assert.ok(ar.every((r) => r.factory === null), "ar never carries a factory, imported or not");
  assert.deepEqual(buildPriceTableRows("fa", TEMPLATES, domestic, FAMILY), buildPriceTableRows("fa", TEMPLATES, domestic, FAMILY, null, null), "without imported prices: as before");
});

test("labels: fa/ar origin copy; ar in Arabic letters only", () => {
  assert.deepEqual(PRICE_ORIGIN_COPY.fa, { domestic: "کمترین قیمت داخلی", imported: "کمترین قیمت وارداتی" });
  for (const label of Object.values(PRICE_ORIGIN_COPY.ar)) assert.ok(!/[یکگچپژ]/.test(label), `${label}: Persian-only letters on ar`);
});

// --- publication gate -------------------------------------------------------------------------------------------

const VARIANTS = [{ xid: "CVAR-000237", commercial_size: "114.3×6.02" }, { xid: "CVAR-000238", commercial_size: "141.3×6.553" }];
const GATE_SNAPSHOT = { tables: { published_prices: run(AFTER.response).rows.filter((r) => r.canonical_variant_id === "CVAR-000237"), published_imported_prices: run(AFTER.response).importedRows, product_variants: VARIANTS } };
const DOMESTIC_ROW = GATE_SNAPSHOT.tables.published_prices[0];
const cellHtml = (attrs: string, row: PublishedPriceRow | null, locale: "fa" | "ar" = "fa") => {
  const view = presentPriceCell(locale, row ? priceBlockDataFromRow(row) : null, row?.canonical_variant_id);
  const text = view?.kind === "price" ? `<span>${view.amount}</span>${view.change ? `<span>${view.change.glyph ?? ""}${view.change.label}</span>` : ""}${view.place ? `<span>${view.place}</span>` : ""}<span>${view.dateLabel}</span><a href="#">${view.rfq?.label ?? ""}</a>` : `<span>${view?.label}</span>`;
  return `<td ${attrs}>${text}</td>`;
};
const page = (cells: string, locale: "fa" | "ar" = "fa") => `<html><body><h1>لوله مانیسمان</h1><table><tr><th>${PRICE_ORIGIN_COPY[locale].imported}</th></tr><tr>${cells}</tr></table></body></html>`;
const scan = (p: string, html: string) => scanPrices([{ path: p, content: html }], priceGateInput(GATE_SNAPSHOT)).map((f) => `${f.kind}:${f.match}`);

test("gate: an imported cell is checked against the imported row; a domestic cell against the domestic one", () => {
  const imp = GATE_SNAPSHOT.tables.published_imported_prices[0];
  const html = page(cellHtml('data-aa-price-cell="CVAR-000237"', DOMESTIC_ROW) + cellHtml('data-aa-price-cell="CVAR-000237" data-aa-price-origin="imported"', imp) + cellHtml('data-aa-price-cell="CVAR-000238" data-aa-price-origin="imported"', GATE_SNAPSHOT.tables.published_imported_prices[1]));
  assert.deepEqual(scan("products/seamless-pipe.html", html), []);
  // The imported amount in a cell without the origin marker (i.e. presented as the domestic price) fails …
  assert.ok(scan("products/seamless-pipe.html", page(cellHtml('data-aa-price-cell="CVAR-000237"', imp))).some((f) => f.startsWith("price_text_not_allowed")));
  // … and so does the domestic amount presented as the imported one.
  assert.ok(scan("products/seamless-pipe.html", page(cellHtml('data-aa-price-cell="CVAR-000237" data-aa-price-origin="imported"', DOMESTIC_ROW))).some((f) => f.startsWith("price_text_not_allowed")));
  // An imported cell for a variant without an imported price may only say «استعلام قیمت».
  assert.deepEqual(scan("products/seamless-pipe.html", page(cellHtml('data-aa-price-cell="CVAR-000237" data-aa-price-origin="imported"', null))), []);
});

test("gate: an imported element never has a factory rank, a chart or an unknown origin", () => {
  const imp = GATE_SNAPSHOT.tables.published_imported_prices[0];
  assert.ok(scan("prices.html", page(cellHtml('data-aa-price-cell="CVAR-000237" data-aa-price-rank="0" data-aa-price-origin="imported"', imp))).some((f) => /a factory rank/.test(f)));
  assert.ok(scan("products/seamless-pipe.html", page(`<div data-aa-price-block="CVAR-000237" data-aa-price-origin="imported"><svg data-aa-price-sparkline="7"></svg></div>`)).some((f) => /a chart/.test(f)));
  assert.ok(scan("products/seamless-pipe.html", page(cellHtml('data-aa-price-cell="CVAR-000237" data-aa-price-origin="cheapest"', imp))).some((f) => /unknown origin/.test(f)));
});

test("gate: imported amounts and the origin factory count like the domestic ones (en nothing, ar no factory, no amount outside markup)", () => {
  const imp = GATE_SNAPSHOT.tables.published_imported_prices[0];
  const amountFa = renderedAmount(imp, "fa");
  assert.ok(scan("en/products/seamless-pipe.html", `<p>${PRICE_ORIGIN_COPY.ar.imported}</p>`).some((f) => f.startsWith("price_on_en_page")));
  assert.ok(scan("ar/products/seamless-pipe.html", page(`<td>${imp.factory_name_fa}</td>`, "ar")).some((f) => f.startsWith("price_fa_field_on_ar_page")));
  assert.ok(scan("ar/products/seamless-pipe.html", `<p>${PRICE_ORIGIN_COPY.fa.imported}</p>`).some((f) => f.startsWith("price_fa_field_on_ar_page")));
  assert.ok(scan("products/seamless-pipe.html", `<html><body><h1>x</h1><p>${amountFa}</p></body></html>`).some((f) => f.startsWith("price_outside_markup")));
  assert.deepEqual(scan("ar/products/seamless-pipe.html", page(cellHtml('data-aa-price-cell="CVAR-000238" data-aa-price-origin="imported"', GATE_SNAPSHOT.tables.published_imported_prices[1], "ar"), "ar")), []);
});

test("gate: the imported table's columns are checked in the private snapshot", () => {
  const input = priceGateInput({ tables: { published_imported_prices: [{ ...IMPORTED_ROW, import_country: "CN" }], product_variants: VARIANTS } });
  assert.deepEqual(input.findings.map((f) => f.match), ["published_imported_prices.import_country"]);
});

test("gate: JSON-LD offers stay domestic — an offer at the imported price fails", () => {
  const imp = GATE_SNAPSHOT.tables.published_imported_prices[0];
  const offer = { "@context": "https://schema.org", "@type": "Product", name: "x", offers: [{ "@id": "https://www.ahanassa.com/products/seamless-pipe#offer-CVAR-000237", "@type": "Offer", price: imp.price_irr_per_kg, priceCurrency: "IRR", priceSpecification: { "@type": "UnitPriceSpecification", price: imp.price_irr_per_kg, priceCurrency: "IRR", valueAddedTaxIncluded: true, referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" } } }] };
  const html = `<html><head><script type="application/ld+json">${JSON.stringify(offer)}</script></head><body><h1>x</h1></body></html>`;
  assert.ok(scan("products/seamless-pipe.html", html).some((f) => f.startsWith("price_jsonld_not_allowed")));
});

// --- leak scan, health ----------------------------------------------------------------------------------------

test("leak scan: the W9.14 API keys never reach a public file", () => {
  for (const key of ["is_imported", "imported_lowest", "imported_prices", "imported_price_at_window_start"]) {
    const found = scanPublicFile("data/x.json", JSON.stringify({ [key]: 1 }));
    assert.ok(found.some((f) => f.kind === "pricing_field"), key);
  }
});

test("health: an imported-only price set is not 'no published price'; before W9.14 the result is unchanged", () => {
  assert.equal(newestPublishedPriceAt(BEFORE.response), "2026-10-08T07:20:00Z");
  assert.equal(newestPublishedPriceAt(AFTER.response), "2026-10-08T07:25:00Z");
  const onlyImported = { data: [{ price_on_request: true, published_at_utc: null, imported_lowest: { published_at_utc: "2026-10-09T08:00:00Z" } }] };
  assert.equal(newestPublishedPriceAt(onlyImported), "2026-10-09T08:00:00Z");
  assert.equal(newestPublishedPriceAt({ data: [{ price_on_request: true, imported_lowest: null }] }), null);
});
