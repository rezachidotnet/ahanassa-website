# Ahan Asa Website — Information Architecture

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `INFORMATION_ARCHITECTURE.md`  
> **Status:** Draft v1.0 — IA implementation contract  
> **Last updated:** 2026-08-25  
> **Primary locale:** Persian (`fa-IR`), fully RTL  
> **Primary conversion:** Submit an invoice, material list, or procurement inquiry

---

## 1. Purpose

This document defines how information is organized, labeled, connected, prioritized, and exposed across the Ahan Asa website. It is the implementation contract for navigation, page relationships, content hierarchy, findability, user journeys, and conversion paths.

The architecture must make Ahan Asa understandable as a **professional steel procurement manager and protector of the client's interests**, not as a steel shop, commodity marketplace, daily-price board, or supplier directory.

The website must help a visitor move through this decision sequence:

**Discover → Understand → Evaluate → Trust → Qualify → Act → Handoff**

The corresponding emotional sequence is:

**Uncertainty → Recognition → Clarity → Trust → Confident action**

---

## 2. Authority and Document Boundaries

### 2.1 Source hierarchy

If documents conflict, use this authority order:

1. `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `BRAND_GUIDELINES.md`
4. `DESIGN_DIRECTION.md`
5. `SITEMAP.md`
6. `INFORMATION_ARCHITECTURE.md`
7. `DESIGN_SYSTEM.md`
8. `RESPONSIVE_RULES.md`
9. Page-, component-, content-, and implementation-specific documents

Unresolved conflicts must be recorded as `TBD` and escalated. Claude Code must not silently select a convenient interpretation.

### 2.2 What this document controls

- User mental models and primary tasks
- Information hierarchy and content grouping
- Global, local, utility, contextual, and footer navigation
- Page purposes and relationships
- Page archetypes and required information order
- Labels and naming principles
- Taxonomy and controlled vocabulary
- User journeys and conversion routes
- Internal-linking logic
- Breadcrumb and wayfinding rules
- Indexability intent at the IA level
- Content growth and governance rules

### 2.3 What this document does not control

- Final route syntax and redirect rules: `ROUTES.md`
- Exact page inventory: `SITEMAP.md`
- Page-level copy and modules: `PAGE_SPECIFICATIONS.md`
- Content fields and CMS schemas: `CONTENT_MODEL.md`
- Final CTA wording: `CTA_STRATEGY.md`
- Form fields, validation, storage, and integrations: `FORM_ARCHITECTURE.md`
- Metadata, keywords, schema, canonicals, and hreflang: SEO documents
- Visual tokens and component styling: `DESIGN_SYSTEM.md`

This IA may describe conditional destinations, but a conditional destination must not be published until it exists in the approved sitemap and has verified content.

---

## 3. Strategic IA Principles

### 3.1 Lead with the service model, not the catalog

Users must first understand that Ahan Asa manages the purchasing decision and process. Product categories provide orientation; they must not dominate the experience or imply an e-commerce catalog.

### 3.2 Organize around buyer decisions

The architecture should answer, in order:

1. What does Ahan Asa do?
2. Is this relevant to my project and role?
3. How does the process work?
4. What services and material categories are covered?
5. What protects my capital and reduces procurement risk?
6. What evidence supports the claims?
7. What must I send?
8. What happens after I submit?

### 3.3 Maintain one obvious primary action

The dominant conversion path is:

**ارسال فاکتور یا لیست خرید**

This action may be entered from any decision page without forcing the user to browse product categories first.

### 3.4 Use progressive disclosure

- Level 1 explains the brand, service model, and next action.
- Level 2 helps users evaluate process, services, categories, and credibility.
- Level 3 provides detailed guidance, specifications, FAQs, and evidence.
- Transactional detail is requested only when necessary for a useful response.

### 3.5 Separate education from conversion

Guides should inform first and convert contextually. Repeated aggressive CTAs must not interrupt technical reading. Conversion pages should remain concise and task-focused.

### 3.6 Proof before claims

Real cases, redacted documents, approved supplier relationships, verified statistics, credentials, and genuine testimonials may support trust. Missing evidence must be replaced with transparent process explanation, not fabricated proof.

### 3.7 Keep every important page reachable

- No published page may be orphaned.
- Every primary destination must be reachable from global navigation or a clearly related hub.
- Every indexable page should be reachable within three meaningful interactions from the homepage.
- A user must always have a clear next step and a clear route back to a parent context.

### 3.8 Design Persian as the native information model

Persian labels, reading order, grouping, and task language are primary. Future LTR locales must reuse the logical model without forcing the Persian experience into an LTR-derived structure.

---

## 4. Users, Mental Models, and Top Tasks

### 4.1 Primary audience groups

| Audience | Primary concern | Information needed first | Preferred next action |
|---|---|---|---|
| Project owner or investor | Capital exposure, accountability, total risk | Value proposition, process, protection model, evidence | Submit documents or request consultation |
| Procurement or commercial manager | Supplier comparison, commercial terms, documentation, timing | Services, process, required inputs, deliverables | Send invoice or material list |
| Project or technical manager | Specification compliance, quantities, schedule, coordination | Material category detail, technical review, process | Submit requirements and files |
| Contractor or EPC team | Reliable sourcing and delivery coordination | Scope, categories, workflow, response expectations | Start a project inquiry |
| Fabricator or installer | Correct material, dimensions, documentation, delivery | Product/category scope and technical considerations | Send a structured list |
| Architect, engineer, or consultant | Approval, standards, specification clarity | Guides, category pages, methodology, evidence | Review guidance or refer project data |
| Returning lead | Status and next required action | Tracking utility and contact channel | Track or complete missing information |

### 4.2 Top user tasks

Priority order:

1. Submit an existing invoice or material list.
2. Understand what Ahan Asa does differently from a conventional seller.
3. Understand the procurement process and what happens next.
4. Determine whether the project, material, location, and need fit the service.
5. Review services and material categories.
6. Evaluate credibility, methodology, and verified evidence.
7. Learn what information and documents are required.
8. Read practical procurement and technical guidance.
9. Contact a procurement advisor.
10. Track a previously submitted request, when tracking is operationally approved.

### 4.3 Non-target mental models

The architecture must not reinforce these expectations:

- Browse thousands of SKUs and add them to a cart.
- Check speculative live prices or a public price ticker.
- Select only the cheapest supplier.
- Open a consumer account or seller account.
- Trade steel through a marketplace.
- Receive an instant binding quotation without requirement review.

Labels such as `فروشگاه`, `خرید آنلاین`, `سبد خرید`, `فروشنده‌ها`, `قیمت لحظه‌ای`, and `معامله` must not be used unless the business model formally changes.

---

## 5. Information Domains

The site's information is grouped into seven domains.

| Domain | User question | Primary destination | IA role |
|---|---|---|---|
| Brand and promise | Who is Ahan Asa and why should I care? | Homepage, About | Orientation and positioning |
| Process | How does managed procurement work? | How It Works | Reduce uncertainty and explain accountability |
| Capabilities | What work does Ahan Asa perform? | Services | Explain actions, scope, inputs, and outputs |
| Material scope | What kinds of steel requirements can be handled? | Products / material categories | Help users identify fit without becoming a catalog |
| Evidence and trust | What proves this method is credible? | Verified sections and conditional case studies | Support evaluation |
| Knowledge | How can I make a safer purchasing decision? | Guides, FAQ | Education, search discovery, objection handling |
| Action and service | How do I start or continue? | Request, Track, Contact | Conversion and post-submission support |

These domains must remain distinct. For example, `Services` explains **what Ahan Asa does**, while `Products` explains **what material requirement the service may apply to**.

---

## 6. Hierarchical Model

### 6.1 Level 0 — Global shell

- Header
- Primary navigation
- Utility navigation
- Global primary CTA
- Breadcrumbs where required
- Footer
- Legal and privacy access

### 6.2 Level 1 — Primary destinations

- Home
- How It Works
- Services
- Products / Material Categories
- Guides
- About
- FAQ
- Contact
- Request
- Track, as a utility rather than a marketing destination

### 6.3 Level 2 — Detail destinations

- Individual material category pages
- Individual guide/article pages
- Conditional verified case-study pages
- Conditional service detail pages if the approved sitemap later separates services

### 6.4 Level 3 — Supporting information

- Contextual FAQ groups
- Specification considerations
- Required document checklists
- Redacted evidence and downloads
- Related guides and related material categories
- Legal notices and system messages

Level 3 information should normally remain embedded in its parent page unless its volume, search intent, or reuse justifies a distinct route.

---

## 7. Canonical Page Inventory and Purpose

The following reflects the current Phase 1 route model. `SITEMAP.md` and `ROUTES.md` remain authoritative for final inclusion and syntax.

| Route | Persian label | Page role | Primary user intent | Primary next step |
|---|---|---|---|---|
| `/` | صفحه اصلی | Brand and decision overview | Understand the offer and choose a path | Submit documents or learn the process |
| `/how-it-works` | فرآیند همکاری | Process authority page | Understand stages, roles, inputs, outputs, and timing | Prepare and submit a request |
| `/services` | خدمات | Capability hub | Evaluate procurement-management scope | Select a relevant service context or inquire |
| `/products` | گروه‌های کالایی | Material-orientation hub | Identify whether the requirement fits | Open a category or submit a list |
| `/products/[slug]` | نام گروه کالایی | Material category detail | Review buying context, specifications, and risks | Send requirements for that category |
| `/guides` | راهنماهای خرید | Knowledge hub | Learn and reduce purchasing risk | Read a guide or move to a related decision page |
| `/guides/[slug]` | عنوان راهنما | Guide/article detail | Resolve a specific informational question | Continue to related service/category/request |
| `/about` | درباره آهن آسا | Brand credibility | Understand positioning, principles, and accountable role | Review process or contact |
| `/faq` | پرسش‌های متداول | Objection and scope resolution | Resolve practical concerns | Start request or contact |
| `/contact` | تماس با ما | General contact | Ask a non-RFQ question or choose a contact channel | Contact the appropriate team |
| `/request` | ارسال درخواست خرید | Primary conversion | Submit invoice, material list, or inquiry | Complete submission and receive next-step confirmation |
| `/track` | پیگیری درخواست | Post-submission utility | Check an existing request | View approved status or provide missing information |

### 7.1 Supporting routes

| Route | Purpose | Indexability intent |
|---|---|---|
| `/privacy` | Explain data, document-upload, and contact-information handling | Usually indexable or `noindex` per SEO/legal decision |
| `/terms` | Website and service terms where approved | Usually indexable or `noindex` per SEO/legal decision |
| `/request/success` or equivalent state | Confirm successful submission | `noindex` |
| `/404` | Recover from an invalid destination | `noindex` |
| Error and maintenance states | Explain failure and recovery | `noindex` |

### 7.2 Conditional evidence routes

Routes such as `/case-studies` and `/case-studies/[slug]` may be added only when:

- the sitemap formally approves them;
- at least one complete, verified, publishable case exists;
- client, project, quantity, timeline, and outcome claims are approved;
- the page contains decision-useful evidence rather than a decorative portfolio entry.

Until then, verified evidence should appear contextually on Home, Services, How It Works, and relevant category pages.

---

## 8. Global Navigation

### 8.1 Primary desktop navigation

Recommended visible order in RTL reading flow:

1. `فرآیند همکاری`
2. `خدمات`
3. `گروه‌های کالایی`
4. `راهنماهای خرید`
5. `درباره آهن آسا`

Primary CTA:

**ارسال فاکتور یا لیست خرید**

The brand mark links to Home. Navigation labels must remain short, literal, and task-oriented.

### 8.2 Utility navigation

Utility destinations should not compete visually with the primary CTA:

- `پیگیری درخواست`
- `پرسش‌های متداول`
- `تماس با ما`
- Future locale switcher only after a complete locale is approved and published

### 8.3 Mobile navigation

- Preserve the same conceptual order as desktop.
- Keep the primary CTA visible without hiding essential navigation.
- Expose Track as a clear utility item.
- Use one level of disclosure for Phase 1; do not create a deep accordion tree.
- Do not require a hover state.
- Closing, focus return, escape behavior, and keyboard order must be predictable.
- Menu content must remain usable from `320px` width and at `200%` zoom.

### 8.4 Dropdown and mega-menu policy

Phase 1 should not use a mega-menu. A simple products disclosure may be added only when enough approved category pages exist to justify it. It must include a direct link to the Products hub and must not expose an empty or speculative category.

### 8.5 Current-location state

- The active primary destination must be visually and programmatically identifiable.
- A material detail page activates `گروه‌های کالایی`.
- A guide detail page activates `راهنماهای خرید`.
- Request and Track use utility/current-page state rather than falsely activating Services.

---

## 9. Footer Architecture

The footer provides reassurance and recovery, not a keyword dump.

### 9.1 Footer groups

| Group | Contents |
|---|---|
| Brand | Approved identity, concise role statement, approved slogan |
| Start | Submit invoice/list, How It Works, Services |
| Explore | Material categories, Guides, FAQ |
| Company | About, Contact |
| Existing request | Track request |
| Legal | Privacy, Terms, approved company details |
| Contact | Verified phone, email, address, and approved direct channels only |

### 9.2 Footer constraints

- Do not repeat every page or guide.
- Do not publish supplier, client, certification, or partner logos without approval.
- Do not add location links for markets where active coverage is unverified.
- Do not place a dense products taxonomy in the footer.
- Finish with one restrained CTA, not multiple competing buttons.

---

## 10. Homepage Information Hierarchy

The homepage must tell one coherent story. The recommended order is:

1. **Hero** — role, value, audience, and immediate action
2. **Quick submission entry** — upload or describe the existing invoice/material list
3. **How it works** — concise procurement sequence
4. **Why managed procurement** — distinction from conventional product selling
5. **Material categories** — orientation, not a product grid
6. **Services and responsibilities** — what Ahan Asa manages
7. **Capital-protection framework** — requirement clarity, sourcing control, commercial protection, delivery coordination
8. **Experience and methodology** — verified credentials, process artifacts, and operating logic
9. **Trust evidence** — approved suppliers, cases, statistics, and testimonials only when individually verified
10. **Guides** — decision-support content
11. **FAQ** — high-priority objections and scope questions
12. **Final CTA** — send invoice/list, with a concise explanation of the next step
13. **Footer**

### 10.1 Evidence fallback rule

If supplier marks, case studies, statistics, or testimonials are not approved, omit those modules. Do not show empty carousels, placeholder logos, invented counters, or anonymous quotations. Replace them with methodology, redacted document examples, process responsibilities, and transparent scope.

### 10.2 Homepage link targets

Each summary module must link to one canonical next destination:

- Process summary → How It Works
- Service summary → Services
- Category summary → Products or one category page
- Guide summary → Guides or one guide
- FAQ summary → FAQ
- Every appropriate action → Request

---

## 11. Page Archetypes and Required Information Order

### 11.1 How It Works page

1. Purpose and expected outcome
2. What the client sends
3. Stage-by-stage workflow
4. Ahan Asa responsibility at each stage
5. Client decision or input at each stage
6. Outputs and documents
7. Commercial and technical review points
8. Delivery and communication milestones
9. Scope boundaries and common questions
10. Request CTA

The workflow must communicate real inputs, outputs, responsibilities, and decision gates. It must not be a decorative timeline.

### 11.2 Services hub

1. Service-model overview
2. Problems addressed
3. Capability groups
4. Inputs required from the client
5. Deliverables or outcomes
6. Relationship to the four value pillars
7. Related material contexts
8. Evidence or methodology
9. FAQ
10. Request CTA

Recommended capability taxonomy:

- Requirement and specification review
- Sourcing and supplier evaluation
- Quotation and commercial comparison
- Documentation and order coordination
- Logistics and delivery coordination

These labels are functional groupings, not promises of unlimited scope. Final service naming requires business approval.

### 11.3 Products / material-category hub

1. Explain why categories are provided
2. Clarify that this is not a live catalog or price board
3. Present approved top-level material categories
4. Explain how to submit mixed-category lists
5. Link to specification and buying guides
6. Request CTA

### 11.4 Material category page

1. Category definition
2. Common project and purchasing contexts
3. Common forms, grades, dimensions, or standards, only when verified
4. Required specifications and documents
5. Common procurement risks
6. What the client should send
7. Ahan Asa's role in this category
8. Related services
9. Related guides and FAQs
10. Category-context request CTA

Category pages must not expose unverified availability, inventory, supplier, price, or delivery claims.

### 11.5 Guides hub

1. Knowledge promise
2. Featured or foundational guides
3. Guide topics
4. Optional filtering after content volume justifies it
5. Contextual conversion block

Site-wide search is not required for Phase 1. Add guide search or filters only when the content set is large enough that scanning is inefficient. A practical review trigger is approximately 12–20 approved resources, but the decision must be based on observed findability problems, not an arbitrary count.

### 11.6 Guide/article page

1. Clear question or decision title
2. Short answer or executive summary
3. Scope, assumptions, and update date
4. Structured explanatory content
5. Tables, checklists, or diagrams where useful
6. Risks and common mistakes
7. Sources or evidence where applicable
8. Related material category and service
9. Related guides
10. Contextual request CTA

### 11.7 About page

1. Ahan Asa's role and reason for existence
2. Client problem and brand promise
3. Procurement-management philosophy
4. Principles and accountability
5. Verified team or experience evidence
6. Scope and operating boundaries
7. Process or consultation CTA

The page should build trust through clarity and evidence, not a long self-congratulatory company history.

### 11.8 FAQ page

Group questions by user intent:

- Starting a request
- Required documents and information
- Scope of procurement management
- Pricing, validity, and comparison
- Specifications and quality documentation
- Logistics and delivery
- Communication and tracking
- Privacy and document handling

Each answer should link to one deeper canonical page when more detail is needed. Do not duplicate full guide content inside FAQ answers.

### 11.9 Contact page

1. Explain when to use Contact versus Request
2. Display verified contact channels
3. General-message form, if approved
4. Expected response method or service hours, if verified
5. Privacy notice
6. Link to Request for procurement needs

### 11.10 Request page

1. Explain what can be submitted
2. State supported file and information expectations
3. Offer entry modes: invoice upload, material-list upload, or written inquiry
4. Collect the minimum information required for a useful first response
5. Show privacy and consent information
6. Confirm what happens after submission
7. Provide an accessible failure and fallback route

The page must not imply an instant quotation. It should explain that requirements are reviewed before a meaningful proposal.

### 11.11 Track page

Track is a secure, account-independent utility in Phase 1, not a customer portal.

It may expose only approved information after verification of a request identifier and an approved second factor such as the submitted phone or email. It must never reveal confidential commercial data through a guessable code.

Potential status labels remain `TBD` until operations, privacy, and implementation owners approve them. Do not fabricate progress data or expose an empty tracking experience. If tracking is not operational at launch, remove the public route and label rather than displaying a nonfunctional interface.

---

## 12. Procurement Process Information Model

The website should consistently describe the process using these conceptual stages:

| Stage | User input | Ahan Asa activity | User-facing output |
|---|---|---|---|
| 1. Submit | Invoice, list, drawings, specifications, schedule, contact data | Receive and register the requirement | Submission confirmation |
| 2. Clarify | Answers to missing technical or commercial questions | Normalize scope, quantities, specifications, and priorities | Clarified requirement summary |
| 3. Evaluate | Approved evaluation criteria | Review sourcing options, suppliers, compliance, and commercial terms | Comparable options or reviewed proposal |
| 4. Decide | Client selection or approval | Confirm scope, conditions, documents, and next actions | Approved procurement basis |
| 5. Coordinate | Required approvals and delivery information | Coordinate order, documentation, logistics, and communication within scope | Milestone updates and delivery coordination |
| 6. Close | Receipt, issue, or completion confirmation | Record completion and unresolved items | Completion or issue-resolution record |

The public page may simplify these labels, but it must not omit meaningful decision gates or imply that every request follows an identical path.

---

## 13. Material Taxonomy

### 13.1 Taxonomy role

Material categories support recognition, SEO, technical education, and request context. They are not inventory categories and must not behave like store departments.

### 13.2 Proposed top-level categories

The following structure is provisional until commercial and technical approval:

1. Beams and structural sections
2. Rebar and reinforcement products
3. Steel plates and sheets
4. Tubes and hollow structural sections
5. Steel pipes
6. Profiles, channels, angles, and related sections

The final Persian labels, overlaps, standards, and category slugs must be validated against real procurement scope and keyword research before publication.

### 13.3 Category rules

- One material belongs to one canonical primary category.
- Synonyms may support search and copy but must not create duplicate pages automatically.
- Commercial names, standards, grades, forms, and dimensions are attributes, not top-level navigation by default.
- A mixed request must be submitted through one Request flow rather than multiple category carts.
- Do not create thin pages for every grade, dimension, or city.
- Do not create supplier-brand pages without an approved relationship and clear user value.

### 13.4 Suggested category attributes

- Persian name
- English/technical name
- Canonical slug
- Common synonyms
- Common forms and standards
- Typical purchase contexts
- Required specification fields
- Required documents
- Common risks
- Related services
- Related guides
- Publication and verification status

---

## 14. Guide Taxonomy

### 14.1 Primary topics

- Preparing a procurement request
- Specifications and quantity clarity
- Supplier and quotation evaluation
- Commercial terms and total-cost considerations
- Quality documentation and compliance
- Logistics, delivery, and timing
- Common purchasing risks and mistakes
- Material-category buying guides

### 14.2 Content types

- Guide
- Checklist
- Comparison
- Explainer
- FAQ collection
- Downloadable template, only when a real useful asset exists

### 14.3 Taxonomy constraints

- Use a small, stable set of user-facing topics.
- Do not expose author, audience, format, and technical tags as separate navigation systems unless they improve findability.
- Avoid tag pages with one item.
- Every guide requires one primary topic and may have limited secondary relationships.
- Archive organization must reflect user decisions, not internal department names.

---

## 15. Labeling System

### 15.1 Label principles

- Use plain Persian understood by professional buyers.
- Prefer task labels over internal business terminology.
- Keep primary navigation labels short.
- Use one term consistently for the same concept.
- Explain specialist terms at first use.
- Avoid inflated claims and promotional labels.
- Use correct نیم‌فاصله, Persian punctuation, and true RTL text.

### 15.2 Approved working labels

| Concept | Preferred Persian label | Avoid |
|---|---|---|
| Process | فرآیند همکاری | روند جادویی خرید, سازوکار اختصاصی |
| Services | خدمات | راهکارهای بی‌رقیب |
| Material categories | گروه‌های کالایی | فروشگاه, محصولات موجود |
| Knowledge hub | راهنماهای خرید | بلاگ, اخبار روز آهن unless content truly matches |
| Primary conversion | ارسال فاکتور یا لیست خرید | خرید فوری, دریافت ارزان‌ترین قیمت |
| General inquiry | تماس با ما | شروع معامله |
| Existing inquiry | پیگیری درخواست | پنل مشتری, حساب من |

Final public copy remains subject to `COPY_GUIDELINES.md` and `CTA_STRATEGY.md`.

---

## 16. User Journeys

### 16.1 Ready buyer with an existing invoice

**Entry:** Home, referral, campaign, or direct visit  
**Path:** Hero/quick submission → Request → Confirmation → Human or system handoff  
**Required reassurance:** Accepted inputs, privacy, next step, expected contact method  
**Do not require:** Browsing categories, reading About, or creating an account

### 16.2 Buyer evaluating Ahan Asa

**Entry:** Home or About  
**Path:** Positioning → How It Works → Services → Evidence/FAQ → Request  
**Decision questions:** Scope, accountability, methodology, proof, required inputs

### 16.3 Technical evaluator researching a material

**Entry:** Search → Material category or guide  
**Path:** Category/guide → Related service → Required-information checklist → Request  
**Decision questions:** Specification, documentation, risk, applicability

### 16.4 Procurement manager resolving an objection

**Entry:** Search, FAQ, or sales-shared link  
**Path:** FAQ/guide → How It Works or Services → Contact/Request  
**Decision questions:** Comparison method, price validity, documentation, delivery, privacy

### 16.5 Returning lead

**Entry:** Direct Track link or utility navigation  
**Path:** Track → Secure verification → Approved status/required action → Contact or document completion  
**Fallback:** Verified contact channel if self-service tracking is unavailable

---

## 17. Internal Linking Architecture

### 17.1 Relationship model

```text
Home
├── How It Works
├── Services
│   ├── Related material categories
│   ├── Related guides
│   └── Request
├── Products
│   └── Material category
│       ├── Related services
│       ├── Related guides
│       └── Request
├── Guides
│   └── Guide
│       ├── Related category
│       ├── Related service
│       └── Contextual request
├── About
├── FAQ
├── Contact
└── Request

Utility: Track
```

### 17.2 Required link rules

- Every service context links to at least one related category or guide and to Request.
- Every material category links to related service responsibilities, at least one relevant guide when available, and Request.
- Every guide links to one primary decision destination: a category, service, How It Works, or Request.
- Every FAQ group links to its canonical deeper explanation where one exists.
- About links to How It Works and an appropriate contact or request action.
- Contact clearly routes procurement inquiries to Request.
- Request links to privacy information and explains the next process stage.
- Track links to verified support but does not expose marketing distractions during a status task.

### 17.3 Link quality rules

- Use descriptive Persian anchor text.
- Avoid repeated `بیشتر بدانید` links without context.
- Do not link every keyword occurrence.
- Do not create circular links that offer no new decision value.
- Do not generate related content purely by shared tags; relationships must be curated or governed by explicit rules.

---

## 18. Breadcrumbs and Wayfinding

### 18.1 Breadcrumb requirements

Breadcrumbs are required on:

- Material category pages
- Guide/article pages
- Conditional case-study pages
- Any future service detail page

Breadcrumbs are optional on Home and top-level hubs. They are normally unnecessary on Request, Track, Contact, and short utility pages.

### 18.2 Breadcrumb patterns

```text
صفحه اصلی / گروه‌های کالایی / [نام گروه]
صفحه اصلی / راهنماهای خرید / [عنوان راهنما]
صفحه اصلی / نمونه‌ها / [عنوان مطالعه موردی]
```

### 18.3 Wayfinding rules

- Breadcrumb order and separators must work naturally in RTL.
- Visual order, DOM order, screen-reader order, and structured-data order must agree.
- Page title must match the destination meaning even when navigation uses a shorter label.
- Parent hubs must provide meaningful return paths, not only browser-back dependency.

---

## 19. Search, Filtering, and Sorting

### 19.1 Phase 1 policy

Do not add site-wide search by default. The initial architecture should rely on clear hubs, controlled categories, related links, and concise navigation.

### 19.2 When search becomes justified

Consider search when:

- content volume makes hub scanning inefficient;
- users repeatedly fail to locate known information;
- guides span several stable topics;
- search analytics can be reviewed and maintained;
- Persian normalization, synonyms, نیم‌فاصله, and spelling variants are handled properly.

### 19.3 Filter rules

- Filters refine a current set; they must not replace primary categories.
- Show only filters with meaningful result distribution.
- Preserve selected state in an accessible, shareable manner when appropriate.
- Avoid empty filter combinations.
- Provide a clear reset action.
- Never filter product categories by unverified inventory or price.

---

## 20. Conversion Architecture

### 20.1 CTA hierarchy

| Priority | Action | Typical locations |
|---|---|---|
| Primary | ارسال فاکتور یا لیست خرید | Header, Hero, process end, category/service end, final CTA |
| Secondary | آشنایی با فرآیند خرید | Hero, About, Services, guides |
| Contextual | ارسال درخواست مرتبط با این گروه | Material category pages |
| Support | تماس با ما | About, FAQ, Contact, form fallback |
| Utility | پیگیری درخواست | Header utility, footer, confirmation message |

### 20.2 Entry consistency

All primary CTA instances lead to the same canonical Request flow. Context may be passed as a non-sensitive preselection, but the user must be able to change it.

### 20.3 Request state model

- Entry
- Input and document preparation
- Validation
- Review before submission, if implemented
- Submitting
- Success and next-step explanation
- Recoverable error
- Offline or alternative-contact fallback

The flow must preserve user-entered data after recoverable errors where technically and legally appropriate.

### 20.4 Success state

The confirmation must state:

- that the submission was received;
- what will happen next;
- which contact channel will be used, if known;
- a reference identifier only when genuinely generated and stored;
- how to correct or supplement information;
- how privacy applies to uploaded documents.

Never display a fake reference number, response time, or progress stage.

---

## 21. Content Relationships

### 21.1 Core entities

| Entity | Key relationships |
|---|---|
| Service | Material categories, process stages, guides, FAQs, evidence, request context |
| Material category | Services, specification attributes, guides, FAQs, request context |
| Guide | Primary topic, related category, related service, FAQ, CTA |
| FAQ | Intent group, canonical explanatory page, contact/request action |
| Evidence item | Claim supported, service, category, verification status, permission status |
| Request context | Source page, selected category/service, campaign attribution, documents |

### 21.2 Relationship requirements

- Relationships must be explicit and reusable, not inferred only from free-text keywords.
- Each content item requires a publication status and an evidence/approval state.
- Deleting or unpublishing an item must not create broken related links.
- Related-content modules must degrade gracefully when fewer approved items exist.

---

## 22. SEO and Indexability at the IA Level

### 22.1 Search-intent separation

| Page family | Primary intent |
|---|---|
| Home | Brand and category-level procurement positioning |
| How It Works | Procurement process and methodology |
| Services | Procurement-management capabilities |
| Material category | Category-specific commercial and technical buying intent |
| Guide | Informational question or decision support |
| About | Brand trust and organizational intent |
| FAQ | Practical objections and long-tail questions |
| Request | Conversion and branded transactional intent |
| Track | Private utility; not an organic landing page |

### 22.2 Indexability policy

- Home, How It Works, Services, Products, approved category pages, Guides, approved guide pages, About, FAQ, and Contact are intended to be indexable.
- Request indexability is an SEO decision; it must have unique useful content if indexed.
- Track, success, error, preview, staging, internal search results, and sensitive utility states must be `noindex`.
- Thin, empty, draft, duplicate, or unverified category and guide pages must not be published.
- Future locale URLs must not be exposed until translated content and metadata are complete.

### 22.3 Cannibalization rules

- Do not use Services and Products to target the same primary intent.
- A guide answers a question; a category page supports a procurement decision.
- FAQ summarizes objections; it does not replace comprehensive guides.
- City or supplier pages require distinct real value and approval; they must not be mass-generated.

---

## 23. Localization and Directionality

### 23.1 Phase 1

- Persian is the only public locale.
- Primary routes remain unprefixed unless `ROUTES.md` decides otherwise.
- Core content must be server-rendered or statically available without client-side language hydration.
- Navigation and content order must be authored for RTL.

### 23.2 Future locales

The information model must support future English and Arabic without publishing them prematurely.

- Store route identity separately from display labels.
- Store relationships by stable content ID, not translated title.
- Permit locale-specific slugs only if the routing strategy approves them.
- Do not mix untranslated Persian content into a public LTR locale.
- Locale navigation must preserve the nearest equivalent destination or fall back according to an approved policy.

### 23.3 Mixed-direction content

Phone numbers, emails, URLs, model codes, grades, dimensions, standards, and tracking references require explicit direction handling. Their visual order must remain correct inside Persian paragraphs, tables, forms, and breadcrumbs.

---

## 24. Accessibility and Findability

- Use semantic landmarks for header, navigation, main content, complementary content, and footer.
- Provide a skip link to main content.
- Navigation names exposed to assistive technology must match visible meaning.
- Heading hierarchy must reflect information hierarchy; styling must not determine semantic level.
- Link purpose must be understandable from its text and nearby context.
- Current-page and expanded/collapsed states must be programmatically available.
- Breadcrumbs require a navigation label and ordered-list semantics.
- Forms must group related information and explain errors next to the relevant field.
- Do not hide essential content on mobile.
- Content and navigation must remain usable at `200%` zoom, with keyboard only, and with reduced motion.

---

## 25. Analytics Hooks for IA Validation

The following events should be available to the analytics specification:

- Primary navigation selection
- Utility navigation selection
- Header CTA selection
- Homepage quick-submission start
- How It Works completion or key-stage engagement
- Service-to-request transition
- Category-to-request transition
- Guide-to-decision-page transition
- FAQ expansion and linked next step
- Request start, validation error, upload success/failure, and completion
- Contact-channel selection
- Track attempt, success, failure, and fallback selection
- Internal zero-result search, if search is later added

Do not send uploaded document names, personal data, message content, phone numbers, emails, or confidential project data to analytics.

---

## 26. Content Governance

### 26.1 Ownership

Every published item requires an owner for:

- factual accuracy;
- commercial scope;
- technical review;
- legal/privacy approval where relevant;
- update schedule;
- publication status.

### 26.2 Publication states

Recommended internal states:

- Draft
- In review
- Approved
- Published
- Update required
- Archived

Only `Published` items may appear in public navigation, related-content modules, feeds, and sitemaps.

### 26.3 Evidence states

Evidence-bearing content should also record:

- Verification pending
- Verified internally
- Permission pending
- Approved for public use
- Restricted/redacted
- Expired or withdrawn

### 26.4 Review triggers

Review affected IA and links when:

- a service is added, removed, or renamed;
- a material category changes scope;
- a new locale or market launches;
- tracking or account functionality changes;
- a case study or supplier relationship becomes publishable;
- search data shows repeated navigation failure;
- a legal or privacy requirement changes document handling;
- content volume makes current hubs difficult to scan.

---

## 27. Implementation Rules for Claude Code

Claude Code must:

1. Preserve the distinction between procurement management, services, and material categories.
2. Keep Request reachable from every high-intent page.
3. Use the approved Persian labels or mark alternatives as `TBD`.
4. Keep the global navigation shallow in Phase 1.
5. Implement true RTL DOM and interaction behavior.
6. Generate breadcrumbs only for approved hierarchical page families.
7. Keep related links governed by explicit content relationships.
8. Prevent draft, empty, or unverified pages from appearing in navigation or sitemaps.
9. Treat Track as a secure utility, not a customer portal or SEO landing page.
10. Keep future locales structurally possible but publicly disabled until approved.
11. Preserve the primary information order across responsive layouts.
12. Use verified content only; missing proof must not be replaced with fabricated data.

Claude Code must not:

- convert Products into an e-commerce catalog;
- add cart, checkout, account, marketplace, or price-ticker navigation;
- create deep mega-menus for speculative content;
- auto-generate thin pages for grades, dimensions, cities, suppliers, or keywords;
- invent service scope, material availability, tracking statuses, response times, statistics, clients, suppliers, or cases;
- expose confidential request data in URLs, analytics, metadata, or public tracking responses;
- publish placeholder pages to fill navigation;
- duplicate content between Services, Products, Guides, and FAQ without a canonical purpose.

---

## 28. IA Acceptance Criteria

The architecture is ready for implementation when all of the following are true:

- [ ] A first-time visitor can identify Ahan Asa's role, audience, and primary action from the first screen.
- [ ] Global navigation contains no more than the approved primary destinations and one dominant CTA.
- [ ] The distinction between How It Works, Services, Products, Guides, FAQ, and Request is unambiguous.
- [ ] Every published page has a parent context, a clear purpose, and at least one meaningful next step.
- [ ] No important indexable page is orphaned or more than three meaningful interactions from Home.
- [ ] Ready buyers can reach Request without browsing categories or creating an account.
- [ ] Returning leads can find Track without it competing with acquisition content.
- [ ] Category pages operate as procurement decision pages, not SKU listings.
- [ ] Guides link to relevant decision and conversion destinations without aggressive interruption.
- [ ] Breadcrumbs, current-page states, and mobile navigation work in true RTL.
- [ ] Draft, thin, unverified, duplicate, and sensitive pages are excluded from public navigation and indexing.
- [ ] Evidence modules disappear cleanly when approved evidence is unavailable.
- [ ] Future locale support does not expose incomplete languages.
- [ ] All labels, relationships, routes, and page states are representable in the chosen content/data architecture.
- [ ] Accessibility, responsive, privacy, security, and analytics requirements are reflected in navigation and conversion flows.

---

## 29. Open Decisions

The following decisions remain `TBD` and must not be guessed:

- Final approval and exact contents of `SITEMAP.md`
- Final Persian public labels for service capability groups
- Final material category inventory, Persian names, overlaps, and canonical slugs
- Whether Request is indexable
- Whether public account-independent tracking will launch in Phase 1
- Approved tracking verification method and status vocabulary
- Whether verified evidence supports dedicated case-study routes at launch
- Final privacy and terms route requirements
- Whether Guides require filters or search at launch
- Final regional and multilingual route strategy
- Final contact channels and response expectations
- Final document-upload limits, file types, retention, and privacy behavior

Any implementation depending on these decisions must use a safe disabled state, omit the feature, or remain explicitly marked `TBD`; it must not invent production behavior.

---

## 30. Definition of Done

This document becomes **Approved** when the project owner confirms:

- the information domains and user-task priority;
- the Level 1 navigation and utility navigation;
- the role and hierarchy of each page family;
- the homepage narrative order;
- the service, material, and guide taxonomy direction;
- the Request and Track boundaries;
- the internal-linking and breadcrumb rules;
- the Phase 1 indexability intent;
- an owner and decision path for every remaining `TBD` item.

Until approval, this document is the authoritative working draft for information-architecture decisions. It does not authorize publication of unverified routes, claims, categories, evidence, or tracking functionality.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| IA / UX Approval | TBD | Pending | — |
| Content Approval | TBD | Pending | — |
| Commercial Scope Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |

