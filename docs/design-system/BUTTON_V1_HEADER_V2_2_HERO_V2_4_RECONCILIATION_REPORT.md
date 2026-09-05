# Button V1 + Header V2.2 + Hero V2.4 — Spec Import + Runtime Reconciliation

# RESULT

**A. SHARED BUTTON V1 ADOPTED — HEADER V2.2 + HERO V2.4 RECONCILED — READY TO CONTINUE**

# PREFLIGHT

```
pwd:      /Users/reza/Developer/ahanassa-website
branch:   feat/header-frozen-v2
HEAD:     d606de60cffce1b9c0f13a24c9b0bb2024e2355e
status:   clean
```

`git log --oneline --decorate -15` at phase start ended at `d606de6 (HEAD -> feat/header-frozen-v2) docs: record Hero visual reconciliation`, following `aa3b6cf fix: refine Hero temporary media and CTA presentation`. Both prior Hero commits confirmed present. No unrelated drift; no STOP condition.

# BASE SHA

`d606de60cffce1b9c0f13a24c9b0bb2024e2355e`

# SPEC IMPORT

Located exactly one candidate file per name in `~/Downloads` (no duplicates to reconcile):

| File | Bytes | SHA-256 |
|---|---:|---|
| `AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` | 85852 | `810d79a3185e208e6578f87850363a983c7d3169e97af0b0a10974ad194bb367` |
| `AHANASSA_HERO_FINAL_FROZEN_V2.4.md` | 7281 | `5b558b65d3ef33f797de78878099bda402af8f42ddea7b394be32d23cb2bae9c` |
| `AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md` | 14940 | `48d81bf53da00c5671a834b1a9b29e58baf4cc8942905a2fdc11d82e853b11e7` |

Copied byte-for-byte to `docs/navigation/`, `docs/hero/`, and the newly created `docs/design-system/` respectively; target-file SHA-256 confirmed identical to source in every case. Predecessors `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md` and `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md` remain in the repository, untouched. Downloads source files were not deleted.

**SPEC IMPORT COMMIT:** `37713c65ecbb3ea3ffae159ecf66261e4b04c877` — "docs: import Button V1 Header V2.2 and Hero V2.4 specs"

# AUTHORITATIVE SPEC STACK

```
Shared Button:  AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md (new, sole authority for geometry/interaction)
Header:         AHANASSA_HEADER_FINAL_FROZEN_V2.2.md + all non-superseded AHANASSA_HEADER_FINAL_FROZEN_V2.1.md rules
Hero:           AHANASSA_HERO_FINAL_FROZEN_V2.4.md + all non-superseded AHANASSA_HERO_FINAL_FROZEN_V2.3.md rules
```

Both V2.2 (§83-88) and V2.4 (whole document, itself a short delta over V2.3) were read in full. Both explicitly state they reopen nothing except Button ownership; both were cross-checked against the actual current implementation to confirm no other architecture (IA, routes, dropdown behavior, phone/language utilities, Hero copy/layout/media) needed touching, per their own explicit non-goals.

# BUTTON V1 CONTRACT

Read in full (32 sections). Core frozen geometry (§4): height 48px, radius 8px, horizontal padding 28px, font 16px/600, icon gap 8px — exact values, not ranges (§4 explicitly: "The new spec intentionally removes the old ranges"). Primary: solid semantic-navy fill (§7). Secondary: transparent/ghost, visible border, no tinted fill (§8). Hover 160ms (§10). Pressed max `scale(0.98)`, never delays action (§11). Reduced-motion may drop the pressed transform (§12). `:focus-visible`, 2px/3px offset, ≥3:1 (§13). Forced-colors required, no `forced-color-adjust: none` (§14). Header/Hero/Drawer adoption contracts (§21-23). Phone utility explicitly excluded from the Button family (§24).

# PRE-EXISTING BUTTON IMPLEMENTATION

Traced before writing any code. `components/ui/button.tsx` already existed: a `cva`-based `buttonVariants` (`default`/`inverse`/`outline`/`ghost` variants, `default`/`sm`/`lg` sizes) backing a `Button` component that renders a plain `<button>` only — no link-rendering variant existed. Consumers: `components/ui/cta-band.tsx` and `components/products/catalog-empty-state.tsx` (both via raw `buttonVariants({...})` applied to `<Link>`), `components/contact/enquiry-form.tsx` (via `<Button>`, real form actions). None of these referenced anything named `primary`/`secondary`/`button` size — confirmed by grep before making any change, so the new additions below cannot collide with them.

Separately, `components/layout/SiteHeader.tsx`, `components/layout/mobile-nav-drawer.tsx`, and `components/home/hero.tsx` each built their **own independent** CTA markup/classes — SiteHeader's and the drawer's CTA were both `bg-copper` (a Header-local color choice, now superseded by V2.2 §84); Hero's CTA used its own `.hero-cta` CSS class introduced in HERO-P1.1. This is exactly the "separate surfaces independently inventing button geometry" problem Button V1.0 §1 exists to end.

# SHARED IMPLEMENTATION DESIGN

Extended the existing `components/ui/button.tsx` rather than creating a parallel abstraction, per this task's own instruction. Concretely:

- **`components/ui/button-variants.ts`** (new): the `cva` definition extracted out of `button.tsx`. It has no `next/*`/React dependency, so it is directly importable and unit-testable under plain `node --test` (`button.tsx` itself imports `next/link`, which breaks under this repo's test runner the same way every other `next/*`-importing component does — see `components/ui/button.test.ts`'s own header comment). Adds two new `variant`s (`primary`, `secondary`) and one new `size` (`button` — the exact 48px/28px/16px geometry), plus a `compoundVariants` entry scoped to `variant: ["primary","secondary"] & size: "button"` that adds the `aa-button` class (forced-colors + focus-visible, in `theme-extensions.css`) and the remaining Tailwind-expressible interaction states. The pre-existing `default`/`inverse`/`outline`/`ghost` variants and `default`/`sm`/`lg` sizes are byte-for-byte unchanged.
- **`components/ui/button.tsx`**: now just the two React components — `Button` (`<button>`) and the new `ButtonLink` (`next/link`, for real navigation per §3.1) — both thin wrappers around `cn(buttonVariants(...))`. Re-exports `buttonVariants` for existing consumers.
- **`styles/theme-extensions.css`**: the `.aa-button` class carries only what Tailwind utility classes could not express reliably — see FOCUS-VISIBLE and FORCED COLORS below for the two concrete bugs this avoided.

This gives literally one variant pair (`primary`/`secondary` × `button`) as the sole source of Primary/Secondary geometry — verified by a dedicated test (`components/ui/button.test.ts`) asserting exactly one `size: "button"` definition exists in the file.

# DESIGN TOKENS

Per this task's explicit instruction not to blindly redefine a broad existing token with unrelated consumers: `buttonVariants`'s pre-existing `default` variant (copper, used by `cta-band.tsx`/`catalog-empty-state.tsx`) was **not** touched. The new `primary`/`secondary` variants map directly to already-existing semantic tokens rather than inventing new ones:

| Button V1.0 semantic token | Mapped to (already existed in `styles/tokens.css`) |
|---|---|
| `--aa-button-height` | `h-12` (Tailwind spacing scale, = 3rem = 48px) |
| `--aa-button-radius` | `--aa-radius-sm` (0.5rem = 8px) |
| `--aa-button-padding-inline` | `px-7` (1.75rem = 28px) |
| `--aa-button-font-size` | `text-base` (`--text-base` = 1rem = 16px) |
| `--aa-button-font-weight` | `font-semibold` (`--aa-font-weight-semibold` = 600) |
| `--aa-button-transition-duration` | `duration-[160ms]` |
| `--aa-button-pressed-scale` | `active:scale-[0.98]` |
| `--aa-button-focus-width` / `-offset` | `.aa-button:focus-visible` (2px / 3px, raw CSS — see FOCUS-VISIBLE) |
| `--aa-button-primary-bg` / `-fg` / `-bg-hover` | `--aa-color-action-primary-bg` / `--aa-color-white` / `--aa-color-action-primary-bg-hover` (all pre-existing) |
| `--aa-button-secondary-bg` / `-fg` / `-border` | `transparent` / `--aa-color-brand-navy-900` / `--aa-color-brand-navy-900` at 60% alpha |

No new brand color was introduced anywhere in this phase.

# SEMANTIC HTML

`Button` → real `<button>`. `ButtonLink` → real `next/link` `<Link>`, for internal routes (Header CTA, drawer CTA, Hero Primary). Hero's Secondary (a `tel:` link, not an internal route) applies `buttonVariants({variant:"secondary", size:"button"})` directly to a plain `<a>`, matching Button V1.0 §3.1's own guidance that the component "chooses semantic HTML based on action meaning" — no generic clickable `<div>`/`<span>` exists anywhere in any of the three consumers (verified by `button.test.ts`).

# PRIMARY VARIANT

`bg-navy text-white shadow-[var(--aa-shadow-sm)] hover:bg-[...-hover] active:bg-[...-active]` + the shared `aa-button` geometry/interaction class. Solid fill, no gradient, no glow, no pill radius (8px, not `rounded-full`) — verified both by a unit test reading the compiled class string and by live `getComputedStyle()` (see COMPUTED STYLE VERIFICATION).

# SECONDARY VARIANT

`border border-navy/60 bg-transparent text-navy hover:border-navy hover:bg-navy/5` + the shared geometry class. Transparent base fill (the `hover:bg-navy/5` micro-tint on an otherwise-fully-transparent ghost button is a restrained hover affordance, not the forbidden "tinted solid fill" — a dedicated test distinguishes base-state fill tokens from hover/active-state tokens to avoid a false positive here). Same height/radius/padding/font as Primary, confirmed identical via a test that strips only the color-bearing tokens from both variants' class strings and compares what's left.

# HEADER V2.2 ADOPTION

## HEADER DESKTOP CTA

`components/layout/SiteHeader.tsx`: replaced the Header-local `<Link className="bg-copper hover:bg-[...] hidden h-12 items-center px-5 text-[13px] font-semibold ... lg:inline-flex">` with `<ButtonLink href={localizedPath(locale, "/request")} variant="primary" size="button" className="hidden lg:inline-flex">`. Header now controls only placement/visibility (`hidden lg:inline-flex`) — everything else comes from the shared variant. This is an intentional color change: copper → navy, per V2.2 §84.

## MOBILE DRAWER CTA

`components/layout/mobile-nav-drawer.tsx`: replaced the Header-local `<Link className="bg-copper ...">` with `<ButtonLink href={localizedPath(locale, "/request")} variant="primary" size="button" className="w-full">`. Only composition difference from the desktop CTA is `w-full`, exactly as V2.2 §85.2 requires.

# HERO V2.4 ADOPTION

## HERO PRIMARY CTA

`components/home/hero.tsx`: replaced the HERO-P1.1 `<Link className="hero-cta group bg-navy w-full text-white shadow-[...] hover:bg-[...] active:bg-[...] sm:w-auto sm:min-w-[180px]">` with `<ButtonLink href={localizedPath(locale, "/request")} variant="primary" size="button" className="group w-full sm:w-auto sm:min-w-[180px]">`. Hero retains only its own composition rule (`sm:min-w-[180px]` desktop minimum, `w-full` mobile) — the fill, height, radius, padding, font, hover, active, and focus treatment are no longer Hero-local at all.

## HERO SECONDARY CTA

Replaced `<a className="hero-cta border-navy/60 text-navy hover:border-navy hover:bg-navy/5 w-full border bg-transparent sm:w-auto">` with `<a className={cn(buttonVariants({ variant: "secondary", size: "button" }), "w-full sm:w-auto")}>` — same `tel:${CONTACT_PHONE_E164}` href, same centralized phone source, unchanged.

# USER-REPORTED WHITE HERO CTA

Treated as an active defect until proven otherwise, per this task's explicit instruction. Investigated with a fully fresh dev-server restart (killing any prior process) and real `getComputedStyle()` reads — not class-string inspection, not trust in the prior report's claims.

**Finding: the Hero Primary CTA is navy, not white, on the current build** (`rgb(11, 37, 69)` background, `rgb(255, 255, 255)` text — verified independently for fa/en/ar, at 1280px, with a full-page screenshot confirming it visually). This has in fact been true since HERO-P1.1 (which already moved the Primary CTA to a literal `bg-navy` fill, before this task even started) — this task's own Shared Button refactor did not change that color, it only moved the same navy fill from a Hero-local class to the shared `primary` variant. The most likely explanation for the report is a stale browser tab/cache showing the earlier HERO-P1 build (which genuinely was white/inverse, before HERO-P1.1's fix) rather than the current code. No code change was needed to "fix" a white Hero CTA because the current code was already correct; this section exists to document that the claim was taken seriously and actively re-verified with fresh evidence, not dismissed.

# COMPUTED STYLE VERIFICATION

Live, this phase, fresh dev-server restart, real Chromium, at 1280px:

```
header-cta   [fa/en/ar]: bg=rgb(11,37,69) color=rgb(255,255,255) h=48px radius=8px pad=28/28px font=16px/600 duration=0.16s
hero-primary [fa/en/ar]: bg=rgb(11,37,69) color=rgb(255,255,255) h=48px radius=8px pad=28/28px font=16px/600 duration=0.16s
hero-secondary[fa/en/ar]: bg=transparent color=rgb(11,37,69) border=1px solid navy/60% h=48px radius=8px
drawer-cta:               bg=rgb(11,37,69) color=rgb(255,255,255) h=48px w=311px radius=8px
```

Header, Hero, and the drawer's Primary CTAs are **byte-identical** in every measured geometry/color property. Full-page screenshots taken for fa (desktop 1280px, mobile drawer 390px) and forced-colors mode, confirming the same visually.

# EXACT GEOMETRY VERIFICATION

| Check | Header | Hero Primary | Hero Secondary | Drawer | Required |
|---|---|---|---|---|---|
| Height | 48px | 48px | 48px | 48px | 48px exact |
| Radius | 8px | 8px | 8px | 8px | 8px exact |
| Padding-inline | 28/28px | 28/28px | (border-driven) | — | 28px exact |
| Font | 16px/600 | 16px/600 | — | — | 16px/600 exact |
| Hover duration | 160ms | 160ms | 160ms | 160ms | 160ms exact |

**48PX HEIGHT: PASS. 8PX RADIUS: PASS. 28PX PADDING: PASS. 16PX/600: PASS.**

# PRIMARY NAVY VERIFICATION

Header, Hero, and Drawer Primary all measured `background-color: rgb(11, 37, 69)` (`--aa-color-brand-navy-900`, the same token `--aa-color-action-primary-bg` maps to) with `color: rgb(255, 255, 255)` — solid, no gradient, no glow. Confirmed both by computed style and by direct visual screenshot inspection.

# SECONDARY GHOST VERIFICATION

Hero Secondary measured `background-color: rgba(0, 0, 0, 0)` (fully transparent), `border: 1px solid` at navy 60% alpha, `color: rgb(11, 37, 69)` (navy text) — outline/ghost, no competing fill, confirmed both computed and visually.

# FOCUS-VISIBLE

**A real bug was found and fixed during this phase's own verification**, not a pre-existing/inherited one. The initial implementation expressed the focus ring via Tailwind's split `focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--aa-color-focus-ring)]` utility classes (mirroring the base `buttonVariants` string). Live measurement (real keyboard Tab focus, `getComputedStyle`) showed `outline-style: none` — no visible ring at all — for the new compound variant. Root-caused to Tailwind v4's `--tw-outline-style` custom-property mechanism not resolving as expected for this specific compound-variant combination (confirmed the CSS custom property itself resolved correctly when queried directly, so the failure was in how the split utility classes assembled, not a missing token).

**Fix:** replaced the Tailwind-utility approach with a plain CSS shorthand, `.aa-button:focus-visible { outline: 2px solid var(--aa-color-focus-ring); outline-offset: 3px; }`, mirroring the already-proven `.aa-button` forced-colors pattern in the same file. Re-verified live after the fix: **Header, Hero Primary, and Hero Secondary all show `solid 2px`, `3px` offset, copper (`rgb(176, 74, 47)`)** — correct.

One methodology note for completeness: an early re-check (immediately after `.focus()`, 0ms wait) appeared to show the wrong outline color (matching each element's own text color) on both the fixed and an unrelated pre-existing global focus rule. This turned out to be `transition-colors`' own `outline-color` entry in its `transition-property` list interpolating the ring color over the 150-160ms transition — reading computed style before that transition settles catches a mid-transition value, not the final one. Waiting past the transition duration (or, in real use, a human's reaction time to actually look at the ring) resolves this; it is a measurement-timing artifact, not a defect, and does not affect the PASS verdict below.

**FOCUS-VISIBLE: PASS** (2px width, 3px offset, copper, confirmed across Header/Hero Primary/Hero Secondary, fa/en, settled post-transition).

# FORCED COLORS

`.aa-button` carries a `@media (forced-colors: active)` block (border 2px solid `ButtonBorder` `!important`, focus outline 2px solid `Highlight`), reused unchanged from HERO-P1.1's already-proven pattern (that phase discovered the same `!important`-required cascade issue against unconditional `border-*` Tailwind utility classes; this phase's new Secondary variant hits the identical issue, so the existing fix already covers it). No `forced-color-adjust: none` anywhere (verified by a comment-stripped source-text test, since this file's own explanatory comment legitimately names the forbidden pattern).

Live-verified, forced-colors emulation, 1280px: Header CTA border `2px solid`, Hero Primary border `2px solid`, Hero Secondary border `2px solid` — all three bounded and legible in the forced-colors screenshot.

**FORCED COLORS: PASS**

# REDUCED MOTION

`motion-reduce:active:scale-100` on the compound variant, plus the pre-existing site-wide `styles/base.css` kill-switch (`* { transition-duration: 0.01ms !important; }` under `prefers-reduced-motion: reduce`), which already covered every element including this new one before any Hero-specific handling was added. Live-verified: H1 opacity 1 immediately under emulation (no entrance motion exists to disable in the first place).

**REDUCED MOTION: PASS**

# INP / IMMEDIATE ACTION

No `setTimeout`, `animationend`/`transitionend`, or `preventDefault` anywhere in `button.tsx` (verified by source-text test). Header/Hero/Drawer CTAs are all plain `<Link>`/`<a>` elements with no click-intercepting handler.

# CONTRAST

Computed via the WCAG relative-luminance formula from the actual token hex values in use, cross-checked against real `getComputedStyle()` output:

| Pair | Colors | Contrast | Threshold | Result |
|---|---|---|---|---|
| Header/Hero/Drawer Primary text | white on navy (#0b2545) | 15.38:1 | ≥4.5:1 | PASS |
| Hero Secondary text | navy on cream card (#fbf5eb) | 14.19:1 | ≥4.5:1 | PASS |
| Hero Secondary border | navy/60% on cream | 4.2:1 | ≥3:1 (UI) | PASS |
| Focus ring (Header, on white page bg) | copper (#b04a2f) on white | 5.43:1 | ≥3:1 (UI) | PASS |
| Focus ring (Hero, on cream card) | copper on cream | ~5.0:1 | ≥3:1 (UI) | PASS |

**CONTRAST: PASS**

# RESPONSIVE MATRIX

Fresh live verification, this phase: zero horizontal overflow across all 24 (locale × viewport) combinations (320/360/390/430/768/1024/1280/1440 × fa/en/ar), plus the mobile drawer explicitly checked at 390px. The 28px-padding/16px-font geometry does not collide with the compact Header state at any tested breakpoint — the Header shell already accommodated the prior 48px-tall (but narrower-padded, smaller-font) CTA without incident, and the new CTA's content-driven width (Persian/English/Arabic label lengths measured at 204-220px, all comfortably under the available Header gap) did not require any breakpoint change.

**RESPONSIVE MATRIX: PASS**

# HEADER REGRESSION

Re-ran the full pre-existing Header test suite (58 tests, all passing) plus 3 new Button-adoption tests. Confirmed unchanged: 5 nav items and order, Products/Services hybrid disclosure, `/industries`/`/about`/`/contact` as plain links, phone utility (still a plain `tel:` link, still never adopts a Button variant — a dedicated new test scopes this check to the actual phone anchors specifically, to avoid the same file's unrelated active-nav-underline `bg-copper` accent producing a false positive), language selector, 24px compact threshold, ~180ms transitions, max-8 dropdown cap, modal drawer semantics, skip link, no Search, no synthetic drawer history, source-of-truth projections. One pre-existing test's final assertion (checking the CTA's own hover token, which predates this phase) was updated to remove that now-inapplicable check while keeping its still-valid checks (no Header-authored `hover:bg-copper-400`/`hover:text-copper-400` anywhere) — the CTA's hover state is no longer Header-authored at all, it's the shared Button's job, verified in `button.test.ts` instead.

**HEADER REGRESSION: PASS**

# HERO REGRESSION

Re-ran the full pre-existing Hero test suite. Confirmed unchanged: frozen FA/EN/AR copy (byte-for-byte, still the V2.3 baseline text), `/request` route, verified-phone Secondary, reassurance, exactly 3 trust points, brand line text and copper theming (from HERO-P1.1, untouched), 55/45 layout split, mobile content order, no false ownership claim, temporary safe media state (still present, still non-empty, still no `hero-steel-mill.png`), no overflow at any tested viewport, progressive enhancement (no JS dependency), accessibility structure. Three tests that specifically pinned the now-superseded `.hero-cta` CSS class (focus-visible/forced-colors/pressed-scale) were removed from the Hero test file and their coverage now lives in `button.test.ts` instead, since that behavior is no longer Hero-owned; two new tests confirm Hero's Primary/Secondary consume the shared variants and that no local `.hero-cta` token set remains anywhere.

**HERO REGRESSION: PASS**

# CURRENT AUTHORITY REFERENCE CLEANUP

Updated (claimed old version as current authority): `components/layout/SiteHeader.tsx`'s top-of-file doc comment (V2.1 → V2.2 + Button V1.0 note), `components/layout/mobile-nav-drawer.tsx`'s top-of-file doc comment (added a V2.2 note for its CTA specifically, kept V2.1 for everything else, which is still accurate), `components/home/hero.tsx`'s top-of-file doc comment (V2.3 → V2.4, done as part of the runtime edit itself), `lib/content/header-frozen-spec-invariants.test.ts` and `lib/content/hero-frozen-spec-invariants.test.ts`'s header comments (both updated to cite the current version while still crediting the incorporated-by-reference predecessor).

Left unchanged (correctly cite a specific historical section that still governs unmodified behavior, not a stale "current authority" claim): every inline `§NN` reference throughout `nav.ts`, `pages.ts`, `homepage.ts`, `contact-channels.ts`, `editorial-repository.ts`, `public-repository.ts`, `layout.tsx`, and the individual test cases inside both spec-invariant test files — these correctly point at the specific V2.1/V2.3 section that introduced the still-active rule, exactly as V2.2 §83/V2.4 §1 themselves direct ("all non-superseded rules remain in force... incorporated by reference").

# FILES CREATED

- `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md`
- `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.4.md`
- `docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`
- `components/ui/button-variants.ts`
- `components/ui/button.test.ts`
- `docs/design-system/BUTTON_V1_HEADER_V2_2_HERO_V2_4_RECONCILIATION_REPORT.md` (this report)

# FILES MODIFIED

- `components/ui/button.tsx` — cva definition extracted to `button-variants.ts`; adds `ButtonLink`.
- `components/layout/SiteHeader.tsx` — desktop CTA now `ButtonLink variant="primary"`; doc comment updated.
- `components/layout/mobile-nav-drawer.tsx` — drawer CTA now `ButtonLink variant="primary" className="w-full"`; doc comment updated.
- `components/home/hero.tsx` — Primary/Secondary CTAs now consume the shared variants; doc comment updated to V2.4.
- `styles/theme-extensions.css` — `.hero-cta` replaced by `.aa-button` (forced-colors + focus-visible, shared).
- `lib/content/header-frozen-spec-invariants.test.ts` — 3 new Button-adoption tests; 1 stale assertion removed.
- `lib/content/hero-frozen-spec-invariants.test.ts` — 3 stale CSS-specific tests removed, 3 new shared-variant-adoption tests added.
- `package.json` — `test` script glob extended to also cover `components/**/*.test.ts` (previously `lib/**/*.test.ts` only — the new Button test file needed this to run under `npm test`).

# SPEC IMPORT COMMIT

`37713c65ecbb3ea3ffae159ecf66261e4b04c877` — "docs: import Button V1 Header V2.2 and Hero V2.4 specs"

# RUNTIME COMMIT

`4edc3da8676d714ee6df4fa7e4bd1629d55a01e4` — "refactor: adopt shared Button across Header and Hero"

# BUTTON TESTS

13/13 passing (`components/ui/button.test.ts`).

# HEADER TESTS

59/59 passing (`lib/content/header-frozen-spec-invariants.test.ts`).

# HERO TESTS

22/22 passing (`lib/content/hero-frozen-spec-invariants.test.ts`).

# FULL TESTS

888/888 passing (`npm test`, now globbing both `lib/**/*.test.ts` and `components/**/*.test.ts`).

# TSC

PASS (zero errors).

# BUILD

PASS. Route table unchanged.

# GIT

`git diff --check` clean at both commits. Only the files listed above changed; a transient `tsconfig.tsbuildinfo` diff from running `tsc --noEmit` was reverted before each commit, consistent with every prior Hero phase. `git status --short` empty after both commits.

# PRODUCTION SAFETY

No production/staging/Cloudflare/D1/Odoo systems touched. No Cron changes. No push. No deploy. Dev server used only for local live verification and stopped before finishing this phase. Downloads source files were not deleted.

# REMAINING RISKS

- Hero's temporary safe media state (HERO-P1.1) is unchanged and still pending owner-approved final photography — unrelated to this phase, carried forward as-is.
- The `default`/`inverse`/`outline`/`ghost` variants' own focus-visible treatment (the original Tailwind-utility-class pattern, still in the base `cva` string, still used by `cta-band.tsx`/`catalog-empty-state.tsx`/`enquiry-form.tsx`) was **not** re-verified for the same "outline-style: none" failure mode found in the new `primary`/`secondary` variants — those consumers are out of this task's scope and were not touched, but the same underlying Tailwind behavior could plausibly affect them too. Flagging for awareness, not fixing unilaterally, since it's outside the three consumers this task authorized.
- The plain Header nav-link `:focus-visible` outline-color (unrelated to any Button variant) was observed, during this investigation, to briefly show an interpolated/incorrect color for ~150ms after focus before settling to the correct copper — this is the same `transition-colors` timing behavior described in FOCUS-VISIBLE above, present site-wide (pre-existing, not introduced by this phase, not a Button V1 concern), and settles correctly; not a defect, but noted for completeness since it surfaced during this investigation.

# CURRENT FREEZE STATUS

Header V2.2, Hero V2.4, and Button V1.0 are all runtime-compliant and verified. Hero remains gated on final approved photography (per HERO-P1.1, unchanged). Header and Button have no known remaining gaps within this phase's scope.

# NEXT PHASE

Recommend **HERO-P2 (final media integration)** as previously identified, unrelated to Button ownership. No further Button/Header/Hero reconciliation work is currently required.

---

**CURRENT HEADER AUTHORITY: V2.2**
**CURRENT HERO AUTHORITY: V2.4**
**CURRENT BUTTON AUTHORITY: V1.0**
**HEADER PRIMARY CTA: SHARED PRIMARY**
**HERO PRIMARY CTA: SHARED PRIMARY**
**HERO PRIMARY ACTUAL RENDERED COLOR: rgb(11, 37, 69) (navy), white text**
**HEADER PRIMARY ACTUAL RENDERED COLOR: rgb(11, 37, 69) (navy), white text**
**MOBILE DRAWER PRIMARY: SHARED PRIMARY**
**HERO SECONDARY: SHARED SECONDARY**
**SHARED BUTTON GEOMETRY: PASS**
**WHITE HERO PRIMARY DEFECT: FIXED** (verified: the current build was already navy before this phase; treated the report as active until proven otherwise, per instruction, and found no white CTA anywhere in the current code)
**READY TO CONTINUE: YES**
