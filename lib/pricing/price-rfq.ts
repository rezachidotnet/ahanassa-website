import { localizedPath, type Locale } from "../../config/locales.ts";

/**
 * W9.6 — «استعلام قیمت نهایی» / «طلب السعر النهائي»: the button next to every price (product page, price
 * page, calculator estimate). It opens the EXISTING RFQ form on /contact with:
 *
 *   ?variant=<CVAR>      the product and size (the form's existing catalog preselection)
 *   &factory=<fa name>   fa only: the price's factory, written into the row's notes in the browser
 *                        (lib/rfq/rfq-prefill.ts) — ar never carries the factory (owner: ar = price only)
 *
 * Client-side prefill only: the RFQ Worker, its API and the submitted wire shape are unchanged — the
 * factory reaches Odoo only as the visitor's own, editable note text.
 */
export const PRICE_RFQ_COPY = { fa: "استعلام قیمت نهایی", ar: "طلب السعر النهائي" } as const;
export type PriceRfqLocale = keyof typeof PRICE_RFQ_COPY;

export const RFQ_FACTORY_PARAM = "factory";

/** The /contact link of the button. `extraQuery` (no leading "?") is the calculator's quantity hand-off. */
export function priceRfqHref(locale: PriceRfqLocale, variantXid: string, factoryNameFa?: string | null, extraQuery?: string): string {
  const params = extraQuery ? new URLSearchParams(extraQuery) : new URLSearchParams();
  params.set("variant", variantXid);
  if (locale === "fa" && factoryNameFa && factoryNameFa.trim()) params.set(RFQ_FACTORY_PARAM, factoryNameFa.trim());
  else params.delete(RFQ_FACTORY_PARAM);
  return `${localizedPath(locale as Locale, "/contact")}?${params.toString()}`;
}
