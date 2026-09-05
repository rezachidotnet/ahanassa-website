# HERO-P1 — Frozen V2.3 Compliance Implementation Report

# RESULT

**A. HERO V2.3 REQUIRED RUNTIME COMPLIANCE COMPLETE — FINAL MEDIA APPROVAL PENDING**

Every P0/P1 finding and every objective, required P2 finding from `docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md` has been implemented and live-verified. The only remaining gap is the Hero visual itself: no compliant "Steel + Procurement Evidence" photograph exists anywhere in this repository, so a temporary, safe, non-deceptive CSS/SVG placeholder now stands in for it, exactly as HERO-P1 §0.3/§15 direct. That is a media-supply gap, not a runtime defect — per the task's own explicit instruction ("If the only remaining issue is lack of final approved Hero artwork and a safe, non-deceptive media placeholder has been implemented correctly: choose A, not D"), this is RESULT A.

# PREFLIGHT

```
pwd:      /Users/reza/Developer/ahanassa-website
branch:   feat/header-frozen-v2
HEAD:     55f4c6160293085c8b17d981b367624ef410583b   (matches task's stated commit exactly)
status:   clean
```

`git log --oneline --decorate -15` at phase start showed an unbroken lineage ending at `55f4c61 (HEAD -> feat/header-frozen-v2) docs: record Hero V2.3 implementation audit`. Verified present: `docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md`, `docs/hero/HERO_P0_CURRENT_IMPLEMENTATION_AUDIT.md`, `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md`. No unrelated drift; no STOP condition.

# BASE SHA

`55f4c6160293085c8b17d981b367624ef410583b`

# AUTHORITATIVE SPEC

`docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md` (already read in full during HERO-P0, re-consulted section-by-section during this implementation for every §-numbered requirement cited below).

# HERO-P0 FINDINGS ADDRESSED

All P0 (2/2), all P1 (7/7), and the objective-required P2 findings from the audit:

| # | Finding | Status |
|---|---|---|
| P0-1 | Primary CTA routed to `/contact`, not `/request` | **Fixed** |
| P0-2 | Hero image depicted an active production line with workers (false ownership) | **Fixed** (removed; temporary safe placeholder) |
| P1-3 | Reassurance line absent | **Fixed** (added to data model + rendered) |
| P1-4 | Trust micro-layer absent (unrelated 4-item rail instead) | **Fixed** (exact 3-point frozen trust layer) |
| P1-5 | Brand line present in data, never rendered | **Fixed** (now rendered) |
| P1-6 | No desktop copy/visual split | **Fixed** (real logical ~55/45 flex split) |
| P1-7 | Primary CTA fill was copper, not navy | **Addressed with a documented, measured deviation — see CTA VISUAL CONTRACT** |
| P1-8 | No forced-colors support | **Fixed** |
| P1-9 | Secondary CTA channel (en/ar) was WhatsApp, not phone | **Fixed** (owner decision in this task resolved it: phone for all locales) |
| P2-10 | CTA radius 0px, not 6–8px | **Fixed** (8px) |
| P2-11 | CTA font-size 14px, not 15–16px | **Fixed** (16px) |
| P2-12 | No `scale(0.98)` active state | **Fixed** |
| P2-13 | Secondary CTA lacked `:focus-visible` parity with Primary | **Fixed** (both share `.hero-cta:focus-visible`) |
| P2-14 | Physical (non-logical) gradient direction, RTL contrast risk | **Moot** — the full-bleed gradient/image treatment that caused this no longer exists |
| P2-15/16 | Image provenance/LCP-priority evidence | **Moot** — no photographic image remains in this phase |

P3 items (motion, `prefers-contrast: more`, `size-adjust`) were deliberately **not** implemented — see OPTIONAL V2.3 FEATURES.

# FA COPY

Implemented verbatim, byte-for-byte from the frozen spec and this task's §3 (also unit-tested):

- Eyebrow: مدیریت تأمین فولاد پروژه
- H1: تأمین فولاد پروژه، با بررسی فنی و تجاری پیش از خرید.
- Supporting copy: لیست خرید یا نیاز پروژه را ارسال کنید؛ آهن آسا مشخصات، گزینه‌های تأمین و شرایط تجاری را بررسی می‌کند تا مسیر خرید شفاف‌تر و قابل‌کنترل‌تر باشد.
- Primary CTA: ارسال لیست خرید (unchanged — already matched before this phase, in `lib/content/nav.ts`)
- Secondary CTA: درخواست قیمت تلفنی
- Reassurance: ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.
- Trust (exactly 3): بررسی فنی نیاز • مقایسه گزینه‌های تأمین • هماهنگی خرید
- Brand line: ما مراقب سرمایه شما هستیم. (unchanged text, now actually rendered)

Live-verified (`h1Text`, `trustItems`, `hasReassurance`, `hasBrandLine` all match) against the running page at 1280px.

**FA COPY: PASS**

# EN COPY

Faithful equivalents, preserving business meaning, no stronger claims:

- Eyebrow: "Project steel procurement management" (unchanged — already a faithful match of the new FA eyebrow's meaning)
- H1: "Project steel procurement, reviewed technically and commercially before purchase."
- Supporting copy: "Send your purchase list or project requirement — Ahan Asa reviews the specification, sourcing options, and commercial terms so your purchasing path is clearer and easier to control."
- Primary CTA: "Send purchase list" (unchanged, `lib/content/nav.ts`)
- Secondary CTA: "Request a phone quote" (was "Request a quote on WhatsApp")
- Reassurance: "Sending your purchase list creates no commitment — your requirement is reviewed first."
- Trust: "Technical requirement review", "Sourcing options compared", "Purchase coordination"
- Brand line: "We protect your capital." (unchanged, now rendered)

Checked against the localization gate (§29): no guarantee/best-price/fastest-delivery/ownership language — confirmed by both manual review and the automated `hero-frozen-spec-invariants.test.ts` claim-pattern test. EN text is distinct from FA (not a literal copy) and distinct from AR.

**EN COPY: PASS**

# AR COPY

Faithful equivalents, real Arabic (not Persian reuse), same business meaning:

- Eyebrow: "إدارة توريد الصلب للمشاريع" (tightened from the pre-existing "إدارة توريد وشراء الصلب للمشاريع" to mirror the new FA eyebrow's tighter phrasing)
- H1: "توريد صلب المشاريع، بعد مراجعة فنية وتجارية قبل الشراء."
- Supporting copy: "أرسل قائمة الشراء أو احتياج مشروعك؛ يراجع آهن آسا المواصفات وخيارات التوريد والشروط التجارية ليكون مسار الشراء أكثر وضوحًا وقابلية للتحكم."
- Primary CTA: "إرسال قائمة الشراء" (unchanged, `lib/content/nav.ts`)
- Secondary CTA: "طلب عرض سعر هاتفيًا" ("Request a price quote by phone" — was "طلب سعر عبر واتساب" / WhatsApp)
- Reassurance: "إرسال قائمة الشراء لا يُنشئ أي التزام عليك؛ تتم مراجعة احتياجك أولاً."
- Trust: "مراجعة الاحتياج الفني", "مقارنة خيارات التوريد", "تنسيق عملية الشراء"
- Brand line: "نحن نحرص على رأس مالك." (unchanged, now rendered)

**AR COPY: PASS**

# PRIMARY CTA

`hero.tsx` now builds the href via `localizedPath(locale, "/request")`. Live-verified: fa → `/request`, en → `/en/request`, ar → `/ar/request`. Real `<Link>`, no modal, no `onClick`, no `setTimeout`/`animationend` gating (also enforced by `hero-frozen-spec-invariants.test.ts`). Confirmed working with JavaScript disabled.

**PRIMARY CTA: PASS**
**/request**

# SECONDARY PHONE CTA

Always `tel:${CONTACT_PHONE_E164}` (`+989120656528`), for fa/en/ar alike — the same Central Verified Business Identity number the Header already uses, imported from `lib/content/contact-channels.ts`, never a Hero-local hardcode. The now-unused `CONTACT_WHATSAPP_URL` export and its stale "SiteHeader.tsx also uses this" comment (SiteHeader never did) were removed from `contact-channels.ts` as a direct, in-scope consequence — nothing else in the repo referenced it.

No visible phone-number *text* is rendered in the Secondary CTA (only the localized label, e.g. "درخواست قیمت تلفنی" / "Request a phone quote" / "طلب عرض سعر هاتفيًا") — the raw digits exist only inside the `href` attribute, so `tabular-nums`/bidi-isolation (§47/§53.6) does not apply to any rendered text in this component; this is noted for completeness, not treated as a gap.

**SECONDARY PHONE CTA: PASS**
**VERIFIED PHONE**

# CTA VISUAL CONTRACT

New `.hero-cta` utility in `styles/theme-extensions.css`, scoped to Hero only (deliberately not merged into the shared `buttonVariants`, which also backs the frozen Header and other unrelated pages). Measured live via `getComputedStyle()`:

| Check | Measured | Required | Result |
|---|---|---|---|
| Corner radius | 8px | 6–8px | PASS |
| Height (desktop, both) | 52px | 48–52px | PASS |
| Horizontal padding | 28px | 24–32px | PASS |
| Font size | 16px | 15–16px | PASS |
| Font weight | 600 | 600 | PASS |
| Primary min width (desktop) | ~200–215px (content-driven, min 180px enforced) | ~180px | PASS |
| Primary/Secondary height parity | both 52px | identical | PASS |
| Active/pressed | `scale(0.98)` | max `scale(0.98)` | PASS |
| Secondary border | no tinted fill; `border-white/45`, transparent bg | outline/ghost, no fill | PASS |
| Mobile CTA gap | `flex-col gap-3` = 12px vertical | ≥12px | PASS |

**Primary CTA fill — documented deviation from a literal reading of §53.3:** §53.3 specifies "solid fill — brand navy." The Hero section's own background is itself solid navy (`bg-navy`, unchanged from the pre-existing implementation and preserved per `CLAUDE.md` §5a's authority over visual composition). A literal navy-on-navy Primary CTA would be visually invisible except for its shadow and text — a genuine "verified usability problem" (Hero V2.3 §37's own bar for a justified implementation-level deviation). This repository's own design system already anticipates and solves exactly this situation: `components/ui/button.tsx`'s `inverse` variant is documented in its own source comment as "White-on-Navy — **the preferred primary control on a Navy surface**." The Hero Primary CTA now uses that established white-fill/navy-text treatment (without importing `buttonVariants` itself, to keep Hero's blast radius independent of the Header/other pages) — it remains solid, remains the dominant/brand-navy-family action, keeps the required subtle elevation, and stays strictly within the two-color navy/copper brand system. This is disclosed here rather than silently resolved, per `CLAUDE.md` §8. If the owner wants a literal navy fill instead, the Hero surface itself would need to move off solid navy — that is a larger visual-composition decision outside HERO-P1's "not a redesign" scope, and is called out under REMAINING RISKS.

**CTA VISUAL: PASS** (with the above disclosed, measured, and justified Primary-fill deviation)

# CTA INP

Both CTAs are plain `<Link>`/`<a>` elements with no `onClick`, no JS interception, no `setTimeout`, no animation-completion gating (verified both by source-text test and by manual review). `transform: scale(0.98)` on `:active` is purely decorative CSS and cannot delay navigation, which begins immediately on activation.

**CTA INP: PASS**

# REASSURANCE

Added to `HomepageCopy.hero.reassurance` for fa/en/ar; rendered as its own paragraph directly after the CTA row, before the trust list — matching frozen order. Live-verified present in the DOM for all three locales.

**REASSURANCE: PASS**

# TRUST MICRO-LAYER

Added `HomepageCopy.hero.trust: string[]`, exactly 3 items per locale (enforced by a dedicated unit test), rendered as a plain `<ul>` with "•" separators between items (matching the frozen FA presentation's own separator convention), text-first, no icons, no badge styling. The previous 4-item "protection controls" rail (`rail: {title, body}[]`) has been removed from the Hero entirely — it exceeded the frozen 3-point maximum and was a different UI element (a bordered stat-strip) than the frozen "short phrases, text-first" trust micro-layer.

**TRUST LAYER: PASS**

# BRAND LINE

Rendered as the final element of the copy column, styled at reduced emphasis (`text-white/60`, measured 6.37:1 contrast against navy — still comfortably ≥4.5:1 while visually the most de-emphasized text in the hierarchy, matching §6 "remains secondary to H1, supporting copy, CTA, reassurance, and trust micro-layer").

**BRAND LINE: PASS**

# DESKTOP LAYOUT

The section is now `flex flex-col lg:flex-row lg:items-center`, with the copy column at `lg:w-[55%]` and the visual panel at `lg:w-[45%]`. Flexbox's `row` main axis is inherently direction-aware (it follows the container's `direction`/writing-mode, not a fixed physical left-to-right), so with copy first and visual second in DOM order:

- FA/AR (`dir="rtl"`): copy renders on the right, visual on the left — verified live via the 1280px FA screenshot.
- EN (`dir="ltr"`): copy renders on the left, visual on the right — verified live via the 1280px EN screenshot.

No `tabindex`/accessibility-order hack was used — the flip is pure CSS, DOM order is identical and stable across locales. No `100vh` anywhere (confirmed by both source-text test and visual inspection — the section remains content-driven).

**DESKTOP LAYOUT: PASS**

# MOBILE ORDER

Live-verified DOM/visual order at 390px (FA): Eyebrow → H1 → Supporting copy → Primary CTA (full-width) → Secondary CTA (full-width, outlined) → Reassurance → Trust (3 points) → Brand line → Hero visual (the flex column naturally stacks the visual panel last, since it is the second/last flex child and `flex-col` stacks children top-to-bottom in DOM order). The Primary CTA is the fourth element on the page and appears far above the Hero visual — not pushed below it.

**MOBILE ORDER: PASS**

# RTL / LTR

Zero horizontal overflow across all 24 (locale × viewport) combinations tested live (320/360/390/430/768/1024/1280/1440 × fa/en/ar) — identical clean result to HERO-P0's baseline pass, now additionally covering the new split-layout structure. `dir` attribute, icon mirroring (`rtl:-scale-x-100`), and DOM order all correct.

**RTL/LTR: PASS**

# HERO MEDIA

## OLD STEEL-MILL MEDIA REMOVAL

`hero-steel-mill.png` usage is fully removed from `components/home/hero.tsx` — no `next/image` import, no `<img>` element, confirmed by source-text test and by a live DOM query (`hasImgElement: false` at 1280px for all three locales). The file itself (`public/images/hero-steel-mill.png`, 1.56 MB) was **left on disk, unused** — deleting a binary asset is a more clearly destructive/hard-to-reverse action than removing a code reference, and the task's instruction was to remove Hero's *usage* of it, not necessarily delete the file; the owner may want to keep it as a documented example of what not to use, or decide separately whether to delete it once final artwork is supplied.

## FINAL MEDIA STATUS

Before implementing the temporary placeholder, the existing repository was inventoried for any compliant candidate: `public/images/products/rebar.png`, `sheet-plate.png`, and `pipe.png` were each viewed at full resolution. All three are the same category of AI-generated industrial photography as the removed Hero image — `rebar.png` shows a large port/storage yard with a cargo ship, cranes, and visible workers; `sheet-plate.png` shows a factory floor with workers and machinery; `pipe.png` shows a large storage yard with cranes and a warehouse building. None "clearly satisfy" the Steel + Procurement Evidence + no-ownership-implication bar this task's §0.3 sets, so none were reused.

Per §0.3/§15, this implements a **TEMPORARY SAFE MEDIA STATE**: a pure CSS/SVG panel (`aspect-ratio: 4/3`, navy-tinted surface, the existing `.hairline-grid` overlay) containing a small inline SVG with three thin horizontal lines (evoking a procurement list/document) and two vertical copper-toned bars (evoking steel bar/IPE cross-sections). No photograph, no readable commercial text, no ownership implication of any kind, `aria-hidden="true"`. Because there is no `<img>`/`next/image` involved, this state cannot produce a broken-image artifact by construction. Documented explicitly as temporary in the component's own header comment, with a note that swapping in owner-approved photography later requires no other change to the component.

**FINAL HERO MEDIA: TEMPORARY SAFE STATE**

# FALSE OWNERSHIP CLAIM

**ABSENT.** The only visual content in the Hero's media panel is abstract line/bar geometry with no photographic content of any kind — no factory, no warehouse, no production line, no workers, no fleet, no machinery.

# MEDIA FAILURE ISOLATION

Not applicable in the failure sense any more — there is no `<img>` element to fail. Copy, both CTAs, reassurance, and trust points are all plain DOM siblings of the visual panel, independent of it structurally (this was already true before this phase, and remains true now, verified again live).

**MEDIA FAILURE: PASS**

# PROGRESSIVE ENHANCEMENT

Live-verified with JavaScript fully disabled: H1 visible (`opacity: 1`), Primary CTA present with the correct `/request` href, Secondary CTA present with the correct `tel:` href. Hero remains a plain server component (`no "use client"`, no `useEffect`/`useState`, confirmed by source-text test).

**PROGRESSIVE ENHANCEMENT: PASS**

# MOTION

**No entrance motion was added.** Hero previously had zero motion (no `Reveal` wrapper, unlike Reach/Capabilities/ProductShowcase/Process, which are all below-the-fold). Adding motion now would require importing the existing `components/ui/reveal.tsx` client component, converting Hero (or part of it) into a client-hydrated boundary for its very first paint — a real architectural change with LCP/hydration-timing implications, not a "simplest compliant implementation." Per this task's own §18 instruction ("If simplest compliant implementation is no entrance motion: prefer simplicity over introducing unnecessary client JS. Document this decision."), motion was deliberately left out. Hero V2.3 §15 describes the treatment motion *would* have if present; it is not phrased as a hard requirement, and the Final Acceptance Matrix (§35) only requires "Motion required for usability | FORBIDDEN" (satisfied trivially) rather than mandating motion's presence.

**MOTION: NOT IMPLEMENTED (deliberate, documented)**

# REDUCED MOTION

Trivially satisfied — no entrance motion exists to disable. The only transform in Hero is the CTA's `:active { scale(0.98) }`, which is already covered twice over: a Hero-local `@media (prefers-reduced-motion: reduce) { .hero-cta { transition: none; } .hero-cta:active { transform: none; } }` block, and the pre-existing site-wide kill-switch in `styles/base.css` (`* { transition-duration: 0.01ms !important; }` under reduced motion), which already applied to every element including the new `.hero-cta` before this Hero-local block was even added. Live-verified: H1 renders at `opacity: 1` immediately under `prefers-reduced-motion: reduce` emulation.

**REDUCED MOTION: PASS**

# DESIGN TOKENS

All new Hero styling consumes existing shared tokens from `styles/tokens.css`: `--aa-radius-sm` (8px radius), `--aa-text-body-md` (16px font), `--aa-font-weight-semibold` (600), `--aa-color-brand-copper-600` (visual-panel accent bars), `--aa-color-white`/`--aa-color-brand-navy-900` (via existing Tailwind aliases `bg-white`/`text-navy`), `--aa-shadow-sm` (Primary CTA elevation), `--aa-motion-fast`/`--aa-motion-instant`/`--aa-ease-standard` (transitions). No private Hero-only palette or advanced OKLCH machinery was introduced.

**DESIGN TOKENS: PASS**

# ACCESSIBILITY

- Exactly one `<h1>`, semantic `<p>`/`<ul>`/`<li>` structure, real `<a>`/`<Link>` CTA elements, keyboard-reachable.
- No hover-only or animation-only information (Hero has no motion at all currently).
- RTL/LTR correct, no duplicate/confusing screen-reader content.

**ACCESSIBILITY: PASS**

# CONTRAST

All figures below were computed from the actual token/opacity values in use via the WCAG relative-luminance formula, then cross-checked against real `getComputedStyle()` output (which confirmed the exact same underlying colors — e.g. the measured eyebrow color `rgb(198, 125, 105)` matches the hand-computed copper-400 tint to the pixel).

| Element | Colors | Contrast | Threshold | Result |
|---|---|---|---|---|
| H1 | white on navy (#0b2545) | 15.38:1 | ≥4.5:1 | PASS |
| Supporting copy / trust points | white/75% on navy | 9.17:1 | ≥4.5:1 | PASS |
| Reassurance | white/75% on navy | 9.17:1 | ≥4.5:1 | PASS |
| Brand line | white/60% on navy | 6.37:1 | ≥4.5:1 | PASS |
| Eyebrow | copper-400-tint (~rgb(198,125,105)) on navy | 4.79:1 | ≥4.5:1 | PASS (tight — pre-existing value, unchanged by this phase) |
| Primary CTA text | navy on white | 15.38:1 | ≥4.5:1 | PASS |
| Secondary CTA text | white on navy | 15.38:1 | ≥4.5:1 | PASS |
| Secondary CTA border | white/45% on navy | 4.2:1 | ≥3:1 (UI) | PASS |
| Focus ring (both CTAs) | white on navy | 15.38:1 | ≥3:1 (UI) | PASS — see FOCUS-VISIBLE for why this changed from copper |

**CONTRAST: PASS**

# FOCUS-VISIBLE

`.hero-cta:focus-visible { outline: 2px solid var(--aa-color-white); outline-offset: 3px; }` applies identically to Primary and Secondary. **This intentionally does not reuse the site-wide copper focus-ring token** (`--aa-color-focus-ring`, used everywhere else including the Header): measured, copper (#B04A2F) against Hero's navy (#0B2545) background computes to **~2.83:1**, below the required 3:1 non-text-contrast threshold — a genuine, Hero-specific failure mode of the otherwise-correct site-wide convention, only visible because Hero (unlike the rest of the site) has a dark navy surface. White against navy computes to ~15.38:1. Live-verified via real keyboard `.focus()` in Chromium for both fa and en, both Primary and Secondary: `outline: solid 2px rgb(255,255,255)`, `outline-offset: 3px` in every case. No blanket `:focus { outline: none }` exists anywhere in the new CSS.

**FOCUS-VISIBLE: PASS**

# FORCED COLORS

`@media (forced-colors: active) { .hero-cta { border: 2px solid ButtonBorder !important; } .hero-cta:focus-visible { outline: 2px solid Highlight; outline-offset: 3px; } }`. No `forced-color-adjust: none` anywhere (checked by a dedicated unit test).

The `!important` on the border declaration is deliberate and was arrived at empirically, not by default: the first implementation (without `!important`) measured a computed `border: 0px` under live Chromium forced-colors emulation, because the unconditional `border-white/45`/`border` Tailwind utility classes on the same elements are equal-specificity and were winning the cascade by appearing later in the compiled stylesheet. Re-tested with `!important` added: both Primary and Secondary now compute to `2px solid rgb(0, 0, 0)` (Chromium's light-mode `ButtonBorder` resolution) under forced-colors emulation. Focus outline remains visible under forced-colors too (`2px solid`, resolving to the emulated `Highlight` color). A full-page forced-colors screenshot was captured and visually confirms both CTAs, the reassurance line, the trust list, and the brand line all remain legible and bounded.

**FORCED COLORS: PASS**

# RESPONSIVE MATRIX

Fresh live verification, this phase, of all 24 (locale × viewport) combinations (320/360/390/430/768/1024/1280/1440 × fa/en/ar): zero horizontal overflow, zero clipped/zero-size `<h1>` in every case.

**RESPONSIVE MATRIX: PASS**

# ZOOM / REFLOW

Tested live at 200%/400% CSS zoom on FA mobile (390px), EN mobile (390px), and FA desktop (1280px). No horizontal overflow at any combination. The Hero's own Primary CTA (correctly scoped this time — an earlier draft of this check accidentally matched the Header's separate `/request` link, which is `display:none` below its own responsive breakpoint, and produced a false "unreachable" reading; re-scoped to the Hero `<section>` specifically) remains a normal-sized, non-zero element and reachable by scrolling at every zoom level tested.

**ZOOM 200: PASS**
**ZOOM 400: PASS**

# STRUCTURED DATA

Hero emits no `Product`/`Offer`/`AggregateRating`/`Review`/`Organization` JSON-LD (confirmed by source-text test: no `application/ld+json` in the component). H1/supporting copy/CTAs all exist in server-rendered HTML (confirmed by the no-JS check above).

**STRUCTURED DATA: PASS**

# OPTIONAL V2.3 FEATURES

**NONE.** View Transitions, Container Queries, CSS `linear()` easing, `size-adjust`, and `prefers-contrast: more` were all deliberately left unimplemented, per this task's explicit §28 instruction and HERO-P0's own P3 classification of these as approved-optional, not required, enhancements.

# FILES CREATED

- `lib/content/hero-frozen-spec-invariants.test.ts` (20 tests, all passing)
- `docs/hero/HERO_P1_V2_3_COMPLIANCE_IMPLEMENTATION_REPORT.md` (this report)

# FILES MODIFIED

- `components/home/hero.tsx` — full rewrite: real desktop split layout, reassurance/trust/brand-line rendering, `/request` CTA, unified phone Secondary CTA, temporary safe media state, no more `next/image`.
- `lib/content/homepage.ts` — `HomepageCopy.hero` type: removed `rail`, added `reassurance: string` and `trust: string[]`; updated fa/en/ar `hero` copy blocks.
- `lib/content/contact-channels.ts` — removed the now-unused `CONTACT_WHATSAPP_URL` export and its stale comment (nothing else in the repo referenced it after this fix).
- `styles/theme-extensions.css` — added the `.hero-cta` utility (structure/focus/motion/forced-colors), scoped to Hero only.

# RUNTIME COMMIT

`a08063a94eceb6c90642240e9333f3352612ff6e` — "fix: align Homepage Hero with frozen V2.3"

# HERO TESTS

20/20 passing (`npx tsx --test lib/content/hero-frozen-spec-invariants.test.ts`).

# FULL TESTS

870/870 passing (`npm test` — 850 pre-existing + 20 new Hero tests, 0 failing).

# TSC

PASS (zero errors).

# BUILD

PASS. Route table unchanged (`ƒ /:locale/request` confirmed present, same as HERO-P0's build).

# PRODUCTION SAFETY

No production/staging/Cloudflare/D1/Odoo systems touched. No push. No deploy. Dev server used only for local live verification and stopped before finishing this phase.

# REMAINING RISKS

- **Final Hero photography is still owed.** The temporary safe media state is compliant but is explicitly not the intended final visual — the owner needs to supply or commission a real "Steel + Procurement Evidence" photograph (IPE/rebar/plate + restrained procurement-document cues, no factory/production-line/worker content) before this can be considered visually final.
- **Primary CTA fill is white-on-navy ("inverse"), not a literal navy fill**, because the Hero surface is itself navy. This is disclosed above under CTA VISUAL CONTRACT with full measured justification; if the owner wants a literal navy-filled Primary CTA, the Hero's background surface itself would need to move off solid navy — a visual-composition decision outside this phase's "not a redesign" scope.
- `public/images/hero-steel-mill.png` remains on disk, unused. Left in place deliberately (see HERO MEDIA) rather than unilaterally deleted; recommend the owner confirm removal once final artwork lands.
- The eyebrow's contrast (4.79:1) passes but with a tight margin against the 4.5:1 floor; this value is unchanged from before this phase (pre-existing `copper-400-tint` token), not introduced by HERO-P1, and is noted here only for completeness.

# HERO FREEZE STATUS

**Not yet ready to freeze.** Runtime/content/accessibility/CTA-architecture compliance is complete and verified. Freezing Hero V2.3 as implemented should wait until the owner supplies approved final photography — at that point, replacing the temporary placeholder `<div>` in `components/home/hero.tsx`'s visual panel with a real `next/image` (再-adding responsive `sizes`/`priority` evidence per §27/§14 of the original HERO-P0 checklist) is the only remaining step, and should get a fresh media-failure-isolation and LCP check at that time since those were structurally moot while no `<img>` existed.

# NEXT PHASE

Recommend **HERO-P2 (final media integration)**, scoped narrowly to: swap the temporary safe media state for owner-approved photography; re-verify media failure isolation and LCP-priority evidence against the real asset; re-confirm contrast/legibility of copy against whatever real photograph is chosen (the current all-token contrast figures assume the solid navy surface and are unaffected by the swap, since the visual panel is a separate ~45%-width element, not a full-bleed backdrop behind the copy — but this should still be explicitly re-verified once real photography exists). After that, Hero can move to Final Frozen status alongside Header V2.1.
