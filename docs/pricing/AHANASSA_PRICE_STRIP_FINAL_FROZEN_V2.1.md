# Ahan Asa — Homepage Price Strip — Frozen Specification V2.1

**Status:** FROZEN / APPROVED
**Version:** 2.1
**Date:** 2026-09-04

**Provenance note (read this before treating this file as a primary source):** no standalone "V2.1 spec document" was ever supplied to this repository or this session as a separate artifact — no file, no pasted document, nothing outside the task prompts themselves. Every requirement below is transcribed, without paraphrase, from the inline requirements embedded in two task prompts issued against this repository on 2026-09-04: the "AHAN ASA — HOMEPAGE PRICE STRIP V2.1 — IMPLEMENTATION ARCHITECTURE AUDIT" task and the "PRICE-P0 — VARIANT IDENTITY + FRESHNESS POLICY ARCHITECTURE GATE" task. This file exists to give those requirements one durable, versioned location instead of leaving them scattered across task-prompt history — it is a **compilation**, not a verbatim copy of a separately-issued owner document. If a real owner-authored spec document exists outside this repository, this file should be reconciled against it and this note updated accordingly.

---

## 1. Product truths this spec assumes (from CLAUDE.md / PROJECT_OVERRIDES.md, unchanged by this document)

Ahan Asa is a premium B2B steel procurement/purchasing-manager service, not a commodity marketplace or cart-first store. Public pricing is owner-confirmed in scope (`PROJECT_OVERRIDES.md` §4) but must be qualified, timestamped, sourced from the synchronized Cloudflare data layer — never a live Odoo call — and presented as part of the procurement-manager experience, never as a commodity-trading ticker.

## 2. Placement

Frozen homepage section sequence:

```
Header
  ↓
Hero
  ↓
Price Strip
  ↓
Product Showcase
```

Price Strip is Homepage-only: not part of the Header, not sticky, not global, not automatically used on About/Services/Industries/Contact.

## 3. Feature flag

`PRICE_STRIP_ENABLED` gates the entire feature. Disabled Price Strip must not affect Homepage health — no partial render, no error, no provider/network work of any kind when off.

## 4. Real-data-only

0 valid real prices → render nothing. No fake fallback, no placeholder cards, no seeded/demo prices anywhere in the runtime path.

## 5. Benchmark curation

Homepage must not display every received quote automatically — a dedicated curation/publication concern selects which products appear. Target launch direction (benchmark *directions*, not authorization to hardcode SKUs):

**CORE**
1. Rebar A3 — size direction 16
2. IPE Beam — size direction 16
3. Black Plate — thickness direction 10mm
4. SHS — exact real catalog/demand-based variant

**OPTIONAL**
5. Angle
6. Channel or Industrial Pipe

## 6. Product identity — benchmark precision requirement

The benchmark directions above (§5) are explicitly size-specific, not generic family/template concepts. The identity model must be able to uniquely distinguish, without relying on free-text title/spec parsing:

- Rebar A3 size 14 vs size 16 vs size 18
- IPE 14 vs IPE 16
- Plate 8mm vs Plate 10mm
- SHS 40×40×2 vs SHS 40×40×3

A price may legitimately link to a template-level product page while still being commercially anchored to an exact variant — **PUBLIC NAVIGATION DESTINATION** and **COMMERCIAL PRICE IDENTITY** are separate concerns and must not be conflated.

Provider free-text name must not become authoritative Website product identity.

## 7. Specification ownership

Frozen card requires **Product + Specification**. Provider free-text must not become commercial product identity. Specification (grade, size/thickness/dimensions, section, commercial size) must come from the authoritative Public Catalog projection, not be invented as a second duplicate spec field if the Catalog already owns it.

## 8. Routing vs identity

If pricing is variant-specific but the website route is template-level, that is acceptable as long as the card clearly shows the exact variant/spec. A new route must not be created unless genuinely needed.

## 9. Price context / commercial basis

A public price is not valid as a context-free number. The schema/data path must preserve, as applicable: product/variant identity, price, currency, unit, market/location, delivery basis, source timestamp, provider/source identity/provenance, quote/source record identity. Incompatible quote bases must never be averaged, merged, substituted, or compared without explicit compatibility checks.

## 10. Card information contract

Frozen card hierarchy:

1. Product + specification
2. Price + unit
3. Secondary context: market/location, delivery basis, timestamp/freshness wording

Required: product public name, specification, price, unit, timestamp, market/location when material, delivery basis when material.

Forbidden by default: independent CTA button in each card, fake product destination, decorative image, promotional badge, gain/loss theatrics.

## 11. Trust guidance

V2.1 requires visible plain-language guidance near the Price Strip heading. Preferred Persian direction:

> «این قیمت‌ها راهنمای بازار هستند؛ قیمت نهایی به مشخصات، مقدار و شرایط تحویل بستگی دارد.»

Requirements: visible without hover, plain commercial language, not hidden behind an icon-only tooltip, not a heavy legal disclaimer.

## 12. Freshness architecture

Frozen conceptual states — **this section explicitly supersedes any prior binary fresh/stale contract** (including the previously-documented "return a stale quote and render it labeled as an older price" behavior, which is retired for the Homepage under V2.1):

**FRESH** — latest expected publication cycle is available → normal display, card visible.

**AGING** — one expected publication cycle missed → may still display; explicit textual wording such as "آخرین قیمت ثبت‌شده"; actual timestamp visible.

**STALE** — two or more expected publication cycles missed → Homepage card hidden.

**UNAVAILABLE** — invalid/unusable/no quote → Homepage card hidden.

Freshness is **publication-cycle based, not universal elapsed-hours based** — a flat "age < 24h" rule is explicitly rejected as insufficient. Freshness logic belongs in the integration/public-projection/read-model layer, never as ad-hoc date math inside the visual React card.

### 12.1 Freshness state is derived, not stored

`freshness_state` must not be persisted as authoritative state. It must be derived at read time from: current time, the authoritative `source_timestamp`, and a persisted publication-cadence policy. Reason: a quote must be able to transition FRESH → AGING → STALE even when no new provider sync occurs — no separate freshness-reconciliation job is required under this design.

### 12.2 Source timestamp authority

`source_timestamp` is the normal freshness authority. `synced_at` is ingestion/audit information only, usable as a fallback exclusively when the provider genuinely supplies no authoritative source timestamp. A new sync must never make an old source quote appear fresh merely because `synced_at` changed.

### 12.3 Freshness policy ownership

Primary policy belongs to the **price source/provider**, not the React component and not primarily to Homepage display curation. Preferred model: a provider/source default publication policy, plus a future benchmark-specific override only when a real business case requires one — not added speculatively.

### 12.4 Minimum policy data

No universal "24 hours" rule may be frozen. The minimum provider publication-policy model must support expected publication cycles. At minimum evaluate, and likely persist: `provider_id`, cadence kind, cadence interval/count where applicable, expected publication weekdays/publication schedule where applicable, timezone.

**Important correction:** `cadence_type` + a raw elapsed interval alone is **not** sufficient to satisfy the weekend rule for a daily business-day source. The policy must be able to avoid incorrectly treating ordinary non-publication weekend days as missed publication cycles. A full holiday/market-calendar engine is not required yet — that limitation must be documented explicitly, not silently absent.

### 12.5 Business calendar V1 boundary

The initial V2.1 implementation should support ordinary expected publication schedule/weekdays sufficiently to prevent obvious weekend aging errors. Full exchange/public-holiday calendars are deferred — a deliberate V2.1 scope boundary, not forgotten functionality.

### 12.6 Provider-agnostic freshness

Freshness code must never branch on a specific provider identity (e.g. `if provider_id == "odoo"`). The UI must consume a generic freshness result. The same model must fit an intraday source, a business-daily source, a weekly source, and a monthly source without UI changes.

## 13. Last-known-good / failure isolation

Provider/Odoo failure must never wipe valid previous data, create zero prices, fabricate replacements, or cause a Homepage 500. Valid previous data may remain, with its real timestamp preserved, and the Homepage must remain healthy.

## 14. Minimum display count

0 valid benchmarks → hide strip. 1 valid benchmark → hide strip. 2+ valid benchmarks → render strip. Maximum intended: 6. No visual placeholder for the 0/1 case.

## 15. SSR / network isolation

```
Public Price Read Model → Server render → Initial HTML
```

Forbidden default: client JS fetch inserting prices after page load. No live Odoo render path, no client price fetch.

## 16. Provider-agnostic architecture

The UI must not depend on Odoo's payload/protocol shape.

## 17. Odoo commercial price ownership

Where a displayed price is Ahan Asa's own commercial sell/offer price, Odoo must remain the source of truth. No direct Website-owned manual commercial price authoring is permitted.

## 18. Provenance / traceability

Every public benchmark must be internally traceable: which Product/Variant, which provider/source, which source quote/record, when recorded, which normalization result, which market basis, which delivery basis, which publication configuration. Not all of this must be publicly rendered.

## 19. Website vs RFQ consistency

Homepage benchmark is not automatically the final RFQ price. If Sales/RFQ references the same benchmark, the underlying benchmark identity/basis must be consistent, or the commercial difference must be explainable. The technical model must not create a second, independent, dangerous commercial price source.

## 20. Visual layout direction

Warm neutral/cream section, white cards, subtle border, restrained radius/shadow, navy typography, limited copper accent — no market-board aesthetic. Desktop: up to 6 cards. Medium: reflow before cards become too narrow (5–6 often 3×2). Tablet: 2–3 columns based on fit. Mobile: native horizontal scroll, CSS scroll snap, manual swipe. Forbidden: autoplay, JS carousel, marquee, ticker, auto-advance, flashing movement.

## 21. Semantics / accessibility

Frozen preferred semantics:

```html
<section aria-labelledby="...">
  <h2 ...>
  <ul>
    <li>
      optional real <a>
    </li>
  </ul>
</section>
```

No clickable generic div, no nested interactive controls, focus-visible required, keyboard-operable, no hover-only required content, no `aria-live`, no inappropriate menu/listbox/carousel ARIA, RTL/LTR and bidi correctness for units/grades/numbers.

## 22. Routing / card links

A card may be clickable only when a real destination exists. No "View All Prices" link until a real authoritative destination exists.

## 23. Social proof / trust badges

Customer counts, tonnage claims, testimonials, generic guarantees, trust badges, "best price" claims, and fake urgency do not belong inside Price Cards.

## 24. Regression boundaries

Any implementation must not regress: Frozen Header v2, Processing P5/P6/P7, Product Header data, Contact/RFQ, Product Catalog, RFQ, other Homepage sections, or locale handling.

---

*End of compiled specification. See `docs/pricing/PRICE_STRIP_V2.1_AUDIT.md` for the implementation-vs-spec gap analysis and `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md` for the approved PRICE-P0 architecture decisions building on this spec.*
