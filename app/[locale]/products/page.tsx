import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata } from "@/lib/metadata/resolve";
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
  // The listing shell itself follows the same site-wide pre-launch noindex
  // posture every other page currently uses (CLAUDE.md §5a / DAR-037) —
  // independent of how many templates happen to be published right now.
  return buildPageMetadata({ locale, path: "/products", title: t.title, description: t.body, indexable: false });
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
