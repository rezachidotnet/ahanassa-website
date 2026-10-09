import type { Locale } from "@/config/locales";
import { irrToToman, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { formatNumber } from "../weight-calculator/format.ts";
import { formatPersianDate, formatPersianToman, PRICE_BLOCK_COPY, presentPriceBlock, type PriceBlockData } from "./price-block-presentation.ts";
import { formatArabicDate, isPriceLocale, PRICE_DISCLAIMER, type PriceLocale } from "./price-locale.ts";
import { isEarlierTehranDay, priceChange } from "./price-history.ts";
import { PRICE_RFQ_COPY, priceRfqHref } from "./price-rfq.ts";

export { formatArabicDate, isPriceLocale, PRICE_DISCLAIMER, PRICE_LOCALES, priceDateLabel, type PriceLocale } from "./price-locale.ts";

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
  fa: { header: PRICE_BLOCK_COPY.title, unit: PRICE_BLOCK_COPY.unit, missing: PRICE_BLOCK_COPY.missing, note: PRICE_DISCLAIMER.fa },
  ar: { header: AR_PRICE_COPY.header, unit: AR_PRICE_COPY.unit, missing: AR_PRICE_COPY.missing, note: PRICE_DISCLAIMER.ar },
};

/**
 * W9.6 — locales that show ▲/▼ + % next to a price. fa only: ar shows price + date + VAT-included ONLY
 * (owner rule); adding "ar" here (plus its copy) is the one switch if the owner extends it.
 */
export const PRICE_CHANGE_LOCALES: readonly PriceLocale[] = ["fa"];

/** The compact change next to a price (fa): glyph + percent, and the words a screen reader hears instead of the glyph. */
export const PRICE_CHANGE_COPY = { up: "▲", down: "▼", upWord: "افزایش", downWord: "کاهش", unchanged: PRICE_BLOCK_COPY.unchanged } as const;

export interface CompactPriceChange {
  direction: "up" | "down" | "none";
  /** «▲» / «▼» / null when unchanged (aria-hidden). */
  glyph: string | null;
  /** «۱٫۲٪», or «بدون تغییر». */
  label: string;
  /** Screen-reader words, e.g. «افزایش» (empty when unchanged). */
  word: string;
}

/** ▲/▼ + % vs the previous-day price already in `data` (priceBlockDataFromRow applies the earlier-day rule); null = render nothing. */
export function presentCompactChange(locale: Locale, data: PriceBlockData | null | undefined): CompactPriceChange | null {
  if (!data || !(PRICE_CHANGE_LOCALES as readonly string[]).includes(locale)) return null;
  const change = priceChange(data.tomanPerKg, data.previousTomanPerKg);
  if (!change || !data.previousPricedAt) return null;
  if (change.direction === "none") return { direction: "none", glyph: null, label: PRICE_CHANGE_COPY.unchanged, word: "" };
  const percent = `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(change.percent)}٪`;
  return change.direction === "up" ? { direction: "up", glyph: PRICE_CHANGE_COPY.up, label: percent, word: PRICE_CHANGE_COPY.upWord } : { direction: "down", glyph: PRICE_CHANGE_COPY.down, label: percent, word: PRICE_CHANGE_COPY.downWord };
}

/** The Toman/kg amount as the page shows it (fa: «۴۸٬۹۴۷»; ar: «٤٨٬٩٤٧»). */
export function formatTomanAmount(locale: PriceLocale, toman: number): string {
  return locale === "fa" ? formatPersianToman(toman) : formatNumber("ar", toman, 0);
}

/**
 * Snapshot row → the typed prop of the W10.2 PriceBlock (Toman = IRR ÷ 10; no source field exists).
 * W9.6: the previous price is kept only when it is from an EARLIER Tehran day than the current one (owner:
 * ▲/▼ only when a previous day exists) — a same-day correction shows no change at all.
 */
export function priceBlockDataFromRow(row: PublishedPriceRow): PriceBlockData {
  const previousDay = row.previous_price_irr_per_kg !== null && isEarlierTehranDay(row.previous_published_at, row.published_at);
  return {
    tomanPerKg: irrToToman(row.price_irr_per_kg),
    factoryName: row.factory_name_fa,
    deliveryLocation: row.location_fa,
    pricedAt: row.published_at,
    previousTomanPerKg: previousDay ? irrToToman(row.previous_price_irr_per_kg!) : null,
    previousPricedAt: previousDay ? row.previous_published_at : null,
  };
}

export type PriceCellPresentation =
  | {
      kind: "price";
      amount: string;
      /** fa only (ar never shows factory/location). */ place: string | null;
      /** fa only (ar carries no timestamp). */ datetime: string | null;
      dateLabel: string;
      /** W9.6: ▲/▼ + % (fa, previous day only). */ change: CompactPriceChange | null;
      /** W9.6: «استعلام قیمت نهایی» → the RFQ form prefilled (variant; fa also the factory). */ rfq: { href: string; label: string } | null;
    }
  | { kind: "missing"; label: string };

/**
 * Table cell: fa amount + ▲/▼ + factory/location + date + RFQ button; ar amount + date + RFQ button; or the
 * missing label. `null` = no column (en). `variantXid` (W9.6) builds the RFQ button; without it, none.
 */
export function presentPriceCell(locale: Locale, data: PriceBlockData | null | undefined, variantXid?: string): PriceCellPresentation | null {
  if (!isPriceLocale(locale)) return null;
  // Validity is the PriceBlock's (never an empty/0/NaN value), whatever the locale shows of it.
  const view = presentPriceBlock("fa", data);
  if (!view) return null;
  if (view.kind === "missing" || !data) return { kind: "missing", label: PRICE_COLUMN_COPY[locale].missing };
  const rfq = variantXid ? { href: priceRfqHref(locale, variantXid, locale === "fa" ? view.factoryName : null), label: PRICE_RFQ_COPY[locale] } : null;
  if (locale === "ar") return { kind: "price", amount: formatTomanAmount("ar", data.tomanPerKg), place: null, datetime: null, dateLabel: formatArabicDate(new Date(view.datetime)), change: null, rfq };
  return { kind: "price", amount: view.amount, place: `${view.factoryName}، ${view.deliveryLocation}`, datetime: view.datetime, dateLabel: formatPersianDate(new Date(view.datetime)), change: presentCompactChange("fa", data), rfq };
}

/** The page's main priced variant: the first one, in the table's order, that has a price. */
export function firstPricedVariant<T extends { xid: string }>(orderedVariants: readonly T[], prices: ReadonlyMap<string, PriceBlockData>): T | null {
  return orderedVariants.find((v) => prices.has(v.xid)) ?? null;
}

/** Every string the price markup of one variant may show on a page of `locale` (the gate's allow-list). */
export function allowedPriceTexts(row: PublishedPriceRow | null, locale: PriceLocale = "fa", productName?: string): string[] {
  if (locale === "ar") {
    const out: string[] = [...Object.values(AR_PRICE_COPY), PRICE_RFQ_COPY.ar];
    if (row) out.push(renderedAmount(row, "ar"), formatArabicDate(new Date(row.published_at)));
    return out;
  }
  const fixed = [PRICE_BLOCK_COPY.title, PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.vat, PRICE_BLOCK_COPY.factory, PRICE_BLOCK_COPY.delivery, PRICE_BLOCK_COPY.updated, PRICE_BLOCK_COPY.askToday, PRICE_BLOCK_COPY.missing, PRICE_BLOCK_COPY.cta, PRICE_BLOCK_COPY.unchanged, PRICE_RFQ_COPY.fa, PRICE_TREND_COPY.fa, PRICE_CHANGE_COPY.up, PRICE_CHANGE_COPY.down, PRICE_CHANGE_COPY.upWord, PRICE_CHANGE_COPY.downWord];
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
    const compact = presentCompactChange("fa", data);
    if (compact) out.push(compact.label);
  }
  return out;
}

/** The formatted amount a variant's price shows on a page of `locale` (the gate looks for it outside the price markup and on en). */
export function renderedAmount(row: PublishedPriceRow, locale: PriceLocale = "fa"): string {
  return formatTomanAmount(locale, irrToToman(row.price_irr_per_kg));
}

/** W9.6 — the caption of the product page's 30-day chart (fa; ar shows price only). */
export const PRICE_TREND_COPY = { fa: "روند ۳۰ روز اخیر" } as const;
/** The chart's element attribute: its value is the number of daily points drawn (the gate re-counts them). */
export const PRICE_SPARKLINE_ATTRIBUTE = "data-aa-price-sparkline";
