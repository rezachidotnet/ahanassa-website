# Ahan Asa Header and Navigation Specification

**File:** `HEADER_NAVIGATION_SPEC.md`  
**Project:** Ahan Asa (`آهن آسا`)  
**Domain:** `ahanassa.com`  
**Status:** Normative implementation specification  
**Version:** `1.0`  
**Last updated:** `2026-08-25`  
**Primary locale:** Persian (`fa-IR`, RTL)  
**Applies to:** All public website routes and shared page shells

---

## 1. Purpose

This document defines the structure, behavior, visual treatment, responsiveness, accessibility, motion, data contract, and implementation requirements of the Ahan Asa global header and navigation system.

The header is not a decorative banner. It is the site's primary orientation and conversion interface. It must help a qualified visitor quickly understand where they are, find relevant procurement information, and begin a project or material-list inquiry without interpreting Ahan Asa as an online retailer, commodity marketplace, or public steel-price board.

Claude Code must treat this file as the governing specification for:

- `SkipLink`;
- `LogoLink`;
- `SiteHeader`;
- `PrimaryNavigation`;
- desktop dropdown disclosures;
- `MobileNavigation`;
- mobile navigation accordions;
- current-page indication;
- header inquiry CTA placement;
- sticky and scrolled header states;
- direction-safe behavior for Persian and future locales.

This document specifies the global header only. Breadcrumbs, footer navigation, page-local tabs, filters, pagination, and in-page anchor navigation remain governed by their own component and page specifications.

---

## 2. Governing Documents and Authority

Claude Code must read the following documents before implementing or changing the header:

1. `PROJECT_BRIEF.md`
2. `BRAND_GUIDELINES.md`
3. `DESIGN_DIRECTION.md`
4. `DESIGN_SYSTEM.md`
5. `UI_COMPONENTS.md`
6. `RESPONSIVE_RULES.md`
7. `MOTION_GUIDELINES.md`
8. `SITEMAP.md`, when approved
9. `INFORMATION_ARCHITECTURE.md`, when approved
10. `ROUTES.md`, when approved
11. `CTA_STRATEGY.md` and `COPY_GUIDELINES.md`, when approved
12. `LOCALIZATION.md`, when approved
13. `ACCESSIBILITY.md`, when approved

### 2.1 Conflict rules

- Brand asset rules in `BRAND_GUIDELINES.md` override local visual convenience.
- Design tokens in `DESIGN_SYSTEM.md` override raw values in component code.
- Responsive rules in `RESPONSIVE_RULES.md` override screenshot-specific layout choices.
- Motion values in `MOTION_GUIDELINES.md` override unapproved animation.
- Final page names, hierarchy, route targets, and Persian navigation labels must come from `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, and `ROUTES.md`.
- Final CTA wording must come from `CTA_STRATEGY.md` and `COPY_GUIDELINES.md`.
- This file governs header composition and behavior. It must not be used to invent missing routes or final marketing copy.
- Any unresolved conflict must be recorded in `DECISIONS.md` before implementation continues.

---

## 3. Strategic Role

The header must support the following visitor decisions in this order:

1. **Identity:** Confirm that the visitor is on the official Ahan Asa website.
2. **Category:** Reinforce Ahan Asa as a steel procurement-management partner.
3. **Orientation:** Expose a small, understandable set of information paths.
4. **Evaluation:** Provide direct access to capabilities, material categories, industries, evidence, resources, and company information when those routes are approved.
5. **Action:** Keep one primary procurement or project-inquiry path easy to find.

### 3.1 Business intent

The header should contribute to qualified lead generation, not superficial click volume. It must make it easy for contractors, developers, industrial and EPC teams, procurement managers, project owners, and technical decision-makers to begin a useful conversation.

### 3.2 Required impression

The header must feel:

- controlled;
- precise;
- calm;
- premium through restraint;
- technically credible;
- commercially intelligent;
- spacious without wasting functional space.

### 3.3 Prohibited impression

The header must not resemble:

- a consumer e-commerce header;
- a crowded steel-price portal;
- a trading dashboard;
- a traditional iron-shop website;
- a coupon or promotion bar;
- a generic corporate template with excessive dropdown panels.

---

## 4. Scope and Non-Goals

### 4.1 Included

- global skip link;
- official logo link;
- primary navigation;
- one high-value inquiry CTA;
- desktop disclosure menus where approved;
- mobile menu trigger and drawer;
- current route indication;
- focus, keyboard, pointer, touch, and screen-reader behavior;
- sticky/scrolled visual state;
- server-rendered navigation content;
- future direction-safe locale support.

### 4.2 Excluded by default

The Phase 1 header must not include the following unless a later approved specification provides a clear requirement:

- live steel prices;
- stock or inventory counters;
- shopping cart;
- user account or login;
- wishlist;
- order tracking;
- public checkout;
- promotional ticker;
- rotating announcement bar;
- social-media icon row;
- multiple competing CTA buttons;
- unverified certification, supplier, or partner logos;
- search before the content inventory justifies it;
- language selector before a second public locale is approved;
- mega menu before the approved information architecture proves it necessary;
- contact details repeated as a crowded utility bar;
- slogan used as the only explanation of the business category.

---

## 5. Global Document Structure

The page shell must follow this landmark order:

```html
<body>
  <a href="#main-content">...</a>
  <header>...</header>
  <main id="main-content" tabindex="-1">...</main>
  <footer>...</footer>
</body>
```

Rules:

- The skip link is the first focusable element in the document.
- The header uses the semantic `<header>` element.
- Primary navigation uses a labelled `<nav>` element and a semantic list.
- Core links exist in server-rendered HTML.
- JavaScript enhances disclosures and drawer behavior; it must not create the only copy of the navigation.
- There must be exactly one primary navigation landmark per page shell.
- Additional navigation landmarks require distinct accessible labels.
- The `main` target must receive programmatic focus when the skip link is activated without creating an unwanted persistent outline after pointer navigation.

---

## 6. Navigation Information Model

The header must consume an approved, typed navigation configuration. Page files and header components must not duplicate labels, URLs, active-match rules, or child relationships.

### 6.1 Content roles

The approved information architecture may expose the following functional roles. These are semantic roles, not permission to invent final labels or routes:

| Role | Purpose | Preferred treatment |
|---|---|---|
| Home | Return to locale root | Logo link; avoid a duplicate top-level item unless research proves it necessary |
| Procurement | Explain the managed purchasing service and process | Direct link or approved disclosure group |
| Materials | Help buyers locate relevant steel/material categories | Approved disclosure group if several routes exist |
| Industries | Orient visitors by project or sector context | Direct link or compact disclosure group |
| Evidence | Reach verified projects, case studies, or delivery evidence | Direct link |
| Resources | Reach approved technical/procurement knowledge | Direct link or compact disclosure group |
| Company | Reach about, approach, team, or contact context | Direct link or compact disclosure group |
| Inquiry | Begin a procurement consultation or submit a project/material list | Single high-value CTA |

The final Phase 1 top-level list should normally contain no more than **six navigational choices plus one CTA**. If the approved architecture requires more, first consider grouping or moving low-priority destinations to the footer. Do not reduce legibility or create a mega menu merely to preserve every possible link in the header.

### 6.2 Navigation depth

- Prefer direct top-level links.
- Use a disclosure only when one parent concept owns multiple meaningful destinations.
- Desktop navigation supports one visible child level by default.
- Mobile navigation may expose the same child level as an accordion.
- A third navigational level is prohibited in the global header unless separately approved and validated through user testing.
- Every child must have a distinct destination and a clear relationship to its parent.
- Do not create empty groups, single-item dropdowns, duplicate links, or promotional filler.

### 6.3 Overview destinations

When a group also has an overview page, use one of these approved patterns consistently:

1. The group trigger opens the disclosure, and the first child is an explicit overview link; or
2. A direct parent link and a separate adjacent disclosure button are used, with separate accessible names and targets.

Do not make one element behave as both a navigation link and a submenu button.

### 6.4 Link eligibility

A destination may appear in the header only when:

- the route is approved;
- the page is publishable;
- its label is approved for the active locale;
- it does not lead to placeholder or fabricated content;
- its visibility state is explicitly enabled;
- its access requirements are compatible with a public header.

Draft, hidden, empty, blocked, or unavailable destinations must not be exposed as if complete.

---

## 7. Header Anatomy

### 7.1 Required composition

The shared `SiteHeader` contains:

1. `SkipLink`, visually hidden until focused;
2. `LogoLink`;
3. `PrimaryNavigation` on desktop-capable layouts;
4. at most one `HeaderInquiryLink`;
5. `MobileMenuButton` below the approved collapse point;
6. `MobileNavigation` when opened.

### 7.2 Persian RTL visual order

For the Persian interface:

- the logo occupies the logical inline-start area, visually on the right;
- the primary navigation follows the logo in logical reading order;
- the inquiry CTA occupies the logical inline-end action area, visually toward the left;
- the mobile menu control remains near the action area and is not separated from the header controls by visual reordering;
- DOM order must follow reading and focus logic; CSS `order` must not create a misleading keyboard sequence.

### 7.3 Container alignment

- Use the global page container from `DESIGN_SYSTEM.md`.
- Header content aligns with the primary page grid.
- The logo, navigation baseline, and action controls must feel optically balanced, not mathematically crowded.
- Use logical padding and margins only.
- Do not stretch navigation across the full viewport beyond the approved maximum container.

### 7.4 Header sizing

Use the following component-level tokens:

```css
:root {
  --aa-header-height-mobile: 4.5rem;   /* 72px */
  --aa-header-height-desktop: 5rem;    /* 80px */
  --aa-header-height-compact: 4.25rem; /* 68px */
  --aa-header-z: 40;
  --aa-navigation-z: 50;
  --aa-overlay-z: 45;
}
```

Rules:

- These are minimum stable shell heights, not a reason to crop translated labels.
- The header may grow when zoom, text size, or locale length requires it.
- Do not enforce a fixed height that clips content at 200% zoom.
- The compact state applies to desktop sticky behavior only and must preserve `44px` targets.
- Mobile height must remain stable while the drawer opens.

---

## 8. LogoLink Specification

### 8.1 Asset

- Use the approved horizontal lockup in the header when it fits at or above its documented minimum size.
- Use the approved Persian horizontal lockup on Persian pages once the final outlined/vector asset is approved.
- Until that Persian asset is approved, do not fabricate a permanent lockup from live Persian text.
- If the full lockup cannot retain its `120px` digital minimum width, use the approved master icon rather than shrinking or redrawing the lockup.
- Do not mirror, crop, stretch, recolor, rebuild, animate, or separate the logo geometry.
- The full-color logo may appear only on a controlled light surface.
- The reversed asset may appear only on an approved Steel Navy surface.

### 8.2 Link behavior

- The logo links to the active locale's home route.
- The link has a locale-appropriate accessible name meaning “Ahan Asa — Home”.
- On the home route, the logo remains a link unless an accessibility review documents a reason to render it as the current home reference.
- The logo link must not open a new tab.
- The clear-space area must not overlap the navigation or CTA hit areas.

### 8.3 Recommended rendered size

| Context | Lockup treatment | Target size |
|---|---|---|
| Desktop | Approved horizontal lockup | `120–152px` inline size |
| Tablet/large mobile | Approved horizontal lockup | `120–136px` inline size |
| Constrained small mobile | Approved master icon | `28–36px` block size |

Optical testing with the production asset is required. Never use these ranges to violate minimum size, clear space, or aspect ratio.

---

## 9. PrimaryNavigation Specification

### 9.1 Semantic structure

```html
<nav aria-label="[localized primary navigation label]">
  <ul>
    <li><a href="...">...</a></li>
    <li>
      <button type="button" aria-expanded="false" aria-controls="...">...</button>
      <div id="...">...</div>
    </li>
  </ul>
</nav>
```

Rules:

- Use ordinary list and disclosure semantics for website navigation.
- Do not add `role="menu"`, `role="menuitem"`, or application-style menu behavior to standard site navigation.
- Direct destinations use links.
- Disclosure controls use buttons.
- Every visible label must be real text, not part of an image.
- Labels must remain on one line in desktop mode; collapse the navigation before compressing type or control spacing excessively.

### 9.2 Current-page state

- Apply `aria-current="page"` to the exact current destination link.
- A parent group may receive a separate visual active-descendant state when one of its children is current.
- Current state must use more than color alone: font weight, underline/border, marker, or another approved non-color cue.
- The exact current link must remain identifiable inside an opened disclosure.
- Active matching must use route-aware logic, not loose string inclusion that creates false matches.
- Query strings and fragments must not incorrectly change the primary current-page state.

### 9.3 Visual treatment

- Navigation text uses the approved Persian UI font and `--aa-font-weight-medium`.
- Use `--aa-text-label` or a verified equivalent that remains readable with real Persian labels.
- Default text color is the approved strong text token on the header surface.
- Hover and active states may use Steel Navy and restrained Copper indicators.
- Do not make every item Copper.
- Do not use persistent capsules, filled tabs, or oversized pills for all links.
- Navigation item interactive height is at least `44px`.
- Use stable spacing; label width changes must not shift neighboring items on hover.

### 9.4 Hover and pointer intent

- Hover may preview a disclosure only when keyboard and click behavior remain fully available.
- Click/tap on the trigger must deterministically toggle the disclosure.
- Use a small pointer-leave tolerance to prevent accidental closure while moving into the panel.
- Do not use long hover delays.
- A disclosure must not open merely because the pointer crosses the header during normal page movement.
- On hybrid devices, click and keyboard behavior remain authoritative.

---

## 10. Desktop Disclosure Navigation

### 10.1 Eligibility

Use a desktop dropdown only for an approved group with at least two useful destinations. Use a mega menu only when the approved sitemap cannot remain understandable in a compact dropdown.

The initial implementation should prefer a compact disclosure panel. Promotional cards, background photography, fabricated statistics, featured products, and supplier logos are prohibited inside the navigation panel.

### 10.2 Panel geometry

- Position relative to the owning trigger or approved navigation cluster.
- Use logical inset properties.
- Keep the panel inside the viewport with collision handling.
- Minimum width must accommodate the longest approved label without forced truncation.
- Maximum width should remain content-driven; a dropdown must not become a full-width mega panel by accident.
- Use an approved light surface, `--aa-radius-lg`, border token, and `--aa-shadow-sm`.
- Panel content follows normal RTL reading order on Persian pages.
- The panel must not cover the owning trigger's focus indicator.

### 10.3 Interaction contract

- Trigger exposes `aria-expanded` and `aria-controls`.
- Trigger state changes immediately when opened or closed.
- `Enter` or `Space` toggles the trigger.
- `Escape` closes the panel and returns focus to the owning trigger.
- `Tab` and `Shift+Tab` move through links in normal document order.
- Clicking or tapping outside closes the panel.
- Moving focus outside the disclosure closes it without moving focus unexpectedly.
- Opening one disclosure closes another open disclosure.
- Route change closes all disclosures.
- Browser back/forward navigation must not restore an unusable floating panel state.

### 10.4 Optional arrow-key enhancement

Arrow-key traversal may be implemented only if it follows a documented disclosure-navigation pattern and does not break standard Tab navigation. It is not a substitute for ordinary focus order.

### 10.5 Disclosure motion

Entrance:

- opacity `0 → 1`;
- block-axis movement `4px → 0`;
- duration `160ms`;
- approved enter easing.

Exit:

- opacity `1 → 0`;
- duration `80–160ms`;
- approved exit easing.

Focus and semantic state changes must not wait for animation completion. Under `prefers-reduced-motion: reduce`, remove the positional movement and use an immediate or minimal opacity change.

---

## 11. Header Inquiry CTA

### 11.1 Purpose

The header contains at most one high-value CTA that starts the approved procurement consultation, project inquiry, or material-list submission path.

### 11.2 Content governance

- Final Persian wording comes from `CTA_STRATEGY.md` and `COPY_GUIDELINES.md`.
- The header must consume the approved content key, not hard-code separate copy.
- The label must describe the outcome, not use vague text such as “Click here”, “Start”, or “More”.
- Do not create a false promise of instant price, guaranteed availability, or immediate delivery.

### 11.3 Behavior

- Use a semantic link when the action navigates to an inquiry route.
- Use a button only when it opens an approved same-page dialog or sheet.
- Prefer navigation to a dedicated, index-safe inquiry route when the workflow is substantial.
- Preserve an approved source/context parameter without exposing sensitive data.
- The CTA must remain reachable in both desktop and mobile navigation.
- Do not duplicate the same CTA repeatedly inside the open mobile drawer unless the header version becomes inaccessible there.

### 11.4 Visual hierarchy

- Use the approved `conversion` or `primary` `ButtonLink` variant.
- Forge Copper is reserved for the selected conversion treatment and must remain restrained elsewhere.
- Default height: `48px`; absolute minimum interactive height: `44px`.
- The label must remain legible and untruncated.
- Do not reduce the font size to keep the CTA inline.
- At narrow widths, use the approved compact label from the content system; do not invent an icon-only conversion action unless the icon has an unambiguous accessible name and usability approval.

---

## 12. Sticky and Scrolled Header Behavior

### 12.1 Default model

The preferred Phase 1 model is a stable, light header surface from initial render. It may become sticky when this improves orientation on long pages.

```css
.site-header {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--aa-header-z);
}
```

### 12.2 Surface states

| State | Surface | Border/shadow | Height |
|---|---|---|---|
| Initial | Approved White or Warm Cream | Subtle border or none according to page composition | Mobile/Desktop default |
| Scrolled | Opaque approved light surface | Block-end border and optional `--aa-shadow-xs` | Desktop may use compact height |
| Drawer open | Stable header surface matching drawer relationship | No competing elevation | Mobile default remains stable |
| Focus within | No visual disappearance or auto-hide | Focus ring remains unobstructed | Must accommodate content |

### 12.3 Scroll threshold

- Use a stable threshold based on measured header/page position.
- Use hysteresis so minor scroll reversals do not flicker between states.
- Do not continuously resize the header in response to every scroll pixel.
- Do not animate the logo between variants.
- Do not hide the header automatically while the user is tabbing, a disclosure is open, the mobile drawer is open, or a form error/anchor target is being navigated to.
- Auto-hide-on-scroll is not approved for Phase 1.

### 12.4 Transition

- Background, border, or shadow may transition over `160–240ms`.
- Height changes must not cause a layout jump.
- Reserve the header's layout space from initial render.
- Under reduced motion, make the state change immediate.

### 12.5 Anchor offset

All in-page anchor targets and focused error targets must account for the sticky header:

```css
[id] {
  scroll-margin-block-start: calc(var(--aa-header-height-desktop) + var(--aa-space-4));
}
```

Use the responsive header token appropriate to the current layout.

---

## 13. Mobile Header

### 13.1 Collapse rule

The default structural collapse point is below `lg` (`1024px`). Desktop navigation may remain collapsed above that width when real labels, zoom, or content pressure do not fit safely. It must never remain expanded merely to match a nominal breakpoint.

At `200%` browser zoom, switching to the mobile pattern is acceptable and preferred over clipping, shrinking, or horizontal scrolling.

### 13.2 Required mobile composition

The compact mobile header includes:

- `LogoLink` at logical inline-start;
- one primary inquiry action when its approved label fits;
- a labelled menu button with at least a `44 × 44px` hit area.

At the narrowest supported widths:

- preserve logo recognition;
- preserve the menu control;
- preserve a discoverable inquiry path;
- allow the primary inquiry action to use its approved compact treatment or remain immediately visible at the top/bottom of the drawer;
- never allow three compressed controls to overlap or create page-level horizontal scroll.

### 13.3 Menu button

- Use a `<button type="button">`.
- Provide a visible familiar menu icon and a localized accessible name.
- Expose `aria-expanded` and `aria-controls`.
- Do not rely on the icon shape as the only accessible label.
- The button must remain in a stable position when its state changes.
- A menu-to-close icon transformation is optional; a visible close action inside the drawer remains required.

---

## 14. MobileNavigation Drawer

### 14.1 Model

Use an accessible full-height drawer or sheet. The drawer enters from the logical inline-end edge. In Persian RTL, this is visually the left edge.

Recommended geometry:

```css
.mobile-navigation {
  inline-size: min(100%, 26rem);
  block-size: 100dvh;
  max-block-size: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-block-end: max(var(--aa-space-6), env(safe-area-inset-bottom));
}
```

- At small mobile widths, the sheet may occupy the full viewport width.
- From `sm`, a bounded drawer with a scrim is preferred when content remains comfortable.
- The drawer must not exceed the viewport or rely on `100vh` alone on mobile browsers.
- The header/drawer relationship must remain visually obvious.

### 14.2 Internal order

1. Drawer heading or accessible title;
2. visible close button;
3. primary navigation list;
4. nested accordion groups in the same information order as desktop;
5. primary inquiry CTA;
6. only approved secondary contact or locale controls, if applicable.

Do not reorder destinations between desktop and mobile for visual novelty. Do not move essential destinations into unlabeled icon rows.

### 14.3 Dialog and focus behavior

When implemented as a modal drawer:

- expose an appropriate dialog name;
- use `aria-modal="true"` when the background is inert;
- move focus into the open drawer immediately after it becomes programmatically active;
- prefer the close button or drawer heading strategy as the initial focus target;
- contain focus within the drawer;
- `Escape` closes it;
- closing restores focus to the menu trigger;
- background content becomes inert and cannot receive pointer or keyboard interaction;
- background scrolling is locked without changing layout width;
- focus behavior must not wait for entrance animation completion.

If native `<dialog>` is used, its behavior must be tested across supported browsers and assistive technologies. A visual sheet alone is not sufficient.

### 14.4 Close behavior

The drawer closes when:

- the close control is activated;
- `Escape` is pressed;
- the scrim is intentionally activated;
- a navigation destination is selected;
- a completed route change occurs.

Do not close merely because focus moves within the drawer. If navigation fails, preserve enough state for the user to recover.

### 14.5 Background scroll lock

- Preserve the page's scroll position.
- Prevent horizontal layout shift from scrollbar removal.
- Restore the previous scroll position when closing.
- Do not apply scroll-lock techniques that break iOS viewport behavior or move the page to the top.

### 14.6 Drawer motion

Open:

- translate from logical inline-end to resting position;
- maximum duration `400ms`;
- scrim fade `240ms`.

Close:

- maximum duration `240ms`;
- restore focus after the drawer is programmatically closed.

Under reduced motion:

- remove large translation;
- use an immediate state change or short opacity transition;
- preserve focus, scroll, and semantic state behavior.

---

## 15. Mobile Nested Navigation

### 15.1 Accordion pattern

- Direct destinations remain links.
- Parent disclosures use full-row buttons.
- Each trigger exposes `aria-expanded` and `aria-controls`.
- The indicator icon rotates only to communicate expanded state.
- Child links remain in DOM order directly after their trigger.
- Opening and closing must not unexpectedly move focus.
- The current child remains visibly and programmatically identified.

### 15.2 Expansion behavior

- One or more groups may remain open when this improves comparison; the implementation must be consistent.
- Automatically expand the ancestor of the current route on initial drawer open.
- Do not automatically collapse the current group while the user navigates within the drawer.
- Do not persist open groups across unrelated sessions unless a clear user benefit is documented.
- Panel motion follows `MOTION_GUIDELINES.md`: chevron `160ms`, panel up to `240ms`.

### 15.3 Nesting limit

Do not reproduce a desktop flyout hierarchy as multiple sliding mobile screens. Use a single understandable scroll surface with at most one approved child level for Phase 1.

---

## 16. Responsive Behavior Matrix

| Condition | Header behavior | Navigation behavior | Inquiry action |
|---|---|---|---|
| `320–479px` | Stable compact header; icon-only logo allowed if required | Menu button + full-width or near-full-width drawer | Approved compact treatment or immediately visible drawer CTA |
| `480–767px` | Horizontal lockup when minimum size and spacing fit | Drawer; accordions for approved groups | Header CTA when comfortable; drawer CTA always discoverable |
| `768–1023px` | Spacious mobile/tablet header | Drawer by default; no hover dependency | Visible header CTA plus drawer path without crowding |
| `1024–1279px` | Desktop mode only if real labels fit | Inline primary nav; compact dropdown disclosures | One visible CTA |
| `1280–1535px` | Full desktop container | Inline nav with approved spacing | One visible CTA |
| `1536px+` | Increase whitespace, not header complexity | Same navigation density; no arbitrary extra items | Same CTA size/hierarchy |
| `200% zoom` | May switch to compact/mobile composition | Drawer/disclosure remains keyboard safe | Remains reachable and untruncated |
| Reduced motion | Stable visual state | Immediate/minimal disclosure and drawer motion | Immediate state feedback |

### 16.1 Reflow requirements

- Support reflow to `320 CSS px` without page-level horizontal scrolling.
- Support text resizing and browser zoom without clipped labels.
- Do not hide primary destinations merely to fit a screenshot.
- Do not use DOM reversal to simulate RTL.
- Preserve at least `44 × 44px` interactive targets.
- The open drawer must remain usable in landscape orientation and with the virtual keyboard visible.

---

## 17. Visual Specification

### 17.1 Surface

- Preferred default: Cloud White or approved Warm Cream.
- Scrolled state: opaque light surface with a subtle block-end border and optional `--aa-shadow-xs`.
- Do not use transparent glassmorphism, heavy blur, colored glow, or deep shadow.
- Do not place the primary logo and navigation directly over uncontrolled photography or video.
- Do not introduce a dark header variant without an approved page-shell requirement and reversed logo asset.

### 17.2 Color

- Steel Navy carries primary text, structure, and brand authority.
- Forge Copper is a restrained accent for selected conversion or state emphasis.
- White and Warm Cream carry the premium editorial surface.
- Selected/current states must not depend on Copper alone.
- All text, icons, borders, focus rings, and CTA combinations must pass the approved contrast target.

### 17.3 Spacing

- Use `--aa-space-*` tokens only.
- Logo-to-navigation separation must preserve official logo clear space.
- Navigation item gaps should remain comfortable and consistent.
- Use at least `--aa-space-2` between an icon and label.
- Do not solve label collisions by reducing approved page gutters below responsive standards.

### 17.4 Shape and elevation

- Standard header remains rectangular and aligned to the page shell.
- Do not turn the whole header into a floating pill.
- Buttons use approved radius tokens.
- Dropdowns use an approved border, `--aa-radius-lg`, and `--aa-shadow-sm`.
- Drawer uses no decorative rounding on a full-viewport edge unless the bounded sheet design clearly preserves usable space.

### 17.5 Icons

- Use one approved icon system.
- Menu, close, and chevron icons must have consistent stroke weight.
- Directional chevrons mirror only when their meaning follows reading direction.
- Do not mirror the logo, checkmarks, download icons, or non-directional symbols.
- Icons supplement visible or accessible labels; they do not replace unclear actions.

---

## 18. Interaction States

Every header control must define:

| State | Requirement |
|---|---|
| Default | Purpose and hierarchy are clear |
| Hover | Enhancement only; no essential reveal unavailable elsewhere |
| Focus-visible | Immediate, high-contrast `2px` Copper outline or approved focus shadow with offset |
| Active/pressed | Direct feedback without large movement |
| Current/selected | Non-color indicator plus programmatic state |
| Expanded | Trigger and controlled content expose synchronized state |
| Disabled | Avoid for navigation; unavailable destinations should normally be omitted |
| Loading | Not applicable to ordinary navigation; route progress must not disable basic escape paths |
| Error | Navigation failure provides a recoverable page-level response, not a silent dead control |

Focus indicators must remain visible on all approved surfaces and must not be clipped by overflow containers.

---

## 19. Accessibility Requirements

### 19.1 Target behavior

The header must be usable with:

- keyboard only;
- touch only;
- pointer/mouse;
- screen reader;
- browser zoom at `200%`;
- text resizing;
- reduced motion;
- high-contrast or forced-color conditions where supported.

### 19.2 Keyboard order

Expected focus order in desktop mode:

1. Skip link;
2. logo link;
3. primary navigation items in DOM/reading order;
4. disclosure child links when open;
5. inquiry CTA;
6. next page-shell focus target.

Expected focus order in mobile mode before the drawer opens:

1. Skip link;
2. logo link;
3. inquiry action when present;
4. menu trigger.

Inside the modal drawer, focus remains within the drawer until closed.

### 19.3 Names and state

- Primary navigation has a localized accessible label.
- Menu and close controls have localized accessible names.
- Disclosure buttons expose expanded state.
- Current links expose current-page state.
- Decorative icons use `aria-hidden="true"`.
- Do not duplicate visible labels with noisy accessible-name text.
- Announce route loading only when the framework introduces a meaningful wait; do not produce repeated live-region noise for instant navigation.

### 19.4 Contrast and target size

- Meet the approved WCAG conformance target; until a stricter target is documented, design and test against WCAG 2.2 AA.
- Text contrast is at least `4.5:1` for normal-size text.
- Meaningful non-text controls and focus indicators meet at least `3:1` against adjacent colors.
- Interactive targets are at least `44 × 44px` unless an approved accessibility specification documents an exception.
- Adjacent targets require enough spacing to prevent accidental activation.

### 19.5 No-JavaScript baseline

Without client-side JavaScript:

- direct top-level links remain usable;
- logo and inquiry links remain usable;
- core navigation content remains present in HTML;
- grouped destinations must remain discoverable through an approved fallback, such as overview links or progressively enhanced disclosures.

The mobile drawer may require enhancement, but the server-rendered page must not become a dead end.

---

## 20. RTL, LTR, and Mixed-Direction Rules

### 20.1 Root direction

Persian pages use:

```html
<html lang="fa" dir="rtl">
```

### 20.2 Direction-safe implementation

- Use CSS logical properties exclusively for layout intent.
- Use `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, and logical alignment.
- Do not maintain separate RTL and LTR header component trees.
- Do not hard-code the drawer to `left` or `right`; use logical inline-end behavior.
- Do not reverse arrays in JavaScript to simulate RTL.
- DOM order follows linguistic and task order.

### 20.3 Mixed-direction content

Phone numbers, emails, URLs, route codes, and Latin technical labels must use directional isolation when displayed. They must not break surrounding Persian navigation order.

### 20.4 Future locales

- A locale switcher must not render until at least two complete, public, approved locales exist.
- When introduced, it must use locale-native names and preserve an equivalent route when one exists.
- It must not silently route to an unrelated page when a translation is missing.
- LTR support changes direction tokens and content; it must not fork the component architecture.

---

## 21. Content and Copy Rules

- Persian labels must be concise, natural, professional, and written with correct half-spaces and punctuation.
- Do not translate labels word-for-word from English when the Persian task meaning differs.
- The brand slogan “ما مراقب سرمایه شما هستیم.” may support brand communication elsewhere but must not replace a clear navigation category or inquiry label.
- Avoid aggressive urgency, discount language, or unverified superiority claims.
- Do not use placeholder labels in production.
- Do not truncate approved Persian labels with ellipses in primary navigation.
- Do not insert manual line breaks into header labels.
- Content keys must be semantic, such as `navigation.materials` or `header.primaryInquiry`, not visual, such as `navItem3` or `orangeButton`.

---

## 22. Technical Architecture

### 22.1 Component boundaries

Recommended structure:

```text
components/
  navigation/
    SiteHeader.tsx
    LogoLink.tsx
    PrimaryNavigation.tsx
    NavigationDisclosure.tsx
    HeaderInquiryLink.tsx
    MobileMenuButton.tsx
    MobileNavigation.tsx
    MobileNavigationGroup.tsx
    SkipLink.tsx
    navigation.types.ts
    navigation.utils.ts
    site-header.css
```

Adapt paths to the approved repository architecture. Do not create duplicate components when equivalent primitives already exist.

### 22.2 Rendering boundary

- Render the header shell, logo, approved labels, URLs, and direct links on the server.
- Keep client-side code limited to disclosure state, drawer state, focus management, scroll lock, and optional scrolled-state enhancement.
- Do not convert the entire application shell into a client component solely for the menu.
- Do not fetch core navigation after hydration.
- Avoid third-party menu or animation dependencies when platform semantics and existing primitives are sufficient.

### 22.3 Typed data contract

```ts
export type NavigationItem = {
  id: string;
  label: string;
  href?: string;
  match?: 'exact' | 'section';
  external?: boolean;
  children?: NavigationItem[];
  visibility?: 'public' | 'hidden';
};

export type HeaderAction = {
  id: 'primary-inquiry';
  label: string;
  href: string;
  analyticsId: string;
};

export type HeaderNavigationConfig = {
  locale: string;
  direction: 'rtl' | 'ltr';
  primaryLabel: string;
  items: NavigationItem[];
  primaryAction: HeaderAction;
};
```

Rules:

- Do not allow arbitrary component-level HTML from content data.
- Validate unique IDs and valid internal URLs at build time.
- Reject more than the approved navigation depth.
- Reject an item that has neither `href` nor approved children.
- Reject hidden or unpublished child routes from the public config.
- External links must be explicit; the component must not infer them from fragile string matching.
- Navigation data must come from the approved route/content source, not multiple page-local arrays.

### 22.4 State model

State must remain minimal and deterministic:

```ts
type NavigationUiState = {
  openDesktopGroupId: string | null;
  isMobileOpen: boolean;
  openMobileGroupIds: string[];
  isScrolled: boolean;
};
```

- Do not store derived current-route state in local component state.
- Do not persist drawer open state across routes.
- Close incompatible states when the layout crosses the collapse threshold.
- Prevent body-scroll lock from remaining active after unmount or route change.

### 22.5 Hydration safety

- Initial server and client markup must agree.
- Do not render desktop markup on the server and replace it with unrelated mobile markup after hydration.
- CSS may control layout visibility while both patterns share approved content, or a hydration-safe responsive architecture may be used.
- Do not use `window.innerWidth` during initial render to decide core navigation content.

---

## 23. SEO and Crawlability

- All public destinations use real crawlable anchor links.
- Do not use click handlers or non-link elements for navigation.
- Do not hide primary destinations behind client-fetched content.
- Internal URLs must use the canonical route pattern from `ROUTES.md`.
- The logo home link points to the canonical active-locale home route.
- Header links must not add unnecessary query parameters.
- Do not apply `nofollow` to normal internal navigation.
- Do not expose faceted, search, draft, or duplicate routes in the primary navigation.
- Navigation labels should describe destinations clearly without keyword stuffing.
- Structured data must not describe links or organization facts that are not visibly supported.

---

## 24. Performance Requirements

- The header must appear correctly during initial paint.
- Reserve logo dimensions to prevent layout shift.
- Inline or preload only the assets justified by the broader performance/font strategy.
- Use optimized SVG or approved production logo assets; do not ship presentation-board raster images as header logos.
- Avoid large navigation bundles and third-party interaction libraries.
- Do not preload drawer-only media because promotional drawer media is not approved.
- Sticky state observation should use efficient browser APIs and must not attach expensive unthrottled scroll work.
- Event listeners must be removed on cleanup.
- Menu animation must use opacity and transform rather than layout-heavy properties where practical.
- Header behavior must remain responsive on low-powered mobile devices.

---

## 25. Analytics Contract

Track only meaningful navigation and conversion behavior. Recommended events:

| Event | Trigger | Required parameters |
|---|---|---|
| `header_nav_click` | A primary or child navigation link is activated | `item_id`, `destination`, `level`, `locale`, `device_mode` |
| `header_group_open` | A desktop/mobile group is intentionally expanded | `group_id`, `locale`, `device_mode` |
| `header_primary_cta_click` | Header inquiry CTA is activated | `action_id`, `destination`, `locale`, `device_mode` |
| `mobile_menu_open` | Mobile drawer is opened | `locale`, `viewport_class` |
| `mobile_menu_close` | Drawer closes | `close_method`, `locale` |

Rules:

- Analytics must not delay navigation.
- Do not send label text when a stable semantic ID is sufficient.
- Do not capture uploaded document names, inquiry content, phone numbers, email addresses, or other personal/sensitive information.
- Avoid duplicate events caused by both pointer and click handlers.
- `close_method` may use controlled values such as `button`, `escape`, `scrim`, `navigation`, or `route_change`.
- Final event governance remains subordinate to `ANALYTICS_TRACKING.md`.

---

## 26. Security and Privacy

- Internal navigation must not expose secrets, environment values, unpublished slugs, or admin routes.
- External URLs must come from approved configuration.
- Do not use `target="_blank"` by default. When required, communicate the new context and use safe `rel` values.
- Sanitize or reject unsupported content input; do not inject raw HTML into labels.
- Inquiry source parameters must use a controlled allowlist.
- Do not expose private document-upload endpoints in navigation before the workflow and permissions are approved.
- Do not claim secure upload, confidentiality, retention, or encryption behavior unless implemented and verified.

---

## 27. Failure and Edge Cases

The implementation must handle:

- very long Persian labels;
- missing optional child groups;
- a current route inside a disclosure;
- route changes while the drawer is open;
- viewport rotation while the drawer is open;
- browser zoom that forces desktop-to-mobile collapse;
- JavaScript loading failure;
- back/forward navigation;
- slow route transition;
- focus inside a dropdown when the pointer leaves;
- sticky state during anchor navigation;
- reduced motion;
- forced colors;
- missing final Persian wordmark asset;
- a locale without an equivalent route;
- small viewports with safe-area insets;
- content growth after localization.

### 27.1 Missing assets or content

- If the approved Persian lockup is unavailable, use the approved fallback defined by `BRAND_GUIDELINES.md`; do not fabricate one.
- If a route or label is not approved, omit it rather than publishing placeholder navigation.
- If the primary inquiry route is temporarily unavailable, use only an approved operational fallback and state the limitation honestly.
- If navigation data fails to load at build time, fail the build or render a controlled minimal server configuration; do not silently publish an empty header.

---

## 28. Testing Matrix

### 28.1 Viewports

Verify at minimum:

- `320 × 568`
- `360 × 800`
- `390 × 844`
- `480 × 900`
- `768 × 1024`
- `1024 × 768`
- `1280 × 800`
- `1440 × 900`
- `1536 × 864`
- `1920 × 1080`

These are verification sizes, not permission to add one-off breakpoints.

### 28.2 Zoom and text

- `200%` browser zoom at desktop width;
- text-only zoom where supported;
- longest approved Persian labels;
- mixed Persian/Latin content;
- Windows and macOS default rendering;
- mobile portrait and landscape.

### 28.3 Interaction

- keyboard-only complete navigation;
- forward and reverse Tab order;
- Enter/Space disclosure activation;
- Escape close and focus restoration;
- outside-click close;
- touch open/close;
- hybrid pointer device;
- route change from an open drawer;
- viewport crossing `lg` while a menu is open;
- background scroll lock and restoration;
- current-page state for exact and descendant routes.

### 28.4 Assistive technology

Test representative combinations approved by the accessibility plan, including at minimum one Windows screen reader/browser combination and one Apple screen reader/browser combination. Verify:

- navigation landmark name;
- menu button name and expanded state;
- disclosure trigger state;
- current-page announcement;
- drawer/dialog name;
- focus containment and restoration;
- no inaccessible background while modal;
- skip-link operation.

### 28.5 Visual states

- initial and scrolled header;
- White and approved Warm Cream surfaces;
- every control state;
- open dropdown near both viewport edges;
- open drawer with long content;
- reduced-motion mode;
- forced-color mode;
- production logo at minimum allowed size.

---

## 29. Acceptance Criteria

The header and navigation are complete only when all of the following are true:

- [ ] A new visitor can identify the official Ahan Asa brand immediately.
- [ ] The header supports procurement orientation rather than retail behavior.
- [ ] One high-value inquiry path is easy to reach on desktop and mobile.
- [ ] Final labels and URLs come from approved navigation/route sources.
- [ ] Core links are server rendered and crawlable.
- [ ] The header reflows without page-level horizontal scrolling at `320px`.
- [ ] The full interface remains usable at `200%` zoom.
- [ ] All interactive targets meet the minimum target size.
- [ ] Direct links, triggers, and buttons use correct native semantics.
- [ ] Current page and active descendant states are visible and programmatic.
- [ ] Desktop disclosures work by keyboard, pointer, and touch-capable hybrid input.
- [ ] The mobile drawer has a visible close action, focus containment, Escape support, and focus restoration.
- [ ] Background scroll locks without layout shift and always restores.
- [ ] RTL layout uses logical properties and correct visual/DOM order.
- [ ] No logo asset is reconstructed, mirrored, distorted, or shrunk below minimum size.
- [ ] Sticky state does not flicker, jump, hide anchor targets, or animate the logo.
- [ ] Motion follows the approved timings and reduced-motion behavior.
- [ ] No fabricated price, inventory, evidence, supplier, or promotional content appears.
- [ ] No third-party dependency is introduced without a documented need.
- [ ] Analytics avoid personal or sensitive data and do not block navigation.
- [ ] Automated accessibility checks and manual keyboard/screen-reader tests pass.
- [ ] No placeholder labels, routes, or unavailable destinations remain in production.

---

## 30. Claude Code Implementation Procedure

Before implementation, Claude Code must:

1. Read all governing documents listed in Section 2.
2. Inspect the existing page shell, routing configuration, logo assets, tokens, and navigation components.
3. Identify unrelated user changes and preserve them.
4. Resolve final navigation data from approved sitemap, IA, routes, CTA, and copy sources.
5. Confirm which official logo asset is production-ready.
6. Document unresolved decisions rather than inventing them.

During implementation, Claude Code must:

1. Reuse existing primitives and tokens.
2. Build semantic server-rendered structure first.
3. Add the smallest client enhancement required for disclosures, drawer, focus, and scroll behavior.
4. Implement mobile-first and direction-safe CSS.
5. Cover every state and edge case defined in this specification.
6. Add route-aware current-state logic.
7. Add analytics only through the approved tracking layer.
8. Avoid runtime, dependency, or route changes outside the approved task scope.

Before completion, Claude Code must:

1. Run formatting, linting, type checks, tests, and production build.
2. Verify the viewport, zoom, keyboard, focus, RTL, motion, and no-JavaScript cases.
3. Confirm no layout shift is introduced by logo or sticky behavior.
4. Confirm the inquiry CTA destination and source tracking.
5. Report changed files, tests run, results, remaining TBD items, and any deviations.
6. Record approved material deviations in `DECISIONS.md`.

---

## 31. Required Data Before Production Sign-Off

The following inputs must be resolved by their owning documents or business owner. Their absence must not be concealed through invented content:

| Item | Owning source | Required for |
|---|---|---|
| Final Phase 1 page inventory | `SITEMAP.md` | Navigation eligibility |
| Final hierarchy/grouping | `INFORMATION_ARCHITECTURE.md` | Direct links vs disclosures |
| Canonical internal routes | `ROUTES.md` | Link destinations and active matching |
| Final Persian labels | IA / `COPY_GUIDELINES.md` | Visible navigation copy |
| Final header CTA wording | `CTA_STRATEGY.md` / `COPY_GUIDELINES.md` | Inquiry action label |
| Inquiry route and fallback | `FORM_ARCHITECTURE.md` | Conversion behavior |
| Final Persian horizontal lockup | Approved brand asset set | Persian header identity |
| Production font and loading | `TYPOGRAPHY_SYSTEM.md` / `FONT_STRATEGY.md` | Label fit and rendering |
| Analytics property and consent rules | `ANALYTICS_TRACKING.md` | Event deployment |
| Accessibility conformance/tooling | `ACCESSIBILITY.md` / QA docs | Release sign-off |

These are controlled dependencies, not permission to delay all component development. The semantic shell, typed data contract, responsive behavior, and accessible interaction can be built with clearly marked non-production fixtures, but production must not ship with placeholder content.

---

## 32. Final Directive

The Ahan Asa header must behave like a disciplined procurement interface: clear enough to orient a first-time visitor, restrained enough to protect the premium brand, accessible enough to work without assumptions about input method, and direct enough to make a qualified project or material-list inquiry easy to begin.

When a design choice conflicts with clarity, route truth, accessibility, performance, or the approved brand system, those requirements win.
