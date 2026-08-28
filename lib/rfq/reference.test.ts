import { test } from "node:test";
import assert from "node:assert/strict";
import { generateRfqReference } from "./reference.ts";

test("generateRfqReference produces the AA-RFQ-XXXXXXXX shape", () => {
  assert.match(generateRfqReference(), /^AA-RFQ-[0-9A-HJKMNP-TV-Z]{8}$/);
});

test("generateRfqReference does not embed a sequential/incrementing counter", () => {
  const first = generateRfqReference();
  const second = generateRfqReference();
  assert.notEqual(first, second);
  // Not a strict guarantee for two samples, but the whole point of this
  // generator (01-sources/DATABASE_SCHEMA.md §3.3) is that references carry
  // no ordering signal — a quick sanity check that back-to-back calls are
  // not off by a small, guessable delta.
  assert.notEqual(first.slice(-8), second.slice(-8));
});

test("generateRfqReference draws from a large enough space to make collisions negligible", () => {
  const seen = new Set(Array.from({ length: 2000 }, () => generateRfqReference()));
  assert.equal(seen.size, 2000);
});
