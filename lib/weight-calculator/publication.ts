import { locales, type Locale } from "../../config/locales.ts";

/** The calculator route, locale-neutral (owner decision D-W10-5). fa is served unprefixed. */
export const WEIGHT_CALCULATOR_ROUTE = "/tools/weight-calculator";

/**
 * Locales the calculator page is published in. The one source for its
 * generateStaticParams, its hreflang alternates and its sitemap entries, so a
 * locale dropped here disappears from all three together. All three today,
 * like every other public page; the en/ar copy is a draft awaiting owner
 * approval (W10.1 PR) — removing "en"/"ar" here unpublishes them cleanly.
 */
export const WEIGHT_CALCULATOR_LOCALES: readonly Locale[] = locales;

export function isWeightCalculatorPublished(locale: Locale): boolean {
  return WEIGHT_CALCULATOR_LOCALES.includes(locale);
}
