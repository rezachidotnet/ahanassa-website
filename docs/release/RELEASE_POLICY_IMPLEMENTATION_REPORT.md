# Release Policy Implementation Report (`POLICY_BOOTSTRAP`)

Scope: design and implement the authoritative Ahan Asa Website Release Policy and its policy engine, after R3 was closed and registered. This document is the durable audit trail for that bootstrap, per `docs/release/RELEASE_POLICY.md` §16.

**Update (hardening pass, this task):** an independent review correctly identified two governance gaps in the original bootstrap — (1) the report's language did not distinguish a *correct, tested policy engine* from *active release-time enforcement*, and (2) a fresh Claude Code session starting from the repository's default branch (`main`) would not discover `CLAUDE.md` or `docs/release/RELEASE_POLICY.md` at all. Both are corrected below and in `docs/release/RELEASE_POLICY.md` §0. Section headings below are annotated `[hardening pass]` where they were added or materially revised by this correction; everything else is the original bootstrap record, left intact.

---

## Result

```
RESULT: PASS
```

Every deliverable phase 1–23/25–26 of the task completed. Phases 22/24/27 were explicitly out of scope by instruction and were not attempted (see "What was NOT done" below).

---

## Hardening pass — governance gaps closed `[hardening pass]`

An independent review of the original bootstrap correctly identified two gaps before PR #6 could be merged. Both are addressed here; PR #6 itself remains **unmerged**, per this task's explicit instruction.

### Gap 1 — engine vs. enforcement conflation

```
POLICY_ENGINE_IMPLEMENTED: YES
RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO
```

Verified by direct inspection, not assumed: `grep -rn "release-risk-classifier\|release-ledger\|emergency-rollback\|policy-bootstrap\|FINAL_RISK\|classifyDiff\|resolveBaseProductionSha" .github/workflows/*.yml` on `chore/release-policy` returns **zero matches**. No workflow — `ci.yml`, `deploy-staging.yml`, `deploy-production.yml`, or `verify-production.yml` — invokes any policy-engine module or reads/gates on `FINAL_RISK`. `npm test` exercising the classifier against synthetic fixtures (via `.github/workflows/ci.yml`, which already runs on every push/PR) proves the **engine is correct**; it proves nothing about whether a real release **consults** it, because nothing does yet.

Corrected in three places:
- `docs/release/RELEASE_POLICY.md` §0/§0.1 — new section explicitly defining `POLICY_ENGINE_IMPLEMENTED` vs. `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` as distinct claims, replacing the earlier undifferentiated "machine enforcement... run as part of npm test" framing.
- `CLAUDE.md` §5b and its §6 reading-map row — both now say "policy **engine**" (`POLICY_ENGINE_IMPLEMENTED: YES`) rather than "machine enforcement", with an explicit `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO` callout.
- This report — see "Files" below, "Machine enforcement:" retitled.

**Nothing about the engine's behavior changed** — no classifier logic, no test, no ledger/rollback/bootstrap function was touched. This is a documentation-accuracy correction only.

### Gap 2 — default-branch governance discovery

```
DEFAULT_BRANCH_CLAUDE_DISCOVERY: FAIL (pre-sync) — a sync PR (#7) is open to fix it; still FAIL until #7 merges
```

Audited directly: `git ls-tree origin/main --name-only` (full repository tree, re-confirmed this task) contains no `CLAUDE.md` and no `docs/` directory at all — `main` is an unrelated, ~13-file legacy Vercel-era holding-page skeleton (its own `README.md`: "statically generated Next.js App Router site deployed on Vercel"). A fresh Claude Code session starting on `main` would load no project `CLAUDE.md` and have no path to `docs/release/RELEASE_POLICY.md` without already knowing to check out a different, historically-unrelated branch. **This requirement was not satisfied.**

**Main-sync classification** (`REQUIRED_ON_MAIN_NOW` / `REQUIRED_ON_APPLICATION_BRANCH` / `REQUIRED_ON_BOTH` / `FUTURE_ONLY`):

| File | Classification | Reasoning |
| --- | --- | --- |
| `CLAUDE.md` | `REQUIRED_ON_BOTH` (distinct content per branch) | This is the discovery mechanism itself — Claude Code auto-loads whatever `CLAUDE.md` sits at the checked-out root. Without one on `main`, nothing on that branch ever points anywhere. The full 20 KB application `CLAUDE.md` was deliberately **not** copied verbatim — it names `01-sources/`, `app/`, `lib/rfq/`, `DOCS_INDEX.md`, etc., none of which exist on `main`'s tree, which would mislead a session into treating dangling references as real. A minimal, `main`-specific stub was written instead (see PR #7). |
| `docs/release/RELEASE_POLICY.md` | `REQUIRED_ON_BOTH` (byte-identical content) | The stub's own instruction ("read `docs/release/RELEASE_POLICY.md`") is only actually satisfiable from a cold `main` checkout if the file exists there — otherwise the "root instruction" is a dead pointer requiring an undocumented branch switch. Synced byte-for-byte (verified via `diff`), same pattern already used for the three workflow files. |
| `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` | `REQUIRED_ON_APPLICATION_BRANCH` (not synced to `main`) | The ledger is operationally meaningful only alongside a real release diff — `BASE_PRODUCTION_SHA` resolution requires the actual application commit graph, which exists only on `feat/header-hero-integrated`. `main`'s environment branch policy already restricts every real deploy/verify dispatch to that branch (`docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`), so nothing executing from `main` ever needs to read this file. Syncing it would be exactly the "blindly sync files" anti-pattern the task warns against — declined, with reasoning recorded here rather than left undecided. |
| `lib/ci/**` (classifier/ledger/rollback/bootstrap engine + tests) | `FUTURE_ONLY` | Required on `main` only once/if a workflow that *executes from* `main` needs to consume it. None does: `ci.yml` runs the copy on whatever ref triggered it (needs no `main` copy to test `chore/release-policy`'s own code); `deploy-production.yml`/`deploy-staging.yml`/`verify-production.yml` only ever dispatch from `feat/header-hero-integrated` per the existing environment branch policy. Re-classify to `REQUIRED_ON_MAIN_NOW` the day a `main`-executed workflow is introduced that needs it — not before. |

**Fix implemented:** PR #7 (`chore/register-release-governance` → `main`), branched directly from `origin/main` (never from `feat/header-hero-integrated` — no unrelated-history merge), adding exactly the two `REQUIRED_ON_BOTH` files above. `lib/ci/policy-bootstrap.ts#checkPolicyBootstrapDiff` run against PR #7's own two-file change list returns `{ ok: true }`. **Not merged by this task.**

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

Policy engine (`POLICY_ENGINE_IMPLEMENTED: YES`; not yet wired into any release-time workflow — see "Hardening pass" above):
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
BOOTSTRAP_REGISTRATION_PR: https://github.com/rezachidotnet/ahanassa-website/pull/6 — OPEN, NOT MERGED
```

Work was committed on `chore/release-policy`, branched from `feat/header-hero-integrated` (the real application branch — `main` and it have unrelated histories, confirmed by `git merge-base origin/main origin/feat/header-hero-integrated` returning no common ancestor, per `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`). PR #6 targets `feat/header-hero-integrated`, not `main` — see the next paragraph for why no `main` sync applies here.

**No `main`-registration sync was required by the original bootstrap task for GitHub Actions workflow-discovery reasons**, unlike prior R1–R3 work. Every prior sync (`chore/register-production-workflow`, `chore/sync-production-workflow-hardening`, `chore/sync-production-smoke-gate-fix`, `chore/register-verify-production-workflow`, `chore/sync-r3-deterministic-version-selection`) existed because those tasks changed a `workflow_dispatch`-only file, and GitHub Actions only lists a `workflow_dispatch` workflow in its dispatch UI/API if a copy exists on the default branch (`main`). This task changed **no** `.github/workflows/*.yml` file. `.github/workflows/ci.yml` — the one workflow that actually consumes `lib/ci/**` (via `npm test`) — triggers on `push`/`pull_request` with no branch filter and always runs the copy present on the pushed ref itself; it needs no `main` registration to execute against `chore/release-policy`.

**A different, second kind of `main` sync turned out to be required** — not for GitHub Actions workflow discovery, but for **Claude Code governance discovery** (Gap 2, "Hardening pass" above): a fresh session starting on `main` needs a `CLAUDE.md` to auto-load at all, which is a filesystem-checkout concern independent of GitHub Actions' own workflow-listing mechanism. That gap is closed by PR #7, not by any change to `.github/workflows/`. The classifier/ledger/rollback/bootstrap modules themselves remain library code consumed by tests and by future workflow steps that will `actions/checkout` the application branch (or an exact `deploy_ref` on it) directly — still `FUTURE_ONLY` for `main`, unchanged by this correction.

---

## Production mutation

```
PRODUCTION_DEPLOY_DISPATCHED: NO
PRODUCTION_TRAFFIC_CHANGED: NO
D1_CHANGED: NO
```

No workflow was dispatched. No Cloudflare, D1, or secret state was touched. `git status`/`git diff` confirm the only files this task changed are the ones listed above, plus generated `tsconfig.tsbuildinfo` churn from running `npm test`/`tsc` locally (left uncommitted — not part of this task's deliverable and carries no policy meaning). This holds through the hardening pass too: PR #7 (`chore/register-release-governance`) adds exactly two documentation files to a branch off `main`, contains no application runtime code (verified by `lib/ci/policy-bootstrap.ts#checkPolicyBootstrapDiff`), and was pushed/opened but not merged.

---

## Readiness

```
POLICY_BOOTSTRAP_READY: YES
POLICY_ENGINE_IMPLEMENTED: YES
RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO
DEFAULT_BRANCH_CLAUDE_DISCOVERY: FAIL — PR #7 open (chore/register-release-governance -> main), not merged; discovery becomes PASS once #7 merges
POLICY_LIFECYCLE_STATE: BOOTSTRAP_REGISTERED
MAIN_GOVERNANCE_SYNC_REQUIRED: YES
MAIN_GOVERNANCE_SYNC_FILES:
  CLAUDE.md                                       -> REQUIRED_ON_BOTH (main gets a distinct minimal stub)
  docs/release/RELEASE_POLICY.md                  -> REQUIRED_ON_BOTH (byte-identical sync)
  docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md  -> REQUIRED_ON_APPLICATION_BRANCH (not synced to main)
  lib/ci/** (classifier/ledger/rollback/bootstrap) -> FUTURE_ONLY (not synced to main)
MAIN_GOVERNANCE_PR: https://github.com/rezachidotnet/ahanassa-website/pull/7 — OPEN, NOT MERGED
BASE_PRODUCTION_SHA: UNRESOLVED
BOOTSTRAP_STABLE_SHA_GUESSED: NO
PR6_READY_TO_MERGE: YES — technically ready (tests/typecheck clean, terminology/status corrected, no unresolved defect); merge itself still requires explicit owner authorization, withheld by this task's own instruction
READY_TO_BUILD_PROMOTION_WORKFLOW: YES — the contract is fully specified in RELEASE_POLICY.md §11; building it remains a separate, future, explicitly-authorized task per this task's own Phase 22 instruction.
PRODUCTION_MUTATION: NONE
```

`POLICY_BOOTSTRAP_READY: YES` means the bootstrap artifacts (policy, engine, tests, ledger formalization, `CLAUDE.md` instructions, and now the default-branch discovery fix) are complete and internally consistent — it does **not** mean the policy is `ACTIVE` (§0) or that release-time enforcement exists (`RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: NO`). `PR6_READY_TO_MERGE: YES` is a technical readiness assessment only; per this task's explicit instruction, **PR #6 is not merged, and neither is PR #7.**

---

## What was NOT done (explicit scope boundaries honored)

- `promote-production.yml` was not built (Phase 22 — contract defined only, §11).
- No `Deploy Production`, `Verify Production`, or promotion dispatch.
- No Worker version uploaded or deployed; no traffic change; no rollback executed.
- No D1 migration applied; no D1 mutation.
- No secret modified; no GitHub Environment protection changed.
- **PR #6 was not merged.** **PR #7 (the new default-branch governance sync) was not merged either.** Both remain open, per this task's explicit instruction — merging either is a distinct action requiring separate, explicit authorization.
- No workflow file was changed by either PR — release-time enforcement (Gap 1) was documented as not-yet-active, not retrofitted into a workflow, which would have been a materially larger, separately-scoped change.
- `BOOTSTRAP_STABLE_SHA_UNRESOLVED` was preserved exactly — no SHA was guessed or fabricated to make bootstrap "look" complete (`BOOTSTRAP_STABLE_SHA_GUESSED: NO`, re-verified this task).
- `01-sources/`, `logo/`, `design-reference/` untouched.
- The pre-existing uncommitted working-tree state from before this task (`PUSH_MANIFEST.md`, `docs/audit/`, `docs/release/PRODUCTION_BRANCH_POLICY_DECISION.md`, `docs/review/`, and the modified `REPORT_BUNDLE_MANIFEST.txt`) remains deliberately uncommitted and out of every commit in this task — unrelated prior work, not this task's to commit or discard.

---

## Remaining actions

1. ~~Open PR #6~~ — done, `chore/release-policy` → `feat/header-hero-integrated`, `OPEN`/`MERGEABLE`, not merged.
2. ~~Correct PR #6's terminology/status (Gap 1) and open a default-branch governance sync PR (Gap 2)~~ — done, this task: PR #6 updated with the §0/§0.1 lifecycle-state and engine-vs-enforcement corrections; [PR #7](https://github.com/rezachidotnet/ahanassa-website/pull/7) opened (`chore/register-release-governance` → `main`), not merged.
3. Review and merge PR #6, then PR #7 (order does not strictly matter — #7 does not depend on #6 merging first, since it was synced from the content already committed to `chore/release-policy` — but re-diff `docs/release/RELEASE_POLICY.md` between the two branches before merging either, in case #6 receives further review changes first). Both need the same explicit "go ahead and merge" every prior registration PR in this repository's history has required. **Neither is merged by this task.**
4. Once merged, re-verify `DEFAULT_BRANCH_CLAUDE_DISCOVERY: PASS` from a genuinely fresh clone checked out at `main` (not just by reading the diff) — the honest test is a cold session, not a re-read of this report.
5. The `BOOTSTRAP_STABLE_SHA_UNRESOLVED` gap (DAR-058) resolves itself the first time the future promotion workflow promotes the current canary to 100% — no separate action is required to "fix" it, only to build and use that workflow (a distinct future task, per Phase 22).
6. Wiring `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` to `YES` (Gap 1's remaining half) is its own future, explicitly-scoped task: add a preflight step to `deploy-production.yml` that runs the classifier against `BASE_PRODUCTION_SHA..deploy_ref` and fails the run when the declared release path doesn't match `FINAL_RISK`. Not attempted here — it touches a live production workflow, explicitly out of this task's no-production-mutation scope.
7. Build `promote-production.yml` per the §11 contract, as its own explicitly-authorized task — and, once release-time enforcement (action 6) exists, extend it into that workflow too, not just `deploy-production.yml`.

---

**End of `RELEASE_POLICY_IMPLEMENTATION_REPORT.md`. STOP — PR #6 not merged, PR #7 not merged, promotion workflow not built, no release-time enforcement wired, production not touched.**
