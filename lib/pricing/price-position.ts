import { addDays } from "../charts/line-geometry.ts";
import type { DailyPoint } from "./price-history.ts";

/**
 * W18.2 — the price-position gauge of the fa product page's decision block (and of the chart pages): where TODAY's
 * published price sits between the lowest and the highest of Ahan Asa's own published daily prices over the last
 * 30 and 90 days. Pure and dependency-free: the build-time pages and the publication gate (lib/static/price-gate.ts
 * rule 9) both call it, so the page can only show what the snapshot gives.
 *
 * A SIGNAL about the past, never a forecast or advice: the copy says «ارزان / متوسط / گران نسبت به N روز گذشته»
 * against our own history, nothing about tomorrow, and never "buy now".
 *
 * Rules (parameters below):
 * - A window is the `days` calendar days ending on the current price's Tehran day (inclusive); its points are the
 *   daily closing prices in it (days without a publication are simply absent).
 * - A window is shown only with ≥ POSITION_MIN_POINTS points; the 90-day window only when it reaches further back
 *   than the 30-day one (a point older than 30 days) — otherwise it would repeat the 30-day row.
 * - position = (today − min) / (max − min) (owner 2026-10-16: 25/50/25): the lowest quarter «ارزان» (low, ≤ 0.25),
 *   the top quarter «گران» (high, ≥ 0.75), the middle half «متوسط» (mid). A flat
 *   window (min = max) is «متوسط» at the middle.
 */
export const POSITION_WINDOWS = [30, 90] as const;
export type PositionWindow = (typeof POSITION_WINDOWS)[number];
/** Daily points a window needs before it is shown (the same floor as the 30-day sparkline). Parameter. */
export const POSITION_MIN_POINTS = 7;
/** The quarters that split low / mid / high: 25 % / 50 % / 25 % of the window's range (owner 2026-10-16). Parameter. */
export const POSITION_LOW_MAX = 0.25;
export const POSITION_HIGH_MIN = 0.75;

export type PricePosition = "low" | "mid" | "high";

export interface WindowStats {
  window: PositionWindow;
  /** Daily points in the window (the current day included). */
  points: number;
  /** Toman/kg, whole numbers. */
  min: number;
  max: number;
  avg: number;
  today: number;
  /** 0 (= the window's lowest) … 1 (= its highest), rounded to 0.001. */
  fraction: number;
  position: PricePosition;
  /** The window's first calendar day (YYYY-MM-DD). */
  from: string;
}

/** The window's daily points, oldest first (duplicate days keep the last; invalid prices dropped). */
export function windowPoints(points: readonly DailyPoint[], currentDay: string, days: number): DailyPoint[] {
  const first = addDays(currentDay, -(days - 1));
  const byDay = new Map<string, number>();
  for (const p of points) if (p.day >= first && p.day <= currentDay && Number.isFinite(p.price) && p.price > 0) byDay.set(p.day, p.price);
  return [...byDay].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, price]) => ({ day, price }));
}

export function positionOf(fraction: number): PricePosition {
  return fraction <= POSITION_LOW_MAX ? "low" : fraction >= POSITION_HIGH_MIN ? "high" : "mid";
}

/** One window's statistics, or null when it has fewer than POSITION_MIN_POINTS points or no point on `currentDay`. */
export function windowStats(points: readonly DailyPoint[], currentDay: string, window: PositionWindow): WindowStats | null {
  const series = windowPoints(points, currentDay, window);
  const today = series[series.length - 1];
  if (series.length < POSITION_MIN_POINTS || !today || today.day !== currentDay) return null;
  const prices = series.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const fraction = max === min ? 0.5 : Math.round(((today.price - min) / (max - min)) * 1000) / 1000;
  return { window, points: series.length, min, max, avg, today: today.price, fraction, position: positionOf(fraction), from: addDays(currentDay, -(window - 1)) };
}

/** The windows the gauge shows (30, then 90 when it adds older days), possibly none. */
export function priceWindows(points: readonly DailyPoint[], currentDay: string): WindowStats[] {
  const out: WindowStats[] = [];
  const w30 = windowStats(points, currentDay, 30);
  if (w30) out.push(w30);
  const reachesBack = points.some((p) => p.day < addDays(currentDay, -29) && p.day >= addDays(currentDay, -89));
  const w90 = reachesBack ? windowStats(points, currentDay, 90) : null;
  if (w90) out.push(w90);
  return out;
}
