# Global Release Policy Enforcement — Implementation Report

**Task:** activate the Ahan Asa Website Release Policy by wiring the existing release-risk classifier into the real production release workflow (`deploy-production.yml`), fail closed.
**Date:** 2026-09-22
**Branch:** `chore/activate-release-policy-enforcement` → `feat/header-hero-integrated` (application PR); `chore/register-release-policy-enforcement` → `main` (registration PR).
**Authority:** `docs/release/RELEASE_POLICY.md` (§0, §2, §5–§10, §13, §15), `CLAUDE.md` §5b.

No production workflow was dispatched. No traffic, Worker Version, D1 database, secret, or GitHub Environment setting was touched.

---

## Result block

```
RESULT: PASS

BASE_PRODUCTION_SHA: f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9
BASE_PRODUCTION_SHA_RESOLVED: YES

CLASSIFIER_WIRED_TO_DEPLOY_PRODUCTION: YES
CLASSIFIER_EXECUTES_BEFORE_PRODUCTION_MUTATION: YES
DECLARED_RISK_REQUIRED: YES
SELF_DOWNGRADE_POSSIBLE: NO
AMBIGUOUS_FAILS_CLOSED: YES
FINAL_RISK: max(declared, computed)

LOW_PATH_ENFORCED: YES
MEDIUM_PATH_ENFORCED: YES
HIGH_PATH_ENFORCED: YES
HIGH_DIRECT_100_BLOCKED: YES
STAGING_PROVENANCE_PRESERVED: YES
AUDIT_TRAIL_EMITTED: YES

GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: YES — effective on merge of the application PR
POLICY_LIFECYCLE_STATE: ACTIVE on merge of the application PR (BOOTSTRAP_MERGED until then)

CLAUDE_MD_UPDATED: YES
RELEASE_POLICY_UPDATED: YES
DAR_058_UPDATED: YES

TEST_RESULTS: npm test — 1557 tests, 1557 pass, 0 fail (1507 before this task + 50 new in lib/ci/release-gate.test.ts)
TYPECHECK: PASS (npx tsc --noEmit)
READ_ONLY_REAL_SIMULATION: PASS

APPLICATION_PR: #13 (chore/activate-release-policy-enforcement -> feat/header-hero-integrated), OPEN
MAIN_REGISTRATION_PR: #14 (chore/register-release-policy-enforcement -> main), OPEN

PRODUCTION_WORKFLOW_DISPATCHED: NO
PRODUCTION_TRAFFIC_CHANGED: NO
NEW_WORKER_VERSION_CREATED: NO
D1_CHANGED: NO
SECRETS_CHANGED: NO

READY_TO_MERGE_ENFORCEMENT: YES (after review)
READY_FOR_NEXT_APPLICATION_RELEASE: NO (until both PRs are reviewed and merged, and DAR-061 is addressed before the next promotion)
```

> **Superseded in part — see "Addendum, 2026-09-23" at the end of this report.** The block above is the record of the 2026-09-22 enforcement task and is kept unedited. DAR-059, DAR-060 and DAR-061, listed there as open findings, have since been resolved on the same branch (PR #13); the corrected result block, tests and simulation are in the addendum. Nothing above is retracted — the behavior it describes is what shipped on 2026-09-22 and what the addendum then changed.

---

## Phase 0 — Fresh state (verified this task, not from memory)

| Claim | Value | Evidence |
| --- | --- | --- |
| `POLICY_ENGINE_IMPLEMENTED` | YES | `lib/ci/release-risk-classifier.ts`, `release-ledger.ts`, `emergency-rollback.ts`, `policy-bootstrap.ts` and their tests present on `feat/header-hero-integrated` (`2ec392a`) |
| `PROMOTION_POLICY_ENFORCEMENT_ACTIVE` | YES | `promote-production.yml` imports `lib/ci/release-ledger.ts` and binds ledger state; run `35719752606` succeeded |
| `GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` (before) | NO | no reference to `release-risk-classifier` in any workflow (grep) |
| `BASE_PRODUCTION_SHA_RESOLVED` | YES | `parseLedgerTable` + `resolveBaseProductionSha` on the real manifest → `f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9`, the single `STABLE_100` row (second ledger row, appended after run `35719752606`) |
| Baseline in git history | YES | `f2202ab5…` is an ancestor of `feat/header-hero-integrated` |
| Production dispatch ref | `feat/header-hero-integrated` only | `production` Environment deployment-branch policy (read-only API call); runs `35533626395`, `35719752606`, `35567845828` all dispatched from it |

The resolver returned a deterministic `STABLE_100` baseline, so the task proceeded. The baseline SHA is not hardcoded anywhere in workflow or engine logic (test 26/27).

---

## Phase 1 — `deploy-production.yml` flow and gate position

Order after this change (★ = new):

1. Input validation (`confirm`, 40-hex `deploy_ref`, rollout format, expected-version UUIDs)
2. `deploy_ref` existence check via GitHub API (pre-checkout)
3. Checkout `deploy_ref` — now `fetch-depth: 0`
4. Resolve deployed SHA (HEAD must equal `deploy_ref`)
5. Setup Node.js — moved up from after A3 (executes nothing from `deploy_ref`; `cache: npm` only hashes the lockfile)
6. ★ **Release policy gate**
7. A1 production-target assertion (local file parse)
8. A2 staging provenance (Deploy Staging log scan)
9. A3 migration parity (first Cloudflare call, read-only)
10. `npm ci` / tests / typecheck / build
11. Capture `PREVIOUS_VERSION_ID` (R3 role discovery, unchanged)
12. Phase 1 `wrangler versions upload` — first production mutation
13. Secret/binding verification
14. Phase 2 `wrangler versions deploy` — traffic shift
15. Evidence capture (★ now embeds the policy decision) + upload
16. Smoke gate S1–S10 (unchanged, still byte-identical to verify/promote)
17. ★ Release policy audit record (always) + ★ upload (always)

**Why position 6.** It is the earliest point where `DEPLOYED_SHA` is resolved and the full history is present, and it is before every step that reads or writes production (A3's Cloudflare call, Phase 1, Phase 2) and before any `deploy_ref` code runs (`npm ci`). Classifying before A1–A3 also means a policy-invalid dispatch spends no Cloudflare API calls.

**Trust model — the key design decision.** `deploy-production.yml` deliberately never runs code from the `deploy_ref` checkout before A1 (A1's script is inline for exactly this reason). Running `lib/ci/release-gate-cli.ts` from the checkout would let a candidate replace the classifier or the ledger that judges it. The gate therefore extracts the four engine files with `git archive "$POLICY_REF"` into `$RUNNER_TEMP` (outside the workspace) and reads the ledger with `git show "$POLICY_REF":docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`, where `POLICY_REF = github.sha` — the workflow's own commit on `feat/header-hero-integrated`, the same trust anchor as the workflow file itself. A test executes the real step against a hostile candidate that replaces the gate CLI with an always-permit stub and proves the trusted engine still blocks it.

---

## Phase 2 — Risk input model

- New required input `declared_risk` (`type: choice`, `LOW`/`MEDIUM`/`HIGH`, no default). `type: choice` is not enforced server-side for API dispatches, so the gate re-validates: anything other than exactly `LOW`, `MEDIUM`, `HIGH` (including empty, lowercase, whitespace-padded) → `DECLARED_RISK_INVALID`.
- `FINAL_RISK = max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)` via the existing `computeFinalRisk`. The gate always classifies the diff regardless of the declaration, so declaring `HIGH` never skips classification (an `AMBIGUOUS` diff declared `HIGH` is still `CLASSIFICATION_REQUIRED`).
- `AMBIGUOUS` → `CLASSIFICATION_REQUIRED`, fail closed; `COMPUTED_MINIMUM_RISK`/`FINAL_RISK` stay null. Nothing is coerced to MEDIUM.

## Phase 3 — Baseline resolution

New `resolveBaseProductionShaFromManifest` in `lib/ci/release-ledger.ts` wraps the existing parser/resolver with a strict read, because `parseLedgerTable` is positional and lenient (silently skips short rows, defaults empty state). It fails closed (`LEDGER_MALFORMED`) on: no ledger table; more than one `RELEASE_SHA`-headed table; first 11 header columns not exactly the §3 schema in order; bad separator; a row whose cell count differs from the header; a non-40-hex `RELEASE_SHA`; an unknown `RELEASE_STATE`; an unknown `FINAL_RISK` (the historical `LEGACY_IN_FLIGHT_RELEASE` marker is accepted as-is). Then: no `STABLE_100` row → `BASE_PRODUCTION_SHA_UNRESOLVED`; baseline commit missing from history → `BASE_COMMIT_MISSING`; ledger unreadable at `POLICY_REF` → `LEDGER_UNREADABLE`. `BASE_PRODUCTION_SHA` and `CANDIDATE_SHA` are in the job summary (plus `BASE_IS_ANCESTOR_OF_CANDIDATE` as evidence, not a gate).

## Phase 4 — Computed risk

`git diff --name-status -z -M -C --no-ext-diff BASE CANDIDATE --`. `-z` so paths are never C-quoted; `-M -C` per §10. The new `parseNameStatusZ` keeps A/M/D/T and R/C with source and destination, and fails closed on any other status (U, X, B) or a truncated record. The parsed set goes straight into `classifyDiff`. The workflow contains no path taxonomy and no ledger parsing (test 28 scans its executable lines for taxonomy/ledger markers).

## Phase 5 — Enforcement contract

`RELEASE_POLICY.md` §5 defines the paths and does name the canary percentage (HIGH: "10% canary"), so no new percentage policy was invented:

| `FINAL_RISK` | permitted `rollout_percentage` | notes |
| --- | --- | --- |
| LOW | `100` | policy path "direct 100%"; canary not required |
| MEDIUM | `100` | same |
| HIGH | `10` | canary entry leg only; 100% only via `verify-production.yml` → observation (§12) → `promote-production.yml` (§11) |

`50` is used by no policy path and is refused for every risk. The input's options stay `["10","50","100"]` because `workflow-invariants.test.ts` pins them; the gate is the single source of truth for what is permitted. **Judgment call, flagged for review:** LOW/MEDIUM at `10` are refused rather than allowed as an "optional canary". Reason: §5 lists the LOW/MEDIUM path as direct 100%, and keeping "every canary is a HIGH-path canary" consistent means `promote-production.yml` never promotes a canary whose release path is undefined. An operator who wants a canary declares `HIGH` (the §6 escalation mechanism). The existing deterministic canary machinery (R3 role discovery, complementary split, `PREVIOUS_VERSION_ID`) is untouched.

## Phase 6 — Staging provenance

Not weakened. A2's log scan is byte-for-byte unchanged except the break-glass branch: `skip_staging_provenance=true` is now refused when `FINAL_RISK` is HIGH (gate `HIGH_REQUIRES_STAGING_PROVENANCE`, plus a second check in A2), and is honored for LOW/MEDIUM only after the gate has set `FINAL_RISK`. **Conflict reported, not resolved:** §5 lists staging for LOW/MEDIUM with no break-glass, while the workflow has always had one. Per this task's Phase 6 the LOW/MEDIUM behavior was kept as-is and recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-059 for an owner decision.

## Phase 7 — Emergency rollback separation

`deploy-production.yml` has no rollback path and none was added. The gate always records `OPERATION_TYPE: RELEASE`. `lib/ci/emergency-rollback.ts` is unchanged and nothing routes a rollback through the gate.

## Phase 8 — Audit trail

- **Gate step:** job-summary section with every required field plus the changed-file table (first 300 rows; the full list is always in the artifact).
- **Evidence artifact** `production-release-evidence-<run_id>`: gains `operation_type`, `base_production_sha`, `declared_risk`, `computed_minimum_risk`, `final_risk`, `expected_release_path`, and the whole decision under `release_policy`. The change is additive, so `promote-production.yml`'s lookup (`.new_version_id`, `.deployed_sha`, …) is unaffected.
- **Always-run audit step + artifact** `release-policy-audit-<run_id>` (`if: always()`): decision + `STAGING_PROVENANCE_RUN_ID` (from A2, or `NOT_REACHED`) + `SMOKE_RESULT` + `NEW_VERSION_ID` + final `RESULT` (`PASS`, `FAIL (job status: …)`, `BLOCKED_BY_POLICY: <code>`, or `FAIL (stopped before the release policy gate …)`). Blocked runs get an audit record too.
- Permissions unchanged: `contents: read`, `actions: read`.

## Phase 9/10 — Activation state and document updates

§0 `ACTIVE` criteria, freshly evaluated:

| Criterion | Status |
| --- | --- |
| Policy merged on application branch | YES (PR #6) |
| Default-branch discovery present | YES (PR #7/#8); this task's main PR keeps `RELEASE_POLICY.md` byte-identical |
| Engine implemented | YES |
| Release-time enforcement wired in | YES on merge of the application PR (gate + tests on this branch) |
| `BASE_PRODUCTION_SHA` resolvable | YES (`f2202ab5…`) |
| Interim exception eliminated | YES: the `LEGACY_IN_FLIGHT_RELEASE` canary (§17) was promoted by run `35719752606` |

So the documents now state `ACTIVE`, explicitly **effective on merge** of the application PR, with `BOOTSTRAP_MERGED` as the live state until then (a document claiming `ACTIVE` is not evidence by itself, per §0).

- `CLAUDE.md` (v1.4.0): §1 status, §5b lifecycle paragraph (`BASE_PRODUCTION_SHA_RESOLVED: YES`, `GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE: YES`, `ACTIVE`), a new MUST-NOT bullet (no working around the gate), §6 reading-map row.
- `docs/release/RELEASE_POLICY.md`: lifecycle header, §0 state table, §0.1 values, new §0.2 (the enforcement contract), §17 closure note. `MINIMUM_OBSERVATION_DURATION` stays `TBE`. `prevent_self_review` is not touched.
- `DOCUMENT_AUDIT_REPORT.md`: DAR-058 gets an update note. The historical fact is preserved (the SHA behind `b07d8697-…` is still unknown), and it no longer blocks baseline resolution now that a `STABLE_100` row exists. New findings DAR-059/060/061 are listed below.
- The ledger (`PRODUCTION_DEPLOYMENT_MANIFEST.md`) was **not** modified.

---

## Phase 11 — Tests

`npm test`: **1557 tests, 1557 pass, 0 fail** (baseline before this task: 1507 / 1507). `npx tsc --noEmit`: **PASS**. New file: `lib/ci/release-gate.test.ts` (50 tests). Mapping to the required list:

| # | Requirement | Test(s) |
| --- | --- | --- |
| 1 | baseline from latest STABLE_100 | `1.`, `1b.` (real ledger) |
| 2 | no STABLE_100 → fail closed | `2.`, `2b.` |
| 3 | malformed ledger → fail closed | `3.` (8 malformations), `3b.`, `3c.`, `4b/3d.` (real git) |
| 4 | candidate SHA exists | `4.`, `4b/3d.` |
| 5 | diff from BASE..CANDIDATE | `5.`, `5b.`, `5c.` (real git: pre-base changes excluded, tree diff) |
| 6–8 | LOW / MEDIUM / HIGH computed | `6.`, `7.`, `8.` |
| 9 | mixed LOW+HIGH → HIGH | `9.` |
| 10–12 | delete HIGH / rename into / out of HIGH | `10.`, `11.`, `12.`, `10b/11b/12b.` (real `git mv`/`git rm`) |
| 13 | unknown path → fail closed | `13.` |
| 14–17 | declared/computed/final combinations | `14.`–`17.` |
| 18 | malformed declared risk | `18.` |
| 19 | classifier ambiguity | `13.`, `19.` |
| 20–23 | HIGH direct-100 blocked / HIGH canary allowed / LOW / MEDIUM direct | `20.`, `21.`, `21b.`, `22.`, `23.`, `23b.` |
| 24 | no bypass flag | `24.`, mutation test (conditional / continue-on-error gate caught) |
| 25 | no declared-risk-only behavior | `25.`, `19.` |
| 26–27 | no hardcoded baseline SHA / Worker IDs | `26/27.` |
| 28 | no classification in YAML/bash | `28.`, mutation test (engine from candidate caught) |
| 29 | audit summary fields | `29.`, `5c.` |
| 30 | artifact carries risk data | `30.` |
| 31 | R3 role-discovery invariants | existing `production-version-role-discovery.test.ts`, all pass |
| 32 | promote-production invariants | existing `promote-production-workflow.test.ts`, all pass (file unchanged) |
| 33 | no `.versions[0]` | `33.` + existing R3 test |
| 34 | staging provenance not weakened | `34.` |
| 35–37 | no D1 / secret / environment mutation | `35/36/37.` |
| — | executed trust model | "gate step, executed for real …" (permit LOW), "runs the TRUSTED engine …" (hostile candidate), "does not trust a zero exit alone", "fails closed when POLICY_REF is not in the object store" |
| — | ordering / shape | "carries the release-policy-gate shape" + 7 mutations (removed, conditional, continue-on-error, engine from candidate, policy ref from input, shallow checkout, gate after upload) |

Two real defects were found by these tests and fixed before commit. First, the CLI's "am I the entrypoint?" guard compared `import.meta.url` with `argv[1]`, and that silently skipped `main()` when the temp path was a symlink (macOS `/var` → `/private/var`). Second, `echo "FINAL_RISK=$(jq …)"` does not trip `set -e`. Together they could have let a gate that never ran look like a pass. The CLI now runs unconditionally, and the step independently asserts the decision record says `PERMITTED` with a real `FINAL_RISK` before exporting it.

## Phase 12 — Read-only real simulation

The actual "Release policy gate" step script was extracted from `deploy-production.yml` and executed with `bash -e` against the real repository (`POLICY_REF` = this branch's commit `678911a`; runner env simulated with local temp dirs). No workflow was dispatched and no Cloudflare call was made. The synthetic candidates were local-only commits in a throwaway worktree, never pushed, and removed afterwards.

| Scenario | Candidate | declared / rollout | Result |
| --- | --- | --- | --- |
| real app tip | `2ec392a` | LOW / 100 | BLOCKED `ROLLOUT_NOT_PERMITTED_FOR_RISK` — computed HIGH (32 files; `HIGH_GOVERNANCE_PATHS`, `HIGH_RELEASE_PATHS`) |
| real app tip | `2ec392a` | HIGH / 10 | PERMITTED, `FINAL_RISK=HIGH` exported |
| real app tip | `2ec392a` | LOW / 10 | PERMITTED — FINAL HIGH (declared LOW cannot downgrade) |
| real app tip | `2ec392a` | HIGH / 10, skip provenance | BLOCKED `HIGH_REQUIRES_STAGING_PROVENANCE` |
| real app tip | `2ec392a` | HIGH / 50 | BLOCKED `ROLLOUT_NOT_PERMITTED_FOR_RISK` |
| docs-only on base | synthetic | LOW / 100 | PERMITTED, LOW (`NON_GOVERNANCE_DOC`) |
| docs-only on base | synthetic | LOW / 10 | BLOCKED `ROLLOUT_NOT_PERMITTED_FOR_RISK` |
| docs-only on base | synthetic | HIGH / 10 | PERMITTED, FINAL HIGH (`DECLARED_RISK_ESCALATION:HIGH`) |
| docs-only on base | synthetic | LOW / 100, skip provenance | PERMITTED (existing break-glass, DAR-059) |
| component change on base | synthetic | LOW / 100 | PERMITTED, computed MEDIUM → FINAL MEDIUM |
| component change on base | synthetic | MEDIUM / 10 | BLOCKED `ROLLOUT_NOT_PERMITTED_FOR_RISK` |
| new top-level dir | synthetic | HIGH / 10 | BLOCKED `CLASSIFICATION_REQUIRED` (`UNRECOGNIZED_TOP_LEVEL`) |
| docs-only on real tip | synthetic | LOW / 100 | BLOCKED — computed HIGH, ledger file `M … HIGH_RELEASE_PATHS` among changes (DAR-060) |
| `low` / empty declared | synthetic | — / 100 | BLOCKED `DECLARED_RISK_INVALID` |

The always-run audit step was also executed locally for three cases: gate blocked, stopped before the gate, and permitted-then-failed. The evidence-merge `jq` was run against a real decision file. All produced the expected fields.

---

## Pull requests

- **Application PR** (`chore/activate-release-policy-enforcement` → `feat/header-hero-integrated`): [#13](https://github.com/rezachidotnet/ahanassa-website/pull/13) — OPEN, not merged
- **Main registration PR** (`chore/register-release-policy-enforcement` → `main`): [#14](https://github.com/rezachidotnet/ahanassa-website/pull/14) — OPEN, not merged

**What goes to `main`, and why only that.** `main` exists for `workflow_dispatch` discovery; every production dispatch runs from `feat/header-hero-integrated` (Environment branch policy), and the gate reads its engine and ledger from the dispatching commit. So `main` needs:

- `.github/workflows/deploy-production.yml`, byte-identical (the new `declared_risk` input and gate)
- `docs/release/RELEASE_POLICY.md`, byte-identical (the existing sync convention)
- `CLAUDE.md` (main's own stub): its stale "`BOOTSTRAP_REGISTERED` as of this file's creation" line replaced with an instruction to check the policy's stated state and whether the named change has merged, plus one sentence on why `main` needs no `lib/ci/**` copy

It does **not** get the ledger, `lib/ci/**`, or any application file. The histories stay unrelated; nothing is merged across them.

**Neither PR has been merged.**

---

## Newly discovered findings (recorded in `DOCUMENT_AUDIT_REPORT.md`)

- **DAR-059: LOW/MEDIUM break-glass vs. §5.** Behavior was kept and the conflict reported (Phase 6). Owner decision needed.
- **DAR-060: every release after a ledger append classifies HIGH.** The ledger is a `HIGH_RELEASE_PATHS` file and its `STABLE_100` row is always appended after `RELEASE_SHA`, so `BASE..CANDIDATE` always contains it. The LOW/MEDIUM direct-100 paths are therefore unreachable in practice until §7 is amended (e.g. an append-only-rows exemption for that one file) or the owner accepts "every release is a HIGH canary release". This was confirmed on real history (simulation row "docs-only on real tip").
- **DAR-061: `promote-production.yml` hardcodes `final_risk: LEGACY_IN_FLIGHT_RELEASE`** in its `STABLE_100` evidence. It was correct for the one legacy promotion and wrong for any future one. It must read `final_risk` from the release-evidence artifact (which now carries it) before the next promotion.

## Remaining governance actions

- `MINIMUM_OBSERVATION_DURATION` — still `TBE` (§12); unchanged by design.
- Queue/DLQ backlog observability for the §12 observation record — still manual.
- `prevent_self_review` on the `production` Environment — still `false`; decision deferred, not touched.
- DAR-059: decide LOW/MEDIUM break-glass (amend §5 or remove the input).
- DAR-060: decide how ledger appends are classified. Until then every release is HIGH (10% canary → verify → observe → promote).
- DAR-061: make `promote-production.yml` propagate `FINAL_RISK` before the next promotion.
- Review and merge the application PR, then the main registration PR. The policy becomes `ACTIVE` on the application merge.
- First real gated dispatch: the next release will classify HIGH (at minimum because of this task's own `lib/ci/**`, workflow and governance changes), so it must be dispatched with `rollout_percentage=10` and staging provenance.


---

# Addendum — 2026-09-23: DAR-059 / DAR-060 / DAR-061 resolved

**Task:** resolve the three findings this report raised, before PR #13 and PR #14 are merged.
**Date:** 2026-09-23
**Branch:** `chore/activate-release-policy-enforcement` (PR #13) — the same branch, updated in place rather than opening overlapping application PRs.
**Authority:** owner decisions of 2026-09-23, recorded in `RELEASE_POLICY.md` §5.1, §7.1, §11.1 and `DOCUMENT_AUDIT_REPORT.md` DAR-059/060/061.

No production workflow was dispatched. No traffic, Worker Version, D1 database, secret, or GitHub Environment setting was touched.

## Corrected result block

```
RESULT: PASS

DAR_059: RESOLVED
DAR_060: RESOLVED
DAR_061: RESOLVED

LOW_PATH_REACHABLE: YES
MEDIUM_PATH_REACHABLE: YES
HIGH_PATH_REACHABLE: YES

ALL_NORMAL_RELEASES_REQUIRE_STAGING: YES
NORMAL_RELEASE_STAGING_BYPASS: NO
EMERGENCY_ROLLBACK_CONTRACT_CHANGED: NO

VALIDATED_LEDGER_APPEND_EXEMPTION: YES (lib/ci/ledger-append-exemption.ts, tested TypeScript — never YAML/bash)
LEDGER_TAMPERING_STILL_HIGH_OR_BLOCKED: YES
LEDGER_REMAINS_A_HIGH_RELEASE_PATH: YES

PROMOTION_PROPAGATES_RELEASE_FINAL_RISK: YES
PROMOTION_OPERATOR_CAN_OVERRIDE_RISK: NO
LEGACY_HISTORICAL_EVIDENCE_CHANGED: NO

GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE_ON_MERGE: YES
POLICY_LIFECYCLE_ON_MERGE: ACTIVE (BOOTSTRAP_MERGED until the corrected PR #13 merges)

TEST_RESULTS: npm test — 1605 tests, 1605 pass, 0 fail (1557 before this addendum; +48)
TYPECHECK: PASS (npx tsc --noEmit)
BUILD: PASS (npm run build)
READ_ONLY_SIMULATION: PASS

PRODUCTION_WORKFLOW_DISPATCHED: NO
PRODUCTION_TRAFFIC_CHANGED: NO
NEW_WORKER_VERSION_CREATED: NO
D1_CHANGED: NO
SECRETS_CHANGED: NO
```

## DAR-059 — staging provenance is mandatory for every release

| Change | Where |
| --- | --- |
| `skip_staging_provenance` input removed outright | `.github/workflows/deploy-production.yml` `workflow_dispatch.inputs` |
| A2 reduced to two outcomes: a proven `Deploy Staging` run, or `exit 1` | A2 step (both `elif` break-glass branches deleted; `staging_provenance_run=SKIPPED` can no longer be emitted) |
| Gate passes a hardcoded `RG_SKIP_STAGING_PROVENANCE="false"` | release policy gate step |
| New block code `STAGING_PROVENANCE_REQUIRED` refuses `true` at **every** `FINAL_RISK` (replacing `HIGH_REQUIRES_STAGING_PROVENANCE`) | `lib/ci/release-gate.ts` |
| Decision record carries `STAGING_PROVENANCE_REQUIRED: true` | audit record, job summary, evidence |
| Release evidence records `staging_provenance_required: true` instead of an operator flag | evidence step |
| Policy text | `RELEASE_POLICY.md` §0.2 table, §5 paths, new §5.1 |

`EMERGENCY_ROLLBACK` (§13) is untouched and is explicitly **not** the replacement break-glass: it is a separate `OPERATION_TYPE`, not reachable from `deploy-production.yml`, still requiring a recorded validated Worker Version ID, human approval, immediate smoke and a `ROLLED_BACK` row. A test asserts the gate neither imports nor calls its validator, and that the validator still behaves as before.

## DAR-060 — `VALIDATED_HISTORICAL_LEDGER_APPEND`

New module `lib/ci/ledger-append-exemption.ts` (tested TypeScript), wired in by `lib/ci/release-gate.ts` and extracted into the trusted engine by the gate step's `git archive`. The ledger is **not** reclassified — it stays a `HIGH_RELEASE_PATHS` file. The exemption removes exactly one thing from risk computation: a proven append-only historical row addition. The 14-point contract is `RELEASE_POLICY.md` §7.1.

Two distinct non-exempt outcomes, by design:

- **NOT EXEMPT (stays HIGH):** row edited / deleted / reordered, schema or header change, prose or legacy-table change, no row appended, rename/delete/add of the ledger, no ledger or no table at `BASE_PRODUCTION_SHA`.
- **FAIL CLOSED (`LEDGER_INTEGRITY_VIOLATION`, no risk level assigned):** malformed or duplicated table in the candidate, malformed appended row, appended row that is not completed historical evidence, appended row naming `CANDIDATE_SHA`, or an append that would move `BASE_PRODUCTION_SHA` resolution.

Audit fields added to every decision: `LEDGER_CHANGE_PRESENT`, `LEDGER_APPEND_EXEMPTION_APPLIED`, `LEDGER_APPEND_VALIDATION_RESULT`, plus `LEDGER_APPEND_REASONS` and `LEDGER_APPENDED_ROWS`. An exempt ledger still appears in `CHANGED_FILES` with risk `EXEMPT`.

A guard test asserts no workflow carries the exemption's decision vocabulary — the logic is never path filtering in YAML or bash.

**Known, recorded consequence (DAR-062):** the current baseline `f2202ab5…` predates the policy-schema ledger table, so the exemption does not apply to the very next release. That release is HIGH on its own merits anyway. From the release after it, the LOW/MEDIUM paths are reachable.

## DAR-061 — promotion propagates the real `FINAL_RISK`

`promote-production.yml`'s release-evidence binding step gained a `FINAL_RISK BINDING` block (extracted and executed verbatim by the test suite). It reads `final_risk` from the same bound `production-release-evidence-*` document, after the existing `release_sha` / canary / stable / staging-provenance bindings pass and before any live Cloudflare read. It must be `LOW`, `MEDIUM` or `HIGH`; anything else — including `LEGACY_IN_FLIGHT_RELEASE` — fails closed. The validated value is exported as a step output and propagated verbatim into the promotion evidence JSON and the `STABLE_100` ledger row. No input supplies, defaults or overrides it. Historical evidence, including the existing `LEGACY_IN_FLIGHT_RELEASE` ledger row, is unchanged.

## Tests

| File | Tests | Note |
| --- | --- | --- |
| `lib/ci/ledger-append-exemption.test.ts` | 27 (new) | L0–L23, the exemption's unit contract |
| `lib/ci/release-gate.test.ts` | 61 (was 50) | DAR-059 staging cases; `DAR-060 A`–`I` end to end against real git |
| `lib/ci/promote-production-workflow.test.ts` | 52 (was 42) | DAR-061 shape, executed binding block, mutation guards |
| **`npm test` total** | **1605 pass / 0 fail** | 1557 before this addendum |

`npx tsc --noEmit`: PASS. `npm run build`: PASS.

## Read-only simulation (real repository history, synthetic candidates)

Run in a throwaway clone. No remote operation, no workflow dispatch, no Cloudflare call. Each scenario builds a synthetic release commit `R` on the real branch tip, appends `R`'s `STABLE_100` row to the real manifest as a row-only commit, then adds the candidate's own change; the gate CLI is run with the candidate as both `POLICY_REF` and `CANDIDATE_SHA` except where a tampered ledger requires a trusted side ref.

| # | Candidate diff (on top of a real-history base) | Declared | Rollout | Computed | Final | Exemption | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | ledger append + CSS-only change | LOW | 100 | LOW | **LOW** | applied | PERMITTED |
| B | ledger append + ordinary component change | LOW | 100 | MEDIUM | **MEDIUM** | applied | PERMITTED |
| B2 | same, declared MEDIUM | MEDIUM | 100 | MEDIUM | **MEDIUM** | applied | PERMITTED |
| C | ledger append + workflow change | LOW | 10 | HIGH | **HIGH** | applied | PERMITTED (canary leg) |
| C2 | same, attempted direct 100% | LOW | 100 | HIGH | **HIGH** | applied | BLOCKED `ROLLOUT_NOT_PERMITTED_FOR_RISK` |
| D | tampered ledger (historical row edited) + CSS | LOW | 10 | HIGH | **HIGH** | **denied** (`LEDGER_ROW_EDITED_OR_REORDERED`) | PERMITTED only on the HIGH path; baseline unmoved |
| E | LOW release attempting a staging-provenance bypass | LOW | 100 | LOW | LOW | — | BLOCKED `STAGING_PROVENANCE_REQUIRED` |
| F | future HIGH promotion: `final_risk` read from release evidence, emitted in `STABLE_100` evidence | — | — | — | **HIGH in → HIGH out** | — | PASS (evidence JSON and job-summary ledger row both `HIGH`) |

`BASE_PRODUCTION_SHA` resolved deterministically from the real ledger in every run (`f2202ab54a0cbbbd78f8c2625ed33e9c00fdbfb9` for the real file; the synthetic release commit in each scenario).

## Documents updated

- `docs/release/RELEASE_POLICY.md` — §0 lifecycle wording (ACTIVE on the **corrected** merge), §0.2, §3, §5 paths, new §5.1, new §7.1, §11 contract item, new §11.1, §15, §17.
- `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` — "How to append a row" now states the row-only rule and the completed-evidence requirements; the `SKIPPED` provenance value is marked no longer producible. **No ledger row was added, edited or removed.**
- `DOCUMENT_AUDIT_REPORT.md` — DAR-059/060/061 marked RESOLVED with resolution notes appended beneath the preserved original findings; new informational DAR-062.
- `CLAUDE.md` §5b — reflects mandatory staging, the ledger-append exemption and promotion risk propagation.

## Remaining governance actions (updated)

- `MINIMUM_OBSERVATION_DURATION` — still `TBE` (§12); unchanged by design.
- Queue/DLQ backlog observability for the §12 observation record — still manual.
- `prevent_self_review` on the `production` Environment — still `false`; decision deferred, not touched.
- DAR-062 — informational; closes itself at the first release classified against a post-bootstrap baseline.
- Review and merge PR #13, then PR #14. The policy becomes `ACTIVE` on the PR #13 merge.
- First real gated dispatch: still HIGH (this branch carries `.github/workflows/**`, `lib/ci/**` and governance-document changes), so `rollout_percentage=10` with real staging provenance.
