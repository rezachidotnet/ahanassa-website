# Catalog Public Routes / SEO Granularity

**Status:** Active — canonical for the public Catalog route/data architecture: SEO page granularity, template/product vs. commercial-variant identity, route/slug design, filters, and the sitemap boundary.
**Established:** 2026-08-30 (DOCUMENT_AUDIT_REPORT.md DAR-037), building on `docs/CATALOG_EDITORIAL_PUBLICATION.md` (DAR-036).
**Scope:** `app/[locale]/products/**`, `app/sitemap.ts`, `lib/catalog/editorial-repository.ts` (public-read section), `lib/catalog/catalog-filters.ts`, `lib/catalog/specification-presenter.ts`, `components/products/**`. Does not cover Pricing, RFQ catalog-selector wiring, or a Customer Portal — all remain separate, later phases.

---

## 1. SEO granularity decision — hybrid, template-primary

The catalog is **variant-centric in Odoo/DB_PUBLIC** (237 variants under 13 templates — verified live 2026-08-30, unchanged from DAR-034/035/036) but **template-primary on the public Website**:

```text
Product Template (catalog_products, entity_type='product')
  -> the site's primary indexable page (/{locale}/products/{slug})
  -> commercial Variant specification table inside that page
  -> product_variant_xid / sku — internal identity, never a route segment
```

No template was found unsuitable as a public landing entity — all 13 (RHS, SHS, two grades of hot-rolled plate, two of hot-rolled sheet, two beam profiles (IPN/INP, IPE), a seamless-pipe grade, and four rebar grades) are coherent, real product families with 10–38 variants each (full matrix in §2). None needed exclusion.

**237 independent Variant SEO pages were deliberately not created.** `product_variants.slug_fa` (the Odoo-bootstrapped internal fallback) is never used as a public route. The **rare exception** — a single Variant earning its own dedicated indexable page — remains structurally possible (`product_seo_contents.entity_type='variant'`, unchanged from DAR-036) but is never the default, and nothing in this phase builds a route for it (§9).

---

## 2. Real catalog shape (live-verified, staging DB_PUBLIC, 2026-08-30)

| Template XID | Name | Variants | Group | Form | Family | Grade | Standard |
|---|---|---:|---|---|---|---|---|
| `product_tmpl_pf_rhs` | Rectangular Hollow Section (RHS) | 38 | RHS | RHS_FORM | HOLLOW_SECTIONS_PROFILES | — | EN10219-2 |
| `product_tmpl_pf_shs` | Square Hollow Section (SHS) | 29 | SHS | SHS_FORM | HOLLOW_SECTIONS_PROFILES | — | EN10219-2 |
| `product_tmpl_sh_hr_s235jr_plate` | Hot Rolled Plate S235JR | 22 | SHEET_PLATE | HOT_ROLLED_PLATE | FLAT_PRODUCTS | S235JR | EN10029 |
| `product_tmpl_sh_hr_s355jr_plate` | Hot Rolled Plate S355JR | 22 | SHEET_PLATE | HOT_ROLLED_PLATE | FLAT_PRODUCTS | S355JR | EN10029 |
| `product_tmpl_bm_inp` | IPN / INP Beam | 21 | BEAMS | INP | LONG_PRODUCTS | — | EN10365 |
| `product_tmpl_bm_ipe` | IPE Beam | 18 | BEAMS | IPE | LONG_PRODUCTS | — | EN10365 |
| `product_tmpl_sh_hr_s355jr_sheet` | Hot Rolled Sheet S355JR | 15 | SHEET_PLATE | HOT_ROLLED_SHEET | FLAT_PRODUCTS | S355JR | EN10051 |
| `product_tmpl_sh_hr_s235jr_sheet` | Hot Rolled Sheet S235JR | 15 | SHEET_PLATE | HOT_ROLLED_SHEET | FLAT_PRODUCTS | S235JR | EN10051 |
| `product_tmpl_rb_s240` | Plain Rebar S240 (A1) | 13 | REBAR | PLAIN_REBAR | LONG_PRODUCTS | S240 | INSO3132 |
| `product_tmpl_pp_smls_a106_gr_b` | Seamless Pipe ASTM A106 Gr. B | 12 | SEAMLESS_PIPE | SEAMLESS_PIPE_FORM | PIPES_TUBES | A106_GR_B | ASMEB36.10M |
| `product_tmpl_rb_aj400` | Ribbed Rebar Aj400 (A3) | 11 | REBAR | RIBBED_REBAR | LONG_PRODUCTS | AJ400 | INSO3132 |
| `product_tmpl_rb_aj340` | Ribbed Rebar Aj340 (A2) | 11 | REBAR | RIBBED_REBAR | LONG_PRODUCTS | AJ340 | INSO3132 |
| `product_tmpl_rb_aj500` | Ribbed Rebar Aj500 (A4) | 10 | REBAR | RIBBED_REBAR | LONG_PRODUCTS | AJ500 | INSO3132 |

**13 templates, 237 variants — matches DAR-034/035/036 exactly.** `grade_code`/`standard_code` are genuinely `null` for some groups (structural beams have no grade in the API) — never invented; `?grade=`/`?standard=` facets simply omit that dimension for such groups (§6).

**Real polymorphic `dimensions_json`/`nominal_weight_json` shapes** (verified live, drives `lib/catalog/specification-presenter.ts`):

| Group | Dimension keys | Weight keys |
|---|---|---|
| REBAR | `diameter_mm`, `length_mm` | `kg_m`, `per_branch` |
| BEAMS | `height_mm`, `length_mm` | `kg_m`, `per_branch` |
| RHS / SHS | `width_mm`, `height_mm`, `thickness_mm`, `length_mm` | `kg_m`, `per_branch` |
| SEAMLESS_PIPE | `outside_diameter_mm`, `wall_thickness_mm`, `length_mm` | `kg_m`, `per_branch` |
| SHEET_PLATE | `width_mm`, `thickness_mm`, `length_mm` | `kg_m2`, `per_sheet` |

`schedule` (e.g. `"SCH40"`) is populated only for `SEAMLESS_PIPE` and already folded into `commercial_size` (e.g. `"114.3×6.02 SCH40"`) — not rendered as a separate column, avoiding redundancy.

---

## 3. Entity model — three distinct concepts, never collapsed

1. **Commercial Variant** — identity `product_variant_xid` (`product_variants.xid`). Purpose: RFQ/commercial selection, dimension/weight specification row. Owned by Odoo (commercial fields) + Website (`is_public`, optional dedicated SEO content).
2. **Product / Template Website entity** — `catalog_products`, keyed by the durable `template_xid` (never a name/SKU-prefix guess — DAR-034's own sync design already keys grouping this way). Purpose: catalog navigation, the primary indexable detail page, editorial/SEO content ownership.
3. **Category / Family** — the flat `family_code`/`group_code`/`form_code` classification already on every variant (no separate category master exists in the Odoo API — DAR-034). Purpose: filtering and (not built this phase) a possible future family-landing page — `product_seo_contents.entity_type='product'` already supports a template acting as that landing entity; a true multi-template "family" landing page is a distinct future extension, not built here.

---

## 4. Route architecture

```text
/{locale}/products                    — catalog listing (template cards)
/{locale}/products/{slug}             — Product/Template detail (primary, hybrid-model page)
```

These are the **exact pre-existing routes** (`app/[locale]/products/page.tsx`, `app/[locale]/products/[slug]/page.tsx`) — inherited from the repository's existing sample-data catalog pages (`01-sources/ROUTES.md`/`SITEMAP.md` naming conflict, DAR-016, remains open and unrelated: this phase did not need to resolve `/steel-products` vs. `/steel` since `/products` was already the live, working route in this repository). No new route pattern was invented.

`{slug}` resolves against `product_seo_contents.slug` for `entity_type='product'` — never an Odoo integer ID, never `product_variant_xid`/`template_xid` directly. A slug collision between a template-level and a (rare, future) variant-level dedicated page is prevented by the existing `uq_product_seo_contents_slug_locale (slug, locale)` index, which applies across all entity types sharing the same `slug`/`locale` pair — DAR-036.

---

## 5. Publication rule — a template page requires its own editorial row

A public Product/Template page exists **only if `catalog_products` itself has an approved+published `product_seo_contents` row** (`entity_type='product'`, `entity_id=catalog_products.id`) for the requested locale — **never merely because one of its variants exists or is public.** This reuses `lib/catalog/editorial.ts#evaluatePublicationEligibility`'s exact rule (structurally identical `{isActive, isPublic}` shape on both `catalog_products` and `product_variants`), applied at template granularity:

```text
visible_template   = catalog_products.is_active AND catalog_products.is_public
                    AND seo(entity_type='product').content_quality_status = 'approved'
                    AND seo.published_at IS NOT NULL AND seo.h1 IS NOT NULL AND seo.slug IS NOT NULL

indexable_template = visible_template AND seo.index_status = 'index'
```

No competing editorial table was created — this reuses `product_seo_contents.entity_type='product'`, already a first-class value in the existing `CHECK` constraint (DAR-036 §8).

### Variant visibility inside a published template page

Once a template page is public, its specification table shows **only the variants that are themselves both `is_active=1` AND `is_public=1`** — never the template's full variant set automatically. This is a deliberate policy decision (this phase's own call, not dictated by the prior phase): `product_variants.is_public` keeps its DAR-036 meaning as a **hard per-variant kill switch** ("nothing about this variant is ever public... regardless of approved+published content"), now literally including "shown inside its published template's spec table." An editor can therefore publish a template family page while deliberately holding back specific obsolete/discontinued sizes. Live-proven (DAR-037): a controlled staging test published one template with 11 total variants but only 2 marked `is_public`, and the detail-page query correctly returned exactly those 2, not all 11.

Four genuinely distinct concepts, restated for a Variant (unchanged from DAR-036 §5, now applied inside the hybrid model too):

| Concept | Governed by |
|---|---|
| Commercially selectable (future RFQ picker) | `is_active` alone |
| Visible inside a published template's spec table | `is_active AND is_public` |
| Owns an independent indexable URL | A separate `entity_type='variant'` editorial row — the rare exception (§9) |
| SEO indexable | `index_status='index'`, strictly a subset of visible |

---

## 6. Filters

Server-rendered, URL/query-param based (`?family=&group=&form=&grade=&standard=`), plain `<Link>` toggles — **zero client JS** (`components/products/catalog-filter-bar.tsx` has no `"use client"`). Facet values are drawn **only from variants belonging to a currently-published template** (`getPublicCatalogFilterFacets`) — never from the full 237-row commercial universe — so a filter option is never shown with zero real public results behind it. The legacy sample-catalog `?category=` param (still linked from the site footer, out of this task's scope — §11) is silently ignored by the new parser, never crashes.

No client-side loading of all 237 products for filtering — every filtered listing is a fresh, parameterized DB_PUBLIC query (`listPublishedCatalogTemplates(locale, filters)`).

---

## 7. Variant presentation — typed specification presenter

`lib/catalog/specification-presenter.ts#normalizeVariantSpecifications(variant, locale)` is the **only** path from raw `dimensions_json`/`nominal_weight_json` to the UI — no component reads a raw JSON key directly. An unrecognized key (a future product form not yet in the label dictionary) degrades to a humanized version of its own key name rather than crashing or being silently dropped (tested: `lib/catalog/specification-presenter.test.ts`, 15 tests, using the real 6-group fixture shapes from §2 plus two synthetic unknown-shape fixtures).

Nominal weight is always rendered with an explicit, locale-specific disclaimer (`NOMINAL_WEIGHT_DISCLAIMER`) — "nominal/theoretical, not actual delivered or weighbridge-settlement weight" — never implying invoice or settlement weight.

---

## 8. Locale behavior

Unchanged from DAR-036, now proven live at template granularity: FA/EN/AR publish independently per `(entity_type='product', entity_id, locale)` row. A controlled staging test published a template in `fa` while zero `en` rows existed for the same template; the `en`-locale query correctly returned zero results. Commercial specification **labels** (dimension/weight names in `specification-presenter.ts`) use a small controlled localization dictionary — never machine translation; editorial copy (`h1`/`intro`/body) is written by an editor per locale, never auto-translated.

---

## 9. Variant-level editorial exception (preserved, not exercised by this phase)

`getPublishedCatalogProducts`/`getPublishedCatalogProductBySlug` (DAR-036, `entity_type='variant'`) remain exactly as built — a dedicated Variant page is possible the moment a real `product_seo_contents` row of that type is approved+published for a specific `product_variant_xid`, with no schema or route-policy change required. Nothing in this phase routes to them by default; the hybrid model's default is always the template page (§1).

---

## 10. RFQ handoff boundary — not wired, but the data contract exists

RFQ Catalog wiring is explicitly **not implemented** in this phase. `VariantSpecTable` renders each variant's `sku` (the customer-facing commercial code) in its own table column; the underlying `ProductVariant` object passed to every component already carries `xid` (the durable `product_variant_xid`) even though it is never rendered. A future RFQ picker can therefore resolve a selected row back to its canonical `product_variant_xid` server-side without this phase needing to guess a URL/query-param contract prematurely — display name is never treated as identity anywhere in this code path.

---

## 11. Pricing / availability boundary

Zero price or availability output anywhere in this phase (verified: a full-text search of every new/changed file under `app/[locale]/products/`, `components/products/`, `lib/catalog/specification-presenter.ts`, `lib/catalog/editorial-repository.ts` for price/stock/availability terms in fa/en/ar found none rendered — the only `price` references are the pre-existing, unrendered `is_price_public` schema flag). The primary action throughout is the existing RFQ CTA (`primaryCta`/`CtaBand`, "Send invoice or purchase list") — never "Buy now"/"Add to cart"/a stock indicator.

---

## 12. Metadata / structured data

Listing (`/products`) and detail (`/products/{slug}`) pages both go through the existing `buildPageMetadata` resolver (title/description/canonical/hreflang alternates/Open Graph) — unchanged mechanism, now fed real editorial `seo_title`/`seo_description`/`h1`/`intro` on the detail page rather than sample-data copy. The listing page's `indexable` stays `false`, matching the current site-wide pre-launch posture every other page already uses (home, about, services, contact — all still `indexable: false` as of this phase; robots.ts also still blocks everything outside `APP_ENV=production`). The detail page's `indexable` is real per-entity data (`seo.indexStatus === 'index'`) — not hardcoded — so it activates correctly once the site's overall launch posture changes, without a further code change.

`BreadcrumbList` JSON-LD is emitted on the detail page (Home → Products → this product) via the pre-existing `lib/seo/schema.ts#breadcrumbListSchema` helper. **`Product`/`Offer` schema is deliberately not emitted** — Google's guidance expects an `Offer` (price/availability) on `Product` markup, and this phase has neither; forcing `Product` schema without one would be misleading structured data, which this task's own boundary explicitly forbids.

---

## 13. Sitemap boundary

`app/sitemap.ts` now queries `listIndexableCatalogTemplateSlugs(locale)` per locale — published **and** approved **and** explicitly `index_status='index'** entities only; commercially active state alone is never sufficient (live-proven: a controlled staging template was fully published+approved but still excluded from the sitemap query while `index_status` remained `'draft'`, then correctly included the moment it was set to `'index'`). As of this phase the real result is genuinely empty (`<urlset></urlset>`, confirmed via a local dev-server request) — this is the correct, expected output, not a bug, and no unpublished Product/Variant URL is ever added.

---

## 14. Sample-catalog isolation

`app/[locale]/products/page.tsx` and `app/[locale]/products/[slug]/page.tsx` no longer import `lib/content/catalog-sample.ts` in any form — verified via `grep` before and after this change. `components/products/catalogue.tsx` and `components/products/sample-data-notice.tsx` (the two components that existed solely to render that sample data on these two routes) were deleted as dead code, not left half-disconnected. `lib/content/catalog-sample.ts` itself is **not deleted** — it remains genuinely used by two other, unrelated, pre-existing site surfaces outside this task's scope: the footer's category links (`components/layout/SiteFooter.tsx`) and the contact form's product dropdown (`components/contact/enquiry-form.tsx`, `lib/rfq/validation.ts`). No production path in the real Catalog route, or the homepage (§16 below), now combines sample and real DB_PUBLIC data.

**Resolved (Homepage Product Architecture Hardening, 2026-09-03):** the homepage showcase previously linked to sample slugs (e.g. `/products/deformed-rebar`) that 404'd under the real, DB_PUBLIC-backed detail route, exactly as this section originally predicted and flagged as a "recommended follow-up." §16 below describes the fix — the homepage now sources exclusively from `listHomepageProductCandidates`, the same real, publication-gated data this document's §5 already describes.

---

## 15. Files

**New:** `docs/CATALOG_PUBLIC_ROUTES.md` (this document), `lib/catalog/catalog-filters.ts` (+ tests), `lib/catalog/specification-presenter.ts` (+ tests), `components/products/catalog-empty-state.tsx`, `components/products/catalog-filter-bar.tsx`, `components/products/catalog-template-grid.tsx`, `components/products/variant-spec-table.tsx`.
**Changed:** `app/[locale]/products/page.tsx`, `app/[locale]/products/[slug]/page.tsx`, `app/sitemap.ts`, `lib/catalog/editorial-repository.ts` (generalized internal editorial functions to `(entityType, entityId, locale)`; added template-level public reads, filter facets, and the sitemap query — no other file called the old variant-only signatures, verified before the change).
**Deleted:** `components/products/catalogue.tsx`, `components/products/sample-data-notice.tsx` (dead code once the real pages stopped using them).

---

## 16. Homepage Product Projection (Homepage Product Architecture Hardening, 2026-09-03)

**Source of truth:** `lib/catalog/editorial-repository.ts#listHomepageProductCandidates(locale, options?)` is the homepage's ONLY product data source. `components/home/product-showcase.tsx` takes `items: HomepageProductCandidate[]` as a prop (fetched server-side in `app/[locale]/page.tsx`, the same pattern `PriceStrip`/`getHomepagePriceStrip` already established) — it no longer imports `lib/content/catalog-sample.ts` and contains no hardcoded slug list.

**Eligibility invariant:** `listHomepageProductCandidates` filters on the exact same `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` array `listPublishedCatalogTemplates`/`getPublishedCatalogTemplateBySlug` (§5 above) use — a literal shared constant, not independently duplicated SQL. This makes it structurally impossible for a homepage card to link to a template `/products/[slug]` would 404 on: both read paths require `is_active=1 AND is_public=1 AND` an approved+published+`h1`-populated `product_seo_contents` row for the exact requested locale. A candidate's `slug` is read from that same `product_seo_contents.slug` column `getPublishedCatalogTemplateBySlug` resolves against — never guessed, never sample data.

**Data ownership:** unchanged from §3 — Odoo still owns commercial identity/classification; the website still owns `product_seo_contents` (title/slug/summary via `s.h1`/`s.slug`/`s.intro`). The homepage projection adds one new, presentation-only overlay table, `homepage_product_rank` (`migrations_public/0005_homepage_projection.sql`) — `base_priority`/`manual_boost`/`demand_score`, keyed by `catalog_products.id`. It is explicitly NOT a second product-identity/name/slug source — see §17 (Ranking) for the full contract.

**Locale behavior:** `s.locale = ?` in the shared gate means a candidate list for one locale can never contain another locale's slug — an `en` visitor never sees a `fa`-only published template. Fewer than `lib/catalog/homepage-config.ts#HOMEPAGE_PRODUCT_DISPLAY_COUNT` (currently 6) eligible candidates renders fewer cards; zero eligible candidates renders `components/products/catalog-empty-state.tsx` (`variant="catalog-preparing"` — the identical empty state `/products` already uses for the same real condition) instead of hiding the section or fabricating cards.

**Live-verified (2026-09-03, local D1, real synced data):** with 13 templates / 237 variants synced and 3 currently published (`rebar-aj340`, `square-hollow-section-shs`, `hot-rolled-plate-s355jr`), the exact production query returns exactly those 3 rows with correct slugs/titles/classification codes — see `lib/catalog/homepage-projection-invariants.test.ts` for the pinned structural invariants and this task's final implementation report for the full query output.

---

## 17. Media Registry

`lib/catalog/media-registry.ts#resolveCatalogMedia({ templateXid, groupCode, familyCode })` — pure, D1-free. Resolution hierarchy: (1) `TEMPLATE_XID_IMAGE_OVERRIDES[templateXid]` (empty today — no per-template override tooling exists yet, but the structure is ready for one), (2) `GROUP_DEFAULT_IMAGES[groupCode]`, then `FAMILY_DEFAULT_IMAGES[familyCode]`, (3) a generic fallback (`public/images/products/steel-placeholder.svg`, a NEW, deliberately non-product-specific asset — none of the 13 existing photos under `public/images/products/` is genuinely generic, and none of them was renamed, altered, or reused as a stand-in for an unrelated product).

Group mapping is keyed by **stable commercial classification** (`product_variants.group_code`), never by localized SEO slug — a slug rename never breaks an image. Mapped today, verified live against real synced DB_PUBLIC classification codes (2026-09-03): `REBAR → rebar.png`, `SHEET_PLATE → sheet-plate.png`, `BEAMS → beams.png`, `SEAMLESS_PIPE → pipe.png`. `SHS`/`RHS` (hollow sections) are live, real, currently-published group codes with **no** dedicated photo among the 13 existing assets — they intentionally fall through to the generic fallback rather than borrowing an unrelated product's photo; add a real mapping only once a genuinely representative photo exists, never a guess.

**Future R2 path:** `resolveCatalogMedia` returns a plain `{ src, source }` shape. Moving the underlying files from `public/images/products/` to R2 later only requires changing the string constants inside this one file (e.g. to a full R2/CDN URL) — no caller, no Product identity, and no homepage logic needs to change.

---

## 18. Slug / Route Lifecycle

**Schema:** `route_redirects` (`migrations_public/0005_homepage_projection.sql`) — generic across entity types (`entity_type`/`entity_id` columns, never product-specific), `(locale, old_path)` unique, `status_code IN (301, 302, 410)`, `target_path` required for 301/302 and forbidden (NULL) for 410 (CHECK constraints), full site-relative paths (e.g. `/products/old-slug`) rather than bare slugs.

**Canonical slug change:** `lib/catalog/editorial-repository.ts#upsertEditorialDraft` detects an actual slug change on an existing `entity_type='product'` row (never on first-time slug creation — no previous row means nothing to redirect from) and calls `lib/catalog/route-redirects.ts#recordSlugChangeRedirect`, which writes a 301 from the previous `/products/{slug}` to the new one AND repoints any pre-existing redirect that targeted the now-superseded path (chain collapse at write time — `lib/catalog/route-redirects-logic.ts#planSlugChangeRedirects`), so a reader never has to follow more than one hop. `app/[locale]/products/[slug]/page.tsx` checks `resolveRouteRedirect(locale, path)` before calling `notFound()` and issues a real Next.js `redirect()` for a resolved 301. A redirect-write failure is logged but never fails the editorial save itself (best-effort overlay, not the source of truth).

**Loop/self-redirect protection:** `lib/catalog/route-redirects-logic.ts#validateRedirectInsert` rejects a self-redirect (`oldPath === targetPath`) and walks the existing chain (bounded, `MAX_HOPS = 10`) to reject a cycle — normal multi-hop chains are allowed (and immediately collapsed to one hop by the write path above), only true cycles are rejected. Fully unit-tested (`lib/catalog/route-redirects-logic.test.ts`).

**Retirement (410) — schema/policy hooks only, deliberately deferred beyond that:** the schema fully supports a terminal `status_code = 410` row with `target_path = NULL` (validated the same way — never a fabricated replacement), and `validateRedirectInsert` enforces that a 410 row never carries a target. Actually returning a real HTTP 410 status to a visitor requires a Next.js Route Handler (a page component's `notFound()` always returns 404) — that plumbing is **not built** in this pass; a resolved 410 today still renders the normal 404 page. This is the one explicitly-scoped deferral this task's own spec allows ("if full 410 handling is too large, build schema/policy hooks and document deferred behavior rather than fabricating it") — never auto-redirected to `/products` or the homepage, never an invented replacement.

---

## 19. Ranking

See `docs/HOMEPAGE_RANKING.md` for the full contract (base priority, demand aggregation, decay, manual boost, ranking-mode kill switch, and the DB_OPS→DB_PUBLIC privacy boundary).
