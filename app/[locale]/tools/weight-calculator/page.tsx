import type { Metadata } from "next";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { NOMINAL_WEIGHT_DISCLAIMER } from "@/lib/catalog/specification-presenter";
import { buildCalculatorProducts } from "@/lib/weight-calculator/model";
import { BASIS_LINES, BASIS_STANDARDS, WEIGHT_CALCULATOR_COPY } from "@/lib/weight-calculator/copy";
import { toCalculatorPrices } from "@/lib/weight-calculator/price";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { cardVariants } from "@/components/ui/surface-variants";
import { WeightCalculator } from "@/components/tools/weight-calculator";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** Published locales only (lib/weight-calculator/publication.ts) — the same list feeds hreflang and the sitemap. */
export function generateStaticParams(): { locale: Locale }[] {
  return WEIGHT_CALCULATOR_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = WEIGHT_CALCULATOR_COPY[locale];
  return buildPageMetadata({
    locale,
    path: WEIGHT_CALCULATOR_ROUTE,
    title: t.metaTitle,
    description: t.metaDescription,
    // D6 (docs/OWNER_DECISIONS.md): index,follow on the production target, noindex elsewhere — like every public page.
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(WEIGHT_CALCULATOR_LOCALES.map((l) => ({ locale: l, path: WEIGHT_CALCULATOR_ROUTE }))),
  });
}

/**
 * Steel weight / conversion calculator (W10.1, owner decision D-W10-5).
 *
 * The sizes and their nominal weights come from the same published-template
 * read as /products/[slug] — never a live Odoo call (CLAUDE.md §5) — so a
 * size is offered here exactly when its product page shows it. Everything
 * else happens in the browser (components/tools/weight-calculator.tsx).
 *
 * The «مبنای محاسبه» note below is static: it lists every formula and table
 * the calculator can use, with its standard (lib/weight-calculator/standards.ts).
 */
export default async function WeightCalculatorPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = WEIGHT_CALCULATOR_COPY[locale];

  const templates = await listPublishedCatalogTemplates(locale);
  const details = await Promise.all(templates.map((template) => getPublishedCatalogTemplateBySlug(locale, template.seo.slug)));
  const products = buildCalculatorProducts(
    details.flatMap((entry) => (entry ? [{ templateXid: entry.product.templateXid, label: entry.seo.h1 ?? entry.product.commercialTemplateName, variants: entry.variants }] : [])),
  );

  // Optional cost estimate (fa only): W9.4 passes its build-time price map
  // (variant xid → price, the D-W10-4 price type) here. Until then there is none and the
  // calculator renders no cost row.
  const prices = toCalculatorPrices(locale, null);

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: WEIGHT_CALCULATOR_ROUTE, label: t.eyebrow }]} />

      <section className="border-border bg-background border-b section-y">
        <div className="container-x">
          <WeightCalculator locale={locale} products={products} prices={prices} />
        </div>
      </section>

      <section aria-labelledby="calculation-basis" className="border-border bg-surface border-b py-12 lg:py-16">
        <div className="container-x">
          <div className={cardVariants({ variant: "panel", className: "max-w-3xl" })}>
            <h2 id="calculation-basis" className="text-navy text-lg font-bold">
              {t.basisTitle}
            </h2>
            <ul className="text-muted-foreground mt-4 grid gap-3 text-sm leading-relaxed">
              <li>{t.basisCatalog}</li>
              {BASIS_LINES.map((line) => (
                <li key={line}>{t.basis[line]}</li>
              ))}
              <li>{t.basisRounding}</li>
              <li>{NOMINAL_WEIGHT_DISCLAIMER[locale]}</li>
            </ul>
            <h3 className="text-navy mt-6 text-sm font-bold">{t.standardsTitle}</h3>
            <ul className="text-muted-foreground mt-2 grid gap-1 text-xs leading-relaxed">
              {BASIS_STANDARDS.map((standard) => (
                <li key={standard.id}>
                  <bdi>{standard.title}</bdi>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
