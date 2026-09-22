import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPolicyBootstrapDiff, isBootstrapAllowedPath } from "./policy-bootstrap.ts";

// docs/release/RELEASE_POLICY.md Phase 19 tests 32-33.

test("32. bootstrap diff containing runtime application code is rejected", () => {
  const result = checkPolicyBootstrapDiff([
    "docs/release/RELEASE_POLICY.md",
    "lib/ci/release-risk-classifier.ts",
    "components/contact/enquiry-form.tsx", // runtime RFQ UI — forbidden
  ]);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "BOOTSTRAP_RUNTIME_CODE_FORBIDDEN");
  assert.deepEqual((result as any).violatingPaths, ["components/contact/enquiry-form.tsx"]);
});

test("32b. bootstrap diff containing catalog runtime feature changes is rejected", () => {
  const result = checkPolicyBootstrapDiff(["docs/release/RELEASE_POLICY.md", "lib/catalog/catalog-filters.ts"]);
  assert.equal(result.ok, false);
  assert.deepEqual((result as any).violatingPaths, ["lib/catalog/catalog-filters.ts"]);
});

test("33. a governance-only bootstrap diff is accepted", () => {
  const result = checkPolicyBootstrapDiff([
    "docs/release/RELEASE_POLICY.md",
    "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md",
    "docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md",
    "CLAUDE.md",
    "DOCUMENT_AUDIT_REPORT.md",
    "lib/ci/release-risk-classifier.ts",
    "lib/ci/release-risk-classifier.test.ts",
    "lib/ci/release-ledger.ts",
    "lib/ci/release-ledger.test.ts",
    "lib/ci/emergency-rollback.ts",
    "lib/ci/emergency-rollback.test.ts",
    "lib/ci/policy-bootstrap.ts",
    "lib/ci/policy-bootstrap.test.ts",
  ]);
  assert.equal(result.ok, true);
});

test("isBootstrapAllowedPath rejects a wrangler.jsonc change (runtime infra, not governance instructions)", () => {
  assert.equal(isBootstrapAllowedPath("wrangler.jsonc"), false);
});

test("isBootstrapAllowedPath accepts a workflow file (CI/release governance workflow changes are explicitly allowed)", () => {
  assert.equal(isBootstrapAllowedPath(".github/workflows/deploy-production.yml"), true);
});

test("an empty diff passes the bootstrap check vacuously", () => {
  const result = checkPolicyBootstrapDiff([]);
  assert.equal(result.ok, true);
});
