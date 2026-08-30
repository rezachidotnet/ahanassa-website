import type { ContentQualityStatus, ProductSeoContent, ProductVariant } from "./types";

/**
 * Website Editorial / Publication domain — pure functions only (no D1, no
 * network). DOCUMENT_AUDIT_REPORT.md DAR-036,
 * docs/CATALOG_EDITORIAL_PUBLICATION.md.
 *
 * Ownership boundary (restated, this is the file that enforces it):
 *   Odoo owns    — everything on `ProductVariant` except `nameFa`/`slugFa`
 *                  (commercial identity, classification, dimensions, UOM
 *                  strings, `isActive`). Commercial sync (lib/catalog/sync.ts)
 *                  never writes `ProductSeoContent`.
 *   Website owns — `ProductVariant.isPublic` (the per-variant master
 *                  publication switch — schema-adjacent to Odoo data for
 *                  practical reasons, but never written by sync) and every
 *                  field on `ProductSeoContent` (one row per (entity,
 *                  locale) — title, slug, descriptions, SEO fields,
 *                  `indexStatus`, `contentQualityStatus`, `publishedAt`).
 *
 * No new DB_PUBLIC schema was needed for this phase — `product_seo_contents`
 * (migrations_public/0001_catalog_schema.sql) already has every field this
 * module requires; see docs/CATALOG_EDITORIAL_PUBLICATION.md "Existing
 * schema audit" for the full field-by-field mapping.
 */

// ---------------------------------------------------------------------------
// Editorial state machine
// ---------------------------------------------------------------------------

/**
 * The six conceptual states this task asked for map onto the existing
 * schema without a new enum:
 *
 *   needs_setup  = no `product_seo_contents` row exists for (entity, locale)
 *   draft        = row exists, `contentQualityStatus = 'incomplete'`
 *   review       = row exists, `contentQualityStatus = 'review'`
 *   ready        = row exists, `contentQualityStatus = 'approved'`, `publishedAt = null`
 *   published    = row exists, `contentQualityStatus = 'approved'`, `publishedAt != null`
 *   unpublished  = row exists, any `contentQualityStatus`, `publishedAt = null`
 *                  (a `ready` row IS a specific case of `unpublished` — both
 *                  mean "not currently live"; `unpublished` is the general
 *                  term used once a row has ever *been* published and was
 *                  taken down again)
 *
 * This is deliberately two independent axes (content readiness x live/not
 * live), not one flat enum — it is what lets Stage B Q3 ("reviewed but
 * intentionally not public") and Q4 ("published, then edited") both have a
 * clean answer without inventing extra states.
 */
export type EditorialLifecycleState = "needs_setup" | "draft" | "review" | "ready" | "published" | "unpublished";

export function describeLifecycleState(seoContent: ProductSeoContent | null): EditorialLifecycleState {
  if (!seoContent) return "needs_setup";
  if (seoContent.publishedAt !== null) return "published";
  if (seoContent.contentQualityStatus === "approved") return "ready";
  return seoContent.contentQualityStatus === "review" ? "review" : "draft";
}

/**
 * Valid `contentQualityStatus` transitions. `incomplete -> approved` is
 * deliberately not allowed directly — content must pass through `review`
 * (Stage J "enforce valid state transitions"). Backward transitions
 * (`review -> incomplete`, `approved -> review`) are allowed — a reviewer
 * sending work back, or an editor deliberately reopening approved content
 * for changes, are both legitimate, common operations.
 */
const VALID_CONTENT_STATUS_TRANSITIONS: Record<ContentQualityStatus, ContentQualityStatus[]> = {
  incomplete: ["review"],
  review: ["incomplete", "approved"],
  approved: ["review"],
};

export function isValidContentStatusTransition(from: ContentQualityStatus, to: ContentQualityStatus): boolean {
  if (from === to) return false;
  return VALID_CONTENT_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Minimum fields required before content may move `incomplete -> review`
 * (Stage J "Publication Preconditions" for the review step specifically —
 * publication itself has its own, stricter precondition, see
 * `evaluatePublicationEligibility`/`canPublish` below). Long description is
 * deliberately not required — CLAUDE.md "do not fabricate unnecessary
 * blockers".
 */
export function canSubmitForReview(seoContent: Pick<ProductSeoContent, "h1" | "slug">): boolean {
  return Boolean(seoContent.h1 && seoContent.h1.trim().length > 0 && seoContent.slug && seoContent.slug.trim().length > 0);
}

/**
 * Publication precondition — stricter than "approved": requires the
 * content to actually still satisfy `canSubmitForReview`'s minimum-content
 * bar at the moment of publishing too (defense in depth against an approved
 * row somehow losing its title through a bug, not just at submit time).
 */
export function canPublish(seoContent: Pick<ProductSeoContent, "h1" | "slug" | "contentQualityStatus">): boolean {
  return seoContent.contentQualityStatus === "approved" && canSubmitForReview(seoContent);
}

// ---------------------------------------------------------------------------
// Publication eligibility — the single canonical predicate (Stage C)
// ---------------------------------------------------------------------------

export interface PublicationEligibility {
  /** True only when the product should render on a public page for this locale. */
  visible: boolean;
  /** True only when a visible page should additionally be indexable (sitemap/robots index). Never true when `visible` is false. */
  indexable: boolean;
  /** Machine-readable reasons `visible`/`indexable` are false — for editorial tooling, never shown to end users. */
  reasons: string[];
}

type EligibilityVariant = Pick<ProductVariant, "isActive" | "isPublic">;
type EligibilitySeoContent = Pick<ProductSeoContent, "contentQualityStatus" | "publishedAt" | "h1" | "slug" | "indexStatus">;

/**
 * The one place "is this publicly visible" is decided (CLAUDE.md "Do NOT
 * scatter logic... Create a single reusable publication eligibility
 * function"). Both the repository's SQL `WHERE` clauses (lib/catalog/editorial-repository.ts)
 * and any future in-app check must agree with this function's logic —
 * tests in editorial.test.ts pin the exact rule set.
 */
export function evaluatePublicationEligibility(variant: EligibilityVariant, seoContent: EligibilitySeoContent | null): PublicationEligibility {
  const reasons: string[] = [];

  if (!variant.isActive) reasons.push("commercial_inactive");
  if (!variant.isPublic) reasons.push("commercial_not_public");
  if (!seoContent) reasons.push("no_editorial_content_for_locale");
  else {
    if (seoContent.contentQualityStatus !== "approved") reasons.push("content_not_approved");
    if (seoContent.publishedAt === null) reasons.push("not_published");
    if (!canSubmitForReview(seoContent)) reasons.push("missing_required_content_fields");
  }

  const visible = reasons.length === 0;
  const indexable = visible && seoContent?.indexStatus === "index";

  return { visible, indexable, reasons };
}

// ---------------------------------------------------------------------------
// Slug validation (Stage E)
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 200;

/** Deterministic normalization — lowercase, ASCII-safe, hyphen-separated. Never derives from a locale's own script (CLAUDE.md "no invented translation"); callers pass whatever candidate text they already have (e.g. a transliterated title an editor typed). */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}
