import { formatPersianDate, presentPriceBlock, type PriceBlockData } from "../pricing/price-block-presentation.ts";
import { roundToThousand } from "./format.ts";

/**
 * Optional cost estimate (W10.1 scope 5) — Persian page only, and only for
 * a variant whose price is in the build data. The price data arrives with
 * W9.4; until then the page passes no prices and the row is not rendered at
 * all. Written against the existing `PriceBlockData` type (D-W10-4), so the
 * W9.4 wiring is a single prop on the page.
 *
 * The date label is formatted here, on the server (build), and travels as a
 * string: `Intl` date output differs between the build runtime and the
 * browser, which would break hydration of the client calculator.
 */
export interface CalculatorPrice {
  tomanPerKg: number;
  /** ISO 8601, for <time datetime>. */
  datetime: string;
  /** «۱۵ مهر ۱۴۰۵» (Persian calendar, Tehran). */
  dateLabel: string;
}

/** Variant xid → price, already validated. */
export type CalculatorPrices = Readonly<Record<string, CalculatorPrice>>;

/** Same validity rules as the product-page price block: an invalid or incomplete price gives no estimate (never a 0/NaN amount). */
export function toCalculatorPrice(data: PriceBlockData | null | undefined): CalculatorPrice | null {
  const view = presentPriceBlock("fa", data);
  if (!data || !view || view.kind !== "price") return null;
  return { tomanPerKg: data.tomanPerKg, datetime: view.datetime, dateLabel: formatPersianDate(new Date(view.datetime)) };
}

/** Prices for the calculator from the build data; anything invalid is dropped. Persian page only — other locales get none. */
export function toCalculatorPrices(locale: string, prices: Readonly<Record<string, PriceBlockData>> | null | undefined): CalculatorPrices | undefined {
  if (locale !== "fa" || !prices) return undefined;
  const out: Record<string, CalculatorPrice> = {};
  for (const [xid, data] of Object.entries(prices)) {
    const price = toCalculatorPrice(data);
    if (price) out[xid] = price;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Total kg × Toman/kg (VAT included), to the nearest 1,000 Toman. */
export function estimateCostToman(totalKg: number, price: CalculatorPrice): number {
  return roundToThousand(totalKg * price.tomanPerKg);
}
