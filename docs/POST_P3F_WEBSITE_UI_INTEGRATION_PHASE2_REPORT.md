# POST-P3F — Website UI Integration Phase 2: Editorial Eligibility + Angle/Channel Category

# RESULT

**PASS**, with one explicitly-scoped deferral (RFQ `length_mm`) and one explicitly-scoped
non-change (Persian group/form taxonomy labels), both documented below and both
covered by this task's own "report blocker before implementing workaround" /
"prefer existing architecture" escape hatches.

ANGLE and CHANNEL products (all 19 canonical-only variants synced in POST-P3F
Phase 1: 5 Equal Angle, 7 UPN, 7 UPE) are now publicly eligible on staging
through the **existing, unmodified** Website editorial/publication
architecture. **Zero application code was changed** — the generic
`/products` listing, `/products/{slug}` detail route, product card, spec
table, category filters, header navigation, and RFQ catalog selector all
already handle these templates correctly once real editorial content and
`is_public` flags exist. This was proven by directly investigating the
architecture (`docs/CATALOG_PUBLIC_ROUTES.md`, `docs/CATALOG_EDITORIAL_OPERATIONS.md`)
before writing anything, then reusing the exact tool and workflow the prior
DAR-038 pilot established (`scripts/catalog-editorial.ts`).

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated` (confirmed)
- `PRE_HEAD`: `9c09e8589b6bd4a7f30fcbb521bb257855e4daf6` (the Phase 1 gate commit)
- Working tree at start: clean except `tsconfig.tsbuildinfo` (excluded from commits per standing instruction)
- Confirmed present: `docs/POST_P3F_WEBSITE_LIVE_CANONICAL_CATALOG_SYNC_REPORT.md`, `docs/PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`, `docs/PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md`, backend handoff doc
- Staging D1 reachable (`node scripts/catalog-sync.ts status --env staging` succeeded at pre-flight: 256 rows, clean lease)
- Read in full before any implementation decision: `docs/CATALOG_PUBLIC_ROUTES.md`, `docs/CATALOG_EDITORIAL_OPERATIONS.md`, `lib/catalog/specification-presenter.ts`, `lib/catalog/catalog-filters.ts`, `lib/catalog/group-label-sync.ts` (+ runner), `migrations_public/0009_catalog_group_labels.sql`, `lib/rfq/catalog-preselection.ts`, `lib/rfq/catalog-selector.ts`, `lib/rfq/uom-policy.ts`, `lib/rfq/types.ts`, `components/layout/SiteHeader.tsx`, `lib/catalog/editorial-repository.ts` (public-read section), `app/[locale]/products/**`
- **Process rule honored:** no fork/subagent was used for any staging write, sync, migration, publication, or commit action in this task — every `wrangler d1 execute`, `catalog-sync.ts`, and `catalog-editorial.ts` invocation was run directly by the coordinating session itself.

# EDITORIAL MODEL

Discovered (not invented) from `docs/CATALOG_PUBLIC_ROUTES.md` §1/§5 and `docs/CATALOG_EDITORIAL_OPERATIONS.md`:

- **Hybrid, template-primary model.** The public entity is the *Product Template* (`catalog_products`), not the individual commercial Variant. `product_variants.xid`/SKU are never a route segment.
- **`is_public` is a two-level, independent switch:**
  - `catalog_products.is_public` — master switch for the whole template page.
  - `product_variants.is_public` — per-variant "shown inside the published template's spec table" switch (a variant can be `is_active` for RFQ purposes while still hidden from the public spec table).
- **A template page requires all of:** `catalog_products.is_active AND is_public` **AND** an approved+published `product_seo_contents` row (`entity_type='product'`) for the requested locale with a non-null `h1`/`slug`. Visibility is never inferred from a variant existing or being public.
- **SEO/editorial content is authored per-locale, independently** (`(entity_type, entity_id, locale)`), never auto-translated, never auto-copied between locales.
- Slug/title/meta are mandatory before publication (`canPublish` requires `content_quality_status='approved'` plus non-empty `h1`/`slug`).
- Draft vs. published: `incomplete -> review -> approved` (content) is fully independent of the separate `is_public` master switch and the separate `index_status` (draft/noindex/index) — three orthogonal gates, matching `lib/catalog/editorial.ts`'s state machine exactly.
- Appearance on category page / product list / product detail / sitemap / internal search / header nav / RFQ selector are **all** gated through this same `{is_active, is_public, approved+published SEO row}` condition (`TEMPLATE_PUBLICATION_WHERE_CONDITIONS`, one shared SQL constant reused everywhere — not independently reimplemented per surface).

**No new editorial model was invented.** The existing one is sufficient and was reused verbatim.

# PUBLIC ELIGIBILITY

**Chosen: option C — template landing page + variant rows inside it** (the task's own menu, §2). This is not a new choice made by this task — it is the architecture that already exists and is already proven live (DAR-037/038 pilot: 3 templates, 12/237 variants). No granularity change was made or needed.

Applied to the 3 new templates:
- `catalog_products.is_public = true` for all 3 (`CTMPL-000017` Equal Angle, `CTMPL-000018` UPN, `CTMPL-000019` UPE).
- `product_variants.is_public = true` for **all 19** new variants (5 + 7 + 7) — unlike the original pilot's deliberate partial-publish (4-of-N, to prove the "not all variants" mechanism), this task's goal is full ANGLE/CHANNEL eligibility, so all 19 were published; no size was held back.
- FA `product_seo_contents` rows: `content_quality_status='approved'`, `published_at` set, `index_status='index'` for all 3 templates.

# CATEGORY MAPPING

`classification.group.code`/`classification.form.code` from the Odoo API already flow, unmodified, into `product_variants.group_code`/`form_code` by the existing catalog sync (Phase 1) — confirmed live: `ANGLE`/`EQUAL_ANGLE` (5 rows), `CHANNEL`/`UPN` (7 rows), `CHANNEL`/`UPE` (7 rows).

`lib/catalog/catalog-filters.ts`'s facet computation (`computeConditionalFacets`) is fully generic over whatever `group_code`/`form_code` values exist in published rows — **no hardcoded group allowlist exists anywhere** in the filter/listing/card/detail code path (verified by direct grep before writing anything). Confirmed live after publication: `/products?group=ANGLE` and `/products?group=CHANNEL` both return exactly the expected templates, with zero code change.

# NAVIGATION

`components/layout/SiteHeader.tsx`'s Products dropdown (`listHeaderProductFamilyShortcuts`) already computes its group list generically from whatever groups have at least one public+published row. Confirmed live, before vs. after:

- Before this task's publication: `REBAR, SHEET_PLATE, SHS` only.
- After: `ANGLE, CHANNEL, REBAR, SHEET_PLATE, SHS` — **zero code change**, the new groups simply appeared once real data existed.

No duplicate entries, no broken/empty category link (every group shown has ≥1 real published template behind it, by construction of the shared eligibility gate). No reordering logic exists to violate (ordering is `group_code` ASC, unchanged).

# PRODUCT CARD

**No code change.** `components/products/catalog-template-grid.tsx` has zero group-specific branching (verified by grep). Rendered fields for the 3 new templates (confirmed live): template `h1`, `commercial_size`, classification/form, RFQ CTA. No supplier, offer id, price, availability, MOQ, or `commercial_length_mm` is rendered anywhere in this component for any template — this is a structural property of the component (it doesn't read those fields at all), not something newly guarded here.

Cards currently render **no product photograph** for any of the 13 pre-existing templates either — `resolveCatalogMedia`/`components/products/catalog-template-grid.tsx` are not wired together yet (a pre-existing gap, unrelated to this task; `lib/catalog/media-registry.ts` is currently only consumed by the homepage showcase). Not fixed here — out of this task's scope (`components/products/**` beyond what's needed for the given eligibility work was not touched).

# PRODUCT DETAIL

**No code change.** Verified live for all 3 new templates:

- Equal Angle: dimension keys `{width_mm, height_mm, thickness_mm}` and weight key `{kg_m}` — **all four already existed** in `lib/catalog/specification-presenter.ts`'s `DIMENSION_LABELS`/`WEIGHT_LABELS` dictionaries (reused from RHS/SHS/BEAMS, which share the same key names). Rendered labels confirmed live: عرض (width), ارتفاع (height), ضخامت (thickness), `kg/m`.
- UPN/UPE Channel: dimension keys `{width_mm, height_mm}`, weight `{kg_m}` — same dictionary, same result.
- `section_size: null`, `length_mm` absent, `per_branch` absent for all 19 rows — the presenter's `orderedEntries`/`humanizeUnknownKey` fallback path was not even needed (every key present was already known), and nothing crashed or rendered a raw JSON key.
- Nominal-weight disclaimer (`NOMINAL_WEIGHT_DISCLAIMER`) renders correctly, unchanged.
- `web_thickness_mm`/`flange_thickness_mm` (deferred D2 per the task's own note) are correctly absent from the live API payload and were not fabricated or reconstructed — the presenter simply never receives those keys, so nothing needed to be done to "omit them cleanly."

# COMMERCIAL LENGTH UX — DEFERRED (explicit blocker, not implemented)

**Finding:** `length_mm` does not exist anywhere in `lib/rfq/` today — not in `RfqItemRecord`, not in `lib/rfq/validation.ts`, not in the RFQ item form UI, not in the D1 `rfq_items` schema, not in the outbound Odoo RFQ payload builder (verified: `grep -rl length_mm lib/` matches only catalog *dimension-data* files, never anything RFQ-side). The Phase 1 report's "`RFQ_LENGTH_MM_SUPPORTED: YES`" referred to the **Odoo-side backend contract** (`ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`'s RFQ item allow-list already including `length_mm` as an accepted optional key) — it does not mean the Website's own RFQ pipeline has any plumbing for it yet.

Building real end-to-end support (D1 migration for a new nullable column, `RfqItemRecord`/`lib/rfq/service.ts`/repository changes, a new UI input on the RFQ multi-item form, and wiring it into the Odoo payload builder) is materially larger than "the smallest complete change" this task's own scope discipline calls for, and touches the live, already-tested RFQ submission pipeline (1286 passing tests, zero of which currently exercise this field). Per this task's own explicit instruction ("If current form cannot support length_mm safely: report blocker before implementing workaround"):

**Reported as a blocker, not implemented.** No workaround (e.g. stuffing a length into `description`/`sizeText` as free text) was applied either, since that would misrepresent structured data as unstructured and could not be safely reversed later without a real migration. This is a clean, scoped, future task: "RFQ optional length_mm field, full stack."

# RFQ INTEGRATION

Verified live via the real `/request` page's embedded catalog-selector data (`lib/rfq/catalog-selector.ts` output, unchanged code):

- All 19 Angle/Channel variants present with `variantXid: "CVAR-…"` (e.g. `CVAR-000242`), never a legacy XID or integer id.
- Each carries `groupCode: "ANGLE"` / `"CHANNEL"`, which the client-side unit selector resolves against `LAUNCH_GROUP_UOM_POLICY` (unchanged from Phase 1: `["kg","ton","meter"]`, no `branch`).
- `product-detail RFQ entry` and the `general RFQ catalog selector` are **the same one data source** (`listRfqSelectableCatalogItems`) — there is no second, divergent code path to separately verify.
- `supplier_offer_id`/ORM integer id/legacy XID: structurally impossible to emit — `CatalogSelectionForRecord`/`RfqItemRecord` simply have no such field anywhere in the type.

# EMPTY PRICE BEHAVIOR

No price/stock/availability field exists on `catalog_products`/`product_variants` at all (`is_price_public` is a flag only, unchanged). Confirmed live: `isPricePublic:false` on every one of the 19 rows' serialized data; zero price/currency/stock string anywhere in the rendered detail-page HTML (full-text checked). RFQ CTA (existing `ارسال فاکتور یا لیست خرید`, linking to `/request`) renders identically to the 3 pre-existing pilot templates — no "out of stock" or fabricated delivery text anywhere.

# SEO / EDITORIAL

**Content authored** (`scripts/pilot/staging-p2-angle-channel.fa.json`, committed — mirrors the DAR-038 pilot's own committed, reviewable batch-file pattern):

| Template | Slug | H1 | Facts used |
|---|---|---|---|
| `CTMPL-000017` | `equal-angle` | نبشی مساوی‌الاضلاع | EN 10056-1; size range 50×50×5 to 100×100×10 mm (read live from all 5 variants) |
| `CTMPL-000018` | `channel-upn` | ناودانی UPN | EN 10365; UPN 80 to UPN 200 (read live from all 7 variants) |
| `CTMPL-000019` | `channel-upe` | ناودانی UPE | EN 10365; UPE 80 to UPE 200 (read live from all 7 variants) |

Every number/standard in the copy was read directly from live DB_PUBLIC/Odoo data before writing — no price, stock, delivery, or certification claim anywhere (verified by full-text search of the batch file and the rendered pages). FA is the only locale populated, per this task's own "do not delay FA solely because EN/AR aren't ready" instruction and matching the DAR-038 precedent exactly. Slugs are Website-owned, human-readable, and do not include `CVAR`/`CTMPL` in the URL — matching existing slug policy (`equal-angle`, `channel-upn`, `channel-upe`; no collision with the 3 existing pilot slugs, verified).

**Group/form taxonomy labels — deliberately NOT hardcoded, a real finding, not an oversight:**

The task requested specific Persian category labels (نبشی/ناودانی/نبشی مساوی/ناودانی UPN/ناودانی UPE) for the **group/form facet display** (as distinct from the per-template editorial H1s above, which *were* authored). Before adding these, the existing content-governance mechanism was checked first, per this task's own "do not hardcode random translations if locale dictionaries/content tables already define how translations are managed" instruction:

- `migrations_public/0009_catalog_group_labels.sql`'s own header comment explicitly states this table exists specifically to avoid "a Header-owned or frontend-hardcoded translation map" and is "populated only by a real sync against the live Odoo Public Catalog API" (`lib/catalog/group-label-sync.ts`) — never seeded manually.
- Live-tested directly: `GET /api/v1/catalog/products?locale=fa&group=REBAR` (an existing, previously-published group) returns `"name":"Rebar"` — English — identically to `locale=en`/`locale=ar`. The same is true for `ANGLE`/`CHANNEL`. **This is not specific to the new groups** — Odoo's classification-name endpoint currently returns identical English text regardless of the requested locale, for every group, old and new alike.
- `catalog_group_labels` is currently empty on staging (confirmed: `SELECT * FROM catalog_group_labels` → 0 rows) — the sync has never run against staging (it's wired only to the production Cron, and staging's cron list is deliberately empty per `wrangler.jsonc`).
- **No separate form-level (`form_code`) translation mechanism exists at all** in the current schema — `form_name` is always the raw Odoo-sourced value, for every group.

**Decision:** left `group_name`/`form_name` exactly as the existing sync already populates them (currently English, e.g. "Angle"/"Channel"/"Equal Angle"/"UPN"/"UPE"), identically to how all 5 pre-existing groups already render. Hardcoding Persian text for only these two groups would have (a) violated the schema's own explicit anti-hardcoding design intent, and (b) created a new, worse inconsistency — ANGLE/CHANNEL in Persian while REBAR/SHEET_PLATE/SHS stay in English on the same page — rather than fixing the real, pre-existing, sitewide gap. **Flagged under "Remaining Deferred Items"** as the correct place to fix this, for every group at once, not just two.

# STAGING PUBLICATION

Controlled, staged rollout, staging only — full command transcript (all real, run directly, no subagent):

```
node scripts/catalog-editorial.ts batch scripts/pilot/staging-p2-angle-channel.fa.json --env staging
node scripts/catalog-editorial.ts mark-review <xid> --locale fa --env staging   # x3
node scripts/catalog-editorial.ts approve <xid> --locale fa --env staging       # x3
node scripts/catalog-editorial.ts publish <xid> --locale fa --env staging       # x3
node scripts/catalog-editorial.ts set-public <xid> --env staging                # x3
node scripts/catalog-editorial.ts set-index <xid> --locale fa --status index --env staging   # x3
node scripts/catalog-editorial.ts set-variant-public <variant-xid> --env staging             # x19 (all Angle/Channel variants)
```

Before applying to staging, the exact same eligibility and rendering behavior was first proven against a **local D1 mirror** (real live-Odoo data replayed via `full --env local`, then the identical command sequence replayed against `--env local`) and validated through a real `vinext dev` server — matching the DAR-038 precedent's own methodology, since real remote staging D1 still cannot be reached from local dev (unchanged constraint, DAR-035).

Production `DB_PUBLIC` was never touched (no `--env production` command was ever issued in this task).

# FA / EN / AR

**FA: PASS.** Live-verified via `vinext dev` against the local mirror (identical published state to staging):
- `/products` (redirects `/fa/products` → `/products`, the site's existing unprefixed-default-locale convention, unchanged): lists all 6 published templates including the 3 new ones, correct Persian `h1` text.
- `/products/equal-angle`, `/products/channel-upn`, `/products/channel-upe`: all `200`, correct `<title>`, `robots: index, follow`, correct canonical URL, correct spec table (5/7/7 rows respectively), nominal-weight disclaimer present, zero price/stock text, no `branch` UOM text anywhere.
- `dir="rtl" lang="fa"` correctly set on `<html>`.

**EN: PASS (correctly empty).** `/en/products` returns `200` with none of the 3 new slugs present (no `en` `product_seo_contents` row exists yet — by design, not a bug). `/en/products/equal-angle` correctly returns `404` (does not leak the FA-only content under the EN path).

**AR: PASS (correctly empty).** Same result as EN — `/ar/products` shows none of the 3 new templates.

**SEO_SLUGS_UNIQUE: YES** — verified via direct query (`GROUP BY slug, locale HAVING COUNT(*) > 1` → 0 rows) both immediately after publication and again after the sync retries below.

# ACCESSIBILITY

- Single `<h1>` per detail page (confirmed for all 3), heading hierarchy otherwise unchanged from the existing template (this task added zero new headings/components).
- `dir="rtl"` correctly applied site-wide on the FA pages that were checked.
- RFQ CTA is a real `<a href="/request">` link (not an inaccessible clickable `<div>`) — pre-existing, unchanged component.
- No raw enum code (`ANGLE`/`EQUAL_ANGLE`/etc.) rendered as user-facing text anywhere — confirmed by grepping the rendered HTML; classification codes only ever surface through their `name` field (currently English per the SEO/Editorial section above) or through the authored FA `h1`.
- No CVAR/CTMPL identifier rendered as a user-facing title anywhere (confirmed: only appears inside the RFQ selector's non-visible JSON data payload, exactly as designed).
- No new form, image, or interactive component was introduced by this task, so no new accessibility surface exists beyond what the pre-existing, already-tested components already cover.

# RESPONSIVE

No new component and no new CSS were written — the 3 new templates render through the exact same `catalog-template-grid.tsx`/`variant-spec-table.tsx`/detail-page layout the 3 pre-existing pilot templates already use, which are covered by the project's existing responsive design system. A dedicated new responsive audit was not required and was not performed, since there is no new responsive surface to audit; this was confirmed structurally (no new component files, verified via `git status`/`git diff --stat` after all editorial-CLI writes) rather than by re-testing viewport breakpoints that were not touched.

# STAGING DATA INTEGRITY

Before vs. after this task's D1 writes (staging, `ahanassa-public-staging`):

| Metric | Before this task | After |
|---|---|---|
| `catalog_products` | 16 | 16 (unchanged — editorial content added, no new template row) |
| `product_variants` | 256 | 256 (unchanged) |
| `product_seo_contents` | 3 | 6 (+3, exactly the 3 new templates' FA rows) |
| Duplicate `xid` | 0 | 0 |
| Duplicate `template_xid` | 0 | 0 |
| Duplicate `sku` | 0 | 0 |
| Duplicate `slug` (per locale) | 0 | 0 |
| Orphan variants | 0 | 0 |
| Canonical internal IDs | — | unchanged (only `product_seo_contents` rows were inserted; no `product_variants`/`catalog_products` row was replaced) |

**Two operational incidents occurred while re-running the staging catalog sync** (done deliberately, to prove editorial survival — see "Sync Idempotency" below), both the same transient `wrangler`↔Cloudflare D1 "fetch failed" network condition already flagged as a minor hardening item in the Phase 1 report. Both times: `consecutive_failure_count` and `last_failure_reason_code` were recorded correctly, the lease was released cleanly, and a direct read confirmed **zero data loss and zero editorial-content change** at every step — the sync's per-row SQL statements never touch `product_seo_contents` (structurally true, not merely observed: no builder in `lib/catalog/sync-sql.ts` or `scripts/catalog-sync.ts` references that table). Each retry safely resumed via the sync's own diff-based planning; no manual row edit or workaround was used.

# SYNC IDEMPOTENCY

After editorial publication, the full catalog sync was re-run against staging until reaching a clean state, then run one additional time as the idempotency proof:

```
Plan: toCreate=0 toUpdate=0 toDeactivate=0 unchanged=256
Applied: created=0 updated=0 deactivated=0
```

`product_seo_contents` for the 3 new templates verified **byte-identical** (`entity_id`/`slug`/`h1`/`published_at`) before the sync retries and after — editorial state fully survived. **Editorial state surviving a real catalog sync is now proven, not merely assumed by schema design.**

(Note: an earlier re-sync attempt, run purely to exercise this idempotency proof, initially showed `toUpdate=256`/`177`/`175` across three attempts rather than an immediate `unchanged=256` — this reflects Odoo genuinely re-touching `catalog_updated_at` on existing rows between the Phase 1 sync and this task, an upstream/external timing artifact, not a Website-side defect: the applied SQL only ever rewrote `product_variants`' own commercial columns, verified to already hold the same values, never `product_seo_contents`.)

# TESTS

`npm test`: **1286/1286 passing, 0 failed** — identical to the pre-task baseline (no test file and no source file was changed by this task).

# BUILD

- `npx tsc --noEmit`: clean (exit 0).
- `npm run build` (`vinext build`): clean (exit 0), same route list as Phase 1 (no new route was added — `/products`/`/products/[slug]` already existed).

# REMAINING DEFERRED ITEMS

1. **RFQ optional `length_mm` field** — no plumbing exists anywhere in `lib/rfq/` today (type, validation, D1 column, UI input, Odoo payload). Explicitly reported as a blocker rather than force-implemented or worked around (see "Commercial Length UX" above). Next task: a dedicated, full-stack, tested addition.
2. **Group/form taxonomy Persian labels** — not hardcoded for ANGLE/CHANNEL specifically, because doing so would create a new inconsistency (these two groups in Persian, the other five still in English) rather than fix the real, sitewide, pre-existing gap. The real fix is either (a) Odoo's classification-name endpoint actually resolving `locale=fa` differently from `locale=en` (currently it does not, for any group — verified live), which the existing `group-label-sync` pipeline would then pick up automatically the next time it runs, or (b) a deliberate content-governance decision to seed `catalog_group_labels` for all groups via a reviewed process. Neither is an engineering blocker for *this* task's actual goal (making ANGLE/CHANNEL products themselves visible and RFQ-able), which is fully met.
3. **EN/AR editorial content** for the 3 new templates — not written, matching the same "FA first, don't delay for EN/AR" precedent the original pilot established. A future task can add `edit`/`batch` entries for `en`/`ar` without any schema or code change.
4. **Product photography** for ANGLE/CHANNEL — correctly falls through to the generic placeholder path per the existing deferred-media policy (no real photo exists, none was invented) — moot for `/products` today since card/detail images aren't wired in for any group yet (a separate, pre-existing gap, not introduced or touched here).

# NEXT PHASE

**RFQ length_mm field (full stack)** and **EN/AR editorial content authoring for Equal Angle / UPN / UPE**, in either order — both are now unblocked, independent follow-ups; neither depends on further catalog-sync or identity work.

# GIT STATE

- `PRE_HEAD`: `9c09e8589b6bd4a7f30fcbb521bb257855e4daf6`
- `IMPLEMENTATION_COMMIT`: `74225cc` — `content: publish Equal Angle / UPN / UPE editorial content (staging)` (adds `scripts/pilot/staging-p2-angle-channel.fa.json` only)
- `REPORT_COMMIT`: recorded in `REPORT_BUNDLE_MANIFEST.txt` after this report is committed (separate commit, per this task's own instruction to commit implementation and documentation separately)
- No file under `01-sources/`, `logo/`, `design-reference/`, or any Odoo repository was touched.
- No application/component/route source file was changed — `git diff --stat` against `PRE_HEAD` for every path under `app/`, `components/`, `lib/` is empty.
- `tsconfig.tsbuildinfo` excluded from both commits, per standing instruction.
- **Real, durable state change:** `ahanassa-public-staging` D1 now has `product_seo_contents` = 6 (was 3) and 22 rows total across `catalog_products`/`product_variants` marked `is_public=true` for Angle/Channel (3 templates + 19 variants, was 0) — a real, shared, persistent staging environment change, and the intended, in-scope outcome of this task.
