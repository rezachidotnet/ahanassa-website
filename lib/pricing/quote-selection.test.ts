import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWinningQuote, type QuoteCandidate, type TargetBasis } from "./quote-selection.ts";
import type { ProviderPublicationPolicy } from "./provider-policy.ts";

// A fixed reference instant (a Thursday — never a weekend edge, since these
// tests are about basis/priority/freshness-tier semantics, not the
// weekend rule itself, which is exhaustively covered in provider-policy.test.ts).
const NOW = new Date("2026-09-10T12:00:00.000Z");

const TARGET: TargetBasis = { unit: "kg", currency: "IRR", marketOrLocation: "tehran", deliveryBasis: null, variantKey: null };

function dailyPolicy(providerId: string): ProviderPublicationPolicy {
  return { providerId, cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: null, timezone: "UTC" };
}

function policies(...providerIds: string[]): Map<string, ProviderPublicationPolicy> {
  return new Map(providerIds.map((id) => [id, dailyPolicy(id)]));
}

function freshTimestamp(): string {
  return NOW.toISOString();
}

function agingTimestamp(): string {
  // Exactly one missed expected daily cycle under `dailyPolicy` — AGING.
  return new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

function staleTimestamp(): string {
  // Two+ missed expected daily cycles — STALE.
  return new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
}

function candidate(overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
  return {
    providerId: "odoo",
    unit: "kg",
    currency: "IRR",
    marketOrLocation: "tehran",
    deliveryBasis: null,
    variantKey: null,
    priceAmountIrr: 71100,
    sourceTimestamp: freshTimestamp(),
    syncedAt: freshTimestamp(),
    ...overrides,
  };
}

test("empty candidate list returns null", () => {
  assert.equal(selectWinningQuote([], TARGET, [], policies(), NOW), null);
});

// --- exact basis, including exact variant identity (PRICE-P1/P2) ---

test("exact-basis-only matching: a different unit is never returned", () => {
  const result = selectWinningQuote([candidate({ unit: "ton" })], TARGET, [], policies("odoo"), NOW);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different currency is never returned", () => {
  const result = selectWinningQuote([candidate({ currency: "USD" as never })], TARGET, [], policies("odoo"), NOW);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different market/location is never returned", () => {
  const result = selectWinningQuote([candidate({ marketOrLocation: "isfahan" })], TARGET, [], policies("odoo"), NOW);
  assert.equal(result, null);
});

test("exact-basis-only matching: a different delivery basis is never returned", () => {
  const result = selectWinningQuote([candidate({ deliveryBasis: "ex-works" })], TARGET, [], policies("odoo"), NOW);
  assert.equal(result, null);
});

test("template-only target (variantKey: null) accepts a candidate regardless of its own variantKey — pre-P1 behavior preserved", () => {
  const result = selectWinningQuote([candidate({ variantKey: "some-variant-xid" })], TARGET, [], policies("odoo"), NOW);
  assert.ok(result, "a template-only display target must not be narrowed by a candidate's own variant identity");
});

test("exact-variant target requires an EXACT candidate variantKey match", () => {
  const exactTarget: TargetBasis = { ...TARGET, variantKey: "variant-a" };
  const wrongVariant = candidate({ variantKey: "variant-b" });
  const noVariant = candidate({ variantKey: null });
  assert.equal(selectWinningQuote([wrongVariant], exactTarget, [], policies("odoo"), NOW), null, "a different exact variant must never satisfy an exact-variant target");
  assert.equal(selectWinningQuote([noVariant], exactTarget, [], policies("odoo"), NOW), null, "a candidate with no variant identity must never satisfy an exact-variant target");
});

test("exact-variant target: a matching variantKey is selected", () => {
  const exactTarget: TargetBasis = { ...TARGET, variantKey: "variant-a" };
  const result = selectWinningQuote([candidate({ variantKey: "variant-a" })], exactTarget, [], policies("odoo"), NOW);
  assert.ok(result);
  assert.equal(result!.candidate.variantKey, "variant-a");
});

// --- freshness-tier preference ---

test("fresh-before-aging, regardless of provider priority", () => {
  const agingHighPriority = candidate({ providerId: "priority-provider", sourceTimestamp: agingTimestamp() });
  const freshLowPriority = candidate({ providerId: "other-provider", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([agingHighPriority, freshLowPriority], TARGET, ["priority-provider", "other-provider"], policies("priority-provider", "other-provider"), NOW);
  assert.equal(result?.candidate.providerId, "other-provider", "fresh must win even though the aging quote's provider has higher configured priority");
  assert.equal(result?.freshness, "fresh");
});

test("among fresh compatible quotes, configured provider priority decides", () => {
  const first = candidate({ providerId: "provider-a", priceAmountIrr: 100 });
  const second = candidate({ providerId: "provider-b", priceAmountIrr: 200 });
  const result = selectWinningQuote([second, first], TARGET, ["provider-a", "provider-b"], policies("provider-a", "provider-b"), NOW);
  assert.equal(result?.candidate.providerId, "provider-a");
});

test("among aging compatible quotes (no fresh candidate at all), configured provider priority decides", () => {
  const agingA = candidate({ providerId: "provider-a", sourceTimestamp: agingTimestamp() });
  const agingB = candidate({ providerId: "provider-b", sourceTimestamp: agingTimestamp() });
  const result = selectWinningQuote([agingB, agingA], TARGET, ["provider-a", "provider-b"], policies("provider-a", "provider-b"), NOW);
  assert.equal(result?.candidate.providerId, "provider-a");
  assert.equal(result?.freshness, "aging");
});

test("AGING is selected when no FRESH candidate exists (task §15 point 4)", () => {
  const result = selectWinningQuote([candidate({ sourceTimestamp: agingTimestamp() })], TARGET, ["odoo"], policies("odoo"), NOW);
  assert.ok(result);
  assert.equal(result!.freshness, "aging");
});

// --- V2.1 supersession: STALE and UNAVAILABLE are NEVER returned ---

test("a STALE-only candidate set returns null — the legacy 'fall back to stale' behavior is retired for the Homepage (task §15 point 5)", () => {
  const staleA = candidate({ providerId: "provider-a", sourceTimestamp: staleTimestamp() });
  const staleB = candidate({ providerId: "provider-b", sourceTimestamp: staleTimestamp() });
  const result = selectWinningQuote([staleB, staleA], TARGET, ["provider-a", "provider-b"], policies("provider-a", "provider-b"), NOW);
  assert.equal(result, null, "no fallback to the highest-priority stale quote — STALE is Homepage-ineligible, full stop");
});

test("an UNAVAILABLE-only candidate set (missing policy) returns null (task §15 point 6)", () => {
  const result = selectWinningQuote([candidate({ providerId: "no-policy-provider" })], TARGET, ["no-policy-provider"], policies(), NOW); // empty policy map
  assert.equal(result, null);
});

test("a fresh candidate wins even when a higher-priority provider's candidate is STALE — no partial credit for priority once a candidate is ineligible", () => {
  const staleHighPriority = candidate({ providerId: "priority-provider", sourceTimestamp: staleTimestamp() });
  const freshLowPriority = candidate({ providerId: "other-provider", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([staleHighPriority, freshLowPriority], TARGET, ["priority-provider", "other-provider"], policies("priority-provider", "other-provider"), NOW);
  assert.equal(result?.candidate.providerId, "other-provider");
});

test("falls back to AGING (never STALE) when the only fresh candidate has the wrong basis and must be ignored entirely", () => {
  const agingMatching = candidate({ providerId: "a", sourceTimestamp: agingTimestamp() });
  const freshWrongBasis = candidate({ providerId: "b", unit: "ton", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([agingMatching, freshWrongBasis], TARGET, ["a", "b"], policies("a", "b"), NOW);
  assert.equal(result?.candidate.providerId, "a", "the fresh candidate has the wrong basis and must be ignored entirely");
  assert.equal(result?.freshness, "aging");
});

// --- priority / no-averaging ---

test("a provider not in the priority order is treated as lowest priority, not excluded", () => {
  const known = candidate({ providerId: "known", sourceTimestamp: freshTimestamp() });
  const unknown = candidate({ providerId: "unlisted", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([unknown, known], TARGET, ["known"], policies("known", "unlisted"), NOW);
  assert.equal(result?.candidate.providerId, "known");
});

test("never averages — the winner is always exactly one candidate's own price", () => {
  const a = candidate({ providerId: "a", priceAmountIrr: 100 });
  const b = candidate({ providerId: "b", priceAmountIrr: 200 });
  const result = selectWinningQuote([a, b], TARGET, ["a"], policies("a", "b"), NOW);
  assert.ok(result?.candidate.priceAmountIrr === 100 || result?.candidate.priceAmountIrr === 200);
});

// --- PRICE-P3.1: exact quote-to-variant binding gate — sibling variant attack scenarios ---
//
// Commercial invariant (task §3): a Homepage benchmark curated as
// { productKey: TEMPLATE_A, variantKey: VARIANT_16 } may only be won by a
// quote whose OWN variant_key is exactly VARIANT_16 — never a sibling
// variant under the same template, regardless of provider priority,
// freshness, price, or candidate insertion order. `matchesBasis` (this
// file) is where this is actually enforced; these tests deliberately stack
// every OTHER dimension in the sibling's favor to prove the variant check
// cannot be defeated by winning on those dimensions.

test("sibling variant attack: Variant A (higher provider priority, fresher timestamp) never wins over Variant B, the display's own exact target — Variant B wins despite lower priority and merely AGING freshness", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const quoteA_wrongVariant_betterEverything = candidate({ providerId: "priority-provider", variantKey: "variant-a-size14", sourceTimestamp: freshTimestamp() });
  const quoteB_correctVariant_worseEverything = candidate({ providerId: "low-priority-provider", variantKey: "variant-b-size16", sourceTimestamp: agingTimestamp() });

  const result = selectWinningQuote(
    [quoteA_wrongVariant_betterEverything, quoteB_correctVariant_worseEverything],
    displayTargetsVariantB,
    ["priority-provider", "low-priority-provider"],
    policies("priority-provider", "low-priority-provider"),
    NOW,
  );

  assert.ok(result, "the exact-variant quote must still win even though it is lower priority and only AGING");
  assert.equal(result!.candidate.variantKey, "variant-b-size16");
  assert.equal(result!.candidate.providerId, "low-priority-provider");
  assert.equal(result!.freshness, "aging");
});

test("sibling variant attack: candidate insertion order does not matter — the wrong-variant candidate first in the array still never wins", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const quoteA = candidate({ providerId: "a", variantKey: "variant-a-size14", sourceTimestamp: freshTimestamp() });
  const quoteB = candidate({ providerId: "b", variantKey: "variant-b-size16", sourceTimestamp: freshTimestamp() });

  const resultAFirst = selectWinningQuote([quoteA, quoteB], displayTargetsVariantB, ["a", "b"], policies("a", "b"), NOW);
  const resultBFirst = selectWinningQuote([quoteB, quoteA], displayTargetsVariantB, ["a", "b"], policies("a", "b"), NOW);

  assert.equal(resultAFirst?.candidate.variantKey, "variant-b-size16");
  assert.equal(resultBFirst?.candidate.variantKey, "variant-b-size16");
});

test("sibling variant attack: a sibling-variant candidate with a LOWER price also never wins — price never overrides variant identity", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const cheaperWrongVariant = candidate({ providerId: "a", variantKey: "variant-a-size14", priceAmountIrr: 1 });
  const correctVariant = candidate({ providerId: "b", variantKey: "variant-b-size16", priceAmountIrr: 999_999 });

  const result = selectWinningQuote([cheaperWrongVariant, correctVariant], displayTargetsVariantB, ["a", "b"], policies("a", "b"), NOW);
  assert.equal(result?.candidate.variantKey, "variant-b-size16");
  assert.equal(result?.candidate.priceAmountIrr, 999_999);
});

test("NULL variant quote case: a legacy template-only quote (variant_key: null) never satisfies an exact-variant target, even as the ONLY candidate", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const legacyTemplateOnlyQuote = candidate({ variantKey: null, sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([legacyTemplateOnlyQuote], displayTargetsVariantB, [], policies("odoo"), NOW);
  assert.equal(result, null, "a legacy template-only quote must never be treated as a fallback for an exact-variant V2.1 benchmark");
});

test("NULL variant quote case: excluded even when it is the ONLY fresh candidate among otherwise-eligible sibling-variant quotes", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const legacyFresh = candidate({ providerId: "legacy", variantKey: null, sourceTimestamp: freshTimestamp() });
  const siblingAging = candidate({ providerId: "sibling", variantKey: "variant-a-size14", sourceTimestamp: agingTimestamp() });
  const result = selectWinningQuote([legacyFresh, siblingAging], displayTargetsVariantB, ["legacy", "sibling"], policies("legacy", "sibling"), NOW);
  assert.equal(result, null, "neither the null-variant nor the sibling-variant candidate may win an exact-variant target");
});

test("two correct quotes for the SAME exact variant still follow normal provider-priority/freshness rules (variant binding does not disable the rest of the selection policy)", () => {
  const displayTargetsVariantB: TargetBasis = { ...TARGET, variantKey: "variant-b-size16" };
  const lowerPriorityCorrectVariant = candidate({ providerId: "low", variantKey: "variant-b-size16", sourceTimestamp: freshTimestamp() });
  const higherPriorityCorrectVariant = candidate({ providerId: "high", variantKey: "variant-b-size16", sourceTimestamp: freshTimestamp() });
  const result = selectWinningQuote([lowerPriorityCorrectVariant, higherPriorityCorrectVariant], displayTargetsVariantB, ["high", "low"], policies("high", "low"), NOW);
  assert.equal(result?.candidate.providerId, "high", "among two candidates for the SAME exact variant, ordinary provider priority still decides");
});
