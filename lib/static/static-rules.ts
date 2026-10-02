import { SECURITY_HEADERS } from "../security/headers.ts";

/**
 * Static replacements for what `proxy.ts` and the metadata routes did on the
 * SSR runtime (architecture V1.1 §4.2, appendix D V3/V5/V8). Pure string
 * builders — the static build writes their output into public-assets/.
 */

export type StaticEnvironment = "staging" | "production";

/** `_headers`: SECURITY_HEADERS on every path (single source: lib/security/headers.ts); staging additionally `X-Robots-Tag: noindex, nofollow` (§4.2, R2-4). */
export function buildHeadersFile(env: StaticEnvironment): string {
  const lines = ["/*", ...SECURITY_HEADERS.map(([name, value]) => `  ${name}: ${value}`)];
  if (env === "staging") lines.push("  X-Robots-Tag: noindex, nofollow");
  lines.push("", "/_next/static/*", "  Cache-Control: public, max-age=31536000, immutable", "", "/data/*", "  Cache-Control: public, max-age=300", "");
  return lines.join("\n");
}

/** `_redirects`: fa has no visible prefix; /request is the frozen Header CTA path whose form lives at /contact. */
export function buildRedirectsFile(): string {
  return ["/fa / 308", "/fa/* /:splat 308", "/request /contact 308", "/en/request /en/contact 308", "/ar/request /ar/contact 308", ""].join("\n");
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
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** sitemap.xml text for the app's own `app/sitemap.ts` result. */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) => {
    const lastmod = e.lastModified ? `<lastmod>${xmlEscape(new Date(e.lastModified).toISOString())}</lastmod>` : "";
    return `  <url><loc>${xmlEscape(e.url)}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}${urls.length ? "\n" : ""}</urlset>\n`;
}
