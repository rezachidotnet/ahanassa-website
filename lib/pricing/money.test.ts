import { test } from "node:test";
import assert from "node:assert/strict";
import { tomanToExactRial, rialToTomanForDisplay } from "./money.ts";

test("tomanToExactRial converts by exact integer multiplication", () => {
  assert.equal(tomanToExactRial(7110), 71100);
  assert.equal(tomanToExactRial(0), 0);
});

test("rialToTomanForDisplay truncates exactly for a whole multiple of 10", () => {
  const result = rialToTomanForDisplay(71100);
  assert.deepEqual(result, { toman: 7110, hadRemainder: false });
});

test("rialToTomanForDisplay truncates deterministically and flags a non-multiple-of-10 anomaly, never rounds unpredictably", () => {
  const result = rialToTomanForDisplay(71105);
  assert.deepEqual(result, { toman: 7110, hadRemainder: true });
});

test("rialToTomanForDisplay never throws on an odd remainder", () => {
  assert.doesNotThrow(() => rialToTomanForDisplay(1));
  assert.deepEqual(rialToTomanForDisplay(1), { toman: 0, hadRemainder: true });
});

test("round-trip: a Toman-origin value survives conversion to Rial and back with no remainder", () => {
  const rial = tomanToExactRial(12345);
  const back = rialToTomanForDisplay(rial);
  assert.deepEqual(back, { toman: 12345, hadRemainder: false });
});
