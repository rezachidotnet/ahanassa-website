# 03 — Content, Routes & Localization

**Project:** Ahan Asa | آهن آسا — B2B steel procurement platform
**Scope:** information architecture, route/URL contract, redirect policy, structured content model, editorial content strategy, media truthfulness rules, and the fa/en/ar localization architecture.
**Companions:** `01_UX_UI_DESIGN.md` (header/nav/footer UI, copy tone), `02_RFQ_CONVERSION_UX.md` (CTA strategy, RFQ flow detail), `04_SEO_PERFORMANCE_ANALYTICS.md` (metadata, structured data, internal linking, sitemap/robots, image performance), `06_PRODUCTS_CMS_ODOO_RFQ.md` (catalog/product route and data-model detail).

Consolidates `SITEMAP.md`, `INFORMATION_ARCHITECTURE.md`, `ROUTES.md`, `PAGE_SPECIFICATIONS.md`, `CONTENT_STRATEGY.md`, `CONTENT_MODEL.md`, `MEDIA_GUIDELINES.md`, `LOCALIZATION.md`, `LOCALE_CONTENT_STRUCTURE.md`, `REDIRECTS.md`. Most of these assumed a **Persian-only launch with English/Arabic reserved for later** — superseded throughout. The owner-confirmed requirement (2026-08-26, `PROJECT_OVERRIDES.md` §1) is that **fa, en, and ar are all required at launch**, with routing, content-model, and CMS-publication architecture built in from the start. Missing approved English/Arabic copy is a content-production gap to close before those locales publish — not license to ship machine-translated placeholder copy as final, and not a reason to defer the architecture itself.

---

## 1. Site Structure and Information Architecture

The IA must communicate, in order: what Ahan Asa manages → how the procurement method works → which material groups/buyer types it supports → what verified evidence backs the claims → how a qualified buyer starts a request. Procurement management leads; material/product browsing supports it — the site is not a catalog-first experience.

### 1.1 Hub-and-detail model

Shallow structure, two to three levels deep:

- **Level 0 (shell):** header, primary nav, utility nav, primary CTA, footer.
- **Level 1 (primary destinations):** Home, procurement/process explanation, capability hub, material/catalog hub, industries hub, evidence/projects hub, insights hub, About, FAQ, Contact, the RFQ request page.
- **Level 2 (detail):** individual capability, material/category, industry, case-study, and article/resource pages.
- **Level 3 (supporting):** contextual FAQ groups, specification checklists — normally embedded in a parent page unless volume or search intent justifies a distinct route.

Every indexable page should be reachable within roughly three interactions from the homepage, with no orphans, and breadcrumbs on non-home detail pages.

Source documents disagree on top-level naming: `SITEMAP.md` uses **Procurement / Materials / Industries / Projects / Insights**; `INFORMATION_ARCHITECTURE.md` uses **Services / Products / Guides**, `/how-it-works`, `/track`, for structurally equivalent concepts. Both mark their labels as provisional pending `COPY_GUIDELINES.md`/`CTA_STRATEGY.md` approval — treat exact naming as open (§9), and prefer `SITEMAP.md`'s fuller publication-status model for planning readiness.

### 1.2 Launch vs. conditional vs. post-launch

| Status | Meaning |
|---|---|
| **Launch Core** | Required, complete, approved, tested, linked. |
| **Launch Conditional** | Valuable but gated on verified content/evidence — publish only when its gate is met. |
| **Post-Launch** | Approved future expansion; no placeholder routes. |
| **System** | Confirmation/404/error/maintenance; usually `noindex`. |
| **Excluded** | Outside current scope without an explicit decision. |

**Always Launch Core (content-independent):** Home, About, procurement/process explanation, a materials/capability orientation hub, FAQ, Contact, the primary RFQ page, Privacy, Terms.

**Launch Conditional (content-gated, not locale-gated):** material/category detail, industry detail, projects/case-study hub and details, insights/resources hub and details. A hub never launches empty — real content and a real next action, or the family stays unpublished. No "coming soon" cards or disabled nav links.

**Explicitly excluded** absent a scope decision: cart, checkout, customer/supplier accounts or portals, a supplier marketplace, an automated quote generator, public order tracking, unverified certification/press/investor pages. Public catalog and public pricing are **not** excluded — see §2.3.

### 1.3 Locale scope note

Status above governs content readiness per page family, independent of language. A family can be Launch Core in `fa` while its `en`/`ar` counterpart is still in translation review — §7 covers how locale readiness gates a specific locale variant, separate from whether the family is in scope at all.

---

## 2. Route Architecture and URL Conventions

### 2.1 General rules (`ROUTES.md`, still active)

Lowercase ASCII kebab-case slugs; no file extensions; no trailing slash except `/`; no opaque IDs/UUIDs/dates in evergreen canonical paths; stable nouns over campaign language; one intent → one canonical route (renamed/removed routes need a redirect, not a second live path); reserved system words (`api`, `admin`, `request`, `privacy`, `terms`, `faq`, etc.) may not be used as dynamic content slugs.

### 2.2 Locale prefix rules

```text
fa (default, primary) → unprefixed → RTL   → required at launch
en                     → /en        → LTR  → required at launch
ar                     → /ar        → RTL  → required at launch
```

Persian is never served under `/fa`; a legacy `/fa/*` request permanently redirects (`308`) to the unprefixed equivalent. `/en` and `/ar` are **not** reserved/future namespaces — required from the start. What's gated per §7 is publication of a given page in a given locale, not the existence of the `/en`/`/ar` route trees. Every translatable page needs a locale-neutral content identity (a stable key, not a translated slug/title) so `/en/{path}` and `/ar/{path}` resolve to the same entity for the language switcher, hreflang, and translation-completeness checks. Locale-specific slugs are allowed once localized-slug policy is confirmed; until then, reuse the same Latin segment across locales.

### 2.3 Public catalog and pricing routes

`ROUTES.md` §4.5 / `REDIRECTS.md` §14 prohibit `/prices`, `/daily-prices`, `/live-prices`, `/shop`, `/cart`, `/checkout`, `/account`, `/supplier-portal`, `/marketplace`. The **cart/checkout/account/marketplace** prohibitions remain fully in force. The blanket ban on price-related routes is **superseded**: `PROJECT_OVERRIDES.md` §4 owner-confirms a public catalog and public pricing, sourced only from the synchronized Cloudflare D1 projection of Odoo data, never a live Odoo call. Catalog/price route naming itself is unresolved — see §2.4. Detail lives in `06_PRODUCTS_CMS_ODOO_RFQ.md`.

### 2.4 OPEN DECISION — catalog/material route naming — DO NOT INVENT

Two incompatible patterns exist and neither is reconciled:

- **Flat** (`ROUTES.md`): `/{catalog}/[category-slug]` — e.g. a literal `/steel-products/[category-slug]`.
- **Hierarchical** (newer catalog material, `06_PRODUCTS_CMS_ODOO_RFQ.md`): `/{catalog}/{category}/{product}/{variant}` — e.g. a literal `/steel/{category}/{product}/{variant}`.

`SITEMAP.md` also uses `/materials` and `INFORMATION_ARCHITECTURE.md` uses `/products` for what may be the same hub. Do not pick a winner. Reference catalog/material URLs elsewhere with a symbolic placeholder (`/{catalog}/…`), never a literal path. Recorded as `DOCUMENT_AUDIT_REPORT.md` DAR-016; blocks finalizing catalog routing only, not surrounding foundation work.

### 2.5 RFQ route — resolved direction

`ROUTES.md`/`REDIRECTS.md` treat `/request` as canonical; `SITEMAP.md` and older SEO material use `/request-consultation`. The corpus's internal-linking guidance (`01-sources/INTERNAL_LINKING.md` §3.1, consolidated in `04_SEO_PERFORMANCE_ANALYTICS.md`) names this conflict and recommends `/request` as canonical with `/request-consultation` permanently redirected. Treat this as **resolved**:

```text
canonical (fa/en/ar):  /request, /en/request, /ar/request
legacy alias:           /request-consultation → 308 → /request
legacy confirmation:    /request-consultation/thank-you → 308 → /request/confirmation (or equivalent)
```

One canonical entry point supports invoice upload, material-list upload, or a written inquiry — never separate quote/upload/consultation routes, and never a promise of an instant automated quotation.

### 2.6 OPEN DECISION — `/terms` vs `/terms-of-use` — DO NOT INVENT

`SITEMAP.md` uses `/terms-of-use`; `ROUTES.md`/`REDIRECTS.md` use `/terms`; `REDIRECTS.md` §2.2 lists it `blocked`. Do not implement both, do not silently choose. Reference generically ("the terms/legal page") until resolved.

### 2.7 Canonical route registry concept

Public routes must resolve through one typed, centralized manifest — never duplicated string literals per component:

```ts
type RouteStatus = 'launch' | 'conditional' | 'reserved' | 'internal' | 'redirect' | 'prohibited';
type RouteRecord = {
  key: string;             // stable, locale-neutral identity
  path: string;
  status: RouteStatus;
  indexable: boolean;
  sitemap: boolean;
  navigation?: 'primary' | 'secondary' | 'footer' | 'cta' | 'none';
  locale: 'fa' | 'en' | 'ar';
};
```

Header, mobile menu, footer, breadcrumbs, and contextual links must all resolve through this one source. Dynamic routes render only from published, approved content; unknown/draft/locale-unavailable slugs return a genuine `404`.

### 2.8 Canonical host

The canonical production host is `https://www.ahanassa.com`. The apex (`ahanassa.com`) may redirect to `www` in one hop, but the public SEO identity, metadata, sitemap, robots, structured data, and internal canonical links all use `https://www.ahanassa.com` from one validated config value.

---

## 3. Redirects Policy

`REDIRECTS.md` is the operational register; it does not authorize new pages, locales, or claims — it records migration between approved route states.

**Status codes:** `308`/`301` for permanent moves (protocol/host, locale-prefix removal, trailing-slash, legacy migrations); `307`/`302` only for genuinely temporary destinations with an owner and expiry. Never use a temporary code to postpone a real decision.

**Core normalization:** HTTP → HTTPS + non-canonical host → canonical host, one hop; legacy `/fa*` → unprefixed Persian; trailing-slash → no-trailing-slash (except `/`); `/request-consultation` (+ confirmation) → `/request` (§2.5).

**No chains:** max one hop from any source; a source never equals its destination; a destination never points back to an earlier source; CI fails on duplicate sources with different destinations.

**No speculative redirects.** No entries for unverified aliases, misspellings, city/grade/brand permutations, or unavailable `/en`/`/ar` paths redirected to Persian. Every entry needs a verified source.

**Removed content:** `404` for content that never existed/published; `410` only for a deliberate, documented, permanent removal. Never redirect indiscriminately to the homepage or `/request` to avoid a `404`.

**Query parameters:** allowlisted UTM only may survive; personal/confidential/internal-workflow parameters are never propagated or kept in canonical tags.

**Slug changes:** require a direct one-hop permanent redirect plus updates to internal links, sitemap, hreflang, canonical, and structured data.

**Known blocked items:** `/terms` vs `/terms-of-use` (§2.6, genuinely open).

---

## 4. Content Model

`CONTENT_MODEL.md` is the structured content contract shared by editorial, SEO, forms, and CMS/database implementation. Detailed catalog/pricing/RFQ persistence lives in `06_PRODUCTS_CMS_ODOO_RFQ.md`; this covers general-purpose content types.

### 4.1 Three data zones

| Zone | Examples | Exposure |
|---|---|---|
| **Public content** | Capabilities, material/industry pages, articles, FAQs | Public/indexable once published |
| **Controlled assets** | Gated resources, approved evidence documents | Only via authorized delivery flow |
| **Confidential operations** | RFQ submissions, invoices, uploaded documents, contact data | Server-side only, never in static bundles |

### 4.2 Shared primitives and the localization typing

Reusable field groups: `LocalizedText`, `Link`, `CTA`, `MediaAsset`, `SEOFields`, `PublicationFields`, `ProofReference`. The load-bearing one:

```ts
type Locale = "fa" | "en" | "ar";
type LocalizedText = { fa: string; en?: string | null; ar?: string | null };
```

This is already structurally multilingual-ready — `fa` required, `en`/`ar` optional at the type level. The correction this file makes: optional-at-the-type-level must not be read as optional-to-build. Per `PROJECT_OVERRIDES.md` §1, routing/component/CMS layers support all three locales as first-class from the start; a `null` `en`/`ar` value reflects real translation-pipeline state (§7), not an architectural gap.

### 4.3 Base public content record

Every routable entity extends one base: stable `id`, `contentType`, `locale`, `title`, `slug`, `summary`, optional hero media, `seo`, `publication`, curated `relatedContentIds`, CTA references, `privacyClass`.

### 4.4 Key domain models

- **`Capability`** — a procurement responsibility, with explicit `includedActivities[]`/`excludedActivities[]` to prevent scope ambiguity.
- **`MaterialCategory`** — a procurement category, not an SKU: definition, applications/forms, selection factors, required request data, risks, standards, `priceDisplayPolicy` (default `quote-required`; a `fixed`/`indicative` variant applies once the public-pricing architecture is wired).
- **`Industry`** — procurement context by buyer type; needs genuine unique content, not a template with the sector name swapped.
- **`ProcurementProcess`/`ProcessStep`** — the ordered engagement sequence with per-step inputs, activities, outputs, `responsibleParty`.
- **`CaseStudy` + `EvidenceRecord` + `VerifiedMetric` + `Testimonial`** — every claim traces to an `EvidenceRecord` with `verificationStatus`/`clientPermission`; a metric without verified evidence must not render.
- **`Article`/`Resource`** — editorial content and downloads, each with `reviewDueAt`.
- **`FAQ`, `PersonProfile`, `ContactChannel`, `LegalPage`** — only verified `ContactChannel` records publish; legal copy needs an authorized approver.
- **RFQ/inquiry models** (`InquiryFormDefinition`, `ProcurementInquiry`, `CustomerContact`, `SecureDocument`, `InquiryStatus`) live in the confidential zone and are detailed in `02_RFQ_CONVERSION_UX.md` — never bundled into static/client-side content.

### 4.5 Publication and translation-state gating

```text
Content lifecycle (per entity):   draft → in-review → approved → scheduled/published → archived
Translation status (per locale):  missing → draft → review → approved → published
```

An entity is publicly routable in a locale only when both states clear: publication `published`/`scheduled` **and** that locale's `translationStatus` = `published`. An entity may be `published` in `fa` while `en`/`ar` sit at `missing`/`draft` — expected mid-build state, not a defect, provided the unpublished variant is excluded from navigation, sitemap, and hreflang for that entity (§7.5). Machine translation may reach `draft` only, never `approved`/`published` without human review.

### 4.6 Relationships and taxonomy

Relationships are explicit and curated, never inferred from shared tags. Public entities reference only published public targets; deleting a referenced entity is blocked until relations are removed/redirected; archiving a routable entity requires a redirect or approved `410`. Taxonomy terms need a stable ID and must not auto-generate indexable archives — a taxonomy landing page indexes only with genuine unique value and SEO approval.

---

## 5. Content Strategy

Ahan Asa is positioned as a **steel procurement management brand** — not a shop, marketplace, live price board, or engineering-design substitute. Content mission: **Clarify** what matters, **Protect** by surfacing risk, **Guide** the next action, **Prove** claims with evidence.

**Governing principles:** decision value before traffic volume; managed procurement before product selling; total purchase outcome before unit price; evidence before claims (no statistic, client name, testimonial, or certificate without a verifiable source and approval); calm confidence before urgency (no fear-based sales, scarcity, countdowns); one page, one dominant job; maintainability before publishing speed (owner, evidence state, review date required before publishing).

**Prohibited claims:** lowest price; zero risk; guaranteed profit/saving/delivery; "best" supplier/quality without a defined basis; unapproved coverage claims; owned inventory/warehouse/factory/fleet without evidence; unapproved response-time commitments; inapplicable certifications; a live/current price without source and timestamp.

**Evidence states:** `verified_public`, `verified_anonymized`, `internal_only`, `pending`, `rejected`, `expired` — only the first two may appear publicly, mapping directly to `EvidenceRecord.verificationStatus` (§4.4).

**Review cadence (defaults):** homepage/core positioning and capability/process pages — quarterly, or immediately on scope change; RFQ/upload guidance — monthly during launch, then quarterly; legal/privacy — at least annually or on any legal/data change; category guides — six months; evergreen guides — six to twelve months; case studies — annually or on permission/status change.

**Localization framing correction:** `CONTENT_STRATEGY.md` §23 frames non-Persian languages as a future-market decision requiring separate approval before launch — superseded by `PROJECT_OVERRIDES.md` §1 for the architecture; en/ar are launch-required. What remains true: translation is not a market strategy, each locale needs native/professionally reviewed content adapted to its terminology and legal context, and no locale publishes without that review (§7).

---

## 6. Media Guidelines

Image-performance budgets, formats, and the `next/image` pattern are consolidated in `04_SEO_PERFORMANCE_ANALYTICS.md`. This section covers truthfulness, sourcing, and localization policy only.

**Truth classes:** every non-brand asset is `verified-evidence` (real, approved), `verified-context` (real industrial context, licensed, not an Ahan Asa operation), `licensed-stock` (no evidentiary claim), `conceptual` (illustration/render/AI-generated), or `restricted` (unverified/expired/misleading — must not publish). Unknown provenance defaults to `restricted`; a caption change never converts unverified to verified.

**Non-negotiable:** no image/video/document/statistic/client name may be presented as evidence unless verified. Stock/composite/AI-generated media must never imply ownership of a factory/warehouse/fleet/inventory, a real client/employee/project, or a real availability position.

**AI-generated media policy** (`PROJECT_OVERRIDES.md` §6): allowed only as non-evidentiary conceptual artwork — classified `conceptual`, never presented as a real project/facility/client/technical condition, disclosed as conceptual whenever a reasonable visitor might read it as documentary. Must never fill an evidence gap on a case study, About page, or capability claim; a real photograph is preferred when available.

**Sourcing and rights:** no republishing from search results, supplier sites, competitors, or social networks without rights; no hotlinking. Every asset needs recorded creator/owner, license, permitted channels, and consent for identifiable people. Documents/screens must be inspected for reflections and metadata; sensitive data is irreversibly redacted before export.

**Localization handling:** decorative images may be shared across locales; images with baked-in text need locale-specific variants or a redesign without embedded text; alt text/captions/credits/transcripts are localized per placement; real-world evidence imagery is **never mirrored** for RTL — choose a different authentic crop or layout instead; text embedded in images is prohibited for headings, CTAs, body copy, technical specs, and navigation across all locales.

---

## 7. Localization Architecture

This section is most directly corrected by `PROJECT_OVERRIDES.md` §1. Where `LOCALIZATION.md`/`LOCALE_CONTENT_STRUCTURE.md` describe `en`/`ar` as "reserved" or "future," that framing is superseded: routing, content-model, and publication-state architecture for all three locales is built now. What's genuinely pending is real, professionally reviewed `en`/`ar` copy — a content-production dependency, not an architectural one.

### 7.1 Locale registry

```ts
export const locales = ['fa', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fa';

export const localeConfig = {
  fa: { languageTag: 'fa-IR', dir: 'rtl', label: 'فارسی',  urlPrefix: '' },
  en: { languageTag: 'en',    dir: 'ltr', label: 'English', urlPrefix: '/en' },
  ar: { languageTag: 'ar',    dir: 'rtl', label: 'العربية', urlPrefix: '/ar' },
} as const;
```

### 7.2 Locale lifecycle vs. locale existence

Per-locale state: `draft` (preview only) → `partial` (internal QA) → `published` (complete, reviewed, linked, indexed) → `retired`. This lets `/en` and `/ar` route trees exist in code and CI from day one while gating public exposure of specific pages on real reviewed content. **A message file or a draft translation does not publish a locale** — publication is an explicit release decision (§7.5).

### 7.3 RTL/LTR rules

`lang`/`dir` always derive from the validated locale registry on the root layout — never hardcoded, never guessed from content. Use CSS logical properties (`margin-inline-start`, `text-align: start`) by default. Directional icons (arrows, pagination) mirror in RTL; non-directional icons (logo, phone, play/pause, standards marks) never mirror. Mixed-direction technical values (grades, standards, phone numbers, emails, URLs) inside RTL prose require explicit isolation (`<bdi>` or `direction: ltr; unicode-bidi: isolate`). Persian/Arabic fonts must contain required glyphs/diacritics/numerals — a subset missing Arabic presentation forms is a release blocker for `ar`. (Multi-locale font-loading budget redesign is an acknowledged open gap, `DOCUMENT_AUDIT_REPORT.md` DAR-017, not resolved here.)

### 7.4 Translation is not literal duplication

Each locale may need different terminology, sentence length, examples, units/currency, CTA wording, and legal notices; commercial promises and delivery regions must be verified per market. Brand names, legal entity names, trademarks, standards, and grade codes are never freely translated — maintain a central glossary (approved terms, forbidden alternatives, untranslated terms). Required pipeline: `source draft → translation → linguistic review → technical review → SEO review → approved → published`. Machine translation produces a labeled `draft` only.

### 7.5 Missing translation behavior: omit, never fake

- If a translated page doesn't exist for a locale, that route must not exist in that locale — return the locale's genuine `404`, never a Persian fallback rendered under `/en`/`/ar`, never an automatic cross-locale redirect.
- Unpublished locale variants are excluded from the language switcher, XML sitemap, hreflang, and public navigation for that entity.
- A published page needs complete metadata (title, description, canonical, hreflang) in its own locale; missing metadata means non-indexable; Persian metadata never falls back onto an English/Arabic route.
- Partial translation is explicitly not a production-ready locale state. A locale publishes only when route mapping, critical interface messages, required content, terminology review, metadata, canonical/hreflang, navigation, RTL/LTR visual regression, forms, and accessibility checks all pass together — though individual content entities may reach `published` incrementally per §4.5.

### 7.6 Locale switcher behavior

Uses each language's native, self-referential label (`فارسی`, `English`, `العربية`) — never a flag. Switches to the equivalent page by stable content identity, not the homepage by default. If no equivalent is published, the option is disabled with an accessible explanation (or omitted) — consistent sitewide, not decided per page. Locale choice may be cookie-remembered; the URL prefix is always the source of truth. `Accept-Language` may power a one-time dismissible suggestion only — never a forced or IP-based redirect.

### 7.7 Content model and messages split

**Message catalogs** (`messages/{locale}/*.json`) hold short interface strings. **Editorial content** (`content/{locale}/…`) holds page bodies, articles, descriptions. **Shared, locale-neutral data** (`content/shared/…`) holds IDs, images without embedded text, numeric specs, relations, and status — stored once and referenced by every locale variant via the stable `contentId`.

### 7.8 Formatting

Numbers/dates/currency are stored as raw values and rendered via `Intl.NumberFormat`/`Intl.DateTimeFormat` with an explicit locale. Amount and currency code are stored separately — Persian is not assumed to mean IRR by default. Timestamps are UTC/ISO 8601, rendered per locale at presentation time. Technical identifiers, standards, and grade codes are never reformatted or partially translated.

---

## 8. Page Specifications Overview

`PAGE_SPECIFICATIONS.md` is a shared contract every page template must satisfy, rather than bespoke rules per page. The pattern, not the full page-by-page detail, is preserved here — consult `PAGE_SPECIFICATIONS.md` directly for a specific page's requirements.

**Universal requirements:** one unique visible `h1`; clear page purpose in the opening viewport; semantic `main` landmark and logical heading order; breadcrumbs on non-home pages; a relevant CTA; unique title/meta description; canonical URL and correct language metadata; at least one meaningful forward link; defined empty/loading/error/success states; correct RTL rendering with LTR isolation; **verified content only** — no fabricated statistics, customers, projects, testimonials, certificates, prices, or guarantees.

**Content hierarchy per page:** Where am I? What does this page offer? Why does it matter to my purchasing decision? What evidence supports the claim? What should I do next?

**Shared reusable templates:**
- **Listing** (materials, industries, projects, resources when volume justifies): heading/description, optional featured item, filters/sort only when necessary, semantic item list, empty state, pagination, contextual CTA. Filters must not create uncontrolled indexable URL combinations.
- **Detail** (capability, material, industry, case study, resource): breadcrumb, title/summary, metadata, body sections, verified media/evidence, related content, contextual CTA.
- **Long-form editorial**: single readable column, optional table of contents, preserved captions/source notes, no sticky rail that traps content at 200% zoom.

**Gating:** detail routes generate only from published, verified content records — an approved route pattern does not authorize publishing content into it. Thin variants (a title with generic paragraphs) consolidate into the parent hub.

**Publication workflow:** `draft → business-review → technical-review (when applicable) → legal/privacy-review (when applicable) → media-and-permission-review → seo-review → approved → published → archived`. Draft or incomplete content must never become publicly indexable at any stage.

---

## 9. Open Decisions Summary

Genuinely unresolved in the source corpus — do not invent a resolution; each blocks only the narrow surface it affects, not surrounding foundation work.

- **`OPEN DECISION — DO NOT INVENT`** — Catalog/material route naming: flat vs. hierarchical pattern, and the hub label (`/materials` vs `/products` vs `/steel...`). See §2.4; governed for resolution in `06_PRODUCTS_CMS_ODOO_RFQ.md`.
- **`OPEN DECISION — DO NOT INVENT`** — `/terms` vs `/terms-of-use`. See §2.6.
- **`OPEN DECISION — DO NOT INVENT`** — Final top-level navigation naming/taxonomy (Procurement/Services, Materials/Products, Insights/Guides) — both source IA documents mark their labels provisional. See §1.1.
- **`OPEN DECISION — DO NOT INVENT`** — Exact launch material/category inventory, industry list, and whether Projects/case studies launch publicly (gated on verified evidence and commercial approval, not a documentation gap).
- **`OPEN DECISION — DO NOT INVENT`** — Localized-slug policy: shared Latin segment vs. market-specific slugs per locale (`LOCALIZATION.md` §24).
- **`OPEN DECISION — DO NOT INVENT`** — Precise Arabic market/BCP-47 tag (`ar` vs. `ar-IQ`/`ar-OM`), Persian calendar usage scope, per-market currency/unit display rules (`LOCALE_CONTENT_STRUCTURE.md` §30).
- **Content-production dependency, not a documentation gap:** approved, professionally reviewed English and Arabic copy for every launch-required page. Do not machine-translate and publish as final — build and gate the architecture per §7, populate it when real copy is approved.
- **Business facts** (phone number, legal entity name, working hours, team/leadership bios) remain unconfirmed per `PROJECT_OVERRIDES.md` §7.2 and §10 — do not invent them in routes, content records, or structured data.

---

**End of `03_CONTENT_ROUTES_LOCALIZATION.md`**
