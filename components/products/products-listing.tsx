import type { Locale } from "@/config/locales";
import { listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { categoryListingPath, resolveCategoryGroupCodes } from "@/lib/catalog/public-categories";
import type { PublicCatalogCategory } from "@/lib/catalog/types";
import { PageHero } from "@/components/ui/page-hero";
import { CatalogFilterBar } from "@/components/products/catalog-filter-bar";
import { CatalogTemplateGrid } from "@/components/products/catalog-template-grid";
import { CatalogEmptyState } from "@/components/products/catalog-empty-state";
import { CtaBand } from "@/components/ui/cta-band";
import Link from "@/components/ui/link";
import { localizedPath } from "@/config/locales";
import { RAW_MATERIALS_ROUTE } from "@/lib/content/raw-materials";
import { EXPORT_ROUTE, isExportPublished } from "@/lib/content/export";

/** W16.3 (D-SEO): the products index links the RFQ-only raw materials and, on en/ar, the export page. */
const moreLinks: Record<Locale, { raw: string; export: string }> = {
  fa: { raw: "مواد اولیه فولاد: شمش، آهن اسفنجی، سنگ آهن و بریکت (فقط استعلام)", export: "" },
  en: { raw: "Steel raw materials: billet, DRI, iron ore and HBI (on request)", export: "Steel export from Iran" },
  ar: { raw: "المواد الخام للصلب: البليت والحديد الإسفنجي وخام الحديد وHBI (عبر الطلب)", export: "تصدير الحديد من إيران" },
};

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
export async function ProductsListing({
  locale,
  category,
  hero,
  intro,
}: {
  locale: Locale;
  category?: PublicCatalogCategory;
  /** W16.3: a category page's own H1 and hero line (lib/content/category-seo.ts); default = the products index copy. */
  hero?: { title: string; body?: string };
  /** W16.3: the category intro (text + links), rendered between the hero and the filter bar. */
  intro?: React.ReactNode;
}) {
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
      <PageHero locale={locale} eyebrow={t.eyebrow} title={hero?.title ?? t.title} body={hero ? hero.body : t.body} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/products", label: t.eyebrow }, ...(category && hero ? [{ path: categoryListingPath(category.code), label: hero.title }] : [])]} />
      {intro}

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

      {!category && (
        <ul className="container-x flex flex-wrap gap-x-8 gap-y-2 pb-12 text-sm font-semibold">
          <li>
            <Link href={localizedPath(locale, RAW_MATERIALS_ROUTE)} className="text-navy hover:text-copper underline underline-offset-4">
              {moreLinks[locale].raw}
            </Link>
          </li>
          {isExportPublished(locale) && (
            <li>
              <Link href={localizedPath(locale, EXPORT_ROUTE)} className="text-navy hover:text-copper underline underline-offset-4">
                {moreLinks[locale].export}
              </Link>
            </li>
          )}
        </ul>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
