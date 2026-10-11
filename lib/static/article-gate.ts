import { arPlaceFindings, enPriceFindings } from "../articles/validate.ts";
import { irrToToman, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { fileLocale } from "./leak-scan.ts";
import { visibleText } from "./price-gate.ts";

/**
 * W11.1 article gate — part of the artifact gate (lib/static/artifact-gate.ts), on every file under
 * `articles/`, `en/articles/`, `ar/articles/` (listings and articles, HTML and anything else there).
 * Defence in depth behind the per-article checks of the validate step (lib/articles/validate.ts), on
 * what was actually rendered:
 *
 * 1. en: zero price data in the visible text — no currency, no price-sized number, no number in a
 *    sentence about prices, no amount of this snapshot's prices (the W9.4/W9.6 price gate also runs on
 *    every en file: no price element, copy, rendered amount, factory or location);
 * 2. ar: no factory or delivery location of this snapshot's prices (ar = price + date only);
 * 3. no external image: every <img src>, <source srcset>, og:image / twitter:image and CSS url() is a
 *    file of this site (root-relative or on the production origin) — the link check proves it exists;
 * 4. no JSON-LD on article pages (owner 2026-10-09: structured data waits for the SEO phase).
 *
 * The private price-source names are refused in every public file by the source-name scan. Pure.
 */
export interface ArticleFinding {
  file: string;
  kind: "article_price_on_en" | "article_place_on_ar" | "article_external_image" | "article_json_ld";
  match: string;
}

export const ARTICLE_FILE = /^(?:(?:en|ar)\/)?articles(?:\.html$|\/)/;
const SITE = /^https:\/\/www\.ahanassa\.com(?:\/|$)/;

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];

/** Image URLs of a page that are not files of this site. */
export function externalImages(html: string): string[] {
  const out: string[] = [];
  const internal = (u: string) => SITE.test(u) || (u.startsWith("/") && !u.startsWith("//"));
  for (const [tag, name] of html.matchAll(/<(img|source|meta|image)\b[^>]*>/gi)) {
    const urls: string[] = [];
    if (name.toLowerCase() === "meta") {
      const prop = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
      if (/^(og:image|og:image:url|og:image:secure_url|twitter:image)$/.test(prop)) urls.push(attr(tag, "content") ?? "");
    } else {
      urls.push(attr(tag, "src") ?? "", attr(tag, "href") ?? "", ...(attr(tag, "srcset") ?? "").split(",").map((s) => s.trim().split(/\s+/)[0]));
    }
    for (const u of urls.filter(Boolean)) if (!internal(u.replace(/&amp;/g, "&"))) out.push(u);
  }
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) if (!internal(m[1]) && !m[1].startsWith("#") && !m[1].startsWith("data:")) out.push(m[1]);
  return [...new Set(out)];
}

const BLOCK_END = /<\/(p|li|h[1-6]|td|th|tr|div|dt|dd|summary|figcaption|caption|blockquote|section|header|nav|a)>|<br\s*\/?>/gi;
const SEPARATOR = "\u241E";

/**
 * The visible text of the page's <main> (the article and its listing — not the site header/footer, whose
 * company phone and nav are covered elsewhere), one entry per block element, so that text of adjacent
 * elements never runs together into one "sentence".
 */
export function mainTextBlocks(html: string): string[] {
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html)?.[1] ?? html.replace(/<head[\s\S]*?<\/head>/i, " ");
  return visibleText(main.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(BLOCK_END, (m) => `${m}${SEPARATOR}`))
    .split(SEPARATOR)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function scanArticlePages(files: ReadonlyArray<{ path: string; content: string }>, prices: readonly PublishedPriceRow[]): ArticleFinding[] {
  const findings: ArticleFinding[] = [];
  const names = [...new Set(prices.flatMap((p) => [p.factory_name_fa, p.location_fa]))];
  const amounts = [...new Set(prices.flatMap((p) => [irrToToman(p.price_irr_per_kg), p.price_irr_per_kg]))];
  for (const { path, content } of files) {
    if (!ARTICLE_FILE.test(path)) continue;
    const locale = fileLocale(path);
    const lines = path.endsWith(".html") ? mainTextBlocks(content) : [content];
    if (locale === "en") for (const match of enPriceFindings(lines, amounts)) findings.push({ file: path, kind: "article_price_on_en", match });
    if (locale === "ar") for (const match of arPlaceFindings([content], names)) findings.push({ file: path, kind: "article_place_on_ar", match });
    if (!path.endsWith(".html")) continue;
    for (const url of externalImages(content)) findings.push({ file: path, kind: "article_external_image", match: url });
    if (/application\/ld\+json/i.test(content)) findings.push({ file: path, kind: "article_json_ld", match: "application/ld+json" });
  }
  return findings;
}
