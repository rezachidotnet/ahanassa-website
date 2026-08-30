import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { localizedPath, type Locale } from "@/config/locales";
import type { PublishedCatalogTemplate } from "@/lib/catalog/editorial-repository";

const chrome: Record<Locale, { resultCount: (n: number) => string; variantCount: (n: number) => string }> = {
  fa: { resultCount: (n) => `${n} گروه کالایی نمایش داده شد`, variantCount: (n) => `${n} مشخصه فنی` },
  en: { resultCount: (n) => `${n} product groups shown`, variantCount: (n) => `${n} specifications` },
  ar: { resultCount: (n) => `${n} مجموعة منتجات معروضة`, variantCount: (n) => `${n} مواصفات` },
};

/**
 * The real catalog listing grid — DB_PUBLIC-backed, template-granularity
 * (docs/CATALOG_PUBLIC_ROUTES.md hybrid SEO model). Cards communicate
 * product identity (family/group/form, grade/standard where present,
 * variant count) — never price, stock, or a "Buy"/"Add to cart" action.
 */
export function CatalogTemplateGrid({ locale, templates }: { locale: Locale; templates: PublishedCatalogTemplate[] }) {
  const t = chrome[locale];

  return (
    <section className="border-border bg-background border-b py-14 lg:py-20">
      <div className="container-x">
        <p aria-live="polite" className="sr-only">
          {t.resultCount(templates.length)}
        </p>

        <ul className="border-border grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(({ product, seo, eligibleVariantCount }) => (
            <li key={product.id}>
              <Link
                href={localizedPath(locale, `/products/${seo.slug}`)}
                className="group border-border bg-background hover:bg-surface flex h-full flex-col gap-4 border-e border-b p-6 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-navy text-lg font-bold">{seo.h1}</h2>
                  <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" aria-hidden="true" />
                </div>
                {seo.intro && <p className="text-muted-foreground flex-1 text-sm leading-relaxed">{seo.intro}</p>}
                <span className="text-muted-foreground text-xs font-semibold">{t.variantCount(eligibleVariantCount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
