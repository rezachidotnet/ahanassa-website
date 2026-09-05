# AHAN ASA — SHARED BUTTON COMPONENT
## Final Frozen Component Contract — Version 1.0

**Project:** Ahan Asa / آهن آسا  
**Document type:** Shared UI Component / Design-System Source of Truth  
**Status:** FINAL FROZEN / APPROVED  
**Version:** 1.0  
**Date:** 2026-09-05  
**Authority:** Shared visual and interaction contract for public-site Primary and Secondary action buttons

---

# 1. Purpose

This document is the single source of truth for the visual, semantic, accessibility, and interaction contract of Ahan Asa public-site action buttons.

It exists to prevent separate surfaces such as Header, Hero, Final CTA, forms, and future conversion modules from independently inventing button geometry or state behavior.

Frozen authority model:

```text
Shared Button Component Contract
        ↓
Button design tokens / component implementation
        ↓
Header / Hero / other approved surfaces
```

Component consumers may control placement, width, grouping, and contextual copy. They must not redefine the core button shape, typography, visual hierarchy, or interaction states.

---

# 2. Scope

Version 1.0 freezes two shared variants:

1. **Primary**
2. **Secondary**

Version 1.0 does not freeze:
- destructive/admin buttons;
- icon-only controls;
- disclosure chevrons;
- pagination controls;
- tabs;
- chips/status pills;
- phone utility links;
- language selectors;
- text-link styling.

Those are separate component families.

---

# 3. Semantic Rule

The component chooses semantic HTML based on action meaning.

## 3.1 Navigation

Use a real link/anchor when activation navigates to another route.

Example:

```html
<a href="/request">ارسال لیست خرید</a>
```

Do not use a `<button>` merely to simulate navigation.

## 3.2 In-page/application action

Use a real `<button>` when activation performs an action without normal route navigation.

Example:

```html
<button type="submit">ثبت درخواست</button>
```

## 3.3 Prohibited

Do not use clickable generic `<div>` or `<span>` elements as buttons.

---

# 4. Frozen Core Geometry

The shared standard Button geometry is exact:

| Property | Frozen value |
|---|---:|
| Height | **48px / 3rem** |
| Border radius | **8px / 0.5rem** |
| Horizontal padding | **28px / 1.75rem** |
| Font size | **16px / 1rem** |
| Font weight | **600** |
| Minimum touch target height | **48px** |
| Inline icon gap, if approved | **8px** |

Primary and Secondary use identical geometry.

The hierarchy between variants must never be created through different heights or exaggerated size differences.

---

# 5. Width Ownership

Core Button does not own a global fixed width.

Width belongs to the composition using the Button.

Approved examples:

```text
Header Primary CTA
→ content-driven width

Hero desktop Primary CTA
→ min-inline-size approximately 180px

Hero mobile Primary CTA
→ full-width or clearly dominant available width

Mobile drawer Primary CTA
→ full available drawer content width
```

Changing width must not change height, radius, font, or state behavior.

---

# 6. Typography

The Button consumes the shared Ahan Asa typography system.

Frozen:

```text
font-size: 16px
font-weight: 600
line-height: controlled to preserve 48px button height
```

Rules:

- no extra-bold retail-style CTA typography;
- no default all-caps English treatment;
- no tracking/letter-spacing that harms Persian or Arabic readability;
- localized labels may expand horizontally;
- text must not be artificially compressed to preserve a fixed width.

---

# 7. Primary Variant

Primary is the dominant conversion/action button.

Required treatment:

```text
solid semantic Primary Action background
high-contrast foreground text
restrained technical/professional appearance
```

The semantic Primary Action background maps to the approved Ahan Asa brand/action navy token.

Required characteristics:

- solid fill;
- no gradient;
- no glow;
- no glass effect;
- no copper glow;
- no pill radius;
- no oversized shadow.

A subtle low-opacity action shadow token may be used, but the button must not appear as a floating consumer-app card.

---

# 8. Secondary Variant

Secondary is subordinate to Primary.

Required treatment:

```text
transparent / ghost surface
visible border
approved secondary text color
no competing solid fill
```

Frozen rule:

> Secondary must not use a lighter-tint filled version of Primary.

The hierarchy must remain immediately recognizable at normal viewing distance and on mobile.

---

# 9. Primary / Secondary Hierarchy

Frozen principle:

```text
Primary
=
solid + confident + restrained

Secondary
=
outlined + useful + subordinate

Hierarchy
=
fill / border / semantic emphasis

NOT
=
different heights
dramatic width tricks
retail pill geometry
decorative animation
```

When Primary and Secondary appear together:

- geometry is identical;
- Primary remains visually dominant;
- Secondary never becomes an equal solid-filled rival.

---

# 10. Hover State

Desktop pointer hover uses restrained tonal feedback.

Frozen behavior:

```text
duration: 160ms
property: background / border / text tone as relevant
easing: shared restrained motion token
```

No hover translation, bounce, glow burst, or large elevation shift.

Hover must never be the only indication of interactivity.

---

# 11. Active / Pressed State

Maximum approved pressed feedback:

```css
transform: scale(0.98);
```

Rules:

- immediate feedback;
- brief;
- GPU-friendly;
- must not change layout;
- must not delay the real action/navigation;
- no `setTimeout()` waiting for animation completion;
- no animation-end prerequisite.

Critical invariant:

```text
activation
↓
real action/navigation starts immediately
↓
visual pressed feedback may occur naturally
```

---

# 12. Reduced Motion

When:

```css
@media (prefers-reduced-motion: reduce)
```

is active:

- pressed transform may be removed;
- hover/active feedback may reduce to direct color/border change;
- no essential meaning or action depends on animation.

---

# 13. Focus Contract

Custom keyboard focus uses:

```css
:focus-visible
```

Required:

- clearly visible ring;
- ring contrast >= 3:1 against adjacent colors;
- small positive offset;
- visible on Primary and Secondary;
- visible in FA / AR / EN;
- visible in normal and forced-colors modes.

Preferred frozen geometry:

```text
focus outline width: 2px
focus outline offset: 3px
```

Do not globally suppress focus using:

```css
outline: none;
```

without an equally reliable replacement.

---

# 14. Forced Colors / Windows High Contrast

Support for:

```css
@media (forced-colors: active)
```

is required.

The component must remain identifiable when author colors are replaced.

Approved direction:

```css
@media (forced-colors: active) {
  .aa-button {
    border: 2px solid ButtonBorder;
  }

  .aa-button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 3px;
  }
}
```

Rules:

- do not depend on box-shadow for essential boundary recognition;
- do not depend only on brand navy/copper;
- do not set `forced-color-adjust: none` by default.

---

# 15. Contrast

Required minimums:

```text
Normal text                     >= 4.5:1
Meaningful boundary/focus UI    >= 3:1
```

Actual rendered states must be tested.

Semantic tokens do not automatically prove contrast compliance.

---

# 16. Disabled State

Public navigation CTAs normally should not be disabled.

If a genuine Button action requires a disabled state:

- use correct native semantics (`disabled` where applicable);
- do not present a disabled control as interactable;
- do not disable merely because optional animation/loading is occurring;
- disabled styling must remain understandable.

For link-based navigation, do not create fake disabled links unless the product state genuinely requires it and semantics are explicitly defined.

---

# 17. Loading / Busy State

A loading state must not silently change the Button's width/height geometry.

For true actions:

- preserve label context where practical;
- `aria-busy` or approved state semantics may be used;
- avoid spinner-only state when action meaning becomes unclear;
- do not use loading state for ordinary route navigation.

Loading behavior must never erase error recovery or cause duplicate submission.

---

# 18. Icon Rules

Icons are optional, not default.

If present:

- icon supports the action meaning;
- icon does not replace necessary visible text for core conversion actions;
- gap = 8px;
- icon size must remain optically subordinate to the label;
- direction-sensitive icons mirror logically in RTL when required.

Primary Header/Hero CTA does not require an icon by default.

---

# 19. Localization / RTL / LTR

The Button component is shared across FA / AR / EN.

Required:

- logical padding/layout properties;
- no separate locale-specific visual implementation;
- Persian/Arabic labels retain correct shaping;
- long English/Arabic labels may expand;
- numeric content uses appropriate bidi isolation;
- `font-variant-numeric: tabular-nums` may be used when numeric content is material.

---

# 20. Button Group Composition

Spacing between Buttons belongs to the parent composition.

For Hero mobile Primary + Secondary:

```text
vertical gap: 12–16px
minimum accepted: 12px
```

For desktop groups, spacing uses shared design-system tokens.

The Button component itself must not hardcode section-specific external margins.

---

# 21. Header Adoption

Header consumes:

```text
variant="primary"
height=48px
radius=8px
padding-inline=28px
font-size=16px
font-weight=600
```

Header may control only:

- placement;
- available width;
- surrounding gap;
- responsive visibility.

Header must not redefine:
- radius;
- typography;
- hover;
- pressed state;
- focus ring;
- primary fill semantics.

The Header phone and language utility are NOT Button variants.

---

# 22. Hero Adoption

Hero Primary consumes the exact same Primary Button primitive as Header.

Hero Secondary consumes the exact shared Secondary primitive.

Hero may control:

- desktop Primary minimum width (~180px);
- mobile full-width/dominant width;
- CTA group spacing;
- CTA order.

Hero must not redefine:
- 48px height;
- 8px radius;
- 28px horizontal padding;
- 16px / 600 typography;
- focus/hover/active behavior.

---

# 23. Mobile Drawer Adoption

The drawer Primary CTA uses the same Primary Button primitive.

Allowed composition difference:

```text
width: 100%
```

No separate "mobile drawer button design" is permitted.

---

# 24. Phone Utility Negative Rule

Phone is a utility action/link, not a shared Primary/Secondary Button.

Phone must never adopt CTA-equivalent treatment such as:

- solid Primary fill;
- Primary/Secondary Button padding;
- 8px button box solely to mimic CTA hierarchy;
- competing strong border/fill.

A `tel:` utility remains lower visual weight.

---

# 25. Design Token Contract

Implementation should expose shared semantic tokens equivalent to:

```css
--aa-button-height: 3rem;
--aa-button-radius: 0.5rem;
--aa-button-padding-inline: 1.75rem;
--aa-button-font-size: 1rem;
--aa-button-font-weight: 600;
--aa-button-icon-gap: 0.5rem;

--aa-button-transition-duration: 160ms;
--aa-button-pressed-scale: 0.98;

--aa-button-focus-width: 2px;
--aa-button-focus-offset: 3px;

--aa-button-primary-bg: var(--aa-color-action-primary);
--aa-button-primary-fg: var(--aa-color-on-action-primary);
--aa-button-primary-bg-hover: var(--aa-color-action-primary-hover);

--aa-button-secondary-bg: transparent;
--aa-button-secondary-fg: var(--aa-color-action-secondary);
--aa-button-secondary-border: var(--aa-color-action-secondary-border);
```

Exact underlying color values remain owned by the authoritative semantic color system.

Consumers must not create local copies of these values.

---

# 26. Implementation Ownership

Preferred architecture:

```text
Design tokens
    ↓
Shared Button component
    ↓
Surface composition
```

The Header and Hero should import/use the shared Button component rather than duplicate Tailwind/class strings independently.

If framework conventions require class composition, one shared variant definition must remain authoritative.

---

# 27. Analytics Boundary

Button component may expose stable analytics hooks/props but must not hardcode page-specific analytics events.

Page/surface owns event meaning such as:

```text
header_primary_cta_click
hero_primary_cta_click
```

No PII may be included.

Analytics failure must never block Button activation.

---

# 28. Performance / INP

Button activation must minimize:

- input delay;
- synchronous handler work;
- unnecessary DOM mutation;
- artificial animation waits.

Pressed feedback must not delay navigation.

Optional View Transitions must remain progressive enhancement only.

---

# 29. Prohibited Variants / Drift

Without a new Button specification version, do NOT introduce:

- pill Primary buttons;
- 12px/16px local radius overrides;
- 40px or 56px copies of the same global CTA merely by surface;
- Hero-only hover behavior;
- Header-only focus behavior;
- Copper-filled alternate Primary CTA competing with navy Primary;
- tinted Secondary fill;
- bounce/spring;
- magnetic hover;
- glow;
- local hardcoded colors replacing semantic action tokens.

---

# 30. Acceptance Matrix

| Check | Required |
|---|---|
| Shared source of truth | PASS |
| Primary / Secondary geometry identical | PASS |
| Height | 48px |
| Radius | 8px |
| Horizontal padding | 28px |
| Font size | 16px |
| Font weight | 600 |
| Minimum touch height | 48px |
| Primary | Solid semantic action navy |
| Secondary | Outline / ghost |
| Secondary tinted fill | FORBIDDEN |
| Hover | 160ms restrained tonal change |
| Pressed | max `scale(0.98)` |
| Animation delays action | FORBIDDEN |
| Focus selector | `:focus-visible` |
| Focus width | 2px |
| Focus offset | 3px |
| Focus/UI contrast | >= 3:1 |
| Normal text contrast | >= 4.5:1 |
| Forced-colors support | REQUIRED |
| Reduced-motion support | REQUIRED |
| Native semantic element | REQUIRED |
| RTL/LTR shared implementation | REQUIRED |
| Surface-local geometry duplication | FORBIDDEN |
| Header Primary uses shared component | REQUIRED |
| Hero Primary uses shared component | REQUIRED |
| Hero Secondary uses shared component | REQUIRED |
| Mobile drawer CTA uses shared component | REQUIRED |

---

# 31. Frozen Principle

```text
One Button system.
Different contexts.
No visual drift.
```

Header, Hero, and other approved conversion surfaces may compose the Button differently, but they do not own separate Button designs.

---

# 32. Version 1.0 Status

**AHAN ASA SHARED BUTTON COMPONENT V1.0 — FINAL FROZEN / APPROVED**

Future changes to Button geometry, visual hierarchy, interaction states, accessibility behavior, or semantic action rules require an explicitly versioned Button Component document.

Header/Hero documents may not silently override this contract.
