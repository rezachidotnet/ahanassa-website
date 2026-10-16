import type { Locale } from "@/config/locales";
import { INDICATOR_COPY, type Indicator } from "@/lib/indicators/presentation";
import { IndicatorCard } from "./indicator-card";

const STRIP_TITLE: Record<Locale, string> = { fa: "شاخص‌های مرجع بازار", en: "Market reference indicators", ar: "مؤشرات السوق المرجعية" };

/**
 * W18.2 — the fa price strip's indicator items (home page under the hero, /prices above the table, the chart pages):
 * one card per market indicator of the build (USD/IRR Exchange Center rate, iron ore, the US index). Nothing at all
 * when the snapshot has none. Server-rendered; mobile scrolls sideways (user-controlled, like the price strip),
 * tablet and up is a 3-column grid.
 */
export function IndicatorStrip({ locale, indicators, headingId = "market-indicators-heading", className }: { locale: Locale; indicators: readonly Indicator[]; headingId?: string; className?: string }) {
  if (indicators.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className={className ?? "border-border bg-[var(--aa-color-bg-warm)] border-b py-10 lg:py-14"}>
      <div className="container-x">
        <h2 id={headingId} className="text-navy text-[19px] leading-snug font-bold">
          {STRIP_TITLE[locale]}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">{INDICATOR_COPY[locale].note}</p>
        <ul className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:snap-none sm:overflow-visible sm:pb-0">
          {indicators.map((indicator) => (
            <li key={indicator.code} className="flex min-w-[240px] shrink-0 snap-start sm:min-w-0">
              <IndicatorCard locale={locale} indicator={indicator} className="w-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
