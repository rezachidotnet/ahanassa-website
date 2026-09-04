import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_HOMEPAGE_PRICE_STRIP_ITEMS } from "./price-strip-config.ts";

test("MAX_HOMEPAGE_PRICE_STRIP_ITEMS is 6 (PRICE-P3 §17)", () => {
  assert.equal(MAX_HOMEPAGE_PRICE_STRIP_ITEMS, 6);
});

test("applying the cap via .slice(0, MAX) never returns more than the configured maximum, and preserves the existing (sort_order-derived) order of the eligible set", () => {
  const eligibleInOrder = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const capped = eligibleInOrder.slice(0, MAX_HOMEPAGE_PRICE_STRIP_ITEMS);
  assert.equal(capped.length, 6);
  assert.deepEqual(capped, ["a", "b", "c", "d", "e", "f"]);
});

test("a smaller-than-cap eligible set is returned unchanged (0/1/2+ rendering decisions belong to the component, not this cap)", () => {
  const eligible = ["a", "b"];
  assert.deepEqual(eligible.slice(0, MAX_HOMEPAGE_PRICE_STRIP_ITEMS), ["a", "b"]);
});
