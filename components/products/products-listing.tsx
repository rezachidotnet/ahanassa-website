import type { Locale } from "@/config/locales";
import { getPublicCatalogFilterFacets, listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { resolveCategoryGroupCodes } from "@/lib/catalog/public-categories";
import type { PublicCatalogCategory } from "@/lib/catalog/types";
import { PageHero } from "@/components/ui/page-hero";
import { CatalogFilterBar } from "@/components/products/catalog-filter-bar";
import { CatalogTemplateGrid } from "@/components/products/catalog-template-grid";
import { CatalogEmptyState } from "@/components/products/catalog-empty-state";
import { CtaBand } from "@/components/ui/cta-band";

export const productsHeroCopy: Record<Locale, { eyebrow: string; title: string; body: string }> = {
  fa: { eyebrow: "محصولات", title: "گروه‌های کالایی فولاد و آلیاژ.", body: "هر گروه کالایی زیر بخشی از خدمت مدیریت خرید آهن آساست، نه یک فروشگاه آنلاین." },
  en: { eyebrow: "Products", title: "Steel and alloy product categories.", body: "Each category below is part of Ahan Asa's purchasing-management service, not an online store." },
  ar: { eyebrow: "المنتجات", title: "فئات منتجات الصلب والسبائك.", body: "كل فئة أدناه جزء من خدمة إدارة الشراء لدى آهن آسا، وليست متجرًا إلكترونيًا." },
};

/**
 * Spike S1: the /products listing body, shared by /products (no category)
 * and the static /products/category/<segment> routes. Same repository calls
 * and predicates as the SSR page — only the category comes from the route
 * instead of `?category=`. The non-category facets (family/form/grade/
 * standard) are query-string toggles and have no static equivalent, so the
 * static filter bar shows the category row only (reported as a parity gap).
 */
export async function ProductsListing({ locale, categoryCode }: { locale: Locale; categoryCode: string | undefined }) {
  let categories: PublicCatalogCategory[] = [];
  try {
    categories = await listPublicCatalogCategories(locale);
  } catch (error) {
    console.error("PRODUCTS_CATEGORY_LIST_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  const filters = { categoryCode, familyCode: undefined, groupCode: undefined, formCode: undefined, gradeCode: undefined, standardCode: undefined, groupCodes: resolveCategoryGroupCodes(categories, categoryCode) };
  const [templates, facets] = await Promise.all([listPublishedCatalogTemplates(locale, filters), getPublicCatalogFilterFacets(locale, filters)]);
  const t = productsHeroCopy[locale];

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/products", label: t.eyebrow }]} />

      {templates.length === 0 && !categoryCode ? (
        <CatalogEmptyState locale={locale} variant="catalog-preparing" />
      ) : (
        <>
          <div className="container-x pt-10">
            <CatalogFilterBar locale={locale} categories={categories} facets={facets} active={{ category: categoryCode }} categoryOnly />
          </div>
          {templates.length === 0 ? <CatalogEmptyState locale={locale} variant="no-filter-match" /> : <CatalogTemplateGrid locale={locale} templates={templates} />}
        </>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
