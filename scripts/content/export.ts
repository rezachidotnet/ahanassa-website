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
 *   node scripts/content/export.ts --work <dir>
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest, type ArtifactPipelineInfo } from "../../lib/contracts/artifact-v1.ts";
import { PIPELINE_CONFIG } from "../../lib/content-pipeline/config.ts";
import { decreaseFindings, describeDecrease, type DecreaseFinding } from "../../lib/content-pipeline/validate.ts";
import { runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { compareTargetArtifacts } from "../../lib/static/target-diff-gate.ts";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { COMPANY_PUBLIC_NUMBERS } from "../../lib/content/contact-channels.ts";
import { log as logger, parseArgs, paths, readJson, repoRoot, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const log = logger("export");

await runStep("export", async () => {
  const work = workDir(args.get("work"));
  const p = paths(work);
  if (args.has("target")) throw new Error("--target is gone: every run builds both targets (r4)");
  const validation = readJson<{ ok: boolean; counts: Record<string, number>; previous_counts: Record<string, number> | null; previous_active_version: string | null; allow_decrease: boolean; decrease: DecreaseFinding[] }>(p.validation);
  if (!validation.ok) throw new Error("validation.json is not ok; refusing to export");
  const snapshot = readSnapshotFile(p.snapshot);
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
  writeJson(infoFile, { info, counts: validation.counts });

  for (const [target, out] of [["staging", p.artifact], ["production", p.artifactProduction]] as const) {
    const build = spawnSync("node", ["scripts/static/build.ts", "--snapshot", p.snapshot, "--target", target, "--out", out, "--pipeline", infoFile], { cwd: repoRoot, stdio: "inherit" });
    if (build.status !== 0) throw new Error(`static build/gate failed for the ${target} target (exit ${build.status}); nothing was published`);
  }

  // Decrease gate on the built counts (rfq_catalog_*, rfq_variant_index_rows, sitemap_urls).
  const manifestPath = path.join(p.artifact, "manifest.json");
  const manifest = artifactManifest.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const built = decreaseFindings(manifest.counts, validation.previous_counts).filter((f) => !validation.decrease.some((d) => d.key === f.key));
  if (built.length && !validation.allow_decrease) throw new Error(describeDecrease(built));
  if (built.length) {
    const overrides = built.map(({ key, previous, current }) => ({ key, previous, current }));
    for (const dir of [p.artifact, p.artifactProduction]) {
      const file = path.join(dir, "manifest.json");
      const m = artifactManifest.parse(JSON.parse(fs.readFileSync(file, "utf8")));
      m.pipeline!.overridden_decreases.push(...overrides);
      fs.writeFileSync(file, JSON.stringify(m, null, 1) + "\n");
      const gate = runArtifactGate(dir, { companyPhones: COMPANY_PUBLIC_NUMBERS });
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
      "- artifact gate: pass (staging and production targets)",
      `- r4 allowlisted-diff gate: pass — ${diff.stats.files} files: ${diff.stats.identical} identical, ${diff.stats.normalizedEqual} differ only in allowlisted values, whole-file allowed: ${diff.stats.wholeFileAllowed.join(", ")}`,
    ].join("\n"),
  );
});
