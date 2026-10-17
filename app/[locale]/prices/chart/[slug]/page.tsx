import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localizedPath } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { siteConfig } from "@/lib/metadata/site";
import { datasetSchema, jsonLdGraph } from "@/lib/seo/schema";
import { PRICE_DISCLAIMER } from "@/lib/pricing/product-page-price";
import { PRICE_PAGE_COPY, PRICE_PAGE_ROUTE } from "@/lib/pricing/price-page";
import { priceWindows } from "@/lib/pricing/price-position";
import { PRICE_CHART_COPY, priceChartPath } from "@/lib/pricing/price-charts";
import { listPriceChartProducts, loadPriceChart } from "@/lib/pricing/price-chart-data";
import { chartShareImagePath, SHARE_IMAGE_SIZE } from "@/lib/og/share-image-paths";
import { priceRfqHref } from "@/lib/pricing/price-rfq";
import { listIndicators } from "@/lib/indicators/repository";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import { PriceChart } from "@/components/prices/price-chart";
import { PriceDecision } from "@/components/products/price-decision";
import { IndicatorStrip } from "@/components/indicators/indicator-strip";
import { ChartShare } from "@/components/prices/chart-share";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * W18.2 — «نمودار و روند قیمت <محصول>»: one fa page per top product with enough published price history
 * (lib/pricing/price-charts.ts selectChartProducts). fa only — en/ar paths redirect (lib/static/static-rules.ts).
 */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (params.locale !== "fa") return [];
  return (await listPriceChartProducts()).map((p) => ({ slug: p.slug }));
}

/** The chart, its row and its history, or null (no chart page for this slug or locale this build). */
async function resolve(rawLocale: string, slug: string) {
  return rawLocale === "fa" ? loadPriceChart(slug) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const chart = await resolve(locale, slug);
  if (!chart) return {};
  const path = priceChartPath(slug);
  return buildPageMetadata({
    locale: "fa",
    path,
    title: PRICE_CHART_COPY.metaTitle(chart.product.productName),
    description: PRICE_CHART_COPY.description(chart.product.productName, chart.product.size),
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries([{ locale: "fa", path }]),
    // W18.3: the build-time share image (scripts/static/build.ts); its alt names the page, never the price.
    image: { url: `${siteConfig.baseUrl}${chartShareImagePath(slug, "png")}`, ...SHARE_IMAGE_SIZE, alt: PRICE_CHART_COPY.title(chart.product.productName) },
  });
}

/**
 * The chart, the gauge, the indicators and the links. r4 isolation (as DailyPriceTable on /prices): this async
 * boundary always suspends once, so the price markup gets its own Flight row, away from the page row that carries
 * the target-specific robots value (lib/static/target-diff-gate.ts).
 */
async function ChartContent({ slug }: { slug: string }) {
  await Promise.resolve();
  const chart = (await resolve("fa", slug))!;
  const { product, row, currentDay, series } = chart;
  const t = PRICE_CHART_COPY;
  const indicators = await listIndicators();
  const url = `${siteConfig.baseUrl}${localizedPath("fa", priceChartPath(slug))}`;
  return (
    <>
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <p className="text-neutral-700 text-sm font-semibold">
              {t.referenceSize}: <bdi dir="ltr">{product.size}</bdi>
            </p>
            <PriceChart xid={product.xid} slug={slug} product={product.productName} series={series} currentDay={currentDay} />
            <p className="text-muted-foreground text-xs leading-relaxed">{PRICE_DISCLAIMER.fa}</p>
          </div>
          <div className="grid gap-4">
            <PriceDecision xid={product.xid} slug={slug} windows={priceWindows(series, currentDay)} trend={null} indicators={indicators} rfqHref={priceRfqHref("fa", product.xid, row.price.factoryName)} chartHref={null} ctaLocation="chart_page" />
            <ButtonLink href={localizedPath("fa", `/products/${slug}`)} variant="link">
              {t.productPage}
            </ButtonLink>
            <ButtonLink href={localizedPath("fa", PRICE_PAGE_ROUTE)} variant="link">
              {t.pricesPage}
            </ButtonLink>
            <ChartShare slug={slug} url={url} title={t.title(product.productName)} />
          </div>
        </div>
      </section>
      <IndicatorStrip locale="fa" indicators={indicators} headingId="chart-indicators-heading" />
      <JsonLd
        data={jsonLdGraph([
          datasetSchema({
            url,
            name: t.datasetName(product.productName, product.size),
            description: t.description(product.productName, product.size),
            temporalCoverage: `${series[0].day}/${series[series.length - 1].day}`,
            dateModified: series[series.length - 1].day,
            variable: t.datasetVariable,
            unitText: t.datasetUnit,
            ownData: true,
          }),
        ])}
      />
    </>
  );
}

export default async function PriceChartPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const chart = await resolve(locale, slug);
  if (!chart) notFound();
  const t = PRICE_CHART_COPY;
  return (
    <>
      <PageHero
        locale="fa"
        eyebrow={t.eyebrow}
        title={t.title(chart.product.productName)}
        body={t.body}
        breadcrumb={[
          { path: PRICE_PAGE_ROUTE, label: PRICE_PAGE_COPY.fa.eyebrow },
          { path: priceChartPath(slug), label: t.title(chart.product.productName) },
        ]}
      />
      <ChartContent slug={slug} />
    </>
  );
}
