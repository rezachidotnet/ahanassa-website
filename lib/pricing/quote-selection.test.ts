import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWinningQuote, type QuoteCandidate, type TargetBasis } from "./quote-selection.ts";

const TARGET: TargetBasis = { unit: "kg", currency: "IRR", marketOrLocation: "tehran", deliveryBasis: null };

function freshTimestamp(): string {
  return new Date().toISOString();
}

function staleTimestamp(): string {
  return new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
}

function candidate(overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
  return {
    providerId: "odoo",
    unit: "kg",
    currency: "IRR",
    marketOrLocation: "tehran",
    deliveryBasis: null,
    priceAmountIrr: 71100,
    sourceTimestamp: freshTimestamp(),
    syncedAt: freshTimestamp(),
    ...overrides,
  };
}

test("empty candidate list returns null", () => {
  assert.equal(selectWinningQuote([], TARGET, []), null);
});

test("exact-basis-only matching: a different unit is never returned", () => {
  const result = selectWinningQuote([candidate({ unit: "ton" })], TARGET, []);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different currency is never returned", () => {
  const result = selectWinningQuote([candidate({ currency: "USD" as never })], TARGET, []);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different market/location is never returned", () => {
  const result = selectWinningQuote([candidate({ marketOrLocation: "isfahan" })], TARGET, []);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different delivery basis is never returned", () => {
  const result = selectWinningQuote([candidate({ deliveryBasis: "ex-works" })], TARGET, []);
  assert.equal(result, null);
});

test("fresh-before-stale, regardless of provider priority", () => {
  const staleHighPriority = candidate({ providerId: "priority-provider", sourceTimestamp: staleTimestamp() });
  const freshLowPriority = candidate({ providerId: "other-provider", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([staleHighPriority, freshLowPriority], TARGET, ["priority-provider", "other-provider"]);
  assert.equal(result?.providerId, "other-provider", "fresh must win even though the stale quote's provider has higher configured priority");
});

test("among fresh compatible quotes, configured provider priority decides", () => {
  const first = candidate({ providerId: "provider-a", priceAmountIrr: 100 });
  const second = candidate({ providerId: "provider-b", priceAmountIrr: 200 });
  const result = selectWinningQuote([second, first], TARGET, ["provider-a", "provider-b"]);
  assert.equal(result?.providerId, "provider-a");
});

test("only-stale-available falls back to the highest-priority stale quote", () => {
  const staleA = candidate({ providerId: "provider-a", sourceTimestamp: staleTimestamp() });
  const staleB = candidate({ providerId: "provider-b", sourceTimestamp: staleTimestamp() });
  const result = selectWinningQuote([staleB, staleA], TARGET, ["provider-a", "provider-b"]);
  assert.equal(result?.providerId, "provider-a");
});

test("a provider not in the priority order is treated as lowest priority, not excluded", () => {
  const known = candidate({ providerId: "known", sourceTimestamp: freshTimestamp() });
  const unknown = candidate({ providerId: "unlisted", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([unknown, known], TARGET, ["known"]);
  assert.equal(result?.providerId, "known");
});

test("never averages — the winner is always exactly one candidate's own price", () => {
  const a = candidate({ providerId: "a", priceAmountIrr: 100 });
  const b = candidate({ providerId: "b", priceAmountIrr: 200 });
  const result = selectWinningQuote([a, b], TARGET, ["a"]);
  assert.ok(result?.priceAmountIrr === 100 || result?.priceAmountIrr === 200);
});

test("falls back to stale only when literally no fresh compatible quote exists, even with many candidates", () => {
  const staleMatching = candidate({ providerId: "a", sourceTimestamp: staleTimestamp() });
  const freshWrongBasis = candidate({ providerId: "b", unit: "ton", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([staleMatching, freshWrongBasis], TARGET, ["a", "b"]);
  assert.equal(result?.providerId, "a", "the fresh candidate has the wrong basis and must be ignored entirely");
});
