# AHAN ASA — HOMEPAGE PRODUCT SHOWCASE
## PRODUCT-SHOWCASE-P0 — Current Implementation Audit Against Final Frozen V2.0

**Task type:** READ-ONLY AUDIT (no runtime changes made).
**Audited by:** Claude Code, subagent audit pass.
**Date:** 2026-09-07.

---

## SUMMARY BLOCK

```
AUTHORITATIVE PRODUCT SHOWCASE: V2.0
CURRENT PRODUCT SHOWCASE: PARTIALLY COMPLIANT
SOURCE OF TRUTH: PASS
MAX 8: PASS
PRICE-FREE: PASS
STOCK-INDEPENDENT: PASS
WHOLE-CARD NAVIGATION: PASS
ODOO LIVE RENDER DEPENDENCY: ABSENT
SSR: PASS
MEDIA: GAP
LAYOUT 0–8: GAP
LOCALIZATION: PASS
PRODUCT-SHOWCASE-P1 REQUIRED: YES
```

---

# RESULT

**B. MOSTLY COMPLIANT — TARGETED P1 REQUIRED.**

The data architecture is materially compliant with V2.0's hardest invariants (no hardcoded commercial list, no live Odoo render dependency, no price, no stock-driven visibility, whole-card navigation, SSR-first, shared publication gate with the Header/catalog). One defect is severe enough to flag as P0 (see below). The remaining gaps are concentrated in three areas that were never built to the frozen spec's exact letter: (1) the 0–8 responsive layout matrix, (2) a distinct "homepage eligibility" curation concept separate from plain public-catalog publication, and (3) the Odoo→Website hybrid media-governance pipeline (versioning/approval/checksum). None of these three represents a business-fact fabrication or a broken navigation/source-of-truth violation — they are legitimate P1 architecture/UX/media gaps.

---

# PREFLIGHT

```
$ pwd
/Users/reza/Developer/ahanassa-website/.claude/worktrees/product-showcase-audit

$ git branch --show-current
worktree-product-showcase-audit

$ git rev-parse HEAD
a2bba8bf2d72b9036cc5b0f7bef0ec61070b5f9f

$ git status --short
(clean)

$ git log --oneline --decorate -15
a2bba8b (HEAD -> worktree-product-showcase-audit, feat/header-hero-integrated) docs(home): align hero image comment with current visual
f5b9fba feat(home): replace hero procurement image
369a4ab feat(header): add copper hover accents
ca51642 (feat/header-frozen-v2) feat(home): update hero copy and procurement visual
12d73de feat(home): refine hero message and procurement flow
6d82614 docs: record shared Button adoption checkpoint
4edc3da refactor: adopt shared Button across Header and Hero
37713c6 docs: import Button V1 Header V2.2 and Hero V2.4 specs
d606de6 docs: record Hero visual reconciliation
aa3b6cf fix: refine Hero temporary media and CTA presentation
8d5289a docs: record Hero V2.3 compliance implementation
a08063a fix: align Homepage Hero with frozen V2.3
55f4c61 docs: record Hero V2.3 implementation audit
f0ee19f docs: record final Header V2.1 reconciliation
839a5b4 fix: reconcile Header implementation with frozen V2.1
```

Ancestry check: `git merge-base --is-ancestor 6d82614b0be31f2dc6a128e89282415feedc4c21 HEAD` → confirmed ancestor.

Required files, all present and verified readable:
- `docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md` (3017 lines, read in full)
- `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md`
- `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.4.md`
- `docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`

No unrelated working-tree drift found at start. Proceeded with the audit.

---

# BASE SHA

`a2bba8bf2d72b9036cc5b0f7bef0ec61070b5f9f`

---

# AUTHORITATIVE SPEC

`docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md` — read in full (all 86 sections, lines 1–3017).

---

# SPEC VERSION NOTE

The document's own H2 (line 2) reads **"Frozen Decisions Report — Version 1.0"**, while the front-matter `**Version:** 2.0` (line 7) and the closing §86 ("AHAN ASA HOMEPAGE PRODUCT SHOWCASE V2.0 IS FULLY FROZEN AND APPROVED") both assert V2.0 authority. The body accretes decisions from V1.0 → V1.1 → V1.2 → V1.3 → V1.4 → V1.5 → V2.0 sequentially (§16, §20, §37, §63, §67, §70, §86), each explicitly superseding nothing from the previous version, only adding to it. This is the exact "historical/internal heading referencing Version 1.0" the task anticipated.

**Treatment:** documentation observation only, not a runtime defect. The document's own final authority is V2.0 (§86), and this audit is conducted against the fully-accreted V2.0 rule set (i.e., every rule from §1 through §86, since none were retracted). The spec file itself was not edited (read-only, per the absolute safety rules).

---

# CURRENT COMPONENT TREE

```
app/[locale]/page.tsx                              — Homepage route; server component
  ├─ imports Hero, PriceStrip, ProductShowcase, Capabilities, Assurance, Process, Reach, CtaBand
  ├─ fetches homepageProducts via
  │    lib/catalog/editorial-repository.ts#listHomepageProductCandidates(locale, { mode })
  ├─ resolves ranking mode via lib/ranking/score.ts#resolveHomepageRankingMode(env.HOMEPAGE_RANKING_MODE)
  └─ renders <ProductShowcase locale={locale} items={homepageProducts} />

components/home/product-showcase.tsx               — the Homepage Product Showcase component itself
  ├─ components/ui/section-heading.tsx              — <h2> section title (SectionHeading)
  ├─ components/ui/reveal.tsx                       — client-side IntersectionObserver reveal wrapper
  ├─ components/products/catalog-empty-state.tsx    — zero-candidate fallback (variant="catalog-preparing")
  ├─ lib/content/homepage.ts#homepageCopy[locale].productShowcase — eyebrow/title/body/cta strings (fa/en/ar)
  ├─ config/locales.ts#localizedPath                — locale-prefixed href builder
  └─ next/image, next/link, lucide-react (ArrowUpRight)

lib/catalog/editorial-repository.ts#listHomepageProductCandidates
  ├─ getPublicDb() → D1 binding DB_PUBLIC (server-only, cloudflare:workers)
  ├─ SQL: catalog_products (cp) JOIN product_seo_contents (s, entity_type='product')
  │        LEFT JOIN homepage_product_rank (hpr)
  │        (+ two correlated subqueries against product_variants for rep_family_code/rep_group_code)
  ├─ WHERE = TEMPLATE_PUBLICATION_WHERE_CONDITIONS (shared literal with listPublishedCatalogTemplates
  │        and getPublishedCatalogTemplateBySlug — the same array reference, not duplicated SQL)
  ├─ lib/ranking/score.ts#computeHomepageScore / sortByHomepageScore
  ├─ lib/catalog/media-registry.ts#resolveCatalogMedia (classification-code → static asset path)
  └─ lib/catalog/homepage-config.ts#HOMEPAGE_PRODUCT_DISPLAY_COUNT (= 6) as default `limit`

lib/catalog/types.ts#HomepageProductCandidate       — the component-facing domain type (productId,
                                                       templateXid, locale, slug, title, summary,
                                                       familyCode, groupCode, image, rank, score)

lib/ranking/
  ├─ score.ts                 — computeHomepageScore, sortByHomepageScore, resolveHomepageRankingMode
  ├─ decay.ts                 — exponential demand-signal decay
  ├─ demand-aggregation.ts    — DB_OPS RFQ→aggregate-only signal extraction (privacy boundary)
  └─ aggregation-orchestrator.ts — writes lib/ranking's demand_score into homepage_product_rank

migrations_public/0005_homepage_projection.sql       — CREATE TABLE homepage_product_rank, route_redirects
migrations_public/0001–0009_*.sql                    — catalog_products, product_variants, product_seo_contents,
                                                        catalog_group_labels, etc.
```

Related, but explicitly NOT the Homepage source: `lib/content/catalog-sample.ts` (dev/testing sample data — confirmed unreferenced by any homepage/product production path via `lib/catalog/homepage-source-isolation.test.ts`).

---

# CURRENT DATA FLOW

```
Odoo Public Catalog API v1 (docs/integrations/odoo/catalog-v1/)
        ↓  (lib/catalog/odoo-api-client.ts, lib/catalog/sync.ts, lib/catalog/sync-runner.ts)
DB_PUBLIC: catalog_products / product_variants        (Odoo-owned commercial fields)
        +  product_seo_contents                        (Website-owned editorial/SEO overlay)
        +  homepage_product_rank                        (Website-owned ranking overlay, additive-only)
        ↓
lib/catalog/editorial-repository.ts#listHomepageProductCandidates(locale, { mode })
        ↓  (server-side, inside app/[locale]/page.tsx, no 'use client', no fetch/SWR/React Query)
components/home/product-showcase.tsx  (props-only, no data-fetching of its own)
        ↓
Server-rendered HTML — <ul><li><a href="/{locale}/products/{slug}">…</a></li></ul>
```

No client-side fetch of product data exists anywhere in this chain. `workers/entry.ts` runs a `scheduled()` Cron handler (`runScheduledCatalogSync`) that refreshes DB_PUBLIC from Odoo on a schedule — confirmed wired for `env.production` (`wrangler.jsonc` `triggers.crons: ["*/5 * * * *", "0 */3 * * *", "30 2 * * *"]`) and explicitly disabled for `env.staging` (`crons: []`, per DAR-053's Workers Free plan cap fix). **Documentation observation (not a runtime defect):** `CLAUDE.md` §5 states "(not yet built: R2, scheduled catalog sync, public catalog pages)" — this is stale; a scheduled catalog sync trigger and public catalog pages both already exist in code and are wired for production. Not corrected in this pass (CLAUDE.md is out of this audit's edit scope).

---

# PRODUCT SOURCE OF TRUTH

**PASS.** `components/home/product-showcase.tsx` takes `items: HomepageProductCandidate[]` as a prop and does no fetching of its own (confirmed by reading the file and by `lib/catalog/homepage-source-isolation.test.ts`, which pins: no import of `catalog-sample`, no hardcoded `const featured = [...]` array, prop-driven only). `app/[locale]/page.tsx` sources `homepageProducts` exclusively from `listHomepageProductCandidates`, which reads DB_PUBLIC (`catalog_products`/`product_variants`/`product_seo_contents`), never Odoo directly and never a static array.

Searched for the prohibited patterns (`const products = [...]`, `featuredProducts = [...]`, `homepageProducts = [...]`, hardcoded Persian family-name arrays as commercial source) across `components/home/product-showcase.tsx`, `app/[locale]/page.tsx`, `lib/catalog/editorial-repository.ts`: none found as an authoritative source. The one static array found in this domain is `lib/content/catalog-sample.ts` — classified **B. test fixture / dev-sample only**, self-identified as sample data, structurally unreachable from any production homepage/product path (pinned by `homepage-source-isolation.test.ts`). Not flagged as a source-of-truth defect.

`lib/catalog/media-registry.ts` contains classification-code→image-path maps (`GROUP_DEFAULT_IMAGES`, `FAMILY_DEFAULT_IMAGES`) — classified **C. presentation configuration only** (image selection, not commercial identity; product identity/name/slug never comes from this module).

Note: DAR-052 in `DOCUMENT_AUDIT_REPORT.md` documents that this exact defect (a hardcoded 6-slug `featured` array sourced from `catalog-sample.ts`, none of which resolved to real published slugs — a "homepage-to-404" production defect) previously existed and was fixed on 2026-09-03. The current code confirms the fix is in place.

---

# PUBLICATION ELIGIBILITY

The shared gate, `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` (declared exactly once in `lib/catalog/editorial-repository.ts`, pinned by `homepage-projection-invariants.test.ts`):

```
cp.is_active = 1
cp.is_public = 1
s.locale = ?
s.content_quality_status = 'approved'
s.published_at IS NOT NULL
s.h1 IS NOT NULL
```

This exact array (same object reference) gates `listPublishedCatalogTemplates` (the `/products` listing), `getPublishedCatalogTemplateBySlug` (`/products/[slug]`), AND `listHomepageProductCandidates` (the Homepage). No inventory, price, or stock field appears anywhere in this condition set or in the homepage query's SELECT list. **PASS** on "same publication rules as Product Detail" (V2.0's overarching architecture requirement) and on "not gated by inventory/price."

---

# HOMEPAGE ELIGIBILITY

**GAP relative to V2.0 §5/§68/§75's distinct "Homepage eligible?" step.**

V2.0 explicitly models Homepage merchandising as: `Publicly published? → Homepage eligible? → Homepage display priority → Homepage Product Showcase` (§5), and later as `show_on_homepage` + `homepage_sequence` (§68.1). The current implementation has no `show_on_homepage` (or equivalent) boolean anywhere in the schema (`migrations_public/0005_homepage_projection.sql` — `homepage_product_rank` has only `base_priority`/`manual_boost`/`demand_score`, no exclude/opt-out flag) or in the query (`listHomepageProductCandidates` uses the exact same WHERE as the general catalog listing, with no additional homepage-specific eligibility filter).

**Practical consequence:** every publicly published template is automatically a homepage candidate; "curation" happens only via ranking + a hard `LIMIT`/`slice(0, limit)` cutoff (currently 6), never via an explicit include/exclude decision. There is currently no way to keep a product published on `/products` while deliberately excluding it from the Homepage, other than ranking it low enough to fall outside the top 6 — which stops working the moment the published-count is ever ≤ 6 (it currently is: 3 published).

This is an **architecture gap**, not a temporary data condition — no schema column or code path exists to represent "homepage eligible: no" independent of "publicly published: yes."

---

# MAXIMUM CARD COUNT

**PASS**, with a config note. `HOMEPAGE_PRODUCT_DISPLAY_COUNT = 6` in `lib/catalog/homepage-config.ts`, applied as `options.limit ?? HOMEPAGE_PRODUCT_DISPLAY_COUNT` inside `listHomepageProductCandidates`, then enforced via `.slice(0, limit)` after ranking — a single, centralized constant, not scattered magic numbers. 6 ≤ 8 (V2.0's hard maximum), so the current launch configuration is compliant; the constant is a one-line change if the business wants to move toward 8. No layer (query, component, or CSS) can render more than `limit` cards, because the array itself is truncated before it ever reaches the component — the component has no independent count-limiting logic of its own (confirmed: `product-showcase.tsx` simply maps over `items` with no additional slicing), so there is no risk of a second layer silently overriding/exceeding the repository's cap.

---

# ORDERING / HOMEPAGE SEQUENCE

**Architecture: PASS in intent, PARTIAL in practice (temporary data condition + tooling gap).**

`computeHomepageScore` (`lib/ranking/score.ts`) implements exactly V2.0's formula direction: `Homepage Score = basePriority + (demandTerm, mode-gated) + manualBoost`. In `"base"` mode (the only mode active in either deployed environment — see below), `demandTerm` is forced to `0`, making ordering **fully deterministic**: `basePriority + manualBoost`, tie-broken by `templateXid` ascending (`sortByHomepageScore`) — never by insertion/D1-scan order. This satisfies V2.0's "deterministic tie-break" (§22.3, §68.4) and "automatic real-time reordering is not approved" (§22.2) requirements for the shipped configuration.

**Ranking-mode kill switch, verified in both environments:**
```
wrangler.jsonc → env.production.vars.HOMEPAGE_RANKING_MODE = "base"
wrangler.jsonc → env.staging.vars.HOMEPAGE_RANKING_MODE = "base"
```
`resolveHomepageRankingMode` also defaults any missing/unrecognized value to `"base"` and never throws. **No live deployment currently has demand-influenced ("auto") ranking active.**

**Tension flagged for governance, not a current violation:** an `"auto"` mode exists (`lib/ranking/aggregation-orchestrator.ts` + `demand-aggregation.ts` + `decay.ts`) that adds a decayed RFQ-demand term to the score. This is a precomputed/batch-written score (never computed at render time — it's read from a stored `demand_score` column), so it is not "real-time" in the sense of per-request computation, but it IS an automatic, non-owner-approved-per-change reordering mechanism if ever switched on. V2.0 §68.10 permits this only as "data may recommend; owner/business governance approves" — i.e., the recommendation itself is fine, but flipping the mode to "auto" should be treated as an explicit, documented business decision each time, not a routine deploy toggle. Recommend this be documented as an operational governance rule (out of this audit's edit scope to add).

**Temporary data condition, not an architecture defect:** `homepage_product_rank` starts every template at `base_priority = 0` and there is no CLI/tooling path (`lib/catalog/editorial-cli.ts` was inspected — it exposes draft/publish/unpublish/quality-status/index-status commands only, nothing for `base_priority`/`manual_boost`) to populate a deliberate business sequence without a raw D1 write. In the current real data (3 published templates, all presumably at the default `base_priority = 0`), the effective "order" is a `templateXid` string tie-break — not the curated `میلگرد → تیرآهن → ورق → …` launch direction V2.0 §23 describes as the intended business order. This is a data/tooling gap, not a schema/architecture defect (the column and the sort logic both exist and work correctly).

---

# HEADER VS SHOWCASE DOMAIN CONSISTENCY

```
HEADER SOURCE:   lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts
                 → DISTINCT group_code (+ localized group_name via catalog_group_labels,
                   falling back to Odoo's own group_name) from product_variants,
                   gated by the SAME TEMPLATE_PUBLICATION_WHERE_CONDITIONS constant,
                   capped at MAX_HEADER_PRODUCT_SHORTCUTS.

SHOWCASE SOURCE: lib/catalog/editorial-repository.ts#listHomepageProductCandidates
                 → catalog_products (template-level), gated by the SAME
                   TEMPLATE_PUBLICATION_WHERE_CONDITIONS constant, ranked and
                   capped at HOMEPAGE_PRODUCT_DISPLAY_COUNT.

SHARED DOMAIN: YES
```

Both read paths query the same DB_PUBLIC tables (`catalog_products`, `product_variants`, `product_seo_contents`) through the literal same eligibility-gate constant — no separate/independently-maintained commercial product master exists for either surface. They legitimately differ in **granularity** (Header: distinct classification `group_code`, e.g. REBAR/SHEET_PLATE/BEAMS; Showcase: individual `template_xid`), which V2.0 explicitly permits ("may differ in eligibility filters/ordering/limits/media, but must not maintain separate commercial product masters" — §34). **PASS.**

**Note flagged for the P1 boundary:** because the Showcase operates at *template* grain rather than *group/family* grain, if a single classification group ever has more than one published template (e.g., two different rebar templates), the Homepage could show two cards that a visitor would perceive as "the same family twice" — which is a different display level than V2.0 §3's stated intent ("Homepage displays Product Family / Public Category... does NOT display individual SKU/variant/technical combination"). With only 3 published templates today this has not been observed to actually manifest, and it cannot be conclusively ruled in or out without live DB_PUBLIC family/group distribution data (not queryable in this read-only worktree — no local D1 state exists here; see CURRENT LOCAL DATA). Flagged as a genuine open question for the P1 boundary, not asserted as a confirmed defect.

---

# CARD CONTENT

Rendered fields, read directly from `components/home/product-showcase.tsx`:

| Field | Present? | Source |
|---|---|---|
| Public product name | Yes (`p.title`) | `product_seo_contents.h1` |
| One-line descriptor | Yes, optional (`p.summary`) | `product_seo_contents.intro`, only rendered `if (p.summary)` |
| Image | Yes | `lib/catalog/media-registry.ts#resolveCatalogMedia` |
| Directional affordance | Yes (small `ArrowUpRight`, opacity-0→100 on hover) | — |
| Family/category | Not rendered | fetched (`familyCode`/`groupCode`) but unused in the component |
| Grade / standard / dimensions | Not rendered | correctly absent |
| Availability / stock | Not rendered | correctly absent |
| Price / promotional text | Not rendered | correctly absent |
| CTA button | Not rendered (whole card is the link) | correctly absent |
| Badges (best-seller/new/etc.) | Not rendered | correctly absent |

**PASS** against V2.0 §17.2 ("standardized image, title, optional one-line descriptor, directional affordance, full-card link" — exactly this set) and §13 ("no deep technical detail on Homepage"). The Showcase is correctly a discovery surface, not a mini product-detail page.

---

# CARD NAVIGATION

**PASS.** Each card is a single `<Link href={localizedPath(locale, \`/products/${p.slug}\`)}>` wrapping the image, title, and descriptor — a real `<a>` (Next.js `Link` renders an anchor), no nested interactive elements inside it, keyboard-focusable, and the site-wide `:focus-visible` rule (`styles/base.css`, 2px solid outline + 2px offset) applies automatically. `p.slug` is read from `product_seo_contents.slug`, the exact same column `/products/[slug]`'s own resolver (`getPublishedCatalogTemplateBySlug`) reads — pinned by `homepage-projection-invariants.test.ts`, which asserts the href is built from `p.slug` via the standard `/products/{slug}` pattern, never a guessed/sample value. Destination granularity is **Product Detail (template page)**, one level more granular than V2.0's stated "Product Family/Category" display level (see the open question flagged in HEADER VS SHOWCASE DOMAIN CONSISTENCY above) — but it is always a real, resolvable, non-404ing route (structurally guaranteed by the shared publication-gate constant), satisfying V2.0 §14's "real destination required" at minimum.

---

# PRICE AUDIT

**PASS.** Grepped `components/home/product-showcase.tsx`, `lib/catalog/editorial-repository.ts` (the `listHomepageProductCandidates` function body), and `lib/catalog/types.ts` (`HomepageProductCandidate`) for price/currency terms (`price`, `قیمت`, `ریال`, `تومان`, `IRR`, `USD`, `currency`). No price field is even *selected* by the homepage query — this is a data-layer guarantee, not merely a UI omission that a future edit could accidentally surface. `isPricePublic` exists on the broader `ProductVariant` type but is never read by the homepage path. The Homepage Price Strip is a fully separate component/data path (`components/home/price-strip.tsx`, `lib/pricing/*`) and was not touched by or confused with this audit.

---

# STOCK / INVENTORY AUDIT

**PASS.** No `stock`/`inventory`/`موجود`/`ناموجود`/`qty_available` term appears in `product-showcase.tsx` or in the `listHomepageProductCandidates` query/SELECT list. `inventory_uom` exists on `ProductVariant` (a UOM label, not a quantity) and is not read by the homepage path either. The critical regression invariant (V2.0 §21.2/§74/§81.1: `qty_available = 0` must not hide a card) is structurally satisfied because inventory is never part of the eligibility WHERE clause or the SELECT list at all — a card cannot disappear for a reason the query never checks.

---

# TRANSACTION CONTROL AUDIT

**PASS.** No "Add to Cart," "Buy Now," quantity/unit selector, or inline ordering control exists anywhere in `product-showcase.tsx`. The only interactive element per card is the single whole-card link.

---

# FA LOCALIZATION

**PASS (architecture).** `lib/content/homepage.ts#homepageCopy.fa.productShowcase` supplies real, non-fallback Persian section copy: `eyebrow: "محصولات"` (matches V2.0 §18's exact preferred heading), plus a genuine `title`/`body`/`cta`. Per-card title/summary come from `product_seo_contents.h1`/`.intro` for `locale = 'fa'` — editorial content, not a frontend dictionary. Data completeness (how many of the 3 currently-published templates have approved `fa` editorial rows) could not be verified live in this read-only worktree (no local D1 state present — see CURRENT LOCAL DATA); test-file evidence (`homepage-projection-invariants.test.ts`) references "13 templates / 237 variants / 3 currently published" as of 2026-09-03, without a locale breakdown.

---

# EN LOCALIZATION

**PASS (architecture), completeness unverified.** Same code path applies for `locale = 'en'` (`s.locale = ?` is bound per-request; `listHomepageProductCandidates` is "locale-specific by construction" per its own doc comment — an `en` candidate list cannot contain a `fa`-only slug). `homepageCopy.en.productShowcase` has genuine, translated English section copy (no leaked Persian, no placeholder text). Whether any of the 3 published templates have an *approved* English `product_seo_contents` row (required by `TEMPLATE_PUBLICATION_WHERE_CONDITIONS`) was not verifiable without live D1 access; if none do, the `en` Homepage would legitimately render the `CatalogEmptyState` "catalog is being prepared" message rather than an empty/broken section — which is the correct, spec-compliant failure mode (see COUNT 0–8 LAYOUT), not a localization bug.

---

# AR LOCALIZATION

**PASS (architecture), completeness unverified.** Identical mechanism and identical caveat as EN above. `homepageCopy.ar.productShowcase` has genuine Arabic section copy, not an English fallback string.

---

# PRODUCT MEDIA

For the 4 classification groups that currently have a dedicated image (`lib/catalog/media-registry.ts#GROUP_DEFAULT_IMAGES`, verified live against real DB_PUBLIC classification codes per the module's own header comment):

| Group | File | Format | Dimensions | File size |
|---|---|---|---|---|
| REBAR | `public/images/products/rebar.png` | PNG | 1024×1024 | ~2.3 MB |
| SHEET_PLATE | `public/images/products/sheet-plate.png` | PNG | 1024×1024 | ~2.1 MB |
| BEAMS | `public/images/products/beams.png` | PNG | 1024×1024 | ~2.0 MB |
| SEAMLESS_PIPE | `public/images/products/pipe.png` | PNG | 1024×1024 | ~1.4 MB |

Any group without a mapping (e.g. RHS/SHS hollow sections — explicitly documented in the module header as "no dedicated photo today") falls through to `public/images/products/steel-placeholder.svg` (576 bytes), a deliberately generic, non-product-specific illustration.

**Rendering (`product-showcase.tsx`):** `<Image fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover ...">` inside a `relative aspect-16/11 overflow-hidden` container. Alt text is `alt={p.title}` (the product title string) for every card — always populated, never empty.

**Findings:**
- Every source photo is a **square (1024×1024, 1:1)** asset, rendered inside a **16:11 (~1.45:1)** container with **`object-cover`**. `object-cover` will crop roughly 30% of the image's height (top+bottom combined) to fill the wider container. V2.0 §59 explicitly prefers "contain / controlled crop... rather than blind `cover`... when `cover` would cut off the recognizable geometry" of exactly these product types (rebar, pipe, plate/sheet, beams are all named). Whether the actual crop removes recognizable geometry depends on how centered/framed each source photo is — **this was assessed by static code/CSS reading only, not by rendering the page in a browser**; a live visual check is recommended before this is treated as confirmed-safe or confirmed-broken.
- The card's own proportion (`aspect-16/11` on the image area, full card height flexible below it) is close to but not exactly V2.0 §17.14's preferred "4:3 or 5:4" (16:11 ≈ 1.4545 vs 4:3 ≈ 1.333 / 5:4 = 1.25) — minor deviation.
- `alt={p.title}` duplicates the adjacent visible `<h3>{p.title}</h3>` text for screen-reader users. V2.0 §56/§78 prefers `alt=""` in exactly this "decorative image, name already in adjacent text" case to avoid duplicate announcement. Minor accessibility redundancy, not a broken/missing-alt defect.

---

# MEDIA PROVENANCE

**GAP relative to V2.0 §38–§54's full hybrid-governance model, but not unsafe.**

The current architecture has **zero Odoo image ingestion of any kind** — no fetch-from-Odoo step, no checksum comparison, no candidate/approval workflow, no `homepage-v1`/`v2`/`v3` versioning. All 12 real product photos + 1 placeholder are committed static assets under `public/images/products/`, selected purely by a hardcoded classification-code lookup table (`GROUP_DEFAULT_IMAGES`/`FAMILY_DEFAULT_IMAGES`/`TEMPLATE_XID_IMAGE_OVERRIDES`, the last currently empty). This is **stricter** than V2.0's minimum bar on one specific point — "Browser loads image from live Odoo: FORBIDDEN" (§82) is trivially satisfied because there is no Odoo image dependency at all, ever — but it does not implement the described hybrid sync/import/checksum/version pipeline (§38.1, §40–§43, §62) in any form. V2.0 §51 explicitly tolerates static repository assets "for the current small launch set," which meaningfully lowers the severity of this gap for the present scale (13 templates, a handful of classification groups), but the complete absence of *any* provenance metadata (source, checksum, approval date, rights basis — V2.0 §54) means there is currently no way to answer "where did this image come from and who approved it" other than reading the source-code comment trail in `media-registry.ts`.

Mapping is by stable classification code (`groupCode`/`familyCode`), never by localized display name — this part does correctly satisfy V2.0 §39's "map by stable identity, not localized name" rule.

---

# MEDIA REGISTRY / VERSIONING

**NOT IMPLEMENTED.** No `DRAFT/CANDIDATE → APPROVED → RETIRED/ARCHIVED` media-status lifecycle (V2.0 §44) exists in the schema or code. No version history (`homepage-v1`/`v2`) exists. `media-registry.ts` is a pure, stateless lookup function (`resolveCatalogMedia`) with no persisted state at all — "the registry" is a source-code constant map, not a database-backed registry with history.

---

# APPROVAL WORKFLOW

**NOT IMPLEMENTED.** There is no representation anywhere of a media approval decision (who approved which image for which family/role, or when). Given the static-assets-only architecture, "approval" today is implicitly whatever is committed to `public/images/products/` and referenced by the constant maps — a real but entirely code-review-based approval process, not a modeled one.

---

# MISSING MEDIA FALLBACK

**PARTIAL PASS.** `resolveCatalogMedia` is documented and structured to "never return a broken reference" — any subject with no override/group/family match falls through to `GENERIC_FALLBACK_IMAGE` (`steel-placeholder.svg`), which the module's own comment states is "not a photo of any real Ahan Asa product, so it can never misrepresent one product as another." This satisfies the *prohibited* list in V2.0 §48 (no other family's image, no random stock photo, no AI generation, no broken-image icon). It does **not** exactly match V2.0's stated *preferred* fallback — "safe text-first Product Card with neutral media surface" (§48, §76.6) — since the current fallback is still an image (a generic SVG illustration) rather than an image-less, text-first card layout. This is a minor deviation from the letter of the preferred pattern, while fully satisfying the prohibited-behavior list. Not independently testable without a fixture that constructs a `HomepageProductCandidate` with an unmapped classification code and no override; not attempted in this read-only pass (would require either live D1 data with such a product or a new test fixture — the latter is out of scope for an audit-only task).

---

# AI MEDIA PUBLICATION CHECK

**PASS (absent).** Searched `scripts/`, `lib/` for AI-image-generation terms (`dall-e`, `dalle`, `stable-diffusion`, `midjourney`, any `openai`+`image`/`generate`+`image` pattern). No matches. No automatic AI media pipeline exists anywhere in this repository.

---

# COUNT 0–8 LAYOUT

**GAP — material, latent (not currently visibly broken given today's exact real count).**

Actual grid (`product-showcase.tsx`): `<ul className="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">`. This is a single, generic responsive grid with exactly two breakpoints (2 columns ≥640px, 3 columns ≥1024px; implicitly 1 column below 640px) — the same pattern reused verbatim from the general `/products` catalog listing (`components/products/catalog-template-grid.tsx`), not a Homepage-specific composition.

Compared against V2.0's Complete Wide-Desktop Layout Matrix (§25, restated identically at §73.1):

| Count | V2.0 requires | Current grid actually produces |
|---|---|---|
| 0 | Section hidden, no placeholder | `CatalogEmptyState` renders instead (heading/CTA/body text) — section is NOT hidden; see note below |
| 1 | Centered, standard width | Auto-placed into column 1 of the active grid — not centered |
| 2 | Centered pair | Auto-placed into columns 1–2 — not centered, no whitespace balancing |
| 3 | Centered 3 | At the 3-column (lg) tier, 3 items exactly fill one row — visually matches by coincidence |
| 4 | One full 4-column row | Grid never reaches 4 columns at any breakpoint → renders 3+1 (orphan single-card row) |
| 5 | 3 + 2 centered | Grid renders 3+2 by default wrap at the 3-column tier, but the trailing 2 are left-aligned, not centered |
| 6 | 3 + 3 | Matches by coincidence at the 3-column tier (6 = 3+3 exactly) |
| 7 | 4 + 3 centered | Never reachable — `HOMEPAGE_PRODUCT_DISPLAY_COUNT = 6` caps display at 6 today; if raised, would render 3+3+1 |
| 8 | 4 + 4 | Never reachable at current config; if raised, would render 3+3+2 |
| >8 | first 8 by ranking | N/A at current 6-card cap |

The grid **never implements a 4-column tier at all** (no `xl:grid-cols-4` or equivalent), which directly contradicts V2.0 §27 ("Wide-Desktop Column Limit... Preferred maximum: 4 columns") and blocks every composition that depends on it (4, 7, 8-card rows). There is also no explicit centering treatment for undersized counts (1, 2, 3 outside the lucky 3-fills-exactly-3-columns case) — V2.0 §26/§29 explicitly calls for centering + balance over orphan rows, which this generic CSS grid does not implement (a plain `grid` with excess columns leaves trailing empty cells rather than centering the existing items).

**Why this is "latent, not currently visibly broken":** today's real published count is 3 (fills exactly 3 columns at desktop — visually indistinguishable from "centered 3"), and the configured cap is 6 (fills exactly 3+3 at desktop — visually indistinguishable from the V2.0-preferred "3+3"). The defect will become visible the moment the published count changes to anything other than a clean multiple of 3 (e.g., a single product is unpublished, going from 3→2, or a 4th product is published, going 3→4) — both are entirely plausible near-term editorial operations.

**Verification method:** static code/CSS reading only. No live browser rendering was performed for this section (no dev server was started; this is explicitly noted per the task's requirement to disclose when verification is static-only rather than rendered).

**Zero-count behavior, specifically:** the component's zero-items branch renders `<CatalogEmptyState locale={locale} variant="catalog-preparing" />` in place of the grid — this keeps the section's heading (`SectionHeading`) and the "view all products" link rendered above it, and adds a substantive, honest message ("the online catalog is being prepared... send your invoice/purchase list") rather than literally hiding the whole section. This differs from V2.0 §35's literal instruction ("Product Showcase omitted"), while fully satisfying its underlying intent (no fake/placeholder cards, no skeleton, honest operational signal, Homepage does not fail). Classified as a deviation from the letter, not the spirit, of the rule — see P2 findings.

---

# RESPONSIVE MATRIX

**Static code/CSS verification only — no live browser rendering was performed at any of the 8 requested viewports (320/360/390/430/768/1024/1280/1440).**

Reading the Tailwind breakpoints actually used (`sm:` = 640px, `lg:` = 1024px, both Tailwind v4 defaults, confirmed via no custom breakpoint overrides found in `postcss.config.mjs`/theme files):

| Viewport | Tailwind tier active | Columns actually produced | V2.0 requires |
|---|---|---|---|
| 320, 360, 390, 430 | below `sm` | 1 | "2 columns while comfortably readable... 1 column before content becomes cramped" — V2.0 expects 2 columns at typical mobile widths (390/430 are well within "comfortable"), not 1 |
| 768 | `sm` (2-col) | 2 | Tablet max 2 columns — matches |
| 1024 | `lg` (3-col) | 3 | Medium max 3 columns — matches |
| 1280, 1440 | `lg` (3-col, no higher tier) | 3 | Wide Desktop max 4 columns — does not reach 4 |

**Material finding:** the current grid jumps straight to 1 column for every width below 640px, including 390/430 which V2.0 explicitly expects to render 2 columns ("Normal mobile when cards fit comfortably → 2 columns"). This compounds the COUNT 0–8 LAYOUT gap above — it is the same underlying missing-breakpoint-tier issue, viewed from the width axis instead of the count axis.

RTL/LTR: the surrounding markup already uses CSS logical properties (`border-e`, `border-s`) consistently with the rest of the codebase's RTL-aware convention; a CSS grid's column order is direction-agnostic by default and Tailwind/the browser will lay out `[dir="rtl"]` correctly without extra work, so no RTL-specific breakage is expected from the grid itself — this part was not independently rendered/screenshotted to confirm.

---

# HORIZONTAL CAROUSEL CHECK

**PASS (absent).** Grepped `product-showcase.tsx` for `carousel`, `slider`, `swiper`, `embla`, `overflow-x-auto`, `scroll-snap`, `drag`, `autoplay`, `pagination`. No matches. The Product Showcase uses a plain CSS grid, never a horizontal-scroll pattern (unlike the Homepage Price Strip, which the spec explicitly permits to use horizontal swipe on mobile — that pattern was confirmed absent here specifically, not merely absent site-wide).

---

# MOTION

**Mostly compliant, one numeric deviation.**

- **Entrance reveal:** `components/ui/reveal.tsx` — an `IntersectionObserver`-triggered, once-only (`io.disconnect()` after first trigger) fade+translateY, `threshold: 0.12`. Matches V2.0 §64.5 "reveal once" and the general "soft section reveal" direction. Per-card stagger is `delay={i * 70}` ms (70ms increments) — close to, if larger than, V2.0's suggested ~30ms/card cadence (§64.4), though V2.0 itself says exact values are "subject to optical tuning." Not flagged as a material defect.
- **Reduced motion:** `styles/theme-extensions.css` — `@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }` — correctly disables all reveal motion. **PASS** on V2.0 §64.10.
- **Hover:** `product-showcase.tsx` applies `transition-transform duration-700 ease-out group-hover:scale-105` to the card image. V2.0 §64.7 specifies "Image: scale 1.00 → approximately 1.015... Preferred timing: ~150–180ms." The shipped values (scale 1.05, duration 700ms) are roughly **3× the preferred scale delta and 4× the preferred duration** — a materially more noticeable zoom than the frozen "extremely subtle" direction calls for. Not one of the explicitly-named forbidden patterns (§65 lists "Dramatic Glow," "3D Tilt," etc., not specifically "larger-than-spec hover scale"), but a clear numeric deviation from an explicit frozen value. **Flagged as P2.**
- No sticky/pinned scroll, no scroll-hijacking, no parallax, no 3D tilt, no flip cards, no autoplay — none found. **PASS** on the "Explicitly Rejected Motion Patterns" list (§65).

---

# SSR

**PASS.** `app/[locale]/page.tsx` is a plain async Server Component (no `'use client'` at the page level); `homepageProducts` is fetched with a server-side `await listHomepageProductCandidates(...)` call before any JSX is returned, so product names/links are present in the server-rendered HTML output. `components/home/product-showcase.tsx` itself has no `'use client'` directive, no `useEffect`, no `fetch`/SWR/React Query, and no client-side data-fetching of any kind — it is a pure server component that receives `items` as a prop and renders synchronously. **Confirmed via `npm run build`** (see BUILD below): the homepage route builds as `ƒ /:locale` (dynamic/server-rendered), not a client bundle entry.

---

# PROGRESSIVE ENHANCEMENT

**P0 FINDING — see P0 FINDINGS below for full detail.** The only client-side piece in this chain is `components/ui/reveal.tsx` (`Reveal`, `"use client"`), which wraps every `<li>` product card. Its CSS baseline (`styles/theme-extensions.css`):

```css
.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity var(--aa-motion-reveal) var(--aa-ease-enter), transform ...;
}
.reveal[data-visible="true"] {
  opacity: 1;
  transform: none;
}
```

`data-visible="true"` is set only by the `Reveal` component's own `useEffect`/`IntersectionObserver` callback — i.e., **only if the client JavaScript bundle successfully loads, hydrates, and executes**. There is no `<noscript>` override (grepped the whole repo — none exists) and no CSS `:not(.js)`/progressive-enhancement gate that would default the element to visible in the absence of JS. Baseline HTML+CSS state is `opacity: 0`, contradicting V2.0 §64.11's explicit, named rule: *"Do NOT use a baseline state in which cards are permanently `opacity: 0` until JavaScript executes. JavaScript failure must never hide Product Families."* — and the Final Acceptance Matrix (§82): *"Progressive enhancement... JavaScript failure → Product Cards remain visible and usable."*

Note: this `Reveal` component is shared site-wide (also wraps Hero/Price Strip content), so the defect is not unique to the Product Showcase's own code, but it directly and materially affects the Product Showcase's compliance with a specific, named, frozen invariant, and is therefore in-scope to report here regardless of its shared origin. Fixing it is out of scope for this read-only audit.

---

# FAILURE ISOLATION

Traced via code reading (not live-triggered, since triggering an actual D1/Odoo outage was out of scope for a read-only audit):

- **Catalog query fails:** `listHomepageProductCandidates` has no internal try/catch of its own; a D1 error would propagate up to `app/[locale]/page.tsx`'s `await`. Because this call is not wrapped in a try/catch at the page level either (confirmed by reading `page.tsx`: a bare `const homepageProducts = await listHomepageProductCandidates(...)`), an actual DB_PUBLIC read failure would currently throw an unhandled error in the page's render path, which — depending on the Next.js/vinext error boundary configuration — risks taking down the entire Homepage rather than gracefully omitting just the Product Showcase. This is a **potential gap against V2.0 §80.2** ("If Public Product Family Projection cannot be safely read: Product Showcase omitted, Homepage remains healthy... must not return 500 because of Product Showcase failure"). Not independently reproduced live in this pass (would require simulating a D1 failure, out of scope); flagged as a code-reading-level observation, not a confirmed live failure.
- **Zero products:** confirmed handled gracefully — renders `CatalogEmptyState`, not an error (see COUNT 0–8 LAYOUT).
- **Malformed one record (e.g., null `h1`):** structurally prevented from reaching the query result at all, because `s.h1 IS NOT NULL` is part of the shared publication gate — a record with a null title can never be selected in the first place.
- **Missing localization:** a template with no approved row for `locale` simply does not appear in that locale's result set (falls out at the `s.locale = ?` JOIN condition) — correctly degrades to "fewer cards" or the empty state, never a broken/blank card.
- **Missing image:** `resolveCatalogMedia` never throws and never returns an unresolved reference — always resolves to at least the generic fallback SVG (see MISSING MEDIA FALLBACK).
- **Invalid slug:** cannot occur for a rendered card — `p.slug` is read from the same `product_seo_contents.slug` column the detail page itself resolves against, gated by the same publication conditions, so a rendered Homepage card's link target is structurally guaranteed to resolve.

**Net assessment:** individual-record and media-level failure isolation is solid (structurally prevented at the SQL/gate level). Whole-query-failure isolation (an actual D1 outage) does not appear to have an explicit safety net in `app/[locale]/page.tsx` for the Product Showcase specifically — this is a plausible P1/P2-level gap worth a follow-up, but was not confirmed as an actual live failure in this read-only pass.

---

# PERFORMANCE

- **Image count:** up to `HOMEPAGE_PRODUCT_DISPLAY_COUNT` (6) images, one per card — no duplication.
- **Responsive sizing:** `sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"` is present and reasonably matches the actual 3/2/1-column grid tiers.
- **Intrinsic dimensions / CLS:** the image sits inside a `relative aspect-16/11 overflow-hidden` container with `<Image fill>` — the aspect ratio is reserved before the image loads, preventing layout shift. **PASS** on V2.0 §58/§79's "no disruptive CLS from image loading."
- **Fetch priority / eager-vs-lazy:** no `priority` prop is set on any Product Showcase `<Image>`, so Next.js `Image` defaults to lazy loading below-the-fold — the Showcase does not compete with the Hero's LCP image. **PASS** on V2.0 §79/§27's "should not compete with Hero LCP."
- **Client JavaScript:** minimal — the only client component in this surface is the shared `Reveal` wrapper (an `IntersectionObserver`, no heavy library). No Product-Showcase-specific fetch/query library ships to the client.
- **Source image weight:** the underlying static PNGs are large (~1.4–2.3 MB each, 1024×1024). Whether the actual bytes delivered to the browser are optimized derivatives depends on whether Next.js `<Image>`'s optimization pipeline is correctly wired through `@vinext/cloudflare` to the `IMAGES` Cloudflare binding declared in `wrangler.jsonc` (`"images": { "binding": "IMAGES" }`, present for both `env.staging` and `env.production`). This was **not independently live-verified** (no dev server was started, no network payload was inspected) — flagged as a note for the P1 boundary's browser-verification step rather than asserted as pass or fail.

---

# IMAGE PERFORMANCE

See PERFORMANCE and PRODUCT MEDIA above — `sizes` present, `fill` + reserved aspect-ratio container present, no `priority`/eager flag set on any card image, `object-cover` crop policy differs from V2.0's "contain/controlled crop" preference (flagged as P2 under PRODUCT MEDIA).

---

# CLS

Reserved via `aspect-16/11` on the image container — the card's image area does not depend on the image's own natural dimensions to establish layout, so a slow-loading or failed image should not shift surrounding content. **PASS** based on static CSS reading; not independently confirmed with a live CLS measurement (e.g., Lighthouse), which is out of scope for a read-only, no-browser audit pass.

---

# ACCESSIBILITY

| Criterion | Status |
|---|---|
| Semantic section/list/link structure | PASS — `<section><ul><li><a>` |
| Whole-card link when destination exists | PASS |
| Keyboard reachability | PASS (standard anchor) |
| Enter navigation | PASS (native anchor behavior) |
| Visible focus | PASS — global `:focus-visible { outline: 2px solid ... }`, not a low-contrast box-shadow |
| No nested conflicting controls | PASS — no interactive element inside the card link |
| RTL/LTR correctness | Consistent with codebase convention (`border-e`/`border-s`, `rtl:-scale-x-100` on the arrow icon); not independently screenshotted |
| `aria-labelledby` linking `<section>` to its `<h2>` | Not present — V2.0's "preferred structure" example (§72.1) shows `<section aria-labelledby="products-heading">`; current markup has a bare `<section>` with an `<h2>` inside it but no explicit `id`/`aria-labelledby` pairing. Minor (P3) — the heading is still the first heading inside the section and is discoverable by AT heading navigation, just not as robustly associated as an explicit label. |
| Duplicate alt/name announcement | `alt={p.title}` duplicates the adjacent `<h3>{p.title}</h3>` text for screen readers, where V2.0 §56/§78 prefers `alt=""` in this exact case. Minor (P3). |
| Text contrast / color-only meaning | Not independently measured (no live rendering); navy-on-white / muted-gray-on-white token usage is consistent with the rest of the (previously audited/frozen) design system. Not flagged as a new defect, not independently re-verified in this pass. |
| 320px / 200% / 400% zoom | See ZOOM / REFLOW below — static analysis only. |

---

# FOCUS

**PASS.** The site-wide `:focus-visible` rule in `styles/base.css` (`outline: 2px solid var(--aa-color-focus-ring); outline-offset: 2px;`) applies to the card's anchor with no per-component override — this is a real, visible outline (not solely a low-contrast box-shadow), satisfying V2.0 §78/§29. No hover-only content exists on the card (title and descriptor are always visible; only the directional arrow's opacity and the image's scale change on hover, and neither carries required information). No focus trap is possible on a plain anchor.

---

# ZOOM / REFLOW

**Static code/CSS analysis only — no live browser zoom testing was performed.** The card grid uses relative units (Tailwind `grid`/`gap`/`p-6`/`text-lg` etc., all rem/em-based by Tailwind convention, no fixed pixel widths found on the card or its text), and the image area is `aspect-16/11` (a ratio, not a fixed pixel box), which should reflow reasonably at 200–400% zoom and down to 320px width in principle. This was not verified by actually loading the page at those zoom levels/viewport widths in a browser, so it is reported as a plausible-based-on-code-reading expectation, not a confirmed pass.

---

# SEO / INTERNAL LINKS

**PASS.** Every card renders a real, crawlable `<a href="/{locale}/products/{slug}">` in the server-rendered HTML (confirmed via SSR analysis above) — no JS-only navigation (no `onClick`-driven `router.push`, no `<div onClick>`). `localizedPath` builds a proper locale-prefixed canonical path. Because `p.slug` is read from the same column the detail page's own canonical-route resolver uses, there is no risk of the Homepage linking to a URL the detail page would then redirect away from or 404 on.

---

# STRUCTURED DATA

**PASS (absent, correctly).** No `Product`/`Offer`/`AggregateRating`/`Review` JSON-LD is emitted by `product-showcase.tsx` (grepped for `JsonLd`, `schema`, `offer`, `aggregaterating`, `review` — no matches in this file). The Homepage's only JSON-LD is `organizationSchema()`/`websiteSchema()` at the page level (`app/[locale]/page.tsx`), unrelated to individual products. Whether `/products/[slug]` emits legitimate Product-level structured data at the detail-page level is outside this audit's scope (Product Showcase only) and was not inspected.

---

# CLAIM INTEGRITY

**PASS.** Grepped `product-showcase.tsx` and `lib/content/homepage.ts`'s `productShowcase` copy block for موجود / فوری / بهترین قیمت / ارزان‌ترین / ارسال فوری / تضمینی / "direct factory" / "factory stock" / "owned warehouse." No matches. The section copy ("هر گروه کالایی بخشی از خدمت مدیریت خرید آهن آساست — بررسی، مقایسه تأمین و هماهنگی تا تحویل" / EN/AR equivalents) makes no unverified commercial claims — it describes the procurement-management service framing consistent with `CLAUDE.md` §7's "Product Truths."

---

# CURRENT LOCAL DATA

**Could not be queried live in this worktree** — no local D1 SQLite state exists here (`find . -iname "*.sqlite*"` under a plausible `.wrangler`/D1 path returned nothing; `.wrangler/` is gitignored and evidently was never populated in this specific worktree checkout). No fake/sample rows were created to compensate, per the task's explicit instruction not to fabricate a "complete" UI.

**Best available evidence (code + test-file documentation, not independently re-verified live in this pass):**
- `lib/catalog/homepage-projection-invariants.test.ts` (file header comment): *"13 templates / 237 variants / 3 currently published"* — verified live by the implementers on 2026-09-03, per `DOCUMENT_AUDIT_REPORT.md` DAR-052.
- `lib/catalog/media-registry.ts` (file header comment): confirmed live classification codes as of 2026-09-03 — `FLAT_PRODUCTS/SHEET_PLATE`, `HOLLOW_SECTIONS_PROFILES/RHS`, `HOLLOW_SECTIONS_PROFILES/SHS`, `LONG_PRODUCTS/BEAMS`, `LONG_PRODUCTS/REBAR`, `PIPES_TUBES/SEAMLESS_PIPE`.
- `homepage_product_rank`: additive-only table, defaults every template to `base_priority = 0 / manual_boost = 0 / demand_score = 0` until a row is explicitly written; no tooling exists (checked `lib/catalog/editorial-cli.ts`) to populate a curated business sequence short of a raw D1 write.
- Locale breakdown of the 3 published templates (how many have approved `fa`/`en`/`ar` rows respectively) is **not available from any source inspected in this pass** — genuinely unknown without live D1 access.

This is reported honestly as a **data-visibility limitation of this specific read-only worktree**, not as a claim that the data doesn't exist or is broken.

---

# DATA MODEL READINESS

| Field/concept | Status |
|---|---|
| Publication eligibility | AVAILABLE — `catalog_products.is_active/is_public`, `product_seo_contents.content_quality_status/published_at/h1` |
| Homepage eligibility (distinct from public eligibility) | MISSING — no `show_on_homepage`-equivalent column exists anywhere |
| Homepage sequence | PARTIAL — `homepage_product_rank.base_priority`/`manual_boost` columns exist and are wired into the ranking query, but default to 0 for every template and have no operator tooling to populate deliberately (raw D1 write only) |
| Stable ID | AVAILABLE — `catalog_products.id` (ULID), `catalog_products.template_xid` (Odoo-sourced stable identity) |
| Localized name | AVAILABLE — `product_seo_contents.h1` per `(entity_id, locale)` |
| Slug | AVAILABLE — `product_seo_contents.slug` per `(entity_id, locale)`, unique-indexed |
| Public media reference | PARTIAL — resolved via a stateless code lookup (`media-registry.ts`), not a genuine per-product/per-locale DB-backed media-reference column with version/approval metadata |
| Family/category identity | AVAILABLE — `product_variants.family_code`/`group_code` (Odoo-sourced classification), surfaced to the Homepage candidate as `familyCode`/`groupCode` (fetched but currently unused by the rendered card) |

No migration was created or proposed as part of this audit (explicitly out of scope). See PRODUCT-SHOWCASE-P1 BOUNDARY for what a future migration would likely need to add.

---

# REQUIRED V2.0 RULES

(A) Frozen, required, and currently satisfied: source-of-truth (no hardcoded commercial list), no price, no stock-driven visibility, no transaction controls, no deep technical detail on cards, whole-card link with real destination, no horizontal carousel, SSR-first with real HTML links, no live Odoo render dependency, no AI auto-publication, deterministic tie-break ordering, max-8 cap, reduced-motion support, visible keyboard focus, no fabricated claims.

(A) Frozen, required, and currently NOT satisfied (see P0/P1 findings): JavaScript-failure visibility (§64.11/§82), the exact 0–8 responsive composition matrix (§25/§73.1), the distinct homepage-eligibility concept separate from public-catalog eligibility (§5/§68/§75).

(B) Optional/future enhancements correctly NOT implemented (and NOT recommended by this audit, per the task's explicit instruction not to recommend them absent a later frozen spec): AI-generated media, dynamic/real-time popularity ranking (the "auto" mode exists in code but is off in every deployed environment — correct current state), carousel, live price, inventory indicators, advanced/dramatic animation, a 100-point automated scoring engine (V2.0 §68.1 explicitly says this is not required).

---

# OPTIONAL / FUTURE ITEMS

- Demand-informed "auto" ranking mode (already built, correctly disabled by default) — any future activation should go through explicit, documented business/owner approval per V2.0 §68.10, not a routine env-var flip.
- Full Odoo→Website media hybrid sync/versioning/approval pipeline (§38–§54) — V2.0 itself treats this as acceptable to defer at current launch scale (§51); a future phase, not a P0/P1 blocker today.
- Per-template image override tooling (`TEMPLATE_XID_IMAGE_OVERRIDES` — structurally ready, currently empty, no editor UI exists).
- `homepage_sequence` curation tooling (CLI or admin UI to set `base_priority`/`manual_boost` without a raw D1 write).

---

# P0 FINDINGS

**P0-1 — Product Showcase cards are permanently invisible if client JavaScript fails to load or execute.**

`components/ui/reveal.tsx` (shared, wraps every product card via `<Reveal as="li">`) relies on an `IntersectionObserver` callback to set `data-visible="true"`. The corresponding CSS (`styles/theme-extensions.css`) sets `.reveal { opacity: 0; transform: translateY(14px); }` as the unconditional baseline, with no `<noscript>` override and no CSS fallback that defaults to visible without JS. This directly contradicts V2.0 §64.11 ("Do NOT use a baseline state in which cards are permanently `opacity: 0` until JavaScript executes. JavaScript failure must never hide Product Families.") and the Final Acceptance Matrix (§82: "Motion required for usability | FORBIDDEN"; "Progressive enhancement... JavaScript failure → Product Cards remain visible and usable"). The underlying HTML (title, link, image markup) is present in the SSR output and reachable by crawlers/AT that don't execute JS-driven visual state, but a human visitor whose JS fails, is blocked, or is slow to hydrate sees a blank section where the Product Showcase should be. This is a shared-component defect (also affects Hero/Price Strip), not unique to the Product Showcase's own code, but it is squarely in-scope to report here because it directly violates a specifically-named, frozen Product Showcase invariant. Not fixed in this pass (read-only audit).

---

# P1 FINDINGS

**P1-1 — No 0–8 responsive layout composition matrix; current grid never reaches 4 columns and centers nothing.** See COUNT 0–8 LAYOUT and RESPONSIVE MATRIX. Latent — currently masked by the real published count (3) and the display cap (6) both being clean multiples of the grid's 3-column tier; will visibly break at any other count (1, 2, 4, 5, 7, 8), which is a plausible near-term editorial event.

**P1-2 — No distinct "homepage eligibility" concept; homepage curation is currently indistinguishable from plain public-catalog publication.** See HOMEPAGE ELIGIBILITY. No `show_on_homepage` column or equivalent exists; every publicly published template is a homepage candidate by default, curated only by ranking + a hard limit. There is no way today to publish a product to `/products` while deliberately keeping it off the Homepage.

**P1-3 — Odoo→Website media hybrid governance pipeline (sync/versioning/checksum/approval, V2.0 §38–§54) does not exist in any form.** See MEDIA PROVENANCE / MEDIA REGISTRY / APPROVAL WORKFLOW. Mitigated in severity by V2.0 §51's explicit tolerance of static repository assets at the current small launch scale, and by the current approach being safe (no live Odoo dependency, no misleading fallback) — but the complete absence of any provenance/versioning/approval representation is a real architecture gap against the frozen spec, not merely a "not yet populated" data gap.

**P1-4 — No explicit try/catch around the Homepage's catalog query in `app/[locale]/page.tsx`; a DB_PUBLIC read failure could propagate as an unhandled error rather than gracefully omitting the Product Showcase.** See FAILURE ISOLATION. Not confirmed as a live failure in this pass (would require simulating a D1 outage, out of scope for read-only audit); flagged from code reading as a plausible gap against V2.0 §80.2.

---

# P2 FINDINGS

**P2-1 — Hover motion exceeds the frozen numeric bounds.** Image hover scale 1.05 / duration 700ms vs. V2.0 §64.7's "approximately ≤1.015" / "~150–180ms."

**P2-2 — `object-cover` on square (1024×1024) source photos inside a 16:11 container risks cropping recognizable product geometry**, where V2.0 §59 prefers `contain`/controlled crop for exactly these product types. Static-analysis finding only; actual crop severity not visually confirmed.

**P2-3 — Zero-candidate state renders a substantive `CatalogEmptyState` message (with heading/CTA) rather than literally hiding the section**, deviating from V2.0 §35's literal "Product Showcase omitted" instruction while preserving its underlying intent (no fake cards, no failure, honest operational signal).

**P2-4 — Card grain is individual product template, not consolidated Product Family/group**, which is one level more granular than V2.0 §3's stated Homepage display level. Not confirmed as an actual live problem (would require live family/group distribution data this worktree couldn't access), but flagged as an open architectural question for the P1 boundary.

**P2-5 — Auto (demand-based) ranking mode exists in code and is correctly off in both environments today, but has no documented governance rule requiring explicit owner approval before ever being switched on** (V2.0 §68.10's "owner/business governance approves" is not backed by any process/checklist found in this repo).

---

# P3 FINDINGS

**P3-1 — `alt={p.title}` duplicates the visible `<h3>{p.title}</h3>` text for screen readers**, where V2.0 §56/§78 prefers `alt=""` for a purely decorative/representative image whose information is already in adjacent text.

**P3-2 — No explicit `aria-labelledby` linking the `<section>` to its `<h2>`**, unlike V2.0 §72.1's preferred markup example. The heading is still present and correctly ordered; this is a robustness nicety, not a broken-accessibility defect.

**P3-3 — Card image aspect ratio (16:11 ≈ 1.4545) is close to but not exactly V2.0 §17.14's preferred 4:3 (1.333) or 5:4 (1.25).**

**P3-4 — Section heading/body/CTA copy differs from V2.0's suggested exact Persian wording** — explicitly permitted (V2.0 states these are "preferred direction," not mandatory copy); noted for completeness only, not a defect.

---

# PRODUCT-SHOWCASE-P1 BOUNDARY

The smallest coherent next phase, in priority order (not implemented in this pass):

1. **Progressive-enhancement fix (addresses P0-1).** Either (a) change `.reveal`'s baseline to `opacity: 1` and only apply the pre-reveal hidden state via a class the `Reveal` component itself adds client-side after mount (so no-JS always renders visible), or (b) gate the whole `opacity: 0` rule behind a `:has()`/JS-added root class so the CSS itself can never hide content before JS has proven it will run. Files: `styles/theme-extensions.css`, `components/ui/reveal.tsx`. No DB_PUBLIC change. Requires a visual regression check (with JS disabled) as part of verification.
2. **Layout matrix fix (addresses P1-1).** Replace the generic `sm:grid-cols-2 lg:grid-cols-3` grid in `components/home/product-showcase.tsx` with count-aware composition — likely a small lookup from `items.length` to a Tailwind class set (or a CSS `:has()`/`nth-child` based rule set) implementing 1/2/3-centered, 4-full-row, 5→3+2, 6→3+3, 7→4+3, 8→4+4, plus a genuine `xl:` 4-column tier and a mobile-2-then-1 threshold. Files: `components/home/product-showcase.tsx`, possibly `styles/theme-extensions.css`. No DB_PUBLIC change. Requires live-browser verification at all 8 requested viewports × representative counts 0–8 (test fixtures, not live production data, per the task's own constraint against fabricating "complete" data).
3. **Homepage-eligibility flag (addresses P1-2).** Add a `show_on_homepage` (or equivalently-named) boolean to `homepage_product_rank` (additive `ALTER TABLE ... ADD COLUMN` migration, default matching current behavior — e.g. default `1`/true — so no existing product silently disappears on migration), and add `hpr.show_on_homepage = 1` (or `hpr IS NULL` treated as "eligible" for backward compatibility, decided explicitly rather than silently) to `listHomepageProductCandidates`'s WHERE clause. Requires a small CLI/tooling addition to `lib/catalog/editorial-cli.ts` so this is operator-settable without a raw D1 write. **DB_PUBLIC migration: YES** (additive only, no data loss risk if defaulted correctly).
4. **Media governance minimum viable step (addresses P1-3), lower priority given V2.0 §51's explicit launch-scale tolerance.** At minimum, record basic provenance metadata (source, approval date, who approved) for the currently-committed static assets, even without a full Odoo-sync pipeline. Full hybrid sync is a larger future phase, not required immediately.
5. **Explicit failure boundary around the homepage catalog query (addresses P1-4).** Wrap the `listHomepageProductCandidates` call in `app/[locale]/page.tsx` in a try/catch that falls back to an empty array (rendering the existing `CatalogEmptyState` path) on any read failure, matching the pattern already used for the Price Strip's feature-flag-gated fetch. No DB_PUBLIC change.

None of the above were implemented in this pass — this section is a boundary definition only, per the task's explicit "DO NOT implement them" instruction.

---

# DB_PUBLIC CHANGE REQUIRED

**YES, for item 3 above (homepage-eligibility flag) if that P1 item is pursued.** Everything else in the P1 boundary can be done without a schema change. No migration was created or applied in this audit pass.

---

# FILES CREATED

`docs/product-showcase/PRODUCT_SHOWCASE_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (this file). No other file was created.

---

# FILES MODIFIED

None. This audit made no changes to any runtime code, test, configuration, or other documentation file. (`node_modules/` was installed via `npm ci` to enable running the test/build commands below — this directory is gitignored and does not appear in `git status`.)

---

# TEST RESULTS

`npm test` (`node --test lib/**/*.test.ts components/**/*.test.ts`):

```
ℹ tests 891
ℹ suites 0
ℹ pass 891
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

**891/891 passing, 0 failures.** No test was modified or added as part of this audit.

---

# TSC

`npx tsc --noEmit` — **clean, zero errors, exit code 0.**

---

# BUILD

`npm run build` (`vinext build`) — **succeeded cleanly.** All 5 build stages (client references, server references, RSC environment, client environment, SSR environment) completed without error. Route output confirms the homepage renders as a dynamic/server route:

```
  Route (app)
  ┌ ƒ /:locale
  ├ ƒ /:locale/about
  ├ ƒ /:locale/contact
  ├ ƒ /:locale/industries
  ├ ƒ /:locale/markets
  ├ ƒ /:locale/products
  ├ ƒ /:locale/products/:slug
  ├ ƒ /:locale/request
  ├ ƒ /:locale/services
  ├ λ /api/hello
  └ λ /api/rfqs

  Build complete. Run `vinext start` to start the production server.
```

---

# GIT

`git status --short` — clean (only the presence of this new report file after it is written/committed). `git diff --check` — no whitespace-error issues. No push, no deploy, no migration applied to any database (local, staging, or production) as part of this audit.

---

# PRODUCTION SAFETY

No runtime code, test, migration, or configuration file was modified. No database (local, staging, or production) was written to. No asset was replaced or deleted. `npm ci` created a local, gitignored `node_modules/` directory solely to run the read-only verification commands requested by the task (`npm test`, `npx tsc --noEmit`, `npm run build`); this has no effect on the committed repository state. Nothing was pushed or deployed.

---

# RISKS

- **P0-1's real-world exposure depends on actual JS-failure/hydration-failure rates** on the live site (ad blockers, script errors, very slow connections, JS disabled) — impossible to quantify from this audit alone, but the failure mode (an entire homepage section silently blank) is severe when it does occur.
- **P1-1's layout defect is currently latent** because of a coincidental alignment between the real data count (3) and the display cap (6) with the grid's 3-column tier — any routine content operation (publishing or unpublishing a single product) could surface it without any code change at all.
- **Data-completeness claims for EN/AR (FA LOCALIZATION / EN LOCALIZATION / AR LOCALIZATION / CURRENT LOCAL DATA sections) rely on test-file comments dated 2026-09-03, not a live query performed in this pass** — if content has changed materially since then, those specific counts may be stale (the architecture-level PASS findings do not depend on this and remain valid regardless).
- **No live browser verification was performed anywhere in this audit** (see the explicit list in the next section) — several findings (crop severity, actual zoom/reflow behavior, actual RTL rendering, actual JS-failure visual behavior) are based on static code/CSS reading and could theoretically look better or worse than predicted once rendered.

---

# NEXT PHASE

Recommend PRODUCT-SHOWCASE-P1 scoped to, in order: (1) the progressive-enhancement fix (P0-1 — small, high-value, low-risk), (2) the layout matrix fix (P1-1 — the most likely to cause a visible, near-term regression), (3) the homepage-eligibility flag (P1-2 — a genuine, if currently-tolerable, curation gap), with the media-governance and failure-boundary items (P1-3, P1-4) following once the above are validated with live browser verification at the full locale × viewport × count matrix V2.0 §83 specifies. This audit does not authorize or begin that implementation.

---

## Explicit static-analysis-only disclosures (no live browser used in this audit)

- COUNT 0–8 LAYOUT
- RESPONSIVE MATRIX
- ZOOM / REFLOW
- CLS (no Lighthouse/live measurement)
- PERFORMANCE's "source image weight actually delivered" sub-finding (Cloudflare Images pipeline wiring not independently confirmed)
- Actual crop severity under PRODUCT MEDIA / IMAGE PERFORMANCE
- RTL/LTR rendering correctness (inferred from consistent logical-property usage, not screenshotted)
- FAILURE ISOLATION's "whole-query-failure" sub-finding (traced from code, not triggered live)

No browser (live or headless) was launched at any point in this audit. All rendering-dependent findings above are explicitly qualified as static-code/CSS-reading conclusions, not observed behavior.
