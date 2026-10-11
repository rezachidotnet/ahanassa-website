import { getAppEnv } from "../env.ts";

/**
 * Indexing policy — owner decision D6 (2026-10-04, docs/OWNER_DECISIONS.md):
 * every public page is indexable by Google in PRODUCTION. Only the production
 * build target changes; staging keeps `X-Robots-Tag: noindex, nofollow`, the
 * disallow-all robots.txt and its per-page `noindex` meta exactly as before
 * (architecture V1.1 §4.2, R2-4).
 *
 * Public pages (index,follow in production, fa/en/ar, canonical + reciprocal
 * hreflang): home, /products, every /products/category/<segment>, every
 * published product detail page, /services, /about, /industries, /markets,
 * /contact, /tools/weight-calculator (W10.1, its published locales), /prices
 * (W9.6, fa and ar only), and the articles (W11.1: /articles, its category and
 * pagination pages, every article — only in the locales that have articles).
 *
 * Never indexable, for technical reasons (NON_INDEXABLE below):
 */
export const NON_INDEXABLE = [
  { what: "404 pages (/404.html, /en/404.html, /ar/404.html)", how: "HTTP 404 + <meta robots noindex, nofollow>", why: "an error response is not content; a 404 must never be indexed as a page" },
  { what: "thank-you / confirmation pages", how: "none exist: the RFQ confirmation is in-page state on /contact (no URL)", why: "a confirmation is per-visitor state, not content; it would only be a thin duplicate of /contact" },
  { what: "URLs with query parameters (?variant=, ?category=, filters, sort, utm_* tracking)", how: "robots.txt Disallow: /*? + canonical to the clean URL on every page", why: "parameters only select state on an existing page (docs/discoverability/FACETED_NAVIGATION_URL_POLICY.md); crawling them wastes crawl budget and creates duplicates" },
  { what: "preview / build-only routes (/static-404)", how: "removed from the artifact by the static build; robots.txt Disallow: /static-404", why: "build-only route, never served; disallowed in case one is ever linked" },
  { what: "public data files (/data/*.json, /manifest.public.json)", how: "X-Robots-Tag: noindex (headers), NOT robots-disallowed", why: "machine data for the /contact form, not pages; Google must still be able to fetch them to render /contact" },
  { what: "/api/ (RFQ Worker lives on api.ahanassa.com)", how: "robots.txt Disallow: /api/", why: "no API on the public host; kept from the previous production robots policy" },
] as const;

/** The public, non-catalog pages every locale has (app/sitemap.ts; W11.1 articles may link to them). */
export const STATIC_PUBLIC_PATHS = ["/", "/products", "/services", "/about", "/industries", "/markets", "/contact"] as const;

/** Paths robots.txt disallows on the production target — the technical paths above, nothing else. */
export const PRODUCTION_ROBOTS_DISALLOW = ["/api/", "/static-404", "/*?"] as const;

/** Header rules (`_headers`) that mark non-page public files noindex on the production target. */
export const PRODUCTION_NOINDEX_HEADER_PATHS = ["/data/*", "/manifest.public.json"] as const;

/** True only for the production build (APP_ENV=production): the one target whose public pages are indexable. */
export function isIndexableTarget(): boolean {
  return getAppEnv() === "production";
}

/**
 * Whether a public page is indexable. Production: always (D6). Any other
 * target: the page's previous, pre-D6 value (`nonProductionValue`), so a
 * staging build is byte-for-byte what it was before D6.
 */
export function publicPageIndexable(nonProductionValue = false): boolean {
  return isIndexableTarget() ? true : nonProductionValue;
}
