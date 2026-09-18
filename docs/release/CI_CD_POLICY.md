# CI/CD Policy (CI-CD-P1)

Canonical implementation report: `docs/release/CI_CD_P1_IMPLEMENTATION_REPORT.md`.

## Workflows

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | `push`, `pull_request`, `workflow_dispatch` | Verifies every push/PR: install, tests, typecheck, build. No deploy, no secrets. |
| `.github/workflows/deploy-staging.yml` | `workflow_dispatch` only, with a typed confirmation input | Deploys application code only to the real Cloudflare staging Worker (`env.staging`). No D1 migration. |

## Required check

Branch protection should require: **`CI / verify`**.

## No secrets in ordinary CI

`ci.yml` never receives `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` or any other deployment credential. It runs with `permissions: contents: read` only. Pull requests from any source, including forks, get the same read-only, secret-free run. This mirrors `01-sources/ENVIRONMENT_VARIABLES.md` §10 ("Build and CI-only values"): CI credentials are unavailable to runtime code, and untrusted pull requests do not receive deploy or production secrets.

## Manual staging only

`deploy-staging.yml` runs only on an explicit `workflow_dispatch`, gated by a required `confirm` input that must equal the literal string `deploy-staging` (checked in a dedicated first step that fails closed on any mismatch, before checkout or install). It targets `environment: staging` so a GitHub Environment named `staging` — if the operator configures one, with protection rules or required reviewers — is honored automatically. It is never triggered by `push` or `schedule`.

Required GitHub Actions secrets for this workflow (names only, per `01-sources/ENVIRONMENT_VARIABLES.md` §10 — canonical, not invented here):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Whether these are already configured as GitHub Actions secrets was not checked or modified by this task (no GitHub secret was read, set, or printed). If absent, the workflow fails at the deploy step with no side effect.

## Migrations are separate from application deploy

Neither workflow ever runs a D1 migration. Applying migrations against real staging or production D1 databases remains a distinct, manual operator action:

```bash
npx wrangler d1 migrations apply DB_OPS --env staging --remote
npx wrangler d1 migrations apply DB_PUBLIC --env staging --remote
```

`migrations_public/0010_homepage_eligibility.sql` is **REMOTE PENDING** — applied only to a local disposable D1 for diagnosis, never to staging or production. Neither workflow references it. STG-P0 will define the recovery point, migration inventory/order, preflight, execution, and post-migration smoke test for actually applying it remotely.

## Production deployment policy

Production deployment is not automated by either workflow, and CI-CD-P1 does not create one. Production release remains an explicit, manual, owner-approved action outside this policy's scope — see `docs/GO_LIVE_CUTOVER_RUNBOOK.md` and `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` for the existing manual production release history.

**Deployment target (corrected 2026-09-19).** Cloudflare Workers is the active deployment target for this site. GitHub Actions' staging deployment (`deploy-staging.yml`) deploys to Cloudflare, not to Vercel. **Vercel's Git integration is disconnected from this GitHub repository, so no push to any branch — `main` included — deploys anything through Vercel.**

This supersedes the earlier statement here that Vercel auto-deployed every pushed branch as a Preview with its Production target tied to `origin/main` (the 2026-09-02 finding recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-048 and `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8). That was accurate when written and is no longer true. Re-verified read-only on 2026-09-19: `vercel project inspect ahanassa-website` reports no connected Git repository, the most recent Preview deployment is 16 days old, and the most recent Production deployment is 31 days old (the legacy holding page) — an additive push to `origin/main` on 2026-09-19 produced neither. **No assumption should be made that a GitHub push deploys through Vercel.**

The live site is served by the Cloudflare Worker, not by Vercel: `https://www.ahanassa.com/` responds from the Worker and apex `ahanassa.com` still returns `308` to `www` (verified 2026-09-19).

## Recovery / rollback

Rollback and recovery-point procedures are deferred to STG-P0 for staging and remain governed by `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11 for production. This CI/CD policy does not define new rollback tooling.

## Invariant test

`lib/ci/workflow-invariants.test.ts` statically asserts (plain-text checks on the workflow YAML, not a YAML parser): `ci.yml` never deploys or runs a remote D1 migration and never receives Cloudflare deploy credentials; `deploy-staging.yml` is `workflow_dispatch`-only, requires the typed confirmation, never applies a migration, and never targets production; no workflow in the repository deploys `--env production`. Runs as part of the ordinary `npm test` suite.
