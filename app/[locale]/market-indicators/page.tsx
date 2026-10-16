import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { siteConfig } from "@/lib/metadata/site";
import { datasetSchema, jsonLdGraph } from "@/lib/seo/schema";
import { listIndicators } from "@/lib/indicators/repository";
import { INDICATOR_COPY } from "@/lib/indicators/presentation";
import { isMarketIndicatorsLocale, MARKET_INDICATORS_COPY, MARKET_INDICATORS_LOCALES, MARKET_INDICATORS_ROUTE, type MarketIndicatorsLocale } from "@/lib/indicators/page";
import { PRICE_PAGE_ROUTE } from "@/lib/pricing/price-page";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrackOnView } from "@/components/analytics/track-on-view";
import { IndicatorSection } from "@/components/indicators/indicator-section";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** en and ar only, and only when the build has at least one indicator (lib/indicators/page.ts). */
export async function generateStaticParams() {
  return (await listIndicators()).length ? MARKET_INDICATORS_LOCALES.map((locale) => ({ locale })) : [];
}

const pageLocale = (raw: string): MarketIndicatorsLocale | null => (isLocale(raw) && isMarketIndicatorsLocale(raw) ? raw : null);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = pageLocale((await params).locale);
  if (!locale) return {};
  const t = MARKET_INDICATORS_COPY[locale];
  return buildPageMetadata({
    locale,
    path: MARKET_INDICATORS_ROUTE,
    title: t.metaTitle,
    description: t.metaDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(MARKET_INDICATORS_LOCALES.map((l) => ({ locale: l, path: MARKET_INDICATORS_ROUTE }))),
  });
}

/**
 * The indicators. r4 isolation (as the price pages): this async boundary always suspends once, so the data markup
 * gets its own Flight row, away from the page row that carries the target-specific robots value.
 */
async function IndicatorsContent({ locale }: { locale: MarketIndicatorsLocale }) {
  await Promise.resolve();
  const indicators = await listIndicators();
  const t = MARKET_INDICATORS_COPY[locale];
  const url = `${siteConfig.baseUrl}${localizedPath(locale, MARKET_INDICATORS_ROUTE)}`;
  return (
    <section className="border-border bg-background border-b section-y">
      <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-8">
        <TrackOnView event="indicator_page_view" params={{ page_lang: locale, indicator_count: indicators.length }} />
        <TrackOnView event="chart_view" params={{ chart_type: "market_indicators" }} />
        <p className="text-neutral-700 max-w-3xl text-sm leading-relaxed">{INDICATOR_COPY[locale].note}</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          {indicators.map((indicator) => (
            <IndicatorSection key={indicator.code} locale={locale} indicator={indicator} />
          ))}
        </div>
        <div className="bg-surface grid gap-3 rounded-[var(--aa-radius-panel)] p-6">
          <h2 className="text-navy text-lg font-bold">{t.howToRead.title}</h2>
          <ul className="text-neutral-700 grid list-disc gap-2 ps-5 text-sm leading-relaxed">
            {t.howToRead.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {t.pricesLink && (
            <p className="text-neutral-700 text-sm">
              {t.pricesNote}{" "}
              <Link href={localizedPath(locale, PRICE_PAGE_ROUTE)} className="text-navy hover:text-copper font-semibold underline underline-offset-4">
                {t.pricesLink}
              </Link>
            </p>
          )}
        </div>
        <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="h-auto min-h-12 justify-self-start py-3">
          {t.cta}
        </ButtonLink>
      </div>
      <JsonLd
        data={jsonLdGraph(
          indicators.map((i) =>
            datasetSchema({
              url,
              id: `dataset-${i.code.replace(/_/g, "-")}`,
              name: i.names[locale],
              description: t.datasetDescription(i.names[locale]),
              temporalCoverage: `${i.points[0].date.slice(0, i.frequency === "monthly" ? 7 : 10)}/${i.points[i.points.length - 1].date.slice(0, i.frequency === "monthly" ? 7 : 10)}`,
              dateModified: i.points[i.points.length - 1].date,
              variable: i.names[locale],
              unitText: i.unit,
              ownData: false,
              creditText: i.attributions[locale],
              isBasedOn: i.sourceHref,
            }),
          ),
        )}
      />
    </section>
  );
}

/**
 * W18.2 — "Steel market indicators" (en) / «مؤشرات سوق الصلب» (ar): the global reference indices and the USD/IRR
 * Exchange Center rate, each labelled as a reference index (not an Ahan Asa selling price) with its source and date.
 */
export default async function MarketIndicatorsPage({ params }: PageProps) {
  const locale = pageLocale((await params).locale);
  if (!locale || (await listIndicators()).length === 0) notFound();
  const t = MARKET_INDICATORS_COPY[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: MARKET_INDICATORS_ROUTE, label: t.title }]} />
      <IndicatorsContent locale={locale} />
    </>
  );
}
