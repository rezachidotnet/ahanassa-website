# PRICE-P4 — Final Homepage Price Strip UI — Verification Report

# RESULT

READY FOR PRICE-P5.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `e2939ab837f24fb2a23e15814b34733c6f8f9458`
- `git status --short` at task start: empty.
- PRICE-P3 runtime commit (`24b261c8c79020c7cdd8bd9fbffb2bf307f7d646`), PRICE-P3 report, PRICE-P3.1 test commit (`3d865cef8be7af4e3c4fa15081958a7513b0abd8`), and PRICE-P3.1 report commit (`e2939ab837f24fb2a23e15814b34733c6f8f9458`) all verified present.
- Frozen V2.1 spec (`docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`) verified present, unmodified.
- No unrelated drift found — proceeded.
- `PRICE_STRIP_ENABLED` never set to `"true"` in any committed config (`wrangler.jsonc` staging/production both remain `"false"`) — only in a local, gitignored `.dev.vars` used exclusively for this session's own local `npm run dev` verification, created and deleted within this task, never committed.
- No push, no deploy, no remote D1 migration. No real provider implemented. No production benchmark data populated. No Header/RFQ/Processing/Product-Showcase code touched.

# BASE SHA

`e2939ab837f24fb2a23e15814b34733c6f8f9458`

# PRICE-P4 RUNTIME COMMIT

`51061927622b19567576b7c84b847255feabda61`

# FINAL COMPONENT CONTRACT

`components/home/price-strip.tsx` — server-only, prop-driven (`{ locale, items }`), zero data-fetching of its own. Delegates every wording/threshold/formatting decision to the new pure `lib/pricing/price-strip-presentation.ts` module:
- `shouldRenderPriceStrip(itemCount)` — the 0/1/2+ threshold.
- `formatToman`, `formatEffectiveTimestamp` — locale-aware `Intl` formatting, fail-closed (falls back to the raw ISO string on a malformed timestamp rather than throwing).
- `buildCommercialContextLine` — conditional market/delivery-basis join.
- `buildFreshnessLine` — FRESH vs AGING wording selection.

This split exists because `price-strip.tsx` imports `next/link`, which has no real resolvable `node_modules` package in this repo (vinext supplies it only inside the Vite build) — it cannot be imported under plain `node --test` at all. The pure module carries every testable decision; the component itself is pinned by a static source-text test.

# HOMEPAGE PLACEMENT

Unchanged: `app/[locale]/page.tsx` renders `<Hero /> <PriceStrip /> <ProductShowcase /> ...` — verified by reading the file (not modified in this phase). Price Strip remains Homepage-only (a static test confirms `SiteHeader.tsx`/`enquiry-form.tsx` never reference it), non-sticky (no `sticky`/`fixed` class anywhere in the component), and is not a second Header row.

# RENDER THRESHOLD

PASS — verified BOTH as a pure unit test and live against the real read model with real local D1 data:
- Pure: `shouldRenderPriceStrip(0) === false`, `(1) === false`, `(2) === true`, `(6) === true` (`price-strip-presentation.test.ts`).
- Live: toggled `price_display_products.is_active` against 6 real curated fixture rows through `PRICE_STRIP_ENABLED=true` local dev — 0 eligible → 0 occurrences of `selected-prices-heading` in the rendered page; 1 eligible → 0 occurrences; 2 eligible → renders exactly those 2; 6 eligible → renders all 6. A STALE quote (source_timestamp pushed to 3 days old) was also confirmed excluded live: the strip correctly dropped from 6 to 5 items with no error.

# HEADING / TRUST GUIDANCE

Heading: exact Frozen V2.1 §6 Persian wording "آخرین قیمت‌های منتخب" (fa); "Latest selected prices" (en, preserving the "selected/curated" nuance of "منتخب"); "أحدث الأسعار المختارة" (ar, genuine Arabic, not reused Persian). Rendered at 19px, visually compact (confirmed in screenshots — does not compete with the Hero's much larger display type).

Guidance: Frozen V2.1 §48.1's exact preferred Persian sentence, plus natural EN/AR equivalents — rendered as **visible body text** immediately below the heading (`<p>`, not a `title` attribute, not hover/tooltip-only — a static test explicitly asserts this). No generic shield/trust badge added.

# CARD INFORMATION

All 8 required fields render for every card: title (catalog-authoritative, never `provider_title` — structurally impossible since `QuoteCandidate` carries no such field), exact specification (`item.specification`, bidi-isolated), price, unit (adjacent to price), market/location (conditional), delivery basis (conditional), effective timestamp, freshness wording. Verified live: e.g. `"SHS 40×40×3"` card rendered `"تهران · درب کارخانه"` as its commercial-context line; cards with neither field rendered no context line at all and no literal `"undefined"`/`"null"`.

# FRESH PRESENTATION

`freshnessState === "fresh"` → `"{updatedPrefix} {timestamp}"` (e.g. `"به‌روزرسانی ۱۳ شهریور ۱۴۰۵، ۱۸:۳۳"` / `"Updated Sep 4, 2026, 6:33 PM"`). No badge, no pulse, no color-coded chip — confirmed in every screenshot.

# AGING PRESENTATION

`freshnessState === "aging"` → `"{agingPrefix} · {timestamp}"` (e.g. `"آخرین قیمت ثبت‌شده · ۱۲ شهریور ۱۴۰۵، ۱۹:۳۳"` / `"Last recorded price · Sep 3, 2026, 5:33 PM"`) — verified live with a real AGING fixture (25-hour-old quote under a daily cadence policy). The real timestamp remains visible in both states; the two states are distinguished by wording, never color alone (both render in the same muted gray). STALE/UNAVAILABLE are structurally unreachable (`PublicPriceStripItem.freshnessState` is typed `"fresh" | "aging"` only, PRICE-P3/P2).

# LINK / NON-LINK BEHAVIOR

`item.href` present → the entire card is one `<Link>` (`next/link`, real `<a>`) to `/products/{slug}?variant={xid}` — the exact existing `?variant=` convention `app/[locale]/products/[slug]/page.tsx` already consumes for variant highlighting (verified by reading that file — no new route). `item.href` absent → a plain non-interactive `<div>`, same visual card, no fabricated link, no CTA button anywhere.

# SEMANTIC HTML

`<section aria-labelledby="selected-prices-heading">` containing `<h2 id="selected-prices-heading">`; a real `<ul>` of `<li>` per benchmark. No `role="menu"`/`"listbox"`/`"tablist"`/`"button"`, no carousel ARIA. Verified both statically (`price-strip-static.test.ts`) and live: `section[aria-labelledby='selected-prices-heading']` resolves to exactly the heading's own `id` in the rendered DOM; `ul > li` count matched the eligible item count at every tested state (0/1/2/6).

# ACCESSIBILITY

- No `aria-live` anywhere (Frozen V2.1 §36.9) — confirmed statically and in every rendered page's HTML.
- `prefers-reduced-motion: reduce` — section still renders normally (there is no animation in this component to suppress in the first place; no `Reveal`/client JS was used, unlike other Homepage sections).
- Bidi isolation: `<bdi dir="ltr">` around `item.specification`; `dir="ltr"` on the price+unit line — verified visually in fa/ar screenshots that technical tokens (`AJ340 · Ø10`, `S355JR · 50×2000×6000`) read left-to-right correctly embedded inside RTL paragraphs, with no reordering of surrounding punctuation.

# KEYBOARD RESULT

PASS. Real keyboard-only traversal (Playwright, real Chromium): `Tab` from page load reached the first Price Strip card's link after 13 tabs (passing through Header/Hero controls first, in DOM order — matches visual order, no skip/trap). `element.matches(':focus-visible')` was `true` at that point. A non-linked (no-href) card is a plain `<div>` and never receives a tab stop (confirmed no `tabindex` is ever added to it).

# CONTRAST RESULT

PASS — measured, not estimated (WCAG relative-luminance formula against this project's own real hex tokens, `styles/tokens.css`):

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| Navy text (`#0B2545`) on cream section bg (`#FBF5EB`) | 14.19:1 | ≥4.5:1 | PASS |
| Navy text on white card bg (`#FFFFFF`) | 15.39:1 | ≥4.5:1 | PASS |
| Muted metadata text (`#475467`, spec/timestamp/context/aging line) on cream | 7.09:1 | ≥4.5:1 | PASS |
| Muted metadata text on white card | 7.69:1 | ≥4.5:1 | PASS |
| Copper focus ring / hover accent (`#B04A2F`) on white card | 5.43:1 | ≥3:1 | PASS |
| Copper on cream | 5.01:1 | ≥3:1 | PASS |

Also measured, reported honestly rather than omitted: white card background vs. cream section background is only **1.08:1** — cards are not distinguished from the section by background color contrast alone; they rely on the (low-contrast, ~1.09:1) subtle border plus a light shadow for boundary definition. This is the Frozen V2.1 spec's own explicit design direction (§32.2: "white surface; subtle border; negligible/light shadow"), and visually the boundary reads clearly in every captured screenshot (shadow + border + spacing together, not color contrast alone) — not a text-contrast failure, but noted here rather than silently glossed over per this task's "do not hide visual defects" instruction.

Live keyboard-focus measurement confirmed the ACTUAL rendered outline color (not just the token value) is `rgb(176, 74, 47)` = `#B04A2F` = copper, `outline-style: solid`, `outline-width: 2px`, `outline-offset: 2px` — matching `--aa-color-focus-ring` exactly.

# RTL / LTR / BIDI

`html[dir]` verified live: `rtl` for fa and ar, `ltr` for en. Technical tokens (grades, dimensions, SCH-suffixed pipe sizes) confirmed rendering left-to-right and un-mistranslated in all three locales via real screenshots. Arabic copy is genuine Arabic (not Persian reused) — verified by direct visual/textual inspection of the ar screenshots.

# MOBILE LAYOUT

PASS. At 390px: native `overflow-x-auto` + `snap-x snap-mandatory` — live-measured `ul.scrollWidth (1264) > ul.clientWidth (358)`, confirming a genuinely scrollable strip; `overflowX: auto` confirmed via computed style. Screenshots at 320/360/390px (fa) and 390px (en/ar) show one comfortably readable card plus a visible partial next card (RTL: partial card visible on the left edge, matching RTL scroll direction correctly) — matching Frozen §32.7's "discoverability" direction. No `page.body.scrollWidth > clientWidth` overflow at any of these widths (confirmed for all three locales).

# TABLET LAYOUT

PASS. At 768px: `grid-cols-3` — 3 columns × 2 rows for 6 items (the Frozen §32.6 "3×2 medium-desktop" direction, achieved starting at `md`). Screenshot confirms clean, non-cramped card widths (~233px computed) with correctly wrapped titles and no overflow.

# DESKTOP LAYOUT

PASS. At 1024px: still 3 columns (roomy, ~312px cards). At 1280px and 1440px: `grid-cols-6` — **all 6 cards render in exactly one row** (`uniqueRowTops: 1`, live-measured via each card's own bounding-box `y` position), matching Frozen §32.5 "up to 6 benchmark cards in a single row when content fit remains comfortable." Measured card width at 1280px: ~193px, comfortably inside the Frozen §32.9 target range of ~180–195px (container ≈1216px inner width, 6 columns, 12px gaps).

# ZOOM / REFLOW

PASS, verified two ways:
1. **`document.body.style.zoom` simulation** (200%/400%) at a 1280px base viewport: after the fixes below, every one of the 6 cards' inner content shows `scrollWidth === clientWidth` at both zoom levels (no per-card horizontal overflow) — measured directly via `getComputedStyle`/`getBoundingClientRect`, not just visual inspection. A full-page screenshot at this simulated zoom level could not be reliably captured (a known Chromium/Playwright coordinate-mapping limitation between `body.style.zoom` and the CDP screenshot/scroll APIs — screenshots came back blank despite the DOM measurements being correct and `element.textContent` confirming all text genuinely present) — reported honestly as a tooling limitation, not silently worked around by skipping the check.
2. **320/400 CSS px viewport** (the standard WCAG 1.4.10-equivalent way to verify "400% zoom on a 1280px reference" — an effective 320px viewport): `document.body.scrollWidth === document.documentElement.clientWidth` (no overflow) at both 320px and 400px, confirmed live, with a full, reliable screenshot showing clean wrapped card content.

# REDUCED MOTION

PASS. `prefers-reduced-motion: reduce` context: section renders identically, fully visible. No motion exists in this component to begin with (no `Reveal`, no CSS transition beyond the ordinary `hover`/`focus-visible` color/border transitions already covered by `styles/theme-extensions.css`'s existing reduced-motion override for `.reveal`, which this component doesn't even use).

# RESPONSIVE MATRIX

| Width | Locale(s) tested | Result |
|---|---|---|
| 320 | fa | No overflow; mobile scroll-snap; clean wrap |
| 360 | fa | No overflow |
| 390 | fa, en, ar | No overflow; mobile scroll-snap |
| 768 | fa | 3×2 grid, no overflow |
| 1024 | fa | 3-column grid, no overflow |
| 1280 | fa, en, ar | 6-in-one-row grid, no overflow (after fix) |
| 1440 | fa | 6-in-one-row grid, no overflow |

# ZERO-DATA RESULT

PASS — live-verified: 0 eligible curated rows → the homepage HTML contains zero occurrences of `selected-prices-heading` (the section renders nothing at all — no empty shell, no placeholder, no "coming soon").

# ONE-ITEM RESULT

PASS — live-verified: exactly 1 eligible curated row → zero occurrences of `selected-prices-heading` (a lone benchmark is never shown in isolation).

# TWO-ITEM RESULT

PASS — live-verified: exactly 2 eligible curated rows → the section renders with exactly those 2 items (confirmed both item identity and count).

# SIX-ITEM RESULT

PASS — live-verified: 6 eligible curated rows → the section renders all 6, all in one row at desktop width, matching the read model's own `MAX_HOMEPAGE_PRICE_STRIP_ITEMS = 6` cap.

# FAILURE ISOLATION

Unchanged from PRICE-P3 (`lib/pricing/repository.ts`): a read-model failure returns `[]`; this component then returns `null` for `[]`/single-item input — no code path in this phase introduces a throw on missing optional metadata (`buildCommercialContextLine`/`buildFreshnessLine` are total functions over their inputs, both pure-unit-tested for the "absent" case).

# PERFORMANCE / CLIENT JS

PASS. No `"use client"`, no `fetch()`, no `useEffect`/`useState`/`useRef`, no `setInterval`/`setTimeout`, no carousel/marquee/autoplay library reference — all confirmed by a static source-text test that strips comments first (avoiding false positives from this file's own explanatory doc comments, the same risk `lib/catalog/homepage-source-isolation.test.ts` already documents). The Price Strip is present in the server-rendered initial HTML or entirely absent — never a client-side insertion (verified by `curl`ing the raw SSR HTML directly during live verification, no browser JS required to see the content).

# VISUAL EVIDENCE

Captured via a real headless Chromium (Playwright 1.48.0, installed ephemerally to this session's OS scratchpad only — not a project dependency, matching the PRICE-P4/Header-P7 established convention) against a local `npm run dev` server with `PRICE_STRIP_ENABLED=true` (local `.dev.vars` only) and real local-D1-anchored fixture data (real catalog templates/variants — rebar AJ340 Ø10/Ø16/Ø20/Ø28, SHS 40×40×3, hot-rolled plate S355JR 50×2000×6000 — with synthetic-but-labeled quote/policy/display rows). Screenshots taken at fa/en/ar × 320/360/390/768/1024/1280/1440px, plus keyboard-focus and 320/400px narrow-viewport captures. All screenshots exist only in this session's ephemeral scratchpad (`/private/tmp/.../scratchpad/pw/shots/`), not committed to the repository.

# LOCAL FIXTURE CLEANUP

All test-only rows deleted after verification, confirmed via a final row-count read-back:
- `price_display_products`: 0 rows (was 0 before this phase).
- `public_price_quotes`: 0 rows (was 0 before this phase).
- `price_provider_policies`: 0 rows (was 0 before this phase).
- `product_seo_contents`: 3 rows (back to the exact pre-existing fa-only set; the 6 temporary en/ar rows added for this phase's locale verification were deleted).
- `product_variants`: 237 (unchanged).
- `.dev.vars` deleted from disk.
- The local `npm run dev` server process was stopped at the end of verification.

# FILES CREATED

- `lib/pricing/price-strip-presentation.ts`
- `lib/pricing/price-strip-presentation.test.ts`
- `lib/pricing/price-strip-static.test.ts`

# FILES MODIFIED

- `components/home/price-strip.tsx` (full UI rewrite over the unchanged P3 data contract)
- `lib/content/homepage.ts` (`priceStrip` copy: added `guidance`, renamed `staleLabel` → `agingPrefix` with Frozen-spec wording, updated heading/prefix copy for fa/en/ar)

# PRICING TEST RESULTS

`npx tsx --test lib/pricing/*.test.ts` → **201 pass, 0 fail** (up from PRICE-P3.1's 168; +33: presentation logic + static source tests).

# FULL TEST RESULTS

`npm test` (full repository suite) → **826 pass, 0 fail** (up from 793).

# TSC

`npx tsc --noEmit` → clean, 0 errors.

# BUILD

`npm run build` (`vinext build`) → succeeded, all 11 routes built. `tsconfig.tsbuildinfo` restored via `git restore` after the build.

# DOMAIN REGRESSION RESULTS

- Header/content: `npx tsx --test lib/content/*.test.ts` → 38 pass.
- Processing: `npx tsx --test lib/processing/*.test.ts` → 42 pass.
- Catalog (includes Homepage): `npx tsx --test lib/catalog/*.test.ts` → 220 pass.
- RFQ/Contact: `npx tsx --test lib/rfq/*.test.ts` → 192 pass.
- Locales (hreflang/metadata): `npx tsx --test lib/metadata/*.test.ts` → 5 pass.
- Full suite: 826 pass, 0 fail.

# GIT

- Runtime commit: `51061927622b19567576b7c84b847255feabda61` — "feat: finalize Homepage Price Strip v2.1 UI".
- Report commit (this file; evidence only): recorded after this file is committed — see the final response for its SHA.
- No amendment of any prior commit. No push. No force operations.

# PRODUCTION SAFETY

`PRICE_STRIP_ENABLED` remains `"false"` in both staging and production `wrangler.jsonc` blocks — untouched by this phase. The only place it was ever `"true"` was a local, gitignored `.dev.vars` file, created for this session's own local verification and deleted before finishing. No `--remote` D1 flag was used at any point. No real price provider was implemented (still the deliberately-throwing stub, unchanged). All fixture rows were clearly test-labeled (`test-p4-*`) and fully deleted; two temporary EN/AR `product_seo_contents` rows were also deleted, restoring the exact pre-existing fa-only editorial state.

# REMAINING RISKS

- The two real defects found and fixed in this phase (card-content overflow from an unreset `shrink-0`, and unwrapped long technical tokens at extreme zoom) were only discoverable through real-browser rendering with real content lengths — a reminder that this class of CSS Grid/Flexbox intrinsic-sizing bug is invisible to unit tests and static analysis alone; any future Price Strip visual change should be re-verified in a real browser, not just re-run through the test suite.
- Contrast for the card-vs-section background boundary (1.08:1) relies on border+shadow rather than color contrast — acceptable per the Frozen spec's own explicit design direction and confirmed visually clear in every screenshot, but flagged here as a soft area worth a second look if a future design pass ever changes the border/shadow treatment.
- The `body.style.zoom` full-page screenshot limitation (tooling, not site behavior) means zoom evidence for this report combines a reliable narrow-viewport equivalent test with DOM-level (non-screenshot) measurements at true zoom — a future phase with access to native OS/browser zoom emulation could capture a literal zoomed screenshot as an extra confirmation, though the underlying claim (no overflow, all text present) is already verified two independent ways.
- No production/staging price or curation data exists yet — this remains entirely deferred to a future phase (PRICE-P5+) that implements a real provider per the task's own explicit non-goal for this phase.

# NEXT PHASE

PRICE-P5 (or whichever phase is authorized next) can implement a real price provider, real provider→product/variant mappings, and real owner-curated benchmark rows, then flip `PRICE_STRIP_ENABLED` on in staging first — the read model (PRICE-P1/P2/P3/P3.1) and the UI (PRICE-P4) are both already fully verified and require no further architecture or presentation work to go live.
