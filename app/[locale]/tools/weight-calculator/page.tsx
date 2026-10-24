import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { NOMINAL_WEIGHT_DISCLAIMER } from "@/lib/catalog/specification-presenter";
import { buildCalculatorProducts } from "@/lib/weight-calculator/model";
import { BASIS_LINES, BASIS_STANDARDS, WEIGHT_CALCULATOR_COPY } from "@/lib/weight-calculator/copy";
import { toCalculatorPrices, type CalculatorPrices } from "@/lib/weight-calculator/price";
import { listProductPagePrices } from "@/lib/pricing/product-page-price-repository";
import { loadLatestPriceDay } from "@/lib/pricing/price-page-data";
import { StalePriceNotice } from "@/components/prices/stale-price";
import { isPriceLocale } from "@/lib/pricing/product-page-price";
import type { CalculatorProduct } from "@/lib/weight-calculator/model";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import { cardVariants } from "@/components/ui/surface-variants";
import { WeightCalculator } from "@/components/tools/weight-calculator";
import { AlloyWeightCalculator } from "@/components/tools/alloy-weight-calculator";
import Link from "@/components/ui/link";
import { ALLOY_CALCULATOR_ANCHOR } from "@/lib/alloy/grades";
import { ALLOY_CALCULATOR_COPY } from "@/lib/alloy/calculator-copy";
import { ALLOY_STEEL_ROUTE, ALLOY_UI } from "@/lib/content/alloy-steel";

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
 * W9.4: the optional cost estimate («برآورد هزینه» / «تقدير التكلفة»). The build-time price map of the
 * calculator's own variants (variant xid → price), fa and ar only; en gets none (owner decision change
 * 2026-10-09). The map is a client prop, so it travels in the Flight payload: only the variant id,
 * tomanPerKg and the date label (+ the ISO time on fa), checked against the snapshot by the price gate.
 *
 * r4 isolation (as ProductSpecs, TargetEnquiryForm, NotFoundContent): this async boundary always suspends
 * once, so the calculator and its price map get their own Flight row, away from the page row that carries
 * the target-specific robots value.
 */
async function PricedWeightCalculator({ locale, products }: { locale: Locale; products: CalculatorProduct[] }) {
  await Promise.resolve();
  let prices: CalculatorPrices | undefined;
  if (isPriceLocale(locale)) {
    const map = await listProductPagePrices(products.flatMap((p) => p.variants.map((v) => v.xid)));
    prices = toCalculatorPrices(locale, map ? Object.fromEntries(map) : null);
  }
  // The product funnel's `product_family` (rfq_cta_click): Odoo group code → public category code.
  const families = Object.fromEntries((await listPublicCatalogCategories(locale)).flatMap((c) => c.groupCodes.map((g) => [g, c.code])));
  // W31: the stale-price notice over the calculator when it can show a price estimate (the browser decides).
  const latestDay = prices && Object.keys(prices).length > 0 ? await loadLatestPriceDay() : null;
  return (
    <>
      {latestDay && isPriceLocale(locale) && <StalePriceNotice locale={locale} day={latestDay} href={localizedPath(locale, "/contact")} className="mb-6" />}
      <WeightCalculator locale={locale} products={products} prices={prices} families={families} />
    </>
  );
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

  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.title} body={t.body} breadcrumb={[{ path: WEIGHT_CALCULATOR_ROUTE, label: t.eyebrow }]} />

      <section className="border-border bg-background border-b section-y">
        <div className="container-x">
          <PricedWeightCalculator locale={locale} products={products} />
        </div>
      </section>

      {/* W43 (D-ALLOY-6): alloy and tool steel at the grade's own density; the guides link here with ?grade=<slug>. */}
      <section id={ALLOY_CALCULATOR_ANCHOR} className="border-border bg-background scroll-mt-24 border-b pb-12 lg:pb-16">
        <div className="container-x grid gap-4">
          <AlloyWeightCalculator locale={locale} />
          <Link href={localizedPath(locale, ALLOY_STEEL_ROUTE)} className="text-navy hover:text-copper inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
            {ALLOY_UI[locale].hubLink}
          </Link>
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
              <li>{ALLOY_CALCULATOR_COPY[locale].basis}</li>
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
