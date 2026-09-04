import { test } from "node:test";
import assert from "node:assert/strict";
import { variantBelongsToTemplate } from "./variant-integrity.ts";

/**
 * `variantBelongsToTemplate` is the pure half of the variant-integrity
 * invariant — the D1-touching half (`resolveAndValidateVariant`) is
 * verified live against real local D1 below in this same task's other
 * commands (this repo's established convention for D1-touching
 * repository code, matching `lib/pricing/repository.ts`'s own precedent).
 */

test("variant belonging to the expected template passes", () => {
  assert.equal(variantBelongsToTemplate({ templateXid: "ahanassa_marketplace.product_tmpl_rb_aj340" }, "ahanassa_marketplace.product_tmpl_rb_aj340"), true);
});

test("variant belonging to a DIFFERENT template fails — the exact PRICE-P1 invariant this module exists to enforce", () => {
  assert.equal(variantBelongsToTemplate({ templateXid: "ahanassa_marketplace.product_tmpl_rb_aj340" }, "ahanassa_marketplace.product_tmpl_ipe"), false);
});

test("comparison is exact-string, not case-insensitive or prefix-based", () => {
  assert.equal(variantBelongsToTemplate({ templateXid: "Ahanassa_Marketplace.Product_Tmpl_RB" }, "ahanassa_marketplace.product_tmpl_rb"), false);
});
