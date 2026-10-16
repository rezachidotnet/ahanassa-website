import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePricing, type PricingSource } from "../content-pipeline/pricing.ts";
import { factoryRowAsPriceRow, orderFactoryRows, type PublishedFactoryPriceRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { snapshotV1 } from "../contracts/snapshot-v1.ts";
import { canonicalTablesJson } from "./snapshot-io.ts";
import { priceGateInput, scanOfferJsonLd, scanPrices } from "./price-gate.ts";
import { scanPublication } from "./publication-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { buildPriceTableRows, filterOptions, PRICE_PAGE_COPY } from "../pricing/price-page.ts";
import { presentPriceCell, priceBlockDataFromRow, PRICE_DISCLAIMER, PRICE_RANK_ATTRIBUTE } from "../pricing/product-page-price.ts";
import { jsonLdGraph, productOffersSchema } from "../seo/schema.ts";

/**
 * W20.7 — every factory's price on the fa price page (Odoo W20.6 `factory_prices`), the lowest only on ar, nothing on
 * en, the lowest as the product page's JSON-LD offer. SYNTHETIC data only (no real price, factory or market source).
 */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")) as { synthetic: boolean; fetched_at: string; response: { data: Record<string, unknown>[]; meta: Record<string, unknown> } };
const WITH = read("fixtures/pricing/synthetic-pricing-current-factories.json");
const WITHOUT = read("fixtures/pricing/synthetic-pricing-current.json");
const CATALOG = [
  { canonical_id: "CVAR-000031", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D10-L12" },
  { canonical_id: "CVAR-000032", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D12-L12" },
  { canonical_id: "CVAR-000033", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D14-L12" },
  { canonical_id: "CVAR-000053", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S120-L12" },
  { canonical_id: "CVAR-000054", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S140-L12" },
];
const ok = (b: unknown): PricingSource => ({ status: "ok", http_status: 200, etag: '"x"', body: b });
/** The live site already shows prices: an invalid v1 set would block the run (the strict path). */
const run = (b: unknown) => validatePricing(ok(b), CATALOG, WITH.fetched_at, 4);
type Body = { data: Array<Record<string, unknown> & { factory_prices?: Record<string, unknown>[] }>; meta: Record<string, unknown> };
const body = () => structuredClone(WITH.response) as Body;

// --- pipeline ---------------------------------------------------------------------------------------------

test("fixture is synthetic, names no market website and carries factory_prices on every row", () => {
  assert.equal(WITH.synthetic, true);
  assert.ok(!/https?:|www\.|\.com|\.ir\b|source/i.test(JSON.stringify(WITH.response)));
  assert.ok(WITH.response.data.every((r) => Array.isArray(r.factory_prices)));
});

test("with factory_prices: the lowest rows are exactly those of the same response without it, plus every factory's row", () => {
  const withRun = run(WITH.response);
  const withoutRun = run(WITHOUT.response);
  assert.deepEqual(withRun.errors, []);
  assert.deepEqual(withRun.warnings, []);
  assert.deepEqual(withRun.rows, withoutRun.rows, "additive: the v1 lowest rows do not change");
  assert.deepEqual(withoutRun.factoryRows, [], "without factory_prices: no factory rows (the page shows the lowest, as before)");
  assert.equal(withRun.factoryRows.length, 9);
  assert.match(withRun.summary, /4 price\(s\) published, 1 on request; 9 factory price\(s\)/);
  for (const r of withRun.factoryRows) assert.deepEqual(Object.keys(r).sort(), ["canonical_variant_id", "factory_name_fa", "is_lowest", "location_fa", "previous_price_irr_per_kg", "previous_published_at", "price_irr_per_kg", "published_at"]);
  const lowest = withRun.factoryRows.filter((r) => r.is_lowest === 1);
  assert.equal(lowest.length, 4, "one lowest per priced variant");
  for (const l of lowest) {
    const v1 = withRun.rows.find((r) => r.canonical_variant_id === l.canonical_variant_id)!;
    assert.deepEqual([l.price_irr_per_kg, l.factory_name_fa, l.location_fa], [v1.price_irr_per_kg, v1.factory_name_fa, v1.location_fa]);
  }
  // The factory code, the en/ar names and change_pct are read, never stored.
  assert.ok(!/FAC-|Test Mill|change_pct/.test(JSON.stringify(withRun.factoryRows)));
});

test("a bad factory_prices never fails the run: ALL factory rows are dropped with a warning, the lowest prices publish as before", () => {
  const baseline = run(WITHOUT.response).rows;
  const breakers: Array<[string, (b: Body) => void]> = [
    ["two lowest rows", (b) => (b.data[0].factory_prices![1].is_lowest = true)],
    ["no lowest row", (b) => (b.data[0].factory_prices![0].is_lowest = false)],
    ["the lowest is another price", (b) => (b.data[0].factory_prices![0].price_irr_per_kg = 489480)],
    ["the lowest is another factory", (b) => ((b.data[0].factory_prices![0].factory as { name: { fa: string } }).name.fa = "کارخانه دیگر")],
    ["a factory below the lowest", (b) => (b.data[0].factory_prices![1].price_irr_per_kg = 400000)],
    ["the same factory twice", (b) => (b.data[0].factory_prices![2].factory = b.data[0].factory_prices![1].factory)],
    ["no Persian factory name", (b) => ((b.data[1].factory_prices![1].factory as { name: { fa: string | null } }).name.fa = null)],
    ["a price out of bounds", (b) => (b.data[1].factory_prices![1].price_irr_per_kg = 4)],
    ["a time in the future", (b) => (b.data[1].factory_prices![1].published_at_utc = "2030-01-01T00:00:00Z")],
    ["previous after the price", (b) => (b.data[1].factory_prices![1].previous = { price_irr_per_kg: 500000, published_at_utc: "2026-10-08T07:30:00Z" })],
    ["is_lowest not a boolean", (b) => (b.data[1].factory_prices![1].is_lowest = 1)],
    ["an empty list on a priced row", (b) => (b.data[1].factory_prices = [])],
    ["a list on a price-on-request row", (b) => (b.data[2].factory_prices = b.data[1].factory_prices)],
    ["missing on one row only", (b) => delete b.data[3].factory_prices],
  ];
  for (const [why, breakIt] of breakers) {
    const b = body();
    breakIt(b);
    const r = run(b);
    assert.deepEqual(r.errors, [], `${why}: never an error`);
    assert.equal(r.outcome, "published", why);
    assert.deepEqual(r.rows, baseline, `${why}: the lowest prices are unchanged`);
    assert.deepEqual(r.factoryRows, [], `${why}: no half set`);
    assert.ok(r.warnings.some((w) => w.startsWith("pricing: factory_prices dropped")), why);
    assert.match(r.summary, /factory_prices DROPPED/, why);
  }
});

test("unknown keys inside factory_prices are ignored like any other (never stored, never an error)", () => {
  const b = body();
  b.data[0].factory_prices![0].source = "x";
  (b.data[0].factory_prices![1].previous as Record<string, unknown>).factory = null;
  const r = run(b);
  assert.deepEqual(r.errors, []);
  assert.equal(r.factoryRows.length, 9);
  assert.deepEqual(r.ignored, ["row.factory_prices.previous.factory", "row.factory_prices.source"]);
});

// --- snapshot ---------------------------------------------------------------------------------------------

const base = JSON.parse(fs.readFileSync(path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json"), "utf8"));
const withTables = (t: Record<string, unknown>) => ({ ...base, tables: { ...base.tables, ...t } });
const pricing = run(WITH.response);

test("snapshot: the table is additive (an empty one keeps every older snapshot's hash) and checked against published_prices", () => {
  assert.equal(canonicalTablesJson(snapshotV1.parse(base).tables), canonicalTablesJson(snapshotV1.parse(withTables({ published_factory_prices: [] })).tables));
  const variants = new Set((base.tables.product_variants as { xid: string }[]).map((v) => v.xid));
  const rows = pricing.rows.filter((r) => variants.has(r.canonical_variant_id));
  const factory = pricing.factoryRows.filter((r) => variants.has(r.canonical_variant_id));
  assert.ok(rows.length > 0 && factory.length > rows.length, "the fixture prices variants of the base snapshot");
  const parse = (f: PublishedFactoryPriceRow[]) => snapshotV1.safeParse(withTables({ published_prices: rows, published_factory_prices: f }));
  assert.ok(parse(factory).success);
  const issues = (f: PublishedFactoryPriceRow[]) => (parse(f).error?.issues ?? []).map((i) => i.message).join(" | ");
  const lowest = factory.findIndex((r) => r.is_lowest === 1);
  const other = factory.findIndex((r) => r.is_lowest === 0);
  assert.match(issues(factory.map((r, i) => (i === other ? { ...r, is_lowest: 1 as const } : r))), /2 lowest rows/);
  assert.match(issues(factory.map((r, i) => (i === lowest ? { ...r, price_irr_per_kg: r.price_irr_per_kg + 10 } : r))), /lowest factory row differs/);
  assert.match(issues([...factory, { ...factory[other] }]), /duplicate factory/);
  assert.match(issues(factory.map((r, i) => (i === other ? { ...r, price_irr_per_kg: 10_001 } : r))), /below the variant's lowest/);
  assert.match(issues([{ ...factory[lowest], canonical_variant_id: "CVAR-000033" }]), /without a published price/);
  assert.ok(!snapshotV1.safeParse(withTables({ published_prices: rows, published_factory_prices: [{ ...factory[0], source_name: "x" }] })).success, "strict columns");
});

// --- the price page ---------------------------------------------------------------------------------------

const ROW: PublishedPriceRow = pricing.rows.find((r) => r.canonical_variant_id === "CVAR-000031")!;
const FACTORY: PublishedPriceRow[] = orderFactoryRows(pricing.factoryRows.filter((r) => r.canonical_variant_id === "CVAR-000031")).map(factoryRowAsPriceRow);
const SNAPSHOT = {
  tables: {
    published_prices: [ROW],
    published_factory_prices: pricing.factoryRows.filter((r) => r.canonical_variant_id === "CVAR-000031"),
    product_variants: [{ xid: "CVAR-000031", commercial_size: "10", sku: "AA-RB-AJ400-D10-L12", family_code: "LONG_PRODUCTS", group_code: "REBAR", form_code: "RIBBED_REBAR" }],
  },
};
const kinds = (files: { path: string; content: string }[], snapshot: unknown = SNAPSHOT) => scanPrices(files, priceGateInput(snapshot)).map((f) => `${f.kind}:${f.match}`);

test("display order: the lowest first, then by price — and it is the gate's rank order", () => {
  assert.equal(FACTORY.length, 3);
  assert.deepEqual(FACTORY[0], ROW.factory_name_fa === FACTORY[0].factory_name_fa ? { ...ROW, published_at: FACTORY[0].published_at, previous_price_irr_per_kg: FACTORY[0].previous_price_irr_per_kg, previous_published_at: FACTORY[0].previous_published_at } : null);
  assert.ok(FACTORY[1].price_irr_per_kg < FACTORY[2].price_irr_per_kg);
  assert.deepEqual(priceGateInput(SNAPSHOT).factoryRows.get("CVAR-000031"), FACTORY);
});

test("fa table rows carry every factory's price; ar none; filterOptions offers every factory", () => {
  const prices = new Map([["CVAR-000031", priceBlockDataFromRow(ROW)]]);
  const factoryPrices = new Map([["CVAR-000031", FACTORY.map((r, i) => ({ data: priceBlockDataFromRow(r), lowest: i === 0 }))]]);
  const templates = [{ slug: "rebar", productName: "میلگرد", variants: [{ xid: "CVAR-000031", size: "10", groupCode: "REBAR", familyName: null }] }];
  const family = () => ({ code: "REBAR", label: "میلگرد", position: 1 });
  const fa = buildPriceTableRows("fa", templates, prices, family, factoryPrices);
  assert.equal(fa[0].factoryPrices.length, 3);
  assert.equal(fa[0].price, prices.get("CVAR-000031"), "the row's own price stays the lowest (hubs, product pages)");
  assert.deepEqual(filterOptions(fa).factories, FACTORY.map((r) => r.factory_name_fa));
  assert.deepEqual(buildPriceTableRows("ar", templates, prices, family, factoryPrices)[0].factoryPrices, []);
  assert.deepEqual(buildPriceTableRows("fa", templates, prices, family)[0].factoryPrices, [], "without factory rows: the lowest only");
  assert.equal(PRICE_PAGE_COPY.fa.lowest, "کمترین قیمت");
});

/** A fa price cell as app/[locale]/prices/page.tsx renders it (rank = the factory row's position). */
function faCell(row: PublishedPriceRow, rank: number | null): string {
  const v = presentPriceCell("fa", priceBlockDataFromRow(row), row.canonical_variant_id);
  assert.ok(v?.kind === "price");
  const change = v.change ? `<span><span aria-hidden="true">${v.change.glyph}</span><span class="sr-only">${v.change.word} </span>${v.change.label}</span>` : "";
  const rankAttr = rank === null ? "" : ` ${PRICE_RANK_ATTRIBUTE}="${rank}"`;
  return `<td data-aa-price-cell="${row.canonical_variant_id}"${rankAttr} class="x"><span>${v.amount}</span>${change}<span>${v.place}</span><time dateTime="${v.datetime}">${v.dateLabel}</time><a href="${v.rfq!.href.replace(/&/g, "&amp;")}">${v.rfq!.label}</a></td>`;
}
const page = (body: string) => `<html><body><h1>قیمت روز</h1><table>${body}</table><p>${PRICE_DISCLAIMER.fa}</p></body></html>`;
const tr = (cell: string, lowest = false) => `<tr data-aa-family="REBAR"><th><a href="/products/rebar?variant=CVAR-000031">میلگرد</a>${lowest ? `<span>${PRICE_PAGE_COPY.fa.lowest}</span>` : ""}</th>${cell}<td>10</td></tr>`;

test("price gate: each fa factory cell must be exactly its rank's snapshot row", () => {
  assert.deepEqual(kinds([{ path: "prices.html", content: page(FACTORY.map((r, k) => tr(faCell(r, k), k === 0)).join("")) }]), []);
  assert.deepEqual(kinds([{ path: "prices.html", content: page(tr(faCell(ROW, null))) }]), [], "a cell without a rank is the lowest, as before");
  const swapped = kinds([{ path: "prices.html", content: page(tr(faCell(FACTORY[2], 1))) }]);
  assert.ok(swapped.some((k) => k.startsWith("price_text_not_allowed")), `another factory's price under rank 1: ${swapped}`);
  assert.ok(kinds([{ path: "prices.html", content: page(tr(faCell(FACTORY[1], null))) }]).some((k) => k.startsWith("price_text_not_allowed")), "a non-lowest price without its rank");
  assert.ok(kinds([{ path: "prices.html", content: page(tr(faCell(FACTORY[1], 3))) }]).some((k) => k.startsWith("price_unknown_variant")), "a rank the snapshot does not have");
  assert.ok(kinds([{ path: "prices.html", content: page(tr(faCell(FACTORY[1], 1))) }], { tables: { ...SNAPSHOT.tables, published_factory_prices: [] } }).some((k) => k.startsWith("price_unknown_variant")), "a rank without factory rows");
  assert.ok(kinds([{ path: "prices.html", content: page(tr(faCell(ROW, null)) + `<p>${presentPriceCell("fa", priceBlockDataFromRow(FACTORY[2]))!.kind === "price" ? (presentPriceCell("fa", priceBlockDataFromRow(FACTORY[2])) as { amount: string }).amount : ""}</p>`) }]).some((k) => k.startsWith("price_outside_markup")), "a factory amount outside a price cell");
});

test("price gate: ar never shows a factory row (rank, non-lowest amount, its factory or location); en nothing", () => {
  const ar = (body: string) => `<html><body><h1>حديد</h1>${body}<p>${PRICE_DISCLAIMER.ar}</p></body></html>`;
  const arAmount = (r: PublishedPriceRow) => (presentPriceCell("ar", priceBlockDataFromRow(r)) as { amount: string }).amount;
  assert.deepEqual(kinds([{ path: "ar/prices.html", content: ar("<p>حديد</p>") }]), []);
  for (const leak of [`<td ${PRICE_RANK_ATTRIBUTE}="1">x</td>`, FACTORY[1].factory_name_fa, FACTORY[2].location_fa]) assert.ok(kinds([{ path: "ar/prices.html", content: ar(leak) }]).some((k) => k.startsWith("price_fa_field_on_ar_page")), leak);
  assert.ok(kinds([{ path: "ar/prices.html", content: ar(`<p>${arAmount(FACTORY[2])}</p>`) }]).some((k) => k.startsWith("price_outside_markup")), "a non-lowest ar amount");
  for (const leak of [FACTORY[2].factory_name_fa, (presentPriceCell("fa", priceBlockDataFromRow(FACTORY[2])) as { amount: string }).amount, arAmount(FACTORY[2])]) assert.ok(kinds([{ path: "en/products/rebar.html", content: `<p>${leak}</p>` }]).some((k) => k.startsWith("price_on_en_page")), leak);
});

test("leak scan refuses the factory_prices keys in every public file", () => {
  for (const key of ["factory_prices", "is_lowest", "change_pct", "factoryPrices"]) assert.ok(scanPublicFile("prices.html", `<script>self.__next_f.push([1,"{\\"${key}\\":1}"])</script>`).some((f) => f.kind === "pricing_field" && f.match === key), key);
});

// --- JSON-LD offers ---------------------------------------------------------------------------------------

const URL_FA = "https://www.ahanassa.com/products/rebar";
const ld = (doc: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(doc)}</script></head><body></body></html>`;
const offers = (price = ROW.price_irr_per_kg, url = URL_FA) => jsonLdGraph([productOffersSchema({ url, offers: [{ variantXid: "CVAR-000031", priceIrrPerKg: price }] })]);
const byVariant = new Map([[ROW.canonical_variant_id, ROW]]);

test("JSON-LD: the lowest per-kg offer passes both gates on fa and ar product pages", () => {
  const node = offers()["@graph"][0] as { offers: unknown[] };
  assert.deepEqual(node.offers[0], {
    "@type": "Offer",
    "@id": `${URL_FA}#offer-CVAR-000031`,
    price: ROW.price_irr_per_kg,
    priceCurrency: "IRR",
    priceSpecification: { "@type": "UnitPriceSpecification", price: ROW.price_irr_per_kg, priceCurrency: "IRR", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" }, valueAddedTaxIncluded: true },
  });
  for (const p of ["products/rebar.html", "ar/products/rebar.html"]) {
    assert.deepEqual(scanOfferJsonLd(p, ld(offers()), byVariant), [], p);
    assert.deepEqual(scanPublication([{ path: p, content: ld(offers()) }], new Set()), [], p);
  }
  // Nothing of a factory, a date or a source in the offer (ar shows the lowest price only).
  assert.ok(!/factory|seller|published|valid|availability|کارخانه/.test(JSON.stringify(node)));
});

test("JSON-LD: never on en or another page, never a non-lowest factory price, never another shape", () => {
  const fails = (p: string, html: string) => scanOfferJsonLd(p, html, byVariant).map((f) => f.match);
  for (const p of ["en/products/rebar.html", "prices.html", "ar/prices.html", "products/category/rebar.html", "index.html"]) assert.ok(fails(p, ld(offers())).length > 0, p);
  assert.ok(kinds([{ path: "en/products/rebar.html", content: ld(offers()) }]).some((k) => k.startsWith("price_jsonld_not_allowed")), "scanPrices runs it on en");
  assert.ok(kinds([{ path: "prices.html", content: ld(offers()) }]).some((k) => k.startsWith("price_jsonld_not_allowed")), "scanPrices runs it on fa");
  assert.ok(fails("products/rebar.html", ld(offers(FACTORY[1].price_irr_per_kg))).some((m) => /not the lowest/.test(m)), "a factory's non-lowest price");
  const doc = offers() as { "@graph": Array<{ offers: Array<Record<string, unknown>> }> };
  const mutate = (fn: (o: Record<string, unknown>) => void) => {
    const d = structuredClone(doc);
    fn(d["@graph"][0].offers[0]);
    return fails("products/rebar.html", ld(d));
  };
  assert.ok(mutate((o) => (o.seller = { "@type": "Organization", name: "x" })).length > 0, "a seller");
  assert.ok(mutate((o) => (o.priceValidUntil = "2026-10-09")).length > 0, "a date");
  assert.ok(mutate((o) => (o.price = String(o.price))).length > 0, "a string price");
  assert.ok(mutate((o) => (o.priceCurrency = "USD")).length > 0, "another currency");
  assert.ok(mutate((o) => ((o.priceSpecification as Record<string, unknown>).valueAddedTaxIncluded = false)).length > 0, "VAT excluded");
  assert.ok(mutate((o) => (((o.priceSpecification as Record<string, unknown>).referenceQuantity as Record<string, unknown>).unitCode = "TNE")).length > 0, "per ton");
  assert.ok(mutate((o) => (o["@id"] = `${URL_FA}#offer-CVAR-000033`)).length > 0, "an unpriced variant");
  assert.ok(fails("products/rebar.html", ld({ "@type": "Offer", price: 1 })).length > 0, "an offer outside Product.offers");
});

test("product page wiring: offers from the lowest prices only, fa/ar only, in their own async boundary", () => {
  const src = fs.readFileSync(path.join(REPO, "app/[locale]/products/[slug]/page.tsx"), "utf8");
  assert.match(src, /<ProductOffers locale=\{locale\} variants=\{variants\} url=\{pageUrl\} \/>/);
  const repo = fs.readFileSync(path.join(REPO, "lib/pricing/product-page-price-repository.ts"), "utf8");
  assert.match(repo, /export async function listLowestPricesIrr[\s\S]*?eligiblePriceRows\(\)/, "the eligible lowest rows (published_prices), never published_factory_prices");
  const prices = fs.readFileSync(path.join(REPO, "app/[locale]/prices/page.tsx"), "utf8");
  assert.ok(!/JsonLd|offers/.test(prices), "the price page itself carries no offer");
});
