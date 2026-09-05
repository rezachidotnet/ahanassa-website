# NAV-P1.1 — Final Header V2.1 Implementation Reconciliation + Freeze Gate

# RESULT

B — HEADER V2.1 RECONCILED — REAL ODOO LOCALIZED DATA SPOT-CHECK PENDING — READY FOR HERO.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `c281a138a2d0074598735393fdf0a8af5d8c0950`
- `git status --short` at task start: empty.
- `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md` verified present (81,965 bytes, 3936 lines) — read in full.
- Spec import commit (`9406df0221dd3d02dc56829275374b6498edb3ac`), durability report commit (`c281a138a2d0074598735393fdf0a8af5d8c0950`), and NAV-P1 runtime commit (`e4ecb3fe6d4018611b3547b3fb43d35a5f0d100d`) all verified present in `git log`.
- No unrelated drift found — proceeded.

# BASE SHA

`c281a138a2d0074598735393fdf0a8af5d8c0950`

# AUTHORITATIVE SPEC

`docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md`, read in full (all 3936 lines, §1–§82). Its own structure: §1–§61 are the original "Version 1.0 through 2.0" content (identical section numbers to the historical root-level `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md`, confirmed by spot-checking several citations against both files); §62–§82 is the new "Version 2.1 — Consolidated Accessibility, UX & Conversion Hardening" content, which explicitly does **not** reopen the five top-level items, their routes, the Products/Services hybrid pattern, Header geometry, the Public Product/Processing Projection architecture, primary CTA wording, mobile drawer hierarchy, or global container width (§62's own list). This reconciliation therefore checked V2.0-carried-forward rules for regression only, and treated §62–§82 as the genuinely new acceptance surface to verify against real implementation.

# TOP-LEVEL IA

PASS, unchanged. Order: Products → Services → Industries → About → Contact (`lib/content/nav.ts#navLinks`, re-confirmed by test). Routes: `/products`, `/services`, `/industries`, `/about`, `/contact`. Primary CTA: `ارسال لیست خرید` → `/request`. No `/markets` in primary nav. No Search anywhere. Nothing in this dimension was touched.

# PRODUCTS / SERVICES HYBRID DISCLOSURE

PASS. Both remain: real `<a>` label + adjacent real `<button>` chevron with `aria-expanded`/`aria-controls`. No `role="menu"`/`"menubar"`/`"menuitem"` anywhere (re-confirmed by test). Verified live: click, keyboard (Tab→Enter→Escape), route-change close, outside-click close, chevron visual rotation synchronized with `aria-expanded` (`true`/`false` observed matching the rotated/unrotated chevron state in screenshots).

# DISCLOSURE ACCESSIBLE NAMES

**Real mismatch found and fixed.** Before this phase, the chevron's `aria-label` was `{label}` — literally the same string as the adjacent link's own visible text (e.g., a "Products" button sitting right next to a "Products" link, so a screen-reader user would hear the same word announced twice with no way to distinguish which control does what). V2.1 §63.4 explicitly prefers a distinct, localized name (e.g., "More product navigation" / "گزینه‌های بیشتر محصولات"). Fixed: new `lib/content/nav.ts#dropdownDisclosureAccessibleName` (fa/en/ar, both Products and Services), wired into both `HeaderNavDisclosure` (desktop chevron, new `disclosureLabel` prop) and `MobileNavDrawer` (accordion toggle, new `disclosureAccessibleName` prop) — the same underlying issue existed in both places, fixed in both. Live-verified: FA chevron's real rendered `aria-label` = `"گزینه‌های بیشتر محصولات"`, distinct from its adjacent link's own text `"محصولات"`.

# ARIA-CURRENT

PASS, unchanged. `isCurrentPage` (exact match) drives `aria-current="page"`; `isActiveSection` (exact-or-prefix) drives only the visual underline — two separate booleans, re-confirmed by existing test, not touched in this phase.

# PRODUCT LOCALIZATION

PASS (implementation). NAV-P1's architecture remains fully compatible with V2.1: Header owns no commercial taxonomy translation (re-confirmed by test scanning for a hardcoded group-name object literal — none found); `group_code` remains the stable identity everywhere (route/order); the translated `name` is presentation-only; unpublished groups remain excluded (unchanged `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` gate); no hardcoded `3`/`7` count anywhere; `MAX_HEADER_PRODUCT_SHORTCUTS = 8` (from NAV-P1, re-confirmed unchanged); "View all products" still present and wired.

# REAL ODOO LOCALIZATION STATUS

**NOT VERIFIED** (no network access to Odoo exists in this environment — unchanged from NAV-P1's own finding). `catalog_group_labels` (the table NAV-P1 added) is empty in this local environment; the Products dropdown therefore currently displays the historical `product_variants.group_name` fallback value on every locale, which is presently an English/neutral string ("Rebar", "Sheet & Plate", "SHS") **even when viewing the Persian site** — live-confirmed via screenshot (`navp11shots/fa-dropdown-open.png`). This is the exact, already-documented NAV-P1 fallback behavior (not a new NAV-P1.1 regression): the real per-locale sync (`lib/catalog/group-label-sync-runner.ts#runGroupLabelSync`) has not yet run against a live Odoo instance in any environment this session has access to. Per this task's own §35 instruction, this does **not** block Header architecture freeze — it remains a deployment-time operational spot-check.

# NAVIGATION ORDER

PASS, unchanged since NAV-P1: ordering is `pv.group_code ASC` (Products) / `sequence ASC, code ASC` (Services) — both stable, locale-invariant keys, re-confirmed by test. As this task itself requires stating explicitly: **`group_code` ordering is a deterministic interim ordering, NOT final owner-curated merchandising priority.** No `navigation_sequence`/`show_in_navigation`-equivalent field was invented in this phase for Products (none exists in the real, currently-fed Catalog v1 schema, per NAV-P1's own investigation); Services already has a real `sequence` column (pre-existing, unrelated to this phase).

# MAX-8 GATE

PASS. Products: `MAX_HEADER_PRODUCT_SHORTCUTS = 8` (NAV-P1, unchanged). Services: **newly added** `MAX_HEADER_SERVICE_SHORTCUTS = 8` in `lib/processing/public-repository.ts` (V2.1 §72.1 applies to "the Header" generally — both dropdown panels — and Services previously had no cap at all). "View all" links remain separate from the shortcut count in both cases; neither cap is hardcoded to today's actual counts (Products: 3 real groups; Services: 0 real groups).

# VIEW-ALL LINKS

PASS, unchanged. `lib/content/nav.ts#dropdownViewAllLabel` and its consumption in `SiteHeader.tsx`/`mobile-nav-drawer.tsx` untouched — still a low-weight text link, not a second CTA, re-confirmed by test.

# ZERO-DATA FALLBACK

PASS — and live-verified in an unusually direct, real way in this phase. `public_processing_groups` has 0 rows in every locale (unchanged fact from NAV-P0), and Products has published `product_seo_contents` for `fa` only (unchanged fact from NAV-P1). Live browser inspection of the real rendered DOM confirmed:
- **FA**: exactly one chevron button exists (Products, which has real data); Services correctly renders as a plain functional link (zero children).
- **EN and AR**: **zero** chevron buttons exist in the entire Header `<nav>` — both Products (no en/ar-published groups yet) and Services (no groups in any locale) correctly fall back to plain functional links, with no broken empty dropdown, no spinner, no loading copy.

This is the frozen §52.10/§58.11/§10 behavior working exactly as designed under real (not simulated) data conditions — not a defect.

# NO-LIVE-FETCH GATE

PASS, unchanged. `HeaderNavDisclosure` never imports `editorial-repository`/`public-repository` directly (re-confirmed by existing test); dropdown open is instantaneous (no network waterfall observed — verified live by the dropdown-open screenshot capturing immediately after a DOM-dispatched click with no loading state).

# MOBILE MODAL SEMANTICS

PASS, unchanged, live-reconfirmed: `role="dialog"`, `aria-modal="true"`, `aria-label="منوی ناوبری سایت"` (the distinct drawer label). Live-measured: `headerInert=true`, `mainInert=true` while open; `bodyOverflow="hidden"` (scroll lock); initial focus lands on the close button (`focusedControl="بستن منو"`); Escape closes the drawer (`drawerInert=true` after) and returns focus to the trigger (`focusReturnedToTrigger(aria-controls)="mobile-nav-drawer"` — confirmed the trigger button, not some other element, received focus back).

# MOBILE STRUCTURE

PASS, unchanged. Live-confirmed content order in the FA drawer screenshot: Logo/Close → Products (link+chevron) → Services (link, no chevron — zero data) → Industries → About → Contact → Phone → Language (direct فارسی/English/العربية choices, current bold) → CTA. Single accordion state (`useState<"products"|"services"|null>`, re-confirmed by test) — only one toggle button existed in the FA drawer (Services has no accordion since it has zero items), so the single-open behavior was structurally unexercisable with real data in this environment; the underlying state-machine guarantee was re-confirmed by the existing static test instead.

# MOBILE DIRECTION / WIDTH

PASS, unchanged. `w-[min(88vw,360px)]` (re-confirmed by test). Live-confirmed: FA/AR drawer opens from the right (RTL), matching `sideClass = direction === "rtl" ? "right-0" : "left-0"`; not independently re-verified for EN in this phase (unchanged code path, already verified in Header P7).

# TOUCH TARGETS

Not independently re-measured with a dedicated instrument in this phase (unchanged from Header P7's own verification) — the underlying Tailwind sizing classes (`size-11`, `min-h-11`) were not touched by any NAV-P1.1 fix, so no regression risk exists here.

# HEADER GEOMETRY

PASS, unchanged. Live-measured: default height 81px, compact-scrolled height 69px (both ≈80px/68px + the 1px bottom border `getBoundingClientRect` includes — consistent with the frozen 80px/68px targets, not a discrepancy). Max content width, CTA height, logo sizing: unchanged code, not touched.

# STICKY / COMPACT THRESHOLD

PASS, unchanged and re-confirmed: `window.scrollY > 24` (exact 24px target, §71.1) — live-measured transition from 81px→69px height after scrolling.

# POINTER-EXIT TOLERANCE

**Real mismatch found and fixed.** Was `150ms` (`setTimeout(() => setOpen(false), 150)`); frozen V2.1 §71.3 target is `~180ms`. Changed to `180`. Confirmed the timer still never delays Escape/click/route-change close (all three call `setOpen(false)` directly, never through `scheduleClose`) — pinned by a new test.

# ACTIVE / HOVER STATES

PASS, unchanged. Active nav: text + restrained copper underline (no pill/filled tab) — code untouched. Hover: distinct text-color shift — code untouched.

# CTA VISUAL ISOLATION

PASS, unchanged. Live-measured: CTA background `rgb(176, 74, 47)` (copper, the one dominant filled Header action); phone/language remain utility-weight text; "View all" remains a text link — none independently re-styled in this phase.

# PHONE

PASS, unchanged. Live-confirmed real `tel:+989120656528` href on the desktop utility phone link. Not independently re-verified for the mobile top-bar icon or drawer link in this phase (unchanged code, already verified in Header P7); all three consume the same `CONTACT_PHONE_E164` constant (re-confirmed by source read — no duplicate hardcoded phone number exists anywhere in the Header tree).

# LANGUAGE SELECTOR

PASS, unchanged. Live-confirmed present on desktop (`langSelectorPresent=true`); FA/English/العربية all shown directly in the mobile drawer with the current locale (`فارسی`) visually bolded. No flags anywhere (re-confirmed by existing test, untouched).

# LOCALE CONTEXT PRESERVATION

PASS, unchanged (`stripLocalePrefix`/`localizedPath`, not touched in this phase) — re-verified only via source inspection, not a fresh live cross-locale-switch click-through in this specific phase (no code path here was modified, so no new regression risk).

# HREFLANG X-DEFAULT

PASS, unchanged. `lib/metadata/resolve.ts` still produces `x-default` (re-confirmed by existing, unmodified test). Header does not invent or duplicate this — confirmed no Header file references `x-default` at all.

# SKIP LINK

PASS, unchanged. `SkipLink.tsx` → `#main-content`, mounted before `SiteHeader` in `app/[locale]/layout.tsx` (re-confirmed by existing test, file itself untouched except its own doc-comment's spec-file citation).

# NAV LANDMARK NAMING

PASS, unchanged. `menuLabel.nav` (shared desktop/drawer `<nav>` name) vs. `menuLabel.drawer` (the modal's own distinct name) — re-confirmed by existing test, code untouched.

# STICKY ANCHOR OFFSET

**Real gap found and fixed.** No `scroll-margin-block-start` rule existed anywhere in the codebase before this phase (§70, "ADDED — REQUIRED site-level behavior" per V2.1's own §80 adjudication table). Added to `styles/base.css`: `[id] { scroll-margin-block-start: calc(80px + 16px); }` — a site-level rule (not a one-off per-section margin), using 80px (the maximum relevant sticky Header height across all states) plus a 16px safety gap, exactly matching the spec's own suggested CSS shape.

# CONTRAST

PASS, measured (WCAG relative-luminance formula against this project's real hex tokens — no color token was changed in this phase, so these reconfirm rather than newly establish the values):

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| Active nav text (navy `#0B2545`) on white | 15.39:1 | ≥4.5:1 | PASS |
| Inactive/muted nav & utility text (`#475467`) on white | 7.69:1 | ≥4.5:1 | PASS |
| CTA text (white) on copper (`#B04A2F`) | 5.43:1 | ≥4.5:1 | PASS |
| Copper focus ring / active underline on white | 5.43:1 | ≥3:1 | PASS |

Live focus-ring measurement (real keyboard focus, not just the token value): chevron's computed `outline-color = rgb(176, 74, 47)` (`#B04A2F`, copper), `outline-style: solid`, `outline-width: 2px` — matches `--aa-color-focus-ring` exactly.

# REDUCED MOTION

Not independently re-tested with a fresh emulation pass in this phase — the only motion-related values changed were pure numeric durations (150ms→180ms, 200ms→180ms), both already gated by the pre-existing, untouched `motion-reduce:transition-none` utility on every transitioning element (re-confirmed present via source read on all three `duration-[180ms]` occurrences in `SiteHeader.tsx`).

# GLOBAL SEARCH

PASS, unchanged. No Search control anywhere in the Header tree — not added, not searched-for-and-found.

# DRAWER HISTORY BEHAVIOR

PASS, re-confirmed by a new explicit test: no `history.pushState`/`history.replaceState`/`popstate` reference anywhere in `SiteHeader.tsx` or `mobile-nav-drawer.tsx`.

# STRUCTURED DATA BOUNDARY

PASS, re-confirmed by a new explicit test: no Header file references `organizationSchema`/`jsonLdGraph`/a literal `"@type": "Organization"` fragment. `lib/seo/schema.ts` (untouched) remains the sole Organization/ContactPoint owner, consuming the same centralized `CONTACT_PHONE_E164` the Header itself uses (pre-existing, re-confirmed unchanged).

# V2.0 SOURCE-REFERENCE CLEANUP

Completed for all 12 files the durability report identified: `app/[locale]/layout.tsx`, `app/[locale]/industries/page.tsx`, `app/[locale]/request/page.tsx`, `components/layout/header-nav-disclosure.tsx`, `components/layout/header-language-selector.tsx`, `lib/processing/public-repository.ts`, `components/layout/SiteHeader.tsx`, `components/layout/mobile-nav-drawer.tsx`, `lib/content/nav.ts`, `lib/content/pages.ts`, `lib/content/header-frozen-spec-invariants.test.ts`, `lib/catalog/editorial-repository.ts`. Every citation of `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` was updated to `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md`, **with the exact same §-number preserved** in every case — verified section-by-section that V2.1 keeps identical numbering for all carried-forward content, so no citation needed a number change, only the filename. One additional stale mention found and fixed by hand (not caught by the blanket filename substitution): `SiteHeader.tsx`'s own doc comment said "(Version 2.0, fully frozen)" immediately after the filename — updated to "(Version 2.1, fully frozen)". Comment-only; zero runtime behavior changed by this cleanup. The two NAV-P0/NAV-P1 historical audit reports (which correctly documented, at the time, that only V2.0 existed) were deliberately left untouched — they are accurate historical records, not ongoing stale pointers.

# REAL-BROWSER MATRIX

Real headless Chromium (Playwright 1.48.0, ephemeral scratchpad install, not a project dependency — same established convention as Header P7/PRICE-P4) against a local `npm run dev` server, no fixture data inserted (this phase used only real, pre-existing local-dev data).

- **Horizontal overflow**: tested at all 9 required viewports (320/360/375/390/430/768/1024/1280/1440) × all 3 locales (FA/EN/AR) = 27 combinations. **Zero overflow in every single one.**
- **Default vs. scrolled compact Header**: tested at 1280px × 3 locales — height 81px→69px, `dir` correct (`rtl` for fa/ar, `ltr` for en) in all three.
- **Products dropdown**: opened via DOM-dispatched click (avoiding a Playwright `.click()` artifact where simulated mouse movement triggers the deliberate hover-open before the click toggles it closed again — a test-methodology fix, not an implementation issue) — FA: `aria-expanded` false→true, panel visible, real chevron accessible name confirmed. EN/AR: confirmed via direct DOM inspection that zero chevrons exist (real zero-data fallback, see ZERO-DATA FALLBACK above).
- **Keyboard path**: Tab (3 hops) → real chevron button reached → Enter opens (`aria-expanded` → true) → Escape closes (`aria-expanded` → false) and restores focus to the same chevron.
- **Mobile drawer** (390px): open/modal-semantics/inertness/scroll-lock/initial-focus/Escape-close/focus-restoration all live-measured and PASS (see MOBILE MODAL SEMANTICS above).
- **Long labels**: not independently stress-tested with a synthetic long string in this phase (no code path touched here creates new label-length risk; the existing dropdown panel width/wrapping behavior is unchanged).
- **Focus visibility**: chevron's real computed outline measured after actual keyboard focus (not just CSS inspection) — copper, 2px, solid.
- Screenshots captured for defaults, scrolled state, dropdown-open, and mobile-drawer-open across the tested locales — retained only in this session's ephemeral scratchpad, not committed to the repository.

# LOCAL FIXTURE CLEANUP

No local D1 fixture data was created or modified in this phase (no `catalog_group_labels` rows were inserted this time — the real, pre-existing empty state was used as-is to observe the genuine fallback/zero-data behavior). No `.dev.vars` file was created (Header rendering requires no feature flag). The local dev server process was stopped at the end of verification. Confirmed no stray process remains.

# FILES CREATED

None (other than this report).

# FILES MODIFIED

- `lib/content/nav.ts` (new `dropdownDisclosureAccessibleName` export)
- `components/layout/header-nav-disclosure.tsx` (pointer-exit 150→180ms; new `disclosureLabel` prop, used for the chevron's `aria-label`)
- `components/layout/SiteHeader.tsx` (3× `duration-200`→`duration-[180ms]`; passes `disclosureLabel`/`disclosureAccessibleName`; doc-comment cleanup)
- `components/layout/mobile-nav-drawer.tsx` (new `disclosureAccessibleName` prop, used for the accordion toggle's `aria-label`; doc-comment cleanup)
- `lib/processing/public-repository.ts` (new `MAX_HEADER_SERVICE_SHORTCUTS = 8` cap; doc-comment cleanup)
- `styles/base.css` (new site-level `[id] { scroll-margin-block-start }` rule)
- `lib/content/header-frozen-spec-invariants.test.ts` (10 new NAV-P1.1 tests; one existing test updated to match the new chevron accessible-name behavior; doc-comment cleanup)
- `app/[locale]/layout.tsx`, `app/[locale]/industries/page.tsx`, `app/[locale]/request/page.tsx`, `components/layout/header-language-selector.tsx`, `lib/catalog/editorial-repository.ts`, `lib/content/pages.ts` — doc-comment-only V2.0→V2.1 citation updates, no behavior change.

# RUNTIME COMMIT

`839a5b4501b938f7c6a8e6134947f27602540662` — "fix: reconcile Header implementation with frozen V2.1"

# HEADER TESTS

`npx tsx --test lib/content/header-frozen-spec-invariants.test.ts` (part of `lib/content/*.test.ts`) → **56 pass, 0 fail** (46 pre-existing + 10 new NAV-P1.1 tests).

# CATALOG TESTS

`npx tsx --test lib/catalog/*.test.ts` → **226 pass, 0 fail** (unchanged from NAV-P1 — no catalog logic touched in this phase beyond the already-committed NAV-P1 work).

# FULL TESTS

`npm test` (full repository suite) → **850 pass, 0 fail** (up from 840; +10 new NAV-P1.1 tests).

# TSC

`npx tsc --noEmit` → clean, 0 errors.

# BUILD

`npm run build` (`vinext build`) → succeeded, all 11 routes registered. `tsconfig.tsbuildinfo` restored via `git restore` after the build.

# GIT

- Runtime commit: `839a5b4501b938f7c6a8e6134947f27602540662`.
- Report commit (this file; evidence only): recorded after this file is committed — see the final response for its SHA.
- No amendment of any prior commit. No push. No force operations.

# PRODUCTION SAFETY

No migration created or applied (local or remote). No D1 row was written, read via `--remote`, or otherwise touched in this phase. No Odoo, Cloudflare, or DNS system was accessed or modified. No production/staging environment variable changed. The only runtime behavior changes are: two numeric timing constants (150ms→180ms, 200ms→180ms), one new accessible-name string set (fa/en/ar), one new dropdown-cap constant for Services, and one new site-wide CSS scroll-margin rule — all four are additive/corrective, none touch data flow, security, or commercial logic.

# REMAINING RISKS

- **Real Odoo-sourced fa/en/ar group names remain unverified** (no network access to Odoo in this environment) — the Products dropdown currently shows the same English/neutral fallback string regardless of locale, exactly as NAV-P1 already documented. This is an operational deployment spot-check, not a Header architecture defect, and does not block this freeze gate per this task's own §35 instruction.
- Touch-target sizing and reduced-motion behavior were not independently re-measured with a fresh instrument in this phase (no code path affecting either was touched — re-verification would be redundant given zero regression risk, but a future phase doing broader Header work should still re-confirm them directly rather than relying solely on this note).
- The mobile drawer's single-open accordion behavior could not be exercised live with two real open dropdowns simultaneously in this environment (Services currently has zero groups in every locale, so only the Products accordion toggle exists at all today) — the underlying state-machine guarantee (`useState<"products"|"services"|null>`) remains verified by static test, not by a live two-accordion interaction in this specific phase.

# HEADER V2.1 FREEZE STATUS

**HEADER ARCHITECTURE: FROZEN.**

All V2.1 acceptance criteria applicable to the current implementation and current real data state pass. The one open item (real Odoo-sourced localized values) is explicitly deferred as an operational spot-check per this task's own governing instruction, not a reason to withhold the freeze.

# NEXT PHASE

Header/Navigation is ready for Hero work to proceed (`docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md`, already durable in the repository per the prior Frozen UI Spec Durability Checkpoint). A future, separate operational task should run the real Product-group-label sync (`lib/catalog/group-label-sync-runner.ts#runGroupLabelSync`) against live Odoo once network access is available, and spot-check the resulting fa/en/ar Products dropdown labels — this does not require reopening Header architecture, only confirming the already-built pipeline produces sensible real output.

---

**AUTHORITATIVE HEADER:** V2.1
**HEADER ARCHITECTURE:** FROZEN
**NAV-P1 LOCALIZATION:** COMPATIBLE
**REAL ODOO LOCALIZED VALUES:** NOT VERIFIED
**HEADER READY FOR HERO:** YES
