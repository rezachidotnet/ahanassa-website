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

test("upsertRfq's idempotency lookup includes archived leads (active_test: false), so archiving a synced lead never breaks redelivery reuse", async () => {
  // DAR-028: Odoo's ORM implicitly filters to active=True on any model with
  // an `active` field unless context.active_test is explicitly false —
  // verified live against odoo/orm/models.py `_search`. Without this, a
  // "Mark Lost" archive action on the crm.lead would make this lookup miss
  // it, and a later redelivery would incorrectly retry/fail instead of
  // reusing the existing (archived) lead.
  const calls = installMockFetch([{ status: 200, body: [{ id: 4242 }] }]);
  const adapter = createOdooAdapter();
  await adapter.upsertRfq(baseInput);
  assert.deepEqual(calls[0].body.context, { active_test: false });
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

test("upsertRfq never lets the technical integration user become the opportunity's salesperson", async () => {
  // DAR-029: crm.lead.user_id defaults to the authenticated API user
  // (odoo/addons/crm/models/crm_lead.py `default=lambda self: self.env.user`,
  // verified live) unless the create() payload explicitly overrides it. The
  // adapter authenticates as the dedicated integration user, so an omitted
  // user_id would silently make that technical account the opportunity's
  // "Salesperson" — not the intended business architecture. Real
  // salesperson assignment must remain an explicit staff/team decision,
  // never a side effect of which account happened to call the API.
  const calls = installMockFetch([
    { status: 200, body: [] }, // crm.lead lookup by x_website_rfq_reference
    { status: 200, body: [] }, // res.partner search_read: no match
    { status: 200, body: [555] }, // res.partner create
    { status: 200, body: [9005] }, // crm.lead create
  ]);
  const adapter = createOdooAdapter();
  const result = await adapter.upsertRfq(baseInput);
  assert.equal(result.status, "synced");
  const createCall = calls.at(-1)!;
  assert.match(createCall.url, /\/json\/2\/crm\.lead\/create$/);
  const vals = (createCall.body.vals_list as Array<Record<string, unknown>>)[0];
  assert.equal(vals.user_id, false, "user_id must be explicitly cleared, never left to Odoo's self.env.user default");
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

test("pullCatalog returns not_configured with empty arrays when Odoo credentials are absent, without calling fetch", async () => {
  delete process.env.ODOO_BASE_URL;
  delete process.env.ODOO_DATABASE;
  delete process.env.ODOO_API_KEY;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  const adapter = createOdooAdapter();
  const result = await adapter.pullCatalog();
  assert.equal(called, false);
  assert.deepEqual(result, { status: "not_configured", reasonCode: "ODOO_CREDENTIALS_NOT_SET", categories: [], products: [], variants: [], units: [] });
});

test("pullCatalog returns status:pulled with the mapped rows on success, never requesting price fields", async () => {
  const categoryRows = [{ id: 42, name: "Rebar", parent_id: false, complete_name: "Rebar", active: true }];
  const productRows = [{ id: 100, name: "Rebar 16", default_code: "REBAR-16", categ_id: [42, "Rebar"], sale_ok: true, active: true, uom_id: false, write_date: "2026-08-01T00:00:00Z" }];
  const variantRows = [{ id: 500, product_tmpl_id: [100, "Rebar 16"], default_code: "REBAR-16-A3", active: true, write_date: "2026-08-01T00:00:00Z" }];
  const unitRows = [{ id: 16, name: { en_US: "kg", fa_IR: "کیلوگرم" }, active: true, relative_uom_id: false }];

  const calls = installMockFetch([
    { status: 200, body: categoryRows },
    { status: 200, body: productRows },
    { status: 200, body: variantRows },
    { status: 200, body: unitRows },
  ]);

  const adapter = createOdooAdapter();
  const result = await adapter.pullCatalog();

  assert.equal(result.status, "pulled");
  assert.deepEqual(result.categories, categoryRows);
  assert.deepEqual(result.products, productRows);
  assert.deepEqual(result.variants, variantRows);
  assert.deepEqual(result.units, unitRows);

  assert.match(calls[0].url, /\/json\/2\/product\.category\/search_read$/);
  assert.match(calls[1].url, /\/json\/2\/product\.template\/search_read$/);
  assert.match(calls[2].url, /\/json\/2\/product\.product\/search_read$/);
  assert.match(calls[3].url, /\/json\/2\/uom\.uom\/search_read$/);

  for (const call of calls) {
    const fields: string[] = (call.body.fields as string[] | undefined) ?? [];
    assert.equal(fields.includes("list_price"), false);
    assert.equal(fields.includes("standard_price"), false);
    assert.equal(fields.includes("lst_price"), false);
  }
});

test("pullCatalog returns status:failed with empty arrays (never a partial catalog) when one call fails", async () => {
  installMockFetch([
    { status: 200, body: [] },
    { status: 200, body: [] },
    { status: 500, body: { error: "boom" } },
    { status: 200, body: [] },
  ]);

  const adapter = createOdooAdapter();
  const result = await adapter.pullCatalog();
  assert.equal(result.status, "failed");
  assert.equal(result.categories.length, 0);
  assert.equal(result.products.length, 0);
  assert.equal(result.variants.length, 0);
  assert.equal(result.units.length, 0);
});
