# Odoo Public Category — Physical Model Discovery (P0)

Task: ODOO-PUBCAT-P0 — Physical Model Discovery
Task type: read-only Odoo architecture discovery. No Odoo write, no D1 write, no website runtime change, no migration, no deploy.
Date: 2026-09-14
Predecessor: `docs/catalog/PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md` (PS-P4-P1A) — this document attempts to close that document's OPEN QUESTIONS #1 and #2. `docs/homepage/HOMEPAGE_PRODUCT_CATEGORY_ARCHITECTURE_P0.md` (PS-P4-P0) and `docs/catalog/CATALOG_ODOO_TO_D1_PROVENANCE_AUDIT_P0.md` (CAT-PROV-P0) are re-read as evidence, not re-derived.

---

# RESULT

**B — MAPPING MODEL REQUIRED — READY FOR ODOO IMPLEMENTATION.**

Neither open question from `PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md` can be closed with certainty from this repository or through the sanctioned Odoo Public Catalog API v1 — no Odoo addon Python source exists in this repository for `ahanassa_marketplace` (only the unrelated `odoo-modules/ahanassa_website_rfq` CRM-lead module is present), and the Catalog API v1 is explicitly documented as having "No generic model, fields, domain, or integer-ID proxy" (`PUBLIC_CATALOG_API_V1.md` line 13). Per `CLAUDE.md`/`lib/catalog/odoo-api-client.ts`, catalog concepts must never be probed via the generic JSON-2 RPC transport (`lib/odoo/client.ts`) that the RFQ path uses — doing so would recreate exactly the "generic Odoo ORM access" the architecture forbids for catalog. Attempting to answer "is `classification.group` independently addressable" by querying Odoo directly was therefore correctly out of bounds for this task, not an oversight.

However, new evidence gathered in this pass (see CLASSIFICATION GROUP PHYSICAL MODEL below) shows the addressability question is **moot for the Website-facing design**, not merely unresolved: the Catalog API v1's own delivered contract (`migrations_public/0002_catalog_v1_contract.sql`, DAR-034) already proves that whatever `classification.group` is internally, it is exposed externally with **no separate identity, no ID, and no category endpoint** — "family/group/form are flat string codes attached directly to each variant (no category endpoint, no category ID)." The Website's own schema originally *guessed* `classification.group` would map to Odoo's core `product.category` model (`catalog_categories.odoo_id INTEGER — product.category.id`, `0001_catalog_schema.sql`) and that guess was explicitly proven wrong and abandoned in `0002` ("guessed a generic-ORM/integer-ID/EAV-attribute model that the real, deliberately denormalized public projection does not actually have"). Additionally, the live Phase 5B verification report states the API's backing serializer model (`ahanassa.public.catalog.variant`) itself "contains only denormalized allow-list scalar fields; its only ORM relations are audit users" — meaning even the public-facing Odoo projection model carries `classification.group.code`/`.name` as flat scalar fields, not a live relation.

Given this, a **stable-string-keyed mapping model, anchored on the new category side, is the correct default recommendation regardless of what the Odoo-internal commercial model turns out to be** — it is provably compatible with every possible internal shape, requires no modification to whatever model/addon currently owns `classification.group`, and produces the identical Website-facing contract the architecture document already specified. This closes the practical blocker without requiring further discovery, while leaving the true internal-Odoo-model question correctly flagged as something only an Odoo-side implementer with addon source access can ever fully confirm (see OPEN QUESTIONS).

---

# CLASSIFICATION GROUP PHYSICAL MODEL

**Not independently confirmable from this repository or the sanctioned integration boundary — and the available evidence indicates it does not need to be, for this design.**

What is confirmed, with sources:

| Fact | Evidence |
|---|---|
| No Odoo addon Python source for the catalog/marketplace domain exists in this repository | `find` across the repo: only `odoo-modules/ahanassa_website_rfq/` exists (a `crm.lead` inherit adding one Char field for RFQ idempotency) — unrelated to catalog/classification |
| The Catalog API v1 explicitly has no generic model/field/domain/ID proxy | `docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md` line 13: "No generic model, fields, domain, or integer-ID proxy exists" |
| The controller reads only one flat projection model | Same doc, line 35: "The controller reads only `ahanassa.public.catalog.variant` and calls its explicit serializer" |
| That projection model itself has no relational structure to classification concepts | `docs/integrations/odoo/catalog-v1/AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md`, "Serializer and source restriction": "The model contains only denormalized allow-list scalar fields; its only ORM relations are audit users." |
| `classification.group`/`.family`/`.form` are exposed with **no separate identity or ID at all** | `migrations_public/0002_catalog_v1_contract.sql` lines 55–63: "the API exposes no separate category or UOM master with independent identity — `family`/`group`/`form` are flat string codes attached directly to each variant (no category endpoint, no category ID)" |
| The Website's own original schema guess that this maps to Odoo's core `product.category` model was tried and explicitly abandoned | `migrations_public/0001_catalog_schema.sql` line 44 (`catalog_categories.odoo_id — product.category.id`) superseded by `0002`'s comment: "guessed a generic-ORM/integer-ID/EAV-attribute model that the real, deliberately denormalized public projection does not actually have" |
| `locale=fa\|en\|ar` has zero effect on `classification.group.name` today (identical English string regardless of requested locale) | `docs/homepage/HOMEPAGE_PRODUCT_CATEGORY_ARCHITECTURE_P0.md` line 34, live-tested against `odoo.ahanassa.com` |

**Interpretation.** These facts settle the *externally observable* shape (flat code+name, no ID, no relation) but do not and cannot settle the *internal* Odoo commercial-model shape — whether `classification.group` is backed by a real standalone model (e.g. a custom `steel.classification.group`), a `Selection` field on `product.template`, a `product.category`/tag structure, or something else again. That internal fact is invisible from the website side by design (the API deliberately does not leak it), and no addon source is present to inspect directly. This is not "we didn't look hard enough" — it is a structural consequence of the same "sole authoritative integration boundary" discipline this project has already enforced for every other catalog-adjacent decision (DAR-034).

**Why this doesn't block the design.** The public category feature's entire Website-facing contract — `public_category: {code, name}` on variants, `public_categories[]` on `/meta`, `?public_category=` filter — is, by the architecture document's own design, additive fields on the *same* flat `ahanassa.public.catalog.variant` projection, resolved server-side. Whatever internal relationship the Odoo-side implementer builds between the (possibly-unconfirmed) `classification.group` and the new `steel.public.category` model, the only thing that ever reaches the Website is another flat code+name pair on that same projection — identical in shape to `family`/`group`/`form` today. The mapping-model recommendation below is therefore the only design that can be called "ready" without waiting on Odoo addon-source access this task does not have.

**Safe to add a Many2one directly to it?** Cannot be confirmed either way from this repository. If an Odoo-side implementer confirms `classification.group` (or whatever backs it) is a real, independently addressable model with a stable Odoo internal id, adding `public_category_id = fields.Many2one("steel.public.category")` directly to it is also valid and slightly simpler — but is not required, and this report does not recommend blocking on obtaining that confirmation (see RELATIONSHIP MODEL below).

---

# ADDON OWNERSHIP

**Not confirmable from this repository. Best-evidenced recommendation: `ahanassa_marketplace`.**

Evidence:

- Every live Product Master XID observed in the Catalog API uses the `ahanassa_marketplace.` external-ID namespace, e.g. `ahanassa_marketplace.product_pf_rhs_s80x40x3_l6`, `ahanassa_marketplace.product_tmpl_pf_rhs` (`PUBLIC_CATALOG_API_V1.md` line 26). Odoo external IDs (`ir.model.data`) are namespaced by the module that created the record, so this is direct (though not conclusive — data can be assigned to a namespace by whoever authored the seed/import script) evidence that Product Master data lives under `ahanassa_marketplace`.
- The Phase 5B report's own title is "Ahan Asa Marketplace — Phase 5B Public Catalog API Report," and it describes the `ahanassa.public.catalog.variant` serializer model and the `/api/v1/catalog/*` controller as belonging to that same body of work.
- No other addon name appears anywhere in this repository in connection with catalog/classification concepts. The only other addon present, `odoo-modules/ahanassa_website_rfq`, is explicitly scoped to `crm.lead` (RFQ intake only, `depends: ["crm"]`) and has no relationship to product classification.

**Candidates explicitly rejected:**

- `odoo-modules/ahanassa_website_rfq` — wrong domain entirely (CRM lead RFQ idempotency, not Product Master/classification). Adding a category model here would violate its own stated single purpose and its `depends: ["crm"]` boundary.
- A brand-new, second catalog-adjacent addon — rejected per the architecture document's own reasoning and this task's framing ("must belong to the domain that owns the canonical Product Master / marketplace classification architecture"): splitting classification concepts across two addons when one (`ahanassa_marketplace`) already owns the Product Master and the Catalog API controller would fragment ownership for no benefit, and is exactly the kind of unrequested-scope addon proliferation `CLAUDE.md` §9 (Scope Discipline) warns against.
- Odoo's own stock/sale/base modules (e.g. extending `product.category` directly via `_inherit`) — rejected because `0002_catalog_v1_contract.sql` already proved `classification.group` is not `product.category` (no ID is ever exposed, no category endpoint exists); inheriting a core Odoo model on a guess that was already falsified once in this project's own history would repeat the same mistake `0001`→`0002` had to correct.

**Recommendation:** `ahanassa_marketplace` remains the best-evidenced owner and should be used, but this must be confirmed against the actual installed module list on `odoo.ahanassa.com` (e.g. via Odoo's own Apps/Technical Settings UI, by whoever has that access) before the module change is written — a standard pre-implementation check for any addon change, not a special blocker unique to this feature.

---

# RELATIONSHIP MODEL

**MAPPING MODEL** (code-keyed association, anchored on the new category side) — recommended as the default, for the reasons in RESULT and CLASSIFICATION GROUP PHYSICAL MODEL above.

```text
steel.public.category
  id              (Odoo internal)
  code            Char, required, unique     -- REBAR, BEAM, ANGLE, CHANNEL, BOX_SECTION, SHEET_PLATE, PIPE
  name            Char, translate=True
  sequence        Integer
  active          Boolean, default True

steel.public.category.group.code   (child/association model, owned by the category side)
  id               (Odoo internal)
  category_id      Many2one("steel.public.category"), required
  group_code       Char, required             -- the value already returned as classification.group.code
  _sql_constraints / models.Constraint: UNIQUE(group_code)   -- enforces "at most one category per group" at the DB level
```

This is **logically** the same Many2one-shaped relationship the architecture document specified (`classification.group` → `steel.public.category`, many-to-one) — it is just physically anchored on the category side via a stable string rather than requiring a field to exist directly on whatever backs `classification.group`. This has three concrete advantages over waiting to confirm direct-Many2one feasibility:

1. **Zero risk of guessing wrong a second time.** This project already guessed once (`0001_catalog_schema.sql`'s `product.category.id` assumption) and had to correct it in `0002`. A design that works identically whether `classification.group` is a real model, a Selection field, or a derived value carries no equivalent risk.
2. **Zero cross-addon coupling.** It does not require write access to, or an `_inherit` of, whatever model/addon currently produces `classification.group` — which is useful precisely because that addon is not confirmed (see ADDON OWNERSHIP). The new `steel.public.category`-owning addon (recommended `ahanassa_marketplace`, but even if that recommendation is wrong, still whatever addon actually gets picked) only ever needs to know the stable string codes it already receives from the same place the Catalog API already sources `group.code` from.
3. **Identical enforced invariant.** `UNIQUE(group_code)` on the association table enforces "a group belongs to at most one public category" exactly as strictly as a Many2one field would (a Many2one only ever points to one target by definition; a unique constraint on the reverse foreign key is the standard Odoo idiom for the same cardinality when the field cannot live on the "one per" side directly).

**Many2many is explicitly not recommended** — no requirement exists for a single group to appear under two public categories simultaneously (the owner's SHS+RHS→BOX_SECTION example is two groups into one category, not one group into two categories), and the`UNIQUE(group_code)` constraint above is only expressible with a one-row-per-group association, not a many-to-many join table. Introducing Many2many flexibility now would be unrequested scope per `CLAUDE.md` §9.

**If an Odoo-side implementer independently confirms `classification.group` is a real, directly addressable model:** they may still use this mapping-model design (it remains fully valid), or may simplify to a direct `public_category_id` Many2one field on that model instead — both are acceptable, and the choice does not change anything the Website consumes (see API IMPACT).

---

# PUBLIC CATEGORY FIELDS

Confirmed minimal field set — `code`, `name`, `sequence`, `active` — matches the architecture document exactly; no changes recommended.

**`show_on_website` / `show_on_homepage`: not necessary, should not be added.** The architecture document's own `isLive` derivation (`docs/catalog/PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md` HOMEPAGE section) already establishes the correct rule and this task's instruction to distinguish "configuration existence" from "website visibility" is fully satisfiable without a redundant boolean:

- **Configuration existence** = `steel.public.category.active = True` (an Odoo-side content/config fact — "this category exists and is not archived").
- **Website visibility** = derived at query time: `active = 1 AND EXISTS(≥1 publication-eligible variant among the category's mapped groups)`, using the exact same `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` gate every other public read already uses (`lib/catalog/editorial-repository.ts`).

Adding a separate `show_on_website` boolean would create a second, independently-settable truth that could drift from the derived reality (a category marked `show_on_website = True` with zero live products would still render an empty/broken card unless the code also checked eligibility — at which point the boolean is redundant; or worse, an operator could forget to flip it after products go live, silently hiding a real category with no code-visible cause). Deriving `isLive` dynamically — as already designed — is strictly safer and is the same idiom this schema already uses for template/variant publication eligibility. This finding **confirms** the architecture document's existing design; it does not change it.

---

# TRANSLATION

**`name = fields.Char(translate=True)` is the correct and sufficient mechanism** for fa/en/ar labels on `steel.public.category`, matching how `classification.group.name` is already (attempted to be) resolved per-locale by the same Catalog API today.

Important caveat, confirmed live (not assumed): `docs/homepage/HOMEPAGE_PRODUCT_CATEGORY_ARCHITECTURE_P0.md` found that requesting `locale=fa|en|ar` on the existing Catalog API currently returns the **identical English string regardless of locale** for `classification.group.name` — not because the fallback mechanism is broken, but because "Odoo has no real translation" entered for those specific records today (a **data gap**, not a mechanism gap). The same will be true of a brand-new `steel.public.category.name` field until FA/AR translations are actually entered into Odoo's `ir.translation` records for it — this is expected, not a defect, and is exactly why `PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md`'s Phase P2 explicitly includes "commission and review Arabic translations" as a real work item, not a formality.

**How the Catalog API currently resolves locale-aware fields (confirmed):** `docs/integrations/odoo/catalog-v1/AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md`, "Localization": `fa`/`en`/`ar` map to `fa_IR`/`en_US`/`ar_001`; default is Persian; fallback order is **requested → Persian → English → Arabic → neutral**, verified live including a 400 on an unsupported locale. This is the same fallback chain the architecture document specifies for `public_category.name` (§LOCALIZATION), and no new mechanism is needed — `steel.public.category.name` should be resolved by the exact same code path already resolving `family`/`group`/`form` names, since it is a `translate=True` `Char` field of the same kind.

**How `fa`/`en`/`ar` should be exposed:** identically to the existing pattern — the Catalog API's `public_category: {code, name}` object on each variant, and the `public_categories[].name` entry on `/meta`, both resolved server-side per the request's `locale=` parameter using Odoo's standard translation fallback, with the Website-side `catalog_public_category_labels` table (mirroring `catalog_group_labels`, `migrations_public/0009`) as the synced local cache — exactly as already specified. No translations are written by this task.

---

# STABLE CODES

**Confirmed final, no changes recommended:**

```text
REBAR
BEAM
ANGLE
CHANNEL
BOX_SECTION
SHEET_PLATE
PIPE
```

**`BEAM` vs `BEAMS`:** correctly kept as given, not "corrected" to match the technical group code `BEAMS`. These are two different identities in two different axes (public-category code vs. `classification.group` code), the same way `BOX_SECTION` (public category) legitimately does not equal either `SHS` or `RHS` (its two member groups). Forcing textual agreement between the two axes would be a cosmetic change with no technical benefit and a real risk of someone later assuming the two axes are always 1:1 (which is the entire reason this second axis exists). No existing public-category-naming convention exists elsewhere in the codebase to compare `BEAM`/`BEAMS` against (this is the first Public Website Category concept ever introduced) — the owner's supplied singular `BEAM` is the only precedent and should stand.

---

# TARGET CONFIGURATION

Confirmed exactly as specified in `PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md`:

| Public category | Mapped group(s) today |
|---|---|
| REBAR | `REBAR` |
| BEAM | `BEAMS` |
| ANGLE | *(none — no Odoo group exists yet)* |
| CHANNEL | *(none — no Odoo group exists yet)* |
| BOX_SECTION | `SHS`, `RHS` |
| SHEET_PLATE | `SHEET_PLATE` |
| PIPE | `SEAMLESS_PIPE` (open to future pipe groups without any Website code change) |

No ANGLE/CHANNEL group or product was created, confirmed by inspecting `docs/homepage/HOMEPAGE_PRODUCT_CATEGORY_ARCHITECTURE_P0.md`'s live Odoo group inventory (6 groups total: `BEAMS`, `REBAR`, `RHS`, `SEAMLESS_PIPE`, `SHEET_PLATE`, `SHS`) — unchanged since that audit; this task performed no new live Odoo query (see PRODUCTION SAFETY).

---

# API IMPACT

**Feasible, additive, no version bump — confirmed compatible with the actual physical model evidence gathered in this pass, not just the documented shape.**

Because the live serializer model (`ahanassa.public.catalog.variant`) is confirmed flat/denormalized with "only ORM relations [to] audit users" (Phase 5B report), adding `public_category` requires the Odoo-side sync/publish process that populates that projection model to also resolve and write two new denormalized scalar fields (e.g. `public_category_code`, `public_category_name`) onto it — exactly the same mechanism that already populates `classification_group_code`/`classification_group_name` there today. This is a stronger, evidence-based restatement of the architecture document's existing recommendation, not a change to it:

```json
"classification": {
  "family": {"code": "...", "name": "..."},
  "group": {"code": "RHS", "name": "..."},
  "form": {"code": "...", "name": "..."}
},
"public_category": {"code": "BOX_SECTION", "name": "..."}
```

Response shape: **sibling of `classification`, not nested inside it** — the architecture document's proposed placement (`classification: {..., group: {...}, public_category: {...}}`, §OPEN QUESTIONS/API CONTRACT draft) nests it under `classification`; based on the confirmed flat structure of the live payload (`classification` itself is already a fixed three-key object: `family`/`group`/`form`, per every live response sample in `PUBLIC_CATALOG_API_V1.md`), a **top-level sibling key** (`"public_category": {...}` alongside `"classification": {...}`) is the better fit — it doesn't require widening the existing three-key `classification` object's shape (which every current consumer, including `lib/catalog/odoo-api-client.ts`'s parser, was written against as a fixed shape) and it matches this task's own explicit "the public category is a presentation-layer grouping concept only... never appears in... pricing/RFQ/UoM logic" framing by keeping it visibly separate from the technical classification block rather than folding it in as if it were a fourth technical classification axis.

**`GET /api/v1/catalog/meta` exposing the ordered Public Category collection: yes, appropriate.** `/meta` already documents itself as "active-only family/group/form/grade/standard filter metadata" (Phase 5B report) — adding a `public_categories: [{code, name, sequence, group_codes: [...]}]` array is the same additive pattern already used for every other filter dimension, and per §MIGRATION PLAN item 2 of the architecture document, this is the authoritative source the Website's sync reads from — the Website must never hand-maintain the group↔category mapping.

**`?public_category=<code>` filter: yes, appropriate**, resolved server-side to the OR-set of member groups, additive alongside `family`/`group`/`form`/`grade`/`standard` — confirmed compatible with the existing filter list in `AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md`'s "Filtering and incremental sync" section, which already lists `family/group/form` as safe filters of the identical kind.

No API modification is made by this task.

---

# SYNC IMPACT

**Files/paths that would need modification (identified, not touched):**

| Concern | File(s) |
|---|---|
| Sync client — add `public_category` field parsing | `lib/catalog/odoo-api-client.ts` (the sole Catalog API v1 client; field-shape comment block would need a new dated verification note, matching its existing style) |
| Sync planning/apply — persist `public_category` onto variant rows if denormalized there, or handle via the new mapping sync below | `lib/catalog/sync.ts` (`planCatalogV1Sync`), `lib/catalog/repository.ts`/`sync-sql.ts` |
| New sync runner for the category/label/mapping tables (mirrors the existing group-label sync exactly) | New file alongside `lib/catalog/group-label-sync-runner.ts` / `lib/catalog/group-label-sync.ts` — reading `/meta#public_categories` |
| Repository/query layer | `lib/catalog/editorial-repository.ts` (new `listPublicCategoryShowcase`), `lib/catalog/catalog-filters.ts` (new `category`/`categoryCode`, new `valueIn` condition shape) |
| Scheduled trigger wiring (if/when the new sync is scheduled) | `workers/entry.ts#scheduled()`, `wrangler.jsonc`'s `triggers.crons` (already multi-cron; a new expression could be added to the same shared handler, following the exact precedent of the Catalog incremental/full-reconciliation crons added in DAR-040) |

**Group→category membership projection: normalized (option B), not denormalized onto `product_variants` — confirmed correct, matching the architecture document's own conclusion.**

Verified reasoning, independent of the architecture document's own justification: `product_variants.group_code`/`group_name` were denormalized onto every variant row because `group_code` is a **per-variant, high-cardinality, frequently-filtered** fact fetched directly from the API on every sync (no join needed at read time by design). `catalog_public_category_groups`, by contrast, is a **7-or-fewer-row, category-level** fact (one row per group, not per variant) — joining a 237-row variant table against a ≤10-row lookup table by an already-indexed `group_code` column is not a performance concern at this scale (D1/SQLite; even at 10x today's catalog size this remains a trivial index-range join). Denormalizing it onto `product_variants` would require re-syncing every affected variant row any time a single group's category mapping changes, for no read-time benefit — the architecture document's rejection of this is correct and this task finds no reason to revisit it. **No denormalization is needed** beyond what is already specified (`catalog_public_categories`, `catalog_public_category_labels`, `catalog_public_category_groups`).

**A previously-unconnected finding relevant to this section:** the schema already contains a dormant, never-fed `catalog_categories` table (`migrations_public/0001_catalog_schema.sql`, `stable_key`/`slug_fa`/`parent_id`/`sort_order`/`odoo_id → product.category.id`) that superficially looks like it could be repurposed for this concept. **It should not be.** It was designed around the same `product.category`/integer-ID assumption `0002_catalog_v1_contract.sql` explicitly disproved and abandoned ("NOT fed by this integration... documented gap, not silently abandoned"), it has no locale-label sibling table (would need one added anyway), and it is a *hierarchical* (`parent_id`-recursive) taxonomy whereas the Public Website Category concept is deliberately **flat** (7 fixed top-level categories, no sub-category nesting specified anywhere in the owner's decision). Building three new, purpose-fit tables — as the architecture document already specifies — is simpler and avoids inheriting an unrelated, already-abandoned table's baggage. This is a confirmation of the existing design, surfaced here because the task instructions asked for exact files/paths and this dormant table is a real, easily-mistaken candidate a future implementer might otherwise reach for.

---

# D1 IMPACT

**Migration `0011_public_categories.sql` — not created by this task, per instructions.** What it will need, precisely:

- **Schema dependency:** the three additive tables specified in the architecture document (`catalog_public_categories`, `catalog_public_category_labels`, `catalog_public_category_groups`) — no dependency on anything from this discovery task beyond confirming the table design doesn't need to change (it doesn't). No `ALTER` of any existing table.
- **Data dependency:** genuinely zero seed rows written by migration SQL (matching this schema's own "no fake/seeded data" discipline, `0009`'s own trailing comment) — the 7 category rows, their sequence, and their FA/EN names must be written by the **sync**, sourced from Odoo's `/meta#public_categories`, never hand-authored as migration INSERT statements. This mirrors `0009_catalog_group_labels.sql`'s own precedent exactly ("No seed rows... Populated only by a real sync").
- **Sync dependency:** the migration is inert (three empty tables) until (a) the Catalog API v1's additive `public_category`/`public_categories` contract actually exists and is verified live (P3), and (b) a new sync runner is written **and actually executed** against staging/production — `PS-P4-P0` already found the precedent group-label sync ("implemented, never run" — `catalog_group_labels` has 0 rows in both databases today) and the architecture document explicitly calls out not repeating that gap. This is worth restating as a hard dependency: **migration existing ≠ data existing ≠ feature live**, and this project has already made this exact mistake once for the adjacent `catalog_group_labels` table.

**D1 must never become a second source of category truth.** Confirmed by design: `catalog_public_category_groups` is written only by the sync, keyed by `group_code` (already the sole stable Website-side identity for groups), with a `UNIQUE(group_code)` index enforcing the same "at most one category per group" invariant Odoo enforces internally — this is a mirrored constraint, not an independent one that could silently diverge, exactly like `product_variants.group_code`/`group_name` are already a mirrored (never independently edited) projection of Odoo's `classification.group`.

---

# ANGLE CHANNEL ACTIVATION

**Confirmed: yes, ANGLE and CHANNEL public-category rows may exist configured (in Odoo, and once synced, in `catalog_public_categories`) before any Product Master product exists for them, and must not render publicly until then.**

Mechanism (already correctly designed in the architecture document, reconfirmed here): `catalog_public_category_groups` will have zero rows for `ANGLE`/`CHANNEL` for as long as zero Odoo groups exist for them (confirmed 6 live groups total, none named ANGLE/CHANNEL, per PS-P4-P0's live audit). `listPublicCategoryShowcase`'s `isLive` predicate is an `EXISTS` against that empty membership set, which can structurally never match — no `if code == 'ANGLE': skip` special case is needed anywhere in Website code. This is the same idiom (`TEMPLATE_PUBLICATION_WHERE_CONDITIONS`) already governing every other publication-eligibility decision in this schema, applied one level up. No fake ANGLE/CHANNEL product or group is created by this or any prior task.

---

# SERVICES BOUNDARY

**Reconfirmed: fully separate, no overlap, no shared table, no shared code path.**

`lib/processing/` (`public_processing_groups`, its own `sync-runner.ts`/`repository.ts`/`public-repository.ts`, its own Header dropdown, its own `/services` route) is architecturally and physically independent from every file this design touches (`lib/catalog/*`, the new `catalog_public_category_*` tables). Verified directly in this pass by listing `lib/processing/`'s contents — no import, foreign key, or shared type connects it to `lib/catalog/editorial-repository.ts` or the catalog schema. No Public Product Category model absorbs Services, and none is proposed to.

---

# IMPLEMENTATION DEPENDENCY ORDER

Unchanged from the architecture document's own P1–P9 sequence (re-verified against actual code dependencies in this pass — no reordering required):

```text
P1 — Odoo model/schema: create steel.public.category + steel.public.category.group.code
     (mapping model, per RELATIONSHIP MODEL above) in the confirmed-correct addon
     (recommended: ahanassa_marketplace, confirm against the live module list first).
P2 — Odoo data: seed 7 category rows (sequence 1-7, FA/EN names), map the 5 real
     groups, leave ANGLE/CHANNEL unmapped; commission Arabic translations.
P3 — Catalog API v1: additive `public_category` sibling on variant responses,
     `public_categories[]` on /meta, `?public_category=` filter — verified against
     a real staging Odoo response before any Website sync is written against it.
P4 — D1/DB_PUBLIC: migration 0011_public_categories.sql (three new tables, no
     seed rows) + new sync runner, RUN (not just implemented) against staging
     then production, row counts verified against Odoo's /meta exactly.
P5 — Website repository/filter: listPublicCategoryShowcase, catalog-filters.ts
     `category`/`categoryCode`/`valueIn` additions; /products?group= regression-
     checked for zero behavior change.
P6 — Header: swap to listPublicCategoryShowcase; verify fa/en/ar, RTL/LTR,
     MAX_HEADER_PRODUCT_SHORTCUTS cap.
P7 — Homepage Category Showcase: BLOCKED on separate IA authorization
     (DO_NOT_CHANGE.md §14) independent of P1-P6 readiness.
P8 — Angle/Channel Product Master population: Odoo/commercial decision, entirely
     outside Website scope and outside any Claude Code task's authority to
     schedule.
P9 — Staging acceptance: full QA (SEO, accessibility, fa/en/ar + RTL/LTR, cache,
     performance) before any production rollout of P5-P7.
```

The only adjustment this task makes to the prior document's sequencing: **P1 no longer needs to wait on an "is `classification.group` addressable" discovery answer** — the mapping-model design in RELATIONSHIP MODEL is actionable today, contingent only on the addon-ownership confirmation folded into P1 itself (a normal pre-implementation check, not a separate phase).

---

# OPEN QUESTIONS

1. **Internal Odoo commercial-model shape of `classification.group`** remains genuinely unconfirmed (real model / Selection field / something else) and is now understood to be **unconfirmable from the Website side by design** — the Catalog API v1 deliberately exposes no ID or relation for it, and this project's own schema history (`0001`→`0002`) already shows guessing this from the Website side has failed once before. This is not a blocker for P1 (see RESULT/RELATIONSHIP MODEL), but a genuinely open fact for whoever has direct Odoo addon-source or database access, useful only if they want to consider the simpler direct-Many2one alternative instead of the recommended mapping model.
2. **Addon ownership (`ahanassa_marketplace`)** is a best-evidenced recommendation (XID namespace, Phase 5B report title), not a verified fact — must be confirmed against the live installed-module list before the module is created.
3. **API response placement** — this task recommends `public_category` as a top-level sibling of `classification` (not nested inside it), differing from the architecture document's illustrative nested example. This is a documentation refinement, not a contradiction (the document itself only presented it as "example candidate" shape), but should be explicitly settled in the P3 API-contract phase, not assumed from either document.
4. Every open question already recorded in `PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md` §OPEN QUESTIONS #3-#7 (Homepage IA authorization, suppressed-category presentation, BOX_SECTION image sourcing, category-level SEO indexability, exact migration number at implementation time) remains open and is not re-litigated here — this task's scope was narrowly the two Odoo-side physical-model gates (#1-#2 of that document).

---

# ODOO WRITES

NONE. Every fact in this report was drawn from files already committed to this repository (`docs/`, `migrations_public/`, `lib/catalog/`, `odoo-modules/`) — no live request of any kind was made against `odoo.ahanassa.com` in this task. All live-verification facts cited (locale fallback behavior, live group inventory, XID namespace, serializer model relations) are re-read from prior tasks' own committed, dated findings (PS-P4-P0, CAT-PROV-P0, DAR-034/035, Phase 5B report), not re-derived by a new live call.

---

# D1 WRITES

NONE. No migration file was created. No `wrangler d1 execute` command was run.

---

# PRODUCTION SAFETY

No Odoo write performed. No D1 write performed. No website runtime code changed. No migration file created or executed. No deploy performed. No secret read, requested, or exposed. No live HTTP request made to `odoo.ahanassa.com` or any Cloudflare-hosted environment. `01-sources/`, `logo/`, `design-reference/` untouched. `main` untouched (work performed on `feat/header-hero-integrated`, pre-existing branch, clean tree at start). Working tree left clean apart from this new file.

---

**End of `ODOO_PUBLIC_CATEGORY_PHYSICAL_MODEL_DISCOVERY_P0.md`**
