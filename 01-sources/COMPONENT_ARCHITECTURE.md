# Ahan Asa Website — Component Architecture

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `COMPONENT_ARCHITECTURE.md`  
> **Status:** Draft v1.0 — Implementation contract  
> **Last updated:** 2026-08-25  
> **Primary language:** Persian (Farsi), fully RTL  
> **Application model:** Next.js App Router, TypeScript, static-first, server-first

---

## 1. Purpose

This document defines how Ahan Asa website components are divided, composed, imported, rendered, tested, and governed.

It is the implementation contract for turning the approved design system, UI component inventory, content model, information architecture, and page specifications into a maintainable frontend system.

It answers these questions:

- Which architectural layers exist?
- What may each layer own?
- Which layers may import which other layers?
- Where do Server Components and Client Components begin and end?
- Where should content, domain data, state, validation, and side effects live?
- How are page-specific compositions separated from reusable patterns?
- How should components be organized, named, exported, tested, and changed?
- How does the architecture remain Persian-first, RTL-safe, accessible, performant, and ready for future LTR locales?

This document does **not** redefine visual tokens, component appearance, page copy, routes, analytics events, form fields, backend integrations, or SEO metadata. Those remain owned by their governing documents.

---

## 2. Document Ownership and Conflict Rules

The following ownership boundaries apply:

| Concern | Governing document |
|---|---|
| Business goals, positioning, audiences | `PROJECT_BRIEF.md` |
| Technical platform and system topology | `TECHNICAL_ARCHITECTURE.md` |
| Frameworks and approved dependencies | `STACK.md` |
| Repository-wide directories | `FOLDER_STRUCTURE.md` |
| Component layers, dependencies, boundaries | `COMPONENT_ARCHITECTURE.md` |
| Visual tokens and design decisions | `DESIGN_SYSTEM.md` |
| Component inventory, variants, and behavior | `UI_COMPONENTS.md` |
| Content entities and field contracts | `CONTENT_MODEL.md` |
| User journeys and content relationships | `INFORMATION_ARCHITECTURE.md` |
| Page composition | `PAGE_SPECIFICATIONS.md` and page-specific specs |
| Forms, uploads, validation, and lead capture | `FORM_ARCHITECTURE.md` |
| Accessibility requirements | `ACCESSIBILITY.md` |
| Motion | `MOTION_GUIDELINES.md` |
| Responsive behavior | `RESPONSIVE_RULES.md` |
| Routes and locale URLs | `ROUTES.md`, `LOCALIZATION.md` |
| Analytics | `ANALYTICS_TRACKING.md` |

When documents overlap:

1. Follow the document that owns the concern.
2. Do not silently resolve a material conflict.
3. Preserve the existing working implementation until the conflict is resolved.
4. Record an approved architectural exception in `DECISIONS.md`.
5. Never convert a `TBD` into a production assumption.

---

## 3. Architectural Goals

The component architecture must optimize for:

1. **Clarity:** a developer can identify component responsibility from its name and location.
2. **Controlled reuse:** shared behavior is reused without creating universal, configuration-heavy components.
3. **Server-first delivery:** public content and navigation render without waiting for client JavaScript.
4. **Small client islands:** browser state and effects remain at the smallest practical interactive boundary.
5. **Direction safety:** one implementation supports Persian RTL and future LTR locales.
6. **Accessibility by construction:** semantic structure and interaction contracts are built into reusable layers.
7. **Content truth:** components render approved data and never invent evidence, prices, stock, claims, or operational facts.
8. **Performance:** static content does not hydrate unnecessarily; media and interactive code load deliberately.
9. **Testability:** behavior and boundaries can be tested without rendering an entire page.
10. **Change isolation:** modifying one feature does not require unrelated route or component changes.

---

## 4. Architectural Model

The Ahan Asa frontend uses five component layers plus route composition and feature/domain modules.

```text
Routes and layouts
        ↓
Page compositions
        ↓
Shells and business patterns
        ↓
Composites
        ↓
Primitives and layout utilities
        ↓
Foundations
```

Content and feature modules feed typed data into this hierarchy; they do not bypass it.

### 4.1 Layer definitions

| Layer | Responsibility | Typical examples |
|---|---|---|
| Foundations | Tokens, base styles, icons, direction helpers, low-level utilities | semantic tokens, `Icon`, `VisuallyHidden`, direction utilities |
| Primitives | Small, reusable, business-neutral UI elements | `Button`, `TextLink`, `Input`, `Badge`, `Container`, `Stack` |
| Composites | Multiple primitives forming one reusable behavior or semantic unit | `FormField`, `Accordion`, `FileUpload`, `DataTable` |
| Patterns | Reusable Ahan Asa content or task structures | `ProcurementProcess`, `EvidenceCard`, `CtaBand` |
| Shells | Global or major page framing | `SiteHeader`, `MobileNavigation`, `SiteFooter`, `PageHero` |
| Page compositions | Route-specific ordering and configuration | `HomePage`, `CapabilityDetailPage`, `InquiryPage` |
| Feature/domain modules | Business rules, validation, transformations, actions, adapters | inquiry submission, navigation config, evidence normalization |

### 4.2 Core rule

Dependencies flow downward. Lower layers must not know about higher layers.

For example:

- `Button` must not import `InquiryForm`.
- `FormField` must not import `ProcurementProcess`.
- `EvidenceCard` may import `Heading`, `Text`, `Figure`, and layout primitives.
- `HomePage` may compose shells and patterns.
- A component must not import a route file.

---

## 5. Dependency Direction Matrix

`Allowed` means the source layer may import the target layer.

| Source \ Target | Foundations | Primitives | Composites | Patterns | Shells | Pages | Features |
|---|---:|---:|---:|---:|---:|---:|---:|
| Foundations | Limited | No | No | No | No | No | No |
| Primitives | Yes | Limited | No | No | No | No | No |
| Composites | Yes | Yes | Limited | No | No | No | Limited adapters only |
| Patterns | Yes | Yes | Yes | Limited | No | No | Typed data only |
| Shells | Yes | Yes | Yes | Limited | Limited | No | Typed config only |
| Page compositions | Yes | Yes | Yes | Yes | Yes | No route imports | Yes |
| Features | Utilities only | No visual imports by domain code | No | No | No | No | Limited within feature |

### 5.1 Meaning of “Limited”

- Same-layer imports are allowed only when they create a clear semantic composition.
- Circular imports are prohibited.
- A component may not become a hidden dependency hub for unrelated components.
- Feature UI may import shared UI layers, but pure feature domain code must remain independent from React and visual components.
- Shared layers must not import feature-specific code.

### 5.2 Enforcement

Where project tooling allows, enforce boundaries with:

- TypeScript path aliases;
- ESLint import restrictions;
- dependency-cycle detection;
- code review;
- architecture tests for prohibited imports.

Suggested path aliases:

```json
{
  "@/app/*": ["./app/*"],
  "@/components/*": ["./components/*"],
  "@/features/*": ["./features/*"],
  "@/content/*": ["./content/*"],
  "@/lib/*": ["./lib/*"],
  "@/styles/*": ["./styles/*"],
  "@/types/*": ["./types/*"]
}
```

Aliases must not conceal invalid dependency direction.

---

## 6. Canonical Component Directories

The component area uses responsibility-based directories.

```text
components/
  foundations/
    icon/
    visually-hidden/
    directional-value/

  layout/
    container/
    section/
    stack/
    cluster/
    grid/
    divider/

  ui/
    button/
    button-link/
    text-link/
    icon-button/
    heading/
    text/
    badge/
    alert/
    status/

  forms/
    form-field/
    input/
    textarea/
    select/
    checkbox/
    radio-group/
    file-upload/
    error-summary/
    form-status/

  navigation/
    skip-link/
    logo-link/
    site-header/
    primary-navigation/
    navigation-disclosure/
    mobile-navigation/
    breadcrumb/
    pagination/

  media/
    responsive-image/
    figure/
    document-link/
    video-embed/

  data-display/
    definition-list/
    data-table/
    comparison-matrix/

  patterns/
    page-hero/
    section-header/
    procurement-process/
    protection-pillars/
    trust-evidence-section/
    document-submission-panel/
    faq-section/
    cta-band/
    resource-index/
    case-study-index/

  shells/
    site-shell/
    site-footer/
    content-page-shell/
```

Rules:

- This structure is canonical for new work.
- Adapt existing equivalent directories without duplicating components.
- Repository-wide moves require an explicit migration task.
- A directory is created only when at least one approved component belongs there.
- Do not add empty architecture placeholders.
- Do not create generic `common/`, `shared/`, `misc/`, or `helpers/` dumping grounds.

---

## 7. Feature and Page Organization

Reusable UI belongs under `components/`. Business workflows belong under `features/`. Route composition belongs under `app/` or a page-composition module referenced by it.

```text
features/
  inquiry/
    domain/
      inquiry.types.ts
      inquiry.schema.ts
      inquiry.mapper.ts
    server/
      submit-inquiry.ts
      inquiry-adapter.ts
    ui/
      inquiry-form/
      inquiry-success/
    tests/

  navigation/
    navigation.config.ts
    navigation.schema.ts
    navigation.mapper.ts

  resources/
    resource.types.ts
    resource.mapper.ts
    resource.query.ts

app/
  layout.tsx
  page.tsx
  inquiry/
    page.tsx
    loading.tsx
    error.tsx
  capabilities/
    page.tsx
    [slug]/
      page.tsx
```

### 7.1 Route file responsibilities

A route file may:

- resolve route parameters;
- load approved content or data;
- generate metadata through the approved SEO layer;
- choose a page composition;
- pass typed data to that composition;
- define route-level loading, error, and not-found behavior.

A route file must not:

- define reusable visual styling;
- contain a large component inventory;
- duplicate validation or transformation logic;
- own client state for nested interactions;
- construct parallel route-local navigation or CTA sources;
- fetch the same content separately for multiple child components.

### 7.2 Page-composition responsibilities

A page composition owns:

- semantic section order;
- page-level heading hierarchy;
- pattern selection;
- page-specific content mapping;
- page-level landmarks and anchor IDs;
- valid CTA placement;
- omission of unsupported optional sections.

It does not own primitive appearance or business-side effects.

---

## 8. Component Folder Anatomy

Use a folder for every nontrivial public component.

```text
button/
  Button.tsx
  Button.types.ts
  Button.module.css
  Button.test.tsx
  index.ts
```

Optional files when justified:

```text
button/
  Button.fixtures.ts
  Button.a11y.test.tsx
  Button.visual.tsx
  Button.client.tsx
  button.utils.ts
```

Rules:

- Keep styles, types, tests, and small component-specific helpers close to the component.
- Use a separate file only when it improves responsibility or testability.
- Do not split a five-line type or helper merely to satisfy a template.
- Do not place unrelated subcomponents in one file.
- Private subcomponents may remain beside the owner and must not be publicly exported.
- Examples or preview stories are added only after a preview environment is approved.

---

## 9. Naming Rules

### 9.1 Components

- Use PascalCase: `EvidenceCard`, `InquiryForm`, `SiteHeader`.
- Name by purpose, not appearance or page position.
- Prefer `PrimaryNavigation` over `BlueNav`.
- Prefer `DocumentSubmissionPanel` over `HomeUploadBox`.
- Use `Link` for navigation and `Button` for actions.
- Use `List`, `Group`, `Grid`, `Section`, or `Shell` only when the component owns that semantic relationship.

### 9.2 Files

- Public React component: `ComponentName.tsx`.
- Public types: `ComponentName.types.ts` or a clearly scoped lower-case domain file.
- Client-only implementation: `ComponentName.client.tsx`.
- Server-only implementation: `ComponentName.server.tsx` only when server APIs are used directly.
- Styles: `ComponentName.module.css`.
- Tests: `ComponentName.test.tsx`.
- Utilities: descriptive lower-case names such as `navigation.utils.ts`.

### 9.3 Props

- Public prop types use `ComponentNameProps`.
- Event props describe intent: `onDismiss`, `onRetry`, `onSelectionChange`.
- Do not expose internal DOM language such as `onInnerWrapperClick`.
- Avoid negative booleans such as `disableNotClosing`.
- Avoid multiple booleans that produce invalid combinations; prefer discriminated unions.

### 9.4 Domain types

- Use business meaning: `InquiryPayload`, `EvidenceRecord`, `NavigationItem`.
- Do not name domain types after backend tables or UI cards unless that is their true responsibility.
- Backend DTOs and public view models are separate types.

---

## 10. Public API Design

Every public component API must be:

- typed;
- minimal;
- semantic;
- variant-based;
- direction-safe;
- accessible by default;
- stable enough for reuse;
- explicit about optional content;
- restrictive against invalid states.

### 10.1 Good API example

```ts
type EvidenceCardProps = {
  title: string;
  summary?: string;
  media?: ApprovedMedia;
  facts?: EvidenceFact[];
  href?: string;
  status?: 'verified' | 'draft';
};
```

### 10.2 Prohibited API example

```ts
type CardProps = {
  blue?: boolean;
  copper?: boolean;
  rounded?: boolean;
  largeShadow?: boolean;
  leftPadding?: number;
  html?: string;
  mode?: string;
};
```

### 10.3 Escape hatches

`className` may be accepted for external placement only. It must not be used by page code to override:

- internal color;
- typography;
- focus state;
- component spacing contract;
- control size;
- error state;
- interaction behavior.

Repeated overrides require an approved variant or architecture revision.

### 10.4 Native attributes

Forward safe native attributes where useful, especially for input and action primitives. Prevent prop combinations that break semantics, accessibility, or styling contracts.

---

## 11. Composition Rules

### 11.1 Prefer composition over configuration explosion

Build larger interfaces from focused components. Do not create one component with dozens of unrelated modes.

Good:

```tsx
<Section surface="warm">
  <Container>
    <Stack gap="xl">
      <SectionHeader title={title} intro={intro} />
      <ProcurementProcess steps={steps} />
    </Stack>
  </Container>
</Section>
```

Avoid:

```tsx
<UniversalSection
  type="process"
  warm
  centered={false}
  hasCards
  copperNumbers
  mobileMode="timeline"
  desktopMode="editorial"
/>
```

### 11.2 Slots

Use slots when a component owns layout and semantics but the content varies in a controlled way.

```ts
type PageHeroProps = {
  eyebrow?: string;
  title: string;
  summary: string;
  actions?: ReactNode;
  media?: ReactNode;
};
```

Rules:

- Slots must have a documented semantic purpose.
- Do not expose every internal wrapper as a slot.
- Do not accept arbitrary markup when a typed data contract is safer.
- Across a Server/Client boundary, prefer serializable data over arbitrary render functions.

### 11.3 Compound components

Use compound components only when parts have a genuine shared state or semantic relationship. Do not use them solely for aesthetic API style.

### 11.4 Render props and higher-order components

Render props and HOCs are not default patterns. Prefer ordinary composition, hooks inside client boundaries, and pure data mappers.

---

## 12. Server Component Policy

All components are Server Components by default in the Next.js App Router model unless a genuine browser requirement exists.

Server-render by default:

- page shells;
- headings and body content;
- navigation links and footer links;
- hero copy and static media framing;
- evidence and case-study content;
- capability and material information;
- FAQ content structure where native behavior is sufficient;
- resource links;
- breadcrumb structure;
- SEO-critical internal links;
- form labels and server validation results.

### 12.1 Server component responsibilities

A Server Component may:

- load approved content;
- perform secure server-only data access;
- normalize content through pure mappers;
- select a component variant;
- render indexable HTML;
- pass serializable props to a Client Component;
- call server-only utilities that never enter the browser bundle.

It must not:

- access `window`, `document`, storage, or browser media queries;
- own browser event handlers;
- create hidden client state through uncontrolled DOM scripts;
- pass secrets or private backend payloads to client code;
- fetch public core content only after hydration.

---

## 13. Client Component Policy

Add `'use client'` only at the smallest practical interactive leaf.

Approved client-side reasons include:

- mobile navigation state;
- disclosure or tabs state that cannot use an adequate native pattern;
- focus movement, containment, or restoration;
- scroll locking;
- file selection and client-side file feedback;
- progressive form interaction;
- browser API access;
- measured layout behavior that is genuinely required;
- user-controlled media playback;
- local filter controls synchronized with the URL.

Unapproved reasons include:

- using a React hook for static derived text;
- animating content that CSS can handle;
- reading viewport width during initial render;
- using client fetch for content available at build or request time;
- making an entire page interactive because one child needs state;
- applying `onClick` to navigation instead of using a real link;
- importing a client library for a minor visual effect.

### 13.1 Split-component pattern

Prefer a server wrapper plus a focused client controller.

```text
mobile-navigation/
  MobileNavigation.tsx          # server composition and data
  MobileNavigation.client.tsx   # drawer state, focus, scroll lock
  MobileNavigation.types.ts
```

### 13.2 Client boundary props

Props crossing into a Client Component must be serializable and minimal.

Do not pass:

- database clients;
- server-only functions except approved framework server-action references;
- secrets;
- entire CMS responses;
- unfiltered backend errors;
- arbitrary class instances;
- unnecessarily large content trees.

### 13.3 Hydration safety

- Server and initial client markup must agree.
- Do not branch core initial markup using `window.innerWidth`.
- Use CSS for responsive layout when possible.
- Do not render dates, random IDs, or environment-dependent values inconsistently.
- Use stable IDs for form help, errors, and disclosure relationships.
- Do not hide hydration warnings instead of fixing their cause.

---

## 14. Client Island Budget

Each page should contain only the client islands required for its tasks.

Expected Phase 1 islands may include:

| Island | Reason |
|---|---|
| `MobileNavigation.client` | drawer, focus, Escape, scroll lock |
| `NavigationDisclosure.client` | accessible expanded state when native disclosure is insufficient |
| `InquiryForm.client` | progressive field behavior and pending state |
| `FileUpload.client` | file selection, removal, local validation feedback |
| `ResourceFilters.client` | optional URL-synchronized filters |
| `VideoEmbed.client` | consent or user-triggered loading where required |

Rules:

- A client island must not silently absorb its surrounding section.
- Static headings, explanations, and links remain server-rendered.
- Client islands must expose usable failure or no-JavaScript fallbacks where the user journey requires them.
- Bundle impact must be reviewed before adding an external interactive dependency.

---

## 15. State Ownership

State must live at the lowest level that needs to coordinate it.

### 15.1 State categories

| State type | Owner | Examples |
|---|---|---|
| Content/domain state | Server or content source | page copy, approved evidence, capability records |
| URL state | Route/search parameters | filters, pagination, active resource category |
| Server mutation state | Server action/endpoint plus form boundary | validation, submission result, reference ID |
| Local ephemeral UI state | Small Client Component | open menu, active disclosure, selected file |
| Derived state | Recomputed, not stored | active route, whether evidence exists |
| Persistent user preference | Approved storage layer only | locale preference after multilingual launch |

### 15.2 State rules

- Do not store derived values in state.
- Do not duplicate URL state in an unrelated global store.
- Do not introduce a global client state library for Phase 1 without an approved cross-route requirement.
- Do not persist drawer, accordion, or dialog state across visits.
- Form state must preserve user input after recoverable errors.
- Server-confirmed success must not be inferred from a client-only optimistic state.
- Current-route state comes from routing, not manually synchronized local state.

---

## 16. Data Flow

The preferred data path is unidirectional.

```text
Approved source
  → schema validation
  → domain model
  → view-model mapper
  → page composition
  → pattern/composite
  → primitive rendering
```

### 16.1 Source data

Source data may come from:

- version-controlled content;
- approved static configuration;
- a future CMS adapter;
- a secure server integration;
- route parameters and search parameters;
- validated server form input.

### 16.2 Domain models vs view models

Domain models express business meaning. View models express exactly what a component needs.

```ts
type EvidenceRecord = {
  id: string;
  status: 'draft' | 'verified' | 'published';
  title: LocalizedText;
  facts: EvidenceFact[];
  media?: MediaReference;
  source?: ApprovalReference;
};

type EvidenceCardViewModel = {
  id: string;
  title: string;
  summary?: string;
  facts: ReadonlyArray<{ label: string; value: string }>;
  image?: ApprovedImageViewModel;
  href?: string;
};
```

The component receives the view model. It must not know CMS fields, database tables, approval workflows, or backend error formats.

### 16.3 Mapping rules

- Validate at the system boundary.
- Normalize once, before rendering.
- Omit unsupported optional fields.
- Fail the build or publication path for missing mandatory verified content.
- Do not fill missing facts with invented placeholders.
- Do not pass raw HTML unless a separate sanitized rich-text contract approves it.

---

## 17. Content Component Contract

Content-rich components must receive structured data rather than page-local JSX duplication when the structure repeats.

```ts
type ProcessStepViewModel = {
  id: string;
  order: number;
  title: string;
  description: string;
  evidence?: string;
};
```

Rules:

- IDs are stable and semantic.
- Order is explicit when business sequence matters.
- Rendering components do not translate or rewrite content.
- Copy keys describe meaning, not visual location.
- Long Persian content must be supported without truncating essential meaning.
- Components may enforce safe length guidance but must not silently cut source copy.
- Draft or unpublished records do not enter public component props.

---

## 18. Form Architecture Boundary

The form UI is part of the component architecture; submission security and workflow are owned by `FORM_ARCHITECTURE.md`.

Preferred flow:

```text
Form primitives
  → InquiryForm client enhancement
  → server action or secure endpoint
  → server validation
  → integration adapter
  → confirmed result
  → accessible success/error state
```

### 18.1 Separation of responsibilities

| Responsibility | Owner |
|---|---|
| Label, help, error association | `FormField` and form primitives |
| Local interaction and pending UI | focused client form boundary |
| Canonical schema validation | server/domain schema |
| Anti-abuse, rate limiting, security | server/integration layer |
| CRM or email transport | server adapter |
| User-facing error mapping | feature mapper |
| Success analytics | after confirmed backend success |

### 18.2 Rules

- Client validation supplements; it does not replace server validation.
- Server errors are mapped to safe field or form messages.
- Internal stack traces and integration responses never reach components.
- Do not place a complex invoice/material-list submission flow inside a modal.
- File-upload UI must not ship before storage, scanning, limits, retention, and privacy rules are approved.
- A CTA click is not a successful inquiry.
- Personal, procurement, document, and file values must not enter analytics.

---

## 19. Navigation Architecture Boundary

Navigation has one approved data source and separate server structure/client enhancement.

```text
navigation config
  → schema validation
  → route-aware mapper
  → server-rendered navigation links
  → small disclosure/drawer client controller
```

Rules:

- Core destinations render as real links on the server.
- Route files do not define their own primary-navigation arrays.
- The logo, labels, URLs, and primary inquiry action are server-rendered.
- Client code owns only open/close state, focus behavior, Escape behavior, and scroll lock.
- Current state is derived from the active route.
- Mobile and desktop use the same approved content source.
- Do not duplicate separate RTL and LTR navigation trees.
- Do not fetch primary navigation after hydration.

---

## 20. Direction and Localization Architecture

The Persian implementation is primary, but component structure must remain locale-neutral.

### 20.1 Root contract

Persian routes render:

```html
<html lang="fa" dir="rtl">
```

### 20.2 Component rules

- Inherit document direction by default.
- Use CSS logical properties for layout intent.
- Do not reverse arrays to simulate RTL.
- DOM order follows reading and task order.
- Mirror only icons whose meaning is directional.
- Isolate phone numbers, emails, URLs, filenames, codes, dimensions, and Latin identifiers.
- Do not maintain `ComponentRtl` and `ComponentLtr` variants.
- Locale changes content and direction; it does not fork the architecture.

### 20.3 Localization data

Components receive already-resolved localized strings or structured localized view models. Components must not:

- hard-code Persian fallback copy inside generic primitives;
- call translation loaders independently at many leaf nodes;
- infer direction from characters;
- silently fall back to an unrelated locale route;
- publish a locale switcher before multiple complete locales exist.

---

## 21. Styling Architecture

### 21.1 Token source

All component styling uses approved `--aa-*` primitive and semantic tokens from `DESIGN_SYSTEM.md`.

### 21.2 Scope

- Use component-scoped CSS Modules or the approved equivalent from `STACK.md`.
- Use global CSS only for reset, font faces, document-level defaults, tokens, and deliberate utilities.
- Page files must not override component internals with fragile selectors.
- Do not use IDs for visual styling.
- Do not depend on DOM depth or sibling position outside the component contract.

### 21.3 Logical CSS

Use:

- `margin-inline`, `margin-block`;
- `padding-inline`, `padding-block`;
- `inset-inline-start`, `inset-inline-end`;
- `border-inline-start`, `border-block-end`;
- `inline-size`, `block-size`;
- logical text and flex/grid alignment.

Physical properties require a documented genuinely physical reason.

### 21.4 Variants

Variants are semantic and finite:

```ts
type SectionSurface = 'canvas' | 'subtle' | 'warm' | 'inverse';
type ActionVariant = 'primary' | 'conversion' | 'secondary' | 'ghost';
```

Do not expose raw color, shadow, radius, z-index, or pixel values as public props.

### 21.5 Responsive styling

- Start with the narrow layout.
- Add complexity when content has space.
- Use approved breakpoints and content-driven checks.
- Avoid JavaScript breakpoints for ordinary layout.
- Support `320 CSS px`, long Persian text, and `200%` zoom.
- Container queries require explicit architectural approval and a real component-level need.

---

## 22. Accessibility Architecture

Accessibility is a cross-layer responsibility, not a final page patch.

### 22.1 Ownership by layer

| Layer | Accessibility responsibility |
|---|---|
| Foundations | focus tokens, visually hidden utility, direction isolation |
| Primitives | native roles, labels, target size, states |
| Composites | relationships, keyboard model, error/status association |
| Patterns | heading order, content sequence, evidence adjacency |
| Shells | landmarks, skip link, navigation focus behavior |
| Pages | one H1, logical order, unique labels, complete journey |

### 22.2 Requirements

- Target WCAG 2.2 AA.
- Prefer native HTML before ARIA.
- Every interactive component has a visible `:focus-visible` state.
- Keyboard and DOM order remain logical in RTL.
- State is not communicated by color alone.
- Async feedback is announced without unnecessary focus movement.
- Dialogs and drawers restore focus.
- Errors are specific, connected to fields, and summarized when appropriate.
- Reduced motion preserves complete content and task functionality.
- Component APIs must not make inaccessible states easy to create.

---

## 23. Error, Empty, Loading, and Success Boundaries

State ownership must match the failure scope.

| Scope | Preferred boundary |
|---|---|
| Route data failure | route `error.tsx` or server error handling |
| Missing route record | `notFound()` / route not-found boundary |
| Section optional data absent | omit section or honest empty state |
| Interactive component failure | local recoverable error state |
| Form validation | field errors plus `ErrorSummary` |
| Integration failure | mapped safe form-level error with retry path |
| Confirmed success | feature-level success state/page |

Rules:

- Loading UI must reserve stable dimensions.
- Skeletons represent real pending repeatable content, never fake evidence.
- Errors must preserve recoverable user data.
- Error copy must not reveal internal systems.
- Empty states must not imply content exists when it does not.
- Success appears only after the responsible server system confirms it.

---

## 24. Media Component Boundaries

Media components own presentation and delivery behavior; content models own media truth and metadata.

### 24.1 `ResponsiveImage`

Owns:

- framework image integration;
- stable dimensions or aspect ratio;
- responsive `sizes`;
- loading priority policy input;
- alt-text contract;
- focal-position handling when approved.

Does not own:

- invented alt text;
- unapproved crops;
- evidence claims;
- logo reconstruction;
- page-specific decorative overlays.

### 24.2 `Figure`

Owns semantic image-caption adjacency. A page or content mapper supplies the approved caption and source note.

### 24.3 `VideoEmbed`

Must be user-controlled, caption-ready, reduced-motion safe, and lazy by default. It must not become a general third-party script wrapper.

### 24.4 Logo assets

Logo components consume approved brand assets only. They must not redraw, distort, mirror, recolor beyond approved variants, or use presentation-board raster images as production marks.

---

## 25. Import and Export Rules

### 25.1 Canonical exports

Each public component has one canonical entry point:

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button.types';
```

Preferred import:

```ts
import { Button } from '@/components/ui/button';
```

### 25.2 Barrel rules

- A component-folder `index.ts` is allowed.
- Small, layer-specific barrels may be used only when they do not blur client/server boundaries.
- Do not create one root `components/index.ts` that re-exports the entire system.
- Do not re-export server-only code through a client entry point.
- Do not expose private subcomponents.
- Deep imports into another component's internal files are prohibited.

### 25.3 Server-only and client-only protection

Use the stack-approved server-only/client-only safeguards for modules that access:

- environment secrets;
- backend credentials;
- file storage;
- CRM/email adapters;
- server headers/cookies;
- browser APIs.

---

## 26. Third-Party Component Policy

A third-party UI or interaction dependency may be added only when:

1. a confirmed component need exists;
2. native HTML/CSS and current dependencies are insufficient;
3. accessibility behavior is verified;
4. RTL and Persian behavior are verified;
5. bundle and runtime cost are acceptable;
6. styling can follow the Ahan Asa design system without fragile overrides;
7. maintenance and license status are acceptable;
8. the decision is recorded in `DECISIONS.md`.

Do not add a dependency solely for:

- a basic accordion;
- a simple drawer transition;
- a tooltip without a confirmed need;
- trivial class-name joining;
- decorative counters;
- scroll-reveal animation;
- a generic card system;
- a marketplace widget.

Wrapper components must isolate vendor APIs from page code.

---

## 27. Testing Architecture

Testing follows architectural risk.

### 27.1 Pure units

Test without React where possible:

- schema validation;
- content mappers;
- URL builders;
- active-route matching;
- direction-value classification;
- evidence publication rules;
- safe error mapping.

### 27.2 Component tests

Test public behavior rather than internal DOM structure:

- semantic role and accessible name;
- keyboard behavior;
- focus placement/restoration;
- expanded, current, invalid, busy, selected, and pressed states;
- error/help relationships;
- missing optional data;
- long Persian content;
- mixed-direction values;
- server-rendered links and critical content.

### 27.3 Integration tests

Prioritize:

- header and mobile navigation;
- inquiry submission and recovery;
- file selection after workflow approval;
- route-driven filters and pagination;
- server/client boundary hydration;
- success only after backend confirmation.

### 27.4 End-to-end journeys

Required core journeys:

1. Discover service model from the homepage.
2. Understand Ahan Asa's procurement-manager role.
3. Review process and verified evidence.
4. Navigate to a capability or material orientation page.
5. Start an inquiry or submit an approved document workflow.
6. Recover from validation or network failure.
7. Complete the same journey by keyboard at mobile and desktop layouts.

### 27.5 Visual and manual checks

Verify:

- Persian RTL;
- future LTR fixture where practical;
- `320px` reflow;
- `200%` zoom;
- long Persian labels;
- White, Warm Cream, subtle neutral, and inverse surfaces;
- reduced motion;
- forced colors/high contrast where supported;
- missing, loading, error, empty, and success states;
- Windows and macOS font rendering;
- touch, mouse, keyboard, and representative screen readers.

---

## 28. Component Testability Rules

- Prefer role, name, and visible state queries.
- Use stable semantic `data-testid` hooks only when accessible queries are insufficient.
- Never use visible Persian copy as the only selector for analytics or brittle implementation tests.
- Do not expose internal wrapper class names as a testing contract.
- Avoid mocking the entire framework when a pure mapper can be tested separately.
- Test server and client halves at their appropriate boundaries.
- Component fixtures must use plausible but clearly non-production data.
- Never ship test fixtures as public evidence.

---

## 29. Performance Architecture

### 29.1 Rendering

- Server-render public narrative and navigation.
- Prefer static generation for stable public pages according to the technical architecture.
- Do not hydrate static sections.
- Keep client boundaries small and below the server-rendered content shell.

### 29.2 Bundles

- Import icons individually or from a small approved local set.
- Avoid a site-wide client barrel.
- Lazy-load below-the-fold heavy interactive modules.
- Do not lazy-load critical headings, navigation, or primary CTA meaning.
- Review dependency cost before adding libraries.

### 29.3 Layout stability

- Reserve logo and media dimensions.
- Loading labels preserve control width.
- Sticky header state does not alter page geometry unexpectedly.
- Fonts follow `FONT_STRATEGY.md` and must avoid unacceptable layout shift.

### 29.4 Runtime

- Prefer CSS transforms and opacity for approved motion.
- Remove event listeners and observers on cleanup.
- Avoid unthrottled scroll work.
- Do not measure layout repeatedly when CSS can solve the layout.
- Avoid client-side content waterfalls.

---

## 30. Security and Privacy Boundaries

Components are not a security boundary, but the architecture must prevent accidental exposure.

- Secrets remain in server-only modules.
- Client props contain only public or user-entered data required for the active task.
- Backend DTOs are mapped before reaching UI.
- Raw HTML is rejected unless sanitized through an approved pipeline.
- External URLs come from approved configuration.
- File metadata and personal data never enter analytics.
- Error components receive safe public error models, not raw exceptions.
- Hidden inputs do not establish authorization or trust.
- Client-side validation does not establish security.
- Draft routes, supplier data, operational contacts, and admin endpoints must not leak into public navigation/config bundles.

---

## 31. Analytics Boundary

Components expose semantic interaction hooks; the analytics layer owns transport and final event naming.

Good component-level intent:

```ts
type TrackedAction = {
  analyticsId: 'primary-inquiry' | 'upload-material-list' | 'view-process';
};
```

Rules:

- IDs describe intent, not visual position.
- Components do not call vendor analytics SDKs directly unless wrapped by the approved tracking layer.
- A wrapper and its only action must not both emit the same event.
- Navigation must not wait for tracking.
- Sensitive field values, filenames, messages, phone numbers, email addresses, and document contents are prohibited.
- Submission success events occur only after server confirmation.

---

## 32. Reuse Decision Framework

Before creating a component, decide in this order:

1. Can semantic HTML and existing styles solve it locally?
2. Does an approved primitive already exist?
3. Can existing primitives be composed without duplication?
4. Does the structure repeat with the same responsibility on two or more confirmed pages?
5. Is the repeated unit a generic composite or an Ahan Asa business pattern?
6. Does it require a feature boundary because it contains domain behavior or side effects?
7. Would extraction improve clarity, testing, or accessibility?

Do **not** extract merely because:

- a JSX block is visually long;
- two sections share a background color;
- a layout occurs once;
- a component could theoretically be reused;
- a code generator prefers more files.

Do extract when:

- semantics and interaction repeat;
- accessibility behavior must be standardized;
- a stable visual/data contract repeats;
- server/client separation becomes clearer;
- a business pattern is approved across pages;
- testing one isolated responsibility reduces risk.

---

## 33. Change and Deprecation Policy

### 33.1 Non-breaking change

Usually includes:

- adding an optional prop with a safe default;
- fixing accessibility without changing intended behavior;
- improving internal implementation while preserving the public contract;
- adding an approved variant that does not alter existing output.

### 33.2 Breaking change

Includes:

- renaming/removing a public prop or export;
- changing semantic root or keyboard behavior;
- changing required data shape;
- moving a component without a compatibility plan;
- changing default visual hierarchy;
- moving a Server Component into a client boundary;
- changing analytics intent identifiers.

### 33.3 Procedure

For material changes:

1. Identify all consumers.
2. Confirm the governing requirement.
3. Update the component and tests.
4. Migrate consumers in the same controlled task or provide an explicit transition.
5. Remove deprecated APIs after no consumers remain.
6. Record architecture-level decisions in `DECISIONS.md`.
7. Update `CHANGELOG.md` when user-visible or integration behavior changes.

Do not maintain indefinite duplicate components such as `ButtonNew`, `HeaderV2`, or `CardFinal`.

---

## 34. Prohibited Patterns

Do not create:

- duplicate RTL and LTR components;
- page-specific copies of shared primitives;
- a universal component with unrelated modes;
- root-level client layouts for small interactions;
- route files containing large reusable component definitions;
- shared components that import route modules;
- primitives that import patterns or features;
- circular imports;
- root barrel files that mix server-only and client-only exports;
- raw brand-color, spacing, radius, or shadow props;
- components named after colors or temporary positions;
- business logic hidden inside presentation primitives;
- direct CMS/database DTO rendering;
- client-side fetching of SEO-critical page copy;
- client-only navigation links;
- global state for local disclosure or menu behavior;
- CSS physical direction hacks for RTL;
- `dangerouslySetInnerHTML` without an approved sanitized pipeline;
- nested interactive elements;
- actions implemented as links or navigation implemented as buttons;
- complex inquiry flows inside modals;
- fake price, inventory, counter, ranking, testimonial, supplier, project, or certification components;
- placeholder production content;
- third-party UI libraries introduced without an architecture decision.

---

## 35. Reference Component Blueprints

### 35.1 Static business pattern

```tsx
// Server Component by default
type ProcurementProcessProps = {
  heading: string;
  intro?: string;
  steps: readonly ProcessStepViewModel[];
};

export function ProcurementProcess({
  heading,
  intro,
  steps,
}: ProcurementProcessProps) {
  return (
    <section aria-labelledby="procurement-process-title">
      <SectionHeader
        titleId="procurement-process-title"
        title={heading}
        intro={intro}
      />
      <ol>
        {steps.map((step) => (
          <li key={step.id}>
            <Heading as="h3" size="h4">{step.title}</Heading>
            <Text>{step.description}</Text>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

### 35.2 Server shell plus client island

```tsx
// MobileNavigation.tsx — server-capable wrapper
export function MobileNavigation({ config }: MobileNavigationProps) {
  return <MobileNavigationClient config={toClientNavigation(config)} />;
}
```

```tsx
// MobileNavigation.client.tsx
'use client';

export function MobileNavigationClient({ config }: ClientNavigationProps) {
  // Own only drawer/disclosure state, focus, Escape, and scroll lock.
  return null;
}
```

### 35.3 Server mutation boundary

```ts
'use server';

export async function submitInquiry(
  previousState: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  // Validate, authorize/limit, adapt, submit, and return a safe public state.
  throw new Error('Implementation governed by FORM_ARCHITECTURE.md');
}
```

Blueprints show responsibility only. They are not permission to ship unresolved workflow behavior.

---

## 36. Claude Code Implementation Workflow

Before creating or changing a component, Claude Code must:

1. Read this document and the governing component/page specifications.
2. Inspect the existing repository and preserve unrelated user changes.
3. Search for an existing primitive, composite, pattern, or feature that already owns the responsibility.
4. Identify the correct layer and allowed imports.
5. Identify server/client, data, state, side-effect, direction, responsive, accessibility, and test requirements.
6. Confirm all business content and evidence fields are approved or safely optional.
7. Report any document conflict or unresolved production dependency.

During implementation, Claude Code must:

1. Build semantic server-rendered structure first.
2. Add the smallest required client boundary.
3. Use approved tokens and logical CSS.
4. Use typed view models and validated boundary data.
5. Implement applicable default, hover, focus, active, selected, disabled, loading, success, error, and empty states.
6. Preserve no-JavaScript access to core links and content.
7. Add tests at the lowest useful level.
8. Avoid unrelated dependency, route, config, or repository changes.

Before completion, Claude Code must:

1. Run formatting, lint, type checks, tests, and production build.
2. Check for circular or prohibited imports.
3. Verify Persian RTL, mixed-direction content, `320px`, `200%` zoom, keyboard, and reduced motion.
4. Confirm the client bundle did not expand without justification.
5. Confirm no sensitive data enters client props, logs, or analytics.
6. Report changed files, checks run, results, remaining `TBD`s, and deviations.
7. Record approved exceptions in `DECISIONS.md`.

---

## 37. Pull Request Architecture Checklist

- [ ] Component has one clear responsibility
- [ ] Component is in the correct architectural layer
- [ ] Import direction follows the dependency matrix
- [ ] No circular dependency is introduced
- [ ] Existing components were reused where appropriate
- [ ] Public API is typed, semantic, and minimal
- [ ] Invalid prop combinations are prevented
- [ ] Server rendering remains the default
- [ ] `'use client'` is placed at the smallest practical boundary
- [ ] Client props are serializable and contain no secrets
- [ ] State is owned at the lowest coordinating level
- [ ] URL state is not duplicated in global/local state unnecessarily
- [ ] Domain models are mapped to view models before rendering
- [ ] Components do not render raw backend/CMS DTOs
- [ ] Styles use approved tokens and logical properties
- [ ] No page-level override breaks component internals
- [ ] Persian RTL and mixed-direction values work correctly
- [ ] Future LTR does not require a duplicate component
- [ ] Semantic HTML and keyboard behavior are correct
- [ ] Focus, error, status, and reduced-motion behavior are covered
- [ ] Layout works at `320px` and `200%` zoom
- [ ] Static/SEO-critical content is server-rendered
- [ ] Loading dimensions are stable
- [ ] No unapproved third-party dependency is added
- [ ] No fabricated content or unsupported business claim is introduced
- [ ] Automated tests cover the appropriate risk
- [ ] Manual high-risk interaction checks are complete
- [ ] Architecture changes are recorded when required

---

## 38. Initial Implementation Sequence

Implement architecture in dependency order.

### Phase 1 — Foundations

- tokens and global document styles;
- `Icon`, `VisuallyHidden`, `DirectionalValue`;
- layout primitives;
- typography and action primitives;
- import-boundary tooling.

### Phase 2 — Global shell

- `SkipLink`;
- `LogoLink`;
- server-rendered header/navigation structure;
- mobile navigation client island;
- footer;
- root page shell.

### Phase 3 — Core page patterns

- `PageHero`;
- `SectionHeader`;
- `ProcurementProcess`;
- `ProtectionPillars`;
- verified evidence patterns;
- `CtaBand`;
- homepage composition.

### Phase 4 — Inquiry feature

- form primitives;
- inquiry domain schema and safe view state;
- server submission boundary;
- progressive client form behavior;
- accessible error and success flows;
- upload only after its complete workflow approval.

### Phase 5 — Content expansion

- capability/material page compositions;
- resource and evidence indexes;
- breadcrumb and pagination;
- FAQ pattern;
- optional filters synchronized with URLs.

Each phase must pass its architecture and accessibility checks before higher layers depend on it.

---

## 39. Explicitly Deferred Decisions

This document does not guess:

- exact final repository paths if `FOLDER_STRUCTURE.md` mandates a conflicting existing structure;
- final package versions;
- final CMS provider or adapter;
- final inquiry transport, CRM, email, or storage integration;
- file types, limits, scanning, retention, privacy, and upload storage;
- final analytics provider event names;
- final preview/story environment;
- any state-management library;
- any form, schema, animation, icon, or component dependency not approved in `STACK.md`;
- final multilingual route strategy;
- final Persian font assets and loading method;
- dark mode, which is not approved for Phase 1;
- verified projects, clients, suppliers, certifications, metrics, prices, inventory, contacts, service areas, or response promises.

These are controlled dependencies. They must remain visible as `TBD` until their owning document or project owner resolves them.

---

## 40. Definition of Done

The component architecture is implemented successfully when:

1. Every public component belongs to a clear layer.
2. Dependency direction is understandable and enforceable.
3. Route files remain thin and page compositions remain declarative.
4. Shared UI is separated from business workflows.
5. Domain data is validated and mapped before rendering.
6. Public content and navigation are server-rendered by default.
7. Client JavaScript is limited to justified interactive islands.
8. State and side effects have explicit owners.
9. Persian RTL, mixed-direction values, and future LTR use one component system.
10. Accessibility requirements are built into every layer.
11. Components use the approved design system without raw visual values.
12. Forms expose no false success, unsafe errors, or unapproved upload behavior.
13. Tests cover pure rules, component behavior, feature integration, and core journeys.
14. No circular dependencies, duplicate components, uncontrolled barrels, or architecture dumping grounds remain.
15. Claude Code can identify where new work belongs without inventing a parallel pattern.

---

## 41. Final Directive

The Ahan Asa component system must behave like the brand itself: precise, calm, controlled, and protective of the buyer's decision.

Architecture must make the correct implementation path obvious. When a proposed shortcut conflicts with content truth, semantics, accessibility, RTL integrity, server-first delivery, performance, or maintainability, those requirements take priority.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Technical Architecture | TBD | Pending | — |
| Frontend Architecture | TBD | Pending | — |
| UX/UI Review | TBD | Pending | — |
| Accessibility Review | TBD | Pending | — |
| Security/Privacy Review | TBD | Pending | — |

