# First Production 10% Canary Release — Execution Report

**Report date (UTC):** 2026-09-20
**Scope:** the first real production deployment ever performed by `.github/workflows/deploy-production.yml`. Authorized for a 10% canary only; explicitly **not** authorized to promote to 100%.
**Related:** `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` (frozen architecture), `docs/release/FIRST_PRODUCTION_RC_STAGING_VERIFICATION_REPORT.md` (the staging proof this release promotes), `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (append-only ledger — row appended for this release).

---

## 1. Result summary

```text
RESULT:
FAIL  (workflow run concluded `failure` at its blocking production smoke gate)

  Qualifier — the failure is in the SMOKE HARNESS, not the application.
  The canary deployment itself completed successfully and production is
  verifiably healthy. See §5 (root cause) and §6 (independent verification).

RELEASE_SHA:
f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9

STAGING_PROVENANCE:
VERIFIED  (Deploy Staging run 35532624537, workflow 361701517)

PRODUCTION_RUN_ID:
35533626395

APPROVAL_METHOD:
API_APPROVED

A1:
PASS

A2:
PASS

A3:
PASS

BUILD_TEST_GATE:
PASS

PHASE1_VERSION_UPLOAD:
PASS

NEW_VERSION_ID:
4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed

PREVIOUS_VERSION_ID:
b07d8697-620c-485c-8fed-21b893ab602c

PHASE2_TRAFFIC_ROLLOUT:
PASS

TRAFFIC_SPLIT:
NEW=10
PREVIOUS=90

PRODUCTION_SMOKE:
FAIL  (workflow gate aborted mid-suite — harness defect, see §5)
      Independent re-execution of the identical suite: PASS, 23/23 (see §6)

PRODUCTION_SMOKE_ASSERTIONS:
Workflow gate:      9 of 23 executed, 9 passed, 0 failed, 14 never executed
Independent re-run: 23 of 23 executed, 23 passed, 0 failed (11 groups S1-S10 + S1b)

WORKER_ERRORS_OBSERVED:
None. 60/60 sampled production requests returned 200; the new canary version
probed directly returned correct status and locale markup on every route.

5XX_REGRESSION_OBSERVED:
NO

QUEUE_OR_DLQ_ANOMALY:
NOT_OBSERVABLE  (no Cloudflare credentials available to this session; see §8)

DB_OPS_CHANGED:
NO

DB_PUBLIC_CHANGED:
NO

SECRETS_CHANGED:
NO

ENVIRONMENT_PROTECTION_CHANGED:
NO

ROLLBACK_PERFORMED:
NO

CURRENT_PRODUCTION_STATE:
10_PERCENT_CANARY

READY_FOR_100_PERCENT_PROMOTION:
NO

REMAINING_BLOCKERS:
B1 — the production smoke gate cannot complete against a partially-empty
     catalog (§5). It is the gate that must guard a 100% promotion, and it
     has never once run to completion. Fixing it requires a change to
     `.github/workflows/deploy-production.yml`, which this task was not
     authorized to make.
B2 — no production release has yet been observed passing its own smoke gate
     end-to-end, so the gate is unproven on the success path.
```

---

## 2. Preflight (all checks passed before dispatch)

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Exact RC SHA | PASS | `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` |
| 2 | Commit exists | PASS | `git cat-file -t` → `commit`; subject `docs(ci): record second fail-closed runtime verification (A2 provenance)` |
| 3 | Reachable from `feat/header-hero-integrated` | PASS | `git merge-base --is-ancestor` → true; present on local and `origin/` branch |
| 4 | A2 provenance independently re-checkable | PASS | Deploy Staging (workflow `361701517`) run `35532624537`, conclusion `success`, log line `Deploying exact commit: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` |
| 5 | Production D1 migration parity | PASS | Verified in-run by the A3 gate (read-only, before build/upload): DB_OPS `No migrations to apply!`, DB_PUBLIC `No migrations to apply!` — see §2a |
| 6 | Production workflow active | PASS | Workflow `362738255` `Deploy Production`, state `active` |
| 7 | Environment protection active | PASS | `production` env: `required_reviewers` (rule `66097678`, reviewer `rezachidotnet`) + `branch_policy` (rule `66097679`) |
| 8 | Branch policy allows the branch | PASS | Custom branch policy `60435891` = `feat/header-hero-integrated` |

### 2a. Note on check 5 — where it was verified

This session had **no Cloudflare API credentials** (`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` unset locally, no `~/.wrangler/config`), so production D1 state could not be queried independently before dispatch. It was instead verified by the workflow's own **A3 migration parity gate**, which is read-only (`wrangler d1 migrations list`, never `apply`) and fails closed, and which runs **before** `npm ci`, the build, the version upload, and any traffic shift. A pending migration would therefore have aborted the release with nothing deployed. This ordering makes the in-run check a sufficient substitute, not a weaker one.

Confirmed by source inspection: the workflow's only two D1 invocations are `wrangler d1 migrations list DB_OPS` and `... DB_PUBLIC` (lines 555, 562). It contains no `d1 migrations apply`, no `d1 execute`, and no `wrangler secret` mutation of any kind.

---

## 3. Baseline captured before dispatch (2026-09-20T19:49:12Z)

Public production surface, read-only:

| Probe | Baseline |
| --- | --- |
| `/`, `/en`, `/ar`, `/services`, `/products`, `/contact` | `200` |
| `/products/equal-angle` | `404` (the slug staging publishes; not published on production — a data difference, not a defect) |
| unknown route | `404` |
| `/fa` | `308` → `https://www.ahanassa.com/` |
| apex `ahanassa.com/` | `308` → `https://www.ahanassa.com/` |
| `<html>` attrs | fa `lang="fa" dir="rtl"` · en `lang="en" dir="ltr"` · ar `lang="ar" dir="rtl"` |
| Security headers | `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`, `content-security-policy-report-only` — all present |
| Catalog per locale | fa: published slug `hot-rolled-plate-s355jr` · en/ar: legitimate empty-catalog state string present |

Worker version IDs, version/deployment counts and traffic allocation could not be captured pre-dispatch (no Cloudflare credentials). The authoritative baseline for the one value that matters — the rollback target — was captured **by the workflow itself, before any traffic shift**, in its `Capture PREVIOUS_VERSION_ID` step: `b07d8697-620c-485c-8fed-21b893ab602c`.

---

## 4. Dispatch, approval, and gate-by-gate outcome

**Dispatched** 2026-09-20T19:50:42Z — workflow `Deploy Production` (`362738255`), workflow-file ref `feat/header-hero-integrated`, inputs:

```text
deploy_ref               = f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9
confirm                  = deploy-production
rollout_percentage       = 10
skip_staging_provenance  = false
```

**Approval** 2026-09-20T19:51:54Z — the run paused at the `production` environment gate with `current_user_can_approve: true`. Approved through the authenticated GitHub REST API (`POST /actions/runs/35533626395/pending_deployments`, `state=approved`, environment id `22298051960`), deployment object `6556983805`. **No Environment protection rule was created, modified, or removed** — verified identical before and after (§9).

| # | Step | Outcome |
| --- | --- | --- |
| 2 | Require explicit confirmation + 40-hex `deploy_ref` | PASS |
| 3 | Verify `deploy_ref` commit exists (pre-checkout) | PASS |
| 4 | Checkout `deploy_ref` | PASS |
| 5 | Resolve deployed SHA | PASS — `Deploying exact commit: f2202ab…fdbfb9` |
| 6 | **A1** production target assertion | PASS |
| 7 | **A2** staging provenance (Deploy Staging log scan) | PASS — matched run `35532624537` |
| 8 | **A3** migration parity (read-only) | PASS — both DBs `No migrations to apply!` |
| 10–12 | Install (immutable) / tests / type check | PASS |
| 13 | Build (`CLOUDFLARE_ENV=production`) | PASS |
| 14 | Capture `PREVIOUS_VERSION_ID` before any traffic shift | PASS — `b07d8697-620c-485c-8fed-21b893ab602c` |
| 15 | **Phase 1** `wrangler versions upload` | PASS — `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` at 0% traffic |
| 16 | Verify secret inheritance + production bindings | PASS |
| 17 | **Phase 2** `wrangler versions deploy` (rollout 10%) | PASS |
| 18–19 | Capture + upload release evidence | PASS |
| 20 | **Production smoke checks** | **FAIL** — see §5 |

A2 passing here is notable: it is the first time the staging-provenance gate has ever passed on a production run (the four prior runs were deliberate fail-closed tests, the most recent of which — `35531727338` — was the A2 negative case).

### 4a. Phase 1 binding verification

The uploaded version was confirmed to carry both required secrets as `secret_text` (names only; values are never read or printed) and the correct production resources:

```text
DB_OPS            = ahanassa-ops-production     (7240a6a7-c293-4e6e-baf3-95838a3c2944)
DB_PUBLIC         = ahanassa-public-production  (73ba6b50-ef57-4d89-baa9-617a0b0af127)
ODOO_SYNC_QUEUE   = ahanassa-odoo-sync-production
APP_ENV           = "production"
```

---

## 5. The smoke-gate failure — root cause

**This is a defect in the smoke harness, not a regression in the deployed application.**

The gate aborted at `19:53:15Z`, nine assertions in, immediately after:

```text
== S5: catalog index (fa/en/ar) ==
  OK — /products [fa] -> 200, discovered a published catalog slug
##[error]Process completed with exit code 1.
```

It exited **abruptly**, not through the harness's own `fail()` path: no `SMOKE CHECK FAILED` message was emitted, no `smoke_result` was recorded, and the pre-filled rollback command was never printed. S5 `[en]`, S5 `[ar]`, and all of S6–S10 never executed.

**Mechanism.** GitHub Actions runs a `run:` block under `shell: /usr/bin/bash -e {0}`, so `errexit` is on. The smoke script opens with `set -uo pipefail`, which adds `pipefail` but does **not** clear the inherited `-e`. Inside the S5 locale loop:

```bash
SLUG="$(grep -o "href=\"$PREFIX/products/[a-zA-Z0-9_-]\+\"" "$PRODUCTS_BODY_FILE" | head -n1 | sed -E ...)"
```

When a locale's catalog is legitimately empty, `grep` matches nothing and exits `1`; `pipefail` propagates that through the pipeline; the assignment therefore returns non-zero; and `errexit` kills the step on the spot — **before** the `elif grep -q "${LOCALE_EMPTY_STATE[$LOC]}"` branch written for exactly this case can be reached.

Reproduced in isolation:

```console
$ bash -e repro.sh
before
exit=1          # the empty-state branch is never reached
```

Production's `fa` catalog has published slugs, but `en` and `ar` are in the legitimate empty-catalog state (both display their localized "catalog is being prepared" string — confirmed in the pre-dispatch baseline, §3). The `fa` iteration therefore passed and the `en` iteration killed the step.

**Why staging never caught this.** `deploy-staging.yml`'s smoke suite checks the catalog for the default locale only, and staging's `fa` catalog has a published slug — so the failing path was never taken. The fa/en/ar locale loop is a production-only addition (the MEDIUM audit fix in `docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md`), and the defect lives in exactly that new code.

**Not fixed here.** Correcting it means editing `.github/workflows/deploy-production.yml`, which this task explicitly forbade. Logged as blocker **B1**.

---

## 6. Independent production smoke verification

Because the workflow gate self-terminated rather than reporting a verdict, the identical suite was re-executed independently against `https://www.ahanassa.com` — same assertions, same criteria, read-only `GET`s only, **no RFQ submitted** (S7 checks form and Turnstile markup presence only).

| Group | Coverage | Result |
| --- | --- | --- |
| S1 | homepage `/` — 200 + `lang="fa" dir="rtl"` | PASS (1) |
| S1b | homepage `/ar` — 200 + `lang="ar" dir="rtl"` | PASS (1) |
| S2 | `/fa` → 308 → `/` | PASS (1) |
| S3 | `/en` — 200 + `lang="en" dir="ltr"` | PASS (1) |
| S4 | `/services`, `/en/services`, `/ar/services` | PASS (3) |
| S5 | catalog index fa/en/ar — fa published slug `hot-rolled-plate-s355jr`; en/ar legitimate empty-catalog state | PASS (3) |
| S6 | catalog detail fa/en/ar — fa detail 200 + `<h1>`; en/ar nonexistent slug → 404 | PASS (3) |
| S7 | RFQ page render fa/en/ar — `<form>` + `company`/`phoneCountry`/`phoneLocal` + Turnstile widget markup (no submission) | PASS (3) |
| S8 | unknown catalog route → 404 (not 500) | PASS (1) |
| S9 | security headers — nosniff, `DENY`, referrer-policy, permissions-policy, CSP | PASS (5) |
| S10 | apex → 308 → `https://www.ahanassa.com/` | PASS (1) |

```text
AGGREGATE: PASSED (23/23 assertions, 0 failures, 11 groups)
```

Every assertion the workflow gate would have made, had it not aborted, passes against live production.

---

## 7. Traffic split verification

Confirmed from Cloudflare's own response to the Phase 2 command:

```text
SUCCESS  Deployed ahanassa-production
         version 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed at 10%
     and version b07d8697-620c-485c-8fed-21b893ab602c at 90%   (0.86 sec)

Promoted: 4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed@10 b07d8697-620c-485c-8fed-21b893ab602c@90
```

| Check | Result |
| --- | --- |
| New version receives 10% | CONFIRMED — `4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed` |
| Previous version receives 90% | CONFIRMED — `b07d8697-620c-485c-8fed-21b893ab602c` |
| No third version receiving traffic | CONFIRMED — `Deploying 2 version(s)`, exactly two specs |
| Percentages total 100 | CONFIRMED — 10 + 90 = 100 (also asserted by the workflow before invoking `wrangler`) |

The workflow's rollout-split arithmetic (the CRITICAL audit fix that computes the complementary percentage for the previous version) worked correctly on its first real use.

---

## 8. Post-rollout observation

### Available observability

| Signal | Observation |
| --- | --- |
| Canary version probed directly (`https://4a32c5f9-ahanassa-production.nova-b1e6f0.workers.dev`) | Healthy on every route: `/`, `/en`, `/ar`, `/services`, `/products`, `/en/products`, `/contact`, published detail page → `200`; nonexistent slug → `404`. Correct `lang`/`dir` for all three locales. |
| Production 60-request sample (`/`, `/en`, `/contact` × 20) | 60/60 `200`. Zero 4xx, zero 5xx. |
| 5xx regression | None observed. |
| Worker errors/exceptions | None surfaced by any probe. |
| Version/traffic stability | Stable; split unchanged since Phase 2. |
| Smoke endpoints | 23/23 pass (§6). |
| RFQ infrastructure | Page renders with form fields and Turnstile widget markup in all three locales. **No RFQ was submitted.** |

Probing the canary's own preview URL matters here: at a 10% split, requests to `www.ahanassa.com` land on the previous version ~90% of the time, so the aggregate smoke result alone is weak evidence about the new version specifically. The direct probe closes that gap — the new version is independently confirmed healthy.

### Not currently observable from this session

- Cloudflare Workers analytics / invocation error rates / exception counts — no Cloudflare API credentials available.
- Queue depth and DLQ state for `ahanassa-odoo-sync-production` — same reason. **Nothing implies an anomaly; it simply could not be measured.** Recorded as `NOT_OBSERVABLE`, not as "no anomaly".
- Worker version count and deployment count.
- Per-version request distribution (Cloudflare does not expose a per-version breakdown to an unauthenticated client).

No telemetry beyond what is listed above was inferred or invented.

---

## 9. No unexpected change (verified)

| Assertion | Result | Evidence |
| --- | --- | --- |
| DB_OPS migration state unchanged | CONFIRMED | A3 reported `No migrations to apply!`; the workflow's only D1 calls are `migrations list` (read-only) |
| DB_PUBLIC migration state unchanged | CONFIRMED | as above |
| No migration applied | CONFIRMED | no `d1 migrations apply` anywhere in the workflow; the only matches are explanatory comments (lines 82, 545) |
| No unexpected production D1 mutation | CONFIRMED | no `d1 execute`, no write path; the release deploys application code only |
| Production secrets unchanged | CONFIRMED | `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` both still `updated_at = 2026-09-19`, i.e. untouched by this release; no `wrangler secret` command exists in the workflow |
| Environment protection unchanged | CONFIRMED | identical before and after: rules `66097678` (required_reviewers → `rezachidotnet`) and `66097679` (branch_policy); branch policy `60435891` = `feat/header-hero-integrated` |
| Exactly one production run dispatched | CONFIRMED | `35533626395` is the only new run; the four prior runs are the pre-existing fail-closed tests |

---

## 10. Rollback decision

**No rollback was performed, and none is warranted.**

`docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §9 and the workflow's own policy are explicit: a smoke-gate failure never triggers an automatic rollback — a human decides — because reverting the Worker does not fix a migration-caused failure and an automatic revert could mask a partially-applied data change. The authorization for this task likewise permits rollback only where an actual user-impacting failure makes the condition unambiguous.

The condition here is unambiguous in the opposite direction: the failure is in the test harness (§5), the deployed canary is independently verified healthy (§6, §8), and no user-impacting defect exists. Rolling back would discard a good release on the strength of a broken assertion.

The rollback target remains captured and valid should it ever be needed:

```bash
npx wrangler versions deploy "b07d8697-620c-485c-8fed-21b893ab602c@100" \
  --config dist/server/wrangler.json --yes
```

---

## 11. Readiness for 100% promotion

**NO — not ready.** Blocking:

- **B1 — the production smoke gate cannot complete against a partially-empty catalog.** The gate that must certify a 100% promotion has never run to completion, and will abort the same way on any future run while `en`/`ar` remain empty. The fix is small (make the `SLUG=` assignment tolerate a non-matching `grep` — e.g. append `|| true`, or `set +e` around it) but requires editing `.github/workflows/deploy-production.yml`, which was outside this task's authorization.
- **B2 — the success path of the production gate is still unproven.** No production release has yet been observed passing its own smoke gate end-to-end.

Everything else is green: the SHA is staging-proven, A1/A2/A3 all passed, the two-phase deploy worked, the rollout split arithmetic worked on first real use, and the canary is healthy. Recommended sequence before any 100% promotion: fix B1 under its own authorization, re-run the gate against the already-uploaded version to clear B2, then seek separate authorization to promote.

---

## 12. Final state

```text
Production Worker:  ahanassa-production  (www.ahanassa.com)
  4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed  @ 10%   <- new canary, SHA f2202ab
  b07d8697-620c-485c-8fed-21b893ab602c  @ 90%   <- previous, rollback target

STOPPED AT 10%. No promotion to 100%. No second dispatch. No manual traffic change.
```

---

**End of report.**
