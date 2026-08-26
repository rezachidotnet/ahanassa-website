# Ahan Asa Website — Content Model

> **Brand:** Ahan Asa | آهن آسا  
> **Domain:** `ahanassa.com`  
> **Document:** `CONTENT_MODEL.md`  
> **Status:** Draft v1.0 — Implementation-ready content contract  
> **Last updated:** 2026-08-25  
> **Primary website language:** Persian (`fa`), fully RTL  
> **Launch model:** Static-first public website with secure server-side inquiry handling

---

## 1. Purpose

This document defines the content entities, fields, relationships, validation rules, publication states, and public/private data boundaries for the Ahan Asa website.

It is the canonical content contract between:

- Content strategy and editorial work
- UI components and page templates
- SEO and structured data
- Front-end implementation
- Forms and lead capture
- Future CMS or database integrations
- Analytics and conversion tracking

This document defines **what data exists and how it relates**. It does not select a CMS, database, ORM, hosting provider, or final folder structure. Those decisions belong in `CMS_ARCHITECTURE.md`, `DATA_ARCHITECTURE.md`, `TECHNICAL_ARCHITECTURE.md`, and `FOLDER_STRUCTURE.md`.

---

## 2. Strategic Foundation

The content model must reinforce the approved positioning:

> Ahan Asa is a professional steel procurement manager and protector of the client's interests—not a generic steel shop, public marketplace, or live price board.

The primary Phase 1 journey is:

1. The visitor understands the procurement-management value.
2. The visitor evaluates the process, capabilities, material knowledge, and evidence.
3. The visitor sends a purchase list, invoice, or project inquiry.
4. Ahan Asa reviews the request through a controlled internal process.
5. The client receives a considered proposal or a request for clarification.

The model must therefore prioritize:

- Clear service explanation
- Procurement-risk education
- Verified evidence
- Structured material information
- Low-friction inquiry submission
- Secure handling of client documents
- Future extensibility without Phase 1 overengineering

---

## 3. Scope and System Boundaries

### 3.1 In scope

- Global website content
- Navigation and footer data
- Reusable content blocks
- Homepage and institutional pages
- Procurement capabilities
- Procurement process
- Material categories
- Industries and customer applications
- Case studies and verified evidence
- Insights and educational articles
- Downloadable resources
- FAQs
- Contact and inquiry configuration
- SEO metadata and social-sharing metadata
- Media metadata and accessibility text
- Public publication workflow
- Secure inquiry payload contract
- Conceptual handoff to CRM or internal operations

### 3.2 Out of scope for the public content layer

- Live steel prices
- Public product inventory
- Shopping cart and checkout
- Public supplier marketplace
- Supplier commercial terms
- Internal supplier ratings
- Customer accounts or dashboards
- Quote calculation logic
- Payments and accounting
- Procurement contracts
- Internal order administration
- Sensitive client or project documents
- OCR and AI invoice-processing implementation

### 3.3 Three data zones

| Zone | Examples | Storage rule | Browser exposure |
|---|---|---|---|
| Public content | Capabilities, articles, material guides, FAQs | Static source or approved CMS | Public and indexable when published |
| Controlled assets | Gated resources, approved evidence documents | Private or controlled storage when required | Only through authorized delivery flow |
| Confidential operations | Inquiries, invoices, supplier offers, quotes, customer details | Secure server-side database and private object storage | Never embedded in static bundles or page source |

No field from the confidential operations zone may be imported into client-side code unless explicitly minimized, authorized, and required for the current user interaction.

---

## 4. Content-Modelling Principles

### 4.1 Structured before free-form

Use structured fields for repeated meaning such as title, summary, proof, CTA, specifications, process stages, and FAQs. Do not hide essential data inside a single rich-text field.

### 4.2 Template-led, not page-builder-led

Core page families must use defined templates. A limited block system may be used for editorial flexibility, but arbitrary drag-and-drop layouts are not the source of truth.

### 4.3 Single source of truth

Reusable facts must be stored once and referenced. Examples include material categories, capability names, author profiles, approved statistics, legal notices, and contact channels.

### 4.4 Evidence before claims

Every quantified result, client name, project detail, testimonial, certification, or performance claim must reference an approved evidence record.

### 4.5 Persian-first, localization-ready

Phase 1 is Persian. Entity identity, routes, and relationships must not depend on Persian display text so that future locales can reuse the same canonical records.

### 4.6 Static-first public delivery

Published public content should be compatible with static generation or server rendering. Core copy and metadata must not require client-side JavaScript to become visible or indexable.

### 4.7 Secure by classification

Every model must have an explicit classification: `public`, `controlled`, `confidential`, or `restricted`.

### 4.8 Honest incompleteness

If data is missing, omit the component or show an approved neutral state. Never fabricate projects, prices, metrics, logos, testimonials, locations, inventory, or operational capabilities.

---

## 5. Naming and Data Conventions

### 5.1 Identifiers

- Every entity requires an immutable `id`.
- IDs use lowercase ASCII kebab case or UUIDs.
- Human-readable titles must never be used as database identity.
- Renaming a title must not break relationships.

Examples:

```text
capability-supplier-evaluation
material-structural-steel
article-total-cost-vs-unit-price
case-study-example-001
```

### 5.2 Slugs

- Slugs use lowercase Latin characters and hyphens.
- Slugs are unique within a locale and page family.
- A changed published slug requires a permanent redirect entry.
- Persian page labels remain Persian; Latin slugs are a technical convention, not public copy.

### 5.3 Dates

- Store dates as ISO 8601.
- Store timestamps in UTC.
- Format dates for Persian users at presentation time.
- `publishedAt` represents first publication.
- `updatedAt` represents meaningful editorial revision, not automated build time.

### 5.4 Directionality

- Persian prose uses `rtl`.
- Phone numbers, email addresses, URLs, model codes, standards, dimensions, and technical identifiers use isolated `ltr` presentation.
- Direction is a rendering concern; content must not contain manual spaces or Unicode tricks to simulate alignment.

### 5.5 Numerals and units

- Store numeric values as numbers, never preformatted strings.
- Store unit separately using a controlled unit code.
- Convert to Persian digits only in the presentation layer when the approved copy standard requires it.
- Never store combined values such as `"20 tons"` when calculation, filtering, or localization may be required.

Example:

```json
{
  "value": 20,
  "unit": "t"
}
```

### 5.6 Empty values

- Use `null` for an intentionally absent optional scalar.
- Use `[]` for an intentionally empty collection.
- Do not use placeholder values such as `TBD`, `N/A`, `Lorem ipsum`, or `0` in published content.

---

## 6. Shared Primitives

These primitives may be implemented as TypeScript types, schema fragments, or CMS components.

### 6.1 `LocalizedText`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `fa` | string | Yes in Phase 1 | Natural professional Persian |
| `en` | string or null | No | Add only with approved translation |
| `ar` | string or null | No | Future use |

Do not publish a locale when required fields for that locale are incomplete.

### 6.2 `Link`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `label` | localized string | Yes | Descriptive; avoid vague “click here” copy |
| `href` | string | Yes | Internal route, HTTPS URL, phone, or email |
| `type` | enum | Yes | `internal`, `external`, `download`, `phone`, `email` |
| `newTab` | boolean | No | Default `false`; usually `true` only for external links |
| `ariaLabel` | localized string | Conditional | Required when visible label lacks context |
| `analyticsId` | string | No | Stable tracking name, not localized |

### 6.3 `CTA`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | string | Yes | Stable reference |
| `label` | localized string | Yes | Action-oriented |
| `supportingText` | localized string | No | Clarifies value or next step |
| `link` | `Link` | Yes | Valid target |
| `variant` | enum | Yes | `primary`, `secondary`, `text`, `inverse` |
| `icon` | controlled token or null | No | Decorative icons hidden from assistive tech |
| `eventName` | string | Yes | Analytics event contract |
| `audience` | enum[] | No | Optional targeting metadata; no hidden personalization in Phase 1 |

### 6.4 `MediaAsset`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | string | Yes | Immutable |
| `kind` | enum | Yes | `image`, `video`, `document`, `logo`, `diagram` |
| `source` | string | Yes | Asset reference, never an unverified remote hotlink |
| `alt` | localized string | Conditional | Required for meaningful images; empty for decorative images |
| `caption` | localized string | No | Factual context |
| `credit` | localized string | No | Creator/source when needed |
| `copyrightStatus` | enum | Yes | `owned`, `licensed`, `client-approved`, `unknown` |
| `focalPoint` | `{x,y}` | No | Normalized values from 0 to 1 |
| `width` | integer | Yes for raster | Intrinsic pixels |
| `height` | integer | Yes for raster | Intrinsic pixels |
| `mimeType` | string | Yes | Valid MIME type |
| `fileSize` | integer | No | Bytes |
| `poster` | asset reference | Conditional | Required for video |
| `transcript` | localized rich text | Conditional | Required for meaningful spoken video |
| `privacyClass` | enum | Yes | `public`, `controlled`, `confidential`, `restricted` |
| `approvalStatus` | enum | Yes | `pending`, `approved`, `rejected`, `expired` |

Assets with `copyrightStatus: unknown` or without approval must not be published.

### 6.5 `SEOFields`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `metaTitle` | localized string | Yes for indexable pages | Unique and intent-aligned |
| `metaDescription` | localized string | Yes for indexable pages | Accurate page summary |
| `canonicalPath` | string | Yes | Internal canonical path, not arbitrary external URL |
| `indexing` | enum | Yes | `index-follow`, `noindex-follow`, `noindex-nofollow` |
| `openGraphTitle` | localized string | No | Falls back to `metaTitle` |
| `openGraphDescription` | localized string | No | Falls back to `metaDescription` |
| `openGraphImage` | asset reference | No | Approved social image |
| `schemaTypes` | enum[] | No | Allowed structured-data types only |
| `primaryKeyword` | string | No | Editorial planning only; never rendered mechanically |
| `secondaryKeywords` | string[] | No | No keyword stuffing |

Final character guidance and schema policy belong in `METADATA_SPEC.md` and `STRUCTURED_DATA.md`.

### 6.6 `PublicationFields`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `status` | enum | Yes | `draft`, `in-review`, `approved`, `scheduled`, `published`, `archived` |
| `ownerId` | reference | Yes | Accountable content owner |
| `reviewerIds` | reference[] | No | Commercial, technical, legal, or brand review |
| `createdAt` | datetime | Yes | System managed |
| `updatedAt` | datetime | Yes | System managed |
| `publishedAt` | datetime or null | Conditional | Required when published |
| `scheduledAt` | datetime or null | Conditional | Required when scheduled |
| `expiresAt` | datetime or null | No | Useful for time-sensitive notices and evidence |
| `version` | integer | Yes | Increments on approved revision |

### 6.7 `ProofReference`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `evidenceId` | reference | Yes | Points to controlled `EvidenceRecord` |
| `claim` | localized string | Yes | Exact public claim supported |
| `displayMode` | enum | Yes | `inline`, `metric`, `badge`, `footnote`, `hidden-review-only` |
| `approvedAt` | datetime | Yes | Audit value |
| `approvedBy` | reference | Yes | Accountable reviewer |

---

## 7. Base Public Content Record

Every indexable or routable public entity extends the following base:

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | string | Yes | Immutable |
| `contentType` | enum | Yes | Registered model name |
| `locale` | locale code | Yes | `fa` in Phase 1 |
| `title` | string | Yes | Public H1 or entity name |
| `slug` | string | Conditional | Required for routable entities |
| `summary` | string | Yes | Short, standalone description |
| `eyebrow` | string or null | No | Small contextual label |
| `heroMediaId` | reference or null | No | Approved asset only |
| `seo` | `SEOFields` | Yes for routable entity | Explicit indexing decision |
| `publication` | `PublicationFields` | Yes | Must be published to enter production routes |
| `tags` | reference[] | No | Controlled taxonomy only |
| `relatedContentIds` | reference[] | No | Curated; no circular dependency failure |
| `primaryCtaId` | reference or null | No | Usually inquiry CTA |
| `secondaryCtaId` | reference or null | No | Supporting journey |
| `privacyClass` | enum | Yes | Public content normally `public` |

---

## 8. Global Models

### 8.1 `SiteSettings`

Singleton per locale.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `siteName` | localized string | Yes | آهن آسا |
| `legalName` | localized string | Conditional | Publish only after verification |
| `tagline` | localized string | Yes | ما مراقب سرمایه شما هستیم. |
| `defaultSeo` | `SEOFields` subset | Yes | Fallback only |
| `logoPrimaryId` | asset reference | Yes | Approved master lockup |
| `logoInverseId` | asset reference | Yes | Approved inverse lockup |
| `faviconSetId` | asset-set reference | Yes | Approved exports |
| `contactChannels` | `ContactChannel[]` | Yes | Approved public channels |
| `businessHours` | structured schedule or null | No | No invented hours |
| `serviceRegions` | reference[] | No | Only active verified regions |
| `socialProfiles` | `Link[]` | No | Official profiles only |
| `defaultInquiryCtaId` | CTA reference | Yes | Sitewide fallback |
| `legalLinks` | link references | Yes | Privacy and terms |

### 8.2 `NavigationMenu`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | Yes | e.g. `header-primary-fa` |
| `location` | enum | Yes | `header`, `mobile`, `footer`, `utility` |
| `locale` | locale | Yes | `fa` |
| `items` | `NavigationItem[]` | Yes | Ordered |
| `publicationStatus` | enum | Yes | Draft/published control |

`NavigationItem` supports one level of child groups in Phase 1. Deeper nesting requires explicit information-architecture approval.

### 8.3 `FooterConfiguration`

| Field | Type | Required |
|---|---|---:|
| `brandStatement` | localized string | Yes |
| `columnGroups` | navigation-group references | Yes |
| `contactChannelIds` | reference[] | Yes |
| `legalLinkIds` | reference[] | Yes |
| `copyrightTemplate` | localized string | Yes |
| `trustNote` | localized string or null | No |
| `primaryCtaId` | CTA reference or null | No |

### 8.4 `Announcement`

Optional and disabled by default.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `message` | localized string | Yes | Factual and time-bound |
| `link` | `Link` or null | No | Relevant destination |
| `severity` | enum | Yes | `info`, `important`, `service` |
| `startsAt` | datetime | Yes | Publication window |
| `endsAt` | datetime | Yes | Must expire automatically |
| `dismissible` | boolean | Yes | Default `true` |

Do not use announcements to fabricate urgency or market scarcity.

---

## 9. Page and Domain Models

### 9.1 `HomePage`

Singleton per locale.

| Field | Type | Required | Relationship |
|---|---|---:|---|
| `hero` | `HeroContent` | Yes | One |
| `trustStatement` | rich text | Yes | One |
| `valuePillars` | `ValuePillar[]` | Yes | 3–4 items |
| `featuredCapabilityIds` | references | Yes | 3–6 published capabilities |
| `processStepIds` | references | Yes | Ordered approved process |
| `featuredMaterialIds` | references | No | Only verified categories |
| `riskEducationItems` | `RiskItem[]` | Yes | Client-centered |
| `featuredCaseStudyIds` | references | No | Omit section if no verified cases |
| `featuredInsightIds` | references | No | 3–4 published items |
| `faqIds` | references | No | Visible FAQs only |
| `closingCtaId` | CTA reference | Yes | Inquiry-focused |

The homepage must not contain a public price ticker, fake counters, unverified client logos, or an oversized product catalog.

### 9.2 `StandardPage`

Used for limited institutional pages that do not justify a domain-specific model.

| Field | Type | Required |
|---|---|---:|
| Base public fields | inherited | Yes |
| `intro` | rich text | Yes |
| `sections` | approved block union[] | Yes |
| `breadcrumbs` | derived | Yes |

Allowed blocks are defined in Section 11. `StandardPage` must not replace `Capability`, `MaterialCategory`, `CaseStudy`, or `Article` merely for convenience.

### 9.3 `AboutPage`

| Field | Type | Required | Notes |
|---|---|---:|---|
| Base public fields | inherited | Yes | One page per locale |
| `positioningStatement` | rich text | Yes | Approved language |
| `mission` | rich text | Yes | Approved mission |
| `vision` | rich text | Yes | Approved vision |
| `values` | `ValueItem[]` | Yes | Evidence-aware |
| `operatingPrinciples` | `PrincipleItem[]` | Yes | Client protection and healthy margin |
| `teamMemberIds` | references | No | Only approved real profiles |
| `credentialEvidenceIds` | references | No | Verified only |
| `closingCtaId` | reference | Yes | Inquiry or consultation |

### 9.4 `Capability`

Represents what Ahan Asa can responsibly do for a client.

| Field | Type | Required | Notes |
|---|---|---:|---|
| Base public fields | inherited | Yes | Routable |
| `capabilityType` | enum | Yes | Controlled taxonomy |
| `clientProblem` | rich text | Yes | Start from buyer need |
| `serviceDefinition` | rich text | Yes | Exact scope |
| `includedActivities` | string[] | Yes | Concrete activities |
| `excludedActivities` | string[] | Yes | Prevent scope ambiguity |
| `requiredInputs` | string[] | Yes | What client provides |
| `deliverables` | string[] | No | Only actual outputs |
| `processStepIds` | references | Yes | Ordered subset |
| `materialCategoryIds` | references | No | Relevant categories |
| `industryIds` | references | No | Relevant sectors |
| `riskIds` | references | No | Risks addressed |
| `evidenceIds` | references | No | Verified proof |
| `faqIds` | references | No | Capability-specific |
| `relatedCapabilityIds` | references | No | Curated |
| `inquiryPreset` | object | No | Preselects form context, never hidden personal data |

Initial capability candidates, subject to operational approval:

- Purchase-list and invoice review
- Requirement clarification within the supplied list
- Sourcing and supplier evaluation
- Commercial and quotation comparison
- Procurement coordination
- Documentation review and control
- Logistics and delivery coordination

Do not claim engineering design, structural calculation, laboratory inspection, guaranteed delivery, or legal certification unless separately approved.

### 9.5 `MaterialCategory`

Represents a meaningful procurement category, not a shop SKU.

| Field | Type | Required | Notes |
|---|---|---:|---|
| Base public fields | inherited | Yes | Routable when sufficient content exists |
| `categoryCode` | string | Yes | Stable internal code |
| `parentCategoryId` | reference or null | No | Maximum two public levels in Phase 1 |
| `aliases` | string[] | No | Search and editorial normalization |
| `definition` | rich text | Yes | Plain-language explanation |
| `commonApplications` | string[] | Yes | Factual |
| `commonForms` | string[] | No | e.g. sheet, section, bar |
| `selectionFactors` | `SelectionFactor[]` | Yes | Specification, standard, quantity, origin, etc. |
| `requiredRequestData` | `RequirementField[]` | Yes | Data needed for a useful inquiry |
| `commonRisks` | `RiskItem[]` | Yes | No fear-based exaggeration |
| `standards` | `StandardReference[]` | No | Verified codes only |
| `capabilityIds` | references | Yes | Relevant procurement services |
| `industryIds` | references | No | Relevant applications |
| `articleIds` | references | No | Curated education |
| `faqIds` | references | No | Category-specific |
| `priceDisplayPolicy` | enum | Yes | Phase 1 default: `quote-required` |

Material pages must not imply live inventory, fixed price, manufacturer authorization, or exclusive supply without verified data.

### 9.6 `Industry`

| Field | Type | Required |
|---|---|---:|
| Base public fields | inherited | Yes |
| `industryCode` | string | Yes |
| `procurementContext` | rich text | Yes |
| `typicalNeeds` | string[] | Yes |
| `commonRisks` | reference[] | Yes |
| `materialCategoryIds` | references | Yes |
| `capabilityIds` | references | Yes |
| `caseStudyIds` | references | No |
| `qualificationNote` | rich text | No |

An industry page should exist only when Ahan Asa has sufficient operational understanding and useful unique content. Thin pages created only for SEO are prohibited.

### 9.7 `ProcurementProcess`

Singleton process definition per approved service model.

| Field | Type | Required |
|---|---|---:|
| Base public fields | inherited | Yes |
| `scopeStatement` | rich text | Yes |
| `stepIds` | `ProcessStep` references | Yes |
| `clientResponsibilities` | string[] | Yes |
| `ahanAsaResponsibilities` | string[] | Yes |
| `decisionPoints` | `DecisionPoint[]` | No |
| `expectedOutputs` | string[] | Yes |
| `limitations` | string[] | Yes |
| `faqIds` | references | No |
| `closingCtaId` | reference | Yes |

### 9.8 `ProcessStep`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | Yes | Stable |
| `order` | integer | Yes | Unique within process |
| `title` | localized string | Yes | Short |
| `summary` | localized string | Yes | User-facing |
| `inputs` | string[] | No | Required information/documents |
| `activities` | string[] | Yes | Actual actions |
| `outputs` | string[] | No | Client-visible outcome |
| `statusLabel` | localized string | No | For future tracking UI |
| `responsibleParty` | enum | Yes | `client`, `ahan-asa`, `joint`, `third-party` |
| `durationNote` | localized string or null | No | No guarantee unless approved |

Proposed public sequence:

1. Request and purchase list received
2. Items and requirements reviewed
3. Supply options checked
4. Options and commercial conditions compared
5. Proposal prepared
6. Client confirmation received
7. Purchase and delivery coordinated
8. Outcome recorded

Public wording may simplify the internal workflow but must not misrepresent it.

### 9.9 `RiskTopic`

Reusable educational record.

| Field | Type | Required |
|---|---|---:|
| `id` | string | Yes |
| `title` | localized string | Yes |
| `problem` | rich text | Yes |
| `commercialImpact` | rich text | Yes |
| `mitigationApproach` | rich text | Yes |
| `disclaimer` | rich text or null | No |
| `capabilityIds` | references | No |
| `materialCategoryIds` | references | No |
| `evidenceIds` | references | No |

Suggested topics include specification mismatch, unreliable supplier selection, incomplete documentation, delivery delay, quantity error, price-validity risk, logistics mismatch, and total-cost misunderstanding.

### 9.10 `CaseStudy`

Only for real, approved cases.

| Field | Type | Required | Notes |
|---|---|---:|---|
| Base public fields | inherited | Yes | Routable |
| `caseStatus` | enum | Yes | `completed`, `active`, `anonymized` |
| `clientDisplayName` | string or null | No | Requires permission |
| `clientIndustryId` | reference | Yes | May remain generic |
| `location` | structured place or null | No | Use permitted granularity |
| `dateRange` | structured dates or null | No | Verified |
| `challenge` | rich text | Yes | No confidential detail |
| `scope` | rich text | Yes | Actual Ahan Asa responsibility |
| `materialCategoryIds` | references | Yes | One or more |
| `capabilityIds` | references | Yes | One or more |
| `approach` | rich text | Yes | Factual process |
| `result` | rich text | Yes | Verified outcome |
| `metrics` | `VerifiedMetric[]` | No | Each requires evidence |
| `galleryIds` | asset references | No | Approved assets only |
| `testimonialId` | reference or null | No | Permission required |
| `evidenceIds` | references | Yes | At least one internal record |
| `confidentialityNotes` | internal string | Yes | Never public |
| `approvalExpiresAt` | datetime or null | No | Re-review deadline |

If client identity cannot be published, use an honest anonymized label such as “Industrial project — Central Iran,” not a fabricated company name.

### 9.11 `EvidenceRecord`

Controlled review entity; not necessarily public.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | Yes | Immutable |
| `evidenceType` | enum | Yes | `contract`, `invoice`, `delivery-record`, `photo`, `email-approval`, `certificate`, `calculation`, `client-confirmation`, `other` |
| `title` | internal string | Yes | Clear reviewer label |
| `sourceAssetIds` | controlled asset refs | Yes | Private by default |
| `supportedClaims` | string[] | Yes | Exact claims |
| `owner` | reference | Yes | Accountable person |
| `verificationStatus` | enum | Yes | `unverified`, `verified`, `rejected`, `expired` |
| `verifiedBy` | reference or null | Conditional | Required when verified |
| `verifiedAt` | datetime or null | Conditional | Required when verified |
| `clientPermission` | enum | Yes | `not-required`, `pending`, `granted`, `denied`, `expired` |
| `publicDisclosureLevel` | enum | Yes | `none`, `anonymized`, `summary`, `full` |
| `expiresAt` | datetime or null | No | Revalidation date |
| `privacyClass` | enum | Yes | Usually `controlled` or `confidential` |

### 9.12 `VerifiedMetric`

| Field | Type | Required |
|---|---|---:|
| `label` | localized string | Yes |
| `value` | number | Yes |
| `unit` | controlled unit | Yes |
| `qualifier` | localized string or null | No |
| `evidenceId` | reference | Yes |
| `asOfDate` | date | Yes |
| `roundingPolicy` | enum | Yes |

No animated counter should be rendered without a verified metric record.

### 9.13 `Testimonial`

| Field | Type | Required |
|---|---|---:|
| `quote` | localized string | Yes |
| `personName` | string or null | No |
| `personRole` | localized string or null | No |
| `organization` | string or null | No |
| `portraitId` | asset reference or null | No |
| `caseStudyId` | reference or null | No |
| `permissionEvidenceId` | reference | Yes |
| `approvalStatus` | enum | Yes |
| `approvedAt` | datetime | Yes |
| `expiresAt` | datetime or null | No |

Anonymous testimonials may be used only if authentic and transparently labeled.

### 9.14 `Article`

| Field | Type | Required | Notes |
|---|---|---:|---|
| Base public fields | inherited | Yes | Routable |
| `articleType` | enum | Yes | `guide`, `analysis`, `checklist`, `explainer`, `case-note`, `update` |
| `authorId` | reference | Yes | Real approved author/editor |
| `reviewerId` | reference or null | Conditional | Required for technical/commercial guidance |
| `body` | approved block union[] | Yes | Structured long-form content |
| `tableOfContents` | derived boolean/config | Yes | Do not author duplicate labels |
| `readingTime` | derived integer | Yes | Derived from content |
| `materialCategoryIds` | references | No | Relevant cluster |
| `capabilityIds` | references | No | Relevant services |
| `industryIds` | references | No | Relevant readers |
| `faqIds` | references | No | Visible on page if used in schema |
| `sources` | `SourceReference[]` | Conditional | Required for external factual claims |
| `reviewDueAt` | date | Yes | Content freshness control |
| `changelog` | `RevisionNote[]` | No | Material public updates |

Market-sensitive articles must display a clear “reviewed/updated” date and must not present stale pricing as current.

### 9.15 `Resource`

| Field | Type | Required |
|---|---|---:|
| Base public fields | inherited | Yes |
| `resourceType` | enum | Yes |
| `assetId` | asset reference | Yes |
| `versionLabel` | string | Yes |
| `fileFormat` | enum | Yes |
| `fileSize` | integer | Yes |
| `pageCount` | integer or null | No |
| `language` | locale | Yes |
| `accessMode` | enum | Yes: `public`, `lead-gated`, `controlled` |
| `leadFormId` | reference or null | Conditional |
| `description` | rich text | Yes |
| `includedTopics` | string[] | Yes |
| `relatedMaterialIds` | references | No |
| `relatedCapabilityIds` | references | No |
| `validFrom` | date | Yes |
| `reviewDueAt` | date | Yes |

A lead-gated asset URL must not be exposed in page source before the authorized delivery step if the business expects real access control.

### 9.16 `FAQ`

| Field | Type | Required |
|---|---|---:|
| `id` | string | Yes |
| `question` | localized string | Yes |
| `answer` | localized rich text | Yes |
| `category` | taxonomy reference | Yes |
| `audience` | taxonomy reference[] | No |
| `relatedEntityIds` | references | No |
| `reviewerId` | reference | Yes |
| `reviewDueAt` | date | Yes |
| `publication` | publication fields | Yes |

FAQ structured data may be emitted only when the exact question and answer are visibly rendered and current schema policy allows it.

### 9.17 `PersonProfile`

| Field | Type | Required |
|---|---|---:|
| `id` | string | Yes |
| `displayName` | localized string | Yes |
| `role` | localized string | Yes |
| `shortBio` | localized string | Yes |
| `expertise` | taxonomy reference[] | No |
| `portraitId` | asset reference or null | No |
| `publicContactLinks` | link[] | No |
| `credentialEvidenceIds` | references | No |
| `profileVisibility` | enum | Yes |
| `consentStatus` | enum | Yes |

Never infer or publish personal credentials, employment history, contact details, or photographs without authorization.

### 9.18 `ContactChannel`

| Field | Type | Required |
|---|---|---:|
| `id` | string | Yes |
| `channelType` | enum | Yes: `phone`, `email`, `whatsapp`, `address`, `form` |
| `label` | localized string | Yes |
| `value` | string | Yes |
| `displayValue` | localized string | Yes |
| `availabilityNote` | localized string or null | No |
| `purpose` | enum[] | Yes |
| `isPrimary` | boolean | Yes |
| `verificationStatus` | enum | Yes |

Only verified channels may be published.

### 9.19 `LegalPage`

| Field | Type | Required |
|---|---|---:|
| Base public fields | inherited | Yes |
| `legalType` | enum | Yes: `privacy`, `terms`, `cookie`, `disclaimer` |
| `effectiveDate` | date | Yes |
| `body` | rich text | Yes |
| `approvedBy` | reference | Yes |
| `previousVersionPath` | string or null | No |

Legal copy must be reviewed by an authorized decision-maker. Claude Code must not invent legal commitments.

---

## 10. Inquiry and Procurement Data Models

These models define the secure boundary required by the website. They are not public content and must not be bundled into static client-side data.

### 10.1 `InquiryFormDefinition`

Configuration model; safe to expose only after removing secrets and internal routing details.

| Field | Type | Required |
|---|---|---:|
| `id` | string | Yes |
| `formType` | enum | Yes: `quick-contact`, `procurement-request`, `resource-access` |
| `title` | localized string | Yes |
| `description` | localized string | Yes |
| `fields` | `FormFieldDefinition[]` | Yes |
| `consentText` | localized rich text | Yes |
| `privacyPageId` | reference | Yes |
| `submitLabel` | localized string | Yes |
| `successMessage` | localized rich text | Yes |
| `errorMessage` | localized rich text | Yes |
| `allowedFileTypes` | MIME enum[] | No |
| `maximumFileSizeBytes` | integer | No |
| `analyticsEvents` | event reference[] | Yes |

No endpoint secret, recipient email, CRM credential, storage bucket key, or anti-abuse secret may exist in this model.

### 10.2 `ProcurementInquiry`

| Field | Type | Required | Classification |
|---|---|---:|---|
| `id` | UUID | Yes | Confidential |
| `referenceNumber` | string | Yes | Controlled display |
| `submittedAt` | datetime | Yes | Confidential |
| `sourcePage` | string | Yes | Internal analytics |
| `sourceCampaign` | structured attribution or null | No | Internal analytics |
| `contact` | `CustomerContact` | Yes | Confidential PII |
| `company` | `CompanyInput` or null | No | Confidential |
| `project` | `ProjectInput` or null | No | Confidential |
| `requestedMaterialCategories` | reference[] | No | Confidential |
| `message` | string | No | Confidential |
| `documentIds` | secure asset references | No | Restricted |
| `preferredContactMethod` | enum or null | No | Confidential |
| `consent` | `ConsentRecord` | Yes | Restricted audit record |
| `status` | enum | Yes | Confidential |
| `assignedTo` | internal reference or null | No | Restricted |
| `spamAssessment` | internal object | Yes | Restricted |
| `retentionUntil` | datetime | Yes | Restricted |

Minimum public form fields should be determined by conversion need, not by internal curiosity. Optional fields must remain optional in validation and UI.

### 10.3 `CustomerContact`

| Field | Type | Required |
|---|---|---:|
| `fullName` | string | Yes |
| `phoneCountryCode` | string | Yes |
| `phoneNationalNumber` | string | Yes |
| `email` | string or null | No |
| `role` | string or null | No |
| `preferredLanguage` | locale | Yes |

Normalize phone data on the server. Preserve the original submitted value separately only when operationally required.

### 10.4 `SecureDocument`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | UUID | Yes | Never predictable public path |
| `ownerInquiryId` | reference | Yes | Authorization scope |
| `originalFileName` | string | Yes | Sanitize before display |
| `storageKey` | string | Yes | Private storage only |
| `mimeType` | allowed MIME | Yes | Server-verified, not client-trusted |
| `sizeBytes` | integer | Yes | Enforce limit |
| `checksum` | string | Yes | Integrity/deduplication |
| `malwareScanStatus` | enum | Yes | `pending`, `clean`, `rejected`, `failed` |
| `uploadedAt` | datetime | Yes | Audit |
| `retentionUntil` | datetime | Yes | Privacy policy |
| `accessLogEnabled` | boolean | Yes | Default `true` |

Files must be stored privately, scanned, size-limited, type-validated, and accessed through authorized server-side flows.

### 10.5 `InquiryStatus`

Approved public/internal labels must map to stable codes:

| Code | Public meaning | Internal meaning |
|---|---|---|
| `received` | درخواست دریافت شد | Submission accepted |
| `under-review` | در حال بررسی | Initial review |
| `needs-information` | نیازمند تکمیل اطلاعات | Waiting for client clarification |
| `sourcing` | در حال بررسی گزینه‌های تأمین | Supplier/market review |
| `proposal-ready` | پیشنهاد آماده است | Quote/proposal completed |
| `awaiting-client` | منتظر تأیید شما | Client decision pending |
| `approved` | تأیید شد | Client approved proposal |
| `procurement-in-progress` | خرید در حال انجام است | Procurement active |
| `shipping` | در حال ارسال | Logistics active |
| `delivered` | تحویل شد | Delivery confirmed |
| `closed` | درخواست بسته شد | Operationally closed |
| `cancelled` | لغو شد | Cancelled with reason |

Phase 1 does not require a public tracking portal. These codes establish compatibility with future internal software.

### 10.6 Conceptual internal entities

The future operational system may require:

- `RequestItem`
- `Supplier`
- `SupplierOffer`
- `ComparisonRecord`
- `CustomerQuote`
- `Order`
- `PaymentRecord`
- `Shipment`
- `DeliveryConfirmation`
- `InternalNote`
- `ActivityLog`

These are not fully specified here. Their database fields, permissions, audit rules, and workflows must be defined in dedicated internal product and data architecture documents before implementation.

---

## 11. Approved Content Blocks

The block system is limited to the following types:

| Block | Purpose | Key validation |
|---|---|---|
| `RichTextBlock` | Editorial prose | Semantic headings; no arbitrary inline styles |
| `ImageBlock` | Meaningful or decorative image | Approved asset and correct alt policy |
| `VideoBlock` | Hosted or approved embedded video | Poster, captions/transcript, consent |
| `QuoteBlock` | Highlighted statement | Must not impersonate testimonial |
| `MetricBlock` | Verified quantitative proof | Evidence reference required |
| `ChecklistBlock` | Actionable list | Clear item grammar |
| `ComparisonTableBlock` | Exact option comparison | Headers, caption, mobile behavior |
| `ProcessBlock` | Ordered operational explanation | References approved process steps |
| `RiskBlock` | Problem and mitigation | No fear-based exaggeration |
| `FAQBlock` | Curated questions | References published FAQ records |
| `RelatedContentBlock` | Internal linking | References published entities |
| `CTASectionBlock` | Conversion step | Approved CTA record required |
| `DocumentDownloadBlock` | Resource access | Access policy enforced |
| `DisclaimerBlock` | Scope or legal clarification | Approved copy only |

Disallowed without new approval:

- Arbitrary HTML
- Executable scripts in content
- Inline iframes from unknown domains
- Unstructured style controls
- Per-page font or color overrides
- Fake dashboard widgets
- Public price-ticker blocks
- User-entered HTML rendered without sanitization

---

## 12. Taxonomy Models

### 12.1 Controlled taxonomies

| Taxonomy | Purpose | Publicly visible? |
|---|---|---:|
| `CapabilityType` | Group procurement services | Yes |
| `MaterialCategory` | Organize procurement subjects | Yes |
| `Industry` | Organize customer applications | Yes |
| `Audience` | Editorial targeting | Sometimes |
| `RiskTopic` | Connect education to service value | Yes |
| `ArticleType` | Filter insights | Yes |
| `ResourceType` | Filter downloads | Yes |
| `FAQCategory` | Group questions | Yes |
| `Region` | Verified service coverage | Yes when approved |
| `ContentTag` | Lightweight editorial relation | Usually not indexable |

### 12.2 Taxonomy rules

- A taxonomy term needs a stable ID, Persian label, optional description, and publication status.
- Synonyms belong in `aliases`; they must not create duplicate terms.
- Tags must not automatically generate indexable archive pages.
- A taxonomy landing page becomes indexable only when it has unique value, editorial introduction, useful child content, and explicit SEO approval.
- Taxonomy changes require relationship validation to prevent orphan pages.

---

## 13. Relationship Map

| Source entity | Relationship | Target entity | Cardinality |
|---|---|---|---:|
| Homepage | features | Capability | Many |
| Homepage | features | MaterialCategory | Many |
| Homepage | explains | ProcessStep | Many, ordered |
| Capability | addresses | RiskTopic | Many |
| Capability | applies to | MaterialCategory | Many-to-many |
| Capability | serves | Industry | Many-to-many |
| MaterialCategory | used in | Industry | Many-to-many |
| Article | educates about | Capability/Material/Industry/Risk | Many-to-many |
| CaseStudy | demonstrates | Capability | Many-to-many |
| CaseStudy | involves | MaterialCategory | Many-to-many |
| CaseStudy | supports claims with | EvidenceRecord | One-to-many |
| Testimonial | authorized by | EvidenceRecord | One |
| Resource | relates to | Capability/Material | Many-to-many |
| FAQ | belongs to | One or more public entities | Many-to-many |
| CTA | points to | Route, inquiry form, or contact channel | One |
| Inquiry | originates from | Public page/CTA/campaign | One or more attribution values |

### 13.1 Relationship integrity rules

- Public entities may reference only published public targets.
- Draft content may reference draft or published targets in preview.
- Deleting a referenced entity is blocked until relations are removed or redirected.
- Archiving a routable entity requires a redirect or approved `410` decision.
- Related-content lists must be curated or generated by explicit rules; never random.
- Bidirectional relationships are stored once where possible and derived in the opposite direction.

---

## 14. Publication Workflow and Governance

### 14.1 Status flow

```text
draft → in-review → approved → scheduled/published → archived
```

Rejected review returns the item to `draft` with a revision note.

### 14.2 Review types

| Content | Required review |
|---|---|
| General brand copy | Brand/editorial |
| Capability scope | Operational + commercial |
| Material guidance | Technical + editorial |
| Price or market statement | Commercial + dated source review |
| Project/case study | Operational + client permission + brand |
| Quantified claim | Evidence owner + approver |
| Legal page | Authorized legal/business approver |
| Form consent/privacy copy | Privacy/legal + technical |

### 14.3 Publication gates

An entity cannot be published unless:

- Required Persian fields are complete.
- Slug and canonical path are unique.
- SEO index policy is explicit.
- Referenced entities and media are valid.
- Meaningful media has approved alt text.
- Claims have proof references where required.
- No placeholder content exists.
- Review requirements are satisfied.
- No confidential data appears in public fields.
- The page has a valid route and at least one useful internal entry path.

### 14.4 Freshness policy

| Content type | Recommended review cycle |
|---|---|
| Contact and service coverage | Quarterly or on change |
| Capability scope | Every 6 months |
| Material evergreen guide | Every 6–12 months |
| Market-sensitive article | Monthly or as explicitly dated |
| Case study permissions | Annually or per agreement |
| Legal pages | On legal/process change |
| Downloadable resources | At each revision and at least annually |

These are defaults; `CONTENT_STRATEGY.md` may set stricter schedules.

---

## 15. Localization Model

### 15.1 Phase 1

- Only `fa` is publishable by default.
- Persian content is authored directly, not machine-translated from English.
- Persian is served with `lang="fa"` and `dir="rtl"`.

### 15.2 Future locales

- All translations share the same canonical entity ID.
- Each locale has its own slug, metadata, publication state, and review status.
- A missing translation must return no localized route rather than silently showing Persian under another locale.
- Hreflang is emitted only for valid published equivalents.
- Translations may adapt examples and terminology but must preserve verified facts.

### 15.3 Mixed-script data

Use structured fields for:

- Persian display title
- Latin manufacturer or standard name
- Model/code
- Unit and numeric value

Do not concatenate these into a single preformatted field when the UI may need correct bidi isolation.

---

## 16. SEO and Structured-Data Rules

- Every indexable route maps to exactly one canonical public entity.
- Only published entities enter XML sitemaps.
- Draft, preview, form-success, internal search, and confidential routes are `noindex`.
- Canonical URLs are derived from the route registry and locale mapping.
- Breadcrumbs are derived from information architecture, not manually duplicated.
- Article schema requires visible author, publication date, modification date, and image where appropriate.
- FAQ schema requires visible matching content and separate schema-policy approval.
- Organization data comes from verified `SiteSettings`; no invented founding date, address, rating, or social profile.
- Product schema must not be used for material category pages unless a real product offer with valid required fields exists.
- Aggregate rating schema is prohibited without authentic, policy-compliant review data.
- Internal links should reference entity IDs and resolve through the route registry.

---

## 17. Search, Filtering, and Derived Data

### 17.1 Search index fields

Only published public data may enter site search:

- Title
- Summary
- Approved aliases
- Body plain text
- Material category
- Capability
- Industry
- Article/resource type

No inquiry, customer, supplier, quote, or private document data may enter public search.

### 17.2 Filter rules

- Filter values come from controlled taxonomy IDs.
- Empty filters are hidden.
- Filter combinations should not create indexable URL variants unless approved in SEO strategy.
- Result counts are derived at build/request time, not manually entered.

### 17.3 Derived fields

The following should be computed rather than authored:

- Reading time
- Breadcrumb labels and paths
- Article table of contents
- Related reverse relationships
- Sitemap entries
- Open Graph URL
- Canonical absolute URL
- File-size display label
- Persian/Latin numeral presentation
- Copyright year
- Collection result counts

---

## 18. Form Validation and Privacy Requirements

### 18.1 Validation

- Validate on both client and server.
- Server validation is authoritative.
- Reject executable and unapproved file types.
- Enforce file size and count limits.
- Normalize but do not silently alter meaningful user input.
- Error copy must identify the field and correction without exposing system details.
- Preserve entered values after recoverable validation errors.

### 18.2 Consent

Store:

- Consent text/version shown
- Consent state
- Timestamp
- Form ID/version
- Privacy-policy version

Do not pre-check optional marketing consent.

### 18.3 Retention and deletion

- Define retention periods before production launch.
- Automatically expire abandoned uploads when operationally possible.
- Restrict access according to job role.
- Log access to sensitive documents.
- Provide an internal deletion/anonymization procedure.

### 18.4 Anti-abuse

The model supports honeypot, rate-limit, origin validation, file scanning, and server-side spam assessment. Anti-abuse decisions and secrets remain outside public content configuration.

---

## 19. Reference TypeScript Contract

This example is normative for meaning but not for final file placement or library choice.

```ts
type Locale = "fa" | "en" | "ar";
type PrivacyClass = "public" | "controlled" | "confidential" | "restricted";
type PublicationStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

interface PublicationFields {
  status: PublicationStatus;
  ownerId: string;
  reviewerIds: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  version: number;
}

interface SEOFields {
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
  indexing: "index-follow" | "noindex-follow" | "noindex-nofollow";
  openGraphTitle?: string;
  openGraphDescription?: string;
  openGraphImageId?: string;
  schemaTypes: string[];
  primaryKeyword?: string;
  secondaryKeywords: string[];
}

interface BasePublicContent {
  id: string;
  contentType: string;
  locale: Locale;
  title: string;
  slug: string;
  summary: string;
  eyebrow?: string;
  heroMediaId?: string;
  seo: SEOFields;
  publication: PublicationFields;
  tags: string[];
  relatedContentIds: string[];
  primaryCtaId?: string;
  secondaryCtaId?: string;
  privacyClass: "public";
}

interface Capability extends BasePublicContent {
  contentType: "capability";
  capabilityType: string;
  clientProblem: ContentBlock[];
  serviceDefinition: ContentBlock[];
  includedActivities: string[];
  excludedActivities: string[];
  requiredInputs: string[];
  deliverables: string[];
  processStepIds: string[];
  materialCategoryIds: string[];
  industryIds: string[];
  riskIds: string[];
  evidenceIds: string[];
  faqIds: string[];
}

interface MaterialCategory extends BasePublicContent {
  contentType: "material-category";
  categoryCode: string;
  parentCategoryId: string | null;
  aliases: string[];
  definition: ContentBlock[];
  commonApplications: string[];
  commonForms: string[];
  selectionFactors: SelectionFactor[];
  requiredRequestData: RequirementField[];
  commonRisks: RiskItem[];
  standards: StandardReference[];
  capabilityIds: string[];
  industryIds: string[];
  articleIds: string[];
  faqIds: string[];
  priceDisplayPolicy: "quote-required" | "indicative" | "fixed";
}

interface ProcurementInquiry {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  sourcePage: string;
  sourceCampaign: Attribution | null;
  contact: CustomerContact;
  company: CompanyInput | null;
  project: ProjectInput | null;
  requestedMaterialCategories: string[];
  message: string | null;
  documentIds: string[];
  preferredContactMethod: "phone" | "email" | "whatsapp" | null;
  consent: ConsentRecord;
  status: InquiryStatus;
  assignedTo: string | null;
  retentionUntil: string;
  privacyClass: "confidential";
}
```

Undefined referenced types must be implemented from the field tables in this document or in the relevant technical architecture document. Claude Code must not replace them with `any` in production schemas.

---

## 20. Example Public Record

The following example demonstrates shape only. It is not approved production copy.

```json
{
  "id": "capability-purchase-list-review",
  "contentType": "capability",
  "locale": "fa",
  "title": "بررسی فهرست خرید آهن",
  "slug": "purchase-list-review",
  "summary": "اقلام، مشخصات و اطلاعات لازم برای شروع یک تأمین قابل‌اتکا بررسی می‌شوند.",
  "privacyClass": "public",
  "includedActivities": [
    "بررسی خوانایی و کامل‌بودن فهرست اقلام",
    "شناسایی اطلاعات مفقود برای استعلام",
    "دسته‌بندی اقلام برای بررسی تأمین"
  ],
  "excludedActivities": [
    "طراحی سازه یا تعیین نیاز فنی پروژه از صفر",
    "تأیید مهندسی نقشه‌ها و محاسبات"
  ],
  "processStepIds": [
    "process-request-received",
    "process-items-reviewed"
  ],
  "materialCategoryIds": [],
  "industryIds": [],
  "riskIds": ["risk-incomplete-specification"],
  "evidenceIds": [],
  "faqIds": [],
  "tags": [],
  "relatedContentIds": [],
  "seo": {
    "metaTitle": "بررسی فهرست خرید آهن | آهن آسا",
    "metaDescription": "آهن آسا فهرست خرید شما را برای شناسایی اقلام و اطلاعات لازم جهت شروع فرآیند تأمین بررسی می‌کند.",
    "canonicalPath": "/capabilities/purchase-list-review",
    "indexing": "noindex-follow",
    "schemaTypes": [],
    "secondaryKeywords": []
  },
  "publication": {
    "status": "draft",
    "ownerId": "content-owner",
    "reviewerIds": [],
    "createdAt": "2026-08-25T00:00:00Z",
    "updatedAt": "2026-08-25T00:00:00Z",
    "publishedAt": null,
    "scheduledAt": null,
    "expiresAt": null,
    "version": 1
  }
}
```

The example remains `draft` and `noindex-follow` until operational scope, copy, route, and metadata are approved.

---

## 21. Implementation Rules for Claude Code

Claude Code must:

1. Treat this document as the semantic source of truth for content entities.
2. Use schema validation at the data boundary.
3. Keep public content separate from inquiry and operational data.
4. Generate routes only from published, valid public records.
5. Fail the build or validation step on duplicate IDs, duplicate slugs, broken references, invalid publication states, or forbidden public fields.
6. Derive repeated display values rather than duplicate them across records.
7. Use exhaustive discriminated unions for content blocks.
8. Avoid `any` for model definitions and validation results.
9. Sanitize rich text and prohibit arbitrary script execution.
10. Keep secrets, storage keys, CRM routes, and internal recipients in server-side environment configuration.
11. Enforce private storage and authorized delivery for confidential uploads.
12. Preserve correct RTL/LTR behavior at presentation time.
13. Exclude draft, preview, confidential, and form-status routes from indexing and sitemaps.
14. Avoid schema markup unsupported by visible page content.
15. Add automated tests for schema, relations, route uniqueness, and public/private leakage.

Claude Code must not:

- Invent missing content or evidence.
- Turn material categories into e-commerce products without approval.
- Expose supplier, customer, quote, or invoice data in static files.
- Add public prices or stock claims from placeholder data.
- Publish a locale by falling back to another language.
- Create thin SEO pages automatically for every taxonomy term.
- Change approved IDs or published slugs without a migration and redirect plan.
- Render raw user HTML.
- Use public asset paths for uploaded invoices or purchase lists.

---

## 22. Validation Checklist

### Schema

- [ ] Every record has a valid immutable ID.
- [ ] Every routable record has a unique locale-aware slug.
- [ ] Required fields pass runtime validation.
- [ ] Enum values come from registered controlled lists.
- [ ] Dates and timestamps use valid ISO 8601 values.
- [ ] Numeric values and units are stored separately.

### Relationships

- [ ] Every reference resolves.
- [ ] Public records reference only publishable public targets.
- [ ] Ordered relationships contain no duplicate position.
- [ ] No deletion creates orphaned public routes.
- [ ] Related-content loops do not break rendering.

### Editorial and evidence

- [ ] Persian copy is final and professionally reviewed.
- [ ] No lorem ipsum, `TBD`, fake counter, or placeholder logo exists.
- [ ] Every public claim matches approved operational reality.
- [ ] Every metric has a verified evidence record.
- [ ] Client names, logos, photos, and testimonials have permission.
- [ ] Capability inclusions and exclusions are explicit.

### SEO

- [ ] Indexing policy is explicit.
- [ ] Canonical path matches route registry.
- [ ] Metadata is unique and accurate.
- [ ] Structured data matches visible content.
- [ ] Published pages are internally reachable.
- [ ] Draft and confidential routes never enter sitemaps.

### Accessibility and media

- [ ] Meaningful images have contextual Persian alt text.
- [ ] Decorative media uses empty alt text.
- [ ] Video has captions/transcript where required.
- [ ] Tables have semantic headers and captions.
- [ ] Mixed-direction values render correctly.

### Privacy and security

- [ ] Inquiry PII is server-side only.
- [ ] Uploaded documents use private storage.
- [ ] MIME type, size, and malware checks are enforced.
- [ ] Consent version and timestamp are recorded.
- [ ] Retention policy is configured.
- [ ] Logs do not expose document contents or sensitive form values.

---

## 23. Phase 1 Minimum Content Inventory

Before launch, the content repository should contain at minimum:

| Entity | Minimum |
|---|---:|
| `SiteSettings` | 1 Persian record |
| `NavigationMenu` | Header, mobile, footer |
| `HomePage` | 1 |
| `AboutPage` | 1 |
| `Capability` | Only approved active capabilities; recommended 4–7 |
| `ProcurementProcess` | 1 |
| `ProcessStep` | Complete approved sequence |
| `MaterialCategory` | Only categories with useful complete content |
| `Industry` | Optional at launch; no thin pages |
| `CaseStudy` | 0 is acceptable; never fabricate |
| `Article` | A small high-quality foundation set |
| `Resource` | Only current verified files |
| `FAQ` | Questions based on real buyer concerns |
| `ContactChannel` | At least one verified primary channel |
| `InquiryFormDefinition` | Primary procurement inquiry form |
| `LegalPage` | Privacy and required terms/disclaimers |

The launch is not blocked by the absence of case studies, testimonials, counters, partner logos, or downloadable resources. Their sections must simply remain hidden until valid records exist.

---

## 24. Open Decisions

The following decisions require business or technical approval before final implementation:

- Exact Phase 1 material category inventory
- Whether the primary CTA says “send invoice,” “send purchase list,” or a broader “submit procurement request”
- Whether users may upload documents before providing contact details
- Maximum upload count, type, and size
- Data-retention period for inquiries and abandoned uploads
- Initial CRM/internal-system destination and failure fallback
- Whether lead-gated resources exist at launch
- Which service regions may be publicly stated
- Whether any team profiles, client logos, testimonials, or cases have publication permission
- Final Persian URL policy
- Final CMS choice, if any
- Final schema library and source-file format
- Whether public inquiry-status tracking is a later product requirement

Until resolved, the implementation must choose the safest reversible behavior, keep unsupported sections unpublished, and record the decision in `DECISIONS.md`.

---

## 25. Definition of Done

`CONTENT_MODEL.md` is successfully implemented when:

- All public page families map to validated structured records.
- Public/private data separation is enforced in code and storage.
- The site can build from approved Persian content without placeholders.
- Content relationships drive navigation, related content, and internal linking reliably.
- Published routes, metadata, and sitemap entries derive from one source of truth.
- Inquiry data is accepted only through a secure server-side boundary.
- Uploaded documents never become public assets.
- Evidence-dependent components remain hidden until verified records exist.
- The model can later connect to a CMS or internal procurement system without rewriting page semantics.
- Automated validation prevents malformed, orphaned, misleading, or confidential content from reaching production.

---

## 26. Related Documents

This model must remain aligned with:

- `PROJECT_BRIEF.md`
- `BRAND_GUIDELINES.md`
- `CONTENT_STRATEGY.md`
- `COPY_GUIDELINES.md`
- `INFORMATION_ARCHITECTURE.md`
- `SITEMAP.md`
- `ROUTES.md`
- `PAGE_SPECIFICATIONS.md`
- `HOMEPAGE_SPEC.md`
- `UI_COMPONENTS.md`
- `SEO_STRATEGY.md`
- `METADATA_SPEC.md`
- `STRUCTURED_DATA.md`
- `INTERNAL_LINKING.md`
- `FORM_ARCHITECTURE.md`
- `DATA_ARCHITECTURE.md`
- `CMS_ARCHITECTURE.md`
- `TECHNICAL_ARCHITECTURE.md`
- `LOCALIZATION.md`
- `ANALYTICS_TRACKING.md`
- `SECURITY_GUIDELINES.md`
- `CLAUDE.md`
- `DECISIONS.md`

If a conflict exists, the latest explicitly approved decision in `DECISIONS.md` takes precedence, followed by `PROJECT_BRIEF.md`; the conflicting document must then be updated so the repository returns to one consistent source of truth.
