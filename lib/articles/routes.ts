import type { ArticleCategoryCode } from "../contracts/snapshot-articles.ts";

/**
 * W11.1 — article URLs (locale-neutral; fa is unprefixed, ar/en get /ar, /en via localizedPath):
 *
 *   /articles                              listing, page 1
 *   /articles/page/<n>                     listing, page n ≥ 2
 *   /articles/category/<code>              one category, page 1
 *   /articles/category/<code>/page/<n>     one category, page n ≥ 2
 *   /articles/<slug>                       one article
 *   /images/articles/<locale>/<slug>.png|webp   its cover (og:image = PNG, cards = WebP)
 *
 * The content repository's validator resolves internal article links on the same pattern.
 */
export const ARTICLES_ROUTE = "/articles";
export const ARTICLES_PER_PAGE = 12;

export const articlePath = (slug: string) => `${ARTICLES_ROUTE}/${slug}`;
export const articleCategoryPath = (code: ArticleCategoryCode) => `${ARTICLES_ROUTE}/category/${code}`;

/** The path of listing page `page` (1-based) of all articles, or of one category. */
export function articleListingPath(page: number, category?: ArticleCategoryCode): string {
  const base = category ? articleCategoryPath(category) : ARTICLES_ROUTE;
  return page <= 1 ? base : `${base}/page/${page}`;
}

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));

/** Cover image URL paths (public-assets/images/articles/…), written by scripts/static/build.ts. */
export const articleCoverPath = (locale: string, slug: string, format: "png" | "webp") => `/images/articles/${locale}/${slug}.${format}`;
export const ARTICLE_COVER_SIZE = { width: 1200, height: 630 } as const;

/**
 * Marks an element whose text comes from the article itself (title, description, body, FAQ). On fa/ar
 * the price gate lets an editorial price quote stand there (the content repository's rules and the owner's
 * review govern it); on en nothing is exempt (lib/static/price-gate.ts, lib/static/article-gate.ts).
 */
export const ARTICLE_TEXT_ATTRIBUTE = "data-aa-article-text";
