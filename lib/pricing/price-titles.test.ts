import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DESCRIPTION_MAX, faProductPriceTitle, fitText, fitTitle, priceDay, textLength, TITLE_MAX, type PriceDay } from "./price-titles.ts";
import { hubDescription, hubHeading, hubTitle, PRICE_HUB_CATEGORY_CODES, PRICE_HUB_FAMILY_COPY } from "./price-hubs.ts";
import { pricePageDescription, pricePageHeading, pricePageTitle } from "./price-page.ts";
import { chartDescription, chartHeading, chartHeadingProduct, chartTitle } from "./price-charts.ts";

/** W16.8 — dated price titles: fresh vs stale, ≤ 60 / ≤ 155, Persian digits, never an amount. */

const REPO = path.resolve(import.meta.dirname, "../..");
const PRICED = "2026-10-20T08:00:00Z"; // 11:30 Tehran, 28 مهر ۱۴۰۵
const FETCHED_SAME_DAY = "2026-10-20T10:00:00Z";
const FETCHED_NEXT_DAY = "2026-10-20T21:00:00Z"; // 00:30 Tehran on 29 مهر — already the next Tehran day
const rows = [{ price: { previousPricedAt: "2026-10-19T08:00:00Z" }, weight: { label: "وزن", value: "۱" } }];
const FA_FAMILIES = ["میلگرد", "تیرآهن", "ورق", "قوطی و پروفیل", "نبشی", "ناودانی", "لوله مانیسمان"];
const AR_FAMILIES = ["حديد التسليح", "الشيلمان", "الصاج", "الحديد المربع والمستطيل", "الزوايا", "المجاري", "الأنابيب غير الملحومة"];
/** Product names of the current catalog, the longest ones included. */
const PRODUCTS = ["تیرآهن IPE", "میلگرد آجدار A3 (Aj400)", "ورق سیاه ضخیم (پلیت) S235JR", "لوله بدون درز (مانیسمان) ASTM A106 گرید B", "ورق رنگی (پیش‌رنگ‌شده) رول، پایه DX51D+Z"];

/** A thousands-grouped number (an amount) or a number next to a currency word. */
const AMOUNT = /[0-9۰-۹٠-٩]{1,3}([,٬،][0-9۰-۹٠-٩]{3})+|[0-9۰-۹٠-٩]+\s*(تومان|ریال|ألف)|از\s+[0-9۰-۹]/;

function days(locale: "fa" | "ar"): { fresh: PriceDay; stale: PriceDay } {
  return { fresh: priceDay(locale, PRICED, FETCHED_SAME_DAY), stale: priceDay(locale, PRICED, FETCHED_NEXT_DAY) };
}

/** Every title/H1/description the pages can build, per locale and freshness. */
function allTexts(locale: "fa" | "ar", day: PriceDay): { titles: string[]; headings: string[]; descriptions: string[] } {
  const families = locale === "fa" ? FA_FAMILIES : AR_FAMILIES;
  const titles = [pricePageTitle(locale, day, families), ...PRICE_HUB_CATEGORY_CODES.map((c) => hubTitle(locale, c, day))];
  const headings = [pricePageHeading(locale, day), ...PRICE_HUB_CATEGORY_CODES.map((c) => hubHeading(locale, c, day))];
  const descriptions = [pricePageDescription(locale, day, families, rows), ...PRICE_HUB_CATEGORY_CODES.map((c) => hubDescription(locale, c, day, rows))];
  if (locale === "fa") {
    for (const p of PRODUCTS) {
      titles.push(chartTitle(p, day), faProductPriceTitle(p, day));
      headings.push(chartHeading(p, day));
      descriptions.push(chartDescription(p, "Ø16", day));
    }
  }
  return { titles, headings, descriptions };
}

test("price day: «today» only when the price is from the snapshot's Tehran day; the date is the price's, never the clock", () => {
  assert.deepEqual(priceDay("fa", PRICED, FETCHED_SAME_DAY), { at: PRICED, date: "۲۸ مهر ۱۴۰۵", today: true });
  assert.equal(priceDay("fa", PRICED, FETCHED_NEXT_DAY).today, false, "fetched after Tehran midnight: yesterday's price is not «امروز»");
  assert.equal(priceDay("fa", PRICED, FETCHED_NEXT_DAY).date, "۲۸ مهر ۱۴۰۵", "a stale page keeps its price's date");
  assert.equal(priceDay("fa", PRICED, null).today, true, "no reference (a snapshot without fetched_at): pre-W16.8 behavior");
  assert.equal(priceDay("fa", "2026-10-21T08:00:00Z", FETCHED_SAME_DAY).today, true, "a price newer than the fetch (synthetic) is today");
  assert.equal(priceDay("ar", PRICED, FETCHED_SAME_DAY).date, "٢٠ أكتوبر ٢٠٢٦");
  // 23:59 Tehran on 28 مهر is still 28 مهر (UTC 20:29).
  assert.equal(priceDay("fa", "2026-10-20T20:29:00Z", FETCHED_SAME_DAY).today, true);
});

test("fresh titles say «امروز» / «اليوم» with the date; stale ones say «به‌روزرسانی» / «تحديث» and never «امروز»", () => {
  for (const locale of ["fa", "ar"] as const) {
    const { fresh, stale } = days(locale);
    const now = locale === "fa" ? "امروز" : "اليوم";
    const updated = locale === "fa" ? "به‌روزرسانی" : "تحديث";
    const f = allTexts(locale, fresh);
    const s = allTexts(locale, stale);
    // A product title whose date does not fit keeps its plain «{name} | آهن آسا» (faProductPriceTitle).
    const plain = new Set(PRODUCTS.map((p) => `${p} | آهن آسا`));
    for (const t of [...f.titles.filter((t) => !plain.has(t)), ...f.headings]) {
      assert.ok(t.includes(fresh.date), `${locale} dated: ${t}`);
      assert.ok(t.includes(now), `${locale} fresh says ${now}: ${t}`);
    }
    for (const t of [...s.titles.filter((t) => !plain.has(t)), ...s.headings, ...s.descriptions]) {
      assert.ok(t.includes(stale.date), `${locale} dated: ${t}`);
      assert.ok(!t.includes(now), `${locale} stale never says ${now}: ${t}`);
    }
    for (const t of [...s.titles.filter((t) => !t.includes("— قیمت ") && !/ تا /.test(t)), ...s.headings]) assert.ok(t.includes(updated), `${locale} stale says ${updated}: ${t}`);
  }
  assert.equal(hubTitle("fa", "BEAM", days("fa").fresh), "قیمت تیرآهن امروز ۲۸ مهر ۱۴۰۵ | آهن آسا");
  assert.equal(hubTitle("fa", "BEAM", days("fa").stale), "قیمت تیرآهن — به‌روزرسانی ۲۸ مهر ۱۴۰۵ | آهن آسا");
  assert.equal(hubHeading("fa", "BEAM", days("fa").fresh), "قیمت امروز تیرآهن — ۲۸ مهر ۱۴۰۵");
  assert.equal(hubTitle("ar", "REBAR", days("ar").fresh), "سعر حديد التسليح الإيراني اليوم ٢٠ أكتوبر ٢٠٢٦ | آهن آسا");
  assert.equal(faProductPriceTitle("تیرآهن IPE", days("fa").fresh), "تیرآهن IPE — قیمت امروز ۲۸ مهر ۱۴۰۵ | آهن آسا");
  assert.equal(faProductPriceTitle("تیرآهن IPE", days("fa").stale), "تیرآهن IPE — قیمت ۲۸ مهر ۱۴۰۵ | آهن آسا");
});

test("length: every title ≤ 60 and every description ≤ 155 (fresh and stale, the longest product names)", () => {
  for (const locale of ["fa", "ar"] as const) {
    for (const day of Object.values(days(locale))) {
      const { titles, descriptions } = allTexts(locale, day);
      for (const t of titles) assert.ok(textLength(t) <= TITLE_MAX, `${textLength(t)} > ${TITLE_MAX}: ${t}`);
      for (const d of descriptions) assert.ok(textLength(d) <= DESCRIPTION_MAX && textLength(d) >= 90, `${textLength(d)}: ${d}`);
    }
  }
});

test("fitting: the brand drops first, then the tail; a product title keeps its plain form when the date does not fit", () => {
  assert.equal(fitText(5, ["abcdef", "abc", "ab"]), "abc");
  assert.equal(fitText(1, ["abcdef", "abc"]), "abc", "none fits: the shortest");
  const long = "x".repeat(55);
  assert.equal(fitTitle("fa", [long]), long, "no room for « | آهن آسا»: the brand drops");
  assert.equal(fitTitle("fa", [`${long}؛ tail`, long]), long, "brand-less with tail is still too long: the tail drops");
  assert.equal(fitTitle("fa", ["short"]), "short | آهن آسا");
  const fa = days("fa").fresh;
  const tooLong = "ورق رنگی (پیش‌رنگ‌شده) رول، پایه DX51D+Z";
  assert.equal(faProductPriceTitle(tooLong, fa), `${tooLong} | آهن آسا`);
  assert.equal(pricePageTitle("fa", fa, FA_FAMILIES), "قیمت آهن‌آلات امروز ۲۸ مهر ۱۴۰۵؛ میلگرد، تیرآهن، ورق");
  assert.equal(chartTitle("لوله بدون درز (مانیسمان) ASTM A106 گرید B", fa), "نمودار قیمت لوله بدون درز ASTM A106 گرید B امروز ۲۸ مهر ۱۴۰۵");
});

test("digits and scripts: fa dates in Persian digits, ar in Arabic-Indic digits and Arabic letters only; no amount anywhere", () => {
  for (const locale of ["fa", "ar"] as const) {
    for (const day of Object.values(days(locale))) {
      const { titles, headings, descriptions } = allTexts(locale, day);
      assert.match(day.date, locale === "fa" ? /^[۰-۹]+ \S+ [۰-۹]{4}$/ : /^[٠-٩]+ \S+ [٠-٩]{4}$/);
      for (const t of [...titles, ...headings, ...descriptions]) {
        assert.ok(!AMOUNT.test(t), `no amount: ${t}`);
        if (locale === "ar") assert.ok(!/[پچژگکی۰-۹]/.test(t.replace("آهن آسا", "")), `Arabic letters only: ${t}`);
      }
      for (const t of titles) assert.ok(!/تومان|ریال|بالتومان/.test(t), `no currency in a title: ${t}`);
    }
  }
});

test("ar descriptions never name a factory, a location or a change; fa ones list factories, location, change and «استعلام»", () => {
  const ar = days("ar").fresh;
  for (const code of PRICE_HUB_CATEGORY_CODES) assert.ok(!/مصنع|معمل|موقع التسليم|التغير/.test(hubDescription("ar", code, ar, rows)), code);
  const fa = hubDescription("fa", "REBAR", days("fa").fresh, rows);
  for (const word of ["کارخانه‌ها", "محل تحویل", "تغییر نسبت به روز قبل", "استعلام", "۲۸ مهر ۱۴۰۵"]) assert.ok(fa.includes(word), `${word}: ${fa}`);
  const noChange = hubDescription("fa", "REBAR", days("fa").fresh, [{ price: {}, weight: null }, { price: { previousPricedAt: null }, weight: null }]);
  assert.ok(!noChange.includes("تغییر"), "a page without a previous-day price claims no change");
  for (const code of PRICE_HUB_CATEGORY_CODES) assert.ok(PRICE_HUB_FAMILY_COPY[code].ar.weight === null && PRICE_HUB_FAMILY_COPY[code].fa.metaBy === "", code);
});

test("wiring: the build passes the snapshot's fetch time; the price pages use titleAbsolute with the builders; sitemap uses price dates", () => {
  const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
  assert.match(read("scripts/static/build.ts"), /AHANASSA_SNAPSHOT_FETCHED_AT: snapshot\.source\.fetched_at/);
  assert.match(read("app/[locale]/prices/page.tsx"), /title: day \? pricePageTitle\(locale, day\.day, day\.families\) : t\.metaTitle,\s*titleAbsolute: day !== null,/);
  assert.match(read("app/[locale]/prices/[family]/page.tsx"), /title: hubTitle\(hub\.locale, hub\.family, day\),\s*titleAbsolute: true,/);
  assert.match(read("app/[locale]/prices/chart/[slug]/page.tsx"), /title: chartTitle\(chart\.product\.productName, day\),\s*titleAbsolute: true,/);
  assert.match(read("app/[locale]/products/[slug]/page.tsx"), /const priced = locale === "fa" \? await newestPriceDay\(entry\.variants\) : null;/);
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /lastModified: pricePageModified\(locale\)/);
  assert.match(sitemap, /lastModified: hubModified\(locale, path\)/);
  assert.match(sitemap, /lastModified: \(await loadPriceChart\(c\.slug\)\)\?\.row\.price\.pricedAt/);
});

test("chart H1: the price gate recovers the product name from the dated heading (fresh and stale)", () => {
  for (const day of Object.values(days("fa"))) for (const p of PRODUCTS) assert.equal(chartHeadingProduct(chartHeading(p, day)), p);
  assert.equal(chartHeadingProduct("نمودار و روند قیمت تیرآهن IPE"), "تیرآهن IPE", "an undated H1 still works");
});
