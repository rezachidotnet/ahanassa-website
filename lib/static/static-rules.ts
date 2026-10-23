import { buildSecurityHeaders } from "../security/headers.ts";
import { PRODUCTION_NOINDEX_HEADER_PATHS } from "../seo/indexing-policy.ts";
import { locales, localizedPath, type Locale } from "../../config/locales.ts";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "../weight-calculator/publication.ts";
import { PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "../pricing/price-page.ts";
import { PRICE_HUB_CATEGORY_CODES, priceHubPath, priceHubSegment } from "../pricing/price-hubs.ts";
import { EXPORT_LOCALES, EXPORT_ROUTE } from "../content/export.ts";
import { PRICE_CHART_LOCALES, priceChartPath } from "../pricing/price-charts.ts";
import { MARKET_INDICATORS_LOCALES, MARKET_INDICATORS_ROUTE } from "../indicators/page.ts";
import { publicRfqCatalogPath, RFQ_CATALOG_ASSET_PATTERN } from "../contracts/public-paths.ts";
import { rfqApiMirrorOrigins } from "../mirror/iran-mirror.ts";

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
 *
 * W25: the /contact form's content-hashed catalog files
 * (`/data/rfq-catalog.<locale>.<hash>.json`, `rfqCatalogAssetPaths`) get the
 * same rule, one each. So the v1 catalog files keep their 5-minute
 * Cache-Control as one rule per file, not `/data/*`: Cloudflare joins the
 * values of a header that two matching rules set, so a `/data/*`
 * Cache-Control would ride along on the immutable files. `/data/*` stays
 * only for production's X-Robots-Tag.
 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
/** The v1 /data/rfq-catalog.<locale>.json files: re-checked every 5 minutes (scripts/content/publish.ts waits it out). */
export const DATA_CACHE_CONTROL = "public, max-age=300";
/** Cloudflare's limit on rules in one `_headers` file (Workers static assets). */
export const MAX_HEADER_RULES = 100;
/**
 * W16.7 (owner decision: allow all three): the Content Signals policy (contentsignals.org), sent as a response
 * header on every path and as a `Content-Signal:` line in each robots.txt group. `Vary: Accept` because a request
 * with `Accept: text/markdown` is answered from the page's `.md` mirror (lib/static/markdown-mirror.ts).
 */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";
export function buildHeadersFile(env: StaticEnvironment, rfqApiOrigin: string, staticAssetPaths: readonly string[] = [], rfqCatalogAssetPaths: readonly string[] = []): string {
  // W27: + the origin's Iran mirror (api.ahanassa.com → api.ahanassa.ir, production only; lib/mirror/iran-mirror.ts).
  const lines = ["/*", ...buildSecurityHeaders([rfqApiOrigin, ...rfqApiMirrorOrigins(rfqApiOrigin)]).map(([name, value]) => `  ${name}: ${value}`), `  Content-Signal: ${CONTENT_SIGNAL}`, "  Vary: Accept"];
  if (env === "staging") lines.push("  X-Robots-Tag: noindex, nofollow");
  const noindex = new Set<string>(env === "production" ? PRODUCTION_NOINDEX_HEADER_PATHS : []);
  for (const p of [...staticAssetPaths].sort()) {
    if (!/^\/_next\/static\/[^*\s]+$/.test(p) || p.includes("/:")) throw new Error(`_headers: not a concrete /_next/static/ file path: ${p}`);
    lines.push("", p, `  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`);
  }
  for (const p of [...rfqCatalogAssetPaths].sort()) {
    if (!RFQ_CATALOG_ASSET_PATTERN.test(p)) throw new Error(`_headers: not a hashed rfq-catalog file path: ${p}`);
    lines.push("", p, `  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`);
  }
  for (const locale of locales) lines.push("", publicRfqCatalogPath(locale), `  Cache-Control: ${DATA_CACHE_CONTROL}`);
  if (noindex.delete("/data/*")) lines.push("", "/data/*", "  X-Robots-Tag: noindex");
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
 * temporary 302, for the same reason (the language selector links every page across locales). Derived
 * from PRICE_PAGE_LOCALES. W16.3 (keyword map §2.2 #11): the target is the locale's products index (was its
 * home), and each family hub path sends its locale to the same family's category page — en price queries
 * map to spec pages, never to a price.
 */
export function unpublishedPricePageRedirects(): string[] {
  return locales
    .filter((l) => !(PRICE_PAGE_LOCALES as readonly string[]).includes(l))
    .flatMap((l) => [
      `${localizedPath(l, PRICE_PAGE_ROUTE)} ${localizedPath(l, "/products")} 302`,
      ...PRICE_HUB_CATEGORY_CODES.map((code) => `${localizedPath(l, priceHubPath(code))} ${localizedPath(l, `/products/category/${priceHubSegment(code)}`)} 302`),
    ]);
}

/** W16.3: the export page exists in en and ar only; fa sends a temporary 302 to its home (language selector). */
export function unpublishedExportRedirects(): string[] {
  return locales.filter((l) => !EXPORT_LOCALES.includes(l)).map((l) => `${localizedPath(l, EXPORT_ROUTE)} ${localizedPath(l, "/")} 302`);
}

/**
 * W18.2 — the language selector links every page to the same path in each locale:
 * - a fa chart page (`/prices/chart/<slug>`, fa only) sends en to its products index and ar to its daily price page
 *   (en never has a price), one rule per chart page of this build (`chartSlugs`);
 * - the market-indicators page (en/ar only) sends fa to `/prices`, where the fa indicators are.
 */
export function unpublishedIndicatorAndChartRedirects(chartSlugs: readonly string[] = []): string[] {
  const chartTarget = (l: Locale) => ((PRICE_PAGE_LOCALES as readonly string[]).includes(l) ? localizedPath(l, PRICE_PAGE_ROUTE) : localizedPath(l, "/products"));
  return [
    ...locales.filter((l) => !(MARKET_INDICATORS_LOCALES as readonly string[]).includes(l)).map((l) => `${localizedPath(l, MARKET_INDICATORS_ROUTE)} ${localizedPath(l, PRICE_PAGE_ROUTE)} 302`),
    ...chartSlugs.flatMap((slug) => locales.filter((l) => !(PRICE_CHART_LOCALES as readonly string[]).includes(l)).map((l) => `${localizedPath(l, priceChartPath(slug))} ${chartTarget(l)} 302`)),
  ];
}

/** The snapshot's `route_redirects` row fields this file needs (lib/contracts/snapshot-v1.ts). */
export interface RouteRedirectInput {
  locale: Locale;
  old_path: string;
  target_path: string | null;
  status_code: 308 | 302 | 410;
}

/** A site path that is safe as a `_redirects` token: absolute, no whitespace, no query/fragment, no splat/placeholder. */
const REDIRECT_PATH = /^\/[^\s?#*:]*$/;

/**
 * W16.2 (D-SEO): the catalog's own redirect register — `route_redirects` (docs/CATALOG_PUBLIC_ROUTES.md
 * §18: a product slug change writes a 308 from the old URL) — as static rules. The SSR runtime resolved
 * these per request; the static site had no equivalent, so a renamed product's old URL would 404 once the
 * page left the build. 308/302 rows become `old new status` in the row's locale; a 410 row has no
 * static equivalent (the 404 page answers, as on the SSR runtime — §18 "Retirement"); an unsafe or
 * self-referencing path is skipped. Sorted, so the same snapshot always gives the same file.
 */
export function routeRedirectRules(rows: readonly RouteRedirectInput[]): string[] {
  return rows
    .filter((r): r is RouteRedirectInput & { target_path: string; status_code: 308 | 302 } => r.status_code !== 410 && r.target_path !== null)
    .filter((r) => REDIRECT_PATH.test(r.old_path) && REDIRECT_PATH.test(r.target_path) && r.old_path !== r.target_path)
    .map((r) => `${localizedPath(r.locale, r.old_path)} ${localizedPath(r.locale, r.target_path)} ${r.status_code}`)
    .sort();
}

/**
 * The fixed permanent rules every build carries (docs/seo/LEGACY_REDIRECT_MAP.md): the pre-v11 SSR site's
 * `/fa` prefix (fa has no visible prefix) and `/request`, the frozen Header CTA path whose form lives at
 * /contact. 308 = permanent (01-sources/REDIRECTS.md prefers 308; search engines treat it as a 301).
 */
export const LEGACY_PERMANENT_RULES = ["/fa / 308", "/fa/* /:splat 308", "/request /contact 308", "/en/request /en/contact 308", "/ar/request /ar/contact 308"] as const;

/** `_redirects`: the fixed legacy rules, the catalog's slug-change register, then the temporary unpublished-locale rules. */
export function buildRedirectsFile(routeRedirects: readonly RouteRedirectInput[] = [], chartSlugs: readonly string[] = []): string {
  return [...LEGACY_PERMANENT_RULES, ...routeRedirectRules(routeRedirects), ...unpublishedCalculatorRedirects(), ...unpublishedPricePageRedirects(), ...unpublishedExportRedirects(), ...unpublishedIndicatorAndChartRedirects(chartSlugs), ""].join("\n");
}

/** `.assetsignore`: defence in depth — these must never be uploaded even if present (the artifact gate also rejects them). */
export const ASSETS_IGNORE_PATTERNS = [".vite/", "*.rsc", "*.sql", "private-snapshot/", "manifest.json", "_originals/"] as const;
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
    [...list(rule.userAgent ?? "*").map((ua) => `User-Agent: ${ua}`), `Content-Signal: ${CONTENT_SIGNAL}`, ...list(rule.allow).map((a) => `Allow: ${a}`), ...list(rule.disallow).map((d) => `Disallow: ${d}`)].join("\n"),
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

/** A `_headers` rule path with `*` wildcards (`/data/*`, `/*.md`) against a concrete path. */
function globMatches(rule: string, path: string): boolean {
  const parts = rule.split("*");
  if (!path.startsWith(parts[0]) || !path.endsWith(parts[parts.length - 1])) return false;
  let at = parts[0].length;
  for (const part of parts.slice(1, -1)) {
    const found = path.indexOf(part, at);
    if (found < 0) return false;
    at = found + part.length;
  }
  return at <= path.length - parts[parts.length - 1].length;
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
  for (const p of publicPaths) if ((p.startsWith("_next/static/") || RFQ_CATALOG_ASSET_PATTERN.test(`/${p}`)) && !immutable.includes(`/${p}`)) failures.push(`_headers: /${p} has no immutable Cache-Control rule`);
  // W25: no wildcard Cache-Control may cover a path that has its own — Cloudflare would join the two values.
  const wildcardCache = [...blocks].filter(([rule, lines]) => rule.includes("*") && lines.some((l) => /^cache-control:/i.test(l))).map(([rule]) => rule);
  for (const rule of immutable) for (const w of wildcardCache) if (globMatches(w, rule)) failures.push(`_headers: ${w} also sets Cache-Control on ${rule} (the values would be joined)`);
  const rules = headerRuleCount(headers);
  if (rules > MAX_HEADER_RULES) failures.push(`_headers: ${rules} rules exceed Cloudflare's limit of ${MAX_HEADER_RULES}`);
  return failures;
}
