import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchCatalogMeta, fetchCatalogProductByXid, fetchCatalogProductsPage } from "./odoo-api-client.ts";

/**
 * Never calls the real Odoo Public Catalog API (CLAUDE.md "Do not make
 * normal test suite depend on live Odoo"). Fixtures mirror shapes verified
 * live 2026-08-30 against every product group — see the client file header
 * for the documented-vs-live discrepancies this guards against.
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

const rebarFixture = {
  sku: "AA-RB-AJ340-D10-L12",
  commercial_size: "Ø10",
  section_size: null,
  schedule: "",
  allowed_commercial_units: "kg, ton, branch, bundle",
  inventory_uom: "kg",
  active: true,
  template_name: "Ribbed Rebar Aj340 (A2)",
  name: "[AA-RB-AJ340-D10-L12] Ribbed Rebar Aj340 (A2) (Ø10)",
  id: "ahanassa_marketplace.product_rb_aj340_d10_l12",
  template_id: "ahanassa_marketplace.product_tmpl_rb_aj340",
  classification: {
    family: { code: "LONG_PRODUCTS", name: "Long Products" },
    group: { code: "REBAR", name: "Rebar" },
    form: { code: "RIBBED_REBAR", name: "Ribbed Rebar" },
  },
  grade: { code: "AJ340", name: "Aj340 (market A2)" },
  standard: { code: "INSO3132", name: "INSO 3132" },
  updated_at: "2026-08-30 10:09:11",
  dimensions: { diameter_mm: 10.0, length_mm: 12000.0 },
  // Live-verified field name is `per_branch`, NOT the doc example's `kg_branch` — this fixture is deliberately correct, not the doc's.
  nominal_weight: { kg_m: 0.61654, per_branch: 7.39845 },
};

const metaFixture = {
  families: [{ code: "LONG_PRODUCTS", name: "Long Products" }],
  groups: [{ code: "REBAR", name: "Rebar" }],
  forms: [{ code: "RIBBED_REBAR", name: "Ribbed Rebar" }],
  grades: [{ code: "AJ340", name: "Aj340 (market A2)" }],
  standards: [{ code: "INSO3132", name: "INSO 3132" }],
};

// --- fetchCatalogMeta ---

test("fetchCatalogMeta returns not_configured with no fetch call when ODOO_BASE_URL is unset", async () => {
  delete process.env.ODOO_BASE_URL;
  let called = false;
  globalThis.fetch = mockFetch(() => {
    called = true;
    return new Response("{}", { status: 200 });
  });
  const result = await fetchCatalogMeta();
  assert.equal(called, false);
  assert.equal(result.status, "not_configured");
});

test("fetchCatalogMeta parses a valid meta response and surfaces the ETag", async () => {
  globalThis.fetch = mockFetch((url) => {
    assert.match(url, /\/api\/v1\/catalog\/meta$/);
    return new Response(JSON.stringify({ data: metaFixture, meta: { active_only: true } }), {
      status: 200,
      headers: { etag: '"abc123"' },
    });
  });
  const result = await fetchCatalogMeta();
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data, metaFixture);
  assert.equal(result.etag, '"abc123"');
});

test("fetchCatalogMeta rejects a malformed meta payload rather than trusting it", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ data: { families: "not-an-array" } }), { status: 200 }));
  const result = await fetchCatalogMeta();
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "CATALOG_API_UNEXPECTED_SHAPE");
});

test("fetchCatalogMeta returns not_modified on a 304, never treating it as an error", async () => {
  globalThis.fetch = mockFetch(() => new Response(null, { status: 304 }));
  const result = await fetchCatalogMeta({ ifNoneMatch: '"abc123"' });
  assert.equal(result.status, "not_modified");
});

// --- fetchCatalogProductsPage ---

test("fetchCatalogProductsPage sends documented query parameters and parses list + pagination meta", async () => {
  globalThis.fetch = mockFetch((url) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/api/v1/catalog/products");
    assert.equal(parsed.searchParams.get("page"), "2");
    assert.equal(parsed.searchParams.get("page_size"), "100");
    assert.equal(parsed.searchParams.get("updated_since"), "2026-08-01T00:00:00Z");
    assert.equal(parsed.searchParams.get("group"), "REBAR");
    return new Response(JSON.stringify({ data: [rebarFixture], meta: { page: 2, page_size: 100, total: 237, pages: 3 } }), { status: 200 });
  });
  const result = await fetchCatalogProductsPage({ page: 2, pageSize: 100, updatedSince: "2026-08-01T00:00:00Z", group: "REBAR" });
  assert.equal(result.status, "ok");
  assert.equal(result.data?.items.length, 1);
  assert.equal(result.data?.items[0].id, rebarFixture.id);
  assert.deepEqual(result.data?.meta, { page: 2, page_size: 100, total: 237, pages: 3 });
});

test("fetchCatalogProductsPage tolerates genuinely polymorphic dimensions/nominal_weight shapes across product forms", async () => {
  const sheetFixture = { ...rebarFixture, id: "x.sheet", dimensions: { width_mm: 1500, thickness_mm: 10, length_mm: 6000 }, nominal_weight: { kg_m2: 78.5, per_sheet: 706.5 } };
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ data: [sheetFixture], meta: { page: 1, page_size: 50, total: 1, pages: 1 } }), { status: 200 }));
  const result = await fetchCatalogProductsPage();
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data?.items[0].dimensions, { width_mm: 1500, thickness_mm: 10, length_mm: 6000 });
  assert.deepEqual(result.data?.items[0].nominal_weight, { kg_m2: 78.5, per_sheet: 706.5 });
});

test("fetchCatalogProductsPage returns invalid_request on a 400 (e.g. an out-of-range page_size)", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ error: { code: "invalid_parameter", message: "..." } }), { status: 400 }));
  const result = await fetchCatalogProductsPage({ pageSize: 99999 });
  assert.equal(result.status, "invalid_request");
});

test("fetchCatalogProductsPage rejects a response with malformed items rather than silently dropping fields", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ data: [{ id: "x" }], meta: { page: 1, page_size: 50, total: 1, pages: 1 } }), { status: 200 }));
  const result = await fetchCatalogProductsPage();
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "CATALOG_API_UNEXPECTED_SHAPE");
});

test("fetchCatalogProductsPage treats a network failure as failed, not an empty page", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const result = await fetchCatalogProductsPage();
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "CATALOG_API_NETWORK_ERROR");
});

test("fetchCatalogProductsPage times out and reports failed rather than hanging", async () => {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    await new Promise((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      setTimeout(resolve, 5_000);
    });
    return new Response(JSON.stringify({ data: [], meta: { page: 1, page_size: 50, total: 0, pages: 0 } }), { status: 200 });
  }) as typeof fetch;
  const result = await fetchCatalogProductsPage({}, { timeoutMs: 20 });
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "CATALOG_API_NETWORK_ERROR");
});

// --- fetchCatalogProductByXid ---

test("fetchCatalogProductByXid requests the documented path with locale and parses the product", async () => {
  globalThis.fetch = mockFetch((url) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, `/api/v1/catalog/products/${rebarFixture.id}`);
    assert.equal(parsed.searchParams.get("locale"), "en");
    return new Response(JSON.stringify({ data: rebarFixture, meta: {} }), { status: 200 });
  });
  const result = await fetchCatalogProductByXid(rebarFixture.id, "en");
  assert.equal(result.status, "ok");
  assert.equal(result.data?.sku, rebarFixture.sku);
});

test("fetchCatalogProductByXid returns not_found on a 404 (unknown or inactive), never as a generic failure", async () => {
  globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ error: { code: "not_found", message: "..." } }), { status: 404 }));
  const result = await fetchCatalogProductByXid("does.not.exist");
  assert.equal(result.status, "not_found");
});

test("fetchCatalogProductByXid URL-encodes the XID path segment", async () => {
  globalThis.fetch = mockFetch((url) => {
    assert.match(url, /product%20with%20space/);
    return new Response(JSON.stringify({ data: rebarFixture, meta: {} }), { status: 200 });
  });
  await fetchCatalogProductByXid("product with space");
});
