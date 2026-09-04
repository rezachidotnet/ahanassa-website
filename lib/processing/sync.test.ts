import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeProcessingTimestamp, planProcessingGroupsSync, validateProcessingGroupsBatch } from "./sync.ts";
import type { ExistingProcessingGroup } from "./sync.ts";
import type { ProcessingGroupApiItem } from "./odoo-api-client.ts";

function apiItem(overrides: Partial<ProcessingGroupApiItem> = {}): ProcessingGroupApiItem {
  return { id: "SHEET_PROCESSING", name: "فرآوری ورق", sequence: 10, active: true, updated_at: "2026-09-01 10:00:00", ...overrides };
}

function existing(overrides: Partial<ExistingProcessingGroup> = {}): ExistingProcessingGroup {
  return { id: "row_1", code: "SHEET_PROCESSING", name: "فرآوری ورق", sequence: 10, isActive: true, sourceUpdatedAt: "2026-09-01T10:00:00.000Z", ...overrides };
}

// --- validateProcessingGroupsBatch: domain rules ---

test("validateProcessingGroupsBatch accepts a normal non-empty batch", () => {
  const result = validateProcessingGroupsBatch([apiItem()], { total: 1 });
  assert.equal(result.valid, true);
});

test("validateProcessingGroupsBatch: a validated authoritative EMPTY response is valid (task §10)", () => {
  const result = validateProcessingGroupsBatch([], { total: 0 });
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.items, []);
});

test("validateProcessingGroupsBatch rejects duplicate stable identity within one batch", () => {
  const result = validateProcessingGroupsBatch([apiItem({ id: "A" }), apiItem({ id: "A" })], { total: 2 });
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reasonCode, "PROCESSING_DUPLICATE_IDENTITY");
});

test("validateProcessingGroupsBatch rejects a meta.total mismatch (malformed/inconsistent, not a legitimate empty case)", () => {
  const result = validateProcessingGroupsBatch([apiItem()], { total: 5 });
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reasonCode, "PROCESSING_META_TOTAL_MISMATCH");
});

test("validateProcessingGroupsBatch: meta.total=5 with an empty data array is rejected, not treated as a valid empty result", () => {
  // Distinguishes a genuinely authoritative empty response ({data:[], meta:{total:0}})
  // from an inconsistent/malformed one masquerading as empty (task §10).
  const result = validateProcessingGroupsBatch([], { total: 5 });
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reasonCode, "PROCESSING_META_TOTAL_MISMATCH");
});

// --- planProcessingGroupsSync: create / update / unchanged ---

test("plan: a brand-new code is a create", () => {
  const plan = planProcessingGroupsSync([apiItem({ id: "NEW_GROUP" })], []);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].code, "NEW_GROUP");
  assert.equal(plan.toUpdate.length, 0);
  assert.equal(plan.toWithdraw.length, 0);
});

test("plan: identical repeat sync is a no-op (unchanged)", () => {
  const plan = planProcessingGroupsSync([apiItem()], [existing()]);
  assert.equal(plan.toCreate.length, 0);
  assert.equal(plan.toUpdate.length, 0);
  assert.equal(plan.toWithdraw.length, 0);
  assert.deepEqual(plan.unchanged, ["row_1"]);
});

test("plan: a name change (rename) is an update", () => {
  const plan = planProcessingGroupsSync([apiItem({ name: "فرآوری ورق (جدید)" })], [existing()]);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].patch.name, "فرآوری ورق (جدید)");
});

test("plan: a sequence change is an update", () => {
  const plan = planProcessingGroupsSync([apiItem({ sequence: 99 })], [existing()]);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].patch.sequence, 99);
});

// --- withdrawal / republish ---

test("plan: a previously-active code missing from a fresh valid batch is withdrawn", () => {
  const plan = planProcessingGroupsSync([], [existing()]);
  assert.deepEqual(plan.toWithdraw, ["row_1"]);
  assert.equal(plan.toCreate.length, 0);
  assert.equal(plan.toUpdate.length, 0);
});

test("plan: an already-withdrawn code that is already absent stays absent (not re-listed as a withdrawal every run)", () => {
  const plan = planProcessingGroupsSync([], [existing({ isActive: false })]);
  assert.deepEqual(plan.toWithdraw, []);
});

test("plan: a withdrawn code reappearing in a fresh valid batch is republished via toUpdate, reactivating it", () => {
  const plan = planProcessingGroupsSync([apiItem()], [existing({ isActive: false })]);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toWithdraw.length, 0);
});

test("plan: multiple groups — one withdrawn, one unchanged, one created, in the same pass", () => {
  const plan = planProcessingGroupsSync(
    [apiItem({ id: "SHEET_PROCESSING" }), apiItem({ id: "NEW_GROUP", name: "New" })],
    [existing({ id: "row_1", code: "SHEET_PROCESSING" }), existing({ id: "row_2", code: "OLD_GROUP" })],
  );
  assert.deepEqual(plan.unchanged, ["row_1"]);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].code, "NEW_GROUP");
  assert.deepEqual(plan.toWithdraw, ["row_2"]);
});

// --- normalizeProcessingTimestamp ---

test("normalizeProcessingTimestamp converts a naive space-separated timestamp to UTC ISO-8601", () => {
  assert.equal(normalizeProcessingTimestamp("2026-09-01 10:00:00"), "2026-09-01T10:00:00.000Z");
});

test("normalizeProcessingTimestamp leaves an already-ISO timestamp unchanged", () => {
  assert.equal(normalizeProcessingTimestamp("2026-09-01T10:00:00.000Z"), "2026-09-01T10:00:00.000Z");
});
