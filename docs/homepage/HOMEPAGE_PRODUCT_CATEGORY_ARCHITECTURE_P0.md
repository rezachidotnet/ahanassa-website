# Homepage Product Category Architecture Audit (PS-P4-P0)

Date: 2026-09-14
Task type: read-only architecture/data audit. No code change, no database write, no deploy, no migration.

---

# RESULT

**C — CATEGORY TAXONOMY MAPPING GAP — OWNER/ODOO ARCHITECTURE DECISION REQUIRED.**

The canonical category axis already exists (`classification.group` in Odoo / `group_code` in DB_PUBLIC), is already fully synced for every live product, and is already reused consistently by the Header and `/products` filtering — this part of the architecture is solid and needs no new mechanism. However, **2 of the owner's 7 target categories (نبشی / Angle, ناودانی / Channel) have zero representation anywhere in the live Odoo Product Master** — not hidden, not inactive, simply not modeled yet. This is a genuine taxonomy gap at the commercial/Odoo level, not a website defect, and it requires an owner decision (add the products to Odoo, or launch the Homepage category showcase with 5 of 7 initially) before PS-P4-P1 can implement a complete 7-category Homepage. Separately, FA/AR localized labels for the groups that *do* exist are not yet populated anywhere (a real, fixable, website-side data gap, unrelated to the missing-taxonomy issue).

---

# ODOO CANONICAL TAXONOMY

Read from implementation (`lib/catalog/odoo-api-client.ts`, the Catalog API's own model boundary comment: "reads only `ahanassa.public.catalog.variant`"), not from naming alone. The API exposes three distinct classification layers plus two non-category attributes:

| Axis | Purpose | Cardinality (live) | Examples | Stability | Suitable as public Website category axis? |
|---|---|---|---|---|---|
| `classification.family` | Broadest commercial grouping | 4 (`FLAT_PRODUCTS`, `HOLLOW_SECTIONS_PROFILES`, `LONG_PRODUCTS`, `PIPES_TUBES`) | "Long Products" contains both Rebar and Beams | Very stable, rarely changes | **Too coarse** — would merge distinct owner categories (e.g. میلگرد and تیرآهن are both `LONG_PRODUCTS`) |
| `classification.group` | The commercial product-family concept a buyer actually thinks in | 6 (`BEAMS`, `REBAR`, `RHS`, `SEAMLESS_PIPE`, `SHEET_PLATE`, `SHS`) | "Rebar", "Beams", "Sheet & Plate" | Stable — same axis the Header/`/products` filter already key on | **Yes — this is the correct axis.** Already the Website's own established category concept. |
| `classification.form` | Physical/technical shape variant within a group | 9 (`HOT_ROLLED_PLATE`, `HOT_ROLLED_SHEET`, `INP`, `IPE`, `PLAIN_REBAR`, `RHS_FORM`, `RIBBED_REBAR`, `SEAMLESS_PIPE_FORM`, `SHS_FORM`) | `INP`/`IPE` are both under group `BEAMS` | Stable but too granular/technical for a buyer-facing category label | **No** — this is a sub-classification a buyer wouldn't use to browse; e.g. splitting Beams into "INP" and "IPE" cards would confuse the owner's plain "تیرآهن" concept |
| `grade` | Material grade (e.g. S355JR, Aj340) | Many, per-template | Not a category at all — a technical/commercial spec | N/A | **No** — orthogonal to category, already correctly excluded (CAT-PROV-P0 audit) |
| `standard` | Manufacturing standard (e.g. EN 10029) | Many, per-template | Not a category at all | N/A | **No** |

**Conclusion, not assumed from naming: `classification.group` (Odoo) / `group_code` (DB_PUBLIC) is the correct, already-established Website-facing category axis.** It is exactly the axis the Header's Products dropdown and `/products` filtering already use — confirmed by reading the code (`lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`, `lib/catalog/catalog-filters.ts`), not by naming similarity alone.

---

# LIVE ODOO CATEGORY INVENTORY

Read live, read-only, via the same public, unauthenticated Catalog API v1 used in `CAT-PROV-P0` (`GET https://odoo.ahanassa.com/api/v1/catalog/products?group=<code>`, `auth=public`, no credential). `locale=fa|en|ar` was tested explicitly on both `/meta` and `/products` — **it has no effect on `classification.group.name`/`.family.name` for any code checked; the identical English string is returned regardless of requested locale.** This is not a bug in this audit or in the client: `docs/integrations/odoo/catalog-v1/AHANASSA_MARKETPLACE_PHASE5B_PUBLIC_CATALOG_API_REPORT.md` itself states "Requested→Persian→English→Arabic→neutral fallback passed... **Identity values remain untranslated**" — the fallback mechanism works correctly, it just has nothing but the English value to fall back to for these specific classification codes today.

| `group_code` | EN label (live) | FA label | AR label | Templates | Variants |
|---|---|---|---|---|---|
| `REBAR` | Rebar | **none** | **none** | 4 (`rb_aj340`, `rb_aj400`, `rb_aj500`, `rb_s240`) | 45 |
| `BEAMS` | Beams | **none** | **none** | 2 (`bm_inp`, `bm_ipe`) | 39 |
| `SHS` | SHS | **none** | **none** | 1 (`pf_shs`) | 29 |
| `RHS` | RHS | **none** | **none** | 1 (`pf_rhs`) | 38 |
| `SHEET_PLATE` | Sheet & Plate | **none** | **none** | 4 (`sh_hr_s235jr_plate`, `sh_hr_s235jr_sheet`, `sh_hr_s355jr_plate`, `sh_hr_s355jr_sheet`) | 74 |
| `SEAMLESS_PIPE` | Seamless Pipe | **none** | **none** | 1 (`pp_smls_a106_gr_b`) | 12 |
| **Total** | | | | **13** | **237** |

Matches this repository's own previously-verified total catalog size (13 templates / 237 variants) exactly — confirmed live, not assumed.

**Searched for and confirmed absent, live** (no group code, no product, no free-text match): angle/channel/L-profile/U-profile concepts. Tried `group=ANGLE`, `group=CHANNEL`, `group=UPN`, `group=UNP`, `group=L_PROFILE`, `group=ANGLE_PROFILE` (all returned `HTTP 200`, `total: 0` — valid empty filters, not invalid-parameter errors) and free-text `q=angle`/`q=channel` (both `total: 0`). **No angle-bar or channel-bar product exists anywhere in the live Odoo Product Master today**, active or otherwise findable through this API.

---

# OWNER 7-CATEGORY MAPPING

| Owner category (FA) | Meaning | Odoo `group_code` match | Status |
|---|---|---|---|
| میلگرد | Rebar | `REBAR` | **Mapped** — 4 templates, 45 variants, real |
| تیرآهن | I-beam / structural beam | `BEAMS` | **Mapped** — 2 templates (INP, IPE forms), 39 variants, real |
| نبشی | Angle bar | **none** | **NOT MAPPED — no Odoo data exists at all** |
| ناودانی | Channel bar | **none** | **NOT MAPPED — no Odoo data exists at all** |
| قوطی | Box / hollow section (square or rectangular) | `SHS` **and** `RHS` (two distinct groups, not one) | **Mapped, but spans 2 groups** — the owner's single Persian concept covers both; a UI/data decision is needed on whether قوطی is one combined category card or two |
| ورق | Sheet/plate | `SHEET_PLATE` | **Mapped** — 4 templates, 74 variants, real |
| لوله | Pipe (generic) | `SEAMLESS_PIPE` only | **Mapped, but partial** — only the seamless variety exists in Odoo; other pipe types (welded, galvanized, etc.) that "لوله" could generically imply are not modeled |

**Summary: 5 of 7 fully mapped to real live data (with 1 of those 5 — قوطی — spanning 2 Odoo groups, and 1 of those 5 — لوله — only partially representative of the generic concept); 2 of 7 (نبشی, ناودانی) have zero Odoo representation.** Not invented, not assumed — every group code above was queried live in this task.

---

# DB_PUBLIC PROJECTION

| Concern | Odoo source | D1 field/table | Sync mechanism | Localization mechanism |
|---|---|---|---|---|
| Category identity | `classification.group.code` | `product_variants.group_code` | `lib/catalog/sync-runner.ts` → `lib/catalog/repository.ts`/`sync-sql.ts` (main catalog sync, already running — confirmed fully synced, 237/237 variants, `CAT-PROV-P0`) | N/A (code, not a label) |
| Category EN/live label | `classification.group.name` | `product_variants.group_name` | Same main catalog sync | None needed — Odoo's own English value passes straight through and is fully populated today |
| Category FA/AR localized label | Would be `classification.group.name` requested with `locale=fa`/`ar`, **if Odoo had a translation** | `catalog_group_labels` (`group_code`, `locale`, `name`) — schema exists (`migrations_public/0009_catalog_group_labels.sql`), unique index `(group_code, locale)` | `lib/catalog/group-label-sync-runner.ts` → `lib/catalog/group-label-sync.ts#fetchGroupLabelsForLocale` — **implemented, never run**: `SELECT COUNT(*) FROM catalog_group_labels` → **0 rows**, confirmed live, staging, this task | Designed for exactly this — currently empty because (a) the sync has never been executed, and (b) even if executed today, it would write identical English text into the `fa`/`ar` rows too, since Odoo has no real translation to return (see LIVE ODOO CATEGORY INVENTORY above) |
| Category display order (for a Homepage-specific 7-category sequence) | No equivalent Odoo field | No existing D1 table | **Does not exist yet** | N/A |

`catalog_products`/`product_variants` were independently re-confirmed live in this task (`SELECT group_code, group_name, family_code, family_name, COUNT(DISTINCT product_id), COUNT(*) FROM product_variants GROUP BY group_code, family_code`) — the 6-group, 13-template, 237-variant breakdown above is read directly from staging D1, matching live Odoo exactly (consistent with `CAT-PROV-P0`'s zero-mismatch finding, extended here to the full catalog rather than just the 3 pilot templates).

---

# HEADER TAXONOMY REUSE

**Yes, directly reusable, already proven — no second parallel category system needed.** `lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts` already:

1. Queries `product_variants.group_code`/`group_name` (with a `LEFT JOIN catalog_group_labels` for a locale-specific override, falling back to `group_name` when no label row exists — exactly the mechanism a Homepage Category Showcase should reuse verbatim).
2. Links to `/products?group=<code>` — confirmed live in `PS-P3`'s staging deployment (`<a href="/products?group=REBAR">Rebar</a>` etc.).
3. Is scoped to groups with at least one currently publication-eligible template (`TEMPLATE_PUBLICATION_WHERE_CONDITIONS`), so it can never link to an empty category.

**Recommendation: the Homepage Category Showcase should query the identical `group_code`/`group_name`/`catalog_group_labels` combination**, not invent a second lookup path. The only genuinely new piece of code needed is a Homepage-specific *aggregation* (one row per group, not one row per template) and a *display-order* concept (see REQUIRED RECONCILIATION).

---

# SERVICES BOUNDARY

**Confirmed: Product categories ≠ Services — fully separate domain, fully separate projection, no overlap found.**

- Services source: `lib/processing/` (`public_processing_groups` table, `migrations_public/0007_processing_groups.sql`) — a completely distinct Odoo Processing Domain projection, distinct sync path (`lib/processing/sync-runner.ts`), distinct repository (`lib/processing/public-repository.ts`), distinct Header dropdown (Services), distinct route (`/services`).
- No code path was found that merges or could accidentally merge Product `group_code` values with Processing group data — they are different tables with different schemas and different sync orchestrators.
- No frozen Homepage document (`docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md`) mentions Services at all — confirmed by direct search (zero matches). **Services has no Homepage ownership today and this audit does not propose creating one.**
- **Recommendation, not a redesign: Services should remain Header + `/services` only.** The Homepage Product Showcase (or its future Category Showcase) must continue to source exclusively from the Catalog projection (`catalog_products`/`product_variants`/`catalog_group_labels`), never from `public_processing_groups`.

---

# ROUTING CONTRACT

**Already fully implemented — no new route needed.** `lib/catalog/catalog-filters.ts#CATALOG_FILTER_QUERY_KEYS = ["family", "group", "form", "grade", "standard"]`, parsed by `parseCatalogFilterParams`, consumed by `getPublishedCatalogProducts(locale, { groupCode })` (`v.group_code = ?` in the actual SQL — verified by reading the query, not assumed). `/products?group=<code>` is the exact, already-live, already-parser-verified canonical target for every one of the 5 mapped owner categories:

| Owner category | Canonical target |
|---|---|
| میلگرد | `/products?group=REBAR` |
| تیرآهن | `/products?group=BEAMS` |
| قوطی | `/products?group=SHS` and/or `/products?group=RHS` (two links, or a not-yet-existing combined filter — see DATA GAPS) |
| ورق | `/products?group=SHEET_PLATE` |
| لوله | `/products?group=SEAMLESS_PIPE` |
| نبشی / ناودانی | **No route possible yet — no group code exists to filter by** |

---

# LOCALIZATION

**Preferred architecture (Odoo canonical identity → DB_PUBLIC localized labels → Website) already exists as designed — it is simply unpopulated.** No Homepage-side hardcoded translation should be introduced; that would duplicate `catalog_group_labels`' exact purpose and drift from it over time (the Header's own NAV-P1 fix explicitly rejected this approach already).

- **EN labels: READY.** Odoo's own English `group.name` is real, live, and already fully synced into `product_variants.group_name` for every group — no gap.
- **FA labels: DATA GAP.** `catalog_group_labels` has 0 rows; even running the existing sync today would not produce real Persian text, because Odoo itself has none for these classification codes (see LIVE ODOO CATEGORY INVENTORY). Closing this gap requires either (a) Odoo-side translation entry for `classification.group` records, then running the existing sync, or (b) a deliberate, curated one-time population of `catalog_group_labels` with owner-approved Persian text via the existing `upsertCatalogGroupLabels` write path — an editorial/content decision, not a code change.
- **AR labels: DATA GAP**, identical situation to FA.

---

# CATEGORY IMAGES

Audited `lib/catalog/media-registry.ts` (`GROUP_IMAGE` map) and `public/images/products/` directly (13 real image files on disk):

| Owner category | Mapped Odoo group(s) | Image registry status | Asset file exists? |
|---|---|---|---|
| میلگرد | `REBAR` | **Mapped** — `rebar.png` | Yes |
| تیرآهن | `BEAMS` | **Mapped** — `beams.png` | Yes |
| ورق | `SHEET_PLATE` | **Mapped** — `sheet-plate.png` | Yes |
| لوله | `SEAMLESS_PIPE` | **Mapped** — `pipe.png` | Yes |
| قوطی | `SHS`, `RHS` | **Not mapped** — both groups fall through to the generic fallback (`steel-placeholder.svg`) today, by the registry's own explicit, documented design ("no dedicated photo... intentionally fall through") | No dedicated box/hollow-section image found among the 13 files |
| نبشی | (none — no Odoo group) | Not wired into the registry (no group code to key on) | **Yes — `angle-bar.png` already exists on disk, unused** |
| ناودانی | (none — no Odoo group) | Not wired into the registry | **Yes — `u-channel.png` already exists on disk, unused** |

**Notable finding: real image assets for نبشی (`angle-bar.png`) and ناودانی (`u-channel.png`) already exist in the repository, unused and unmapped** — apparently prepared in anticipation of the owner's known 7-category intent, ahead of the Odoo data existing. No image was generated or fabricated in this audit; both files were already present. **قوطی has no equivalent ready asset** and would need one sourced/created before it could show a dedicated (non-generic) image.

---

# CURRENT HOMEPAGE IMPLEMENTATION

`app/[locale]/page.tsx` → `lib/catalog/editorial-repository.ts#listHomepageProductCandidates(locale)` → `components/home/product-showcase.tsx`. This is **template-centric**, not category-centric, by design: it selects individual `catalog_products` rows (gated by `product_seo_contents` per-locale approval + `homepage_product_rank.show_on_homepage`), ranks them, and renders one card per **product template** (e.g. "Ribbed Rebar Aj340 (A2)"), linking to `/products/{slug}` (a template detail page) — never a group/category concept at all. This is exactly why it currently shows 3 individual products rather than 7 category cards: **the entire data path, from query to component to link target, operates one level below where a category concept exists.**

---

# REQUIRED RECONCILIATION

To move from template cards to category cards, every one of the following needs to change (not implemented in this task):

1. **Query/repository:** a new function (e.g. `listHomepageCategoryShowcase(locale)`) that aggregates DISTINCT `group_code`/`group_name` (LEFT JOIN `catalog_group_labels` for the locale override, mirroring `listHeaderProductFamilyShortcuts`'s existing pattern exactly) among currently publication-eligible variants — a fundamentally different shape from `listHomepageProductCandidates`, which returns template rows.
2. **View-model:** a new type (e.g. `HomepageCategoryCandidate { code, name, image, href }`) — distinct from `HomepageProductCandidate` (which carries `templateXid`, `slug`, `summary`, etc., none of which a category card has).
3. **Component:** either a new component or a materially adapted `ProductShowcase` — a category card shows a group name + representative image + a link to a filtered `/products` listing, never a template detail page, never a per-item summary/spec.
4. **Image mapping:** reuse the existing `media-registry.ts` `GROUP_IMAGE` map as-is for the 4 already-covered groups; a decision is needed for قوطی (no image yet) and, once Odoo data exists, wiring `angle-bar.png`/`u-channel.png` in for نبشی/ناودانی.
5. **Routing:** no change needed — `/products?group=<code>` already works exactly as required.
6. **Category display order:** the owner's 7-category list has a specific intended sequence (میلگرد, تیرآهن, نبشی, ناودانی, قوطی, ورق, لوله) that does not correspond to any existing field — a new ordering concept (a simple code-level ordered constant is the smallest solution; a dedicated table is a larger, not-yet-justified option) needs to be decided in PS-P4-P1, not this audit.
7. **Missing-category handling:** a decision on whether to render only the 5 currently-mappable categories, or defer the whole Category Showcase until all 7 exist, or show a fewer-than-7 grid gracefully (mirroring the existing Product Showcase's own "fewer cards than the max" composition rules) — a product/content decision, not an engineering one.

---

# TARGET ARCHITECTURE

```
Odoo classification.group (canonical product taxonomy, already exists)
  → lib/catalog/sync-runner.ts (main catalog sync, already running, already complete)
  → DB_PUBLIC: product_variants.group_code/group_name (already fully populated, 237/237)
  → lib/catalog/group-label-sync-runner.ts (already implemented, never run) → catalog_group_labels (FA/AR overrides, once real translations exist)
  → NEW: listHomepageCategoryShowcase(locale) (aggregation query, not yet built)
  → NEW: Homepage Category Showcase component (not yet built)
  → /products?group=<code> (already implemented, already parser-verified)
  → catalog_products (template) → product_variants (variant) — unchanged, existing detail-page path

Services (lib/processing/, public_processing_groups) — fully separate branch, Header + /services only, never touches the path above.
```

---

# DATA GAPS

1. **نبشی (Angle) and ناودانی (Channel): no Odoo Product Master data at all.** Requires an owner/Odoo-side commercial decision (add these product lines to Odoo) before they can become real category cards — not something the website sync can fix.
2. **قوطی (Box section) spans 2 Odoo groups (`SHS`, `RHS`), not one** — needs an owner decision on whether to present it as one combined category (requiring a small "category group mapping" concept beyond a 1:1 `group_code`) or two separate cards.
3. **FA/AR category labels: `catalog_group_labels` has 0 rows**, and Odoo itself has no FA/AR translation for these classification codes to sync even if the existing sync ran today — requires either Odoo-side translation work or a deliberate, curated one-time content decision.
4. **قوطی has no dedicated image asset** among the 13 files currently in `public/images/products/` — would need one sourced.
5. **No category display-order mechanism exists** — a design decision for PS-P4-P1, not a blocking data gap.

---

# MIGRATION REQUIREMENT

**NO new migration is strictly required** for the core category-display need: `product_variants.group_code`/`group_name` and `catalog_group_labels` (schema, not data) already exist from prior migrations (`0002`, `0009`). A possible future addition — a small table for an editable, persistent category display order (mirroring `homepage_product_rank`'s role for products) — is a legitimate design option for PS-P4-P1 but is not required to ship an initial version (a simple code-level ordered constant, e.g. `HOMEPAGE_CATEGORY_ORDER: string[]`, is sufficient and matches this codebase's existing preference for the smallest complete change).

---

# PRODUCTION SAFETY

No production resource (Odoo or Cloudflare) was read, written, or touched. No secret was requested or exposed — the Catalog API used is `auth=public`. No D1 write occurred (`catalog_group_labels`/`product_variants`/`catalog_products` were only `SELECT`-read on staging). No Worker was deployed. No migration was run. `main` was not touched. No website code was changed.

---

# READY FOR PS-P4-P1

**YES, with an explicit owner decision still outstanding:** the taxonomy, routing, Header-reuse, and image-asset landscape are now fully mapped and ready to design against. PS-P4-P1 (implementation) should not proceed on the full 7-category scope until the owner decides how to handle (a) the 2 categories with no Odoo data yet, and (b) whether قوطی is one card or two. The other 5 categories, plus the EN-language version of all mapped categories, are ready to implement today without any further data gathering.
