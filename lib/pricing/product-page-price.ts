import type { Locale } from "@/config/locales";
import { irrToToman, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { formatNumber } from "../weight-calculator/format.ts";
import { formatPersianDate, formatPersianToman, PRICE_BLOCK_COPY, presentPriceBlock, type PriceBlockData } from "./price-block-presentation.ts";
import { formatArabicDate, isPriceLocale, type PriceLocale } from "./price-locale.ts";

export { formatArabicDate, isPriceLocale, PRICE_LOCALES, priceDateLabel, type PriceLocale } from "./price-locale.ts";

/**
 * W9.4 — the daily price on product pages. Pure: the snapshot's `published_prices` row → the W10.2
 * `PriceBlockData`, and the compact cell of the variant table.
 *
 * Which locale shows what (owner decision change 2026-10-09 10:11 Tehran, replacing "fa only"):
 * - fa: price + factory + delivery location + VAT included + date (the PriceBlock and the «قیمت روز» column);
 * - ar: PRICE ONLY — Toman amount + date label + the VAT-included note; never the factory or the
 *   delivery location (the «سعر اليوم» column; no PriceBlock);
 * - en: nothing — no column, no price data in the HTML or the Flight payload.
 *
 * The rendered price markup carries `data-aa-price-cell` / `data-aa-price-block` with the variant's
 * public canonical id, so the publication gate (lib/static/price-gate.ts) can check that the text
 * inside is exactly the allow-listed fields of that variant's snapshot row for that locale.
 */

export const PRICE_CELL_ATTRIBUTE = "data-aa-price-cell";
export const PRICE_BLOCK_ATTRIBUTE = "data-aa-price-block";
/** `data-aa-price-block` value when the template has no priced variant (missing-price variant). */
export const PRICE_BLOCK_ON_REQUEST = "request";

/**
 * ar labels — PROPOSED, pending the owner's approval (2026-10-09): «سعر اليوم»، «تومان/كغ»،
 * «شامل ضريبة القيمة المضافة» (the calculator's «تقدير التكلفة» lives in lib/weight-calculator/copy.ts).
 * `missing` («السعر عند الطلب», the cell of an unpriced variant) is an addition, also pending approval.
 * Arabic letters only (ي ك, never Persian ی ک) — the leak scan flags Persian on ar pages.
 */
export const AR_PRICE_COPY = {
  header: "سعر اليوم",
  unit: "تومان/كغ",
  vat: "شامل ضريبة القيمة المضافة",
  missing: "السعر عند الطلب",
} as const;

export const PRICE_COLUMN_COPY: Record<PriceLocale, { header: string; unit: string; missing: string; note: string }> = {
  fa: {
    header: PRICE_BLOCK_COPY.title,
    unit: PRICE_BLOCK_COPY.unit,
    missing: PRICE_BLOCK_COPY.missing,
    note: "قیمت‌ها به تومان برای هر کیلوگرم و شامل ارزش افزوده است؛ قیمت قطعی پس از استعلام اعلام می‌شود.",
  },
  ar: { header: AR_PRICE_COPY.header, unit: AR_PRICE_COPY.unit, missing: AR_PRICE_COPY.missing, note: AR_PRICE_COPY.vat },
};

/** The Toman/kg amount as the page shows it (fa: «۴۸٬۹۴۷»; ar: «٤٨٬٩٤٧»). */
export function formatTomanAmount(locale: PriceLocale, toman: number): string {
  return locale === "fa" ? formatPersianToman(toman) : formatNumber("ar", toman, 0);
}

/** Snapshot row → the typed prop of the W10.2 PriceBlock (Toman = IRR ÷ 10; no source field exists). */
export function priceBlockDataFromRow(row: PublishedPriceRow): PriceBlockData {
  return {
    tomanPerKg: irrToToman(row.price_irr_per_kg),
    factoryName: row.factory_name_fa,
    deliveryLocation: row.location_fa,
    pricedAt: row.published_at,
    previousTomanPerKg: row.previous_price_irr_per_kg === null ? null : irrToToman(row.previous_price_irr_per_kg),
    previousPricedAt: row.previous_published_at,
  };
}

export type PriceCellPresentation =
  | { kind: "price"; amount: string; /** fa only (ar never shows factory/location). */ place: string | null; /** fa only (ar carries no timestamp). */ datetime: string | null; dateLabel: string }
  | { kind: "missing"; label: string };

/** Table cell: fa amount + factory/location + date; ar amount + date; or the missing label. `null` = no column (en). */
export function presentPriceCell(locale: Locale, data: PriceBlockData | null | undefined): PriceCellPresentation | null {
  if (!isPriceLocale(locale)) return null;
  // Validity is the PriceBlock's (never an empty/0/NaN value), whatever the locale shows of it.
  const view = presentPriceBlock("fa", data);
  if (!view) return null;
  if (view.kind === "missing" || !data) return { kind: "missing", label: PRICE_COLUMN_COPY[locale].missing };
  if (locale === "ar") return { kind: "price", amount: formatTomanAmount("ar", data.tomanPerKg), place: null, datetime: null, dateLabel: formatArabicDate(new Date(view.datetime)) };
  return { kind: "price", amount: view.amount, place: `${view.factoryName}، ${view.deliveryLocation}`, datetime: view.datetime, dateLabel: formatPersianDate(new Date(view.datetime)) };
}

/** The page's main priced variant: the first one, in the table's order, that has a price. */
export function firstPricedVariant<T extends { xid: string }>(orderedVariants: readonly T[], prices: ReadonlyMap<string, PriceBlockData>): T | null {
  return orderedVariants.find((v) => prices.has(v.xid)) ?? null;
}

/** Every string the price markup of one variant may show on a page of `locale` (the gate's allow-list). */
export function allowedPriceTexts(row: PublishedPriceRow | null, locale: PriceLocale = "fa", productName?: string): string[] {
  if (locale === "ar") {
    const out: string[] = [...Object.values(AR_PRICE_COPY)];
    if (row) out.push(renderedAmount(row, "ar"), formatArabicDate(new Date(row.published_at)));
    return out;
  }
  const fixed = [PRICE_BLOCK_COPY.title, PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.vat, PRICE_BLOCK_COPY.factory, PRICE_BLOCK_COPY.delivery, PRICE_BLOCK_COPY.updated, PRICE_BLOCK_COPY.askToday, PRICE_BLOCK_COPY.missing, PRICE_BLOCK_COPY.cta, PRICE_BLOCK_COPY.unchanged];
  const out: string[] = [...fixed];
  if (productName) out.push(productName);
  if (!row) return out;
  const data = priceBlockDataFromRow(row);
  const view = presentPriceBlock("fa", data);
  if (view?.kind === "price") {
    out.push(view.amount, view.factoryName, view.deliveryLocation, view.dateLabel, formatPersianDate(new Date(view.datetime)));
    if (view.change) {
      out.push(view.change.since);
      if (view.change.percent) out.push(view.change.percent);
    }
  }
  return out;
}

/** The formatted amount a variant's price shows on a page of `locale` (the gate looks for it outside the price markup and on en). */
export function renderedAmount(row: PublishedPriceRow, locale: PriceLocale = "fa"): string {
  return formatTomanAmount(locale, irrToToman(row.price_irr_per_kg));
}
