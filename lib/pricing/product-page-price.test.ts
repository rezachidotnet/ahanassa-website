import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allowedPriceTexts, AR_PRICE_COPY, firstPricedVariant, presentPriceCell, priceBlockDataFromRow, PRICE_COLUMN_COPY } from "./product-page-price.ts";
import { toCalculatorPrices } from "../weight-calculator/price.ts";
import { presentPriceBlock } from "./price-block-presentation.ts";
import { irrToToman, publishedPriceRow, PUBLISHED_PRICES_BUILD_DDL, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { snapshotV1 } from "../contracts/snapshot-v1.ts";
import { canonicalTablesJson, computeSnapshotVersion, readSnapshotFile } from "../static/snapshot-io.ts";

/** W9.4 — Persian product-page price: presentation, contract, build runtime, page wiring. SYNTHETIC values only. */

const REPO = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const code = (rel: string) => readFileSync(path.join(REPO, rel), "utf8");
const ROW: PublishedPriceRow = {
  canonical_variant_id: "CVAR-000031",
  price_irr_per_kg: 489470,
  vat_included: 1,
  factory_name_fa: "کارخانه آزمایشی الف",
  location_fa: "درب کارخانه",
  published_at: "2026-10-08T07:20:00Z",
  previous_price_irr_per_kg: 495610,
  previous_published_at: "2026-10-05T07:20:00Z",
};

test("row -> PriceBlockData: Toman = IRR ÷ 10, factory, location, time, previous; no source field exists", () => {
  const d = priceBlockDataFromRow(ROW);
  assert.deepEqual(d, { tomanPerKg: 48947, factoryName: "کارخانه آزمایشی الف", deliveryLocation: "درب کارخانه", pricedAt: "2026-10-08T07:20:00Z", previousTomanPerKg: 49561, previousPricedAt: "2026-10-05T07:20:00Z" });
  assert.equal(irrToToman(489475), 48948, "rounded to a whole Toman");
  const v = presentPriceBlock("fa", d);
  assert.ok(v?.kind === "price" && v.amount === "۴۸٬۹۴۷" && v.change?.direction === "down");
});

test("cell: fa shows amount + compact factory/location + date; ar shows amount + date only; unpriced -> «استعلام قیمت» / «السعر عند الطلب»; en nothing", () => {
  const cell = presentPriceCell("fa", priceBlockDataFromRow(ROW));
  // W9.6: ▲/▼ (previous price from an earlier Tehran day); no RFQ button without a variant id.
  assert.deepEqual(cell, { kind: "price", amount: "۴۸٬۹۴۷", place: "کارخانه آزمایشی الف، درب کارخانه", datetime: "2026-10-08T07:20:00.000Z", dateLabel: "۱۶ مهر ۱۴۰۵", change: { direction: "down", glyph: "▼", label: "۱٫۲٪", word: "کاهش" }, rfq: null });
  assert.deepEqual(presentPriceCell("fa", undefined), { kind: "missing", label: "استعلام قیمت" });
  assert.equal(presentPriceCell("en", priceBlockDataFromRow(ROW)), null);
  assert.equal(presentPriceCell("en", undefined), null);
  // ar (owner decision change 2026-10-09): price only — no factory, no location, no timestamp.
  assert.deepEqual(presentPriceCell("ar", priceBlockDataFromRow(ROW)), { kind: "price", amount: "٤٨٬٩٤٧", place: null, datetime: null, dateLabel: "٨ أكتوبر ٢٠٢٦", change: { direction: "down", glyph: "▼", label: "١٫٢٪", word: "انخفاض" }, rfq: null });
  assert.deepEqual(presentPriceCell("ar", undefined), { kind: "missing", label: "السعر عند الطلب" });
  assert.equal(PRICE_COLUMN_COPY.fa.header, "قیمت روز");
  assert.deepEqual(AR_PRICE_COPY, { header: "سعر اليوم", unit: "تومان/كغ", vat: "شامل ضريبة القيمة المضافة", missing: "السعر عند الطلب" });
  // ar copy and values in Arabic letters/digits only: the leak scan flags Persian-only letters (پ چ ژ گ ک ی) and digits on ar.
  for (const text of [...Object.values(AR_PRICE_COPY), ...allowedPriceTexts(ROW, "ar")]) assert.ok(!/[پچژگکی۰-۹]/.test(text), text);
  assert.ok(!allowedPriceTexts(ROW, "ar").some((x) => x.includes("کارخانه") || x.includes("درب")), "no factory or location on ar");
});

test("the main priced variant is the first priced one in table order; none -> null (missing-price block)", () => {
  const prices = new Map([["B", priceBlockDataFromRow(ROW)], ["C", priceBlockDataFromRow(ROW)]]);
  assert.equal(firstPricedVariant([{ xid: "A" }, { xid: "C" }, { xid: "B" }], prices)?.xid, "C");
  assert.equal(firstPricedVariant([{ xid: "A" }], prices), null);
});

test("no fake urgency: no price copy or allowed text uses urgency wording", () => {
  const texts = [...allowedPriceTexts(ROW, "fa", "میلگرد"), ...allowedPriceTexts(ROW, "ar"), ...Object.values(PRICE_COLUMN_COPY).flatMap((c) => Object.values(c))].join(" ");
  assert.ok(!/فقط امروز|محدود|آخرین|فوری|عجله|تخفیف|limited|hurry|last chance/i.test(texts), texts);
});

test("contract: published_prices rows are strict (only the rendered fields), positive integers, previous pairs consistent", () => {
  assert.ok(publishedPriceRow.safeParse(ROW).success);
  for (const bad of [{ ...ROW, source: "x" }, { ...ROW, factory_code: "FAC-1" }, { ...ROW, price_irr_per_kg: 0 }, { ...ROW, price_irr_per_kg: 1.5 }, { ...ROW, vat_included: 0 }, { ...ROW, factory_name_fa: " " }, { ...ROW, previous_published_at: null }, { ...ROW, previous_published_at: "2026-10-09T00:00:00Z" }, { ...ROW, published_at: "2026-10-08 07:20:00" }]) {
    assert.equal(publishedPriceRow.safeParse(bad).success, false, JSON.stringify(bad));
  }
});

test("snapshot.v1: prices must name a known variant once; an empty price table leaves every existing hash/version unchanged", () => {
  const fixture = path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json");
  const legacy = readSnapshotFile(fixture); // throws if the content-derived version no longer matches
  assert.deepEqual(legacy.tables.published_prices, []);
  assert.ok(!canonicalTablesJson(legacy.tables).includes("published_prices"));
  const raw = JSON.parse(readFileSync(fixture, "utf8"));
  const withPrices = { ...raw, tables: { ...raw.tables, published_prices: [ROW] } };
  assert.ok(snapshotV1.safeParse(withPrices).success);
  assert.notEqual(computeSnapshotVersion(snapshotV1.parse(withPrices).tables), legacy.snapshot_version, "prices are content");
  const unknown = { ...raw, tables: { ...raw.tables, published_prices: [{ ...ROW, canonical_variant_id: "CVAR-999999" }] } };
  assert.equal(snapshotV1.safeParse(unknown).success, false);
  const dup = { ...raw, tables: { ...raw.tables, published_prices: [ROW, ROW] } };
  assert.equal(snapshotV1.safeParse(dup).success, false);
});

test("build runtime: published_prices loads into the in-memory DB_PUBLIC — and is never a DB_PUBLIC migration or a D1 load", () => {
  // Same order as lib/static/build-runtime/snapshot-d1.ts: the real migrations, then the build-only DDL.
  const db = new DatabaseSync(":memory:");
  const dir = path.join(REPO, "migrations_public");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) db.exec(readFileSync(path.join(dir, f), "utf8"));
  db.exec(PUBLISHED_PRICES_BUILD_DDL);
  const cols = Object.keys(ROW);
  db.prepare(`INSERT INTO published_prices (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).run(...(Object.values(ROW) as never[]));
  assert.deepEqual({ ...(db.prepare("SELECT * FROM published_prices").get() as object) }, ROW);
  assert.throws(() => db.prepare("INSERT INTO published_prices (canonical_variant_id, price_irr_per_kg, vat_included, factory_name_fa, location_fa, published_at) VALUES ('CVAR-1', 0, 1, 'x', 'y', 'z')").run());
  assert.match(code("lib/static/build-runtime/snapshot-d1.ts"), /db\.exec\(PUBLISHED_PRICES_BUILD_DDL\);/);
  for (const f of files) assert.ok(!/published_prices/.test(readFileSync(path.join(dir, f), "utf8")), `${f}: prices are never a DB_PUBLIC table`);
  for (const f of ["scripts/static/snapshot-load-sql.ts"]) assert.match(code(f), /BUILD_ONLY_SNAPSHOT_TABLES\.has\(table\)\) continue/);
  assert.ok(!/published_prices/.test(code("lib/content-pipeline/publication-sql.ts")), "the pipeline never mirrors prices into D1");
});

test("page wiring: fa-only price block + column inside an always-suspending async boundary (own Flight row, r4), JSON-LD Product without offers", () => {
  const page = code("app/[locale]/products/[slug]/page.tsx");
  assert.match(page, /async function ProductSpecs\([^)]*\) \{\s*await Promise\.resolve\(\);/);
  assert.match(page, /<ProductSpecs locale=\{locale\}/);
  assert.match(page, /const prices = isPriceLocale\(locale\) \? await listProductPagePrices\(/);
  assert.match(page, /\{prices && locale === "fa" && \(/, "the PriceBlock (factory, location) is fa only");
  assert.ok(!/offers|priceCurrency/.test(page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "no JSON-LD offers");
  const table = code("components/products/variant-spec-table.tsx");
  // Owner 2026-10-09: fa and ar (not en); hidden unless at least one variant has a price; right after the size column.
  assert.match(table, /const priceCopy = isPriceLocale\(locale\) \? PRICE_COLUMN_COPY\[locale\] : null;/);
  assert.match(table, /const showPrices = priceCopy !== null && Boolean\(prices\) && variants\.some\(\(v\) => prices!\.has\(v\.xid\)\);/);
  const head = table.slice(table.indexOf("<thead>"), table.indexOf("</thead>"));
  assert.ok(head.indexOf("{t.size}") < head.indexOf("priceCopy?.header") && head.indexOf("priceCopy?.header") < head.indexOf("dimensionColumns.map"), "price header right after the size header");
  const body = table.slice(table.indexOf("<tbody>"), table.indexOf("</tbody>"));
  assert.ok(body.indexOf("</th>") < body.indexOf("<PriceCell") && body.indexOf("<PriceCell") < body.indexOf("dimensionColumns.map"), "price cell right after the size cell");
  const repo = code("lib/pricing/product-page-price-repository.ts");
  assert.match(repo, /if \(!isStaticExportBuild\(\)\) return null;/, "prices exist only in the static build");
});

test("calculator price map: fa {tomanPerKg, datetime, dateLabel, factory}; ar {tomanPerKg, dateLabel} only; en none", () => {
  const map = { "CVAR-000031": priceBlockDataFromRow(ROW) };
  // W9.6: fa also carries the factory, for the «استعلام قیمت نهایی» prefill; ar never.
  assert.deepEqual(toCalculatorPrices("fa", map), { "CVAR-000031": { tomanPerKg: 48947, datetime: "2026-10-08T07:20:00.000Z", dateLabel: "۱۶ مهر ۱۴۰۵", factory: "کارخانه آزمایشی الف" } });
  assert.deepEqual(toCalculatorPrices("ar", map), { "CVAR-000031": { tomanPerKg: 48947, dateLabel: "٨ أكتوبر ٢٠٢٦" } });
  assert.equal(toCalculatorPrices("en", map), undefined);
  const page = code("app/[locale]/tools/weight-calculator/page.tsx");
  assert.match(page, /async function PricedWeightCalculator\([^)]*\) \{\s*await Promise\.resolve\(\);/, "own Flight row (r4)");
  assert.match(page, /if \(isPriceLocale\(locale\)\) \{/);
  assert.ok(!/toCalculatorPrices\(locale, null\)/.test(page), "wired to the build-time price map");
  assert.match(code("lib/weight-calculator/price.ts"), /from "\.\.\/pricing\/price-locale\.ts"/, "the client bundle never imports the zod snapshot contract");
  assert.ok(!/^import .*(snapshot-prices|zod)/m.test(code("lib/pricing/price-locale.ts")), "price-locale imports neither zod nor the snapshot contract");
});
