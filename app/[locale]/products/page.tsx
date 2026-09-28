import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { parseCatalogFilterParams } from "@/lib/catalog/catalog-filters";
import { getPublicCatalogFilterFacets, listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { resolveCategoryGroupCodes } from "@/lib/catalog/public-categories";
import type { PublicCatalogCategory } from "@/lib/catalog/types";
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
 *
 * `?category=<code>` selects an Odoo public category (the Homepage Showcase
 * and Header link here). The code is resolved against the synced category
 * snapshot to Odoo's own `group_codes` (e.g. BOX_SECTION -> RHS + SHS), and
 * the listing shows every published template with a public variant in any
 * of those groups — the website never maps categories to groups itself.
 */
export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const rawParams = await searchParams;
  const parsed = parseCatalogFilterParams(rawParams);

  // Category list failure isolation: a failed read leaves the category row
  // out of the filter bar (and an explicit ?category= then matches nothing
  // — the honest no-match state) instead of failing the whole listing.
  // Same tag+JSON logging convention as the Header/Homepage projection reads.
  let categories: PublicCatalogCategory[] = [];
  try {
    categories = await listPublicCatalogCategories(locale);
  } catch (error) {
    console.error("PRODUCTS_CATEGORY_LIST_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  const filters = { ...parsed, groupCodes: resolveCategoryGroupCodes(categories, parsed.categoryCode) };
  const activeQuery = { category: filters.categoryCode, family: filters.familyCode, group: filters.groupCode, form: filters.formCode, grade: filters.gradeCode, standard: filters.standardCode };

  const [templates, facets] = await Promise.all([listPublishedCatalogTemplates(locale, filters), getPublicCatalogFilterFacets(locale, filters)]);
  const t = heroCopy[locale];
  const hasActiveFilters = Object.values(activeQuery).some(Boolean);

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} image="/images/ops/mill-exterior.png" breadcrumb={[{ path: "/products", label: t.eyebrow }]} />

      {templates.length === 0 && !hasActiveFilters ? (
        <CatalogEmptyState locale={locale} variant="catalog-preparing" />
      ) : (
        <>
          {/* Kept visible on a filtered-to-zero result too, so a visitor who
              opened a category with nothing published yet can switch to
              another category directly. */}
          <div className="container-x pt-10">
            <CatalogFilterBar locale={locale} categories={categories} facets={facets} active={activeQuery} />
          </div>
          {templates.length === 0 ? <CatalogEmptyState locale={locale} variant="no-filter-match" /> : <CatalogTemplateGrid locale={locale} templates={templates} />}
        </>
      )}

      <CtaBand locale={locale} />
    </>
  );
}
