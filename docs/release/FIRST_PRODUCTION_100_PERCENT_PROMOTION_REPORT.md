# First Production 100% Promotion — Report

**Report date (UTC):** 2026-09-22
**Scope:** second, corrected dispatch of `promote-production.yml`, promoting the existing, verified 10% production canary to 100% with zero upload, then recording the resulting `STABLE_100` ledger row and resolving `BASE_PRODUCTION_SHA`.
**Related:** `docs/release/FIRST_PRODUCTION_PROMOTION_ATTEMPT_FAILURE_REPORT.md` (first attempt, run `35703109593`, safe fail), `docs/release/PROMOTE_PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`, `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md` (verification run `35567845828`), `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md`, `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (ledger), `docs/release/RELEASE_POLICY.md` §0, §11, §12.

---

## 1. Result summary

```text
RESULT:
PASS

FIRST_FAILED_PROMOTION_RUN:
35703109593

PROMOTION_RETRY_RUN_ID:
35719752606

PROMOTION_RETRY_RUN_URL:
https://github.com/rezachidotnet/ahanassa-website/actions/runs/35719752606

WORKFLOW_SHA:
19d59680b3bef01c1ed36a6a90cb6c30ba934d31

ENVIRONMENT_DEPLOYMENT_ID:
6589215336

RELEASE_SHA:
f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

CANARY_VERSION_ID:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

PREVIOUS_STABLE_VERSION_ID:
b07d8697-620c-485c-8fed-21b893ab602c

ROLLBACK_VERSION_ID:
b07d8697-620c-485c-8fed-21b893ab602c

PRE_PROMOTION_TRAFFIC:
10 / 90

POST_PROMOTION_TRAFFIC:
100 / 0

NEW_WORKER_VERSION_CREATED:
NO

WORKER_VERSION_COUNT_UNCHANGED:
YES

OBSERVATION_GATE:
PASS

OBSERVATION_STARTED_AT:
2026-09-22T10:57:20Z

OBSERVATION_ENDED_AT:
2026-09-22T11:07:13Z

OBSERVATION_OWNER:
rezachidotnet

PRODUCTION_SMOKE:
23 / 23

D1_CHANGED:
NO

SECRETS_CHANGED:
NO

ENVIRONMENT_PROTECTION_CHANGED:
NO

STABLE_100_LEDGER_ROW_APPENDED:
YES

BASE_PRODUCTION_SHA:
f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

BASE_PRODUCTION_SHA_RESOLVED:
YES

PROMOTION_POLICY_ENFORCEMENT_ACTIVE:
YES

GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE:
NO

CURRENT_POLICY_LIFECYCLE_STATE:
BOOTSTRAP_MERGED

PRODUCTION_RELEASE_COMPLETE:
YES

ROLLBACK_TARGET_PRESERVED:
YES

REMAINING_GOVERNANCE_ACTIONS:
see §9
```

---

## 2. Phase 0 — the fix was live before dispatch

| Check | Evidence |
| --- | --- |
| PR #11 merged | into `feat/header-hero-integrated`, 2026-09-22T09:09:52Z, merge commit `19d59680b3bef01c1ed36a6a90cb6c30ba934d31` |
| PR #12 merged | into `main`, 2026-09-22T09:11:02Z, merge commit `81a46f39bfb48ba065b5e9f6fd5ba341996bcd34` |
| Both workflow copies byte-identical | `sha256 3a880a5b96f48daeec7f8c5d56a2e21b57a18fa82c2359d8ee733aafa1fee189` on both branches |
| Defective `gh api … --jq --arg …` form absent | appears only inside the explanatory comment block; no executable occurrence |
| Corrected lookup present | `gh api …/runs/$VERIFY_RUN_INPUT/artifacts > file`, then `jq -r --arg n …` over that file |
| Workflow active / dispatchable | `Promote Production`, workflow id `364025513`, state `active` |

## 3. Phase 1 — evidence re-bound fresh

| Binding | Evidence |
| --- | --- |
| release SHA ↔ canary | `production-release-evidence-35533626395` (artifact `10612087790`): `new_version_id = 4a32c5f9…`, `deployed_sha = f2202ab5…` |
| stable ↔ rollback | same artifact: `previous_version_id = b07d8697…`; ledger `ROLLBACK_VERSION_ID = b07d8697…` |
| staging provenance | `staging_provenance_run = 35532624537` — `Deploy Staging`, `success`, `head_sha = f2202ab5…` |
| official verification | run `35567845828`, workflow `363097410` (Verify Production), `success`; artifact `production-verification-evidence-35567845828` = id `10624946203` (unchanged) |
| verification content | `smoke_result = PASSED (23/23)`, `verification_only = true`, `mutating_commands_issued = none`, `traffic_split = 10/90` |
| ledger state | single row for `f2202ab5…`, `LEGACY_IN_FLIGHT_RELEASE` — not rolled back / superseded / already promoted |

Note: the original Deploy Production run `35533626395` concluded `failure` — that is the documented inline smoke-harness defect (`PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md`), superseded for gating purposes by the official verification run above. Its evidence artifact is intact and was the binding source.

## 4. Phase 2 — the first failed attempt caused no drift

Run `35703109593` (`headSha 66c5f93c…`) — steps 1–6 success, **step 7 (verification-artifact binding) failure**, steps 8–16 skipped, including step 12 (the only traffic-mutating step). `SAFE_FAIL` confirmed.

Fresh live state before the retry: latest production deployment still `c0f3a66b-314b-4131-af53-eb86ee38d92d` (created `2026-09-20T19:53:08Z`, i.e. the original canary deploy) — **no deployment event after it**; newest Worker Version still `4a32c5f9…` (created `2026-09-20T19:53:03Z`) — **no version after it**; traffic `4a32c5f9…@10 / b07d8697…@90`, no third traffic-bearing version.

## 5. Phase 3 — fresh observation window (read-only)

`2026-09-22T10:57:20Z → 2026-09-22T11:07:13Z` (~10 minutes; no minimum asserted — `MINIMUM_OBSERVATION_DURATION = TBE`, `RELEASE_POLICY.md` §12). Owner: `rezachidotnet`.

| Criterion | Observation |
| --- | --- |
| Routes (fa/en/ar), catalog, not-found, apex, security headers | the workflow's own S1–S10 smoke suite executed locally, unmodified logic (timeout raised 20s→60s only for a slow local link): **23/23 OK** |
| RFQ / contact | `/contact`, `/en/contact`, `/ar/contact` → 200 with form fields and Turnstile widget markup. **No RFQ submitted.** |
| 5xx | 180 sampled GETs across 12 routes (fa/en/ar home, services, products, contact): **180 × 200, zero 5xx** |
| Worker exceptions | `wrangler tail` during a 60-request burst: 61 events, all outcome `ok`, **0 exceptions**; canary `4a32c5f9…` served 5, stable 56 — both versions exercised |
| Queue / DLQ | bindings intact (`ahanassa-odoo-sync-production` producer+consumer = `ahanassa-production`; DLQ consumer present). D1 `integration_outbox` = `published:3` (no `pending`/`retry`/`dead`); `dead_letter_records` = 2, both from 2026-09-01 and `resolved` — predate the canary. **Queue backlog depth: NOT OBSERVABLE** via wrangler CLI. |
| Security headers | `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`, `content-security-policy-report-only` present |
| Topology | re-read at window end: unchanged, `c0f3a66b…`, 10/90 |
| D1 migrations | `DB_OPS` 5 applied (last `0005_rfq_length_mm.sql`), `DB_PUBLIC` 10 applied (last `0010_homepage_eligibility.sql`); `wrangler d1 migrations list --remote`: none pending on either |
| Official verification | `35567845828` still the latest successful Verify Production run |

`observation_attestation = OBSERVATION_CONFIRMED_SAFE_TO_PROMOTE` was supplied only after the above were performed.

## 6. Phases 4–8 — snapshot, dispatch, approval, promotion

**Pre-dispatch snapshot:** traffic `4a32c5f9…@10 / b07d8697…@90`; Worker versions listed: 10 (newest `4a32c5f9…`); deployments listed: 10 (latest `c0f3a66b…`); D1 as §5; secrets (names) `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`; Environment `production`: required reviewer `rezachidotnet`, custom branch policy `feat/header-hero-integrated`. Wrangler's list output is capped, so counts alone are not treated as a delta signal — the version-ID set and latest deployment ID are.

**Dispatch:** `gh workflow run promote-production.yml --ref feat/header-hero-integrated`, inputs: `confirm=promote-production`, `release_sha=f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9`, `canary_version_id=4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed`, `stable_version_id=b07d8697-620c-485c-8fed-21b893ab602c`, `expected_canary_percent=10`, `expected_stable_percent=90`, `verification_run_id=35567845828`, `observation_owner=rezachidotnet`, fresh `observation_started_at`/`observation_ended_at` above, attestation literal. Run created 2026-09-22T11:08:00Z, status `waiting`.

**Approval:** the run halted at the `production` Environment gate. It was **not** self-approved by the agent; approved by `rezachidotnet` via GitHub. Same run continued — no re-dispatch.

**Run 35719752606 — all steps success:** input validation → release_sha exists → A1 production target → release-evidence binding → **verification-artifact binding (the step that failed in `35703109593`, now passing)** → ledger binding → pre-topology (10/90, 2 versions, no third) → D1 parity → Environment capture → **traffic shift** (`wrangler versions deploy 4a32c5f9…@100`, message `Production promotion - SHA f2202ab5… - run 35719752606`, "Deployed ahanassa-production version 4a32c5f9… at 100%") → post-promotion verification → smoke → evidence capture → upload.

## 7. Phase 9–10 — post-promotion verification

Workflow step 13: *"4a32c5f9… @ 100%, b07d8697… not traffic-bearing, no third version, Worker version count unchanged (10), D1/secrets/Environment protection unchanged."*

Independent, read-only re-check by the agent after the run:

| Item | Result |
| --- | --- |
| Live traffic | latest deployment `6c39f9a4-1f65-4cc4-8005-2ff0104ac1ba` (2026-09-22T11:17:16Z): `4a32c5f9…@100` only |
| Third traffic-bearing version | none |
| Worker Version set | byte-identical ID set to pre-promotion listing; newest still `4a32c5f9…` → **no new version** |
| Rollback target | `b07d8697…` still present in the version set |
| D1 | `DB_OPS` 5 / `0005…`, `DB_PUBLIC` 10 / `0010…` — unchanged |
| Secrets | names unchanged (values are not observable through wrangler; the workflow's own before/after comparison also reported unchanged) |
| Environment protection | reviewer + branch-policy JSON identical to pre-snapshot; branch policy still `feat/header-hero-integrated` |

Smoke (workflow step 14, blocking): **PASSED (23/23)**. No RFQ submitted.

## 8. Phases 11–13 — STABLE_100 evidence, ledger, BASE_PRODUCTION_SHA

Artifact `production-promotion-evidence-35719752606` (id `10690913512`):

| Field | Value |
| --- | --- |
| release_sha | `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` |
| worker_version_id | `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` |
| release_state | `STABLE_100` |
| final_traffic_percent | `100` |
| staging_run_id | `35532624537` |
| production_run_id | `35533626395` |
| promotion_run_id | `35719752606` |
| rollback_version_id | `b07d8697-620c-485c-8fed-21b893ab602c` |
| final_risk | `LEGACY_IN_FLIGHT_RELEASE` (legacy-release marker emitted by the workflow, not a classifier result) |
| result | `PASS` |
| timestamp | `2026-09-22T11:17:57Z` |
| smoke_result | `PASSED (23/23)` |

No field was missing; nothing was filled in manually.

**Ledger:** exactly one row appended to `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` §Ledger (RELEASE_POLICY.md schema), directly after the preserved `LEGACY_IN_FLIGHT_RELEASE` row, values copied from the artifact — commit `0f669da` (`docs(release): record first stable-100 production promotion`), pushed to `feat/header-hero-integrated`. Two dated "Update 2026-09-22" notes were added beside the now-historical "no `STABLE_100` row" prose; no existing row or sentence was edited.

**Resolver:** `parseLedgerTable` + `resolveBaseProductionSha` (`lib/ci/release-ledger.ts`), run against the committed file:

```text
rows: 2  (LEGACY_IN_FLIGHT_RELEASE, STABLE_100)
{"ok":true,"releaseSha":"f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9", row.promotionRunId:"35719752606", ...}
```

`BASE_PRODUCTION_SHA = f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9`, resolved from the STABLE_100 row. `node --test lib/ci/*.test.ts`: 184 pass, 0 fail.

Side effect, by design: the ledger now carries two rows for `f2202ab5…`, so `promote-production.yml`'s ledger-binding step would refuse any re-promotion of this release ("multiple ledger rows … ambiguous") — the intended fail-closed behavior.

## 9. Phase 14 — policy status (honest)

| Claim | Value | Basis |
| --- | --- | --- |
| `POLICY_ENGINE_IMPLEMENTED` | YES | engine + tests unchanged, 184/184 |
| `PROMOTION_POLICY_ENFORCEMENT_ACTIVE` | YES | `promote-production.yml` enforced evidence, ledger, topology, observation-attestation and smoke gates on a real production run |
| `GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` | NO | no workflow invokes `release-risk-classifier.ts`; `deploy-production.yml`/`deploy-staging.yml` do not gate on `FINAL_RISK` (`RELEASE_POLICY.md` §0.1) |
| `BASE_PRODUCTION_SHA_RESOLVED` | YES | §8 |
| `CURRENT_POLICY_LIFECYCLE_STATE` | `BOOTSTRAP_MERGED` | `ACTIVE` requires release-time enforcement wired in (§0); only the baseline half of that condition is now met |

**Remaining governance actions:**

1. Wire the classifier into `deploy-production.yml` (run against `BASE_PRODUCTION_SHA..deploy_ref`, fail on path mismatch) — the prerequisite for `ACTIVE`.
2. Update now-stale statements that `BASE_PRODUCTION_SHA` is unresolved in `CLAUDE.md` §5b and `RELEASE_POLICY.md` §0 — HIGH-trigger documents; deliberately not edited in this documentation-only commit.
3. Resolve / annotate `DOCUMENT_AUDIT_REPORT.md` DAR-058 (baseline now resolvable; the `b07d8697…` commit SHA itself remains unknown and is no longer required).
4. Define `MINIMUM_OBSERVATION_DURATION` (still `TBE`).
5. Make queue backlog depth observable for future observation windows.
6. Consider `prevent_self_review` on the `production` Environment: the gate currently permits the dispatching account to approve its own run (the agent did not).

**Rollback path (not executed, for reference):** `b07d8697-620c-485c-8fed-21b893ab602c` is a recorded, validated Worker Version in the ledger and remains present, so it is an admissible emergency-rollback target under `RELEASE_POLICY.md` §13.

No further production mutation was performed after run `35719752606`. No new release was started.
