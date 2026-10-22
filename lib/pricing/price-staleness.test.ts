import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isPriceDataStale, STALE_AFTER_WORKING_DAYS, STALE_PRICE_COPY, STALE_TABLE_TITLE, staleHeading, workingDayWeight, workingDaysBetween } from "./price-staleness.ts";
import { pricePageStaleHeading } from "./price-page.ts";
import { hubStaleHeading } from "./price-hubs.ts";
import { chartStaleHeading } from "./price-charts.ts";
import type { PriceDay } from "./price-titles.ts";

/** W31 — the stale-price rule: > 2 Iranian working days (Sat–Wed 1, Thu ½, Friday/holiday 0) since the newest price day. */

/** Noon in Tehran (UTC+03:30) of a Tehran day. */
const noon = (day: string) => new Date(`${day}T08:30:00Z`);

test("threshold is 2 working days", () => {
  assert.equal(STALE_AFTER_WORKING_DAYS, 2);
});

test("day weights: Sat–Wed 1, Thursday ½, Friday 0, an official holiday 0", () => {
  // 2026-10-17 is a Saturday.
  assert.deepEqual(["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map(workingDayWeight), [1, 1, 1, 1, 1, 0.5, 0]);
  // 22 Bahman (2027-02-11, a Thursday) and Nowruz (2027-03-21, a Sunday) are in the shared holiday list.
  assert.equal(workingDayWeight("2027-02-11"), 0);
  assert.equal(workingDayWeight("2027-03-21"), 0);
});

test("fresh: a price of today or yesterday", () => {
  assert.equal(isPriceDataStale("2026-10-21", noon("2026-10-21")), false);
  assert.equal(isPriceDataStale("2026-10-21", noon("2026-10-22")), false);
  assert.equal(workingDaysBetween("2026-10-21", "2026-10-22"), 0.5);
});

test("exactly 2 working days is still current; the next working day is stale", () => {
  // Saturday price: Sun + Mon = 2 → no notice on Monday; + Tue = 3 → notice on Tuesday.
  assert.equal(workingDaysBetween("2026-10-17", "2026-10-19"), 2);
  assert.equal(isPriceDataStale("2026-10-17", noon("2026-10-19")), false);
  assert.equal(isPriceDataStale("2026-10-17", noon("2026-10-20")), true);
});

test("older: Thursday's half day tips 2 into 2.5", () => {
  assert.equal(isPriceDataStale("2026-10-19", noon("2026-10-21")), false); // Tue + Wed = 2
  assert.equal(workingDaysBetween("2026-10-19", "2026-10-22"), 2.5);
  assert.equal(isPriceDataStale("2026-10-19", noon("2026-10-22")), true);
  assert.equal(isPriceDataStale("2026-09-01", noon("2026-10-22")), true);
});

test("across a Friday: the weekend does not age the price", () => {
  // Wednesday price: Thu ½ + Fri 0 + Sat 1 = 1.5 → current; + Sun = 2.5 → stale.
  assert.equal(isPriceDataStale("2026-10-21", noon("2026-10-24")), false);
  assert.equal(isPriceDataStale("2026-10-21", noon("2026-10-25")), true);
  // Thursday price: Fri 0 + Sat 1 + Sun 1 = 2 → current on Sunday; stale on Monday.
  assert.equal(isPriceDataStale("2026-10-22", noon("2026-10-25")), false);
  assert.equal(isPriceDataStale("2026-10-22", noon("2026-10-26")), true);
});

test("across an official holiday: a holiday Thursday counts 0", () => {
  // Tuesday 2027-02-09 price: Wed 1 + Thu (22 Bahman) 0 + Fri 0 + Sat 1 = 2 → still current on Saturday.
  assert.equal(workingDaysBetween("2027-02-09", "2027-02-13"), 2);
  assert.equal(isPriceDataStale("2027-02-09", noon("2027-02-13")), false);
  assert.equal(isPriceDataStale("2027-02-09", noon("2027-02-14")), true);
  // Nowruz: a Wednesday-before-Nowruz price stays current through the listed first days of the year (Thu ½ only).
  assert.equal(isPriceDataStale("2027-03-17", noon("2027-03-24")), false);
});

test("the visitor's day is the Tehran day, whatever the browser's time zone", () => {
  // Saturday price; Monday 23:59 Tehran = 20:29Z → current; Tuesday 00:01 Tehran = 20:31Z → stale.
  assert.equal(isPriceDataStale("2026-10-17", new Date("2026-10-19T20:29:00Z")), false);
  assert.equal(isPriceDataStale("2026-10-17", new Date("2026-10-19T20:31:00Z")), true);
});

test("never stale on bad input or a clock behind the data", () => {
  assert.equal(isPriceDataStale("", noon("2026-10-22")), false);
  assert.equal(isPriceDataStale("2026-10-17T10:00:00Z", noon("2026-10-22")), false);
  assert.equal(isPriceDataStale("2026-10-17", new Date("invalid")), false);
  assert.equal(isPriceDataStale("2026-10-25", noon("2026-10-22")), false);
});

const faDay: PriceDay = { at: "2026-10-17T07:00:00Z", date: "۲۵ مهر ۱۴۰۵", today: true };
const arDay: PriceDay = { at: "2026-10-17T07:00:00Z", date: "١٧ أكتوبر ٢٠٢٦", today: true };

test("fa stale headings: «آخرین قیمت ثبت‌شده …» with the page's own price date", () => {
  assert.equal(pricePageStaleHeading("fa", faDay), "آخرین قیمت ثبت‌شده آهن‌آلات — ۲۵ مهر ۱۴۰۵");
  assert.equal(hubStaleHeading("fa", "REBAR", faDay), "آخرین قیمت ثبت‌شده میلگرد — ۲۵ مهر ۱۴۰۵");
  assert.equal(chartStaleHeading("میلگرد آجدار", faDay), "نمودار و روند قیمت میلگرد آجدار — آخرین قیمت ثبت‌شده ۲۵ مهر ۱۴۰۵");
  assert.equal(STALE_PRICE_COPY.fa.notice, "به‌روزرسانی قیمت‌ها موقتاً متوقف است؛ برای قیمت قطعی استعلام بگیرید");
});

test("ar stale headings: «آخر سعر مسجّل …», ل/لل before the subject, Arabic letters only", () => {
  assert.equal(pricePageStaleHeading("ar", arDay), "آخر سعر مسجّل للحديد — ١٧ أكتوبر ٢٠٢٦");
  assert.equal(hubStaleHeading("ar", "REBAR", arDay), "آخر سعر مسجّل لحديد التسليح (الشيش) — ١٧ أكتوبر ٢٠٢٦");
  assert.equal(staleHeading("ar", "الصاج والألواح", arDay.date), "آخر سعر مسجّل للصاج والألواح — ١٧ أكتوبر ٢٠٢٦");
  const ar = [...Object.values(STALE_PRICE_COPY.ar), STALE_TABLE_TITLE.ar, pricePageStaleHeading("ar", arDay)];
  for (const s of ar) assert.ok(!/[یکۀ‌]/.test(s), `Persian letter in ar copy: ${s}`);
});

const read = (p: string) => fs.readFileSync(path.resolve(import.meta.dirname, "../..", p), "utf8");

test("browser check: fresh markup on the server and first render, the stale state only after mount", () => {
  const source = read("components/prices/stale-price.tsx");
  assert.match(source, /^"use client";/);
  assert.match(source, /useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => \{\s*setStale\(isPriceDataStale\(day, new Date\(\)\)\);/);
  // The notice reserves no space while fresh: nothing is rendered at all.
  assert.match(source, /if \(!useStalePrices\(day\)\) return null;/);
});

test("every price surface wires the check; en and the dated <title> are untouched", () => {
  for (const page of ["app/[locale]/prices/page.tsx", "app/[locale]/prices/[family]/page.tsx", "app/[locale]/prices/chart/[slug]/page.tsx", "app/[locale]/products/[slug]/page.tsx", "app/[locale]/tools/weight-calculator/page.tsx"]) {
    const source = read(page);
    assert.ok(source.includes("loadLatestPriceDay()"), `${page} reads the newest price day`);
    assert.ok(source.includes("<StalePriceNotice"), `${page} shows the notice`);
    // generateMetadata (the dated <title>, W16.8) never looks at staleness.
    const metadata = source.slice(source.indexOf("export async function generateMetadata"), source.indexOf("\n}\n", source.indexOf("export async function generateMetadata")));
    assert.ok(!/stale/i.test(metadata), `${page}: generateMetadata must not change with staleness`);
  }
  // The day travels to the browser, never a price time (ar pages carry no price timestamp — price gate rule 3).
  assert.match(read("lib/pricing/price-page-data.ts"), /return newest \? tehranDay\(newest\) : null;/);
});
