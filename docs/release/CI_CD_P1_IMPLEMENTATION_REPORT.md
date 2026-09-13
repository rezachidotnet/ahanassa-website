# CI-CD-P1 Implementation Report

Date: 2026-09-13
Task type: CI/CD foundation (GitHub Actions verification workflow + audited, manual-only staging deployment workflow). No staging or production deployment was performed. No remote migration was performed.

---

# RESULT

**A — CI COMPLETE + MANUAL STAGING CD FOUNDATION READY.**

The exact staging deployment command, config, and binding separation were already unambiguous and documented in practice (`README.md`, `wrangler.jsonc`, `01-sources/ENVIRONMENT_VARIABLES.md` §10) before this task — this is not a guess. A `workflow_dispatch`-only staging deployment workflow was created; it deploys application code only and never touches D1 migrations.

---

# PREFLIGHT

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    3d455caa1a12df3bee6fe92e6055c1e9aac9150f
status:  clean
remote:  origin  git@github.com:rezachidotnet/ahanassa-website.git (fetch/push)
```

Working tree was clean before this task began. Branch matched the expected `feat/header-hero-integrated`.

---

# BASE SHA

`3d455caa1a12df3bee6fe92e6055c1e9aac9150f`

---

# EXISTING CI/CD STATE

- No `.github/` directory existed anywhere in the repository before this task — no CI, no deploy workflow.
- Deployment was, and for production remains, entirely manual from a local CLI (`npm run deploy`, `npx vinext-cloudflare deploy --env staging`, `wrangler` subcommands) — see `README.md` and `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`.
- **Prominent existing finding, not created or modified by this task:** Vercel's Git integration is connected to this exact GitHub repository and auto-deploys every pushed branch as a Vercel Preview; its Production target is tied to `origin/main` (`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8, `DOCUMENT_AUDIT_REPORT.md` DAR-048). This is unrelated to GitHub Actions/this task's workflows and was not touched — flagged here per this task's own instruction to report an existing automatic deployment mechanism prominently. It does not affect `ahanassa.com`/`www.ahanassa.com`, which are served by the Cloudflare Worker per the same runbook's execution record.

---

# TOOLCHAIN

- Framework/adapter: `vinext` + `@vinext/cloudflare`, Vite-driven (`@cloudflare/vite-plugin`, `@vitejs/plugin-rsc`).
- Deployment: `wrangler` `^4.126.0`, `wrangler.jsonc` with distinct `env.staging` / `env.production` blocks (separate D1 databases, queues, rate-limit namespaces, Worker names — verified by reading the file directly).
- Test runner: Node's built-in `node --test` (no separate test framework).

---

# NODE VERSION

**Locked at `01-sources/STACK.md` §4/§34: Node.js `24.x` LTS ("Local/CI runtime").** This is a defensible, pre-existing source, not a guess — used directly in both workflows (`actions/setup-node` `node-version: "24"`).

No `.nvmrc`, `.node-version`, or `package.json` `engines` field exists in the repository. This is a real gap between the documented policy (STACK.md's own Launch Acceptance Checklist says "Node, pnpm, Wrangler, adapter, and lockfile are pinned") and the repository's actual pinning — noted here, not fixed, since adding a version-pin file is outside this task's narrow CI/CD scope (it would touch local developer tooling, not CI). Recommend a future small task add `.nvmrc` (`24`) so local dev and CI cannot silently drift.

---

# PACKAGE MANAGER

**npm**, confirmed authoritative: `package.json` declares `"packageManager": "npm@11.14.1"`, the only committed lockfile is `package-lock.json`, and every prior implementation report in this repository uses `npm ci`/`npm run`/`npm test`. `01-sources/STACK.md` §4 conflictingly declares pnpm `11.x` as "Locked" — a genuine, previously-unrecorded documentation conflict, resolved per `CLAUDE.md` §2 (verified implementation facts win over a stale `01-sources/` statement) and recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-055. `01-sources/STACK.md` itself was not edited (immutable for implementation work).

CI uses `npm ci` (immutable install), never `npm install`.

---

# CI TRIGGERS

`push`, `pull_request`, `workflow_dispatch` — all branches (no narrower branch policy was found anywhere in the repository, so the default broad trigger per this task's own instruction was used).

---

# CI PERMISSIONS

`permissions: contents: read` at the workflow level. No `write`, `packages: write`, `deployments: write`, or `id-token: write` anywhere in `ci.yml`. No Cloudflare secret is referenced.

---

# CI CHECKS

Exactly the repository's real, existing commands (verified by running each locally in this task before encoding them):

1. `npm ci`
2. `npm test` (`node --test lib/**/*.test.ts components/**/*.test.ts`)
3. `npx tsc --noEmit`
4. `npm run build` (`vinext build`)

No lint step — no lint command or ESLint config exists in the repository (verified: no `.eslintrc*`, no `eslint.config.*`, no `lint` script in `package.json`). Not invented.

---

# CONCURRENCY

`ci.yml`: `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` — a superseded push/PR run is cancelled.

`deploy-staging.yml`: `group: deploy-staging`, `cancel-in-progress: false` — a manual deploy in flight is never cancelled by a second dispatch; a second run queues instead.

---

# TESTS

`npm test` → **1247/1247 passing** (1240 pre-existing + 7 new in `lib/ci/workflow-invariants.test.ts`, 0 failed, 0 skipped). Matches the expected checkpoint (1240/1240 at the last Homepage audit) plus this task's own new tests.

---

# TYPECHECK

`npx tsc --noEmit` → **PASS**, no output, exit 0. (Note: this command rewrites the tracked `tsconfig.tsbuildinfo` file as a side effect of `incremental: true`; this task restored it via `git checkout -- tsconfig.tsbuildinfo` after every local run rather than committing the drift — the tracked-tsbuildinfo situation predates this task and was left otherwise unchanged.)

---

# BUILD

`npm run build` (`vinext build`) → **PASS**. Full Worker/RSC/client/SSR build completed, all expected routes listed, no errors.

---

# CLOUDFLARE BUILD CONTRACT

`npm run build` already exercises the full vinext → Cloudflare Workers artifact build (client/server/RSC/SSR environments, per the build's own printed stage output). No redundant deployment-like validation was added. No remote Cloudflare API call is made by `ci.yml` — none was needed or invented.

---

# STAGING CD DECISION

**A — STAGING CD READY TO DEFINE**, per this task's own §15 criteria, all satisfied from pre-existing, already-real documentation/config (not guessed):

- Exact staging Worker/config: `env.staging` in `wrangler.jsonc` → Worker `ahanassa-bootstrap-staging`.
- Exact deploy command: `npx vinext-cloudflare deploy --env staging` (documented and already used historically per `README.md`).
- Exact binding separation: `DB_OPS`/`DB_PUBLIC` staging IDs are distinct real Cloudflare resources from production's, confirmed by reading `wrangler.jsonc` directly.
- Migrations already deliberately separate from deploy in established project practice: `README.md` documents `npx wrangler d1 migrations apply DB_OPS --env staging --remote` as a distinct command from the deploy command — this task did not invent that separation, it already existed.
- Required secret NAMES for the workflow itself are canonical, not invented: `01-sources/ENVIRONMENT_VARIABLES.md` §10 ("Build and CI-only values") already names `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as "Automated deploy" credentials.

---

# STAGING CONFIG

| Item | Value |
|---|---|
| Environment name | `staging` (`wrangler.jsonc` `env.staging`) |
| Worker | `ahanassa-bootstrap-staging` |
| Deploy command | `npx vinext-cloudflare deploy --env staging` |
| D1 (`DB_OPS`) | `ahanassa-ops-staging` |
| D1 (`DB_PUBLIC`) | `ahanassa-public-staging` |
| Queue | `ahanassa-odoo-sync-staging` (+ DLQ) |

---

# GITHUB ENVIRONMENT

`deploy-staging.yml` declares `environment: staging` at the job level. Whether a GitHub Environment named `staging` (with protection rules/required reviewers) already exists in repository settings was **not checked or modified** — read-only remote GitHub settings inspection was out of this task's safe scope, and no GitHub setting was changed. If the Environment does not yet exist, GitHub creates an unprotected one automatically on first use; the operator should configure protection rules before relying on this as a real gate (STG-P0 input, see below).

---

# REQUIRED SECRET NAMES

Per `01-sources/ENVIRONMENT_VARIABLES.md` §10 (canonical, not invented here):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Whether these are already configured as GitHub Actions secrets was **not checked** (no secret was read, listed, or printed). If absent, `deploy-staging.yml` fails cleanly at its final step with no other side effect — the confirmation gate and all verification steps still ran.

---

# MIGRATION SAFETY

Neither workflow contains `migrations apply`, `--remote`, or any reference to `migrations_public/0010_homepage_eligibility.sql` (statically enforced by `lib/ci/workflow-invariants.test.ts`, part of `npm test`). Applying migrations remains a fully separate, manual operator action, documented in `docs/release/CI_CD_POLICY.md`.

---

# PRODUCTION DEPLOYMENT POLICY

No production deployment workflow was created. No workflow in this repository deploys `--env production` (statically enforced by the same invariant test). Production release remains explicit, manual, owner-approved work outside this task's scope — see `docs/GO_LIVE_CUTOVER_RUNBOOK.md`/`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` for the existing manual production release history. The pre-existing Vercel auto-deploy-on-push mechanism (see EXISTING CI/CD STATE above) is unrelated to this GitHub Actions work and was not touched.

---

# REQUIRED BRANCH CHECK

**RECOMMENDED REQUIRED CHECK: `CI / verify`** (workflow name `CI`, job name `verify`). Not applied to branch protection remotely — this is a recommendation for a future operator step.

---

# WORKFLOW SECURITY

- `actions/checkout@v4`, `actions/setup-node@v4` — both official, widely-trusted GitHub-maintained actions, pinned to major version. No other marketplace action used.
- No `continue-on-error: true` on any required step.
- No `echo`/print of any secret value; the confirmation-gate step in `deploy-staging.yml` passes the `workflow_dispatch` input through an `env:` variable (`CONFIRM_INPUT`) rather than interpolating `${{ github.event.inputs.confirm }}` directly into the shell script, avoiding GitHub Actions script-injection via untrusted expression interpolation.
- No `set -x` anywhere.
- `ci.yml` never receives `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`.

---

# DOCUMENTATION DRIFT

Two pre-existing drifts, unrelated to CI/CD implementation itself, corrected in the governance commit (both are live/ACTIVE-status registries, not frozen historical reports):

1. `PROJECT_OVERRIDES.md` §10 still listed the company phone number as "candidate exists, not confirmed" even though §7.2 and `lib/content/contact-channels.ts` already confirm `CONTACT_PHONE_E164 = +989120656528` for production use.
2. `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §6 still said "Footer redesign | Not started" even though FOOTER-P0/P1 (`docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md`) are complete and both cited GEO-G0 defects are resolved.

A third, newly-discovered conflict was recorded (not silently resolved) rather than corrected in place, per `CLAUDE.md` §2/§9 (`01-sources/` is immutable for implementation work): `01-sources/STACK.md` declares pnpm as the locked package manager; the verified repository state has always used npm. Recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-055; the STACK.md text itself was left untouched, deferred to a future controlled documentation-cleanup pass.

No historical report was rewritten.

---

# FILES CREATED

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `lib/ci/workflow-invariants.test.ts`
- `docs/release/CI_CD_POLICY.md`
- `docs/release/CI_CD_P1_IMPLEMENTATION_REPORT.md` (this file)

# FILES MODIFIED

- `PROJECT_OVERRIDES.md` (§10 phone bullet reconciled; version 2.4.1 → 2.4.2; status line updated)
- `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` (§6 Footer redesign row corrected; Last updated line)
- `DOCUMENT_AUDIT_REPORT.md` (DAR-055 added; version 2.24.0 → 2.25.0; header audit-date line extended)

# FILES REMOVED

None.

---

# CI COMMIT

`66244d8` — `ci: add repository verification and manual staging deployment workflows` (includes both `ci.yml` and `deploy-staging.yml`, plus `lib/ci/workflow-invariants.test.ts`, in one commit — one narrow CI change, not split further).

# STAGING WORKFLOW COMMIT

Same as CI COMMIT: `66244d8` (`deploy-staging.yml` was added alongside `ci.yml` in the single CI commit above).

# GOVERNANCE COMMIT

`ec91263` — `docs: record CI/CD policy and reconcile release status` (adds `docs/release/CI_CD_POLICY.md`; corrects `PROJECT_OVERRIDES.md` §10 and `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §6).

`56f871b` — `docs: record CI-CD-P1 package-manager conflict (DAR-055)` (a second, narrow governance commit — the pnpm/npm conflict was discovered after the first governance commit landed).

---

# LOCAL VALIDATION

```text
npm test          → 1247/1247 passing, 0 failed
npx tsc --noEmit   → PASS (clean, no output)
npm run build      → PASS (vinext build, all routes listed, no errors)
git diff --check   → clean (no whitespace errors), checked against the staged CI commit
```

---

# REMOTE ACTIONS NOT PERFORMED

No `wrangler deploy`/`wrangler versions upload`/`vinext-cloudflare deploy` was run. No D1 migration was applied to any remote database. No GitHub secret was read, set, listed, or printed. No GitHub repository setting, branch protection rule, or Environment protection rule was created or modified. No merge. No push. No tag. No Odoo call. Nothing in Cloudflare or GitHub's remote state changed as a result of this task.

---

# STG-P0 INPUTS

For a future STG-P0 task to fully operationalize `deploy-staging.yml`:

1. Confirm/create the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets (names are canonical per `01-sources/ENVIRONMENT_VARIABLES.md` §10; values were never touched by this task).
2. Confirm/configure a GitHub Environment named `staging` with any desired protection rules (required reviewers, wait timer) — this task referenced `environment: staging` in the workflow but did not create or configure the Environment itself.
3. Define the recovery-point / rollback procedure for a staging deploy gone wrong (this task deferred it — staging deploys today roll back the same way production does, via `wrangler versions deploy <previous-id>@100`, but no staging-specific runbook exists yet).
4. Define the migration inventory/order/preflight/execution/post-migration smoke test for actually applying `migrations_public/0010_homepage_eligibility.sql` (and any migrations after it) to the real staging D1 — remains **REMOTE PENDING**, untouched by this task.
5. Consider adding `.nvmrc`/`engines.node` to close the Node-version-pin gap noted above (STACK.md declares Node pinning as a Launch Acceptance Checklist item; no pin file exists yet).

---

# READY FOR STG-P0

**YES** — CI is complete and passing; the staging deploy workflow exists, is safe (workflow_dispatch-only, typed confirmation, no migration, statically pinned against dangerous patterns), and is blocked only on the operator-side inputs listed above, none of which this task was authorized to provision.
