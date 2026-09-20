# First Production Release-Candidate — Staging Verification Report

**Scope:** deploy the current release-candidate commit to **staging only**, verify the full staging gate for real, and stop. **No production deployment was dispatched, no production environment approval was performed, and no production Cloudflare/D1/secret state was touched.** Every mutating action in this task targeted `env.staging` (`ahanassa-bootstrap-staging`, `ahanassa-ops-staging`, `ahanassa-public-staging`) exclusively; every production-facing check was read-only.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Date:** 2026-09-20
**Purpose:** create fresh staging provenance for the exact current release-candidate commit ahead of the first production rollout — a real `Deploy Production` dispatch's A2 gate (staging-provenance log scan against workflow `361701517`) will find this commit proven, using the identical evidence model verified here.

---

# RESULT

## PASS

`f2202ab` was resolved to its full 40-character SHA, confirmed as the exact current tip of `origin/feat/header-hero-integrated`, and deployed to staging via a real `Deploy Staging` dispatch. Every step of the run succeeded, the deployed commit was independently confirmed by scanning the run's own job log for the literal provenance line (twice — once at checkout-resolution, once at the Cloudflare deploy step), and the full 10-group (14-assertion) staging smoke suite passed with zero failures. Staging's Worker version changed exactly as expected for this deploy and nothing else. Production's Worker version, traffic split, and D1 migration state were independently re-verified before and after this task and are byte-for-byte unchanged; `Deploy Production` was not dispatched at any point.

---

# Structured Result Fields

```
RESULT: PASS

RELEASE_CANDIDATE_SHORT_SHA: f2202ab

RELEASE_CANDIDATE_FULL_SHA: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

STAGING_WORKFLOW_ID: 361701517

STAGING_RUN_ID: 35532624537

DISPATCH_BRANCH: feat/header-hero-integrated

EXACT_SHA_PROVENANCE_LOG: "Deploying exact commit: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9" (job 106135798338, run 35532624537, step 4 "Resolve deployed SHA"); independently corroborated by "Deploying f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9 to Cloudflare env.staging (ahanassa-bootstrap-staging)" at step 11.

STAGING_DEPLOY: SUCCESS — all 14 substantive job steps succeeded (Require explicit confirmation, Checkout deploy_ref, Resolve deployed SHA, Assert staging resources, Setup Node.js, Install dependencies, Run tests, Type check, Build, Deploy application code, Capture staging release evidence, Upload staging release evidence, Staging smoke checks), none skipped or failed.

STAGING_SMOKE: PASS — "All staging smoke checks passed." / job summary: "All 10 checks passed (S1-S10)."

STAGING_SMOKE_ASSERTIONS:
  S1  homepage /                         -> 200                                            PASS
  S2  /fa redirect                       -> 308 -> /                                        PASS
  S3  /en                                -> 200                                             PASS
  S4  /services                          -> 200                                             PASS
  S5  catalog route /products            -> 200, published catalog slug discovered           PASS
  S6  catalog detail /products/<slug>    -> 200 (/products/equal-angle)                      PASS
  S7  RFQ page render /contact           -> 200, form server-rendered, NO RFQ submitted       PASS
  S8  unknown route                      -> 404                                             PASS
  S9  security headers (5 sub-checks)    x-content-type-options, x-frame-options,
                                          referrer-policy, permissions-policy,
                                          content-security-policy-report-only               PASS (5/5)
  S10 apex redirect (read-only, external) -> 308 -> https://www.ahanassa.com/                PASS
  Total: 10 check groups / 14 individual assertions, 0 failures.

STAGING_PROVENANCE: VERIFIED — independently re-derived post-deploy using the identical evidence model deploy-production.yml's A2 gate uses: scanned all successful Deploy Staging (workflow 361701517) runs (35532624537, 35428823679, 35426318953) for the literal line "Deploying exact commit: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9" — found exactly once, in run 35532624537 (this task's dispatch).

STAGING_WORKER_BEFORE: 6e79335c-1add-438b-8301-fa048feb3367 @ 100% (deployment f774cbc5-ed17-4574-80b8-8db2a875cd20, created 2026-09-19T07:16:17Z)

STAGING_WORKER_AFTER: 241a868f-6df0-4bf3-a4ed-07b94bf84a9d @ 100% (deployment 8120c739-c4bd-4947-8a64-d53be8a442f8, created 2026-09-20T19:33:17Z) — changed, exactly as expected for this deploy, and only this.

STAGING_D1_CHANGED_OUTSIDE_EXPECTED_DEPLOY: NO — DB_OPS and DB_PUBLIC both reported "No migrations to apply" before and after the deploy, on both staging databases. deploy-staging.yml never applies migrations by design; none were applied here.

PRODUCTION_WORKER_CHANGED: NO — b07d8697-620c-485c-8fed-21b893ab602c @ 100% (deployment b89094a1-74c7-46bf-afa2-67841cbe035e, created 2026-09-03T19:00:48Z) before and after this task, independently re-queried via `wrangler deployments list --env production`.

PRODUCTION_TRAFFIC_CHANGED: NO — 100% on the same version, before and after.

PRODUCTION_D1_CHANGED: NO — DB_OPS and DB_PUBLIC both "No migrations to apply," before and after, on both production databases.

PRODUCTION_DEPLOY_DISPATCHED: NO — `gh run list --workflow=deploy-production.yml` shows no run newer than 35531727338 (2026-09-20T19:15:48Z), which predates this task and belongs to the immediately preceding (separate, already-reported) fail-closed verification task. No pending production environment deployment was approved by this task.

READY_FOR_FIRST_PRODUCTION_10_PERCENT: YES — this task's SHA (f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9) now has verifiable staging provenance via the exact mechanism deploy-production.yml's A2 gate checks, and the full staging smoke gate passed against a real deploy of that exact commit. This is the artifact the architecture requires before a first production dispatch; it does not itself constitute or authorize that dispatch.

REMAINING_BLOCKERS: None classified as a hard blocker to staging readiness. One residual, already-documented and non-blocking gap carries forward unchanged from the prior fail-closed verification task: deploy-production.yml's own positive execution path (A3 onward, through Phase 1 `versions upload` and Phase 2 `versions deploy`) has been verified via static/unit tests and dry-run testing, but has never yet been exercised by a real, fully-provenanced production dispatch — because doing so would itself constitute the first real production release, which remains outside this task's authorization.
```

---

# Phase-by-Phase Evidence

## Phase 1 — Preflight

| Check | Result |
| --- | --- |
| Current branch | `feat/header-hero-integrated` |
| `f2202ab` resolved to full SHA | `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` |
| SHA is the exact tip of `origin/feat/header-hero-integrated` | Confirmed via fresh `git fetch` + `git merge-base --is-ancestor` |
| Working tree | Only pre-existing, unrelated drift (`REPORT_BUNDLE_MANIFEST.txt`, `tsconfig.tsbuildinfo` modified; `PUSH_MANIFEST.md`, `docs/audit/`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`, `docs/review/` untracked) — none touched by this task |
| Branch sync vs `origin` | `0 0` (fully synchronized) |
| Deploy Staging workflow | id `361701517`, `state: active` |
| `deploy-staging.yml` inspected | Accepts `deploy_ref` (mandatory, exact SHA); logs `Deploying exact commit: $DEPLOYED_SHA`; asserts staging-only resource identity (`EXPECTED_WORKER = 'ahanassa-bootstrap-staging'`, `ahanassa-ops-staging`, `ahanassa-public-staging`) before building; runs a 10-group, non-mutating smoke suite (S7 renders the RFQ form but never submits it) |

## Phase 2 — Staging Baseline (read-only, before dispatch)

| Metric | Value |
| --- | --- |
| Staging Worker version (serving) | `6e79335c-1add-438b-8301-fa048feb3367` @ 100% |
| Staging DB_OPS migrations | No migrations to apply |
| Staging DB_PUBLIC migrations | No migrations to apply |
| Pre-dispatch staging provenance for `f2202ab...` | **NOT_FOUND** (expected — this is why the task exists; confirmed by scanning both existing successful Deploy Staging runs and finding only the two previously-known SHAs) |
| Production Worker version (reference baseline, read-only) | `b07d8697-620c-485c-8fed-21b893ab602c` @ 100% |
| Production DB_OPS / DB_PUBLIC migrations | Both: No migrations to apply |

## Phase 3 — Dispatch

```
gh workflow run deploy-staging.yml \
  --ref feat/header-hero-integrated \
  -f deploy_ref=f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9 \
  -f confirm=deploy-staging
```

→ `https://github.com/rezachidotnet/ahanassa-website/actions/runs/35532624537`, dispatched at `2026-09-20T19:32:19Z` from `feat/header-hero-integrated`.

## Phase 4 — Monitor to Completion

Run `35532624537` reached `status: completed`, `conclusion: success`. Step-by-step conclusions (`gh api .../jobs`):

| # | Step | Conclusion |
| --- | --- | --- |
| 1 | Set up job | success |
| 2 | Require explicit confirmation | success |
| 3 | Checkout deploy_ref | success |
| 4 | Resolve deployed SHA | success |
| 5 | Assert staging resources (fail closed) | success |
| 6 | Setup Node.js | success |
| 7 | Install dependencies (immutable) | success |
| 8 | Run tests | success |
| 9 | Type check | success |
| 10 | Build | success |
| 11 | Deploy application code to Cloudflare Workers (staging) | success |
| 12 | Capture staging release evidence | success |
| 13 | Upload staging release evidence | success |
| 14 | Staging smoke checks | success |

No step was skipped or failed. `head_sha` on the run record (`f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9`) matches — expected consistency check only; the log-scan provenance line remains the model's actual source of truth, per the established methodology.

## Phase 5 — Staging Smoke Gate Verification

Full job log retrieved (`gh api .../jobs/{job_id}/logs`, ANSI-stripped, written to file before grepping — not piped directly), confirming every one of the 10 check groups / 14 individual assertions listed in `STAGING_SMOKE_ASSERTIONS` above passed, and the step's own terminal output read `All staging smoke checks passed.` with job-summary text `All 10 checks passed (S1-S10).` No RFQ was submitted (S7 explicitly verifies only that the form renders server-side).

## Phase 6 — Provenance Verification

Independently re-ran the exact evidence model `deploy-production.yml`'s A2 step uses against the now-current set of successful Deploy Staging runs (`35532624537`, `35428823679`, `35426318953`): the literal line `Deploying exact commit: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` is present in exactly one of them — this task's own run. **STAGING_PROVENANCE: VERIFIED.**

## Phase 7 — Post-Deploy Safety Check

| Check | Before | After | Changed as expected? |
| --- | --- | --- | --- |
| Staging Worker version | `6e79335c-...` @ 100% | `241a868f-6df0-4bf3-a4ed-07b94bf84a9d` @ 100% | **Yes** — this deploy, and only this |
| Staging DB_OPS / DB_PUBLIC migrations | No migrations to apply | No migrations to apply | No change (expected — this workflow never applies migrations) |
| Production Worker version | `b07d8697-...` @ 100% | `b07d8697-...` @ 100% | **No change** |
| Production traffic allocation | 100% | 100% | **No change** |
| Production DB_OPS / DB_PUBLIC migrations | No migrations to apply | No migrations to apply | **No change** |
| `Deploy Production` dispatched | — | No new run since `35531727338` (predates this task) | **Not dispatched** |
| Production environment pending-deployment approved | — | Not applicable — no run was dispatched | **Not approved** |

---

# What Was Deliberately Not Done

- `Deploy Production` was not dispatched at any point in this task.
- No pending production environment deployment was approved.
- No Cloudflare resource in `env.production` was created, modified, or deleted.
- No production D1 data was read-write touched, and no migration was applied to production or to staging.
- No production secret was read, set, rotated, or printed.
- No unrelated working-tree drift (`REPORT_BUNDLE_MANIFEST.txt`, `tsconfig.tsbuildinfo`, `PUSH_MANIFEST.md`, `docs/audit/`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`, `docs/review/`) was staged, committed, or pushed.
- No RFQ was submitted against staging or production.
- **No first production release was started.** This task stops here, as instructed.
