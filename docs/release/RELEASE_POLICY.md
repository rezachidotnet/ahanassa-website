# Ahan Asa Website — Release Policy

**Lifecycle state:** `ACTIVE` — effective when the **corrected** enforcement change recorded in `docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md` (the original enforcement wiring **plus** the DAR-059 / DAR-060 / DAR-061 resolutions of 2026-09-23) is merged into `feat/header-hero-integrated`. **Until that merge the live state remains `BOOTSTRAP_MERGED`** — this document's own text saying `ACTIVE` is a statement of the target state, never evidence of it (see the paragraph below §0's table). Every §0 `ACTIVE` criterion is then met: the policy and engine are merged on the application branch and discoverable from `main` (PR #6/#7, `docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`); `BASE_PRODUCTION_SHA` resolves from the ledger's first `STABLE_100` row (appended after `promote-production.yml` run `35719752606`, `docs/release/FIRST_PRODUCTION_100_PERCENT_PROMOTION_REPORT.md`); `deploy-production.yml` invokes the classifier against the real diff and gates on `FINAL_RISK` before any production mutation (§0.2); and the only interim exception, the `LEGACY_IN_FLIGHT_RELEASE` canary (§17), has been promoted and closed. History of the earlier states: `docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md`, `docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`.

**Established by:** `POLICY_BOOTSTRAP` (2026-09-22), after R3 (`docs/release/PRODUCTION_R3_DETERMINISTIC_VERSION_SELECTION_REPORT.md`) closed and PR #5 merged to `main`.

---

## 0. Lifecycle states and the enforcement-vs-engine distinction

**A minimal state model, replacing the earlier undifferentiated "Status: Active" claim** (an independent review correctly flagged that claim as premature — `docs/release/RELEASE_POLICY_IMPLEMENTATION_REPORT.md` records the correction):

| State | Meaning |
| --- | --- |
| `BOOTSTRAP_PENDING` | Policy/engine authored locally; not yet registered via any PR. |
| `BOOTSTRAP_REGISTERED` | Policy/engine committed, PR(s) open and reviewable, but not yet merged into the application branch. |
| `BOOTSTRAP_MERGED` | Merged into the application branch (`feat/header-hero-integrated`) **and** discoverable from the default branch (`main`'s `CLAUDE.md`/`RELEASE_POLICY.md` sync) — but release-time enforcement is **not** wired into any workflow, and/or `BASE_PRODUCTION_SHA` is not yet resolvable. State from PR #6/#7 (`docs/release/RELEASE_POLICY_BOOTSTRAP_MERGE_REPORT.md`) until the §0.2 enforcement change merges. |
| `ACTIVE` | Everything `BOOTSTRAP_MERGED` requires, **and** release-time enforcement is wired in (§0.1), **and** `BASE_PRODUCTION_SHA` is resolvable or an explicit interim operating mode covering its absence is documented and owner-accepted, **and** the enforcement it wires in is the corrected one (§0.2, §5, §7.1, §11 — DAR-059/060/061 resolved). **← the state reached** once the corrected §0.2 enforcement change is merged into the application branch (`docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md`). |

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
  | LOW | `100` only | **mandatory, no exception** (§5.1) |
  | MEDIUM | `100` only | **mandatory, no exception** (§5.1) |
  | HIGH | `10` only — the canary entry leg; 100% is reached only via `verify-production.yml`, the §12 observation record and `promote-production.yml` (§11) | **mandatory, no exception** (§5.1) |

  No path uses `50`, so no `FINAL_RISK` permits it. An operator who wants a canary for a LOW/MEDIUM diff declares `HIGH` (§6 escalation).
- **Validated historical ledger append (§7.1).** Before classification, the gate asks `lib/ci/ledger-append-exemption.ts` whether the one ledger change in the diff is a proven, append-only, historical row addition. If — and only if — it is, that one file is dropped from the set `classifyDiff` sees; the rest of the diff is classified exactly as it would be on its own. Any other ledger change stays HIGH, and an untrustworthy one (`LEDGER_INTEGRITY_VIOLATION`) stops the run.
- **No bypass.** The step is unconditional; no input skips or overrides it. `deploy-production.yml` exposes **no** `skip_staging_provenance` input, and the gate refuses the value `true` at every `FINAL_RISK` (`STAGING_PROVENANCE_REQUIRED`) should one ever be reintroduced.
- **Audit (§15).** Every run writes the decision (`OPERATION_TYPE`, `BASE_PRODUCTION_SHA`, `CANDIDATE_SHA`, `DECLARED_RISK`, `COMPUTED_MINIMUM_RISK`, `FINAL_RISK`, `TRIGGERED_RISK_RULES`, `CHANGED_FILES`, `CLASSIFICATION_RESULT`, `LEDGER_CHANGE_PRESENT`, `LEDGER_APPEND_EXEMPTION_APPLIED`, `LEDGER_APPEND_VALIDATION_RESULT`, `STAGING_PROVENANCE_REQUIRED`, `SKIP_STAGING_PROVENANCE`, `STAGING_PROVENANCE_RUN_ID`, `EXPECTED_RELEASE_PATH`, `RESULT`) to the job summary and the `release-policy-audit-<run_id>` artifact (on every outcome, including blocked runs), and embeds it in `production-release-evidence-<run_id>`. The ledger row is still appended by a separate, human-reviewed commit (§3); the workflow keeps `contents: read`.
- **Emergency rollback (§13)** is a separate `OPERATION_TYPE` and is not routed through this gate; `deploy-production.yml` gains no rollback path.

---

## 1. Scope

This policy governs:

- the Ahan Asa Website's Cloudflare Worker (`ahanassa-production` / `ahanassa-bootstrap-staging`)
- the `vinext` website runtime (Next.js App Router via `vinext` + `@vinext/cloudflare`, driven by Vite)
- the website's D1 databases (`DB_OPS`, `DB_PUBLIC`) — schema, migrations, access layers
- the website's CI/CD (`.github/workflows/*.yml`, `lib/ci/**`)
- the website-side boundary of Odoo integration: `lib/odoo/**`, the catalog/processing sync paths listed in §7, and `docs/integrations/odoo/**` (the contract documentation)
- since the W8.1 cutover (2026-10-05), the v11 static-site Worker `ahanassa-v11-static-production`, which serves `www.ahanassa.com` — its code releases take the v11 release path of §20, not the §5 canary path

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
| `PROMOTION_RUN_ID` | the future `promote-production.yml` run that moved this version to 100%, if any (§11); for a v11 release, the `content-publish.yml` run whose production job published it (§20.3) |
| `ROLLBACK_VERSION_ID` | the rollback target captured before this row's traffic shift (`PREVIOUS_VERSION_ID` in workflow terms) |
| `FINAL_RISK` | this release's `FINAL_RISK` per §6/§9 |
| `RESULT` | `PASS` / `FAIL` / narrative outcome |
| `TIMESTAMP` | UTC timestamp of the row |

**Append-only.** Never edit or remove an existing row; never rewrite history. A row is appended as a separate, human-reviewed documentation commit after a run completes, exactly as the manifest's own existing "How to append a row" section already describes — this policy does not change who writes rows or when, only which columns a row must carry.

**Append-only is now machine-checked, and the row-append commit must contain nothing else** (§7.1). The `VALIDATED_HISTORICAL_LEDGER_APPEND` exemption compares the ledger at `BASE_PRODUCTION_SHA` with the ledger at `CANDIDATE_SHA` byte-for-byte outside the authoritative table's data rows: header, separator, every pre-existing row, all surrounding prose, and the frozen legacy table must be identical. Narrative about a release belongs in that release's own report under `docs/release/`, not in the same edit as the row. An append that also edits prose is not a defect — it simply does not earn the exemption, and the ledger file then classifies HIGH as it always did.

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

**Path:** CI PASS → **staging provenance (mandatory, §5.1)** → production approval → direct 100% → production smoke. **Canary: NOT REQUIRED.**

### MEDIUM

The change is inside recognized application/runtime code, but no explicit HIGH trigger applies.

- ordinary component behavior (`components/**` outside `components/contact/**`)
- product/catalog rendering logic (`lib/catalog/**` display/query modules, `components/products/**`)
- non-critical presentation-side API consumption
- reversible UI behavior
- recognized application code without persistence/security/release-contract implications

**Path:** CI PASS → exact-SHA staging → **staging provenance (mandatory, §5.1)** → production approval → direct 100% → production smoke. **Canary: NOT REQUIRED.**

**This is an intentional policy decision, not an accidental omission.** MEDIUM does not require a canary because every HIGH-sensitive surface (RFQ, Odoo contracts, D1 persistence, security, routing/canonical infra, release/runtime configuration, governance documents) is explicitly removed from MEDIUM by the escalation rules in §7 and §8. What remains in MEDIUM is, by construction, reversible presentation/application behavior whose blast radius does not extend to commercial data integrity, security posture, or the release pipeline itself — a full staging + owner-approval gate is proportionate; a canary is not.

### HIGH

Any HIGH trigger (§7, §8) forces HIGH.

**Path:** CI PASS → exact-SHA staging → **staging provenance (mandatory, §5.1)** → production approval → **10% canary** → official verification-only gate → observation record (§12) → explicit owner promotion approval → 100% promotion (§11) → production smoke.

### AMBIGUOUS

See §9. Produces `CLASSIFICATION_REQUIRED` and stops — never silently downgraded or upgraded to a numbered class.

### 5.1 Staging provenance is mandatory for every release — no break-glass

**Owner decision, 2026-09-23 (`DOCUMENT_AUDIT_REPORT.md` DAR-059).** For `OPERATION_TYPE: RELEASE`, staging provenance is required at **every** `FINAL_RISK`:

```
LOW_REQUIRES_STAGING:           YES
MEDIUM_REQUIRES_STAGING:        YES
HIGH_REQUIRES_STAGING:          YES
NORMAL_RELEASE_STAGING_BYPASS:  NO
```

The former `skip_staging_provenance` break-glass input is **removed** from `deploy-production.yml`, and A2's log scan now has exactly two outcomes: a successful `Deploy Staging` run whose own job log contains `Deploying exact commit: <DEPLOYED_SHA>`, or the run stops. The release policy gate additionally refuses the value `true` at every `FINAL_RISK` (`STAGING_PROVENANCE_REQUIRED`), so reintroducing the input cannot silently restore the bypass.

**This is not repurposed as an emergency mechanism.** A hotfix that genuinely never went to staging goes to staging first. `EMERGENCY_ROLLBACK` (§13) remains a separate `OPERATION_TYPE` with its own contract — a recorded, validated Worker Version ID already in the ledger, human approval, immediate smoke, a `ROLLED_BACK` ledger row. It is not a release-risk or staging bypass, it is not reachable from `deploy-production.yml`, and nothing in this section changes it.

Implementation: `lib/ci/release-gate.ts` (`STAGING_PROVENANCE_REQUIRED`), `.github/workflows/deploy-production.yml` A2. Tests: `lib/ci/release-gate.test.ts` ("21b/DAR-059", "23b/DAR-059", "34/DAR-059").

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

### 7.1 `VALIDATED_HISTORICAL_LEDGER_APPEND` — the one, narrow ledger exemption

**Owner decision, 2026-09-23 (`DOCUMENT_AUDIT_REPORT.md` DAR-060).**

**The problem this fixes.** `docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` is a `HIGH_RELEASE_PATHS` file (§7) and stays one. But `BASE_PRODUCTION_SHA` is the `RELEASE_SHA` of the latest `STABLE_100` row, and that row is necessarily appended in a commit *after* that SHA (§3). So `git diff BASE_PRODUCTION_SHA..CANDIDATE_SHA` structurally always contains the ledger append, and every release after a recorded release computed HIGH regardless of what else changed — leaving the LOW and MEDIUM direct-100 paths of §5 unreachable in practice. That was never the intent of §5.

**The exemption is not a reclassification of the ledger.** The ledger remains security/release-critical authority and remains HIGH. What the exemption does — and the only thing it does — is remove a **proven, append-only, historical row addition** from the diff that `classifyDiff` sees, so the remaining candidate change is classified on its own merits.

**It is all-or-nothing, content-exact, and fail-closed.** It applies only when every one of these holds:

1. the ledger, with its one authoritative `RELEASE_POLICY.md`-schema table, existed at `BASE_PRODUCTION_SHA`;
2. the table's header and separator rows are byte-identical between base and candidate (no schema change);
3. every pre-existing data row is byte-identical;
4. no historical row was edited;
5. no row was deleted;
6. no row was reordered;
7. the ledger appears in the diff as a plain in-place modification (never an add, delete, rename, copy or type change) and **only** new row(s) were added — all content outside the table's data rows, including surrounding prose and the frozen legacy table, is byte-identical;
8. the candidate's whole table still passes the strict release-time validator (`resolveBaseProductionShaFromManifest`), and each appended row parses with the exact column shape;
9. each appended row is **completed historical release evidence**: a Worker Version UUID, a numeric `PRODUCTION_RUN_ID`, a recorded `FINAL_RISK` (`LOW`/`MEDIUM`/`HIGH`/`LEGACY_IN_FLIGHT_RELEASE`), a non-empty `RESULT`, a `YYYY-MM-DDTHH:MM:SSZ` `TIMESTAMP`, and — for a `STABLE_100` row — `FINAL_TRAFFIC_PERCENT` 100 plus a numeric `PROMOTION_RUN_ID`;
10. no appended row names `CANDIDATE_SHA` as an already-released `RELEASE_SHA` (a candidate never carries its own release evidence);
11. `BASE_PRODUCTION_SHA` resolves identically from the candidate's own ledger — the baseline must never depend on which copy of the ledger is read;
12. no ledger authority field was rewritten (a consequence of 2, 3 and 7 together);
13. anything malformed or ambiguous fails closed;
14. **any ledger modification not satisfying all of the above remains HIGH.**

**Two distinct outcomes when it does not apply:**

| Situation | Outcome |
| --- | --- |
| Row edited, deleted or reordered; schema/header changed; prose or the legacy table changed; no row appended; rename/delete/add of the ledger; no ledger (or no table) at `BASE_PRODUCTION_SHA` | **NOT EXEMPT** — the ledger keeps its normal `HIGH_RELEASE_PATHS` classification and the release proceeds on the HIGH path |
| The candidate's table is malformed or duplicated; an appended row is malformed; an appended row is not completed historical evidence; an appended row names `CANDIDATE_SHA`; the append would move `BASE_PRODUCTION_SHA` resolution | **FAIL CLOSED** — `LEDGER_INTEGRITY_VIOLATION`, the run stops, and no risk level is assigned at all |

**Worked outcomes** (each verified against real repository history with synthetic candidates — `docs/release/GLOBAL_RELEASE_POLICY_ENFORCEMENT_IMPLEMENTATION_REPORT.md`):

| Candidate diff | `FINAL_RISK` |
| --- | --- |
| valid historical ledger append only | LOW |
| valid append + CSS-only change | LOW |
| valid append + ordinary component change | MEDIUM |
| valid append + workflow / security / RFQ / persistence change | HIGH |
| edited historical row + CSS change | HIGH |
| deleted or reordered row | HIGH |
| schema/header change | HIGH |
| malformed appended row, self-certifying row, baseline-moving append | blocked (`LEDGER_INTEGRITY_VIOLATION`) |

**Audit.** Every decision records `LEDGER_CHANGE_PRESENT`, `LEDGER_APPEND_EXEMPTION_APPLIED` and `LEDGER_APPEND_VALIDATION_RESULT` (plus the validation reasons and a summary of each appended row) in the job summary, the `release-policy-audit-<run_id>` artifact and the embedded release evidence. An exempt ledger still appears in `CHANGED_FILES`, with risk `EXEMPT`.

**Implementation.** `lib/ci/ledger-append-exemption.ts`, wired in by `lib/ci/release-gate.ts`. It is tested TypeScript (`lib/ci/ledger-append-exemption.test.ts`, plus the end-to-end `DAR-060 A`–`I` cases in `lib/ci/release-gate.test.ts`) and is **never** implemented as path filtering in YAML or bash — a guard test asserts no workflow carries the exemption's decision vocabulary.

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
- read the promoted release's `FINAL_RISK` from the same bound `production-release-evidence-*` document (never an operator input, never a literal), require it to be a policy-computed `LOW`/`MEDIUM`/`HIGH`, and propagate that exact value into the `STABLE_100` evidence and ledger row — §11.1
- append final promotion evidence to the ledger (§3) and mark the promoted release `STABLE_100` — this is what makes it the next `BASE_PRODUCTION_SHA` (§2, §4)
- never be granted `contents: write` (a ledger row is still appended as a separate, human-reviewed commit, exactly as `deploy-production.yml`'s own manifest-append convention already works)

No array-position role discovery, anywhere in this workflow.

### 11.1 Promotion must propagate the release's real `FINAL_RISK`

**Owner decision, 2026-09-23 (`DOCUMENT_AUDIT_REPORT.md` DAR-061).** `promote-production.yml` previously wrote a fixed `final_risk: LEGACY_IN_FLIGHT_RELEASE` into its `STABLE_100` evidence. That was correct for exactly one completed promotion (the pre-policy canary of §17) and wrong for every release after it.

For every future promotion:

- `FINAL_RISK` is read from the `production-release-evidence-*` document the workflow has **already** bound to `release_sha`, `canary_version_id`, `stable_version_id` and the originating `deploy-production.yml` run (§11 items 2–4 and 7) — the same document, in the same step, after those bindings pass.
- It must be exactly `LOW`, `MEDIUM` or `HIGH`. Missing, empty, `null`, non-string, `-`, `LEGACY_IN_FLIGHT_RELEASE`, or any other value **fails closed before any traffic moves**. Nothing is defaulted or substituted.
- No workflow input supplies, overrides or defaults it; no input whose name contains `risk` may exist.
- The validated value is propagated verbatim into the promotion evidence JSON and the `STABLE_100` ledger row printed in the job summary.
- **Expected value in practice: `HIGH`** — under §5 only a HIGH release reaches production through a canary, and only a canary is promotable. A non-HIGH value is propagated exactly as recorded and loudly annotated for reconciliation when the row is appended.
- Every pre-existing promotion binding, topology invariant, zero-upload/zero-build guarantee and the blocking post-promotion smoke gate are unchanged.

**Historical evidence is untouched.** The `STABLE_100` row already in the ledger for run `35719752606` keeps `FINAL_RISK = LEGACY_IN_FLIGHT_RELEASE` as the true record of what that workflow emitted at the time. `lib/ci/release-ledger.ts` still accepts that value when *reading* historical rows; it is simply no longer a value this workflow can *write*.

Implementation: the `FINAL_RISK BINDING` block of `.github/workflows/promote-production.yml`'s release-evidence step. Tests: `lib/ci/promote-production-workflow.test.ts` ("19/25", "20", "21", "22", "23", "23b", "24", "26/27/28", and the mutation guards).

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

**v11 static site (owner decision D-DAR-063, 2026-10-06):** the owner set the minimum explicitly for the v11 release path. The legacy canary path above keeps `TBE`.

```
MINIMUM_OBSERVATION_DURATION (v11) = 24 h, with ops-health production showing no ALERT (§20.2)
```

---

## 13. Emergency rollback

A distinct `OPERATION_TYPE`, never a normal HIGH release:

```
OPERATION_TYPE: RELEASE | EMERGENCY_ROLLBACK | CONTENT_REBUILD (§19)
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

Every release classification must persist: `BASE_PRODUCTION_SHA`, `CANDIDATE_SHA`, `DECLARED_RISK`, `COMPUTED_MINIMUM_RISK`, `FINAL_RISK`, `TRIGGERS`, `CHANGED_FILES`, `CLASSIFICATION_EVIDENCE`, `OPERATION_TYPE`, `LEDGER_CHANGE_PRESENT`, `LEDGER_APPEND_EXEMPTION_APPLIED`, `LEDGER_APPEND_VALIDATION_RESULT` (§7.1), `STAGING_PROVENANCE_REQUIRED` (§5.1), `STAGING_RUN_ID`, `PRODUCTION_RUN_ID`, `PROMOTION_RUN_ID` if applicable, `ROLLBACK_VERSION_ID`, `RESULT` — stored in at minimum (1) a GitHub Actions Job Summary, (2) a durable workflow artifact, and (3) the append-only ledger (§3). **Chat output is not authoritative evidence.**

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

**`LEGACY_IN_FLIGHT_RELEASE` is now history only (2026-09-23, §11.1).** It stays a readable `RELEASE_STATE` and a readable `FINAL_RISK` value for the rows that already carry it, and those rows are never edited. It is no longer a value `promote-production.yml` can emit: a future promotion must carry a policy-computed `LOW`/`MEDIUM`/`HIGH` from its release evidence or fail closed.

It is **not** redeployed or reclassified using the new classifier. It finishes using its existing evidence: staging provenance, the official 10% verification, R3's deterministic release-role evidence, and the future promotion-only workflow (§11). After a successful promotion to 100%, the promotion workflow must write the promoted release into the ledger as the new `STABLE_100` release — that entry becomes `BASE_PRODUCTION_SHA` for the next release.

---

## 18. Odoo scope exclusion (restated)

Restating §1 for emphasis, since this is the most commonly mis-scoped boundary: this policy governs the **website's** side of the Odoo relationship — the Cloudflare Worker, `lib/odoo/**`, catalog/processing sync into D1, and `docs/integrations/odoo/**` as the contract-of-record. It does not, and cannot, govern what happens inside Odoo itself. A change to `odoo-modules/**` (the Odoo-side Python module living in this repository for convenience) never enters the website's Cloudflare Worker build and is therefore LOW under this classifier specifically because it has zero blast radius on *this* deployment pipeline — not because it is low-risk in general. Odoo needs, and does not yet have, its own release policy.

---

## 19. `CONTENT_REBUILD` — content-only publication without manual approval

**Owner decision D4, 2026-10-04 (`docs/OWNER_DECISIONS.md`); architecture `AHANASSA-CF-FREE-ODOO-ARCH-V1.1` §7.3.** This section is itself a governance change and was approved as a HIGH change by the owner. It governs the production job of the content publication pipeline (`.github/workflows/content-publish.yml`, `docs/CONTENT_PUBLICATION_PIPELINE.md`): a publication that changes only public content (Odoo data → snapshot → static assets), never code.

A production content publication is `OPERATION_TYPE: CONTENT_REBUILD` only when **all** of these hold:

1. **Same code as production.** The artifact's private `manifest.json` `code_sha` equals `BASE_PRODUCTION_SHA` — the `RELEASE_SHA` of the latest `STABLE_100` row of the ledger (§2, §3), resolved by the strict validator `resolveBaseProductionShaFromManifest`. The ledger is read from the trusted production application branch, never from the artifact's own `code_sha` (a release can never carry its own `STABLE_100` row, §7.1 item 10). An active canary is never the baseline.
2. **Only static assets + the snapshot change.** No code, workflow or Worker configuration change: the artifact was built by the content pipeline (its `pipeline` block is present) for the `production` target from that same `code_sha`, and `public-assets/` contains no executable or Worker configuration (`_worker.js`, `_routes.json`, `wrangler.*`, `functions/`). The workflow and the Worker configuration used for the deploy are those of the `code_sha` checkout.
3. **Gates replace the approval.** Every §7.1 gate of the architecture passed (validate + decrease gate, publication/leak gate, artifact gate incl. the indexing gate, checks), and the publish job keeps its **automatic smoke** and **automatic rollback** (architecture §7.2). These replace the manual production approval.

**Manual approval is still required** (`APPROVAL_REQUIRED`) when the decrease gate was overridden — `pipeline.allow_decrease` is `true` or `pipeline.overridden_decreases` is not empty — or when a gate failed. Approval never overrides a failed checksum, artifact gate or smoke: those stop the run.

**Anything else is not a content rebuild** (`REFUSED`): a missing or malformed ledger, no `STABLE_100` row, a `code_sha` that is not the latest `STABLE_100` release, a staging-target or non-pipeline artifact, or a non-static file. Such a change is a **code release** and keeps the existing path unchanged: exact SHA, staging provenance (§5.1), `deploy-production.yml` release policy gate (§0.2), and the HIGH canary path where `FINAL_RISK` is HIGH (§5, §11, §12).

| Check result | Meaning | Exit status |
| --- | --- | --- |
| `AUTO` | `CONTENT_REBUILD`; publish without manual approval | 0 |
| `APPROVAL_REQUIRED` | `CONTENT_REBUILD`, but the decrease gate was overridden or a gate failed: the production environment's reviewer approval is required | 3 |
| `REFUSED` | not a content rebuild: code release path | 1 |
| (could not run) | treated as `REFUSED` | 2 |

**Executable check.** `lib/ci/content-rebuild.ts` (`evaluateContentRebuild`, pure) and `lib/ci/content-rebuild-cli.ts` (`--artifact <dir> --ledger-ref <trusted ref> [--gates-passed true|false] [--decision-file <out>]`), tested by `lib/ci/content-rebuild.test.ts` (match → `AUTO`; mismatch → `REFUSED`; ledger missing/malformed/no `STABLE_100` → `REFUSED`; `allow_decrease` or an overridden decrease → `APPROVAL_REQUIRED`; failed gate → `APPROVAL_REQUIRED`; non-static/staging/non-pipeline artifacts → `REFUSED`; CLI exit codes). The future production job (W8) runs it before any production write; the `TODO(W8)` in `content-publish.yml` names it.

**Audit.** The decision (`result`, `code`, `code_sha`, `BASE_PRODUCTION_SHA`, `snapshot_version`, reasons, ledger source) is written to the job summary and the decision file, which the production job keeps as an artifact (§15). A `CONTENT_REBUILD` adds no ledger row: the ledger records code releases; the content version is recorded in `DB_PUBLIC` `publication_state` (architecture §5.1).

**State today (2026-10-04).** The ledger's latest `STABLE_100` row is the legacy SSR Worker's release. Until a v11 static-site code release reaches `STABLE_100` through the code release path (W8), every v11 content artifact is `REFUSED` as a content rebuild — the check fails closed, as intended.

**Update 2026-10-06 (D-DAR-063).** The v11 code release path now exists (§20). The trusted ledger branch is `feat/v11-static-site` (§20.4). The scheduled production content publish builds from `BASE_PRODUCTION_SHA`, not from the branch tip (§20.5). Until the first v11 `STABLE_100` row is appended, the check still returns `REFUSED`.

**Update 2026-10-09 (W9.7).** For the v11 static site, item 1 "same code as production" means the **live code** (§20.5), not `BASE_PRODUCTION_SHA`. A `LOW` release serves `www` before its `STABLE_100` row (§20.1), and its content must keep publishing without downgrading it. The check `content-publish.yml` runs is `.github/scripts/v11-live-release.mjs content-check` on `main`. Items 2 and 3 are unchanged; the refusal code is `CODE_SHA_NOT_LIVE` instead of `CODE_SHA_MISMATCH`. `lib/ci/content-rebuild.ts` keeps its `BASE_PRODUCTION_SHA` semantics, but the workflow no longer calls it.

---

## 20. v11 static-site release path

**Owner decision D-DAR-063, 2026-10-06 (`docs/OWNER_DECISIONS.md`; closes `DOCUMENT_AUDIT_REPORT.md` DAR-063), amended by owner decision W9.7, 2026-10-09 (release simplification).** Since the W8.1 cutover (2026-10-05), `www.ahanassa.com` is served by the v11 static-assets Worker `ahanassa-v11-static-production`. A Worker attached by custom domain serves one version to 100% of traffic, so it cannot run the §5 HIGH path (10% canary → `verify-production.yml` → `promote-production.yml`). This section is that Worker's release path.

**What counts as a v11 code release.** A `content-publish.yml` production publication whose artifact `code_sha` is not the **live code**: the code that `www.ahanassa.com` serves at the time of the build (§20.5 "Live code"). A publication whose `code_sha` is the live code is a `CONTENT_REBUILD` (§19), not a release.

**Owner routine (W9.7).** Claude opens a PR → the owner merges it → staging builds automatically (about 15–20 minutes) → the owner taps **Approve** in the GitHub app → `www.ahanassa.com`. No terminal command is part of the routine (§20.7).

### 20.1 The path

1. **Staging publish + smoke.** A merge to `feat/v11-static-site` (a push whose `CI` run succeeds) starts a `content-publish.yml` run (`workflow_run`) that builds **that commit**. The owner can also start the same run from the GitHub UI: `content-publish.yml` → Run workflow → `target=production-prep` (it builds the branch tip). The run builds the staging and production artifacts from one `code_sha` and one snapshot. Its `publish` job publishes the staging artifact, and the automatic staging smoke must pass. This is the release's staging provenance (§5.1): same run, same `code_sha`. The 22:47 UTC staging schedule is unchanged.
2. **Risk class (§20.1a).** The build job classifies the change from the live code to `code_sha`: `LOW`, `HIGH`, or `NONE` (no file differs).
3. **Production-prep publish, with environment approval.** The `publish-production` job of the same run starts after the staging publish — on a dispatch, and on a merge run whose code differs from the live code beyond the ledger file — and waits in environment `production-v11` for the required reviewer's **Approve**. **Reject** publishes nothing. Repository variable `V11_AUTO_PRODUCTION_PREP=off` stops merge runs from starting it (they publish staging only).
   - **Never a downgrade, never an old commit.** The job runs only when the candidate is the branch tip **and contains the live code**. A re-run of an old CI run, or a tip behind `www`, never reaches production.
   - **A ledger-only merge never offers a release.** A merge whose own change is only the ledger file (the bot's `STABLE_100` or `ROLLED_BACK` row) starts staging only. After a rollback, the diff from the live code to the tip still contains the rolled-back code.
   - **A waiting Approve holds the workflow's queue.** The 22:47 and 08:00 runs wait behind it, and GitHub keeps only the newest pending run. Approve or Reject promptly; content does not publish meanwhile. An approval given after a later publish changed `www` fails the guard, and nothing is written. Right before its first write the job checks that `www.ahanassa.com` still serves the snapshot the build saw: a rollback or another publish since the build stops it, and nothing is written. It checks again right before the deploy. It loads, deploys, smokes `www.ahanassa.com` and switches, and it rolls back automatically on any failure. The release reaches 100% at once. After finalize it leaves the `v11-live-release` record (§20.5).
4. **Observation** (§20.2), 24 h from the switch, by `v11-release-watch.yml` (§20.8):
   - **LOW:** not blocking. The next release need not wait, and an ops-health production ALERT within the 24 h rolls the release back automatically: the previous Worker version and the publication pointer (§20.8).
   - **HIGH:** the §20.2 observation as before. An ALERT stops it, and the owner decides between a rollback (one tap, §20.7) and a fix. A fix is a new release with a new observation. Nothing happens automatically. While a HIGH release is in its observation, the owner approves no further release, except a fix after an ALERT.
5. **`STABLE_100`.** After 24 h with no ALERT, `v11-release-watch.yml` opens a bot PR that appends the row (§20.3) to the ledger on the ledger branch (§20.4). The PR changes nothing else in the file (§3). **The owner's merge of that PR is the §12 attestation.** Only from then on is the release `BASE_PRODUCTION_SHA`. After a rollback, the bot PR appends a `ROLLED_BACK` row instead, and the release never gets a `STABLE_100` row.

**Not part of this path:**
- **10% canary.** It does not apply to a custom-domain static Worker; the observation of step 4 replaces the canary period.
- **`verify-production.yml` and `promote-production.yml`.** They operate on the legacy Worker `ahanassa-production` only.
- **`deploy-production.yml`'s release policy gate (§0.2) and the v1 path classifier (`lib/ci/release-risk-classifier.ts`).** Neither runs for v11. Against the legacy baseline `f2202ab…` the v1 classifier returns `AMBIGUOUS`, because the v11 tree adds entries its taxonomy does not cover (W9.1 evidence). Under §9 that ambiguity is resolved only by amending this policy, and §20.1a is that amendment.

### 20.1a Risk classes (v11, owner decision W9.7)

The classifier is `.github/scripts/v11-release-risk.mjs` on `main`, run from the workflow's own commit, never from the candidate. It diffs **the live code → `code_sha`** (`git diff --name-status -M -C`) and puts every path on both sides of a rename or copy through an **explicit allowlist**:

| Rule | Paths |
| --- | --- |
| `css` | any `*.css` file |
| `image` | `public/**` raster images and icons: `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.ico` (**not `.svg`**: SVG can carry script) |
| `copy` | the copy/message modules `lib/content/{homepage,nav,pages,buyer-value,evaluation-assurance,industries,purchase-process}.ts` and `lib/weight-calculator/copy.ts` |
| `copy-test` | `lib/content/*.test.ts` (the frozen-spec tests that pin that copy; tests never ship) |

- **`LOW`:** every changed path matches a rule.
- **`HIGH`:** anything else, for example pricing, RFQ, Workers, workflows, D1 migrations, configuration (`wrangler*`, `package*.json`, `vite.config.ts`), the content pipeline (`scripts/content/**`, `lib/content-pipeline/**`, `lib/static/**`), `lib/ci/**`, docs, components and pages. Also `HIGH`: `lib/content/contact-channels.ts` (company numbers, an artifact-gate input), `lib/content/whatsapp.ts`, an unknown git status, and a live code that could not be resolved (no base to diff against).
- **`NONE`:** no file differs. This is not a code release.
- There is no `MEDIUM` and no `AMBIGUOUS`: the default is the most restrictive class.
- A new copy module is `HIGH` until it is added to the list. Adding it is a change to `.github/**`, so it is `HIGH` itself.

The class is recorded in the build summary, the `v11-live-release` record and the ledger row (`FINAL_RISK`). A v11 release before W9.7 has no recorded class and counts as `HIGH`.

### 20.2 `MINIMUM_OBSERVATION_DURATION (v11)` = 24 h

The window is 24 h from the completion of the production job's switch. During it, ops-health production (`ops-health.yml`, job `health (production-prep)`, `scripts/ops/health/run.ts --env production`) must report **no ALERT** (a failed job).

Each run's analytics window starts at the start of the previous completed run of the same job (success or failure), at most 24 h back. Since W9.7 that run is found job by job, page by page. A run whose other job was cancelled or held still counts. With no completed run in the last 24 h, the window is the full 24 h, never the 15-minute minimum (W9.1c finding).

A period without a completed run (a monitoring gap) therefore counts as observed only when the next completed run covers it with no ALERT. The window ends with the first run that starts at or after the 24 h mark; that run still reports on the end of the window. A gap of more than 24 h is covered by no run; the watch reports it and the owner decides. A local run of the same code with the same read-only scope also counts (owner, by hand).

The observation evidence lists the runs, their outcomes and every gap over 30 minutes; the `STABLE_100` bot PR carries it. An ALERT during the window stops the observation: `LOW` rolls back automatically (§20.8), `HIGH` goes to the owner (§20.1 step 4).

### 20.3 `STABLE_100` field mapping (v11)

The ledger schema (§3) and its strict validator (`lib/ci/release-ledger.ts`) are unchanged. A v11 row fills the columns as follows (`.github/scripts/v11-ledger-append.mjs` writes it):

| Column | v11 value |
| --- | --- |
| `RELEASE_SHA` | the production artifact's private `manifest.json` `code_sha` (full 40 characters) |
| `WORKER_VERSION_ID` | `deployed_worker_version_id` of the run's `publish-state.production.json` (Worker `ahanassa-v11-static-production`) |
| `RELEASE_STATE` | `STABLE_100` (`ROLLED_BACK` after a rollback) |
| `FINAL_TRAFFIC_PERCENT` | `100` (a custom domain serves one version); `0` for `ROLLED_BACK` |
| `STAGING_RUN_ID` | the `content-publish.yml` run id. The staging `publish` job of the same run published the same `code_sha` and snapshot |
| `PRODUCTION_RUN_ID` | the same `content-publish.yml` run id (its production job) |
| `PROMOTION_RUN_ID` | **substitute:** the `content-publish.yml` run id of the production job that put the release on `www.ahanassa.com`. Numeric, as for every `STABLE_100` row (`-` for `ROLLED_BACK`) |
| `ROLLBACK_VERSION_ID` | `previous_worker_version_id` of the same `publish-state.production.json` (for `ROLLED_BACK`: the version the rollback restored) |
| `FINAL_RISK` | the §20.1a class: `LOW` or `HIGH` (`HIGH` for a release before W9.7) |
| `RESULT` | `PASS`: the production job succeeded, including its smoke, and the observation passed (`FAIL` for `ROLLED_BACK`) |
| `TIMESTAMP` | UTC time the version began serving 100% of `www.ahanassa.com`: the completion of the production job's switch step (for `ROLLED_BACK`: the rollback) |
| `NOTES` | `v11 static`, the class, the snapshot version, `OBSERVATION_STARTED_AT` → `OBSERVATION_ENDED_AT`, the observation evidence (ops-health runs, gaps), the watch run. The owner attestation is the merge of the bot PR, recorded by git |

**A v11 version that served 100% but is not made `STABLE_100`** is recorded as history with `RELEASE_STATE = SUPERSEDED` once a later v11 release serves `www.ahanassa.com`. The W8.1 cutover release `d4f57f6` is such a version. A history row is never `STABLE_100` and never becomes `BASE_PRODUCTION_SHA`. A `LOW` release replaced by the next release within its 24 h gets no automatic row; the owner may add a `SUPERSEDED` row by hand.

### 20.4 The ledger branch

`docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md` is read from **`feat/v11-static-site`**, the production application branch since the W8.1 cutover. Every reader uses this one branch: `content-publish.yml` (its `LEDGER_REF`), `v11-release-watch.yml`, and the release's own evidence. New rows are appended there only, through the watch's bot PRs (branches `bot/v11-ledger-*`) or by the owner.

The copy on `feat/header-hero-integrated` (the legacy branch, frozen since D-FREEZE) stays as history. It is identical up to the last legacy row and gains no rows. As before, a release never carries its own row (§19 item 1): the row is appended in a commit after `RELEASE_SHA`. A merge of a ledger-only change starts a staging build but never a production-prep job.

### 20.5 The scheduled production content publish (D-CONTENT, D-SCHEDULE, W9.7)

**Schedule.**
- **Production:** daily at **08:00 UTC (11:30 Asia/Tehran)**.
- **Staging:** the 22:47 UTC run is unchanged. It builds the branch tip and publishes staging only.

**Live code.** The production publish state is the set of `v11-live-release` artifacts (`live-release.json`: `code_sha`, snapshot, Worker versions, previous code and snapshot, class, switch time). Every production job of `content-publish.yml` writes one after finalize, and `v11-release-watch.yml` writes one after a rollback. For releases before W9.7, the `production-prep-evidence-*` and `production-content-evidence-*` artifacts serve the same purpose. Only artifacts of runs on `main` of those two workflow files count. The live record is the newest one whose snapshot is the one `www.ahanassa.com/manifest.public.json` serves at that moment. It is resolved by `.github/scripts/v11-live-release.mjs` on `main`; the ledger and its strict resolver are read from the ledger branch.

**What the 08:00 run builds.** Its build job checks out **the live code**. It never builds the ledger's older `STABLE_100` (that would downgrade the code) and never the branch tip (that would release unapproved code). The live code must:
- be on the ledger branch's history;
- contain the content pipeline;
- **contain** the latest `STABLE_100` `RELEASE_SHA` (an older code is a downgrade).

If any of these fails, or the live code cannot be resolved, the run builds the tip for staging only and posts a warning. **No one disables `content-publish.yml` during an observation**: it cannot downgrade the code any more.

**When the 08:00 run publishes to production.** All three must hold:
- the live code is eligible (above);
- its production configuration declares the `www.ahanassa.com` custom domain with `workers_dev: false`;
- the CONTENT_REBUILD check (§19), made against the live code, returns `AUTO`. The check is `.github/scripts/v11-live-release.mjs content-check`.

Right before the first write, the job checks again that `www` still serves the snapshot the build saw. **Otherwise** it publishes nothing to production, posts a notice and keeps the decision file. If the live code's configuration does not declare `www.ahanassa.com`, the run fails (alert).

**Order.** The run publishes staging first, from the same artifact; the production load verifies that the staging artifact is active. A content rebuild adds no ledger row (§19).

### 20.6 Not covered by this path

Releases of the v11 RFQ Worker `ahanassa-v11-rfq-production` (`api.ahanassa.com`) are deployed with `wrangler`, not by `content-publish.yml`. D-DAR-063 does not define their path. They remain owner-approved manual deploys, recorded in their release report (open item in `DOCUMENT_AUDIT_REPORT.md` DAR-063). The source-name scan (§20.9) and the risk classes do not change that.

### 20.7 The owner routine on a phone (GitHub app)

**Release (any class).**
1. Open Claude's PR → **Merge**.
2. Wait about 15–20 min: CI, then the `Content publish` run (the build, then staging).
3. A notification "Review pending deployments" arrives. Open it (or: Actions → Content publish → the newest run) → **Review deployments** → tick `production-v11` → **Approve and deploy**. To skip this release, tap **Reject**.
4. The run summary shows the class (`LOW`/`HIGH`), the live code before, and the result.

**About 24 h later.** A bot PR "Ledger: STABLE_100 for …" appears. Open it, check that the observation lists no ALERT, and **Merge**. That is the attestation.

**On an ALERT e-mail during the 24 h.**
- **LOW:** the release rolls back by itself. A failed `v11 release watch` run reports it by e-mail, and a "Ledger: ROLLED_BACK …" PR appears: **Merge** it. A fix is a new PR.
- **HIGH:** decide. To roll back: Actions → **v11 release watch** → **Run workflow** → `operation = rollback` → **Run workflow**. To fix forward: merge the fix PR and Approve it as above.

**Starting production-prep by hand** (for example, to re-run a release): Actions → **Content publish** → **Run workflow** → `target = production-prep` → **Run workflow**. Then step 3.

**Before W9.7** the same release needed a manual dispatch, the 24 h observation with local evidence, a hand-written ledger commit, and `content-publish.yml` disabled during the observation (the 08:00 run would have rebuilt the older `STABLE_100` code).

### 20.8 Automatic rollback and ledger rows — `v11-release-watch.yml`

`v11-release-watch.yml` on `main` runs hourly at :52, after the :49 ops-health run, and on demand.

**Watch job.** It finds the event that made the live code live (the newest release or rollback record behind the live record) and reads every ops-health production job since its switch (§20.2). Then it decides:

| State | Action |
| --- | --- |
| no ALERT, 24 h covered | job `ledger`: bot PR appending the `STABLE_100` row (§20.3); idempotent (one branch per release) |
| ALERT, `LOW` | job `rollback`, then the `ROLLED_BACK` bot PR, then `notify` fails the run so GitHub e-mails the owner |
| ALERT, `HIGH` | nothing automatic; warning in the summary (ops-health already e-mailed); the owner decides |
| uncovered gap (> 24 h) | nothing automatic; the owner decides |
| `operation = rollback` (owner dispatch) | job `rollback` for the current release, any class |
| the live code is a rollback | the `ROLLED_BACK` row, if it is missing. A rollback is never rolled back |
| the release cannot be identified (an older record without its predecessor, or a broken chain such as a publish of the rolled-back code) | nothing automatic; the owner decides |
| `operation = rollback` of a release that already has its `STABLE_100` row | refused: that is an `EMERGENCY_ROLLBACK` (§13) |

**E-mail.** GitHub e-mails the owner for a failed run, so the `notify` job fails the run:
- for every rollback;
- for a `HIGH` ALERT, once per new failed ops-health run;
- for a gap or an unidentified release, once a day (at 08:52 UTC).

A health job that hit its timeout counts as an ALERT.

**When `www` is down.** If the release broke `www`, the watch takes the newest production record as live, and the rollback uses the production pointer as the live snapshot.

**Rollback job** (`.github/scripts/v11-rollback.mjs`). It runs in environment `production-v11-content`, with no reviewer (an automatic rollback cannot wait) and its deploy token for the static Worker and `DB_PUBLIC`.
- **Preconditions, all read before any write.** `www` still serves the snapshot of the decision, and the production pointer equals it. The release's previous snapshot is still in `publication_state` (retention 3). The Worker is not already on the target. The previous live code is known. No `content-publish.yml` production job is running or queued (it waits up to 25 minutes; a job waiting for approval is not running, and its own guard stops it after approval).
- **Writes.** `wrangler versions deploy <previous_worker_version_id>@100%` on `ahanassa-v11-static-production` (the previous artifact's exact assets), then the publication pointer back to the previous snapshot. The pointer write is guarded on its current value.
- **Verify.** The Worker version, the pointer, and the snapshot `www` serves.
- **After.** It writes the `v11-live-release` rollback record. A failure after the first write is an ALERT for the owner, never a silent retry.

This rollback is the §20.1 "failure during observation" rollback with the run's recorded target. It is not the §13 `EMERGENCY_ROLLBACK`, which stays unchanged. The owner's dispatch is the human decision for `HIGH`. For `LOW`, the owner decided in advance (W9.7) that an ALERT is enough.

**Ledger job.** It appends exactly one row with `.github/scripts/v11-ledger-append.mjs`. It re-validates the whole file with the strict resolver read from the ledger branch: `STABLE_100` must make the release `BASE_PRODUCTION_SHA`, and `ROLLED_BACK` must leave it unchanged. Then it pushes `bot/v11-ledger-<state>-<sha12>` and opens a PR to `feat/v11-static-site`. It never pushes to the ledger branch itself. If GitHub Actions may not open PRs in this repository, the job summary gives a one-tap "compare" link instead.

### 20.9 Price-source names (W9.7)

The repository is public: no file in it, and no file of its build output, may name a price source. The list is the repository secret `AHANASSA_PRICE_SOURCE_NAMES`, one name per line. A job writes it to a `0600` file under `$RUNNER_TEMP`, outside the checkout, and passes the path as `AHANASSA_PRICE_SOURCE_NAMES_FILE`.
- **Artifact gate (blocking).** The gate (`lib/static/source-name-scan.ts`) reads the file in `content-publish.yml` (build, publish and production jobs) and in `CI` (`static-export`).
- **Tracked tree.** `.github/scripts/v11-source-names.mjs` scans every tracked text file with the same rules. It blocks in `CI` (pull requests and pushes) and in `CI (main)`. In `content-publish.yml` it only reports, because a tracked file is already public and stopping the daily publish would not unpublish it.

Neither scan ever prints a name. A finding names the file and the name's line number in the private list. A path that contains a name is redacted. Without the secret, each scan reports that it did not run.

### 20.10 Tests

`CI (main)` runs `node --test ".github/scripts/*.test.mjs"` and `actionlint` on every PR to `main`; the application's `CI` runs `npm test`.

| Subject | Tests |
| --- | --- |
| classifier (§20.1a) | `.github/scripts/v11-release-risk.test.mjs`: LOW only for css/image/copy; HIGH for pricing, RFQ, Workers, workflows, D1, config, pipeline, docs, `contact-channels.ts`, SVG; mixed diff = HIGH; renames/copies both sides; unknown status; ledger-only; no base = HIGH; a real git diff |
| live-code selection (§20.5) | `.github/scripts/v11-live-release.test.mjs`: the 08:00 build gets the live code, not the older `STABLE_100` and not the tip; refused for an unknown snapshot, a foreign SHA, a downgrade; the release event behind content publishes; legacy evidence; rollback records; only trusted runs on `main` count; CONTENT_REBUILD against the live code |
| observation + decisions (§20.2, §20.8) | same file: PASSED / OBSERVING / ALERT (inside, on the covering run, not after) / GAP; job-level reading of runs with a stuck job; LOW+ALERT = rollback, HIGH+ALERT = owner, PASSED = `STABLE_100`, a rollback is never rolled back |
| auto-ledger (§20.3, §20.8) | `.github/scripts/v11-ledger-append.test.mjs`: one line appended, nothing else changed, the strict resolver makes it `BASE_PRODUCTION_SHA`; `ROLLED_BACK` never changes it; no pipe/newline breaks the table; idempotent CLI |
| rollback (§20.8) | `.github/scripts/v11-rollback.test.mjs`: Worker then guarded pointer then verify; refused before any write (pointer moved, target pruned, www moved, already on target, no target); a failure after a write is an ALERT |
| ops-health lookback (§20.2) | `scripts/ops/health/checks.test.ts`: 10+ cancelled runs no longer collapse the window; the job of a held run counts; nothing in 24 h = the full window |
| source names (§20.9) | `.github/scripts/v11-source-names.test.mjs`: findings never show a name; a path is redacted; fails on a finding; reports "not run" without a list |
