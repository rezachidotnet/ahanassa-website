import { z } from "zod";
import { ARTICLE_CATEGORIES, ARTICLE_LOCALES, ARTICLE_SLUG, RESERVED_ARTICLE_SLUGS, publishedArticleRow, type ArticleLocale, type PublishedArticleRow } from "../contracts/snapshot-articles.ts";
import { scanPublicFile } from "../static/leak-scan.ts";
import { scanSourceNames } from "../static/source-name-scan.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { parseMarkdown } from "./markdown.ts";
import { ARTICLES_ROUTE, articleCategoryPath, articlePath } from "./routes.ts";

/**
 * W11.1 — the website's own checks on every article file of the content repository (owner decision
 * 2026-10-09; docs/ARTICLES.md). The content repository's CI already validated each article before the
 * owner merged it; the website checks again, against THIS run's catalog and price snapshot, everything
 * that would make a public page wrong or leak data:
 *
 * - structure: path ↔ lang/date/slug, the frontmatter fields the pages render, a renderable Markdown
 *   body (no images, no raw HTML), a known category, a reserved-slug check;
 * - en: zero price data — no currency, no price-sized number, no number in a sentence about prices, no
 *   amount of this run's price snapshot (owner D-W94-4: en shows no price at all);
 * - ar: no factory or delivery location of this run's price snapshot (ar = price + date only);
 * - every locale: the public-file leak scan (other-language text on en/ar, contacts, private fields) and
 *   the private price-source name list (AHANASSA_PRICE_SOURCE_NAMES_FILE) over the text and the cover;
 * - links: internal links stay in the article's locale and resolve to a page this build publishes (a
 *   catalog page of this snapshot, a static page, or another article that passes); external links are
 *   http(s) only;
 * - cover: a pure-vector SVG (no raster, script, foreignObject or external reference), ≤ 150 KB;
 * - translations: kept only when the other article passes too and points back (hreflang pairs).
 *
 * An article that fails is NOT published and is named in the run summary; the others publish. If it was
 * live before, the article decrease gate (lib/content-pipeline/config.ts) stops the run instead of
 * silently removing it. Pure: the caller passes the files and the context.
 */
export interface ArticleSourceFile {
  /** Path inside the content repository: `articles/<locale>/YYYY/MM/<slug>.md` or `assets/articles/<fa-slug>/cover[.<locale>].svg`. */
  path: string;
  content: string;
}

export interface ArticleCheckContext {
  /** Locale-neutral public paths (no articles) each locale publishes in this build. */
  routes: Record<ArticleLocale, ReadonlySet<string>>;
  /** Catalog template ids (`CTMPL-…`) of this snapshot. */
  templates: ReadonlySet<string>;
  /** Factory and delivery-location names of this run's published prices (never on ar or en). */
  priceNames: readonly string[];
  /** Toman-per-kg and IRR-per-kg amounts of this run's published prices (never on en, in any digits). */
  priceAmounts: readonly number[];
  /** The private price-source names, or null when the list is not configured. */
  sourceNames: readonly string[] | null;
}

export interface ExcludedArticle {
  file: string;
  reasons: string[];
}

export interface ArticleCheckResult {
  rows: PublishedArticleRow[];
  excluded: ExcludedArticle[];
  /** Non-blocking notes (a dropped translation, a cover fallback, a related product not on this locale). */
  notes: string[];
}

export const ARTICLE_AUTHOR: Record<ArticleLocale, string> = { fa: "تحریریهٔ آهن آسا", ar: "فريق تحرير آهن آسا", en: "Ahan Asa Editorial Team" };
export const COVER_MAX_BYTES = 150 * 1024;

const ARTICLE_PATH = /^articles\/(fa|ar|en)\/(\d{4})\/(\d{2})\/([^/]+)\.md$/;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "not a calendar date");
const slug = z.string().regex(ARTICLE_SLUG).min(3).max(80);
const text = (max: number) => z.string().trim().min(1).max(max);

/** The frontmatter (content repo schema/article.json): rendered fields typed, internal fields accepted and dropped. */
const frontmatter = z
  .object({
    title: text(200),
    slug,
    description: text(400),
    date: day,
    updated: day,
    lang: z.enum(ARTICLE_LOCALES),
    category: z.string(),
    tags: z.array(text(60)).max(12),
    related_products: z.array(z.string().regex(/^CTMPL-\d{6}$/)).min(1).max(6),
    faq: z.array(z.object({ q: text(300), a: text(1500) }).strict()).max(10),
    sources: z.array(z.object({ title: text(300), url: z.string().regex(/^https?:\/\/[^\s<>"]+$/), publisher: text(200).optional(), accessed: day }).strict()).max(20),
    author: z.string(),
    reviewed_by: z.object({}).passthrough(),
    translations: z.object({ fa: slug, ar: slug.nullable(), en: slug.nullable() }).strict(),
    topic_reason: z.object({}).passthrough(),
  })
  .strict();
type Frontmatter = z.infer<typeof frontmatter>;

const CURRENCY = /(?<![\p{L}])(tomans?|rials?|irr|irt|usd|eur|dollars?|euros?|تومان|ریال|ريال|تومن|دولار|درهم|یورو)(?![\p{L}])|[$€£﷼]/iu;
const toAsciiDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
const numbersIn = (s: string) => [...toAsciiDigits(s).matchAll(/\d[\d,٬]*(?:[.٫]\d+)?/g)].map((m) => ({ text: m[0], value: Number(m[0].replace(/[,٬]/g, "").replace("٫", ".")), index: m.index ?? 0 }));
const PRICE_WORD = /\bpric(e|es|ed|ing)\b|\bper (kg|kilo|kilogram|ton|tonne|branch)\b|\/kg\b/i;
/** A number in a price sentence is allowed only when it is clearly not a price (as the content repo's validator). */
const NOT_PRICE_BEFORE = /(?:\b(?:ipe|ipn|inp|upn|upe|en|iso|inso|astm|asme|din|bs|aj|a|s|grade|size|sizes|section|sections|diameter|no\.?)\s?|ø\s?)$/i;
const NOT_PRICE_AFTER = /^\s?(?:mm\b|kg\/m\b|kg\b|m\b|t\b|%|(?:sizes?|variants?|products?|items?|mills?|producers?|days?|weeks?|months?|years?|bars?|beams?|sections?|grades?)\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)/i;
const norm = (s: string) => toAsciiDigits(s).replace(/ي/g, "ی").replace(/ى/g, "ی").replace(/ك/g, "ک").replace(/ـ/g, "").replace(/[\s‌]+/g, " ").toLowerCase();

/** en: zero price data. Returns the reasons (empty = clean). */
export function enPriceFindings(lines: readonly string[], priceAmounts: readonly number[]): string[] {
  const out: string[] = [];
  const amounts = new Set(priceAmounts.filter((a) => a >= 1000));
  for (const line of lines) {
    if (CURRENCY.test(line)) out.push(`en mentions a currency ("${line.slice(0, 80)}")`);
    for (const x of numbersIn(line)) {
      if (x.value >= 100_000) out.push(`en has a price-sized number ${x.text}`);
      else if (amounts.has(x.value)) out.push(`en has an amount of this run's price snapshot (${x.text})`);
    }
    for (const sentence of line.split(/(?<=[.!?;])\s+/)) {
      if (!PRICE_WORD.test(sentence)) continue;
      for (const x of numbersIn(sentence)) {
        const before = sentence.slice(0, x.index);
        const after = sentence.slice(x.index + x.text.length);
        if (/^(13|14|19|20)\d\d$/.test(x.text) || NOT_PRICE_BEFORE.test(before) || NOT_PRICE_AFTER.test(after)) continue;
        out.push(`en: number ${x.text} in a sentence about prices`);
      }
    }
  }
  return [...new Set(out)];
}

/** ar: no factory or delivery location of the price snapshot (ar = price + date only). */
export function arPlaceFindings(lines: readonly string[], priceNames: readonly string[]): string[] {
  const all = norm(lines.join("\n"));
  return [...new Set(priceNames.map((n) => norm(n).trim()).filter((n) => n.length >= 3 && all.includes(n)))].map((n) => `ar names a factory or delivery location of the price snapshot ("${n}")`);
}

/** A cover must be a pure-vector SVG with the brand; never a raster, script or external reference. */
export function coverFindings(svg: string): string[] {
  const out: string[] = [];
  if (Buffer.byteLength(svg) > COVER_MAX_BYTES) out.push(`cover larger than ${COVER_MAX_BYTES / 1024} KB`);
  if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(svg)) out.push("cover is not an SVG document");
  if (/<image\b|data:|<foreignObject|<script|\bon[a-z]+\s*=|<!ENTITY|<!DOCTYPE/i.test(svg)) out.push("cover must be pure vector: no image, data URI, foreignObject, script, event handler or DTD");
  if (/\b(?:xlink:)?href\s*=\s*["'](?!#)/i.test(svg) || /url\(\s*["']?(?!#)/i.test(svg)) out.push("cover references an external resource");
  return out;
}

interface Candidate {
  file: string;
  locale: ArticleLocale;
  data: Frontmatter;
  categoryCode: PublishedArticleRow["category"];
  body: string;
  links: string[];
  cover: string;
}

/** Internal link → the locale-neutral path it targets, or a reason it is not allowed. */
function internalTarget(href: string, locale: ArticleLocale): { path: string } | { error: string } | null {
  if (href.startsWith("#") || /^(mailto|tel):/i.test(href)) return null;
  const site = /^https?:\/\/(?:www\.)?ahanassa\.com(?=\/|$)/i;
  if (/^https?:\/\//i.test(href) && !site.test(href)) return null; // external
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !site.test(href)) return { error: `link "${href}": only http(s), mailto and tel are allowed` };
  let path = href.replace(site, "").replace(/[?#].*$/, "") || "/";
  if (!path.startsWith("/")) return { error: `relative link "${href}": use a root-relative path` };
  if (path.length > 1) path = path.replace(/\/$/, "");
  if (locale === "fa") {
    if (/^\/(en|ar)(\/|$)/.test(path)) return { error: `link "${href}" points to another language` };
    return { path };
  }
  if (!(path === `/${locale}` || path.startsWith(`/${locale}/`))) return { error: `link "${href}" is not in /${locale}/` };
  return { path: path.slice(locale.length + 1) || "/" };
}

function textLines(data: Frontmatter, bodyText: string): string[] {
  return [data.title, data.description, ...data.tags, ...data.faq.flatMap((f) => [f.q, f.a]), ...data.sources.flatMap((s) => [s.title, s.publisher ?? ""]), ...bodyText.split("\n")].filter((s) => s.trim());
}

export function checkArticleFiles(files: readonly ArticleSourceFile[], ctx: ArticleCheckContext): ArticleCheckResult {
  const excluded = new Map<string, string[]>();
  const notes: string[] = [];
  const exclude = (file: string, reasons: string[]) => excluded.set(file, [...(excluded.get(file) ?? []), ...reasons]);
  const covers = new Map(files.filter((f) => /^assets\/articles\/[^/]+\/cover(\.(ar|en))?\.svg$/.test(f.path)).map((f) => [f.path, f.content]));
  const candidates: Candidate[] = [];

  for (const file of files.filter((f) => f.path.startsWith("articles/") && f.path.endsWith(".md")).sort((a, b) => a.path.localeCompare(b.path))) {
    const reasons: string[] = [];
    const m = ARTICLE_PATH.exec(file.path);
    if (!m) {
      exclude(file.path, ["path must be articles/{fa,ar,en}/YYYY/MM/<slug>.md"]);
      continue;
    }
    const [, locale, yyyy, mm, fileSlug] = m as unknown as [string, ArticleLocale, string, string, string];
    let parsed: { data: unknown; body: string };
    try {
      parsed = parseFrontmatter(file.content);
    } catch (e) {
      exclude(file.path, [`frontmatter: ${(e as Error).message}`]);
      continue;
    }
    const fm = frontmatter.safeParse(parsed.data);
    if (!fm.success) {
      exclude(file.path, fm.error.issues.slice(0, 8).map((i) => `frontmatter ${i.path.join(".") || "(root)"}: ${i.message}`));
      continue;
    }
    const data = fm.data;
    if (data.lang !== locale) reasons.push(`lang "${data.lang}" does not match the folder "${locale}"`);
    if (data.slug !== fileSlug) reasons.push(`slug "${data.slug}" does not match the file name`);
    if (data.date.slice(0, 7) !== `${yyyy}-${mm}`) reasons.push(`date ${data.date} does not match the folder ${yyyy}/${mm}`);
    if (data.updated < data.date) reasons.push("updated is earlier than date");
    if (RESERVED_ARTICLE_SLUGS.has(data.slug)) reasons.push(`slug "${data.slug}" is reserved by the /articles routes`);
    if (data.author !== ARTICLE_AUTHOR[locale]) reasons.push(`author must be "${ARTICLE_AUTHOR[locale]}"`);
    if (data.translations[locale] !== data.slug) reasons.push(`translations.${locale} must be the article's own slug`);
    const category = ARTICLE_CATEGORIES.find((c) => c.source === data.category);
    if (!category) reasons.push(`unknown category "${data.category}"`);
    for (const id of data.related_products) if (!ctx.templates.has(id)) notes.push(`${file.path}: related product ${id} is not in this catalog snapshot (no card)`);

    let md: ReturnType<typeof parseMarkdown> | null = null;
    try {
      md = parseMarkdown(parsed.body);
      if (!md.text.trim()) reasons.push("empty body");
    } catch (e) {
      reasons.push(`body: ${(e as Error).message}`);
    }
    const lines = textLines(data, md?.text ?? "");
    const allText = [...lines, ...(md?.links ?? []), ...data.sources.map((s) => s.url)].join("\n");

    // Price rules per locale (owner D-W94-4: fa full, ar price + date only, en nothing).
    if (locale === "en") reasons.push(...enPriceFindings(lines, ctx.priceAmounts));
    if (locale === "ar") reasons.push(...arPlaceFindings(lines, ctx.priceNames));
    // The public-file leak scan, as the artifact gate will run it on the page.
    const pagePath = `${locale === "fa" ? "" : `${locale}/`}articles/${data.slug}.html`;
    for (const f of scanPublicFile(pagePath, allText)) reasons.push(`leak scan ${f.kind}: ${f.match}`);

    // Cover: the locale's own, else the fa cover.
    const coverDir = `assets/articles/${data.translations.fa}`;
    const own = locale === "fa" ? `${coverDir}/cover.svg` : `${coverDir}/cover.${locale}.svg`;
    let cover = covers.get(own);
    if (cover === undefined && locale !== "fa" && covers.has(`${coverDir}/cover.svg`)) {
      cover = covers.get(`${coverDir}/cover.svg`);
      notes.push(`${file.path}: no ${own}; using the fa cover`);
    }
    if (cover === undefined) reasons.push(`missing cover ${own}`);
    else reasons.push(...coverFindings(cover));

    // Price-source names, never anywhere (text, links, cover).
    if (ctx.sourceNames?.length) {
      for (const f of scanSourceNames([{ path: file.path, content: `${file.content}\n${cover ?? ""}` }], ctx.sourceNames)) reasons.push(`names a price source (name #${ctx.sourceNames.indexOf(f.name) + 1} of the private list)`);
    }
    if (reasons.length || !md || !category || cover === undefined) {
      exclude(file.path, reasons);
      continue;
    }
    candidates.push({ file: file.path, locale, data, categoryCode: category.code, body: parsed.body, links: md.links, cover });
  }

  // Duplicate (locale, slug): neither is published.
  const bySlug = new Map<string, Candidate[]>();
  for (const c of candidates) bySlug.set(`${c.locale}:${c.data.slug}`, [...(bySlug.get(`${c.locale}:${c.data.slug}`) ?? []), c]);
  let live = candidates.filter((c) => {
    const same = bySlug.get(`${c.locale}:${c.data.slug}`)!;
    if (same.length > 1) exclude(c.file, [`duplicate slug "${c.data.slug}" in ${c.locale} (${same.map((s) => s.file).join(", ")})`]);
    return same.length === 1;
  });

  // Links resolve to this build's pages; repeat until stable (excluding one article can break a link to it).
  for (let changed = true; changed; ) {
    changed = false;
    const articlePaths = new Map<ArticleLocale, Set<string>>(ARTICLE_LOCALES.map((l) => [l, new Set<string>()]));
    for (const c of live) {
      const paths = articlePaths.get(c.locale)!;
      paths.add(ARTICLES_ROUTE);
      paths.add(articlePath(c.data.slug));
      paths.add(articleCategoryPath(c.categoryCode));
    }
    live = live.filter((c) => {
      const reasons: string[] = [];
      for (const href of c.links) {
        const target = internalTarget(href, c.locale);
        if (!target) continue;
        if ("error" in target) reasons.push(target.error);
        else if (!ctx.routes[c.locale].has(target.path) && !articlePaths.get(c.locale)!.has(target.path)) reasons.push(`link "${href}" does not resolve to a page of this build`);
      }
      if (reasons.length) {
        exclude(c.file, reasons);
        changed = true;
      }
      return reasons.length === 0;
    });
  }

  // Translations: only pairs where both sides publish and point at each other.
  const index = new Map(live.map((c) => [`${c.locale}:${c.data.slug}`, c]));
  const rows: PublishedArticleRow[] = live.map((c) => {
    const translations: Record<ArticleLocale, string | null> = { fa: null, ar: null, en: null };
    for (const l of ARTICLE_LOCALES) {
      const target = c.data.translations[l];
      if (!target) continue;
      if (l === c.locale) {
        translations[l] = target;
        continue;
      }
      const other = index.get(`${l}:${target}`);
      if (other && other.data.translations[c.locale] === c.data.slug) translations[l] = target;
      else notes.push(`${c.file}: translation ${l}:${target} is not published in this build (no hreflang)`);
    }
    return publishedArticleRow.parse({
      locale: c.locale,
      slug: c.data.slug,
      title: c.data.title,
      description: c.data.description,
      date: c.data.date,
      updated: c.data.updated,
      category: c.categoryCode,
      tags_json: JSON.stringify(c.data.tags),
      related_products_json: JSON.stringify(c.data.related_products),
      faq_json: JSON.stringify(c.data.faq),
      sources_json: JSON.stringify(c.data.sources.map((s) => ({ title: s.title, url: s.url, publisher: s.publisher ?? null, accessed: s.accessed }))),
      author: c.data.author,
      translations_json: JSON.stringify(translations),
      body_md: c.body,
      cover_svg: c.cover,
    });
  });
  rows.sort((a, b) => `${a.locale}|${a.slug}`.localeCompare(`${b.locale}|${b.slug}`));
  return { rows, excluded: [...excluded].map(([file, reasons]) => ({ file, reasons: [...new Set(reasons)] })), notes };
}

export function articleCounts(rows: readonly PublishedArticleRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const l of ARTICLE_LOCALES) counts[`articles_${l}`] = rows.filter((r) => r.locale === l).length;
  return counts;
}
