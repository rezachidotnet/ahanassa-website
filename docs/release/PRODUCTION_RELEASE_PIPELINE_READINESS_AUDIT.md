# Production Release Pipeline Readiness Audit

**Scope:** Audit only. No code, workflow, secret, Cloudflare setting, DNS record, or production resource was modified.
**Repository:** `rezachidotnet/ahanassa-website` (public, owner type User)
**Branch at audit time:** `feat/header-hero-integrated`, HEAD `96f79cf6f2b0a2a677ad3837b3b1cd1d2c3abded`
**Date:** 2026-09-19
**Method:** Direct inspection of `.github/workflows/`, `wrangler.jsonc`, `workers/entry.ts`, `lib/ci/`, `migrations*/`, `package.json`, and the `docs/release/` + `docs/CICD_*` + `docs/GO_LIVE_*` evidence trail — plus **live read-only verification** via the GitHub REST API (workflows, runs, environments, secret names, branch protection), `dig`, and `curl -I` against both public hostnames. No write of any kind was issued to GitHub, Cloudflare, or DNS.

**One read was blocked:** this session's sandbox denies production reads, so `wrangler d1 migrations list … --env production` and `wrangler versions list --env production` could not be executed directly. Production Worker version and D1 migration state below are therefore taken from the dated, first-hand `docs/CICD_STAGING_FIRST_GITHUB_ACTIONS_DEPLOY_REPORT.md` baseline (2026-09-19, same day) and are labelled as documented-not-re-verified wherever that is the case. Everything else below was verified live in this session.

---

# RESULT

**Staging is a genuine, working, exact-SHA release pipeline. Production has no pipeline at all.**

The staging path is better than its own documentation claims: `workflow_dispatch` → typed confirmation → explicit `deploy_ref` checkout → fail-closed target assertion → tests → typecheck → build → deploy, proven twice on 2026-09-19 with both runs green. The exact-SHA model is real and demonstrated.

Production, by contrast, has **no workflow, no environment gate, no approval reviewer, no promotion step, and no automated path of any kind**. Every production release to date has been a manual `wrangler` invocation from an operator's own terminal. This is a deliberate, documented policy decision (`docs/release/CI_CD_POLICY.md`, "Production deployment policy") rather than an oversight — but it means the promotion chain in the audit brief stops dead after the staging stage.

Three findings materially raise the risk of the next production release, and none of them is recorded in the existing release docs as an open item:

1. **Production D1 is five migrations behind the tested staging schema** — `DB_PUBLIC` 0007–0010 and `DB_OPS` 0005 are all unapplied. Current application code queries tables that do not exist in production.
2. **The apex `ahanassa.com` is still served by Vercel**, not Cloudflare — verified live this session (`server: Vercel`, `x-vercel-id`, Vercel anycast A records). The apex→www redirect is an external dependency on a project the docs simultaneously describe as the rollback target.
3. **Zero git tags exist.** The cutover runbook's rollback design depends on tagging the deployed commit; that step has never been performed, so production releases are traceable only through hand-copied Worker version IDs.

---

# STAGING_PIPELINE

**Status: IMPLEMENTED, HARDENED, AND PROVEN IN PRODUCTION USE (of the staging target).**

## Workflows present

Live-verified via `GET /repos/…/actions/workflows` — exactly two, both `state: active`:

| Workflow | ID | File | Trigger |
| --- | --- | --- | --- |
| `CI` | `357303552` | `.github/workflows/ci.yml` | `push`, `pull_request`, `workflow_dispatch` — **no branch filter anywhere** |
| `Deploy Staging` | `361701517` | `.github/workflows/deploy-staging.yml` | `workflow_dispatch` **only** |

## `ci.yml` — verification only

`permissions: contents: read`. Receives **no** Cloudflare credential. Concurrency grouped per workflow+ref with `cancel-in-progress: true`. Steps: checkout → `actions/setup-node@v4` (Node 24, npm cache) → `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build`. It performs no deploy and touches no remote D1.

## `deploy-staging.yml` — the real release path

| Control | Implementation |
| --- | --- |
| Trigger | `workflow_dispatch` only — never `push`, never `schedule` |
| Input `deploy_ref` | `required: true`, `type: string`, **deliberately no default** (a mutable branch default would undercut the exact-SHA intent) |
| Input `confirm` | must equal the literal `deploy-staging`; checked in step 1, **before checkout** |
| Empty-ref guard | whitespace-stripped emptiness check, fails closed |
| Checkout | `ref: ${{ inputs.deploy_ref }}` with `persist-credentials: false` |
| SHA resolution | `git rev-parse HEAD` + `git cat-file -e <sha>^{commit}`; fails before build if the ref does not resolve |
| Target assertion | inline fail-closed Node script, **before `setup-node`/`npm ci`/`build`** |
| Concurrency | `group: deploy-staging`, `cancel-in-progress: false` |
| Permissions | `contents: read` |
| Environment | `environment: staging` |
| Deploy command | `npx vinext-cloudflare deploy --env staging` |
| D1 migration | **none — deliberately absent** |

**The target assertion is the strongest control in the pipeline.** It is written inline in the workflow file rather than checked out from the repository, precisely because GitHub executes the workflow from the *dispatch* ref while `wrangler.jsonc` arrives from the *untrusted* `deploy_ref`. It parses JSONC and requires all of: `env.staging.name === ahanassa-bootstrap-staging`; both D1 bindings matching pinned `database_name` **and** `database_id`; exactly those two bindings and no others; `vars.APP_ENV === "staging"`; and a recursive literal-free scan rejecting any string or key anywhere under `env.staging` that names the live environment. It was validated against eight cases including a `git archive origin/main` tree, which correctly fails with "this ref does not contain the application."

**No Cloudflare target is an operator input.** Environment, Worker name and D1 identities are fixed in repository configuration; `workflow_dispatch` exposes only `deploy_ref` and `confirm`.

## Environment and secrets — live-verified

`GET /repos/…/environments` returns three:

| Environment | Protection rules | Branch policy | Used by a workflow? |
| --- | --- | --- | --- |
| `staging` | **1** — `branch_policy` only | `custom_branch_policies: true`, `protected_branches: false`; exactly one allowed branch: `feat/header-hero-integrated` | Yes — `deploy-staging.yml` |
| `Preview` | **none** | `null` | No — Vercel-created leftover |
| `Production` | **none** | `null` | **No — Vercel-created leftover, not a release control** |

`GET /repos/…/environments/staging/secrets` → `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (names only; no value read). Both are **environment-scoped**, so a job that fails the environment gate never receives them.

`GET /repos/…/actions/secrets` → **empty**. There are no repository-level Actions secrets at all, which is the correct posture for a public repository.

## Execution evidence — live-verified

`GET /repos/…/actions/runs` confirms two real staging deployments, both `workflow_dispatch`, both `success`:

| Run | `deploy_ref` deployed | Resulting staging Worker version | Time |
| --- | --- | --- | --- |
| `35426318953` | `3ce18c52ef1a84311523d3bfe756139a545c8752` | `9817456d-690d-4e46-a008-3817a130f41c` | 2026-09-19T06:20Z, 71 s |
| `35428823679` | `c9c641ce5f8e8653ba1396417687823916db01fb` | `6e79335c-1add-438b-8301-fa048feb3367` | 2026-09-19T07:15Z |

Seven `CI` runs also appear, all `success`, all on `feat/header-hero-integrated`. The staging Worker is live: `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev/` returned **200** in this session.

## Static invariant enforcement

`lib/ci/workflow-invariants.test.ts` runs inside `npm test` and asserts eleven properties by plain-text inspection of the workflow YAML, including: CI never deploys or migrates and never receives Cloudflare credentials; the staging workflow is dispatch-only, requires the typed confirmation, requires an explicit `deploy_ref` and checks out that ref, records `DEPLOYED_SHA`, asserts its target before `npm ci`/`build`/`deploy`, and accepts no Cloudflare target as input; and — the key one — **`no workflow in this repository auto-deploys production`**. Two of these were mutation-tested (removing the ref line and deleting the assertion step each turn the suite red).

---

# PRODUCTION_PIPELINE

**Status: NOT IMPLEMENTED.**

There is no production workflow file, no production job, no production environment gate wired to Actions, and no production deployment has ever been made through GitHub Actions. This is asserted three independent ways: by direct filesystem inspection of `.github/workflows/` (two files, neither production); by the live workflow listing above; and by a static test that fails the build if any workflow ever deploys `--env production`.

**How production actually gets deployed today** — manually, from an operator's terminal, per `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` and `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §2:

```bash
rm -rf dist
CLOUDFLARE_ENV=production npx vinext build
npx wrangler versions upload --config dist/server/wrangler.json --message "Cutover: <commit sha>"
npx wrangler versions deploy <version-id>@100 --config dist/server/wrangler.json
```

The `CLOUDFLARE_ENV=production` env-flattening step and the `versions upload` → `versions deploy` split are both load-bearing and easy to get wrong: a `versions upload` alone does **not** apply cron trigger changes (documented at `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:111`, and re-confirmed in the 2026-09-19 staging cron work). None of this is encoded anywhere a machine enforces it.

The current production Worker version is `b07d8697-620c-485c-8fed-21b893ab602c`, created **2026-09-03T19:00:48Z** — sixteen days stale relative to the staging Worker, and predating every commit in the current CI/CD work (documented baseline; not re-verified live this session, see the sandbox note above).

---

# EXACT_SHA_PROMOTION

**Staging: YES, implemented and demonstrated. Production: NO mechanism exists.**

## What works

The staging workflow deliberately separates two refs that most pipelines conflate:

```text
github.ref   = the dispatch branch  → the source of the WORKFLOW FILE
deploy_ref   = the input SHA        → the source of the APPLICATION
```

Run `35426318953` shows the split working exactly as designed: `head_sha` was `c486e49…` (the dispatch ref) while the deployed commit was `3ce18c5…` (the `deploy_ref` input), with three independent log confirmations of equality between requested ref and resolved SHA. A moved branch cannot change what gets deployed.

## What is missing

1. **No production equivalent.** The exact-SHA model exists only for staging. Promoting a staging-verified SHA to production requires a human to retype it into a local `wrangler` command with no assertion that it is the same SHA that passed staging.
2. **No artifact promotion — each deploy rebuilds from source.** The staging workflow builds on the runner and deploys that build; a future production deploy would build again, separately. The bytes verified on staging are never the bytes shipped to production. In practice `npm ci` honours `package-lock.json`, so a rebuild from the same SHA is reproducible today — but see the `"latest"` dependency risk under BLOCKERS, which makes that guarantee fragile over time rather than structural.
3. **No release identity.** `git tag` returns **zero tags**. `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §1 explicitly instructs tagging the deployed commit "so the rollback commands in §11 have an unambiguous target — not done automatically by this runbook; a human step at cutover time." That human step has never been taken, for any release.

---

# APPROVAL_GATE

**Status: NONE. No approval gate exists anywhere in this repository's release path — staging or production.**

Verified live against the GitHub API:

| Control | State |
| --- | --- |
| Required reviewers on `staging` | **None.** Its only protection rule is `branch_policy` (a branch restriction, not an approval) |
| Wait timer on `staging` | None |
| Required reviewers on `Production` env | None — and no workflow references it; it is a Vercel artefact |
| Branch protection on `main` | **None** — `GET /branches/main/protection` → `404 Branch not protected` |
| Required status checks | None configured. `docs/release/CI_CD_POLICY.md` recommends requiring `CI / verify`; it has not been applied |

**What actually stands between an operator and a staging deployment** is therefore: (a) the typed `deploy-staging` confirmation string, (b) the `staging` environment's single-branch policy, and (c) the workflow's own fail-closed target assertion. Those are meaningful *safety* controls — they make it very hard to hit the wrong target — but none of them is an *approval*: any actor who can dispatch a workflow can complete a staging deployment unilaterally.

For production there is not even that: the gate is entirely social, consisting of the documented policy that production release is "an explicit, manual, owner-approved action."

A structural note worth flagging: the `staging` environment's branch policy names exactly one branch, `feat/header-hero-integrated`. That is tight and correct today, and it will silently block the first deployment from any successor branch until someone remembers to update the policy.

---

# ROLLBACK_READY

**Status: PARTIAL — the Worker-level mechanism is real and available; release identity, database rollback, and an executed production recovery point are all missing.**

## Worker version rollback — available

Cloudflare retains prior Worker versions, and the documented commands exist (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §22, `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11):

```bash
npx wrangler rollback --config dist/server/wrangler.json            # immediately-prior version
npx wrangler versions deploy <previous-version-id>@100 --config dist/server/wrangler.json
npx wrangler rollback --name ahanassa-bootstrap-staging             # staging equivalent
```

| Environment | Current version | Prior version (rollback target) |
| --- | --- | --- |
| Staging | `6e79335c-1add-438b-8301-fa048feb3367` (2026-09-19T07:16Z) | `9817456d-690d-4e46-a008-3817a130f41c` (2026-09-19T06:21Z) |
| Production | `b07d8697-620c-485c-8fed-21b893ab602c` (2026-09-03T19:00Z) | `1ba5dadb-…`, `878a1e82-…`, `cbbf0344-…`, `885a473e-…` all recorded in Stage-1 history |

Rollback is **manual in every environment** — no workflow performs it, and no workflow captures the prior version ID automatically. The staging workflow records `DEPLOYED_SHA` but not the pre-deploy version ID; each report has captured that by hand.

## Database rollback — NOT AVAILABLE as an automated path

- **No down-migrations exist anywhere.** The project's established convention is forward-only: "write a new forward migration to fix a mistake, never a reverse-apply script" (`docs/release/STG_P0_…` §MIGRATION 0010). Migration `0010` is explicitly classified `REVERSIBLE: PARTIAL`.
- **Worker rollback does not roll back D1** — stated directly in `01-sources/DEPLOYMENT_ARCHITECTURE.md` §12 and repeated in STG-P0.
- The real recovery mechanism is **Cloudflare D1 Time Travel**, which is documented and zero-invention — but the bookmark must be captured *before* a migration, and **no production bookmark has ever been captured**. STG-P0 prescribes `wrangler d1 time-travel info DB_PUBLIC --env staging` "(and the production equivalent, when production's turn comes)"; production's turn has not come.
- Mitigating factor, genuinely verified rather than assumed: all five pending migrations are pure `CREATE TABLE` / nullable-or-defaulted `ADD COLUMN`, each individually read and confirmed additive and backward-compatible with the currently-live older Worker. A Worker rollback *after* applying them is therefore safe — the old code simply never queries the new tables.

## DNS-level rollback — available but depends on Vercel

`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11 designates DNS reversion to Vercel as the *primary* rollback path, and §8.2/§8.3 remain in force: do **not** delete or unlink the Vercel project, it is the intact rollback target. This is still true, and is reinforced by a finding below — the apex hostname is not merely a rollback target, it is a *live serving dependency* today.

## Release identity — missing

With zero tags and no artifact registry, the only durable link between "what was tested" and "what is deployed" is a 40-character SHA and a Worker version UUID, transcribed by hand into Markdown reports. That has worked so far because each release has been accompanied by a meticulous report; it does not scale and it is not machine-checkable.

---

# DOMAIN_STATUS

**Live-verified in this session by `dig` and `curl -I`.**

| Item | Finding |
| --- | --- |
| DNS provider / nameservers | **Cloudflare** — `coraline.ns.cloudflare.com`, `micah.ns.cloudflare.com` |
| `www.ahanassa.com` | **200, served by the Cloudflare Worker.** `server: cloudflare`; `X-Vinext-*` vary headers confirm the vinext runtime; resolves to `188.114.97.3` / `188.114.96.3` (Cloudflare anycast, proxied) |
| `ahanassa.com` (apex) | **308 → `https://www.ahanassa.com/`, but served by Vercel.** `server: Vercel`, `x-vercel-id: fra1::…`; resolves to `216.198.79.1` / `64.29.17.1` (Vercel anycast, DNS-only / unproxied) |
| Worker custom domain | `wrangler.jsonc` `env.production.routes` declares exactly `[{ "pattern": "www.ahanassa.com", "custom_domain": true }]`. Apex is deliberately **not** listed |
| Security headers on `www` | Present and correct — CSP (report-only), `permissions-policy`, `referrer-policy`, `x-content-type-options: nosniff`, `x-frame-options: DENY` |
| `robots.txt` on `www` | `User-Agent: *` / `Allow: /` / `Disallow: /api/` / `Sitemap: https://www.ahanassa.com/sitemap.xml` — the production branch of the robots logic is live |
| Staging Worker | `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev/` → 200 |

**The material finding: the apex redirect is a Vercel dependency.** `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §7 records the apex→www redirect as unexecuted, blocked on Cloudflare zone write access — Cloudflare Redirect Rules are outside every `wrangler` subcommand. That is still exactly the state today. Since the runbook simultaneously designates the Vercel project as the rollback target that must not be deleted, the current arrangement is coherent — but it means apex availability is coupled to a Vercel project the team otherwise considers decommissioned, and the eventual §8.3 "formally remove the Vercel domain association" step would break the apex unless a Cloudflare redirect rule is configured first.

**Stale configuration comment.** The `env.production` block in `wrangler.jsonc` still carries a long comment asserting that "no production Worker has been deployed … `ahanassa.com`/`www.ahanassa.com` remain unchanged, still served by the legacy Vercel deployment." That was true when written and is now false for `www` — contradicted by the `routes` array eleven lines below it in the same block, and by this session's live check. Documentation drift in the most safety-critical config file in the repository.

---

# CLOUDFLARE ARCHITECTURE — STAGING vs PRODUCTION

| | **Staging** | **Production** |
| --- | --- | --- |
| Worker name | `ahanassa-bootstrap-staging` | `ahanassa-production` |
| `DB_OPS` | `ahanassa-ops-staging` · `49bd0aff-e289-4fff-b7b9-0f4b517e6b14` · default placement | `ahanassa-ops-production` · `7240a6a7-c293-4e6e-baf3-95838a3c2944` · **EU jurisdiction** |
| `DB_PUBLIC` | `ahanassa-public-staging` · `35cef70f-3ad3-4049-add4-ddcac6cac45b` · default placement | `ahanassa-public-production` · `73ba6b50-ef57-4d89-baa9-617a0b0af127` · **EU jurisdiction** |
| Queues | `ahanassa-odoo-sync-staging` + `-dlq`, `max_retries: 5` | `ahanassa-odoo-sync-production` + `-dlq`, `max_retries: 5` |
| Rate limiter | `RFQ_RATE_LIMITER`, ns `1002`, 5/60s | `RFQ_RATE_LIMITER`, ns `2001`, 5/60s |
| `workers_dev` | **not declared** — DAR-050 regression class remains latent | `true` (explicit, permanent) |
| Routes | none | `www.ahanassa.com` custom domain |
| Cron triggers | **1** — `0 */3 * * *` | **3** — `*/5 * * * *`, `0 */3 * * *`, `30 2 * * *` |
| `APP_ENV` | `staging` | `production` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **absent** | `0x4AAAAAAEi2RZ3NHcqTk0ej` |
| `PRICE_STRIP_ENABLED` | `"false"` | `"false"` |
| `ENABLED_PRICE_PROVIDERS` | `""` | `""` |
| `HOMEPAGE_RANKING_MODE` | `"base"` | `"base"` |
| `ODOO_BASE_URL` / `ODOO_DATABASE` / `ODOO_CRM_TEAM_ID` | `https://odoo.ahanassa.com` / `ahanassa` / `1` | identical |
| `TURNSTILE_SECRET_KEY` secret | **absent** | provisioned |
| `ODOO_RFQ_API_TOKEN` secret | **absent** | provisioned |
| Active version | `6e79335c-…` (2026-09-19T07:16Z) | `b07d8697-…` (2026-09-03T19:00Z) |

**Cron cap accounting:** the account is on the Workers Free plan with a **5-trigger cap across the whole account**. Production holds 3, staging now holds 1 → **4 of 5 used**. This cap has already caused one real incident (DAR-053, 2026-09-03), which is why staging sat at zero triggers for sixteen days. Any future trigger addition — including a price-sync trigger — must be budgeted against the remaining single slot.

**Cron asymmetry is a testing gap, not just a difference.** Staging runs only the every-3-hours branch, which `workers/entry.ts#scheduled()` routes to catalog-incremental + Processing sync. The RFQ outbox sweep (`*/5 * * * *`) and the full catalog reconciliation (`30 2 * * *`) **have no staging exercise path at all** — they can only ever be observed for the first time in production.

---

# DEPLOYMENT MODEL

Against the four options in the audit brief:

| Environment | Model | Evidence |
| --- | --- | --- |
| **Staging** | **C) workflow dispatch** | `workflow_dispatch`-only trigger, required `deploy_ref` + typed `confirm`, two successful real runs |
| **Production** | **D) not implemented** | No workflow exists; enforced by a static test; releases are manual local `wrangler` invocations |

Explicitly **not** the case, each verified rather than assumed:

- **Not (A) automatic on push.** No workflow deploys on `push`. And the previously-documented second path is gone: Vercel's Git integration is **disconnected**, re-verified read-only on 2026-09-19 — `vercel project inspect` reports no connected repository, and an actual additive push to `origin/main` that day produced no Vercel deployment of any kind. A push to any branch, `main` included, deploys nothing.
- **Not (B) manual approval.** No environment in the repository has required reviewers.

---

# PROMOTION STRATEGY

Measured against the chain in the brief:

```text
Feature branch          ✅  feat/header-hero-integrated; CI runs on every push (7 green runs)
        │
Staging deployment      ✅  workflow_dispatch, exact SHA, target-asserted, 2 successful runs
        │
Tests / Smoke checks    ⚠️  tests AUTOMATED in-workflow (npm test 1334 · tsc --noEmit · build)
                            smoke checks MANUAL — no post-deploy verification step exists
                            in any workflow; every smoke table in the reports was curl'd by hand
        │
Production promotion    ❌  NOT IMPLEMENTED — no workflow, no gate, no promotion step
```

**Can production deploy an exact tested SHA?** Not through any implemented mechanism. The *capability* is proven — the staging workflow demonstrates the exact pattern that a production workflow would use, and it is the right pattern. But today the answer to "what SHA is production running?" is `b07d8697-…`'s build, whose source commit is recorded only in prose in a Stage-1 report.

**Additional structural obstacle: the two Git histories are unrelated.** `git merge-base origin/main feat/header-hero-integrated` returns no merge base. `origin/main` is the 16-file legacy holding page plus one added workflow file — it does not contain the application (`wrangler.jsonc` is absent, which the target assertion correctly detects). Consequences: no PR-based promotion into `main` is possible without a deliberate, separately-authorized history consolidation; `ci.yml` does not exist on `main`, so a required-status-check rule on `main` would have nothing to require; and `main` is not a meaningful release branch today.

---

# BLOCKERS

Ordered by what would actually bite first on a production release. Nothing was changed; these are findings for the owner's decision.

### B1 — Production D1 is five migrations behind the tested staging schema — **CRITICAL**

| Database | Repository has | Production applied | Pending |
| --- | --- | --- | --- |
| `DB_PUBLIC` | `0001`–`0010` | **6**, latest `0006_route_redirects_308.sql` (2026-09-03) | `0007_processing_groups`, `0008_price_variant_identity_and_provider_policy`, `0009_catalog_group_labels`, `0010_homepage_eligibility` |
| `DB_OPS` | `0001`–`0005` | **4**, latest `0004_rfq_contacts_phone_iso2.sql` | `0005_rfq_length_mm` |

Staging has all ten and all five respectively. Deploying current application code to production today would run `app/[locale]/layout.tsx` → `listPublicProcessingGroups()` against a non-existent `public_processing_groups`, and the homepage projection against a missing `show_on_homepage` column. The per-section failure isolation in the code means this would likely degrade rather than 500 — but it would ship visibly broken surfaces. **The `DB_OPS` 0005 gap appears to be undocumented:** every release doc discusses the `DB_PUBLIC` 0007–0010 gap, and I found no document that records `0005_rfq_length_mm` as pending on production.

Compounding this: **no workflow applies migrations**, by design. So production migration remains a manual `wrangler d1 migrations apply … --env production --remote` with no preflight, no bookmark capture, and no automated verification.

### B2 — No production deployment workflow, and no approval gate anywhere — **CRITICAL for release control**

No production workflow exists; no environment in the repository carries required reviewers; `main` has no branch protection; no required status check is configured. The only production control is documentary. Note also that the GitHub `Production` environment that *does* exist is a Vercel leftover with zero protection rules — it is currently a trap rather than a control, since a future workflow author could reference `environment: Production` and get a gate that gates nothing.

### B3 — Apex `ahanassa.com` still served by Vercel — **HIGH**

Verified live this session. The apex→www 308 comes from Vercel, on Vercel anycast IPs, DNS-only. The runbook records this as blocked on Cloudflare zone write access, which is a permissions issue, not a defect. The risk is coupling: the §8.3 plan to eventually remove the Vercel domain association would break the apex unless a Cloudflare Redirect Rule is configured first, and the apex is a real SEO and user-facing surface.

### B4 — No release identity: zero git tags — **HIGH**

`git tag` → 0. The cutover runbook's own §1 requires tagging the deployed commit so §11's rollback has an unambiguous target. Every release so far is traceable only through hand-transcribed SHAs and Worker version UUIDs in Markdown.

### B5 — No automated post-deploy verification — **HIGH**

Neither workflow performs any smoke check after deploying. All smoke evidence in `docs/CICD_*` was gathered manually with `curl`. A staging deploy that builds and uploads successfully but serves 500s would be reported as `success` by GitHub Actions. A production workflow inheriting this shape would have the same blind spot at far higher cost.

### B6 — No production D1 recovery point has ever been captured — **HIGH**

D1 Time Travel is the documented mechanism and requires a bookmark captured *before* the change. STG-P0 defines the procedure and explicitly defers the production instance. With five migrations pending and no down-migrations in the repository, the next production migration would be executed with no recorded restore point.

### B7 — RFQ path cannot be end-to-end tested on staging — **MEDIUM-HIGH**

Staging lacks `TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN`, and even the public `NEXT_PUBLIC_TURNSTILE_SITE_KEY` var. `docs/POST_P3F_PHASE4_STAGING_RFQ_CREDENTIAL_PROVISIONING_REPORT.md` records this as `BLOCKED — CREDENTIAL_SOURCE_MISSING` for a substantive reason: the Odoo RFQ API has exactly one global Bearer token with no staging/production scoping, so provisioning a "staging" credential would grant the staging Worker real production RFQ-write access. That is a genuine owner decision, not an oversight — but its consequence is that the site's single most important conversion path is verified on staging by form-presence only, and its full behaviour can first be exercised only in production.

### B8 — Staging environment branch policy is pinned to one named branch — **MEDIUM**

`feat/header-hero-integrated` is the sole allowed branch. Correct and tight today; it will silently block the first deploy from any successor branch, and the failure mode (no secrets delivered, gate rejection) is not obviously diagnosable from the workflow logs.

### B9 — `package.json` pins twelve dependencies to `"latest"` — **MEDIUM**

`vinext`, `@vinext/cloudflare`, `react`, `react-dom`, `vite`, `typescript`, `tailwindcss` and others are declared as `"latest"`. `npm ci` honours `package-lock.json`, so builds are reproducible **today** and the exact-SHA guarantee holds. But any future `npm install` silently drifts every one of them simultaneously, including the framework and the Cloudflare adapter. For a repository whose release model depends on rebuilding the same SHA identically, this is the weakest link in that guarantee.

### B10 — Staging does not declare `workers_dev` — **MEDIUM**

`env.production` sets `"workers_dev": true` explicitly, added specifically to fix the 2026-09-02 regression (DAR-050) where a deploy silently disabled the `workers.dev` endpoint. `env.staging` still omits it. The 2026-09-19 deploy report flags that this was a live risk that happened not to bite. Staging's `workers.dev` URL is the only way to reach it, so the blast radius is total loss of staging access.

### B11 — Cron coverage asymmetry and a near-exhausted cap — **MEDIUM**

Staging exercises 1 of production's 3 triggers; the RFQ outbox sweep and full reconciliation have no staging rehearsal path. The account sits at 4 of 5 triggers, so closing that gap is not simply a config edit.

### B12 — Configuration and documentation drift — **LOW, but in safety-critical files**

Three concrete instances found: the `env.production` comment in `wrangler.jsonc` asserting production is un-deployed and Vercel-served (contradicted by the `routes` block below it and by live HTTP); `docs/release/CI_CD_POLICY.md` describing `0010` as REMOTE PENDING without noting it applies to production only, since staging applied it on 2026-09-13; and `docs/AHANASSA_CICD_SERVICES_CURRENT_STATE_RECOVERY_AUDIT.md` (untracked, dated 2026-09-18) stating the staging workflow "cannot currently be dispatched" and that Vercel auto-deploys `main` — both overtaken by events on 2026-09-19 and now actively misleading if read in isolation.

---

# RECOMMENDED_NEXT_PHASE

Sequenced so each step is independently authorizable and no step depends on an unfinished one. **None of this was performed.**

## Phase R1 — Close the production data gap before anything else (B1, B6)

Production cannot receive current code until its schema matches what staging tested. In order:

1. Capture D1 Time Travel bookmarks: `wrangler d1 time-travel info DB_PUBLIC --env production` and the same for `DB_OPS` (both read-only).
2. Record the current production Worker version as the application rollback point.
3. Apply `DB_PUBLIC` `0007`→`0010` and `DB_OPS` `0005` — all five verified additive and backward-compatible, so they are safe to apply *ahead* of the code deploy, and the currently-live older Worker tolerates their presence.
4. Verify with `migrations list` → `No migrations to apply!`, and confirm the new tables exist by direct `SELECT`.
5. Record all of it in a dated report, matching the established convention.

## Phase R2 — Author `deploy-production.yml` as a near-clone of the staging workflow (B2, B5)

The staging workflow is a good design; the production one should differ in exactly four ways:

- `environment: production` — a **new, purpose-built** GitHub Environment with **required reviewers**, not the Vercel-leftover `Production`. Consider renaming or deleting the leftover first so it cannot be referenced by accident.
- A production target assertion mirroring the staging one, pinning `ahanassa-production`, both production D1 ids, `APP_ENV === "production"`, and the `www.ahanassa.com` route — inline in the workflow file, for the same untrusted-checkout reason.
- Typed confirmation string `deploy-production`.
- **A post-deploy smoke step inside the workflow** that fails the run on any non-2xx across a fixed route list — closing B5 for both environments if backported to staging.

Keep unchanged: `workflow_dispatch`-only, required `deploy_ref` with no default, explicit checkout of that ref, `DEPLOYED_SHA` recording, `permissions: contents: read`, environment-scoped secrets, and **no migration step**.

## Phase R3 — Establish release identity (B4)

Tag every deployed commit (`release/prod-YYYY-MM-DD-<short-sha>` or similar) and have the production workflow print the tag, the SHA, the resulting Worker version ID, and the prior Worker version ID into the job summary. That single step converts rollback from archaeology into a lookup.

## Phase R4 — Resolve the apex (B3)

Configure a Cloudflare Redirect Rule for `ahanassa.com` → `https://www.ahanassa.com` and move the apex off Vercel. This needs Cloudflare zone write access, which is the actual blocker and an owner/permissions action rather than an engineering one. Do this **before** any step that removes the Vercel domain association.

## Phase R5 — Harden what exists (B8–B12)

Each is small and independent: pin `package.json` to concrete versions; add `"workers_dev": true` to `env.staging`; replace the single-branch staging policy with something that survives a branch rename; apply `CI / verify` as a required check once a meaningful protected branch exists; and correct the three documented drift instances in B12.

## Deliberately excluded

**The RFQ credential question (B7) is not an engineering decision and should not be bundled into pipeline work.** Whether to grant staging a token that carries real production RFQ-write access is an owner call about data and blast radius. The honest alternative — asking for a scoped staging credential on the Odoo side — is upstream work. Either way, it should be decided on its own merits rather than resolved implicitly to unblock a release.

---

**NO CODE CHANGES.** This audit created exactly one new file — this report. No workflow, secret, environment, Cloudflare resource, DNS record, migration, or production resource was modified. Every remote call issued was a read: GitHub REST `GET`s, `dig`, and `curl -I`/`curl` against public hostnames.
