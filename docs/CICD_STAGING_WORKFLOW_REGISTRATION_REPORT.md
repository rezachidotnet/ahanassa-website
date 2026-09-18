# CI/CD — Staging Workflow Registration & Exact-SHA Deployment Enablement

**Date:** 2026-09-19 (Asia/Tehran). The corresponding UTC instant is 2026-09-18T21:25:57Z — `REPORT_BUNDLE_MANIFEST.txt` timestamps this report under 2026-09-18 UTC for that reason; the two refer to the same moment.
**Repository:** `rezachidotnet/ahanassa-website`
**Feature branch:** `feat/header-hero-integrated`
**Scope:** register `deploy-staging.yml` with GitHub Actions; harden it for exact-SHA deployment; restrict the GitHub `staging` environment; correct stale Vercel deployment documentation.
**Explicitly out of scope / not performed:** any real staging deployment, any production deployment, any history merge.

---

# RESULT

**PASS.**

`deploy-staging.yml` is now registered and indexed by GitHub Actions (workflow ID `361701517`, state `active`, `workflow_dispatch` available, **0 runs**). It was hardened first so that the copy placed on `main` cannot deploy the application-less legacy `main` tree. The two unrelated Git histories were not merged, rebased, or force-pushed. No Cloudflare deployment was triggered, and production is unchanged.

---

# GIT TOPOLOGY

| Item | Value |
| --- | --- |
| Default branch | `main` |
| Feature branch | `feat/header-hero-integrated` |
| `FEATURE_HEAD_BEFORE` | `ce8912780bf59a1200f227b23afe8ea9248036fb` |
| `FEATURE_WORKFLOW_COMMIT` | `3ce18c52ef1a84311523d3bfe756139a545c8752` |
| `MAIN_BEFORE` | `d22d7529dd7dd521443699c963b8b95e6943be78` |
| `MAIN_WORKFLOW_COMMIT` | `eab51b747ba0479f7a934b86b4204c50ee6b682e` |
| Remote | `git@github.com:rezachidotnet/ahanassa-website.git` |

`main` before this task was the legacy 3-commit holding-page history (`c2f6e13` → `b316264` → `d22d752`), 14 tracked files, no `.github/` directory at all.

**Preflight deviation from the task brief (recorded, not corrected):** the brief gave `cf15b0be4368b4d49da270dcf4621d46ec5f7811` as the feature HEAD. The actual HEAD at preflight was one commit later, `ce89127` ("docs: audit safe staging workflow indexing"). Work proceeded from the verified actual HEAD.

**Second preflight deviation:** the brief described the repository as private. It is **public** (`"private": false`, `"visibility": "public"`, owner type `User`). This materially affected §5 below — deployment branch policies are available on public repositories, so the branch restriction was configurable rather than plan-blocked.

**Third preflight observation:** the local feature branch was **26 commits ahead of `origin/feat/header-hero-integrated`** (0 behind) before this task. Pushing the branch was therefore a pure fast-forward that also published those 26 pre-existing commits (`7bb2c34..3ce18c5`). No force, no rewrite, no history change — but it is recorded here because the push moved more than this task's own commit.

---

# UNRELATED HISTORY SAFETY

`git merge-base origin/main feat/header-hero-integrated` returned **no merge base** at preflight and **still returns no merge base** after both pushes. The histories remain unrelated.

- No merge, no cherry-pick, no rebase, no branch replacement, no force push was performed.
- The `main` commit was produced in a **separate detached `git worktree`** based exactly on `origin/main`, into which the validated workflow file was **copied** (byte-identical, blob `fe8c14cfe1cebe984582da5be106faf1b0030c9c`). This is a file copy, not a history operation.
- `git diff --name-status origin/main HEAD` in that worktree showed exactly one entry: `A .github/workflows/deploy-staging.yml`. No application file, dependency, vinext/wrangler configuration or feature commit reached `main`.
- Parent of `MAIN_WORKFLOW_COMMIT` verified to be exactly `MAIN_BEFORE` immediately before pushing, after a fresh `git fetch origin`.
- Both pushes were ordinary fast-forwards (`d22d752..eab51b7`, `7bb2c34..3ce18c5`).
- The temporary worktree was removed cleanly afterwards; the feature working tree was never disturbed.

---

# WORKFLOW HARDENING

Prior state of `.github/workflows/deploy-staging.yml`: `workflow_dispatch`-only, one `confirm` input, `concurrency: deploy-staging`, `permissions: contents: read`, `environment: staging`, a bare `actions/checkout@v4` with **no explicit ref**, then `npm ci` → `npm test` → `tsc --noEmit` → `npm run build` → `npx vinext-cloudflare deploy --env staging`. No D1 migration step (deliberate; unchanged).

Changes made — the smallest set that satisfies the goal:

1. **`deploy_ref` input added** (`required: true`, `type: string`, **no default**). A branch-name default was deliberately omitted: a mutable default would undercut the exact-SHA intent and could silently deploy a moved branch. The operator must supply the ref, and is directed to a full 40-character SHA.
2. **Explicit checkout:** `ref: ${{ inputs.deploy_ref }}`, plus `persist-credentials: false`.
3. **Empty-input guard** in the confirmation step — fails closed on an empty or whitespace-only `deploy_ref`.
4. **Fail-closed staging resource assertion** (see below), placed **before** `setup-node`, `npm ci`, `npm test`, `npm run build` and the deploy, so nothing from the untrusted ref executes before the target is proven.
5. **`DEPLOYED_SHA` recorded** as a step output, an environment variable, and a job-summary table; also echoed immediately before the deploy command.
6. Retained unchanged: `workflow_dispatch`-only trigger, the typed `deploy-staging` confirmation, `concurrency`, `permissions: contents: read`, `environment: staging`, and the deliberate absence of any D1 migration step.

The `main` copy and the feature-branch copy are **byte-identical** (same blob SHA on both refs), so the same hardened logic applies whichever ref an operator dispatches from.

---

# EXACT SHA MODEL

The workflow no longer relies on the branch selected in the dispatch UI to decide what gets deployed:

```text
operator supplies deploy_ref  ──►  guard: non-empty
                              ──►  actions/checkout@v4 with ref: ${{ inputs.deploy_ref }}
                              ──►  DEPLOYED_SHA = git rev-parse HEAD
                                   + git cat-file -e <sha>^{commit}  (must resolve)
                              ──►  staging resource assertion
                              ──►  build ──► deploy
```

If `deploy_ref` does not resolve to a commit, the run fails **before** build and deploy. `DEPLOYED_SHA` is surfaced in the run log, as `steps.resolve.outputs.deployed_sha`, as a job output, and in the run summary alongside the requested ref, the Cloudflare environment and the Worker name — so a staging deployment is traceable to an immutable commit rather than to whatever a branch pointed at.

---

# STAGING RESOURCE ASSERTION

**Threat addressed:** `wrangler.jsonc` arrives from `deploy_ref`, which is attacker- or accident-controllable. A doctored branch could otherwise point the staging path at the live resources.

The assertion is **inline in the workflow file**, not a script in the repository. This is deliberate: GitHub Actions executes the workflow file from the dispatch ref, so an inline check is trusted, whereas a checked-out script would come from the untrusted `deploy_ref` and could be edited alongside the config it is meant to police.

It parses `wrangler.jsonc` (JSONC comment/trailing-comma tolerant) and requires **all** of:

| Check | Requirement |
| --- | --- |
| File present | `wrangler.jsonc` must exist and parse |
| Worker | `env.staging.name` === `ahanassa-bootstrap-staging` |
| D1 `DB_OPS` | `ahanassa-ops-staging` / `49bd0aff-e289-4fff-b7b9-0f4b517e6b14` |
| D1 `DB_PUBLIC` | `ahanassa-public-staging` / `35cef70f-3ad3-4049-add4-ddcac6cac45b` |
| D1 completeness | exactly those two bindings, no unexpected binding |
| Vars | `env.staging.vars.APP_ENV` === `staging` |
| Live-environment scan | no string anywhere under `env.staging` may name the live environment |

Any failure emits `::error::STAGING RESOURCE ASSERTION FAILED — <reason>` and exits 1 before build and deploy. No credential is printed.

The live-environment scan is **literal-free** (a recursive walk matching a pattern, not a hard-coded list of live identifiers). This was a deliberate revision: the first implementation used an explicit denylist containing the live Worker and database names, which tripped the repository's own pre-existing invariant test `staging deploy workflow never applies a D1 migration and never targets production`. Rather than weaken that existing safety net, the assertion was rewritten to need no literals — the pinned equality checks above already cover redirection, and the scan adds defence in depth for queues, vars and routes.

**Validation performed** — the assertion step was extracted from the parsed YAML (proving the heredoc survives YAML block-scalar dedent) and executed exactly as the runner would:

| Case | Result |
| --- | --- |
| Real repository tree | **PASS** |
| `env.staging.name` swapped to the live Worker | FAIL — name mismatch |
| Staging `DB_OPS` repointed at the live database id | FAIL — database_id mismatch |
| `wrangler.jsonc` present but no `env.staging` | FAIL — no staging block |
| `wrangler.jsonc` absent | FAIL — ref does not contain the application |
| Live-environment string injected into `env.staging.vars` | FAIL — names the live environment |
| Staging queues repointed at live queues | FAIL — names the live environment |
| **Actual `origin/main` tree** (`git archive origin/main`) | **FAIL — ref does not contain the application** |

That last row is the §9 guarantee, demonstrated rather than asserted.

The confirmation and SHA-resolution steps were extracted and executed the same way: correct confirmation passes; a wrong confirmation string, an empty `deploy_ref`, and a whitespace-only `deploy_ref` each fail closed; SHA resolution writes the expected `GITHUB_ENV`, `GITHUB_OUTPUT` and `GITHUB_STEP_SUMMARY` content.

**No Cloudflare target is an operator input.** The Cloudflare environment (`--env staging`), Worker name and D1 identities are fixed in repository configuration; `workflow_dispatch` exposes only `deploy_ref` and `confirm`.

**Tests added** (`lib/ci/workflow-invariants.test.ts`, following the file's existing static-check pattern) — four new invariants covering the explicit checkout ref, `DEPLOYED_SHA`, assertion ordering relative to `npm ci`/`npm run build`/`vinext-cloudflare deploy`, and the absence of any Cloudflare target among the dispatch inputs. Both the explicit-ref and the assertion-ordering invariants were **mutation-tested** (removing the ref line, and deleting the assertion step, each turn the suite red).

Validation run: `npx tsc --noEmit` clean; `npm test` **1334 passed, 0 failed**.

---

# GITHUB ENVIRONMENT POLICY

`STAGING_ENV_BRANCH_POLICY: CONFIGURED`

Before: environment `staging` (id `21847608435`) had `deployment_branch_policy: null` and no protection rules — any branch could deploy into it.

After:

```json
"deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
```

with exactly one allowed branch entry: `feat/header-hero-integrated` (policy id `60370354`, type `branch`). No wildcard, no arbitrary branch, and `main` is **not** allowed — a dispatch from `main` is rejected at the environment gate in addition to failing the workflow's own staging resource assertion.

The environment's two secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are environment-scoped, not repository-scoped, so a job that does not pass the environment gate never receives them.

The workflow-level staging resource assertion remains mandatory regardless — the two controls are independent.

---

# FEATURE BRANCH COMMIT

`3ce18c52ef1a84311523d3bfe756139a545c8752` — `ci: harden exact-sha staging deployment`

Contents: `.github/workflows/deploy-staging.yml` and `lib/ci/workflow-invariants.test.ts` only. The pre-existing pending working-tree changes (`REPORT_BUNDLE_MANIFEST.txt`, `tsconfig.tsbuildinfo`, and the untracked `docs/AHANASSA_CICD_SERVICES_CURRENT_STATE_RECOVERY_AUDIT.md`) were **not** absorbed.

Pushed as a fast-forward: `7bb2c34..3ce18c5` (no force).

---

# ADDITIVE MAIN COMMIT

`eab51b747ba0479f7a934b86b4204c50ee6b682e` — `ci: register staging deployment workflow`

- Parent: `d22d7529dd7dd521443699c963b8b95e6943be78` (exactly `origin/main` at push time, re-verified after a fresh fetch).
- Single added path: `.github/workflows/deploy-staging.yml`.
- Produced in a temporary detached worktree; pushed `d22d752..eab51b7`, no force, no merge.
- `main` has no branch protection configured; the push required no override.
- Pushing this file to `main` triggers nothing: `ci.yml` does not exist on `main`, and `deploy-staging.yml` is `workflow_dispatch`-only.

---

# WORKFLOW REGISTRATION

| Field | Value |
| --- | --- |
| `GITHUB_WORKFLOW_INDEXED` | **YES** |
| Workflow ID | `361701517` |
| Workflow name | `Deploy Staging` |
| Path | `.github/workflows/deploy-staging.yml` |
| State | `active` |
| `WORKFLOW_DISPATCH_AVAILABLE` | **YES** — both inputs (`deploy_ref`, `confirm`) present in the indexed YAML |
| Total runs | **0** |

Registration was immediate on the first poll after the `main` push. The §12 fallback was **not needed and not used** — no benign registration trigger was added, and no push-deployment behaviour exists in either workflow.

Root cause of the original non-registration, for the record: GitHub only lists a `workflow_dispatch` workflow once the file exists on the repository's **default branch**. The file previously existed only on the application branch.

---

# VERCEL DOCUMENTATION CORRECTION

`STALE_VERCEL_DOCS_FIXED: YES`

The prior documentation (from the 2026-09-02 audit, DAR-048) stated that Vercel's Git integration was connected and auto-deployed every pushed branch, with its Production target tied to `origin/main`. **This was independently re-verified as no longer true**, read-only, on 2026-09-19:

- `vercel project inspect ahanassa-website` reports **no connected Git repository**.
- Newest Preview deployment: **16 days old**. Newest Production deployment: **31 days old** (the legacy holding page).
- **Empirical confirmation:** this task's own additive push to `origin/main` produced **no** Vercel deployment, Preview or Production. Had the integration been connected with Production tied to `main`, it would have fired.
- `https://www.ahanassa.com/` responds `200` from the Cloudflare Worker (vinext response headers); apex `ahanassa.com` still returns `308` to `www`.

Updated, narrowly:

- **`docs/release/CI_CD_POLICY.md`** — the Vercel paragraph under "Production deployment policy" replaced with the corrected statement: Cloudflare Workers is the active deployment target; the GitHub Actions staging deployment targets Cloudflare; the Vercel Git integration is disconnected; no push to any branch including `main` deploys through Vercel; no assumption should be made that a GitHub push deploys through Vercel. The superseded statement and its DAR-048 provenance are cited, not silently deleted.
- **`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8** — a dated status-update block placed at the head of the section marking the connected-integration premise HISTORICAL, with the verification evidence, and stating precisely which downstream steps are now DONE (§8 "Consequence for Stage 2" step 2; "Before touching DNS" step 4; "Corrected operational order" step 4, which is also struck through in place).

**Deliberately left unchanged:** the 2026-09-02 finding text itself (retained as history), and everything still in force — in particular §8.2/§8.3 (do **not** delete or unlink the Vercel project; it remains the intact rollback target that §11's rollback path depends on) and the requirement for separate owner sign-off before any Git-level consolidation of the two lineages. No unrelated release policy was rewritten.

---

# PRODUCTION NON-IMPACT

| Check | Result |
| --- | --- |
| Production deploy triggered | **NO** |
| Cloudflare deploy triggered | **NO** (workflow has 0 runs) |
| Production Worker (`ahanassa-production`) touched | **NO** |
| Production D1 touched | **NO** |
| Any D1 migration applied | **NO** |
| Production target reachable from workflow inputs | **NO** |
| Vercel Production deployment created | **NO** (newest remains 31 days old) |
| `https://www.ahanassa.com/` | `200`, unchanged, served by the Cloudflare Worker |
| `https://ahanassa.com/` | `308` → `www`, unchanged |

The only Cloudflare-adjacent action in this task was **reading** `wrangler.jsonc` locally. No `wrangler` command was run against any remote resource.

---

# FIRST DEPLOY READINESS

Ready. What an operator needs for the first real staging deployment:

1. Actions → **Deploy Staging** → Run workflow.
2. Select branch **`feat/header-hero-integrated`** — required, because the `staging` environment now allows only that branch.
3. `deploy_ref` — a **full 40-character commit SHA** (current tip: `3ce18c52ef1a84311523d3bfe756139a545c8752`).
4. `confirm` — exactly `deploy-staging`.

Known preconditions and caveats, unresolved by this task:

- **D1 migrations are not run by this workflow, by design.** `migrations_public/0010_homepage_eligibility.sql` remains REMOTE PENDING and must be applied as a separate, explicit operator action if the deployed code requires it.
- The RFQ staging credential provisioning previously recorded as **BLOCKED** (commit `cf15b0b`) is unaffected by this task and remains blocked.
- The first run will exercise `npm ci` → `npm test` → `tsc --noEmit` → `npm run build` on the runner for the first time; a runner-only build failure is possible and would fail before the deploy step.

---

# NEXT STEP

**FIRST REAL GITHUB ACTIONS STAGING DEPLOY** — not authorized by this task, and not performed. It requires separate owner authorization.
