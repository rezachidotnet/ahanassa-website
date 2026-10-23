/**
 * W30 hard rule (owner, 2026-10-22): the domestic copy (www.ahanassa.ir / new.ahanassa.ir, deploy/iran/) serves the
 * SAME bytes as www.ahanassa.com, and everything a search engine reads as "the address of this page" stays on
 * www.ahanassa.com on BOTH hosts — canonical, hreflang alternates, og:url, JSON-LD URLs, sitemap.xml and the robots.txt
 * Sitemap line. The SEO split (W29 P3) is out of scope; moving any of these is an owner decision that must change this
 * constant and its test first.
 *
 * The artifact gate runs this on every build (staging and production), so a code change that moved a page's canonical
 * or hreflang host — to .ir or anywhere else — fails the build before it can reach either host.
 */
export const SEO_HOST_LOCK_ORIGIN = "https://www.ahanassa.com";

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag)?.[1];
const onLockedHost = (url: string) => url === SEO_HOST_LOCK_ORIGIN || url.startsWith(`${SEO_HOST_LOCK_ORIGIN}/`);
/** Any absolute URL on one of the site's own domains (ahanassa.com / ahanassa.ir, any subdomain). */
const SITE_URL = /https?:\/\/(?:[a-z0-9-]+\.)*ahanassa\.(?:com|ir)(?=[/"'\s?#\\]|$)[^"'\s\\]*/gi;

/** One HTML page: canonical, hreflang alternates, og:url and the site URLs inside JSON-LD. */
export function checkPageSeoHosts(file: string, html: string): string[] {
  const failures: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(m[0], "rel")?.toLowerCase();
    if (rel !== "canonical" && rel !== "alternate") continue;
    // rel=alternate is hreflang only; a feed or a Markdown mirror alternate has no hreflang and is not a page address.
    if (rel === "alternate" && attr(m[0], "hreflang") === undefined) continue;
    const href = decode(attr(m[0], "href") ?? "");
    if (!onLockedHost(href)) failures.push(`${file}: ${rel === "canonical" ? "canonical" : `hreflang ${attr(m[0], "hreflang")}`} not on ${SEO_HOST_LOCK_ORIGIN}: ${href || "(empty)"}`);
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(m[0], "property")?.toLowerCase() !== "og:url") continue;
    const content = decode(attr(m[0], "content") ?? "");
    if (!onLockedHost(content)) failures.push(`${file}: og:url not on ${SEO_HOST_LOCK_ORIGIN}: ${content || "(empty)"}`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    // JSON may escape the slashes (\/ or \u002F); a URL is checked as the parser would read it.
    for (const u of m[1].replace(/\\u002[fF]|\\\//g, "/").matchAll(SITE_URL)) {
      const url = u[0];
      // E-mail addresses are not URLs; only a site URL with a scheme is checked. Other hosts (odoo., api.) never belong in JSON-LD either.
      if (!onLockedHost(url)) failures.push(`${file}: JSON-LD URL not on ${SEO_HOST_LOCK_ORIGIN}: ${url}`);
    }
  }
  return failures;
}

/** sitemap.xml: every <loc> and every xhtml:link alternate. */
export function checkSitemapSeoHosts(xml: string): string[] {
  const failures: string[] = [];
  for (const m of xml.matchAll(/<loc>([^<]*)<\/loc>/g)) if (!onLockedHost(decode(m[1]))) failures.push(`sitemap.xml: <loc> not on ${SEO_HOST_LOCK_ORIGIN}: ${m[1]}`);
  for (const m of xml.matchAll(/<xhtml:link\b[^>]*>/g)) {
    const href = decode(attr(m[0], "href") ?? "");
    if (!onLockedHost(href)) failures.push(`sitemap.xml: hreflang ${attr(m[0], "hreflang")} not on ${SEO_HOST_LOCK_ORIGIN}: ${href}`);
  }
  return failures;
}

/** robots.txt: every Sitemap line. */
export function checkRobotsSeoHosts(robots: string): string[] {
  return robots
    .split("\n")
    .filter((l) => /^sitemap:/i.test(l))
    .map((l) => l.replace(/^sitemap:\s*/i, "").trim())
    .filter((u) => !onLockedHost(u))
    .map((u) => `robots.txt: Sitemap not on ${SEO_HOST_LOCK_ORIGIN}: ${u}`);
}

/** The whole public tree: every .html page + sitemap.xml + robots.txt. */
export function checkSeoHostLock(publicPaths: readonly string[], readPublic: (p: string) => string): string[] {
  const failures: string[] = [];
  for (const p of publicPaths) if (p.endsWith(".html")) failures.push(...checkPageSeoHosts(p, readPublic(p)));
  if (publicPaths.includes("sitemap.xml")) failures.push(...checkSitemapSeoHosts(readPublic("sitemap.xml")));
  if (publicPaths.includes("robots.txt")) failures.push(...checkRobotsSeoHosts(readPublic("robots.txt")));
  return failures;
}
