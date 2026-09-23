/**
 * CLI wrapper for release-gate.ts — invoked by deploy-production.yml's
 * "Release policy gate" step. It only supplies side effects (git, the
 * ledger, output files); every decision is evaluateReleaseGate's.
 *
 * Environment:
 *   RG_REPO_DIR                 git repository holding BASE and CANDIDATE (default: cwd)
 *   RG_LEDGER_REF               trusted commit to read the ledger from (the workflow's own commit)
 *   RG_CANDIDATE_SHA            deploy_ref, already resolved to a full SHA
 *   RG_DECLARED_RISK            declared_risk input (LOW | MEDIUM | HIGH)
 *   RG_ROLLOUT_PERCENTAGE       rollout_percentage input
 *   RG_SKIP_STAGING_PROVENANCE  legacy break-glass input, kept only so a
 *                               reintroduced "true" is refused (DAR-059);
 *                               deploy-production.yml always passes "false"
 *   RG_DECISION_FILE            where to write the decision JSON (required)
 *   GITHUB_STEP_SUMMARY / GITHUB_OUTPUT  appended to when set
 *
 * Exit status: 0 PERMITTED, 1 BLOCKED, 2 the gate itself could not run
 * (also a block — the workflow treats any non-zero status as "stop").
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { decisionOutputs, evaluateReleaseGate, renderDecisionMarkdown, type ReleaseGateDeps } from "./release-gate.ts";

const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";

function gitDeps(repoDir: string, ledgerRef: string): ReleaseGateDeps {
  const git = (args: string[]) => execFileSync("git", args, { cwd: repoDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const succeeds = (args: string[]) => {
    try {
      git(args);
      return true;
    } catch {
      return false;
    }
  };
  return {
    readLedger() {
      if (!/^[0-9a-f]{40}$/.test(ledgerRef)) return null;
      try {
        return git(["show", `${ledgerRef}:${LEDGER_PATH}`]);
      } catch {
        return null;
      }
    },
    commitExists: (sha) => succeeds(["cat-file", "-e", `${sha}^{commit}`]),
    readFileAtCommit(sha, filePath) {
      if (!/^[0-9a-f]{40}$/.test(sha)) return null;
      try {
        return git(["show", `${sha}:${filePath}`]);
      } catch {
        return null;
      }
    },
    isAncestor: (a, b) => succeeds(["merge-base", "--is-ancestor", a, b]),
    diffNameStatusZ: (base, candidate) => git(["diff", "--name-status", "-z", "-M", "-C", "--no-ext-diff", base, candidate, "--"]),
  };
}

function main(): number {
  const env = process.env;
  const decisionFile = env.RG_DECISION_FILE;
  if (!decisionFile) {
    console.log("::error::RELEASE POLICY GATE FAILED — RG_DECISION_FILE is not set; refusing to run without an audit record destination.");
    return 2;
  }
  const decision = evaluateReleaseGate(
    {
      candidateSha: env.RG_CANDIDATE_SHA ?? "",
      declaredRisk: env.RG_DECLARED_RISK,
      rolloutPercentage: env.RG_ROLLOUT_PERCENTAGE,
      skipStagingProvenance: env.RG_SKIP_STAGING_PROVENANCE,
    },
    gitDeps(env.RG_REPO_DIR ?? process.cwd(), env.RG_LEDGER_REF ?? ""),
  );

  writeFileSync(decisionFile, `${JSON.stringify(decision, null, 2)}\n`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `\n${renderDecisionMarkdown(decision)}`);
  if (env.GITHUB_OUTPUT) {
    appendFileSync(
      env.GITHUB_OUTPUT,
      Object.entries(decisionOutputs(decision))
        .map(([k, v]) => `${k}=${v.replace(/[\r\n]/g, " ")}\n`)
        .join(""),
    );
  }

  console.log(`BASE_PRODUCTION_SHA=${decision.BASE_PRODUCTION_SHA ?? "UNRESOLVED"}`);
  console.log(`CANDIDATE_SHA=${decision.CANDIDATE_SHA}`);
  console.log(`DECLARED_RISK=${decision.DECLARED_RISK ?? "INVALID"} COMPUTED_MINIMUM_RISK=${decision.COMPUTED_MINIMUM_RISK ?? "-"} FINAL_RISK=${decision.FINAL_RISK ?? "-"}`);
  console.log(`CLASSIFICATION_RESULT=${decision.CLASSIFICATION_RESULT} CHANGED_FILES=${decision.CHANGED_FILES.length} TRIGGERED_RISK_RULES=${decision.TRIGGERED_RISK_RULES.join(",") || "-"}`);
  console.log(
    `LEDGER_CHANGE_PRESENT=${decision.LEDGER_CHANGE_PRESENT} LEDGER_APPEND_EXEMPTION_APPLIED=${decision.LEDGER_APPEND_EXEMPTION_APPLIED} LEDGER_APPEND_VALIDATION_RESULT=${decision.LEDGER_APPEND_VALIDATION_RESULT}`,
  );

  if (decision.RESULT !== "PERMITTED") {
    console.log(`::error::RELEASE POLICY GATE BLOCKED — ${decision.BLOCK_CODE}: ${decision.BLOCK_REASONS[0] ?? ""}`);
    for (const r of decision.BLOCK_REASONS.slice(1)) console.log(`  ${r}`);
    return 1;
  }
  console.log(`Release policy gate PERMITTED — FINAL_RISK ${decision.FINAL_RISK}, rollout ${decision.ROLLOUT_PERCENTAGE}%. ${decision.EXPECTED_RELEASE_PATH}`);
  return 0;
}

// Unconditional entrypoint: this file is only ever executed, never imported
// (tests import release-gate.ts). An "am I the main module?" guard could
// silently skip main() — e.g. when a temp path is a symlink — and a gate
// that does nothing must never look like a gate that passed.
try {
  process.exitCode = main();
} catch (e) {
  console.log(`::error::RELEASE POLICY GATE FAILED — the gate could not complete: ${(e as Error).message}`);
  process.exitCode = 2;
}
