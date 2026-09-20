# Production Workflow Audit Fix — Report

**Scope:** workflow hardening only, fixing exactly the three blockers named in this task, per `docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md`. **No production deployment was executed, no Cloudflare resource was created/changed/deleted, no D1 data was touched, no secret was read/set/rotated, no GitHub environment/setting was changed, and no application code was modified.** Every command run against real Cloudflare/GitHub state during this task was read-only (`gh api` `GET`s, environment/secret listings) or a `--dry-run` (`wrangler versions upload --dry-run`, `wrangler versions deploy --dry-run`), plus local, gitignored artifacts (`dist/`, removed afterward) and syntax/parse checks.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Files changed:** `.github/workflows/deploy-production.yml` (edited), `lib/ci/workflow-invariants.test.ts` (extended), `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` (updated), `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` (new, this report)
**Date:** 2026-09-20
**Review source:** `.github/workflows/deploy-production.yml`
**Audit source:** `docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md`

---

# RESULT

## PASS

`npm test` — **1365/1365 passing** (was 1362/1362 immediately before this task; net +3, exactly the three mutation tests this task's own instructions required). `npx tsc --noEmit` — clean, 0 errors. `lib/ci/workflow-invariants.test.ts` — **36/36 passing** (was 33/33; net +3). The workflow YAML parses cleanly after every edit (`js-yaml`; still 18 steps, all job outputs and `permissions:` unchanged), every `run:` block passes `bash -n` on both macOS bash 3.2 and a real bash 5.3 (matching GitHub Actions' `ubuntu-latest` more closely), and all three fixes were functionally exercised against real (read-only/`--dry-run`) Cloudflare and GitHub state, not merely reviewed — including reproducing the exact CRITICAL-finding failure one more time to confirm the *old* code was genuinely broken, then confirming the *new* code fixes it, for all three rollout values.

---

# Findings Fixed

| Audit severity | Finding | Fixed |
| --- | --- | --- |
| CRITICAL | `rollout_percentage: 10`/`50` completely non-functional — Phase 2 passed a single version-spec, but Cloudflare requires all specified percentages to sum to exactly 100 | **Yes** — §1 below |
| HIGH | A1 validated only `vars.APP_ENV`; a tampered `ODOO_BASE_URL` (or any of six other production vars) would pass undetected | **Yes** — §2 below |
| MEDIUM (locale coverage item) | S5/S6/S7 (catalog index, catalog detail, RFQ render) checked only the default (fa) locale; homepage did not check `/ar` | **Yes** — §3 below |

This task's instructions named exactly these three fixes and no others. The audit's remaining MEDIUM and LOW findings (self-review permitted; CLI-output-text coupling; A2's untested dependency on `deploy-staging.yml`'s exact log wording; external/unasserted environment protection; convention-only manifest append-only rule; etc.) are **unchanged and still open** — see "Remaining Known Limitations" below. None of them were in scope for this task, and none were touched.

---

# 1. Rollout Split Fix (CRITICAL)

## What was wrong

Phase 2 called `wrangler versions deploy "$NEW_VERSION_ID@${{ inputs.rollout_percentage }}"` — a single version-spec. Cloudflare's own CLI requires every deploy's specified percentages to sum to exactly 100; a lone spec below 100 always fails:

```
✘ [ERROR] The specified traffic percentages add up to 10%, but must total
  exactly 100%. Adjust the --percentage values or version-spec percentages
  so they sum to 100%.
```

**Originally reproduced live, read-only, during the independent audit** (`docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md` §6), against the real production Worker:

```
$ wrangler versions deploy b07d8697-620c-485c-8fed-21b893ab602c@10 --config wrangler.jsonc --env production --yes --dry-run
✘ [ERROR] The specified traffic percentages add up to 10%, but must total exactly 100%. ...
```

The workflow file at the start of this fix task was unchanged since that audit — read directly at the start of this task and confirmed still a single-version-spec `wrangler versions deploy "$NEW_VERSION_ID@${{ inputs.rollout_percentage }}"` call, i.e. the audited-broken shape, before any edit was made.

## What was implemented

Phase 2 now computes the complementary percentage and builds a `DEPLOY_SPECS` bash array, always summing to exactly 100:

```bash
ROLLOUT_PCT="${{ inputs.rollout_percentage }}"

DEPLOY_SPECS=("$NEW_VERSION_ID@$ROLLOUT_PCT")
if [ "$ROLLOUT_PCT" != "100" ]; then
  REMAINDER=$((100 - ROLLOUT_PCT))
  DEPLOY_SPECS+=("$PREVIOUS_VERSION_ID@$REMAINDER")
fi

# Verify the generated command before execution — Cloudflare's own hard
# requirement, checked here too so a future bug in the arithmetic above
# fails this workflow closed rather than ever reaching `wrangler`.
TOTAL_PCT=0
for SPEC in "${DEPLOY_SPECS[@]}"; do
  SPEC_PCT="${SPEC##*@}"
  TOTAL_PCT=$((TOTAL_PCT + SPEC_PCT))
done
if [ "$TOTAL_PCT" -ne 100 ]; then
  echo "::error::ROLLOUT SPLIT ASSERTION FAILED — generated version-spec percentages (${DEPLOY_SPECS[*]}) sum to $TOTAL_PCT, not 100. Refusing to deploy."
  exit 1
fi

echo "Rollout ${ROLLOUT_PCT}% verified — deploying version-spec(s): ${DEPLOY_SPECS[*]}"
echo "ROLLOUT_DEPLOY_SPECS=${DEPLOY_SPECS[*]}" >> "$GITHUB_ENV"

npx wrangler versions deploy "${DEPLOY_SPECS[@]}" --config dist/server/wrangler.json --message "..." --yes
```

Produces exactly the specs the task required:

| Input | Generated version-spec(s) |
| --- | --- |
| `100` | `new_version@100` |
| `50` | `new_version@50` `previous_version@50` |
| `10` | `new_version@10` `previous_version@90` |

`PREVIOUS_VERSION_ID` capture and the two-phase `versions upload` → verify → `versions deploy` structure are unchanged — this fix only changes what Phase 2 passes to the already-existing `wrangler versions deploy` call.

A second, smaller hardening was added alongside this fix: `rollout_percentage`'s `type: choice` constraint is only enforced by the GitHub dispatch *UI* dropdown, not the REST API for an API-triggered dispatch. The very first step (already validating `confirm` and `deploy_ref`'s SHA format) now also rejects any `rollout_percentage` value other than the literal strings `"10"`, `"50"`, or `"100"`, before checkout — closing that gap defensively, consistent with the same-discipline pattern already used for the other two inputs.

## Verification performed (read-only, no state mutated)

1. **Reproduced the original bug** against the real production Worker via `--dry-run` (above) — confirmed broken before fixing.
2. **Unit-tested the split arithmetic in isolation** (no `wrangler` call) for all three inputs:

   ```
   ROLLOUT_PCT=10  -> Rollout 10% verified — deploying version-spec(s): NEW-UUID-1234@10 PREV-UUID-5678@90
   ROLLOUT_PCT=50  -> Rollout 50% verified — deploying version-spec(s): NEW-UUID-1234@50 PREV-UUID-5678@50
   ROLLOUT_PCT=100 -> Rollout 100% verified — deploying version-spec(s): NEW-UUID-1234@100
   ```

3. **Confirmed the exact generated command works against real Cloudflare**, via `--dry-run` (no traffic shifted, no version created), for all three:

   ```
   $ wrangler versions deploy b07d8697-...@10 c3650d51-...@90 --env production --yes --dry-run
   ... ╰  X  --dry-run: exiting   ← succeeds through to the dry-run exit, no error

   $ wrangler versions deploy b07d8697-...@50 c3650d51-...@50 --env production --yes --dry-run
   ... succeeds identically

   $ wrangler versions deploy b07d8697-...@100 --env production --yes --dry-run
   ... succeeds identically (unchanged from before this fix)
   ```

4. **Static test**: `lib/ci/workflow-invariants.test.ts` now requires `REMAINDER`, `DEPLOY_SPECS`, and a `"ROLLOUT SPLIT ASSERTION FAILED"` fail-closed marker to be present in the file — see Testing below.

---

# 2. Production Target Assertion Fix (HIGH)

## What was wrong

A1 parsed `wrangler.jsonc`'s `env.production.vars` block but checked only `APP_ENV`. `ODOO_BASE_URL`, `ODOO_DATABASE`, `ODOO_CRM_TEAM_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PRICE_STRIP_ENABLED`, `ENABLED_PRICE_PROVIDERS`, and `HOMEPAGE_RANKING_MODE` were never validated — a `deploy_ref` with a tampered `ODOO_BASE_URL` would pass A1 undetected and silently misroute every RFQ synced by that release.

## What was implemented

A1 now validates all seven `env.production.vars` keys that exist in `wrangler.jsonc` today, at two different strengths, deliberately:

| Var | Validation | Why this strength |
| --- | --- | --- |
| `APP_ENV` | exact match `"production"` | identity marker |
| `ODOO_BASE_URL` | exact match `"https://odoo.ahanassa.com"` | the exact audit-cited exploit scenario — which Odoo instance RFQs sync to |
| `ODOO_DATABASE` | exact match `"ahanassa"` | which Odoo database |
| `ODOO_CRM_TEAM_ID` | exact match `"1"` | which CRM team receives leads |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | exact match `"0x4AAAAAAEi2RZ3NHcqTk0ej"` | wrong value silently breaks Turnstile for every visitor |
| `PRICE_STRIP_ENABLED` | pattern: must be `"true"` or `"false"` | wrangler.jsonc's own comments document this as a feature flag deliberately, independently flippable in a later, separate config commit — never pinned to one value, or this assertion would itself block that documented future change |
| `HOMEPAGE_RANKING_MODE` | pattern: must be `"base"` or `"auto"` | same reasoning — documented independently-flippable flag |
| `ENABLED_PRICE_PROVIDERS` | presence only (must be a string) | same reasoning; content is provider-list configuration, not an identity value |

None of these are secrets — the two real Worker secrets (`ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`) are Cloudflare Secrets, never declared in `wrangler.jsonc` at all (confirmed again this task, unchanged from the original implementation) — so printing every one of these values on success or failure is safe, and A1's final summary now prints the full `vars` object (previously only `APP_ENV`).

## Verification performed (read-only, no state mutated)

1. **Ran the updated A1 against the real, current `wrangler.jsonc`** — passed, printing all seven vars correctly.
2. **Reproduced the exact audit-cited attack scenario**: doctored a local copy of `wrangler.jsonc` with `ODOO_BASE_URL` changed to `https://attacker-controlled.example.com`, ran A1 against it —

   ```
   ::error::PRODUCTION TARGET ASSERTION FAILED — env.production.vars.ODOO_BASE_URL is "https://attacker-controlled.example.com", expected "https://odoo.ahanassa.com".
   ```

   **Failed closed correctly, on the exact scenario the audit named.**
3. **Static test**: `lib/ci/workflow-invariants.test.ts` now requires all four of `ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_CRM_TEAM_ID`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` to be present in the file — see Testing below.

---

# 3. Smoke Test Locale Coverage Fix (MEDIUM)

## What was wrong

S1 (homepage) checked fa and en but not ar. S5 (catalog index), S6 (catalog detail), and S7 (RFQ page render) checked only fa — a regression isolated to `/en/products`, `/ar/products`, `/en/contact`, `/ar/contact`, etc. would not have been caught by any of the ten checks.

## What was implemented

- **New standalone check, S1b**: `/ar` homepage — `200`, `<html lang="ar" dir="rtl">`.
- **S5 (catalog index)** now loops over fa/en/ar. Each locale independently discovers its own published slug (or confirms the correct, localized "catalog is being prepared" empty-state string) — never assumes fa's slug or empty-state applies to en/ar, since editorial publication is per-locale-per-entity and en/ar are legitimately unpublished today.
- **S6 (catalog detail)** now loops over fa/en/ar, using each locale's own slug discovered by S5 (or that locale's own 404-on-empty-catalog fallback, exactly mirroring the pre-existing fa-only logic, now applied per locale).
- **S7 (RFQ page render)** now loops over fa/en/ar — `/contact`, `/en/contact`, `/ar/contact` — each checked for the same form-field + Turnstile markup criteria as before. **No RFQ is submitted in any locale.**

The locale→URL-prefix mapping (`fa` unprefixed, `/en`, `/ar` — per `PROJECT_OVERRIDES.md` §1) and each locale's exact empty-state string (read directly from `components/products/catalog-empty-state.tsx`, not guessed) are declared once, near the top of the smoke step, and reused by all three loops.

The step's final tally was changed from a hardcoded `"PASSED (10/10)"` to a real `CHECKS_PASSED`/`FAILURES` count (`pass()` now increments a counter too) — the check count grew from 10 to 23 individual pass/fail assertions, and a hardcoded "10/10" would have been silently wrong the moment this fix landed.

## Verification performed (read-only, real HTTP GETs against the live public site — no RFQ submitted, no credential used)

1. **Ran the full, updated smoke step against real production** — **23/23 passed**, including:
   - `/ar` → `200`, `<html lang="ar" dir="rtl">`
   - `/en/products`, `/ar/products` → `200`, correctly identified as the legitimate empty-catalog state (confirmed both locales' exact empty-state strings live: *"The online catalog is being prepared"* / *"الكتالوج الإلكتروني قيد الإعداد"*), while `/products` (fa) correctly discovered a real published slug
   - `/en/products/<nonexistent>`, `/ar/products/<nonexistent>` → `404` (correct fallback, since en/ar have no published slug to test a real detail page against today)
   - `/en/contact`, `/ar/contact` → `200`, RFQ form + Turnstile markup present, matching fa
2. **Mutation-proved the gate is real, not vacuous**: broke the S1b assertion (`lang="ar"` pattern replaced with an impossible string) and re-ran against real production — **exactly 1 of 23 failed** (`S1b`), all 22 others still independently passed, job exited 1. This proves one broken locale check fails the whole gate without masking or being masked by the others.
3. **Static test**: `lib/ci/workflow-invariants.test.ts` now requires `lang="ar"`, the `[ar]="/ar"` locale-prefix definition, and at least 3 occurrences of the `for LOC in fa en ar` loop (one each for S5/S6/S7) — see Testing below.

---

# Files Changed

| File | Change |
| --- | --- |
| `.github/workflows/deploy-production.yml` | Header comment: new "AUDIT FIXES" section. Step 1 (confirmation): added `rollout_percentage` allowlist check. A1: replaced the single-`APP_ENV` check with the full seven-var validation described in §2. Phase 2: replaced the single version-spec with the `DEPLOY_SPECS`/`REMAINDER`/sum-verification logic described in §1; records `ROLLOUT_DEPLOY_SPECS` to `$GITHUB_ENV`. Evidence step: records `rollout_deploy_specs` in the evidence JSON and job summary. Smoke-check step: added S1b, widened S5/S6/S7 to loop fa/en/ar (described in §3); replaced the hardcoded `"PASSED (10/10)"` with a real pass/fail tally. Net: +268/-51 lines. |
| `lib/ci/workflow-invariants.test.ts` | Extended `validateProductionDeploySafetyShape()` with checks for the rollout-split logic (`REMAINDER`, `DEPLOY_SPECS`, the sum-to-100 fail-closed marker), the four newly-required production vars, and Arabic locale smoke coverage (`lang="ar"`, the `ar` prefix definition, and a ≥3 count of the shared locale loop). Added exactly the three mutation tests this task's instructions required (see Testing). Net: +109 lines. |
| `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` | Added a dated update note pointing at this report as the authoritative current-state record for the three fixed areas; updated the A1/Deploy/Smoke-gate rows of its architecture table and its residual-items table in place, without rewriting the rest of its original narrative. |
| `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` | New — this report. |

Nothing else was touched. `wrangler.jsonc`, application code under `app/`/`lib/`/`components/`, `deploy-staging.yml`, `ci.yml`, and `docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md` are unmodified. No commit was created by this task.

---

# Testing

## Full suite

```
npm test        → 1365/1365 passing (was 1362/1362)
npx tsc --noEmit → clean, 0 errors
```

`lib/ci/workflow-invariants.test.ts` alone: **36/36 passing** (was 33/33) — all 33 pre-existing tests unaffected; 3 new.

## Mutation checks (exactly the three this task's instructions required)

### 1. Remove rollout split logic → test fails

`test("mutation: removing the rollout split logic fails the production safety shape check")` reverts a copy of the real Phase 2 code back to the pre-fix shape (single version-spec, no `REMAINDER`, no `DEPLOY_SPECS`, no sum-to-100 guard) and asserts the shape check reports all three corresponding violations. **Passing.**

### 2. Remove one required production var assertion → test fails

`test("mutation: removing one required production var assertion fails the production safety shape check")` strips every reference to `ODOO_BASE_URL` (the audit's own named exploit variable) from a copy of the real file and asserts the shape check reports exactly that missing assertion, with no unrelated false positives for the other three named vars. **Passing.**

### 3. Remove Arabic smoke check → test fails

`test("mutation: removing the Arabic (ar) locale smoke check fails the production safety shape check")` cuts the entire S1b block out of a copy of the real file (the same "slice out one whole block" technique already used for staging's own smoke-check mutation test) and asserts the shape check reports the missing Arabic-homepage coverage. **Passing.**

All three mutation tests were run and confirmed passing as part of the 1365/1365 full-suite run above — not merely written and assumed correct.

## Functional (live, read-only/`--dry-run`) verification

Beyond the static test suite, every fix was independently exercised against real state, summarized in §1–§3 above and not repeated here. In total this task made: 3 real `--dry-run` calls to `wrangler versions deploy` confirming all three fixed rollout shapes (`@10`+`@90`, `@50`+`@50`, `@100`) succeed against the real production Worker (the original CRITICAL-finding reproduction cited in §1 is from the prior audit session; this task confirmed the file was still in that broken, unedited shape at its start, then fixed and re-verified it), 1 real A1 run against the current `wrangler.jsonc`, 1 real A1 run against a deliberately doctored copy reproducing the audit's exact HIGH-finding scenario, 1 real 23-check smoke run against live production, and 1 real mutated smoke run proving exactly one locale check fails in isolation. No `wrangler versions upload` (non-dry-run) and no `wrangler versions deploy` (non-dry-run) was ever run — no new Cloudflare Worker version was created by this task, at any point.

---

# Remaining Known Limitations

Everything below is **unchanged from the audit** — out of this task's explicit three-item scope, not fixed, and not claimed to be:

| Audit finding | Severity | Status |
| --- | --- | --- |
| Reviewer self-review permitted (`prevent_self_review: false`, single reviewer) | MEDIUM | Open — a GitHub environment-settings change, explicitly out of scope ("Do NOT change GitHub environments") |
| A2/A3/Phase-1-parsing/rollback-capture depend on exact, unversioned `wrangler`/`gh` CLI output text | MEDIUM | Open — currently safe (pinned via `package-lock.json` + `npm ci`), fragile to a future dependency bump |
| A2's dependency on `deploy-staging.yml`'s exact `"Deploying exact commit: <sha>"` log line is untested from the staging side | MEDIUM | Open — would require editing `deploy-staging.yml` or its own test coverage, out of this task's scope |
| Environment protection (required reviewer + branch policy) is external, mutable GitHub configuration, unasserted by the workflow itself | MEDIUM | Open — by design; asserting your own protection rules from inside the protected workflow is a deeper architectural question, not part of this fix |
| A1's cron-trigger check is array-order-sensitive though order carries no semantic meaning | LOW | Open — not part of this task's three named fixes |
| S9 does not distinguish enforced vs. report-only CSP | LOW | Open — matches the design document's own stated criterion, not a regression |
| The deployment manifest's "append-only" rule is convention only, not tool-enforced | LOW | Open |
| Reliance on GitHub's automatic secret-masking as an implicit backstop (exact-substring based) | LOW | Open — platform-level, not unique to this workflow |
| curl-based smoke checks cannot detect client-side/hydration-only failures | LOW | Open — inherent to this check style |
| RFQ submission end-to-end is never exercised by the smoke gate (deliberate, documented design decision, not a gap this task could fix) | — | Unchanged, by design |

**This workflow has still never been dispatched, on any input, against any real environment.** A dry run (invalid `deploy_ref`, then a SHA that never reached staging, confirming every assertion still fails closed live in GitHub Actions — not just locally) remains the responsible next step before the first real release, exactly as `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md`'s own "Recommended Next Step" and the original implementation report's §7 already said. This task did not perform that dispatch — it was scoped to fixing three specific defects in the file, not to authorizing or executing a release.
