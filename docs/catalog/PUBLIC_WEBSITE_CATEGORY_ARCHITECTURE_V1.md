# Public Website Product Category Architecture V1

Task: PS-P4-P1A — Odoo Public Website Category Contract
Task type: architecture design / freeze only. No Odoo write, no D1 write, no website runtime change, no deploy, no migration execution.
Date: 2026-09-14
Predecessor: `docs/homepage/HOMEPAGE_PRODUCT_CATEGORY_ARCHITECTURE_P0.md` (PS-P4-P0, read-only audit, 2026-09-14) — this document resolves PS-P4-P0's open "taxonomy mapping gap" finding at the architecture level, per the owner decision below. `docs/catalog/CATALOG_ODOO_TO_D1_PROVENANCE_AUDIT_P0.md` (CAT-PROV-P0) independently verified the underlying Odoo → DB_PUBLIC catalog sync this design builds on top of.

---

# STATUS

**READY TO FREEZE**, with two genuine Odoo-side discovery gates left explicitly open (see OPEN QUESTIONS #1–#2) and one Information-Architecture change flagged as requiring separate owner authorization before implementation (OPEN QUESTIONS #3, `DO_NOT_CHANGE.md` §14). Nothing below was implemented, migrated, deployed, or written to any database. This document is the P1 design references for a future P2–P9 implementation sequence; it is not itself an implementation authorization.

---

# OWNER DECISIONS

Recorded here as the binding input to this design, per the task instructions (not independently re-derived):

1. The final Website-facing public product taxonomy is **not** required to be 1:1 with Odoo `classification.group`. `classification.group` remains the canonical technical/commercial grouping (confirmed correct axis, PS-P4-P0). A separate **Public Website Category** layer is required because one public buyer-facing category may aggregate one or more technical groups.
2. Target 7-category taxonomy, in this fixed order: میلگرد (REBAR), تیرآهن (BEAM), نبشی (ANGLE), ناودانی (CHANNEL), قوطی (BOX_SECTION), ورق (SHEET_PLATE), لوله (PIPE).
3. Services remain a completely separate domain (already independently confirmed by PS-P4-P0 — `lib/processing/`, distinct sync, distinct Header dropdown, distinct route; unaffected by this design).
4. Target mapping: REBAR→`REBAR`, BEAM→`BEAMS`, ANGLE→(future group, none today), CHANNEL→(future group, none today), BOX_SECTION→`SHS`+`RHS`, SHEET_PLATE→`SHEET_PLATE`, PIPE→`SEAMLESS_PIPE` (today; open to future pipe groups without code change).
5. Do not merge SHS and RHS group identities themselves. Do not rename technical group identities to satisfy website presentation.

---

# TECHNICAL GROUP VS PUBLIC CATEGORY

Restating PS-P4-P0's confirmed conclusion, which this design does not revisit: `classification.group` (Odoo) / `group_code` (`product_variants.group_code` in DB_PUBLIC) is the correct, stable, already-synced technical/commercial grouping axis. It is not being replaced, renamed, or duplicated.

What changes here is the addition of a **second, coarser, buyer-facing axis** sitting *above* `classification.group`:

```text
classification.group   — commercial/technical identity (Odoo canonical, unchanged)
        ↓ (many groups may map to one category; a group maps to at most one category)
public category         — buyer-facing browsing/navigation identity (NEW)
```

This is a one-directional aggregation, not a replacement. Every existing `group_code`-keyed surface (`/products?group=`, `product_variants.group_code`, the RFQ Launch UoM policy which keys off `groupCode`, `catalog_group_labels`) is untouched. The public category is a presentation-layer grouping concept only — it never becomes the identity of a commercial record, never appears in Odoo pricing/RFQ/UoM logic, and never replaces `group_code` as the stable key anywhere it is already used for something other than buyer-facing browsing.

---

# PUBLIC CATEGORY MODEL

## Odoo model

Recommended: a new, small, standalone model — `steel.public.category` (or the equivalent name matching whichever addon actually owns it, see below). Minimum fields:

| Field | Type | Purpose |
|---|---|---|
| `code` | `Char`, required, unique | Stable machine key (`REBAR`, `BEAM`, `ANGLE`, `CHANNEL`, `BOX_SECTION`, `SHEET_PLATE`, `PIPE`) — never renamed once assigned, matches this codebase's existing "stable code, never the display label" convention (`group_code`, `template_xid`) |
| `name` | `Char`, `translate=True` | Localized display label — Odoo's standard `ir.translation` mechanism, fa/en/ar, exactly parallel to how `classification.group.name` is already resolved per-locale by the same Catalog API |
| `sequence` | `Integer` | Homepage/Header/`/products` display order — the owner's fixed 1–7 sequence lives here, not in website code |
| `active` | `Boolean`, default `True` | Standard Odoo soft-delete/archive field |
| `image` | none in this model | Images remain a Website presentation asset (see IMAGES below) — never stored as a binary in Odoo |

## Group → public category relationship: Many2one, not Many2many — with a discovery caveat

**Logically, this is a Many2one from the group side to the category side**, not a Many2many:

- Every `classification.group` value must resolve to **exactly one** public category (a group can never simultaneously belong to two buyer-facing buckets — that would make `/products?category=X` ambiguous and would contradict the owner's explicit "don't merge SHS/RHS identities, do map both into one card" instruction, which only makes sense if each group has one home).
- A public category may have **zero, one, or many** member groups (`BOX_SECTION` has two today; `ANGLE`/`CHANNEL` have zero; `PIPE` has one today with room to grow).
- This is the textbook shape for `Many2one` placed on the "many" side (the group) pointing at the "one" side (the category) — e.g. `classification_group.public_category_id = fields.Many2one('steel.public.category')`. A `Many2many` would only be correct if a single group legitimately needed to appear under two different public categories at once — no such requirement exists in the owner's decision, and inventing that flexibility now would be unrequested scope.

**Caveat — genuine discovery gate, not assumed away:** `lib/catalog/odoo-api-client.ts`'s own model-boundary comment states the Catalog API v1 controller "reads only `ahanassa.public.catalog.variant`." Nothing in this repository (which contains no server-side Odoo addon source beyond the unrelated `odoo-modules/ahanassa_website_rfq`) confirms that `classification.group` is a real, independently addressable Odoo model with its own table and `id` — it may instead be a computed/denormalized code+name pair the serializer derives from something else (a `Selection` field, a tag, a different backing model entirely). Per `PROJECT_OVERRIDES.md` §3 and `CLAUDE.md` §9, this must be treated as an unconfirmed Odoo-side fact, not guessed:

- **If `classification.group` is a real model:** add `public_category_id` (`Many2one`) directly on it, as above. This is the clean, minimal design.
- **If it is not an independently addressable model** (e.g. a string derived at serialization time with no queryable backing record): the Many2one cannot physically be placed "on" it. The mapping must instead live as its own small association, keyed by the group's stable string `code` rather than by an Odoo record reference — e.g. a `steel.public.category.group.code` child model (`category_id` Many2one to `steel.public.category`, `group_code` Char, unique on `group_code`) attached from the category side. This still expresses the same logical Many2one relationship (one row per group code, `UNIQUE(group_code)` enforcing "at most one category per group"), just physically anchored to the category rather than to a possibly-nonexistent group record.

Both variants produce an identical Website-facing contract (see API CONTRACT below) — this caveat affects only Odoo-internal modeling, not anything the Website consumes. **This must be confirmed against the live Odoo instance/addon source before P1 implementation begins** — it is a discovery gate, not a blocker for freezing this document.

## Addon ownership

No server-side Odoo addon source is present in this repository to confirm placement. Based on the observable `template_xid` namespace already in live use (`ahanassa_marketplace.product_tmpl_*`, confirmed in `docs/integrations/odoo/catalog-v1/`), the most likely correct owner is the same `ahanassa_marketplace` addon that already owns the Public Catalog API v1 controller and its classification concepts — extending it, not creating a second parallel catalog addon. This is a placement recommendation for the Odoo-side implementer to confirm, not a verified fact.

---

# TARGET 7-CATEGORY TAXONOMY

| # | `code` | FA (owner-approved) | EN (owner-approved) | AR | `sequence` | Mapped group(s) today |
|---|---|---|---|---|---|---|
| 1 | `REBAR` | میلگرد | Rebar | *proposed, pending owner review* | 1 | `REBAR` |
| 2 | `BEAM` | تیرآهن | Beams | *proposed, pending owner review* | 2 | `BEAMS` |
| 3 | `ANGLE` | نبشی | Angle Bar | *proposed, pending owner review* | 3 | *(none — no Odoo group yet)* |
| 4 | `CHANNEL` | ناودانی | Channel | *proposed, pending owner review* | 4 | *(none — no Odoo group yet)* |
| 5 | `BOX_SECTION` | قوطی | Box Section | *proposed, pending owner review* | 5 | `SHS`, `RHS` |
| 6 | `SHEET_PLATE` | ورق | Sheet & Plate | *proposed, pending owner review* | 6 | `SHEET_PLATE` |
| 7 | `PIPE` | لوله | Pipe | *proposed, pending owner review* | 7 | `SEAMLESS_PIPE` |

Note on `BEAM` vs `BEAMS`: the owner's public-category code list in this task uses singular `BEAM`; the existing, unrelated `classification.group` code is plural `BEAMS`. These are two different identities in two different axes (public category code vs. technical group code) and are not required to match textually — kept as given, not silently "corrected" to match the group code.

Arabic labels are **not proposed here** — per the task's explicit instruction (§2) and `CLAUDE.md`'s prohibition on inventing approved copy, Arabic translations require dedicated owner/content review before this table can be considered final. FA/EN values above are the owner-approved labels supplied in this task's instructions, transcribed exactly, not re-translated.

---

# ODOO RELATIONSHIP

```text
steel.public.category (code, name[translate], sequence, active)
        ↑ Many2one (one category, many groups)  — OR, if classification.group
        │                                           is not independently addressable,
        │                                           a code-keyed child association
        │                                           anchored on the category side
classification.group (code, name)  — canonical technical grouping, UNCHANGED
```

Enforced invariant: a given `group_code` belongs to at most one `steel.public.category`. `ANGLE`/`CHANNEL` exist as category rows with zero mapped groups — this is expected and intentional (see ANGLE / CHANNEL ACTIVATION below), not an error state.

---

# LOCALIZATION

**Ownership: Odoo, via the model's own `translate=True` `name` field — not a Website-hardcoded map, and not (for this specific concept) a repurposing of `catalog_group_labels`.** This mirrors the architecture PS-P4-P0 already found and endorsed for `classification.group` labels (Odoo-sourced → synced into a small DB_PUBLIC label table → consumed identically by Header/Homepage/`/products`), extended one layer up to the new category concept, and matches this task's explicit instruction that FA/EN/AR category names "should be owned by Odoo/content architecture, not hardcoded independently in Homepage."

Target owner-approved FA/EN labels are recorded in the taxonomy table above, transcribed verbatim from this task's instructions. Arabic requires owner review before publication, per the task's explicit instruction — not written here.

Fallback order when a locale's translation is genuinely missing, matching the existing `catalog_group_labels` precedent exactly (`lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`'s `COALESCE(l.name, pv.group_name)`): requested locale → Odoo's own resolved fallback (its documented `requested → fa → en → ar → neutral` chain) → never a Website-fabricated string.

---

# API CONTRACT

**Additive only — no `v1` → `v2` bump.** The Odoo Public Catalog API v1 (`docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md`) already has an established, deliberately denormalized, code+name-pair-per-classification-axis response shape (`classification: {family, group, form}`). The public category is added as a sibling of that same shape, following the identical pattern:

1. **Variant list/detail responses** (`GET /api/v1/catalog/products`, `GET /api/v1/catalog/products/<xid>`): add a new top-level `public_category: {code, name}` object to each variant, resolved server-side by Odoo from the group→category mapping above. **The Website must never infer `BOX_SECTION` from seeing both `SHS` and `RHS` itself** — this satisfies that requirement directly: Odoo states the public category explicitly, on every variant, exactly like it already states `group`.
2. **`GET /api/v1/catalog/meta`**: add a new `public_categories` array — one entry per category (`code`, per-locale `name` respecting the existing `locale=` param, `sequence`, and the member `group codes` it aggregates) — reusing the existing `/meta` endpoint (already documented as "active-only family/group/form/grade/standard filter metadata") rather than standing up a dedicated new endpoint. This is the authoritative source the Website's own category/group mapping sync reads from (see D1_PUBLIC PROJECTION below) — the Website never hand-maintains the group↔category mapping; it only mirrors what `/meta` reports.
3. **New filter parameter** on `GET /api/v1/catalog/products`: `public_category=<code>`, resolved server-side by Odoo to the OR-set of its member groups — additive, alongside the existing `family`/`group`/`form`/`grade`/`standard` params, none of which change behavior.

Whether variants should carry `public_category.code`/`.name` inline (option A, chosen above) vs. requiring a separate category/meta-only lookup (option B) was evaluated: option A is preferred because it exactly mirrors the existing `family`/`group`/`form` pattern the Website's sync already knows how to consume (one variant-shaped row, no second round-trip needed to resolve a variant's category), and because "the Website must not infer the category from the groups itself" is most robustly satisfied when the category is present on the very row the sync already persists per variant, not only in a separate `/meta` lookup the sync would have to cross-reference by hand.

---

# DB_PUBLIC PROJECTION

**Normalized, three small additive tables** — no existing table is altered destructively, matching this schema's own hard rule (`migrations_public/0002` header: "any future schema change to these tables MUST use an additive pattern... never DROP TABLE again"). Anticipated migration file: `migrations_public/0011_public_categories.sql` (next available number after `0010`; not created by this task).

```sql
-- catalog_public_categories: category identity + default (EN/Odoo-resolved) name + order + activation
CREATE TABLE catalog_public_categories (
  code            TEXT PRIMARY KEY,   -- REBAR, BEAM, ANGLE, CHANNEL, BOX_SECTION, SHEET_PLATE, PIPE
  name            TEXT NOT NULL,      -- Odoo-resolved default/EN label, sync-owned
  sequence        INTEGER NOT NULL,   -- owner's fixed 1..7 homepage/header/listing order
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sync_status     TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'odoo_missing')),
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- catalog_public_category_labels: FA/AR (and EN override) locale labels — mirrors
-- catalog_group_labels (migrations_public/0009) exactly, same sync/fallback idiom.
CREATE TABLE catalog_public_category_labels (
  public_category_code  TEXT NOT NULL REFERENCES catalog_public_categories (code),
  locale                TEXT NOT NULL CHECK (locale IN ('fa', 'en', 'ar')),
  name                  TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  PRIMARY KEY (public_category_code, locale)
);

-- catalog_public_category_groups: the group -> category membership, sourced verbatim
-- from the Catalog API's /meta#public_categories[].group_codes — never hand-authored
-- on the website side. UNIQUE(group_code) enforces "a group belongs to at most one
-- public category" at the D1 level too, not only by Odoo-side convention.
CREATE TABLE catalog_public_category_groups (
  public_category_code  TEXT NOT NULL REFERENCES catalog_public_categories (code),
  group_code             TEXT NOT NULL,
  PRIMARY KEY (public_category_code, group_code)
);
CREATE UNIQUE INDEX uq_catalog_public_category_groups_group_code ON catalog_public_category_groups (group_code);
```

**Deliberately not adding** `public_category_code`/`public_category_name` columns directly onto `product_variants` (unlike the existing `group_code`/`group_name` denormalization). Considered and rejected: it would be a second, independently-synced copy of the same group→category fact already captured in `catalog_public_category_groups`, with a real drift risk if the two ever went out of sync (this schema's own stated "do not invent parallel mappings" discipline). Resolving a variant's category is a cheap join against a 7-row table already indexed by `group_code`; the extra column would trade a negligible query cost for a real maintenance liability. This can be revisited in P4 implementation if a real performance measurement shows it is needed — not assumed here.

`sequence` intentionally lives on `catalog_public_categories`, not as a website-only ordered constant — this is the one piece PS-P4-P0 flagged as not yet having a natural home ("no dedicated navigation-sequence field exists for Catalog groups... a simple code-level ordered constant is the smallest solution"); for the *public category* layer specifically, a real synced field is preferred over a hardcoded array because the owner may reorder the 7 categories in the future without a code deploy, and because Header/Homepage/`/products` should never risk disagreeing on order if two different website-owned constants existed.

---

# ROUTING

**Additive query parameter, existing routes untouched.**

- `CATALOG_FILTER_QUERY_KEYS` (`lib/catalog/catalog-filters.ts`) gains one new key: `category`.
- `parseCatalogFilterParams` gains `categoryCode` alongside the existing five fields — purely additive to the interface.
- Resolution: `/products?category=BOX_SECTION` looks up `catalog_public_category_groups` for `public_category_code = 'BOX_SECTION'` → `['SHS', 'RHS']` → builds a `group_code IN ('SHS', 'RHS')` condition. This requires one new condition *shape* not currently expressible by `TemplateFilterCondition` (today: `{column, value}`, a single `=` comparison) — an additive `{column, valueIn: string[]}` variant, compiled to a parameterized `IN (...)` clause instead of `= ?`. `buildTemplateFilterConditions`/existing single-group callers are unaffected; this is a new code path, not a modification of the existing one.
- `/products?group=SHS` and every other existing single-dimension filter (`family`/`group`/`form`/`grade`/`standard`) **remain valid, unchanged, and untouched** — confirmed by design: `category` is parsed into a new field, never rewritten into or over `groupCode`.
- Within `/products?category=BOX_SECTION`, the existing `?group=` axis remains available as a secondary/deeper filter (e.g. `/products?category=BOX_SECTION&group=SHS`) using the unmodified existing mechanism — no new capability needed there, both params can coexist and AND together (category narrows to the member-group set, group narrows further within it).

---

# HEADER

Header's Products dropdown currently calls `listHeaderProductFamilyShortcuts(locale)` (`lib/catalog/editorial-repository.ts`), which queries `group_code`/`group_name` directly. This is replaced by a call to the new function described below (HOMEPAGE section), reading `catalog_public_categories` instead of raw `group_code`. `MAX_HEADER_PRODUCT_SHORTCUTS = 8` remains a valid safety cap (7 public categories ≤ 8), unchanged.

---

# HOMEPAGE

**One new repository function is the single source for Header, Homepage, and `/products` top-level category browsing** — satisfying the task's explicit "avoid Header taxonomy A / Homepage taxonomy B / Products taxonomy C" requirement:

```ts
// lib/catalog/editorial-repository.ts (new)
interface PublicCategoryShowcaseEntry {
  code: string;
  name: string;          // locale-resolved: catalog_public_category_labels[locale] -> catalog_public_categories.name fallback
  sequence: number;
  href: string;           // `/products?category=${code}`
  isLive: boolean;         // true only if >=1 currently publication-eligible variant exists among ALL member groups
}
async function listPublicCategoryShowcase(locale: Locale): Promise<PublicCategoryShowcaseEntry[]>
```

Query shape: `catalog_public_categories` LEFT JOIN `catalog_public_category_labels` (locale override, same `COALESCE` fallback idiom as the existing group-label query) LEFT JOIN `catalog_public_category_groups` → for `isLive`, an `EXISTS` against `product_variants`/`catalog_products` filtered by `group_code IN (member groups)` AND the same `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` gate every other public read already uses (never a second, divergent eligibility rule). Ordered by `sequence` — never by a translated name, for the same reason `listHeaderProductFamilyShortcuts` already orders by `group_code` and not `group_name` (stable order must not vary by locale).

**Homepage card content, exactly per the task's constraint:** localized public category name, one representative image, one link to `/products?category=<code>`. No template title, grade, standard, variant, stock, price, or supplier text — the Homepage Category Showcase is categorically a different, smaller view-model than today's `HomepageProductCandidate` (which is template-centric and carries `slug`/`summary`/spec fields that have no equivalent at the category level).

---

# PRODUCTS LISTING

`app/[locale]/products/page.tsx` gains the `category` filter as described under ROUTING. No change to the detail page (`app/[locale]/products/[slug]/page.tsx`) or to the hybrid template-primary SEO model (`docs/CATALOG_PUBLIC_ROUTES.md`) — a public category is a listing-level filter only, never itself an indexable entity with its own dedicated SEO page in this design (no `product_seo_contents` row, no canonical URL of its own beyond the plain filtered listing URL). Whether a category deserves its own indexable landing page (title/meta description/structured data per category) is a genuinely separate SEO decision, out of this design's scope — flagged under OPEN QUESTIONS.

---

# ANGLE / CHANNEL ACTIVATION

Both exist as real `catalog_public_categories` rows (`active = 1`, correct `sequence`, correct FA/EN name) from day one — their **identity is configured, never faked or deleted**. Zero rows exist in `catalog_public_category_groups` for either, because zero Odoo groups exist for either (PS-P4-P0, confirmed live). `listPublicCategoryShowcase`'s `isLive` predicate therefore evaluates `false` for both (the `EXISTS` against an empty member-group set can never match), and **both Header and Homepage render only the `isLive = true` subset** — so ANGLE/CHANNEL are fully absent from both surfaces today, without any special-cased "if code == ANGLE, skip" logic anywhere. The moment a real Odoo group is added and mapped into `catalog_public_category_groups` (an Odoo-side + one sync cycle change, zero Website code change), the identical query starts returning `isLive: true` for that category automatically. This is the same idiom already proven in this codebase for template/variant publication eligibility (`TEMPLATE_PUBLICATION_WHERE_CONDITIONS`), applied one level up — not a new mechanism invented for this case.

No fake Angle/Channel catalog data is created anywhere in this design, matching the task's explicit prohibition.

---

# BOX_SECTION

One `catalog_public_categories` row (`code = 'BOX_SECTION'`), two `catalog_public_category_groups` rows (`SHS`, `RHS`). Header and Homepage render exactly one قوطی card. `SHS`/`RHS` remain fully intact as their own `classification.group` identities — nothing about their Odoo records, `group_code` values, or existing `/products?group=SHS` / `/products?group=RHS` behavior changes. The combination surfaces only at the new public-category aggregation layer, never by merging or renaming the underlying groups.

---

# PIPE

One `catalog_public_categories` row (`code = 'PIPE'`), currently one `catalog_public_category_groups` row (`SEAMLESS_PIPE`). Adding a future welded/galvanized/other pipe group later is a two-step **content/Odoo operation** (map the new group to `PIPE` in Odoo → next sync cycle inserts the new row into `catalog_public_category_groups`) with **zero Homepage/Header/`/products` code change**, satisfying the task's explicit "must not require Homepage code modification" requirement directly — because `isLive`/membership is queried dynamically from the join table, never hardcoded to "exactly one group."

---

# IMAGES

Extend `lib/catalog/media-registry.ts`'s existing, already-documented resolution hierarchy (`resolveCatalogMedia`) with **one new tier**, inserted between the existing per-template override and the existing group default:

```text
1. per-template override        (unchanged, TEMPLATE_XID_IMAGE_OVERRIDES)
2. NEW: public-category default  (PUBLIC_CATEGORY_DEFAULT_IMAGES, keyed by public category code)
3. group default                 (unchanged, GROUP_DEFAULT_IMAGES)
4. family default                (unchanged, FAMILY_DEFAULT_IMAGES)
5. generic fallback              (unchanged, steel-placeholder.svg)
```

This is the only mechanism by which the two already-existing, already-unused, already-committed assets PS-P4-P0 found (`angle-bar.png`, `u-channel.png`) can ever be wired in at all — `ANGLE`/`CHANNEL` have no `group_code` to key a group-tier mapping on, so they can only ever be reached via a category-tier key. Proposed (not applied by this task):

```ts
const PUBLIC_CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  ANGLE: `${PRODUCTS_DIR}/angle-bar.png`,
  CHANNEL: `${PRODUCTS_DIR}/u-channel.png`,
  // REBAR / BEAM / SHEET_PLATE / PIPE may also be set here directly once the
  // Homepage Category Showcase exists, superseding their current group-tier
  // resolution for the category card specifically — group-tier entries stay
  // unchanged for template/variant-level media resolution elsewhere.
};
```

`BOX_SECTION` has **no ready asset** among the 13 existing protected photos (confirmed, PS-P4-P0) and is not assigned one here — it falls through to the generic fallback until a real, reviewed photo is sourced, per the task's explicit "do not generate an image in this task." No image binary is stored in Odoo; images remain a Website-owned, code-mapped presentation asset exactly as today.

---

# SERVICES BOUNDARY

Unchanged, independently reconfirmed by PS-P4-P0 in the same audit pass this design builds on: `lib/processing/` (`public_processing_groups`, its own sync/repository/Header dropdown/`/services` route) has no overlap with, dependency on, or shared table with anything in this design. Nothing in this document touches Services.

---

# MIGRATION PLAN

| Layer | Change | Type |
|---|---|---|
| Odoo schema | New `steel.public.category` model (code, translate name, sequence, active) + group→category mapping (Many2one or code-keyed association, pending the discovery gate above) | New model — requires an approved Odoo module change, addon ownership TBD |
| Odoo data | Seed 7 rows, sequence 1–7, FA/EN names per the taxonomy table; map `REBAR`→`REBAR`, `BEAMS`→`BEAM`, `SHS`+`RHS`→`BOX_SECTION`, `SHEET_PLATE`→`SHEET_PLATE`, `SEAMLESS_PIPE`→`PIPE`; leave `ANGLE`/`CHANNEL` unmapped | Content/config, owner-reviewed |
| Odoo data | Arabic translations for all 7 names | Content, owner review required, not written here |
| Catalog API v1 | Additive `public_category` object on variant responses; additive `public_categories` array on `/meta`; additive `public_category` filter param | Backward-compatible, no version bump |
| D1 / DB_PUBLIC | New migration `0011_public_categories.sql` (not created by this task): `catalog_public_categories`, `catalog_public_category_labels`, `catalog_public_category_groups` | Additive-only, matches the schema's own DROP-TABLE prohibition established in `0002`'s header |
| Sync | New sync runner (mirrors `lib/catalog/group-label-sync-runner.ts`'s existing pattern) pulling `/meta#public_categories` into the three new tables | New, small, additive job — must actually be scheduled/run, not just implemented (PS-P4-P0 found the precedent group-label sync built but never executed — do not repeat that gap silently) |
| Repository | `listPublicCategoryShowcase(locale)` in `lib/catalog/editorial-repository.ts`; `category`/`categoryCode` additions to `lib/catalog/catalog-filters.ts` (`CATALOG_FILTER_QUERY_KEYS`, `CatalogFilterInput`, a new `valueIn` condition shape) | New function + additive interface fields |
| Header | `components/layout/SiteHeader.tsx` (and/or `header-nav-disclosure.tsx`) swapped to call `listPublicCategoryShowcase` instead of `listHeaderProductFamilyShortcuts` | Swap, same call shape (code/name/href list) |
| Homepage | New/adapted component consuming `listPublicCategoryShowcase`, replacing `components/home/product-showcase.tsx`'s current template-centric role for the category section | **IA-protected change — see OPEN QUESTIONS #3** |
| `/products` listing | `app/[locale]/products/page.tsx` reads `category` via extended `parseCatalogFilterParams` | Additive |
| Angle/Channel Product Master | Real Odoo `product.template`/`product.product` rows for these two product lines | Commercial/Odoo decision, outside Website scope entirely |

---

# BACKWARD COMPATIBILITY

Confirmed preserved by this design, item by item:

- `classification.group` (Odoo) — unchanged, no field renamed or removed, no group merged with another.
- `/products?group=` — untouched code path (existing single-value `=` condition), remains valid for deep/technical filtering exactly as the task requires.
- Existing Product Master identities (`template_xid`, `product_variant_xid`) — untouched; no identity scheme changes.
- Variant XIDs — untouched.
- Catalog sync behavior for every existing column (`group_code`, `group_name`, `family_code`, dimensions, weights, UoM strings, etc.) — untouched; only new tables/columns are added, nothing existing is altered or dropped.
- `catalog_group_labels` and its sync (`group-label-sync-runner.ts`) — untouched, remains the correct mechanism for `classification.group` labels specifically; the new `catalog_public_category_labels` is a sibling, not a replacement.
- Services architecture (`lib/processing/`) — untouched, confirmed zero overlap.
- Price Strip, Evidence, RFQ architecture — untouched; nothing in this design touches `DB_OPS`, `rfq_*` tables, the RFQ API v1 handoff, the Price Strip provider, or Evidence content. `RfqCatalogSelection.groupCode` (the field the RFQ Launch UoM policy keys off, `docs/CATALOG_RFQ_INTEGRATION.md`) is unaffected — it continues to read `product_variants.group_code` directly, never the new public category.

---

# IMPLEMENTATION PHASES

Adjusted from the task's suggested sequence based on actual dependency analysis (the Odoo-side discovery gate must close before the model can be built; the API contract must exist before any sync can be written; translations must exist before seed data is real rather than placeholder):

- **P1 — Odoo discovery + schema.** Confirm whether `classification.group` is an independently addressable model (closes the Many2one-vs-code-keyed-association question above); create `steel.public.category` in the confirmed-correct addon; wire the group→category relationship.
- **P2 — Odoo seed + translations.** Seed the 7 rows with sequence 1–7 and the owner-approved FA/EN names from this document; map the 5 currently-real groups; leave ANGLE/CHANNEL unmapped; commission and review Arabic translations.
- **P3 — Catalog API v1 additive contract.** `public_category` on variant responses, `public_categories` on `/meta`, `public_category` filter param — verified against a real staging Odoo response before any Website sync is written against it (matching this project's established "verify live, never assume the documented shape is the real shape" discipline, per `CAT-PROV-P0`/DAR-034's own precedent).
- **P4 — DB_PUBLIC migration + sync.** `0011_public_categories.sql`; new sync runner; run it (not just implement it) against staging, verify row counts match Odoo's `/meta` exactly, then production — mirroring `CAT-PROV-P0`'s field-by-field verification methodology.
- **P5 — Website repository/category filter.** `listPublicCategoryShowcase`, `catalog-filters.ts` additions, `/products?category=` wired and tested against real synced data, `/products?group=` regression-checked to confirm zero behavior change.
- **P6 — Header migration to public categories.** Swap Header's data source; visually verify fa/en/ar, RTL/LTR, and the `MAX_HEADER_PRODUCT_SHORTCUTS` cap still holds.
- **P7 — Homepage Category Showcase.** Requires the separate IA authorization in OPEN QUESTIONS #3 before this phase starts, independent of everything above being ready.
- **P8 — Angle/Channel Product Master population.** Owner/Odoo-side commercial decision, entirely outside Website scope and outside this document's authority to schedule.
- **P9 — Staging acceptance.** Full QA pass (SEO, accessibility, fa/en/ar + RTL/LTR, cache, performance) per this project's existing release gates, before any production rollout of P5–P7.

---

# OPEN QUESTIONS

1. **Is `classification.group` an independently addressable Odoo model, or a derived code+name pair with no backing record?** Blocks the exact Odoo-side implementation shape of the group→category mapping (Many2one directly on it, vs. a code-keyed association anchored on the category). Requires Odoo module/addon-source inspection this task's read-only scope did not include.
2. **Which Odoo addon should own `steel.public.category`?** `ahanassa_marketplace` is the best-evidenced guess (owns the existing `template_xid` namespace and the Catalog API controller) but is not confirmed — no server-side addon source for it exists in this repository.
3. **Swapping the Homepage's product section from template-centric (current `product-showcase.tsx`) to category-centric is itself a protected Information-Architecture change**, not a mechanical data-source swap — `DO_NOT_CHANGE.md` §14 requires explicit authorization before "add, remove, reorder, merge, or split approved... conversion journeys," and the current Homepage Product Showcase is an approved, live section. This design makes the swap technically ready (P1–P6) but does **not** itself authorize P7; that requires a separate, explicit owner sign-off distinct from this architecture freeze.
4. **Suppressed-category presentation:** should a not-yet-`isLive` category (today: ANGLE, CHANNEL) be fully absent from Header/Homepage (this design's default), or rendered as a disabled/"coming soon" card? The task's §8 only specifies "not exposed as a live clickable category" — full suppression satisfies that literally; a disabled-state UI pattern would be new UI not currently in the approved design system and is not decided here.
5. **BOX_SECTION dedicated image:** no ready asset exists; sourcing one is a content task, not resolved by this document.
6. **Category-level SEO/indexability:** whether a public category should ever get its own indexable landing page (dedicated title/meta description/structured data), beyond being a plain `/products?category=` filter, is unresolved and out of this design's scope — flagged for a future SEO-specific pass if the owner wants it.
7. **Exact migration number `0011`:** assumes no other migration lands first; confirm the next free number at actual implementation time rather than assuming this document is current by then.

---

# PRODUCTION SAFETY

No Odoo write performed. No D1 write performed. No website runtime code changed. No migration file created or executed. No deploy performed. No secret read, requested, or exposed. `01-sources/`, `logo/`, `design-reference/` untouched. `main` untouched. Working tree left clean apart from this new file.

---

**End of `PUBLIC_WEBSITE_CATEGORY_ARCHITECTURE_V1.md`**
