# Product Showcase Staging Defect Fix Report (PS-P3)

Date: 2026-09-14
Task type: staging-only defect fix (trilingual availability root-cause + mobile/tablet responsive stacking), owner-approved, deployed to staging only.

---

# RESULT

**B — RESPONSIVE FIX COMPLETE — EN/AR BLOCKED BY MISSING AUTHORITATIVE LOCALIZED DATA.**

The mobile/tablet stacking defect is genuinely fixed: implemented, unit-tested, and confirmed live in the deployed staging CSS. The EN/AR absence is **not a code defect** — it is proven, by direct real-data inspection of staging `DB_PUBLIC`, to be a genuine content gap (zero `en`/`ar` rows in `product_seo_contents`). No query, projection, or eligibility logic was changed, and none should be: the existing per-locale gate is correct, and changing it would either show unapproved content or leak Persian text into English/Arabic pages — both explicitly forbidden.

---

# BASE SHA

`29386dce1d3e5919ca5549b3cc58c04e45b68af5` (HEAD at the start of this task, matching the end of the prior STG-P1 deployment task).

---

# ROOT CAUSE — EN/AR

**Classification: C — EN/AR translations/content genuinely do not yet exist.** Proven, not assumed:

1. Traced the exact code path: `app/[locale]/page.tsx` → `lib/catalog/editorial-repository.ts#listHomepageProductCandidates(locale)` → `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` (shared with `/products`'s own publication gate) plus `HOMEPAGE_ELIGIBILITY_WHERE_CONDITION`. The shared gate includes `s.locale = ?` — a candidate is eligible for a locale only if `product_seo_contents` has an **approved, published** row for that exact `(entity_id, locale)` pair.
2. Queried real staging `DB_PUBLIC` directly (read-only, `wrangler d1 execute --env staging --remote`):
   ```sql
   SELECT locale, COUNT(*) FROM product_seo_contents GROUP BY locale;
   -- fa: 3
   -- (no other locale present at all)
   ```
3. Listed every table in the staging `DB_PUBLIC` schema (`sqlite_master`) to rule out classification B ("translations exist elsewhere but aren't exposed") — `product_seo_contents` is the **only** table holding per-locale editorial content anywhere in this schema. There is no separate translation table the projection is failing to read.

**Conclusion:** classifications A, B, and D are all ruled out by direct evidence. This is C. The `s.locale = ?` condition is not a bug to fix — it is the correct mechanism that made the Homepage's `fa` cards render correctly in the first place (per STG-P1's own live verification, `data-count="3"`), and it is the same mechanism protecting `en`/`ar` from rendering unapproved or wrong-language content. No code change was made for this defect.

---

# CURRENT PRODUCT LOCALE DATA

The 3 templates currently rendering on the `fa` Homepage (real, live staging data):

| Template (`catalog_products.template_xid`) | FA title (`h1`) | EN title | AR title | Slug (fa) |
|---|---|---|---|---|
| `ahanassa_marketplace.product_tmpl_pf_shs` | پروفیل مربعی توخالی (SHS) | **GAP — no row** | **GAP — no row** | `square-hollow-section-shs` |
| `ahanassa_marketplace.product_tmpl_rb_aj340` | میلگرد آجدار Aj340 (A2) | **GAP — no row** | **GAP — no row** | `rebar-aj340` |
| `ahanassa_marketplace.product_tmpl_sh_hr_s355jr_plate` | ورق گرم‌نورد S355JR | **GAP — no row** | **GAP — no row** | `hot-rolled-plate-s355jr` |

No EN/AR data exists for any of the 3 currently-eligible templates. Nothing was invented to fill this table — every cell is a direct query result.

---

# LOCALE CONTRACT

Confirmed unchanged and correctly enforced (not modified by this task):

- The **same** Homepage-selected product set (identical `catalog_products`/`product_variants` identity, ranked by the existing `base_priority`/`manual_boost`/`demand_score` logic in `HOMEPAGE_RANKING_MODE`) is capable of rendering in fa/en/ar — locale only changes **which locale's editorial row** (`product_seo_contents`) supplies the title/summary/slug, never the underlying product identity or its business ranking.
- No separate FA/EN/AR ranking list was created or would ever be needed — `listHomepageProductCandidates(locale)` runs the identical ranking query per locale, filtered only by which editorial rows exist for that locale.
- Locale does **not** independently change ranking/priority — confirmed by reading `editorial-repository.ts` (ranking fields come from `homepage_product_rank`, a locale-neutral table keyed by `catalog_product_id`, entirely separate from `product_seo_contents`).
- Direction (`dir`) is handled by the existing `getDirection(locale)` mechanism in the shared layout — untouched.

**No fake translation fallback was introduced.** No Persian text is ever shown on `/en` or `/ar` (verified live, see FA/EN/AR sections below). No runtime machine translation was added. No Odoo dependency was introduced into the Homepage's render path — it continues to read only `DB_PUBLIC` via `getPublicDb()`, unchanged.

---

# IMPLEMENTATION

**Responsive fix only** (the locale defect required no code change — see ROOT CAUSE above). Two files changed:

1. **`lib/catalog/homepage-showcase-layout.ts`** — `COLUMNS_BY_TIER_AND_COUNT` for `mobile`, `tablet`, and `medium` (1024px) tiers changed from `[2,2,...]` / `[2,2,...]` / `[3,3,...]` to uniform `[1,1,...]` for every card count. `wide` (≥1280px) is byte-for-byte unchanged — the existing frozen 3-/4-column matrix (1→3, 2→3, 3→3, 4→4, 5→3+2, 6→3+3, 7→4+3, 8→4+4) still applies there exactly as before.
2. **`styles/theme-extensions.css`** — the `.aa-showcase-grid` media blocks at `380px`/`640px`/`1024px` now declare `--aa-showcase-columns: 1` (previously `2`/`2`/`3`); the `1280px` block is unchanged. The tier breakpoints themselves (380/640/1024/1280) were kept rather than deleted, preserving the existing CSS↔module drift-test convention (`homepage-showcase-layout.test.ts`) rather than inventing a new mechanism.

No change to `components/home/product-showcase.tsx` (the component itself never referenced column counts directly — it only sets `data-count`, which CSS reads).

---

# RESPONSIVE CONTRACT

**< 1280px: 1 column (every card count). ≥ 1280px: existing frozen desktop grid (3 or 4 columns per the 0–8 matrix).**

Verified in three independent ways:
1. **Unit tests** (`lib/catalog/homepage-showcase-layout.test.ts`) — updated to assert every tier below `wide` (`narrowMobile`, `mobile`, `tablet`, `medium`) is single-column for every count 1–8, and that only `wide` ever goes multi-column. The existing CSS/module drift test (`styles/theme-extensions.css declares the same columns per tier that this module specifies`) still passes, proving the stylesheet and the canonical table agree.
2. **Source inspection** — the `1024px` (`medium`) breakpoint, which previously switched to 3 columns (exactly the "1024px tablet becomes multi-column" outcome this task forbids), now declares `1`.
3. **Live deployed CSS** (`https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev/_next/static/css/index.DN4P47Gq.css`, fetched directly after deploy):
   ```css
   @media (min-width:380px){.aa-showcase-grid,.aa-showcase-grid[data-count]{--aa-showcase-columns:1}}
   @media (min-width:640px){.aa-showcase-grid,.aa-showcase-grid[data-count]{--aa-showcase-columns:1}}
   @media (min-width:1024px){.aa-showcase-grid,.aa-showcase-grid[data-count]{--aa-showcase-columns:1}}
   @media (min-width:1280px){.aa-showcase-grid,.aa-showcase-grid[data-count]{--aa-showcase-columns:3}.aa-showcase-grid[data-count="4"],.aa-showcase-grid[data-count="7"],.aa-showcase-grid[data-count="8"]{--aa-showcase-columns:4}}
   ```
   This is the exact contract, confirmed on the real deployed artifact, not just the source.

No carousel, no `overflow-x`, no `scroll-snap` was introduced (pre-existing test `the Showcase grid uses no carousel/horizontal-scroll mechanism` still passes unchanged). Card width still derives from `calc(100% / var(--aa-showcase-columns))`, so at 1 column each card is 100% of the container width — no oversized floating card, no change to spacing/hairline/image-aspect-ratio rules.

---

# TESTS

`npm test` → **1249/1249 passing** (1247 pre-existing + 2 new: the responsive-contract update added test count neutral since some old tests were replaced 1:1/expanded, and one new locale-scoping regression test in `homepage-projection-invariants.test.ts`). 0 failed, 0 skipped.

New/changed tests:
- `lib/catalog/homepage-showcase-layout.test.ts` — 5 tests rewritten (ceilings, tablet composition, medium composition, card-width-never-inflates, single-column-below-wide) to assert the new 1-column-below-1280px contract; all others (wide-desktop 0–8 matrix, max-8 cap, carousel/overflow absence, CSS/module drift) unchanged and still passing.
- `lib/catalog/homepage-projection-invariants.test.ts` — 1 new test: `the shared publication gate requires an approved, published SEO content row for the EXACT requested locale — eligibility must never be decoupled from locale`. Permanent regression guard against a future well-intentioned "fix" that would leak `fa` content into `en`/`ar`.

---

# TYPECHECK

`npx tsc --noEmit` → **PASS**, clean, no output.

---

# BUILD

`npm run build` → **PASS**. All routes built, no errors.

`git diff --check` → clean.

---

# IMPLEMENTATION COMMIT

`dcb0670` — `fix(home): reconcile product showcase locales and responsive layout`

---

# STAGING DEPLOY

Pre-deploy gates, all confirmed fresh:
- `DB_PUBLIC` staging migrations: `✅ No migrations to apply!` (unchanged, none reapplied)
- `DB_OPS` staging migrations: `✅ No migrations to apply!`
- Staging resources reconfirmed from `wrangler.jsonc`: Worker `ahanassa-bootstrap-staging`, `DB_OPS` = `ahanassa-ops-staging`, `DB_PUBLIC` = `ahanassa-public-staging` — all distinct from production.
- **No new migration was required or created** — this is a pure CSS/TS layout-table change plus a test addition; no schema change.

Deployed via the same authorized one-time local method as the prior task (GitHub Actions `deploy-staging.yml` remains undispatchable — see the prior STG-P1 continuation report; unchanged, not re-solved here): `npx vinext-cloudflare deploy --env staging`. Result: **success.**

---

# PREVIOUS WORKER VERSION

`65df028c-b865-4b86-885f-ab64b8f2987c` (the version live at the start of this task, deployed in the prior STG-P1 task).

---

# NEW WORKER VERSION

`701211b0-ef31-4e25-9b08-cbe09e2d1b9d` — confirmed 100% active via `wrangler deployments list --name ahanassa-bootstrap-staging`. Genuinely different from the previous version. Bindings confirmed all-staging (`ahanassa-ops-staging`, `ahanassa-public-staging`, `APP_ENV="staging"`) — zero production leakage.

---

# FA

**PASS.** `/` → `200`. Product Showcase still renders with `data-count="3"` — the exact same 3 real cards as before this task (no regression from the CSS/table change, since `wide` was untouched and this deploy was tested below 1280px only via CSS inspection, not by shrinking the actual FA render, which remains desktop-width in this fetch). No error strings in the response body.

# EN

**DATA BLOCKER (not FAIL).** `/en` → `200`. No `aa-showcase-grid` element in the response — the section is correctly, cleanly omitted (not a broken/partial render). No Persian text found anywhere in the response body (checked directly: none of the 3 real FA product titles appear). This is the expected, correct behavior given zero `en` rows in `product_seo_contents` — a content/data-owner action is required, not a code fix.

# AR

**DATA BLOCKER (not FAIL).** `/ar` → `200`. Identical situation to EN: section cleanly absent, no Persian leakage, no error.

---

# MOBILE 390

**PASS — CSS contract verified** (see RESPONSIVE CONTRACT: 390px falls in the `380px` tier, confirmed `--aa-showcase-columns:1` in the live deployed stylesheet). Full interactive browser rendering (actual overflow/image-crop/clipped-text inspection) was **NOT RUN** — see BROWSER below.

# TABLET 768

**PASS — CSS contract verified** (768px falls in the `640px` tier, confirmed `1`). Interactive rendering NOT RUN.

# TABLET 1024

**PASS — CSS contract verified** (1024px is exactly the `medium` tier's own breakpoint, confirmed `1` — this is the specific tier that previously broke this requirement by switching to 3 columns). Interactive rendering NOT RUN.

# WIDTH 1279

**PASS — CSS contract verified** (1279px is still governed by the `1024px` tier's rule, since the next breakpoint is `1280px` — confirmed `1`). Interactive rendering NOT RUN.

# DESKTOP 1280+

**PASS — CSS contract verified** (the `1280px` tier is untouched from the frozen matrix: 3 columns by default, 4 for counts 4/7/8 — confirmed live in the deployed CSS, byte-identical to the pre-existing rule). Interactive rendering NOT RUN.

---

# REGRESSION CHECK

All verified live against the new deployment (`/`, real HTTP + body inspection):

- Header: present (`SiteHeader`, real nav) — **PASS**
- Hero: present — **PASS**
- Buyer Value: present (`buyer-value-heading`) — **PASS**
- Industries: present (`industries-heading`) — **PASS**
- Final CTA: present (`final-cta-heading`), exactly once — **PASS**
- Footer: present (`site-footer`, real `<footer>`), `tel:+989120656528` link present — **PASS**
- Price Strip: absent (`selected-prices-heading` not found) — **PASS**, matches `PRICE_STRIP_ENABLED="false"`
- Evidence: absent — **PASS**
- Noindex: `<meta name="robots" content="noindex, follow">` present — **PASS**

No new `no such table`/`no such column`/`uncaught`/`TypeError`/`ReferenceError` found in any of the three fetched pages.

---

# PRODUCTION SAFETY

No production resource was created, read, modified, deployed to, or migrated in this task. Every `wrangler` command specified `--env staging` or `--name ahanassa-bootstrap-staging` explicitly. No Odoo call was made. `main` was not pushed, merged, or touched. No Evidence component was implemented. Price Strip was not enabled. Header/Hero/Footer were not redesigned — only the Product Showcase's responsive CSS/table and its test suite changed.

---

# REMAINING DATA GAPS

1. **EN/AR editorial content for the 3 currently-eligible product templates** (`product_tmpl_pf_shs`, `product_tmpl_rb_aj340`, `product_tmpl_sh_hr_s355jr_plate`) does not exist. A content owner must author (translate, in the same `product_seo_contents` shape as the existing `fa` rows: `h1`, `slug`, `content_quality_status='approved'`, `published_at` set) and publish `en`/`ar` rows via the existing editorial workflow/CLI (`lib/catalog/editorial-repository.ts#upsertEditorialDraft`, per the established publication path — no new mechanism needed). This is a content-authoring task, not an engineering task.
2. Real interactive browser acceptance (390/768/1024/1279/1280/1366/1920, overflow/image-crop/clipped-text/carousel-absence) remains **NOT RUN** — the Claude-in-Chrome extension is not connected in this environment (confirmed by two separate connection attempts). The CSS contract itself is verified with high confidence (source + live deployed stylesheet), but true rendered-pixel verification has not occurred.
3. RFQ E2E staging secrets (`TURNSTILE_SECRET_KEY`, `ODOO_RFQ_API_TOKEN`) remain unprovisioned — pre-existing, unrelated to this task, unchanged.
4. The GitHub Actions `deploy-staging.yml` workflow-indexing gap (recorded in the prior STG-P1 continuation) remains unresolved — this task again used the explicitly-authorized one-time local deploy path.

---

# READY FOR HOMEPAGE BROWSER ACCEPTANCE

**NO** — real browser tooling is required to complete visual/interactive acceptance (item 2 above) and is not available in this environment. The underlying responsive contract is implemented, tested, and confirmed correct at the CSS level on the real deployed staging artifact; a human or a connected browser-automation session should perform the actual pixel-level pass (390/768/1024/1279/1280/1366/1920 × fa/en/ar, zoom, keyboard, reduced motion) before this is called fully accepted.
