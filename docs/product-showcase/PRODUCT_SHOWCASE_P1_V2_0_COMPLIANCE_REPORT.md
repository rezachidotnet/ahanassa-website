# AHAN ASA — HOMEPAGE PRODUCT SHOWCASE
## PRODUCT-SHOWCASE-P1 — V2.0 Compliance Implementation Report

**Task type:** IMPLEMENTATION (runtime code, DB_PUBLIC migration, tests, live browser verification).
**Implemented by:** Claude Code, PRODUCT-SHOWCASE-P1 pass.
**Date:** 2026-09-07.

---

## SUMMARY BLOCK

```
AUTHORITATIVE PRODUCT SHOWCASE: V2.0
PRODUCT SHOWCASE RUNTIME: COMPLIANT
JS FAILURE CARDS VISIBLE: YES
0–8 LAYOUT: PASS
HOMEPAGE ELIGIBILITY: PASS
ZERO PRODUCTS: SECTION OMITTED
QUERY FAILURE: HOMEPAGE SURVIVES
PRICE FREE: PASS
STOCK INDEPENDENT: PASS
LIVE ODOO RENDER DEPENDENCY: ABSENT
AUTO RANKING: DISABLED
MEDIA GOVERNANCE: DEFERRED UNDER LAUNCH-SCALE RULE
MEDIA PROVENANCE: OWNER EVIDENCE REQUIRED
READY FOR PRODUCT SHOWCASE FREEZE: YES
```

---

# RESULT

**A. PRODUCT SHOWCASE V2.0 REQUIRED P1 COMPLIANCE COMPLETE — MEDIA GOVERNANCE DEFERRED UNDER LAUNCH-SCALE RULE.**

Every P0/P1 item in the audit's PRODUCT-SHOWCASE-P1 BOUNDARY is implemented, tested and verified: the progressive-enhancement defect (P0-1), the 0–8 responsive layout matrix (P1-1), the distinct homepage-eligibility concept with an additive DB_PUBLIC migration and operator tooling (P1-2), and the failure boundary around the catalog read (P1-4). The P2 items in scope are also done: hover motion is inside the frozen numeric bounds with a reduced-motion guard (P2-1), and the zero-product state now literally omits the section (P2-3). P2-2 (image crop) was investigated live and found to be a non-defect, so nothing was changed. P1-3 (Odoo→Website media governance pipeline) remains deferred under V2.0 §51's explicit tolerance of static repository assets at current launch scale, and P2-4 (template vs. family grain) was reviewed and deliberately left unchanged for lack of evidence of a real duplication problem.

Two findings from this pass are worth the reader's attention because they changed the implementation:

1. The first version of the P0-1 fix was itself unsafe, and live testing caught it. Details in P0-1 PROGRESSIVE ENHANCEMENT.
2. The P0 audit's claim that `Reveal` wraps Hero and Price Strip content is factually wrong. Details in REVEAL SHARED-COMPONENT REGRESSION.

---

# PREFLIGHT

```
$ pwd
/Users/reza/Developer/ahanassa-website/.claude/worktrees/product-showcase-p1

$ git branch --show-current
worktree-product-showcase-p1

$ git rev-parse HEAD
6b283fc9f067cba01551538018e633b50c423dad

$ git status --short
(clean)
```

`migrations_public/` verified to end at `0009_catalog_group_labels.sql`, so `0010` was the correct next sequence number — checked directly rather than trusted from the task description.

Locale routing confirmed against `config/locales.ts` and the running server: **fa is unprefixed (`/`)**, en is `/en`, ar is `/ar`. A request to `/fa` returns 308. All curl-based verification below uses the real paths.

Environment prepared: `npm ci`, then `npx wrangler d1 migrations apply ahanassa-public --local` and `... ahanassa-ops --local`. **Local D1 only. No remote/staging/production database was touched at any point.**

---

# BASE SHA

`6b283fc9f067cba01551538018e633b50c423dad`

---

# P0 REPORT COMMIT

`6b283fc9f067cba01551538018e633b50c423dad` — the base SHA and the commit that introduced `docs/product-showcase/PRODUCT_SHOWCASE_P0_CURRENT_IMPLEMENTATION_AUDIT.md` are the same commit (`docs: record Product Showcase V2.0 implementation audit`). Confirmed with `git log -1 --format='%H %s' -- <path>`.

---

# AUTHORITATIVE SPEC

`docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md`, read in full (3016 lines, §1–§86), together with `docs/product-showcase/PRODUCT_SHOWCASE_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (773 lines, read in full) as the map of what to touch.

The spec file was not modified. Neither was the P0 audit: it is the historical record of that run, and the one factual correction this pass found is recorded here instead (see REVEAL SHARED-COMPONENT REGRESSION).

---

# IMPLEMENTATION SCOPE

| Item | Spec | Status |
|---|---|---|
| P0-1 progressive enhancement | §64.11, §77, §82 | Done — design replaced twice after live testing |
| 0–8 count-aware layout | §25, §73.1 | Done |
| Responsive column contract | §26–§31, §73.2 | Done, breakpoint set from measurement |
| Homepage eligibility + migration | §5, §68.1, §69, §75 | Done (migration 0010) |
| Operator control | — | Done (editorial CLI) |
| Ordering preserved | §22, §68.4 | Unchanged, verified |
| Failure isolation | §80.2 | Done |
| Zero-product omission | §35, §82 | Done |
| Hover motion | §64.7, §64.10 | Done |
| Image crop | §59 | Investigated live, no defect, unchanged |
| `alt=""` + `aria-labelledby` | §56, §72.1, §78 | Done |
| Whole-card navigation | §72.1 | Unchanged, verified |
| Price/stock/transaction-free | §11, §12, §21.2, §74, §82 | Unchanged, coverage extended |

Out of scope and untouched: Header (V2.2), Hero (V2.4), shared Button (V1.0), Price Strip (frozen, still disabled), `HOMEPAGE_PRODUCT_DISPLAY_COUNT` (still 6), `HOMEPAGE_RANKING_MODE` (still `base` in both environments), `wrangler.jsonc`.

---

# P0-1 PROGRESSIVE ENHANCEMENT

**The defect.** `styles/theme-extensions.css` set `.reveal { opacity: 0; transform: translateY(14px) }` as an unconditional baseline, cleared only by `data-visible="true"`, which only `components/ui/reveal.tsx`'s IntersectionObserver callback could set. Confirmed live before any change: the server-rendered HTML carried `data-visible="false"` on **15** elements, and a screenshot of the running homepage showed the Showcase area effectively blank while two cards still measured `opacity: 0`.

**This required three attempts, and the first two were wrong.** Recording that honestly, because the failure mode is subtle and a future reader deserves to know why the final shape is what it is.

*Attempt 1 — arm-after-mount.* SSR emits no attribute; the client adds `data-reveal="armed"` (opacity 0) only for off-screen elements, and the observer swaps it to `"revealed"`. This satisfies no-JS correctly. Live testing then showed cards **stuck at `opacity: 0` indefinitely**: the automated Chrome tab reports `document.hidden: true`, which throttles IntersectionObserver delivery and freezes CSS transitions outright. Cards reached `data-reveal="revealed"` while still painted transparent. That is strictly worse than the original defect — permanently hidden rather than conditionally hidden.

*Attempt 2 — armed plus failsafes.* Added a pure-CSS `animation` on the armed state that restores visibility after a bounded delay, plus a JS `setTimeout` backstop. Both are defeated by the same freeze: a paused animation never reaches its restoring keyframe.

*Attempt 3 — the shipped design: no hidden state exists at all.*

```css
.reveal[data-reveal="revealed"] {
  animation: aa-reveal 200ms var(--aa-ease-enter) forwards;
}
@keyframes aa-reveal {
  from { opacity: 0.92; transform: translateY(6px); }
  to   { opacity: 1;    transform: none; }
}
```

`.reveal` declares no opacity, no transform and no transition. The faded appearance exists **only inside keyframes**, so it can never be a resting state, and the fill is `forwards` (never `backwards`/`both`, which would apply the `from` frame before the animation starts and reintroduce a hidden state by another name).

The decisive detail is the `from` opacity of **0.92, not 0** — which is what §64.3 actually specifies ("opacity ~0.92 → 1, translateY ~4–6px → 0, duration ~180–220ms"). The previous implementation's `opacity: 0` was already off-spec. Following the spec exactly also makes the entrance physically incapable of hiding anything: even with the animation attached *and* frozen at its first frame, content sits at 92% opacity — fully legible.

`components/ui/reveal.tsx` reduces to two phases, `"static"` (SSR baseline, emits no attribute) and `"revealed"`. Elements already on screen at mount are never animated at all (§64.1), the observer fires slightly early (`rootMargin: "0px 0px 12% 0px"`) so the stagger runs off-screen, and the per-card stagger is a JS timer rather than an `animation-delay` — a delayed animation with a `forwards` fill would leave a card visible and then blink it transparent when the delay elapsed.

Every failure mode now degrades to visible: JS never runs, bundle 404, hydration crash, observer unsupported or throttled, animations disabled or frozen, reduced motion. No `<noscript>` duplicate was introduced; the single copy is simply never hidden.

---

# REVEAL SHARED-COMPONENT REGRESSION

**Correction to the P0 audit.** The audit states (PROGRESSIVE ENHANCEMENT, and again in P0-1) that the `Reveal` component "is shared site-wide (also wraps Hero/Price Strip content)". **That is not correct.** `grep -rn "Reveal" components app --include="*.tsx"` returns exactly five consumers:

```
components/home/product-showcase.tsx
components/home/capabilities.tsx
components/home/reach.tsx
components/home/process.tsx
app/[locale]/services/page.tsx
```

`components/home/hero.tsx` and `components/home/price-strip.tsx` contain no reference to `Reveal` and no use of the `reveal` class — verified by grep of both component files and of all of `styles/`. The P0 audit file itself was not edited (it is that run's historical record); the correction is recorded here, as instructed.

This materially shrinks the blast radius of the shared-component change: **the two frozen components most at risk, Hero (V2.4) and Price Strip, were never affected by this fix at all.** Neither component's code was touched by this pass.

Both facts are now pinned as executable tests in `lib/catalog/homepage-progressive-enhancement.test.ts`, so a future change that quietly adopts `Reveal` in a frozen component fails CI and forces a deliberate re-review:

- every one of the five real consumers is asserted to be a consumer, and asserted not to reimplement a hiding baseline of its own (an `opacity-0` is only allowed where a `group-hover`/`hover`/`focus` rule restores it — which is exactly the Showcase's directional arrow, a hover affordance carrying no required information per §17.16/§64.7);
- Hero and Price Strip are asserted **not** to reference `Reveal` or the `reveal` class.

Live check of the other consumers after the change: the homepage's Capabilities, Process and Reach sections and `/services` all render normally, since they inherit the same "never hidden" baseline.

---

# NO-JS VERIFICATION

Performed as specified: (a) raw SSR HTML via `curl` against the running dev server, and (b) inspection of the actual compiled stylesheet.

**(a) Server-rendered HTML — all three locales, final build:**

| Check | fa (`/`) | en (`/en`) | ar (`/ar`) |
|---|---|---|---|
| `class="reveal"` wrappers | 21 | 21 | 21 |
| `data-reveal` attributes (must be 0) | **0** | **0** | **0** |
| `data-visible` attributes (must be 0) | **0** | **0** | **0** |
| inline `opacity:0` (must be 0) | **0** | **0** | **0** |
| `style=` on any `.reveal` element (must be 0) | **0** | **0** | **0** |
| product card links | 6 | 6 | 6 |
| `<ul data-count>` | 6 | 6 | 6 |
| `aria-labelledby` present | yes | yes | yes |
| card `<img alt="">` | 13 | 13 | 13 |

Card links are real, locale-correct anchors in the initial HTML — e.g. `/products/rebar`, `/en/products/rebar`, `/ar/products/rebar`.

**(b) Compiled stylesheet** (`dist/client/_next/static/css/index.*.css`, production build) — every rule mentioning `.reveal`:

```css
.reveal[data-reveal=revealed]{animation:aa-reveal .2s var(--aa-ease-enter) forwards}
.reveal,.reveal[data-reveal=revealed]{opacity:1;transition:none;animation:none;transform:none}   /* @media (prefers-reduced-motion:reduce) */
@keyframes aa-reveal{0%{opacity:.92;transform:translateY(6px)}to{opacity:1;transform:none}}
```

Confirmed absent from the compiled CSS: `.reveal{opacity:0`, `data-reveal=armed`, `data-visible`. There is no rule that can hide a `.reveal` element, and the only rule that touches its appearance requires an attribute that exists nowhere in the SSR output.

**Disclosure — what was NOT done.** A true browser JavaScript-disable toggle was not used. The claude-in-chrome tools expose no such control, and `chrome://settings` content-settings navigation is not reachable through them in this sandbox. The evidence above (SSR HTML contains no hiding signal + shipped CSS can only hide behind a JS-added attribute) is the curl+CSS-source proof the task accepts in that case, and it is what this row of the summary block rests on.

**Stronger-than-planned live evidence did emerge.** The automated tab reports `document.hidden: true` and, measured directly, runs **neither CSS animations nor transitions** (a probe element with a 200ms animation and another with a 200ms transition both stayed at their start values). That is an unusually hostile environment — effectively "JS enhancement partially runs but CSS motion never completes" — and in it the Showcase renders fully:

```
natural state (observer throttled, never fired):
  data-reveal: [null × 6]      opacity: ["1" × 6]

forced worst case (animation attached AND frozen at frame 0):
  data-reveal: ["revealed" × 6]  opacity: ["0.92" × 6]   animationName: aa-reveal
```

Screenshotted in both states: fully legible, visually indistinguishable from full opacity. **There is no reachable state in which the Showcase is invisible.**

---

# 0–8 LAYOUT MATRIX

Implemented as `data-count` on the `<ul>` plus scoped CSS (`.aa-showcase-grid` in `styles/theme-extensions.css`), driving a flex container with `justify-content: center` and a per-tier `--aa-showcase-columns`. Partial trailing rows centre themselves, so 5 → 3+2 and 7 → 4+3 fall out of ordinary wrapping rather than nth-child arithmetic. Deliberately not dynamically-interpolated Tailwind class strings, which Tailwind's scanner cannot see and would purge.

`lib/catalog/homepage-showcase-layout.ts` is the canonical table; `homepage-showcase-layout.test.ts` asserts both the frozen matrix and that the stylesheet still declares the same numbers, so the two cannot drift.

**Measured live at a real 1280px layout viewport** (method in COUNT × VIEWPORT MATRIX):

| Count | V2.0 requires | Measured | Rows centred | Card width |
|---|---|---|---|---|
| 0 | Section hidden | section absent from DOM | — | — |
| 1 | Standard-width centred | `1` | yes | 405px |
| 2 | Centred pair | `2` | yes | 405px |
| 3 | Centred 3 | `3` | yes | 405px |
| 4 | One 4-card row | `4` | yes | 304px |
| 5 | 3 + 2 centred | `3+2` | yes | 405px |
| 6 | 3 + 3 | `3+3` | yes | 405px |
| 7 | 4 + 3 centred | `4+3` | yes | 304px |
| 8 | 4 + 4 | `4+4` | yes | 304px |

Identical results at 1440px. No orphan wide-desktop row, no carousel, no fabricated records — counts above 6 were produced by cloning existing `<li>` nodes in the DOM, never by inventing data (see COUNT × VIEWPORT MATRIX for the disclosure).

Card width stays on the 3-column track (405px) for counts 1, 2, 3, 5 and 6, so a small set produces more whitespace rather than oversized cards (§26); the 4-column track (304px) is used only where §25 mandates a 4-wide row. A single card is never stretched to fill the container.

---

# RESPONSIVE COLUMN STRATEGY

```
Narrow mobile   (<380px)      -> 1 column
Mobile          (>=380px)     -> 2 columns (1 for a single card)
Tablet          (>=640px)     -> 2 columns
Medium          (>=1024px)    -> 3 columns
Wide desktop    (>=1280px)    -> 3 columns, 4 only for counts 4, 7, 8
```

**The 380px mobile threshold was set from measurement, not assumption** (§28: "Breakpoints are based on actual content fit, not blindly on framework defaults"). The audit flagged that the old grid rendered 1 column at 390/430 where the spec wants 2. Forcing the 2-column track and measuring a long realistic Persian title (`ورق سیاه گرم نوردیده st37`):

| Viewport | Card width | Image height | Long title wraps to | Verdict |
|---|---|---|---|---|
| 320px | 144px | 98px | 4 lines | cramped |
| 360px | 164px | 111px | 3 lines | cramped |
| 375px | 172px | 117px | 2 lines | acceptable |
| 390px | 179px | 122px | 2 lines | acceptable |
| 430px | 199px | 135px | 2 lines | comfortable |

The switch to one column therefore belongs below ~375px — before image recognition and title readability degrade (§31). 380px keeps the spec's 390/430 validation widths on two columns and 320/360 on one, and also catches 384px devices. Re-verified after the change: 320 → 1 column, 360 → 1, 390 → 2, 430 → 2.

**A second measured correction.** The first implementation dropped 4 cards to 2 columns at the medium tier to get a "balanced" 2+2 (reading §29). Measured at 1024px, that inflated each card to **481px — roughly half the container**, which is precisely the stretched-card shape §26 prohibits ("Do NOT stretch 2 cards → each card becomes ~50% container width solely to fill space"). §29's balance preference is about row grouping at a constant card width, and §30 explicitly sanctions a lone final card at standard width, centred. Medium is now a uniform 3 columns: 4 renders as 3+1 with every card at 321px. Verified after the change — all counts 1–8 at 1024px use 3 columns and a constant 321px card width, all rows centred.

A regression test now pins this property: below wide desktop, every tier must use a single column count across all counts (mobile's single-card case being the one deliberate, documented exception), and wide desktop may use only the 3- and 4-column tracks §25 defines.

---

# HOMEPAGE ELIGIBILITY

Implements V2.0 §5's distinct `Publicly published? → Homepage eligible?` step and §68.1/§69/§75's `show_on_homepage`.

`lib/catalog/editorial-repository.ts` gains one homepage-only condition, kept deliberately **outside** the shared publication constant:

```ts
const HOMEPAGE_ELIGIBILITY_WHERE_CONDITION = "(hpr.show_on_homepage IS NULL OR hpr.show_on_homepage = 1)";
```

`listHomepageProductCandidates` spreads the shared gate and appends this one; `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` is still declared exactly once and still shared verbatim with `listPublishedCatalogTemplates` and `getPublishedCatalogTemplateBySlug`. Because the added condition is a strict narrowing, the existing "a homepage card can never 404" guarantee holds.

**The NULL case is handled explicitly.** `homepage_product_rank` is a sparse overlay reached by LEFT JOIN, so a never-ranked template has no row and every `hpr.*` column reads NULL. `IS NULL` is read as **eligible** — the exact pre-migration behaviour. A bare `hpr.show_on_homepage = 1` would silently turn the LEFT JOIN into an INNER JOIN and hide every unranked product; that trap is called out in the source comment and pinned by a test.

**Truth table executed against the real local SQLite database**, not asserted from source text. Eight seeded templates, each with approved+published fa/en/ar editorial rows:

| Case | Setup | Homepage candidate? | Expected |
|---|---|---|---|
| public + explicitly eligible | `is_public=1`, `show_on_homepage=1` | **yes** (T_REBAR) | yes |
| public + explicitly excluded | `is_public=1`, `show_on_homepage=0` | **no** (T_BEAMS absent) | no |
| public + **no ranking row at all** | row deleted → NULL | **yes** (T_SHEET) | yes |
| not public + eligible flag | `is_public=0`, `show_on_homepage=1` | **no** (T_PIPE absent) | no |

Result: 6 candidates from 8 templates, exactly as intended.

**Exclusion does not unpublish.** Running the shared publication gate *without* the homepage condition against the same data returned 7 templates including `T_BEAMS` — the homepage-excluded product is still fully published on `/products` with a working detail page.

**Price and inventory independence** are structural: the homepage candidate query selects and filters on no price, currency, stock, `qty_available`, `is_price_public` or inventory column whatsoever, so eligibility cannot be affected by either. Asserted by test and true by construction.

---

# DB_PUBLIC MIGRATION

`migrations_public/0010_homepage_eligibility.sql` — strictly additive, a single statement:

```sql
ALTER TABLE homepage_product_rank
  ADD COLUMN show_on_homepage INTEGER NOT NULL DEFAULT 1 CHECK (show_on_homepage IN (0, 1));
```

No table is dropped, rewritten or recreated and no existing row's data is modified, per the standing guardrail against repeating migration 0002's DROP-and-recreate pattern. A test asserts the file contains no `DROP TABLE`, `DROP COLUMN`, `DELETE FROM`, `TRUNCATE` or `CREATE TABLE`.

The column is Website merchandising metadata only: never written by the Odoo catalog sync, never derived from price or inventory, never read back into Odoo.

**Applied to local D1 only** (`npx wrangler d1 migrations apply ahanassa-public --local`), for test and browser verification in this worktree. **No remote, staging or production database was migrated or written to at any point.**

---

# BACKWARD COMPATIBILITY

Two independent guarantees, one per direction of the LEFT JOIN:

- **Rows that exist** — `DEFAULT 1` means every pre-existing `homepage_product_rank` row becomes explicitly eligible on migration. A default of 0 would have blanked the Homepage on deploy.
- **Rows that do not exist** — the normal state, since the overlay is sparse. Handled in the query layer, where NULL reads as eligible.

Together: applying migration 0010 cannot remove a single currently-visible product from the Homepage. Verified live — the third truth-table case above is exactly this scenario, and the product remained a candidate.

The CLI upsert additionally preserves `base_priority`, `manual_boost`, `demand_score` and `demand_computed_at` on an existing row, so toggling visibility can never wipe a curated ordering or a computed demand score. Verified live: excluding `T_REBAR` (which had `base_priority=100`) left the value at 100.

---

# OPERATOR CONTROL

`lib/catalog/editorial-cli.ts` was inspected first and is the established operator interface (draft/publish/unpublish/quality-status/index-status/public flags, all pure and `node --test`-able, with the real D1 work done by `scripts/catalog-editorial.ts` shelling out to `wrangler d1 execute`). It was extended minimally in that same shape rather than adding a new tool or an admin UI.

New: `buildSetHomepageEligibilitySql`, an UPSERT (`ON CONFLICT(catalog_product_id)`, resolving against `uq_homepage_product_rank_catalog_product_id` from migration 0005) whose DO UPDATE branch touches only `show_on_homepage` and `updated_at`.

New commands, following `cmdSetPublic`'s pattern exactly:

```
include-on-homepage   <template-xid> --env <env> [--confirm-production] [--dry-run]
exclude-from-homepage <template-xid> --env <env> [--confirm-production] [--dry-run]
```

They carry the same write safeguards as every other mutating command: `--env` is mandatory with no default, `--env production` additionally requires `--confirm-production`, `--dry-run` is supported, and each write emits an audit line. No raw SQL is required of the operator, and no bulk mutation is exposed. The usage text states explicitly that these affect the Homepage Showcase only and that `unset-public` is the command for actually unpublishing.

Exercised end-to-end against local D1:

```
$ node scripts/catalog-editorial.ts exclude-from-homepage T_REBAR --env local --dry-run
  currentHomepageEligibility: eligible
  proposedHomepageEligibility: excluded
  note: affects the Homepage Product Showcase only — /products publication is unchanged
  (dry run — no write performed)

$ node scripts/catalog-editorial.ts exclude-from-homepage T_REBAR --env local
AUDIT {"timestamp":"...","environment":"local","entityXid":"T_REBAR","locale":null,
       "action":"exclude-from-homepage","previousState":"eligible","resultingState":"excluded"}

$ node scripts/catalog-editorial.ts include-on-homepage T_SHEET --env local     # no overlay row -> INSERT branch
AUDIT {... "previousState":"eligible (no ranking row yet)","resultingState":"eligible"}
```

Both branches verified in the database afterwards: the UPDATE preserved `base_priority=100`; the INSERT created a row with neutral ranking defaults.

---

# ORDERING / RANKING

**Unchanged.** `computeHomepageScore` / `sortByHomepageScore` in `lib/ranking/score.ts` are untouched, and `listHomepageProductCandidates` still resolves `options.mode ?? "base"`, still applies the same scoring, and still sorts with the same deterministic `templateXid` tie-break. In `base` mode the demand term is forced to 0, so ordering remains exactly `basePriority + manualBoost` with a stable tie-break (§22.3/§68.4).

No new ranking tooling was built. The eligibility flag is a visibility gate, not a ranking input — it appears only in the WHERE clause and never in the score. A test pins that the scoring functions, the sort and the `"base"` default all remain in place.

---

# AUTO MODE STATUS

**DISABLED, and untouched by this pass.** `wrangler.jsonc` still sets `HOMEPAGE_RANKING_MODE = "base"` for both `env.production` and `env.staging`; the file was not modified. `resolveHomepageRankingMode` still defaults any missing or unrecognised value to `"base"` and never throws. No deployed environment has demand-influenced ranking active.

The audit's P2-5 governance recommendation (that flipping to `auto` should be an explicit, documented owner decision rather than a routine env-var change) is not addressed here — it is a process artefact, not runtime code. Carried forward in REMAINING DEFERRED ITEMS.

---

# ZERO-PRODUCT BEHAVIOR

Now literally what §35 and the §82 acceptance row ("0 cards | Section hidden") require:

```tsx
if (items.length === 0) return null;
```

The early return precedes all markup, so no heading, no helper copy, no "view all products" link, no placeholder and no skeleton render. This replaced the previous `CatalogEmptyState` (`variant="catalog-preparing"`) fallback, which kept a heading and a "the catalog is being prepared" message on screen — the audit's P2-3.

**`CatalogEmptyState` itself was checked before removing the usage and is deliberately preserved.** `app/[locale]/products/page.tsx` still uses it for both `catalog-preparing` and `no-filter-match`, where an explanatory empty state is the right answer for a page whose entire purpose is the listing. Only the Showcase's import and usage were removed; the component file is untouched. A test asserts both halves.

**Verified live against real data**, not only by reading code — all eight seeded products were excluded via `show_on_homepage = 0` and the homepage re-fetched:

```
showcase section present   : false     (no home-product-showcase-heading anywhere)
aa-showcase-grid present   : false
product card links present : 0
other homepage sections OK : true      (page still renders, 257,088 bytes)
```

The word `کاتالوگ` does still appear in that output; it was traced to the footer's `کاتالوگ کامل` link, not a Showcase empty state.

---

# FAILURE ISOLATION

`app/[locale]/page.tsx` now wraps the Showcase's projection read, and nothing else:

```tsx
let homepageProducts: HomepageProductCandidate[] = [];
try {
  const { listHomepageProductCandidates } = await import("@/lib/catalog/editorial-repository");
  const homepageRankingMode = resolveHomepageRankingMode(env.HOMEPAGE_RANKING_MODE);
  homepageProducts = await listHomepageProductCandidates(locale, { mode: homepageRankingMode });
} catch (error) {
  console.error("HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
}
```

A read failure yields an empty list, which the component turns into an omitted section — §80.2's "Product Showcase omitted → Homepage remains healthy", with no 500.

**The catch is scoped narrowly and that is tested, not merely asserted.** A test extracts the try block and fails if it ever contains `getHomepagePriceStrip`, `buildPageMetadata`, `organizationSchema`, `websiteSchema`, `<Hero` or `<CtaBand`; it also checks the price-strip read still happens before the try, and that `return (` comes after the catch so no JSX is inside it. An unrelated Homepage error therefore still propagates rather than being silently swallowed.

Logging follows the convention already in `app/[locale]/layout.tsx` (`HEADER_PRODUCT_FAMILIES_READ_ERROR` / `HEADER_SERVICE_GROUPS_READ_ERROR`): one greppable SCREAMING_SNAKE tag plus a JSON message. A test asserts the message shape matches and that the payload contains no locale, params, request, headers, cookie or IP data.

---

# CARD HOVER MOTION

Was `group-hover:scale-105` over `duration-700` — roughly 3× the scale delta and 4× the duration §64.7 specifies, with **no reduced-motion guard at all**.

Now:

```
object-cover transition-transform duration-[160ms] ease-out
group-hover:scale-[1.015]
motion-reduce:transition-none motion-reduce:group-hover:scale-100
```

1.015 scale over 160ms sits inside §64.7's "approximately 1.015 … ~150–180ms". Verified in the compiled CSS that all three utilities really shipped (`.group-hover\:scale-\[1\.015\]{scale:1.015}`, `.duration-\[160ms\]{transition-duration:.16s}`, and both `motion-reduce:` variants inside `@media (prefers-reduced-motion:reduce)`), and measured live on the running page: `transitionDuration: "0.16s"`.

The reduced-motion guard is new and closes a real §64.10 gap ("image scaling/motion is removed") that existed before this pass. A test asserts the numeric values, the guards, and the absence of rotate/skew/blur/heavy-shadow/animate/perspective theatrics (§65).

---

# PRODUCT MEDIA

Unchanged. Media still resolves through `lib/catalog/media-registry.ts`'s stable classification-code lookup (`groupCode`/`familyCode` → static asset under `public/images/products/`), never by localized display name (§39), with `steel-placeholder.svg` as a deliberately generic fallback that cannot misrepresent one product as another (§48's prohibited list).

Observed live during verification: the fallback path genuinely works. The seeded ANGLE/CHANNEL/RHS families have no dedicated photo and rendered the neutral placeholder illustration, while REBAR/BEAMS/SHEET_PLATE/SEAMLESS_PIPE rendered their real photographs.

The image delivery pipeline is confirmed healthy, which resolves an open question the audit could not answer without a browser: `/_next/image` served the 2,308,774-byte `rebar.png` source as a **114,922-byte JPEG at 640×640**. No multi-megabyte original reaches the browser (§57/§79). `sizes` was updated to match the new column tiers (`(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 400px) 50vw, 100vw`), the `aspect-16/11` container still reserves space before load (§58), and no `priority` flag is set so the Showcase does not compete with the Hero LCP.

---

# IMAGE CROP VERIFICATION

The audit's P2-2 was a static-analysis *suspicion* only: square 1024×1024 sources inside a 16:11 container with `object-cover` might crop recognizable steel geometry, where §59 prefers contain/controlled crop.

**Investigated live before touching anything, as instructed.** Rendered the real homepage at a measured 381×262 image box (so `object-cover` retains the central ~68.6% of image height, cropping ~31% total) and inspected the actual photographs, including a zoom on the beams card.

Finding: **no actual defect.** Product geometry is centred and clearly recognizable in every card — I-beam webs and flanges, bundled rebar cross-sections, round pipe bores and square hollow sections, stacked plate edges. The photographs are wide industrial scenes whose subject sits centrally, so the 16:11 crop removes background, not product.

Per the instruction not to change working code on a hypothesis, **`object-cover` was left exactly as it was**, and the aspect ratio was not altered. Recorded here as checked-and-clear rather than silently skipped.

One genuine observation, not a crop issue and not fixed here: several photographs are yard/warehouse scenes rather than the "standardized photorealistic / studio-style industrial product visual" §17.4/§17.6 prefer. That is a media-governance question, deferred with P1-3 below.

---

# MEDIA PROVENANCE STATUS

**DEFERRED — OWNER/SOURCE EVIDENCE REQUIRED.**

No provenance metadata exists for the committed static product photographs: no source, photographer/provider, rights or licence basis, approval decision, approval date, or checksum. This pass did **not** fabricate any of it, per the explicit instruction.

The current arrangement is safe in the ways V2.0 cares about most — there is no live Odoo image dependency of any kind (§52/§82 satisfied trivially), no AI generation pipeline anywhere in the repository, and no misleading substitute image — but "where did this image come from and who approved it" is answerable today only from the source-code comment trail in `media-registry.ts`.

Recording the real provenance requires evidence only the owner holds. Until then this stays open.

---

# PRODUCT TEMPLATE / FAMILY GRAIN REVIEW

The audit's P2-4 flagged that the Showcase operates at *template* grain while §3 describes the Homepage display level as *Product Family / Public Category*, so one classification group holding several published templates could show what a visitor reads as "the same family twice".

**Reviewed, and deliberately left unchanged.** Per the instruction not to redesign the product grain without hard evidence of a real duplication problem in currently-available data:

- Local D1 in this worktree contains only test data seeded by this pass (one template per classification group by construction), so it cannot demonstrate or refute duplication in production.
- Production DB_PUBLIC is not reachable from here, and querying it was out of scope — remote databases were not to be touched.
- The available documented figures (13 templates, 3 published as of 2026-09-03) do not include the group distribution needed to answer the question.

No duplication was observed, but nothing available here could have observed it either. Changing the grain would be an architecture decision affecting `/products`, the Header shortcuts and the detail routes, and it needs real production distribution data plus an owner decision. Left unchanged and reported as open, rather than forced.

---

# CARD NAVIGATION

**Unchanged and verified.** Each card remains exactly one semantic link — `section > ul > li > a` — with the href still built from the candidate's own slug via `localizedPath(locale, \`/products/${p.slug}\`)`, the same `product_seo_contents.slug` column `/products/[slug]` resolves against.

A test extracts the card's `<Link>` block and asserts exactly one link per card, with no nested `<button>`, no nested `<a>`, no `onClick`, no `role="button"` and no `tabIndex` inside it. No separate or duplicated CTA was added (§17.11/§72.2). Keyboard reachability and the site-wide `:focus-visible` outline are inherited unchanged from `styles/base.css`.

Live: 6 real, locale-correct, crawlable anchors in the SSR HTML of every locale.

---

# PRICE-FREE REGRESSION

**PASS.** The rendered card is asserted (against comment-stripped source, so a doc comment cannot mask a real occurrence) to contain none of: `price`, `قیمت`, `ریال`, `تومان`, `currency`, `irr`, `discount`.

This remains a data-layer guarantee, not just a UI omission: the homepage candidate query selects no price column at all, so a future edit cannot accidentally surface one. Coverage was extended rather than duplicated — `homepage-projection-invariants.test.ts` and `homepage-source-isolation.test.ts` still own source-of-truth and slug integrity, and the new `homepage-showcase-resilience.test.ts` adds the rendered-card and query-shape angles.

---

# STOCK-INDEPENDENT REGRESSION

**PASS.** The card is asserted to contain none of `stock`, `inventory`, `qty_available`, `موجود`, `ناموجود`, and the candidate query is asserted to reference no inventory column.

§21.2/§74/§81.1's critical invariant (`qty_available = 0` must not hide a card) is structurally satisfied: inventory appears in neither the eligibility gate nor the SELECT list, so a card cannot disappear for a reason the query never evaluates. The new eligibility flag does not weaken this — it is Website merchandising metadata, explicitly never derived from stock, asserted by test and stated in the migration.

---

# TRANSACTION-FREE REGRESSION

**PASS.** No Add to Cart, Buy Now, checkout, quantity or unit selector, or RFQ line editor exists in the Showcase. Asserted against comment-stripped source for `add to cart`, `addtocart`, `buy now`, `checkout`, `quantity`, `سبد خرید`, `افزودن به سبد`, `خرید`, plus a check that no `<button>` appears anywhere in the component. The only interactive element per card remains the single whole-card link.

---

# LOCALIZATION

Verified live in all three locales at a real 1280px layout viewport, with 6 cards:

| Locale | `dir` | Reading order | First card edge | Horizontal overflow | Titles |
|---|---|---|---|---|---|
| fa | rtl | correct (starts right) | right @ 1247px | none | میلگرد, تیرآهن, لوله |
| en | ltr | correct (starts left) | left @ 33px | none | Rebar, Beams, Seamless pipe |
| ar | rtl | correct (starts right) | right @ 1247px | none | حديد التسليح, الكمرات, الأنابيب |

Titles come from `product_seo_contents.h1` per locale, so each locale shows genuinely localized text, not a fallback. Card links are locale-prefixed correctly (`/products/…`, `/en/products/…`, `/ar/products/…`). Logical properties are used throughout, and the flex composition is direction-agnostic, so RTL needs no special-casing — confirmed by measurement rather than inferred.

Section copy (`lib/content/homepage.ts`) was not modified.

---

# SSR

**PASS.** `components/home/product-showcase.tsx` remains a server component: no `"use client"`, no `useEffect`/`useState`, no `fetch`/SWR/React Query, no client-side product fetch of any kind. It receives `items` as a prop, fetched server-side in `app/[locale]/page.tsx` before any JSX is returned.

Product names and links are present in the initial HTML for all three locales (verified by curl above), and the homepage still builds as a dynamic server route `ƒ /:locale`. The only client JavaScript in this surface is the shared `Reveal` wrapper — a bare IntersectionObserver with no library — and it is now purely additive.

---

# PROGRESSIVE ENHANCEMENT

Summarised from P0-1 PROGRESSIVE ENHANCEMENT and NO-JS VERIFICATION:

```
Server-rendered visible cards
        ↓  (optional, only if JS runs)
data-reveal="revealed" added by the client
        ↓  (optional, only if CSS animation runs)
200ms 0.92 -> 1 fade with a 6px settle
```

Every link in that chain is optional, and breaking any of them leaves content visible. The strongest evidence is the live worst case: with the animation attached *and* frozen, cards sit at 92% opacity and read normally.

Reduced motion is fully honoured — `.reveal` and `.reveal[data-reveal="revealed"]` are pinned to `opacity: 1; transform: none; transition: none; animation: none` under `prefers-reduced-motion: reduce`, verified in the compiled CSS.

---

# ACCESSIBILITY

| Criterion | Status |
|---|---|
| Semantic `section > ul > li > a` | PASS — preserved |
| Whole-card link, no nested controls | PASS — tested |
| Keyboard reachability / Enter | PASS — native anchors |
| Visible focus | PASS — site-wide `:focus-visible` 2px outline, no per-component override |
| `aria-labelledby` → heading | **PASS — added.** `<section aria-labelledby="home-product-showcase-heading">` with the id rendered on the `<h2>` |
| Decorative image alt | **PASS — fixed.** `alt=""` (§56/§78), no longer duplicating the adjacent `<h3>` |
| Reduced motion | PASS — reveal and hover both neutralised |
| RTL/LTR | PASS — measured in fa/ar/en |
| 320px usable | PASS — measured, 1 column, no overflow |
| 200% / 400% zoom | PASS — see ZOOM / REFLOW |
| Content never hidden by enhancement | PASS — see NO-JS VERIFICATION |

`SectionHeading` gained one optional `headingId?: string` prop that renders as `id` on its `<h2>`. It is optional and defaults to omitted, so all existing callers are unaffected and emit no id — checked before assuming a change was needed, as instructed. No ARIA beyond §72.1's preferred structure was added.

---

# FOCUS

**PASS, unchanged.** The card anchor inherits `styles/base.css`'s `:focus-visible { outline: 2px solid var(--aa-color-focus-ring); outline-offset: 2px }` with no per-component override — a real outline, not a low-contrast box-shadow. No focus trap is possible on a plain anchor, and no required information is hover-only: title and descriptor are always visible, and only the directional arrow's opacity and the image's 1.5% scale change on hover, neither carrying information (§17.16/§64.7/§78).

At every zoom level tested, all 6 card links remained present with non-zero dimensions and a real `href`.

---

# RESPONSIVE MATRIX

Measured live at all eight viewports V2.0 §83 names, at the current 6-card count:

| Viewport | Columns | Rows | Card width | Horizontal overflow |
|---|---|---|---|---|
| 320 | 1 | 1×6 | 288px | none |
| 360 | 1 | 1×6 | 328px | none |
| 390 | 2 | 2+2+2 | 179px | none |
| 430 | 2 | 2+2+2 | 199px | none |
| 768 | 2 | 2+2+2 | 361px | none |
| 1024 | 3 | 3+3 | 321px | none |
| 1280 | 3 | 3+3 | 405px | none |
| 1440 | 3 | 3+3 | 405px | none |

Tablet (768px) additionally reproduces §30's worked examples exactly across counts 1–8 — `2`, `2+1`, `2+2`, `2+2+1`, `2+2+2`, `2+2+2+1`, `2+2+2+2` — with the card width constant at 361px for every count, so a lone final card stays standard width and centred and never becomes double-width.

---

# COUNT × VIEWPORT MATRIX

**Method, disclosed precisely.** The Chrome window in this environment could not be resized beyond ~1054 CSS px (`resize_window` reported success but `innerWidth` stayed pinned), and the app sends `x-frame-options: DENY`, so it cannot be framed. Rather than weaken a security header, verification used a **same-origin static harness**: the real compiled production stylesheet (`dist/client/_next/static/css/index.*.css`) plus the **real server-rendered Showcase markup** extracted verbatim from the SSR HTML of each locale, served from a scratch directory on a separate port and loaded in an iframe of an exact pixel width. Media queries evaluate against the iframe's own layout viewport, so breakpoints are exercised genuinely; row grouping was then read from `getBoundingClientRect()` on the real `<li>` elements — objective measurement, not eyeballing a screenshot. Card images were replaced with an inline SVG stub of identical box size (the box is CSS-driven via `aspect-16/11`, so layout is unaffected) purely to keep measurement fast.

Counts above the current display cap of 6 were produced by **cloning existing `<li>` nodes in the DOM and updating `data-count`** — exercising the shipped CSS at the real viewport. **No fabricated product records were created, and production/public D1 was never touched to fake a count.** Counts 0–6 were additionally driven end-to-end through real local D1 data via the new `show_on_homepage` flag.

Required minimum matrix, all measured:

| Viewport | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| 390 | 1 | 2 | 2+1 | — | 2+2+1 | 2+2+2 | — | — |
| 768 | 1 | 2 | 2+1 | 2+2 | 2+2+1 | 2+2+2 | 2+2+2+1 | 2+2+2+2 |
| 1280 | 1 | 2 | 3 | 4 | **3+2** | 3+3 | **4+3** | 4+4 |
| 1440 | — | — | — | 4 | **3+2** | 3+3 | **4+3** | 4+4 |

Every row centred (verified by comparing each row's leading and trailing gap against the container, tolerance 2px). No orphan wide-desktop row, no carousel, 5 = 3+2 and 7 = 4+3 as the frozen matrix requires.

Count 0 was verified separately and end-to-end against real local D1 (see ZERO-PRODUCT BEHAVIOR): the section is absent from the DOM entirely.

---

# ZOOM / REFLOW

Browser zoom reduces the CSS layout viewport proportionally, so 200% of a 1280px window is equivalent to a 640px layout viewport and 400% to 320px — the width at which WCAG 1.4.10 reflow is specified. The `computer` tool rejects page-zoom keyboard shortcuts, so the equivalence method was used; this is disclosed rather than described as literal browser zoom.

| Case | Layout viewport | Columns | Horizontal overflow | Title clipped | All 6 links reachable |
|---|---|---|---|---|---|
| FA desktop @200% | 640 | 2 | none | no | yes |
| FA desktop @400% | 320 | 1 | none | no | yes |
| FA mobile 390 @200% | 195 | 1 | none | no | yes |
| EN desktop @200% | 640 | 2 | none | no | yes |
| EN desktop @400% | 320 | 1 | none | no | yes |

No clipped titles, no horizontal document overflow from the Showcase, and every card link retained non-zero dimensions and a real href — including at an extreme 195px, well below the 320px requirement.

---

# FAILURE SIMULATION

| Scenario | Method | Result |
|---|---|---|
| Zero eligible candidates | Real: all products excluded via `show_on_homepage = 0`, homepage re-fetched | Section absent from DOM; rest of homepage renders (257KB) |
| Product excluded from Homepage but published | Real: `show_on_homepage = 0` on one template | Absent from homepage, still present on `/products` |
| Template with no ranking overlay row | Real: row deleted → NULL | Remains a candidate (backward-compatible) |
| Template not public | Real: `is_public = 0` | Not a candidate |
| JS never executes | curl SSR HTML + compiled CSS inspection | No hiding attribute or style exists; content visible |
| Observer throttled / never fires | Live: background tab, observed naturally | `data-reveal` never set; all cards at `opacity: 1` |
| Animations frozen mid-reveal | Live: forced `revealed` in a tab where animations do not advance | All cards at `opacity: 0.92`, fully legible |
| Reduced motion | Compiled CSS inspection | Reveal and hover both neutralised, content pinned visible |
| Projection read throws | Code + scoped-catch tests | Empty list → section omitted, homepage healthy, no 500 |
| Missing media for a family | Live: seeded families with no dedicated photo | Neutral generic placeholder, never another family's image |

The projection-read failure was verified by construction and by tests that pin the catch's scope, rather than by inducing a real D1 outage — inducing one was not available here. Stated plainly rather than implied.

---

# FILES CREATED

```
lib/catalog/homepage-showcase-layout.ts                 — canonical 0–8 composition table + data-count helper
lib/catalog/homepage-showcase-layout.test.ts            — frozen matrix + stylesheet-drift tests (16)
lib/catalog/homepage-progressive-enhancement.test.ts    — P0-1 regression pins (13)
lib/catalog/homepage-eligibility.test.ts                — eligibility SQL shape, migration, CLI (9)
lib/catalog/homepage-showcase-resilience.test.ts        — failure isolation, zero-state, price/stock/transaction (12)
migrations_public/0010_homepage_eligibility.sql         — additive show_on_homepage column
docs/product-showcase/PRODUCT_SHOWCASE_P1_V2_0_COMPLIANCE_REPORT.md   — this file (report commit)
```

---

# FILES MODIFIED

```
components/ui/reveal.tsx                — no-hidden-state entrance animation (P0-1)
styles/theme-extensions.css             — reveal rules + keyframes, .aa-showcase-grid composition
components/home/product-showcase.tsx    — data-count layout, zero-state omission, alt="", aria-labelledby, hover, stagger, sizes
components/ui/section-heading.tsx       — optional headingId prop
app/[locale]/page.tsx                   — scoped failure boundary around the catalog read
lib/catalog/editorial-repository.ts     — homepage-only NULL-safe eligibility condition
lib/catalog/editorial-cli.ts            — buildSetHomepageEligibilitySql upsert
scripts/catalog-editorial.ts            — include-on-homepage / exclude-from-homepage commands
```

Not modified: `components/home/hero.tsx`, `components/home/price-strip.tsx`, `components/ui/button*`, the Header, `wrangler.jsonc`, `lib/catalog/homepage-config.ts` (`HOMEPAGE_PRODUCT_DISPLAY_COUNT` still 6), `lib/ranking/*`, `lib/catalog/media-registry.ts`, `components/products/catalog-empty-state.tsx`, and both frozen spec/audit documents.

`tsconfig.tsbuildinfo` is a tracked incremental build cache that the build touched; it was restored to HEAD rather than committed, matching how recent feature commits in this repository treat it.

---

# MIGRATION FILE

`migrations_public/0010_homepage_eligibility.sql` — see DB_PUBLIC MIGRATION. Additive single `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT 1 CHECK (…)`. Applied to local D1 only. Included in the runtime commit as part of the runtime architecture.

---

# RUNTIME COMMIT

`813e992375f88cf6c24522697db9850a69094cc2` — `fix(home): align Product Showcase with frozen V2.0`

14 files changed, 1438 insertions(+), 78 deletions(-). Staged file-by-file after reviewing `git status --short`; never `git add -A`.

---

# PRODUCT SHOWCASE TESTS

New coverage, 50 tests across four files, all passing:

```
lib/catalog/homepage-showcase-layout.test.ts             16 pass
lib/catalog/homepage-progressive-enhancement.test.ts     13 pass
lib/catalog/homepage-showcase-resilience.test.ts         12 pass
lib/catalog/homepage-eligibility.test.ts                  9 pass
```

Highlights: the frozen 0–8 matrix asserted row-by-row; a stylesheet-drift test that fails if the CSS and the canonical table disagree; a card-width-stability test encoding the §26 rule the medium-tier defect violated; the P0-1 pins (no hidden resting state, keyframes-only transparency, `forwards`-only fill, `from` opacity ≥ 0.9, JS never sets a hiding phase); the NULL-safe LEFT JOIN rule and the "homepage gate must not be in the shared constant" rule; the narrowly-scoped catch; and the price/stock/transaction-free assertions evaluated against comment-stripped source.

Fixtures are pure unit-level data; nothing was persisted to DB_PUBLIC by any test.

Existing suites were extended rather than duplicated — `homepage-projection-invariants.test.ts` and `homepage-source-isolation.test.ts` were left untouched and still pass.

---

# FULL TESTS

```
$ npm test
ℹ tests 941
ℹ suites 0
ℹ pass 941
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

**941/941 passing, 0 failures.** Baseline was 891; the 50 new tests account for the difference, and **all 891 pre-existing tests still pass** — no regression.

---

# TSC

```
$ npx tsc --noEmit
(no output, exit code 0)
```

Clean, zero errors.

---

# BUILD

```
$ npm run build
✓ built (all 5 stages)

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

  Build complete.
```

Succeeded. The homepage still builds as a dynamic server route (`ƒ /:locale`), not a client bundle entry.

---

# PRODUCTION SAFETY

- **No push. No deploy.** Both commits are local to `worktree-product-showcase-p1`.
- **No remote D1 migration or write.** Migration 0010 was applied only with `--local`, against this worktree's own `.wrangler/state`. Staging and production databases were never contacted.
- **No Odoo contact** of any kind.
- **`wrangler.jsonc` untouched** — no staging or production environment variable changed. `HOMEPAGE_RANKING_MODE` remains `"base"` in both.
- **`HOMEPAGE_PRODUCT_DISPLAY_COUNT` unchanged at 6.** The layout supports 1–8 generically; the business display count was not altered.
- **Frozen components untouched** — Header V2.2, Hero V2.4, shared Button V1.0 and the Price Strip. The Price Strip remains disabled; the shared `Reveal` change provably does not reach Hero or Price Strip (see REVEAL SHARED-COMPONENT REGRESSION).
- **No fabricated business facts** — no prices, stock, statistics, testimonials, certifications, or media provenance were invented. Test data used for verification lives only in local D1.
- **Frozen documents unedited** — the V2.0 spec and the P0 audit were read, not modified.
- Local scratch artefacts (`node_modules/`, `.wrangler/`, `/tmp` harness) are gitignored or outside the repository and do not appear in `git status`.

---

# REMAINING DEFERRED ITEMS

1. **P1-3 — Odoo→Website media governance pipeline (§38–§54).** No sync/import/checksum/versioning/approval-state model exists. Deferred under §51's explicit tolerance of static repository assets at current launch scale. The current approach is safe (no live Odoo image dependency, no misleading fallback, no AI generation), so this is an architecture gap rather than a risk.
2. **Media provenance** — source, rights basis, approver and approval date for the committed photographs. Requires owner evidence; deliberately not invented.
3. **Photography style** — several product photographs are yard/warehouse scenes rather than §17.4/§17.6's preferred studio-style product visuals. A media decision, not a code change.
4. **P2-4 — template vs. family card grain.** Reviewed; left unchanged for want of production distribution data. Needs an owner architecture decision if real duplication appears.
5. **P2-5 — `auto` ranking governance.** The mode is correctly disabled everywhere, but no documented process requires explicit owner approval before enabling it. A process artefact, not runtime code.
6. **Card aspect ratio (P3-3).** Still 16:11 (~1.4545) against §17.14's preferred 4:3 or 5:4. Left alone as an approved-visual-direction question; the current implementation is authoritative per CLAUDE.md §5a.
7. **`--aa-motion-reveal` token (600ms)** is now unused by `.reveal`, which declares its own §64.3-compliant 200ms. The token is still referenced elsewhere in `styles/`; not cleaned up here to keep this change contained.
8. **Two dead CSS rules** (`.scale-105`, `.duration-700`) persist in the compiled stylesheet because Tailwind v4 auto-scans the repository including `docs/**/*.md`, and the P0 audit document names those class strings in prose. Harmless (~250 bytes, no element uses them) and **not fixable without editing the immutable P0 audit**, so deliberately left. This report avoids naming utility classes in prose for the same reason.
9. **Stale `CLAUDE.md` §5 text** claiming scheduled catalog sync and public catalog pages "not yet built", when both exist and are wired for production. Unrelated documentation drift, noted by the P0 audit. **Not fixed in either commit of this pass**, per §35 of the task. Worth a separate documentation follow-up.

---

# CURRENT FREEZE STATUS

```
Header                V2.2   FROZEN — untouched
Hero                  V2.4   FROZEN — untouched (does not use Reveal)
Shared Button         V1.0   FROZEN — untouched
Price Strip                  FROZEN, disabled — untouched (does not use Reveal)
Product Showcase      V2.0   COMPLIANT — this pass
```

The Product Showcase runtime now satisfies every required V2.0 gate that is implementable without owner input. `READY FOR PRODUCT SHOWCASE FREEZE: YES`, with the media-governance items above explicitly carried as known, accepted deferrals rather than silent gaps.

---

# NEXT PHASE

1. **Owner input on media provenance** — enough to record source, rights basis and approval for the existing photographs, closing the one summary-block line still short of VERIFIED.
2. **Production data check for the grain question (P2-4)** — a read-only query of published templates grouped by classification code answers it definitively; only then is an architecture decision warranted.
3. **Governance note for `auto` ranking (P2-5)** — a short documented rule that enabling demand-influenced ordering is an owner decision, not a deploy toggle.
4. **Media governance pipeline (P1-3)** when catalog scale outgrows §51's static-asset tolerance.
5. **Separate documentation pass** for the stale `CLAUDE.md` §5 text (item 9 above).

None of the above blocks the Product Showcase freeze.
