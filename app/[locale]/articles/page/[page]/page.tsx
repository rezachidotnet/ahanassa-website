import type { Metadata } from "next";
import { ArticleListing, listingMetadata, listingPageParams } from "@/components/articles/article-listing";
import { isLocale } from "@/config/locales";

interface PageProps {
  params: Promise<{ locale: string; page: string }>;
}

/** W11.1 — /articles/page/<n>, n ≥ 2. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return isLocale(params.locale) ? listingPageParams(params.locale) : [];
}

const resolve = async (params: PageProps["params"]) => {
  const { locale, page } = await params;
  return { locale: isLocale(locale) ? locale : "fa", page: Number(page) };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, page } = await resolve(params);
  return listingMetadata(locale, page);
}

export default async function ArticlesListingPage({ params }: PageProps) {
  const { locale, page } = await resolve(params);
  return <ArticleListing locale={locale} page={page} />;
}
