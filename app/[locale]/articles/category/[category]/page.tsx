import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListing, isCategoryCode, listingMetadata } from "@/components/articles/article-listing";
import { listArticleCategories } from "@/lib/articles/repository";
import { isLocale } from "@/config/locales";

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
}

/** W11.1 — /articles/category/<code>: the categories of the locale that have articles. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return isLocale(params.locale) ? (await listArticleCategories(params.locale)).map((c) => ({ category: c.code })) : [];
}

const resolve = async (params: PageProps["params"]) => {
  const { locale, category } = await params;
  if (!isCategoryCode(category)) notFound();
  return { locale: isLocale(locale) ? locale : "fa", category };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, category } = await resolve(params);
  return listingMetadata(locale, 1, category);
}

export default async function ArticleCategoryPage({ params }: PageProps) {
  const { locale, category } = await resolve(params);
  return <ArticleListing locale={locale} page={1} category={category} />;
}
