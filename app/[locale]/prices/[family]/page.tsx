import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { NOMINAL_WEIGHT_DISCLAIMER } from "@/lib/catalog/specification-presenter";
import { isPriceLocale, PRICE_COLUMN_COPY, PRICE_DISCLAIMER, type PriceLocale } from "@/lib/pricing/product-page-price";
import { latestPricedAt, PRICE_PAGE_COPY, PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "@/lib/pricing/price-page";
import { listPublishedHubFamilies, loadPriceDay, loadPriceTableRows } from "@/lib/pricing/price-page-data";
import { groupByMill, groupBySize, hubDescription, hubHeading, hubTitle, PRICE_HUB_FAMILY_COPY, PRICE_HUB_PAGE_COPY, priceHubPath, priceHubSegment, type PriceHubCategoryCode } from "@/lib/pricing/price-hubs";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { HubPriceTable } from "@/components/prices/hub-price-table";
import { PriceUpdatedLine } from "@/components/prices/price-updated-line";

interface PageProps {
  params: Promise<{ locale: string; family: string }>;
}

/**
 * W16.3 — one page per family that has prices TODAY in this locale (fa and ar only; en never has a price page).
 * The same list feeds the sitemap, hreflang, `/prices` and the category/product links (lib/pricing/price-hubs.ts).
 */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale) || !isPriceLocale(params.locale)) return [];
  return (await listPublishedHubFamilies(params.locale)).map((family) => ({ family: priceHubSegment(family) }));
}

async function resolve(rawLocale: string, segment: string): Promise<{ locale: PriceLocale; family: PriceHubCategoryCode } | null> {
  if (!isLocale(rawLocale) || !isPriceLocale(rawLocale)) return null;
  const family = (await listPublishedHubFamilies(rawLocale)).find((f) => priceHubSegment(f) === segment);
  return family ? { locale: rawLocale, family } : null;
}

/** The locales that publish this family's hub today — the page's hreflang set. */
async function hubLocales(family: PriceHubCategoryCode): Promise<Locale[]> {
  const out: Locale[] = [];
  for (const l of PRICE_PAGE_LOCALES) if ((await listPublishedHubFamilies(l)).includes(family)) out.push(l);
  return out;
}

async function familyRows(locale: PriceLocale, family: PriceHubCategoryCode) {
  return (await loadPriceTableRows(locale)).filter((r) => r.familyCode === family);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, family: segment } = await params;
  const hub = await resolve(rawLocale, segment);
  if (!hub) return {};
  const rows = await familyRows(hub.locale, hub.family);
  // W16.8: the family's newest price day; «امروز» only when it is the snapshot's day.
  const day = loadPriceDay(hub.locale, latestPricedAt(rows)!);
  const path = priceHubPath(hub.family);
  return buildPageMetadata({
    locale: hub.locale,
    path,
    title: hubTitle(hub.locale, hub.family, day),
    titleAbsolute: true,
    description: hubDescription(hub.locale, hub.family, day, rows),
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries((await hubLocales(hub.family)).map((l) => ({ locale: l, path }))),
  });
}

/**
 * The tables, links and FAQ. r4 isolation (as DailyPriceTable on /prices): this async boundary always suspends
 * once, so the price markup gets its own Flight row, away from the page row that carries the target-specific
 * robots value (lib/static/target-diff-gate.ts).
 */
async function HubContent({ locale, family }: { locale: PriceLocale; family: PriceHubCategoryCode }) {
  await Promise.resolve();
  const rows = await familyRows(locale, family);
  const latest = latestPricedAt(rows)!;
  const name = PRICE_HUB_FAMILY_COPY[family][locale].name;
  const t = PRICE_HUB_PAGE_COPY[locale];
  const page = PRICE_PAGE_COPY[locale];
  const column = PRICE_COLUMN_COPY[locale];
  const tableCopy = { product: t.product, size: t.size, price: column.header, unit: column.unit, weight: t.weight };
  const products = [...new Map(rows.map((r) => [r.productPagePath, r.productName])).entries()];
  const mills = locale === "fa" ? groupByMill(rows) : [];
  return (
    <>
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-6">
          <PriceUpdatedLine locale={locale} label={page.updated} at={latest} />
          <p className="text-muted-foreground max-w-3xl leading-relaxed">{t.intro(name)}</p>

          <h2 id="by-size" className="text-navy mt-4 text-2xl font-extrabold">
            {t.bySize(name)}
          </h2>
          <p className="text-tertiary text-xs md:hidden" aria-hidden="true">
            {t.swipe}
          </p>
          {groupBySize(rows).map((group) => (
            <div key={group.id} className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <h3 id={group.id} className="text-navy text-lg font-bold">
                <bdi>{t.sizeHeading(name, group.key)}</bdi>
              </h3>
              <HubPriceTable locale={locale} rows={group.rows} caption={t.sizeHeading(name, group.key)} showSize={false} copy={tableCopy} />
            </div>
          ))}

          {mills.length > 0 && (
            <>
              <h2 id="by-mill" className="text-navy mt-4 text-2xl font-extrabold">
                {t.byMill(name)}
              </h2>
              {mills.map((group) => (
                <div key={group.id} className="grid grid-cols-[minmax(0,1fr)] gap-3">
                  <h3 id={group.id} className="text-navy text-lg font-bold">
                    {t.millHeading(name, group.key)}
                  </h3>
                  <HubPriceTable locale={locale} rows={group.rows} caption={t.millHeading(name, group.key)} showSize copy={tableCopy} />
                </div>
              ))}
            </>
          )}

          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs leading-relaxed">{PRICE_DISCLAIMER[locale]}</p>
            {rows.some((r) => r.weight) && <p className="text-muted-foreground text-xs leading-relaxed">{NOMINAL_WEIGHT_DISCLAIMER[locale]}</p>}
          </div>
          <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="h-auto min-h-12 justify-self-start py-3">
            {t.cta}
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="hub-links" className="border-border bg-surface border-b section-y">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div className={cardVariants({ variant: "panel" })}>
            <h2 id="hub-links" className="text-navy text-lg font-bold">
              {t.links}
            </h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {products.map(([path, productName]) => (
                <li key={path}>
                  <Link href={localizedPath(locale, path)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                    {productName}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={localizedPath(locale, categoryListingPath(family))} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                  {t.category(name)}
                </Link>
              </li>
              {isWeightCalculatorPublished(locale) && (
                <li>
                  <Link href={localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                    {t.calculator(name)}
                  </Link>
                </li>
              )}
              <li>
                <Link href={localizedPath(locale, PRICE_PAGE_ROUTE)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                  {t.allPrices}
                </Link>
              </li>
            </ul>
          </div>
          <div className={cardVariants({ variant: "panel" })}>
            <h2 className="text-navy text-lg font-bold">{t.faqTitle}</h2>
            <dl className="mt-4 grid gap-4 text-sm leading-relaxed">
              {t.faq(name).map((item) => (
                <div key={item.q}>
                  <dt className="text-navy font-bold">{item.q}</dt>
                  <dd className="text-muted-foreground mt-1">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * W16.3 (D-SEO, keyword map §6 P1-1) — a family price hub: the family's rows of the day's snapshot, by size
 * (H3 + anchor per size) and, on fa, by mill; each row links to its product page. Same display rules as
 * `/prices` (fa price + factory + location + date; ar price + date only), no JSON-LD price.
 */
export default async function PriceHubPage({ params }: PageProps) {
  const { locale: rawLocale, family: segment } = await params;
  const hub = await resolve(rawLocale, segment);
  if (!hub) notFound();
  const { locale, family } = hub;
  const copy = PRICE_HUB_FAMILY_COPY[family][locale];
  const day = loadPriceDay(locale, latestPricedAt(await familyRows(locale, family))!);
  const t = PRICE_HUB_PAGE_COPY[locale];
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.eyebrow}
        title={hubHeading(locale, family, day)}
        breadcrumb={[
          { path: PRICE_PAGE_ROUTE, label: PRICE_PAGE_COPY[locale].eyebrow },
          { path: priceHubPath(family), label: copy.name },
        ]}
      />
      <HubContent locale={locale} family={family} />
    </>
  );
}
