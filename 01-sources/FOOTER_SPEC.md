# Ahan Asa Website — Footer Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `FOOTER_SPEC.md`  
> **Status:** Draft v1.0 — Normative implementation contract  
> **Last updated:** 2026-08-25  
> **Primary experience:** Persian (`fa-IR`), fully RTL  
> **Component owner:** Global website shell  
> **Primary component:** `SiteFooter`

---

## 1. Purpose

This document defines the content, information hierarchy, layout, interaction, accessibility, responsive behavior, data contract, analytics, and implementation rules for the Ahan Asa website footer.

The footer is not a leftover link container. It is the final orientation and conversion layer of every public page. It must:

- restate Ahan Asa's role as a professional steel procurement management partner;
- provide a clear next step for visitors who already have an invoice or purchase list;
- expose the most useful navigation and contact routes without duplicating the entire sitemap;
- reinforce trust through clarity, restraint, and verified information;
- provide required legal and policy links;
- remain fast, crawlable, keyboard-safe, and fully usable in Persian RTL;
- avoid turning Ahan Asa into a price portal, marketplace, or generic steel retailer.

This specification applies to all public Phase 1 pages unless a documented legal or technical requirement explicitly provides an exception.

---

## 2. Source Hierarchy

Footer decisions must follow this order unless `CLAUDE.md` defines a stricter project-wide hierarchy:

1. Approved owner decisions in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `DESIGN_SYSTEM.md`
6. `INFORMATION_ARCHITECTURE.md`
7. `SITEMAP.md`
8. `ROUTES.md`
9. `UI_COMPONENTS.md`
10. `RESPONSIVE_RULES.md`
11. `ACCESSIBILITY.md`
12. `MOTION_GUIDELINES.md`
13. This document
14. Page-specific specifications
15. Task-specific implementation instructions

If a route, contact value, social profile, legal entity name, address, service area, registration, certification, or trust claim is not approved in an authoritative source, it must not be published. Use a disabled content flag in source data; never display placeholder business information to users.

---

## 3. Footer Strategy

### 3.1 Strategic role

The footer has four jobs, in this order:

1. **Convert qualified intent** — help a visitor send an existing invoice or steel purchase list.
2. **Orient** — expose a small, useful set of next destinations.
3. **Reassure** — explain the brand role and make verified contact routes easy to find.
4. **Complete** — provide legal, privacy, copyright, and optional locale controls.

### 3.2 Desired impression

The footer should feel:

- composed;
- protective;
- precise;
- premium through restraint;
- technically credible;
- easy to scan;
- visibly connected to the rest of the design system.

It must not feel:

- crowded;
- promotional or urgent;
- like a directory of keywords;
- like a list of every steel product in the market;
- decorative for its own sake;
- dependent on animation;
- filled with unverified trust badges or partner logos.

### 3.3 Footer thesis

**A calm final decision point: understand the role, choose the next route, or send the purchase requirement.**

---

## 4. Non-Negotiable Rules

1. The primary footer conversion action is **sending an invoice or purchase list**, not viewing daily prices.
2. The approved Persian-first RTL direction must be preserved.
3. Use the approved reversed logo asset on the Steel Navy footer surface; never recreate the logo with text, CSS, or an icon font.
4. The core footer surface is Steel Navy `#0B2545`.
5. Forge Copper `#B04A2F` is an accent, not a large footer background and not the default color for long text.
6. Do not publish fake metrics, supplier counts, project counts, customer logos, awards, certificates, addresses, registrations, or geographic coverage.
7. Do not include a daily-price ticker, product-price table, or market feed in the footer.
8. Do not duplicate the full sitemap or use repetitive keyword-rich links.
9. All internal destinations must use canonical, locale-aware routes and real anchor elements.
10. All visible contact values must come from verified configuration, not component code.
11. Legal and company information must not disappear at narrow widths.
12. Essential links must remain usable without hover, animation, or client-side JavaScript.
13. No page may render two competing footer CTA bands.
14. Newsletter signup is excluded from Phase 1 unless `CONTENT_STRATEGY.md`, privacy requirements, consent behavior, and the delivery integration are approved.
15. The footer must meet WCAG 2.2 AA.

---

## 5. Footer Anatomy

The global footer is composed of two visually related but semantically distinct regions:

```text
FooterCTA
└── Qualified conversion invitation

SiteFooter
├── FooterBrand
├── FooterNavigation
│   ├── Procurement group
│   ├── Resources group
│   └── Company group
├── FooterContact
├── FooterUtilityRow
│   ├── Legal links
│   ├── Copyright
│   └── Optional locale control
└── Optional verified social links
```

### 5.1 Required components

| Component | Requirement | Purpose |
|---|---|---|
| `FooterCTA` | Required on standard public pages | Converts qualified visitors without aggressive repetition |
| `FooterBrand` | Required | Displays approved reversed lockup, role statement, and optional slogan |
| `FooterNavigation` | Required | Provides concise next-step navigation |
| `FooterContact` | Required when at least one contact route is verified | Provides real, actionable contact options |
| `FooterUtilityRow` | Required | Provides legal, copyright, and utility information |
| `FooterSocialLinks` | Optional | Displays only verified, actively maintained official profiles |

### 5.2 Conditional components

| Component | Show only when |
|---|---|
| Physical address | The exact public-facing address and display format are approved |
| Business hours | Hours, time zone, and exception handling are approved |
| Legal entity name | The entity responsible for the website and policy wording is confirmed |
| Registration or license | The identifier is verified and publication is approved |
| Certification badge | Certification is valid, relevant, current, and permission to display exists |
| Client or supplier logo | The relationship is verified and display permission exists |
| Social profile | URL is official, verified, maintained, and appropriate for the brand |
| Cookie settings link | Nonessential cookies exist and a consent-management interface is implemented |
| Accessibility statement | The page exists and accurately describes the current product |
| Language switcher | A second locale is complete enough for public release |

Empty conditional areas must not leave blank columns, empty headings, or decorative placeholders.

---

## 6. `FooterCTA` Specification

### 6.1 Purpose

The pre-footer CTA gives a qualified visitor one clear final action after reading a page. It should reduce uncertainty about what to send and what happens next.

It must not imply:

- an instant quotation;
- guaranteed availability;
- guaranteed lowest price;
- automatic technical design;
- immediate supplier commitment;
- confirmed delivery before review.

### 6.2 Approved Persian content

**Heading**

> فاکتور یا لیست خرید آهن دارید؟

**Body copy**

> اگر اقلام موردنیازتان مشخص است، فاکتور یا لیست خرید را بفرستید تا آهن آسا درخواست را بررسی و مسیر انتخاب، تأمین و تحویل را در محدوده توافق‌شده هماهنگ کند.

**Primary action**

> ارسال فاکتور یا لیست خرید

**Secondary action**

> آشنایی با فرایند خرید

**Optional process reassurance**

> پس از دریافت، اطلاعات بررسی می‌شود و برای ادامه با شما هماهنگ می‌کنیم.

### 6.3 Content constraints

- The heading must remain specific to an existing invoice or purchase list.
- The body must not say that Ahan Asa replaces the client's engineer, designer, or structural consultant.
- Keep the body to a maximum of roughly 150 Persian characters where practical.
- Use one primary and at most one secondary action.
- Do not add urgency copy such as “همین حالا”, countdowns, scarcity, or artificial availability messages.
- Do not add a phone number inside the CTA if the same number appears in `FooterContact`.

### 6.4 Placement exceptions

The standard `FooterCTA` may be omitted or simplified on:

- the RFQ submission page, where the form itself is the primary conversion;
- a successful RFQ confirmation page;
- legal and privacy pages, if the CTA would feel intrusive;
- system error pages where recovery must remain the only priority.

For those pages, render `SiteFooter` normally unless the error state makes global navigation unsafe.

### 6.5 Visual treatment

- Preferred surface: Warm Cream `#FBF5EB` or White `#FFFFFF`.
- Text: Steel Navy `#0B2545`.
- Copper may appear as a small directional accent, rule, or approved primary-action treatment.
- Do not use a gradient.
- Avoid a floating card detached from the grid. The CTA should read as a composed closing section.
- The CTA and footer must connect cleanly; avoid a decorative gap that makes them feel unrelated.

### 6.6 Layout

- Mobile: single column; copy first, actions second.
- `md`: copy and action group may remain stacked or form a controlled two-column layout.
- `lg` and above: copy may occupy 7–8 grid columns and actions 4–5 columns.
- Primary action appears first in DOM and reading order.
- On Persian pages, action alignment starts from the RTL reading edge.
- Buttons may stack below `480px`; they must not shrink below readable or touch-safe dimensions.

---

## 7. `FooterBrand` Specification

### 7.1 Required content

The brand block contains:

1. Approved reversed Ahan Asa logo lockup
2. Clear role statement
3. Optional slogan as supporting text
4. Optional verified social links

### 7.2 Approved role statement

Primary Persian role statement:

> مدیریت حرفه‌ای خرید و تأمین آهن برای پروژه‌ها و کسب‌وکارها.

This statement may be refined by `COPY_GUIDELINES.md`, but it must keep the procurement-management meaning. It must not be reduced to “فروش آهن” or rewritten as an unverified market claim.

### 7.3 Approved slogan

> ما مراقب سرمایه شما هستیم.

Rules:

- The slogan is supporting brand expression, not the only explanation of the business.
- Do not visually fuse the slogan into the logo asset.
- Use it once in the footer; do not repeat it in the CTA body.
- If space is constrained, preserve the role statement and omit the slogan before shortening the role statement.

### 7.4 Logo rules

- Use the official Persian reversed horizontal lockup when approved and available.
- Until the Persian lockup is approved, use an approved available reversed asset; do not typeset an imitation wordmark.
- Minimum full-lockup width: `120px`.
- Preserve at least the approved `1x` clear space.
- Use icon-only only if the full lockup cannot meet minimum size.
- Never animate the master mark.
- Never add shadow, glow, outline, embossing, or Copper recoloring to the reversed mark.

---

## 8. Footer Navigation Architecture

### 8.1 Principles

- Footer navigation is curated, not exhaustive.
- Prefer 3 concise groups with 3–5 links each.
- Every link must answer a plausible next-step question.
- Do not repeat the same destination in multiple groups unless a legal or usability requirement justifies it.
- Do not expose unpublished, empty, or placeholder pages.
- Group labels must be visible; a list of unlabeled links is not permitted.
- Internal links must resolve through centralized route helpers.

### 8.2 Proposed Phase 1 group model

The following is the preferred content model. `ROUTES.md` remains authoritative for final paths and release status.

#### Group A — خرید و تأمین

| Link ID | Persian label | Semantic destination | Requirement |
|---|---|---|---|
| `procurement-process` | فرایند خرید | `route.process` | Required |
| `procurement-services` | خدمات مدیریت خرید | `route.capabilities` | Required |
| `material-scope` | حوزه‌های تأمین | `route.materials` | Only when the page contains approved scope |
| `purchase-faq` | سؤالات متداول | `route.faq` or approved homepage anchor | Required when FAQ content exists |
| `submit-requirement` | ارسال فاکتور یا لیست خرید | `route.rfq` | Required; may use stronger visual emphasis |

#### Group B — راهنما و تجربه

| Link ID | Persian label | Semantic destination | Requirement |
|---|---|---|---|
| `buying-guides` | راهنمای خرید آهن | `route.resources` | Show when at least one useful resource is published |
| `insights` | مقالات و تحلیل‌ها | `route.insights` | Show when archive is published and maintained |
| `evidence` | تجربه‌ها و نمونه‌های واقعی | `route.evidence` | Show only with verified evidence |
| `required-information` | برای بررسی درخواست چه اطلاعاتی لازم است؟ | `route.requirementsGuide` | Optional; use a shorter approved label if needed |

#### Group C — آهن آسا

| Link ID | Persian label | Semantic destination | Requirement |
|---|---|---|---|
| `about` | درباره آهن آسا | `route.about` | Required |
| `contact` | تماس با ما | `route.contact` | Required |
| `privacy` | حریم خصوصی | `route.privacy` | Prefer utility row; do not duplicate by default |
| `terms` | شرایط استفاده | `route.terms` | Prefer utility row; do not duplicate by default |

### 8.3 Route contract

This document defines semantic route keys, not final path strings. Claude Code must:

1. Resolve every key through `ROUTES.md` or the project's central route registry.
2. Preserve the current locale.
3. Use canonical paths.
4. Avoid query parameters for ordinary footer navigation.
5. Use a real URL fragment only when the target is a stable, unique, accessible section.
6. Remove a link when its destination is not released; never use `href="#"`.
7. Avoid linking to a filtered or transient client-only state unless that behavior is explicitly approved.

### 8.4 Link priority

Within each RTL list, place the highest-value and most understandable destination first. The RFQ link may have an arrow or stronger weight, but it must still look like navigation—not a second competing primary button.

### 8.5 Prohibited footer links

Do not add any of the following without an approved page and business requirement:

- daily steel price;
- live market prices;
- all cities or provinces;
- a long list of product keywords;
- supplier portal;
- customer dashboard;
- order tracking;
- careers;
- franchise;
- investor relations;
- mobile app download;
- unsupported languages;
- empty project or testimonial archives.

---

## 9. `FooterContact` Specification

### 9.1 Purpose

Contact information must offer a direct, low-friction path while setting no false expectation about response speed or operational coverage.

### 9.2 Preferred order

Render only verified items, in this order:

1. Phone
2. Email
3. WhatsApp or approved direct messenger
4. Physical address
5. Business hours

If only one or two methods are verified, render only those methods and allow the layout to reflow.

### 9.3 Persian labels

| Contact type | Label |
|---|---|
| Section heading | ارتباط با آهن آسا |
| Phone | تلفن |
| Email | ایمیل |
| WhatsApp | واتس‌اپ |
| Address | نشانی |
| Hours | ساعات پاسخ‌گویی |

### 9.4 Data rules

- Values must come from a typed, centralized, verified content source.
- Phone display text may be localized, but the `tel:` value must use an international machine-readable format.
- Email `href` must use `mailto:` and visible text must match the approved address.
- WhatsApp URL must use the approved business number and must not contain sensitive prefilled information.
- The address must be plain text with an optional approved map link; never embed an interactive map in the footer.
- Business hours must state the relevant time zone if visitors may be outside Iran.
- Do not claim 24/7 availability unless it is operationally true and approved.
- Do not add “پاسخ‌گویی فوری” or response-time guarantees without evidence.

### 9.5 Mixed-direction behavior

Phone numbers, email addresses, URLs, and Latin registration strings must be isolated from RTL text.

Use one of these patterns:

```html
<a href="tel:+98XXXXXXXXXX" dir="ltr">+98 XX XXX XXXX</a>
```

```html
<bdi>info@example.com</bdi>
```

Never reverse number order with manual character manipulation or CSS-only visual reordering.

---

## 10. Social Links

### 10.1 Policy

Social links are optional. A short, trustworthy footer without social icons is better than linking to inactive, unofficial, or empty accounts.

### 10.2 Requirements

- Every profile must be verified as official.
- Profile ownership and maintenance responsibility must be known.
- Use approved outline icons from the project icon system.
- Icon-only links require accurate Persian accessible names such as `لینکدین آهن آسا`.
- Minimum interactive target: `44 × 44px`.
- External links may open in a new tab only when project policy approves it; if used, include `rel="noopener noreferrer"` and an accessible new-window hint.
- Do not use platform brand colors that disrupt the footer palette.
- Do not show follower counts.
- Do not embed feeds, posts, or third-party social scripts in the footer.

### 10.3 Preferred order

If approved and active:

1. LinkedIn
2. Instagram
3. Other business-relevant channels

Do not add a platform merely because an icon is available.

---

## 11. Legal and Utility Row

### 11.1 Required content

The bottom utility row must contain:

- copyright statement;
- privacy link;
- terms or website-use link when published;
- optional cookie settings control when required;
- optional locale switcher when multiple locales are released.

### 11.2 Approved copyright pattern

> © {currentYear} آهن آسا. تمامی حقوق محفوظ است.

Rules:

- Generate `currentYear` safely at build or render time.
- Do not expose a hydration mismatch.
- If a legal entity must be named, use the approved legal wording from policy documents.
- Do not imply that the brand name itself is the registered legal entity unless confirmed.

### 11.3 Legal link labels

| Link | Persian label |
|---|---|
| Privacy | حریم خصوصی |
| Terms | شرایط استفاده |
| Cookie settings | تنظیمات حریم خصوصی |
| Accessibility statement | دسترس‌پذیری |

### 11.4 Locale control

The footer locale control is secondary to the header locale control and may be omitted when only Persian is launched.

When enabled:

- list only complete, released locales;
- link to the equivalent localized route when available;
- otherwise link to that locale's homepage and make the behavior consistent;
- update `lang` and `dir` at document level after navigation;
- never label an incomplete machine-translated version as fully supported.

---

## 12. Visual Design

### 12.1 Color contract

| Element | Preferred token/value | Rule |
|---|---|---|
| Footer background | semantic footer surface mapped to Steel Navy `#0B2545` | Required core surface |
| Primary footer text | White `#FFFFFF` | Use for headings and essential text |
| Secondary footer text | approved high-contrast light neutral | Must meet `4.5:1` |
| Divider | approved low-emphasis light border | Must remain visible without creating a boxed grid |
| Accent | Forge Copper `#B04A2F` | Small accents only; not long text on Navy |
| Pre-footer CTA surface | Warm Cream `#FBF5EB` or White | Maintain Steel Navy text contrast |
| Focus ring | approved high-contrast focus token | Must remain visible on Navy and Cream |

Do not use Steel Navy text on Forge Copper for essential content; the approved contrast is insufficient for normal text.

### 12.2 Typography

- Persian UI and copy: `Estedad Variable`, with approved fallbacks.
- Footer body copy must not be smaller than `16px` by default.
- Utility/legal text may use `14px` only if contrast and readability remain strong.
- Group headings should use a compact, confident weight rather than oversized display typography.
- Keep line height generous enough for Persian diacritics and multi-line links.
- Use the typography scale from `DESIGN_SYSTEM.md`; do not define an isolated footer type system.

### 12.3 Shape and decoration

- The main footer is a full-width structural surface, not a rounded floating card.
- The pre-footer CTA may use an approved large radius only if it remains aligned with the main grid.
- Avoid shadows on the Navy footer.
- Use one subtle top divider or surface transition; do not stack multiple rules.
- Do not add industrial textures, steel patterns, grids, bolts, sparks, flames, or decorative stock imagery.
- Do not place a large watermark logo behind text.

### 12.4 Image policy

The default footer contains no photography or video. If a future campaign adds imagery, it must remain outside the essential navigation region and follow `MEDIA_GUIDELINES.md`.

---

## 13. Layout and Grid

### 13.1 Container

Use the global container contract:

```css
.container {
  inline-size: min(100% - (2 * var(--aa-page-gutter)), var(--aa-container-max));
  margin-inline: auto;
}
```

Reference tokens:

```css
:root {
  --aa-container-max: 80rem;
  --aa-page-gutter: clamp(1rem, 3vw, 2rem);
}
```

### 13.2 Desktop composition

At `lg` and above, use the 12-column global grid.

Preferred allocation:

- Brand block: 4 columns
- Navigation group A: 2 columns
- Navigation group B: 2 columns
- Navigation group C: 2 columns
- Contact block: 2 columns

The exact spans may adapt to real content, but:

- the brand block remains visually dominant;
- navigation columns align to shared grid lines;
- the contact block must not become too narrow for email or phone content;
- empty groups must collapse rather than preserve unused columns.

### 13.3 Vertical rhythm

- Use approved spacing tokens only.
- Footer top and bottom padding should feel generous but not create a ceremonial empty area.
- Separate brand/navigation content from the utility row with one clear spacing step and optional divider.
- Link rows should have enough block padding to provide usable touch and focus areas.
- Do not compress the footer solely to reduce page length.

### 13.4 Reading order

Persian DOM order and visual order must match:

1. Brand block
2. Procurement navigation
3. Resources navigation
4. Company navigation
5. Contact
6. Legal and copyright

Do not use CSS `order` to create a desktop arrangement that differs from keyboard or screen-reader order.

---

## 14. Responsive Behavior

### 14.1 Breakpoint contract

Use the global mobile-first breakpoints:

| Token | Minimum width | Footer behavior |
|---|---:|---|
| `base` | `0px` | Single-column stacked layout |
| `sm` | `480px` | Buttons may align inline; contact values gain space |
| `md` | `768px` | Two or three structured columns |
| `lg` | `1024px` | Full multi-column footer grid |
| `xl` | `1280px` | Standard wide desktop rhythm |
| `2xl` | `1440px` or project token | More whitespace, not more links or larger copy by default |

`RESPONSIVE_RULES.md` is authoritative if the final `2xl` token differs.

### 14.2 Mobile — `320px` to `767px`

- Stack brand, navigation groups, contact, and utility content.
- Keep all group headings visible.
- Prefer static link lists when each group has five or fewer links.
- A disclosure pattern is permitted only when content volume justifies it.
- If disclosures are used, they must be native or accessible buttons with correct expanded state; do not make the heading itself an unlabeled clickable area.
- Legal information must remain visible and must not be hidden inside a collapsed group by default.
- FooterCTA buttons stack at narrow widths and become full available width only when that improves usability.
- Long emails and URLs must wrap safely without causing horizontal page scroll.
- Apply safe-area padding where needed on notched devices.

### 14.3 Tablet — `md`

- Use two or three columns based on actual content.
- Brand may span the full first row if that produces clearer hierarchy.
- Contact may share a row with Company navigation if values remain readable.
- Utility links may wrap; they must not overflow or become excessively separated.

### 14.4 Desktop — `lg` and above

- Use the full 12-column composition.
- Keep group headings and first links aligned across columns.
- Do not stretch link groups across the entire width.
- FooterCTA uses a controlled two-column composition when copy length permits.
- The utility row may place copyright on the RTL start side and legal links on the opposite side, while preserving logical DOM order.

### 14.5 Large screens

- Keep the footer within `--aa-container-max`.
- Add whitespace outside the content container; do not increase content density.
- Do not enlarge the logo beyond its appropriate role.
- Do not spread a few links across extreme distances.

### 14.6 Zoom and reflow

The footer must remain usable at:

- `200%` browser zoom;
- `400%` zoom/reflow where applicable;
- increased OS text size;
- a `320 CSS px` viewport.

No footer content may overlap, disappear, or require horizontal page scrolling.

---

## 15. Interaction States

### 15.1 Text links

Every footer link must implement:

- default;
- hover;
- focus-visible;
- active/pressed;
- visited, if the global design system exposes a controlled visited state;
- disabled-by-data as omission, not as a nonfunctional visible link.

### 15.2 Hover

- Hover must be subtle and functional.
- Preferred treatment: text color change plus directional underline or arrow movement of no more than a few pixels.
- Hover must not cause layout shift.
- Essential meaning cannot depend on hover.
- Apply hover enhancements only under `@media (hover: hover) and (pointer: fine)`.

### 15.3 Focus

- Use `:focus-visible` with a clearly visible high-contrast ring or underline.
- Focus must not be clipped by overflow containers.
- The focus treatment must be equally visible on Navy, White, and Warm Cream.
- Focus order follows DOM and reading order.

### 15.4 Contact actions

- Phone and email links must be directly actionable.
- Do not intercept them with a modal unless there is a documented need.
- If click-to-copy is added later, keep the original link behavior available and provide an announced confirmation.

### 15.5 Disclosure behavior

If mobile link groups use disclosure:

- use a button with `aria-expanded` and `aria-controls`;
- keep the group label readable whether open or closed;
- do not trap focus;
- do not close a group merely because focus leaves it;
- do not persist disclosure state across unrelated pages;
- default the most important procurement group open;
- in reduced-motion mode, change state without animated height.

---

## 16. Motion and Micro-Interaction

### 16.1 Motion principle

Footer motion must express **calm control**. It may confirm interaction but must never delay access to navigation or contact information.

### 16.2 Approved motion

- Link underline or arrow transition: fast token, approximately `160ms`.
- Focus state: immediate or instant token.
- Disclosure expansion: base token, approximately `240ms`, only when technically safe.
- Optional FooterCTA entrance: one restrained controlled fade-up when the global page reveal system already uses it.

### 16.3 Prohibited motion

- Staggering every footer link into view;
- animating the logo;
- looping arrows or pulsing CTA buttons;
- parallax;
- bouncing social icons;
- animated counters;
- automatic disclosure opening;
- scroll-jacking near the end of the page;
- any effect that hides server-rendered footer content until JavaScript runs.

### 16.4 Reduced motion

Under `prefers-reduced-motion: reduce`:

- remove reveal movement;
- remove smooth scrolling initiated by footer links;
- use immediate disclosure state changes;
- preserve visible hover, focus, pressed, and active states without motion dependence.

---

## 17. Accessibility Requirements

### 17.1 Semantic structure

Use one page-level `<footer>` landmark.

Recommended structure:

```html
<footer aria-labelledby="site-footer-title">
  <h2 id="site-footer-title" class="visually-hidden">پاورقی وب‌سایت آهن آسا</h2>
  <!-- FooterCTA may have its own visible h2 -->
  <!-- Brand, navigation, contact, and utility content -->
</footer>
```

Each navigation group should use a labeled `<nav>` or one labeled footer `<nav>` containing clearly headed lists. Avoid creating many redundant navigation landmarks without distinct accessible names.

### 17.2 Link lists

- Use `<ul>` and `<li>` for grouped navigation.
- Use `<a>` for destinations.
- Do not use `div` or `span` elements as links.
- Do not put buttons inside links or links inside buttons.
- Icon-only links require accessible names.
- Decorative icons use `aria-hidden="true"`.

### 17.3 Heading hierarchy

- `FooterCTA` heading is normally `h2`.
- The site footer has a visually hidden `h2` landmark title.
- Group headings may use `h3` when nested under that footer title.
- Do not choose heading levels for visual size.

### 17.4 Target size

- Primary buttons: minimum `44 × 44px`.
- Contact and social controls: minimum `44 × 44px`.
- Text links must have sufficient block spacing or an equivalent target area.
- Closely packed legal links must still meet the minimum pointer target or spacing exception requirements.

### 17.5 Contrast

- Normal text: at least `4.5:1`.
- Large text and essential non-text UI: at least `3:1`.
- Focus indicators: at least `3:1` against adjacent colors.
- Disabled-looking low-opacity footer text is prohibited for active links.
- Placeholder-gray contact information is prohibited.

### 17.6 External links

If an external link opens a new window, include a visible or screen-reader-accessible indication. Do not announce “opens in a new window” for internal links.

### 17.7 Screen readers

- The logo link accessible name should be `آهن آسا — صفحه اصلی`.
- Contact labels must not depend solely on icons.
- Persian text must be under `lang="fa"` and RTL direction at the document level.
- Latin substrings must use `bdi` or explicit direction where necessary.
- Disclosure state must be announced correctly.

---

## 18. SEO and Crawlability

1. Footer internal links must be server-rendered anchor elements with valid `href` values.
2. Do not implement primary footer navigation through click handlers or client-only router state.
3. Link only to canonical, indexable pages unless a legal or functional destination must be non-indexable.
4. Do not add location or product keyword lists for SEO manipulation.
5. Use concise descriptive Persian anchor text; avoid repeated exact-match keyword variants.
6. Do not link to search-result pages, empty filters, or parameterized duplicates unless explicitly approved.
7. Do not use `nofollow` on ordinary internal navigation.
8. Do not place hidden SEO text in the footer.
9. Organization structured data is owned by the global metadata architecture, not inferred from visible footer copy.
10. A visible address or phone number must not automatically be added to JSON-LD unless the same verified data source owns both outputs.

---

## 19. Content and Data Model

### 19.1 Single source of truth

Footer content must come from structured content/configuration, not duplicated JSX strings across layouts.

Recommended conceptual model:

```ts
type VerificationState = "verified" | "pending" | "disabled";

type FooterLink = {
  id: string;
  label: string;
  routeKey?: string;
  href?: string;
  external?: boolean;
  newWindow?: boolean;
  state: "published" | "hidden";
  analyticsId: string;
};

type FooterGroup = {
  id: string;
  label: string;
  links: FooterLink[];
};

type ContactItem = {
  id: "phone" | "email" | "whatsapp" | "address" | "hours";
  label: string;
  displayValue: string;
  href?: string;
  dir?: "ltr" | "rtl" | "auto";
  verification: VerificationState;
};

type SocialItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  verification: VerificationState;
};

type FooterContent = {
  locale: string;
  direction: "rtl" | "ltr";
  brand: {
    logoAsset: string;
    logoAlt: string;
    homeLabel: string;
    roleStatement: string;
    slogan?: string;
  };
  cta?: {
    enabled: boolean;
    heading: string;
    body: string;
    primary: FooterLink;
    secondary?: FooterLink;
    reassurance?: string;
  };
  groups: FooterGroup[];
  contacts: ContactItem[];
  socials: SocialItem[];
  legalLinks: FooterLink[];
  copyrightTemplate: string;
};
```

### 19.2 Validation rules

At build time or in content validation:

- reject `href="#"`;
- reject empty labels;
- reject duplicate link IDs;
- reject duplicate destinations unless explicitly allow-listed;
- reject unverified contact and social items from the published output;
- reject external links without valid `https:` URLs, except approved `mailto:` and `tel:` actions;
- reject missing legal links required by the deployed tracking and form behavior;
- reject a CTA without a valid primary destination;
- warn if a navigation group has more than five links;
- warn if total primary footer navigation exceeds fifteen links;
- warn if link labels exceed the approved compact length;
- reject an unsupported locale from public navigation.

### 19.3 No placeholder leakage

The following strings must never ship:

- `TODO`;
- `TBD`;
- `Lorem ipsum`;
- `example.com`;
- dummy phone numbers;
- placeholder social handles;
- generic address text;
- fake registration numbers.

---

## 20. Localization and Direction

### 20.1 Persian launch

- Primary content is Persian.
- Set `lang="fa"` and `dir="rtl"` at document level.
- Use Persian punctuation and natural professional Persian copy.
- Do not translate route slugs inside components; use the route registry.
- Do not concatenate translated fragments to build sentences.

### 20.2 Future locales

- Content structure may be shared, but labels and copy must be locale-specific.
- LTR layouts must use logical CSS properties, not duplicated left/right styles.
- The brand name may use locale-specific approved lockups.
- Contact values remain shared when operationally identical, while display formatting may differ.
- Do not publish an English or Arabic footer before its linked pages and legal content are complete.

### 20.3 Logical CSS

Prefer:

- `margin-inline`;
- `padding-inline`;
- `border-inline-start`;
- `inset-inline-start`;
- `text-align: start`;
- `inline-size` and `block-size`.

Avoid directional hardcoding such as `margin-left` unless the value is truly physical and documented.

---

## 21. Analytics Contract

### 21.1 Required events

| Event | Trigger | Allowed parameters |
|---|---|---|
| `footer_cta_click` | Primary or secondary FooterCTA action | `cta_id`, `destination_key`, `locale`, `page_type` |
| `footer_nav_click` | Internal footer navigation | `link_id`, `group_id`, `destination_key`, `locale` |
| `footer_contact_click` | Phone, email, WhatsApp, or map action | `contact_type`, `locale`, `page_type` |
| `footer_social_click` | Verified social profile link | `platform`, `locale` |
| `footer_legal_click` | Privacy, terms, accessibility, or settings | `link_id`, `locale` |
| `footer_locale_change` | Footer locale selection | `from_locale`, `to_locale`, `route_match_state` |

### 21.2 Privacy rules

- Do not send phone numbers, email addresses, contact text, invoice names, filenames, or user-entered data to analytics.
- Do not send full URLs containing query parameters.
- Use stable semantic IDs.
- Respect consent and analytics availability.
- Analytics failure must never block navigation.
- Do not fire click events on impression alone.

### 21.3 Event quality

- Prevent duplicate events from nested click handlers.
- Track the actual activated link, including keyboard activation.
- Keep event naming consistent with `ANALYTICS_TRACKING.md` if it defines a different project-wide convention.

---

## 22. Performance Requirements

1. `SiteFooter` should be a server component or equivalent static/server-rendered shell by default.
2. Do not make the entire footer a client component for analytics or disclosures; isolate the smallest interactive subcomponent.
3. Do not load third-party social embeds, maps, chat widgets, or market feeds in the footer.
4. Use optimized SVG logo and icon assets.
5. Set explicit asset dimensions to prevent layout shift.
6. Avoid footer-specific font downloads.
7. Avoid JavaScript for layout.
8. Disclosure JavaScript, if used, must be minimal and progressively enhanced.
9. Footer rendering must not delay Largest Contentful Paint.
10. No motion may trigger expensive continuous layout or paint work.

Preferred CSS animation properties are `transform` and `opacity`; animated `height` should be avoided or carefully controlled.

---

## 23. Security and Link Safety

- Sanitize CMS-managed URLs.
- Allow-list protocols: `https:`, approved `http:` only for exceptional legacy links, `mailto:`, and `tel:`.
- Reject `javascript:` and unsafe data URLs.
- External new-window links require `noopener noreferrer`.
- Do not expose internal CRM endpoints, upload storage URLs, private form handlers, or staff contact data.
- Do not place email addresses in client-side obfuscation that breaks accessibility.
- Contact form routes must use the approved public RFQ flow.
- Do not expose environment variables or configuration secrets in footer data.

---

## 24. Component Responsibilities

### 24.1 `SiteFooter`

Owns:

- global semantic footer landmark;
- composition and responsive grid;
- locale-specific content selection;
- omission of empty regions;
- utility row placement.

Does not own:

- route definitions;
- business data verification;
- legal policy content;
- analytics implementation details outside event dispatch;
- page-specific CTA copy.

### 24.2 `FooterCTA`

Owns:

- closing conversion content;
- primary and secondary actions;
- approved page-level suppression mode.

Does not own the RFQ form itself.

### 24.3 `FooterNavigation`

Owns:

- labeled groups;
- semantic lists;
- link rendering;
- optional mobile disclosure behavior.

Does not invent routes or expose unpublished content.

### 24.4 `FooterContact`

Owns:

- verified contact item rendering;
- mixed-direction formatting;
- accessible labels.

Does not hardcode phone, email, address, hours, or social data.

### 24.5 `FooterUtilityRow`

Owns:

- copyright;
- legal links;
- optional cookie settings trigger;
- optional locale control.

---

## 25. Suggested File Placement

Adapt names to `FOLDER_STRUCTURE.md` and `COMPONENT_ARCHITECTURE.md`. A typical Next.js structure may use:

```text
components/
└── site-shell/
    └── footer/
        ├── site-footer.tsx
        ├── footer-cta.tsx
        ├── footer-navigation.tsx
        ├── footer-contact.tsx
        ├── footer-social-links.tsx
        ├── footer-utility-row.tsx
        ├── footer.module.css
        ├── footer.types.ts
        └── footer.test.tsx

content/
└── footer/
    ├── fa.ts
    └── en.ts            # only when approved

lib/
├── routes.ts
├── verified-business-data.ts
└── analytics/
    └── footer-events.ts
```

Do not create this exact structure if the project already has an approved shell or content architecture. Reuse existing conventions.

---

## 26. State and Failure Handling

### 26.1 Missing contact data

- Omit unverified contact items.
- If no contact item is verified, keep the RFQ and Contact-page navigation routes and remove the contact block.
- Do not display “اطلاعات تماس به‌زودی” unless an approved publication plan exists.

### 26.2 Missing optional routes

- Omit the link.
- Reflow the group.
- If a group becomes empty, omit the group.
- Do not link to a 404, disabled route, or empty archive.

### 26.3 Analytics unavailable

- Navigation proceeds normally.
- No user-facing error is shown.

### 26.4 Logo asset failure

- Use the approved local fallback asset if configured.
- Do not replace it with typed imitation branding.
- Preserve an accessible home link label.

### 26.5 JavaScript unavailable

- All links work.
- Static mobile lists remain visible.
- If disclosure requires JavaScript, the no-JavaScript state defaults to expanded content.

---

## 27. Test Matrix

### 27.1 Viewports

Test at:

| Width | Condition |
|---:|---|
| `320px` | Minimum supported mobile |
| `375px` | Common narrow mobile |
| `430px` | Large mobile |
| `768px` | Tablet / `md` boundary |
| `1024px` | `lg` boundary and full layout transition |
| `1280px` | Standard desktop |
| `1440px` | Wide desktop |
| `1920px` | Large-screen max-width behavior |

Test 1px below and above any breakpoint used by the component.

### 27.2 Content stress cases

- Long Persian group label;
- long email address;
- international phone formatting;
- four-line role statement;
- one contact method only;
- no social links;
- one empty navigation group;
- all optional links enabled;
- future LTR locale;
- 200% zoom;
- increased text size;
- reduced motion;
- forced colors/high-contrast mode where supported.

### 27.3 Input methods

- Keyboard only;
- mouse;
- touch;
- screen reader;
- voice control where available.

### 27.4 Browsers

- Current Chrome;
- Current Edge;
- Current Firefox;
- Current Safari;
- iOS Safari;
- Android Chrome.

---

## 28. Acceptance Criteria

The footer is ready for release only when:

- [ ] The role statement clearly identifies procurement management, not generic steel selling
- [ ] The primary CTA is “ارسال فاکتور یا لیست خرید” or an approved equivalent
- [ ] The CTA does not promise instant pricing, guaranteed availability, or guaranteed delivery
- [ ] The reversed approved logo asset is used correctly on Steel Navy
- [ ] No logo geometry, typography, or color has been recreated or modified
- [ ] All links resolve to real, released, canonical destinations
- [ ] No `href="#"`, dead route, empty archive, or placeholder page is linked
- [ ] Footer navigation is concise and does not duplicate the full sitemap
- [ ] No keyword dump, daily-price feed, or product-price list appears
- [ ] All visible contact data is verified and centralized
- [ ] No unverified address, registration, certification, partner logo, service area, or metric appears
- [ ] Persian copy, punctuation, RTL order, and mixed-direction values are correct
- [ ] Navigation uses semantic lists and real anchor elements
- [ ] One page-level footer landmark is present
- [ ] Heading hierarchy is valid
- [ ] Keyboard focus is visible and not clipped
- [ ] All targets are adequately sized
- [ ] Text, icon, focus, and border contrast meet WCAG 2.2 AA
- [ ] Layout works from `320px` through large desktop widths
- [ ] Legal and copyright information remains visible on mobile
- [ ] No horizontal page scroll occurs
- [ ] Footer remains functional without JavaScript
- [ ] Reduced-motion behavior is correct
- [ ] Internal links preserve locale and canonical routing
- [ ] Analytics fires once per valid activation and contains no PII
- [ ] No third-party embeds, market feeds, or heavy scripts are loaded
- [ ] No layout shift is introduced by logo or icon assets
- [ ] The footer has been checked at 200% zoom and with real Persian content

---

## 29. QA Scenarios

### Scenario A — Qualified visitor on an article

1. Visitor reaches the end of a buying guide.
2. FooterCTA asks whether they have an invoice or purchase list.
3. Primary action opens the approved RFQ route.
4. Secondary action opens the procurement process.
5. Visitor can still reach About, Contact, and Privacy without competing CTAs.

**Pass condition:** the conversion path is clear, factual, and non-aggressive.

### Scenario B — Mobile visitor with long contact values

1. Viewport is `320px`.
2. Email and phone display in correct order.
3. Values wrap or isolate direction safely.
4. No page-level horizontal scroll occurs.
5. Touch targets remain at least `44px`.

**Pass condition:** all contact actions remain readable and usable.

### Scenario C — Unverified social and address data

1. Social items and address have `pending` verification.
2. Published footer renders neither.
3. No empty heading, gap, or placeholder remains.

**Pass condition:** the layout collapses cleanly and no unsupported information appears.

### Scenario D — Keyboard navigation

1. User tabs from the final main-content control into FooterCTA.
2. Focus follows visual and RTL reading order.
3. Focus indicators remain clearly visible on Cream and Navy surfaces.
4. User activates every link with the keyboard.

**Pass condition:** no trap, skipped control, clipped ring, or confusing order exists.

### Scenario E — JavaScript disabled

1. Footer HTML is server-rendered.
2. All important links remain visible.
3. Navigation works with normal browser behavior.
4. Analytics and optional motion are absent without affecting completion.

**Pass condition:** core footer functionality remains intact.

---

## 30. Explicitly Deferred Decisions

Claude Code must not guess:

- final route paths before `ROUTES.md` is authoritative;
- final published page set before `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md` are reconciled;
- official phone, email, WhatsApp, address, or business hours;
- public legal entity wording;
- privacy and terms page text;
- active social platforms and profile URLs;
- whether an English or Arabic locale is ready;
- whether cookie consent or a settings control is required;
- whether a physical office address should be public;
- whether any certification, registration, supplier, or client mark may appear;
- the final approved Persian reversed logo asset filename;
- any newsletter or account-related functionality.

Until confirmed, these items remain absent from the production footer.

---

## 31. Implementation Instructions for Claude Code

Before implementing or changing the footer, Claude Code must:

1. Read the authoritative files listed in the source hierarchy.
2. Resolve final routes from the central route registry.
3. Resolve business data only from a verified configuration source.
4. Inventory existing global shell, button, link, icon, container, and typography components.
5. Reuse approved primitives before creating new ones.
6. Implement the Persian RTL version first.
7. Render SEO-critical links on the server.
8. Keep client-side code limited to optional disclosures, consent controls, or analytics boundaries.
9. Add semantic HTML before ARIA.
10. Test real Persian copy, long mixed-direction values, and missing optional data.
11. Validate keyboard, focus, contrast, zoom, reflow, reduced motion, and no-JavaScript behavior.
12. Record any approved exception in `DECISIONS.md`.

Claude Code must stop and request clarification rather than inventing any unresolved route, business fact, legal statement, contact value, or trust claim.

---

## 32. Definition of Done

`SiteFooter` is complete when it functions as a reliable final layer of the Ahan Asa experience: it explains the brand's procurement role, offers a qualified action, exposes a concise and accurate navigation set, provides verified contact routes, completes legal obligations, preserves Persian RTL semantics, and remains accessible and performant across all supported conditions.

The footer must make the visitor feel that Ahan Asa is organized, accountable, and protective of project capital—without noise, pressure, or unsupported claims.

