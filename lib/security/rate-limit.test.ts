import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRateLimit, hashRateLimitKey, getClientIp, type RateLimiterBinding } from "./rate-limit.ts";

/**
 * Never depends on Cloudflare's distributed counter timing (CLAUDE.md
 * "Rate Limiting Tests") — the binding itself is mocked in every case.
 */

function fakeLimiter(success: boolean): { binding: RateLimiterBinding; calls: Array<{ key: string }> } {
  const calls: Array<{ key: string }> = [];
  return {
    binding: {
      async limit(options) {
        calls.push(options);
        return { success };
      },
    },
    calls,
  };
}

test("evaluateRateLimit allows the request when the binding permits it", async () => {
  const { binding } = fakeLimiter(true);
  const result = await evaluateRateLimit(binding, "203.0.113.5");
  assert.deepEqual(result, { allowed: true });
});

test("evaluateRateLimit rejects the request when the binding denies it", async () => {
  const { binding } = fakeLimiter(false);
  const result = await evaluateRateLimit(binding, "203.0.113.5");
  assert.deepEqual(result, { allowed: false });
});

test("evaluateRateLimit fails open when the binding is not configured", async () => {
  const result = await evaluateRateLimit(undefined, "203.0.113.5");
  assert.deepEqual(result, { allowed: true });
});

test("evaluateRateLimit never sends the raw IP as the limiter key", async () => {
  const { binding, calls } = fakeLimiter(true);
  await evaluateRateLimit(binding, "203.0.113.5");
  assert.equal(calls.length, 1);
  assert.notEqual(calls[0].key, "203.0.113.5");
  assert.doesNotMatch(calls[0].key, /203\.0\.113\.5/);
});

test("evaluateRateLimit derives the same key for the same IP (limiter buckets consistently)", async () => {
  const { binding: b1, calls: c1 } = fakeLimiter(true);
  const { binding: b2, calls: c2 } = fakeLimiter(true);
  await evaluateRateLimit(b1, "203.0.113.5");
  await evaluateRateLimit(b2, "203.0.113.5");
  assert.equal(c1[0].key, c2[0].key);
});

test("evaluateRateLimit derives different keys for different IPs", async () => {
  const { binding: b1, calls: c1 } = fakeLimiter(true);
  const { binding: b2, calls: c2 } = fakeLimiter(true);
  await evaluateRateLimit(b1, "203.0.113.5");
  await evaluateRateLimit(b2, "198.51.100.9");
  assert.notEqual(c1[0].key, c2[0].key);
});

test("hashRateLimitKey is a hex SHA-256 digest, not the raw IP", async () => {
  const key = await hashRateLimitKey("203.0.113.5");
  assert.match(key, /^[0-9a-f]{64}$/);
});

test("getClientIp reads the Cloudflare-injected header", () => {
  const request = new Request("https://example.com/api/rfqs", { headers: { "cf-connecting-ip": "203.0.113.5" } });
  assert.equal(getClientIp(request), "203.0.113.5");
});

test("getClientIp never trusts a client-supplied X-Forwarded-For", () => {
  const request = new Request("https://example.com/api/rfqs", { headers: { "x-forwarded-for": "1.2.3.4" } });
  assert.equal(getClientIp(request), "unknown");
});
