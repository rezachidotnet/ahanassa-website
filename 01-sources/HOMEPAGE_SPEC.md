# Ahan Asa Website — Homepage Specification

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `HOMEPAGE_SPEC.md`  
> **Status:** Draft v1.0 — Implementation specification  
> **Last updated:** 2026-08-25  
> **Primary route:** `/`  
> **Primary language:** Persian (Farsi), fully RTL  
> **Page type:** Corporate positioning, trust, qualification, and lead-generation homepage  
> **Core experience:** Calm control for high-value steel procurement

---

## 1. Purpose

This document defines the complete product, content, UX, visual, responsive, accessibility, SEO, analytics, and implementation requirements for the Ahan Asa homepage.

It is intended to be sufficiently precise for Claude Code, designers, developers, content editors, SEO specialists, and QA reviewers to build and validate the homepage without inventing business claims, page behavior, content hierarchy, or visual patterns.

The homepage must position Ahan Asa as a **steel procurement management partner**, not as:

- a traditional iron retailer;
- a public steel-price board;
- a commodity marketplace;
- a consumer e-commerce store;
- a warehouse catalog;
- a generic construction company;
- or an unverified supplier directory.

The page must turn a complex, high-value purchasing decision into a calm and understandable next step.

---

## 2. Governing Documents and Source Priority

Claude Code must read the following approved or working documents before implementing or modifying the homepage:

1. `PROJECT_BRIEF.md` — business truth, audience, scope, and non-goals
2. `BRAND_GUIDELINES.md` — identity, logo, brand-color, and asset rules
3. `DESIGN_DIRECTION.md` — intended visual and emotional experience
4. `DESIGN_SYSTEM.md` — tokens, typography, layout, states, and system rules
5. `UI_COMPONENTS.md` — component contracts and reusable patterns
6. `MOTION_GUIDELINES.md` — motion, transitions, and reduced-motion rules
7. `RESPONSIVE_RULES.md` — responsive behavior and breakpoint contracts
8. `ACCESSIBILITY.md` — accessibility requirements when available
9. `INFORMATION_ARCHITECTURE.md` — page purpose and content relationships when available
10. `ROUTES.md` — final route ownership when available
11. `CONTENT_STRATEGY.md`, `COPY_GUIDELINES.md`, and `CTA_STRATEGY.md` — final copy rules when available
12. `FORM_ARCHITECTURE.md` — inquiry, upload, privacy, validation, and handoff behavior when available
13. `SEO_STRATEGY.md`, `SEO_PAGE_MAP.md`, and `METADATA_SPEC.md` — final search intent and metadata when available

If this document conflicts with a higher-priority approved source, implementation must stop until the conflict is resolved. Missing downstream documents do not authorize Claude Code to guess final business data, legal text, routes, integrations, or claims.

---

## 3. Homepage Job

The homepage has five primary jobs:

1. **Position** — explain within seconds that Ahan Asa manages project-based steel purchasing.
2. **Differentiate** — show why managed procurement is different from buying only on unit price.
3. **Build trust** — demonstrate a controlled process through verified evidence or transparent methodology.
4. **Qualify** — help visitors decide whether Ahan Asa fits their project and purchasing need.
5. **Convert** — lead a qualified visitor toward submitting an invoice, material list, or project inquiry.

The homepage is not required to explain every material, service, or technical topic. Its role is to create a coherent decision path and link users to deeper pages.

---

## 4. Primary Page Outcome

After reviewing the homepage, a qualified visitor should be able to say:

> “Ahan Asa is not simply selling steel. It helps structure, evaluate, and coordinate the purchasing decision. I understand what information to send and what will happen next.”

The desired emotional sequence is:

**Uncertainty → Recognition → Clarity → Trust → Confident action**

---

## 5. Target Users and Homepage Intent

### 5.1 Primary users

- Project owners and investors
- Contractors and general contractors
- Industrial companies and factory owners
- EPC companies
- Procurement and purchasing managers
- Project directors and project managers
- Technical-office and commercial managers
- Steel-structure fabricators and installers
- Consultants and engineers influencing material approval

### 5.2 Primary visitor intents

| Intent | Homepage response |
|---|---|
| “Can this company understand my requirement?” | Explain requirement review and technical/commercial clarification. |
| “Can it source the right material?” | Explain structured sourcing and evaluation without promising unsupported inventory. |
| “Can it reduce procurement risk?” | Show the four protection pillars and process controls. |
| “What happens after I send my list?” | Show a visible, numbered procurement process and next-step expectation. |
| “Is this company credible?” | Show verified evidence, approved documents, methodology, or credentials. |
| “Does it cover my material or project?” | Provide a controlled capabilities/category orientation. |
| “How do I start?” | Offer a clear invoice/material-list or project-inquiry action. |

### 5.3 Users the page should intentionally discourage

The page should not be optimized around:

- consumer purchases;
- instant checkout expectations;
- speculative daily-price browsing;
- anonymous price-only requests with no meaningful project context;
- supplier sign-up or marketplace behavior;
- unsupported urgent-delivery expectations.

The experience should remain respectful and helpful, but it should make Ahan Asa's project-oriented scope clear.

---

## 6. Conversion Strategy

### 6.1 Primary conversion

The primary homepage conversion is:

**Submit an invoice, material list, or project procurement inquiry.**

Working Persian CTA direction, pending `CTA_STRATEGY.md` approval:

> **ارسال فاکتور یا لیست خرید**

The action should link to the approved dedicated inquiry/submission route. A complex RFQ or document-submission flow must not open inside a modal.

### 6.2 Secondary conversion

The secondary action is educational:

> **آشنایی با فرآیند خرید**

It should link to the relevant process section on the homepage or the approved methodology page.

### 6.3 CTA hierarchy

- The hero may contain one primary and one secondary action.
- The header may contain at most one high-value CTA.
- Mid-page contextual links may lead to detail pages but must not compete visually with the primary conversion.
- One final `CtaBand` may repeat the primary next step after sufficient context.
- Do not place an identical high-emphasis CTA after every section.
- Do not use pulsing, shaking, bouncing, countdown, scarcity, or fake-urgency treatments.

### 6.4 Submission promise

Every submission CTA must be supported by a concise explanation of:

- what the user can send;
- what Ahan Asa will review;
- what the user should expect next;
- any approved privacy or file-handling note;
- and any approved alternative contact path.

No response-time promise, service-level commitment, file-security claim, or guaranteed outcome may be shown unless operationally and legally approved.

---

## 7. Homepage Narrative Architecture

The homepage must read as one coherent story, not as a stack of disconnected marketing cards.

### 7.1 Required narrative sequence

1. Global header and skip navigation
2. Hero: role, value, and first action
3. Problem recognition: procurement risk is larger than unit price
4. Role clarification: seller versus procurement manager
5. Procurement process: what happens after the user sends a request
6. Protection pillars: how Ahan Asa protects the purchasing decision
7. Evidence and trust: proof, documentation, or transparent methodology
8. Capabilities/material orientation: confirm fit without becoming a catalog
9. Guidance/resources: help the buyer make a safer decision
10. FAQ: resolve practical objections and scope questions
11. Final action: submit an existing invoice or material list
12. Global footer

### 7.2 Optional section

A short `DocumentSubmissionPanel` may appear between evidence and capabilities if the approved form workflow and destination route are ready. If used, it must not duplicate the full final CTA band or contain a long form.

### 7.3 Prohibited homepage modules

- live or simulated steel-price ticker;
- crowded product catalog;
- shopping cart or “buy now” flow;
- supplier marketplace;
- fake stock-status indicators;
- unverified inventory counter;
- unsupported “number of clients/projects/tons” statistics;
- unapproved client or supplier logo wall;
- fictional testimonials;
- autoplay hero video;
- decorative carousel as the main information structure;
- generic “Why choose us?” icon grid with unsupported claims;
- large map implying unverified service coverage;
- newsletter pop-up before the visitor understands the brand;
- full-screen intro, loader, or animated logo sequence.

---

## 8. Global Page Shell

### 8.1 Document root

The Persian homepage must render with:

```html
<html lang="fa" dir="rtl">
```

Direction must be inherited from the document root. Components must use CSS logical properties and must not maintain separate RTL and LTR implementations.

### 8.2 Skip link

The first focusable element must be a visible-on-focus skip link targeting the homepage `<main>` element.

Working Persian label:

> **رفتن به محتوای اصلی**

### 8.3 Header

Use the approved `SiteHeader` and `PrimaryNavigation` components.

The homepage header must include:

- approved Ahan Asa logo lockup or icon according to minimum-size rules;
- primary navigation from the final sitemap;
- one approved high-value CTA;
- accessible mobile menu trigger at the content-driven collapse point.

Requirements:

- Header content must exist in server-rendered HTML.
- Exact navigation labels remain governed by `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md`.
- The logo links to `/` and has an accessible name.
- Sticky behavior is optional, not required.
- If sticky, the header may gain a border or restrained shadow after a stable scroll threshold.
- The header must not continuously shrink, expand, or swap logo variants on scroll.
- Mobile navigation must manage focus, restore focus on close, lock page scroll without layout shift, and remain usable at 200% zoom.

### 8.4 Main

- Use one semantic `<main id="main-content">`.
- Use exactly one page-level `<h1>`.
- Every major section should use a semantic `<section>` with an accessible heading.
- Decorative media must not interrupt the reading or focus order.

### 8.5 Footer

Use the approved `SiteFooter` component.

The footer should contain only verified and useful information:

- concise brand role statement;
- essential navigation;
- approved contact channels;
- legal/privacy links;
- approved company identity;
- restrained final orientation or CTA.

The footer must not become a keyword dump, duplicate the entire sitemap, or imply unverified group-company relationships.

---

## 9. Section 1 — Hero

### 9.1 Purpose

The first screen must answer three questions:

1. What does Ahan Asa do?
2. Who is it for?
3. What should the visitor do next?

The answer must be understandable without scrolling, watching media, opening a menu, or interpreting the slogan alone.

### 9.2 Required content

1. Optional short eyebrow identifying the category
2. One clear Persian `<h1>`
3. One concise supporting paragraph
4. One primary CTA
5. At most one secondary CTA
6. One approved visual or evidence element
7. Optional supporting slogan, visually subordinate to the category explanation

### 9.3 Working Persian copy direction

This copy is provisional until `COPY_GUIDELINES.md` and final stakeholder approval:

**Eyebrow**  
`مدیریت تأمین و خرید پروژه‌ای فولاد`

**H1**  
`خرید آهن را به یک تصمیم مطمئن تبدیل کنید.`

**Supporting paragraph**  
`فاکتور یا لیست خریدتان را بفرستید؛ آهن آسا نیاز پروژه، گزینه‌های تأمین و مسیر خرید را با نگاه فنی و تجاری بررسی و هماهنگ می‌کند.`

**Primary CTA**  
`ارسال فاکتور یا لیست خرید`

**Secondary CTA**  
`آشنایی با فرآیند خرید`

**Supporting brand line**  
`ما مراقب سرمایه شما هستیم.`

The slogan must support the explanation. It must never replace the category, service, or action description.

### 9.4 Layout

Wide layout:

- Use an editorial split, not a centered campaign poster by default.
- Text and actions occupy the logical inline-start side of the composition.
- Approved media/evidence occupies the complementary area.
- Both areas align to the shared page grid.
- The text column must retain a readable line length.
- The hero height follows content; it must not be forced to `100vh`.

Narrow layout:

- Reflow into one clear semantic sequence.
- Preferred order: eyebrow → H1 → body → actions → supporting media/evidence.
- Actions may stack full-width when labels would compress.
- Media must not push the core explanation below an arbitrary full-screen fold.

### 9.5 Hero visual direction

Preferred visual options, in order:

1. Approved documentary image from a real procurement, material, inspection, coordination, or delivery context
2. Approved redacted document composition demonstrating disciplined review
3. Abstract technical composition based on real steel-section geometry and document-control logic
4. Carefully selected non-deceptive editorial industrial image that does not imply ownership of a facility, inventory, team, or fleet

Prohibited hero visuals:

- anonymous warehouse inventory presented as Ahan Asa's stock;
- sparks, fire, molten steel, fake metallic texture, gears, or industrial clichés;
- hands shaking over a contract;
- staged business team pretending to be Ahan Asa staff;
- AI-generated project evidence presented as real;
- busy collage of product categories;
- critical copy embedded inside the image;
- decorative numbers, dashboards, charts, or price feeds without a real data source.

### 9.6 Interaction and motion

- Hero copy must be immediately visible without JavaScript.
- Optional entrance motion may reveal the hero content group once using opacity and a restrained block-axis offset.
- Do not stagger every line, word, button, and media element.
- Do not use parallax, continuous loops, cursor-following motion, animated backgrounds, or automatic video.
- In reduced-motion mode, render the final state immediately.

### 9.7 Hero acceptance criteria

- A first-time user can identify Ahan Asa's category, value, and next step within approximately five seconds.
- The H1 remains meaningful without the image.
- The primary CTA is visible and operable on a 320 CSS px viewport.
- The hero works with images disabled.
- No unverified claim appears above the fold.
- The hero does not resemble a price marketplace or consumer store.

---

## 10. Section 2 — Problem Recognition

### 10.1 Purpose

Show that procurement risk is broader than the headline unit price. The section should create recognition, not fear.

### 10.2 Core message

The purchasing decision may involve:

- correct specification;
- accurate quantity and scope;
- supplier suitability;
- documentation and traceability;
- availability and timing;
- payment and commercial terms;
- logistics and delivery coordination;
- cost of mismatch, delay, or rework.

### 10.3 Recommended composition

Use an editorial statement paired with a restrained structured list or annotated procurement document.

Preferred pattern:

- section eyebrow;
- decisive heading;
- short explanatory paragraph;
- seven risk/decision items grouped into no more than three meaningful categories;
- one transition line leading to Ahan Asa's role.

Do not render eight identical floating cards. Use whitespace, dividers, numbering, or a document-like layout before using decorative containers.

### 10.4 Working Persian heading direction

> **قیمت واحد، تمام هزینه خرید نیست.**

Supporting direction:

> `یک انتخاب نامتناسب، تأخیر در تأمین یا نقص در مدارک می‌تواند هزینه‌ای بیشتر از اختلاف اولیه قیمت ایجاد کند.`

This statement must remain qualified. It must not imply guaranteed savings or quantify consequences without evidence.

### 10.5 Interaction

This section is primarily informational and must not require tabs, hover, drag, or expansion to understand the core message.

---

## 11. Section 3 — Ahan Asa's Role

### 11.1 Purpose

Clarify the difference between a conventional transaction and procurement management without attacking competitors or making absolute superiority claims.

### 11.2 Core contrast

| Transaction-focused purchase | Managed procurement with Ahan Asa |
|---|---|
| Starts primarily from a requested item and quoted price | Starts from the project requirement, specification, timing, and purchasing priorities |
| Compares headline commercial offers | Reviews relevant technical, commercial, documentation, and delivery conditions |
| Ends mainly at order placement | Coordinates the approved path through agreed procurement and delivery milestones |
| Leaves more evaluation burden with the buyer | Makes responsibilities, decisions, and next steps more explicit |

The left column must not be labeled “bad,” “unsafe,” or “wrong.” The comparison is educational, not adversarial.

### 11.3 Layout

- Wide screens may use an accessible two-column comparison.
- Narrow screens must preserve relationships through paired rows or a semantic stacked transformation.
- Do not separate all left items from all right items on mobile in a way that makes comparison difficult.
- If a `<table>` is used, it must remain accessible and must not create page-level horizontal scrolling.

### 11.4 CTA

Optional low-emphasis text link:

> **مدیریت خرید آهن آسا چگونه کار می‌کند؟**

This link may move to the next process section or to the approved methodology route.

---

## 12. Section 4 — Procurement Process

### 12.1 Purpose

Explain what happens after the visitor sends an invoice, material list, or project inquiry.

Use the approved `ProcurementProcess` pattern and `ProcessCard` data contract.

### 12.2 Required process stages

The working six-stage model is:

1. **Request submission** — client sends invoice, material list, or project requirement.
2. **Requirement review** — relevant specifications, quantities, timing, location, documents, and priorities are clarified.
3. **Sourcing evaluation** — suitable sourcing options are identified and compared according to approved criteria.
4. **Proposal and decision** — a clear commercial/technical proposal or decision summary is presented within the agreed scope.
5. **Purchase confirmation** — approved terms, responsibilities, and procurement actions are confirmed.
6. **Supply and delivery coordination** — documentation, supplier communication, and delivery milestones are coordinated within the agreed scope.

Final operational naming and responsibilities require business-owner approval.

### 12.3 Required data per step

Each step may contain:

- step number;
- stage title;
- client input;
- Ahan Asa activity;
- decision or output;
- scope boundary, when needed.

Unknown or unapproved responsibilities must be omitted, not inferred.

### 12.4 Layout and direction

Wide Persian layout:

- The visual progression may move from right to left.
- Logical DOM order must remain step 1 through step 6.
- Connecting lines are secondary and restrained.
- Prefer an editorial sequence or grouped stages over six small equal app cards.

Narrow layout:

- Use a vertical numbered sequence from top to bottom.
- Keep number, title, input, responsibility, and output adjacent.
- Do not require horizontal swipe to understand the process.

### 12.5 Motion

- If revealed on scroll, animate the process container or a maximum of four grouped items, not every label independently.
- The complete process must remain readable when motion is disabled.
- Do not animate fake completion bars or percentages.

### 12.6 Process CTA

Use a contextual secondary action only if helpful:

> **برای شروع چه اطلاعاتی لازم است؟**

This should link to approved preparation guidance or the inquiry page.

---

## 13. Section 5 — Protection Pillars

### 13.1 Purpose

Translate the promise “ما مراقب سرمایه شما هستیم” into four practical procurement controls.

### 13.2 Required pillars

#### 1. Requirement clarity

Clarify material specifications, quantities, documentation, timing, location, and delivery expectations before commitment.

#### 2. Sourcing control

Identify and compare relevant supply options according to approved project priorities and evaluation criteria.

#### 3. Commercial protection

Evaluate specification compliance, supplier risk, documentation, timing, logistics, payment conditions, and total procurement implications—not unit price alone.

#### 4. Delivery coordination

Coordinate agreed procurement steps and maintain clear communication through approved order and delivery milestones.

### 13.3 Composition

Do not default to four equal icon cards.

Preferred wide-screen treatments:

- one large lead statement plus a two-by-two editorial framework;
- a document/control diagram with four supporting explanations;
- sequential paired sections with real evidence;
- or a structured `DefinitionList` treatment.

Preferred narrow treatment:

- a single ordered flow;
- strong headings and short paragraphs;
- minimal decorative icons;
- no horizontal carousel.

### 13.4 Claim integrity

The pillars describe the operating intent and approved scope. They must not be converted into absolute claims such as:

- “zero-risk purchasing”;
- “always the lowest price”;
- “guaranteed delivery”;
- “complete elimination of waste”;
- or “best supplier every time.”

---

## 14. Section 6 — Evidence and Trust

### 14.1 Purpose

Replace marketing self-praise with verifiable proof.

Use the approved `TrustEvidenceSection`, `EvidenceCard`, `Figure`, `DocumentLink`, or `CaseStudyCard` patterns as appropriate.

### 14.2 Evidence priority

Display evidence in this order of preference:

1. Verified project or procurement case
2. Approved redacted document or real methodology sample
3. Verified credential, certification, or approved client reference
4. Transparent process explanation
5. Approved testimonial with permission

### 14.3 Supported evidence fields

- procurement/project context;
- location and date where approved;
- material/category;
- verified quantity or scale;
- Ahan Asa scope;
- problem or decision managed;
- verified outcome;
- approved supporting image/document;
- source or approval status.

### 14.4 Conditional rendering

If verified project evidence is not ready:

- do not render empty project cards;
- do not create fictional placeholders;
- do not show zero-value counters;
- do not substitute stock photography as evidence;
- render an approved methodology/document-control block instead;
- optionally link to a “How we evaluate procurement” resource.

The homepage must remain complete and credible without fabricated social proof.

### 14.5 Client, supplier, and certification logos

Logos may appear only when:

- the relationship is real and current;
- display permission is confirmed;
- the layout does not imply endorsement, exclusivity, ownership, or partnership beyond the approved relationship;
- brand-clear-space rules are respected.

Otherwise, omit the logo area entirely.

### 14.6 Layout

- Feature one strong evidence item before showing a small supporting set.
- Avoid dense logo walls and endless card rows.
- Captions, dates, specifications, and scope boundaries must remain visually stable.
- Documentary media must not be cropped in a way that removes relevant context.

### 14.7 CTA

Optional contextual link:

> **مشاهده نمونه‌های تأمین و مستندات**

Only render this link if the destination contains approved content.

---

## 15. Optional Document Submission Panel

### 15.1 Use condition

Render this section only after the document-upload workflow, file rules, privacy language, storage, retention, security, fallback, and destination route are approved.

### 15.2 Purpose

Keep the main conversion path visible after the visitor has understood Ahan Asa's role and reviewed evidence.

### 15.3 Composition

- concise title;
- one-sentence explanation;
- supported-input guidance;
- one primary action;
- approved privacy/processing note;
- approved fallback contact link, if available.

### 15.4 Restrictions

- Do not embed a long RFQ.
- Do not open the full flow in a modal.
- Do not publish file-type or size promises before backend validation exists.
- Do not claim encryption, secure storage, deletion timelines, or confidentiality without approval.
- Do not show upload success until the actual approved workflow confirms it.

---

## 16. Section 7 — Capabilities and Material Orientation

### 16.1 Purpose

Help qualified visitors confirm fit and continue to the correct detail page without turning the homepage into a catalog.

### 16.2 Content model

Each approved item may include:

- category/capability title;
- concise buyer-oriented description;
- typical decision or requirement managed;
- approved visual or technical symbol;
- destination link;
- availability or scope note when necessary.

### 16.3 Category rules

- Final categories must come from approved business data and information architecture.
- Do not infer categories from generic steel marketplaces.
- Do not publish unverified sizes, standards, origins, inventory, brands, or prices.
- Do not imply every category is continuously available.
- Do not create empty destination pages merely to fill a homepage grid.

### 16.4 Layout

- Prefer three to six curated links maximum in the first release.
- Use an editorial index, structured list, or no more than three columns when content supports it.
- Cards must explain a buyer outcome, not display a generic product icon and slogan.
- On narrow screens, use a single-column list or deliberate compact two-column pattern only when labels remain readable.
- Do not use an auto-advancing carousel.

### 16.5 Section CTA

> **مشاهده حوزه‌های تأمین**

Render only when an approved category/capability hub exists.

---

## 17. Section 8 — Guidance and Resources

### 17.1 Purpose

Demonstrate expertise by helping buyers make safer procurement decisions before they contact Ahan Asa.

### 17.2 Recommended first-release topics

Topic directions may include:

- how to prepare a material list for quotation;
- how to compare steel quotations beyond unit price;
- documents to review before purchase;
- how timing and logistics affect procurement decisions;
- common specification and quantity errors;
- supplier-evaluation considerations.

Final topics must follow the content and SEO strategies.

### 17.3 Content count

- Feature two or three approved resources.
- Do not create placeholder articles to fill the section.
- If fewer than two meaningful resources exist, replace the index with one featured guide or omit the section until ready.

### 17.4 Card content

- content type;
- useful title;
- concise takeaway;
- reading time only if automatically and accurately calculated;
- publication/update date when relevant;
- direct server-rendered link.

### 17.5 SEO and interaction

- Links must be discoverable in server-rendered HTML.
- Do not use infinite scroll.
- Do not require filters on the homepage.
- Avoid clickbait, fake urgency, and unsupported market predictions.

---

## 18. Section 9 — FAQ

### 18.1 Purpose

Resolve practical questions that commonly block a qualified inquiry.

Use `FaqSection` composed from the approved accessible `Accordion`.

### 18.2 Recommended question set

Final Persian wording requires content approval. Recommended topics:

1. What information should I send for an initial review?
2. Can I send an existing supplier invoice or material list?
3. Does Ahan Asa sell steel directly or manage procurement?
4. How are sourcing options and quotations evaluated?
5. Does Ahan Asa coordinate documentation and delivery?
6. Which projects or purchasing teams are a good fit?
7. How are pricing validity and market changes handled?
8. What happens after I submit a request?

Use approximately five to seven questions on the homepage. Move detailed questions to the dedicated FAQ or service pages.

### 18.3 Content rules

- Answers must state scope and limitations clearly.
- Do not guarantee price, delivery, availability, supplier performance, or response time.
- Critical submission requirements must also appear near the CTA and must not exist only inside a collapsed answer.
- FAQ content must be visible in the DOM and accessible without pointer hover.
- `FAQPage` structured data is not automatically added by the visual component and requires separate SEO approval.

### 18.4 Accordion behavior

- Each trigger is a semantic button.
- Expanded state is programmatically exposed.
- Keyboard behavior is predictable.
- Focus remains visible.
- Opening an item must not cause a disruptive page jump.
- Large height animations are discouraged.
- All content remains readable with reduced motion.

---

## 19. Section 10 — Final CTA Band

### 19.1 Purpose

Convert clarity and trust into one low-friction next step.

Use the approved `CtaBand` and optionally a concise `DocumentSubmissionPanel` link.

### 19.2 Working Persian copy direction

**Heading**  
`فاکتور یا لیست خریدتان آماده است؟`

**Supporting text**  
`اطلاعات موجود را ارسال کنید تا نیاز پروژه و مسیر مناسب بررسی شود.`

**Primary CTA**  
`ارسال درخواست خرید`

**Optional secondary link**  
`ابتدا با مشاور تأمین گفت‌وگو کنید`

The secondary link may appear only when the contact channel and availability are approved.

### 19.3 Visual treatment

- Preferred surface: Steel Navy.
- Preferred primary control on Navy: White background with Navy text.
- Forge Copper may appear as a restrained accent, not a full dominant field.
- Keep the composition concise and spacious.
- Do not use a full-page form inside the band.

### 19.4 Reassurance

Include only approved, truthful reassurance such as:

- what the team will review;
- whether incomplete information can still be submitted;
- what general next step follows.

Do not invent privacy, response-time, callback, or quotation commitments.

---

## 20. Content Hierarchy and Copy Rules

### 20.1 Messaging order

Homepage messages must follow this hierarchy:

1. Client decision and risk
2. Ahan Asa's procurement-management role
3. Structured process
4. Practical protection and evidence
5. Fit and guidance
6. Action

### 20.2 Voice

The Persian copy must be:

- expert but understandable;
- calm rather than aggressive;
- precise rather than promotional;
- protective without fear-mongering;
- commercially intelligent;
- technically credible;
- transparent about boundaries;
- human without becoming casual.

### 20.3 Copy restrictions

Do not use:

- “lowest price”;
- “zero risk”;
- “guaranteed delivery”;
- “best supplier”;
- “number one”;
- unsupported superlatives;
- fabricated urgency;
- vague “quality is our priority” language without explanation;
- generic slogans that could belong to any steel seller;
- invented figures, projects, clients, suppliers, facilities, or certifications.

### 20.4 Persian quality

- Use correct Persian punctuation and نیم‌فاصله.
- Use approved numeral policy consistently.
- Avoid excessive bold text.
- Keep headings concise and decisive.
- Keep paragraphs scannable but do not fragment every sentence into a card.
- Isolate phone numbers, emails, URLs, standards, dimensions, product codes, and filenames with correct bidirectional handling.

### 20.5 Content status labels

All implementation content must be classified as one of:

- `approved` — cleared for production;
- `draft` — visible only in review environments;
- `conditional` — rendered only when its data condition is true;
- `omitted` — not implemented until approved.

No draft business claim may silently enter production.

---

## 21. Visual Design Rules

### 21.1 Overall character

The homepage must feel:

- premium and minimalist;
- composed and editorial;
- industrial without visual clutter;
- strong but not heavy;
- technically aware;
- financially responsible;
- modern Persian-first;
- precise and trustworthy.

### 21.2 Color roles

Use approved semantic tokens. The core brand primitives are:

- Steel Navy `#0B2545` — trust, authority, key dark surfaces
- Forge Copper `#B04A2F` — selective action and emphasis
- White `#FFFFFF` — primary surface and clarity
- Warm Cream `#FBF5EB` — restrained editorial warmth

Requirements:

- White and Warm Cream should dominate the page.
- Navy may establish key high-confidence sections.
- Copper is an accent and action color, not a repeated background.
- Functional success, warning, error, and information colors must remain semantically separate from Copper.
- Gradients are not part of the default design language.
- Essential content must meet approved contrast requirements.

### 21.3 Typography

- Preferred Persian family: Estedad, subject to final licensing and technical approval.
- Use approved design-system weights and fluid type tokens.
- Use only one H1.
- Body text must preserve comfortable Persian line height.
- Display sizes must scale down intentionally; they must not create inefficient mobile screens.
- The Persian brand name inside the official logo lockup is artwork, not live text reconstructed with a web font.

### 21.4 Layout

Use the shared design-system values:

```css
--aa-page-max: 82rem;
--aa-content-max: 68rem;
--aa-reading-max: 46rem;
--aa-page-gutter: clamp(1rem, 3vw, 2rem);
```

- Section block padding should scale fluidly within the approved `3rem` to `7.5rem` range unless a documented component exception exists.
- Use CSS Grid for page composition and Flexbox for one-dimensional alignment.
- Use shared grid lines across text, evidence, media, and actions.
- Prefer two or three meaningful columns, editorial grouping, or progressive disclosure over long equal-card rows.
- No page-level horizontal scrolling is allowed.

### 21.5 Shape and depth

- Use subtly softened geometric corners.
- Default cards use borders, not dramatic shadows.
- Shadows are reserved for real elevation such as menus, dialogs, or lifted interactive states.
- Avoid glossy effects, metallic textures, glow, bevels, and default glassmorphism.
- Pills are reserved for true tags, filters, or status chips.

### 21.6 Iconography

- Use one approved icon family.
- Icons support meaning and never replace visible labels for critical actions.
- Directional icons mirror according to RTL meaning.
- Upload, download, phone, document, clock, standards, and brand marks do not mirror merely because the page is RTL.
- Avoid decorative gears, random hexagons, sparks, circuits, or isometric factory clichés.

---

## 22. Responsive Specification

### 22.1 Principle

Responsive behavior is based on content fit, not device labels. Components should first use intrinsic sizing, `minmax()`, `auto-fit`, `clamp()`, logical properties, and container queries where appropriate.

### 22.2 Breakpoint contract

Use the approved system breakpoints as structural reference points:

| Token | Width | Intended role |
|---|---:|---|
| `sm` | 30rem / 480px | Small layout refinements |
| `md` | 48rem / 768px | Tablet and meaningful two-column opportunities |
| `lg` | 64rem / 1024px | Desktop navigation and editorial splits when content fits |
| `xl` | 80rem / 1280px | Full editorial grid |
| `2xl` | 96rem / 1536px | More whitespace, not automatically larger text |

Actual component changes should occur when content requires them.

### 22.3 Required viewport support

- Reflow correctly at 320 CSS px without page-level horizontal scroll.
- Remain usable at browser zoom up to 200%.
- Preserve content at large text settings.
- Support portrait and landscape orientations.
- Avoid viewport-height dependencies that fail under mobile browser chrome or virtual keyboards.

### 22.4 Section behavior matrix

| Section | Wide behavior | Narrow behavior |
|---|---|---|
| Header | Inline navigation and one CTA when labels fit | Accessible menu control; CTA remains easy to reach |
| Hero | Editorial split | One clear semantic sequence |
| Problem recognition | Statement plus structured list/media | Stacked statement and grouped list |
| Role comparison | Two-column or paired-row comparison | Relationship-preserving paired stack |
| Procurement process | RTL horizontal/editorial sequence | Vertical numbered sequence |
| Protection pillars | Editorial two-by-two or structured diagram | Single ordered flow |
| Evidence | One featured item plus supporting set | Featured item followed by stacked evidence |
| Categories | Editorial index or up to three columns | One column or deliberate compact two-column list |
| Resources | Two or three featured items | Stacked links/cards |
| FAQ | Bounded accordion group | Full-width accordion |
| CTA band | Concise horizontal composition | Stacked content with dominant full-width action where needed |

### 22.5 Mobile action rules

- Primary actions may become full width when it improves clarity.
- Do not render a permanent sticky bottom CTA by default.
- If a sticky action is later approved, it must not cover content, cookie/privacy controls, form errors, browser UI, or the virtual keyboard.
- Touch targets must be at least 44 × 44 CSS px.
- Hover must never be required to discover information or actions.

### 22.6 Media rules

- Provide responsive image dimensions and prevent layout shift.
- Use art direction only when the crop remains truthful.
- Do not hide evidence captions on mobile.
- Do not reorder DOM content merely to create a visual RTL arrangement.

---

## 23. Motion and Interaction Specification

### 23.1 Motion character

Motion must feel precise, quiet, and intentional. It should reinforce continuity and state, not decorate the page.

Use approved duration/easing tokens from `DESIGN_SYSTEM.md` and `MOTION_GUIDELINES.md`.

### 23.2 Allowed homepage motion

- restrained hero group entrance;
- subtle section-group reveal for a limited number of narrative/evidence blocks;
- short button/link state transitions;
- stable header border/shadow transition after scroll;
- restrained image hover for genuine links;
- accordion expansion that preserves accessibility;
- truthful form/upload state feedback after the workflow is approved.

### 23.3 Prohibited motion

- parallax;
- cursor-following effects;
- continuous decorative loops;
- autoplay background video;
- marquee or ticker motion;
- animated counters by default;
- pulsing CTAs;
- bouncing arrows;
- animated logo reconstruction;
- dramatic page wipes;
- loading theatrics;
- cards that float, glow, or scale as a whole on hover;
- content hidden indefinitely if JavaScript fails.

### 23.4 Scroll reveal budget

Do not reveal every section and every child. A reasonable homepage budget is:

- one hero group;
- up to three narrative groups;
- one process container;
- one evidence block;
- one editorial media block;
- one final CTA band.

The exact set should be smaller if motion does not materially improve comprehension.

### 23.5 Reduced motion

Under `prefers-reduced-motion: reduce`:

- remove nonessential transforms and reveals;
- show all content in its final state;
- preserve focus, hover, selected, expanded, loading, success, and error clarity;
- do not disable essential state feedback.

---

## 24. Accessibility Requirements

### 24.1 Semantic structure

- One `<h1>` in the hero.
- Logical heading order; do not skip levels for visual styling.
- Major page bands use `<section aria-labelledby="...">` where appropriate.
- Navigation uses semantic `<nav>` and lists.
- Comparisons use semantic tables, definition lists, or correctly related groups.
- Process uses an ordered list when sequence matters.
- Resource and category items use real links.
- Buttons perform actions; links navigate.

### 24.2 Keyboard

- All controls are usable without a pointer.
- Focus order follows semantic reading and action order.
- Visible focus is never removed.
- Menus, accordions, dialogs, and upload controls follow their approved keyboard contract.
- No keyboard trap exists outside an approved modal/dialog.

### 24.3 Focus

- Use the approved visible focus token, including on Navy and Copper surfaces.
- Focus must not be obscured by sticky headers or overlays.
- Hash navigation should move focus according to the approved focus-management strategy.

### 24.4 Contrast and non-color cues

- Text and essential controls must meet approved WCAG contrast targets.
- Color must not be the only indicator of current state, category, error, or success.
- Links inside body copy need a persistent affordance such as underline.

### 24.5 Images and media

- Informative images receive concise, meaningful Persian alt text.
- Decorative images use empty alt text and do not duplicate adjacent content.
- Evidence images need captions or contextual labels where necessary.
- Do not write alt text that asserts an unverified project, facility, or relationship.

### 24.6 Forms and uploads

When forms are approved:

- every field has a persistent visible label;
- required/optional state is explicit;
- errors are specific and programmatically connected;
- submission errors preserve entered values;
- multiple errors produce an accessible summary;
- status updates use appropriate live regions;
- success is announced only after confirmed success;
- file constraints and privacy information remain visible.

### 24.7 Text resizing and reflow

- Content remains readable at 200% zoom.
- No essential text is clipped.
- Controls grow or wrap rather than shrinking below usable size.
- Persian line height remains comfortable at all sizes.

---

## 25. SEO Specification

### 25.1 Search role

The homepage primarily owns brand/entity discovery and the high-level commercial category of steel procurement management. It must not compete with detailed category, service, guide, or project pages for every keyword.

Final keyword ownership requires `SEO_KEYWORD_MAP.md` and `SEO_PAGE_MAP.md`.

### 25.2 Indexability

- Core content, navigation, links, and headings must be server-rendered.
- The root Persian page must be indexable unless an explicit prelaunch environment rule applies.
- Do not depend on client-side fetches to expose the main value proposition.
- Do not hide important text inside images, canvas, or video.

### 25.3 Working metadata direction

Final copy requires metadata approval. Working direction only:

**Title direction**  
`آهن آسا | مدیریت تأمین و خرید پروژه‌ای فولاد`

**Description direction**  
`آهن آسا با بررسی فنی و تجاری نیاز پروژه، ارزیابی گزینه‌های تأمین و هماهنگی فرآیند خرید فولاد، به تصمیم‌گیری مطمئن‌تر کمک می‌کند.`

Restrictions:

- Do not add “lowest price,” “daily price,” or unsupported geographic terms merely for clicks.
- Avoid duplicate title/description text across pages.
- Keep brand and category clear.

### 25.4 Canonical and locale behavior

- Canonical target for the Phase 1 Persian homepage is the approved production origin plus `/`.
- Exact host, `www` policy, protocol, and future locale alternates must follow `HREFLANG_CANONICAL.md` and deployment configuration.
- Do not add unlaunched locale alternates.
- `x-default` behavior requires localization approval.

### 25.5 Structured data

Potential global/page entities may include:

- `Organization` or a more precise approved business type;
- `WebSite`;
- `WebPage`.

Rules:

- Structured data must reflect visible, verified facts.
- Do not add fake ratings, reviews, prices, offers, addresses, service areas, founding dates, or social profiles.
- FAQ schema is not automatic and requires separate eligibility/SEO approval.
- Reuse stable entity identifiers across pages.

### 25.6 Internal linking

The homepage should link to approved:

- procurement/capability overview;
- methodology/process page;
- material/category hub;
- verified case studies/evidence;
- resource hub and selected guides;
- FAQ;
- contact;
- project inquiry/document submission.

Use descriptive Persian anchor text. Avoid “click here” and keyword-stuffed repeated links.

---

## 26. Performance Requirements

### 26.1 Rendering strategy

- Use static-first/server rendering appropriate to Next.js App Router.
- Keep the homepage a server component by default.
- Add client components only for genuine interaction such as navigation disclosure, accordion, or approved upload behavior.
- Do not hydrate static narrative sections unnecessarily.

### 26.2 Media

- Use optimized responsive images with explicit dimensions or stable aspect ratios.
- Prioritize only the true above-the-fold image when necessary.
- Lazy-load below-the-fold media.
- Provide modern formats where supported without losing documentary fidelity.
- Do not load autoplay video on initial render.
- Avoid large decorative background images.

### 26.3 Fonts

- Self-host approved font assets when technically and legally approved.
- Preload only critical launch-locale files.
- Avoid unnecessary weights and duplicate Latin/Persian downloads.
- Use appropriate `font-display` behavior and tested fallbacks.
- Prevent layout shift from font loading.

### 26.4 JavaScript

- Core homepage reading and navigation must work without client-side JavaScript.
- Avoid animation, carousel, icon, or UI libraries for functionality already achievable with existing project tools.
- Do not ship a client-side state system for static content.

### 26.5 Stability

- Reserve space for images, evidence, forms, and async states.
- Avoid late insertion of banners above the hero.
- Header state changes must not shift page layout.
- Consent or privacy controls must not cover the primary mobile action.

### 26.6 Core Web Vitals intent

Final numeric budgets belong in `PERFORMANCE_GUIDELINES.md`. The homepage must nevertheless be designed to support:

- fast Largest Contentful Paint;
- low Cumulative Layout Shift;
- responsive Interaction to Next Paint;
- minimal main-thread work;
- no render-blocking decorative scripts.

---

## 27. Data and Content Model

Homepage content must be structured, typed, and separable from component presentation.

### 27.1 Suggested page model

```ts
type HomepageContent = {
  seo: SeoContent;
  hero: HeroContent;
  problem: ProblemRecognitionContent;
  roleComparison: RoleComparisonContent;
  process: ProcurementStep[];
  protectionPillars: ProtectionPillar[];
  evidence?: EvidenceItem[];
  documentSubmission?: DocumentSubmissionContent;
  capabilities?: CapabilityPreview[];
  resources?: ResourcePreview[];
  faq?: FaqItem[];
  finalCta: CtaBandContent;
};
```

### 27.2 Conditional section contract

```ts
type ConditionalSection<T> = {
  status: 'approved' | 'draft' | 'conditional' | 'omitted';
  items?: T[];
  fallback?: 'methodology' | 'featured-guide' | 'omit';
};
```

Production rendering rules:

- `approved` may render.
- `draft` must not render in production.
- `conditional` renders only when all required data and destination routes exist.
- `omitted` does not render and leaves no empty visual shell.

### 27.3 Evidence model

```ts
type EvidenceItem = {
  id: string;
  type: 'case-study' | 'document' | 'credential' | 'methodology' | 'testimonial';
  title: string;
  summary: string;
  scope?: string;
  location?: string;
  date?: string;
  materialCategory?: string;
  quantity?: string;
  outcome?: string;
  image?: ApprovedMedia;
  document?: ApprovedDocument;
  href?: string;
  verificationStatus: 'approved';
};
```

Do not create an `EvidenceItem` from unverified marketing notes or stock imagery.

### 27.4 Link integrity

- Every CTA and preview card must have a valid approved destination.
- Do not render dead links, `#` placeholders, or buttons without actions.
- If a destination is unavailable, omit or replace the action according to an approved fallback.

---

## 28. Recommended Component Composition

The page should be composed from approved shared components, not one-off page styles.

```tsx
<>
  <SkipLink href="#main-content" />
  <SiteHeader />

  <main id="main-content">
    <PageHero {...hero} />
    <ProblemRecognition {...problem} />
    <RoleComparison {...roleComparison} />
    <ProcurementProcess steps={process} />
    <ProtectionPillars items={protectionPillars} />
    <TrustEvidenceSection items={evidence} fallback="methodology" />
    {documentSubmission ? (
      <DocumentSubmissionPanel {...documentSubmission} />
    ) : null}
    {capabilities?.length ? (
      <CapabilityPreviewSection items={capabilities} />
    ) : null}
    {resources?.length ? (
      <ResourcePreviewSection items={resources} />
    ) : null}
    {faq?.length ? <FaqSection items={faq} /> : null}
    <CtaBand {...finalCta} />
  </main>

  <SiteFooter />
</>
```

Component names are conceptual until final folder and component architecture are approved. Claude Code must reuse existing canonical components where available.

---

## 29. Analytics and Event Intent

Final event names, payloads, consent behavior, and platform integration belong in `ANALYTICS_TRACKING.md`.

The homepage should be ready to measure:

- hero primary CTA activation;
- hero secondary/process-link activation;
- header inquiry CTA activation;
- procurement-process engagement when a genuine interaction exists;
- evidence/case-study link activation;
- capability/category link activation;
- resource link activation;
- FAQ expansion by question identifier;
- final CTA activation;
- inquiry start;
- file-selection start, if approved;
- confirmed inquiry submission;
- submission error and recovery, without collecting sensitive field content.

Rules:

- Do not track every scroll pixel or hover.
- Do not send invoice contents, filenames, personal details, technical specifications, or free-text messages in analytics payloads.
- Do not label a CTA click as a completed lead.
- Submission success is recorded only after confirmed success.
- Respect consent and privacy requirements.
- Event implementation must not block navigation or submission.

---

## 30. Error, Empty, and Failure States

### 30.1 Missing content

- Missing evidence → show approved methodology fallback or omit section.
- Missing categories → omit section; do not show empty cards.
- Fewer than two resources → show one featured guide or omit section.
- Missing contact channel → omit that channel.
- Missing image → use a designed content-only layout, not an unrelated stock image.

### 30.2 Broken destinations

Build or content validation must fail for required CTAs with missing routes. Optional sections with unavailable destinations must not render.

### 30.3 Form or upload failure

When the workflow is approved:

- preserve entered values;
- explain what failed in plain Persian;
- provide an honest retry path;
- show an approved fallback channel when available;
- never display success before confirmation;
- never silently discard a document or inquiry.

### 30.4 No-JavaScript behavior

- All narrative content remains visible.
- Navigation links remain usable.
- Primary inquiry CTA still reaches a functional page.
- Accordions should use an approved progressive-enhancement or accessible native fallback strategy.
- Motion-ready classes must not hide content before enhancement is available.

---

## 31. Security and Privacy Boundaries

- Do not expose API keys, environment variables, private endpoints, or supplier data in client code.
- Do not place upload credentials or storage paths in the page payload.
- Validate and sanitize all user-controlled data on the server.
- File validation must occur server-side even if client guidance exists.
- The homepage must not promise security properties not implemented and reviewed.
- Contact information, legal identity, privacy notice, and consent language must be approved before launch.
- Analytics must not capture sensitive procurement content.
- Third-party scripts require explicit approval and documented purpose.

---

## 32. Implementation Rules for Claude Code

Before implementation, Claude Code must:

1. Read all available governing documents listed in Section 2.
2. Inspect the existing repository and component library before creating files.
3. Confirm the actual Next.js version, routing model, styling system, and content source.
4. Identify which homepage content is approved, conditional, missing, or provisional.
5. Confirm final routes for every CTA and internal link.
6. Confirm approved logo and media assets.
7. Confirm whether document submission links to a page or has an approved short inline flow.
8. Record unresolved business, content, integration, and legal decisions instead of guessing.

During implementation, Claude Code must:

- use semantic HTML;
- use design-system semantic tokens, not raw one-off values;
- use CSS logical properties;
- preserve one implementation for RTL and future LTR;
- reuse approved components;
- keep static sections server-rendered;
- add client boundaries only where interaction requires them;
- keep content separate from presentation;
- implement conditional rendering without empty shells;
- include all required interaction states;
- preserve focus and keyboard behavior;
- add tests appropriate to the project;
- avoid unrelated refactors.

Claude Code must not:

- fabricate copy, project data, clients, suppliers, metrics, prices, service areas, certifications, or testimonials;
- create a generic template inconsistent with Ahan Asa's brand;
- add packages without approval and a demonstrated need;
- introduce a carousel, animation library, form provider, CMS, or analytics platform by assumption;
- place the RFQ in a modal;
- add a shopping cart, live-price feed, marketplace, or account flow;
- duplicate components for RTL and LTR;
- hard-code physical `left`/`right` layout rules when logical properties express intent;
- publish draft content to production;
- change global brand tokens locally to make one section work.

---

## 33. QA Test Matrix

### 33.1 Content and business truth

- [ ] The first screen explains the service, audience, and next step.
- [ ] The slogan supports rather than replaces the service explanation.
- [ ] Every claim is approved and verifiable.
- [ ] No fake price, inventory, metric, project, client, supplier, certification, or testimonial appears.
- [ ] All scope boundaries are accurate.
- [ ] Persian copy uses correct punctuation and نیم‌فاصله.
- [ ] No lorem ipsum, dead copy, or placeholder CTA remains.

### 33.2 Structure and navigation

- [ ] Exactly one H1 exists.
- [ ] Heading order is logical.
- [ ] Skip link works.
- [ ] Header and footer navigation are semantic.
- [ ] Every CTA has a valid destination.
- [ ] No `#` placeholder links exist.
- [ ] Internal anchor navigation does not hide headings behind the header.

### 33.3 Responsive

- [ ] Page reflows at 320 CSS px.
- [ ] No page-level horizontal scrolling occurs.
- [ ] Hero action labels do not clip.
- [ ] Role comparison relationships remain understandable on mobile.
- [ ] Process becomes a clear vertical sequence.
- [ ] Evidence captions remain adjacent to media.
- [ ] Actions remain usable at 200% zoom.
- [ ] Mobile browser chrome and virtual keyboard do not cover critical controls.

### 33.4 RTL and mixed direction

- [ ] Document root uses `lang="fa" dir="rtl"`.
- [ ] Logical properties control spacing and position.
- [ ] Process direction is correct visually and semantically.
- [ ] Directional icons mirror only when meaning requires it.
- [ ] Phone, email, URL, standards, dimensions, and codes are isolated correctly.
- [ ] DOM order remains logical for keyboard and assistive technology.

### 33.5 Accessibility

- [ ] All controls work with keyboard only.
- [ ] Focus is visible on all surfaces.
- [ ] Color is not the only state indicator.
- [ ] Informative images have accurate Persian alt text.
- [ ] Decorative images have empty alt text.
- [ ] Accordion semantics and keyboard behavior are correct.
- [ ] Touch targets meet minimum size.
- [ ] Text and controls meet approved contrast requirements.
- [ ] Reduced motion shows complete final content.
- [ ] Automated accessibility checks pass, followed by manual review.

### 33.6 Performance

- [ ] The hero media has stable dimensions.
- [ ] Below-the-fold media is lazy-loaded.
- [ ] No autoplay video loads on initial render.
- [ ] Static narrative sections do not hydrate unnecessarily.
- [ ] Font loading does not cause unacceptable layout shift.
- [ ] No decorative third-party script blocks rendering.
- [ ] Header state change does not shift layout.

### 33.7 SEO

- [ ] Homepage is server-rendered and indexable in production.
- [ ] Title and description are approved and unique.
- [ ] Canonical points to the approved production homepage.
- [ ] Main copy is live text, not image text.
- [ ] Internal links use descriptive anchors.
- [ ] Structured data contains only verified visible facts.
- [ ] No unsupported locale alternates are published.

### 33.8 Forms and analytics

- [ ] CTA clicks are not counted as successful leads.
- [ ] Confirmed submissions produce the correct success event.
- [ ] Sensitive procurement or personal content is absent from analytics.
- [ ] Errors preserve data and provide a retry path.
- [ ] No success state appears before backend confirmation.
- [ ] Consent and privacy behavior follow approved requirements.

### 33.9 Browser and interaction

- [ ] Keyboard, touch, mouse, and screen-reader paths are reviewed.
- [ ] Essential information is available without hover.
- [ ] The page remains readable with JavaScript disabled.
- [ ] The page works with images blocked.
- [ ] Sticky elements do not cover content.
- [ ] Back, forward, hash navigation, and scroll restoration behave predictably.

---

## 34. Definition of Done

The homepage is ready for release only when:

1. The project owner approves the positioning, narrative order, working Persian copy, and primary CTA.
2. Every production claim and evidence item has an approval source.
3. All required destination routes exist and work.
4. The approved inquiry/document-submission workflow is functional or the homepage links to a valid fallback.
5. The implementation uses approved design tokens and components.
6. Persian RTL behavior is correct across layout, navigation, icons, numbers, links, forms, and motion.
7. Mobile, desktop, zoom, keyboard, screen-reader, and reduced-motion checks pass.
8. Metadata, canonical behavior, internal links, and structured data pass SEO review.
9. Performance and accessibility acceptance thresholds pass.
10. Analytics records meaningful actions without sensitive content.
11. No placeholder, fake evidence, dead action, or unsupported capability remains.
12. Production deployment passes the approved post-deploy checklist.

---

## 35. Open Decisions

The following remain `TBD` until their governing documents or business approvals are complete:

- final Persian hero and CTA copy;
- final navigation labels and grouping;
- final inquiry/submission route;
- inline short-form approval versus dedicated-page-only submission;
- file types, limits, privacy, storage, scanning, retention, and fallback behavior;
- final material/capability categories;
- verified cases, quantities, outcomes, clients, supplier marks, credentials, and testimonials;
- approved contact channels and availability;
- final homepage search intent and keyword ownership;
- final metadata and structured-data entity fields;
- final analytics event names and consent behavior;
- approved hero/evidence photography;
- final Persian font assets, weights, licensing, and loading method;
- final performance budgets;
- final production canonical host and future locale policy.

Claude Code must preserve these as explicit decisions. It must not resolve them by assumption.

---

## 36. Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| UX/UI Approval | TBD | Pending | — |
| Content Approval | TBD | Pending | — |
| SEO Approval | TBD | Pending | — |
| Frontend Approval | TBD | Pending | — |
| Accessibility Review | TBD | Pending | — |
| Legal/Privacy Review | TBD | Pending | — |

---

**End of `HOMEPAGE_SPEC.md`**
