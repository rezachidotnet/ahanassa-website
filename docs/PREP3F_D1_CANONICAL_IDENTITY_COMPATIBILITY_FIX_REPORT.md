# PRE-P3F-D1 — Canonical Identity Compatibility Fix

# RESULT

**BLOCKED.** No code was changed. The task's stated authority — `ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`, described as "attached/backend-provided" — does not exist anywhere in this repository and was not attached to the task. No other source document (live API contract, OpenAPI spec, `PROJECT_OVERRIDES.md`, `DOCUMENT_AUDIT_REPORT.md`, `01-sources/`, or any code) mentions `canonical_id`, `canonical_template_id`, `CVAR-`, `CTMPL-`, or an Angle/Channel `kg, ton, meter` unit policy. Implementing this task as written would mean inventing an Odoo wire-contract shape and a business unit policy and writing them into production type definitions, runtime validators, D1 identity-column ingestion mapping, and RFQ unit policy — which `CLAUDE.md` §4/§8 and `PROJECT_OVERRIDES.md` §10 explicitly forbid, and which the task's own §5 explicitly instructs to STOP on ("If changing stored xid... would cause duplicate rows... STOP before migration/write logic").

This report documents what was checked, why the task cannot proceed as specified, and exactly what confirmation would unblock it.

# PRE-FLIGHT

- Branch: `feat/header-hero-integrated` (confirmed via `git branch --show-current`)
- PRE_HEAD: `4de59efe54f97860b7e76c75e696e121bd15b813`
- `git status` at start: clean except one untracked file, `docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md` (from a prior, same-day read-only audit task on this same branch)
- Read: `PROJECT_OVERRIDES.md` (full), `CLAUDE.md` (full), `docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md` (full, already on disk), `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md` (identity section, independently re-verified), `DOCUMENT_AUDIT_REPORT.md` (searched for any `canonical`/`CVAR`/`CTMPL`/DAR entry resolving this — none found prior to this task), `lib/catalog/odoo-api-client.ts` (`CatalogApiProduct`, `isValidProduct`), `lib/rfq/uom-policy.ts`.
- Searched for the named handoff file (`ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md`) and any `*HANDOFF*` match repo-wide: only unrelated pre-existing `0003_odoo_rfq_api_handoff.sql` migration files matched (a different, already-shipped RFQ API integration, not this task's subject).
- Repo-wide grep for `canonical_id`, `CVAR-`, `CTMPL-`, `canonical_template_id` across `.ts`/`.md`/`.yaml`: zero matches outside the one prior audit document, which itself is examining the hypothesis, not asserting it as confirmed fact.

# BACKEND CONTRACT AUTHORITY

**Not available.** The task named `ODOO_WEBSITE_CURRENT_CATALOG_CONTRACT_HANDOFF.md` as the authoritative source but no such file was attached to the task or exists in the repository. The only live, owner-frozen catalog identity contract that does exist is `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`, which states (line 21, unchanged since DAR-034):

> "Identity is `product_variant_xid` exposed as `id`, with `template_id` and `sku`; no PostgreSQL IDs are returned."

This is the opposite of the task's premise: in the current, real contract, `id`/`template_id` already *are* the durable, non-null canonical string identity — there is no documented `canonical_id`/`canonical_template_id` split, and no documented scenario where `id`/`template_id` are legitimately null.

# ROOT CAUSE

There is no code defect to fix. The current ingestion boundary (`lib/catalog/odoo-api-client.ts#CatalogApiProduct`/`isValidProduct`, `migrations_public/0002_catalog_v1_contract.sql`) correctly implements the one contract that is actually documented and owner-frozen. The task asks to change that boundary based on a second, different contract that has no documented existence. Implementing it would not be "fixing a compatibility gap" — it would be fabricating one side of an API contract from a task description alone, which is exactly the business-fact invention `CLAUDE.md` §4 and `PROJECT_OVERRIDES.md` §10 prohibit ("Odoo... exact API protocol, exact model/field mapping" is explicitly listed under "Explicitly NOT confirmed — do not invent").

A separate, real, independently-verifiable architectural point (not this task's premise, and not acted on here either, since it is out of scope without the premise): the current sync validator (`fetchCatalogProductsPage` → `isValidProduct`) fails an entire paginated sync page if any single row is structurally invalid, rather than skipping just that row. That is a legitimate future hardening candidate, but it is orthogonal to whether `canonical_id` is real, and changing it now — without a confirmed reason a row would ever be invalid — would be a speculative change with no confirmed trigger.

# API TYPE CHANGE

**Not made.** `CatalogApiProduct.id`/`template_id` remain `string` (non-null), matching the only confirmed contract. No `canonical_id`/`canonical_template_id` fields were added — adding them as real wire fields without confirmation would misrepresent the actual Odoo contract to every future reader of this type.

# VALIDATION CHANGE

**Not made.** `isValidProduct` in `lib/catalog/odoo-api-client.ts` is unchanged. Its current requirement (`typeof id === "string" && typeof template_id === "string"`) is correct for the documented contract.

# INTERNAL IDENTITY MAPPING

**Not made.** `xid`/`template_xid` in DB_PUBLIC continue to be sourced from `row.id`/`row.template_id`, matching the documented contract. Remapping this to a `row.canonical_id`/`row.canonical_template_id` that does not exist in the real API response would either be dead code (harmless but misleading) or, if the backend later ships a genuinely different shape than assumed here, a real production identity-mapping bug shipped on a guess.

# LEGACY COMPATIBILITY

Not applicable — no remapping was performed, so there is no new legacy-vs-canonical resolution path to test. The existing, single, already-correct mapping (`xid = row.id`, `template_xid = row.template_id`) is unchanged and continues to work exactly as it does in production today.

# DUPLICATION / MIGRATION CHECK

**Not reached — correctly stopped before this point, per the task's own §5 instruction.** Task §5 explicitly says: "If changing stored xid from legacy XID to CVAR would cause duplicate rows for already-synced production products, STOP before migration/write logic and document the migration requirement... This is a critical compatibility checkpoint." Since the premise that would trigger this remap (`canonical_id` existing and being different from the current `id`) is itself unconfirmed, evaluating a hypothetical migration against a hypothetical contract would produce a hypothetical answer with no evidentiary basis — worse than not answering at all. Once the actual contract is confirmed, this check must be performed for real against live D1 `product_variants.xid`/`catalog_products.template_xid` before any remap ships.

# RFQ IDENTITY

**Unchanged, and already correctly documented as decoupled from this question.** `lib/rfq/catalog-preselection.ts` and `lib/rfq/service.ts` already consume only the DB_PUBLIC `xid`/`template_xid` columns, never a raw Odoo API field directly. If/when the ingestion boundary's source field genuinely changes (confirmed `canonical_id` or otherwise), the RFQ layer needs no code change — it will automatically send whatever value lands in `xid`. This was independently re-verified against `lib/rfq/catalog-preselection.ts` and matches the prior audit's finding.

# ANGLE CHANNEL UOM

**Not added.** `lib/rfq/uom-policy.ts`'s `LAUNCH_GROUP_UOM_POLICY` still has no `ANGLE`/`CHANNEL` entries and falls back to the conservative default (`["kg", "ton"]`). The task's stated policy (`kg, ton, meter` for both) is a business/unit-policy fact attributed to "backend authority" with no actual source document, OpenAPI field, or `PROJECT_OVERRIDES.md`/`01-sources/` reference provided. `lib/rfq/uom-policy.ts`'s own file header states this allowlist "encodes... confirmed policy — it does not invent, guess, or extend it," which this task declined to override without a real source.

# NULL FIELD SAFETY

Not re-tested as part of this task (no code changed that would affect it). The prior audit (`docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md` §7) already confirmed, independent of this premise: `section_size = null` renders safely via `commercialSize ?? sectionSize ?? "—"`; `dimensions`/`nominal_weight` are consumed as opaque polymorphic maps with no fixed-key assumption. That finding stands unchanged.

# TESTS

**Not added.** Per `CLAUDE.md` §4 ("Add or update tests when behavior changes") — no behavior was changed, so no new tests were written. Writing tests that assert behavior for an unconfirmed `canonical_id` wire shape would itself encode the unconfirmed contract into the test suite as if it were fact.

Existing test suite was not run as a gate for this task since no source file was touched; `npx tsc --noEmit` was not required for the same reason. (Available on request once real implementation work resumes.)

# DOCUMENTATION UPDATES

- `DOCUMENT_AUDIT_REPORT.md`: new finding **DAR-056** added, recording this exact conflict (unconfirmed handoff document, unconfirmed `canonical_id`/`CVAR`/`CTMPL` scheme, unconfirmed Angle/Channel unit policy) as OPEN/BLOCKED, per `CLAUDE.md` §8's "never silently resolve... record the finding" rule.
- This report (`docs/PREP3F_D1_CANONICAL_IDENTITY_COMPATIBILITY_FIX_REPORT.md`) is the durable record of what was checked and why implementation did not proceed.
- No `01-sources/` document was edited (immutable for implementation work, and this finding does not concern a stale `01-sources/` statement — it concerns a task premise with no source document anywhere).

# REMAINING RISKS

- If the backend genuinely intends to ship `id: null`/`template_id: null` rows with `canonical_id`/`canonical_template_id` as the real replacement identity, the Website's current ingestion boundary would reject those rows and fail the entire containing sync page (all-or-nothing page validation, traced in the prior audit's §6) — a real, present-day architectural sharp edge, independent of whether this exact field-naming scheme is correct. This should be hardened (per-row skip instead of whole-page failure) once the real contract is confirmed, regardless of the specific field names it uses.
- The 19 upcoming Angle/Channel variants referenced in the task cannot be safely ingested or given a correct RFQ unit policy until both the identity contract and the unit policy are confirmed by an actual source document.
- No production data, migration, or D1 schema was inspected for a hypothetical `xid` remap's duplication risk (§ "Duplication / Migration Check" above) — this must be done for real once the contract is confirmed, before any remap ships, exactly as the task's own §5 anticipated.

# P3F READINESS

**BLOCKED.** Per `docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md`'s own recommendation (§8, `RECOMMENDATION: FIX_REQUIRED_BEFORE_P3F`) and this task's independent re-confirmation of the same premise gap, P3F should not proceed until one of the following is supplied by the Odoo/backend team, in writing, as a real versioned artifact (not a task-description assertion):

1. An updated `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`/OpenAPI diff explicitly naming `canonical_id`/`canonical_template_id`, their nullability rules for `id`/`template_id`, and the Angle/Channel `allowed_commercial_units` policy; **or**
2. Explicit confirmation that `id`/`template_id` remain the real, non-null identity ("canonical" is just new vocabulary, not a new nullable/non-nullable split), in which case this task's premise is withdrawn and no Website change is needed at all.

# GIT STATE

- PRE_HEAD: `4de59efe54f97860b7e76c75e696e121bd15b813`
- No source, migration, or config file was changed.
- New files (uncommitted, pending): this report, the `DOCUMENT_AUDIT_REPORT.md` DAR-056 addition, and `REPORT_BUNDLE_MANIFEST.txt` (new).
- `docs/PREP3F_WEBSITE_CANONICAL_ID_CONTRACT_AUDIT.md` (pre-existing untracked file from a prior task) is unchanged by this task.
- Nothing committed, nothing pushed. Per the task's own §15 ("If all tests pass: commit..."), since implementation did not proceed and there is nothing to test, no commit was made — left for the owner to review and decide whether to commit the documentation trail.
