# Price Strip V2.1 — Frozen PRICE-P0 Architecture Decisions

**Status:** FROZEN / APPROVED
**Version:** 2.1
**Date:** 2026-09-04

Records the owner-approved architecture decisions resolving the two PRICE-P0 gate questions (`docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md`), against `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`. These decisions are binding for PRICE-P1 onward. This document freezes *decisions*; it does not implement them — no runtime file, test, or migration is created here.

---

## A. Commercial price identity — dual identity

Use **dual identity**.

- **Existing, unchanged:** `product_key` = Product **Template** public identity.
- **New:** `variant_key` = exact Product **Variant** public identity.

Commercial price mapping is anchored to the exact variant (`variant_key`). Template identity (`product_key`) remains useful for public title context, product-page routing, and catalog grouping — it is not replaced, only supplemented.

Do **not** replace exact variant identity with free-text specification. Do **not** rename or drop `product_key` in the existing schema. This is introduced via an additive forward migration in PRICE-P1, not here.

## B. Specification ownership

Product/specification truth comes from the authoritative Public Catalog: `catalog_products` + `product_variants`. Examples: grade, size, thickness, dimensions, section, commercial size.

Provider free-text title remains audit/provenance only. The Price Strip must not maintain a second, independent commercial product master.

## C. Routing

Price Card may use:

```
/products/{template-slug}?variant={variant-xid}
```

when an exact published variant exists. No new variant route is required for V2.1. Commercial price identity and navigation destination are separate concerns.

## D. Freshness states

V2.1 intentionally supersedes the previous binary fresh/stale contract.

**FRESH** — latest expected publication cycle available → card visible normally.

**AGING** — one expected publication cycle missed → card may remain visible; actual source timestamp visible; textual wording such as "آخرین قیمت ثبت‌شده".

**STALE** — two or more expected publication cycles missed → Homepage card hidden.

**UNAVAILABLE** — invalid/unusable/no compatible quote → Homepage card hidden.

The previous behavior — "return a stale quote and render it as an older price" (`docs/pricing/PRICE_PROVIDER_CONTRACT.md` §10 point 4, as implemented in `lib/pricing/quote-selection.ts`/`repository.ts` today) — is **explicitly superseded** for the Homepage under V2.1.

## E. Freshness state is derived, not stored

Do **not** persist `freshness_state` as authoritative state. Derive it at read time from: current time, the authoritative `source_timestamp`, and a persisted publication-cadence policy.

Reason: a quote must transition FRESH → AGING → STALE even if no new provider sync occurs. No separate freshness-reconciliation job is required for this V2.1 design.

## F. Source timestamp authority

`source_timestamp` is the normal freshness authority. `synced_at` is ingestion/audit information and may be used as a fallback only when the provider genuinely supplies no authoritative source timestamp.

A new sync must not make an old source quote appear fresh merely because `synced_at` changed.

## G. Freshness policy ownership

Primary policy belongs to the **price source/provider**, not the React component, and not primarily to Homepage display curation.

Preferred model: provider/source default publication policy + a future benchmark-specific override only when a real business case requires it.

Do **not** add a benchmark override speculatively in PRICE-P1 unless required by real data.

## H. Minimum policy data

Do **not** freeze a universal "24 hours" rule.

For PRICE-P1, design the minimum provider publication-policy model capable of supporting expected publication cycles. At minimum evaluate, and likely persist:

- `provider_id`
- cadence kind
- cadence interval/count where applicable
- expected publication weekdays / publication schedule where applicable
- timezone

**Important correction:** `cadence_type` + a raw elapsed interval alone is **not** sufficient to satisfy the frozen weekend rule for a daily business-day source. The policy must be able to avoid incorrectly treating ordinary non-publication weekend days as missed publication cycles. Do not build a full holiday/market-calendar engine yet — holiday-specific calendars may be deferred until a real provider requires them. This limitation is documented explicitly here, not silently absent from the design.

## I. Business calendar V1 boundary

The initial V2.1 implementation should support ordinary expected publication schedule/weekdays sufficiently to prevent obvious weekend aging errors. Full exchange/public-holiday calendars are deferred. This is a deliberate V2.1 scope boundary, not forgotten functionality.

## J. Provider-agnostic

Freshness code must never branch like `if provider_id == "odoo"`. The UI must consume a generic freshness result. The same model must fit an intraday source, a business-daily source, a weekly source, and a monthly source.

## K. Migration policy

PRICE-P1 requires a **new, additive** DB_PUBLIC migration.

Current latest public migration, verified from disk immediately before writing this document (`ls migrations_public/`): `0007_processing_groups.sql`.

**Next migration number: `0008`.**

Do not modify migration `0004`. Do not drop or rename existing production schema. Likely additive concerns for PRICE-P1: exact variant identity (`variant_key` columns), provider publication cadence policy (a new small table). The exact SQL remains PRICE-P1 work, not decided or written here.

## L. Security / privacy

New identity/policy data must not expose: private supplier identity, internal cost, margin, private capacity, negotiation/payment terms, private notes.

Variant public identity and publication cadence metadata are safe operational metadata, but raw policy internals do not need to be rendered publicly.

---

## Open question resolutions

1. **Existing stale behavior superseded by V2.1?** YES.
2. **Exact price identity?** Dual — Template (`product_key`) + Variant (`variant_key`).
3. **Rename `product_key`?** NO. Preserve for compatibility; documented as the template identity.
4. **New variant route?** NO. Reuse the template route + `?variant=`.
5. **Full holiday engine in PRICE-P1?** NO. Defer, while supporting expected publication weekdays/schedule enough to prevent obvious weekend misclassification.
6. **Persist `freshness_state`?** NO. Derive at read time.

---

## Consistency review against the current repository

Cross-checked against: `migrations_public/0004_public_price_quotes.sql`, `migrations_public/0007_processing_groups.sql`, `lib/pricing/*`, the Product Catalog variant schema (`migrations_public/0002_catalog_v1_contract.sql`), the RFQ `templateXid`/`variantXid` precedent (`lib/rfq/item-row-validation.ts`, `lib/rfq/catalog-preselection.ts`), the `/products/[slug]?variant=` behavior (`app/[locale]/products/[slug]/page.tsx`), and `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`.

**No contradictions found.** Every decision above is directly supported by evidence already gathered in `PRICE_STRIP_V2.1_AUDIT.md`/`PRICE_P0_IDENTITY_FRESHNESS_GATE.md`:

- Decision A (dual identity) matches the RFQ domain's own proven `templateXid`+`variantXid` pattern exactly — no new pattern is being invented, an existing one is being extended to a second domain.
- Decision B (Catalog-owned specification) matches what `product_variants` already stores (`commercial_size`, `grade_code`/`grade_name`, `dimensions_json`, etc.) and what `VariantSpecTable` already renders from it — no duplicate field is proposed.
- Decision C (routing) matches the `?variant={xid}` mechanism already implemented and live in `app/[locale]/products/[slug]/page.tsx` — reused, not invented.
- Decision D (superseding stale-shown behavior) is a **deliberate, acknowledged reversal** of `docs/pricing/PRICE_PROVIDER_CONTRACT.md` §10 point 4's current documented behavior — flagged here explicitly as a reversal, not silently changed, per the P0 gate's own risk note.
- Decisions E/F match what `lib/pricing/repository.ts` already does correctly today for the simpler boolean case (`effectiveTimestamp = sourceTimestamp ?? syncedAt`, computed fresh on every read) — the *mechanism* is unchanged, only the *classification richness* grows.
- Decision K's `0008` numbering is verified directly from the current `migrations_public/` directory listing, not assumed.

No file in the current codebase asserts anything that conflicts with A–L above. The one substantive tension on record — Decision D reversing existing documented/tested behavior — is a deliberate, disclosed supersession, not an unnoticed contradiction.

---

*Building on `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` (the frozen spec) and `docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md` (the gate that produced these decisions). PRICE-P1 (schema migration `0008`) is the next authorized phase — not started here.*
