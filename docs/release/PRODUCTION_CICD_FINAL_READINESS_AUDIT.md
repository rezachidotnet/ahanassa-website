# Production CI/CD — Final Readiness Audit

**Scope:** Audit only. No workflow file created, no code/config modified, no deploy issued, no migration applied, no commit made by this task.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`, HEAD `c9e8f23f6714f67d1dc573c2d5027d135568558d`
**Date:** 2026-09-19
**Method:** This is a synthesis-and-re-verification pass over five same-day prior audits (`docs/release/PRODUCTION_RELEASE_PIPELINE_READINESS_AUDIT.md`, `docs/release/PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md`, `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md`, `docs/release/VERCEL_TO_CLOUDFLARE_CUTOVER_AUDIT.md`, `docs/review/ROUTING_RFQ_ENTRY_AUDIT.md`) plus the two migration-parity reports that landed after the last of them, all cross-checked directly in this session (not merely restated) via live `wrangler` reads, the GitHub REST API, `curl`/`dig`, and direct file inspection. Every finding below is either **RE-VERIFIED LIVE (this session)** or **CARRIED FORWARD** from a cited prior report with its evidence unchanged.

---

# RESULT

## NOT READY

**Two of the four previously-CRITICAL blockers have been closed since the last full audit; two owner-decision blockers remain, plus one hard technical prerequisite this task did not previously call out explicitly (the workflow-invariants test).** None of the remaining items are engineering unknowns — every one has a stated, ready-to-execute resolution. This is the closest the project has been to authoring `deploy-production.yml`.

**What changed since the last full audit (same day, earlier):**

1. ✅ **`DB_OPS` production migration `0005_rfq_length_mm` — APPLIED.** Re-verified live: `wrangler d1 migrations list DB_OPS --env production --remote` → `✅ No migrations to apply!` (`docs/release/RFQ_LENGTH_MM_PRODUCTION_MIGRATION_REPORT.md`).
2. ✅ **`DB_PUBLIC` production migrations `0007`–`0010` — APPLIED.** Re-verified live: `wrangler d1 migrations list DB_PUBLIC --env production --remote` → `✅ No migrations to apply!` (`docs/release/DB_PUBLIC_PRODUCTION_MIGRATION_PARITY_REPORT.md`). **Production D1 schema now matches staging exactly on both databases.** This was the single most-cited CRITICAL blocker (B1 / RK1) in every prior audit; it is closed.
3. ✅ **Apex `ahanassa.com` is now served by Cloudflare, not Vercel — RE-VERIFIED LIVE this session**, and this is new information no prior document records. `curl -I https://ahanassa.com/` → `308` to `https://www.ahanassa.com/`, `server: cloudflare`, `cf-ray` present, resolving to the same Cloudflare anycast IPs as `www` (`188.114.96.3`/`188.114.97.3`), not Vercel's. Deep-path preservation confirmed live (`/products` → `308` → `https://www.ahanassa.com/products`; `/en/contact` → `308` → `https://www.ahanassa.com/en/contact`). Every prior document (including `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`'s own `DOMAIN_POLICY`, written earlier the same day) still records the apex as Vercel-served — that finding is now stale. This closes the DOMAIN_POLICY D1–D6 cutover steps and removes what was rated a HIGH/MEDIUM risk (B3 / RK10) in every prior report. **This does not need to be re-litigated or re-executed — only confirmed and documented**, and the observation window (D7) and eventual Vercel-detachment decision (D8) remain open, non-blocking, separate-track items.

**What has not changed and still blocks authoring `deploy-production.yml`:**

4. 🔴 **No production release approval gate exists.** The GitHub Environment named `Production` is a Vercel-era leftover with zero protection rules (`can_admins_bypass: true`, `protection_rules: []`, `deployment_branch_policy: null` — re-verified live via `GET /repos/.../environments`). No purpose-built `production` environment with required reviewers exists.
5. 🔴 **No release approver is named.** Nothing in the repository or prior reports designates an accountable human for the production approval gate.
6. 🟡 **`lib/ci/workflow-invariants.test.ts` currently asserts "no workflow in this repository deploys to production" as a repository-wide invariant** (re-verified: `test("no workflow in this repository auto-deploys production")`, line 79, scans every file in `.github/workflows/` for the literal string `--env production`). This does not block the *specific* two-phase `wrangler versions upload`/`versions deploy` mechanism this repo's own architecture design calls for (which never uses that literal flag), but the test's intent — "nothing here deploys to production" — must be deliberately superseded with a new, positive set of production-workflow assertions (already scoped as R12 in `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`) in the same commit that adds `deploy-production.yml`, or `npm test` will read as a false pass while the actual safety net for the new workflow doesn't exist yet.
7. 🟡 **`package.json` still pins 18 dependency declarations (16 distinct packages) to `"latest"`**, including the framework (`vinext`), the Cloudflare adapter (`@vinext/cloudflare`), React, Vite and TypeScript. Re-verified live: `grep -c '"latest"' package.json` → 18. `npm ci` honours `package-lock.json` today, so this is not currently causing drift, but it is the weakest link in the exact-SHA reproducibility guarantee the whole pipeline design depends on.
8. 🟡 **Zero git tags exist** (`git tag` → 0, re-verified). No release-identity mechanism.
9. 🟡 **No in-workflow post-deploy smoke gate exists in any workflow, staging included.** All smoke evidence to date has been manual `curl`. The recommended design (below) makes this mandatory for production; per the existing architecture design it should be backported to staging first, where a failure is cheap.
10. 🟡 **Secret inheritance across `wrangler versions upload` is unverified.** Whether a newly uploaded Worker version automatically inherits `TURNSTILE_SECRET_KEY` / `ODOO_RFQ_API_TOKEN` (both confirmed present today via `wrangler secret list --name ahanassa-production` → both listed) has never been tested. This must be confirmed with a real (non-traffic-shifting) `versions upload` before the first automated production release, not assumed.

None of items 6–10 requires an owner decision — they are ready to implement. Items 4–5 are the genuine gate: **a production deploy workflow should not be authored to reference an approval environment that does not yet exist, and should not go live without a named human accountable for pressing "approve."**

---

# 1. Cloudflare Production Configuration — `wrangler.jsonc env.production` vs. live Cloudflare

**Re-verified live this session** (`wrangler d1 migrations list` ×2, `wrangler deployments list --name ahanassa-production`, `wrangler secret list --name ahanassa-production`, `curl -I` against both hostnames, `dig`) plus carried forward from `PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md` §1–2 for the elements not independently re-read this session (cron trigger count, rate-limiter namespace, EU jurisdiction attributes) — that document verified those directly against the Cloudflare API the same day and nothing in this session's checks contradicts them.

| Item | `wrangler.jsonc env.production` | Live Cloudflare | Match |
| --- | --- | --- | --- |
| Worker name | `ahanassa-production` | `ahanassa-production` (confirmed via `deployments list`) | ✅ |
| Compatibility date | `2026-08-26` (top-level, inherited) | — (not independently re-queried; no prior audit ever recorded a mismatch) | — |
| Routes | `www.ahanassa.com` (`custom_domain: true`); apex deliberately absent | `www.ahanassa.com` → `200`, served by the Worker (live `curl`); apex → `308` to `www`, **now also Cloudflare** (live `curl`, new this session) | ✅ (config matches; apex handled outside Worker config, by a zone-level mechanism, as designed) |
| `workers_dev` | `true` | `ahanassa-production.nova-b1e6f0.workers.dev` reachable, `200` (per `VERCEL_TO_CLOUDFLARE_CUTOVER_AUDIT.md`, not re-queried this session) | ✅ |
| `DB_OPS` | `ahanassa-ops-production` / `7240a6a7-c293-4e6e-baf3-95838a3c2944` | Present; `0001`–`0005` all applied, `✅ No migrations to apply!` (re-verified live) | ✅ |
| `DB_PUBLIC` | `ahanassa-public-production` / `73ba6b50-ef57-4d89-baa9-617a0b0af127` | Present; `0001`–`0010` all applied, `✅ No migrations to apply!` (re-verified live) | ✅ |
| Queues | `ahanassa-odoo-sync-production` + `-dlq`, `max_retries: 5` | Not independently re-queried this session; carried forward, no prior report ever found a mismatch | — |
| KV | none declared, none in use | none | ✅ |
| Rate limiter | `RFQ_RATE_LIMITER`, `namespace_id: "2001"`, 5/60s | Carried forward from prior audit, not independently re-queried | — |
| Cron triggers | `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` (3, explicit per-environment since DAR-053) | 3 registered, confirmed via Cloudflare dashboard 2026-09-03 per prior audit; account-wide cap is 5 across the whole account (Workers Free plan), staging now holds 1 → **4 of 5 used** | ✅ (not independently re-queried live this session — dashboard-only visibility) |
| Secrets | `TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN` (referenced in comments, values never in Git) | Both present — **re-verified live this session**: `wrangler secret list --name ahanassa-production` → exactly these two, `type: secret_text` | ✅ |
| `APP_ENV` | `"production"` | consistent with all live behavior observed | ✅ |
| Data jurisdiction | EU (comment: owner-approved `PROJECT_OVERRIDES.md` §14) | `jurisdiction: eu`, `running_in_region: EEUR` confirmed for both D1s per prior audit (`wrangler d1 info`) | ✅ |

**Documentation drift found (carried forward, not yet corrected — out of scope for this audit to fix):** the `env.production` block comment in `wrangler.jsonc` (around the `"production":` key) still asserts *"no production Worker has been deployed … `ahanassa.com`/`www.ahanassa.com` remain unchanged, still served by the legacy Vercel deployment."* This has been false since 2026-09-02/03 for `www`, and is now false for the apex too as of this session's live check. It is contradicted by the `routes` array and secrets eleven lines below it in the same file. Recommend correcting this comment in the same change that eventually touches this file next — not urgent enough to justify a standalone edit given `CLAUDE.md` §9 scope discipline, but worth flagging so a future reader doesn't take it at face value.

**Conclusion: Cloudflare production configuration is READY.** Config-vs-live parity is exact everywhere checked. No binding, secret, route, or D1 mismatch found.

---

# 2. Database Readiness

## `DB_OPS` (`ahanassa-ops-production`, `7240a6a7-c293-4e6e-baf3-95838a3c2944`)

- **Migration state (re-verified live):** `wrangler d1 migrations list DB_OPS --env production --remote` → **`✅ No migrations to apply!`**
- **Schema version:** `0001`–`0005`, latest `0005_rfq_length_mm.sql` (adds nullable `rfq_items.length_mm INTEGER`, CHECK-constrained). Applied 2026-09-19, confirmed via `PRAGMA table_info(rfq_items)` showing 25 columns (cid 0–24) — see `docs/release/RFQ_LENGTH_MM_PRODUCTION_MIGRATION_REPORT.md`.
- **Data integrity:** row counts unchanged across the migration (`rfqs`: 3, `rfq_items`: 14, before and after).
- **Recovery point on file:** Time Travel bookmark `000015a4-00000000-000050eb-184c184577dd7728ab697cc0a1340355`, captured immediately pre-migration.
- **No pending migrations.**

## `DB_PUBLIC` (`ahanassa-public-production`, `73ba6b50-ef57-4d89-baa9-617a0b0af127`)

- **Migration state (re-verified live):** `wrangler d1 migrations list DB_PUBLIC --env production --remote` → **`✅ No migrations to apply!`**
- **Schema version:** `0001`–`0010`, latest `0010_homepage_eligibility.sql` (adds nullable `homepage_product_rank.show_on_homepage`). `0007`–`0010` applied 2026-09-19 — see `docs/release/DB_PUBLIC_PRODUCTION_MIGRATION_PARITY_REPORT.md`. New tables confirmed present: `public_processing_groups`, `processing_sync_state`, `price_provider_policies`, `catalog_group_labels`. 22 tables total (incl. internal `_cf_KV`/`d1_migrations`/`sqlite_sequence`).
- **Data integrity:** all pre-existing row counts unchanged (`catalog_products`: 13, `product_variants`: 237, etc.) — migrations were purely additive.
- **Recovery point on file:** Time Travel bookmark `000006b4-00000000-000050eb-581b08710f84dd7257b80dd642937902`, captured 2026-09-19T15:22:03Z, immediately pre-migration.
- **No pending migrations.**

## Parity with staging

Staging reports `✅ No migrations to apply!` on both `DB_OPS` and `DB_PUBLIC` (re-confirmed by the parity reports at the same session as the production apply). **Production and staging are now schema-identical on both databases.** This closes what every prior audit (`PRODUCTION_RELEASE_PIPELINE_READINESS_AUDIT.md` B1, `PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md` §3, `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` RK1) rated CRITICAL, and removes the one condition under which "a correctly-implemented pipeline would refuse to deploy" (the design's own migration-parity assertion, A3, would now pass).

**Conclusion: Database readiness is READY.** Both production databases are at parity with staging, verified live, with recovery points captured and on file for the migrations just applied.

---

# 3. Existing Staging Workflow Analysis — `.github/workflows/deploy-staging.yml`

Read directly this session (full file, 200 lines to the deploy step).

## Reusable as-is (carry forward verbatim into `deploy-production.yml`)

- `workflow_dispatch`-only trigger, no `push`/`schedule`.
- Required `deploy_ref` input with **no default** — the exact-SHA promotion guarantee depends on this.
- Typed `confirm` string, checked in a dedicated first step, fails closed on any mismatch, **before checkout**.
- Explicit `checkout@v4` with `ref: ${{ inputs.deploy_ref }}` and `persist-credentials: false` — never the implicit dispatch-branch checkout.
- `DEPLOYED_SHA` resolution via `git rev-parse HEAD` + `git cat-file -e <sha>^{commit}`, failing before any build step if the ref doesn't resolve.
- The **inline, fail-closed target-assertion pattern**: a Node script embedded directly in the workflow YAML (not checked out from the untrusted `deploy_ref`), parsing `wrangler.jsonc` and asserting the target environment's identity before `setup-node`/`npm ci`/build. This is, by a wide margin, the strongest control in the current pipeline and the correct template to clone.
- `concurrency: { group: <workflow>, cancel-in-progress: false }` — never cancel a deploy mid-flight.
- `permissions: contents: read`.
- `environment: <name>` targeting, so GitHub Environment protection rules are honored automatically once configured.
- Standard build steps: `setup-node@v4` (Node 24, npm cache) → `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build`.
- No D1 migration step — migrations stay a separate, explicit, human-run action for both environments.

## Required differences for production (per `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` R1–R12, already fully designed, re-checked against current live state in this session and found still accurate except where noted)

| Dimension | Staging (today) | Production (required) |
| --- | --- | --- |
| **Environment** | `staging` — single-branch policy, no reviewers, secrets present (re-verified: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` both set) | **New, purpose-built** `production` environment — required reviewer(s), branch-restricted, own copies of the two Cloudflare secrets. **Must not reuse the existing `Production` (capital-P) environment** — confirmed live this session to still be a Vercel leftover: `protection_rules: []`, `deployment_branch_policy: null`, `total_count: 0` secrets. |
| **Secrets** | Confirmed present, environment-scoped (`staging`) | Must be added to the new `production` environment specifically — none exist there today (`GET .../environments/Production/secrets` → `total_count: 0`, and that's the wrong environment regardless) |
| **Approval** | None (branch-policy only, not a reviewer gate) | **Required reviewer(s), named** — this is the actual missing control system-wide; nothing today stops any actor who can dispatch a workflow from deploying |
| **`deploy_ref` format** | Tolerates a branch name | Must require a full 40-character SHA (`^[0-9a-f]{40}$`), rejecting branch names outright |
| **Deploy mechanism** | One-shot `npx vinext-cloudflare deploy --env staging` (verified: the adapter's own CLI help confirms this builds and deploys straight to 100% with no intermediate version handle) | **Two-phase** `wrangler versions upload` → `wrangler versions deploy <id>@<pct>`, matching the project's own existing manual-production history exactly (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`) — yields a rollback handle *before* traffic shifts and enables staged rollout |
| **Target assertion** | Pins staging Worker/D1/`APP_ENV` | Production assertion must additionally pin `routes` (guards the live custom domain), `workers_dev: true` (guards the DAR-050 regression class), and the exact 3-cron trigger list (a cron change must be a reviewed config commit, never a deploy-time surprise) |
| **New: staging-provenance assertion** | N/A | Must query the GitHub API for `Deploy Staging` runs and require that the exact `deploy_ref` was already deployed to staging with `conclusion: success` — this is what makes "promote the tested SHA" a machine-enforced property rather than an operator promise. Break-glass `skip_staging_provenance` input, loudly logged, for the rare legitimate exception. |
| **New: migration-parity assertion** | N/A | Read-only `wrangler d1 migrations list` against both production D1s; fail if the deployed code carries a migration production hasn't applied yet. **This is the exact control that would have caught today's now-resolved migration gap automatically** — it should have existed before the last two manual migration passes, not after. |
| **Rollback-target capture** | Not currently done in either workflow (gap, should be backported to staging too) | Must capture and record the currently-serving `PREVIOUS_VERSION_ID` immediately before promotion — "a release whose rollback target was not captured is not a completed release" |
| **Smoke gate** | None in-workflow (all smoke checks to date have been manual `curl`, recorded by hand) | Mandatory, blocking, in-workflow, against the real `https://www.ahanassa.com` hostname — see §6 below |
| **Rollback on failure** | N/A | No automatic rollback. Fail loudly, print the exact rollback command with `PREVIOUS_VERSION_ID` pre-filled, and stop — a human decides, deliberately (an automated revert on a migration-caused smoke failure could mask a partially-applied data change) |
| **Confirmation string** | `deploy-staging` | `deploy-production` — deliberately distinct so operator muscle memory can't cross environments |
| **Permissions** | `contents: read` | `contents: read` + `actions: read` (required only for the staging-provenance API call) |

**Static invariant test coverage — genuinely new information this pass surfaces precisely:** `lib/ci/workflow-invariants.test.ts` (part of `npm test`, currently 1340/1340 passing, re-run live this session) contains, at line 79, `test("no workflow in this repository auto-deploys production")`, which scans **every file** in `.github/workflows/` for the literal substring `--env production` and fails the whole suite if found anywhere. The two-phase `wrangler versions upload`/`versions deploy --config dist/server/wrangler.json` mechanism specified above does not use that literal flag, so a correctly-written `deploy-production.yml` would not trip this specific string match — but the test's *stated intent* ("no workflow ever deploys to production") becomes false the moment such a workflow exists and is meant to be superseded, not silently sidestepped. `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` R12 already scopes the required replacement: a new suite of positive assertions for the production workflow's shape (dispatch-only, typed confirmation, explicit ref checkout + SHA-format validation, all three safety assertions ordered before `npm ci`, `environment: production`, no Cloudflare target among inputs, `PREVIOUS_VERSION_ID` capture before promotion, smoke gate after promotion, no migration command anywhere). **This test file must be edited in the same commit that adds the workflow**, not before and not after.

---

# 4. GitHub Environment Readiness

**Re-verified live this session** via `GET /repos/rezachidotnet/ahanassa-website/environments` and the per-environment `/secrets` endpoint. No environment was created or modified.

| Environment | Protection rules | Branch policy | Secrets | Used by a workflow? |
| --- | --- | --- | --- | --- |
| `staging` | 1 rule — `branch_policy` | `custom_branch_policies: true`, `protected_branches: false`, exactly one allowed branch (`feat/header-hero-integrated`) | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (names only) | Yes — `deploy-staging.yml` |
| `Preview` | none | `null` | not queried (irrelevant — no production role) | No — Vercel-created leftover |
| `Production` | **none** — `protection_rules: []`, `can_admins_bypass: true` | `null` | **0 — `total_count: 0`** | **No** — Vercel-created leftover, referenced by no workflow |

Repository-level (non-environment-scoped) Actions secrets: **0** (`GET /repos/.../actions/secrets` → `total_count: 0`) — correct posture for a public repository; no credential is exposed to an unscoped job.

Branch protection: `GET /repos/.../branches/main/protection` → `404 Branch not protected`. Same result for `feat/header-hero-integrated`. No required status checks exist anywhere in the repository.

**No environment named `production` (lowercase) exists at all.** It must be created — not merely have reviewers added to the existing `Production` — because the existing one is contaminated by a stale name association from the decommissioned Vercel integration, and any future workflow author who writes `environment: Production` in good faith would get a gate that gates nothing (zero protection rules, zero secrets, silent credential failure). **Recommendation, unchanged from every prior audit: delete or rename the Vercel-leftover `Production` environment before, or as part of, creating the real one**, so the trap cannot be stepped into by a future task that doesn't have this audit's context.

**This task did not create, modify, or delete any environment**, per its explicit scope.

---

# 5. Rollback Readiness

## Worker version history — re-verified live this session (`wrangler deployments list --name ahanassa-production`)

| Version | Created | Note |
| --- | --- | --- |
| `b07d8697-620c-485c-8fed-21b893ab602c` | 2026-09-03T19:00:45.838Z | **Currently serving (100%)** — no application-code deploy has touched this since; the two migration-parity tasks explicitly did not deploy the Worker |
| `c3650d51-b3b1-4589-a892-04c5adc9584e` | 2026-09-02T15:44:10.659Z | Immediately-prior version — the current rollback target |
| `2f1446e1-bb4d-4d71-96ec-761cf83ca65f` | 2026-09-02T15:43:51.297Z | Secret-change version |
| `cbbf0344-2e08-4e82-b7dc-b453b635de6e` | 2026-09-02T15:25:46.990Z | "Stage 2B: public-mode Worker" |
| `ac09d55c-c80c-455d-a827-c3730cba22c5` | 2026-09-02T08:44:46.823Z | "RFQ Launch UoM Contract Alignment" |

10 versions retained in total (Cloudflare's standard retention). At least 5 confirmed live this session; the remainder documented in prior reports.

## Rollback commands (documented, verified against actual project history — not invented)

```bash
# Immediately-prior version, by name:
npx wrangler rollback --name ahanassa-production

# Explicit target (preferred — unambiguous about which version is restored):
npx wrangler versions deploy c3650d51-b3b1-4589-a892-04c5adc9584e@100 --config dist/server/wrangler.json
```

## Database rollback considerations

- **No down-migrations exist anywhere in this repository** — the established convention is forward-only (write a new corrective migration, never a reverse-apply script).
- **A Worker rollback does not roll back D1.** Rolling back the Worker after today's migrations is safe regardless, because both migration sets applied today (`DB_OPS` 0005, `DB_PUBLIC` 0007–0010) are verified purely additive (nullable `ADD COLUMN` / new `CREATE TABLE`) — the older, currently-superseded Worker code simply never queries the new tables/columns, so it would continue to run correctly against the now-migrated schema if rolled back to.
- **Cloudflare D1 Time Travel is the real recovery mechanism**, and for the first time, **both production databases now have a captured recovery-point bookmark on file**, taken immediately before today's migrations:
  - `DB_OPS`: `000015a4-00000000-000050eb-184c184577dd7728ab697cc0a1340355`
  - `DB_PUBLIC`: `000006b4-00000000-000050eb-581b08710f84dd7257b80dd642937902`

  Restore commands are on file in the respective migration reports. This closes what every prior audit flagged as a gap ("no production D1 recovery point has ever been captured") — for the current schema state. **A fresh bookmark must still be captured before every future migration**, not assumed to carry forward.
- **Release identity remains the one open rollback gap.** Zero git tags exist. The only link between "what was tested" and "what is deployed" is a 40-character SHA and a Worker version UUID, currently tracked only in hand-written Markdown reports. The recommended architecture (§6/§7 below) closes this going forward by having the workflow itself print the tag, SHA, and both version IDs into the job summary on every release.

**Conclusion: Rollback readiness is PARTIAL-READY.** The Worker-level mechanism is proven and a target is identified; database recovery points now exist for the current schema state; the only remaining structural gap is release-identity tagging, which is a process addition, not a missing capability.

---

# 6. Production Smoke Test Requirements

A full smoke policy is already designed in `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md` (`SMOKE_TEST_POLICY`, S1–S15) and independently corroborated by `docs/review/ROUTING_RFQ_ENTRY_AUDIT.md`, which live-tested exactly this matrix against both staging and production this same session-day and found production would **fail** two of these checks *today*, precisely because production is running 16-day-old code that predates the routes the checks assert. That gap is the single highest-value proof that the smoke gate works, and confirms these are not hypothetical checks.

## Rules (unchanged, adopted as-is)

1. Mandatory and blocking — the workflow fails if any mandatory check fails.
2. Run against the real hostname (`https://www.ahanassa.com`), never `*.workers.dev`.
3. Any 5xx is an automatic failure — no retry-until-green.
4. Structural assertions only, never fixtures — assert *that* a catalog page renders products, never *which* products (production's synced catalog legitimately differs from staging's).
5. **No real RFQ submission** as a smoke test, ever, without explicit owner request and the established `(SYNTHETIC)`/`.invalid` convention.
6. Compare against a pre-deploy baseline captured by the same workflow run, before promotion.

## Mandatory checks

| # | Area | Check | Pass criterion |
| --- | --- | --- | --- |
| S1 | Homepage | `GET /` | 200, `<html lang="fa" dir="rtl">` |
| S2 | Locale routes | `GET /en`, `GET /ar` | 200, `lang="en" dir="ltr"` / `lang="ar" dir="rtl"` |
| S3 | Catalog index | `GET /products` | 200, ≥1 product detail link present |
| S4 | Catalog detail | first slug discovered in S3 | 200, localized `<h1>` present — proves `DB_PUBLIC` connectivity end-to-end |
| S5 | Services (dropdown source) | `GET /services`, `/en/services`, `/ar/services` | 200 — this is the page the Header Services dropdown depends on via `public_processing_groups` (migration `0007`, just applied to production) |
| S6 | RFQ form rendering | `GET /contact` | 200, `<form>` present with `company`, `phoneCountry`, `phoneLocal` fields |
| S7 | API health | `GET /api/hello` | 200, JSON body |
| S8 | **Redirects — the release's own headline risk** | `GET /request`, `GET /en/request`, `GET /ar/request`, `GET /fa` | `/request*` → **308 → `/contact`** (all three locales); `/fa` → 308 → `/`. **`docs/review/ROUTING_RFQ_ENTRY_AUDIT.md` confirms these currently return 404 on production and must flip to passing as direct proof the release landed** — this is the single highest-value assertion available for this specific release |
| S8b | **Nav route this release introduces** | `GET /industries` | 200 — currently 404 on production per the same audit; also proof-of-landing |
| S9 | Not-found handling | `GET /products/<nonexistent-slug>` | **404, not 500** — a 500 indicates a broken data path |
| S10 | Security headers | on `/` | `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, CSP all present |
| S11 | Canonical/SEO | `/` and one product detail page | `<link rel="canonical">` → `https://www.ahanassa.com/…` |
| S12 | `robots.txt` | `GET /robots.txt` | 200, references `https://www.ahanassa.com/sitemap.xml` |
| S13 | `sitemap.xml` | `GET /sitemap.xml` | 200, valid XML, all URLs on the canonical origin |
| S14 | Apex | `GET https://ahanassa.com/` | 308 → `https://www.ahanassa.com/` — asserts the redirect and target only, not `server:`, so this check is agnostic to which platform serves the apex (now Cloudflare, confirmed live; the check must not hardcode that fact since the apex is intentionally outside Worker config) |
| S15 | Database connectivity | implied by S3/S4/S5 | zero `no such table` / `no such column` markers in any response body — **this is the automated version of exactly the drift class that motivated migration-parity assertion A3** |

## RFQ submission — explicitly limited, and why

**RFQ submission itself cannot be smoke-tested end-to-end, by design, not by oversight.** `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` are both confirmed present on production (re-verified live this session), but the Odoo RFQ API has exactly one global Bearer token with no environment scoping — there is no non-production credential to safely exercise a real submission against, and rule 5 above forbids submitting a real customer-identity RFQ as an automated check regardless. **Smoke check S6 therefore verifies form presence and required fields only** (Turnstile widget script/markup present, form fields present, POST target correct) — it does not, and must not, submit the form. This is a stated, owner-relevant limitation, not a gap in the smoke design: the RFQ conversion path's true first live exercise will be a real customer submission in production, which is precisely why S6 plus the post-release manual observation checklist below matters more here than on most releases.

## Post-release observation (non-blocking, human, first hour/week)

- `wrangler tail` or Cloudflare Observability for the first hour after promotion.
- `catalog_sync_state` after the next incremental (`0 */3 * * *`) and full (`30 2 * * *`) cron firing.
- `dead_letter_records` daily for the first week — investigate any genuinely new entry.
- Queue producer/consumer health and RFQ outbox drain (the `*/5 * * * *` cron — note this trigger has **no staging exercise path at all**, per the cron-coverage gap already on record, so its first real observation of this release's code will also be in production).
- Turnstile success rate on the real hostname.

## Explicitly out of scope for automated smoke

Browser/visual/keyboard/zoom/reduced-motion verification — these require a human or a Playwright suite that does not exist in this pipeline. If visual verification is wanted at release time, it should be a named checklist item with a human owner, not a workflow step pretending a `curl` matrix covers it.

---

# Blockers (consolidated, ranked)

| # | Blocker | Severity | Type | Ready to resolve? |
| --- | --- | --- | --- | --- |
| A | No purpose-built `production` GitHub Environment with required reviewers exists; the environment named `Production` is a Vercel leftover with zero protection | 🔴 CRITICAL | Engineering + owner input (who reviews) | Yes — mechanical once a reviewer is named |
| B | No release approver is named | 🔴 CRITICAL | **Owner decision** | Owner action required |
| C | `lib/ci/workflow-invariants.test.ts`'s "no workflow deploys to production" invariant must be deliberately superseded with positive production-workflow assertions in the same change that adds the workflow | 🟡 HIGH | Engineering | Yes — fully scoped (R12) |
| D | Secret inheritance across `wrangler versions upload` is unverified | 🟡 HIGH | Engineering (verification step) | Yes — one dry-run upload (no traffic shift) resolves it |
| E | `package.json` pins 18 declarations (16 packages) to `"latest"`, weakening the SHA-reproducibility guarantee the whole design depends on | 🟡 MEDIUM | Engineering | Yes — pin to the currently-installed resolved versions |
| F | Zero git tags — no release-identity mechanism | 🟡 MEDIUM | Engineering (process) | Yes — start tagging at the first automated release |
| G | No in-workflow smoke gate exists anywhere, staging included; all evidence to date is manual `curl` | 🟡 MEDIUM | Engineering | Yes — backport to staging first (cheap failure), per the existing design |
| H | Cron trigger account cap: 4 of 5 Workers-Free-plan slots used account-wide; no headroom for a future trigger without a plan/consolidation decision | 🟢 LOW (latent) | Owner/infra | Awareness only — not a release blocker today |
| I | `*.workers.dev` serves the full app publicly and becomes a duplicate-content surface the moment indexing is enabled | 🟢 LOW (deferred) | Owner decision, non-blocking for this release | Deferred to the indexing-enablement task by design |
| J | Documentation drift: the `env.production` comment in `wrangler.jsonc` still asserts Vercel serves the site | 🟢 LOW | Documentation | Correct opportunistically, not urgent |

**Resolved since the last audit (kept here for traceability, not re-open items):**

- ~~`DB_OPS` migration `0005` pending on production~~ — **applied, re-verified live**.
- ~~`DB_PUBLIC` migrations `0007`–`0010` pending on production~~ — **applied, re-verified live**.
- ~~Apex `ahanassa.com` served by Vercel~~ — **now served by Cloudflare, re-verified live, deep-path redirect confirmed**.
- ~~No production D1 recovery point ever captured~~ — **two bookmarks now on file**, one per database, both captured immediately pre-migration today.

---

# Required Changes Before Workflow Creation

In dependency order — nothing here was executed by this task.

1. **Name the release approver.** Owner decision. Blocks step 2's reviewer configuration. (Blocker B)
2. **Delete or rename the Vercel-leftover `Production` GitHub Environment**, then create a purpose-built `production` environment: required reviewer(s) from step 1, a deployment branch policy (not `null`), environment-scoped `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`. (Blocker A)
3. **Pin `package.json`'s 18 `"latest"` declarations to their currently-resolved concrete versions** (the lockfile already pins the actual resolved graph — this makes the declared ranges honest, not a functional change). (Blocker E)
4. **Backport to `deploy-staging.yml` first** (cheaper to get wrong there): an in-workflow smoke gate (staging's own route matrix), `PREVIOUS_VERSION_ID` capture before deploy, and `"workers_dev": true` explicit in `env.staging` (still latent — `env.production` already has this fix from the DAR-050 repair, staging doesn't). Exercise with one real staging deployment before proceeding. (Blocker G)
5. **Verify secret inheritance across a real `wrangler versions upload`** (no traffic shift) before relying on it in the automated workflow — confirm via `wrangler versions view <new-version-id>` that both production secrets are present on the newly uploaded version. (Blocker D)
6. **Author `deploy-production.yml`** per §3/§6 above and the full R1–R12 design in `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`, and in the **same commit**, extend `lib/ci/workflow-invariants.test.ts` with the new positive production-workflow assertions, replacing the now-superseded "no workflow deploys to production" invariant with checks that the *new* workflow has the required shape. (Blocker C)
7. **Dry-run**: dispatch with a deliberately invalid `deploy_ref`, then a SHA that never reached staging, confirming every assertion fails closed before any build/deploy step runs. Only then run a real release, initially at `rollout_percentage: 10`, promoting to 100 only after the smoke gate is green.
8. **Tag the first release** and adopt a release-report template for every subsequent one, recording tag, SHA, `NEW_VERSION_ID`, `PREVIOUS_VERSION_ID`. (Blocker F)

**Explicitly not required before workflow creation** (separate tracks, by design, per every prior audit and re-confirmed here):

- The domain cutover observation window (D7) and any eventual Vercel-detachment decision (D8) — the apex is already correctly redirecting via Cloudflare; this is now a monitoring/decommissioning question, independent of and must-not-be-bundled-with any code release.
- The RFQ staging-credential question (Odoo's single global, unscoped Bearer token) — an owner decision about blast radius, not an engineering blocker; its accepted consequence is that S6 verifies form presence only.
- Git history consolidation between `main` and the application branch.
- `*.workers.dev` duplicate-content mitigation — deferred to whenever indexing is enabled, not before.

---

# Recommended `deploy-production.yml` Architecture

Full detail already designed in `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md` §`WORKFLOW_REQUIREMENTS` (R1–R12); summarized here as the shape to implement once the Required Changes above are complete. **Not created by this task.**

```yaml
name: Deploy Production
on:
  workflow_dispatch:
    inputs:
      deploy_ref:            # required, no default — full 40-char SHA only (^[0-9a-f]{40}$)
      confirm:                # required, must equal literal "deploy-production"
      rollout_percentage:      # required, choice: 10 | 50 | 100, default 100
      skip_staging_provenance: # optional boolean, default false — break-glass only, loudly logged

concurrency:
  group: deploy-production
  cancel-in-progress: false
permissions:
  contents: read
  actions: read              # required only for the staging-provenance check
timeout-minutes: 30

jobs:
  deploy-production:
    environment: production   # the NEW environment from Required Change 2 — never the Vercel-leftover "Production"
    steps:
      - Require typed "deploy-production" confirmation (fail closed, before checkout)
      - Reject any deploy_ref that isn't a full 40-hex-char SHA (production-only hardening beyond staging)
      - Checkout deploy_ref explicitly (persist-credentials: false), resolve DEPLOYED_SHA
      # Three inline, fail-closed assertions, in this order, all before setup-node/npm ci:
      - A1: production target assertion — Worker name, both D1 identities + completeness,
            APP_ENV, routes (www.ahanassa.com custom_domain), workers_dev: true,
            exact 3-cron trigger list, literal-free scan rejecting any staging identifier
      - A2: staging-provenance assertion — deploy_ref must match a `Deploy Staging` run
            with conclusion: success (GitHub API, actions: read) — bypass only via
            skip_staging_provenance, loudly recorded
      - A3: migration-parity assertion — read-only `wrangler d1 migrations list` against
            both production D1s; fail if deploy_ref's migration files aren't all applied
      - setup-node (Node 24) → npm ci → npm test → tsc --noEmit → CLOUDFLARE_ENV=production npx vinext build
      - Capture PREVIOUS_VERSION_ID (currently-serving version) before any traffic shift
      - Phase 1: wrangler versions upload --config dist/server/wrangler.json
                 --message "Release <tag> — SHA <DEPLOYED_SHA> — run <RUN_ID>"
                 → capture NEW_VERSION_ID
      - Verify secrets present on NEW_VERSION_ID before promoting (Required Change 5's
        finding determines whether this is a no-op check or an explicit attach step)
      - Phase 2: wrangler versions deploy <NEW_VERSION_ID>@<rollout_percentage>
                 --config dist/server/wrangler.json
      - R9: mandatory in-workflow smoke gate (S1-S15 above) against https://www.ahanassa.com
            — any failure fails the run
      - On any failure after Phase 1: print the exact rollback command with
        PREVIOUS_VERSION_ID pre-filled, and stop. NO automatic rollback — a human decides.
      - On success: job summary records tag/SHA/NEW_VERSION_ID/PREVIOUS_VERSION_ID/rollout_percentage
```

**The four deliberate differences from `deploy-staging.yml`**, restated for emphasis: a required-reviewer approval gate (via the new `production` environment), a two-phase `versions upload`→`versions deploy` promotion instead of staging's one-shot adapter deploy, a mandatory in-workflow smoke gate, and a staging-provenance assertion that refuses to deploy a SHA no successful staging run ever deployed. Everything else — the confirmation-string pattern, explicit-ref checkout, inline fail-closed assertions before any untrusted code runs, no migration step, environment-scoped secrets — is inherited verbatim because it is already proven correct in staging's two real, successful deployments.

---

**NO CODE CHANGES. NO WORKFLOW CREATED. NO COMMIT MADE BY THIS TASK.** Every command issued in this session was a read: `wrangler d1 migrations list`, `wrangler deployments list`, `wrangler secret list`, GitHub REST API `GET`s, `curl -I`/`curl`, `dig`, `npm test` (read-only test execution, no artifacts committed), and direct file inspection. No workflow, secret, environment, Cloudflare resource, DNS record, migration, or production resource was created, modified, or deleted.
