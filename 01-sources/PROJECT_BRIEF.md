# Ahan Asa Digital Procurement Platform — Project Brief

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `https://www.ahanassa.com`  
> **ERP:** `https://odoo.ahanassa.com`  
> **Document:** `PROJECT_BRIEF.md`  
> **Status:** Draft v2.0 — Foundational source of truth  
> **Last updated:** 2026-08-25  
> **Launch language:** Persian (Farsi), fully RTL  
> **Initial market:** Iran

---

## 1. Executive Summary

Ahan Asa is a premium B2B steel procurement management brand. It helps serious project buyers define requirements, compare supply options, control commercial and technical risk, and coordinate purchasing and delivery. The approved promise is:

> **ما مراقب سرمایه شما هستیم.**  
> **We protect your capital.**

`ahanassa.com` will not be a brochure-only website. It will be the fast, search-visible, customer-facing layer of a broader digital procurement system that includes:

- a premium public website;
- a structured steel catalog and selected public price information;
- a multi-item request-for-quotation experience;
- secure material-list and document uploads;
- an operator-managed website CMS;
- asynchronous integration with Odoo ERP at `odoo.ahanassa.com`;
- a resilient Cloudflare data, storage, queue, security, and delivery layer.

The governing architecture is:

```text
Visitor / Search Engine
          │
          ▼
  Cloudflare Edge
          │
          ▼
 Next.js Application
     │      │      │
     │      │      └── Turnstile / security controls
     │      └───────── R2 media and private attachments
     └──────────────── D1 website data and public read models
                         │
                         ▼
                  Cloudflare Queues
                         │
                         ▼
               Odoo Integration Layer
                         │
                         ▼
              odoo.ahanassa.com
```

Four principles govern all later decisions:

1. **Odoo is the commercial system of record.**
2. **Cloudflare is the fast and resilient website platform.**
3. **Public page rendering and RFQ acceptance must not depend on a live Odoo response.**
4. **SEO, performance, accessibility, security, and observability are architectural constraints from the first implementation—not post-launch cleanup.**

---

## 2. Project Definition

The project is a Persian-first digital procurement platform for steel products and project purchasing services. It combines content, catalog discovery, approved public price snapshots, lead qualification, structured RFQ capture, and ERP-enabled sales operations.

The public experience must present Ahan Asa as a controlled procurement partner—not as:

- a generic iron retailer;
- a consumer e-commerce shop;
- an open supplier marketplace;
- a commodity-trading terminal;
- a price-only lead generator;
- a source of unverified live prices, inventory, or delivery promises.

Price and product discovery support the procurement journey; they do not replace technical review, commercial validation, or a formal quotation.

---

## 3. Brand Foundation

### 3.1 Identity

- English name: **Ahan Asa**
- Persian name: **آهن آسا**
- Primary public domain: **`www.ahanassa.com`**
- Brand category: **Steel procurement management and project purchasing support**
- Primary slogan: **ما مراقب سرمایه شما هستیم.**
- Meaning-aligned English line: **We protect your capital.**

The Persian slogan is the primary public-facing version for the launch website.

### 3.2 Approved visual foundation

- Steel Navy: `#0B2545`
- Forge Copper: `#B04A2F`
- White: `#FFFFFF`
- The approved master icon must be used without changing its core geometry.
- Persian typography must feel modern, clear, engineered, and corporate, in the direction established for Estedad.

Detailed visual rules belong in `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, and `DESIGN_SYSTEM.md`.

### 3.3 Desired perception

The experience should feel precise, trustworthy, protective, commercially disciplined, technically informed, calm, premium, practical, fast, and operationally credible.

---

## 4. Business Context and Opportunity

Steel procurement is not only a price-comparison exercise. A professional buyer must control specifications, standards, quantities, units, supplier suitability, market timing, documentation, logistics, delivery coordination, and the financial impact of errors or delay.

Many competing websites reduce the buyer experience to crowded product tables, telephone numbers, and daily-price claims. Ahan Asa should occupy a higher-value position: a procurement manager that makes the buying process more structured, traceable, and commercially responsible.

The platform must communicate three forms of credibility:

1. **Commercial credibility** — disciplined sourcing, comparison, negotiation support, and purchasing control.
2. **Technical credibility** — correct interpretation of grades, sizes, variants, units, quantities, standards, and project requirements.
3. **Operational credibility** — accountable handling of RFQs, documents, customer records, quotations, suppliers, logistics, and delivery follow-through.

The website creates demand and captures structured intent. Odoo converts that intent into managed CRM, quotation, sales, purchasing, and operational workflows.

---

## 5. Vision

Create the most credible, composed, and useful digital procurement experience in the Iranian steel market: a platform that helps a serious buyer move from uncertainty to a well-defined request, while giving the Ahan Asa team reliable data to manage the commercial process in Odoo.

The public site should feel closer to a premium procurement consultancy and industrial operating partner than to a crowded commodity marketplace.

---

## 6. Primary Objectives

### 6.1 Business objectives

- Establish Ahan Asa as a differentiated B2B steel procurement management brand.
- Generate qualified inquiries from real projects, purchasing teams, contractors, and industrial buyers.
- Convert unstructured buying requests into accurate, actionable RFQs.
- Reduce duplicated manual entry by connecting website demand to Odoo CRM and sales workflows.
- Maintain one authoritative source for commercial customer, product, unit, and price data.
- Enable operators to publish articles and maintain approved website content without code changes.
- Support controlled product and price visibility without becoming a price-board brand.
- Build a scalable foundation for Iran first and later regional expansion.

### 6.2 User objectives

- Understand within seconds what Ahan Asa does and who it serves.
- Find a relevant steel category, product, size, variant, unit, or buying guide.
- View an approved, timestamped public price where available.
- Understand that a displayed price is informational until confirmed by quotation.
- Submit one or many requested items without unnecessary friction.
- Upload an existing Excel, PDF, or image material list.
- Add an uncatalogued item when the required product is not in the catalog.
- Receive immediate confirmation and a durable RFQ reference number.
- Trust that temporary Odoo unavailability will not lose the request.

### 6.3 Operational objectives

- Give operators a controlled environment for content, media, SEO, permitted catalog presentation, RFQ visibility, and integration monitoring.
- Give sales teams customer, campaign, RFQ, attachment, and line-item context inside Odoo.
- Prevent duplicate customer, lead, or RFQ creation during retries.
- Preserve an audit trail for sensitive administrative and integration actions.
- Surface failed integrations, queue backlogs, stale prices, and RFQ errors before they become customer problems.

### 6.4 Quality objectives

- Deliver indexable HTML-first public content.
- Minimize client-side JavaScript on public SEO pages.
- Meet strict internal Core Web Vitals and Lighthouse targets.
- Remain usable on mobile, desktop, keyboard, slow networks, and assistive technologies.
- Use verified claims and approved data only.
- Make privacy, security, and resilience part of the conversion experience.

---

## 7. Target Market and Audience

### 7.1 Geographic scope

- Primary launch market: Iran
- Future-ready markets: Iraq, Oman, and selected GCC countries

Future markets and languages must not be presented as active until operating coverage, legal requirements, content, service capacity, and commercial ownership are approved.

### 7.2 Primary customer segments

- Construction contractors and general contractors
- Developers and project owners
- Industrial companies and factory owners
- EPC companies
- Steel structure fabricators and installers
- Engineering and architecture firms involved in material decisions
- Procurement departments and professional purchasing teams
- Investors responsible for high-value construction or industrial projects

### 7.3 Primary decision-makers

- Business owners and investors
- Procurement and purchasing managers
- Project directors and project managers
- Technical office managers
- Commercial managers
- Engineers and consultants influencing specification or material approval

### 7.4 Core audience questions

- Does Ahan Asa understand the specification correctly?
- Can it source the right material rather than merely the cheapest material?
- Is the displayed product or price current, qualified, and clearly described?
- Can supplier, documentation, timing, and delivery risk be controlled?
- Can I send my complete purchase list in the format I already have?
- What must I provide to receive a meaningful quotation?
- What happens after I submit the request?
- Will the process remain clear and accountable?

Every important page should answer one or more of these questions.

---

## 8. Positioning and Value Proposition

### 8.1 Positioning statement

For project owners, contractors, industrial companies, and professional purchasing teams that require reliable steel procurement, Ahan Asa is a procurement management partner combining commercial control, technical understanding, and supplier coordination. Unlike conventional sellers focused mainly on unit price and transaction volume, Ahan Asa helps clients manage the complete purchasing decision and protect project capital.

### 8.2 Strategic differentiators

- Procurement management rather than simple product selling
- Technical clarification before commercial commitment
- Structured multi-item RFQ capture
- Disciplined supplier and quotation comparison
- Evaluation of total procurement risk rather than headline price alone
- Traceable handoff from website inquiry to ERP workflow
- Controlled documentation, logistics, and delivery coordination
- Premium advisory experience for high-value B2B purchasing

No differentiator may be presented as a guarantee unless it is contractually and operationally supportable.

### 8.3 Value pillars

1. **Requirement clarity** — define specifications, quantities, units, documentation, timing, and destination before purchase.
2. **Sourcing control** — identify and compare suitable supply options against approved project priorities.
3. **Commercial protection** — consider compliance, supplier risk, documentation, timing, logistics, and total cost.
4. **Delivery coordination** — coordinate approved purchasing and delivery milestones within the agreed scope.

---

## 9. Product Definition

The product consists of four connected surfaces.

### 9.1 Public website

The public site provides brand positioning, procurement methodology, product/category discovery, selected price information, articles/resources, trust evidence, and RFQ entry points.

### 9.2 RFQ system

The RFQ system lets a buyer enter a structured material list, upload an existing list, or combine both methods. It immediately stores the request, assigns a reference number, and submits an asynchronous integration event to Odoo.

### 9.3 Website administration

The website administration surface lets authorized operators manage articles, editorial content, SEO fields, media, selected catalog presentation data, RFQ visibility, and integration monitoring. It must not become a second ERP.

### 9.4 Odoo ERP

Odoo is the commercial operations environment for customer records, CRM, products and variants, units of measure, prices/pricelists, quotations, sales, suppliers, purchasing, inventory where applicable, and accounting where applicable.

---

## 10. System-of-Record Boundaries

The same commercial fact must not be maintained independently in two systems.

| Data or operation | Authoritative system | Website responsibility |
|---|---|---|
| Brand and public-page content | Website CMS | Store, render, version, and publish |
| Articles and resources | Website CMS | Full ownership |
| Product SEO copy, slug, metadata, FAQ, links | Website CMS | Full ownership, linked to Odoo identifiers |
| Product commercial identity | Odoo | Synchronized read-optimized copy |
| Product variants and attributes | Odoo | Synchronized read-optimized copy |
| Units of measure | Odoo | Synchronized read-optimized copy |
| Current commercial price and pricelist logic | Odoo | Timestamped public snapshot when approved |
| Public price history | Odoo-derived D1 read model | Store approved snapshots and render |
| Customer/contact | Odoo | Capture provisional submission data and synchronize |
| CRM lead/opportunity | Odoo | Create through asynchronous integration |
| RFQ and RFQ items | Website at acceptance; Odoo after sync | Durable first capture and sync metadata |
| Formal quotation and sale order | Odoo | No independent commercial engine |
| Suppliers, purchasing, inventory, accounting | Odoo | No website ownership in Phase 1 |
| Public media | R2 | Store and deliver optimized derivatives |
| Private RFQ attachments | Private R2 | Store securely; provide controlled Odoo reference |
| Users, roles, audit logs | Owning application | Enforce least privilege and record material actions |

The detailed contract belongs in `SYSTEM_OF_RECORD.md` and `ERP_DATA_MAPPING.md`.

---

## 11. Odoo Integration Requirements

### 11.1 Integration principle

No browser component and no public page may call Odoo directly. All Odoo access must pass through a server-side adapter layer using a dedicated least-privilege integration user and server-held credentials.

The exact protocol must be selected after the installed Odoo version and modules on `odoo.ahanassa.com` are verified. Website code must depend on an internal Odoo adapter contract, not directly on a version-specific endpoint.

### 11.2 Website to Odoo

The integration must support, as approved:

- customer and company data;
- contact details and preferred contact method;
- source page, campaign, UTM, locale, and consent data;
- RFQ header and reference number;
- RFQ line items;
- free-text uncatalogued items;
- secure attachment references or controlled transfers;
- integration status and idempotency keys.

The target business flow is:

```text
Website RFQ
    ↓
Customer / Contact
    ↓
CRM Lead or Opportunity
    ↓
Reviewed RFQ
    ↓
Formal Quotation
    ↓
Negotiation
    ↓
Confirmed Sale Order
```

### 11.3 Odoo to website

The synchronized public read model may include active products and categories, variants, sizes, grades, standards, units, approved public prices, effective/update times, approved availability language, and integration identifiers.

Customer-specific pricelists, supplier details, internal cost, margin, inventory internals, accounting data, and private CRM data must never be exposed through public responses.

### 11.4 Resilient processing

RFQ acceptance must follow this sequence:

```text
Validate request
      ↓
Save RFQ and items in D1
      ↓
Store verified attachments in private R2
      ↓
Commit queue event
      ↓
Return success and RFQ reference
      ↓
Synchronize with Odoo asynchronously
```

Odoo downtime, upgrade, timeout, or network failure must not cause a customer-facing failure after the website has accepted the RFQ.

Every integration event requires a stable unique key. Retries must update or reuse the existing record instead of creating a duplicate. Exhausted failures must enter a dead-letter workflow with operator visibility.

Detailed mapping, retries, reconciliation, and recovery belong in `ODOO_INTEGRATION.md`, `SYNC_STRATEGY.md`, `ERP_DATA_MAPPING.md`, and `FAILURE_RECOVERY.md`.

---

## 12. Product Catalog Requirements

### 12.1 Catalog hierarchy

```text
Category
   └── Product
          └── Variant
                 ├── Attributes
                 ├── Size / grade / standard
                 ├── Unit of measure
                 └── Approved public price snapshot
```

Initial examples may include beams, rebar, sheets, profiles, pipes, tubes, and related project steel products, but the launch taxonomy must be approved before production content is created.

### 12.2 Commercial and SEO separation

Odoo product data should remain operational. The website may enrich an Odoo-linked item with a canonical slug, Persian/search title, metadata, technical explanation, selection guidance, FAQs, media, breadcrumbs, internal links, structured-data fields, and publication/indexability status.

Commercial synchronization must never erase approved editorial content, and website SEO fields must never overwrite commercial identity in Odoo.

### 12.3 Catalog resilience

The public catalog must read from Cloudflare-hosted website data and caches, not synchronously from Odoo. A sync failure may make a timestamped snapshot stale, but it must not make the public catalog unavailable. Stale-data rules and operator alerts must be explicit.

---

## 13. Pricing Requirements

Public pricing is a supporting discovery and qualification feature, not the brand's primary identity and not a binding offer.

### 13.1 Ownership and publication

- Odoo owns commercial price and pricelist data.
- D1 stores the approved public read model and price-history snapshots.
- The public site renders only prices explicitly marked for publication.
- Every visible price requires currency, unit, effective/update time, and state.
- A visible disclaimer must distinguish informational data from a formal quotation.
- Stale, missing, unapproved, or invalid prices must fail safely and never be invented.
- Publication must not expose cost, margin, supplier, customer-specific, or private pricelist information.

### 13.2 SEO price pages

An indexable price page must provide value beyond a number: current approved price, update time, unit, specification, related variants, explanation of price factors, buying guidance, relevant FAQs, internal links, and an RFQ path where applicable.

Thin pages, empty variant combinations, and uncontrolled filter URLs must not be indexed.

### 13.3 Bulk operations

Bulk commercial price management belongs in Odoo. Website administration may show sync/freshness state and manage public publication rules; it must not create a separate price-maintenance system unless a later recorded decision changes the system of record.

---

## 14. RFQ System Requirements

RFQ is the primary conversion and the bridge between public discovery and commercial operations.

### 14.1 Submission modes

The customer must be able to:

1. enter items manually in a structured form;
2. upload an existing Excel, PDF, or image list;
3. combine structured items and attachments.

### 14.2 Multi-item builder

The customer may add or remove rows within documented safety limits. Each row supports:

| Field | Requirement |
|---|---|
| Category | Catalog selection or permitted free-text fallback |
| Product | Dependent catalog selection or free text |
| Size / variant | Relevant size, grade, thickness, standard, or variant |
| Unit | Controlled unit list where possible |
| Quantity | Validated positive quantity with appropriate precision |
| Description | Optional clarification |

An RFQ contains one-to-many RFQ items. The database and Odoo mapping must preserve that relationship.

### 14.3 Uncatalogued items

The interface must provide a clear “product not found” path. The buyer may enter title, size/specification, unit, quantity, and description. Incomplete catalog coverage must never be a reason to lose a qualified lead.

### 14.4 Request information

The final form may collect only approved and operationally necessary information, including person/company, mobile/phone, optional email according to policy, role, project and delivery location, required delivery time, contact preference, notes, consent, and server-recorded attribution.

### 14.5 Confirmation

On durable acceptance, the system must display a unique reference such as `RFQ-AA-000123` or an approved non-sequential public-safe format. Success must prove server-side storage; a purely visual client-side success state is prohibited.

A customer account or self-service status portal is outside Phase 1 unless separately approved. Authorized operators still require internal acceptance and synchronization visibility.

### 14.6 Privacy

RFQ data and attachments must never be placed in public caches, static build output, client persistent storage, page URLs, analytics payloads, public media buckets, or logs containing raw personal/commercial data.

Detailed validation, upload, retention, abuse-prevention, and fallback rules belong in `RFQ_SYSTEM.md`, `FORM_ARCHITECTURE.md`, and `SECURITY_GUIDELINES.md`.

---

## 15. Website Administration Scope

### 15.1 Required areas

- Dashboard
- Articles: create, edit, review, schedule, publish, unpublish
- Website SEO: metadata, canonical/index state, social preview, internal-link support
- Catalog presentation: website copy, slugs, media, publication, Odoo-link state
- Prices: public snapshot, freshness, publication state, sync visibility
- RFQs: acceptance state, sync state, retry/escalation visibility, controlled access
- Media with separate public/private permissions
- Users, roles, and permissions
- Integration health and failed-job handling
- Audit logs
- Settings

### 15.2 Boundaries

The website admin must not independently own commercial product masters, variants, units, commercial pricelists, formal quotations, sale orders, suppliers, purchasing, inventory, or accounting. Where an operator needs to change these, the interface must identify Odoo as authoritative.

### 15.3 Roles

The permission model should support Administrator, Content Editor, SEO Editor, Catalog/Price Publisher, RFQ Viewer or Sales Operator, Integration Operator, and Read-only Auditor. Final combinations and approval workflows belong in `AUTHORIZATION_ROLES.md`.

---

## 16. Content and Page Scope

### 16.1 Public page families

- Homepage
- About Ahan Asa
- Procurement capabilities/services
- Procurement process/methodology
- Steel category hubs
- Product and approved variant pages
- Approved price hubs and detail pages
- Industries/customer applications
- Verified projects, case studies, or procurement evidence
- Insights/resources hub
- Article/resource pages
- FAQ
- Contact
- RFQ / submit material list
- Legal, privacy, and upload terms
- Required error and service-status pages

The authoritative route inventory belongs in `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, and `SEO_PAGE_MAP.md`.

### 16.2 Voice and messaging

Launch content must be natural professional Persian with correct RTL behavior, punctuation, mixed-direction handling, and the approved numeral policy.

The voice is expert but understandable, calm rather than aggressive, precise rather than promotional, protective without fear-based selling, and transparent about scope.

- Lead with buyer risk, control, and value—not brand self-praise.
- Distinguish advisory, sourcing, supply, inspection, logistics, and sales responsibilities.
- Do not promise the lowest price, zero risk, guaranteed availability, or guaranteed delivery without contractual support.
- Do not publish fabricated projects, testimonials, partners, statistics, inventory, prices, or urgency.
- Use quantified outcomes only where evidence is approved.
- Clearly distinguish public price information from a valid quotation.

### 16.3 Evidence

Acceptable evidence includes approved real projects, customer permissions, verified quantities/outcomes, sanitized documents, genuine credentials, process artifacts, and permitted testimonials. When evidence is limited, use honest process-based credibility instead of invented proof.

---

## 17. Customer Journey and Conversion

1. **Discover** — arrive through organic search, referral, campaign, or direct brand discovery.
2. **Understand** — recognize Ahan Asa as a procurement manager, not merely a seller.
3. **Explore** — review services, process, categories, products, guides, and approved prices.
4. **Evaluate** — assess credibility, freshness, specifications, FAQs, and evidence.
5. **Build request** — add structured lines, free-text items, attachments, or a combination.
6. **Submit** — pass authoritative server validation and security controls.
7. **Receive confirmation** — obtain a durable RFQ reference without waiting for Odoo.
8. **ERP handoff** — synchronize customer and RFQ data asynchronously.
9. **Commercial follow-up** — sales reviews, clarifies, quotes, negotiates, and proceeds in Odoo.

### 17.1 Primary CTA

**Submit your material list / Request a procurement quotation**

Final Persian wording belongs in `CTA_STRATEGY.md` and `COPY_GUIDELINES.md`.

### 17.2 Secondary CTAs

- Speak with a procurement advisor
- Add items to an RFQ
- Upload Excel, PDF, or image list
- Review current approved prices
- Explore product categories
- Understand the procurement process
- Read a technical or purchasing guide

---

## 18. Experience and Design Direction

The visual system should communicate engineered confidence, financial protection, and industrial sophistication.

### 18.1 Desired characteristics

- Premium and minimalist
- Strong editorial hierarchy and generous whitespace
- Precise grid and modern Persian typography
- Restrained Steel Navy and Forge Copper use
- Real industrial photography and technical imagery
- Purposeful micro-interactions
- Clear data tables and form states
- Excellent mobile/desktop ergonomics
- Accessible focus, contrast, labels, errors, and keyboard behavior

### 18.2 Avoid

- Crowded commodity-market layouts
- Homepage price-table overload
- Generic construction templates
- Decorative motion that delays content
- Heavy client-side animation on SEO pages
- Fake dashboards or market tickers
- Unsupported live-price claims
- Stock imagery implying facilities, inventory, fleet, or team assets Ahan Asa does not own
- Excessive copper backgrounds or visual noise

The RFQ builder must remain understandable with many line items. On small screens, rows may adapt into accessible item cards without losing labels, relationships, validation, or edit/remove controls.

---

## 19. SEO Architecture Requirements

SEO pages must return meaningful HTML in the initial response. Indexable content, headings, links, metadata, and structured data must not depend on client-side JavaScript.

### 19.1 Page requirements

Every indexable template must support:

- unique title and meta description;
- one clear H1 and semantic headings;
- self-referencing canonical unless an approved exception applies;
- correct HTTP status and robots directive;
- server-rendered visible content;
- crawlable internal links using real URLs;
- breadcrumb navigation and `BreadcrumbList` where valid;
- Open Graph/social metadata;
- structured data matching visible content;
- meaningful related products, categories, guides, or RFQ paths;
- accurate `lastmod` based on substantive change.

### 19.2 Structured data

Eligible types may include `Organization`, `WebSite`, `BreadcrumbList`, `Article`, `Product`, and `Offer`. Eligibility is per-template and only when the required properties are accurate and visible. Markup must never imply stock, price, rating, review, or availability that the page does not show.

### 19.3 Sitemaps and faceted navigation

The sitemap index may separate pages, categories, products, articles, and approved price pages. Draft, private, admin, RFQ confirmation, filter-only, parameterized, duplicate, and unsupported locale URLs must not enter XML sitemaps.

Filters such as size, grade, brand, standard, unit, and origin must not automatically create indexable URLs. Curated landing pages and filter-only states require explicit canonical, robots, crawl, and linking rules.

### 19.4 Localization

Persian is the only launch locale. The architecture must remain ready for future RTL/LTR coexistence, but empty, machine-translated, or unsupported English/Arabic routes and hreflang declarations must not be published.

---

## 20. Performance Requirements

Performance is a release gate measured on representative production-like pages, devices, and networks.

### 20.1 Internal targets

At the 75th percentile of eligible real-user data:

| Metric | Internal target |
|---|---:|
| LCP | `< 2.0 s` |
| INP | `< 150 ms` |
| CLS | `< 0.05` |
| TTFB for cacheable public pages | `< 500 ms` |

Representative Lighthouse CI targets:

| Category | Target |
|---|---:|
| Performance | `95+` |
| SEO | `100` |
| Accessibility | `95+` |
| Best Practices | `95+` |

These are internal engineering targets, not promises for every user, route, device, or network.

### 20.2 Rendering strategy

| Page type | Default strategy |
|---|---|
| Home, about, services, process | Static or edge-cached HTML |
| Category and product SEO pages | Static/revalidated or edge-cached HTML |
| Articles and resources | Static/revalidated HTML |
| Public price pages | Cached dynamic or controlled revalidation |
| RFQ builder | HTML-first shell with isolated interactivity |
| Admin/authenticated operations | Dynamic, private, never publicly cached |

Use server-rendered/server components by default. Client components should be limited to real interaction such as RFQ rows, product filters/search, calculators, mobile navigation, upload progress, and authenticated admin controls. Public content must remain available when nonessential JavaScript fails.

### 20.3 Cache, media, and fonts

- Public cacheable content should be served from the nearest Cloudflare edge where practical.
- Odoo must never be in the synchronous public-render path.
- Content and price updates require selective invalidation or revalidation.
- RFQ, admin, authentication, attachments, and user-specific responses must never be publicly cached.
- R2 public originals must be delivered as appropriately sized responsive derivatives, preferably AVIF/WebP with fallback.
- Dimensions, aspect ratio, priority, and loading behavior must be explicit.
- Fonts should be self-hosted WOFF2, subset where practical, limited to required weights, and preloaded only when critical.
- Motion and media must respect reduced-motion preferences and never block primary content or conversion.

Detailed budgets belong in `PERFORMANCE_BUDGET.md` and `PERFORMANCE_GUIDELINES.md`.

---

## 21. Cloudflare Platform Requirements

The target production platform is Cloudflare, subject to technical compatibility validation.

### 21.1 Intended services

- Cloudflare DNS, TLS, edge delivery, redirects, and security controls
- Next.js App Router deployed to Cloudflare Workers
- D1 for relational website data, read models, RFQ durability, and integration state
- R2 for public media originals and separately controlled private RFQ attachments
- Queues for asynchronous Website/Odoo integration jobs
- Turnstile and server-side abuse controls
- Worker logs, metrics, traces, and alerts

### 21.2 Data-model direction

D1 is expected to include logical entities for website users/roles, articles/categories, synchronized steel categories/products/variants/attributes/units, public prices/history, RFQs/items/attachments, media, integration jobs, sync state, and audit logs.

Synchronized entities should include identifiers and timestamps needed for reconciliation, such as `external_id`, `odoo_id`, `sync_status`, `last_synced_at`, and `sync_version` where relevant.

Exact tables, keys, indexes, constraints, migrations, retention, and replication/session behavior belong in `DATABASE_SCHEMA.md` and `DATA_ARCHITECTURE.md`.

---

## 22. Security, Privacy, and Reliability

### 22.1 Security baseline

- All secrets remain server-side in protected environment secrets.
- Odoo credentials must never enter browser bundles, public environment variables, source control, logs, or analytics.
- Odoo integration uses a dedicated least-privilege bot user.
- Admin and integration permissions follow least privilege and separation of duties.
- Request bodies are validated authoritatively on the server.
- Database queries are parameterized and constrained.
- Authentication, sessions, CSRF protection, origin controls, rate limits, and security headers follow the final threat model.
- Material administrative and synchronization actions are auditable.

### 22.2 Upload controls

Uploads require documented allowed formats, file size/count limits, extension/MIME/signature validation, randomized keys, private storage, malware/quarantine handling where required, authorized time-limited access, retention/deletion, and log redaction.

Uploaded content must never be executed, rendered inline unsafely, or exposed by a predictable public URL.

### 22.3 Failure behavior

- An accepted RFQ must be recoverable when Odoo is unavailable.
- Queue retries must be idempotent.
- Dead-letter events require an operator workflow and alert.
- Failed catalog/price sync must preserve the last valid snapshot and accurately mark freshness.
- No error path may silently discard a lead.
- Backups, recovery objectives, reconciliation jobs, and incident ownership must be documented and tested.

---

## 23. Analytics and Observability

Analytics must measure the journey without collecting RFQ line content, attachment names, personal data, commercial documents, or sensitive free text.

Approved events may include category/product/price page views, RFQ start, item added/removed without content, upload method selected without filename, validation error by safe code, successful submission by opaque event ID, CTA engagement, and resource engagement.

Operational monitoring must cover Worker errors/latency, D1 errors, R2 failures, queue backlog/retries/dead letters, Odoo API failures, sync age, stale prices/catalog, RFQ acknowledgement failures, suspicious activity, 404/5xx trends, cache hit ratio, and Core Web Vitals.

---

## 24. Phase 1 Scope

Phase 1 includes:

- Persian-first premium public website;
- Cloudflare-based deployment foundation;
- brand, process, service, category, product, article, legal, contact, and RFQ page families;
- website CMS for articles and approved public content;
- Odoo-linked product/catalog read model;
- approved public price snapshots and freshness states;
- structured multi-item RFQ builder;
- Excel, PDF, and image attachments;
- uncatalogued-item fallback;
- durable D1 capture and private R2 storage;
- asynchronous Odoo customer, lead/opportunity, and RFQ handoff;
- operator access to content, publication, RFQ, and integration states;
- SEO, performance, accessibility, security, analytics, and observability release gates.

Exact route count and launch catalog depth depend on approved content and data readiness.

---

## 25. Explicit Non-Goals for Phase 1

Unless separately approved, Phase 1 does not include:

- public consumer checkout, online payment, or shopping cart;
- open supplier marketplace or supplier self-service accounts;
- customer account or self-service RFQ portal (approved *future-phase* architecture now exists — `CUSTOMER_ACCOUNT_ARCHITECTURE.md`, `CUSTOMER_PORTAL.md`, `DECISIONS.md` ADR-017 — but it remains excluded from the current Phase 1 implementation; building it still requires its own future implementation approval);
- customer-specific online pricing;
- autonomous quotation without sales review;
- website ownership of inventory, purchasing, suppliers, accounting, or sale orders;
- unverified real-time market feeds;
- automated price or delivery guarantees;
- unsupported multilingual publication;
- public exposure of Odoo, D1, R2, admin, or integration internals;
- claims that Ahan Asa owns factories, warehouses, fleet, inventory, or certifications without evidence.

These exclusions prevent scope inflation, duplicated ERP functionality, and misleading positioning.

---

## 26. Success Criteria

### 26.1 Launch acceptance

The release is ready only when:

- A first-time visitor can identify the service, audience, and value in the first screen/navigation.
- Every public claim, price, product, project, testimonial, and operational statement is approved.
- Persian RTL is correct across navigation, forms, tables, filters, numerals, and mixed-direction text.
- Core pages return indexable HTML with approved metadata, canonicals, links, statuses, and sitemap inclusion.
- RFQ supports multiple rows, uncatalogued items, and approved files on mobile and desktop.
- Successful submission proves durable storage and returns a unique reference.
- Odoo unavailability does not lose or block an accepted RFQ.
- Retries do not create duplicate Odoo records.
- Public catalog/prices render without a live Odoo dependency.
- Private data is absent from public caches, analytics, static output, and public object storage.
- Performance, accessibility, SEO, security, responsive, integration, recovery, and rollback gates pass.
- Operators can identify stale data, failed synchronization, and RFQ processing state.
- No placeholder, fabricated, or unsupported production content remains.

### 26.2 Business KPIs

Numerical targets require approved baselines. KPI categories include qualified RFQ volume, completion rate, average items per RFQ, attachment-assisted rate, inquiry-to-opportunity, opportunity-to-quotation, quotation-to-sale, response time, Odoo sync success/delay, organic non-brand performance, page contribution to RFQs, and Core Web Vitals pass rate.

---

## 27. Governance and Source-of-Truth Hierarchy

When documents conflict, use this order unless `CLAUDE.md` defines a stricter implementation rule:

1. Explicit owner decision recorded in `DECISIONS.md`
2. `PROJECT_BRIEF.md`
3. `SYSTEM_OF_RECORD.md`
4. Approved brand and strategy documents
5. Approved page, content, catalog, pricing, RFQ, and integration specifications
6. Technical architecture and development standards
7. Task-specific implementation instructions

Claude Code must not silently choose between material contradictions. It must identify the conflict, preserve unrelated approved work, and request a decision when the outcome affects brand, scope, data ownership, architecture, SEO, security, privacy, or production data.

Explicit recorded approval is required for changes to positioning/slogan, market/language, primary conversion, product/service scope, logo/colors, public prices/claims/evidence, canonical domain, Website/Odoo boundaries, RFQ retention, commercial data ownership, Cloudflare architecture, or e-commerce/portal/payment/marketplace scope.

---

## 28. Required Documentation Alignment

This brief governs but does not replace the project documentation. At minimum, the following documents must be aligned before architecture is considered implementation-ready:

- `BRAND_GUIDELINES.md`, `DESIGN_DIRECTION.md`, `DESIGN_SYSTEM.md`
- `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`
- `CONTENT_STRATEGY.md`, `COPY_GUIDELINES.md`, `CTA_STRATEGY.md`
- `PRODUCT_CATALOG_SPEC.md`, `PRICING_SYSTEM.md`, `RFQ_SYSTEM.md`
- `ADMIN_PANEL_SPEC.md`, `AUTHORIZATION_ROLES.md`
- `STACK.md`, `TECHNICAL_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `COMPONENT_ARCHITECTURE.md`
- `DATA_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `CMS_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`, `ODOO_INTEGRATION.md`, `SYSTEM_OF_RECORD.md`
- `SYNC_STRATEGY.md`, `ERP_DATA_MAPPING.md`, `FAILURE_RECOVERY.md`, `FORM_ARCHITECTURE.md`
- `PERFORMANCE_BUDGET.md`, `PERFORMANCE_GUIDELINES.md`, `CACHING_STRATEGY.md`
- `IMAGE_OPTIMIZATION.md`, `FONT_STRATEGY.md`
- `SEO_STRATEGY.md`, `SEO_PAGE_MAP.md`, `STRUCTURED_DATA.md`, `METADATA_SPEC.md`
- `INTERNAL_LINKING.md`, `SITEMAP_ROBOTS_SPEC.md`, `HREFLANG_CANONICAL.md`
- `SECURITY_GUIDELINES.md`, `DEPLOYMENT_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md`
- `TESTING_STRATEGY.md`, `QA_CHECKLIST.md`, `SEO_QA_CHECKLIST.md`
- `PRE_DEPLOY_CHECKLIST.md`, `POST_DEPLOY_CHECKLIST.md`
- `DEVELOPMENT_RULES.md`, `CLAUDE.md`, `TASKS.md`, `DECISIONS.md`

---

## 29. Open Decisions and Required Inputs

The following must not be guessed during implementation:

- **Legal entity:** registered name, tax/invoicing identity, legal notices, contracting party.
- **Operational coverage:** cities, provinces, countries, delivery restrictions, logistics scope.
- **Launch catalog:** categories, products, grades, standards, variants, sizes, brands, units.
- **Service boundaries:** advisory, sourcing, supply, inspection, logistics, financing, after-sales.
- **Commercial model:** fee, margin, commission, direct supply, or hybrid and public disclosure.
- **Qualification rules:** minimum quantity/value/geography/customer eligibility.
- **Price policy:** eligibility, currency, tax, cadence, stale threshold, rounding, disclaimer, owner.
- **Odoo environment:** version, edition, modules, customizations, staging, API, limits, backup owner.
- **ERP mapping:** dedicated RFQ module/model versus approved CRM/Sales representation.
- **Data conflicts:** field-level reconciliation rules for Odoo and website edits.
- **Evidence:** clients, projects, metrics, images, documents, testimonials, permissions.
- **Contact channels:** phone/country code, email, WhatsApp, address, business hours.
- **Response workflow:** lead owner, routing, SLA, escalation, notifications.
- **Privacy:** consent, retention, deletion, data requests, attachment handling.
- **Upload policy:** formats, size/count, scanning, retention, permissions.
- **Admin authentication:** identity provider, MFA, sessions, recovery, privileged access.
- **Content ownership:** commercial, technical, legal, editorial, SEO, publication approvers.
- **Analytics:** GA4/GTM, consent, event taxonomy, dashboards, reporting owner.
- **Future languages:** priority and launch criteria for English, Arabic, or others.
- **Customer status access:** whether tracking or a portal is required after Phase 1.

Each open decision must receive an owner, target date, and explicit status in `DECISIONS.md` and `TASKS.md` before dependent implementation begins.

---

## 30. Definition of Done for This Brief

This document becomes **Approved** when the project owner confirms:

- the brand category, promise, positioning, audience, and launch market;
- the shift from brochure website to digital procurement platform;
- the Website/Cloudflare/Odoo responsibility boundaries;
- Odoo as the commercial system of record;
- catalog, pricing, CMS, RFQ, attachment, and administration scope;
- Cloudflare deployment and asynchronous integration direction;
- primary conversion and Phase 1 non-goals;
- internal SEO, performance, accessibility, security, and reliability targets;
- an owner and disposition for every unresolved decision.

Until approval, this is an authoritative working draft. Confirmed sections may guide planning and dependent documentation, but unresolved items must not become production claims, schemas, credentials, integrations, or public functionality.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| Brand Approval | TBD | Pending | — |
| Commercial Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
| ERP/Odoo Approval | TBD | Pending | — |
| Legal/Privacy Approval | TBD | Pending | — |
