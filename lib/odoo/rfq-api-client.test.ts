import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { postRfqToOdoo } from "./rfq-api-client.ts";
import type { RfqApiRequest } from "./rfq-api-types.ts";

/**
 * Client mechanics only — mocked HTTP, mirroring lib/odoo/adapter.test.ts's
 * own established pattern. Real Odoo write testing is deliberately out of
 * scope (Phase 6B report's own verdict: "NOT READY FOR CLOUDFLARE RFQ
 * INTEGRATION" — no bearer secret is configured on the runtime yet). See
 * docs/ODOO_RFQ_API_INTEGRATION.md "Live Odoo test".
 */

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

interface MockCall {
  url: string;
  headers: Record<string, string>;
  body: RfqApiRequest;
}

function installMockFetch(responses: Array<{ status: number; body: unknown }>): MockCall[] {
  const calls: MockCall[] = [];
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}));
    const body = init?.body ? JSON.parse(init.body as string) : {};
    calls.push({ url, headers, body });
    const next = responses[i++] ?? { status: 500, body: { error: { code: "no_mock_response_queued", message: "" } } };
    return new Response(JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  process.env.ODOO_BASE_URL = "https://odoo.ahanassa.com";
  process.env.ODOO_RFQ_API_TOKEN = "test-token-not-real";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

const payload: RfqApiRequest = {
  locale: "fa",
  customer: { name: "Ali Ahmadi", phone: "09121234567" },
  items: [{ product_variant_xid: "ahanassa_marketplace.product_rb_aj340_d16_l12", quantity: 5, uom: "branch" }],
  source: { utm_source: "website" },
};
const idempotencyKey = "rfq-01ARZ3NDEKTSV4RRFFQ6980001";

test("postRfqToOdoo returns not_configured when ODOO_RFQ_API_TOKEN is absent", async () => {
  delete process.env.ODOO_RFQ_API_TOKEN;
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "not_configured");
});

test("postRfqToOdoo posts to POST /api/v1/rfq with Bearer auth and the Idempotency-Key header", async () => {
  const calls = installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false } } }]);
  await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/v1\/rfq$/);
  assert.equal(calls[0].headers.Authorization, "Bearer test-token-not-real");
  assert.equal(calls[0].headers["Idempotency-Key"], idempotencyKey);
  assert.equal(calls[0].headers["Content-Type"], "application/json");
});

test("postRfqToOdoo sends the exact payload given, unmodified", async () => {
  const calls = installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false } } }]);
  await postRfqToOdoo(payload, idempotencyKey);
  assert.deepEqual(calls[0].body, payload);
});

// --- 201 creation ---

test("postRfqToOdoo classifies 201 as created and captures the reference", async () => {
  installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  assert.equal(result.reference, "RFQ-2026-000123");
});

test("postRfqToOdoo captures verification_session when present on a 201, without altering behavior when absent", async () => {
  installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false }, verification_session: "opaque-token-abc" } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  assert.equal(result.verificationSession, "opaque-token-abc");
});

test("postRfqToOdoo works correctly when verification_session is absent from the response (RFQ_API_CONTRACT_V1.md's own worked example omits it)", async () => {
  installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  assert.equal(result.verificationSession, undefined);
});

// --- 200 idempotent replay ---

test("postRfqToOdoo classifies 200 as replayed and returns the same reference, treated as success", async () => {
  installMockFetch([{ status: 200, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: true } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "replayed");
  if (result.status !== "replayed") return;
  assert.equal(result.reference, "RFQ-2026-000123");
});

// --- error classification (Stage F) ---

test("postRfqToOdoo classifies 400 as invalid_payload (terminal)", async () => {
  installMockFetch([{ status: 400, body: { error: { code: "invalid_customer", message: "name is required" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "invalid_payload");
});

test("postRfqToOdoo classifies 401 as unauthorized, a credential/configuration failure", async () => {
  installMockFetch([{ status: 401, body: { error: { code: "unauthorized", message: "bad bearer token — must never leak" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "unauthorized");
  assert.doesNotMatch(JSON.stringify(result), /bad bearer token/);
});

test("postRfqToOdoo classifies 409 as idempotency_conflict (terminal, high priority)", async () => {
  installMockFetch([{ status: 409, body: { error: { code: "idempotency_conflict", message: "same key, different body" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "idempotency_conflict");
});

test("postRfqToOdoo classifies 413 as payload_too_large (terminal)", async () => {
  installMockFetch([{ status: 413, body: { error: { code: "payload_too_large", message: "" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "payload_too_large");
});

test("postRfqToOdoo classifies 415 as unsupported_media_type (terminal)", async () => {
  installMockFetch([{ status: 415, body: { error: { code: "unsupported_media_type", message: "" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "unsupported_media_type");
});

test("postRfqToOdoo classifies 500 as server_error (retryable per existing Queue policy)", async () => {
  installMockFetch([{ status: 500, body: { error: { code: "internal_error", message: "" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "server_error");
});

test("postRfqToOdoo classifies a network/timeout failure distinctly, as retryable", async () => {
  globalThis.fetch = (async () => {
    throw new Error("fetch failed: ECONNREFUSED");
  }) as typeof fetch;
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "network_error");
});

test("postRfqToOdoo treats a malformed (non-JSON) success response safely, never crashing", async () => {
  globalThis.fetch = (async () => new Response("not json", { status: 201 })) as typeof fetch;
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "malformed_response");
});

test("postRfqToOdoo treats an unexpected success shape (missing data.reference) as malformed, never crashing or fabricating a reference", async () => {
  installMockFetch([{ status: 201, body: { meta: { idempotent_replay: false } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.equal(result.status, "malformed_response");
});

// --- security: no secret/PII leakage in the returned result ---

test("postRfqToOdoo never echoes the bearer token in its result", async () => {
  installMockFetch([{ status: 201, body: { data: { reference: "RFQ-2026-000123", status: "received" }, meta: { idempotent_replay: false } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.doesNotMatch(JSON.stringify(result), /test-token-not-real/);
});

test("postRfqToOdoo never forwards a raw error message body verbatim (only a safe derived code)", async () => {
  installMockFetch([{ status: 400, body: { error: { code: "invalid_customer", message: "raw internal detail that must not leak: stack trace at models.py:42" } } }]);
  const result = await postRfqToOdoo(payload, idempotencyKey);
  assert.doesNotMatch(JSON.stringify(result), /models\.py/);
});

// --- idempotency key validation (defense in depth) ---

test("postRfqToOdoo refuses to send a malformed idempotency key rather than forwarding it to Odoo", async () => {
  const calls = installMockFetch([{ status: 201, body: {} }]);
  const result = await postRfqToOdoo(payload, "a".repeat(200));
  assert.equal(result.status, "invalid_payload");
  assert.equal(calls.length, 0, "must never reach the network with an invalid key");
});
