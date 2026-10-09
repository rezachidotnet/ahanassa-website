import type { Locale } from "@/config/locales";
import { irrToToman, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { formatPersianDate, formatPersianToman, PRICE_BLOCK_COPY, presentPriceBlock, type PriceBlockData } from "./price-block-presentation.ts";

/**
 * W9.4 — the daily price on the Persian product page (owner decisions D-PRICE-DISPLAY / D-PRICE-AGE /
 * D-W10-4). Pure: the snapshot's `published_prices` row → the W10.2 `PriceBlockData`, and the compact
 * «قیمت روز» cell of the variant table. Persian pages only: every function presents nothing for en/ar.
 *
 * The rendered price markup carries `data-aa-price-cell` / `data-aa-price-block` with the variant's
 * public canonical id, so the publication gate (lib/static/price-gate.ts) can check that the text
 * inside is exactly the allow-listed fields of that variant's snapshot row — and that en/ar pages
 * carry none.
 */

export const PRICE_CELL_ATTRIBUTE = "data-aa-price-cell";
export const PRICE_BLOCK_ATTRIBUTE = "data-aa-price-block";
/** `data-aa-price-block` value when the template has no priced variant (missing-price variant). */
export const PRICE_BLOCK_ON_REQUEST = "request";

export const PRICE_COLUMN_COPY = {
  header: PRICE_BLOCK_COPY.title,
  unit: PRICE_BLOCK_COPY.unit,
  missing: PRICE_BLOCK_COPY.missing,
  note: "قیمت‌ها به تومان برای هر کیلوگرم و شامل ارزش افزوده است؛ قیمت قطعی پس از استعلام اعلام می‌شود.",
} as const;

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

export type PriceCellPresentation = { kind: "price"; amount: string; place: string; datetime: string; dateLabel: string } | { kind: "missing"; label: string };

/** «قیمت روز» cell: amount + compact factory/location + date, or «استعلام قیمت»; `null` = no column (en/ar). */
export function presentPriceCell(locale: Locale, data: PriceBlockData | null | undefined): PriceCellPresentation | null {
  const view = presentPriceBlock(locale, data);
  if (!view) return null;
  if (view.kind === "missing") return { kind: "missing", label: PRICE_COLUMN_COPY.missing };
  return { kind: "price", amount: view.amount, place: `${view.factoryName}، ${view.deliveryLocation}`, datetime: view.datetime, dateLabel: formatPersianDate(new Date(view.datetime)) };
}

/** The page's main priced variant: the first one, in the table's order, that has a price. */
export function firstPricedVariant<T extends { xid: string }>(orderedVariants: readonly T[], prices: ReadonlyMap<string, PriceBlockData>): T | null {
  return orderedVariants.find((v) => prices.has(v.xid)) ?? null;
}

/** Every string the price markup of one variant may show (the gate's allow-list). */
export function allowedPriceTexts(row: PublishedPriceRow | null, productName?: string): string[] {
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

/** The formatted amount a variant's price shows (the gate looks for it outside the price markup and on en/ar). */
export function renderedAmount(row: PublishedPriceRow): string {
  return formatPersianToman(irrToToman(row.price_irr_per_kg));
}
