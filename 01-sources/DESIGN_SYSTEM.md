# Ahan Asa Website — Design System

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `DESIGN_SYSTEM.md`  
> **Status:** Draft v1.0 — Implementation contract  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian (Farsi), fully RTL  
> **Primary users:** Professional B2B steel buyers, project owners, contractors, EPC teams, procurement managers, and technical decision-makers

---

## 1. Purpose

This document defines the reusable visual foundations, design tokens, interaction rules, component states, and implementation constraints for the Ahan Asa website.

It translates the strategic direction in `PROJECT_BRIEF.md`, the identity rules in `BRAND_GUIDELINES.md`, and the experience principles in `DESIGN_DIRECTION.md` into a system Claude Code and human contributors can implement consistently.

The system must make Ahan Asa feel like a premium steel procurement management partner: precise, composed, protective, technically aware, commercially disciplined, and trustworthy. It must not resemble a crowded steel marketplace, consumer e-commerce store, generic construction template, or speculative price dashboard.

This document is normative. The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate requirement strength.

## 2. System Principles

### 2.1 Control before decoration

Every design decision must improve comprehension, trust, navigation, comparison, qualification, or conversion. Decorative elements must never compete with evidence, specifications, process, or client decisions.

### 2.2 Premium through restraint

Premium quality is expressed through proportion, typography, whitespace, alignment, material photography, and interaction quality—not through excessive gradients, glow, animation, glass effects, or ornamental detail.

### 2.3 Proof before claims

Components must support verified projects, real documents, real process evidence, and qualified statements. The UI must never invent metrics, clients, testimonials, certifications, inventory, prices, locations, or operational capabilities.

### 2.4 Procurement, not commodity retail

Interfaces should prioritize requirements, risk, specifications, supplier evaluation, documentation, coordination, and delivery. Product grids, price tickers, shopping-cart patterns, discount styling, urgency counters, and consumer retail conventions are outside Phase 1.

### 2.5 Persian-first, direction-safe

The initial website is Persian and fully RTL. Layout, icons, mixed-direction data, tables, forms, focus order, and motion must behave correctly in RTL. The same component architecture must support future LTR locales without component duplication.

### 2.6 Accessible by default

Accessibility is part of the component definition, not a later QA pass. Keyboard access, visible focus, semantic HTML, sufficient contrast, error recovery, reduced motion, and readable type are required.

### 2.7 System over exceptions

Pages must be composed from approved tokens, primitives, patterns, and components. One-off values and duplicated variants require a recorded reason and should be promoted into the system only when reusable.

## 3. Authority and Change Control

When rules conflict, follow this order unless `CLAUDE.md` defines a stricter hierarchy:

1. Approved owner decision recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `DESIGN_SYSTEM.md`
6. Page, content, motion, responsive, accessibility, and technical specifications
7. Task-specific implementation instruction

The following must not be changed without explicit approval:

- Master logo geometry, proportions, or internal spacing
- Steel Navy `#0B2545`
- Forge Copper `#B04A2F`
- White `#FFFFFF`
- Warm Cream `#FBF5EB`
- The Persian-first, fully RTL launch direction
- The restrained premium-industrial character
- The primary conversion model based on consultation or project inquiry

Supporting gray, feedback, and data colors in this document are functional interface tokens, not additions to the master brand palette. `COLOR_SYSTEM.md` may refine them later while preserving the four approved brand colors and accessibility.

## 4. Token Architecture

Tokens must use three layers:

1. **Primitive tokens** — raw values such as color, size, radius, and duration.
2. **Semantic tokens** — purpose-based aliases such as `text-primary` and `action-primary-bg`.
3. **Component tokens** — local mappings such as `button-primary-bg`.

Components must consume semantic or component tokens. Raw values must not be repeated inside component styles.

### 4.1 Naming convention

Use lowercase kebab-case in CSS custom properties:

```css
--aa-{category}-{role}-{state};
```

Examples:

```css
--aa-color-text-primary;
--aa-color-action-primary-hover;
--aa-space-6;
--aa-radius-md;
--aa-motion-duration-fast;
```

### 4.2 Token governance

- Never use a raw hex color in a component file.
- Never introduce an arbitrary spacing value when a system token is suitable.
- Never use physical directional properties such as `margin-left` when a logical property such as `margin-inline-start` expresses the intent.
- Prefer semantic tokens over palette names in component code.
- Dark sections must use explicit dark-surface semantic tokens; do not invert colors automatically.
- A new token requires a reusable purpose, not a single-page preference.

## 5. Color System

### 5.1 Approved brand primitives

| Token | Value | Role |
|---|---:|---|
| `--aa-color-brand-navy-900` | `#0B2545` | Trust, authority, navigation, key dark surfaces |
| `--aa-color-brand-copper-600` | `#B04A2F` | Selective conversion accent, active state, controlled emphasis |
| `--aa-color-white` | `#FFFFFF` | Primary surface, clarity, negative logo use |
| `--aa-color-brand-cream-50` | `#FBF5EB` | Warm editorial surface and human reassurance |

### 5.2 Supporting neutral primitives

| Token | Value | Intended use |
|---|---:|---|
| `--aa-color-neutral-950` | `#101828` | Strong body text on light surfaces |
| `--aa-color-neutral-800` | `#1D2939` | Secondary headings |
| `--aa-color-neutral-700` | `#344054` | Primary body text |
| `--aa-color-neutral-600` | `#475467` | Secondary text |
| `--aa-color-neutral-500` | `#667085` | Metadata; use only at sufficient size |
| `--aa-color-neutral-300` | `#D0D5DD` | Strong borders and dividers |
| `--aa-color-neutral-200` | `#EAECF0` | Default borders |
| `--aa-color-neutral-100` | `#F2F4F7` | Muted surfaces |
| `--aa-color-neutral-50` | `#F9FAFB` | Alternate section surface |

### 5.3 Functional primitives

| Token | Value | Intended use |
|---|---:|---|
| `--aa-color-success-700` | `#157347` | Success text and strong success indicators |
| `--aa-color-success-50` | `#ECFDF3` | Success surface |
| `--aa-color-warning-800` | `#854D0E` | Warning text |
| `--aa-color-warning-50` | `#FFFBEB` | Warning surface |
| `--aa-color-danger-700` | `#B42318` | Error text and destructive actions |
| `--aa-color-danger-50` | `#FEF3F2` | Error surface |
| `--aa-color-info-700` | `#175CD3` | Informational text and links where needed |
| `--aa-color-info-50` | `#EFF8FF` | Informational surface |

Functional colors must communicate state, not decoration. Never use success green to imply an unverified business result or copper to imply an error.

### 5.4 Semantic light-theme tokens

```css
:root {
  color-scheme: light;

  --aa-color-bg-canvas: #FFFFFF;
  --aa-color-bg-subtle: #F9FAFB;
  --aa-color-bg-warm: #FBF5EB;
  --aa-color-bg-muted: #F2F4F7;
  --aa-color-bg-inverse: #0B2545;

  --aa-color-surface-primary: #FFFFFF;
  --aa-color-surface-secondary: #F9FAFB;
  --aa-color-surface-selected: #F7ECE8;

  --aa-color-text-primary: #101828;
  --aa-color-text-secondary: #475467;
  --aa-color-text-tertiary: #667085;
  --aa-color-text-brand: #0B2545;
  --aa-color-text-accent: #B04A2F;
  --aa-color-text-inverse: #FFFFFF;

  --aa-color-border-subtle: #EAECF0;
  --aa-color-border-strong: #D0D5DD;
  --aa-color-border-accent: #B04A2F;

  --aa-color-action-primary-bg: #0B2545;
  --aa-color-action-primary-text: #FFFFFF;
  --aa-color-action-primary-hover: #12355F;
  --aa-color-action-primary-active: #071C35;

  --aa-color-action-accent-bg: #B04A2F;
  --aa-color-action-accent-text: #FFFFFF;
  --aa-color-action-accent-hover: #963D27;
  --aa-color-action-accent-active: #7E321F;

  --aa-color-action-secondary-bg: #FFFFFF;
  --aa-color-action-secondary-text: #0B2545;
  --aa-color-action-secondary-border: #0B2545;
  --aa-color-action-secondary-hover: #F2F4F7;
  --aa-color-action-secondary-active: #EAECF0;

  --aa-color-focus-ring: #B04A2F;
  --aa-color-selection-bg: #F1D9D0;
  --aa-color-selection-text: #0B2545;
}
```

### 5.5 Contrast requirements

Verified reference contrast ratios:

| Pair | Ratio | Approved use |
|---|---:|---|
| Steel Navy on White | `15.39:1` | All text sizes, icons, controls |
| White on Steel Navy | `15.39:1` | All text sizes, icons, controls |
| White on Forge Copper | `5.43:1` | Normal text and primary buttons |
| Forge Copper on White | `5.43:1` | Normal text, links, icons |
| Steel Navy on Warm Cream | `14.19:1` | All text sizes, icons, controls |
| Forge Copper on Warm Cream | `5.01:1` | Normal text and controlled accents |
| Steel Navy on Forge Copper | `2.83:1` | Not approved for normal text |

Rules:

- Normal text must meet at least WCAG AA `4.5:1`.
- Large text and essential non-text UI must meet at least `3:1`.
- Do not place Steel Navy text on Forge Copper or Forge Copper text on Steel Navy for essential content.
- Copper must remain an accent and action color, not a large default page background.
- White and Warm Cream should dominate the public website; neutral gray surfaces are functional alternatives.
- Gradients are not part of the default system. Any later use requires approval and must not reduce readability.

## 6. Typography System

### 6.1 Typeface roles

| Role | Typeface | Fallback |
|---|---|---|
| Persian display, body, and UI | `Estedad Variable` | `Vazirmatn`, `Tahoma`, sans-serif |
| Latin display, text, and interface | `Montserrat Variable` | `Arial`, sans-serif |
| Numbers and mixed technical data | Inherit the surrounding approved family | tabular numerals where alignment matters |

The Persian brand name inside an approved logo lockup is artwork, not live text. It must never be reconstructed with a web font when the official asset is available.

### 6.2 Font-loading rules

- Self-host approved WOFF2 variable files when licensing permits.
- Use `font-display: swap` or an equivalent framework strategy.
- Preload only the critical launch-locale font files.
- Subset by script only when shaping and all required Persian characters remain verified.
- Do not request fonts from a third-party origin in production without approval.
- Prevent synthetic bold and italic where possible.

### 6.3 Weight scale

| Token | Value | Usage |
|---|---:|---|
| `--aa-font-weight-regular` | `400` | Body and long reading |
| `--aa-font-weight-medium` | `500` | Labels, navigation, controls |
| `--aa-font-weight-semibold` | `600` | Subheadings and emphasis |
| `--aa-font-weight-bold` | `700` | Display headings and key statements |

Avoid very thin weights. Industrial confidence must come from clear structure, not artificially heavy text everywhere.

### 6.4 Fluid type tokens

| Token | Size | Line height | Typical usage |
|---|---|---:|---|
| `--aa-text-display-xl` | `clamp(2.75rem, 6vw, 5.75rem)` | `1.05` | Exceptional homepage statement only |
| `--aa-text-display-lg` | `clamp(2.25rem, 4.5vw, 4.5rem)` | `1.1` | Hero heading |
| `--aa-text-display-md` | `clamp(2rem, 3.5vw, 3.5rem)` | `1.15` | Major section heading |
| `--aa-text-heading-lg` | `clamp(1.75rem, 2.5vw, 2.5rem)` | `1.25` | Page and feature headings |
| `--aa-text-heading-md` | `clamp(1.375rem, 2vw, 1.75rem)` | `1.35` | Card groups and subsections |
| `--aa-text-heading-sm` | `1.125rem` | `1.45` | Component title |
| `--aa-text-body-lg` | `1.125rem` | `1.9` | Lead copy |
| `--aa-text-body-md` | `1rem` | `1.85` | Default Persian body copy |
| `--aa-text-body-sm` | `0.875rem` | `1.75` | Supporting copy |
| `--aa-text-label` | `0.875rem` | `1.5` | Form labels and controls |
| `--aa-text-caption` | `0.75rem` | `1.6` | Captions and metadata |

Persian line height is intentionally more generous than common Latin defaults. Final font metrics must be visually tested with real Persian content.

### 6.5 Typography rules

- Body copy should generally remain between `45ch` and `70ch`.
- Hero copy should generally remain between `18ch` and `28ch`.
- Use sentence case; avoid simulated uppercase for Persian.
- Do not justify Persian paragraphs.
- Use real headings in sequential semantic order.
- Do not center long text or technical explanations.
- Use non-breaking spaces only where linguistically required; do not use them to force layout.
- Use correct Persian half-spaces and punctuation in final content.
- Mixed Latin identifiers, phone numbers, emails, URLs, quantities, standards, and codes need explicit bidirectional isolation.
- Tables and aligned quantities may use tabular numerals.

## 7. Spacing System

The base unit is `4px`. Components must use the approved scale.

| Token | Value | Typical usage |
|---|---:|---|
| `--aa-space-0` | `0` | Reset |
| `--aa-space-1` | `0.25rem` | Tight icon detail |
| `--aa-space-2` | `0.5rem` | Icon-label gap |
| `--aa-space-3` | `0.75rem` | Compact control spacing |
| `--aa-space-4` | `1rem` | Default internal gap |
| `--aa-space-5` | `1.25rem` | Form group gap |
| `--aa-space-6` | `1.5rem` | Card internal spacing |
| `--aa-space-8` | `2rem` | Component group spacing |
| `--aa-space-10` | `2.5rem` | Compact section rhythm |
| `--aa-space-12` | `3rem` | Mobile section rhythm |
| `--aa-space-16` | `4rem` | Tablet section rhythm |
| `--aa-space-20` | `5rem` | Desktop section rhythm |
| `--aa-space-24` | `6rem` | Large desktop section rhythm |
| `--aa-space-32` | `8rem` | Exceptional editorial separation |

Rules:

- Use spacing to express hierarchy before adding borders or backgrounds.
- Section padding should scale fluidly between `3rem` and `7.5rem` unless a component has a documented exception.
- Dense technical data can be compact; marketing and trust-building sections should breathe.
- Avoid stacking multiple separators, shadows, and surface changes to solve a spacing problem.

## 8. Layout and Grid

### 8.1 Page container

```css
.container {
  inline-size: min(100% - (2 * var(--aa-page-gutter)), var(--aa-container-max));
  margin-inline: auto;
}

:root {
  --aa-container-max: 80rem;
  --aa-reading-max: 46rem;
  --aa-page-gutter: clamp(1rem, 3vw, 2rem);
}
```

### 8.2 Grid

- Mobile: 4 columns, `16px` gutter.
- Tablet: 8 columns, `20–24px` gutter.
- Desktop: 12 columns, `24–32px` gutter.
- Use CSS Grid for page composition and Flexbox for one-dimensional component alignment.
- Editorial asymmetry is permitted only when reading order remains obvious.
- Avoid long rows of equal cards. Prefer two or three meaningful items, progressive disclosure, or editorial grouping.
- Text, media, and technical evidence must align to shared grid lines.

### 8.3 Breakpoint contract

Breakpoints are layout thresholds, not device labels:

| Token | Value | Intended transition |
|---|---:|---|
| `--aa-breakpoint-sm` | `30rem` / `480px` | Small phone refinements |
| `--aa-breakpoint-md` | `48rem` / `768px` | Multi-column tablet layouts |
| `--aa-breakpoint-lg` | `64rem` / `1024px` | Desktop navigation and compositions |
| `--aa-breakpoint-xl` | `80rem` / `1280px` | Full editorial grid |
| `--aa-breakpoint-2xl` | `96rem` / `1536px` | Large-screen whitespace, not larger text by default |

Prefer intrinsic responsiveness with `minmax()`, `auto-fit`, `clamp()`, and container queries. Media queries should handle meaningful structural changes.

### 8.4 Responsive behavior

- Content and primary actions must remain available from `320px` viewport width.
- No horizontal page scrolling is allowed at `320px` except within an explicitly labeled data region.
- Multi-column sections collapse according to content priority, not visual symmetry.
- The primary CTA must remain easy to find but must not permanently cover content.
- Desktop mega-navigation must become a clear, keyboard-safe mobile disclosure pattern.
- Tables should first reduce nonessential columns; use an accessible scroll region only when the comparison cannot be reformatted.
- Touch targets must be at least `44 × 44px`.
- Hover must enhance but never reveal essential information unavailable by keyboard or touch.

## 9. Shape, Border, and Elevation

### 9.1 Radius tokens

| Token | Value | Usage |
|---|---:|---|
| `--aa-radius-xs` | `0.25rem` | Small technical tags |
| `--aa-radius-sm` | `0.5rem` | Inputs and compact controls |
| `--aa-radius-md` | `0.75rem` | Buttons and standard cards |
| `--aa-radius-lg` | `1rem` | Major cards and media frames |
| `--aa-radius-xl` | `1.5rem` | Featured panels only |
| `--aa-radius-pill` | `999px` | Status chips only |

Rounded corners must remain controlled. Do not apply pill shapes to every button, card, field, and label.

### 9.2 Border tokens

```css
--aa-border-width-default: 1px;
--aa-border-width-strong: 2px;
--aa-border-style-default: solid;
```

Borders are preferred over shadows for grouping technical and procurement information.

### 9.3 Shadow tokens

```css
--aa-shadow-xs: 0 1px 2px rgb(16 24 40 / 0.05);
--aa-shadow-sm: 0 4px 12px rgb(16 24 40 / 0.07);
--aa-shadow-md: 0 12px 32px rgb(16 24 40 / 0.10);
--aa-shadow-focus: 0 0 0 4px rgb(176 74 47 / 0.20);
```

Rules:

- Default cards use a border, not a shadow.
- `shadow-sm` is suitable for menus, popovers, and lifted interactive surfaces.
- `shadow-md` is limited to dialogs and major overlays.
- No colored glow, glassmorphism blur, or deep floating-card shadow is allowed by default.

## 10. Iconography and Graphics

- Use one consistent monoline icon family with simple geometric construction.
- Default stroke width should appear consistent at `20px` and `24px` sizes.
- Icons must support labels; unlabeled icons are limited to universally understood actions.
- Directional icons such as arrows and chevrons must mirror in RTL when their meaning is directional.
- Non-directional icons such as download, search, document, phone, and warning must not mirror.
- Avoid generic industry clichés: gears, random hexagons, sparks, excessive isometric factories, and decorative circuit patterns.
- Technical graphics may reference steel sections, document control, checklists, supply paths, and coordinated milestones.
- Decorative linework must never imply fabricated engineering data.

## 11. Logo Application in the Interface

- Use only approved master assets and lockups.
- Never redraw the symbol with CSS, a font, or a third-party icon.
- Never change the A-frame, centered diamond, stroke, proportions, alignment, or internal spacing.
- Never add shadows, bevels, textures, gradients, outlines, or animation to the master mark.
- Use the horizontal lockup in the main website header unless the approved responsive asset specification says otherwise.
- Use the icon-only asset for favicon, compact mobile contexts, and approved app icons.
- Use the inverted white version on Steel Navy surfaces.
- Do not place the logo directly on complex photography without an approved solid or controlled overlay surface.
- Define `x` as approximately `22.5%` of the icon height and preserve at least `1x` clear space on every side.
- Minimum digital size is `24px` high for the icon-only asset and `120px` wide for the full horizontal lockup. Below the full-lockup minimum, use the icon-only asset.
- The approved master vector remains authoritative if a written construction value ever differs from the production asset.

## 12. Motion System

Motion should reinforce confidence and continuity. It must feel precise, quiet, and intentional.

### 12.1 Duration tokens

```css
--aa-motion-duration-instant: 80ms;
--aa-motion-duration-fast: 160ms;
--aa-motion-duration-base: 240ms;
--aa-motion-duration-slow: 400ms;
--aa-motion-duration-reveal: 600ms;
```

### 12.2 Easing tokens

```css
--aa-motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
--aa-motion-ease-enter: cubic-bezier(0, 0, 0, 1);
--aa-motion-ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

### 12.3 Motion rules

- Button, link, border, and color transitions: `160–240ms`.
- Menu, accordion, and disclosure transitions: `200–300ms`.
- Optional section reveal: maximum `600ms`, small opacity and translate change only.
- Do not animate layout dimensions when a transform or discrete state is clearer.
- Never animate essential content so that it remains hidden if JavaScript fails.
- Avoid parallax, cursor-following effects, continuous loops, dramatic page wipes, and loading theatrics.
- Motion must not delay navigation or form submission.
- If motion is needed, the approved logo asset may only fade or scale uniformly as one intact unit. Never animate, separate, redraw, rotate, or reassemble its parts.

### 12.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The final implementation must preserve state clarity when motion is removed.

## 13. Interaction States

Every interactive component must define:

- Default
- Hover, where supported
- Focus-visible
- Active/pressed
- Disabled
- Loading, when an asynchronous action exists
- Success, when confirmation is relevant
- Error, when recovery is relevant

### 13.1 Focus-visible

- Focus must never be removed without an accessible replacement.
- Default focus uses a `2px` Copper outline plus adequate offset or the approved focus shadow.
- Focus must remain visible on light, Navy, and Copper surfaces.
- Focus order must follow the semantic reading and action order in RTL.

### 13.2 Disabled state

- Disabled controls must remain legible and visually distinct.
- Do not use opacity alone to communicate disabled state.
- Do not disable a submit action without explaining what is missing when the reason is not obvious.

### 13.3 Loading state

- Preserve component dimensions while loading.
- Use clear text such as the Persian equivalent of “Sending…” where action feedback matters.
- Prevent duplicate submissions.
- A spinner must include an accessible status label.
- Skeletons may represent pending repeatable content but must not simulate fake data or metrics.

## 14. Core Components

This section defines behavior and intent. `UI_COMPONENTS.md` may later add exact APIs, variants, and examples without contradicting these rules.

### 14.1 Button

Variants:

| Variant | Use | Visual contract |
|---|---|---|
| Primary | Default main action | Navy background, white label |
| Conversion accent | Highest-value inquiry action, used selectively | Copper background, white label |
| Secondary | Lower-priority action | White/transparent surface, Navy border and label |
| Ghost | Local, low-emphasis action | Transparent surface, Navy label |
| Destructive | Confirmed destructive action only | Danger color, never Copper |

Rules:

- Minimum height: `44px`; preferred desktop height: `48px`.
- Minimum horizontal padding: `20px`.
- Use concise action labels; avoid vague “Click here” copy.
- Maximum one dominant button—Primary or Conversion accent—per action group.
- The Copper conversion-accent variant must not become the default for every button or section.
- Icon placement follows reading direction and meaning, not a hard-coded physical side.
- Loading state retains the label context and button width.
- Links styled as buttons must navigate; buttons must perform actions.

### 14.2 Text link

- Default inline link uses a visible underline or another persistent non-color cue.
- Hover may strengthen underline or color.
- External links need accessible indication when opening a new context.
- Do not use Copper for noninteractive decorative text that resembles a link.

### 14.3 Icon button

- Minimum target: `44 × 44px`.
- Must have an accessible name.
- Tooltip is supplementary and must not be the only label.
- Use only for familiar actions such as close, search, download, or navigation control.

### 14.4 Input and textarea

- Label is always visible above the field; placeholders are examples, not labels.
- Minimum control height: `48px`.
- Use logical text alignment and set `dir="ltr"` only for genuinely LTR values such as email, phone, URL, and codes.
- Required status must be communicated in text and programmatically.
- Help text appears before error text in the information hierarchy.
- Error state includes icon or text, border change, and a specific recovery message.
- Preserve user input after validation or server errors.
- Textarea supports manual vertical resize unless layout requirements prohibit it.

### 14.5 Select, checkbox, and radio

- Native controls are preferred when they satisfy the experience.
- Custom controls must reproduce full keyboard and assistive-technology behavior.
- Checkbox is for independent choices; radio is for one choice in a group.
- The entire visible label area should activate the control.
- Selected state must not rely on color alone.

### 14.6 File upload

- Clearly state allowed file types, maximum size, quantity, and privacy conditions before upload.
- Provide browse and drag-and-drop where appropriate; browse must always work.
- Show filename, progress, success, error, and removal controls.
- Never imply that a file is secure, retained, or deleted unless the actual workflow supports the claim.
- Production upload must remain disabled until storage, privacy, retention, malware scanning, and lead handoff are approved.

### 14.7 Form

- Group related fields with `fieldset` and `legend` where appropriate.
- Use one clear primary submission action.
- Validate on submit and, when helpful, after a field loses focus; do not show errors while the user is still typing an incomplete value.
- Move focus to the error summary after a failed submission when multiple errors exist.
- Connect every error to its field programmatically.
- Confirmation must state what happened and what the user should expect next without inventing a response SLA.
- Always provide a tested failure and retry path.

### 14.8 Card

Approved variants:

- Capability card
- Process card
- Evidence/case card
- Resource card
- Contact-method card
- Technical note card

Rules:

- Default surface is white with a subtle border.
- Cards must not be nested more than one level.
- Entire-card links require one semantic link with clear focus treatment; do not create conflicting nested links.
- Do not use cards when a simple list, editorial section, table, or definition layout communicates better.
- Avoid repetitive rows of visually identical cards on the homepage.

### 14.9 Badge and tag

- Use for verified category, document type, process stage, or status.
- Do not use promotional badges such as “Best,” “No. 1,” or “Guaranteed” without evidence and approval.
- Status must include text, not color alone.
- Use pill radius only for compact tags and statuses.

### 14.10 Alert and callout

Variants: information, success, warning, error, and neutral technical note.

- Each uses a semantic icon, title when needed, and concise action guidance.
- Alerts must not use brand Copper as a substitute for warning or error semantics.
- Dismissible alerts require a labeled close control and must not hide critical unrecoverable information.

### 14.11 Accordion

- Use for FAQs or secondary detail, never to hide essential primary-page content.
- Trigger is a semantic button with `aria-expanded` and `aria-controls`.
- The full trigger row is clickable.
- Directional chevron mirrors correctly in RTL.
- Content remains available without motion.
- FAQ schema must reflect visible content exactly and must be added only when SEO specifications approve it.

### 14.12 Tabs

- Use only when panels are peer views of the same context.
- Do not use tabs as primary page navigation.
- Support arrow-key navigation according to the selected ARIA pattern.
- On narrow screens, reflow, scroll with clear affordance, or convert to a disclosure pattern.
- Deep-link or preserve active state when the content is important.

### 14.13 Breadcrumb

- Use on inner pages with more than one hierarchy level.
- Render inside a labeled `nav` and an ordered list.
- The current page is text, not a link.
- Separators are decorative and hidden from assistive technology.
- Separator direction must work in RTL.

### 14.14 Table and comparison matrix

- Use real table markup for tabular data.
- Provide a caption or visible contextual heading.
- Define column and row headers correctly.
- Align numeric content consistently and isolate bidirectional values.
- Do not encode meaning by background color alone.
- Sticky headers may be used for long verified datasets.
- On small screens, preserve semantics through controlled horizontal scrolling or a documented row-to-card transformation.

### 14.15 Modal and dialog

- Use only for focused decisions or short tasks that should not become a page.
- Trap focus while open and restore it to the trigger on close.
- Support Escape unless closing would cause unsafe data loss; in that case provide an explicit warning.
- Lock background scrolling without causing layout shift.
- A long RFQ or complex procurement workflow should be a page, not a modal.

### 14.16 Tooltip

- Supplement unfamiliar technical terms or controls.
- Must work with hover and keyboard focus.
- Must not contain essential instructions, complex interaction, or primary calls to action.
- Must not replace visible labels.

### 14.17 Pagination

- Use real links for indexable content collections.
- Include previous and next labels, not icons alone.
- Clearly identify the current page.
- Do not use infinite scroll for primary resource, insight, project, or evidence archives.

## 15. Navigation Components

### 15.1 Header

- Default header is calm, spacious, and visually light.
- Use the approved horizontal logo lockup.
- Show the primary navigation and one high-value CTA; avoid multiple competing header actions.
- Desktop navigation begins only when labels fit without compression.
- Sticky behavior is optional; if used, it must not consume excessive viewport height or create constant motion.
- The header must remain usable at `200%` zoom.

### 15.2 Desktop navigation

- Use clear Persian labels based on user tasks and information architecture.
- Dropdowns open through accessible button behavior, not hover alone.
- Menus must remain within the viewport and support keyboard traversal.
- A mega menu is justified only when the approved sitemap requires grouped navigation.

### 15.3 Mobile navigation

- Use a labeled menu button with correct expanded state.
- Preserve a logical reading order and visible close action.
- Do not hide the primary inquiry path behind multiple nested levels.
- Avoid full-screen visual effects that delay access to links.
- Ensure focus containment and restoration when implemented as an overlay.

### 15.4 Footer

- Reinforce brand role, primary navigation, contact routes, legal links, and approved trust information.
- Do not turn the footer into a keyword dump.
- Do not publish unverified addresses, registrations, certifications, service areas, or partner logos.
- Use the inverted logo only on an approved Navy surface.

## 16. Page-Level Patterns

### 16.1 Hero

The default hero contains:

1. Optional concise eyebrow
2. One clear `h1`
3. Short value proposition
4. One primary and at most one secondary action
5. Approved visual or evidence element

Rules:

- The first viewport must explain what Ahan Asa does and who it serves.
- Avoid abstract slogans without service context.
- Do not use autoplay video by default.
- Do not place critical text inside an image.
- Hero height follows content; full-screen height is not required.
- The slogan “ما مراقب سرمایه شما هستیم.” may support the value proposition but must not replace a clear category explanation.

### 16.2 Section header

- Optional eyebrow, one heading, and a concise introduction.
- Align by default to the reading start edge.
- Centered section headers are limited to short ceremonial or closing sections.
- Keep introduction width controlled for scanning.

### 16.3 Procurement process

- Use a numbered sequence with explicit stage names and outcomes.
- Show responsibility and boundaries where approved.
- Reading and progression flow follows RTL in Persian.
- On mobile, convert to a vertical sequence without losing numbering or relationships.
- Never imply automated, guaranteed, or active services not yet operationally verified.

### 16.4 Trust and evidence

Evidence hierarchy:

1. Verified project or procurement case
2. Approved sample document or methodology
3. Verified credential, certification, or client approval
4. Transparent process explanation
5. Approved testimonial

If evidence is unavailable, use process clarity and honest operating principles. Do not substitute invented counters, anonymous praise, stock partner logos, or vague claims.

### 16.5 Case study / evidence card

Preferred fields when verified:

- Project or procurement context
- Location and date
- Material or scope
- Client challenge
- Ahan Asa role
- Procurement response
- Verified outcome
- Supporting document or image

Omit unknown fields. Never display placeholder numbers as if they were real.

### 16.6 CTA band

- Use after the visitor has received enough context to act.
- Include one clear next step and concise reassurance.
- Use Navy as the preferred dark CTA surface. On Navy, prefer a White button with Navy text; reserve Copper for a small accent or an explicitly tested conversion treatment.
- Do not repeat the same CTA band after every section.

### 16.7 Empty and unavailable states

- Explain the state honestly and offer the next useful action.
- Never fill an empty project/resource area with fabricated content.
- Use “coming soon” only when a real publication plan exists.
- Technical failure messages must not expose secrets, stack traces, or internal systems.

## 17. Media and Image Treatment

- Prioritize real steel, procurement, documentation, inspection, loading, logistics, project, and technical coordination imagery.
- Photography should feel architectural, documentary, controlled, and credible.
- Do not use stock images that imply Ahan Asa owns a factory, warehouse, fleet, inventory, or team it does not own.
- Avoid generic handshakes, staged hard-hat portraits, glowing digital steel, and implausible AI industrial scenes.
- Use aspect-ratio tokens to keep layouts stable: `16:9`, `4:3`, `3:2`, `1:1`, and editorial portrait where justified.
- Provide meaningful alternative text for informative images and empty alternative text for decorative images.
- Captions should clarify verified context, not repeat visible content.
- Use responsive image sizing, modern formats, explicit dimensions, and lazy loading below the fold.
- Do not apply heavy color overlays or filters that distort evidence.

## 18. RTL, LTR, and Bidirectional Content

### 18.1 Direction rules

- Set `lang="fa"` and `dir="rtl"` at the document root for Persian.
- Future locales must set their own root language and direction.
- Use CSS logical properties: `margin-inline`, `padding-block`, `inset-inline-start`, `border-start-start-radius`, and logical text alignment.
- Do not maintain separate RTL and LTR component implementations.
- Layout source order must remain logical; do not visually reverse inaccessible DOM order.

### 18.2 Mixed-direction values

Use `dir="ltr"` and `unicode-bidi: isolate` for:

- Phone numbers
- Email addresses
- URLs and domains
- Product standards and codes
- Latin project identifiers
- File names
- Dimensions and technical expressions when written in Latin syntax

Do not apply global LTR direction to an entire form row merely because one field contains an LTR value.

### 18.3 Icons and sequence

- Mirror arrows, chevrons, progress direction, and previous/next controls when their meaning depends on reading direction.
- Do not mirror logos, phone icons, download icons, search icons, media controls, or standard symbols.
- Persian process steps progress from the visual right toward the left on wide screens and from top to bottom on narrow screens.

## 19. Accessibility Requirements

The target is WCAG 2.2 AA for all public Phase 1 pages and flows.

### 19.1 Required baseline

- Semantic landmarks: header, nav, main, complementary where appropriate, and footer
- One clear page `h1` and sequential heading hierarchy
- Keyboard operation for every interactive control
- Visible focus indicator
- Skip link to main content
- Accurate accessible names and descriptions
- Form labels, instructions, errors, and success announcements
- Correct language and direction metadata
- Minimum text and non-text contrast
- Reflow at `320 CSS px` and `400%` zoom where applicable
- Target size of at least `24 × 24px`, with the system standard set to `44 × 44px` for primary controls
- Reduced-motion support
- No color-only meaning
- Captions/transcripts for meaningful video and audio
- Status messages announced without unexpected focus change

### 19.2 Visual accessibility

- Default body text must not be smaller than `16px`.
- Supporting copy below `14px` is prohibited except for nonessential legal or data annotations that remain readable.
- Text embedded in imagery is prohibited for essential information.
- Background photography must not compromise contrast.
- Focus states must be tested on every surface variant.

## 20. Content Density and Data Presentation

- Use progressive disclosure for complex procurement detail.
- Begin with decision-relevant summaries, then expose methods, specifications, and documents.
- Prefer definition lists for key-value project information.
- Prefer tables for real comparisons where aligned values matter.
- Prefer a process diagram only when sequence or responsibility is the core relationship.
- Avoid dashboards unless the underlying live, approved data and user need exist.
- Avoid decorative charts and unsupported percentage graphics.
- Every number must have a source, unit, timeframe, and approval status where relevant.

## 21. Performance Constraints

- Design for static-first rendering and resilient server-rendered core content.
- Do not require client JavaScript for reading navigation, page content, or SEO-critical text.
- Use client components only for genuine interaction.
- Reserve image and media dimensions to prevent layout shift.
- Avoid large animation libraries for simple transitions.
- Do not ship a general icon package when a small approved subset is sufficient.
- Limit initial font payload and avoid redundant weights.
- Above-the-fold media must have an explicit loading strategy.
- Component visual quality must not depend on expensive blur, video, or continuous animation.

Release targets will be finalized in `PERFORMANCE_GUIDELINES.md`; until then, designs must aim for Core Web Vitals in the “good” range on representative mobile hardware and networks.

## 22. Design Token Starter Contract

The following starter block may be implemented centrally. It is a contract, not permission to bypass later specialized documents.

```css
:root {
  --aa-color-brand-navy-900: #0B2545;
  --aa-color-brand-copper-600: #B04A2F;
  --aa-color-white: #FFFFFF;
  --aa-color-brand-cream-50: #FBF5EB;

  --aa-color-neutral-950: #101828;
  --aa-color-neutral-800: #1D2939;
  --aa-color-neutral-700: #344054;
  --aa-color-neutral-600: #475467;
  --aa-color-neutral-500: #667085;
  --aa-color-neutral-300: #D0D5DD;
  --aa-color-neutral-200: #EAECF0;
  --aa-color-neutral-100: #F2F4F7;
  --aa-color-neutral-50: #F9FAFB;

  --aa-color-bg-canvas: var(--aa-color-white);
  --aa-color-bg-subtle: var(--aa-color-neutral-50);
  --aa-color-bg-warm: var(--aa-color-brand-cream-50);
  --aa-color-bg-muted: var(--aa-color-neutral-100);
  --aa-color-bg-inverse: var(--aa-color-brand-navy-900);
  --aa-color-text-primary: var(--aa-color-neutral-950);
  --aa-color-text-secondary: var(--aa-color-neutral-600);
  --aa-color-text-tertiary: var(--aa-color-neutral-500);
  --aa-color-text-brand: var(--aa-color-brand-navy-900);
  --aa-color-text-accent: var(--aa-color-brand-copper-600);
  --aa-color-text-inverse: var(--aa-color-white);
  --aa-color-border-subtle: var(--aa-color-neutral-200);
  --aa-color-border-strong: var(--aa-color-neutral-300);
  --aa-color-action-primary-bg: var(--aa-color-brand-navy-900);
  --aa-color-action-primary-text: var(--aa-color-white);
  --aa-color-action-accent-bg: var(--aa-color-brand-copper-600);
  --aa-color-action-accent-text: var(--aa-color-white);
  --aa-color-action-secondary-bg: var(--aa-color-white);
  --aa-color-action-secondary-text: var(--aa-color-brand-navy-900);
  --aa-color-action-secondary-border: var(--aa-color-brand-navy-900);

  --aa-font-family-fa: "Estedad Variable", "Vazirmatn", Tahoma, sans-serif;
  --aa-font-family-latin: "Montserrat Variable", Arial, sans-serif;
  --aa-font-weight-regular: 400;
  --aa-font-weight-medium: 500;
  --aa-font-weight-semibold: 600;
  --aa-font-weight-bold: 700;

  --aa-space-1: 0.25rem;
  --aa-space-2: 0.5rem;
  --aa-space-3: 0.75rem;
  --aa-space-4: 1rem;
  --aa-space-5: 1.25rem;
  --aa-space-6: 1.5rem;
  --aa-space-8: 2rem;
  --aa-space-10: 2.5rem;
  --aa-space-12: 3rem;
  --aa-space-16: 4rem;
  --aa-space-20: 5rem;
  --aa-space-24: 6rem;
  --aa-space-32: 8rem;

  --aa-radius-xs: 0.25rem;
  --aa-radius-sm: 0.5rem;
  --aa-radius-md: 0.75rem;
  --aa-radius-lg: 1rem;
  --aa-radius-xl: 1.5rem;
  --aa-radius-pill: 999px;

  --aa-shadow-xs: 0 1px 2px rgb(16 24 40 / 0.05);
  --aa-shadow-sm: 0 4px 12px rgb(16 24 40 / 0.07);
  --aa-shadow-md: 0 12px 32px rgb(16 24 40 / 0.10);
  --aa-shadow-focus: 0 0 0 4px rgb(176 74 47 / 0.20);

  --aa-motion-duration-instant: 80ms;
  --aa-motion-duration-fast: 160ms;
  --aa-motion-duration-base: 240ms;
  --aa-motion-duration-slow: 400ms;
  --aa-motion-duration-reveal: 600ms;
  --aa-motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --aa-motion-ease-enter: cubic-bezier(0, 0, 0, 1);
  --aa-motion-ease-exit: cubic-bezier(0.3, 0, 1, 1);

  --aa-container-max: 80rem;
  --aa-reading-max: 46rem;
  --aa-page-gutter: clamp(1rem, 3vw, 2rem);
}
```

## 23. Implementation Rules for Claude Code

Before creating or changing any interface, Claude Code must:

1. Read `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, this document, and any approved page specification relevant to the task.
2. Identify unresolved dependencies and `TBD` production data.
3. Reuse an existing token or component before creating a new one.
4. Preserve the approved logo assets and brand colors.
5. Implement Persian semantics and RTL behavior first, then verify direction-safe future LTR behavior.
6. Use real semantic HTML before adding ARIA.
7. Keep SEO-critical content server-rendered and accessible without client-side interaction.
8. Test keyboard, focus, contrast, loading, empty, error, and narrow-screen states.
9. Avoid introducing claims, metrics, prices, projects, contact data, or integrations not present in approved source data.
10. Record any approved system-level exception in `DECISIONS.md`.

Claude Code must not:

- Redesign, trace, recreate, deform, separate, or alter the master logo; only an intact fade or uniform scale is permitted
- Add colors to the brand identity without approval
- Use Copper as a dominant page background
- Create fake live-price tickers, dashboards, inventory states, or commercial urgency
- Introduce consumer shopping patterns into Phase 1
- Use raw colors and arbitrary spacing inside components
- Duplicate a component for RTL and LTR
- hide essential content behind animation, hover, accordions, or JavaScript
- Add libraries solely for a minor effect that can be achieved natively
- Resolve material document conflicts silently

## 24. Component Acceptance Checklist

A component is complete only when all applicable items pass:

- [ ] Uses approved semantic tokens
- [ ] Has a clear, reusable purpose
- [ ] Uses semantic HTML
- [ ] Works in Persian RTL
- [ ] Remains structurally safe for future LTR
- [ ] Works at `320px` and through the approved responsive range
- [ ] Supports keyboard interaction
- [ ] Shows a visible `:focus-visible` state
- [ ] Meets color-contrast requirements
- [ ] Has default, hover, focus, active, disabled, loading, error, and success states as applicable
- [ ] Does not rely on hover or color alone
- [ ] Handles long Persian text and real content variation
- [ ] Handles empty, missing, and error data honestly
- [ ] Does not introduce unverified business claims or evidence
- [ ] Avoids unnecessary client-side JavaScript
- [ ] Does not cause unexpected layout shift
- [ ] Respects reduced-motion preferences
- [ ] Includes automated and manual tests appropriate to its risk
- [ ] Is documented when its usage is not self-evident

## 25. Page Acceptance Checklist

A page is ready for QA only when:

- [ ] The first screen communicates the page purpose and Ahan Asa's role clearly
- [ ] Heading hierarchy is valid and there is one page `h1`
- [ ] Primary and secondary actions follow the approved hierarchy
- [ ] The layout uses approved container, grid, spacing, and type tokens
- [ ] No placeholder claim, metric, project, logo, price, or contact detail appears as real
- [ ] All media is approved, optimized, dimensioned, and described appropriately
- [ ] RTL, mixed-direction content, tables, forms, and icons are correct
- [ ] Keyboard and screen-reader paths are coherent
- [ ] Error, empty, loading, and success states are covered
- [ ] Content reflows without loss or horizontal page scrolling
- [ ] SEO-critical content is present in server-rendered HTML
- [ ] Motion is optional, restrained, and reduced-motion safe
- [ ] Primary conversion works and has a tested fallback

## 26. Explicitly Deferred Decisions

The system must not guess the following:

- Final outlined Persian wordmark asset and its exact lockup measurements
- Final Estedad font files, licenses, subsets, and loading configuration
- Final English/Arabic typography pairings for future locales
- Dark mode; no dark-mode theme is approved for Phase 1
- Exact navigation model pending `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md`
- Exact component APIs pending `UI_COMPONENTS.md` and technical architecture
- Exact form fields, upload behavior, consent, storage, and lead integration
- Exact material categories, projects, client proof, metrics, service area, and contact data
- Analytics, CRM/Odoo, messaging, and consent implementation
- Final performance budgets and automated QA tooling

Until approved, implementations should use honest structural placeholders in development only and must not expose them as production facts.

## 27. Definition of Done for This Design System

This document becomes **Approved** when the project owner confirms:

- The brand-to-interface translation is accurate.
- The token architecture and starter values are accepted.
- The color, typography, spacing, layout, shape, and motion principles are accepted.
- The core component behaviors match the intended premium B2B procurement experience.
- RTL, accessibility, performance, evidence, and implementation constraints are accepted.
- Deferred decisions are assigned to their specialized documents or explicitly postponed.

Until approval, this document is an authoritative working draft. Confirmed rules may guide implementation, but unresolved decisions must not be converted into production assumptions.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| UX/UI Approval | TBD | Pending | — |
| Frontend Approval | TBD | Pending | — |
| Accessibility Review | TBD | Pending | — |
