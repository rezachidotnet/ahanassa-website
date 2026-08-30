import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { parseCatalogFilterParams } from "@/lib/catalog/catalog-filters";
import { getPublicCatalogFilterFacets, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { PageHero } from "@/components/ui/page-hero";
import { CatalogFilterBar } from "@/components/products/catalog-filter-bar";
import { CatalogTemplateGrid } from "@/components/products/catalog-template-grid";
import { CatalogEmptyState } from "@/components/products/catalog-empty-state";
import { CtaBand } from "@/components/ui/cta-band";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const heroCopy: Record<Locale, { eyebrow: string; title: string; body: string }> = {
  fa: { eyebrow: "محصولات", title: "گروه‌های کالایی فولاد و آلیاژ.", body: "هر گروه کالایی زیر بخشی از خدمت مدیریت خرید آهن آساست، نه یک فروشگاه آنلاین." },
  en: { eyebrow: "Products", title: "Steel and alloy product categories.", body: "Each category below is part of Ahan Asa's purchasing-management service, not an online store." },
  ar: { eyebrow: "المنتجات", title: "فئات منتجات الصلب والسبائك.", body: "كل فئة أدناه جزء من خدمة إدارة الشراء لدى آهن آسا، وليست متجرًا إلكترونيًا." },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = heroCopy[locale];
  // The listing shell itself follows the same site-wide pre-launch noindex
  // posture every other page currently uses (CLAUDE.md §5a / DAR-037) —
  // independent of how many templates happen to be published right now.
  return buildPageMetadata({ locale, path: "/products", title: t.title, description: t.body, indexable: false });
}

/**
 * The real, DB_PUBLIC-backed catalog listing (docs/CATALOG_PUBLIC_ROUTES.md).
 * Publication-eligible template entities only — `listPublishedCatalogTemplates`
 * is structurally unable to return anything else. Handles the current, real,
 * legitimate zero-published-template state gracefully rather than falling
 * back to sample data (Stage M/J boundary).
 */
export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const rawParams = await searchParams;
  const filters = parseCatalogFilterParams(rawParams);
  const activeQuery = { family: filters.familyCode, group: filters.groupCode, form: filters.formCode, grade: filters.gradeCode, standard: filters.standardCode };

  const [templates, facets] = await Promise.all([listPublishedCatalogTemplates(locale, filters), getPublicCatalogFilterFacets(locale)]);
  const t = heroCopy[locale];

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/products", label: t.eyebrow }]} />

      {templates.length === 0 ? (
        <CatalogEmptyState locale={locale} />
      ) : (
        <>
          <div className="container-x pt-10">
            <CatalogFilterBar locale={locale} facets={facets} active={activeQuery} />
          </div>
          <CatalogTemplateGrid locale={locale} templates={templates} />
        </>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
