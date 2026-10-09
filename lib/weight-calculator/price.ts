import { presentPriceBlock, type PriceBlockData } from "../pricing/price-block-presentation.ts";
import { isPriceLocale, priceDateLabel, type PriceLocale } from "../pricing/price-locale.ts";
import { roundToThousand } from "./format.ts";

/**
 * Optional cost estimate (W10.1 scope 5), wired in W9.4 — only for a variant
 * whose price is in the build data. fa and ar (owner decision change
 * 2026-10-09); en never gets a price. The calculator is a client component,
 * so this map travels in the Flight payload: it carries ONLY the variant id,
 * `tomanPerKg` and the date label — plus, on fa, the ISO time for
 * `<time datetime>`. Never the factory, the location or any source (the
 * publication gate checks every entry against the snapshot).
 *
 * The date label is formatted here, on the server (build), and travels as a
 * string: `Intl` date output differs between the build runtime and the
 * browser, which would break hydration of the client calculator.
 */
export interface CalculatorPrice {
  tomanPerKg: number;
  /** ISO 8601, for <time datetime> — fa only (the ar payload carries no timestamp). */
  datetime?: string;
  /** fa «۱۵ مهر ۱۴۰۵» (Persian calendar, Tehran); ar «٨ أكتوبر ٢٠٢٦». */
  dateLabel: string;
}

/** Variant xid → price, already validated. */
export type CalculatorPrices = Readonly<Record<string, CalculatorPrice>>;

/** Same validity rules as the product-page price block: an invalid or incomplete price gives no estimate (never a 0/NaN amount). */
export function toCalculatorPrice(data: PriceBlockData | null | undefined, locale: PriceLocale = "fa"): CalculatorPrice | null {
  const view = presentPriceBlock("fa", data);
  if (!data || !view || view.kind !== "price") return null;
  const dateLabel = priceDateLabel(locale, view.datetime);
  return locale === "fa" ? { tomanPerKg: data.tomanPerKg, datetime: view.datetime, dateLabel } : { tomanPerKg: data.tomanPerKg, dateLabel };
}

/** Prices for the calculator from the build data; anything invalid is dropped. fa and ar only — en gets none. */
export function toCalculatorPrices(locale: string, prices: Readonly<Record<string, PriceBlockData>> | null | undefined): CalculatorPrices | undefined {
  if (!isPriceLocale(locale) || !prices) return undefined;
  const out: Record<string, CalculatorPrice> = {};
  for (const [xid, data] of Object.entries(prices)) {
    const price = toCalculatorPrice(data, locale);
    if (price) out[xid] = price;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Total kg × Toman/kg (VAT included), to the nearest 1,000 Toman. */
export function estimateCostToman(totalKg: number, price: CalculatorPrice): number {
  return roundToThousand(totalKg * price.tomanPerKg);
}
