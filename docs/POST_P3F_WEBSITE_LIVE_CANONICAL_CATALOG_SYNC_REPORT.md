# POST-P3F — Website Live Canonical Catalog Sync Gate

# RESULT

**PASS.** The Website staging catalog sync ran against the real, live Odoo
Public Catalog API (256 active rows, including the 19 newly published
canonical-only Angle/Channel variants) using the actual production code
path (`scripts/catalog-sync.ts` → `lib/catalog/odoo-api-client.ts` →
`lib/catalog/sync.ts#planCatalogV1Sync` → `lib/catalog/sync-sql.ts` → real
`wrangler d1 execute` writes against `ahanassa-public-staging`). All 256
upstream rows synced successfully, all 19 Angle/Channel rows were accepted
with `id: null, template_id: null`, all 237 previously legacy-XID-keyed
rows migrated in place to canonical `CVAR-…`/`CTMPL-…` identity with zero
duplication and full internal-id/FK/SEO preservation, and a second full
sync confirmed idempotency (0 created, 0 updated, 0 deactivated). This is
the first real-Odoo-API confirmation of the migration logic that
`PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md` could only verify
against a synthetic mock payload — see "Identity Migration" below.

One operational incident occurred and is fully documented (a transient
network failure partway through the first sync attempt) — no code defect
was found; the sync was simply re-run to completion. See "Sync Execution."

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated` (confirmed)
- HEAD at task start and throughout: `8e3ecaf9831af6cead14d77dfef78c4554c7144d` (unchanged — no application code was changed by this task)
- Working tree: clean except `tsconfig.tsbuildinfo` (tsc build cache, excluded from evidence/commits per this task's own instruction)
- Confirmed present: `docs/PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`, `docs/PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md`, `docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`
- Read in full: the three docs above, `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`, `lib/catalog/odoo-api-client.ts`, `lib/catalog/sync.ts`, `scripts/catalog-sync.ts`, `lib/catalog/sync-sql.ts`, `lib/catalog/editorial-cli.ts`, `wrangler.jsonc`, `lib/rfq/uom-policy.ts`, `migrations_public/*.sql`
- No `01-sources/`, `logo/`, or `design-reference/` file touched. No Odoo file/module touched or published. No production D1 read or write. No push.

# LIVE ODOO CONTRACT

Confirmed by direct, read-only `GET` requests against
`https://odoo.ahanassa.com/api/v1/catalog/*` (public, `auth=public`, no
credential):

| Check | Expected | Observed | Match |
|---|---|---|---|
| Total active rows | 256 | 256 | YES |
| `group=ANGLE` | 5 | 5 | YES |
| `group=CHANNEL` | 14 | 14 | YES |
| `form=EQUAL_ANGLE` | 5 | 5 | YES |
| `form=UPN` | 7 | 7 | YES |
| `form=UPE` | 7 | 7 | YES |
| `CVAR-000242` detail | resolves | resolves, `id:null, template_id:null, canonical_id:"CVAR-000242", canonical_template_id:"CTMPL-000017"`, group `ANGLE`/`EQUAL_ANGLE`, `allowed_commercial_units:"kg, ton, meter"` | YES |
| `CVAR-000252` detail | resolves | resolves, `id:null, template_id:null`, group `CHANNEL`/`UPN`, `allowed_commercial_units:"kg, ton, meter"` | YES |
| `CVAR-000260` detail | resolves | resolves, `id:null, template_id:null`, group `CHANNEL`/`UPE`, `allowed_commercial_units:"kg, ton, meter"` | YES |

Legacy row identity shape (e.g. `CVAR-000172`, a Sheet & Plate variant,
observed while paging `page=1&page_size=1`): `id:
"ahanassa_marketplace.product_sh_hr_s235jr_s10x1500x6000"`, `template_id:
"ahanassa_marketplace.product_tmpl_sh_hr_s235jr_plate"`, plus
`canonical_id`/`canonical_template_id` both populated — confirms legacy
rows carry both identity forms, canonical-only rows carry only the
canonical form, exactly as the backend handoff documented.

# STAGING D1 BEFORE

`ahanassa-public-staging` (`35cef70f-3ad3-4049-add4-ddcac6cac45b`), measured directly before any mutation:

| Metric | Value |
|---|---|
| `catalog_products` | 13 |
| `product_variants` | 237 |
| `product_seo_contents` | 3 (all 3 published) |
| Distinct `xid` | 237 |
| Distinct `template_xid` | 13 |
| Duplicate `xid` groups | 0 |
| Duplicate `template_xid` groups | 0 |
| Duplicate `sku` groups | 0 |
| Orphan variants | 0 |
| `CVAR-%`-keyed variants | 0 |
| Legacy-keyed variants | 237 |

**Classification: 100% legacy XID-keyed.** Matches
`PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md`'s own measured
baseline exactly (13/237/0 CVAR-keyed), confirming staging had not drifted
since that task and this sync is starting from the exact documented risk
scenario the migration logic needs to handle.

`catalog_sync_state` before: `last_success_type: incremental`,
`last_incremental_watermark: 2026-08-30T10:04:12Z`,
`last_full_upstream_count: 237`, no lease held.

# PRE-SYNC SNAPSHOT

Saved to `docs/evidence/post_p3f_catalog_sync/POST_P3F_STAGING_PRE_SYNC_SNAPSHOT_2026-09-18.json`
(full row-level dump of `catalog_products`, `product_variants`,
`product_seo_contents`).

SHA256: `1278c7fad1ce39212ec0183491699f4ce47a7343ab64a48e54af01710ee37bd3`

# SYNC EXECUTION

Ran the real production code path — `node scripts/catalog-sync.ts full
--env staging` (`ODOO_BASE_URL` set inline; no secret required, the
Catalog API is public/anonymous) — never a synthetic/mock payload.

**Dry run** (`--dry-run`) first: `Plan: toCreate=19 toUpdate=237
toDeactivate=0 unchanged=0` — matched expectations exactly before any
write was issued.

**First real attempt:** the `toCreate` phase completed cleanly (all 19
Angle/Channel rows inserted, 3 new `catalog_products` template rows
created — 13→16). Partway through the 237-item `toUpdate` migration loop
(each item is its own sequential `wrangler d1 execute` call — this design
choice, documented in `scripts/catalog-sync.ts`'s own header, trades
sync-run wall-clock time for reusing the exact same SQL-builder/write path
`lib/catalog/repository.ts` uses in the real Worker, with no separate
bulk-write code to drift out of sync), a `wrangler d1 execute` call
returned `{"error":{"text":"fetch failed"}}` — a transient network error
between the local `wrangler` CLI and Cloudflare's D1 HTTP API, not an
application-level rejection. Because JavaScript's `finally` block
semantics mean a later exception (the `finally` block's own
`releaseLease` call, which also hit the same transient condition)
**replaces** an earlier one, the single error line printed to the
operator was from the lease-release call, not the original failure site —
this is a pre-existing observability sharp edge in
`scripts/catalog-sync.ts`, not a correctness defect (see "Remaining
Risks").

Immediately after, a direct read-only D1 query confirmed the actual state:
`catalog_products=16, product_variants=256 (all 19 created, 0
duplicated), cvar_keyed_variants=89 (19 new + 70 migrated),
legacy_keyed_variants=167, dup_xid=0, dup_template_xid=0, dup_sku=0,
orphan_variants=0`. **The partial-apply state was clean — no
corruption, no duplication, no orphaning** — because each `toUpdate` item
is applied as an independent, single-row SQL statement; an interruption
mid-loop simply leaves the remaining rows in their pre-migration (still
valid, still legacy-keyed) state.

The sync lease (`catalog_sync_state.lease_owner`) was left held by the
interrupted run (its own `releaseLease` call was the one that failed).
Per `lib/catalog/sync-sql.ts#buildAcquireLeaseSql`, a lease self-heals
once `lease_expires_at` passes (`LEASE_DURATION_MS = 10 minutes`) — no
manual lease-table edit was made; the retry simply waited for natural
expiry.

**Retry (`full --env staging`, no `--dry-run`):** planner correctly
recomputed `toCreate=0` (the 19 rows already existed — **not**
re-created/duplicated), `toUpdate=167` (only the still-legacy-keyed
remainder), `unchanged=89` (the already-migrated rows, correctly
recognized, not re-written). Ran to completion:
`Applied: created=0 updated=167 deactivated=0`.
`catalog_sync_state` after: `last_success_type: full,
last_full_upstream_count: 256, consecutive_failure_count: 0,
last_failure_at: null, lease_owner: null`.

# IDENTITY MIGRATION

Post-sync, measured directly:

| Metric | Value |
|---|---|
| `catalog_products` | 16 (13 preserved + 3 new) |
| `product_variants` | 256 (237 preserved + 19 new) |
| `CVAR-%`-keyed variants | 256 / 256 (100%) |
| `CTMPL-%`-keyed products | 16 / 16 (100%) |
| Legacy-keyed remaining | 0 |

All 237 pre-existing variants migrated in place (confirmed by internal-id
continuity below) — none were re-created. This is the first time this
migration logic has been proven against a **real** Odoo API response
carrying genuine `canonical_id`/`canonical_template_id` values, closing
the residual risk both `PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`
("Remaining Risks" #1) and `PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md`
("P3F Readiness") explicitly left open (both prior verifications used
synthetic/mock canonical values because live Odoo could not be reached in
those sessions).

# ANGLE CHANNEL INGESTION

All 19 rows verified present in D1 post-sync, `is_active=1`:

| Group | Form | Count | `allowed_commercial_units` |
|---|---|---|---|
| ANGLE | EQUAL_ANGLE | 5 | `kg, ton, meter` |
| CHANNEL | UPN | 7 | `kg, ton, meter` |
| CHANNEL | UPE | 7 | `kg, ton, meter` |

Spot-checked the three named rows directly in D1 — all match the live
Odoo response exactly:

- `CVAR-000242`: `sku=AA-AN-EQ-S50X50X5, commercial_size=50X50X5,
  standard=EN10056-1, dimensions={width_mm:50,height_mm:50,thickness_mm:5},
  nominal_weight={kg_m:3.77}`
- `CVAR-000252`: `sku=AA-CH-UPN-S160, commercial_size=UPN 160,
  standard=EN10365, dimensions={width_mm:65,height_mm:160},
  nominal_weight={kg_m:18.8}`
- `CVAR-000260`: `sku=AA-CH-UPE-S160, commercial_size=UPE 160,
  standard=EN10365, dimensions={width_mm:70,height_mm:160},
  nominal_weight={kg_m:17}`

None of the 19 rows failed validation for having `id: null, template_id:
null` — `isValidProduct()` only requires `canonical_id`/
`canonical_template_id`, per the PRE-P3F-D1 fix.

# BEFORE / AFTER COUNTS

| | Before | After first (partial) | After retry | After 2nd sync |
|---|---|---|---|---|
| `catalog_products` | 13 | 16 | 16 | 16 |
| `product_variants` | 237 | 256 | 256 | 256 |
| CVAR-keyed variants | 0 | 89 | 256 | 256 |
| CTMPL-keyed products | 0 | 16 | 16 | 16 |

# DUPLICATION CHECK

Measured post-sync (and again after the second sync): `duplicate_xid: 0`,
`duplicate_template_xid: 0`, `duplicate_sku: 0`, `orphan_variants: 0`.
`distinct_xid` (256) and `distinct_template_xid` (16) exactly match total
row counts throughout, including during the partial-apply window measured
mid-incident. No legacy row ever coexisted as a duplicate alongside its
migrated canonical counterpart at any point.

# INTERNAL ID / FK STABILITY

Diffed the full pre-sync and post-sync row dumps programmatically:

- **All 13 pre-sync `catalog_products.id` values preserved** post-sync, with `name_fa` unchanged. 3 new product rows added (for `CTMPL-000017/18/19`).
- **All 237 pre-sync `product_variants.id` values preserved** post-sync, with `product_id` (FK to `catalog_products`) and `sku` unchanged for every one. 19 new variant rows added.
- Of the 237 preserved variants, all 237 had their `xid` column value change (legacy → canonical) — 0 had an unchanged `xid`, consistent with 100% of pre-sync rows being legacy-keyed.
- No unexpected row replacement observed anywhere.

# SEO STABILITY

`product_seo_contents` byte-identical before and after (3 rows, all 3
published `fa` slugs unchanged: `square-hollow-section-shs`,
`rebar-aj340`, `hot-rolled-plate-s355jr`) — confirmed by direct diff, not
merely absence of an error. This matches
`PREP3F_D1B_D1_MIGRATION_SAFETY_VERIFICATION_REPORT.md`'s structural
finding: no sync/migration SQL statement in `lib/catalog/sync-sql.ts` or
`scripts/catalog-sync.ts` ever references `product_seo_contents` — the
write path cannot reach that table by construction.

For the 19 new Angle/Channel rows: **no SEO/editorial row exists yet**
(0 `product_seo_contents` rows reference any of the 19 new variant or
their 3 new product ids). They are inserted with `is_public=0,
is_price_public=0` (hardcoded on every `INSERT`,
`lib/catalog/sync-sql.ts#buildInsertVariantSql`) — synced and active in
D1, but **not publicly rendered** until a separate, explicit editorial
publish step (`scripts/catalog-editorial.ts`) runs. Nothing was
auto-published by this sync.

# CATEGORY CLASSIFICATION

`product_variants.group_code`/`form_code` correctly populated for all 19
rows (`ANGLE`/`EQUAL_ANGLE`, `CHANNEL`/`UPN`, `CHANNEL`/`UPE`).
`lib/catalog/catalog-filters.ts`'s classification-option derivation is
dynamic (`dedupeClassificationRefs` over whatever rows exist), not a
hardcoded group allowlist, and `app/[locale]/products/page.tsx` already
consumes `parseCatalogFilterParams`/`group` generically — so once these
rows are made public, they will appear in `/products` filtering without a
code change. However, no dedicated ANGLE/CHANNEL navigation entry,
homepage curation slot, or category landing content was found
(`lib/catalog/homepage-config.ts` has no reference to either group). **Per
this task's explicit scope limit, no category/navigation UI was built or
redesigned — flagged as the next UI integration task**, consistent with
`NEXT_PHASE` below.

# UOM POLICY

`lib/rfq/uom-policy.ts#LAUNCH_GROUP_UOM_POLICY`: `ANGLE: ["kg","ton","meter"]`,
`CHANNEL: ["kg","ton","meter"]` — confirmed already present (added by the
PRE-P3F-D1 task) and confirmed to match the live data synced in this task
(all 19 rows carry exactly `"kg, ton, meter"` in
`allowed_commercial_units`, no `branch`). `branch` remains a globally
valid RFQ `uom` value (Odoo's `_UOMS` allow-list) but is excluded from the
ANGLE/CHANNEL group policy specifically — confirmed both in the policy
code and in every synced row's data. No UOM architecture change was made.

# RFQ CANONICAL IDENTITY

Verified directly against the synced D1 data (not by submitting a real
RFQ, per this task's explicit scope limit):

- **Migrated legacy variant** (e.g. an RHS/Sheet-Plate row observed
  mid-migration): `xid` column holds `CVAR-000153` post-sync — its
  original legacy `id` value is no longer stored anywhere in that column.
- **New canonical-only variant** (`CVAR-000242`): `xid` column holds
  `CVAR-000242` — there was never a legacy value to begin with (`id:
  null` in the source payload).

`lib/rfq/catalog-preselection.ts` and `lib/rfq/service.ts` read the `xid`
column verbatim into `product_variant_xid` with no transformation
(confirmed by direct code re-inspection, matching
`PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`'s own
"RFQ IDENTITY" finding) — so both cases now produce
`product_variant_xid = CVAR-…` by construction.

Per the Odoo backend handoff (`RFQ CONTRACT` section), the RFQ API's item
schema allow-list is exactly `{product_variant_xid, sku, quantity, uom,
notes, description, length_mm}` — no Supplier Offer id or `product.product`
integer field is an accepted or even structurally possible input
(`_ITEM_KEYS` rejects any extra key outright). `length_mm` is optional and
fully backward-compatible, confirmed supported since Phase
ANGLE-CHANNEL-P3D-B2 — coexists with canonical `CVAR` identity with no
conflict (they are independent, orthogonal fields in the same item
object).

# EMPTY PRICE BEHAVIOR

`product_variants`/`catalog_products` have no price column at all
(`migrations_public/0001_catalog_schema.sql`, `0002_catalog_v1_contract.sql`
— `is_price_public` is a flag only). All 19 new rows synced with
`is_price_public=0`. Pricing lives entirely in the separate, currently
disabled (`PRICE_STRIP_ENABLED=false`) `public_price_quotes` table
(`migrations_public/0004_public_price_quotes.sql`), which the catalog sync
never writes to. No price, availability, supplier, or MOQ value was
invented or defaulted to anything other than "absent" — the data model
tolerates this safely by construction, not by a new code path added in
this task.

# SPARSE TECHNICAL DATA

Confirmed for the Angle/Channel rows: `section_size: null` throughout (all
19 rows), `commercial_size` populated (e.g. `"50X50X5"`, `"UPN 160"`).
`dimensions`/`nominal_weight` stored as opaque JSON with only the
form-relevant keys present (`{width_mm, height_mm, thickness_mm}` for
Angle; `{width_mm, height_mm}` for Channel/UPN/UPE — no `length_mm` at the
catalog-data level, consistent with these being commercial-size-only
Channel/Angle products, distinct from the RFQ-time optional `length_mm`
field). No rendering or sync code assumes a fixed key set — confirmed by
direct inspection of `lib/catalog/specification-presenter.ts`'s existing
generic fallback chain (unchanged by this task).

# PAGINATION

Full multi-page sync (`page_size=100`, `MAX_PAGES=200`) completed
successfully against all 256 live rows across both the dry run and both
real sync attempts. `evaluateFullSyncPlausibility` accepted the pull as
plausible each time (`256` vs. previous `237`/`256` active — well within
the safety guard's tolerance). **0 rows rejected for canonical identity
shape** at any point. The one real failure encountered
("fetch failed," documented above under "Sync Execution") was a transient
`wrangler`↔Cloudflare-API network error during the D1-write phase, wholly
unrelated to Odoo pagination or payload validation — Odoo's own paginated
response was fetched completely and correctly on every attempt (`Upstream
observed: 256` printed identically all four times: dry run, first
attempt, retry, second sync).

# SECOND-SYNC IDEMPOTENCY

Ran `full --env staging` a second time (both `--dry-run` first, then for
real) after the retry completed:

```
Plan: toCreate=0 toUpdate=0 toDeactivate=0 unchanged=256
Applied: created=0 updated=0 deactivated=0
```

Post-second-sync D1 counts identical to post-retry counts in every
respect (`16` products, `256` variants, `0` duplicates, `0` orphans, `3`
SEO rows unchanged, `lease_owner: null`). **0 duplicate rows, 0 identity
churn, 0 unexpected inserts, no slug change, no FK change** — all
mandatory idempotency criteria met.

# TESTS

`npm test`: **1286/1286 passing, 0 failed, 0 regressed** — same suite
count as `PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`
(this task changed no test files and no source files). Covers:
`lib/catalog/odoo-api-client.test.ts`, `lib/catalog/sync.test.ts`,
`lib/catalog/sync-sql.test.ts`, `lib/rfq/uom-policy.test.ts`,
`lib/catalog/specification-presenter.test.ts`,
`lib/catalog/group-label-sync.test.ts`, plus the full remaining suite
(RFQ validation/rate-limit/Turnstile, etc.).

# BUILD

- `npx tsc --noEmit`: **clean** (exit 0).
- `npm run build` (`vinext build`): **clean** (exit 0), routes rendered
  including `/:locale/products`, `/:locale/products/:slug`, `/api/rfqs`.
- `CLOUDFLARE_ENV=production npx vinext build`: **clean** (exit 0),
  identical route output, matching the validation convention established
  by `PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`.
- No lint script is configured in this repository (verified via
  `package.json`, consistent with prior reports).

# REMAINING UI WORK

- No dedicated ANGLE/CHANNEL category navigation entry, homepage curation
  slot, or landing content exists yet. The generic `/products` filter
  page will surface them automatically via `group=ANGLE`/`group=CHANNEL`
  query params once the 19 rows are made public, but there is no
  discoverable link to that state anywhere in the current UI.
- All 19 new rows are `is_public=0` — an explicit editorial/publish
  decision (SEO content authoring + `is_public` flip via
  `scripts/catalog-editorial.ts`) is required before they render on the
  live site at all. This task deliberately did not make that call — it is
  an editorial/content decision, not an engineering one.

# NEXT PHASE

**POST-P3F WEBSITE UI INTEGRATION** — build the ANGLE/CHANNEL
category/navigation surface and run the editorial publish workflow for
the 19 new rows, per "Remaining UI Work" above.

# GIT STATE

- HEAD: `8e3ecaf9831af6cead14d77dfef78c4554c7144d` (unchanged — no
  application code was changed by this task; this is a read/sync/evidence
  task only, and no real defect was found, so no code fix was required
  per this task's own "STOP and report before expanding scope" instruction).
- Files added by this task: this report, two evidence snapshots under
  `docs/evidence/post_p3f_catalog_sync/`, `REPORT_BUNDLE_MANIFEST.txt`
  entries.
- No file under `01-sources/`, `logo/`, `design-reference/`, or any Odoo
  repository was touched. No migration file was added or changed.
- Working tree before this task's own additions: clean except
  `tsconfig.tsbuildinfo` (excluded from evidence/commits, per this task's
  own instruction).
- **Real, durable state change:** `ahanassa-public-staging` D1 (a real,
  shared, persistent staging environment, not disposable) now holds 256
  synced catalog rows instead of 237 — this is the intended, in-scope
  outcome of this task (a real staging sync), not an incidental side
  effect requiring rollback.
