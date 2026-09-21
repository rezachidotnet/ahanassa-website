# Production 10% Canary — Official Verification-Only Gate Report

**Report date (UTC):** 2026-09-21
**Scope:** dispatch the registered `verify-production.yml` workflow from `main` against the existing, live 10% production canary and record the official gate result, with zero mutation.
**Related:** `docs/release/PRODUCTION_VERIFICATION_WORKFLOW_REGISTRATION_REPORT.md` (PR #3/#4 merge that registered this workflow), `docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md` (S5 fix, finding R3), `docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md` (the release awaiting this gate result).

---

## 1. Result summary

```text
RESULT:
FAIL

RUN_ID:
35567485750

RELEASE_SHA:
f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

CANARY_VERSION:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

STABLE_VERSION:
b07d8697-620c-485c-8fed-21b893ab602c

TRAFFIC_BEFORE:
10 / 90

V1:
FAIL (not executed)

V2:
FAIL (not executed)

V3:
FAIL (not executed)

V4:
FAIL (not executed)

SMOKE:
FAIL (not executed)

SMOKE_ASSERTIONS:
0 / 23

V5:
FAIL (not executed)

TRAFFIC_AFTER:
10 / 90

NEW_WORKER_VERSION_CREATED:
NO

PRODUCTION_DEPLOYMENT_CREATED:
NO

DB_OPS_CHANGED:
NO

DB_PUBLIC_CHANGED:
NO

SECRETS_CHANGED:
NO

ENVIRONMENT_PROTECTION_CHANGED:
NO

OFFICIAL_10_PERCENT_GATE:
FAIL

READY_TO_ADDRESS_R3:
NO

READY_FOR_100_PERCENT:
NO

REMAINING_BLOCKER:
1) The `production` GitHub Environment's deployment branch policy
   (`custom_branch_policies: true`) currently allows only the branch
   `feat/header-hero-integrated` to deploy to `production` — `main` is not
   on the allow-list, so any workflow_dispatch of an `environment: production`
   job from `main` is rejected by GitHub before the job starts, before the
   required-reviewer approval step is ever reached.
2) R3 (deterministic stable/rollback version selection in
   deploy-production.yml) remains unresolved, unrelated to and unblocked by
   this finding.
```

---

## 2. Phase 1 — Preflight (all passed)

| Check | Result |
| --- | --- |
| `Verify Production` workflow active | `active` (ID 363097410), confirmed via `gh workflow list --all` |
| `workflow_dispatch` available with required inputs (`confirm`, `expected_release_sha`, `expected_canary_version`, `expected_stable_version`) | Confirmed via `gh workflow view --yaml` |
| Current production traffic | `4a32c5f9-…` = 10%, `b07d8697-…` = 90% (via read-only `wrangler deployments list --env production`, latest entry `c0f3a66b…`, `created_on: 2026-09-20T19:53:08Z`) |
| No third version receiving traffic | Confirmed — only 2 entries in `versions[]` |
| Total traffic = 100% | 10 + 90 = 100 |
| `production` Environment protection active | Confirmed — `required_reviewers: [rezachidotnet]` present, plus a `branch_policy` rule |

All Phase 1 checks passed. Proceeded to dispatch.

**Note:** Phase 1 as specified checked that environment protection was *active*, but did not ask to inspect the specific deployment branch policy allow-list. That allow-list is what caused Phase 2/3 to fail (see below) — recorded here as a gap in the preflight checklist for any future re-run of this task, not fixed unilaterally since fixing it means changing Environment protection, which is out of this task's authorization.

## 3. Phase 2 — Dispatch

Dispatched at `2026-09-21T06:12:52Z`:

```text
gh workflow run "Verify Production" --repo rezachidotnet/ahanassa-website --ref main \
  -f confirm=verify-production \
  -f expected_release_sha=f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9 \
  -f expected_canary_version=4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed \
  -f expected_stable_version=b07d8697-620c-485c-8fed-21b893ab602c
```

Run created: `https://github.com/rezachidotnet/ahanassa-website/actions/runs/35567485750`

## 4. Phase 3 — Approval

The run completed on its own within seconds — `status: completed`, `conclusion: failure` — **before any pending deployment was created**. `gh api .../actions/runs/35567485750/pending_deployments` returned `[]`; there was nothing to approve.

Run annotations:

```text
X Branch "main" is not allowed to deploy to production due to environment
  protection rules.
X The deployment was rejected or didn't satisfy other protection rules.
```

Job inspection confirms the job (`verify-production`, ID 106232111198) ran **0 steps** — GitHub's environment gate rejected the run at the branch-policy check, before the required-reviewer approval prompt, before checkout, before any workflow step (including the read-only ones) executed.

Root cause, confirmed read-only:

```text
GET /repos/rezachidotnet/ahanassa-website/environments/production
  → deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }

GET /repos/rezachidotnet/ahanassa-website/environments/production/deployment-branch-policies
  → [{ "name": "feat/header-hero-integrated", "type": "branch" }]
```

Only `feat/header-hero-integrated` is on the `production` environment's custom branch allow-list. `main` is not, so a `workflow_dispatch` run of any `environment: production` job from `main` — this run, and equally `Deploy Production` if it were ever dispatched from `main` — is auto-rejected.

This is **not** an approval rejection by a human reviewer; no reviewer was ever prompted. Per this task's own instruction not to modify Environment protection, this was not corrected. `MANUAL_APPROVAL_REQUIRED` would misdescribe the actual failure, so it is not used here.

## 5. Phase 4 — Verification gates

Not reached. `verify-production` had 0 steps executed, so none of V1–V5 or the production smoke suite ran. No result was produced for the 10% canary.

## 6. Phase 5 — Zero-mutation verification

Independently re-checked, all read-only:

| Check | Result |
| --- | --- |
| Worker/deployment count | Unchanged — latest `wrangler deployments list --env production` entry is still `c0f3a66b-…`, `created_on: 2026-09-20T19:53:08Z` (identical to pre-run) |
| Canary version | Unchanged — `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` |
| Stable version | Unchanged — `b07d8697-620c-485c-8fed-21b893ab602c` |
| Traffic | Unchanged — 10 / 90 |
| DB_OPS / DB_PUBLIC | Unchanged — no D1 command was ever executed (0 job steps ran) |
| Worker upload | None — no step ran |
| Worker deployment | None — no step ran |
| Migration | None — no step ran |
| Secrets | Unchanged — no step ran |
| `production` Environment protection | Unchanged — re-read via `gh api .../environments/production`; identical to pre-dispatch (`required_reviewers: [rezachidotnet]` + `branch_policy`); not modified by this task |

Zero mutation confirmed.

## 7. What was NOT done

Per explicit authorization scope, none of the following occurred:

- Deploy Production was not dispatched.
- No Worker version was uploaded or deployed.
- Cloudflare traffic was not changed (confirmed unchanged, still 10/90).
- D1 was not touched.
- No migration was applied.
- No secret was modified.
- Environment protection was not modified — the branch-policy block discovered above was read and reported, not corrected.
- No rollback.
- No promotion to 100%.

## 8. Next step

To obtain the official gate result, one of the following (each requiring its own explicit owner authorization, not granted by this task) is needed:

1. Dispatch `Verify Production` from `feat/header-hero-integrated` instead of `main` (that branch is already on the environment's allow-list) — the workflow content itself is unchanged and still verification-only, but this task authorized "workflow from: main" specifically, so switching refs was not done unilaterally.
2. Add `main` to the `production` environment's deployment branch policy allow-list — an Environment protection change, explicitly out of scope for this task.

`READY_FOR_100_PERCENT` remains `NO`. `R3` (deterministic stable/rollback version selection) remains the standing blocker for a full-deploy rerun regardless of how this dispatch-ref issue is resolved.

---

**End of report**
