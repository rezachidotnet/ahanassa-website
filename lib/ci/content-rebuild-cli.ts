/**
 * CLI for content-rebuild.ts (RELEASE_POLICY.md §19) — decides whether a
 * production content publication is a CONTENT_REBUILD that may run without
 * manual approval. It only reads; every decision is evaluateContentRebuild's.
 *
 *   node lib/ci/content-rebuild-cli.ts --artifact <dir> --ledger-ref <ref> [--repo <dir>] [--gates-passed true|false] [--decision-file <out.json>]
 *   node lib/ci/content-rebuild-cli.ts --artifact <dir> --ledger-file <PRODUCTION_DEPLOYMENT_MANIFEST.md> ...   (local/tests)
 *
 * --ledger-ref is the TRUSTED production application branch (until cutover
 * `origin/feat/header-hero-integrated`), never the artifact's own code_sha:
 * a release SHA can never carry its own STABLE_100 row (§7.1 item 10).
 *
 * Exit status: 0 AUTO (no manual approval), 3 APPROVAL_REQUIRED, 1 REFUSED
 * (not a content rebuild — code release path), 2 the check itself could not run.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { evaluateContentRebuild, type ContentRebuildDecision } from "./content-rebuild.ts";

const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function readLedger(): { markdown: string | null; source: string } {
  const file = arg("ledger-file");
  if (file) {
    try {
      return { markdown: readFileSync(file, "utf8"), source: file };
    } catch {
      return { markdown: null, source: file };
    }
  }
  const ref = arg("ledger-ref");
  if (!ref) throw new Error("--ledger-ref or --ledger-file is required");
  const repo = arg("repo") ?? process.cwd();
  try {
    const sha = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: repo, encoding: "utf8" }).trim();
    return { markdown: execFileSync("git", ["show", `${sha}:${LEDGER_PATH}`], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }), source: `${ref} (${sha}):${LEDGER_PATH}` };
  } catch {
    return { markdown: null, source: `${ref}:${LEDGER_PATH}` };
  }
}

export function renderDecision(d: ContentRebuildDecision, ledgerSource: string): string {
  return [
    `### CONTENT_REBUILD check: ${d.result}${d.result === "REFUSED" ? ` (${d.code})` : ""}`,
    `- OPERATION_TYPE: ${d.result === "REFUSED" ? "not CONTENT_REBUILD (code release path)" : "CONTENT_REBUILD"}`,
    `- manual approval: ${d.result === "AUTO" ? "not required (gates + automatic smoke + automatic rollback)" : "REQUIRED"}`,
    `- code_sha: \`${d.codeSha ?? "-"}\``,
    `- BASE_PRODUCTION_SHA (latest STABLE_100): \`${d.baseProductionSha ?? "-"}\``,
    `- snapshot_version: \`${d.snapshotVersion ?? "-"}\``,
    `- ledger: ${ledgerSource}`,
    ...d.reasons.map((r) => `- ${r}`),
    "",
  ].join("\n");
}

if (import.meta.main) {
  let status = 2;
  try {
    const artifact = arg("artifact");
    if (!artifact) throw new Error("--artifact <dir> is required");
    const manifest = JSON.parse(readFileSync(path.join(artifact, "manifest.json"), "utf8")) as unknown;
    const gates = arg("gates-passed") ?? "true";
    if (gates !== "true" && gates !== "false") throw new Error("--gates-passed must be true or false");
    const ledger = readLedger();
    const decision = evaluateContentRebuild({ manifest, ledgerMarkdown: ledger.markdown, gatesPassed: gates === "true" });
    const markdown = renderDecision(decision, ledger.source);
    console.log(markdown);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `content_rebuild=${decision.result}\n`);
    const out = arg("decision-file");
    if (out) writeFileSync(out, JSON.stringify(decision, null, 1) + "\n");
    status = decision.result === "AUTO" ? 0 : decision.result === "APPROVAL_REQUIRED" ? 3 : 1;
  } catch (err) {
    console.error(`content-rebuild check could not run: ${err instanceof Error ? err.message : String(err)}`);
    status = 2;
  }
  process.exit(status);
}
