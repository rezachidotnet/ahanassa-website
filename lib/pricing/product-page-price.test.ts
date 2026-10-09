import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allowedPriceTexts, firstPricedVariant, presentPriceCell, priceBlockDataFromRow, PRICE_COLUMN_COPY } from "./product-page-price.ts";
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

test("cell: fa shows amount + compact factory/location + date; a variant without a price shows «استعلام قیمت»; en/ar show nothing", () => {
  const cell = presentPriceCell("fa", priceBlockDataFromRow(ROW));
  assert.deepEqual(cell, { kind: "price", amount: "۴۸٬۹۴۷", place: "کارخانه آزمایشی الف، درب کارخانه", datetime: "2026-10-08T07:20:00.000Z", dateLabel: "۱۶ مهر ۱۴۰۵" });
  assert.deepEqual(presentPriceCell("fa", undefined), { kind: "missing", label: "استعلام قیمت" });
  assert.equal(presentPriceCell("en", priceBlockDataFromRow(ROW)), null);
  assert.equal(presentPriceCell("ar", undefined), null);
  assert.equal(PRICE_COLUMN_COPY.header, "قیمت روز");
});

test("the main priced variant is the first priced one in table order; none -> null (missing-price block)", () => {
  const prices = new Map([["B", priceBlockDataFromRow(ROW)], ["C", priceBlockDataFromRow(ROW)]]);
  assert.equal(firstPricedVariant([{ xid: "A" }, { xid: "C" }, { xid: "B" }], prices)?.xid, "C");
  assert.equal(firstPricedVariant([{ xid: "A" }], prices), null);
});

test("no fake urgency: no price copy or allowed text uses urgency wording", () => {
  const texts = [...allowedPriceTexts(ROW, "میلگرد"), ...Object.values(PRICE_COLUMN_COPY)].join(" ");
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
  assert.match(page, /const prices = locale === "fa" \? await listProductPagePrices\(/);
  assert.ok(!/offers|priceCurrency/.test(page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "no JSON-LD offers");
  const table = code("components/products/variant-spec-table.tsx");
  assert.match(table, /const showPrices = locale === "fa" && Boolean\(prices\);/);
  const repo = code("lib/pricing/product-page-price-repository.ts");
  assert.match(repo, /if \(!isStaticExportBuild\(\)\) return null;/, "prices exist only in the static build");
});
