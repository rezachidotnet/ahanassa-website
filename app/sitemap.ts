import type { MetadataRoute } from "next";

/**
 * Foundation sitemap. Empty for now: the only page that exists (the
 * placeholder home in each locale) is deliberately noindex until the
 * approved homepage replaces it in Phase 2 — see
 * app/[locale]/page.tsx and PROJECT_OVERRIDES.md §8a.
 *
 * A flat MetadataRoute.Sitemap export is sufficient at this scale. Split
 * into a sitemap index (SITEMAP_ROBOTS_SPEC.md's expected architecture for
 * the catalog/content stage) only once entry count actually warrants it —
 * doing so now would be premature for zero indexable routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
