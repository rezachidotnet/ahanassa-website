import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOutboundRfqIdempotencyKey, computeNumericQuantity, inferOdooUomCode, mapRfqToApiPayload, type RfqSnapshotForMapping, type RfqSnapshotItem } from "./rfq-payload-mapper.ts";

function catalogItem(overrides: Partial<RfqSnapshotItem> = {}): RfqSnapshotItem {
  return {
    lineNumber: 1,
    variantRef: "ahanassa_marketplace.product_rb_aj340_d16_l12",
    skuSnapshot: "AA-RB-AJ340-D16-L12",
    freeformTitle: null,
    description: null,
    quantityText: "5 branch",
    quantityValue: 5,
    quantityScale: 0,
    ...overrides,
  };
}

function freeformItem(overrides: Partial<RfqSnapshotItem> = {}): RfqSnapshotItem {
  return {
    lineNumber: 1,
    variantRef: null,
    skuSnapshot: null,
    freeformTitle: "Custom bracket, per drawing",
    description: null,
    quantityText: "10 piece",
    quantityValue: 10,
    quantityScale: 0,
    ...overrides,
  };
}

function snapshot(overrides: Partial<RfqSnapshotForMapping> = {}): RfqSnapshotForMapping {
  return {
    locale: "fa",
    fullName: "Ali Ahmadi",
    companyName: "Ahan Sazeh Co.",
    phone: "09121234567",
    email: "ali@example.com",
    message: "Need delivery next month",
    items: [catalogItem()],
    ...overrides,
  };
}

// --- outbound idempotency key ---

test("buildOutboundRfqIdempotencyKey is deterministic for the same RFQ id", () => {
  const a = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980001");
  const b = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980001");
  assert.equal(a, b);
});

test("buildOutboundRfqIdempotencyKey differs for two different RFQ ids", () => {
  const a = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980001");
  const b = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980002");
  assert.notEqual(a, b);
});

test("buildOutboundRfqIdempotencyKey is ASCII-safe and well under 128 chars", () => {
  const key = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980001");
  assert.ok(/^[\x21-\x7E]+$/.test(key));
  assert.ok(key.length <= 128);
});

// --- quantity conversion ---

test("computeNumericQuantity reconstructs a real number from value/scale (200 -> 200)", () => {
  assert.equal(computeNumericQuantity(200, 0), 200);
});

test("computeNumericQuantity reconstructs a decimal (125, scale 1 -> 12.5)", () => {
  assert.equal(computeNumericQuantity(125, 1), 12.5);
});

test("computeNumericQuantity returns null when quantityValue is null (never fabricates a quantity)", () => {
  assert.equal(computeNumericQuantity(null, 0), null);
});

test("computeNumericQuantity returns null for zero/negative results", () => {
  assert.equal(computeNumericQuantity(0, 0), null);
});

// --- UoM inference ---

test("inferOdooUomCode finds 'ton' in Persian text", () => {
  assert.equal(inferOdooUomCode("200 تن"), "ton");
});

test("inferOdooUomCode finds 'ton' in English text", () => {
  assert.equal(inferOdooUomCode("200 tons"), "ton");
});

test("inferOdooUomCode finds 'branch' (شاخه)", () => {
  assert.equal(inferOdooUomCode("5 شاخه"), "branch");
});

test("inferOdooUomCode finds 'piece' for common Persian/English count words", () => {
  assert.equal(inferOdooUomCode("500 عدد"), "piece");
  assert.equal(inferOdooUomCode("10 pcs"), "piece");
});

test("inferOdooUomCode returns null (never guesses) when no known keyword is present", () => {
  assert.equal(inferOdooUomCode("چند تا نمی‌دانم دقیق"), null);
});

test("inferOdooUomCode is case-insensitive", () => {
  assert.equal(inferOdooUomCode("2 TON"), "ton");
});

// --- full payload mapping: catalog item ---

test("mapRfqToApiPayload maps a catalog item with product_variant_xid as identity", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items.length, 1);
  const item = result.payload.items[0];
  assert.equal(item.product_variant_xid, "ahanassa_marketplace.product_rb_aj340_d16_l12");
  assert.equal((item as { sku?: string }).sku, "AA-RB-AJ340-D16-L12");
  assert.equal(item.quantity, 5);
  assert.equal(item.uom, "branch");
});

test("mapRfqToApiPayload never sends the Website slug as identity — only the xid", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const raw = JSON.stringify(result.payload);
  assert.ok(!raw.includes("rebar-aj340")); // a plausible slug value never appears
});

// --- full payload mapping: free-text item ---

test("mapRfqToApiPayload maps a free-text item with product_variant_xid omitted/null and a required description", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [freeformItem()] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const item = result.payload.items[0];
  assert.equal(item.product_variant_xid ?? null, null);
  assert.equal((item as { description?: string }).description, "Custom bracket, per drawing");
});

test("mapRfqToApiPayload never fabricates a Product Master identity for a free-text item", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [freeformItem()] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(!("sku" in result.payload.items[0]));
});

test("mapRfqToApiPayload fails (not silently omits) a free-text item with no usable description", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [freeformItem({ freeformTitle: "" })] }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "MISSING_FREEFORM_DESCRIPTION");
});

// --- mixed catalog + free-text ---

test("mapRfqToApiPayload supports a mixed catalog + free-text RFQ", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lineNumber: 1 }), freeformItem({ lineNumber: 2 })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items.length, 2);
  assert.ok(result.payload.items[0].product_variant_xid);
  assert.equal(result.payload.items[1].product_variant_xid ?? null, null);
});

// --- locale mapping ---

test("mapRfqToApiPayload maps locale through unchanged", () => {
  const result = mapRfqToApiPayload(snapshot({ locale: "en" }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.locale, "en");
});

test("mapRfqToApiPayload rejects an unsupported locale rather than guessing a default", () => {
  const result = mapRfqToApiPayload(snapshot({ locale: "de" }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "UNSUPPORTED_LOCALE");
});

// --- customer mapping ---

test("mapRfqToApiPayload requires name and includes phone/email when present", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.customer.name, "Ali Ahmadi");
  assert.equal(result.payload.customer.phone, "09121234567");
  assert.equal(result.payload.customer.email, "ali@example.com");
});

test("mapRfqToApiPayload never sends country/city — the Website has no real per-customer value for either", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(!("country" in result.payload.customer));
  assert.ok(!("city" in result.payload.customer));
});

// --- consent / source ---

test("mapRfqToApiPayload never sends consent — no real captured consent state exists yet", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(!("consent" in result.payload));
});

test("mapRfqToApiPayload sends only an honest, non-fabricated source.utm_source", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.payload.source, { utm_source: "website" });
});

// --- unrelated Website fields must never appear ---

test("mapRfqToApiPayload output never contains D1 IDs, sync state, or Odoo/CRM IDs", () => {
  const result = mapRfqToApiPayload(snapshot());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const raw = JSON.stringify(result.payload);
  assert.ok(!raw.includes("odoo_lead_id"));
  assert.ok(!raw.includes("sync_status"));
  assert.ok(!raw.includes("idempotency_key_hash"));
});

// --- quantity/UoM blockers reported, never fabricated ---

test("mapRfqToApiPayload fails the whole RFQ when a line's quantity cannot be converted to a number", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityValue: null, quantityScale: null })] }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "UNCONVERTIBLE_QUANTITY");
  assert.equal(result.lineNumber, 1);
});

test("mapRfqToApiPayload fails the whole RFQ when a line's UoM cannot be inferred", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityText: "5 چیز نامشخص" })] }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "UNRESOLVED_UOM");
});

test("mapRfqToApiPayload reports the exact failing line number in a multi-item RFQ", () => {
  const result = mapRfqToApiPayload(
    snapshot({ items: [catalogItem({ lineNumber: 1 }), catalogItem({ lineNumber: 2, quantityValue: null, quantityScale: null })] }),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.lineNumber, 2);
});

test("mapRfqToApiPayload rejects an RFQ with zero items", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [] }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "NO_ITEMS");
});

// --- immutability (Stage: retry payload immutability) ---

test("mapRfqToApiPayload output is a plain snapshot — mutating the source snapshot afterward never changes an already-built payload", () => {
  const input = snapshot();
  const result = mapRfqToApiPayload(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  input.fullName = "Someone else entirely";
  input.items[0].variantRef = "a-different-xid";
  assert.equal(result.payload.customer.name, "Ali Ahmadi");
  assert.equal(result.payload.items[0].product_variant_xid, "ahanassa_marketplace.product_rb_aj340_d16_l12");
});
