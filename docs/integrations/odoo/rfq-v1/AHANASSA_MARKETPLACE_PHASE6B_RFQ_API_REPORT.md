# Ahan Asa Marketplace — Phase 6B RFQ API Report

## Module version

`19.0.7.0.0 → 19.0.8.0.0`, database `ahanassa`, Odoo `19.0-20260528`.

## API route

`POST /api/v1/rfq` is the sole route. It is GET-free, write-only intake and does not expose a status endpoint. No website repository was modified.

## Authentication architecture

Bearer authentication is mandatory, compared with `hmac.compare_digest`. Runtime secret name is `ahanassa_rfq_api_secret` (Odoo config) or `AHANASSA_RFQ_API_SECRET` (environment). No secret value is committed or logged. Public browser-to-Odoo sessions are not supported; `save_session=False`, and Cloudflare must keep the credential server-side.

## Idempotency and atomicity

`Idempotency-Key` is required, bounded and validated. The RFQ stores a SHA-256 normalized payload fingerprint. Same key/body replay returned 200 and the original reference; same key/different body returned 409. Header and all lines are created through `create_from_api_payload()` in one transaction; errors roll back. Temporary test RFQs were removed.

## Payload allow-list and validation

Only locale, customer snapshot, items, notes, consent and UTM metadata are accepted. Internal fields/IDs, supplier/Offer data, prices, MOQ, state, assignment, CRM and references are rejected. JSON-only, 512 KiB body and 200-line limits apply. Quantities are finite/positive/bounded, text is bounded plain text, customer name plus phone/email is required, and email syntax is checked.

## Product and UoM behavior

Product lines resolve through the Phase 6A.1 canonical Product XID resolver and active Public Catalog eligibility. SKU is non-authoritative. Invalid/inactive/wrong-model/archived XIDs fail closed. Free-text requires explicit description. Controlled UoM codes are accepted without Odoo integer IDs; native kg/Ton and nominal branch/sheet/meter conversion use the existing model service. Original quantity/UoM and nominal snapshots are preserved; Supplier MOQ is never queried.

## HTTP test results

* Correct bearer, valid multi-line catalog + free-text payload: PASS (201).
* Same key and same body: PASS (200, same reference, no duplicate).
* Same key and different body: PASS (409).
* Missing credential: PASS (401, generic response).
* JSON/content/line/quantity/XID validation: PASS.
* No public status or generic ORM route: PASS.

## Regression and safety

Temporary API RFQ (2 lines) and its chatter were deleted after tests. Persistent RFQs: 0; CRM leads: 2; partners: 15; Sale Orders: 0; Purchase Orders: 0; account moves: 0; quants/moves/lots: 0. Product Master remains 13 active templates/237 active variants/237 unique SKUs, 6 attributes/153 values. Public Catalog remains 237 active records; catalog API and serializer privacy remain unchanged. Supplier Offers remain six pilot records and no Supplier data is queried by intake.

## Cloudflare integration contract

Cloudflare/website server must store the bearer secret, hide the Odoo origin, apply WAF/bot/Turnstile/rate limits/body and timeout controls, and retry with the same idempotency key. Odoo is the final schema and privacy gate. Attachments, CRM qualification, partner matching, sourcing, pricing and transactions are later phases.

## Recovery points

Pre-change backup: `/opt/odoo/data/backups/ahanassa/ahanassa-phase6b-pre-20260830T101851Z.tar.gz`, SHA256 `00153b7eb7ae8e27288c1846208de02208f8e39bafcbe55a2d821b4b98f8f0eb`.

Post-change backup: `/opt/odoo/data/backups/ahanassa/ahanassa-phase6b-post-20260830T131856Z.tar.gz`, 21,694,873 bytes, SHA256 `de820d66c4579b74c9816f28a933542933a63055909b336a90c910f5ad9ce925`.

## Remaining gaps

The production runtime currently has no bearer secret configured, so all requests fail closed with 401 until operations inject `ahanassa_rfq_api_secret` (or `AHANASSA_RFQ_API_SECRET`) through the protected runtime secret mechanism. Cloudflare integration, edge controls, attachment workflow, CRM qualification and sourcing automation remain intentionally unimplemented.

## Verdict

NOT READY FOR CLOUDFLARE RFQ INTEGRATION
