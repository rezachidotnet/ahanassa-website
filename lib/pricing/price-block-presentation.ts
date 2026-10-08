import type { Locale } from "@/config/locales";

/**
 * Product-page Price block — pure presentation (W10.2, owner decision
 * D-W10-4; W10.0 report §5.6). The component (components/products/price-block.tsx)
 * is built now but rendered on no page: the pricing data arrives in a later
 * task, which wires a `PriceBlockData` into it.
 *
 * Content rules (D-W10-4):
 * - Persian pages only — any other locale presents nothing.
 * - Price in Toman per kg, always «شامل ارزش افزوده» (owner: always true),
 *   the factory name, the delivery location («درب کارخانه» / «انبار تهران»…),
 *   the date and its age, the change since the last price only when a
 *   previous price exists, the fixed line «برای قیمت روز استعلام بگیرید»,
 *   and an RFQ CTA.
 * - Never an empty value: if any required field is missing or invalid the
 *   whole block falls back to the "missing price" variant («استعلام قیمت» +
 *   the RFQ CTA) — never a blank, "null", "NaN" or 0 amount.
 * - The data type has no field for where a price was collected, so the
 *   block cannot show a source website; and it emits no JSON-LD `offers`.
 * - The change is shown in neutral colours (not red/green): the brand is a
 *   procurement partner, not a price board.
 */
export interface PriceBlockData {
  /** Integer Toman per kilogram, VAT included. */
  tomanPerKg: number;
  factoryName: string;
  /** e.g. «درب کارخانه», «انبار تهران». */
  deliveryLocation: string;
  /** ISO 8601 timestamp of this price. */
  pricedAt: string;
  /** The previous price for the same item, when one exists. */
  previousTomanPerKg?: number | null;
  /** ISO 8601 timestamp of the previous price. */
  previousPricedAt?: string | null;
}

export const PRICE_BLOCK_COPY = {
  title: "قیمت روز",
  unit: "تومان / کیلوگرم",
  vat: "شامل ارزش افزوده",
  factory: "کارخانه",
  delivery: "محل تحویل",
  updated: "به‌روزرسانی",
  askToday: "برای قیمت روز استعلام بگیرید",
  missing: "استعلام قیمت",
  cta: "ارسال درخواست استعلام",
  unchanged: "بدون تغییر",
  since: (date: string) => `نسبت به ${date}`,
} as const;

export interface PriceChange {
  direction: "up" | "down" | "none";
  /** e.g. «۱٫۲٪» — absent when unchanged. */
  percent: string | null;
  /** e.g. «نسبت به ۱۲ مهر ۱۴۰۵». */
  since: string;
}

export type PriceBlockPresentation =
  | { kind: "price"; amount: string; unit: string; vat: string; factoryName: string; deliveryLocation: string; datetime: string; dateLabel: string; change: PriceChange | null }
  | { kind: "missing" };

const TEHRAN = "Asia/Tehran";

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const positiveNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
function validDate(iso: unknown): Date | null {
  if (!nonBlank(iso)) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatPersianToman(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** «۱۵ مهر ۱۴۰۵ ساعت ۹:۳۰» — Persian calendar, Tehran time (the static build may run in any time zone). */
export function formatPersianDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short", timeZone: TEHRAN }).format(date);
}

export function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: TEHRAN }).format(date);
}

/**
 * «۳ ساعت پیش» — computed in the browser against the visitor's clock (the
 * page is static and rebuilt daily, so an age baked in at build time would
 * be wrong). Returns null for a future or invalid timestamp.
 */
export function formatPriceAge(pricedAt: string, now: Date): string | null {
  const d = validDate(pricedAt);
  if (!d) return null;
  const seconds = (now.getTime() - d.getTime()) / 1000;
  if (seconds < 0) return null;
  const rtf = new Intl.RelativeTimeFormat("fa", { numeric: "auto" });
  if (seconds < 3600) return rtf.format(-Math.max(1, Math.floor(seconds / 60)), "minute");
  if (seconds < 86_400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  return rtf.format(-Math.floor(seconds / 86_400), "day");
}

function presentChange(current: number, data: PriceBlockData): PriceChange | null {
  const previousDate = validDate(data.previousPricedAt);
  if (!positiveNumber(data.previousTomanPerKg) || !previousDate) return null;
  const since = PRICE_BLOCK_COPY.since(formatPersianDate(previousDate));
  const ratio = (current - data.previousTomanPerKg) / data.previousTomanPerKg;
  const rounded = Math.round(ratio * 1000) / 10;
  if (rounded === 0) return { direction: "none", percent: null, since };
  const percent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(Math.abs(rounded));
  return { direction: rounded > 0 ? "up" : "down", percent: `${percent}٪`, since };
}

/** Everything the block shows, or the "missing price" variant; `null` = render nothing (non-Persian page). */
export function presentPriceBlock(locale: Locale, data: PriceBlockData | null | undefined): PriceBlockPresentation | null {
  if (locale !== "fa") return null;
  if (!data) return { kind: "missing" };
  const pricedAt = validDate(data.pricedAt);
  if (!positiveNumber(data.tomanPerKg) || !nonBlank(data.factoryName) || !nonBlank(data.deliveryLocation) || !pricedAt) return { kind: "missing" };
  return {
    kind: "price",
    amount: formatPersianToman(data.tomanPerKg),
    unit: PRICE_BLOCK_COPY.unit,
    vat: PRICE_BLOCK_COPY.vat,
    factoryName: data.factoryName.trim(),
    deliveryLocation: data.deliveryLocation.trim(),
    datetime: pricedAt.toISOString(),
    dateLabel: formatPersianDateTime(pricedAt),
    change: presentChange(data.tomanPerKg, data),
  };
}
