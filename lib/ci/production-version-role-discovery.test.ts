import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

// Regression safety-net for finding R3 (docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md
// §5, docs/release/PRODUCTION_R3_DETERMINISTIC_VERSION_SELECTION_REPORT.md),
// in the same spirit as production-smoke-harness.test.ts in this directory —
// executing, not merely inspecting.
//
// WHAT THIS PROTECTS AGAINST
// --------------------------
// deploy-production.yml's "Capture PREVIOUS_VERSION_ID" step used to read
// `jq -r '.[-1].versions[0].version_id'` — the FIRST array entry inside the
// live deployment's `versions[]`. That is safe only while a single version
// serves 100% of traffic. On the real 10/90 canary split live as of
// 2026-09-21 (canary 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed @10%, stable
// b07d8697-620c-485c-8fed-21b893ab602c @90%), Cloudflare's own API returns
// the canary as `versions[0]` — so a re-dispatch of deploy-production.yml
// during that split would have captured the CANARY as PREVIOUS_VERSION_ID,
// inverting the rollback target and handing an uncertified version 90% of
// production traffic on the next split deploy.
//
// The fix replaces array-position selection with exact version-id matching
// against operator-declared `expected_current_stable_version_id` /
// `expected_current_canary_version_id` inputs (required only when 2 versions
// are live), the same technique verify-production.yml's V3 step already
// proved live against this exact production topology (run 35567845828).
//
// These tests extract the REAL role-discovery block out of the REAL
// workflow file and execute it under `bash -e` (GitHub's real wrapper),
// feeding it fixture deployment JSON instead of a live Cloudflare call — so
// a future edit that reintroduces positional selection, or weakens any of
// the fail-closed invariants, fails here instead of on a real release.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "deploy-production.yml");
const workflow = readFileSync(workflowPath, "utf8");

const REAL_CANARY = "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed";
const REAL_STABLE = "b07d8697-620c-485c-8fed-21b893ab602c";

/** Pulls the "Capture PREVIOUS_VERSION_ID" step's `run: |` body out of the
 *  workflow, dedented by the 10-space YAML block-scalar indent. */
function captureStepScript(src: string = workflow): string {
  const lines = src.split("\n");
  const stepIdx = lines.findIndex((l) => l.includes("- name: Capture PREVIOUS_VERSION_ID"));
  assert.notEqual(stepIdx, -1, "the PREVIOUS_VERSION_ID capture step must exist");
  const runIdx = lines.findIndex((l, i) => i > stepIdx && l.trim() === "run: |");
  assert.notEqual(runIdx, -1, "the capture step must use a `run: |` block scalar");

  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() !== "" && !line.startsWith("          ")) break;
    body.push(line.startsWith("          ") ? line.slice(10) : "");
  }
  return body.join("\n");
}

/** Extracts `[startMarker, endMarker]` inclusive from the capture script —
 *  the pure jq/bash role-classification logic, with the actual
 *  `npx wrangler deployments list` network call and its preceding
 *  `set -euo pipefail` excluded (the test supplies both itself). */
function sliceRoleDiscovery(script: string): string {
  const lines = script.split("\n");
  const start = lines.findIndex((l) => l.includes("ROLE DISCOVERY START"));
  const end = lines.findIndex((l) => l.includes("ROLE DISCOVERY END"));
  assert.notEqual(start, -1, "capture script must contain a ROLE DISCOVERY START marker");
  assert.notEqual(end, -1, "capture script must contain a ROLE DISCOVERY END marker");
  assert.ok(end > start, "ROLE DISCOVERY END must come after START");
  return lines.slice(start, end + 1).join("\n");
}

const FULL_SCRIPT = captureStepScript();
const ROLE_DISCOVERY = sliceRoleDiscovery(FULL_SCRIPT);

interface RoleResult {
  status: number;
  stdout: string;
  stderr: string;
  stable: string;
  canary: string;
  previous: string;
  rollback: string;
}

interface Version {
  version_id: string;
  percentage: number;
}

function deploymentFixture(versions: Version[]) {
  return {
    id: "fixture-deployment",
    source: "wrangler",
    strategy: "percentage",
    versions,
    created_on: "2026-09-21T00:00:00.000000Z",
  };
}

/** Runs the extracted ROLE_DISCOVERY block under `bash -e`, seeding
 *  `$RUNNER_TEMP/latest-deployment.json` directly (bypassing the real
 *  `wrangler deployments list` call the full step makes before this block). */
function runRoleDiscovery(
  latestDeployment: unknown,
  expected: { stable?: string; canary?: string } = {},
): RoleResult {
  const dir = mkdtempSync(path.join(tmpdir(), "role-discovery-"));
  try {
    writeFileSync(path.join(dir, "latest-deployment.json"), JSON.stringify(latestDeployment));

    const script = [
      "set -euo pipefail",
      ROLE_DISCOVERY,
      // `-` (not `:-`) deliberately: the real script always initializes
      // these to "" before the branch logic runs, so "set but empty" (the
      // single-version case's CANARY_VERSION_ID) must print as an empty
      // string, not be confused with "never assigned at all".
      'echo "HARNESS_STABLE=${STABLE_VERSION_ID-<UNSET>}"',
      'echo "HARNESS_CANARY=${CANARY_VERSION_ID-<UNSET>}"',
      'echo "HARNESS_PREVIOUS=${PREVIOUS_VERSION_ID-<UNSET>}"',
      'echo "HARNESS_ROLLBACK=${ROLLBACK_VERSION_ID-<UNSET>}"',
    ].join("\n");
    const scriptPath = path.join(dir, "role-discovery.sh");
    writeFileSync(scriptPath, script);

    const res = spawnSync("bash", ["-e", scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: dir,
        EXPECTED_STABLE_INPUT: expected.stable ?? "",
        EXPECTED_CANARY_INPUT: expected.canary ?? "",
      },
    });

    const stdout = res.stdout ?? "";
    const field = (key: string) => {
      const m = stdout.match(new RegExp(`${key}=(.*)`));
      return m ? m[1] : "<MISSING>";
    };
    return {
      status: res.status ?? -1,
      stdout,
      stderr: res.stderr ?? "",
      stable: field("HARNESS_STABLE"),
      canary: field("HARNESS_CANARY"),
      previous: field("HARNESS_PREVIOUS"),
      rollback: field("HARNESS_ROLLBACK"),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 1. Single version at 100% => stable identified correctly.
// ---------------------------------------------------------------------------
test("role discovery: single version at 100% is classified as stable", () => {
  const r = runRoleDiscovery(deploymentFixture([{ version_id: "sole-version-id", percentage: 100 }]));
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.stable, "sole-version-id");
  assert.equal(r.canary, "");
  assert.equal(r.previous, "sole-version-id");
  assert.equal(r.rollback, "sole-version-id");
});

// ---------------------------------------------------------------------------
// 2 & 3. Two versions at 10/90 => stable + canary identified correctly
// regardless of array order (both orders produce the identical result).
// ---------------------------------------------------------------------------
test("role discovery: two versions at 10/90 (canary-first order) resolve by id, not position", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 10 },
      { version_id: REAL_STABLE, percentage: 90 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.stable, REAL_STABLE);
  assert.equal(r.canary, REAL_CANARY);
  assert.equal(r.previous, REAL_STABLE);
});

test("role discovery: same two versions with REVERSED JSON order produce an IDENTICAL role assignment", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_STABLE, percentage: 90 },
      { version_id: REAL_CANARY, percentage: 10 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.stable, REAL_STABLE, "reordering the live JSON must not change which version is stable");
  assert.equal(r.canary, REAL_CANARY);
  assert.equal(r.previous, REAL_STABLE);
});

test("role discovery: a 50/50 split with EQUAL percentages still resolves correctly by id (percentage ties are not ambiguous)", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: "tie-a", percentage: 50 },
      { version_id: "tie-b", percentage: 50 },
    ]),
    { stable: "tie-b", canary: "tie-a" },
  );
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.stable, "tie-b", "role must be established by declared id, never by percentage");
  assert.equal(r.canary, "tie-a");
});

// ---------------------------------------------------------------------------
// 4. Three active versions => fail closed.
// ---------------------------------------------------------------------------
test("role discovery: three active versions fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: "v1", percentage: 34 },
      { version_id: "v2", percentage: 33 },
      { version_id: "v3", percentage: 33 },
    ]),
    { stable: "v1", canary: "v2" },
  );
  assert.notEqual(r.status, 0, "3 active versions must never resolve a rollback target");
  assert.match(r.stderr + r.stdout, /only recognizes exactly 1 .* or 2/);
});

// ---------------------------------------------------------------------------
// 5. Traffic totals 95 or 105 => fail closed.
// ---------------------------------------------------------------------------
test("role discovery: traffic totaling 95% fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 10 },
      { version_id: REAL_STABLE, percentage: 85 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.notEqual(r.status, 0, "95% total must not be trusted");
  assert.match(r.stderr + r.stdout, /total.*95%, not 100%/);
});

test("role discovery: traffic totaling 105% fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 15 },
      { version_id: REAL_STABLE, percentage: 90 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.notEqual(r.status, 0, "105% total must not be trusted");
  assert.match(r.stderr + r.stdout, /total.*105%, not 100%/);
});

// ---------------------------------------------------------------------------
// 6. Expected canary missing (input not provided while 2 versions are live)
//    => fail closed.
// ---------------------------------------------------------------------------
test("role discovery: 2 live versions but expected_current_canary_version_id not provided fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 10 },
      { version_id: REAL_STABLE, percentage: 90 },
    ]),
    { stable: REAL_STABLE }, // canary omitted
  );
  assert.notEqual(r.status, 0, "must not guess the canary role when 2 versions are live and only stable was declared");
  assert.match(r.stderr + r.stdout, /both expected_current_stable_version_id and expected_current_canary_version_id are required/);
});

// ---------------------------------------------------------------------------
// 7. Expected stable missing => fail closed.
// ---------------------------------------------------------------------------
test("role discovery: 2 live versions but expected_current_stable_version_id not provided fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 10 },
      { version_id: REAL_STABLE, percentage: 90 },
    ]),
    { canary: REAL_CANARY }, // stable omitted
  );
  assert.notEqual(r.status, 0, "must not guess the stable role when 2 versions are live and only canary was declared");
  assert.match(r.stderr + r.stdout, /both expected_current_stable_version_id and expected_current_canary_version_id are required/);
});

// ---------------------------------------------------------------------------
// 8. Unknown version receiving traffic => fail closed.
// ---------------------------------------------------------------------------
test("role discovery: an unknown live version matching neither declared id fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_STABLE, percentage: 90 },
      { version_id: "totally-unexpected-version", percentage: 10 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY }, // declared canary is not actually live
  );
  assert.notEqual(r.status, 0, "an undeclared live version must never be silently accepted");
  assert.match(r.stderr + r.stdout, /is not one of the versions currently receiving production traffic/);
});

test("role discovery: single declared version with a mismatched single live version fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([{ version_id: "unexpected-sole-version", percentage: 100 }]),
    { stable: REAL_STABLE },
  );
  assert.notEqual(r.status, 0, "declared expectation must be checked even in the single-version case");
  assert.match(r.stderr + r.stdout, /does not match the single live version/);
});

// ---------------------------------------------------------------------------
// Malformed-percentage / zero / negative defensive checks.
// ---------------------------------------------------------------------------
test("role discovery: a zero-percent 'active' version fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_STABLE, percentage: 100 },
      { version_id: REAL_CANARY, percentage: 0 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.notEqual(r.status, 0, "a version listed as active with 0% is a malformed topology, not a legitimate one");
  assert.match(r.stderr + r.stdout, /malformed traffic percentage/);
});

test("role discovery: a negative percentage fails closed", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_STABLE, percentage: 110 },
      { version_id: REAL_CANARY, percentage: -10 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.notEqual(r.status, 0, "a negative percentage must never be trusted");
  assert.match(r.stderr + r.stdout, /malformed traffic percentage/);
});

// ---------------------------------------------------------------------------
// 9 & 10 & 12. The CURRENT real production 10/90 topology resolves
// deterministically, the rollback target remains the original stable
// version, and canary/stable/rollback are never conflated.
// ---------------------------------------------------------------------------
test("role discovery: the CURRENT real production 10/90 topology resolves deterministically with no ambiguity between roles", () => {
  const r = runRoleDiscovery(
    deploymentFixture([
      { version_id: REAL_CANARY, percentage: 10 },
      { version_id: REAL_STABLE, percentage: 90 },
    ]),
    { stable: REAL_STABLE, canary: REAL_CANARY },
  );
  assert.equal(r.status, 0, `expected success.\n${r.stdout}\n${r.stderr}`);
  assert.equal(r.stable, REAL_STABLE, "STABLE_VERSION_ID must be the real production stable version");
  assert.equal(r.canary, REAL_CANARY, "CANARY_VERSION_ID must be the real production canary version");
  assert.equal(r.previous, REAL_STABLE, "PREVIOUS_VERSION_ID (rollback target) must equal the real stable version");
  assert.equal(r.rollback, REAL_STABLE, "ROLLBACK_VERSION_ID must equal the real stable version");
  assert.notEqual(r.stable, r.canary, "stable and canary must never be the same value");
  assert.notEqual(r.previous, REAL_CANARY, "the rollback target must never resolve to the canary");
});

// ---------------------------------------------------------------------------
// 11. Mutation test — reintroducing `.versions[0]` must fail an invariant
// test. Two layers: (a) the real, current file contains no positional
// version selection; (b) the detector that proves (a) actually detects a
// reintroduction, rather than passing vacuously.
// ---------------------------------------------------------------------------
function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

/** Matches `.versions[<digit>]` — the positional-selection shape R3 removed
 *  — anywhere in non-comment workflow text. `.versions[]` (iterate-all, used
 *  throughout the fixed logic) and `.versions | length` do not match. */
const POSITIONAL_VERSIONS_RE = /\.versions\[\s*-?\d+\s*\]/;

test("deploy-production.yml contains no positional `.versions[N]` selection anywhere (R3 closed)", () => {
  const code = withoutComments(workflow);
  const hit = code.match(POSITIONAL_VERSIONS_RE);
  assert.equal(hit, null, `found positional version-array indexing: ${hit?.[0]}`);
});

test("mutation: reintroducing `.versions[0]` into deploy-production.yml is caught by the positional-selection detector", () => {
  const mutated = workflow.replace(
    "jq -r '.versions | length'",
    "jq -r '.versions[0].version_id' # reintroduced positional read",
  );
  assert.notEqual(mutated, workflow, "the mutation must actually change the source (sanity check)");
  const code = withoutComments(mutated);
  const hit = code.match(POSITIONAL_VERSIONS_RE);
  assert.notEqual(hit, null, "the detector must catch a reintroduced `.versions[0]` — it must not pass vacuously");
});

test("mutation: the OLD `.[-1].versions[0].version_id` one-liner would have been caught by the detector", () => {
  const oldDefect = "jq -r '.[-1].versions[0].version_id // empty'";
  const hit = withoutComments(oldDefect).match(POSITIONAL_VERSIONS_RE);
  assert.notEqual(hit, null, "the pre-fix construct must match the detector — proves the detector targets the real historical defect");
});

// ---------------------------------------------------------------------------
// Shape checks — the new inputs exist, are optional, and are validated
// before Cloudflare credentials are ever used.
// ---------------------------------------------------------------------------
test("deploy-production.yml declares expected_current_stable_version_id and expected_current_canary_version_id as optional inputs", () => {
  assert.match(workflow, /expected_current_stable_version_id:/);
  assert.match(workflow, /expected_current_canary_version_id:/);
  const stableIdx = workflow.indexOf("expected_current_stable_version_id:");
  const nextInputIdx = workflow.indexOf("expected_current_canary_version_id:", stableIdx);
  const stableBlock = workflow.slice(stableIdx, nextInputIdx);
  assert.match(stableBlock, /required:\s*false/);
});

test("deploy-production.yml format-validates the new inputs as UUIDs before checkout", () => {
  const confirmStepIdx = workflow.indexOf("Require explicit confirmation and a full 40-hex-character deploy_ref");
  const checkoutIdx = workflow.indexOf("- name: Checkout deploy_ref");
  assert.ok(confirmStepIdx !== -1 && checkoutIdx !== -1 && confirmStepIdx < checkoutIdx);
  const earlyBlock = workflow.slice(confirmStepIdx, checkoutIdx);
  assert.match(earlyBlock, /EXPECTED_STABLE_INPUT/);
  assert.match(earlyBlock, /EXPECTED_CANARY_INPUT/);
  assert.match(earlyBlock, /UUID_RE/);
});
