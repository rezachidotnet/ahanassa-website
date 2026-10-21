/**
 * W23 — the fixed basket, deterministic: which page row stands for each basket item today, whether it is valid,
 * and its change against the last business day (and, on Saturday, the week) for the SAME variant + factory +
 * delivery place + unit. Pure: no clock, no network.
 */
import crypto from "node:crypto";
import { BASKET, CHANNEL_CONFIG, type BasketItem } from "../../config/price-channel.ts";
import { addDays, tehranDate } from "./calendar.ts";
import type { PageRow, PricePage } from "./source.ts";

/** The one unit the bulletin knows: the fa table's Toman per kilogram, VAT included. */
export const UNIT = "toman/kg" as const;

/** A validated price of the day of a basket variant, as kept in the history. */
export interface ObservedRow {
  variant: string;
  factory: string;
  location: string;
  unit: typeof UNIT;
  toman: number;
  publishedAt: string;
}

/** The validated basket rows of one price day (the morning bulletin's data). */
export interface DayObservation {
  date: string;
  data_version: string;
  snapshot_version: string | null;
  fetched_at: string;
  rows: ObservedRow[];
}

export interface Change {
  direction: "up" | "down" | "none";
  /** |change| in percent, rounded to 0.1 (what the post shows). */
  percent: number;
  /** The exact signed change in percent (what the rules test). */
  exact: number;
}

export interface BasketLine {
  item: BasketItem;
  status: "ok" | "missing";
  /** Why an item is missing (logs and the owner alert only; the post says «به‌روزرسانی نشده»). */
  reason: string | null;
  row: ObservedRow | null;
  /** vs the last business day with a valid price for the same key; null = nothing comparable. */
  daily: Change | null;
  dailyBase: { date: string; toman: number } | null;
  weekly: Change | null;
  weeklyBase: { date: string; toman: number } | null;
}

export interface BasketEvaluation {
  date: string;
  lines: BasketLine[];
  validCount: number;
  unitOk: boolean;
  /** Every validated price of the day of every basket variant (all factories): the history entry of the day. */
  rows: ObservedRow[];
  data_version: string;
}

export type ChannelConfig = typeof CHANNEL_CONFIG;

export function change(current: number, previous: number): Change | null {
  if (!(current > 0) || !(previous > 0)) return null;
  const exact = ((current - previous) / previous) * 100;
  const rounded = Math.round(exact * 10) / 10;
  return { direction: rounded === 0 ? "none" : rounded > 0 ? "up" : "down", percent: Math.abs(rounded), exact };
}

export const sameKey = (a: Pick<ObservedRow, "variant" | "factory" | "location" | "unit">, b: Pick<ObservedRow, "variant" | "factory" | "location" | "unit">) =>
  a.variant === b.variant && a.factory === b.factory && a.location === b.location && a.unit === b.unit;

const sizeKey = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** The page shows the product the item expects for its variant. */
export function matchesExpectation(item: BasketItem, row: PageRow): boolean {
  return row.productName.includes(item.expect.name) && sizeKey(row.size) === sizeKey(item.expect.size);
}

function validOfDay(row: PageRow, date: string, config: ChannelConfig): boolean {
  return Number.isSafeInteger(row.toman) && row.toman >= config.priceRange.min && row.toman <= config.priceRange.max && tehranDate(row.publishedAt) === date;
}

const observed = (r: PageRow): ObservedRow => ({ variant: r.variant, factory: r.factory, location: r.location, unit: UNIT, toman: r.toman, publishedAt: r.publishedAt });

/** Picks the row of the day for an item: the first preferred factory with a price of the day, else the lowest. */
export function selectRow(item: BasketItem, candidates: readonly PageRow[]): PageRow | null {
  if (!candidates.length) return null;
  if (item.factories.length) {
    for (const pref of item.factories) {
      const hit = candidates.find((r) => r.factory === pref.factory && (pref.location === undefined || r.location === pref.location));
      if (hit) return hit;
    }
    return null;
  }
  return [...candidates].sort((a, b) => a.toman - b.toman || a.rank - b.rank || a.factory.localeCompare(b.factory))[0];
}

/** The newest history price for the same key before `date`, within the lookback. */
export function previousFor(key: ObservedRow, date: string, history: readonly DayObservation[], lookbackDays: number): { date: string; toman: number } | null {
  const oldest = addDays(date, -lookbackDays);
  const days = history.filter((d) => d.date < date && d.date >= oldest).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const d of days) {
    const r = d.rows.find((x) => sameKey(x, key));
    if (r) return { date: d.date, toman: r.toman };
  }
  return null;
}

/** The oldest history price for the same key in the 7 days before `date` (the weekly review's base). */
export function weekBaseFor(key: ObservedRow, date: string, history: readonly DayObservation[]): { date: string; toman: number } | null {
  const oldest = addDays(date, -7);
  const days = history.filter((d) => d.date < date && d.date >= oldest).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const d of days) {
    const r = d.rows.find((x) => sameKey(x, key));
    if (r) return { date: d.date, toman: r.toman };
  }
  return null;
}

export function dataVersion(snapshotVersion: string | null, rows: readonly ObservedRow[]): string {
  const canon = rows.map((r) => [r.variant, r.factory, r.location, r.unit, r.toman, r.publishedAt].join("|")).sort().join("\n");
  return `${snapshotVersion ?? "snap-unknown"}:${crypto.createHash("sha256").update(canon).digest("hex").slice(0, 16)}`;
}

export function evaluateBasket(input: {
  page: PricePage;
  date: string;
  history: readonly DayObservation[];
  snapshotVersion: string | null;
  weekly?: boolean;
  basket?: readonly BasketItem[];
  config?: ChannelConfig;
}): BasketEvaluation {
  const basket = input.basket ?? BASKET;
  const config = input.config ?? CHANNEL_CONFIG;
  const unitOk = input.page.unitTomanPerKg;
  const rows: ObservedRow[] = [];
  const lines: BasketLine[] = basket.map((item) => {
    const empty = { row: null, daily: null, dailyBase: null, weekly: null, weeklyBase: null };
    const ofVariant = input.page.rows.filter((r) => r.variant === item.variant);
    if (!ofVariant.length) return { item, status: "missing", reason: "variant not on the price page", ...empty };
    if (!ofVariant.every((r) => matchesExpectation(item, r))) return { item, status: "missing", reason: "the page shows another product or size for this variant", ...empty };
    if (!unitOk) return { item, status: "missing", reason: "the page does not state Toman per kilogram", ...empty };
    const fresh = ofVariant.filter((r) => validOfDay(r, input.date, config));
    rows.push(...fresh.map(observed));
    const chosen = selectRow(item, fresh);
    if (!chosen) return { item, status: "missing", reason: ofVariant.some((r) => r.toman <= 0) ? "zero or invalid price" : "no validated price of the day", ...empty };
    const row = observed(chosen);
    const dailyBase = previousFor(row, input.date, input.history, config.compareLookbackDays);
    const weeklyBase = input.weekly ? weekBaseFor(row, input.date, input.history) : null;
    return {
      item,
      status: "ok",
      reason: null,
      row,
      daily: dailyBase ? change(row.toman, dailyBase.toman) : null,
      dailyBase,
      weekly: weeklyBase ? change(row.toman, weeklyBase.toman) : null,
      weeklyBase,
    };
  });
  const sorted = rows.sort((a, b) => a.variant.localeCompare(b.variant) || a.factory.localeCompare(b.factory) || a.location.localeCompare(b.location));
  return { date: input.date, lines, validCount: lines.filter((l) => l.status === "ok").length, unitOk, rows: sorted, data_version: dataVersion(input.snapshotVersion, sorted) };
}

export interface PrePublishCheck {
  ok: boolean;
  problems: string[];
}

/** Freshness, unit, zero/missing values and the ≥ minValidItems rule. */
export function prePublishCheck(e: BasketEvaluation, config: ChannelConfig = CHANNEL_CONFIG): PrePublishCheck {
  const problems: string[] = [];
  if (!e.unitOk) problems.push("the price page does not state Toman per kilogram");
  if (e.validCount < config.minValidItems) problems.push(`only ${e.validCount} of ${e.lines.length} basket items have a validated price of the day (need ${config.minValidItems})`);
  for (const l of e.lines) if (l.status === "ok" && !(l.row && l.row.toman > 0)) problems.push(`${l.item.id}: zero price`);
  return { ok: problems.length === 0, problems };
}

/** Basket items whose daily change is large enough to need a second look. */
export function suspiciousJumps(e: BasketEvaluation, config: ChannelConfig = CHANNEL_CONFIG): BasketLine[] {
  return e.lines.filter((l) => l.daily && Math.abs(l.daily.exact) >= config.suspiciousJumpPercent);
}

/** The second fetch confirms every suspicious price exactly (same key, same amount). */
export function jumpsConfirmed(suspicious: readonly BasketLine[], recheck: BasketEvaluation): boolean {
  return suspicious.every((s) => recheck.lines.some((l) => l.item.id === s.item.id && l.row && s.row && sameKey(l.row, s.row) && l.row.toman === s.row.toman));
}

export interface ExceptionMove {
  item: BasketItem;
  morning: ObservedRow;
  now: ObservedRow;
  change: Change;
}

/**
 * Exception rule: against the morning bulletin, the same key's price of the day moved ≥ `percent` for at least
 * `items` basket items. Items the morning bulletin did not carry, or that have no price of the day now, never count.
 */
export function exceptionMoves(morning: readonly BasketLine[], now: BasketEvaluation, config: ChannelConfig = CHANNEL_CONFIG): { trigger: boolean; moves: ExceptionMove[] } {
  const moves: ExceptionMove[] = [];
  for (const m of morning) {
    if (m.status !== "ok" || !m.row) continue;
    const current = now.rows.find((r) => sameKey(r, m.row!));
    if (!current) continue;
    const c = change(current.toman, m.row.toman);
    if (c && Math.abs(c.exact) >= config.exception.percent) moves.push({ item: m.item, morning: m.row, now: current, change: c });
  }
  moves.sort((a, b) => Math.abs(b.change.exact) - Math.abs(a.change.exact));
  return { trigger: moves.length >= config.exception.items, moves };
}
