import { test } from "node:test";
import assert from "node:assert/strict";
import { findCatalogItemByXid, groupCatalogItemsForSelector, type RfqSelectableCatalogItem } from "./catalog-selector.ts";

function item(overrides: Partial<RfqSelectableCatalogItem> = {}): RfqSelectableCatalogItem {
  return {
    variantXid: "ahanassa_marketplace.product_rb_aj340_d16_l12",
    templateXid: "ahanassa_marketplace.product_tmpl_rb_aj340",
    sku: "AA-RB-AJ340-D16-L12",
    variantSpecLabel: "Ø16",
    productLabel: "میلگرد آجدار Aj340",
    templateSlug: "rebar-aj340",
    categoryCode: "LONG_PRODUCTS",
    categoryLabel: "مقاطع طولی",
    ...overrides,
  };
}

test("groupCatalogItemsForSelector groups variants under their template under their category", () => {
  const groups = groupCatalogItemsForSelector([item()]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].categoryCode, "LONG_PRODUCTS");
  assert.equal(groups[0].templates.length, 1);
  assert.equal(groups[0].templates[0].templateXid, "ahanassa_marketplace.product_tmpl_rb_aj340");
  assert.equal(groups[0].templates[0].variants.length, 1);
});

test("groupCatalogItemsForSelector groups two variants of the same template under one template entry", () => {
  const groups = groupCatalogItemsForSelector([
    item({ variantXid: "v1" }),
    item({ variantXid: "v2", variantSpecLabel: "Ø20" }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].templates.length, 1);
  assert.equal(groups[0].templates[0].variants.length, 2);
});

test("groupCatalogItemsForSelector separates two different templates under the same category", () => {
  const groups = groupCatalogItemsForSelector([
    item({ variantXid: "v1", templateXid: "tmpl-a" }),
    item({ variantXid: "v2", templateXid: "tmpl-b", productLabel: "Other product" }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].templates.length, 2);
});

test("groupCatalogItemsForSelector separates two different categories", () => {
  const groups = groupCatalogItemsForSelector([
    item({ variantXid: "v1", categoryCode: "LONG_PRODUCTS", categoryLabel: "Long" }),
    item({ variantXid: "v2", categoryCode: "FLAT_PRODUCTS", categoryLabel: "Flat", templateXid: "tmpl-b" }),
  ]);
  assert.equal(groups.length, 2);
});

test("groupCatalogItemsForSelector groups a null-category variant under a labeled fallback bucket, never drops it", () => {
  const groups = groupCatalogItemsForSelector([item({ categoryCode: null, categoryLabel: null })], "en");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].categoryCode, null);
  assert.equal(groups[0].categoryLabel, "Other categories");
  assert.equal(groups[0].templates[0].variants.length, 1);
});

test("groupCatalogItemsForSelector returns an empty array for an empty input, never throws", () => {
  assert.deepEqual(groupCatalogItemsForSelector([]), []);
});

// --- findCatalogItemByXid ---

test("findCatalogItemByXid finds an existing item", () => {
  const items = [item({ variantXid: "v1" }), item({ variantXid: "v2" })];
  const found = findCatalogItemByXid(items, "v2");
  assert.equal(found?.variantXid, "v2");
});

test("findCatalogItemByXid returns null for an unknown xid, never fabricates a match", () => {
  const items = [item({ variantXid: "v1" })];
  assert.equal(findCatalogItemByXid(items, "unknown-xid"), null);
});
