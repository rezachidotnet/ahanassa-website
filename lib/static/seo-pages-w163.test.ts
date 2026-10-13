import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkIndexingPolicy, neutralRoute, PRODUCTION_ROBOTS_TXT } from "./indexing-gate.ts";
import { buildHeadersFile, buildRedirectsFile, renderSitemapXml, unpublishedExportRedirects } from "./static-rules.ts";
import { STATIC_TARGETS } from "./targets.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { isNoindexPage, PRODUCTION_NOINDEX_PAGES, STATIC_PUBLIC_PATHS } from "../seo/indexing-policy.ts";
import { byTitleDemand, groupByMill, groupBySize, millAnchorId, PRICE_HUB_CATEGORY_CODES, PRICE_HUB_FAMILY_COPY, PRICE_HUB_PAGE_COPY, priceHubPath, publishedHubFamilies, sizeAnchorId } from "../pricing/price-hubs.ts";
import { PRICE_PAGE_COPY } from "../pricing/price-page.ts";
import { CATEGORY_LINK_COPY, CATEGORY_SEO, categorySeo } from "../content/category-seo.ts";
import { RAW_MATERIAL_LOCALES, RAW_MATERIAL_SLUGS, RAW_MATERIALS, RAW_MATERIALS_UI } from "../content/raw-materials.ts";
import { EXPORT_COPY, EXPORT_LOCALES } from "../content/export.ts";
import { WEIGHT_CALCULATOR_COPY } from "../weight-calculator/copy.ts";
import { titleBrand } from "../metadata/site.ts";
import { locales, type Locale } from "../../config/locales.ts";

/** W16.3 (D-SEO) — the SEO page set: hubs, category copy, raw materials, export, titles, noindex. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");

/** Every string inside a (nested) copy value. */
function strings(value: unknown, sample = "{d}"): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const fn = value as (...a: unknown[]) => unknown;
    // Copy functions take (date, name) strings or a list of names; try both shapes.
    try {
      return strings(fn(sample, sample));
    } catch {
      return strings(fn([sample, sample], [sample, sample]));
    }
  }
  if (Array.isArray(value)) return value.flatMap((v) => strings(v, sample));
  if (value && typeof value === "object") return Object.values(value).flatMap((v) => strings(v, sample));
  return [];
}

/** The leak scan's own language rule: ar copy must not contain Persian-only letters/digits, en copy no Arabic script. */
function languageFindings(locale: "en" | "ar", texts: string[]) {
  return scanPublicFile(`${locale}/w163-copy.html`, `<p>${texts.join(" | ")}</p>`).filter((f) => f.kind === "persian_on_ar" || f.kind === "persian_on_en");
}

/** Words that would put a price on an en page or in a raw-material title/meta. */
const EN_PRICE_WORDS = /\b(price|prices|priced|pricing|toman|rial|irr|usd|\$|cost)\b/i;
const FA_PRICE_TITLE = /قیمت/;
const AR_PRICE_TITLE = /سعر|أسعار/;
const DIGIT_AMOUNT = /[0-9۰-۹٠-٩]{1,3}([,٬،][0-9۰-۹٠-٩]{3})+/;

// --- price hubs ---------------------------------------------------------------------------------------

test("hub paths and anchors: one segment rule, readable size ids, fa mill ids", () => {
  assert.equal(priceHubPath("REBAR"), "/prices/rebar");
  assert.equal(priceHubPath("BOX_SECTION"), "/prices/box-section");
  assert.equal(priceHubPath("SHEET_PLATE"), "/prices/sheet-plate");
  assert.equal(sizeAnchorId("Ø16"), "size-16");
  assert.equal(sizeAnchorId("IPE 140"), "size-ipe-140");
  assert.equal(sizeAnchorId("10×1500×6000"), "size-10x1500x6000");
  assert.equal(sizeAnchorId("100X100X10"), "size-100x100x10");
  assert.equal(millAnchorId("کارخانه آزمایشی الف"), "mill-کارخانه-آزمایشی-الف");
});

const row = (xid: string, familyCode: string, size: string, factory: string | null) => ({ xid, familyCode, size, factory });

test("hubs: a family is published only on a day it has rows; grouping keeps table order; ar has no mill groups", () => {
  const rows = [row("1", "REBAR", "Ø10", "الف"), row("2", "REBAR", "Ø12", "ب"), row("3", "REBAR", "Ø10", "ب"), row("4", "BEAM", "IPE 140", "ج"), row("5", "other", "x", "ج")];
  assert.deepEqual(publishedHubFamilies(rows), ["REBAR", "BEAM"], "catalog order, no hub for an unknown family, none for a family without rows");
  assert.deepEqual(publishedHubFamilies([]), []);
  assert.deepEqual(byTitleDemand(["REBAR", "BEAM", "ANGLE", "SHEET_PLATE"]), ["REBAR", "BEAM", "SHEET_PLATE", "ANGLE"], "the /prices title names the high-demand families first");
  const rebar = rows.filter((r) => r.familyCode === "REBAR");
  assert.deepEqual(
    groupBySize(rebar).map((g) => [g.id, g.rows.map((r) => r.xid)]),
    [
      ["size-10", ["1", "3"]],
      ["size-12", ["2"]],
    ],
  );
  assert.deepEqual(
    groupByMill(rebar).map((g) => [g.key, g.rows.map((r) => r.xid)]),
    [
      ["الف", ["1"]],
      ["ب", ["2", "3"]],
    ],
  );
  assert.deepEqual(groupByMill(rebar.map((r) => ({ ...r, factory: null }))), [], "ar rows carry no factory: no mill section");
  assert.deepEqual(
    groupBySize([row("a", "BEAM", "IPE 140", null), row("b", "BEAM", "ipe-140", null)]).map((g) => g.id),
    ["size-ipe-140", "size-ipe-140-2"],
    "ids stay unique",
  );
  assert.deepEqual(
    groupBySize([row("a", "REBAR", "Ø12", null), row("b", "REBAR", "Ø8", null), row("c", "REBAR", "Ø10", null)]).map((g) => g.key),
    ["Ø8", "Ø10", "Ø12"],
    "natural size order, whatever the template order",
  );
});

test("hub copy: every hub family has fa and ar copy; titles carry the date; ar is Arabic-only and never names a mill", () => {
  for (const code of PRICE_HUB_CATEGORY_CODES) {
    for (const locale of ["fa", "ar"] as const) {
      const c = PRICE_HUB_FAMILY_COPY[code][locale];
      assert.ok(c.title("DATE").includes("DATE") && c.h1("DATE").includes("DATE"), `${code}/${locale} dated`);
      assert.ok(c.metaDescription.length >= 100 && c.metaDescription.length <= 170, `${code}/${locale} meta length ${c.metaDescription.length}`);
    }
  }
  const ar = [...strings(Object.values(PRICE_HUB_FAMILY_COPY).map((c) => c.ar)), ...strings(PRICE_HUB_PAGE_COPY.ar, "حديد التسليح")];
  assert.deepEqual(languageFindings("ar", ar), []);
  assert.ok(!ar.some((s) => /مصنع|معمل|موقع التسليم/.test(s)), "ar never mentions a factory or a delivery location");
  assert.deepEqual(languageFindings("ar", strings(PRICE_PAGE_COPY.ar, "١ أكتوبر")), []);
});

test("hub route: fa/ar only, from the published-family list, own Flight row for the price markup, no JSON-LD", () => {
  const route = read("app/[locale]/prices/[family]/page.tsx");
  assert.match(route, /if \(!isLocale\(params\.locale\) \|\| !isPriceLocale\(params\.locale\)\) return \[\];/);
  assert.match(route, /listPublishedHubFamilies\(params\.locale\)\)\.map\(\(family\) => \(\{ family: priceHubSegment\(family\) \}\)\)/);
  assert.match(route, /async function HubContent\([^)]*\) \{\s*await Promise\.resolve\(\);/, "own Flight row (r4)");
  assert.ok(!/JsonLd|offers|priceCurrency/.test(route), "no JSON-LD (prices never in JSON-LD; schema work is PR #47)");
  assert.match(route, /locale === "fa" \? groupByMill\(rows\) : \[\]/, "mill sections on fa only");
  assert.match(read("components/prices/hub-price-table.tsx"), /\[PRICE_CELL_ATTRIBUTE\]: row\.xid/, "every price is a gated price cell");
  const prices = read("app/[locale]/prices/page.tsx");
  assert.match(prices, /async function FamilyHubLinks\([^)]*\) \{\s*await Promise\.resolve\(\);/);
  assert.match(prices, /<h2 id="price-table-title"/);
});

// --- category pages -----------------------------------------------------------------------------------

test("category copy: all 7 categories × 3 locales, unique titles/H1/metas (the 21 duplicates fixed)", () => {
  const codes = ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE"];
  assert.deepEqual(Object.keys(CATEGORY_SEO).sort(), [...codes].sort());
  for (const locale of locales) {
    for (const priced of [false, true]) {
      const pages = codes.map((c) => categorySeo(c, locale, priced)!);
      for (const key of ["title", "h1", "description", "intro"] as const) assert.equal(new Set(pages.map((p) => p[key])).size, codes.length, `${locale} ${key} unique (priced=${priced})`);
      for (const p of pages) {
        assert.ok(p.title.length <= 60, `${locale} title ≤ 60: ${p.title}`);
        assert.ok(p.description.length >= 100 && p.description.length <= 170, `${locale} meta 100–170 (${p.description.length}): ${p.description}`);
        const words = p.intro.split(/\s+/).length;
        assert.ok(words >= 50 && words <= 130, `${locale} intro ${words} words`);
      }
    }
  }
  assert.equal(categorySeo("UNKNOWN", "fa", true), null, "a category without copy keeps the generic listing copy");
});

test("category copy: «قیمت روز» only on a priced day (fa); en never a price word; ar Arabic-only", () => {
  for (const code of Object.keys(CATEGORY_SEO)) {
    const unpriced = categorySeo(code, "fa", false)!;
    assert.ok(!/قیمت روز/.test(unpriced.title + unpriced.description + unpriced.intro), `${code}: no «قیمت روز» without prices`);
    assert.match(categorySeo(code, "fa", true)!.title, /قیمت روز/);
    for (const priced of [false, true]) {
      const en = categorySeo(code, "en", priced)!;
      assert.ok(!EN_PRICE_WORDS.test(`${en.title} ${en.description} ${en.intro}`), `${code}: en without price words`);
      assert.equal(categorySeo(code, "ar", priced)!.title, categorySeo(code, "ar", !priced)!.title, "ar title never depends on prices");
    }
  }
  assert.deepEqual(languageFindings("ar", strings(Object.values(CATEGORY_SEO).map((c) => c.ar))), []);
  assert.deepEqual(languageFindings("ar", strings(CATEGORY_LINK_COPY.ar, "x")), []);
  assert.deepEqual(languageFindings("en", strings(Object.values(CATEGORY_SEO).map((c) => c.en))), []);
  assert.ok(CATEGORY_SEO.REBAR.ar.title.includes("الشيش") && CATEGORY_SEO.BEAM.ar.title.includes("الشيلمان"), "Iraqi trade words (keyword map §3.5)");
});

test("category page: own title/meta/H1/intro; the products-index body is no longer every category's meta", () => {
  const page = read("app/[locale]/products/category/[category]/page.tsx");
  assert.match(page, /title: seo\?\.title \?\? /);
  assert.match(page, /description: seo\?\.description \?\? t\.body/);
  assert.match(page, /hero=\{\{ title: seo\.h1 \}\}/);
  assert.match(page, /async function CategoryIntro\([^)]*\) \{\s*await Promise\.resolve\(\);/, "price-dependent links in their own Flight row");
});

// --- raw materials and export -------------------------------------------------------------------------

test("raw materials: 4 materials × 3 locales; never a price, an amount or «قیمت» in a title or meta; RFQ-only banner", () => {
  assert.deepEqual([...RAW_MATERIAL_SLUGS], ["billet", "dri", "iron-ore", "briquette"]);
  assert.deepEqual([...RAW_MATERIAL_LOCALES], ["fa", "en", "ar"]);
  for (const locale of RAW_MATERIAL_LOCALES) {
    const ui = RAW_MATERIALS_UI[locale];
    const heads = [ui.hubTitle, ui.hubDescription, ...RAW_MATERIAL_SLUGS.flatMap((s) => [RAW_MATERIALS[s][locale].title, RAW_MATERIALS[s][locale].description])];
    for (const h of heads) {
      assert.ok(!FA_PRICE_TITLE.test(h) && !AR_PRICE_TITLE.test(h) && !EN_PRICE_WORDS.test(h), `${locale}: no price word in a title/meta: ${h}`);
      assert.ok(!DIGIT_AMOUNT.test(h), `${locale}: no amount: ${h}`);
    }
    const all = [...strings(ui), ...RAW_MATERIAL_SLUGS.flatMap((s) => strings(RAW_MATERIALS[s][locale]))];
    assert.ok(!all.some((s) => DIGIT_AMOUNT.test(s) || /تومان|ریال|Toman|Rial|USD|\$|دينار|دولار/.test(s)), `${locale}: no amount or currency anywhere`);
    assert.ok(ui.bannerTitle && ui.bannerBody && ui.cta);
  }
  assert.ok(!strings(RAW_MATERIALS_UI.en).some((s) => EN_PRICE_WORDS.test(s)), "en raw-material copy never says price");
  assert.deepEqual(languageFindings("ar", [...strings(RAW_MATERIALS_UI.ar), ...RAW_MATERIAL_SLUGS.flatMap((s) => strings(RAW_MATERIALS[s].ar))]), []);
  assert.deepEqual(languageFindings("en", [...strings(RAW_MATERIALS_UI.en), ...RAW_MATERIAL_SLUGS.flatMap((s) => strings(RAW_MATERIALS[s].en))]), []);
  const page = read("app/[locale]/raw-materials/[material]/page.tsx");
  assert.match(page, /<RfqOnlyBanner locale=\{locale\} \/>/);
  assert.match(read("app/[locale]/raw-materials/page.tsx"), /<RfqOnlyBanner locale=\{locale\} \/>/);
  for (const f of ["app/[locale]/raw-materials/page.tsx", "app/[locale]/raw-materials/[material]/page.tsx", "components/raw-materials/rfq-only-banner.tsx"]) {
    assert.ok(!/pricing|PriceCell|PRICE_CELL|listAllPublishedPrices|tomanPerKg/.test(read(f)), `${f}: no price code`);
  }
});

test("export: en and ar only, no price on either, ar uses the Iraqi trade words; fa redirects", () => {
  assert.deepEqual([...EXPORT_LOCALES], ["en", "ar"]);
  assert.ok(!strings(EXPORT_COPY.en).some((s) => EN_PRICE_WORDS.test(s)), "en: no price words");
  assert.ok(!strings(EXPORT_COPY).some((s) => DIGIT_AMOUNT.test(s) || /تومان|Toman|USD|\$|دينار/.test(s.replace("بالتومان", ""))), "no amount or currency");
  const ar = strings(EXPORT_COPY.ar);
  assert.deepEqual(languageFindings("ar", ar), []);
  assert.deepEqual(languageFindings("en", strings(EXPORT_COPY.en)), []);
  for (const word of ["الشيش", "الشيلمان", "الصاج", "العلب", "البليت"]) assert.ok(ar.some((s) => s.includes(word)), word);
  assert.deepEqual(unpublishedExportRedirects(), ["/export / 302"]);
  assert.ok(buildRedirectsFile().split("\n").includes("/export / 302"));
  const page = read("app/[locale]/export/page.tsx");
  assert.ok(!/PriceCell|PRICE_CELL|listAllPublishedPrices|loadPriceTableRows/.test(page), "the page shows no price");
});

// --- calculator, titles, noindex ----------------------------------------------------------------------

test("calculator en/ar: published titles per keyword map §7.5; en/ar copy language-clean", () => {
  assert.equal(WEIGHT_CALCULATOR_COPY.fa.metaTitle, "محاسبه وزن آهن‌آلات: میلگرد، تیرآهن، ورق، قوطی");
  assert.equal(WEIGHT_CALCULATOR_COPY.en.metaTitle, "Steel Weight Calculator (kg) — Rebar, IPE, Plate");
  assert.equal(WEIGHT_CALCULATOR_COPY.ar.metaTitle, "حساب وزن الحديد: التسليح، الشيلمان، الصاج");
  assert.ok(!EN_PRICE_WORDS.test(WEIGHT_CALCULATOR_COPY.en.metaTitle + WEIGHT_CALCULATOR_COPY.en.metaDescription));
  assert.deepEqual(languageFindings("ar", [WEIGHT_CALCULATOR_COPY.ar.metaTitle, WEIGHT_CALCULATOR_COPY.ar.metaDescription]), []);
});

test("titles: en suffix is the Latin brand; the home titles are absolute (no repeated brand)", () => {
  assert.equal(titleBrand("en"), "Ahan Asa");
  assert.equal(titleBrand("fa"), "آهن آسا");
  assert.equal(titleBrand("ar"), "آهن آسا");
  const layout = read("app/[locale]/layout.tsx");
  assert.match(layout, /const brand = titleBrand\(isLocale\(rawLocale\) \? rawLocale : "fa"\);/);
  assert.match(layout, /template: `%s \| \$\{brand\}`/);
  const home = read("app/[locale]/page.tsx");
  assert.match(home, /titleAbsolute: true/);
  assert.match(home, /fa: \{ title: "آهن آسا \| خرید آهن‌آلات و قیمت روز آهن برای پروژه"/);
  assert.match(home, /en: \{ title: "Ahan Asa \| Iranian Steel Sourcing for Projects"/);
});

test("noindex pages: Industries and Markets stay public but noindex on every target and out of the sitemap", () => {
  assert.deepEqual([...PRODUCTION_NOINDEX_PAGES], ["/industries", "/markets"]);
  for (const p of PRODUCTION_NOINDEX_PAGES) assert.ok((STATIC_PUBLIC_PATHS as readonly string[]).includes(p), `${p} is still a public (linkable) page`);
  assert.ok(isNoindexPage("/markets") && !isNoindexPage("/about"));
  for (const f of ["app/[locale]/industries/page.tsx", "app/[locale]/markets/page.tsx"]) assert.match(read(f), /indexable: publicPageIndexable\(\) && !isNoindexPage\("\/(industries|markets)"\)/);
  assert.match(read("app/sitemap.ts"), /for \(const path of STATIC_PUBLIC_PATHS\) if \(!isNoindexPage\(path\)\)/);
  assert.equal(neutralRoute("https://www.ahanassa.com/en/industries"), "/industries");
  assert.equal(neutralRoute("https://www.ahanassa.com/ar"), "/");
  assert.equal(neutralRoute("https://www.ahanassa.com"), "/");
  assert.equal(neutralRoute("https://www.ahanassa.com/markets"), "/markets");
});

test("indexing gate: a noindex page passes only as `noindex, follow` and only when the sitemap leaves it out", () => {
  const O = "https://www.ahanassa.com";
  const make = (meta: string, inSitemap: boolean) => {
    const files = new Map<string, string>();
    const languages = { fa: `${O}/about`, "x-default": `${O}/about` };
    files.set("about.html", `<meta name="robots" content="index, follow"/><link rel="canonical" href="${O}/about"/><link rel="alternate" hrefLang="fa" href="${O}/about"/><link rel="alternate" hrefLang="x-default" href="${O}/about"/>`);
    files.set("markets.html", `<meta name="robots" content="${meta}"/><link rel="canonical" href="${O}/markets"/>`);
    for (const f of ["404.html", "en/404.html", "ar/404.html"]) files.set(f, '<meta name="robots" content="noindex, nofollow"/>');
    files.set("_headers", buildHeadersFile("production", STATIC_TARGETS.production.rfqApiOrigin));
    files.set("robots.txt", PRODUCTION_ROBOTS_TXT);
    const sitemap = [{ url: `${O}/about`, lastModified: "2026-10-01T00:00:00.000Z", alternates: { languages } }];
    if (inSitemap) sitemap.push({ url: `${O}/markets`, lastModified: "2026-10-01T00:00:00.000Z", alternates: { languages: { fa: `${O}/markets`, "x-default": `${O}/markets` } } });
    files.set("sitemap.xml", renderSitemapXml(sitemap));
    return checkIndexingPolicy("production", [...files.keys()], (f) => files.get(f)!);
  };
  assert.deepEqual(make("noindex, follow", false), []);
  assert.ok(make("index, follow", false).some((f) => f.includes('markets.html is a PRODUCTION_NOINDEX_PAGES page and must be "noindex, follow"')));
  assert.ok(make("noindex, follow", true).some((f) => f.includes("sitemap URL is not an indexable page: https://www.ahanassa.com/markets")));
});

test("internal links (keyword map §8): product link block, /prices → hubs, category → hub/calculator, products index → raw materials/export", () => {
  const product = read("app/[locale]/products/[slug]/page.tsx");
  assert.match(product, /<ProductRelatedLinks locale=\{locale\} templateXid=\{product\.templateXid\} slug=\{slug\}/);
  const block = read("components/products/product-related-links.tsx");
  assert.match(block, /export async function ProductRelatedLinks\([^)]*\) \{\s*await Promise\.resolve\(\);/, "own Flight row");
  for (const s of ["categoryListingPath(category.code)", "priceHubPath(category.code)", "WEIGHT_CALCULATOR_ROUTE", "listArticlesForProduct(locale, templateXid)"]) assert.ok(block.includes(s), s);
  assert.ok(!/«قیمت میلگرد»|"قیمت میلگرد"/.test(block), "never a hub head term as the anchor to another page");
  const listing = read("components/products/products-listing.tsx");
  assert.match(listing, /RAW_MATERIALS_ROUTE/);
  assert.match(listing, /isExportPublished\(locale\)/);
  const brand: Record<Locale, string> = { fa: "آهن آسا", en: "Ahan Asa", ar: "آهن آسا" };
  for (const l of locales) assert.equal(titleBrand(l), brand[l]);
});

// --- /about and the shared company facts (owner text 2026-10-13) ----------------------------------------

test("about: the approved fa facts, translated 1:1 to en/ar; no amount or currency; ar Arabic-only, en Latin-only", async () => {
  const { ABOUT_COPY, ABOUT_PHOTOS } = await import("../content/about.ts");
  const fa = ABOUT_COPY.fa;
  assert.equal(fa.h1, "درباره آهن آسا");
  assert.equal(fa.metaTitle, "درباره آهن آسا؛ مدیر خرید فولاد شما", "keyword map §7.1");
  assert.deepEqual(fa.timeline.map((r) => r.year), ["۱۳۷۶", "۱۳۸۸", "۱۳۹۴", "۱۴۰۰", "۱۴۰۳", "۱۴۰۴", "۱۴۰۵"]);
  assert.deepEqual(fa.leadership.map((p) => p.name), ["خانم فاطمه زاهدی", "آقای امیرموسی طالقانی"]);
  for (const l of ["en", "ar"] as const) {
    const t = ABOUT_COPY[l];
    for (const key of ["intro", "timeline", "supply", "why", "leadership"] as const) assert.equal(t[key].length, fa[key].length, `${l} ${key}: same items as fa`);
    t.timeline.forEach((row, i) => assert.ok(row.year.startsWith(["1376", "1388", "1394", "1400", "1403", "1404", "1405"][i]), `${l} year ${row.year}`));
  }
  for (const l of locales) assert.ok(!strings(ABOUT_COPY[l]).some((s) => DIGIT_AMOUNT.test(s) || /تومان|ریال|Toman|Rial|USD|\$|دينار|ريال/.test(s)), `${l}: no amount or currency`);
  assert.deepEqual(languageFindings("ar", strings(ABOUT_COPY.ar)), []);
  assert.deepEqual(languageFindings("en", strings(ABOUT_COPY.en)), []);
  assert.deepEqual([...ABOUT_PHOTOS], [], "no photos supplied yet: the gallery slot stays empty");
});

test("company facts: parent group, sister companies with links, working hours, phone display", async () => {
  const { PARENT_ORGANIZATION, GROUP_COMPANIES, WORKING_HOURS, WORKING_HOURS_TEXT, companyPhoneDisplay, sinceLabel, OFFICES } = await import("../content/company.ts");
  assert.equal(PARENT_ORGANIZATION.name.fa, "فضاسازه نقش جهان");
  assert.equal(PARENT_ORGANIZATION.url, "https://fazasazeh.ir");
  assert.equal(PARENT_ORGANIZATION.foundingDate, "1997");
  assert.deepEqual(GROUP_COMPANIES.map((c) => [c.domain, c.sinceSolar, c.url]), [
    ["fazasazeh.ir", 1376, "https://fazasazeh.ir"],
    ["sipanelco.com", 1394, "https://sipanelco.com"],
    ["avizsazeh.com", 1400, "https://avizsazeh.com"],
    ["ahanassa.com", 1403, null],
    ["aisanat.ir", 1405, "https://aisanat.ir"],
  ]);
  assert.deepEqual(WORKING_HOURS, [
    { dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"], opens: "08:00", closes: "17:00" },
    { dayOfWeek: ["Thursday"], opens: "08:00", closes: "12:00" },
  ]);
  assert.deepEqual(WORKING_HOURS_TEXT.fa.lines, ["شنبه تا چهارشنبه ۸ تا ۱۷", "پنجشنبه ۸ تا ۱۲"]);
  assert.equal(companyPhoneDisplay("03135134"), "031-35134");
  assert.equal(companyPhoneDisplay("+983135134"), "031-35134", "same display after PR #47's +98 form");
  assert.equal(sinceLabel("fa", 1394), "از ۱۳۹۴");
  assert.equal(sinceLabel("en", 1394), "since 1394 SH (2015–16)");
  assert.equal(sinceLabel("ar", 1376), "منذ 1376 هـ.ش (1997–1998)");
  assert.deepEqual(languageFindings("ar", [...strings(GROUP_COMPANIES.map((c) => [c.name.ar, c.field.ar])), ...strings(WORKING_HOURS_TEXT.ar), OFFICES.ar.tehran.address]), []);
  assert.deepEqual(languageFindings("en", [...strings(GROUP_COMPANIES.map((c) => [c.name.en, c.field.en])), ...strings(WORKING_HOURS_TEXT.en), ...strings(OFFICES.en)]), []);
  assert.match(read("app/[locale]/contact/page.tsx"), /WORKING_HOURS_TEXT\[locale\]\.lines\.map/, "hours on /contact too");
  const about = read("app/[locale]/about/page.tsx");
  assert.ok(!/pricing|PriceCell|PRICE_CELL|listAllPublishedPrices|PRICE_PAGE_ROUTE/.test(about), "no price on /about");
  assert.match(about, /title: t\.metaTitle, titleAbsolute: true, description: t\.metaDescription/);
});
