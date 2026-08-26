# Ahan Asa Website — Motion & Micro-Interaction Guidelines

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `MOTION_GUIDELINES.md`  
> **Status:** Draft v1.0 — Implementation contract  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian (Farsi), fully RTL  
> **Motion thesis:** **Calm control, made visible**

---

## 1. Purpose

This document defines the motion language, micro-interaction behavior, timing tokens, accessibility rules, performance limits, and implementation requirements for the Ahan Asa website.

Motion must strengthen the approved positioning of Ahan Asa as a composed, precise, and protective steel procurement management partner. It must clarify hierarchy, confirm actions, explain relationships, and help users move through complex procurement information with confidence.

Motion is not a decorative layer. It is a functional part of the interface and must never:

- delay access to information;
- hide essential content;
- compete with procurement evidence;
- make the experience feel playful, urgent, speculative, or retail-oriented;
- weaken performance, accessibility, SEO, or layout stability;
- imply live data, progress, availability, or operational capability that does not exist.

This document is normative. The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate requirement strength.

---

## 2. Source Hierarchy

Motion decisions must follow this order unless `CLAUDE.md` defines a stricter hierarchy:

1. Approved owner decisions recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `DESIGN_SYSTEM.md`
6. `UI_COMPONENTS.md`
7. `MOTION_GUIDELINES.md`
8. Page-specific specifications
9. Task-specific implementation instructions

When a motion treatment conflicts with accessibility, usability, performance, or verified business truth, the motion treatment must be removed or simplified.

---

## 3. Motion Strategy

### 3.1 Core expression

The Ahan Asa motion system should feel:

- calm;
- controlled;
- deliberate;
- precise;
- protective;
- technically refined;
- premium through restraint;
- responsive without appearing hurried.

The system should not feel:

- bouncy;
- playful;
- theatrical;
- restless;
- game-like;
- aggressively sales-driven;
- mechanically animated;
- dependent on constant movement.

### 3.2 User value

Every animation must perform at least one of these jobs:

1. **Orient** — show where an element came from or where attention should move.
2. **Connect** — explain a relationship between a trigger and its result.
3. **Confirm** — acknowledge an input, selection, upload, or completed action.
4. **Prevent error** — make validation, disabled states, or boundaries understandable.
5. **Preserve continuity** — prevent abrupt context changes during navigation or disclosure.
6. **Prioritize** — reveal information in a controlled reading order.

If an animation performs none of these jobs, it should not be implemented.

### 3.3 Signature motion

Ahan Asa has two approved signature reveal patterns:

- **Controlled fade-up** for text, structured content, and supporting UI.
- **Directional image mask** for approved editorial or industrial imagery.

These patterns must remain subtle. They are not mandatory on every section and must never be combined into a dense sequence of effects.

### 3.4 Motion hierarchy

Use three levels only:

| Level | Purpose | Examples | Typical duration |
| --- | --- | --- | --- |
| Micro | Immediate control feedback | Button, link, checkbox, field, icon | `80–160ms` |
| Component | Open, close, insert, confirm | Accordion, menu, tooltip, alert | `160–240ms` |
| Editorial | Controlled page or section reveal | Hero copy, section intro, image mask | `400–600ms` |

Do not apply editorial motion to routine controls. Do not use long durations to make simple interactions appear premium.

---

## 4. Non-Negotiable Principles

### 4.1 Content is available before motion

- Core content must be present in semantic server-rendered HTML.
- Essential content must remain readable when JavaScript fails or is disabled.
- Motion enhancement must not be required to reveal navigation, headings, evidence, forms, tables, or calls to action.
- A user must never wait for a reveal sequence before using the page.

### 4.2 Feedback is immediate

- Interactive feedback should begin within `100ms` of input.
- A pressed control must visibly acknowledge the press.
- Network actions must switch to an honest pending state without creating layout shift.
- If an operation completes instantly, do not force an artificial loading animation.

### 4.3 Restraint creates premium quality

- Use one dominant motion idea in a viewport at a time.
- Prefer opacity and small-distance movement over large transforms.
- Prefer a stable surface with refined state changes over floating, tilting, or glowing cards.
- Motion density should decrease as information density increases.

### 4.4 Motion never carries meaning alone

State changes must also be communicated through text, iconography, position, shape, or other persistent visual treatment. Color or animation alone is insufficient.

### 4.5 Direction is semantic

Horizontal movement must follow logical inline direction and the meaning of the control. It must not be based on an assumed left-to-right layout.

### 4.6 No fabricated activity

Do not animate counters, price ticks, delivery maps, supplier activity, dashboards, or progress indicators unless they represent real, approved data and actual system state.

---

## 5. Motion Tokens

Motion values must be defined centrally. Components must not introduce arbitrary timing, easing, distance, rotation, or scale values.

### 5.1 Duration tokens

| Token | Value | Approved use |
| --- | ---: | --- |
| `--aa-motion-duration-instant` | `80ms` | Press feedback, small color acknowledgment |
| `--aa-motion-duration-fast` | `160ms` | Hover, focus-supporting visual change, tooltip |
| `--aa-motion-duration-base` | `240ms` | Menu, accordion, alert, field-state transition |
| `--aa-motion-duration-slow` | `400ms` | Dialog, drawer, major component transition |
| `--aa-motion-duration-reveal` | `600ms` | Hero or editorial reveal only |

Rules:

- User-triggered exits should normally be faster than entrances.
- Nothing in the standard interface should exceed `600ms`.
- Repeating status motion may use its own cycle but must follow Section 18.
- Delays must not be used on controls, validation, menus, dialogs, or navigation feedback.

### 5.2 Easing tokens

| Token | Value | Character |
| --- | --- | --- |
| `--aa-motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | General transition with a composed finish |
| `--aa-motion-ease-enter` | `cubic-bezier(0, 0, 0, 1)` | Decisive entrance and expansion |
| `--aa-motion-ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Efficient exit and collapse |
| `--aa-motion-ease-linear` | `linear` | Real progress or spinner rotation only |

Spring and bounce easing are prohibited in the default brand system.

### 5.3 Distance tokens

| Token | Value | Approved use |
| --- | ---: | --- |
| `--aa-motion-distance-1` | `2px` | Press and hover refinement |
| `--aa-motion-distance-2` | `4px` | Tooltip or small popover |
| `--aa-motion-distance-3` | `8px` | Menu or compact component entrance |
| `--aa-motion-distance-4` | `16px` | Standard fade-up |
| `--aa-motion-distance-5` | `24px` | Maximum editorial entrance |

No standard element may travel more than `24px`. Full drawer translation is an exception because it communicates the drawer's physical relationship to the viewport edge.

### 5.4 Scale tokens

| Token | Value | Approved use |
| --- | ---: | --- |
| `--aa-motion-scale-pressed` | `0.98` | Short active state for buttons and compact controls |
| `--aa-motion-scale-enter` | `0.99` | Dialog or popover entrance when needed |
| `--aa-motion-scale-hover` | `1.01` | Exceptional media or icon treatment only |

- Card scaling on hover is prohibited by default.
- No interface element may exceed `1.02` scale through standard interaction.
- Text must not scale independently from its container.

### 5.5 Stagger tokens

| Token | Value | Use |
| --- | ---: | --- |
| `--aa-motion-stagger-tight` | `40ms` | Two to four closely related items |
| `--aa-motion-stagger-base` | `60ms` | Editorial sequence of no more than four items |
| `--aa-motion-stagger-max` | `180ms` | Maximum total delay across a group |

Do not stagger long lists, tables, search results, cards, form fields, FAQ items, or navigation links. The user must not wait for a sequence to finish.

### 5.6 Reference CSS

```css
:root {
  --aa-motion-duration-instant: 80ms;
  --aa-motion-duration-fast: 160ms;
  --aa-motion-duration-base: 240ms;
  --aa-motion-duration-slow: 400ms;
  --aa-motion-duration-reveal: 600ms;

  --aa-motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --aa-motion-ease-enter: cubic-bezier(0, 0, 0, 1);
  --aa-motion-ease-exit: cubic-bezier(0.3, 0, 1, 1);
  --aa-motion-ease-linear: linear;

  --aa-motion-distance-1: 2px;
  --aa-motion-distance-2: 4px;
  --aa-motion-distance-3: 8px;
  --aa-motion-distance-4: 16px;
  --aa-motion-distance-5: 24px;

  --aa-motion-scale-pressed: 0.98;
  --aa-motion-scale-enter: 0.99;
  --aa-motion-scale-hover: 1.01;

  --aa-motion-stagger-tight: 40ms;
  --aa-motion-stagger-base: 60ms;
  --aa-motion-stagger-max: 180ms;
}
```

---

## 6. Approved Animated Properties

### 6.1 Preferred properties

Use these by default:

- `opacity`;
- `transform`;
- `clip-path` for a limited number of approved image-mask reveals;
- background, border, outline, and text color for short state transitions;
- shadow opacity or shadow token change;
- grid-track or measured height only for small disclosure components.

### 6.2 Restricted properties

Use only with a documented component need:

- `height` and `width`;
- `padding` and `margin`;
- `filter`;
- `backdrop-filter`;
- `box-shadow` with large blur areas;
- SVG path animation.

### 6.3 Prohibited patterns

- Layout-changing animation across large page regions
- Continuous parallax
- Scroll-jacking or forced scroll position
- Cursor-following elements
- Magnetic buttons
- 3D card tilt
- Background particles
- Liquid, elastic, bounce, or overshoot effects
- Large blur-to-focus entrances
- Continuous gradient movement
- Decorative marquee text
- Autoplay background video by default
- Animated noise or grain
- Logo geometry morphing
- Copper glow around controls
- Flashing or attention-seeking CTA loops

The approved Ahan Asa logo must never be stretched, rotated, disassembled, traced, or morphed as part of an animation.

---

## 7. Motion Density and Budget

### 7.1 Per-viewport budget

Within one viewport, use:

- no more than one editorial reveal group;
- no more than four staggered elements;
- no more than three simultaneous translated elements;
- no more than one image-mask reveal;
- no continuous decorative animation.

### 7.2 Per-page budget

- Not every section should animate.
- Repeated sections should not all use the same entrance pattern.
- Long pages should prioritize motion at key transitions: hero, process explanation, evidence, and final qualified action.
- Dense technical sections, tables, FAQs, legal content, and forms should remain mostly stable.

### 7.3 Attention budget

Motion must not compete with:

- the primary heading;
- critical qualification information;
- form errors;
- document upload status;
- evidence captions;
- legal or privacy conditions;
- the primary CTA.

When two moving elements compete, remove the less functional motion.

---

## 8. Page Load and First View

### 8.1 First paint

- The page background, header, main heading, value proposition, and primary action must render immediately.
- Do not use a branded preloader.
- Do not fade the entire page in from blank.
- Do not delay the header or primary CTA.
- Do not use a full-screen logo animation.

### 8.2 Hero entrance

An optional hero sequence may use:

1. Eyebrow and heading: fade-up, `600ms`.
2. Supporting copy: fade-up, `600ms`, delayed `60ms`.
3. Action group: fade-up, `600ms`, delayed `120ms`.
4. Approved hero image: image-mask, `600ms`, delayed no more than `120ms`.

Constraints:

- Maximum total stagger is `180ms`.
- The content remains visible and usable without the animation.
- Do not animate every word or line separately.
- Do not use split-letter, typewriter, scramble, or counting effects.
- On slower devices, reduced-motion environments, restored pages, or back/forward navigation, the sequence may be skipped.

### 8.3 Returning navigation

Do not replay long hero reveals every time the user returns through browser history. Preserve a stable, immediate experience.

---

## 9. Scroll-Triggered Reveal

### 9.1 Standard fade-up

Approved behavior:

- Start: `opacity: 0`, `translateY(16px)`.
- End: `opacity: 1`, `translateY(0)`.
- Duration: `600ms` for editorial content or `400ms` for a compact block.
- Easing: enter easing.
- Trigger once only.

### 9.2 Trigger guidance

Recommended observer behavior:

- Trigger when roughly `15%` of the element is visible.
- Use a bottom root margin near `-10%` of the viewport.
- Do not trigger repeatedly when the user scrolls back and forth.
- Do not attach a separate scroll listener to each element.
- Elements already visible on initial load should not wait for a scroll event.

### 9.3 Approved subjects

- Section heading and short introduction
- One evidence block
- One process group
- One editorial image
- One final CTA band

### 9.4 Subjects that should not use scroll reveal

- Long text paragraphs
- Every card in a grid
- Form fields
- Tables and comparison rows
- FAQ items
- Footer link groups
- Legal content
- Errors, alerts, or status messages
- Content that may be deep-linked or found through in-page search

### 9.5 No-JavaScript safety

Content must default to visible. A motion-ready state may be applied only after the enhancement logic is available. The implementation must avoid a flash in which readable content appears, disappears, and reappears.

---

## 10. Image and Media Motion

### 10.1 Directional image mask

The image-mask reveal is an editorial signature, not a default image behavior.

Approved behavior:

- Reveal from the logical inline-start edge toward inline-end, or from block-end upward when horizontal direction would be ambiguous.
- Duration: `600ms`.
- Easing: enter easing.
- Optional image movement inside the mask: maximum `8px` or scale from `1.01` to `1`.
- Run once.

RTL requirements:

- For Persian, inline-start is the visual right edge.
- Future LTR locales must reverse the horizontal mask direction without duplicating components.
- The image itself must not be mirrored.

### 10.2 Image hover

For a genuinely clickable evidence or resource image:

- A small image scale up to `1.01` may be used.
- Duration: `240ms`.
- The container must clip overflow.
- A persistent text label or icon must still communicate clickability.
- Do not zoom documentary images enough to crop evidence or technical detail.

### 10.3 Video

- Do not autoplay video by default.
- Show an accessible play button and poster image.
- Media controls must remain standard and understandable.
- Do not animate sound on or start audio automatically.
- Respect reduced motion by avoiding animated poster treatments.

### 10.4 Carousels

Carousels are not a default pattern. If one is approved:

- It must not autoplay.
- It must support keyboard, touch, and visible controls.
- Slide changes should use a direct `240–400ms` translation or crossfade.
- The current position must be announced and visually identified.
- Swipe direction and previous/next controls must respect RTL meaning.

---

## 11. Navigation Motion

### 11.1 Header

- Sticky-header changes may use a `160–240ms` background, border, or shadow transition.
- Do not continuously shrink and expand the header during small scroll movements.
- If the header changes after scrolling, use a stable threshold and hysteresis to prevent flicker.
- The logo must not animate between variants while scrolling.

### 11.2 Desktop dropdown

Entrance:

- Opacity `0 → 1`.
- Translate block-start from `-4px → 0` or block-end from `4px → 0`, according to placement.
- Duration: `160ms`.
- Easing: enter.

Exit:

- Opacity `1 → 0`.
- Duration: `80–160ms`.
- Easing: exit.

The menu must open through accessible button activation, not hover alone. Motion must not delay focus movement or keyboard use.

### 11.3 Mobile navigation drawer

- Enter from the logical inline-end edge unless the approved navigation specification defines another relationship.
- Duration: `400ms` maximum.
- Scrim fade: `240ms`.
- Close duration: `240ms`.
- Focus moves inside only after the dialog/drawer is programmatically open; it must not wait for visual animation completion.
- Restore focus to the menu button on close.
- Lock page scroll without shifting layout.

In Persian RTL, logical inline-end is the visual left edge. Do not hard-code `left` or `right` without direction-aware tokens.

### 11.4 Breadcrumb and pagination

- Links use standard hover, active, and focus feedback only.
- Current-page changes must not use sliding underline motion that suggests a tab interface.
- Previous and next icons mirror when their meaning depends on reading direction.

---

## 12. Buttons and Links

### 12.1 Primary and secondary buttons

Default transition:

```css
transition:
  background-color var(--aa-motion-duration-fast) var(--aa-motion-ease-standard),
  border-color var(--aa-motion-duration-fast) var(--aa-motion-ease-standard),
  color var(--aa-motion-duration-fast) var(--aa-motion-ease-standard),
  box-shadow var(--aa-motion-duration-fast) var(--aa-motion-ease-standard),
  transform var(--aa-motion-duration-instant) var(--aa-motion-ease-standard);
```

Approved feedback:

- Hover on hover-capable devices: optional `translateY(-1px)` plus approved color or shadow token.
- Active: `translateY(0)` and optional `scale(0.98)`.
- Focus-visible: immediate visible focus ring; never delayed behind hover animation.
- Disabled: no hover or press movement.
- Loading: preserve width, label context, and accessible name.

Rules:

- Buttons must not bounce.
- Copper may support meaningful hover, active, selected, or progress states but must remain restrained.
- A hover state must not be required to identify the control.
- Avoid moving arrows that repeatedly point toward the CTA.

### 12.2 Text links

- Use a short color and underline transition of `160ms` or less.
- Underlines may grow from logical inline-start only when the result remains obvious without motion.
- Inline links inside body copy should keep a persistent underline or equally clear affordance.
- External-link and download icons do not need motion.

### 12.3 Icon buttons

- Use a direct color/background transition.
- Press scale may be used if it does not reduce the hit target.
- Rotation is allowed only when it communicates a state, such as an expanded chevron.
- Decorative icon spinning is prohibited.

---

## 13. Cards, Lists, and Evidence

### 13.1 Card hover

Clickable cards may use:

- Border change;
- Shadow change from `xs` to `sm`;
- Maximum upward translation of `2px`;
- Duration: `160–240ms`.

Cards must not:

- tilt;
- rotate;
- glow;
- expand unpredictably;
- scale as a whole by default;
- reveal essential information only on hover.

### 13.2 Non-clickable cards

Non-clickable cards should not move on hover. Motion implies interactivity and must not create a false affordance.

### 13.3 Repeated lists

- Do not stagger every card or row.
- If a short, curated group uses reveal motion, animate the group container or no more than four items.
- Search results and archives should appear immediately.

### 13.4 Evidence integrity

Motion must not crop, blur, cover, or rapidly replace evidence. Captions, specifications, dates, and outcome information must remain stable and readable.

---

## 14. Disclosure Components

### 14.1 Accordion

- Chevron rotation: `160ms`.
- Panel expansion/collapse: `240ms`.
- Use enter easing when opening and exit easing when closing.
- The trigger state changes immediately through `aria-expanded`.
- Content remains in a logical DOM position.
- Essential content must not depend on watching the animation.

Avoid animating large FAQ collections simultaneously. Opening one item must not cause unexpected page jumps.

### 14.2 Tabs

- Active indicator: `160–240ms`.
- Panel change: direct replacement or a `160ms` crossfade.
- Do not slide panels horizontally unless spatial order is real and remains direction-correct in RTL.
- Keyboard focus and selected state must update immediately.
- Avoid animating panel height across significantly different content sizes.

### 14.3 Tooltip

- Delay before opening: `300–500ms` for pointer hover; no unnecessary delay for keyboard focus.
- Entrance: opacity and `4px` movement, `160ms`.
- Exit: `80ms`.
- Tooltips must not contain essential instructions or primary actions.

### 14.4 Popover

- Entrance: opacity plus `scale(0.99 → 1)` or `4px` movement.
- Duration: `160–240ms`.
- Origin should align with the trigger relationship.
- Placement and movement must adapt to viewport collision without implying the wrong direction.

---

## 15. Forms and Procurement Inquiry Flow

Forms are high-value conversion interfaces. Their motion must communicate control and reduce uncertainty.

### 15.1 Field interaction

- Border, background, label, and supporting icon changes: `160ms`.
- Focus ring appears immediately through `:focus-visible`.
- Labels must not depend on animated placeholders.
- Floating-label patterns are discouraged unless they preserve permanent label clarity.
- Field height and surrounding layout must remain stable across focus.

### 15.2 Validation

- Error appearance may use a short `160ms` opacity transition.
- Do not shake fields.
- Do not flash error borders.
- Error text must be specific, persistent, and programmatically connected to the field.
- When multiple errors exist, move focus to an error summary after submission.
- Preserve entered values after client or server errors.

### 15.3 Submission

On submit:

1. Acknowledge input immediately.
2. Disable duplicate submission while the same request is pending.
3. Preserve button width and surrounding layout.
4. Keep a meaningful label such as “در حال ارسال…” rather than showing an unlabeled spinner.
5. Announce pending and completion status when appropriate.
6. Show success only after confirmed success.
7. Show an honest retry path after failure.

Do not display a success animation before the server or approved fallback confirms the outcome.

### 15.4 Success state

- Use a small icon draw, fade, or scale from `0.98` to `1` over `240ms`.
- State what happened and what the user should expect next.
- Do not use confetti, fireworks, celebration particles, or exaggerated checkmark animation.
- Do not invent a response time or service-level commitment.

### 15.5 File upload

- Drag-active state: `160ms` border/background transition.
- Upload progress must represent actual transferred progress when determinable.
- If progress is indeterminate, show a labeled indeterminate status—not a fabricated percentage.
- File insertion/removal may use a `160–240ms` fade and `8px` block movement.
- Removal must remain reversible where the workflow supports recovery.
- Error and privacy information must remain visible without animation.

### 15.6 Multi-step forms

Use a multi-step flow only when approved by `FORM_ARCHITECTURE.md`.

- Progress changes must reflect completed, current, and remaining steps honestly.
- Step transitions may use a `240ms` crossfade.
- Avoid lateral sliding when it creates RTL ambiguity.
- Do not block browser back behavior without a documented reason.
- Preserve user data when navigating between steps.

---

## 16. Feedback, Status, and System States

### 16.1 Alerts

- Inline alerts appear in document flow.
- Entrance: opacity plus `8px` block movement, `240ms`.
- Critical errors should appear immediately without decorative movement.
- Dismissal: `160ms`, followed by layout removal only after the visible exit.
- Do not auto-dismiss critical errors.

### 16.2 Toasts

Use toasts only for brief, non-critical confirmation.

- Enter from the logical inline-end or block-end according to placement.
- Entrance: `240ms`; exit: `160ms`.
- Pause dismissal when hovered or focused.
- Provide sufficient reading time.
- Never use a toast as the only record of a critical form error or contractual status.

### 16.3 Loading

- Prefer local loading states over full-page loaders.
- Preserve the final layout geometry.
- Use a static skeleton or a restrained opacity pulse only when useful.
- Endless shimmer is prohibited.
- Use one spinner per active region, not one per row.
- Loading indicators must have accessible status text.

### 16.4 Empty states

Empty states should appear without theatrical motion. Explain the condition and offer the next useful action. Never animate placeholder metrics, projects, suppliers, or documents to make an empty section appear active.

### 16.5 Live updates

If approved live content is added later:

- Updates must not reorder focused content unexpectedly.
- New information should be announced politely where appropriate.
- Do not flash rows or use ticker motion.
- Give users control over frequent updates.

---

## 17. Dialogs, Drawers, and Overlays

### 17.1 Dialog

Entrance:

- Scrim opacity: `0 → approved value`, `240ms`.
- Dialog opacity: `0 → 1`.
- Dialog scale: `0.99 → 1` or block movement `8px → 0`.
- Duration: `240–400ms`.

Exit:

- Duration: `160–240ms`.
- Restore focus after closure.

Rules:

- Focus trapping and `aria-modal` behavior are functional requirements independent of animation.
- Escape closes the dialog unless doing so would cause unsafe data loss.
- Do not place long RFQ flows in a modal.
- Background scroll lock must not shift page width.

### 17.2 Side drawer

- Translate from the edge to which the drawer is spatially attached.
- Use logical inline properties and direction-aware transforms.
- Duration: `400ms` maximum.
- Do not combine translation with large scale or blur.

### 17.3 Lightbox or evidence viewer

- Use a simple fade and small scale.
- Maintain image aspect ratio and technical legibility.
- Provide next/previous controls only when a real ordered set exists.
- Control semantics and keyboard behavior must work in RTL.
- The viewer must not present stock media as project evidence.

---

## 18. Continuous and Repeating Motion

Continuous motion is prohibited unless it communicates an active, temporary system state.

### 18.1 Allowed cases

- Indeterminate spinner during a real pending operation
- Progress movement during a real upload or processing state
- Media playback initiated by the user

### 18.2 Rules

- Stop motion as soon as the state ends.
- Keep spinner rotation linear and restrained.
- Provide a text label or accessible status.
- Pause or remove nonessential motion when the page is not visible.
- Do not use pulsing CTAs, breathing logos, moving decorative lines, or infinite background loops.
- Reduced-motion mode must replace nonessential repeating motion with a static state.

---

## 19. Process and Data Visualization

### 19.1 Procurement process

The approved process may reveal stage by stage only when the user enters the section.

- Maximum of four staggered stages in one group.
- For longer processes, reveal the container rather than every step.
- On desktop Persian layouts, spatial progression follows visual right to left.
- On mobile, progression is top to bottom.
- Numbering, labels, and responsibilities remain visible without animation.

### 19.2 Progress indicators

Use only for actual user or system progress.

- Do not animate decorative “completion” bars.
- Do not use percentages without a real denominator.
- Motion must stop at the confirmed current state.
- Use Copper as a restrained progress accent only when consistent with approved component semantics.

### 19.3 Counters

- Animated counters are prohibited by default.
- Verified numbers should normally render immediately.
- If an approved explanatory visualization later requires counting, the final value must be available to assistive technology immediately and reduced-motion users must see the final value without animation.

### 19.4 Charts and tables

- Tables should not animate row-by-row.
- Charts are allowed only for verified, useful data.
- Chart animation must not obscure scale, source, unit, or timeframe.
- Reduced-motion mode shows the final chart state immediately.

---

## 20. Page and Route Transitions

### 20.1 Default behavior

Phase 1 does not require animated route transitions. Fast, stable navigation is more important than visual continuity.

### 20.2 Allowed treatment

If route transitions are approved and do not delay navigation:

- Use a subtle content crossfade of `160–240ms`.
- Keep the header and global navigation stable.
- Move focus to the new main heading or follow the approved focus-management strategy.
- Update the document title and route state immediately.
- Preserve native browser history and scroll restoration.

### 20.3 Prohibited treatment

- Full-screen wipes
- Logo interstitials
- Long page curtains
- Artificial minimum loading time
- Route transitions that cover content while data is already ready
- Transitions that replay on hash navigation
- Directional slides that imply the wrong hierarchy in RTL

---

## 21. RTL and Bidirectional Motion

### 21.1 Direction rules

Use logical direction tokens rather than assumptions about visual left and right.

```css
:root {
  --aa-inline-enter-sign: -1;
}

[dir="rtl"] {
  --aa-inline-enter-sign: 1;
}

.aa-motion-inline-enter {
  transform: translateX(
    calc(var(--aa-motion-distance-3) * var(--aa-inline-enter-sign))
  );
}
```

The exact sign must be verified against the component's meaning and attachment edge. Do not use this utility blindly.

### 21.2 Elements that mirror direction

- Back and forward arrows
- Previous and next controls
- Breadcrumb chevrons
- Process progression arrows
- Drawer or panel entrances tied to an inline edge
- Directional underline or mask reveals

### 21.3 Elements that do not mirror

- Ahan Asa logo
- Phone icon
- Email icon
- Search icon
- Download/upload icon
- Media playback controls
- Clock and calendar symbols
- Product marks, standards, codes, and technical imagery

### 21.4 Mixed-direction content

Phone numbers, email addresses, URLs, standards, dimensions, filenames, and codes may use `dir="ltr"` and `unicode-bidi: isolate`. Their content direction must not reverse the motion or reading order of the surrounding Persian component.

### 21.5 Source order

Do not change DOM order only to achieve a visual motion direction. Keyboard, screen-reader, and reading order must remain logical.

---

## 22. Accessibility and Reduced Motion

### 22.1 Requirement

The website must respect `prefers-reduced-motion: reduce` and remain fully understandable and usable with motion removed.

### 22.2 Reduced-motion behavior

In reduced-motion mode:

- Remove scroll-triggered translations.
- Remove image-mask reveals.
- Remove scale entrances.
- Remove parallax and continuous decorative motion.
- Replace route transitions with immediate updates or a very short opacity change.
- Keep essential state acknowledgment, focus indication, and real progress communication.
- Show final content and final data states immediately.
- Do not substitute one large motion with another effect such as blur or flashing.

### 22.3 Reference CSS

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }

  [data-motion],
  [data-motion-state] {
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }
}
```

This global safety rule does not replace component-level reduced-motion design. Each interactive component must still be tested for state clarity when transitions are effectively immediate.

### 22.4 Focus and keyboard

- Focus movement must not wait for animation completion.
- Focus rings must not fade in slowly.
- Hover-only animation must be paired with keyboard-equivalent visual feedback where relevant.
- Hidden or exiting elements must not remain focusable.
- Opening overlays must receive focus according to their interaction model.
- Closing overlays must restore focus predictably.

### 22.5 Vestibular and cognitive safety

- Avoid large-field motion.
- Avoid unexpected zoom.
- Avoid motion linked directly to every scroll pixel.
- Avoid flashing more than three times per second; the default system should not flash at all.
- Keep motion patterns consistent so users can predict interface behavior.

---

## 23. Responsive and Input-Aware Behavior

### 23.1 Mobile

- Use shorter distances and fewer simultaneous elements.
- Prefer `8–16px` reveal distances.
- Avoid animation that moves content beneath the user's finger.
- Preserve tap targets of at least `44 × 44px` for primary controls.
- Do not depend on hover states.
- Avoid fixed decorative motion that consumes viewport space or battery.

### 23.2 Desktop

- Hover refinements may be enabled only when `hover: hover` and `pointer: fine` apply.
- Wider layouts may use direction-aware image masks and process progression.
- Desktop does not justify additional decorative motion.

```css
@media (hover: hover) and (pointer: fine) {
  .aa-button:hover {
    transform: translateY(-1px);
  }
}
```

### 23.3 Touch and hybrid devices

- Do not leave controls visually stuck in hover state.
- Use active and focus-visible states for reliable feedback.
- Test with keyboard, mouse, touch, and touchpad where practical.

### 23.4 Orientation and resizing

- Do not replay reveals after a simple resize or orientation change.
- Overlays and drawers must settle into a valid layout immediately after breakpoint changes.
- Motion must not trap content off-screen when the viewport changes.

---

## 24. Performance Requirements

### 24.1 General

- Prefer CSS transitions and keyframes for simple state changes.
- Use a small shared Intersection Observer utility for reveal logic.
- Do not add a large animation dependency for effects achievable with CSS.
- If an animation library already exists, use only approved features and prevent unnecessary client bundles.
- Do not convert server components to client components only to add decorative motion.

### 24.2 Rendering

- Prefer compositor-friendly `transform` and `opacity`.
- Avoid expensive filters and large animated shadows.
- Limit simultaneous image masks.
- Reserve media dimensions before load.
- Do not animate properties that create repeated layout and paint across large regions.

### 24.3 Scroll performance

- Use Intersection Observer for entrance triggers.
- Do not run unthrottled scroll handlers.
- Do not calculate layout on every animation frame.
- Do not use scroll-linked animation in Phase 1 unless separately approved and performance-tested.

### 24.4 Layout stability

- Motion must not create cumulative layout shift.
- Loading, error, success, and pending states must reserve appropriate space where possible.
- Scrollbar removal for overlays must compensate for viewport width changes.
- Font loading must not cause motion sequences to begin before final text metrics settle.

### 24.5 Lifecycle

- Clean up observers, timers, and event listeners.
- Pause user-initiated media when appropriate, but do not unexpectedly reset it.
- Stop temporary animations when components unmount.
- Respect document visibility for active repeating status motion.

---

## 25. Implementation Architecture

### 25.1 Progressive enhancement

The baseline page is semantic, visible, and usable. Motion is added only after capability and preference checks.

Recommended layers:

1. **Tokens** — central CSS custom properties.
2. **Primitive transitions** — button, link, field, surface, focus, disclosure.
3. **Motion utilities** — reveal, inline entrance, image mask, status rotation.
4. **Component behavior** — menus, drawers, dialogs, forms, upload states.
5. **Page choreography** — rare, documented composition of approved primitives.

### 25.2 Suggested data attributes

```html
<section data-motion="reveal" data-motion-distance="4">
  ...
</section>

<figure data-motion="image-mask" data-motion-direction="inline">
  ...
</figure>
```

Allowed values should be typed or validated centrally. Page code must not invent arbitrary attribute values.

### 25.3 State naming

Use clear state names:

- `idle`
- `hovered`
- `focused`
- `pressed`
- `expanded`
- `collapsed`
- `loading`
- `success`
- `error`
- `disabled`
- `entering`
- `entered`
- `exiting`
- `exited`

Do not mix visual animation phases with business workflow statuses.

### 25.4 Presence and unmounting

- An exiting element may remain mounted only for its short exit duration.
- It must be removed from interaction and accessibility flow at the correct time.
- Critical updates should not wait for exit animation.
- Cancel or finish exit behavior safely if the state reverses quickly.

### 25.5 Event integrity

- Visual completion must not be treated as business-operation completion.
- Submission success comes from the approved response state, not an animation callback.
- Do not fire analytics events from animation lifecycle callbacks unless the event explicitly measures visibility and the analytics specification approves it.

---

## 26. Component Motion Matrix

| Component | Entrance/open | Hover/focus | Active/selection | Exit/close | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| Primary button | None | Color, shadow, max `-1px` | `0.98` optional | None | State changes only |
| Text link | None | Color/underline `160ms` | Persistent underline/color | None | Immediate |
| Clickable card | Optional group reveal | Border/shadow, max `-2px` | Persistent focus/pressed state | None | No translation |
| Dropdown | Fade + `4px`, `160ms` | Item background/color | Selected marker | Fade `80–160ms` | Immediate open/close |
| Mobile drawer | Inline translation, `400ms` | Control states only | Current item marker | `240ms` | Immediate or short fade |
| Accordion | None | Trigger state | Chevron + panel `240ms` | `240ms` | Immediate |
| Tabs | None | Trigger state | Indicator/crossfade `160–240ms` | Direct replacement | Immediate |
| Tooltip | Fade + `4px`, `160ms` | Trigger focus visible | N/A | `80ms` | Immediate |
| Dialog | Fade + scale, `240–400ms` | Control states | N/A | `160–240ms` | Immediate/short fade |
| Input | None | Border/ring `160ms` | Value retained | None | Immediate |
| Error | Fade `160ms` | N/A | Persistent | Direct when resolved | Immediate |
| Success | Fade/scale `240ms` | N/A | Persistent message | Context dependent | Immediate |
| Upload item | Fade + `8px`, `240ms` | Controls only | Real progress | Fade `160ms` | Immediate |
| Alert | Fade + `8px`, `240ms` | Dismiss control | Persistent semantic state | `160ms` | Immediate |
| Toast | Inline/block entrance `240ms` | Pause dismissal | Persistent during timeout | `160ms` | Short fade or immediate |
| Hero copy | Fade-up `600ms` optional | N/A | N/A | None | Immediate |
| Editorial image | Mask `600ms` optional | Scale to `1.01` if clickable | N/A | None | Immediate |
| Table | None | Row highlight only if useful | Sort/filter state | None | Immediate |
| Process | Group or max four-item reveal | Step control if interactive | Persistent current state | None | Immediate |

---

## 27. Motion Copy and Sound

### 27.1 Status copy

Motion should be paired with concise, honest Persian status language. Examples must be finalized in `COPY_GUIDELINES.md`.

The interface should distinguish clearly between:

- preparing;
- uploading;
- submitting;
- submitted;
- failed;
- retry available;
- saved locally, if such a real feature exists;
- received by the approved backend, if confirmed.

Do not use vague success language when the operational result is uncertain.

### 27.2 Sound and haptics

- Website interactions must not play sound by default.
- Do not add sound effects to buttons, submissions, notifications, or success states.
- Haptic behavior is outside the Phase 1 website scope unless a future native application defines it separately.

---

## 28. Motion Anti-Patterns

Claude Code and contributors must reject:

- animated splash screens;
- bouncing arrows telling users to scroll;
- typewriter hero headings;
- word-by-word or letter-by-letter text reveals;
- card walls entering one by one;
- counters that count from zero without a functional reason;
- fake price ticker movement;
- pulsing “contact us” or WhatsApp buttons;
- floating objects around steel imagery;
- steel beams flying into place as decoration;
- logo assembly or rotation;
- long page-transition curtains;
- autoplay carousels;
- confetti after RFQ submission;
- shake animations on validation errors;
- spring-based menus and dialogs;
- animated gradients or copper glow;
- hover effects on non-interactive content;
- motion that reveals text only after scrolling;
- a different animation style on every page;
- animation packages added only for fade and transform effects.

---

## 29. QA and Acceptance Tests

### 29.1 Functional QA

- Every animated control works with keyboard only.
- Hover, focus, active, disabled, loading, success, and error states are distinct where applicable.
- Menus, drawers, dialogs, tabs, and accordions expose correct semantic state immediately.
- Rapid repeated input does not leave elements stuck between states.
- Browser back/forward navigation does not replay disruptive transitions.
- Deep links and hash navigation reach visible content without waiting for animation.
- Form submissions cannot be duplicated accidentally during a real pending state.

### 29.2 RTL QA

- Horizontal entrance direction is correct in Persian.
- Previous/next, breadcrumb, process, and disclosure icons behave correctly.
- Source order remains logical.
- Mixed LTR values do not reverse surrounding motion.
- Mobile drawer attachment and translation direction match the approved layout.
- The logo and technical imagery are never mirrored.

### 29.3 Accessibility QA

- `prefers-reduced-motion: reduce` removes nonessential transforms, masks, and continuous movement.
- Content remains visible when JavaScript is disabled.
- Focus indicators are immediate and visible on every surface.
- Focus does not enter hidden or exiting content.
- Opening and closing overlays manage focus correctly.
- Status messages are available to assistive technology.
- No animation flashes or produces large unexpected viewport movement.
- Zoom and reflow do not break overlay or motion geometry.

### 29.4 Performance QA

- No animation causes unexpected layout shift.
- Scroll remains smooth on representative mid-range mobile hardware.
- No unthrottled scroll listener is introduced.
- Observers and event listeners are cleaned up.
- No large animation dependency is added without explicit approval.
- Above-the-fold content does not wait for animation JavaScript.
- Long tasks, excessive paints, or repeated layouts are investigated and removed.

### 29.5 Visual QA

- Movement distances stay within approved tokens.
- Timing and easing use approved tokens.
- Motion feels consistent across pages.
- Copper remains a restrained accent.
- No more than one dominant editorial motion appears in a viewport.
- Dense sections remain calm and stable.
- Error and success feedback are clear without theatrical effects.

### 29.6 Test environments

At minimum, test:

- Modern Chrome, Firefox, Safari, and Edge
- iOS Safari and Android Chrome
- Keyboard-only navigation
- Touch input
- `prefers-reduced-motion: reduce`
- Slow network and delayed form response
- JavaScript disabled for content availability
- RTL Persian with long realistic copy
- Mixed Persian and Latin technical values
- Browser zoom at `200%`
- Narrow viewport at `320 CSS px`

---

## 30. Implementation Checklist for Claude Code

Before adding or changing motion, Claude Code must:

1. Read `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, `UI_COMPONENTS.md`, and this document.
2. Identify the user-facing purpose of the motion.
3. Confirm that the same outcome is understandable without motion.
4. Reuse approved duration, easing, distance, and scale tokens.
5. Verify Persian RTL direction and future-safe LTR behavior.
6. Define the reduced-motion result before implementing the animated result.
7. Keep semantic content visible and server rendered.
8. Prefer CSS and existing utilities over a new client dependency.
9. Test keyboard, focus, touch, reduced motion, loading, error, and rapid interaction states.
10. Confirm that motion does not create false operational status or unsupported evidence.
11. Record any approved exception in `DECISIONS.md`.

Claude Code must not:

- invent a new motion style for one page;
- introduce arbitrary timing values;
- convert a server component to a client component solely for decorative reveal;
- install an animation library without explicit architectural approval;
- hide core content until hydration;
- use hover as the only interaction signal;
- animate the approved logo geometry;
- animate unverified prices, metrics, projects, partners, suppliers, or progress;
- use motion to make incomplete content appear finished;
- bypass reduced-motion behavior;
- accept visual polish that degrades performance, accessibility, or conversion clarity.

---

## 31. Definition of Done

A motion implementation is complete only when:

- its purpose is clear and functional;
- its values come from approved tokens;
- it behaves correctly in Persian RTL;
- its reduced-motion state is implemented;
- content remains available without JavaScript;
- it works with keyboard, touch, and pointer input as applicable;
- it creates no unexpected layout shift;
- it does not delay navigation, reading, validation, or submission;
- it does not imply false data or capability;
- it has been tested in loading, success, error, disabled, and rapid-interaction states where applicable;
- it passes the relevant QA checks in this document;
- any exception has explicit approval and is recorded.

---

## 32. Open Dependencies

The following future documents may refine, but must not weaken, these rules:

- `RESPONSIVE_RULES.md` — breakpoint-specific motion density and component reflow
- `ACCESSIBILITY.md` — detailed WCAG implementation and assistive-technology behavior
- `PERFORMANCE_GUIDELINES.md` — bundle, rendering, and Core Web Vitals budgets
- `FORM_ARCHITECTURE.md` — submission, upload, validation, and CRM handoff states
- `PAGE_SPECIFICATIONS.md` — approved page-level choreography
- `COPY_GUIDELINES.md` — Persian status, error, pending, and success language
- `ANALYTICS_TRACKING.md` — legitimate visibility and interaction events
- `CLAUDE.md` — enforcement order and mandatory development workflow

Until those documents are approved, this file and the existing design-system constraints are the implementation baseline.

---

## 33. Approval Gate

Before this document moves from **Draft** to **Approved**, confirm:

- the five duration tokens;
- the three easing curves;
- the `24px` maximum standard travel distance;
- the controlled fade-up signature;
- the limited directional image-mask signature;
- the prohibition on bounce, parallax, autoplay, animated counters, and decorative loops;
- the hero stagger limit of `180ms`;
- the reduced-motion policy;
- the Persian RTL drawer and inline-motion direction;
- the requirement to keep all core content visible without animation.

Once approved, changes to signature motion, timing tokens, direction rules, accessibility behavior, or prohibited patterns require an explicit decision recorded in `DECISIONS.md`.
