import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRenderPriceStrip, formatToman, formatEffectiveTimestamp, buildCommercialContextLine, buildFreshnessLine, type FreshnessCopy } from "./price-strip-presentation.ts";

const COPY: FreshnessCopy = { updatedPrefix: "به‌روزرسانی", agingPrefix: "آخرین قیمت ثبت‌شده" };

// --- render threshold ---

test("shouldRenderPriceStrip: 0 items -> false", () => {
  assert.equal(shouldRenderPriceStrip(0), false);
});

test("shouldRenderPriceStrip: 1 item -> false (never shown in isolation)", () => {
  assert.equal(shouldRenderPriceStrip(1), false);
});

test("shouldRenderPriceStrip: 2 items -> true", () => {
  assert.equal(shouldRenderPriceStrip(2), true);
});

test("shouldRenderPriceStrip: 6 items -> true", () => {
  assert.equal(shouldRenderPriceStrip(6), true);
});

// --- price formatting ---

test("formatToman: fa uses Persian digits/grouping", () => {
  const result = formatToman(1_234_567, "fa");
  assert.ok(/[۰-۹]/.test(result), "expected Persian-Indic digits");
});

test("formatToman: en uses Western digits with comma grouping", () => {
  assert.equal(formatToman(1_234_567, "en"), "1,234,567");
});

test("formatToman: no floating point artifacts for an exact integer", () => {
  assert.equal(formatToman(50_000, "en"), "50,000");
});

// --- timestamp formatting ---

test("formatEffectiveTimestamp: falls back to the raw ISO string on a malformed timestamp rather than throwing", () => {
  const result = formatEffectiveTimestamp("not-a-real-timestamp", "en");
  assert.equal(result, "not-a-real-timestamp");
});

test("formatEffectiveTimestamp: produces a non-empty string for a valid timestamp in every locale", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const result = formatEffectiveTimestamp("2026-09-04T10:42:00.000Z", locale);
    assert.ok(result.length > 0);
  }
});

// --- commercial context line ---

test("buildCommercialContextLine: both present -> joined with a middle dot", () => {
  assert.equal(buildCommercialContextLine("Tehran", "ex-warehouse"), "Tehran · ex-warehouse");
});

test("buildCommercialContextLine: only marketOrLocation -> no stray separator", () => {
  assert.equal(buildCommercialContextLine("Tehran", undefined), "Tehran");
});

test("buildCommercialContextLine: only deliveryBasis -> no stray separator", () => {
  assert.equal(buildCommercialContextLine(undefined, "ex-warehouse"), "ex-warehouse");
});

test("buildCommercialContextLine: both absent -> empty string, never a literal 'undefined'/'null'/'-'", () => {
  const result = buildCommercialContextLine(undefined, undefined);
  assert.equal(result, "");
  assert.ok(!result.includes("undefined"));
  assert.ok(!result.includes("null"));
});

// --- freshness line ---

test("buildFreshnessLine: FRESH uses the updated-prefix wording with the timestamp appended directly", () => {
  const line = buildFreshnessLine("fresh", "10:42", COPY);
  assert.equal(line, "به‌روزرسانی 10:42");
});

test("buildFreshnessLine: AGING uses the aging-prefix wording joined with a middle dot, and the real timestamp remains visible", () => {
  const line = buildFreshnessLine("aging", "12 شهریور، 14:10", COPY);
  assert.equal(line, "آخرین قیمت ثبت‌شده · 12 شهریور، 14:10");
  assert.ok(line.includes("12 شهریور، 14:10"), "the actual timestamp must remain visible in the AGING state");
});

test("buildFreshnessLine: AGING never reuses the FRESH prefix, and vice versa", () => {
  const freshLine = buildFreshnessLine("fresh", "10:42", COPY);
  const agingLine = buildFreshnessLine("aging", "10:42", COPY);
  assert.notEqual(freshLine, agingLine);
  assert.ok(!freshLine.includes(COPY.agingPrefix));
  assert.ok(!agingLine.includes(COPY.updatedPrefix));
});
