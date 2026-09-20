# Production Deploy Workflow — Final Architecture Specification

**Scope:** Design review only. `deploy-production.yml` is **not created** by this task. No file other than this one was modified. No deploy, no Cloudflare mutation, no D1 mutation, no secret change. All Cloudflare/D1/GitHub facts below were re-verified with read-only commands in this session immediately before writing this document.
**Repository:** `rezachidotnet/ahanassa-website`
**Date:** 2026-09-19
**Supersedes-and-finalizes:** `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md`'s `WORKFLOW_REQUIREMENTS` (R1–R12), `ROLLBACK_POLICY`, `MIGRATION_POLICY`, and `SMOKE_TEST_POLICY` sections, now that the preconditions those sections were written against have materially changed — see §0.

---

# 0. What Changed Since the Prior Architecture Document

`PRODUCTION_RELEASE_ARCHITECTURE_V1.md` (written 2026-09-19, same day) listed five Phase-0 preconditions that had to clear before this workflow could be designed in final form. Re-verified live in this session:

| # | Precondition | Status now |
| --- | --- | --- |
| 0.1 | Delete/rename the Vercel-leftover `Production` GitHub Environment | ✅ **Done** — deleted; `docs/release/GITHUB_PRODUCTION_ENVIRONMENT_SETUP_REPORT.md` |
| 0.2 | Name the release approver | ✅ **Done** — Reza (`rezachidotnet`), confirmed live as the `required_reviewers` entry on the `production` environment |
| 0.3 | Pin `package.json` dependencies to concrete versions | 🟡 **Still open** — `grep -c '"latest"' package.json` → **18**, re-verified this session, unchanged since the last audit |
| 0.4 | Bring production D1 level with staging | ✅ **Done** — `wrangler d1 migrations list DB_OPS/DB_PUBLIC --env production --remote` → `✅ No migrations to apply!` on both, re-verified this session; staging shows the identical result on both |
| 0.5 | Verify secret inheritance across `wrangler versions upload` | 🟡 **Still open** — no report in `docs/release/` has ever tested this; unchanged since the last audit |

Additionally, since that document was written: the `production` GitHub Environment now exists with the required reviewer, custom-branch-policy mode, one branch rule (`feat/header-hero-integrated`), and both Cloudflare secrets present (names re-verified live; no value read) — closing Phase 1 of that document's own implementation plan. `lib/ci/workflow-invariants.test.ts` has also been rewritten (`docs/release/PRODUCTION_WORKFLOW_INVARIANT_UPDATE_REPORT.md`) so that `deploy-production.yml` is now the one workflow name the test suite *permits* to reference production — every other workflow, present or future, still fails the suite if it does.

**This document takes the above as given and specifies the workflow's final shape.** Items 0.3 and 0.5 remain open — they are listed as BLOCKERS at the end, not resolved by this design, and not required to finish writing the spec.

---

# 1. Trigger Model

```yaml
on:
  workflow_dispatch:
    inputs:
      deploy_ref:
        description: >-
          Full 40-character commit SHA to deploy. Must already have a
          successful Deploy Staging run (workflow 361701517) for this exact
          SHA — see §3. No default; a mutable default would destroy the
          promotion guarantee.
        required: true
        type: string
      confirm:
        description: >-
          Type exactly "deploy-production" to confirm. Deliberately
          different from staging's "deploy-staging" so operator muscle
          memory cannot cross environments.
        required: true
        type: string
      rollout_percentage:
        description: Traffic percentage for the new version.
        required: true
        type: choice
        options: ["10", "50", "100"]
        default: "100"
      skip_staging_provenance:
        description: >-
          Break-glass only. Set true only for a hotfix SHA that legitimately
          never went to staging. Emits a loud warning into the job summary
          and the release report. Approver-only in practice, since dispatch
          already requires passing the `production` environment's reviewer
          gate.
        required: false
        type: boolean
        default: false
```

**No Cloudflare target is ever an input** — Worker name, D1 identities, routes, and the account stay fixed in `wrangler.jsonc` and the environment's secrets, never in `workflow_dispatch.inputs`. This is inherited verbatim from `deploy-staging.yml` (already invariant-tested: `staging deploy workflow takes no Cloudflare target as operator input`) and is the single most important thing to *not* relax for convenience.

**SHA validation — production-only hardening beyond staging.** `deploy-staging.yml` tolerates a branch name in `deploy_ref` for operator convenience. Production must not: the very first executable step (before checkout) rejects anything that isn't a full 40-character lowercase-hex string:

```bash
if ! [[ "${{ inputs.deploy_ref }}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::deploy_ref must be a full 40-character hexadecimal commit SHA, not a branch name or short SHA."
  exit 1
fi
```

**Confirmation input — needed, and here's exactly why it isn't redundant with the reviewer gate.** The `production` GitHub Environment's required-reviewer rule (§2) stops the *job* from running until Reza approves. The typed `confirm: "deploy-production"` string is a *different* failure mode it does not cover: a correct reviewer, on the correct environment, who fat-fingers the dispatch form itself (wrong `deploy_ref` pasted, wrong workflow selected from a dropdown of two visually similar names). Both controls are cheap to keep and check for different mistakes; neither substitutes for the other.

---

# 2. Approval Gate

```yaml
jobs:
  deploy-production:
    environment: production   # the environment created in the prior task — never "Production"
```

Live-verified configuration of `production` (re-checked this session, unchanged since setup):

| Field | Value |
| --- | --- |
| Required reviewer | `rezachidotnet` (Reza), `prevent_self_review: false` |
| Reviewer count | 1 |
| Deployment branch policy | Custom, one rule: `feat/header-hero-integrated` |
| Secrets | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (names confirmed; values never read) |
| `wait_timer` | `0` |

**Behavior at dispatch time:** GitHub pauses the job **before any step runs** — including `actions/checkout` — until Reza approves the run in the Environments UI. A job that is never approved never executes, never receives the environment's secrets, and never touches the checked-out ref. This is the actual gate; the `confirm` input (§1) is a secondary, different-purpose check, not a substitute for it.

**Branch policy interaction:** dispatching this workflow itself is only possible from `feat/header-hero-integrated` (the branch the environment's rule names) — a separate, coarser restriction than `deploy_ref` (which names the *application* SHA being deployed, potentially a different, older, or already-merged commit). Both restrictions apply simultaneously: the *dispatching* ref must be an allowed branch, and the *deployed* ref must satisfy §1's SHA format and §3's provenance check.

---

# 3. Staging Provenance Verification

**Requirement, stated exactly as given:** verify `deploy_ref` was successfully deployed to staging, via workflow `361701517`, with a successful conclusion. Fail if no matching success exists.

**Re-confirmed live this session:** `GET /repos/rezachidotnet/ahanassa-website/actions/workflows` lists exactly two workflows — `CI` (`357303552`) and `Deploy Staging` (`361701517`, path `.github/workflows/deploy-staging.yml`). The id in the requirement matches the live workflow id exactly; nothing needs to be looked up or guessed at implementation time.

**Design:**

```bash
RUNS_JSON="$(gh api "repos/rezachidotnet/ahanassa-website/actions/workflows/361701517/runs?status=success&per_page=100")"
# Paginate if needed — a long-lived repo can exceed 100 successful staging runs.
MATCH="$(echo "$RUNS_JSON" | jq -r --arg sha "$DEPLOY_REF" \
  '.workflow_runs[] | select(.inputs.deploy_ref == $sha) | .id' | head -n1)"

if [ -z "$MATCH" ] && [ "${{ inputs.skip_staging_provenance }}" != "true" ]; then
  echo "::error::No successful Deploy Staging run (workflow 361701517) found for deploy_ref=$DEPLOY_REF. This SHA has not been proven on staging."
  exit 1
fi
if [ -n "$MATCH" ]; then
  echo "Staging provenance confirmed: run $MATCH deployed $DEPLOY_REF successfully."
elif [ "${{ inputs.skip_staging_provenance }}" == "true" ]; then
  echo "::warning::skip_staging_provenance=true — deploying $DEPLOY_REF with NO staging proof. This must be justified in the release report."
fi
```

**Implementation notes:**
- Requires `permissions: actions: read` in addition to `contents: read` — the only reason this workflow needs that scope.
- `workflow_dispatch` run `inputs` are queryable via the Actions API on the run object (`.inputs.deploy_ref`) for runs triggered the same way `deploy-staging.yml` is — confirm the exact field shape against a live run during the dry-run phase (§implementation below) rather than assuming the schema; GitHub's API has changed `inputs` visibility/shape across versions before.
- **Fails closed on ambiguity.** An unreachable API, a rate limit, or a malformed response must be treated as "not verified," never as "verified." This is a deliberate dependency the design accepts (see BLOCKERS/RISKS, `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` RK6) rather than a flaw to design around — the alternative (trusting an operator's claim that a SHA was staged) is worse.
- `skip_staging_provenance` is a break-glass path already gated by the reviewer approval in §2 — using it still requires Reza's own approval to run at all, so it cannot be exercised by anyone who couldn't already deploy unconditionally. It must be loudly recorded in the job summary and the release report (§10) every time it is used, precisely so infrequent, legitimate use stays visible and frequent use becomes an auditable signal that the staging path has a problem the flag is masking.

---

# 4. Production Target Safety

**Requirement, stated exactly as given:** before deployment, verify Worker name == `ahanassa-production`, D1 bindings match production, and environment is production. Must fail closed.

**Live-verified values to pin** (re-checked this session against both `wrangler.jsonc` and live Cloudflare state):

| Check | Required value |
| --- | --- |
| Worker name | `ahanassa-production` |
| `DB_OPS` binding | `ahanassa-ops-production` / `7240a6a7-c293-4e6e-baf3-95838a3c2944` |
| `DB_PUBLIC` binding | `ahanassa-public-production` / `73ba6b50-ef57-4d89-baa9-617a0b0af127` |
| `vars.APP_ENV` | `production` |

This is implemented as an inline Node script embedded directly in the workflow YAML — never a file checked out from the untrusted `deploy_ref` — parsing `wrangler.jsonc` (JSONC-tolerant, matching `deploy-staging.yml`'s own `assert-staging.cjs` pattern exactly) and asserting **all** of the above, plus three additional checks already proven valuable by the staging design and worth carrying forward rather than re-deriving later:

| Additional check (beyond the three explicitly requested) | Why it belongs here |
| --- | --- |
| `routes` contains exactly `{pattern: "www.ahanassa.com", custom_domain: true}` | Guards against a deploy that silently detaches the live custom domain |
| `workers_dev === true` | Guards against the exact regression class recorded in `DOCUMENT_AUDIT_REPORT.md` DAR-050 (a Custom Domain attach attempt once silently disabled `workers_dev`) |
| Cron triggers exactly `["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]` | A trigger change must be a deliberate, reviewed config commit, never a deploy-time surprise — also relevant because the account is at 4-of-5 Workers-plan trigger slots used, so an unreviewed addition here would collide with that cap |
| Literal-free scan: no string anywhere under `env.production` may name the staging Worker/databases/queues | Mirror image of staging's own live-environment scan; keeps a doctored ref from redirecting this workflow at the wrong target in either direction |

**Fail-closed behavior:** this assertion runs **before `setup-node`, before `npm ci`, before any build step** — identical ordering to staging's own `assert-staging.cjs`, which already runs before checkout-derived code executes. A failure here means no code from `deploy_ref` has run yet in any capacity.

**Ordering relative to §3:** A1 (this section) → A2 (§3, staging provenance) → A3 (§5, migration parity), in that order — A1 is cheapest and most security-critical (pure local file parsing, no network call), A3 touches the network last and is the most expensive to run repeatedly during a failed dry-run.

---

# 5. Migration Parity Gate

**Requirement, stated exactly as given:** verify `DB_OPS`/`DB_PUBLIC` migrations are applied, and that the deployed SHA does not require unapplied production migrations. Do not auto-apply migrations unless explicitly justified.

**Design — read-only only, never a write:**

```bash
DB_OPS_PENDING="$(npx wrangler d1 migrations list DB_OPS --env production --remote 2>&1)"
DB_PUBLIC_PENDING="$(npx wrangler d1 migrations list DB_PUBLIC --env production --remote 2>&1)"

if ! echo "$DB_OPS_PENDING" | grep -q "No migrations to apply"; then
  echo "::error::DB_OPS has migrations pending on production that deploy_ref's code may depend on:"
  echo "$DB_OPS_PENDING"
  exit 1
fi
if ! echo "$DB_PUBLIC_PENDING" | grep -q "No migrations to apply"; then
  echo "::error::DB_PUBLIC has migrations pending on production. See docs/release/CI_CD_POLICY.md — migrations are a separate, manual, human-run action, never auto-applied by this workflow."
  exit 1
fi
```

**Why this is a pending-migration check on production, not a diff against `deploy_ref`'s migration files specifically:** `wrangler d1 migrations list` already compares the migration files present in the checked-out `deploy_ref` (via `migrations_dir` in `wrangler.jsonc`) against what production's `d1_migrations` bookkeeping table records as applied — so "any pending migration" and "`deploy_ref` requires a migration production hasn't applied" are the same condition in practice, given migrations are applied strictly in order and never skipped. This is exactly the control that — had it existed earlier — would have caught this project's own real, now-resolved incident: production ran 16 days stale while `DB_OPS 0005` and `DB_PUBLIC 0007–0010` sat unapplied, a gap `docs/release/PRODUCTION_CLOUDFLARE_DEPLOYMENT_READINESS_AUDIT.md` found and named the single severe, previously-undocumented blocker of this entire release track.

**"Do not apply migrations automatically unless explicitly justified" — honored by construction:** this gate only ever reads (`d1 migrations list`, never `d1 migrations apply`). If it fails, the workflow stops; a human runs the documented, separate manual procedure (`npx wrangler d1 migrations apply <DB> --env production --remote`, per `docs/release/CI_CD_POLICY.md` and the two migration-parity precedent reports already on file — `docs/release/DB_PUBLIC_PRODUCTION_MIGRATION_PARITY_REPORT.md`, `docs/release/RFQ_LENGTH_MM_PRODUCTION_MIGRATION_REPORT.md`) — capturing a D1 Time Travel recovery bookmark first, exactly as both prior reports did. No exception is designed into this workflow for auto-applying a migration, and none should be added later without a separate, explicit, owner-approved change to this policy.

---

# 6. Deployment Method

## Option A — `wrangler deploy` / `vinext-cloudflare deploy` (one-shot)

Builds and deploys straight to 100% traffic in a single command, with no intermediate, addressable handle. This is what `deploy-staging.yml` uses today (`npx vinext-cloudflare deploy --env staging`) and what every past *manual* production release also used.

## Option B — Two-phase `wrangler versions upload` → `wrangler versions deploy`

```bash
# Phase 1 — upload, zero traffic shift
NEW_VERSION_ID="$(npx wrangler versions upload --config dist/server/wrangler.json \
  --message "Release ${TAG} — SHA ${DEPLOYED_SHA} — run ${GITHUB_RUN_ID}" \
  | grep -oE '[0-9a-f-]{36}' | head -1)"

# Verify secrets before promoting (§7)
npx wrangler versions view "$NEW_VERSION_ID" | grep -q CLOUDFLARE_API_TOKEN || { echo "::error::secret not inherited"; exit 1; }

# Phase 2 — promote at the requested percentage
npx wrangler versions deploy "$NEW_VERSION_ID"@"${{ inputs.rollout_percentage }}" \
  --config dist/server/wrangler.json
```

## Decision: **Option B**, for four concrete reasons

| Reason | Detail |
| --- | --- |
| **A rollback handle exists before traffic moves** | Phase 1 yields `NEW_VERSION_ID`; if Phase 2 or the smoke gate (§8) fails, the prior version is still serving 100% and is named — there is no window where a bad version is live with nothing to roll back *to* |
| **Staged rollout becomes possible** | `@10` → observe → `@100` is expressible; Option A cannot express a percentage at all |
| **It matches this project's own real production history** | Every past *manual* production release (`docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`) already used exactly this two-phase mechanism — Option B introduces no new, unproven tool at the most dangerous moment; it formalizes what a human already does by hand |
| **Bindings are reviewable between phases** | `wrangler versions view` between Phase 1 and Phase 2 is how §7's secret-inheritance check becomes possible at all — Option A gives no such window |

**Two caveats this design must handle explicitly, not silently assume away:**

- **`versions upload` does not apply cron trigger changes.** Confirmed at `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md:111` and re-confirmed during real staging cron work on 2026-09-19: trigger changes take effect on `wrangler deploy`/`versions deploy`/`triggers deploy`, never on `versions upload` alone. Since §4's assertion pins the cron list, any *intended* trigger change is a reviewed config commit whose application must be positively verified after Phase 2 — not assumed.
- **Secret inheritance across a newly uploaded version is unverified** (open precondition 0.5, §0) — this design's §7 mitigation (assert secrets present on `NEW_VERSION_ID` between Phase 1 and Phase 2) is the control that makes Option B safe *regardless* of how that question resolves: if secrets don't inherit, this check fails closed before any traffic shifts, rather than promoting a version that would serve Turnstile/RFQ failures to real users.

Option A remains available as a *documented fallback* only if Option B's mechanism is found unavailable on this Cloudflare plan during the dry-run (§implementation) — not as a co-equal default.

---

# 7. Secret Handling

| Question | Answer |
| --- | --- |
| Where are secrets read from? | GitHub Environment secrets scoped to `production` — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Never repository-level (repo-level Actions secrets are confirmed `total_count: 0` — correct posture for a public repo), never hardcoded, never passed as a `workflow_dispatch` input |
| How are they exposed to steps? | `env: { CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}, CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }} }` on exactly the step(s) that invoke `wrangler` — not job-wide, matching the principle of least exposure already used implicitly by `deploy-staging.yml` |
| When do they become available? | Only after the `production` environment's required-reviewer gate (§2) passes — a run awaiting approval has no secret access. A run whose `deploy_ref`/`confirm`/A1–A3 checks fail *before* the deploy step never reaches a step where secrets are referenced, even though they were technically available to the job from the start (environment secrets attach at job level, not per-step) |
| How is availability verified? | **Names only, never values.** `wrangler versions view "$NEW_VERSION_ID"` (§6) is inspected for the *presence* of each secret's key name on the uploaded version — this is the "secret inheritance" check from precondition 0.5, executed live on every real release rather than assumed once and trusted forever |
| What must never happen | The value is never `echo`'d, never written to the job summary, never included in the release report (§10), never logged even under `::debug::`. GitHub Actions' own secret-masking is a second layer, not the only one relied on — the workflow must not construct a string containing the secret value and pass it anywhere except the `wrangler`/`gh` command's own environment |

---

# 8. Smoke Tests

**Rules (unchanged from the existing design, restated for this document's completeness):** mandatory and blocking; run against the real hostname `https://www.ahanassa.com`, never `*.workers.dev`; any 5xx is an automatic failure; structural assertions only (assert *that* a page renders products, never *which* ones — production's synced catalog differs from staging's); compare against a pre-deploy baseline captured by the same run before promotion.

## Mandatory checks (the minimum this task names, plus the structural checks already designed around them)

| # | Area | Check | Pass criterion |
| --- | --- | --- | --- |
| S1 | Homepage | `GET /` | 200, `<html lang="fa" dir="rtl">` |
| S2 | `/fa` | `GET /fa` | 308 → `/` (the `fa` locale prefix redirect, proving migration `0006`'s route-redirect logic is live) |
| S3 | `/en` | `GET /en` | 200, `lang="en" dir="ltr"` |
| S4 | Services | `GET /services`, `/en/services`, `/ar/services` | 200 — this is the page the Header Services dropdown depends on via `public_processing_groups` (migration `0007`) |
| S5 | Catalog index | `GET /products` | 200, ≥1 product detail link present |
| S6 | Catalog detail | first slug discovered in S5 | 200, localized `<h1>` present — proves `DB_PUBLIC` connectivity end-to-end, and is the same check that would have caught the now-resolved 16-day production/staging schema gap |
| S7 | RFQ page render | `GET /contact` | 200, `<form>` present with `company`, `phoneCountry`, `phoneLocal` fields, Turnstile widget markup present |
| S8 | Not-found handling | `GET /products/<nonexistent-slug>` | 404, **not 500** — a 500 indicates a broken data path, not a missing page |
| S9 | Security headers | on `/` | `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, CSP all present |
| S10 | Apex | `GET https://ahanassa.com/` | 308 → `https://www.ahanassa.com/` — asserts the redirect only, not `server:`, so this check stays valid regardless of which platform serves the apex |

## Which checks require real customer submission credentials — and why none of the mandatory checks do

**None of S1–S10 submits an RFQ.** `TURNSTILE_SECRET_KEY` and `ODOO_RFQ_API_TOKEN` are both confirmed present on the live production Worker (re-verified in the prior readiness audit), but the Odoo RFQ API has exactly one global Bearer token with no environment or test scoping — there is no non-production credential to safely exercise a real submission against, and a real customer-identity RFQ must never be submitted as an automated check under any circumstance. **S7 therefore verifies form presence and required fields only** — it does not, and must not, `POST` to `/api/rfqs`.

If an end-to-end RFQ proof is ever wanted at release time, it requires:
- **Real production credentials** (already present, so technically capable of accepting a submission), **and**
- **Explicit, separate owner authorization** for that specific release, **and**
- **The established `(SYNTHETIC)` company-name / `.invalid` email-domain convention** (already used and proven in `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` §14), never a real customer's data.

This is a deliberate, standing limitation of the automated smoke gate, not a gap in it — the RFQ conversion path's true first live exercise after any given release remains a real customer submission, which is exactly why the post-release observation checklist below (queue/DLQ/outbox health) carries more weight here than the smoke gate itself for that one specific path.

## Post-release observation (non-blocking, human, first hour/week)

`wrangler tail`/Observability for the first hour; `catalog_sync_state` after the next scheduled cron firing; `dead_letter_records` daily for the first week; Queue producer/consumer and RFQ outbox drain health; Turnstile success rate on the real hostname.

---

# 9. Rollback

## Capture — before any traffic shift (Phase 1/2 boundary in §6)

```bash
PREVIOUS_VERSION_ID="$(npx wrangler deployments list --name ahanassa-production | head -20 | grep -oE '[0-9a-f-]{36}' | head -1)"
```

Live-verified this session: the currently-serving version is `b07d8697-620c-485c-8fed-21b893ab602c` (unchanged since 2026-09-03T19:00:45Z — no application deploy has touched production since then), and the immediately-prior version `c3650d51-b3b1-4589-a892-04c5adc9584e` is the current safe rollback target (post-Basic-Auth-removal lineage, confirmed not to reintroduce the old Basic Auth gate). `PREVIOUS_VERSION_ID` must be emitted into the job summary, a job output, and the release report (§10) — **"a release whose rollback target was not captured is not a completed release."**

## Rollback commands

```bash
# Explicit target — preferred, unambiguous about which version is restored:
npx wrangler versions deploy "$PREVIOUS_VERSION_ID"@100 --config dist/server/wrangler.json

# Immediately-prior version, if the id was somehow not captured:
npx wrangler rollback --name ahanassa-production
```

## What the workflow itself does on a smoke-gate failure

**No automatic rollback.** The workflow fails loudly, prints the exact rollback command with `PREVIOUS_VERSION_ID` already substituted, and stops. An automatic rollback on smoke failure is attractive but wrong here: a smoke failure caused by a *migration* is not fixed by reverting the Worker, and an automated revert could mask a partially-applied data change. A human decides, with the deciding-and-locating work already done for them.

## What happens to D1 changes on a Worker rollback

- **A Worker rollback never rolls back D1.** Rolling back the Worker after §5's migrations have been confirmed applied is safe *only when* those migrations are additive (nullable `ADD COLUMN` / new `CREATE TABLE`, the pattern both real production migrations applied so far have used) — the older, rolled-back-to Worker code simply never queries the new columns/tables. This is not a general guarantee; it must be re-confirmed per-migration, not assumed permanently true.
- **No down-migrations exist anywhere in this repository.** The established convention is forward-only — a corrective migration, never a reverse-apply script.
- **Cloudflare D1 Time Travel is the real database recovery mechanism**, restricted to an incident decision, never a routine rollback step — it discards any row written after the bookmark, including any RFQ submitted after that point.
- **RFQ durability is preserved across a Worker-level rollback (L1) or a DNS-level rollback (L3), but not across a D1 Time Travel restore (L4).** The durable-first-write path (`POST /api/rfqs` → D1 → outbox → Queue → Odoo) means anything already written to `DB_OPS` stays there and continues syncing to Odoo regardless of which Worker version or hostname currently receives new traffic — a rollback only affects *new* submissions during the rollback window, which is correct behavior, not data loss. This guarantee does not extend to L4; the two must never be conflated.
- **A fresh Time Travel bookmark must be captured before every future migration**, not assumed to carry forward from a prior one — this workflow does not capture one itself (it only verifies parity, per §5), so the manual migration procedure remains responsible for its own bookmark, exactly as the two precedent reports already did.

---

# 10. Evidence — Generated Artifacts

Every real production release run produces three artifacts, following this repository's existing `docs/release/` naming conventions (`*_REPORT.md`, `docs/evidence/<topic>/*.json`) rather than inventing a new scheme:

| Artifact | Path pattern | Contents |
| --- | --- | --- |
| **Production deploy report** | `docs/release/PRODUCTION_DEPLOY_<YYYY-MM-DD>_<short-sha>_REPORT.md` | Tag, full `DEPLOYED_SHA`, `NEW_VERSION_ID`, `PREVIOUS_VERSION_ID`, `rollout_percentage`, staging-provenance run id (or the `skip_staging_provenance` justification if used), migration-parity result, full smoke-gate result table (S1–S10), post-release observation notes, approver identity and approval timestamp (from the GitHub Environment's own deployment-review record, not re-typed by hand) |
| **Recovery snapshot** | `docs/evidence/production_deploy_<YYYY-MM-DD>/PRE_DEPLOY_SNAPSHOT.json` | Mirrors the format already used in `docs/evidence/post_p3f_rfq_length_mm/` and `docs/evidence/post_p3f_catalog_sync/`: pre-deploy row counts for both D1 databases' key tables, the currently-serving `PREVIOUS_VERSION_ID`, and — only if §5's gate required a migration to be applied first, as a separate manual step before this workflow runs — that migration's own D1 Time Travel bookmark(s), copied in from the migration's own report rather than re-captured here |
| **Deployment manifest** | `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` | A single, append-only, running ledger (one row per release, oldest first) — tag, SHA, both version ids, rollout percentage, approver, timestamp, link to that release's own report above. This is the "lookup, not archaeology" mechanism `PRODUCTION_RELEASE_ARCHITECTURE_V1.md`'s `ROLLBACK_POLICY` calls for, given zero git tags exist today (§0) |

The workflow's own job summary (`$GITHUB_STEP_SUMMARY`) is the live, in-run version of the same information — matching `deploy-staging.yml`'s existing pattern of writing a summary table — and the report/manifest above are the durable, committed record of it, written as a follow-up documentation commit after the run completes (mirroring how every prior migration/audit report in this repository was produced: by a human or agent reading the run's own output, not by the workflow committing to the repository itself — this workflow should not be granted `contents: write`).

---

# RESULT

## PASS

The architecture specified above is complete, internally consistent, and answers all ten requirements this task posed, each cross-checked against the two real precedents already in this repository (`deploy-staging.yml`'s proven mechanics, and the real manual production releases recorded in `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md`) rather than invented from scratch. It is ready to be implemented in a future, separate task (`PRODUCTION_RELEASE_ARCHITECTURE_V1.md` Phase 3), subject to the blockers below.

---

# ARCHITECTURE

**Trigger:** `workflow_dispatch` only; `deploy_ref` (required, `^[0-9a-f]{40}$`), `confirm` (`"deploy-production"`), `rollout_percentage` (`10|50|100`), `skip_staging_provenance` (break-glass, default `false`).
**Gate:** `environment: production` — required reviewer Reza, custom branch policy (`feat/header-hero-integrated`), environment-scoped `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` (all live-verified present, §0/§2).
**Safety assertions, in order, all before `npm ci`:** A1 production target (§4) → A2 staging provenance against workflow `361701517` (§3) → A3 migration parity, read-only (§5).
**Build:** `CLOUDFLARE_ENV=production npx vinext build`, tests and typecheck re-run on the runner (not trusted from staging).
**Deploy:** two-phase `wrangler versions upload` → verify secret inheritance on the new version → `wrangler versions deploy <id>@<rollout_percentage>` (§6/§7).
**Post-deploy:** mandatory blocking smoke gate S1–S10 (§8) against `https://www.ahanassa.com`; no automatic rollback on failure — fail loud with the rollback command pre-filled (§9).
**Evidence:** per-release report, recovery snapshot, and an append-only deployment manifest (§10).

---

# BLOCKERS

None of these block *this design document*; all block *dispatching the workflow once it is authored*.

| # | Blocker | Type | Status |
| --- | --- | --- | --- |
| 1 | `deploy-production.yml` does not exist — authoring it is a separate, not-yet-authorized task | Engineering | Deliberately out of this task's scope |
| 2 | Secret inheritance across `wrangler versions upload` has never been tested (precondition 0.5) | Engineering (verification) | Open — resolve with one real, non-traffic-shifting `versions upload` + `versions view` check before the first automated release |
| 3 | `package.json` still pins 18 dependency declarations to `"latest"` (precondition 0.3) | Engineering | Open — weakens the exact-SHA reproducibility guarantee this whole design depends on |
| 4 | Zero git tags exist | Engineering (process) | Open — the deployment manifest (§10) partially compensates but tagging should still start at the first real release |
| 5 | No in-workflow smoke gate exists in `deploy-staging.yml` yet — the architecture's own sequencing calls for proving the smoke-gate mechanism on staging first, where a failure is cheap, before it is trusted as production's own release gate | Engineering | Open — recommended backport, not yet done |
| 6 | The `deploy_ref`/`inputs` field shape returned by the Actions API for a `workflow_dispatch` run has not been confirmed live against a real `Deploy Staging` run in this session — §3's design assumes `.inputs.deploy_ref` is queryable this way, matching GitHub's documented behavior, but this should be confirmed against a real run before relying on it in a fail-closed check | Engineering (verification) | Open — cheap to confirm, not yet done |

---

# RECOMMENDED NEXT STEP

Resolve blockers 2, 3, and 6 above first — each is a same-day, low-risk verification/mechanical task with no owner decision required. Then backport the smoke-gate mechanism and `PREVIOUS_VERSION_ID` capture into `deploy-staging.yml` (blocker 5) and exercise it with one real staging deployment, proving the exact code this design reuses for production where a mistake is cheap. Only then author `deploy-production.yml` itself from this specification, extend `lib/ci/workflow-invariants.test.ts`'s already-dormant shape check (`docs/release/PRODUCTION_WORKFLOW_INVARIANT_UPDATE_REPORT.md`) to activate against it, and proceed to a dry run (invalid `deploy_ref`, then a SHA that never reached staging, confirming every assertion fails closed) before the first real release at `rollout_percentage: 10`.

---

**NO WORKFLOW FILE CREATED. NO DEPLOYMENT. NO CLOUDFLARE OR D1 MUTATION. NO SECRET VALUE READ OR PRINTED.** Every command run in this session was a read: `git tag`, `grep -c`, `wrangler d1 migrations list --remote` (×4), `wrangler deployments list`, and read-only GitHub REST API `GET`s.
