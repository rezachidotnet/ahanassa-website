# Ahan Asa RFQ Backend Architecture (Phase 6A)

## Recommended boundary

The implemented dedicated `ahanassa.rfq` header and `ahanassa.rfq.line` models are the customer business request boundary. An RFQ is not a quotation, lead, purchase order, or stock transaction.

```text
Website (validated write)
        ↓
ahanassa.rfq + ahanassa.rfq.line
        ↓ (qualification)
optional crm.lead/opportunity
        ↓
commercial quotation / sourcing allocation
        ├── sale.order (later)
        └── purchase.order from selected Offers (later)
```

## Header design

Use a sequence-backed public reference (`RFQ-YYYY-####`) and immutable website idempotency key. Store source (`website`), submitted locale (`fa|en|ar`), submitted timestamp, customer notes, consent/privacy metadata, UTM/source values, optional `partner_id`, and raw submitted contact snapshots (name, company, phone, email, country, city). Add `mail.thread` and `mail.activity.mixin` for assignment, status, notes and activities. Assignment should initially be an unassigned queue/default Sales team; routing is a later policy.

## Line design

Each line stores the resolved canonical `product.product` relation when `product_variant_xid` is valid, plus immutable `product_variant_xid_snapshot` and `sku_snapshot`, `requested_qty_original`, `requested_uom_code_snapshot`/label, customer description/notes, and optional nominal conversion snapshot (`normalized_qty`, normalized UoM, factor, source nominal field and captured-at). The original quantity/UoM is authoritative intake history; nominal kg is an estimate, never actual settlement.

Unknown products are supported only when the client explicitly sends a free-text line (`product_variant_xid=null`, bounded `customer_description`). Invalid XIDs are validation errors and are not silently converted to free text. No Product Master record is created from intake.

## Identity and UoM

Resolve XIDs through active canonical Product Master/Public Catalog eligibility. SKU is display/audit evidence, not relation identity; stale/mismatched SKU is logged and current canonical SKU is snapshotted. Customer RFQ UoM is independent of supplier Offer price UoM. Validate a line's UoM against the product's approved commercial units (`kg, ton, branch, sheet, meter, coil, bundle, piece` as applicable), while preserving the raw submitted code. Quantity must be finite, positive, bounded, and never checked against Supplier MOQ at intake.

## Lifecycle

Use one RFQ lifecycle (`new`, `under_review`, `qualified`, `sourcing`, `quoted`, `won`, `lost`, `cancelled`) with controlled transitions. CRM stages remain CRM's state machine; do not duplicate them in the RFQ. Create a CRM lead/opportunity after qualification by default to avoid CRM noise. Existing `crm.lead.x_website_rfq_reference` is a unique defense-in-depth reference for future linkage, not an RFQ model.

## Customer and partner policy

Do not create or merge Partners solely from an unverified phone/name. Preserve raw submitted values plus normalized comparison values. Matching precedence may be verified email, normalized phone, then VAT/company identifier; ambiguous matches require operator review. A later approved workflow may link/create a partner. Customer data is private and must not enter the public catalog projection.

## Security and intake controls

Future write API must be a narrow typed endpoint: no model/field/domain/DB-ID inputs, no salesperson/supplier/Offer/status inputs. Cloudflare should provide WAF, bot challenge, rate limits, body-size limits and edge abuse controls; Odoo must still enforce authentication/origin policy, CSRF strategy for the chosen server-to-server flow, payload schema, line/text/attachment caps, safe plain-text notes, idempotency uniqueness, and audit logging. Use an `Idempotency-Key` plus a unique stored request key; same key with a different payload must fail closed. Do not expose Odoo sessions to the website.

Attachments should use native `ir.attachment` linked to RFQ, after MIME allow-listing, size/count limits, malware scanning and private ACLs. Suggested initial types are PDF, XLSX/CSV, PNG/JPEG; do not permit arbitrary HTML/scripts. Public upload tokens must be single-use/short-lived and never reveal attachment URLs directly.

## Sourcing and transactions

RFQs remain valid with zero active Supplier Offers. A later sourcing-allocation model can split one original line across multiple Offers without rewriting the line. Sale quotations and Purchase Orders are downstream documents and must carry original RFQ line snapshots and source Offer snapshots; no automatic PO/SO is created by intake.

## Implemented Phase 6A.1 and future phases

Phase 6A.1 implements the sequence-backed reference, private snapshots, product-XID resolver, nominal conversion snapshots, free-text/catalog line modes, immutable idempotency key, lifecycle selection, chatter/activities, ACLs, record rules, and internal RFQ views. It does not expose a public HTTP route.

## Future phases

6A.1: models, security, sequence, idempotency and snapshot schema. 6B: narrow Cloudflare/Odoo write API. 6C: qualification/CRM workflow. 6D: Offer matching and sourcing allocations. Excel/CSV structured import can follow basic web lines; PDF/image attachments first remain human-reviewed (OCR is later).

## Verification-session binding invariant

For API-created RFQs, the opaque verification session is generated and fingerprinted before the RFQ ORM `create()` call. The fingerprint is included in the initial create values and is immutable thereafter; only the opaque token is returned to the trusted caller. Idempotent replay preserves the original binding and does not issue a replacement session.
## Phase 6C customer resolution

RFQs now retain immutable submitted contact snapshots and private normalized phone/email comparison fields. Deterministic candidate detection classifies records as unresolved, possible match, existing customer, new customer, or conflict; it never merges or silently links by name. Authorized operators confirm/reject candidates, qualify requests, create a Partner only after a second duplicate check and qualification, and create one native CRM opportunity idempotently. Verification metadata is separate from matching and qualification; OTP/email provider integration is deferred to Phase 6C.1. The public RFQ API performs candidate detection only and never exposes or creates customer/CRM records.
