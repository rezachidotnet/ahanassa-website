import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { indexPublicCategoriesByGroupCode, resolveRfqPublicCategory } from "@/lib/catalog/public-categories";
import { sortVariantsBySize } from "@/lib/catalog/specification-presenter";
import { listAllPublishedPrices } from "@/lib/pricing/product-page-price-repository";
import { formatArabicDate, presentPriceCell, PRICE_CELL_ATTRIBUTE, PRICE_COLUMN_COPY, PRICE_DISCLAIMER, type PriceLocale } from "@/lib/pricing/product-page-price";
import { formatPersianDate } from "@/lib/pricing/price-block-presentation";
import { buildPriceTableRows, filterOptions, isPricePagePublished, latestPricedAt, PRICE_PAGE_COPY, PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE, PRICE_ROW_FACTORY_ATTRIBUTE, PRICE_ROW_FAMILY_ATTRIBUTE, type PriceTableRow } from "@/lib/pricing/price-page";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { PriceCellContent } from "@/components/products/price-cell-content";
import { PriceTableFilter } from "@/components/prices/price-table-filter";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** fa and ar only (lib/pricing/price-page.ts) — the same list feeds hreflang, the sitemap and the en redirect. */
export function generateStaticParams(): { locale: Locale }[] {
  return PRICE_PAGE_LOCALES.map((locale) => ({ locale }));
}

const pageLocale = (raw: string): PriceLocale => (isLocale(raw) && isPricePagePublished(raw) ? raw : "fa");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = pageLocale((await params).locale);
  const t = PRICE_PAGE_COPY[locale];
  return buildPageMetadata({
    locale,
    path: PRICE_PAGE_ROUTE,
    title: t.metaTitle,
    description: t.metaDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(PRICE_PAGE_LOCALES.map((l) => ({ locale: l, path: PRICE_PAGE_ROUTE }))),
  });
}

const TABLE_ID = "daily-prices";
const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold whitespace-nowrap";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-3 align-top group-last:border-b-0";

/** Every published template of the locale with its priced variants, as table rows (build-time snapshot only). */
async function loadRows(locale: PriceLocale): Promise<PriceTableRow[]> {
  const prices = await listAllPublishedPrices();
  if (!prices || prices.size === 0) return [];
  const templates = await listPublishedCatalogTemplates(locale);
  const details = await Promise.all(templates.map((t) => getPublishedCatalogTemplateBySlug(locale, t.seo.slug)));
  const categoryIndex = indexPublicCategoriesByGroupCode(await listPublicCatalogCategories(locale));
  const family = (groupCode: string | null, familyName: string | null) => {
    const c = resolveRfqPublicCategory(categoryIndex, locale, groupCode, familyName);
    return { code: c.code ?? "other", label: c.label ?? groupCode ?? "—", position: c.position };
  };
  return buildPriceTableRows(
    locale,
    details.flatMap((d) =>
      d
        ? [
            {
              slug: d.seo.slug,
              productName: d.seo.h1 ?? d.product.commercialTemplateName,
              variants: sortVariantsBySize(d.variants).map((v) => ({ xid: v.xid, size: v.commercialSize ?? v.sectionSize ?? v.sku, groupCode: v.group.code, familyName: v.family.name })),
            },
          ]
        : [],
    ),
    prices,
    family,
  );
}

/**
 * The table, its filter and the update date. r4 isolation (as ProductSpecs, PricedWeightCalculator): this
 * async boundary always suspends once, so the price markup gets its own Flight row, away from the page
 * row that carries the target-specific robots value (lib/static/target-diff-gate.ts).
 */
async function DailyPriceTable({ locale }: { locale: PriceLocale }) {
  await Promise.resolve();
  const t = PRICE_PAGE_COPY[locale];
  const rows = await loadRows(locale);
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
  const latest = latestPricedAt(rows)!;
  const options = filterOptions(rows);
  const column = PRICE_COLUMN_COPY[locale];
  return (
    // minmax(0,1fr): the table's min-w-max must not widen the grid track (that scrolled the whole page at 390 px).
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <p className="text-neutral-700 text-sm font-semibold">
        {t.updated}{" "}
        {/* ar carries no timestamp (owner 2026-10-09). */}
        {locale === "fa" ? <time dateTime={new Date(latest).toISOString()}>{formatPersianDate(new Date(latest))}</time> : formatArabicDate(new Date(latest))}
      </p>
      <PriceTableFilter tableId={TABLE_ID} families={options.families} factories={options.factories} digitsLocale={locale === "fa" ? "fa-IR" : "ar-EG"} copy={{ family: t.family, factory: t.factory, all: t.all, countTemplate: t.count("{n}"), noMatch: t.noMatch }} />
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
              {rows.map((row) => {
                const view = presentPriceCell(locale, row.price, row.xid);
                return (
                  <tr key={row.xid} className="group" {...{ [PRICE_ROW_FAMILY_ATTRIBUTE]: row.familyCode, ...(row.factory ? { [PRICE_ROW_FACTORY_ATTRIBUTE]: row.factory } : {}) }}>
                    <th scope="row" className={cn(CELL, "bg-background group-hover:bg-surface min-w-32 text-start font-bold")}>
                      <Link href={localizedPath(locale, row.productPath)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                        {row.productName}
                      </Link>
                      <span className="text-tertiary block text-xs font-semibold">{row.familyLabel}</span>
                    </th>
                    {view && (
                      <td {...{ [PRICE_CELL_ATTRIBUTE]: row.xid }} className={cn(CELL, "group-hover:bg-surface whitespace-nowrap")}>
                        <PriceCellContent view={view} />
                      </td>
                    )}
                    <td className={cn(CELL, "text-muted-foreground group-hover:bg-surface whitespace-nowrap")}>
                      <span dir="ltr">{row.size}</span>
                    </td>
                  </tr>
                );
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
 * W9.6 — the daily price page (lib/pricing/price-page.ts). No JSON-LD price (SEO phase later), no
 * "from X" anywhere; prices only from the build-time snapshot.
 */
export default async function PricesPage({ params }: PageProps) {
  const locale = pageLocale((await params).locale);
  const t = PRICE_PAGE_COPY[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: PRICE_PAGE_ROUTE, label: t.eyebrow }]} />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x">
          <DailyPriceTable locale={locale} />
        </div>
      </section>
    </>
  );
}
