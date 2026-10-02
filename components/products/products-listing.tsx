import type { Locale } from "@/config/locales";
import { listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
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
 * The DB_PUBLIC-backed catalog listing (docs/CATALOG_PUBLIC_ROUTES.md),
 * shared by /products (all categories) and the static
 * /products/category/<segment> routes. Publication-eligible template
 * entities only — `listPublishedCatalogTemplates` is structurally unable to
 * return anything else. The real zero-published-template state renders the
 * honest empty state, never sample data. The category's group set comes
 * from the synced Odoo category snapshot (BOX_SECTION -> RHS + SHS); the
 * website never maps categories to groups itself.
 */
export async function ProductsListing({ locale, category }: { locale: Locale; category?: PublicCatalogCategory }) {
  // Category list failure isolation: a failed read leaves the category row
  // out instead of failing the whole listing. Same tag+JSON logging
  // convention as the Header/Homepage projection reads.
  let categories: PublicCatalogCategory[] = [];
  try {
    categories = await listPublicCatalogCategories(locale);
  } catch (error) {
    console.error("PRODUCTS_CATEGORY_LIST_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  const filters = category ? { categoryCode: category.code, groupCodes: resolveCategoryGroupCodes(categories, category.code) } : {};
  const templates = await listPublishedCatalogTemplates(locale, filters);
  const t = productsHeroCopy[locale];

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/products", label: t.eyebrow }]} />

      {templates.length === 0 && !category ? (
        <CatalogEmptyState locale={locale} variant="catalog-preparing" />
      ) : (
        <>
          {/* Kept visible on an empty category too, so a visitor can switch to another category directly. */}
          <div className="container-x pt-10">
            <CatalogFilterBar locale={locale} categories={categories} activeCategoryCode={category?.code} />
          </div>
          {templates.length === 0 ? <CatalogEmptyState locale={locale} variant="no-filter-match" /> : <CatalogTemplateGrid locale={locale} templates={templates} />}
        </>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
