import { test } from "node:test";
import assert from "node:assert/strict";
import { isEarlierTehranDay, priceChange, sparklineGeometry, sparklineSeries, SPARKLINE_MIN_POINTS, SPARKLINE_WINDOW_DAYS, tehranDay, type DailyPoint } from "./price-history.ts";
import { presentCompactChange, presentPriceCell, priceBlockDataFromRow, PRICE_CHANGE_LOCALES } from "./product-page-price.ts";
import { presentPriceBlock } from "./price-block-presentation.ts";
import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/** W9.6 — ▲/▼ + % and the 30-day chart thresholds. SYNTHETIC values only. */

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

test("tehranDay: the Tehran calendar day (UTC+03:30), not the UTC one", () => {
  assert.equal(tehranDay("2026-10-08T07:20:00Z"), "2026-10-08");
  assert.equal(tehranDay("2026-10-08T20:29:59Z"), "2026-10-08");
  assert.equal(tehranDay("2026-10-08T20:30:00Z"), "2026-10-09", "00:00 Tehran = 20:30 UTC");
  assert.equal(tehranDay("not a date"), null);
});

test("previous day: only an EARLIER Tehran day counts; a same-day correction does not", () => {
  assert.equal(isEarlierTehranDay("2026-10-05T07:20:00Z", "2026-10-08T07:20:00Z"), true);
  assert.equal(isEarlierTehranDay("2026-10-08T06:00:00Z", "2026-10-08T07:20:00Z"), false, "same day");
  assert.equal(isEarlierTehranDay("2026-10-07T20:45:00Z", "2026-10-08T07:20:00Z"), false, "UTC day before, but the same Tehran day");
  assert.equal(isEarlierTehranDay("2026-10-07T20:00:00Z", "2026-10-08T07:20:00Z"), true);
  assert.equal(isEarlierTehranDay(null, "2026-10-08T07:20:00Z"), false);
});

test("priceChange: direction and percent rounded to 0.1; unchanged; invalid inputs give null", () => {
  assert.deepEqual(priceChange(48947, 49561), { direction: "down", percent: 1.2 });
  assert.deepEqual(priceChange(55200, 54000), { direction: "up", percent: 2.2 });
  assert.deepEqual(priceChange(100000, 100000), { direction: "none", percent: 0 });
  assert.deepEqual(priceChange(100040, 100000), { direction: "none", percent: 0 }, "< 0.05 % rounds to unchanged");
  assert.deepEqual(priceChange(100050, 100000), { direction: "up", percent: 0.1 });
  for (const previous of [null, undefined, 0, -5, Number.NaN]) assert.equal(priceChange(100, previous as number), null, String(previous));
  assert.equal(priceChange(0, 100), null);
});

test("▲/▼ next to a price: shown only when a previous-day price exists; fa only", () => {
  const cell = presentCompactChange("fa", priceBlockDataFromRow(ROW));
  assert.deepEqual(cell, { direction: "down", glyph: "▼", label: "۱٫۲٪", word: "کاهش" });
  const up = presentCompactChange("fa", priceBlockDataFromRow({ ...ROW, previous_price_irr_per_kg: 480000 }));
  assert.deepEqual(up, { direction: "up", glyph: "▲", label: "۲٪", word: "افزایش" });
  assert.deepEqual(presentCompactChange("fa", priceBlockDataFromRow({ ...ROW, previous_price_irr_per_kg: 489470 })), { direction: "none", glyph: null, label: "بدون تغییر", word: "" });
  // No previous price at all (first price): nothing.
  const first = priceBlockDataFromRow({ ...ROW, previous_price_irr_per_kg: null, previous_published_at: null });
  assert.equal(presentCompactChange("fa", first), null);
  assert.equal((presentPriceBlock("fa", first) as { change: unknown }).change, null);
  // A same-day correction is not a previous day: nothing, in the cell AND in the PriceBlock.
  const sameDay = priceBlockDataFromRow({ ...ROW, previous_published_at: "2026-10-08T06:00:00Z" });
  assert.equal(sameDay.previousTomanPerKg, null);
  assert.equal(presentCompactChange("fa", sameDay), null);
  assert.equal((presentPriceBlock("fa", sameDay) as { change: unknown }).change, null);
  // ar shows price + date + VAT only (owner rule), en nothing.
  assert.deepEqual(PRICE_CHANGE_LOCALES, ["fa"]);
  assert.equal(presentCompactChange("ar", priceBlockDataFromRow(ROW)), null);
  assert.equal(presentCompactChange("en", priceBlockDataFromRow(ROW)), null);
  const ar = presentPriceCell("ar", priceBlockDataFromRow(ROW), "CVAR-000031");
  assert.ok(ar?.kind === "price" && ar.change === null);
});

const days = (n: number, last = "2026-10-08"): DailyPoint[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${last}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return { day: d.toISOString().slice(0, 10), price: 50000 + i * 100 };
  });

test("chart threshold: nothing below 7 daily points, a series from 7 on", () => {
  assert.equal(SPARKLINE_MIN_POINTS, 7);
  assert.equal(SPARKLINE_WINDOW_DAYS, 30);
  assert.equal(sparklineSeries([], "2026-10-08"), null);
  assert.equal(sparklineSeries(days(6), "2026-10-08"), null, "6 points: no chart");
  assert.equal(sparklineSeries(days(7), "2026-10-08")?.length, 7, "7 points: chart");
  assert.equal(sparklineSeries(days(30), "2026-10-08")?.length, 30);
});

test("chart window: only the 30 days ending on the current day count; duplicates and invalid prices are not extra points", () => {
  assert.equal(sparklineSeries(days(40), "2026-10-08")?.length, 30, "older points fall out of the window");
  assert.equal(sparklineSeries(days(7, "2026-09-08"), "2026-10-08"), null, "7 points but all older than 30 days");
  // 6 days + a 31-days-old point: still 6 in the window.
  assert.equal(sparklineSeries([{ day: "2026-09-08", price: 1 }, ...days(6)], "2026-10-08"), null);
  // 6 distinct days, one of them twice: 6, not 7.
  const six = days(6);
  assert.equal(sparklineSeries([...six, { ...six[5], price: 99999 }], "2026-10-08"), null);
  assert.equal(sparklineSeries([...days(6), { day: "2026-09-20", price: 0 }], "2026-10-08"), null, "a zero price is not a point");
  // Future points (after the current day) never count.
  assert.equal(sparklineSeries([...days(6), { day: "2026-10-09", price: 50000 }], "2026-10-08"), null);
  const s = sparklineSeries([...six, { ...six[5], price: 99999 }, { day: "2026-09-20", price: 49000 }], "2026-10-08")!;
  assert.equal(s.length, 7);
  assert.equal(s.at(-1)!.price, 99999, "the last value of a day wins");
  assert.deepEqual(s.map((p) => p.day), [...s.map((p) => p.day)].sort(), "oldest first");
});

test("chart geometry: one vertex per point, deterministic, x by date across the window, flat series mid-height", () => {
  const series = sparklineSeries(days(7), "2026-10-08")!;
  const g = sparklineGeometry(series, "2026-10-08");
  assert.equal(g.path.split(/[ML]/).filter(Boolean).length, 7);
  assert.equal(g.path, sparklineGeometry(series, "2026-10-08").path);
  assert.deepEqual(g.end, { x: 236, y: 4 }, "the newest point is at the right edge, the highest price at the top");
  const flat = sparklineGeometry(series.map((p) => ({ ...p, price: 1 })), "2026-10-08");
  assert.ok(flat.path.split(/[ML]/).filter(Boolean).every((pt) => pt.trim().endsWith(" 24")), flat.path);
  assert.ok(!/NaN|Infinity/.test(g.path + flat.path));
});
