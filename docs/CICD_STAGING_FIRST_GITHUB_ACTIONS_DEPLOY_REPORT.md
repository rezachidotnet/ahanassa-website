# CI/CD — First Real GitHub Actions Staging Deployment

**Date:** 2026-09-19 (Asia/Tehran). All timestamps below are UTC.
**Repository:** `rezachidotnet/ahanassa-website`
**Workflow:** `Deploy Staging` (`.github/workflows/deploy-staging.yml`), ID `361701517`
**Run:** `35426318953` — https://github.com/rezachidotnet/ahanassa-website/actions/runs/35426318953

---

# RESULT

**PASS.**

The first real staging deployment through GitHub Actions completed successfully in 71 seconds. The exact authorized immutable SHA was deployed, every gate passed, the staging Worker advanced to a new version, all smoke tests are green, and production is byte-for-byte unchanged.

---

# AUTHORIZATION

| Item | Value |
| --- | --- |
| Authorized target | STAGING ONLY |
| Authorized Worker | `ahanassa-bootstrap-staging` |
| Authorized deploy ref | `3ce18c52ef1a84311523d3bfe756139a545c8752` |
| Production deployment | NOT AUTHORIZED — not performed |

Nothing outside that envelope was touched. No workflow code, no environment policy, no DNS, no routes, no Odoo write, no production migration, no force push, no history merge.

---

# PREFLIGHT

All checks passed; nothing was modified during preflight.

| Check | Result |
| --- | --- |
| `3ce18c5…` exists remotely | Yes — ancestor of `origin/feat/header-hero-integrated` |
| Contained in | `origin/feat/header-hero-integrated` only |
| `.github/workflows/deploy-staging.yml` at that SHA | present |
| `wrangler.jsonc`, `package.json`, `package-lock.json`, `tsconfig.json` | all present |
| Workflow `361701517` | `Deploy Staging`, state `active` |
| Runs before this task | 0 |
| `workflow_dispatch` | available, inputs `deploy_ref` + `confirm` |
| `staging` environment | `custom_branch_policies: true`, one allowed branch: `feat/header-hero-integrated` |
| Environment secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (environment-scoped) |
| Workflow blob on `main` / deploy ref / branch tip | identical — `fe8c14cfe1cebe984582da5be106faf1b0030c9c` |

**Deviation from the task brief — dispatch ref.** The brief said to dispatch "against the registered workflow on main as required by GitHub". That premise does not hold here, on two counts:

1. GitHub requires the workflow file on the **default branch to register/index** it — already done in the previous task. The *dispatch* ref may be any branch containing the file.
2. The `staging` environment's branch policy (configured in the previous task, and which this task explicitly forbids changing) allows **only** `feat/header-hero-integrated`. A dispatch from `main` would have been rejected at the environment gate, received no secrets, and failed.

The run was therefore dispatched against `feat/header-hero-integrated`. This is safe and equivalent: the workflow blob is byte-identical on `main`, on the branch tip, and at the deploy SHA, so the same hardened logic executed — and `deploy_ref` still pinned the exact commit independently of the dispatch ref.

## Deploy-ref safety re-assertion

The staging resource assertion was extracted **from the workflow file as it exists at `3ce18c5…`** and executed against the tree at `3ce18c5…` (`git archive`), before dispatch:

```
Staging resource assertion PASSED.
  worker    : ahanassa-bootstrap-staging
  DB_OPS    : ahanassa-ops-staging
  DB_PUBLIC : ahanassa-public-staging
  APP_ENV   : staging
  live-environment identifiers inside env.staging: none
```

Production Worker and D1 identities are not reachable through the staging deploy path: the Cloudflare environment, Worker name and D1 identities are fixed in `wrangler.jsonc` and are not workflow inputs.

---

# BASELINE

Recorded before dispatch, for before/after comparison only.

| Resource | Baseline |
| --- | --- |
| Staging Worker active version | `b125a448-96ec-4c03-b71e-d69113f9e5c1` (created 2026-09-13T21:08:20.025Z) |
| Staging `DB_OPS` migrations | no migrations to apply |
| Staging `DB_PUBLIC` migrations | no migrations to apply — 10 applied, latest `0010_homepage_eligibility.sql` (2026-09-13 19:44:12) |
| Production Worker active version | `b07d8697-620c-485c-8fed-21b893ab602c` (created 2026-09-03T19:00:48.218Z) |
| Production `DB_PUBLIC` | 6 applied, latest `0006_route_redirects_308.sql`, last 2026-09-03 18:59:03 |
| Production `DB_OPS` | 4 applied, latest `0004_rfq_contacts_phone_iso2.sql` |

Production was read with plain `SELECT` statements only (`d1 execute --command "SELECT …"`), deliberately **not** `d1 migrations list`, which can initialise the migrations table as a side effect.

**Correction to existing documentation:** `docs/release/CI_CD_POLICY.md` describes `migrations_public/0010_homepage_eligibility.sql` as REMOTE PENDING. That is true of **production** (which stops at 0006) but **not of staging**, where 0010 was applied on 2026-09-13 19:44:12. The staging half of that statement is stale. Not corrected here — outside this task's scope; recorded for a future documentation pass.

Pre-deploy staging smoke baseline (for comparison): `/` 200, `/en` 200, `/ar` 200, `/services` 200, `/products` 200, `/about` 200, `/contact` 200, `/api/hello` 200, `/request` 308 → `/contact`, `/fa` 308 → `/`.

---

# DISPATCH

| Field | Value |
| --- | --- |
| Dispatch time | 2026-09-19T06:20:05Z |
| Workflow ID | `361701517` |
| Dispatch ref (`github.ref`) | `feat/header-hero-integrated` (tip `c486e4981ea2a87abe4547a011220c3ac18eb5e8`) |
| `deploy_ref` input | `3ce18c52ef1a84311523d3bfe756139a545c8752` |
| `confirm` input | `deploy-staging` |
| Triggering actor | `rezachidotnet` |
| Event | `workflow_dispatch` |
| Run ID | `35426318953` |
| Run started | 2026-09-19T06:20:07Z |
| Run completed | 2026-09-19T06:21:18Z (71s) |
| GitHub deployment record | environment `staging`, 2026-09-19T06:20:10Z |

Note the intended split: the run's `head_sha` is `c486e49…` (the dispatch ref, i.e. the source of the *workflow file*), while the deployed commit is `3ce18c5…` (the source of the *application*). That separation is the exact-SHA model working as designed.

---

# WORKFLOW RUN

Conclusion: **success**. Every step:

| # | Step | Result |
| --- | --- | --- |
| 1 | Set up job | success |
| 2 | Require explicit confirmation | success |
| 3 | Checkout deploy_ref | success |
| 4 | Resolve deployed SHA | success |
| 5 | Assert staging resources (fail closed) | success |
| 6 | Setup Node.js | success |
| 7 | Install dependencies (immutable) | success |
| 8 | Run tests | success |
| 9 | Type check | success |
| 10 | Build | success |
| 11 | Deploy application code to Cloudflare Workers (staging) | success |
| 21–23 | Post-steps, Complete job | success |

Assertion output in the run log:

```
Staging resource assertion PASSED.
  worker    : ahanassa-bootstrap-staging
  DB_OPS    : ahanassa-ops-staging
  DB_PUBLIC : ahanassa-public-staging
  APP_ENV   : staging
  live-environment identifiers inside env.staging: none
```

One non-blocking warning: `Node.js 20 is deprecated … actions/checkout@v4, actions/setup-node@v4 are being forced to run on Node.js 24`. GitHub-side action runtime deprecation, unrelated to this repository's own Node 24 setting. No action taken.

---

# EXACT SHA

`EXACT_SHA_DEPLOY: PASS`

Two independent confirmations in the run log:

```
Checkout deploy_ref   : HEAD is now at 3ce18c5 ci: harden exact-sha staging deployment
Resolve deployed SHA  : Deploying exact commit: 3ce18c52ef1a84311523d3bfe756139a545c8752
Deploy step env       : DEPLOYED_SHA: 3ce18c52ef1a84311523d3bfe756139a545c8752
```

Requested `deploy_ref` = resolved SHA = `3ce18c52ef1a84311523d3bfe756139a545c8752`. Exact equality.

---

# TESTS

`PASS` — `npm test` on the runner:

```
ℹ tests 1334
ℹ suites 0
ℹ pass 1334
ℹ fail 0
```

---

# BUILD

`PASS` — `npx tsc --noEmit` clean, `npm run build` (`vinext build`) succeeded: 496 + 229 + 488 modules transformed, total upload 1919.53 KiB (gzip 587.98 KiB), Worker startup time 19 ms.

---

# D1 MIGRATIONS

`MIGRATIONS: NONE_PENDING`

This workflow deliberately contains no migration step, and none ran.

A literal scan of the 2,279-line run log for `migrations apply`, `d1 migrations` and `--remote` returned three hits — all three are **test names printed by the test runner**, not executed commands:

```
✔ wranglerExecuteArgs uses --local for the local environment, never --env/--remote
✔ wranglerExecuteArgs uses --env <name> --remote for staging
✔ wranglerExecuteArgs uses --env production --remote for production
```

The single hit for a production identifier is the third of those same test names. No production target was referenced by any executed command.

Post-deploy D1 state, verified directly:

| Database | Before | After |
| --- | --- | --- |
| Staging `DB_OPS` | no migrations to apply | no migrations to apply |
| Staging `DB_PUBLIC` | 10 applied, latest `0010_homepage_eligibility.sql` | 10 applied, latest `0010_homepage_eligibility.sql` |
| Production `DB_PUBLIC` | 6, latest `0006`, last 2026-09-03 18:59:03 | 6, latest `0006`, last 2026-09-03 18:59:03 |
| Production `DB_OPS` | 4, latest `0004` | 4, latest `0004` |

No migration was applied anywhere. No new migration exists in the deployed SHA that is unapplied on staging.

---

# CLOUDFLARE STAGING DEPLOY

`STAGING_DEPLOY: PASS`

| Field | Value |
| --- | --- |
| Worker | `ahanassa-bootstrap-staging` |
| Version before | `b125a448-96ec-4c03-b71e-d69113f9e5c1` (2026-09-13T21:08:20.025Z) |
| Version after | `9817456d-690d-4e46-a008-3817a130f41c` (2026-09-19T06:21:12.789Z) |
| Traffic | 100% |
| URL | `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev` |
| Source | GitHub Actions run `35426318953`, commit `3ce18c5…` |

Bindings reported by the deploy, all staging-only:

```
env.ODOO_SYNC_QUEUE (inherited)                  Queue
env.DB_OPS (ahanassa-ops-staging)                D1 Database
env.DB_PUBLIC (ahanassa-public-staging)          D1 Database
env.IMAGES                                       Images
env.RFQ_RATE_LIMITER (5 requests/60s)            Rate Limit
env.ASSETS                                       Assets
env.APP_ENV ("staging")                          Environment Variable
env.ODOO_BASE_URL ("https://odoo.ahanassa.com")  Environment Variable
env.ODOO_DATABASE ("ahanassa")                   Environment Variable
env.ODOO_CRM_TEAM_ID ("1")                       Environment Variable
env.PRICE_STRIP_ENABLED ("false")                Environment Variable
env.ENABLED_PRICE_PROVIDERS ("")                 Environment Variable
env.HOMEPAGE_RANKING_MODE ("base")               Environment Variable
```

Queue producer/consumer attached: `ahanassa-odoo-sync-staging` and `ahanassa-odoo-sync-staging-dlq`. Routes were not touched.

**The DAR-050 `workers.dev` regression did not recur.** The 2026-09-03 production incident, where a deploy silently disabled the `workers.dev` subdomain because `workers_dev` was not explicit in config, was a live risk here: `env.staging` still does **not** declare `workers_dev` (only `env.production` does, at `wrangler.jsonc:225`). The staging subdomain was reachable before the deploy and is reachable after it, and the deploy printed the URL itself. Worth making explicit in `env.staging` in a future config task, but it did not bite.

---

# SMOKE TEST

All against `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev`, post-deploy. **No 5xx on any probed route.** No RFQ was submitted — there is no documented staging-safe RFQ test endpoint, so the RFQ path was verified by page load and form presence only.

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/en` · `/ar` | 200 · 200 |
| `/services` · `/en/services` · `/ar/services` | 200 · 200 · 200 |
| `/products` · `/en/products` | 200 · 200 |
| `/products/channel-upe` · `/equal-angle` · `/rebar-aj340` | 200 · 200 · 200 |
| `/about` · `/contact` · `/en/contact` | 200 · 200 · 200 |
| `/industries` · `/markets` | 200 · 200 |
| `/api/hello` | 200 |
| `/request` → `/contact` | 308 → 200 |
| `/en/request` → `/en/contact` | 308 → 200 |
| `/fa` → `/` | 308 |
| `/products/<nonexistent>` | 404 (not 500) |

Response times 0.66–1.32 s.

**Locale behaviour** — correct on all three:

```
/     <html lang="fa" dir="rtl">
/en   <html lang="en" dir="ltr">
/ar   <html lang="ar" dir="rtl">
```

**Catalog** — healthy, real data: `/products` renders 6 distinct product links (`channel-upe`, `channel-upn`, `equal-angle`, `hot-rolled-plate-s355jr`, `rebar-aj340`, `square-hollow-section-shs`). Detail pages render real localized titles (e.g. `نبشی مساوی‌الاضلاع | آهن آسا`).

**RFQ page** — `/contact` returns 200 and contains the RFQ `<form>` with its expected fields (`company`, `phoneCountry`, `phoneLocal`). The `/request` → `/contact` 308 is the intended behaviour of migration `0006_route_redirects_308.sql`, identical to the pre-deploy baseline.

---

# PROCESSING SERVICES STATUS

`PROCESSING_SERVICES_SYNC: READY_TO_RUN`

Everything is implemented and the upstream is live. The **only** missing piece is the trigger on staging.

**Upstream — live and correctly shaped.** Read-only `GET https://odoo.ahanassa.com/api/v1/processing/groups?locale=<fa|en|ar>` returns `200` for all three locales with 3 groups and `meta.total: 3`:

```json
{"data": [
  {"sequence": 10, "active": true, "name": "فرآوری ورق", "id": "SHEET_PROCESSING", "updated_at": "2026-09-18 20:31:28"},
  {"sequence": 20, "active": true, "name": "فرآوری میلگرد، مقاطع و لوله", "id": "LONG_PRODUCTS_PROCESSING", "updated_at": "2026-09-18 20:31:28"},
  {"sequence": 30, "active": true, "name": "ساخت قطعات طبق نقشه", "id": "FABRICATION_TO_DRAWING", "updated_at": "2026-09-18 20:31:28"}
], "meta": {"total": 3}}
```

This matches exactly what `lib/processing/odoo-api-client.ts` expects (`data[].id/name/sequence/active`). `ODOO_BASE_URL` — the base the client resolves via `getOdooProcessingApiBaseUrl()` (`lib/env.ts:84`) — **is** bound on the staging Worker.

**Website side — fully wired, at the header, not the page.**

- Schema present: `public_processing_groups` and `processing_sync_state` exist on staging `DB_PUBLIC` (migration `0007_processing_groups.sql`, applied 2026-09-13).
- Code present: `lib/processing/{odoo-api-client,sync-runner,scheduled-sync,repository,public-repository,sync-state-repository}.ts`.
- Consumption present: `app/[locale]/layout.tsx:77` calls `listPublicProcessingGroups(locale)` and passes the result to `SiteHeader` (`:86`), which maps it into `serviceItems` (`SiteHeader.tsx:122`) and forwards it to `mobile-nav-drawer` (`:289`).

**Does staging invoke Processing sync? No.** `workers/entry.ts#scheduled()` runs `runScheduledProcessingSync()` piggybacked on the catalog cron branches (`0 */3 * * *` and `30 2 * * *`) — deliberately, to stay under the Workers Free plan's 5-trigger cap. But in `wrangler.jsonc`:

```
staging triggers    : {"crons": []}
production triggers : {"crons": ["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]}
```

**Staging has no cron triggers at all**, so the scheduled handler never fires there and the Processing sync has never been attempted. There is also no manual trigger path: `app/api/` contains only `hello` and `rfqs`, and `scripts/` has catalog sync/editorial but nothing for Processing.

**Observed state, consistent with the above:**

| Question | Answer |
| --- | --- |
| Does staging invoke Processing sync? | No — `crons: []` on staging |
| Does `DB_PUBLIC` contain processing groups? | No — `SELECT COUNT(*) FROM public_processing_groups` → **0** |
| Has sync ever run on staging? | No — `processing_sync_state.last_attempted_at` and `last_success_at` are both `NULL` (row created 2026-09-13T19:44:11Z, never touched since) |
| Does the Header show dynamic Processing groups? | No — the live staging header renders a single plain `خدمات` / `Services` link to `/services`, with no dropdown children |
| Does `/services` reflect live data? | No — and it never would: `app/[locale]/services/page.tsx` renders only static `servicesCopy` / `homepageCopy` and does not reference the Processing read model at all. The intended consumer of that projection is the **header dropdown**, not this page. |

**Nothing was implemented, invented or wired in this task.**

**Exact next action required** (a configuration change, needing its own authorization):

1. Add the catalog-incremental cron to `env.staging` in `wrangler.jsonc` — `"triggers": { "crons": ["0 */3 * * *"] }` — so `workers/entry.ts#scheduled()` fires on staging.
2. Redeploy staging through this same workflow. Note `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:111`: trigger changes apply on `wrangler deploy` / `wrangler versions deploy`, **not** on `versions upload` alone.
3. Wait for the trigger, then verify `SELECT COUNT(*) FROM public_processing_groups` → 3 and `processing_sync_state.last_success_at` non-null, and confirm the header dropdown renders the three groups in fa/en/ar.

Confirm against the account's 5-trigger cap before step 1 — production already uses 3, and this adds a 4th registration on a physically separate Worker.

---

# PRODUCTION NON-IMPACT

| Check | Result |
| --- | --- |
| Production Worker version | `b07d8697-620c-485c-8fed-21b893ab602c` — **unchanged** (still 2026-09-03T19:00:48.218Z) |
| Production `DB_PUBLIC` | 6 applied, latest `0006`, last 2026-09-03 18:59:03 — **unchanged** |
| Production `DB_OPS` | 4 applied, latest `0004` — **unchanged** |
| Production workflow run | none — the only run today is `35426318953`, `Deploy Staging`, environment `staging` |
| Production migration | none |
| Production route change | none |
| Production Cloudflare deployment | none |
| DNS | not touched |
| Odoo | read-only `GET` on the public Processing endpoint; no write |

The GitHub deployment record created by this run is environment `staging`, ref `feat/header-hero-integrated`, 2026-09-19T06:20:10Z. The `Production` GitHub environment recorded nothing.

---

# ROLLBACK READINESS

`ROLLBACK_REQUIRED: NO` — all smoke tests passed; no rollback was performed.

Recovery point recorded for staging only:

| Field | Value |
| --- | --- |
| Previous staging version | `b125a448-96ec-4c03-b71e-d69113f9e5c1` |
| Created | 2026-09-13T21:08:20.025Z |
| Current staging version | `9817456d-690d-4e46-a008-3817a130f41c` |

Documented mechanism, per `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:223`, scoped to staging:

```
npx wrangler versions deploy b125a448-96ec-4c03-b71e-d69113f9e5c1@100 --env staging
```

`docs/release/CI_CD_POLICY.md:54` defers formal staging rollback procedure to STG-P0, which has not yet defined one; the command above is the existing documented pattern applied to the staging environment. Production rollback remains governed by `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11 and is explicitly **not** in scope.

Since no D1 migration ran, there is no database recovery point to reconcile — a Worker version rollback alone fully reverts this deployment.

---

# NEXT STEP

Authorize and execute the **Processing Groups sync enablement on staging**: register `"crons": ["0 */3 * * *"]` on `env.staging` in `wrangler.jsonc`, redeploy staging through workflow `361701517` with the new SHA as `deploy_ref`, then verify the three Processing groups land in `public_processing_groups` and render in the header dropdown across fa/en/ar.
