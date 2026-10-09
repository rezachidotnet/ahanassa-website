/**
 * Step 2 (architecture V1.1 §7.1 step 2): schema, relations and counts of the
 * fetched source, plus the DECREASE GATE against the active publication
 * (threshold: lib/content-pipeline/config.ts). A gated decrease stops the run
 * unless `--allow-decrease` (workflow_dispatch input allow_decrease=true) is
 * given; the override is recorded in validation.json and later in the manifest.
 *
 * W11.1: the articles fetched from the content repository are checked here
 * (lib/content-pipeline/articles.ts); the accepted rows go to <work>/articles.json
 * for the snapshot step, their per-locale counts join the decrease gate.
 *
 *   node scripts/content/validate.ts --work <dir> [--allow-decrease]
 */
import { assembleSnapshotTables } from "../../lib/content-pipeline/assemble.ts";
import { PIPELINE_CONFIG } from "../../lib/content-pipeline/config.ts";
import { activeCounts, type D1Source } from "../../lib/content-pipeline/d1-source.ts";
import type { OdooSource } from "../../lib/content-pipeline/odoo-source.ts";
import { decreaseFindings, describeDecrease, validateSource } from "../../lib/content-pipeline/validate.ts";
import { validateArticles } from "../../lib/content-pipeline/articles.ts";
import type { ArticlesSource } from "../../lib/content-pipeline/articles-source.ts";
import { loadSourceNames } from "../../lib/static/source-name-scan.ts";
import fs from "node:fs";
import { annotate, log as logger, parseArgs, paths, readJson, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const log = logger("validate");

await runStep("validate", async () => {
  const p = paths(workDir(args.get("work")));
  const allowDecrease = args.has("allow-decrease");
  const odoo = readJson<OdooSource>(p.odoo);
  const d1 = readJson<D1Source>(p.d1);
  const tables = assembleSnapshotTables(odoo, d1, odoo.fetched_at);
  const previous = activeCounts(d1);
  const result = validateSource(odoo, tables, previous);
  // W11.1: articles (fail-safe like prices: blocked only when the live site shows articles).
  const articlesSource = fs.existsSync(p.articlesSource) ? readJson<ArticlesSource>(p.articlesSource) : undefined;
  const articles = validateArticles(articlesSource, tables, previous, loadSourceNames());
  result.errors.push(...articles.errors);
  result.warnings.push(...articles.warnings);
  Object.assign(result.counts, articles.counts);
  writeJson(p.articles, articles.rows);
  const decrease = decreaseFindings(result.counts, previous);
  const blockedByDecrease = decrease.length > 0 && !allowDecrease;
  const ok = result.errors.length === 0 && !blockedByDecrease;
  writeJson(p.validation, {
    ok,
    errors: result.errors,
    warnings: result.warnings,
    counts: result.counts,
    previous_active_version: d1.publication.active_version,
    previous_counts: previous,
    decrease_threshold: PIPELINE_CONFIG.decreaseThreshold,
    decrease,
    allow_decrease: allowDecrease,
    pricing: result.pricing ?? null,
    articles: { outcome: articles.outcome, summary: articles.summary, excluded: articles.excluded, notes: articles.notes, commit: articlesSource?.commit ?? null },
  });
  // W9.4 (owner 2026-10-09): a pricing problem never blocks a catalog-only update silently — always one clear line,
  // and a run annotation whenever the run builds without the prices Odoo should have served.
  const pricing = result.pricing;
  if (pricing && pricing.outcome !== "published" && pricing.outcome !== "blocked") annotate("warning", "pricing: empty price set", pricing.summary);
  if (pricing?.ignored.length) annotate("warning", "pricing: unknown fields ignored", pricing.ignored.join(", "));
  // W11.1: a run that publishes without articles, or leaves an article out, always says so.
  if (articles.outcome === "empty_not_configured" || articles.outcome === "empty_fetch_failed") annotate("warning", "articles: none published", articles.summary);
  for (const e of articles.excluded) annotate("warning", "articles: left out", `${e.file}: ${e.reasons.join("; ")}`);
  for (const w of result.warnings) log(`warning: ${w}`);
  for (const n of articles.notes) log(`articles note: ${n}`);
  summary(
    [
      `### Content validate: ${ok ? "PASS" : "BLOCKED"}`,
      `- **Prices:** ${pricing ? `${pricing.outcome === "published" ? "✅" : pricing.outcome === "blocked" ? "❌" : "⚠️"} ${pricing.summary}` : "not checked"}`,
      ...(pricing?.history ? [`- **Price history (30-day chart):** ${pricing.history}`] : []),
      `- **Articles:** ${articles.outcome === "published" ? "✅" : articles.outcome === "blocked" ? "❌" : articles.outcome === "none_merged" && !articles.excluded.length ? "ℹ️" : "⚠️"} ${articles.summary}`,
      `- counts: \`${JSON.stringify(result.counts)}\``,
      `- previous active \`${d1.publication.active_version}\`: \`${JSON.stringify(previous)}\``,
      ...result.warnings.map((w) => `- ⚠️ ${w}`),
      ...result.errors.map((e) => `- ❌ ${e}`),
      decrease.length ? (allowDecrease ? `- ⚠️ decrease gate OVERRIDDEN by allow_decrease=true (recorded): ${decrease.map((d) => `${d.key} ${d.previous}->${d.current}`).join(", ")}` : `\n\`\`\`\n${describeDecrease(decrease)}\n\`\`\``) : "- decrease gate: pass",
    ].join("\n"),
  );
  if (result.errors.length) throw new Error(`validation failed with ${result.errors.length} error(s); the active version is untouched:\n${result.errors.join("\n")}`);
  if (blockedByDecrease) throw new Error(describeDecrease(decrease));
});
