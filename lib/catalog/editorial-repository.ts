import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import type { Locale } from "@/config/locales";
import { canPublish, canSubmitForReview, isValidContentStatusTransition } from "./editorial";
import type { ProductSeoContent, ProductVariant, ContentQualityStatus, IndexStatus } from "./types";

/**
 * Editorial/publication repository — DOCUMENT_AUDIT_REPORT.md DAR-036,
 * docs/CATALOG_EDITORIAL_PUBLICATION.md.
 *
 * Deliberately split from lib/catalog/repository.ts (sync-facing) into two
 * clearly separate surfaces within this file:
 *   - INTERNAL/EDITORIAL reads+writes — operate on `product_seo_contents`
 *     and the `is_public` flag on `product_variants`, regardless of current
 *     publication state (an editor must be able to see/work on drafts).
 *     Never call from a public route.
 *   - PUBLIC reads — `getPublishedCatalogProducts`/`getPublishedCatalogProductBySlug`,
 *     the ONLY functions a future public page/API route may call. Every
 *     query here re-implements the exact same gate `lib/catalog/editorial.ts#evaluatePublicationEligibility`
 *     describes in SQL — a page cannot list/fetch a product unless it is
 *     commercially active+public AND has approved+published content for
 *     the requested locale. This is the hard safety boundary CLAUDE.md
 *     requires; there is no other way to reach `product_variants`/
 *     `product_seo_contents` from application code.
 *
 * All read functions return domain types (camelCase) — SQL/row-shape
 * details never leak past this file, matching lib/catalog/repository.ts's
 * own convention.
 */

export type EditorialWriteResult = { status: "ok" } | { status: "slug_conflict" } | { status: "invalid_transition" } | { status: "precondition_failed"; reason: string } | { status: "not_found" };

// --- shared row mapping (same shape as lib/catalog/repository.ts's SeoContentRow) ---

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
  index_status: IndexStatus;
  content_quality_status: ContentQualityStatus;
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

function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}

// ============================================================================
// INTERNAL / EDITORIAL — never call from a public route
// ============================================================================

export interface EditorialProductView {
  variant: ProductVariant;
  /** Every locale that has ANY row, regardless of status — an editor needs to see drafts. */
  seoByLocale: Partial<Record<Locale, ProductSeoContent>>;
}

/** Regardless of active/public state — an editor must be able to work on archived or not-yet-public products too. */
export async function getCatalogProductForEditorial(xid: string): Promise<EditorialProductView | null> {
  const db = getPublicDb();
  const variantRow = await db.prepare(`SELECT * FROM product_variants WHERE xid = ?`).bind(xid).first<VariantRow>();
  if (!variantRow) return null;
  const variant = mapVariant(variantRow);

  const seoRows = await db
    .prepare(`SELECT * FROM product_seo_contents WHERE entity_type = 'variant' AND entity_id = ?`)
    .bind(variant.id)
    .all<SeoContentRow>();

  const seoByLocale: Partial<Record<Locale, ProductSeoContent>> = {};
  for (const row of seoRows.results ?? []) {
    seoByLocale[row.locale] = mapSeoContent(row);
  }

  return { variant, seoByLocale };
}

/** Active variants with no `product_seo_contents` row (any status) for the given locale specifically. */
export async function listVariantsNeedingEditorialSetupForLocale(locale: Locale): Promise<ProductVariant[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT v.* FROM product_variants v
       WHERE v.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM product_seo_contents s
           WHERE s.entity_type = 'variant' AND s.entity_id = v.id AND s.locale = ?
         )
       ORDER BY v.commercial_name ASC`,
    )
    .bind(locale)
    .all<VariantRow>();
  return (result.results ?? []).map(mapVariant);
}

export interface EditorialDraftFields {
  slug: string;
  h1: string | null;
  intro?: string | null;
  bodyJson?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  faqJson?: string | null;
}

/**
 * Creates or updates a draft. Deliberately does NOT touch
 * `contentQualityStatus` on update (only sets it to the schema default
 * `'incomplete'` on first create) and NEVER touches `publishedAt` —
 * editing already-published content does not silently unpublish or
 * re-approve it; those are separate, explicit actions
 * (`submitForReview`/`approveContent`/`publishContent`/`unpublishContent`).
 * This is a deliberate policy answer to this task's own Stage B Q4.
 */
export async function upsertEditorialDraft(variantId: string, locale: Locale, fields: EditorialDraftFields): Promise<EditorialWriteResult> {
  const normalizedSlug = fields.slug;
  const db = getPublicDb();
  const now = new Date().toISOString();
  const id = ulid();

  try {
    await db
      .prepare(
        `INSERT INTO product_seo_contents (id, entity_type, entity_id, locale, slug, h1, intro, body_json, seo_title, seo_description, faq_json, index_status, content_quality_status, published_at, updated_at)
         VALUES (?, 'variant', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'incomplete', NULL, ?)
         ON CONFLICT(entity_type, entity_id, locale) DO UPDATE SET
           slug = excluded.slug, h1 = excluded.h1, intro = excluded.intro, body_json = excluded.body_json,
           seo_title = excluded.seo_title, seo_description = excluded.seo_description, faq_json = excluded.faq_json,
           updated_at = excluded.updated_at`,
      )
      .bind(
        id,
        variantId,
        locale,
        normalizedSlug,
        fields.h1,
        fields.intro ?? null,
        fields.bodyJson ?? null,
        fields.seoTitle ?? null,
        fields.seoDescription ?? null,
        fields.faqJson ?? null,
        now,
      )
      .run();
    return { status: "ok" };
  } catch (err) {
    if (isUniqueConstraintError(err)) return { status: "slug_conflict" };
    throw err;
  }
}

async function getSeoContent(variantId: string, locale: Locale): Promise<ProductSeoContent | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM product_seo_contents WHERE entity_type = 'variant' AND entity_id = ? AND locale = ?`)
    .bind(variantId, locale)
    .first<SeoContentRow>();
  return row ? mapSeoContent(row) : null;
}

async function setContentQualityStatus(variantId: string, locale: Locale, from: ContentQualityStatus[], to: ContentQualityStatus): Promise<EditorialWriteResult> {
  const current = await getSeoContent(variantId, locale);
  if (!current) return { status: "not_found" };
  if (!from.includes(current.contentQualityStatus) || !isValidContentStatusTransition(current.contentQualityStatus, to)) {
    return { status: "invalid_transition" };
  }
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET content_quality_status = ?, updated_at = ? WHERE entity_type = 'variant' AND entity_id = ? AND locale = ?`)
    .bind(to, new Date().toISOString(), variantId, locale)
    .run();
  return { status: "ok" };
}

export async function submitForReview(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(variantId, locale);
  if (!current) return { status: "not_found" };
  if (!canSubmitForReview(current)) return { status: "precondition_failed", reason: "missing_required_content_fields" };
  return setContentQualityStatus(variantId, locale, ["incomplete"], "review");
}

export async function approveContent(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(variantId, locale, ["review"], "approved");
}

/** Reviewer sends work back for more changes. */
export async function sendBackToDraft(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(variantId, locale, ["review"], "incomplete");
}

/** Editor deliberately reopens previously-approved content for changes. Does not affect `publishedAt` — a live page stays live (still gated on `contentQualityStatus === 'approved'`, so it becomes correctly invisible the moment this runs, until re-approved). */
export async function reopenForEdits(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(variantId, locale, ["approved"], "review");
}

export async function publishContent(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(variantId, locale);
  if (!current) return { status: "not_found" };
  if (!canPublish(current)) return { status: "precondition_failed", reason: "not_approved_or_missing_content" };
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET published_at = ?, updated_at = ? WHERE entity_type = 'variant' AND entity_id = ? AND locale = ?`)
    .bind(new Date().toISOString(), new Date().toISOString(), variantId, locale)
    .run();
  return { status: "ok" };
}

/** Takes a locale offline without touching `contentQualityStatus` — a quick unpublish/republish cycle does not require re-review. */
export async function unpublishContent(variantId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(variantId, locale);
  if (!current) return { status: "not_found" };
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET published_at = NULL, updated_at = ? WHERE entity_type = 'variant' AND entity_id = ? AND locale = ?`)
    .bind(new Date().toISOString(), variantId, locale)
    .run();
  return { status: "ok" };
}

export async function setIndexStatus(variantId: string, locale: Locale, indexStatus: IndexStatus): Promise<EditorialWriteResult> {
  const current = await getSeoContent(variantId, locale);
  if (!current) return { status: "not_found" };
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET index_status = ?, updated_at = ? WHERE entity_type = 'variant' AND entity_id = ? AND locale = ?`)
    .bind(indexStatus, new Date().toISOString(), variantId, locale)
    .run();
  return { status: "ok" };
}

/**
 * The per-variant master publication switch — independent of any locale's
 * content state. `is_public = false` is a hard kill switch (nothing about
 * this variant is ever public in any locale, regardless of approved+published
 * content); `is_public = true` merely allows each locale's own gate to
 * apply. This column lives on `product_variants` for schema-practical
 * reasons but is website-owned, never written by commercial sync
 * (lib/catalog/sync.ts never sets it — verified by that module's own types).
 */
export async function setVariantPublicationFlag(variantId: string, isPublic: boolean): Promise<EditorialWriteResult> {
  const db = getPublicDb();
  const result = await db
    .prepare(`UPDATE product_variants SET is_public = ?, updated_at = ? WHERE id = ?`)
    .bind(isPublic ? 1 : 0, new Date().toISOString(), variantId)
    .run();
  return result.meta.changes > 0 ? { status: "ok" } : { status: "not_found" };
}

// ============================================================================
// PUBLIC — the only functions a public page/API route may call
// ============================================================================

export interface PublishedCatalogProduct {
  variant: ProductVariant;
  seo: ProductSeoContent;
}

export interface PublishedCatalogFilters {
  groupCode?: string;
  familyCode?: string;
}

/**
 * Structurally cannot return an unpublished/inactive/editorially-incomplete
 * row — the `WHERE` clause below is the SQL form of
 * `lib/catalog/editorial.ts#evaluatePublicationEligibility`'s `visible`
 * rule; `editorial.test.ts` pins that rule's exact semantics, and this
 * function's own tests (none possible without live D1 — verified instead
 * against real staging data, DAR-036) confirm it returns zero rows while
 * zero `product_seo_contents` rows exist, matching the real current state.
 */
export async function getPublishedCatalogProducts(locale: Locale, filters: PublishedCatalogFilters = {}): Promise<PublishedCatalogProduct[]> {
  const db = getPublicDb();
  const conditions = [
    "v.is_active = 1",
    "v.is_public = 1",
    "s.locale = ?",
    "s.content_quality_status = 'approved'",
    "s.published_at IS NOT NULL",
    "s.h1 IS NOT NULL",
  ];
  const params: unknown[] = [locale];
  if (filters.groupCode) {
    conditions.push("v.group_code = ?");
    params.push(filters.groupCode);
  }
  if (filters.familyCode) {
    conditions.push("v.family_code = ?");
    params.push(filters.familyCode);
  }

  const result = await db
    .prepare(
      `SELECT v.*, s.id as seo_id, s.entity_type as seo_entity_type, s.entity_id as seo_entity_id, s.locale as seo_locale,
              s.slug as seo_slug, s.h1 as seo_h1, s.intro as seo_intro, s.body_json as seo_body_json,
              s.seo_title as seo_seo_title, s.seo_description as seo_seo_description, s.faq_json as seo_faq_json,
              s.index_status as seo_index_status, s.content_quality_status as seo_content_quality_status,
              s.published_at as seo_published_at, s.updated_at as seo_updated_at
       FROM product_variants v
       JOIN product_seo_contents s ON s.entity_type = 'variant' AND s.entity_id = v.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY v.commercial_name ASC`,
    )
    .bind(...params)
    .all<VariantRow & Record<string, unknown>>();

  return (result.results ?? []).map((row) => rowToPublishedProduct(row));
}

export async function getPublishedCatalogProductBySlug(locale: Locale, slug: string): Promise<PublishedCatalogProduct | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(
      `SELECT v.*, s.id as seo_id, s.entity_type as seo_entity_type, s.entity_id as seo_entity_id, s.locale as seo_locale,
              s.slug as seo_slug, s.h1 as seo_h1, s.intro as seo_intro, s.body_json as seo_body_json,
              s.seo_title as seo_seo_title, s.seo_description as seo_seo_description, s.faq_json as seo_faq_json,
              s.index_status as seo_index_status, s.content_quality_status as seo_content_quality_status,
              s.published_at as seo_published_at, s.updated_at as seo_updated_at
       FROM product_variants v
       JOIN product_seo_contents s ON s.entity_type = 'variant' AND s.entity_id = v.id
       WHERE v.is_active = 1 AND v.is_public = 1 AND s.locale = ? AND s.slug = ?
         AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL`,
    )
    .bind(locale, slug)
    .first<VariantRow & Record<string, unknown>>();

  return row ? rowToPublishedProduct(row) : null;
}

function rowToPublishedProduct(row: VariantRow & Record<string, unknown>): PublishedCatalogProduct {
  const variant = mapVariant(row);
  const seo = mapSeoContent({
    id: row.seo_id as string,
    entity_type: row.seo_entity_type as ProductSeoContent["entityType"],
    entity_id: row.seo_entity_id as string,
    locale: row.seo_locale as Locale,
    slug: row.seo_slug as string,
    h1: row.seo_h1 as string | null,
    intro: row.seo_intro as string | null,
    body_json: row.seo_body_json as string | null,
    seo_title: row.seo_seo_title as string | null,
    seo_description: row.seo_seo_description as string | null,
    faq_json: row.seo_faq_json as string | null,
    index_status: row.seo_index_status as IndexStatus,
    content_quality_status: row.seo_content_quality_status as ContentQualityStatus,
    published_at: row.seo_published_at as string | null,
    updated_at: row.seo_updated_at as string,
  });
  return { variant, seo };
}
