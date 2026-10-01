import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { listPublicCatalogCategories } from "@/lib/catalog/editorial-repository";
import { categoryListingPath, categoryPathSegment, findCategoryByPathSegment } from "@/lib/catalog/public-categories";
import { ProductsListing, productsHeroCopy } from "@/components/products/products-listing";

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
}

/** Spike S1: one static listing per Odoo public category, per locale, from the snapshot. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : "fa";
  const categories = await listPublicCatalogCategories(locale);
  return categories.map((c) => ({ category: categoryPathSegment(c.code) }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, category } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const match = findCategoryByPathSegment(await listPublicCatalogCategories(locale), category);
  const t = productsHeroCopy[locale];
  return buildPageMetadata({ locale, path: match ? categoryListingPath(match.code) : "/products", title: match ? `${match.name} — ${t.eyebrow}` : t.title, description: t.body, indexable: false });
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { locale: rawLocale, category } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  const match = findCategoryByPathSegment(await listPublicCatalogCategories(locale), category);
  if (!match) notFound();
  return <ProductsListing locale={locale} categoryCode={match.code} />;
}
