import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRfqSubmission } from "./validation.ts";

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
    items: [{ productSlug: "deformed-rebar", quantityText: "200 تن" }],
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

test("validateRfqSubmission honeypot rejects a filled 'website' field", () => {
  const result = validateRfqSubmission(basePayload({ website: "http://spam.example" }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors._?.includes("rejected"));
});

// --- catalogVariantXid (Catalog -> RFQ Variant Preselection, DAR-039) ---

const REAL_XID = "ahanassa_marketplace.product_rb_aj340_d10_l12";

test("validateRfqSubmission accepts a well-formed catalogVariantXid and marks the item source: selected", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: REAL_XID, quantityText: "5 branch" }] }));
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[0].catalogVariantXid, REAL_XID);
});

test("validateRfqSubmission rejects a malformed catalogVariantXid (format only — existence is lib/rfq/service.ts's job)", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: "not a real xid with spaces!", quantityText: "1" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].catalogVariantXid"]?.includes("invalid_format"));
});

test("validateRfqSubmission rejects an oversized catalogVariantXid", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: "a".repeat(201), quantityText: "1" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].catalogVariantXid"]?.includes("invalid_format"));
});

test("validateRfqSubmission: catalogVariantXid takes priority over productSlug/freeformTitle sent alongside it (never an invalid hybrid)", () => {
  const result = validateRfqSubmission(
    basePayload({ items: [{ catalogVariantXid: REAL_XID, productSlug: "deformed-rebar", freeformTitle: "something else", quantityText: "1" }] }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value?.items[0].source, "selected");
  assert.equal(result.value?.items[0].catalogVariantXid, REAL_XID);
  // A catalog-selected item never carries a freeform_title snapshot, even if the client sent one.
  assert.equal(result.value?.items[0].freeformTitle, null);
});

test("validateRfqSubmission still requires quantityText for a catalog-selected item", () => {
  const result = validateRfqSubmission(basePayload({ items: [{ catalogVariantXid: REAL_XID, quantityText: "" }] }));
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors["items[0].quantityText"]?.includes("required"));
});

// --- mixed Catalog + custom RFQ (Stage U) ---

test("validateRfqSubmission accepts a submission mixing a catalog item and a freeform item", () => {
  const result = validateRfqSubmission(
    basePayload({
      items: [
        { catalogVariantXid: REAL_XID, quantityText: "5 branch" },
        { freeformTitle: "Custom bracket, per drawing", quantityText: "10 pcs" },
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
        { catalogVariantXid: REAL_XID, quantityText: "5 branch" },
        { catalogVariantXid: "ahanassa_marketplace.product_pf_shs_s80x80x4_l6", quantityText: "2 ton" },
      ],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value?.items.length, 2);
  assert.ok(result.value?.items.every((i) => i.source === "selected"));
});
