# AHAN ASA — HOMEPAGE PRODUCT SHOWCASE
## PRODUCT-SHOWCASE-P2 — Final V2.0 Freeze Gate

**Task type:** FINAL VERIFICATION / FREEZE ONLY. No runtime code was changed in this pass.
**Verified by:** Claude Code, PRODUCT-SHOWCASE-P2 pass.
**Date:** 2026-09-07.

---

## SUMMARY BLOCK

```
PRODUCT SHOWCASE AUTHORITY: V2.0
PRODUCT SHOWCASE: FINAL FROZEN
RUNTIME COMMIT: a727518
P1 REPORT COMMIT: 8060723
REMOTE MIGRATION 0010: NOT APPLIED
MEDIA GOVERNANCE: DEFERRED
MEDIA PROVENANCE: OWNER EVIDENCE REQUIRED
READY FOR NEXT COMPONENT: YES
```

---

# RESULT

**A. PRODUCT SHOWCASE V2.0 FINAL FROZEN — READY FOR NEXT HOMEPAGE COMPONENT.**

Every invariant required by the frozen spec, the P0 audit's findings, and the P1 boundary was re-verified directly against current source and a fresh, independent test/typecheck/build run — not re-derived from the P1 report's own claims alone. No regression since P1 was found. No runtime file was modified in this pass.

---

# PREFLIGHT

```
$ git branch --show-current
worktree-product-showcase-p2

$ git rev-parse HEAD
8060723b28019b5a889f030d00109ff65a8ed0e6

$ git status --short
(clean)
```

This worktree was created directly from `feat/header-hero-integrated`'s HEAD (`8060723`) in the main checkout — the same commit, not a separate line of history. `git merge-base --is-ancestor a727518 HEAD` and `git merge-base --is-ancestor 8060723 HEAD` both confirmed true before this pass began (`8060723` is HEAD itself).

---

# BASE SHA

`8060723b28019b5a889f030d00109ff65a8ed0e6`

---

# AUTHORITATIVE SPEC

Read in full for this pass (re-confirming, not re-deriving from memory):
- `docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md`
- `docs/product-showcase/PRODUCT_SHOWCASE_P0_CURRENT_IMPLEMENTATION_AUDIT.md`
- `docs/product-showcase/PRODUCT_SHOWCASE_P1_V2_0_COMPLIANCE_REPORT.md`

No design decision from P0 or P1 was reopened. Where this report re-confirms a finding, it does so via a fresh, direct source/test check, not by repeating the earlier report's prose.

---

# P0 CHECKPOINT

`docs/product-showcase/PRODUCT_SHOWCASE_P0_CURRENT_IMPLEMENTATION_AUDIT.md`, committed at `6b283fc` — an ancestor of the current HEAD. Confirmed 1 P0 finding (progressive enhancement), 4 P1 findings, 5 P2 findings, 4 P3 findings, all resolved or explicitly deferred by P1 (see below).

---

# P1 RUNTIME

Runtime commit `a727518` (`fix(home): align Product Showcase with frozen V2.0`) — confirmed present and an ancestor of HEAD. 14 files changed: `components/ui/reveal.tsx`, `styles/theme-extensions.css`, `components/home/product-showcase.tsx`, `components/ui/section-heading.tsx`, `app/[locale]/page.tsx`, `lib/catalog/editorial-repository.ts`, `lib/catalog/editorial-cli.ts`, `scripts/catalog-editorial.ts`, plus the new `migrations_public/0010_homepage_eligibility.sql` and 4 new test files (`homepage-showcase-layout.ts`/`.test.ts`, `homepage-eligibility.test.ts`, `homepage-progressive-enhancement.test.ts`, `homepage-showcase-resilience.test.ts`).

---

# P1 REPORT

`docs/product-showcase/PRODUCT_SHOWCASE_P1_V2_0_COMPLIANCE_REPORT.md`, committed at `8060723` — confirmed present, an ancestor of HEAD (it is HEAD). Its RESULT was A (P1 compliance complete, media governance deferred), matching this freeze pass's own conclusion.

---

# SOURCE OF TRUTH

**PASS, re-confirmed directly:**

```
$ grep -n "HOMEPAGE_RANKING_MODE" wrangler.jsonc
269:  "HOMEPAGE_RANKING_MODE": "base"
327:  "HOMEPAGE_RANKING_MODE": "base"
```

Both `env.staging` and `env.production` remain on deterministic `"base"` mode — untouched since P1. `components/home/product-showcase.tsx` takes `items` as a prop with no data-fetching of its own (unchanged structure, re-read directly). `app/[locale]/page.tsx` sources `homepageProducts` exclusively from `lib/catalog/editorial-repository.ts#listHomepageProductCandidates`, which reads DB_PUBLIC (`catalog_products`/`product_variants`/`product_seo_contents`/`homepage_product_rank`) — never Odoo directly, never a static array. No hardcoded commercial product master exists (`lib/content/catalog-sample.ts` remains structurally unreachable from any production path, pinned by `homepage-source-isolation.test.ts`, re-run clean in this pass — 61/61 focused tests including this file passed, see TESTS). No live/synchronous Odoo call exists anywhere in the render path.

**NO HARDCODED COMMERCIAL PRODUCT MASTER:** PASS.
**NO LIVE ODOO PAGE-RENDER DEPENDENCY:** PASS (ABSENT).

---

# HOMEPAGE ELIGIBILITY

**PASS — separate from publication, re-confirmed directly.** `lib/catalog/editorial-repository.ts` still declares `HOMEPAGE_ELIGIBILITY_WHERE_CONDITION = "(hpr.show_on_homepage IS NULL OR hpr.show_on_homepage = 1)"` as a distinct constant, appended only inside `listHomepageProductCandidates`'s own `where` array (`[...TEMPLATE_PUBLICATION_WHERE_CONDITIONS, HOMEPAGE_ELIGIBILITY_WHERE_CONDITION]`) — never merged into the shared `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` constant that `/products` and `/products/[slug]` also use. Excluding a product from the Homepage cannot unpublish it or 404 its detail page; this is enforced by the two query paths using genuinely separate condition arrays, not by convention alone.

Operator control (`include-on-homepage` / `exclude-from-homepage`) remains wired in `scripts/catalog-editorial.ts` via `lib/catalog/editorial-cli.ts#buildSetHomepageEligibilitySql`, an UPSERT that touches only `show_on_homepage`/`updated_at` and preserves any existing `base_priority`/`manual_boost`/`demand_score`.

---

# ORDERING

**PASS, unchanged.** `basePriority + manualBoost`, demand term gated to `0` in `"base"` mode, deterministic `templateXid` tie-break. `HOMEPAGE_RANKING_MODE` remains `"base"` in both `wrangler.jsonc` environments (re-confirmed above) — **AUTO RANKING: DISABLED**, matching the P1 report and un-changed since.

---

# 0–8 LAYOUT

**PASS, re-confirmed directly** against `lib/catalog/homepage-showcase-layout.ts`'s `COLUMNS_BY_TIER_AND_COUNT` table and its own `homepage-showcase-layout.test.ts` (16/16 passing in this pass's own re-run — see TESTS), which asserts:

| Count | Wide-desktop grouping |
|---|---|
| 0 | no layout, no `data-count` (section omitted upstream — see below) |
| 1 | 1, centred |
| 2 | 2, centred |
| 3 | 3, one row |
| 4 | 4, one row |
| 5 | 3 + 2 |
| 6 | 3 + 3 |
| 7 | 4 + 3 |
| 8 | 4 + 4 |

`HOMEPAGE_SHOWCASE_MAX_CARDS = 8` clamps every helper (`showcaseColumns`, `showcaseRows`, `showcaseCountAttribute`) so an over-limit count can never select an undefined composition. `styles/theme-extensions.css`'s `.aa-showcase-grid` media queries were re-read directly and still mirror this table exactly; `homepage-showcase-layout.test.ts` includes an explicit stylesheet-drift assertion that fails if the two disagree — re-run clean in this pass.

**MAXIMUM: <= 8 — PASS.** Enforced at two independent layers: the query's `.slice(0, limit)` (`limit` defaults to `HOMEPAGE_PRODUCT_DISPLAY_COUNT = 6`, re-confirmed unchanged in `lib/catalog/homepage-config.ts`) and the layout table's own `Math.min(count, HOMEPAGE_SHOWCASE_MAX_CARDS)` clamp — no single point of failure.

**0 PRODUCTS: SECTION OMITTED — PASS, re-confirmed directly:**

```
$ grep -n "items.length === 0" components/home/product-showcase.tsx
44:  if (items.length === 0) return null;
```

No heading, no `CatalogEmptyState`, no placeholder — the whole `<section>` renders nothing, matching V2.0 §35/§82 exactly. `CatalogEmptyState` itself is untouched and still used by `/products`.

---

# RESPONSIVE

**PASS, unchanged since P1.** `SHOWCASE_TIER_MIN_WIDTHS` (`mobile: 380`, `tablet: 640`, `medium: 1024`, `wide: 1280`) and the corresponding `styles/theme-extensions.css` media queries were re-read directly and match. The P1 report's live-measured 380px mobile breakpoint decision (2-column card fit for realistic FA titles) was not reopened — no new evidence has emerged to revisit it, and this pass performed no additional live browser verification (see TESTS for what was actually re-run: automated tests and build only).

---

# PROGRESSIVE ENHANCEMENT

**PASS, re-confirmed directly.** `styles/theme-extensions.css`'s `.reveal` base rule declares no `opacity`, `transform`, or `transition` — re-confirmed by direct read:

```
.reveal[data-reveal="revealed"] {
  animation: aa-reveal 200ms var(--aa-ease-enter) forwards;
}
@keyframes aa-reveal {
  from { opacity: 0.92; transform: translateY(6px); }
  to   { opacity: 1;    transform: none; }
}
```

No unconditional `opacity: 0` resting state exists anywhere in the stylesheet (grepped fresh in this pass — the only `opacity` declarations are the `0.92`→`1` keyframe and the reduced-motion override, both non-hiding). `components/ui/reveal.tsx`'s SSR baseline emits no `data-reveal` attribute at all, so a browser that never runs the JS never encounters anything but the plain, fully-visible element. `homepage-progressive-enhancement.test.ts` (13/13 passing in this pass's re-run) pins: no persistent hidden state, transparency exists only inside keyframes, `forwards`-only fill (never `backwards`/`both`), reduced-motion pins full visibility, no `<noscript>` duplicate exists, and — the P1 report's own corrected finding — Hero and Price Strip do not reference `Reveal` at all, so this shared-component change cannot regress either frozen component.

**JS FAILURE: CARDS REMAIN VISIBLE — PASS.**

---

# FAILURE ISOLATION

**PASS, re-confirmed directly.** `app/[locale]/page.tsx`'s Product Showcase data read remains inside a narrowly scoped `try/catch` that falls back to an empty array on failure and logs `HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR` (matching the Header's own `HEADER_PRODUCT_FAMILIES_READ_ERROR` convention) — re-read directly, unchanged since P1. Nothing else on the page is inside this try, so an unrelated Homepage error still propagates rather than being silently swallowed; `homepage-showcase-resilience.test.ts` (12/12 passing in this pass's re-run) pins both the fallback-to-empty behavior and the narrow scoping.

**QUERY FAILURE: HOMEPAGE SURVIVES — PASS.**

---

# PRICE / STOCK / TRANSACTION BOUNDARY

**PASS on all three, re-confirmed directly by grep against the current source** (not merely re-citing the P1 report):

```
$ grep -inE "price|currency|قیمت|stock|موجود|inventory" components/home/product-showcase.tsx
20: * prop-driven pattern already established by `components/home/price-strip.tsx`)
```
(The single hit is a doc-comment naming the sibling Price Strip component file — not a price/stock field or display.)

```
$ grep -inE "cart|checkout|buy.now|quantity.*select" components/home/product-showcase.tsx
(no output — none found)
```

**PRICE: ABSENT.** **STOCK DISPLAY: ABSENT.** **STOCK-BASED HIDING: ABSENT** (inventory is never part of the eligibility WHERE clause or SELECT list — unchanged since P0/P1). **TRANSACTION CONTROLS: ABSENT.**

**WHOLE-CARD NAVIGATION: PASS**, re-confirmed directly — exactly two `<Link>` elements in the file (the section's "view all products" CTA, and the one per-card link), no `<button>`, no nested interactive control inside a card.

---

# MEDIA STATUS

**CURRENT MEDIA: launch-scale static repository assets.** Unchanged since P0/P1 — `lib/catalog/media-registry.ts`'s classification-code lookup tables, committed under `public/images/products/`. No image was replaced, added, or removed in this pass.

**FULL MEDIA GOVERNANCE: DEFERRED UNDER V2.0 LAUNCH-SCALE RULE.** No Odoo→Website sync/versioning/approval/checksum pipeline exists, per V2.0 §51's explicit tolerance at current scale. This is an acknowledged, spec-sanctioned architecture gap, not a defect blocking freeze.

---

# MEDIA PROVENANCE

**OWNER EVIDENCE REQUIRED.** No source/photographer/rights/approval-date metadata exists for the current committed photographs, and none was invented in this or any prior pass. This remains an explicitly deferred item (per the P1 report's REMAINING DEFERRED ITEMS #2) and does not block this freeze.

---

# DB_PUBLIC MIGRATION

`migrations_public/0010_homepage_eligibility.sql`, re-read directly in full in this pass:

```sql
ALTER TABLE homepage_product_rank
  ADD COLUMN show_on_homepage INTEGER NOT NULL DEFAULT 1 CHECK (show_on_homepage IN (0, 1));
```

- **Additive:** a single `ALTER TABLE ... ADD COLUMN`. No table dropped, rewritten, or recreated.
- **Backward compatible:** `DEFAULT 1` means every existing `homepage_product_rank` row becomes explicitly eligible on migration — no currently-visible product can silently disappear.
- **NULL/no-rank-row handling safe:** the column default only affects rows that already exist in `homepage_product_rank`. A template with no ranking row at all (the normal, sparse-overlay case) still reads `NULL` through the `LEFT JOIN`, which `HOMEPAGE_ELIGIBILITY_WHERE_CONDITION`'s `IS NULL OR = 1` treats as eligible — re-confirmed directly in the query-layer section above, and pinned by `homepage-eligibility.test.ts`'s explicit "a template with no homepage_product_rank row is eligible" test (re-run passing in this pass).
- **No destructive behavior:** confirmed — no `DROP`, no data rewrite, no column removal.

Applied only to this worktree's own local `.wrangler/state` D1 simulation for running the test/build commands below. **Not applied remotely.**

**REMOTE DB_PUBLIC MIGRATION: PENDING RELEASE/STAGING.**

---

# RELEASE IMPLICATION

Migration `0010` must be applied to staging, then production, `ahanassa-public`/`ahanassa-public-staging`/`ahanassa-public-production` D1 databases as a normal release step before this eligibility feature has any effect outside local development. Until then, the runtime code's `IS NULL OR = 1` condition degrades safely: every row currently lacks the column remotely, so the column literally does not exist yet there — this is a schema-not-yet-migrated state, not a runtime code question, and is explicitly out of scope for this freeze-only pass to apply.

---

# TESTS

Full suite, re-run independently in this pass (not copied from the P1 report):

```
$ npm test
ℹ tests 941
ℹ pass 941
ℹ fail 0
```

**941/941 passing, 0 failures.**

Focused Product Showcase / catalog invariant tests, re-run independently in this pass:

```
$ npx tsx --test lib/catalog/homepage-showcase-layout.test.ts \
  lib/catalog/homepage-eligibility.test.ts \
  lib/catalog/homepage-progressive-enhancement.test.ts \
  lib/catalog/homepage-showcase-resilience.test.ts \
  lib/catalog/homepage-projection-invariants.test.ts \
  lib/catalog/homepage-source-isolation.test.ts
ℹ tests 61
ℹ pass 61
ℹ fail 0
```

**61/61 passing** across all six Product-Showcase-relevant test files (the four new from P1, plus the two pre-existing invariant/isolation files, confirming no regression to either).

No test was added, modified, or run merely to inflate a count in this pass — this section reports exactly what already existed as of P1, re-executed fresh.

---

# TSC

```
$ npx tsc --noEmit
(no output, exit code 0)
```

**PASS**, re-run independently, clean.

---

# BUILD

```
$ npm run build
✓ built (all 5 stages)

  Route (app)
  ┌ ƒ /:locale
  ...
  Build complete.
```

**PASS**, re-run independently. Homepage still builds as a dynamic server route (`ƒ /:locale`).

---

# GIT

This pass's own worktree (`worktree-product-showcase-p2`, branched from `feat/header-hero-integrated`'s `8060723`) will carry exactly one new commit — this report — after this file is written. `git diff --check` will be run before that commit; `git status --short` confirmed clean both before and after the validation runs above (the only transient change, `tsconfig.tsbuildinfo`, was restored to HEAD, not committed — consistent with how the P1 pass treated the same file).

---

# PRODUCTION SAFETY

- **No runtime file was modified in this pass.** This is a verification-only phase; every finding above was reached by reading existing source and re-running existing tests/build, never by editing code.
- **No push, no deploy.**
- **No remote D1 migration or write.** Migration `0010` was not applied to any remote database in this pass (nor was it re-applied even locally beyond what P1 already left in place, since no schema-affecting command was run here).
- **No Odoo contact.**
- **No media replaced, added, or removed.**
- **No provenance fabricated.**
- **Frozen documents unedited** — the V2.0 spec, the P0 audit, and the P1 report were all read, none modified.

---

# DEFERRED ITEMS

Carried forward unchanged from the P1 report (re-confirmed still accurate, not re-litigated):

1. Odoo→Website media governance pipeline (§38–§54) — deferred under §51's launch-scale tolerance.
2. Media provenance (source/rights/approver/date) — owner evidence required, not invented.
3. Photography style (yard/warehouse vs. studio-style) — a media decision, not a code question.
4. Template vs. family card grain (P2-4) — left unchanged for lack of production distribution evidence; needs an owner architecture decision only if real duplication is later observed.
5. `auto` ranking governance process (P2-5) — mode remains correctly disabled; no documented approval gate exists yet for ever enabling it.
6. Card aspect ratio (16:11 vs. spec's preferred 4:3/5:4) — left alone per the approved current visual direction (CLAUDE.md §5a).
7. Two harmless dead CSS rules (from Tailwind scanning the P0 audit document's prose) — not fixable without editing the immutable P0 audit; ~250 bytes, unused.
8. Stale `CLAUDE.md` §5 text about scheduled catalog sync/public catalog pages — unrelated documentation drift, explicitly out of scope for Product Showcase commits per both the P1 and this task's own instructions.
9. **New in this pass:** migration `0010` has not yet been applied to staging or production — a standard release step, not a code defect (see RELEASE IMPLICATION).

None of the above block this freeze, per V2.0's own explicit tolerances and the task's own instructions not to let them.

---

# FINAL FREEZE STATUS

**Product Showcase V2.0 is FINAL FROZEN as of runtime commit `a727518` and P1 report commit `8060723`.** All required V2.0 invariants — source of truth, no hardcoded commercial master, no live Odoo render dependency, SSR, price/stock/transaction absence, whole-card navigation, max-8, 0–8 layout, no carousel, JS-failure visibility, query-failure survival, homepage eligibility separate from publication, disabled auto-ranking — were independently re-verified against current source and a fresh test/typecheck/build run in this pass, with no regression found since P1.

---

# NEXT PHASE

Product Showcase work is closed pending: (a) migration `0010`'s release-time application to staging then production D1 (a deployment step, not further Showcase code), and (b) the explicitly deferred items above, none of which block moving to the next Homepage component. Recommend proceeding to whichever Homepage component is next in the project's own sequencing — no further Product Showcase P-phase is required unless a future regression or a new owner decision reopens one of the deferred items above.
