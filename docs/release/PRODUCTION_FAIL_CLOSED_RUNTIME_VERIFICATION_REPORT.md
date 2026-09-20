# Production Fail-Closed Runtime Verification — Report

**Scope:** live, owner-authorized negative-test verification of `deploy-production.yml`'s fail-closed chain, executed for real on GitHub Actions against the real production environment/Cloudflare account. **No real production release was performed.** Every test in this document was dispatched with a `deploy_ref` deliberately chosen to fail a specific gate before any Cloudflare-facing step, and every claim of "no mutation occurred" was independently re-verified against live Cloudflare/D1 state before and after each run, not assumed from the workflow's own conclusion alone.
**Repository:** `rezachidotnet/ahanassa-website`
**Date:** 2026-09-20
**Owner authorization:** explicit, scoped to this task — inspect history/runs/logs, select one safe SHA, dispatch one negative test, approve the pending `production` environment deployment via API if permitted, monitor to completion. Explicitly **not** authorized to perform a real production release.

---

# RESULT

## PASS

Both the historical Test A (branch-policy + checkout-existence, carried forward from the two preceding tasks) and this session's Test B (A2 staging-provenance) exercised a distinct fail-closed gate for real, on GitHub Actions, against the real production environment — and both failed at exactly the intended gate, with every later Cloudflare-facing step correctly `skipped`, and zero measurable change to any Cloudflare or D1 state.

---

# Test A (Historical, Carried Forward) — Branch Policy + Checkout Existence

Recorded in full in `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md` and `docs/release/PRODUCTION_CHECKOUT_VALIDATION_HARDENING_REPORT.md`; summarized here for a single, durable record of every real runtime fail-closed test performed against this workflow.

| Run | Dispatched from | `deploy_ref` | Result |
| --- | --- | --- | --- |
| `35521249170` (2026-09-20T15:58:53Z) | `main` | (n/a — rejected pre-job) | **Rejected by GitHub Environment protection** before the job even started (`steps: []`) — `main` is not on `production`'s branch allow-list. This led directly to `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`. |
| `35522595539` (2026-09-20T16:24:07Z) | `feat/header-hero-integrated` | `0000000000000000000000000000000000000000` | Passed the confirm/format check and the branch-policy gate, then failed at **"Checkout deploy_ref"** (step 3 at the time) with a raw, uncontrolled git-protocol error, all later steps `skipped`. This led directly to the checkout-hardening fix (commit `60c95a0`) and `docs/release/PRODUCTION_CHECKOUT_VALIDATION_HARDENING_REPORT.md`, which added the new "Verify deploy_ref commit exists" pre-checkout step. |

Both runs independently re-confirmed via `gh api .../actions/runs/{id}/jobs`, not merely assumed safe: neither reached any step capable of touching Cloudflare, D1, or a secret.

---

# Test B (This Session) — A2 Staging Provenance

## Phase 1 — Selected Test SHA

**SELECTED_TEST_SHA:** `a5cf753c0222e165ebf7c54932c8c1ba9c318291`

**WHY_SAFE:** Current tip of `feat/header-hero-integrated` at the time of this task — a docs-only commit ("docs(ci): record production workflow checkout-hardening sync"). Exactly 40 lowercase hex characters; the branch tip itself, trivially reachable; not one of the two known-staged SHAs (`3ce18c52...`, `c9c641ce...`).

**Independent proof of no staging provenance, using the exact evidence model A2 itself uses:** listed all successful `Deploy Staging` (workflow `361701517`) runs — exactly two exist, unchanged since every prior audit — fetched each run's job log, stripped ANSI codes, and searched for the literal line `Deploying exact commit: a5cf753c0222e165ebf7c54932c8c1ba9c318291`:

| Run | Log contains | Match for selected SHA? |
| --- | --- | --- |
| `35428823679` | `Deploying exact commit: c9c641ce5f8e8653ba1396417687823916db01fb` | No |
| `35426318953` | `Deploying exact commit: 3ce18c52ef1a84311523d3bfe756139a545c8752` | No |

Both logs correctly contain exactly the *known* staged SHA and nothing else — confirming the scan methodology itself is working (not silently matching everything or nothing) before relying on its negative result for the selected SHA.

**STAGING_PROVENANCE_FOUND:** NO

## Phase 2 — Production Baseline (before dispatch)

| Metric | Value |
| --- | --- |
| Currently serving Worker version | `b07d8697-620c-485c-8fed-21b893ab602c` |
| Traffic allocation | 100% |
| Deployment events (history count) | 9 |
| Version uploads (history count) | 10 |
| DB_OPS migration state | ✅ No migrations to apply |
| DB_PUBLIC migration state | ✅ No migrations to apply |

## Phase 3 — Dispatch

```
gh workflow run deploy-production.yml \
  --ref feat/header-hero-integrated \
  -f deploy_ref=a5cf753c0222e165ebf7c54932c8c1ba9c318291 \
  -f confirm=deploy-production \
  -f rollout_percentage=10 \
  -f skip_staging_provenance=false
```

→ `https://github.com/rezachidotnet/ahanassa-website/actions/runs/35531727338`

## Phase 4 — Approval

`GET .../actions/runs/35531727338/pending_deployments` showed one pending deployment for the `production` environment with `"current_user_can_approve": true`. Approved via the GitHub REST API (`POST .../actions/runs/35531727338/pending_deployments`, `state: "approved"`, with an explanatory comment recorded on the deployment) — no environment protection rule was weakened, changed, or bypassed; the existing required-reviewer rule was satisfied through its own normal API-approval path.

**APPROVAL_METHOD:** API_APPROVED

## Phase 5 — Execution Path (verified against the real run's actual step results)

```
$ gh api repos/rezachidotnet/ahanassa-website/actions/runs/35531727338/jobs --jq '.jobs[0].steps[] | {number, name, conclusion}'
```

| # | Step | Conclusion |
| --- | --- | --- |
| 1 | Set up job | success |
| 2 | Require explicit confirmation and a full 40-hex-character deploy_ref | **success** |
| 3 | Verify deploy_ref commit exists (pre-checkout, fail closed) | **success** |
| 4 | Checkout deploy_ref | **success** |
| 5 | Resolve deployed SHA | success |
| 6 | A1: assert production target (fail closed) | **success** |
| 7 | A2: verify staging provenance (Deploy Staging log scan) | **failure — EXPECTED** |
| 8 | A3: migration parity gate | **skipped** |
| 9–13 | Setup Node.js / Install / Run tests / Type check / Build | **skipped** |
| 14 | Capture PREVIOUS_VERSION_ID | **skipped** |
| 15 | Phase 1: wrangler versions upload | **skipped** |
| 16 | Verify secret inheritance and production bindings | **skipped** |
| 17 | Phase 2: wrangler versions deploy (rollout 10%) | **skipped** |
| 18–20 | Evidence capture/upload, smoke checks | **skipped** |

**Exact match to the expected execution path stated in this task** — every gate up to and including A1 passed, A2 failed as intended, and every step from A3 onward (including both Cloudflare-facing phases) is explicitly `skipped`, not merely unreached-but-unlabeled.

**A2 did not unexpectedly pass** — no cancellation was needed.

## A2 failure evidence (verbatim from the real job log)

```
##[error]STAGING PROVENANCE ASSERTION FAILED — no successful Deploy Staging run (workflow 361701517) contains the log line 'Deploying exact commit: a5cf753c0222e165ebf7c54932c8c1ba9c318291'. This SHA has not been proven on staging.
##[error]Process completed with exit code 1.
```

## Phase 6 — Post-Run Verification Against Baseline

| Metric | Before | After | Changed? |
| --- | --- | --- | --- |
| Currently serving Worker version | `b07d8697-620c-485c-8fed-21b893ab602c` | `b07d8697-620c-485c-8fed-21b893ab602c` | **No** |
| Traffic allocation | 100% | 100% | **No** |
| Deployment events (count) | 9 | 9 | **No** |
| Version uploads (count) | 10 | 10 | **No** |
| DB_OPS migration state | ✅ No migrations to apply | ✅ No migrations to apply | **No** |
| DB_PUBLIC migration state | ✅ No migrations to apply | ✅ No migrations to apply | **No** |
| Cloudflare upload step executed | — | `skipped` (step 15) | **No** |
| Cloudflare deploy step executed | — | `skipped` (step 17) | **No** |

Every metric captured in the pre-dispatch baseline was independently re-queried after the run completed, using the same read-only `wrangler`/`gh` commands — not inferred from the workflow's own reported conclusion alone.

---

# Structured Result Fields

```
RESULT: PASS

TEST_B_SELECTED_SHA: a5cf753c0222e165ebf7c54932c8c1ba9c318291

SHA_EXISTS: YES

STAGING_PROVENANCE_BEFORE_TEST: NOT_FOUND

RUN_ID: 35531727338

APPROVAL_METHOD: API_APPROVED

FORMAT_GATE: PASS

EXISTENCE_GATE: PASS

CHECKOUT: PASS

A1_PRODUCTION_ASSERTION: PASS

A2_STAGING_PROVENANCE: EXPECTED_FAIL

A2_FAILURE_EVIDENCE: "STAGING PROVENANCE ASSERTION FAILED — no successful Deploy Staging run (workflow 361701517) contains the log line 'Deploying exact commit: a5cf753c0222e165ebf7c54932c8c1ba9c318291'. This SHA has not been proven on staging." (##[error], job 106133404005, run 35531727338)

A3: SKIPPED

CLOUDFLARE_UPLOAD_EXECUTED: NO

CLOUDFLARE_DEPLOY_EXECUTED: NO

PRODUCTION_WORKER_BEFORE: b07d8697-620c-485c-8fed-21b893ab602c @ 100% (9 deployment events, 10 version uploads in history)

PRODUCTION_WORKER_AFTER: b07d8697-620c-485c-8fed-21b893ab602c @ 100% (9 deployment events, 10 version uploads in history — unchanged)

PRODUCTION_TRAFFIC_CHANGED: NO

DB_OPS_CHANGED: NO

DB_PUBLIC_CHANGED: NO

REAL_PRODUCTION_DEPLOY_PERFORMED: NO

FAIL_CLOSED_CHAIN_RUNTIME_VERIFIED: YES

FIRST_REAL_RELEASE_READY: YES

REMAINING_BLOCKERS: None classified as a hard blocker. One residual, non-blocking gap is worth naming plainly: the *positive* execution path from A3 through Phase 1 (`versions upload`) and Phase 2 (`versions deploy`) has been verified via local `--dry-run` testing (prior sessions) and via unit-level static/mutation tests, but has never yet been exercised by a real, successfully-provenanced GitHub Actions dispatch reaching that far — because doing so, by construction, would constitute the first real release, which this task and its owner authorization explicitly do not permit. Every gate *before* that point (branch policy, format, existence, A1, A2) has now been independently proven correct via real runtime execution, not simulation alone. The remaining validation of Phase 1/Phase 2 in real execution is what an actual first release (at the already-recommended `rollout_percentage: 10`) will itself provide, and is not something further negative testing can safely substitute for.
```

---

# What Was Deliberately Not Done

- No `skip_staging_provenance=true` was used.
- Neither known-staged SHA (`3ce18c52...`, `c9c641ce...`) was dispatched.
- No real Cloudflare rollout occurred — Phase 1 and Phase 2 were never reached, confirmed both by the run's own step conclusions and by independent before/after state comparison.
- No Cloudflare resource, D1 data, secret, or GitHub environment protection setting was modified.
- No workflow code or application code was changed by this task.
- **No first real production release was started.** This task stops here, as instructed.
