# Ahan Asa Website — Release Policy

**Lifecycle state:** `ACTIVE` — effective when the enforcement change recorded in `docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md` is merged into `feat/header-hero-integrated` (until that merge the live state remains `BOOTSTRAP_MERGED`). Every §0 `ACTIVE` criterion is then met: the policy and engine are merged on the application branch and discoverable from `main` (PR #6/#7, `docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`); `BASE_PRODUCTION_SHA` resolves from the ledger's first `STABLE_100` row (appended after `promote-production.yml` run `35719752606`, `docs/release/FIRST_PRODUCTION_100_PERCENT_PROMOTION_REPORT.md`); `deploy-production.yml` invokes the classifier against the real diff and gates on `FINAL_RISK` before any production mutation (§0.2); and the only interim exception, the `LEGACY_IN_FLIGHT_RELEASE` canary (§17), has been promoted and closed. History of the earlier states: `docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md`, `docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`.

**Established by:** `POLICY_BOOTSTRAP` (2026-09-22), after R3 (`docs/release/PRODUCTION_R3_DETERMINISTIC_VERSION_SELECTION_REPORT.md`) closed and PR #5 merged to `main`.

---

## 0. Lifecycle states and the enforcement-vs-engine distinction

**A minimal state model, replacing the earlier undifferentiated "Status: Active" claim** (an independent review correctly flagged that claim as premature — `docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md` records the correction):

| State | Meaning |
| --- | --- |
| `BOOTSTRAP_PENDING` | Policy/engine authored locally; not yet registered via any PR. |
| `BOOTSTRAP_REGISTERED` | Policy/engine committed, PR(s) open and reviewable, but not yet merged into the application branch. |
| `BOOTSTRAP_MERGED` | Merged into the application branch (`feat/header-hero-integrated`) **and** discoverable from the default branch (`main`'s `CLAUDE.md`/`RELEASE_POLICY.md` sync) — but release-time enforcement is **not** wired into any workflow, and/or `BASE_PRODUCTION_SHA` is not yet resolvable. State from PR #6/#7 (`docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`) until the §0.2 enforcement change merges. |
| `ACTIVE` | Everything `BOOTSTRAP_MERGED` requires, **and** release-time enforcement is wired in (§0.1), **and** `BASE_PRODUCTION_SHA` is resolvable or an explicit interim operating mode covering its absence is documented and owner-accepted. **← current state** once the §0.2 enforcement change is merged into the application branch (`docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md`). |

A document's own text claiming "Active" is never sufficient evidence of activation — activation is evidenced by merged commits, a workflow that actually invokes the classifier, and a resolvable ledger baseline (or a documented, accepted exception).

### 0.1 `POLICY_ENGINE_IMPLEMENTED` vs. `RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE`

These are two different claims and must never be conflated:

- **`POLICY_ENGINE_IMPLEMENTED`** — the classifier/ledger/rollback/bootstrap logic exists, is correct, and is covered by tests (`lib/ci/release-risk-classifier.ts`, `lib/ci/release-ledger.ts`, `lib/ci/emergency-rollback.ts`, `lib/ci/policy-bootstrap.ts`, exercised by `npm test` via `.github/workflows/ci.yml` on every push/PR). **Current value: YES.**
- **`RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE`** — an actual release (a `deploy-production.yml`/`deploy-staging.yml` run, or the future `promote-production.yml`) invokes the classifier against a real diff and gates on the resulting `FINAL_RISK` before proceeding. **Current value: YES** (named `GLOBAL_RELEASE_TIME_POLICY_ENFORCEMENT_ACTIVE` in the release reports) once the §0.2 change is merged: every `deploy-production.yml` run consults the classifier. `npm test` exercising the classifier against synthetic fixtures proves the engine is *correct*; §0.2's gate step is what makes a real release run *consult* it. Before that change this value was **NO** — no workflow referenced the classifier. `promote-production.yml` consults the ledger (not the classifier) for the canary it promotes (`PROMOTION_POLICY_ENFORCEMENT_ACTIVE: YES`, `docs/release/FIRST_PRODUCTION_100_PERCENT_PROMOTION_REPORT.md`); `deploy-staging.yml` is deliberately not gated — staging is the pre-production validation step every path requires, and classification is defined against `BASE_PRODUCTION_SHA`, i.e. for production releases.

Wiring it to `YES` was scoped as a distinct task — a step in `deploy-production.yml` that runs the classifier against `BASE_PRODUCTION_SHA..deploy_ref` and fails the run when `FINAL_RISK` does not match the release path. That step now exists (§0.2); the LOW/MEDIUM/HIGH paths of §5 are a **release-time gate**, not only operator discipline.

### 0.2 Release-time enforcement — `deploy-production.yml`'s release policy gate

Implemented by `lib/ci/release-gate.ts` (decision logic) and `lib/ci/release-gate-cli.ts` (git/ledger/output wrapper), run by the "Release policy gate" step of `.github/workflows/deploy-production.yml`, tested by `lib/ci/release-gate.test.ts`. Full record: `docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md`.

- **Position.** After the exact-SHA checkout and before A1/A2/A3, `npm ci`, the build, Phase 1 (`wrangler versions upload`) and Phase 2 (`wrangler versions deploy`) — no production read or write happens before it passes.
- **Trust.** The engine files and the ledger are read from the workflow's own commit (`github.sha` — the application branch, the only deployment branch the `production` Environment allows), never from the `deploy_ref` checkout. A candidate can never supply the classifier or ledger that judges it.
- **Baseline.** `BASE_PRODUCTION_SHA` = `RELEASE_SHA` of the latest `STABLE_100` row (§2), read strictly: a missing/duplicated/reordered ledger table, a malformed row, an unknown `RELEASE_STATE`, no `STABLE_100` row, or a baseline commit absent from git history all stop the run.
- **Change set.** `git diff --name-status -z -M -C BASE_PRODUCTION_SHA CANDIDATE_SHA` — adds, modifies, deletes, renames and copies with source and destination paths (§10). An unrecognized status stops the run.
- **Risk.** `DECLARED_RISK` is a required input (exactly `LOW`/`MEDIUM`/`HIGH`; anything else stops the run). `COMPUTED_MINIMUM_RISK` comes only from `classifyDiff`; `AMBIGUOUS` stops the run as `CLASSIFICATION_REQUIRED` whatever was declared. `FINAL_RISK = max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)` (§6).
- **Release path by `FINAL_RISK`** (§5):

  | `FINAL_RISK` | permitted `rollout_percentage` | staging provenance |
  | --- | --- | --- |
  | LOW | `100` only | required; the existing `skip_staging_provenance` break-glass is still honored (see `DOCUMENT_AUDIT_REPORT.md` DAR-059) |
  | MEDIUM | `100` only | as LOW |
  | HIGH | `10` only — the canary entry leg; 100% is reached only via `verify-production.yml`, the §12 observation record and `promote-production.yml` (§11) | required; `skip_staging_provenance=true` is refused |

  No path uses `50`, so no `FINAL_RISK` permits it. An operator who wants a canary for a LOW/MEDIUM diff declares `HIGH` (§6 escalation).
- **No bypass.** The step is unconditional; no input skips or overrides it.
- **Audit (§15).** Every run writes the decision (`OPERATION_TYPE`, `BASE_PRODUCTION_SHA`, `CANDIDATE_SHA`, `DECLARED_RISK`, `COMPUTED_MINIMUM_RISK`, `FINAL_RISK`, `TRIGGERED_RISK_RULES`, `CHANGED_FILES`, `CLASSIFICATION_RESULT`, `STAGING_PROVENANCE_RUN_ID`, `EXPECTED_RELEASE_PATH`, `RESULT`) to the job summary and the `release-policy-audit-<run_id>` artifact (on every outcome, including blocked runs), and embeds it in `production-release-evidence-<run_id>`. The ledger row is still appended by a separate, human-reviewed commit (§3); the workflow keeps `contents: read`.
- **Emergency rollback (§13)** is a separate `OPERATION_TYPE` and is not routed through this gate; `deploy-production.yml` gains no rollback path.

---

## 1. Scope

This policy governs:

- the Ahan Asa Website's Cloudflare Worker (`ahanassa-production` / `ahanassa-bootstrap-staging`)
- the `vinext` website runtime (Next.js App Router via `vinext` + `@vinext/cloudflare`, driven by Vite)
- the website's D1 databases (`DB_OPS`, `DB_PUBLIC`) — schema, migrations, access layers
- the website's CI/CD (`.github/workflows/*.yml`, `lib/ci/**`)
- the website-side boundary of Odoo integration: `lib/odoo/**`, the catalog/processing sync paths listed in §7, and `docs/integrations/odoo/**` (the contract documentation)

**This policy does NOT govern Odoo server/module production deployment** (`odoo-modules/**`, the live Odoo installation at `odoo.ahanassa.com`). Odoo requires its own, separate release policy; nothing here authorizes or constrains changes to Odoo itself. `odoo-modules/**` never enters the Cloudflare Worker build, so a change there carries zero *website* release risk under this classifier (`lib/ci/release-risk-classifier.ts`'s `OUT_OF_SCOPE_DIRS`) — that is a statement about blast radius on this deployment pipeline, not a statement that such a change is safe or unreviewed elsewhere.

---

## 2. Baseline authority — BASE_PRODUCTION_SHA

For every future release:

```
BASE_PRODUCTION_SHA = the RELEASE_SHA of the latest ledger row whose RELEASE_STATE is STABLE_100
CANDIDATE_SHA        = the exact SHA proposed for release (deploy_ref)
```

Risk is computed from `git diff BASE_PRODUCTION_SHA..CANDIDATE_SHA`.

**BASE_PRODUCTION_SHA is never:** `main`, a branch `HEAD`, the latest staging SHA, the latest commit, or the currently active canary's SHA. Only a ledger row explicitly marked `STABLE_100` counts. While a canary is active, `BASE_PRODUCTION_SHA` remains the previous `STABLE_100` release — the active canary is historical/in-flight evidence, never a baseline.

If no ledger row is marked `STABLE_100`, resolution fails closed:

```
BASE_PRODUCTION_SHA_UNRESOLVED
```

Implementation: `lib/ci/release-ledger.ts#resolveBaseProductionSha`.

---

## 3. The ledger — `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md`

`docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` is the one authoritative, append-only production release ledger for this repository — it already existed before this policy (seeded by the first real canary release) and is formalized, not replaced, here. Its "Ledger" table now carries the columns this policy and `lib/ci/release-ledger.ts#parseLedgerTable` require:

| Column | Meaning |
| --- | --- |
| `RELEASE_SHA` | the exact application commit SHA this row's Worker Version was built from |
| `WORKER_VERSION_ID` | the Cloudflare Worker Version this row is about |
| `RELEASE_STATE` | `STABLE_100` \| `CANARY_ACTIVE` \| `ROLLED_BACK` \| `SUPERSEDED` \| `LEGACY_IN_FLIGHT_RELEASE` |
| `FINAL_TRAFFIC_PERCENT` | traffic percentage this row's version ended at, once known |
| `STAGING_RUN_ID` | the `Deploy Staging` run this release's staging provenance came from |
| `PRODUCTION_RUN_ID` | the `deploy-production.yml` run that produced this row |
| `PROMOTION_RUN_ID` | the future `promote-production.yml` run that moved this version to 100%, if any (§11) |
| `ROLLBACK_VERSION_ID` | the rollback target captured before this row's traffic shift (`PREVIOUS_VERSION_ID` in workflow terms) |
| `FINAL_RISK` | this release's `FINAL_RISK` per §6/§9 |
| `RESULT` | `PASS` / `FAIL` / narrative outcome |
| `TIMESTAMP` | UTC timestamp of the row |

**Append-only.** Never edit or remove an existing row; never rewrite history. A row is appended as a separate, human-reviewed documentation commit after a run completes, exactly as the manifest's own existing "How to append a row" section already describes — this policy does not change who writes rows or when, only which columns a row must carry.

---

## 4. Bootstrap — resolving the first BASE_PRODUCTION_SHA

`docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md` records the bootstrap outcome in full. Summary of the rule this policy applies, and will keep applying to any future re-bootstrap of a broken ledger:

Resolve the release SHA of the last release that was serving 100% of production **before** the current canary began, from durable evidence only (existing release reports, the deployment manifest, GitHub Actions evidence, read-only Cloudflare version metadata). Never guess from branch `HEAD`, `main`, the latest commit, or the current canary's SHA.

- **If the stable Worker Version can be identified but its exact release SHA cannot be proven** — fail closed: `BOOTSTRAP_STABLE_SHA_UNRESOLVED`. Do not seed the ledger with a guessed SHA.
- **If it can be proven** — seed one bootstrap historical row marking that release `STABLE_100`, and record the current in-flight canary as historical/in-flight evidence without treating it as the new `BASE_PRODUCTION_SHA`.

The future promotion workflow (§11) must append/update release evidence so that after a successful 100% promotion, the promoted release becomes the new `STABLE_100` authority — self-healing the ledger going forward even if the very first bootstrap could only fail closed.

---

## 5. Risk classes

Exactly three: `LOW < MEDIUM < HIGH`. A classification run either resolves to exactly one of these, or returns `AMBIGUOUS` / `CLASSIFICATION_REQUIRED` and stops.

### LOW

Allowed only if **every** changed file belongs to an explicitly approved low-risk category and no HIGH trigger exists anywhere in the diff.

- ordinary copy/text content (`lib/content/**`)
- static images/assets inside an approved asset directory (`public/**`, `logo/**`, `design-reference/**`, `lib/fonts/**`)
- CSS-only styling (any `*.css` file)
- non-critical editorial/historical documentation (`docs/**` outside `docs/release/**` and `docs/integrations/odoo/**`, `v0-package/**`, root editorial docs)
- repository/editor tooling with no effect on the built artifact (`.vscode/**`, `.claude/**`, `.gitignore`, `.env.example`, `.DS_Store`, `tsconfig.tsbuildinfo`)

**Path:** CI PASS → staging validation → production approval → direct 100% → production smoke. **Canary: NOT REQUIRED.**

### MEDIUM

The change is inside recognized application/runtime code, but no explicit HIGH trigger applies.

- ordinary component behavior (`components/**` outside `components/contact/**`)
- product/catalog rendering logic (`lib/catalog/**` display/query modules, `components/products/**`)
- non-critical presentation-side API consumption
- reversible UI behavior
- recognized application code without persistence/security/release-contract implications

**Path:** CI PASS → exact-SHA staging → staging verification → production approval → direct 100% → production smoke. **Canary: NOT REQUIRED.**

**This is an intentional policy decision, not an accidental omission.** MEDIUM does not require a canary because every HIGH-sensitive surface (RFQ, Odoo contracts, D1 persistence, security, routing/canonical infra, release/runtime configuration, governance documents) is explicitly removed from MEDIUM by the escalation rules in §7 and §8. What remains in MEDIUM is, by construction, reversible presentation/application behavior whose blast radius does not extend to commercial data integrity, security posture, or the release pipeline itself — a full staging + owner-approval gate is proportionate; a canary is not.

### HIGH

Any HIGH trigger (§7, §8) forces HIGH.

**Path:** CI PASS → exact-SHA staging → staging provenance → production approval → **10% canary** → official verification-only gate → observation record (§12) → explicit owner promotion approval → 100% promotion (§11) → production smoke.

### AMBIGUOUS

See §9. Produces `CLASSIFICATION_REQUIRED` and stops — never silently downgraded or upgraded to a numbered class.

---

## 6. Declared vs. computed risk, and the mixed-diff rule

The operator/workflow may declare `DECLARED_RISK`. The machine computes `COMPUTED_MINIMUM_RISK` from the diff. The rule is absolute:

```
FINAL_RISK = max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)
```

The operator can escalate risk. **The operator can never downgrade machine-computed risk.** Implementation: `lib/ci/release-risk-classifier.ts#computeFinalRisk`.

Classification applies to the **entire diff**. The highest risk among all changed files wins — there is no majority vote, no file-count weighting. Ten LOW files plus one HIGH file is a HIGH release. Implementation: `lib/ci/release-risk-classifier.ts#classifyDiff`.

---

## 7. HIGH triggers — explicit path groups

Enforceable by path, not by subjective judgment. Every group below is derived from this repository's real, audited directory structure (`docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md` records the audit) — none is invented, and none names a directory that does not exist.

| Group | Paths |
| --- | --- |
| `HIGH_RFQ_PATHS` | `app/api/rfqs/**`, `app/[locale]/request/**`, `app/[locale]/contact/**`, `components/contact/**`, `lib/rfq/**`, `lib/queue/**`, `lib/db/**` |
| `HIGH_ODOO_CLIENT_PATHS` | `lib/odoo/**`, `docs/integrations/odoo/**`, plus the catalog/processing/pricing sync + Odoo-API-client files enumerated in `lib/ci/release-risk-classifier.ts#HIGH_ODOO_CLIENT_FILES` (e.g. `lib/catalog/odoo-api-client.ts`, `lib/catalog/sync*.ts`, `lib/processing/odoo-api-client.ts`, `lib/pricing/sync-orchestrator.ts`) |
| `HIGH_PERSISTENCE_PATHS` | `migrations/**`, `migrations_public/**`, plus the D1 write-path repository files enumerated in `lib/ci/release-risk-classifier.ts#HIGH_PERSISTENCE_FILES` (e.g. `lib/catalog/repository.ts`, `lib/pricing/repository.ts`, `scripts/catalog-editorial.ts`) |
| `HIGH_SECURITY_PATHS` | `lib/security/**`, plus any file anywhere under `lib/**` whose filename contains `security` (case-insensitive) |
| `HIGH_ROUTING_CONFIG_PATHS` | `proxy.ts`, `config/locales.ts` |
| `HIGH_RUNTIME_CONFIG_PATHS` | `wrangler.jsonc`, `vite.config.ts`, `next.config.ts`, `worker-configuration.d.ts`, `package.json`, `package-lock.json`, `workers/**` |
| `HIGH_RELEASE_PATHS` | `.github/workflows/**`, `lib/ci/**`, `docs/release/RELEASE_POLICY.md`, `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` |
| `HIGH_GOVERNANCE_PATHS` | `CLAUDE.md`, `PROJECT_OVERRIDES.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md`, `01-sources/**` |

Also HIGH, with no dedicated existing directory to point at today: payment-related implementation, if introduced. There is no `lib/payments/` or equivalent in this repository — when one is created, it will not exist in any recognized tree yet, so a diff introducing it classifies `AMBIGUOUS` on its first appearance (§9), which is exactly the intended fail-safe: a genuinely new HIGH surface must be classified explicitly, by policy amendment (itself a `HIGH_RELEASE_PATHS` change), not silently absorbed into MEDIUM.

Rollback/version-selection logic and promotion/deployment logic are covered by `HIGH_RELEASE_PATHS` (`.github/workflows/**`, `lib/ci/**`) — there is no separate directory for them.

**Removed subjective language on purpose.** No trigger here depends on "material," "critical in effect," or "non-critical by interpretation" — every trigger is a path, a directory, or a filename pattern a classifier can evaluate without reading the diff's content.

**This is a v1 taxonomy.** Any path whose classification feels genuinely unclear should be escalated via `DECLARED_RISK` (§6) rather than assumed MEDIUM, and the taxonomy itself amended in a future `HIGH_RELEASE_PATHS`-gated change — not worked around case by case.

---

## 8. Critical UI rule

RFQ-adjacent behavior must not accidentally fall into MEDIUM. Any recognized UI/component path that can submit an RFQ, alter RFQ payload shape, modify phone/contact/request validation used for persistence, affect request routing to backend/Odoo, or change persistence-relevant form behavior classifies HIGH — this is exactly `HIGH_RFQ_PATHS` above (`app/api/rfqs/**`, `app/[locale]/request/**`, `app/[locale]/contact/**`, `components/contact/**`, `lib/rfq/**`, `lib/queue/**`).

Product/catalog **display-only** rendering may remain MEDIUM if it does not modify contracts, persistence, or purchase/request semantics — e.g. `components/products/**`, `lib/catalog/catalog-filters.ts`, `lib/catalog/homepage-showcase-layout.ts`.

---

## 9. Ambiguity

Resolves the prior policy contradiction: ambiguity is not "anything the classifier is unsure about" — it is a specific, enumerated set of conditions, checked deterministically:

1. a new/unrecognized top-level directory
2. a changed path outside every recognized source/config/docs/assets tree
3. an unknown binary file outside approved static-asset locations
4. a rename involving a HIGH-governed file/path where destination classification is unclear
5. deletion of a governance/security/deployment file whose effect cannot be safely inferred
6. a generated or opaque file type not covered by policy
7. the classifier cannot identify the path category deterministically

**AMBIGUOUS produces `CLASSIFICATION_REQUIRED` and stops.** It is never converted to MEDIUM automatically, and an AMBIGUOUS file anywhere in a diff makes the whole diff `CLASSIFICATION_REQUIRED` regardless of how low-risk every other file looks (§6's mixed-diff rule extends to this: AMBIGUOUS is not a risk level to be maxed against LOW/MEDIUM/HIGH, it is a distinct terminal state). Implementation: `lib/ci/release-risk-classifier.ts#classifyPath`/`classifyDiff`, gated by `isRecognizedTopLevel` (condition 1/2), the approved-asset-directory check against `STATIC_ASSET_EXTENSIONS` (condition 3), the rename cross-boundary check (condition 4), and the `KNOWN_EXTENSIONS` allowlist (condition 6).

---

## 10. Renames and deletions

The classifier inspects git change status, never only the final pathname (`git diff --name-status -M -C`):

- deleting a HIGH file/path → HIGH
- renaming FROM a HIGH path → HIGH (regardless of destination)
- renaming TO a HIGH path → HIGH (regardless of source)
- a high-governance file rename → HIGH
- an unknown rename crossing a recognized/unrecognized boundary → AMBIGUOUS

Implementation: `lib/ci/release-risk-classifier.ts#classifyChangedFile`.

---

## 11. Promotion workflow contract (defined, not built, by this policy)

**`promote-production.yml` is not created by this task.** This section fixes its mandatory contract for whenever it is built, matching the proposal already vetted in `docs/release/PRODUCTION_R3_DETERMINISTIC_VERSION_SELECTION_REPORT.md` §10, refined with this policy's ledger obligations.

It must:

- reuse an existing canary Worker Version — never upload a new one (no Phase 1 build, no `wrangler versions upload`)
- accept/resolve the exact canary Worker Version ID as an operator input, together with `expected_current_stable_version_id` and `expected_current_canary_version_id` (validated against live state, matching `existing_version_id`) — reusing this task's deterministic ROLE DISCOVERY logic (R3), never array-position selection
- verify the current expected traffic split before doing anything
- verify the canary release's own evidence (the `deploy-production.yml` run that produced it, and its ledger row)
- verify an official `verify-production.yml`-style verification-only run exists and passed for that exact version
- verify an observation attestation exists (§12) — `OBSERVATION_OWNER`/`OBSERVATION_ATTESTATION` recorded
- require explicit, typed production approval (same `environment: production` reviewer gate the other two workflows already use)
- upload **no** new Worker version
- deterministically shift the existing canary to 100% (`wrangler versions deploy "$existing_version_id@100"` [+ complementary spec only if not already 100]) — never a bare `wrangler deploy`, never `vinext-cloudflare deploy`
- preserve the validated rollback target (the pre-promotion stable version stays a recorded `ROLLBACK_VERSION_ID`)
- run the same production smoke suite `deploy-production.yml` already uses
- append final promotion evidence to the ledger (§3) and mark the promoted release `STABLE_100` — this is what makes it the next `BASE_PRODUCTION_SHA` (§2, §4)
- never be granted `contents: write` (a ledger row is still appended as a separate, human-reviewed commit, exactly as `deploy-production.yml`'s own manifest-append convention already works)

No array-position role discovery, anywhere in this workflow.

---

## 12. Observation

For a HIGH release's canary period, require before promotion:

- official production smoke PASS
- no observed 5xx regression in available telemetry
- no observed Worker exception anomaly
- queue/DLQ healthy where observable
- RFQ path healthy where observable
- version/traffic topology stable
- explicit owner promotion attestation

Record: `OBSERVATION_STARTED_AT`, `OBSERVATION_ENDED_AT`, `OBSERVATION_OWNER`, `OBSERVATION_ATTESTATION`.

**No minimum numeric duration is asserted in Policy v1.**

```
MINIMUM_OBSERVATION_DURATION = TBE
```

A numeric minimum may only be introduced after evidence is collected from real HIGH releases and a decision rule is explicitly approved — inventing a number now would be exactly the kind of unsupported statistic `PROJECT_OVERRIDES.md` §10 forbids. **Even with no minimum duration, promotion cannot occur without explicit owner attestation** — the absence of a numeric floor is not the absence of a gate.

---

## 13. Emergency rollback

A distinct `OPERATION_TYPE`, never a normal HIGH release:

```
OPERATION_TYPE: RELEASE | EMERGENCY_ROLLBACK
```

Rollback requirements:

- the target must be a previously recorded, deterministic, validated rollback target — i.e. a Worker Version ID that already appears in the ledger, either as a row's own `WORKER_VERSION_ID` or as a row's `ROLLBACK_VERSION_ID`
- an arbitrary SHA is forbidden as a rollback target
- an arbitrary Worker Version ID (well-formed but never recorded) is forbidden
- human production approval is required
- a direct return to 100% is permitted
- no canary is required
- immediate production smoke is required
- incident/rollback evidence must be recorded (a new `ROLLED_BACK` ledger row)

Rollback without a recorded valid target fails closed:

```
ROLLBACK_TARGET_UNRESOLVED
```

Implementation: `lib/ci/emergency-rollback.ts#validateRollbackTarget`. **Rollback was not executed by this task** (`RELEASE_POLICY_IMPLEMENTATION_REPORT.md` confirms `PRODUCTION_TRAFFIC_CHANGED: NO`).

---

## 14. No live identifier hardcoding

Machine enforcement never permanently hardcodes the current Worker Version IDs, stable/canary IDs, release SHA, or rollback ID. These are always resolved from R3 deterministic role discovery, the release ledger, or explicit validated workflow inputs tied to ledger evidence. Tests use synthetic fixture IDs exclusively (`lib/ci/release-risk-classifier.test.ts`, `lib/ci/release-ledger.test.ts`, `lib/ci/emergency-rollback.test.ts`, `lib/ci/policy-bootstrap.test.ts`). Historical reports may retain real historical identifiers — they are evidence, not runtime configuration.

---

## 15. Audit trail

Every release classification must persist: `BASE_PRODUCTION_SHA`, `CANDIDATE_SHA`, `DECLARED_RISK`, `COMPUTED_MINIMUM_RISK`, `FINAL_RISK`, `TRIGGERS`, `CHANGED_FILES`, `CLASSIFICATION_EVIDENCE`, `OPERATION_TYPE`, `STAGING_RUN_ID`, `PRODUCTION_RUN_ID`, `PROMOTION_RUN_ID` if applicable, `ROLLBACK_VERSION_ID`, `RESULT` — stored in at minimum (1) a GitHub Actions Job Summary, (2) a durable workflow artifact, and (3) the append-only ledger (§3). **Chat output is not authoritative evidence.**

---

## 16. `POLICY_BOOTSTRAP`

This task itself is `POLICY_BOOTSTRAP` — governance-sensitive, but bootstrap must not become a loophole. A bootstrap diff may contain only: policy documents, `CLAUDE.md` governance instructions, classifier/enforcement helpers and their tests, CI/release governance workflow changes, and ledger/bootstrap evidence. It must **not** contain application runtime feature code, RFQ runtime code, catalog runtime feature changes, or unrelated UI/application behavior changes. If runtime application code appears in the bootstrap diff:

```
BOOTSTRAP_RUNTIME_CODE_FORBIDDEN
```

Implementation: `lib/ci/policy-bootstrap.ts#checkPolicyBootstrapDiff`. Sequence: implementation → tests → registration → verify enforcement active → record `POLICY_BOOTSTRAP_COMPLETE` (`docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md`). After that, this same policy governs future changes to itself — including future changes to `RELEASE_POLICY.md`, which are themselves `HIGH_RELEASE_PATHS`.

---

## 17. The legacy in-flight canary

The 10/90 split live since 2026-09-20 (canary `4a32c5f9-…` @10%, stable `b07d8697-…` @90%, deployed SHA `f2202ab5…`, officially verified PASS — `docs/release/PRODUCTION_10_PERCENT_OFFICIAL_VERIFICATION_REPORT.md`) predates this policy. It is classified:

```
LEGACY_IN_FLIGHT_RELEASE
```

**Closed 2026-09-22:** promoted to 100% by `promote-production.yml` run `35719752606`; the ledger's `STABLE_100` row for it is now `BASE_PRODUCTION_SHA` (`docs/release/FIRST_PRODUCTION_100_PERCENT_PROMOTION_REPORT.md`). The rest of this section is the original record.

It is **not** redeployed or reclassified using the new classifier. It finishes using its existing evidence: staging provenance, the official 10% verification, R3's deterministic release-role evidence, and the future promotion-only workflow (§11). After a successful promotion to 100%, the promotion workflow must write the promoted release into the ledger as the new `STABLE_100` release — that entry becomes `BASE_PRODUCTION_SHA` for the next release.

---

## 18. Odoo scope exclusion (restated)

Restating §1 for emphasis, since this is the most commonly mis-scoped boundary: this policy governs the **website's** side of the Odoo relationship — the Cloudflare Worker, `lib/odoo/**`, catalog/processing sync into D1, and `docs/integrations/odoo/**` as the contract-of-record. It does not, and cannot, govern what happens inside Odoo itself. A change to `odoo-modules/**` (the Odoo-side Python module living in this repository for convenience) never enters the website's Cloudflare Worker build and is therefore LOW under this classifier specifically because it has zero blast radius on *this* deployment pipeline — not because it is low-risk in general. Odoo needs, and does not yet have, its own release policy.
