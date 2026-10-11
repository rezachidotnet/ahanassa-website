import type { Locale } from "../../config/locales.ts";

/** The calculator route, locale-neutral (owner decision D-W10-5). fa is served unprefixed. */
export const WEIGHT_CALCULATOR_ROUTE = "/tools/weight-calculator";

/**
 * Locales the calculator page is published in. The one source for its
 * generateStaticParams, its hreflang alternates and its sitemap entries, so a
 * locale dropped here disappears from all three together — and from the
 * home Product Showcase button (W10.3) and the product-page «محاسبه وزن» links.
 *
 * fa only — owner decision 2026-10-09 (W10.1): the en/ar copy in copy.ts
 * stays in the code as an unpublished draft until the owner approves it;
 * publishing it is adding "en"/"ar" here.
 */
export const WEIGHT_CALCULATOR_LOCALES: readonly Locale[] = ["fa"];

export function isWeightCalculatorPublished(locale: Locale): boolean {
  return WEIGHT_CALCULATOR_LOCALES.includes(locale);
}
