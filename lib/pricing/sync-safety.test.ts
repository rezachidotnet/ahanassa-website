import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateReconciliationGate, type ReconciliationGateInput } from "./sync-safety.ts";
import type { ReconciliationPolicy } from "./provider-config.ts";

function permissivePolicy(overrides: Partial<ReconciliationPolicy> = {}): ReconciliationPolicy {
  return { allowSnapshotReconciliation: true, allowAuthoritativeEmptySnapshot: false, currencyConvention: "IRR", ...overrides };
}

function baseInput(overrides: Partial<ReconciliationGateInput> = {}): ReconciliationGateInput {
  return {
    mode: "full_snapshot",
    complete: true,
    rejectedRecordCount: 0,
    incomingKeyCount: 10,
    missingKeyCount: 0,
    previousActiveKeyCountForProvider: 10,
    policy: permissivePolicy(),
    ...overrides,
  };
}

test("an incremental-mode result never triggers reconciliation, even with missing keys", () => {
  const result = evaluateReconciliationGate(baseInput({ mode: "incremental", missingKeyCount: 5 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: null });
});

test("complete: false never triggers reconciliation, even in full_snapshot mode", () => {
  const result = evaluateReconciliationGate(baseInput({ complete: false }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "incomplete_fetch" });
});

test("a provider that has not opted into snapshot reconciliation never reconciles (not a concern, just off)", () => {
  const result = evaluateReconciliationGate(baseInput({ policy: permissivePolicy({ allowSnapshotReconciliation: false }) }));
  assert.deepEqual(result, { shouldReconcile: false, concern: null });
});

test("an HTTP-success/empty response preserves last-known-good data by default (allowAuthoritativeEmptySnapshot unset)", () => {
  const result = evaluateReconciliationGate(baseInput({ incomingKeyCount: 0 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "suspicious_empty_snapshot" });
});

test("an authoritative empty snapshot deactivates only when ALL four required flags are set together", () => {
  const allFour = evaluateReconciliationGate(
    baseInput({ incomingKeyCount: 0, policy: permissivePolicy({ allowSnapshotReconciliation: true, allowAuthoritativeEmptySnapshot: true }) }),
  );
  assert.deepEqual(allFour, { shouldReconcile: true });
});

test("allowAuthoritativeEmptySnapshot alone, without allowSnapshotReconciliation, does not bypass the other safeguards", () => {
  const result = evaluateReconciliationGate(
    baseInput({ incomingKeyCount: 0, policy: permissivePolicy({ allowSnapshotReconciliation: false, allowAuthoritativeEmptySnapshot: true }) }),
  );
  assert.deepEqual(result, { shouldReconcile: false, concern: null });
});

test("a pagination/partial-fetch failure preserves existing active rows", () => {
  const result = evaluateReconciliationGate(baseInput({ complete: false, missingKeyCount: 8 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "incomplete_fetch" });
});

test("one rejected record among otherwise-valid ones skips deactivation entirely", () => {
  const result = evaluateReconciliationGate(baseInput({ rejectedRecordCount: 1 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "partial_validation_or_mapping_failure" });
});

test("an abnormal record-count collapse is blocked under the provider's safe default (no declared maxReconciliationDeactivationFraction)", () => {
  const result = evaluateReconciliationGate(baseInput({ incomingKeyCount: 2, missingKeyCount: 8, previousActiveKeyCountForProvider: 10 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "suspicious_count_collapse" });
});

test("a declared maxReconciliationDeactivationFraction permits a collapse within its allowance", () => {
  const result = evaluateReconciliationGate(
    baseInput({ incomingKeyCount: 8, missingKeyCount: 2, previousActiveKeyCountForProvider: 10, policy: permissivePolicy({ maxReconciliationDeactivationFraction: 0.3 }) }),
  );
  assert.deepEqual(result, { shouldReconcile: true });
});

test("a declared maxReconciliationDeactivationFraction still blocks a collapse that exceeds it", () => {
  const result = evaluateReconciliationGate(
    baseInput({ incomingKeyCount: 2, missingKeyCount: 8, previousActiveKeyCountForProvider: 10, policy: permissivePolicy({ maxReconciliationDeactivationFraction: 0.3 }) }),
  );
  assert.deepEqual(result, { shouldReconcile: false, concern: "suspicious_count_collapse" });
});

test("a valid, explicitly-authorized, complete, zero-rejection full_snapshot with no missing keys reconciles", () => {
  const result = evaluateReconciliationGate(baseInput());
  assert.deepEqual(result, { shouldReconcile: true });
});

test("a valid full_snapshot with some missing keys but no declared fraction is blocked (default-safe)", () => {
  const result = evaluateReconciliationGate(baseInput({ incomingKeyCount: 9, missingKeyCount: 1, previousActiveKeyCountForProvider: 10 }));
  assert.deepEqual(result, { shouldReconcile: false, concern: "suspicious_count_collapse" });
});
