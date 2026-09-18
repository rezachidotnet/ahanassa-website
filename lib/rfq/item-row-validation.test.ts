import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRfqItemInput,
  createCatalogRowFromSelection,
  createEmptyCatalogRow,
  createEmptyCustomRow,
  isRfqRowEmpty,
  isValidLengthMmValue,
  nextRfqRowId,
  validateRfqRow,
  type RfqCatalogRowFields,
  type RfqCustomRowFields,
} from "./item-row-validation.ts";

// --- row id ---

test("nextRfqRowId produces distinct ids across calls", () => {
  const a = nextRfqRowId();
  const b = nextRfqRowId();
  assert.notEqual(a, b);
});

// --- factories ---

test("createEmptyCatalogRow starts with no variant selected and a default unit", () => {
  const row = createEmptyCatalogRow();
  assert.equal(row.fields.mode, "catalog");
  if (row.fields.mode !== "catalog") return;
  assert.equal(row.fields.variantXid, null);
  assert.equal(row.fields.quantityValue, "");
});

test("createEmptyCustomRow starts with empty product/spec fields", () => {
  const row = createEmptyCustomRow();
  assert.equal(row.fields.mode, "custom");
  if (row.fields.mode !== "custom") return;
  assert.equal(row.fields.productTitle, "");
  assert.equal(row.fields.sizeSpec, "");
});

test("createCatalogRowFromSelection seeds a catalog row with the resolved identity", () => {
  const row = createCatalogRowFromSelection({ categoryCode: "LONG_PRODUCTS", templateXid: "tmpl-a", variantXid: "variant-a" });
  assert.equal(row.fields.mode, "catalog");
  if (row.fields.mode !== "catalog") return;
  assert.equal(row.fields.variantXid, "variant-a");
  assert.equal(row.fields.templateXid, "tmpl-a");
  assert.equal(row.fields.categoryCode, "LONG_PRODUCTS");
  // Quantity/notes are left for the customer to fill in — never prefilled with a guess.
  assert.equal(row.fields.quantityValue, "");
});

// --- validateRfqRow ---

test("validateRfqRow flags a catalog row with no variant selected", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: null, quantityValue: "5", unit: "kg", notes: "", lengthMm: "" };
  assert.deepEqual(validateRfqRow(fields), ["product"]);
});

test("validateRfqRow flags a catalog row with an invalid quantity", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: "c", templateXid: "t", variantXid: "v", quantityValue: "", unit: "kg", notes: "", lengthMm: "" };
  assert.deepEqual(validateRfqRow(fields), ["quantity"]);
});

test("validateRfqRow passes a fully filled catalog row", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: "c", templateXid: "t", variantXid: "v", quantityValue: "500", unit: "kg", notes: "", lengthMm: "" };
  assert.deepEqual(validateRfqRow(fields), []);
});

test("validateRfqRow flags a custom row with no product title", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "", sizeSpec: "", quantityValue: "10", unit: "piece", notes: "" };
  assert.deepEqual(validateRfqRow(fields), ["product"]);
});

test("validateRfqRow flags both product and quantity when both are missing", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "", sizeSpec: "", quantityValue: "", unit: "piece", notes: "" };
  assert.deepEqual(validateRfqRow(fields), ["product", "quantity"]);
});

test("validateRfqRow passes a fully filled custom row", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "Custom bracket", sizeSpec: "per drawing", quantityValue: "1", unit: "piece", notes: "" };
  assert.deepEqual(validateRfqRow(fields), []);
});

// --- isRfqRowEmpty ---

test("isRfqRowEmpty is true for a freshly created catalog row", () => {
  assert.equal(isRfqRowEmpty(createEmptyCatalogRow().fields), true);
});

test("isRfqRowEmpty is true for a freshly created custom row", () => {
  assert.equal(isRfqRowEmpty(createEmptyCustomRow().fields), true);
});

test("isRfqRowEmpty is false once any field is filled", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "", sizeSpec: "", quantityValue: "", unit: "piece", notes: "a note" };
  assert.equal(isRfqRowEmpty(fields), false);
});

// --- buildRfqItemInput ---

test("buildRfqItemInput builds a catalogVariantXid-only item for a catalog row, never leaking category/template filter state", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: "LONG_PRODUCTS", templateXid: "tmpl-a", variantXid: "variant-a", quantityValue: "5000", unit: "kg", notes: "", lengthMm: "" };
  const item = buildRfqItemInput(fields, "fa");
  assert.deepEqual(item, { catalogVariantXid: "variant-a", quantityText: "5000 کیلوگرم", unit: "kg", description: undefined, lengthMm: undefined });
});

test("buildRfqItemInput includes notes as description when present", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "1", unit: "piece", notes: "  urgent  ", lengthMm: "" };
  const item = buildRfqItemInput(fields, "en");
  assert.equal(item?.description, "urgent");
});

test("buildRfqItemInput returns null for a catalog row with no variant selected", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: null, quantityValue: "5", unit: "kg", notes: "", lengthMm: "" };
  assert.equal(buildRfqItemInput(fields, "fa"), null);
});

test("buildRfqItemInput returns null for an invalid quantity, never fabricates a fallback quantity", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "not-a-number", unit: "kg", notes: "", lengthMm: "" };
  assert.equal(buildRfqItemInput(fields, "fa"), null);
});

test("buildRfqItemInput builds a freeformTitle item for a custom row, with gradeOrStandard from sizeSpec", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "Custom bracket", sizeSpec: "per drawing", quantityValue: "1", unit: "piece", notes: "" };
  const item = buildRfqItemInput(fields, "en");
  assert.deepEqual(item, { freeformTitle: "Custom bracket", gradeOrStandard: "per drawing", quantityText: "1 piece", unit: "piece", description: undefined });
});

test("buildRfqItemInput sends the structured unit code on the wire payload — deterministic Odoo mapping (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md)", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "5", unit: "branch", notes: "", lengthMm: "" };
  const item = buildRfqItemInput(fields, "fa");
  assert.equal(item?.unit, "branch");
});

test("buildRfqItemInput never sends catalogVariantXid for a custom row", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "Custom item", sizeSpec: "", quantityValue: "1", unit: "piece", notes: "" };
  const item = buildRfqItemInput(fields, "en");
  assert.ok(item);
  assert.ok(!("catalogVariantXid" in item));
});

test("buildRfqItemInput returns null for a custom row with no product title, even with a valid quantity", () => {
  const fields: RfqCustomRowFields = { mode: "custom", productTitle: "   ", sizeSpec: "", quantityValue: "5", unit: "kg", notes: "" };
  assert.equal(buildRfqItemInput(fields, "fa"), null);
});

// --- lengthMm (POST-P3F RFQ length_mm full stack) ---

test("isValidLengthMmValue: empty string is valid (the field is optional)", () => {
  assert.equal(isValidLengthMmValue(""), true);
  assert.equal(isValidLengthMmValue("   "), true);
});

test("isValidLengthMmValue: accepts a positive whole number", () => {
  assert.equal(isValidLengthMmValue("8000"), true);
  assert.equal(isValidLengthMmValue("1"), true);
});

test("isValidLengthMmValue: rejects zero", () => {
  assert.equal(isValidLengthMmValue("0"), false);
});

test("isValidLengthMmValue: rejects a negative value", () => {
  assert.equal(isValidLengthMmValue("-5"), false);
});

test("isValidLengthMmValue: rejects a non-numeric value", () => {
  assert.equal(isValidLengthMmValue("abc"), false);
});

test("isValidLengthMmValue: rejects a fractional value — whole millimetres only", () => {
  assert.equal(isValidLengthMmValue("8000.5"), false);
});

test("createEmptyCatalogRow starts with an empty lengthMm", () => {
  const row = createEmptyCatalogRow();
  if (row.fields.mode !== "catalog") return;
  assert.equal(row.fields.lengthMm, "");
});

test("validateRfqRow flags an invalid lengthMm on a catalog row", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: "c", templateXid: "t", variantXid: "v", quantityValue: "500", unit: "kg", notes: "", lengthMm: "-5" };
  assert.deepEqual(validateRfqRow(fields), ["length"]);
});

test("validateRfqRow passes a catalog row with a valid lengthMm", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: "c", templateXid: "t", variantXid: "v", quantityValue: "500", unit: "kg", notes: "", lengthMm: "8000" };
  assert.deepEqual(validateRfqRow(fields), []);
});

test("buildRfqItemInput omits lengthMm from the wire payload when empty", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "1", unit: "kg", notes: "", lengthMm: "" };
  const item = buildRfqItemInput(fields, "fa");
  assert.equal(item?.lengthMm, undefined);
});

test("buildRfqItemInput includes a present, valid lengthMm on the wire payload as a number", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "1", unit: "kg", notes: "", lengthMm: "8000" };
  const item = buildRfqItemInput(fields, "fa");
  assert.equal(item?.lengthMm, 8000);
  assert.equal(typeof item?.lengthMm, "number");
});

test("buildRfqItemInput returns null for a catalog row with an invalid lengthMm, never silently drops it", () => {
  const fields: RfqCatalogRowFields = { mode: "catalog", categoryCode: null, templateXid: null, variantXid: "variant-a", quantityValue: "1", unit: "kg", notes: "", lengthMm: "not-a-number" };
  assert.equal(buildRfqItemInput(fields, "fa"), null);
});

test("isRfqRowEmpty is false when only lengthMm is filled on an otherwise-empty catalog row", () => {
  const row = createEmptyCatalogRow();
  if (row.fields.mode !== "catalog") return;
  assert.equal(isRfqRowEmpty({ ...row.fields, lengthMm: "8000" }), false);
});
