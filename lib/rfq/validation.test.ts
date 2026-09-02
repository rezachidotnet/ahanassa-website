import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ITEMS, validateRfqSubmission } from "./validation.ts";

/**
 * lib/rfq/validation.ts had no direct unit test file before Catalog -> RFQ
 * Variant Preselection (DOCUMENT_AUDIT_REPORT.md DAR-039) — this file
 * covers both the pre-existing behavior (never previously pinned) and the
 * new `catalogVariantXid` format-validation path. Pure, D1-free — never
 * touches DB_PUBLIC (that happens in lib/rfq/service.ts, not here).
 */

const VALID_KEY = "a-valid-idempotency-key-123456";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: VALID_KEY,
    locale: "fa",
    fullName: "Ali Ahmadi",
    companyName: "Ahan Sazeh Co.",
    email: "ali@example.com",
    phone: "+989121234567",
    items: [{ productSlug: "deformed-rebar", quantityText: "200 تن", unit: "ton" }],
    ...overrides,
  };
}

test("validateRfqSubmission accepts a well-formed sample-catalog submission (existing behavior, now pinned)", () => {
  const result = validateRfqSubmission(basePayload());
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].source, "freeform");
  assert.equal(result.value?.items[0].catalogVariantXid, null);
});

test("validateRfqSubmission rejects a non-object body", () => {
  assert.equal(validateRfqSubmission(null).ok, false);
  assert.equal(validateRfqSubmission("string").ok, false);
});

test("validateRfqSubmission rejects an unknown sample productSlug (existing behavior, now pinned)", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ productSlug: "not-a-real-slug", quantityText: "1" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].productSlug"]?.includes("unknown_product"));
});

test("validateRfqSubmission requires quantityText", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ productSlug: "deformed-rebar", quantityText: "" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].quantityText"]?.includes("required"));
});

test("validateRfqSubmission enforces MAX_ITEMS", () => {
  const items = Array.from({ length: 21 }, () => ({ productSlug: "deformed-rebar", quantityText: "1" }));
  const result = validateRfqSubmission(basePayload({ items }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.items?.includes("too_many"));
});

// --- Multi-item RFQ form: explicit 20-line proof (docs/RFQ_MULTI_ITEM_FORM.md) ---
// Uses the actual MAX_ITEMS constant this module itself exports/enforces —
// never a second hardcoded "20" (this task's own "Do NOT duplicate 20
// across many files" instruction).

function itemsOfLength(count: number) {
  return Array.from({ length: count }, (_, i) => ({ productSlug: "deformed-rebar", quantityText: `${i + 1} تن`, unit: "ton" }));
}

test("validateRfqSubmission accepts exactly 1 line", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(1) }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 1);
});

test("validateRfqSubmission accepts exactly 10 lines", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(10) }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 10);
});

test("validateRfqSubmission accepts exactly 11 lines — proves the cap is not a UI-only 10-item limit", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(11) }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 11);
});

test("validateRfqSubmission accepts exactly 15 lines", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(15) }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 15);
});

test("validateRfqSubmission accepts exactly MAX_ITEMS (20) lines", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(MAX_ITEMS) }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, MAX_ITEMS);
});

test("validateRfqSubmission rejects MAX_ITEMS + 1 (21) lines", () => {
  const result = validateRfqSubmission(basePayload({ items: itemsOfLength(MAX_ITEMS + 1) }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.items?.includes("too_many"));
});

test("validateRfqSubmission preserves every line's own data across a full 20-item submission — no lost lines", () => {
  const items = Array.from({ length: MAX_ITEMS }, (_, i) => ({ freeformTitle: `Custom item ${i + 1}`, quantityText: `${i + 1} piece`, unit: "kg" }));
  const result = validateRfqSubmission(basePayload({ items }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, MAX_ITEMS);
  result.value?.items.forEach((item, i) => {
    assert.equal(item.freeformTitle, `Custom item ${i + 1}`);
    assert.equal(item.quantityText, `${i + 1} piece`);
  });
});

test("validateRfqSubmission accepts a mixed catalog + custom 12-line submission — a core multi-item acceptance criterion", () => {
  const items = [
    { catalogVariantXid: "ahanassa_marketplace.product_rb_aj340_d16_l12", quantityText: "5000 kg", unit: "kg" },
    { freeformTitle: "Custom steel requirement", quantityText: "1 kg", unit: "kg" },
    ...itemsOfLength(10),
  ];
  const result = validateRfqSubmission(basePayload({ items }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 12);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[0].catalogVariantXid, "ahanassa_marketplace.product_rb_aj340_d16_l12");
  assert.equal(result.value?.items[1].source, "freeform");
});

// --- Phone required (Go-Live Readiness Stage 6, owner decision) ---

test("validateRfqSubmission rejects a missing phone", () => {
  const result = validateRfqSubmission(basePayload({ phone: undefined }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.phone?.includes("required"));
});

test("validateRfqSubmission rejects an empty-string phone", () => {
  const result = validateRfqSubmission(basePayload({ phone: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.phone?.includes("required"));
});

test("validateRfqSubmission rejects a whitespace-only phone (treated the same as missing)", () => {
  const result = validateRfqSubmission(basePayload({ phone: "   " }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.phone?.includes("required"));
});

test("validateRfqSubmission still rejects a malformed (present but invalid) phone", () => {
  const result = validateRfqSubmission(basePayload({ phone: "abc" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.phone?.includes("invalid"));
});

test("validateRfqSubmission accepts a well-formed phone and never returns it as null", () => {
  const result = validateRfqSubmission(basePayload({ phone: "+989121234567" }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.phone, "+989121234567");
});

test("validateRfqSubmission normalizes Persian digits and strips separators in a valid phone", () => {
  const result = validateRfqSubmission(basePayload({ phone: "۰۹۱۲-۱۲۳-۴۵۶۷" }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.phone, "09121234567");
});

// --- Full-form required-field regression (name/company/email unaffected) ---

test("validateRfqSubmission still requires fullName (unchanged by the phone change)", () => {
  const result = validateRfqSubmission(basePayload({ fullName: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.fullName?.includes("invalid_length"));
});

test("validateRfqSubmission still requires companyName (unchanged by the phone change)", () => {
  const result = validateRfqSubmission(basePayload({ companyName: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.companyName?.includes("required"));
});

test("validateRfqSubmission still requires email (unchanged by the phone change)", () => {
  const result = validateRfqSubmission(basePayload({ email: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.email?.includes("required"));
});

test("validateRfqSubmission honeypot rejects a filled 'website' field", () => {
  const result = validateRfqSubmission(basePayload({ website: "http://spam.example" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors._?.includes("rejected"));
});

// --- catalogVariantXid (Catalog -> RFQ Variant Preselection, DAR-039) ---

const REAL_XID = "ahanassa_marketplace.product_rb_aj340_d10_l12";

test("validateRfqSubmission accepts a well-formed catalogVariantXid and marks the item source: selected", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: REAL_XID, quantityText: "5 branch", unit: "branch" }] }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[0].catalogVariantXid, REAL_XID);
});

test("validateRfqSubmission rejects a malformed catalogVariantXid (format only — existence is lib/rfq/service.ts's job)", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: "not a real xid with spaces!", quantityText: "1", unit: "kg" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].catalogVariantXid"]?.includes("invalid_format"));
});

test("validateRfqSubmission rejects an oversized catalogVariantXid", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: "a".repeat(201), quantityText: "1", unit: "kg" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].catalogVariantXid"]?.includes("invalid_format"));
});

test("validateRfqSubmission: catalogVariantXid takes priority over productSlug/freeformTitle sent alongside it (never an invalid hybrid)", () => {
  const result = validateRfqSubmission(
    basePayload({ items: [{ catalogVariantXid: REAL_XID, productSlug: "deformed-rebar", freeformTitle: "something else", quantityText: "1", unit: "kg" }] }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[0].catalogVariantXid, REAL_XID);
  // A catalog-selected item never carries a freeform_title snapshot, even if the client sent one.
  assert.equal(result.value?.items[0].freeformTitle, null);
});

test("validateRfqSubmission still requires quantityText for a catalog-selected item", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: REAL_XID, quantityText: "", unit: "kg" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].quantityText"]?.includes("required"));
});

// --- mixed Catalog + custom RFQ (Stage U) ---

test("validateRfqSubmission accepts a submission mixing a catalog item and a freeform item", () => {
  const result = validateRfqSubmission(
    basePayload({
      items: [
        { catalogVariantXid: REAL_XID, quantityText: "5 branch", unit: "branch" },
        { freeformTitle: "Custom bracket, per drawing", quantityText: "10 kg", unit: "kg" },
      ],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 2);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[1].source, "freeform");
  assert.equal(result.value?.items[1].catalogVariantXid, null);
});

test("validateRfqSubmission accepts multiple catalog items (multi-line preselection)", () => {
  const result = validateRfqSubmission(
    basePayload({
      items: [
        { catalogVariantXid: REAL_XID, quantityText: "5 branch", unit: "branch" },
        { catalogVariantXid: "ahanassa_marketplace.product_pf_shs_s80x80x4_l6", quantityText: "2 ton", unit: "ton" },
      ],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 2);
  assert.ok(result.value?.items.every((i) => i.source === "selected"));
});

// --- Launch UoM policy — Stage F/L (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md) ---
// Format-level checks only: is `unit` one of the 8 known codes, and — for a
// freeform/sample-catalog item specifically — is it kg/ton (the Custom-item
// Launch restriction, checkable with zero DB access). A Catalog item's
// group-specific policy (Rebar->branch, Plate->sheet, SHS->meter) requires
// DB_PUBLIC resolution and is checked in lib/rfq/service.ts instead — see
// lib/rfq/uom-policy.test.ts for the exhaustive pure policy-function matrix.

test("validateRfqSubmission requires unit", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ productSlug: "deformed-rebar", quantityText: "200 تن" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].unit"]?.includes("required"));
});

test("validateRfqSubmission rejects an unknown unit code", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ productSlug: "deformed-rebar", quantityText: "200 تن", unit: "not-a-real-unit" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].unit"]?.includes("invalid"));
});

test("validateRfqSubmission accepts unit=kg for a Custom/freeform item", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ freeformTitle: "Custom part", quantityText: "5 kg", unit: "kg" }] }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].unit, "kg");
});

test("validateRfqSubmission accepts unit=ton for a Custom/freeform item", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ freeformTitle: "Custom part", quantityText: "5 ton", unit: "ton" }] }));
  assert.equal(result.ok, true);
});

for (const unsupported of ["branch", "sheet", "meter", "coil", "bundle", "piece"] as const) {
  test(`validateRfqSubmission rejects unit=${unsupported} for a Custom/freeform item (Launch restricts Custom to kg/ton only)`, () => {
    const result = validateRfqSubmission(basePayload({ items: [{ freeformTitle: "Custom part", quantityText: "5", unit: unsupported }] }));
    assert.equal(result.ok, false);
    assert.ok(result.fieldErrors["items[0].unit"]?.includes("unsupported_for_custom_item"));
  });
}

test("validateRfqSubmission rejects unit=piece for a sample-catalog (productSlug) item — freeform-sourced, same Custom restriction applies", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ productSlug: "deformed-rebar", quantityText: "5", unit: "piece" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].unit"]?.includes("unsupported_for_custom_item"));
});

test("validateRfqSubmission does NOT apply the Custom-item kg/ton restriction to a catalogVariantXid item — every known unit format-passes here (group-specific policy is lib/rfq/service.ts's job)", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: REAL_XID, quantityText: "5 branch", unit: "branch" }] }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].unit, "branch");
});
