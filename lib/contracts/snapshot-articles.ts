import { z } from "zod";

/**
 * snapshot.v1 extension — `published_articles` (W11.1, owner-approved 2026-10-09; docs/ARTICLES.md,
 * docs/contracts/SNAPSHOT_V1.md §published_articles).
 *
 * One row per (locale, slug) article that was merged into the PRIVATE content repository's `main` and
 * passed the website's own article checks (lib/articles/validate.ts). Only what a public page renders is
 * stored; the content repository's internal fields (`topic_reason`, `reviewed_by`) never reach the
 * snapshot.
 *
 *   locale              fa | ar | en
 *   slug                the URL slug (fa /articles/<slug>, ar /ar/articles/<slug>, en /en/articles/<slug>)
 *   title, description  page title and meta description
 *   date, updated       publication and last-update day (YYYY-MM-DD, Tehran calendar day)
 *   category            the category code (ARTICLE_CATEGORIES; the source stores the Persian label)
 *   tags_json           JSON string[]
 *   related_products_json  JSON string[] of canonical template ids (`CTMPL-…`), in the source's order
 *   faq_json            JSON {q, a}[]
 *   sources_json        JSON {title, url, publisher|null, accessed}[]
 *   author              the fixed editorial byline of the locale
 *   translations_json   JSON {fa, ar, en} → slug | null; only translations that are themselves in this table
 *   body_md             the Markdown body (the subset lib/articles/markdown.ts renders)
 *   cover_svg           the branded vector cover (rasterized to PNG/WebP at build time, never published as SVG)
 *
 * BUILD-ONLY, like published_prices: never a DB_PUBLIC table, never mirrored or loaded into D1. Pages
 * are rendered into the static HTML at build time.
 */
export const PUBLISHED_ARTICLES_TABLE = "published_articles" as const;

export const ARTICLE_LOCALES = ["fa", "ar", "en"] as const;
export type ArticleLocale = (typeof ARTICLE_LOCALES)[number];

/**
 * The five editorial categories (content repo schema/article.json; labels from its style guide §3 and
 * scripts/cover.mjs). `source` is the Persian label the frontmatter stores in every language.
 */
export const ARTICLE_CATEGORIES = [
  { code: "buying-guide", source: "راهنمای خرید", fa: "راهنمای خرید", ar: "دليل الشراء", en: "Buying guide" },
  { code: "standards", source: "استاندارد و مشخصات", fa: "استاندارد و مشخصات", ar: "المعايير والمواصفات", en: "Standards & specifications" },
  { code: "market-analysis", source: "تحلیل بازار", fa: "تحلیل بازار", ar: "تحليل السوق", en: "Market analysis" },
  { code: "application", source: "اجرا و کاربرد", fa: "اجرا و کاربرد", ar: "التنفيذ والتطبيق", en: "Installation & application" },
  { code: "construction-technology", source: "فناوری و روش‌های نوین ساخت", fa: "فناوری و روش‌های نوین ساخت", ar: "تقنيات وأساليب البناء الحديثة", en: "Construction technology" },
] as const;
export type ArticleCategoryCode = (typeof ARTICLE_CATEGORIES)[number]["code"];
export const ARTICLE_CATEGORY_CODES = ARTICLE_CATEGORIES.map((c) => c.code) as [ArticleCategoryCode, ...ArticleCategoryCode[]];

export const ARTICLE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Slugs a route segment already uses under /articles/ (pagination, category listings, cover images). */
export const RESERVED_ARTICLE_SLUGS: ReadonlySet<string> = new Set(["page", "category", "covers"]);

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const jsonText = z.string().refine((s) => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}, "not JSON");

export const publishedArticleRow = z
  .object({
    locale: z.enum(ARTICLE_LOCALES),
    slug: z.string().regex(ARTICLE_SLUG).min(3).max(80),
    title: z.string().min(1),
    description: z.string().min(1),
    date: day,
    updated: day,
    category: z.enum(ARTICLE_CATEGORY_CODES),
    tags_json: jsonText,
    related_products_json: jsonText,
    faq_json: jsonText,
    sources_json: jsonText,
    author: z.string().min(1),
    translations_json: jsonText,
    body_md: z.string().min(1),
    cover_svg: z.string().min(1),
  })
  .strict()
  .refine((r) => r.updated >= r.date, { message: "updated is earlier than date" })
  .refine((r) => !RESERVED_ARTICLE_SLUGS.has(r.slug), { message: "reserved slug" });

export type PublishedArticleRow = z.infer<typeof publishedArticleRow>;

export const PUBLISHED_ARTICLE_COLUMNS = ["locale", "slug", "title", "description", "date", "updated", "category", "tags_json", "related_products_json", "faq_json", "sources_json", "author", "translations_json", "body_md", "cover_svg"] as const;

/** Build-time schema for the in-memory snapshot database (NOT a DB_PUBLIC migration — see above). */
export const PUBLISHED_ARTICLES_BUILD_DDL = `CREATE TABLE IF NOT EXISTS published_articles (
  locale TEXT NOT NULL CHECK (locale IN ('fa', 'ar', 'en')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  updated TEXT NOT NULL,
  category TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  related_products_json TEXT NOT NULL,
  faq_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  author TEXT NOT NULL,
  translations_json TEXT NOT NULL,
  body_md TEXT NOT NULL,
  cover_svg TEXT NOT NULL,
  PRIMARY KEY (locale, slug)
);`;
