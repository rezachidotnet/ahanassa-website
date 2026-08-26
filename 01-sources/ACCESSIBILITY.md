# Ahan Asa Website — Accessibility Standard

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `ACCESSIBILITY.md`  
> **Status:** Draft v1.0 — Implementation and release contract  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian (Farsi), fully RTL  
> **Conformance target:** WCAG 2.2 Level AA  
> **Applies to:** All public Phase 1 pages, components, forms, files, media, and primary user journeys

---

## 1. Purpose

This document defines the accessibility requirements for the Ahan Asa website. It converts the accessibility direction established in `PROJECT_BRIEF.md`, `DESIGN_DIRECTION.md`, and `DESIGN_SYSTEM.md` into testable implementation rules for Claude Code, designers, developers, content authors, and QA reviewers.

Accessibility is part of product quality and release acceptance. It must be built into content, design, components, and engineering from the start; it is not a visual add-on or a final automated scan.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate requirement strength.

## 2. Accessibility Objective

All public Phase 1 content and functionality MUST conform to **WCAG 2.2 Level AA** across representative desktop and mobile experiences.

The implementation MUST support users who:

- navigate only with a keyboard;
- use screen readers or other assistive technologies;
- zoom, enlarge text, or use a narrow viewport;
- have low vision or color-vision differences;
- use voice input, switch access, or touch input;
- reduce or disable motion;
- need clear instructions, predictable interactions, and recoverable errors;
- read Persian RTL content containing Latin text, phone numbers, measurements, codes, and technical data.

Passing an automated audit alone does not establish conformance. Release requires automated checks, manual keyboard testing, zoom/reflow testing, and assistive-technology testing of critical journeys.

## 3. Scope

This standard applies to:

- global navigation, header, footer, breadcrumbs, and mobile menu;
- all Persian content pages and future localized versions;
- inquiry, contact, quotation, invoice, and material-list submission flows;
- form validation, confirmation, failure, retry, and loading states;
- file upload and download interactions;
- tables, technical specifications, comparison content, and mixed-direction data;
- accordions, tabs, dialogs, menus, tooltips, alerts, and status messages;
- images, icons, video, audio, and downloadable documents;
- cookie, privacy, analytics-consent, or third-party interfaces if introduced;
- errors, empty states, offline/network failure states, and `404`/`500` pages;
- SEO-critical and server-rendered content before client-side JavaScript loads.

The standard applies to both reusable components and every page-level composition. A compliant component can become inaccessible when used with the wrong label, order, color, copy, or surrounding structure.

## 4. Source Hierarchy

When requirements conflict, follow this order unless `CLAUDE.md` establishes a stricter hierarchy:

1. Approved owner decisions recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `DESIGN_SYSTEM.md`
6. This `ACCESSIBILITY.md`
7. Component, page, motion, responsive, content, and QA specifications
8. Task-specific implementation instructions

This document may make accessibility rules more explicit, but it MUST NOT weaken an approved requirement in a higher-authority document.

## 5. Standards and Interpretation

### 5.1 Normative target

- Standard: **Web Content Accessibility Guidelines (WCAG) 2.2**
- Conformance level: **AA**
- Conformance scope: complete public pages and complete user processes, not isolated components
- Baseline principles: perceivable, operable, understandable, and robust

### 5.2 Supporting guidance

Use the W3C Web Accessibility Initiative resources listed in Section 37 to interpret requirements. Use WAI-ARIA Authoring Practices for the expected semantics and keyboard behavior of custom widgets.

Techniques and code examples are implementation guidance, not substitutes for meeting the WCAG success criteria.

### 5.3 Conformance claims

Ahan Asa MUST NOT publish a WCAG badge, certification statement, or claim of complete conformance until an appropriate evaluation has been completed and documented. Automated scores or overlay-tool reports MUST NOT be presented as proof of conformance.

This document is an engineering standard, not legal certification or jurisdiction-specific legal advice.

## 6. Non-Negotiable Release Baseline

Every production page and flow MUST provide:

- valid `lang` and `dir` metadata;
- semantic landmarks and a unique `main` region;
- a keyboard-accessible skip link;
- one descriptive page `h1` and logical heading order;
- complete keyboard access without traps;
- visible focus that is not hidden by sticky content;
- sufficient text and non-text contrast;
- meaningful alternative text for informative images;
- accessible names for all controls;
- persistent labels for form fields;
- programmatically connected instructions and errors;
- clear success, failure, loading, and retry feedback;
- reflow without two-dimensional page scrolling at `320 CSS px`, except legitimate data exceptions;
- usable content at `200%` text resize and `400%` browser zoom;
- alternatives to drag-only or motion-dependent interaction;
- reduced-motion support;
- no meaning conveyed only by color, position, shape, sound, or animation;
- captions and/or transcripts for meaningful time-based media;
- accessible status announcements without unnecessary focus movement;
- equivalent access when JavaScript, animation, or images fail to load.

## 7. Document Language, Direction, and RTL

### 7.1 Root metadata

The Persian website MUST begin with:

```html
<html lang="fa" dir="rtl">
```

Future locales MUST set their actual language and direction. Components MUST NOT hard-code RTL when direction can be inherited from the document or locale boundary.

### 7.2 Mixed-direction content

- Persian prose inherits `dir="rtl"`.
- Email addresses, URLs, tracking codes, SKUs, international phone numbers, and other genuinely LTR values SHOULD use a local `dir="ltr"` boundary.
- Isolated dynamic values SHOULD use `<bdi>` when their direction is unknown.
- Use Unicode bidi isolation or semantic direction boundaries; do not reorder characters manually.
- Technical values MUST preserve the relationship between number, decimal separator, unit, sign, and range.
- Copy-to-clipboard values MUST copy in their logical order, regardless of visual order.

Example:

```html
<p>
  شماره پیگیری:
  <bdi dir="ltr">AA-1405-0831</bdi>
</p>
```

### 7.3 RTL interaction order

- DOM order MUST match the intended reading and keyboard order.
- CSS visual reordering MUST NOT create a mismatch between visual, reading, and focus order.
- Do not use positive `tabindex` values to repair a layout-order problem.
- Persian process steps progress right-to-left on wide screens and top-to-bottom on narrow screens.
- Directional arrows, chevrons, previous/next controls, and progress indicators MUST mirror when their meaning depends on direction.
- Logos, phone icons, search icons, download icons, and universal media controls MUST NOT be mirrored.
- A local LTR field MUST NOT switch the direction of the entire form row.

## 8. Semantic Page Structure

### 8.1 Landmarks

Use native structural elements where available:

- `<header>` for the page or site header;
- `<nav aria-label="…">` for distinct navigation regions;
- one `<main id="main-content">` per page;
- `<aside>` only for genuinely complementary content;
- `<footer>` for site-level footer information.

When more than one navigation region exists, each MUST have a distinct Persian accessible label.

### 8.2 Skip link

The first focusable element MUST be a visible-on-focus link to the main content.

```html
<a class="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
```

The target MUST accept reliable focus and MUST not be hidden beneath the sticky header.

### 8.3 Headings

- Each page MUST have one descriptive `h1` representing the page topic.
- Headings MUST represent structure, not visual size.
- Levels SHOULD be sequential; skipped levels require a structural reason.
- Do not use an empty heading or style ordinary text as a false heading.
- Accordion triggers may contain headings when they truly define document sections.
- Visually hidden headings MAY label important regions when a visible heading would be redundant.

### 8.4 Lists and grouped content

- Use ordered lists for sequence and unordered lists for collections.
- Navigation collections SHOULD use list semantics.
- Use `<dl>`, `<dt>`, and `<dd>` for key-value specifications when that relationship is correct.
- Do not simulate lists, headings, or tables with generic `<div>` elements.

### 8.5 Source and reading order

Content MUST remain logical when CSS is disabled. Grid and flexbox order properties MUST NOT be used to create a visual sequence that conflicts with DOM order.

## 9. Keyboard Access

### 9.1 Universal rules

- Every interactive function MUST be available using a keyboard.
- Tab and Shift+Tab move through interactive elements in logical order.
- Enter activates links and buttons where expected.
- Space activates native buttons and toggles where expected.
- Escape closes dismissible overlays and menus where the pattern permits.
- Arrow keys MUST follow the chosen WAI-ARIA pattern for composite widgets.
- Keyboard users MUST never become trapped in a component.
- Hidden, inert, or collapsed content MUST NOT remain in the tab order.
- Clickable non-interactive elements such as `<div onClick>` are prohibited.
- Custom keyboard behavior MUST NOT override standard browser and assistive-technology shortcuts.

### 9.2 `tabindex`

- Native interactive elements are preferred.
- `tabindex="0"` MAY add an element to sequential focus only when the element has valid semantics and keyboard behavior.
- `tabindex="-1"` MAY support programmatic focus for headings, error summaries, or dialog content.
- Positive `tabindex` values are prohibited.

### 9.3 Shortcuts

Single-character keyboard shortcuts MUST NOT be introduced unless users can turn them off, remap them, or they operate only while the relevant control has focus.

## 10. Focus Management and Appearance

### 10.1 Focus visibility

- Never remove `outline` without an accessible replacement.
- Every interactive control MUST have a visible `:focus-visible` state.
- Focus MUST remain visible on White, Warm Cream, Steel Navy, Forge Copper, image, and functional-state surfaces.
- The indicator MUST have at least `3:1` contrast against adjacent colors.
- The focus style MUST not rely on color alone when it can be confused with a border state.

Approved surface strategy:

```css
:focus-visible {
  outline: 2px solid var(--aa-color-focus-ring, #B04A2F);
  outline-offset: 3px;
}

[data-surface="navy"] :focus-visible,
[data-surface="copper"] :focus-visible {
  outline-color: #FFFFFF;
}

[data-surface="media"] :focus-visible {
  outline: 2px solid #FFFFFF;
  box-shadow: 0 0 0 4px #0B2545;
}
```

Do not use Copper alone as a focus indicator on Steel Navy because that brand pair is below the required non-text contrast threshold.

### 10.2 Focus not obscured

- Sticky headers, cookie banners, chat widgets, bottom bars, and dialogs MUST NOT fully hide the focused element.
- Use appropriate `scroll-padding-block-start` and `scroll-margin-block-start` values.
- Programmatic focus changes MUST scroll the target into a visible, understandable position.

### 10.3 Programmatic focus

Move focus only when it helps users understand a context change, for example:

- into an opened modal dialog;
- to an error summary after a failed multi-error submission;
- to the newly loaded route heading in a client-side navigation model, when required by the routing architecture;
- to a confirmation heading after a major step when the new view replaces the task context.

Do not move focus for ordinary status updates, inline validation, filter changes, or background loading.

### 10.4 Focus restoration

When a modal, mobile navigation overlay, popover, or temporary UI closes, focus MUST return to the element that opened it. If that element no longer exists, focus MUST move to the nearest logical control or heading.

## 11. Pointer, Touch, and Alternative Input

- WCAG 2.2 minimum target size is `24 × 24 CSS px`, subject to its defined exceptions.
- The Ahan Asa system standard is at least `44 × 44 CSS px` for primary buttons, icon buttons, menu items, close controls, upload controls, and mobile interactions.
- Adjacent targets MUST have enough spacing to prevent accidental activation.
- Actions MUST generally occur on click/tap release, not pointer-down.
- Users MUST be able to cancel or undo consequential pointer actions where applicable.
- Hover MUST never be the only way to reveal essential content or functionality.
- Drag-and-drop MUST have a non-drag alternative, such as a browse button or direct selection controls.
- Gestures requiring multiple fingers, paths, or device motion MUST have a simple pointer alternative.
- Device orientation MUST NOT be locked unless a specific orientation is essential.

## 12. Color and Contrast

### 12.1 Required ratios

- Normal text: at least `4.5:1`.
- Large text: at least `3:1`.
- Essential icons, focus indicators, input boundaries, and component states: at least `3:1` against adjacent colors.
- Disabled controls are not required to meet the same contrast criterion, but they MUST remain understandable and MUST NOT be used when an explanation would better support completion.

For contrast evaluation, large text means at least `24px` regular or approximately `18.66px` bold, assuming standard CSS pixel interpretation.

### 12.2 Approved brand pairs

The following ratios are inherited from `DESIGN_SYSTEM.md`:

| Pair | Ratio | Approved use |
|---|---:|---|
| Steel Navy `#0B2545` on White `#FFFFFF` | `15.39:1` | All text sizes, icons, and controls |
| White on Steel Navy | `15.39:1` | All text sizes, icons, and controls |
| White on Forge Copper `#B04A2F` | `5.43:1` | Normal text and action labels |
| Forge Copper on White | `5.43:1` | Normal text, links, and icons |
| Steel Navy on Warm Cream `#FBF5EB` | `14.19:1` | All text sizes, icons, and controls |
| Forge Copper on Warm Cream | `5.01:1` | Normal text and controlled accents |
| Steel Navy on Forge Copper | `2.83:1` | Prohibited for normal text and essential UI |

### 12.3 Color-use rules

- Color MUST NOT be the only indicator of error, success, warning, selection, status, category, or required state.
- Links inside body copy MUST have a persistent non-color cue, normally an underline.
- Selected and active states require text, icon, border, shape, weight, or another non-color cue.
- Copper is a restrained brand accent, not an error or warning color.
- Functional colors MUST use their defined semantics.
- Text over photography or video requires a tested solid or sufficiently opaque surface; unverified image-dependent contrast is prohibited.
- Gradients MUST NOT be used behind essential text unless the worst point in the gradient passes contrast testing.

### 12.4 Forced colors and high contrast

Controls MUST remain identifiable in operating-system forced-color modes. Do not remove native boundaries without supplying a forced-colors treatment. Use `currentColor`, system colors, outlines, and borders where appropriate.

## 13. Typography, Zoom, and Reflow

### 13.1 Typography

- Default body text MUST be at least `16px`.
- Supporting copy below `14px` is prohibited except for nonessential legal or data annotations that remain readable.
- Persian body copy SHOULD use the approved readable line-height from the typography system.
- Very thin font weights are prohibited.
- Essential information MUST NOT be embedded only in an image.
- Text MUST remain readable during font loading and if the preferred web font fails.

### 13.2 Text resizing

At `200%` text-only resize:

- content and controls MUST not overlap or clip;
- labels, errors, buttons, navigation, and dialogs MUST remain usable;
- text MUST not be truncated unless an accessible expansion mechanism exists;
- fixed heights MUST NOT prevent text growth.

### 13.3 Reflow and zoom

At `400%` browser zoom and a viewport equivalent to `320 CSS px` wide:

- page content MUST reflow into one primary direction;
- no page-level horizontal scrolling is allowed;
- no essential information or functionality may be lost;
- sticky elements MUST not consume an unreasonable part of the viewport;
- dialogs and menus MUST fit within the viewport and allow internal scrolling when necessary.

Legitimate two-dimensional content such as a technical table MAY scroll inside a clearly labeled container. The entire page MUST NOT become horizontally scrollable.

### 13.4 Text spacing

Content MUST remain usable when users override text spacing to WCAG test values, including increased line height, paragraph spacing, letter spacing, and word spacing. Components MUST not depend on exact single-line text fitting.

## 14. Content and Comprehension

- Write clear, direct Persian appropriate for professional B2B buyers.
- Explain technical or procurement terms when the intended audience may not know them.
- Use consistent names for the same action and destination.
- Avoid vague link text such as “اینجا کلیک کنید”.
- Instructions MUST not depend only on position, color, shape, or sensory references such as “the red button on the left.”
- Error messages MUST identify the issue and explain how to recover.
- Required and optional status MUST be stated consistently.
- Units, dates, ranges, currencies, and technical abbreviations MUST be unambiguous.
- Important purchasing scope, exclusions, or risk information MUST not be hidden only inside a collapsed accordion.
- Do not use fabricated urgency, fake counters, unsupported claims, or confusing marketplace language.

## 15. Links, Buttons, and Controls

### 15.1 Links versus buttons

- A link navigates to a URL.
- A button performs an action, changes state, submits data, or opens an interface.
- Do not use a link styled as a button for a non-navigation action.
- Do not use a button for ordinary document navigation when a real link is appropriate.

### 15.2 Accessible names

- Every control MUST have an accessible name that describes its purpose.
- Visible text SHOULD be included in the accessible name to support voice control.
- Icon-only buttons require an accessible name; a tooltip is not a substitute.
- Repeated links with the same visible text MUST remain understandable from context or have a more specific accessible name.
- Do not add redundant `aria-label` text that conflicts with visible content.

### 15.3 New windows and downloads

- Avoid opening new tabs by default.
- When a new context is necessary, communicate it in visible or accessible text.
- Download links SHOULD identify file type and, when known, file size.
- Icon decoration MUST be hidden from assistive technology when the adjacent text already names the action.

### 15.4 Disabled controls

- Prefer keeping the submit control available and explaining validation errors on activation.
- If a control must be disabled, the reason MUST be available before users reach it.
- Disabled appearance MUST not rely on opacity alone.

## 16. Images, Icons, and Graphics

### 16.1 Alternative text

- Informative images require concise alternative text that conveys their purpose in context.
- Decorative images MUST use `alt=""` and MUST NOT receive an unnecessary accessible name.
- Linked images MUST describe the link destination or action, not merely their appearance.
- Complex diagrams require a short alternative plus an adjacent detailed text explanation or data equivalent.
- Do not begin alternative text with redundant phrases equivalent to “image of.”
- Do not repeat a caption verbatim unless it is the only meaningful alternative.

### 16.2 Brand marks

- The linked Ahan Asa logo SHOULD have an accessible name equivalent to “آهن آسا — صفحه اصلی”.
- A decorative logo in a context where the brand name is already announced SHOULD use empty alternative text.
- Inline SVGs with meaning require an accessible name through an appropriate `<title>`, `aria-labelledby`, or equivalent method.
- Decorative SVGs MUST use `aria-hidden="true"` and must not be focusable.
- The approved logo geometry MUST not be modified for accessibility; instead select an approved color treatment with sufficient contrast.

### 16.3 Charts and technical graphics

If charts or diagrams are introduced:

- provide the underlying data or a meaningful text summary;
- identify units, timeframe, source, and status;
- do not distinguish series by color alone;
- ensure labels and markers meet contrast requirements;
- keep essential values available without hover.

Decorative charts or unsupported percentage graphics are prohibited.

## 17. Audio, Video, and Motion Media

- Meaningful prerecorded video requires synchronized captions.
- Meaningful audio information requires a transcript.
- Visual information needed to understand a video requires audio description or an equivalent text alternative when appropriate.
- Autoplay with sound is prohibited.
- Long decorative autoplay video is outside the approved design direction.
- Media controls MUST be keyboard accessible, labeled, and sufficiently large.
- Users MUST be able to pause, stop, or hide moving content that starts automatically and lasts more than five seconds, unless essential.
- Do not flash content more than accessibility thresholds permit.
- Captions MUST be accurate Persian captions, not unreviewed automatic output.

## 18. Motion and Reduced Motion

- Respect `prefers-reduced-motion: reduce`.
- Reduced-motion mode MUST remove parallax, scroll-linked transformations, large spatial movement, animated counters, looping decoration, and nonessential page transitions.
- State changes MUST remain understandable when animation is removed.
- Do not require motion, swiping, or animation timing to understand content or complete a task.
- Motion triggered by interaction that could cause discomfort MUST be disableable unless essential.

Minimum fallback:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Component-specific reduced-motion behavior is still required; the global fallback does not replace deliberate testing.

## 19. Forms and Inquiry Flows

### 19.1 Labels and instructions

- Every input MUST have a persistent programmatically associated label.
- Placeholder text MAY show an example but MUST NOT replace a label.
- Required fields MUST use the native `required` attribute where appropriate and visible text that explains the convention.
- Format, unit, file, and privacy instructions MUST appear before users submit.
- Related controls MUST use `fieldset` and `legend` when the relationship matters.
- Use appropriate `type`, `inputmode`, and `autocomplete` values.
- Do not disable paste in email, phone, code, or confirmation fields.

### 19.2 LTR values inside RTL forms

- Email, phone, URL, code, and reference-number inputs SHOULD use `dir="ltr"` while their visible labels remain Persian and RTL.
- Value direction MUST not change visual or keyboard order of the form.
- Country code and phone placement MUST remain consistent with the approved form specification in both RTL and future LTR locales.

### 19.3 Validation

- Validate on submit and, where helpful, after blur; do not show errors while users are still typing incomplete values.
- Do not clear valid user input after validation or server errors.
- Error styling MUST include specific text and MUST not depend only on color.
- Set `aria-invalid="true"` only while the field is invalid.
- Connect help and error text with `aria-describedby` or the framework-equivalent accessible relationship.
- When multiple errors exist, show an error summary, focus it, and link each summary item to the relevant field.
- Focus the first invalid field only when there is no error summary or after the user activates a summary link.
- Server and network errors MUST provide a safe retry path.

Example:

```html
<label for="email">ایمیل</label>
<input
  id="email"
  name="email"
  type="email"
  dir="ltr"
  autocomplete="email"
  aria-invalid="true"
  aria-describedby="email-hint email-error"
>
<p id="email-hint">نمونه: name@example.com</p>
<p id="email-error">نشانی ایمیل را با قالب صحیح وارد کنید.</p>
```

### 19.4 Submission states

- The submit button MUST prevent duplicate submissions without losing its accessible name.
- Loading feedback MUST be conveyed in text, not only by a spinner.
- A spinner is decorative when adjacent text already announces the state.
- Success and failure messages MUST be announced through an appropriate status region.
- Ordinary success messages SHOULD NOT unexpectedly steal focus.
- Confirmation MUST state what happened and what the user can expect next without inventing a response-time promise.

### 19.5 Privacy and sensitive information

- Ask only for information necessary for the approved business process.
- Explain why unusually sensitive information is requested before collection.
- Do not place personal information in URLs, analytics event labels, or client-side logs.
- Error messages MUST not expose server details or uploaded file paths.

## 20. File Upload

The invoice/material-list submission path is a primary conversion journey and MUST receive full keyboard and screen-reader testing.

- A standard file-browse control MUST always be available.
- Drag-and-drop MAY supplement browse but MUST never be the only method.
- Before selection, state accepted types, maximum size, maximum quantity, and any verified privacy/retention information.
- After selection, show and announce filename, file type, size, validation result, upload progress, success, failure, and removal options as applicable.
- Removal controls MUST identify the file they remove.
- Progress updates SHOULD be polite and must not announce every minor percentage change.
- Upload cancellation and retry MUST be keyboard accessible.
- A failed upload MUST not erase other completed fields.
- Client-side validation MUST be repeated securely on the server; accessibility feedback must remain equivalent.
- Do not claim that a file is encrypted, scanned, retained, deleted, or private unless the production workflow verifies that statement.

## 21. Navigation

### 21.1 Header and primary navigation

- Use a labeled navigation landmark.
- Current-page state MUST be programmatically indicated, normally with `aria-current="page"`.
- Desktop dropdowns MUST work by keyboard, pointer, and touch; hover alone is insufficient.
- Menu triggers MUST be buttons with accurate expanded state and controlled-element relationship.
- Navigation labels MUST remain clear when read outside visual context.

### 21.2 Mobile navigation

- The menu trigger MUST have a Persian accessible name and current `aria-expanded` state.
- If the menu behaves as an overlay, focus MUST move into it, remain contained while modal, and return to the trigger on close.
- Escape and the visible close button MUST close the overlay.
- Background content MUST be inert while a modal menu is open.
- The mobile menu MUST remain usable at `400%` zoom and in landscape orientation.
- Opening or closing the menu MUST not cause unexpected route navigation.

### 21.3 Breadcrumbs

- Render inside a labeled `<nav>` and ordered list.
- Use `aria-current="page"` on the current item or render it as plain text.
- Decorative separators MUST be hidden from assistive technology.
- Separator direction MUST be correct in RTL.

### 21.4 Pagination

- Use real links for indexable pages.
- Provide Persian previous and next labels, not icon-only controls.
- Identify the current page programmatically.
- Do not use infinite scroll for primary project, resource, insight, or evidence archives.

## 22. Component Patterns

### 22.1 Accordion and disclosure

- Use a semantic button as the trigger.
- Maintain accurate `aria-expanded` and `aria-controls` states.
- The full visible trigger row SHOULD activate the disclosure.
- The panel MUST be removed from the tab order while hidden.
- Chevron direction and motion MUST be RTL-safe and reduced-motion safe.
- Essential scope or process information MUST not exist only in a collapsed state.

### 22.2 Tabs

- Use tabs only for peer views of the same context.
- Implement the complete selected WAI-ARIA tabs pattern.
- Arrow-key behavior MUST match orientation and direction.
- Active state MUST not rely on color alone.
- Important content SHOULD have a direct link or persistent state.
- On narrow screens, use an accessible scroll affordance or a simpler disclosure pattern.

### 22.3 Modal dialogs

- Use dialogs only for focused, short tasks.
- Long inquiry or procurement workflows MUST use a dedicated page.
- Give the dialog an accessible name and, when useful, a concise description.
- Move focus to an appropriate element when opened.
- Keep focus inside the modal while open.
- Make background content inert.
- Support Escape unless closing could cause unsafe data loss; then warn and provide an explicit choice.
- Include a visible, labeled close control.
- Restore focus to the trigger on close.
- Ensure the top of long dialog content is visible when opened.

### 22.4 Tooltips and hover content

- Tooltips MAY supplement unfamiliar controls but MUST NOT replace visible labels or essential instructions.
- Content shown on hover or focus MUST be dismissible, hoverable, and persistent until dismissed, focus/hover moves away, or the information becomes invalid.
- Tooltip content MUST not contain essential actions.
- Escape SHOULD dismiss a tooltip without moving focus.

### 22.5 Alerts, toasts, and status messages

- Use `role="status"` or `aria-live="polite"` for non-urgent status changes.
- Use `role="alert"` only for important, time-sensitive errors that must be announced immediately.
- Do not automatically focus routine toasts.
- Toasts containing essential information MUST remain long enough to read and have an accessible dismissal or persistent equivalent.
- Status text MUST remain available visually; screen-reader-only announcements do not replace visible feedback.

```html
<div role="status" aria-live="polite" aria-atomic="true">
  درخواست شما با موفقیت ثبت شد.
</div>
```

### 22.6 Cards

- Do not create nested interactive controls inside an entire-card link.
- If the whole card navigates, use one semantic link with a clear accessible name and focus state.
- Do not duplicate the same destination through multiple separately focusable links unless each serves a distinct purpose.

### 22.7 Carousels

Carousels SHOULD be avoided. If one is explicitly approved:

- it MUST not auto-advance by default;
- users MUST be able to pause movement;
- controls MUST be labeled and keyboard accessible;
- current slide and total slide context MUST be available;
- hidden slides MUST not remain in the tab order;
- swipe MUST have button alternatives;
- reduced-motion preferences MUST be honored.

## 23. Tables and Technical Data

- Use real table markup for tabular relationships.
- Provide a visible heading or `<caption>` that identifies the table.
- Use `<th>` with correct `scope` for row and column headers.
- More complex tables MUST programmatically associate data and headers.
- Do not use tables for page layout.
- Units MUST appear in headers or cells in a way that remains understandable when read linearly.
- Numeric values, model codes, and Latin abbreviations MUST use safe bidi isolation.
- Sorting controls MUST be real buttons and announce the current sort direction.
- Meaning MUST not rely on cell background color alone.
- Sticky headers MUST not cover focused elements or obscure magnified content.
- On small screens, use a labeled horizontal-scroll container or a documented semantic transformation.
- If a table transforms into cards, every header-value relationship MUST remain explicit.

Example scroll wrapper:

```html
<div
  class="table-scroll"
  role="region"
  aria-label="جدول مقایسه مشخصات"
  tabindex="0"
>
  <table>…</table>
</div>
```

Only add `tabindex="0"` when keyboard scrolling is actually needed and tested; avoid adding unnecessary tab stops.

## 24. Downloadable Documents

- Public PDFs and office documents SHOULD be accessible at source.
- Essential information SHOULD also be available as accessible HTML when practical.
- Link text MUST identify document purpose and format; include file size when known.
- PDFs MUST have a document title, correct reading order, tagged headings, lists and tables, meaningful link text, alternative text for informative images, declared language, and usable form fields where applicable.
- Scanned image-only documents require OCR plus manual correction or an accessible HTML equivalent.
- Do not label a document “accessible” until it has been manually verified.
- Replacing an accessible HTML flow with a PDF-only flow requires approval.

## 25. Errors, Empty States, and System Feedback

- Error pages MUST keep the site identity, page title, main landmark, and a clear recovery path.
- `404` pages MUST offer navigation to the homepage and relevant primary destinations.
- `500` and network-error states MUST not expose technical stack traces.
- Empty results MUST explain why the state may be empty and offer a useful next step.
- Loading placeholders MUST not be announced as real content.
- Skeletons and spinners MUST not create repeated screen-reader noise.
- If content refreshes dynamically, announce only meaningful results such as “۱۲ نتیجه نمایش داده شد”.
- Do not use color, animation, or icons alone to communicate state.

## 26. Dynamic Content and Progressive Enhancement

- Core navigation, page content, contact information, and SEO-critical information MUST be available in server-rendered HTML.
- JavaScript enhancement MUST not remove native semantics.
- Client-side route changes MUST update the document title and provide an understandable focus/announcement strategy.
- Async content MUST preserve focus unless the user's action intentionally changes context.
- Hydration or network failure MUST leave a readable and navigable page where possible.
- Do not hide content with CSS before JavaScript initializes unless a no-script or resilient fallback exists.

## 27. ARIA Rules

### 27.1 Native first

Use native HTML whenever it provides the required semantics and behavior. Native `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `<details>`, `<dialog>`, headings, lists, and tables are preferred over custom role-based replacements when they satisfy the interaction.

### 27.2 ARIA constraints

- ARIA MUST NOT conflict with native semantics.
- Every referenced ID in `aria-labelledby`, `aria-describedby`, `aria-controls`, or `aria-errormessage` MUST exist and be unique.
- Required states such as `aria-expanded`, `aria-selected`, `aria-pressed`, and `aria-current` MUST update with the visual state.
- Hidden content MUST not be exposed through stale ARIA relationships.
- `aria-hidden="true"` MUST NOT be applied to a focusable element or an ancestor containing focus.
- Live regions MUST exist before the update they announce.
- Do not add roles or labels to “improve” semantics without testing the resulting accessibility tree.
- No ARIA is better than incorrect ARIA.

## 28. Responsive Accessibility

- Accessibility requirements apply at every supported viewport, not only desktop.
- Responsive transformations MUST preserve names, roles, states, relationships, and keyboard access.
- Content MUST not disappear solely because the viewport is small unless it is genuinely duplicate or decorative.
- Mobile order MUST follow DOM and reading order.
- Touch targets MUST remain large enough after responsive compression.
- Fixed headers and bottom CTAs MUST not cover focused controls, form errors, or browser zoom content.
- Device-safe areas MUST be respected where relevant.
- Hover-only controls MUST gain visible, persistent touch equivalents.
- Landscape mobile and enlarged-text states MUST be tested, not inferred.

## 29. Performance and Accessibility

- Accessibility MUST not depend on a slow client bundle.
- Font loading MUST avoid invisible text.
- Image dimensions MUST be reserved to prevent layout movement that disrupts magnification and focus.
- Lazy loading MUST not remove discoverability or reading order.
- Do not delay essential labels, errors, or navigation while decorative media loads.
- Avoid continuous animations, heavy blur, and large interaction libraries that reduce responsiveness.
- Input response and focus feedback SHOULD remain immediate on representative mobile devices.

## 30. Third-Party Content and Integrations

Before adding maps, chat widgets, consent tools, video players, CRM forms, CAPTCHA, analytics interfaces, or embedded content:

1. evaluate keyboard, screen-reader, zoom, contrast, and reduced-motion behavior;
2. document known limitations;
3. prefer the most accessible available configuration;
4. provide an equivalent alternative when the third party blocks a critical task;
5. ensure the embed has a descriptive title;
6. verify that it does not trap focus, obscure content, or inject unlabeled controls.

CAPTCHA MUST NOT be the sole path to form completion. Accessibility-overlay products MUST NOT be used as a substitute for accessible code and content.

## 31. Testing Strategy

### 31.1 Test layers

Accessibility verification MUST include all of the following:

1. **Static analysis** — semantic and JSX linting during development.
2. **Component tests** — names, roles, states, keyboard behavior, and focus.
3. **Automated browser tests** — axe or an equivalent rules engine on representative routes and states.
4. **Manual keyboard tests** — complete every critical journey without a pointer.
5. **Zoom/reflow tests** — `200%` text resize, `400%` zoom, `320 CSS px`, and landscape mobile.
6. **Screen-reader tests** — representative desktop and mobile combinations.
7. **Visual tests** — contrast, focus on every surface, forced colors, high contrast, and reduced motion.
8. **Content review** — headings, labels, alternative text, instructions, error clarity, and document accessibility.

### 31.2 Recommended development tooling

For a React/Next.js implementation, the project SHOULD use the appropriate current versions of:

- `eslint-plugin-jsx-a11y` or equivalent lint rules;
- `axe-core` through component and/or browser integration;
- Playwright for keyboard, focus, viewport, and critical-flow regression tests;
- Lighthouse as a supporting signal, not a conformance certificate;
- a contrast analyzer and browser accessibility-tree inspection.

Tooling choices MUST be recorded in `TESTING_STRATEGY.md` and package versions MUST be locked by the project package manager.

### 31.3 Automated-test acceptance

- No known critical or serious accessibility violations may remain on launch routes or critical states.
- Automated checks MUST include opened menus/dialogs, form errors, success states, file-upload states, accordions, and tables—not only the default page view.
- Suppression of an automated rule requires a documented false-positive rationale.
- A high Lighthouse score does not override a manual failure.

### 31.4 Manual keyboard script

For every tested page:

1. Reload and do not use the mouse.
2. Confirm the skip link appears first and reaches main content.
3. Tab forward and backward through all controls.
4. Confirm focus order matches visual and reading order.
5. Confirm focus remains visible and unobscured.
6. Operate menus, disclosures, tabs, dialogs, forms, upload, and pagination.
7. Confirm Escape, Enter, Space, and arrow keys behave according to the component pattern.
8. Confirm hidden elements are not focusable.
9. Confirm focus returns correctly after overlays close.
10. Complete the primary inquiry journey and recover from errors.

### 31.5 Assistive-technology matrix

At minimum, critical journeys SHOULD be tested with:

| Platform | Browser | Assistive technology | Priority |
|---|---|---|---|
| Windows | Chrome or Edge | NVDA | Required desktop baseline |
| macOS | Safari | VoiceOver | Required desktop baseline |
| iOS | Safari | VoiceOver | Required mobile baseline |
| Android | Chrome | TalkBack | Recommended mobile coverage |

Test Persian pronunciation, labels, reading order, mixed-direction values, errors, status announcements, and component states. Exact browser and assistive-technology versions MUST be recorded in the QA report.

## 32. Critical User Journeys

The following journeys MUST pass manual accessibility testing before release:

1. Open the homepage, use the skip link, understand the value proposition, and reach the primary CTA.
2. Open and close desktop and mobile navigation, identify current location, and reach an inner page.
3. Read a service/process page using headings and landmarks.
4. Review technical specifications or a comparison table at narrow width and high zoom.
5. Begin the inquiry flow, complete required fields, encounter and correct validation errors.
6. Select, remove, fail, retry, and successfully upload an approved invoice or material-list file when upload is enabled.
7. Submit an inquiry and understand success, failure, and next-step feedback.
8. Open, use, and close any approved dialog or disclosure.
9. Find and download an accessible resource.
10. Recover from `404`, `500`, network, and empty-result states.

## 33. Component Accessibility Contract

Each reusable interactive component MUST document:

- semantic element or ARIA pattern;
- accessible name source;
- keyboard behavior;
- focus entry, containment, and restoration behavior;
- visual states: default, hover, focus-visible, active, disabled, loading, success, and error as applicable;
- screen-reader announcements;
- RTL and LTR behavior;
- reduced-motion behavior;
- zoom/reflow behavior;
- touch target size;
- automated and manual tests;
- known restrictions and prohibited compositions.

A component is not complete until these items are defined and verified.

## 34. Defect Severity and Release Policy

### 34.1 Severity levels

| Severity | Definition | Examples | Release rule |
|---|---|---|---|
| Blocker | A critical journey is unavailable to a user group | Keyboard trap; unlabeled required input; inaccessible submission; focus lost in modal | Must fix before release |
| High | Major content or functionality is difficult or unreliable | Missing error association; hidden focus; unreadable contrast; broken RTL reading order | Must fix before release |
| Medium | Local barrier with a practical workaround | Weak link context; imperfect announcement; small isolated target | Fix before release unless formally accepted |
| Low | Improvement that does not currently block access | Redundant announcement; minor verbosity | Track with owner and due date |

### 34.2 Exceptions

An exception requires:

- affected page/component and user impact;
- relevant WCAG criterion;
- reason the issue cannot be fixed before release;
- verified alternative path;
- owner and remediation date;
- explicit approval recorded in `DECISIONS.md`.

No exception may permit a Blocker in the primary inquiry journey.

## 35. Definition of Done

A page or component is accessibility-complete only when:

- semantic structure is correct;
- keyboard behavior is complete;
- focus styling and management are verified;
- accessible names, descriptions, states, and errors are correct;
- contrast passes for all states and surfaces;
- RTL, mixed-direction values, and visual order are verified;
- reduced-motion behavior is implemented;
- `320 CSS px`, `200%` text resize, and `400%` zoom tests pass;
- touch targets meet the project standard;
- automated checks pass without undocumented suppression;
- relevant screen-reader tests pass;
- loading, empty, success, error, and retry states are tested;
- content and alternative text are approved;
- no known Blocker or High issue remains.

## 36. Claude Code Implementation Mandates

Claude Code MUST:

1. Read `PROJECT_BRIEF.md`, `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`, and this document before implementing production UI.
2. Prefer semantic HTML and native controls before adding ARIA.
3. Treat `lang="fa"`, `dir="rtl"`, logical CSS properties, and bidi isolation as architecture requirements.
4. Reuse approved tokens and component patterns; do not introduce inaccessible one-off colors or interactions.
5. Implement keyboard, focus, reduced-motion, and error behavior in the initial component change.
6. Never remove focus outlines or hide labels for visual cleanliness.
7. Never use placeholder text as the only label.
8. Never encode state or meaning with color alone.
9. Never use positive `tabindex` values.
10. Never build a clickable `<div>` or `<span>` when a native interactive element applies.
11. Never introduce drag-only, hover-only, icon-only-without-name, or motion-dependent functionality.
12. Never add an accessibility overlay as a substitute for code-level remediation.
13. Add or update accessibility tests whenever an interactive component changes.
14. Test all component states, not only the default state.
15. Preserve user input and provide recovery during validation and server failure.
16. Stop and report a conflict when a requested visual treatment cannot meet this standard without changing an approved higher-level decision.

### 36.1 Required pull-request evidence

Every UI pull request SHOULD state:

- pages and components changed;
- keyboard test performed;
- automated accessibility result;
- focus behavior verified;
- RTL and mixed-direction behavior verified;
- narrow-width/zoom result;
- reduced-motion result;
- screen-reader test performed when the change affects a critical flow;
- any exception reference.

### 36.2 Prohibited shortcuts

- hiding visible text while leaving an unlabeled icon;
- adding ARIA roles without required keyboard behavior;
- suppressing automated failures without investigation;
- using `outline: none` globally;
- using CSS order to repair incorrect DOM structure;
- announcing every dynamic update through assertive live regions;
- placing essential instructions only in a tooltip, placeholder, image, or collapsed panel;
- claiming WCAG conformance based on a single tool score.

## 37. Pre-Release Accessibility Checklist

### Structure and content

- [ ] Correct page title and Persian `lang`/`dir`
- [ ] One `main` region and one descriptive `h1`
- [ ] Logical headings, landmarks, lists, and tables
- [ ] Skip link works and target is visible
- [ ] Link text is meaningful
- [ ] Images have correct alternative treatment
- [ ] No essential text exists only inside images

### Keyboard and focus

- [ ] All functions work by keyboard
- [ ] Focus order matches RTL reading and visual order
- [ ] Focus is visible on every surface
- [ ] Sticky UI does not obscure focus
- [ ] No keyboard trap exists
- [ ] Dialog and mobile-menu focus is contained and restored
- [ ] Hidden content is absent from the tab order

### Visual and responsive

- [ ] Text contrast is at least `4.5:1`
- [ ] Essential non-text contrast is at least `3:1`
- [ ] Meaning does not depend on color alone
- [ ] Target sizes meet the project standard
- [ ] `200%` text resize passes
- [ ] `400%` zoom and `320 CSS px` reflow pass
- [ ] Landscape mobile passes
- [ ] Forced colors/high contrast remains usable

### Forms and status

- [ ] Every field has a persistent label
- [ ] Required and optional fields are clear
- [ ] Instructions precede the need for them
- [ ] Errors are specific, linked, announced, and recoverable
- [ ] User input survives errors
- [ ] Loading, success, failure, and retry states are accessible
- [ ] File upload works without drag-and-drop
- [ ] Privacy text reflects the real workflow

### Motion and media

- [ ] Reduced-motion mode is verified
- [ ] No essential auto-playing or uncontrolled movement exists
- [ ] Video captions and audio transcripts are accurate
- [ ] Media controls are labeled and keyboard accessible

### Testing and governance

- [ ] Automated scans cover default and interactive states
- [ ] No unresolved Blocker or High issue remains
- [ ] Manual keyboard journey passes
- [ ] Required screen-reader combinations pass
- [ ] Third-party interfaces have been evaluated
- [ ] Downloadable documents are accessible or have HTML equivalents
- [ ] Any exception is recorded with owner and remediation date

## 38. Official References

- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [What’s New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [How to Meet WCAG 2 — Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [WAI Images Tutorial](https://www.w3.org/WAI/tutorials/images/)
- [WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
- [WCAG Evaluation Methodology (WCAG-EM)](https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/)

---

## 39. Final Standard

The Ahan Asa website must be usable without sight, without a mouse, without precise touch, without animation, and at significant magnification—while preserving the calm, premium, technically disciplined character of the brand.

Accessibility is successful when professional buyers can understand the offer, evaluate evidence, navigate technical information, submit an invoice or material list, recover from errors, and complete an inquiry independently and with confidence.

If an interface is visually polished but excludes a user from a core task, it is not approved for release.
