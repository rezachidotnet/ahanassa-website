import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { buildQueryString, selectCategoryQuery, toggleFilterQueryValue, type CatalogFilterQueryKey } from "@/lib/catalog/catalog-filters";
import type { CatalogFilterFacets } from "@/lib/catalog/editorial-repository";
import type { PublicCatalogCategory } from "@/lib/catalog/types";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { cn } from "@/lib/utils";

const dimensionLabel: Record<CatalogFilterQueryKey, Record<Locale, string>> = {
  category: { fa: "دسته‌بندی", en: "Category", ar: "الفئة" },
  family: { fa: "خانواده کالایی", en: "Family", ar: "الفئة" },
  group: { fa: "گروه", en: "Group", ar: "المجموعة" },
  form: { fa: "شکل محصول", en: "Form", ar: "الشكل" },
  grade: { fa: "گرید", en: "Grade", ar: "الدرجة" },
  standard: { fa: "استاندارد", en: "Standard", ar: "المعيار" },
};

/**
 * Server-rendered, URL/query-param-based filters (Stage F) — every option is
 * a plain `<Link>`, no client JS. Facets are pre-derived from published
 * templates only (`getPublicCatalogFilterFacets`), so a dimension with zero
 * real public results never appears.
 *
 * The Category row is different on purpose: it lists every Odoo public
 * category in Odoo's order (the same set the Homepage and Header show), and
 * replaces the technical `group` facet as the visible grouping — BOX_SECTION
 * already covers RHS + SHS, so offering both levels would duplicate the
 * choice. `?group=` still filters when present (older links keep working).
 */
export function CatalogFilterBar({
  locale,
  categories,
  facets,
  active,
  categoryOnly = false,
}: {
  locale: Locale;
  categories: PublicCatalogCategory[];
  facets: CatalogFilterFacets;
  active: Partial<Record<CatalogFilterQueryKey, string>>;
  /** Spike S1: static output — only the category row (static routes); query-string facets have no static equivalent. */
  categoryOnly?: boolean;
}) {
  const dimensions: { key: CatalogFilterQueryKey; options: CatalogFilterFacets[keyof CatalogFilterFacets] }[] = [
    { key: "category", options: categories.map((c) => ({ code: c.code, name: c.name })) },
    { key: "family", options: facets.family },
    { key: "form", options: facets.form },
    { key: "grade", options: facets.grade },
    { key: "standard", options: facets.standard },
  ];

  const visible = dimensions.filter((d) => d.options.length > 0 && (!categoryOnly || d.key === "category"));
  if (visible.length === 0) return null;

  return (
    <div className="border-border flex flex-wrap gap-x-8 gap-y-4 border-b pb-6">
      {visible.map((dimension) => (
        <fieldset key={dimension.key}>
          <legend className="eyebrow text-muted-foreground mb-2">{dimensionLabel[dimension.key][locale]}</legend>
          <div className="flex flex-wrap gap-2">
            {dimension.options.map((option) => {
              if (!option.code) return null;
              const isActive = active[dimension.key] === option.code;
              const nextParams = dimension.key === "category" ? selectCategoryQuery(active, option.code) : toggleFilterQueryValue(active, dimension.key, option.code);
              const href =
                dimension.key === "category"
                  ? localizedPath(locale, isActive ? "/products" : categoryListingPath(option.code))
                  : `${localizedPath(locale, "/products")}${buildQueryString(nextParams)}`;
              return (
                <Link
                  key={option.code}
                  href={href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    isActive ? "border-navy bg-navy text-white" : "border-border text-navy-600 hover:border-navy hover:text-navy",
                  )}
                >
                  {option.name ?? option.code}
                </Link>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
