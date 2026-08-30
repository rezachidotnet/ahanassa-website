import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { getPublishedCatalogTemplateBySlug } from "@/lib/catalog/editorial-repository";
import { PageHero } from "@/components/ui/page-hero";
import { VariantSpecTable } from "@/components/products/variant-spec-table";
import { CtaBand } from "@/components/ui/cta-band";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListSchema, jsonLdGraph } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/metadata/site";
import { primaryCta } from "@/lib/content/nav";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
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
  return buildPageMetadata({
    locale,
    path: `/products/${slug}`,
    title: entry.seo.seoTitle ?? entry.seo.h1 ?? entry.product.commercialTemplateName,
    description: entry.seo.seoDescription ?? entry.seo.intro ?? "",
    // Site-wide pre-launch posture (see /products' own generateMetadata)
    // still applies via robots.ts outside production, but per-entity
    // indexability is real once the site does launch — never hardcoded true.
    indexable: entry.seo.indexStatus === "index",
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
export default async function ProductDetailPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const entry = await getPublishedCatalogTemplateBySlug(locale, slug);
  if (!entry) notFound();
  const t = chrome[locale];
  const { product, seo, variants } = entry;

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
            <VariantSpecTable locale={locale} variants={variants} />
          </div>

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
