import { ButtonLink } from "@/components/ui/button";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";
import { findCategoryForVariant } from "@/lib/catalog/public-categories";
import { resolveRouteRedirect } from "@/lib/catalog/route-redirects";
import { PageHero } from "@/components/ui/page-hero";
import { VariantSpecTable, variantRowAnchorId, variantSelectedLabel } from "@/components/products/variant-spec-table";
import { VariantHighlightFromQuery } from "@/components/products/variant-highlight-from-query";
import { CtaBand } from "@/components/ui/cta-band";
import { TrackOnView } from "@/components/analytics/track-on-view";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListSchema, jsonLdGraph, productOffersSchema, productSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/metadata/site";
import { primaryCta } from "@/lib/content/nav";
import { PriceBlock } from "@/components/products/price-block";
import { listDailyPriceHistory, listLowestPricesIrr, listProductPageImportedPrices, listProductPagePrices } from "@/lib/pricing/product-page-price-repository";
import { firstPricedVariant, isPriceLocale, PRICE_BLOCK_ATTRIBUTE, PRICE_BLOCK_ON_REQUEST, PRICE_ORIGIN_ATTRIBUTE, PRICE_ORIGIN_COPY } from "@/lib/pricing/product-page-price";
import { sparklineSeries, tehranDay } from "@/lib/pricing/price-history";
import { PRICE_RFQ_COPY, priceRfqHref } from "@/lib/pricing/price-rfq";
import { PriceSparkline } from "@/components/products/price-sparkline";
import { PriceDecision } from "@/components/products/price-decision";
import { priceWindows, windowPoints } from "@/lib/pricing/price-position";
import { chartWindowStart, priceChartPath, PRICE_CHART_WINDOW_DAYS } from "@/lib/pricing/price-charts";
import { priceChartForSlug } from "@/lib/pricing/price-chart-data";
import { loadPriceDay } from "@/lib/pricing/price-page-data";
import { faProductPriceTitle, type PriceDay } from "@/lib/pricing/price-titles";
import { listIndicators } from "@/lib/indicators/repository";
import { ProductRelatedLinks } from "@/components/products/product-related-links";
import { GroupServicesBox } from "@/components/group/group-services-box";
import { showGroupServices } from "@/lib/content/company";
import { sortVariantsBySize } from "@/lib/catalog/specification-presenter";
import type { ProductVariant } from "@/lib/catalog/types";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const chrome: Record<Locale, { productsLabel: string; specs: string; back: string }> = {
  fa: { productsLabel: "محصولات", specs: "مشخصات فنی و اندازه‌های موجود", back: "بازگشت به همه محصولات" },
  en: { productsLabel: "Products", specs: "Technical specifications and available sizes", back: "Back to all products" },
  ar: { productsLabel: "المنتجات", specs: "المواصفات الفنية والمقاسات المتاحة", back: "العودة إلى جميع المنتجات" },
};

/** Every published template for the locale, from the snapshot — the same publication gate as the listing (architecture V1.1 §4.1). */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : "fa";
  return (await listPublishedCatalogTemplates(locale)).map((t) => ({ slug: t.seo.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const entry = await getPublishedCatalogTemplateBySlug(locale, slug);
  if (!entry) {
    return { title: locale === "fa" ? "محصول یافت نشد" : locale === "ar" ? "المنتج غير موجود" : "Product not found" };
  }
  // Only advertise hreflang alternates for locales that actually have a
  // published editorial page for this exact template — Go-Live Readiness
  // Stage H's own requirement ("do not create hreflang links to unpublished
  // localized Product pages"). Each locale's own slug is used (never the
  // current locale's slug reused across locales, since
  // product_seo_contents.slug is independent per (entity, locale) row).
  const publishedLocales = await listPublishedLocalesForProduct(entry.product.id);
  const languageAlternates = buildLanguageAlternatesFromEntries(
    publishedLocales.map(({ locale: l, slug: s }) => ({ locale: l, path: `/products/${s}` })),
  );

  const title = entry.seo.seoTitle ?? entry.seo.h1 ?? entry.product.commercialTemplateName;
  // W16.8: a fa page with a published price says so, with the newest price's date («— قیمت امروز ۲۸ مهر ۱۴۰۵»), when it fits 60.
  const priced = locale === "fa" ? await newestPriceDay(entry.variants) : null;

  return buildPageMetadata({
    locale,
    path: `/products/${slug}`,
    title: priced ? faProductPriceTitle(title, priced) : title,
    titleAbsolute: priced !== null,
    description: entry.seo.seoDescription ?? entry.seo.intro ?? "",
    // D6 (docs/OWNER_DECISIONS.md): every published product page is
    // index,follow on the production target; other targets keep the
    // editorial index_status as before.
    indexable: publicPageIndexable(entry.seo.indexStatus === "index"),
    languageAlternates,
  });
}

/** W16.8: the fa day of the newest published price of the page's variants, or null when none has a price (or outside the static build). W34: domestic or imported (a date, never a price comparison). */
async function newestPriceDay(variants: readonly ProductVariant[]): Promise<PriceDay | null> {
  const xids = variants.map((v) => v.xid);
  const prices = [...((await listProductPagePrices(xids))?.values() ?? []), ...((await listProductPageImportedPrices(xids))?.values() ?? [])];
  const newest = prices.reduce<string | null>((max, p) => (max === null || p.pricedAt > max ? p.pricedAt : max), null);
  return newest ? loadPriceDay("fa", newest) : null;
}

/**
 * W9.4 — the daily price (owner decisions D-PRICE-DISPLAY / D-PRICE-AGE / D-W10-4, changed 2026-10-09):
 * fa — the W10.2 PriceBlock for the page's first priced variant (table order), or its missing-price
 * variant, and the «قیمت روز» column; ar — the price-only «سعر اليوم» column (no PriceBlock, no factory or
 * location); en — nothing. Prices come from the snapshot at build time. W20.7: the JSON-LD offers (the lowest
 * per variant) are ProductOffers below, fa/ar only.
 *
 * W34 (owner 2026-10-21): the lowest IMPORTED price is shown apart, never compared with the domestic one: on fa its
 * own PriceBlock («کمترین قیمت وارداتی …», the first variant that has one, no chart) and on fa/ar its own table
 * column. With both origins the domestic block is titled «کمترین قیمت داخلی …»; with only imported prices there is
 * no domestic "on request" block. The chart, gauge, JSON-LD offers and weight calculator stay domestic.
 *
 * r4 isolation (same technique as TargetEnquiryForm in contact/page.tsx and NotFoundContent in
 * not-found.tsx): this async boundary always suspends once, so React emits the price block and the
 * table in their own Flight row. The page row carries the target-specific robots value; the size of
 * the price markup can then never move the point where React splits that row, which would make the
 * staging and production artifacts differ outside the allowlist (lib/static/target-diff-gate.ts).
 */
async function ProductSpecs({ locale, variants, title, slug }: { locale: Locale; variants: ProductVariant[]; title: string; slug: string }) {
  await Promise.resolve();
  // fa: PriceBlock + column; ar: price-only column; en: no price data at all (owner decision change 2026-10-09).
  const prices = isPriceLocale(locale) ? await listProductPagePrices(variants.map((v) => v.xid)) : null;
  const imported = isPriceLocale(locale) ? await listProductPageImportedPrices(variants.map((v) => v.xid)) : null;
  const main = prices && locale === "fa" ? firstPricedVariant(sortVariantsBySize(variants), prices) : null;
  const mainImported = imported && locale === "fa" ? firstPricedVariant(sortVariantsBySize(variants), imported) : null;
  const mainImportedPrice = mainImported ? imported?.get(mainImported.xid) : undefined;
  const mainImportedSize = mainImported ? (mainImported.commercialSize ?? mainImported.sectionSize ?? mainImported.sku) : null;
  const mainSize = main ? (main.commercialSize ?? main.sectionSize ?? main.sku) : null;
  const mainPrice = main ? prices?.get(main.xid) : undefined;
  // W9.6: the 30-day chart of the main variant — only with ≥ 7 daily points (sparklineSeries), else nothing.
  const currentDay = mainPrice ? tehranDay(mainPrice.pricedAt) : null;
  const history = main && currentDay ? await listDailyPriceHistory(main.xid) : [];
  const series = main && currentDay ? sparklineSeries(history, currentDay) : null;
  const contact = localizedPath(locale, "/contact");
  // W18.2: the decision block — the 30/90-day position of today's price, a 90-day mini trend when the history reaches
  // past 30 days, the market drivers line and «قیمت قطعی برای حجم شما» (fa only; nothing without a priced main variant).
  const windows = main && currentDay ? priceWindows(history, currentDay) : [];
  const has90 = windows.some((w) => w.window === 90);
  const chart = windows.length ? await priceChartForSlug(slug) : null;
  const indicators = windows.length ? await listIndicators() : [];
  return (
    <>
      {prices && locale === "fa" && (
        <div className="mt-6 max-w-md">
          {(main || !mainImported) && (
            <div {...{ [PRICE_BLOCK_ATTRIBUTE]: main?.xid ?? PRICE_BLOCK_ON_REQUEST }}>
              <PriceBlock
                locale={locale}
                price={mainPrice ?? null}
                rfqHref={main && mainPrice ? priceRfqHref("fa", main.xid, mainPrice.factoryName) : contact}
                priceCtaLabel={PRICE_RFQ_COPY.fa}
                productName={mainSize ? `${title} ${mainSize}` : title}
                trend={series && currentDay ? <PriceSparkline series={series} currentDay={currentDay} /> : undefined}
                heading={mainImported ? PRICE_ORIGIN_COPY.fa.domestic : undefined}
              />
            </div>
          )}
          {main && mainPrice && currentDay && windows.length > 0 && (
            <div className="mt-4">
              <PriceDecision
                xid={main.xid}
                slug={slug}
                windows={windows}
                trend={has90 ? { series: windowPoints(history, currentDay, PRICE_CHART_WINDOW_DAYS), from: chartWindowStart(currentDay, PRICE_CHART_WINDOW_DAYS), to: currentDay, days: PRICE_CHART_WINDOW_DAYS } : null}
                indicators={indicators}
                rfqHref={priceRfqHref("fa", main.xid, mainPrice.factoryName)}
                chartHref={chart ? localizedPath("fa", priceChartPath(chart.slug)) : null}
              />
            </div>
          )}
          {mainImported && mainImportedPrice && (
            // W34: the lowest imported price, its own block (no chart: the history drawn is the domestic one).
            <div className={main ? "mt-4" : undefined} {...{ [PRICE_BLOCK_ATTRIBUTE]: mainImported.xid, [PRICE_ORIGIN_ATTRIBUTE]: "imported" }}>
              <PriceBlock
                locale={locale}
                price={mainImportedPrice}
                rfqHref={priceRfqHref("fa", mainImported.xid, mainImportedPrice.factoryName)}
                priceCtaLabel={PRICE_RFQ_COPY.fa}
                productName={`${title} ${mainImportedSize}`}
                heading={PRICE_ORIGIN_COPY.fa.imported}
              />
            </div>
          )}
        </div>
      )}
      <div className="mt-6">
        <VariantSpecTable locale={locale} variants={variants} prices={prices} importedPrices={imported} />
      </div>
    </>
  );
}

/**
 * W20.7 (owner, 2026-10-16) — the Product node's `offers`: each priced variant's lowest price (lib/seo/schema.ts
 * productOffersSchema), fa and ar only, nothing without a price. Its own async boundary, like ProductSpecs, so the
 * page row that carries the target-specific robots value is unchanged (r4).
 */
async function ProductOffers({ locale, variants, url }: { locale: Locale; variants: ProductVariant[]; url: string }) {
  await Promise.resolve();
  if (!isPriceLocale(locale)) return null;
  const offers = await listLowestPricesIrr(sortVariantsBySize(variants).map((v) => v.xid));
  if (offers.length === 0) return null;
  return <JsonLd data={jsonLdGraph([productOffersSchema({ url, offers })])} />;
}

/**
 * D-ARTICLE-METRICS product funnel: product_view on every load, and the page's catalog family as a
 * `data-product-family` marker for rfq_cta_click (components/analytics/analytics-runtime.tsx). Its own async
 * boundary (as ProductSpecs), so the page row that carries the target-specific robots value is unchanged.
 */
async function ProductAnalytics({ locale, slug, groupCode, formCode }: { locale: Locale; slug: string; groupCode: string | null; formCode: string | null }) {
  await Promise.resolve();
  const family = groupCode ? (findCategoryForVariant(await listPublicCatalogCategories(locale), groupCode, formCode)?.code ?? null) : null;
  return (
    <>
      {family && <span hidden data-product-family={family} />}
      <TrackOnView event="product_view" params={{ product_family: family ?? undefined, product_slug: slug }} />
    </>
  );
}

/**
 * The real, DB_PUBLIC-backed Product/Template detail page
 * (docs/CATALOG_PUBLIC_ROUTES.md). `getPublishedCatalogTemplateBySlug` is
 * structurally unable to return an unpublished/inactive/editorially-
 * incomplete template — a 404 here means either the slug never existed or
 * the template is not (yet) publicly eligible; both render identically to
 * avoid leaking publication state to an unauthenticated visitor.
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const entry = await getPublishedCatalogTemplateBySlug(locale, slug);
  if (!entry) {
    // Slug/Route Lifecycle (this task's §11-12, HTTP semantics hardened by
    // DAR-054): a real miss is either a recorded canonical-slug change
    // (permanent redirect to the current URL) or a genuinely
    // never-existing/unpublished path (a plain 404 — never a fabricated
    // replacement/never a redirect to /products or the homepage).
    // `permanentRedirect()` (not `redirect()`) is used deliberately — it is
    // the only call in this stack's Next.js App Router that actually emits
    // HTTP 308, matching the `status_code = 308` the row itself stores
    // (`migrations_public/0006_route_redirects_308.sql`); a plain
    // `redirect()` would emit a temporary 307/303 while the database
    // claimed a permanent redirect, which is exactly the DB/HTTP semantics
    // mismatch this hardening pass fixes. A recorded terminal (410)
    // disposition also renders as a 404 today, deliberately — returning a
    // real HTTP 410 needs a Route Handler rather than a page component;
    // that plumbing is a documented, deferred gap (docs/CATALOG_PUBLIC_ROUTES.md),
    // not fabricated here.
    const redirectEntry = await resolveRouteRedirect(locale, `/products/${slug}`);
    if (redirectEntry?.statusCode === 308 && redirectEntry.targetPath) {
      permanentRedirect(localizedPath(locale, redirectEntry.targetPath));
    }
    notFound();
  }
  const t = chrome[locale];
  const { product, seo, variants } = entry;

  // `?variant=` row highlight happens in the browser (VariantHighlightFromQuery);
  // only this template's own public variants are in its lookup map.
  const variantRowIds = Object.fromEntries(variants.map((v) => [v.xid, variantRowAnchorId(v.sku)]));

  const pageUrl = `${siteConfig.baseUrl}${localizedPath(locale, `/products/${slug}`)}`;
  const breadcrumbJsonLd = jsonLdGraph([
    breadcrumbListSchema([
      { name: t.productsLabel, url: `${siteConfig.baseUrl}${localizedPath(locale, "/products")}` },
      { name: seo.h1 ?? product.commercialTemplateName, url: pageUrl },
    ]),
    // Architecture V1.1 §12: Product without price, from the visible heading/intro only.
    productSchema({ url: pageUrl, name: seo.h1 ?? product.commercialTemplateName, description: seo.intro }),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        breadcrumbJsonLd={false}
        locale={locale}
        eyebrow={t.productsLabel}
        title={seo.h1 ?? product.commercialTemplateName}
        body={seo.intro ?? undefined}
        breadcrumb={[
          { path: "/products", label: t.productsLabel },
          { path: `/products/${slug}`, label: seo.h1 ?? product.commercialTemplateName },
        ]}
      />

      <section className="border-border bg-background border-b py-16 lg:py-20">
        <div className="container-x">
          <h2 className="text-navy text-lg font-bold">{t.specs}</h2>
          <ProductSpecs locale={locale} variants={variants} title={seo.h1 ?? product.commercialTemplateName} slug={slug} />
          <VariantHighlightFromQuery rows={variantRowIds} selectedLabel={variantSelectedLabel(locale)} />

          <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="mt-10 h-auto min-h-12 py-3">
            {primaryCta[locale].full}
          </ButtonLink>

          <div className="mt-4">
            <ButtonLink href={localizedPath(locale, "/products")} variant="link">
              {t.back}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* W16.3 (D-SEO): category, sibling grades, price hub, calculator, articles (components/products/product-related-links.tsx). */}
      <ProductRelatedLinks locale={locale} templateXid={product.templateXid} slug={slug} groupCode={variants[0]?.group.code ?? null} formCode={variants[0]?.form.code ?? null} />

      {/* W16.6: «خدمات مکمل گروه» on beam, box/profile and coated-sheet products only (lib/content/company.ts). */}
      {showGroupServices(variants.flatMap((v) => [v.family.code, v.group.code, v.form.code, v.group.name, v.form.name])) && (
        <section className="border-border bg-background border-b section-y">
          <GroupServicesBox locale={locale} className="container-x" />
        </section>
      )}

      <CtaBand locale={locale} />
      <ProductOffers locale={locale} variants={variants} url={pageUrl} />
      <ProductAnalytics locale={locale} slug={slug} groupCode={variants[0]?.group.code ?? null} formCode={variants[0]?.form.code ?? null} />
    </>
  );
}
