import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_RELEASE_PATH,
  PERMITTED_ROLLOUTS,
  evaluateReleaseGate,
  parseDeclaredRisk,
  parseNameStatusZ,
  renderDecisionMarkdown,
  type ReleaseGateDeps,
  type ReleaseGateInput,
} from "./release-gate.ts";
import { resolveBaseProductionShaFromManifest } from "./release-ledger.ts";

// Release-time policy gate — docs/release/RELEASE_POLICY.md §0.2,
// docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md.
// Test numbers match that report's Phase 11 list. Every SHA / Worker
// Version ID here is synthetic; the real ones appear only in the blocklist
// declaration used by the "no hardcoded identifier" tests.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const WORKFLOW_PATH = path.join(repoRoot, ".github", "workflows", "deploy-production.yml");
const WORKFLOW = readFileSync(WORKFLOW_PATH, "utf8");
const CLI_PATH = path.join(here, "release-gate-cli.ts");
const ENGINE_FILES = ["release-gate-cli.ts", "release-gate.ts", "release-risk-classifier.ts", "release-ledger.ts"];

const BASE = "1".repeat(40);
const OLDER = "2".repeat(40);
const CANDIDATE = "3".repeat(40);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HEADER =
  "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |";
const SEPARATOR = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";

function ledgerRow(sha: string, state: string, finalRisk = "HIGH"): string {
  return `| \`${sha}\` | \`00000000-0000-4000-8000-000000000001\` | ${state} | 100 | \`900\` | \`901\` | - | \`00000000-0000-4000-8000-000000000002\` | ${finalRisk} | PASS | 2026-01-01T00:00:00Z | synthetic |`;
}

function ledger(...rows: string[]): string {
  return ["# Manifest", "", "## Ledger (RELEASE_POLICY.md schema)", "", HEADER, SEPARATOR, ...rows, "", "Trailing prose."].join("\n");
}

const STANDARD_LEDGER = ledger(ledgerRow(OLDER, "STABLE_100"), ledgerRow(BASE, "CANARY_ACTIVE"), ledgerRow(BASE, "STABLE_100"));

function z(...entries: string[][]): string {
  return entries.map((e) => e.join("\0")).join("\0") + (entries.length ? "\0" : "");
}

function deps(opts: { ledger?: string | null; diff?: string; missing?: string[]; diffThrows?: boolean } = {}): ReleaseGateDeps & { diffCalls: string[][] } {
  const diffCalls: string[][] = [];
  return {
    diffCalls,
    readLedger: () => (opts.ledger === undefined ? STANDARD_LEDGER : opts.ledger),
    commitExists: (sha) => !(opts.missing ?? []).includes(sha),
    isAncestor: () => true,
    diffNameStatusZ: (base, candidate) => {
      diffCalls.push([base, candidate]);
      if (opts.diffThrows) throw new Error("fatal: bad revision");
      return opts.diff ?? "";
    },
  };
}

function input(overrides: Partial<ReleaseGateInput> = {}): ReleaseGateInput {
  return { candidateSha: CANDIDATE, declaredRisk: "LOW", rolloutPercentage: "100", skipStagingProvenance: "false", ...overrides };
}

const LOW_DIFF = z(["M", "lib/content/homepage.ts"], ["M", "public/images/hero.webp"], ["M", "docs/notes/readme.md"]);
const MEDIUM_DIFF = z(["M", "components/products/product-card.tsx"], ["M", "lib/content/homepage.ts"]);
const HIGH_DIFF = z(["M", "lib/rfq/submit.ts"]);

// ---------------------------------------------------------------------------
// Baseline resolution (strict ledger read)
// ---------------------------------------------------------------------------

test("1. BASE_PRODUCTION_SHA resolves from the LATEST STABLE_100 row, ignoring a later canary row", () => {
  const r = resolveBaseProductionShaFromManifest(ledger(ledgerRow(OLDER, "STABLE_100"), ledgerRow(BASE, "STABLE_100"), ledgerRow(CANDIDATE, "CANARY_ACTIVE")));
  assert.equal(r.ok, true);
  assert.equal((r as { releaseSha: string }).releaseSha, BASE);
  const d = evaluateReleaseGate(input({ declaredRisk: "HIGH", rolloutPercentage: "10" }), deps({ diff: HIGH_DIFF }));
  assert.equal(d.BASE_PRODUCTION_SHA, BASE);
});

test("1b. the real ledger resolves deterministically to a STABLE_100 row", () => {
  const md = readFileSync(path.join(repoRoot, "docs", "release", "PRODUCTION_DEPLOYMENT_MANIFEST.md"), "utf8");
  const r = resolveBaseProductionShaFromManifest(md);
  assert.equal(r.ok, true, JSON.stringify(r));
  if (r.ok) {
    assert.equal(r.row.releaseState, "STABLE_100");
    assert.match(r.releaseSha, /^[0-9a-f]{40}$/);
  }
});

test("2. no STABLE_100 row -> BASE_PRODUCTION_SHA_UNRESOLVED, fail closed", () => {
  const d = evaluateReleaseGate(input(), deps({ ledger: ledger(ledgerRow(BASE, "CANARY_ACTIVE"), ledgerRow(OLDER, "LEGACY_IN_FLIGHT_RELEASE")), diff: LOW_DIFF }));
  assert.equal(d.RESULT, "BLOCKED");
  assert.equal(d.BLOCK_CODE, "BASE_PRODUCTION_SHA_UNRESOLVED");
  assert.equal(d.BASE_PRODUCTION_SHA, null);
});

test("2b. empty ledger table -> BASE_PRODUCTION_SHA_UNRESOLVED", () => {
  const d = evaluateReleaseGate(input(), deps({ ledger: ledger() }));
  assert.equal(d.BLOCK_CODE, "BASE_PRODUCTION_SHA_UNRESOLVED");
});

test("3. malformed ledgers -> LEDGER_MALFORMED, fail closed (never a lenient read)", () => {
  const cases: Array<[string, string]> = [
    ["no table", "# Manifest\n\nnothing here\n"],
    ["two authoritative tables", `${ledger(ledgerRow(BASE, "STABLE_100"))}\n\n${ledger(ledgerRow(OLDER, "STABLE_100"))}`],
    ["reordered header", ledger(ledgerRow(BASE, "STABLE_100")).replace("| WORKER_VERSION_ID | RELEASE_STATE |", "| RELEASE_STATE | WORKER_VERSION_ID |")],
    ["truncated row", ledger(ledgerRow(BASE, "STABLE_100").split("|").slice(0, 8).join("|") + "|")],
    ["unknown state", ledger(ledgerRow(BASE, "STABLE_10O"))],
    ["short sha", ledger(ledgerRow("abc1234", "STABLE_100"))],
    ["bad final risk", ledger(ledgerRow(BASE, "STABLE_100", "LOWISH"))],
    ["missing separator", ledger(ledgerRow(BASE, "STABLE_100")).replace(`${SEPARATOR}\n`, "")],
  ];
  for (const [label, md] of cases) {
    const d = evaluateReleaseGate(input(), deps({ ledger: md, diff: LOW_DIFF }));
    assert.equal(d.RESULT, "BLOCKED", label);
    assert.equal(d.BLOCK_CODE, "LEDGER_MALFORMED", `${label}: ${d.BLOCK_REASONS.join("; ")}`);
  }
});

test("3b. an unreadable ledger -> LEDGER_UNREADABLE", () => {
  assert.equal(evaluateReleaseGate(input(), deps({ ledger: null })).BLOCK_CODE, "LEDGER_UNREADABLE");
});

test("3c. baseline SHA absent from git history -> BASE_COMMIT_MISSING", () => {
  const d = evaluateReleaseGate(input(), deps({ missing: [BASE], diff: LOW_DIFF }));
  assert.equal(d.BLOCK_CODE, "BASE_COMMIT_MISSING");
});

// ---------------------------------------------------------------------------
// Candidate + change set
// ---------------------------------------------------------------------------

test("4. candidate SHA must be a full SHA and exist in history", () => {
  assert.equal(evaluateReleaseGate(input({ candidateSha: "abc1234" }), deps()).BLOCK_CODE, "CANDIDATE_SHA_INVALID");
  assert.equal(evaluateReleaseGate(input({ candidateSha: "A".repeat(40) }), deps()).BLOCK_CODE, "CANDIDATE_SHA_INVALID");
  assert.equal(evaluateReleaseGate(input(), deps({ missing: [CANDIDATE] })).BLOCK_CODE, "CANDIDATE_COMMIT_MISSING");
});

test("5. the diff is requested exactly for BASE_PRODUCTION_SHA..CANDIDATE_SHA", () => {
  const dp = deps({ diff: LOW_DIFF });
  evaluateReleaseGate(input(), dp);
  assert.deepEqual(dp.diffCalls, [[BASE, CANDIDATE]]);
});

test("5b. a failing or unparseable diff fails closed (CHANGESET_UNREADABLE)", () => {
  assert.equal(evaluateReleaseGate(input(), deps({ diffThrows: true })).BLOCK_CODE, "CHANGESET_UNREADABLE");
  assert.equal(evaluateReleaseGate(input(), deps({ diff: z(["U", "lib/content/a.ts"]) })).BLOCK_CODE, "CHANGESET_UNREADABLE");
  assert.equal(evaluateReleaseGate(input(), deps({ diff: "R100\0lib/content/a.ts\0" })).BLOCK_CODE, "CHANGESET_UNREADABLE");
});

test("parseNameStatusZ preserves A/M/D/T and R/C source+destination paths, including unusual characters", () => {
  const r = parseNameStatusZ(z(["A", "public/a b.png"]));
  assert.deepEqual(r, { ok: true, files: [{ status: "A", path: "public/a b.png" }] });
  const r2 = parseNameStatusZ(z(["M", "lib/content/x.ts"], ["D", "lib/db/y.ts"], ["R087", "lib/ci/old.ts", "lib/misc/new.ts"], ["C100", "a/x.ts", "a/y.ts"], ["T", "lib/content/t.ts"]));
  assert.equal(r2.ok, true);
  if (r2.ok) {
    assert.deepEqual(r2.files[2], { status: "R", path: "lib/misc/new.ts", oldPath: "lib/ci/old.ts" });
    assert.deepEqual(r2.files[3], { status: "C", path: "a/y.ts", oldPath: "a/x.ts" });
    assert.equal(r2.files.length, 5);
  }
  assert.equal(parseNameStatusZ("").ok, true);
  assert.equal(parseNameStatusZ(z(["X", "a"])).ok, false);
  assert.equal(parseNameStatusZ("M\0").ok, false);
});

// ---------------------------------------------------------------------------
// Computed risk (via the real classifier)
// ---------------------------------------------------------------------------

function classify(diff: string, declaredRisk = "LOW", rolloutPercentage?: string) {
  return evaluateReleaseGate(input({ declaredRisk, rolloutPercentage: rolloutPercentage ?? "100" }), deps({ diff }));
}

test("6. LOW-only diff computes LOW and is PERMITTED at 100", () => {
  const d = classify(LOW_DIFF);
  assert.equal(d.COMPUTED_MINIMUM_RISK, "LOW");
  assert.equal(d.FINAL_RISK, "LOW");
  assert.equal(d.RESULT, "PERMITTED");
});

test("7. ordinary application diff computes MEDIUM", () => {
  assert.equal(classify(MEDIUM_DIFF).COMPUTED_MINIMUM_RISK, "MEDIUM");
});

test("8. HIGH path diff computes HIGH", () => {
  for (const p of ["lib/rfq/submit.ts", "migrations/0099_x.sql", ".github/workflows/deploy-production.yml", "lib/ci/release-gate.ts", "wrangler.jsonc", "CLAUDE.md"]) {
    assert.equal(classify(z(["M", p]), "LOW", "10").COMPUTED_MINIMUM_RISK, "HIGH", p);
  }
});

test("9. mixed LOW + HIGH computes HIGH (highest wins, no majority vote)", () => {
  const d = classify(z(["M", "lib/content/a.ts"], ["M", "lib/content/b.ts"], ["M", "public/c.png"], ["M", "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md"]), "LOW", "10");
  assert.equal(d.COMPUTED_MINIMUM_RISK, "HIGH");
  assert.deepEqual(d.TRIGGERED_RISK_RULES, ["HIGH_RELEASE_PATHS"]);
});

test("10. deleting a HIGH file computes HIGH", () => {
  assert.equal(classify(z(["D", "lib/security/rate-limit.ts"]), "LOW", "10").COMPUTED_MINIMUM_RISK, "HIGH");
});

test("11. renaming INTO a HIGH path computes HIGH", () => {
  const d = classify(z(["R100", "lib/content/helper.ts", "lib/db/helper.ts"]), "LOW", "10");
  assert.equal(d.COMPUTED_MINIMUM_RISK, "HIGH");
  assert.equal(d.CHANGED_FILES[0]!.old_path, "lib/content/helper.ts");
  assert.equal(d.CHANGED_FILES[0]!.rule, "HIGH_RFQ_PATHS");
});

test("12. renaming OUT OF a HIGH path computes HIGH", () => {
  const d = classify(z(["R095", "lib/ci/release-gate.ts", "lib/content/moved.ts"]), "LOW", "10");
  assert.equal(d.COMPUTED_MINIMUM_RISK, "HIGH");
  assert.equal(d.CHANGED_FILES[0]!.rule, "HIGH_RELEASE_PATHS");
});

test("13. unknown path -> CLASSIFICATION_REQUIRED, fail closed (never coerced to MEDIUM)", () => {
  for (const p of ["newtopdir/x.ts", "lib/content/blob.bin", "components/logo.png"]) {
    const d = classify(z(["M", "lib/content/a.ts"], ["A", p]));
    assert.equal(d.RESULT, "BLOCKED", p);
    assert.equal(d.BLOCK_CODE, "CLASSIFICATION_REQUIRED", p);
    assert.equal(d.CLASSIFICATION_RESULT, "CLASSIFICATION_REQUIRED", p);
    assert.equal(d.COMPUTED_MINIMUM_RISK, null, p);
    assert.equal(d.FINAL_RISK, null, p);
  }
});

// ---------------------------------------------------------------------------
// FINAL_RISK = max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)
// ---------------------------------------------------------------------------

test("14. declared LOW + computed MEDIUM -> FINAL MEDIUM", () => {
  const d = classify(MEDIUM_DIFF, "LOW");
  assert.deepEqual([d.DECLARED_RISK, d.COMPUTED_MINIMUM_RISK, d.FINAL_RISK], ["LOW", "MEDIUM", "MEDIUM"]);
});

test("15. declared LOW + computed HIGH -> FINAL HIGH", () => {
  const d = classify(HIGH_DIFF, "LOW", "10");
  assert.deepEqual([d.DECLARED_RISK, d.COMPUTED_MINIMUM_RISK, d.FINAL_RISK], ["LOW", "HIGH", "HIGH"]);
});

test("16. declared MEDIUM + computed LOW -> FINAL MEDIUM (escalation recorded)", () => {
  const d = classify(LOW_DIFF, "MEDIUM");
  assert.deepEqual([d.COMPUTED_MINIMUM_RISK, d.FINAL_RISK], ["LOW", "MEDIUM"]);
  assert.ok(d.TRIGGERED_RISK_RULES.includes("DECLARED_RISK_ESCALATION:MEDIUM"));
});

test("17. declared HIGH + computed LOW -> FINAL HIGH", () => {
  const d = classify(LOW_DIFF, "HIGH", "10");
  assert.deepEqual([d.COMPUTED_MINIMUM_RISK, d.FINAL_RISK, d.RESULT], ["LOW", "HIGH", "PERMITTED"]);
});

test("18. missing / malformed declared risk -> DECLARED_RISK_INVALID, fail closed", () => {
  for (const bad of ["", "low", " LOW", "LOW ", "CRITICAL", "NONE", "LOW,HIGH"]) {
    assert.equal(parseDeclaredRisk(bad).ok, false, String(bad));
    const d = classify(LOW_DIFF, bad);
    assert.equal(d.BLOCK_CODE, "DECLARED_RISK_INVALID", String(bad));
  }
  assert.equal(parseDeclaredRisk(undefined).ok, false);
  const d = evaluateReleaseGate(input({ declaredRisk: undefined }), deps({ diff: LOW_DIFF }));
  assert.equal(d.BLOCK_CODE, "DECLARED_RISK_INVALID");
});

test("19. classifier ambiguity blocks even when HIGH is declared (declaration never short-circuits classification)", () => {
  const d = classify(z(["A", "brand-new-dir/file.ts"]), "HIGH", "10");
  assert.equal(d.BLOCK_CODE, "CLASSIFICATION_REQUIRED");
});

// ---------------------------------------------------------------------------
// Release-path enforcement
// ---------------------------------------------------------------------------

test("20. HIGH cannot use the direct 100% (or 50%) path", () => {
  for (const rollout of ["100", "50"]) {
    const d = classify(HIGH_DIFF, "LOW", rollout);
    assert.equal(d.FINAL_RISK, "HIGH");
    assert.equal(d.RESULT, "BLOCKED", rollout);
    assert.equal(d.BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK", rollout);
  }
  const escalated = classify(LOW_DIFF, "HIGH", "100");
  assert.equal(escalated.BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK");
});

test("21. HIGH can use the approved 10% canary path, with staging provenance", () => {
  const d = classify(HIGH_DIFF, "HIGH", "10");
  assert.equal(d.RESULT, "PERMITTED");
  assert.equal(d.CANARY_REQUIRED, true);
  assert.equal(d.EXPECTED_RELEASE_PATH, EXPECTED_RELEASE_PATH.HIGH);
  assert.match(d.EXPECTED_RELEASE_PATH!, /promote-production\.yml/);
});

test("21b. HIGH never uses the skip_staging_provenance break-glass", () => {
  const d = evaluateReleaseGate(input({ declaredRisk: "HIGH", rolloutPercentage: "10", skipStagingProvenance: "true" }), deps({ diff: HIGH_DIFF }));
  assert.equal(d.BLOCK_CODE, "HIGH_REQUIRES_STAGING_PROVENANCE");
});

test("22. LOW direct production path allowed (100), canary legs refused", () => {
  assert.equal(classify(LOW_DIFF, "LOW", "100").RESULT, "PERMITTED");
  assert.equal(classify(LOW_DIFF, "LOW", "10").BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK");
  assert.equal(classify(LOW_DIFF, "LOW", "50").BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK");
});

test("23. MEDIUM direct production path allowed (100)", () => {
  const d = classify(MEDIUM_DIFF, "MEDIUM", "100");
  assert.equal(d.RESULT, "PERMITTED");
  assert.equal(d.CANARY_REQUIRED, false);
  assert.equal(classify(MEDIUM_DIFF, "MEDIUM", "10").BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK");
});

test("23b. LOW/MEDIUM keep the existing break-glass staging behavior (conflict recorded, not changed)", () => {
  const d = evaluateReleaseGate(input({ skipStagingProvenance: "true" }), deps({ diff: LOW_DIFF }));
  assert.equal(d.RESULT, "PERMITTED");
  assert.equal(d.SKIP_STAGING_PROVENANCE, true);
  assert.equal(evaluateReleaseGate(input({ skipStagingProvenance: "yes" }), deps({ diff: LOW_DIFF })).BLOCK_CODE, "SKIP_STAGING_PROVENANCE_INVALID");
  assert.equal(evaluateReleaseGate(input({ rolloutPercentage: "25" }), deps({ diff: LOW_DIFF })).BLOCK_CODE, "ROLLOUT_INVALID");
});

test("permitted rollouts are exactly the RELEASE_POLICY.md §5 paths", () => {
  assert.deepEqual(PERMITTED_ROLLOUTS, { LOW: ["100"], MEDIUM: ["100"], HIGH: ["10"] });
});

// ---------------------------------------------------------------------------
// Audit record
// ---------------------------------------------------------------------------

const REQUIRED_AUDIT_FIELDS = [
  "OPERATION_TYPE",
  "BASE_PRODUCTION_SHA",
  "CANDIDATE_SHA",
  "DECLARED_RISK",
  "COMPUTED_MINIMUM_RISK",
  "FINAL_RISK",
  "TRIGGERED_RISK_RULES",
  "CHANGED_FILES",
  "CLASSIFICATION_RESULT",
  "STAGING_PROVENANCE_RUN_ID",
  "EXPECTED_RELEASE_PATH",
  "RESULT",
];

test("29. the decision record and job-summary rendering carry every required audit field", () => {
  const permitted = classify(HIGH_DIFF, "LOW", "10");
  const blocked = classify(HIGH_DIFF, "LOW", "100");
  for (const d of [permitted, blocked]) {
    for (const f of REQUIRED_AUDIT_FIELDS) assert.ok(f in d, `decision lacks ${f}`);
    const md = renderDecisionMarkdown(d);
    for (const f of REQUIRED_AUDIT_FIELDS) assert.ok(md.includes(f), `summary lacks ${f}`);
    assert.equal(d.OPERATION_TYPE, "RELEASE");
  }
  assert.match(renderDecisionMarkdown(blocked), /BLOCKED — `ROLLOUT_NOT_PERMITTED_FOR_RISK`/);
  assert.ok(renderDecisionMarkdown(permitted).includes("lib/rfq/submit.ts"));
});

// ---------------------------------------------------------------------------
// Real git: the CLI against a temporary repository
// ---------------------------------------------------------------------------

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.invalid",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.invalid",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

class Repo {
  readonly dir: string;
  constructor() {
    this.dir = mkdtempSync(path.join(tmpdir(), "release-gate-"));
    this.git("init", "-q", "-b", "main");
  }
  git(...args: string[]): string {
    return execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd: this.dir, env: GIT_ENV, encoding: "utf8" }).trim();
  }
  write(rel: string, content: string): void {
    const p = path.join(this.dir, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  commit(msg: string): string {
    this.git("add", "-A");
    this.git("commit", "-q", "--allow-empty", "-m", msg);
    return this.git("rev-parse", "HEAD");
  }
  cleanup(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

/** Commits a ledger naming `baseSha` as STABLE_100 on a side branch; returns the ledger commit. */
function commitLedgerOnSideBranch(repo: Repo, from: string, baseSha: string, branch = "policy"): string {
  const back = repo.git("rev-parse", "HEAD");
  repo.git("checkout", "-q", "-b", branch, from);
  repo.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger(ledgerRow(baseSha, "STABLE_100")));
  const sha = repo.commit("ledger");
  repo.git("checkout", "-q", back);
  return sha;
}

function runCli(repo: Repo, env: Record<string, string>) {
  const decisionFile = path.join(repo.dir, "..", `${path.basename(repo.dir)}-decision.json`);
  const outputFile = path.join(repo.dir, "..", `${path.basename(repo.dir)}-output.txt`);
  const summaryFile = path.join(repo.dir, "..", `${path.basename(repo.dir)}-summary.md`);
  const r = spawnSync(process.execPath, [CLI_PATH], {
    env: {
      PATH: process.env.PATH ?? "",
      RG_REPO_DIR: repo.dir,
      RG_DECLARED_RISK: "LOW",
      RG_ROLLOUT_PERCENTAGE: "100",
      RG_SKIP_STAGING_PROVENANCE: "false",
      RG_DECISION_FILE: decisionFile,
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile,
      ...env,
    } as unknown as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  const read = (f: string) => {
    try {
      return readFileSync(f, "utf8");
    } catch {
      return "";
    }
  };
  const result = { status: r.status, stdout: r.stdout, decision: JSON.parse(read(decisionFile) || "null"), output: read(outputFile), summary: read(summaryFile) };
  for (const f of [decisionFile, outputFile, summaryFile]) rmSync(f, { force: true });
  return result;
}

test("5c. real git: only changes AFTER BASE_PRODUCTION_SHA count, and the range is a tree diff", () => {
  const repo = new Repo();
  try {
    repo.write("lib/ci/pre-base.ts", "export const x = 1;\n"); // HIGH change BEFORE base
    repo.write("lib/content/a.ts", "export const a = 1;\n");
    const base = repo.commit("base");
    repo.write("lib/db/tmp.ts", "export const t = 1;\n"); // HIGH change ...
    repo.commit("add high");
    rmSync(path.join(repo.dir, "lib/db/tmp.ts"));
    repo.write("lib/content/a.ts", "export const a = 2;\n"); // ... reverted; plus a LOW change
    const candidate = repo.commit("revert high, low change");
    const ledgerRef = commitLedgerOnSideBranch(repo, candidate, base);

    const r = runCli(repo, { RG_LEDGER_REF: ledgerRef, RG_CANDIDATE_SHA: candidate });
    assert.equal(r.status, 0, r.stdout);
    assert.equal(r.decision.BASE_PRODUCTION_SHA, base);
    assert.equal(r.decision.COMPUTED_MINIMUM_RISK, "LOW");
    assert.deepEqual(r.decision.CHANGED_FILES.map((f: { path: string }) => f.path), ["lib/content/a.ts"]);
    assert.equal(r.decision.BASE_IS_ANCESTOR_OF_CANDIDATE, true);
    assert.match(r.output, /^final_risk=LOW$/m);
    assert.match(r.output, new RegExp(`^base_production_sha=${base}$`, "m"));
    for (const f of REQUIRED_AUDIT_FIELDS) assert.ok(r.summary.includes(f), `summary lacks ${f}`);
  } finally {
    repo.cleanup();
  }
});

test("10b/11b/12b. real git renames/deletes are detected with status and both paths", () => {
  const repo = new Repo();
  try {
    repo.write("lib/ci/old-helper.ts", "export const helperFunctionBody = 'a fairly long body so rename detection is unambiguous';\n");
    repo.write("lib/content/move-me.ts", "export const movedContentBody = 'another fairly long body so rename detection works';\n");
    repo.write("migrations/0001_x.sql", "create table x (id integer);\n");
    const base = repo.commit("base");
    repo.git("mv", "lib/ci/old-helper.ts", "lib/content/old-helper.ts");
    mkdirSync(path.join(repo.dir, "lib", "db"), { recursive: true });
    repo.git("mv", "lib/content/move-me.ts", "lib/db/move-me.ts");
    repo.git("rm", "-q", "migrations/0001_x.sql");
    const candidate = repo.commit("rename + delete");
    const ledgerRef = commitLedgerOnSideBranch(repo, candidate, base);

    const r = runCli(repo, { RG_LEDGER_REF: ledgerRef, RG_CANDIDATE_SHA: candidate, RG_ROLLOUT_PERCENTAGE: "10" });
    assert.equal(r.status, 0, r.stdout);
    assert.equal(r.decision.FINAL_RISK, "HIGH");
    const byPath = Object.fromEntries(r.decision.CHANGED_FILES.map((f: { path: string }) => [f.path, f]));
    assert.equal(byPath["lib/content/old-helper.ts"].status, "R");
    assert.equal(byPath["lib/content/old-helper.ts"].old_path, "lib/ci/old-helper.ts");
    assert.equal(byPath["lib/content/old-helper.ts"].risk, "HIGH");
    assert.equal(byPath["lib/db/move-me.ts"].old_path, "lib/content/move-me.ts");
    assert.equal(byPath["lib/db/move-me.ts"].risk, "HIGH");
    assert.equal(byPath["migrations/0001_x.sql"].status, "D");
    assert.equal(byPath["migrations/0001_x.sql"].risk, "HIGH");
  } finally {
    repo.cleanup();
  }
});

test("4b/3d. real git: missing candidate, missing baseline and a ref without a ledger all fail closed", () => {
  const repo = new Repo();
  try {
    repo.write("lib/content/a.ts", "1\n");
    const base = repo.commit("base");
    const ledgerRef = commitLedgerOnSideBranch(repo, base, base);
    const ghostRef = commitLedgerOnSideBranch(repo, base, "4".repeat(40), "ghost");

    const missingCandidate = runCli(repo, { RG_LEDGER_REF: ledgerRef, RG_CANDIDATE_SHA: "5".repeat(40) });
    assert.equal(missingCandidate.status, 1);
    assert.equal(missingCandidate.decision.BLOCK_CODE, "CANDIDATE_COMMIT_MISSING");
    assert.match(missingCandidate.stdout, /::error::RELEASE POLICY GATE BLOCKED/);

    const missingBase = runCli(repo, { RG_LEDGER_REF: ghostRef, RG_CANDIDATE_SHA: base });
    assert.equal(missingBase.decision.BLOCK_CODE, "BASE_COMMIT_MISSING");

    const noLedger = runCli(repo, { RG_LEDGER_REF: base, RG_CANDIDATE_SHA: base });
    assert.equal(noLedger.decision.BLOCK_CODE, "LEDGER_UNREADABLE");

    const noRef = runCli(repo, { RG_LEDGER_REF: "", RG_CANDIDATE_SHA: base });
    assert.equal(noRef.decision.BLOCK_CODE, "LEDGER_UNREADABLE");
  } finally {
    repo.cleanup();
  }
});

// ---------------------------------------------------------------------------
// The workflow step itself, executed for real (engine extraction trust model)
// ---------------------------------------------------------------------------

function stepBlock(name: string, src = WORKFLOW): string {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.includes(`- name: ${name}`));
  assert.notEqual(start, -1, `step "${name}" must exist`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^      - name: /.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function stepScript(name: string): string {
  const lines = stepBlock(name).split("\n");
  const runIdx = lines.findIndex((l) => l.trim() === "run: |");
  assert.notEqual(runIdx, -1, `step "${name}" must use a run: | block`);
  return lines
    .slice(runIdx + 1)
    .map((l) => (l.startsWith("          ") ? l.slice(10) : ""))
    .join("\n");
}

const GATE_STEP = '"Release policy gate: classify';

function runGateStep(repo: Repo, policyRef: string, candidate: string, inputs: { declared: string; rollout: string; skip?: string }) {
  const temp = mkdtempSync(path.join(tmpdir(), "release-gate-runner-"));
  const githubEnv = path.join(temp, "github_env");
  const githubOutput = path.join(temp, "github_output");
  const summary = path.join(temp, "summary");
  writeFileSync(githubEnv, "");
  const r = spawnSync("bash", ["-e", "-c", stepScript(GATE_STEP)], {
    cwd: repo.dir,
    env: {
      PATH: process.env.PATH ?? "",
      RUNNER_TEMP: temp,
      GITHUB_WORKSPACE: repo.dir,
      GITHUB_ENV: githubEnv,
      GITHUB_OUTPUT: githubOutput,
      GITHUB_STEP_SUMMARY: summary,
      DEPLOYED_SHA: candidate,
      POLICY_REF: policyRef,
      DECLARED_RISK_INPUT: inputs.declared,
      ROLLOUT_INPUT: inputs.rollout,
      SKIP_PROVENANCE_INPUT: inputs.skip ?? "false",
    } as unknown as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  const decision = (() => {
    try {
      return JSON.parse(readFileSync(path.join(temp, "release-policy-decision.json"), "utf8"));
    } catch {
      return null;
    }
  })();
  const env = readFileSync(githubEnv, "utf8");
  rmSync(temp, { recursive: true, force: true });
  return { status: r.status, stdout: r.stdout + r.stderr, decision, env };
}

/** A repo whose base commit carries the REAL engine files from this working tree. */
function repoWithEngine(): { repo: Repo; base: string } {
  const repo = new Repo();
  for (const f of ENGINE_FILES) {
    mkdirSync(path.join(repo.dir, "lib", "ci"), { recursive: true });
    copyFileSync(path.join(here, f), path.join(repo.dir, "lib", "ci", f));
  }
  repo.write("lib/content/a.ts", "export const a = 1;\n");
  return { repo, base: repo.commit("base with engine") };
}

test("the gate step, executed for real, permits a LOW release at 100 and exports FINAL_RISK", () => {
  const { repo, base } = repoWithEngine();
  try {
    repo.write("lib/content/a.ts", "export const a = 2;\n");
    const candidate = repo.commit("low change");
    const policyRef = commitLedgerOnSideBranch(repo, base, base);
    const r = runGateStep(repo, policyRef, candidate, { declared: "LOW", rollout: "100" });
    assert.equal(r.status, 0, r.stdout);
    assert.equal(r.decision.RESULT, "PERMITTED");
    assert.match(r.env, /^FINAL_RISK=LOW$/m);
  } finally {
    repo.cleanup();
  }
});

test("the gate step runs the TRUSTED engine from POLICY_REF, never a candidate-supplied one", () => {
  const { repo, base } = repoWithEngine();
  try {
    // A hostile candidate: replaces the gate CLI with one that always
    // "permits", and makes a HIGH change it wants to ship directly at 100%.
    repo.write(
      "lib/ci/release-gate-cli.ts",
      'import { writeFileSync } from "node:fs";\nwriteFileSync(process.env.RG_DECISION_FILE!, JSON.stringify({ RESULT: "PERMITTED", FINAL_RISK: "LOW" }));\n',
    );
    repo.write("lib/rfq/submit.ts", "export const hostile = true;\n");
    const candidate = repo.commit("hostile candidate");
    const policyRef = commitLedgerOnSideBranch(repo, base, base);
    repo.git("checkout", "-q", candidate); // the workspace IS the candidate, as in the workflow
    const r = runGateStep(repo, policyRef, candidate, { declared: "LOW", rollout: "100" });
    assert.notEqual(r.status, 0, "the hostile candidate must not pass the gate");
    assert.equal(r.decision.BLOCK_CODE, "ROLLOUT_NOT_PERMITTED_FOR_RISK");
    assert.equal(r.decision.FINAL_RISK, "HIGH");
    assert.doesNotMatch(r.env, /FINAL_RISK=/);
  } finally {
    repo.cleanup();
  }
});

test("the gate step does not trust a zero exit alone: no PERMITTED decision record -> the step fails", () => {
  const { repo, base } = repoWithEngine();
  try {
    repo.git("checkout", "-q", "-b", "noop-policy", base);
    repo.write("lib/ci/release-gate-cli.ts", "// a gate that silently does nothing\n");
    repo.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger(ledgerRow(base, "STABLE_100")));
    const policyRef = repo.commit("noop gate");
    const r = runGateStep(repo, policyRef, base, { declared: "LOW", rollout: "100" });
    assert.notEqual(r.status, 0, r.stdout);
    assert.doesNotMatch(r.env, /FINAL_RISK=/);
  } finally {
    repo.cleanup();
  }
});

test("the gate step fails closed when POLICY_REF is not in the object store", () => {
  const { repo, base } = repoWithEngine();
  try {
    const r = runGateStep(repo, "6".repeat(40), base, { declared: "LOW", rollout: "100" });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /RELEASE POLICY GATE FAILED/);
  } finally {
    repo.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Static workflow invariants
// ---------------------------------------------------------------------------

function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

/** Violations of the release-policy-gate shape (empty = compliant); exercised against mutations below. */
function validateReleasePolicyGateShape(content: string): string[] {
  const v: string[] = [];
  const code = withoutComments(content);
  const at = (s: string) => code.indexOf(s);
  const gateAt = at("Release policy gate: classify");
  if (gateAt === -1) return ["the release policy gate step is missing"];
  const gate = stepBlock('"Release policy gate: classify', content);

  if (!/declared_risk:\s*\n[\s\S]*?required: true[\s\S]*?options: \["LOW", "MEDIUM", "HIGH"\]/.test(code)) v.push("declared_risk must be a required LOW/MEDIUM/HIGH input");
  if (!gate.includes("POLICY_REF: ${{ github.sha }}")) v.push("the engine/ledger must come from the workflow's own commit (github.sha)");
  if (!gate.includes('git archive "$POLICY_REF"')) v.push("the engine must be extracted from POLICY_REF with git archive");
  if (!gate.includes('RG_LEDGER_REF="$POLICY_REF"')) v.push("the ledger must be read from POLICY_REF");
  if (!gate.includes('node --experimental-strip-types "$ENGINE_DIR/lib/ci/release-gate-cli.ts"')) v.push("the gate must run the extracted engine CLI");
  if (/\.\/lib\/ci\/|node(?: --experimental-strip-types)? "?lib\/ci\//.test(withoutComments(gate))) {
    v.push("the gate must never run the deploy_ref workspace's copy of the engine");
  }
  if (/^\s*if:/m.test(gate)) v.push("the gate step must be unconditional (no if:)");
  if (/continue-on-error/.test(gate)) v.push("the gate step must never continue-on-error");

  for (const later of ["A1: assert production target", "A2: verify staging provenance", "A3: migration parity gate", "npm ci", "versions upload", "versions deploy"]) {
    if (at(later) === -1 || at(later) < gateAt) v.push(`the gate must run before "${later}"`);
  }
  for (const earlier of ["- name: Checkout deploy_ref", "- name: Resolve deployed SHA"]) {
    if (at(earlier) === -1 || at(earlier) > gateAt) v.push(`the gate must run after "${earlier}"`);
  }
  if (!/fetch-depth: 0/.test(stepBlock("Checkout deploy_ref", content))) v.push("the checkout must fetch full history (fetch-depth: 0) so BASE and POLICY_REF exist");
  return v;
}

test("the real deploy-production.yml carries the release-policy-gate shape", () => {
  assert.deepEqual(validateReleasePolicyGateShape(WORKFLOW), []);
});

test("mutations: removing, conditioning, or re-sourcing the gate is caught", () => {
  const gate = stepBlock('"Release policy gate: classify');
  const mutations: Array<[string, string]> = [
    ["removed", WORKFLOW.replace(gate + "\n", "")],
    ["conditional", WORKFLOW.replace('id: policy_gate\n', "id: policy_gate\n        if: inputs.declared_risk != 'HIGH'\n")],
    ["continue-on-error", WORKFLOW.replace('id: policy_gate\n', "id: policy_gate\n        continue-on-error: true\n")],
    ["engine from candidate", WORKFLOW.replace('node --experimental-strip-types "$ENGINE_DIR/lib/ci/release-gate-cli.ts"', "node --experimental-strip-types ./lib/ci/release-gate-cli.ts")],
    ["policy ref from input", WORKFLOW.replace("POLICY_REF: ${{ github.sha }}", "POLICY_REF: ${{ inputs.deploy_ref }}")],
    ["shallow checkout", WORKFLOW.replace("          fetch-depth: 0\n", "")],
    ["gate after upload", WORKFLOW.replace(gate + "\n", "").replace('      - name: "Phase 2:', `${gate}\n      - name: "Phase 2:`)],
  ];
  for (const [label, mutated] of mutations) {
    assert.notEqual(mutated, WORKFLOW, `${label}: mutation did not apply`);
    assert.ok(validateReleasePolicyGateShape(mutated).length > 0, `${label}: mutation must be caught`);
  }
});

test("24. no classifier bypass: no bypass/override input, no skip flag reaches the classifier", () => {
  const inputsBlock = WORKFLOW.slice(WORKFLOW.indexOf("inputs:"), WORKFLOW.indexOf("concurrency:"));
  const inputNames = [...inputsBlock.matchAll(/^      (\w+):\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(inputNames, [
    "deploy_ref",
    "confirm",
    "declared_risk",
    "rollout_percentage",
    "skip_staging_provenance",
    "expected_current_stable_version_id",
    "expected_current_canary_version_id",
  ]);
  for (const name of inputNames) {
    assert.doesNotMatch(name!, /bypass|override|force|policy|classif|computed|final_risk/, `input "${name}" looks like a policy bypass`);
  }
  const src = readFileSync(path.join(here, "release-gate.ts"), "utf8");
  const inputType = src.slice(src.indexOf("export interface ReleaseGateInput"), src.indexOf("}", src.indexOf("export interface ReleaseGateInput")));
  assert.deepEqual(
    [...inputType.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]),
    ["candidateSha", "declaredRisk", "rolloutPercentage", "skipStagingProvenance"],
    "the gate must accept no override/bypass field",
  );
});

test("25. no self-declared-risk-only behavior: the diff is always classified, whatever is declared", () => {
  for (const declared of ["LOW", "MEDIUM", "HIGH"]) {
    const dp = deps({ diff: HIGH_DIFF });
    const d = evaluateReleaseGate(input({ declaredRisk: declared, rolloutPercentage: "10" }), dp);
    assert.equal(dp.diffCalls.length, 1, declared);
    assert.equal(d.COMPUTED_MINIMUM_RISK, "HIGH", declared);
    assert.equal(d.FINAL_RISK, "HIGH", declared);
  }
});

const REAL_IDENTIFIERS_BLOCKLIST = [
  "f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9",
  "f2202ab5",
  "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed",
  "4a32c5f9",
  "b07d8697-620c-485c-8fed-21b893ab602c",
  "b07d8697",
];

test("26/27. no hardcoded production baseline SHA or real Worker Version ID in the gate, its engine, or its workflow steps", () => {
  const surfaces: Record<string, string> = {
    "release-gate.ts": readFileSync(path.join(here, "release-gate.ts"), "utf8"),
    "release-gate-cli.ts": readFileSync(path.join(here, "release-gate-cli.ts"), "utf8"),
    "release-ledger.ts": readFileSync(path.join(here, "release-ledger.ts"), "utf8"),
    "gate step": stepBlock('"Release policy gate: classify'),
    "audit step": stepBlock("Release policy audit record (always)"),
    "evidence step": stepBlock("Capture production release evidence"),
  };
  for (const [label, text] of Object.entries(surfaces)) {
    const hits = REAL_IDENTIFIERS_BLOCKLIST.filter((id) => text.includes(id));
    assert.deepEqual(hits, [], `${label} hardcodes a real identifier: ${hits.join(", ")}`);
  }
  const gateCode = withoutComments(surfaces["gate step"]!);
  assert.doesNotMatch(gateCode, /\b[0-9a-f]{40}\b/, "the gate step must contain no literal commit SHA");
  assert.doesNotMatch(gateCode, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "the gate step must contain no literal Worker Version ID");

  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const declStart = self.indexOf("const REAL_IDENTIFIERS_BLOCKLIST = [");
  const withoutDecl = self.slice(0, declStart) + self.slice(self.indexOf("];", declStart) + 2);
  assert.deepEqual(REAL_IDENTIFIERS_BLOCKLIST.filter((id) => withoutDecl.includes(id)), [], "this test file must use synthetic identifiers only");
});

test("28. no path classification or baseline resolution reimplemented in YAML/bash", () => {
  const code = withoutComments(WORKFLOW);
  const taxonomyMarkers = [
    "HIGH_RFQ_PATHS",
    "HIGH_RELEASE_PATHS",
    "HIGH_GOVERNANCE_PATHS",
    "migrations_public",
    "lib/security",
    "lib/rfq",
    "lib/odoo",
    "01-sources",
    "PROJECT_OVERRIDES.md",
    "STABLE_100",
    "name-status",
    "RELEASE_SHA",
  ];
  const hits = taxonomyMarkers.filter((m) => code.includes(m));
  assert.deepEqual(hits, [], `deploy-production.yml must not carry classifier/ledger logic; found: ${hits.join(", ")}`);
  assert.equal((code.match(/release-gate-cli\.ts/g) ?? []).length >= 1, true);
});

test("30. the release evidence artifact and the always-run audit artifact both carry the risk data", () => {
  const evidence = stepBlock("Capture production release evidence");
  assert.match(evidence, /--slurpfile policy "\$RUNNER_TEMP\/release-policy-decision\.json"/);
  for (const f of ["final_risk", "declared_risk", "computed_minimum_risk", "base_production_sha", "operation_type", "release_policy: $policy[0]"]) {
    assert.ok(evidence.includes(f), `evidence must include ${f}`);
  }
  const audit = stepBlock("Release policy audit record (always)");
  assert.match(audit, /^\s+if: always\(\)$/m);
  for (const f of REQUIRED_AUDIT_FIELDS) assert.ok(audit.includes(f), `the audit step summary must include ${f}`);
  const upload = stepBlock("Upload release policy audit record");
  assert.match(upload, /^\s+if: always\(\)$/m);
  assert.match(upload, /name: release-policy-audit-\$\{\{ github\.run_id \}\}/);
});

test("33. deploy-production.yml selects no Worker Version by array position", () => {
  assert.doesNotMatch(withoutComments(WORKFLOW), /\.versions\[\d+\]/);
});

test("34. staging provenance is not weakened: A2 log scan intact, HIGH never honors the break-glass", () => {
  const a2 = stepBlock('"A2: verify staging provenance');
  assert.ok(a2.includes('grep -qF "Deploying exact commit: $DEPLOYED_SHA"'));
  assert.ok(a2.includes("STAGING PROVENANCE ASSERTION FAILED"));
  const skipBranches = [...a2.matchAll(/elif \[ "\$SKIP_PROVENANCE" = "true" \]([^\n]*)/g)].map((m) => m[1]!);
  assert.equal(skipBranches.length, 2);
  assert.match(skipBranches[0]!, /\$\{FINAL_RISK:-\}" = "HIGH" \]; then/);
  assert.match(skipBranches[1]!, /-n "\$\{FINAL_RISK:-\}" \]; then/, "the break-glass is honored only after the gate classified the release");
  const highBranch = a2.slice(a2.indexOf(skipBranches[0]!), a2.indexOf(skipBranches[1]!));
  assert.match(highBranch, /exit 1/);
});

test("35/36/37. no D1 mutation, no secret mutation, no environment-protection mutation, no repository write", () => {
  const code = withoutComments(WORKFLOW);
  for (const forbidden of ["migrations apply", "d1 execute", "wrangler secret", "secret put", "secret delete", "secret bulk", "gh secret", "gh variable"]) {
    assert.ok(!code.includes(forbidden), `must not contain "${forbidden}"`);
  }
  for (const line of code.split("\n").filter((l) => l.includes("gh api"))) {
    assert.doesNotMatch(line, /(\s-X\s|--method|\s-f\s|\s-F\s|--field|--raw-field|--input)/, `gh api must stay read-only: ${line.trim()}`);
  }
  assert.doesNotMatch(code, /environments\/[^\s"]*\/(protection|deployment-branch-policies)/);
  assert.doesNotMatch(code, /contents:\s*write/);
  assert.match(code, /permissions:\n  contents: read\n  actions: read\n/);
});
