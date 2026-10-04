import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { ProductsListing, productsHeroCopy } from "@/components/products/products-listing";
import { LegacyCategoryRedirect } from "@/components/products/legacy-category-redirect";

export { generateLocaleStaticParams as generateStaticParams } from "@/lib/static/locale-params";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  const t = productsHeroCopy[locale];
  // D6 (docs/OWNER_DECISIONS.md): index,follow on the production target only.
  return buildPageMetadata({ locale, path: "/products", title: t.title, description: t.body, indexable: publicPageIndexable() });
}

/**
 * /products — every published template. Static (no searchParams): a
 * category is its own route, /products/category/<segment>; an old
 * `?category=` link is forwarded in the browser (architecture V1.1 A2).
 */
export default async function ProductsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fa";
  return (
    <>
      <LegacyCategoryRedirect localePrefix={localizedPath(locale, "/").replace(/\/$/, "")} />
      <ProductsListing locale={locale} />
    </>
  );
}
