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
