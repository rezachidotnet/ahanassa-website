/**
 * Legacy URL inventory and redirect map (W16.2, decision D-SEO) — every URL www.ahanassa.com has ever
 * served before the v11 static site, and where it must land. Must hold BEFORE the legacy cleanup
 * (retiring the SSR Worker `ahanassa-production` and its code, after 27 Mehr 1405 = 2026-10-19).
 *
 * Sources (docs/seo/LEGACY_REDIRECT_MAP.md has the evidence):
 *   1. Holding page era (Vercel, until 2026-09-02, commit d22d752): `/` only.
 *   2. SSR Worker era (2026-09-02 → 2026-10-05, last STABLE_100 f2202ab): /[locale] + about, contact,
 *      industries, markets, services, request, products, products/[slug]; `/fa/...` prefixed URLs;
 *      the category filter as `/products?category=CODE`. Product slugs = product_seo_contents.slug,
 *      the same 16 v11 serves (the 2026-10-06 artifact sitemap and the live 2026-10-13 sitemap agree).
 *   3. Hosts: the apex `ahanassa.com` and plain http.
 * Not found anywhere: an older (WordPress/other) site — the Wayback Machine has no capture of
 * ahanassa.com, and 01-sources/REDIRECTS.md §9.4 forbids speculative aliases. Add a row here only
 * with evidence (Search Console, backlinks, an old sitemap).
 */
import { locales, localizedPath, type Locale } from "../../config/locales.ts";

/** How a legacy URL reaches its v11 page. */
export type LegacyMechanism =
  /** Same path in v11: must answer 200 as is. */
  | "same_path"
  /** A permanent rule in `_redirects` (lib/static/static-rules.ts LEGACY_PERMANENT_RULES). */
  | "redirects_file"
  /** `?category=` — a query string; `_redirects` cannot match it, the /products page replaces the URL in the browser (robots.txt `Disallow: /*?` keeps it out of crawls). */
  | "browser_replace"
  /** Host/scheme — the Cloudflare zone (apex 308 + Always Use HTTPS), not the artifact. */
  | "zone";

export interface LegacyUrl {
  /** Path + query on www.ahanassa.com, or a full URL for host rows. */
  from: string;
  /** The v11 public path it must end on. */
  to: string;
  via: LegacyMechanism;
  era: "holding" | "ssr" | "host";
}

/** The SSR era's page paths (locale-neutral), from `app/[locale]/**` at f2202ab. */
export const SSR_PAGE_PATHS = ["/", "/about", "/contact", "/industries", "/markets", "/services", "/products"] as const;

/** The SSR era's published product slugs (product_seo_contents.slug), identical in fa/en/ar. */
export const SSR_PRODUCT_SLUGS = [
  "channel-upe", "channel-upn", "equal-angle", "hot-rolled-plate-s235jr", "hot-rolled-plate-s355jr", "hot-rolled-sheet-s235jr",
  "hot-rolled-sheet-s355jr", "ipe-beam", "ipn-inp-beam", "rebar-aj340", "rebar-aj400", "rebar-aj500", "rebar-s240",
  "rectangular-hollow-section-rhs", "seamless-pipe-a106-grade-b", "square-hollow-section-shs",
] as const;

/** The SSR era's category codes (`/products?category=CODE`). */
export const SSR_CATEGORY_CODES = ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE"] as const;

const categoryPath = (code: string) => `/products/category/${code.toLowerCase().replace(/_/g, "-")}`;

export function legacyUrlInventory(): LegacyUrl[] {
  const rows: LegacyUrl[] = [{ from: "/", to: "/", via: "same_path", era: "holding" }];
  const add = (locale: Locale, path: string) => {
    const to = localizedPath(locale, path);
    if (to !== "/") rows.push({ from: to, to, via: "same_path", era: "ssr" }); // "/" is already the holding page's row
    // fa was also reachable with its internal /fa prefix on the SSR runtime (proxy.ts 308).
    if (locale === "fa") rows.push({ from: path === "/" ? "/fa" : `/fa${path}`, to, via: "redirects_file", era: "ssr" });
  };
  for (const locale of locales) {
    for (const path of SSR_PAGE_PATHS) add(locale, path);
    for (const slug of SSR_PRODUCT_SLUGS) add(locale, `/products/${slug}`);
    rows.push({ from: localizedPath(locale, "/request"), to: localizedPath(locale, "/contact"), via: "redirects_file", era: "ssr" });
    for (const code of SSR_CATEGORY_CODES) rows.push({ from: `${localizedPath(locale, "/products")}?category=${code}`, to: localizedPath(locale, categoryPath(code)), via: "browser_replace", era: "ssr" });
  }
  rows.push({ from: "/fa/request", to: "/contact", via: "redirects_file", era: "ssr" });
  for (const from of ["https://ahanassa.com/", "http://ahanassa.com/", "http://www.ahanassa.com/"]) rows.push({ from, to: "/", via: "zone", era: "host" });
  return rows;
}

interface Rule {
  from: string;
  to: string;
  status: number;
}

/** `_redirects` text → rules (`from to status`; comments and blank lines ignored). */
export function parseRedirectRules(text: string): Rule[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/))
    .map(([from, to, status]) => ({ from, to, status: Number(status ?? 302) }));
}

/**
 * Where a path ends after Cloudflare's `_redirects` (first matching rule wins; a trailing `/*` captures
 * `:splat`), following at most 5 hops. Returns the final path and every status on the way.
 */
export function resolveRedirects(path: string, rules: readonly Rule[]): { path: string; statuses: number[] } {
  const statuses: number[] = [];
  let current = path;
  for (let hop = 0; hop < 5; hop++) {
    const rule = rules.find((r) => (r.from.endsWith("/*") ? current.startsWith(r.from.slice(0, -1)) : current === r.from));
    if (!rule) break;
    statuses.push(rule.status);
    current = rule.from.endsWith("/*") ? rule.to.replace(":splat", current.slice(rule.from.length - 1)) : rule.to;
    if (!current.startsWith("/")) current = `/${current}`;
  }
  return { path: current, statuses };
}
