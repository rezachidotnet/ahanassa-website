# STG-P0 — Staging Readiness, Migration Inventory & Recovery Plan

Date: 2026-09-13
Task type: read-only / non-destructive staging readiness audit + migration inventory + recovery/rollback plan + durable report. No deploy, no remote migration, no remote settings change was performed.

---

# RESULT

**B — STAGING READY AFTER OPERATOR-SIDE GITHUB/CLOUDFLARE SETUP.**

The application/CI/CD side of staging readiness is fully verifiable from repository evidence and is sound. Two hard, verified (not guessed) gaps sit entirely on the operator/remote-settings side: no GitHub Actions secrets exist yet (`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`), and no GitHub Environment named `staging` exists yet. A second, more consequential finding — real DB_PUBLIC migration drift on both staging and production — was discovered during this audit (see MIGRATION INVENTORY DB_PUBLIC) and must be resolved as a controlled, explicit step before the Homepage Product Showcase/Header shortcuts can render correctly on staging.

---

# PREFLIGHT

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    23db535a30e248dbea315bbd03276ba8d846f79d
status:  clean
remote:  origin  git@github.com:rezachidotnet/ahanassa-website.git (fetch/push)
```

Working tree was clean before this task began. Branch matched the expected `feat/header-hero-integrated`, HEAD matched the last known checkpoint (`docs: record CI/CD P1 implementation`).

---

# BASE SHA

`23db535a30e248dbea315bbd03276ba8d846f79d`

---

# CI/CD FOUNDATION

Re-verified directly from the files (not assumed from the prior report):

- `.github/workflows/ci.yml` — triggers on `push`/`pull_request`/`workflow_dispatch`; `permissions: contents: read`; no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` anywhere; runs `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run build`.
- `.github/workflows/deploy-staging.yml` — `workflow_dispatch` only, one required string input (`confirm`) checked against the literal `deploy-staging` in a dedicated first step (`env:`-passed, not interpolated into the shell string — avoids expression injection) that fails closed before checkout; `environment: staging`; deploys via `npx vinext-cloudflare deploy --env staging`; contains no `migrations apply`, no `--remote`, no reference to `0010_homepage_eligibility`, no `--env production`.
- `lib/ci/workflow-invariants.test.ts` — 7 tests, all passing, statically re-confirm the above on every `npm test` run.
- `docs/release/CI_CD_POLICY.md` — matches the implemented workflows; no drift found.

**No material safety defect found. Nothing in CI/CD was rewritten in this task.**

`npm test` was re-run in full during this audit: **1247/1247 passing** (unchanged from CI-CD-P1). `npx tsc --noEmit`: **PASS**. `npm run build`: **PASS**. (`tsconfig.tsbuildinfo`'s tracked-drift side effect was restored via `git checkout` after each run, as in the prior task — not a new finding.)

---

# STAGING RESOURCES

Read directly from `wrangler.jsonc` `env.staging` (committed config, not assumed):

| Resource | Name / ID |
|---|---|
| Worker | `ahanassa-bootstrap-staging` |
| D1 `DB_OPS` | `ahanassa-ops-staging` (`49bd0aff-e289-4fff-b7b9-0f4b517e6b14`) |
| D1 `DB_PUBLIC` | `ahanassa-public-staging` (`35cef70f-3ad3-4049-add4-ddcac6cac45b`) |
| Queue | `ahanassa-odoo-sync-staging` → DLQ `ahanassa-odoo-sync-staging-dlq` |
| Rate limit | `RFQ_RATE_LIMITER`, namespace `1002`, 5 req/60s |
| Cron triggers | `[]` (deliberately empty — DAR-053) |
| `vars` | `APP_ENV="staging"`, `ODOO_BASE_URL="https://odoo.ahanassa.com"`, `ODOO_DATABASE="ahanassa"`, `ODOO_CRM_TEAM_ID="1"`, `PRICE_STRIP_ENABLED="false"`, `ENABLED_PRICE_PROVIDERS=""`, `HOMEPAGE_RANKING_MODE="base"` |

**Live-verified (read-only `wrangler versions view` against the currently-active staging version, `45c44767-0692-4052-be23-3b7d32678e1e`, deployed 2026-09-03T18:33:43Z):** all bindings/vars above match exactly what's committed. **Only one secret is currently set on staging: `ODOO_API_KEY`** (the legacy, deprecated adapter's credential) — `ODOO_RFQ_API_TOKEN` (the current RFQ delivery credential, `lib/odoo/rfq-api-client.ts`) and `TURNSTILE_SECRET_KEY` are **not** configured on staging today. This is a real, freshly-confirmed gap: real Odoo RFQ sync and real Turnstile verification both currently fail closed on staging (RFQ submission returns `503`, sync remains `not_configured`) — consistent with, and now directly confirming, README's existing note that no Turnstile widget exists yet for any hostname.

---

# PRODUCTION RESOURCES

Read directly from `wrangler.jsonc` `env.production`:

| Resource | Name / ID |
|---|---|
| Worker | `ahanassa-production` |
| D1 `DB_OPS` | `ahanassa-ops-production` (`7240a6a7-c293-4e6e-baf3-95838a3c2944`), jurisdiction `eu` |
| D1 `DB_PUBLIC` | `ahanassa-public-production` (`73ba6b50-ef57-4d89-baa9-617a0b0af127`), jurisdiction `eu` |
| Queue | `ahanassa-odoo-sync-production` → DLQ `ahanassa-odoo-sync-production-dlq` |
| Rate limit | `RFQ_RATE_LIMITER`, namespace `2001` |
| Cron triggers | `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` (live, active) |
| Routes | `www.ahanassa.com` (Worker Custom Domain, live per `docs/GO_LIVE_CUTOVER_RUNBOOK.md` execution record) |

Production is live and public today at `https://www.ahanassa.com/` (Cloudflare Worker), per the cutover runbook's execution record — this task did not re-verify that live state (out of scope; read-only D1 migration checks only, see below).

---

# RESOURCE SEPARATION

**PASS.** Every ID above is distinct between staging and production — confirmed both by reading `wrangler.jsonc` directly and by a read-only `wrangler d1 migrations list` against each of the 4 database/environment combinations (below), which addressed 4 genuinely different D1 targets, not the same one twice. No resource ID or name is shared unexpectedly.

---

# GITHUB ENVIRONMENT

**OPERATOR CHECK REQUIRED — but checked, not guessed: a read-only `gh api repos/rezachidotnet/ahanassa-website/environments` call (GET only, no state change) returned exactly two environments, `Preview` and `Production` — both Vercel-created (their `html_url`/creation dates align with the Vercel Git integration, not this project's GitHub Actions work). No environment named `staging` exists.** `deploy-staging.yml` references `environment: staging`; on first dispatch, GitHub will silently auto-create an unprotected `staging` environment (no required reviewers, no branch restriction) unless the operator creates and configures it first. Neither `Preview` nor `Production` has any protection rule configured (`protection_rules: []` on both) — not relevant to this workflow, but noted since they share the naming pattern.

Also confirmed read-only: `main` branch has **no branch protection at all** (`GET .../branches/main/protection` → `404 Branch not protected`), and `GET .../actions/workflows` returns **zero** registered workflows — because `feat/header-hero-integrated` (and its `.github/workflows/*`) has never been pushed to GitHub (`git ls-remote --heads origin` does not list it). This is expected, not a defect: CI cannot exist remotely until the branch is pushed.

---

# REQUIRED SECRET NAMES

Per `01-sources/ENVIRONMENT_VARIABLES.md` §10 (canonical, unchanged from CI-CD-P1):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Verified, not guessed: `GET repos/rezachidotnet/ahanassa-website/actions/secrets` (names only, values never requested or exposed) returned `"total_count":0`.** Zero Actions secrets exist in this repository today. Both names above must be configured by the operator before `deploy-staging.yml` can succeed past its final step.

---

# VERCEL INTEGRATION

Classification: **A — SAFE FOR FEATURE-BRANCH PUSH / PREVIEW ONLY** (for `feat/header-hero-integrated` specifically). **C — MUST DISCONNECT (or reassign Production Branch) BEFORE MERGE TO MAIN** (unchanged policy, already documented, not re-decided here).

Evidence, re-confirmed from `docs/GO_LIVE_CUTOVER_RUNBOOK.md` §8 and `DOCUMENT_AUDIT_REPORT.md` DAR-048 (not re-audited live in this task — out of the safe read-only scope defined for this task, and unnecessary since nothing has changed the Vercel side since that audit):

- Vercel's Git integration auto-deploys every pushed branch as a **Preview** deployment; these fail in ~11–15s because this repository's build (`vinext build`, Cloudflare-only) is not Vercel-compatible. Harmless, isolated, not linked from anywhere public.
- Vercel's **Production** target is tied to `origin/main`, which is at `d22d752` (the legacy holding page) and has not moved. `git ls-remote --heads origin` (read-only, re-run in this task) confirms `main` is still exactly `d22d7529dd7dd521443699c963b8b95e6943be78` — no drift since the last audit.
- `feat/header-hero-integrated` descends from `feat/homepage-product-projection` (already pushed to `origin` in a prior session, confirmed via `git merge-base --is-ancestor`), which already went through this exact Preview-only cycle without incident — this is not a novel risk, it is a repeated, already-proven-safe pattern.
- A future push to (or merge into) `main` — not part of this task, not requested — would trigger a real Vercel Production build of the Cloudflare-only codebase, which is the one genuinely risky action; it remains explicitly out of scope here and is not planned.
- No disconnect/reassignment task has been executed yet; it remains an explicit, separate, later operator action per the runbook, not a blocker for a feature-branch push today.

---

# PUSH SIDE EFFECTS

Pushing `feat/header-hero-integrated` to `origin` today would:

1. Create the remote branch (it does not exist yet — confirmed via `git ls-remote --heads origin`).
2. Trigger exactly one Vercel **Preview** build attempt, which fails harmlessly in ~11–15s (established pattern, not a new risk).
3. Make `.github/workflows/ci.yml` and `.github/workflows/deploy-staging.yml` visible to GitHub Actions **for that branch/ref**. `ci.yml`'s `push`/`pull_request` triggers would then fire automatically the moment the branch exists remotely, running `CI / verify` for the first time.
4. Make `deploy-staging.yml` dispatchable via `workflow_dispatch` **against that ref** (`gh workflow run deploy-staging.yml --ref feat/header-hero-integrated`, or "Use workflow from: feat/header-hero-integrated" in the Actions UI) — it does not require the workflow to exist on `main` first; GitHub's `workflow_dispatch` can target any ref that itself carries the workflow file.
5. Not touch `www.ahanassa.com`/`ahanassa.com`, not touch any Cloudflare resource, not run any migration — none of the new workflows execute automatically from a plain push except the read-only-safe `ci.yml` verify job.

No push was performed in this task.

---

# MIGRATION INVENTORY DB_OPS

**Ground truth, read-only, live-verified** (`npx wrangler d1 migrations list DB_OPS --env staging --remote` and `--env production --remote`, both GET-equivalent reads against D1's own migration-tracking table — no data was written):

```
DB_OPS staging:    ✅ No migrations to apply!
DB_OPS production: ✅ No migrations to apply!
```

All four migration files are applied in both environments — nothing pending.

| Migration | Purpose | Local | Staging | Production | Order | Risk | Required before Homepage staging? | Notes |
|---|---|---|---|---|---|---|---|---|
| `0001_rfq_ops_schema.sql` | Core RFQ schema (`rfqs`, `rfq_contacts`, `rfq_items`, outbox/DLQ, etc.) | Applied | **Applied** | **Applied** | 1 | Low (foundational, already live) | No — DB_OPS is RFQ-only, unrelated to Homepage rendering | 25 DDL statements, 0 inserts |
| `0002_rfq_catalog_snapshot.sql` | Adds `rfq_items.sku_snapshot` | Applied | **Applied** | **Applied** | 2 | Low (additive `ADD COLUMN`) | No | — |
| `0003_odoo_rfq_api_handoff.sql` | Adds `rfqs.odoo_rfq_reference` + partial unique index | Applied | **Applied** | **Applied** | 3 | Low (additive) | No | — |
| `0004_rfq_contacts_phone_iso2.sql` | Adds `rfq_contacts.phone_iso2` | Applied (local) | **Applied** (confirmed live) | **Applied** (confirmed live) | 4 | Low (additive) | No | DAR-051 recorded this as local-only at the time it was written (2026-09-03); the live check performed in this task proves it has since reached both real environments — this DAR entry is now stale on that one point (not fixed here — no historical report is rewritten; noted for a future documentation-cleanup pass). |

**DB_OPS: fully synchronized, no action needed.**

---

# MIGRATION INVENTORY DB_PUBLIC

**Ground truth, read-only, live-verified** (same method as above):

```
DB_PUBLIC staging:
  0007_processing_groups.sql
  0008_price_variant_identity_and_provider_policy.sql
  0009_catalog_group_labels.sql
  0010_homepage_eligibility.sql

DB_PUBLIC production:
  (identical list — same 4 migrations pending)
```

**This is the single most important finding of this audit: four migrations are pending, not one.** Every prior document in this repository (including this task's own "Latest known project state" checkpoint) mentions only `0010` as REMOTE PENDING. `0007`, `0008`, and `0009` are equally unapplied to both staging and production, and this had not been recorded anywhere before this task.

| Migration | Purpose | Local | Staging | Production | Order | Risk | Required before Homepage staging? | Notes |
|---|---|---|---|---|---|---|---|---|
| `0001_catalog_schema.sql` | Core catalog schema | Applied | Applied | Applied | 1 | — | No | — |
| `0002_catalog_v1_contract.sql` | Catalog v1 API contract fields | Applied | Applied | Applied | 2 | — | No | Contains a one-time DROP/recreate, documented as safe only because run while empty — never to be repeated (README §"migration safety guardrail") |
| `0003_catalog_sync_state.sql` | `catalog_sync_state` table | Applied | Applied | Applied | 3 | — | No | — |
| `0004_public_price_quotes.sql` | Pricing tables (`public_price_quotes` etc.) | Applied | Applied | Applied | 4 | Low (additive, unused — `PRICE_STRIP_ENABLED=false`) | No | DAR-051 recorded this as local-only at the time (2026-09-03); confirmed live-applied to both real environments in this task's read-only check — same stale-DAR situation as DB_OPS 0004 above. |
| `0005_homepage_projection.sql` | `homepage_product_rank`, `route_redirects` (v1) | Applied | Applied | Applied | 5 | — | No (already live) | Feeds Product Showcase ranking overlay; sparse, LEFT JOINed — safe when empty |
| `0006_route_redirects_308.sql` | Rebuilds `route_redirects` with `308`/`302`/`410` CHECK | Applied | Applied | Applied | 6 | — | No | Data-preserving rebuild (SQLite CHECK constraints can't be `ALTER`ed) — DAR-054 explicitly reconfirms this one *was* applied to staging by the time it was written |
| **`0007_processing_groups.sql`** | `public_processing_groups`, `processing_sync_state` (Header "Services" dropdown) | Applied | **PENDING** | **PENDING** | 7 | **Low — purely additive** (2 new `CREATE TABLE`, one `INSERT` into the new `processing_sync_state` singleton row only; touches zero existing table) | **No, but degrades global Header** — `lib/processing/public-repository.ts`'s query is wrapped in a `try/catch` at its one call site (`app/[locale]/layout.tsx`), so a missing table fails closed to an empty Services dropdown on **every page of the site**, not a crash | Global blast radius (Header renders on every route), but fail-closed, not fail-open |
| **`0008_price_variant_identity_and_provider_policy.sql`** | Adds `variant_key` to 3 pricing tables + new `price_provider_policies` table | Applied | **PENDING** | **PENDING** | 8 | **Low — purely additive** (3 nullable `ADD COLUMN` + 1 new table, no seed) | **No** — `lib/pricing/provider-policy-repository.ts` is only reached via a dynamic `import()` inside the pricing orchestrator, itself gated behind `PRICE_STRIP_ENABLED` (currently `"false"` everywhere) — this code path never executes today | Zero current blast radius while the flag stays off |
| **`0009_catalog_group_labels.sql`** | New `catalog_group_labels` table (per-locale group names for Header "Products" dropdown) | Applied | **PENDING** | **PENDING** | 9 | **Low — purely additive** (1 new table, no seed) | **No, but degrades global Header** — `listHeaderProductFamilyShortcuts` (`lib/catalog/editorial-repository.ts`) does an unconditional `LEFT JOIN catalog_group_labels`; a `LEFT JOIN` against a genuinely **missing table** throws a SQL error (`no such table`), not a null-join — but the one call site (`app/[locale]/layout.tsx`) wraps it in the same `try/catch` as above, so it fails closed to plain-link-only navigation, not a crash | Same global-but-fail-closed profile as 0007 |
| **`0010_homepage_eligibility.sql`** | Adds `homepage_product_rank.show_on_homepage` | Applied (local only, disposable copies) | **PENDING** | **PENDING** | 10 | **Low — purely additive** (single `ALTER TABLE ADD COLUMN ... DEFAULT 1`) | **YES, conditionally** — see MIGRATION 0010 below | Confirmed by direct diagnosis (`docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`): missing column → caught SQL error → Product Showcase section omitted entirely (fail-closed, not a crash) |

**Cross-database dependency: none.** All four pending migrations are DB_PUBLIC-only; DB_OPS is untouched by any of them and has zero coupling to the pending set.

**MIGRATION INVENTORY: GAP** (a real, previously-unrecorded gap: 0007–0009 were never listed as pending anywhere before this audit) — now closed by this document.

---

# MIGRATION 0010

Read in full (`migrations_public/0010_homepage_eligibility.sql`, 38 lines):

- **Tables/columns/indexes affected:** one column added to one existing table — `homepage_product_rank.show_on_homepage INTEGER NOT NULL DEFAULT 1 CHECK (show_on_homepage IN (0,1))`. No index added or changed. No other table touched.
- **Additive or destructive:** **Additive.** Single `ALTER TABLE ... ADD COLUMN ... DEFAULT 1`. No `DROP`, no data rewrite, no existing row altered beyond every existing row implicitly gaining the new column at its default value.
- **Transaction assumptions:** None beyond D1/SQLite's own single-statement-is-atomic guarantee — this is one statement, applied by Wrangler's migration runner as one unit.
- **Compatibility with current website code:** Current app code (`lib/catalog/editorial-repository.ts#HOMEPAGE_ELIGIBILITY_WHERE_CONDITION`) already references `hpr.show_on_homepage` unconditionally in its WHERE clause. Without the column, the query throws `no such column: hpr.show_on_homepage`; the one call site (`app/[locale]/page.tsx`) wraps it in `try/catch` and falls back to an empty candidate list, so `ProductShowcase` renders `null` (the whole section is omitted) — proven live in `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`'s own diagnosis.
- **Does current app code expect it:** Yes, structurally — but tolerates its absence gracefully (fails closed, not fatal).
- **Can the migration be safely applied before app deploy:** Yes — `DEFAULT 1` means every pre-existing `homepage_product_rank` row becomes explicitly eligible; no currently-running (older) code references `show_on_homepage` at all, so an older Worker version simply ignores the new column.
- **Can app deploy safely precede the migration:** Yes — proven by the exact fail-closed behavior above; the Homepage renders normally with the Product Showcase section silently absent until the migration lands.

**0010 REQUIRED FOR STAGING HOMEPAGE PRODUCT SHOWCASE: CONDITIONAL** — required only for the *Product Showcase section itself* to render; every other Homepage section, and the page as a whole, works correctly without it. Because the current branch's app code already assumes the column exists, applying 0010 (together with 0007/0009 for full Header fidelity) before deploying this branch's app code to staging is the recommended order (see SAFE DEPLOY ORDER) — but it is not a hard blocker for a safe deploy either way.

**0010 DESTRUCTIVE: NO.**

**0010 REVERSIBLE: PARTIAL** — no down-migration file or mechanism exists anywhere in this repository (this project's own established convention, per `0006`'s precedent, is "write a new forward migration to fix a mistake," never a reverse-apply script). A manual `ALTER TABLE homepage_product_rank DROP COLUMN show_on_homepage;` would technically reverse it (modern SQLite/D1 supports `DROP COLUMN`), but this is not a tooled, tested, or documented path in this repository — treat reversal as a manual, one-off operation if ever needed, not an automated rollback.

---

# MIGRATION ORDER

**DB_OPS sequence:** none pending — no action.

**DB_PUBLIC sequence (staging and production, identical):**

```
0007_processing_groups.sql
  → 0008_price_variant_identity_and_provider_policy.sql
    → 0009_catalog_group_labels.sql
      → 0010_homepage_eligibility.sql
```

This is the exact numeric order Wrangler's own migration runner applies automatically and atomically per-file when invoked as `npx wrangler d1 migrations apply DB_PUBLIC --env <env> --remote` — a single invocation applies all four pending files in this order in one command; there is no way to selectively apply a subset via the standard tool, and no evidence suggests one should be skipped. No cross-file dependency was found beyond this strict ordering (each migration only references tables/columns that already exist by the time it runs).

**No cross-database dependency** — DB_OPS and DB_PUBLIC migrations are fully independent of each other.

---

# RECOVERY POINT

**Mechanism: Cloudflare D1 Time Travel** — already the canonical, documented mechanism for this project (`01-sources/DEPLOYMENT_ARCHITECTURE.md` §12: "D1 Time Travel is the primary point-in-time mechanism... Record pre-migration timestamp/bookmark and migration list... Recover `DB_PUBLIC` and `DB_OPS` independently"; `01-sources/DATABASE_SCHEMA.md` §18: "Capture the D1 Time Travel bookmark before high-risk production changes"). Not invented for this task.

**What must be captured, before any real migration apply (not executed in this task):**

1. `npx wrangler d1 time-travel info DB_PUBLIC --env staging` (and the production equivalent, when production's turn comes) — a **read-only** command that returns the current restore bookmark for that database at that moment. No state is changed by running it.
2. The exact pending-migration list this document already establishes (0007→0008→0009→0010).
3. The currently-live staging Worker version ID serving traffic **before** any new app deploy: `45c44767-0692-4052-be23-3b7d32678e1e` (captured in this task, read-only, via `wrangler versions view` — see STAGING RESOURCES above). This is the application-level rollback point, independent of the D1 bookmark.

**Where to record it:** as a dated entry in a future STG-P1 (or equivalent) implementation report, the same way this project has recorded every other infrastructure action in `DOCUMENT_AUDIT_REPORT.md`/`docs/release/`.

**How the operator confirms success:** re-run the same `wrangler d1 migrations list DB_PUBLIC --env staging --remote` read used in this audit — a clean "✅ No migrations to apply!" after the apply step (§ below) is the positive confirmation; the recorded bookmark from step 1 remains the restore target if anything is later found wrong.

**This task did not execute any of the above** — no bookmark was captured, no migration was applied. Given D1 Time Travel is a real, already-documented, zero-invention mechanism and the pending migrations are all purely additive, **staging migration execution is not classified BLOCKED on recovery-point grounds** — the procedure is well-defined; it is simply not yet executed.

---

# WORKER ROLLBACK

**Applicable to staging: yes**, by direct analogy to the already-documented, already-used production pattern (`docs/GO_LIVE_CUTOVER_RUNBOOK.md` §11), applied to the staging Worker name instead:

```bash
# Capture (already done in this task, read-only):
npx wrangler deployments list --name ahanassa-bootstrap-staging   # current: 45c44767-0692-4052-be23-3b7d32678e1e (2026-09-03T18:33:43Z)

# Restore, if a new staging deploy misbehaves:
npx wrangler versions deploy 45c44767-0692-4052-be23-3b7d32678e1e@100 --name ahanassa-bootstrap-staging
# or, to revert to whichever version was immediately prior at rollback time:
npx wrangler rollback --name ahanassa-bootstrap-staging
```

**What application rollback does NOT undo:** a D1 migration. Per `01-sources/DEPLOYMENT_ARCHITECTURE.md` §12's own explicit statement ("Worker rollback does not roll back D1... A migration applied before gradual rollout must remain compatible with the previous Worker") — this is exactly why every pending migration was individually checked above for compatibility with the *current, pre-migration* app code, and all four are additive/backward-compatible: the previous Worker version tolerates their presence (it simply doesn't query the new tables/columns), so rolling the Worker back after a migration has been applied is always safe here.

---

# DATABASE RECOVERY

Per pending-migration category:

- **0007, 0008, 0009, 0010 — Category A (additive and backward-compatible).** Every one of the four pending migrations is a pure `CREATE TABLE` and/or nullable/defaulted `ADD COLUMN`, verified by reading each file in full in this task. No explicit reverse SQL exists for any of them (no down-migration mechanism exists in this repository at all — forward-only, per established convention). **D1 migration rollback is not automatic** — if one of these four is ever found to be wrong after being applied, the real recovery path is the D1 Time Travel restore captured above (Category C: backup/point-in-time restore), not an automatic reverse-migration.

**For 0010 specifically:** the real recovery strategy is (a) do nothing — the column is inert and harmless if left in place even if a decision is later made not to use `show_on_homepage`, or (b) a manual, one-off `ALTER TABLE homepage_product_rank DROP COLUMN show_on_homepage;` if the column must be fully removed, or (c) a full D1 Time Travel restore to the pre-migration bookmark if something else in the same apply session also went wrong. None of these three is more than a low-severity operation given the column's `DEFAULT 1`/nullable-adjacent design and zero coupling to Odoo sync.

---

# SAFE DEPLOY ORDER

**Pattern: migration → app deploy** (not "expand → app deploy → cleanup," since none of the four pending migrations requires a later contract/cleanup step — they are all terminal, single-phase additive changes).

Reasoning, from actual verified compatibility, not preference: the *current* app code on `feat/header-hero-integrated` already queries `show_on_homepage` and `catalog_group_labels`/`public_processing_groups` unconditionally. Applying migrations first means the newly-deployed app code renders at full fidelity (Product Showcase populated, Header dropdowns fully localized/populated) the moment it goes live, rather than deploying working-but-degraded code and waiting for a second, separate step. Because every one of the four migrations is provably backward-compatible with the *older*, currently-live app code too (it simply never queries the new tables/columns), applying them first carries no risk to what's live on staging right now.

## STAGING EXECUTION PLAN (proposed — NOT executed in this task)

1. Capture the D1 Time Travel bookmark for `DB_PUBLIC` (staging): `npx wrangler d1 time-travel info DB_PUBLIC --env staging` (read-only).
2. Capture the same for `DB_OPS` (staging), for symmetry, even though nothing is pending there.
3. Record the current staging Worker version as the app-rollback point: `45c44767-0692-4052-be23-3b7d32678e1e` (already captured in this audit).
4. Apply the pending DB_PUBLIC migrations: `npx wrangler d1 migrations apply DB_PUBLIC --env staging --remote` (applies 0007→0008→0009→0010 in one atomic-per-file sequence).
5. Verify: `npx wrangler d1 migrations list DB_PUBLIC --env staging --remote` → expect `✅ No migrations to apply!`.
6. (Optional, harmless no-op safety check) `npx wrangler d1 migrations apply DB_OPS --env staging --remote`.
7. Operator provisions the two required GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and, ideally, a protected `staging` GitHub Environment.
8. Push `feat/header-hero-integrated` to `origin` (Preview-only Vercel side effect, established safe pattern).
9. Confirm `CI / verify` runs and passes on GitHub for the pushed branch.
10. Manually dispatch `deploy-staging.yml` with `confirm=deploy-staging`, targeting ref `feat/header-hero-integrated`.
11. The workflow re-runs install/tests/typecheck/build, then deploys via `npx vinext-cloudflare deploy --env staging`.
12. Run the STAGING SMOKE PLAN (below) against the newly deployed staging Worker.
13. Run the BROWSER ACCEPTANCE PLAN (below) if/when a human is available to do so.
14. If a defect is found in the *application code*: roll back to `45c44767-0692-4052-be23-3b7d32678e1e` (step 3) — the four migrations remain safely in place regardless (Category A). If a defect is somehow found in the *migrations themselves* (considered unlikely given their pure-additive nature): restore from the step-1 bookmark.

---

# FEATURE FLAGS

| Flag | Expected/desired (per frozen architecture) | Remote verified (staging, live version `45c44767...`) |
|---|---|---|
| `PRICE_STRIP_ENABLED` | `"false"` — no real price provider exists yet (`lib/pricing/providers/odoo-price-provider.ts` deliberately throws) | `"false"` — **matches** |
| `ENABLED_PRICE_PROVIDERS` | `""` (empty) | `""` — **matches** |
| `HOMEPAGE_RANKING_MODE` | `"base"` — demand-ranking cron is not wired into `workers/entry.ts` yet, `"auto"` would read a table that is never populated | `"base"` — **matches** |

No Product-Showcase-specific enable flag exists — the section's visibility is controlled entirely by real data eligibility (published templates +, once applied, `show_on_homepage`), not a flag. No flag value needs to change for staging; the live values already match the desired/expected architecture.

---

# INDEXABILITY

**STAGING NOINDEX: YES — verified directly from code, not inferred.** `app/[locale]/page.tsx`'s `generateMetadata` hardcodes `indexable: false` unconditionally (not gated on `APP_ENV`), with an inline comment citing `HOMEPAGE_SPEC.md` §20.5 ("Classified `draft`... keep unindexed until [content owner reviews it]"). This means the Homepage is noindex in **every** environment today, including production — staging automatically inherits this with zero additional action required. The known GEO-G0 debt (Organization/WebSite structured data still emitted from this noindex page) is unchanged and out of scope for this task, consistent with `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §6's existing, correct classification of it as a known, deliberately-deferred defect.

---

# STAGING SMOKE PLAN

Run after a staging app deploy (not executed in this task). All three locales unless noted:

- `/` (fa, default/unprefixed), `/en`, `/ar` → `200`, no server error in body.
- `/fa`, `/en/...`, `/ar/...` variants resolve per the existing `308`-to-unprefixed-fa rule where applicable.
- Header renders on every page; Products/Services dropdowns show real shortcuts (post-migration) or degrade to plain links (pre-migration) — never an empty/broken dropdown, never a 500.
- Hero renders with correct locale copy/CTA.
- Product Showcase: post-migration, real staging D1-backed cards for locales with approved published content (today: `fa` only, per the existing 3-template pilot — `en`/`ar` are expected to legitimately show the section omitted, a content gap, not a defect); pre-migration, the section should be cleanly absent everywhere, never a partial/broken render.
- Buyer Value renders.
- Industries section renders with real imagery (V1.0, per `docs/homepage`'s own closure record).
- Final CTA renders as the last content section.
- Footer renders with the verified phone `tel:` link, correct EN/AR localization (post FOOTER-P1), no stale `?category=` links.
- `/request` (RFQ form) → loads; a real submission is expected to fail closed with `503` (no `TURNSTILE_SECRET_KEY` on staging today) — this is correct, not a regression, until that secret is provisioned.
- `/products` → `200`; one real product detail page (`/products/<slug>`) if staging Catalog data has a published slug (confirm via the existing 3-template pilot data).
- `/services`, `/industries`, `/about`, `/contact` → `200`.
- No stale category links anywhere in the Footer/Header.
- `tel:` link present and correctly formatted for the confirmed phone number.
- Locale `dir` attribute correct (`rtl` for fa/ar, `ltr` for en).
- No Evidence component/slot anywhere (deliberately deferred, per the register).
- Price Strip: absent (flag off) on every page — matches current behavior.
- No new/unexpected JS console or server errors beyond the already-understood, expected `503`s above.

---

# BROWSER ACCEPTANCE PLAN

**Checklist only — not run in this task.** No staging target has been redeployed with the current branch's code yet, and this task's scope is explicitly read-only/audit; a real browser pass belongs to the execution task that actually deploys and smoke-tests staging.

**Viewport widths:** 390, 768, 1024, 1366, 1920.
**Locales:** fa, en, ar.

For each combination, verify:

- Layout integrity — no overflow, no horizontal scroll, no element collision (the RFQ table `min-w-0`/`<colgroup>` fixes and the Footer boundary are known prior fix points to re-confirm, not re-litigate).
- Image crop/aspect ratio correctness (Hero, Industries imagery).
- 200% browser zoom — no clipped text, no broken layout.
- Keyboard-only navigation reaches every interactive element in a sensible order; visible focus rings throughout.
- `prefers-reduced-motion` — the `Reveal` animation wrapper and any other motion respects it (per `01-sources/MOTION_GUIDELINES.md`).
- Final CTA / Footer visual boundary is clean (no visual collision, per Final CTA's own frozen spec).
- Header mobile nav drawer opens/closes correctly, contains the correct phone/contact action.
- Every translated button/label fits its container at every width (a known EN/AR length-sensitivity risk area per prior Footer/Header work).

---

# BRANCH / PUSH / CI PLAN

**FEATURE BRANCH PUSH: SAFE** — see PUSH SIDE EFFECTS and VERCEL INTEGRATION above; not a novel risk, a repeated and already-proven-safe pattern in this exact repository.

**MERGE TO MAIN BEFORE STAGING: NOT REQUIRED.** `workflow_dispatch` can target any ref carrying the workflow file — `deploy-staging.yml` can be dispatched directly against `feat/header-hero-integrated` (or any other feature branch/ref) once pushed, with no dependency on `main` at all. Recommended flow:

```
feature branch push (this branch, or any future one)
  → CI (`CI / verify`) runs automatically on push/PR
  → (optional) open a PR for visibility/review — not required by any workflow
  → operator manually dispatches deploy-staging.yml against the exact ref to be staged
```

Merging to `main` remains a separate, later, explicitly-owner-approved decision — gated on first resolving the Vercel Git-integration risk (VERCEL INTEGRATION above), not on anything staging-related.

---

# NODE GOVERNANCE

**NON-BLOCKING TOOLING DEBT.** CI pins Node `24` (`actions/setup-node`, `node-version: "24"`), sourced from `01-sources/STACK.md`'s own "Locked" declaration — not a guess. The repository lacks `.nvmrc`/`.node-version`/`package.json engines`, so a local developer's Node version could in principle drift from CI's, but this has no bearing on whether a *remote* staging deploy succeeds (the deploy runs entirely inside the pinned-Node GitHub Actions runner, never on a local machine's unpinned Node). Not fixed in this audit (out of scope — read-only task); still recommended as a small future addition.

---

# PACKAGE MANAGER GOVERNANCE

**DOCUMENTATION DEBT / NON-BLOCKING**, unchanged from DAR-055. Re-confirmed, not reopened: CI uses `npm ci` against the repository's real, only lockfile (`package-lock.json`); `01-sources/STACK.md`'s conflicting "pnpm" declaration remains stale and is deferred to a future controlled documentation-cleanup pass, exactly as DAR-055 already recorded. No new evidence surfaced in this task that changes that classification.

---

# GO / NO-GO GATES

| Gate | Status |
|---|---|
| G1 — working tree clean | **PASS** (verified at preflight and again at final cleanliness) |
| G2 — CI workflows pushed and `CI / verify` green | **NOT YET** — branch not pushed; workflows exist locally and pass every check that can be run locally (`npm test`/`tsc`/`build`) |
| G3 — staging GitHub Environment confirmed | **GAP** — verified absent (read-only `gh api`); operator must create it |
| G4 — Cloudflare secret names configured | **GAP** — verified 0 secrets exist (read-only `gh api`); operator must add `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` |
| G5 — staging/prod resources proven separate | **PASS** — every ID distinct, confirmed by config + live read-only D1 checks |
| G6 — recovery point captured | **NOT YET** — procedure fully defined (D1 Time Travel + captured current Worker version `45c44767...`), not executed; this is a pre-migration step for the execution task, not this audit |
| G7 — migration inventory confirmed | **PASS (this document)** — closes a real, previously-unrecorded gap (0007–0009 were not tracked as pending anywhere before this audit) |
| G8 — required staging migrations applied successfully | **NOT YET** — 0007–0010 remain pending on real staging DB_PUBLIC (verified) |
| G9 — app deploy successful | **NOT YET** — no deploy performed |
| G10 — smoke tests pass | **NOT YET** — plan defined, not run |
| G11 — browser acceptance pass | **NOT YET** — checklist defined, not run |
| G12 — no unexpected Evidence exposure | **PASS** — confirmed absent in current code, matches the deliberate deferral |
| G13 — staging remains noindex | **PASS** — verified in code (`indexable: false`, unconditional) |

---

# OPERATOR ACTIONS REQUIRED

1. Create/configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository (or `staging` Environment) secrets — values never touched or requested by this task.
2. Create a GitHub Environment named exactly `staging`; configure protection rules (required reviewers / branch restriction) if desired — currently absent entirely.
3. Decide and authorize when to apply the four pending `DB_PUBLIC` migrations (`0007`–`0010`) to staging (and, on its own separate schedule, to production) — this audit found them and designed the safe order/recovery plan, but applying them is a distinct, explicit action for a future task.
4. Decide whether/when to provision `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` as Cloudflare Secrets for the **staging** environment — both are currently absent, so RFQ submission and Odoo sync fail closed (correctly, not a defect) on staging today.
5. When ready, push `feat/header-hero-integrated` (Preview-only Vercel side effect, already an established safe pattern) and dispatch `deploy-staging.yml` against it.
6. Continue to leave Vercel's Git integration connected and `main` untouched until the separate, later, explicitly-owned decision to disconnect it or reassign its Production Branch (unchanged from the existing runbook — not re-decided here).

---

# REMOTE ACTIONS NOT PERFORMED

No `wrangler deploy`/`versions upload`/`vinext-cloudflare deploy` was run. No D1 migration was applied to any environment (only read-only `wrangler d1 migrations list` — a listing query against D1's own tracking table, identical in kind to the read-only checks this project's own DAR-047 already used as precedent). No GitHub secret was created, modified, or read (only a names-only listing, `total_count` and an empty array — no secret object carries a value in that API response). No GitHub Environment, branch protection rule, or repository setting was created or changed (only `GET` requests: `.../environments`, `.../branches/main/protection`, `.../actions/secrets`, `.../actions/workflows`). No push, merge, or tag. No Odoo call. No Cloudflare binding, database, queue, or secret was created, deleted, or modified. No runtime application code was modified.

---

# STG-P1 INPUTS

For a future STG-P1 (or equivalently-scoped) execution task:

1. All five OPERATOR ACTIONS REQUIRED above.
2. The exact STAGING EXECUTION PLAN (14 steps) in the SAFE DEPLOY ORDER section — ready to execute once the operator actions land.
3. The exact pre-captured rollback point (staging Worker version `45c44767-0692-4052-be23-3b7d32678e1e`) and the D1 Time Travel bookmark procedure (not yet captured — must be captured fresh immediately before the real migration apply, since a bookmark captured today would be stale by execution time).
4. The STAGING SMOKE PLAN and BROWSER ACCEPTANCE PLAN checklists, ready to run post-deploy.

---

# READY FOR STG-P1

**YES** — contingent on the operator actions above; nothing found in this audit blocks proceeding once GitHub secrets/Environment exist and the four pending migrations are deliberately, explicitly applied per the plan in this document.
