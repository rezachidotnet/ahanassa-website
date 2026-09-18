# PRE-P3F-D1B — D1 Canonical Identity Migration Safety Verification

# RESULT

**PASS.** The canonical identity migration logic (`lib/catalog/sync.ts`,
`lib/catalog/repository.ts`, `lib/catalog/sync-sql.ts`,
`lib/catalog/sync-runner.ts`, `scripts/catalog-sync.ts`) was empirically
proven against real, remote staging D1 — the actual planner
(`planCatalogV1Sync`) and the actual SQL-builder functions, not a
reimplementation — using a mock payload built from two real, currently
legacy-XID-keyed staging rows plus a genuinely new canonical-only
(Angle-shaped) row. Result: zero duplication, in-place identity migration
confirmed by exact row-id/product-id continuity, a canonical-only row
inserted cleanly, and a full, verified rollback restoring staging to its
exact pre-test baseline. No code defect was found; no code was changed.

# ENVIRONMENT

**Staging D1** (`ahanassa-public-staging`, UUID
`35cef70f-3ad3-4049-add4-ddcac6cac45b`), reached via
`npx wrangler d1 execute --env staging --remote` (the same mechanism
`scripts/catalog-sync.ts`/`lib/catalog/editorial-cli.ts#wranglerExecuteArgs`
already use in production operation) — Option A from the task's preferred
order. This is the real, persistent staging environment other DAR entries
(DAR-038, DAR-045, DAR-053, DAR-057) have already synced real Odoo-sourced
catalog data into; it is not disposable/ephemeral, so every write made
during this task was explicitly reverted (see "Rollback" below). A direct
read-only query against **production** D1 was not attempted in this task —
staging was sufficient and available, so escalating to production reads
(which the prior task's session found blocked by this session's own
auto-mode classifier) was unnecessary.

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated` (confirmed)
- HEAD at start and throughout: `52abc46a7605c24f0678324224a1b98bb4dc727e` (matches the task's expected HEAD; unchanged throughout — no code was committed)
- Working tree: clean except `tsconfig.tsbuildinfo` (tsc's own build cache, expected per the task's own note; excluded from this task's evidence and from any commit)
- Read: `docs/PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT_V2.md`, `docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md`, `docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`, `lib/catalog/sync.ts`, `lib/catalog/repository.ts`, `lib/catalog/sync-sql.ts`, `lib/catalog/sync-runner.ts`, `scripts/catalog-sync.ts`, `lib/catalog/editorial-cli.ts`, `migrations_public/0001_catalog_schema.sql`, `migrations_public/0002_catalog_v1_contract.sql`.

# EXISTING D1 IDENTITY STATE

Measured directly against staging (not inferred), before any mutation:

| Metric | Value |
|---|---|
| `catalog_products` count | 13 |
| `product_variants` count | 237 |
| Distinct `xid` | 237 |
| Distinct `template_xid` | 13 |
| `xid` matching `CVAR-%` | 0 |
| `xid` matching `ahanassa_marketplace.%` (legacy) | 237 |
| `template_xid` matching `CTMPL-%` | 0 |
| `template_xid` matching `ahanassa_marketplace.%` (legacy) | 13 |
| Duplicate `xid` groups | 0 |
| Duplicate `template_xid` groups | 0 |
| Duplicate `sku` groups | 0 |
| Orphan variants (no matching `catalog_products` row) | 0 |

**This confirms the exact risk scenario the prior task's report flagged as
unverified: 100% of staging's real catalog rows are still keyed by the
legacy identity, zero rows are canonical-keyed yet.** This is precisely the
state the migration logic (fallback-match-then-migrate) needs to handle
correctly — and is not a hypothetical, but staging's real, current,
measured state.

# PRE-SYNC SNAPSHOT

Two full snapshots were captured (saved to this session's scratchpad, not
committed — they contain no secrets, only catalog identity data already
public via the Website's own product pages):

1. **Variant-level** (`product_id`, `variant_id`, `xid`, `template_xid`,
   `sku`, `is_active`, `is_public`, `seo_slug`) for all 237 `product_variants`
   rows, joined to `catalog_products` and `product_seo_contents`
   (`entity_type='variant'`) — 0 variant-level SEO slugs exist (this
   repository's SEO model is template/product-level, not variant-level, per
   `lib/catalog/types.ts`'s own `ProductSeoContent.entityType` design).
2. **Product-level** (`product_id`, `template_xid`, `is_public`, `slug`,
   `locale`) for all 13 `catalog_products` rows joined to
   `product_seo_contents` (`entity_type='product'`) — exactly 3 rows carry a
   real `fa` slug: `rebar-aj340` (`product_tmpl_rb_aj340`),
   `hot-rolled-plate-s355jr` (`product_tmpl_sh_hr_s355jr_plate`),
   `square-hollow-section-shs` (`product_tmpl_pf_shs`) — matching the
   already-established DAR-045 "3 launch templates" baseline exactly.

Before any mutation, the exact **full row state** (every column) of the two
target rows chosen for the migration test — and their two owning
`catalog_products` rows — was also captured, specifically so the rollback
step could restore them byte-for-byte rather than approximately.

**Target rows chosen** (both deliberately non-public, `is_public = 0`, to
minimize any blast radius even though staging never serves live traffic):

- Variant `01M19CWBRW0ANQ9F1JEPG06VHZ` (`xid = ahanassa_marketplace.product_sh_hr_s235jr_s25x1500x6000`, product `01M19CWBRTX7R2NRDC31VN6048`, `template_xid = ahanassa_marketplace.product_tmpl_sh_hr_s235jr_plate`)
- Variant `01M19CWBRY03V6MJCVFXMVDADD` (`xid = ahanassa_marketplace.product_sh_hr_s355jr_s4x1500x6000`, product `01M19CWBRW1N2HS9EXKMQ2A644`, `template_xid = ahanassa_marketplace.product_tmpl_sh_hr_s355jr_sheet`)

# SYNC METHOD

Live Odoo could not be reached from this session (no credential/network
access, and out of scope per the task's own "do not change backend"
constraint). Per the task's own explicit allowance ("If live Odoo cannot be
queried safely, use a captured/mock payload derived from the authoritative
backend handoff and existing known catalog records"), a mock
`CatalogApiProduct[]` payload was constructed from:

1. **Two real legacy rows**, reconstructed from the two target staging rows'
   actual current column values (same `sku`/`commercial_size`/
   `classification`/`dimensions`/`nominal_weight`/`allowed_commercial_units`/
   `updated_at` as currently stored) — with their real legacy `id`/
   `template_id` (matching their currently-stored `xid`/`template_xid`
   exactly) plus **synthetic** `canonical_id`/`canonical_template_id`
   values (`CVAR-TESTVERIFY-0001`/`0002`, `CTMPL-TESTVERIFY-0001`/`0002`) —
   clearly marked as test data, chosen to be structurally impossible to
   collide with any real Odoo-issued value.
2. **One genuinely new canonical-only row** shaped exactly like the Angle
   pilot example in the backend handoff (`id: null`, `template_id: null`,
   `canonical_id: "CVAR-TESTVERIFY-NEW-0001"`, group `ANGLE`,
   `allowed_commercial_units: "kg, ton, meter"`, `section_size: null`,
   `commercial_size` populated) — `sku` prefixed `AA-TESTVERIFY-` so it can
   never collide with a real SKU.

**This is not a re-implementation.** The harness imports and calls the real
`planCatalogV1Sync` (`lib/catalog/sync.ts`) directly against the real
existing-variant read from staging, and applies the resulting plan using the
real SQL-builder functions (`buildInsertCatalogProductSql`,
`buildInsertVariantSql`, `buildMigrateCatalogProductTemplateXidSql`,
`buildUpdateVariantCommercialFieldsSql`, all from `lib/catalog/sync-sql.ts`)
executed via the real `wranglerExecuteArgs` helper
(`lib/catalog/editorial-cli.ts`) — the identical mechanism
`scripts/catalog-sync.ts` uses in real operation. The only script-specific
code is the same thin "loop over the plan and call `runD1`" glue
`scripts/catalog-sync.ts#applyPlanRemote` already contains (copied, not
reinvented, since that file has no exported entrypoint to import directly
without triggering its CLI `main()`). Run with `isFullPull: false`
(incremental) deliberately — the mock payload is a 3-row subset, not the
full catalog, so a full-pull run would have misread every one of staging's
other 234 real variants as "missing" and deactivated them; incremental mode
never touches deactivation at all, eliminating that risk structurally,
independent of the plan's own `toDeactivate` output (which was also
asserted empty before any write was issued, as a second layer of defense).

# BEFORE / AFTER COUNTS

| | Before | After apply | After rollback |
|---|---|---|---|
| `catalog_products` | 13 | 14 | 13 |
| `product_variants` | 237 | 238 | 237 |
| Distinct `xid` | 237 | 238 | 237 |
| Distinct `template_xid` | 13 | 14 | 13 |
| Rows with `CVAR-TESTVERIFY%` xid | 0 | 2 (migrated) + 1 (new) | 0 |
| Rows with `CTMPL-TESTVERIFY%` template_xid | 0 | 3 | 0 |

Exactly `+1` product / `+1` variant after apply (the one genuinely new
canonical-only row) — **not** `+3`/`+3`, which is exactly what would have
happened had the two legacy rows been wrongly duplicated instead of
migrated in place.

# DUPLICATION CHECK

Measured directly, not inferred, immediately after apply:
`duplicate_xid_groups: 0`, `duplicate_template_xid_groups: 0`,
`duplicate_sku_groups: 0`, `orphan_variants: 0` — identical to the pre-sync
baseline in kind (all zero), with `distinct_xid`/`distinct_template_xid`
tracking the total row count exactly (238/238, 14/14) both before and after,
proving every `xid`/`template_xid` value remained unique throughout.

# IDENTITY MIGRATION

Confirmed row-for-row, by internal id continuity (the strongest possible
proof of "migrated in place," not "recreated"):

- Variant `01M19CWBRW0ANQ9F1JEPG06VHZ` — **same internal id**, `xid` changed
  from `ahanassa_marketplace.product_sh_hr_s235jr_s25x1500x6000` to
  `CVAR-TESTVERIFY-0001`, **same** `product_id`
  (`01M19CWBRTX7R2NRDC31VN6048`, unchanged FK).
- Variant `01M19CWBRY03V6MJCVFXMVDADD` — **same internal id**, `xid` changed
  to `CVAR-TESTVERIFY-0002`, **same** `product_id`
  (`01M19CWBRW1N2HS9EXKMQ2A644`, unchanged FK).
- Product `01M19CWBRTX7R2NRDC31VN6048` — **same internal id**,
  `template_xid` changed from `ahanassa_marketplace.product_tmpl_sh_hr_s235jr_plate`
  to `CTMPL-TESTVERIFY-0001`.
- Product `01M19CWBRW1N2HS9EXKMQ2A644` — **same internal id**,
  `template_xid` changed to `CTMPL-TESTVERIFY-0002`.
- New canonical-only variant `01M2SSZB6QFMKTVTZXGHNQ5KCD` — inserted
  cleanly, `xid = CVAR-TESTVERIFY-NEW-0001`, `sku = AA-TESTVERIFY-NEW-0001`,
  correctly linked to a freshly-created product
  (`template_xid = CTMPL-TESTVERIFY-NEW-0001`).

The plan itself (captured before any write) also confirms the mechanism
directly: `toCreate.length === 1` (only the genuinely new row),
`toUpdate.length === 2` (both migrations, each carrying the resolved
`patch.xid`), `toDeactivate.length === 0` — matching the code's documented
design exactly, not merely its outcome.

# SEO / SLUG PRESERVATION

**Structurally guaranteed, not merely observed this run:** every SQL
statement the applied plan could possibly issue
(`buildInsertCatalogProductSql`, `buildInsertVariantSql`,
`buildMigrateCatalogProductTemplateXidSql`,
`buildUpdateVariantCommercialFieldsSql`, `buildDeactivateVariantsSql`) was
re-inspected directly in `lib/catalog/sync-sql.ts` — a repo-wide grep for
`product_seo_contents` across `lib/catalog/sync-sql.ts`,
`lib/catalog/repository.ts`, and `scripts/catalog-sync.ts` returns **zero
matches**. The catalog sync/migration write path cannot reach the SEO table
at all, by construction — not because this particular test happened not to
touch it. The pre-sync snapshot's 3 real published slugs
(`rebar-aj340`/`hot-rolled-plate-s355jr`/`square-hollow-section-shs`) belong
to products that were not among this test's mutation targets, and the
targets chosen were deliberately non-public rows with no SEO content to
begin with.

# RFQ IDENTITY

Confirmed directly from the applied (pre-rollback) row state — the exact
column `lib/rfq/catalog-preselection.ts`/`lib/rfq/service.ts` read verbatim
into `product_variant_xid`:

- **One migrated legacy product:** variant `01M19CWBRW0ANQ9F1JEPG06VHZ` —
  `xid = CVAR-TESTVERIFY-0001` (its real legacy `id`,
  `ahanassa_marketplace.product_sh_hr_s235jr_s25x1500x6000`, was never
  re-stored or sent).
- **One canonical-only product:** variant `01M2SSZB6QFMKTVTZXGHNQ5KCD` —
  `xid = CVAR-TESTVERIFY-NEW-0001` (there never was a legacy `id` to
  compare against — `id`/`template_id` were `null` in the payload).

No RFQ submission was actually issued (that would create a real business
side-effect, require a valid Turnstile pass, and is explicitly out of this
task's read-first/verification-only scope) — the proof is that the exact
column value RFQ code reads was empirically observed to hold the canonical
`CVAR-…` string for both cases, which is the entirety of what the RFQ path
depends on (confirmed by direct code re-inspection: neither
`catalog-preselection.ts` nor `service.ts` applies any transformation to
`xid` before using it as `product_variant_xid`).

# PRODUCTION SAFETY

- **Zero production D1 writes.** Every write in this task targeted
  `ahanassa-public-staging` exclusively — `wranglerExecuteArgs("staging", …)`
  was used throughout; no `production`-environment wrangler invocation was
  made.
- **Zero production D1 reads** in this task (staging was sufficient; the
  prior task's blocked production-read attempt was not repeated).
- **No Odoo file, module, or record touched or written.**
- **No product published.**
- **No destructive migration created** — no `migrations_public/*.sql` file
  was added or changed; this task only ran ordinary `INSERT`/`UPDATE`
  statements against staging, then reverted them with further `UPDATE`/
  `DELETE` statements, all against staging.
- **No push.**
- **No unrelated Website feature altered** — only the two deliberately
  chosen, non-public, synthetic-test-touched rows were ever mutated, and
  both were restored to their exact pre-test column values (verified via
  the captured full-row snapshot, not merely the identity columns).

# P3F READINESS

**READY**, with the caveat that this verification exercised the real
planner/SQL-builder code against a **mock** payload (Odoo could not be
reached), not a real Odoo API response. The mock payload's shape was
derived directly and precisely from the backend handoff's own documented
and cited examples (`docs/integrations/odoo/backend-handoff/ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`),
and from staging's own real, current row data for the legacy-migration
case — so the shape-level risk is low, but a first real production/staging
sync run against Odoo's actual live API response remains the final,
strongest confirmation once Odoo genuinely serves `canonical_id` (the
Angle/Channel templates are still `draft` in production as of the backend
handoff).

# REMAINING RISKS

1. **This was a 3-row test, not a full-catalog reconciliation run.** The
   real production catalog (237+ variants) has not been fully migrated in
   one pass; this proves the mechanism is correct at the row/template
   level, not that a 200+-page-spanning full sync completes without an
   unrelated issue (rate limiting, pagination edge case, etc. — orthogonal
   to the identity logic itself, and already covered by this codebase's
   existing plausibility/safety guards in `lib/catalog/sync-safety.ts`,
   untouched by this task).
2. **The mock payload's `canonical_id`/`canonical_template_id` values are
   synthetic**, not values Odoo actually issued for these two specific SKUs
   — the real Odoo-issued canonical values for currently-legacy-keyed
   production rows are unknown until Odoo's live API is actually queried
   with `canonical_id` present in its response (not yet observed for any
   row outside the backend handoff's own cited Angle/Channel dry-run
   payload).
3. **Staging is shared, persistent infrastructure.** Every mutation this
   task made was reverted, and the final state was verified to exactly
   match the pre-test baseline (13/237, 0 leftover test rows) — but any
   concurrent staging sync/editorial operation running during this task's
   brief mutated window (there is no evidence one occurred) could in theory
   have interleaved with it. No such interleaving was observed.

# GIT STATE

- HEAD: `52abc46a7605c24f0678324224a1b98bb4dc727e` (unchanged — no code was
  changed by this task, matching its own "documentation/evidence only,
  unless a real defect is discovered" instruction; no defect was found).
- Working tree before this report: clean except `tsconfig.tsbuildinfo`
  (excluded from all commits per the task's own note).
- This report and the `REPORT_BUNDLE_MANIFEST.txt` update are the only new
  files this task adds.
- The verification harness script itself was written and run entirely from
  this session's scratchpad directory (outside the repository) — it is not
  part of the Website codebase and is not committed.
