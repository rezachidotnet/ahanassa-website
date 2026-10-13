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
 *
 * W10.6: the one-year `immutable` Cache-Control is one rule per hashed file
 * the build actually wrote under /_next/static/ (`staticAssetPaths`), never
 * a `/_next/static/*` wildcard. Cloudflare applies `_headers` rules to the
 * 404 response of a matching path too, so a wildcard made a 404 for a chunk
 * name — e.g. requested in the seconds before a fresh deploy's new chunks
 * are reachable — cacheable for a year in the visitor's browser. A path
 * with no rule keeps the platform's `max-age=0, must-revalidate`.
 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
/** Cloudflare's limit on rules in one `_headers` file (Workers static assets). */
export const MAX_HEADER_RULES = 100;
export function buildHeadersFile(env: StaticEnvironment, rfqApiOrigin: string, staticAssetPaths: readonly string[] = []): string {
  const lines = ["/*", ...buildSecurityHeaders([rfqApiOrigin]).map(([name, value]) => `  ${name}: ${value}`)];
  if (env === "staging") lines.push("  X-Robots-Tag: noindex, nofollow");
  const noindex = new Set<string>(env === "production" ? PRODUCTION_NOINDEX_HEADER_PATHS : []);
  for (const p of [...staticAssetPaths].sort()) {
    if (!/^\/_next\/static\/[^*\s]+$/.test(p) || p.includes("/:")) throw new Error(`_headers: not a concrete /_next/static/ file path: ${p}`);
    lines.push("", p, `  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`);
  }
  lines.push("", "/data/*", "  Cache-Control: public, max-age=300");
  if (noindex.delete("/data/*")) lines.push("  X-Robots-Tag: noindex");
  lines.push("");
  for (const p of noindex) lines.push(p, "  X-Robots-Tag: noindex", "");
  const rules = headerRuleCount(lines.join("\n"));
  if (rules > MAX_HEADER_RULES) throw new Error(`_headers: ${rules} rules exceed Cloudflare's limit of ${MAX_HEADER_RULES} (${staticAssetPaths.length} /_next/static/ files)`);
  return lines.join("\n");
}

/** Rules in a `_headers` file: its unindented path lines. */
export function headerRuleCount(headers: string): number {
  return headers.split("\n").filter((l) => l.startsWith("/")).length;
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

/**
 * W10.6 gate: `_headers` gives the immutable Cache-Control to exactly the artifact's /_next/static/ files —
 * one rule each, no wildcard (a wildcard also covers the 404 of a missing chunk), no rule for a path the
 * artifact does not contain — and stays within Cloudflare's rule limit.
 */
export function checkStaticCacheRules(headers: string, publicPaths: readonly string[]): string[] {
  const failures: string[] = [];
  const blocks = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of headers.split("\n")) {
    if (line.startsWith("/")) blocks.set(line.trim(), (current = blocks.get(line.trim()) ?? []));
    else if (line.trim() && current) current.push(line.trim());
  }
  const immutable = [...blocks].filter(([, lines]) => lines.some((l) => /^cache-control:.*immutable/i.test(l))).map(([rule]) => rule);
  for (const rule of immutable) {
    if (rule.includes("*")) failures.push(`_headers: immutable Cache-Control on a wildcard rule (${rule}) also caches 404s for a year`);
    else if (!publicPaths.includes(rule.slice(1))) failures.push(`_headers: immutable rule for ${rule}, which is not in the artifact`);
  }
  for (const p of publicPaths) if (p.startsWith("_next/static/") && !immutable.includes(`/${p}`)) failures.push(`_headers: /${p} has no immutable Cache-Control rule`);
  const rules = headerRuleCount(headers);
  if (rules > MAX_HEADER_RULES) failures.push(`_headers: ${rules} rules exceed Cloudflare's limit of ${MAX_HEADER_RULES}`);
  return failures;
}
