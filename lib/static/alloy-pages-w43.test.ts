import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ALLOY_CALCULATOR_PARAM, ALLOY_GRADE_SLUGS, ALLOY_GRADES, ALLOY_STEEL_ROUTE } from "../alloy/grades.ts";
import { alloyWeight, blockKg, discKg, flatKgPerMetre, hexKgPerMetre, plateKgPerSquareMetre, plateSheetKg, roundKgPerMetre, squareKgPerMetre } from "../alloy/weight.ts";
import { ALLOY_RFQ_PARAMS, ALLOY_RFQ_TITLES, alloyRfqHref, parseAlloyRfqPrefill } from "../alloy/rfq.ts";
import { ALLOY_CALCULATOR_COPY } from "../alloy/calculator-copy.ts";
import { ALLOY_FACTS, ALLOY_GRADE_COPY, ALLOY_STEEL_LOCALES, ALLOY_UI, alloyDensityLabel, alloyFaq, alloyGradePath, localizeNumbers } from "../content/alloy-steel.ts";
import { ALLOY_STEEL_NAV_LINK } from "../content/nav.ts";
import { addCustomItemToRows } from "../rfq/rfq-basket.ts";
import { createEmptyCatalogRow, MAX_ITEMS, type RfqRow } from "../rfq/item-row-validation.ts";
import { articleSchema, faqPageSchema } from "../seo/schema.ts";
import { JSONLD_ALLOWED_KEYS, JSONLD_ALLOWED_TYPES } from "./publication-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { PUBLIC_ON_FIRST_PUBLISH } from "../content-pipeline/variant-publication-allowlist.ts";
import { locales, type Locale } from "../../config/locales.ts";

/** W43 (owner 2026-10-24, W39 §9) — the alloy and tool steel hub, the 8 grade guides, the calculator's alloy section. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const fn = value as (...a: string[]) => unknown;
    return strings(fn("X", "1.2344", "7.80", "EN ISO 4957", "H13"));
  }
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const languageFindings = (locale: "en" | "ar", texts: string[]) =>
  scanPublicFile(`${locale}/w43-copy.html`, `<p>${texts.join(" | ")}</p>`).filter((f) => f.kind === "persian_on_ar" || f.kind === "persian_on_en");

const EN_PRICE_WORDS = /\b(price|prices|priced|pricing|toman|rial|irr|usd|\$|cost)\b/i;
const PRICE_TITLE = /قیمت|سعر|أسعار/;
const DIGIT_AMOUNT = /[0-9۰-۹٠-٩]{1,3}([,٬،][0-9۰-۹٠-٩]{3})+/;
const CURRENCY = /تومان|ریال|ريال|Toman|Rial|USD|\$|دينار|دولار|درهم/;

const copyOf = (locale: Locale) => [...strings(ALLOY_UI[locale]), ...ALLOY_GRADE_SLUGS.flatMap((s) => strings(ALLOY_GRADE_COPY[s][locale])), ...strings(ALLOY_CALCULATOR_COPY[locale]), ...ALLOY_GRADE_SLUGS.map((s) => ALLOY_RFQ_TITLES[s][locale])];

test("the wave-1 set: 8 grades (D-ALLOY-1), fa/en/ar, slugs of W39 §6.2, grade densities of W39 §3.1", () => {
  assert.deepEqual([...ALLOY_GRADE_SLUGS], ["ck45", "mo40-42crmo4", "vcn150-34crnimo6", "semante-16mncr5", "1-2312", "1-2344-h13", "spk-1-2080", "1-2510-amutit"]);
  assert.deepEqual([...ALLOY_STEEL_LOCALES], ["fa", "en", "ar"]);
  assert.deepEqual(ALLOY_GRADE_SLUGS.map((s) => ALLOY_GRADES[s].wnr), ["1.1191", "1.7225", "1.6582", "1.7131", "1.2312", "1.2344", "1.2080", "1.2510"]);
  assert.deepEqual(ALLOY_GRADE_SLUGS.map((s) => ALLOY_GRADES[s].density), [7.85, 7.85, 7.85, 7.85, 7.85, 7.8, 7.7, 7.85]);
  assert.equal(ALLOY_STEEL_ROUTE, "/alloy-steel");
  assert.equal(alloyGradePath("1-2344-h13"), "/alloy-steel/1-2344-h13");
  for (const s of ALLOY_GRADE_SLUGS) {
    const f = ALLOY_FACTS[s];
    assert.ok(f.chemistry.length >= 4 && f.forms.length >= 1, s);
    assert.ok(f.related.length >= 2 && f.related.every((r) => r !== s && ALLOY_GRADE_SLUGS.includes(r)), `${s}: related grades`);
    assert.ok(Object.values(f.weights).some((w) => w && w.length > 0), `${s}: a weight table`);
  }
});

test("titles and metas: W39 §7 wording, ≤ 60 characters, unique, market name then W.Nr; never a price word, amount or currency", () => {
  for (const locale of ALLOY_STEEL_LOCALES) {
    const ui = ALLOY_UI[locale];
    const pages = [{ title: ui.hubTitle, description: ui.hubDescription }, ...ALLOY_GRADE_SLUGS.map((s) => ALLOY_GRADE_COPY[s][locale])];
    for (const key of ["title", "description"] as const) assert.equal(new Set(pages.map((p) => p[key])).size, pages.length, `${locale} ${key} unique`);
    for (const p of pages) {
      assert.ok(p.title.length <= 60, `${locale} title ≤ 60 (${p.title.length}): ${p.title}`);
      assert.ok(p.description.length >= 100 && p.description.length <= 170, `${locale} meta 100–170 (${p.description.length}): ${p.description}`);
      for (const h of [p.title, p.description]) {
        assert.ok(!PRICE_TITLE.test(h) && !EN_PRICE_WORDS.test(h), `${locale}: no price word in a title/meta: ${h}`);
        assert.ok(!DIGIT_AMOUNT.test(h) && !CURRENCY.test(h), `${locale}: no amount/currency: ${h}`);
      }
    }
    for (const s of ALLOY_GRADE_SLUGS) {
      const c = ALLOY_GRADE_COPY[s][locale];
      const g = ALLOY_GRADES[s];
      assert.ok(c.title.includes(g.wnr) || c.title.includes(g.wnr.slice(2)), `${locale}/${s}: the title carries the W.Nr`);
      assert.ok(c.h1.includes(g.wnr), `${locale}/${s}: the H1 is market name + W.Nr`);
    }
  }
  // fa: market name first (W39 §7 table), exactly as approved.
  assert.equal(ALLOY_GRADE_COPY["semante-16mncr5"].fa.title, "فولاد سمانته 7131 (16MnCr5): مشخصات و استعلام خرید", "a one-token parenthetical gets no mark");
  assert.equal(ALLOY_GRADE_COPY["mo40-42crmo4"].fa.h1, "فولاد MO40 \u2066(1.7225 / 42CrMo4)\u2069", "RTL: a left-to-right isolate keeps (1.7225 / 42CrMo4) in order");
  assert.equal(ALLOY_GRADE_COPY["mo40-42crmo4"].en.h1, "MO40 steel (1.7225 / 42CrMo4)");
  assert.equal(ALLOY_GRADE_COPY["1-2344-h13"].fa.title, "فولاد گرمکار 2344 (H13): مشخصات، سختی و استعلام");
  assert.equal(ALLOY_UI.fa.hubTitle, "فولاد آلیاژی و ابزار: مشخصات گریدها و استعلام خرید");
});

test("copy: no amount or currency anywhere; en never says price; ar Arabic-only and en Latin-only (the leak scan's rule)", () => {
  for (const locale of locales) {
    const all = copyOf(locale);
    assert.ok(!all.some((s) => DIGIT_AMOUNT.test(s) || CURRENCY.test(s)), `${locale}: no amount or currency`);
  }
  assert.ok(!copyOf("en").some((s) => EN_PRICE_WORDS.test(s)), "en copy never says price");
  assert.deepEqual(languageFindings("ar", copyOf("ar")), []);
  assert.deepEqual(languageFindings("en", copyOf("en")), []);
  // No mill, origin country or supplier claim (W39 §6.2: names of mills stay out of the guides).
  for (const locale of locales) assert.ok(!copyOf(locale).some((s) => /یزد|اسفراین|اکسین|Yazd|Esfarayen|Oxin|يزد|چین|آلمان|China|Germany|الصين|ألمانيا/.test(s)), `${locale}: no mill or origin`);
});

test("weight formulas at the grade's density (W39 §3.5)", () => {
  const close = (a: number, b: number, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
  close(roundKgPerMetre(7.85, 50), 15.41, 0.01); // W39: Ø50 → 15.41 kg/m
  close(roundKgPerMetre(7.85, 1), 0.006165, 1e-6);
  close(squareKgPerMetre(7.85, 10), 0.785);
  close(flatKgPerMetre(7.85, 100, 10), 7.85);
  close(hexKgPerMetre(7.85, 10), 0.6798, 1e-4);
  close(plateKgPerSquareMetre(7.7, 10), 77);
  close(plateSheetKg(7.85, 10, 2, 6), 942);
  close(blockKg(7.8, 100, 100, 100), 7.8);
  close(discKg(7.85, 100, 10), 0.6165, 1e-4);
  // Density matters: D3 (7.70) is 1.9 % lighter than at 7.85 (W39 §3.5).
  close(roundKgPerMetre(7.7, 100) / roundKgPerMetre(7.85, 100), 7.7 / 7.85, 1e-9);
  for (const v of [roundKgPerMetre(7.85, 0), flatKgPerMetre(7.85, -1, 2), discKg(NaN, 10, 10), plateSheetKg(7.85, 10, 0, 6)]) assert.ok(Number.isNaN(v));
  const bar = alloyWeight("round", 7.8, { d: 100 }, 3);
  close(bar.pieceKg, bar.perUnit * 3);
  assert.ok(Number.isNaN(alloyWeight("block", 7.8, { l: 1, w: 1, h: 1 }, 1).perUnit), "a block has no per-metre weight");
});

test("density shown: every guide's weight note and the calculator say which density they use", () => {
  assert.equal(alloyDensityLabel("fa", "spk-1-2080"), "۷٫۷۰");
  assert.equal(alloyDensityLabel("en", "1-2344-h13"), "7.80");
  assert.equal(alloyDensityLabel("ar", "ck45"), "٧٫٨٥");
  assert.ok(ALLOY_UI.fa.weightNote("۷٫۸۰", "1.2344").includes("۷٫۸۰") && ALLOY_UI.fa.weightNote("۷٫۸۰", "1.2344").includes("1.2344"));
  for (const l of locales) assert.ok(ALLOY_CALCULATOR_COPY[l].densityUsed("7.70", "1.2080").includes("7.70"));
  assert.equal(localizeNumbers("fa", "Ø 8–630 mm"), "Ø ۸–۶۳۰ mm");
  assert.equal(localizeNumbers("ar", "0.42–0.50"), "٠٫٤٢–٠٫٥٠");
  const calc = read("components/tools/alloy-weight-calculator.tsx");
  assert.match(calc, /t\.densityUsed\(localizeNumbers\(locale, grade\.density\.toFixed\(2\)\), grade\.wnr\)/);
  assert.match(calc, /get\(ALLOY_CALCULATOR_PARAM\)/, "?grade=<slug> preselects the grade");
  assert.equal(ALLOY_CALCULATOR_PARAM, "grade");
  const page = read("app/[locale]/tools/weight-calculator/page.tsx");
  assert.match(page, /<section id=\{ALLOY_CALCULATOR_ANCHOR\}/);
  assert.match(page, /<AlloyWeightCalculator locale=\{locale\} \/>/);
  assert.match(read("components/alloy/alloy-parts.tsx"), /t\.weightNote\(alloyDensityLabel\(locale, slug\), ALLOY_GRADES\[slug\]\.wnr\)/);
});

test("RFQ: ?alloy=<slug> opens a custom row with the grade's fixed title; spec and kg/ton quantity validated", () => {
  for (const s of ALLOY_GRADE_SLUGS) for (const l of locales) assert.ok(ALLOY_RFQ_TITLES[s][l].length <= 160 && ALLOY_RFQ_TITLES[s][l].includes(ALLOY_GRADES[s].wnr));
  const href = alloyRfqHref("en", "1-2344-h13", { spec: "Ø 50 mm × 6 m", quantity: 92.4, unit: "kg" });
  assert.ok(href.startsWith("/en/contact?"));
  const query = new URLSearchParams(href.split("?")[1]);
  assert.deepEqual(parseAlloyRfqPrefill(query, "fa"), { slug: "1-2344-h13", productTitle: "فولاد گرمکار 2344 \u2066(1.2344 / H13)\u2069", sizeSpec: "Ø 50 mm × 6 m", quantityValue: "92.4", unit: "kg" });
  assert.equal(alloyRfqHref("fa", "ck45"), "/contact?alloy=ck45");
  assert.equal(parseAlloyRfqPrefill(new URLSearchParams("alloy=nope"), "fa"), null);
  assert.deepEqual(parseAlloyRfqPrefill(new URLSearchParams("alloy=ck45&spec=<script>&qty=3&unit=branch"), "ar"), { slug: "ck45", productTitle: ALLOY_RFQ_TITLES.ck45.ar, sizeSpec: "" }, "markup spec and a non-custom unit are dropped");
  assert.equal(parseAlloyRfqPrefill(new URLSearchParams(`alloy=ck45&spec=${"9".repeat(101)}`), "fa")?.sizeSpec, "", "spec ≤ 100 characters");
  assert.deepEqual(Object.values(ALLOY_RFQ_PARAMS), ["alloy", "spec"]);
  const form = read("components/contact/static-enquiry-form.tsx");
  assert.match(form, /const HANDOFF_PARAMS = \["variant", \.\.\.Object\.values\(RFQ_PREFILL_PARAMS\), \.\.\.Object\.values\(ALLOY_RFQ_PARAMS\)\];/);
  assert.match(form, /const alloy = variantXid \? null : parseAlloyRfqPrefill\(query, locale\);/);
});

test("addCustomItemToRows: replaces the blank start row, never duplicates a title, fills only empty fields, stops at MAX_ITEMS", () => {
  const item = { productTitle: "فولاد CK45 (1.1191 / C45E)", sizeSpec: "Ø 40 mm × 6 m", quantityValue: "500", unit: "kg" as const };
  const first = addCustomItemToRows([createEmptyCatalogRow()], item);
  assert.equal(first.outcome, "added");
  assert.equal(first.rows.length, 1);
  assert.deepEqual({ ...first.rows[0].fields }, { mode: "custom", productTitle: item.productTitle, sizeSpec: item.sizeSpec, quantityValue: "500", unit: "kg", notes: "" });
  const typed: RfqRow[] = [{ ...first.rows[0], fields: { ...first.rows[0].fields, sizeSpec: "visitor's size" } as RfqRow["fields"] }];
  const again = addCustomItemToRows(typed, { ...item, sizeSpec: "other" });
  assert.equal(again.outcome, "existing");
  assert.equal(again.rows.length, 1);
  assert.equal((again.rows[0].fields as { sizeSpec: string }).sizeSpec, "visitor's size", "what the visitor typed is kept");
  const full: RfqRow[] = Array.from({ length: MAX_ITEMS }, (_, i) => ({ id: `r${i}`, fields: { mode: "custom", productTitle: `p${i}`, sizeSpec: "", quantityValue: "1", unit: "kg", notes: "" } }));
  assert.equal(addCustomItemToRows(full, item).outcome, "full");
});

test("JSON-LD: Article + FAQPage on every guide (types/keys on the publication gate's allowlist), BreadcrumbList from the hero", () => {
  const node = articleSchema({ url: "https://www.ahanassa.com/alloy-steel/ck45", headline: "h", description: "d", inLanguage: "fa-IR", datePublished: "2026-10-24", dateModified: "2026-10-24" });
  const keys = (v: unknown): string[] => (v && typeof v === "object" ? Object.entries(v).flatMap(([k, c]) => [k, ...keys(c)]) : []);
  assert.ok(JSONLD_ALLOWED_TYPES.has("Article"));
  for (const k of keys(node)) assert.ok(JSONLD_ALLOWED_KEYS.has(k), `JSON-LD key ${k} allowed`);
  for (const l of locales)
    for (const s of ALLOY_GRADE_SLUGS) {
      const faq = alloyFaq(l, s);
      assert.equal(faq.length, 5);
      assert.equal(faqPageSchema(faq)?.mainEntity.length, 5, `${l}/${s}: every visible FAQ item is in FAQPage (no currency words)`);
    }
  const guide = read("app/[locale]/alloy-steel/[grade]/page.tsx");
  assert.match(guide, /articleSchema\(\{ url, headline: c\.h1/);
  assert.match(guide, /faqPageSchema\(faq\)/);
  assert.match(guide, /async function GuideContent\([^)]*\) \{\s*await Promise\.resolve\(\);/, "own Flight row (r4)");
  assert.match(guide, /breadcrumb=\{\[/, "PageHero emits the BreadcrumbList");
  assert.ok(!guide.includes("www.ahanassa") && !read("app/[locale]/alloy-steel/page.tsx").includes("www.ahanassa"), "URLs from siteConfig only (SEO host lock)");
});

test("pages: RFQ banner on hub and guides, no price code; sitemap, llms.txt and the menu/footer/index links (fa/en/ar)", () => {
  const hub = read("app/[locale]/alloy-steel/page.tsx");
  const guide = read("app/[locale]/alloy-steel/[grade]/page.tsx");
  assert.match(hub, /<AlloyRfqBanner locale=\{locale\} \/>/);
  assert.match(guide, /<AlloyRfqBanner locale=\{locale\} slug=\{slug\} \/>/);
  for (const f of ["app/[locale]/alloy-steel/page.tsx", "app/[locale]/alloy-steel/[grade]/page.tsx", "components/alloy/alloy-parts.tsx", "components/tools/alloy-weight-calculator.tsx"]) {
    assert.ok(!/pricing|PriceCell|PRICE_CELL|listAllPublishedPrices|tomanPerKg|offers/.test(read(f)), `${f}: no price code`);
  }
  assert.match(read("app/sitemap.ts"), /if \(ALLOY_STEEL_LOCALES\.includes\(locale\)\) for \(const path of \[ALLOY_STEEL_ROUTE, \.\.\.ALLOY_GRADE_SLUGS\.map\(alloyGradePath\)\]\) entries\.push\(fixedLocaleEntry\(locale, path, ALLOY_STEEL_LOCALES\)\);/);
  assert.match(read("lib/static/llms-txt.ts"), /section\("Alloy and tool steel \(quote on request only\)"/);
  assert.equal(ALLOY_STEEL_NAV_LINK.path, ALLOY_STEEL_ROUTE);
  assert.deepEqual(ALLOY_STEEL_NAV_LINK.label, { fa: "فولاد آلیاژی و ابزار", en: "Alloy & tool steel", ar: "الفولاذ السبائكي وفولاذ العدد" });
  assert.match(read("components/layout/SiteFooter.tsx"), /localizedPath\(locale, ALLOY_STEEL_NAV_LINK\.path\)/);
  assert.match(read("components/layout/SiteHeader.tsx"), /extraLink=\{link\.path === "\/products" \? \{ href: localizedPath\(locale, ALLOY_STEEL_NAV_LINK\.path\)/);
  assert.match(read("components/layout/mobile-nav-drawer.tsx"), /\{key === "products" && \(/);
  assert.match(read("components/products/products-listing.tsx"), /ALLOY_STEEL_NAV_LINK\.path/);
  // The client header/drawer/calculator never pull the guide copy into the browser bundle.
  for (const f of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/header-nav-disclosure.tsx", "components/tools/alloy-weight-calculator.tsx", "components/contact/static-enquiry-form.tsx", "lib/content/nav.ts", "lib/alloy/rfq.ts"]) {
    assert.ok(!read(f).includes("content/alloy-steel"), `${f}: no import of lib/content/alloy-steel`);
  }
});

test("wave-1 SKUs are NOT on the public-on-first-publish list yet (Odoo W42 not deployed; TODO in the allowlist)", () => {
  assert.ok(!PUBLIC_ON_FIRST_PUBLISH.some((v) => v.sku.startsWith("AA-AT-")));
  assert.match(read("lib/content-pipeline/variant-publication-allowlist.ts"), /TODO\(W43 → after Odoo W42 is deployed\)/);
});
