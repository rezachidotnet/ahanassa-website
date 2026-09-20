# Production Checkout Validation Hardening — Report

**Scope:** workflow hardening only — add one pre-checkout existence check to `.github/workflows/deploy-production.yml`. **No production deployment was executed, no Cloudflare resource was created/changed/deleted, no D1 data was touched, no secret was read/set/rotated, and no GitHub environment/setting was changed.** Every verification in this task was a read-only `gh api` call (`GET /repos/{owner}/{repo}/commits/{sha}`, run against real, already-existing and real, already-nonexistent commit SHAs) or a local YAML-parse/`bash -n` syntax check.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Date:** 2026-09-20

---

# Problem

The first live fail-closed test of `deploy-production.yml` used a deliberately invalid `deploy_ref`:

```
deploy_ref: 0000000000000000000000000000000000000000
```

This is a **syntactically valid** 40-character lowercase-hex string, so it passed the workflow's existing format check (`^[0-9a-f]{40}$`) and reached the very next step, `actions/checkout@v4`. `actions/checkout` then attempted to fetch that ref and failed with a raw git-protocol error surfaced straight from GitHub's remote:

```
remote error: upload-pack: not our ref
```

This is not a controlled, workflow-authored message — it's whatever text `git fetch` happens to produce when asked for an object the server doesn't have, and it appears in the middle of a third-party action's log output rather than as a clear `::error::` line the workflow itself owns. The workflow never reached A1, A2, or A3; it failed for the *right reason* (the SHA doesn't exist) but via the *wrong mechanism* (an uncontrolled action failure instead of a deliberate assertion).

---

# Fix

A new step, **"Verify deploy_ref commit exists (pre-checkout, fail closed)"**, was inserted between the existing format-check step and `actions/checkout@v4`. It queries the GitHub REST API directly:

```bash
RESOLVED_SHA="$(gh api "repos/${{ github.repository }}/commits/$DEPLOY_REF_INPUT" --jq '.sha' 2>&1)"
API_STATUS=$?
if [ $API_STATUS -ne 0 ]; then
  echo "::error::DEPLOY_REF EXISTENCE CHECK FAILED — no commit '$DEPLOY_REF_INPUT' was found in this repository (or the check could not be completed). Aborting before checkout — this SHA does not exist, so it was never staged either. Details: $RESOLVED_SHA"
  exit 1
fi
if [ "$RESOLVED_SHA" != "$DEPLOY_REF_INPUT" ]; then
  echo "::error::DEPLOY_REF EXISTENCE CHECK FAILED — the GitHub API resolved deploy_ref to a different SHA ('$RESOLVED_SHA') than requested ('$DEPLOY_REF_INPUT'). Aborting before checkout."
  exit 1
fi
echo "Confirmed: commit $DEPLOY_REF_INPUT exists in this repository."
```

**Why the Commits API, not `git ls-remote` or a probe fetch:** `GET /repos/{owner}/{repo}/commits/{sha}` (`gh api`) answers exactly "does this commit exist in this repository" for an arbitrary object id, requires only the already-granted `contents: read` permission (no scope escalation), and — critically — was verified live in this task to return a genuinely informative, clean error (`HTTP 422`, `"No commit found for SHA: ..."`) rather than a raw protocol failure. `git ls-remote` cannot reliably resolve an arbitrary commit SHA the way it resolves named refs (branches/tags), so it would not have been a faithful predictor of whether `actions/checkout` could fetch the SHA.

**Fail-closed discipline, matching the rest of the file exactly:** `set -uo pipefail` (deliberately *not* `-e`) so the script can capture `gh api`'s exit code and print its own controlled message — the identical pattern A2 (staging provenance) already uses for the same reason. Any API failure — genuinely missing commit, rate limit, network blip, auth issue — is treated as "not verified," never as "verified," consistent with this workflow's standing rule (`docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §3) that ambiguity always fails closed.

**Defense-in-depth, not a redundant check:** the resolved `.sha` is also compared against the requested `deploy_ref` for an exact match — a second, independent confirmation beyond "the API call merely succeeded," mirroring the same never-trust-the-input discipline already used by the existing "Resolve deployed SHA" step (which re-derives `DEPLOYED_SHA` from `git rev-parse HEAD` after checkout and compares it back against the input, rather than trusting the input directly).

---

# Architecture — Unchanged, Verified Unchanged

| Component | Status |
| --- | --- |
| Exact-SHA promotion model | **Unchanged.** `deploy_ref` is still the sole, mandatory, format-validated determinant of what gets deployed; the new step reads it, never redefines or substitutes it. |
| Staging provenance check (A2) | **Unchanged.** Still the corrected `Deploy Staging` log-scan method; runs after checkout as before. |
| Production environment gate | **Unchanged.** `environment: production`, required reviewer, branch policy — all untouched; the new step runs inside the same already-approved job, at the same point in the overall trust boundary (before any code from `deploy_ref` executes, same as A1). |
| Migration parity check (A3) | **Unchanged.** |
| Two-phase Cloudflare deployment (`versions upload` → verify → `versions deploy`) | **Unchanged**, including the rollout-split fix from the immediately preceding hardening task. |
| Job `permissions:` | **Unchanged** — still exactly `contents: read`, `actions: read`. The new step needs only `contents: read` (already granted) to call the Commits API; no scope was added. |
| Total step count | 18 → **19** (one step inserted; nothing removed, reordered, or renamed elsewhere). |

The new step sits strictly between the existing format-check step and `actions/checkout@v4` — no other step moved.

---

# Files Changed

| File | Change |
| --- | --- |
| `.github/workflows/deploy-production.yml` | Added one step, "Verify deploy_ref commit exists (pre-checkout, fail closed)," between the confirmation/format-check step and `actions/checkout@v4`. Added a header-comment note under a new "CHECKOUT-VALIDATION HARDENING" section, matching the file's existing running-changelog style. No other step was modified. |
| `lib/ci/workflow-invariants.test.ts` | Extended `validateProductionDeploySafetyShape()` with two checks (the fail-closed marker and the Commits-API call must be present). Added one dedicated ordering test (`deploy-production.yml verifies deploy_ref's commit exists before ever running actions/checkout`, mirroring the existing staging-target-ordering test's exact style) and one mutation test proving the shape check catches the existence check being removed. |
| `docs/release/PRODUCTION_CHECKOUT_VALIDATION_HARDENING_REPORT.md` | New — this report. |

Nothing else was touched — `deploy-staging.yml`, `ci.yml`, `wrangler.jsonc`, and all application code are unmodified.

---

# Testing

## Required behavioral verification (live, read-only — no state mutated)

| Scenario | Result |
| --- | --- |
| **Invalid SHA format fails** (`deploy_ref = "not-a-sha"`) | **PASS** — the pre-existing format-check step (unchanged by this task) correctly rejects it before the new step or checkout ever run: `deploy_ref must be a full 40-character lowercase-hexadecimal commit SHA...`. |
| **Non-existing SHA fails before checkout** — re-tested with the *exact* SHA from the original incident (`0000...0000`) and, separately, a different well-formed-but-nonexistent SHA (`deadbeef...deadbeef`), both run through the actual extracted step content, against the real GitHub API | **PASS, both** — `DEPLOY_REF EXISTENCE CHECK FAILED — no commit '...' was found in this repository...`, exit 1, in both cases. The original incident's exact failing input was directly re-verified to now fail cleanly at this new step instead of reaching `actions/checkout`. |
| **Valid SHA continues to checkout** — run against the real, current HEAD commit of `feat/header-hero-integrated` (`4a4aa9b...`) | **PASS** — `Confirmed: commit 4a4aa9be1f7d100dbb7b6b98c51527cf64eeca59 exists in this repository.`, exit 0, no `exit` on the success path, so the workflow naturally falls through to the next step (`actions/checkout@v4`) exactly as intended. |

All three were run against the **actual extracted step content** from the committed workflow file (parsed via `js-yaml`, syntax-checked with `bash -n` on both macOS bash 3.2 and a real bash 5.3), not a hand-typed reproduction — and against the real GitHub REST API for this repository, not a mock.

## Static test suite

```
npm test        → 1367/1367 passing (was 1365/1365)
npx tsc --noEmit → clean, 0 errors
```

`lib/ci/workflow-invariants.test.ts` alone: **38/38 passing** (was 36/36) — 2 new tests:

- `deploy-production.yml verifies deploy_ref's commit exists before ever running actions/checkout` — a direct `indexOf` ordering assertion against the real file (mirrors the pre-existing `staging deploy workflow asserts its staging target before building or deploying` test's exact style), proving the check genuinely runs *before* `actions/checkout@v4` in the file, not merely that both exist somewhere in it.
- `mutation: removing the pre-checkout deploy_ref existence check fails the production safety shape check` — strips the fail-closed marker and the Commits-API call from a copy of the real file and confirms `validateProductionDeploySafetyShape()` reports the missing check.

All 36 pre-existing tests continue to pass unchanged — `deploy-staging.yml` and `ci.yml` were not touched by this task, and every other production-workflow invariant (rollout split, A1 vars, locale smoke coverage, staging provenance, migration parity, two-phase deploy, `contents: write` ban, etc.) remains enforced exactly as before.

---

# What Was Deliberately Not Done

- No dispatch of `deploy-production.yml`, with any `deploy_ref`, valid or invalid.
- No Cloudflare resource created, modified, or deleted.
- No D1 data touched, read, or migrated.
- No secret read, set, rotated, or printed.
- No GitHub environment, branch policy, or reviewer setting changed.
- No change to `deploy-staging.yml`, `ci.yml`, `wrangler.jsonc`, or any application code.
- The one remaining, already-known, already-documented operational gotcha from the previous audit (`docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`) — that a real dispatch must select `feat/header-hero-integrated`, not `main`, as "Use workflow from" — is unrelated to this fix and was not re-addressed here; it is a separate, already-resolved-by-recommendation finding, not a checkout-order defect.
