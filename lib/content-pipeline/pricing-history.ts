import { publishedPriceHistoryRow, type PublishedPriceHistoryRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { isEarlierTehranDay, tehranDay } from "../pricing/price-history.ts";
import { PRICE_CLOCK_SKEW_MS, PRICE_EARLIEST_UTC, PRICE_IRR_PER_KG_BOUNDS, PRICING_FACTORY_KEYS, PRICING_I18N_KEYS, PRICING_POINT_KEYS, type PricingSource } from "./pricing.ts";

/**
 * W9.6 — Odoo public pricing API v1 `GET /api/v1/pricing/history?days=90` (W18.2; was 30) for the content pipeline: the
 * daily points of the product page's 30-day sparkline (lib/contracts/snapshot-prices.ts
 * §published_price_history). Same allow-list rule as /current (lib/content-pipeline/pricing.ts): every
 * documented key is listed below; any other key is ignored and reported, never stored.
 *
 * The history is decoration, never a reason to stop a publish: a failed fetch, a 404 or an invalid body
 * gives an EMPTY history (the sparkline is then simply not drawn) and one warning. A variant whose points
 * do not end on its current published price (e.g. a price published between the two requests), or that
 * has an invalid point, loses its history alone, with a warning.
 *
 * Stored per (variant, Tehran day): the day's last numeric point — the price in effect at the end of that
 * day. Only for variants that have a current published price. The factory, location and every other
 * field are read for validation only. Pure: no I/O, no clock.
 *
 * W20.7 add-on (owner 2026-10-16: prices publish twice a day, ≈11:30 and ≈13:30 Tehran; ▲/▼ % stays versus the
 * previous DAY): the v1 `previous` is the price the current one superseded, which after the second run can be the
 * same day's 11:30 price. `previousDay` keeps, per variant, the price in effect at the end of the latest Tehran day
 * before the current price's day (null when that was "price on request"), and `withPreviousDay` puts it into
 * `published_prices.previous_*` in place of a same-day previous.
 */
/** W18.2: 90 days (Odoo's maximum): the sparkline still draws the last 30 (sparklineSeries); the price-position gauge and the chart pages use 90. */
export const PRICING_HISTORY_DAYS = 90;
export const PRICING_HISTORY_PATH = `/api/v1/pricing/history?days=${PRICING_HISTORY_DAYS}`;

export const PRICING_HISTORY_ROW_KEYS = new Set(["id", "canonical_id", "canonical_template_id", "sku", "unit", "currency", "vat_included", "price_at_window_start", "prices"]);
export const PRICING_HISTORY_META_KEYS = new Set(["days", "total_prices", "updated_at_utc", "unit", "currency", "vat_included"]);
const ENVELOPE_KEYS = new Set(["data", "meta"]);
const API_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export interface PricingHistoryValidation {
  rows: PublishedPriceHistoryRow[];
  warnings: string[];
  ignored: string[];
  /** One line for the run summary. */
  summary: string;
  /**
   * W20.7 add-on: per variant with a usable history, the price in effect at the end of the latest Tehran day before
   * the current price's day (`null`: that was "price on request"). A variant with no point before that day is absent.
   */
  previousDay: Map<string, { price: number; at: string } | null>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function unknownKeys(where: string, value: Record<string, unknown>, allowed: ReadonlySet<string>, ignored: Set<string>): void {
  for (const k of Object.keys(value)) if (!allowed.has(k)) ignored.add(`${where}.${k}`);
}

interface Point {
  price: number | null;
  at: string;
}

/** One API point → a numeric or on-request point, or an error string. */
function readPoint(raw: unknown, fetchedAt: string, ignored: Set<string>): Point | string {
  if (!isObject(raw)) return "not an object";
  unknownKeys("history.point", raw, PRICING_POINT_KEYS, ignored);
  for (const k of ["factory", "location"] as const) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    if (!isObject(v)) return `${k}: not an object`;
    if (k === "factory") {
      unknownKeys("history.point.factory", v, PRICING_FACTORY_KEYS, ignored);
      if (isObject(v.name)) unknownKeys("history.point.factory.name", v.name, PRICING_I18N_KEYS, ignored);
    } else unknownKeys("history.point.location", v, PRICING_I18N_KEYS, ignored);
  }
  const at = raw.published_at_utc;
  if (typeof at !== "string" || !API_UTC.test(at) || Number.isNaN(Date.parse(at))) return `published_at_utc ${JSON.stringify(at)} is not an ISO 8601 UTC timestamp`;
  if (at < PRICE_EARLIEST_UTC) return `published_at_utc ${at} is before ${PRICE_EARLIEST_UTC}`;
  if (Date.parse(at) > Date.parse(fetchedAt) + PRICE_CLOCK_SKEW_MS) return `published_at_utc ${at} is in the future`;
  if (raw.price_on_request === true) return { price: null, at };
  if (raw.price_on_request !== false) return "price_on_request must be true or false";
  const p = raw.price_irr_per_kg;
  if (typeof p !== "number" || !Number.isSafeInteger(p) || p < PRICE_IRR_PER_KG_BOUNDS.min || p > PRICE_IRR_PER_KG_BOUNDS.max) return `price_irr_per_kg ${JSON.stringify(p)} is not a positive integer within the sanity bounds`;
  return { price: p, at };
}

/**
 * Validates the history source against the run's validated current prices (`current`, the
 * `published_prices` rows) and returns the daily points.
 */
export function validatePricingHistory(source: PricingSource | undefined, current: readonly PublishedPriceRow[], fetchedAt: string): PricingHistoryValidation {
  const ignored = new Set<string>();
  const warnings: string[] = [];
  const empty = (why: string): PricingHistoryValidation => {
    const summary = `EMPTY PRICE HISTORY: ${why}; no 30-day chart is drawn (prices and the catalog publish normally)`;
    return { rows: [], warnings: current.length ? [`pricing history: ${summary}`] : [], ignored: [...ignored].sort(), summary, previousDay: new Map() };
  };
  if (current.length === 0) return { rows: [], warnings: [], ignored: [], summary: "no price history (no published price)", previousDay: new Map() };
  if (!source || source.status === "not_deployed") return empty(`${PRICING_HISTORY_PATH} is not deployed (HTTP ${source?.http_status ?? "not fetched"})`);
  if (source.status === "failed") return empty(`GET ${PRICING_HISTORY_PATH} failed (${source.error ?? `HTTP ${source.http_status ?? "?"}`})`);
  const body = source.body;
  if (!isObject(body) || !Array.isArray(body.data) || !isObject(body.meta)) return empty("the history response is not {data: [...], meta: {...}}");
  unknownKeys("history.response", body, ENVELOPE_KEYS, ignored);
  unknownKeys("history.meta", body.meta, PRICING_HISTORY_META_KEYS, ignored);
  const meta = body.meta;
  if (meta.unit !== "kg" || meta.currency !== "IRR" || meta.vat_included !== true) return empty(`meta unit/currency/vat_included must be kg/IRR/true (got ${JSON.stringify([meta.unit, meta.currency, meta.vat_included])})`);

  const byId = new Map(current.map((r) => [r.canonical_variant_id, r]));
  const seen = new Set<string>();
  const rows: PublishedPriceHistoryRow[] = [];
  const previousDay = new Map<string, { price: number; at: string } | null>();
  for (const raw of body.data) {
    if (!isObject(raw)) return empty("a history row is not an object");
    unknownKeys("history.row", raw, PRICING_HISTORY_ROW_KEYS, ignored);
    const id = raw.canonical_id;
    if (typeof id !== "string") return empty("a history row has no canonical_id");
    if (seen.has(id)) return empty(`${id}: duplicate history row`);
    seen.add(id);
    const now = byId.get(id);
    if (!now) continue; // not priced on the site (on request, raw material, …): nothing to draw
    const drop = (why: string) => warnings.push(`pricing history: ${id}: ${why}; its chart is not drawn`);
    if (raw.unit !== "kg" || raw.currency !== "IRR" || raw.vat_included !== true) {
      drop("unit/currency/vat_included must be kg/IRR/true");
      continue;
    }
    if (!Array.isArray(raw.prices)) {
      drop("prices is not an array");
      continue;
    }
    const rawPoints = raw.price_at_window_start === null || raw.price_at_window_start === undefined ? raw.prices : [raw.price_at_window_start, ...raw.prices];
    const points: Point[] = [];
    let bad: string | null = null;
    for (const p of rawPoints) {
      const point = readPoint(p, fetchedAt, ignored);
      if (typeof point === "string") {
        bad = point;
        break;
      }
      points.push(point);
    }
    if (bad) {
      drop(bad);
      continue;
    }
    if (points.some((p, i) => i > 0 && p.at < points[i - 1].at)) {
      drop("points are not oldest first");
      continue;
    }
    const last = points[points.length - 1];
    if (!last || last.price !== now.price_irr_per_kg || last.at !== now.published_at) {
      drop("its newest point is not the current published price (published between the two requests?)");
      continue;
    }
    // The price in effect at the end of each Tehran day: the day's last point (an on-request one = no price that day).
    const byDay = new Map<string, Point>();
    for (const p of points) byDay.set(tehranDay(p.at)!, p);
    // W20.7 add-on: the last point before the current price's day (points are oldest first).
    const closing = points.filter((p) => isEarlierTehranDay(p.at, now.published_at)).at(-1);
    if (closing) previousDay.set(id, closing.price === null ? null : { price: closing.price, at: closing.at });
    for (const [day, p] of byDay) {
      if (p.price === null) continue;
      const row = publishedPriceHistoryRow.safeParse({ canonical_variant_id: id, day, price_irr_per_kg: p.price, published_at: p.at });
      if (row.success) rows.push(row.data);
    }
  }
  rows.sort((a, b) => (a.canonical_variant_id === b.canonical_variant_id ? (a.day < b.day ? -1 : 1) : a.canonical_variant_id < b.canonical_variant_id ? -1 : 1));
  const ignoredList = [...ignored].sort();
  if (ignoredList.length) warnings.push(`pricing history: ignored ${ignoredList.length} field(s) the website does not know (never stored or rendered): ${ignoredList.join(", ")}`);
  const variants = new Set(rows.map((r) => r.canonical_variant_id)).size;
  return { rows, warnings, ignored: ignoredList, summary: `${rows.length} daily point(s) for ${variants} priced variant(s)`, previousDay };
}

/**
 * W20.7 add-on — `published_prices` with ▲/▼ measured against the previous Tehran day: a row whose `previous` is
 * from the SAME day as its current price (the twice-a-day publication) gets the previous day's closing price from
 * `previousDay` instead (or no previous when that day closed on request). A row with no previous, or with one from
 * an earlier day, is unchanged; so is a same-day one without a usable history (the display then shows no change).
 */
export function withPreviousDay(rows: readonly PublishedPriceRow[], previousDay: ReadonlyMap<string, { price: number; at: string } | null>): PublishedPriceRow[] {
  return rows.map((row) => {
    if (row.previous_published_at === null || isEarlierTehranDay(row.previous_published_at, row.published_at) || !previousDay.has(row.canonical_variant_id)) return row;
    const ref = previousDay.get(row.canonical_variant_id);
    return { ...row, previous_price_irr_per_kg: ref?.price ?? null, previous_published_at: ref?.at ?? null };
  });
}
