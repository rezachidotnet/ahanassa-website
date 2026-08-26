# Ahan Asa Website — Page Specifications

> **File:** `PAGE_SPECIFICATIONS.md`  
> **Project:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Status:** Normative implementation specification — v1.0  
> **Last updated:** 2026-08-25  
> **Primary locale:** Persian (`fa-IR`), fully RTL  
> **Primary release:** Phase 1 corporate and lead-generation website

---

## 1. Purpose

This document defines what every public page must do, contain, and communicate. It is the page-level implementation contract for design, content, development, QA, and Claude Code.

The site must position Ahan Asa as a premium B2B steel procurement management partner that protects project capital through requirement clarity, disciplined sourcing, commercial review, and coordinated purchasing—not as a steel marketplace, a daily-price board, or a generic iron retailer.

The approved public promise is:

> **ما مراقب سرمایه شما هستیم.**

Each page must move the visitor toward one of four outcomes:

1. Understand Ahan Asa's role.
2. Evaluate its procurement method and credibility.
3. Determine whether the service fits the visitor's requirement.
4. Start a qualified procurement inquiry.

---

## 2. Document Authority and Dependencies

Claude Code must read this file together with:

- `PROJECT_BRIEF.md`
- `BRAND_GUIDELINES.md`
- `DESIGN_DIRECTION.md`
- `DESIGN_SYSTEM.md`
- `UI_COMPONENTS.md`
- `MOTION_GUIDELINES.md`
- `RESPONSIVE_RULES.md`
- `ACCESSIBILITY.md`
- `SITEMAP.md`
- `INFORMATION_ARCHITECTURE.md`
- `ROUTES.md`

### 2.1 Conflict order

When instructions conflict, use this order:

1. Legal, privacy, security, and accessibility requirements
2. `PROJECT_BRIEF.md` for business scope and positioning
3. `ROUTES.md` for canonical URL behavior
4. `SITEMAP.md` and `INFORMATION_ARCHITECTURE.md` for hierarchy and navigation
5. This document for page purpose, content order, behavior, and acceptance
6. Design-system and component documents for presentation details

Do not silently resolve a material conflict involving routes, business scope, claims, forms, or evidence. Record it as `TBD` and request approval.

### 2.2 Route notation

The route examples in this document use English technical slugs. `ROUTES.md` remains authoritative for exact paths, locale behavior, trailing slashes, redirects, and canonical URLs. Do not create a second route merely because a label or slug in this document differs from the approved route map.

---

## 3. Global Page Requirements

Every indexable page must include:

- one unique, visible `h1`;
- a clear statement of page purpose within the opening viewport or first content block;
- a semantic `main` landmark and logical heading hierarchy;
- breadcrumb navigation on all non-home pages except where `ROUTES.md` explicitly excludes it;
- a relevant primary or contextual CTA;
- a unique title and meta description based on final approved copy;
- a canonical URL and the approved language metadata;
- at least one meaningful internal link to a parent, sibling, or next-step page;
- appropriate empty, loading, error, and success behavior where dynamic content exists;
- correct RTL rendering and isolation of LTR technical content;
- verified content only—no fabricated statistics, customers, projects, facilities, testimonials, certificates, prices, or guarantees.

### 3.1 Global shell

All public pages use:

1. Skip link
2. Site header and primary navigation
3. Breadcrumbs when required
4. Page-specific `main`
5. Contextual conversion section when relevant
6. Site footer

The header and footer are specified separately. Page templates must not duplicate their content or create competing navigation systems.

### 3.2 Content hierarchy

Each page should answer, in order:

1. Where am I?
2. What does this page offer?
3. Why does it matter to my purchasing decision?
4. What evidence or method supports the claim?
5. What should I do next?

### 3.3 Page width and rhythm

- Standard page content uses the approved `page-container` and 12-column desktop grid.
- Long-form reading columns use the approved `--reading-max` width.
- Forms use the approved `--form-max` unless a reviewed split layout is used.
- Section rhythm must use design-system tokens; do not create arbitrary page-specific spacing scales.
- Large desktop widths must add whitespace, not stretch body copy or cards indefinitely.

### 3.4 Copy status

Unless a line is explicitly marked **Approved**, copy inside this specification describes meaning and hierarchy, not final production wording. Claude Code must not publish draft English labels on the Persian website or invent final Persian marketing copy.

### 3.5 Media status

Every media slot must be populated with one of the following:

- approved real photography;
- approved process or technical illustration;
- approved document/evidence preview with sensitive data removed;
- an honest neutral visual treatment that does not imply inventory, facilities, clients, or completed work.

Never use a stock warehouse, mill, fleet, team, project, or supplier image in a way that implies ownership or a real relationship.

---

## 4. Phase 1 Page Inventory

| ID | Page family | Route reference | Primary intent | Indexing |
|---|---|---|---|---|
| P01 | Homepage | `/` | Brand understanding and qualified inquiry | Index |
| P02 | About Ahan Asa | `/about` | Trust, positioning, and operating principles | Index |
| P03 | Capabilities hub | `/capabilities` | Explain procurement capabilities | Index |
| P04 | Capability detail template | `/capabilities/[slug]` | Match a specific procurement need | Index when substantial |
| P05 | Procurement process | `/process` | Explain how engagement works | Index |
| P06 | Material categories hub | `/materials` | Orient visitors by material requirement | Index |
| P07 | Material category detail | `/materials/[slug]` | Explain procurement considerations for a category | Index when approved |
| P08 | Industries/applications hub | `/industries` | Match services to buyer context | Index |
| P09 | Industry/application detail | `/industries/[slug]` | Address sector-specific procurement concerns | Index when approved |
| P10 | Evidence/projects hub | `/projects` | Establish credibility through verified evidence | Index |
| P11 | Case study detail | `/projects/[slug]` | Explain a real procurement case | Index when verified |
| P12 | Insights/resources hub | `/resources` | Educate and support evaluation | Index |
| P13 | Article/resource detail | `/resources/[slug]` | Answer one defined user need or search intent | Index when substantial |
| P14 | FAQ | `/faq` | Resolve common objections and clarify scope | Index |
| P15 | Contact | `/contact` | Provide verified contact paths | Index |
| P16 | Procurement inquiry / RFQ | `/request` | Capture a qualified project request | Index unless SEO policy says otherwise |
| P17 | Submission confirmation | `/request/success` | Confirm receipt and set expectations | Noindex |
| P18 | Privacy policy | `/privacy` | Explain personal-data and file handling | Index |
| P19 | Terms / legal notice | `/terms` | Define website-use and legal boundaries | Index |
| P20 | 404 | system route | Recover from an invalid URL | Noindex |
| P21 | Error / unavailable state | system route | Recover from a technical failure | Noindex |

### 4.1 Conditional Phase 1 pages

Capability, material, industry, project, and resource detail routes must be generated only when final, substantial, verified content exists. A route with a title and generic paragraphs is not launch-ready.

### 4.2 Excluded Phase 1 pages

Do not create public pages for:

- live steel prices;
- product checkout or shopping cart;
- customer or supplier accounts;
- supplier marketplace listings;
- inventory availability dashboards;
- automated quote promises;
- unsupported regional or language versions;
- unverified facilities, warehouses, factories, fleets, partners, or certifications.

---

## 5. P01 — Homepage

### 5.1 Purpose

Communicate Ahan Asa's role within seconds, establish a premium and credible first impression, explain the value of managed procurement, and direct serious buyers into a qualified inquiry.

### 5.2 Primary audiences

- Project owners and investors
- Contractors and EPC companies
- Procurement and commercial managers
- Industrial companies and factory owners
- Technical office managers and consultants

### 5.3 Primary user questions

- What does Ahan Asa actually do?
- Is this a seller, marketplace, or procurement manager?
- How can it reduce purchasing and execution risk?
- Can I submit a material list or project documents?
- What should I do next?

### 5.4 Required section order

#### H01 — Hero

Required content:

- brand category in plain Persian;
- a value-led `h1` focused on managed steel procurement and protection of capital;
- Approved slogan: **ما مراقب سرمایه شما هستیم.**;
- one short supporting statement covering commercial control, technical understanding, and coordination;
- primary CTA to the procurement inquiry;
- secondary CTA to the procurement process;
- one approved industrial/technical visual or restrained art direction.

Rules:

- Do not lead with a product grid, price table, discount, or market ticker.
- Do not claim “lowest price,” “zero risk,” or guaranteed delivery.
- The hero must remain understandable without the image or animation.

#### H02 — The purchasing problem

Explain why project steel procurement is more than comparing unit prices. Cover specification, quantity, supplier reliability, documentation, market timing, logistics, and cost of errors without using fear-based copy.

#### H03 — Ahan Asa's role

Define Ahan Asa as a procurement manager and client-side commercial/technical partner. Explicitly distinguish this role from a basic steel retailer or marketplace.

#### H04 — Four value pillars

Show the approved pillars in this order:

1. Requirement clarity
2. Sourcing control
3. Commercial protection
4. Delivery coordination

Each pillar needs a concise explanation, one meaningful icon, and a link to the relevant capability or process section. Cards may be used only if the information remains easy to scan and does not create a generic service-grid appearance.

#### H05 — Procurement process preview

Summarize the engagement journey:

1. Receive inquiry and available documents
2. Review requirement and clarify scope
3. Evaluate suitable sourcing options
4. Compare commercial and technical conditions
5. Obtain client approval and coordinate procurement
6. Follow approved order and delivery milestones

Use wording that reflects actual operational capacity. Link to the full process page.

#### H06 — Who the service is for

Present qualified buyer contexts, not vanity personas. Include contractors, owners/developers, industrial businesses, EPC teams, fabricators/installers, and procurement departments where approved.

Include a short “best fit” qualifier and an honest boundary statement. Avoid publishing an arbitrary minimum order value until commercially approved.

#### H07 — Material/category preview

Show only approved material categories that have usable category pages or a valid inquiry destination. Each item must describe the procurement consideration—not behave like an e-commerce SKU card.

If no category content is approved, omit this section rather than publishing empty cards.

#### H08 — Evidence or methodology proof

Priority order:

1. verified procurement cases;
2. approved anonymized document examples;
3. verifiable team or operational credentials;
4. methodology artifacts such as a supplier-comparison framework or procurement checklist.

Do not use fake counters, logo walls, awards, review scores, or testimonials.

#### H09 — Featured insight/resource

Show up to three useful items that help a buyer make a safer decision. The section must not look like a generic blog feed. Include content type and reading/download expectations.

#### H10 — FAQ preview

Show four to six high-intent questions covering service scope, required information, supplier selection, timing, documentation, and contact expectations. Link to the full FAQ page.

#### H11 — Final conversion section

Restate the next step without repeating the entire hero. Offer:

- primary: start a procurement inquiry;
- secondary: contact an advisor through an approved channel.

### 5.5 Data requirements

- page title, description, and hero content;
- primary and secondary CTA references;
- ordered value pillars;
- approved audience segments;
- optional approved category references;
- optional verified evidence references;
- selected resources and FAQs.

### 5.6 Analytics

Track:

- `home_primary_cta_click`
- `home_process_cta_click`
- `home_capability_select`
- `home_evidence_select`
- `home_resource_select`
- `home_faq_expand`

Do not collect sensitive project information in analytics payloads.

### 5.7 Acceptance criteria

- The first screen identifies service, audience value, and next action.
- The page cannot be mistaken for a retail steel marketplace.
- The primary CTA is reachable without relying on hover or animation.
- Every proof item is verified or the section is omitted.
- Mobile content order follows the required narrative.
- No duplicated `h1`, invented metric, unapproved price, or unsupported guarantee exists.

---

## 6. P02 — About Ahan Asa

### 6.1 Purpose

Build confidence by explaining why the brand exists, whose interests it protects, how it thinks about procurement, and what it will and will not claim.

### 6.2 Required section order

1. **Page introduction** — concise statement of the brand's role.
2. **Why Ahan Asa exists** — the client problem and the business rationale.
3. **Mission and vision** — use only approved statements.
4. **Client-side principle** — explain the duty to consider the client's interests within the agreed commercial scope.
5. **Operating principles** — precision, transparency, technical awareness, commercial discipline, responsible coordination.
6. **How decisions are evaluated** — price, compliance, supplier reliability, documentation, timing, logistics, and total procurement risk.
7. **Team or leadership** — publish only approved real names, roles, biographies, and portraits.
8. **Operational boundaries** — clarify that Ahan Asa does not replace the project's designer, structural engineer, or statutory approvals unless separately contracted and qualified.
9. **CTA** — view the procurement process or submit an inquiry.

### 6.3 Rules

- Do not write an invented founding story.
- Do not imply factory, warehouse, inventory, fleet, or geographic coverage without evidence.
- Do not create a generic “years of experience / projects / clients” counter row.
- Legal entity details must be verified and visually separate from the brand promise.

### 6.4 Acceptance criteria

- The page answers “Why should I trust this role?” without unsupported self-praise.
- Mission, vision, and promise are consistent with the project brief.
- Team content disappears cleanly when no approved profiles exist.
- Boundaries are understandable and do not undermine the value proposition.

---

## 7. P03 — Capabilities Hub

### 7.1 Purpose

Translate the brand promise into concrete procurement responsibilities and help users identify the support they need.

### 7.2 Required capability structure

The hub must organize capabilities around the purchasing journey, not internal departments:

1. **Requirement review and procurement definition**
2. **Sourcing and supplier evaluation**
3. **Quotation and commercial comparison**
4. **Purchasing and delivery coordination**

Capability names may change through the approved Persian content process, but the underlying responsibility model must remain intact.

### 7.3 Required sections

1. Introductory hero with the distinction between management and simple selling.
2. Capability map showing the four capability groups.
3. Scope matrix: typical inputs, Ahan Asa activities, client decisions, and outputs.
4. Common procurement risks addressed by each capability.
5. Engagement boundary and exclusions.
6. Related process, industries, materials, and resources.
7. Inquiry CTA.

### 7.4 Interaction

- Capability cards must link to approved detail pages or anchored sections.
- A scope matrix must remain a semantic table when comparison matters.
- On mobile, the matrix may use a labelled scroll region; do not convert it into unrelated cards if comparison is lost.

### 7.5 Acceptance criteria

- Each capability describes a real activity and output.
- No capability is phrased only as an abstract benefit.
- Advisory, supply, logistics, engineering, and approval responsibilities are not blurred.

---

## 8. P04 — Capability Detail Template

### 8.1 Purpose

Answer one defined procurement need in enough detail to qualify the visitor and support a sales conversation.

### 8.2 Required section order

1. **Hero** — capability name, outcome, and scope summary.
2. **When this capability is needed** — recognizable buyer situations.
3. **Inputs required** — documents, specifications, schedule, quantities, location, or constraints.
4. **What Ahan Asa does** — ordered, operationally accurate activities.
5. **What the client receives** — named deliverables or decisions, not vague benefits.
6. **Decision criteria** — technical and commercial considerations.
7. **Client responsibilities and boundaries**.
8. **Related evidence** — verified cases or anonymized artifacts.
9. **Related materials, industries, and resources**.
10. **Contextual FAQ**.
11. **Inquiry CTA** with the capability preselected.

### 8.3 Content model

Required fields:

- `title`
- `slug`
- `summary`
- `businessOutcome`
- `situations[]`
- `requiredInputs[]`
- `activities[]`
- `deliverables[]`
- `decisionCriteria[]`
- `clientResponsibilities[]`
- `boundaries[]`
- `relatedEvidence[]`
- `relatedMaterials[]`
- `relatedIndustries[]`
- `relatedResources[]`
- `faq[]`
- `seo`

### 8.4 Publication gate

Do not publish a capability detail page unless it has specific inputs, activities, outputs, boundaries, and a valid inquiry path. Thin variations must be consolidated into the hub.

---

## 9. P05 — Procurement Process

### 9.1 Purpose

Reduce uncertainty by showing how a request moves from initial information to an approved procurement and delivery-coordination workflow.

### 9.2 Required process stages

The public process should use the following controlled structure unless operations formally approve a revision:

1. **Inquiry and document receipt** — receive project context, material list, invoice, or available documents.
2. **Requirement review** — inspect completeness, specifications, quantities, location, timing, and constraints.
3. **Clarification and scope agreement** — identify missing information and define the agreed procurement scope.
4. **Sourcing and evaluation** — identify suitable options and evaluate suppliers using approved criteria.
5. **Commercial and technical comparison** — compare compliance, terms, documentation, timing, logistics, and total cost.
6. **Client decision and order coordination** — present the approved proposal format and proceed only after required confirmation.
7. **Procurement and delivery follow-through** — coordinate agreed milestones and communication until the defined handoff.

### 9.3 Required sections

- Process introduction
- Visual stage overview
- Detailed stage explanations
- Inputs and outputs by stage
- Decision and approval points
- Communication expectations
- What can affect timing
- Boundaries and exceptions
- FAQ
- CTA to start the request

### 9.4 Rules

- Do not publish invented service-level times.
- Do not show decorative progress percentages.
- Do not imply that submission equals acceptance, confirmed stock, confirmed price, or contract.
- Desktop progression follows visual RTL; mobile progression is top to bottom.
- The full process remains readable with motion disabled.

### 9.5 Acceptance criteria

- The visitor understands what to submit and what happens next.
- Client approvals are visibly distinct from Ahan Asa activities.
- Timing variables and operational boundaries are clear.
- The process can be understood without opening every accordion.

---

## 10. P06 — Material Categories Hub

### 10.1 Purpose

Help visitors orient themselves by material requirement while preserving Ahan Asa's procurement-management positioning.

### 10.2 Required sections

1. Page introduction explaining that categories represent procurement expertise, not live inventory.
2. Approved material category directory.
3. How category requirements are reviewed.
4. Common cross-category considerations: grade, standard, dimension, quantity, documentation, delivery, and logistics.
5. Related capabilities and resources.
6. Inquiry CTA with optional category preselection.

### 10.3 Category rules

- Category names, scope, and taxonomy must come from approved business and SEO documentation.
- Do not show stock status, unit price, supplier count, or availability unless backed by an approved current data source and policy.
- Do not expose supplier identities without commercial approval.
- Do not generate category pages solely for keyword volume.
- Filters are unnecessary until the approved category count or user research justifies them.

### 10.4 Empty state

If no category pages are approved, show a concise explanation and inquiry path. Do not display disabled or “coming soon” category cards on the live site.

---

## 11. P07 — Material Category Detail Template

### 11.1 Purpose

Explain the information and procurement decisions required for one approved steel/material category, then invite a properly scoped inquiry.

### 11.2 Required section order

1. Category hero and procurement summary
2. Typical applications, stated carefully and non-prescriptively
3. Information required from the buyer
4. Specifications and standards to verify
5. Quantity, packaging, handling, and delivery considerations
6. Supplier and documentation considerations
7. Common purchasing risks and how they are controlled
8. Optional semantic specification table
9. Related capabilities, industries, evidence, and resources
10. Category-specific FAQ
11. Inquiry CTA with category context preserved

### 11.3 Content rules

- This is not a product-detail or checkout page.
- Technical statements require approved sources and review.
- Never infer structural suitability from a generic category description.
- Clearly distinguish examples from project-specific recommendations.
- Standards, grades, sizes, and units must use correct LTR isolation inside RTL content.

### 11.4 Content model

- `title`, `slug`, `summary`
- `applications[]`
- `buyerInputs[]`
- `specificationFactors[]`
- `standards[]`
- `logisticsFactors[]`
- `documentationFactors[]`
- `risks[]`
- optional `specificationTable`
- relation fields
- `faq[]`
- `seo`

### 11.5 Publication gate

Require technical review, substantial unique content, confirmed taxonomy, and an approved CTA destination before publication.

---

## 12. P08 — Industries / Applications Hub

### 12.1 Purpose

Help visitors recognize how procurement requirements change by project and organizational context.

### 12.2 Required sections

- Introductory statement about context-specific procurement
- Approved industries/application groups
- Comparison of typical priorities by context
- Related materials and capabilities
- Verified evidence where available
- Inquiry CTA

### 12.3 Rules

- Use only segments Ahan Asa can genuinely serve.
- Do not create a geographic or industry page merely to imply coverage.
- Do not claim sector specialization without evidence.
- Industry cards must describe buyer concerns, not use generic stock imagery and slogans.

---

## 13. P09 — Industry / Application Detail Template

### 13.1 Required section order

1. Context-specific hero
2. Typical procurement challenges
3. Stakeholders and decision points
4. Required project information
5. Relevant capabilities
6. Common material/category relationships
7. Documentation, logistics, schedule, and risk considerations
8. Verified case evidence
9. Related resources and FAQ
10. Inquiry CTA with industry context preserved

### 13.2 Publication gate

Require verified service relevance, substantial unique content, and at least one meaningful relationship to a capability, material, resource, or evidence item. Consolidate thin pages into the hub.

---

## 14. P10 — Evidence / Projects Hub

### 14.1 Purpose

Demonstrate credibility using verified procurement cases, real artifacts, or approved methodology evidence.

### 14.2 Required sections

1. Introduction defining what counts as evidence.
2. Featured verified case, when available.
3. Case-study directory with useful filters only when the volume justifies them.
4. Methodology evidence for periods when case publication is limited.
5. Confidentiality statement where appropriate.
6. Inquiry CTA.

### 14.3 Card requirements

Each published case card must show only approved fields, such as:

- project or anonymized case title;
- client/sector only when permitted;
- location only when permitted;
- material or procurement scope;
- completion/status label;
- one verified result or challenge summary;
- approved thumbnail.

### 14.4 Empty and low-volume states

- With one to three cases, use a curated editorial layout—not a filter interface.
- With no publishable cases, replace the directory with approved methodology artifacts and a transparent note; do not fabricate examples.

### 14.5 Acceptance criteria

- Every displayed claim maps to an evidence record.
- Filters never return misleading counts.
- Confidential information is removed or permissioned.
- Stock images are never presented as project evidence.

---

## 15. P11 — Case Study Detail Template

### 15.1 Purpose

Explain a real procurement situation, Ahan Asa's approved scope, the decision method, and the verified outcome.

### 15.2 Required section order

1. Case title and verified summary
2. Approved metadata: sector, location, status, date, scope
3. Client challenge or procurement context
4. Initial information and constraints
5. Ahan Asa's responsibility
6. Evaluation and decision process
7. Procurement/delivery coordination within scope
8. Verified outcome
9. Evidence gallery or document extracts
10. Lessons or reusable insight
11. Related capability/material/resource links
12. Contextual inquiry CTA

### 15.3 Required disclaimers

- Outcomes must be framed in their actual context, not as universal guarantees.
- Anonymized cases must say they are anonymized.
- Confidential quantities, prices, supplier data, and documents must remain excluded.

### 15.4 Content model

- `title`, `slug`, `summary`
- `clientDisplayName` or `anonymizedLabel`
- `permissionStatus`
- `sector`, `location`, `date`, `status`
- `scope[]`, `constraints[]`, `responsibilities[]`
- `evaluation[]`, `coordination[]`, `outcomes[]`
- `evidence[]` with caption, alt text, permission, and redaction status
- relations and `seo`

### 15.5 Publication gate

No case may publish until factual review, confidentiality review, media permission, and claim verification are complete.

---

## 16. P12 — Insights / Resources Hub

### 16.1 Purpose

Provide useful decision support, build topical authority, and help buyers prepare better procurement inquiries.

### 16.2 Content types

Approved types may include:

- practical articles;
- procurement guides;
- checklists;
- technical-commercial explainers;
- document templates;
- verified downloadable resources.

### 16.3 Required sections

1. Hub introduction
2. Featured resource
3. Content-type navigation or filters only when content volume justifies them
4. Resource listing
5. Topic pathways linked to capabilities and materials
6. Inquiry CTA

### 16.4 Rules

- Separate content type from topic taxonomy.
- Do not mix downloadable documents, articles, and case studies without visible labels.
- Show publication/update date only when accurate.
- Do not gate a file unless the approved lead-capture policy and actual access control support it.
- Never expose a supposedly gated download URL in public page data.

### 16.5 Empty state

At launch, a small curated list is preferable to an empty taxonomy. Hide empty filters and topic groups.

---

## 17. P13 — Article / Resource Detail Template

### 17.1 Required structure

1. Content type, topic, title, summary, author/reviewer where approved, and date
2. Reading/download expectation
3. Optional table of contents for long content
4. Main content with semantic headings
5. Tables, diagrams, examples, or document previews where useful
6. Source, revision, and technical-review information where required
7. Related capability/material links
8. Related resources
9. Contextual inquiry CTA

### 17.2 Downloadable resource behavior

- Show file type, size when available, language, revision/date, and a clear download action.
- Provide an accessible preview when practical.
- If lead capture is approved, clearly state what happens before submission.
- A failed CRM or integration call must not be represented as a successful lead.
- Download behavior must follow the approved resource-access policy.

### 17.3 Editorial rules

- One page targets one defined user need and primary search intent.
- Technical and legal claims require review.
- Use Persian-language examples and terminology appropriate to the audience.
- Do not pad content to reach an arbitrary length.
- Display correction/update information when a material revision occurs.

### 17.4 Acceptance criteria

- The page provides a complete answer or a genuinely useful artifact.
- Heading hierarchy and table semantics are correct.
- Citations or source notes appear when required.
- Related links support the user's next decision rather than SEO-only repetition.

---

## 18. P14 — FAQ

### 18.1 Purpose

Resolve high-intent questions, clarify service boundaries, and improve inquiry quality.

### 18.2 Required topic groups

- What Ahan Asa does
- Who the service is for
- Information and documents required
- Supplier and quotation evaluation
- Pricing and proposal validity
- Timing, logistics, and delivery
- Quality and documentation
- Privacy and uploaded files
- Starting and following an inquiry

### 18.3 Rules

- Answers must be direct, concise, and operationally accurate.
- Avoid vague promotional answers.
- Do not promise prices, response times, stock, outcomes, or guarantees that have not been approved.
- Accordions must expose correct `aria-expanded` behavior and remain usable with motion disabled.
- FAQ structured data may be added only when compliant with the current search-engine policy and visible page content; visible FAQs do not automatically require FAQ schema.

### 18.4 Acceptance criteria

- Every question addresses a real user or sales concern.
- Answers do not contradict process, form, legal, or privacy pages.
- The page includes a clear inquiry route after the answers.

---

## 19. P15 — Contact

### 19.1 Purpose

Provide verified contact information and help the visitor choose between a general message and a procurement request.

### 19.2 Required sections

1. Contact introduction
2. Verified communication channels
3. General contact form, only if operationally supported
4. Procurement-request direction
5. Verified office/legal address, only when approved
6. Working hours or response expectations, only when approved
7. Privacy notice and urgent/safety boundary where relevant

### 19.3 Rules

- Do not publish placeholder phone numbers, email addresses, addresses, maps, social profiles, or hours.
- Do not embed a map unless the location is public, accurate, and useful.
- General contact and procurement inquiry must not compete visually; route project buyers to the structured request.
- Mixed-direction contact data must remain readable in RTL.

### 19.4 General form minimum

- name;
- company, optional unless required by operations;
- phone or email according to approved contact policy;
- subject/category;
- message;
- consent/privacy acknowledgement where required;
- anti-spam control that does not create an accessibility barrier.

### 19.5 States

Define idle, focus, validation error, pending, confirmed success, recoverable server error, and integration-unavailable states. Preserve entered values after failure.

---

## 20. P16 — Procurement Inquiry / RFQ

### 20.1 Purpose

Capture enough project and contact information for a useful first review while keeping the flow calm, credible, secure, and easy to complete.

This is the site's primary conversion page.

### 20.2 Entry points

The form may receive non-sensitive context through approved query parameters or route state:

- capability;
- material category;
- industry/application;
- referring case/resource;
- campaign identifier allowed by analytics policy.

Never place personal, confidential, or uploaded-file data in the URL.

### 20.3 Recommended Phase 1 form structure

#### Group A — Contact

- full name;
- company/organization;
- role or department, optional;
- national phone number;
- country code;
- email;
- preferred contact method, if operationally supported.

The country code must appear visually on the left and the national number on the right in both RTL and future LTR interfaces.

#### Group B — Project / requirement

- project or request name;
- project location;
- material/category;
- request type or required support;
- estimated quantity or procurement scale, optional;
- desired delivery date or timeframe, optional;
- message / requirement description.

#### Group C — Documents

- optional material list, invoice, drawing, specification, or related document upload;
- accepted formats and maximum size shown before selection;
- privacy and confidentiality note;
- remove/replace action;
- actual upload status.

#### Group D — Review and consent

- concise summary of entered information when a multi-step flow is used;
- accuracy acknowledgement if required;
- privacy acknowledgement or consent as legally required;
- final submit action.

### 20.4 Required behavior

- Use one page unless testing demonstrates a multi-step flow is materially clearer.
- Labels remain visible; placeholders are examples only.
- Required fields are identified in text and programmatically.
- Validate on meaningful interaction and on submit; do not interrupt every keystroke.
- Preserve all entered values after validation, network, or server errors.
- Prevent accidental duplicate submission while pending.
- Do not show success until the request is durably accepted by the approved endpoint or fallback.
- Generate or display a reference ID only when it is real.
- Do not promise a response time unless approved.
- Uploads must not be publicly accessible or embedded into client-visible analytics.

### 20.5 Error handling

Required cases:

- missing required field;
- invalid phone or email format;
- invalid file type;
- file too large;
- upload interrupted;
- form endpoint unavailable;
- integration unavailable after primary receipt;
- duplicate submission;
- unknown server error.

For multiple errors, show an accessible error summary linked to the affected fields. Provide an honest retry or verified alternative contact path.

### 20.6 Success behavior

After confirmed submission:

- show what was received;
- display the real reference ID if available;
- explain the next step without inventing timing;
- provide a safe route back to the homepage or relevant resources;
- clear sensitive local form state according to the approved privacy policy.

### 20.7 Analytics

Track only non-sensitive workflow events:

- `request_view`
- `request_start`
- `request_document_add`
- `request_validation_error` with field category only
- `request_submit`
- `request_success`
- `request_failure` with safe error category

Never send names, phone numbers, emails, project text, filenames, document content, or full URLs containing personal data to analytics.

### 20.8 Acceptance criteria

- The complete flow works at 320px, desktop sizes, and 200% zoom.
- It is completable by keyboard and assistive technology.
- A user can submit without drag-and-drop.
- Failed submission preserves work.
- File privacy and limits are stated before upload.
- The success state is based on confirmed system state.

---

## 21. P17 — Submission Confirmation

### 21.1 Purpose

Confirm a real submission and set accurate expectations.

### 21.2 Required content

- clear success heading;
- summary of what happened;
- real reference ID if available;
- next-step explanation;
- safe navigation options;
- contact fallback only when verified.

### 21.3 Rules

- Set `noindex`.
- Direct visits without valid submission state must not display a false success message.
- If the page is refreshed, retain only the minimum non-sensitive confirmation state.
- Do not expose submitted form values or document names in page source, history, or share previews.
- Do not use confetti or exaggerated celebration.

---

## 22. P18 — Privacy Policy

### 22.1 Required subjects

- identity of the data controller or responsible legal entity;
- data collected through contact and procurement forms;
- purpose and legal basis where applicable;
- uploaded-file handling;
- service providers and integrations;
- retention and deletion approach;
- cookies and analytics;
- user rights and contact method;
- security limitations stated accurately;
- revision date.

### 22.2 Rules

- Legal counsel or an authorized reviewer must approve production copy.
- The page must match actual form, analytics, storage, CRM, and upload behavior.
- Do not use a generic policy copied from another company.

---

## 23. P19 — Terms / Legal Notice

### 23.1 Required subjects

- website ownership and legal identity;
- informational nature of public content;
- distinction between inquiry, proposal, acceptance, and contract;
- price and availability limitations;
- technical-information limitations;
- intellectual property;
- acceptable use;
- external links;
- limitation language approved by counsel;
- governing law/contact information where approved;
- revision date.

### 23.2 Rules

- Public website content must not be framed as a binding quotation.
- Technical category content must not replace project-specific engineering review.
- Production text requires authorized legal review.

---

## 24. P20 — 404 Not Found

### 24.1 Required content

- clear explanation that the requested page was not found;
- link to homepage;
- link to capabilities or materials;
- link to procurement inquiry;
- optional search only when a real site-search feature exists.

### 24.2 Rules

- Return the correct HTTP status.
- Use the normal brand shell without pretending the page exists.
- Do not auto-redirect users to the homepage.
- Set `noindex` or rely on correct error-status handling according to SEO architecture.

---

## 25. P21 — Error / Temporarily Unavailable State

### 25.1 Required behavior

- explain that the action or content is temporarily unavailable;
- preserve safe user input where applicable;
- provide retry only when retry is meaningful;
- offer a verified fallback contact path for failed inquiry submission;
- expose a safe reference/error code only when useful to support;
- avoid technical stack traces, secrets, endpoint details, or blame language.

### 25.2 Rules

- Do not show a success state after partial or failed submission.
- Do not repeatedly auto-retry a form or upload without user control.
- Critical errors must remain visible and must not rely only on a toast.

---

## 26. Shared Page Templates

### 26.1 Listing template

Used by materials, industries, projects, and resources when content volume justifies a listing.

Required regions:

1. page heading and description;
2. optional featured item;
3. filter/sort controls only when necessary;
4. result count when filters exist;
5. semantic item list;
6. empty state;
7. pagination or approved progressive loading;
8. contextual CTA.

Rules:

- Core content must be reachable without an infinite-scroll dependency.
- Filters must update the URL only according to `ROUTES.md` and SEO rules.
- Filter state must survive responsive layout changes.
- Empty filtered results must explain how to recover.

### 26.2 Detail template

Used by capability, material, industry, case-study, and resource detail pages.

Required regions:

1. breadcrumb;
2. title and summary;
3. meaningful metadata;
4. page-specific body sections;
5. verified media/evidence;
6. related content;
7. contextual CTA.

Rules:

- Do not force every content family into the same card-heavy layout.
- Related content must be manually or logically relevant.
- Prevent orphan pages through parent and sibling linking.

### 26.3 Long-form editorial template

- Use a readable single-column body.
- Provide a table of contents for long, structured pages when useful.
- Keep figures, tables, and evidence wider only when their content needs it.
- Preserve captions, source notes, and revision data.
- Never create a sticky side rail that traps content at 200% zoom.

---

## 27. Shared Content Models

### 27.1 SEO object

```ts
type SeoFields = {
  title: string;
  description: string;
  canonical?: string;
  robots?: "index,follow" | "noindex,follow" | "noindex,nofollow";
  openGraphTitle?: string;
  openGraphDescription?: string;
  openGraphImage?: MediaRef;
};
```

### 27.2 Media reference

```ts
type MediaRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  credit?: string;
  permissionStatus: "approved" | "restricted";
  evidenceStatus?: "documentary" | "illustrative";
};
```

### 27.3 Relation reference

```ts
type ContentRelation = {
  type: "capability" | "material" | "industry" | "project" | "resource";
  slug: string;
  reason: string;
};
```

### 27.4 Evidence record

```ts
type EvidenceRecord = {
  id: string;
  claim: string;
  source: string;
  permissionStatus: "approved" | "restricted" | "pending";
  confidentialityReview: "passed" | "pending";
  verifiedAt?: string;
  verifiedBy?: string;
};
```

Items with `pending` or `restricted` publication status must not render publicly.

---

## 28. SEO Requirements by Page Type

| Page type | Search intent | Required internal links | Structured data consideration |
|---|---|---|---|
| Homepage | Brand + category understanding | Core capabilities, process, request | `Organization`/`WebSite` only when fields are verified |
| Capability | Service/commercial intent | Process, related materials, request | `Service` only when semantically accurate |
| Material | Category/commercial research | Capability, resource, request | Avoid product/offer schema without real offer data |
| Industry | Context-specific research | Capability, material, evidence | Usually `WebPage`; do not over-markup |
| Project | Evidence evaluation | Related capability/material | `Article` or `CreativeWork` only when suitable |
| Resource | Informational intent | Parent topic, related capability | `Article`/`TechArticle` when accurate |
| FAQ | Support and objection handling | Process, request, contact | FAQ schema only under approved policy |
| Request | Conversion | Privacy, process | Usually no special rich-result markup |

### 28.1 General SEO rules

- One primary search intent per indexable page.
- No indexable thin, duplicate, placeholder, or empty pages.
- Do not place identical generic introductions across templates.
- Canonical and locale behavior must follow `HREFLANG_CANONICAL.md` and `ROUTES.md`.
- Structured data must match visible content and verified business facts.
- The Persian homepage remains the default launch experience; do not generate unsupported locale routes.

---

## 29. Accessibility Requirements by Page

### 29.1 Universal

- WCAG target and testing procedures follow `ACCESSIBILITY.md`.
- One logical `h1`, sequential headings, visible focus, keyboard access, and semantic landmarks.
- Minimum interactive target size follows the responsive/design standards.
- Information must not depend on color, position, hover, or motion alone.
- All controls require accessible names and states.
- Reduced-motion users receive the final content without reveal dependencies.

### 29.2 Forms

- Visible labels and programmatic descriptions.
- Field errors linked with `aria-describedby`.
- Error summary receives focus after failed submission when appropriate.
- Pending and result states are announced without repeated interruption.
- File inputs work through native selection as well as optional drag-and-drop.

### 29.3 Tables and technical content

- Use semantic headers and scopes.
- Label horizontally scrollable regions.
- Preserve units, standards, and identifiers.
- Do not encode a decision only with a green/red color state.

### 29.4 Media

- Documentary images need meaningful alt text and captions when context requires them.
- Decorative media uses empty alt text.
- Videos require captions/transcripts when speech or meaningful audio exists.
- Technical drawings must have an accessible description or linked explanation.

---

## 30. Responsive Page Rules

- Support 320px through 2560px and 200% zoom.
- Base layouts are one column; complexity increases only at approved breakpoints.
- Mobile source order follows reading and decision priority, not desktop visual order.
- Hero media follows content on mobile unless the media is necessary to understand the page.
- Listing filters use a disclosure/drawer below `lg` and may become a sidebar at `lg` only when useful.
- Detail-page metadata wraps; no technical value may be clipped.
- Primary forms remain one column on mobile.
- Sticky bottom CTAs are allowed only when they do not hide content, errors, footer, or browser UI.
- No page may create horizontal document scroll.

---

## 31. Motion by Page Type

- Page content must never wait for animation before becoming usable.
- Homepage may use restrained section reveal on a small number of major sections.
- Listing results and archives appear immediately; do not stagger large grids.
- Process stages may reveal as one group or up to four short items.
- Evidence imagery must not be cropped or obscured by motion.
- Forms use motion only for clear state feedback; no shake, confetti, or false progress.
- Phase 1 does not require animated route transitions.
- All pages must respect `prefers-reduced-motion` according to `MOTION_GUIDELINES.md`.

---

## 32. Analytics and Privacy

### 32.1 Global events

Use a controlled event vocabulary:

- `page_view`
- `primary_cta_click`
- `secondary_cta_click`
- `navigation_select`
- `content_select`
- `faq_expand`
- `download_start`
- `download_complete`
- request-flow events defined in P16

### 32.2 Event properties

Allowed examples:

- page type;
- content ID or approved slug;
- CTA location;
- content relation type;
- safe error category;
- campaign values approved by analytics policy.

Prohibited:

- personal contact information;
- project descriptions;
- exact quantities or commercial values;
- filenames or file contents;
- supplier/client confidential information;
- unredacted URL query strings containing user data.

---

## 33. Content and Publication Workflow

Each indexable page moves through:

1. `draft`
2. `business-review`
3. `technical-review` when applicable
4. `legal/privacy-review` when applicable
5. `media-and-permission-review`
6. `seo-review`
7. `approved`
8. `published`
9. `archived`

Claude Code must not make `draft`, `pending`, or incomplete content publicly indexable.

### 33.1 Required page record

Each page or content entry should store:

- stable ID;
- locale;
- title and slug;
- page family/template;
- publication status;
- owner/reviewer where applicable;
- created, updated, and reviewed dates;
- SEO fields;
- relations;
- evidence/permission status;
- CTA configuration;
- redirects when the slug changes.

---

## 34. Global QA Matrix

Every page must be checked for:

### Content

- [ ] Purpose and target audience are clear.
- [ ] Claims are verified and within scope.
- [ ] Persian copy is final and professionally reviewed.
- [ ] No lorem ipsum, fake counters, placeholder contacts, or unapproved media remain.
- [ ] CTA matches page intent.

### Structure

- [ ] One visible `h1` exists.
- [ ] Heading order is logical.
- [ ] Breadcrumb and internal links are correct.
- [ ] Empty and error states are defined.
- [ ] Page does not depend on client-side JavaScript for indexable core content.

### RTL and responsive

- [ ] `lang="fa"` and `dir="rtl"` are correct.
- [ ] Mixed LTR technical data is isolated.
- [ ] 320, 375, 480, 768, 1024, 1280, 1440, and wide-screen behavior are checked.
- [ ] 200% zoom remains usable.
- [ ] No horizontal document scroll occurs.

### Accessibility

- [ ] Keyboard order matches reading order.
- [ ] Focus is visible and restored after overlays.
- [ ] Controls have names, states, and sufficient targets.
- [ ] Forms expose labels, errors, and status messages correctly.
- [ ] Reduced-motion mode preserves all content and actions.

### SEO

- [ ] Title, description, canonical, robots, and social metadata are approved.
- [ ] Page has one defined search intent.
- [ ] Structured data, if present, matches visible verified content.
- [ ] No thin or duplicate route is indexable.
- [ ] Internal links do not point to drafts or broken routes.

### Performance and security

- [ ] Media is responsive, sized, optimized, and permissioned.
- [ ] No unnecessary client-side library is added for a page effect.
- [ ] No secret, private endpoint detail, or sensitive upload URL is exposed.
- [ ] Forms prevent duplicate submission and handle failure honestly.
- [ ] Uploaded files are not publicly accessible.

---

## 35. Claude Code Implementation Rules

Claude Code must:

1. Implement page families from reusable, semantic templates without making every page visually identical.
2. Use `ROUTES.md` as the source of truth for actual URLs.
3. Use structured content records rather than embedding unreviewed claims throughout components.
4. Keep Persian content server-rendered or statically rendered where practical.
5. Preserve native RTL source order and logical CSS properties.
6. Keep CTAs contextual and route them to a real approved destination.
7. Hide optional sections when approved content is absent.
8. Treat evidence, media permission, legal copy, contact details, categories, industries, and form integrations as verified data—not material to invent.
9. Mark unresolved production data as `TBD` in development artifacts, never as public copy.
10. Add tests for route rendering, metadata, responsive behavior, forms, error states, keyboard operation, and critical conversion events.

Claude Code must not:

- create a marketplace, cart, checkout, live-price board, or supplier directory;
- generate thin SEO landing pages;
- invent clients, projects, outcomes, prices, timelines, contacts, certificates, or operational coverage;
- publish unfinished page families merely to fill navigation;
- duplicate the same generic paragraphs across category or industry pages;
- make essential content dependent on hover, carousel autoplay, animation, or JavaScript-only rendering;
- expose private documents, upload URLs, or sensitive lead data;
- alter approved brand geometry, colors, slogan, or positioning.

---

## 36. Definition of Done

A page is complete only when:

- its purpose and audience are explicit;
- all required sections contain final approved content or are intentionally omitted;
- claims, evidence, media, contact information, and links are verified;
- its route, metadata, canonical behavior, and indexing status are correct;
- it works in Persian RTL across the supported viewport range and 200% zoom;
- keyboard, screen-reader, focus, reduced-motion, and form behaviors pass QA;
- loading, empty, error, and success states are honest and complete;
- analytics capture useful non-sensitive events;
- performance and security requirements pass;
- there are no placeholder, fabricated, or contradictory production elements.

---

## 37. Open Decisions Requiring Separate Approval

The following must remain `TBD` until their dedicated documents or business owners approve them:

- final Persian navigation labels and CTA copy;
- exact capability, material, and industry taxonomies;
- exact route slugs if not already locked in `ROUTES.md`;
- launch project/case-study inventory;
- final resource taxonomy and download-gating policy;
- legal entity, privacy, and terms copy;
- verified phone, email, address, social profiles, and working hours;
- form required fields and consent language;
- permitted upload formats, size limits, retention, and deletion rules;
- lead-routing, CRM, storage, notification, and fallback integrations;
- response-time statements or service-level commitments;
- analytics platform, consent mode, and retention policy;
- approved production imagery and permission records;
- future locale launch order.

Until approved, these decisions must not be guessed or presented as completed functionality.

