import { getPublicDb } from "../db/public.ts";
import { ulid } from "../rfq/ulid.ts";
import type { Locale } from "../../config/locales.ts";
import { canPublish, canSubmitForReview, isValidContentStatusTransition } from "./editorial.ts";
import { buildTemplateFilterConditions, computeConditionalFacets, type CatalogFilterInput, type CatalogFilterFacets, type ClassificationRow } from "./catalog-filters.ts";
import { resolveCatalogMedia, type ResolvedCatalogMedia } from "./media-registry.ts";
import { computeHomepageScore, sortByHomepageScore, type HomepageRankingMode } from "../ranking/score.ts";
import { HOMEPAGE_PRODUCT_DISPLAY_COUNT } from "./homepage-config.ts";
import type { CatalogProduct, ProductSeoContent, ProductVariant, ContentQualityStatus, IndexStatus, HomepageProductCandidate } from "./types.ts";

/**
 * Editorial/publication repository — DOCUMENT_AUDIT_REPORT.md DAR-036/DAR-037,
 * docs/CATALOG_EDITORIAL_PUBLICATION.md, docs/CATALOG_PUBLIC_ROUTES.md.
 *
 * Deliberately split into two clearly separate surfaces within this file:
 *   - INTERNAL/EDITORIAL reads+writes — operate on `product_seo_contents`
 *     (both `entity_type='variant'` and `entity_type='product'`, the
 *     template-level entity per DAR-037) and the `is_public` flag on
 *     `product_variants`/`catalog_products`, regardless of current
 *     publication state (an editor must be able to see/work on drafts).
 *     Never call from a public route.
 *   - PUBLIC reads — the ONLY functions a public page/API route may call.
 *     Every query here re-implements the exact same gate
 *     `lib/catalog/editorial.ts#evaluatePublicationEligibility` describes in
 *     SQL — a page cannot list/fetch a product unless it is commercially
 *     active+public AND has approved+published content for the requested
 *     locale. This is the hard safety boundary CLAUDE.md requires; there is
 *     no other way to reach `product_variants`/`catalog_products`/
 *     `product_seo_contents` from application code.
 *
 *     DAR-037 adds the TEMPLATE-level (`entity_type='product'`) public reads
 *     that back the site's primary indexable catalog pages
 *     (docs/CATALOG_PUBLIC_ROUTES.md — hybrid SEO model). The pre-existing
 *     variant-level public reads (`getPublishedCatalogProducts`/
 *     `getPublishedCatalogProductBySlug`, DAR-036) remain exactly as they
 *     were, now serving the deliberately rare "a variant earns its own
 *     dedicated page" exception rather than the default path.
 *
 * All read functions return domain types (camelCase) — SQL/row-shape
 * details never leak past this file, matching lib/catalog/repository.ts's
 * own convention.
 */

export type EditorialWriteResult =
  | { status: "ok" }
  | { status: "slug_conflict" }
  | { status: "invalid_transition" }
  | { status: "precondition_failed"; reason: string }
  | { status: "not_found" }
  /** A slug change was requested but the required redirect (preserving the previous canonical URL) could not be safely written — a self-redirect or a loop against existing `route_redirects` rows. The slug change itself is refused, not partially applied — see `upsertEditorialDraft`'s atomicity contract. */
  | { status: "redirect_conflict"; reason: string };

/** The two entity types this repository's editorial lifecycle functions operate on — `category`/`price_page` (also valid on `product_seo_contents.entity_type`) have no editorial workflow here. */
export type EditorialEntityType = "variant" | "product";

// --- shared row mapping ---

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

interface CatalogProductRow {
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

function mapCatalogProduct(row: CatalogProductRow): CatalogProduct {
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

/** Regardless of active/public state — an editor must be able to work on archived or not-yet-public variants too. */
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

export interface EditorialTemplateView {
  product: CatalogProduct;
  seoByLocale: Partial<Record<Locale, ProductSeoContent>>;
  /** All variants under this template, regardless of their own active/public state — an editor needs the full picture. */
  variants: ProductVariant[];
}

/** Template-level counterpart of `getCatalogProductForEditorial` — DAR-037. */
export async function getCatalogTemplateForEditorial(templateXid: string): Promise<EditorialTemplateView | null> {
  const db = getPublicDb();
  const productRow = await db.prepare(`SELECT * FROM catalog_products WHERE template_xid = ?`).bind(templateXid).first<CatalogProductRow>();
  if (!productRow) return null;
  const product = mapCatalogProduct(productRow);

  const [seoRows, variantRows] = await Promise.all([
    db.prepare(`SELECT * FROM product_seo_contents WHERE entity_type = 'product' AND entity_id = ?`).bind(product.id).all<SeoContentRow>(),
    db.prepare(`SELECT * FROM product_variants WHERE product_id = ? ORDER BY commercial_name ASC`).bind(product.id).all<VariantRow>(),
  ]);

  const seoByLocale: Partial<Record<Locale, ProductSeoContent>> = {};
  for (const row of seoRows.results ?? []) {
    seoByLocale[row.locale] = mapSeoContent(row);
  }

  return { product, seoByLocale, variants: (variantRows.results ?? []).map(mapVariant) };
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

/** Active templates with no `product_seo_contents` row (any status) for the given locale — the template-level counterpart, DAR-037. */
export async function listTemplatesNeedingEditorialSetupForLocale(locale: Locale): Promise<CatalogProduct[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT cp.* FROM catalog_products cp
       WHERE cp.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM product_seo_contents s
           WHERE s.entity_type = 'product' AND s.entity_id = cp.id AND s.locale = ?
         )
       ORDER BY cp.commercial_template_name ASC`,
    )
    .bind(locale)
    .all<CatalogProductRow>();
  return (result.results ?? []).map(mapCatalogProduct);
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
 * Creates or updates a draft for either a variant or a template entity.
 * Deliberately does NOT touch `contentQualityStatus` on update (only sets it
 * to the schema default `'incomplete'` on first create) and NEVER touches
 * `publishedAt` — editing already-published content does not silently
 * unpublish or re-approve it; those are separate, explicit actions
 * (`submitForReview`/`approveContent`/`publishContent`/`unpublishContent`).
 * This is a deliberate policy answer to DAR-036's Stage B Q4, applied
 * uniformly to both entity types.
 *
 * Slug-change redirect — ATOMIC, not best-effort (this task's §11-12 as
 * hardened by DAR-054). When an EXISTING `entity_type = 'product'` row's
 * slug actually changes, the previous `/products/{slug}` path's permanent
 * redirect to the new one is written in the SAME D1 `.batch()` as the
 * content row itself (`lib/catalog/route-redirects.ts#buildSlugChangeRedirectStatements`
 * builds, never executes, the redirect statements — they are spliced into
 * this function's own batch call). D1's `.batch()` is a single implicit
 * transaction: if either the content write or the redirect write fails, the
 * WHOLE batch is rolled back — an existing public canonical URL can never
 * end up 404ing because a redirect write silently failed while the slug
 * change itself committed. If the required redirect cannot even be
 * validated (a self-redirect/loop against existing `route_redirects` rows —
 * checked BEFORE any write is attempted), the slug change is refused
 * outright (`{ status: "redirect_conflict" }`) rather than silently
 * skipping the redirect and leaving the old URL unprotected. Never
 * triggered for a brand-new row (no previous row = nothing to redirect
 * from — first-slug creation stays a single-statement write) and never for
 * `entity_type = 'variant'` (no dedicated public route exists for a variant
 * today — this task's explicit non-goal of inventing new routing).
 */
export async function upsertEditorialDraft(entityType: EditorialEntityType, entityId: string, locale: Locale, fields: EditorialDraftFields): Promise<EditorialWriteResult> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  const id = ulid();

  const previous = entityType === "product" ? await getSeoContent(entityType, entityId, locale) : null;
  const isSlugChange = previous !== null && previous.slug !== fields.slug;

  const seoUpsertStatement = db
    .prepare(
      `INSERT INTO product_seo_contents (id, entity_type, entity_id, locale, slug, h1, intro, body_json, seo_title, seo_description, faq_json, index_status, content_quality_status, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'incomplete', NULL, ?)
       ON CONFLICT(entity_type, entity_id, locale) DO UPDATE SET
         slug = excluded.slug, h1 = excluded.h1, intro = excluded.intro, body_json = excluded.body_json,
         seo_title = excluded.seo_title, seo_description = excluded.seo_description, faq_json = excluded.faq_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      entityType,
      entityId,
      locale,
      fields.slug,
      fields.h1,
      fields.intro ?? null,
      fields.bodyJson ?? null,
      fields.seoTitle ?? null,
      fields.seoDescription ?? null,
      fields.faqJson ?? null,
      now,
    );

  if (!isSlugChange) {
    try {
      await seoUpsertStatement.run();
      return { status: "ok" };
    } catch (err) {
      if (isUniqueConstraintError(err)) return { status: "slug_conflict" };
      throw err;
    }
  }

  // Validated BEFORE any write is attempted — a failure here means neither
  // the content row nor any redirect row is touched at all.
  const { buildSlugChangeRedirectStatements } = await import("./route-redirects.ts");
  const redirectPlan = await buildSlugChangeRedirectStatements(locale, "catalog_template", entityId, `/products/${previous!.slug}`, `/products/${fields.slug}`);
  if (!redirectPlan.ok) {
    return { status: "redirect_conflict", reason: redirectPlan.reason };
  }

  try {
    await db.batch([seoUpsertStatement, ...redirectPlan.statements]);
    return { status: "ok" };
  } catch (err) {
    if (isUniqueConstraintError(err)) return { status: "slug_conflict" };
    throw err;
  }
}

async function getSeoContent(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<ProductSeoContent | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(`SELECT * FROM product_seo_contents WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
    .bind(entityType, entityId, locale)
    .first<SeoContentRow>();
  return row ? mapSeoContent(row) : null;
}

async function setContentQualityStatus(entityType: EditorialEntityType, entityId: string, locale: Locale, from: ContentQualityStatus[], to: ContentQualityStatus): Promise<EditorialWriteResult> {
  const current = await getSeoContent(entityType, entityId, locale);
  if (!current) return { status: "not_found" };
  if (!from.includes(current.contentQualityStatus) || !isValidContentStatusTransition(current.contentQualityStatus, to)) {
    return { status: "invalid_transition" };
  }
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET content_quality_status = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
    .bind(to, new Date().toISOString(), entityType, entityId, locale)
    .run();
  return { status: "ok" };
}

export async function submitForReview(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(entityType, entityId, locale);
  if (!current) return { status: "not_found" };
  if (!canSubmitForReview(current)) return { status: "precondition_failed", reason: "missing_required_content_fields" };
  return setContentQualityStatus(entityType, entityId, locale, ["incomplete"], "review");
}

export async function approveContent(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(entityType, entityId, locale, ["review"], "approved");
}

/** Reviewer sends work back for more changes. */
export async function sendBackToDraft(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(entityType, entityId, locale, ["review"], "incomplete");
}

/** Editor deliberately reopens previously-approved content for changes. Does not affect `publishedAt` — a live page stays live (still gated on `contentQualityStatus === 'approved'`, so it becomes correctly invisible the moment this runs, until re-approved). */
export async function reopenForEdits(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  return setContentQualityStatus(entityType, entityId, locale, ["approved"], "review");
}

export async function publishContent(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(entityType, entityId, locale);
  if (!current) return { status: "not_found" };
  if (!canPublish(current)) return { status: "precondition_failed", reason: "not_approved_or_missing_content" };
  const db = getPublicDb();
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE product_seo_contents SET published_at = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
    .bind(now, now, entityType, entityId, locale)
    .run();
  return { status: "ok" };
}

/** Takes a locale offline without touching `contentQualityStatus` — a quick unpublish/republish cycle does not require re-review. */
export async function unpublishContent(entityType: EditorialEntityType, entityId: string, locale: Locale): Promise<EditorialWriteResult> {
  const current = await getSeoContent(entityType, entityId, locale);
  if (!current) return { status: "not_found" };
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET published_at = NULL, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
    .bind(new Date().toISOString(), entityType, entityId, locale)
    .run();
  return { status: "ok" };
}

export async function setIndexStatus(entityType: EditorialEntityType, entityId: string, locale: Locale, indexStatus: IndexStatus): Promise<EditorialWriteResult> {
  const current = await getSeoContent(entityType, entityId, locale);
  if (!current) return { status: "not_found" };
  const db = getPublicDb();
  await db
    .prepare(`UPDATE product_seo_contents SET index_status = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND locale = ?`)
    .bind(indexStatus, new Date().toISOString(), entityType, entityId, locale)
    .run();
  return { status: "ok" };
}

/**
 * The per-variant master publication switch — independent of any locale's
 * content state. `is_public = false` is a hard kill switch (nothing about
 * this variant is ever public in any locale — neither its own dedicated
 * page, nor its row inside a published template's specification table,
 * docs/CATALOG_PUBLIC_ROUTES.md §Variant visibility); `is_public = true`
 * merely allows each locale's own gate to apply. This column lives on
 * `product_variants` for schema-practical reasons but is website-owned,
 * never written by commercial sync (lib/catalog/sync.ts never sets it —
 * verified by that module's own types).
 */
export async function setVariantPublicationFlag(variantId: string, isPublic: boolean): Promise<EditorialWriteResult> {
  const db = getPublicDb();
  const result = await db
    .prepare(`UPDATE product_variants SET is_public = ?, updated_at = ? WHERE id = ?`)
    .bind(isPublic ? 1 : 0, new Date().toISOString(), variantId)
    .run();
  return result.meta.changes > 0 ? { status: "ok" } : { status: "not_found" };
}

/** Template-level counterpart of `setVariantPublicationFlag` — the master switch for a whole product/template entity, DAR-037. */
export async function setTemplatePublicationFlag(catalogProductId: string, isPublic: boolean): Promise<EditorialWriteResult> {
  const db = getPublicDb();
  const result = await db
    .prepare(`UPDATE catalog_products SET is_public = ?, updated_at = ? WHERE id = ?`)
    .bind(isPublic ? 1 : 0, new Date().toISOString(), catalogProductId)
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
 * rule. This is the dedicated-VARIANT-page exception path
 * (docs/CATALOG_PUBLIC_ROUTES.md §"Variant-level editorial exception") — the
 * site's default, primary indexable page is the TEMPLATE, not the variant;
 * see `getPublishedCatalogTemplateBySlug` below for that path.
 */
export async function getPublishedCatalogProducts(locale: Locale, filters: PublishedCatalogFilters = {}): Promise<PublishedCatalogProduct[]> {
  const db = getPublicDb();
  const conditions = ["v.is_active = 1", "v.is_public = 1", "s.locale = ?", "s.content_quality_status = 'approved'", "s.published_at IS NOT NULL", "s.h1 IS NOT NULL"];
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

  return (result.results ?? []).map((row) => rowToPublishedVariant(row));
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

  return row ? rowToPublishedVariant(row) : null;
}

function rowToPublishedVariant(row: VariantRow & Record<string, unknown>): PublishedCatalogProduct {
  return { variant: mapVariant(row), seo: seoRowFromPrefixedColumns(row) };
}

function seoRowFromPrefixedColumns(row: Record<string, unknown>): ProductSeoContent {
  return mapSeoContent({
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
}

// --- Template-level public reads (the site's primary catalog page granularity — DAR-037) ---

export interface PublishedCatalogTemplate {
  product: CatalogProduct;
  seo: ProductSeoContent;
  /** Count of variants under this template that are commercially active AND explicitly marked public — never the raw total variant count. */
  eligibleVariantCount: number;
}

export type { CatalogFilterInput };

const TEMPLATE_SEO_COLUMNS = `s.id as seo_id, s.entity_type as seo_entity_type, s.entity_id as seo_entity_id, s.locale as seo_locale,
              s.slug as seo_slug, s.h1 as seo_h1, s.intro as seo_intro, s.body_json as seo_body_json,
              s.seo_title as seo_seo_title, s.seo_description as seo_seo_description, s.faq_json as seo_faq_json,
              s.index_status as seo_index_status, s.content_quality_status as seo_content_quality_status,
              s.published_at as seo_published_at, s.updated_at as seo_updated_at`;

/** Turns the pure `buildTemplateFilterConditions` output into parameterized SQL `EXISTS` clauses — only the fixed column set that function returns is ever interpolated, never a caller-supplied string. */
function filterConditions(filters: CatalogFilterInput, params: unknown[]): string[] {
  return buildTemplateFilterConditions(filters).map(({ column, value }) => {
    params.push(value);
    return `EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = cp.id AND pv.is_active = 1 AND pv.is_public = 1 AND pv.${column} = ?)`;
  });
}

/**
 * The single canonical template-level publication-gate fragment — the SQL
 * form of `lib/catalog/editorial.ts#evaluatePublicationEligibility`'s
 * `visible` rule, applied at the template/`entity_type='product'` grain.
 * `listPublishedCatalogTemplates` (the /products listing and, via
 * `getPublishedCatalogTemplateBySlug`, the /products/[slug] detail page)
 * and `listHomepageProductCandidates` (the homepage) both reference this
 * exact array — this task's own §5 "Homepage and Product Detail must depend
 * on the SAME publication rules, not duplicated logic" is enforced by them
 * being literally the same constant, not merely similar-looking SQL.
 */
const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = ["cp.is_active = 1", "cp.is_public = 1", "s.locale = ?", "s.content_quality_status = 'approved'", "s.published_at IS NOT NULL", "s.h1 IS NOT NULL"];

/**
 * The catalog listing's data source: every template with an approved+published
 * `entity_type='product'` row for `locale`, itself commercially active+public.
 * Structurally cannot return a template merely because one of its variants
 * exists — the template's OWN editorial row is the gate
 * (docs/CATALOG_PUBLIC_ROUTES.md §Publication rule).
 */
export async function listPublishedCatalogTemplates(locale: Locale, filters: CatalogFilterInput = {}): Promise<PublishedCatalogTemplate[]> {
  const db = getPublicDb();
  const params: unknown[] = [locale];
  const filterClauses = filterConditions(filters, params);
  const where = [...TEMPLATE_PUBLICATION_WHERE_CONDITIONS, ...filterClauses];

  const result = await db
    .prepare(
      `SELECT cp.*, ${TEMPLATE_SEO_COLUMNS},
              (SELECT COUNT(*) FROM product_variants pv2 WHERE pv2.product_id = cp.id AND pv2.is_active = 1 AND pv2.is_public = 1) as eligible_variant_count
       FROM catalog_products cp
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       WHERE ${where.join(" AND ")}
       ORDER BY cp.commercial_template_name ASC`,
    )
    .bind(...params)
    .all<CatalogProductRow & Record<string, unknown>>();

  return (result.results ?? []).map((row) => ({
    product: mapCatalogProduct(row),
    seo: seoRowFromPrefixedColumns(row),
    eligibleVariantCount: Number(row.eligible_variant_count ?? 0),
  }));
}

export interface PublishedCatalogTemplateDetail {
  product: CatalogProduct;
  seo: ProductSeoContent;
  /** Commercially active AND explicitly public variants under this template — the specification/selector table shown on the page. Never gated on each variant having its own dedicated SEO page. */
  variants: ProductVariant[];
}

export async function getPublishedCatalogTemplateBySlug(locale: Locale, slug: string): Promise<PublishedCatalogTemplateDetail | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(
      `SELECT cp.*, ${TEMPLATE_SEO_COLUMNS}
       FROM catalog_products cp
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       WHERE cp.is_active = 1 AND cp.is_public = 1 AND s.locale = ? AND s.slug = ?
         AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL`,
    )
    .bind(locale, slug)
    .first<CatalogProductRow & Record<string, unknown>>();

  if (!row) return null;

  const variantRows = await db
    .prepare(`SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 AND is_public = 1 ORDER BY commercial_size ASC`)
    .bind(row.id)
    .all<VariantRow>();

  return { product: mapCatalogProduct(row), seo: seoRowFromPrefixedColumns(row), variants: (variantRows.results ?? []).map(mapVariant) };
}

export interface PublishedCatalogTemplateTitle {
  title: string;
  slug: string;
}

/**
 * Minimal published-title+link lookup by `template_xid` — the internal
 * catalog identity is the only thing the homepage price strip
 * (lib/pricing/repository.ts) is allowed to treat as the authoritative
 * public title/link source; a price provider's own `provider_title` is
 * never surfaced (docs/pricing/PRICE_PROVIDER_CONTRACT.md). Same
 * publication gate as `listPublishedCatalogTemplates`/
 * `getPublishedCatalogTemplateBySlug` — deliberately not those functions
 * themselves, which return the full template+variants shape this caller
 * doesn't need.
 */
export async function getPublishedCatalogTemplateTitleByXid(locale: Locale, templateXid: string): Promise<PublishedCatalogTemplateTitle | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(
      `SELECT s.h1 as title, s.slug as slug
       FROM catalog_products cp
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       WHERE cp.is_active = 1 AND cp.is_public = 1 AND cp.template_xid = ? AND s.locale = ?
         AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL`,
    )
    .bind(templateXid, locale)
    .first<{ title: string; slug: string }>();

  return row ? { title: row.title, slug: row.slug } : null;
}

// --- Homepage Product Projection (this task's §4-10, §13-26) ---
// Domain type (`HomepageProductCandidate`) lives in ./types.ts — same
// "types stay in the pure types module" convention `PublicPriceStripItem`
// follows in lib/pricing/types.ts, so a component can `import type` it
// without ever pulling in this file's `cloudflare:workers` dependency.

interface HomepageCandidateRow {
  id: string;
  template_xid: string;
  seo_slug: string;
  seo_h1: string;
  seo_intro: string | null;
  rep_family_code: string | null;
  rep_group_code: string | null;
  hpr_base_priority: number | null;
  hpr_manual_boost: number | null;
  hpr_demand_score: number | null;
}

export interface HomepageProductCandidateOptions {
  limit?: number;
  mode?: HomepageRankingMode;
}

/**
 * The homepage's ONLY product data source (this task's §4-6 Hard Invariant:
 * "A product may not appear as a clickable Homepage Product Card unless its
 * Product Detail route for that exact locale is publication-eligible and
 * resolvable"). Uses the exact same `TEMPLATE_PUBLICATION_WHERE_CONDITIONS`
 * as `listPublishedCatalogTemplates`/`getPublishedCatalogTemplateBySlug` —
 * structurally cannot return a template that `/products/[slug]` would 404
 * on, because both read paths are gated by the identical condition set. A
 * candidate's `slug` is always read from the same `product_seo_contents`
 * row the detail page itself resolves against — never guessed, never a
 * sample-catalog value (this task's own root defect this function exists to
 * fix).
 *
 * Media (`lib/catalog/media-registry.ts`) and ranking
 * (`lib/ranking/score.ts`) are overlays only (this task's §34) — they never
 * influence which templates are eligible, only how the eligible set is
 * illustrated/ordered. Ranking mode defaults safely to `"base"` on a
 * missing/invalid `options.mode` (via `resolveHomepageRankingMode`, already
 * applied by the caller in `app/[locale]/page.tsx` — this function accepts
 * an already-resolved mode rather than resolving `env` itself, keeping it
 * free of any `cloudflare:workers` dependency beyond `getPublicDb`).
 *
 * Locale-specific by construction: `s.locale = ?` means a candidate list for
 * `en` can never contain a `fa`-only slug (this task's §26).
 */
export async function listHomepageProductCandidates(locale: Locale, options: HomepageProductCandidateOptions = {}): Promise<HomepageProductCandidate[]> {
  const db = getPublicDb();
  const limit = options.limit ?? HOMEPAGE_PRODUCT_DISPLAY_COUNT;
  const mode = options.mode ?? "base";
  const where = TEMPLATE_PUBLICATION_WHERE_CONDITIONS;

  const result = await db
    .prepare(
      `SELECT cp.id as id, cp.template_xid as template_xid, s.slug as seo_slug, s.h1 as seo_h1, s.intro as seo_intro,
              (SELECT pv.family_code FROM product_variants pv WHERE pv.product_id = cp.id AND pv.is_active = 1 AND pv.is_public = 1 ORDER BY pv.commercial_name ASC LIMIT 1) as rep_family_code,
              (SELECT pv.group_code FROM product_variants pv WHERE pv.product_id = cp.id AND pv.is_active = 1 AND pv.is_public = 1 ORDER BY pv.commercial_name ASC LIMIT 1) as rep_group_code,
              hpr.base_priority as hpr_base_priority, hpr.manual_boost as hpr_manual_boost, hpr.demand_score as hpr_demand_score
       FROM catalog_products cp
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       LEFT JOIN homepage_product_rank hpr ON hpr.catalog_product_id = cp.id
       WHERE ${where.join(" AND ")}`,
    )
    .bind(locale)
    .all<HomepageCandidateRow>();

  const scored = (result.results ?? []).map((row) => {
    const basePriority = row.hpr_base_priority ?? 0;
    const manualBoost = row.hpr_manual_boost ?? 0;
    const demandScore = row.hpr_demand_score ?? 0;
    const score = computeHomepageScore({ mode, basePriority, demandScore, manualBoost });
    return { row, score };
  });

  const ranked = sortByHomepageScore(scored.map(({ row, score }) => ({ templateXid: row.template_xid, score, row }))).slice(0, limit);

  return ranked.map(({ row, score }, index) => ({
    productId: row.id,
    templateXid: row.template_xid,
    locale,
    slug: row.seo_slug,
    title: row.seo_h1,
    summary: row.seo_intro,
    familyCode: row.rep_family_code,
    groupCode: row.rep_group_code,
    image: resolveCatalogMedia({ templateXid: row.template_xid, groupCode: row.rep_group_code, familyCode: row.rep_family_code }),
    rank: index + 1,
    score,
  }));
}

export interface PublishedLocaleSlug {
  locale: Locale;
  slug: string;
}

/**
 * Which locales actually have a published, indexable-or-not editorial page
 * for this exact template entity — used only to build honest hreflang
 * alternates for a Product/Template detail page (docs/CATALOG_PUBLIC_ROUTES.md
 * §12, this task's own Go-Live Readiness Stage H requirement: "do not create
 * hreflang links to unpublished localized Product pages"). Each locale's
 * *own* slug is returned — never the requesting locale's slug reused across
 * locales, since `product_seo_contents.slug` is independent per `(entity,
 * locale)` row and a future en/ar slug is not guaranteed to match the fa one.
 */
export async function listPublishedLocalesForProduct(entityId: string): Promise<PublishedLocaleSlug[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT locale, slug FROM product_seo_contents
       WHERE entity_type = 'product' AND entity_id = ?
         AND content_quality_status = 'approved' AND published_at IS NOT NULL AND h1 IS NOT NULL AND slug IS NOT NULL`,
    )
    .bind(entityId)
    .all<{ locale: string; slug: string }>();

  return (result.results ?? []).map((row) => ({ locale: row.locale as Locale, slug: row.slug }));
}

export type { CatalogFilterFacets };

/**
 * Filter values drawn ONLY from variants that belong to a currently-published
 * template and are themselves active+public — never from the full 237-row
 * commercial universe. Conditioned on `activeFilters` (Go-Live Readiness
 * catalog-filter audit, see `computeConditionalFacets`'s own header): each
 * dimension's option list only ever contains values that co-occur, in a real
 * published variant row, with every *other* currently-active filter — so
 * combining a link from one dimension with a link from another can never
 * produce a combination with zero real published templates behind it.
 */
export async function getPublicCatalogFilterFacets(locale: Locale, activeFilters: CatalogFilterInput = {}): Promise<CatalogFilterFacets> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT DISTINCT pv.family_code, pv.family_name, pv.group_code, pv.group_name, pv.form_code, pv.form_name, pv.grade_code, pv.grade_name, pv.standard_code, pv.standard_name
       FROM product_variants pv
       JOIN catalog_products cp ON cp.id = pv.product_id
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id AND s.locale = ?
       WHERE cp.is_active = 1 AND cp.is_public = 1 AND pv.is_active = 1 AND pv.is_public = 1
         AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL`,
    )
    .bind(locale)
    .all<{ family_code: string | null; family_name: string | null; group_code: string | null; group_name: string | null; form_code: string | null; form_name: string | null; grade_code: string | null; grade_name: string | null; standard_code: string | null; standard_name: string | null }>();

  const rows: ClassificationRow[] = (result.results ?? []).map((r) => ({
    familyCode: r.family_code,
    familyName: r.family_name,
    groupCode: r.group_code,
    groupName: r.group_name,
    formCode: r.form_code,
    formName: r.form_name,
    gradeCode: r.grade_code,
    gradeName: r.grade_name,
    standardCode: r.standard_code,
    standardName: r.standard_name,
  }));

  return computeConditionalFacets(rows, activeFilters);
}

// --- Sitemap boundary (docs/CATALOG_PUBLIC_ROUTES.md §Sitemap) ---

export interface IndexableCatalogUrl {
  slug: string;
  updatedAt: string;
}

/** Published AND indexable (index_status = 'index') template pages for one locale — the only rows `app/sitemap.ts` may add. Commercial active state alone is never sufficient. */
export async function listIndexableCatalogTemplateSlugs(locale: Locale): Promise<IndexableCatalogUrl[]> {
  const templates = await listPublishedCatalogTemplates(locale);
  return templates.filter((t) => t.seo.indexStatus === "index").map((t) => ({ slug: t.seo.slug, updatedAt: t.seo.updatedAt }));
}

// --- Catalog -> RFQ Variant Preselection (docs/CATALOG_RFQ_INTEGRATION.md) ---

/**
 * The canonical, server-resolved snapshot of a commercial Variant eligible
 * for RFQ preselection — every field is Website-derived from DB_PUBLIC at
 * the moment of resolution; a browser-supplied `product_variant_xid` is
 * never trusted for anything beyond "which row to look up."
 */
export interface RfqCatalogSelection {
  variantXid: string;
  /** Stable template identity — never the mutable slug — for the `product_ref` snapshot column. */
  templateXid: string;
  sku: string;
  /** The variant's own commercial size/spec string, e.g. "Ø16" or "10×1500×6000" — never a raw dimensions_json key. */
  variantSpecLabel: string;
  /** The published template's editorial title for this locale. */
  productLabel: string;
  templateSlug: string;
  categoryCode: string | null;
  categoryLabel: string | null;
  /**
   * `product_variants.group_code` — the stable Product Master classification
   * (e.g. "REBAR", "SHEET_PLATE", "SHS") the Website RFQ Launch UoM policy
   * keys off (`lib/rfq/uom-policy.ts`, docs/RFQ_LAUNCH_UOM_ALIGNMENT.md).
   * Deliberately the "group" level, not "family" (broader, e.g.
   * LONG_PRODUCTS also covers Beams) or "form" (narrower than the policy
   * needs) — the least brittle stable identifier that exactly matches the
   * Odoo-confirmed Launch UoM policy's own product groupings. Never derived
   * from slug/display text.
   */
  groupCode: string | null;
}

/**
 * A Variant is eligible for RFQ preselection under the exact same rule that
 * makes it eligible to appear in its template's public specification table
 * (docs/CATALOG_PUBLIC_ROUTES.md §5) — commercially active, explicitly
 * public, AND belonging to a template that is itself currently
 * published+approved for `locale`. A Variant never needs its own dedicated
 * SEO page to be RFQ-selectable (this task's own "Important Publication
 * Distinction"); it DOES need to belong to a real, currently-live product
 * page — an archived, unpublished, or not-yet-editorially-approved template
 * can never contribute an RFQ-selectable Variant, matching
 * `evaluatePublicationEligibility`'s `visible` rule exactly, just applied to
 * a specific variant xid instead of a slug lookup. Returns `null` for any
 * unknown, malformed, archived, inactive, or not-currently-selectable xid —
 * callers must never fabricate a fallback value on `null` (docs/CATALOG_RFQ_INTEGRATION.md
 * §Invalid/stale XID).
 */
export async function resolveRfqCatalogVariant(variantXid: string, locale: Locale): Promise<RfqCatalogSelection | null> {
  const db = getPublicDb();
  const row = await db
    .prepare(
      `SELECT v.xid, v.sku, v.commercial_size, v.section_size, v.family_code, v.family_name, v.group_code, cp.template_xid, s.h1 as template_h1, s.slug as template_slug
       FROM product_variants v
       JOIN catalog_products cp ON cp.id = v.product_id
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       WHERE v.xid = ? AND v.is_active = 1 AND v.is_public = 1
         AND cp.is_active = 1 AND cp.is_public = 1
         AND s.locale = ? AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL`,
    )
    .bind(variantXid, locale)
    .first<{ xid: string; sku: string; commercial_size: string | null; section_size: string | null; family_code: string | null; family_name: string | null; group_code: string | null; template_xid: string; template_h1: string; template_slug: string }>();

  if (!row) return null;

  return {
    variantXid: row.xid,
    templateXid: row.template_xid,
    sku: row.sku,
    variantSpecLabel: row.commercial_size ?? row.section_size ?? row.sku,
    productLabel: row.template_h1,
    templateSlug: row.template_slug,
    categoryCode: row.family_code,
    categoryLabel: row.family_name,
    groupCode: row.group_code,
  };
}

/**
 * Every RFQ-selectable Catalog Variant for `locale` — the exact same
 * eligibility predicate as `resolveRfqCatalogVariant`, just without the
 * `v.xid = ?` filter (docs/RFQ_MULTI_ITEM_FORM.md "Catalog item UX").
 * Fetched once per page render and shared client-side across every Catalog
 * row's cascading Category -> Product -> Variant selects
 * (`lib/rfq/catalog-selector.ts#groupCatalogItemsForSelector`) — never
 * re-queried per row, and never returns an unpublished/archived/private
 * Variant or price/stock/Supplier data (this read touches only the same
 * columns `resolveRfqCatalogVariant` already exposes).
 */
export async function listRfqSelectableCatalogItems(locale: Locale): Promise<RfqCatalogSelection[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(
      `SELECT v.xid, v.sku, v.commercial_size, v.section_size, v.family_code, v.family_name, v.group_code, cp.template_xid, s.h1 as template_h1, s.slug as template_slug
       FROM product_variants v
       JOIN catalog_products cp ON cp.id = v.product_id
       JOIN product_seo_contents s ON s.entity_type = 'product' AND s.entity_id = cp.id
       WHERE v.is_active = 1 AND v.is_public = 1
         AND cp.is_active = 1 AND cp.is_public = 1
         AND s.locale = ? AND s.content_quality_status = 'approved' AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL
       ORDER BY v.family_name ASC, s.h1 ASC, v.commercial_size ASC`,
    )
    .bind(locale)
    .all<{ xid: string; sku: string; commercial_size: string | null; section_size: string | null; family_code: string | null; family_name: string | null; group_code: string | null; template_xid: string; template_h1: string; template_slug: string }>();

  return (result.results ?? []).map((row) => ({
    variantXid: row.xid,
    templateXid: row.template_xid,
    sku: row.sku,
    variantSpecLabel: row.commercial_size ?? row.section_size ?? row.sku,
    productLabel: row.template_h1,
    templateSlug: row.template_slug,
    categoryCode: row.family_code,
    categoryLabel: row.family_name,
    groupCode: row.group_code,
  }));
}
