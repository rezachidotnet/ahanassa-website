import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCalculatorProducts, computeWeight, customBasis, defaultLengthM, FORM_SHAPES, resolveVariantBasis, supportsCustomSize, tableOnlySizes, type CalculatorProduct } from "./model.ts";
import { DISPLAY_DECIMALS, formatInputValue, formatNumber, parseDecimalInput, roundHalfAwayFromZero, roundToThousand } from "./format.ts";
import { rfqHandoffHref } from "./handoff.ts";
import { estimateCostToman, toCalculatorPrice, toCalculatorPrices } from "./price.ts";
import { BASIS_LINES, WEIGHT_CALCULATOR_COPY } from "./copy.ts";
import { STANDARDS } from "./standards.ts";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "./publication.ts";
import { parseRfqRowPrefill } from "../rfq/rfq-prefill.ts";
import { locales } from "../../config/locales.ts";

/** W10.1 — weight calculator: model, conversions, rounding, hand-off, price row, copy, page invariants. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

interface SnapshotRow {
  product_id: string;
  xid: string;
  sku: string;
  commercial_size: string | null;
  section_size: string | null;
  group_code: string | null;
  form_code: string | null;
  dimensions_json: string | null;
  nominal_weight_json: string | null;
}
const SNAPSHOT = JSON.parse(read("fixtures/snapshot/staging-2026-10-01.snapshot.json")) as { tables: { product_variants: SnapshotRow[]; catalog_products: { id: string; template_xid: string }[] } };
const toInput = (r: SnapshotRow) => ({
  xid: r.xid,
  sku: r.sku,
  commercialSize: r.commercial_size,
  sectionSize: r.section_size,
  dimensions: r.dimensions_json ? (JSON.parse(r.dimensions_json) as Record<string, number>) : null,
  nominalWeight: r.nominal_weight_json ? (JSON.parse(r.nominal_weight_json) as Record<string, number>) : null,
  group: { code: r.group_code, name: null },
  form: { code: r.form_code, name: null },
});
const PRODUCTS: CalculatorProduct[] = buildCalculatorProducts(
  SNAPSHOT.tables.catalog_products.map((p) => ({ templateXid: p.template_xid, label: p.template_xid, variants: SNAPSHOT.tables.product_variants.filter((v) => v.product_id === p.id).map(toInput) })),
);
const product = (templateXid: string) => PRODUCTS.find((p) => p.templateXid === templateXid)!;
const variant = (p: CalculatorProduct, size: string) => p.variants.find((v) => v.size === size)!;

// --- model ----------------------------------------------------------------------

test("shapes: exactly the 12 product forms of the catalog snapshot map to a shape", () => {
  const forms = [...new Set(SNAPSHOT.tables.product_variants.map((v) => v.form_code))].sort();
  assert.deepEqual(forms, Object.keys(FORM_SHAPES).sort());
});

test("every published template and size of the snapshot is offered, all with the catalog's own nominal weight («مقدار کاتالوگ»)", () => {
  assert.equal(PRODUCTS.length, 16);
  assert.equal(PRODUCTS.reduce((n, p) => n + p.variants.length, 0), 256);
  assert.ok(PRODUCTS.every((p) => p.variants.every((v) => v.source === "catalog")));
  // Shape order: rebar first, plates last.
  assert.equal(PRODUCTS[0].shape, "rebar");
  assert.equal(PRODUCTS.at(-1)!.shape, "plate");
  // Natural size order (Ø8 before Ø10, IPE 80 before IPE 100).
  assert.equal(product("CTMPL-000002").variants[0].size, "IPE 80");
});

test("catalog values are used as-is: IPE 180 18.8 kg/m, Ø10 0.61654 kg/m, plate 10×1500×6000 706.5 kg/sheet and 78.5 kg/m²", () => {
  assert.equal(variant(product("CTMPL-000002"), "IPE 180").kgPerMetre, 18.8);
  assert.equal(variant(product("CTMPL-000008"), "Ø10").kgPerMetre, 0.61654);
  const plate = variant(product("CTMPL-000013"), "10×1500×6000");
  assert.equal(plate.pieceKg, 706.5);
  assert.equal(plate.kgPerSquareMetre, 78.5);
});

test("precedence: no catalog weight → beams from the EN 10365 table, others from the formula; nothing usable → not offered", () => {
  const ipe = { xid: "CVAR-X", sku: "S", commercialSize: "IPE 300", sectionSize: null, dimensions: { height_mm: 300, length_mm: 12000 }, nominalWeight: null, group: { code: "BEAMS", name: null }, form: { code: "IPE", name: null } };
  assert.deepEqual(resolveVariantBasis("ipe", ipe), { kgPerMetre: 42.2, kgPerSquareMetre: NaN, pieceKg: null, lengthMm: 12000, source: "table" });
  assert.equal(resolveVariantBasis("ipe", { ...ipe, commercialSize: "IPE 310", dimensions: { height_mm: 310 } }), null, "not in the table → not offered");
  const rebar = { ...ipe, commercialSize: "Ø18", dimensions: { diameter_mm: 18 }, form: { code: "RIBBED_REBAR", name: null } };
  assert.deepEqual(resolveVariantBasis("rebar", rebar), { kgPerMetre: 2, kgPerSquareMetre: NaN, pieceKg: null, lengthMm: null, source: "formula" });
  assert.equal(resolveVariantBasis("rebar", { ...rebar, dimensions: {} }), null);
  // A catalog per-branch weight without kg/m still counts as the catalog value.
  assert.equal(resolveVariantBasis("rebar", { ...rebar, nominalWeight: { per_branch: 24 }, dimensions: { diameter_mm: 18, length_mm: 12000 } })!.kgPerMetre, 2);
  // An unknown form is never offered.
  assert.equal(buildCalculatorProducts([{ templateXid: "T", label: "x", variants: [{ ...rebar, nominalWeight: { kg_m: 1 }, form: { code: "HEB", name: null } }] }]).length, 0);
});

test("beams: no custom-dimension form, and no table-only sizes because the catalog lists the whole EN 10365 range", () => {
  assert.equal(supportsCustomSize("ipe"), false);
  assert.equal(supportsCustomSize("ipn"), false);
  assert.deepEqual(tableOnlySizes(product("CTMPL-000002")), []);
  assert.deepEqual(tableOnlySizes({ ...product("CTMPL-000002"), variants: [variant(product("CTMPL-000002"), "IPE 80")] }).slice(0, 2), [100, 120]);
});

test("custom sizes use the cited formulas", () => {
  assert.equal(customBasis("rebar", { d: 18 }).kgPerMetre, 2);
  assert.deepEqual(customBasis("plate", { t: 10, w: 1500, l: 6000 }), { kgPerMetre: NaN, kgPerSquareMetre: 78.5, pieceKg: 706.5 });
  assert.ok(Math.abs(customBasis("shs", { a: 100, t: 4 }).kgPerMetre - 11.73) < 0.01);
  assert.ok(Math.abs(customBasis("channel", { h: 100, b: 55, tw: 4.5, tf: 7.5, r: 10 }).kgPerMetre - 9.82) < 0.01);
  assert.ok(Math.abs(customBasis("channel", { h: 100, b: 50, tw: 6, tf: 8.5, r: NaN }).kgPerMetre - 10.58) < 0.01, "an empty optional radius counts as 0");
  assert.ok(Number.isNaN(customBasis("pipe", { D: 100 }).kgPerMetre), "a missing field gives no result");
});

test("default length: the catalog length (12 m beams/rebar, 6 m hollow/pipe), else 12 m (angles, channels)", () => {
  assert.equal(defaultLengthM(product("CTMPL-000002"), product("CTMPL-000002").variants[0]), 12);
  assert.equal(defaultLengthM(product("CTMPL-000011")), 6);
  assert.equal(defaultLengthM(product("CTMPL-000017")), 12);
  assert.equal(defaultLengthM(product("CTMPL-000018")), 12);
});

// --- conversions ----------------------------------------------------------------------

const bar = (kgPerMetre: number, lengthM = 12) => ({ linear: true, kgPerMetre, kgPerSquareMetre: NaN, pieceKg: null, lengthM });

test("pieces → kg → t: the home-page sample IPE 180 × 12 m × 20 = 4,512 kg", () => {
  const r = computeWeight({ ...bar(18.8), mode: "pieces", quantity: 20 })!;
  assert.equal(r.perUnit, 18.8);
  assert.ok(Math.abs(r.perPiece - 225.6) < 1e-9);
  assert.ok(Math.abs(r.totalKg - 4512) < 1e-9);
  assert.ok(Math.abs(r.totalTon - 4.512) < 1e-12);
  assert.equal(r.piecesWhole, 20);
});

test("kg/ton → pieces: exact count and whole pieces rounded up; an exact multiple is not bumped by float noise", () => {
  const r = computeWeight({ ...bar(18.8), mode: "kg", quantity: 1000 })!;
  assert.ok(Math.abs(r.pieces - 1000 / 225.6) < 1e-9);
  assert.equal(r.piecesWhole, 5);
  assert.equal(computeWeight({ ...bar(0.61654), mode: "kg", quantity: 0.61654 * 12 * 10 })!.piecesWhole, 10);
  const t = computeWeight({ ...bar(18.8), mode: "ton", quantity: 4.512 })!;
  assert.equal(t.totalKg, 4512);
  assert.equal(t.piecesWhole, 20);
});

test("plates: per sheet from the sheet weight, per m² shown, length ignored", () => {
  const r = computeWeight({ linear: false, kgPerMetre: NaN, kgPerSquareMetre: 78.5, pieceKg: 706.5, lengthM: NaN, mode: "pieces", quantity: 3 })!;
  assert.equal(r.perUnit, 78.5);
  assert.equal(r.totalKg, 2119.5);
});

test("invalid input gives no result (never a guessed figure)", () => {
  assert.equal(computeWeight({ ...bar(18.8), mode: "pieces", quantity: 2.5 }), null, "pieces must be whole");
  assert.equal(computeWeight({ ...bar(18.8), mode: "kg", quantity: 0 }), null);
  assert.equal(computeWeight({ ...bar(18.8), mode: "kg", quantity: NaN }), null);
  assert.equal(computeWeight({ ...bar(18.8, 0), mode: "pieces", quantity: 1 }), null);
  assert.equal(computeWeight({ ...bar(18.8, 101), mode: "pieces", quantity: 1 }), null, "bar longer than 100 m");
  assert.equal(computeWeight({ ...bar(NaN), mode: "pieces", quantity: 1 }), null);
});

// --- rounding / formatting ----------------------------------------------------------------

test("rounding is half away from zero, display only; decimals per figure as documented", () => {
  assert.equal(roundHalfAwayFromZero(1.005, 2), 1.01);
  assert.equal(roundHalfAwayFromZero(2.5, 0), 3);
  assert.equal(roundHalfAwayFromZero(-2.5, 0), -3);
  assert.equal(roundToThousand(123_456_500), 123_457_000);
  assert.deepEqual(DISPLAY_DECIMALS, { perMetre: 3, perPiece: 2, totalKg: 1, totalTon: 3, pieces: 2 });
});

test("Persian digits and separators on fa, Arabic-Indic on ar, ASCII on en — identical to Intl, without Intl", () => {
  assert.equal(formatNumber("fa", 4512, 1), "۴٬۵۱۲");
  assert.equal(formatNumber("fa", 0.61654, 3), "۰٫۶۱۷");
  assert.equal(formatNumber("fa", 1234567.891, 2), "۱٬۲۳۴٬۵۶۷٫۸۹");
  assert.equal(formatNumber("ar", 4512.25, 1), "٤٬٥١٢٫٣");
  assert.equal(formatNumber("en", 4512.25, 1), "4,512.3");
  assert.equal(formatNumber("en", NaN, 1), "—");
  for (const [locale, tag] of [["fa", "fa-IR"], ["ar", "ar-EG"], ["en", "en-US"]] as const) {
    for (const value of [0.395, 7.39845, 225.6, 4512, 1234567.891]) {
      assert.equal(formatNumber(locale, value, 2), new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(value), `${locale} ${value}`);
    }
  }
  assert.equal(formatInputValue("fa", 12), "۱۲");
  assert.equal(formatInputValue("fa", 6.5), "۶٫۵");
});

test("input parsing accepts Persian/Arabic digits, «٫» and «/» decimals, grouping marks; rejects anything else", () => {
  assert.equal(parseDecimalInput("۱۲"), 12);
  assert.equal(parseDecimalInput("٤٥٫٥"), 45.5);
  assert.equal(parseDecimalInput("۲/۵"), 2.5);
  assert.equal(parseDecimalInput("1,250"), 1250);
  assert.equal(parseDecimalInput(" 7.85 "), 7.85);
  for (const bad of ["", "abc", "1.2.3", "-5", "1e3", "12m"]) assert.ok(Number.isNaN(parseDecimalInput(bad)), bad);
});

// --- RFQ hand-off -------------------------------------------------------------------------

test("hand-off: rebar pieces travel as «شاخه», plates as «ورق», tonnes as typed, everything else as kg; parsed back by the contact form", () => {
  const rebar = computeWeight({ ...bar(0.61654), mode: "pieces", quantity: 100 })!;
  const href = rfqHandoffHref("fa", { variantXid: "CVAR-000001", groupCode: "REBAR", mode: "pieces", quantity: 100, result: rebar, lengthM: 12 });
  assert.equal(href, "/contact?variant=CVAR-000001&qty=100&unit=branch");
  assert.deepEqual(parseRfqRowPrefill(new URL(href, "https://x").searchParams, "REBAR"), { unit: "branch", quantityValue: "100" });

  const sheet = computeWeight({ linear: false, kgPerMetre: NaN, kgPerSquareMetre: 78.5, pieceKg: 706.5, lengthM: NaN, mode: "pieces", quantity: 3 })!;
  assert.equal(rfqHandoffHref("en", { variantXid: "CVAR-2", groupCode: "SHEET_PLATE", mode: "pieces", quantity: 3, result: sheet, lengthM: null }), "/en/contact?variant=CVAR-2&qty=3&unit=sheet");

  const beam = computeWeight({ ...bar(18.8), mode: "pieces", quantity: 20 })!;
  assert.equal(rfqHandoffHref("ar", { variantXid: "CVAR-3", groupCode: "BEAMS", mode: "pieces", quantity: 20, result: beam, lengthM: 12 }), "/ar/contact?variant=CVAR-3&qty=4512&unit=kg", "BEAMS has no piece unit → kg");

  const tons = computeWeight({ ...bar(18.8), mode: "ton", quantity: 4.5 })!;
  assert.equal(rfqHandoffHref("fa", { variantXid: "CVAR-3", groupCode: "BEAMS", mode: "ton", quantity: 4.5, result: tons, lengthM: 12 }), "/contact?variant=CVAR-3&qty=4.5&unit=ton");

  const angle = computeWeight({ ...bar(15, 6), mode: "kg", quantity: 912.34 })!;
  const angleHref = rfqHandoffHref("fa", { variantXid: "CVAR-4", groupCode: "ANGLE", mode: "kg", quantity: 912.34, result: angle, lengthM: 6 });
  assert.equal(angleHref, "/contact?variant=CVAR-4&qty=912.3&unit=kg&length=6000", "ANGLE/CHANNEL carry the bar length");
  assert.deepEqual(parseRfqRowPrefill(new URL(angleHref, "https://x").searchParams, "ANGLE"), { unit: "kg", quantityValue: "912.3", lengthMm: "6000" });
});

// --- optional price row (fa only) ------------------------------------------------------------

const SAMPLE_PRICE = { tomanPerKg: 42_300, factoryName: "کارخانه نمونه", deliveryLocation: "درب کارخانه", pricedAt: "2026-10-07T06:00:00Z" };

test("price: valid data gives Toman/kg + a Tehran-date label prepared on the server; invalid data gives nothing", () => {
  assert.deepEqual(toCalculatorPrice(SAMPLE_PRICE), { tomanPerKg: 42_300, datetime: "2026-10-07T06:00:00.000Z", dateLabel: "۱۵ مهر ۱۴۰۵", factory: "کارخانه نمونه" });
  assert.equal(toCalculatorPrice({ ...SAMPLE_PRICE, tomanPerKg: 0 }), null);
  assert.equal(toCalculatorPrice({ ...SAMPLE_PRICE, pricedAt: "x" }), null);
  assert.equal(toCalculatorPrice(null), null);
});

test("price: fa and ar (W9.4, owner decision change 2026-10-09); no prices → undefined, so the row is not rendered; en never", () => {
  assert.equal(toCalculatorPrices("fa", null), undefined);
  assert.equal(toCalculatorPrices("fa", {}), undefined);
  assert.equal(toCalculatorPrices("en", { "CVAR-1": SAMPLE_PRICE }), undefined);
  assert.deepEqual(Object.keys(toCalculatorPrices("ar", { "CVAR-1": SAMPLE_PRICE })!["CVAR-1"]).sort(), ["dateLabel", "tomanPerKg"], "ar: price only, no timestamp");
  assert.deepEqual(Object.keys(toCalculatorPrices("fa", { "CVAR-1": SAMPLE_PRICE, "CVAR-2": { ...SAMPLE_PRICE, factoryName: " " } })!), ["CVAR-1"]);
  assert.equal(estimateCostToman(4512, toCalculatorPrice(SAMPLE_PRICE)!), 190_858_000, "4,512 kg × 42,300 = 190,857,600 → nearest 1,000");
});

// --- copy -------------------------------------------------------------------------------------

test("copy: the required Persian strings, verbatim", () => {
  const fa = WEIGHT_CALCULATOR_COPY.fa;
  assert.equal(fa.source.catalog, "مقدار کاتالوگ");
  assert.equal(fa.basisTitle, "مبنای محاسبه");
  assert.equal(fa.rfqCta, "استعلام برای همین مقدار");
  assert.equal(`${fa.priceLabel.before}<تاریخ>${fa.priceLabel.after}`, "برآورد هزینه با قیمت <تاریخ>، شامل ارزش افزوده");
  assert.match(fa.priceDisclaimer, /برای قیمت روز استعلام بگیرید/);
});

test("copy: every locale has every key; en has no Arabic script; ar has no Persian-only letters or digits (leak scan)", () => {
  const flat = (value: unknown): string[] =>
    typeof value === "string" ? [value] : typeof value === "function" ? [String((value as (s: string) => string)("X"))] : value && typeof value === "object" ? Object.values(value).flatMap(flat) : [];
  const shape = (value: unknown): unknown => (value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value);
  for (const locale of locales) assert.deepEqual(shape(WEIGHT_CALCULATOR_COPY[locale]), shape(WEIGHT_CALCULATOR_COPY.fa), locale);
  const allowed = (s: string) => s.replace(/آهن آسا/g, "");
  for (const s of flat(WEIGHT_CALCULATOR_COPY.en)) assert.ok(!/[؀-ۿ]/.test(allowed(s)), `en: ${s}`);
  for (const s of flat(WEIGHT_CALCULATOR_COPY.ar)) assert.ok(!/[پچژگکی۰-۹]/.test(allowed(s)), `ar: ${s}`);
});

test("«مبنای محاسبه»: every shape has a basis line that names its standard; every cited standard has a title", () => {
  const standardOf = { rebar: "ISO 6935-2", plate: "EN 10029", hollow: "EN 10219-2", pipe: "ASME B36.10M", angle: "EN 10056-1", channel: "EN 10365", beam: "EN 10365" } as const;
  for (const locale of locales) for (const line of BASIS_LINES) assert.ok(WEIGHT_CALCULATOR_COPY[locale].basis[line].includes(standardOf[line]), `${locale} ${line}`);
  for (const s of Object.values(STANDARDS)) assert.ok(s.title.length > 10);
});

// --- page, publication, SEO ------------------------------------------------------------------

test("publication: one route, fa only (owner 2026-10-09: en/ar copy stays an unpublished draft), and the CTA's constant points at the same route", () => {
  assert.equal(WEIGHT_CALCULATOR_ROUTE, "/tools/weight-calculator");
  assert.deepEqual([...WEIGHT_CALCULATOR_LOCALES], ["fa"]);
  assert.equal(isWeightCalculatorPublished("en"), false);
  assert.equal(isWeightCalculatorPublished("ar"), false);
  assert.match(read("components/home/calculator-cta.tsx"), new RegExp(`WEIGHT_CALCULATOR_PATH = "${WEIGHT_CALCULATOR_ROUTE}"`));
});

test("page: static params, hreflang and sitemap all come from the published-locale list; index,follow via D6", () => {
  const page = code("app/[locale]/tools/weight-calculator/page.tsx");
  assert.match(page, /WEIGHT_CALCULATOR_LOCALES\.map\(\(locale\) => \(\{ locale \}\)\)/);
  assert.match(page, /languageAlternates: buildLanguageAlternatesFromEntries\(WEIGHT_CALCULATOR_LOCALES\.map/);
  assert.match(page, /indexable: publicPageIndexable\(\)/);
  assert.match(page, /path: WEIGHT_CALCULATOR_ROUTE/);
  assert.ok(!/generateLocaleStaticParams/.test(page), "never every locale unconditionally");
  const sitemap = code("app/sitemap.ts");
  assert.match(sitemap, /if \(WEIGHT_CALCULATOR_LOCALES\.includes\(locale\)\) entries\.push\(\{ url: url\(locale, WEIGHT_CALCULATOR_ROUTE\)/);
});

test("page: the calculator data is the product pages' published read; no live Odoo, no fetch; W9.4 wires the build-time price map", () => {
  const page = code("app/[locale]/tools/weight-calculator/page.tsx");
  assert.match(page, /listPublishedCatalogTemplates\(locale\)/);
  assert.match(page, /getPublishedCatalogTemplateBySlug\(locale, template\.seo\.slug\)/);
  assert.match(page, /prices = toCalculatorPrices\(locale, map \? Object\.fromEntries\(map\) : null\);/);
  const component = code("components/tools/weight-calculator.tsx");
  assert.ok(!/fetch\(|XMLHttpRequest|odoo/i.test(component), "client-side only, no request");
  assert.match(component, /^"use client";/);
});

test("component: labelled controls, one polite atomic live region, catalog badge, RFQ hand-off, fa/ar-only price row", () => {
  const component = code("components/tools/weight-calculator.tsx");
  for (const field of ["product", "size", "length", "quantity", "mode"]) {
    assert.match(component, new RegExp(`htmlFor=\\{label\\("${field}"\\)\\}`), `${field} label`);
    assert.match(component, new RegExp(`id=\\{label\\("${field}"\\)\\}`), `${field} control`);
  }
  assert.match(component, /htmlFor=\{label\(`dim-\$\{field\.key\}`\)\}/);
  assert.match(component, /aria-live="polite" aria-atomic="true"/);
  assert.match(component, /t\.source\[source\]/);
  assert.match(component, /rfqHandoffHref\(locale, \{ variantXid: variant\.xid/);
  assert.match(component, /const price = \(locale === "fa" \|\| locale === "ar"\) && variant && result \? prices\?\.\[variant\.xid\] : undefined;/);
  assert.match(component, /\{price\.datetime \? <time dateTime=\{price\.datetime\}>\{price\.dateLabel\}<\/time> : price\.dateLabel\}/);
  assert.match(component, /formatNumber\(locale/);
  assert.ok(!/Intl\./.test(component), "no ICU-dependent text in the prerendered HTML (hydration)");
  assert.match(component, /new URLSearchParams\(window\.location\.search\)\.get\("variant"\)/, "?variant= is read after hydration");
});

test("product pages: «محاسبه وزن» links preselect the variant, only where the calculator offers the size", () => {
  const table = code("components/products/variant-spec-table.tsx");
  assert.match(table, /calculate: "محاسبه وزن"/);
  assert.match(table, /href=\{`\$\{localizedPath\(locale, WEIGHT_CALCULATOR_ROUTE\)\}\?variant=\$\{encodeURIComponent\(variant\.xid\)\}`\}/);
  assert.match(table, /isWeightCalculatorPublished\(locale\) && shape !== undefined && resolveVariantBasis\(shape, variant\) !== null/);
});
