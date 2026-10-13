import type { Locale } from "../../config/locales.ts";

/** The calculator route, locale-neutral (owner decision D-W10-5). fa is served unprefixed. */
export const WEIGHT_CALCULATOR_ROUTE = "/tools/weight-calculator";

/**
 * Locales the calculator page is published in. The one source for its
 * generateStaticParams, its hreflang alternates and its sitemap entries, so a
 * locale dropped here disappears from all three together — and from the
 * home Product Showcase button (W10.3) and the product-page «محاسبه وزن» links.
 *
 * fa only from W10.1 (owner decision 2026-10-09) until W16.3 (D-SEO, keyword map
 * §6 P1-3, 2026-10-13): the owner's W16.3 brief publishes the en/ar copy in
 * copy.ts. en has no cost estimate (no price data on en); ar keeps the
 * price-only estimate of D-W94-4.
 */
export const WEIGHT_CALCULATOR_LOCALES: readonly Locale[] = ["fa", "en", "ar"];

export function isWeightCalculatorPublished(locale: Locale): boolean {
  return WEIGHT_CALCULATOR_LOCALES.includes(locale);
}
