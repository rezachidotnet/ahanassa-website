# Ahan Asa Secure RFQ Intake API v1

## Endpoint

`POST /api/v1/rfq` only. No status, catalog, CRM, order, or mutation routes are included. This is a server-to-server endpoint for the Cloudflare/website backend, not browser-to-Odoo access.

## Authentication and headers

Required headers: `Authorization: Bearer <runtime secret>`, `Content-Type: application/json`, and `Idempotency-Key`. The secret is read from runtime configuration key `ahanassa_rfq_api_secret` or environment variable `AHANASSA_RFQ_API_SECRET`; its value is not stored in source/database/logs. Bearer comparison is constant-time. Missing, malformed and incorrect credentials all return generic 401. `save_session=False` and CSRF is disabled only because bearer authentication is mandatory.

## Request body

```json
{"locale":"fa","customer":{"name":"Ali Rezaei","company":"Example Co.","phone":"+989121234567","email":"a@example.com","country":"IR","city":"Tehran"},"items":[{"product_variant_xid":"ahanassa_marketplace.product_rb_aj400_d16_l12","sku":"AA-RB-AJ400-D16-L12","quantity":12,"uom":"ton","notes":""},{"description":"Uncatalogued steel requirement","quantity":5,"uom":"piece","notes":""}],"notes":"","consent":{"contact":true,"privacy_version":"v1"},"source":{"utm_source":"website"}}
```

Only `locale`, `customer`, `items`, `notes`, `consent`, and UTM `source` metadata are accepted. State, reference, partner/user/team/CRM IDs, suppliers/offers, prices, MOQ, normalized quantities, conversion factors, model/fields/domain and database IDs are rejected. Customer name plus phone or email is required; email syntax is checked; all text is bounded plain text.

## Lines and identity

Each line uses either an active canonical Product Variant XID or explicit free-text description. XID is authoritative; supplied SKU is an audit snapshot only and mismatches do not alter Product Master. Invalid/inactive/archived/wrong-model XIDs return a controlled 400 and never become free text. UoM codes are controlled (`kg`, `ton`, `branch`, `sheet`, `meter`, `coil`, `bundle`, `piece`); native IDs are not accepted. Original quantity/UoM are preserved and nominal conversion is delegated to the RFQ model; Supplier MOQ is never applied.

## Limits and atomicity

JSON body maximum is 512 KiB and maximum line count is 200. Quantities must be finite, positive and bounded. Header/line text has explicit limits. Header and all lines are created atomically; any validation failure rolls back the entire request. No Partner, CRM Lead, Sale/Purchase Order, invoice, stock, lot or Supplier Offer is created.

## Idempotency and responses

The key is bounded safe ASCII and stored with a SHA-256 normalized payload fingerprint. First request returns 201 with `{"data":{"reference":"RFQ-YYYY-######","status":"received"},"meta":{"idempotent_replay":false}}`. Same key and same body returns 200 with the same reference and no new records. Same key and different body returns 409. Errors use a safe `{error:{code,message,line?}}` envelope and never expose stack traces, models, SQL, or PII.

## Cloudflare contract

Cloudflare/website backend must keep the bearer secret server-side, hide the Odoo origin, enforce WAF/bot protection (Turnstile before server-to-server forwarding), rate limits, request timeout/body limits, and retries using the same Idempotency-Key. Odoo remains the authoritative schema/security gate. Attachments are not accepted in this phase; use a later private `ir.attachment` flow with scanning and MIME limits.
