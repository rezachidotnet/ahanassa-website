import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRollbackTarget } from "./emergency-rollback.ts";
import type { LedgerRow } from "./release-ledger.ts";

// docs/release/RELEASE_POLICY.md Phase 19 tests 28-31. All identifiers are
// synthetic fixtures — never real historical Worker Version IDs or SHAs.

function row(overrides: Partial<LedgerRow>): LedgerRow {
  return {
    releaseSha: "0000000000000000000000000000000000synA",
    workerVersionId: "aaaaaaaa-0000-0000-0000-000000000001",
    releaseState: "STABLE_100",
    finalTrafficPercent: 100,
    stagingRunId: "synthetic-staging-run",
    productionRunId: "synthetic-production-run",
    promotionRunId: null,
    rollbackVersionId: null,
    finalRisk: "LOW",
    result: "PASS",
    timestamp: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const RECORDED_STABLE_VERSION = "aaaaaaaa-0000-0000-0000-000000000001";
const RECORDED_ROLLBACK_TARGET = "bbbbbbbb-0000-0000-0000-000000000002";
const NEVER_RECORDED_VERSION = "cccccccc-0000-0000-0000-000000000009";
const SYNTHETIC_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";

const ledger: LedgerRow[] = [
  row({ workerVersionId: RECORDED_STABLE_VERSION, releaseState: "STABLE_100" }),
  row({
    workerVersionId: "dddddddd-0000-0000-0000-000000000003",
    releaseState: "CANARY_ACTIVE",
    finalTrafficPercent: 10,
    rollbackVersionId: RECORDED_ROLLBACK_TARGET,
  }),
];

test("28. rollback to an arbitrary commit SHA is rejected", () => {
  const result = validateRollbackTarget(SYNTHETIC_COMMIT_SHA, ledger);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "ROLLBACK_TARGET_UNRESOLVED");
});

test("29. rollback to an arbitrary Worker Version ID never recorded in the ledger is rejected", () => {
  const result = validateRollbackTarget(NEVER_RECORDED_VERSION, ledger);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "ROLLBACK_TARGET_UNRESOLVED");
});

test("30. rollback with no recorded target (empty ledger) is rejected", () => {
  const result = validateRollbackTarget(RECORDED_STABLE_VERSION, []);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "ROLLBACK_TARGET_UNRESOLVED");
});

test("31. rollback to a recorded, validated target is accepted", () => {
  const result = validateRollbackTarget(RECORDED_STABLE_VERSION, ledger);
  assert.equal(result.ok, true);
  assert.equal((result as any).recordedAs, "WORKER_VERSION_ID");
});

test("31b. rollback to a version recorded only as a captured ROLLBACK_VERSION_ID is accepted", () => {
  const result = validateRollbackTarget(RECORDED_ROLLBACK_TARGET, ledger);
  assert.equal(result.ok, true);
  assert.equal((result as any).recordedAs, "ROLLBACK_VERSION_ID");
});

test("empty/whitespace rollback target is rejected before ledger lookup", () => {
  const result = validateRollbackTarget("   ", ledger);
  assert.equal(result.ok, false);
});

test("a malformed, non-UUID-shaped string is rejected even if it happens to match ledger text elsewhere", () => {
  const result = validateRollbackTarget("not-a-version-id", ledger);
  assert.equal(result.ok, false);
});
