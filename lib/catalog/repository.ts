import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import type { ClassificationRef, ProductVariant } from "./types";
import type { VariantCommercialPatch, VariantCreateInput } from "./sync";

/**
 * DB_PUBLIC-backed repository for the commercial sync path ONLY
 * (`lib/catalog/sync-runner.ts`) — never `cloudflare:workers`/D1 directly
 * (mirrors lib/rfq/repository.ts's role for DB_OPS). DOCUMENT_AUDIT_REPORT.md
 * DAR-034/DAR-036.
 *
 * Public and editorial reads/writes live in `lib/catalog/editorial-repository.ts`
 * instead — DAR-036 found that this file's original "public" read functions
 * (`getPublicVariantByXid`/`getPublicVariantsByGroup`/`getPublicVariantBySlug`/
 * `getApprovedSeoContent`/`getVariantsNeedingEditorialSetup`/`getProductByTemplateXid`)
 * filtered only on `product_variants.is_active`/`is_public`, never on
 * whether real, approved, published editorial content actually existed for
 * a locale — a real safety gap, since nothing called them yet (verified
 * before removal) this was a safe, zero-blast-radius fix rather than a
 * breaking change. See `editorial-repository.ts`'s file header for the
 * properly-gated replacements.
 */

// --- Reads -----------------------------------------------------------------

interface VariantRow {
  id: string;
  product_id: string;
  xid: string;
  sku: string;
  commercial_name: string;
  name_fa: string;
  slug_fa: string | null;
  commercial_size: string | null;
  section_size: string | null;
  schedule: string | null;
  family_code: string | null;
  family_name: string | null;
  group_code: string | null;
  group_name: string | null;
  form_code: string | null;
  form_name: string | null;
  grade_code: string | null;
  grade_name: string | null;
  standard_code: string | null;
  standard_name: string | null;
  dimensions_json: string | null;
  nominal_weight_json: string | null;
  allowed_commercial_units: string | null;
  inventory_uom: string | null;
  catalog_updated_at: string | null;
  is_active: number;
  is_public: number;
  is_price_public: number;
  sync_status: ProductVariant["syncStatus"];
  sync_version: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseJsonRecord(raw: string | null): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, number>) : null;
  } catch {
    return null;
  }
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    xid: row.xid,
    sku: row.sku,
    commercialName: row.commercial_name,
    nameFa: row.name_fa,
    slugFa: row.slug_fa,
    commercialSize: row.commercial_size,
    sectionSize: row.section_size,
    schedule: row.schedule,
    family: { code: row.family_code, name: row.family_name },
    group: { code: row.group_code, name: row.group_name },
    form: { code: row.form_code, name: row.form_name },
    grade: { code: row.grade_code, name: row.grade_name },
    standard: { code: row.standard_code, name: row.standard_name },
    dimensions: parseJsonRecord(row.dimensions_json),
    nominalWeight: parseJsonRecord(row.nominal_weight_json),
    allowedCommercialUnits: row.allowed_commercial_units,
    inventoryUom: row.inventory_uom,
    catalogUpdatedAt: row.catalog_updated_at,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    isPricePublic: row.is_price_public === 1,
    syncStatus: row.sync_status,
    syncVersion: row.sync_version,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All mapped variants, active or not, public or not — for the sync orchestrator's diffing pass. Never call from a public route. */
export async function getAllVariantsForSync(): Promise<ProductVariant[]> {
  const db = getPublicDb();
  const result = await db.prepare(`SELECT * FROM product_variants`).all<VariantRow>();
  return (result.results ?? []).map(mapVariant);
}

// --- Writes (sync orchestrator only — never called from a public route) ---

/** Idempotent: returns the existing row's id if `templateXid` is already mapped, otherwise creates one. */
export async function ensureCatalogProduct(templateXid: string, commercialTemplateName: string, nameFa: string, slugFa: string): Promise<string> {
  const db = getPublicDb();
  const existing = await db.prepare(`SELECT id FROM catalog_products WHERE template_xid = ?`).bind(templateXid).first<{ id: string }>();
  if (existing) return existing.id;

  const id = ulid();
  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO catalog_products (id, template_xid, commercial_template_name, name_fa, slug_fa, is_active, is_public, sync_status, last_synced_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, 'synced', ?, ?, ?)`,
      )
      .bind(id, templateXid, commercialTemplateName, nameFa, slugFa, now, now, now)
      .run();
    return id;
  } catch (err) {
    // Concurrent sync runs racing to create the same template — the UNIQUE
    // constraint on template_xid is the real guard; lose gracefully.
    if (isUniqueConstraintError(err)) {
      const winner = await db.prepare(`SELECT id FROM catalog_products WHERE template_xid = ?`).bind(templateXid).first<{ id: string }>();
      if (winner) return winner.id;
    }
    throw err;
  }
}

function classificationBindings(ref: ClassificationRef): [string | null, string | null] {
  return [ref.code, ref.name];
}

/** Inserts one new variant. `productId` must already exist (see `ensureCatalogProduct`). */
export async function createVariant(productId: string, input: VariantCreateInput, nameFa: string, slugFa: string): Promise<void> {
  const db = getPublicDb();
  const id = ulid();
  const now = new Date().toISOString();
  const [familyCode, familyName] = classificationBindings(input.family);
  const [groupCode, groupName] = classificationBindings(input.group);
  const [formCode, formName] = classificationBindings(input.form);
  const [gradeCode, gradeName] = classificationBindings(input.grade);
  const [standardCode, standardName] = classificationBindings(input.standard);

  await db
    .prepare(
      `INSERT INTO product_variants (
        id, product_id, xid, sku, commercial_name, name_fa, slug_fa,
        commercial_size, section_size, schedule,
        family_code, family_name, group_code, group_name, form_code, form_name,
        grade_code, grade_name, standard_code, standard_name,
        dimensions_json, nominal_weight_json, allowed_commercial_units, inventory_uom,
        catalog_updated_at, is_active, is_public, is_price_public, sync_status, sync_version, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 'synced', 1, ?, ?, ?)`,
    )
    .bind(
      id,
      productId,
      input.xid,
      input.sku,
      input.commercialName,
      nameFa,
      slugFa,
      input.commercialSize,
      input.sectionSize,
      input.schedule,
      familyCode,
      familyName,
      groupCode,
      groupName,
      formCode,
      formName,
      gradeCode,
      gradeName,
      standardCode,
      standardName,
      input.dimensions ? JSON.stringify(input.dimensions) : null,
      input.nominalWeight ? JSON.stringify(input.nominalWeight) : null,
      input.allowedCommercialUnits,
      input.inventoryUom,
      input.catalogUpdatedAt,
      now,
      now,
      now,
    )
    .run();
}

/** Updates only Odoo-owned commercial fields — never `name_fa`/`slug_fa` (CLAUDE.md "editorial preservation"). */
export async function updateVariantCommercialFields(id: string, patch: VariantCommercialPatch): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  const [familyCode, familyName] = classificationBindings(patch.family);
  const [groupCode, groupName] = classificationBindings(patch.group);
  const [formCode, formName] = classificationBindings(patch.form);
  const [gradeCode, gradeName] = classificationBindings(patch.grade);
  const [standardCode, standardName] = classificationBindings(patch.standard);

  await db
    .prepare(
      `UPDATE product_variants SET
        commercial_name = ?, commercial_size = ?, section_size = ?, schedule = ?,
        family_code = ?, family_name = ?, group_code = ?, group_name = ?, form_code = ?, form_name = ?,
        grade_code = ?, grade_name = ?, standard_code = ?, standard_name = ?,
        dimensions_json = ?, nominal_weight_json = ?, allowed_commercial_units = ?, inventory_uom = ?,
        catalog_updated_at = ?, is_active = 1, sync_version = sync_version + 1, last_synced_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      patch.commercialName,
      patch.commercialSize,
      patch.sectionSize,
      patch.schedule,
      familyCode,
      familyName,
      groupCode,
      groupName,
      formCode,
      formName,
      gradeCode,
      gradeName,
      standardCode,
      standardName,
      patch.dimensions ? JSON.stringify(patch.dimensions) : null,
      patch.nominalWeight ? JSON.stringify(patch.nominalWeight) : null,
      patch.allowedCommercialUnits,
      patch.inventoryUom,
      patch.catalogUpdatedAt,
      now,
      now,
      id,
    )
    .run();
}

/** Never deletes — preserves RFQ snapshot history and any editorial record (CLAUDE.md "Archive / Deactivation Behavior"). */
export async function deactivateVariants(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getPublicDb();
  const now = new Date().toISOString();
  const placeholders = ids.map(() => "?").join(",");
  await db
    .prepare(`UPDATE product_variants SET is_active = 0, sync_status = 'odoo_missing', last_synced_at = ?, updated_at = ? WHERE id IN (${placeholders})`)
    .bind(now, now, ...ids)
    .run();
}

function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}
