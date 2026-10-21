import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeRfqCatalog, encodeRfqCatalog, RFQ_CATALOG_WIRE_SCHEMA } from "./catalog-wire.ts";
import { rfqCatalogSource, RFQ_CATALOG_ASSETS_ENV, SNAPSHOT_VERSION_ENV } from "./catalog-source.ts";
import { resolveRowsAgainstCatalog, restoreRfqBasketRows } from "./rfq-basket.ts";
import { createEmptyCatalogRow, type RfqRow } from "./item-row-validation.ts";
import { publicRfqCatalogV2 } from "../contracts/artifact-v1.ts";
import type { PublicRfqCatalogItem } from "./catalog-selector.ts";

/**
 * W25 — the compact rfq-catalog.v2 the static /contact form loads, the page's choice of file, and the
 * catalog's late arrival on rows that already exist.
 */
const item = (variantXid: string, templateXid: string, over: Partial<PublicRfqCatalogItem> = {}): PublicRfqCatalogItem => ({
  variantXid,
  templateXid,
  sku: `AA-${variantXid}`,
  variantSpecLabel: `Ø${variantXid.slice(-2)}`,
  productLabel: `Product ${templateXid}`,
  templateSlug: templateXid.toLowerCase(),
  categoryCode: "LONG_PRODUCTS",
  groupCode: "REBAR",
  publicCategoryCode: "REBAR",
  publicCategoryLabel: "میلگرد",
  ...over,
});
// Interleaved templates, one template under two public categories (W9.8 form-level categories), nulls.
const ITEMS: PublicRfqCatalogItem[] = [
  item("CVAR-10", "CTMPL-1"),
  item("CVAR-20", "CTMPL-2", { groupCode: "SHEET", publicCategoryCode: "SHEET_PLATE", publicCategoryLabel: "ورق" }),
  item("CVAR-11", "CTMPL-1"),
  item("CVAR-21", "CTMPL-2", { groupCode: "SHEET", publicCategoryCode: "GALVANIZED_SHEET", publicCategoryLabel: "ورق گالوانیزه" }),
  item("CVAR-30", "CTMPL-3", { categoryCode: null, groupCode: null, publicCategoryCode: null, publicCategoryLabel: null }),
];

test("v2 round-trips the v1 items exactly — same values, same order — and is valid against the strict contract", () => {
  const wire = encodeRfqCatalog("fa", ITEMS);
  assert.equal(wire.schema_version, RFQ_CATALOG_WIRE_SCHEMA);
  assert.equal(publicRfqCatalogV2.safeParse(JSON.parse(JSON.stringify(wire))).success, true);
  assert.deepEqual(decodeRfqCatalog(JSON.parse(JSON.stringify(wire))), { items: ITEMS, snapshotVersion: null });
  // Each product and category once.
  assert.equal(wire.templates.length, 3);
  assert.equal(wire.categories.length, 4);
  assert.deepEqual(encodeRfqCatalog("en", []), { schema_version: "rfq-catalog.v2", locale: "en", categories: [], templates: [], variants: [] });
});

test("v2 is much smaller than v1 for a realistic list (no per-variant repetition)", () => {
  const many = Array.from({ length: 256 }, (_, i) => item(`CVAR-${String(i).padStart(6, "0")}`, `CTMPL-${String(i % 16).padStart(6, "0")}`, { productLabel: "میلگرد آجدار A3 (Aj400)", templateSlug: "rebar-aj400" }));
  const v1 = JSON.stringify({ schema_version: "rfq-catalog.v1", snapshot_version: "snap-2026102015493600", locale: "fa", items: many });
  const v2 = JSON.stringify(encodeRfqCatalog("fa", many));
  assert.ok(v2.length < v1.length / 3, `${v2.length} vs ${v1.length}`);
});

test("decode reads the legacy v1 document (with its snapshot_version) and refuses anything malformed", () => {
  assert.deepEqual(decodeRfqCatalog({ schema_version: "rfq-catalog.v1", snapshot_version: "snap-e55d81c754270c1f", locale: "fa", items: ITEMS }), { items: ITEMS, snapshotVersion: "snap-e55d81c754270c1f" });
  assert.deepEqual(decodeRfqCatalog({ schema_version: "rfq-catalog.v1", snapshot_version: null, locale: "fa", items: [] }), { items: [], snapshotVersion: null });
  const wire = encodeRfqCatalog("fa", ITEMS);
  for (const bad of [null, "x", {}, { ...wire, schema_version: "rfq-catalog.v3" }, { ...wire, variants: [["CVAR-1", "AA", "Ø", 9, 0]] }, { ...wire, variants: [["CVAR-1", "AA", "Ø", 0, -1]] }, { ...wire, variants: [[1, "AA", "Ø", 0, 0]] }, { ...wire, templates: "x" }]) {
    assert.equal(decodeRfqCatalog(bad), null, JSON.stringify(bad));
  }
});

test("the page loads the build's hashed file for its own locale, with the build's snapshot; otherwise the v1 file", () => {
  const env = { [RFQ_CATALOG_ASSETS_ENV]: JSON.stringify({ fa: "/data/rfq-catalog.fa.0123456789abcdef.json", en: "/data/rfq-catalog.en.fedcba9876543210.json", ar: "/data/rfq-catalog.fa.0123456789abcdef.json" }), [SNAPSHOT_VERSION_ENV]: "snap-e55d81c754270c1f" };
  assert.deepEqual(rfqCatalogSource("fa", env), { path: "/data/rfq-catalog.fa.0123456789abcdef.json", snapshotVersion: "snap-e55d81c754270c1f" });
  assert.deepEqual(rfqCatalogSource("en", env), { path: "/data/rfq-catalog.en.fedcba9876543210.json", snapshotVersion: "snap-e55d81c754270c1f" });
  assert.deepEqual(rfqCatalogSource("ar", env), { path: "/data/rfq-catalog.ar.json", snapshotVersion: null }, "another locale's file is never used");
  assert.deepEqual(rfqCatalogSource("fa", {}), { path: "/data/rfq-catalog.fa.json", snapshotVersion: null });
  assert.deepEqual(rfqCatalogSource("fa", { [RFQ_CATALOG_ASSETS_ENV]: "not json" }), { path: "/data/rfq-catalog.fa.json", snapshotVersion: null });
  assert.deepEqual(rfqCatalogSource("fa", { [RFQ_CATALOG_ASSETS_ENV]: JSON.stringify({ fa: "https://evil.example/x.json" }) }), { path: "/data/rfq-catalog.fa.json", snapshotVersion: null });
});

test("late catalog: rows typed before it arrived are kept (same ids, same objects); stored catalog rows are re-resolved", () => {
  const custom: RfqRow = { id: "r1", fields: { mode: "custom", productTitle: "تیرآهن ۱۴", sizeSpec: "", quantityValue: "5", unit: "ton", notes: "" } };
  const blank = createEmptyCatalogRow();
  const stored: RfqRow = { id: "r2", fields: { mode: "catalog", categoryCode: "OLD", templateXid: "CTMPL-9", variantXid: "CVAR-21", quantityValue: "3", unit: "kg", notes: "", lengthMm: "" } };
  const gone: RfqRow = { id: "r3", fields: { mode: "catalog", categoryCode: "REBAR", templateXid: "CTMPL-1", variantXid: "CVAR-99", quantityValue: "7", unit: "kg", notes: "x", lengthMm: "" } };
  const rows = [custom, blank, stored, gone];
  const next = resolveRowsAgainstCatalog(rows, ITEMS);
  assert.deepEqual(next.map((r) => r.id), ["r1", blank.id, "r2", "r3"]);
  assert.equal(next[0], custom);
  assert.equal(next[1], blank);
  assert.deepEqual(next[2].fields, { ...stored.fields, categoryCode: "GALVANIZED_SHEET", templateXid: "CTMPL-2" });
  assert.deepEqual(next[3].fields, { ...gone.fields, variantXid: null, templateXid: "CTMPL-1", categoryCode: "REBAR" }, "a variant no longer listed is cleared; quantity and notes stay");
  assert.equal(resolveRowsAgainstCatalog(rows, []), rows, "no catalog (failed): rows kept as they are");
  assert.equal(resolveRowsAgainstCatalog([custom, blank], ITEMS).length, 2);
  const unchanged = [custom, blank];
  assert.equal(resolveRowsAgainstCatalog(unchanged, ITEMS), unchanged, "nothing to change: the same array");
  // restoreRfqBasketRows keeps its old behaviour on top of it.
  assert.deepEqual(restoreRfqBasketRows([stored.fields], ITEMS).map((r) => r.fields), [{ ...stored.fields, categoryCode: "GALVANIZED_SHEET", templateXid: "CTMPL-2" }]);
  assert.deepEqual(restoreRfqBasketRows([stored.fields], []).map((r) => r.fields), [stored.fields]);
});
