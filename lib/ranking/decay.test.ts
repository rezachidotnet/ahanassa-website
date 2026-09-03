import { test } from "node:test";
import assert from "node:assert/strict";
import { ageInDaysSince, exponentialDecayWeight, DEMAND_HALF_LIFE_DAYS } from "./decay.ts";

// Test I (this task's Required Tests): Demand decay — more recent
// equivalent demand weighted higher than older.

test("exponentialDecayWeight is 1.0 at age 0", () => {
  assert.equal(exponentialDecayWeight(0), 1);
});

test("exponentialDecayWeight is exactly 0.5 at one half-life", () => {
  assert.ok(Math.abs(exponentialDecayWeight(DEMAND_HALF_LIFE_DAYS) - 0.5) < 1e-9);
});

test("exponentialDecayWeight is exactly 0.25 at two half-lives", () => {
  assert.ok(Math.abs(exponentialDecayWeight(DEMAND_HALF_LIFE_DAYS * 2) - 0.25) < 1e-9);
});

test("exponentialDecayWeight strictly decreases as age increases (recency preference)", () => {
  const w0 = exponentialDecayWeight(1);
  const w1 = exponentialDecayWeight(10);
  const w2 = exponentialDecayWeight(60);
  assert.ok(w0 > w1);
  assert.ok(w1 > w2);
});

test("exponentialDecayWeight never negative, never exceeds 1", () => {
  for (const age of [0, 0.5, 1, 30, 365, 10000]) {
    const w = exponentialDecayWeight(age);
    assert.ok(w >= 0 && w <= 1);
  }
});

test("exponentialDecayWeight returns 0 for a negative age (defensive, should not occur in practice)", () => {
  assert.equal(exponentialDecayWeight(-5), 0);
});

test("exponentialDecayWeight returns 0 for a non-finite or non-positive half-life", () => {
  assert.equal(exponentialDecayWeight(10, 0), 0);
  assert.equal(exponentialDecayWeight(10, -5), 0);
  assert.equal(exponentialDecayWeight(10, NaN), 0);
});

test("ageInDaysSince computes whole-day distance correctly", () => {
  const now = Date.parse("2026-02-01T00:00:00.000Z");
  const occurredAt = "2026-01-01T00:00:00.000Z";
  assert.equal(ageInDaysSince(occurredAt, now), 31);
});

test("ageInDaysSince treats a future/clock-skewed timestamp as age 0, never negative", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const occurredAt = "2026-06-01T00:00:00.000Z";
  assert.equal(ageInDaysSince(occurredAt, now), 0);
});

test("ageInDaysSince returns +Infinity for an unparsable timestamp (decays to zero weight, never crashes)", () => {
  const age = ageInDaysSince("not-a-timestamp", Date.now());
  assert.equal(age, Number.POSITIVE_INFINITY);
  assert.equal(exponentialDecayWeight(age), 0);
});
