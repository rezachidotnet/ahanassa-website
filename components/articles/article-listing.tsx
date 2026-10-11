import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { PageHero } from "@/components/ui/page-hero";
import { ArticleCard } from "@/components/articles/article-card";
import { localizedPath } from "@/config/locales";
import { cn } from "@/lib/utils";
import { buildLanguageAlternatesFromEntries, buildPageMetadata } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { ARTICLE_COPY } from "@/lib/articles/copy";
import { categoryLabel, listArticleCategories, listArticleLocales, listArticles, listCategoryLocales } from "@/lib/articles/repository";
import { ARTICLES_PER_PAGE, ARTICLES_ROUTE, articleListingPath, pageCount } from "@/lib/articles/routes";
import { ARTICLE_CATEGORY_CODES, type ArticleCategoryCode, type ArticleLocale } from "@/lib/contracts/snapshot-articles";

/**
 * W11.1 — the article listings: /articles (all), /articles/category/<code>, and their pages ≥ 2
 * (/…/page/<n>). Newest first, ARTICLES_PER_PAGE per page, a category filter as plain links (no client
 * JS). Page 1 of a listing has hreflang to the same listing in the other locales that have it; a page
 * ≥ 2 is its own only alternate (page n of one language is not a translation of page n of another).
 */
export const isCategoryCode = (value: string): value is ArticleCategoryCode => (ARTICLE_CATEGORY_CODES as readonly string[]).includes(value);

/** Static params of the paginated listing routes: pages 2..n of a locale (and category). */
export async function listingPageParams(locale: ArticleLocale, category?: ArticleCategoryCode): Promise<{ page: string }[]> {
  const pages = pageCount((await listArticles(locale, category)).length);
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ page: String(i + 2) }));
}

export async function listingMetadata(locale: ArticleLocale, page: number, category?: ArticleCategoryCode): Promise<Metadata> {
  const t = ARTICLE_COPY[locale];
  const path = articleListingPath(page, category);
  const label = category ? categoryLabel(category, locale) : null;
  const base = label ? t.categoryTitle(label) : t.title;
  const present = page > 1 ? [locale] : category ? await listCategoryLocales(category) : await listArticleLocales();
  return buildPageMetadata({
    locale,
    path,
    title: page > 1 ? `${base} — ${t.pageOf(page, pageCount((await listArticles(locale, category)).length))}` : base,
    description: label ? t.categoryMeta(label) : t.metaDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(present.map((l) => ({ locale: l, path: page > 1 ? path : articleListingPath(1, category) }))),
  });
}

const CHIP = "inline-flex min-h-11 items-center rounded-[var(--aa-radius-control)] border px-4 text-sm font-semibold transition-colors";

/** r4 isolation (as the article page): always suspends once, so the listing gets its own Flight row. */
export async function ArticleListing({ locale, page, category }: { locale: ArticleLocale; page: number; category?: ArticleCategoryCode }) {
  await Promise.resolve();
  const t = ARTICLE_COPY[locale];
  const all = await listArticles(locale, category);
  const pages = pageCount(all.length);
  if (all.length === 0 || !Number.isInteger(page) || page < 1 || page > pages) notFound();
  const shown = all.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE);
  const categories = await listArticleCategories(locale);
  const label = category ? categoryLabel(category, locale) : null;
  const breadcrumb = [{ path: ARTICLES_ROUTE, label: t.nav }, ...(category && label ? [{ path: articleListingPath(1, category), label }] : [])];

  return (
    <>
      <PageHero locale={locale} eyebrow={t.nav} title={label ? t.categoryTitle(label) : t.title} body={t.body} breadcrumb={breadcrumb} />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-8">
          {categories.length > 1 && (
            <nav aria-label={t.filterLabel}>
              <ul className="flex flex-wrap gap-2">
                {[{ code: null, label: t.all }, ...categories].map((c) => {
                  const active = (c.code ?? undefined) === category;
                  return (
                    <li key={c.code ?? "all"}>
                      <Link
                        href={localizedPath(locale, articleListingPath(1, c.code ?? undefined))}
                        aria-current={active ? "page" : undefined}
                        className={cn(CHIP, active ? "border-navy bg-navy text-white" : "border-[var(--aa-color-neutral-300)] text-neutral-700 hover:border-navy hover:text-navy")}
                      >
                        {c.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a) => (
              <li key={a.slug} className="flex">
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label={t.pagination} className="flex flex-wrap items-center justify-between gap-4">
              {page > 1 ? (
                <Link href={localizedPath(locale, articleListingPath(page - 1, category))} rel="prev" className={cn(CHIP, "border-[var(--aa-color-neutral-300)] text-navy hover:border-navy")}>
                  {t.previous}
                </Link>
              ) : (
                <span />
              )}
              <p className="text-muted-foreground text-sm font-semibold" aria-current="page">
                {t.pageOf(page, pages)}
              </p>
              {page < pages ? (
                <Link href={localizedPath(locale, articleListingPath(page + 1, category))} rel="next" className={cn(CHIP, "border-[var(--aa-color-neutral-300)] text-navy hover:border-navy")}>
                  {t.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
