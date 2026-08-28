import { test } from "node:test";
import assert from "node:assert/strict";
import { hashIdempotencyKey, isValidIdempotencyKey } from "./idempotency.ts";

test("hashIdempotencyKey is deterministic for the same input", async () => {
  const a = await hashIdempotencyKey("client-key-12345678");
  const b = await hashIdempotencyKey("client-key-12345678");
  assert.equal(a, b);
});

test("hashIdempotencyKey produces different hashes for different keys", async () => {
  const a = await hashIdempotencyKey("client-key-12345678");
  const b = await hashIdempotencyKey("client-key-abcdefgh");
  assert.notEqual(a, b);
});

test("hashIdempotencyKey never returns the raw key", async () => {
  const raw = "client-key-12345678";
  const hashed = await hashIdempotencyKey(raw);
  assert.notEqual(hashed, raw);
  assert.match(hashed, /^[0-9a-f]{64}$/); // SHA-256 hex digest
});

test("isValidIdempotencyKey accepts a plausible client-generated UUID", () => {
  assert.equal(isValidIdempotencyKey("f47ac10b-58cc-4372-a567-0e02b2c3d479"), true);
});

test("isValidIdempotencyKey rejects keys that are too short", () => {
  assert.equal(isValidIdempotencyKey("short"), false);
});

test("isValidIdempotencyKey rejects non-string values", () => {
  assert.equal(isValidIdempotencyKey(12345), false);
  assert.equal(isValidIdempotencyKey(undefined), false);
  assert.equal(isValidIdempotencyKey(null), false);
});

test("isValidIdempotencyKey rejects keys with unexpected characters", () => {
  assert.equal(isValidIdempotencyKey("key with spaces and !!!"), false);
  assert.equal(isValidIdempotencyKey("'; DROP TABLE rfqs; --"), false);
});
