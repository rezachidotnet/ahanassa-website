import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchProcessingGroups } from "./odoo-api-client.ts";

/**
 * Never calls the real Odoo Processing API (CLAUDE.md "Do not make normal
 * test suite depend on live Odoo") — and, unlike `lib/catalog/odoo-api-client.test.ts`,
 * there is no live-verified contract to mirror in the first place (see this
 * client's file header). Fixtures use exactly the shape given to the P5
 * task.
 */

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ODOO_BASE_URL = "https://odoo.ahanassa.com";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function mockFetch(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => handler(typeof input === "string" ? input : input.toString(), init)) as typeof fetch;
}

const groupFixture = { id: "SHEET_PROCESSING", name: "فرآوری ورق", sequence: 10, active: true, updated_at: "2026-09-01 10:00:00" };

function envelope(items: unknown[], total = items.length) {
  return JSON.stringify({ data: items, meta: { total } });
}

// --- not_configured ---

test("fetchProcessingGroups returns not_configured with no fetch call when ODOO_BASE_URL is unset", async () => {
  delete process.env.ODOO_BASE_URL;
  let called = false;
  globalThis.fetch = mockFetch(() => {
    called = true;
    return new Response("{}", { status: 200 });
  });
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "not_configured");
  assert.equal(called, false);
});

// --- happy path ---

test("fetchProcessingGroups returns ok with items/meta/etag on 200", async () => {
  globalThis.fetch = mockFetch((url) => {
    assert.match(url, /\/api\/v1\/processing\/groups\?locale=fa$/);
    return new Response(envelope([groupFixture]), { status: 200, headers: { etag: '"abc123"' } });
  });
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "ok");
  assert.equal(result.items?.length, 1);
  assert.equal(result.items?.[0].id, "SHEET_PROCESSING");
  assert.equal(result.meta?.total, 1);
  assert.equal(result.etag, '"abc123"');
});

test("fetchProcessingGroups sends If-None-Match when a prior etag is supplied", async () => {
  let sentHeader: string | null = null;
  globalThis.fetch = mockFetch((_url, init) => {
    sentHeader = (init?.headers as Record<string, string> | undefined)?.["If-None-Match"] ?? null;
    return new Response(envelope([]), { status: 200 });
  });
  await fetchProcessingGroups({ locale: "en", ifNoneMatch: '"prev-etag"' });
  assert.equal(sentHeader, '"prev-etag"');
});

// --- 304 ---

test("fetchProcessingGroups treats 304 as not_modified, never as an error", async () => {
  globalThis.fetch = mockFetch(() => new Response(null, { status: 304 }));
  const result = await fetchProcessingGroups({ locale: "fa", ifNoneMatch: '"prev-etag"' });
  assert.equal(result.status, "not_modified");
  assert.equal(result.etag, '"prev-etag"');
});

// --- empty dataset (valid) ---

test("fetchProcessingGroups accepts a well-formed empty dataset as ok, not failed", async () => {
  globalThis.fetch = mockFetch(() => new Response(envelope([], 0), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "ar" });
  assert.equal(result.status, "ok");
  assert.deepEqual(result.items, []);
  assert.equal(result.meta?.total, 0);
});

// --- failures ---

test("fetchProcessingGroups fails on upstream 500", async () => {
  globalThis.fetch = mockFetch(() => new Response("boom", { status: 500 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_SERVER_ERROR");
});

test("fetchProcessingGroups fails on malformed (non-JSON) body", async () => {
  globalThis.fetch = mockFetch(() => new Response("not json{{{", { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_MALFORMED_JSON");
});

test("fetchProcessingGroups fails when data is missing/not an array", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ meta: { total: 0 } }), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_UNEXPECTED_SHAPE");
});

test("fetchProcessingGroups fails when meta.total is missing", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ data: [] }), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_UNEXPECTED_SHAPE");
});

test("fetchProcessingGroups fails when an item is missing a required field", async () => {
  const badItem = { ...groupFixture, name: undefined };
  globalThis.fetch = mockFetch(() => new Response(envelope([badItem]), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_MALFORMED_RECORD");
});

test("fetchProcessingGroups fails when an item's id is an empty string", async () => {
  globalThis.fetch = mockFetch(() => new Response(envelope([{ ...groupFixture, id: "" }]), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_MALFORMED_RECORD");
});

test("fetchProcessingGroups fails when sequence is not a finite number", async () => {
  globalThis.fetch = mockFetch(() => new Response(envelope([{ ...groupFixture, sequence: Number.NaN }]), { status: 200 }));
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_MALFORMED_RECORD");
});

test("fetchProcessingGroups fails on network error", async () => {
  globalThis.fetch = mockFetch(() => {
    throw new Error("network down");
  });
  const result = await fetchProcessingGroups({ locale: "fa" });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_NETWORK_OR_TIMEOUT");
});

test("fetchProcessingGroups times out and reports failed rather than hanging", async () => {
  globalThis.fetch = mockFetch(() => {
    throw Object.assign(new Error("aborted"), { name: "AbortError" });
  });
  const result = await fetchProcessingGroups({ locale: "fa", timeoutMs: 5 });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "PROCESSING_API_NETWORK_OR_TIMEOUT");
});
