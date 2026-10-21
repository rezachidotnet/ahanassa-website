/**
 * Step 4 (architecture V1.1 §7.1 steps 4 and 6, §12): static fa/en/ar export
 * FROM THE SNAPSHOT (scripts/static/build.ts: canonical, reciprocal hreflang,
 * sitemap of published pages, JSON-LD, robots, _headers), the artifact with
 * public-assets/ + private-snapshot/ + private manifest.json (incl. the
 * pipeline provenance and the allow_decrease flag) + manifest.public.json,
 * and the artifact gate. Afterwards the decrease gate runs again on the
 * built counts (rfq catalogs, variant index, sitemap).
 *
 * r4 (W8.0): every run builds BOTH targets from the same code and snapshot —
 * <work>/artifact (staging) and <work>/artifact-production — and runs the
 * allowlisted-diff gate (lib/static/target-diff-gate.ts) between them.
 *
 * W11.6 (incident 2026-10-19/20): when the staging build's ONLY gate failures are article-gate findings on article
 * pages, the failing articles are left out — every locale of each — and the build runs again, so one article never
 * blocks prices or any other page (lib/content-pipeline/article-isolation.ts). The snapshot keeps its version; its
 * article rows, content hash and counts are rewritten. Each left-out article is an ALERT annotation and a summary
 * line; dropping an article the live site shows is recorded as an overridden decrease (production then needs the
 * owner's approval, lib/ci/content-rebuild.ts). Every other gate failure still stops the run.
 *
 *   node scripts/content/export.ts --work <dir>
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest, type ArtifactPipelineInfo } from "../../lib/contracts/artifact-v1.ts";
import type { ArticleFinding } from "../../lib/static/article-gate.ts";
import { validateArticles } from "../../lib/content-pipeline/articles.ts";
import type { ArticlesSource } from "../../lib/content-pipeline/articles-source.ts";
import { planArticleIsolation, withoutArticles, type DroppedArticleGroup } from "../../lib/content-pipeline/article-isolation.ts";
import { buildVersionedSnapshot } from "../../lib/static/snapshot-io.ts";
import { loadSourceNames, redactSourceNames } from "../../lib/static/source-name-scan.ts";
import { PIPELINE_CONFIG } from "../../lib/content-pipeline/config.ts";
import { decreaseFindings, describeDecrease, type DecreaseFinding } from "../../lib/content-pipeline/validate.ts";
import { runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { compareTargetArtifacts } from "../../lib/static/target-diff-gate.ts";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { COMPANY_PUBLIC_EMAILS, COMPANY_PUBLIC_NUMBERS } from "../../lib/content/contact-channels.ts";
import { annotate, log as logger, parseArgs, paths, readJson, repoRoot, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const log = logger("export");
/** W11.6: at most this many isolate-and-rebuild rounds (each leaves out at least one more article). */
const MAX_ISOLATION_ROUNDS = 3;

await runStep("export", async () => {
  const work = workDir(args.get("work"));
  const p = paths(work);
  if (args.has("target")) throw new Error("--target is gone: every run builds both targets (r4)");
  const validation = readJson<{ ok: boolean; counts: Record<string, number>; previous_counts: Record<string, number> | null; previous_active_version: string | null; allow_decrease: boolean; decrease: DecreaseFinding[] }>(p.validation);
  if (!validation.ok) throw new Error("validation.json is not ok; refusing to export");
  let snapshot = readSnapshotFile(p.snapshot);
  const fetchReport = readJson<{ odoo: { requests: number; duration_ms: number } }>(p.fetchReport);
  const info: ArtifactPipelineInfo = {
    content_sha256: snapshot.content_sha256 ?? "",
    source_kind: snapshot.source.kind,
    fetched_at: snapshot.source.fetched_at,
    odoo_requests: fetchReport.odoo.requests,
    odoo_duration_ms: fetchReport.odoo.duration_ms,
    previous_active_version: validation.previous_active_version,
    decrease_threshold: PIPELINE_CONFIG.decreaseThreshold,
    allow_decrease: validation.allow_decrease,
    overridden_decreases: validation.decrease.map(({ key, previous, current }) => ({ key, previous, current })),
    run: {
      id: process.env.GITHUB_RUN_ID ?? null,
      url: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
      ref: process.env.GITHUB_REF_NAME ?? null,
      event: process.env.GITHUB_EVENT_NAME ?? null,
    },
  };
  const infoFile = path.join(work, "pipeline-info.json");
  const counts = { ...validation.counts };
  writeJson(infoFile, { info, counts });
  const build = (target: "staging" | "production", out: string, gateReport?: string) =>
    spawnSync("node", ["scripts/static/build.ts", "--snapshot", p.snapshot, "--target", target, "--out", out, "--pipeline", infoFile, ...(gateReport ? ["--gate-report", gateReport] : [])], { cwd: repoRoot, stdio: "inherit" });

  // W11.6: staging first; an article the article gate refuses is left out (all its locales) and the build runs again.
  const dropped: DroppedArticleGroup[] = [];
  const droppedRows = new Set<string>();
  const gateReport = path.join(work, "gate-staging.json");
  for (let round = 1; ; round++) {
    fs.rmSync(gateReport, { force: true });
    const staging = build("staging", p.artifact, gateReport);
    if (staging.status === 0) break;
    const failed = `static build/gate failed for the staging target (exit ${staging.status}); nothing was published`;
    if (!fs.existsSync(gateReport) || round > MAX_ISOLATION_ROUNDS) throw new Error(failed);
    const gate = readJson<{ failures: string[]; articleFindings: ArticleFinding[] }>(gateReport);
    const plan = planArticleIsolation(gate, snapshot.tables.published_articles);
    if (!plan.ok) throw new Error(`${failed}\nnot isolated to articles: ${plan.why}`);
    // Left out: the failing articles, then the validate step's own checks again without them (a translation or an
    // internal link to a left-out article goes too) — the same function and context as scripts/content/validate.ts.
    const source = readJson<ArticlesSource>(p.articlesSource);
    for (const g of plan.groups) for (const a of g.articles) droppedRows.add(a);
    const sourceNames = loadSourceNames();
    const checked = validateArticles({ ...source, files: withoutArticles(source.files, droppedRows) }, snapshot.tables, validation.previous_counts, sourceNames);
    if (checked.errors.length) throw new Error(`${failed}\nre-checking the articles without the refused ones failed: ${checked.errors.map((e) => redactSourceNames(e, sourceNames)).join("; ")}`);
    const kept = new Set(checked.rows.map((r) => `${r.locale}:${r.slug}`));
    const cascade = snapshot.tables.published_articles.map((r) => `${r.locale}:${r.slug}`).filter((k) => !kept.has(k) && !droppedRows.has(k));
    for (const g of plan.groups) dropped.push(g);
    if (cascade.length) dropped.push({ articles: cascade, reasons: ["links to, or is the translation of, an article the article gate refused"] });
    for (const k of cascade) droppedRows.add(k);
    snapshot = buildVersionedSnapshot({ ...snapshot.tables, published_articles: checked.rows }, snapshot.source, snapshot.snapshot_version, snapshot.created_at);
    writeJson(p.snapshot, snapshot);
    writeJson(p.articles, checked.rows);
    info.content_sha256 = snapshot.content_sha256 ?? "";
    info.article_gate_dropped = dropped;
    Object.assign(counts, checked.counts);
    writeJson(infoFile, { info, counts });
    for (const g of plan.groups) log(`article gate: leaving out ${g.articles.join(", ")}:\n  ${g.reasons.join("\n  ")}`);
    if (cascade.length) log(`article gate: also leaving out ${cascade.join(", ")} (link to or translate a left-out article)`);
  }
  for (const g of dropped) annotate("error", "ALERT: article left out by the article gate", `${g.articles.join(", ")} — ${g.reasons[0] ?? ""} (prices and every other page published)`);
  writeJson(path.join(work, "article-gate.json"), { dropped });

  const production = build("production", p.artifactProduction);
  if (production.status !== 0) throw new Error(`static build/gate failed for the production target (exit ${production.status}); nothing was published`);

  // Decrease gate on the built counts (rfq_catalog_*, rfq_variant_index_rows, sitemap_urls). W11.6: an article count
  // that fell only because the article gate left articles out of that locale is recorded, never a stop.
  const manifestPath = path.join(p.artifact, "manifest.json");
  const manifest = artifactManifest.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const droppedLocales = new Set([...droppedRows].map((k) => k.split(":")[0]));
  const built = decreaseFindings(manifest.counts, validation.previous_counts).filter((f) => !validation.decrease.some((d) => d.key === f.key));
  const byArticleGate = built.filter((f) => /^articles_(fa|en|ar)$/.test(f.key) && droppedLocales.has(f.key.slice("articles_".length)));
  const gated = built.filter((f) => !byArticleGate.includes(f));
  if (gated.length && !validation.allow_decrease) throw new Error(describeDecrease(gated));
  if (built.length) {
    const overrides = built.map(({ key, previous, current }) => ({ key, previous, current }));
    for (const dir of [p.artifact, p.artifactProduction]) {
      const file = path.join(dir, "manifest.json");
      const m = artifactManifest.parse(JSON.parse(fs.readFileSync(file, "utf8")));
      m.pipeline!.overridden_decreases.push(...overrides);
      fs.writeFileSync(file, JSON.stringify(m, null, 1) + "\n");
      const gate = runArtifactGate(dir, { companyPhones: COMPANY_PUBLIC_NUMBERS, companyEmails: COMPANY_PUBLIC_EMAILS });
      if (gate.failures.length) throw new Error(`artifact gate failed after recording overrides:\n${gate.failures.join("\n")}`);
    }
    manifest.pipeline!.overridden_decreases.push(...overrides);
  }
  // r4 §2: the production twin may differ from the staging artifact only in the allowlisted places.
  const diff = compareTargetArtifacts(p.artifact, p.artifactProduction);
  writeJson(p.targetDiff, diff);
  if (diff.failures.length) throw new Error(`allowlisted-diff gate (r4) failed:\n${diff.failures.slice(0, 30).join("\n")}`);
  log(`artifact ${manifest.snapshot_version}: ${manifest.public_assets.length} public, ${manifest.private_snapshot.length} private files`);
  summary(
    [
      "### Content export",
      `- artifact \`${manifest.snapshot_version}\` code \`${manifest.code_sha}\`: ${manifest.public_assets.length} public files (${manifest.public_assets.filter((f) => f.path.endsWith(".html")).length} HTML), ${manifest.private_snapshot.length} private`,
      `- counts \`${JSON.stringify(manifest.counts)}\``,
      `- allow_decrease: ${info.allow_decrease}${manifest.pipeline!.overridden_decreases.length ? ` (overrode ${JSON.stringify(manifest.pipeline!.overridden_decreases)})` : ""}`,
      dropped.length
        ? `- ⚠️ **article gate: ${dropped.length} article group(s) LEFT OUT** (prices and every other page published):\n${dropped.map((g) => `  - ${g.articles.join(", ")}: ${g.reasons.join("; ")}`).join("\n")}`
        : "- article gate: every article passed",
      ...(byArticleGate.length ? [`- ⚠️ live article(s) removed by the article gate, recorded as overridden decreases: ${byArticleGate.map((d) => `${d.key} ${d.previous}->${d.current}`).join(", ")}`] : []),
      "- artifact gate: pass (staging and production targets)",
      `- r4 allowlisted-diff gate: pass — ${diff.stats.files} files: ${diff.stats.identical} identical, ${diff.stats.normalizedEqual} differ only in allowlisted values, whole-file allowed: ${diff.stats.wholeFileAllowed.join(", ")}`,
    ].join("\n"),
  );
});
