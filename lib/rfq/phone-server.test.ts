import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAndComposeE164 } from "./phone-server.ts";

test("IR: valid 10-digit mobile, no leading zero -> composes E.164", () => {
  const result = validateAndComposeE164("IR", "9123456789");
  assert.deepEqual(result, { ok: true, e164: "+989123456789", callingCode: "98", nationalNumber: "9123456789" });
});

test("IR: a leading zero is rejected (owner's explicit convention)", () => {
  const result = validateAndComposeE164("IR", "09123456789");
  assert.equal(result.ok, false);
});

test("IR: Persian numerals normalize before validation", () => {
  const result = validateAndComposeE164("IR", "۹۱۲۳۴۵۶۷۸۹");
  assert.equal(result.ok, true);
  assert.equal(result.e164, "+989123456789");
});

test("IR: Arabic-Indic numerals normalize before validation", () => {
  const result = validateAndComposeE164("IR", "٩١٢٣٤٥٦٧٨٩");
  assert.equal(result.ok, true);
  assert.equal(result.e164, "+989123456789");
});

test("IR: wrong length (9 digits) is rejected", () => {
  assert.equal(validateAndComposeE164("IR", "912345678").ok, false);
});

test("IQ: valid 10-digit mobile, no leading zero -> composes E.164", () => {
  const result = validateAndComposeE164("IQ", "7123456789");
  assert.deepEqual(result, { ok: true, e164: "+9647123456789", callingCode: "964", nationalNumber: "7123456789" });
});

test("IQ: a leading zero is rejected", () => {
  assert.equal(validateAndComposeE164("IQ", "07123456789").ok, false);
});

test("IT: a leading zero is SIGNIFICANT and required — proves the IR/IQ rule is not global", () => {
  const withZero = validateAndComposeE164("IT", "0212345678");
  assert.equal(withZero.ok, true);
  assert.equal(withZero.e164, "+390212345678");

  const withoutZero = validateAndComposeE164("IT", "212345678");
  assert.equal(withoutZero.ok, false, "stripping IT's significant leading zero must not be a global behavior");
});

test("shared calling code +1: US and CA are validated independently by ISO-2, not conflated", () => {
  // A US-format 10-digit number: NPA 202 (Washington DC) is not conflated
  // across the two ISO-2 codes that happen to share dial code +1.
  const us = validateAndComposeE164("US", "2025551234");
  assert.equal(us.ok, true);
  assert.equal(us.callingCode, "1");
  const ca = validateAndComposeE164("CA", "4165551234"); // Toronto NPA 416
  assert.equal(ca.ok, true);
  assert.equal(ca.callingCode, "1");
});

test("a client-supplied ISO-2 that doesn't match the digits' actual valid country is rejected", () => {
  // "612345678" is a valid French mobile national number, but the same
  // digits are not a valid Belgian number — the server must not blindly
  // trust the client's claimed ISO-2 over the actual per-country metadata.
  const asFrance = validateAndComposeE164("FR", "612345678");
  assert.equal(asFrance.ok, true);
  const asBelgium = validateAndComposeE164("BE", "612345678");
  assert.equal(asBelgium.ok, false);
});

test("empty local number is rejected", () => {
  assert.equal(validateAndComposeE164("IR", "").ok, false);
});

test("empty ISO-2 is rejected", () => {
  assert.equal(validateAndComposeE164("", "9123456789").ok, false);
});

test("unknown ISO-2 is rejected, not thrown", () => {
  assert.equal(validateAndComposeE164("ZZ", "9123456789").ok, false);
});
