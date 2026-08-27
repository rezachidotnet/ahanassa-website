# 01 — UX / UI Design System

> Ahan Asa | آهن آسا — v0 canonical package
> Consolidated from: `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md`, `RESPONSIVE_RULES.md`, `ACCESSIBILITY.md`, `ACCESSIBILITY_QA.md`, `RESPONSIVE_QA.md`, `HEADER_NAVIGATION_SPEC.md`, `FOOTER_SPEC.md`, `HOMEPAGE_SPEC.md` (visual/UI portions) — reconciled against `PROJECT_OVERRIDES.md` and `CLAUDE.md`.
> Locales: fa (default, RTL), en (LTR), ar (RTL) — all three required at launch. Every rule below is written direction-safe (logical CSS properties, no separate RTL/LTR component trees) so it applies unchanged across all three.

---

## 1. Design thesis

Ahan Asa must feel like a **composed procurement office**, not a steel bazaar, price board, warehouse catalog, or consumer e-commerce store. The experience metaphor is an **executive procurement desk**: the client's request is received clearly, complexity is handled behind the scenes, the next step is always visible, and evidence replaces exaggerated promises.

Core experiential promise (the UI/UX expression of the brand slogan **«ما مراقب سرمایه شما هستیم.»**):

> "I can send my invoice or material list, understand what happens next, and trust that this process will be handled responsibly."

**Desired emotional sequence:** Uncertainty → Recognition → Clarity → Trust → Confident action.

**Approved visual territory:** premium industrial advisory — structured, spacious, composed, geometric, editorial, document-driven, tactile but clean. **Explicitly rejected:** cheap/discount-led, aggressive sales-oriented, traditional iron-shop (`آهن‌فروشی`), commodity trading terminal, large impersonal marketplace, luxury-without-substance, startup novelty. No dark metallic textures, sparks, flames, or heavy mechanical decoration.

**Every page must help the visitor do at least one of:** understand the service, evaluate trust, clarify fit, learn the process, prepare required information, or submit an invoice/material list.

---

## 2. Homepage visual authority — mandatory precondition

**Before implementing or materially modifying the homepage, `/design-reference/homepage-desktop-v1.png` must be inspected.** It is the owner-approved visual source of truth for the desktop homepage: overall composition, section order/hierarchy, layout proportions, spacing rhythm, typography scale, color relationships, CTA placement, and visual density. It outranks the textual descriptions in this file and in `HOMEPAGE_SPEC.md` **specifically on visual-appearance points**, wherever they conflict.

This file and `02_RFQ_CONVERSION_UX.md` remain fully authoritative for: content, routing, SEO, accessibility, semantics, localization, performance, RFQ behavior, and data — the image never overrides those. Responsive adaptation (tablet/mobile — the reference is desktop-only) and technical adaptations for accessibility/CWV/semantic markup/browser compatibility/fa-en-ar content-length differences are expected and must preserve, not replace, the approved direction. Redesigning the homepage, changing section hierarchy without a documented functional reason, or substituting a generic template requires explicit owner approval. `/design-reference/` is immutable — never modify the reference image itself.

The image is not present elsewhere in this v0 package as a description; it ships alongside this package as `homepage-desktop-v1.png` and must be read directly.

---

## 3. Brand foundation (reference only — assets are immutable)

- **Names:** English `Ahan Asa`; Persian `آهن آسا`. Do not alter spelling/casing in public copy.
- **Category:** Premium B2B steel procurement management and project purchasing support.
- **Slogan:** `ما مراقب سرمایه شما هستیم.` (`We protect your capital.`) — Persian is primary; supports but never replaces a clear category explanation; never repeated in every section; never permanently fused into the logo artwork unless a dedicated lockup is separately approved.
- **Archetype:** Guardian, supported by Expert. Never a loud trader, bargain hunter, or fear-based salesperson.
- **Logo:** The master mark (Steel Navy A-frame/structural-portal containing a centered Forge Copper diamond) is **immutable approved artwork** — never redrawn in CSS/HTML/canvas/an icon library, never recolored outside approved variants, never AI-generated, never mirrored/stretched/rotated/skewed, never given shadows/bevels/gradients/textures. Only an intact uniform fade or scale is permitted in motion (§8). Minimum sizes: icon-only ≥ 24px digital / 8mm print; full horizontal lockup ≥ 120px digital / 30mm print — below that, use icon-only. Clear space `x` ≈ 22.5% of icon height, minimum 1× on every side.
- **Persian wordmark status — OPEN DECISION — DO NOT INVENT:** the final outlined/vector Persian wordmark and its lockup measurements are not yet approved. Live Persian text may be used as ordinary brand-name copy but must never be presented as the official wordmark.

---

## 4. Color system

| Token | Value | Role |
|---|---:|---|
| `--aa-color-brand-navy-900` (Steel Navy) | `#0B2545` | Trust, authority, navigation, key dark surfaces |
| `--aa-color-brand-copper-600` (Forge Copper) | `#B04A2F` | Selective conversion accent, active state, controlled emphasis |
| `--aa-color-white` | `#FFFFFF` | Primary surface, clarity |
| `--aa-color-brand-cream-50` (Warm Cream) | `#FBF5EB` | Warm editorial surface, human reassurance |

These four are the **locked brand palette** — never changed without explicit approval. Composition guide (not a rigid quota): 60–75% white/warm-neutral space, 20–35% Steel Navy, 5–10% Forge Copper. Copper must remain an accent — never a dominant background, never on every interactive element.

**Supporting neutrals** (functional UI tokens, not brand-palette additions): `--aa-color-neutral-950 #101828` → `--aa-color-neutral-50 #F9FAFB` (9-step scale for text/borders/surfaces). **Functional/semantic colors** (success `#157347`/`#ECFDF3`, warning `#854D0E`/`#FFFBEB`, danger `#B42318`/`#FEF3F2`, info `#175CD3`/`#EFF8FF`) must stay semantically distinct from Copper — never use Copper to imply an error, never green to imply an unverified result.

**Verified contrast ratios (approved uses):**

| Pair | Ratio | Use |
|---|---:|---|
| Steel Navy on White | 15.39:1 | All text/icons/controls |
| White on Steel Navy | 15.39:1 | All text/icons/controls |
| White on Forge Copper | 5.43:1 | Normal text, primary buttons |
| Forge Copper on White | 5.43:1 | Normal text, links, icons |
| Steel Navy on Warm Cream | 14.19:1 | All text/icons/controls |
| Forge Copper on Warm Cream | 5.01:1 | Normal text, controlled accents |
| Steel Navy on Forge Copper | 2.83:1 | **Prohibited** for normal text/essential UI |

Normal text ≥ 4.5:1, large text/essential non-text UI ≥ 3:1. Color is never the sole indicator of status, selection, or validity. Gradients are not part of the default system — any exception requires approval and must not reduce readability.

---

## 5. Typography

| Role | Family | Fallback |
|---|---|---|
| Persian display/body/UI | `Estedad Variable` (preferred candidate, pending final licensing/technical approval) | `Vazirmatn`, `Tahoma`, sans-serif |
| Latin display/UI | `Montserrat Variable` | `Arial`, sans-serif |

Exact production font family, licensing, loading strategy, and multi-locale (fa+en+ar concurrent) budget are governed by the font-loading contract in `04_SEO_PERFORMANCE_ANALYTICS.md` — this section covers typographic *design* only.

**Weight scale:** regular 400 (body), medium 500 (labels/nav), semibold 600 (subheadings), bold 700 (display/key statements). Avoid very thin weights — industrial confidence comes from structure, not artificially heavy text everywhere.

**Fluid type tokens** (`clamp()`-based, representative): display-xl `clamp(2.75rem,6vw,5.75rem)`, display-lg `clamp(2.25rem,4.5vw,4.5rem)`, heading-lg `clamp(1.75rem,2.5vw,2.5rem)`, body-md `1rem`/line-height 1.85, label `0.875rem`. Persian line height is intentionally more generous than typical Latin defaults; final metrics require testing against real Persian content.

**Rules:** body copy 45–70ch, hero copy 18–28ch; sentence case (no simulated uppercase for Persian); never justify Persian paragraphs; real sequential heading order; correct نیم‌فاصله and Persian punctuation; mixed Latin identifiers (phone, email, URL, quantities, standards, codes) require explicit bidirectional isolation (`dir="ltr"` + `unicode-bidi: isolate`, or `<bdi>`); default body text never smaller than 16px; supporting copy below 14px is prohibited except nonessential legal/data annotations.

---

## 6. Spacing, layout, and grid

Base unit `4px`. Scale: `--aa-space-1` (0.25rem) through `--aa-space-32` (8rem), used for all internal/section spacing — no arbitrary one-off values in components.

**Container:**

```css
:root { --aa-container-max: 80rem; --aa-reading-max: 46rem; --aa-page-gutter: clamp(1rem, 3vw, 2rem); }
.container { inline-size: min(100% - (2 * var(--aa-page-gutter)), var(--aa-container-max)); margin-inline: auto; }
```

**Grid:** mobile 4 columns/16px gutter → tablet (`md`, 48rem/768px) 8 columns/20–24px gutter → desktop (`lg`, 64rem/1024px+) 12 columns/24–32px gutter. CSS Grid for page composition, Flexbox for one-dimensional alignment. Prefer two or three meaningful content blocks, editorial grouping, or progressive disclosure over long rows of identical cards.

**Breakpoint tokens:** `sm` 30rem/480px, `md` 48rem/768px, `lg` 64rem/1024px, `xl` 80rem/1280px, `2xl` 96rem/1536px — layout thresholds driven by content collision, not device labels. Do not add unapproved breakpoints without a documented collision.

**Supported viewport range:** 320px–2560px, portrait/landscape, browser zoom to 200% without loss of content/function, touch/mouse/keyboard/hybrid input. No horizontal page scroll at any supported width except an explicitly labeled, intentionally scrollable data region (e.g. a wide technical table).

---

## 7. Shape, border, elevation

| Radius token | Value | Use |
|---|---:|---|
| `--aa-radius-sm` | 0.5rem | Inputs, compact controls |
| `--aa-radius-md` | 0.75rem | Buttons, standard cards |
| `--aa-radius-lg` | 1rem | Major cards, media frames |
| `--aa-radius-xl` | 1.5rem | Featured panels only |
| `--aa-radius-pill` | 999px | Status chips only — never the default button/field shape |

Borders (1px default / 2px strong, solid) are preferred over shadows for grouping technical/procurement content. Shadow tokens (`xs`/`sm`/`md`) are reserved for real elevation — menus/popovers (`sm`), dialogs/major overlays (`md`); default cards use a border, not a shadow. No colored glow, glassmorphism blur, or deep floating-card shadow by default; glassmorphism, if ever used, is limited to a specific media-overlay context with a robust fallback.

---

## 8. Motion system

**Motion thesis: calm control, made visible.** Every animation must Orient, Connect, Confirm, Prevent error, Preserve continuity, or Prioritize reading order — if it does none of these, don't implement it.

**Two approved signature patterns only:** controlled fade-up (text/structured content) and directional image mask (editorial/industrial imagery) — subtle, never mandatory on every section, never combined into a dense sequence.

**Duration tokens:** instant 80ms (press feedback), fast 160ms (hover/focus/tooltip), base 240ms (menu/accordion/alert), slow 400ms (dialog/drawer), reveal 600ms (hero/editorial only — nothing standard exceeds 600ms). **Easing:** standard `cubic-bezier(0.2,0,0,1)`, enter `cubic-bezier(0,0,0,1)`, exit `cubic-bezier(0.3,0,1,1)` — spring/bounce easing is prohibited. **Distance:** max 24px standard travel (drawer translation is the sole exception). **Scale:** max 1.02 through standard interaction; card scale-on-hover is prohibited by default.

**Per-viewport budget:** ≤1 editorial reveal group, ≤4 staggered elements, ≤3 simultaneous translated elements, ≤1 image-mask reveal, no continuous decorative animation. Hero entrance stagger caps at 180ms total.

**Prohibited categorically:** parallax, cursor-following effects, continuous loops, autoplay background video, animated counters (unless real verified data with a reduced-motion final-value fallback), pulsing/bouncing CTAs, split-letter/typewriter text reveals, card-wall staggered entrances, logo geometry morphing, confetti/celebration effects, spring-based menus, shake-on-error validation.

**Reduced motion:** `prefers-reduced-motion: reduce` removes scroll-triggered translation, image-mask reveals, scale entrances, and route-transition motion; state acknowledgment, focus indication, and real progress communication remain. Motion must never delay access to content, navigation, forms, or CTAs, and must never be the sole channel for a state change (always paired with text/icon/shape).

**RTL/LTR direction:** horizontal motion uses logical-direction tokens, never hardcoded left/right assumptions; directional elements (arrows, chevrons, drawer entrance edge, breadcrumb separators) mirror by meaning; the logo, phone/email/search/download icons, media controls, and technical imagery never mirror.

---

## 9. Component architecture

Five layers, strict boundaries: **Foundations** (tokens, `Icon`, `VisuallyHidden`, `DirectionalValue`) → **Primitives** (`Container`, `Stack`, `Button`, `Input`, `Badge`) → **Composites** (`FormField`, `FileUpload`, `Accordion`, `DataTable`) → **Patterns** (`PageHero`, `ProcurementProcess`, `EvidenceCard`, `CtaBand`) → **Shells** (`SiteHeader`, `MobileNavigation`, `SiteFooter`). A primitive holds no business copy; a pattern may encode approved Ahan Asa content structure but never unverified production facts; pages compose shells/patterns and must not recreate primitive styling locally.

**Universal state model** for every interactive component: default, hover (enhancement only, never sole discovery), focus-visible (2px Copper outline + offset, or approved focus shadow — visible on light/Navy/Copper surfaces), active/pressed, selected/current (non-color cue required), disabled (legible, not opacity-only), loading (stable dimensions, prevents duplicate submission), success, error, empty (honest explanation + next action).

**Sizes:** primary button min 44px high / preferred 48px; icon button min 44×44px target; text input/select min 48px high; navigation item min 44px target height.

**Server-first:** components are server-rendered by default; a component becomes a client component only for genuine browser state/event handling/measurement — never convert an entire page to client-side for one interactive leaf.

### Key components (contract summary, not exhaustive)

- **`Button`** — variants `primary` (Navy bg/white label), `conversion` (Copper bg/white label, selective use only, never the site-wide default), `secondary` (outline), `ghost`, `destructive` (semantic danger, never Copper). One dominant button per action group. Labels describe the result ("ارسال لیست خرید", never "کلیک کنید").
- **`FileUpload`** — states: idle, drag-active, selected, validating, uploading, uploaded, rejected-type, rejected-size, network/server-error, removable, retry. Browse must always work even when drag-and-drop is offered. Full contract in `02_RFQ_CONVERSION_UX.md`.
- **`InquiryForm`** — the reusable RFQ experience; field order/integrations/fallback channels are owned by `02_RFQ_CONVERSION_UX.md`, not invented here.
- **`Accordion`** — FAQs and secondary detail only; never hides essential service scope or primary conversion information; semantic button trigger with `aria-expanded`/`aria-controls`.
- **`DataTable`/`ComparisonMatrix`** — real table markup, caption/contextual heading, RTL-aware alignment, bidi-isolated numeric/code values, no color-only meaning, controlled horizontal scroll on small screens.
- **`EvidenceCard`/`ProcessCard`/`CapabilityCard`** — gracefully omit unavailable fields; never display placeholder numbers, client logos, or outcomes as if real.
- **`Metric`** — restricted: verified data only (value, unit, label, timeframe, source/approval reference); decorative counters and vanity metrics are prohibited.

**Prohibited component patterns:** universal "smart" multi-mode components, duplicate RTL/LTR component trees, nested interactive elements, links that perform actions or buttons that navigate, hover-only navigation or essential tooltips, auto-rotating carousels for primary content, infinite-scroll archives, complex RFQ forms inside modals, fake live-price/inventory/quote-counter widgets, generic marketplace product cards with price+buy actions, decorative metric counters, production upload UI shipped before its security/data workflow is approved.

---

## 10. RTL / bidirectional contract

All components inherit `lang`/`dir` from the document root (`fa`→rtl, `en`→ltr, `ar`→rtl); CSS uses logical properties exclusively (`margin-inline`, `padding-inline`, `inset-inline-start`, `border-start-start-radius`, logical text alignment) — never `margin-left`/`right` for layout intent without a documented physical exception. DOM order stays logical; CSS `order` must never create a keyboard-order mismatch. Mixed-direction values (phone, email, URL, standards, dimensions, filenames, Latin project IDs) render `dir="ltr"` + `unicode-bidi: isolate`, without forcing the surrounding row to LTR. One component implementation serves all three locales — never a duplicated RTL/LTR variant.

---

## 11. Responsive rules

Mobile-first `min-width` media queries; base styles target the smallest viewport, complexity added only as space allows. Never hide essential information merely to fit a layout; never change semantic source order to achieve a visual arrangement. Touch targets ≥ 44×44px; adjacent targets spaced to prevent accidental activation; every hover interaction has a touch/keyboard equivalent.

Long-form body text: 45–75 Persian characters per line target; forms max-width ~672px unless intentionally split; global content max 1440px, editorial/reading max ~704px. Truncation is limited to explicitly secondary metadata (never primary headings, service names, or quotation details), with the full value available accessibly.

**Required test matrix** (minimum widths): 320, 375, 430, 768, 1024, 1280, 1440, 1920px, plus 1px below/above any breakpoint touched by a change — tested with realistic Persian content, at least one mixed Persian/Latin technical string, portrait+landscape mobile, 200% zoom, keyboard-only, reduced motion, and touch emulation.

---

## 12. Accessibility standard

**Target: WCAG 2.2 Level AA** for all public pages and flows, verified through automated checks + manual keyboard testing + zoom/reflow testing + assistive-technology testing — an automated pass alone never establishes conformance, and no WCAG conformance badge may be published without a completed evaluation.

**Non-negotiable release baseline:** valid `lang`/`dir`; semantic landmarks + unique `main`; keyboard-accessible skip link (first focusable element); one descriptive `h1` + logical heading order; complete keyboard access, no traps; visible focus not hidden by sticky content; sufficient text/non-text contrast; meaningful alt text (informative images) / empty alt (decorative); accessible names for all controls; persistent form labels (placeholder is never the only label); programmatically connected instructions/errors; clear success/failure/loading/retry feedback; reflow without 2D scrolling at 320px; 200% text-resize + 400% zoom usability; no drag-only or motion-dependent interaction without an alternative; reduced-motion support; no color-only meaning; captions/transcripts for meaningful media; status announcements without unexpected focus movement; content usable when JS/animation/images fail.

**Keyboard:** every function reachable by keyboard; logical Tab/Shift+Tab order matching visual/reading order; no positive `tabindex`; no clickable `<div>`/`<span>` substituting for a real interactive element; Escape closes dismissible overlays (unless data loss requires an explicit warning); focus restores to the trigger on overlay close.

**Forms/uploads (the highest-risk journey):** persistent programmatic labels; required/optional stated in text; format/unit/privacy instructions appear before submission; validate on submit and on blur (never mid-typing for incomplete values); preserve entered data on any recoverable error; error summary receives focus after failed submission with links to each field; `aria-invalid`/`aria-describedby` connect errors correctly; upload announces filename, progress, success, failure without flooding live regions with every percentage tick; duplicate submission is prevented while preserving the accessible name; success/failure use an appropriate live region and never steal focus for an ordinary success message.

**Target sizes:** WCAG 2.2 minimum 24×24px with defined exceptions; the Ahan Asa system standard is 44×44px for primary buttons, icon buttons, menu items, and mobile controls.

**Severity policy for release gating:** Blocker (a critical journey — e.g. keyboard-trapped RFQ submission — is unavailable to a user group) and High (major content/function unreliable) issues must be fixed before release; no exception may permit a Blocker in the primary inquiry journey.

---

## 13. Header specification (summary)

Composition: `SkipLink` → `LogoLink` (approved horizontal lockup, ≥120px desktop / icon-only fallback at constrained widths) → `PrimaryNavigation` (desktop-capable layouts) → at most **one** high-value inquiry CTA → `MobileMenuButton` below the content-driven collapse point (default `lg`/1024px, or forced earlier by zoom/label pressure) → `MobileNavigation` drawer when opened.

Top-level navigation: normally ≤6 links + 1 CTA; a link appears only when its route is approved and publishable — never a placeholder. Current-page state uses `aria-current="page"` plus a non-color cue. Desktop dropdowns open via accessible button activation (not hover-only), stay within the viewport, close on Escape/outside click/route change. Mobile drawer: enters from the logical inline-end edge, contains the same navigation + primary CTA, traps focus while open, restores focus to the trigger on close, locks background scroll without layout shift.

**Explicitly excluded from Phase 1 header** unless a later approved spec changes it: live prices, stock counters, cart, account/login, wishlist, order tracking, checkout, promotional ticker, multiple competing CTAs, unverified partner logos, a language selector before a second locale is genuinely complete (per `03_CONTENT_ROUTES_LOCALIZATION.md`), mega menu unless the approved IA proves it necessary.

---

## 14. Footer specification (summary)

Two regions: **`FooterCTA`** (pre-footer conversion — heading/body/primary+secondary action, on Warm Cream or White, must not imply instant quotation/guaranteed availability/lowest price) and **`SiteFooter`** (Steel Navy surface with the reversed logo lockup, a concise role statement, 3 curated navigation groups of 3–5 links each, verified contact methods only, legal/copyright row, optional locale control once ≥2 locales are complete).

Non-negotiable: the primary footer conversion is sending an invoice/material list, never a daily-price feed; no fabricated metrics/supplier counts/client logos/awards; no `href="#"` or dead links; legal/copyright information remains visible on mobile; footer functions fully without JavaScript; one page-level `<footer>` landmark; reversed logo only on approved Navy surface, never recolored/animated.

---

## 15. QA gates (condensed)

**Responsive QA blocks release when:** any supported width (320–2560px) produces horizontal page scroll; content/CTAs/controls are clipped, overlapped, or hidden behind sticky UI; RTL logical-property or mixed-direction handling fails; touch targets fall under the system minimum; a Core Web Vitals regression is introduced by a responsive change.

**Accessibility QA blocks release when:** any P0 (blocker — critical journey unusable for a user group) or P1 (critical — major content/control unreliable) issue is open; the RFQ form cannot be completed and submitted via keyboard alone or via screen reader; automated scans report a critical/serious violation on a released route or state (default view, opened menus/dialogs, form errors, success states, upload states, accordions, tables); contrast, zoom/reflow, or reduced-motion checks fail.

Minimum assistive-technology matrix: Windows Chrome/Edge + NVDA (required desktop baseline), macOS Safari + VoiceOver (required desktop baseline), iOS Safari + VoiceOver (required mobile baseline), Android Chrome + TalkBack (recommended).

---

## 16. Open decisions — do not invent

- **Final Persian outlined wordmark** and its exact lockup measurements.
- **Live production type system**: exact Persian/Latin font families beyond the Estedad-preferred/Montserrat-reference direction, weights, licensing, fallback stack, and the multi-locale (fa+en+ar) loading budget — resolved in `04_SEO_PERFORMANCE_ANALYTICS.md`, not here.
- **Full supporting neutral/semantic palette** beyond the tokens listed in §4 (final values belong to a dedicated design-system pass).
- **Dark mode** — not approved for Phase 1; do not implement one.
- **Final navigation labels and menu grouping** — subordinate to `03_CONTENT_ROUTES_LOCALIZATION.md`'s sitemap/IA once finalized.
- **Approved photography library** — verified people/projects/facilities/products and their usage rights.
- **Exact breakpoint-specific motion density rules** beyond the budgets in §8.
- **Final performance budgets and automated QA tooling** — belongs to `04_SEO_PERFORMANCE_ANALYTICS.md` / `05_TECH_DATA_CLOUDFLARE.md`.
- **Company contact facts** (phone number is an unconfirmed candidate only — do not publish it) — see `03_CONTENT_ROUTES_LOCALIZATION.md` and root `PROJECT_OVERRIDES.md` §7.

Until these are resolved, use clearly marked development-only placeholders — never convert a `TBD` into a production assumption.
