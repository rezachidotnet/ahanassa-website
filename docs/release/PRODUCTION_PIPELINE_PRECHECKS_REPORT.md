# Production Pipeline Prechecks Report

**Scope:** Verification only. No workflow created, no deploy, no file modified other than this report, no Cloudflare or D1 mutation. Every command below was a read: `wrangler versions view` (never `upload`/`deploy`/`secret put`), `wrangler secret list`, GitHub REST/GraphQL `GET`s, and `gh run view --log` (read-only log retrieval). No secret value was read or printed at any point — `wrangler versions view` and `wrangler secret list` both report secret *names* only; Cloudflare's own API has no mechanism to return a secret's value.
**Repository:** `rezachidotnet/ahanassa-website`
**Date:** 2026-09-19
**Preceding context:** `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` listed these as open BLOCKERS 2 and 6 — this task resolves both empirically before `deploy-production.yml` is ever authored.

---

# 1. Cloudflare Versions Secret Inheritance

## RESULT: PASS

**`wrangler versions upload` does inherit the Worker's currently-attached secrets automatically — no re-attachment step is needed.** This is not inferred from documentation (Cloudflare's own docs, checked below, do not state this explicitly) but demonstrated directly from this project's own real production Worker history, using a clean natural experiment already present in the account: a secret was added, then a pure code upload followed with no secret action of its own, then a later secret *removal* happened, then another pure code upload followed — and each version's own secret list tracked the change correctly.

## Method

`wrangler versions view <id> --name ahanassa-production` (read-only — this command has no side effect on Cloudflare state) against three real, already-existing versions of the live production Worker, chosen specifically to bracket two known secret-change events:

| Version | Created | How it was created | Secrets shown |
| --- | --- | --- | --- |
| `1ba5dadb-f3a7-4a29-b928-edefe035f8db` | 2026-08-31T13:07:19Z | **A secret change itself** — `create_version_api`, message `Updated secret "ODOO_RFQ_API_TOKEN"` | `ODOO_RFQ_API_TOKEN`, `PREVIEW_BASIC_AUTH_PASSWORD`, `PREVIEW_BASIC_AUTH_USER`, `TURNSTILE_SECRET_KEY` |
| `878a1e82-43d8-4f5b-b737-d26598b2e07d` | 2026-09-01T11:18:32Z | **Pure code upload** (`version_upload`, "Multi-Item RFQ UI", commit `6926aaa`) — no secret action of its own, created *after* the version above | Identical: `ODOO_RFQ_API_TOKEN`, `PREVIEW_BASIC_AUTH_PASSWORD`, `PREVIEW_BASIC_AUTH_USER`, `TURNSTILE_SECRET_KEY` |
| `b07d8697-620c-485c-8fed-21b893ab602c` (**currently live, 100% traffic**) | 2026-09-03T19:00:45Z | **Pure code upload** (`version_upload`), created *after* Basic Auth removal (`DOCUMENT_AUDIT_REPORT.md` DAR-050, 2026-09-02) — again no secret action of its own | `ODOO_RFQ_API_TOKEN`, `TURNSTILE_SECRET_KEY` only — `PREVIEW_BASIC_AUTH_PASSWORD`/`_USER` correctly absent |

## Why this is conclusive, not circumstantial

The critical control is version `878a1e82`: it was created by a **plain code upload**, with **no secret-related action anywhere in its own history**, immediately after `1ba5dadb` (a secret-only version). If secrets were *not* automatically inherited, `878a1e82` would show either zero secrets or an error — instead it shows the exact same four secrets, correctly. Symmetrically, `b07d8697` — also a plain code upload, but created *after* the Basic Auth secrets were deleted — correctly shows only the two secrets that still existed at that point, **not** a stale copy of the four from `878a1e82`, and **not** zero. This rules out both failure modes a naive design would worry about: secrets are neither dropped on a pure code upload, nor frozen forever at whatever they were when first set. Each new version correctly reflects the Worker's live secret set *as of that version's own creation time* — which is exactly the behavior a production release workflow needs from `versions upload`.

## Documentation cross-check

Two Cloudflare docs pages were fetched (`workers/configuration/versions-and-deployments/`, `workers/wrangler/commands/`) looking for an explicit statement of this behavior. Neither states it directly — one page notes only that a version captures "its bundled code, static assets, bindings, and compatibility settings" without addressing secrets specifically. **The verdict above rests on the empirical evidence in the table, not on a documentation quote** — flagged here so this isn't overstated as "Cloudflare's docs confirm X" when what actually happened is "this project's own account history proves X directly, more convincingly than a doc statement would."

## Consequence for `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §6/§7

The design's §7 already specified verifying secret presence on the newly uploaded version between Phase 1 (`versions upload`) and Phase 2 (`versions deploy`) as a defense-in-depth check, rather than assuming inheritance. **That check remains correct to keep** — this precheck confirms the assumption it was guarding against was never actually a problem in practice, but the check itself is cheap (one `wrangler versions view` call) and catches the case where a future Cloudflare platform change or account-level setting could alter this behavior. Precondition 0.5 / BLOCKER 2 from the design document is now **resolved**: secret inheritance is confirmed, not merely assumed.

---

# 2. GitHub Actions Staging Provenance Lookup

## RESULT: PASS — with a required correction to the previously assumed mechanism

**A production workflow can reliably prove "this SHA was successfully deployed to staging" — but not via the mechanism `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §3 assumed.** That design's pseudocode read `.inputs.deploy_ref` off the workflow run object. **This field does not exist anywhere in GitHub's API for a historical run — confirmed empirically below, not merely suspected.** A working, equally reliable alternative exists and was proven against real runs, including a run specifically chosen because it is known to expose the failure mode a weaker method would fall into.

## Step 1 — Workflow identity

`GET /repos/rezachidotnet/ahanassa-website/actions/workflows/361701517` → confirmed live: id `361701517`, name `Deploy Staging`, path `.github/workflows/deploy-staging.yml`, `state: active`. Matches the id given in this task exactly — no lookup or guess needed.

## Step 2 — Existing successful runs

`GET /repos/.../actions/workflows/361701517/runs` → `total_count: 2`, both `event: workflow_dispatch`, both `conclusion: success`:

| Run id | Created | `head_branch` | `head_sha` (dispatch branch tip) |
| --- | --- | --- | --- |
| `35426318953` | 2026-09-19T06:20:07Z | `feat/header-hero-integrated` | `c486e4981ea2a87abe4547a011220c3ac18eb5e8` |
| `35428823679` | 2026-09-19T07:15:24Z | `feat/header-hero-integrated` | `c9c641ce5f8e8653ba1396417687823916db01fb` |

## Step 3 — `inputs.deploy_ref` does not exist via the API — proven, not assumed

Checked three ways, all negative:

1. **Runs list** (`GET .../workflows/361701517/runs`) — each run object was checked programmatically for an `inputs` key. **Absent** on both runs.
2. **Single run detail** (`GET .../actions/runs/{id}`) — full field list extracted: 32 top-level keys (`id`, `head_branch`, `head_sha`, `display_title`, `event`, `referenced_workflows`, `head_commit`, etc.). **No `inputs` field anywhere.**
3. **GraphQL** — `__type(name: "WorkflowRun") { fields { name } }` → 15 fields (`checkSuite`, `createdAt`, `databaseId`, `deploymentReviews`, `displayTitle`, `event`, `file`, `id`, `pendingDeploymentRequests`, `resourcePath`, `runAttempt`, `runNumber`, `updatedAt`, `url`, `workflow`). **No `inputs` field in the schema at all.**

**Two tempting proxies are also proven wrong, empirically, not just theoretically:**

- **`head_sha` (from the run object) is not the deployed SHA.** For run `35426318953`, `head_sha = c486e498…` (the dispatch branch's tip at trigger time), but the actual deployed commit — recovered from the run's own logs (Step 4) — was `3ce18c52ef1a84311523d3bfe756139a545c8752`, a **different commit entirely**. A production workflow that compared `deploy_ref` against `head_sha` would have produced a **false negative** for this exact real run, incorrectly reporting "no staging proof" for a SHA that genuinely was staged successfully.
- **The auto-created Deployments API object is the same trap.** `GET /repos/.../deployments?environment=staging` shows `sha: c486e4981ea2a87abe4547a011220c3ac18eb5e8` for that same run — again the dispatch branch tip, again not the deployed SHA, and `payload: {}` is empty (`deploy-staging.yml` never calls the Deployments API itself to attach the real `deploy_ref`; the object shown is GitHub's own automatic-on-`environment:`-targeting record, keyed to the triggering ref, not the application ref checked out mid-job).

## Step 4 — The mechanism that does work: job-log evidence

`deploy-staging.yml` already prints the exact value needed, in plain text, in two places every run: `echo "Requested deploy_ref: $DEPLOY_REF_INPUT"` (step "Require explicit confirmation") and `echo "Deploying exact commit: $DEPLOYED_SHA"` (step "Resolve deployed SHA") — the latter only after `git cat-file -e` has confirmed the ref resolves to a real commit, making it the stronger of the two signals to match against.

Retrieved via `GET /repos/.../actions/jobs/{job_id}/logs` (one job per run in this workflow; `gh api --allow-escape-sequences ... | sed -E 's/\x1b\[[0-9;]*m//g'` to strip ANSI color codes before matching):

| Run id | Log line found |
| --- | --- |
| `35426318953` | `Deploying exact commit: 3ce18c52ef1a84311523d3bfe756139a545c8752` |
| `35428823679` | `Deploying exact commit: c9c641ce5f8e8653ba1396417687823916db01fb` |

Both values recovered correctly — including the `35426318953` case, which is exactly the run where `head_sha` and the Deployments-API `sha` both point at the *wrong* commit. Log-based lookup is not merely an alternative; it is the only one of the four methods tried that produced a correct answer in the one case that actually distinguishes them.

## Corrected design for `deploy-production.yml`'s Staging Provenance Assertion (A2)

```bash
DEPLOY_REF="${{ inputs.deploy_ref }}"
FOUND=""

# Paginate if the account ever has >100 successful staging runs; today there are 2.
RUN_IDS="$(gh api "repos/rezachidotnet/ahanassa-website/actions/workflows/361701517/runs?status=success&per_page=100" \
  --jq '.workflow_runs[].id')"

for RUN_ID in $RUN_IDS; do
  JOB_ID="$(gh api "repos/rezachidotnet/ahanassa-website/actions/runs/$RUN_ID/jobs" --jq '.jobs[0].id')"
  LOG="$(gh api --allow-escape-sequences "repos/rezachidotnet/ahanassa-website/actions/jobs/$JOB_ID/logs" | sed -E 's/\x1b\[[0-9;]*m//g')"
  if echo "$LOG" | grep -q "Deploying exact commit: $DEPLOY_REF\$"; then
    FOUND="$RUN_ID"
    break
  fi
done

if [ -z "$FOUND" ] && [ "${{ inputs.skip_staging_provenance }}" != "true" ]; then
  echo "::error::No successful Deploy Staging run (workflow 361701517) has a 'Deploying exact commit: $DEPLOY_REF' log line. This SHA has not been proven on staging."
  exit 1
fi
```

**Scaling note, stated plainly rather than glossed over:** this scans every successful run's log until a match, from newest or oldest depending on iteration order — cheap today (2 runs), but each iteration costs two API calls (jobs + logs) and a full log fetch, so a repository with hundreds of staging releases would eventually want either (a) iterating newest-first with an early break (already shown above), or (b) `deploy-staging.yml` additionally recording `deploy_ref` into the Deployments API's own `payload` field via an explicit `gh api` call (not present today), which would make this a single indexed lookup instead of a log scan. Neither change is needed at the current, small run volume, and neither is made by this task.

## Consequence for `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §3

The design document's §3 pseudocode (`.inputs.deploy_ref == $sha` via `jq` against the runs list) **must be replaced** with the log-scan approach above before `deploy-production.yml` is authored — the field it queries does not exist. This is a genuine correction, not a refinement: implementing §3 as originally written would silently and permanently fail closed on *every* production release (the `MATCH` variable would always be empty, since `.inputs` is never present), which — while safe (fails closed, never open) — would make the workflow unusable without ever explaining why, until someone traced it back to this exact API gap. Precondition/BLOCKER 6 from the design document is now **resolved**: the lookup capability is confirmed, using a corrected method; the originally assumed method is confirmed **not to exist** and must not be implemented as originally drafted.

---

# Summary

| Check | Result |
| --- | --- |
| 1. Cloudflare versions secret inheritance | ✅ **PASS** — empirically proven across three real production versions bracketing two secret-change events |
| 2. GitHub Actions staging provenance lookup | ✅ **PASS** — reliable, proven against both existing successful runs, including the one case that would break a naive `head_sha`/Deployments-API approach — **but only via the corrected log-scan method**, not the `.inputs.deploy_ref` field assumed in the prior design, which does not exist |

Both of `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md`'s open verification blockers (2 and 6) are now closed. The remaining blockers from that document (`package.json` `"latest"` pins, zero git tags, no in-workflow smoke gate backported to staging yet) are unaffected by this task and remain open.

---

**NO WORKFLOW CREATED. NO DEPLOY. NO FILE MODIFIED OTHER THAN THIS REPORT. NO CLOUDFLARE OR D1 MUTATION.** Every command run in this session was a read: `wrangler versions view` (×3), `wrangler secret list` (referenced from a prior session, not re-run), GitHub REST/GraphQL `GET`s, and `gh run view`/`gh api .../logs` (read-only log retrieval). No secret value was read, requested, or printed.
