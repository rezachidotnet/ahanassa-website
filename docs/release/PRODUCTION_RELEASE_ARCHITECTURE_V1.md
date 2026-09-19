# Production Release Architecture V1

**Document type:** Architecture and design. **Nothing in this document has been implemented.**
**Repository:** `rezachidotnet/ahanassa-website`
**Branch at authoring time:** `feat/header-hero-integrated`, HEAD `2f49537`
**Date:** 2026-09-19
**Status:** DESIGN — awaiting owner approval before any implementation phase begins
**Supersedes:** nothing. Extends `docs/release/CI_CD_POLICY.md`, which explicitly leaves production release out of scope.
**Evidence base:** `docs/release/PRODUCTION_RELEASE_PIPELINE_READINESS_AUDIT.md` (2026-09-19), whose live-verified findings this design is built on.

**Not done by this task:** no workflow file created, no deployment, no Cloudflare change, no DNS change, no migration, no application code change. The only artifact is this document.

---

# RESULT

**A complete target architecture for production release, derived from the staging pipeline that is already proven in this repository rather than from a generic template.**

The central design decision is **promotion, not rebuild**: production deploys the exact commit SHA that was validated on staging, never a branch. The staging workflow already proves this model works here — two successful runs on 2026-09-19 deployed pinned SHAs independently of the dispatch branch.

The design diverges from staging in exactly four deliberate ways, each with a stated reason: a **required-reviewer approval gate**, a **two-phase `versions upload` → `versions deploy` promotion** (instead of staging's one-shot adapter deploy), a **mandatory in-workflow smoke gate**, and a **staging-provenance assertion** that refuses to deploy a SHA no successful staging run ever deployed.

Two hard preconditions must be satisfied before any production workflow is worth building, and neither is workflow work:

1. **Production D1 must be brought level with staging** — `DB_PUBLIC` 0007→0010 and `DB_OPS` 0005 are unapplied. Until then, a correct pipeline would faithfully deploy code that queries tables production does not have.
2. **The release approver must be named.** An approval gate with an unnamed approver is decoration.

---

# CURRENT_STATE

Verified live in the 2026-09-19 readiness audit (GitHub REST API, `dig`, `curl`). Restated here only as the baseline this design starts from.

| Dimension | Staging | Production |
| --- | --- | --- |
| GitHub Actions workflow | `deploy-staging.yml` (`361701517`), `workflow_dispatch`-only, 2 successful runs | **none** |
| Deploy mechanism | `npx vinext-cloudflare deploy --env staging` on a GitHub runner | manual local `wrangler` from an operator terminal |
| Exact-SHA deployment | **proven** — `deploy_ref` input, explicit checkout, `DEPLOYED_SHA` recorded | not available |
| Target safety assertion | inline, fail-closed, runs before `npm ci` | none |
| Approval gate | none (branch policy only, no reviewers) | none |
| Environment | GitHub `staging`, env-scoped Cloudflare secrets, one allowed branch | GitHub `Production` exists but is a **Vercel leftover with zero protection rules**, referenced by nothing |
| Worker | `ahanassa-bootstrap-staging`, version `6e79335c-…` (2026-09-19) | `ahanassa-production`, version `b07d8697-…` (**2026-09-03**) |
| `DB_PUBLIC` migrations | 10 applied (through `0010`) | **6 applied** (through `0006`) |
| `DB_OPS` migrations | 5 applied (through `0005`) | **4 applied** (through `0004`) |
| Cron triggers | 1 (`0 */3 * * *`) | 3 (`*/5`, `0 */3`, `30 2`) |
| RFQ secrets | absent (`TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN`) | provisioned |
| Post-deploy smoke | manual `curl`, outside any workflow | manual |
| Release tags | **0 tags in the entire repository** | — |
| Domain | `*.workers.dev` only | `www.ahanassa.com` → Cloudflare Worker (live); **apex `ahanassa.com` → Vercel** |

**Structural constraint that shapes everything below:** `origin/main` and the application branch have **unrelated Git histories** (`git merge-base` returns nothing). `main` holds the 16-file legacy holding page plus one copied workflow file; it does not contain the application. Therefore `main` is not, and cannot currently become, the production release branch — and no PR-based promotion into it is possible without a separately authorized history consolidation. **This design does not require that consolidation**, and deliberately avoids depending on it.

---

# TARGET_ARCHITECTURE

## Design principles

1. **Promote artifacts of a verified commit, never rebuild a branch.** What ships to production must be traceable to a specific SHA that passed staging.
2. **Every gate fails closed.** Ambiguity halts the release; it never proceeds on a default.
3. **The workflow file is the trusted computing base, the checkout is not.** All assertions are inline in the workflow, because `wrangler.jsonc` arrives from an operator-supplied ref. This is the staging workflow's existing insight and it carries over unchanged.
4. **Database changes are a separate, explicitly-approved release step.** No workflow applies a migration, in either environment. This is existing policy and this design keeps it.
5. **Reuse proven mechanisms.** Every command in this design already exists in this project's documented operational history. Nothing novel is introduced at the most dangerous moment.
6. **Evidence is part of the release, not paperwork after it.** A release is incomplete until its report exists.

## Target component map

```text
┌─ GitHub ────────────────────────────────────────────────────────────┐
│                                                                     │
│  CI (ci.yml, 357303552)          every push · tests, typecheck,     │
│                                  build · no secrets                 │
│                                                                     │
│  Deploy Staging (361701517)      workflow_dispatch · deploy_ref     │
│    environment: staging          · typed confirm · target assert    │
│    branch policy, no reviewers                                      │
│                                                                     │
│  Deploy Production  ◄── NEW      workflow_dispatch · deploy_ref     │
│    environment: production ◄─NEW · typed confirm · target assert    │
│    REQUIRED REVIEWERS            · staging-provenance assert        │
│                                  · two-phase version promotion      │
│                                  · in-workflow smoke gate           │
└─────────────────────────────────────────────────────────────────────┘
             │                                    │
             ▼                                    ▼
┌─ Cloudflare ─────────────────┐   ┌─ Cloudflare ─────────────────────┐
│ ahanassa-bootstrap-staging   │   │ ahanassa-production              │
│  DB_OPS  ahanassa-ops-staging│   │  DB_OPS  ahanassa-ops-production │
│  DB_PUBLIC …-public-staging  │   │  DB_PUBLIC …-public-production   │
│  1 cron · no routes          │   │  3 cron · www.ahanassa.com       │
│  *.workers.dev only          │   │  workers_dev: true               │
└──────────────────────────────┘   └──────────────────────────────────┘
```

Staging and production share no Worker, no D1 database, and no queue — already enforced by `lib/ci/wrangler-config-invariants.test.ts` (`staging and production never share a Worker, D1 database, or queue`). That test is the foundation this design builds on and must be extended, never weakened.

---

# RELEASE_FLOW

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. FEATURE BRANCH                                                        │
│    Developer pushes to feat/*                                            │
│    → CI (ci.yml) runs automatically: npm ci · npm test · tsc · build      │
│    GATE: CI must be green. A red CI run ends the flow here.              │
└──────────────────────────────────────────────────────────────────────────┘
                                   │  SHA = X
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. STAGING DEPLOYMENT                                                    │
│    Operator dispatches Deploy Staging with deploy_ref = X (full 40-char)  │
│    → confirm gate · checkout X · resolve SHA · STAGING TARGET ASSERTION  │
│    → npm ci · npm test · tsc · build · deploy --env staging              │
│    GATE: run conclusion must be success. Records DEPLOYED_SHA = X.       │
└──────────────────────────────────────────────────────────────────────────┘
                                   │  SHA X now live on staging
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. AUTOMATED VALIDATION                                                  │
│    3a. In-workflow (already exists): tests 1334 · tsc --noEmit · build    │
│    3b. Post-deploy staging smoke  ◄── TO BE AUTOMATED (today manual)      │
│        route matrix · locale matrix · no-5xx · DB connectivity           │
│    3c. Migration parity check: staging schema == repository migrations    │
│    GATE: all green. Any failure returns to step 1; X is never promoted.  │
└──────────────────────────────────────────────────────────────────────────┘
                                   │  X is now a RELEASE CANDIDATE
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. RELEASE APPROVAL                                                      │
│    4a. Release checklist completed (see RELEASE GOVERNANCE)              │
│    4b. Migration decision made: does X require pending migrations?       │
│    4c. Annotated git tag created: release/prod-YYYY-MM-DD-<short-sha>    │
│    4d. Named approver approves the GitHub `production` Environment       │
│    GATE: human approval. No automation may bypass this.                  │
└──────────────────────────────────────────────────────────────────────────┘
                                   │  X approved for production
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. PRODUCTION DEPLOYMENT                                                 │
│    5a. (if required) Migrations applied — SEPARATE, EXPLICIT, BEFORE     │
│        the code deploy, with a Time Travel bookmark captured first       │
│    5b. Dispatch Deploy Production with deploy_ref = X (the SAME X)       │
│        → confirm gate · checkout X · resolve SHA                        │
│        → PRODUCTION TARGET ASSERTION (fail closed)                      │
│        → STAGING PROVENANCE ASSERTION (X must have a successful          │
│          Deploy Staging run) — the promotion guarantee                   │
│        → npm ci · npm test · tsc · build (CLOUDFLARE_ENV=production)     │
│        → capture CURRENT production version ID as rollback target        │
│        → wrangler versions upload  → new version ID recorded            │
│        → wrangler versions deploy <new-id>@100                          │
│        → IN-WORKFLOW SMOKE GATE against www.ahanassa.com                 │
│    GATE: smoke must pass. Failure triggers the rollback path.           │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 6. POST-RELEASE                                                          │
│    Monitoring window · release report committed · tag pushed             │
└──────────────────────────────────────────────────────────────────────────┘
```

**The invariant that makes this a release pipeline rather than two deploy buttons:** the SHA at step 5 is bit-identical to the SHA at step 2, and step 5 refuses to run if it is not.

---

# WORKFLOW_REQUIREMENTS

Requirements for a future `.github/workflows/deploy-production.yml`. **This file must not be created until the preconditions in IMPLEMENTATION_STEPS are met.**

## R1 — Trigger

`workflow_dispatch` **only**. No `push`, no `schedule`, no `release`, no `repository_dispatch`, no reusable-workflow call from another workflow.

Rationale: identical to staging's, plus one addition — a `release`-event trigger would couple deployment to tag creation, and tags here are a *record* of an approved release, not its cause.

## R2 — Inputs

| Input | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `deploy_ref` | string | yes | **none** | Full 40-character commit SHA. A mutable default would destroy the promotion guarantee. |
| `confirm` | string | yes | none | Must equal the literal `deploy-production`. Deliberately different from staging's string so muscle memory cannot cross environments. |
| `rollout_percentage` | choice | yes | `100` | `10` \| `50` \| `100`. Enables staged rollout; see R8. |
| `skip_staging_provenance` | boolean | no | `false` | **Break-glass only.** Set true only for a hotfix whose SHA legitimately never went to staging. Must emit a prominent warning into the job summary and the release report. |

**No Cloudflare target is ever an input.** Environment, Worker name, D1 identities and routes stay fixed in `wrangler.jsonc`. This is a non-negotiable inherited property of the staging design.

## R3 — Approval mechanism

`environment: production` — a **new, purpose-built** GitHub Environment with:

- **Required reviewers:** at least one named human (see RELEASE GOVERNANCE). This is the approval gate; the typed `confirm` string is an anti-fat-finger measure, not an approval.
- **Wait timer:** 0 by default. A non-zero timer is worth considering only if a second pair of eyes is routinely wanted.
- **Deployment branch policy:** restricted to the application branch(es) permitted to dispatch. Must not be left `null`.
- **Environment-scoped secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. A job that fails the gate never receives them.

**Critical prerequisite:** the existing GitHub Environment literally named `Production` is a **Vercel leftover with zero protection rules**. It must be deleted or renamed *before* a production workflow is authored, or a future author will reference it and obtain a gate that gates nothing. This is the single highest-risk trap in the current configuration.

## R4 — SHA selection and exact-commit deployment

Inherited verbatim from staging, which proves the mechanism:

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ inputs.deploy_ref }}
    persist-credentials: false
```

followed by `DEPLOYED_SHA="$(git rev-parse HEAD)"` plus `git cat-file -e "${DEPLOYED_SHA}^{commit}"`, failing before build if the ref does not resolve. `DEPLOYED_SHA` must be surfaced as a step output, a job output, an env var, and a job-summary row.

**Additional production-only requirement:** reject a `deploy_ref` that is not a full 40-character hexadecimal SHA. Staging tolerates a branch name for operator convenience; production must not — `^[0-9a-f]{40}$` or the run fails.

## R5 — Safety assertions

Three assertions, all **inline in the workflow file** (never a checked-out script), all **before `setup-node`/`npm ci`**, so no code from the operator-supplied ref executes until the target is proven.

### A1 — Production target assertion (mirror of staging's)

Parses `wrangler.jsonc` (JSONC-tolerant) and requires **all** of:

| Check | Requirement |
| --- | --- |
| File present and parseable | else "this ref does not contain the application" |
| `env.production.name` | `=== "ahanassa-production"` |
| D1 `DB_OPS` | `ahanassa-ops-production` / `7240a6a7-c293-4e6e-baf3-95838a3c2944` |
| D1 `DB_PUBLIC` | `ahanassa-public-production` / `73ba6b50-ef57-4d89-baa9-617a0b0af127` |
| D1 completeness | exactly those two bindings, no unexpected binding |
| `vars.APP_ENV` | `=== "production"` |
| `routes` | contains exactly `{ pattern: "www.ahanassa.com", custom_domain: true }` — guards against a deploy that silently detaches the live custom domain |
| `workers_dev` | `=== true` — guards against the DAR-050 regression class |
| Cron triggers | exactly `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` — a trigger change must be a deliberate, reviewed config commit, never a deploy-time surprise |
| Staging-identifier scan | no string anywhere under `env.production` may name the staging Worker, databases or queues — the mirror image of staging's live-environment scan, and **literal-free** for the same reason (a hard-coded denylist would trip the repository's own invariant tests) |

### A2 — Staging provenance assertion (new; the promotion guarantee)

Queries the GitHub API for `Deploy Staging` (workflow `361701517`) runs and requires that `deploy_ref` **exactly matches the `deploy_ref` input of at least one run with `conclusion: success`**.

- Implemented against `GET /repos/{owner}/{repo}/actions/workflows/361701517/runs` plus each candidate run's `inputs`, using the job's own `GITHUB_TOKEN` — no new credential.
- Requires `permissions: actions: read` in addition to `contents: read`.
- Fails closed: if the API is unreachable or the answer is ambiguous, the run fails. "Could not verify" is never treated as "verified".
- Bypassable **only** via `skip_staging_provenance: true`, which must be loudly recorded.

This assertion is what converts "we intend to deploy the tested SHA" into a machine-enforced property.

### A3 — Migration parity assertion (new)

Compares the migration files present at `deploy_ref` against the migrations recorded as applied on production D1, and fails if the deployed code carries a migration production has not applied.

- Read-only: `wrangler d1 migrations list DB_OPS --env production --remote` and the `DB_PUBLIC` equivalent.
- Failure message must state exactly which migrations are missing and direct the operator to the migration release procedure.
- This is the control that would have caught today's five-migration drift automatically.

**Ordering requirement:** A1 → A2 → A3, all before `npm ci`. A1 is cheapest and most security-critical; A3 touches the network and is therefore last.

## R6 — Build

```bash
CLOUDFLARE_ENV=production npx vinext build
```

The `CLOUDFLARE_ENV` env-flattening step is load-bearing (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §2) and must not be dropped. Tests, typecheck and build all run on the runner from the checked-out SHA — the production workflow re-verifies rather than trusting staging's verification, because the cost of a bad production release vastly exceeds ~70 seconds of CI.

## R7 — Rollback target capture (before any traffic shift)

Immediately before promotion, capture and record the **currently-serving** production version ID:

```bash
npx wrangler versions list --name ahanassa-production   # or `wrangler deployments status`
```

Emit it as `PREVIOUS_VERSION_ID` into the job summary, a job output, and the release report. **A release whose rollback target was not captured is not a completed release.** Staging's workflow does not do this today and should be backported to match.

## R8 — Deployment mechanism: two-phase version promotion

**Production must not reuse staging's one-shot `vinext-cloudflare deploy --env staging`.** Verified from the adapter's own CLI (`node_modules/@vinext/cloudflare/dist/deploy-help.js`): that command builds and deploys straight to 100% with no intermediate version handle. Production instead uses the two-phase `wrangler` flow already proven in this project's manual production history:

```bash
# Phase 1 — upload, no traffic shift
npx wrangler versions upload --config dist/server/wrangler.json \
  --message "Release <tag> — SHA <DEPLOYED_SHA> — run <RUN_ID>"
#   → capture NEW_VERSION_ID

# Phase 2 — promote
npx wrangler versions deploy <NEW_VERSION_ID>@<rollout_percentage> \
  --config dist/server/wrangler.json
```

Four reasons this is the right mechanism, not ceremony:

1. **A rollback handle exists before traffic moves.** Phase 1 yields a version ID; if phase 2 or the smoke gate fails, the prior version is still serving and is named.
2. **Staged rollout becomes possible** (`@10` → observe → `@100`), which a one-shot deploy cannot express.
3. **It matches the existing documented production process exactly** — no unproven mechanism is introduced at the most dangerous moment.
4. **Bindings are reviewable between phases**, which is how the Stage-1 releases confirmed all four secrets were attached before promoting.

**Two caveats the implementation must handle explicitly:**

- **`versions upload` does not apply cron trigger changes.** Documented at `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:111` and re-confirmed during the 2026-09-19 staging cron work: trigger changes take effect on `wrangler deploy` / `wrangler versions deploy` / `wrangler triggers deploy`, never on `versions upload` alone. Since assertion A1 pins the cron list, any intended trigger change is a config commit whose application must be verified after phase 2.
- **Secret inheritance across versions must be verified, not assumed.** Production secrets (`TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN`) were attached via `wrangler versions secret put` against a specific version. Whether a newly uploaded version inherits them automatically is **an open implementation question this design does not resolve** — it must be confirmed against a real upload before the first automated production release, with `wrangler versions view <NEW_VERSION_ID>` asserting all expected secrets are present **between phase 1 and phase 2**. If they are not inherited, the workflow needs an explicit secret-attachment step and the design must be revised accordingly.

## R9 — In-workflow smoke gate

Mandatory, blocking, inside the workflow, against the real production hostname. See SMOKE_TEST_POLICY. A deploy that uploads and promotes successfully but serves 5xx must fail the run — today's staging workflow would report such a run as `success`, which is the pipeline's biggest observability gap.

## R10 — Rollback handling

The workflow itself performs **no automatic rollback**. It fails loudly, prints the exact rollback command with `PREVIOUS_VERSION_ID` already substituted, and stops.

Rationale: an automatic rollback on smoke failure is attractive but wrong here. A smoke failure caused by a *migration* is not fixed by reverting the Worker, and an automated revert could mask a partially-applied data change. A human decides, with a pre-filled command and a captured version ID — the slow part of rollback is deciding and locating the target, and both are eliminated.

## R11 — Concurrency, permissions, timeout

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false      # never cancel a release mid-flight
permissions:
  contents: read
  actions: read                  # required by A2 only
timeout-minutes: 30
```

## R12 — Invariant tests

`lib/ci/workflow-invariants.test.ts` must be extended in the same static-source-check style, asserting for the production workflow: `workflow_dispatch`-only; typed `deploy-production` confirmation; explicit `deploy_ref` checkout; full-SHA format validation; all three assertions present and ordered before `npm ci`; `environment: production`; no Cloudflare target among inputs; `PREVIOUS_VERSION_ID` captured before promotion; smoke gate present after promotion; **no migration command anywhere**.

The existing invariant `no workflow in this repository auto-deploys production` must be **rewritten, not deleted** — to something like *no workflow deploys production on any trigger other than `workflow_dispatch`* — so the protection survives in a form that remains true.

Both the assertion-ordering and the provenance-assertion invariants should be **mutation-tested** (delete the step, confirm the suite turns red), matching the precedent already set for the staging workflow.

---

# PROMOTION_MODEL

## Decision: **(B) deploy the exact SHA already validated in staging.**

## Why

**1. It is the only model that makes staging validation mean anything.** Under (A), staging proves a property of a *branch at a moment*. Between staging validation and production release the branch can move — one more push and the "validated" claim is silently void, with nothing in the system detecting it. Under (B), the artifact under test and the artifact released are the same commit, and assertion A2 enforces it.

**2. The mechanism is already proven in this repository.** Run `35426318953` deployed `3ce18c5…` while the dispatch branch head was `c486e49…`. That split — dispatch ref supplies the *workflow*, `deploy_ref` supplies the *application* — is exactly what production needs, already working, already invariant-tested.

**3. Rebuild-from-branch has no defensible failure story.** When production breaks, the first question is "what is running?" Under (A) the answer is "whatever `feat/…` pointed at when someone clicked the button." Under (B) it is a 40-character SHA recorded in four places.

**4. This repository's Git topology forecloses (A) anyway.** With `main` holding an unrelated legacy history and no PR path into it, "rebuild from the release branch" has no release branch to rebuild from. (B) sidesteps the problem: the SHA is the release identity, and no branch consolidation is required.

## What (B) does and does not guarantee

**Deliberate scope limit:** this is **SHA promotion, not artifact promotion**. Production rebuilds from the same source rather than shipping the bytes staging produced. That is an accepted trade-off:

- *Why not promote the built artifact?* It would require an artifact store and a signed hand-off between workflows — meaningful new machinery for a two-environment project, and a second unproven mechanism at the riskiest moment.
- *Why it is acceptable today:* `npm ci` honours `package-lock.json`, so a rebuild from the same SHA is reproducible in practice.
- *Why it is fragile:* `package.json` pins **twelve** dependencies to `"latest"` — including `vinext`, `@vinext/cloudflare`, `react` and `typescript`. The lockfile holds today, but any `npm install` drifts all of them at once. **Pinning concrete versions is a prerequisite for trusting SHA promotion**, and is listed in IMPLEMENTATION_STEPS.
- *Also non-identical by design:* production builds with `CLOUDFLARE_ENV=production`, so the flattened config genuinely differs from staging's. Byte-identical artifacts were never achievable across these two environments regardless.

**Upgrade path, if ever needed:** if dependency drift or build non-determinism proves to be a real problem, the natural V2 is to have the staging workflow upload the built artifact and have production promote *that*, with A2 upgraded from "a successful staging run deployed this SHA" to "this exact artifact digest was validated." The current design is forward-compatible with that change.

## Hotfix exception

A production hotfix that genuinely cannot wait for staging uses `skip_staging_provenance: true`. This is expected to be rare, must be approved by the same named approver, and must be recorded prominently in the release report with its justification. The exception exists so nobody is tempted to weaken A2 permanently under time pressure.

---

# MIGRATION_POLICY

## Standing principle

**No workflow applies a migration, in any environment.** Existing policy (`docs/release/CI_CD_POLICY.md`), and this design keeps it deliberately. Migrations are a distinct, explicitly-approved operator action with their own recovery point. Assertion A3 enforces the *ordering* relationship between migrations and code without the pipeline ever executing one.

## Current drift (the V1 starting condition)

| Database | Repository | Staging applied | Production applied | **Pending on production** |
| --- | --- | --- | --- | --- |
| `DB_PUBLIC` | `0001`–`0010` | all 10 | **6** (through `0006_route_redirects_308`) | `0007_processing_groups`, `0008_price_variant_identity_and_provider_policy`, `0009_catalog_group_labels`, `0010_homepage_eligibility` |
| `DB_OPS` | `0001`–`0005` | all 5 | **4** (through `0004_rfq_contacts_phone_iso2`) | `0005_rfq_length_mm` |

**Five pending migrations, not four.** The `DB_OPS` `0005` gap appears in no existing release document — every prior doc discusses only the `DB_PUBLIC` four. It must be included in the catch-up release.

**Compatibility assessment, carried forward from STG-P0's file-by-file review:** all five are pure `CREATE TABLE` and/or nullable-or-defaulted `ADD COLUMN` — additive and backward-compatible. The currently-live older production Worker tolerates their presence because it never queries the new tables or columns. This is what makes applying them **ahead of** the code deploy safe.

## Ordering rule

**Migration first, then code** — not expand/contract, because none of the five requires a later cleanup phase; each is terminal and single-phase.

```text
capture recovery point  →  apply migrations  →  verify schema  →  deploy code  →  smoke
```

Justification is compatibility-based, not stylistic: because every migration is backward-compatible with the *currently-live* code, applying first carries no risk to what is already serving; and because the new code queries the new tables unconditionally, applying first means the deployed code renders at full fidelity immediately rather than shipping a degraded intermediate state.

**The general rule for future migrations:** a migration that is *not* backward-compatible with the currently-live Worker may not use this ordering. It must be split into an expand phase (additive, deploy, backfill) and a contract phase (a later release), because Worker rollback does not roll back D1 — see below.

## Backup / recovery point requirements

**Mandatory before any production migration.** Cloudflare **D1 Time Travel** is the canonical mechanism for this project (`01-sources/DEPLOYMENT_ARCHITECTURE.md` §12, `01-sources/DATABASE_SCHEMA.md` §18) — nothing new is invented here.

```bash
npx wrangler d1 time-travel info DB_PUBLIC --env production   # read-only
npx wrangler d1 time-travel info DB_OPS    --env production   # read-only
```

Capture, and record in the release report **before** applying anything:

1. The restore bookmark for **each** database independently (they recover independently).
2. The exact ordered list of migrations about to be applied.
3. The currently-serving production Worker version ID (the application-level rollback point, independent of the D1 bookmark).

**No production Time Travel bookmark has ever been captured in this project.** The procedure is defined and zero-invention; it has simply never been executed against production.

## Execution procedure

```bash
# 1. Recovery point (above) — record in the report before proceeding.
# 2. Apply, one database at a time, DB_PUBLIC first (larger surface, read-model only).
npx wrangler d1 migrations apply DB_PUBLIC --env production --remote
npx wrangler d1 migrations apply DB_OPS    --env production --remote
# 3. Verify.
npx wrangler d1 migrations list DB_PUBLIC --env production --remote   # → No migrations to apply!
npx wrangler d1 migrations list DB_OPS    --env production --remote   # → No migrations to apply!
# 4. Confirm the new objects exist by direct SELECT, not only by the migrations table.
```

Step 4 is not redundant: the migrations table records intent, a `SELECT` confirms reality.

## Failure handling

| Failure | Response |
| --- | --- |
| A migration fails mid-sequence | **Stop.** Do not retry blindly, do not proceed to the code deploy. D1 applies each file atomically, so the failure point is knowable — determine which files applied via `migrations list`, then decide restore-vs-forward-fix deliberately. |
| A migration applies but the schema is wrong | Restore from the Time Travel bookmark for **that** database only. The other database is untouched and must not be restored reflexively. |
| Migrations succeed, code deploy fails | **No database action.** All five are backward-compatible, so the still-live older Worker keeps serving correctly against the new schema. Fix forward on the code. |
| Migrations succeed, code deploys, smoke fails | Roll back the **Worker only**. Leave the schema in place — see the rollback asymmetry below. |

## Rollback strategy — and its hard limit

**Worker rollback does not roll back D1.** Stated directly in `01-sources/DEPLOYMENT_ARCHITECTURE.md` §12 and repeated in STG-P0. This asymmetry governs everything:

- **No down-migrations exist anywhere in this repository**, by established convention — "write a new forward migration to fix a mistake, never a reverse-apply script." Migration `0010` is explicitly classified `REVERSIBLE: PARTIAL`.
- Therefore the **only** true database rollback is a **Time Travel point-in-time restore**, which is why the bookmark is mandatory and non-negotiable.
- A Time Travel restore rolls back **all data written since the bookmark**, not just schema. For `DB_OPS` that means **accepted RFQs could be lost**. This is the single most consequential fact in this document: *a `DB_OPS` restore is a data-loss event and must be treated as an incident decision, never a routine rollback step.*
- Practical consequence: prefer forward-fix for `DB_OPS` in almost all circumstances. `DB_PUBLIC` is a derived read model rebuildable by catalog/processing sync, so restoring it is far cheaper — another reason the two databases must never be restored as a pair out of reflex.

---

# ROLLBACK_POLICY

## Layered model — cheapest and most reversible first

| Layer | Mechanism | Reverses | Data loss | Speed |
| --- | --- | --- | --- | --- |
| **L1 — Worker version** | `wrangler versions deploy <PREVIOUS_VERSION_ID>@100` | application code | none | seconds |
| **L2 — Traffic** | re-promote a prior version at a lower percentage | partial exposure | none | seconds |
| **L3 — DNS** | revert `www` to the prior target | the whole Cloudflare serving path | none | minutes + TTL |
| **L4 — Database** | D1 Time Travel restore, per database | schema **and data** | **YES** | minutes |

**Always attempt L1 first.** L4 is an incident decision, never a routine step.

## L1 — the standard path

```bash
# Captured by the workflow before promotion (requirement R7):
npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100 --config dist/server/wrangler.json
# Or, for the immediately-prior version without needing the ID:
npx wrangler rollback --config dist/server/wrangler.json
```

`wrangler rollback` is the safety net when the ID was somehow not captured; the explicit form is preferred because it is unambiguous about *which* version is being restored.

## L3 — DNS, and its current dependency

`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11 designates DNS reversion as the primary rollback for a cutover, and §8.2/§8.3 remain in force: **do not delete or unlink the Vercel project — it is the intact rollback target.** That remains correct, and is reinforced by the apex finding below: Vercel is not merely a standby, it is currently serving live apex traffic.

## RFQ durability during any rollback

The durable-first-write architecture (`POST /api/rfqs` → D1 → outbox → Queue → Odoo) means an L1/L2/L3 rollback **never loses an already-accepted RFQ**. Anything durably written to `DB_OPS` stays there, and the cron-driven outbox sweep plus the Queue consumer continue syncing to Odoo independently of which version or hostname receives new traffic. Only *new* submissions during the rollback window are affected, which is correct behaviour rather than a data-loss risk.

**This guarantee does not extend to L4.** A `DB_OPS` Time Travel restore discards RFQs written after the bookmark. The two statements must never be conflated.

## Release identity requirement

With **zero git tags** today, rollback targets exist only as hand-transcribed UUIDs in Markdown. Every release under this architecture must create an annotated tag:

```text
release/prod-YYYY-MM-DD-<short-sha>
```

and the workflow must print tag, full SHA, `NEW_VERSION_ID` and `PREVIOUS_VERSION_ID` into the job summary. This converts rollback from archaeology into a lookup.

---

# SMOKE_TEST_POLICY

## Rules

1. **Mandatory and blocking.** The production workflow fails if any mandatory check fails.
2. **Run against the real hostname** (`https://www.ahanassa.com`), not `*.workers.dev` — the custom domain, TLS and routing are part of what is being validated.
3. **Any 5xx is an automatic failure.** No exceptions, no retries-until-green.
4. **Structural assertions, never fixtures.** Assert *that* a catalog page renders products, never *which* products — production's catalog is synced independently and its published set legitimately differs from staging's six.
5. **No real RFQ submission.** Never submit a customer-identity RFQ as a smoke test. If an end-to-end proof is ever wanted, use the established `(SYNTHETIC)` company / `.invalid` email convention, and only on explicit owner request.
6. **Compare against the pre-deploy baseline**, captured by the same workflow before promotion — a route that was already failing is a different signal from one this release broke.

## Mandatory checks (blocking)

| # | Area | Check | Pass criterion |
| --- | --- | --- | --- |
| S1 | Homepage | `GET /` | 200, `<html lang="fa" dir="rtl">` |
| S2 | Locales | `GET /en`, `GET /ar` | 200, `lang="en" dir="ltr"` / `lang="ar" dir="rtl"` |
| S3 | Catalog index | `GET /products` | 200, **≥1** product detail link present |
| S4 | Catalog detail | first slug discovered in S3 | 200, localized `<h1>` present — proves `DB_PUBLIC` connectivity end-to-end |
| S5 | Services | `GET /services`, `/en/services`, `/ar/services` | 200 |
| S6 | RFQ page | `GET /contact` | 200, `<form>` present with `company`, `phoneCountry`, `phoneLocal` |
| S7 | API health | `GET /api/hello` | 200, JSON body |
| S8 | Redirects | `GET /request`, `GET /fa` | 308 → `/contact`, 308 → `/` (proves `0006` route redirects live) |
| S9 | Not-found | `GET /products/<nonexistent>` | **404, not 500** — a 500 indicates a broken data path |
| S10 | Security headers | on `/` | `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, CSP all present |
| S11 | Canonical / SEO | `/` and one detail page | `<link rel="canonical">` → `https://www.ahanassa.com/…` |
| S12 | `robots.txt` | `GET /robots.txt` | 200, references `https://www.ahanassa.com/sitemap.xml` |
| S13 | `sitemap.xml` | `GET /sitemap.xml` | 200, valid XML, all URLs on the canonical origin |
| S14 | Apex | `GET https://ahanassa.com/` | 308 → `https://www.ahanassa.com/` (see DOMAIN_POLICY for the caveat) |
| S15 | Database connectivity | implied by S3/S4 | zero `no such table` / `no such column` markers in any response body |

S4 and S15 together are the real migration-drift detector: had they run against production today, the missing `0007`–`0010` tables would surface immediately.

## Post-release observation (non-blocking, human)

Not gates on the deploy, but part of the release window:

- `wrangler tail` or Cloudflare Observability for the first hour.
- `catalog_sync_state` after the next incremental (`0 */3`) and full (`30 2`) cron firing.
- `dead_letter_records` daily for the first week — any **new** (non-historical) entry investigated.
- Queue producer/consumer health and outbox drain.
- Turnstile success rate on the real hostname.

## Explicitly out of scope for automated smoke

Browser/visual/keyboard/zoom/reduced-motion verification. These require a human or a Playwright suite that does not exist in this pipeline, and pretending a `curl` matrix covers them would be dishonest. If visual verification is wanted at release time, it is a named checklist item with a human owner — not a workflow step.

---

# DOMAIN_POLICY

## Current state (verified live, 2026-09-19)

| Hostname | Serving platform | Evidence | DNS |
| --- | --- | --- | --- |
| `www.ahanassa.com` | **Cloudflare Worker** | 200, `server: cloudflare`, `X-Vinext-*` headers | `188.114.97.3` / `188.114.96.3` — Cloudflare anycast, proxied |
| `ahanassa.com` (apex) | **Vercel** | 308 → www, `server: Vercel`, `x-vercel-id: fra1::…` | `216.198.79.1` / `64.29.17.1` — Vercel anycast, DNS-only |

Zone nameservers: `coraline.ns.cloudflare.com`, `micah.ns.cloudflare.com` — the zone is on Cloudflare; only the apex *records* still point at Vercel.

`wrangler.jsonc` `env.production.routes` declares exactly `[{ "pattern": "www.ahanassa.com", "custom_domain": true }]`. The apex is deliberately absent — canonical policy is that apex redirects and `www` is canonical (`lib/env.ts:11` `CANONICAL_ORIGIN = "https://www.ahanassa.com"`).

## Target state

| Hostname | Target | Mechanism |
| --- | --- | --- |
| `www.ahanassa.com` | Cloudflare Worker (**unchanged**) | existing Worker Custom Domain |
| `ahanassa.com` | **308 → `https://www.ahanassa.com`, served by Cloudflare** | Cloudflare **Redirect Rule** at the zone — *not* a Worker route, *not* an application-code redirect |

The apex must not be attached to the Worker. Making the Worker serve the apex would burn compute on a redirect and create a second hostname whose canonical behaviour must be maintained in code. A zone-level Redirect Rule is the correct layer.

## Why this matters beyond tidiness

The apex is currently a **live serving dependency on Vercel**, while `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8.3 plans to eventually remove the Vercel domain association. Executed in the wrong order, that removal **breaks the apex**. Sequence is therefore mandatory: configure the Cloudflare Redirect Rule → verify → only then consider detaching Vercel.

## Cutover steps (design only — not authorized by this document)

| # | Step | Owner | Reversible? |
| --- | --- | --- | --- |
| D1 | Record the exact current apex DNS configuration (record types, values, TTLs) as the rollback reference | operator | n/a — read-only |
| D2 | Obtain **Cloudflare zone write access** — the actual blocker; Redirect Rules are outside every `wrangler` subcommand and were unavailable to prior sessions | **owner** | n/a |
| D3 | Create a zone Redirect Rule: `ahanassa.com/*` → `https://www.ahanassa.com/$1`, **308**, preserving path and query | operator | yes — delete the rule |
| D4 | Repoint apex DNS from the Vercel A records to a Cloudflare-proxied record so the Redirect Rule can act on it | operator | yes — restore D1's values |
| D5 | Verify: `curl -I https://ahanassa.com/` → 308, `server: cloudflare`, `location: https://www.ahanassa.com/`; path and query preserved; TLS valid | operator | n/a |
| D6 | Verify deep paths redirect correctly (`/products`, `/en/contact`) rather than collapsing to the root | operator | n/a |
| D7 | Observe for an owner-agreed window. **Do not** touch the Vercel project during it | operator | n/a |
| D8 | Only after D7: consider removing the Vercel domain association (separate authorization, per runbook §8.3) | **owner** | partially |

**Rollback for the cutover itself:** restore the apex DNS records captured in D1. This is why D1 precedes everything.

## Relationship to code releases

The domain cutover is **independent of, and must not be bundled with, a code release.** They are different change classes with different rollback mechanisms and different blast radii. Smoke check S14 tolerates either serving platform for the apex — it asserts the 308 and its target, not `server:` — so the production pipeline is not blocked on the cutover, and the cutover does not require a code release.

---

# RELEASE GOVERNANCE

## Who approves a production release

**Design requirement, not a decision this document can make:** exactly one accountable human approver must be named, configured as a required reviewer on the GitHub `production` Environment. `PROJECT_OVERRIDES.md` establishes the project owner as the authority for cross-project decisions and every release document to date records owner authorization for each production action, so the owner is the natural approver — **but naming them is an owner decision and is left open here.**

Recommended structure:

| Role | Responsibility |
| --- | --- |
| **Release approver** (owner) | Approves the GitHub Environment gate. Accountable for the go/no-go. Sole authority for the `skip_staging_provenance` break-glass and for any L4 database restore. |
| **Release operator** | Completes the checklist, dispatches the workflow, executes migrations, captures evidence, writes the report. |
| **Reviewer** (optional) | Second pair of eyes on the checklist for high-risk releases (migrations, config changes, first release after a long gap). |

Approver and operator **may be the same person** on a project this size. What matters is that the approval is a recorded, deliberate act with a name against it — not that two humans exist.

## Release checklist

Completed by the operator, reviewed by the approver, reproduced in the release report.

**Pre-release**
- [ ] Release SHA identified, full 40 characters
- [ ] CI green for that SHA
- [ ] A successful `Deploy Staging` run deployed **exactly** that SHA (run ID recorded)
- [ ] Staging smoke passed against that deployment (evidence recorded)
- [ ] Migration decision made: does this SHA require migrations production lacks?
- [ ] If yes: Time Travel bookmarks captured for **each** affected database
- [ ] Current production Worker version ID recorded as rollback target
- [ ] `wrangler.jsonc` diff since the last release reviewed — especially `routes`, `triggers`, `vars`, `workers_dev`
- [ ] Feature-flag state confirmed intentional (`PRICE_STRIP_ENABLED`, `ENABLED_PRICE_PROVIDERS`, `HOMEPAGE_RANKING_MODE`)
- [ ] Annotated tag `release/prod-YYYY-MM-DD-<short-sha>` created
- [ ] Release window agreed; approver available for the monitoring period

**Release**
- [ ] Migrations applied and verified (if applicable), **before** the code deploy
- [ ] Approver approved the `production` Environment gate
- [ ] Workflow dispatched with the exact SHA and the intended `rollout_percentage`
- [ ] All three assertions passed
- [ ] `NEW_VERSION_ID` recorded; secrets verified present on it before promotion
- [ ] Promotion completed; smoke gate green

**Post-release**
- [ ] Tag pushed
- [ ] Release report written and committed
- [ ] Monitoring window observed; outcome recorded
- [ ] `DOCUMENT_AUDIT_REPORT.md` updated if the release resolved or created a finding

## Emergency rollback process

Triggers (from `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §10, unchanged): 5xx or hang on `/`, `/products`, `/contact`; missing security headers or a Turnstile failure blocking legitimate RFQ submission; an RFQ failing to durably persist; unexpected outbox/Queue/DLQ failure rates; any secret exposed in a response, header or log; a new class of Odoo sync failure.

```text
0–2 min    DECLARE. State the trigger out loud in the release channel/report.
           Do not debug before deciding — rollback is cheap, downtime is not.
2–5 min    L1: wrangler versions deploy <PREVIOUS_VERSION_ID>@100
5–8 min    VERIFY: re-run the mandatory smoke matrix against www.ahanassa.com
8+  min    If L1 did not resolve it → consider L3 (DNS).
           If the cause is a migration → STOP. Escalate to the approver.
           L4 is an incident decision and, for DB_OPS, a data-loss event.
Always     Record: trigger, timeline, actions, outcome. An emergency rollback
           still produces a report — arguably the most valuable kind.
```

**Standing rule:** never combine a rollback with a fix in the same action. Restore the known-good state first, diagnose second.

## Evidence and report requirements

Every production release produces a dated report in `docs/release/`, matching the established convention (`docs/CICD_*`, `docs/release/STG_P1_*`). Minimum contents:

| Section | Must record |
| --- | --- |
| RESULT | PASS / FAIL / ROLLED BACK |
| AUTHORIZATION | who approved, what envelope |
| PREFLIGHT | checklist state, drift found |
| BASELINE | pre-release Worker version, D1 migration state, smoke baseline |
| MIGRATIONS | bookmarks captured, files applied, verification output |
| DEPLOYMENT | run ID, `deploy_ref`, `DEPLOYED_SHA`, `NEW_VERSION_ID`, `PREVIOUS_VERSION_ID`, rollout % |
| SMOKE | full result matrix |
| ROLLBACK READINESS | recorded rollback target, whether rollback was needed |
| NON-IMPACT | what was explicitly **not** touched |
| NEXT STEP | the single next action |

**A release is not complete until its report exists.** This project's existing reports are unusually good — the design's intent is to preserve that standard, not to replace it with a workflow log.

---

# IMPLEMENTATION_STEPS

Sequenced so each phase is independently authorizable and no phase depends on an unfinished one. **None of this has been performed.**

## Phase 0 — Preconditions (must complete before a production workflow is written)

| # | Step | Why it blocks | Owner |
| --- | --- | --- | --- |
| 0.1 | **Delete or rename the Vercel-leftover `Production` GitHub Environment** | A future author will reference it and get a gate with zero protection rules. Highest-risk trap in the current config. | operator |
| 0.2 | **Name the release approver** | An approval gate with no named reviewer is decoration. | **owner** |
| 0.3 | **Pin `package.json` to concrete versions** (12 deps currently `"latest"`) | SHA promotion's reproducibility guarantee rests on this. | operator |
| 0.4 | **Bring production D1 level with staging** — the five pending migrations, with bookmarks captured first, per MIGRATION_POLICY | Until done, a correct pipeline faithfully deploys code production's schema cannot serve. | operator + owner approval |
| 0.5 | **Verify secret inheritance across `versions upload`** (R8 caveat) | Determines whether the workflow needs an explicit secret step. Unresolved in this design. | operator |

## Phase 1 — Create the production GitHub Environment

Purpose-built `production` environment with required reviewer(s) from 0.2, a deployment branch policy (not `null`), and environment-scoped `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Verify the API token's scope is sufficient for `versions upload`/`versions deploy` on the production Worker and no broader than necessary.

## Phase 2 — Backport the missing controls to staging first

Deliberately staging-first: these controls are new and should be proven where failure is cheap.

1. Add the post-deploy smoke gate to `deploy-staging.yml` (R9's mechanism, staging's route matrix).
2. Add `PREVIOUS_VERSION_ID` capture (R7).
3. Add `"workers_dev": true` to `env.staging` — the DAR-050 regression class is still latent there.
4. Extend `lib/ci/workflow-invariants.test.ts` for the new staging steps.
5. Exercise it with one real staging deployment.

## Phase 3 — Author `deploy-production.yml`

Implement R1–R12. Build it as a near-clone of the hardened staging workflow, differing only in the four deliberate ways. Mutation-test the assertion-ordering and staging-provenance invariants. **Do not dispatch it yet.**

## Phase 4 — Dry run

Dispatch with a deliberately invalid `deploy_ref`, then with a SHA that never reached staging, confirming each assertion fails closed **before** any build or deploy. Then run the real thing at `rollout_percentage: 10`, observe, and promote to 100 only after the smoke gate is green.

## Phase 5 — Release identity and governance

Tag the first release; adopt the checklist; write the first production release report under the template above.

## Phase 6 — Domain cutover (independent track)

D1–D8 in DOMAIN_POLICY. Gated on owner-obtained Cloudflare zone write access (D2), which is a permissions action, not engineering work. **Must not be bundled with a code release.**

## Explicitly excluded from this design

- **The RFQ staging-credential question.** Staging lacks `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` because the Odoo RFQ API has exactly one global Bearer token with no environment scoping — provisioning a "staging" credential would grant staging real production RFQ-write access. That is an owner decision about blast radius, and the honest alternative (a scoped staging credential) is upstream Odoo work. It should be decided on its own merits, not resolved implicitly to unblock a pipeline. Its consequence for this design is stated plainly: **the RFQ path cannot be fully validated on staging, so smoke check S6 verifies form presence only.**
- **Git history consolidation** of `main` and the application branch. Not required by this design and still needs separate owner sign-off.
- **Artifact-digest promotion** (the V2 upgrade path described in PROMOTION_MODEL).

---

# RISKS

Risks of the architecture itself, and of implementing it. Ordered by expected impact.

### RK1 — Production D1 drift is a precondition, not a pipeline problem — **CRITICAL**

Building the workflow before Phase 0.4 produces a pipeline that correctly and reliably ships broken code. Assertion A3 is designed to catch exactly this, which means a correctly-implemented pipeline would **refuse to deploy** until the migrations are applied. That is the intended behaviour, and it must not be "fixed" by relaxing A3.

### RK2 — The Vercel-leftover `Production` environment — **HIGH**

Zero protection rules, plausible name. A workflow author writing `environment: Production` in good faith gets no gate, no reviewer, and — because its secrets are absent — a confusing credential failure that invites working around the environment entirely. Phase 0.1 exists solely to remove this.

### RK3 — Secret inheritance across `versions upload` is unverified — **HIGH**

If a newly uploaded version does **not** inherit `TURNSTILE_SECRET_KEY` / `ODOO_RFQ_API_TOKEN`, promoting it would put a version with missing secrets in front of live traffic — Turnstile fails closed and RFQ submission breaks. The R8 mitigation (assert secrets present between phase 1 and phase 2) is mandatory, not optional, and Phase 0.5 must resolve the question before the first automated release.

### RK4 — Staged rollout may not behave as assumed — **MEDIUM-HIGH**

`rollout_percentage` assumes Cloudflare gradual deployments work as documented for this Worker on this plan. The project's history only ever used `@100`. If `@10` is unavailable or behaves unexpectedly, the design still functions — `@100` is the default — but the staged-rollout safety argument evaporates. Verify during Phase 4 rather than at the first real release.

### RK5 — `DB_OPS` Time Travel restore is a data-loss event — **MEDIUM-HIGH**

It discards RFQs written after the bookmark. The risk is not the mechanism but the reflex: treating "restore the database" as a routine rollback step by analogy with the Worker. The policy states this explicitly and restricts L4 to an approver decision, but it remains the sharpest edge in the whole design.

### RK6 — The provenance assertion adds a GitHub API dependency to the release path — **MEDIUM**

A2 needs `actions: read` and a live API call. A GitHub API outage or a rate limit blocks production releases — including, potentially, a release intended to fix an incident. Mitigated by the `skip_staging_provenance` break-glass, which is itself a risk (RK7). Accepted: the guarantee is worth the dependency, and the break-glass is auditable.

### RK7 — `skip_staging_provenance` normalization — **MEDIUM**

Break-glass flags get used routinely under pressure. Mitigations: loud job-summary warning, mandatory justification in the release report, approver-only authority. Worth auditing periodically — if it is used more than rarely, the staging path has a problem the flag is masking.

### RK8 — Re-running tests in the production workflow creates a divergence window — **MEDIUM**

The production workflow re-runs `npm test` on the same SHA that already passed in staging. If a test is time-, network- or environment-sensitive it could pass on staging and fail on production, blocking a release for a reason unrelated to the release. Accepted deliberately: a flaky test blocking a production deploy is a far better failure than an unverified deploy. But it does mean test flakiness becomes a release-blocking concern.

### RK9 — Cron trigger cap (4 of 5 used) — **MEDIUM**

Assertion A1 pins production's three triggers. Any future need for a fourth production trigger — a price sync, for example — collides with the account-wide 5-trigger cap already breached once (DAR-053). Not a pipeline defect, but a constraint that will surface as an apparently-unrelated assertion failure.

### RK10 — Apex depends on Vercel until D3/D4 complete — **MEDIUM**

Live apex traffic is served by a platform the project considers decommissioned. Any Vercel-side change — project deletion, plan change, expiry — breaks the apex with no Cloudflare fallback. The cutover is gated on owner-obtained zone write access, so the exposure persists for as long as that takes.

### RK11 — Single-branch environment policies are brittle — **LOW-MEDIUM**

Staging's policy names exactly `feat/header-hero-integrated`. The production environment will need equivalent scoping. A branch rename silently blocks deployment, and the failure mode (gate rejection, no secrets) is not obviously diagnosable from workflow logs.

### RK12 — Smoke assertions can drift into fixtures — **LOW**

Rule 4 forbids asserting *which* products render, precisely because production's catalog differs from staging's. The risk is a future maintainer "improving" the smoke test by pinning real slugs, creating a release blocker every time the catalog legitimately changes. The rule is stated in the policy for this reason.

### RK13 — Design drift — **LOW**

This document describes a target, and targets rot. Every element here is anchored to a verifiable artifact (a workflow ID, a database ID, a migration filename, a live HTTP response) so drift is detectable. It should be re-verified against reality before Phase 3, not trusted because it was accurate on 2026-09-19.

---

**NO CODE CHANGES.** This task produced exactly one artifact — this document. No workflow was created, nothing was deployed, and no Cloudflare resource, DNS record, migration or application file was touched.
