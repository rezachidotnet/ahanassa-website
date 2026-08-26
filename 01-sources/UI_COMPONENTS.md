# Ahan Asa Website — UI Component Library

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `UI_COMPONENTS.md`  
> **Status:** Draft v1.0 — Implementation contract  
> **Last updated:** 2026-08-25  
> **Primary website language:** Persian (Farsi), fully RTL

---

## 1. Purpose

This document defines the reusable UI component library for the Ahan Asa website. It converts the approved brand, experience, and design-system rules into an implementation contract that Claude Code can apply consistently across pages.

The library must make Ahan Asa feel like a calm, technically credible, premium steel procurement-management partner—not a steel marketplace, price board, consumer shop, or generic construction template.

This document defines:

- the approved component inventory;
- component responsibilities and boundaries;
- required variants, sizes, states, and behaviors;
- accessibility, RTL, responsive, and performance rules;
- the distinction between primitives, composites, and page patterns;
- expected component APIs at a contract level;
- reuse, testing, documentation, and change-control requirements.

It does not define final page copy, route inventory, form integrations, analytics events, or production business data. Those remain governed by their specialized documents.

## 2. Source-of-Truth Hierarchy

Claude Code must resolve decisions in this order:

1. `PROJECT_BRIEF.md`
2. `BRAND_GUIDELINES.md`
3. `DESIGN_DIRECTION.md`
4. `DESIGN_SYSTEM.md`
5. `UI_COMPONENTS.md`
6. Approved page, content, form, SEO, accessibility, motion, and responsive specifications
7. Existing production implementation
8. Task-specific instructions

If a lower-authority source conflicts with a higher-authority source, stop and report the conflict. Do not silently choose, merge, or reinterpret incompatible requirements.

## 3. Component-Library Principles

### 3.1 Calm control

Every component should help the visitor understand, compare, verify, or act. Decorative UI that does not support a purchasing decision should not be introduced.

### 3.2 Premium through restraint

Premium quality comes from typography, spacing, alignment, material truth, predictable behavior, and precise feedback. It must not depend on excessive shadows, gradients, glass effects, animation, or repeated Copper accents.

### 3.3 Procurement, not retail

Components must support consultation, document submission, requirement clarification, supplier evaluation, technical comparison, evidence, and project inquiry. They must not imply instant checkout, public inventory, live trading, flash sales, or price urgency.

### 3.4 Proof before claims

Components may display only approved, verifiable evidence. Empty evidence areas must remain honest; they must never be filled with invented counters, testimonials, supplier logos, project quantities, certifications, prices, or delivery claims.

### 3.5 Persian-first and direction-safe

Persian RTL behavior is the primary implementation case. The same component implementation must remain structurally safe for future LTR locales. Separate RTL and LTR versions are prohibited.

### 3.6 Accessible by default

Semantic HTML, keyboard access, visible focus, clear labels, accurate status feedback, reduced motion, sufficient contrast, and usable touch targets are default component requirements.

### 3.7 Server-first

Components are server-rendered by default. A component becomes a client component only when it requires browser state, event handling, measurement, focus management, or another genuine client-side behavior.

### 3.8 Composition over duplication

New use cases should be built by composing existing primitives and patterns. Do not copy and rename a component to create minor visual differences.

## 4. Component Architecture

The library uses five layers:

| Layer | Purpose | Examples |
|---|---|---|
| Foundations | Tokens, icons, utilities, direction handling | semantic tokens, `DirectionalValue`, `VisuallyHidden` |
| Primitives | Small reusable building blocks | `Container`, `Stack`, `Button`, `Input`, `Badge` |
| Composites | Multiple primitives forming one reusable behavior | `FormField`, `FileUpload`, `Accordion`, `DataTable` |
| Patterns | Reusable content structures tied to Ahan Asa's experience | `ProcurementProcess`, `EvidenceCard`, `CtaBand` |
| Shells | Global or page-level composition | `SiteHeader`, `MobileNavigation`, `SiteFooter`, `PageHero` |

Rules:

- A primitive must not contain business-specific copy.
- A composite may define behavior but must receive its content through typed data or children.
- A pattern may encode approved Ahan Asa content structure, but not unverified production facts.
- A shell may coordinate layout, navigation, and global actions but must not own page-specific content.
- Page files compose shells and patterns; they should not recreate primitive styling locally.

## 5. Shared Component Contract

### 5.1 Naming

- Use PascalCase component names.
- Use semantic names based on purpose, not appearance.
- Prefer `EvidenceCard` over `LargeCopperCard`.
- Prefer `InquiryForm` over `FormTwo`.
- Use `Link` suffix for navigation components and `Button` for actions.
- Use `List`, `Group`, `Grid`, or `Section` only when the component owns that semantic relationship.

### 5.2 Public API rules

Every public component API must:

- be typed;
- expose the smallest useful surface area;
- use controlled variants rather than arbitrary style props;
- accept semantic content rather than preformatted HTML where practical;
- preserve native attributes for its root element when safe;
- avoid boolean-prop combinations that create invalid states;
- prevent conflicting combinations through types where practical;
- provide stable defaults;
- avoid leaking internal DOM structure into page code.

Arbitrary `color`, `radius`, `shadow`, `padding`, and physical direction props such as `marginLeft` are prohibited. Use approved variants and semantic tokens.

### 5.3 Base props

The following may be supported where relevant:

| Prop | Use |
|---|---|
| `id` | Stable document and accessibility relationship |
| `className` | Narrow escape hatch for layout placement, not visual redesign |
| `children` | Semantic composition |
| `aria-*` | Native accessibility extension when required |
| `data-*` | Testing and approved analytics hooks |
| `dir` | Only when the component contains a genuinely isolated direction context |
| `lang` | Mixed-language content when required |

`className` must not be used by page code to override component color, typography, focus, state, or internal spacing contracts. A repeated override is evidence that a supported variant or new component is required.

### 5.4 Ref behavior

Interactive primitives should forward refs when focus management, integration, or testing reasonably requires it. Ref forwarding must not determine the public component architecture by itself.

### 5.5 Native semantics first

- Use `<button>` for actions.
- Use `<a>` or the approved framework link for navigation.
- Use `<input>`, `<textarea>`, `<select>`, `<fieldset>`, and `<legend>` for forms.
- Use `<details>` and `<summary>` when they satisfy disclosure requirements.
- Use `<table>` for tabular relationships.
- Use `<dialog>` only when browser support and the approved implementation meet focus requirements.
- Add ARIA only when native semantics do not express the required behavior.

### 5.6 Styling contract

- Use centralized `--aa-*` primitive and semantic tokens from `DESIGN_SYSTEM.md`.
- Use CSS logical properties and logical alignment.
- Do not hard-code raw brand colors inside components.
- Do not introduce arbitrary spacing, radius, shadow, or motion values.
- State styling must work on White, Warm Cream, subtle neutral, and Steel Navy surfaces where the variant is approved.
- Phase 1 has no dark-mode component theme.

## 6. Universal State Model

Every interactive component must explicitly cover applicable states:

| State | Required behavior |
|---|---|
| Default | Purpose and interactivity are visually clear |
| Hover | Enhancement only; never the sole discovery mechanism |
| Focus-visible | Clear `2px` Copper outline with offset or approved focus shadow |
| Active/pressed | Immediate physical feedback without large movement |
| Selected/current | Text or semantic indicator in addition to color |
| Disabled | Legible, unavailable, and not communicated through opacity alone |
| Loading | Dimensions remain stable; duplicate action is prevented |
| Success | Specific confirmation and next step where relevant |
| Error | Specific cause or recovery guidance where known |
| Empty | Honest explanation and useful next action |

State rules:

- Focus must remain visible on light, Navy, and Copper surfaces.
- Loading indicators require accessible text or an announced status.
- Async controls must preserve label context and width.
- Error messages must not erase user-entered data.
- Recoverable errors use calm language.
- Skeletons may represent real pending repeatable content, but never fake metrics or evidence.

## 7. Size and Density Contract

### 7.1 Interactive sizes

| Component type | Minimum | Preferred default |
|---|---:|---:|
| Primary button | `44px` high | `48px` high |
| Icon button | `44 × 44px` target | `44 × 44px` or larger |
| Text input/select | `48px` high | `48–52px` high |
| Checkbox/radio label row | `44px` target height | content-driven |
| Navigation item | `44px` target height | content-driven |

### 7.2 Density

- Use comfortable spacing for trust and comprehension.
- Compact density is allowed only for verified data tables, document metadata, and tightly related technical values.
- Do not make primary forms dense to reduce page height.
- Do not use oversized controls as decoration.

## 8. Foundation Utilities

### 8.1 `Container`

Purpose: applies the approved maximum page width and logical page gutters.

Contract:

- uses `--aa-container-max` and `--aa-page-gutter`;
- centers content without changing text direction;
- supports `size="default" | "reading" | "wide"` only when defined by tokens;
- never adds section background, vertical spacing, or typography.

### 8.2 `Section`

Purpose: provides semantic section spacing and optional approved surface.

Suggested API:

```ts
type SectionProps = {
  as?: "section" | "div";
  surface?: "canvas" | "subtle" | "warm" | "inverse";
  spacing?: "compact" | "default" | "spacious";
  labelledBy?: string;
};
```

Rules:

- use `<section>` only when there is a section heading or accessible label;
- inverse surface uses Steel Navy, not an invented dark color;
- Copper is not an approved section surface;
- section spacing is responsive and token-based.

### 8.3 `Stack`

Purpose: lays out children vertically using logical block flow.

- supports approved token gaps only;
- must not encode visual variants;
- remains direction-neutral.

### 8.4 `Cluster`

Purpose: wraps related inline actions, tags, or metadata.

- uses flex-wrap and logical gaps;
- supports `align="start" | "center" | "end" | "between"`;
- source order remains semantic;
- must not reverse DOM order for RTL.

### 8.5 `Grid`

Purpose: supplies approved responsive columns without page-specific media queries.

- supports only documented column patterns;
- collapses according to content needs, not device labels alone;
- does not force equal heights unless the content pattern requires them.

### 8.6 `Divider`

- uses a real border or `<hr>` where semantically appropriate;
- is neutral by default;
- Copper dividers are reserved for small brand accents, not routine separation.

### 8.7 `VisuallyHidden`

- hides content visually while keeping it available to assistive technology;
- must support focus reveal for skip links where applicable;
- must not hide SEO copy merely to influence ranking.

### 8.8 `DirectionalValue`

Purpose: safely isolates mixed-direction values inside Persian content.

Suggested API:

```ts
type DirectionalValueProps = {
  value: string;
  kind: "phone" | "email" | "url" | "code" | "filename" | "dimension" | "latin";
};
```

Contract:

- renders with `dir="ltr"` and `unicode-bidi: isolate` for listed LTR values;
- does not force the surrounding row or field to LTR;
- provides appropriate link semantics for phone, email, and URL only when requested;
- never visually reverses digits, signs, units, or file extensions.

### 8.9 `Icon`

- uses the approved simple geometric icon subset;
- defaults to decorative when placed beside an equivalent visible label;
- takes meaning from context, not brand color alone;
- directional icons mirror through a semantic `directional` contract;
- logos, download, phone, search, media, and standard symbols are not mirrored;
- do not ship a broad icon library when a small optimized subset is sufficient.

## 9. Typography Components

### 9.1 `Heading`

Suggested API:

```ts
type HeadingProps = {
  as: "h1" | "h2" | "h3" | "h4";
  size?: "display" | "h1" | "h2" | "h3" | "h4";
  tone?: "primary" | "brand" | "inverse";
};
```

Rules:

- semantic level and visual size are separate but must not be used to create an invalid heading hierarchy;
- only one page `h1` is allowed;
- Persian is set in the approved Persian family and correct shaping;
- headings must accommodate line wrapping and long Persian words without clipping;
- essential headings are never rendered as images.

### 9.2 `Text`

- supports approved body, lead, supporting, caption, and data styles;
- body text is not smaller than `16px`;
- supporting copy below `14px` is prohibited except approved nonessential annotation;
- line length should remain readable and use `--aa-reading-max` where appropriate.

### 9.3 `Eyebrow`

- provides a short category or context label;
- does not replace a heading;
- Copper may be used as restrained emphasis when contrast passes;
- all-uppercase styling is prohibited for Persian.

### 9.4 `SectionHeader`

Composition:

- optional eyebrow;
- one heading;
- concise introduction;
- optional single supporting action.

Rules:

- default alignment follows the reading start edge;
- centered layout is limited to short ceremonial or closing sections;
- introduction width remains controlled;
- it does not own section background or vertical page spacing.

## 10. Action Components

### 10.1 `Button`

Use for actions only.

```ts
type ButtonProps = {
  variant?: "primary" | "conversion" | "secondary" | "ghost" | "destructive";
  size?: "default" | "large";
  loading?: boolean;
  loadingLabel?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
};
```

Variant contract:

| Variant | Use | Visual behavior |
|---|---|---|
| `primary` | Default main action | Navy background, White label |
| `conversion` | Select highest-value inquiry action | Copper background, White label |
| `secondary` | Lower-priority action | White/transparent surface, Navy border and label |
| `ghost` | Local low-emphasis action | Transparent surface, Navy label |
| `destructive` | Confirmed destructive action | Semantic danger color; never Copper |

Rules:

- one dominant button per action group;
- Copper conversion buttons are selective, not the site-wide default;
- minimum horizontal padding is `20px`;
- loading preserves width and blocks duplicate activation;
- icon placement follows meaning and reading direction;
- vague labels such as “Click here” are prohibited;
- a disabled submit control must not conceal why submission is unavailable.

### 10.2 `ButtonLink`

Use for navigation styled as a button.

- renders a semantic link;
- accepts the same visual variants as `Button`, excluding behavior-only props such as `type`;
- internal links use the approved routing component;
- external behavior is explicit and accessible;
- must never execute a form action.

### 10.3 `TextLink`

- maintains a persistent non-color cue, normally an underline;
- has distinct hover, focus-visible, visited where appropriate, and active states;
- external context changes are communicated accessibly;
- Copper decorative text must not look like a link.

### 10.4 `IconButton`

```ts
type IconButtonProps = {
  label: string;
  icon: ReactNode;
  variant?: "default" | "inverse" | "ghost";
  pressed?: boolean;
};
```

- requires an accessible name through `label`;
- uses a minimum `44 × 44px` target;
- is limited to familiar actions such as close, search, download, menu, or navigation control;
- tooltip is supplementary and never the only label.

### 10.5 `ActionGroup`

- contains one primary and at most one secondary action by default;
- supports wrapping without changing semantic order;
- stacks actions on narrow screens when labels would compress;
- may make actions full-width on mobile where useful;
- must not render a crowded row of competing conversion actions.

## 11. Form Components

### 11.1 Shared field structure

All field controls use a shared `FormField` contract:

1. visible label;
2. optional required/optional indicator;
3. control;
4. optional help text;
5. specific error message;
6. optional character or file constraint.

`aria-describedby` must connect the control to help and error content. `aria-invalid` is present only when invalid. Generated IDs must remain stable between server and client rendering.

### 11.2 `Input`

Supported types in Phase 1 should be limited to real needs such as `text`, `email`, `tel`, `url`, `search`, and numeric entry when semantically correct.

- visible label is mandatory through `FormField`;
- placeholder is an example, never the label;
- minimum height is `48px`;
- email, phone, URL, codes, and Latin identifiers use an isolated LTR value direction;
- Persian text remains RTL and start-aligned;
- browser autocomplete values must be accurate;
- user data survives validation and server failures.

### 11.3 `Textarea`

- follows the same label, help, error, and direction rules as `Input`;
- defaults to manual vertical resizing;
- supports an approved length hint when a real limit exists;
- must not auto-grow through JavaScript unless the behavior is justified and tested.

### 11.4 `Select`

- prefer native `<select>` when it satisfies the experience;
- empty selection uses a real prompt option and clear validation;
- option order follows business meaning, not decoration;
- a custom select is allowed only after full keyboard, focus, screen-reader, mobile, and zoom behavior is specified and tested.

### 11.5 `Checkbox`

- used for independent choices or consent;
- the entire visible label row activates the control;
- checked, unchecked, disabled, focus, and error states are visible without color alone;
- consent text must not be preselected.

### 11.6 `RadioGroup`

- used for one mutually exclusive choice;
- uses `<fieldset>` and `<legend>`;
- arrow-key and tab behavior follow the native or selected ARIA pattern;
- orientation must not change source order in RTL.

### 11.7 `FileUpload`

Purpose: supports project-document, invoice, or material-list submission only after the complete production workflow is approved.

Required states:

- idle;
- drag-active where supported;
- file selected;
- validating;
- uploading;
- uploaded;
- rejected type;
- rejected size;
- network/server error;
- removable item;
- retry.

Rules:

- browse must always work even when drag-and-drop is offered;
- state allowed file types, maximum size, file count, privacy conditions, and retention facts before selection;
- show filename using safe directional isolation;
- announce progress and completion accessibly;
- never claim encryption, scanning, deletion, confidentiality, or retention behavior unless implemented and approved;
- production upload remains disabled until storage, privacy, retention, malware scanning, consent, and lead handoff are approved;
- when upload is unavailable, present an honest approved alternate submission method rather than a fake control.

### 11.8 `ErrorSummary`

- appears after a failed submission when multiple field errors exist;
- receives programmatic focus;
- lists concise errors linking to their controls;
- does not replace inline field errors;
- uses calm, specific recovery language.

### 11.9 `FormStatus`

Variants: `idle`, `submitting`, `success`, `error`.

- announces status through an appropriate live region;
- success confirms what was actually submitted and the real next step;
- no response-time promise is shown unless approved operationally;
- error provides retry or an approved fallback channel;
- technical details, secrets, and stack traces are never exposed.

### 11.10 `InquiryForm`

Purpose: the reusable lead/RFQ experience for procurement consultation.

Contract:

- form fields are data-configured from `FORM_ARCHITECTURE.md`, not invented here;
- groups identity, project context, requirements, contact preference, consent, and documents only when approved;
- presents one clear submit action;
- prevents duplicate submissions;
- preserves data after recoverable failure;
- supports server-side validation as authoritative;
- uses client-side validation only to improve recovery;
- includes loading, success, error, unavailable, and fallback states;
- must remain usable at `320px`, `200%` zoom, keyboard-only, and with screen readers.

The invoice/material-list path must remain prominent and low-friction, but exact field order, integrations, and approved fallback channels remain TBD until `FORM_ARCHITECTURE.md`.

## 12. Navigation Components

### 12.1 `SkipLink`

- first focusable control in the document;
- targets the main content landmark;
- becomes visibly prominent on focus;
- works in Persian and future locales.

### 12.2 `LogoLink`

- uses the approved horizontal logo lockup in the header;
- uses the approved inverted lockup only on Steel Navy;
- links to the locale home page;
- preserves the master logo geometry and clear space;
- never reconstructs or typesets the master wordmark as live text;
- has an accessible label that identifies the destination.

### 12.3 `SiteHeader`

Composition:

- `LogoLink`;
- primary navigation;
- at most one high-value CTA;
- mobile menu control at the approved collapse point.

Rules:

- remains calm, spacious, and visually light;
- desktop mode begins only when approved labels fit without compression;
- optional sticky behavior must not create continuous motion or excessive viewport obstruction;
- remains usable at `200%` zoom;
- core navigation is present in server-rendered HTML;
- exact labels and grouping remain subordinate to `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md`.

### 12.4 `PrimaryNavigation`

- uses a labeled `<nav>` and semantic list;
- current item is indicated programmatically and visually;
- simple links remain direct links;
- submenu triggers use buttons and are not hover-only;
- menus stay within the viewport and support keyboard traversal;
- a mega menu is prohibited unless the approved sitemap proves it necessary.

### 12.5 `NavigationMenu`

For approved dropdown groups:

- trigger exposes expanded state;
- Escape closes and restores focus;
- outside interaction closes without losing expected focus;
- arrow-key behavior follows the selected documented pattern;
- opening motion is short, optional, and reduced-motion safe;
- the menu must not contain unsupported promotional panels.

### 12.6 `MobileNavigation`

- uses a labeled menu button with expanded state;
- preserves logical reading order;
- exposes a visible close action;
- contains the primary inquiry path without unnecessary nesting;
- manages focus when implemented as an overlay;
- restores focus to the menu trigger after closing;
- locks background scrolling without layout shift;
- avoids decorative full-screen transitions that delay navigation.

### 12.7 `Breadcrumb`

- rendered in a labeled `<nav>` with an ordered list;
- current page is text, not a link;
- separators are decorative and hidden from assistive technology;
- separators and directional icons mirror correctly in RTL;
- long labels wrap or truncate only with an accessible full-name strategy;
- breadcrumb structured data, if used, must match visible navigation and SEO specifications.

### 12.8 `Pagination`

- uses real links for indexable collections;
- includes visible Persian previous and next labels, not icons alone;
- marks the current page with `aria-current="page"`;
- preserves filters and query state where approved;
- uses an ellipsis only as a noninteractive gap indicator;
- infinite scroll is prohibited for primary evidence, project, resource, and insight archives.

### 12.9 `SiteFooter`

Composition may include:

- approved brand lockup and concise role statement;
- primary and secondary navigation;
- approved contact routes;
- legal and privacy links;
- verified trust information only.

Rules:

- use the inverted logo only on Steel Navy;
- do not create a keyword dump;
- do not publish unverified address, registration, certification, partner, service-area, or contact details;
- maintain clear focus and link contrast on the inverse surface.

## 13. Content and Feedback Components

### 13.1 `Badge`

Approved uses:

- verified category;
- document type;
- process stage;
- availability or content status.

Variants: `neutral`, `brand`, `information`, `success`, `warning`, `error`.

- status always includes text and never relies on color alone;
- pill radius is reserved for compact badges;
- promotional claims such as “Best,” “No. 1,” or “Guaranteed” are prohibited without evidence and approval.

### 13.2 `Alert`

Variants: `information`, `success`, `warning`, `error`, `neutral`.

- uses appropriate semantics and live-region behavior based on urgency;
- includes a title only when it improves comprehension;
- gives concise action guidance;
- does not use Copper as warning or error color;
- dismissible alerts require a labeled close control;
- critical unrecoverable information must not be dismissible.

### 13.3 `TechnicalCallout`

Purpose: highlights scope, assumptions, documentation notes, or technical purchasing guidance without creating alarm.

- neutral or information styling by default;
- supports title, body, optional source, and optional approved link;
- must not present legal or engineering advice as a guarantee;
- exact technical values require source, unit, and approval.

### 13.4 `EmptyState`

- explains what is unavailable or not yet present;
- offers the next useful approved action;
- never fabricates content to fill visual space;
- uses “coming soon” only when a real publication plan exists;
- must not expose internal errors.

### 13.5 `Skeleton`

- used only for genuinely pending repeatable content;
- reserves final layout dimensions;
- never simulates fake numbers, charts, testimonials, or live prices;
- is hidden or simplified under reduced-motion preferences.

## 14. Disclosure and Overlay Components

### 14.1 `Accordion`

Approved use: FAQs and secondary detail.

```ts
type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
};
```

- trigger is a semantic button with `aria-expanded` and `aria-controls`;
- entire trigger row is clickable;
- chevron mirrors when directionally meaningful;
- content remains usable without animation;
- essential service scope and primary conversion content must not be hidden;
- FAQ structured data must match visible content exactly and is added only when approved by SEO specifications.

### 14.2 `Tabs`

- used only for peer views of the same context;
- prohibited as primary page navigation;
- supports the documented keyboard pattern;
- remains usable at zoom and narrow widths;
- uses reflow, controlled scrolling with visible affordance, or an approved disclosure transformation on mobile;
- important state is deep-linked or preserved when required.

### 14.3 `Tooltip`

- supplements an unfamiliar technical term or icon control;
- works on hover and keyboard focus;
- never contains essential instructions, complex interaction, or primary action;
- never replaces a visible field or control label;
- dismisses predictably and remains readable at zoom.

### 14.4 `Dialog`

Approved use: short focused decisions or small tasks that do not deserve a page.

- receives an accessible name and description where needed;
- traps focus while open and restores it to the trigger;
- supports Escape except where closing risks unacknowledged data loss;
- locks background scroll without layout shift;
- provides a visible close action;
- long RFQ, document-submission, and complex procurement flows must be pages, not dialogs.

## 15. Card Components

### 15.1 Shared card rules

- default surface is White with a subtle border;
- use restrained elevation only on interaction or when hierarchy requires it;
- cards are not nested more than one level;
- one semantic link may cover the card only when no conflicting nested interactive element exists;
- card focus treatment must be visible around the interactive region;
- card grids must handle unequal Persian text lengths without clipping;
- prefer editorial lists, bordered rows, tables, or split layouts when content is not independently actionable.

### 15.2 `CapabilityCard`

Fields:

- optional approved icon;
- capability title;
- concise client outcome;
- optional scope summary;
- optional link.

It must explain what the capability helps the buyer accomplish. It must not become a generic service icon card with unsupported claims.

### 15.3 `ProcessCard`

Fields:

- stage number;
- stage name;
- client input;
- Ahan Asa activity;
- expected output or decision;
- optional boundary note.

Unknown or unapproved responsibilities must be omitted, not inferred.

### 15.4 `EvidenceCard`

Supported verified fields:

- project or procurement context;
- location and date;
- material or scope;
- client challenge;
- Ahan Asa role;
- procurement response;
- verified outcome;
- approved supporting image or document.

The card must gracefully omit unavailable fields. Placeholder quantities, client logos, dates, or outcomes must never appear as real data.

### 15.5 `ResourceCard`

Fields:

- content type;
- title;
- concise summary;
- publication or update date when approved;
- reading or file information when accurate;
- link.

The link label describes the result, such as reading an article or downloading an approved document. Fake gated-download behavior is prohibited.

### 15.6 `ContactMethodCard`

- represents one approved contact method;
- includes availability or expectation only when operationally verified;
- phone, email, and URL values use directional isolation;
- does not display unavailable channels as active.

### 15.7 `TechnicalNoteCard`

- presents a bounded technical or commercial note;
- supports source/reference metadata when needed;
- does not use promotional imagery;
- does not imply that general guidance replaces project-specific review.

## 16. Data and Comparison Components

### 16.1 `DefinitionList`

Use for verified key-value information such as project context, material specification, scope, or document metadata.

- uses `<dl>`, `<dt>`, and `<dd>`;
- isolates technical values as needed;
- maintains clear association after responsive reflow;
- omits unknown values rather than displaying misleading dashes unless the dash meaning is documented.

### 16.2 `DataTable`

- uses real table markup;
- includes a caption or visible contextual heading;
- defines row and column headers correctly;
- isolates numeric, unit, code, and standard values;
- does not communicate meaning through color alone;
- supports controlled horizontal scrolling with a visible affordance on small screens;
- sticky headers are allowed only for long, verified datasets;
- sorting and filtering are added only when they solve a real task and have keyboard-accessible controls.

### 16.3 `ComparisonMatrix`

Use only when aligned comparison materially improves a procurement decision.

- criteria are explicit;
- source, unit, timeframe, and approval state accompany quantitative data where relevant;
- recommendation emphasis includes text, not highlight color alone;
- mobile transformation must preserve relationships; do not convert blindly to disconnected cards;
- no unsupported competitor, supplier, quality, or price comparison is allowed.

### 16.4 `Metric`

Status: **restricted**.

Use only for verified, approved evidence with source and context. The component requires:

- value;
- unit where relevant;
- label;
- timeframe or scope where relevant;
- source/approval reference when required.

Decorative counters, animated numbers, vanity metrics, and placeholder statistics are prohibited.

## 17. Media and Document Components

### 17.1 `ResponsiveImage`

- uses approved source imagery only;
- reserves intrinsic dimensions to prevent layout shift;
- supplies correct responsive sizes;
- uses meaningful alternative text for informative images and empty alternative text for decorative images;
- avoids heavy overlays that distort evidence;
- lazily loads below-the-fold media;
- does not imply ownership of factories, warehouses, fleet, stock, or teams that Ahan Asa does not own.

### 17.2 `Figure`

- composes approved media with an optional verified caption and source;
- caption adds context rather than repeating adjacent text;
- uses `<figure>` and `<figcaption>` when semantic.

### 17.3 `DocumentLink`

- displays document title, type, size, and update date only when accurate;
- clearly distinguishes view, download, and external actions;
- isolates filenames and codes;
- indicates new context accessibly;
- does not imply gated, secure, or private access unless it exists.

### 17.4 `VideoEmbed`

- is not autoplayed by default;
- loads on demand where practical;
- requires captions or transcript for meaningful speech;
- reserves aspect ratio and dimensions;
- avoids decorative background video in critical first-view content;
- exposes controls and respects reduced motion.

## 18. Ahan Asa Experience Patterns

### 18.1 `PageHero`

Composition:

1. optional concise eyebrow;
2. one clear `h1`;
3. short category/value explanation;
4. one primary and at most one secondary action;
5. approved visual or evidence element.

Rules:

- first view explains what Ahan Asa does and who it serves;
- the slogan **“ما مراقب سرمایه شما هستیم.”** may support but never replace the category explanation;
- hero height follows content and is not forced to full viewport;
- critical text is not embedded in an image;
- autoplay video is prohibited by default;
- layout reflows into a coherent single reading sequence on mobile.

### 18.2 `ProcurementProcess`

Purpose: explains the controlled journey from requirement clarity to coordinated delivery.

Each approved step may include:

- number;
- stage title;
- client input;
- Ahan Asa responsibility;
- decision or output;
- scope boundary.

Rules:

- Persian desktop progression moves visually from right to left while preserving logical DOM order;
- mobile progression becomes vertical;
- connecting lines are restrained and secondary;
- no step may imply automated, guaranteed, or operationally unverified service.

### 18.3 `ProtectionPillars`

Represents the four approved value pillars:

1. Requirement clarity
2. Sourcing control
3. Commercial protection
4. Delivery coordination

The component should explain buyer outcomes and boundaries. It must not reduce all four pillars to interchangeable icon cards.

### 18.4 `TrustEvidenceSection`

Evidence priority:

1. verified project or procurement case;
2. approved sample document or methodology;
3. verified credential, certification, or client approval;
4. transparent process explanation;
5. approved testimonial.

When higher-order evidence is unavailable, use transparent methodology. Never replace missing evidence with fabricated social proof.

### 18.5 `DocumentSubmissionPanel`

Purpose: keeps the invoice/material-list inquiry path visible and understandable.

Composition:

- short reason to submit;
- accepted-input guidance based on approved form rules;
- primary action;
- privacy/processing note based only on verified workflow;
- approved fallback when applicable.

This pattern may link to a dedicated submission page or contain a short form only when approved. It must not open a complex RFQ in a modal.

### 18.6 `CtaBand`

- appears after sufficient context has been provided;
- contains one clear next step and concise reassurance;
- preferred dark surface is Steel Navy;
- on Navy, prefer a White button with Navy text;
- Copper remains a restrained accent or specifically approved conversion treatment;
- do not repeat the same band after every section.

### 18.7 `FaqSection`

- composes `SectionHeader` and `Accordion`;
- includes only approved, visible questions and answers;
- essential scope, pricing conditions, and next-step information must remain accessible outside collapsed content when critical;
- FAQ schema is not automatically added by the visual component.

### 18.8 `ResourceIndex`

- provides server-rendered resource links;
- uses filters only when enough content exists to justify them;
- uses `Pagination`, not infinite scroll;
- exposes an honest empty result and filter-reset action;
- preserves indexability and link discovery.

### 18.9 `CaseStudyIndex`

- supports only verified evidence records;
- does not render fictional placeholders in production;
- filters, if approved, use real links or progressively enhanced controls according to SEO requirements;
- empty categories are not presented as populated.

## 19. Responsive Behavior Matrix

| Component/pattern | Wide behavior | Narrow behavior |
|---|---|---|
| `SiteHeader` | inline navigation and one CTA | menu control; CTA remains easy to reach |
| `ActionGroup` | inline, wrapping as needed | stacked/full-width when labels compress |
| `PageHero` | approved editorial split | one clear reading sequence |
| `ProcurementProcess` | RTL horizontal or editorial sequence | vertical numbered sequence |
| Card grid | two or three columns only when content supports it | single column or deliberate two-column compact pattern |
| `DataTable` | full table | controlled horizontal access or documented semantic transformation |
| `ComparisonMatrix` | aligned comparison | relationship-preserving reflow/scroll |
| `Dialog` | centered bounded surface | near-full-width, never hiding close/control context |
| `InquiryForm` | grouped layout where helpful | single logical flow |
| `CtaBand` | concise horizontal composition | stacked with clear dominant action |

Universal responsive rules:

- support reflow at `320 CSS px`;
- preserve hierarchy, evidence adjacency, and semantic order;
- no page-level horizontal scrolling;
- do not use DOM reversal to create RTL layouts;
- do not hide primary content to make a design fit;
- interactive targets remain usable at zoom;
- sticky mobile actions must not cover content, errors, keyboards, or form controls.

Final breakpoint values remain governed by `DESIGN_SYSTEM.md` and `RESPONSIVE_RULES.md`.

## 20. RTL and Bidirectional Contract

All components must:

- inherit `lang="fa"` and `dir="rtl"` from the Persian document root;
- use logical CSS properties;
- preserve logical DOM and keyboard order;
- align text to logical start unless a value type requires another alignment;
- mirror only directional icons and sequences;
- isolate phone numbers, emails, URLs, codes, filenames, Latin IDs, dimensions, and Latin-formatted dates;
- render Persian punctuation and joined glyphs correctly;
- handle long Persian copy and mixed Persian/Latin content without collision;
- avoid separate RTL component implementations.

Physical properties such as `left`, `right`, `margin-left`, and `border-right` require a documented exception when a physical position is genuinely intended.

## 21. Accessibility Contract

Target: WCAG 2.2 AA for public Phase 1 pages and flows.

Each applicable component must satisfy:

- correct native role and name;
- keyboard operation;
- visible focus-visible state;
- logical focus order and restoration;
- minimum target size;
- text and non-text contrast;
- status announcement without unnecessary focus change;
- no color-only meaning;
- zoom and reflow behavior;
- reduced-motion behavior;
- meaningful label, instruction, error, and recovery;
- correct language and direction;
- no essential hover-only content.

ARIA must not be added to compensate for incorrect HTML. Complex patterns must follow one documented ARIA interaction model consistently.

## 22. Motion Contract

- motion communicates state, hierarchy, or spatial relationship;
- durations and easing use approved `--aa-motion-*` tokens;
- hover movement is minimal and must not destabilize text;
- entrance animation must not delay reading or interaction;
- disclosure content is available without motion;
- loading feedback is calm and dimensionally stable;
- continuous decorative animation is prohibited;
- `prefers-reduced-motion: reduce` removes nonessential transitions, transforms, smooth scrolling, and reveal effects.

## 23. Performance Contract

- server-render static content and navigation by default;
- mark only genuinely interactive component boundaries as client components;
- do not hydrate an entire page for one disclosure or menu;
- reserve media dimensions;
- avoid large animation libraries for simple transitions;
- import icons individually or from a small approved local set;
- do not load an external component framework without architectural approval;
- avoid runtime style generation when static CSS is sufficient;
- keep component exports tree-shakeable;
- lazy-load below-the-fold heavy media and noncritical interactive modules;
- preserve indexable links and SEO-critical content without client JavaScript.

## 24. Content and Data Safety

Components must never create or assume:

- live steel prices;
- stock or inventory availability;
- countdown timers or urgency;
- public checkout or cart behavior;
- supplier rankings;
- unverified client, mill, partner, or certification logos;
- fabricated case studies, outcomes, quantities, or testimonials;
- facilities, fleet, warehouses, factories, or inventory ownership;
- guaranteed price, quality, delivery, or zero-risk claims;
- response-time promises;
- active regional coverage beyond approved operations.

Production components must fail closed on missing evidence: omit the unsupported field, show an honest unavailable state, or stop publication according to the page specification.

## 25. Analytics and Testing Hooks

- use stable `data-*` hooks only for approved analytics or test needs;
- never use visible Persian copy as the only automated-test selector;
- analytics identifiers describe intent, not DOM position;
- do not attach duplicate tracking to both a wrapper and its only action;
- form tracking must not expose personal, project, document, or sensitive field values;
- final event names and payloads remain governed by `ANALYTICS_TRACKING.md`.

## 26. Recommended Code Organization

Until `FOLDER_STRUCTURE.md` and `COMPONENT_ARCHITECTURE.md` approve exact paths, use this as a logical grouping contract rather than permission for a repository-wide move:

```text
components/
  ui/          # primitives: Button, Input, Badge, Alert, Icon
  layout/      # Container, Section, Stack, Cluster, Grid
  forms/       # FormField, FileUpload, ErrorSummary, InquiryForm
  navigation/  # SiteHeader, PrimaryNavigation, MobileNavigation, Breadcrumb
  patterns/    # PageHero, ProcurementProcess, EvidenceCard, CtaBand
  media/       # ResponsiveImage, Figure, DocumentLink, VideoEmbed
```

Rules:

- one canonical export path per public component;
- keep component styles, tests, and stories/examples close to the component when the final architecture permits;
- avoid catch-all files containing unrelated components;
- avoid circular dependencies between layers;
- primitives must not import business patterns;
- shared components must not import page route modules;
- preserve an existing repository structure unless a move is explicitly approved.

## 27. Component Documentation Template

Every nontrivial component should document:

```md
### ComponentName

Purpose:
When to use:
When not to use:
Semantic root:
Variants:
Sizes:
Required props:
Optional props:
States:
RTL behavior:
Responsive behavior:
Accessibility behavior:
Content limits:
Analytics hooks:
Examples:
Test coverage:
Known constraints:
```

Documentation may live in code comments, component examples, or the approved component-preview environment, but the contract must remain discoverable to Claude Code and reviewers.

## 28. Required Test Matrix

### 28.1 Automated tests

Use the project-approved tools to cover, as applicable:

- semantic role and accessible name;
- keyboard interaction;
- expanded, selected, pressed, invalid, busy, and current states;
- focus placement and restoration;
- form validation and error association;
- duplicate submission prevention;
- server-rendered link and content presence;
- RTL direction attributes and mixed-direction isolation;
- safe handling of missing optional data.

### 28.2 Manual tests

Every released component must be reviewed in relevant combinations:

- Persian RTL;
- long Persian labels and paragraphs;
- mixed Persian/English values;
- `320px` viewport;
- mobile and desktop pointer behavior;
- keyboard only;
- `200%` zoom, and higher where applicable;
- reduced motion;
- high-contrast or forced-color behavior where supported;
- slow network and failed async action;
- White, Warm Cream, subtle neutral, and approved inverse surfaces;
- missing, empty, error, and success data.

### 28.3 High-risk components

The following require both automated and manual interaction testing before release:

- `MobileNavigation`;
- `NavigationMenu`;
- `FileUpload`;
- `InquiryForm`;
- `ErrorSummary`;
- `Accordion` when used for public FAQs;
- `Tabs`;
- `Dialog`;
- sortable/filterable `DataTable`;
- any component that moves focus or announces async status.

## 29. Claude Code Implementation Workflow

Before building or modifying a component, Claude Code must:

1. Read the governing documents and the relevant page specification.
2. Search the existing component library for a matching primitive, composite, or pattern.
3. Identify all states, direction cases, responsive behavior, and data dependencies.
4. Confirm that content and evidence fields are approved or safely optional.
5. Choose semantic HTML before ARIA or custom interaction.
6. Use existing semantic tokens without raw values.
7. Keep the component server-rendered unless genuine client behavior requires otherwise.
8. Implement default, interaction, async, empty, error, and success states as applicable.
9. Add appropriate automated tests and complete manual checks.
10. Record an approved system-level exception in `DECISIONS.md`.

When requirements are unresolved, Claude Code must use a clearly marked development-only placeholder or stop and report the dependency. It must not convert a `TBD` into a production assumption.

## 30. Prohibited Component Patterns

Do not create:

- a universal “smart component” with many unrelated modes;
- duplicate RTL and LTR components;
- card wrappers around every content block;
- nested interactive elements;
- links that perform actions or buttons that navigate;
- custom controls that reproduce native behavior poorly;
- hover-only navigation or essential tooltips;
- auto-rotating carousels for primary content;
- infinite-scroll content archives;
- complex RFQ forms inside modals;
- full-page client components without a justified need;
- raw-color or arbitrary-spacing component variants;
- components named after their current visual color or page position;
- fake live-price, inventory, quote-counter, or social-proof widgets;
- generic marketplace product cards with price and “buy” actions;
- decorative metric counters;
- production upload UI before its real security and data workflow is approved;
- uncontrolled HTML injection for content convenience;
- animations that conceal, delay, or reorder content.

## 31. Component Acceptance Checklist

A component is complete only when all applicable items pass:

- [ ] Has one clear reusable purpose
- [ ] Belongs to the correct architecture layer
- [ ] Reuses approved tokens and existing primitives
- [ ] Uses semantic HTML
- [ ] Has a typed, minimal public API
- [ ] Separates navigation from action semantics
- [ ] Works in Persian RTL
- [ ] Remains structurally safe for future LTR
- [ ] Handles mixed-direction values correctly
- [ ] Works at `320px` and across the approved responsive range
- [ ] Supports keyboard interaction
- [ ] Shows a visible `:focus-visible` state
- [ ] Meets contrast and target-size requirements
- [ ] Covers relevant default, hover, focus, active, selected, disabled, loading, success, error, and empty states
- [ ] Does not rely on hover or color alone
- [ ] Handles long Persian text and realistic content variation
- [ ] Handles missing data without fabricating content
- [ ] Avoids unnecessary client JavaScript and dependencies
- [ ] Preserves layout dimensions during loading
- [ ] Respects reduced-motion preferences
- [ ] Includes appropriate automated and manual tests
- [ ] Is documented when usage is not self-evident
- [ ] Introduces no unverified claim, price, metric, project, contact route, or integration

## 32. Initial Build Priority

Build and validate the library in this order:

### Priority 1 — Foundations and actions

- `Container`, `Section`, `Stack`, `Cluster`, `Grid`
- `DirectionalValue`, `Icon`, `VisuallyHidden`
- `Heading`, `Text`, `SectionHeader`
- `Button`, `ButtonLink`, `TextLink`, `IconButton`, `ActionGroup`

### Priority 2 — Navigation and forms

- `SkipLink`, `LogoLink`, `SiteHeader`, `PrimaryNavigation`, `MobileNavigation`
- `FormField`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`
- `ErrorSummary`, `FormStatus`

### Priority 3 — Core conversion

- `FileUpload` after workflow approval
- `InquiryForm`
- `DocumentSubmissionPanel`
- `CtaBand`

### Priority 4 — Narrative and evidence

- `PageHero`
- `ProcurementProcess`
- `ProtectionPillars`
- approved card variants
- `DefinitionList`, `DataTable`, `ComparisonMatrix`
- `TrustEvidenceSection`

### Priority 5 — Content expansion

- `Accordion`, `FaqSection`
- `Breadcrumb`, `Pagination`
- `ResourceIndex`, `CaseStudyIndex`
- `DocumentLink`, `VideoEmbed`
- `Tabs`, `Tooltip`, and `Dialog` only when a confirmed use case exists

Prototype validation must prioritize the desktop homepage first sequence, mobile homepage/navigation, invoice/material-list submission flow, procurement-process explanation, and evidence presentation pattern.

## 33. Explicitly Deferred Decisions

The component library must not guess:

- final repository paths before `FOLDER_STRUCTURE.md` and `COMPONENT_ARCHITECTURE.md`;
- final Persian font files, weights, licenses, subsets, and loading method;
- final logo asset filenames and Persian outlined wordmark measurements;
- exact navigation items and menu grouping;
- final CTA wording;
- final form fields, consent language, upload limits, storage, retention, scanning, and CRM handoff;
- final contact channels and operational availability;
- final material categories, project records, evidence, suppliers, client marks, metrics, and service areas;
- analytics event names and payloads;
- final performance budgets and automated QA tools;
- component-preview or story environment;
- any external component, form, animation, icon, or validation library;
- dark mode, which is not approved for Phase 1.

## 34. Definition of Done

This document becomes **Approved** when the project owner confirms:

- the component architecture and inventory;
- action hierarchy and Copper usage;
- navigation, form, upload, and inquiry behavior;
- page patterns for hero, process, evidence, document submission, and CTA;
- RTL, bidirectional, accessibility, responsive, motion, and performance contracts;
- prohibited patterns and build priorities;
- an owner and decision path for every remaining `TBD`.

Until approval, this document is the authoritative working draft for component-library implementation. Confirmed rules may guide development, but unresolved decisions must remain visibly provisional.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| UX/UI Approval | TBD | Pending | — |
| Frontend Approval | TBD | Pending | — |
| Accessibility Review | TBD | Pending | — |
