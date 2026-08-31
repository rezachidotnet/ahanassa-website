import { test } from "node:test";
import assert from "node:assert/strict";
import { applyIncrementalWatermarkMargin, evaluateFullSyncPlausibility, INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS } from "./sync-safety.ts";

test("evaluateFullSyncPlausibility: a full pull matching the current active count is plausible", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 237, currentActiveCount: 237 });
  assert.deepEqual(result, { plausible: true });
});

test("evaluateFullSyncPlausibility: legitimate growth is plausible", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 260, currentActiveCount: 237 });
  assert.deepEqual(result, { plausible: true });
});

test("evaluateFullSyncPlausibility: a modest, plausible shrink (a real discontinued SKU or two) is allowed", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 230, currentActiveCount: 237 });
  assert.deepEqual(result, { plausible: true });
});

test("evaluateFullSyncPlausibility: exactly at the 50% floor is still plausible (inclusive boundary)", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 119, currentActiveCount: 237 }); // 237*0.5 = 118.5
  assert.deepEqual(result, { plausible: true });
});

test("evaluateFullSyncPlausibility: zero items from a technically-ok upstream is never plausible once a real catalog exists — the empty-upstream catastrophe case", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 0, currentActiveCount: 237 });
  assert.deepEqual(result, { plausible: false, reason: "empty_upstream" });
});

test("evaluateFullSyncPlausibility: a catastrophic drop below the 50% floor is implausible", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 10, currentActiveCount: 237 });
  assert.deepEqual(result, { plausible: false, reason: "implausible_drop" });
});

test("evaluateFullSyncPlausibility: never hardcodes 237 — the same ratio applies whatever the current catalog size actually is", () => {
  const grown = evaluateFullSyncPlausibility({ upstreamCount: 40, currentActiveCount: 500 });
  assert.deepEqual(grown, { plausible: false, reason: "implausible_drop" });
  const grownButFine = evaluateFullSyncPlausibility({ upstreamCount: 480, currentActiveCount: 500 });
  assert.deepEqual(grownButFine, { plausible: true });
});

test("evaluateFullSyncPlausibility: below the minimum guarded catalog size, even zero upstream items is allowed through (nothing meaningful to protect yet)", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 0, currentActiveCount: 3 });
  assert.deepEqual(result, { plausible: true });
});

test("evaluateFullSyncPlausibility: a currently-empty DB_PUBLIC (first-ever sync) never blocks on implausibility", () => {
  const result = evaluateFullSyncPlausibility({ upstreamCount: 237, currentActiveCount: 0 });
  assert.deepEqual(result, { plausible: true });
});

// --- applyIncrementalWatermarkMargin ---

test("applyIncrementalWatermarkMargin subtracts the default 300s margin", () => {
  const result = applyIncrementalWatermarkMargin("2026-08-30T10:09:11.000Z");
  assert.equal(result, "2026-08-30T10:04:11.000Z");
});

test("applyIncrementalWatermarkMargin accepts a custom margin", () => {
  const result = applyIncrementalWatermarkMargin("2026-08-30T10:09:11.000Z", 60);
  assert.equal(result, "2026-08-30T10:08:11.000Z");
});

test("applyIncrementalWatermarkMargin never returns a value newer than what was observed (always moves backward)", () => {
  const observed = "2026-08-30T10:09:11.000Z";
  const result = applyIncrementalWatermarkMargin(observed);
  assert.ok(new Date(result).getTime() < new Date(observed).getTime());
});

test("applyIncrementalWatermarkMargin throws on a malformed timestamp rather than silently producing an invalid watermark", () => {
  assert.throws(() => applyIncrementalWatermarkMargin("not-a-timestamp"));
});

test("INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS is the documented 5-minute default", () => {
  assert.equal(INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS, 300);
});
