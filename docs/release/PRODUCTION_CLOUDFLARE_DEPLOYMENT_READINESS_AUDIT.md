# Production Cloudflare Deployment Readiness Audit

**Scope:** Audit only. No file modified, no workflow created, no deployment, no migration, no commit.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`, HEAD `8a4ce73`
**Date:** 2026-09-19
**Goal:** establish whether production is ready to receive a GitHub Actions deployment.
**Method:** Live read-only verification via `wrangler` (deployment status, version bindings, deployment history, D1 `SELECT`/`PRAGMA` against both production databases) plus direct source inspection of `wrangler.jsonc`, `lib/rfq/`, `lib/queue/`, `lib/catalog/`, `lib/processing/`, `app/api/rfqs/` and `.github/workflows/deploy-staging.yml`.

Every figure below was observed in this session. Production D1 was read with plain `SELECT`/`PRAGMA` statements only — no `d1 migrations list` (which can initialise the migrations table as a side effect), no write of any kind.

---

# RESULT

**NOT READY. One blocker is severe and, as far as this audit can determine, has never been documented.**

The production Worker infrastructure is in excellent shape — every binding, database ID, secret, variable and compatibility setting matches `wrangler.jsonc` exactly, and a full rollback history exists. The pipeline design work is done. What is missing is not workflow code.

**Deploying current `main`-line application code to production today would break RFQ submission completely.**

`lib/rfq/repository.ts:92` inserts a `length_mm` column into `rfq_items`. Production's `rfq_items` table **does not have that column** — migration `migrations/0005_rfq_length_mm.sql` has never been applied there, confirmed by direct `PRAGMA table_info`. The insert runs inside a single `db.batch([...])` alongside the `rfqs` and `rfq_contacts` inserts, so the failure is atomic: **no RFQ row, no contact row, no item rows**. `app/api/rfqs/route.ts:109` then returns `500 SERVICE_UNAVAILABLE`.

The submitted lead is lost at the door. That directly violates the architecture's own core invariant — *"An accepted RFQ must be durably persisted in D1 before Odoo sync — Odoo downtime must never lose a lead"* (`CLAUDE.md` §5). Here the loss happens before Odoo is ever involved.

This is the **only** hard failure among the five pending migrations. The other four degrade gracefully behind existing `try`/`catch` boundaries. But this one sits on the site's primary conversion path, and it fails silently from the operator's point of view — the homepage, catalog and every other page would render fine.

---

# 1. CURRENT PRODUCTION WORKER

All live-verified.

| Item | Value |
| --- | --- |
| Worker name | `ahanassa-production` |
| Active version | `b07d8697-620c-485c-8fed-21b893ab602c` @ **100%** |
| Version created | 2026-09-03T19:00:45.838Z |
| Deployment created | 2026-09-03T19:00:48.218Z — **16 days old** |
| Author | `cyansanatiranian@gmail.com` |
| Handlers | `fetch`, `queue`, `scheduled` |
| **Compatibility date** | **`2026-08-26`** (inherited from top-level `wrangler.jsonc`) |
| Compatibility flags | none declared |
| Source | `version_upload` (manual, not CI) |
| Tag / Message | none — **no release identity recorded** |

## Secrets (names only; no value read or printed)

| Secret | Present |
| --- | --- |
| `ODOO_RFQ_API_TOKEN` | ✅ |
| `TURNSTILE_SECRET_KEY` | ✅ |
| `ODOO_API_KEY` (deprecated) | ✅ correctly **absent** — per DAR-041, nothing in the runtime calls it |

## Bindings on the live version

```
env.ODOO_SYNC_QUEUE (ahanassa-odoo-sync-production)   Queue
env.DB_OPS    (7240a6a7-c293-4e6e-baf3-95838a3c2944)  D1 Database
env.DB_PUBLIC (73ba6b50-ef57-4d89-baa9-617a0b0af127)  D1 Database
env.IMAGES                                            Images
env.RFQ_RATE_LIMITER (5 requests/60s)                 Rate Limit
env.ASSETS                                            Assets
env.APP_ENV ("production")                            Environment Variable
env.ENABLED_PRICE_PROVIDERS ("")                      Environment Variable
env.HOMEPAGE_RANKING_MODE ("base")                    Environment Variable
env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ("0x4AAAAAAEi2RZ3NHcqTk0ej")  Environment Variable
env.ODOO_BASE_URL ("https://odoo.ahanassa.com")       Environment Variable
env.ODOO_CRM_TEAM_ID ("1")                            Environment Variable
env.ODOO_DATABASE ("ahanassa")                        Environment Variable
env.PRICE_STRIP_ENABLED ("false")                     Environment Variable
```

## D1 databases — live metadata

| | `DB_PUBLIC` | `DB_OPS` |
| --- | --- | --- |
| Name / ID | `ahanassa-public-production` · `73ba6b50-…0b0af127` | `ahanassa-ops-production` · `7240a6a7-…838a3c2944` |
| Jurisdiction / region | **`eu` / `EEUR`** | **`eu` / `EEUR`** |
| Tables | 16 | 9 |
| Size | 532 kB | 176 kB |
| Reads / writes (24 h) | 321 / 36 | 289 / 0 |
| Rows read (24 h) | **22,053** | 1,442 |

22,053 rows read in 24 hours is real page-serving traffic — the production data layer is live and healthy. `DB_OPS` at 0 writes simply means no RFQ was submitted in that window.

---

# 2. `wrangler.jsonc` `env.production` vs ACTUAL CLOUDFLARE

| Setting | `wrangler.jsonc` | Live Cloudflare | Match |
| --- | --- | --- | --- |
| Worker name | `ahanassa-production` | `ahanassa-production` | ✅ |
| `compatibility_date` | `2026-08-26` (inherited) | `2026-08-26` | ✅ |
| `main` handlers | `fetch` + `queue` + `scheduled` | `fetch, queue, scheduled` | ✅ |
| `DB_OPS` | `ahanassa-ops-production` / `7240a6a7-…` | same ID | ✅ |
| `DB_PUBLIC` | `ahanassa-public-production` / `73ba6b50-…` | same ID | ✅ |
| Queue producer | `ahanassa-odoo-sync-production` | same | ✅ |
| Queue consumer + DLQ | `…-production` + `…-production-dlq`, `max_retries: 5` | attached | ✅ |
| Rate limiter | ns `2001`, 5 req/60 s | `5 requests/60s` | ✅ |
| `IMAGES` / `ASSETS` | declared | bound | ✅ |
| `workers_dev` | `true` | `*.workers.dev` publicly reachable (`200`) | ✅ |
| `routes` | `www.ahanassa.com` custom domain | live, serving | ✅ |
| `triggers.crons` | `*/5 * * * *`, `0 */3 * * *`, `30 2 * * *` | 3 registered | ✅ |
| All 8 `vars` | as listed above | identical values | ✅ |
| Secrets | documented as Cloudflare Secrets, never in Git | both present | ✅ |

**Configuration/reality alignment is exact — zero drift.** `wrangler.jsonc` can be trusted as the source of truth for a production deployment. This is a genuinely good result and removes an entire class of risk from the first automated release.

**Two stale comments in the same file** (annotation only; no configuration effect, but actively misleading):

1. The `env.production` header comment asserts *"no production Worker has been deployed … `ahanassa.com`/`www.ahanassa.com` remain unchanged, still served by the legacy Vercel deployment."* False for `www` since 2026-09-02, and contradicted by the `routes` array eleven lines below it.
2. The top-level `triggers` comment states *"staging is explicitly `[]` (zero)"*. Staging has had `["0 */3 * * *"]` since 2026-09-19.

---

# 3. PENDING D1 MIGRATIONS

Read directly from `d1_migrations` on both production databases, then **independently corroborated at the schema level** with `sqlite_master` and `PRAGMA table_info` — so this is not an inference from the migrations bookkeeping table alone.

## `DB_PUBLIC` — 6 applied, **4 pending**

| Migration | State | Applied |
| --- | --- | --- |
| `0001_catalog_schema` … `0003_catalog_sync_state` | ✅ applied | 2026-08-30 → 08-31 |
| `0004_public_price_quotes` | ✅ applied | 2026-09-03 18:59:02 |
| `0005_homepage_projection` | ✅ applied | 2026-09-03 18:59:03 |
| `0006_route_redirects_308` | ✅ applied | 2026-09-03 18:59:03 |
| **`0007_processing_groups`** | ❌ **PENDING** | — |
| **`0008_price_variant_identity_and_provider_policy`** | ❌ **PENDING** | — |
| **`0009_catalog_group_labels`** | ❌ **PENDING** | — |
| **`0010_homepage_eligibility`** | ❌ **PENDING** | — |

Schema confirmation — tables absent: `public_processing_groups`, `processing_sync_state` (0007), `price_provider_policies` (0008), `catalog_group_labels` (0009). Columns absent: `homepage_product_rank.show_on_homepage` (0010), `price_display_products.variant_key` (0008).

## `DB_OPS` — 4 applied, **1 pending**

| Migration | State | Applied |
| --- | --- | --- |
| `0001_rfq_ops_schema` … `0003_odoo_rfq_api_handoff` | ✅ applied | 2026-08-29 → 08-31 |
| `0004_rfq_contacts_phone_iso2` | ✅ applied | 2026-09-03 18:58:35 |
| **`0005_rfq_length_mm`** | ❌ **PENDING** | — |

Schema confirmation — `rfq_items` columns are `id, rfq_id, line_number, source, category_ref, product_ref, variant_ref, unit_ref, category_label, product_label, variant_label, unit_label, freeform_title, size_text, quantity_text, quantity_value, quantity_scale, description, odoo_product_id, odoo_uom_id, resolution_status, created_at, updated_at, sku_snapshot`. **No `length_mm`.**

## Runtime impact matrix — what each pending migration actually breaks

| Migration | Code that requires it | Failure boundary | Consequence |
| --- | --- | --- | --- |
| **`DB_OPS` 0005** | `lib/rfq/repository.ts:92` (INSERT), `lib/queue/consumer.ts:138` (SELECT) | **none — inside `db.batch()`** | 🔴 **RFQ submission dies. Lead lost.** |
| `DB_PUBLIC` 0007 | `lib/processing/public-repository.ts:64`, `repository.ts:49-89` | `try`/`catch` at `app/[locale]/layout.tsx:76` → `HEADER_SERVICE_GROUPS_READ_ERROR` | 🟡 Header Services degrades to a plain `/services` link |
| `DB_PUBLIC` 0009 | `lib/catalog/editorial-repository.ts:1060` (LEFT JOIN) | `try`/`catch` at `app/[locale]/layout.tsx:58` → `HEADER_PRODUCT_FAMILIES_READ_ERROR` | 🟡 Header Products dropdown degrades |
| `DB_PUBLIC` 0010 | `editorial-repository.ts:669` `HOMEPAGE_ELIGIBILITY_WHERE_CONDITION` | `try`/`catch` at `app/[locale]/page.tsx:178` → `HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR` | 🟡 Product Showcase section omitted |
| `DB_PUBLIC` 0008 | `lib/pricing/repository.ts` (`variant_key`) | gated by `PRICE_STRIP_ENABLED="false"` — query never executes | 🟢 No impact |

## The blocker, stated precisely

```sql
INSERT INTO rfq_items (
  id, rfq_id, line_number, source, category_ref, product_ref, variant_ref, unit_ref,
  category_label, product_label, variant_label, unit_label, freeform_title, size_text,
  quantity_text, quantity_value, quantity_scale, description, sku_snapshot,
  length_mm,                                   -- ← column does not exist in production
  resolution_status, created_at, updated_at
) VALUES (...)
```

This statement is element 3+ of a `db.batch([...])` whose first two elements insert the `rfqs` and `rfq_contacts` rows (`lib/rfq/repository.ts:55-93`). D1 batches are atomic, so a `no such column: length_mm` error discards **all three** inserts. `app/api/rfqs/route.ts:98-110` catches it, logs a structured `rfq.submit / result: error` line with no PII, and returns `500 { ok: false, code: "SERVICE_UNAVAILABLE" }`.

Two properties make this worse than a typical migration gap:

- **It is invisible from the outside.** Every page renders normally; only a real customer pressing Submit discovers it, and they simply see a failure.
- **The graceful-degradation architecture does not help.** The other four migrations are protected by deliberate `try`/`catch` boundaries that drop a section and keep the page healthy. The RFQ path has no such boundary by design — persistence is supposed to be all-or-nothing.

Migration `0005` itself is purely additive (`ALTER TABLE rfq_items ADD COLUMN length_mm INTEGER`, nullable) and its own header notes production held 0 rows when it was written. Applying it is cheap and backward-compatible with the currently-live older Worker, which never references the column.

---

# 4. STAGING WORKFLOW — WHAT MUST DIFFER FOR PRODUCTION

## Current `.github/workflows/deploy-staging.yml`

Workflow ID `361701517`, `state: active`, two successful runs (2026-09-19). Structure: `workflow_dispatch` only → typed `confirm: "deploy-staging"` gate (before checkout) → checkout `deploy_ref` with `persist-credentials: false` → resolve + verify `DEPLOYED_SHA` → **inline fail-closed staging resource assertion** (before `setup-node`) → Node 24 → `npm ci` → `npm test` → `tsc --noEmit` → `npm run build` → `npx vinext-cloudflare deploy --env staging`. `environment: staging`, `permissions: contents: read`, `concurrency: deploy-staging` with `cancel-in-progress: false`. **No migration step, deliberately.**

## Required differences

| Dimension | Staging today | Production requirement | Why |
| --- | --- | --- | --- |
| **Approval** | none — `staging` env has only a branch policy, no reviewers | **Required reviewer(s)** on a purpose-built `production` environment | The typed `confirm` string is anti-fat-finger, not approval. ⚠️ **Prerequisite:** the existing GitHub environment named `Production` is a **Vercel leftover with zero protection rules** — it must be deleted or renamed first, or an author will reference it and get a gate that gates nothing |
| **Secrets** | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, environment-scoped to `staging` | Same two names, scoped to the new `production` environment. Verify the token's scope covers `versions upload`/`versions deploy` on `ahanassa-production` and is no broader than needed | Env-scoped secrets are never delivered to a job that fails the gate. There are **no repository-level Actions secrets** today — correct posture for a public repo, and it should stay that way |
| **Environment** | `environment: staging` | `environment: production`, with a deployment branch policy (not `null`) | Staging's policy names exactly one branch; production needs equivalent scoping |
| **Confirmation string** | `deploy-staging` | `deploy-production` | Different literal so muscle memory cannot cross environments |
| **`deploy_ref` format** | any resolvable ref | **full 40-char SHA enforced** (`^[0-9a-f]{40}$`) | Staging tolerates a branch name for convenience; production must not |
| **Target assertion** | pins staging Worker + both staging D1 IDs + `APP_ENV=staging` + literal-free live-environment scan | Mirror pinning `ahanassa-production`, both production D1 IDs, `APP_ENV=production`, **plus** `routes` contains the `www.ahanassa.com` custom domain, `workers_dev === true`, and the exact 3-cron list — with a staging-identifier scan in the opposite direction | Guards against a deploy silently detaching the live custom domain, re-triggering the DAR-050 `workers.dev` regression, or changing cron registration as a side effect |
| **Provenance assertion** | n/a | **New:** the `deploy_ref` must match a `Deploy Staging` run with `conclusion: success`. Needs `permissions: actions: read` | This is what makes it *promotion* rather than a second deploy button |
| **Migration parity assertion** | n/a | **New:** fail if the deployed SHA carries a migration production has not applied | 🔴 **This is the control that catches today's blocker automatically.** Highest-value single addition |
| **Build** | `npm run build` | `CLOUDFLARE_ENV=production npx vinext build` | The env-flattening step is load-bearing (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §2) |
| **Deploy command** | `npx vinext-cloudflare deploy --env staging` (one-shot, straight to 100%) | **Two-phase:** `wrangler versions upload` → capture `NEW_VERSION_ID` → verify secrets on it → `wrangler versions deploy <id>@<pct>` | Verified from the adapter's own CLI help: `vinext-cloudflare deploy` offers no intermediate version handle. Two-phase yields a rollback target *before* traffic moves, enables staged rollout, and matches the existing documented manual production process |
| **Rollback target capture** | not captured | Capture the **current** production version ID before promoting; emit to job summary and outputs | A release whose rollback target was not recorded is not a completed release |
| **Smoke tests** | **none** — all smoke evidence to date was `curl`'d by hand | **Mandatory, blocking, in-workflow**, against `https://www.ahanassa.com` | A deploy that uploads and promotes but serves 5xx is currently reported as `success` — the pipeline's biggest blind spot |
| **Migrations** | none, deliberate | **none, deliberate** — unchanged | Migrations stay a separate, explicitly-approved operator action with their own recovery point |

## Smoke checks that must be present, given this audit's findings

Beyond the standard route matrix, three checks are specifically justified by what was found here:

| Check | Catches |
| --- | --- |
| `/request` → `308` → `/contact` (fa/en/ar) and `/industries` → `200` | Production currently `404`s both — these prove the new routing actually landed |
| `/products` renders ≥1 product **and** a detail page returns `200` with a localized `<h1>` | Proves `DB_PUBLIC` connectivity and catches migration `0009`/`0010` degradation |
| `/contact` returns `200` **with the RFQ `<form>` and its expected fields** | The closest automatable proxy for the RFQ path. **It does not prove submission works** — see below |

**Explicit limitation, stated rather than papered over:** no automated smoke test can verify RFQ *submission* without writing a real row. The established convention is a `(SYNTHETIC)`-labelled company and a `.invalid` email domain, used only on explicit owner request. Until such a check exists, **the `length_mm` blocker would not be caught by any smoke test** — it would only be caught by the migration parity assertion, or by a real customer. That is precisely why the parity assertion is the highest-value control in the table above.

Also worth noting: staging cannot validate the RFQ path end-to-end either, because it lacks `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` (an owner decision about blast radius — the Odoo RFQ API has one global token with no environment scoping). So the RFQ path has no pre-production proving ground at all.

---

# 5. ROLLBACK CAPABILITY

## Available history — live-verified

| Item | Value |
| --- | --- |
| Deployments recorded | **9** |
| Versions retained | **10** |
| Current deployment | `b07d8697-…` (2026-09-03T19:00:48Z) |
| **Immediately-prior deployment** | `c3650d51-b3b1-4589-a892-04c5adc9584e` (2026-09-02T15:44:10Z, "Secret Change") |
| Notable earlier targets | `2f1446e1` (secret change), the Stage 2B public-mode version (commit `39db058`, Basic Auth removed), `1e3d89fa` (Go-Live UI/SEO fixes), `878a1e82` (Multi-Item RFQ UI, commit `6926aaa`), `1ba5dadb` (all 4 secrets), `885a473e` (first version, code-only) |

**The immediate rollback target is safe.** `c3650d51` derives from the Stage 2B public-mode lineage (commit `39db058`, Basic Auth already removed), so `wrangler rollback` would **not** reintroduce the Basic Auth gate on the live domain. Worth stating explicitly because `885a473e` — the hard floor — *would*.

## Methods

```bash
# Immediately-prior version:
npx wrangler rollback --config dist/server/wrangler.json
# Explicit target (preferred — unambiguous about which version is restored):
npx wrangler versions deploy c3650d51-b3b1-4589-a892-04c5adc9584e@100 --config dist/server/wrangler.json
```

## Gaps

| Gap | Impact |
| --- | --- |
| **Zero git tags in the repository** | `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §1 requires tagging the deployed commit so §11's rollback has an unambiguous target. Never done, for any release |
| **No version carries a Tag or Message** | The live version `b07d8697` has neither. Its source commit is recorded only in prose, in a Stage-1 report |
| **No automated pre-deploy version capture** | Every rollback target so far was transcribed by hand into Markdown |
| **No production D1 Time Travel bookmark has ever been captured** | With five migrations pending and no down-migrations anywhere in the repository, the next production migration would run with no recorded restore point |
| **Worker rollback does not roll back D1** | Stated in `01-sources/DEPLOYMENT_ARCHITECTURE.md` §12. Mitigated here: all five pending migrations are additive and backward-compatible, so a Worker rollback after applying them is safe |
| **A `DB_OPS` Time Travel restore is a data-loss event** | It discards RFQs written after the bookmark. Must never be treated as a routine rollback step |

---

# READINESS SUMMARY

| Area | State |
| --- | --- |
| Worker infrastructure | 🟢 **READY** — exact config/reality match, all bindings and secrets correct, EU jurisdiction confirmed |
| Rollback mechanism | 🟢 **READY** — 10 versions retained, safe immediate target identified |
| Release identity | 🟡 **GAP** — zero tags, no version messages |
| `DB_PUBLIC` migrations | 🟡 **4 PENDING** — degraded UI only, all failures isolated |
| **`DB_OPS` migration `0005`** | 🔴 **BLOCKER** — breaks RFQ submission outright |
| Production GitHub environment | 🔴 **BLOCKER** — does not exist; the `Production` name is taken by a Vercel leftover with no protection rules |
| Named release approver | 🔴 **BLOCKER** — not designated; an approval gate without a named reviewer is decoration |
| In-workflow smoke gate | 🟡 **GAP** — does not exist in any workflow |
| Production D1 recovery point | 🟡 **GAP** — never captured |
| Dependency pinning | 🟡 **GAP** — 12 dependencies on `"latest"`; the lockfile holds today but SHA-promotion reproducibility rests on it |

---

# RECOMMENDED SEQUENCE

Ordered so nothing depends on an unfinished step. **Nothing here was executed.**

### Step 1 — Apply `migrations/0005_rfq_length_mm.sql` to production `DB_OPS` 🔴

The single highest-priority action, and it is independent of all pipeline work. Capture a `DB_OPS` Time Travel bookmark first, apply, then confirm with `PRAGMA table_info(rfq_items)` that `length_mm` exists — not only that the migrations table advanced.

Worth doing **now** rather than as part of a release: it is additive and backward-compatible with the currently-live Worker, so it carries no risk to what is serving today, and it removes the blocker from the release's critical path.

### Step 2 — Apply `DB_PUBLIC` `0007`–`0010`

Same procedure, own bookmark. Restores Header Services, the Products dropdown and the Product Showcase to full fidelity the moment new code lands, instead of shipping a visibly degraded site.

### Step 3 — Delete or rename the Vercel-leftover `Production` GitHub environment 🔴

Then create a purpose-built `production` environment with required reviewer(s), a deployment branch policy, and the two environment-scoped Cloudflare secrets.

### Step 4 — Name the release approver 🔴

An owner decision, not engineering work. Blocks Step 3's reviewer configuration.

### Step 5 — Pin `package.json` dependencies to concrete versions

Prerequisite for trusting SHA promotion over time.

### Step 6 — Backport the missing controls to staging first

Add the in-workflow smoke gate and pre-deploy version capture to `deploy-staging.yml`, plus `"workers_dev": true` on `env.staging` (still latent there). Prove them where failure is cheap, then exercise with one real staging deploy.

### Step 7 — Author `deploy-production.yml`

Per the differences table above and the full requirements in `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md`. **Include the migration parity assertion** — it is the control that would have caught Step 1's blocker automatically.

### Step 8 — Dry-run, then release at `@10`

Dispatch first with an invalid `deploy_ref`, then with a SHA that never reached staging, confirming each assertion fails closed before any build. Then a real release at 10%, promoting to 100% only after the smoke gate is green.

### Step 9 — Tag the release and write the report

Adopt `release/prod-YYYY-MM-DD-<short-sha>`, and record tag, SHA, `NEW_VERSION_ID` and `PREVIOUS_VERSION_ID`.

### Out of scope, deliberately

The **RFQ staging-credential question** (staging cannot test the RFQ path end-to-end because the Odoo RFQ API has one global token with no environment scoping) is an owner decision about blast radius, and the honest alternative — a scoped staging credential — is upstream Odoo work. It should be decided on its own merits, not resolved implicitly to unblock a release. Its consequence is recorded above: the RFQ path has no pre-production proving ground, which is exactly why Step 1 must not be deferred into the release.

The **domain cutover** (apex still on Vercel) is a separate change class with its own rollback mechanism and must not be bundled with a code release — see `docs/release/VERCEL_TO_CLOUDFLARE_CUTOVER_AUDIT.md`.

---

**NO CODE CHANGES. NO COMMIT. NO WORKFLOW CREATED.** This audit created exactly one file — this report. Every command issued was a read: `wrangler` status/version/deployment listings and D1 `SELECT`/`PRAGMA` statements, plus local source inspection. No write reached GitHub, Cloudflare, or either production database.
