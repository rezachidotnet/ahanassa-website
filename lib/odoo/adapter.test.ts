import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createOdooAdapter } from "./adapter.ts";
import type { OdooRfqInput } from "./types.ts";

/**
 * Adapter mechanics only — mocked HTTP, per the task's "Mock unit tests
 * are acceptable for adapter mechanics" instruction. Real Odoo write
 * testing is deliberately out of scope for this pass (DAR-026: no API
 * key exists, and this task's safety rules prohibit minting one or
 * writing test CRM/customer records into the only Odoo database Ahan
 * Asa has).
 */

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

interface MockCall {
  url: string;
  body: Record<string, unknown>;
}

function installMockFetch(responses: Array<{ status: number; body: unknown }>): MockCall[] {
  const calls: MockCall[] = [];
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = init?.body ? JSON.parse(init.body as string) : {};
    calls.push({ url, body });
    const next = responses[i++] ?? { status: 500, body: { error: "no mock response queued" } };
    return new Response(JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  process.env.ODOO_BASE_URL = "https://odoo.ahanassa.com";
  process.env.ODOO_DATABASE = "ahanassa";
  process.env.ODOO_API_KEY = "test-key-not-real";
  delete process.env.ODOO_CRM_TEAM_ID;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

const baseInput: OdooRfqInput = {
  localRfqId: "01ARZ3NDEKTSV4RRFFQ6980001",
  referenceNumber: "AA-RFQ-2026-0001",
  contact: { fullName: "Test Buyer", companyName: "Test Co", email: "buyer@example.com", phone: "0311234567" },
  items: [{ label: "Rebar 12mm", quantityText: "200 تن", description: null }],
  message: "Need delivery next month",
  locale: "fa",
  correlationId: "corr-1",
};

test("upsertRfq returns not_configured when credentials are absent", async () => {
  delete process.env.ODOO_BASE_URL;
  delete process.env.ODOO_DATABASE;
  delete process.env.ODOO_API_KEY;
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "not_configured");
  assert.equal(result.reasonCode, "ODOO_CREDENTIALS_NOT_SET");
});

test("upsertRfq is idempotent: an existing lead matched by x_website_rfq_reference is reused, nothing is created", async () => {
  const calls = installMockFetch([{ status: 200, body: [{ id: 4242 }] }]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  assert.deepEqual(result.lead, { id: 4242, model: "crm.lead" });
  assert.equal(calls.length, 1, "only the idempotency lookup should run; no create calls");
  assert.match(calls[0].url, /\/json\/2\/crm\.lead\/search_read$/);
  assert.deepEqual(calls[0].body.domain, [["x_website_rfq_reference", "=", baseInput.referenceNumber]]);
});

test("upsertRfq reuses an existing partner matched by normalized email instead of creating a duplicate", async () => {
  const calls = installMockFetch([
    { status: 200, body: [] }, // crm.lead lookup by x_website_rfq_reference: no existing sync
    { status: 200, body: [{ id: 777 }] }, // res.partner search_read: one match
    { status: 200, body: [9001] }, // crm.lead create
  ]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  assert.deepEqual(result.partner, { id: 777, model: "res.partner" });
  assert.equal(calls.length, 3, "no separate registration call is needed — the reference is set directly on create");
  assert.match(calls[1].url, /\/json\/2\/res\.partner\/search_read$/);
  assert.match(calls[2].url, /\/json\/2\/crm\.lead\/create$/);
  const leadCreateVals = (calls[2].body.vals_list as Array<Record<string, unknown>>)[0];
  assert.equal(leadCreateVals.partner_id, 777);
  assert.equal(leadCreateVals.type, "opportunity");
  assert.equal(leadCreateVals.x_website_rfq_reference, baseInput.referenceNumber);
  assert.ok(!("opportunity_no" in leadCreateVals), "must never attempt to write Odoo's own permanent opportunity_no");
});

test("upsertRfq creates a new partner when no email match exists", async () => {
  const calls = installMockFetch([
    { status: 200, body: [] }, // crm.lead lookup by x_website_rfq_reference
    { status: 200, body: [] }, // res.partner search_read: no match
    { status: 200, body: [555] }, // res.partner create
    { status: 200, body: [9002] }, // crm.lead create
  ]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  assert.deepEqual(result.partner, { id: 555, model: "res.partner" });
  assert.match(calls[2].url, /\/json\/2\/res\.partner\/create$/);
});

test("upsertRfq never auto-merges an ambiguous (>1) partner match", async () => {
  const calls = installMockFetch([
    { status: 200, body: [] }, // crm.lead lookup by x_website_rfq_reference
    { status: 200, body: [{ id: 1 }, { id: 2 }] }, // ambiguous match
    { status: 200, body: [9003] }, // crm.lead create (no partner_id)
  ]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  assert.equal(result.partner, undefined);
  const leadCreateVals = (calls[2].body.vals_list as Array<Record<string, unknown>>)[0];
  assert.ok(!("partner_id" in leadCreateVals));
});

test("upsertRfq sets x_website_rfq_reference on the crm.lead create call itself, in the same write", async () => {
  const calls = installMockFetch([
    { status: 200, body: [] },
    { status: 200, body: [] },
    { status: 200, body: [555] },
    { status: 200, body: [9004] },
  ]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  const createCall = calls.at(-1)!;
  assert.match(createCall.url, /\/json\/2\/crm\.lead\/create$/);
  const vals = (createCall.body.vals_list as Array<Record<string, unknown>>)[0];
  assert.equal(vals.x_website_rfq_reference, baseInput.referenceNumber);
});

test("upsertRfq classifies a 5xx Odoo response as a transient failure", async () => {
  installMockFetch([{ status: 500, body: { message: "internal error" } }]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "ODOO_SERVER_ERROR");
});

test("upsertRfq classifies a 401/403 Odoo response as an auth failure, never leaking the response body", async () => {
  installMockFetch([{ status: 401, body: { message: "invalid bearer token — must not appear in reasonCode" } }]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "ODOO_AUTH_FAILED");
  assert.doesNotMatch(JSON.stringify(result), /invalid bearer token/);
});

test("upsertRfq classifies a network error distinctly from an HTTP error", async () => {
  globalThis.fetch = (async () => {
    throw new Error("fetch failed: ECONNREFUSED");
  }) as typeof fetch;
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "ODOO_NETWORK_ERROR");
});

test("getHealth reports configured:true on a successful cheap read, without touching business-mutating models", async () => {
  const calls = installMockFetch([{ status: 200, body: 3 }]);
  const adapter = createOdooAdapter();
  const health = await adapter.getHealth();
  assert.equal(health.configured, true);
  assert.match(calls[0].url, /\/json\/2\/res\.partner\/search_count$/);
});

test("getHealth reports configured:false with a safe reason code on failure", async () => {
  installMockFetch([{ status: 401, body: {} }]);
  const adapter = createOdooAdapter();
  const health = await adapter.getHealth();
  assert.equal(health.configured, false);
  assert.equal(health.reasonCode, "ODOO_AUTH_FAILED");
});
