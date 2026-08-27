# DATA_ARCHITECTURE.md

## Ahan Asa Website — Data Architecture

**Project:** Ahan Asa (آهن آسا)  
**Domain:** `ahanassa.com`  
**ERP:** `odoo.ahanassa.com`  
**Architecture Style:** Edge-first, ERP-integrated, SEO-first, resilient, asynchronous where appropriate  
**Primary Runtime:** Cloudflare Workers  
**Primary Website Database:** Cloudflare D1  
**Object Storage:** Cloudflare R2  
**Async Integration:** Cloudflare Queues  
**ERP / Commercial System of Record:** Odoo  
**Document Status:** Implementation specification

---

## 1. Purpose

This document defines the data architecture for the Ahan Asa website and its integration with Odoo ERP.

The architecture must support:

- public SEO-oriented product and price pages;
- operator-managed articles;
- public steel catalog browsing;
- structured RFQ submission;
- multiple RFQ items per request;
- steel categories, products, variants, sizes, units, and quantities;
- file attachments such as Excel, PDF, and images;
- price synchronization from Odoo;
- customer and lead synchronization with Odoo;
- resilient operation when Odoo is temporarily unavailable;
- fast page rendering without synchronous dependency on Odoo;
- full auditability of administrative and integration changes;
- future expansion to multiple countries, currencies, languages, and sales workflows.

The website is not the ERP.

The ERP is not the public website CMS.

Each system has a clearly defined responsibility.

---

# 2. Core Architecture Principles

## 2.1 Odoo is the commercial source of truth

Odoo is the authoritative system for commercial and operational business data, including:

- customers;
- companies;
- contacts;
- CRM leads;
- sales opportunities;
- quotations;
- sales orders;
- products used commercially;
- variants used commercially;
- units of measure;
- commercial price lists;
- inventory-related data when exposed to the website;
- procurement and supplier data;
- accounting-related data.

The website must not create an independent competing commercial database.

---

## 2.2 The website owns presentation and SEO data

The website is authoritative for:

- SEO titles;
- SEO descriptions;
- slugs;
- canonical configuration;
- indexability;
- editorial product descriptions;
- buying guides;
- category introductions;
- FAQ content;
- internal linking metadata;
- article content;
- article categories;
- website media metadata;
- landing page configuration;
- public presentation rules.

This information must not be forced into Odoo unless there is a clear operational need.

---

## 2.3 Public pages must not synchronously depend on Odoo

A public page request must never require a live Odoo API response.

Bad:

```text
Visitor
  ↓
Website
  ↓
Odoo API
  ↓
HTML
```

Required:

```text
Odoo
  ↓
Synchronization
  ↓
D1 Read Model
  ↓
Cloudflare Cache
  ↓
Visitor
```

This rule protects:

- page speed;
- Core Web Vitals;
- SEO crawlability;
- availability;
- resilience during Odoo maintenance;
- user experience.

---

## 2.4 Writes and reads are intentionally separated

The website uses a practical CQRS-style approach.

### Read path

Public pages read from:

```text
Cloudflare Cache
      ↓
Website Read Model in D1
```

### Write path

Business operations are:

```text
Website
   ↓
D1 durable local record
   ↓
Queue
   ↓
Odoo integration
```

This separation is mandatory for RFQs and other business-critical submissions.

---

# 3. System Boundaries

## Website / Cloudflare layer

Responsible for:

- page rendering;
- public product catalog;
- SEO;
- articles;
- RFQ user experience;
- local durable RFQ capture;
- public price read model;
- public product read model;
- file uploads;
- caching;
- synchronization orchestration;
- integration logs;
- website administration.

---

## Odoo ERP layer

Responsible for:

- customer master records;
- CRM;
- commercial product master;
- sales process;
- quotation process;
- commercial pricing;
- inventory if required;
- procurement;
- supplier management;
- accounting;
- commercial workflows.

---

# 4. Technology Mapping

| Concern | Technology |
|---|---|
| Web application | Next.js |
| Runtime | Cloudflare Workers |
| Website relational data | Cloudflare D1 |
| Public read model | Cloudflare D1 |
| Object/file storage | Cloudflare R2 |
| Asynchronous jobs | Cloudflare Queues |
| Cache | Cloudflare edge cache |
| ERP | Odoo |
| ERP endpoint | `odoo.ahanassa.com` |
| Authentication for website admins | application auth / Cloudflare Access where applicable |
| Bot protection | Cloudflare Turnstile where applicable |
| Secrets | Cloudflare environment secrets |
| Observability | Worker logs + structured application logs |

---

# 5. Data Ownership Matrix

The following ownership rules are mandatory.

| Entity / Data | Authoritative System | Website Copy | Direction |
|---|---|---:|---|
| Customer | Odoo | optional local reference | Website → Odoo |
| Company | Odoo | optional local reference | Website → Odoo |
| Contact | Odoo | optional local reference | Website → Odoo |
| CRM Lead | Odoo | status/reference | Website → Odoo |
| Opportunity | Odoo | status/reference | Odoo → Website if needed |
| Quotation | Odoo | reference/status only | Odoo → Website if needed |
| Sales Order | Odoo | reference/status only | Odoo → Website if needed |
| Commercial Product | Odoo | yes, read model | Odoo → Website |
| Product Variant | Odoo | yes, read model | Odoo → Website |
| Unit of Measure | Odoo | yes, read model | Odoo → Website |
| Commercial Price | Odoo | yes, public price snapshot | Odoo → Website |
| Price History | Odoo / sync history | yes | Odoo → Website |
| Inventory | Odoo | optional snapshot | Odoo → Website |
| Product SEO Content | Website | authoritative | Website only |
| Category SEO Content | Website | authoritative | Website only |
| Articles | Website | authoritative | Website only |
| Article Media | Website/R2 | authoritative | Website only |
| RFQ | Website initially, then Odoo workflow | yes | Website → Odoo |
| RFQ Items | Website initially, then Odoo workflow | yes | Website → Odoo |
| RFQ Attachments | R2 | reference in Odoo | Website → Odoo reference |
| Integration Status | Website | authoritative | internal |
| Audit Log | Website | authoritative for website actions | internal |

---

# 6. Domain Model Overview

```text
Website User / Visitor
        │
        ▼
       RFQ
        │
        ├──────────── RFQ Items
        │                  │
        │                  ├── Category
        │                  ├── Product
        │                  ├── Variant
        │                  ├── Unit
        │                  ├── Quantity
        │                  └── Free-text fallback
        │
        └──────────── Attachments
                           │
                           ▼
                           R2

Odoo
 │
 ├── Products
 ├── Variants
 ├── Units
 ├── Prices
 ├── Customers
 ├── CRM
 └── Sales
      │
      ▼
Sync Layer
      │
      ▼
D1 Public Read Model
      │
      ├── Product Pages
      ├── Category Pages
      ├── Price Pages
      └── Search / Filters
```

---

# 7. Core Data Domains

The database is divided into logical domains.

1. Identity and access
2. Editorial content
3. Catalog
4. SEO content
5. Pricing
6. RFQ
7. Media
8. ERP synchronization
9. Audit and observability
10. Application configuration

---

# 8. Identity and Access Domain

## 8.1 `users`

Website administrative users.

Suggested fields:

```text
id
email
display_name
status
created_at
updated_at
last_login_at
```

---

## 8.2 `roles`

Examples:

```text
admin
editor
price_operator
sales_operator
```

Note:

If commercial pricing is fully managed in Odoo, `price_operator` may become an Odoo-side role instead of a website role.

---

## 8.3 `user_roles`

Many-to-many mapping.

```text
user_id
role_id
```

---

## 8.4 Authorization rule

Permissions must be checked server-side.

Never rely only on hiding UI actions.

---

# 9. Editorial Content Domain

## 9.1 `articles`

Suggested fields:

```text
id
slug
title
excerpt
content
featured_media_id
category_id
author_user_id
status
published_at
created_at
updated_at
seo_title
seo_description
canonical_url
indexing_status
locale
```

Possible statuses:

```text
draft
review
published
archived
```

---

## 9.2 `article_categories`

```text
id
slug
name
description
seo_title
seo_description
created_at
updated_at
```

---

## 9.3 Editorial storage rule

Article body and article metadata are stored in D1.

Large binary assets are never stored in D1.

They are stored in R2.

---

# 10. Catalog Domain

The catalog must support different dimensional models.

Examples:

- rebar: diameter;
- IPE beam: profile family + nominal size;
- square tube: width + height + thickness;
- sheet: thickness + width + length;
- angle: leg sizes + thickness;
- pipe: outside diameter + wall thickness.

A single `size` text field is insufficient.

---

## 10.1 `steel_categories`

Hierarchical structure.

Suggested fields:

```text
id
parent_id
slug
name
odoo_id
status
sort_order
created_at
updated_at
last_synced_at
```

Examples:

```text
rebar
beam
sheet
tube-profile
angle
channel
pipe
```

---

## 10.2 `steel_products`

Logical product family.

Suggested fields:

```text
id
category_id
odoo_template_id
slug
name
internal_code
brand
standard
grade
status
created_at
updated_at
last_synced_at
```

---

## 10.3 `product_variants`

Commercially selectable product variant.

Suggested fields:

```text
id
product_id
odoo_variant_id
sku
display_name
status
created_at
updated_at
last_synced_at
```

---

# 11. Flexible Product Attributes

To support multiple steel product types, attributes must be normalized.

## 11.1 `attribute_definitions`

```text
id
code
name
data_type
unit_family
is_filterable
is_indexable
sort_order
```

Examples:

```text
diameter
width
height
thickness
length
profile
grade
standard
weight_per_meter
```

---

## 11.2 `variant_attribute_values`

```text
id
variant_id
attribute_definition_id
numeric_value
text_value
unit_code
```

Only the value column matching the attribute data type should be populated.

---

## 11.3 Example

For:

```text
Square Tube 80 × 80 × 3
```

store:

```text
width      = 80 mm
height     = 80 mm
thickness  = 3 mm
```

Do not store only:

```text
size = "80x80x3"
```

A derived display value may be generated for UI purposes.

---

# 12. Units of Measure

## 12.1 `units`

Suggested fields:

```text
id
odoo_id
code
name_fa
name_en
symbol
dimension
is_active
last_synced_at
```

Examples:

```text
kg
ton
m
piece
sheet
branch
bundle
```

---

## 12.2 Request unit and price unit are different concepts

Example:

Customer requests:

```text
20 branches
```

but market pricing is:

```text
price per kg
```

Therefore:

```text
rfq_item.request_unit_id
```

must be independent from:

```text
price.price_unit_id
```

This separation is mandatory.

---

# 13. Product SEO Domain

Commercial product records must not be overloaded with editorial SEO content.

## 13.1 `product_seo`

Suggested fields:

```text
id
product_id
locale
slug_override
page_title
meta_title
meta_description
intro
body_content
faq_content
canonical_url
indexing_status
structured_data_config
updated_at
```

---

## 13.2 `category_seo`

Same concept for category landing pages.

Suggested fields:

```text
id
category_id
locale
page_title
meta_title
meta_description
intro
body_content
faq_content
canonical_url
indexing_status
updated_at
```

---

# 14. Pricing Domain

Odoo is authoritative for commercial price data.

The website stores public snapshots optimized for fast reads.

---

## 14.1 `public_prices`

Suggested fields:

```text
id
variant_id
odoo_pricelist_id
currency_code
price
price_unit_id
effective_at
source_updated_at
synced_at
is_current
visibility
```

---

## 14.2 `price_history`

Append-only where practical.

```text
id
variant_id
price
currency_code
price_unit_id
effective_at
source_updated_at
synced_at
```

Purpose:

- price charts;
- historical comparison;
- debugging;
- SEO-visible update dates;
- audit of price changes.

---

## 14.3 Price display rule

Public price pages always read from D1.

They never fetch live prices from Odoo during page rendering.

---

## 14.4 Stale price behavior

If Odoo synchronization fails:

- retain the last known valid public price;
- display its actual update timestamp;
- do not replace it with zero;
- do not silently invent a newer timestamp;
- flag stale data internally;
- alert operators after the configured threshold.

---

# 15. RFQ Domain

RFQ submission is a business-critical flow.

A user submission must be durable before the UI reports success.

---

## 15.1 `rfqs`

Suggested fields:

```text
id
public_reference
idempotency_key
customer_name
company_name
mobile
email
country_code
city
notes
locale
source_url
referrer
utm_source
utm_medium
utm_campaign
utm_term
utm_content
status
odoo_partner_id
odoo_lead_id
sync_status
sync_attempts
last_sync_error
created_at
updated_at
synced_at
```

Suggested statuses:

```text
submitted
processing
synced
in_review
quoted
won
lost
cancelled
```

---

## 15.2 `rfq_items`

Suggested fields:

```text
id
rfq_id
category_id
product_id
variant_id
request_unit_id
quantity
free_text_name
free_text_size
free_text_unit
description
sort_order
created_at
```

---

## 15.3 Catalog fallback

A user must be able to submit an item even when the exact product does not exist in the catalog.

Therefore:

```text
product_id
variant_id
```

may be nullable if:

```text
free_text_name
```

is present.

This prevents lost leads.

---

## 15.4 Quantity storage

Use a decimal-compatible representation.

Do not assume quantity is always an integer.

Examples:

```text
4.5 ton
1250 kg
12 sheet
20 branch
```

---

# 16. RFQ Attachments

## 16.1 `rfq_attachments`

Metadata only.

```text
id
rfq_id
r2_object_key
original_filename
content_type
file_size
checksum
status
created_at
```

Binary file contents are stored in R2.

---

## 16.2 Supported file types

At minimum:

- PDF;
- XLS;
- XLSX;
- CSV;
- JPG;
- JPEG;
- PNG.

Allowed MIME types, extension checks, file size limits, and malware/security strategy must be defined in security documentation.

---

# 17. RFQ Submission Transaction

The website must implement the following sequence:

```text
1. Validate request
2. Validate RFQ items
3. Validate attachment metadata
4. Persist RFQ in D1
5. Persist RFQ items
6. Persist attachment references
7. Commit database transaction
8. Enqueue Odoo synchronization job
9. Return success to user
```

The success screen must not wait for Odoo.

---

# 18. Public RFQ Reference

Every RFQ receives a human-readable public reference.

Example:

```text
AA-RFQ-2026-000123
```

Internal database IDs must not be used as public references.

---

# 19. Idempotency

Idempotency is mandatory for:

- RFQ creation;
- customer creation;
- CRM lead creation;
- retryable queue jobs;
- webhook processing if introduced later.

---

## 19.1 `idempotency_key`

Every externally initiated write operation should carry a unique stable key.

If the same job is retried, the integration layer must detect that the business record has already been created.

---

## 19.2 Duplicate prevention

Never use only:

```text
customer email
```

or:

```text
mobile
```

as the idempotency key.

Those fields are customer matching signals, not transaction IDs.

---

# 20. Odoo Integration Domain

The integration layer is isolated from UI and application domain code.

Suggested conceptual modules:

```text
services/
  odoo/
    client
    auth
    customers
    products
    units
    prices
    rfqs
    crm
    quotations
    mappings
    errors
```

The exact folder structure is defined in `FOLDER_STRUCTURE.md`.

---

# 21. Odoo Object Mapping

Final mapping depends on installed Odoo modules and customizations.

Initial intended mapping:

| Website Concept | Odoo Concept |
|---|---|
| Customer / Company | `res.partner` |
| Product template | `product.template` |
| Product variant | `product.product` |
| Unit | `uom.uom` |
| RFQ / Lead | `crm.lead` or dedicated custom RFQ model |
| Quotation | `sale.order` |
| Quotation lines | `sale.order.line` |
| Price list | Odoo pricelist models |

Do not hardcode these mappings across the application.

All Odoo model mapping must be centralized in the integration layer.

---

# 22. Odoo Adapter Strategy

The application must access Odoo only through an adapter.

Application code must not depend directly on a specific Odoo API protocol.

Concept:

```text
Application Domain
      ↓
Odoo Service Interface
      ↓
Odoo Adapter
      ↓
Actual Odoo API
```

This allows future Odoo upgrades without rewriting business logic.

---

# 23. Sync Metadata

Website-side mirrored records should include, where applicable:

```text
odoo_id
sync_status
sync_version
last_synced_at
source_updated_at
last_sync_error
```

---

# 24. Synchronization Modes

Three modes are allowed.

## 24.1 Asynchronous event-based sync

Used for:

- RFQ submission;
- customer/lead creation;
- important business writes.

Flow:

```text
D1
 ↓
Queue
 ↓
Integration Worker
 ↓
Odoo
```

---

## 24.2 Scheduled pull

Used for:

- products;
- variants;
- units;
- public prices;
- selected availability information.

---

## 24.3 Manual operator sync

Available in admin for:

- recovery;
- debugging;
- specific catalog refresh;
- reprocessing failed records.

Manual sync must still use the same integration service layer.

---

# 25. Sync Conflict Strategy

For every synchronized field, ownership is predeclared.

Example:

```text
Product commercial name → Odoo owns
SEO title              → Website owns
Commercial price       → Odoo owns
Public price snapshot  → derived from Odoo
Article content        → Website owns
```

When conflict occurs, the authoritative source wins.

No last-write-wins strategy may be used across systems without explicit field ownership.

---

# 26. Queue Message Model

Queue payloads should be small and reference database records.

Preferred:

```json
{
  "event": "rfq.created",
  "rfq_id": "internal-id",
  "idempotency_key": "stable-key"
}
```

Avoid embedding large RFQ payloads or files in queue messages.

The consumer re-reads authoritative website-side data from D1.

---

# 27. Failure Recovery

## 27.1 Odoo unavailable

Behavior:

```text
RFQ saved in D1
Queue retained/retried
User sees successful submission
Odoo synchronization retries
```

---

## 27.2 Retry exhaustion

After configured retries:

```text
failed event
   ↓
dead-letter / failed-jobs workflow
   ↓
operator alert
```

The RFQ remains safely stored in D1.

---

## 27.3 Failed price sync

Continue serving the last valid price snapshot.

Never make the public site unavailable because price synchronization failed.

---

# 28. Integration Job Tracking

## 28.1 `integration_jobs`

Suggested fields:

```text
id
event_type
entity_type
entity_id
idempotency_key
status
attempt_count
last_error_code
last_error_message
created_at
updated_at
completed_at
```

Possible statuses:

```text
pending
processing
completed
failed
dead_letter
```

---

# 29. Integration Event Log

## 29.1 `integration_events`

Append-oriented diagnostic log.

```text
id
correlation_id
direction
system
event_type
entity_type
entity_id
result
duration_ms
error_code
created_at
```

Do not store secrets or full sensitive payloads in logs.

---

# 30. Media Domain

## 30.1 `media`

Suggested fields:

```text
id
r2_object_key
public_url
original_filename
content_type
file_size
width
height
alt_text
caption
checksum
status
created_by
created_at
updated_at
```

---

## 30.2 R2 storage prefixes

Recommended logical prefixes:

```text
articles/
products/
categories/
rfq/
brand/
system/
temp/
```

Do not depend on original filenames for uniqueness.

---

# 31. SEO Read Model

SEO pages must be renderable from local data.

A product page should be resolved using:

```text
category
product
variant
product_seo
public_price
media
internal links
```

without Odoo API access during the request.

---

# 32. Search and Filtering

Public catalog queries must use indexed structured fields.

Examples:

- category;
- product family;
- diameter;
- thickness;
- profile;
- grade;
- standard;
- price range;
- availability status if used.

Do not implement public filters by parsing free-text size labels.

---

# 33. Faceted URL Control

Not every filter combination becomes an indexable page.

Data architecture must distinguish:

```text
catalog filter state
```

from:

```text
SEO landing page
```

Only deliberately created SEO landing pages receive stable indexable URLs.

---

# 34. Localization

Textual website-owned content must support locales.

Recommended pattern:

```text
entity base record
      │
      └── localized content record
```

Avoid adding new language-specific columns such as:

```text
title_fa
title_en
title_ar
```

for every future language unless the entity is intentionally fixed to a small language set.

---

# 35. Currency

Pricing architecture must support multiple currencies even if launch uses one primary currency.

Use:

```text
currency_code
```

with ISO-style codes where possible.

Never infer currency solely from locale.

---

# 36. Time and Date Rules

Database timestamps must use UTC.

Presentation converts timestamps to the appropriate locale/timezone.

Fields such as:

```text
created_at
updated_at
published_at
effective_at
synced_at
```

must be unambiguous.

---

# 37. Soft Delete and Archival

Commercial catalog entities synchronized from Odoo should usually be deactivated rather than physically deleted.

Use:

```text
status
is_active
archived_at
```

as appropriate.

This protects:

- historical RFQs;
- historical prices;
- existing URLs;
- audit trails.

---

# 38. Referential Integrity

Foreign keys must be used where appropriate.

Examples:

```text
steel_products.category_id
product_variants.product_id
rfq_items.rfq_id
rfq_items.variant_id
public_prices.variant_id
```

Application code must not assume referential integrity without database constraints where those constraints are feasible.

---

# 39. Indexing Strategy

Indexes should be created for high-frequency access patterns.

Initial candidates:

```text
articles.slug
articles.status
steel_categories.slug
steel_categories.odoo_id
steel_products.slug
steel_products.odoo_template_id
product_variants.odoo_variant_id
product_variants.sku
public_prices.variant_id
public_prices.is_current
rfqs.public_reference
rfqs.idempotency_key
rfqs.sync_status
rfq_items.rfq_id
integration_jobs.status
integration_jobs.idempotency_key
```

Attribute-based filters require indexes designed around actual query patterns.

Do not create indexes blindly.

---

# 40. Slug Rules

Slugs are website presentation identifiers.

Odoo IDs are never used as public URL identifiers.

A product may have:

```text
odoo_variant_id = 1234
slug = "ipe-18"
```

The public URL uses the slug.

---

# 41. External IDs

All synchronized entities require stable external references.

Do not infer identity from names.

Examples:

Bad:

```text
match product by name
```

Good:

```text
match product by odoo_id
```

Names can change.

---

# 42. Audit Domain

Administrative changes affecting business or SEO must be auditable.

## 42.1 `audit_logs`

Suggested fields:

```text
id
actor_user_id
action
entity_type
entity_id
before_snapshot
after_snapshot
ip_hash_or_request_reference
created_at
```

Examples:

- article published;
- SEO title changed;
- category page deindexed;
- price sync manually triggered;
- failed RFQ reprocessed;
- product SEO content updated.

---

# 43. Sensitive Data

Sensitive data must be minimized.

Do not store:

- Odoo API keys;
- Cloudflare secrets;
- authentication tokens;
- raw passwords;
- unnecessary personal data;

inside D1 application tables.

Secrets belong in environment secret storage.

---

# 44. Personal Data Retention

RFQ/customer contact information must have a retention policy.

Retention rules must be defined before production launch and aligned with applicable legal and business requirements.

Data should not be retained indefinitely without purpose.

---

# 45. Cache Relationship to Data

D1 is not the CDN cache.

The stack is:

```text
Authoritative website data / read model
              ↓
              D1
              ↓
       Rendered response
              ↓
      Cloudflare cache
              ↓
            User
```

Database updates may require targeted cache invalidation.

---

# 46. Cache Invalidation Events

Examples:

```text
article.published
article.updated
product.updated
product_seo.updated
category_seo.updated
price.updated
```

These events should trigger purge/revalidation only for affected routes or cache tags.

Do not purge the entire website cache for routine content changes.

---

# 47. Price Cache Invalidation

When a price changes:

```text
Odoo
  ↓
Price Sync
  ↓
D1 update
  ↓
Invalidate:
  - affected product page
  - affected price page
  - affected category price listing
```

---

# 48. Public Read Consistency

The public site favors:

```text
high availability + fast reads + eventual synchronization
```

over:

```text
blocking every request on perfectly real-time ERP data
```

Price pages must clearly expose the last update time where useful.

---

# 49. Transaction Boundaries

Use transactions for local multi-table operations that must succeed or fail together.

Example RFQ creation:

```text
rfqs
rfq_items
attachment metadata
integration job reference
```

must not leave orphaned partial records.

---

# 50. Data Validation

Validation exists at three layers:

1. client-side UX validation;
2. server-side application validation;
3. database constraints.

Server-side validation is authoritative.

---

# 51. Numeric Rules

Use numeric/decimal-safe storage for:

- quantity;
- price;
- dimensions;
- weights.

Never use floating-point behavior where financial precision can be affected.

---

# 52. Product Dimension Units

Physical attributes must store the value and its unit semantics consistently.

Example:

```text
thickness = 3
unit = mm
```

Do not mix:

```text
3
0.3
30
```

for millimeters/centimeters without explicit normalization rules.

---

# 53. Derived Fields

Derived fields such as:

```text
display_size
formatted_price
formatted_quantity
```

should generally be computed for presentation.

Do not duplicate derived values as authoritative data unless there is a measurable performance reason.

---

# 54. Data Import

Catalog import must support controlled bulk loading.

Possible sources:

- Odoo synchronization;
- CSV;
- XLSX;
- operator-assisted migration.

Every import path must:

- validate data;
- produce an import report;
- preserve stable IDs;
- reject or quarantine malformed records;
- be repeatable safely.

---

# 55. Article Publishing Workflow

Suggested lifecycle:

```text
Draft
  ↓
Review
  ↓
Published
  ↓
Archived
```

Publishing updates:

- article data;
- sitemap visibility;
- relevant cache;
- internal search/index;
- structured metadata.

---

# 56. Product Publication Workflow

A commercial product existing in Odoo does not automatically mean it should have an indexable public page.

Website publication requires:

```text
commercial product exists
+
website visibility enabled
+
valid slug
+
required SEO content
+
indexing policy
```

This avoids thin or accidental pages.

---

# 57. Price Publication Rules

A synchronized Odoo price may be excluded from public display based on:

- visibility rules;
- missing unit;
- missing currency;
- invalid/zero value;
- stale beyond allowed threshold;
- product not public;
- operator override.

---

# 58. Customer Matching

When an RFQ is synchronized, Odoo customer matching may consider:

- normalized mobile;
- email;
- company name;
- tax/company ID if provided;
- existing Odoo identifiers.

Matching policy must be conservative.

Do not merge contacts automatically based only on a weak fuzzy match.

---

# 59. Correlation IDs

Every business-critical request should have a correlation ID.

Use it across:

```text
request logs
D1 records
queue messages
integration logs
Odoo integration
```

This simplifies debugging.

---

# 60. Observability Requirements

The application must expose measurable signals for:

- RFQ submission success rate;
- queue age;
- queue failures;
- Odoo sync latency;
- Odoo sync error rate;
- price sync freshness;
- product sync freshness;
- database errors;
- cache hit ratio;
- admin write failures.

---

# 61. Backup and Recovery

Before production, define:

- D1 backup/recovery procedure;
- R2 retention/versioning strategy where appropriate;
- Odoo backup ownership;
- recovery process for failed sync jobs;
- export procedure for critical RFQ records.

Website backups do not replace Odoo backups.

Odoo backups do not replace website content backups.

---

# 62. Environment Separation

At minimum:

```text
development
staging
production
```

must use separate:

- D1 databases;
- R2 buckets or isolated prefixes;
- queues;
- API keys;
- Odoo integration credentials;
- cache namespaces where applicable.

Production customer data must never be copied into development casually.

---

# 63. Seed Data

Seed scripts may include:

- default roles;
- default article categories;
- default steel categories;
- unit definitions;
- attribute definitions;
- non-sensitive configuration.

Seed scripts must not include:

- production secrets;
- production customer records;
- production API tokens.

---

# 64. Migration Strategy

All schema changes must be migration-driven.

Never modify production tables manually as the normal workflow.

Migration files must be:

- version-controlled;
- deterministic;
- reviewable;
- deployable in order.

---

# 65. Compatibility with Odoo Customizations

The data layer must assume Odoo may contain custom modules.

Therefore:

- mappings are configurable;
- Odoo field names are centralized;
- custom RFQ models are allowed;
- the website domain model is not tightly coupled to default Odoo internals.

---

# 66. Recommended Initial D1 Tables

Initial implementation should expect at least the following tables:

```text
users
roles
user_roles

articles
article_categories

steel_categories
steel_products
product_variants

attribute_definitions
variant_attribute_values
units

product_seo
category_seo

public_prices
price_history

rfqs
rfq_items
rfq_attachments

media

integration_jobs
integration_events

audit_logs

app_settings
```

The exact SQL schema belongs in:

```text
DATABASE_SCHEMA.md
```

This document defines architecture, ownership, and behavior.

---

# 67. Tables That Should NOT Become Website-Owned ERP Duplicates

Do not recreate full ERP equivalents for:

```text
purchase_orders
supplier_accounting
stock_moves
invoices
general_ledger
vendor_bills
manufacturing_orders
```

unless a future website feature explicitly requires a read model.

Odoo remains the operational system.

---

# 68. Admin Data Responsibilities

Website admin manages:

- articles;
- article categories;
- SEO content;
- product landing-page content;
- category landing-page content;
- media;
- indexability;
- selected website settings;
- RFQ visibility/recovery tools.

Odoo users manage:

- commercial product master;
- prices;
- customers;
- CRM;
- quotations;
- sales;
- stock;
- procurement;
- accounting.

---

# 69. Performance Requirements for Data Access

Public requests must:

- avoid N+1 database access;
- avoid unnecessary Odoo calls;
- query indexed fields;
- use small result sets;
- paginate large collections;
- cache stable public responses;
- minimize serialized payload sizes.

---

# 70. SEO Requirements for Data Architecture

The data model must allow server rendering of:

- title;
- meta description;
- H1;
- canonical;
- hreflang where applicable;
- breadcrumb;
- structured data;
- article body;
- category content;
- product content;
- current public price;
- last price update;
- internal links.

None of these may depend on client-side JavaScript fetching Odoo after initial page load.

---

# 71. Noindex / Indexing State

Content entities with public routes must support explicit indexing state.

Suggested values:

```text
index
noindex
draft
archived
```

Do not derive indexing solely from whether a database record exists.

---

# 72. Data Quality Rules

Synchronization jobs must detect and report:

- missing product identifiers;
- duplicate Odoo IDs;
- unknown units;
- malformed prices;
- missing currency;
- orphaned variants;
- invalid product/category relationships.

Bad upstream data must not silently corrupt the public catalog.

---

# 73. Future Customer Portal Readiness

The architecture should permit a future portal where a customer can view:

- submitted RFQs;
- status;
- quotation references;
- documents;
- order status.

However, customer portal functionality is not required to be implemented unless separately specified.

If introduced, sensitive commercial data should be fetched through authenticated server-side flows and may require more direct Odoo interaction than public pages.

---

# 74. Future Multi-Country Readiness

The model should accommodate:

- Iran;
- Iraq;
- Oman;
- other GCC markets.

Future fields may include:

```text
market
country
currency
localized price visibility
tax rules
availability rules
sales team mapping
Odoo company mapping
```

Do not hardcode Iran-specific assumptions deeply into the schema.

---

# 75. Future Multi-Company Odoo Readiness

If Odoo later hosts multiple companies:

- store Odoo company identifiers;
- scope prices and products where necessary;
- include company context in integration calls;
- prevent cross-company data leakage.

---

# 76. Non-Negotiable Architecture Rules

Claude Code and developers must follow these rules:

1. **Odoo is the commercial source of truth.**
2. **The public website must not depend on live Odoo responses to render pages.**
3. **RFQs must be durably stored before synchronization.**
4. **RFQ synchronization must be asynchronous and retryable.**
5. **All retryable business writes must be idempotent.**
6. **Large files must be stored in R2, not D1.**
7. **SEO content belongs to the website, not the ERP.**
8. **Commercial pricing belongs to Odoo; the website stores a public read model.**
9. **Product dimensions must be structured, not stored only as free text.**
10. **Request units and price units are separate concepts.**
11. **Odoo IDs are never public URL identifiers.**
12. **All synchronized records require stable external identifiers.**
13. **Public pages must be renderable from Cloudflare-side data.**
14. **Schema changes must be migration-driven.**
15. **Secrets must never be stored in application tables or client code.**
16. **The website must continue accepting RFQs during Odoo outages.**
17. **Data ownership conflicts are resolved by predefined system ownership, not last-write-wins.**
18. **Public product pages require explicit publication/indexing rules.**
19. **Thin pages must not be auto-generated merely because a product exists in Odoo.**
20. **All business-critical operations must be observable and auditable.**

---

# 77. Implementation Dependencies

This document must remain aligned with:

```text
TECHNICAL_ARCHITECTURE.md
STACK.md
DATABASE_SCHEMA.md
ODOO_INTEGRATION.md
SYSTEM_OF_RECORD.md
SYNC_STRATEGY.md
ERP_DATA_MAPPING.md
FAILURE_RECOVERY.md
PRODUCT_CATALOG_SPEC.md
PRICING_SYSTEM.md
RFQ_SYSTEM.md
CMS_ARCHITECTURE.md
API_INTEGRATIONS.md
SECURITY_GUIDELINES.md
CACHING_STRATEGY.md
PERFORMANCE_GUIDELINES.md
SEO_STRATEGY.md
ENVIRONMENT_VARIABLES.md
TESTING_STRATEGY.md
CLAUDE.md
DECISIONS.md
```

If a conflict exists, the latest explicit architectural decision in `DECISIONS.md` must be reviewed and the affected documents updated together.

---

# 78. Final Target Architecture

```text
                         PUBLIC USERS
                              │
                              ▼
                        ahanassa.com
                              │
                              ▼
                    Cloudflare Edge Cache
                              │
                              ▼
                    Next.js / Workers
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     D1 Read Model            R2               D1 Writes
   Products / Prices       Media/Files             │
   Articles / SEO                                  │
                                                  ▼
                                              RFQ Record
                                                  │
                                                  ▼
                                                Queue
                                                  │
                                                  ▼
                                         Odoo Integration
                                                  │
                                                  ▼
                                        odoo.ahanassa.com
                                                  │
                       ┌──────────────────────────┼─────────────────────────┐
                       ▼                          ▼                         ▼
                   Customers                    CRM                     Sales
                       │                          │                         │
                       └──────────────┬───────────┴──────────────┬─────────┘
                                      ▼                          ▼
                                   Products                    Prices
```

---

# 79. Acceptance Criteria

The data architecture is considered correctly implemented when:

- an operator can publish an article without deploying code;
- public product/category/article pages render without calling Odoo;
- product catalog data can synchronize from Odoo;
- public price snapshots can synchronize from Odoo;
- price history is retained where configured;
- an RFQ can contain unlimited practical item rows;
- every RFQ row supports category, product, variant/size, unit, and quantity;
- free-text fallback items are supported;
- RFQ files can be stored in R2;
- a submitted RFQ remains safe even if Odoo is offline;
- failed Odoo synchronization retries safely;
- duplicate retries do not create duplicate CRM records;
- synchronization failures are observable;
- product SEO content remains website-managed;
- all public indexable pages can be server-rendered from Cloudflare-side data;
- cache invalidation can be targeted after content or price updates;
- all schema changes are performed through migrations.

---

# 80. Final Decision

Ahan Asa will use a **hybrid Website + ERP data architecture**.

The website is optimized for:

```text
Speed
SEO
Content
Discovery
RFQ UX
Resilience
```

Odoo is optimized for:

```text
Customers
CRM
Products
Prices
Quotations
Sales
Operations
```

The integration layer connects the two systems without making either one unnecessarily dependent on the other.

**The public website must remain fast even when Odoo is slow.**

**Commercial truth must remain centralized in Odoo.**

**SEO and presentation must remain under website control.**

**No customer RFQ may be lost because of an ERP outage.**
