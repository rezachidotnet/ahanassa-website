import { test } from "node:test";
import assert from "node:assert/strict";
import { composeQuantityText, isValidQuantityValue, RFQ_UOM_CODES, RFQ_UOM_LABELS } from "./uom.ts";

test("RFQ_UOM_CODES has exactly the 8 codes the Odoo RFQ API contract accepts", () => {
  assert.deepEqual([...RFQ_UOM_CODES].sort(), ["branch", "bundle", "coil", "kg", "meter", "piece", "sheet", "ton"].sort());
});

test("RFQ_UOM_LABELS has a label for every code in every locale", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    for (const code of RFQ_UOM_CODES) {
      assert.ok(RFQ_UOM_LABELS[locale][code], `${locale}/${code}`);
    }
  }
});

// --- composeQuantityText ---

test("composeQuantityText composes a Persian quantity + unit string", () => {
  assert.equal(composeQuantityText("5000", "kg", "fa"), "5000 کیلوگرم");
});

test("composeQuantityText composes an English quantity + unit string", () => {
  assert.equal(composeQuantityText("12", "branch", "en"), "12 branch");
});

test("composeQuantityText composes an Arabic quantity + unit string", () => {
  assert.equal(composeQuantityText("3", "ton", "ar"), "3 طن");
});

test("composeQuantityText strips thousands separators before composing", () => {
  assert.equal(composeQuantityText("5,000", "kg", "fa"), "5000 کیلوگرم");
});

test("composeQuantityText returns null for an empty value", () => {
  assert.equal(composeQuantityText("", "kg", "fa"), null);
  assert.equal(composeQuantityText("   ", "kg", "fa"), null);
});

test("composeQuantityText returns null for a non-numeric value", () => {
  assert.equal(composeQuantityText("abc", "kg", "fa"), null);
});

test("composeQuantityText returns null for zero or negative values — never fabricates a positive quantity", () => {
  assert.equal(composeQuantityText("0", "kg", "fa"), null);
  assert.equal(composeQuantityText("-5", "kg", "fa"), null);
});

test("composeQuantityText accepts a decimal value", () => {
  assert.equal(composeQuantityText("12.5", "meter", "en"), "12.5 meter");
});

test("composeQuantityText normalizes Persian digits before composing, same as the server-side parser", () => {
  assert.equal(composeQuantityText("۵۰۰۰", "kg", "fa"), "5000 کیلوگرم");
});

// --- isValidQuantityValue ---

test("isValidQuantityValue accepts a positive number", () => {
  assert.equal(isValidQuantityValue("500"), true);
});

test("isValidQuantityValue rejects empty/zero/negative/non-numeric input", () => {
  assert.equal(isValidQuantityValue(""), false);
  assert.equal(isValidQuantityValue("0"), false);
  assert.equal(isValidQuantityValue("-1"), false);
  assert.equal(isValidQuantityValue("abc"), false);
});
