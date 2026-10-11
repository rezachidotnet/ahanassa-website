import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { priceGateInput, scanPrices } from "./price-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { loadSourceNames, nameVariants, REDACTED_PATH, redactSourceNames, scanSourceNames, SOURCE_NAMES_ENV } from "./source-name-scan.ts";
import { buildRedirectsFile, unpublishedPricePageRedirects } from "./static-rules.ts";
import { isDailyPriceEligible, PER_TON_CLASSIFICATION_CODES } from "../pricing/daily-price-eligibility.ts";
import { PRICE_RFQ_COPY, priceRfqHref } from "../pricing/price-rfq.ts";
import { buildPriceTableRows, filterOptions, isPricePagePublished, latestPricedAt, PRICE_NAV_LABEL, PRICE_PAGE_COPY, PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "../pricing/price-page.ts";
import { PRICE_DISCLAIMER, PRICE_TREND_COPY, presentPriceCell, priceBlockDataFromRow } from "../pricing/product-page-price.ts";
import { sparklineGeometry, sparklineSeries } from "../pricing/price-history.ts";
import { parseRfqRowPrefill } from "../rfq/rfq-prefill.ts";
import { createCatalogRowFromSelection } from "../rfq/item-row-validation.ts";
import { navLinks } from "../content/nav.ts";
import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/** W9.6 — price page, ▲/▼, chart, «استعلام قیمت نهایی», disclaimer and their gates. SYNTHETIC data only. */

const REPO = path.resolve(import.meta.dirname, "../..");
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
const HISTORY = ["2026-09-28", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-08"].map((day, i, all) => ({
  canonical_variant_id: "CVAR-000031",
  day,
  price_irr_per_kg: i === all.length - 1 ? 489470 : 495000 + i * 100,
  published_at: `${day}T07:20:00Z`,
}));
const SNAPSHOT = {
  tables: {
    published_prices: [ROW],
    published_price_history: HISTORY,
    product_variants: [
      { xid: "CVAR-000031", commercial_size: "10", sku: "AA-RB-AJ400-D10-L12", family_code: "LONG_PRODUCTS", group_code: "REBAR", form_code: "RIBBED_REBAR" },
      { xid: "CVAR-000900", commercial_size: "150", sku: "AA-BL-150", family_code: "SEMI_FINISHED", group_code: "LONG_SEMIS", form_code: "BILLET" },
    ],
  },
};
const kinds = (files: { path: string; content: string }[], snapshot: unknown = SNAPSHOT) => scanPrices(files, priceGateInput(snapshot)).map((f) => `${f.kind}:${f.match}`);

/** A fa price cell exactly as components/products/price-cell-content.tsx renders it. */
function faCell(row = ROW): string {
  const v = presentPriceCell("fa", priceBlockDataFromRow(row), row.canonical_variant_id);
  assert.ok(v?.kind === "price");
  const change = v.change ? `<span><span aria-hidden="true">${v.change.glyph}</span><span class="sr-only">${v.change.word} </span>${v.change.label}</span>` : "";
  return `<td data-aa-price-cell="${row.canonical_variant_id}"><span>${v.amount}</span>${change}<span>${v.place}</span><time dateTime="${v.datetime}">${v.dateLabel}</time><a href="${v.rfq!.href.replace(/&/g, "&amp;")}">${v.rfq!.label}</a></td>`;
}
function arCell(row = ROW): string {
  const v = presentPriceCell("ar", priceBlockDataFromRow(row), row.canonical_variant_id);
  assert.ok(v?.kind === "price");
  const change = v.change ? `<span><span aria-hidden="true">${v.change.glyph}</span><span class="sr-only">${v.change.word} </span>${v.change.label}</span>` : "";
  return `<td data-aa-price-cell="${row.canonical_variant_id}"><span>${v.amount}</span>${change}<span>${v.dateLabel}</span><a href="${v.rfq!.href}">${v.rfq!.label}</a></td>`;
}
function chart(points: number): string {
  const series = sparklineSeries(HISTORY.map((h) => ({ day: h.day, price: Math.round(h.price_irr_per_kg / 10) })), "2026-10-08")!;
  const g = sparklineGeometry(series.slice(0, points), "2026-10-08");
  return `<figure data-aa-price-sparkline="${points}"><figcaption>${PRICE_TREND_COPY.fa}</figcaption><svg role="img" aria-label="${PRICE_TREND_COPY.fa}"><path d="${g.path}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg></figure>`;
}
const page = (body: string) => `<html><body><h1>میلگرد آجدار A3</h1>${body}<p>${PRICE_DISCLAIMER.fa}</p></body></html>`;

test("fa price page / table: amount + ▲/▼ + factory/location + date + «استعلام قیمت نهایی» pass the allow-list", () => {
  assert.deepEqual(kinds([{ path: "prices.html", content: page(`<table><tr data-aa-family="REBAR" data-aa-factory="${ROW.factory_name_fa}"><th><a href="/products/x?variant=CVAR-000031">میلگرد آجدار A3</a></th><td>10</td>${faCell()}</tr></table>`) }]), []);
  const cell = faCell();
  assert.match(cell, /▼/);
  assert.match(cell, /\/contact\?variant=CVAR-000031&amp;factory=/);
  assert.deepEqual(kinds([{ path: "prices.html", content: page(cell.replace("استعلام قیمت نهایی", "خرید فوری")) }]).map((k) => k.split(":")[0]), ["price_text_not_allowed"], "any other text in the cell fails");
});

test("fa chart: allowed only inside a priced block, with ≥ 7 snapshot points, drawing exactly that many", () => {
  const block = (inner: string) => `<div data-aa-price-block="CVAR-000031"><section>${inner}</section></div>`;
  assert.deepEqual(kinds([{ path: "products/rebar.html", content: page(block(chart(7))) }]), []);
  assert.ok(kinds([{ path: "products/rebar.html", content: page(block(chart(6))) }]).some((k) => k.startsWith("price_sparkline_not_allowed")), "draws fewer points than the snapshot has");
  assert.ok(kinds([{ path: "products/rebar.html", content: page(block(chart(7))) }], { tables: { ...SNAPSHOT.tables, published_price_history: HISTORY.slice(1) } }).some((k) => k.startsWith("price_sparkline_not_allowed")), "the snapshot has only 6 points: no chart allowed");
  assert.ok(kinds([{ path: "prices.html", content: page(`<table><tr>${faCell().replace("</td>", `${chart(7)}</td>`)}</tr></table>`) }]).some((k) => k.startsWith("price_sparkline_not_allowed")), "never in a table cell");
});

test("ar: price + ▲/▼ + date + VAT + «طلب السعر النهائي» — never a chart, the factory (also not in the RFQ link) or fa copy", () => {
  const ar = (body: string) => `<html><body><h1>حديد</h1>${body}<p>${PRICE_DISCLAIMER.ar}</p></body></html>`;
  assert.deepEqual(kinds([{ path: "ar/prices.html", content: ar(`<table><tr data-aa-family="REBAR">${arCell()}</tr></table>`) }]), []);
  assert.ok(!arCell().includes("factory="), "the ar RFQ link carries no factory");
  assert.match(arCell(), /▼.*انخفاض.*١٫٢٪/, "ar shows the change (owner decision on PR #35)");
  assert.deepEqual(kinds([{ path: "ar/prices.html", content: ar(`<table><tr>${arCell().replace("١٫٢٪", "١٫٣٪")}</tr></table>`) }]).map((k) => k.split(":")[0]), ["price_text_not_allowed"], "a wrong percent fails");
  for (const leak of ["data-aa-price-sparkline=\"7\"", "&amp;factory=x", PRICE_DISCLAIMER.fa, PRICE_RFQ_COPY.fa, PRICE_TREND_COPY.fa, ROW.factory_name_fa]) {
    assert.ok(kinds([{ path: "ar/prices.html", content: ar(`<table><tr>${arCell()}</tr></table><p>${leak}</p>`) }]).some((k) => k.startsWith("price_fa_field_on_ar_page")), leak);
  }
  // The ar copy uses Arabic letters only (the leak scan flags Persian-only letters on ar).
  for (const text of [PRICE_DISCLAIMER.ar, PRICE_RFQ_COPY.ar, PRICE_NAV_LABEL.ar, ...Object.values(PRICE_PAGE_COPY.ar).filter((v): v is string => typeof v === "string"), PRICE_PAGE_COPY.ar.count("٣")]) assert.ok(!/[پچژگکی۰-۹]/.test(text), text);
  assert.deepEqual(scanPublicFile("ar/prices.html", ar(`<table><tr>${arCell()}</tr></table>`)).filter((f) => f.kind === "persian_on_ar"), []);
});

test("en: ANY W9.6 price data on an en page fails the gate (HTML or Flight payload)", () => {
  const en = (x: string) => `<html><body><h1>Rebar</h1>${x}<script>self.__next_f.push([1,"{}"])</script></body></html>`;
  assert.deepEqual(kinds([{ path: "en/products/rebar.html", content: en("<p>Steel</p>") }]), []);
  const leaks = [faCell(), arCell(), chart(7), "▲ 1.2%", "انخفاض", PRICE_DISCLAIMER.fa, PRICE_DISCLAIMER.ar, PRICE_RFQ_COPY.fa, PRICE_RFQ_COPY.ar, PRICE_TREND_COPY.fa, "/contact?variant=CVAR-000031&factory=x", '\\"tomanPerKg\\":48947', "۴۸٬۹۴۷", "٤٨٬٩٤٧", ROW.factory_name_fa, ROW.location_fa];
  for (const leak of leaks) assert.ok(kinds([{ path: "en/products/rebar.html", content: en(leak) }]).some((k) => k.startsWith("price_on_en_page")), leak.slice(0, 60));
  for (const leak of leaks.slice(0, 3)) assert.ok(kinds([{ path: "en/prices.html", content: en(leak) }]).some((k) => k.startsWith("price_on_en_page")));
});

test("en has no price page, no «قیمت روز» nav item and no sitemap/hreflang entry; /en/prices 302s to /en", () => {
  assert.deepEqual(PRICE_PAGE_LOCALES, ["fa", "ar"]);
  assert.equal(isPricePagePublished("en"), false);
  assert.ok(!navLinks.en.some((l) => l.path === PRICE_PAGE_ROUTE));
  assert.ok(navLinks.fa.some((l) => l.path === PRICE_PAGE_ROUTE && l.label === "قیمت روز"));
  assert.ok(navLinks.ar.some((l) => l.path === PRICE_PAGE_ROUTE && l.label === PRICE_NAV_LABEL.ar));
  assert.deepEqual(unpublishedPricePageRedirects(), ["/en/prices /en 302"]);
  assert.ok(buildRedirectsFile().includes("/en/prices /en 302\n"));
  const sitemap = fs.readFileSync(path.join(REPO, "app/sitemap.ts"), "utf8");
  assert.match(sitemap, /PRICE_PAGE_LOCALES as readonly string\[\]\)\.includes\(locale\)/);
  const route = fs.readFileSync(path.join(REPO, "app/[locale]/prices/page.tsx"), "utf8");
  assert.match(route, /return PRICE_PAGE_LOCALES\.map\(\(locale\) => \(\{ locale \}\)\);/, "generateStaticParams: fa and ar only");
  assert.match(route, /async function DailyPriceTable\([^)]*\) \{\s*await Promise\.resolve\(\);/, "own Flight row (r4)");
  assert.ok(!/JsonLd|offers|priceCurrency/.test(route), "no JSON-LD price (SEO phase later)");
  assert.ok(!/listPublishedPrices|DB_PUBLIC|getPublicDb/.test(route), "reads only through the build-time repository");
  // A value imported from a "use client" module is a client reference on the server: the row attributes come from lib.
  assert.match(route, /import { PriceTableFilter } from "@\/components\/prices\/price-table-filter";/);
  assert.match(route, /PRICE_ROW_FACTORY_ATTRIBUTE, PRICE_ROW_FAMILY_ATTRIBUTE, type PriceTableRow \} from "@\/lib\/pricing\/price-page";/);
});

test("per-ton raw and semi-finished materials never get a daily price (iron ore, billet, briquette)", () => {
  for (const code of ["IRON_ORE", "BILLET", "HOT_BRIQUETTED_IRON", "RAW_MATERIALS", "SEMI_FINISHED"]) assert.ok(PER_TON_CLASSIFICATION_CODES.has(code), code);
  assert.equal(isDailyPriceEligible({ familyCode: "LONG_PRODUCTS", groupCode: "REBAR", formCode: "RIBBED_REBAR" }), true);
  assert.equal(isDailyPriceEligible({ familyCode: "SEMI_FINISHED", groupCode: "LONG_SEMIS", formCode: "BILLET" }), false);
  assert.equal(isDailyPriceEligible({ familyCode: "RAW_MATERIALS", groupCode: "IRON_ORE", formCode: "IRON_ORE_PELLET" }), false);
  assert.equal(isDailyPriceEligible({ familyCode: null, groupCode: null, formCode: "hot_briquetted_iron" }), false, "case-insensitive");
  const billet = { ...ROW, canonical_variant_id: "CVAR-000900" };
  const snap = { tables: { ...SNAPSHOT.tables, published_prices: [ROW, billet] } };
  assert.ok(kinds([{ path: "prices.html", content: page(`<table><tr>${faCell(billet)}</tr></table>`) }], snap).some((k) => k.startsWith("price_excluded_variant")), "the gate refuses a billet price element");
  const repo = fs.readFileSync(path.join(REPO, "lib/pricing/product-page-price-repository.ts"), "utf8");
  assert.match(repo, /\.filter\(\(r\) => isDailyPriceEligible\(/, "every price read filters them out");
});

test("«استعلام قیمت نهایی»: /contact?variant= (+ fa factory) → the row's existing notes, client-side; ar/invalid factory ignored", () => {
  assert.equal(priceRfqHref("fa", "CVAR-000031", "کارخانه آزمایشی الف"), `/contact?variant=CVAR-000031&factory=${encodeURIComponent("کارخانه آزمایشی الف").replace(/%20/g, "+")}`);
  assert.equal(priceRfqHref("ar", "CVAR-000031", "کارخانه آزمایشی الف"), "/ar/contact?variant=CVAR-000031", "ar never carries the factory");
  assert.equal(priceRfqHref("fa", "CVAR-000031", null, "variant=CVAR-000031&qty=100&unit=kg"), "/contact?variant=CVAR-000031&qty=100&unit=kg", "the calculator's quantity hand-off is kept");
  const q = (s: string) => new URLSearchParams(s);
  assert.deepEqual(parseRfqRowPrefill(q(new URL(`https://x${priceRfqHref("fa", "CVAR-1", "کارخانه آزمایشی الف")}`).search), "REBAR", "fa"), { notes: "کارخانه: کارخانه آزمایشی الف" });
  assert.deepEqual(parseRfqRowPrefill(q("variant=CVAR-1&factory=x"), "REBAR", "ar"), {}, "ar: ignored");
  assert.deepEqual(parseRfqRowPrefill(q("variant=CVAR-1&factory=x"), "REBAR"), {}, "no locale: ignored");
  for (const bad of ["<script>", "a".repeat(81), "https://example.test/x", " ", "x;y"]) assert.deepEqual(parseRfqRowPrefill(q(`factory=${encodeURIComponent(bad)}`), "REBAR", "fa"), {}, bad);
  assert.deepEqual(parseRfqRowPrefill(q(`factory=${encodeURIComponent("x\n  y")}`), "REBAR", "fa"), { notes: "کارخانه: x y" }, "whitespace folded to one line");
  const row = createCatalogRowFromSelection({ categoryCode: "rebar", templateXid: "CTMPL-1", variantXid: "CVAR-1" }, { notes: "کارخانه: الف" });
  assert.equal(row.fields.notes, "کارخانه: الف", "the existing notes field — no new API field");
  // The RFQ Worker is untouched by this task: the factory only ever reaches it as note text the visitor can edit.
  assert.ok(!fs.readFileSync(path.join(REPO, "lib/rfq/validation.ts"), "utf8").includes("factory"));
});

test("price page rows: every priced variant once, grouped by family in catalog order, fa factory filter, ar none", () => {
  const prices = new Map([
    ["CVAR-2", priceBlockDataFromRow({ ...ROW, canonical_variant_id: "CVAR-2", factory_name_fa: "کارخانه ب" })],
    ["CVAR-1", priceBlockDataFromRow(ROW)],
    ["CVAR-9", priceBlockDataFromRow({ ...ROW, canonical_variant_id: "CVAR-9", published_at: "2026-10-09T07:00:00Z", previous_published_at: null, previous_price_irr_per_kg: null })],
  ]);
  const templates = [
    { slug: "ipe", productName: "تیرآهن", variants: [{ xid: "CVAR-9", size: "IPE 120", groupCode: "BEAMS", familyName: null }] },
    { slug: "rebar", productName: "میلگرد", variants: [{ xid: "CVAR-1", size: "10", groupCode: "REBAR", familyName: null }, { xid: "CVAR-3", size: "12", groupCode: "REBAR", familyName: null }, { xid: "CVAR-2", size: "14", groupCode: "REBAR", familyName: null }] },
  ];
  const family = (g: string | null) => (g === "REBAR" ? { code: "REBAR", label: "میلگرد", position: 0 } : { code: "BEAMS", label: "تیرآهن", position: 1 });
  const fa = buildPriceTableRows("fa", templates, prices, family);
  assert.deepEqual(fa.map((r) => r.xid), ["CVAR-1", "CVAR-2", "CVAR-9"], "family order, then size order; unpriced CVAR-3 left out");
  assert.equal(fa[0].productPath, "/products/rebar?variant=CVAR-1");
  assert.deepEqual(filterOptions(fa), { families: [{ value: "REBAR", label: "میلگرد" }, { value: "BEAMS", label: "تیرآهن" }], factories: ["کارخانه آزمایشی الف", "کارخانه ب"] });
  assert.equal(latestPricedAt(fa), "2026-10-09T07:00:00Z");
  const ar = buildPriceTableRows("ar", templates, prices, family);
  assert.ok(ar.every((r) => r.factory === null), "ar rows never carry the factory");
  assert.deepEqual(filterOptions(ar).factories, []);
  assert.deepEqual(buildPriceTableRows("fa", templates, new Map(), family), []);
});

test("disclaimer: the approved fa/ar lines — ONCE on a product page (under the variant table), under the price page table and the calculator estimate", () => {
  assert.equal(PRICE_DISCLAIMER.fa, "قیمت‌ها به تومان برای هر کیلوگرم و شامل ۱۰٪ ارزش افزوده است. قیمت نهایی بر اساس تناژ، زمان سفارش و محل تحویل اعلام می‌شود.");
  assert.equal(PRICE_DISCLAIMER.ar, "الأسعار بالتومان لكل كيلوغرام وتشمل ضريبة القيمة المضافة ١٠٪. يُحدَّد السعر النهائي حسب الكمية ووقت الطلب ومكان التسليم.");
  const src = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
  assert.ok(!src("app/[locale]/products/[slug]/page.tsx").includes("PRICE_DISCLAIMER"), "not under the price block (owner decision on PR #35)");
  assert.match(src("components/products/variant-spec-table.tsx"), /\{priceCopy\?\.note\}/);
  assert.match(src("app/[locale]/prices/page.tsx"), /\{PRICE_DISCLAIMER\[locale\]\}/);
  assert.match(src("components/tools/weight-calculator.tsx"), /\{PRICE_DISCLAIMER\[locale as PriceLocale\]\}/);
});

test("no home-page price strip and no «from X» on category cards (W9.6 scope 5)", () => {
  const src = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
  for (const f of ["app/[locale]/page.tsx", "app/[locale]/products/page.tsx", "app/[locale]/products/category/[segment]/page.tsx"]) {
    if (!fs.existsSync(path.join(REPO, f))) continue;
    assert.ok(!/listProductPagePrices|listAllPublishedPrices|PriceCellContent|PriceBlock\b/.test(src(f)), f);
  }
});

test("source-name scan: names come from a private file outside the repo; any spelling in any public file fails", () => {
  // SYNTHETIC names only — the real list never lives in this public repository.
  const names = ["example-market.test", "samplesteel.example"];
  const files = [
    { path: "prices.html", content: "<p>قیمت</p>" },
    { path: "ar/prices.html", content: '<a href="https://www.Example-Market.test/x">x</a>' },
    { path: "products/rebar.html", content: "<script>self.__next_f.push([1,\"examplemarket\"])</script>" },
    { path: "en/index.html", content: "Sample Steel" },
  ];
  // A finding is the file + the name's 1-based index in the private list — never the name.
  assert.deepEqual(scanSourceNames(files, names), [{ file: "ar/prices.html", index: 1 }, { file: "products/rebar.html", index: 1 }, { file: "en/index.html", index: 2 }]);
  // W9.7 review: a PATH that contains a name is never printed (it would leak into public CI logs).
  assert.deepEqual(scanSourceNames([{ path: "images/ExampleMarket-logo.png", content: "" }, { path: "x/sample-steel/a.html", content: "example-market.test" }], names), [
    { file: REDACTED_PATH, index: 1 },
    { file: REDACTED_PATH, index: 2 },
    { file: REDACTED_PATH, index: 1 },
  ]);
  assert.equal(REDACTED_PATH, "<path redacted: it contains a listed name>", "same text as main's v11-source-names.mjs");
  // Any other gate line holding a name (path or matched text) is replaced; only the indexes remain.
  assert.equal(redactSourceNames("leak contact in partners/example-market.html: x@y.z", names), "<gate finding redacted: it contains listed name(s) #1>");
  assert.equal(redactSourceNames("price price_on_en_page in en/a.html: Sample Steel", names), "<gate finding redacted: it contains listed name(s) #2>");
  assert.equal(redactSourceNames("leak contact in en/a.html: x@y.z", names), "leak contact in en/a.html: x@y.z", "lines without a name are unchanged");
  assert.equal(redactSourceNames("partners/example-market.html", null), "partners/example-market.html", "no list: unchanged (the gate reports not_run)");
  assert.deepEqual(nameVariants("https://www.example-market.test/prices"), ["example-market.test", "example-market", "examplemarkettest", "examplemarket"]);
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "names-"));
  const file = path.join(tmp, "names.txt");
  fs.writeFileSync(file, "# private\nexample-market.test\n\nab\n");
  assert.deepEqual(loadSourceNames({ [SOURCE_NAMES_ENV]: file }), ["example-market.test"]);
  assert.equal(loadSourceNames({}), null, "not configured: the gate reports not_run, never a silent pass");
  fs.rmSync(tmp, { recursive: true });
});
