import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { presentPriceCell, PRICE_CELL_ATTRIBUTE, PRICE_COLUMN_COPY, PRICE_DISCLAIMER, PRICE_RANK_ATTRIBUTE, priceDateLabel, type PriceLocale } from "@/lib/pricing/product-page-price";
import { filterOptions, isPricePagePublished, latestPricedAt, PRICE_PAGE_COPY, PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE, PRICE_ROW_FACTORY_ATTRIBUTE, PRICE_ROW_FAMILY_ATTRIBUTE, type PriceTableRow } from "@/lib/pricing/price-page";
import { loadPriceTableRows } from "@/lib/pricing/price-page-data";
import { byTitleDemand, PRICE_HUB_FAMILY_COPY, priceHubPath, publishedHubFamilies } from "@/lib/pricing/price-hubs";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/components/ui/surface-variants";
import { PriceCellContent } from "@/components/products/price-cell-content";
import { PriceUpdatedLine } from "@/components/prices/price-updated-line";
import { PriceTableFilter } from "@/components/prices/price-table-filter";
import { TrackOnView } from "@/components/analytics/track-on-view";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** fa and ar only (lib/pricing/price-page.ts) — the same list feeds hreflang, the sitemap and the en redirect. */
export function generateStaticParams(): { locale: Locale }[] {
  return PRICE_PAGE_LOCALES.map((locale) => ({ locale }));
}

const pageLocale = (raw: string): PriceLocale => (isLocale(raw) && isPricePagePublished(raw) ? raw : "fa");

/** W16.3 (keyword map §7.2): the date of the newest price and the hub family names of the day, or null with no rows. */
function dayOf(locale: PriceLocale, rows: readonly PriceTableRow[]): { date: string; families: string[] } | null {
  const latest = latestPricedAt(rows);
  if (!latest) return null;
  return { date: priceDateLabel(locale, latest), families: byTitleDemand(publishedHubFamilies(rows)).map((f) => PRICE_HUB_FAMILY_COPY[f][locale].name) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = pageLocale((await params).locale);
  const t = PRICE_PAGE_COPY[locale];
  const day = dayOf(locale, await loadPriceTableRows(locale));
  return buildPageMetadata({
    locale,
    path: PRICE_PAGE_ROUTE,
    title: day ? t.metaTitleDated(day.date, day.families) : t.metaTitle,
    description: day && day.families.length ? t.metaDescriptionDated(day.families) : t.metaDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(PRICE_PAGE_LOCALES.map((l) => ({ locale: l, path: PRICE_PAGE_ROUTE }))),
  });
}

const TABLE_ID = "daily-prices";
const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-3 align-top group-last:border-b-0";

/**
 * The table, its filter and the update date. r4 isolation (as ProductSpecs, PricedWeightCalculator): this
 * async boundary always suspends once, so the price markup gets its own Flight row, away from the page
 * row that carries the target-specific robots value (lib/static/target-diff-gate.ts).
 */
async function DailyPriceTable({ locale }: { locale: PriceLocale }) {
  await Promise.resolve();
  const t = PRICE_PAGE_COPY[locale];
  const rows = await loadPriceTableRows(locale);
  if (rows.length === 0) {
    return (
      <div className="grid max-w-2xl gap-4">
        <p className="text-neutral-700">{t.empty}</p>
        <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" className="justify-self-start">
          {t.emptyCta}
        </ButtonLink>
      </div>
    );
  }
  // W20.7 add-on: fa shows every factory's row, so the newest of those times (a non-lowest factory may be newer).
  const latest = latestPricedAt(rows, locale === "fa")!;
  const options = filterOptions(rows);
  const column = PRICE_COLUMN_COPY[locale];
  return (
    // minmax(0,1fr): the table's min-w-max must not widen the grid track (that scrolled the whole page at 390 px).
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <TrackOnView event="price_page_view" params={{ price_date: new Date(latest).toISOString().slice(0, 10) }} />
      <PriceUpdatedLine locale={locale} label={t.updated} at={latest} />
      <PriceTableFilter tableId={TABLE_ID} options={options} digitsLocale={locale === "fa" ? "fa-IR" : "ar-EG"} copy={{ family: t.family, factory: t.factory, all: t.all, countTemplate: t.count("{n}"), noMatch: t.noMatch }} />
      <div>
        <p className="text-tertiary mb-2 text-xs md:hidden" aria-hidden="true">
          {t.swipe}
        </p>
        {/* Scroll region (as the product table): `relative` keeps the sr-only caption inside the clip; focusable for keyboard scrolling. */}
        <div role="region" aria-label={t.caption} tabIndex={0} className="border-border bg-background relative overflow-x-auto rounded-[var(--aa-radius-card)] border">
          {/* Price right after the product (mobile shows it without scrolling); product names may wrap. */}
          <table id={TABLE_ID} className="text-ui w-full border-separate border-spacing-0 text-start">
            <caption className="sr-only">{t.caption}</caption>
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  {t.product}
                </th>
                <th scope="col" className={HEAD}>
                  {column.header}
                  <span className="text-tertiary block text-[11px] font-semibold">{column.unit}</span>
                </th>
                <th scope="col" className={HEAD}>
                  {t.size}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) => {
                // W20.7: fa lists every factory's price of the size (the lowest first, marked when there are several);
                // without factory rows (ar, or a snapshot without them) the one row shows the lowest, as before.
                const entries = row.factoryPrices.length ? row.factoryPrices.map((p, rank) => ({ price: p.data, factory: p.data.factoryName, rank, lowest: p.lowest && row.factoryPrices.length > 1 })) : [{ price: row.price, factory: row.factory, rank: null, lowest: false }];
                return entries.map((entry) => {
                  const view = presentPriceCell(locale, entry.price, row.xid);
                  return (
                    <tr key={`${row.xid}:${entry.rank ?? "lowest"}`} className="group" {...{ [PRICE_ROW_FAMILY_ATTRIBUTE]: row.familyCode, ...(entry.factory ? { [PRICE_ROW_FACTORY_ATTRIBUTE]: entry.factory } : {}) }}>
                      <th scope="row" className={cn(CELL, "bg-background group-hover:bg-surface min-w-32 text-start font-bold")}>
                        <Link href={localizedPath(locale, row.productPath)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                          {row.productName}
                        </Link>
                        <span className="text-tertiary block text-xs font-semibold">{row.familyLabel}</span>
                        {entry.lowest && <span className="border-copper/30 bg-copper/10 text-copper mt-1 inline-block rounded border px-1.5 py-0.5 text-[11px] font-bold">{t.lowest}</span>}
                      </th>
                      {view && (
                        <td {...{ [PRICE_CELL_ATTRIBUTE]: row.xid, ...(entry.rank !== null ? { [PRICE_RANK_ATTRIBUTE]: String(entry.rank) } : {}) }} className={cn(CELL, "group-hover:bg-surface whitespace-nowrap")}>
                          <PriceCellContent view={view} />
                        </td>
                      )}
                      <td className={cn(CELL, "text-muted-foreground group-hover:bg-surface whitespace-nowrap")}>
                        <span dir="ltr">{row.size}</span>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{PRICE_DISCLAIMER[locale]}</p>
      </div>
    </div>
  );
}

/**
 * W16.3 (keyword map §8 item 1): an H2 per published family hub, each with its clean product-page links
 * (the table rows link with `?variant=`, which robots.txt keeps out of the crawl). Same r4 isolation as the
 * table: its own async boundary, so its size never moves the page row's split.
 */
async function FamilyHubLinks({ locale }: { locale: PriceLocale }) {
  await Promise.resolve();
  const rows = await loadPriceTableRows(locale);
  const families = publishedHubFamilies(rows);
  if (families.length === 0) return null;
  const t = PRICE_PAGE_COPY[locale];
  return (
    <section aria-labelledby="price-families" className="border-border bg-surface border-b section-y">
      <div className="container-x">
        <h2 id="price-families" className="text-navy text-2xl font-extrabold">
          {t.familiesTitle}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => {
            const name = PRICE_HUB_FAMILY_COPY[family][locale].name;
            const products = [...new Map(rows.filter((r) => r.familyCode === family).map((r) => [r.productPagePath, r.productName])).entries()];
            return (
              <div key={family} className={cardVariants({ variant: "panel" })}>
                <h3 className="text-navy text-lg font-bold">
                  <Link href={localizedPath(locale, priceHubPath(family))} className="hover:text-copper underline-offset-4 hover:underline">
                    {t.familyLink(name)}
                  </Link>
                </h3>
                <p className="text-muted-foreground mt-3 text-xs font-semibold">{t.familyProducts}</p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {products.map(([path, productName]) => (
                    <li key={path}>
                      <Link href={localizedPath(locale, path)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                        {productName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {isWeightCalculatorPublished(locale) && (
          <ButtonLink href={localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)} variant="link" className="mt-6">
            {t.calculator}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

/**
 * W9.6 — the daily price page (lib/pricing/price-page.ts). No JSON-LD price (SEO phase later), no
 * "from X" anywhere; prices only from the build-time snapshot. W16.3: dated H1/title, an H2 over the
 * table and an H2 section per family hub (lib/pricing/price-hubs.ts).
 */
export default async function PricesPage({ params }: PageProps) {
  const locale = pageLocale((await params).locale);
  const t = PRICE_PAGE_COPY[locale];
  const day = dayOf(locale, await loadPriceTableRows(locale));
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={day ? t.titleDated(day.date) : t.title} body={t.body} breadcrumb={[{ path: PRICE_PAGE_ROUTE, label: t.eyebrow }]} />
      <section aria-labelledby="price-table-title" className="border-border bg-background border-b section-y">
        <div className="container-x">
          <h2 id="price-table-title" className="text-navy mb-6 text-2xl font-extrabold">
            {t.tableTitle}
          </h2>
          <DailyPriceTable locale={locale} />
        </div>
      </section>
      <FamilyHubLinks locale={locale} />
    </>
  );
}
