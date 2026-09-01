import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { getPublishedCatalogTemplateBySlug, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";
import { PageHero } from "@/components/ui/page-hero";
import { VariantSpecTable, variantRowAnchorId } from "@/components/products/variant-spec-table";
import { ScrollToAnchor } from "@/components/products/scroll-to-anchor";
import { CtaBand } from "@/components/ui/cta-band";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListSchema, jsonLdGraph } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/metadata/site";
import { primaryCta } from "@/lib/content/nav";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const chrome: Record<Locale, { productsLabel: string; specs: string; back: string }> = {
  fa: { productsLabel: "محصولات", specs: "مشخصات فنی و اندازه‌های موجود", back: "بازگشت به همه محصولات" },
  en: { productsLabel: "Products", specs: "Technical specifications and available sizes", back: "Back to all products" },
  ar: { productsLabel: "المنتجات", specs: "المواصفات الفنية والمقاسات المتاحة", back: "العودة إلى جميع المنتجات" },
};

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
    // Site-wide pre-launch posture (see /products' own generateMetadata)
    // still applies via robots.ts outside production, but per-entity
    // indexability is real once the site does launch — never hardcoded true.
    indexable: entry.seo.indexStatus === "index",
    languageAlternates,
  });
}

/**
 * The real, DB_PUBLIC-backed Product/Template detail page
 * (docs/CATALOG_PUBLIC_ROUTES.md). `getPublishedCatalogTemplateBySlug` is
 * structurally unable to return an unpublished/inactive/editorially-
 * incomplete template — a 404 here means either the slug never existed or
 * the template is not (yet) publicly eligible; both render identically to
 * avoid leaking publication state to an unauthenticated visitor.
 */
export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const entry = await getPublishedCatalogTemplateBySlug(locale, slug);
  if (!entry) notFound();
  const t = chrome[locale];
  const { product, seo, variants } = entry;

  // Preserve/highlight a specific Variant within its Template page
  // (Go-Live Readiness variant-navigation audit) — never a dedicated
  // Variant SEO page. Only a `?variant=` value that actually matches one of
  // THIS template's own currently-public variants is honored; anything else
  // (unknown, archived, or belonging to a different template) is silently
  // ignored rather than shown as a fabricated match.
  const rawVariantParam = (await searchParams).variant;
  const requestedVariantXid = Array.isArray(rawVariantParam) ? rawVariantParam[0] : rawVariantParam;
  const highlightedVariant = requestedVariantXid ? variants.find((v) => v.xid === requestedVariantXid) : undefined;

  const breadcrumbJsonLd = jsonLdGraph([
    breadcrumbListSchema([
      { name: t.productsLabel, url: `${siteConfig.baseUrl}${localizedPath(locale, "/products")}` },
      { name: seo.h1 ?? product.commercialTemplateName, url: `${siteConfig.baseUrl}${localizedPath(locale, `/products/${slug}`)}` },
    ]),
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
          <div className="mt-6">
            <VariantSpecTable locale={locale} variants={variants} highlightXid={highlightedVariant?.xid} />
          </div>
          {highlightedVariant && <ScrollToAnchor anchorId={variantRowAnchorId(highlightedVariant.sku)} />}

          <Link href={localizedPath(locale, "/contact")} className="bg-navy hover:bg-navy-700 mt-10 inline-flex items-center gap-2.5 px-7 py-4 text-sm font-semibold tracking-wide text-white transition-colors">
            {primaryCta[locale].full}
          </Link>

          <div className="mt-6">
            <Link href={localizedPath(locale, "/products")} className="text-copper text-sm font-semibold hover:underline">
              {t.back}
            </Link>
          </div>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
