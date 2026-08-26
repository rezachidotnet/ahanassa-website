# Ahan Asa Website — Sitemap

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `SITEMAP.md`  
> **Status:** Draft v1.0 — Proposed page inventory and hierarchy  
> **Last updated:** 2026-08-25  
> **Primary website language:** Persian (Farsi), fully RTL  
> **Launch market:** Iran

---

## 1. Purpose

This document defines the authoritative page inventory, hierarchy, navigation placement, publication priority, and indexation intent for the Ahan Asa website.

The sitemap is designed to position Ahan Asa as a premium B2B steel procurement management partner—not as a generic steel retailer, online marketplace, inventory catalog, or live price board.

This document answers:

- Which pages should exist?
- How are the pages grouped?
- Which pages belong in the primary navigation, utility navigation, or footer?
- Which pages are required for launch, conditional on verified content, or deferred?
- Which routes should be indexable?
- Which page families may create dynamic detail pages?
- What must not be published until evidence or operational approval exists?

## 2. Authority and Document Boundaries

This sitemap is the source of truth for page existence and parent–child relationships.

Related documents have separate responsibilities:

| Document | Responsibility |
|---|---|
| `PROJECT_BRIEF.md` | Business goals, audience, positioning, scope, and constraints |
| `INFORMATION_ARCHITECTURE.md` | User mental models, content grouping, findability, and navigation logic |
| `ROUTES.md` | Exact framework routes, locale behavior, redirects, parameters, and route implementation |
| `PAGE_SPECIFICATIONS.md` | Content sections, components, states, and acceptance criteria for each page template |
| `SEO_KEYWORD_MAP.md` | Search intent and keyword ownership by page |
| `SEO_PAGE_MAP.md` | SEO target, metadata intent, and content requirements for every indexable URL |
| `INTERNAL_LINKING.md` | Contextual link rules and page-to-page link obligations |
| `FORM_ARCHITECTURE.md` | Inquiry form fields, validation, upload, integrations, and fallback behavior |
| `LOCALIZATION.md` | Future locale, RTL/LTR, translation, and internationalization rules |

If another document proposes a page not listed here, the page must not be implemented until `SITEMAP.md` is updated or the discrepancy is recorded and approved in `DECISIONS.md`.

## 3. Sitemap Principles

### 3.1 Business-first structure

The hierarchy must explain Ahan Asa in this order:

1. What Ahan Asa manages.
2. How the procurement method works.
3. Which material groups and buyer types it can support.
4. What verified evidence supports the offer.
5. How a qualified buyer can begin an inquiry.

### 3.2 Procurement before products

The website must lead with procurement management and risk control. Product or material pages support that position; they must not turn the website into a commodity catalog.

### 3.3 Evidence before volume

The site should launch with fewer strong pages rather than many thin pages. Projects, case studies, testimonials, statistics, supplier logos, quantities, and outcomes may be published only when verified and approved.

### 3.4 One clear intent per indexable page

Every indexable page must own a distinct user need and search intent. Pages with substantial intent overlap must be consolidated rather than published as competing pages.

### 3.5 Qualified conversion paths

Every commercial page must provide a logical route to the primary conversion page without turning every section into an aggressive sales prompt.

### 3.6 Persian-first, expansion-ready

Phase 1 uses Persian at unprefixed routes. The hierarchy must remain compatible with future `/en`, `/ar`, or other locale namespaces, but unsupported locales must not be published as placeholders.

### 3.7 No empty hubs

A hub page must not be published merely to preserve a navigation label. It must have a useful introduction, clear child-page or content relationships, and a next action. If its dependent content is not ready, either provide a complete standalone hub or keep the family unpublished.

## 4. Publication Status Labels

| Status | Meaning | Implementation rule |
|---|---|---|
| **Launch Core** | Required for the initial credible website | Must be complete, approved, tested, and linked at launch |
| **Launch Conditional** | Valuable for launch but dependent on verified content, operational scope, or evidence | Publish only after its release gate is satisfied |
| **Post-Launch** | Approved future expansion | Do not create production placeholders or include in public navigation |
| **System** | Technical or transaction-support page | Publish only as required; usually `noindex` |
| **Excluded** | Outside the approved Phase 1 product | Do not implement without scope approval |

## 5. Recommended Public Hierarchy

```text
/
├── procurement
│   ├── requirements-and-specifications
│   ├── sourcing-and-supplier-evaluation
│   ├── quotation-comparison
│   ├── documentation-and-quality-control
│   └── logistics-and-delivery
├── process
├── materials
│   ├── structural-sections
│   ├── rebar-and-wire
│   ├── plates-sheets-and-coils
│   ├── hollow-sections
│   ├── pipes-and-tubes
│   └── custom-and-fabricated-steel
├── industries
│   ├── construction-and-development
│   ├── industrial-and-manufacturing
│   ├── epc-and-infrastructure
│   └── steel-fabrication
├── projects
│   └── [project-slug]
├── insights
│   └── [article-slug]
├── resources
│   └── [resource-slug]
├── about
├── faq
├── contact
├── request-consultation
│   └── thank-you
├── privacy
├── terms-of-use
└── system pages
    ├── not-found
    ├── error
    └── maintenance
```

The hierarchy above is the target architecture. Not every child route is approved for Day 1 publication. The release status and evidence gates below determine what becomes public.

## 6. Global Navigation

### 6.1 Primary header navigation

Recommended desktop order in the Persian RTL interface:

| Order | Persian label | Destination | Behavior |
|---:|---|---|---|
| 1 | مدیریت تأمین | `/procurement` | May open a compact mega menu containing the five approved capability pages |
| 2 | گروه‌های کالایی | `/materials` | May open a structured category menu only when child pages are published |
| 3 | فرایند همکاری | `/process` | Direct link |
| 4 | صنایع | `/industries` | Direct link at launch; child menu only when industry pages are published |
| 5 | پروژه‌ها | `/projects` | Show only when the evidence release gate is satisfied |
| 6 | دانش و منابع | `/insights` | May group Insights and Resources without merging their routes |
| 7 | درباره آهن آسا | `/about` | Direct link |

### 6.2 Header actions

| Role | Persian label | Destination | Rule |
|---|---|---|---|
| Primary CTA | درخواست مشاوره تأمین | `/request-consultation` | Visually prominent but proportionate |
| Secondary contact | تماس با ما | `/contact` | May appear as a text link or utility item |
| Mobile CTA | درخواست مشاوره | `/request-consultation` | Must remain reachable without obstructing content |

Exact Persian copy remains subject to `CTA_STRATEGY.md` and `COPY_GUIDELINES.md`.

### 6.3 Utility navigation

Utility navigation may contain:

- phone or approved direct-contact channel;
- email, when verified;
- contact page;
- future language selector only after another locale is complete;
- accessibility-relevant controls when justified.

Do not show an inactive language selector, customer login, supplier login, cart, live price ticker, or search control at Phase 1 launch.

### 6.4 Footer navigation

The footer should expose the complete approved information architecture in compact groups:

1. **Procurement** — hub, five capability pages, process.
2. **Materials** — materials hub and published category pages.
3. **Evidence and knowledge** — projects, insights, resources, FAQ.
4. **Company** — about, contact, consultation.
5. **Legal** — privacy and terms of use.

Unpublished conditional pages must not appear in the footer.

## 7. Master Page Inventory

### 7.1 Core and commercial pages

| ID | Page | Route | Parent | Status | Header | Indexation |
|---|---|---|---|---|---|---|
| `HOME-001` | Homepage | `/` | — | Launch Core | Logo/home | Index |
| `PROC-000` | Procurement Management Hub | `/procurement` | Home | Launch Core | Primary | Index |
| `PROC-010` | Requirements and Specifications | `/procurement/requirements-and-specifications` | Procurement | Launch Core | Procurement menu | Index |
| `PROC-020` | Sourcing and Supplier Evaluation | `/procurement/sourcing-and-supplier-evaluation` | Procurement | Launch Core | Procurement menu | Index |
| `PROC-030` | Quotation Comparison | `/procurement/quotation-comparison` | Procurement | Launch Core | Procurement menu | Index |
| `PROC-040` | Documentation and Quality Control | `/procurement/documentation-and-quality-control` | Procurement | Launch Core | Procurement menu | Index |
| `PROC-050` | Logistics and Delivery Coordination | `/procurement/logistics-and-delivery` | Procurement | Launch Core | Procurement menu | Index |
| `PROC-060` | Procurement Process | `/process` | Home | Launch Core | Primary | Index |
| `MAT-000` | Material Groups Hub | `/materials` | Home | Launch Core | Primary | Index |
| `IND-000` | Industries and Buyer Types Hub | `/industries` | Home | Launch Core | Primary | Index |
| `ABOUT-001` | About Ahan Asa | `/about` | Home | Launch Core | Primary | Index |
| `FAQ-001` | Frequently Asked Questions | `/faq` | Home | Launch Core | Footer/contextual | Index |
| `CONTACT-001` | Contact | `/contact` | Home | Launch Core | Utility/footer | Index |
| `RFQ-001` | Request a Procurement Consultation | `/request-consultation` | Home | Launch Core | Primary CTA | Index |

### 7.2 Material pages

| ID | Page | Route | Parent | Status | Publication gate | Indexation |
|---|---|---|---|---|---|---|
| `MAT-010` | Structural Sections | `/materials/structural-sections` | Materials | Launch Conditional | Confirm supplied profiles, standards, sourcing scope, and content ownership | Index when published |
| `MAT-020` | Rebar and Wire Products | `/materials/rebar-and-wire` | Materials | Launch Conditional | Confirm categories, standards, and procurement capability | Index when published |
| `MAT-030` | Plates, Sheets, and Coils | `/materials/plates-sheets-and-coils` | Materials | Launch Conditional | Confirm grades, forms, and actual sourcing scope | Index when published |
| `MAT-040` | Hollow Structural Sections | `/materials/hollow-sections` | Materials | Launch Conditional | Confirm sections, tolerances, and commercial workflow | Index when published |
| `MAT-050` | Pipes and Tubes | `/materials/pipes-and-tubes` | Materials | Launch Conditional | Confirm industrial/building scope and applicable standards | Index when published |
| `MAT-060` | Custom and Fabricated Steel | `/materials/custom-and-fabricated-steel` | Materials | Launch Conditional | Confirm whether Ahan Asa manages fabrication or only procurement | Index when published |

Material child pages must explain procurement considerations, specification inputs, supplier evaluation, documentation, delivery planning, and inquiry requirements. They must not be thin product listings or unverified stock pages.

### 7.3 Industry pages

| ID | Page | Route | Parent | Status | Publication gate | Indexation |
|---|---|---|---|---|---|---|
| `IND-010` | Construction and Development | `/industries/construction-and-development` | Industries | Post-Launch | Unique audience needs, workflow, and verified examples | Index when published |
| `IND-020` | Industrial and Manufacturing | `/industries/industrial-and-manufacturing` | Industries | Post-Launch | Unique material and documentation requirements | Index when published |
| `IND-030` | EPC and Infrastructure | `/industries/epc-and-infrastructure` | Industries | Post-Launch | Confirmed EPC support scope and evidence | Index when published |
| `IND-040` | Steel Fabrication | `/industries/steel-fabrication` | Industries | Post-Launch | Clear distinction between fabricator needs and other buyers | Index when published |

The Phase 1 Industries hub may serve all four audiences on one complete page. Individual pages should be added only when each can provide distinct, useful content rather than changing the audience name on a shared template.

### 7.4 Evidence pages

| ID | Page family | Route | Parent | Status | Publication gate | Indexation |
|---|---|---|---|---|---|---|
| `PROJ-000` | Projects / Procurement Evidence Hub | `/projects` | Home | Launch Conditional | At least enough verified evidence to make the hub useful; no empty gallery | Index when published |
| `PROJ-100` | Project / Case Study Detail | `/projects/[project-slug]` | Projects | Launch Conditional | Verified client permission, scope, facts, media, and outcomes | Index per approved item |

If named projects cannot be published, do not fabricate anonymous case studies. A process-based evidence section may remain inside the Procurement or About pages until real case material is approved.

### 7.5 Knowledge and resource pages

| ID | Page family | Route | Parent | Status | Publication gate | Indexation |
|---|---|---|---|---|---|---|
| `INS-000` | Insights Hub | `/insights` | Home | Launch Conditional | Minimum useful set of approved articles; no empty content hub | Index when published |
| `INS-100` | Insight Article | `/insights/[article-slug]` | Insights | Launch Conditional | Original, reviewed, search-intent-aligned content | Index per approved item |
| `RES-000` | Resources Hub | `/resources` | Home | Launch Conditional | At least one genuinely useful approved resource plus hub context | Index when published |
| `RES-100` | Resource Detail | `/resources/[resource-slug]` | Resources | Launch Conditional | Real file/resource, clear summary, ownership, version, and access rule | Index per approved item |

Insights and Resources are related but not interchangeable:

- **Insights** contain editorial or educational articles.
- **Resources** contain durable tools, guides, checklists, specifications, templates, or downloadable documents.

Do not create tag, author, date archive, or category URLs as indexable pages during Phase 1 unless an SEO and content-volume case is approved.

### 7.6 Legal and system pages

| ID | Page | Route | Status | Navigation | Indexation |
|---|---|---|---|---|---|
| `LEGAL-010` | Privacy Notice | `/privacy` | Launch Core | Footer/form links | Index |
| `LEGAL-020` | Terms of Use | `/terms-of-use` | Launch Core | Footer | Index |
| `SYS-010` | Consultation Confirmation | `/request-consultation/thank-you` | System | Form redirect only | Noindex |
| `SYS-020` | Not Found | Framework 404 | System | None | Noindex |
| `SYS-030` | Unexpected Error | Framework error boundary | System | None | Noindex |
| `SYS-040` | Maintenance | `/maintenance` or platform-level response | System | None | Noindex |

The legal text must be reviewed for the actual business, data collection, document upload, cookies, analytics, and jurisdiction before launch.

## 8. Page-Family Intent

### 8.1 Homepage

The homepage is an executive summary, not a compressed version of every page. It should establish:

- Ahan Asa as a steel procurement management partner;
- the promise of protecting project capital;
- the difference between managed procurement and basic product selling;
- the core capability pillars;
- the procurement process at a glance;
- approved material and customer scope;
- verified evidence, when available;
- a qualified consultation path.

The homepage must not be dominated by prices, product grids, counters, supplier-logo walls, or unsupported inventory claims.

### 8.2 Procurement hub

The procurement hub owns the broad question: “What does Ahan Asa manage in a steel purchase?” It introduces the five capability stages and routes visitors to the relevant detail page or consultation.

The hub must not duplicate every detail-page section verbatim.

### 8.3 Procurement capability pages

Each capability page owns one stage of the procurement decision:

| Page | Primary user question |
|---|---|
| Requirements and Specifications | How do we define exactly what must be purchased? |
| Sourcing and Supplier Evaluation | How are suitable suppliers and supply options assessed? |
| Quotation Comparison | How are quotations compared beyond headline unit price? |
| Documentation and Quality Control | Which documents, approvals, and checks reduce specification risk? |
| Logistics and Delivery | How are timing, loading, documentation, and delivery milestones coordinated? |

These pages describe an approved method and scope. They must not imply laboratory, inspection, transport, customs, warehousing, financing, or contractual responsibilities that Ahan Asa does not actually provide.

### 8.4 Process page

The Process page owns the sequential customer journey from initial information to approved purchasing and delivery follow-through. It should clarify inputs, decisions, responsibilities, handoffs, and expected outputs at each stage.

This page is not a duplicate of the Procurement hub: the hub explains capabilities; the Process page explains order and collaboration.

### 8.5 Materials hub

The Materials hub explains which broad steel groups Ahan Asa may support and what information is needed to procure them responsibly. It must include a scope disclaimer when a category is conditional or project-dependent.

The hub must never imply that all listed products are in stock or supplied directly from Ahan Asa-owned inventory.

### 8.6 Industries hub

The Industries hub helps visitors recognize whether Ahan Asa understands their purchasing environment. It should explain differences in decision criteria across contractors, developers, industrial companies, EPC teams, and steel fabricators without inventing sector experience.

### 8.7 Projects and case studies

Project pages exist to provide evidence, not decoration. A valid case study should clearly distinguish:

- client and project context, where permission exists;
- procurement challenge;
- confirmed scope of Ahan Asa;
- material or package involved;
- decision or control method;
- verified quantities, timing, and outcomes, when approved;
- exclusions and limits where needed;
- authentic media or redacted documents.

### 8.8 Insights

Insight pages should answer real commercial or technical procurement questions. Initial topic clusters may include requirement definition, quotation comparison, supplier assessment, documentation, delivery planning, total procurement cost, and category-specific buying guidance.

Content must be original, reviewed, dated, and updated when facts or standards change.

### 8.9 Resources

Every resource needs a detail page that explains what the item is, who it is for, what it contains, its revision status, and how it should be used. A bare PDF link is not a complete resource architecture.

Access may be public or lead-assisted according to `FORM_ARCHITECTURE.md`, but the page must not promise a download that depends on an unreliable or undefined integration.

### 8.10 About

The About page should establish the brand purpose, operating principles, experience, governance, and real team or company facts. It must not invent a founding date, offices, facilities, staff size, group structure, certifications, or market coverage.

### 8.11 FAQ

The FAQ page should consolidate recurring pre-inquiry questions about fit, required information, sourcing scope, quotations, standards, documentation, delivery, fees, timing, confidentiality, and project acceptance.

It must not become a substitute for missing capability content.

### 8.12 Contact and consultation

The Contact page provides verified communication channels and basic company/contact information. The Consultation page qualifies a project need and is the primary conversion destination.

These pages must remain separate:

- Contact is for general communication.
- Consultation is for structured procurement inquiries.

## 9. Launch Release Plan

### 9.1 Minimum credible launch

The minimum credible launch contains these 16 public routes:

1. `/`
2. `/procurement`
3. `/procurement/requirements-and-specifications`
4. `/procurement/sourcing-and-supplier-evaluation`
5. `/procurement/quotation-comparison`
6. `/procurement/documentation-and-quality-control`
7. `/procurement/logistics-and-delivery`
8. `/process`
9. `/materials`
10. `/industries`
11. `/about`
12. `/faq`
13. `/contact`
14. `/request-consultation`
15. `/privacy`
16. `/terms-of-use`

It also contains the required non-indexable confirmation, 404, and error states.

### 9.2 Preferred enriched launch

Add the following only when their gates are satisfied:

- verified material category pages;
- Projects hub plus approved project detail pages;
- Insights hub plus an initial set of substantive articles;
- Resources hub plus approved tools or documents.

### 9.3 Post-launch expansion sequence

Recommended order:

1. Publish verified projects and evidence.
2. Expand high-value material category pages according to actual procurement scope and keyword research.
3. Build insight clusters that support commercial pages.
4. Publish reusable procurement resources.
5. Add industry detail pages only after unique evidence and content exist.
6. Add supported locales only after complete content, operations, and localization QA are available.

## 10. URL and Route Policy

The final framework implementation belongs in `ROUTES.md`, but the sitemap establishes these constraints:

- Use lowercase ASCII slugs.
- Use words separated by hyphens.
- Use stable descriptive nouns rather than campaign slogans.
- Do not expose file extensions in public page routes.
- Do not use dates in evergreen article URLs.
- Do not create duplicate `/services` and `/procurement` families for the same intent.
- Do not create duplicate singular and plural routes.
- Persian Phase 1 pages use unprefixed routes.
- Do not expose `/fa` as an alternative live copy of the Persian site.
- Future locale versions should use a consistent locale prefix such as `/en/...` or `/ar/...`.
- The implementation should use a consistent no-trailing-slash canonical policy unless the technical architecture approves otherwise.
- Changing an approved public route requires a redirect entry and an update to all affected documents.

### 10.1 Dynamic slugs

Dynamic content families are limited to:

- `/projects/[project-slug]`
- `/insights/[article-slug]`
- `/resources/[resource-slug]`

Slugs must be unique within their family, human-readable, immutable after publication where practical, and stored as controlled content—not generated differently on each build.

## 11. Indexation Policy

### 11.1 Indexable by default

- complete commercial pages;
- approved material pages;
- approved industry pages;
- verified case studies;
- substantive insight articles;
- complete resource detail pages;
- About, FAQ, Contact, Privacy, and Terms pages.

### 11.2 Noindex by default

- form confirmation pages;
- internal search results if introduced later;
- filtered, sorted, or parameterized listing states;
- preview and draft routes;
- staging environments;
- error, maintenance, and utility pages;
- duplicate print views;
- incomplete locale variants;
- internal campaign variants that duplicate a canonical page.

### 11.3 Sitemap XML inclusion

Only canonical, indexable, production URLs returning a successful response may enter the XML sitemap. Conditional, draft, redirected, `noindex`, error, and parameterized URLs must be excluded.

The XML sitemap policy itself belongs in `SITEMAP_ROBOTS_SPEC.md`; this file concerns the human-facing page architecture.

## 12. Listing, Filtering, and Pagination

At initial launch:

- Projects, Insights, and Resources may use client-visible filters only if content volume justifies them.
- Filter combinations must not create uncontrolled indexable URLs.
- Search, filters, sorting, and pagination must preserve keyboard and screen-reader usability.
- Empty filter states must provide recovery paths.
- Pagination should be introduced only when a listing cannot remain usable as a single page.
- Infinite scroll must not be the only way to access content.

Default taxonomy archive pages should not be created merely because a CMS supports them.

## 13. Internal Relationship Requirements

The following connections are mandatory even before `INTERNAL_LINKING.md` defines anchor-level rules:

| Source family | Must link to |
|---|---|
| Homepage | Procurement, Process, Materials, About/evidence, and Consultation |
| Procurement hub | All published capability pages, Process, relevant evidence, and Consultation |
| Capability page | Procurement hub, adjacent capability stage, relevant material/evidence, and Consultation |
| Process | Relevant capability pages, FAQ, and Consultation |
| Materials hub | Published material pages, procurement method, and Consultation |
| Material page | Materials hub, relevant procurement capabilities, relevant insights/projects, and Consultation |
| Industries hub/page | Relevant materials, capabilities, projects, and Consultation |
| Project detail | Relevant capability, material, and industry pages |
| Insight article | Relevant commercial parent page and related articles/resources |
| Resource detail | Relevant capability/material page and related insights |
| FAQ | Relevant explanatory pages and Consultation |
| About | Procurement, evidence, and Contact/Consultation |

Breadcrumbs are recommended for all detail pages below the first level. Homepage, Contact, Consultation, and legal pages do not require visible breadcrumbs unless `PAGE_SPECIFICATIONS.md` identifies a usability need.

## 14. Content and Evidence Gates

Claude Code must treat the following as publication blockers, not invitations to invent content:

### 14.1 Material-page gate

Before publishing a material child page, confirm:

- the category is genuinely supported;
- procurement scope and responsibility are clear;
- applicable specifications or standards are reviewed;
- inquiry requirements are known;
- no stock, price, agency, or supply claim is implied without evidence;
- the page has unique value beyond the parent hub.

### 14.2 Project-page gate

Before publishing a project detail page, confirm:

- project identity or approved anonymization;
- permission to use names, logos, documents, and imagery;
- Ahan Asa’s exact role;
- verified quantities, dates, locations, and results;
- removal or redaction of confidential information;
- approved statements and exclusions.

### 14.3 Insight-page gate

Before publishing an insight article, confirm:

- a distinct user question and search intent;
- qualified authorship or technical review;
- source accuracy where standards or market facts are discussed;
- publication and revision dates;
- meaningful links to relevant commercial pages;
- no unsupported price forecast or commercial guarantee.

### 14.4 Resource-page gate

Before publishing a resource, confirm:

- file ownership and usage rights;
- accurate title, version, and description;
- working download or access behavior;
- privacy and lead-capture requirements;
- secure handling of uploaded or generated documents;
- an assigned content owner for updates.

## 15. Future Localization Structure

No secondary language is approved for Phase 1. When a locale is approved:

```text
Persian default: /
English future: /en
Arabic future:  /ar
```

Future localization must satisfy all of the following:

- complete translations for the selected launch scope;
- localized navigation, metadata, structured data, forms, validation, and legal text;
- correct RTL/LTR behavior;
- correct canonical and hreflang relationships;
- no automatic redirection based only on IP or browser language;
- no translation of unsupported market coverage into an operational claim;
- locale-specific inquiry routing and response capability.

If a route is unavailable in a locale, do not publish a blank, machine-translated, or fallback-language copy under that locale path.

## 16. Explicitly Excluded Page Families

The following pages are outside Phase 1 and must not be implemented without approved scope expansion:

- shopping cart;
- checkout or online payment;
- public user account;
- customer portal;
- supplier portal;
- supplier marketplace;
- product inventory pages;
- stock availability pages;
- live steel price board;
- price forecast dashboard;
- automated quotation generator;
- order tracking portal;
- public document repository without ownership and access rules;
- careers hub without active hiring and approved content;
- investor relations;
- press newsroom without real publications;
- office/location pages for unverified branches;
- certification pages without valid certificates;
- partner or supplier directories that imply unapproved relationships;
- duplicate SEO landing pages created only by changing a city or keyword.

## 17. Claude Code Implementation Rules

Claude Code must:

1. Implement only approved routes from this document.
2. Keep Persian content at the unprefixed root for Phase 1.
3. Use centralized navigation data rather than duplicating header and footer link lists.
4. Exclude unpublished conditional pages from navigation, generated sitemaps, feeds, and internal links.
5. Return a genuine 404 for unknown or unpublished dynamic slugs.
6. Prevent draft content from being statically generated in production.
7. Apply the approved canonical and indexation policy to every route.
8. Preserve logical breadcrumbs and parent relationships.
9. Keep all public routes reachable through internal links; do not create orphan pages.
10. Use real content states rather than fake cards, mock projects, or placeholder articles.
11. Record every route addition, removal, rename, consolidation, or hierarchy change in `CHANGELOG.md` and, when strategic, `DECISIONS.md`.
12. Escalate conflicts between this sitemap and `PROJECT_BRIEF.md` rather than silently choosing one.

Claude Code must not:

- publish all planned routes automatically;
- invent material categories, industries, projects, articles, resources, locations, or languages;
- create empty listing pages;
- generate a page per city, supplier, grade, standard, or product attribute without approved SEO and content mapping;
- expose preview, draft, or thank-you pages to search engines;
- add a `/fa` duplicate of the Persian root;
- add e-commerce or live-price behavior to product pages;
- rename stable routes for aesthetic reasons after publication;
- make hidden pages accessible only through hard-coded URLs while omitting them from the controlled content model.

## 18. Sitemap QA Checklist

Before launch, verify:

- [ ] Every public page exists in the approved inventory.
- [ ] Every Launch Core page contains final or approved content.
- [ ] Conditional pages are published only after their gates are satisfied.
- [ ] Unpublished routes return 404 and are absent from navigation and XML sitemap output.
- [ ] Header, mobile menu, footer, breadcrumbs, and contextual links use the same route source.
- [ ] No public page is orphaned.
- [ ] No two indexable pages own the same primary intent without an approved distinction.
- [ ] All routes use lowercase, stable, hyphenated ASCII slugs.
- [ ] Persian pages are unprefixed and no duplicate `/fa` pages exist.
- [ ] Canonicals resolve to the preferred production URL.
- [ ] Redirected, `noindex`, draft, error, and parameterized URLs are absent from the XML sitemap.
- [ ] Dynamic slugs return a true 404 when content is missing or unpublished.
- [ ] Projects and claims contain verified evidence.
- [ ] Material pages do not imply owned inventory, guaranteed availability, or live pricing.
- [ ] The consultation form and confirmation flow work on mobile and desktop.
- [ ] Legal pages reflect actual data collection and contact behavior.
- [ ] Navigation remains usable with keyboard, screen reader, zoom, long Persian labels, and reduced motion.
- [ ] Future locale controls are hidden until a complete locale is approved.
- [ ] Route changes are reflected in `ROUTES.md`, SEO maps, internal-link rules, and redirect records.

## 19. Open Decisions

The following decisions remain explicitly unresolved and must not be guessed:

| Decision | Current state | Required owner/document |
|---|---|---|
| Final public Persian labels for navigation and CTAs | Proposed labels only | `COPY_GUIDELINES.md` and `CTA_STRATEGY.md` |
| Exact material groups supported at launch | Conditional | Business owner + `CONTENT_MODEL.md` |
| Whether Projects can launch publicly | Pending verified evidence | Project owner + legal/content approval |
| Minimum initial Insight article set | Pending content strategy | `CONTENT_STRATEGY.md` |
| Initial downloadable resources | Pending asset inventory and rights | `MEDIA_GUIDELINES.md` / content owner |
| Whether secure document upload is available at launch | Pending technical and privacy approval | `FORM_ARCHITECTURE.md` |
| Exact legal entity name, address, and contact details | Pending verification | Legal/business owner |
| Secondary locales and launch order | Not approved | `LOCALIZATION.md` |
| Final trailing-slash and redirect implementation | Pending | `ROUTES.md` |
| Whether a combined “Knowledge and Resources” landing page is needed | Not required in current hierarchy | `INFORMATION_ARCHITECTURE.md` |
| Search functionality | Deferred | Future content-volume review |

## 20. Definition of Done

`SITEMAP.md` becomes **Approved** when the project owner confirms:

- the top-level hierarchy;
- the Launch Core page set;
- the five procurement capability pages;
- the material and industry taxonomy direction;
- the publication gates for projects, insights, and resources;
- the primary navigation and footer groups;
- the Persian-default route strategy;
- the excluded page families;
- an owner and decision path for every remaining open item.

Until approval, Claude Code may use this document for planning and scaffolding only. It must not publish conditional pages, invent production content, or treat proposed navigation copy as final.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Business/Procurement Approval | TBD | Pending | — |
| Content/SEO Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
