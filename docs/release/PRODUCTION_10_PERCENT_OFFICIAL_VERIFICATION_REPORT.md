# Production 10% Canary — Official Verification-Only Gate Report

**Report date (UTC):** 2026-09-21
**Scope:** dispatch the registered `verify-production.yml` workflow against the existing, live 10% production canary and record the official gate result, with zero mutation.
**Related:** `docs/release/PRODUCTION_VERIFICATION_WORKFLOW_REGISTRATION_REPORT.md` (PR #3/#4 merge that registered this workflow), `docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md` (S5 fix, finding R3), `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md` (the release this gate was awaiting).

**Status:** This report has one CURRENT result (§1, run `35567845828`, dispatched from `feat/header-hero-integrated` — the branch the `production` Environment's deployment branch policy actually allows) and one SUPERSEDED historical result (§9, run `35567485750`, dispatched from `main`, rejected before any step ran because `main` is not on that allow-list). The superseded run is kept for audit trail, not as an active result.

---

## 1. Result summary (CURRENT — supersedes §9)

```text
RESULT:
PASS

RUN_ID:
35567845828

DISPATCH_BRANCH:
feat/header-hero-integrated

RELEASE_SHA:
f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

CANARY_VERSION:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

STABLE_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

TRAFFIC_BEFORE:
10 / 90

V1:
PASS

V2:
PASS

V3:
PASS

V4:
PASS

SMOKE:
PASS

SMOKE_ASSERTIONS:
23 / 23

V5:
PASS

TRAFFIC_AFTER:
10 / 90

NEW_WORKER_VERSION_CREATED:
NO

PRODUCTION_DEPLOYMENT_CREATED:
NO

D1_CHANGED:
NO

OFFICIAL_10_PERCENT_GATE:
PASS

READY_TO_ADDRESS_R3:
YES

READY_FOR_100_PERCENT:
NO

REMAINING_BLOCKER:
R3 deterministic stable/rollback version selection
```

---

## 2. Phase 1 — Preflight (all passed)

| Check | Result |
| --- | --- |
| `verify-production.yml` exists on `feat/header-hero-integrated` | Confirmed via `git show origin/feat/header-hero-integrated:.github/workflows/verify-production.yml` |
| Byte-identical to the registered version on `main` | Confirmed — `diff` against `origin/main`'s copy, no output |
| `workflow_dispatch` available | `Verify Production` listed `active` (ID 363097410) via `gh workflow list --all` |
| `production` Environment allows `feat/header-hero-integrated` | Confirmed via `gh api .../environments/production/deployment-branch-policies` → `[{"name": "feat/header-hero-integrated", "type": "branch"}]` |
| Live production traffic | `4a32c5f9-…` = 10%, `b07d8697-…` = 90% (via read-only `wrangler deployments list --env production`, latest entry `c0f3a66b…`, `created_on: 2026-09-20T19:53:08Z`, 10 deployments total) |
| No third version receiving traffic | Confirmed — only 2 entries in `versions[]` |
| Total traffic = 100% | 10 + 90 = 100 |

All Phase 1 checks passed. Proceeded to dispatch.

## 3. Phase 2 — Dispatch

Dispatched at `2026-09-21T06:17:45Z`:

```text
gh workflow run "Verify Production" --repo rezachidotnet/ahanassa-website --ref feat/header-hero-integrated \
  -f confirm=verify-production \
  -f expected_release_sha=f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9 \
  -f expected_canary_version=4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed \
  -f expected_stable_version=b07d8697-620c-485c-8fed-21b893ab602c
```

Run created: `https://github.com/rezachidotnet/ahanassa-website/actions/runs/35567845828`

## 4. Phase 3 — Approval

The run entered `status: waiting` with one pending deployment against the `production` Environment (`gh api .../actions/runs/35567845828/pending_deployments` returned the deployment request, `current_user_can_approve: true`).

Approved via authenticated GitHub API — only this run, no Environment setting touched:

```text
POST /repos/rezachidotnet/ahanassa-website/actions/runs/35567845828/pending_deployments
  { "environment_ids": [22298051960], "state": "approved", "comment": "Owner-authorized verification-only dispatch from feat/header-hero-integrated (task: re-run official 10% canary gate)" }
  → 200, deployment id 6562780709 created (ref feat/header-hero-integrated, sha a0a2ef5333bc0c531a70cf4a3dcc7e7afced155b)
```

## 5. Phase 4 — Monitor to completion

Run transitioned `waiting` → `in_progress` → `completed` / `success` within ~90 seconds (started `06:17:49Z`, job finished `06:19:00Z`, wall time 44s per `gh run view`).

Job `verify-production` (ID 106233128181), all steps passed:

```text
✓ Set up job
✓ Require explicit confirmation and well-formed expectations
✓ Checkout this workflow's own commit (never an operator-supplied ref)
✓ V1: assert production target (read-only, fail closed)
✓ V2: bind expected SHA to the recorded release evidence (fail closed)
✓ V3: assert live deployment baseline — exactly two versions at 10/90
✓ V4: D1 migration parity (read-only, never applied)
✓ Production smoke checks (S1-S10, fa/en/ar locale coverage)
✓ V5: post-verify — assert versions, traffic and deployments unchanged
✓ Capture verification evidence
✓ Upload verification evidence
✓ Complete job
```

Evidence extracted from the job log (`gh run view --log`):

```text
V1: Production target confirmed: ahanassa-production, production DB_OPS/DB_PUBLIC
    bindings correct.

V2: Release evidence confirmed: run 35533626395 deployed
    f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9 as 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed
    at 10%, over previous b07d8697-620c-485c-8fed-21b893ab602c.

V3: Baseline confirmed: 4a32c5f9-… @ 10% / b07d8697-… @ 90%, total 100%,
    no third version, 10 deployment(s) listed.

V4: Migration parity confirmed: DB_OPS and DB_PUBLIC both report no pending
    migrations on production.

SMOKE: 23 OK lines recorded for S1–S10 across fa/en/ar (homepage lang/dir,
    /ar, /fa → / redirect, /en, /services + locale variants, /products
    locale coverage incl. legitimate empty-catalog states for en/ar, one
    populated product page [fa] with <h1>, 404 correctness for nonexistent
    catalog slugs, contact-form field/Turnstile presence for fa/en/ar with
    no RFQ submitted, unknown-route 404 (not 500), 5 security headers,
    apex → www redirect).
    smoke_result: PASSED (23/23)

V5: Post-verify confirmed: versions unchanged, deployments unchanged (10),
    traffic still 10/90, D1 parity still clean.
```

Artifact `production-verification-evidence-35567845828` uploaded (90-day retention) as the durable machine-readable record.

## 6. Phase 5 — Zero-mutation proof

The workflow's own V5 step performed this check server-side (§5 above). Independently re-verified, all read-only, after the run:

| Check | Result |
| --- | --- |
| Deployment count | Unchanged — still 10 (`wrangler deployments list --env production`) |
| Latest deployment entry | Unchanged — still `c0f3a66b-…`, `created_on: 2026-09-20T19:53:08Z` (no new entry) |
| Canary version | Unchanged — `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` |
| Stable version | Unchanged — `b07d8697-620c-485c-8fed-21b893ab602c` |
| Traffic | Unchanged — 10 / 90 |
| DB_OPS / DB_PUBLIC | Unchanged — only `d1 migrations list` ran (read-only); V4's own result confirms no pending migrations, i.e. nothing to apply |
| Worker upload | None — workflow contains no `wrangler versions upload`/`wrangler deploy` command (confirmed by source inspection in the PR #4 review) |
| Worker deployment | None — same |
| Migration | None applied |
| Secret change | None — workflow contains no `wrangler secret` command |
| `production` Environment protection | Unchanged — re-read via `gh api .../environments/production`: `required_reviewers: [rezachidotnet]` + `branch_policy` rule, `deployment_branch_policy.custom_branch_policies: true`, allow-list still exactly `["feat/header-hero-integrated"]` |

Zero mutation confirmed.

## 7. What was NOT done

Per explicit authorization scope, none of the following occurred:

- Deploy Production was not dispatched.
- No Worker version was uploaded or deployed.
- Cloudflare traffic was not changed (confirmed unchanged, still 10/90).
- D1 was not touched (read-only `d1 migrations list` only).
- No migration was applied.
- No secret was modified.
- Environment protection / branch policy was not modified — `main` was not added to the allow-list; the run was dispatched from `feat/header-hero-integrated`, which was already on it.
- No rollback.
- No promotion to 100%.

## 8. Outcome

`OFFICIAL_10_PERCENT_GATE: PASS`. The first real production release (SHA `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9`, canary `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` at 10%) now has a recorded, official, zero-mutation verification result: all five gates (V1–V5) and the full 23-assertion production smoke suite passed against the live canary.

`READY_FOR_100_PERCENT` remains `NO`. The standing blocker is unchanged and unrelated to this gate: **R3, deterministic stable/rollback version selection** in `deploy-production.yml` (`docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md` §5) — `deployments list | .[-1].versions[0]` is ambiguous while two versions are live, so a full-deploy rerun is still not safe until R3 is fixed. `READY_TO_ADDRESS_R3: YES` — this gate's PASS result is the precondition R3 work was waiting on.

---

## 9. Superseded — prior attempt, run `35567485750` (dispatched from `main`)

**Recorded 2026-09-21, before this report's current result. Kept for audit trail only — see §1 for the current result.**

```text
RESULT:
FAIL

RUN_ID:
35567485750

DISPATCH_BRANCH:
main

V1–V5, SMOKE:
FAIL (not executed — 0 job steps ran)

TRAFFIC_BEFORE / TRAFFIC_AFTER:
10 / 90 (unchanged)

OFFICIAL_10_PERCENT_GATE:
FAIL
```

**Root cause:** the `production` Environment's deployment branch policy (`custom_branch_policies: true`) allow-lists only `feat/header-hero-integrated`. Dispatching from `main` was rejected by GitHub before the job started and before the required-reviewer approval prompt was ever raised (`pending_deployments` was empty; job ran 0 steps). This was **not** a human approval rejection — `MANUAL_APPROVAL_REQUIRED` would have misdescribed it. Zero mutation occurred: traffic, deployment count, D1, and Environment protection were all independently confirmed unchanged at the time.

This was resolved, without modifying Environment policy, by dispatching the identical, byte-verified `verify-production.yml` from `feat/header-hero-integrated` instead — the branch the policy already allows — producing the current PASS result in §1.

---

**End of report**
