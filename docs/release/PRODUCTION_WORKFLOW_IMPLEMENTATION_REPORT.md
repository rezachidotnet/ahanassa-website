# Production Workflow Implementation — Report

**Scope:** author `.github/workflows/deploy-production.yml` only. **No production deployment was executed, no Cloudflare resource was created/changed, no D1 data was touched, no secret was read/set/rotated, and no application code was modified.** Every command run against real Cloudflare/GitHub state during this task was read-only (`wrangler versions view/list/deployments list`, `wrangler d1 migrations list --remote`, `gh api` `GET`s) or a `--dry-run` (`wrangler versions upload --dry-run`, `wrangler versions deploy --dry-run`), plus one local `CLOUDFLARE_ENV=production npx vinext build` (writes only to the gitignored `dist/` directory, removed afterward).
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Files changed:** `.github/workflows/deploy-production.yml` (new), `lib/ci/workflow-invariants.test.ts` (extended), `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (new), `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` (new, this report)
**Date:** 2026-09-20
**Source of truth used, as directed:** `.github/workflows/deploy-staging.yml` (proven exact-SHA checkout, resource-assertion, and S1–S10 smoke-gate patterns), `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` (the frozen architecture — trigger, approval gate, A1–A3 preconditions, two-phase deploy, secret handling, smoke gate, rollback, evidence), `docs/release/PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` (the empirically-corrected staging-provenance mechanism and the confirmed `versions upload` secret-inheritance behavior).

**UPDATE, 2026-09-20 (audit-fix pass — same day):** an independent adversarial audit (`docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md`) performed after this report was first written found one CRITICAL defect (`rollout_percentage` below 100 was completely non-functional), one HIGH gap (A1 checked only `vars.APP_ENV`, not the other six production vars), and one MEDIUM gap (the smoke gate's catalog/RFQ checks covered only the default locale) in the implementation this report originally described as "PASS." All three were fixed in a follow-up task; the fixes, their verification, and what remains open are recorded in full in `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` — **that report is now the authoritative record of the current state of `rollout_percentage`, A1's vars check, and smoke-gate locale coverage; the corresponding narrative below is left as the historical record of what was true when this report was first written, except where explicitly marked updated.**

---

# RESULT

## PASS (original authoring pass — see the audit-fix report for the current, corrected state)

`npm test` — **1362/1362 passing** (was 1355/1355 immediately before this task; net +7: 6 new tests plus one previously-dormant test — `deploy-production.yml, once it exists, must carry the required production-release shape` — that activated automatically now that the file exists). `npx tsc --noEmit` — clean, 0 errors. The workflow YAML parses cleanly (`js-yaml`; 18 steps, all job outputs present), every `run:` block passes `bash -n`, and every safety-critical step's actual logic was functionally exercised against real (but read-only/dry-run) Cloudflare and GitHub state — not merely reviewed. Two genuine bugs were found and fixed during that functional testing (§5) before this report was written. **A subsequent independent audit found three further gaps this testing pass did not catch (see the update note above) — after `npm test` 1365/1365, `tsc` clean, 36/36 workflow-invariant tests, per `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md`.**

---

# 1. Files Changed

| File | Change |
| --- | --- |
| `.github/workflows/deploy-production.yml` | New. 18 steps: confirmation+SHA-format gate, checkout, SHA resolution, A1 (production target assertion), A2 (staging provenance log scan), A3 (migration parity, read-only), build, `PREVIOUS_VERSION_ID` capture, Phase 1 (`versions upload`), secret/binding verification, Phase 2 (`versions deploy`), evidence capture + upload, S1–S10 smoke gate. |
| `lib/ci/workflow-invariants.test.ts` | Added `validateProductionDeploySafetyShape()` and 7 new tests: one shape-conformance test against the real file (which also activates the pre-existing dormant `validateProductionWorkflowShape` test for the first time), and 6 mutation tests proving the new checks catch reintroduced `.inputs.deploy_ref` provenance queries, a reintroduced migration auto-apply, a reverted one-shot deploy, a removed rollback-target capture, a smoke gate retargeted at `*.workers.dev`, and a granted `contents: write`. |
| `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` | New — the append-only release ledger this task's item 8 requires. Currently empty (no real release yet); header/instructions only. |
| `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` | New — this report. |

Nothing else was touched. `wrangler.jsonc`, application code under `app/`/`lib/`/`components/`, `deploy-staging.yml`, and `ci.yml` are unmodified.

---

# 2. Workflow Architecture (as implemented)

| Aspect | Implementation |
| --- | --- |
| Trigger | `workflow_dispatch` only. `deploy_ref` (required, rejected before checkout unless it matches `^[0-9a-f]{40}$` exactly), `confirm` (must equal `"deploy-production"`), `rollout_percentage` (`type: choice`, `["10","50","100"]`, default `"100"`), `skip_staging_provenance` (`boolean`, default `false`, break-glass). |
| Gate | `environment: production` — pauses the job before any step (including checkout) until the GitHub Environment's required reviewer approves; live-verified this session still configured exactly as `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §2 recorded (reviewer `rezachidotnet`, branch policy `feat/header-hero-integrated`, both Cloudflare secrets present by name). |
| A1 — production target safety | Inline Node script (never checked out from `deploy_ref`) parsing `wrangler.jsonc`'s `env.production` block: Worker name `ahanassa-production`, `DB_OPS`/`DB_PUBLIC` names+ids, `routes` exactly `[{pattern:"www.ahanassa.com", custom_domain:true}]`, `workers_dev === true`, cron triggers exactly the 3 live-registered schedules, and a literal-free scan banning any string naming the staging environment anywhere under `env.production`. Runs before `setup-node`/`npm ci`/build. **Updated by the audit-fix pass** — originally checked only `vars.APP_ENV`; now validates all seven `env.production.vars` keys: `APP_ENV`/`ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_CRM_TEAM_ID`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` exact-pinned, `PRICE_STRIP_ENABLED`/`HOMEPAGE_RANKING_MODE` pattern-checked, `ENABLED_PRICE_PROVIDERS` presence-checked — see the audit-fix report §2. |
| A2 — staging provenance | **Uses the corrected method from `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`, not the original design doc's pseudocode** (see §3). Lists successful `Deploy Staging` (workflow `361701517`) runs, and for each, fetches its job log and greps (from a file, not a piped variable — see §5.1) for the literal line `Deploying exact commit: <deploy_ref>`. Never uses `workflow_run.inputs.deploy_ref`, `head_sha`, or the Deployments API's `sha` — all three are proven not to work by the precheck report, and a dedicated static test (`lib/ci/workflow-invariants.test.ts`) now fails the suite if any of them is ever reintroduced as executable code. `skip_staging_provenance=true` bypasses this with a loud `::warning::` and a `SKIPPED` marker recorded in the job summary and evidence — it does not bypass the environment's reviewer gate. |
| A3 — migration parity | Read-only `wrangler d1 migrations list DB_OPS/DB_PUBLIC --env production --remote`, checking for the literal `"No migrations to apply"` string. Never runs `d1 migrations apply` under any input or flag — a static test now fails the suite if that ever changes. |
| Build | `CLOUDFLARE_ENV=production npm run build` (after `rm -rf dist`) — the exact procedure `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §2 documents as required (the `@cloudflare/vite-plugin` env-flattening gotcha); every `wrangler` command afterward passes `--config dist/server/wrangler.json` and never `--env` again. |
| Rollback capture | `PREVIOUS_VERSION_ID` captured from `wrangler deployments list --json` **before** Phase 1 uploads anything — fails closed (aborts before any traffic shift) if it can't be determined. |
| Deploy | Two-phase: Phase 1 `wrangler versions upload` (0% traffic) → verify the new version's secret names (`ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY`) and D1/queue bindings via `wrangler versions view --json` → Phase 2 `wrangler versions deploy`. Never a one-shot `wrangler deploy`/`vinext-cloudflare deploy` — a static test enforces this. **Updated by the audit-fix pass** — Phase 2 originally deployed a single `"$NEW_VERSION_ID@<rollout_percentage>"` version-spec, which is a CRITICAL defect for any percentage below 100 (Cloudflare requires all specified percentages to sum to exactly 100). Now computes the complementary percentage for `PREVIOUS_VERSION_ID` and deploys both specs together for a non-100 rollout (`new@10 previous@90`, `new@50 previous@50`), verifying the generated percentages sum to 100 before ever invoking `wrangler` — see the audit-fix report §1. |
| Smoke gate | S1–S10 against the real `https://www.ahanassa.com` (never `*.workers.dev`), mandatory and blocking: homepage, `/fa` 308→`/`, `/services`, catalog index (dynamic slug discovery, never a hardcoded product), catalog detail (`<h1>` present, or a proven 404 if the catalog is legitimately empty), `/contact` RFQ form + Turnstile markup present (**no RFQ is ever submitted**), 404 handling, 5 security headers, and the public apex→`www` redirect. Any failure fails the job and prints the exact rollback command with `PREVIOUS_VERSION_ID` pre-filled — no automatic rollback. **Updated by the audit-fix pass** — homepage/catalog-index/catalog-detail/RFQ-render originally checked only the default (fa) locale (plus fa/en for homepage); now homepage, catalog index, catalog detail, and RFQ render all cover fa/en/ar (23 individual pass/fail assertions total, up from 10) — see the audit-fix report §3. |
| Evidence | Job summary (live) + a 365-day `production-release-evidence-<run_id>.json` artifact (SHA, both version ids, rollout %, staging provenance run, run id/attempt, timestamp) + job outputs. Never committed to the repository by the workflow itself — `permissions:` never includes `contents: write` (enforced by a static test); a human/agent appends a row to `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` afterward, exactly as every other report in this repository has always been produced. |
| Permissions | `contents: read`, `actions: read` (the latter is required only for A2's cross-workflow log read). |

---

# 3. Corrections Made to the Source Design Documents

The task named `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` and `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` as source of truth together — and the precheck report itself explicitly documents that it **corrects** a specific part of the design document. This implementation follows the precheck report's correction, not the superseded design-doc pseudocode, in the two places they disagree:

| # | What the design doc's illustrative pseudocode showed | What was actually implemented, and why |
| --- | --- | --- |
| 1 | §3: `jq -r '.workflow_runs[] \| select(.inputs.deploy_ref == $sha)'` against the runs list | `.inputs` **does not exist** on any historical workflow run via REST or GraphQL — proven empirically in `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` §2 Step 3, re-confirmed live in this session (`gh api .../workflows/361701517/runs` — no `inputs` key on either real run). Implemented instead: the log-scan method that report validates against both real successful staging runs, including the one case (`head_sha` ≠ deployed SHA) that would silently break a naive comparison. |
| 2 | §6: illustrative `wrangler versions view "$NEW_VERSION_ID" \| grep -q CLOUDFLARE_API_TOKEN` | `CLOUDFLARE_API_TOKEN` is the **deploy credential itself** (how `wrangler` authenticates to Cloudflare) — it is never a Worker secret and would never appear in `versions view` output. The design document's own §4/§7 tables, and the precheck report's real evidence table, both name the actual production Worker secrets: `ODOO_RFQ_API_TOKEN` and `TURNSTILE_SECRET_KEY`. Implemented instead: `wrangler versions view --json`, checking `.resources.bindings[]` for both real secret names with `type == "secret_text"` — live-verified this session to be exactly the current production secret set (`wrangler secret list --env production`). |

Two additional, smaller corrections were made to the design document's illustrative shell rather than following it verbatim, both found by actually running the commands read-only against real state rather than trusting the pseudocode:

| # | Design doc's illustrative snippet | Bug it has | Fix implemented |
| --- | --- | --- | --- |
| 3 | §9: `PREVIOUS_VERSION_ID="$(wrangler deployments list ... \| head -20 \| grep ... \| head -1)"` | `wrangler deployments list` prints **oldest-first** (live-verified: the design doc's own stated-correct value, `b07d8697-...`, is the *last* entry in real output, not among the first 20/first match) — this snippet would have captured a stale, wrong rollback target. | `wrangler deployments list --json \| jq -r '.[-1].versions[0].version_id'` — takes the *last* entry. Live-verified this session to correctly return `b07d8697-620c-485c-8fed-21b893ab602c`, matching the design document's own independently-stated "currently-serving version." |
| 4 | (implicit) reading a large `gh api .../logs` response into a shell variable and piping it into `grep -q` | A genuine, reproducible file-vs-pipe `grep` discrepancy was found during functional testing (§5.1) — large piped content intermittently failed to match a pattern that matched instantly when read from a file. | Every log/response body this workflow greps (A2's staging-run logs, all of the S1/S3/S5/S6/S7/S9 smoke-check bodies, the Phase 1 upload log, the new version's JSON) is written to a file first and grepped/`jq`'d from that file — never piped from a shell variable. This is strictly more robust regardless of the exact root cause (see §5.1) and costs nothing. |

Nothing else in either source document was altered — the trigger shape, approval gate, A1/A3 designs, two-phase deploy decision, secret-handling rules, S1–S10 smoke criteria, and rollback policy are implemented as specified.

---

# 4. Security Controls

| Control | How it's enforced |
| --- | --- |
| No implicit checkout | `deploy_ref` is mandatory; the checkout step pins `ref: ${{ inputs.deploy_ref }}` explicitly (same as staging). |
| No branch-name/short-SHA deploy | The very first step rejects anything not matching `^[0-9a-f]{40}$`, before checkout ever runs — stricter than staging, which tolerates a branch name. |
| Two independent operator-mistake gates | The environment's required reviewer (stops the job entirely) and the typed `confirm: "deploy-production"` string (catches an approved reviewer picking the wrong `deploy_ref` or wrong workflow) — neither substitutes for the other (§1 rationale in the design doc, carried forward verbatim). |
| No Cloudflare target as operator input | Worker name/D1 identities/routes/account stay fixed in `wrangler.jsonc` and environment secrets; never a `workflow_dispatch` input. |
| Fail-closed production target assertion (A1) | Runs before any checked-out code executes in any capacity; a static test (`validateProductionWorkflowShape`) requires a fail-closed assertion marker and the pinned Worker name. |
| Fail-closed, non-spoofable staging provenance (A2) | The three disproven/spoofable mechanisms are statically banned from ever appearing as executable code (`validateProductionDeploySafetyShape`); any GitHub API failure is treated as "not verified," never as "verified." |
| Read-only migration gate (A3) | `d1 migrations list` only; `d1 migrations apply` is statically banned from appearing anywhere in this file. |
| Rollback target always named | `PREVIOUS_VERSION_ID` capture fails closed if it can't be determined — no deploy proceeds without a named rollback target. |
| Secret values never exposed | Every check on Worker secrets verifies presence by **name only** (`wrangler versions view --json`, `type == "secret_text"`) — Cloudflare's API has no mechanism to return a secret's value, and no step constructs or logs one. |
| Least-privilege secret exposure | `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are declared only on the specific steps that invoke `wrangler` (A3, previous-version capture, Phase 1, binding verification, Phase 2) — never job-wide. |
| No production RFQ submission | The smoke gate's `/contact` check (S7) verifies form/Turnstile markup only; a static test bans `/api/rfqs` and any credentialed request from the smoke gate. |
| No automatic rollback | A smoke-gate failure fails the job loudly with the exact rollback command (`PREVIOUS_VERSION_ID` pre-filled) — a human decides, per the design doc's explicit rationale (a migration-caused failure isn't fixed by reverting the Worker). |
| No repository write access | `permissions:` is `contents: read, actions: read` only — never `write`; statically enforced. The deployment manifest is appended as a separate human commit. |
| No secret committed | No `CLOUDFLARE_*`/Worker secret value appears anywhere in this workflow, this report, or any commit produced by this task. |

---

# 5. Testing Performed

## 5.1 A genuine finding: file-vs-pipe `grep` robustness, found and fixed before this report was written

While functionally exercising A2 (staging provenance) and the smoke gate against real data, a reproducible discrepancy was found: piping a large (tens to hundreds of KB) shell variable into `grep -q` intermittently failed to find a pattern that was demonstrably present — while `grep` on the exact same content written to a file matched every time, on every shell tested (macOS bash 3.2 and a freshly-installed bash 5.3, both with real coreutils/BSD `grep`). The content itself was verified byte-identical between the "file" and "pipe" cases (`diff` confirmed no difference) each time this was reproduced, so it is a shell/`grep` pipe-handling quirk, not a data-fetching bug. Rather than spend further effort isolating the exact root cause (which does not reproduce with the GNU coreutils this workflow will actually run under on `ubuntu-latest`, and was never observed for small content), every place in this workflow that greps a fetched log or HTTP response body was rewritten to write that content to a file first and grep/`jq` the file — strictly more robust regardless of platform, and the fix that made every one of the manual test scenarios below pass consistently (previously intermittent). This is recorded as `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`/design-doc correction #4 in §3 above.

## 5.2 Functional tests performed against real (read-only/dry-run) state

| Step | What was tested | Result |
| --- | --- | --- |
| A1 (production target) | Extracted and run against the real `wrangler.jsonc` | **PASS** — printed the correct pinned values |
| A1 (mutation) | Run against a copy of `wrangler.jsonc` with the Worker name doctored | **Fails closed** — correct error, correct exit code |
| A2 (staging provenance) | Run with `DEPLOYED_SHA` = each of the two real SHAs proven staged in `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` (`3ce18c52...`, `c9c641ce...`) | **PASS** — correctly identifies the matching Deploy Staging run for each |
| A2 (fail-closed) | Run with a fabricated, never-staged SHA, `skip_staging_provenance=false` | **Fails closed** — correct error |
| A2 (break-glass) | Same fabricated SHA, `skip_staging_provenance=true` | **Passes with a loud `::warning::`**, `staging_provenance_run=SKIPPED` recorded |
| Build | `CLOUDFLARE_ENV=production npx vinext build`, inspected `dist/server/wrangler.json` | Correctly flattened: `name: "ahanassa-production"`, real D1/queue/route bindings, `workers_dev: true` — confirmed via `wrangler versions upload --dry-run` bindings table too |
| `PREVIOUS_VERSION_ID` capture | Run against real `wrangler deployments list --json` | Correctly returns `b07d8697-620c-485c-8fed-21b893ab602c`, matching the design document's own independently-verified "currently-serving version" |
| Phase 1 version-ID parsing | Synthetic `wrangler versions upload`-shaped log fixture | Correctly extracts the version id; correctly fails closed when the line is stripped (mutation) |
| Secret/binding verification | Run against the real, currently-live production version (`b07d8697-...`) | **PASS** — both secrets present, both D1 ids and the queue name correct |
| Secret/binding verification (fail-closed) | Run against a real historical production version from *before* `ODOO_RFQ_API_TOKEN` was ever set (`8b73bfdc-...`, per the precheck report's own version table) | **Fails closed** — correct error naming the missing secret |
| Smoke gate S1–S10 | Run three consecutive times against the real live `https://www.ahanassa.com` | **PASS, 10/10, all three times** (after the file-based fix in §5.1) — live results included a real published catalog slug discovered and its detail page's `<h1>`, the RFQ form + Turnstile markup, all 5 security headers, and the real apex→`www` redirect |
| Smoke gate (mutation) | One check (S1) rewritten to require an impossible string | **Fails closed** — that one check fails, all 9 others still independently pass on their own merits, job exits 1 |

No `wrangler versions upload` (real, non-dry-run), no `wrangler versions deploy` (real, non-dry-run), and no `wrangler deploy` was ever run against production during this task — every Phase 1/Phase 2 mechanic was validated via `--dry-run` or against pre-existing, already-real historical versions, never by creating a new one.

## 5.3 Static test suite

`npm test`: 1362/1362. `npx tsc --noEmit`: clean. `lib/ci/workflow-invariants.test.ts`: 33/33, including:

- The previously-dormant `deploy-production.yml, once it exists, must carry the required production-release shape` test — now active and passing against the real file for the first time.
- 7 new tests (1 shape-conformance + 6 mutation) proving `validateProductionDeploySafetyShape()` catches: a reintroduced `.inputs.deploy_ref` provenance query, a reintroduced migration auto-apply, a reverted one-shot deploy, a removed `PREVIOUS_VERSION_ID` capture, a smoke gate retargeted at a `*.workers.dev` preview URL, and a granted `contents: write`.
- All 26 pre-existing tests (staging + CI + the original production-shape scaffolding) continue to pass unchanged — this task did not modify `deploy-staging.yml` or `ci.yml`.

One real bug in this task's own draft was caught by its own new test before this report was written: the A3 error messages originally spelled out the literal manual `wrangler d1 migrations apply ...` command as operator guidance inside an `echo` string, which — being executable text, not a comment — tripped the new "must never auto-apply a migration" static scan. Fixed by rephrasing the guidance to point at `docs/release/CI_CD_POLICY.md` instead of restating the forbidden phrase inline, matching the discipline `deploy-staging.yml` already uses (such mentions confined to comments, never to executable strings).

---

# 6. What Was Deliberately Not Done

- **No dispatch of this workflow.** It has never been run, on any input, against any real environment.
- **No production deployment, of any kind, at any rollout percentage.**
- **No Cloudflare resource created, modified, or deleted** — every Cloudflare-facing command run during this task was a read (`versions view/list`, `deployments list`, `d1 migrations list --remote`, `secret list`) or an explicit `--dry-run`.
- **No D1 data touched, read, or migrated.**
- **No secret read, set, rotated, or printed** — only secret *names* were ever inspected, matching the pattern `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` itself already established as safe.
- **No application code changed** — `app/`, `lib/`, `components/` are untouched; the only test-suite change is the additive one described in §1.
- **`deploy-staging.yml` and `ci.yml` are unmodified.**
- **The production deployment manifest has no real rows yet** — it is a ready, empty ledger per this task's item 8, to be appended after the first real release.

---

# 7. Residual Items Before the First Real Dispatch

Carried forward from `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md`'s own BLOCKERS list — none of these block *this authoring task*; they gate the first real, non-dry-run dispatch:

| # | Item | Status |
| --- | --- | --- |
| 1 | `deploy-production.yml` does not exist | **Resolved by this task.** |
| 2 | Secret inheritance across `versions upload` unverified | Resolved (`PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`), and this workflow re-verifies it live on every real release regardless (§7 of the design doc, §4 above). |
| 3 | `package.json` still pins 18 dependencies to `"latest"` | **Still open** — unaffected by this task; weakens exact-SHA reproducibility. |
| 4 | Zero git tags exist | **Still open** — the deployment manifest (this task's item 8) partially compensates; tagging should still start at the first real release. |
| 5 | Staging smoke gate not yet backported | Resolved separately (staging release-evidence-hardening task, prior to this one). |
| 6 | `workflow_dispatch` `inputs` field shape unconfirmed | Resolved (`PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`) — the corrected log-scan method is what's actually implemented here. |
| 7 (new) | This workflow itself has never been dispatched, not even once | **Open, by design** — a dry run (invalid `deploy_ref`, then a SHA that never reached staging, confirming every assertion fails closed live in Actions) is the natural next step before the first real release, exactly as the design document's own "Recommended Next Step" describes. Not performed by this task, which was scoped to authoring the workflow file only. |
| 8 (new, added by the audit-fix pass) | An independent adversarial audit performed after this report was first written (`docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md`) found `rollout_percentage` below 100 was completely non-functional (CRITICAL), A1 checked only `vars.APP_ENV` (HIGH), and the smoke gate covered only the default locale for four checks (MEDIUM) | **Resolved** — see `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` for the fixes, their independent verification, and the audit's remaining LOW/informational items that were deliberately left open (out of that fix task's own explicit three-item scope). |
