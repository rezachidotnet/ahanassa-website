# Release Policy Implementation Report (`POLICY_BOOTSTRAP`)

Scope: design and implement the authoritative Ahan Asa Website Release Policy and its machine enforcement, after R3 was closed and registered. This document is the durable audit trail for that bootstrap, per `docs/release/RELEASE_POLICY.md` §16.

---

## Result

```
RESULT: PASS
```

Every deliverable phase 1–23/25–26 of the task completed. Phases 22/24/27 were explicitly out of scope by instruction and were not attempted (see "What was NOT done" below).

---

## R3 / prerequisite state (verified this task, read-only)

```
R3_CLOSED: YES
```
`git log origin/main` shows PR #5 (`chore/sync-r3-deterministic-version-selection`) merged (`c05d67c`). `origin/main`'s copy of `.github/workflows/deploy-production.yml` is byte-identical to `feat/header-hero-integrated`'s (`git diff origin/main..HEAD -- .github/workflows/deploy-production.yml` — empty).

```
R3_REGISTERED: YES
```
Confirmed via `git ls-tree -r origin/main -- .github/workflows/` (all three workflow files present) and `git log origin/main --oneline` (PRs #1–#5 all merged).

Current production topology (read-only, from `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` and `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md`, not re-verified live by this task per its no-production-mutation constraint): canary `4a32c5f9-…` @10% (SHA `f2202ab5…`), stable `b07d8697-…` @90%, official 10% verification PASS.

---

## Files

```
POLICY_FILE: docs/release/RELEASE_POLICY.md
LEDGER_AUTHORITY: docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md (pre-existing file, formalized — not replaced)
```

Machine enforcement:
- `lib/ci/release-risk-classifier.ts` + `lib/ci/release-risk-classifier.test.ts`
- `lib/ci/release-ledger.ts` + `lib/ci/release-ledger.test.ts`
- `lib/ci/emergency-rollback.ts` + `lib/ci/emergency-rollback.test.ts`
- `lib/ci/policy-bootstrap.ts` + `lib/ci/policy-bootstrap.test.ts`

`CLAUDE.md` updated: new §5b ("Release Governance"), a new row in the §6 Task-to-Document Reading Map, version bumped 1.2.0 → 1.3.0, `Last updated` 2026-08-28 → 2026-09-22.

`DOCUMENT_AUDIT_REPORT.md` updated: DAR-058 records the bootstrap SHA-resolution gap (below).

---

## Ledger bootstrap

```
LEDGER_BOOTSTRAP: PASS
BOOTSTRAP_STABLE_SHA: UNRESOLVED
BASE_PRODUCTION_SHA_RESOLUTION: DETERMINISTIC
```

"PASS" here means the bootstrap procedure executed correctly and produced the deterministic, evidence-grounded answer the policy requires — not that a `STABLE_100` row was seeded. It explicitly was not: every document referencing the pre-canary stable Worker Version `b07d8697-620c-485c-8fed-21b893ab602c` cites only its creation timestamp, never a source commit SHA (unlike the earlier version `878a1e82-…`, which `docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md` explicitly ties to commit `6926aaa`). A prior audit's claim that this SHA is "recorded only in prose, in a Stage-1 report" was checked directly and does not hold — no such prose exists anywhere in the repository. Per `docs/release/RELEASE_POLICY.md` §4, this fails closed: `BOOTSTRAP_STABLE_SHA_UNRESOLVED`, no guessed SHA was seeded, and `BASE_PRODUCTION_SHA` for a hypothetical next release resolves deterministically to `BASE_PRODUCTION_SHA_UNRESOLVED` (`lib/ci/release-ledger.ts#resolveBaseProductionSha`, proven by tests). Full detail: `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` "Bootstrap status", `DOCUMENT_AUDIT_REPORT.md` DAR-058.

The current 10/90 canary is recorded in the ledger's new schema as `LEGACY_IN_FLIGHT_RELEASE` (`RELEASE_POLICY.md` §17), never as a `STABLE_100` substitute. This is self-resolving: the first successful 100% promotion of this exact canary (via the future `promote-production.yml`, §11) appends the ledger's first real `STABLE_100` row, at SHA `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` — a SHA this repository DOES have deterministic evidence for (captured live by `deploy-production.yml`'s own `DEPLOYED_SHA` step) — and that becomes `BASE_PRODUCTION_SHA` for every release after it.

---

## Policy content

```
AMBIGUOUS_DEFINITION_IMPLEMENTED: YES
RISK_CLASSES: LOW / MEDIUM / HIGH
LOW_CANARY_REQUIRED: NO
MEDIUM_CANARY_REQUIRED: NO
MEDIUM_NO_CANARY_EXPLICIT_POLICY: YES
HIGH_CANARY_REQUIRED: YES
MIXED_DIFF_HIGHEST_RISK_WINS: YES
RENAMES_DELETIONS_HANDLED: YES
EMERGENCY_ROLLBACK_PATH: DEFINED
ARBITRARY_ROLLBACK_TARGET_ALLOWED: NO
OBSERVATION_MINIMUM_DURATION: TBE
OBSERVATION_TIMESTAMPS_REQUIRED: YES
OWNER_OBSERVATION_ATTESTATION_REQUIRED: YES
LIVE_IDENTIFIER_HARDCODING: NO
POLICY_BOOTSTRAP_RUNTIME_CODE: NONE
POLICY_BOOTSTRAP_DEFINED: YES
AUDIT_TRAIL_IMPLEMENTED: YES
CLAUDE_MD_UPDATED: YES
MACHINE_CLASSIFIER: YES
SELF_DOWNGRADE_POSSIBLE: NO
UNKNOWN_PATH_BEHAVIOR: FAIL_CLOSED
R3_INVARIANTS_PRESERVED: YES
```

Every path group in `RELEASE_POLICY.md` §7/`lib/ci/release-risk-classifier.ts` was derived from a real, audited directory (`app/`, `components/`, `lib/`, `config/`, `migrations*/`, `.github/workflows/`, `01-sources/`, `docs/integrations/odoo/`, etc. — walked directly with `find`/`ls`, not assumed). No invented directory appears in any HIGH group. `LIVE_IDENTIFIER_HARDCODING: NO` — the only real historical identifiers in this task's deliverables live in `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` (evidence, explicitly exempted by `RELEASE_POLICY.md` §14) and the DAR-058 audit entry; every classifier/ledger/rollback test uses synthetic fixtures (`synthetic-sha-*`, `synthetic-version-*`, RFC-4122-shaped placeholder UUIDs), verified by direct read of each test file.

`POLICY_BOOTSTRAP_RUNTIME_CODE: NONE` — verified two ways: (1) manual review of every changed/added file against `RELEASE_POLICY.md` §16's allowed list (all are `docs/**`, `CLAUDE.md`, `DOCUMENT_AUDIT_REPORT.md`, or `lib/ci/**`); (2) `lib/ci/policy-bootstrap.ts#checkPolicyBootstrapDiff` run directly against this task's own real changed-file list (`git status --short`), returning `{ ok: true }` — the bootstrap diff passes its own machine check.

---

## Tests / typecheck

```
TEST_RESULTS: 1463/1463 passing, 0 failing (52 new tests across lib/ci/release-risk-classifier.test.ts, lib/ci/release-ledger.test.ts, lib/ci/emergency-rollback.test.ts, lib/ci/policy-bootstrap.test.ts; 1411 pre-existing tests unaffected)
TYPECHECK: PASS (npx tsc --noEmit — clean)
```

`npm run build` also run and clean (not required by the task's phase list, run anyway as additional evidence). The 35 required scenarios (`RELEASE_POLICY.md` §Phase 19) are all covered — see the numbered test names in `lib/ci/release-risk-classifier.test.ts` (1–23), `lib/ci/release-ledger.test.ts` (24–27), `lib/ci/emergency-rollback.test.ts` (28–31), `lib/ci/policy-bootstrap.test.ts` (32–33). Tests 34/35 ("current R3 deterministic role tests remain passing", "`.versions[0]` positional selection remains prohibited") are satisfied by the existing, untouched `lib/ci/production-version-role-discovery.test.ts` and `lib/ci/verify-production-workflow.test.ts`, both still passing in the full suite — nothing in this task modified either file.

---

## Branch / registration

```
BOOTSTRAP_REGISTRATION_PR: not yet opened — see "Remaining actions"
```

Work was committed on `chore/release-policy`, branched from `feat/header-hero-integrated` (the real application branch — `main` and it have unrelated histories, confirmed by `git merge-base origin/main origin/feat/header-hero-integrated` returning no common ancestor, per `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`).

**No `main`-registration sync was required by this task**, unlike prior R1–R3 work. Every prior sync (`chore/register-production-workflow`, `chore/sync-production-workflow-hardening`, `chore/sync-production-smoke-gate-fix`, `chore/register-verify-production-workflow`, `chore/sync-r3-deterministic-version-selection`) existed because those tasks changed a `workflow_dispatch`-only file, and GitHub Actions only lists a `workflow_dispatch` workflow in its dispatch UI/API if a copy exists on the default branch (`main`). This task changed **no** `.github/workflows/*.yml` file. `.github/workflows/ci.yml` — the one workflow that actually consumes `lib/ci/**` (via `npm test`) — triggers on `push`/`pull_request` with no branch filter and always runs the copy present on the pushed ref itself; it needs no `main` registration to execute against `chore/release-policy`. The classifier/ledger/rollback/bootstrap modules are library code consumed by tests and by future workflow steps that will `actions/checkout` the application branch (or an exact `deploy_ref` on it) directly — never by anything that needs to exist on `main` for discovery. This was verified, not assumed: `.github/workflows/ci.yml` was read in full this task.

---

## Production mutation

```
PRODUCTION_DEPLOY_DISPATCHED: NO
PRODUCTION_TRAFFIC_CHANGED: NO
D1_CHANGED: NO
```

No workflow was dispatched. No Cloudflare, D1, or secret state was touched. `git status`/`git diff` confirm the only files this task changed are the ones listed above, plus generated `tsconfig.tsbuildinfo` churn from running `npm test`/`tsc` locally (left uncommitted — not part of this task's deliverable and carries no policy meaning).

---

## Readiness

```
POLICY_BOOTSTRAP_READY: YES
READY_TO_BUILD_PROMOTION_WORKFLOW: YES — the contract is fully specified in RELEASE_POLICY.md §11; building it remains a separate, future, explicitly-authorized task per this task's own Phase 22 instruction.
```

---

## What was NOT done (explicit scope boundaries honored)

- `promote-production.yml` was not built (Phase 22 — contract defined only, §11).
- No `Deploy Production`, `Verify Production`, or promotion dispatch.
- No Worker version uploaded or deployed; no traffic change; no rollback executed.
- No D1 migration applied; no D1 mutation.
- No secret modified; no GitHub Environment protection changed.
- The bootstrap registration PR was not opened or merged (see below) — this task authored and validated the changes on `chore/release-policy` and reports readiness; opening/merging the PR is a distinct action requiring the same explicit authorization every prior registration PR in this repository's history required before merge.
- `01-sources/`, `logo/`, `design-reference/` untouched.
- The pre-existing uncommitted working-tree state from before this task (`PUSH_MANIFEST.md`, `docs/audit/`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`, `docs/review/`, and the modified `REPORT_BUNDLE_MANIFEST.txt`) was deliberately left uncommitted and out of this task's commit — unrelated prior work, not this task's to commit or discard.

---

## Remaining actions

1. Open a PR from `chore/release-policy` to `main` (or to `feat/header-hero-integrated`, whichever the owner wants as the review target — note `main` cannot run `npm test` meaningfully today since it lacks `lib/ci/**` and most of this repository's application tree; review against `feat/header-hero-integrated` is the more meaningful diff). **Not opened by this task** — needs the same explicit "go ahead and open/merge" the prior five registration PRs each required.
2. Once reviewed, merge `chore/release-policy` into `feat/header-hero-integrated` (this repository's real application branch/source of truth).
3. `main` needs no separate sync for this task's deliverables (see "Branch / registration" above) — re-confirm this holds if a future task adds a new `workflow_dispatch` file that consumes `lib/ci/**` (it would then need the same two-step main-registration pattern used for R1–R3).
4. The `BOOTSTRAP_STABLE_SHA_UNRESOLVED` gap (DAR-058) resolves itself the first time the future promotion workflow promotes the current canary to 100% — no separate action is required to "fix" it, only to build and use that workflow (a distinct future task, per Phase 22).
5. Build `promote-production.yml` per the §11 contract, as its own explicitly-authorized task.

---

**End of `RELEASE_POLICY_IMPLEMENTATION_REPORT.md`. STOP — bootstrap PR not merged, promotion workflow not built, production not touched.**
