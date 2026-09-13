import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Static safety-net for CI-CD-P1 (docs/release/CI_CD_POLICY.md): plain
// text checks, not a YAML parser, so this stays cheap and hard to fool by
// accident while still catching the specific dangerous patterns the policy
// forbids (remote deploy/migration in ordinary CI, an auto-triggered
// staging or production deploy, the still-pending 0010 migration being
// wired into any workflow).

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

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

test("no workflow in this repository auto-deploys production", () => {
  for (const file of readdirSync(workflowsDir)) {
    const content = withoutComments(readFileSync(path.join(workflowsDir, file), "utf8"));
    assert.ok(!content.includes("--env production"), `${file} must not deploy to production`);
  }
});
