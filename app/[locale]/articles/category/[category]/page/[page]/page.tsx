import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListing, isCategoryCode, listingMetadata, listingPageParams } from "@/components/articles/article-listing";
import { isLocale } from "@/config/locales";

interface PageProps {
  params: Promise<{ locale: string; category: string; page: string }>;
}

/** W11.1 — /articles/category/<code>/page/<n>, n ≥ 2. */
export async function generateStaticParams({ params }: { params: { locale: string; category: string } }) {
  return isLocale(params.locale) && isCategoryCode(params.category) ? listingPageParams(params.locale, params.category) : [];
}

const resolve = async (params: PageProps["params"]) => {
  const { locale, category, page } = await params;
  if (!isCategoryCode(category)) notFound();
  return { locale: isLocale(locale) ? locale : "fa", category, page: Number(page) };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, category, page } = await resolve(params);
  return listingMetadata(locale, page, category);
}

export default async function ArticleCategoryListingPage({ params }: PageProps) {
  const { locale, category, page } = await resolve(params);
  return <ArticleListing locale={locale} page={page} category={category} />;
}
