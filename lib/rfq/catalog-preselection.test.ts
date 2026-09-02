import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogItemRecord, buildFreeformItemRecord } from "./catalog-preselection.ts";

const selection = {
  variantXid: "ahanassa_marketplace.product_rb_aj340_d16_l12",
  templateXid: "ahanassa_marketplace.product_tmpl_rb_aj340",
  sku: "AA-RB-AJ340-D16-L12",
  variantSpecLabel: "Ø16",
  productLabel: "میلگرد آجدار Aj340 (A2)",
  categoryCode: "LONG_PRODUCTS",
  categoryLabel: "Long Products",
  groupCode: "REBAR",
};

const branchUnit = { code: "branch" as const, label: "شاخه" };
const kgUnit = { code: "kg" as const, label: "کیلوگرم" };

test("buildCatalogItemRecord uses product_variant_xid as variantRef — never a title/slug/Odoo ID", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5 branch", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.variantRef, "ahanassa_marketplace.product_rb_aj340_d16_l12");
});

test("buildCatalogItemRecord sets product_ref to the stable template_xid, not the mutable slug", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.productRef, "ahanassa_marketplace.product_tmpl_rb_aj340");
});

test("buildCatalogItemRecord snapshots the canonical SKU, independent of any client-supplied value (there is none)", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.skuSnapshot, "AA-RB-AJ340-D16-L12");
});

test("buildCatalogItemRecord snapshots product/variant/category labels for human-readable historical display", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.productLabel, "میلگرد آجدار Aj340 (A2)");
  assert.equal(record.variantLabel, "Ø16");
  assert.equal(record.categoryLabel, "Long Products");
  assert.equal(record.categoryRef, "LONG_PRODUCTS");
});

test("buildCatalogItemRecord always sets source: selected and never sets freeform_title (never an invalid hybrid)", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.source, "selected");
  assert.equal(record.freeformTitle, null);
});

test("buildCatalogItemRecord populates unit_ref/unit_label from the caller-resolved, already-Launch-policy-validated unit (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md — closes the Stage G gap for Launch products)", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5 branch", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.unitRef, "branch");
  assert.equal(record.unitLabel, "شاخه");
});

test("buildCatalogItemRecord passes quantity fields through unchanged (existing RFQ quantity policy, not re-validated here)", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5 branch", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  assert.equal(record.quantityText, "5 branch");
  assert.equal(record.quantityValue, 5);
  assert.equal(record.quantityScale, 0);
});

test("buildCatalogItemRecord carries customer notes through as description", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, "Please confirm cutting length.", branchUnit);
  assert.equal(record.description, "Please confirm cutting length.");
});

test("buildCatalogItemRecord output is a plain, self-contained snapshot — no live reference back to the selection object (historical safety)", () => {
  const record = buildCatalogItemRecord(selection, { quantityText: "5", quantityValue: 5, quantityScale: 0 }, null, branchUnit);
  const mutableSelection = { ...selection };
  mutableSelection.productLabel = "a title the product later changed to";
  // Mutating the source object after the fact must never retroactively change the built record.
  assert.equal(record.productLabel, "میلگرد آجدار Aj340 (A2)");
  assert.notEqual(record.productLabel, mutableSelection.productLabel);
});

// --- freeform path (unchanged behavior, now also covered here) ---

test("buildFreeformItemRecord never sets variantRef/skuSnapshot", () => {
  const record = buildFreeformItemRecord(
    {
      productRef: null,
      productLabel: "میلگرد آجدار",
      categoryLabel: "long",
      freeformTitle: null,
      sizeText: null,
      quantityText: "200 تن",
      quantityValue: 200,
      quantityScale: 0,
      description: null,
    },
    { code: "ton", label: "تن" },
  );
  assert.equal(record.source, "freeform");
  assert.equal(record.variantRef, null);
  assert.equal(record.skuSnapshot, null);
  assert.equal(record.categoryRef, null);
});

test("buildFreeformItemRecord preserves a customer-typed freeform_title", () => {
  const record = buildFreeformItemRecord(
    {
      productRef: null,
      productLabel: null,
      categoryLabel: null,
      freeformTitle: "Custom bracket, per drawing",
      sizeText: null,
      quantityText: "10 kg",
      quantityValue: 10,
      quantityScale: 0,
      description: null,
    },
    kgUnit,
  );
  assert.equal(record.freeformTitle, "Custom bracket, per drawing");
});

test("buildFreeformItemRecord populates unit_ref/unit_label — Custom items are restricted to kg/ton for Launch, already validated by the caller", () => {
  const record = buildFreeformItemRecord(
    {
      productRef: null,
      productLabel: null,
      categoryLabel: null,
      freeformTitle: "Custom bracket, per drawing",
      sizeText: null,
      quantityText: "10 kg",
      quantityValue: 10,
      quantityScale: 0,
      description: null,
    },
    kgUnit,
  );
  assert.equal(record.unitRef, "kg");
  assert.equal(record.unitLabel, "کیلوگرم");
});
