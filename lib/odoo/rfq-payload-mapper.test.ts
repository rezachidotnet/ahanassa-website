import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOutboundRfqIdempotencyKey, computeNumericQuantity, inferOdooUomCode, mapRfqToApiPayload, type RfqSnapshotForMapping, type RfqSnapshotItem } from "./rfq-payload-mapper.ts";

// unitCode defaults to null in both factories below — deliberately exercises
// the legacy inferOdooUomCode(quantityText) fallback path for every
// pre-existing test in this file (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md: a
// historical row with unit_ref=null). Dedicated tests further down cover
// the new, deterministic unitCode-present path explicitly.

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
    unitCode: null,
    lengthMm: null,
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
    unitCode: null,
    lengthMm: null,
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

// --- Launch UoM Contract Alignment: deterministic unitCode preference ---
// (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md, Phase N — "prove 100 branch serializes
// to explicit numeric quantity + branch, not ambiguous text re-parsing")

test("mapRfqToApiPayload uses the structured unitCode directly when present — never re-infers from quantityText", () => {
  // quantityText deliberately contains a DIFFERENT, misleading keyword —
  // proves unitCode wins outright, not merely "also happens to agree".
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityText: "100 (see notes for unit)", quantityValue: 100, quantityScale: 0, unitCode: "branch" })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items[0].uom, "branch");
});

test("mapRfqToApiPayload serializes a structured 100/branch line to explicit numeric quantity + branch code", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityValue: 100, quantityScale: 0, unitCode: "branch" })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items[0].quantity, 100);
  assert.equal(result.payload.items[0].uom, "branch");
});

for (const code of ["sheet", "meter", "kg", "ton"] as const) {
  test(`mapRfqToApiPayload serializes unitCode=${code} deterministically`, () => {
    const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityValue: 42, quantityScale: 0, unitCode: code })] }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.items[0].uom, code);
  });
}

test("mapRfqToApiPayload falls back to inferOdooUomCode only when unitCode is null (a historical row predating this field)", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityText: "5 branch", unitCode: null })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items[0].uom, "branch");
});

test("mapRfqToApiPayload rejects an unrecognized unitCode value rather than trusting it blindly — falls back to inference instead", () => {
  // Defensive: unitCode is always DB-sourced and format-validated at
  // submission time in real use, but this proves a corrupt/unknown value
  // can never silently reach Odoo as a fabricated uom — it is treated the
  // same as absent and falls back to the same non-fabricating inference.
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ quantityText: "5 branch", unitCode: "not-a-real-uom-code" })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.items[0].uom, "branch");
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

// --- length_mm (POST-P3F RFQ length_mm full stack) ---

test("mapRfqToApiPayload omits length_mm entirely (never null/0) when the item never had one — byte-identical to pre-length_mm behavior", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: null })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const raw = JSON.stringify(result.payload);
  assert.ok(!raw.includes("length_mm"), "length_mm key must not appear in the serialized JSON at all when omitted");
  // The in-memory object may carry `length_mm: undefined` as a JS property
  // (a harmless implementation detail) — what actually matters is the wire
  // contract, already asserted above: JSON.stringify drops an `undefined`
  // property entirely, so it never reaches the backend at all.
  assert.equal((result.payload.items[0] as { length_mm?: number }).length_mm, undefined);
});

test("mapRfqToApiPayload maps a present lengthMm to length_mm verbatim, on a catalog item", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 8000 })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal((result.payload.items[0] as { length_mm?: number }).length_mm, 8000);
});

test("mapRfqToApiPayload maps a present lengthMm to length_mm verbatim, on a free-text item", () => {
  const result = mapRfqToApiPayload(snapshot({ items: [freeformItem({ lengthMm: 12000 })] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal((result.payload.items[0] as { length_mm?: number }).length_mm, 12000);
});

test("mapRfqToApiPayload: two items identical except lengthMm produce different serialized JSON (Website never conflates a different requested length into an identical outbound payload)", () => {
  const withoutLength = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: null })] }));
  const withLength = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 8000 })] }));
  assert.equal(withoutLength.ok, true);
  assert.equal(withLength.ok, true);
  if (!withoutLength.ok || !withLength.ok) return;
  assert.notEqual(JSON.stringify(withoutLength.payload), JSON.stringify(withLength.payload));
});

test("mapRfqToApiPayload: two items with different requested lengths produce different serialized JSON (same CVAR/qty/uom, different length => distinguishable payload)", () => {
  const length8000 = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 8000 })] }));
  const length12000 = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 12000 })] }));
  assert.equal(length8000.ok, true);
  assert.equal(length12000.ok, true);
  if (!length8000.ok || !length12000.ok) return;
  assert.notEqual(JSON.stringify(length8000.payload), JSON.stringify(length12000.payload));
});

test("mapRfqToApiPayload: two items with the same requested length produce identical serialized JSON (same CVAR/qty/uom/length => same payload)", () => {
  const a = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 8000 })] }));
  const b = mapRfqToApiPayload(snapshot({ items: [catalogItem({ lengthMm: 8000 })] }));
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(JSON.stringify(a.payload), JSON.stringify(b.payload));
});

test("buildOutboundRfqIdempotencyKey is unaffected by item content, including lengthMm — the Website's outbound idempotency key is scoped to one durable RFQ record (rfqId), never derived from item fields, so two submissions differing only in requested length are already distinguished by construction (different rfqId), and a retry of the SAME submission is deduplicated regardless of what length it carries", () => {
  const key = buildOutboundRfqIdempotencyKey("01ARZ3NDEKTSV4RRFFQ6980001");
  // The key is a pure function of rfqId alone — item content (including
  // length_mm) never enters into it, by construction (see the function's
  // own signature: it accepts only an id). This test documents/pins that
  // invariant rather than exercising a fingerprint that does not exist.
  assert.equal(key, "rfq-01ARZ3NDEKTSV4RRFFQ6980001");
});
