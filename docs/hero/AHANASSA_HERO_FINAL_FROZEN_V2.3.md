# AHAN ASA HOMEPAGE HERO — FINAL FROZEN V2.3

**Status:** FINAL FROZEN / APPROVED  
**Scope:** Homepage Hero — Role, Copy Architecture, Visual System, Trust/Conversion Layer  
**Language baseline:** FA primary, EN/AR localized equivalents  
**Date:** 2026-09-04

---

# 1. Hero Role

The Homepage Hero is the primary first-screen positioning and conversion surface for Ahan Asa.

It must communicate:
- what Ahan Asa does;
- for whom;
- what makes the procurement approach different;
- what the visitor should do next.

The Hero is not a generic branding banner, catalog, price board, or factory-ownership claim.

---

# 2. Frozen Content Direction

## 2.1 Eyebrow

**مدیریت تأمین فولاد پروژه**

## 2.2 H1

**تأمین فولاد پروژه، با بررسی فنی و تجاری پیش از خرید.**

## 2.3 Supporting Copy

**لیست خرید یا نیاز پروژه را ارسال کنید؛ آهن آسا مشخصات، گزینه‌های تأمین و شرایط تجاری را بررسی می‌کند تا مسیر خرید شفاف‌تر و قابل‌کنترل‌تر باشد.**

Localized EN/AR copy must preserve the same meaning and must not introduce stronger claims.

---

# 3. CTA Architecture

## 3.1 Primary CTA

**ارسال لیست خرید**

Destination:

```text
/request
```

This remains the primary conversion action.

## 3.2 Secondary CTA

Preferred FA:

**درخواست قیمت تلفنی**

The secondary action must remain visually subordinate to the RFQ/list-submission CTA.

---

# 4. Reassurance

**ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.**

---

# 5. Trust Micro-Layer

Preferred FA direction:

```text
بررسی فنی نیاز  •  مقایسه گزینه‌های تأمین  •  هماهنگی خرید
```

Rules:
- maximum 3 points;
- short phrases only;
- text-first presentation;
- no promotional badge styling;
- no exaggerated trust iconography;
- no unverified claims.

---

# 6. Brand Line

**ما مراقب سرمایه شما هستیم.**

The brand line remains secondary to H1, supporting copy, CTA, reassurance, and trust micro-layer.

---

# 7. Hero Visual Concept

Frozen concept:

**Steel + Procurement Evidence**

The Hero visual should combine:
- recognizable steel geometry;
- procurement/list/document cues;
- controlled industrial presentation;
- Ahan Asa visual identity.

Preferred material direction:
- IPE;
- Rebar;
- Plate/Sheet.

These are illustrative Hero composition elements, not commercial product claims.

---

# 8. Prohibited Visual Claims

Do NOT use Hero imagery that implies ownership of assets Ahan Asa does not actually own or operate.

Avoid default Hero use of:
- blast furnace;
- generic steel mill;
- huge warehouse;
- production line;
- welding worker;
- owned-factory implication;
- owned-fleet implication.

---

# 9. Procurement Document Treatment

Procurement/list/drawing elements may appear visually.

They must not contain fake readable commercial data such as:
- fake order numbers;
- fake quantities;
- fake prices;
- fake customer names;
- fake purchase records.

Meaningful content belongs in real HTML, not decorative image text.

---

# 10. Hero Layout

Desktop direction:

```text
~55% copy / ~45% visual
```

Logical layout:

```text
inline-start = copy
inline-end   = visual
```

Therefore:
- FA/AR RTL → copy right, visual left;
- EN LTR → copy left, visual right.

Do not create separate unrelated Hero components per locale.

---

# 11. Hero Height

The Hero must be content-driven.

Do NOT force:

```text
100vh
```

as the default Hero height.

---

# 12. Hero Image Ratio

Preferred:

```text
approximately 4:3
```

Controlled alternatives may be used for responsive art direction.

---

# 13. Hero Image Style

Preferred:
- bright controlled industrial lighting;
- clean;
- realistic;
- precise;
- premium;
- restrained navy/copper identity;
- recognizable steel geometry.

---

# 14. Technical Overlay

Very restrained technical drawing/measurement cues are permitted:
- dimension line;
- measurement mark;
- subtle grid;
- engineering annotation structure.

Decorative only; the Hero must not become a CAD interface.

---

# 15. Hero Motion

## Copy

```text
single grouped reveal
opacity 0 → 1
translateY ~10–14px → 0
~420–480ms
```

## Visual

Restrained directional mask/reveal:

```text
~500–600ms
```

---

# 16. Rejected Hero Motion

Not approved:
- parallax;
- scroll hijacking;
- autoplay video;
- Hero carousel/slider;
- 3D tilt;
- repeated animation;
- dramatic blur;
- large bounce;
- excessive sequential stagger.

---

# 17. Mobile Content Order

```text
Eyebrow
H1
Supporting copy
Primary CTA
Secondary CTA
Reassurance
Trust micro-layer
Brand line
Hero visual
```

The visual must not push the primary CTA unnecessarily below the fold.

---

# 18. Mobile Visual

Mobile may use:
- dedicated crop;
- alternate focal position;
- responsive art direction.

Do not blindly reuse desktop `cover` cropping.

---

# 19. Hero Trust Layer — Explicitly Rejected

Do NOT add by default:
- fake counters;
- unverified tonnage;
- unverified customer count;
- “best price” claim;
- “fastest delivery” claim;
- “100% guarantee” badges;
- supplier/factory logos;
- testimonial block;
- review stars;
- Trustpilot-like decoration;
- full RFQ form inside Hero.

---

# 20. Frozen Hero Hierarchy

```text
Positioning
↓
Clear procurement role
↓
Primary RFQ action
↓
Low-risk reassurance
↓
Short value/trust cues
↓
Brand line
↓
Procurement evidence visual
```

---

# 21. Historical Baseline Note — SUPERSEDED

This section originated in the V1.2 drafting baseline and is retained only for decision history.

**Historical checkpoint:** Hero V2.0 was approved at this stage.

This checkpoint is **SUPERSEDED** by the later frozen refinements and the current document status in §59.

Next Gate:

**Responsive / Accessibility / Performance / Failure Isolation / Final Acceptance**
leading to **Hero Final Frozen V2.0**.


---

# 22. Final Responsive Gate

## 22.1 Desktop

Preferred direction:

```text
Copy ~55%
Visual ~45%
```

The Hero must remain content-driven and must not default to full-viewport theatrical height.

Logical layout rules:

```text
inline-start = copy
inline-end   = visual
```

Therefore:

- FA/AR RTL → copy right, visual left;
- EN LTR → copy left, visual right.

DOM order must remain semantically stable and must not be rearranged with tabindex or accessibility hacks.

---

## 22.2 Mobile

Frozen content order:

```text
Eyebrow
H1
Supporting copy
Primary CTA
Secondary CTA
Reassurance
Trust micro-layer
Brand line
Hero visual
```

Primary action must appear before nonessential visual content.

Preferred mobile CTA behavior:

- Primary CTA: full-width or dominant available width;
- Secondary CTA: visually subordinate;
- spacing must preserve clear hierarchy;
- CTA text must not wrap awkwardly at common mobile widths.

---

## 22.3 Viewport validation

Validate at minimum:

```text
320
360
390
430
768
1024
1280
1440
```

No horizontal page overflow is allowed.

---

# 23. Accessibility Gate

PASS requires:

- one clear H1;
- semantic text structure;
- real anchor/button semantics for CTAs;
- keyboard reachability;
- Enter/Space behavior appropriate to element semantics;
- visible focus;
- normal text contrast >= 4.5:1;
- meaningful UI/focus contrast >= 3:1;
- logical RTL/LTR behavior;
- no information available only through animation;
- no information available only through hover.

The Hero must remain fully understandable when animation is disabled.

---

# 24. Zoom / Reflow Gate

The Hero must remain usable at:

```text
200% zoom
400% zoom
```

Acceptance requires:

- no clipped critical text;
- CTA remains reachable;
- no horizontal scrolling caused by Hero layout;
- visual may move below copy as needed;
- text must reflow instead of shrinking below readable sizes.

---

# 25. Reduced Motion Gate

When:

```css
prefers-reduced-motion: reduce
```

is active:

- grouped copy reveal is removed;
- directional visual reveal is removed;
- no substitute motion is required;
- Hero content appears immediately.

Motion is enhancement only.

---

# 26. Progressive Enhancement Gate

Baseline state must be usable without client-side JavaScript.

Critical invariant:

```text
JavaScript unavailable
↓
H1 visible
Supporting copy visible
Primary CTA usable
Secondary CTA usable
Reassurance visible
Trust micro-layer visible
Hero visual usable/fallback-safe
```

Do not initialize the baseline Hero as permanently hidden pending JS.

---

# 27. Image / Media Performance Gate

The Hero image must:

- reserve intrinsic space using width/height and/or stable aspect ratio;
- avoid disruptive CLS;
- use responsive image delivery;
- use optimized derivatives;
- avoid multi-megabyte delivery;
- support responsive art direction when needed.

The Hero image may be treated as an LCP-priority asset only when evidence supports that it is the actual meaningful LCP candidate.

Possible evidence-driven treatment:

```text
loading="eager"
fetchpriority="high"
```

but only for the confirmed Hero LCP asset.

Do not apply high fetch priority indiscriminately.

---

# 28. Hero Image Failure Isolation

If Hero media fails:

```text
Hero copy remains
CTAs remain
Reassurance remains
Trust micro-layer remains
Page remains healthy
```

The Hero must not depend on the image to communicate the business proposition.

No broken-image icon should become a prominent visual artifact.

A safe neutral media fallback is acceptable.

---

# 29. Localization Gate

FA, AR, and EN must preserve the same business meaning.

Localization must not introduce stronger claims such as:

- guaranteed best price;
- guaranteed delivery;
- guaranteed availability;
- owned-factory implication;
- unlimited sourcing coverage.

Layout must handle longer EN/AR strings without clipping or hierarchy failure.

---

# 30. CTA Integrity Gate

## 30.1 Primary CTA

```text
ارسال لیست خرید
→ /request
```

or locale-equivalent route behavior.

The destination must be real.

No fake modal or placeholder action is permitted.

---

## 30.2 Secondary CTA

The secondary phone action must:

- use an authoritative verified phone number;
- be visually subordinate to the Primary CTA;
- not replace the primary RFQ path.

If no verified number is available for a locale/context, do not fabricate one.

---

# 31. Trust Layer Integrity Gate

Approved:

```text
بررسی فنی نیاز
مقایسه گزینه‌های تأمین
هماهنگی خرید
```

or faithful locale equivalents.

Maximum:

```text
3 short points
```

The Trust micro-layer must not evolve into:

- sales badges;
- numerical proof;
- supplier logo wall;
- rating cluster;
- promotional banner.

Any future proof metric requires authoritative and reproducible data.

---

# 32. Hero Visual Integrity Gate

The Hero visual must not create a false impression that Ahan Asa owns:

- a steel mill;
- a warehouse;
- a processing plant;
- a fleet;
- specific production machinery.

Approved core visual direction remains:

```text
Steel
+
Procurement Document / Purchase List
+
Controlled Technical Detail
```

---

# 33. Structured Data / SEO Boundary

The Hero must not invent Product, Offer, AggregateRating, Review, or Organization claims merely because visual elements resemble commercial entities.

The H1, supporting copy, and CTA should exist in server-rendered HTML.

SEO structure must follow actual page semantics, not visual decoration.

---

# 34. Final Regression Tests

At minimum validate:

## Locales

```text
FA
AR
EN
```

## Viewports

```text
320
360
390
430
768
1024
1280
1440
```

## Interaction / accessibility

```text
keyboard-only
visible focus
200% zoom
400% zoom
prefers-reduced-motion
JavaScript disabled / failed enhancement
```

## Media states

```text
normal image
slow image
failed image
mobile crop
desktop crop
```

## Content states

```text
long localized copy
verified phone available
phone unavailable
```

---

# 35. Final Acceptance Matrix

| Gate | Required Result |
|---|---|
| Hero role | B2B steel procurement positioning |
| H1 | One clear server-rendered H1 |
| Primary CTA | `/request` |
| Secondary CTA | Phone, subordinate |
| Reassurance | Required |
| Trust points | Max 3 |
| Brand line | Secondary |
| Visual concept | Steel + Procurement Evidence |
| Factory ownership implication | FORBIDDEN |
| Fake readable commercial data in image | FORBIDDEN |
| Hero slider | FORBIDDEN |
| Autoplay video | FORBIDDEN |
| Parallax | FORBIDDEN |
| 100vh default | FORBIDDEN |
| Copy motion | Single grouped reveal |
| Visual motion | Restrained directional reveal |
| Motion required for usability | FORBIDDEN |
| Reduced motion support | REQUIRED |
| Mobile CTA before image | REQUIRED |
| RTL/LTR logical layout | REQUIRED |
| 320px usability | REQUIRED |
| 200% zoom | REQUIRED |
| 400% zoom | REQUIRED |
| Keyboard usability | REQUIRED |
| Visible focus | REQUIRED |
| Text contrast | >= 4.5:1 |
| Meaningful UI/focus contrast | >= 3:1 |
| JS required for core Hero | FORBIDDEN |
| Image dimensions/aspect reserved | REQUIRED |
| Responsive image delivery | REQUIRED |
| Hero image failure breaks page | FORBIDDEN |
| Fake counters/badges | FORBIDDEN |
| Supplier logos in Hero | NOT APPROVED |
| Full RFQ form in Hero | NOT APPROVED |
| Evidence-driven LCP priority | REQUIRED approach |
| Fake LCP optimization assumptions | FORBIDDEN |

---

# 36. Final Frozen Hero Architecture

```text
HOMEPAGE HERO

Positioning
↓
Clear steel-procurement role
↓
Supporting commercial/factual explanation
↓
Primary RFQ conversion
↓
Secondary phone path
↓
Low-risk reassurance
↓
Three short value/trust cues
↓
Brand line
↓
Steel + Procurement Evidence visual
```

---

# 37. Governance

Hero V2.0 must not be reopened solely for subjective styling preference.

A revision requires a material reason such as:

- business positioning change;
- conversion evidence;
- accessibility failure;
- localization issue;
- performance regression;
- verified usability problem;
- legal/compliance requirement;
- real brand/media strategy change.

Any revision must be explicitly versioned.

---

# 38. Final Status

**AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.2 — CTA VISUAL SPECIFICATION — APPROVED**

This document is the authoritative Hero implementation baseline.

Implementation should validate against this specification rather than redesign the Hero from scratch.


---

# 39. Version 2.1 — Aesthetic & Perceptual Hardening

Version 2.1 does not change the frozen Hero business proposition, CTA hierarchy, trust psychology, visual integrity, or accessibility baseline.

It adds implementation-level refinements where they improve consistency, typography, motion quality, font stability, contrast preferences, and progressive enhancement without weakening the Version 2.0 gates.

The following Version 2.0 invariants remain unchanged:

- no Hero carousel;
- no autoplay video;
- no parallax;
- no bounce;
- no motion-dependent information;
- no fake trust badges/counters/testimonials;
- no factory-ownership implication;
- no JavaScript dependency for core Hero usability;
- Primary RFQ CTA remains dominant.

---

# 40. Color System — OKLCH

## 40.1 Approved at Design-System level

Absolute `oklch()` color tokens are approved for Ahan Asa's semantic design tokens where browser support and the project CSS pipeline permit them.

Preferred architecture:

```text
semantic token
↓
OKLCH color definition
↓
component usage
```

Examples of semantic roles:

```text
--color-brand-navy
--color-brand-copper
--color-surface-warm
--color-text-primary
--color-text-muted
--color-focus
```

Hero must consume semantic tokens rather than define unrelated local colors.

---

## 40.2 Contrast remains authoritative

Perceptual color-space convenience does not override accessibility.

Every actual foreground/background pair must still pass the frozen contrast gates.

Do not assume that an OKLCH lightness difference automatically satisfies WCAG contrast.

---

## 40.3 Avoid unnecessary advanced-color dependency

Version 2.1 approves ordinary/absolute OKLCH tokens.

Advanced relative-color manipulation is not required for launch.

Where legacy compatibility is materially required, a safe fallback may precede the OKLCH declaration.

---

# 41. Spacing Rhythm

## 41.1 Tokenized spacing is required

Hero spacing must use the shared Ahan Asa spacing system rather than arbitrary one-off pixel values.

The system should cover relationships such as:

```text
Eyebrow → H1
H1 → supporting copy
Supporting copy → CTA group
CTA group → reassurance
Reassurance → trust micro-layer
Trust micro-layer → brand line
```

---

## 41.2 No rigid mathematical ratio requirement

A mathematical modular scale such as 1.25 or 1.333 is NOT frozen as a universal rule.

Reasons:

- Persian/Arabic typography has different optical rhythm;
- multi-line H1 behavior changes by locale;
- visual spacing must survive 320px through large desktop;
- exact optical tuning may require approved token exceptions.

Frozen principle:

**tokenized rhythmic spacing, not arbitrary spacing.**

---

# 42. Fluid Typography with clamp()

Fluid typography is APPROVED and SHOULD be used where it improves Hero continuity across supported widths.

Preferred pattern:

```css
font-size: clamp(minimum, fluid-preferred, maximum);
```

Applicable candidates:

- H1;
- supporting copy where appropriate;
- possibly Eyebrow/secondary display text.

---

## 42.1 Accessibility constraint

Fluid typography must preserve user zoom/text-resize requirements.

The chosen clamp bounds must not prevent meaningful scaling at 200%/400%.

Do not use a narrow maximum that effectively caps user text enlargement.

The existing zoom/reflow acceptance gates remain authoritative.

---

# 43. Container Queries

## 43.1 Approved as optional component-level enhancement

Container size queries are approved where they genuinely simplify Hero component behavior.

Possible use:

```text
Hero container width
↓
single-column vs split layout
↓
internal visual proportions
```

---

## 43.2 Not a replacement for all viewport validation

Hero remains a page-level component with explicit validation at frozen viewport widths.

Container Queries do not remove the requirement to test:

```text
320
360
390
430
768
1024
1280
1440
```

---

## 43.3 No speculative complexity requirement

Container Queries are NOT mandatory merely to support hypothetical future embedding of the Hero in unrelated contexts.

Use them when they reduce CSS complexity or improve component resilience in the actual implementation.

---

# 44. Font Loading & Metric Stability

Font loading is part of the Hero CLS/perceptual-stability budget.

The Hero typography implementation SHOULD define an explicit font-display strategy.

Preferred direction:

```text
@font-face
+
font-display
+
metric-compatible fallback
```

---

## 44.1 size-adjust / metric matching

`size-adjust` and related validated font metric controls MAY be used to harmonize the fallback font with the primary Ahan Asa typeface.

Purpose:

- reduce H1 reflow;
- reduce line-break change after font load;
- reduce layout shift;
- preserve first-screen stability.

Exact percentages/metrics must be measured from the actual fonts.

Do NOT copy arbitrary `size-adjust` values from another project.

---

## 44.2 Font strategy is site-wide

This is primarily a shared Typography/Performance concern.

Hero consumes the global font strategy rather than maintaining a divergent local `@font-face` configuration.

---

# 45. Motion Easing Quality

CSS `linear()` custom easing is APPROVED as an optional way to define a refined motion token.

A physically inspired curve may be used provided that it:

- does not create visible bounce;
- does not create overshoot that conflicts with the frozen motion language;
- stays within the approved Hero duration range;
- respects `prefers-reduced-motion`.

---

## 45.1 No mandatory “spring” dependency

Version 2.1 does NOT require a JavaScript spring library.

A validated CSS easing token is preferred.

A well-tuned `cubic-bezier()` remains acceptable if it produces the intended restrained motion more simply.

Frozen principle:

**natural restrained easing, not a specific mathematical implementation.**

---

# 46. Hero Media Placeholder

A static, restrained placeholder surface is approved while the Hero image is loading.

Preferred direction:

- subtle warm-neutral/navy-tinted brand-compatible surface;
- optional very restrained static gradient;
- no shimmer;
- no animated skeleton;
- no fake product detail;
- no layout shift.

The placeholder must remain visually subordinate to actual Hero content.

---

# 47. Numeric Typography

Where numbers appear in Hero-related utility content, stable numeric forms are approved.

For verified phone-number presentation:

```css
font-variant-numeric: tabular-nums;
```

may be used when supported by the active font.

---

## 47.1 Bidi integrity remains separate

Tabular figures do not solve bidirectional text behavior.

Phone numbers in FA/AR contexts must also preserve correct LTR/isolation behavior using the appropriate HTML/CSS direction strategy.

---

# 48. View Transitions

## 48.1 Optional progressive enhancement only

The View Transition API MAY be evaluated for navigation from the Hero Primary CTA to `/request`.

It is NOT required for Hero V2.1.

---

## 48.2 Baseline navigation remains authoritative

Critical invariant:

```text
View Transition unavailable
or
transition fails
↓
normal navigation to /request works immediately
```

No navigation blocking is permitted.

---

## 48.3 Motion/accessibility

Any View Transition implementation must:

- remain subtle;
- respect `prefers-reduced-motion`;
- not interfere with focus restoration;
- not create confusing stale snapshots;
- not delay access to the RFQ form;
- be validated with the actual vinext/Cloudflare routing stack.

Avoid elaborate shared-element morphing by default.

A simple context-preserving transition is the maximum approved direction unless separately validated.

---

## 48.4 No unsupported behavioral claim

Version 2.1 does not claim that View Transitions have been proven to reduce B2B “click anxiety.”

The rationale is limited to optional visual continuity/context preservation.

---

# 49. Higher-Contrast Preference

Support for:

```css
@media (prefers-contrast: more)
```

is APPROVED as an accessibility enhancement.

Possible adjustments:

- stronger muted-text contrast;
- stronger border definition;
- clearer focus treatment;
- clearer secondary CTA outline.

---

## 49.1 Brand integrity

Do not merely darken every navy/copper value mechanically.

The high-contrast mode must preserve semantic hierarchy and pass actual rendered-state validation.

The normal WCAG AA baseline remains required for all users.

---

# 50. Version 2.1 Decision Matrix

| Proposal | V2.1 Decision |
|---|---|
| OKLCH semantic tokens | APPROVED, preferably Design-System level |
| Relative/advanced OKLCH required | NO |
| Fixed 1.25/1.333 spacing formula | NOT FROZEN |
| Shared spacing tokens | REQUIRED direction |
| `clamp()` fluid Hero typography | APPROVED / SHOULD USE |
| Container Queries | OPTIONAL where they simplify actual Hero CSS |
| Viewport regression testing | STILL REQUIRED |
| `font-display` strategy | APPROVED / SHOULD DEFINE globally |
| `size-adjust` | APPROVED when measured/validated |
| JS spring library | NOT REQUIRED |
| CSS `linear()` easing | OPTIONAL APPROVED |
| Bounce/overshoot | STILL FORBIDDEN |
| Static brand placeholder | APPROVED |
| Animated shimmer | NOT APPROVED by default |
| `tabular-nums` | APPROVED for numeric utility content |
| Phone bidi isolation | STILL REQUIRED independently |
| View Transitions to `/request` | OPTIONAL progressive enhancement |
| View Transition required for navigation | FORBIDDEN |
| “B2B click-anxiety proven reduction” claim | NOT ADOPTED |
| `prefers-contrast: more` | APPROVED |
| Normal WCAG baseline | STILL REQUIRED |

---

# 51. Final V2.1 Acceptance Addendum

In addition to all Version 2.0 gates:

- Hero colors should consume shared semantic design tokens;
- OKLCH may be used as the canonical modern color representation;
- actual contrast tests remain required;
- spacing must use shared tokens;
- fluid typography must preserve zoom/reflow;
- font loading must be treated as part of CLS/perceptual stability;
- any `size-adjust` value must be measured, not guessed;
- motion easing must remain restrained and non-bouncy;
- placeholder surfaces must be static and non-deceptive;
- phone/numeric rendering may use tabular figures but must also handle bidi correctly;
- View Transitions, if implemented, must be fully optional;
- `prefers-contrast: more` should strengthen usability without replacing normal WCAG compliance.

---

# 52. Historical Checkpoint — V2.1 — SUPERSEDED

**Historical checkpoint:** AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.1 — AESTHETIC & PERCEPTUAL HARDENING — APPROVED.

This checkpoint is retained for traceability and is superseded by later versions.

Version 2.1 supersedes Version 2.0 where it adds or clarifies implementation refinements.

The business positioning, content hierarchy, trust psychology, CTA architecture, visual integrity, and motion prohibitions from Version 2.0 remain unchanged.

Hero implementation should use Version 2.1 as the current authoritative baseline.


---

# 53. CTA Visual Specification

## 53.1 Shape

```text
border-radius: 6–8px
```

Rationale:

- fully sharp corners may read as cold/bureaucratic;
- fully rounded pill corners may read as consumer/retail;
- a restrained semi-soft corner is aligned with the engineering-annotation visual language approved for the Hero.

This value applies identically to Primary and Secondary CTA.

---

## 53.2 Dimensions

| Property | Desktop | Mobile |
|---|---:|---:|
| Height | 48–52px | 48px minimum |
| Horizontal padding | 24–32px | 24–32px |
| Font size | 15–16px | 15–16px |
| Font weight | 600 (semi-bold) | 600 (semi-bold) |
| Minimum width — Primary | ~180px | full-width or dominant width, per mobile Hero hierarchy |

Primary and Secondary CTA must share **identical height**.

Hierarchy must be expressed through fill/color treatment, not through different button heights.

---

## 53.3 Primary / Secondary Differentiation

### Primary CTA

```text
solid fill — brand navy
subtle elevation — soft shadow, low opacity
```

The Primary CTA remains the dominant action.

### Secondary CTA

```text
outline / ghost
border only
no fill
text color: navy or copper
```

A lighter-tint filled version of the Primary CTA is explicitly **NOT APPROVED** for the Secondary CTA.

Reason:

at normal glance distance — particularly on mobile — a tinted fill may read as nearly equal in hierarchy to the Primary action.

The Secondary CTA must remain clearly subordinate.

---

## 53.4 Spacing Between CTAs — Mobile

```text
minimum vertical gap: 12–16px
```

This spacing is both visual and functional.

Insufficient separation can:

- create visual clutter;
- weaken action hierarchy;
- increase accidental touch risk.

Minimum accepted vertical separation:

```text
>= 12px
```

---

## 53.5 Interaction States

| State | Treatment |
|---|---|
| Default | As defined in Primary/Secondary specification |
| Hover — desktop | Mild fill/border darkening only; ~150–200ms transition |
| Active / pressed | `transform: scale(0.98)` |
| Focus — keyboard | Clearly visible focus ring with offset; contrast >= 3:1 |
| Disabled — if applicable | Reduced-opacity treatment with no false interaction affordance |

Interaction states must remain restrained.

Not approved:

- bounce;
- overshoot;
- elastic spring;
- large elevation shift;
- glow burst;
- exaggerated scale.

The active `scale(0.98)` state must remain brief and must not interfere with navigation.

For users requesting reduced motion, transform-based pressed feedback may be removed or simplified.

---

## 53.6 Numeric Content

Where numeric content appears inside a CTA, use:

```css
font-variant-numeric: tabular-nums;
```

This applies particularly to:

- Secondary CTA phone number;
- any future numeric CTA utility text.

For FA/AR contexts, numeric typography must also preserve correct bidi isolation/direction.

`tabular-nums` does not replace bidi handling.

---

## 53.7 Primary CTA Shadow

Primary CTA elevation must remain subtle.

Preferred direction:

```text
soft shadow
low opacity
small blur/spread
no floating-card appearance
```

The shadow exists only to separate the Primary CTA from the surrounding Hero surface.

The button must not appear detached or consumer-app-like.

---

## 53.8 CTA Width Rules

### Desktop

Primary and Secondary CTA may have content-driven widths, provided:

- both maintain identical height;
- Primary remains visually dominant;
- minimum Primary width is approximately 180px;
- excessive horizontal stretching is avoided.

### Mobile

Primary CTA:

```text
full-width or clearly dominant width
```

Secondary CTA may also be full-width for alignment and touch comfort, but must remain visually subordinate through outline/ghost treatment.

Button width must not be used to contradict the frozen CTA hierarchy.

---

## 53.9 Typography

CTA typography should use the shared Ahan Asa typography system.

Preferred:

```text
font-size: 15–16px
font-weight: 600
```

Do not use:

- extra-bold retail-style CTA typography;
- all-caps styling for English unless separately justified;
- letter-spacing that harms Persian/Arabic readability.

---

## 53.10 Focus Treatment

Keyboard focus must remain visible across:

- normal Hero surface;
- Primary filled CTA;
- Secondary outlined CTA;
- high-contrast preference mode.

Preferred direction:

```text
focus ring
+
small offset from CTA edge
+
contrast >= 3:1 against adjacent colors
```

Do not remove native focus indication without a validated replacement.

---

## 53.11 High-Contrast Preference

Under:

```css
@media (prefers-contrast: more)
```

CTA treatment may strengthen:

- Secondary border;
- focus ring;
- text contrast;
- separation from surrounding Hero surface.

Primary/Secondary hierarchy must remain intact.

---

## 53.12 Disabled State Governance

The Homepage Hero CTAs normally represent navigational actions and therefore should not commonly require a disabled state.

If a disabled state ever exists:

- it must have a real functional reason;
- it must not be simulated merely to indicate loading;
- it must not look interactable;
- accessible disabled semantics must match the underlying element.

Do not disable the Primary CTA merely while optional animation or visual enhancement is running.

---

## 53.13 CTA Acceptance Matrix

| Check | Required Result |
|---|---|
| Corner radius | 6–8px |
| Primary/Secondary radius | Identical |
| Button height | Identical |
| Desktop height | 48–52px |
| Mobile touch target height | >= 48px |
| Primary minimum desktop width | ~180px |
| Primary treatment | Solid brand navy |
| Primary elevation | Subtle only |
| Secondary treatment | Outline / ghost |
| Secondary lighter-tint fill | FORBIDDEN |
| Mobile CTA vertical gap | >= 12px |
| CTA font size | 15–16px |
| CTA font weight | 600 |
| Hover | Restrained |
| Active | `scale(0.98)` maximum approved direction |
| Bounce/overshoot | FORBIDDEN |
| Focus visibility | REQUIRED |
| Focus contrast | >= 3:1 |
| Numeric alignment | `tabular-nums` where applicable |
| FA/AR numeric bidi handling | REQUIRED |
| Reduced-motion compatibility | REQUIRED |
| Primary hierarchy over Secondary | REQUIRED |

---

# 54. CTA Frozen Principle

```text
Primary CTA
=
clear, solid, confident, restrained

Secondary CTA
=
accessible, useful, visually subordinate

Hierarchy
=
color/fill treatment

NOT
=
different heights
dramatic size difference
retail-style pill buttons
decorative animation
```

---

# 55. Historical Checkpoint — V2.2 — SUPERSEDED

**Historical checkpoint:** AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.2 — CTA VISUAL SPECIFICATION — APPROVED.

This checkpoint is retained for traceability and is superseded by Version 2.3.

Version 2.2 supersedes Version 2.1 only where it adds the CTA visual and interaction contract.

All previously frozen:

- Hero content hierarchy;
- procurement positioning;
- trust psychology;
- responsive behavior;
- accessibility;
- motion limitations;
- perceptual hardening;

remain unchanged.


---

# 56. Forced Colors / Windows High Contrast

Support for:

```css
@media (forced-colors: active)
```

is REQUIRED for Hero CTA validation.

This requirement is separate from:

```css
@media (prefers-contrast: more)
```

because forced-colors mode may replace author colors with a user/UA-selected system palette.

---

## 56.1 CTA boundary preservation

Primary and Secondary CTA boundaries must remain visually identifiable in forced-colors mode.

This is particularly important for the Secondary CTA because its normal hierarchy relies on an outline/ghost treatment.

Approved direction:

```css
@media (forced-colors: active) {
  .hero-cta {
    border: 2px solid ButtonBorder;
  }

  .hero-cta:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 3px;
  }
}
```

Exact selectors/tokens remain implementation-level.

System-color keywords should be preferred for forced-colors-specific repairs.

---

## 56.2 Do not fight user colors

Do NOT apply:

```css
forced-color-adjust: none;
```

by default merely to preserve Ahan Asa branding.

The browser/user high-contrast palette should normally remain authoritative.

`forced-color-adjust: none` requires a specific validated accessibility reason.

---

## 56.3 Forced-colors acceptance

PASS requires:

- Primary CTA remains distinguishable;
- Secondary CTA border remains visible;
- focus state remains visible;
- CTA text remains readable;
- no critical distinction depends on box-shadow;
- no critical distinction depends only on brand navy/copper;
- normal navigation remains unchanged.

---

# 57. Focus Ring Selector Contract

Hero CTA focus styling should use:

```css
:focus-visible
```

for the custom keyboard-focus treatment.

Purpose:

- provide a clear focus indicator when keyboard/assistive interaction requires it;
- avoid unnecessarily forcing the custom focus ring on ordinary pointer clicks when the browser does not consider it necessary.

---

## 57.1 Do not globally suppress focus

The following pattern is NOT approved:

```css
:focus {
  outline: none;
}
```

unless an equally reliable replacement is guaranteed.

Preferred model:

```css
.hero-cta:focus-visible {
  outline: ...;
  outline-offset: ...;
}
```

Browser/UA focus heuristics remain respected.

---

## 57.2 Focus-visible acceptance

PASS requires:

- Tab navigation exposes an obvious focus state;
- focus ring contrast remains >= 3:1 against adjacent colors;
- focus remains visible in FA / AR / EN;
- focus remains visible in normal and forced-colors modes;
- pointer interaction does not require a decorative custom focus ring when `:focus-visible` does not match;
- no keyboard user loses focus indication.

---

# 58. CTA Responsiveness / INP Contract

The visual pressed state:

```css
transform: scale(0.98);
```

is decorative interaction feedback only.

It must never delay the CTA's real action.

Critical invariant:

```text
user activates CTA
↓
navigation/action begins immediately
↓
visual pressed feedback may occur naturally
```

Not:

```text
user activates CTA
↓
wait for 150–200ms animation
↓
then navigate
```

---

## 58.1 No animation-completion dependency

Do NOT use:

- `setTimeout()` to wait for the pressed animation;
- animation-end handlers as a navigation prerequisite;
- artificial debounce on the primary navigation action;
- heavy synchronous JavaScript before route activation.

The Primary CTA must remain a normal real navigation path to `/request`.

---

## 58.2 INP-oriented implementation

CTA interaction code should minimize:

- input delay;
- synchronous event-handler work;
- unnecessary client-side routing work;
- presentation delay caused by avoidable DOM mutation.

The pressed transform should remain GPU-friendly and must not trigger layout-dependent work.

---

## 58.3 View Transition compatibility

If the optional View Transition enhancement from §48 is enabled:

```text
CTA activation
↓
route/navigation starts without artificial delay
↓
View Transition enhances presentation when supported
```

The transition must not become a prerequisite for navigation.

INP/responsiveness takes priority over decorative transition completion.

---

# 59. Document Version Integrity & Current Status

## 59.1 Authoritative document identity

The authoritative version of this file is:

**AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.3**

The first-line document title, current file name, and this status section must always agree.

---

## 59.2 Historical status blocks

Earlier V2.0, V2.1, and V2.2 status sections are retained only as:

```text
HISTORICAL CHECKPOINT — SUPERSEDED
```

They must never be interpreted as the current implementation authority.

---

## 59.3 Version-control rule

For any future Hero revision:

```text
update file name
+
update first-line title
+
update current-status section
+
mark prior current-status section as historical/superseded
```

A release/specification gate must fail if those version identifiers disagree.

---

## 59.4 Current approval

**AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.3 — ACCESSIBILITY & INTERACTION HARDENING — APPROVED**

Version 2.3 supersedes Version 2.2 where it adds:

- forced-colors / Windows High Contrast support;
- explicit `:focus-visible` focus behavior;
- CTA responsiveness / INP protections;
- document-version consistency governance.

All prior business, content, visual, trust, CTA, responsive, accessibility, performance, and motion constraints remain in force unless Version 2.3 explicitly clarifies them.

This Version 2.3 file is the current authoritative Hero implementation baseline.
