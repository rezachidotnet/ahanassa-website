import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePricing, PRICING_ROW_KEYS, type PricingSource } from "./pricing.ts";
import { createGuardedFetch } from "./odoo-source.ts";
import { PIPELINE_CONFIG } from "./config.ts";

/** W9.4 — pricing API allow-list + validation. SYNTHETIC values only (no real price, factory or market source). */

const FIXTURE = JSON.parse(readFileSync(new URL("../../fixtures/pricing/synthetic-pricing-current.json", import.meta.url), "utf8")) as { synthetic: boolean; fetched_at: string; response: { data: Record<string, unknown>[]; meta: Record<string, unknown> } };
const FETCHED_AT = FIXTURE.fetched_at;
const CATALOG = [
  { canonical_id: "CVAR-000031", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D10-L12" },
  { canonical_id: "CVAR-000032", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D12-L12" },
  { canonical_id: "CVAR-000033", canonical_template_id: "CTMPL-000001", sku: "AA-RB-AJ400-D14-L12" },
  { canonical_id: "CVAR-000053", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S120-L12" },
  { canonical_id: "CVAR-000054", canonical_template_id: "CTMPL-000002", sku: "AA-BM-IPE-S140-L12" },
];
const body = () => structuredClone(FIXTURE.response);
const ok = (b: unknown): PricingSource => ({ status: "ok", http_status: 200, etag: '"x"', body: b });
/** Default: the live site already shows prices (4), so an invalid set fails the run — the strict path. */
const run = (b: unknown, previous: number | null = 4) => validatePricing(ok(b), CATALOG, FETCHED_AT, previous);

test("fixture is marked synthetic and names no market website", () => {
  assert.equal(FIXTURE.synthetic, true);
  const text = JSON.stringify(FIXTURE);
  assert.ok(!/https?:|www\.|\.com|\.ir\b/i.test(text), "no URL or domain of any kind in the price fixture");
  assert.ok(!/source/i.test(JSON.stringify(FIXTURE.response)), "the API body has no source field");
});

test("valid body -> one snapshot row per numeric price with exactly the rendered fields; on-request rows are not stored", () => {
  const r = run(body());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.outcome, "published");
  assert.equal(r.summary, "4 price(s) published, 1 on request");
  assert.deepEqual(r.counts, { prices_published: 4, prices_on_request: 1 });
  assert.deepEqual(r.rows.map((x) => x.canonical_variant_id), ["CVAR-000031", "CVAR-000032", "CVAR-000053", "CVAR-000054"]);
  for (const row of r.rows) assert.deepEqual(Object.keys(row).sort(), ["canonical_variant_id", "factory_name_fa", "location_fa", "previous_price_irr_per_kg", "previous_published_at", "price_irr_per_kg", "published_at", "vat_included"]);
  assert.deepEqual(r.rows[0], {
    canonical_variant_id: "CVAR-000031",
    price_irr_per_kg: 489470,
    vat_included: 1,
    factory_name_fa: "کارخانه آزمایشی الف",
    location_fa: "درب کارخانه",
    published_at: "2026-10-08T07:20:00Z",
    previous_price_irr_per_kg: 495610,
    previous_published_at: "2026-10-05T07:20:00Z",
  });
  // An on-request previous gives no change (API v1: "if either side is on request, there is no % change").
  assert.equal(r.rows[3].previous_price_irr_per_kg, null);
  assert.equal(r.rows[3].previous_published_at, null);
  // Nothing read-only reaches the rows: factory code, en/ar names, basis_note.
  assert.ok(!/FAC-|Test Mill|Factory gate|یادداشت/.test(JSON.stringify(r.rows)));
});

test("owner 2026-10-09: unknown fields at any level are IGNORED (warning), never stored, never block the publish", () => {
  const b = body();
  b.data[0].source = "x";
  b.data[0].supplier_name = "x";
  (b.data[0].factory as Record<string, unknown>).url = "x";
  ((b.data[0].factory as Record<string, unknown>).name as Record<string, unknown>).de = "x";
  (b.data[1].location as Record<string, unknown>).code = "x";
  (b.data[0].previous as Record<string, unknown>).observations = [];
  b.meta.sources = 4;
  (b as Record<string, unknown>).debug = true;
  for (const previous of [null, 0, 4]) {
    const r = run(b, previous);
    assert.deepEqual(r.errors, [], "never an error");
    assert.equal(r.outcome, "published");
    assert.equal(r.rows.length, 4, "the prices still publish");
    assert.deepEqual(r.ignored, ["factory.name.de", "factory.url", "location.code", "meta.sources", "previous.observations", "response.debug", "row.source", "row.supplier_name"].map((x) => x.replace(/^(factory|location|previous)/, "row.$1")).sort());
    assert.ok(r.warnings.some((w) => /ignored 8 field\(s\)/.test(w)));
    assert.ok(!/"x"|observations|supplier|debug|sources|"de"|url/.test(JSON.stringify(r.rows)), "nothing unknown reaches the snapshot rows");
  }
  assert.ok(!PRICING_ROW_KEYS.has("source"));
});

test("owner 2026-10-09: an invalid KNOWN field fails the run only when the live site shows prices; otherwise an empty set + a clear warning", () => {
  const b = body();
  b.data[0].price_irr_per_kg = -1;
  const blocked = run(b, 4);
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.errors[0].startsWith("pricing: BLOCKED:") && /live site shows 4 price/.test(blocked.errors[0]));
  assert.ok(blocked.errors.some((e) => /price_irr_per_kg/.test(e)), "the detail is listed");
  assert.deepEqual(blocked.rows, []);
  for (const previous of [null, 0]) {
    const r = run(b, previous);
    assert.deepEqual(r.errors, []);
    assert.equal(r.outcome, "empty_invalid");
    assert.deepEqual(r.rows, []);
    assert.match(r.summary, /^EMPTY PRICE SET: the pricing response is invalid/);
    assert.ok(r.warnings[0].includes("the catalog publishes normally") && r.warnings.some((w) => /price_irr_per_kg/.test(w)));
  }
  const garbage = run("not json", null);
  assert.equal(garbage.outcome, "empty_invalid");
  assert.equal(run("not json", 4).outcome, "blocked");
});

test("prices: positive integers within the sanity bounds", () => {
  for (const bad of [0, -1, 1.5, "489470", null, 9_999, 100_000_001, Number.MAX_SAFE_INTEGER + 2]) {
    const b = body();
    b.data[0].price_irr_per_kg = bad;
    assert.ok(run(b).errors.length > 0, `price ${String(bad)} must fail`);
  }
  const b = body();
  (b.data[0].previous as Record<string, unknown>).price_irr_per_kg = 0;
  assert.ok(run(b).errors.some((e) => /previous\.price_irr_per_kg/.test(e)));
});

test("known variants only: unknown canonical_id, mismatched template or sku, duplicates fail", () => {
  const unknown = body();
  unknown.data[0].canonical_id = "CVAR-999999";
  assert.ok(run(unknown).errors.some((e) => /not an active variant/.test(e)));
  const template = body();
  template.data[0].canonical_template_id = "CTMPL-000002";
  assert.ok(run(template).errors.some((e) => /canonical_template_id/.test(e)));
  const sku = body();
  sku.data[0].sku = "AA-OTHER";
  assert.ok(run(sku).errors.some((e) => /sku/.test(e)));
  const dup = body();
  dup.data.push(structuredClone(dup.data[0]));
  dup.meta.total = dup.data.length;
  assert.ok(run(dup).errors.some((e) => /duplicate row/.test(e)));
});

test("Persian factory and delivery location are required for a numeric price", () => {
  for (const mutate of [
    (b: ReturnType<typeof body>) => (((b.data[0].factory as Record<string, unknown>).name as Record<string, unknown>).fa = null),
    (b: ReturnType<typeof body>) => (((b.data[0].factory as Record<string, unknown>).name as Record<string, unknown>).fa = "  "),
    (b: ReturnType<typeof body>) => ((b.data[0].location as Record<string, unknown>).fa = null),
    (b: ReturnType<typeof body>) => (b.data[0].factory = null),
    (b: ReturnType<typeof body>) => (b.data[0].location = null),
  ]) {
    const b = body();
    mutate(b);
    assert.ok(run(b).errors.some((e) => /factory\.name\.fa is missing|location\.fa is missing/.test(e)));
  }
});

test("timestamps: ISO UTC, not in the future, not before 2026, previous before current, meta not older than the newest price", () => {
  for (const bad of ["2026-10-08 07:20:00", "2026-10-08T07:20:00+03:30", "yesterday", "2025-12-31T23:59:59Z", "2026-10-08T09:00:00Z"]) {
    const b = body();
    b.data[0].published_at_utc = bad;
    assert.ok(run(b).errors.length > 0, `published_at_utc ${bad} must fail`);
  }
  const order = body();
  (order.data[0].previous as Record<string, unknown>).published_at_utc = "2026-10-08T07:20:00Z";
  assert.ok(run(order).errors.some((e) => /is not before/.test(e)));
  const meta = body();
  meta.meta.updated_at_utc = "2026-10-07T00:00:00Z";
  assert.ok(run(meta).errors.some((e) => /meta\.updated_at_utc/.test(e)));
});

test("constants and consistency: kg / IRR / VAT included, meta.total, on-request rows carry nothing", () => {
  const vat = body();
  vat.data[0].vat_included = false;
  assert.ok(run(vat).errors.length > 0);
  const unit = body();
  unit.meta.unit = "ton";
  assert.ok(run(unit).errors.length > 0);
  const total = body();
  total.meta.total = 4;
  assert.ok(run(total).errors.some((e) => /meta\.total/.test(e)));
  const onRequest = body();
  onRequest.data[2].price_irr_per_kg = 400000;
  assert.ok(run(onRequest).errors.some((e) => /price_on_request row carries/.test(e)));
});

test("API not deployed (404) or fetch failed: empty price set with a clear warning — but blocked once the live site shows prices", () => {
  const notDeployed: PricingSource = { status: "not_deployed", http_status: 404, etag: null, body: null };
  const failed: PricingSource = { status: "failed", http_status: 502, etag: null, body: null, error: "HTTP 502" };
  const first = validatePricing(notDeployed, CATALOG, FETCHED_AT, null);
  assert.deepEqual(first.errors, []);
  assert.deepEqual(first.rows, []);
  assert.equal(first.outcome, "empty_not_deployed");
  assert.ok(first.warnings.some((w) => /EMPTY PRICE SET/.test(w)));
  assert.deepEqual(validatePricing(undefined, CATALOG, FETCHED_AT, 0).errors, [], "a source fetched before W9.4 has no prices key");
  const down = validatePricing(failed, CATALOG, FETCHED_AT, 0);
  assert.equal(down.outcome, "empty_fetch_failed");
  assert.match(down.summary, /failed \(HTTP 502\)/);
  for (const source of [notDeployed, failed]) {
    const regression = validatePricing(source, CATALOG, FETCHED_AT, 4);
    assert.equal(regression.outcome, "blocked");
    assert.ok(regression.errors.some((e) => /live site shows 4 price/.test(e)));
  }
  // An empty, deployed set is legitimate ("no price is published right now").
  const empty = run({ data: [], meta: { total: 0, updated_at_utc: null, unit: "kg", currency: "IRR", vat_included: true } }, 4);
  assert.deepEqual(empty.errors, []);
  assert.equal(empty.counts.prices_published, 0);
});

test("fetch guard: /api/v1/pricing/ is an allowed GET prefix; other Odoo paths and methods stay refused", async () => {
  assert.ok((PIPELINE_CONFIG.odoo.allowedPathPrefixes as readonly string[]).includes("/api/v1/pricing/"));
  const state = { requests: [], lastModified: new Map<string, string>() };
  const guarded = createGuardedFetch("https://odoo.ahanassa.com", state, { minIntervalMs: 0, fetchImpl: (async () => new Response("{}")) as typeof fetch });
  await guarded("https://odoo.ahanassa.com/api/v1/pricing/current");
  await assert.rejects(guarded("https://odoo.ahanassa.com/api/v1/pricing/current", { method: "POST" }), /GET only/);
  await assert.rejects(guarded("https://odoo.ahanassa.com/api/v1/prices"), /not an allowed/);
});

test("owner 2026-10-09: the pricing fetch never throws — 404, 5xx, network errors and non-JSON bodies are recorded for validation to decide", async () => {
  const { fetchPricingCurrent } = await import("./odoo-source.ts");
  const respond = (r: () => Response) => (async () => r()) as unknown as typeof fetch;
  assert.deepEqual(await fetchPricingCurrent("https://odoo.ahanassa.com", respond(() => new Response("x", { status: 404 }))), { status: "not_deployed", http_status: 404, etag: null, body: null });
  assert.equal((await fetchPricingCurrent("https://odoo.ahanassa.com", respond(() => new Response("x", { status: 503 })))).error, "HTTP 503");
  assert.equal((await fetchPricingCurrent("https://odoo.ahanassa.com", respond(() => new Response("<html>", { status: 200 })))).error, "body is not JSON");
  const offline = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  assert.equal((await fetchPricingCurrent("https://odoo.ahanassa.com", offline)).status, "failed");
  const okay = await fetchPricingCurrent("https://odoo.ahanassa.com", respond(() => new Response(JSON.stringify(FIXTURE.response), { headers: { etag: '"abc"' } })));
  assert.equal(okay.status, "ok");
  assert.equal(okay.etag, '"abc"');
});
