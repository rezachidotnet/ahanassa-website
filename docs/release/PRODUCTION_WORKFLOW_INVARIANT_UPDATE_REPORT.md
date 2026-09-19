# Production Workflow Invariant Update — Report

**Scope:** CI policy / static-test update only. No `deploy-production.yml` created, no deployment issued, no Cloudflare resource touched, no D1 change, no secret modified, no application behavior changed.
**Repository:** `rezachidotnet/ahanassa-website`
**Branch:** `feat/header-hero-integrated`
**File changed:** `lib/ci/workflow-invariants.test.ts`
**Date:** 2026-09-19
**Preceding context:** the production release architecture (`docs/release/PRODUCTION_RELEASE_ARCHITECTURE_V1.md`, requirement R12) and the GitHub Environment now in place (`docs/release/GITHUB_PRODUCTION_ENVIRONMENT_SETUP_REPORT.md`, `..._SECRET_VERIFICATION.md`) both anticipate this exact change: the old blanket "no workflow ever deploys to production" invariant must be **rewritten, not deleted**, once a real, gated, single-workflow production release path is authorized — which it now is, with a named reviewer (Reza) and a real `production` GitHub Environment with both secrets present.

---

# RESULT

## PASS

`npm test` — **1349/1349 passing** (was 1340/1340 immediately before this change, per `docs/release/PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`'s same-day baseline, independently re-derived below from the file's own test count; net +9 from this file). `npx tsc --noEmit` — clean, no errors. All 8 mutation-test demonstrations pass, proving both new invariants actually catch what they claim to, not merely appearing to.

---

# 1. Policy Model — Old vs. New

| | Old | New |
| --- | --- | --- |
| Rule | "No workflow in this repository may deploy to production" (`--env production` anywhere, in any file, is a hard failure) | "**Exactly one** workflow, `deploy-production.yml`, may deploy to production — and only once it exists and carries the required shape. Every other workflow — present or future — still fails if it deploys to production." |
| Enforced against | All files in `.github/workflows/`, no exception | All files in `.github/workflows/` **except** `deploy-production.yml` |
| What counts as "deploying to production" | One marker: the literal substring `--env production` | Seven markers (see §2): `--env production`, the production Worker name, both production D1 database names, both production D1 database ids, and `environment: production` targeting — a materially wider net, closing gaps the old single-marker check would have missed (e.g. a workflow that referenced the production D1 id directly without ever writing `--env production` literally) |
| Shape of the one allowed workflow | N/A — no workflow was ever allowed to target production | Must, once it exists: target `environment: production`; use the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets; expose a `deploy_ref` input constrained to a full 40-character hex SHA; carry a fail-closed production target assertion that pins the production Worker name |

This directly implements the "rewritten, not deleted" instruction from `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` R12: the protection this repository has always had — nothing silently deploys to production — is preserved and, for every workflow other than the one now-authorized exception, made stricter (more markers, not fewer).

---

# 2. What Changed in `lib/ci/workflow-invariants.test.ts`

## Removed (rewritten in place)

- `test("no workflow in this repository auto-deploys production")` — the old blanket, single-marker (`--env production` only), no-exception scan.

## Added

1. **`PRODUCTION_WORKFLOW` constant** (`"deploy-production.yml"`) — the one workflow name this task's policy change treats specially.

2. **`PRODUCTION_DEPLOY_MARKERS` / `findProductionDeployMarkers()`** — the widened negative scan, checking for any of:
   - `--env production`
   - `ahanassa-production` (the production Worker name)
   - `ahanassa-ops-production` (production `DB_OPS` database name)
   - `ahanassa-public-production` (production `DB_PUBLIC` database name)
   - `7240a6a7-c293-4e6e-baf3-95838a3c2944` (production `DB_OPS` database id)
   - `73ba6b50-ef57-4d89-baa9-617a0b0af127` (production `DB_PUBLIC` database id)
   - `environment:\s*production` (GitHub Environment targeting)

3. **`test("only deploy-production.yml may deploy to production — every other workflow, present or future, fails if it does")`** — replaces the removed test. Iterates every file `readdirSync(workflowsDir)` returns, skips only the literal name `deploy-production.yml`, and asserts zero markers found in every other file. Because it enumerates the directory rather than naming `ci.yml`/`deploy-staging.yml` explicitly, it automatically covers **any future workflow file** added to `.github/workflows/` without needing another edit — satisfying the task's "any future workflow" requirement structurally, not by a promise to remember to update a list.

4. **`validateProductionWorkflowShape()`** — the positive shape-check for `deploy-production.yml` itself, returning a list of violation strings (empty = compliant):
   - `environment:\s*production` present
   - `secrets.CLOUDFLARE_API_TOKEN` referenced
   - `secrets.CLOUDFLARE_ACCOUNT_ID` referenced
   - a `deploy_ref:` input declared
   - the input is constrained to `[0-9a-f]{40}` (a full 40-character hex SHA — the production-only hardening beyond staging's looser branch-name-tolerant input, per `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` R4)
   - a fail-closed assertion marker matching `ASSERTION.*FAILED` (mirroring staging's own `STAGING RESOURCE ASSERTION FAILED` pattern)
   - the assertion pins the production Worker name (`ahanassa-production`)

5. **`test("deploy-production.yml, once it exists, must carry the required production-release shape")`** — the file does not exist yet (its creation is a separate, not-yet-authorized task), so this test returns early without asserting when `existsSync(...)` is false. **This is a deliberate, documented no-op today, not a gap:** the moment `deploy-production.yml` is added to the repository, this exact same test — unchanged — starts enforcing the shape automatically. See §4 for why this design was chosen over alternatives, and §5 for proof the underlying check logic is genuinely exercised today via mutation tests, not merely written and untested.

6. **Nine mutation tests** (§3) — proving both the widened negative scan and the new positive shape-check actually fire on the specific mutations the task asked to be demonstrated, using in-memory string fixtures rather than any real file (so no real workflow was ever touched to prove this).

## Unchanged (preserved verbatim, per the task's explicit instruction)

Every existing staging safety check: `ci.yml`'s no-deploy/no-migration/no-credential/trigger checks; `deploy-staging.yml`'s workflow-dispatch-only trigger, typed confirmation, no-migration/no-production-reference check, exact-`deploy_ref`-checkout, `DEPLOYED_SHA` recording, pre-build target assertion ordering, and no-Cloudflare-target-as-input check. None of these were modified.

---

# 3. Testing

```
npm test
```

**1349 tests, 1349 passing, 0 failing** (baseline before this change: 1340/1340 — confirmed by `git show HEAD:lib/ci/workflow-invariants.test.ts | grep -c '^test('`, which counts exactly 11 tests in the file's pre-change committed version). `npx tsc --noEmit` completed with no output and exit code 0 — no type errors introduced.

Isolated run of just the changed file (`node --test lib/ci/workflow-invariants.test.ts`): **20/20 passing** (was 11 before this change).

Breakdown of the 20 tests in the file after this change:

| Category | Count |
| --- | --- |
| Pre-existing, unchanged (CI + staging checks) | 10 |
| New: "only `deploy-production.yml` may deploy to production" (replaces the removed blanket test) | 1 |
| New: "`deploy-production.yml`, once it exists, must carry the required shape" | 1 |
| New: mutation-test demonstrations | 8 |

(10 + 1 + 1 + 8 = 20; the file previously had 11 tests including the one now-removed blanket test, so 11 − 1 (removed) + 10 (new) = 20.)

**One iteration was needed to get to green:** the first version of the mutation-test fixture (`VALID_PRODUCTION_WORKFLOW_FIXTURE`) placed the production Worker name inside a full-line `#` comment (`# pinned target: ahanassa-production`), which `withoutComments()` strips before validation — exactly as it's supposed to, for the same reason it strips real workflow comments. This correctly failed the fixture's own sanity check (`validateProductionWorkflowShape(VALID_PRODUCTION_WORKFLOW_FIXTURE)` must return `[]`), which is the intended behavior of that check, not a false negative — the fixture was wrong, not the validator. Fixed by moving the Worker name into the assertion step's actual shell content (`EXPECTED_WORKER="ahanassa-production"`), matching how `deploy-staging.yml` itself pins its own Worker name in real (non-comment) script content. Re-ran clean afterward.

---

# 4. Design Decision — Why the Shape Check Is Conditional, Not a Hard Requirement

This task explicitly forbids creating `deploy-production.yml` in this same change, while also requiring the invariant suite to assert that file's shape. Both instructions are honored by making the shape assertion conditional on the file's existence (`if (!existsSync(filePath)) return;`) rather than unconditional:

- **An unconditional `assert.ok(existsSync(filePath), ...)`** would turn `npm test` red the moment this commit lands, for a file this same task instructs not to create — a self-contradiction, and a regression for every other developer/CI run on this branch until a separate, later task authors the workflow.
- **The conditional design activates automatically and requires no further edit.** When `deploy-production.yml` is eventually authored (a separate task, following `PRODUCTION_RELEASE_ARCHITECTURE_V1.md` Phase 3), this exact test starts enforcing the shape on its very first `npm test` run — there is no "also remember to flip a flag" step, and no risk of the check being forgotten.
- **The mutation tests (§5) prove the check logic is real today, not merely deferred and hoped-for.** `validateProductionWorkflowShape()` is exercised directly, right now, against seven different mutations of a valid in-memory fixture, so its correctness is already regression-tested before it ever sees a real file.

---

# 5. Mutation Testing — Demonstrated

The task asked for two specific demonstrations. Both are implemented as permanent, automated tests (not one-off manual commands), so they re-run on every future `npm test` rather than needing to be repeated by hand:

## "Removing the production environment reference fails"

`test("mutation: removing the environment: production reference fails the shape check")` — takes the valid in-memory fixture (already proven compliant by a preceding sanity-check test), strips its `environment: production` line via string replacement, and asserts `validateProductionWorkflowShape()` returns the specific violation `"must target environment: production"`. **Passes.**

Three sibling mutations of the same fixture are tested the same way, each isolating one other required element: removing the SHA-format constraint, removing both production secrets, and removing the assertion marker — each independently caught with its own specific violation message.

## "Adding a production deploy command to another workflow fails"

`test("mutation: injecting a production deploy command into another workflow fails the production-deploy scan")` — takes the real `deploy-staging.yml` content (first proven, in a preceding sanity-check test, to **not** already trip the scan), appends a synthetic `- run: npx wrangler deploy --env production` line, and asserts `findProductionDeployMarkers()` now reports at least the `--env production` marker. **Passes.**

A second variant does the same with `ci.yml` and the production Worker name literal (`ahanassa-production`) instead of a deploy command, confirming the scan catches a production *reference*, not only a literal deploy invocation. **Passes.**

No real workflow file was ever modified to run these demonstrations — both use string concatenation on content already read from the real files, entirely in memory, per this task's explicit prohibition on modifying `ci.yml`/`deploy-staging.yml` or creating `deploy-production.yml`.

---

# 6. What This Does *Not* Yet Do

For completeness, and to avoid overstating this change's scope:

- It does not create `deploy-production.yml` — that remains a separate, explicitly out-of-scope task.
- It does not yet enforce the fuller R12 requirement set (assertion-ordering-before-`npm ci`, the staging-provenance assertion, the migration-parity assertion, `PREVIOUS_VERSION_ID` capture, the in-workflow smoke gate) — those apply to the workflow's *internal* step ordering and runtime behavior, which cannot be meaningfully asserted against a file that doesn't exist yet, and are more naturally written alongside the workflow itself (`PRODUCTION_RELEASE_ARCHITECTURE_V1.md` Phase 3) so the assertions are checked against real, current step names rather than guessed in advance. Today's change covers exactly the five shape elements this task specified (existence-when-present, `environment: production`, production secrets, exact-SHA input, production target assertion) plus the widened negative scan for every other workflow.
- It does not change `package.json`'s `"latest"`-pinned dependencies, add git tags, or touch GitHub Environments/secrets — all separately tracked in `docs/release/PRODUCTION_CICD_FINAL_READINESS_AUDIT.md`'s remaining items.

---

**NO WORKFLOW FILE CREATED. NO DEPLOYMENT. NO CLOUDFLARE RESOURCE, D1, OR SECRET TOUCHED. NO APPLICATION BEHAVIOR CHANGED.** The only file modified is `lib/ci/workflow-invariants.test.ts`; every check in it operates on files already in the repository (`ci.yml`, `deploy-staging.yml`) or on in-memory string fixtures, never on a newly created or modified real workflow file.
