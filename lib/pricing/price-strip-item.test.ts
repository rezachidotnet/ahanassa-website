import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPriceStripItem, type PriceStripDisplayInput, type PriceStripVariantAnchor } from "./price-strip-item.ts";
import type { QuoteCandidate } from "./quote-selection.ts";
import type { ProviderPublicationPolicy } from "./provider-policy.ts";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function dailyPolicy(providerId: string): ProviderPublicationPolicy {
  return { providerId, cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: null, timezone: "UTC" };
}

function policies(...providerIds: string[]): Map<string, ProviderPublicationPolicy> {
  return new Map(providerIds.map((id) => [id, dailyPolicy(id)]));
}

function freshCandidate(overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
  return {
    providerId: "odoo",
    unit: "kg",
    currency: "IRR",
    marketOrLocation: null,
    deliveryBasis: null,
    variantKey: "variant-1",
    priceAmountIrr: 500_000,
    sourceTimestamp: NOW.toISOString(),
    syncedAt: NOW.toISOString(),
    ...overrides,
  };
}

const display: PriceStripDisplayInput = {
  displayPriceId: "dp-1",
  templateXid: "template-1",
  variantXid: "variant-1",
  target: { unit: "kg", currency: "IRR", marketOrLocation: null, deliveryBasis: null, variantKey: "variant-1" },
};

const anchor: PriceStripVariantAnchor = { title: "میلگرد آجدار Aj340", slug: "rebar-aj340", specification: "AJ340 · Ø16" };

test("happy path: assembles a complete PublicPriceStripItem from a fresh candidate + resolved anchor", () => {
  const item = buildPriceStripItem(display, [freshCandidate()], ["odoo"], policies("odoo"), anchor, NOW);
  assert.ok(item);
  assert.equal(item.displayPriceId, "dp-1");
  assert.equal(item.templateXid, "template-1");
  assert.equal(item.variantXid, "variant-1");
  assert.equal(item.title, "میلگرد آجدار Aj340");
  assert.equal(item.specification, "AJ340 · Ø16");
  assert.equal(item.priceToman, 50_000);
  assert.equal(item.unit, "kg");
  assert.equal(item.freshnessState, "fresh");
  assert.equal(item.href, "/products/rebar-aj340?variant=variant-1");
});

test("catalog resolution failure (null anchor) fails this item closed — returns null, does not throw", () => {
  const item = buildPriceStripItem(display, [freshCandidate()], ["odoo"], policies("odoo"), null, NOW);
  assert.equal(item, null);
});

test("no eligible (fresh/aging) quote -> null, even with a valid anchor", () => {
  const staleCandidate = freshCandidate({ sourceTimestamp: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), syncedAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() });
  const item = buildPriceStripItem(display, [staleCandidate], ["odoo"], policies("odoo"), anchor, NOW);
  assert.equal(item, null);
});

test("malformed row: a non-positive price_amount_irr candidate is excluded rather than crashing or being displayed", () => {
  const malformed = freshCandidate({ priceAmountIrr: 0 });
  const item = buildPriceStripItem(display, [malformed], ["odoo"], policies("odoo"), anchor, NOW);
  assert.equal(item, null);
});

test("malformed row: a non-safe-integer price_amount_irr candidate is excluded", () => {
  const malformed = freshCandidate({ priceAmountIrr: Number.NaN });
  const item = buildPriceStripItem(display, [malformed], ["odoo"], policies("odoo"), anchor, NOW);
  assert.equal(item, null);
});

test("a malformed candidate does not suppress a separate valid candidate for the same display row", () => {
  const malformed = freshCandidate({ providerId: "bad-provider", priceAmountIrr: -1 });
  const valid = freshCandidate({ providerId: "odoo" });
  const item = buildPriceStripItem(display, [malformed, valid], ["odoo", "bad-provider"], policies("odoo", "bad-provider"), anchor, NOW);
  assert.ok(item);
  assert.equal(item.priceToman, 50_000);
});

test("marketOrLocation and deliveryBasis are carried through when materially configured, never silently dropped", () => {
  const targetWithBasis: PriceStripDisplayInput = { ...display, target: { ...display.target, marketOrLocation: "Tehran", deliveryBasis: "ex-warehouse" } };
  const candidate = freshCandidate({ marketOrLocation: "Tehran", deliveryBasis: "ex-warehouse" });
  const item = buildPriceStripItem(targetWithBasis, [candidate], ["odoo"], policies("odoo"), anchor, NOW);
  assert.ok(item);
  assert.equal(item.marketOrLocation, "Tehran");
  assert.equal(item.deliveryBasis, "ex-warehouse");
});

test("marketOrLocation/deliveryBasis are undefined (not null) when not configured", () => {
  const item = buildPriceStripItem(display, [freshCandidate()], ["odoo"], policies("odoo"), anchor, NOW);
  assert.ok(item);
  assert.equal(item.marketOrLocation, undefined);
  assert.equal(item.deliveryBasis, undefined);
});

test("href uses the SAME template slug with a DIFFERENT ?variant= for two sibling variants under one template", () => {
  const displayA: PriceStripDisplayInput = { ...display, displayPriceId: "dp-a", variantXid: "variant-d10", target: { ...display.target, variantKey: "variant-d10" } };
  const displayB: PriceStripDisplayInput = { ...display, displayPriceId: "dp-b", variantXid: "variant-d16", target: { ...display.target, variantKey: "variant-d16" } };
  const anchorSameTemplate: PriceStripVariantAnchor = { title: "میلگرد آجدار Aj340", slug: "rebar-aj340", specification: "AJ340 · Ø10" };

  const itemA = buildPriceStripItem(displayA, [freshCandidate({ variantKey: "variant-d10" })], ["odoo"], policies("odoo"), anchorSameTemplate, NOW);
  const itemB = buildPriceStripItem(displayB, [freshCandidate({ variantKey: "variant-d16" })], ["odoo"], policies("odoo"), { ...anchorSameTemplate, specification: "AJ340 · Ø16" }, NOW);

  assert.ok(itemA && itemB);
  assert.equal(itemA.href, "/products/rebar-aj340?variant=variant-d10");
  assert.equal(itemB.href, "/products/rebar-aj340?variant=variant-d16");
  assert.notEqual(itemA.specification, itemB.specification);
});

test("price integer conversion is exact — no floating point (500_000_000 IRR -> 50_000_000 Toman)", () => {
  const item = buildPriceStripItem(display, [freshCandidate({ priceAmountIrr: 500_000_000 })], ["odoo"], policies("odoo"), anchor, NOW);
  assert.ok(item);
  assert.equal(item.priceToman, 50_000_000);
  assert.ok(Number.isInteger(item.priceToman));
});

// --- Public read-model type contract (task §25) ---

test("output contains ONLY the allowed public fields — never providerTitle/providerId/quoteKey/sourceUrl or any other internal field", () => {
  const item = buildPriceStripItem(display, [freshCandidate()], ["odoo"], policies("odoo"), anchor, NOW);
  assert.ok(item);
  const allowedKeys = new Set(["displayPriceId", "templateXid", "variantXid", "title", "specification", "priceToman", "unit", "marketOrLocation", "deliveryBasis", "freshnessState", "effectiveTimestamp", "href"]);
  for (const key of Object.keys(item)) {
    assert.ok(allowedKeys.has(key), `unexpected public field leaked into PublicPriceStripItem: "${key}"`);
  }
});

test("QuoteCandidate itself carries no providerTitle/quoteKey/sourceUrl field — provenance data cannot leak because the type it flows through structurally excludes it", () => {
  const candidate = freshCandidate();
  assert.ok(!("providerTitle" in candidate));
  assert.ok(!("quoteKey" in candidate));
  assert.ok(!("sourceUrl" in candidate));
});
