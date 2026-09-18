import { sqliteLiteral } from "./editorial-cli.ts";
import type { CatalogSyncType } from "./sync-state-repository.ts";
import type { ClassificationRef } from "./types.ts";
import type { VariantCommercialPatch, VariantCreateInput } from "./sync.ts";

/**
 * Pure SQL-statement builders for `scripts/catalog-sync.ts` (the manual
 * Catalog sync operator CLI) — mirrors `lib/catalog/repository.ts` (commercial
 * writes) and `lib/catalog/sync-state-repository.ts` (durable sync state)
 * exactly, the same way `lib/catalog/editorial-cli.ts` mirrors
 * `lib/catalog/editorial-repository.ts` for the editorial operator CLI.
 * D1-free — reuses `sqliteLiteral` from `editorial-cli.ts` rather than
 * duplicating SQL-literal escaping a third time.
 *
 * DOCUMENT_AUDIT_REPORT.md DAR-040, docs/CATALOG_SYNC_OPERATIONS.md.
 */

function classificationLiterals(ref: ClassificationRef): [string, string] {
  return [sqliteLiteral(ref.code), sqliteLiteral(ref.name)];
}

// --- mirrors lib/catalog/repository.ts ---

export function buildSelectCatalogProductByTemplateXidSql(templateXid: string): string {
  return `SELECT id FROM catalog_products WHERE template_xid = ${sqliteLiteral(templateXid)};`;
}

/** DAR-056 migration case: migrates a `catalog_products` row's identity column in place — mirrors `repository.ts#ensureCatalogProduct`'s legacy-match branch. */
export function buildMigrateCatalogProductTemplateXidSql(id: string, canonicalTemplateXid: string, now: string): string {
  return `UPDATE catalog_products SET template_xid = ${sqliteLiteral(canonicalTemplateXid)}, updated_at = ${sqliteLiteral(now)} WHERE id = ${sqliteLiteral(id)};`;
}

export interface InsertCatalogProductInput {
  id: string;
  templateXid: string;
  commercialTemplateName: string;
  nameFa: string;
  slugFa: string;
  now: string;
}

/** Mirrors `repository.ts#ensureCatalogProduct`'s INSERT branch. */
export function buildInsertCatalogProductSql(input: InsertCatalogProductInput): string {
  return (
    `INSERT INTO catalog_products (id, template_xid, commercial_template_name, name_fa, slug_fa, is_active, is_public, sync_status, last_synced_at, created_at, updated_at) ` +
    `VALUES (${sqliteLiteral(input.id)}, ${sqliteLiteral(input.templateXid)}, ${sqliteLiteral(input.commercialTemplateName)}, ${sqliteLiteral(input.nameFa)}, ${sqliteLiteral(input.slugFa)}, 1, 0, 'synced', ${sqliteLiteral(input.now)}, ${sqliteLiteral(input.now)}, ${sqliteLiteral(input.now)});`
  );
}

/** Mirrors `repository.ts#createVariant`. */
export function buildInsertVariantSql(id: string, productId: string, input: VariantCreateInput, nameFa: string, slugFa: string, now: string): string {
  const [familyCode, familyName] = classificationLiterals(input.family);
  const [groupCode, groupName] = classificationLiterals(input.group);
  const [formCode, formName] = classificationLiterals(input.form);
  const [gradeCode, gradeName] = classificationLiterals(input.grade);
  const [standardCode, standardName] = classificationLiterals(input.standard);

  return (
    `INSERT INTO product_variants (` +
    `id, product_id, xid, sku, commercial_name, name_fa, slug_fa, commercial_size, section_size, schedule, ` +
    `family_code, family_name, group_code, group_name, form_code, form_name, grade_code, grade_name, standard_code, standard_name, ` +
    `dimensions_json, nominal_weight_json, allowed_commercial_units, inventory_uom, catalog_updated_at, ` +
    `is_active, is_public, is_price_public, sync_status, sync_version, last_synced_at, created_at, updated_at` +
    `) VALUES (` +
    `${sqliteLiteral(id)}, ${sqliteLiteral(productId)}, ${sqliteLiteral(input.xid)}, ${sqliteLiteral(input.sku)}, ${sqliteLiteral(input.commercialName)}, ${sqliteLiteral(nameFa)}, ${sqliteLiteral(slugFa)}, ${sqliteLiteral(input.commercialSize)}, ${sqliteLiteral(input.sectionSize)}, ${sqliteLiteral(input.schedule)}, ` +
    `${familyCode}, ${familyName}, ${groupCode}, ${groupName}, ${formCode}, ${formName}, ${gradeCode}, ${gradeName}, ${standardCode}, ${standardName}, ` +
    `${sqliteLiteral(input.dimensions ? JSON.stringify(input.dimensions) : null)}, ${sqliteLiteral(input.nominalWeight ? JSON.stringify(input.nominalWeight) : null)}, ${sqliteLiteral(input.allowedCommercialUnits)}, ${sqliteLiteral(input.inventoryUom)}, ${sqliteLiteral(input.catalogUpdatedAt)}, ` +
    `1, 0, 0, 'synced', 1, ${sqliteLiteral(now)}, ${sqliteLiteral(now)}, ${sqliteLiteral(now)});`
  );
}

/** Mirrors `repository.ts#updateVariantCommercialFields` — never touches `name_fa`/`slug_fa`/`is_public`. When `patch.xid` is present (DAR-056 migration case), also migrates the identity column in the same statement. */
export function buildUpdateVariantCommercialFieldsSql(id: string, patch: VariantCommercialPatch, now: string): string {
  const [familyCode, familyName] = classificationLiterals(patch.family);
  const [groupCode, groupName] = classificationLiterals(patch.group);
  const [formCode, formName] = classificationLiterals(patch.form);
  const [gradeCode, gradeName] = classificationLiterals(patch.grade);
  const [standardCode, standardName] = classificationLiterals(patch.standard);
  const xidClause = patch.xid ? `, xid = ${sqliteLiteral(patch.xid)}` : "";

  return (
    `UPDATE product_variants SET ` +
    `commercial_name = ${sqliteLiteral(patch.commercialName)}, commercial_size = ${sqliteLiteral(patch.commercialSize)}, section_size = ${sqliteLiteral(patch.sectionSize)}, schedule = ${sqliteLiteral(patch.schedule)}, ` +
    `family_code = ${familyCode}, family_name = ${familyName}, group_code = ${groupCode}, group_name = ${groupName}, form_code = ${formCode}, form_name = ${formName}, ` +
    `grade_code = ${gradeCode}, grade_name = ${gradeName}, standard_code = ${standardCode}, standard_name = ${standardName}, ` +
    `dimensions_json = ${sqliteLiteral(patch.dimensions ? JSON.stringify(patch.dimensions) : null)}, nominal_weight_json = ${sqliteLiteral(patch.nominalWeight ? JSON.stringify(patch.nominalWeight) : null)}, ` +
    `allowed_commercial_units = ${sqliteLiteral(patch.allowedCommercialUnits)}, inventory_uom = ${sqliteLiteral(patch.inventoryUom)}, catalog_updated_at = ${sqliteLiteral(patch.catalogUpdatedAt)}, ` +
    `is_active = 1, sync_version = sync_version + 1, last_synced_at = ${sqliteLiteral(now)}, updated_at = ${sqliteLiteral(now)}${xidClause} ` +
    `WHERE id = ${sqliteLiteral(id)};`
  );
}

/** Mirrors `repository.ts#deactivateVariants` — never deletes. */
export function buildDeactivateVariantsSql(ids: string[], now: string): string | null {
  if (ids.length === 0) return null;
  const inList = ids.map((id) => sqliteLiteral(id)).join(", ");
  return `UPDATE product_variants SET is_active = 0, sync_status = 'odoo_missing', last_synced_at = ${sqliteLiteral(now)}, updated_at = ${sqliteLiteral(now)} WHERE id IN (${inList});`;
}

// --- mirrors lib/catalog/sync-state-repository.ts ---

export function buildSelectSyncStateSql(): string {
  return `SELECT * FROM catalog_sync_state WHERE id = 'catalog';`;
}

/** Mirrors `sync-state-repository.ts#acquireCatalogSyncLease`. */
export function buildAcquireLeaseSql(runId: string, expiresAt: string, now: string): string {
  return `UPDATE catalog_sync_state SET lease_owner = ${sqliteLiteral(runId)}, lease_expires_at = ${sqliteLiteral(expiresAt)}, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog' AND (lease_owner IS NULL OR lease_expires_at < ${sqliteLiteral(now)});`;
}

/** Mirrors `sync-state-repository.ts#releaseCatalogSyncLease`. */
export function buildReleaseLeaseSql(runId: string, now: string): string {
  return `UPDATE catalog_sync_state SET lease_owner = NULL, lease_expires_at = NULL, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog' AND lease_owner = ${sqliteLiteral(runId)};`;
}

/** Mirrors `sync-state-repository.ts#recordSyncAttemptStart`. */
export function buildRecordAttemptStartSql(type: CatalogSyncType, now: string): string {
  return `UPDATE catalog_sync_state SET last_attempted_at = ${sqliteLiteral(now)}, last_attempted_type = ${sqliteLiteral(type)}, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog';`;
}

/**
 * Mirrors `sync-state-repository.ts#recordSyncSuccess` — a successful FULL
 * run also advances `last_incremental_watermark` when `watermark` is
 * given (a full reconciliation re-observes everything, so it is exactly as
 * valid a watermark source, and is what establishes the very first
 * watermark before any incremental run has ever succeeded).
 */
export function buildRecordSuccessSql(type: CatalogSyncType, totalSeen: number, watermark: string | null, now: string): string {
  if (type === "full") {
    const watermarkClause = watermark ? `, last_incremental_watermark = ${sqliteLiteral(watermark)}` : "";
    return `UPDATE catalog_sync_state SET last_success_at = ${sqliteLiteral(now)}, last_success_type = 'full', last_full_reconciliation_at = ${sqliteLiteral(now)}, last_full_upstream_count = ${sqliteLiteral(totalSeen)}${watermarkClause}, consecutive_failure_count = 0, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog';`;
  }
  if (watermark) {
    return `UPDATE catalog_sync_state SET last_success_at = ${sqliteLiteral(now)}, last_success_type = 'incremental', last_incremental_watermark = ${sqliteLiteral(watermark)}, consecutive_failure_count = 0, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog';`;
  }
  return `UPDATE catalog_sync_state SET last_success_at = ${sqliteLiteral(now)}, last_success_type = 'incremental', consecutive_failure_count = 0, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog';`;
}

/** Mirrors `sync-state-repository.ts#recordSyncFailure` — never touches the durable watermark/upstream-count columns. */
export function buildRecordFailureSql(type: CatalogSyncType, reasonCode: string, now: string): string {
  return `UPDATE catalog_sync_state SET last_failure_at = ${sqliteLiteral(now)}, last_failure_type = ${sqliteLiteral(type)}, last_failure_reason_code = ${sqliteLiteral(reasonCode)}, consecutive_failure_count = consecutive_failure_count + 1, updated_at = ${sqliteLiteral(now)} WHERE id = 'catalog';`;
}
