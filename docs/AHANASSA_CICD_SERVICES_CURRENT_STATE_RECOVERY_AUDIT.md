# Ahan Asa Website — CI/CD + Services/Processing Current-State Recovery Audit

Date: 2026-09-18
Task type: READ-ONLY discovery / gap analysis. No code, D1, or Odoo modification. No migration run. No deploy. No GitHub secret/environment change. No commit, no push.

---

# RESULT

**PASS (audit completed; several underlying workstreams are themselves BLOCKED — see below).**

---

# CURRENT BRANCH

`feat/header-hero-integrated` (confirmed via `git branch --show-current`). Working tree at audit start: clean except the pre-existing, unrelated `tsconfig.tsbuildinfo` modification noted in the session's git-status snapshot.

---

# CI/CD ARCHITECTURE

**Status: COMPLETE for the scope it claims (verification + manual-only staging deploy). No production workflow exists or is claimed.**

Governing docs: `docs/release/CI_CD_POLICY.md`, `docs/release/CI_CD_P1_IMPLEMENTATION_REPORT.md` (CI-CD-P1, dated 2026-09-13).

- Framework/adapter: `vinext` + `@vinext/cloudflare`, Vite-driven, deployed via `wrangler` (`^4.126.0`). Confirmed against `package.json`/`wrangler.jsonc` directly, consistent with `PROJECT_OVERRIDES.md` §2.
- Two GitHub Actions workflow files exist, both on `feat/header-hero-integrated` (not on `main`): `.github/workflows/ci.yml`, `.github/workflows/deploy-staging.yml`.
- No production deployment workflow file exists anywhere in `.github/workflows/`. Production release is explicitly documented as manual/owner-approved, outside GitHub Actions scope (`docs/release/CI_CD_POLICY.md` "Production deployment policy").
- A pre-existing, separate deployment mechanism is flagged repeatedly in the docs and independently confirmed relevant here: **Vercel's Git integration is connected to this GitHub repository** and auto-deploys every pushed branch as a Preview, with its Production target tied to `origin/main`. This is unrelated to the GitHub Actions work, was not created by any CI/CD task, and is called out because pushing to `main` carries a documented risk (`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8, `DOCUMENT_AUDIT_REPORT.md` DAR-048). It does not affect `ahanassa.com`/`www.ahanassa.com` DNS, which still point at the legacy Vercel site (see DEPLOYMENT REALITY below).
- A static invariant test suite (`lib/ci/workflow-invariants.test.ts`, part of `npm test`) asserts: `ci.yml` never deploys or migrates and never receives Cloudflare deploy credentials; `deploy-staging.yml` is `workflow_dispatch`-only, requires a typed confirmation, never migrates, and never targets production; no workflow in the repo deploys `--env production`.

---

# CI WORKFLOWS

**Status: COMPLETE (`ci.yml`), COMPLETE-BUT-BLOCKED-ON-OPERATOR-INFRASTRUCTURE (`deploy-staging.yml`).**

## `.github/workflows/ci.yml`
- Triggers: `push`, `pull_request`, `workflow_dispatch` (all branches/refs — no branch filter found anywhere in the repo).
- Permissions: `contents: read` only. No Cloudflare secret referenced.
- Steps: checkout → `actions/setup-node@v4` (Node 24) → `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build`.
- Concurrency: `cancel-in-progress: true`, grouped per workflow+ref.
- **Real execution evidence exists** (not just workflow existence): `docs/release/STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md` records the first-ever GitHub Actions run in this repo's history — Run ID `34778222664`, commit `7bb2c34`, `conclusion: success`, ~47s — plus a second successful re-dispatch (`34779284965`) to prove `workflow_dispatch` mechanics.

## `.github/workflows/deploy-staging.yml`
- Trigger: `workflow_dispatch` only, with a required typed `confirm: "deploy-staging"` input, checked before checkout.
- `environment: staging` at job level (honors a GitHub Environment named `staging` if one exists and has protection rules).
- Steps after the confirmation gate: checkout → setup-node → `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build` → `npx vinext-cloudflare deploy --env staging` (using `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets).
- Deliberately **never** applies a D1 migration — migrations are a separate, explicit, manual operator command (`docs/release/CI_CD_POLICY.md`).
- **A real, previously-undiscovered infrastructure gap was found and documented in `STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`**: GitHub's `workflow_dispatch` API cannot dispatch a `workflow_dispatch`-only workflow that has never been indexed by GitHub Actions, and indexing requires the workflow file to exist at least once on the repository's default branch (`main`). `deploy-staging.yml` exists only on `feat/header-hero-integrated`, never merged to `main` — so **it cannot currently be dispatched through GitHub Actions by any means available to a session**, until either (a) it is placed on `main` at least transiently, (b) the default branch is changed, or (c) an unverified GitHub-side mechanism outside CLI/API access is used. None of these has been executed. This is a genuine open gap, not resolved by this audit.

### Exact-SHA promotion design
No exact-SHA promotion pipeline exists in either workflow. `deploy-staging.yml` deploys whatever is checked out at the dispatched ref/commit; there is no artifact-promotion step from a CI-verified build to a later deploy — each dispatch rebuilds from source. No production workflow exists to promote a specific staging-verified SHA to production.

### Required GitHub Environment / secrets
- GitHub Environment `staging`: **confirmed created** — `docs/release/STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`'s continuation section records `GET /repos/.../environments` returning `staging` (id `21847608435`, created `2026-09-13T19:35:48Z`, `protection_rules: []` — no protection rules configured).
- Environment-scoped secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`: **confirmed present** in the `staging` Environment (names/timestamps only verified, no value read).
- No GitHub Environment or secrets for `production` were found or are claimed to exist for GitHub Actions purposes (Vercel's own `Preview`/`Production` environments, unrelated to this project's release process, do exist from its Git integration).

---

# STAGING DEPLOYMENT

**Status: COMPLETE (application code is live-deployed to the staging Worker) but via a one-time authorized LOCAL deploy, not via the GitHub Actions workflow — the workflow itself remains blocked (see above).**

Full evidence trail in `docs/release/STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md` (three appended sections — FIRST ATTEMPT, CONTINUATION, FINAL CONTINUATION — all dated 2026-09-13, all on `feat/header-hero-integrated`, not rewritten by this audit):

1. **Migrations applied to real staging `DB_PUBLIC`** (`npx wrangler d1 migrations apply DB_PUBLIC --env staging --remote`): `0007_processing_groups.sql`, `0008_price_variant_identity_and_provider_policy.sql`, `0009_catalog_group_labels.sql`, `0010_homepage_eligibility.sql` — all four report `✅ applied`, confirmed post-migration via `migrations list` (`✅ No migrations to apply!`) and direct schema `SELECT`s (`public_processing_groups`, `processing_sync_state`, `price_provider_policies`, `catalog_group_labels`, `homepage_product_rank.show_on_homepage` all confirmed present on the real staging database). Staging `DB_OPS` had nothing pending.
2. **GitHub Actions `deploy-staging.yml` dispatch attempted twice, both failed** with the workflow-indexing gap described above (not a secrets/environment problem — both were already correctly provisioned at that point).
3. **Owner explicitly authorized a one-time local deploy** as a scoped deviation: `npx vinext-cloudflare deploy --env staging`, run from the session's own authenticated `wrangler` CLI. Result: success. New Worker version `65df028c-b865-4b86-885f-ab64b8f2987c` confirmed **100% active** on `ahanassa-bootstrap-staging` (previous version `45c44767-...` retained as rollback target). Deployed to `https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev`.
4. **Live HTTP smoke testing performed** against the new staging deployment: `/`, `/en`, `/ar` all 200, Header/Hero/Product Showcase/Buyer Value/Industries/Final CTA/Footer all present; zero `no such table`/`no such column`/uncaught-error markers across `/`, `/en`, `/ar`, `/contact`. Route smoke table covers `/products`, `/request→/contact` (308), `/services`, `/industries`, `/about`, `/contact`, a real product detail page — all 200/expected.
5. **Browser/visual/keyboard/zoom/reduced-motion verification: NOT RUN** — Claude-in-Chrome browser extension was not connected in that session's environment; explicitly reported as a tooling-unavailability gap, not a skipped/failed check.
6. **RFQ E2E on staging: DEFERRED**, blocked on `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` both being absent from the staging Worker's secrets — confirmed still absent as of the most recent commit on this branch (`docs/POST_P3F_PHASE4_STAGING_RFQ_CREDENTIAL_PROVISIONING_REPORT.md`, 2026-09-18, result `BLOCKED — CREDENTIAL_SOURCE_MISSING`: the Odoo RFQ API has exactly one global Bearer secret with no staging/production scoping concept, so provisioning a "staging" credential would in fact grant the staging Worker real production RFQ-write access — an owner decision, not made).

**Net: staging is running current application code (as of the 2026-09-13 local deploy) against a staging `DB_PUBLIC` schema that now includes the Processing/Services tables, but the Processing tables are still empty (see WEBSITE SERVICE SYNC below), and the GitHub Actions path to redeploy staging remains blocked pending an owner decision.**

---

# PRODUCTION DEPLOYMENT

**Status: NOT_IMPLEMENTED as an automated pipeline; a manual production Worker exists but is intentionally not live/public.**

- No GitHub Actions production workflow exists (confirmed above and by the static invariant test).
- `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` documents a **manual** production Worker deployment history: `ahanassa-production` was created via `wrangler deploy`/`wrangler versions upload`, is Basic-Auth-gated closed, reachable only at its own `*.workers.dev` preview URL, with all three Cron Triggers active and correct production D1/Queue/DLQ/rate-limiter bindings. A later Stage-1 task deployed the Multi-Item RFQ redesign to the same non-live Worker and promoted it to 100% traffic **on that Worker**, not on public DNS.
- **`ahanassa.com` / `www.ahanassa.com` DNS was NOT changed by any of this** — those hostnames still serve the legacy Vercel site, per explicit statements in `CLOUDFLARE_DEPLOYMENT_STAGE1.md`. The Cloudflare Worker production deployment is real infrastructure but is not the live public site.
- Production `DB_PUBLIC` migrations `0007`–`0010` are **confirmed still pending** as of the 2026-09-13 staging work (`STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`: "Only staging was touched; production `DB_PUBLIC` remains at its pre-existing pending state (0007–0010 still pending there), untouched by this task."). No later document in this repository records applying them to production. **Production has no Processing/Services schema at all yet.**
- Production RFQ secrets: `ODOO_API_KEY` present but legacy/deprecated; current-path `ODOO_RFQ_API_TOKEN`/`TURNSTILE_SECRET_KEY` provisioning status for production specifically was not re-verified in this audit (out of the Services/CI scope this task targets) — treat as **UNKNOWN**, not confirmed either way here.

---

# ODOO PROCESSING DOMAIN

**Status: UNKNOWN — never verified from this repository, in either direction.**

Every Processing/Services report in this repo (P5, P6, P7) explicitly and repeatedly flags that the upstream Odoo endpoint the whole pipeline is built against — `GET /api/v1/processing/groups` — has never been confirmed to exist or match the assumed contract:

- P5 report (`docs/PROCESSING_SYNC_P5_REPORT.md`): built "against the JSON contract *given in the P5 task prompt*, not a live-verified API"; explicitly could not verify upstream Odoo state (no `/opt/odoo/addons/ahanassa_marketplace*` found on that machine at the time).
- P7 report (`docs/HEADER_P7_FINAL_VERIFICATION_REPORT.md`), "REMAINING RISKS": "The real upstream Odoo Processing API (`GET /api/v1/processing/groups`) remains unverified from this environment... once real sync data lands in production DB_PUBLIC, a final live-production spot-check of the populated Header is recommended."

No later document in this repository (checked through the most recent commits on this branch) records a live confirmation of that endpoint, unlike the RFQ path (which does have a confirmed live-environment audit, `PROJECT_OVERRIDES.md` §3) or the Catalog path (which has a confirmed, distinct, dedicated `docs/integrations/odoo/catalog-v1/` contract, actively syncing real data — see `docs/POST_P3F_WEBSITE_LIVE_CANONICAL_CATALOG_SYNC_REPORT.md`). **The Odoo Processing domain's existence, module, and field-level contract remain unconfirmed.**

---

# PUBLIC PROCESSING PROJECTION

**Status: COMPLETE (code) / NEVER EXECUTED AGAINST REAL DATA (runtime).**

The website-side read model and sync pipeline are fully built, tested, and schema-deployed to staging, but have **never received a real sync run**, because the upstream Odoo endpoint's existence is unverified (see above) and no scheduled trigger has fired against it with real credentials:

- `lib/processing/odoo-api-client.ts` — fetch client, ETag/304-capable, strict shape validation. Not proven against a real upstream response.
- `lib/processing/sync.ts` — pure validation + create/update/withdraw/republish planner. 42/42 unit tests pass (fixture-based).
- `lib/processing/repository.ts` — D1 write layer, explicit column allow-list (proven via `security-allowlist.test.ts`).
- `lib/processing/public-repository.ts` — `listPublicProcessingGroups(locale)`, the sole Header-facing read, proven network-isolated (`network-isolation.test.ts`, 5/5).
- `lib/processing/sync-state-repository.ts` / `scheduled-sync.ts` — lease-guarded, per-locale ETag, failure-isolated coordinator, piggybacked onto the existing every-3-hours Catalog-incremental Cron branch in `workers/entry.ts` (deliberately not a new Cron Trigger — production already runs 3 of the Workers-Free plan's 5-trigger cap).
- `migrations_public/0007_processing_groups.sql` — `public_processing_groups` + `processing_sync_state` tables.

**Real-data status, confirmed live on staging as of the 2026-09-13 deploy** (`STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`, "Header data" section): `public_processing_groups` table exists and is queryable with zero errors, but has **zero rows** — "no Processing sync has run yet." Same finding independently re-confirmed at the start of the P7 verification session ("local DB_PUBLIC Processing row count at start: 0 — true state — no Odoo sync has ever run against local D1"). No evidence anywhere in the repository of a successful real sync run populating this table on any environment.

---

# WEBSITE SERVICE SYNC

**Status: MISSING (in the sense of "never actually run with real data"), though the pipeline itself is COMPLETE per above.**

Restating precisely, since "sync" spans code + execution:
- Sync **code/pipeline**: COMPLETE, tested, deployed (staging schema).
- Sync **execution against real Odoo data**: **never happened**, in any environment, ever, per every document found. Zero real Processing rows exist in local, staging, or (implicitly, since migrations are still pending there) production D1 as of the latest evidence in this repository.

---

# HEADER SERVICES

**Status: LIVE_DATA (architecture and current-branch code), confirmed data-honest, but currently rendering empty because no sync has run.**

- `app/[locale]/layout.tsx` calls `listPublicProcessingGroups(locale)` from `lib/processing/public-repository.ts` (DB_PUBLIC-only, no Odoo import — statically proven) and passes the result as a `serviceGroups` prop into both `components/layout/SiteHeader.tsx` and `components/layout/mobile-nav-drawer.tsx`.
- The old hardcoded fallback (`lib/content/nav.ts`'s former `headerServiceGroups` constant / `HeaderServiceGroup` type) is **confirmed fully removed from runtime code** — P7's grep-based hardcode-elimination check found zero runtime occurrences, only explanatory-comment/test-name mentions. `npx tsc --noEmit` passes, proving no dangling reference.
- Graceful zero-data behavior is **live-verified, not just designed**: on the actual 2026-09-13 staging deploy, the "خدمات" (Services) header item renders as a **plain link to `/services`** with no dropdown, matching the code's documented "zero rows → no fake submenu" contract exactly — confirmed both by P7's local Playwright pass (192+228 live checks) and by the real staging HTTP smoke test.
- This is genuine live-data wiring — not hardcoded, not a live Odoo call at render time (network-isolation tests + live browser network trace in P7 confirm zero Odoo-hostname requests during Header render) — but it currently displays nothing beyond a bare link, because the underlying `public_processing_groups` table has zero rows everywhere.

---

# SERVICES PAGES

**Status: SERVICES_INDEX_PAGE = COMPLETE (as a static content page, not Processing-data-driven). SERVICE_DETAIL_PAGES = MISSING.**

- `app/[locale]/services/page.tsx` exists and is a real, complete, localized page: hero, a "functions" grid (`servicesCopy[locale].functions`), a shared process-steps section, and a CTA band. Its content comes from `lib/content/pages` (static per-locale copy, `servicesCopy`), **not** from `listPublicProcessingGroups`/DB_PUBLIC — it is an editorial content page, architecturally independent of the Processing sync pipeline. `generateMetadata` sets `indexable: false` explicitly.
- **No `/services/<slug>` detail route exists anywhere in the app.** Confirmed by direct filesystem search (`app/[locale]/services` contains exactly one file, `page.tsx`, no subdirectories) and independently corroborated by both the P5 report ("No `/services/<slug>` route exists anywhere in the app... task §18, the read model does not fabricate slugs") and the P7 report ("Route Validity": every rendered Services href resolves to `/services`/`/en/services`/`/ar/services` only — the flat page — "No `/services/<slug>` was fabricated at any point").
- **Do not assume Header integration implies service detail pages were built** — this audit's own direct filesystem check confirms they were not; the P5/P6/P7 chain explicitly scoped detail pages out from the start.

---

# LOCALIZATION (FA/EN/AR)

**Status: COMPLETE for the Services surfaces that exist.**

- Header Services dropdown/plain-link: FA/EN/AR strings, RTL/LTR direction, and mobile-drawer localization are all live-verified at real desktop and mobile viewport widths in the P7 report (426/426 live Playwright checks across zero-data and populated-data states, all three locales).
- `lib/content/nav.ts` carries `dropdownViewAllLabel`/`dropdownDisclosureAccessibleName` for all three locales (`fa`/`en`/`ar`) for both products and services.
- `app/[locale]/services/page.tsx` content (`servicesCopy`) is locale-keyed and rendered per the `[locale]` route segment, consistent with the fa/en/ar architecture required by `PROJECT_OVERRIDES.md` §1.
- Caveat carried over from P7's own "Remaining Risks": the **Product** dropdown (a separate, unrelated domain) has no `en`/`ar` content published yet — noted here only because it appears in the same evidence trail and should not be confused with a Services-localization gap; Services localization itself was found complete.

---

# GIT LINEAGE

**Status: CLEAN — LINEAGE_OK = YES.**

- `git merge-base feat/header-frozen-v2 feat/header-hero-integrated` = `ca516427671f55447714cddf943479c3e2fc8af1`, which is **exactly** the tip of `feat/header-frozen-v2` (`git rev-parse feat/header-frozen-v2` returns the identical SHA). **`feat/header-frozen-v2` is fully, linearly merged into `feat/header-hero-integrated`** — not a divergent or cherry-picked partial state.
- `git merge-base --is-ancestor feat/header-frozen-v2 feat/header-hero-integrated` → true.
- Specific Services/Processing commits, each independently confirmed as an ancestor of current `HEAD` via `git merge-base --is-ancestor <sha> HEAD`:
  - `2967d37` — "feat: add DB_PUBLIC processing sync and read model" (P5) — **ancestor: YES**
  - `4108449` — "feat: connect Header services to DB_PUBLIC processing groups" (P6) — **ancestor: YES**
  - `0900270` — "docs: record P6/P7 Header services evidence reports" — **ancestor: YES**
- No cherry-picking was performed or needed by this audit — the history is a straight, unbroken line.

---

# DEPLOYMENT REALITY

Separating code-in-repo from actually-deployed, per environment, with direct evidence only (no inference from commit existence):

| Item | Code implemented | Staging deployed | Production deployed |
|---|---|---|---|
| CI (`ci.yml`) | Yes | N/A (CI has no "deploy" concept) | N/A |
| Staging deploy workflow (`deploy-staging.yml`) | Yes | **File exists on branch only; workflow itself has never successfully dispatched through GitHub Actions** (indexing gap, unresolved) | N/A |
| Staging application code (current branch) | Yes | **Yes — confirmed live** via the 2026-09-13 one-time authorized local deploy (`65df028c-...`, 100% active, live HTTP-verified) | N/A |
| Production application code | Yes (same source) | N/A | **Partially** — a real `ahanassa-production` Worker exists with correct bindings and Cron Triggers, but is Basic-Auth-gated and reachable only at its own `workers.dev` URL; `ahanassa.com`/`www.ahanassa.com` DNS still serves the legacy Vercel site, unchanged |
| DB_PUBLIC migrations 0007–0010 (Processing/Services + related) | Yes (files committed) | **Yes — applied and verified** on real staging D1, 2026-09-13 | **No — confirmed still pending** as of the same 2026-09-13 report, no later record of production application found |
| Public Processing Projection (sync pipeline) | Yes | Deployed (schema + code) but **zero real sync runs, zero real rows**, anywhere | Not deployed (schema absent) |
| Header Services live-data wiring | Yes | Yes — live-verified rendering the correct empty-state | Not deployed (schema absent; code would run but query empty/nonexistent tables) |
| Services index page (`/services`) | Yes | Yes — confirmed 200 in staging route smoke | Unconfirmed this audit (not specifically re-checked against the production Worker; no reason to expect it differs, since it's a static content page requiring no Processing data) |
| Service detail pages | **Not implemented** | N/A | N/A |

---

# GAP MAP

| Workstream | Already done | Currently present (this branch) | Not done | Blocker | Next action |
|---|---|---|---|---|---|
| CI | Verification workflow, invariant tests, real passing run on GitHub Actions | `ci.yml` | Branch-protection required-check not applied remotely (recommended, not configured) | None — operator convenience item only | Configure `CI / verify` as a required check in branch protection settings |
| Staging CD | Workflow file, GitHub Environment `staging`, both Cloudflare secrets provisioned, migrations applied, one successful **local** deploy | `deploy-staging.yml`, applied `DB_PUBLIC` schema, live app code (`65df028c-...`) | Workflow has never successfully dispatched via GitHub Actions itself | `deploy-staging.yml` never indexed by GitHub Actions (requires existing once on `main`, changing the default branch, or an unverified GitHub-side path) | Owner decision among: (a) transiently place workflow files on `main` (interacts with the Vercel-Production-on-`main` risk, needs that disconnected/reassigned first per `GO_LIVE_CUTOVER_RUNBOOK.md` §8), (b) continue manual local deploys, (c) investigate a GitHub web-UI path |
| Production CD | Manual `ahanassa-production` Worker exists, Basic-Auth-gated, correct bindings/Crons | Worker infra only | No automated pipeline; `0007`–`0010` migrations not applied; DNS still on legacy Vercel | Explicit owner scope: production release is manual/owner-approved by design (`CI_CD_POLICY.md`) | Not a blocker to fix — a deliberate future gate; apply pending migrations and cut DNS only when a go-live decision is made |
| Processing/Odoo services (Odoo side) | JSON contract assumed from a task prompt | — | Real Odoo `/api/v1/processing/groups` endpoint never confirmed to exist or match the assumed shape | No independent way to verify Odoo state from this repo/session | A read-only, live-environment Odoo audit (same pattern already done for the RFQ path in `PROJECT_OVERRIDES.md` §3) |
| Public service projection (website sync pipeline) | Full code + tests + staging schema | `lib/processing/*` | Never executed against real Odoo data; zero real sync runs on any environment | Upstream Odoo endpoint unverified (see above); also gated behind the shared every-3-hours cron slot | Confirm/build the real Odoo endpoint (or its absence), then trigger and verify one real sync run on staging |
| Website service sync (execution, not code) | — | Schema live on staging, zero rows | Real data never landed anywhere | Same as above | Same as above |
| Header Services | Full live-data wiring, zero-hardcode, zero-Odoo-render-path, FA/EN/AR, desktop+mobile, accessibility — all live-verified | Live on staging (correctly rendering the empty state) | Populated-state real-data verification (only fixture-data verification exists) | No real Processing rows exist yet | Once a real sync run lands data, do one production-equivalent visual spot-check (P7's own stated remaining risk) |
| Services index page | Static, localized, complete | `app/[locale]/services/page.tsx` | Nothing outstanding for this specific page | None | None required |
| Service detail | Not started | Not present | `/services/<slug>` route, content model, RFQ linkage | Explicitly deferred by P5's own routing decision — no design work was authorized or done | Requires its own scoping/design task; not a resumption of existing work |
| Services → RFQ | Not present (no detail pages to link from); the Services index page itself does route into the same `CtaBand`/`/contact` flow as other pages | `CtaBand` on `/services` | Any deep-link from a specific service to a pre-filled RFQ (analogous to the existing `?variant=` catalog preselection pattern) | Depends on service detail pages existing first | Design after service detail pages are scoped |

---

# RECOMMENDED SEQUENCE

Based only on the evidence above (the expected sequence in the original task prompt is evaluated against it, not assumed):

1. **Confirm or build the real Odoo Processing endpoint.** This is the actual root blocker for everything data-dependent in Services — without it, no amount of website-side work produces a populated Header or real service content. Recommend a read-only live-environment audit identical in kind to the one already done for the RFQ path (`PROJECT_OVERRIDES.md` §3), targeting `GET /api/v1/processing/groups` specifically.
2. **Resolve the GitHub Actions `deploy-staging.yml` indexing gap**, since it blocks re-running the audited deploy path for *any* future change, not just Services — this is now the standing way to get new code (including a populated Processing sync, once step 1 lands) onto staging without repeating a one-time manual exception. This requires an owner decision per the three paths already documented in `STG_P1_CONTROLLED_STAGING_EXECUTION_REPORT.md`.
3. **Trigger and verify one real Processing sync run on staging** once step 1 confirms a real endpoint, then re-verify the Header's populated state against real (not fixture) data — closing P7's own explicitly stated remaining risk.
4. **Scope and build Services detail pages** (and any Services→RFQ linkage) as new, separately-authorized work — not a "restoration," since this audit confirms they were never built, only deliberately deferred.
5. **Apply migrations `0007`–`0010` to production `DB_PUBLIC`** and address the production RFQ/Turnstile secret gap, only as part of an explicit go-live decision — not before, since production DNS intentionally still points at the legacy Vercel site and no owner go-live authorization was found in this audit's evidence.

This mostly matches the original prompt's suggested order, with one material correction: **"restore/confirm Services integration" is not the right framing** — nothing needs restoring. The header-integration code (P5/P6/P7) is intact, current, and fully ancestor of `HEAD`; what's actually missing is upstream Odoo data and the ability to redeploy staging through the audited GitHub Actions path, not a lost or reverted feature.

---

# NEXT PHASE

**Owner decision on the `deploy-staging.yml` GitHub Actions indexing gap, run in parallel with a read-only live Odoo Processing-endpoint audit.** Both are prerequisites for nearly everything else in the gap map and neither requires design work to start.

---

`RESULT: PASS`
`CI_ARCHITECTURE: COMPLETE`
`CI_WORKFLOW: COMPLETE`
`STAGING_CD: COMPLETE (via one-time authorized local deploy; GitHub Actions dispatch path itself BLOCKED)`
`PRODUCTION_CD: NOT_IMPLEMENTED (by design; manual non-live Worker exists)`
`ODOO_PROCESSING_DOMAIN: UNKNOWN`
`PUBLIC_PROCESSING_PROJECTION: PARTIAL (code complete, never executed against real data)`
`WEBSITE_SERVICE_SYNC: MISSING (execution) / COMPLETE (pipeline code)`
`HEADER_SERVICES: LIVE_DATA (correctly rendering empty state; no real data yet)`
`SERVICES_INDEX_PAGE: COMPLETE`
`SERVICE_DETAIL_PAGES: MISSING`
`FA_EN_AR: COMPLETE (for the Services surfaces that exist)`
