import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalogTimestamp, planCatalogV1Sync, slugifyFromSku } from "./sync.ts";
import type { CatalogApiProduct } from "./odoo-api-client.ts";
import type { ProductVariant } from "./types.ts";

/**
 * Fixtures mirror shapes verified live 2026-08-30 against the real Odoo
 * Public Catalog API (DOCUMENT_AUDIT_REPORT.md DAR-034) — never calls the
 * API or D1.
 */

const now = "2026-08-30T00:00:00.000Z";

function apiProduct(overrides: Partial<CatalogApiProduct> = {}): CatalogApiProduct {
  return {
    id: "ahanassa_marketplace.product_rb_aj340_d10_l12",
    template_id: "ahanassa_marketplace.product_tmpl_rb_aj340",
    sku: "AA-RB-AJ340-D10-L12",
    name: "[AA-RB-AJ340-D10-L12] Ribbed Rebar Aj340 (A2) (Ø10)",
    template_name: "Ribbed Rebar Aj340 (A2)",
    commercial_size: "Ø10",
    section_size: null,
    schedule: "",
    classification: {
      family: { code: "LONG_PRODUCTS", name: "Long Products" },
      group: { code: "REBAR", name: "Rebar" },
      form: { code: "RIBBED_REBAR", name: "Ribbed Rebar" },
    },
    grade: { code: "AJ340", name: "Aj340 (market A2)" },
    standard: { code: "INSO3132", name: "INSO 3132" },
    updated_at: "2026-08-30 10:09:11",
    dimensions: { diameter_mm: 10, length_mm: 12000 },
    nominal_weight: { kg_m: 0.61654, per_branch: 7.39845 },
    allowed_commercial_units: "kg, ton, branch, bundle",
    inventory_uom: "kg",
    active: true,
    ...overrides,
  };
}

function existingVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "var_local_1",
    productId: "prod_local_1",
    xid: "ahanassa_marketplace.product_rb_aj340_d10_l12",
    sku: "AA-RB-AJ340-D10-L12",
    commercialName: "[AA-RB-AJ340-D10-L12] Ribbed Rebar Aj340 (A2) (Ø10)",
    nameFa: "میلگرد آجدار Aj340 سایز 10 (ویرایش‌شده توسط ادیتور)",
    slugFa: "rebar-aj340-d10",
    commercialSize: "Ø10",
    sectionSize: null,
    schedule: null,
    family: { code: "LONG_PRODUCTS", name: "Long Products" },
    group: { code: "REBAR", name: "Rebar" },
    form: { code: "RIBBED_REBAR", name: "Ribbed Rebar" },
    grade: { code: "AJ340", name: "Aj340 (market A2)" },
    standard: { code: "INSO3132", name: "INSO 3132" },
    dimensions: { diameter_mm: 10, length_mm: 12000 },
    nominalWeight: { kg_m: 0.61654, per_branch: 7.39845 },
    allowedCommercialUnits: "kg, ton, branch, bundle",
    inventoryUom: "kg",
    catalogUpdatedAt: "2026-08-30T10:09:11.000Z",
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

// --- create ---

test("planCatalogV1Sync creates a brand-new variant with commercial fields bootstrapped from Odoo", () => {
  const plan = planCatalogV1Sync([apiProduct()], [], true);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].xid, "ahanassa_marketplace.product_rb_aj340_d10_l12");
  assert.equal(plan.toCreate[0].templateXid, "ahanassa_marketplace.product_tmpl_rb_aj340");
  assert.equal(plan.toCreate[0].sku, "AA-RB-AJ340-D10-L12");
  assert.equal(plan.toCreate[0].commercialName, apiProduct().name);
  assert.deepEqual(plan.toCreate[0].grade, { code: "AJ340", name: "Aj340 (market A2)" });
  assert.equal(plan.toUpdate.length, 0);
});

test("planCatalogV1Sync passes dimensions/nominal_weight through opaquely regardless of shape", () => {
  const sheet = apiProduct({
    id: "x.sheet",
    dimensions: { width_mm: 1500, thickness_mm: 10, length_mm: 6000 },
    nominal_weight: { kg_m2: 78.5, per_sheet: 706.5 },
  });
  const plan = planCatalogV1Sync([sheet], [], true);
  assert.deepEqual(plan.toCreate[0].dimensions, { width_mm: 1500, thickness_mm: 10, length_mm: 6000 });
  assert.deepEqual(plan.toCreate[0].nominalWeight, { kg_m2: 78.5, per_sheet: 706.5 });
});

test("planCatalogV1Sync stores a null grade/standard as-is (never invents a value)", () => {
  const beam = apiProduct({ grade: { code: null, name: null }, standard: { code: "EN10365", name: "EN 10365" } });
  const plan = planCatalogV1Sync([beam], [], true);
  assert.deepEqual(plan.toCreate[0].grade, { code: null, name: null });
});

// --- update ---

test("planCatalogV1Sync is a no-op when catalog_updated_at is unchanged", () => {
  const plan = planCatalogV1Sync([apiProduct()], [existingVariant()], true);
  assert.deepEqual(plan.unchanged, ["var_local_1"]);
  assert.equal(plan.toUpdate.length, 0);
});

test("planCatalogV1Sync updates commercial fields when updated_at advances, never nameFa/slugFa", () => {
  const changed = apiProduct({ commercial_size: "Ø10 (revised)", updated_at: "2026-09-01 08:00:00" });
  const plan = planCatalogV1Sync([changed], [existingVariant()], true);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].id, "var_local_1");
  assert.equal(plan.toUpdate[0].patch.commercialSize, "Ø10 (revised)");
  assert.equal(plan.toUpdate[0].patch.catalogUpdatedAt, "2026-09-01T08:00:00.000Z");
  const patchKeys = Object.keys(plan.toUpdate[0].patch);
  assert.equal(patchKeys.includes("nameFa" as never), false);
  assert.equal(patchKeys.includes("slugFa" as never), false);
});

test("planCatalogV1Sync's commercial patch never includes isPublic — a reactivated variant cannot be silently republished by sync (DAR-036 Stage K)", () => {
  const changed = apiProduct({ updated_at: "2026-09-01 08:00:00" });
  const plan = planCatalogV1Sync([changed], [existingVariant({ isActive: false })], true);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].patch.isActive, true); // commercial reactivation IS synced
  const patchKeys = Object.keys(plan.toUpdate[0].patch);
  assert.equal(patchKeys.includes("isPublic" as never), false); // website publication decision is never touched
});

test("planCatalogV1Sync reactivates a previously-deactivated variant that reappears", () => {
  const plan = planCatalogV1Sync([apiProduct()], [existingVariant({ isActive: false })], true);
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].patch.isActive, true);
});

// --- deactivate ---

test("planCatalogV1Sync deactivates a mapped variant missing from a full pull", () => {
  const plan = planCatalogV1Sync([], [existingVariant()], true);
  assert.deepEqual(plan.toDeactivate, ["var_local_1"]);
});

test("planCatalogV1Sync never deactivates anything from an incremental (non-full) pull", () => {
  const plan = planCatalogV1Sync([], [existingVariant()], false);
  assert.deepEqual(plan.toDeactivate, []);
});

// --- idempotency / safe replay ---

test("planCatalogV1Sync replayed with identical data twice produces no update/create the second time", () => {
  const first = planCatalogV1Sync([apiProduct()], [], true);
  assert.equal(first.toCreate.length, 1);

  // Simulate the created row now existing in D1, matching the created input exactly.
  const nowSynced = existingVariant({ catalogUpdatedAt: normalizeCatalogTimestamp(apiProduct().updated_at) });
  const second = planCatalogV1Sync([apiProduct()], [nowSynced], true);
  assert.equal(second.toCreate.length, 0);
  assert.equal(second.toUpdate.length, 0);
  assert.deepEqual(second.unchanged, ["var_local_1"]);
});

// --- timestamp normalization ---

test("normalizeCatalogTimestamp converts Odoo's naive-UTC space-separated format to ISO-8601", () => {
  assert.equal(normalizeCatalogTimestamp("2026-08-30 10:09:11"), "2026-08-30T10:09:11.000Z");
});

test("normalizeCatalogTimestamp leaves an already-ISO value alone", () => {
  assert.equal(normalizeCatalogTimestamp("2026-08-30T10:09:11.000Z"), "2026-08-30T10:09:11.000Z");
});

// --- slug bootstrap ---

test("slugifyFromSku derives a deterministic ASCII slug from the stable SKU", () => {
  assert.equal(slugifyFromSku("AA-RB-AJ340-D10-L12"), "aa-rb-aj340-d10-l12");
});

test("slugifyFromSku never derives from a Persian name (only ever receives the ASCII SKU)", () => {
  assert.equal(slugifyFromSku("AA-PF-SHS-S100X100X4-L6"), "aa-pf-shs-s100x100x4-l6");
});
