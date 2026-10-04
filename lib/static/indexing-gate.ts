import { PRODUCTION_NOINDEX_HEADER_PATHS, PRODUCTION_ROBOTS_DISALLOW } from "../seo/indexing-policy.ts";
import { renderRobotsTxt, type StaticEnvironment } from "./static-rules.ts";

/**
 * Indexing gate (owner decision D6, docs/OWNER_DECISIONS.md; part of
 * runArtifactGate). A staging artifact must never be indexable; a production
 * artifact must match lib/seo/indexing-policy.ts exactly:
 *
 * staging     `/*` sends X-Robots-Tag: noindex, nofollow; robots.txt is disallow-all.
 * production  no noindex on `/*` (only on the non-page data paths); robots.txt allows
 *             all and disallows only the technical paths; every page except the 404s
 *             is `index, follow` with a self canonical and hreflang (incl. x-default);
 *             the 404s are noindex; the sitemap lists exactly the indexable pages,
 *             each with lastmod and the same reciprocal alternates as the page.
 */
export const PRODUCTION_ORIGIN = "https://www.ahanassa.com";
export const STAGING_ROBOTS_TXT = renderRobotsTxt({ rules: { userAgent: "*", disallow: "/" } });
export const PRODUCTION_ROBOTS_TXT = renderRobotsTxt({ rules: [{ userAgent: "*", allow: "/", disallow: [...PRODUCTION_ROBOTS_DISALLOW] }], sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml` });

const NOT_FOUND_PAGES = new Set(["404.html", "en/404.html", "ar/404.html"]);

/**
 * Public URL of an HTML file, in the exact form the page's canonical uses
 * (`index.html` → the bare origin, as Next.js renders it; `en.html` → `/en`;
 * `en/about.html` → `/en/about`); null for the 404 pages.
 */
export function pageUrl(file: string): string | null {
  if (!file.endsWith(".html") || NOT_FOUND_PAGES.has(file)) return null;
  const route = file === "index.html" ? "" : `/${file.slice(0, -".html".length).replace(/\/index$/, "")}`;
  return `${PRODUCTION_ORIGIN}${route}`;
}

/** `_headers` as {path → header lines}. */
export function headerBlocks(headers: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of headers.split("\n")) {
    if (!line.trim()) continue;
    if (/^\s/.test(line)) current?.push(line.trim());
    else blocks.set(line.trim(), (current = blocks.get(line.trim()) ?? []));
  }
  return blocks;
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? null;

export function robotsMeta(html: string): string | null {
  const tag = /<meta\b[^>]*\bname="robots"[^>]*>/i.exec(html)?.[0];
  return tag ? attr(tag, "content") : null;
}

export function canonicalOf(html: string): string | null {
  const tag = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(html)?.[0];
  return tag ? attr(tag, "href") : null;
}

/** hreflang → href from `<link rel="alternate" hreflang=…>`. */
export function alternatesOf(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [tag] of html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*>/gi)) {
    const lang = attr(tag, "hreflang") ?? attr(tag, "hrefLang");
    const href = attr(tag, "href");
    if (lang && href) out.set(lang, href.replace(/&amp;/g, "&"));
  }
  return out;
}

export interface SitemapUrl {
  loc: string;
  lastmod: string | null;
  alternates: Map<string, string>;
}

export function parseSitemap(xml: string): SitemapUrl[] {
  const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
    loc: unescape(/<loc>([^<]*)<\/loc>/.exec(body)?.[1] ?? ""),
    lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(body)?.[1] ?? null,
    alternates: new Map([...body.matchAll(/<xhtml:link\b[^>]*>/g)].map(([tag]) => [attr(tag, "hreflang") ?? "", unescape(attr(tag, "href") ?? "")] as [string, string])),
  }));
}

const sameMap = (a: Map<string, string>, b: Map<string, string>) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

export function checkIndexingPolicy(env: StaticEnvironment, files: readonly string[], read: (file: string) => string): string[] {
  const failures: string[] = [];
  const has = new Set(files);
  const headers = has.has("_headers") ? headerBlocks(read("_headers")) : new Map<string, string[]>();
  const robotsTag = (block: string) => (headers.get(block) ?? []).filter((l) => /^X-Robots-Tag:/i.test(l));
  const robots = has.has("robots.txt") ? read("robots.txt") : "";

  if (env === "staging") {
    if (!robotsTag("/*").includes("X-Robots-Tag: noindex, nofollow")) failures.push("indexing: staging _headers /* must send X-Robots-Tag: noindex, nofollow");
    if (robots !== STAGING_ROBOTS_TXT) failures.push("indexing: staging robots.txt must be exactly disallow-all");
    return failures;
  }

  // --- production ---
  for (const [block, lines] of headers) {
    const tags = lines.filter((l) => /^X-Robots-Tag:/i.test(l));
    if (!tags.length) continue;
    if (!(PRODUCTION_NOINDEX_HEADER_PATHS as readonly string[]).includes(block)) failures.push(`indexing: production _headers sends ${tags.join("; ")} on ${block} (pages must never be noindex)`);
  }
  for (const block of PRODUCTION_NOINDEX_HEADER_PATHS) if (!robotsTag(block).includes("X-Robots-Tag: noindex")) failures.push(`indexing: production _headers must mark ${block} X-Robots-Tag: noindex`);
  if (robots !== PRODUCTION_ROBOTS_TXT) failures.push(`indexing: production robots.txt must be exactly:\n${PRODUCTION_ROBOTS_TXT}`);

  const pages = new Map<string, Map<string, string>>();
  for (const file of files.filter((f) => f.endsWith(".html"))) {
    const html = read(file);
    const meta = robotsMeta(html);
    const url = pageUrl(file);
    if (!url) {
      if (!meta || !/noindex/i.test(meta)) failures.push(`indexing: ${file} (404) must be noindex`);
      continue;
    }
    if (meta?.replace(/\s/g, "") !== "index,follow") failures.push(`indexing: ${file} must be "index, follow" (got ${meta ?? "none"})`);
    if (canonicalOf(html) !== url) failures.push(`indexing: ${file} canonical must be ${url} (got ${canonicalOf(html) ?? "none"})`);
    const alternates = alternatesOf(html);
    if (!alternates.has("x-default") || ![...alternates.values()].includes(url)) failures.push(`indexing: ${file} hreflang must include itself and x-default`);
    pages.set(url, alternates);
  }

  if (!has.has("sitemap.xml")) return [...failures, "indexing: sitemap.xml missing"];
  const sitemap = parseSitemap(read("sitemap.xml"));
  const listed = new Map(sitemap.map((u) => [u.loc, u]));
  if (listed.size !== sitemap.length) failures.push("indexing: sitemap lists a URL twice");
  for (const url of pages.keys()) if (!listed.has(url)) failures.push(`indexing: indexable page missing from sitemap: ${url}`);
  for (const u of sitemap) {
    const page = pages.get(u.loc);
    if (!page) {
      failures.push(`indexing: sitemap URL is not an indexable page: ${u.loc}`);
      continue;
    }
    if (u.loc.includes("?")) failures.push(`indexing: sitemap URL has a query: ${u.loc}`);
    if (!u.lastmod || Number.isNaN(Date.parse(u.lastmod))) failures.push(`indexing: sitemap URL without a valid lastmod: ${u.loc}`);
    if (!sameMap(u.alternates, page)) failures.push(`indexing: sitemap alternates of ${u.loc} differ from the page's hreflang`);
    for (const [lang, href] of u.alternates) {
      if (lang === "x-default") continue;
      const back = listed.get(href);
      if (!back) failures.push(`indexing: sitemap alternate ${lang} of ${u.loc} is not in the sitemap: ${href}`);
      else if (![...back.alternates.values()].includes(u.loc)) failures.push(`indexing: hreflang not reciprocal in the sitemap: ${href} does not point back to ${u.loc}`);
    }
  }
  return failures;
}
