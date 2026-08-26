# Ahan Asa Website — SEO Page Map

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `SEO_PAGE_MAP.md`  
> **Status:** Draft v1.0 — Implementation baseline  
> **Last updated:** 2026-08-25  
> **Primary language:** Persian (Farsi), fully RTL  
> **Launch market:** Iran

---

## 1. Purpose

This document maps every approved public page family to its search purpose, keyword ownership, metadata intent, minimum content requirements, internal-link role, and publication gate.

It translates the keyword strategy into an implementable page plan for content, design, development, and SEO QA. Its central objective is to ensure that:

- every indexable URL serves one distinct search intent;
- one primary page owns each strategic keyword cluster;
- commercial pages do not compete with one another;
- supporting articles and resources strengthen—not replace—their parent commercial page;
- Ahan Asa is positioned as a premium B2B steel procurement management partner;
- no page presents the brand as a retail shop, marketplace, inventory catalog, or live-price publisher;
- conditional pages are not published before their operational and evidence gates are satisfied.

This is a page-ownership document, not a claim that every listed phrase already has proven search volume. Search volume, competition, SERP composition, wording variants, and commercial value must be validated before final copy is approved.

## 2. Authority and Dependencies

Use this document together with:

| Document | Governing responsibility |
|---|---|
| `PROJECT_BRIEF.md` | Positioning, audience, business goals, and scope boundaries |
| `SITEMAP.md` | Approved page inventory, hierarchy, status, and indexation intent |
| `INFORMATION_ARCHITECTURE.md` | Navigation, labels, user journeys, and findability |
| `SEO_STRATEGY.md` | SEO goals, market strategy, measurement, and governance |
| `SEO_KEYWORD_MAP.md` | Keyword universe, intent clusters, variants, and exclusions |
| `ROUTES.md` | Exact route implementation, locale behavior, and redirects |
| `PAGE_SPECIFICATIONS.md` | Page sections, components, states, and acceptance criteria |
| `METADATA_SPEC.md` | Exact title, description, Open Graph, and social rules |
| `INTERNAL_LINKING.md` | Link obligations, anchor policy, and hub relationships |
| `STRUCTURED_DATA.md` | Approved Schema.org and JSON-LD implementation |

If `SITEMAP.md` does not approve a page, this document must not be used to create it. If a keyword cluster requires a new page, record it as a recommendation and update the sitemap through the project change-control process first.

## 3. Binding SEO Positioning

### 3.1 Primary entity

The primary entity is **Ahan Asa | آهن آسا**, a B2B partner for managing project-based steel procurement.

### 3.2 Core organic territory

The website should build relevance around:

- مدیریت تأمین آهن‌آلات پروژه;
- خرید پروژه‌ای آهن‌آلات و مقاطع فولادی;
- بررسی نیاز و مشخصات فنی خرید;
- ارزیابی تأمین‌کننده و گزینه‌های تأمین;
- مقایسه فنی و تجاری پیش‌فاکتورها;
- کنترل مدارک، کیفیت و انطباق سفارش;
- هماهنگی حمل و تحویل;
- راهنمای تصمیم‌گیری برای خرید حرفه‌ای فولاد.

### 3.3 Required framing

All pages must reinforce at least one of these ideas:

1. A correct purchase begins with a clear requirement.
2. Unit price alone is not sufficient for supplier selection.
3. Specifications, documents, timing, logistics, and total procurement risk matter.
4. Ahan Asa brings structure and accountability to a high-value purchasing decision.
5. The approved brand promise is: **«ما مراقب سرمایه شما هستیم.»**

### 3.4 Prohibited framing

Do not target, imply, or design around:

- فروشگاه آهن‌آلات;
- خرید آنلاین مصرف‌کننده‌محور;
- بازارگاه فروشندگان آهن;
- قیمت لحظه‌ای یا تابلو قیمت زنده;
- ارزان‌ترین آهن یا تضمین کمترین قیمت;
- موجودی انبار تأییدنشده;
- ارسال فوری یا تحویل تضمینی تأییدنشده;
- ادعای مالکیت کارخانه، انبار، آزمایشگاه، ناوگان یا شبکه تأمین بدون مدرک;
- صفحات شهری انبوه، صفحات محصول تکراری، یا محتوای برنامه‌ای کم‌ارزش.

## 4. Keyword-to-Page Ownership Rules

### 4.1 One cluster, one owner

Each strategic keyword cluster has one canonical owner page. Another page may mention the phrase naturally, but must not use the same query as its primary H1, title target, or dominant content theme.

### 4.2 Parent and child relationship

- A hub targets the broad category.
- A child page targets one narrower decision, material group, audience, or evidence item.
- A supporting article targets an informational question and links to the relevant commercial owner.
- A resource targets a durable tool, checklist, or downloadable asset and links to the page that owns the related commercial intent.

### 4.3 Brand and generic intent separation

- `/` owns the brand plus the broad proposition.
- `/about` owns company identity, trust, and brand-history queries.
- `/procurement` owns the broad procurement-management service query.
- `/materials` owns the broad supported-materials discovery query.
- `/request-consultation` owns the qualified inquiry and project-estimate action query.

### 4.4 No automatic page creation from keyword variants

Plural, singular, نیم‌فاصله, informal spelling, and synonym variants belong to the same owner unless SERP research proves that the intent is materially different.

Examples that normally remain in one cluster:

- آهن‌آلات / آهن آلات;
- تأمین / تامین;
- پیش‌فاکتور / پیش فاکتور;
- ورق فولادی / ورق آهن;
- قوطی و پروفیل / پروفیل فولادی;
- مدیریت خرید / مدیریت تأمین.

### 4.5 Search-volume caution

No page should be published merely because a keyword tool reports volume. Publication also requires:

- operational truth;
- enough unique content;
- a distinct SERP intent;
- a credible conversion or trust role;
- no conflict with an existing owner page.

## 5. Standard Page-Mapping Fields

Every indexable page must have the following SEO fields defined in content data or page configuration:

| Field | Requirement |
|---|---|
| `seoId` | Stable ID from `SITEMAP.md` |
| `route` | Canonical unprefixed Persian route |
| `publicationStatus` | Launch Core, Launch Conditional, or Post-Launch |
| `indexation` | `index,follow` only after the page passes its release gate |
| `primaryIntent` | One dominant search need |
| `primaryKeyword` | One page-owning query concept |
| `secondaryKeywords` | Closely related variants and subtopics |
| `excludedKeywords` | Queries owned elsewhere or prohibited by positioning |
| `titleIntent` | Message and query priority for the title tag |
| `h1Intent` | Clear visible page promise; not necessarily identical to title |
| `descriptionIntent` | User problem, differentiator, and next step |
| `requiredSections` | Minimum content needed to satisfy intent |
| `requiredLinks` | Parent, child, evidence, knowledge, and conversion links |
| `schemaCandidate` | Candidate only; final approval belongs to `STRUCTURED_DATA.md` |
| `releaseGate` | Facts, evidence, content, or operational approval required |

## 6. Master SEO Page Map — Launch Core

### 6.1 Core, procurement, and conversion pages

| SEO ID | Route | Page | Primary keyword owner | Search intent | Funnel |
|---|---|---|---|---|---|
| `HOME-001` | `/` | Homepage | `تأمین آهن‌آلات پروژه` | Understand the brand and broad offer | Discovery / commercial |
| `PROC-000` | `/procurement` | Procurement Management Hub | `مدیریت تأمین آهن‌آلات` | Evaluate the managed-procurement service | Commercial investigation |
| `PROC-010` | `/procurement/requirements-and-specifications` | Requirements and Specifications | `بررسی مشخصات فنی آهن‌آلات` | Define correct purchase inputs | Informational / commercial |
| `PROC-020` | `/procurement/sourcing-and-supplier-evaluation` | Sourcing and Supplier Evaluation | `ارزیابی تأمین‌کننده آهن‌آلات` | Assess sourcing and supplier risk | Informational / commercial |
| `PROC-030` | `/procurement/quotation-comparison` | Quotation Comparison | `مقایسه پیش‌فاکتور آهن‌آلات` | Compare quotations beyond headline price | Informational / commercial |
| `PROC-040` | `/procurement/documentation-and-quality-control` | Documentation and Quality Control | `کنترل کیفیت و مدارک آهن‌آلات` | Verify documentation and conformity | Informational / commercial |
| `PROC-050` | `/procurement/logistics-and-delivery` | Logistics and Delivery Coordination | `هماهنگی حمل و تحویل آهن‌آلات` | Plan delivery and logistics milestones | Informational / commercial |
| `PROC-060` | `/process` | Procurement Process | `فرایند خرید آهن‌آلات پروژه` | Understand the collaboration sequence | Commercial investigation |
| `MAT-000` | `/materials` | Material Groups Hub | `تأمین مقاطع و محصولات فولادی` | Discover supported material groups | Commercial investigation |
| `IND-000` | `/industries` | Industries and Buyer Types | `تأمین آهن‌آلات برای پروژه‌ها و صنایع` | Determine audience and use-case fit | Commercial investigation |
| `ABOUT-001` | `/about` | About Ahan Asa | `آهن آسا` | Verify brand identity and credibility | Navigational / trust |
| `FAQ-001` | `/faq` | Frequently Asked Questions | `سؤالات خرید و تأمین آهن‌آلات پروژه` | Resolve cross-cutting objections | Informational / trust |
| `CONTACT-001` | `/contact` | Contact | `تماس با آهن آسا` | Find verified contact channels | Navigational / action |
| `RFQ-001` | `/request-consultation` | Request Procurement Consultation | `استعلام تأمین آهن‌آلات پروژه` | Submit a qualified project inquiry | Transactional / lead |
| `LEGAL-010` | `/privacy` | Privacy Notice | `حریم خصوصی آهن آسا` | Understand data handling | Navigational / legal |
| `LEGAL-020` | `/terms-of-use` | Terms of Use | `شرایط استفاده آهن آسا` | Understand site terms | Navigational / legal |

## 7. Detailed Page Briefs — Launch Core

### 7.1 `HOME-001` — Homepage

- **Route:** `/`
- **Primary keyword:** `تأمین آهن‌آلات پروژه`
- **Secondary cluster:** `خرید آهن‌آلات پروژه`، `مدیریت خرید آهن‌آلات`، `تأمین فولاد پروژه`، `خرید پروژه‌ای آهن`، `آهن آسا`
- **Intent:** Introduce the category, qualify the visitor, and route them to the right service, material, evidence, or inquiry page.
- **Title intent:** Brand + project-based steel procurement + risk/control value.
- **Suggested title pattern:** `آهن آسا | مدیریت تأمین و خرید آهن‌آلات پروژه`
- **H1 intent:** Explain that Ahan Asa manages a high-value steel purchase rather than merely selling a commodity.
- **Description intent:** Mention structured requirement review, supplier/quotation comparison, documentation, and delivery coordination without promising results that are not contractually supported.
- **Required sections:** value proposition; procurement-vs-selling distinction; four value pillars; process summary; supported material scope; audience fit; verified evidence if available; final consultation path.
- **Required internal links:** `/procurement`, `/process`, `/materials`, `/industries`, `/about`, `/request-consultation`; `/projects` only when released.
- **Excluded ownership:** `مدیریت تأمین آهن‌آلات` belongs to `/procurement`; individual product terms belong to material pages; `قیمت روز آهن` is prohibited as a target.
- **Schema candidate:** `Organization`, `WebSite`, `WebPage`.
- **Release gate:** Final positioning copy, verified contact data, approved claims, and working conversion path.

### 7.2 `PROC-000` — Procurement Management Hub

- **Route:** `/procurement`
- **Primary keyword:** `مدیریت تأمین آهن‌آلات`
- **Secondary cluster:** `مدیریت خرید آهن‌آلات`، `خدمات تأمین آهن‌آلات`، `تأمین پروژه‌ای فولاد`، `مدیریت خرید فولاد پروژه`
- **Intent:** Evaluate what Ahan Asa manages across the purchasing decision.
- **Title intent:** Procurement management + steel + project context.
- **Suggested title pattern:** `مدیریت تأمین آهن‌آلات پروژه | آهن آسا`
- **H1 intent:** Present the complete management scope in one clear statement.
- **Required sections:** procurement problem; scope boundaries; five capability stages; expected client inputs; expected outputs; accountability model; relevant material groups; FAQs; consultation CTA.
- **Required internal links:** all five procurement child pages, `/process`, `/materials`, `/faq`, `/request-consultation`.
- **Excluded ownership:** process sequence belongs to `/process`; quotation comparison detail belongs to `PROC-030`; broad homepage proposition belongs to `/`.
- **Schema candidate:** `Service`, `WebPage`, `BreadcrumbList`.
- **Release gate:** Every described capability must match an approved operating procedure.

### 7.3 `PROC-010` — Requirements and Specifications

- **Route:** `/procurement/requirements-and-specifications`
- **Primary keyword:** `بررسی مشخصات فنی آهن‌آلات`
- **Secondary cluster:** `مشاوره مشخصات خرید آهن`، `بررسی لیست خرید آهن‌آلات`، `کنترل مشخصات فولاد`، `تهیه درخواست خرید آهن‌آلات`، `بررسی BOM خرید فولاد`
- **Intent:** Help a professional buyer understand what must be defined before requesting or approving a quotation.
- **Title intent:** Technical requirement review before a project steel purchase.
- **Suggested title pattern:** `بررسی نیاز و مشخصات فنی خرید آهن‌آلات | آهن آسا`
- **H1 intent:** Show that accurate procurement begins before price collection.
- **Required sections:** required purchase inputs; grade/standard/dimensions/quantity; acceptable substitutions; documentation needs; timing/location; common requirement errors; deliverable or output; responsibility limits; consultation CTA.
- **Required internal links:** `/procurement`, `/procurement/sourcing-and-supplier-evaluation`, `/procurement/quotation-comparison`, `/materials`, `/request-consultation`.
- **Excluded ownership:** generic engineering design services; independent structural design; unsupported quantity takeoff guarantees.
- **Schema candidate:** `Service`, `BreadcrumbList`.
- **Release gate:** Approved boundaries between client engineering responsibility and Ahan Asa review responsibility.

### 7.4 `PROC-020` — Sourcing and Supplier Evaluation

- **Route:** `/procurement/sourcing-and-supplier-evaluation`
- **Primary keyword:** `ارزیابی تأمین‌کننده آهن‌آلات`
- **Secondary cluster:** `انتخاب تأمین‌کننده فولاد`، `بررسی اعتبار فروشنده آهن`، `منبع‌یابی آهن‌آلات`، `سورسینگ فولاد`، `مقایسه تأمین‌کنندگان آهن`
- **Intent:** Explain how suitable supply options and suppliers are assessed.
- **Title intent:** Supplier evaluation and sourcing control for project steel.
- **Suggested title pattern:** `ارزیابی تأمین‌کننده و منبع‌یابی آهن‌آلات | آهن آسا`
- **Required sections:** evaluation criteria; technical fit; commercial capability; documentation; capacity and timing; delivery risk; conflict disclosure; decision record; boundaries and exclusions.
- **Required internal links:** `/procurement`, `PROC-010`, `PROC-030`, `PROC-040`, `/request-consultation`.
- **Excluded ownership:** public supplier directory; supplier rankings without evidence; marketplace language.
- **Schema candidate:** `Service`, `BreadcrumbList`.
- **Release gate:** Approved supplier-evaluation method and non-confidential criteria.

### 7.5 `PROC-030` — Quotation Comparison

- **Route:** `/procurement/quotation-comparison`
- **Primary keyword:** `مقایسه پیش‌فاکتور آهن‌آلات`
- **Secondary cluster:** `مقایسه قیمت آهن‌آلات پروژه`، `بررسی پیش‌فاکتور فولاد`، `مقایسه پیشنهاد فروشندگان آهن`، `تحلیل قیمت خرید آهن`، `هزینه کل خرید آهن‌آلات`
- **Intent:** Help buyers compare like-for-like offers beyond unit price.
- **Title intent:** Technical and commercial steel quotation comparison.
- **Suggested title pattern:** `مقایسه فنی و تجاری پیش‌فاکتور آهن‌آلات | آهن آسا`
- **Required sections:** normalization method; specification compliance; weight/quantity basis; taxes and charges; delivery terms; payment terms; documentation; lead time; exclusions; total-cost perspective; sample redacted comparison only if approved.
- **Required internal links:** `/procurement`, `PROC-010`, `PROC-020`, `PROC-040`, `/process`, `/request-consultation`.
- **Excluded ownership:** daily price pages; guaranteed savings; public competitor comparisons; “cheapest supplier” claims.
- **Schema candidate:** `Service`, `BreadcrumbList`.
- **Release gate:** Approved comparison framework and legal/commercial review of examples.

### 7.6 `PROC-040` — Documentation and Quality Control

- **Route:** `/procurement/documentation-and-quality-control`
- **Primary keyword:** `کنترل کیفیت و مدارک آهن‌آلات`
- **Secondary cluster:** `گواهی آنالیز فولاد`، `کنترل مدارک خرید آهن`، `تطبیق مشخصات آهن‌آلات`، `مدارک فنی فولاد`، `کنترل کیفی خرید فولاد`
- **Intent:** Explain documentation and conformity checks that reduce procurement risk.
- **Title intent:** Documentation, traceability, and quality-control coordination.
- **Suggested title pattern:** `کنترل مدارک و کیفیت در تأمین آهن‌آلات | آهن آسا`
- **Required sections:** document types; certificates; traceability; visual/dimensional or third-party checks only within approved scope; deviations; approval records; document handover; limitations; escalation route.
- **Required internal links:** `/procurement`, `PROC-010`, `PROC-020`, `PROC-050`, relevant material pages when released, `/request-consultation`.
- **Excluded ownership:** laboratory services, inspection certification, or warranty claims unless actually provided and approved.
- **Schema candidate:** `Service`, `BreadcrumbList`.
- **Release gate:** Exact responsibility for review, inspection, testing, and acceptance must be documented.

### 7.7 `PROC-050` — Logistics and Delivery Coordination

- **Route:** `/procurement/logistics-and-delivery`
- **Primary keyword:** `هماهنگی حمل و تحویل آهن‌آلات`
- **Secondary cluster:** `برنامه‌ریزی تحویل آهن‌آلات`، `لجستیک فولاد پروژه`، `هماهنگی بارگیری آهن`، `تحویل مرحله‌ای آهن‌آلات`، `کنترل ارسال آهن‌آلات`
- **Intent:** Explain how approved orders, documentation, timing, loading, and delivery milestones are coordinated.
- **Title intent:** Delivery and logistics coordination for project steel procurement.
- **Suggested title pattern:** `هماهنگی حمل و تحویل آهن‌آلات پروژه | آهن آسا`
- **Required sections:** delivery inputs; location/site constraints; loading plan; milestone communication; delivery documentation; partial deliveries; exception handling; client responsibilities; carrier and insurance boundaries.
- **Required internal links:** `/procurement`, `/process`, `PROC-040`, `/materials`, `/request-consultation`.
- **Excluded ownership:** owned fleet, customs, warehousing, or guaranteed delivery unless verified and contractually included.
- **Schema candidate:** `Service`, `BreadcrumbList`.
- **Release gate:** Confirmed logistics scope, geographic coverage, and responsibility boundaries.

### 7.8 `PROC-060` — Procurement Process

- **Route:** `/process`
- **Primary keyword:** `فرایند خرید آهن‌آلات پروژه`
- **Secondary cluster:** `مراحل تأمین آهن‌آلات`، `روش خرید آهن‌آلات پروژه`، `فرایند استعلام و خرید فولاد`، `مراحل همکاری با آهن آسا`
- **Intent:** Understand the sequential collaboration journey and required handoffs.
- **Title intent:** From requirement submission to delivery follow-through.
- **Suggested title pattern:** `فرایند تأمین و خرید آهن‌آلات پروژه | آهن آسا`
- **Required sections:** initial inquiry; qualification; requirement review; sourcing; comparison; approval; order/document coordination; delivery follow-through; client inputs; expected outputs; stop/go gates; FAQs.
- **Required internal links:** `/procurement`, relevant capability pages at each step, `/faq`, `/request-consultation`.
- **Excluded ownership:** broad service definition belongs to `/procurement`; individual stage detail belongs to capability pages.
- **Schema candidate:** `HowTo` only if the final page genuinely satisfies HowTo eligibility and policy; otherwise `WebPage` + `BreadcrumbList`.
- **Release gate:** Process must match the real sales and operational workflow.

### 7.9 `MAT-000` — Material Groups Hub

- **Route:** `/materials`
- **Primary keyword:** `تأمین مقاطع و محصولات فولادی`
- **Secondary cluster:** `تأمین آهن‌آلات پروژه`، `گروه‌های کالایی فولاد`، `خرید انواع مقاطع فولادی`، `تأمین محصولات فولادی پروژه`
- **Intent:** Discover which broad material groups can be supported and what information is needed for responsible procurement.
- **Title intent:** Supported steel material groups in a project-procurement context.
- **Suggested title pattern:** `تأمین مقاطع و محصولات فولادی پروژه | آهن آسا`
- **Required sections:** category overview; scope disclaimer; required purchasing inputs; standards/grades overview; documentation; category selection guidance; links to published category pages; consultation path.
- **Required internal links:** `/procurement/requirements-and-specifications`, published material children, `/process`, `/request-consultation`.
- **Excluded ownership:** product catalog, SKU pages, stock claims, price tables, and near-duplicate pages by size or grade.
- **Schema candidate:** `CollectionPage`, `BreadcrumbList`.
- **Release gate:** Approved material scope and honest category descriptions.

### 7.10 `IND-000` — Industries and Buyer Types Hub

- **Route:** `/industries`
- **Primary keyword:** `تأمین آهن‌آلات برای پروژه‌ها و صنایع`
- **Secondary cluster:** `تأمین فولاد پروژه‌های ساختمانی`، `تأمین فولاد صنعتی`، `خرید آهن‌آلات EPC`، `تأمین آهن سازه فلزی`
- **Intent:** Determine whether Ahan Asa understands the visitor’s buying environment.
- **Title intent:** Industry and buyer fit without inventing sector experience.
- **Suggested title pattern:** `تأمین آهن‌آلات برای پروژه‌ها و صنایع | آهن آسا`
- **Required sections:** contractors/developers; industrial companies; EPC teams; fabricators; decision criteria by audience; common inputs; applicable capability links; evidence only if verified.
- **Required internal links:** `/procurement`, `/materials`, `/process`, `/request-consultation`; child industry pages only after publication.
- **Excluded ownership:** unsupported sector-experience claims and thin location/industry combinations.
- **Schema candidate:** `CollectionPage`, `BreadcrumbList`.
- **Release gate:** Audience needs must be specific and truthful even if child pages are deferred.

### 7.11 `ABOUT-001` — About Ahan Asa

- **Route:** `/about`
- **Primary keyword:** `آهن آسا`
- **Secondary cluster:** `درباره آهن آسا`، `Ahan Asa`، `شرکت آهن آسا`، `برند آهن آسا`
- **Intent:** Verify identity, positioning, values, governance, and credibility.
- **Title intent:** Brand name + procurement-management identity.
- **Suggested title pattern:** `درباره آهن آسا | مدیریت تأمین آهن‌آلات پروژه`
- **Required sections:** brand purpose; approved promise; who the company serves; method; values; team/legal identity when approved; actual experience and evidence; boundaries; contact path.
- **Required internal links:** `/procurement`, `/process`, `/contact`, `/request-consultation`; `/projects` when released.
- **Excluded ownership:** unsupported legacy, client, scale, award, facility, or geographic claims.
- **Schema candidate:** `AboutPage`, `Organization`, `BreadcrumbList`.
- **Release gate:** Legal entity, team information, history, and claims approved.

### 7.12 `FAQ-001` — Frequently Asked Questions

- **Route:** `/faq`
- **Primary keyword:** `سؤالات خرید و تأمین آهن‌آلات پروژه`
- **Secondary cluster:** question variants about process, required documents, supplier choice, quotation comparison, delivery, payment, geography, quantities, and response expectations.
- **Intent:** Resolve legitimate cross-cutting questions that do not deserve separate pages.
- **Title intent:** Practical answers about working with Ahan Asa and project steel procurement.
- **Suggested title pattern:** `سؤالات متداول تأمین آهن‌آلات پروژه | آهن آسا`
- **Required sections:** service scope; client inputs; process; material scope; quotation handling; documents; delivery; geography; minimum criteria if approved; data/privacy; contact.
- **Required internal links:** link each answer to its canonical capability, material, legal, or conversion page.
- **Excluded ownership:** long-form topics that should become insight articles; duplicated FAQ blocks copied across pages.
- **Schema candidate:** `FAQPage` only when questions and answers are visible and the current search-engine eligibility requirements are met; otherwise `WebPage`.
- **Release gate:** All answers approved by operational, commercial, and legal owners.

### 7.13 `CONTACT-001` — Contact

- **Route:** `/contact`
- **Primary keyword:** `تماس با آهن آسا`
- **Secondary cluster:** `شماره تماس آهن آسا`، `آدرس آهن آسا`، `ایمیل آهن آسا`
- **Intent:** Find verified business contact information and choose the correct contact path.
- **Title intent:** Direct navigational contact result.
- **Suggested title pattern:** `تماس با آهن آسا | اطلاعات ارتباطی`
- **Required sections:** verified phone/email/address/business hours as available; channel purpose; map only if accurate and useful; response expectations; consultation link; privacy note.
- **Required internal links:** `/request-consultation`, `/about`, `/privacy`.
- **Excluded ownership:** detailed RFQ form belongs to `/request-consultation`.
- **Schema candidate:** `ContactPage`, `Organization`, `BreadcrumbList`.
- **Release gate:** Contact information and channel ownership tested and approved.

### 7.14 `RFQ-001` — Request Procurement Consultation

- **Route:** `/request-consultation`
- **Primary keyword:** `استعلام تأمین آهن‌آلات پروژه`
- **Secondary cluster:** `درخواست خرید آهن‌آلات پروژه`، `استعلام خرید فولاد`، `ارسال لیست خرید آهن‌آلات`، `ارسال پیش‌فاکتور آهن`، `مشاوره خرید آهن‌آلات`
- **Intent:** Submit sufficient project information for a qualified first response.
- **Title intent:** Action-first, specific, and professional—not a generic contact page.
- **Suggested title pattern:** `درخواست مشاوره و استعلام تأمین آهن‌آلات | آهن آسا`
- **Required sections:** who the form is for; expected inputs; form; upload rules if approved; consent/privacy; response expectations; fallback channel; qualification note; success and error states.
- **Required internal links:** `/process`, `/faq`, `/privacy`, `/contact`.
- **Excluded ownership:** instant quote, guaranteed price, automated offer, and consumer checkout.
- **Schema candidate:** `WebPage`, `BreadcrumbList`; do not mark the form itself as a product or offer.
- **Release gate:** Working delivery destination, fallback, validation, consent, upload security, and analytics events.

### 7.15 Legal pages

#### `LEGAL-010` — Privacy Notice

- **Route:** `/privacy`
- **Keyword ownership:** brand navigational only.
- **Title pattern:** `حریم خصوصی | آهن آسا`
- **Required content:** collected data; purpose; legal basis as applicable; document uploads; retention; processors; cookies/analytics; user rights; contact; version date.
- **Release gate:** Legal review based on actual data handling.

#### `LEGAL-020` — Terms of Use

- **Route:** `/terms-of-use`
- **Keyword ownership:** brand navigational only.
- **Title pattern:** `شرایط استفاده از وب‌سایت | آهن آسا`
- **Required content:** site use; informational limitations; intellectual property; inquiry limitations; external links; liability; governing law; update date.
- **Release gate:** Legal review based on actual business and jurisdiction.

## 8. Master SEO Page Map — Conditional Material Pages

These pages are approved as page concepts but must remain unpublished until their material scope and content gates are satisfied.

| SEO ID | Route | Primary keyword | Secondary cluster | Release requirement |
|---|---|---|---|---|
| `MAT-010` | `/materials/structural-sections` | `تأمین مقاطع فولادی ساختمانی` | خرید تیرآهن عمده، خرید نبشی و ناودانی، تأمین تیرآهن پروژه | Confirm profiles, standards, sourcing scope, and unique procurement guidance |
| `MAT-020` | `/materials/rebar-and-wire` | `تأمین میلگرد پروژه` | خرید میلگرد عمده، خرید میلگرد ساختمانی، تأمین مفتول فولادی | Confirm categories, standards, grades, and procurement capability |
| `MAT-030` | `/materials/plates-sheets-and-coils` | `تأمین ورق فولادی پروژه` | خرید ورق سیاه عمده، خرید ورق فولادی، تأمین شیت و کویل | Confirm grades, forms, mills/sources if mentioned, and actual scope |
| `MAT-040` | `/materials/hollow-sections` | `تأمین قوطی و پروفیل فولادی` | خرید قوطی پروفیل عمده، خرید پروفیل ساختمانی، پروفیل صنعتی | Confirm sections, tolerances, standards, and commercial workflow |
| `MAT-050` | `/materials/pipes-and-tubes` | `تأمین لوله فولادی پروژه` | خرید لوله فولادی عمده، لوله صنعتی، لوله ساختمانی | Confirm industrial/building scope and applicable standards |
| `MAT-060` | `/materials/custom-and-fabricated-steel` | `تأمین قطعات فولادی سفارشی` | ساخت قطعات فولادی سفارشی، خرید قطعات فلزی پروژه، فولاد ساخته‌شده | Confirm whether Ahan Asa manages fabrication, procurement, or both |

### 8.1 Shared material-page content contract

Every published material page must contain:

1. a clear definition of the material group;
2. common project applications without overstating experience;
3. purchase inputs: grade, standard, dimensions, tolerances, quantity, surface/finish, documentation, delivery;
4. common quotation-comparison risks;
5. supplier and documentation considerations;
6. logistics and handling considerations where relevant;
7. scope boundaries and availability disclaimer;
8. links to requirement review, quotation comparison, documentation/quality, and consultation;
9. original and useful content—not a generic specification table copied from manufacturers;
10. no stock, price, mill, or delivery claim unless verified and maintainable.

### 8.2 Shared material-page metadata pattern

- **Title pattern:** `[Primary procurement phrase] | آهن آسا`
- **H1 pattern:** procurement-focused wording, not `فروش [محصول]`.
- **Description angle:** project requirement + comparison/control + consultation.
- **Schema candidate:** `Service` or `CollectionPage`; do not use `Product`, `Offer`, `AggregateOffer`, or price markup unless the page truly represents a purchasable product with compliant live data.

### 8.3 Material cannibalization guardrails

- Do not create pages for every size, thickness, grade, brand, or factory at launch.
- Do not create separate `خرید`, `فروش`, `قیمت`, and `مشخصات` pages for the same material.
- A material guide article may answer an informational question, but the material page remains the commercial owner.
- Filter, search, sort, and query-parameter states must not become indexable landing pages.

## 9. Master SEO Page Map — Post-Launch Industry Pages

| SEO ID | Route | Primary keyword | Intent | Publication gate |
|---|---|---|---|---|
| `IND-010` | `/industries/construction-and-development` | `تأمین آهن‌آلات پروژه‌های ساختمانی` | Procurement needs of contractors, developers, and project owners | Unique workflow, decision criteria, and verified examples |
| `IND-020` | `/industries/industrial-and-manufacturing` | `تأمین فولاد پروژه‌های صنعتی` | Procurement needs of factories and industrial projects | Unique material/document needs and approved scope |
| `IND-030` | `/industries/epc-and-infrastructure` | `تأمین آهن‌آلات پروژه‌های EPC` | Package-based procurement for EPC/infrastructure teams | Confirmed EPC support scope and credible evidence |
| `IND-040` | `/industries/steel-fabrication` | `تأمین آهن‌آلات سازندگان سازه فلزی` | Procurement needs of fabricators and installers | Clear distinction from other buyers and real operating fit |

Each industry child page must provide a genuinely different user problem, input set, risk profile, workflow, and evidence base. Replacing only the industry name in a shared template is not sufficient for publication.

## 10. Evidence Page Map

### 10.1 `PROJ-000` — Projects / Procurement Evidence Hub

- **Route:** `/projects`
- **Primary keyword:** `پروژه‌های تأمین آهن‌آلات`
- **Secondary cluster:** `نمونه پروژه تأمین فولاد`، `سوابق تأمین آهن‌آلات`، `مطالعه موردی خرید فولاد`
- **Intent:** Evaluate real evidence of method, scope, and outcomes.
- **Title pattern:** `پروژه‌ها و تجربه‌های تأمین آهن‌آلات | آهن آسا`
- **Required sections:** evidence methodology; filterable or grouped verified cases only if useful; scope legend; confidentiality explanation; links to capabilities and consultation.
- **Release gate:** Enough verified items to create a useful hub. No empty gallery and no fabricated anonymous cases.
- **Schema candidate:** `CollectionPage`, `ItemList`, `BreadcrumbList`.

### 10.2 `PROJ-100` — Project Detail Template

- **Route:** `/projects/[project-slug]`
- **Primary keyword pattern:** `[نام پروژه یا نوع پروژه] + [تأمین آهن‌آلات یا بسته فولادی]`
- **Secondary terms:** approved location, industry, material group, procurement challenge, and scope.
- **Intent:** Prove a specific procurement outcome and the limits of Ahan Asa’s role.
- **Title pattern:** `[نام پروژه] — [دامنه تأمین تأییدشده] | آهن آسا`
- **Required sections:** project context; verified challenge; exact Ahan Asa scope; material/package; method; approved metrics; result; boundaries; authentic media or redacted evidence; related service/material links.
- **Release gate:** Client permission, verified facts, approved images/documents, and no confidential disclosure.
- **Schema candidate:** `Article` or `CreativeWork` plus `BreadcrumbList`; do not use unsupported review or rating markup.

Project pages must not target generic material keywords already owned by `/materials/...`. Their primary query must remain specific to the project, application, or evidence story.

## 11. Insights Page Map

### 11.1 `INS-000` — Insights Hub

- **Route:** `/insights`
- **Primary keyword:** `راهنمای خرید و تأمین آهن‌آلات`
- **Secondary cluster:** `آموزش خرید آهن‌آلات پروژه`، `راهنمای تأمین فولاد`، `نکات خرید مقاطع فولادی`
- **Intent:** Discover original decision-support content.
- **Title pattern:** `راهنماهای خرید و تأمین آهن‌آلات | آهن آسا`
- **Release gate:** A useful set of original, reviewed articles; no empty archive.
- **Schema candidate:** `CollectionPage`, `Blog`, `BreadcrumbList`.

### 11.2 `INS-100` — Insight Article Template

- **Route:** `/insights/[article-slug]`
- **Primary keyword rule:** one informational question not already owned by a commercial page.
- **Required content:** direct answer; decision framework; examples/calculations when verified; risks; actionable checklist; sources or standards where applicable; author/reviewer; update date; next relevant commercial step.
- **Required links:** one parent hub; one canonical commercial owner; one next or related article where useful; consultation only when contextually justified.
- **Schema candidate:** `Article` or `BlogPosting`, `BreadcrumbList`.

### 11.3 Approved initial article opportunities

These are content opportunities, not automatically approved production URLs:

| Proposed topic | Primary query concept | Canonical commercial page to support | Risk |
|---|---|---|---|
| اطلاعات لازم برای استعلام حرفه‌ای آهن‌آلات | `اطلاعات لازم برای استعلام آهن` | `PROC-010` | Must not duplicate the consultation form |
| مقایسه پیش‌فاکتورهای آهن‌آلات | `نحوه مقایسه پیش‌فاکتور آهن` | `PROC-030` | Keep article educational; service page owns commercial intent |
| قیمت واحد یا هزینه کل خرید؟ | `هزینه کل خرید آهن‌آلات` | `PROC-030` | Avoid price-feed expectations |
| گواهی آنالیز فولاد چیست؟ | `گواهی آنالیز فولاد` | `PROC-040` | Technical review required |
| چک‌لیست تحویل آهن‌آلات در پروژه | `کنترل تحویل آهن‌آلات` | `PROC-050` | Clarify inspection responsibility |
| انتخاب تأمین‌کننده آهن‌آلات | `نحوه انتخاب تأمین‌کننده آهن` | `PROC-020` | Avoid unsupported supplier rankings |
| اشتباهات رایج در خرید پروژه‌ای فولاد | `اشتباهات خرید آهن‌آلات` | `/procurement` | Must be specific and evidence-based |
| چه زمانی خرید مرحله‌ای منطقی است؟ | `خرید مرحله‌ای آهن‌آلات` | `/process` | Avoid financial guarantees |

Any article slug must be short, stable, transliterated consistently according to `ROUTES.md`, and approved before publication.

## 12. Resources Page Map

### 12.1 `RES-000` — Resources Hub

- **Route:** `/resources`
- **Primary keyword:** `چک‌لیست و ابزار خرید آهن‌آلات`
- **Secondary cluster:** `فرم استعلام آهن‌آلات`، `چک‌لیست خرید فولاد`، `راهنمای مشخصات خرید آهن`
- **Intent:** Access durable procurement tools, templates, and technical resources.
- **Title pattern:** `چک‌لیست‌ها و منابع خرید آهن‌آلات | آهن آسا`
- **Release gate:** At least one complete, useful, owned, and approved resource plus meaningful hub context.
- **Schema candidate:** `CollectionPage`, `ItemList`, `BreadcrumbList`.

### 12.2 `RES-100` — Resource Detail Template

- **Route:** `/resources/[resource-slug]`
- **Primary keyword pattern:** exact tool or resource need.
- **Required content:** purpose; intended user; what is included; version/update date; usage instructions; limitations; preview or accessible summary; download/access rule; related commercial page.
- **Schema candidate:** `DigitalDocument`, `CreativeWork`, or `WebPage` as approved.
- **Release gate:** Real owned file/tool, clear version, accessibility, malware/security checks, and approved access policy.

### 12.3 Approved initial resource opportunities

| Proposed resource | Primary query concept | Supports |
|---|---|---|
| چک‌لیست اطلاعات موردنیاز استعلام آهن‌آلات | `چک‌لیست استعلام آهن‌آلات` | `PROC-010`, `RFQ-001` |
| الگوی مقایسه فنی و تجاری پیش‌فاکتورها | `فرم مقایسه پیش‌فاکتور آهن` | `PROC-030` |
| چک‌لیست مدارک سفارش فولاد | `چک‌لیست مدارک فولاد` | `PROC-040` |
| چک‌لیست برنامه‌ریزی تحویل | `چک‌لیست تحویل آهن‌آلات` | `PROC-050` |

Resources must provide substantive value without functioning as deceptive lead gates. If lead capture is used, access rules, consent, delivery, and privacy must be explicit and reliable.

## 13. Noindex and System Route Policy

| Route / family | Indexation | SEO handling |
|---|---|---|
| `/request-consultation/thank-you` | `noindex,nofollow` or `noindex,follow` per technical policy | No canonical to the form; exclude from sitemap |
| Framework 404 | Noindex | Return real 404 status; no sitemap entry |
| Framework error boundary | Noindex | Do not expose stack or sensitive information |
| `/maintenance` | Noindex | Use correct temporary status behavior when active |
| Draft/preview URLs | Noindex and access-controlled | Never include in public sitemap |
| Search/filter/query states | Noindex or canonical to clean owner URL | Do not create indexable duplicates |
| Upload/download delivery URLs | Noindex | Use stable resource detail page as discoverable owner |
| Unreleased locale routes | Must not exist publicly | No placeholder `/en`, `/ar`, or locale sitemap |

## 14. Metadata Intent Rules

### 14.1 Title tags

- Lead with the unique page intent; place `آهن آسا` at the end except on the homepage and brand pages.
- Keep titles natural and specific; do not repeat the same keyword with minor spelling variations.
- Avoid automatic strings such as `خرید | فروش | قیمت | مشخصات`.
- Do not promise price, stock, delivery, quality, or savings unless the page contains current verified support.
- Final pixel/character limits belong to `METADATA_SPEC.md`; truncation risk must be checked in QA.

### 14.2 H1 headings

- Exactly one primary H1 per rendered page.
- The H1 should express the visible value or decision, not mechanically copy the title.
- Persian must use correct نیم‌فاصله and natural word order.
- Dynamic detail H1 values must be human-approved, not generated from slugs.

### 14.3 Meta descriptions

Each description should combine:

1. the user’s task or problem;
2. Ahan Asa’s relevant method or differentiator;
3. an honest next step.

Descriptions must not contain invented numbers, urgency, prices, inventory, or guarantees.

### 14.4 Social metadata

- Open Graph titles may be more editorial but must preserve the page’s actual promise.
- Use approved branded images or authentic project/material imagery.
- Do not use imagery that implies facilities, inventory, clients, or services not owned or verified.
- Persian alt text should describe the image purpose and content, not stuff keywords.

## 15. Content Requirements for Every Indexable Page

Every indexable page must:

- answer its primary intent within the introductory viewport or opening section;
- contain unique Persian copy written for that page;
- explain scope and limitations where ambiguity could mislead;
- use meaningful headings that cover relevant subtopics;
- link to its parent or hub page;
- link to the logical next decision or action;
- include evidence only when verified;
- identify author, reviewer, date, or version where freshness and expertise matter;
- render core content server-side or statically;
- provide useful content without requiring interaction, animation, or form completion;
- avoid boilerplate duplication across page families;
- pass accessibility and mobile readability requirements.

## 16. Internal-Link Ownership Matrix

| Source family | Must link to | Purpose |
|---|---|---|
| Homepage | Procurement, Process, Materials, Industries, Consultation | Establish primary paths |
| Procurement hub | Five capability pages, Process, Consultation | Distribute broad service authority |
| Capability page | Procurement hub, adjacent capability, Process or Material, Consultation | Maintain stage context |
| Process | Relevant capability per step, FAQ, Consultation | Connect sequence to detail and action |
| Materials hub | Published material pages, Requirements, Consultation | Connect category interest to controlled procurement |
| Material detail | Requirements, Quotation Comparison, Documentation, Consultation | Prevent commodity-only interpretation |
| Industries hub/detail | Procurement, relevant materials, evidence, Consultation | Prove audience fit |
| Project detail | Relevant capability, material, industry, Consultation | Transfer evidence to commercial owners |
| Insight article | One commercial owner, related article/resource | Support topical authority without cannibalization |
| Resource detail | One commercial owner, relevant insight, Consultation when appropriate | Turn tools into qualified next steps |
| FAQ | Canonical answer owner pages | Avoid isolated generic answers |
| About | Procurement, Process, Contact, evidence | Convert trust into evaluation |
| Contact | Consultation, Privacy | Route detailed inquiries correctly |
| Consultation | Process, FAQ, Privacy, Contact fallback | Reduce uncertainty and abandonment |

Exact anchor-text diversity and link counts belong to `INTERNAL_LINKING.md`.

## 17. Cannibalization Register

| Cluster | Canonical owner | Pages that may support but not target it |
|---|---|---|
| `تأمین آهن‌آلات پروژه` | `/` | `/procurement`, `/materials`, `/industries` |
| `مدیریت تأمین آهن‌آلات` | `/procurement` | `/`, `/process`, capability pages |
| `فرایند خرید آهن‌آلات پروژه` | `/process` | `/procurement`, `/faq` |
| `مقایسه پیش‌فاکتور آهن‌آلات` | `/procurement/quotation-comparison` | related insight/resource |
| `ارزیابی تأمین‌کننده آهن‌آلات` | `/procurement/sourcing-and-supplier-evaluation` | related insight |
| `کنترل کیفیت و مدارک آهن‌آلات` | `/procurement/documentation-and-quality-control` | material pages, insight/resource |
| `هماهنگی حمل و تحویل آهن‌آلات` | `/procurement/logistics-and-delivery` | process and material pages |
| Broad material-category queries | relevant `/materials/...` page | hub, insights, projects |
| Brand query `آهن آسا` | `/about` for identity; `/` for brand + service | Contact and legal pages |
| Qualified inquiry query | `/request-consultation` | homepage and contact page |

If two pages begin ranking for the same query with unstable positions, do not immediately merge them. First inspect intent, internal anchors, titles, content overlap, backlinks, and SERP composition. Consolidate only when the pages do not serve distinct user needs.

## 18. URL and Canonical Rules

- Phase 1 Persian pages use unprefixed routes.
- Use lowercase ASCII slugs with hyphens.
- Do not translate or change an approved slug after publication without a redirect.
- Canonical URLs must be absolute and self-referencing for indexable pages.
- Examples in this document assume `https://ahanassa.com`; the final canonical hostname must match deployment configuration.
- Only canonical indexable URLs belong in the XML sitemap.
- Trailing-slash behavior must be consistent sitewide.
- Query parameters, UTM parameters, filters, print views, and share states must not create canonical duplicates.
- Future `/en` or `/ar` pages require complete locale content, self-canonicals, and reciprocal hreflang. Unsupported translations must not be published.

## 19. Structured-Data Intent by Page Family

| Page family | Candidate types | Prohibited or conditional behavior |
|---|---|---|
| Homepage | `Organization`, `WebSite`, `WebPage` | No invented rating, review, or social profiles |
| About | `AboutPage`, `Organization` | Legal name, address, and identifiers must be verified |
| Procurement capability | `Service`, `WebPage`, `BreadcrumbList` | Do not imply service area or offer terms without support |
| Hubs | `CollectionPage`, `ItemList`, `BreadcrumbList` | Item list must match visible content |
| Material pages | `Service` or `CollectionPage` | `Product`/`Offer` only if a real compliant offer exists |
| Insight article | `Article` or `BlogPosting`, `BreadcrumbList` | Author, date, and image must match visible content |
| Project detail | `Article` or `CreativeWork`, `BreadcrumbList` | No fake reviews, dates, or clients |
| Resource detail | `DigitalDocument` or `CreativeWork` | File, version, and access must be real |
| FAQ | `FAQPage` only when eligible | All Q&A must be visible and non-promotional |
| Process | `HowTo` only when genuinely eligible | Do not force process marketing copy into HowTo markup |

Final type selection and properties belong to `STRUCTURED_DATA.md`.

## 20. Publication and Indexation Gates

An approved route becomes `index,follow` only when all of the following are true:

- the page is approved in `SITEMAP.md`;
- its primary keyword and intent have an owner in this document;
- the page has unique, complete, approved Persian content;
- claims and evidence have been verified;
- the route returns HTTP 200 and is not blocked;
- canonical, title, description, H1, OG data, and breadcrumbs are correct;
- the page is reachable through intentional internal links;
- mobile, accessibility, performance, and form states pass QA;
- structured data, if present, matches visible content and validates;
- the page is included in the correct sitemap only after publication;
- no unresolved cannibalization or thin-content issue remains.

Conditional or post-launch pages must not be placed online as `Coming soon` indexable placeholders.

## 21. SEO Data Validation Plan

Before final content approval, validate each primary and secondary cluster using:

1. Google Search Console data when the domain has enough impressions;
2. Google Keyword Planner or another approved keyword dataset;
3. Google SERP inspection from the target market and language;
4. competitor and adjacent-category SERP analysis;
5. sales-call, inquiry, quotation, and CRM language;
6. internal stakeholder terminology;
7. post-launch landing-page performance and query data.

For each cluster, record:

- exact query;
- normalized cluster;
- language and country;
- intent;
- volume range and source/date;
- competition or difficulty source/date;
- SERP page types;
- current owner URL;
- recommended action: keep, refine, merge, split, defer, or reject.

Do not invent exact search volumes or ranking forecasts.

## 22. Measurement by Page Type

| Page type | Primary organic KPI | Secondary KPI |
|---|---|---|
| Homepage | Non-brand + brand qualified organic entrances | Navigation to procurement or consultation |
| Procurement hub | Impressions/clicks for management cluster | Child-page and consultation progression |
| Capability pages | Qualified non-brand clicks | Assisted inquiry conversions |
| Process | Organic entrances for process questions | Start of consultation path |
| Materials | Category-cluster visibility | Qualified material inquiries |
| Industries | Audience-fit visibility | Evidence and inquiry progression |
| Projects | Organic evidence discovery | Assisted conversion and engaged time |
| Insights | Informational clicks and query coverage | Links to commercial owner pages |
| Resources | Resource-intent visibility and successful access | Qualified follow-up actions |
| FAQ | Long-tail question coverage | Reduced form abandonment / next-page clicks |
| Consultation | Organic and assisted lead completions | Form start-to-submit rate |

Rankings alone are not sufficient. Organic performance must be judged by qualified traffic, correct landing-page ownership, and business-relevant actions.

## 23. Implementation Data Shape

The site may represent the map in typed content data similar to:

```ts
type SeoPageMapEntry = {
  seoId: string;
  route: string;
  locale: "fa";
  status: "launch-core" | "launch-conditional" | "post-launch";
  indexation: "index" | "noindex";
  primaryIntent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  excludedKeywords: string[];
  titleIntent: string;
  h1Intent: string;
  descriptionIntent: string;
  parentRoute?: string;
  requiredLinks: string[];
  schemaCandidates: string[];
  releaseGate: string[];
};
```

This type is illustrative. The final location, naming, and implementation belong to the technical architecture and coding standards.

## 24. Claude Code Implementation Rules

Claude Code must:

- use this file as the page-level SEO ownership source;
- cross-check every route against `SITEMAP.md` before implementation;
- preserve Persian unprefixed canonical routes for Phase 1;
- not generate new landing pages from keyword variants without approval;
- not convert material pages into retail product or price pages;
- not publish conditional pages until their gates are documented as satisfied;
- not invent keyword volumes, client facts, prices, inventory, locations, metrics, or guarantees;
- keep metadata, H1, breadcrumbs, navigation labels, and visible content aligned;
- flag conflicts between this document and approved sitemap, keyword, route, or page-specification files;
- record material SEO ownership changes in `DECISIONS.md` and `CHANGELOG.md`;
- verify rendered metadata and indexation behavior, not only source-code values.

## 25. SEO QA Checklist per URL

- [ ] Route exists in `SITEMAP.md`.
- [ ] Publication status and release gate are satisfied.
- [ ] One primary intent and owner keyword are defined.
- [ ] Title is unique and matches intent.
- [ ] One visible H1 is present.
- [ ] Meta description is unique, accurate, and non-deceptive.
- [ ] Canonical resolves to the preferred 200 URL.
- [ ] Robots directive matches publication status.
- [ ] Page is included or excluded from XML sitemap correctly.
- [ ] Persian text, نیم‌فاصله, punctuation, and RTL behavior are correct.
- [ ] Core copy is server-rendered or statically rendered.
- [ ] Required parent and next-step links are present.
- [ ] Anchor text does not create ownership conflicts.
- [ ] Images have useful alt text and verified provenance.
- [ ] Structured data matches visible content and validates.
- [ ] No unsupported price, stock, supplier, facility, client, or delivery claim exists.
- [ ] Mobile layout and Core Web Vitals targets pass.
- [ ] Accessibility checks pass.
- [ ] Analytics events do not expose sensitive form or upload data.
- [ ] Search Console inspection is scheduled after launch where appropriate.

## 26. Open Decisions

The following remain unresolved and must not be guessed:

- exact final keyword priority based on Iran-specific search data;
- whether material child pages are operationally approved for launch;
- whether Ahan Asa directly supplies, manages procurement, or uses a hybrid model by category;
- geographic service and delivery coverage;
- minimum project value or quantity;
- approved suppliers, mills, brands, standards, and product scope that may be named publicly;
- inspection, laboratory, logistics, warehousing, customs, and insurance responsibility;
- verified projects and evidence available for publication;
- final Persian title/description copy after keyword validation;
- the final canonical hostname (`ahanassa.com` versus an approved `www` host);
- future English or Arabic keyword and URL strategy.

Until these decisions are approved, the map controls page intent and architecture but must not be treated as permission to publish unresolved claims.

## 27. Definition of Done

This document becomes **Approved** when:

- every Launch Core indexable route has an accepted primary intent;
- each strategic keyword cluster has one canonical owner;
- material and industry publication gates are confirmed;
- overlaps with `SEO_KEYWORD_MAP.md` are resolved;
- routes match `SITEMAP.md` and `ROUTES.md`;
- metadata intent is accepted for all Launch Core pages;
- content owners and reviewers are assigned;
- unresolved operational claims remain clearly blocked;
- implementation and SEO QA teams can use the map without guessing.

---

## Approval Record

| Role | Name | Status | Date |
|---|---|---|---|
| Project Owner | A.M. Taleghani | Pending | — |
| SEO Approval | TBD | Pending | — |
| Content Approval | TBD | Pending | — |
| Commercial Approval | TBD | Pending | — |
| Technical Approval | TBD | Pending | — |
