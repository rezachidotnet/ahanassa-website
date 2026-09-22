import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

// Static + executed safety-net for promote-production.yml
// (docs/release/RELEASE_POLICY.md §11, docs/release/
// PROMOTE_PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md), sibling of
// workflow-invariants.test.ts, verify-production-workflow.test.ts, and
// production-version-role-discovery.test.ts — same two-part discipline:
// (1) a shape-validation function exercised against both the real file and
// mutated copies of it, so every claim below is a checked property, not a
// comment; (2) the position-independent topology/post-promotion logic is
// extracted verbatim and EXECUTED under the real `bash -e` GitHub uses,
// fed synthetic fixture JSON — never a real Worker Version ID, SHA, run ID,
// or deployment ID (RELEASE_POLICY.md §14).

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const PROMOTE_WORKFLOW = "promote-production.yml";
const promotePath = path.join(workflowsDir, PROMOTE_WORKFLOW);

assert.ok(existsSync(promotePath), `${PROMOTE_WORKFLOW} must exist`);
const RAW = readFileSync(promotePath, "utf8");

function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

/** Lines that would EXECUTE something, as opposed to printing it. */
function executableLines(yaml: string): string[] {
  return withoutComments(yaml)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .filter((l) => !l.startsWith("echo "));
}

// ---------------------------------------------------------------------------
// Shape validation — a list of violation strings, empty = compliant. Mirrors
// validateProductionDeploySafetyShape / validateStagingReleaseHardeningShape
// in workflow-invariants.test.ts.
// ---------------------------------------------------------------------------

function validatePromoteProductionWorkflowShape(content: string): string[] {
  const violations: string[] = [];
  const code = withoutComments(content);
  const exec = executableLines(content);

  // 1. workflow_dispatch only.
  if (!/^\s*workflow_dispatch:\s*$/m.test(code)) violations.push("must trigger on workflow_dispatch");
  if (/^\s*push:\s*$/m.test(code)) violations.push("must not trigger on push");
  if (/^\s*pull_request:\s*$/m.test(code)) violations.push("must not trigger on pull_request");
  if (/^\s*schedule:\s*$/m.test(code)) violations.push("must not trigger on a schedule");

  // 2. production Environment required.
  if (!/environment:\s*production\b/.test(code)) violations.push("must target environment: production");

  // 3. exact confirmation literal.
  if (!code.includes('"promote-production"')) violations.push('must require the exact confirmation literal "promote-production"');
  if (!/CONFIRM_INPUT.*!=.*promote-production/.test(code.replace(/\s+/g, " "))) {
    violations.push("must compare the confirm input against the exact literal and fail closed on mismatch");
  }

  // 4. malformed SHA rejected.
  if (!code.includes("[0-9a-f]{40}")) violations.push("must require release_sha to be a full 40-character hexadecimal SHA");

  // 5. malformed Worker Version ID rejected.
  const uuidReCount = (code.match(/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/g) ?? []).length;
  if (uuidReCount === 0) violations.push("must validate canary_version_id/stable_version_id against a Worker Version UUID shape");

  // 6/7. observation fields required, end >= start.
  if (!code.includes("OBS_OWNER_INPUT")) violations.push("must require a non-empty observation_owner");
  if (!/date -u -d "\$OBS_STARTED_INPUT"/.test(code)) violations.push("must parse observation_started_at");
  if (!/date -u -d "\$OBS_ENDED_INPUT"/.test(code)) violations.push("must parse observation_ended_at");
  if (!/ENDED_EPOCH.*-lt.*STARTED_EPOCH/.test(code)) violations.push("must reject observation_ended_at before observation_started_at");

  // 8. invalid attestation rejected.
  if (!code.includes("OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE")) {
    violations.push('must require the exact observation_attestation literal "OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE"');
  }

  // 9/10. evidence binding — canary/stable never trusted merely because well-formed.
  if (!code.includes("new_version_id")) violations.push("must bind canary_version_id against a recorded release evidence artifact's new_version_id");
  if (!/EV_PREV.*!=.*STABLE_INPUT/.test(code)) violations.push("must bind stable_version_id against the release evidence's recorded previous_version_id");

  // 11/12. verification run binding.
  if (!code.includes("VERIFY_WORKFLOW_ID=363097410")) violations.push("must bind verification_run_id to the real Verify Production workflow id");
  if (!/RUN_CONCLUSION.*!=.*success/.test(code)) violations.push("must require the verification run to have concluded 'success'");
  if (!/EV_SHA.*!=.*SHA_INPUT/.test(code) || !code.includes("EV_CANARY")) {
    violations.push("must bind the verification evidence's release_sha/canary/stable back to the promotion inputs");
  }

  // 13. missing staging provenance rejected.
  if (!/EV_STAGING.*SKIPPED/.test(code)) violations.push('must reject a release with no real staging provenance ("SKIPPED" or empty)');

  // 14. failed official verification rejected.
  if (!/PASSED\*/.test(code)) violations.push("must require the verification evidence's smoke_result to start with PASSED");

  // 19-26 and topology/post-promotion markers exist (execution-tested
  // separately) — checked against the RAW content: the markers live in
  // `#`-comments, which withoutComments() strips from `code`.
  if (!content.includes("TOPOLOGY CHECK START") || !content.includes("TOPOLOGY CHECK END")) {
    violations.push("must carry an extractable TOPOLOGY CHECK block");
  }
  if (!content.includes("POST-PROMOTION CHECK START") || !content.includes("POST-PROMOTION CHECK END")) {
    violations.push("must carry an extractable POST-PROMOTION CHECK block");
  }

  // 22. `.versions[0]` / `.versions[1]` prohibited anywhere.
  if (/\.versions\[0\]/.test(code) || /\.versions\[1\]/.test(code)) {
    violations.push("must never select a version by array position (.versions[0]/.versions[1])");
  }

  // 23/24. zero-upload / zero-build guarantee.
  if (/wrangler\s+versions\s+upload\b/.test(exec.join("\n"))) violations.push("must never call wrangler versions upload");
  if (/vinext-cloudflare\s+deploy\b/.test(exec.join("\n"))) violations.push("must never call vinext-cloudflare deploy");
  if (/\bwrangler\s+deploy\b/.test(exec.join("\n").replace(/wrangler\s+versions\s+deploy/g, ""))) {
    violations.push("must never call a bare wrangler deploy");
  }
  if (exec.some((l) => /\bnpm\s+ci\b/.test(l))) violations.push("must never run npm ci (no build)");
  if (exec.some((l) => /\bnpm\s+run\s+build\b/.test(l))) violations.push("must never run npm run build (no build)");
  if (exec.some((l) => /\bvinext\s+build\b/.test(l))) violations.push("must never run vinext build (no build)");

  // 25. promotion targets the existing canary at 100, single spec.
  if (!/wrangler versions deploy "\$CANARY_INPUT@100"/.test(code)) {
    violations.push("must deploy exactly canary_version_id@100 as a single version-spec");
  }

  // 26. rollback target remains the original stable version.
  if (!/rollback_version_id:\s*\$\{\{\s*inputs\.stable_version_id\s*\}\}/.test(code)) {
    violations.push("must expose rollback_version_id as stable_version_id in job outputs");
  }
  if (!/"rollback_version_id":\s*"\$STABLE_INPUT"/.test(code)) {
    violations.push("must record rollback_version_id=stable_version_id in the promotion evidence payload");
  }

  // 29/30. D1 mutation / migration-apply prohibited.
  if (exec.some((l) => /d1\s+migrations\s+apply\b/.test(l))) violations.push("must never apply a D1 migration");
  if (exec.some((l) => /wrangler\s+d1\s+execute\b/.test(l))) violations.push("must never execute a raw D1 statement");

  // 31. secrets mutation prohibited — only `wrangler secret list` (read) is allowed.
  if (exec.some((l) => /wrangler\s+secret\s+(put|bulk|delete)\b/.test(l))) violations.push("must never mutate a secret");

  // 32. environment-protection mutation prohibited.
  if (exec.some((l) => /environments\/production["']?\s.*(-X\s*(PATCH|PUT|DELETE)|--method\s+(PATCH|PUT|DELETE))/.test(l))) {
    violations.push("must never mutate the production GitHub Environment's configuration");
  }

  // 33. smoke gate remains blocking — no skip input, unconditional step.
  if (/\bskip_\w+|bypass|break[- ]glass/i.test(code)) violations.push("must expose no bypass/skip-verification/break-glass input");
  if (!code.includes('if [ "$FAILURES" -gt 0 ]; then\n            echo "::error::$FAILURES production smoke')) {
    violations.push("the smoke suite must fail closed on the actual failure branch (exit non-zero after reporting failed checks)");
  }

  // 34. ledger evidence payload contains STABLE_100 data.
  if (!code.includes('"release_state": "STABLE_100"')) violations.push('promotion evidence must record release_state=STABLE_100');
  if (!code.includes('"final_traffic_percent": 100')) violations.push("promotion evidence must record final_traffic_percent=100");
  if (!code.includes("| STABLE_100 | 100 |")) violations.push("the job-summary ledger row must show RELEASE_STATE=STABLE_100 and FINAL_TRAFFIC_PERCENT=100");

  // No contents: write, ever.
  if (/contents:\s*write/.test(code)) violations.push("must never declare permissions: contents: write");

  return violations;
}

test("promote-production.yml carries the required shape (all static checks)", () => {
  const violations = validatePromoteProductionWorkflowShape(RAW);
  assert.deepEqual(violations, [], `promote-production.yml violates the required shape: ${violations.join("; ")}`);
});

test("mutation: the fixture itself is unused — sanity-checking the real file is enough (shape function proven by the mutation tests below)", () => {
  assert.deepEqual(validatePromoteProductionWorkflowShape(RAW), []);
});

// --- targeted mutation tests -------------------------------------------------

test("mutation: removing the confirm literal check fails the shape check", () => {
  const mutated = RAW.replaceAll('"promote-production"', "REMOVED");
  assert.ok(validatePromoteProductionWorkflowShape(mutated).length > 0);
});

test("mutation: removing the SHA format requirement fails the shape check", () => {
  const mutated = RAW.replace("[0-9a-f]{40}", "REMOVED");
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("40-character")));
});

test("mutation: removing the observation-end-before-start check fails the shape check", () => {
  const mutated = RAW.replace(
    'if [ "$ENDED_EPOCH" -lt "$STARTED_EPOCH" ]; then',
    'if false; then',
  );
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("observation_ended_at before")));
});

test("mutation: removing the attestation literal fails the shape check", () => {
  const mutated = RAW.replaceAll("OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE", "REMOVED");
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("observation_attestation")));
});

test("mutation: weakening the verification workflow-id binding fails the shape check", () => {
  const mutated = RAW.replace("VERIFY_WORKFLOW_ID=363097410", "VERIFY_WORKFLOW_ID=0");
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("Verify Production workflow id")));
});

test("mutation: reintroducing `.versions[0]` fails the shape check", () => {
  const mutated = `${RAW}\n# test: jq '.versions[0]'`.replace(
    "# test: jq '.versions[0]'",
    "        JQ='.versions[0]'",
  );
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("array position")));
});

test("mutation: reintroducing wrangler versions upload fails the shape check", () => {
  const mutated = RAW.replace(
    'npx wrangler versions deploy "$CANARY_INPUT@100" \\',
    'npx wrangler versions upload --config wrangler.jsonc\n          npx wrangler versions deploy "$CANARY_INPUT@100" \\',
  );
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("versions upload")));
});

test("mutation: adding npm ci fails the shape check (no build)", () => {
  const mutated = RAW.replace(
    'npx wrangler versions deploy "$CANARY_INPUT@100" \\',
    'npm ci\n          npx wrangler versions deploy "$CANARY_INPUT@100" \\',
  );
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("npm ci")));
});

test("mutation: adding a wrangler secret put call fails the shape check", () => {
  const mutated = RAW.replace(
    'npx wrangler versions deploy "$CANARY_INPUT@100" \\',
    'npx wrangler secret put SOME_SECRET --config wrangler.jsonc\n          npx wrangler versions deploy "$CANARY_INPUT@100" \\',
  );
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("mutate a secret")));
});

test("mutation: adding a d1 migrations apply call fails the shape check", () => {
  const mutated = `${RAW}\n        run: npx wrangler d1 migrations apply DB_OPS --env production --remote\n`;
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("D1 migration")));
});

test("mutation: introducing a skip/bypass-sounding input fails the shape check", () => {
  const mutated = RAW.replace("confirm:", "skip_verification:\n      confirm:");
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("bypass")));
});

test("mutation: weakening the smoke gate's exit-on-failure fails the shape check", () => {
  const mutated = RAW.replace('if [ "$FAILURES" -gt 0 ]; then\n            echo "::error::$FAILURES production smoke', 'if false; then\n            echo "::error::$FAILURES production smoke');
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("fail closed")));
});

test("mutation: removing STABLE_100 from the evidence payload fails the shape check", () => {
  const mutated = RAW.replace('"release_state": "STABLE_100"', '"release_state": "UNKNOWN"');
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("STABLE_100")));
});

test("mutation: granting contents: write fails the shape check", () => {
  const mutated = RAW.replace("permissions:\n  contents: read\n  actions: read", "permissions:\n  contents: write\n  actions: read");
  const violations = validatePromoteProductionWorkflowShape(mutated);
  assert.ok(violations.some((v) => v.includes("contents: write")));
});

// ---------------------------------------------------------------------------
// Extraction helpers for the two dynamic blocks — same technique as
// production-version-role-discovery.test.ts: pull the step's `run: |` body,
// slice the marker-delimited pure-logic portion, execute under real `bash -e`.
// ---------------------------------------------------------------------------

function extractStepBody(stepNameSubstring: string): string {
  const lines = RAW.split("\n");
  const stepIdx = lines.findIndex((l) => l.includes(stepNameSubstring));
  assert.notEqual(stepIdx, -1, `step containing "${stepNameSubstring}" must exist`);
  const runIdx = lines.findIndex((l, i) => i > stepIdx && l.trim() === "run: |");
  assert.notEqual(runIdx, -1, "the step must use a `run: |` block scalar");
  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() !== "" && !line.startsWith("          ")) break;
    body.push(line.startsWith("          ") ? line.slice(10) : "");
  }
  return body.join("\n");
}

function sliceBetween(script: string, startMarker: string, endMarker: string): string {
  const lines = script.split("\n");
  const start = lines.findIndex((l) => l.includes(startMarker));
  const end = lines.findIndex((l, i) => i > start && l.includes(endMarker));
  assert.notEqual(start, -1, `script must contain marker: ${startMarker}`);
  assert.notEqual(end, -1, `script must contain marker: ${endMarker}`);
  return lines.slice(start, end + 1).join("\n");
}

const TOPOLOGY_CHECK = sliceBetween(extractStepBody("Assert live production topology"), "TOPOLOGY CHECK START", "TOPOLOGY CHECK END");
const POST_PROMOTION_CHECK = sliceBetween(extractStepBody("Post-promotion verification"), "POST-PROMOTION CHECK START", "POST-PROMOTION CHECK END");

interface Version {
  version_id: string;
  percentage: number;
}

function deploymentFixture(versions: Version[]) {
  return { id: "fixture-deployment", source: "wrangler", strategy: "percentage", versions, created_on: "2026-01-01T00:00:00.000000Z" };
}

function runExtracted(
  script: string,
  latestDeployment: unknown,
  env: Record<string, string>,
): { status: number; stdout: string; stderr: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "promote-check-"));
  try {
    const fixtureKey = script === TOPOLOGY_CHECK ? "latest-before.json" : "latest-after.json";
    writeFileSync(path.join(dir, fixtureKey), JSON.stringify(latestDeployment));
    const scriptPath = path.join(dir, "check.sh");
    writeFileSync(scriptPath, `set -euo pipefail\n${script}\necho "HARNESS_DONE=1"`);
    const res = spawnSync("bash", ["-e", scriptPath], {
      encoding: "utf8",
      env: { ...process.env, RUNNER_TEMP: dir, ...env },
    });
    return { status: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SYN_CANARY = "syn-canary-0000-0000-0000-000000000001";
const SYN_STABLE = "syn-stable-0000-0000-0000-000000000002";
const SYN_THIRD = "syn-unknown-0000-0000-0000-000000000003";

// --- 15/16. live expected topology accepted, position-independent ----------

test("15. TOPOLOGY CHECK: live expected 10/90 topology is accepted", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 10 }, { version_id: SYN_STABLE, percentage: 90 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
});

test("16. TOPOLOGY CHECK: reversed JSON order yields the same accepted result", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_STABLE, percentage: 90 }, { version_id: SYN_CANARY, percentage: 10 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
});

test("17. TOPOLOGY CHECK: an unexpected third traffic-bearing version is rejected", () => {
  const r = runExtracted(
    TOPOLOGY_CHECK,
    deploymentFixture([
      { version_id: SYN_CANARY, percentage: 10 },
      { version_id: SYN_STABLE, percentage: 40 },
      { version_id: SYN_THIRD, percentage: 50 },
    ]),
    { CANARY_INPUT: SYN_CANARY, STABLE_INPUT: SYN_STABLE, CANARY_PCT_INPUT: "10", STABLE_PCT_INPUT: "90" },
  );
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /TOPOLOGY ASSERTION FAILED/);
});

test("18. TOPOLOGY CHECK: a traffic total that does not sum to 100 is rejected", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 10 }, { version_id: SYN_STABLE, percentage: 95 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "95",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /TOPOLOGY ASSERTION FAILED/);
});

test("19. TOPOLOGY CHECK: missing canary_version_id in the live deployment is rejected", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_THIRD, percentage: 10 }, { version_id: SYN_STABLE, percentage: 90 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /canary_version_id .* is not receiving traffic/);
});

test("20. TOPOLOGY CHECK: missing stable_version_id in the live deployment is rejected", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 10 }, { version_id: SYN_THIRD, percentage: 90 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /stable_version_id .* is not receiving traffic/);
});

test("21. TOPOLOGY CHECK: an unknown version receiving traffic (canary present, stable absent) is rejected", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 10 }, { version_id: SYN_THIRD, percentage: 90 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.notEqual(r.status, 0);
});

test("TOPOLOGY CHECK: exactly one live version (already fully promoted or unrecognized) fails closed, never guesses", () => {
  const r = runExtracted(TOPOLOGY_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 100 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
    CANARY_PCT_INPUT: "10",
    STABLE_PCT_INPUT: "90",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /expected exactly 2/);
});

test("TOPOLOGY CHECK never inspects .versions[0]/.versions[1] — matches purely by version_id", () => {
  assert.doesNotMatch(TOPOLOGY_CHECK, /\.versions\[0\]/);
  assert.doesNotMatch(TOPOLOGY_CHECK, /\.versions\[1\]/);
});

// --- 27/28. post-promotion state -------------------------------------------

test("27. POST-PROMOTION CHECK: a 100/0 post-state is accepted", () => {
  const r = runExtracted(POST_PROMOTION_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 100 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
  });
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
});

test("27b. POST-PROMOTION CHECK: canary@100 with stable still explicitly listed at 0% is accepted", () => {
  const r = runExtracted(POST_PROMOTION_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 100 }, { version_id: SYN_STABLE, percentage: 0 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
  });
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
});

test("28. POST-PROMOTION CHECK: a wrong post-state (canary not at 100%) is rejected", () => {
  const r = runExtracted(POST_PROMOTION_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 90 }, { version_id: SYN_STABLE, percentage: 10 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /POST-PROMOTION ASSERTION FAILED/);
});

test("28b. POST-PROMOTION CHECK: stable still receiving traffic after promotion is rejected", () => {
  const r = runExtracted(POST_PROMOTION_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 100 }, { version_id: SYN_STABLE, percentage: 10 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
  });
  // Cloudflare's own percentages cannot exceed 100 in total; this fixture is
  // deliberately malformed (110%) to prove the check does not silently
  // accept an impossible-but-unfiltered live response.
  assert.notEqual(r.status, 0);
});

test("28c. POST-PROMOTION CHECK: an unexpected third version receiving traffic post-promotion is rejected", () => {
  const r = runExtracted(POST_PROMOTION_CHECK, deploymentFixture([{ version_id: SYN_CANARY, percentage: 90 }, { version_id: SYN_THIRD, percentage: 10 }]), {
    CANARY_INPUT: SYN_CANARY,
    STABLE_INPUT: SYN_STABLE,
  });
  assert.notEqual(r.status, 0);
});

// --- 35. no real identifiers hardcoded --------------------------------------

const REAL_IDENTIFIERS_BLOCKLIST = [
  "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed",
  "b07d8697-620c-485c-8fed-21b893ab602c",
  "f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9",
  "35533626395",
  "35567845828",
  "35532624537",
];

test("35. promote-production.yml hardcodes no real release SHA/Worker Version ID/run ID/deployment ID", () => {
  // Excludes the embedded "Production smoke checks" step's own body: that
  // block is a byte-identical copy of deploy-production.yml's (enforced by
  // production-smoke-harness.test.ts), which legitimately documents, in its
  // own comments, the real historical run id of the incident that fixed the
  // S5 empty-catalog bug — accepted historical evidence (RELEASE_POLICY.md
  // §14), not a live identifier this workflow depends on.
  const stepIdx = RAW.indexOf("- name: Production smoke checks");
  assert.notEqual(stepIdx, -1, "the smoke checks step must exist");
  const withoutSmokeStep = RAW.slice(0, stepIdx) + RAW.slice(RAW.indexOf("- name: Capture promotion evidence"));
  const hits = REAL_IDENTIFIERS_BLOCKLIST.filter((id) => withoutSmokeStep.includes(id));
  assert.deepEqual(hits, [], `promote-production.yml must never hardcode a real release identifier outside the byte-identical smoke script; found: ${hits.join(", ")}`);
});

test("35b. this test file's fixtures/assertions use no real release identifier (synthetic fixtures only)", () => {
  // Excludes the blocklist's own declaration further down this file, which
  // must obviously name the strings it is checking for.
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const declStart = self.indexOf("const REAL_IDENTIFIERS_BLOCKLIST = [");
  const declEnd = self.indexOf("];", declStart) + 2;
  const withoutDeclaration = self.slice(0, declStart) + self.slice(declEnd);
  const hits = REAL_IDENTIFIERS_BLOCKLIST.filter((id) => withoutDeclaration.includes(id));
  assert.deepEqual(hits, [], `this test file must use only synthetic fixture identifiers outside the blocklist declaration; found: ${hits.join(", ")}`);
});

test("promote-production.yml declares no repository-write permission", () => {
  assert.doesNotMatch(withoutComments(RAW), /contents:\s*write/);
});

test("promote-production.yml exposes an observation_attestation input with no default (must be explicitly supplied every time)", () => {
  const idx = RAW.indexOf("observation_attestation:");
  const nextInputIdx = RAW.indexOf("\n      observation", idx + 1);
  const block = RAW.slice(idx, nextInputIdx === -1 ? idx + 400 : nextInputIdx);
  assert.doesNotMatch(block, /default:/, "observation_attestation must never have a default value");
});

// ---------------------------------------------------------------------------
// 36. REGRESSION — the verification-evidence artifact lookup.
//
// The first real promotion attempt failed closed at the
// "Bind verification_run_id ..." step with gh's argument-parser error
// `accepts 1 arg(s), received 4`, because the lookup passed jq's `--arg`
// flag to `gh api`. `gh api` accepts exactly one positional (the endpoint)
// and has no `--arg` of its own, so `--jq` swallowed the literal string
// "--arg" as its query and the remaining three tokens became extra
// positionals. The step aborted under `set -e` BEFORE its own
// `if [ -z "$ARTIFACT_ID" ]` branch could produce a legible error, so a
// pure CLI-usage defect surfaced as an opaque failure.
//
// Production was never mutated (the step runs long before any traffic
// shift), so this is a fail-closed defect, not a safety hole — but it is
// exactly the class of defect a static-only test suite misses: the shape
// checks all passed on the defective file.
//
// Two independent nets below:
//   (a) a static guard — no `gh api` invocation anywhere in the workflow may
//       carry `--arg`, with a mutation test proving the guard bites;
//   (b) an executed test — the marker-delimited lookup block is run under
//       real `bash -e` with real `jq` against a stub `gh` that models the
//       real CLI's contract (one positional, `--jq` takes one value, no
//       `--arg`). The defective form fails under that stub; the shipped
//       form resolves the artifact id.
// ---------------------------------------------------------------------------

/** `gh api` calls, normalized to one line each, comments excluded. */
function ghApiInvocations(yaml: string): string[] {
  return withoutComments(yaml)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("gh api"));
}

test("36a. no `gh api` invocation passes jq's --arg flag (gh api has no --arg; it aborts with 'accepts 1 arg(s)')", () => {
  const offenders = ghApiInvocations(RAW).filter((l) => /gh api\b[^|]*--arg\b/.test(l));
  assert.deepEqual(
    offenders,
    [],
    `--arg is a jq flag, not a gh flag. Pipe gh api's JSON into a real jq --arg instead. Offending line(s):\n${offenders.join("\n")}`,
  );
});

test("36b. mutation: reintroducing `gh api ... --jq --arg` is caught by the 36a guard", () => {
  const mutated = RAW.replace(
    /ARTIFACT_ID="\$\(jq -r --arg n /,
    'ARTIFACT_ID="$(gh api "repos/o/r/actions/runs/$VERIFY_RUN_INPUT/artifacts" --jq --arg n ',
  );
  assert.notEqual(mutated, RAW, "the mutation must actually change the file");
  const offenders = ghApiInvocations(mutated).filter((l) => /gh api\b[^|]*--arg\b/.test(l));
  assert.notEqual(offenders.length, 0, "the guard must reject a reintroduced `gh api ... --arg`");
});

test("36c. the verification-artifact lookup is extractable and still passes the name as a jq --arg (never interpolated into the jq program)", () => {
  const block = sliceBetween(
    extractStepBody("Bind verification_run_id"),
    "VERIFY ARTIFACT LOOKUP START",
    "VERIFY ARTIFACT LOOKUP END",
  );
  assert.match(block, /jq -r --arg n "production-verification-evidence-\$VERIFY_RUN_INPUT"/);
  assert.match(block, /select\(\.name == \$n and \.expired == false\)/, "must still match the exact name AND reject expired artifacts");
  // Line-scoped and comment-excluded: the block's own explanatory comment
  // quotes the defective `gh api ... --jq --arg` form on purpose, and a
  // whole-block regex would otherwise span the gh line and the jq line.
  assert.deepEqual(
    ghApiInvocations(block).filter((l) => /gh api\b[^|]*--arg\b/.test(l)),
    [],
    "the artifact lookup's gh api call must carry no --arg",
  );
});

/**
 * Runs the extracted lookup block under real `bash -e` with real `jq`, and a
 * stub `gh` on PATH that models the real CLI's argument contract. Returns the
 * resolved ARTIFACT_ID (echoed by the harness) plus status/output.
 */
function runArtifactLookup(
  script: string,
  opts: { artifactsJson?: unknown; ghFails?: boolean; verifyRunInput?: string },
): { status: number; stdout: string; artifactId: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "promote-artifact-lookup-"));
  try {
    writeFileSync(path.join(dir, "artifacts-response.json"), JSON.stringify(opts.artifactsJson ?? { artifacts: [] }));

    // Stub `gh`: reproduces the real CLI's contract faithfully enough to
    // expose this defect — `--jq`/`-q` and `--method` consume exactly one
    // value, there is NO `--arg` flag, and more than one positional after
    // the subcommand is a usage error with gh's own wording.
    const ghStub = [
      "#!/usr/bin/env bash",
      "set -uo pipefail",
      'if [ "${1:-}" != "api" ]; then echo "unknown command" >&2; exit 1; fi',
      "shift",
      "positionals=()",
      "while [ $# -gt 0 ]; do",
      '  case "$1" in',
      "    --jq|-q|--method|-X|--template|-t|-H|--header|-f|-F) shift 2 ;;",
      '    --*|-*) shift ;;',
      '    *) positionals+=("$1"); shift ;;',
      "  esac",
      "done",
      'if [ "${#positionals[@]}" -ne 1 ]; then',
      '  echo "accepts 1 arg(s), received ${#positionals[@]}" >&2',
      "  exit 1",
      "fi",
      opts.ghFails ? 'echo "gh: HTTP 404: Not Found" >&2; exit 1' : `cat "${path.join(dir, "artifacts-response.json")}"`,
      "",
    ].join("\n");

    writeFileSync(path.join(dir, "gh"), ghStub, { mode: 0o755 });

    const scriptPath = path.join(dir, "lookup.sh");
    writeFileSync(scriptPath, `set -euo pipefail\n${script}\necho "RESOLVED_ARTIFACT_ID=$ARTIFACT_ID"`);
    const res = spawnSync("bash", ["-e", scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH ?? ""}`,
        RUNNER_TEMP: dir,
        VERIFY_RUN_INPUT: opts.verifyRunInput ?? SYN_VERIFY_RUN,
      },
    });
    const stdout = res.stdout ?? "";
    const m = stdout.match(/RESOLVED_ARTIFACT_ID=(.*)/);
    return { status: res.status ?? -1, stdout: stdout + (res.stderr ?? ""), artifactId: m ? m[1].trim() : "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SYN_VERIFY_RUN = "90000000001";
const SYN_ARTIFACT_ID = "7000000001";

const VERIFY_ARTIFACT_LOOKUP = sliceBetween(
  extractStepBody("Bind verification_run_id"),
  "VERIFY ARTIFACT LOOKUP START",
  "VERIFY ARTIFACT LOOKUP END",
  // The block references ${{ github.repository }}; neutralize the Actions
  // expression so the extracted bash is runnable standalone.
).replace(/\$\{\{\s*github\.repository\s*\}\}/g, "owner/repo");

test("36d. REPRO: the defective `gh api ... --jq --arg` form fails with gh's 'accepts 1 arg(s)' usage error", () => {
  // The exact shape that failed the first promotion attempt, reconstructed
  // from the shipped block by moving --arg back onto gh api.
  const defective = [
    'ARTIFACTS_JSON="$RUNNER_TEMP/verify-run-artifacts.json"',
    `ARTIFACT_ID="$(gh api "repos/owner/repo/actions/runs/$VERIFY_RUN_INPUT/artifacts" --jq --arg n "production-verification-evidence-$VERIFY_RUN_INPUT" '.artifacts[] | select(.name == $n and .expired == false) | .id' | head -n1)"`,
  ].join("\n");
  const r = runArtifactLookup(defective, {
    artifactsJson: { artifacts: [{ name: `production-verification-evidence-${SYN_VERIFY_RUN}`, expired: false, id: SYN_ARTIFACT_ID }] },
  });
  assert.notEqual(r.status, 0, "the defective form must fail");
  assert.match(r.stdout, /accepts 1 arg\(s\)/, "must fail with gh's argument-count usage error — the exact observed root cause");
});

test("36e. FIXED: the shipped lookup resolves the verification-evidence artifact id", () => {
  const r = runArtifactLookup(VERIFY_ARTIFACT_LOOKUP, {
    artifactsJson: {
      artifacts: [
        { name: "some-other-artifact", expired: false, id: "6000000009" },
        { name: `production-verification-evidence-${SYN_VERIFY_RUN}`, expired: false, id: SYN_ARTIFACT_ID },
      ],
    },
  });
  assert.equal(r.status, 0, `expected success.\n${r.stdout}`);
  assert.equal(r.artifactId, SYN_ARTIFACT_ID);
});

test("36f. FIXED: an expired verification-evidence artifact resolves to empty (so the existing fail-closed branch fires)", () => {
  const r = runArtifactLookup(VERIFY_ARTIFACT_LOOKUP, {
    artifactsJson: { artifacts: [{ name: `production-verification-evidence-${SYN_VERIFY_RUN}`, expired: true, id: SYN_ARTIFACT_ID }] },
  });
  assert.equal(r.status, 0, "the lookup itself must not abort — it must yield an empty id for the caller's fail-closed check");
  assert.equal(r.artifactId, "", "an expired artifact must never be accepted");
});

test("36g. FIXED: a differently-named artifact on the same run resolves to empty (no loose/prefix matching)", () => {
  const r = runArtifactLookup(VERIFY_ARTIFACT_LOOKUP, {
    artifactsJson: { artifacts: [{ name: "production-verification-evidence-99999999999", expired: false, id: SYN_ARTIFACT_ID }] },
  });
  assert.equal(r.status, 0);
  assert.equal(r.artifactId, "", "only the artifact named for THIS verification run may be accepted");
});

test("36h. FIXED: a failing artifacts API call fails closed with a legible error (not an opaque abort)", () => {
  const r = runArtifactLookup(VERIFY_ARTIFACT_LOOKUP, { ghFails: true });
  assert.notEqual(r.status, 0, "an API failure must fail the step closed");
  assert.match(r.stdout, /VERIFICATION RUN ASSERTION FAILED/, "the failure must be reported as an explicit assertion failure");
});
