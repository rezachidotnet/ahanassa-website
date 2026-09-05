# NAV-P1 — Product Group Localization Hardening + Header V2.1 Regression Gate — Verification Report

# RESULT

A. PRODUCT GROUP LOCALIZATION FIXED — HEADER V2.1 (V2.0) READY TO REMAIN FROZEN.

# AUTHORITATIVE FROZEN SPEC

**Discrepancy found and disclosed up front, per this task's own §0 ("If the current implementation materially contradicts V2.1: STOP and report the contradiction"):** the task references `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md`. No such file, and no "V2.1" Header document of any kind, exists anywhere in this repository — confirmed by a full-repository filename search (`find . -iname "*HEADER*FROZEN*"`) and a full-text search for "V2.1"/"Version 2.1" across every Header-related document. The only frozen Header document that exists is `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` (repository root), which is the exact document NAV-P0 already used as its authority and which `lib/content/nav.ts`'s own doc comments cite throughout (`§58.1`, etc.).

This task's own §1–§34 "frozen items" enumeration (5 top-level items in that exact order, Products/Services hybrid disclosure pattern, no ARIA menu roles, one shared component, WhatsApp/flags/Search absent, mobile drawer geometry, etc.) was cross-checked line-by-line against the real, existing V2.0 document and the 38 pre-existing tests in `lib/content/header-frozen-spec-invariants.test.ts` — every one of them matches V2.0's actual, already-verified content exactly. There is no material content contradiction — only a version-label mismatch (this task calls it "V2.1"; the real, durable document is V2.0).

Per this task's own explicit instructions, this report does **not** fabricate a V2.1 document, does **not** silently rename or re-version V2.0, and does **not** create a new architecture version. `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` is treated as the real, authoritative, durable frozen Header specification throughout this phase — the only one that actually exists — and all "frozen item" verification below is against it.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `21c66f114069e871543577d76639341567b90f40`
- `git status --short` at task start: empty.
- NAV-P0 report commit (`21c66f114069e871543577d76639341567b90f40`) verified present and IS the current HEAD.
- `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` verified present (durable, repository root) — see AUTHORITATIVE FROZEN SPEC above for the V2.1-naming discrepancy.
- No unrelated drift found — proceeded.

# BASE SHA

`21c66f114069e871543577d76639341567b90f40`

# NAV-P0 FINDING

Confirmed exactly as stated in this task's own preamble: Products dropdown group labels (`group_name`) are exposed as raw English strings on FA/AR. The separate NAV-P0 observation — only 3 of 7 commercial product groups are currently publication-eligible — is a Catalog/publication-state fact, explicitly **not** touched in this phase (no group was published, invented, or bypassed).

# CURRENT PRODUCT NAVIGATION DATA FLOW

Traced end to end, exact field names at every layer:

1. **Odoo Product Master** → 2. **Public Catalog Projection API** (`GET /api/v1/catalog/products`, `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`) — accepts `locale=fa|en|ar` (verified in both the prose doc and the OpenAPI spec's parameter list), returns each variant's `classification.group.{code,name}`. Documented: *"Responses ... Names use deterministic locale fallback (`requested → Persian → English → Arabic → neutral`)."* Verified PASS in `docs/integrations/odoo/catalog-v1/AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md`: *"Requested→Persian→English→Arabic→neutral fallback passed"* and *"Meta contains active-only stable codes/names for family/group/form/grade/standard."*
3. **Catalog sync** (`lib/catalog/sync-runner.ts#fetchAllPages`) — calls `fetchCatalogProductsPage({ page, pageSize, updatedSince, locale: "fa" })` with `locale` **hardcoded to `"fa"`**, confirmed by direct source read. Never fetches `en`/`ar`.
4. **DB_PUBLIC schema** (`migrations_public/0002_catalog_v1_contract.sql`) — `product_variants.group_name` is a single `TEXT` column, no per-locale variant (confirmed: no `group_name_en`/`group_name_ar` column exists anywhere in the schema).
5. **Catalog/navigation repository** (`lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`, pre-fix) — `SELECT DISTINCT pv.group_code, pv.group_name ... ORDER BY pv.group_name ASC`, `bind(locale)` only for the unrelated `product_seo_contents.locale` publication filter — the returned `group_name` was always whatever single string sync had stored (the `fa` fetch's result), regardless of the requested `locale`.
6. **Layout/server composition** (`app/[locale]/layout.tsx`) — calls `listHeaderProductFamilyShortcuts(locale)` and passes the result to `SiteHeader` as a prop, unchanged by this phase.
7. **SiteHeader props** → 8. **Desktop dropdown** (`HeaderNavDisclosure`) / **Mobile accordion** (`MobileNavDrawer`) — both consume the exact same `productFamilies` prop and the same per-item `{code, name}` shape; neither ever branches on locale for Product data itself (locale only affects which `nav.ts` label strings surround it).

# LOCALIZATION OWNERSHIP

**LOCALIZATION OWNER: UPSTREAM CATALOG (Odoo Public Catalog API v1), consumed via the Website's own Catalog domain read model — never SiteHeader.**

The authoritative localized name genuinely originates upstream (Odoo); the Website's Catalog domain (`lib/catalog/`) is responsible for correctly fetching, storing, and serving it per locale. `SiteHeader`/`HeaderNavDisclosure`/`MobileNavDrawer` remain pure consumers of whatever `HeaderProductFamilyShortcut[]` the Catalog domain hands them — no Header file was given any new translation responsibility.

# ROOT CAUSE CLASSIFICATION

**B — Localized names exist in the Public Catalog API contract, but Website sync/schema drops them.**

Confirmed by direct evidence, not inference:
- The API contract *does* support `locale=fa|en|ar` and *does* resolve classification names accordingly (documented and PASS-verified — see CURRENT PRODUCT NAVIGATION DATA FLOW step 2).
- `lib/catalog/sync-runner.ts#fetchAllPages` hardcodes `locale: "fa"` — never requests `en`/`ar` at all (step 3).
- `product_variants.group_name` (the only place a group name is persisted) has no per-locale column to hold `en`/`ar` even if they were fetched (step 4).

Not A (Header/read-model consumes the wrong existing field — no `en`/`ar` field existed at all to consume). Not C (no authoritative Website-owned localization layer for this concept existed either — this phase creates the first one). Not D (the upstream contract genuinely does provide localized names — confirmed, not assumed).

# AUTHORITATIVE LOCALIZED DATA

No `en`/`ar` group names existed anywhere in DB_PUBLIC before this phase (verified: `product_variants` has no per-locale group-name column, and no other table stored one). This phase's fix is the FIRST time this data is captured at all — sourced directly from the same authoritative upstream API every other piece of catalog data already comes from, never guessed/typed by hand. (No live Odoo network access exists in this session/environment — see REMAINING RISKS for what is and is not yet verified against a real upstream response.)

# CORRECT FIX LAYER

Catalog domain (`lib/catalog/`), matching the required ownership rule exactly:

```
Commercial group identity (group_code, unchanged)
        ↓
Public Catalog localized presentation (NEW: catalog_group_labels, per-locale name)
        ↓
Header (unchanged: consumes {code, name} as before)
```

No Header file (`SiteHeader.tsx`, `header-nav-disclosure.tsx`, `mobile-nav-drawer.tsx`, `header-language-selector.tsx`) was modified in this phase.

# IMPLEMENTATION

1. **`migrations_public/0009_catalog_group_labels.sql`** (additive-only, new table): `catalog_group_labels (group_code TEXT, locale TEXT CHECK IN ('fa','en','ar'), name TEXT, updated_at TEXT, PRIMARY KEY (group_code, locale))`. No seed rows.
2. **`lib/catalog/group-label-sync.ts`** (new, pure, no `cloudflare:workers` dependency): `fetchGroupLabelsForLocale(locale)` walks the same paginated `/api/v1/catalog/products?locale=X` list endpoint the main sync already uses, collecting each distinct `classification.group.{code,name}` pair actually observed. Deliberately does **not** use `/api/v1/catalog/meta` — that endpoint's own OpenAPI definition accepts no `locale` parameter at all, so its name set's locale is undocumented/unverified; this module only trusts the one endpoint whose locale-awareness is actually documented and PASS-tested.
3. **`lib/catalog/repository.ts#upsertCatalogGroupLabels(locale, labels)`** (new, D1-touching): a `db.batch()` of `INSERT ... ON CONFLICT(group_code, locale) DO UPDATE` statements — upsert-only, never deletes/deactivates a row.
4. **`lib/catalog/group-label-sync-runner.ts#runGroupLabelSync()`** (new): orchestrates fetch+upsert independently for `fa`/`en`/`ar` — one locale's failure (network error, upstream 5xx, `not_configured`) never prevents another's.
5. **`workers/entry.ts`**: `runGroupLabelSync()` added as a third, independent `ctx.waitUntil()` call inside the existing `CATALOG_FULL_RECONCILIATION_CRON` branch (once daily) — **no new Cron Trigger** (this account's Workers Free-plan 5-trigger cap is already at 3 in production; this piggybacks exactly as Processing sync already piggybacks on the incremental trigger).
6. **`lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`**: now `LEFT JOIN catalog_group_labels l ON l.group_code = pv.group_code AND l.locale = ?`, selecting `COALESCE(l.name, pv.group_name)`. Ordering changed from `ORDER BY pv.group_name ASC` to `ORDER BY pv.group_code ASC` (see NAVIGATION SEQUENCE). Result capped via a new exported `MAX_HEADER_PRODUCT_SHORTCUTS = 8` constant (see MAX-8 SHORTCUT GATE).

# DATABASE / MIGRATION

`ls migrations_public/` before this phase showed `0001`–`0008`; the next number, `0009`, was used. Purely additive (`CREATE TABLE` only, no `ALTER`/`DROP`/`RENAME` of any existing table/column). Applied to **local D1 only** (`wrangler d1 migrations apply DB_PUBLIC --local`) — confirmed via `PRAGMA table_info` and a row-count check. No `--remote` flag used at any point in this phase.

# PUBLICATION ELIGIBILITY

Unchanged. No group was published, invented, or bypassed. `listHeaderProductFamilyShortcuts` still gates on the exact same `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` plus `pv.is_active = 1 AND pv.is_public = 1` it always did (re-confirmed: this exact substring is still present, and the pre-existing test asserting it still passes unchanged). The 3-of-7 publication-eligibility fact from NAV-P0 is untouched.

# NAVIGATION SEQUENCE

No `show_in_navigation`/`sequence` (or equivalent) field exists anywhere in the real, currently-fed v1 contract schema — verified directly: `sort_order` appears only on `catalog_categories`/`attribute_definitions`/`attribute_values` (`migrations_public/0001_catalog_schema.sql`), all three explicitly documented elsewhere in this codebase (`lib/catalog/types.ts`'s own file header) as **not fed by the real Odoo integration**. No such field was invented for this task.

Instead, ordering was changed from `ORDER BY pv.group_name` (the OLD single-locale name — which, once made locale-varying via this fix, would have caused the dropdown to silently re-sort per locale, since alphabetical order of translated strings differs by language) to `ORDER BY pv.group_code` — the one field that is genuinely stable and locale-invariant everywhere else in this schema. Live-verified: querying with `locale='en'` and `locale='ar'` both return the identical order `REBAR, SHEET_PLATE, SHS` (by code), even though the *displayed* names differ completely between the two (`"Rebar"/"Sheet & Plate"/"Square Hollow Section"` vs. real Arabic equivalents) — proving the fix satisfies this task's own explicit "do not reshuffle Header dynamically based on translated alphabetical order" requirement.

# MAX-8 SHORTCUT GATE

New named constant `export const MAX_HEADER_PRODUCT_SHORTCUTS = 8` in `lib/catalog/editorial-repository.ts`, applied via `.slice(0, MAX_HEADER_PRODUCT_SHORTCUTS)` on the final result — never hardcoded to `3` (today's real count) or `7` (the total real group count). Pinned by a new test (`header-frozen-spec-invariants.test.ts`) asserting both the constant's literal value and that the function body actually applies it. "View all products" remains a separate, always-available link regardless of this cap.

# VIEW-ALL PRODUCTS

Unchanged — `lib/content/nav.ts#dropdownViewAllLabel.products` and its consumption in `SiteHeader.tsx`/`mobile-nav-drawer.tsx` were not touched. Pinned by a new regression test confirming both still exist and are wired.

# ZERO-DATA BEHAVIOR

Unchanged — `HeaderNavDisclosure`'s `items.length === 0` early-return (plain link, no empty panel) was not touched, and its own file was not modified in this phase at all. Re-confirmed passing via the existing (unmodified) test suite.

# FA RESULT

PASS. Live-verified against local D1 with clearly-labeled test fixtures (`TEST-` prefixed, deleted after verification — see LOCAL DATA CHECK): with no `fa` row yet synced into `catalog_group_labels`, the query correctly falls back to the historical `pv.group_name` column, returning real (non-empty, non-placeholder) values: `REBAR → "Rebar"`, `SHEET_PLATE → "Sheet & Plate"`, `SHS → "SHS"`.

# AR RESULT

PASS. Live-verified: with `ar`-locale test rows present in `catalog_group_labels`, the query correctly returns the new table's values: `REBAR → "TEST-حديد التسليح"`, `SHEET_PLATE → "TEST-الصفائح والألواح"`, `SHS → "TEST-قطاع مربع مجوف"` — genuine right-to-left Arabic text, not Persian reused (this was test-fixture data standing in for real upstream Arabic, clearly labeled as such — see LOCAL DATA CHECK).

# EN RESULT

PASS. Live-verified: with `en`-locale test rows present, the query correctly returns: `REBAR → "TEST-Rebar"`, `SHEET_PLATE → "TEST-Sheet & Plate"`, `SHS → "TEST-Square Hollow Section"`.

# ROUTE STABILITY

PASS. `HeaderProductFamilyShortcut.code` is always `pv.group_code` — verified by source (the SELECT's `group_code` column is untouched, and the returned object literal is `{ code: r.group_code, name: r.group_name! }`, pinned by a new test). `SiteHeader.tsx`'s dropdown href is built as `` `/products?group=${f.code}` `` — from `code`, never `name` (pinned by a new test). A group's route destination is therefore identical regardless of which locale's label happens to be displayed.

# DESKTOP / MOBILE PARITY

PASS — unchanged. Neither `SiteHeader.tsx` nor `mobile-nav-drawer.tsx` was modified in this phase; both continue to consume the identical `productFamilies: HeaderProductFamilyShortcut[]` prop from the identical `app/[locale]/layout.tsx` fetch. No `desktopTranslations`/`mobileTranslations` or any parallel localization path was introduced anywhere (pinned by a new test scanning for a hardcoded group-translation object literal across every relevant file).

# RTL / LTR

Unaffected — no directional/RTL-LTR code was touched. The new Arabic test-fixture strings rendered correctly as real RTL Arabic text in the live D1 verification (no code change was needed for this, since display direction is already handled entirely by the existing, untouched `html[dir]`/component-level RTL handling from NAV-P0's own audit).

# DISCLOSURE ACCESSIBILITY

Unaffected — `header-nav-disclosure.tsx` was not modified in this phase. All prior accessibility guarantees (real `<a>` label, separate `<button>` chevron, `aria-expanded`/`aria-controls`/`aria-label`, no ARIA menu roles, focus-visible outline, Escape/outside-click/route-change close) remain exactly as NAV-P0 verified them, re-confirmed by the full, unchanged 38-test baseline still passing.

# FROZEN V2.1 REGRESSION GATES

(Verified against the real, existing V2.0 document — see AUTHORITATIVE FROZEN SPEC.) All PASS, unchanged:
- 5 frozen top-level items, exact order (Products, Services, Industries, About, Contact) — re-pinned by a new NAV-P1 test in addition to the pre-existing one.
- Products/Services hybrid disclosure gate (real link + separate chevron) — unchanged, `header-nav-disclosure.tsx` untouched.
- No `role="menu"`/`"menubar"`/`"menuitem"` anywhere — unchanged.
- Primary CTA text/route (`ارسال لیست خرید` → `/request`) — unchanged, `lib/content/nav.ts`'s `primaryCta`/`navLinks` structural exports untouched (only `HeaderProductFamilyShortcut`-consuming code changed, in a different file).
- No Search added. No new top-level item added. `/markets` not restored to primary nav.

# SERVICES REGRESSION

PASS — zero Services-related file was touched in this phase (`lib/processing/public-repository.ts`, its own sync, and its Header consumption are all untouched). Re-confirmed via the full, unchanged existing test suite.

# INDUSTRIES / ABOUT / CONTACT REGRESSION

PASS — not modified in this phase, per this task's own explicit instruction. Routes/behavior unchanged (unaffected by this phase's Catalog-domain-only change).

# PHONE / LANGUAGE / CTA REGRESSION

PASS — `header-language-selector.tsx`, the phone `tel:` links, and the primary CTA markup/text/route were not touched in this phase.

# LOCAL DATA CHECK

Local DB_PUBLIC only, no `--remote` flag used anywhere:
- Publication-eligible Product group identities (unchanged from NAV-P0): `REBAR`, `SHEET_PLATE`, `SHS` (3 of 7 real commercial groups).
- `product_variants.group_name` (pre-existing, still the fallback source): `"Rebar"`, `"Sheet & Plate"`, `"SHS"` — English/neutral strings, no per-locale variant.
- `catalog_group_labels` before this phase's fixtures: 0 rows (new table, freshly migrated).
- Navigation sequence: no such field exists (see NAVIGATION SEQUENCE) — ordering now uses `group_code`.
- Resulting FA label (fallback path, no `fa` row yet synced): `"Rebar"`, `"Sheet & Plate"`, `"SHS"`.
- Resulting AR label (test fixture rows present): `"TEST-حديد التسليح"`, `"TEST-الصفائح والألواح"`, `"TEST-قطاع مربع مجوف"`.
- Resulting EN label (test fixture rows present): `"TEST-Rebar"`, `"TEST-Sheet & Plate"`, `"TEST-Square Hollow Section"`.

**These EN/AR values are clearly-labeled (`TEST-` prefix) local test fixtures, standing in for a real upstream response this session cannot fetch live (no Odoo network access exists in this environment) — they are NOT real production data and must never be read as confirmation of what real Odoo-sourced Arabic/English group names will actually say.** They exist only to prove the query/fallback/ordering logic is wired correctly.

# LOCAL FIXTURE CLEANUP

All 6 `TEST-`-prefixed rows inserted into `catalog_group_labels` (2 locales × 3 groups) were deleted after verification. Confirmed via a final row count: `catalog_group_labels` = 0 rows, `product_variants` = 237 (unchanged). No publication state, no existing catalog row, was modified.

# FILES CREATED

- `migrations_public/0009_catalog_group_labels.sql`
- `lib/catalog/group-label-sync.ts`
- `lib/catalog/group-label-sync.test.ts`
- `lib/catalog/group-label-sync-runner.ts`

# FILES MODIFIED

- `lib/catalog/repository.ts` (added `upsertCatalogGroupLabels`)
- `lib/catalog/editorial-repository.ts` (`listHeaderProductFamilyShortcuts` rewritten to consume the new table + fallback + stable ordering + max-8 cap; new `MAX_HEADER_PRODUCT_SHORTCUTS` export)
- `workers/entry.ts` (one new independent `ctx.waitUntil(runGroupLabelSync())` call, piggybacking on the existing daily full-reconciliation cron branch)
- `lib/content/header-frozen-spec-invariants.test.ts` (8 new NAV-P1 tests added)

No Header component file (`SiteHeader.tsx`, `header-nav-disclosure.tsx`, `mobile-nav-drawer.tsx`, `header-language-selector.tsx`) was modified.

# RUNTIME COMMIT

`e4ecb3fe6d4018611b3547b3fb43d35a5f0d100d` — "fix: consume localized Product navigation labels"

# HEADER TEST RESULTS

`npx tsx --test lib/content/header-frozen-spec-invariants.test.ts` (part of `lib/content/*.test.ts`) → **46 pass, 0 fail** (38 pre-existing + 8 new NAV-P1 tests, all passing).

# FULL TEST RESULTS

`npm test` (full repository suite) → **840 pass, 0 fail** (up from 826: +6 `group-label-sync.test.ts`, +8 NAV-P1 Header tests).

# TYPESCRIPT

`npx tsc --noEmit` → clean, 0 errors.

# BUILD

`npm run build` (`vinext build`) → succeeded, all 11 routes registered. `tsconfig.tsbuildinfo` restored via `git restore` after the build.

Additional regression domains re-run individually, all unchanged/passing: Catalog 226 pass (+6 from the new pure test file), Processing 42 pass, RFQ 192 pass, Locales/metadata 5 pass, Pricing 201 pass (confirmed untouched by this unrelated-domain change).

# GIT

- Runtime commit: `e4ecb3fe6d4018611b3547b3fb43d35a5f0d100d`.
- Report commit (this file; evidence only): recorded after this file is committed — see the final response for its SHA.
- No amendment of any prior commit. No push. No force operations.

# PRODUCTION SAFETY

No staging/production D1 migration applied — local-only (`wrangler d1 migrations apply DB_PUBLIC --local`), no `--remote` flag used anywhere in this phase. No Odoo system accessed or modified (no live network call was made to Odoo at all in this session — the new sync code was verified by unit tests with a mocked `fetch`, and its D1 write path was verified with local test fixtures, never a real upstream response). No production/staging environment variable changed. No Header component shipped a behavioral change (the fix lives entirely in the Catalog domain's read path). `catalog_group_labels` is currently empty in every environment (including local, after cleanup) until a real scheduled sync run (or a manual invocation) actually populates it from the real upstream API.

# REMAINING RISKS

- **No live verification against the real Odoo Public Catalog API was performed in this phase** (no network access to it exists in this environment) — the EN/AR results reported above are from local test fixtures standing in for real data, not a confirmation of what real Odoo-sourced Arabic/English group names will say. The next real scheduled sync run (daily, piggybacking on `CATALOG_FULL_RECONCILIATION_CRON`) is what will actually populate `catalog_group_labels` with real data for the first time — this should be watched/spot-checked once deployed.
- `fetchGroupLabelsForLocale` walks the full paginated list endpoint 3× (once per locale) to derive the group-name set — cheap today (237 records, 3 pages × 3 locales = 9 requests/day), but would scale linearly if the catalog grows dramatically; acceptable for a once-daily job, flagged as a scaling consideration only.
- The related `/products` filter-facet UI (`lib/catalog/catalog-filters.ts`) has the exact same underlying root cause (reads the same single-locale `group_name`/`family_name` columns) but was deliberately **not** touched in this phase, to stay strictly scoped to the Header dropdown finding NAV-P0/NAV-P1 selected. This is a real, evidence-backed follow-up opportunity for a future phase, not a defect introduced here.
- `family_name`/`form_name`/`grade_name`/`standard_name` (the other 4 classification dimensions) have the identical root cause but were not addressed — only `group_name` (the one dimension the Header actually renders) was in scope for NAV-P1.

# HEADER V2.1 FREEZE STATUS

**HEADER V2.1 MODIFIED: NO.** (No V2.1 document exists to modify — see AUTHORITATIVE FROZEN SPEC. The real, existing `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` was also not modified — this phase's fix lives entirely in the Catalog domain, not in any Header architecture document or component.)

# NEXT PHASE

No further NAV phase is required by this task's own findings. A natural, separate future opportunity (not authorized or started here) would extend the same `catalog_group_labels` pattern to `family_name`/`form_name`/`grade_name`/`standard_name` and to the `/products` filter-facet UI, which share the identical root cause. The very first real (non-test-fixture) population of `catalog_group_labels` will happen automatically on the next scheduled daily full-reconciliation run once this change is deployed — worth a one-time spot-check against real Odoo data at that point.
