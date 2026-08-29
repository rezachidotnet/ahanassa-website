import { test } from "node:test";
import assert from "node:assert/strict";
import { planCategorySync, planProductSync, planUnitSync, planVariantSync } from "./sync.ts";
import type { CatalogCategory, CatalogProduct, ProductVariant, Unit } from "./types.ts";
import type { OdooCatalogCategoryRow, OdooCatalogProductRow, OdooProductVariantRow, OdooUomRow } from "../odoo/types.ts";

/**
 * Fixtures based on the verified shapes discovered live against `ahanassa`
 * (DOCUMENT_AUDIT_REPORT.md DAR-033) — never real production data (the
 * live database has zero rows in every one of these models today), and
 * never calls Odoo or D1.
 */

const now = "2026-08-29T00:00:00.000Z";

function baseCategory(overrides: Partial<CatalogCategory> = {}): CatalogCategory {
  return {
    id: "cat_local_1",
    odooId: 42,
    externalId: null,
    parentId: null,
    stableKey: "rebar",
    nameFa: "میلگرد",
    slugFa: "rebar",
    sortOrder: 0,
    isActive: true,
    isPublic: false,
    syncStatus: "synced",
    sourceUpdatedAt: null,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function baseProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "prod_local_1",
    categoryId: "cat_local_1",
    odooId: 100,
    externalId: null,
    odooWriteDate: "2026-08-01T00:00:00Z",
    internalCode: "REBAR-16",
    sku: null,
    nameFa: "میلگرد آجدار 16",
    shortNameFa: null,
    slugFa: "rebar-16",
    productType: null,
    defaultUnitId: null,
    isActive: true,
    isPublic: false,
    isPricePublic: false,
    syncStatus: "synced",
    syncVersion: 1,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function baseVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "var_local_1",
    productId: "prod_local_1",
    odooId: 500,
    externalId: null,
    odooWriteDate: "2026-08-01T00:00:00Z",
    variantCode: "REBAR-16-A3",
    sku: null,
    nameFa: "میلگرد آجدار 16 A3",
    slugFa: null,
    defaultUnitId: null,
    isActive: true,
    isPublic: false,
    isPricePublic: false,
    syncStatus: "synced",
    syncVersion: 1,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function baseUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit_local_1",
    odooId: 16,
    externalId: null,
    code: "kg",
    nameFa: "کیلوگرم",
    symbolFa: null,
    unitGroup: null,
    precisionDigits: null,
    isActive: true,
    isPublic: false,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// --- planCategorySync ---------------------------------------------------

test("planCategorySync surfaces a brand-new Odoo category as needsEditorialSetup, not an auto-created row", () => {
  const odooRows: OdooCatalogCategoryRow[] = [{ id: 99, name: "Rebar", parent_id: false, complete_name: "Rebar", active: true }];
  const plan = planCategorySync(odooRows, []);
  assert.equal(plan.needsEditorialSetup.length, 1);
  assert.deepEqual(plan.needsEditorialSetup[0], { odooId: 99, name: "Rebar", parentOdooId: null });
  assert.equal(plan.toUpdate.length, 0);
  assert.equal(plan.toDeactivate.length, 0);
});

test("planCategorySync marks an existing mapped, unchanged category as unchanged", () => {
  const odooRows: OdooCatalogCategoryRow[] = [{ id: 42, name: "Rebar", parent_id: false, complete_name: "Rebar", active: true }];
  const plan = planCategorySync(odooRows, [baseCategory()]);
  assert.deepEqual(plan.unchanged, ["cat_local_1"]);
  assert.equal(plan.toUpdate.length, 0);
  assert.equal(plan.needsEditorialSetup.length, 0);
});

test("planCategorySync reactivates a previously-deactivated category that is active again in Odoo", () => {
  const odooRows: OdooCatalogCategoryRow[] = [{ id: 42, name: "Rebar", parent_id: false, complete_name: "Rebar", active: true }];
  const plan = planCategorySync(odooRows, [baseCategory({ isActive: false })]);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].id, "cat_local_1");
  assert.equal(plan.toUpdate[0].patch.isActive, true);
});

test("planCategorySync deactivates a mapped category no longer returned by Odoo (deleted/archived)", () => {
  const plan = planCategorySync([], [baseCategory()]);
  assert.deepEqual(plan.toDeactivate, ["cat_local_1"]);
});

test("planCategorySync deactivates a mapped category Odoo now reports as active: false", () => {
  const odooRows: OdooCatalogCategoryRow[] = [{ id: 42, name: "Rebar", parent_id: false, complete_name: "Rebar", active: false }];
  const plan = planCategorySync(odooRows, [baseCategory()]);
  assert.deepEqual(plan.toDeactivate, ["cat_local_1"]);
});

test("planCategorySync never touches name_fa/slug_fa on an update (website-owned fields)", () => {
  const odooRows: OdooCatalogCategoryRow[] = [{ id: 42, name: "Renamed In Odoo", parent_id: false, complete_name: "Renamed In Odoo", active: true }];
  const plan = planCategorySync(odooRows, [baseCategory({ isActive: false })]);
  const patchKeys = Object.keys(plan.toUpdate[0].patch);
  assert.equal(patchKeys.includes("nameFa" as never), false);
  assert.equal(patchKeys.includes("slugFa" as never), false);
});

// --- planProductSync ------------------------------------------------------

test("planProductSync surfaces a brand-new Odoo product as needsEditorialSetup", () => {
  const odooRows: OdooCatalogProductRow[] = [
    { id: 200, name: "Rebar 20mm", default_code: "REBAR-20", categ_id: [42, "Rebar"], sale_ok: true, active: true, uom_id: false, write_date: now },
  ];
  const plan = planProductSync(odooRows, []);
  assert.equal(plan.needsEditorialSetup.length, 1);
  assert.deepEqual(plan.needsEditorialSetup[0], { odooId: 200, name: "Rebar 20mm", internalCode: "REBAR-20", categoryOdooId: 42, saleOk: true });
});

test("planProductSync is a no-op when write_date is unchanged", () => {
  const odooRows: OdooCatalogProductRow[] = [
    { id: 100, name: "Rebar 16", default_code: "REBAR-16", categ_id: [42, "Rebar"], sale_ok: true, active: true, uom_id: false, write_date: "2026-08-01T00:00:00Z" },
  ];
  const plan = planProductSync(odooRows, [baseProduct()]);
  assert.deepEqual(plan.unchanged, ["prod_local_1"]);
  assert.equal(plan.toUpdate.length, 0);
});

test("planProductSync updates only commercial fields when write_date advances", () => {
  const odooRows: OdooCatalogProductRow[] = [
    { id: 100, name: "Rebar 16 (renamed)", default_code: "REBAR-16-NEW", categ_id: [43, "Long products"], sale_ok: true, active: true, uom_id: false, write_date: "2026-08-15T00:00:00Z" },
  ];
  const plan = planProductSync(odooRows, [baseProduct()]);
  assert.equal(plan.toUpdate.length, 1);
  assert.deepEqual(plan.toUpdate[0].patch, { odooWriteDate: "2026-08-15T00:00:00Z", internalCode: "REBAR-16-NEW", categoryOdooId: 43, isActive: true });
});

test("planProductSync never includes nameFa/slugFa in an update patch", () => {
  const odooRows: OdooCatalogProductRow[] = [
    { id: 100, name: "Renamed", default_code: "REBAR-16", categ_id: [42, "Rebar"], sale_ok: true, active: true, uom_id: false, write_date: "2026-09-01T00:00:00Z" },
  ];
  const plan = planProductSync(odooRows, [baseProduct()]);
  const patchKeys = Object.keys(plan.toUpdate[0].patch);
  assert.equal(patchKeys.includes("nameFa" as never), false);
  assert.equal(patchKeys.includes("slugFa" as never), false);
});

test("planProductSync deactivates a mapped product no longer returned by Odoo", () => {
  const plan = planProductSync([], [baseProduct()]);
  assert.deepEqual(plan.toDeactivate, ["prod_local_1"]);
});

test("planProductSync duplicate prevention: the same odoo_id is never proposed as both a create and an update", () => {
  const odooRows: OdooCatalogProductRow[] = [
    { id: 100, name: "Rebar 16", default_code: "REBAR-16", categ_id: [42, "Rebar"], sale_ok: true, active: true, uom_id: false, write_date: "2026-09-01T00:00:00Z" },
  ];
  const plan = planProductSync(odooRows, [baseProduct()]);
  assert.equal(plan.needsEditorialSetup.length, 0);
  assert.equal(plan.toUpdate.length, 1);
});

// --- planVariantSync -------------------------------------------------------

test("planVariantSync surfaces a brand-new Odoo variant as needsEditorialSetup", () => {
  const odooRows: OdooProductVariantRow[] = [{ id: 600, product_tmpl_id: [100, "Rebar 16"], default_code: "REBAR-16-A3", active: true, write_date: now }];
  const plan = planVariantSync(odooRows, []);
  assert.deepEqual(plan.needsEditorialSetup, [{ odooId: 600, productTemplateOdooId: 100, internalCode: "REBAR-16-A3" }]);
});

test("planVariantSync updates commercial fields on write_date change, deactivates when archived", () => {
  const changed: OdooProductVariantRow[] = [{ id: 500, product_tmpl_id: [100, "Rebar 16"], default_code: "REBAR-16-A3-V2", active: true, write_date: "2026-09-01T00:00:00Z" }];
  const updatePlan = planVariantSync(changed, [baseVariant()]);
  assert.equal(updatePlan.toUpdate.length, 1);
  assert.equal(updatePlan.toUpdate[0].patch.variantCode, "REBAR-16-A3-V2");

  const deactivatePlan = planVariantSync([], [baseVariant()]);
  assert.deepEqual(deactivatePlan.toDeactivate, ["var_local_1"]);
});

// --- planUnitSync ------------------------------------------------------------

test("planUnitSync prefers the Persian translation for nameFa", () => {
  const odooRows: OdooUomRow[] = [{ id: 999, name: { en_US: "Kilogram", fa_IR: "کیلوگرم", ar_001: "كجم" }, active: true, relative_uom_id: false }];
  const plan = planUnitSync(odooRows, []);
  assert.equal(plan.toUpsert.length, 1);
  assert.equal(plan.toUpsert[0].nameFa, "کیلوگرم");
});

test("planUnitSync falls back to English when Persian is absent, and never fabricates a translation", () => {
  const odooRows: OdooUomRow[] = [{ id: 998, name: { en_US: "KWH" }, active: true, relative_uom_id: false }];
  const plan = planUnitSync(odooRows, []);
  assert.equal(plan.toUpsert[0].nameFa, "KWH");
});

test("planUnitSync derives a stable ASCII code from the English label", () => {
  const odooRows: OdooUomRow[] = [{ id: 997, name: { en_US: "Pack of 6", ar_001: "..." }, active: true, relative_uom_id: false }];
  const plan = planUnitSync(odooRows, []);
  assert.equal(plan.toUpsert[0].code, "pack-of-6");
});

test("planUnitSync is a no-op when the unit is already mapped and unchanged", () => {
  const odooRows: OdooUomRow[] = [{ id: 16, name: { en_US: "kg", fa_IR: "کیلوگرم" }, active: true, relative_uom_id: false }];
  const plan = planUnitSync(odooRows, [baseUnit()]);
  assert.equal(plan.toUpsert.length, 0);
  assert.equal(plan.toDeactivate.length, 0);
});

test("planUnitSync deactivates a unit no longer returned by Odoo", () => {
  const plan = planUnitSync([], [baseUnit()]);
  assert.deepEqual(plan.toDeactivate, ["unit_local_1"]);
});
