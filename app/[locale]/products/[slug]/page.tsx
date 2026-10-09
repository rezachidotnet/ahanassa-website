import { ButtonLink } from "@/components/ui/button";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublishedCatalogTemplates, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";
import { resolveRouteRedirect } from "@/lib/catalog/route-redirects";
import { PageHero } from "@/components/ui/page-hero";
import { VariantSpecTable, variantRowAnchorId, variantSelectedLabel } from "@/components/products/variant-spec-table";
import { VariantHighlightFromQuery } from "@/components/products/variant-highlight-from-query";
import { CtaBand } from "@/components/ui/cta-band";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListSchema, jsonLdGraph, productSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/metadata/site";
import { primaryCta } from "@/lib/content/nav";
import { PriceBlock } from "@/components/products/price-block";
import { listDailyPriceHistory, listProductPagePrices } from "@/lib/pricing/product-page-price-repository";
import { firstPricedVariant, isPriceLocale, PRICE_BLOCK_ATTRIBUTE, PRICE_BLOCK_ON_REQUEST } from "@/lib/pricing/product-page-price";
import { sparklineSeries, tehranDay } from "@/lib/pricing/price-history";
import { PRICE_RFQ_COPY, priceRfqHref } from "@/lib/pricing/price-rfq";
import { PriceSparkline } from "@/components/products/price-sparkline";
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

  return buildPageMetadata({
    locale,
    path: `/products/${slug}`,
    title: entry.seo.seoTitle ?? entry.seo.h1 ?? entry.product.commercialTemplateName,
    description: entry.seo.seoDescription ?? entry.seo.intro ?? "",
    // D6 (docs/OWNER_DECISIONS.md): every published product page is
    // index,follow on the production target; other targets keep the
    // editorial index_status as before.
    indexable: publicPageIndexable(entry.seo.indexStatus === "index"),
    languageAlternates,
  });
}

/**
 * W9.4 — the daily price (owner decisions D-PRICE-DISPLAY / D-PRICE-AGE / D-W10-4, changed 2026-10-09):
 * fa — the W10.2 PriceBlock for the page's first priced variant (table order), or its missing-price
 * variant, and the «قیمت روز» column; ar — the price-only «سعر اليوم» column (no PriceBlock, no factory or
 * location); en — nothing. Prices come from the snapshot at build time; JSON-LD stays Product without
 * offers (architecture V1.1 §12).
 *
 * r4 isolation (same technique as TargetEnquiryForm in contact/page.tsx and NotFoundContent in
 * not-found.tsx): this async boundary always suspends once, so React emits the price block and the
 * table in their own Flight row. The page row carries the target-specific robots value; the size of
 * the price markup can then never move the point where React splits that row, which would make the
 * staging and production artifacts differ outside the allowlist (lib/static/target-diff-gate.ts).
 */
async function ProductSpecs({ locale, variants, title }: { locale: Locale; variants: ProductVariant[]; title: string }) {
  await Promise.resolve();
  // fa: PriceBlock + column; ar: price-only column; en: no price data at all (owner decision change 2026-10-09).
  const prices = isPriceLocale(locale) ? await listProductPagePrices(variants.map((v) => v.xid)) : null;
  const main = prices && locale === "fa" ? firstPricedVariant(sortVariantsBySize(variants), prices) : null;
  const mainSize = main ? (main.commercialSize ?? main.sectionSize ?? main.sku) : null;
  const mainPrice = main ? prices?.get(main.xid) : undefined;
  // W9.6: the 30-day chart of the main variant — only with ≥ 7 daily points (sparklineSeries), else nothing.
  const currentDay = mainPrice ? tehranDay(mainPrice.pricedAt) : null;
  const series = main && currentDay ? sparklineSeries(await listDailyPriceHistory(main.xid), currentDay) : null;
  const contact = localizedPath(locale, "/contact");
  return (
    <>
      {prices && locale === "fa" && (
        <div className="mt-6 max-w-md">
          <div {...{ [PRICE_BLOCK_ATTRIBUTE]: main?.xid ?? PRICE_BLOCK_ON_REQUEST }}>
            <PriceBlock
              locale={locale}
              price={mainPrice ?? null}
              rfqHref={main && mainPrice ? priceRfqHref("fa", main.xid, mainPrice.factoryName) : contact}
              priceCtaLabel={PRICE_RFQ_COPY.fa}
              productName={mainSize ? `${title} ${mainSize}` : title}
              trend={series && currentDay ? <PriceSparkline series={series} currentDay={currentDay} /> : undefined}
            />
          </div>
        </div>
      )}
      <div className="mt-6">
        <VariantSpecTable locale={locale} variants={variants} prices={prices} />
      </div>
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
          <ProductSpecs locale={locale} variants={variants} title={seo.h1 ?? product.commercialTemplateName} />
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

      <CtaBand locale={locale} />
    </>
  );
}
