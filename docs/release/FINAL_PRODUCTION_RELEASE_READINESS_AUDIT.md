# Final Production Release Readiness Audit

**Scope:** audit only. No file was modified, no commit was created, no push was made, no deployment was executed, no Cloudflare resource was created/changed/deleted, no GitHub setting was changed, no secret was touched, no migration was run. Every claim below was independently re-verified against **live, current** GitHub/Cloudflare state in this session — not carried forward from memory of prior audits — using read-only API calls and `--dry-run` Cloudflare commands only.
**Repository:** `rezachidotnet/ahanassa-website`
**Files reviewed:** `.github/workflows/deploy-production.yml`
**Supporting files reviewed:** `.github/workflows/deploy-staging.yml`, `lib/ci/workflow-invariants.test.ts`, `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`, `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md`, `docs/release/PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`
**Date:** 2026-09-20
**Preceding context:** this is the third pass over this workflow — `docs/release/PRODUCTION_WORKFLOW_INDEPENDENT_AUDIT.md` (CRITICAL/HIGH/MEDIUM findings) → `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` (fixes) → this readiness check. Every fix claimed in the fix report was independently re-verified fresh in this session, not merely re-read.

---

# RESULT

## CONDITIONAL_GO

## PRODUCTION_RELEASE_READY

## NO

**The workflow's content is sound and was re-verified fresh in this session — every content-level control from the prior audit checks out, and no new content defect was found.** The reason this is not a plain GO is a single, concrete, mechanical blocker discovered in this session that none of the prior three sessions surfaced: **`deploy-production.yml` has never been pushed to GitHub and is not registered as a dispatchable GitHub Actions workflow.** It exists only in the local git history of this working directory. Until that is fixed, the workflow cannot be run at all — not "should not," but structurally *cannot*, via `workflow_dispatch` or any other means. See §0 below.

---

# 0. Headline Finding — `deploy-production.yml` Is Not Pushed, Not Registered (BLOCKER)

**Discovered fresh in this session; not identified by any prior audit.**

```
$ git fetch origin feat/header-hero-integrated
$ git rev-parse origin/feat/header-hero-integrated
96f79cf6f2b0a2a677ad3837b3b1cd1d2c3abded
$ git rev-parse HEAD
25a3ece8773216474246d62bc7c69f5584e14094
$ git log --oneline origin/feat/header-hero-integrated..HEAD
25a3ece ci(production): fix audit blockers - rollout split, A1 vars, ar smoke coverage
ba672ae ci(production): author deploy-production.yml from the frozen release architecture
15692f9 ci(staging): capture release evidence and add mandatory smoke gate
... (9 more commits)
```

The local branch is **12 commits ahead of `origin/feat/header-hero-integrated`**. `deploy-production.yml` was introduced in `ba672ae` and fixed in `25a3ece` — **both unpushed**. The staging evidence-hardening commit (`15692f9`, the smoke-gate/evidence work `deploy-production.yml`'s own A2 mechanism and design narrative depend on) is unpushed too.

**Confirmed live via the GitHub API** (not inferred from the git state alone):

```
$ gh api repos/rezachidotnet/ahanassa-website/actions/workflows --jq '.workflows[]|{id,name,path}'
{"id":357303552,"name":"CI","path":".github/workflows/ci.yml"}
{"id":361701517,"name":"Deploy Staging","path":".github/workflows/deploy-staging.yml"}
```

Only two workflows are registered. `deploy-production.yml` does not appear — GitHub Actions has never indexed it, so it cannot be selected for `workflow_dispatch` in the Actions UI or dispatched via the REST API, regardless of how correct its content is.

**Pushing the branch alone is not sufficient**, per this repository's own already-established and documented pattern for the sibling `deploy-staging.yml` (its own header comment: *"main and the application branches have UNRELATED Git histories... A copy of this file exists on main purely so GitHub Actions registers/indexes the workflow"*). Confirmed live:

```
$ git fetch origin main && git ls-tree -r origin/main --name-only | grep '^\.github/workflows'
.github/workflows/deploy-staging.yml
$ git show origin/main:.github/workflows/deploy-production.yml
fatal: path '.github/workflows/deploy-production.yml' exists on disk, but not in 'origin/main'
```

`main` carries only `deploy-staging.yml`. For `deploy-production.yml` to become dispatchable, it needs a copy added to `main` too, exactly mirroring how `deploy-staging.yml` was registered.

**This is a pure operational/mechanical gap, not a design or content defect** — nothing about it required a code change to `deploy-production.yml` itself, and nothing in this finding contradicts the prior audit or fix report (both correctly scoped themselves to the *content* of the file, which is genuinely sound — see §§1–8). It is listed first because it is the one thing that makes every other finding in this document currently untestable-in-production and blocks the very first dispatch attempt outright.

**One further consequence worth naming directly:** because the workflow has never run as an actual GitHub Actions job (only ever exercised via local `bash -n`/extraction and direct `wrangler --dry-run` calls against the real Cloudflare account, across all three prior sessions), some GitHub-Actions-runtime-specific behaviors remain genuinely unobserved on the real platform — e.g., exact `GITHUB_ENV`/`GITHUB_OUTPUT` persistence timing across steps, the precise moment environment-scoped secrets become available relative to the reviewer-approval pause, and whether the `actions/checkout` step's `persist-credentials: false` interacts as expected inside a reviewer-gated job. Every one of these was reasoned about and is very likely correct (they follow documented, standard GitHub Actions semantics used identically by the already-proven `deploy-staging.yml`), but "very likely correct by inspection" and "observed to work" are different confidence levels, and this gap is why a supervised dry-run dispatch (§ Required Operator Actions) is recommended even after the registration gap is closed.

---

# 1. GitHub Environment

**Live-reverified this session:**

| Check | Result |
| --- | --- |
| `production` environment exists | **PASS** — `GET /repos/.../environments/production` returns it |
| Required reviewer exists | **PASS** — `required_reviewers` protection rule present, reviewer `rezachidotnet`, `prevent_self_review: false` |
| Branch policy exists | **PASS** — custom `branch_policy` rule present, restricted to `feat/header-hero-integrated` |
| Production secrets exist by name only | **PASS** — `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` present on the environment; **no value was read or printed** (Cloudflare/GitHub's own APIs have no mechanism to return a secret value via this endpoint) |
| No shadow repo-level secret | **PASS** — `GET /repos/.../actions/secrets` → `total_count: 0` |

Unchanged from the prior audit's live check — no drift. `prevent_self_review: false` with a single-person reviewer list means the same individual can dispatch and approve their own release; already documented as an accepted, solo-maintainer-project tradeoff in the prior audit — restated here, not re-litigated, and classified NON_BLOCKER (§9).

---

# 2. Production Workflow Trigger

Re-read the current file directly (not from memory):

| Check | Result |
| --- | --- |
| `workflow_dispatch` only | **PASS** — `on:` contains only `workflow_dispatch:` |
| `deploy_ref` required | **PASS** — `required: true` |
| `deploy_ref` exact-SHA validation | **PASS** — first executable step rejects anything not matching `^[0-9a-f]{40}$`, before checkout |
| Confirmation phrase required | **PASS** — `confirm` must equal exactly `"deploy-production"` |
| `rollout_percentage` validation | **PASS, and hardened beyond the choice-input default** — `type: choice` (`"10"`/`"50"`/`"100"`, default `"100"`) constrains the dispatch UI, **and** the same first step now also rejects any value other than those three literal strings before checkout, closing the gap where an API-triggered dispatch could otherwise bypass the UI dropdown (the audit-fix report's own documented hardening, re-confirmed present in the file). |

No regressions found relative to either prior report.

---

# 3. SHA Promotion

| Check | Result |
| --- | --- |
| Production deploy can only happen from a specific 40-hex SHA | **PASS** (§2) |
| ...and a previously successful staging deployment | **PASS, mechanism re-verified live** |
| Corrected provenance method used | **PASS** |

**Live-reconfirmed this session, not assumed:**

- Workflow `361701517` is still, today, `Deploy Staging` (`GET /repos/.../actions/workflows` — id and name both match exactly what A2 hardcodes).
- The **currently live** (pushed, unpushed-commit-independent) `deploy-staging.yml` on `origin/feat/header-hero-integrated` (commit `96f79cf`) still contains the exact line `echo "Deploying exact commit: $DEPLOYED_SHA"` A2 depends on — checked directly against the remote blob, not the local working copy, since A2's real-world correctness depends on what's actually live, not what's staged locally.
- Exactly two successful `Deploy Staging` runs exist today (unchanged since the prior audit): `35426318953` (2026-09-19T06:20:07Z) and `35428823679` (2026-09-19T07:15:24Z), for SHAs `3ce18c52ef1a84311523d3bfe756139a545c8752` and `c9c641ce5f8e8653ba1396417687823916db01fb` respectively.
- Code path re-read line by line in the current file: lists successful runs → fetches each run's first job's log to a **file** → `grep -qF` (fixed-string, file-based — the file-vs-pipe robustness fix from the prior fix task, still present) for the exact line. **No** `workflow_run.inputs.deploy_ref`, **no** `head_sha` comparison, **no** Deployments-API `sha` lookup anywhere in executable code (only in comments explaining why not) — confirmed by direct reading, and independently enforced by a static test (`lib/ci/workflow-invariants.test.ts`, re-run this session, passing).

**Practical consequence for the first release:** the `deploy_ref` used for the first production dispatch must be one of the two SHAs above (unless a fresh `Deploy Staging` run is dispatched first for a different, more current SHA — `deploy-production.yml`'s own recent authoring/fix commits are CI tooling, not application code, so they do not themselves need to be "staged" for this purpose). See Required Operator Actions.

---

# 4. Cloudflare Safety

**A1 (production target assertion) re-run fresh this session** against the real, current `wrangler.jsonc` (unchanged since the prior fix task — `git diff` confirms no working-tree drift): **PASSED**, printing the correct pinned Worker name, both D1 bindings, routes, `workers_dev`, crons, and — per the fix — all seven `env.production.vars` values.

| Check | Result |
| --- | --- |
| Production Worker target (`ahanassa-production`) | **PASS** |
| D1 bindings (`DB_OPS`/`DB_PUBLIC`, both name+id) | **PASS** |
| Routes (`www.ahanassa.com`, exact array match) | **PASS** |
| Cron configuration (exact array match, 3 schedules) | **PASS** |
| Production vars validation | **PASS — fixed and re-verified.** All 7 vars checked: `APP_ENV`/`ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_CRM_TEAM_ID`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` exact-pinned; `PRICE_STRIP_ENABLED`/`HOMEPAGE_RANKING_MODE` pattern-checked; `ENABLED_PRICE_PROVIDERS` presence-checked. |

**"Could an accidental deployment to another Worker/D1 fail?" — re-tested, not just read.** A1's fail-closed behavior against a deliberately mismatched target was already proven in the prior fix session (a doctored Worker name, and a doctored `ODOO_BASE_URL`, both correctly triggered `PRODUCTION TARGET ASSERTION FAILED` before any build/deploy step). This session re-ran A1 clean against the real file and confirms the assertion logic itself is unchanged and still exercises every one of those checks in the same fail-closed order, before `npm ci`/build/any `wrangler` deploy command.

**Live Cloudflare state re-checked this session (read-only):**
- Currently-serving production version: `b07d8697-620c-485c-8fed-21b893ab602c` at 100% — unchanged since the prior session, no drift.
- Production Worker secrets (names only): `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY` — unchanged, matching exactly what the "Verify secret inheritance" step checks for.

---

# 5. Migration Safety

**Re-run fresh this session** (read-only, `wrangler d1 migrations list --remote`, no `apply`):

```
DB_OPS:    ✅ No migrations to apply!
DB_PUBLIC: ✅ No migrations to apply!
```

| Check | Result |
| --- | --- |
| `DB_PUBLIC` parity check | **PASS** — both checked, current state is clean |
| `DB_OPS` parity check | **PASS** |
| No automatic migration | **PASS** — `grep`ed the current file: `migrations apply` appears nowhere in executable code (only in comments/operator-facing error text pointing at the separate manual procedure — the exact fix already applied in the prior task after its own static test caught the earlier draft doing this wrong) |
| Failure behavior is safe | **PASS** — either database not reporting the exact `"No migrations to apply"` string triggers `exit 1` before `npm ci`/build/deploy. A3 runs third in the A1→A2→A3 order (cheapest/most-critical local check first, migration parity — the most expensive network call — last), so a migration-parity failure still occurs before any code executes. |

Both databases are at parity **right now** — a real production release dispatched today would pass A3 without needing a manual migration first. This can change between now and an actual dispatch (a future app-code commit could add a migration) — A3 will catch that correctly if it happens, exactly as designed.

---

# 6. Deployment Safety

Pipeline re-read end to end: capture `PREVIOUS_VERSION_ID` → Phase 1 `versions upload` → secret/binding verification → Phase 2 `versions deploy`.

| Check | Result |
| --- | --- |
| Previous version capture | **PASS** — re-run this session against real `wrangler deployments list --json`, still correctly returns `b07d8697-620c-485c-8fed-21b893ab602c` (the actual currently-serving version); fails closed if empty |
| Rollback command correctness | **PASS** — always `"$PREVIOUS_VERSION_ID@100"`, a single-spec deploy that is always valid regardless of what rollout percentage the forward deploy used (100 alone always sums to 100) |
| Rollout 10/50/100 logic | **PASS — the CRITICAL fix re-verified live, again, in this session.** Re-ran `wrangler versions deploy <new>@10 <previous>@90 --dry-run` against the real production Worker: succeeds non-interactively, no error. This is the third independent session to confirm this exact fix works (audit found it broken → fix task fixed and verified it → this session re-verified it once more, fresh, with no regression). |

The two-phase structure (zero-traffic upload → verify → traffic-shifting deploy) is unchanged and intact; `PREVIOUS_VERSION_ID` is still captured before Phase 1 uploads anything, so a rollback target is always named before any traffic can move.

---

# 7. Smoke Gate

**Re-run fresh this session, live, against the real production site** (read-only GETs; no RFQ submitted; no credential used):

```
S1  homepage /              -> 200, <html lang="fa" dir="rtl">           PASS
S1b homepage /ar            -> 200, <html lang="ar" dir="rtl">           PASS
S2  /fa redirect            -> 308 -> /                                  PASS
S3  homepage /en            -> 200, <html lang="en" dir="ltr">           PASS
S4  services fa/en/ar       -> 200 / 200 / 200                           PASS
S5  catalog index fa/en/ar  -> real slug (fa) / empty-state (en) / empty-state (ar)   PASS
S6  catalog detail fa/en/ar -> <h1> (fa) / 404-on-empty (en) / 404-on-empty (ar)      PASS
S7  RFQ render fa/en/ar     -> form+Turnstile present, all three           PASS
S8  404 handling            -> 404, not 500                              PASS
S9  security headers        -> all 5 present                             PASS
S10 apex redirect           -> 308 -> www                                PASS

PASSED (23/23)
```

Every one of the checklist's named areas is covered: homepage, fa, en, ar, services, catalog, catalog detail, RFQ render, 404, security headers, apex redirect.

## "Could smoke pass while a critical production issue exists?"

**Yes, in ways already identified and accepted, not newly found this session:**

1. **RFQ submission end-to-end is never exercised, by explicit design.** S7 verifies the form and Turnstile widget render — it never submits. If `TURNSTILE_SECRET_KEY` or `ODOO_RFQ_API_TOKEN` were subtly wrong, or the Odoo-side endpoint were broken, smoke would report 23/23 while the single most business-critical conversion path silently failed for every real customer. This is a deliberate, documented tradeoff (no safe non-production credential exists to test against, and a real customer-identity RFQ must never be auto-submitted) — mitigated by post-release human observation (queue/DLQ health, Turnstile success rate), not by the smoke gate itself.
2. **curl-based checks cannot see client-side/hydration-only failures** — no JavaScript executes. A broken interactive widget that doesn't change server-rendered HTML/status/headers is invisible here. Inherent to this check style, not a defect.
3. **Headers are checked on `/` only**, not on every page type — a reasonable proxy given headers are applied by global middleware, not per-route logic, but not exhaustive.

None of these are new; all three were already named in the original independent audit and are unchanged.

---

# 8. Evidence

| Check | Result |
| --- | --- |
| Deployment manifest exists | **PASS** — `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` exists, correctly empty (no real release has ever happened), with clear column-mapping instructions |
| Release report exists | **PASS** — `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` (updated in place with a dated note) and `docs/release/PRODUCTION_WORKFLOW_AUDIT_FIX_REPORT.md` both present and internally consistent with the current file content, re-verified this session |
| Artifact storage | **PASS** — `production-release-evidence-<run_id>.json` uploaded via `actions/upload-artifact@v4`, 365-day retention, contains SHA/both version ids/rollout %/deploy-specs/staging-provenance-run/timestamps; no secret value in it |
| Append-only behavior | **Convention only, not tool-enforced** — unchanged from the original audit's finding; nothing technically prevents a future edit from rewriting an existing manifest row instead of appending. Restated, not new. |

**One small, genuinely new observation this session:** the manifest's own "How to append a row" table still gives `PASSED (10/10)` as its Smoke-result example — stale since the locale-coverage fix changed the real count to 23. Cosmetic only (the actual workflow computes and prints the real count dynamically; only the manifest's illustrative example text is stale) — classified LOW/NON_BLOCKER, worth a one-line fix whenever the manifest file is next touched, not before the first release.

---

# 9. Remaining Risks

## BLOCKER (must fix before first production deployment)

| # | Risk | Why it blocks |
| --- | --- | --- |
| 1 | `deploy-production.yml` is not pushed to `origin` and not registered as a GitHub Actions workflow (§0) | The workflow cannot be dispatched at all until this is fixed — not a safety concern, a hard mechanical prerequisite |

## NON_BLOCKER (can be accepted for first release)

Carried forward from the original independent audit, none newly elevated by this session's re-verification, all re-confirmed still accurate/unchanged:

| # | Risk | Why it's acceptable for a first, carefully-supervised release |
| --- | --- | --- |
| 1 | Reviewer self-review permitted (`prevent_self_review: false`, single reviewer) | Structural consequence of a solo-maintainer project; still requires a deliberate, logged approval click — not a rubber stamp |
| 2 | A2/A3/Phase-1-parsing/rollback-capture depend on exact, unversioned `wrangler`/`gh` CLI output text | Currently pinned via `package-lock.json` + `npm ci` for any given `deploy_ref`; every instance fails closed if it ever breaks |
| 3 | A2's dependency on `deploy-staging.yml`'s exact log line is untested from the staging side | Re-confirmed live this session that the line is still present; would fail closed (block deploys), not open, if it ever changed |
| 4 | Environment protection is external, mutable GitHub config, unasserted by the workflow itself | Re-confirmed live this session, correctly configured; changing this is itself a loud, auditable GitHub action |
| 5 | RFQ submission end-to-end never exercised by the smoke gate | Deliberate, documented design decision; mitigated by human post-release observation |
| 6 | curl-based smoke checks blind to client-side/hydration failures | Inherent to this check style |
| 7 | `package.json` pins 18 deps to `"latest"` (locked exactly via `package-lock.json`, confirmed consistent) | Pre-existing, unrelated to this workflow's own safety |
| 8 | Zero git tags exist | The deployment manifest partially compensates; tagging should start at the first real release, not before it |
| 9 | Manifest's smoke-result example text is stale (`10/10` vs. the real 23) | Cosmetic; the workflow itself computes and reports the real count correctly |
| 10 | This workflow has never executed as a real GitHub Actions job (only simulated/dry-run locally) — see §0's closing note | Addressed by the recommended supervised dry-run dispatch below, immediately after the registration blocker is closed |

No risk in this audit was newly elevated to BLOCKER beyond §0's finding. No content-level defect was found in this session that either prior audit missed.

---

# Required Operator Actions Before First Release

1. **Push `feat/header-hero-integrated` to `origin`** (at least through commit `25a3ece`, ideally current `HEAD`).
2. **Add a copy of `deploy-production.yml` to the `main` branch** — mirroring exactly how `deploy-staging.yml` was registered there — and confirm via `gh api repos/rezachidotnet/ahanassa-website/actions/workflows` that `Deploy Production` now appears as a third, active, dispatchable workflow. (Both of these are git/GitHub operations outside this audit's own scope — "audit only, do not modify workflows" — and are the operator's own next step, not performed here.)
3. **Recommended, not strictly blocking:** dispatch once with a deliberately invalid `deploy_ref` (e.g., 40 zeros) to confirm the reviewer-approval pause and A1's fail-closed behavior on real GitHub Actions infrastructure for the first time — closing the observability gap noted at the end of §0 — before risking a real SHA.
4. **Choose the `deploy_ref` for the first real release**: either `3ce18c52ef1a84311523d3bfe756139a545c8752` or `c9c641ce5f8e8653ba1396417687823916db01fb` (the only two SHAs currently proven on staging), or dispatch `Deploy Staging` fresh for a more current SHA first if the intended release should include more recent application-code changes.
5. **Use `rollout_percentage: 10` for the first dispatch** (see recommendation below).
6. **After the release completes, manually append a row to `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`** using the values from the run's own job summary/evidence artifact — the workflow deliberately never writes to the repository itself.

---

# FIRST_RELEASE_RECOMMENDATION

**Suggested rollout: 10%.**

This is the first-ever dispatch of a brand-new pipeline that has never executed on real GitHub Actions infrastructure. The rollout-split mechanism that makes a 10% canary meaningful (rather than erroring outright) was the audit's own CRITICAL finding and has now been fixed and re-verified live in three separate sessions, including this one — it is ready to use for exactly the purpose it was built for. A 10% canary limits blast radius while the operator observes the first real execution of A1→A2→A3, the two-phase deploy, and the smoke gate together, on the real platform, before committing the remaining 90% via a second dispatch at `rollout_percentage: 100` once the canary looks healthy. This matches the original design document's own "Recommended Next Step" and is the more conservative, not the more convenient, choice — appropriate for a first release specifically because of §0's finding that nothing here has run for real yet.
