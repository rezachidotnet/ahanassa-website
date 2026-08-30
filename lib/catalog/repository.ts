import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import type { Locale } from "@/config/locales";
import type { CatalogProduct, ClassificationRef, ProductSeoContent, ProductVariant } from "./types";
import type { VariantCommercialPatch, VariantCreateInput } from "./sync";

/**
 * DB_PUBLIC-backed catalog repository — the boundary all public
 * pages/API routes AND the sync orchestrator use, never `cloudflare:workers`/
 * D1 directly (mirrors lib/rfq/repository.ts's role for DB_OPS).
 * DOCUMENT_AUDIT_REPORT.md DAR-034.
 *
 * Read functions filter to `is_public = 1 AND is_active = 1` so a page
 * built on this repository structurally cannot show an unpublished or
 * archived row. Write functions are the sync orchestrator's only path into
 * DB_PUBLIC — never called from a public route.
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

export async function getPublicVariantsByGroup(groupCode: string): Promise<ProductVariant[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT * FROM product_variants WHERE group_code = ? AND is_public = 1 AND is_active = 1 ORDER BY commercial_name ASC`)
    .bind(groupCode)
    .all<VariantRow>();
  return (result.results ?? []).map(mapVariant);
}

export async function getPublicVariantByXid(xid: string): Promise<ProductVariant | null> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT * FROM product_variants WHERE xid = ? AND is_public = 1 AND is_active = 1`).bind(xid).first<VariantRow>();
  return row ? mapVariant(row) : null;
}

export async function getPublicVariantBySlug(slugFa: string): Promise<ProductVariant | null> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT * FROM product_variants WHERE slug_fa = ? AND is_public = 1 AND is_active = 1`).bind(slugFa).first<VariantRow>();
  return row ? mapVariant(row) : null;
}

interface ProductRow {
  id: string;
  template_xid: string;
  commercial_template_name: string;
  name_fa: string;
  slug_fa: string;
  is_active: number;
  is_public: number;
  sync_status: CatalogProduct["syncStatus"];
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    templateXid: row.template_xid,
    commercialTemplateName: row.commercial_template_name,
    nameFa: row.name_fa,
    slugFa: row.slug_fa,
    isActive: row.is_active === 1,
    isPublic: row.is_public === 1,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProductByTemplateXid(templateXid: string): Promise<CatalogProduct | null> {
  const db = getPublicDb();
  const row = await db.prepare(`SELECT * FROM catalog_products WHERE template_xid = ?`).bind(templateXid).first<ProductRow>();
  return row ? mapProduct(row) : null;
}

/** Variants that were auto-created from Odoo data but have no approved SEO overlay yet — a to-do list, not a blocker (CLAUDE.md "needsEditorialSetup"). */
export async function getVariantsNeedingEditorialSetup(): Promise<ProductVariant[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT v.* FROM product_variants v
       WHERE v.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM product_seo_contents s
           WHERE s.entity_type = 'variant' AND s.entity_id = v.id AND s.content_quality_status = 'approved'
         )`,
    )
    .all<VariantRow>();
  return (result.results ?? []).map(mapVariant);
}

interface SeoContentRow {
  id: string;
  entity_type: ProductSeoContent["entityType"];
  entity_id: string;
  locale: Locale;
  slug: string;
  h1: string | null;
  intro: string | null;
  body_json: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq_json: string | null;
  index_status: ProductSeoContent["indexStatus"];
  content_quality_status: ProductSeoContent["contentQualityStatus"];
  published_at: string | null;
  updated_at: string;
}

function mapSeoContent(row: SeoContentRow): ProductSeoContent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    locale: row.locale,
    slug: row.slug,
    h1: row.h1,
    intro: row.intro,
    bodyJson: row.body_json,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    faqJson: row.faq_json,
    indexStatus: row.index_status,
    contentQualityStatus: row.content_quality_status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/** Only ever returns `approved` content — `incomplete`/`review` rows are never surfaced to a public page. */
export async function getApprovedSeoContent(
  entityType: ProductSeoContent["entityType"],
  entityId: string,
  locale: Locale,
): Promise<ProductSeoContent | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM product_seo_contents WHERE entity_type = ? AND entity_id = ? AND locale = ? AND content_quality_status = 'approved'`)
    .bind(entityType, entityId, locale)
    .first<SeoContentRow>();
  return row ? mapSeoContent(row) : null;
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
