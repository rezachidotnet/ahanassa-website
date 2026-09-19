import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Static safety-net for CI-CD-P1 (docs/release/CI_CD_POLICY.md) and its
// production-workflow update (docs/release/PRODUCTION_WORKFLOW_INVARIANT_UPDATE_REPORT.md):
// plain text checks, not a YAML parser, so this stays cheap and hard to fool
// by accident while still catching the specific dangerous patterns the
// policy forbids (remote deploy/migration in ordinary CI, an auto-triggered
// staging or production deploy, the still-pending 0010 migration being
// wired into any workflow).
//
// Production-deployment model (updated — supersedes the old blanket "no
// workflow ever deploys to production"): exactly one workflow file,
// `deploy-production.yml`, is allowed to deploy to production, and only once
// it exists and carries the required shape (environment: production,
// production secrets, an exact-SHA deploy_ref, a production target
// assertion). Every other workflow — present or future — must never contain
// a production deploy command, the production Worker name, a production D1
// database name/id, or `environment: production`. `deploy-production.yml`
// does not exist yet (a separate, not-yet-authorized task); the shape test
// below is written to activate automatically the moment it is added,
// without failing the suite in the meantime.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

const PRODUCTION_WORKFLOW = "deploy-production.yml";

function readWorkflow(name: string): string {
  return readFileSync(path.join(workflowsDir, name), "utf8");
}

// Strips full-line "#" comments so invariant checks below only see
// executable YAML — this file's own explanatory comments legitimately
// mention the forbidden commands (to tell the operator to run them
// separately, by hand) without that counting as the workflow running them.
function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

// Markers that must NEVER appear in any workflow other than
// `deploy-production.yml` — a production deploy command, the production
// Worker's name, a production D1 database's name or id, or a GitHub
// Environment targeting of `production`. Kept as small, literal/regex
// substring checks (matching this file's existing style) rather than a
// denylist of the word "production" alone, so a workflow's own comments or
// prose (already stripped by `withoutComments` for full-line comments) don't
// false-positive, and so the check states exactly what it is guarding
// against rather than a vague ban on a common English word.
const PRODUCTION_DEPLOY_MARKERS: Array<{ test: (content: string) => boolean; label: string }> = [
  { test: (c) => c.includes("--env production"), label: "an --env production flag" },
  { test: (c) => c.includes("ahanassa-production"), label: "the production Worker name (ahanassa-production)" },
  { test: (c) => c.includes("ahanassa-ops-production"), label: "the production DB_OPS database name" },
  { test: (c) => c.includes("ahanassa-public-production"), label: "the production DB_PUBLIC database name" },
  { test: (c) => c.includes("7240a6a7-c293-4e6e-baf3-95838a3c2944"), label: "the production DB_OPS database id" },
  { test: (c) => c.includes("73ba6b50-ef57-4d89-baa9-617a0b0af127"), label: "the production DB_PUBLIC database id" },
  { test: (c) => /environment:\s*production\b/i.test(c), label: "environment: production targeting" },
];

function findProductionDeployMarkers(content: string): string[] {
  return PRODUCTION_DEPLOY_MARKERS.filter((m) => m.test(content)).map((m) => m.label);
}

// The required shape of `deploy-production.yml` itself, per
// `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md` R1-R12 and this
// task's own scope: environment: production, production secrets, an
// exact-SHA deploy_ref input, and a production target assertion. Returns a
// list of violation messages (empty = compliant) so both the real-file
// check and the mutation tests below share one implementation.
function validateProductionWorkflowShape(content: string): string[] {
  const violations: string[] = [];
  const code = withoutComments(content);

  if (!/environment:\s*production\b/.test(code)) {
    violations.push("must target environment: production");
  }
  if (!code.includes("secrets.CLOUDFLARE_API_TOKEN")) {
    violations.push("must use the production-scoped CLOUDFLARE_API_TOKEN secret");
  }
  if (!code.includes("secrets.CLOUDFLARE_ACCOUNT_ID")) {
    violations.push("must use the production-scoped CLOUDFLARE_ACCOUNT_ID secret");
  }
  if (!/deploy_ref:/.test(code)) {
    violations.push("must expose a deploy_ref input");
  }
  if (!code.includes("[0-9a-f]{40}")) {
    violations.push("must require deploy_ref to be a full 40-character hexadecimal SHA");
  }
  if (!/ASSERTION.*FAILED|assertion.*failed/i.test(code)) {
    violations.push("must carry a fail-closed production target assertion");
  }
  if (!code.includes("ahanassa-production")) {
    violations.push("the production target assertion must pin the production Worker name");
  }

  return violations;
}

test("CI workflow never deploys and never touches a remote D1 migration", () => {
  const ci = withoutComments(readWorkflow("ci.yml"));
  assert.ok(!ci.includes("wrangler deploy"), "CI must not run wrangler deploy");
  assert.ok(!ci.includes("vinext-cloudflare deploy"), "CI must not run a Cloudflare deploy");
  assert.ok(!ci.includes("migrations apply"), "CI must not apply D1 migrations");
  assert.ok(!ci.includes("--remote"), "CI must not run a --remote wrangler command");
  assert.ok(!ci.includes("0010_homepage_eligibility"), "CI must not reference the pending migration");
});

test("CI workflow receives no Cloudflare deploy credentials and keeps read-only default permissions", () => {
  const ci = readWorkflow("ci.yml");
  assert.ok(!ci.includes("CLOUDFLARE_API_TOKEN"), "CI must not receive the Cloudflare deploy token");
  assert.ok(!ci.includes("CLOUDFLARE_ACCOUNT_ID"), "CI must not receive the Cloudflare account id");
  assert.match(ci, /contents:\s*read/, "CI must declare read-only contents permission");
  assert.doesNotMatch(ci, /contents:\s*write/, "CI must not escalate to write permissions");
});

test("CI workflow triggers on push, pull_request, and workflow_dispatch", () => {
  const ci = readWorkflow("ci.yml");
  assert.match(ci, /^\s*push:\s*$/m, "CI must trigger on push");
  assert.match(ci, /^\s*pull_request:\s*$/m, "CI must trigger on pull_request");
  assert.match(ci, /^\s*workflow_dispatch:\s*$/m, "CI must be manually triggerable");
});

test("staging deploy workflow is workflow_dispatch only — no push or schedule trigger", () => {
  const deploy = readWorkflow("deploy-staging.yml");
  assert.match(deploy, /^\s*workflow_dispatch:\s*$/m, "staging deploy must support workflow_dispatch");
  assert.doesNotMatch(deploy, /^\s*push:\s*$/m, "staging deploy must not trigger on push");
  assert.doesNotMatch(deploy, /^\s*schedule:\s*$/m, "staging deploy must not trigger on a schedule");
});

test("staging deploy workflow requires an explicit typed confirmation before deploying", () => {
  const deploy = readWorkflow("deploy-staging.yml");
  assert.ok(deploy.includes("deploy-staging"), "staging deploy must require a deliberate confirmation string");
  assert.match(deploy, /exit 1/, "staging deploy must fail closed when confirmation does not match");
});

test("staging deploy workflow never applies a D1 migration and never targets production", () => {
  const deploy = withoutComments(readWorkflow("deploy-staging.yml"));
  assert.ok(!deploy.includes("migrations apply"), "staging deploy must not apply D1 migrations");
  assert.ok(!deploy.includes("--remote"), "staging deploy must not run a raw --remote wrangler command");
  assert.ok(!deploy.includes("0010_homepage_eligibility"), "staging deploy must not reference the pending migration");
  assert.ok(!deploy.includes("--env production"), "staging deploy must never target the production environment");
  assert.ok(!deploy.includes("ahanassa-production"), "staging deploy must never reference the production Worker");
});

test("only deploy-production.yml may deploy to production — every other workflow, present or future, fails if it does", () => {
  for (const file of readdirSync(workflowsDir)) {
    if (file === PRODUCTION_WORKFLOW) continue; // the one allowed exception — validated separately below
    const content = withoutComments(readFileSync(path.join(workflowsDir, file), "utf8"));
    const markers = findProductionDeployMarkers(content);
    assert.deepEqual(markers, [], `${file} must not deploy to production — found: ${markers.join(", ")}`);
  }
});

test("deploy-production.yml, once it exists, must carry the required production-release shape", () => {
  const filePath = path.join(workflowsDir, PRODUCTION_WORKFLOW);
  if (!existsSync(filePath)) {
    // Not yet authored — creating it is a separate, explicitly out-of-scope
    // task (docs/release/PRODUCTION_WORKFLOW_INVARIANT_UPDATE_REPORT.md).
    // This invariant activates automatically the moment the file is added,
    // rather than failing the suite for a file that isn't supposed to exist
    // yet — see the mutation tests below for proof the check logic itself
    // is exercised today, not merely dormant and unverified.
    return;
  }
  const violations = validateProductionWorkflowShape(readFileSync(filePath, "utf8"));
  assert.deepEqual(violations, [], `deploy-production.yml violates the required shape: ${violations.join("; ")}`);
});

// Mutation tests — prove the two checks above actually catch what they
// claim to, using in-memory fixtures rather than real workflow files (so
// this never requires creating deploy-production.yml or editing a real
// workflow to add a forbidden command, both out of scope for this task).

const VALID_PRODUCTION_WORKFLOW_FIXTURE = `
name: Deploy Production
on:
  workflow_dispatch:
    inputs:
      deploy_ref:
        required: true
concurrency:
  group: deploy-production
  cancel-in-progress: false
permissions:
  contents: read
  actions: read
jobs:
  deploy-production:
    environment: production
    steps:
      - name: Reject non-SHA deploy_ref
        run: |
          if ! [[ "\${{ inputs.deploy_ref }}" =~ ^[0-9a-f]{40}$ ]]; then
            echo "::error::deploy_ref must be a full 40-character hexadecimal SHA"
            exit 1
          fi
      - name: Assert production target
        run: |
          EXPECTED_WORKER="ahanassa-production"
          echo "::error::PRODUCTION RESOURCE ASSERTION FAILED — worker mismatch"
      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler versions deploy \${{ steps.upload.outputs.version_id }}@100
`;

test("mutation: the fixture itself satisfies the required shape (sanity check before mutating it)", () => {
  assert.deepEqual(
    validateProductionWorkflowShape(VALID_PRODUCTION_WORKFLOW_FIXTURE),
    [],
    "the valid fixture must satisfy validateProductionWorkflowShape before any mutation is applied",
  );
});

test("mutation: removing the environment: production reference fails the shape check", () => {
  const mutated = VALID_PRODUCTION_WORKFLOW_FIXTURE.replace(/environment:\s*production/, "");
  const violations = validateProductionWorkflowShape(mutated);
  assert.ok(
    violations.includes("must target environment: production"),
    `removing environment: production must be caught; got violations: ${violations.join("; ")}`,
  );
});

test("mutation: removing the exact-SHA deploy_ref requirement fails the shape check", () => {
  const mutated = VALID_PRODUCTION_WORKFLOW_FIXTURE.replace("[0-9a-f]{40}", "");
  const violations = validateProductionWorkflowShape(mutated);
  assert.ok(
    violations.includes("must require deploy_ref to be a full 40-character hexadecimal SHA"),
    `removing the SHA-format requirement must be caught; got violations: ${violations.join("; ")}`,
  );
});

test("mutation: removing the production secrets fails the shape check", () => {
  const mutated = VALID_PRODUCTION_WORKFLOW_FIXTURE.replace(/secrets\.CLOUDFLARE_API_TOKEN/, "").replace(
    /secrets\.CLOUDFLARE_ACCOUNT_ID/,
    "",
  );
  const violations = validateProductionWorkflowShape(mutated);
  assert.ok(
    violations.includes("must use the production-scoped CLOUDFLARE_API_TOKEN secret"),
    `removing CLOUDFLARE_API_TOKEN must be caught; got violations: ${violations.join("; ")}`,
  );
  assert.ok(
    violations.includes("must use the production-scoped CLOUDFLARE_ACCOUNT_ID secret"),
    `removing CLOUDFLARE_ACCOUNT_ID must be caught; got violations: ${violations.join("; ")}`,
  );
});

test("mutation: removing the production target assertion fails the shape check", () => {
  const mutated = VALID_PRODUCTION_WORKFLOW_FIXTURE.replace(
    /echo "::error::PRODUCTION RESOURCE ASSERTION FAILED[^\n]*"/,
    "",
  );
  const violations = validateProductionWorkflowShape(mutated);
  assert.ok(
    violations.includes("must carry a fail-closed production target assertion"),
    `removing the assertion marker must be caught; got violations: ${violations.join("; ")}`,
  );
});

test("mutation: the real staging workflow does not already trip the production-deploy scan (sanity check)", () => {
  const stagingLike = withoutComments(readWorkflow("deploy-staging.yml"));
  assert.deepEqual(
    findProductionDeployMarkers(stagingLike),
    [],
    "the real deploy-staging.yml must not already contain a production-deploy marker",
  );
});

test("mutation: injecting a production deploy command into another workflow fails the production-deploy scan", () => {
  const stagingLike = withoutComments(readWorkflow("deploy-staging.yml"));
  const mutated = `${stagingLike}\n      - run: npx wrangler deploy --env production\n`;
  const markers = findProductionDeployMarkers(mutated);
  assert.ok(
    markers.length > 0,
    "injecting a production deploy command into another workflow's content must be caught",
  );
  assert.ok(
    markers.includes("an --env production flag"),
    `expected the --env production marker; got: ${markers.join(", ")}`,
  );
});

test("mutation: injecting the production Worker name into another workflow fails the production-deploy scan", () => {
  const ciLike = withoutComments(readWorkflow("ci.yml"));
  const mutated = `${ciLike}\n      - run: echo ahanassa-production\n`;
  const markers = findProductionDeployMarkers(mutated);
  assert.ok(
    markers.includes("the production Worker name (ahanassa-production)"),
    `expected the production Worker name marker; got: ${markers.join(", ")}`,
  );
});

// Exact-SHA hardening. `main` and the application branches have unrelated
// histories; a copy of deploy-staging.yml lives on `main` only so GitHub
// Actions indexes the workflow. These invariants keep that copy from ever
// deploying its own (application-less) checkout, and keep the staging target
// pinned in configuration rather than taken from operator input.

test("staging deploy workflow requires an explicit deploy_ref and checks out that ref", () => {
  const deploy = readWorkflow("deploy-staging.yml");
  assert.match(deploy, /^\s{6}deploy_ref:\s*$/m, "staging deploy must expose a deploy_ref input");
  assert.match(
    deploy,
    /ref:\s*\$\{\{\s*inputs\.deploy_ref\s*\}\}/,
    "staging deploy must check out inputs.deploy_ref explicitly, never the dispatch branch implicitly",
  );
  const checkouts = (withoutComments(deploy).match(/actions\/checkout@/g) ?? []).length;
  const explicitRefs = (deploy.match(/ref:\s*\${{\s*inputs\.deploy_ref\s*}}/g) ?? []).length;
  assert.equal(
    checkouts,
    explicitRefs,
    "every checkout step in staging deploy must pin ref: inputs.deploy_ref — no implicit-checkout fallback",
  );
});

test("staging deploy workflow records the exact deployed commit SHA", () => {
  const deploy = withoutComments(readWorkflow("deploy-staging.yml"));
  assert.ok(deploy.includes("DEPLOYED_SHA"), "staging deploy must record the resolved commit as DEPLOYED_SHA");
  assert.ok(deploy.includes("git rev-parse HEAD"), "staging deploy must resolve the checked-out commit");
});

test("staging deploy workflow asserts its staging target before building or deploying", () => {
  const deploy = withoutComments(readWorkflow("deploy-staging.yml"));
  const assertAt = deploy.indexOf("STAGING RESOURCE ASSERTION FAILED");
  assert.ok(assertAt > -1, "staging deploy must carry a fail-closed staging resource assertion");
  for (const later of ["npm ci", "npm run build", "vinext-cloudflare deploy"]) {
    assert.ok(
      deploy.indexOf(later) > assertAt,
      `staging deploy must run the staging resource assertion before "${later}"`,
    );
  }
  assert.ok(
    deploy.includes("ahanassa-bootstrap-staging"),
    "the assertion must pin the staging Worker name",
  );
});

test("staging deploy workflow takes no Cloudflare target as operator input", () => {
  const deploy = withoutComments(readWorkflow("deploy-staging.yml"));
  const inputsBlock = deploy.slice(deploy.indexOf("inputs:"), deploy.indexOf("concurrency:"));
  for (const forbidden of ["database_id", "worker", "account", "env:"]) {
    assert.ok(
      !inputsBlock.toLowerCase().includes(forbidden),
      `workflow_dispatch inputs must not expose "${forbidden}" as an operator-supplied Cloudflare target`,
    );
  }
  assert.ok(
    deploy.includes("--env staging"),
    "staging deploy must pin the Cloudflare environment to staging in the workflow, not in an input",
  );
});
