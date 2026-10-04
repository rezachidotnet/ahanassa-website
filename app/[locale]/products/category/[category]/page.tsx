import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { listPublicCatalogCategories } from "@/lib/catalog/editorial-repository";
import { categoryListingPath, categoryPathSegment, findCategoryByPathSegment } from "@/lib/catalog/public-categories";
import { ProductsListing, productsHeroCopy } from "@/components/products/products-listing";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, category: segment } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const category = await resolveCategory(locale, segment);
  const t = productsHeroCopy[locale];
  if (!category) return { title: t.title };
  return buildPageMetadata({ locale, path: categoryListingPath(category.code), title: `${category.name} — ${t.eyebrow}`, description: t.body, indexable: publicPageIndexable() });
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { locale: rawLocale, category: segment } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const category = await resolveCategory(locale, segment);
  if (!category) notFound();
  return <ProductsListing locale={locale} category={category} />;
}
