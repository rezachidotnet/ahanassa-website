import { getPublicDb } from "../db/public.ts";
import { isStaticExportBuild } from "../static/locale-params.ts";
import { ARTICLE_CATEGORIES, ARTICLE_LOCALES, type ArticleCategoryCode, type ArticleLocale, type PublishedArticleRow } from "../contracts/snapshot-articles.ts";
import { parseMarkdown, readingMinutes, type ParsedMarkdown } from "./markdown.ts";

/**
 * W11.1 — the articles of this build, read from the snapshot's build-only `published_articles` table
 * (lib/contracts/snapshot-articles.ts) during the static export. Outside the static export build there is
 * no such table: every list is empty and no article page or nav item exists (never a guessed article).
 * Newest first: date, then updated, then slug.
 */
export interface ArticleSummary {
  locale: ArticleLocale;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  category: ArticleCategoryCode;
  readingMinutes: number;
}

export interface Article extends ArticleSummary {
  author: string;
  tags: string[];
  relatedProducts: string[];
  faq: { q: string; a: string }[];
  sources: { title: string; url: string; publisher: string | null; accessed: string }[];
  translations: Record<ArticleLocale, string | null>;
  body: ParsedMarkdown;
}

let cache: Promise<Article[]> | null = null;

function toArticle(r: PublishedArticleRow): Article {
  const body = parseMarkdown(r.body_md);
  return {
    locale: r.locale,
    slug: r.slug,
    title: r.title,
    description: r.description,
    date: r.date,
    updated: r.updated,
    category: r.category,
    readingMinutes: readingMinutes(body.text),
    author: r.author,
    tags: JSON.parse(r.tags_json),
    relatedProducts: JSON.parse(r.related_products_json),
    faq: JSON.parse(r.faq_json),
    sources: JSON.parse(r.sources_json),
    translations: JSON.parse(r.translations_json),
    body,
  };
}

async function allArticles(): Promise<Article[]> {
  if (!isStaticExportBuild()) return [];
  cache ??= getPublicDb()
    .prepare("SELECT * FROM published_articles")
    .all<PublishedArticleRow>()
    .then(({ results }) =>
      (results ?? []).map(toArticle).sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b.updated !== a.updated ? b.updated.localeCompare(a.updated) : a.slug.localeCompare(b.slug))),
    );
  return cache;
}

const summary = ({ locale, slug, title, description, date, updated, category, readingMinutes }: Article): ArticleSummary => ({ locale, slug, title, description, date, updated, category, readingMinutes });

export async function listArticles(locale: ArticleLocale, category?: ArticleCategoryCode): Promise<ArticleSummary[]> {
  return (await allArticles()).filter((a) => a.locale === locale && (!category || a.category === category)).map(summary);
}

export async function getArticle(locale: ArticleLocale, slug: string): Promise<Article | null> {
  return (await allArticles()).find((a) => a.locale === locale && a.slug === slug) ?? null;
}

/** Locales with at least one article (the /articles listing, the nav item and hreflang exist only there). */
export async function listArticleLocales(): Promise<ArticleLocale[]> {
  const all = await allArticles();
  return ARTICLE_LOCALES.filter((l) => all.some((a) => a.locale === l));
}

export async function hasArticles(locale: string): Promise<boolean> {
  return (await listArticleLocales()).includes(locale as ArticleLocale);
}

/** Categories of a locale that have articles, in the editorial order, with their counts. */
export async function listArticleCategories(locale: ArticleLocale): Promise<{ code: ArticleCategoryCode; label: string; count: number }[]> {
  const list = await listArticles(locale);
  return ARTICLE_CATEGORIES.map((c) => ({ code: c.code, label: c[locale], count: list.filter((a) => a.category === c.code).length })).filter((c) => c.count > 0);
}

/** Locales that list `category` (hreflang between the category listings). */
export async function listCategoryLocales(category: ArticleCategoryCode): Promise<ArticleLocale[]> {
  const all = await allArticles();
  return ARTICLE_LOCALES.filter((l) => all.some((a) => a.locale === l && a.category === category));
}

/** Up to `n` other articles of the locale: the same category first, newest first. */
export async function listRelatedArticles(article: ArticleSummary, n = 3): Promise<ArticleSummary[]> {
  const others = (await listArticles(article.locale)).filter((a) => a.slug !== article.slug);
  return [...others.filter((a) => a.category === article.category), ...others.filter((a) => a.category !== article.category)].slice(0, n);
}

export function categoryLabel(code: ArticleCategoryCode, locale: ArticleLocale): string {
  return ARTICLE_CATEGORIES.find((c) => c.code === code)![locale];
}

/** The newest `updated` of a locale's articles (listing lastmod), or null. */
export async function latestArticleUpdate(locale: ArticleLocale, category?: ArticleCategoryCode): Promise<string | null> {
  const list = await listArticles(locale, category);
  return list.reduce<string | null>((m, a) => (m === null || a.updated > m ? a.updated : m), null);
}
