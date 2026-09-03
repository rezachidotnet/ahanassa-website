import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHomepageScore, resolveHomepageRankingMode, sortByHomepageScore } from "./score.ts";

// Test G: Ranking mode — base ignores auto score; auto uses derived score;
// invalid/missing config falls back to base safely.
// Test H: Ranking stability — zero demand doesn't cause unstable ordering.

test("resolveHomepageRankingMode: 'auto' resolves to auto", () => {
  assert.equal(resolveHomepageRankingMode("auto"), "auto");
});

test("resolveHomepageRankingMode: 'base' resolves to base", () => {
  assert.equal(resolveHomepageRankingMode("base"), "base");
});

test("resolveHomepageRankingMode: undefined safely falls back to base", () => {
  assert.equal(resolveHomepageRankingMode(undefined), "base");
});

test("resolveHomepageRankingMode: any unrecognized string safely falls back to base", () => {
  assert.equal(resolveHomepageRankingMode("AUTO"), "base");
  assert.equal(resolveHomepageRankingMode(""), "base");
  assert.equal(resolveHomepageRankingMode("automatic"), "base");
  assert.equal(resolveHomepageRankingMode("true"), "base");
});

test("computeHomepageScore: base mode completely ignores demandScore", () => {
  const withDemand = computeHomepageScore({ mode: "base", basePriority: 5, demandScore: 999, manualBoost: 0 });
  const withoutDemand = computeHomepageScore({ mode: "base", basePriority: 5, demandScore: 0, manualBoost: 0 });
  assert.equal(withDemand, withoutDemand);
  assert.equal(withDemand, 5);
});

test("computeHomepageScore: auto mode incorporates demandScore", () => {
  const score = computeHomepageScore({ mode: "auto", basePriority: 5, demandScore: 10, manualBoost: 0 });
  assert.equal(score, 15);
});

test("computeHomepageScore: manualBoost applies in both modes", () => {
  assert.equal(computeHomepageScore({ mode: "base", basePriority: 0, demandScore: 100, manualBoost: 3 }), 3);
  assert.equal(computeHomepageScore({ mode: "auto", basePriority: 0, demandScore: 100, manualBoost: 3 }), 103);
});

test("sortByHomepageScore: zero-demand / all-equal-score candidates produce a stable, deterministic order (tiebreak by templateXid)", () => {
  const candidates = [
    { templateXid: "c", score: 0 },
    { templateXid: "a", score: 0 },
    { templateXid: "b", score: 0 },
  ];
  const sorted = sortByHomepageScore(candidates);
  assert.deepEqual(sorted.map((c) => c.templateXid), ["a", "b", "c"]);

  // Re-running against a differently-ordered but identical input set must
  // produce the exact same output order — this is the "stability" property
  // Test H is about, not merely "some order that happens to be sorted".
  const reordered = [candidates[2], candidates[0], candidates[1]];
  const sortedAgain = sortByHomepageScore(reordered);
  assert.deepEqual(sortedAgain.map((c) => c.templateXid), ["a", "b", "c"]);
});

test("sortByHomepageScore: higher score sorts first", () => {
  const candidates = [
    { templateXid: "low", score: 1 },
    { templateXid: "high", score: 10 },
  ];
  const sorted = sortByHomepageScore(candidates);
  assert.deepEqual(sorted.map((c) => c.templateXid), ["high", "low"]);
});

test("sortByHomepageScore does not mutate the input array", () => {
  const candidates = [
    { templateXid: "b", score: 1 },
    { templateXid: "a", score: 2 },
  ];
  const originalOrder = candidates.map((c) => c.templateXid);
  sortByHomepageScore(candidates);
  assert.deepEqual(candidates.map((c) => c.templateXid), originalOrder);
});
