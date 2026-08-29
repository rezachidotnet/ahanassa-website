import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstileToken } from "./turnstile.ts";

/**
 * Never calls the real Siteverify service (CLAUDE.md "Turnstile Testing
 * Strategy") — every case injects a mock fetch/secret via
 * VerifyTurnstileOptions. No real or test Turnstile key is used anywhere
 * in this file.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  }) as typeof fetch;
}

test("verifyTurnstileToken rejects a missing token without calling Siteverify", async () => {
  let called = false;
  const result = await verifyTurnstileToken(undefined, {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => {
      called = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }),
  });
  assert.equal(called, false);
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("verifyTurnstileToken rejects an empty-string token", async () => {
  const result = await verifyTurnstileToken("", { secret: "test-secret-not-real" });
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("verifyTurnstileToken fails closed when no secret is configured (protected-env safety net)", async () => {
  let called = false;
  const result = await verifyTurnstileToken("some-token", {
    secret: undefined,
    fetchImpl: mockFetch(() => {
      called = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }),
  });
  assert.equal(called, false);
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});

test("verifyTurnstileToken rejects when Siteverify returns success:false", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response(JSON.stringify({ success: false, ["error-codes"]: ["invalid-input-response"] }), { status: 200 })),
  });
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("verifyTurnstileToken rejects a token minted for a different action", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response(JSON.stringify({ success: true, action: "some_other_action" }), { status: 200 })),
  });
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("verifyTurnstileToken accepts a valid token with the matching action", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response(JSON.stringify({ success: true, action: "rfq_submit" }), { status: 200 })),
  });
  assert.deepEqual(result, { ok: true });
});

test("verifyTurnstileToken accepts a valid token when Siteverify omits action", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 })),
  });
  assert.deepEqual(result, { ok: true });
});

test("verifyTurnstileToken treats a Siteverify network failure as unavailable, not invalid", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => {
      throw new Error("network down");
    }),
  });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});

test("verifyTurnstileToken treats a non-OK HTTP response as unavailable", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response("service down", { status: 503 })),
  });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});

test("verifyTurnstileToken treats a malformed (non-JSON) response as unavailable", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch(() => new Response("not json", { status: 200 })),
  });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});

test("verifyTurnstileToken times out and reports unavailable rather than hanging", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    timeoutMs: 20,
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      await new Promise((resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        setTimeout(resolve, 5_000);
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});

test("verifyTurnstileToken sends the token and secret via POST body, never as a query string", async () => {
  const result = await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    fetchImpl: mockFetch((url, init) => {
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.equal(init?.method, "POST");
      assert.doesNotMatch(url, /[?&](response|secret)=/);
      const params = new URLSearchParams(init?.body as string);
      assert.equal(params.get("response"), "some-token");
      assert.equal(params.get("secret"), "test-secret-not-real");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }),
  });
  assert.deepEqual(result, { ok: true });
});

test("verifyTurnstileToken forwards remoteIp as remoteip when provided", async () => {
  await verifyTurnstileToken("some-token", {
    secret: "test-secret-not-real",
    remoteIp: "203.0.113.5",
    fetchImpl: mockFetch((_url, init) => {
      const params = new URLSearchParams(init?.body as string);
      assert.equal(params.get("remoteip"), "203.0.113.5");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }),
  });
});
