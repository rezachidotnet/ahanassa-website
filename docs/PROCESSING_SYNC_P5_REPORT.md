# P5 — Website DB_PUBLIC Processing Read Model + Background Sync — Report

Date: 2026-09-04
Branch: `feat/header-frozen-v2` (unchanged)
Base HEAD at start and end: `b18d0a679651f1991efdf37c35f702c8121e613a` (not committed — see GIT STATUS)

## RESULT

`READY FOR P6 HEADER INTEGRATION` — with one caveat flagged up front: this task's brief asserted "Odoo P1–P4 and durability checkpoint have passed," but in the immediately preceding checkpoint task in this same session, no Odoo repositories (`/opt/odoo/addons/ahanassa_marketplace*`) were found on this machine, and that checkpoint was reported **FAIL/BLOCKED**. There is no independent way to verify the upstream Odoo state from this environment. Everything in this report is built against the JSON contract *given in the P5 task prompt*, not a live-verified API — flagged explicitly in code comments rather than laundered into a false "verified" claim.

## PREFLIGHT

- repo: `/Users/reza/Developer/ahanassa-website`
- branch: `feat/header-frozen-v2` (unchanged, not switched)
- HEAD: `b18d0a679651f1991efdf37c35f702c8121e613a` (unchanged)
- git status: clean at start
- D1 bindings: `DB_PUBLIC` (`migrations_public/`) + `DB_OPS` (`migrations/`) per `wrangler.jsonc`; DB_PUBLIC provisioned in staging+production, not yet in production traffic
- existing sync architecture: mature, proven Catalog sync pipeline in `lib/catalog/` (`odoo-api-client.ts` → `sync.ts` → `repository.ts`, orchestrated by `sync-runner.ts` + `scheduled-sync.ts`, DB-backed lease in `sync-state-repository.ts`, wired into `workers/entry.ts`'s `scheduled()` via 2 of production's 3 Cron Triggers)
- current Services hardcode: `lib/content/nav.ts:105-127` (`headerServiceGroups` const) — confirmed **untouched** this session (`git diff --stat` empty for `nav.ts`/`SiteHeader.tsx`)
- current DB_PUBLIC schema: migrations `0001`–`0006` (catalog, price quotes, homepage projection, redirects) — next available number was `0007`, used here

## EXISTING PRODUCT SYNC ARCHITECTURE

Fetch (`lib/catalog/odoo-api-client.ts`, already ETag-capable at the transport layer though unused by the catalog runner) → pure plan (`sync.ts`) → D1 apply (`repository.ts`, ULID ids, soft-deactivate-never-delete) → orchestrator (`sync-runner.ts`, full vs. incremental) → lease-guarded coordinator with durable state (`sync-state-repository.ts`, `scheduled-sync.ts`) → wired into `workers/entry.ts`'s `scheduled()`. A separate `evaluateFullSyncPlausibility` guard (`sync-safety.ts`) refuses an implausibly-small full pull, tuned to catalog's real scale (237 variants: `MIN_CATALOG_SIZE_FOR_GUARD=5`, `CATASTROPHIC_DROP_RATIO=0.5`). Testing convention: pure modules (`sync.ts`, `sync-safety.ts`, `odoo-api-client.ts`) are unit-tested; D1-touching orchestration (`repository.ts`, `sync-runner.ts`, `scheduled-sync.ts`) is **not** unit-tested directly (`cloudflare:workers` cannot load under plain `node --test`) — verified live against real D1 instead, per that code's own documented convention.

## CHOSEN PROCESSING SYNC ARCHITECTURE

**Option B** — a small Processing-specific adapter on shared primitives. Reused: D1 access pattern, ULID generation, the lease/durable-state repository shape, the "fail closed, never partially apply" control flow, and the conditional-GET transport shape. **Not** reused unchanged: `evaluateFullSyncPlausibility`'s ratio-drop guard — its `MIN_CATALOG_SIZE_FOR_GUARD=5` would always bypass at Processing's real scale (a handful of groups), and its 50%-drop threshold would incorrectly block a single legitimate group withdrawal. Processing's safety net instead is unconditional strict validation (fail closed on anything malformed) plus the structural empty-vs-malformed distinction task §10 asks for. No incremental/watermark concept either — the given contract has no `updated_since` filter, so every run is inherently a full pull, made cheap by ETag/304.

## FILES CREATED

- `lib/processing/odoo-api-client.ts` / `.test.ts` — Processing API client, ETag/304, strict shape validation
- `lib/processing/sync.ts` / `.test.ts` — pure domain validation + create/update/withdraw/republish planner
- `lib/processing/repository.ts` — D1 sync writes (explicit column allow-list)
- `lib/processing/public-repository.ts` / `.test.ts` — `listPublicProcessingGroups(locale)`, the only Header-facing read
- `lib/processing/sync-state-repository.ts` — lease + per-locale ETag + failure tracking
- `lib/processing/sync-runner.ts` — per-locale fetch→validate→plan→apply orchestrator
- `lib/processing/scheduled-sync.ts` — lease-guarded, all-3-locales, failure-isolated coordinator
- `lib/processing/network-isolation.test.ts` — static proof the read path can't reach the network
- `lib/processing/security-allowlist.test.ts` — proves a rogue upstream field never reaches a persistable object
- `migrations_public/0007_processing_groups.sql` — `public_processing_groups` + `processing_sync_state`

## FILES MODIFIED

- `lib/env.ts` — added `getOdooProcessingApiBaseUrl()` (reuses `ODOO_BASE_URL`, unauthenticated, unverified — documented)
- `workers/entry.ts` — `scheduled()` now also calls `runScheduledProcessingSync()` on the existing every-3-hours Catalog-incremental Cron branch, via its own `ctx.waitUntil` (failure-isolated from Catalog sync)

Confirmed **not** modified: `lib/content/nav.ts`, `components/layout/SiteHeader.tsx`, any Header component, `wrangler.jsonc` (no new Cron Trigger added).

## DB_PUBLIC SCHEMA

`public_processing_groups(id ULID PK, code, locale CHECK(fa/en/ar), name, sequence, is_active, source_updated_at, synced_at, created_at, updated_at)` with `UNIQUE(code, locale)` and `idx_..._locale_sequence`. `processing_sync_state(id='processing' singleton, last_attempted_at, last_success_at, consecutive_failure_count, last_failure_at, last_failure_reason_code, etag_fa/en/ar, lease_owner, lease_expires_at, created_at, updated_at)`. No Odoo integer ID column anywhere — `code` (the API's `id`) is the sole stable identity, per task §3.

## MIGRATION

`migrations_public/0007_processing_groups.sql` — applied and verified against **real local D1** (not just typechecked): `npx wrangler d1 migrations apply DB_PUBLIC --local` succeeded; fixture rows inserted and queried with the exact SQL `public-repository.ts` uses, confirming locale scoping, `is_active` filtering, `sequence, code` ordering, empty-locale returning `[]`, and the `UNIQUE(code, locale)` constraint rejecting a duplicate — all passed. Fixtures deleted afterward; `.wrangler/state` is gitignored, nothing leaked into git.

## UPSTREAM API VALIDATION

Two layers: transport-level shape check (`odoo-api-client.ts`, per-item type/non-empty checks) then batch-level domain check (`sync.ts#validateProcessingGroupsBatch`, duplicate-identity + `meta.total` consistency). Both fail closed with a `reasonCode`, never partially applying.

## LOCALIZATION STORAGE

Option B (one row per `code + locale`), matching this database's own existing `product_seo_contents` convention rather than inventing an `Option A` columnar pattern. Fallback-translation distinction (task §7) is **not implemented** — the given contract exposes no field for it; documented as a disclosed limitation in the migration file rather than a fabricated `name_is_fallback` column with no real signal behind it.

## SYNC ALGORITHM

Per locale: fetch (conditional GET) → 304 short-circuit (no DB write) → shape validation → domain validation → diff plan (create/update/withdraw/unchanged) → apply. All three locales run sequentially in one lease-guarded coordinator pass; one locale's failure never blocks or reverts another's success (proven structurally, not merely asserted, since each locale's D1 writes happen independently before any shared state is touched).

## ETAG / 304

Implemented at the transport layer (`If-None-Match`) and exercised by `sync-runner.ts` (unlike the Catalog path, which has the capability but never uses it). Per-locale ETag columns since the given contract doesn't state ETags are locale-invariant. A `304` is recorded as success with zero DB mutation — never as an error, never as a failure-counter increment.

## FAILURE BEHAVIOR

Enforced structurally: `repository.ts` writes are only reached after both validation layers pass. A failed/malformed fetch returns before ever calling `getAllProcessingGroupsForSync`/create/update/withdraw — DB_PUBLIC's existing rows for that locale are provably untouched in that code path.

## EMPTY DATASET BEHAVIOR

A well-formed `{data: [], meta: {total: 0}}` passes both validation layers (0 duplicates trivially, `0 === 0`) and is applied — withdrawing all currently-active rows for that locale, which is correct per task §10. A malformed empty-looking response (e.g. `meta.total` inconsistent with `data.length`) is explicitly rejected before reaching the planner — tested directly (`sync.test.ts`).

## WITHDRAWAL BEHAVIOR

Soft-withdraw only (`is_active = 0`, never `DELETE`), mirroring `lib/catalog/repository.ts#deactivateVariants`. A withdrawn code reappearing in a later valid batch is republished via the same `toUpdate` path, unconditionally setting `is_active = 1`.

## SYNC STATE

`processing_sync_state` singleton, tracked: last attempt/success, consecutive failure count + last failure reason, per-locale ETag, lease owner/expiry. No sync error detail is exposed publicly — only consumed by `scheduled-sync.ts`'s structured log line and future observability tooling.

## BACKGROUND EXECUTION

Deliberately **not** a new Cron Trigger — production already runs 3 of the account's Workers-Free 5-trigger cap (a real prior incident is documented in `wrangler.jsonc`). Piggybacks on the existing every-3-hours `CATALOG_INCREMENTAL_CRON` branch in `workers/entry.ts`, via its own independent `ctx.waitUntil` call so a throw in either job can't block the other.

## SERVER-SIDE REPOSITORY

`lib/processing/public-repository.ts#listPublicProcessingGroups(locale)` — D1-only, deterministic ordering, `is_active` filtering, empty array is a valid result, no hardcoded fallback, no import of any Odoo adapter (proven via `network-isolation.test.ts`, not just asserted in prose).

## READ MODEL CONTRACT

`{ id: string; name: string; sequence: number }` — minimal, matching task §17 exactly; `id` maps from the DB's `code` column.

## ROUTING / SLUG DECISION

No `/services/<slug>` route exists anywhere in the app (`app/[locale]/services/page.tsx` is a single flat page). Per task §18, the read model does not fabricate slugs — `PublicProcessingGroup` carries no `path`/route field at all. P6 is free to route every group to `/services` (matching how the current hardcoded `headerServiceGroups` already does), with routing decided entirely in P6, not here.

## CURRENT HEADER HARDCODE INVENTORY

`lib/content/nav.ts:105-127` — `HeaderServiceGroup` interface + `headerServiceGroups: Record<Locale, HeaderServiceGroup[]>` constant, imported directly into `components/layout/SiteHeader.tsx:10,56` (`const serviceGroups = headerServiceGroups[locale]`). Not removed, not modified. P6 will replace the `SiteHeader.tsx` import with a server-fetched `PublicProcessingGroup[]` prop (mirroring how `productFamilies` already flows through `app/[locale]/layout.tsx` → `SiteHeader`). No other duplicated Services source exists.

## SECURITY / ALLOW-LIST

Every `repository.ts` write statement names its bound columns explicitly (`security-allowlist.test.ts` proves no `.bind(...spread)` of an arbitrary object). A dedicated test round-trips a rogue upstream field (`supplier_cost`) through the real fetch→validate→plan pipeline and asserts the resulting create-plan object's keys are exactly `code/name/sequence/sourceUpdatedAt` — the rogue field cannot survive.

## OBSERVABILITY

`PROCESSING_SYNC {...}` structured JSON log line per run (environment, per-locale status/counts/reasonCode) — no secrets, no response bodies, matching `CATALOG_SYNC`'s own convention.

## TEST RESULTS

`lib/processing/` suite: **42/42 pass**. Full repo suite: **681/681 pass** (639 pre-existing + 42 new, zero failures, zero regressions).

## NETWORK ISOLATION RESULT

5/5 static-source tests pass, proving `public-repository.ts` imports neither Odoo adapter, contains no `fetch()` call, and depends only on `getPublicDb`.

## PRODUCT REGRESSION RESULT

All pre-existing Catalog/RFQ/Header tests still pass (681 total includes the full pre-existing 639). No shared file touched except the two listed above, neither of which any Catalog/RFQ/Header code depends on.

## PERFORMANCE REVIEW

Read query: single indexed `WHERE locale = ? AND is_active = 1 ORDER BY sequence, code` — no joins, no client fetch, no loading state. Verified against real local D1 with sub-millisecond query duration.

## PRODUCTION / EXTERNAL SAFETY

Confirmed: no Odoo writes (client is GET-only), no DB_PUBLIC production/staging migration applied (local only), no deploy, no push, no Cloudflare/Cron/DNS/secrets change.

## GIT STATUS

```
 M lib/env.ts
 M workers/entry.ts
?? lib/processing/
?? migrations_public/0007_processing_groups.sql
```

Branch unchanged (`feat/header-frozen-v2`), HEAD unchanged (`b18d0a6`). **Not committed** — the P5 task's git section authorizes staying on the branch and preserving existing work but does not explicitly instruct a commit, so none was made.

## OUT-OF-SCOPE CONFIRMATION

Header Services dropdown (`SiteHeader.tsx`, `nav.ts`) was **not modified**. Confirmed via `git diff --stat` (empty for both files) throughout this session.

## NEXT PHASE

`P6 — Header Services dropdown integration`

---

`DB_PUBLIC PROCESSING SCHEMA: PASS`
`BACKGROUND SYNC: PASS`
`LAST-KNOWN-GOOD SAFETY: PASS`
`SERVER READ MODEL: PASS`
`NO-LIVE-ODOO RENDER PATH: PASS`
`P5 REGRESSION: PASS`

`AHAN ASA PROCESSING WEBSITE SYNC: PASS`

*(with the caveat restated: this PASS covers the website-side sync/read-model architecture built against the given API contract, verified by 42 new tests + live local-D1 verification + zero regressions across 681 tests. It does not and cannot certify that the real upstream Odoo `/api/v1/processing/groups` endpoint exists or matches this shape — that remains unverified from this session.)*
