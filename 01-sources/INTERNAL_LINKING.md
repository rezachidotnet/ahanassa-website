# Ahan Asa Website — Internal Linking Architecture

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `INTERNAL_LINKING.md`  
> **Version:** 1.0  
> **Status:** Implementation baseline  
> **Last updated:** 2026-08-25  
> **Primary locale:** Persian (`fa-IR`), fully RTL  
> **Document language:** English, with approved Persian interface examples

---

## 1. Purpose

This document defines the internal-link architecture for the Ahan Asa website: which pages must link to one another, why each link exists, how anchor text is written, where links appear, how link equity flows, and how the system is validated.

The architecture must help users and search engines understand that Ahan Asa is a professional B2B steel procurement-management partner and protector of client capital—not an online steel shop, public price board, marketplace, stock catalog, or supplier directory.

The system is designed to:

- make the procurement model understandable within a small number of clicks;
- connect each commercial page to a relevant next decision;
- reinforce distinct page topics without creating keyword cannibalization;
- distribute authority from strong hubs to approved child pages;
- give important pages sufficient contextual inbound links;
- connect educational content to commercial pages without making it promotional;
- lead qualified users toward the canonical request flow;
- prevent orphan, dead-end, duplicate, placeholder, and over-linked pages;
- remain crawlable, accessible, Persian-first, and compatible with future locales.

Internal links are part of the product experience, content model, SEO system, and conversion system. They must not be added as an afterthought or generated solely from repeated keywords.

---

## 2. Source of Truth and Conflict Rules

Internal-link decisions must follow this authority order:

1. approved owner decisions in `DECISIONS.md`;
2. `PROJECT_BRIEF.md`;
3. `SITEMAP.md` for page existence and parent–child relationships;
4. `INFORMATION_ARCHITECTURE.md` for user journeys and content grouping;
5. `ROUTES.md` for exact paths, parameters, locale behavior, and route status;
6. `SEO_KEYWORD_MAP.md` for query and topic ownership;
7. `SEO_PAGE_MAP.md` for page-level SEO purpose;
8. `CONTENT_STRATEGY.md` and `CONTENT_MODEL.md` for editorial relationships;
9. `CTA_STRATEGY.md` for conversion actions;
10. this file for internal-link obligations and implementation rules.

If a path in this file differs from `ROUTES.md`, `ROUTES.md` wins. If a page is not approved in `SITEMAP.md`, it must not be published or linked merely because it appears in a component, CMS record, or older draft.

### 2.1 Current approved architecture

The current architecture uses these primary route families:

- `/procurement` for procurement-management capabilities;
- `/process` for the collaboration and purchasing process;
- `/materials` for material-group guidance;
- `/industries` for buyer and industry needs;
- `/projects` for verified evidence, only when released;
- `/insights` for editorial knowledge, only when released;
- `/resources` for durable tools and downloads, only when released;
- `/request-consultation` as the canonical acquisition flow.

Older draft paths such as `/services`, `/products`, `/how-it-works`, or `/request` must not be used unless `ROUTES.md` explicitly defines them as redirects. Never preserve an obsolete route through an internal link.

### 2.2 Conditional dependencies

`SEO_KEYWORD_MAP.md` and `SEO_PAGE_MAP.md` remain mandatory inputs before final production anchor optimization. Until those documents are approved:

- use descriptive, natural Persian anchors;
- derive topics from the visible page purpose and approved sitemap label;
- do not invent exact-match keyword targets;
- do not split pages merely to create more link destinations;
- record unresolved topic ownership before launch.

---

## 3. Strategic Linking Model

The link system follows the buyer journey:

1. **Discover** — understand what Ahan Asa manages.
2. **Understand** — learn how procurement is controlled.
3. **Evaluate** — review relevant material, industry, and decision guidance.
4. **Trust** — examine verified evidence, process, boundaries, and company information.
5. **Qualify** — identify required inputs and suitable scope.
6. **Act** — send an invoice, BOQ, or purchase list.
7. **Handoff** — receive confirmation and a clear operational next step.

Links should move users forward or laterally to relevant supporting information. They must not repeatedly pull every user back to the homepage.

### 3.1 Authority-flow model

```text
Homepage
├── Procurement hub
│   ├── Requirements and specifications
│   ├── Sourcing and supplier evaluation
│   ├── Quotation comparison
│   ├── Documentation and quality control
│   └── Logistics and delivery coordination
├── Process
├── Materials hub
│   └── Approved material pages
├── Industries hub
│   └── Approved industry pages
├── Verified evidence
│   └── Approved project details
├── Knowledge
│   ├── Insights and articles
│   └── Resources and tools
└── Request consultation
```

The homepage distributes authority to core hubs. Hubs distribute authority to their approved children. Detail pages return context to their parent hub and connect to the most relevant adjacent decision page. Knowledge and evidence pages support commercial pages; commercial pages selectively return users to the most useful knowledge or evidence.

---

## 4. Internal-Link Layers

Every internal link belongs to one of the following layers.

| Layer | Purpose | Typical component | Sitewide? |
|---|---|---|---|
| Global navigation | Expose primary destinations | Header, mobile drawer | Yes |
| Global support | Expose secondary, legal, and contact destinations | Footer, utility navigation | Yes |
| Hierarchical | Show parent–child structure | Hub cards, breadcrumbs | On relevant families |
| Contextual | Explain or continue a decision | Inline text link, callout | Page-specific |
| Related-content | Offer a small set of genuinely adjacent pages | Related links block | Page-specific |
| Evidence | Connect a claim to verified support | Case-study link, proof reference | When evidence exists |
| Educational | Connect a commercial question to a guide or resource | Guide/resource link | When helpful |
| Conversion | Move a qualified user into the request flow | CTA link/button | Major decision pages |
| Transactional | Support an active request or confirmation | Confirmation link | System/flow pages |

No single layer should carry the whole architecture. A page appearing only in the XML sitemap or footer is not considered adequately integrated.

---

## 5. Global Rules

### 5.1 Link only to canonical, live routes

- Every internal link must use the canonical path defined in `ROUTES.md`.
- Do not link through redirects.
- Do not link to `conditional`, `reserved`, draft, preview, staging, deleted, or placeholder routes.
- Do not link to a dynamic record until its publication state, canonical slug, evidence state, and indexation rule are approved.
- Do not link to a URL that returns `3xx`, `4xx`, `5xx`, soft-404, or incomplete placeholder content.
- Use root-relative URLs in the application unless an absolute canonical URL is technically required.
- Follow the project-wide trailing-slash and lowercase rules from `ROUTES.md`.

### 5.2 Use real anchors

Public navigation must use crawlable HTML anchors with valid `href` values. In Next.js, use the approved `Link` abstraction when client-side navigation is useful, while preserving rendered `<a href>` semantics.

Do not use:

- `div`, `span`, or button elements as substitutes for links;
- `onClick`-only navigation;
- JavaScript-generated URLs unavailable in initial HTML;
- links hidden until client-side data fetching completes;
- inaccessible nested interactive controls;
- empty anchors or icon-only anchors without accessible names.

### 5.3 Do not use `nofollow` on normal internal links

Normal internal navigation, contextual links, breadcrumbs, and conversion links must remain followable. Do not attempt to sculpt authority with `rel="nofollow"`.

Use link attributes only for their actual purpose:

- `aria-current="page"` for the current destination;
- `hreflang` only in approved locale alternates, not ordinary content links;
- `download` only for real downloadable resources where that behavior is intended;
- `target="_blank"` only when a documented UX reason exists, never by default.

### 5.4 One canonical destination per concept

Each dominant topic must have one owner page. Multiple anchors may vary naturally, but they must point to the same canonical owner when they express the same intent.

Do not create competing pages for:

- procurement management;
- the procurement process;
- a single material group;
- a single industry need;
- one guide topic;
- one project or resource.

### 5.5 Relevant links before numerous links

Every link must answer at least one question:

- Does this clarify the current topic?
- Does this help the user evaluate the purchase?
- Does this prove a visible claim?
- Does this show the parent, child, or next stage?
- Does this help prepare a qualified request?

If none applies, remove the link.

---

## 6. Canonical Route Families and Status

| Family | Canonical pattern | Status | Link rule |
|---|---|---|---|
| Home | `/` | Launch Core | Linked by logo and selected contextual references; not used as a universal fallback |
| Procurement hub | `/procurement` | Launch Core | Strong global and contextual inbound links |
| Procurement capability | `/procurement/[approved-slug]` | Launch Core | Linked from hub, relevant process steps, material/industry pages, and related capability pages |
| Process | `/process` | Launch Core | Linked globally and from pages explaining scope or next steps |
| Materials hub | `/materials` | Launch Core | Linked globally and from procurement/process content |
| Material detail | `/materials/[approved-slug]` | Conditional | Link only after category release gate passes |
| Industries hub | `/industries` | Launch Core | Linked globally and from relevant commercial content |
| Industry detail | `/industries/[approved-slug]` | Post-Launch | Link only after unique content and evidence approval |
| Projects hub | `/projects` | Conditional | Link only after evidence release gate passes |
| Project detail | `/projects/[project-slug]` | Conditional | Link only to verified published projects |
| Insights hub | `/insights` | Conditional | Link only when hub has a useful approved collection |
| Insight detail | `/insights/[article-slug]` | Conditional | Link from relevant topic owners; no forced reciprocal linking |
| Resources hub | `/resources` | Conditional | Link only when at least one useful resource and hub context are live |
| Resource detail | `/resources/[resource-slug]` | Conditional | Link from relevant decision pages and guides |
| About | `/about` | Launch Core | Global/footer plus trust-context links |
| FAQ | `/faq` | Launch Core | Footer and contextual links from questions the page expands |
| Contact | `/contact` | Launch Core | Utility/footer; lower priority than the primary request flow |
| Consultation request | `/request-consultation` | Launch Core | Canonical primary conversion destination |
| Thank-you | `/request-consultation/thank-you` | System/noindex | Reach only after valid submission; never place in navigation or content |
| Legal | `/privacy`, `/terms-of-use` | Required when approved | Footer and relevant form consent only |

Approved procurement child paths are:

- `/procurement/requirements-and-specifications`;
- `/procurement/sourcing-and-supplier-evaluation`;
- `/procurement/quotation-comparison`;
- `/procurement/documentation-and-quality-control`;
- `/procurement/logistics-and-delivery`.

Approved conditional material paths are:

- `/materials/structural-sections`;
- `/materials/rebar-and-wire`;
- `/materials/plates-sheets-and-coils`;
- `/materials/hollow-sections`;
- `/materials/pipes-and-tubes`;
- `/materials/custom-and-fabricated-steel`.

Conditional pages must not appear in components, navigation, footer, sitemap, related-content lists, or editorial copy before publication approval.

---

## 7. Page-Level Link Obligations

The following matrix defines minimum relationships. “Required” means the link must exist when the destination is live and contextually supported.

| Source page/family | Required outgoing links | Preferred contextual links | Required inbound sources |
|---|---|---|---|
| Homepage | Procurement hub, Process, Materials hub, Industries hub, primary request | About; live evidence; selected live guide/resource | Logo, not-found recovery, selected brand references |
| Procurement hub | Five procurement children, Process, primary request | Materials, Industries, verified evidence, relevant resources | Header, Homepage, Footer, procurement children, related knowledge |
| Procurement child | Procurement hub, relevant next/previous capability, Process, primary request | Relevant material/industry, one useful guide/resource, verified evidence | Procurement hub, related capability, relevant material/industry/knowledge |
| Process | Procurement hub, relevant capability pages, primary request | Materials, FAQ, relevant resource | Header, Homepage, Footer, commercial pages, CTA secondary links |
| Materials hub | Published material children, Procurement hub, Process, primary request | Requirements, quotation comparison, documentation, relevant guides | Header, Homepage, Footer, procurement and industry pages |
| Material detail | Materials hub, Requirements, relevant procurement capability, primary request | Industry page, guide/resource, verified project | Materials hub, relevant procurement/industry/knowledge pages |
| Industries hub | Procurement hub, Process, Materials hub, primary request | Published industry children, verified evidence | Header, Homepage, Footer, relevant commercial pages |
| Industry detail | Industries hub, relevant material groups, relevant capability, primary request | Project, guide, resource | Industries hub, related materials, knowledge, verified project |
| Projects hub | Published project details, Procurement hub, primary request | Relevant capabilities, materials, industries | Homepage when approved, Header/Footer when approved, About, related pages |
| Project detail | Projects hub, capability used, relevant material/industry, primary request | Related guide/resource; next relevant project | Projects hub, directly related commercial pages, selected insight/resource |
| Insights hub | Published articles, Procurement or Materials hub | Resources and primary request with low visual weight | Header/Footer only after release, Homepage selected content |
| Insight article | Parent hub, one or two topic-owner pages | Relevant resource, verified project, request CTA when intent is commercial | Insights hub, relevant topic owner, related articles where genuinely useful |
| Resources hub | Published resources, relevant commercial hubs | Insights and primary request | Header/Footer only after release, Homepage selected content |
| Resource detail | Parent hub, topic-owner page, relevant process/capability | Related insight, request flow | Resources hub, relevant commercial and editorial pages |
| About | Procurement hub, Process, Contact, primary request | Verified projects/evidence | Header/Footer, Homepage, trust sections, selected articles |
| FAQ | Procurement hub, Process, relevant topic owner, primary request | Contact for non-procurement support | Footer, contextual question references, request page help |
| Contact | Primary request for procurement needs, About, Privacy | FAQ | Utility navigation, Footer, About, system recovery |
| Request page | Process, Privacy, FAQ or Contact for support | Relevant preparation resource | Header CTA, Homepage, every major commercial page, contextual CTAs |

### 7.1 Minimum inbound-link rule

Every indexable launch page must have:

- at least one structural inbound link from a parent, hub, header, or footer;
- at least one contextual inbound link from another relevant indexable page where a natural relationship exists;
- a crawl depth appropriate to its importance;
- no dependency on search, filters, JavaScript state, or XML sitemap discovery alone.

New detail pages should not be published until their inbound-link plan is approved.

---

## 8. Homepage Linking Rules

The homepage is the strongest discovery and authority-distribution page. It must link to the site’s major live decisions without becoming a directory.

Required homepage links:

1. procurement-management hub;
2. procurement process;
3. materials hub;
4. industries hub;
5. canonical request flow;
6. about/trust destination where context supports it.

Conditional homepage links:

- published material children featured in a material-group section;
- verified projects in an evidence section;
- selected insights or resources in a knowledge section;
- FAQ page through a clear “more questions” link.

Rules:

- Every featured card must have one canonical destination.
- A whole-card link may be used only with accessible, valid markup; do not add several nested anchors to the same destination.
- Avoid repeating the same destination with identical visible anchors in adjacent sections.
- The primary CTA may appear in more than one strategic location, but repeated instances must serve different journey moments and use consistent labeling.
- Do not link to all detail pages from the homepage merely to reduce crawl depth.
- Conditional families disappear cleanly when unpublished; no empty headings or “coming soon” cards remain.

---

## 9. Hub-and-Cluster Rules

### 9.1 Hub responsibilities

Every hub must:

- introduce the family and its decision value;
- link to every published direct child;
- use unique summaries rather than duplicate child-page introductions;
- explain how child topics relate;
- link to the most relevant next-stage hub or process page;
- provide a proportionate path to the request flow;
- receive a breadcrumb or contextual return link from every child.

### 9.2 Child responsibilities

Every child page must:

- link back to its parent hub;
- link to one or two adjacent children only when the user relationship is real;
- link to the next useful decision, not automatically to every sibling;
- avoid copying a generic “related services” block across the whole family;
- link to a relevant guide, resource, or project only when published and useful;
- provide the canonical request action with editable topic context where approved.

### 9.3 Sibling-link rule

Sibling links are not mandatory merely because pages share a parent. Use them when:

- one capability naturally follows another;
- two materials are commonly evaluated together;
- a guide explicitly compares or distinguishes the sibling topics;
- a project includes both topics;
- the next page resolves a predictable user question.

Do not render a complete sibling list at the bottom of every page if the parent hub already performs that job.

---

## 10. Procurement Capability Sequence

The procurement family may use a logical decision sequence:

1. `/procurement/requirements-and-specifications`
2. `/procurement/sourcing-and-supplier-evaluation`
3. `/procurement/quotation-comparison`
4. `/procurement/documentation-and-quality-control`
5. `/procurement/logistics-and-delivery`

This sequence is conceptual, not a rigid carousel. Each capability page should link to the most likely previous or next decision only when the page copy supports it.

Recommended contextual relationships:

| Page | Strongest adjacent destination | Reason |
|---|---|---|
| Requirements and Specifications | Sourcing and Supplier Evaluation | Clear inputs enable reliable sourcing |
| Sourcing and Supplier Evaluation | Quotation Comparison | Suitable options must be compared consistently |
| Quotation Comparison | Documentation and Quality Control | Commercial comparison must include documentation and compliance |
| Documentation and Quality Control | Logistics and Delivery | Approved documents and responsibilities support controlled delivery |
| Logistics and Delivery | Process or Request | The user can understand the full workflow or begin an inquiry |

Use natural contextual phrasing. Do not label the pages “Step 1–5” unless the approved service workflow formally defines them as fixed steps.

---

## 11. Materials Linking Rules

Material pages support procurement decisions; they are not catalog or inventory pages.

Every published material page should link to:

- `/materials` as parent context;
- `/procurement/requirements-and-specifications` for information quality;
- one additional procurement capability based on the material’s actual buying risk;
- `/process` when the buyer needs workflow clarity;
- `/request-consultation` with approved, editable material context;
- one relevant guide/resource or project when real content exists.

Examples of useful relationships:

- specification-heavy materials → Requirements and Documentation pages;
- supplier-sensitive materials → Sourcing and Supplier Evaluation;
- commercially complex orders → Quotation Comparison;
- staged or site-sensitive deliveries → Logistics and Delivery.

Prohibited behavior:

- auto-linking every mention of `میلگرد`, `ورق`, `پروفیل`, `لوله`, or other product words;
- linking unapproved grade, standard, size, brand, factory, city, or price pages;
- generating filter URLs as crawlable landing pages;
- creating material links that imply live inventory, official dealership, lowest price, or guaranteed supply;
- linking a generic phrase such as `محصولات` to different destinations on different pages.

---

## 12. Industry Linking Rules

The launch Industries hub may serve multiple buyer groups on one complete page. Individual industry pages remain unpublished until each has unique needs, workflow, proof, and content ownership.

When industry children are approved, each must link to:

- `/industries`;
- the relevant procurement capability or capabilities;
- the relevant published material group pages;
- `/process`;
- verified industry evidence, when available;
- `/request-consultation`.

Do not publish or link industry pages that merely replace the industry name in a shared template. A distinct internal-link neighborhood is one release criterion: each page should have at least two meaningful topical relationships beyond its parent and CTA.

---

## 13. Projects and Evidence Links

Projects exist to substantiate visible claims. They must not be used as decorative galleries or fabricated social proof.

### 13.1 Project detail requirements

A published project detail should link to:

- the Projects hub;
- the procurement capability actually demonstrated;
- the material and industry pages actually involved, if those pages are live;
- a related guide/resource only when it explains a decision present in the case;
- the request flow with neutral, non-guaranteeing copy.

### 13.2 Commercial-page evidence links

A commercial page may link to a project only when:

- the project fact is verified and approved;
- the visible claim and project evidence directly correspond;
- the anchor accurately describes what the reader will see;
- the project page does not imply a broader capability than the evidence supports.

Avoid generic anchors such as `نمونه کار` when a more descriptive phrase is possible, for example:

- `مشاهده نمونه مدیریت تأمین این پروژه`
- `بررسی تجربه هماهنگی خرید و تحویل`

Do not link client names, statistics, certificates, supplier logos, or outcome claims to unrelated pages.

---

## 14. Insights and Resources Links

### 14.1 Editorial-to-commercial links

An insight article should contain a small number of useful links to canonical topic owners. Links must appear where the reader needs the next explanation, not in keyword-stuffed paragraphs.

Typical pattern:

- article → relevant procurement capability;
- article → relevant material or industry page;
- article → supporting resource/checklist;
- article → request flow only when the reader is likely ready to act.

### 14.2 Commercial-to-editorial links

Commercial pages may link to a guide or resource that reduces uncertainty. They should not display a generic feed of the latest articles when topic relevance is unknown.

### 14.3 Related-content limit

Use a curated set, normally two to four items. Prefer topical adjacency over recency. Each item must have:

- a real destination;
- a unique descriptive title;
- an approved publication state;
- a visible relationship to the current page;
- no duplicate destination elsewhere in the same block.

### 14.4 Archives and taxonomy

Tag, author, date, filter, and search-result URLs must not become indexable internal-link targets during Phase 1 unless separately approved in the sitemap and SEO map. Taxonomy chips may filter the current interface without generating crawlable thin archives.

---

## 15. Conversion Linking

The canonical primary conversion is:

> **ارسال فاکتور یا لیست خرید** → `/request-consultation`

All major commercial pages must provide a clear path to this single flow. Do not create separate forms or destination paths for every material, service, article, or campaign.

### 15.1 Approved supporting anchors

- `ارسال فاکتور یا لیست خرید`
- `ارسال لیست خرید برای بررسی`
- `درخواست مشاوره خرید`
- `آشنایی با فرآیند خرید` → `/process`
- `تماس با ما` → `/contact`

Topic-specific conversion labels are allowed only for approved live topics, for example:

- `ارسال درخواست خرید ورق`
- `ارسال درخواست خرید پروفیل`
- `درخواست بررسی مشخصات فنی`

### 15.2 Context passing

When the request flow accepts source context:

- pass only an approved non-sensitive topic key or source identifier;
- keep all fields editable by the user;
- do not place personal, commercial, document, or project data in the URL;
- canonicalize the request page to `/request-consultation`;
- prevent query variants from entering the XML sitemap or becoming indexable;
- do not use internal UTM parameters.

### 15.3 CTA restraint

Internal linking must not turn every paragraph into a conversion prompt. A page may include:

- a primary action at the appropriate decision point;
- an optional mid-page contextual action after sufficient explanation;
- a final action after scope, process, or proof.

Adjacent repeated CTA links should be consolidated. Trust and clarity must precede pressure.

---

## 16. Anchor Text System

### 16.1 Anchor principles

Anchor text must be:

- clear in Persian without surrounding context where practical;
- descriptive of the destination;
- natural in the sentence;
- consistent with the destination’s approved topic;
- varied only when user intent varies;
- free from exaggerated claims or keyword stuffing.

### 16.2 Anchor types

| Type | Example | Use |
|---|---|---|
| Exact destination label | `فرآیند همکاری` | Navigation, hubs, breadcrumbs |
| Descriptive partial phrase | `روش مقایسه پیشنهادهای خرید` | Contextual editorial links |
| Action-oriented | `ارسال فاکتور یا لیست خرید` | Canonical conversion |
| Evidence-oriented | `مشاهده تجربه مدیریت تأمین پروژه` | Verified project links |
| Educational | `راهنمای آماده‌سازی لیست خرید` | Insight/resource links |
| Parent reference | `بازگشت به گروه‌های کالایی` | Breadcrumb or contextual return |

### 16.3 Good and poor examples

| Avoid | Prefer | Reason |
|---|---|---|
| `اینجا کلیک کنید` | `آشنایی با فرآیند خرید` | Destination is understandable |
| `بیشتر` | `مشاهده جزئیات مدیریت تأمین` | Meaning survives out of context |
| `محصولات` | `گروه‌های کالایی فولاد` | Matches the non-retail architecture |
| `خدمات` | `مدیریت تأمین فولاد` | Reinforces the approved position |
| `بهترین قیمت آهن` | `بررسی شرایط و پیشنهادهای خرید` | Avoids unsupported price claim |
| `خرید فوری` | `ارسال لیست خرید برای بررسی` | Reflects the actual workflow |
| repeated exact-match phrase | natural topic-specific phrase | Avoids manipulation and poor reading |

### 16.4 Repetition rule

Repeated links to the same destination within one content block should normally be consolidated. If the same destination appears in header, breadcrumb, body, and CTA, each instance must serve a distinct interface role.

Do not force a unique anchor for every occurrence. Consistency is more valuable than artificial variation.

### 16.5 Linked area

Link the smallest complete phrase that accurately names the destination. Avoid linking full paragraphs, long clauses, punctuation, or unrelated adjectives.

---

## 17. Link Placement and Density

There is no sitewide numeric quota. Link count must follow page length, complexity, and intent.

### 17.1 Placement priority

Prefer:

1. a natural contextual link near the relevant statement;
2. a structural link in a hub or breadcrumb;
3. a curated related-content block near the end;
4. a relevant conversion link after sufficient explanation.

Avoid:

- dense lists inserted only for search engines;
- multiple links in every paragraph;
- a large “all pages” block on every page;
- repeated footer-like link sections inside body content;
- links in headings unless the component intentionally represents linked cards or navigation;
- links that interrupt Persian reading flow or create ambiguous tap targets.

### 17.2 First-main-content link

Where natural, the first contextual main-content link should point to the page most necessary to understand or continue the current topic—not automatically to the parent or CTA.

### 17.3 Duplicate destinations

Within the main content, avoid linking to the same destination more than once unless:

- the page is long and the later link serves a different decision point;
- one link is explanatory and another is the final action;
- accessibility and responsive component behavior require a separate instance.

---

## 18. Breadcrumbs

Breadcrumbs are required for approved detail-page families and optional on top-level hubs.

Recommended patterns:

```text
خانه ← مدیریت تأمین ← مقایسه پیشنهادهای خرید
خانه ← گروه‌های کالایی ← ورق، شیت و کویل
خانه ← پروژه‌ها ← [نام پروژه]
خانه ← دانش و بینش‌ها ← [عنوان مقاله]
```

In the Persian RTL interface, visual direction must be correct while DOM order remains logical for assistive technology.

Rules:

- Use real canonical anchors for ancestors.
- The current page is plain text or uses `aria-current="page"`; it must not link to itself.
- Do not invent breadcrumb ancestors that are absent from the sitemap.
- Do not include query parameters, filters, or session state.
- Breadcrumb structured data must match the visible breadcrumb.
- Keep labels concise and consistent with navigation naming.
- On mobile, preserve meaningful ancestors; do not replace the trail with an unlabeled back icon.

---

## 19. Header, Footer, and Utility Links

### 19.1 Header

The header exposes a small set of understandable primary destinations and one high-value request action. Final labels and availability come from `HEADER_NAVIGATION_SPEC.md`, `SITEMAP.md`, and `ROUTES.md`.

Header links must:

- be server-rendered and crawlable;
- use canonical paths;
- show exact and descendant active states;
- avoid query parameters;
- omit conditional destinations until released;
- remain accessible by keyboard, pointer, and touch.

### 19.2 Footer

The footer supports orientation; it does not duplicate the entire sitemap. It should expose approved links in compact groups:

- procurement and process;
- published material groups;
- evidence and knowledge, when live;
- company, contact, and consultation;
- privacy and terms.

The footer alone is insufficient as the only inbound link for an important indexable page.

### 19.3 Utility links

Contact, legal, and any future request-tracking function may use utility placement. A tracking link must not be shown until a real, approved route and operational workflow exist in `ROUTES.md`.

---

## 20. Conditional, Noindex, and System Pages

### 20.1 Conditional pages

Until release approval, conditional pages must have no internal links. Do not create hidden links, disabled anchors, preloaded menu items, or placeholder cards.

When activated:

1. update the route manifest;
2. publish complete content;
3. add canonical metadata and indexation state;
4. add parent/hub link;
5. add at least one relevant contextual inbound link;
6. add breadcrumb relationship;
7. add outbound continuation and conversion links;
8. include the page in the XML sitemap when indexable;
9. test all responsive and accessibility states.

### 20.2 Noindex pages

Noindex does not mean unlinked. A noindex operational page may be linked when users need it, but it must not receive promotional or SEO-oriented internal links.

Examples:

- privacy/terms links required by forms;
- support links required during a transaction;
- authenticated or personalized destinations after approval.

### 20.3 Thank-you page

`/request-consultation/thank-you` must:

- be reachable only after valid submission or an approved recovery state;
- remain out of global navigation, body links, related-content blocks, and XML sitemap;
- provide useful links to Process, Homepage, or Contact as appropriate;
- avoid exposing submitted data in the URL or page source.

### 20.4 Error pages

404 and error pages should provide a small recovery set:

- Homepage;
- Procurement hub;
- Materials hub;
- Contact or Request, depending on the state.

Do not render the full sitemap or link to unpublished content.

---

## 21. Future Localization

Phase 1 is Persian-first at unprefixed routes. Unsupported locales must not be linked or published as placeholders.

When another locale is approved:

- internal links must remain within the active locale by default;
- language-switcher links must target the true equivalent page when available;
- if no equivalent exists, follow `LOCALIZATION.md` rather than silently redirecting to an unrelated locale homepage;
- translated anchors must reflect local search language and user terminology, not literal mechanical translation;
- cross-locale links must not replace `hreflang` alternates;
- each locale must use its own canonical route pattern and approved content state;
- Persian RTL and future LTR layouts must use logical CSS properties and correct DOM order.

Do not hardcode `/fa`, `/en`, or `/ar` strings across components. Use the centralized route and locale layer from `ROUTES.md`.

---

## 22. Accessibility Requirements

Internal links must meet WCAG-aligned project requirements.

- Link purpose must be understandable from its text or accessible context.
- Color must not be the only link indicator in body copy.
- Focus states must be clearly visible against every background.
- Touch targets must meet the approved minimum target size.
- Links and buttons must not be visually identical when their behaviors differ.
- External-opening behavior must be communicated when used.
- Repeated navigation blocks should support appropriate landmarks and skip links.
- Breadcrumbs require a labeled navigation landmark.
- Card links must have one clear accessible name and avoid nested interactive elements.
- Icon links require localized accessible names.
- RTL visual ordering must not reverse logical keyboard or screen-reader order.
- Link hover effects must not be the only cue and must respect reduced-motion preferences.

---

## 23. Technical Implementation

### 23.1 Central route registry

All link destinations must come from a typed, centralized route registry aligned with `ROUTES.md`.

Conceptual TypeScript model:

```ts
type InternalLinkKey =
  | 'home'
  | 'procurement'
  | 'process'
  | 'materials'
  | 'industries'
  | 'projects'
  | 'insights'
  | 'resources'
  | 'about'
  | 'faq'
  | 'contact'
  | 'requestConsultation';

type InternalLinkRecord = {
  key: InternalLinkKey | string;
  href: string;
  labelFa: string;
  status: 'launch' | 'conditional' | 'reserved' | 'internal';
  indexable: boolean;
  parentKey?: string;
};
```

Do not duplicate route strings across navigation, cards, content templates, breadcrumbs, and CTA components.

### 23.2 Content relationship model

Dynamic records should use controlled relationships rather than storing arbitrary URLs.

```ts
type ContentRelations = {
  parentKey?: string;
  relatedCapabilityKeys?: string[];
  relatedMaterialKeys?: string[];
  relatedIndustryKeys?: string[];
  relatedProjectKeys?: string[];
  relatedInsightKeys?: string[];
  relatedResourceKeys?: string[];
  primaryNextStepKey?: string;
};
```

Requirements:

- validate every relation against a published record;
- exclude drafts and expired content at build time;
- prevent self-links and duplicate targets;
- limit displayed related items by relevance and component capacity;
- fail the build or content validation when a required parent is missing;
- preserve editorial ordering when explicitly set.

### 23.3 Rendering

- Core links should exist in server-rendered HTML.
- Do not depend on client-only intersection observers to insert critical links.
- Navigation should work without speculative prefetch.
- Prefetch policy must consider page weight and device/network conditions.
- Do not prefetch every footer or related-content link by default.
- Fragment links must target stable unique IDs and account for sticky-header offset.
- Do not create crawlable links for accordion state, tabs, sorting, or filters unless the destination is an approved route.

### 23.4 Self-link prevention

Components must remove or neutralize links whose canonical destination equals the current canonical page. Active header items may remain anchors if required by the navigation implementation, but body, breadcrumb-current, related-content, and card grids must not create unnecessary self-links.

### 23.5 URL normalization

Validation must detect:

- http/https or host inconsistencies;
- `www`/non-`www` inconsistencies;
- duplicate slashes;
- uppercase path variants;
- trailing-slash variants;
- encoded Persian or accidental whitespace variants;
- redirect targets;
- fragments without matching IDs;
- query variants without approved use;
- old route aliases.

---

## 24. Analytics and Measurement

Measure link performance to improve findability and journey design—not to maximize clicks indiscriminately.

Recommended event model:

```text
internal_link_click
```

Recommended non-sensitive parameters:

- `source_path`;
- `destination_path`;
- `link_role` (`navigation`, `contextual`, `related`, `breadcrumb`, `cta`, `footer`);
- `component_id`;
- `content_family`;
- `position_group` (`header`, `main`, `aside`, `footer`);
- `locale`;
- `cta_variant` where approved.

Do not collect:

- anchor text containing user-entered content;
- invoice, BOQ, project, phone, email, or company data;
- uploaded filename or document metadata;
- full query strings that may contain sensitive context.

Key review signals:

- orphan and near-orphan pages;
- click paths to the request flow;
- repeated backtracking to hubs;
- low-use global links;
- contextual links that help users continue;
- broken or redirected internal destinations;
- pages with high entrances and no useful continuation;
- search-engine discovery and crawl anomalies.

Analytics must never block navigation.

---

## 25. Crawl Depth and Priority

Target crawl depth from the homepage:

| Page type | Preferred maximum depth |
|---|---:|
| Core hubs and Process | 1 click |
| Core capability pages | 2 clicks |
| Published material/industry pages | 2 clicks |
| Project, insight, and resource hubs | 1–2 clicks after release |
| Project/article/resource details | 2–3 clicks |
| Legal pages | 1 click through footer |

These are architecture targets, not reasons to add irrelevant homepage links. A page may be deeper when its importance is lower and it remains clearly reachable through a strong hub.

High-priority pages should receive links from high-value, relevant pages. Do not try to equalize internal-link counts across the site.

---

## 26. Orphan and Dead-End Prevention

### 26.1 Orphan definition

An indexable page is orphaned when no crawlable internal link from another live indexable or navigational page reaches it. XML sitemap inclusion does not solve the problem.

### 26.2 Near-orphan definition

A page is a near-orphan when its only inbound link is:

- the footer;
- an XML sitemap;
- an archive, filter, or search result;
- a JavaScript-only interface;
- a low-value system page;
- a single unrelated article.

### 26.3 Dead-end definition

A page is a dead end when it offers no relevant continuation beyond global navigation. Every substantive page should provide at least one of:

- a parent/hub return;
- a related decision;
- a useful educational resource;
- a verified evidence page;
- the next process step;
- a qualified conversion action.

---

## 27. Prohibited Patterns

The following are prohibited:

- linking to unpublished or placeholder pages;
- links that pass through redirects;
- automated keyword linking across every occurrence;
- sitewide exact-match keyword blocks;
- footer link stuffing;
- hidden, zero-size, off-canvas, or visually obscured SEO links;
- links matching the background color;
- identical anchor text pointing to several unrelated pages;
- several different anchors pointing to duplicate versions of one page;
- orphan pages relying only on XML sitemap discovery;
- related-content widgets based only on recency;
- fabricated project, supplier, price, certificate, or case-study links;
- internal UTM parameters;
- linking to sort, filter, tag, search, preview, or session URLs;
- linking to the thank-you page before submission;
- self-links in breadcrumbs or related-content blocks;
- opening ordinary internal links in a new tab;
- linking entire large content sections with ambiguous accessible names;
- creating doorway pages for cities, factories, grades, standards, or prices without approved unique intent and content;
- using the primary request CTA label for destinations other than the canonical request flow.

---

## 28. Editorial Workflow

Before publishing or substantially revising a page, the content owner must define:

1. parent/hub relationship;
2. dominant topic and SEO owner;
3. required structural inbound link;
4. at least one relevant contextual inbound opportunity;
5. required outgoing explanation or continuation;
6. related content, if any;
7. conversion destination and label;
8. breadcrumb path;
9. conditional destination dependencies;
10. review date and evidence state.

### 28.1 New-page release checklist

- [ ] Page exists in `SITEMAP.md`.
- [ ] Canonical route exists and is active in `ROUTES.md`.
- [ ] Topic ownership is approved in SEO maps.
- [ ] Parent/hub page links to it.
- [ ] At least one relevant contextual inbound link is identified.
- [ ] Breadcrumb is correct.
- [ ] Outgoing links are useful and live.
- [ ] Request or next-step path is proportionate.
- [ ] No link implies unsupported claims.
- [ ] XML sitemap and indexation states match.
- [ ] Responsive, RTL, keyboard, and screen-reader behavior pass.

### 28.2 Content retirement

When a page is removed or merged:

- update or remove all internal links before release;
- replace links with the most relevant canonical destination, not automatically the homepage;
- add an approved permanent redirect when the old URL had value or external references;
- remove the old URL from related-content records, navigation, breadcrumb data, and XML sitemap;
- update anchor text when the destination topic changes;
- document the decision in `REDIRECTS.md` and `CHANGELOG.md`.

---

## 29. Automated Validation

The build and QA pipeline should validate:

- every internal `href` resolves to an approved canonical route;
- no live component links to `conditional`, `reserved`, draft, or missing content;
- no internal link resolves through a redirect;
- no indexable page is orphaned;
- no breadcrumb points to a missing ancestor;
- no related-content block contains self-links or duplicates;
- no fragment points to a missing ID;
- no internal link uses an unapproved host or protocol;
- no internal UTM parameters exist;
- no page exceeds component-specific related-link limits;
- all required launch pages receive structural inbound links;
- thank-you, preview, and system routes are absent from public link graphs;
- locale prefixes and alternates follow `ROUTES.md`;
- empty anchors and non-descriptive icon links are absent.

Recommended crawl outputs:

- URL;
- canonical URL;
- route status;
- indexation state;
- crawl depth;
- inbound link count by role;
- outbound link count by role;
- source pages;
- anchor texts;
- response status;
- redirect chain;
- orphan/near-orphan/dead-end flags.

---

## 30. Manual QA Checklist

### Architecture

- [ ] Every launch page is reachable through a logical user path.
- [ ] Every child links to its true parent.
- [ ] Every hub links to all and only published children.
- [ ] Conditional families disappear completely when inactive.
- [ ] Important pages do not rely only on footer links.
- [ ] Crawl depth reflects business and content priority.

### Relevance and copy

- [ ] Each contextual link helps answer a current user question.
- [ ] Persian anchor text accurately describes its destination.
- [ ] Identical anchors do not point to conflicting topics.
- [ ] Anchors avoid retail, price-board, and marketplace framing.
- [ ] Exact-match phrases are not repeated unnaturally.
- [ ] Related-content lists are curated by topic, not recency alone.

### Conversion

- [ ] All primary acquisition links reach `/request-consultation`.
- [ ] The primary label remains `ارسال فاکتور یا لیست خرید` where space allows.
- [ ] Topic context is non-sensitive, approved, and editable.
- [ ] Contact links do not replace the primary request path on commercial pages.
- [ ] No CTA promises instant price, lowest price, guaranteed savings, or guaranteed supply.

### Technical SEO

- [ ] Internal links use canonical URLs and do not redirect.
- [ ] Links are crawlable in rendered HTML.
- [ ] Normal internal links have no `nofollow`.
- [ ] No query, tag, filter, preview, or system URLs leak into the link graph.
- [ ] Breadcrumb markup matches visible links.
- [ ] No orphan, near-orphan, or unintended dead-end page remains.
- [ ] XML sitemap, canonicals, redirects, and internal links agree.

### Accessibility and responsive behavior

- [ ] Link purpose is understandable.
- [ ] Focus states are visible.
- [ ] Body links are distinguishable without color alone.
- [ ] Card links contain no nested controls.
- [ ] RTL order is visually and programmatically correct.
- [ ] Links remain usable at `320px` width and `200%` zoom.
- [ ] Keyboard and screen-reader tests pass.
- [ ] Sticky header does not hide fragment targets.

---

## 31. Phase 1 Minimum Link Graph

At minimum, the launch site must implement this graph:

| Source | Must link to |
|---|---|
| `/` | `/procurement`, `/process`, `/materials`, `/industries`, `/about`, `/request-consultation` |
| `/procurement` | all five live procurement children, `/process`, `/request-consultation` |
| each procurement child | `/procurement`, one relevant adjacent capability, `/process` or relevant hub, `/request-consultation` |
| `/process` | `/procurement`, relevant capability pages, `/materials`, `/request-consultation` |
| `/materials` | published material children, `/procurement`, `/process`, `/request-consultation` |
| `/industries` | `/procurement`, `/materials`, `/process`, `/request-consultation` |
| `/about` | `/procurement`, `/process`, `/contact`, `/request-consultation` |
| `/faq` | relevant topic-owner pages, `/process`, `/request-consultation` |
| `/contact` | `/about`, `/request-consultation`, required legal pages |
| `/request-consultation` | `/process`, `/faq` or `/contact`, `/privacy` when required |
| every detail page | parent hub, relevant next decision, canonical request flow |

Conditional Projects, Insights, Resources, material children, and industry children are added only after their release gates pass.

---

## 32. Acceptance Criteria

The internal-link architecture is complete only when:

- all internal destinations match the approved sitemap and route manifest;
- Ahan Asa’s procurement-management model is more prominent than material browsing;
- every indexable page has structural and relevant contextual discovery;
- hubs and children form clear two-way relationships;
- the procurement capability cluster has useful sequential and lateral paths;
- commercial, educational, and evidence pages support one another without forced reciprocity;
- every major commercial page leads proportionately to the canonical request flow;
- anchors are natural Persian, descriptive, and aligned with topic ownership;
- no link implies live pricing, inventory, marketplace behavior, or unverified capability;
- conditional and system pages are correctly excluded from public links;
- header, footer, breadcrumbs, related content, and CTAs serve distinct roles;
- rendered links remain crawlable, canonical, accessible, and responsive;
- automated crawling finds no broken links, redirect links, orphans, near-orphans, unintended dead ends, duplicate destinations, or invalid fragments;
- internal links, canonicals, redirects, structured data, navigation, and XML sitemap agree;
- the link graph can be maintained through centralized routes and controlled content relationships rather than scattered hardcoded URLs.

---

## 33. Implementation Handoff

Before Claude Code implements the internal-link system, it must read:

1. `PROJECT_BRIEF.md`;
2. `SITEMAP.md`;
3. `INFORMATION_ARCHITECTURE.md`;
4. `ROUTES.md`;
5. `SEO_KEYWORD_MAP.md`;
6. `SEO_PAGE_MAP.md`;
7. `HEADER_NAVIGATION_SPEC.md`;
8. `FOOTER_SPEC.md`;
9. `CONTENT_MODEL.md`;
10. `CTA_STRATEGY.md`;
11. this file.

Implementation must begin with a route/content relationship manifest and an automated crawl test. Claude Code must not invent missing routes, labels, redirects, projects, materials, industries, claims, metrics, supplier relationships, or keyword targets. Any conflict or missing dependency must be recorded for approval rather than silently resolved in code.

