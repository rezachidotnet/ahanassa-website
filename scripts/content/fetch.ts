/**
 * Step 1 (architecture V1.1 §7.1 step 1): FULL fetch from production Odoo
 * (read-only, GET only, ≤ 2 req/s; lib/content-pipeline/odoo-source.ts) and
 * a READ-ONLY read of the DB_PUBLIC editorial layer + publication state
 * (lib/content-pipeline/d1-source.ts).
 *
 *   node scripts/content/fetch.ts --work <dir> [--env staging] [--d1-config workers/rfq/wrangler.jsonc]
 *
 * W11.1: also the merged articles of the private content repository (lib/content-pipeline/articles-source.ts;
 * configured by AHANASSA_CONTENT_* — docs/ARTICLES.md). A failed or unconfigured article fetch never fails
 * this step: the validate step decides.
 *
 * Writes <work>/source/{odoo.json,d1.json,articles.json,fetch-report.json}.
 */
import { fetchOdooSource, type OdooSource } from "../../lib/content-pipeline/odoo-source.ts";
import { readD1Source } from "../../lib/content-pipeline/d1-source.ts";
import { fetchArticlesSource, type ArticlesSource } from "../../lib/content-pipeline/articles-source.ts";
import { log as logger, parseArgs, paths, publicDb, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const pricingRows = (odoo: OdooSource) => {
  const body = odoo.prices?.body as { data?: unknown } | null | undefined;
  return Array.isArray(body?.data) ? body.data.length : 0;
};
const pricingLabel = (odoo: OdooSource) =>
  odoo.prices?.status === "ok"
    ? `${pricingRows(odoo)} rows (ETag ${odoo.prices.etag ?? "none"})`
    : odoo.prices?.status === "failed"
      ? `⚠️ FETCH FAILED (${odoo.prices.error ?? "unknown"}) — the validate step decides (empty price set, or blocked when the live site shows prices)`
      : `not deployed (HTTP ${odoo.prices?.http_status ?? "—"})`;
const log = logger("fetch");
const articlesLabel = (a: ArticlesSource) =>
  a.status === "ok"
    ? `${a.files.filter((f) => f.path.endsWith(".md")).length} article files, ${a.files.filter((f) => f.path.endsWith(".svg")).length} covers (${a.mode}${a.repo && a.mode !== "dir" ? ` ${a.repo}@${a.ref}` : ""}${a.commit ? ` ${a.commit.slice(0, 12)}` : ""})`
    : a.status === "failed"
      ? `⚠️ FETCH FAILED (${a.error ?? "unknown"}) — the validate step decides (no articles, or blocked when the live site shows articles)`
      : "not configured (AHANASSA_CONTENT_REPO_TOKEN / AHANASSA_CONTENT_DEPLOY_KEY_FILE / AHANASSA_CONTENT_DIR unset)";

await runStep("fetch", async () => {
  const work = workDir(args.get("work"));
  const p = paths(work);
  const started = performance.now();
  const odoo = await fetchOdooSource();
  const odooMs = Math.round(performance.now() - started);
  writeJson(p.odoo, odoo);
  log(`Odoo: ${odoo.requests.length} GET requests in ${odooMs} ms; ${odoo.products.length} products, categories fa/en/ar ${odoo.categories.fa.length}/${odoo.categories.en.length}/${odoo.categories.ar.length}, processing groups ${odoo.processing_groups.fa.length}/${odoo.processing_groups.en.length}/${odoo.processing_groups.ar.length}, pricing ${pricingLabel(odoo)}`);

  const d1Started = performance.now();
  const d1 = await readD1Source(publicDb(args));
  const d1Ms = Math.round(performance.now() - d1Started);
  writeJson(p.d1, d1);
  log(`DB_PUBLIC (read-only): active_version ${d1.publication.active_version}; ${d1.publication.versions.length} retained version(s); editorial rows: ${d1.tables.product_seo_contents.length} SEO, ${d1.tables.catalog_products.length} templates, ${d1.tables.product_variants.length} variants`);

  const articlesStarted = performance.now();
  const articles = fetchArticlesSource(work);
  const articlesMs = Math.round(performance.now() - articlesStarted);
  writeJson(p.articlesSource, articles);
  log(`articles: ${articlesLabel(articles)} in ${articlesMs} ms`);

  const report = {
    odoo: {
      base_url: odoo.base_url,
      requests: odoo.requests.length,
      methods: [...new Set(odoo.requests.map((r) => r.method))],
      duration_ms: odooMs,
      max_request_ms: Math.max(...odoo.requests.map((r) => r.ms)),
      statuses: Object.fromEntries([...new Set(odoo.requests.map((r) => String(r.status)))].map((s) => [s, odoo.requests.filter((r) => String(r.status) === s).length])),
      counts: {
        products: odoo.products.length,
        products_reported_total: odoo.products_reported_total,
        templates: new Set(odoo.products.map((x) => x.canonical_template_id)).size,
        categories_fa: odoo.categories.fa.length,
        categories_en: odoo.categories.en.length,
        categories_ar: odoo.categories.ar.length,
        processing_groups_fa: odoo.processing_groups.fa.length,
        processing_groups_en: odoo.processing_groups.en.length,
        processing_groups_ar: odoo.processing_groups.ar.length,
        meta_families: odoo.meta.families.length,
        meta_groups: odoo.meta.groups.length,
        meta_forms: odoo.meta.forms.length,
        meta_grades: odoo.meta.grades.length,
        meta_standards: odoo.meta.standards.length,
      },
      // W9.4: status + row count only (the prices themselves are validated in the next step).
      pricing: { status: odoo.prices?.status ?? "not_fetched", http_status: odoo.prices?.http_status ?? null, error: odoo.prices?.error ?? null, etag: odoo.prices?.etag ?? null, rows: pricingRows(odoo) },
    },
    d1: { duration_ms: d1Ms, active_version: d1.publication.active_version, versions: d1.publication.versions.map((v) => `${v.version}:${v.status}`) },
    // W11.1: status + file counts only (the articles themselves are checked in the next step).
    articles: { status: articles.status, mode: articles.mode, repo: articles.repo, ref: articles.ref, commit: articles.commit, error: articles.error ?? null, files: articles.files.length, duration_ms: articlesMs },
  };
  writeJson(p.fetchReport, report);
  summary(
    [
      "### Content fetch",
      `- Odoo \`${odoo.base_url}\`: **${report.odoo.requests} GET** requests, ${odooMs} ms (statuses ${JSON.stringify(report.odoo.statuses)})`,
      `- Products ${report.odoo.counts.products} (reported ${odoo.products_reported_total}), templates ${report.odoo.counts.templates}, categories ${report.odoo.counts.categories_fa}/${report.odoo.counts.categories_en}/${report.odoo.counts.categories_ar}, processing groups ${report.odoo.counts.processing_groups_fa}/${report.odoo.counts.processing_groups_en}/${report.odoo.counts.processing_groups_ar}`,
      `- Pricing \`/api/v1/pricing/current\`: ${pricingLabel(odoo)}`,
      `- DB_PUBLIC (read-only): active \`${d1.publication.active_version}\`, retained ${report.d1.versions.join(", ") || "none"}`,
      `- Articles (content repository): ${articlesLabel(articles)}`,
    ].join("\n"),
  );
});
