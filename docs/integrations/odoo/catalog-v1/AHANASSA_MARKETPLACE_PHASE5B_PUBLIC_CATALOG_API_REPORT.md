# Ahan Asa Marketplace — Phase 5B Public Catalog API Report

## Module version

`19.0.5.0.0 → 19.0.6.0.0` in database `ahanassa`, Odoo `19.0-20260528`.

## Recovery point

Pre-upgrade database+filestore backup: `/opt/odoo/data/backups/ahanassa/ahanassa-phase5b-pre-20260830T101851Z.tar.gz`, 21,687,850 bytes, SHA256 `00153b7eb7ae8e27288c1846208de02208f8e39bafcbe55a2d821b4b98f8f0eb`.

Post-validation database+filestore backup: `/opt/odoo/data/backups/ahanassa/ahanassa-phase5b-post-20260830T102226Z.tar.gz`, 21,689,960 bytes, SHA256 `e975e450323166bf93955102aba8ad0c5da585c1af83ab96dd6cd0372736d9a4`.

## Routes

`GET /api/v1/catalog/products`, `GET /api/v1/catalog/products/<product_variant_xid>`, and `GET /api/v1/catalog/meta`. No endpoint writes data or exposes generic ORM access. Full contract is in `PUBLIC_CATALOG_API_V1.md` and `public_catalog_api_v1.openapi.yaml`.

## Serializer and source restriction

The controller uses only `ahanassa.public.catalog.variant` and `serialize_public()`. The model contains only denormalized allow-list scalar fields; its only ORM relations are audit users. Forbidden supplier/offer/site/price/payment/MOQ/availability/margin/address fields and relations are absent. HTTP payload inspection found no database integer IDs or private fields.

## Security

Public/Portal users can read only active safe projection records; public routes use `save_session=False`. Marketplace private Offer models are not queried. Structural forbidden-field test and actual JSON privacy regression: PASS. POST/PUT/PATCH/DELETE: 405. Unknown/inactive detail: 404. No CORS wildcard or Odoo session-cookie integration is configured.

## Coverage and pagination

237 active source variants map to 237 active public records; 0 duplicates or missing identities. Page sizes are bounded to 100, default 50, deterministic `classification_family_code,sku` order. First/middle/last/out-of-range and invalid page-size tests passed. Meta contains active-only stable codes/names for family/group/form/grade/standard.

## Localization

`fa`, `en`, and `ar` map to `fa_IR`, `en_US`, and `ar_001`; default is Persian. Requested→Persian→English→Arabic→neutral fallback passed, including unsupported-locale 400 handling. Identity values remain untranslated.

## Filtering and incremental sync

Implemented safe filters: family/group/form, grade, standard, section size, commercial size, SKU/search, diameter/width/height/thickness ranges, and `updated_since` on `catalog_updated_at`. Invalid numeric/timestamp filters return 400. Supplier Offer timestamps are not consulted.

## Caching and performance

Responses return JSON UTF-8, ETag, Last-Modified, and `public, max-age=60, s-maxage=300`. Conditional ETag request returned 304. A two-record list response was approximately 2 KB and a 50-record response approximately 51 KB; current 237-record pagination is bounded. The projection is denormalized, so serialization performs no Product/Supplier joins and has no obvious N+1 path.

## Regression and safety

Projection completeness, serializer allow-list, locale fallback, filters, pagination, 404/405 behavior, archive visibility, and ETag tests: PASS. Product Master unchanged: 16 templates/240 variants total (13/237 active), 6 attributes/153 values. Supplier Offers remain 6 pilot records; Public Offer projection remains 1 draft. Inventory/transactions remain 0 quants, moves, lots, POs, SOs, and account moves. Costing/valuation unchanged (Standard / periodic-manual). No real supplier, site, mill, price, availability, or commercial data created.

## Remaining website-integration gaps

Cloudflare website read-model synchronization, edge caching/rate limiting, localized editorial content, SEO slugs, commercial Public Offer composition, pricing, and RFQ submission are later phases. Allowed public RFQ units remain a Phase 5C integration concern; this API exposes the projection's `allowed_commercial_units` string without private procurement configuration.

## Verdict

READY FOR CLOUDFLARE WEBSITE CATALOG INTEGRATION
