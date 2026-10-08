import Link from "@/components/ui/link";
import { localizedPath, type Locale } from "@/config/locales";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import type { PublicCatalogCategory } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

const categoryLegend: Record<Locale, string> = { fa: "دسته‌بندی", en: "Category", ar: "الفئة" };

/**
 * The /products category row: every Odoo public category in Odoo's order
 * (the same set the Homepage and Header show), each a plain link to its
 * static listing (`/products/category/<segment>`). Clicking the active
 * category returns to /products. Architecture V1.1 §4.2 (A3): this is the
 * only listing filter in the static release — the family/form/grade/
 * standard query facets were removed.
 */
export function CatalogFilterBar({ locale, categories, activeCategoryCode }: { locale: Locale; categories: PublicCatalogCategory[]; activeCategoryCode?: string }) {
  if (categories.length === 0) return null;

  return (
    <div className="border-border flex flex-wrap gap-x-8 gap-y-4 border-b pb-6">
      <fieldset>
        <legend className="eyebrow text-muted-foreground mb-2">{categoryLegend[locale]}</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = activeCategoryCode === category.code;
            return (
              <Link
                key={category.code}
                href={localizedPath(locale, isActive ? "/products" : categoryListingPath(category.code))}
                aria-current={isActive ? "true" : undefined}
                // Filter chip (W10.2): 44px target, 8px control radius, 3:1 border, n-600 text (navy-600 was 3.66:1).
                className={cn(
                  "inline-flex min-h-11 items-center rounded-[var(--aa-radius-control)] border px-4 text-sm font-semibold transition-colors duration-[160ms]",
                  isActive ? "border-navy bg-navy text-white" : "border-border-control text-muted-foreground hover:border-navy hover:text-navy",
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
