# Catalog Editorial / Publication Boundary

**Status:** Active — canonical for the Website-owned editorial/publication layer between DB_PUBLIC commercial catalog data and public Website catalog pages.
**Established:** 2026-08-30 (DOCUMENT_AUDIT_REPORT.md DAR-036).
**Scope:** `lib/catalog/editorial.ts`, `lib/catalog/editorial-repository.ts`. Does not cover pricing, RFQ catalog selection, or Catalog UI — those are separate, later phases.

---

## 1. Ownership boundary

| Domain | Owner | Where it lives | Who may write it |
|---|---|---|---|
| Commercial identity (`xid`, `templateXid`, `sku`), classification (family/group/form/grade/standard), dimensions, nominal weight, UOM display strings, commercial active/archive state | **Odoo** | `product_variants` (all columns except `nameFa`/`slugFa`/`isPublic`) | `lib/catalog/sync.ts` / `sync-runner.ts` only |
| Per-variant master publication switch | **Website** | `product_variants.is_public` | `lib/catalog/editorial-repository.ts#setVariantPublicationFlag` only — never sync |
| Localized title, slug, short/long description, SEO title/description, indexability, content review state, publish/unpublish state | **Website** | `product_seo_contents` (one row per `(entity_type='variant', entity_id, locale)`) | `lib/catalog/editorial-repository.ts` only — sync has zero code path touching this table |
| Internal operational fallback label (`ProductVariant.nameFa`/`slugFa`) | **Website, bootstrapped from Odoo once** | `product_variants.name_fa`/`slug_fa` | Set once at first sync (DAR-034/035); never overwritten by sync again; never used for public display — see §9 |

Commercial sync (`lib/catalog/sync.ts#planCatalogV1Sync`) has no import of, or reference to, `product_seo_contents` or `ProductSeoContent` anywhere in its source — this is a structural guarantee, not just a convention, and is asserted directly in `sync.test.ts` (the commercial update patch's key set never includes `nameFa`/`slugFa`/`isPublic`).

---

## 2. Existing schema audit

No new DB_PUBLIC migration was needed for this phase — `product_seo_contents` (`migrations_public/0001_catalog_schema.sql`, applied to staging/production since DAR-035) already provides every field this phase requires.

| Requested field | Existing field | Notes |
|---|---|---|
| Localized Website title (name_fa/en/ar) | `product_seo_contents.h1` | One row per locale; nullable at the DB level (drafts may have no title yet), required by application logic before `review`/`publish` (§4) |
| Localized slug (slug_fa/en/ar) | `product_seo_contents.slug` | `NOT NULL`; unique per `(slug, locale)` — `uq_product_seo_contents_slug_locale` |
| Short description | `product_seo_contents.intro` | |
| Long/editorial description | `product_seo_contents.body_json` | Structured content blocks, per `01-sources/DATABASE_SCHEMA.md` §5.1 convention |
| SEO title | `product_seo_contents.seo_title` | |
| Meta description | `product_seo_contents.seo_description` | |
| Indexability | `product_seo_contents.index_status` (`index`/`noindex`/`draft`) | Independent of publication — see §5 |
| Editorial review state | `product_seo_contents.content_quality_status` (`incomplete`/`review`/`approved`) | See §3 |
| Publication state | `product_seo_contents.published_at` (nullable timestamp) | `NULL` = not live; a timestamp = live since that moment |
| `is_public` (master switch) | `product_variants.is_public` | Pre-existing (migration 0002); never written by sync |
| `editorial_updated_at` | `product_seo_contents.updated_at` | |
| `needs_editorial_setup` | *(derived, not stored)* | "No `product_seo_contents` row exists for `(entity, locale)`" — a query, not a stored flag; see `lib/catalog/editorial-repository.ts#listVariantsNeedingEditorialSetupForLocale` |
| Editorial ordering (`sort_order`) | *(not present)* | **Deliberately deferred** — no listing UI exists yet to need custom ordering; `catalog_categories.sort_order` already establishes the column-naming precedent for when this is actually needed. Not a migration this phase, per "prefer normalized design only where it provides real value." |

Two tables from `migrations_public/0001` remain structurally present but unused by this design: `catalog_categories` and the attribute EAV tables (`attribute_definitions`/`attribute_values`/`variant_attribute_values`) — the real Odoo API has no independent category/attribute master (DAR-034), so nothing in the editorial workflow references them either.

---

## 3. Editorial state machine

Six conceptual states, expressed as two independent axes rather than one flat enum (this is *why* no new column was needed):

```text
needs_setup  = no product_seo_contents row for (entity, locale)
draft        = row exists, content_quality_status = 'incomplete'
review       = row exists, content_quality_status = 'review'
ready        = row exists, content_quality_status = 'approved', published_at = NULL
published    = row exists, content_quality_status = 'approved', published_at != NULL
unpublished  = row exists, published_at = NULL   (a superset of `draft`/`review`/`ready`;
                the general term for "not currently live", used once a row
                has ever *been* published and was taken down again)
```

`lib/catalog/editorial.ts#describeLifecycleState(seoContent)` computes this from a `ProductSeoContent | null`.

### Transition rules

```text
incomplete --> review     (submitForReview — requires h1 + slug present)
review     --> approved   (approveContent)
review     --> incomplete (sendBackToDraft — reviewer requests changes)
approved   --> review     (reopenForEdits — editor deliberately reopens live content)
```

`incomplete -> approved` directly, and `approved -> incomplete` directly, are **not** valid transitions — content must pass through `review` in both directions. Enforced by `lib/catalog/editorial.ts#isValidContentStatusTransition`, exhaustively unit-tested.

Publishing/unpublishing is a **separate** action from content-status transitions:

```text
publishContent(id, locale)   — requires content_quality_status = 'approved' AND h1/slug present
                                (canPublish); sets published_at = now.
unpublishContent(id, locale) — sets published_at = NULL; does NOT touch content_quality_status.
```

### Answers to the six required questions

1. **Newly synced Odoo product — what editorial state does it enter?** `needs_setup` for every locale — no `product_seo_contents` row is created by sync. `product_variants.is_public` defaults to `0`.
2. **Product with no Website content — can it be public?** No. `evaluatePublicationEligibility` requires a `product_seo_contents` row to exist at all; `needs_setup` is never visible.
3. **Product reviewed but intentionally not public — how represented?** `content_quality_status = 'approved'`, `published_at = NULL` — the `ready` state. Distinct from `published` by design (Stage C requirement).
4. **Published product later edited — does edit auto-unpublish?** **No, by deliberate policy.** `upsertEditorialDraft` never touches `content_quality_status` or `published_at` on update — only an explicit `reopenForEdits`/`unpublishContent` call changes those. This keeps live content stable while an editor works, and puts the "take this offline while I fix it" decision explicitly in the editor's hands rather than as an automatic side effect of typing.
5. **Commercial product archived in Odoo — Website publication state?** `product_variants.is_active` becomes `0` (via sync's existing deactivation path — DAR-034/035, unchanged). `evaluatePublicationEligibility` requires `isActive`, so the product becomes correctly invisible immediately — but `is_public`/`product_seo_contents` are never touched or deleted (sync has no write path to either).
6. **Commercial product reactivated — does it auto-republish?** **No.** `isActive` returning to `1` only removes the `commercial_inactive` block; `is_public` and the per-locale `content_quality_status`/`published_at` are exactly what they were before archiving (sync never writes them), so publication resumes only if it was already `true`/`published` beforehand — satisfying this task's explicit "must NOT automatically restore Website publication without an explicit policy."

---

## 4. Publication eligibility — the single canonical predicate

`lib/catalog/editorial.ts#evaluatePublicationEligibility(variant, seoContent)`:

```text
visible   = variant.isActive
          AND variant.isPublic
          AND seoContent exists
          AND seoContent.contentQualityStatus === 'approved'
          AND seoContent.publishedAt !== null
          AND seoContent.h1 is non-empty AND seoContent.slug is non-empty

indexable = visible AND seoContent.indexStatus === 'index'
```

`indexable` can never be `true` when `visible` is `false` (asserted directly in tests). A product can be `visible` and `noindex` at the same time — a real, intentional combination (e.g., a page kept live for direct/RFQ linking but deliberately excluded from search).

`lib/catalog/editorial-repository.ts#getPublishedCatalogProducts`/`getPublishedCatalogProductBySlug` implement the exact same rule as a SQL `WHERE`/`JOIN` — there is no other code path into `product_variants`/`product_seo_contents` for public consumption. Live-verified against real staging data (DAR-036): a temporary draft was walked through every state (`incomplete` → `review` → `approved` → published), confirmed **excluded** at every state except the final one, confirmed **included** with correct joined fields once published, then fully reverted.

---

## 5. SEO / indexability boundary — four distinct concepts, never one boolean

| Concept | Governed by | Independent of |
|---|---|---|
| **Commercially selectable** (can appear in an RFQ item picker) | `product_variants.is_active` alone | Publication state entirely — an archived-from-RFQ-selection decision has not been made by this phase and is out of scope; today `is_active` is the only commercial gate that exists |
| **Publicly browsable** | `evaluatePublicationEligibility(...).visible` | — |
| **SEO indexable** | `evaluatePublicationEligibility(...).indexable` | Can be `false` while `visible` is `true` |
| **Featured/family landing page** | *(not built)* | `catalog_products` (template-level) can carry its own `product_seo_contents` row (`entity_type = 'product'`, already a valid value in the existing `CHECK` constraint) — a real future extension point, not built in this phase |

**A commercial variant may be RFQ-selectable without ever having an indexable SEO page** — this is why "commercially selectable" is listed as fully independent of the other three. RFQ catalog-selection wiring (a later phase) should key off `is_active` (and, once decided, possibly a narrower RFQ-specific flag), never off `visible`/`indexable`.

---

## 6. Locale publication rules

- FA, EN, AR are independent per `(entity, locale)` rows — publishing FA never requires EN/AR to exist, and vice versa (live-verified: a published FA row while no EN row existed at all correctly returned zero EN-locale results).
- `product_variants.nameFa`/`slugFa` (the Odoo-bootstrapped operational fallback) must never be presented as completed editorial content for any locale, FA included — real editorial publication always requires an actual `product_seo_contents` row, regardless of locale.
- No machine translation is performed or assumed anywhere in this module. An editor (or a future explicit translation workflow) supplies each locale's `h1`/`slug`/etc. independently.

---

## 7. Slug architecture

- Public slug identity lives entirely in `product_seo_contents.slug`, one value per `(entity, locale)`, **never** `product_variants.slug_fa` (that field is the internal Odoo-bootstrapped fallback described in §9 — it is a historical naming artifact from before this phase existed and must not be used as a public route slug going forward).
- Uniqueness enforced at the database level: `uq_product_seo_contents_slug_locale (slug, locale)` — live-verified in this phase (a deliberate conflicting-slug `INSERT` was rejected with `UNIQUE constraint failed`).
- `lib/catalog/editorial.ts#normalizeSlug`/`isValidSlug` provide deterministic ASCII normalization and validation — ASCII-only by design; Persian/Arabic input normalizes to an empty/invalid result (callers must supply an already-transliterated candidate, never raw script — CLAUDE.md "do not fabricate translations" extends to slugs).
- Stable commercial identity (`product_variants.xid`) never appears in the slug and is never required in a public URL.
- No redirect-history table is built in this phase (not required yet), but nothing in this design blocks adding one later — `slug` is a plain mutable column with its own independent unique index, not a primary key, so a future `slug_redirects (entity_type, entity_id, locale, old_slug, redirected_at)` table could be added as a pure additive migration whenever slug-change history is actually needed.
- Reserved-word/route-collision validation (e.g. excluding `contact`, `about`) is deliberately not implemented — the public catalog route architecture itself is not yet decided (§8), so validating against a route structure that doesn't exist yet would be premature.

---

## 8. Variant vs. template SEO granularity — explicitly open

The catalog is variant-centric: **237 variants, 13 templates** (DAR-034/035/036, live-verified, current as of 2026-08-30).

Three options were identified, **none selected in this phase**:

- **A. Variant page per `product_variant_xid`** — 237 potential indexable pages.
- **B. Template/family landing page with variants inside** — 13 potential indexable pages, variants as in-page selectors (e.g. a size/spec table).
- **C. Hybrid by steel family** — some templates get individual variant pages (e.g. distinct grades that matter for SEO), others are grouped.

**This phase deliberately does not decide this** — no route architecture exists yet to decide it against (CLAUDE.md's own "do not implement final UI route architecture if authoritative route/design docs do not yet decide this"). What this phase *does* guarantee: the schema does not force option A. `product_seo_contents.entity_type` already supports `'product'` (template-level) as a first-class value equal to `'variant'` — a template landing page (option B or C) is exactly as structurally supported as a variant page today. Nothing here permanently commits every one of the 237 variants to becoming its own indexable page.

---

## 9. Commercial fallback vs. editorial content — provenance stays distinct

`product_variants.commercialName`/`nameFa`/`slugFa` (bootstrapped once, at first sync, from the Odoo API's `name`/a slugified `sku` — DAR-034/035) are **operational labels**, useful for internal tooling (e.g. an editorial dashboard listing "which variants need setup", or RFQ line-item display) but are **never** read by `evaluatePublicationEligibility`, `getPublishedCatalogProducts`, or any public-facing code path. Only a real `product_seo_contents` row — created and progressed through the state machine by a human editor — can make a product publicly visible. This is what makes it structurally impossible for a fallback label to be mistaken for "completed editorial work."

---

## 10. Current state (2026-08-30, both staging and production DB_PUBLIC)

```text
237 total commercial variants (13 templates)
237 active
0 is_public
0 product_seo_contents rows (any locale, any status)
0 publicly visible
0 indexable
```

No product was auto-published. No fake/marketing content was generated. This is the expected, safe result for this phase — see DOCUMENT_AUDIT_REPORT.md DAR-036 for the full live verification trail (including a temporary, fully-reverted end-to-end lifecycle test against real staging data).

---

## 11. Future editorial operator surface

Not built in this phase, per its own explicit boundary ("do not build a full public/admin CMS", "do not introduce authentication just to complete this phase"). `lib/catalog/editorial-repository.ts` is a real, tested, D1-backed service layer — sufficient for:

- a future internal tool (Cloudflare Access-protected, matching `CLAUDE.md`'s existing admin/authorization direction), or
- a repo-managed/scripted first-launch content pass (a small number of hand-picked variants published deliberately, one at a time, via direct calls into this service layer — no UI required for a first controlled launch), or
- another approved internal surface, decided when this becomes the active work item.

No authentication system was introduced to reach this decision.

---

## 12. API Contract Documentation Gate (carried over, unaffected by this phase)

Two Odoo Public Catalog API documentation/runtime discrepancies remain open (DAR-034):

1. `schedule`/`template_name` fields are present on every live response but undocumented in `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`'s prose/example.
2. The documentation's worked example uses `nominal_weight.kg_branch`; the live API returns `per_branch`.

Neither blocks this phase (no public UI is being built yet) and neither was "fixed" from this repository — Odoo-side artifacts remain the source of truth and must be corrected there. Do not build Product Detail UI around the exact documented shape of `dimensions`/`nominal_weight` until this is resolved at the source; both are already stored as opaque JSON in `product_variants` for exactly this reason (DAR-034).
