import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Static safety-net for the verification-only production workflow, a sibling
// of workflow-invariants.test.ts and production-smoke-harness.test.ts.
//
// WHY THIS FILE EXISTS
// --------------------
// `verify-production.yml` is the SECOND workflow permitted to name production
// resources (workflow-invariants.test.ts otherwise forbids that in every
// workflow but deploy-production.yml). It earns that exception only by being
// provably incapable of changing anything: it exists to run the corrected
// smoke gate against the EXISTING 10% canary, because re-dispatching
// deploy-production.yml during a live 10/90 split is unsafe (finding R3,
// docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md §5).
//
// These tests are what makes "verification-only" a checked property rather
// than a claim in a comment. If someone ever adds an upload, a deploy, a
// migration apply, a secret write, a bypass input, or removes the environment
// gate, CI fails here.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const VERIFY_WORKFLOW = "verify-production.yml";
const verifyPath = path.join(workflowsDir, VERIFY_WORKFLOW);

assert.ok(existsSync(verifyPath), `${VERIFY_WORKFLOW} must exist`);
const raw = readFileSync(verifyPath, "utf8");

/** Full-line `#` comments stripped: this workflow's own prose legitimately
 *  names the commands it must never run, while explaining why. */
function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

/**
 * Lines that would EXECUTE something, as opposed to printing it. The smoke
 * suite deliberately echoes a rollback command as human-readable text on
 * failure (it never runs one), so a naive substring scan would false-positive
 * on exactly the safety feature we want to keep.
 */
function executableLines(yaml: string): string[] {
  return withoutComments(yaml)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .filter((l) => !l.startsWith("echo "));
}

const CODE = withoutComments(raw);
const EXEC = executableLines(raw);

/** Mutating commands, matched with boundaries so `wrangler deployments list`
 *  (read-only) is never mistaken for `wrangler deploy`. */
const MUTATING = [
  { re: /wrangler\s+versions\s+upload\b/, label: "wrangler versions upload (creates a Worker version)" },
  { re: /wrangler\s+versions\s+deploy\b/, label: "wrangler versions deploy (moves traffic)" },
  { re: /wrangler\s+deploy(\s|$)/, label: "wrangler deploy (creates a version and moves traffic)" },
  { re: /vinext-cloudflare\s+deploy\b/, label: "vinext-cloudflare deploy" },
  { re: /wrangler\s+triggers\s+deploy\b/, label: "wrangler triggers deploy" },
  { re: /d1\s+migrations\s+apply\b/, label: "d1 migrations apply (mutates D1)" },
  { re: /wrangler\s+d1\s+execute\b/, label: "wrangler d1 execute (mutates D1)" },
  { re: /wrangler\s+secret\b/, label: "wrangler secret (mutates secrets)" },
  { re: /wrangler\s+rollback\b/, label: "wrangler rollback" },
  { re: /wrangler\s+delete\b/, label: "wrangler delete" },
];

test("verify-production.yml cannot call `wrangler versions upload`", () => {
  const hits = EXEC.filter((l) => /wrangler\s+versions\s+upload\b/.test(l));
  assert.deepEqual(hits, [], "a verification-only workflow must never create a Worker version");
});

test("verify-production.yml cannot call `wrangler versions deploy`", () => {
  const hits = EXEC.filter((l) => /wrangler\s+versions\s+deploy\b/.test(l));
  assert.deepEqual(
    hits,
    [],
    "a verification-only workflow must never deploy a version. (The smoke suite's echoed " +
      "rollback hint is text, not execution, and is excluded by executableLines().)",
  );
});

test("verify-production.yml cannot change traffic by any known command", () => {
  const hits: string[] = [];
  for (const { re, label } of MUTATING) {
    for (const line of EXEC) if (re.test(line)) hits.push(`${label} :: ${line}`);
  }
  assert.deepEqual(hits, [], `verify-production.yml must issue no mutating command; found:\n${hits.join("\n")}`);
});

test("verify-production.yml cannot apply D1 migrations", () => {
  assert.ok(
    !EXEC.some((l) => /migrations\s+apply\b/.test(l)),
    "verification must never apply a migration",
  );
  // The only D1 commands present must be the read-only listing.
  const d1Lines = EXEC.filter((l) => /wrangler\s+d1\b/.test(l));
  assert.ok(d1Lines.length > 0, "the workflow should still verify D1 migration parity");
  for (const line of d1Lines) {
    assert.match(
      line,
      /wrangler\s+d1\s+migrations\s+list\b/,
      `the only permitted D1 command is \`d1 migrations list\`; found: ${line}`,
    );
  }
});

test("verify-production.yml exposes no skip/bypass input", () => {
  const inputsBlock = CODE.slice(CODE.indexOf("inputs:"), CODE.indexOf("concurrency:"));
  for (const forbidden of ["skip_", "bypass", "force", "override", "allow_"]) {
    assert.ok(
      !inputsBlock.toLowerCase().includes(forbidden),
      `workflow_dispatch inputs must expose no "${forbidden}" escape hatch — there must be ` +
        "nothing an operator can type that relaxes an assertion",
    );
  }
  // And no provenance-bypass anywhere in the file.
  assert.ok(
    !/skip_staging_provenance/.test(CODE),
    "verification must not carry the deploy workflow's provenance break-glass flag",
  );
});

test("verify-production.yml requires the production Environment approval", () => {
  assert.match(
    CODE,
    /^\s*environment:\s*production\s*$/m,
    "the job must target `environment: production` so GitHub's required reviewer still gates it",
  );
});

test("verify-production.yml is workflow_dispatch-only", () => {
  const onBlock = CODE.slice(CODE.indexOf("\non:"), CODE.indexOf("concurrency:"));
  assert.ok(onBlock.includes("workflow_dispatch:"), "must be dispatchable");
  for (const trigger of ["push:", "pull_request:", "schedule:", "repository_dispatch:", "workflow_call:", "workflow_run:"]) {
    assert.ok(
      !onBlock.includes(trigger),
      `verification must never fire automatically — found trigger "${trigger}"`,
    );
  }
});

test("verify-production.yml never requests write permissions", () => {
  assert.ok(!/contents:\s*write/.test(CODE), "must never be granted contents: write");
  assert.ok(!/permissions:\s*write-all/.test(CODE), "must never be granted write-all");
  assert.match(CODE, /permissions:\s*\n\s*contents:\s*read\s*\n\s*actions:\s*read/, "permissions must be read-only");
});

test("verify-production.yml asserts the 10/90 baseline before smoking, and re-asserts after", () => {
  // Baseline must come before the smoke step, and the post-verify check after.
  const baselineAt = CODE.indexOf("V3: assert live deployment baseline");
  const smokeAt = CODE.indexOf("- name: Production smoke checks");
  const postAt = CODE.indexOf("V5: post-verify");
  assert.ok(baselineAt > -1 && smokeAt > -1 && postAt > -1, "all three stages must exist");
  assert.ok(baselineAt < smokeAt, "the baseline assertion must run BEFORE the smoke suite");
  assert.ok(smokeAt < postAt, "the post-verify assertion must run AFTER the smoke suite");
});

test("verify-production.yml selects versions by id, never by array position", () => {
  // Finding R3: `.versions[0]` is the positional read that makes a re-dispatch
  // unsafe during a canary. This workflow must never repeat it.
  assert.ok(
    !/\.versions\[0\]/.test(CODE),
    "verification must not read `.versions[0]` — match versions by version_id and check " +
      "their percentages explicitly (docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md §5.4)",
  );
  assert.ok(
    CODE.includes('select(.version_id == $v)'),
    "version lookup must be by id",
  );
});

test("verify-production.yml takes no operator-supplied deploy ref and checks out no arbitrary ref", () => {
  const inputsBlock = CODE.slice(CODE.indexOf("inputs:"), CODE.indexOf("concurrency:"));
  assert.ok(!inputsBlock.includes("deploy_ref"), "verification must expose no deploy_ref input");
  // The checkout must not pass a `ref:` — it uses the workflow's own commit.
  const checkoutAt = CODE.indexOf("actions/checkout@v4");
  assert.ok(checkoutAt > -1, "a checkout is expected (for wrangler.jsonc and migrations/)");
  const checkoutBlock = CODE.slice(checkoutAt, checkoutAt + 220);
  assert.ok(!/^\s+ref:/m.test(checkoutBlock), "checkout must not take a ref — never an operator-supplied or release ref");
  assert.ok(checkoutBlock.includes("persist-credentials: false"), "checkout must not persist credentials");
});

test("verify-production.yml pins the Cloudflare environment in the workflow, not in an input", () => {
  const inputsBlock = CODE.slice(CODE.indexOf("inputs:"), CODE.indexOf("concurrency:"));
  // Check the input NAMES, not the surrounding prose: a description may
  // legitimately say "Worker Version ID" while exposing no Cloudflare target.
  const inputNames = inputsBlock
    .split("\n")
    .map((l) => l.match(/^ {6}([A-Za-z0-9_]+):\s*$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1].toLowerCase());
  assert.ok(inputNames.length > 0, "the workflow must declare named dispatch inputs");
  for (const forbidden of ["database_id", "worker", "account", "env"]) {
    const offending = inputNames.filter((n) => n.includes(forbidden));
    assert.deepEqual(
      offending,
      [],
      `workflow_dispatch inputs must not expose "${forbidden}" as an operator-supplied Cloudflare target`,
    );
  }
  assert.ok(CODE.includes("--env production"), "the Cloudflare environment must be pinned in the workflow itself");
});

test("verify-production.yml remains verification-only end to end", () => {
  // A compact restatement of the whole contract, so a reviewer reading one
  // assertion sees the property being guaranteed.
  const violations: string[] = [];
  for (const { re, label } of MUTATING) if (EXEC.some((l) => re.test(l))) violations.push(label);
  if (!/^\s*environment:\s*production\s*$/m.test(CODE)) violations.push("lost its production Environment gate");
  if (/contents:\s*write/.test(CODE)) violations.push("gained contents: write");
  if (/\bon:\s*[\s\S]*?\n\s*push:/.test(CODE)) violations.push("gained an automatic trigger");
  assert.deepEqual(violations, [], `verify-production.yml must stay verification-only; found: ${violations.join(", ")}`);
});
