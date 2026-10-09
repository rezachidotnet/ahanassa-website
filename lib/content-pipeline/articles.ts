import { ARTICLE_LOCALES, type ArticleLocale, type PublishedArticleRow } from "../contracts/snapshot-articles.ts";
import { irrToToman } from "../contracts/snapshot-prices.ts";
import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { articleCounts, checkArticleFiles, type ArticleCheckContext, type ExcludedArticle } from "../articles/validate.ts";
import { categoryListingPath } from "../catalog/public-categories.ts";
import { STATIC_PUBLIC_PATHS } from "../seo/indexing-policy.ts";
import { PRICE_PAGE_LOCALES, PRICE_PAGE_ROUTE } from "../pricing/price-page.ts";
import { WEIGHT_CALCULATOR_LOCALES, WEIGHT_CALCULATOR_ROUTE } from "../weight-calculator/publication.ts";
import type { ArticlesSource } from "./articles-source.ts";

/**
 * W11.1 — articles in the content pipeline (docs/ARTICLES.md). Pure.
 *
 * Fail-safe, the same rule as prices (owner decision 2026-10-09): when the articles cannot be fetched
 * (no credentials configured, or the fetch failed), the run is BLOCKED only if the live site already
 * shows articles (the active publication's `articles_*` counts); otherwise it builds without articles
 * and says so in the run summary. An article that fails the website's checks is left out (named in the
 * summary); the article decrease gate (lib/content-pipeline/config.ts) stops the run if that would
 * remove an article the live site shows.
 */
export type ArticlesOutcome = "published" | "none_merged" | "empty_not_configured" | "empty_fetch_failed" | "blocked";

export interface ArticlesValidation {
  errors: string[];
  warnings: string[];
  rows: PublishedArticleRow[];
  excluded: ExcludedArticle[];
  notes: string[];
  outcome: ArticlesOutcome;
  /** One clear line for the run summary. */
  summary: string;
  counts: Record<string, number>;
}

type Tables = SnapshotV1["tables"];

/** Published product pages per locale — the same publication gate as lib/catalog/editorial-repository.ts. */
function productPaths(tables: Tables, locale: ArticleLocale): string[] {
  const products = new Map(tables.catalog_products.map((p) => [p.id, p]));
  return tables.product_seo_contents
    .filter((s) => s.entity_type === "product" && s.locale === locale && s.content_quality_status === "approved" && s.published_at !== null && s.h1 !== null)
    .filter((s) => {
      const p = products.get(s.entity_id);
      return p?.is_active === 1 && p.is_public === 1;
    })
    .map((s) => `/products/${s.slug}`);
}

/** The context the article checks resolve links and price data against: this run's snapshot tables. */
export function articleCheckContext(tables: Tables, sourceNames: readonly string[] | null): ArticleCheckContext {
  const routes = {} as Record<ArticleLocale, Set<string>>;
  for (const locale of ARTICLE_LOCALES) {
    const set = new Set<string>([...STATIC_PUBLIC_PATHS, "/request", ...productPaths(tables, locale)]);
    if ((PRICE_PAGE_LOCALES as readonly string[]).includes(locale)) set.add(PRICE_PAGE_ROUTE);
    if ((WEIGHT_CALCULATOR_LOCALES as readonly string[]).includes(locale)) set.add(WEIGHT_CALCULATOR_ROUTE);
    for (const c of tables.catalog_public_categories) if (c.locale === locale) set.add(categoryListingPath(c.code));
    routes[locale] = set;
  }
  const prices = tables.published_prices ?? [];
  return {
    routes,
    templates: new Set(tables.catalog_products.map((p) => p.template_xid)),
    priceNames: [...new Set(prices.flatMap((p) => [p.factory_name_fa, p.location_fa]))],
    priceAmounts: [...new Set(prices.flatMap((p) => [irrToToman(p.price_irr_per_kg), p.price_irr_per_kg, ...(p.previous_price_irr_per_kg ? [irrToToman(p.previous_price_irr_per_kg), p.previous_price_irr_per_kg] : [])]))],
    sourceNames,
  };
}

const total = (counts: Record<string, number> | null) => (counts ? ARTICLE_LOCALES.reduce((n, l) => n + (counts[`articles_${l}`] ?? 0), 0) : 0);

export function validateArticles(source: ArticlesSource | undefined, tables: Tables, previousCounts: Record<string, number> | null, sourceNames: readonly string[] | null = null): ArticlesValidation {
  const live = total(previousCounts);
  const empty = { rows: [], excluded: [], notes: [], counts: articleCounts([]) };
  const unusable = (outcome: "empty_not_configured" | "empty_fetch_failed", why: string): ArticlesValidation => {
    if (live > 0) {
      const summary = `BLOCKED: ${why}, and the live site shows ${live} article(s); refusing to publish without them`;
      return { ...empty, errors: [`articles: ${summary}`], warnings: [], outcome: "blocked", summary };
    }
    const summary = `NO ARTICLES: ${why}; the site publishes without articles (the live site shows none either)`;
    return { ...empty, errors: [], warnings: [`articles: ${summary}`], outcome, summary };
  };
  if (!source || source.status === "not_configured") return unusable("empty_not_configured", "the content repository is not configured (AHANASSA_CONTENT_REPO_TOKEN / AHANASSA_CONTENT_DEPLOY_KEY_FILE / AHANASSA_CONTENT_DIR)");
  if (source.status === "failed") return unusable("empty_fetch_failed", `fetching the content repository failed (${source.error ?? "unknown error"})`);

  const result = checkArticleFiles(source.files, articleCheckContext(tables, sourceNames));
  const counts = articleCounts(result.rows);
  const at = `${source.repo ?? "content repo"}${source.ref ? `@${source.ref}` : ""}${source.commit ? ` ${source.commit.slice(0, 12)}` : ""}`;
  const perLocale = ARTICLE_LOCALES.map((l) => `${l} ${counts[`articles_${l}`]}`).join(", ");
  const warnings = [
    ...result.excluded.map((e) => `articles: NOT PUBLISHED ${e.file}: ${e.reasons.join("; ")}`),
  ];
  const outcome: ArticlesOutcome = result.rows.length ? "published" : "none_merged";
  const summary = result.rows.length
    ? `${result.rows.length} article(s) from ${at} (${perLocale})${result.excluded.length ? `; ${result.excluded.length} left out (see warnings)` : ""}`
    : `no publishable article in ${at}${result.excluded.length ? `; ${result.excluded.length} left out (see warnings)` : ""}`;
  return { errors: [], warnings, rows: result.rows, excluded: result.excluded, notes: result.notes, outcome, summary, counts };
}
