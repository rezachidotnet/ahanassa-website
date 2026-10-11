import type { MetadataRoute } from "next";
import { locales, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { buildLanguageAlternates, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { isIndexableTarget, STATIC_PUBLIC_PATHS } from "@/lib/seo/indexing-policy";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { listIndexableCatalogTemplateSlugs, listPublicCatalogCategories, listPublishedCatalogTemplates, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "@/lib/pricing/price-page";
import { getArticle, latestArticleUpdate, listArticleCategories, listArticleLocales, listArticles, listCategoryLocales } from "@/lib/articles/repository";
import { articleListingPath, articlePath, pageCount } from "@/lib/articles/routes";
import { ARTICLE_LOCALES } from "@/lib/contracts/snapshot-articles";

/** The public, non-catalog pages of every locale (D6, lib/seo/indexing-policy.ts). Articles (W11.1) are listed below, per locale. */
export { STATIC_PUBLIC_PATHS };

const maxIso = (values: string[]) => values.reduce((a, b) => (b > a ? b : a), "");
/** The fa home in the exact form its canonical/hreflang use (Next.js renders the bare origin, no trailing slash). */
const asCanonical = (url: string) => (url === `${siteConfig.baseUrl}/` ? siteConfig.baseUrl : url);
const canonicalLanguages = (languages: Record<string, string> | undefined) => (languages ? Object.fromEntries(Object.entries(languages).map(([l, u]) => [l, asCanonical(u)])) : undefined);

/**
 * Production (D6, docs/OWNER_DECISIONS.md): every indexable URL of fa/en/ar —
 * the static pages, every public category listing and every published
 * product page — each with its reciprocal hreflang alternates (+ x-default).
 * lastmod comes from the snapshot: a product page's own Odoo/editorial
 * `updated_at`; every other page the newest of those (the snapshot's content
 * date), so the same snapshot always gives the same sitemap.
 *
 * Other targets (staging) keep the pre-D6 sitemap: only templates that are
 * published, approved and editorially `index` (docs/CATALOG_PUBLIC_ROUTES.md
 * §Sitemap boundary) — staging is disallow-all anyway.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableTarget()) return editorialSitemap();

  const url = (locale: Locale, path: string) => asCanonical(`${siteConfig.baseUrl}${localizedPath(locale, path)}`);
  const productEntries: MetadataRoute.Sitemap = [];
  const categoryLocales = new Map<string, Locale[]>();
  for (const locale of locales) {
    for (const category of await listPublicCatalogCategories(locale)) {
      const path = categoryListingPath(category.code);
      categoryLocales.set(path, [...(categoryLocales.get(path) ?? []), locale]);
    }
    for (const { product, seo } of await listPublishedCatalogTemplates(locale)) {
      const published = await listPublishedLocalesForProduct(product.id);
      productEntries.push({
        url: url(locale, `/products/${seo.slug}`),
        lastModified: maxIso([product.updatedAt, seo.updatedAt]),
        alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(published.map((p) => ({ locale: p.locale, path: `/products/${p.slug}` })))) },
      });
    }
  }
  const contentDate = maxIso(productEntries.map((e) => String(e.lastModified)));
  const lastModified = contentDate || undefined;

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of STATIC_PUBLIC_PATHS) entries.push({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternates(path)) } });
    // The weight calculator (W10.1): only its published locales, with alternates between those locales only.
    if (WEIGHT_CALCULATOR_LOCALES.includes(locale)) entries.push({ url: url(locale, WEIGHT_CALCULATOR_ROUTE), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(WEIGHT_CALCULATOR_LOCALES.map((l) => ({ locale: l, path: WEIGHT_CALCULATOR_ROUTE })))) } });
    // The daily price page (W9.6): fa and ar only, with alternates between those two.
    if ((PRICE_PAGE_LOCALES as readonly string[]).includes(locale)) entries.push({ url: url(locale, PRICE_PAGE_ROUTE), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(PRICE_PAGE_LOCALES.map((l) => ({ locale: l, path: PRICE_PAGE_ROUTE })))) } });
    for (const [path, present] of categoryLocales) {
      if (!present.includes(locale)) continue;
      entries.push({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(present.map((l) => ({ locale: l, path })))) } });
    }
  }
  return [...entries, ...productEntries, ...(await articleEntries(url))];
}

/**
 * W11.1 — the article pages: each listing's page 1 with alternates to the same listing in the other
 * locales that have it, its pages ≥ 2 with themselves only, and every article with its published
 * translations — exactly the hreflang each page renders (app/[locale]/articles/**). lastmod: the
 * article's `updated`; a listing page the newest `updated` it lists.
 */
async function articleEntries(url: (locale: Locale, path: string) => string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const own = (locale: Locale, path: string) => canonicalLanguages(buildLanguageAlternatesFromEntries([{ locale, path }]));
  const articleLocales = await listArticleLocales();
  for (const locale of articleLocales) {
    const all = await listArticles(locale);
    const lastModified = (await latestArticleUpdate(locale)) ?? undefined;
    entries.push({ url: url(locale, articleListingPath(1)), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(articleLocales.map((l) => ({ locale: l, path: articleListingPath(1) })))) } });
    for (let page = 2; page <= pageCount(all.length); page++) entries.push({ url: url(locale, articleListingPath(page)), lastModified, alternates: { languages: own(locale, articleListingPath(page)) } });
    for (const { code } of await listArticleCategories(locale)) {
      const inCategory = await listArticles(locale, code);
      const categoryModified = (await latestArticleUpdate(locale, code)) ?? undefined;
      const present = await listCategoryLocales(code);
      entries.push({ url: url(locale, articleListingPath(1, code)), lastModified: categoryModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(present.map((l) => ({ locale: l, path: articleListingPath(1, code) })))) } });
      for (let page = 2; page <= pageCount(inCategory.length); page++) entries.push({ url: url(locale, articleListingPath(page, code)), lastModified: categoryModified, alternates: { languages: own(locale, articleListingPath(page, code)) } });
    }
    for (const summary of all) {
      const article = (await getArticle(locale, summary.slug))!;
      const languages = buildLanguageAlternatesFromEntries(ARTICLE_LOCALES.filter((l) => article.translations[l]).map((l) => ({ locale: l, path: articlePath(article.translations[l]!) })));
      entries.push({ url: url(locale, articlePath(article.slug)), lastModified: article.updated, alternates: { languages: canonicalLanguages(languages) } });
    }
  }
  return entries;
}

async function editorialSitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const { slug, updatedAt } of await listIndexableCatalogTemplateSlugs(locale)) {
      entries.push({ url: `${siteConfig.baseUrl}${localizedPath(locale, `/products/${slug}`)}`, lastModified: updatedAt });
    }
  }
  return entries;
}
