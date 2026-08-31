import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAcquireLeaseSql,
  buildDeactivateVariantsSql,
  buildInsertCatalogProductSql,
  buildInsertVariantSql,
  buildRecordAttemptStartSql,
  buildRecordFailureSql,
  buildRecordSuccessSql,
  buildReleaseLeaseSql,
  buildSelectCatalogProductByTemplateXidSql,
  buildSelectSyncStateSql,
  buildUpdateVariantCommercialFieldsSql,
} from "./sync-sql.ts";
import type { VariantCommercialPatch, VariantCreateInput } from "./sync.ts";

const family = { code: "LONG_PRODUCTS", name: "Long Products" };
const group = { code: "REBAR", name: "Rebar" };
const form = { code: "RIBBED_REBAR", name: "Ribbed Rebar" };
const grade = { code: "AJ340", name: "Aj340 (market A2)" };
const standard = { code: "INSO3132", name: "INSO 3132" };

const createInput: VariantCreateInput = {
  xid: "ahanassa_marketplace.product_rb_aj340_d10_l12",
  templateXid: "ahanassa_marketplace.product_tmpl_rb_aj340",
  sku: "AA-RB-AJ340-D10-L12",
  commercialName: "[AA-RB-AJ340-D10-L12] Ribbed Rebar Aj340",
  commercialTemplateName: "Ribbed Rebar Aj340 (A2)",
  commercialSize: "Ø10",
  sectionSize: null,
  schedule: null,
  family,
  group,
  form,
  grade,
  standard,
  dimensions: { diameter_mm: 10, length_mm: 12000 },
  nominalWeight: { kg_m: 0.61654, per_branch: 7.39845 },
  allowedCommercialUnits: "kg, ton, branch, bundle",
  inventoryUom: "kg",
  catalogUpdatedAt: "2026-08-30T10:09:11.000Z",
};

// --- catalog_products / product_variants (mirrors repository.ts) ---

test("buildSelectCatalogProductByTemplateXidSql targets template_xid with an escaped literal", () => {
  const sql = buildSelectCatalogProductByTemplateXidSql("x.y'z");
  assert.equal(sql, "SELECT id FROM catalog_products WHERE template_xid = 'x.y''z';");
});

test("buildInsertCatalogProductSql produces a well-formed INSERT with is_active=1, is_public=0", () => {
  const sql = buildInsertCatalogProductSql({ id: "id1", templateXid: "tmpl.x", commercialTemplateName: "Name", nameFa: "نام", slugFa: "name", now: "2026-08-31T00:00:00.000Z" });
  assert.ok(sql.startsWith("INSERT INTO catalog_products"));
  assert.ok(sql.includes("1, 0, 'synced'"));
  assert.ok(sql.includes("'tmpl.x'"));
});

test("buildInsertVariantSql mirrors repository.ts#createVariant's column set and defaults (is_active=1, is_public=0, is_price_public=0)", () => {
  const sql = buildInsertVariantSql("var1", "prod1", createInput, "نام فارسی", "name-fa", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.startsWith("INSERT INTO product_variants"));
  assert.ok(sql.includes("'ahanassa_marketplace.product_rb_aj340_d10_l12'"));
  assert.ok(sql.includes("'AA-RB-AJ340-D10-L12'"));
  assert.ok(sql.includes("'LONG_PRODUCTS'"));
  assert.ok(sql.includes("1, 0, 0, 'synced', 1"));
  assert.ok(sql.includes(JSON.stringify(createInput.dimensions).replace(/"/g, '"')));
});

test("buildInsertVariantSql never sets is_public=1 for a newly-synced variant (publication remains a deliberate editorial action)", () => {
  const sql = buildInsertVariantSql("var1", "prod1", createInput, "نام", "slug", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("1, 0, 0, 'synced', 1")); // is_active, is_public, is_price_public, sync_status, sync_version
});

test("buildInsertVariantSql handles a null grade/standard without inventing a value", () => {
  const nullGrade = { ...createInput, grade: { code: null, name: null } };
  const sql = buildInsertVariantSql("var1", "prod1", nullGrade, "نام", "slug", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("NULL, NULL")); // grade_code, grade_name
});

const patch: VariantCommercialPatch = {
  commercialName: "Updated name",
  commercialSize: "Ø10 (rev)",
  sectionSize: null,
  schedule: null,
  family,
  group,
  form,
  grade,
  standard,
  dimensions: { diameter_mm: 10, length_mm: 12000 },
  nominalWeight: { kg_m: 0.62, per_branch: 7.4 },
  allowedCommercialUnits: "kg, ton",
  inventoryUom: "kg",
  catalogUpdatedAt: "2026-09-01T00:00:00.000Z",
  isActive: true,
};

test("buildUpdateVariantCommercialFieldsSql never touches name_fa/slug_fa/is_public (editorial preservation)", () => {
  const sql = buildUpdateVariantCommercialFieldsSql("var1", patch, "2026-09-01T00:00:00.000Z");
  assert.ok(!sql.includes("name_fa"));
  assert.ok(!sql.includes("slug_fa"));
  assert.ok(!sql.includes("is_public"));
  assert.ok(sql.includes("is_active = 1"));
  assert.ok(sql.includes("sync_version = sync_version + 1"));
});

test("buildUpdateVariantCommercialFieldsSql scopes the UPDATE to the given id", () => {
  const sql = buildUpdateVariantCommercialFieldsSql("var-42", patch, "2026-09-01T00:00:00.000Z");
  assert.ok(sql.endsWith("WHERE id = 'var-42';"));
});

test("buildDeactivateVariantsSql returns null for an empty id list (no-op, never a WHERE IN () syntax error)", () => {
  assert.equal(buildDeactivateVariantsSql([], "2026-09-01T00:00:00.000Z"), null);
});

test("buildDeactivateVariantsSql never deletes — only flips is_active/sync_status", () => {
  const sql = buildDeactivateVariantsSql(["v1", "v2"], "2026-09-01T00:00:00.000Z")!;
  assert.ok(sql.startsWith("UPDATE product_variants SET is_active = 0"));
  assert.ok(!sql.includes("DELETE"));
  assert.ok(sql.includes("'v1'") && sql.includes("'v2'"));
});

// --- catalog_sync_state (mirrors sync-state-repository.ts) ---

test("buildSelectSyncStateSql targets the fixed singleton row", () => {
  assert.equal(buildSelectSyncStateSql(), "SELECT * FROM catalog_sync_state WHERE id = 'catalog';");
});

test("buildAcquireLeaseSql's WHERE clause only matches a free or expired lease", () => {
  const sql = buildAcquireLeaseSql("run-1", "2026-08-31T00:10:00.000Z", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("lease_owner IS NULL OR lease_expires_at < '2026-08-31T00:00:00.000Z'"));
  assert.ok(sql.includes("lease_owner = 'run-1'"));
});

test("buildReleaseLeaseSql only releases the lease if the given runId still owns it", () => {
  const sql = buildReleaseLeaseSql("run-1", "2026-08-31T00:05:00.000Z");
  assert.ok(sql.includes("lease_owner = NULL"));
  assert.ok(sql.includes("WHERE id = 'catalog' AND lease_owner = 'run-1';"));
});

test("buildRecordAttemptStartSql sets last_attempted_at/type", () => {
  const sql = buildRecordAttemptStartSql("incremental", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("last_attempted_type = 'incremental'"));
});

test("buildRecordSuccessSql for full with no watermark sets last_full_reconciliation_at/last_full_upstream_count only", () => {
  const sql = buildRecordSuccessSql("full", 237, null, "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("last_full_reconciliation_at = '2026-08-31T00:00:00.000Z'"));
  assert.ok(sql.includes("last_full_upstream_count = 237"));
  assert.ok(!sql.includes("last_incremental_watermark"));
});

test("buildRecordSuccessSql for full WITH a watermark also advances last_incremental_watermark (establishes the first-ever watermark, or refreshes it since a full run re-observes everything)", () => {
  const sql = buildRecordSuccessSql("full", 237, "2026-08-30T10:04:11.000Z", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("last_full_upstream_count = 237"));
  assert.ok(sql.includes("last_incremental_watermark = '2026-08-30T10:04:11.000Z'"));
});

test("buildRecordSuccessSql for incremental with a watermark advances last_incremental_watermark", () => {
  const sql = buildRecordSuccessSql("incremental", 3, "2026-08-30T10:04:11.000Z", "2026-08-31T00:00:00.000Z");
  assert.ok(sql.includes("last_incremental_watermark = '2026-08-30T10:04:11.000Z'"));
});

test("buildRecordSuccessSql for incremental with no watermark (nothing changed upstream) never touches last_incremental_watermark", () => {
  const sql = buildRecordSuccessSql("incremental", 0, null, "2026-08-31T00:00:00.000Z");
  assert.ok(!sql.includes("last_incremental_watermark"));
  assert.ok(sql.includes("last_success_type = 'incremental'"));
});

test("buildRecordFailureSql never touches the durable watermark or upstream-count columns", () => {
  const sql = buildRecordFailureSql("full", "CATALOG_SYNC_EMPTY_UPSTREAM", "2026-08-31T00:00:00.000Z");
  assert.ok(!sql.includes("last_incremental_watermark"));
  assert.ok(!sql.includes("last_full_upstream_count"));
  assert.ok(sql.includes("consecutive_failure_count = consecutive_failure_count + 1"));
  assert.ok(sql.includes("'CATALOG_SYNC_EMPTY_UPSTREAM'"));
});
