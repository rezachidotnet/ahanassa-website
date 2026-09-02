import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePriceQuote } from "./normalize.ts";
import type { IncomingPriceQuote } from "./types.ts";

function baseIncoming(overrides: Partial<IncomingPriceQuote> = {}): IncomingPriceQuote {
  return {
    providerProductRef: "rebar-16-esfahan",
    amount: 7110,
    unit: "kg",
    sourceTimestamp: new Date().toISOString(),
    ...overrides,
  };
}

test("normalizePriceQuote converts a Toman-quoting provider's amount to exact Rial (x10)", () => {
  const result = normalizePriceQuote(baseIncoming({ amount: 7110 }), "fooladiranian", "IRT");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.quote.priceAmountIrr, 71100);
});

test("normalizePriceQuote passes an already-Rial provider's amount through unconverted", () => {
  const result = normalizePriceQuote(baseIncoming({ amount: 71100 }), "some-irr-provider", "IRR");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.quote.priceAmountIrr, 71100);
});

test("normalizePriceQuote rejects a future source timestamp", () => {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const result = normalizePriceQuote(baseIncoming({ sourceTimestamp: oneHourFromNow }), "p", "IRR");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.rejectedReason, "future_source_timestamp");
});

test("normalizePriceQuote allows a small clock-skew-tolerant near-future timestamp", () => {
  const thirtySecondsFromNow = new Date(Date.now() + 30_000).toISOString();
  const result = normalizePriceQuote(baseIncoming({ sourceTimestamp: thirtySecondsFromNow }), "p", "IRR");
  assert.equal(result.ok, true);
});

test("normalizePriceQuote rejects an unparseable source timestamp", () => {
  const result = normalizePriceQuote(baseIncoming({ sourceTimestamp: "not-a-date" }), "p", "IRR");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.rejectedReason, "invalid_source_timestamp");
});

test("normalizePriceQuote accepts a record with no source timestamp at all", () => {
  const result = normalizePriceQuote(baseIncoming({ sourceTimestamp: undefined }), "p", "IRR");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.quote.sourceTimestamp, undefined);
});

test("normalizePriceQuote rejects zero/negative/non-finite amounts", () => {
  assert.equal(normalizePriceQuote(baseIncoming({ amount: 0 }), "p", "IRR").ok, false);
  assert.equal(normalizePriceQuote(baseIncoming({ amount: -5 }), "p", "IRR").ok, false);
  assert.equal(normalizePriceQuote(baseIncoming({ amount: NaN }), "p", "IRR").ok, false);
});

test("normalizePriceQuote rejects an unknown unit", () => {
  const result = normalizePriceQuote(baseIncoming({ unit: "furlong" }), "p", "IRR");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.rejectedReason, "unknown_unit");
});

test("normalizePriceQuote rejects a missing providerProductRef", () => {
  const result = normalizePriceQuote(baseIncoming({ providerProductRef: "" }), "p", "IRR");
  assert.equal(result.ok, false);
});

test("normalizePriceQuote never leaks provider-specific currency convention into the normalized shape — currency is always 'IRR'", () => {
  const result = normalizePriceQuote(baseIncoming(), "fooladiranian", "IRT");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.quote.currency, "IRR");
});
