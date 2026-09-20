# Staging Release Evidence Hardening — Report

**Scope:** staging workflow hardening only. `deploy-staging.yml` gains release-evidence capture and a mandatory post-deploy smoke gate. No `deploy-production.yml` was created, no production deployment was issued, no production environment or Cloudflare production resource was touched, no secret was added/changed/read, no D1 migration behavior changed, and the exact-SHA deploy model is unchanged.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**Files changed:** `.github/workflows/deploy-staging.yml`, `lib/ci/workflow-invariants.test.ts`, `docs/release/STAGING_RELEASE_EVIDENCE_HARDENING_REPORT.md` (new)
**Date:** 2026-09-20
**Preceding context:** `docs/release/PRODUCTION_CICD_FINAL_READINESS_AUDIT.md` §"Recommended sequencing" item 4 already named this exact work as a prerequisite — *"Backport to `deploy-staging.yml` first (cheaper to get wrong there): an in-workflow smoke gate (staging's own route matrix), `PREVIOUS_VERSION_ID` capture before deploy... Exercise with one real staging deployment before proceeding. (Blocker G)"* — and `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §8 already specifies the S1–S10 smoke-check matrix this task adapts from `https://www.ahanassa.com` (a not-yet-built production workflow) to the real staging Worker. This task implements that backport. A future `deploy-production.yml` (separate, not-yet-authorized task) is expected to reuse this same smoke-check design and to query this workflow's runs for staging provenance, per `PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`'s "staging-provenance assertion" requirement.

---

# RESULT

## PASS

`npm test` — **1355/1355 passing** (was 1349/1349 immediately before this change, per the prior task's own same-day baseline; net +6 from the new tests in `lib/ci/workflow-invariants.test.ts`). `npx tsc --noEmit` — clean, no errors. The workflow YAML was parsed with `js-yaml` (structure verified: 13 steps, 3 job outputs) and every `run:` block was syntax-checked with `bash -n` (all clean). The smoke-check step and the evidence-capture step were both additionally exercised for real — live against the actual deployed staging Worker and the real public production apex, and with synthetic wrangler-deploy-log fixtures — not just statically validated. See §5 for the full mutation-test record, including the two mutations explicitly required by this task ("remove one smoke assertion and prove failure," "remove version capture and prove invariant failure").

---

# 1. Files Changed

| File | Change |
| --- | --- |
| `.github/workflows/deploy-staging.yml` | Added 3 steps after the existing deploy step: **Capture staging release evidence**, **Upload staging release evidence**, **Staging smoke checks**. Added 2 new job `outputs` (`worker_version_id`, `deployed_at`). Added a header comment block describing the addition. The deploy step itself gained one change: its output is now teed to a log file (`2>&1 \| tee "$RUNNER_TEMP/deploy-staging.log"`) so the evidence step can read it — the deploy command, its arguments, and its behavior are otherwise byte-for-byte unchanged. |
| `lib/ci/workflow-invariants.test.ts` | Added `REQUIRED_SMOKE_CHECK_MARKERS`, `validateStagingReleaseHardeningShape()`, and 6 new tests: one shape-conformance test against the real file, four mutation tests proving the shape check catches removed evidence capture / removed smoke checks / removed artifact upload / removed fail-closed gate, and one test asserting the smoke suite never POSTs to `/api/rfqs` and never passes a credential to any request. |
| `docs/release/STAGING_RELEASE_EVIDENCE_HARDENING_REPORT.md` | New — this report. |

Nothing else was touched. `wrangler.jsonc`, `migrations*/`, `ci.yml`, secrets, and every production-related file are unmodified.

---

# 2. Release Evidence Capture (Requirement 1)

A new step, **Capture staging release evidence**, runs immediately after the existing deploy step and fails closed if it cannot find what it needs — a staging release with no recoverable version ID is treated as a broken evidence chain, not a soft warning.

| Field | Source | Notes |
| --- | --- | --- |
| Deployed Worker Version ID | Parsed from `wrangler deploy`'s own `Current Version ID: <uuid>` output line (captured via `tee` from the unmodified deploy command) | `wrangler deploy` always prints this line on success (confirmed against `node_modules/wrangler/wrangler-dist/cli.js`); an ANSI-escape strip (`sed -E 's/\x1b\[[0-9;]*m//g'`) is applied first in case color codes survive the non-TTY pipe |
| Deployed SHA | `$DEPLOYED_SHA`, already resolved by the pre-existing "Resolve deployed SHA" step | Reused, not re-derived |
| Workflow run ID | `${{ github.run_id }}` (plus `github.run_attempt`) | GitHub's own run identifier — this is what a future production workflow would query against, per `PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`'s staging-provenance requirement |
| Timestamp | `date -u +%Y-%m-%dT%H:%M:%SZ` at capture time | UTC, ISO 8601 |

**Where the evidence is stored (three places, redundantly):**

1. **Job outputs** — `worker_version_id`, `deployed_at` (joins the pre-existing `deployed_sha` output) — machine-readable by anything that inspects this specific run.
2. **Job summary** (`$GITHUB_STEP_SUMMARY`) — a markdown table, visible directly on the run's Actions UI page, matching the style already used by the existing "Resolve deployed SHA" step.
3. **Uploaded workflow artifact** — `staging-release-evidence-<run_id>.json` via `actions/upload-artifact@v4`, retained 90 days, containing all four fields plus `environment`/`worker_name` for self-description. This is the durable, structured record a future audit or production workflow can fetch independently of the run's log retention.

**Verified functionally** (not just read), against a synthetic `wrangler deploy`-shaped log fixture: the parser correctly extracts a version UUID from a realistic multi-line deploy transcript, writes both `GITHUB_OUTPUT` lines, and produces the exact evidence JSON and summary table shown above. See §5.2.

---

# 3. Mandatory Staging Smoke Checks (Requirement 2)

A new step, **Staging smoke checks**, runs after evidence capture, using only plain unauthenticated `curl` GET requests against the real deployed staging Worker (`https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev` — the documented staging URL, `README.md` "Staging environment" table). No request submits an RFQ, no request requires a secret or production credential, and every check is a release gate (any failure fails the job), matching the task's explicit rules.

| # | Area | Check | Pass criterion |
| --- | --- | --- | --- |
| S1 | Homepage | `GET /` | `200` |
| S2 | `/fa` | `GET /fa` | `308` → `/` (fa is the default, unprefixed locale — `PROJECT_OVERRIDES.md` §1) |
| S3 | `/en` | `GET /en` | `200` |
| S4 | Services | `GET /services` | `200` |
| S5 | Catalog route | `GET /products` | `200`, **and** either a real published product link is discovered, or the legitimate, already-established empty-catalog string is present — anything else (500, generic error page, blank body) fails |
| S6 | Catalog detail route | the slug discovered in S5, if any | `200`. If S5's catalog is legitimately empty, this check instead proves `/products/<nonexistent-slug>` still degrades to `404`, never `500` — so the check is never silently skipped, only re-targeted at the state that actually exists |
| S7 | RFQ page render | `GET /contact` | `200`, and the server-rendered RFQ form's honeypot (`id="website"`), email (`id="email"`), and message (`name="message"`) fields are present in the HTML — proves the form renders without submitting it |
| S8 | 404 behavior | `GET /smoke-check-route-that-does-not-exist` | `404` |
| S9 | Security headers | on `/` | `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`, `content-security-policy-report-only` all present (mirrors `lib/security/headers.ts`) |
| S10 | Apex redirect | `GET https://ahanassa.com/` | `308` → `https://www.ahanassa.com/` |

**S6 (catalog detail) is discovered, never hardcoded.** Staging's `DB_PUBLIC` catalog content is independent of production's and can legitimately change (more/fewer published templates) without any code change. Hardcoding a specific slug (e.g. a production slug like `rebar-aj340`) would either fabricate an assumption about staging's data or silently break the moment staging's catalog sync state shifts — both are things `CLAUDE.md`/`PROJECT_OVERRIDES.md` are emphatic about avoiding for catalog data. The check instead greps the S5 response for the first `/products/<slug>` link actually present and follows it; if none exists, it falls back to proving the route's error-handling is still correct (404, not 500) rather than skipping the check outright. At the time this was verified live, staging's catalog was **not** empty — 6 published templates were discovered (`channel-upe`, `channel-upn`, `equal-angle`, `hot-rolled-plate-s355jr`, `rebar-aj340`, `square-hollow-section-shs`) — so the "real slug" branch is what actually ran; the empty-state fallback branch was verified separately via the static/mutation tests plus manual reasoning about the route's existing `notFound()` behavior (`app/[locale]/products/[slug]/page.tsx`), not by making staging's catalog empty to test it.

**S10 (apex redirect) is the one check that cannot target staging, and is documented as such in the workflow itself.** Staging is deliberately `workers_dev`-only and has no apex domain of its own — `docs/release/VERCEL_TO_CLOUDFLARE_CUTOVER_AUDIT.md`, `docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md`, and `docs/GO_LIVE_CUTOVER_RUNBOOK.md` all establish that the apex→`www` redirect is a **Cloudflare zone-level** concern (`ahanassa.com` → `https://www.ahanassa.com`), entirely outside any Worker, staging or production. Since the task's own smoke list names "apex redirect" explicitly, this check re-verifies that public, unauthenticated redirect directly — read-only, no credential, no config change, exactly the same tolerant assertion (`308` + target only, never `server:`) that `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` S10 already specifies for the not-yet-built production pipeline. It does not deploy, configure, or modify anything in production; it is the same kind of unauthenticated `curl -I https://ahanassa.com/` check this repository's own audits (`PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`, `CI_CD_POLICY.md`) have already performed manually and repeatedly. This is flagged here explicitly in case a reviewer wants a staging-only alternative instead — the alternative considered and rejected was checking staging's own plain-HTTP→HTTPS behavior, but live testing (see §5.3) showed the `workers.dev` host serves `200` directly over plain HTTP with no redirect at all, so no staging-native analog of "apex redirect" actually exists to substitute in its place.

---

# 4. Preserved Invariants (Requirement 4)

| Requirement | How it's preserved |
| --- | --- |
| Exact-SHA deploy behavior | The deploy command (`npx vinext-cloudflare deploy --env staging`), its `--env` flag, and everything before/around it are unchanged. The only modification is piping its combined stdout/stderr through `tee` to a log file — `tee` does not alter the command's exit code (`pipefail` is already set) or its side effects |
| Staging environment isolation | No new step reads from or writes to any Cloudflare resource other than reading the already-deployed public HTTP responses of the staging Worker itself, plus one read-only external GET to the public production apex (§3, S10) that touches no Cloudflare Worker, D1, Queue, or secret |
| D1 bindings | Untouched — no step added or changed references `d1_databases`, `migrations apply`, or `--remote` |
| Secrets model | No new secret was introduced, read, echoed, or required. The smoke suite is 100% unauthenticated GET requests (a dedicated test — `"staging smoke checks never submit an RFQ and never require a production credential"` — statically asserts no `/api/rfqs` POST and no `-u`/`--user`/`Authorization:` appears anywhere in the workflow) |

All 20 pre-existing invariant tests in `lib/ci/workflow-invariants.test.ts` continue to pass unchanged (verified — see §5.1); none of the markers they check for (`--remote`, `--env production`, `ahanassa-production`, `0010_homepage_eligibility`, the production D1 names/ids, `environment: production`) were introduced anywhere in this change.

---

# 5. Testing Performed

## 5.1 Full suite + static invariants

```
npm test        → 1355/1355 passing (was 1349/1349 before this task)
npx tsc --noEmit → clean, 0 errors
```

`lib/ci/workflow-invariants.test.ts` alone: 26/26 passing (was 20/20) — all pre-existing tests unaffected, 6 new tests added.

## 5.2 Mutation test 1 (required): "remove version capture and prove invariant failure"

Demonstrated two independent ways:

- **Static, in the test suite** — `test("mutation: removing the Worker Version ID capture fails the staging hardening shape check")` replaces every occurrence of the literal `Current Version ID` marker in the real workflow file with `REDACTED` and asserts `validateStagingReleaseHardeningShape()` reports the missing-capture violation. **Passing.**
- **Functional, against the real evidence-capture step** — extracted the actual "Capture staging release evidence" step's shell code, fed it a synthetic `wrangler deploy`-shaped log with the `Current Version ID: ...` line stripped out (`grep -v "Current Version ID"`), and ran it standalone: **exit code 1**, `::error::RELEASE EVIDENCE CAPTURE FAILED — could not find a Worker Version ID in the deploy output.` The same step run against the log **with** the line present exits `0` and produces the correct evidence JSON, `GITHUB_OUTPUT` lines, and job-summary table.

## 5.3 Mutation test 2 (required): "remove one smoke assertion and prove failure"

Also demonstrated two independent ways:

- **Static, in the test suite** — `test("mutation: removing one mandatory smoke check fails the staging hardening shape check")` cuts the entire S4 (`/services`) check block out of a copy of the real workflow text and asserts the shape checker reports exactly that one missing check, with no unrelated false positives for the other 9. **Passing.**
- **Functional, against the real smoke-check step, live** — extracted the actual "Staging smoke checks" step's shell code and ran it twice against the real deployed staging Worker:
  - **Unmodified:** all 10 checks (S1–S10) passed, exit code `0`. Live results included: `/` → `200`; `/fa` → `308` → `/`; `/en` → `200`; `/services` → `200`; `/products` → `200` with a real published slug discovered; `/products/equal-angle` → `200`; `/contact` → `200` with all three RFQ form field markers present; unknown route → `404`; all 5 security headers present; apex → `308` → `https://www.ahanassa.com/`.
  - **Mutated** (S1's homepage check redirected at a nonexistent path instead of `/`): S1 failed with `::error::SMOKE CHECK FAILED — / expected 200, got 404`, every other check (S2–S10) still correctly passed on its own merits, and the step exited `1` with `::error::1 staging smoke check(s) failed.` — proving one broken assertion fails the whole gate without masking or being masked by the others.

This same live run also empirically confirmed the design choices in §3: staging's catalog was not empty (S6 exercised the "real slug" branch, not the empty-state fallback), and plain HTTP to the `workers.dev` host returns `200` directly with no redirect (confirming no staging-native "apex redirect" behavior exists, which is why S10 targets the real public apex instead — see §3's S10 note).

## 5.4 YAML/shell soundness

- `js-yaml` parse of the full workflow file — succeeds; job outputs and all 13 step names verified.
- `bash -n` (syntax-only) on every extracted `run:` block — all clean, including the new evidence-capture and smoke-check steps.

No real deployment, D1 migration, or secret access was performed by this task. Live HTTP checks were read-only GETs (staging Worker + the public production apex); nothing was written to any Cloudflare resource.

---

# 6. Rollback Considerations

- **This change is additive and reversible on its own.** Reverting the two modified files (`deploy-staging.yml`, `workflow-invariants.test.ts`) restores the exact prior staging workflow with no residual state — no secret, binding, D1 row, or Cloudflare resource was created or altered by editing the workflow itself.
- **A future failing smoke gate blocks a staging deploy from being reported as fully evidenced, but never half-deploys anything.** The deploy step and its `wrangler deploy` invocation are unchanged; if evidence capture or smoke checks fail, the application code is already fully deployed to staging (this was already true before this task — this task only adds *validation after* the same deploy, not a new deploy phase). A smoke failure is a signal to investigate the just-deployed staging version, not evidence that the deploy itself is partial.
- **No automatic rollback is introduced, deliberately** — consistent with this repository's existing production-release design philosophy (`PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`: "no automatic rollback... a human decides, deliberately"). If smoke checks fail, the operator's remedy is the same as any other staging issue: inspect the run's log/summary/evidence artifact (which names the exact `worker_version_id` and `deployed_sha` that failed), then either fix and redeploy the same `deploy_ref`/a new one, or manually redeploy a known-good prior SHA through the same `workflow_dispatch` input — there is no new rollback mechanism to learn.
- **The evidence artifact is the rollback reference.** Because `worker_version_id` is now captured and durably stored (job summary + 90-day artifact + job output), a human investigating a bad staging release has the exact Cloudflare Worker version to consult (`wrangler versions view <id>`) or, if ever needed, to manually re-promote — this was previously not recorded anywhere.
- **S10's external apex check is a monitoring signal, not a staging deploy blocker in spirit** — but per the task's explicit "smoke failures must fail the workflow" instruction, it is wired as fail-closed like every other check. If this coupling (a staging release gate depending on an unrelated production DNS/redirect fact) is not desired on reflection, the smallest safe follow-up is to make S10 non-fatal (log-only) while keeping S1–S9 fail-closed — deliberately not done here without a real decision, since the task gave no carve-out and this is called out plainly instead of silently softened.

---

# 7. Explicitly Out of Scope (not touched by this task)

- `deploy-production.yml` — not created.
- Production environment, production Cloudflare resources, production secrets — not touched, not read, not modified.
- D1 migration behavior — unchanged; neither workflow applies a migration.
- `wrangler.jsonc`'s `env.staging` — unchanged, including its already-latent (pre-existing, unrelated) missing explicit `"workers_dev": true` noted in `PRODUCTION_CICD_FINAL_READINESS_AUDIT.md` — live testing during this task confirmed the staging Worker is already reachable at its documented `workers.dev` URL regardless, so this pre-existing config-hygiene gap does not block anything here and was left alone per "modify only what is required."
- A real RFQ submission — never performed; S7 verifies only that the form renders.
