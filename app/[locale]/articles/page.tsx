import type { Metadata } from "next";
import { ArticleListing, listingMetadata } from "@/components/articles/article-listing";
import { listArticleLocales } from "@/lib/articles/repository";
import { isLocale } from "@/config/locales";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** W11.1 — /articles, page 1: only the locales whose build has articles (no empty listing page). */
export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return (await listArticleLocales()).map((locale) => ({ locale }));
}

const pageLocale = (raw: string) => (isLocale(raw) ? raw : "fa");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return listingMetadata(pageLocale((await params).locale), 1);
}

export default async function ArticlesPage({ params }: PageProps) {
  return <ArticleListing locale={pageLocale((await params).locale)} page={1} />;
}
