import { test } from "node:test";
import assert from "node:assert/strict";
import { ulid } from "./ulid.ts";

const CROCKFORD_26 = /^[0-9A-HJKMNP-TV-Z]{26}$/;

test("ulid produces a 26-character Crockford Base32 string", () => {
  assert.match(ulid(), CROCKFORD_26);
});

test("ulid is monotonically non-decreasing in its time prefix across calls", () => {
  const a = ulid(1_700_000_000_000);
  const b = ulid(1_700_000_000_001);
  assert.ok(a.slice(0, 10) <= b.slice(0, 10));
  assert.notEqual(a, b);
});

test("ulid generates distinct values across repeated calls at the same instant", () => {
  const t = Date.now();
  const values = new Set(Array.from({ length: 50 }, () => ulid(t)));
  assert.equal(values.size, 50);
});
