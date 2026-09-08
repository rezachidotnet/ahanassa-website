# AHANASSA Homepage Composition & Customer Journey Freeze V1.0

**Status:** FROZEN  
**Decision class:** Homepage composition, section ownership, and customer-journey governance  
**Applies to:** Ahan Asa public Homepage — FA / EN / AR  
**Primary direction:** FA / RTL  
**Freeze date:** 2026-09-08  
**Visual baseline:** `AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md`  

---

## 1. Purpose

This document freezes the authoritative component inventory, order, conditional-rendering role, and customer-journey responsibility of the Ahan Asa Homepage.

It resolves the validated implementation problem in which the Hero, Evaluation / Assurance, and Purchase Process repeated substantially similar process messages and visual structures.

The Homepage is now organized around the buyer’s questions:

1. What does Ahan Asa do for me?
2. What can I buy or request?
3. Why should I choose Ahan Asa?
4. What evidence supports those promises?
5. Is this relevant to my type of purchase or project?
6. What should I do next?

The Homepage MUST support exploration, supplier evaluation, confidence, and conversion. It MUST NOT repeatedly explain Ahan Asa’s internal process.

---

## 2. Scope

This freeze governs:

- the authoritative Homepage section inventory;
- the order of Homepage sections;
- ownership of each customer-journey message;
- always-present versus conditional components;
- fallback and omission behavior at the composition level;
- removal, replacement, relocation, or retirement of previous Homepage components;
- boundaries preventing message duplication;
- Homepage CTA progression;
- the relationship between the Homepage and the future dedicated `/process` page.

## 3. Outside this freeze

This document does not freeze:

- component-level visual details already governed by the Visual System & Motion Freeze;
- final Buyer Value copy and responsive design;
- Product Showcase data schema or synchronization implementation;
- Price Strip provider contracts;
- evidence calculation SQL, statistical definitions, or Odoo field design;
- the detailed content architecture of `/process`;
- Header and Hero specifications already frozen in their own documents;
- deployment, migration, or release sequencing.

---

## 4. Authoritative Homepage composition

The final Homepage composition is:

```text
Global Header
↓
Hero
↓
Price Strip [conditional]
↓
Product Showcase
↓
Buyer Value / Service Promise
↓
Verified Evidence [conditional]
↓
Industries / Use Cases [conditional]
↓
Final CTA
↓
Global Footer
```

If a conditional component is ineligible, it is omitted cleanly and the remaining components preserve this relative order.

---

## 5. Component status matrix

| Order | Component | Status | Customer-journey job |
|---:|---|---|---|
| Shell | Global Header | Always present | Navigation, contact access, locale, primary RFQ entry |
| 1 | Hero | Always present | Positioning, primary value, short purchase path, primary action |
| 2 | Price Strip | Conditional | Market orientation using current, attributable data |
| 3 | Product Showcase | Required composition component; data-driven | Product exploration and catalog entry |
| 4 | Buyer Value / Service Promise | Always present | Supplier selection and service differentiation |
| 5 | Verified Evidence | Conditional | Validation of operational promises using eligible evidence |
| 6 | Industries / Use Cases | Conditional | Relevance to real customer/project contexts |
| 7 | Final CTA | Always present | Conversion after exploration and validation |
| Shell | Global Footer | Always present | Secondary navigation, legal and organizational closure |

---

## 6. Customer-journey logic

### 6.1 Hero — Positioning and orientation

The Hero owns:

- the H1 `تأمین فولاد پروژه‌ها`;
- the core promise that Ahan Asa makes steel purchasing easier, clearer, and more controllable;
- the short four-step micro-journey:
  1. sending the request list;
  2. technical review;
  3. commercial review;
  4. purchase;
- the primary CTA to send a purchase list;
- the secondary telephone-pricing CTA;
- reassurance that sending the list creates no purchase commitment.

The Hero MUST remain a summary. It MUST NOT expand into a full process guide.

### 6.2 Price Strip — Market orientation

The Price Strip answers:

> What reliable market or price information is available now?

It MUST:

- render only from eligible, attributable, current data;
- remain provider-agnostic;
- show no fabricated, sample, or visually plausible placeholder price as real data;
- fail independently without blocking the rest of the Homepage;
- disappear cleanly when no eligible data exists.

Its absence MUST NOT leave an empty heading, blank band, skeleton, or unexplained gap.

### 6.3 Product Showcase — Exploration

The Product Showcase answers:

> What product families can I request from Ahan Asa?

It is part of the required Homepage architecture and MUST NOT be treated as intentionally removed merely because it is absent in a local or unsynchronized environment.

It MUST:

- use eligible public catalog data originating from the approved Odoo → public read-model path;
- render localized FA / EN / AR names;
- display up to the approved Homepage limit of eight cards;
- preserve manual display priority where configured;
- avoid fabricated products and dead product links;
- retain stable product imagery according to the approved image-governance rules;
- remain visually distinct from Buyer Value promises.

If no eligible products are returned, the UI MAY fail closed by omitting the section. However:

- local omission is a diagnostic state, not a composition decision;
- unexplained production omission is a release/monitoring failure unless the catalog is intentionally empty;
- staging or deployment alone MUST NOT be assumed to populate catalog data;
- data eligibility, sync state, and animation visibility MUST be diagnosed separately.

### 6.4 Buyer Value / Service Promise — Supplier selection

This component answers:

> Why should I place my steel request with Ahan Asa?

Its canonical H2 is:

> **آهن آسا چگونه خرید آهن را برای شما آسان می‌کند؟**

Its four frozen message axes are:

1. **یک کارشناس واقعی، همراه خرید شماست**
2. **اقلام متنوع، در یک مسیر هماهنگ**
3. **کوچک یا عمده، درخواست شما جدی است**
4. **پیگیری تا تحویل کالا ادامه دارد**

This component MUST communicate customer benefit and service ownership. It MUST NOT become another explanation of technical/commercial review steps.

The detailed copy, responsive layout, and interaction behavior are governed by the next dedicated component freeze.

Claims such as “cheapest,” “best,” “highest quality,” or “fastest” are prohibited unless a later evidence-governance decision defines and verifies them.

### 6.5 Verified Evidence — Proof

Verified Evidence answers:

> What operational evidence supports Ahan Asa’s promises?

It MUST NOT display aspirational, manually invented, or weak-sample metrics.

For response-speed evidence:

- the collection and calculation infrastructure SHOULD be implemented from the start;
- public display remains disabled until at least **100 eligible operational records** exist;
- the metric definition, exclusions, source, calculation window, sample size, and last-updated time MUST be explicit;
- publication requires the dedicated evidence eligibility and reliability gates;
- reaching 100 raw rows alone does not override data-quality failures.

Until evidence becomes eligible, this component is omitted. A marketing substitute MUST NOT be rendered in its place.

### 6.6 Industries / Use Cases — Relevance

Industries / Use Cases answers:

> Does Ahan Asa understand purchases or projects like mine?

It renders only when real, supportable industry or use-case content exists.

It MUST NOT:

- invent projects, customers, industries served, volumes, logos, or case studies;
- imply experience that cannot be supported;
- use generic stock-image tiles with no meaningful buyer information.

If no eligible content exists, the section is omitted and Final CTA follows the previous eligible section.

### 6.7 Final CTA — Conversion

The Final CTA answers:

> What is my next safe and clear action?

It MUST:

- return the buyer to the primary RFQ action;
- preserve the non-commitment reassurance where appropriate;
- avoid introducing a third competing primary action;
- remain concise and visually distinct without duplicating the full Hero composition;
- use the same destination and meaning as the approved primary RFQ path.

---

## 7. Message ownership and duplication gate

| Message | Sole primary owner |
|---|---|
| What Ahan Asa does | Hero |
| Short four-step purchase path | Hero |
| Current attributable price orientation | Price Strip |
| What products can be requested | Product Showcase |
| Why choose Ahan Asa | Buyer Value |
| Proof that promises are being delivered | Verified Evidence |
| Where/for whom the offer is relevant | Industries / Use Cases |
| Final action | Final CTA |
| Detailed purchase process | Dedicated `/process` page |

A later Homepage component MUST NOT duplicate another component’s primary job merely with different wording or visual styling.

Supporting references are allowed, but they MUST be brief and must point toward the owning component or dedicated page.

---

## 8. Supersession, removal, and relocation register

| Previous component/document | Homepage decision | Durable status |
|---|---|---|
| Evaluation / Assurance V2.1 | Removed and replaced by Buyer Value / Service Promise | **SUPERSEDED FOR HOMEPAGE** |
| Purchase Process V2.0 | Removed as an independent Homepage section | **RETAINED OUTSIDE HOMEPAGE** for `/process` |
| ProcessSteps legacy section | Not reintroduced separately | Covered by Hero micro-journey and future `/process` |
| RiskGrid legacy section | Excluded from current Homepage composition | Historical only; not a current Homepage component |
| RoleComparison legacy section | Excluded from current Homepage composition | Historical only; not a current Homepage component |
| ControlPillars legacy section | Excluded from current Homepage composition | Its relevant customer value is handled by Buyer Value without restoring the old section |
| TrustBand legacy section | Excluded as a generic trust claim band | May only return through eligible Verified Evidence, not unsupported claims |
| SuitabilityFaq legacy section | Removed from Homepage | Relevant questions belong on contextual detail or `/process` pages |

Historical specifications and files SHOULD NOT be deleted solely because they are no longer active. They MUST be marked with the appropriate supersession or relocation status to preserve decision history.

Any Homepage component not present in the authoritative composition in Section 4 is excluded unless this freeze is explicitly superseded.

---

## 9. Conditional-component behavior

Conditional rendering MUST be fail-closed and layout-safe.

When a conditional component is ineligible:

- it is omitted as a complete semantic section;
- no empty H2, placeholder card, promotional substitute, or unexplained whitespace remains;
- adjacent section spacing is recalculated using the normal composition rhythm;
- the remaining sections preserve their relative order;
- the omission does not change Header, Hero, Buyer Value, Final CTA, or Footer availability.

Conditional components MUST fail independently. A Price Strip failure MUST NOT suppress products, and an evidence failure MUST NOT suppress Industries or Final CTA.

---

## 10. Composition states

### 10.1 Full eligible state

```text
Hero → Price Strip → Products → Buyer Value → Evidence → Industries → Final CTA
```

### 10.2 No eligible prices

```text
Hero → Products → Buyer Value → Evidence → Industries → Final CTA
```

### 10.3 No eligible evidence

```text
Hero → Price Strip → Products → Buyer Value → Industries → Final CTA
```

### 10.4 No eligible prices, evidence, or industries

```text
Hero → Products → Buyer Value → Final CTA
```

### 10.5 Product data failure

Runtime fail-closed output MAY become:

```text
Hero → Price Strip [if eligible] → Buyer Value → Evidence [if eligible] → Industries [if eligible] → Final CTA
```

This state is acceptable as a safe rendering fallback but is **not** an acceptable unexplained production steady state. It MUST raise diagnostic or release attention according to the catalog operations policy.

---

## 11. CTA progression

The Homepage uses one primary conversion goal:

> Send a purchase list / submit an RFQ request.

CTA behavior by journey stage:

| Stage | CTA role |
|---|---|
| Header | Persistent shortcut to the primary RFQ path |
| Hero | Primary conversion opportunity plus approved phone alternative |
| Product Showcase | Product/category exploration; product links MUST resolve safely |
| Buyer Value | Normally explanatory; MUST NOT add a competing primary CTA by default |
| Evidence / Industries | Contextual links allowed only when meaningful |
| Final CTA | Reassert the primary RFQ action |

The Homepage MUST NOT imply checkout, instant binding quotation, guaranteed availability, or automatic purchase merely from sending a request list.

---

## 12. Homepage versus `/process`

The Homepage Hero owns the short process summary. The future `/process` page owns detailed process education.

The dedicated page may include:

- detailed technical and commercial review explanations;
- required documents or information;
- proposal interpretation;
- confirmation and commitment boundaries;
- logistics and delivery scenarios;
- processing-service cases;
- process-specific FAQ;
- escalation or support expectations.

The Homepage MUST NOT reproduce this depth. It MAY provide a contextual link to `/process` where justified, but the link MUST NOT compete with the primary RFQ CTA.

---

## 13. Visual-system dependency

Every component in this composition MUST conform to `AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md`.

In particular:

- Hero remains the unique Flagship Surface;
- later sections MUST NOT duplicate the complete Hero card treatment;
- Buyer Value uses a coherent flat grouped treatment rather than heavy cards;
- Product Cards remain visually actionable and distinct;
- conditional data/evidence uses the Evidence/Data archetype;
- Copper remains a restrained accent;
- all meaningful content remains visible if JavaScript or animation fails;
- reduced-motion support is mandatory.

---

## 14. Accessibility and SEO composition requirements

- Every rendered section MUST have a meaningful semantic heading structure.
- Conditional omission MUST NOT create heading-level jumps caused by placeholder headings.
- There MUST be exactly one Homepage H1.
- Primary content parity MUST be preserved across mobile and desktop.
- FA and AR use true RTL; EN uses LTR.
- Structured data MUST describe only visible, eligible content.
- Hidden or omitted products, evidence, industries, or FAQs MUST NOT remain represented as if visible and current.
- CTA labels and destinations MUST remain semantically consistent across locales.

---

## 15. Performance and failure-isolation requirements

- Conditional components MUST be independently loadable or renderable according to the approved server architecture.
- Failure of a non-critical component MUST NOT block Hero or primary CTA rendering.
- Homepage composition MUST not depend on a client-side carousel or animation runtime.
- Server-rendered content MUST remain visible without successful hydration.
- Images below the fold SHOULD be loaded according to performance policy without causing layout shift.
- Every component MUST reserve stable geometry for media it actually renders.

---

## 16. Composition acceptance gates

An implementation passes this freeze only when:

1. The rendered order matches the authoritative composition.
2. Hero is followed by Price Strip only when eligible, otherwise directly by Product Showcase.
3. Product Showcase is not intentionally removed from architecture.
4. Buyer Value appears after product exploration.
5. Evaluation / Assurance no longer appears as an independent Homepage section.
6. Purchase Process no longer appears as an independent Homepage section.
7. The Hero’s four-step journey is not repeated later on the Homepage.
8. Detailed process content is reserved for `/process`.
9. Verified Evidence appears only when its evidence gate passes.
10. Speed claims remain unpublished until the minimum 100 eligible-record threshold and all quality gates pass.
11. Industries / Use Cases contains only supportable content.
12. No legacy RiskGrid, RoleComparison, ControlPillars, generic TrustBand, or SuitabilityFaq is silently reintroduced.
13. Conditional omission leaves no empty section shell or large unexplained gap.
14. Final CTA remains present regardless of conditional-component availability.
15. All components follow the frozen Visual System & Motion baseline.

---

## 17. Required validation states

Before implementation is accepted, validate at least:

- full-data composition;
- no-price state;
- no-evidence state;
- no-industries state;
- zero eligible product state;
- catalog cards present in DOM and visible;
- JavaScript failure/motion-disabled state;
- FA desktop and mobile;
- EN desktop and mobile;
- representative AR RTL viewport;
- keyboard-only navigation;
- reduced-motion mode.

Validation MUST distinguish:

- component not rendered because data is ineligible;
- component rendered but hidden due to CSS or animation failure;
- component absent because of synchronization or local database state;
- component intentionally excluded by this architecture.

---

## 18. Governance

This document is the authoritative source for Homepage component presence, relative order, and customer-journey ownership.

Component specifications MUST conform to it. An implementation checklist MAY describe how to apply it but MUST NOT redefine the composition.

Any change to the following requires a versioned supersession:

- adding or removing a Homepage section;
- changing the frozen order;
- returning Purchase Process or Evaluation / Assurance to the Homepage;
- transferring a primary message from one component to another;
- weakening conditional evidence or catalog eligibility behavior;
- replacing the single primary RFQ conversion goal.

An implementation bug, missing local data, or temporary deployment state MUST NOT be recorded as an architecture change.

---

## 19. Final frozen decisions

1. The Homepage follows: Hero → conditional Price Strip → Product Showcase → Buyer Value → conditional Verified Evidence → conditional Industries → Final CTA.
2. Header and Footer remain global shell components.
3. Hero owns the short purchase journey.
4. Product Showcase remains part of the required Homepage architecture.
5. Buyer Value replaces Evaluation / Assurance on the Homepage.
6. Purchase Process is removed from the Homepage and retained for `/process`.
7. Detailed process education does not appear as a second Homepage journey section.
8. Verified Evidence is conditional and cannot be replaced by unsupported marketing claims.
9. Public speed evidence requires at least 100 eligible operational records plus all data-quality gates.
10. Industries / Use Cases is conditional on real, supportable content.
11. Legacy RiskGrid, RoleComparison, ControlPillars, generic TrustBand, and SuitabilityFaq are excluded from the current Homepage.
12. Conditional failures are isolated and leave no empty UI shell.
13. Final CTA always closes the content journey.
14. All sections conform to the frozen Homepage Visual System & Motion baseline.

---

## 20. Next governed document

The next component-level freeze is:

> **AHANASSA Buyer Value / Service Promise Component Freeze V1.0**

It will define final copy, content hierarchy, desktop/mobile layout, visual treatment, interaction behavior, accessibility, localization, and acceptance tests for the new Buyer Value component without reopening this Homepage composition.
