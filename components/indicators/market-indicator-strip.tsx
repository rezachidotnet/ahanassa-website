import { localizedPath } from "@/config/locales";
import { listIndicators } from "@/lib/indicators/repository";
import { MARKET_INDICATORS_COPY, MARKET_INDICATORS_ROUTE, type MarketIndicatorsLocale } from "@/lib/indicators/page";
import { IndicatorStrip } from "./indicator-strip";

/**
 * W18.3 — the market reference indicators strip on en/ar pages (home under the hero, /export, /ar/prices): the fa
 * strip's cards (reference indices only, each with the «not an Ahan Assa selling price» label, source and date;
 * en neutral +/− text, no ▲▼), every card linking to /<locale>/market-indicators. Nothing without indicators —
 * the same condition that publishes that page. Its own async boundary (r4), like the fa strip.
 */
export async function MarketIndicatorStrip({ locale, headingId, className }: { locale: MarketIndicatorsLocale; headingId?: string; className?: string }) {
  await Promise.resolve();
  const indicators = await listIndicators();
  return <IndicatorStrip locale={locale} indicators={indicators} headingId={headingId} className={className} link={{ href: localizedPath(locale, MARKET_INDICATORS_ROUTE), label: MARKET_INDICATORS_COPY[locale].title }} />;
}
