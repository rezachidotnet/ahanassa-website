import { test } from "node:test";
import assert from "node:assert/strict";
import { isLengthMmSupportedForGroup } from "./length-policy.ts";

// --- POST-P3F RFQ length_mm full stack — Product-Aware Visibility ---

test("isLengthMmSupportedForGroup: ANGLE is supported (per required test matrix)", () => {
  assert.equal(isLengthMmSupportedForGroup("ANGLE"), true);
});

test("isLengthMmSupportedForGroup: CHANNEL is supported (per required test matrix)", () => {
  assert.equal(isLengthMmSupportedForGroup("CHANNEL"), true);
});

test("isLengthMmSupportedForGroup: REBAR is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("REBAR"), false);
});

test("isLengthMmSupportedForGroup: BEAMS is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("BEAMS"), false);
});

test("isLengthMmSupportedForGroup: RHS is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("RHS"), false);
});

test("isLengthMmSupportedForGroup: SHS is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("SHS"), false);
});

test("isLengthMmSupportedForGroup: SEAMLESS_PIPE is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("SEAMLESS_PIPE"), false);
});

test("isLengthMmSupportedForGroup: SHEET_PLATE is not supported — length_mm is already part of its own catalog dimensions", () => {
  assert.equal(isLengthMmSupportedForGroup("SHEET_PLATE"), false);
});

test("isLengthMmSupportedForGroup: null/undefined (no product chosen yet, or a Custom row) is never supported — never a guessed default", () => {
  assert.equal(isLengthMmSupportedForGroup(null), false);
  assert.equal(isLengthMmSupportedForGroup(undefined), false);
});

test("isLengthMmSupportedForGroup: an unrecognized/future group code is never supported by default", () => {
  assert.equal(isLengthMmSupportedForGroup("SOME_FUTURE_GROUP"), false);
});
