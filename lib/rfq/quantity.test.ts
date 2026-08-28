import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, parseLeadingQuantity } from "./quantity.ts";

test("normalizeDigits converts Persian digits to ASCII", () => {
  assert.equal(normalizeDigits("۲۰۰ تن"), "200 تن");
});

test("normalizeDigits converts Arabic-Indic digits to ASCII", () => {
  assert.equal(normalizeDigits("٢٠٠ طن"), "200 طن");
});

test("normalizeDigits leaves ASCII digits and other text untouched", () => {
  assert.equal(normalizeDigits("200 tons"), "200 tons");
});

test("parseLeadingQuantity extracts a plain integer with a trailing unit", () => {
  assert.deepEqual(parseLeadingQuantity("200 تن"), { value: 200, scale: 0 });
});

test("parseLeadingQuantity extracts a decimal value as an integer + scale (value x 10^-scale, DATABASE_SCHEMA.md §3.1)", () => {
  // "4.5" -> value 45, scale 1 -> displayed as 45 x 10^-1 = 4.5.
  assert.deepEqual(parseLeadingQuantity("4.5 ton"), { value: 45, scale: 1 });
});

test("parseLeadingQuantity normalizes Persian digits before parsing", () => {
  assert.deepEqual(parseLeadingQuantity("۵۰۰ عدد"), { value: 500, scale: 0 });
});

test("parseLeadingQuantity accepts a comma decimal separator", () => {
  assert.deepEqual(parseLeadingQuantity("12,5 kg"), { value: 125, scale: 1 });
});

test("parseLeadingQuantity returns null for non-numeric text", () => {
  assert.equal(parseLeadingQuantity("چند تا لازم دارم"), null);
});

test("parseLeadingQuantity returns null for zero or negative-looking input", () => {
  assert.equal(parseLeadingQuantity("0 تن"), null);
});

test("parseLeadingQuantity returns null rather than guessing on empty input", () => {
  assert.equal(parseLeadingQuantity(""), null);
  assert.equal(parseLeadingQuantity("   "), null);
});
