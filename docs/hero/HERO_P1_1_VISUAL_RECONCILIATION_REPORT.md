# HERO-P1.1 — Non-Empty Safe Media + CTA Color + Brand-Line Theme Reconciliation

# RESULT

**A. HERO VISUAL RECONCILIATION COMPLETE — STILL TEMPORARY SAFE MEDIA — READY FOR FINAL HERO IMAGE**

# PREFLIGHT

```
pwd:      /Users/reza/Developer/ahanassa-website
branch:   feat/header-frozen-v2
HEAD:     8d5289ad99aa5054c919b21add1da496541f377b   (matches task's implied handoff — the HEAD left by HERO-P1's report commit)
status:   clean
```

`git log --oneline --decorate -12` at phase start showed an unbroken lineage ending at `8d5289a (HEAD -> feat/header-frozen-v2) docs: record Hero V2.3 compliance implementation`. Verified present: `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md`, `docs/hero/HERO_P1_V2_3_COMPLIANCE_IMPLEMENTATION_REPORT.md`. No unrelated drift; no STOP condition.

# BASE SHA

`8d5289ad99aa5054c919b21add1da496541f377b`

# AUTHORITATIVE SPEC

`docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md` and `docs/hero/HERO_P1_V2_3_COMPLIANCE_IMPLEMENTATION_REPORT.md`, both re-consulted for this phase's three scoped fixes.

# SCOPE OF THIS PHASE

Exactly three items, per this task's explicit instruction:

1. Hero's temporary safe media state should not feel empty.
2. Primary CTA color must be reconciled with a literal reading of frozen V2.3 §53.3 ("solid fill — brand navy"), rather than HERO-P1's white/inverse workaround.
3. The brand line ("ما مراقب سرمایه شما هستیم.") should read as a themed brand-signature line.

No copy, CTA wording, CTA routes, trust points, reassurance, desktop/mobile order, layout split ratio, phone source, or localization architecture were touched. Header/Navigation/Product Showcase/Price Strip/Odoo/D1/Cloudflare were not touched.

# FIX 1 — TEMPORARY SAFE MEDIA

## MEDIA BEFORE

A single navy-tinted panel (`bg-white/[0.04]` on the navy section — i.e. only 4% lighter than its own background) containing three thin white lines and two copper vertical bars. Visually this read as almost the same flat navy tone as the rest of the Hero, which is exactly why it "felt empty."

## MEDIA AFTER

The panel is now a solid navy box (with a subtle radial gradient toward `--aa-color-action-primary-bg-hover` for depth) sitting inside the new light content card, so it has real tonal presence rather than blending into its surroundings. It layers three cues:

1. **Stacked sheet/plate cue** — two overlapping, slightly rotated, softly-tinted rounded rectangles (`rgb(255 255 255 / 0.06)`), suggesting layered steel sheet/plate.
2. **Procurement checklist / specification-review cue** — three small checkbox-style squares paired with horizontal lines of varying length, suggesting a reviewed list/specification without any readable/fake text.
3. **Steel cross-section cue** (kept from HERO-P1) — two vertical copper bars, suggesting rebar/IPE cross-sections.

Plus the existing `.hairline-grid` texture at low opacity for surface detail. All of this is pure inline SVG + CSS (no new dependency, no client JS, no image).

## NON-EMPTY MEDIA STATE

Verified two ways:

- **Visual**: live screenshots (1280px and 390px, fa/en) show a panel with clearly multiple distinct visual elements at different depths/tones, not a flat empty box.
- **Structural**: a new unit test (`hero-frozen-spec-invariants.test.ts`) asserts the inline SVG contains at least 2 `<rect>` elements and at least 2 `<line>` elements, i.e., more than a single decorative shape.

## FALSE OWNERSHIP CLAIM CHECK

Re-checked against Hero V2.3 §8/§32: the panel contains no photograph, no factory, no warehouse, no production line, no workers, no fleet, no machinery, no readable commercial numbers, no fake invoice/order data, no supplier logos. It is entirely abstract geometry (rectangles and lines).

**FALSE OWNERSHIP CLAIM: ABSENT**

# FIX 2 — PRIMARY CTA COLOR

## CTA CONTRACT BEFORE

HERO-P1 used the site's `inverse` treatment: white fill, navy text. This was a deliberate, disclosed deviation from a literal reading of §53.3 ("solid fill — brand navy"), because the Hero surface itself was solid navy at the time and a navy-on-navy button would have been invisible.

## CTA CONTRACT AFTER

Per this task's explicit permission ("If the current Hero surface/background prevents a navy CTA from reading properly, fix the Hero surface/background relationship — NOT by inverting the CTA"), the Hero content row now sits on a light warm card (`background: var(--aa-color-bg-warm)`, the cream token — matching the exact semantic-role example V2.3 §40.1 itself lists: `--color-surface-warm`) instead of directly on the navy section. The navy section background remains — it now reads as an ambient frame around the card, preserving the established Hero identity — but the copy/CTA content itself lives on the light surface.

With that surface change, the Primary CTA is now a **literal solid navy fill** (`bg-navy` → `rgb(11, 37, 69)`) with white text, `hover:` using the existing `--aa-color-action-primary-bg-hover` token and `active:` using `--aa-color-action-primary-bg-active` — no inversion, no workaround. Live-verified: `primaryBg: "rgb(11, 37, 69)"`, `primaryColor: "rgb(255, 255, 255)"`.

Route (`/request`) and copy ("ارسال لیست خرید") are unchanged, confirmed by the pre-existing `hero-frozen-spec-invariants.test.ts` assertions (still passing) plus a new assertion added this phase specifically pinning the navy fill.

## PRIMARY CTA CONTRAST

Computed (WCAG relative luminance) and cross-checked against real `getComputedStyle()` output:

- White text on navy fill: **15.38:1** (≥4.5:1 required) — PASS.
- Navy fill against the cream card background (button boundary/visibility): navy (L≈0.018) vs cream (L≈0.918) → **14.19:1** (≥3:1 required for a meaningful UI boundary) — PASS, with a very large margin — the button is unmistakably visible against the card.

**PRIMARY CTA CONTRAST: PASS**

## SECONDARY CTA STATE

Recolored to match the new light surface: `border-navy/60`, transparent fill, navy text, `hover:border-navy hover:bg-navy/5`. Still outline/ghost, still no tinted fill, still visually subordinate to the solid Primary CTA, still identical height (52px, shared `.hero-cta` base class, unchanged this phase).

- Navy text on cream: 14.19:1 — PASS.
- Border (navy at 60% alpha) against cream: computed **4.2:1** (≥3:1 required) — PASS. (60% alpha was chosen deliberately — 30% alpha was checked first and computed to only ~1.9:1, which would have failed; 60% was the value that cleared the threshold with reasonable margin.)

**SECONDARY CTA STATE: PASS, unaffected in route/copy/hierarchy**

# FIX 3 — BRAND LINE THEME

## BRAND LINE BEFORE

`text-white/60`, `text-sm font-semibold` — a dim, desaturated version of the Hero's white body-text color, i.e., not a distinct "brand" treatment at all, just a faded copy of the surrounding text color.

## BRAND LINE AFTER

`text-copper` (the plain `--aa-color-brand-copper-600` token, the same accent color used site-wide for `text-accent` roles elsewhere), `text-sm font-semibold` — unchanged size/weight, so it remains clearly smaller and lighter-weight than the H1 (`text-4xl`–`text-[4rem]`, `font-extrabold`) and no louder than the supporting copy (`text-lg`). Text is unchanged ("ما مراقب سرمایه شما هستیم." / "We protect your capital." / "نحن نحرص على رأس مالك.").

## BRAND LINE CONTRAST

Copper-600 (#B04A2F) on the cream card background: computed **5.0:1** (≥4.5:1 required for normal-size text) — PASS, and with a notably larger margin than the pale "copper-400-tint" HERO-P1 used against the dark navy surface (which computed to a tight 4.79:1 — flagged in the HERO-P1 report as a pre-existing risk). Moving to the light card lets the brand line use the *plain*, more saturated copper-600 token — the same one used for the eyebrow and for `--aa-color-text-accent` everywhere else on the site — which is both more theme-consistent and safer contrast-wise than trying to keep copper legible on a dark surface.

**BRAND LINE CONTRAST: PASS**

# FROZEN CONTENT CHECK

Re-verified all frozen text is byte-for-byte unchanged (enforced by the pre-existing "Hero FA content matches the frozen V2.3 baseline exactly" test, still passing): eyebrow, H1, supporting copy, Primary CTA text, Secondary CTA text, reassurance, all 3 trust points, brand line text. Routes unchanged (`/request` for Primary, `tel:` for Secondary). No business meaning changed in any locale.

**FROZEN CONTENT: PASS (unchanged)**

# LAYOUT / ORDER REGRESSION CHECK

- Desktop split ratio: unchanged — copy column still `lg:w-[55%]`, visual column still `lg:w-[45%]`, now both living inside the new card rather than directly on the section; the logical inline-start/inline-end flex-row behavior is untouched, so FA/AR still render copy-right/visual-left and EN still renders copy-left/visual-right (confirmed live at 1280px for fa and en).
- Mobile content order: unchanged — eyebrow → H1 → body → Primary CTA → Secondary CTA → reassurance → trust → brand line → visual, confirmed live at 390px (fa).
- DOM order: unchanged (same source-order assertions in `hero-frozen-spec-invariants.test.ts` still pass).
- `100vh`: still absent (still content-driven; the section only grew by the card's own padding, not a fixed/viewport height).
- Horizontal overflow: zero at all 24 (locale × viewport) combinations tested live (320/360/390/430/768/1024/1280/1440 × fa/en/ar) — identical clean result to both prior Hero phases.

**LAYOUT / ORDER: PASS (no regression)**

# ACCESSIBILITY

One `<h1>`, real semantic `<p>`/`<ul>`/`<li>`/`<a>` structure, unchanged from HERO-P1. No hover-only or animation-only information. RTL/LTR correct. No regression in keyboard reachability (Tab order unaffected — no elements added or removed, only recolored).

**ACCESSIBILITY: PASS**

# FORCED COLORS

Re-tested live under Chromium `forcedColors: "active"` emulation: both Primary and Secondary CTAs compute to `2px solid` borders (via the pre-existing `.hero-cta` forced-colors rule, unchanged this phase — it targets border/outline only, never author fill/text colors, so it was unaffected by the surface-color change). A full forced-colors screenshot confirms both CTAs remain bounded and both the checklist/plate/cross-section cues in the media panel and all copy text remain legible.

**FORCED COLORS: PASS**

# FOCUS-VISIBLE

`.hero-cta:focus-visible` reverted from HERO-P1's white-outline override back to the standard `var(--aa-color-focus-ring)` (copper) token, because the CTAs no longer sit on the dark navy surface that made white necessary. Live-verified via real keyboard `.focus()` in Chromium: both Primary and Secondary compute `outline: solid 2px rgb(176, 74, 47)` (copper) — matching the exact same convention used everywhere else on the site (Header, etc.), so Hero's focus treatment is no longer a special case.

Measured contrast of the copper ring against the card background: **5.0:1** (≥3:1 required) — PASS, and a large improvement over the ~2.8:1 the same copper token measured against Hero's previous navy surface.

**FOCUS-VISIBLE: PASS**

# REDUCED MOTION

Unaffected by this phase's changes (no motion was touched). Live-verified under `prefers-reduced-motion: reduce` emulation: H1 renders at `opacity: 1` immediately, consistent with both prior Hero phases. The `.hero-cta:active { transform: scale(0.98) }` press feedback remains covered by both the Hero-local reduced-motion override and the pre-existing site-wide `styles/base.css` kill-switch, neither of which was touched this phase.

**REDUCED MOTION: PASS**

# RESPONSIVE CHECK

Fresh live verification this phase: zero horizontal overflow across all 24 (locale × viewport) combinations (320/360/390/430/768/1024/1280/1440 × fa/en/ar), and zero overflow at 200%/400% zoom on FA mobile, EN mobile, and FA desktop.

**RESPONSIVE CHECK: PASS**

# FILES CREATED

None (this phase only modifies existing files; the report itself is the only new file).

# FILES MODIFIED

- `components/home/hero.tsx` — wraps the copy/visual row in a light warm content card; recolors H1/body/reassurance/trust/eyebrow/brand-line for the light surface; Primary CTA becomes literal solid navy; Secondary CTA becomes a navy outline; the temporary media panel gains stacked-plate and checklist cues.
- `styles/theme-extensions.css` — `.hero-cta:focus-visible` reverted from the white dark-surface override back to the standard copper `--aa-color-focus-ring` token, with an updated comment explaining why.
- `lib/content/hero-frozen-spec-invariants.test.ts` — added 3 new assertions (non-empty media structure, literal navy Primary fill, themed/subordinate brand line); all pre-existing assertions untouched and still passing.

# RUNTIME COMMIT

`aa3b6cf2e513bcb02d33fbcb04657ff10ba66451` — "fix: refine Hero temporary media and CTA presentation"

# HERO TESTS

23/23 passing (`npx tsx --test lib/content/hero-frozen-spec-invariants.test.ts` — 20 pre-existing + 3 new).

# FULL TESTS

873/873 passing (`npm test` — 870 pre-existing + 3 new Hero tests, 0 failing).

# TSC

PASS (zero errors).

# BUILD

PASS. Route table unchanged (`ƒ /:locale/request` still present).

# GIT

`git diff --check` clean. Only `components/home/hero.tsx`, `lib/content/hero-frozen-spec-invariants.test.ts`, and `styles/theme-extensions.css` were modified (a transient `tsconfig.tsbuildinfo` diff from running `tsc --noEmit` was reverted before committing, as in prior Hero phases). `git status --short` empty after both commits.

# PRODUCTION SAFETY

No production/staging/Cloudflare/D1/Odoo systems touched. No push. No deploy. Dev server used only for local live verification and stopped before finishing this phase.

# REMAINING RISKS

- Final Hero photography is still owed — this phase made the temporary state richer and non-empty, but it remains explicitly temporary, not the intended final visual.
- The eyebrow's contrast is now **improved** versus HERO-P1 (5.0:1 on cream, using the plain copper-600 token, vs. the previous tight 4.79:1 copper-400-tint on navy) — noted for completeness, not a new risk.
- `public/images/hero-steel-mill.png` remains on disk, unused (unchanged from HERO-P1 — still not deleted, per the same reasoning: a more clearly destructive/hard-to-reverse action than removing a code reference, left for the owner to decide once final artwork lands).

# NEXT STEP

Recommend proceeding directly to the previously-recommended **HERO-P2 (final media integration)** once the owner supplies approved photography — swap the temporary CSS/SVG panel inside the (now light) content card for a real `next/image`, re-verify media failure isolation and LCP-priority evidence against the real asset, and re-confirm the media panel's visual weight still reads as "non-empty" once it's a real photograph rather than the abstract placeholder.

---

**AUTHORITATIVE HERO: V2.3**
**TEMPORARY HERO MEDIA: NON-EMPTY SAFE STATE**
**PRIMARY CTA: NAVY SOLID COMPLIANT**
**BRAND LINE: THEME-ALIGNED**
**READY FOR FINAL HERO IMAGE: YES**
