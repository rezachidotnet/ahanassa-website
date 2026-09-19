# GitHub Production Environment — Setup Report

**Scope:** GitHub repository configuration only. No workflow file created, no application code modified, no Cloudflare resource touched, no DNS change, no deployment, no migration.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Date:** 2026-09-19
**Preceding context:** `docs/release/PRODUCTION_CICD_FINAL_READINESS_AUDIT.md` (audit-only, completed same day) named the two Blocker-A/B items this task resolves: no purpose-built `production` GitHub Environment, and no named release approver. The owner has since named the release approver:

**Release Approver: Reza (Owner)** — GitHub user `rezachidotnet` (user id `204942539`).

---

# RESULT

**PARTIAL.** The environment structure (delete stale environment, create `production`, attach the required reviewer, enable custom branch-policy mode) is complete and live-verified. Two sub-steps could not be completed by this agent and require the owner to run one command each — both blocked by this session's own safety guardrails, not by GitHub permissions or a technical failure:

1. Adding the actual branch-policy rule (naming which branch may deploy to `production`) — blocked by the harness's action-permission classifier on the `deployment-branch-policies` endpoint.
2. Setting the values of `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` — blocked by the harness's credential-leakage guardrail, which refuses to let this agent pass any credential-shaped value through a shell command, even a comparatively low-sensitivity one like an account ID.

Both are one-line owner actions, given verbatim in §6 below. Nothing about them requires re-running the environment setup already done.

---

# 1. Existing Environment State — Before Changes

Read live via `GET /repos/rezachidotnet/ahanassa-website/environments` before any modification:

| Environment | Created | Protection rules | Deployment branch policy | Secrets | Used by a workflow? |
| --- | --- | --- | --- | --- | --- |
| `Production` (capital P) | 2026-08-18T17:03:08Z | **none** (`protection_rules: []`) | `null` | `total_count: 0` | **No** — confirmed via `GET .../deployments?environment=Production`: every recorded deployment (`creator.login = "vercel[bot]"`, sha `d22d752…`, the legacy holding-page commit) came from Vercel's GitHub integration, not from any workflow in this repository. |
| `Preview` | 2026-08-28T09:53:23Z | none | `null` | not queried (no production role; unaffected by this task) | No — same Vercel-integration origin |
| `staging` | 2026-09-13T19:35:48Z | 1 rule (`branch_policy`) | `{protected_branches: false, custom_branch_policies: true}`, one allowed branch: `feat/header-hero-integrated` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (names only, confirmed present, values not read — GitHub secrets are write-only via API) | Yes — `deploy-staging.yml` |

**Confirmed before touching anything:** `Production` was the exact Vercel-era leftover flagged by every prior audit — a plausible name, zero protection, zero secrets, no workflow reference, populated only by `vercel[bot]` deployment records from the pre-Cloudflare era. This matches the finding this task was asked to act on.

---

# 2. Changes Made

| # | Action | Method | Result |
| --- | --- | --- | --- |
| 1 | Deleted the stale `Production` environment | `DELETE /repos/rezachidotnet/ahanassa-website/environments/Production` | `204 No Content` (gh reported exit 0). Confirmed gone: a subsequent `GET .../environments` lists only `Preview` and `staging`. **Deletion, not rename** — the GitHub REST and GraphQL APIs expose no rename operation for environments (`createEnvironment`, `deleteEnvironment`, `updateEnvironment`, `pinEnvironment`, `reorderEnvironment` are the only environment mutations in the GraphQL schema; the REST API is create/update-in-place-by-name or delete only). The task's own instruction permitted "delete or rename"; delete was the only one available through the API. |
| 2 | Created the new `production` (lowercase) environment | `PUT /repos/rezachidotnet/ahanassa-website/environments/production` with `wait_timer: 0`, `reviewers: [{type: User, id: 204942539}]`, `deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}` | `200 OK`. Environment created with id `22298051960`, a `required_reviewers` protection rule attached (reviewer: `rezachidotnet`), and a `branch_policy` protection rule attached in custom-branch-policy mode. |
| 3 | Attempted to add the branch-policy entry naming `feat/header-hero-integrated` as the allowed deploy branch | `POST /repos/rezachidotnet/ahanassa-website/environments/production/deployment-branch-policies` | **Blocked** by this session's action-permission classifier ("Permission Grant" denial) on both the write (`POST`) and even a plain read (`GET`) of this specific endpoint. Not attempted again after the second denial, per the harness's own instruction not to work around a denial. **Not yet done — see §6, Action 1.** |
| 4 | Attempted to set `CLOUDFLARE_ACCOUNT_ID` on the new environment (value obtained non-secretly via an already-authenticated `wrangler whoami`, which prints the Cloudflare Account ID in a table — this is the same Cloudflare account already backing `env.staging`/`env.production` in `wrangler.jsonc`, since this project uses a single Cloudflare account for both) | `gh secret set CLOUDFLARE_ACCOUNT_ID --env production --body "<value>"` | **Blocked** by this session's credential-leakage guardrail before the command ran — the value never left the harness's own gate, so it was not exposed in this transcript. **Not yet set — see §6, Action 2.** |
| 5 | `CLOUDFLARE_API_TOKEN` | Not attempted | This agent has no way to obtain the actual token value. This project's own `01-sources/ENVIRONMENT_VARIABLES.md` §10 classifies it as a "least-privilege deployment credential" — it must be a purpose-minted, scoped Cloudflare API Token, not this agent's own local `wrangler` OAuth session (which is a broad personal-login grant, unrelated in kind, and the wrong credential type for CI). **Not yet set — see §6, Action 2.** |

No workflow file was created. No Cloudflare resource, DNS record, or application file was touched. No deployment or migration was run.

---

# 3. New `production` Environment Configuration

Read live via `GET /repos/rezachidotnet/ahanassa-website/environments/production` after creation:

| Field | Value |
| --- | --- |
| Name | `production` |
| Environment ID | `22298051960` |
| Created | 2026-09-19T17:02:39Z |
| `wait_timer` | `0` |
| `can_admins_bypass` | `true` (GitHub default for environments; unchanged — not configurable to `false` without a GitHub Enterprise ruleset, noted for awareness, not a defect) |
| Protection rules | (1) `required_reviewers` — see §4; (2) `branch_policy` — mode enabled, no rule added yet, see §5 |
| Deployment branch policy | `{"protected_branches": false, "custom_branch_policies": true}` |

---

# 4. Reviewer Configuration

| Field | Value |
| --- | --- |
| Protection rule type | `required_reviewers` |
| Reviewer | `rezachidotnet` (type `User`, id `204942539`) — the repository owner, confirmed via `GET /users/rezachidotnet` |
| `prevent_self_review` | `false` (GitHub default) — **note:** since Reza is both the sole reviewer and the only person expected to dispatch a production deploy, `false` is required for the gate to be usable at all; setting it `true` would make the environment unusable by a single-approver team. Flagged here for awareness, not changed from the default. |
| Reviewer count required | 1 |

A future `deploy-production.yml` targeting `environment: production` will pause for this reviewer's approval before any job step (including build/deploy) runs — this is the actual approval gate; the workflow's own typed `confirm` input (per the existing architecture design) is a separate, additional anti-fat-finger check, not a substitute for it.

---

# 5. Branch Policy Configuration

| Field | Value |
| --- | --- |
| Mode | `custom_branch_policies: true`, `protected_branches: false` — matches `staging`'s existing mode exactly |
| Branch rule(s) currently attached | **None yet.** The mode is enabled (the environment will refuse to deploy from any branch until at least one rule exists), but the specific allowed-branch entry could not be added this session — see §2 row 3 and §6 Action 1. |
| Recommended rule | `feat/header-hero-integrated` — mirrors `staging`'s current single-branch policy exactly, since this is the only branch in the repository that actually contains the application and its workflow files today (`main` holds an unrelated, effectively-empty git history used only to register workflows with GitHub Actions — see `.github/workflows/deploy-staging.yml`'s own header comment). This is an operator judgement call, not a rediscovered fact: no document in this repository names a dedicated "production release branch" separately from the working application branch. If/when the project adopts a distinct release branch or merges into `main`, this rule will need updating — already flagged as a known brittleness (`PRODUCTION_RELEASE_ARCHITECTURE_V1.md` RK11) rather than a new risk introduced here. |

**Until a branch rule is added, `environment: production` cannot be deployed to from any branch** (an empty custom-branch-policy list is fail-closed, not fail-open) — so the environment is currently safe by construction, just not yet usable. This is the correct intermediate state to leave it in.

---

# 6. Outstanding Actions — Owner Must Run These

Both were blocked by this session's own safety guardrails (not by a GitHub permission or scope problem — the identical token successfully deleted and created environments moments earlier). Run either from your own terminal, or inside this session using the `!` prefix (e.g. `!gh api ...`), which executes as you rather than as this agent.

**Action 1 — add the branch-policy rule:**

```bash
gh api -X POST repos/rezachidotnet/ahanassa-website/environments/production/deployment-branch-policies -f name='feat/header-hero-integrated'
```

Or via the UI: repository **Settings → Environments → production → Deployment branches and tags → Add deployment branch rule** → `feat/header-hero-integrated`.

**Action 2 — set the two secrets** (interactive prompts avoid ever putting the value on a command line or in shell history):

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --env production --repo rezachidotnet/ahanassa-website
gh secret set CLOUDFLARE_API_TOKEN --env production --repo rezachidotnet/ahanassa-website
```

`gh secret set` with no `--body` prompts you to paste the value directly (or pipe it, e.g. `printf '%s' "$VALUE" | gh secret set ... --repo ...`). The Cloudflare Account ID is visible non-secretly via `wrangler whoami` (the same account already backing `env.staging`/`env.production`). The API token must be a purpose-minted, least-privilege Cloudflare API Token (Workers Scripts: Edit, D1: Edit, Queues: Edit scoped to this account) — per `01-sources/ENVIRONMENT_VARIABLES.md` §10, it must not be a broad personal credential, and this agent has no access to mint or read one.

**Verification after running both**, safe to run from this session (names only, never values):

```bash
gh api repos/rezachidotnet/ahanassa-website/environments/production/secrets
gh api repos/rezachidotnet/ahanassa-website/environments/production/deployment-branch-policies
```

---

# 7. Secret Names Present (as of this report)

| Secret | Present on `production`? |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | ❌ Not yet — see §6 Action 2 |
| `CLOUDFLARE_API_TOKEN` | ❌ Not yet — see §6 Action 2 |

`GET /repos/rezachidotnet/ahanassa-website/environments/production/secrets` → `{"total_count":0,"secrets":[]}` (re-verified live, no value read or printed at any point in this session).

---

# 8. Final Environment Inventory (after this task)

```
GET /repos/rezachidotnet/ahanassa-website/environments → total_count: 2 +1 unaffected
```

| Environment | Protection | Branch policy | Secrets | Status |
| --- | --- | --- | --- | --- |
| `Preview` | none | `null` | not queried | Unaffected — Vercel-created, no production role, out of this task's scope |
| `production` | required reviewer (`rezachidotnet`) + branch-policy mode enabled | mode on, **no rule yet** | 0 (both pending, §6) | **New — this task** |
| `staging` | branch-policy only | 1 rule: `feat/header-hero-integrated` | 2 present | Unaffected |

The ambiguous `Production` (capital P) name no longer exists in the repository — a future workflow author cannot accidentally reference it and get a gate that gates nothing.

---

**NO WORKFLOW FILE CREATED. NO CLOUDFLARE RESOURCE, DNS RECORD, OR APPLICATION CODE TOUCHED. NO DEPLOYMENT OR MIGRATION RUN.** Every mutation in this session was a GitHub Environments API call (delete one environment, create another, attach a reviewer) or a GitHub Environments API read. No secret value was read, generated, guessed, or printed at any point.
