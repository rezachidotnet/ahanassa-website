# Production Workflow — Independent Adversarial Audit

**Scope:** audit only. No file was modified, no commit was created, no deployment was executed, no Cloudflare resource was created/changed/deleted, no GitHub setting was changed, no secret was touched, no migration was run. Every claim below that could be checked was checked directly against live (but read-only or `--dry-run`) GitHub/Cloudflare state, not assumed from the source documents' own prose — where a claim in the design/precheck/implementation reports was re-verified and held, that is stated; where this audit found the actual live behavior to differ from what the source documents assert, that is called out explicitly as a finding.
**Repository:** `rezachidotnet/ahanassa-website`
**Auditor stance:** independent and adversarial — this audit does not take the implementation report's "PASS" at face value and actively tried to break each control, including by re-running real (non-mutating) commands against the real Cloudflare account and GitHub API.
**Files under review:** `.github/workflows/deploy-production.yml`
**Supporting controls reviewed:** `lib/ci/workflow-invariants.test.ts`, `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md`, `docs/release/PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`, `docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`
**Date:** 2026-09-20

---

# RESULT

## CONDITIONAL_GO

The default, documented-as-primary path — dispatch with `rollout_percentage: 100` — is safe, fail-closed at every precondition, and was independently re-verified against live state. **One CRITICAL defect makes the workflow's own advertised staged-rollout capability (`rollout_percentage: 10` / `50`) completely non-functional**, and it is specifically the option the source design document itself recommends using for the *first* real release. A CONDITIONAL_GO, not GO, reflects that: the workflow can be dispatched safely today only if the operator is explicitly constrained to `rollout_percentage: 100` and is aware of the findings below — it is not safe to use exactly as documented/intended.

## PRODUCTION_DEPLOYMENT_READY

## NO

Not ready as shipped. It becomes ready once the CRITICAL finding (§6) is fixed or the input is constrained to `100` only (with the choice option removed or clearly disabled), and the HIGH finding (§3) is at minimum acknowledged with an explicit decision on whether to widen A1's vars coverage before the first real dispatch.

---

# Findings Summary

## CRITICAL_FINDINGS

1. **`rollout_percentage: 10` and `rollout_percentage: 50` are completely non-functional — every dispatch with either value will fail at Phase 2, every time, with no exception.** (§6 below)

## HIGH_FINDINGS

1. **A1's "production vars" assertion checks only `vars.APP_ENV`; six other production vars (`ODOO_BASE_URL`, `ODOO_DATABASE`, `ODOO_CRM_TEAM_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PRICE_STRIP_ENABLED`, `ENABLED_PRICE_PROVIDERS`, `HOMEPAGE_RANKING_MODE`) are never validated.** A `deploy_ref` whose `wrangler.jsonc` has a wrong/tampered `ODOO_BASE_URL` would pass A1 undetected. (§3 below)

## MEDIUM_FINDINGS

1. Reviewer-approval gate permits self-review; the sole reviewer and the operator can be the same person. (§2)
2. A2/A3/Phase-1-parsing/rollback-capture all depend on exact, unversioned `wrangler`/`gh` CLI output text or JSON shape; currently pinned via `npm ci` + `package-lock.json`, but fragile to a future dependency bump. (§4, §5, §6, §9)
3. A2's dependency on `deploy-staging.yml`'s exact `"Deploying exact commit: <sha>"` log line is untested from the staging side — nothing fails if that line's wording ever changes there. (§4)
4. Environment protection (required reviewer + branch policy) is live-verified correctly configured today, but is external, mutable GitHub configuration the workflow itself never asserts or would notice changing. (§2)
5. Smoke-gate locale coverage is inconsistent: S4 checks fa/en/ar; S5/S6/S7 (catalog + RFQ) check only the default locale. (§8)

## LOW_FINDINGS

1. A1's cron-trigger check is order-sensitive though cron order is not semantically meaningful; a harmless reorder would false-positive-fail A1. (§3)
2. S9 does not distinguish enforced vs. report-only CSP (matches the design document's own stated criterion — not a deviation, just a limit). (§8)
3. The deployment manifest's "append-only" rule is convention only, not tool-enforced. (§10)
4. Reliance on GitHub's automatic secret-masking as an implicit backstop is a known, exact-substring-based platform limitation (not unique to this workflow; no evidence this workflow defeats it). (§7)
5. curl-based smoke checks cannot detect client-side/hydration-only failures — an inherent, industry-standard limitation of this check style, not a defect. (§8)
6. No repo-level Actions secrets exist today (confirmed live, `total_count: 0`), so environment-secret scoping is unambiguous in practice — but this is observed current state, not something the workflow asserts. (§7)

---

# 1. Trigger Safety

| Check | Result |
| --- | --- |
| `workflow_dispatch` only | **PASS** — `on:` block contains only `workflow_dispatch:`, no `push:`, no `pull_request:`. |
| No push trigger | **PASS** |
| No pull_request trigger | **PASS** |
| `deploy_ref` requires exact 40-hex SHA | **PASS** — enforced by the first executable step (`^[0-9a-f]{40}$`), before checkout. `workflow_dispatch` `type: string` inputs have no server-side pattern validation of their own (GitHub does not support that), so this shell-level check is the *only* real enforcement, and it is correctly the first thing that runs. An empty, short, uppercase, or branch-shaped value is all correctly rejected by the same regex — no separate empty-string check is needed. |
| Confirmation input exists | **PASS** — `confirm` must equal the literal `"deploy-production"`, checked before the SHA-format check, in the same step. |

No findings in this section.

---

# 2. Production Environment Protection

`environment: production` is declared at job level (correct placement — this is what actually triggers GitHub's environment protection rules and environment-scoped secret resolution).

**Live-reverified this session** (not assumed from the source reports):

```
GET /repos/rezachidotnet/ahanassa-website/environments/production
```

- `protection_rules`: `required_reviewers` (reviewer `rezachidotnet`, `prevent_self_review: false`) **and** `branch_policy` (custom, restricted to `feat/header-hero-integrated`) — both still present and correctly configured.
- Environment secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` — both present (names only checked, values never requested).
- Repository-level Actions secrets: `total_count: 0` — confirmed no shadow/conflicting secret of the same name exists outside the environment.

**"Reviewer approval is actually effective" — partially true, with a caveat (MEDIUM).** GitHub genuinely pauses the job before any step runs (including checkout) until approved — a run that is never approved never executes and never receives the environment's secrets; this is a hard platform guarantee, not something the YAML could accidentally weaken. However, `prevent_self_review: false` combined with a single-person reviewer list means the actor who dispatches the workflow can also be the one who approves it. The control still forces a deliberate, logged, second click (it is not a rubber stamp that happens automatically), and every approval is recorded in GitHub's own deployment-review audit trail — but it does not provide independent second-party review. For a solo-maintainer repository (every commit and prior release in this project's history is the same author) this is a defensible, likely-intentional tradeoff, but the audit's own question was answered honestly here rather than assumed adequate.

**"Secrets are environment scoped" — PASS**, with one caveat noted for completeness: `${{ secrets.X }}` syntax cannot itself distinguish "environment-scoped" from "repository-scoped" — GitHub resolves whichever is visible to the job, with environment secrets taking precedence when both exist. Since repo-level secrets are confirmed absent today, this distinction is currently moot; it is not, however, asserted or defended by the workflow itself, so it depends on that external state remaining true (LOW-severity note, not a live problem).

**"No bypass path exists" — one *intentional*, clearly-audited bypass exists and should not be mistaken for a hidden one: `skip_staging_provenance`.** This bypasses A2 only (staging-SHA-proof), never A1, A3, or the reviewer gate itself — a run using it still requires the same approval as any other run, and is loudly recorded (`::warning::`, job summary, and the `skip_staging_provenance` field in the evidence JSON) every time. This is the workflow's only deliberate escape hatch and it is correctly scoped and correctly logged.

No path was found by which the reviewer gate, branch policy, or secret scoping could be bypassed *from within the workflow file itself*. The only bypass risk identified is external: a GitHub-side change to the environment's protection rules (by someone with sufficient repository permissions) would silently remove the gate, and nothing in this workflow or its test suite would detect that (§ noted in Medium Findings).

---

# 3. Target Safety

A1 (`assert-production.cjs`, inline, trusted, never read from `deploy_ref`) parses `wrangler.jsonc`'s `env.production` block and checks: Worker name, both D1 bindings' name+id, `routes` (exact array equality against `[{pattern:"www.ahanassa.com", custom_domain:true}]`), `workers_dev === true`, cron triggers (exact array equality against the three live-registered schedules), `vars.APP_ENV === "production"`, and a recursive case-insensitive scan banning the substring `"staging"` from any key or string value anywhere under `env.production`.

**Independently re-run this session** against the real, current `wrangler.jsonc` (not merely reviewed): **PASSED**, printing the exact pinned Worker/D1/route/cron/APP_ENV values. **Independently re-run against a deliberately doctored copy** (Worker name changed to `"ahanassa-production-DOCTORED"`): **failed closed correctly**, with the exact, specific error naming the mismatch.

**Could an operator *accidentally* deploy to another target?** For the scenarios A1 actually checks — wrong Worker name, wrong D1 id, missing/extra/wrong route, `workers_dev` flipped off, an added/removed/reordered cron, or any string containing "staging" — **no**, A1 reliably blocks all of these, and was proven to do so, not merely asserted to.

**HIGH FINDING: "production vars" coverage is materially narrower than the audit checklist implies.** A1 checks exactly one of the seven `vars.*` keys declared under `env.production` in `wrangler.jsonc` — `APP_ENV`. It does **not** check `ODOO_BASE_URL`, `ODOO_DATABASE`, `ODOO_CRM_TEAM_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PRICE_STRIP_ENABLED`, `ENABLED_PRICE_PROVIDERS`, or `HOMEPAGE_RANKING_MODE`. Concretely: a `deploy_ref` whose `wrangler.jsonc` has `ODOO_BASE_URL` pointed at a different or attacker-controlled host would pass A1 with a printed "PRODUCTION TARGET ASSERTION PASSED" — and every RFQ synced by that release's queue consumer would be sent to the wrong endpoint. The same is true of `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (breaks bot-protection silently) and the two pricing feature flags. This is not a deviation introduced by the implementation — `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §4's own table only ever specified `vars.APP_ENV`, so the implementation is faithful to its source document; the gap exists in the design, not merely the build. The realistic trigger for this is far more likely to be an accidental config-refactor slip than a sophisticated attacker (this is a solo-maintainer repo with direct commit access, not a PR-gated workflow with unknown contributors), but the consequence — silent RFQ/customer-data misrouting or Turnstile misconfiguration surviving every fail-closed gate — is severe enough to rate this HIGH regardless of how the bad value gets there.

**LOW finding:** the cron check is array-order-sensitive (`crons.some((c, i) => c !== EXPECTED_CRONS[i])`). Cron trigger order carries no semantic meaning to Cloudflare, so a harmless reordering of the three entries in `wrangler.jsonc` (with no other change) would cause A1 to fail — safe-direction (blocks a legitimate deploy rather than allowing a bad one), but worth knowing before it causes a confusing on-call moment.

---

# 4. SHA Promotion Integrity

- **Exact SHA checkout:** `ref: ${{ inputs.deploy_ref }}` — checks out precisely the (already regex-validated) SHA. **PASS.**
- **No branch checkout, no `main`/`latest` usage:** confirmed — no hardcoded branch/tag reference anywhere in checkout or build. **PASS.**
- **Build reproducibility for a given SHA:** `npm ci` (not `npm install`) is used, and `package-lock.json` (`lockfileVersion: 3`) is committed and genuinely pins exact resolved versions for every dependency — independently verified this session by reading the lockfile directly (`@vinext/cloudflare` resolves to a pinned `1.0.0-beta.6`, `react` to a pinned `19.2.8`, despite both being requested as `"latest"` in `package.json`). `npm ci` ignores `package.json`'s semver/tag ranges and installs exactly what the lockfile records, and errors out if the two files are out of sync — so **a given `deploy_ref`'s build is reproducible**, and the already-known, already-documented "18 deps pinned to `\"latest\"` in `package.json`" item (carried forward, not new) does not undermine this as long as the lockfile stays committed and in sync, which it currently is.
- **Staging provenance uses the corrected log-scan method — PASS, independently re-verified, not merely read.** Traced the actual code path line by line: lists successful `Deploy Staging` (id `361701517`, live-reconfirmed this session to still be the correct id) runs → for each, fetches its first job's log → writes it to a file → greps the file (fixed-string, not piped) for `"Deploying exact commit: $DEPLOYED_SHA"`. This exactly matches the corrected mechanism from `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`.
- **Confirmed absent, by direct code reading (not just trusting the file's own comments):**
  - No `.inputs.deploy_ref` anywhere in executable code (only inside comments explaining why not to use it).
  - No `head_sha` comparison anywhere.
  - No call to the Deployments API (`/deployments?environment=...`) anywhere.

  This was cross-checked against `lib/ci/workflow-invariants.test.ts`'s `validateProductionDeploySafetyShape()`, which statically bans all three, plus a real mutation test proving each ban actually fires if reintroduced — re-run this session, 33/33 passing.

**MEDIUM finding:** A2's correctness rests entirely on `deploy-staging.yml` continuing to print the *exact* string `Deploying exact commit: <sha>`. That line does still exist there today (independently re-grepped this session), but **no test anywhere — in `workflow-invariants.test.ts` or otherwise — asserts that `deploy-staging.yml` keeps emitting it.** The static safety-shape test only inspects `deploy-production.yml`'s own content. A future, unrelated edit to `deploy-staging.yml`'s wording (e.g., a copy-editing pass) would silently break every future production release's provenance check, with no test failure anywhere to catch it in advance — the break would only surface the next time someone tries to dispatch `deploy-production.yml` and gets an unexpected "not staged" failure for a SHA that genuinely was staged. Fails closed (blocks deploys), not open, but it is a real, silent, currently-undetected coupling.

**MEDIUM finding, consolidated:** A2 (this log-scan text), A3 (the `"No migrations to apply"` string, §5), Phase 1's version-ID extraction (the `"Worker Version ID:"` string, §6), and rollback-target capture (the `.versions[0]` JSON shape, §6) all depend on exact `wrangler`/`gh` CLI output text or shape that is not covered by any compatibility test against a *different* CLI version. Today this is safe because `npm ci` pins an exact `wrangler` version via the lockfile for any given `deploy_ref` — but the very next commit that bumps `wrangler` (currently `^4.126.0`) and regenerates the lockfile could silently change any of these strings, and nothing in this repository's test suite would catch that before a real production dispatch. Every instance checked fails closed if it breaks (worst case: a legitimate deploy is blocked with a confusing error), never open.

---

# 5. Migration Safety

- **Migrations are checked:** `npx wrangler d1 migrations list DB_OPS/DB_PUBLIC --env production --remote`, both databases, both required to report `"No migrations to apply"`. **PASS.**
- **No automatic production migration:** grepped the entire file for `migrations apply` — **zero occurrences in executable code.** (One near-miss was found and is worth recording precisely: the A3 error messages originally *did* spell out the literal manual `wrangler d1 migrations apply ...` command as operator guidance inside an `echo` string during this workflow's authoring; that was caught by the authoring session's own new static test before being committed, and the current, committed text instead points the operator at `docs/release/CI_CD_POLICY.md` without restating the forbidden phrase. Confirmed clean as committed.)
- **Fail-closed if parity is wrong:** **PASS** — either database not reporting the exact "no migrations" string triggers `exit 1` before `npm ci`/build/deploy ever runs.
- **`set -e` / command-substitution safety, independently tested (not assumed):** A3 captures `wrangler`'s output via `VAR="$(cmd 2>&1)"` under `set -euo pipefail`. This audit specifically tested whether bash's well-known "`set -e` does not fire inside a plain assignment" gotcha applies here — **it does not**: `x="$(false)"` under `set -e` was verified, in this exact shell, to abort the script before the next line runs (this is the `local x=$(...)` gotcha, which does not apply to plain, non-`local` assignments). Even setting that aside, if `wrangler` failed outright, its output would not contain `"No migrations to apply"` either, so the subsequent `grep`-based check independently fails closed regardless of which mechanism catches it first. **Two independent reasons this step is safe on a CLI failure, not one — verified, not assumed.**

No findings beyond the general CLI-output-coupling note already recorded in §4.

---

# 6. Cloudflare Deployment Safety

Pipeline as implemented: capture `PREVIOUS_VERSION_ID` (read-only) → Phase 1 `versions upload` (0% traffic) → verify secret names + D1/queue bindings on the new version → Phase 2 `versions deploy <new>@<rollout_percentage>`.

- **Rollback handle exists:** **PASS** — `PREVIOUS_VERSION_ID` is captured and fails closed (aborts before Phase 1) if it cannot be determined.
- **Previous version captured correctly:** **PASS, and a real bug in the source design document's own illustrative snippet was independently caught and avoided.** `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §9's pseudocode (`... | head -20 | grep ... | head -1`) is wrong — `wrangler deployments list` prints **oldest-first**, so that snippet would have captured a *stale* rollback target. The implementation correctly uses `wrangler deployments list --json | jq -r '.[-1]...'` (last entry). Independently re-run this session against the real, live Worker: correctly returns `b07d8697-620c-485c-8fed-21b893ab602c`, matching the currently-serving version.
- **Secret/binding verification between phases:** **PASS, tested both directions.** Re-run against the real, live production version — passed, confirming both `ODOO_RFQ_API_TOKEN` and `TURNSTILE_SECRET_KEY` present as `secret_text` and both D1 ids + the queue name correct. Then re-run against a real *historical* production version that predates `ODOO_RFQ_API_TOKEN` ever being set (per `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`'s own version table) — **failed closed correctly**, naming the missing secret.

## CRITICAL FINDING: `rollout_percentage` values other than `100` are completely non-functional

**Reproduced directly against the real production Worker, read-only, via `--dry-run` (no state mutated):**

```
$ wrangler versions deploy <version-id>@10 --env production --yes --dry-run
✘ [ERROR] The specified traffic percentages add up to 10%, but must total
  exactly 100%. Adjust the --percentage values or version-spec percentages
  so they sum to 100%.
```

Phase 2's actual command is:

```bash
npx wrangler versions deploy "$NEW_VERSION_ID@${{ inputs.rollout_percentage }}" --config dist/server/wrangler.json --message "..." --yes
```

— a single version-spec. Cloudflare's own CLI requires every deploy's percentages to sum to exactly 100%, and with only one version-spec supplied, a value other than `100` can never satisfy that. **This means:**

- Dispatching with `rollout_percentage: 10` or `rollout_percentage: 50` will, every single time, without exception: pass A1/A2/A3, build successfully, capture `PREVIOUS_VERSION_ID`, successfully upload a brand-new Worker Version in Phase 1 (real Cloudflare state — a version now exists that will never be promoted or cleaned up), pass secret/binding verification, and then **fail Phase 2** with the error above. The job fails closed (no traffic ever shifts, since `versions deploy` validates the percentage sum before applying anything) — so this is not a dangerous *state*, but it is a completely broken *feature*.
- This directly undermines one of the four reasons `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §6 gives for choosing the two-phase deploy architecture over a one-shot deploy in the first place: *"Staged rollout becomes possible: `@10` → observe → `@100` is expressible."* It is not expressible, as implemented.
- It directly contradicts that same design document's own "Recommended Next Step": *"...proceed to a dry run..., before the first real release at `rollout_percentage: 10`."* Following that explicit, documented recommendation for the very first real production release would fail.
- **Root cause traced to the source document, not introduced by the implementation:** `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §6's own illustrative pseudocode already showed only a single version-spec (`wrangler versions deploy "$NEW_VERSION_ID"@"${{ inputs.rollout_percentage }}"`). The implementation faithfully reproduced this without independently dry-running the non-default percentage paths — confirmed by `PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`'s own §5.2 testing table, which lists a `--dry-run` test only for the `@100` (implicit, via the currently-serving version) case, never for `@10`/`@50`.
- **The fix shape was independently confirmed to work**, without applying it (audit only): specifying *both* version-specs so they sum to 100 succeeds non-interactively —

  ```
  $ wrangler versions deploy <new>@10 <previous>@90 --env production --yes --dry-run
  ...
  ╰  X  --dry-run: exiting     ← succeeds through to the dry-run exit point, no error
  ```

  i.e. Phase 2 would need `"$NEW_VERSION_ID@$ROLLOUT_PCT" "$PREVIOUS_VERSION_ID@$((100 - ROLLOUT_PCT))"` rather than a single version-spec. This audit does not implement that fix, per its own scope.
- **A second, related design gap, worth recording alongside the bug it's entangled with:** even with that fix, there is no documented or implemented mechanism to *promote* an already-canaried version to 100% later — each dispatch of this workflow is a fully independent build → upload → deploy cycle, and `wrangler versions upload` creates a distinct new version id on every invocation (confirmed empirically in `PRODUCTION_PIPELINE_PRECHECKS_REPORT.md` §1's own evidence table — even a "pure code upload" with zero source changes gets a new version id). Re-dispatching the workflow to "promote to 100%" would not promote the already-canaried, already-observed version — it would build and upload an entirely new one and deploy *that* at 100%, defeating the actual purpose of having canaried in the first place (observing behavior of the exact artifact you then promote). Neither the workflow nor any of the four source documents describes an intended promotion procedure for a real canary. This is a design gap, not merely an implementation bug, and is presented as context for the CRITICAL finding above rather than as a second independent CRITICAL.

## Traffic rollout safety, restated plainly

`rollout_percentage: 100` (the default) is safe and independently re-verified end-to-end through Phase 2's dry-run behavior. `rollout_percentage: 10` and `50` are **not currently usable at all** — not "less safe," but non-functional.

---

# 7. Secret Safety

- **Secrets are never printed / values never logged:** grepped the entire file for every plausible leak shape — no `echo "$CLOUDFLARE_API_TOKEN"`, no interpolation of `secrets.*` into any `echo`/`console.log`/job-summary line, no secret value written to `$GITHUB_OUTPUT`/`$GITHUB_ENV`. **PASS.**
- **Only names are checked, never values:** every secret-presence check queries `wrangler versions view --json` for `.resources.bindings[] | select(.type == "secret_text")` — Cloudflare's own API has no mechanism to return a secret's value in this response (independently confirmed by direct inspection of real `versions view --json` output against the live production Worker: `secret_text` bindings carry only `name`/`type`, no `text`/`value` field at all — unlike `plain_text` bindings, which do carry their value). This is not merely a workflow-level discipline; the platform API itself makes returning a value impossible via this path. **PASS.**
- **Least-privilege exposure:** `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are declared in `env:` only on the specific steps that invoke `wrangler` (A3, previous-version capture, Phase 1, binding verification, Phase 2) — never job-wide. **PASS.**

**LOW note, not a workflow-specific flaw:** the last line of defense against an *accidental* leak (e.g., if `wrangler` itself ever printed a token in an error message) is GitHub Actions' own automatic secret-masking, which redacts exact-substring matches of any value registered as a secret via `env:`/`secrets.*`. This is a real, functioning backstop, but it is a platform-level mechanism with a well-known limitation (defeated by any transformation/encoding of the value before printing) — not something this workflow adds or could meaningfully strengthen further. No evidence was found of this workflow doing anything that would defeat it.

---

# 8. Smoke Tests

All 10 checks (S1–S10) were read and their logic traced; the underlying mechanism (writing each response body to a file before grepping it, rather than piping a shell variable) was independently spot-checked for soundness and found consistent with the file's own stated rationale.

| # | Check | Assessment |
| --- | --- | --- |
| S1 | `/` → 200, `<html lang="fa" dir="rtl">` | Sound |
| S2 | `/fa` → 308 → `/` | Sound |
| S3 | `/en` → 200, `<html lang="en" dir="ltr">` | Sound |
| S4 | `/services`, `/en/services`, `/ar/services` → 200 | Sound — only check with full fa/en/ar coverage |
| S5 | `/products` → 200, dynamic slug discovery or legitimate empty state | Sound, correctly avoids hardcoding catalog data |
| S6 | Catalog detail (`<h1>`) or 404-on-empty fallback | Sound |
| S7 | `/contact` → form + Turnstile markup, **no submission** | Sound; deliberate, documented non-coverage of actual RFQ delivery (see below) |
| S8 | Unknown route → 404 | Sound |
| S9 | 5 security headers on `/` only | Sound but single-page (see MEDIUM below) |
| S10 | Apex → 308 → `www` | Sound |

## Could smoke pass while the real site is broken? Yes, in three specific, characterizable ways.

1. **RFQ submission end-to-end is never exercised — by explicit, documented design, not an oversight.** `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §8 states this plainly: there is no non-production Odoo credential to safely test against, and a real customer-identity RFQ must never be auto-submitted. If `TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN`, or the Odoo-side endpoint were subtly broken, **S1–S10 would report `PASSED (10/10)` while the site's single most business-critical conversion path silently failed for every real customer.** This is a known, accepted, already-documented tradeoff — restated here because the audit explicitly asked the question and the honest answer is yes, this is a real blind spot, by design, with the documented mitigation being human post-release observation (queue/DLQ health, Turnstile success rate) rather than an automated check.
2. **MEDIUM — locale coverage gap.** S5/S6/S7 (catalog index, catalog detail, RFQ page) only ever request the default, unprefixed (fa) locale. A regression isolated to `/en/products`, `/ar/products`, `/en/contact`, or `/ar/contact` — e.g. a broken translation, a locale-routing bug, a missing catalog editorial row for a non-default locale — would not be caught by any of the ten checks, even though S4 demonstrates the pattern for checking all three locales was already known and used elsewhere in the same step.
3. **Inherent (LOW), not a defect:** every check here is a plain `curl` — no JavaScript execution, no browser rendering. A client-side hydration error, a broken interactive widget, or any failure that doesn't change the server-rendered HTML/status code/headers is invisible to this entire smoke suite. This is a standard, accepted limitation of curl-based smoke testing generally, not something unique to this implementation.

**LOW:** S9 checks headers on `/` only, not on `/products`, `/contact`, or other page types. Given headers are applied via global middleware (not per-route logic, per the code reviewed in the prior implementation session), one representative page is a reasonable proxy — flagged for completeness, not as a real gap.

**LOW:** S9 confirms *a* CSP header exists (`content-security-policy` or `content-security-policy-report-only`) but does not distinguish which — matching the design document's own stated criterion exactly (not a deviation). A regression from enforced CSP back to report-only, or vice versa, would not move this check's pass/fail outcome.

---

# 9. Rollback

- **Previous version capture:** **PASS**, independently re-verified this session (§6) to return the correct, live, currently-serving version id, and to fail closed if it cannot be determined.
- **Rollback command correctness:** the printed command (`wrangler versions deploy "$PREVIOUS_VERSION_ID@100" --config dist/server/wrangler.json --yes`) is syntactically identical in shape to the same `versions deploy` invocation this audit independently dry-run-tested and confirmed works for a full, single-version 100% deploy. **Sound for the common case** — a straightforward, single-previous-version rollback to 100%.

  **Caveat surfaced by this audit, not previously documented anywhere:** `PREVIOUS_VERSION_ID` is extracted as `.versions[0].version_id` from the *last* entry of `wrangler deployments list --json`. If production were already in a split-traffic state at the moment this workflow is dispatched — for instance, a *prior* `deploy-production.yml` run had used `rollout_percentage: 10` and (per the CRITICAL finding above) never had a working path to reach 100% — the last deployment entry could in principle carry more than one `.versions[]` element, and this extraction would silently capture only the first, discarding information about any other concurrently-live version and its share. Given the CRITICAL finding means a non-100% dispatch cannot currently complete Phase 2 at all, this specific compounding scenario cannot actually arise *from this workflow's own prior runs* today — but it is not structurally impossible if production traffic were ever split by some other, external mechanism (e.g. a manual `wrangler versions deploy` split performed outside this pipeline). Recorded as a LOW-probability, not-currently-reachable-via-this-workflow edge case, not scored separately.
- **D1 rollback limitation documented:** **PASS.** `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §9 explicitly and correctly states that a Worker rollback never rolls back D1, that no down-migrations exist in this repository, and that D1 Time Travel (not a routine rollback step) discards any row written after its bookmark, including any RFQ submitted after that point — with the durable-first-write RFQ path (D1 → outbox → Queue → Odoo) correctly noted as preserved across a Worker-level rollback but not across a D1 Time Travel restore. This is accurate, clearly stated, and matches this repository's actual, already-implemented RFQ architecture (verified against the codebase in a prior session, not re-verified line-by-line in this audit but consistent with everything else observed).
- **No automatic rollback:** **PASS**, and correctly justified (a migration-caused smoke failure is not fixed by reverting the Worker; an automated revert could mask a partially-applied data change). The smoke-gate failure path prints the exact rollback command with `PREVIOUS_VERSION_ID` already substituted, both to the job log and the job summary.

---

# 10. Operational Readiness

- **Evidence generated:** **PASS** — job summary (three sections: deployment header, staging provenance, release evidence + rollback command), a job-output set (SHA, both version ids, rollout %, provenance run, timestamp), and a 365-day-retention `production-release-evidence-<run_id>.json` artifact. Nothing here was independently re-run (would require an actual dispatch, out of this audit's scope), but the code paths that produce each of these were read and are structurally sound — no missing field, no secret value included, consistent with `PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §10's evidence scheme (scaled down to what this task's own item 8 explicitly asked for — a per-release narrative report and recovery-snapshot JSON from the fuller design-doc scheme are not implemented, and the implementation report says so plainly rather than silently under-delivering).
- **Manifest append-only:** `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` exists, is currently empty (no real release yet — accurate, since this workflow has never been dispatched), and documents the append-only convention and exactly which evidence fields map to which columns. **LOW note:** this is a documentation convention, not a technically enforced one — nothing (no git hook, no CI check on PRs touching this file) would prevent a future edit from rewriting an existing row rather than appending a new one. Consistent with how every other convention-based doc in this repository already works; not a new or unique gap.
- **Audit trail exists:** **PASS** — the combination of GitHub's own environment deployment-review record (who approved, when — not re-typed by hand anywhere), the job summary, the evidence artifact, and (once a real release happens) a manifest row provides a genuine, cross-referenced audit trail. The workflow correctly does **not** attempt to write to the repository itself (`permissions:` never includes `contents: write` — independently confirmed absent from the file, and statically enforced by a mutation test in `workflow-invariants.test.ts` that was re-run this session and passes), which is the right call given `docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md` §10's own stated reasoning (every other report in this repository was produced by a human/agent reading a run's output after the fact, never by a workflow committing to itself).

---

# Cross-check against the supporting controls

- **`lib/ci/workflow-invariants.test.ts`:** re-run this session, **33/33 passing**, including the production-specific `validateProductionDeploySafetyShape()` and its 6 mutation tests (each independently re-verified to still correctly detect its target regression). These are purely textual/structural checks — by construction, they cannot and do not catch a *runtime/functional* defect like the CRITICAL `rollout_percentage` finding above, which only a real (or `--dry-run`) invocation of `wrangler versions deploy` with a non-100 percentage could reveal. This is not a weakness in the tests themselves so much as a reminder that static text-matching and functional/integration testing are different, both-necessary layers — and this repository's own testing for this workflow, per `PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md` §5.2, exercised the first layer thoroughly and the second layer only for the default (`@100`) path.
- **`docs/release/PRODUCTION_DEPLOY_WORKFLOW_DESIGN.md`:** the architecture it specifies is faithfully implemented in every respect this audit checked, including two respects where the *implementation* correctly deviated from the design document's own illustrative pseudocode after finding it wrong (§3's `.inputs.deploy_ref`, per the precheck report; §9's `head -20`/`head -1` rollback-capture bug, found and fixed independently during implementation, per that report's own §3). This audit found one further place where the design document's own pseudocode (§6, the single-version-spec `versions deploy` call) was implemented faithfully but was *itself* incorrect and never re-validated for non-default input — the CRITICAL finding above.
- **`docs/release/PRODUCTION_PIPELINE_PRECHECKS_REPORT.md`:** its two conclusions (secret inheritance across `versions upload`; the corrected staging-provenance mechanism) were both independently re-confirmed live in this audit, not merely trusted.
- **`docs/release/PRODUCTION_WORKFLOW_IMPLEMENTATION_REPORT.md`:** its stated test counts (1362/1362, 33/33) were independently re-run and matched exactly. Its own §5.1 (the file-vs-pipe `grep` finding) and §3 (the two design-doc corrections) were spot-checked against the actual current file content and found accurately described. No factual claim in this report was found to be false; the CRITICAL and HIGH findings above are gaps in *coverage* (what was tested/checked), not misstatements of what was tested.

---

# What Would Change This Verdict

- Fixing the CRITICAL finding (§6) — or, as a same-day compensating control, removing `"10"`/`"50"` from `rollout_percentage`'s `options` (or documenting, loudly, "do not use anything but 100 until fixed") — would clear the path to a GO for the default rollout path, which is otherwise solid.
- Widening A1 to cover the remaining six `vars.*` keys (§3, HIGH) is the next highest-value fix — cheap (a handful of equality checks, same pattern already used for `APP_ENV`) relative to the severity of what it currently misses.
- The MEDIUM findings (§2, §4, §5) are all "currently fine, silently fragile" — none block a first real release on their own, but each represents a plausible future breakage with no early-warning system in place today.

No finding in this audit required, or was verified via, an actual production deployment, a Cloudflare mutation, a GitHub settings change, a secret change, or a migration. Every reproduction used `--dry-run`, a read-only API call, or a purely local bash-semantics test.
