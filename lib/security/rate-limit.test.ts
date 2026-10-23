import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRateLimit, hashRateLimitKey, getClientIp, ipv4InRanges, type RateLimiterBinding } from "./rate-limit.ts";
import { ARVAN_IP_RANGES, ARVAN_IP_RANGES_FETCHED, ARVAN_IP_RANGES_SOURCE } from "../../config/arvan-ip-ranges.ts";

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

// --- W27 Iran mirror: Arvan's X-Real-IP only from Arvan's published ranges (config/arvan-ip-ranges.ts) ---------

const req = (headers: Record<string, string>) => new Request("https://api.ahanassa.com/api/rfqs", { headers });

test("getClientIp uses Arvan's X-Real-IP when CF-Connecting-IP is an Arvan edge", () => {
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.233.10", "x-real-ip": "5.120.33.7" })), "5.120.33.7");
  // Range edges: first and last address of a /22 and of a /30.
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.232.0", "x-real-ip": "5.120.33.7" })), "5.120.33.7");
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.235.255", "x-real-ip": "5.120.33.7" })), "5.120.33.7");
  assert.equal(getClientIp(req({ "cf-connecting-ip": "188.229.116.19", "x-real-ip": "2a01:5ec0::1" })), "2a01:5ec0::1");
});

test("getClientIp ignores a spoofed X-Real-IP from a non-Arvan address", () => {
  assert.equal(getClientIp(req({ "cf-connecting-ip": "203.0.113.5", "x-real-ip": "5.120.33.7" })), "203.0.113.5");
  // Just outside the ranges: one past a /22 and one before a /30.
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.236.0", "x-real-ip": "5.120.33.7" })), "185.143.236.0");
  assert.equal(getClientIp(req({ "cf-connecting-ip": "188.229.116.15", "x-real-ip": "5.120.33.7" })), "188.229.116.15");
  // An IPv6 connecting address is never Arvan (the published list is IPv4 only).
  assert.equal(getClientIp(req({ "cf-connecting-ip": "2001:db8::1", "x-real-ip": "5.120.33.7" })), "2001:db8::1");
  // No CF-Connecting-IP at all: the header alone is never enough.
  assert.equal(getClientIp(req({ "x-real-ip": "5.120.33.7" })), "unknown");
});

test("getClientIp falls back to the Arvan edge when its X-Real-IP is missing or not a bare IP", () => {
  for (const bad of ["", "5.120.33.7, 10.0.0.1", "5.120.33.7:443", "256.1.1.1", "not-an-ip", "01.2.3.4"]) {
    assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.233.10", "x-real-ip": bad })), "185.143.233.10", JSON.stringify(bad));
  }
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.233.10" })), "185.143.233.10");
  // X-Forwarded-For is never read, even from Arvan.
  assert.equal(getClientIp(req({ "cf-connecting-ip": "185.143.233.10", "x-forwarded-for": "5.120.33.7" })), "185.143.233.10");
});

test("ipv4InRanges: CIDR arithmetic and malformed input", () => {
  assert.equal(ipv4InRanges("10.1.2.3", ["10.0.0.0/8"]), true);
  assert.equal(ipv4InRanges("11.0.0.0", ["10.0.0.0/8"]), false);
  assert.equal(ipv4InRanges("1.2.3.4", ["0.0.0.0/0"]), true);
  assert.equal(ipv4InRanges("1.2.3.4", ["1.2.3.4/32"]), true);
  assert.equal(ipv4InRanges("1.2.3.5", ["1.2.3.4/32"]), false);
  assert.equal(ipv4InRanges("1.2.3.4", ["1.2.3.0/33", "garbage", "1.2.3/24"]), false);
  assert.equal(ipv4InRanges("1.2.3", ["1.2.3.0/24"]), false);
});

test("the Arvan range list is well-formed IPv4 CIDRs with its source recorded", () => {
  assert.equal(ARVAN_IP_RANGES_SOURCE, "https://www.arvancloud.ir/en/ips.txt");
  assert.match(ARVAN_IP_RANGES_FETCHED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(ARVAN_IP_RANGES.length > 0);
  for (const cidr of ARVAN_IP_RANGES) {
    assert.match(cidr, /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/);
    // The base address is the network address itself (no host bits set).
    assert.equal(ipv4InRanges(cidr.split("/")[0], [cidr]), true);
  }
});
