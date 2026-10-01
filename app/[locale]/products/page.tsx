export { localeStaticParams as generateStaticParams } from "@/lib/static/export-mode";
import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { ProductsListing, productsHeroCopy } from "@/components/products/products-listing";
import { LegacyCategoryRedirect } from "@/components/products/legacy-category-redirect";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = productsHeroCopy[locale];
  return buildPageMetadata({ locale, path: "/products", title: t.title, description: t.body, indexable: false });
}

/** Spike S1: static /products (all categories). `?category=` is forwarded client-side to the static category route. */
export default async function ProductsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  return (
    <>
      <LegacyCategoryRedirect prefix={localizedPath(locale, "").replace(/\/$/, "")} />
      <ProductsListing locale={locale} categoryCode={undefined} />
    </>
  );
}
