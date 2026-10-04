import type { MetadataRoute } from "next";
import { locales, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { buildLanguageAlternates, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { isIndexableTarget } from "@/lib/seo/indexing-policy";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { listIndexableCatalogTemplateSlugs, listPublicCatalogCategories, listPublishedCatalogTemplates, listPublishedLocalesForProduct } from "@/lib/catalog/editorial-repository";

/** The public, non-catalog pages of every locale (D6, lib/seo/indexing-policy.ts). Articles join this list once they exist. */
export const STATIC_PUBLIC_PATHS = ["/", "/products", "/services", "/about", "/industries", "/markets", "/contact"] as const;

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
    for (const [path, present] of categoryLocales) {
      if (!present.includes(locale)) continue;
      entries.push({ url: url(locale, path), lastModified, alternates: { languages: canonicalLanguages(buildLanguageAlternatesFromEntries(present.map((l) => ({ locale: l, path })))) } });
    }
  }
  return [...entries, ...productEntries];
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
