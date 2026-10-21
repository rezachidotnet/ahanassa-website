import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { categoryListingPath, categoryPathSegment, findCategoryByPathSegment, resolveCategoryFilter } from "@/lib/catalog/public-categories";
import { variantPageNotes } from "@/lib/catalog/specification-presenter";
import { CATEGORIES_WITHOUT_CALCULATOR, CATEGORY_LINK_COPY, categorySeo } from "@/lib/content/category-seo";
import { listPublishedHubFamilies } from "@/lib/pricing/price-page-data";
import { priceHubPath } from "@/lib/pricing/price-hubs";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { ProductsListing, productsHeroCopy } from "@/components/products/products-listing";
import Link from "@/components/ui/link";
import { GroupServicesBox } from "@/components/group/group-services-box";
import { showGroupServices } from "@/lib/content/company";

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
}

/** One static listing per Odoo public category and locale, from the snapshot (architecture V1.1 §4.1). */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : "fa";
  const categories = await listPublicCatalogCategories(locale);
  return categories.map((c) => ({ category: categoryPathSegment(c.code) }));
}

async function resolveCategory(locale: Locale, segment: string) {
  return findCategoryByPathSegment(await listPublicCatalogCategories(locale), segment);
}

/** Whether the category's family price hub is published in `locale` today (fa/ar only; lib/pricing/price-hubs.ts). */
async function hasPriceHub(locale: Locale, code: string): Promise<boolean> {
  return (await listPublishedHubFamilies(locale)).some((f) => f === code);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, category: segment } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const category = await resolveCategory(locale, segment);
  const t = productsHeroCopy[locale];
  if (!category) return { title: t.title };
  // W16.3 (D-SEO): the category's own title and meta (lib/content/category-seo.ts); the generic pair only for a category without copy.
  const seo = categorySeo(category.code, locale, await hasPriceHub(locale, category.code));
  return buildPageMetadata({
    locale,
    path: categoryListingPath(category.code),
    title: seo?.title ?? `${category.name} — ${t.eyebrow}`,
    description: seo?.description ?? t.body,
    indexable: publicPageIndexable(),
  });
}

/** W9.13: the required notes of the products the category lists (domestic channel, mill-wall pipe, thin galvanized coil). */
async function categoryNotes(locale: Locale, code: string): Promise<string[]> {
  const categories = await listPublicCatalogCategories(locale);
  const templates = await listPublishedCatalogTemplates(locale, { categoryCode: code, ...resolveCategoryFilter(categories, code) });
  const details = await Promise.all(templates.map((t) => getPublishedCatalogTemplateBySlug(locale, t.seo.slug)));
  const variants = details.flatMap((d) => d?.variants ?? []);
  return variantPageNotes(variants.map((v) => ({ sku: v.sku, formCode: v.form.code, standard: v.standard.code ?? v.standard.name })), locale, "required");
}

/**
 * W16.3 — the category intro: what the family is, its grades and standards, and how to request; then links
 * to the family price hub (fa/ar, only on a day it is published) and the weight calculator (its published
 * locales). Its own async boundary (as ProductSpecs): the hub check reads the price snapshot, so this markup
 * never shares the page row that carries the target-specific robots value.
 */
async function CategoryIntro({ locale, code, name, intro }: { locale: Locale; code: string; name: string; intro: string }) {
  await Promise.resolve();
  const hub = await hasPriceHub(locale, code);
  const notes = await categoryNotes(locale, code);
  const t = CATEGORY_LINK_COPY[locale];
  const calculator = isWeightCalculatorPublished(locale) && !CATEGORIES_WITHOUT_CALCULATOR.has(code);
  return (
    <section aria-label={t.heading} className="container-x pt-10">
      <p className="text-muted-foreground max-w-3xl leading-relaxed">{intro}</p>
      {notes.map((note) => (
        <p key={note} className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
          {note}
        </p>
      ))}
      {(hub || calculator) && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          {hub && (
            <li>
              <Link href={localizedPath(locale, priceHubPath(code))} className="text-navy hover:text-copper underline underline-offset-4">
                {t.hub(name)}
              </Link>
            </li>
          )}
          {calculator && (
            <li>
              <Link href={localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)} className="text-navy hover:text-copper underline underline-offset-4">
                {t.calculator(name)}
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { locale: rawLocale, category: segment } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const category = await resolveCategory(locale, segment);
  if (!category) notFound();
  // H1 and intro do not depend on prices (only the fa title/meta and the hub link do).
  const seo = categorySeo(category.code, locale, false);
  // W16.6: «خدمات مکمل گروه» on beam, box/profile and coated-sheet categories only.
  const aside = showGroupServices([category.code, ...category.groupCodes, category.name]) ? <GroupServicesBox locale={locale} /> : undefined;
  if (!seo) return <ProductsListing locale={locale} category={category} aside={aside} />;
  return (
    <ProductsListing
      locale={locale}
      category={category}
      hero={{ title: seo.h1 }}
      intro={<CategoryIntro locale={locale} code={category.code} name={seo.name} intro={seo.intro} />}
      aside={aside}
    />
  );
}
