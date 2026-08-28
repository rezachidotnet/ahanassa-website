# Ahan Asa Website — Customer Portal Architecture

> **Brand:** Ahan Asa | آهن آسا
> **Domain:** `https://ahanassa.com`
> **ERP:** `https://odoo.ahanassa.com`
> **Document:** `CUSTOMER_PORTAL.md`
> **Status:** Accepted — future-phase architecture; not a Phase 1 implementation authorization
> **Last updated:** 2026-08-28
> **Approved by:** Project owner, 2026-08-28
> **Scope:** Customer Portal boundary and MVP scope; portal-Odoo decoupling; public pricing read-model, edge caching, and cache invalidation; logical data-domain separation

---

## 1. Purpose

This document formalizes the approved future architecture for a Customer Portal, and the read-model/caching architecture (pricing and catalog) that both the public site and the future portal depend on. Like `CUSTOMER_ACCOUNT_ARCHITECTURE.md`, this is **architecture, not an implementation authorization** — no portal pages, authentication, or Odoo customer-facing endpoints are built by this document. See `DECISIONS.md` ADR-017.

`TECHNICAL_ARCHITECTURE.md` §17 already states "Odoo integration does not imply a customer portal; that remains out of initial scope" — that remains true for the current implementation phase. This document defines what "in scope, later" means so a future phase has an approved design to build against, and so nothing in the current RFQ/pricing/catalog implementation has to be redesigned to accommodate it.

## 2. Customer Portal — MVP boundary vs. future capabilities

```text
Customer Portal (MVP — first implementation milestone, when approved)
├── Profile / company information
├── RFQ history
├── RFQ details
└── RFQ status

Customer Portal (future — NOT part of the first milestone)
├── Quotations
├── Orders
├── Invoices
├── Documents
├── Repeat RFQ
└── Saved company/contact details
```

Rules:

- The MVP list above is the full scope of the *first* portal implementation milestone once it is approved to begin. Do not build any "future" item in the same pass as the MVP items without a separate approval, even if it looks small.
- The MVP list is itself not authorized to begin now — see §1. This table exists so that when it is approved, scope is unambiguous.
- RFQ status shown in the portal must be the same approved public/authenticated projection already governed by `TECHNICAL_ARCHITECTURE.md` §12.3's sync-state model (`received → queued → syncing → synced`, plus `retry_pending`/`failed_review`), not a new parallel status vocabulary. Sales-stage detail lives in Odoo and is not exposed as portal status (`TECHNICAL_ARCHITECTURE.md` §12.3, last line).

## 3. Portal must not depend on live Odoo reads

Binding architecture, restated from the project's existing "no synchronous Odoo dependency" principle (`PROJECT_OVERRIDES.md` §3, `TECHNICAL_ARCHITECTURE.md` §3.2) and extended explicitly to the authenticated portal surface, which was not previously in scope to state this about:

**Prohibited:**

```text
Browser
  ↓
Odoo API
```

**Prohibited (also):** designing every portal page so that it requires a live Odoo request to render, even indirectly through a server-side call made synchronously on the request path.

**Required:**

```text
Customer Browser
  ↓
Website (authenticated)
  ↓
Website API
  ↓
Website-side operational/read model   (D1 — the same kind of projection already used for public catalog/pricing)
  ↓
Async synchronization
  ↓
Odoo
```

Consequences:

- Odoo remains the ERP/business source of truth for the underlying business processes (quotations, orders, invoices — when those portal capabilities are eventually built). Portal *responsiveness and availability* must not be coupled to Odoo uptime.
- If Odoo is temporarily unavailable, already-synchronized customer history (RFQs, and later quotations/orders once those sync) should remain viewable, consistent with the existing RFQ durability guarantee that Odoo outage never blocks or loses website-side data (`CLAUDE.md` §10, `TECHNICAL_ARCHITECTURE.md` §12.3).
- This is the same architectural pattern already fully implemented for RFQ intake (D1 + outbox + async Odoo sync, `DOCUMENT_AUDIT_REPORT.md` DAR-023/DAR-024) and for public catalog/pricing (§5 below) — the portal is a third consumer of the same pattern, not a new one.
- Authorization for every portal read is a server-side check per `CUSTOMER_ACCOUNT_ARCHITECTURE.md` §8 — the read-model architecture above describes data flow, not a relaxation of that authorization rule.

## 4. UX principle: guest RFQ first, account optional

Restated from `CUSTOMER_ACCOUNT_ARCHITECTURE.md` §2 because it directly shapes portal-adjacent UX decisions:

```text
Guest RFQ first
Account optional afterward
```

**not:**

```text
Register first
  → Login
  → Profile setup
  → RFQ
```

The primary business conversion remains RFQ submission. Any future portal-adjacent UI (an "activate your account" prompt after RFQ confirmation, a portal login link in navigation, etc.) must not create friction in front of the RFQ flow itself, and must not imply that submitting an RFQ requires an account.

## 5. Odoo is the pricing source of truth; public price read model

### 5.1 Single authoritative source

```text
Odoo = commercial pricing source of truth
```

This restates and does not change `TECHNICAL_ARCHITECTURE.md` §11.2 ("Commercial prices are edited in Odoo, never independently in website admin") and `PROJECT_OVERRIDES.md` §4. It is included here because the Customer Portal's future "Quotations"/"Orders" display (§2) must follow the identical rule: the website never becomes a second authoritative price-entry system.

- Website administration may show current synced price, last sync timestamp, sync status, and errors (already stated in `TECHNICAL_ARCHITECTURE.md` §11.2's second bullet) — never an independent editable price field.
- Avoid ever reaching a state where `Odoo price = X` and `Website admin price = Y` with unclear precedence: if the website ever displays a price that cannot be traced to a specific Odoo sync event and timestamp, that is a defect, not an acceptable variance.
- An explicit future override policy (e.g., a website-controlled promotional adjustment layered on top of the synced Odoo price) is out of scope unless separately approved — this document does not introduce one.

### 5.2 Public price read model

```text
Odoo
  ↓
Price synchronization
  ↓
Website public price read model   (D1 — public_prices / price_history, DATABASE_SCHEMA.md §5.3)
  ↓
Cloudflare cache
  ↓
Visitor
```

This is the architecture already specified in `TECHNICAL_ARCHITECTURE.md` §11.3 and `DATABASE_SCHEMA.md` §5.3 — this document does not redefine it, only reaffirms it as binding and extends the same pattern to portal-visible commercial data (§3). The website public website must not query Odoo on every visitor request; a public page view does not imply one Odoo request, and does not necessarily imply one D1 query either (§6).

## 6. Edge caching for prices and SEO pages

A page view should not imply `one visitor = one Odoo request`, and should not necessarily imply `one visitor = one D1 query`. Public price pages and SEO pages should use the existing Cloudflare caching strategy (`CACHING_STRATEGY.md`, `TECHNICAL_ARCHITECTURE.md` §18) where safe:

```text
First request / cache miss
  ↓
Public Price Read Model (D1)
  ↓
Cloudflare Edge Cache

Subsequent requests
  ↓
Edge Cache  (no D1 query, no Odoo request)
```

- Price pages already use shorter cache freshness than editorial pages (`TECHNICAL_ARCHITECTURE.md` §18, §9.2's rendering matrix — "Price pages: Cached server HTML ... Short freshness + SWR").
- Price synchronization must support targeted cache invalidation/revalidation (§7) rather than relying on freshness expiry alone for material price changes.
- This document does not specify a cache API implementation beyond what `CACHING_STRATEGY.md` and `TECHNICAL_ARCHITECTURE.md` §18 already define (CDN `Cache-Control`/SWR and Workers Cache API, kept distinct per §18's existing rule). No new cache infrastructure is introduced or required by this document.

## 7. Pricing cache invalidation

When a public price changes:

```text
Odoo
  ↓
Sync
  ↓
Read model update (D1)
  ↓
Relevant cache invalidation
  ↓
Visitors receive new price
```

- Prefer granular invalidation using the tag taxonomy already defined in `TECHNICAL_ARCHITECTURE.md` §18 and `DATABASE_SCHEMA.md` §12 — `price:<variant-id>`, `product:<product-id>`, `catalog-category:<category-id>` — rather than clearing the entire website cache.
- Global purge remains an incident action, not a normal part of the price-sync path (`TECHNICAL_ARCHITECTURE.md` §18, last line — unchanged).
- The exact cache-tag *implementation* (which Cloudflare invalidation API, batching behavior, etc.) remains subject to the already-approved Cloudflare architecture in `CACHING_STRATEGY.md`; this document does not invent a new mechanism.

## 8. Logical data-domain separation

The existing `DB_OPS` database should remain focused primarily on operational RFQ/integration responsibilities. It must not become a universal application database.

```text
DB_OPS  (existing — DATABASE_SCHEMA.md §6, unchanged by this document)
  → RFQ, RFQ items, RFQ contacts
  → customer operational references         (future account_id/customer_id link — CUSTOMER_ACCOUNT_ARCHITECTURE.md §6)
  → integration mappings
  → outbox, attempts, dead-letter records
  → staff authorization / audit

CATALOG DOMAIN  (existing — DB_PUBLIC, DATABASE_SCHEMA.md §5.2, unchanged)
  → products, categories, variants, units
  → technical/commercial identifiers

PRICING DOMAIN  (existing — DB_PUBLIC, DATABASE_SCHEMA.md §5.3, unchanged)
  → public prices, price history
  → price update timestamps, synchronization state

CONTENT DOMAIN  (existing — DB_PUBLIC, DATABASE_SCHEMA.md §5.1, unchanged)
  → articles, SEO content, CMS-managed website content
```

These are **logical** domain boundaries the schema already substantially follows (the current two-database split — `DB_PUBLIC` for catalog/pricing/content, `DB_OPS` for RFQ/integration/authorization — already separates catalog+pricing+content from operational data; see `DATABASE_SCHEMA.md` §4.1/§4.2). This document restates them explicitly as durable boundaries so a future Customer Portal implementation does not collapse everything into `DB_OPS` merely because RFQs already live there.

**Do not require separate physical D1 databases immediately.** The architecture should permit future separation into `DB_OPS` / `DB_CATALOG` / `DB_PRICING` / `DB_CONTENT` if scale or operational needs justify it later — but `DB_PUBLIC` remains one physical database (already holding catalog+pricing+content together) unless and until that future justification and decision exist. No physical database split is authorized or performed by this document.

### 8.1 Customer data and pricing must not pollute SEO content ownership

Restated from the same system-of-record model already in force (`TECHNICAL_ARCHITECTURE.md` §5, `CLAUDE.md` §8):

- Odoo: customers, commercial products, pricing, CRM, quotations, sales/orders.
- Website: public presentation, RFQ UX, customer portal UX/read models (future), SEO, editorial product content, articles, structured website content.
- Cloudflare: edge delivery, APIs, operational read models, caching, queues, integration boundary.

Editorial/SEO ownership does not move to Odoo merely because the commercial product records that SEO pages describe originate there — this was already true and is unaffected by the account/portal/pricing decisions in this document and `CUSTOMER_ACCOUNT_ARCHITECTURE.md`.

## 9. Product catalog and pricing are different concerns

```text
Odoo Product Master
  ↓
Catalog synchronization
  ↓
Website Catalog Read Model

Odoo Pricing
  ↓
Price synchronization
  ↓
Website Price Read Model
```

Restated from the existing two-layer product model (`TECHNICAL_ARCHITECTURE.md` §11.1) — product commercial/master data and public pricing are not identical concepts and sync independently. This allows rich SEO product pages without making the website the commercial ERP source of truth, and allows a future portal to show order/quotation history (sourced from a different sync path than catalog/pricing) without conflating the two.

## 10. Scalability strategy

The project should remain simple today and clearly separable tomorrow.

Do **not** introduce, as part of this document or any future portal/pricing work it authorizes, without a separate justified decision:

- microservices;
- database sharding;
- distributed customer services;
- Kafka-like infrastructure;
- Kubernetes;
- multiple physical databases without a measured operational justification (§8).

Do avoid tight coupling that would make the future domain separation in §8 harder — e.g., do not let a future portal feature directly join across `DB_PUBLIC` and `DB_OPS` tables in application code in a way that assumes they will always be the same physical database. Cloudflare Workers/Queues remain the scalable edge/async layer already approved (`TECHNICAL_ARCHITECTURE.md` §4/§6); D1 domain boundaries (§8) must remain explicit in code organization even while physically unified.

## 11. Production jurisdiction remains an explicit gate

Restated from `DOCUMENT_AUDIT_REPORT.md` DAR-024 because the portal/account phase will eventually need its own production data, and must not silently inherit an undecided policy:

- The staging D1 database (`ahanassa-ops-staging`) exists only for staging/testing. Its automatic `WEUR` placement (Cloudflare's default region based on request origin at creation time) is a platform default, **not** a production jurisdiction decision.
- Production D1/R2 jurisdiction/location remains unresolved until explicitly approved by the owner, per `DATABASE_SCHEMA.md` §18's existing "Data location" implementation gate.
- **Never promote or reuse the staging D1 database as the production operations database** — D1 jurisdiction cannot be changed on an existing database after creation, so production cannot simply reuse or relocate the staging one (`DOCUMENT_AUDIT_REPORT.md` DAR-024, unchanged).
- This applies equally to any future account/portal/customer data: it must be provisioned under the same eventual owner-approved jurisdiction policy, not defaulted from whatever staging happened to use.

## 12. Related documents

- `CUSTOMER_ACCOUNT_ARCHITECTURE.md` — identity/account/customer model, guest-RFQ linking, Odoo customer mapping, authentication requirements.
- `TECHNICAL_ARCHITECTURE.md` §11, §17, §18 — catalog/pricing rules, admin/authorization (portal-out-of-scope statement), cache architecture.
- `DATABASE_SCHEMA.md` §4, §5.3, §12, §18 — schema overview, pricing tables, cache invalidation, implementation gates.
- `CACHING_STRATEGY.md` — full cache layer/tag/invalidation contract this document defers to.
- `PROJECT_OVERRIDES.md` §4, new §13 — public pricing scope confirmation and this decision's cross-project record.
- `DECISIONS.md` ADR-002, ADR-017.
- `DOCUMENT_AUDIT_REPORT.md` DAR-024 and the new entry recording this pass.

---

**End of `CUSTOMER_PORTAL.md`**
