# Ahan Asa Responsive Rules

**File:** `RESPONSIVE_RULES.md`  
**Project:** Ahan Asa (`آهن آسا`)  
**Status:** Normative implementation standard  
**Primary locale:** Persian (`fa-IR`, RTL)  
**Applies to:** All public pages, forms, navigation, account-independent flows, and reusable UI components

---

## 1. Purpose

This document defines the responsive behavior of the Ahan Asa website. It is a source of truth for design and implementation decisions across mobile, tablet, laptop, and large desktop viewports.

Claude Code must follow these rules when creating or modifying any page or component. A component is not complete until it has been verified at the required viewport sizes, in RTL, at 200% browser zoom, and with real Persian content.

Responsive design must preserve the brand character at every size:

- precise, controlled, and trustworthy;
- premium but not decorative;
- industrial and technical without visual heaviness;
- calm, spacious, and easy to scan;
- conversion-focused for quotation and procurement requests.

---

## 2. Core Principles

1. **Mobile first:** Base styles target the smallest supported viewport. Add complexity only when space allows.
2. **Content first:** Never hide essential information merely to make a layout fit.
3. **Fluid before fixed:** Prefer flexible grids, `minmax()`, percentages, and `clamp()` over rigid pixel dimensions.
4. **Few intentional breakpoints:** Use only the breakpoint tokens defined here. Do not add component-specific media queries unless a documented content collision requires one.
5. **RTL native:** Persian pages must be designed as RTL interfaces, not visually mirrored LTR pages.
6. **No horizontal page scroll:** At every supported viewport, the document must remain within the viewport width.
7. **Readable line lengths:** Text width must be controlled independently from the visual container width.
8. **Stable hierarchy:** The order and priority of information must remain consistent across viewports.
9. **Touch ready:** All interactive controls must work comfortably by touch, mouse, and keyboard.
10. **Progressive enhancement:** Core content and actions must remain usable if animation, hover, or nonessential JavaScript is unavailable.

---

## 3. Supported Range

The website must support:

- viewport widths from **320px to 2560px**;
- portrait and landscape mobile orientations;
- browser zoom up to **200%** without loss of content or functionality;
- text-only zoom or increased OS font size;
- touch, mouse, keyboard, and hybrid input devices;
- modern versions of Chrome, Edge, Firefox, and Safari;
- iOS Safari and Android Chrome;
- notched devices using safe-area insets.

Below 320px, preserve content access and avoid destructive overlap, but pixel-perfect layout is not required.

---

## 4. Breakpoint System

Use mobile-first `min-width` media queries.

| Token | Minimum width | Intended use |
|---|---:|---|
| `base` | `0px` | Small mobile and default rules |
| `sm` | `480px` | Large mobile and compact two-column opportunities |
| `md` | `768px` | Tablet portrait and expanded navigation/content |
| `lg` | `1024px` | Tablet landscape and laptop layouts |
| `xl` | `1280px` | Standard desktop layouts |
| `2xl` | `1440px` | Wide desktop; container grows, content density does not |

### Breakpoint rules

- Do not design for device names or specific hardware models.
- A breakpoint must respond to content pressure, not an arbitrary screenshot target.
- Do not use `max-width` queries for primary layout architecture.
- Prefer container queries for reusable components whose behavior depends on their own available width.
- Do not introduce breakpoints such as `390px`, `834px`, or `1366px` unless a real collision is documented in code comments and approved in the design system.
- At widths above `1440px`, increase surrounding whitespace rather than endlessly stretching text, cards, or media.

Recommended CSS custom media equivalents, if the project tooling supports them:

```css
@custom-media --sm (min-width: 30rem);   /* 480px */
@custom-media --md (min-width: 48rem);   /* 768px */
@custom-media --lg (min-width: 64rem);   /* 1024px */
@custom-media --xl (min-width: 80rem);   /* 1280px */
@custom-media --2xl (min-width: 90rem);  /* 1440px */
```

If Tailwind CSS is used, its screen configuration must be aligned with these values. Do not rely on conflicting framework defaults.

---

## 5. Page Containers and Gutters

### Container tokens

```css
:root {
  --page-gutter: 1rem;
  --content-max: 90rem;
  --reading-max: 44rem;
  --form-max: 42rem;
}

@media (min-width: 30rem) {
  :root { --page-gutter: 1.25rem; }
}

@media (min-width: 48rem) {
  :root { --page-gutter: 2rem; }
}

@media (min-width: 80rem) {
  :root { --page-gutter: 3rem; }
}
```

### Standard container

```css
.page-container {
  width: min(100% - (2 * var(--page-gutter)), var(--content-max));
  margin-inline: auto;
}
```

### Rules

- Global content maximum: **1440px**.
- Editorial or reading content maximum: **704px**.
- Long-form body text should normally occupy **45–75 Persian characters per line**.
- Forms should normally have a maximum width of **672px** unless a split layout is intentionally used.
- Full-bleed media may reach the viewport edges, but captions and controls must align with the page container.
- Never apply horizontal page padding both to a section and its nested standard container.
- Use `margin-inline`, `padding-inline`, `inset-inline`, and other logical properties.

---

## 6. Responsive Grid

Use CSS Grid for page-level composition.

| Viewport | Columns | Gutter | Typical use |
|---|---:|---:|---|
| `base` | 4 | 16px | One-column content |
| `sm` | 4 | 20px | One column or compact 2-up items |
| `md` | 8 | 24px | Two-column content and side panels |
| `lg` and above | 12 | 24–32px | Full editorial and technical layouts |

```css
.layout-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 48rem) {
  .layout-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 1.5rem;
  }
}

@media (min-width: 64rem) {
  .layout-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1.5rem, 2vw, 2rem);
  }
}
```

Grid children must use `min-width: 0` when they contain long text, tables, images, or flex children.

---

## 7. Spacing and Section Rhythm

Use fluid section spacing rather than separate arbitrary values for every breakpoint.

```css
:root {
  --section-space-sm: clamp(2.5rem, 5vw, 4.5rem);
  --section-space-md: clamp(4rem, 8vw, 7rem);
  --section-space-lg: clamp(5rem, 10vw, 10rem);
}
```

Rules:

- Standard page section: `--section-space-md`.
- Hero or major brand transition: `--section-space-lg`.
- Closely related subsections: `--section-space-sm`.
- Do not reduce all mobile spacing to the same small value; hierarchy must remain visible.
- Vertical rhythm may scale fluidly. Border radii, stroke weights, and icon stroke widths generally must not scale.

---

## 8. Fluid Typography

Typography must scale smoothly and preserve Persian readability.

| Token | Fluid size | Suggested line height |
|---|---|---:|
| `display-xl` | `clamp(2.5rem, 6vw, 5.5rem)` | `1.08` |
| `display-lg` | `clamp(2.125rem, 4.5vw, 4.25rem)` | `1.12` |
| `heading-1` | `clamp(2rem, 4vw, 3.5rem)` | `1.18` |
| `heading-2` | `clamp(1.625rem, 3vw, 2.75rem)` | `1.25` |
| `heading-3` | `clamp(1.375rem, 2vw, 2rem)` | `1.35` |
| `body-lg` | `clamp(1.0625rem, 1.2vw, 1.25rem)` | `1.9` |
| `body` | `clamp(0.9375rem, 0.5vw + 0.85rem, 1.0625rem)` | `1.9` |
| `body-sm` | `clamp(0.8125rem, 0.3vw + 0.76rem, 0.9375rem)` | `1.8` |

### Typography rules

- Do not use a body font size below **15px** for primary content.
- Utility text may use **13px** only when nonessential and still legible.
- Do not reduce a heading until it merely fits one line. Allow natural wrapping.
- Persian headlines must use balanced manual or CSS wrapping only when it does not alter the copy.
- Avoid widows consisting of a single short Persian word where practical.
- Never truncate primary headings, service names, product names, or quotation details.
- Limit truncation to explicitly secondary list metadata, and provide the full value accessibly.
- Use `font-variant-numeric: tabular-nums` for prices, quantities, weights, and comparison data where supported.
- Large Latin strings, email addresses, URLs, SKUs, and steel standards must wrap safely with `overflow-wrap: anywhere` when needed.

---

## 9. RTL, LTR, and Bidirectional Content

The Persian experience is RTL at the document level:

```html
<html lang="fa" dir="rtl">
```

Rules:

- Use CSS logical properties; do not hard-code `left` or `right` for layout intent.
- Flow navigation, icon/text pairs, breadcrumbs, pagination, and step indicators according to the document direction.
- Do not mirror brand marks, universal media icons, download icons, checkmarks, or product photography.
- Directional arrows must communicate actual movement. Mirror them only when the meaning follows reading direction.
- Phone numbers, email addresses, URLs, reference codes, dimensions, standards, and mixed alphanumeric product labels must be isolated:

```css
.bidi-ltr {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: start;
}
```

- Numeric data must remain understandable when adjacent to Persian units.
- Form field order must follow task logic, not automatic mirroring. For a country-code and phone pair, keep the **country code visually on the left and the national number on the right** in both RTL and LTR interfaces.
- Test with realistic strings such as `IPE 240`, `ST37`, `12,500 kg`, `+98 912 000 0000`, and Persian project names.

---

## 10. Images, Video, and Technical Media

### General rules

- Images must use `width: 100%` and `height: auto` unless placed in an intentional cropped frame.
- Cropped media must use `object-fit: cover` and an explicit aspect ratio.
- Never stretch steel-product photography, technical drawings, certificates, or logos.
- Preserve the essential subject through responsive focal points or art-directed sources.
- Provide width and height attributes to prevent layout shift.
- Use responsive `srcset`/`sizes` or the framework's optimized image component.
- Do not download desktop-resolution hero media on small mobile screens.

### Recommended aspect ratios

| Media type | Mobile | Tablet/Desktop |
|---|---|---|
| Homepage hero | `4 / 5` or `1 / 1` | `16 / 9` to `21 / 9` |
| Editorial feature | `4 / 3` | `16 / 10` |
| Product/category card | `4 / 3` | `4 / 3` |
| Project gallery | natural or `4 / 3` | natural or `3 / 2` |
| Team/profile | `4 / 5` | `4 / 5` |

For technical drawings and documents:

- do not crop the drawing;
- fit the complete sheet inside the viewport;
- support pinch zoom or an explicit open/fullscreen action;
- keep download and document metadata available outside the media frame.

Video must be muted by default when autoplay is used, include controls when informational, and respect `prefers-reduced-motion` and data-saving conditions.

---

## 11. Navigation and Header

### Mobile: below `lg`

- Show logo, primary quotation action, and menu trigger in a compact header.
- Use an accessible full-height drawer or sheet for navigation.
- The drawer must fit within `100dvh`, scroll internally, and respect safe-area insets.
- Nested navigation opens as an accordion; do not depend on hover.
- Keep the primary CTA visible within the drawer without covering navigation items.
- Lock background scroll while the drawer is open and restore focus on close.

### Desktop: `lg` and above

- Show the full primary navigation when labels fit without collision.
- Dropdowns or mega menus must open by keyboard focus and pointer interaction.
- Avoid using a mega menu if the information architecture does not require it.
- Sticky headers may reduce height after scrolling, but must not cause a layout jump.

### Universal header rules

- Header controls must have at least a **44 × 44px** interactive area.
- The logo must never shrink below the minimum size defined in `BRAND_GUIDELINES.md`.
- At 200% zoom, desktop navigation may switch to its compact/mobile behavior.
- The header must never cover anchor targets; use `scroll-margin-block-start`.

---

## 12. Component Behavior

### 12.1 Buttons and CTA groups

- Minimum control height: **44px**; preferred primary CTA height: **48–52px**.
- On `base`, a primary/secondary CTA pair stacks vertically when labels cannot fit comfortably.
- From `sm`, CTA pairs may sit inline if each label remains unbroken and tap targets remain separate.
- Full-width mobile buttons are appropriate in forms, drawers, and strong conversion sections, not automatically everywhere.
- Never shrink button text below the type token to keep buttons inline.

### 12.2 Cards

- Use one column on `base`.
- Use two columns at `sm` or `md` only when the card's minimum useful width is preserved.
- Use three columns at `lg`; four columns only for compact, low-content card types at `xl`.
- Prefer intrinsic grids:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}
```

- Cards within one row may align actions, but fixed equal heights must not clip longer Persian content.

### 12.3 Forms

- One column on `base` and `sm`.
- Two columns may be used from `md` for short, related fields.
- Long-text fields, file upload, notes, company name, and project description span the full form width.
- Labels remain visible above fields; placeholders are not labels.
- Validation messages appear directly after their fields without overlaying content.
- The quotation flow must retain entered data through orientation changes and layout transitions.
- The virtual keyboard must not hide the focused field or submit action.
- Field groups must use logical source order; CSS must not create a misleading keyboard order.

### 12.4 Product specifications and data tables

Steel procurement data must remain exact and comparable.

- Do not transform every technical table into unrelated cards if cross-row comparison is important.
- For wide tables on mobile, place the table in a labelled horizontal scroll region with an obvious overflow cue.
- Keep the first identifying column sticky only if it remains readable and does not consume excessive width.
- Do not truncate grades, standards, dimensions, quantities, units, delivery terms, or pricing.
- Preserve header associations and semantic table markup.
- A stacked key/value layout is acceptable only for single-item specifications, not multi-item comparison.
- Numeric columns should use tabular figures and consistent alignment.

### 12.5 Tabs and segmented controls

- Tabs may scroll horizontally on mobile; do not compress labels into unreadable widths.
- The active tab must remain visible when selected.
- Use an accordion instead when panels are long and users benefit from seeing multiple headings vertically.
- Do not change content order between tabs and mobile accordion forms.

### 12.6 Breadcrumbs

- Preserve the current page and its immediate parent.
- Earlier ancestors may collapse into an accessible overflow item on narrow screens.
- Breadcrumbs may wrap to two lines; do not create horizontal page overflow.

### 12.7 Modal, dialog, and drawer

- On mobile, use a bottom sheet or near-fullscreen dialog when the task contains more than a brief confirmation.
- On desktop, constrain dialog width according to content; never exceed the page gutter.
- Maximum height: viewport minus safe areas and gutters; overflow scrolls inside the dialog.
- Keep the title and close control visible.
- Do not place essential actions beneath browser UI or notches.

### 12.8 Carousels and galleries

- Do not require carousels for essential content.
- Provide visible next/previous controls on desktop and swipe support on touch devices.
- Show a partial next item on mobile only when it intentionally communicates scrollability.
- Pause automatic movement on interaction and disable it for reduced-motion users.
- Preserve keyboard access and announce slide position appropriately.

### 12.9 Toasts and notifications

- On mobile, position notifications above safe-area and sticky-action regions.
- Limit width to the viewport minus page gutters.
- Notifications must not cover form errors, navigation, or the active submit control.

---

## 13. Page-Level Patterns

### 13.1 Hero sections

- `base` and `sm`: content precedes supporting media unless the media is essential context.
- `md`: use stacked or asymmetric layouts according to content length.
- `lg` and above: a 5/7 or 6/6 split is preferred for text/media compositions.
- The primary CTA must remain visible without depending on hover.
- Do not force all mobile hero content into the first viewport at the expense of readability.
- Avoid fixed viewport heights. Use `min-height` only when it adds value and prefer `svh`/`dvh` units carefully.

### 13.2 Service and procurement category pages

- Category introduction uses a single readable text column on mobile.
- Filters open in a drawer or disclosure panel below `lg`.
- At `lg`, filters may become a sidebar if the result area retains adequate width.
- Applied filters and result count stay visible and understandable at all sizes.
- Switching layouts must not reset filter state.

### 13.3 Product/detail pages

- Mobile source order: title/status → essential summary → media → key specifications → CTA → supporting detail.
- Desktop may place media and commercial summary side by side.
- A sticky quotation summary is permitted from `lg` only if it never obscures footer or content.
- On mobile, use a restrained sticky bottom CTA only for a single high-priority action and reserve space so content is not hidden.

### 13.4 Request-for-quotation flow

- Present one clear task per screen or section on mobile.
- Show progress without consuming excessive vertical space.
- Summary and review tables must adapt without losing quantities or units.
- Upload controls must work without drag-and-drop.
- The final submit action must not move unexpectedly while validation messages appear.

### 13.5 Editorial and trust pages

- Body copy uses `--reading-max` even on very wide screens.
- Supporting facts, pull quotes, certificates, or project evidence may break out into the wider grid.
- Side navigation becomes an inline table of contents or disclosure below `lg`.

### 13.6 Footer

- Mobile: stacked groups, with collapsible link groups allowed if all headings remain visible.
- `md`: two to three columns.
- `lg` and above: full multi-column layout aligned to the main grid.
- Legal and company information must never be omitted on small screens.

---

## 14. Fixed, Sticky, and Viewport-Aware UI

- Prefer `position: sticky` over `fixed` when the behavior belongs to document flow.
- Account for header height, browser chrome, and safe-area insets.
- Use `100dvh` for interactive overlays and test Safari behavior; provide a reasonable fallback.
- Never stack multiple sticky elements so they consume more than **30% of the mobile viewport height**.
- Sticky elements must stop before overlapping the footer or related completion content.
- Anchor navigation must account for sticky header offset.
- Floating contact/WhatsApp actions, if approved elsewhere, must not compete with the primary quotation CTA or cover content.

Safe-area pattern:

```css
.mobile-action-bar {
  padding-block-end: max(0.75rem, env(safe-area-inset-bottom));
  padding-inline: max(var(--page-gutter), env(safe-area-inset-left));
}
```

---

## 15. Interaction Across Input Types

- Never make essential content accessible only on hover.
- Use `@media (hover: hover) and (pointer: fine)` for decorative hover effects.
- Keep focus styles visible on every viewport.
- Do not reorder DOM content solely for desktop visual composition.
- Swipe gestures must have button alternatives.
- Tooltips must work by focus and must not contain essential information.
- Drag-and-drop interactions need click/tap and keyboard alternatives.

---

## 16. Motion and Responsive Performance

Follow `MOTION_GUIDELINES.md`. Additionally:

- Reduce the number and distance of entrance animations on small screens.
- Do not use scroll-jacking, parallax that affects readability, or pinned sequences that trap mobile users.
- Disable nonessential continuous movement for `prefers-reduced-motion: reduce`.
- Avoid animating width, height, top, or left; favor opacity and transforms.
- Do not delay primary content or CTA availability for animation.
- Avoid autoplay background video on constrained networks or when data saving is enabled.

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

---

## 17. Responsive Performance Rules

- The mobile experience is the performance baseline, not a reduced-quality afterthought.
- Do not render hidden desktop and mobile duplicates simultaneously unless accessibility and performance impact has been assessed.
- Prefer CSS layout changes over JavaScript viewport checks.
- Avoid hydration-dependent layout decisions that cause content shift.
- Lazy-load below-the-fold media, but never lazy-load the primary LCP image.
- Set accurate responsive image `sizes` values based on actual grid spans.
- Reserve dimensions for images, video, maps, embeds, and async form messages.
- Load complex charts, maps, or document viewers only when requested or near the viewport.
- Large desktop screens must not automatically receive uncompressed source media.

---

## 18. CSS and Component Implementation Rules

- Build mobile base styles first.
- Use logical properties for direction-aware layout.
- Use design tokens; do not repeat arbitrary responsive values in components.
- Use `min()`, `max()`, and `clamp()` for fluid sizing when they improve continuity.
- Use `minmax(0, 1fr)` to prevent grid overflow.
- Use `min-width: 0` on flex and grid children that contain text or media.
- Avoid fixed heights for content containers.
- Use `aspect-ratio` for predictable media frames.
- Prefer CSS container queries for components used in both main content and sidebars.
- JavaScript must not be used solely to choose layout when CSS can do it.
- If JavaScript must observe a media query, use `matchMedia` and subscribe to changes rather than reading `window.innerWidth` once.
- SSR markup must remain stable across viewport widths to prevent hydration mismatch.

Recommended container-query pattern:

```css
.component-shell {
  container-type: inline-size;
}

@container (min-width: 36rem) {
  .component {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
```

---

## 19. Prohibited Patterns

Claude Code must not:

- create horizontal page scrolling at any supported width;
- use desktop-first layouts patched with many `max-width` exceptions;
- hide important copy, specifications, pricing context, or CTAs on mobile;
- change semantic source order to achieve a visual layout;
- hard-code Persian RTL alignment using physical `left`/`right` properties;
- use fixed-width cards or forms wider than the viewport;
- shrink text below readable minimums to prevent wrapping;
- crop technical documents or certification marks;
- use hover-only navigation or disclosure;
- place full tables directly in the page without an overflow strategy;
- duplicate major page sections for mobile and desktop without a strong documented reason;
- detect specific user-agent device models for layout;
- add unapproved breakpoint values;
- use `100vh` blindly for mobile overlays;
- allow sticky UI to cover content, validation messages, or the footer.

---

## 20. Required Test Matrix

Every new or materially changed page must be checked at these widths:

| Width | Representative condition |
|---:|---|
| `320px` | Minimum supported mobile |
| `375px` | Common narrow mobile |
| `430px` | Large mobile |
| `768px` | Tablet portrait / `md` boundary |
| `1024px` | Tablet landscape / `lg` boundary |
| `1280px` | Standard desktop / `xl` boundary |
| `1440px` | Wide desktop / `2xl` boundary |
| `1920px` | Large-screen whitespace and max-width behavior |

Also test **1px below and 1px above** any breakpoint directly involved in the changed component.

Required conditions:

- Persian RTL with realistic long content;
- at least one mixed Persian/Latin technical string;
- portrait and landscape mobile orientation;
- browser zoom at 200%;
- keyboard-only navigation;
- reduced-motion preference;
- touch emulation and fine-pointer interaction;
- slow network or throttled mobile profile for media-heavy pages;
- form validation with both short and long error messages;
- empty, loading, success, error, and long-content states.

---

## 21. Responsive QA Checklist

### Layout

- [ ] No horizontal page scrollbar appears from 320px to 2560px.
- [ ] Containers and gutters follow the defined tokens.
- [ ] Content does not stretch beyond readable line lengths.
- [ ] Grid transitions occur only at approved breakpoints.
- [ ] No content is clipped, overlapped, or hidden behind sticky UI.
- [ ] The page remains usable at 200% zoom.

### Typography and content

- [ ] Persian headings wrap naturally without collision.
- [ ] Body text remains at least 15px and comfortably spaced.
- [ ] Long Latin strings and technical codes do not break the layout.
- [ ] Essential information is present at every viewport size.
- [ ] Numbers, dimensions, units, and standards remain unambiguous.

### RTL and interaction

- [ ] Logical CSS properties are used for direction-aware layout.
- [ ] Icons and arrows are mirrored only when semantically correct.
- [ ] Mixed-direction content is isolated correctly.
- [ ] Focus order matches reading and task order.
- [ ] Touch targets meet the 44 × 44px minimum.
- [ ] Every hover interaction has a touch and keyboard equivalent.

### Components

- [ ] Navigation works without hover and is keyboard operable.
- [ ] Forms preserve values and show errors without layout failure.
- [ ] Tables remain readable and semantically correct.
- [ ] Dialogs and drawers fit within the dynamic viewport.
- [ ] Media uses correct aspect ratio, focal point, and responsive source.
- [ ] Sticky actions reserve document space and do not cover content.

### Performance and stability

- [ ] The LCP image is correctly sized and prioritized.
- [ ] Below-the-fold media is deferred appropriately.
- [ ] Image and embed dimensions prevent layout shift.
- [ ] Layout does not depend on a client-only viewport read.
- [ ] Reduced-motion mode removes nonessential motion.

---

## 22. Definition of Done

A responsive implementation is complete only when:

1. it passes the required viewport and state matrix;
2. it works with real Persian RTL content, not placeholder Latin text alone;
3. no essential content or action is lost at any supported size;
4. no horizontal document overflow exists;
5. touch targets, keyboard order, focus visibility, and zoom behavior are correct;
6. technical tables, dimensions, quantities, and mixed-direction strings remain accurate;
7. images are art-directed, correctly sized, and free from avoidable layout shift;
8. automated tests pass and key pages receive visual regression coverage;
9. any exception to this document is documented with a reason and approved before merge.

---

## 23. Claude Code Execution Instruction

Before modifying responsive behavior, Claude Code must:

1. read `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `UI_COMPONENTS.md`, `MOTION_GUIDELINES.md`, and this file;
2. identify the component's content priority and minimum usable width;
3. implement the mobile base state first;
4. add only the approved breakpoint transitions required by the content;
5. test the exact changed route at all relevant matrix widths;
6. report responsive changes, test results, and any documented exception in the task summary.

When two documents appear to conflict, the more component-specific rule controls unless it violates accessibility, content integrity, or the prohibited patterns in this document.

