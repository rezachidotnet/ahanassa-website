import { buildSecurityHeaders } from "../security/headers.ts";
import { PRODUCTION_NOINDEX_HEADER_PATHS } from "../seo/indexing-policy.ts";
import { locales, localizedPath } from "../../config/locales.ts";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "../weight-calculator/publication.ts";
import { PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "../pricing/price-page.ts";

/**
 * Static replacements for what `proxy.ts` and the metadata routes did on the
 * SSR runtime (architecture V1.1 §4.2, appendix D V3/V5/V8). Pure string
 * builders — the static build writes their output into public-assets/.
 */

export type StaticEnvironment = "staging" | "production";

/**
 * `_headers`: the security headers on every path (single source:
 * lib/security/headers.ts), with CSP connect-src = 'self' + Turnstile + the
 * target's RFQ API origin only (§6.1); staging additionally
 * `X-Robots-Tag: noindex, nofollow` (§4.2, R2-4). Production marks only the
 * non-page data files noindex (D6, lib/seo/indexing-policy.ts); its pages never.
 */
export function buildHeadersFile(env: StaticEnvironment, rfqApiOrigin: string): string {
  const lines = ["/*", ...buildSecurityHeaders([rfqApiOrigin]).map(([name, value]) => `  ${name}: ${value}`)];
  if (env === "staging") lines.push("  X-Robots-Tag: noindex, nofollow");
  const noindex = new Set<string>(env === "production" ? PRODUCTION_NOINDEX_HEADER_PATHS : []);
  lines.push("", "/_next/static/*", "  Cache-Control: public, max-age=31536000, immutable", "", "/data/*", "  Cache-Control: public, max-age=300");
  if (noindex.delete("/data/*")) lines.push("  X-Robots-Tag: noindex");
  lines.push("");
  for (const p of noindex) lines.push(p, "  X-Robots-Tag: noindex", "");
  return lines.join("\n");
}

/**
 * The weight calculator in a locale it is not published in (W10.1, owner decision 2026-10-09: fa only)
 * sends a temporary 302 to that locale's home. The frozen Header's language selector links every page to
 * the same path in each locale, so without this the fa calculator's "English"/"العربية" links would 404.
 * Derived from WEIGHT_CALCULATOR_LOCALES: publishing a locale removes its rule.
 */
export function unpublishedCalculatorRedirects(): string[] {
  return locales.filter((l) => !WEIGHT_CALCULATOR_LOCALES.includes(l)).map((l) => `${localizedPath(l, WEIGHT_CALCULATOR_ROUTE)} ${localizedPath(l, "/")} 302`);
}

/**
 * W9.6: the price page exists in fa and ar only (en has no price data); /en/prices sends the same
 * temporary 302 to the en home, for the same reason (the language selector links every page across
 * locales). Derived from PRICE_PAGE_LOCALES.
 */
export function unpublishedPricePageRedirects(): string[] {
  return locales.filter((l) => !(PRICE_PAGE_LOCALES as readonly string[]).includes(l)).map((l) => `${localizedPath(l, PRICE_PAGE_ROUTE)} ${localizedPath(l, "/")} 302`);
}

/** `_redirects`: fa has no visible prefix; /request is the frozen Header CTA path whose form lives at /contact. */
export function buildRedirectsFile(): string {
  return ["/fa / 308", "/fa/* /:splat 308", "/request /contact 308", "/en/request /en/contact 308", "/ar/request /ar/contact 308", ...unpublishedCalculatorRedirects(), ...unpublishedPricePageRedirects(), ""].join("\n");
}

/** `.assetsignore`: defence in depth — these must never be uploaded even if present (the artifact gate also rejects them). */
export const ASSETS_IGNORE_PATTERNS = [".vite/", "*.rsc", "*.sql", "private-snapshot/", "manifest.json"] as const;
export function buildAssetsIgnoreFile(): string {
  return `${ASSETS_IGNORE_PATTERNS.join("\n")}\n`;
}

interface RobotsRule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
}
export interface RobotsInput {
  rules: RobotsRule | RobotsRule[];
  sitemap?: string | string[];
}

/** robots.txt text for the app's own `app/robots.ts` result (Next.js MetadataRoute.Robots shape). */
export function renderRobotsTxt(robots: RobotsInput): string {
  const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const blocks = (Array.isArray(robots.rules) ? robots.rules : [robots.rules]).map((rule) =>
    [...list(rule.userAgent ?? "*").map((ua) => `User-Agent: ${ua}`), ...list(rule.allow).map((a) => `Allow: ${a}`), ...list(rule.disallow).map((d) => `Disallow: ${d}`)].join("\n"),
  );
  const sitemaps = list(robots.sitemap).map((s) => `Sitemap: ${s}`);
  return `${[blocks.join("\n\n"), ...(sitemaps.length ? [sitemaps.join("\n")] : [])].join("\n\n")}\n`;
}

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  /** hreflang alternates (Next.js MetadataRoute.Sitemap shape), rendered as <xhtml:link rel="alternate">. */
  alternates?: { languages?: Record<string, string | undefined> };
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** sitemap.xml text for the app's own `app/sitemap.ts` result. The xhtml namespace is declared only when an entry has alternates. */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const alternatesOf = (e: SitemapEntry) => Object.entries(e.alternates?.languages ?? {}).filter((pair): pair is [string, string] => Boolean(pair[1]));
  const urls = entries.map((e) => {
    const lastmod = e.lastModified ? `<lastmod>${xmlEscape(new Date(e.lastModified).toISOString())}</lastmod>` : "";
    const links = alternatesOf(e).map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${xmlEscape(lang)}" href="${xmlEscape(href)}"/>`).join("");
    return `  <url><loc>${xmlEscape(e.url)}</loc>${lastmod}${links}</url>`;
  });
  const xhtml = entries.some((e) => alternatesOf(e).length) ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtml}>\n${urls.join("\n")}${urls.length ? "\n" : ""}</urlset>\n`;
}
