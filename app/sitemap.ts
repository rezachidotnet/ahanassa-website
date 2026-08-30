import type { MetadataRoute } from "next";
import { locales, localizedPath } from "@/config/locales";
import { siteConfig } from "@/lib/metadata/site";
import { listIndexableCatalogTemplateSlugs } from "@/lib/catalog/editorial-repository";

/**
 * Foundation sitemap. The core site (home + interior pages) is empty for
 * now: every page is deliberately noindex until the approved implementation
 * replaces the current placeholders in a later phase — see
 * app/[locale]/page.tsx and PROJECT_OVERRIDES.md §8a.
 *
 * Catalog product URLs are real, wired to DB_PUBLIC
 * (docs/CATALOG_PUBLIC_ROUTES.md §Sitemap boundary): only templates that are
 * simultaneously published, approved, and explicitly marked indexable for a
 * given locale are ever added — commercially active state alone is never
 * sufficient, and an unpublished template contributes zero URLs. As of this
 * writing that set is legitimately empty (DOCUMENT_AUDIT_REPORT.md DAR-037)
 * — zero product URLs here is the correct, expected output, not a bug.
 *
 * A flat MetadataRoute.Sitemap export is sufficient at this scale. Split
 * into a sitemap index (SITEMAP_ROBOTS_SPEC.md's expected architecture for
 * the catalog/content stage) only once entry count actually warrants it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const indexableTemplates = await listIndexableCatalogTemplateSlugs(locale);
    for (const { slug, updatedAt } of indexableTemplates) {
      entries.push({
        url: `${siteConfig.baseUrl}${localizedPath(locale, `/products/${slug}`)}`,
        lastModified: updatedAt,
      });
    }
  }

  return entries;
}
