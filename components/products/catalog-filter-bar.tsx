import Link from "next/link";
import { localizedPath, type Locale } from "@/config/locales";
import { buildQueryString, toggleFilterQueryValue, type CatalogFilterQueryKey } from "@/lib/catalog/catalog-filters";
import type { CatalogFilterFacets } from "@/lib/catalog/editorial-repository";
import { cn } from "@/lib/utils";

const dimensionLabel: Record<CatalogFilterQueryKey, Record<Locale, string>> = {
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
 */
export function CatalogFilterBar({
  locale,
  facets,
  active,
}: {
  locale: Locale;
  facets: CatalogFilterFacets;
  active: Partial<Record<CatalogFilterQueryKey, string>>;
}) {
  const dimensions: { key: CatalogFilterQueryKey; options: CatalogFilterFacets[keyof CatalogFilterFacets] }[] = [
    { key: "family", options: facets.family },
    { key: "group", options: facets.group },
    { key: "form", options: facets.form },
    { key: "grade", options: facets.grade },
    { key: "standard", options: facets.standard },
  ];

  const visible = dimensions.filter((d) => d.options.length > 0);
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
              const nextParams = toggleFilterQueryValue(active, dimension.key, option.code);
              const href = `${localizedPath(locale, "/products")}${buildQueryString(nextParams)}`;
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
