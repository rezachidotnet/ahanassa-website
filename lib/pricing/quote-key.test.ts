import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuoteKey } from "./quote-key.ts";
import type { NormalizedPriceQuote } from "./types.ts";

function baseQuote(overrides: Partial<NormalizedPriceQuote> = {}): NormalizedPriceQuote {
  return {
    providerId: "odoo",
    providerProductRef: "rebar-16",
    priceAmountIrr: 71100,
    currency: "IRR",
    unit: "kg",
    ...overrides,
  };
}

test("computeQuoteKey is provider-namespaced when a providerQuoteRef is supplied", async () => {
  const key = await computeQuoteKey(baseQuote({ providerQuoteRef: "123" }));
  assert.equal(key, "odoo:123");
});

test("two different providers both using quote reference '123' do not collide", async () => {
  const keyA = await computeQuoteKey(baseQuote({ providerId: "odoo", providerQuoteRef: "123" }));
  const keyB = await computeQuoteKey(baseQuote({ providerId: "fooladiranian", providerQuoteRef: "123" }));
  assert.notEqual(keyA, keyB);
  assert.equal(keyA, "odoo:123");
  assert.equal(keyB, "fooladiranian:123");
});

test("computeQuoteKey falls back to a namespaced hash when no providerQuoteRef exists", async () => {
  const key = await computeQuoteKey(baseQuote({ providerQuoteRef: undefined }));
  assert.match(key, /^odoo:[0-9a-f]{64}$/);
});

test("computeQuoteKey's hash fallback distinguishes different units/markets/bases for the same product", async () => {
  const kg = await computeQuoteKey(baseQuote({ unit: "kg" }));
  const ton = await computeQuoteKey(baseQuote({ unit: "ton" }));
  assert.notEqual(kg, ton);

  const tehran = await computeQuoteKey(baseQuote({ marketOrLocation: "tehran" }));
  const isfahan = await computeQuoteKey(baseQuote({ marketOrLocation: "isfahan" }));
  assert.notEqual(tehran, isfahan);

  const basisA = await computeQuoteKey(baseQuote({ deliveryBasis: "ex-works" }));
  const basisB = await computeQuoteKey(baseQuote({ deliveryBasis: "delivered" }));
  assert.notEqual(basisA, basisB);
});

test("computeQuoteKey's hash fallback is deterministic for identical inputs", async () => {
  const a = await computeQuoteKey(baseQuote());
  const b = await computeQuoteKey(baseQuote());
  assert.equal(a, b);
});
