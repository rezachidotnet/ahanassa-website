# STG-P1 — Controlled Staging Execution Report

Date: 2026-09-13
Task type: controlled staging execution (push, CI, real D1 migration apply on staging DB_PUBLIC). Production was never touched — no command in this task referenced any production resource, even read-only.

---

# RESULT

**D — STAGING EXECUTION STOPPED — PREDEPLOY/MIGRATION/CI FAILURE.**

This label is the closest fit in the required enum but needs a precise qualifier: **CI passed and the migrations succeeded.** The stop is specifically at the operator-setup predeploy gate (§3 of the authorizing task): no GitHub Environment named `staging` and zero GitHub Actions secrets exist in this repository (verified fresh, read-only, via the GitHub API — not assumed from STG-P0). Per that gate's explicit instruction ("STOP before deploy and report OPERATOR ACTION REQUIRED"), the actual `deploy-staging.yml` dispatch was never attempted. Everything upstream of deploy — push, CI, resource re-verification, recovery-point capture, and all four staging `DB_PUBLIC` migrations — completed successfully and is now real, live state on the staging database.

---

# PREFLIGHT

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    7bb2c347868c9bcc62bdcdce7455583d797296b3
status:  clean
remote:  origin  git@github.com:rezachidotnet/ahanassa-website.git (fetch/push)
```

Working tree was clean before this task began; HEAD matched the STG-P0 checkpoint exactly (`7bb2c34`, "docs: record staging readiness and migration plan"). `CLAUDE.md`, `PROJECT_OVERRIDES.md`, `docs/release/CI_CD_POLICY.md`, `docs/release/CI_CD_P1_IMPLEMENTATION_REPORT.md`, and `docs/release/STG_P0_STAGING_READINESS_AND_MIGRATION_PLAN.md` were all already current in this session's context from the immediately-preceding STG-P0 task; a fresh operator-gate check (below) found no drift from STG-P0's findings, so the full STG-P0 audit was not redone.

---

# BASE SHA

`7bb2c347868c9bcc62bdcdce7455583d797296b3`

---

# PUSH

**Performed.** `git push origin feat/header-hero-integrated` created the remote branch (it did not exist before — confirmed absent from `git ls-remote --heads origin` in STG-P0). Only this branch was pushed; `main` was never touched, no merge was performed.

---

# REMOTE BRANCH SHA

`7bb2c347868c9bcc62bdcdce7455583d797296b3` — confirmed via a read-only `GET /git/refs/heads/feat/header-hero-integrated`, exactly matching local `HEAD`.

---

# CI RUN

- **Workflow:** `CI` (`.github/workflows/ci.yml`)
- **Run ID:** `34778222664`
- **Run URL:** https://github.com/rezachidotnet/ahanassa-website/actions/runs/34778222664
- **Commit SHA:** `7bb2c347868c9bcc62bdcdce7455583d797296b3`
- **Trigger:** `push`
- **Status:** `completed` — **`conclusion: success`**
- **Job `verify` steps, all `success`:** Checkout → Setup Node.js → Install dependencies (immutable) → Run tests → Type check → Build → Post Setup Node.js → Post Checkout → Complete job.
- Total run duration: ~47 seconds (19:36:40Z → 19:37:27Z).

This is the first-ever GitHub Actions run in this repository's history (`GET /actions/workflows` returned zero workflows before this push).

---

# GITHUB ENVIRONMENT

**ABSENT.** Fresh, read-only check (`GET repos/rezachidotnet/ahanassa-website/environments`) returned exactly two environments — `Preview` and `Production` — both created by Vercel's Git integration (creation dates `2026-08-28`/`2026-08-18`, matching that integration's history, not this project's GitHub Actions work), neither carrying any protection rule. **No environment named `staging` exists.** Identical to the STG-P0 finding — no drift.

---

# GITHUB SECRET STATUS

**ABSENT — both.** Fresh, read-only check (`GET repos/rezachidotnet/ahanassa-website/actions/secrets`, names/count only, no value ever requested or exposed) returned `"total_count":0`. Neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_ACCOUNT_ID` (nor any other secret) exists in this repository. Identical to the STG-P0 finding — no drift.

**Per the authorizing task's §3: this is a hard STOP condition before the deploy step.** Execution proceeded through push/CI/migrations (none of which require these secrets — they use this session's own already-authenticated `wrangler`/`gh` credentials) and stopped cleanly before attempting `deploy-staging.yml`.

---

# STAGING APP SECRET STATUS

Re-checked fresh this session (`wrangler versions view` against the currently-active staging version, read-only, non-secret vars/secret-names only):

- `ODOO_API_KEY` — **present** (legacy, deprecated credential; not used by the current RFQ delivery path).
- `TURNSTILE_SECRET_KEY` — **absent.**
- `ODOO_RFQ_API_TOKEN` — **absent.**

**Classification: B — ONE/BOTH ABSENT.** Homepage staging work can proceed (and did — see MIGRATIONS APPLIED below); a real RFQ end-to-end staging test remains a GAP until both secrets are provisioned. No value was fabricated, copied, or bypassed.

---

# RESOURCE VERIFICATION

Re-read fresh from `wrangler.jsonc` and cross-checked against a live `wrangler deployments list`:

| Resource | Staging value | Confirmed ≠ production |
|---|---|---|
| Worker | `ahanassa-bootstrap-staging` | ✅ (production: `ahanassa-production`) |
| `DB_OPS` | `ahanassa-ops-staging` (`49bd0aff-e289-4fff-b7b9-0f4b517e6b14`) | ✅ (production: `7240a6a7-c293-4e6e-baf3-95838a3c2944`) |
| `DB_PUBLIC` | `ahanassa-public-staging` (`35cef70f-3ad3-4049-add4-ddcac6cac45b`) | ✅ (production: `73ba6b50-ef57-4d89-baa9-617a0b0af127`) |

No mismatch. Every command in this task that touched a real resource specified `--env staging` (or `--name ahanassa-bootstrap-staging`) explicitly; none referenced production, even read-only.

---

# PRE-MIGRATION STATE

Fresh read-only check (`npx wrangler d1 migrations list <DB> --env staging --remote`), immediately before mutation:

```
DB_PUBLIC staging — pending:
  0007_processing_groups.sql
  0008_price_variant_identity_and_provider_policy.sql
  0009_catalog_group_labels.sql
  0010_homepage_eligibility.sql

DB_OPS staging — ✅ No migrations to apply!
```

Exactly matches STG-P0's expected list — no drift. Per the authorizing task's explicit instruction, `DB_OPS` was **not** re-applied "merely for symmetry" since nothing was pending.

---

# DB_PUBLIC RECOVERY POINT

**Database:** `DB_PUBLIC` (staging, `ahanassa-public-staging`)
**Captured:** `2026-09-13T19:43:39Z`
**Bookmark:** `0000001c-00000000-000050e5-88da717b8e076cff14f2c9f829c240b1`
**Restore command (if ever needed):**
```bash
npx wrangler d1 time-travel restore DB_PUBLIC --env staging --bookmark=0000001c-00000000-000050e5-88da717b8e076cff14f2c9f829c240b1
```

Captured via `npx wrangler d1 time-travel info DB_PUBLIC --env staging` — a read-only Cloudflare D1 API call; no state was changed by capturing it. Freshly captured this session, not reused from STG-P0.

---

# DB_OPS RECOVERY POINT

**Database:** `DB_OPS` (staging, `ahanassa-ops-staging`)
**Captured:** `2026-09-13T19:43:47Z`
**Bookmark:** `00000730-00000000-000050e5-ab9d6c585c7b1eacd9e89c440aac5f67`

Captured for evidence/symmetry, as instructed, even though no migration was applied to this database.

---

# PREVIOUS WORKER VERSION

`45c44767-0692-4052-be23-3b7d32678e1e` (created `2026-09-03T18:33:43.938Z`) — re-confirmed fresh via `npx wrangler deployments list --name ahanassa-bootstrap-staging`, **unchanged** since STG-P0 (no deploy has happened to staging between the two tasks). This remains the current, live, 100%-traffic staging Worker version — and, since no application deploy occurred in this task, it still is as this report is written.

---

# MIGRATIONS APPLIED

**Command:** `npx wrangler d1 migrations apply DB_PUBLIC --env staging --remote`

| Migration | Result |
|---|---|
| `0007_processing_groups.sql` | ✅ applied |
| `0008_price_variant_identity_and_provider_policy.sql` | ✅ applied |
| `0009_catalog_group_labels.sql` | ✅ applied |
| `0010_homepage_eligibility.sql` | ✅ applied |

Applied in exactly the expected numeric order, automatically, in one invocation (19 total SQL statements executed across the four files: 7 + 8 + 2 + 2). No manual reordering. No failure at any step — all four report `✅`. **Only staging was touched; production `DB_PUBLIC` remains at its pre-existing pending state (0007–0010 still pending there), untouched by this task.**

---

# POST-MIGRATION VERIFICATION

`npx wrangler d1 migrations list DB_PUBLIC --env staging --remote` → **`✅ No migrations to apply!`**

Read-only schema confirmation (`SELECT name FROM sqlite_master WHERE type='table' AND name IN (...)`) confirmed all four new tables exist on the real staging database:

- `public_processing_groups` ✅
- `processing_sync_state` ✅
- `price_provider_policies` ✅
- `catalog_group_labels` ✅

And (`SELECT sql FROM sqlite_master WHERE name='homepage_product_rank'`) confirmed the column:

```sql
... show_on_homepage INTEGER NOT NULL DEFAULT 1 CHECK (show_on_homepage IN (0, 1))
```

is present on the live `homepage_product_rank` table. No application data was mutated by any of these reads.

---

# DEPLOY WORKFLOW

**NOT RUN.** Blocked at the operator-setup gate (§3 of the authorizing task): `staging` GitHub Environment absent, `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets absent (both fresh-verified above). Per the explicit instruction to stop before deploy rather than attempt a dispatch that cannot succeed, `deploy-staging.yml` was never dispatched.

Supplementary, informational finding: a read-only `GET /actions/workflows` shows only `CI` registered — `deploy-staging.yml` is not yet indexed by GitHub Actions. This is expected, normal behavior for a `workflow_dispatch`-only workflow that has never been triggered and does not exist on the repository's default branch (`main`); it is not an additional blocker beyond the missing secrets. Once secrets/environment exist, it remains dispatchable by referencing the file path directly (e.g. `gh workflow run .github/workflows/deploy-staging.yml --ref feat/header-hero-integrated`), which does not require the workflow to be pre-indexed.

---

# DEPLOYED COMMIT

**NONE.** No deploy was performed.

---

# NEW WORKER VERSION

**NONE.** The staging Worker remains at `45c44767-0692-4052-be23-3b7d32678e1e` (unchanged) — now serving against the freshly-migrated `DB_PUBLIC` schema, but running the same application code as before this task (from `2026-09-03`), which predates this branch's Homepage/Footer/CI-CD work.

---

# HOMEPAGE SMOKE

**NOT RUN.** No new application deploy occurred this task. The currently-live staging Worker predates Footer P1, Final CTA V1.0, the Industries image gate closure, and CI-CD-P1 — smoke-testing it would not validate the code this task exists to stage, and would be misleading if reported as representative. Deferred to the task that actually dispatches `deploy-staging.yml`.

---

# PRODUCT SHOWCASE

**NOT RUN** (same reason as HOMEPAGE SMOKE — requires a fresh deploy of current branch code to be meaningful).

---

# HEADER DATA

**NOT RUN** (same reason).

---

# ROUTE SMOKE

**NOT RUN** (same reason).

---

# FA

**NOT RUN.**

# EN

**NOT RUN.**

# AR

**NOT RUN.**

---

# RFQ E2E

**DEFERRED — STAGING SECRET GAP.** `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` are both absent on staging (confirmed above) — independent of, and in addition to, the deploy blocker. No value was fabricated or bypassed; no RFQ was submitted.

---

# INDEXABILITY

Not live-re-verified (no new deploy to check against). Unchanged at the code level: `app/[locale]/page.tsx`'s `generateMetadata` still hardcodes `indexable: false` unconditionally — confirmed unmodified, since no runtime code was touched by this task (only migration SQL files, already committed and unmodified, were applied against the database).

---

# BROWSER MATRIX

**NOT RUN** — no fresh staging deploy exists to browse.

# 200% ZOOM

**NOT RUN.**

# KEYBOARD / FOCUS

**NOT RUN.**

# REDUCED MOTION

**NOT RUN.**

# CONSOLE / ERROR CHECK

**NOT RUN** — no new deploy to inspect logs/console against.

---

# ROLLBACK STATUS

**NOT NEEDED.** No application deploy was performed, so there is nothing to roll back at the Worker level. The four applied migrations remain in place — correctly: they are purely additive/backward-compatible, and the currently-live (older) Worker version was already proven tolerant of their prior absence (per STG-P0's try/catch analysis), so their new presence introduces no incompatibility with what's live today. No database restore was performed or is warranted.

---

# PRODUCTION SAFETY

**Production was not touched in any way in this task — not even read-only.** Every command that addressed a real Cloudflare resource explicitly specified `--env staging` or `--name ahanassa-bootstrap-staging`; no command in this session referenced `DB_OPS`/`DB_PUBLIC` production IDs, `ahanassa-production`, or `--env production`. No Odoo call was made. No production secret was read or modified. `main` was not pushed, merged, or otherwise touched — only `feat/header-hero-integrated` was pushed.

---

# REMAINING GAPS

1. **GitHub Environment `staging`** must be created by the operator (currently absent entirely).
2. **`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`** GitHub Actions secrets must be provisioned by the operator (currently zero secrets exist repo-wide).
3. **`TURNSTILE_SECRET_KEY` / `ODOO_RFQ_API_TOKEN`** remain unprovisioned on the staging Cloudflare Worker — a pre-existing gap, unchanged by this task; RFQ E2E on staging stays blocked until both exist.
4. **The actual staging application deploy** has not happened. The migrations applied in this task are real and durable, but their functional benefit (Product Showcase rendering, Header dropdown localization) cannot be observed until current branch code is deployed to the staging Worker.
5. **All smoke/route/locale/browser/zoom/keyboard/reduced-motion/console verification** remains entirely outstanding, gated on item 4.

---

# READY FOR PRODUCTION RELEASE PREPARATION

**NO.** Staging migrations are complete and verified, but the staging application deploy — and everything that depends on it (functional smoke tests, browser acceptance, RFQ E2E) — has not yet been executed. Production release preparation cannot reasonably begin before staging itself has been deployed to and verified.

---
---

# CONTINUATION — 2026-09-13 (resume after operator setup)

This section is a continuation of the report above, not a rewrite of it. **FIRST ATTEMPT** (above): stopped cleanly at the operator setup gate — no `staging` GitHub Environment, zero GitHub Actions secrets. **THIS CONTINUATION**: the operator completed that setup; a new, different, previously-undiscovered blocker was found one step later, at the actual deploy dispatch — this section documents it and stops again, for a different reason, pending an owner decision.

## Fresh preflight

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    3b6bcf059b8677e017d8fc1e70a10bd4e38eeb91
status:  clean
```

HEAD is one commit ahead of the FIRST ATTEMPT's base (`3b6bcf0`, the report commit for that attempt) — no runtime code changed since the CI-verified commit `7bb2c34`.

## Operator setup — re-verified, correctly scoped this time

Per this continuation task's explicit correction, the **Environment-scoped** secret list was checked (not the repository-wide list, which does not show Environment secrets and was the reason the first attempt correctly reported them as absent at that time):

- `GET /repos/rezachidotnet/ahanassa-website/environments` → **`staging` now exists** (id `21847608435`, created `2026-09-13T19:35:48Z`, `protection_rules: []` — recorded honestly, no protection rules configured).
- `GET /repos/rezachidotnet/ahanassa-website/environments/staging/secrets` → **both required names present**: `CLOUDFLARE_ACCOUNT_ID` (created `2026-09-13T19:54:03Z`), `CLOUDFLARE_API_TOKEN` (created `2026-09-13T19:47:59Z`). Names/timestamps only — no value was requested, returned, or could be returned by this API.

**Operator setup gate: PASS.**

## Migrations — re-verified only, not reapplied

```
npx wrangler d1 migrations list DB_PUBLIC --env staging --remote  → ✅ No migrations to apply!
npx wrangler d1 migrations list DB_OPS --env staging --remote     → ✅ No migrations to apply!
```

Confirms the FIRST ATTEMPT's applied state is unchanged and durable. **No `wrangler d1 migrations apply` command was run in this continuation.**

## Resource re-verification

Re-read directly from `wrangler.jsonc`: `ahanassa-bootstrap-staging` / `ahanassa-ops-staging` (`49bd0aff-...`) / `ahanassa-public-staging` (`35cef70f-...`) — confirmed distinct from `ahanassa-production` / `ahanassa-ops-production` (`7240a6a7-...`) / `ahanassa-public-production` (`73ba6b50-...`). No mismatch.

## CI state

`GET /git/refs/heads/feat/header-hero-integrated` → still exactly `7bb2c347868c9bcc62bdcdce7455583d797296b3` — the same commit CI run `34778222664` already passed. No code changed remotely since that run; per this task's own instruction, that successful result was reused rather than re-run for its own sake.

## Deploy attempt — new blocker found

Attempted, in order:

1. `gh workflow run deploy-staging.yml --ref feat/header-hero-integrated -f confirm=deploy-staging` → **`HTTP 404: workflow deploy-staging.yml not found on the default branch`**.
2. Direct REST call, `POST /repos/.../actions/workflows/deploy-staging.yml/dispatches` with `ref=feat/header-hero-integrated` and the `confirm` input → **same 404**.

**Diagnosis, confirmed empirically (not guessed):** this is not the commonly-assumed "`workflow_dispatch` requires the target ref to be the default branch" restriction — `workflow_dispatch` itself works perfectly well against a non-default-branch ref. Proof: `gh workflow run CI --ref feat/header-hero-integrated` (a harmless, real dispatch of the already-registered `CI` workflow, tests/build only, no deploy credentials) succeeded immediately → run `34779284965`, `event: "workflow_dispatch"`, `status: completed`, `conclusion: success`, same commit `7bb2c34`.

The actual mechanism: `GET /actions/workflows` still lists **only** `CI` (`total_count: 1`) — `deploy-staging.yml` has never been indexed/registered by GitHub Actions at all. `ci.yml` got indexed automatically because its `push` trigger fired for real on the original push (this is what creates the internal Workflow object). `deploy-staging.yml`'s only trigger is `workflow_dispatch` — by design, per CI-CD-P1's own hardening (no `push`/`pull_request` trigger on the deploy workflow, deliberately) — so no event has ever caused GitHub to register it. A dispatch request that references an **unregistered** workflow by file name can only be resolved by GitHub falling back to reading that path from the **default branch** (`main`) — and `deploy-staging.yml` does not exist there (it exists only on `feat/header-hero-integrated`, never merged). Once a workflow is registered (any trigger, any ref), it becomes dispatchable by name/ID against any ref thereafter — exactly what the `CI` re-dispatch above proves.

**This is a genuine, previously-undiscovered gap in the CI-CD-P1 design**, not a secret/Environment problem (both are now correctly configured) and not a code defect: a `workflow_dispatch`-only workflow that has never existed on the default branch cannot be dispatched by any means available to this session, until either (a) the workflow file exists on `main` at least once (even transiently) to bootstrap indexing, or (b) the repository's default branch setting is changed, or (c) some other GitHub-side mechanism not available to this session's tools is used.

**None of these three resolutions is authorized in this task:** (a) requires touching `main`, explicitly forbidden here ("Do NOT merge to main" — and this repository has an additional, independently-documented reason to be careful with `main`: Vercel's Git integration ties its Production deployment to that exact branch, per `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8/DAR-048); (b) is a GitHub repository setting change, outside this task's safe scope; (c) is unknown/unverified. Per this task's own explicit instruction ("Do NOT deploy locally unless GitHub Actions is genuinely unavailable and you stop first to report that problem"), execution **stops here** rather than attempting a local `vinext-cloudflare deploy --env staging` as a substitute, and rather than improvising a workaround touching `main` or repository settings on its own authority.

**No deploy was performed by any method — local or GitHub Actions.**

## Result of this continuation

**D — STAGING CONTINUATION STOPPED — DEPLOY GATE OR WORKFLOW FAILURE.** Specifically: a workflow-dispatch-mechanics failure (never-indexed workflow), not a secrets/Environment failure (those now pass) and not a CI or migration failure (those remain green/applied).

## Recommended paths forward (decision needed from the owner — none executed)

1. Push `.github/workflows/ci.yml` and `.github/workflows/deploy-staging.yml` (workflow files only — no application code) directly to `main` in a small, isolated, explicitly-authorized commit, specifically to bootstrap GitHub's indexing of both workflows. This is the smallest change that resolves the gap, but it does touch `main` and needs its own explicit owner authorization plus a decision on the Vercel-Production-tied-to-`main` risk (`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8) before anyone runs it — most simply by disconnecting or reassigning Vercel's Production Branch first, exactly as that runbook already recommends doing before `main` is ever touched again.
2. The operator manually runs the deploy from their own machine (`npx vinext-cloudflare deploy --env staging`, after `npm ci && npm test && npx tsc --noEmit && npm run build`) — bypasses the GitHub Actions indexing gap entirely, at the cost of not going through the audited workflow this once.
3. The operator triggers the workflow through the GitHub web UI, if a path exists there that this session's CLI/API access cannot exercise (unverified from this session; worth the operator's own check before assuming option 1 or 2 is required).

## Production safety (this continuation)

Unchanged from the first attempt: no command in this continuation referenced any production resource, even read-only. `main` was not pushed to, merged, or modified. No GitHub repository setting was changed (only `GET` reads plus the two dispatch attempts, both of which failed with `404` and mutated nothing). No secret value was requested or exposed.

## Remaining gaps (superseding the FIRST ATTEMPT's list)

1. ~~GitHub Environment `staging`~~ — **resolved**, exists now.
2. ~~`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`~~ — **resolved**, both present in the `staging` Environment.
3. **New:** `deploy-staging.yml` cannot be dispatched until it is indexed by GitHub Actions — requires an explicit owner decision among the three paths above.
4. `TURNSTILE_SECRET_KEY` / `ODOO_RFQ_API_TOKEN` remain unprovisioned on staging (unchanged; RFQ E2E stays a gap regardless of the deploy blocker).
5. The actual staging deploy, and everything downstream of it (smoke, browser, RFQ E2E), remains entirely outstanding.

## Ready for production release preparation

**NO** — unchanged; if anything, the specific blocker is now more precisely identified than in the first attempt.
