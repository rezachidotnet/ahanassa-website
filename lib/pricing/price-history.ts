/**
 * W9.6 — price change and 30-day trend (owner-approved 2026-10-09). Pure and dependency-free: the
 * content pipeline, the build-time pages and the publication gate share it, so all three agree.
 *
 * Owner rules:
 * - ▲/▼ + % only when a previous published price exists from an EARLIER Tehran day than the current one
 *   (a same-day correction is not a "previous day"); otherwise nothing is rendered.
 * - The sparkline only with at least SPARKLINE_MIN_POINTS daily points in the 30 days ending on the
 *   current price's day; otherwise nothing is rendered (no empty box).
 */
const TEHRAN = "Asia/Tehran";

/** Daily points needed before a sparkline is drawn (owner: ≥ 7). Parameter. */
export const SPARKLINE_MIN_POINTS = 7;
/** The trend window, in days, ending on the current price's day (inclusive). Parameter. */
export const SPARKLINE_WINDOW_DAYS = 30;

const dayFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TEHRAN });

/** The Tehran calendar day of an instant, as YYYY-MM-DD (Gregorian). `null` for an invalid timestamp. */
export function tehranDay(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dayFormat.format(d);
}

/** True when `previousIso` falls on an earlier Tehran day than `currentIso`. */
export function isEarlierTehranDay(previousIso: string | null | undefined, currentIso: string): boolean {
  if (!previousIso) return false;
  const p = tehranDay(previousIso);
  const c = tehranDay(currentIso);
  return p !== null && c !== null && p < c;
}

export interface PriceChangeValue {
  direction: "up" | "down" | "none";
  /** Absolute change in percent, rounded to one decimal (1.2 = 1.2 %); 0 when unchanged. */
  percent: number;
}

/** Current vs previous price, rounded to 0.1 %. `null` when either price is not a positive number. */
export function priceChange(current: number, previous: number | null | undefined): PriceChangeValue | null {
  const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!ok(current) || !ok(previous)) return null;
  const rounded = Math.round(((current - previous) / previous) * 1000) / 10;
  if (rounded === 0) return { direction: "none", percent: 0 };
  return { direction: rounded > 0 ? "up" : "down", percent: Math.abs(rounded) };
}

export interface DailyPoint {
  /** Tehran day, YYYY-MM-DD. */
  day: string;
  price: number;
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * The points a sparkline draws: one per day, oldest first, within the SPARKLINE_WINDOW_DAYS days ending on
 * `currentDay`. `null` when fewer than SPARKLINE_MIN_POINTS (render nothing). Duplicate days keep the last.
 */
export function sparklineSeries(points: readonly DailyPoint[], currentDay: string): DailyPoint[] | null {
  const first = addDays(currentDay, -(SPARKLINE_WINDOW_DAYS - 1));
  const byDay = new Map<string, number>();
  for (const p of points) if (p.day >= first && p.day <= currentDay && Number.isFinite(p.price) && p.price > 0) byDay.set(p.day, p.price);
  const series = [...byDay].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, price]) => ({ day, price }));
  return series.length >= SPARKLINE_MIN_POINTS ? series : null;
}

export interface SparklineGeometry {
  /** SVG path data (`M x y L x y …`). */
  path: string;
  /** The last point (the current price), for the end marker. */
  end: { x: number; y: number };
  width: number;
  height: number;
}

/**
 * Inline-SVG geometry for a series: x by calendar day across the whole window (gaps stay gaps in time),
 * y scaled between the series' min and max with `pad` px top and bottom. A flat series is drawn mid-height.
 * Coordinates are rounded to 0.1 px so the static HTML is stable.
 */
export function sparklineGeometry(series: readonly DailyPoint[], currentDay: string, width = 240, height = 48, pad = 4): SparklineGeometry {
  const first = Date.parse(`${addDays(currentDay, -(SPARKLINE_WINDOW_DAYS - 1))}T00:00:00Z`);
  const span = (SPARKLINE_WINDOW_DAYS - 1) * 86_400_000;
  const prices = series.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const r = (v: number) => Math.round(v * 10) / 10;
  const coords = series.map((p) => {
    const x = r(pad + ((Date.parse(`${p.day}T00:00:00Z`) - first) / span) * (width - 2 * pad));
    const y = r(max === min ? height / 2 : pad + ((max - p.price) / (max - min)) * (height - 2 * pad));
    return { x, y };
  });
  return { path: coords.map((c, i) => `${i ? "L" : "M"}${c.x} ${c.y}`).join(" "), end: coords[coords.length - 1], width, height };
}
