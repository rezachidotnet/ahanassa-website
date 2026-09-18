import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalogTimestamp, planCatalogV1Sync, slugifyFromSku, slugifyTemplateXid } from "./sync.ts";
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
    canonical_id: "CVAR-000001",
    canonical_template_id: "CTMPL-000001",
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
    // Already-migrated (canonical) identity — the steady state most of this
    // suite's "update"/"unchanged"/"deactivate" tests exercise. Dedicated
    // migration tests below use an explicit legacy-xid override instead.
    xid: "CVAR-000001",
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

test("planCatalogV1Sync creates a brand-new variant, resolving identity from canonical_id/canonical_template_id (DAR-056)", () => {
  const plan = planCatalogV1Sync([apiProduct()], [], true);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].xid, "CVAR-000001");
  assert.equal(plan.toCreate[0].templateXid, "CTMPL-000001");
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

// --- canonical identity (DAR-056, PRE-P3F-D1) ---

function canonicalOnlyApiProduct(overrides: Partial<CatalogApiProduct> = {}): CatalogApiProduct {
  return apiProduct({
    id: null,
    template_id: null,
    canonical_id: "CVAR-000242",
    canonical_template_id: "CTMPL-000017",
    sku: "AA-AN-EQ-S50X50X5",
    commercial_size: "50X50X5",
    section_size: null,
    allowed_commercial_units: "kg, ton, meter",
    classification: {
      family: { code: "LONG_PRODUCTS", name: "Long Products" },
      group: { code: "ANGLE", name: "Angle" },
      form: { code: "EQUAL_ANGLE", name: "Equal Angle" },
    },
    grade: { code: null, name: null },
    dimensions: { width_mm: 50, height_mm: 50, thickness_mm: 5 },
    nominal_weight: { kg_m: 3.77 },
    ...overrides,
  });
}

test("A: planCatalogV1Sync creates a canonical-only row (id/template_id null) with no existing rows to match against", () => {
  const plan = planCatalogV1Sync([canonicalOnlyApiProduct()], [], true);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].xid, "CVAR-000242");
  assert.equal(plan.toCreate[0].templateXid, "CTMPL-000017");
  assert.equal(plan.toCreate[0].sku, "AA-AN-EQ-S50X50X5");
});

test("B: planCatalogV1Sync resolves a legacy+canonical row's identity to canonical_id, not the legacy id", () => {
  const plan = planCatalogV1Sync([apiProduct()], [], true);
  assert.equal(plan.toCreate[0].xid, apiProduct().canonical_id);
  assert.notEqual(plan.toCreate[0].xid, apiProduct().id);
});

test("MIGRATION: an existing row still keyed by the legacy xid is matched via row.id and migrated to canonical_id in place, not duplicated", () => {
  const legacyKeyedExisting = existingVariant({ xid: "ahanassa_marketplace.product_rb_aj340_d10_l12" });
  const plan = planCatalogV1Sync([apiProduct()], [legacyKeyedExisting], true);
  assert.equal(plan.toCreate.length, 0, "must not duplicate an already-synced legacy row");
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].id, "var_local_1");
  assert.equal(plan.toUpdate[0].patch.xid, "CVAR-000001");
});

test("MIGRATION: once a row's xid is already canonical, replaying the same data never re-touches xid again (one-time, idempotent)", () => {
  const alreadyMigrated = existingVariant({ xid: "CVAR-000001", catalogUpdatedAt: normalizeCatalogTimestamp(apiProduct().updated_at) });
  const plan = planCatalogV1Sync([apiProduct()], [alreadyMigrated], true);
  assert.equal(plan.toCreate.length, 0);
  assert.equal(plan.toUpdate.length, 0);
  assert.deepEqual(plan.unchanged, ["var_local_1"]);
});

test("MIGRATION: a legacy-keyed existing row is not wrongly deactivated during its own migration run (seenXids tracks both identity forms)", () => {
  const legacyKeyedExisting = existingVariant({ xid: "ahanassa_marketplace.product_rb_aj340_d10_l12" });
  const plan = planCatalogV1Sync([apiProduct()], [legacyKeyedExisting], true);
  assert.deepEqual(plan.toDeactivate, []);
});

test("MIGRATION: templateIdentity is deduped per canonical_template_id across multiple variants of the same template", () => {
  const variant1 = apiProduct({ canonical_id: "CVAR-000242" });
  const variant2 = apiProduct({ canonical_id: "CVAR-000243", sku: "AA-AN-EQ-S60X60X6" });
  const plan = planCatalogV1Sync([variant1, variant2], [], true);
  assert.equal(plan.templateIdentity.length, 1);
  assert.equal(plan.templateIdentity[0].canonicalTemplateXid, "CTMPL-000001");
  assert.equal(plan.templateIdentity[0].legacyTemplateXid, "ahanassa_marketplace.product_tmpl_rb_aj340");
});

test("MIGRATION: templateIdentity carries a null legacyTemplateXid for a canonical-only (Angle/Channel pilot) template", () => {
  const plan = planCatalogV1Sync([canonicalOnlyApiProduct()], [], true);
  assert.equal(plan.templateIdentity.length, 1);
  assert.equal(plan.templateIdentity[0].canonicalTemplateXid, "CTMPL-000017");
  assert.equal(plan.templateIdentity[0].legacyTemplateXid, null);
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

test("slugifyTemplateXid extracts the last dot-separated segment as ASCII slug material", () => {
  assert.equal(slugifyTemplateXid("ahanassa_marketplace.product_tmpl_rb_aj340"), "product-tmpl-rb-aj340");
});

test("slugifyTemplateXid falls back to the whole string when there is no dot", () => {
  assert.equal(slugifyTemplateXid("no-dot-here"), "no-dot-here");
});
