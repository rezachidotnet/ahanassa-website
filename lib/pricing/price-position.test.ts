import { test } from "node:test";
import assert from "node:assert/strict";
import { POSITION_MIN_POINTS, positionOf, priceWindows, windowPoints, windowStats } from "./price-position.ts";
import { chartSeries, selectChartProducts, PRICE_CHART_MAX_PAGES, PRICE_CHART_PER_FAMILY, PRICE_DECISION_COPY, PRICE_CHART_COPY, allowedGaugeTexts } from "./price-charts.ts";
import { addDays, lineGeometry, pathPointCount } from "../charts/line-geometry.ts";
import type { DailyPoint } from "./price-history.ts";

/** W18.2 — the price-position gauge, the chart-page selection and the line geometry (pure). */

const TODAY = "2026-10-08";
/** One point every `step` days for `days` days ending today, prices from `price(i)` (i = 0 is today). */
const series = (days: number, step: number, price: (i: number) => number): DailyPoint[] => {
  const out: DailyPoint[] = [];
  for (let i = 0; i < days; i += step) out.push({ day: addDays(TODAY, -i), price: price(i) });
  return out.reverse();
};

test("position: thirds of the window's range; a flat window is mid", () => {
  assert.equal(positionOf(0), "low");
  assert.equal(positionOf(1 / 3), "low");
  assert.equal(positionOf(0.5), "mid");
  assert.equal(positionOf(2 / 3), "high");
  assert.equal(positionOf(1), "high");
  const flat = windowStats(series(30, 1, () => 50_000), TODAY, 30)!;
  assert.deepEqual([flat.position, flat.fraction, flat.min, flat.max, flat.avg], ["mid", 0.5, 50_000, 50_000, 50_000]);
});

test("window stats: lowest, average (whole Toman), highest and today over the days ending on today's price", () => {
  // Falling prices: today is the lowest of the last 30 days -> low (ارزان).
  const s = windowStats(series(30, 1, (i) => 50_000 + i * 100), TODAY, 30)!;
  assert.deepEqual([s.min, s.max, s.today, s.points, s.position, s.from], [50_000, 52_900, 50_000, 30, "low", "2026-09-09"]);
  assert.equal(s.avg, 51_450);
  // Rising prices: today is the highest -> high (گران).
  assert.equal(windowStats(series(30, 1, (i) => 50_000 - i * 100), TODAY, 30)!.position, "high");
});

test("a window needs ≥ 7 points and a point on today's day; days outside it are ignored", () => {
  assert.equal(POSITION_MIN_POINTS, 7);
  assert.equal(windowStats(series(30, 5, () => 1), TODAY, 30), null, "6 points");
  assert.equal(windowStats(series(31, 5, () => 1), TODAY, 30), null, "7 points, but day 30 is outside the window");
  assert.equal(windowStats(series(30, 4, () => 1), TODAY, 30)?.points, 8);
  const yesterday = series(30, 1, () => 1).filter((p) => p.day !== TODAY);
  assert.equal(windowStats(yesterday, TODAY, 30), null, "no point today: no gauge");
  assert.equal(windowPoints([{ day: "2026-01-01", price: 9 }, { day: TODAY, price: 0 }, { day: TODAY, price: 5 }], TODAY, 30).length, 1, "invalid prices dropped, duplicates keep the last");
});

test("the 90-day window shows only when the history reaches past 30 days", () => {
  assert.deepEqual(priceWindows(series(30, 1, (i) => 1000 + i), TODAY).map((w) => w.window), [30]);
  assert.deepEqual(priceWindows(series(90, 2, (i) => 1000 + i), TODAY).map((w) => w.window), [30, 90]);
  assert.deepEqual(priceWindows(series(20, 5, () => 1), TODAY), [], "too few points: no gauge at all");
});

test("chart pages: a template's first priced row, ≥ 7 points in 90 days, by family demand, ≤ 2 per family, ≤ 12 in all", () => {
  const rows = [
    { xid: "CVAR-1", productName: "تیرآهن", productPagePath: "/products/ipe", size: "IPE 140", familyCode: "BEAM" },
    { xid: "CVAR-2", productName: "تیرآهن", productPagePath: "/products/ipe", size: "IPE 160", familyCode: "BEAM" },
    { xid: "CVAR-3", productName: "میلگرد ۱", productPagePath: "/products/rebar-1", size: "Ø12", familyCode: "REBAR" },
    { xid: "CVAR-4", productName: "میلگرد ۲", productPagePath: "/products/rebar-2", size: "Ø12", familyCode: "REBAR" },
    { xid: "CVAR-5", productName: "میلگرد ۳", productPagePath: "/products/rebar-3", size: "Ø12", familyCode: "REBAR" },
    { xid: "CVAR-6", productName: "کم‌سابقه", productPagePath: "/products/thin", size: "x", familyCode: "ANGLE" },
    { xid: "CVAR-7", productName: "سایر", productPagePath: "/products/other", size: "x", familyCode: "OTHER" },
  ];
  const counts: Record<string, number> = { "CVAR-1": 40, "CVAR-2": 40, "CVAR-3": 9, "CVAR-4": 7, "CVAR-5": 30, "CVAR-6": 6, "CVAR-7": 8 };
  const picked = selectChartProducts(rows, (x) => counts[x] ?? 0);
  assert.deepEqual(picked.map((p) => `${p.slug}:${p.xid}`), ["rebar-1:CVAR-3", "rebar-2:CVAR-4", "ipe:CVAR-1", "other:CVAR-7"]);
  assert.equal(PRICE_CHART_PER_FAMILY, 2);
  const many = Array.from({ length: 40 }, (_, i) => ({ xid: `CVAR-${i}`, productName: `p${i}`, productPagePath: `/products/p${i}`, size: "x", familyCode: `F${i}` }));
  assert.equal(selectChartProducts(many, () => 50).length, PRICE_CHART_MAX_PAGES);
});

test("chart series = the 90 days ending on today's price; line geometry is stable, old → new left to right", () => {
  const s = chartSeries(series(120, 3, (i) => 1000 + i), TODAY);
  assert.equal(s[0].day >= addDays(TODAY, -89), true);
  const g = lineGeometry(s.map((p) => ({ date: p.day, value: p.price })), addDays(TODAY, -89), TODAY, 640, 200);
  assert.equal(pathPointCount(g.path), s.length);
  assert.ok(g.start.x < g.end.x);
  assert.equal(g.end.y, 200 - 8, "today's (lowest) price at the bottom");
  assert.equal(lineGeometry([{ date: TODAY, value: 5 }], TODAY, TODAY).path, "M320 100", "a single point is centred");
});

test("copy: signals about the past only — no forecast, no 'buy now' advice", () => {
  const texts = [...allowedGaugeTexts(priceWindows(series(90, 2, (i) => 1000 + i), TODAY), 90, true), PRICE_CHART_COPY.body, PRICE_CHART_COPY.sectionBody, PRICE_CHART_COPY.description("x", "y")];
  assert.ok(texts.includes(PRICE_DECISION_COPY.cta) && PRICE_DECISION_COPY.cta === "قیمت قطعی برای حجم شما");
  assert.deepEqual(Object.values(PRICE_DECISION_COPY.position), ["ارزان", "متوسط", "گران"]);
  assert.match(PRICE_DECISION_COPY.note, /پیش‌بینی یا توصیه خرید نیست/);
  for (const t of texts) assert.doesNotMatch(t, /همین حالا بخرید|الان بخرید|پیش‌بینی می‌شود|افزایش خواهد|کاهش خواهد|بهترین زمان خرید/, t);
});
