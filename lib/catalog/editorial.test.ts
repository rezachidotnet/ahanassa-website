import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPublish,
  canSubmitForReview,
  describeLifecycleState,
  evaluatePublicationEligibility,
  isValidContentStatusTransition,
  isValidSlug,
  normalizeSlug,
} from "./editorial.ts";
import type { ProductSeoContent } from "./types.ts";

const now = "2026-08-30T00:00:00.000Z";

function seoContent(overrides: Partial<ProductSeoContent> = {}): ProductSeoContent {
  return {
    id: "seo_1",
    entityType: "variant",
    entityId: "var_1",
    locale: "fa",
    slug: "rebar-16",
    h1: "میلگرد آجدار ۱۶",
    intro: null,
    bodyJson: null,
    seoTitle: null,
    seoDescription: null,
    faqJson: null,
    indexStatus: "draft",
    contentQualityStatus: "incomplete",
    publishedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

const activeVariant = { isActive: true, isPublic: true };

// --- lifecycle state description ---

test("describeLifecycleState: no row -> needs_setup", () => {
  assert.equal(describeLifecycleState(null), "needs_setup");
});

test("describeLifecycleState: incomplete row -> draft", () => {
  assert.equal(describeLifecycleState(seoContent({ contentQualityStatus: "incomplete" })), "draft");
});

test("describeLifecycleState: review row -> review", () => {
  assert.equal(describeLifecycleState(seoContent({ contentQualityStatus: "review" })), "review");
});

test("describeLifecycleState: approved, not published -> ready", () => {
  assert.equal(describeLifecycleState(seoContent({ contentQualityStatus: "approved", publishedAt: null })), "ready");
});

test("describeLifecycleState: approved and published -> published", () => {
  assert.equal(describeLifecycleState(seoContent({ contentQualityStatus: "approved", publishedAt: now })), "published");
});

test("describeLifecycleState: published_at set overrides content status classification (published wins)", () => {
  // Defensive case: publishedAt should never be set on non-approved content
  // via the service API, but the predicate itself must still classify
  // consistently if it ever happens.
  assert.equal(describeLifecycleState(seoContent({ contentQualityStatus: "review", publishedAt: now })), "published");
});

// --- content status transitions ---

test("isValidContentStatusTransition allows incomplete -> review", () => {
  assert.equal(isValidContentStatusTransition("incomplete", "review"), true);
});

test("isValidContentStatusTransition allows review -> approved", () => {
  assert.equal(isValidContentStatusTransition("review", "approved"), true);
});

test("isValidContentStatusTransition allows review -> incomplete (send back)", () => {
  assert.equal(isValidContentStatusTransition("review", "incomplete"), true);
});

test("isValidContentStatusTransition allows approved -> review (reopen for edits)", () => {
  assert.equal(isValidContentStatusTransition("approved", "review"), true);
});

test("isValidContentStatusTransition rejects incomplete -> approved directly", () => {
  assert.equal(isValidContentStatusTransition("incomplete", "approved"), false);
});

test("isValidContentStatusTransition rejects approved -> incomplete directly", () => {
  assert.equal(isValidContentStatusTransition("approved", "incomplete"), false);
});

test("isValidContentStatusTransition rejects a same-state no-op transition", () => {
  assert.equal(isValidContentStatusTransition("review", "review"), false);
});

// --- review/publish preconditions ---

test("canSubmitForReview requires both h1 and slug", () => {
  assert.equal(canSubmitForReview({ h1: "Title", slug: "slug" }), true);
  assert.equal(canSubmitForReview({ h1: null, slug: "slug" }), false);
  assert.equal(canSubmitForReview({ h1: "Title", slug: "" }), false);
  assert.equal(canSubmitForReview({ h1: "   ", slug: "slug" }), false);
});

test("canPublish requires approved status AND minimum content", () => {
  assert.equal(canPublish({ h1: "Title", slug: "slug", contentQualityStatus: "approved" }), true);
  assert.equal(canPublish({ h1: "Title", slug: "slug", contentQualityStatus: "review" }), false);
  assert.equal(canPublish({ h1: null, slug: "slug", contentQualityStatus: "approved" }), false);
});

// --- publication eligibility (the canonical predicate) ---

test("evaluatePublicationEligibility: fully eligible variant + approved+published content is visible and indexable", () => {
  const result = evaluatePublicationEligibility(activeVariant, seoContent({ contentQualityStatus: "approved", publishedAt: now, indexStatus: "index" }));
  assert.equal(result.visible, true);
  assert.equal(result.indexable, true);
  assert.deepEqual(result.reasons, []);
});

test("evaluatePublicationEligibility: visible but noindex is a distinct, valid combination", () => {
  const result = evaluatePublicationEligibility(activeVariant, seoContent({ contentQualityStatus: "approved", publishedAt: now, indexStatus: "noindex" }));
  assert.equal(result.visible, true);
  assert.equal(result.indexable, false);
});

test("evaluatePublicationEligibility: indexable is never true when not visible, even if indexStatus is 'index'", () => {
  const result = evaluatePublicationEligibility({ isActive: true, isPublic: false }, seoContent({ contentQualityStatus: "approved", publishedAt: now, indexStatus: "index" }));
  assert.equal(result.visible, false);
  assert.equal(result.indexable, false);
});

test("evaluatePublicationEligibility: commercially inactive (archived) variant is never visible regardless of content", () => {
  const result = evaluatePublicationEligibility({ isActive: false, isPublic: true }, seoContent({ contentQualityStatus: "approved", publishedAt: now }));
  assert.equal(result.visible, false);
  assert.ok(result.reasons.includes("commercial_inactive"));
});

test("evaluatePublicationEligibility: commercial is_public=false blocks visibility even with perfect content", () => {
  const result = evaluatePublicationEligibility({ isActive: true, isPublic: false }, seoContent({ contentQualityStatus: "approved", publishedAt: now }));
  assert.equal(result.visible, false);
  assert.ok(result.reasons.includes("commercial_not_public"));
});

test("evaluatePublicationEligibility: no editorial content for the locale at all is never visible", () => {
  const result = evaluatePublicationEligibility(activeVariant, null);
  assert.equal(result.visible, false);
  assert.deepEqual(result.reasons, ["no_editorial_content_for_locale"]);
});

test("evaluatePublicationEligibility: approved but not yet published ('ready') is not visible", () => {
  const result = evaluatePublicationEligibility(activeVariant, seoContent({ contentQualityStatus: "approved", publishedAt: null }));
  assert.equal(result.visible, false);
  assert.ok(result.reasons.includes("not_published"));
});

test("evaluatePublicationEligibility: review-stage content (not yet approved) is not visible even with a slug/title set", () => {
  const result = evaluatePublicationEligibility(activeVariant, seoContent({ contentQualityStatus: "review", publishedAt: null }));
  assert.equal(result.visible, false);
  assert.ok(result.reasons.includes("content_not_approved"));
});

test("evaluatePublicationEligibility: this locale not ready does not imply another locale is affected (pure function, per-call)", () => {
  const faResult = evaluatePublicationEligibility(activeVariant, seoContent({ locale: "fa", contentQualityStatus: "approved", publishedAt: now }));
  const enResult = evaluatePublicationEligibility(activeVariant, null); // no EN row created yet
  assert.equal(faResult.visible, true);
  assert.equal(enResult.visible, false);
});

// --- slug normalization/validation ---

test("normalizeSlug lowercases and hyphenates", () => {
  assert.equal(normalizeSlug("Ribbed Rebar 16mm"), "ribbed-rebar-16mm");
});

test("normalizeSlug collapses repeated separators and trims edges", () => {
  assert.equal(normalizeSlug("  --Rebar   16--  "), "rebar-16");
});

test("normalizeSlug never leaves non-ASCII characters (Persian input becomes empty, not garbage)", () => {
  const result = normalizeSlug("میلگرد");
  assert.equal(isValidSlug(result), false); // caller must supply a transliterated candidate, not raw Persian
});

test("isValidSlug accepts a normalized slug", () => {
  assert.equal(isValidSlug("ribbed-rebar-16mm"), true);
});

test("isValidSlug rejects empty, uppercase, spaces, and leading/trailing hyphens", () => {
  assert.equal(isValidSlug(""), false);
  assert.equal(isValidSlug("Rebar"), false);
  assert.equal(isValidSlug("re bar"), false);
  assert.equal(isValidSlug("-rebar"), false);
  assert.equal(isValidSlug("rebar-"), false);
  assert.equal(isValidSlug("rebar--16"), false);
});
