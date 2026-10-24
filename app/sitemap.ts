import type { MetadataRoute } from "next";
import { locales, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { buildLanguageAlternates, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { isIndexableTarget, isNoindexPage, STATIC_PUBLIC_PATHS } from "@/lib/seo/indexing-policy";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { getPublishedCatalogTemplateBySlug, listIndexableCatalogTemplateSlugs, listPublicCatalogCategories, listPublishedCatalogTemplates, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { latestPricedAt, PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE, type PriceTableRow } from "@/lib/pricing/price-page";
import { getArticle, latestArticleUpdate, listArticleCategories, listArticleLocales, listArticles, listCategoryLocales } from "@/lib/articles/repository";
import { articleListingPath, articlePath, pageCount } from "@/lib/articles/routes";
import { ARTICLE_LOCALES } from "@/lib/contracts/snapshot-articles";
import { listPublishedHubFamilies, loadPriceTableRows } from "@/lib/pricing/price-page-data";
import { priceHubPath } from "@/lib/pricing/price-hubs";
import { RAW_MATERIAL_LOCALES, RAW_MATERIAL_SLUGS, RAW_MATERIALS_ROUTE, rawMaterialPath } from "@/lib/content/raw-materials";
import { EXPORT_LOCALES, EXPORT_ROUTE } from "@/lib/content/export";
import { ALLOY_STEEL_LOCALES, ALLOY_STEEL_ROUTE, alloyGradePath } from "@/lib/content/alloy-steel";
import { ALLOY_GRADE_SLUGS } from "@/lib/alloy/grades";
import { listAllPublishedPrices } from "@/lib/pricing/product-page-price-repository";
import { isPriceLocale, type PriceLocale } from "@/lib/pricing/price-locale";
import { listPriceChartProducts, loadPriceChart } from "@/lib/pricing/price-chart-data";
import { priceChartPath } from "@/lib/pricing/price-charts";
import { listIndicators } from "@/lib/indicators/repository";
import { MARKET_INDICATORS_LOCALES, MARKET_INDICATORS_ROUTE } from "@/lib/indicators/page";

/** The public, non-catalog pages of every locale (D6, lib/seo/indexing-policy.ts). Articles (W11.1) are listed below, per locale. */
export { STATIC_PUBLIC_PATHS };

const maxIso = (values: string[]) => values.reduce((a, b) => (b > a ? b : a), "");
/** The fa home in the exact form its canonical/hreflang use (Next.js renders the bare origin, no trailing slash). */
const asCanonical = (url: string) => (url === `${siteConfig.baseUrl}/` ? siteConfig.baseUrl : url);
const canonicalLanguages = (languages: Record<string, string> | undefined) => (languages ? Object.fromEntries(Object.entries(languages).map(([l, u]) => [l, asCanonical(u)])) : undefined);

/**
 * Production (D6, docs/OWNER_DECISIONS.md): every indexable URL of fa/en/ar —
 * the static pages (minus PRODUCTION_NOINDEX_PAGES), every public category
 * listing, every published product page and, since W16.3, the family price
 * hubs of the day, the raw-material pages and the export page — each with its
 * reciprocal hreflang alternates (+ x-default).
 * lastmod comes from the snapshot: a product page's own Odoo/editorial
 * `updated_at`; every other page the newest of those (the snapshot's content
 * date), so the same snapshot always gives the same sitemap. W16.2: a page
 * that SHOWS prices (fa/ar only: /prices, the calculator, product pages) is
 * also as new as the newest price it shows (`published_at`), and articles
 * keep their own `updated` (articleEntries).
 *
 * Other targets (staging) keep the pre-D6 sitemap: only templates that are
 * published, approved and editorially `index` (docs/CATALOG_PUBLIC_ROUTES.md
 * §Sitemap boundary) — staging is disallow-all anyway.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableTarget()) return editorialSitemap();

  const url = (locale: Locale, path: string) => asCanonical(`${siteConfig.baseUrl}${localizedPath(locale, path)}`);
  // W16.2: the price dates (xid -> published_at); empty outside the static build.
  const priceDates = new Map([...((await listAllPublishedPrices()) ?? new Map()).entries()].map(([xid, p]) => [xid, p.pricedAt]));
  const latestPrice = maxIso([...priceDates.values()]);
  const productEntries: MetadataRoute.Sitemap = [];
  const contentDates: string[] = []; // product/editorial dates only: a price never moves a page that shows none
  const categoryLocales = new Map<string, Locale[]>();
  for (const locale of locales) {
    for (const category of await listPublicCatalogCategories(locale)) {
      const path = categoryListingPath(category.code);
      categoryLocales.set(path, [...(categoryLocales.get(path) ?? []), locale]);
    }
    for (const { product, seo } of await listPublishedCatalogTemplates(locale)) {
      const published = await listPublishedLocalesForProduct(product.id);
      contentDates.push(product.updatedAt, seo.updatedAt);
      const variants = isPriceLocale(locale) && priceDates.size ? ((await getPublishedCatalogTemplateBySlug(locale, seo.slug))?.variants ?? []) : [];
      productEntries.push({
        url: url(locale, `/products/${seo.slug}`),
        lastModified: maxIso([product.updatedAt, seo.updatedAt, ...variants.flatMap((v) => priceDates.get(v.xid) ?? [])]),
        alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(published.map((p) => ({ locale: p.locale, path: `/products/${p.slug}` })))) },
      });
    }
  }
  const contentDate = maxIso(contentDates);
  const lastModified = contentDate || undefined;
  /** A page that shows the day's prices: the newer of the content date and the newest price. */
  const pricedModified = (locale: Locale) => (isPriceLocale(locale) ? maxIso([contentDate, latestPrice]) || undefined : lastModified);

  // W16.3: the family price hubs of the day, per locale (fa/ar only), with alternates between the locales that publish each.
  const hubLocales = new Map<string, Locale[]>();
  for (const locale of locales) for (const family of await listPublishedHubFamilies(locale)) hubLocales.set(priceHubPath(family), [...(hubLocales.get(priceHubPath(family)) ?? []), locale]);
  /**
   * W16.8: lastmod of a price page = the date of the newest price it shows (the date in its title): `/prices` its
   * table's newest (fa: every factory row), a hub its family's newest, a chart page its chart price.
   */
  const priceRows = new Map<Locale, PriceTableRow[]>();
  for (const locale of PRICE_PAGE_LOCALES) priceRows.set(locale, await loadPriceTableRows(locale));
  const pricePageModified = (locale: Locale) => latestPricedAt(priceRows.get(locale as PriceLocale) ?? [], locale === "fa") ?? pricedModified(locale);
  const hubModified = (locale: Locale, path: string) => latestPricedAt((priceRows.get(locale as PriceLocale) ?? []).filter((r) => priceHubPath(r.familyCode) === path)) ?? pricedModified(locale);
  /** W16.3: a page published in a fixed locale list (raw materials, export), with alternates between those locales. */
  const fixedLocaleEntry = (locale: Locale, path: string, published: readonly Locale[]) => ({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(published.map((l) => ({ locale: l, path })))) } });

  // W18.2: the fa chart pages (as new as the newest price) and the en/ar market-indicators page (as new as its newest value).
  const charts = await listPriceChartProducts();
  const indicators = await listIndicators();
  const latestIndicator = maxIso(indicators.map((i) => i.points[i.points.length - 1].date)) || undefined;

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    // W16.3: PRODUCTION_NOINDEX_PAGES (Industries, Markets) stay out until they have real content.
    for (const path of STATIC_PUBLIC_PATHS) if (!isNoindexPage(path)) entries.push({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternates(path)) } });
    // The weight calculator (W10.1): only its published locales, with alternates between those locales only.
    if (WEIGHT_CALCULATOR_LOCALES.includes(locale)) entries.push({ url: url(locale, WEIGHT_CALCULATOR_ROUTE), lastModified: pricedModified(locale), alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(WEIGHT_CALCULATOR_LOCALES.map((l) => ({ locale: l, path: WEIGHT_CALCULATOR_ROUTE })))) } });
    // The daily price page (W9.6): fa and ar only, with alternates between those two.
    if ((PRICE_PAGE_LOCALES as readonly string[]).includes(locale)) entries.push({ url: url(locale, PRICE_PAGE_ROUTE), lastModified: pricePageModified(locale), alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(PRICE_PAGE_LOCALES.map((l) => ({ locale: l, path: PRICE_PAGE_ROUTE })))) } });
    for (const [path, present] of categoryLocales) {
      if (!present.includes(locale)) continue;
      entries.push({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(present.map((l) => ({ locale: l, path })))) } });
    }
    // W16.2/W16.8: a hub is as new as its family's newest price (the date in its title).
    for (const [path, present] of hubLocales) if (present.includes(locale)) entries.push({ ...fixedLocaleEntry(locale, path, present), lastModified: hubModified(locale, path) });
    if (RAW_MATERIAL_LOCALES.includes(locale)) for (const path of [RAW_MATERIALS_ROUTE, ...RAW_MATERIAL_SLUGS.map(rawMaterialPath)]) entries.push(fixedLocaleEntry(locale, path, RAW_MATERIAL_LOCALES));
    if (EXPORT_LOCALES.includes(locale)) entries.push(fixedLocaleEntry(locale, EXPORT_ROUTE, EXPORT_LOCALES));
    // W43: the alloy/tool steel hub and its grade guides (fa/en/ar).
    if (ALLOY_STEEL_LOCALES.includes(locale)) for (const path of [ALLOY_STEEL_ROUTE, ...ALLOY_GRADE_SLUGS.map(alloyGradePath)]) entries.push(fixedLocaleEntry(locale, path, ALLOY_STEEL_LOCALES));
    if (locale === "fa") for (const c of charts) entries.push({ ...fixedLocaleEntry("fa", priceChartPath(c.slug), ["fa"]), lastModified: (await loadPriceChart(c.slug))?.row.price.pricedAt ?? pricedModified("fa") });
    if (indicators.length && (MARKET_INDICATORS_LOCALES as readonly string[]).includes(locale)) entries.push({ ...fixedLocaleEntry(locale, MARKET_INDICATORS_ROUTE, MARKET_INDICATORS_LOCALES), lastModified: latestIndicator });
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
