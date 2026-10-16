/**
 * W18.2 — inline-SVG line geometry shared by the price chart pages, the decision block's mini trend and the
 * market-indicator charts. Pure and dependency-free (the publication gate re-derives what a chart may draw).
 *
 * x is by calendar time across the whole domain (gaps stay gaps in time), y between the series' min and max with
 * `pad` px top and bottom (a flat series is drawn mid-height). x always runs old → new, left to right, whatever the
 * page direction. Coordinates are rounded to 0.1 px so the static HTML is stable between builds.
 */
export interface LinePoint {
  /** YYYY-MM-DD (a calendar day; a monthly value is dated the 1st of its month). */
  date: string;
  value: number;
}

export interface LineGeometry {
  /** SVG path data (`M x y L x y …`). */
  path: string;
  /** The first and last point (the newest value carries the end marker). */
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** The y of the min and max values (the axis labels sit next to them). */
  min: number;
  max: number;
  width: number;
  height: number;
}

const dayMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** `date` moved by `delta` calendar days (YYYY-MM-DD). */
export function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Geometry for `points` (oldest first, at least one) over the domain `[from, to]` (YYYY-MM-DD, inclusive). A
 * single-day domain puts every point at the middle.
 */
export function lineGeometry(points: readonly LinePoint[], from: string, to: string, width = 640, height = 200, pad = 8): LineGeometry {
  const x0 = dayMs(from);
  const span = Math.max(dayMs(to) - x0, 0);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = (v: number) => Math.round(v * 10) / 10;
  const coords = points.map((p) => ({
    x: r(span === 0 ? width / 2 : pad + ((dayMs(p.date) - x0) / span) * (width - 2 * pad)),
    y: r(max === min ? height / 2 : pad + ((max - p.value) / (max - min)) * (height - 2 * pad)),
  }));
  const yOf = (v: number) => r(max === min ? height / 2 : pad + ((max - v) / (max - min)) * (height - 2 * pad));
  return { path: coords.map((c, i) => `${i ? "L" : "M"}${c.x} ${c.y}`).join(" "), start: coords[0], end: coords[coords.length - 1], min: yOf(min), max: yOf(max), width, height };
}

/** The number of points a path draws (the gate re-counts a chart's line against the snapshot). */
export function pathPointCount(path: string): number {
  return (path.match(/[ML]-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?/g) ?? []).length;
}
