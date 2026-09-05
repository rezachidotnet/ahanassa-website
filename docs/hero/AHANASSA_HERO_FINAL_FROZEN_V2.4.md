# AHAN ASA HOMEPAGE HERO — FINAL FROZEN V2.4

**Status:** FINAL FROZEN / APPROVED  
**Scope:** Homepage Hero — Shared Button Component Adoption  
**Language baseline:** FA primary, EN/AR localized equivalents  
**Date:** 2026-09-05  
**Predecessor:** `AHANASSA_HERO_FINAL_FROZEN_V2.3.md`  
**Shared Button authority:** `AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`

---

# 1. Version 2.4 Purpose

Version 2.4 changes only Button ownership and exact shared Button geometry.

All Hero V2.3 business, content, trust, visual, responsive, accessibility, performance, motion, forced-colors, focus-visible, and INP rules remain in force unless explicitly superseded below.

Version 2.3 is incorporated by reference for all unchanged Hero decisions.

---

# 2. Shared Button Source of Truth

Hero no longer owns an independent Button visual primitive.

Authoritative flow:

```text
AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0
        ↓
Shared Button implementation / tokens
        ↓
Homepage Hero Primary + Secondary CTA
```

Hero continues to own:

- CTA copy;
- CTA destinations;
- Primary vs Secondary hierarchy;
- CTA order;
- Hero-specific width/composition;
- mobile CTA group spacing.

Hero no longer owns:

- Button height;
- Button radius;
- horizontal padding;
- Button font size/weight;
- shared hover/pressed behavior;
- shared focus treatment;
- shared forced-colors treatment.

---

# 3. Hero CTA Content Remains Frozen

## 3.1 Primary CTA

**ارسال لیست خرید**

Destination:

```text
/request
```

## 3.2 Secondary CTA

Preferred FA:

**درخواست قیمت تلفنی**

The Secondary remains visually subordinate and must use the shared Secondary Button variant when it is visually rendered as a Button.

If product implementation later decides the phone is better expressed as a lower-weight utility link rather than a Button on a specific breakpoint, that requires Hero-specific UX review; it must not create a third Button visual system.

---

# 4. Superseded V2.3 Button Geometry

The V2.3 CTA section previously permitted ranges such as:

```text
radius: 6–8px
height: 48–52px
horizontal padding: 24–32px
font size: 15–16px
font weight: 600
```

For implementation consistency, those ranges are superseded by the exact shared Button V1.0 contract:

```text
height: 48px
radius: 8px
horizontal padding: 28px
font size: 16px
font weight: 600
```

Primary and Secondary use identical geometry.

This resolves ambiguity between Hero and Header.

---

# 5. Hero Primary Usage

Hero Primary CTA consumes:

```text
Shared Button
variant: Primary
```

Hero composition may additionally require on desktop:

```text
min-inline-size: approximately 180px
```

The minimum width is a Hero layout/composition rule, not Button primitive geometry.

On mobile:

```text
width: 100%
```

or a clearly dominant available width is allowed.

Width changes do not alter the shared Button visual contract.

---

# 6. Hero Secondary Usage

Hero Secondary CTA consumes:

```text
Shared Button
variant: Secondary
```

Required:

- same 48px height;
- same 8px radius;
- same 28px horizontal padding;
- same 16px / 600 typography;
- outline/ghost visual hierarchy;
- no lighter-tint filled Primary look.

Hero Secondary must remain clearly subordinate.

---

# 7. Hero CTA Group Composition

Hero owns spacing between the shared Buttons.

Mobile frozen rule remains:

```text
vertical gap: 12–16px
minimum accepted: 12px
```

Primary and Secondary may both be full-width on mobile for alignment/touch comfort, but hierarchy must remain defined through Button variant treatment.

---

# 8. Interaction State Ownership

The following V2.3 rules remain required, but their implementation authority moves to Shared Button V1.0:

- restrained hover;
- pressed state max `scale(0.98)`;
- pressed animation never delays action;
- `:focus-visible`;
- focus contrast >= 3:1;
- reduced-motion compatibility;
- forced-colors compatibility;
- no bounce/overshoot;
- no glow;
- no spring;
- no animation-completion dependency.

Hero must not duplicate those CSS rules locally unless unavoidable framework composition still resolves to the same shared tokens/component.

---

# 9. INP / Navigation Contract

The existing Hero V2.3 responsiveness rule remains unchanged:

```text
activation
↓
navigation/action begins immediately
↓
visual pressed feedback may occur naturally
```

The shared Button component must not introduce:

- artificial timeout before navigation;
- animation-end prerequisite;
- synchronous analytics work blocking activation;
- unnecessary DOM mutation before routing.

The Primary CTA remains a real navigation path to `/request`.

---

# 10. Forced Colors / Focus

V2.3 forced-colors and `:focus-visible` requirements remain binding.

Their component-level implementation moves to Shared Button V1.0.

Hero-specific acceptance still verifies the rendered Button against the actual Hero background/surface.

Shared component ownership does not eliminate page-level rendered contrast testing.

---

# 11. Width vs Visual Identity

Hero may differ from Header in width because layout context differs.

Allowed:

```text
Header Primary → content-driven width
Hero desktop Primary → ~180px minimum
Hero mobile Primary → full-width/dominant width
```

Not allowed:

```text
different radius
different height
different font size/weight
different focus language
different hover/pressed language
different Primary fill semantics
```

This is the distinction between:

```text
shared component
vs
surface composition
```

---

# 12. Hero V2.4 Acceptance Addendum

Hero V2.4 PASS requires:

- Primary uses Shared Button `Primary`;
- Secondary uses Shared Button `Secondary` when button-rendered;
- exact height 48px;
- exact radius 8px;
- exact horizontal padding 28px;
- exact typography 16px / 600;
- Primary desktop min-width remains approximately 180px;
- mobile Primary remains full-width/dominant;
- mobile CTA gap >= 12px;
- no duplicate Hero-local Button token set;
- no Header/Hero drift;
- shared focus-visible behavior passes on Hero surface;
- shared forced-colors behavior passes in Hero context;
- shared reduced-motion behavior passes;
- activation remains immediate / INP-oriented;
- Primary remains visually dominant;
- Secondary tinted fill remains forbidden.

---

# 13. Historical Checkpoint — V2.3 — SUPERSEDED

**Historical checkpoint:** AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.3 — ACCESSIBILITY & INTERACTION HARDENING — APPROVED.

V2.3 remains preserved as historical implementation authority before shared Button extraction.

V2.4 supersedes V2.3 only where it replaces Hero-local Button visual/interaction ownership with the shared Button Component V1.0 contract.

---

# 14. Current Authoritative Status

**AHAN ASA HOMEPAGE HERO FINAL FROZEN V2.4 — SHARED BUTTON COMPONENT ADOPTION — APPROVED**

Current authority stack:

```text
Hero business/content/layout rules
→ Hero V2.4 + incorporated V2.3 rules

Button visual/interaction primitive
→ AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0
```

Future Hero changes require an explicitly versioned Hero document.

Future Button geometry/state changes require an explicitly versioned Button Component document and must not be silently overridden inside Hero.
