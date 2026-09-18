import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchGroupLabelsForLocale } from "./group-label-sync.ts";

/**
 * Never calls the real Odoo Public Catalog API (CLAUDE.md "Do not make
 * normal test suite depend on live Odoo") — matches
 * lib/catalog/odoo-api-client.test.ts's own established fixture/mock
 * convention exactly.
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

function mockFetch(handler: (url: string) => Response): typeof fetch {
  return (async (input: RequestInfo | URL) => handler(typeof input === "string" ? input : input.toString())) as typeof fetch;
}

function productFixture(overrides: Partial<{ group_code: string; group_name: string; sku: string }> = {}) {
  const groupCode = overrides.group_code ?? "REBAR";
  const groupName = overrides.group_name ?? "Rebar";
  return {
    sku: overrides.sku ?? "AA-RB-AJ340-D10-L12",
    commercial_size: "Ø10",
    section_size: null,
    schedule: "",
    allowed_commercial_units: "kg, ton",
    inventory_uom: "kg",
    active: true,
    template_name: "Ribbed Rebar Aj340 (A2)",
    name: "[AA-RB-AJ340-D10-L12] Ribbed Rebar Aj340 (A2) (Ø10)",
    id: `ahanassa_marketplace.product_${groupCode.toLowerCase()}_1`,
    template_id: `ahanassa_marketplace.product_tmpl_${groupCode.toLowerCase()}`,
    canonical_id: `CVAR-${groupCode}-${overrides.sku ?? "1"}`,
    canonical_template_id: `CTMPL-${groupCode}`,
    classification: {
      family: { code: "LONG_PRODUCTS", name: "Long Products" },
      group: { code: groupCode, name: groupName },
      form: { code: "RIBBED_REBAR", name: "Ribbed Rebar" },
    },
    grade: { code: "AJ340", name: "Aj340 (market A2)" },
    standard: { code: "INSO3132", name: "INSO 3132" },
    updated_at: "2026-08-30 10:09:11",
    dimensions: { diameter_mm: 10.0, length_mm: 12000.0 },
    nominal_weight: { kg_m: 0.61654 },
  };
}

test("fetchGroupLabelsForLocale returns a distinct code->name pair per group observed across the requested locale's paginated results", async () => {
  globalThis.fetch = mockFetch((url) => {
    assert.ok(url.includes("locale=en"), "must request the exact locale it was asked for");
    return Response.json({
      data: [productFixture({ group_code: "REBAR", group_name: "Rebar" }), productFixture({ group_code: "SHS", group_name: "SHS" })],
      meta: { page: 1, page_size: 100, total: 2, pages: 1 },
    });
  });

  const result = await fetchGroupLabelsForLocale("en");
  assert.equal(result.status, "ok");
  assert.deepEqual(
    result.labels.sort((a, b) => a.code.localeCompare(b.code)),
    [
      { code: "REBAR", name: "Rebar" },
      { code: "SHS", name: "SHS" },
    ],
  );
});

test("deduplicates the same group_code appearing on multiple items/pages, keeping one entry", async () => {
  let call = 0;
  globalThis.fetch = mockFetch(() => {
    call += 1;
    if (call === 1) {
      return Response.json({
        data: [productFixture({ group_code: "REBAR", group_name: "Rebar", sku: "A" }), productFixture({ group_code: "REBAR", group_name: "Rebar", sku: "B" })],
        meta: { page: 1, page_size: 100, total: 3, pages: 2 },
      });
    }
    return Response.json({
      data: [productFixture({ group_code: "REBAR", group_name: "Rebar", sku: "C" })],
      meta: { page: 2, page_size: 100, total: 3, pages: 2 },
    });
  });

  const result = await fetchGroupLabelsForLocale("fa");
  assert.equal(result.status, "ok");
  assert.equal(result.labels.length, 1);
  assert.deepEqual(result.labels[0], { code: "REBAR", name: "Rebar" });
});

test("walks every page until meta.pages is reached", async () => {
  const seenPages: number[] = [];
  globalThis.fetch = mockFetch((url) => {
    const page = Number(new URL(url).searchParams.get("page"));
    seenPages.push(page);
    return Response.json({
      data: [productFixture({ group_code: `G${page}`, group_name: `Group ${page}` })],
      meta: { page, page_size: 100, total: 3, pages: 3 },
    });
  });

  const result = await fetchGroupLabelsForLocale("ar");
  assert.equal(result.status, "ok");
  assert.deepEqual(seenPages, [1, 2, 3]);
  assert.equal(result.labels.length, 3);
});

test("a null classification.group (code/name both null) is skipped, never stored as a group with a null code", async () => {
  globalThis.fetch = mockFetch(() => {
    const item = productFixture({ group_code: "REBAR", group_name: "Rebar" });
    (item.classification as unknown as { group: { code: null; name: null } }).group = { code: null, name: null };
    return Response.json({ data: [item], meta: { page: 1, page_size: 100, total: 1, pages: 1 } });
  });

  const result = await fetchGroupLabelsForLocale("fa");
  assert.equal(result.status, "ok");
  assert.deepEqual(result.labels, []);
});

test("propagates not_configured when ODOO_BASE_URL is unset — never silently returns an empty ok result", async () => {
  delete process.env.ODOO_BASE_URL;
  const result = await fetchGroupLabelsForLocale("fa");
  assert.equal(result.status, "not_configured");
  assert.deepEqual(result.labels, []);
});

test("propagates a failed list fetch with a reason code, never a silent empty ok result", async () => {
  globalThis.fetch = mockFetch(() => new Response("", { status: 500 }));
  const result = await fetchGroupLabelsForLocale("fa");
  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "CATALOG_API_SERVER_ERROR");
});
