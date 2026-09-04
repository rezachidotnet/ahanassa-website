<!--
Repository copy of the owner-approved authoritative specification, supplied
to this session at ~/Downloads/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md on
2026-09-04 and stored here verbatim (content below this comment is byte-for-
byte the supplied document — nothing paraphrased, shortened, or reordered).
This comment is repository metadata only and is not part of the document.
-->

# AHAN ASA — HOMEPAGE PRICE STRIP
## Frozen Decisions Report — Version 1.0

**Project:** Ahan Asa / آهن آسا  
**Component:** Homepage Price Strip  
**Status:** FROZEN BASELINE  
**Version:** 2.1  
**Date:** 2026-09-04  

---

# 1. Purpose

This document freezes the approved first-stage architecture and UX role of the Ahan Asa Homepage Price Strip.

Future decisions about:
- exact displayed benchmark products;
- visual card design;
- price-change treatment;
- mobile behavior;
- freshness thresholds;
- detailed acceptance criteria;

must be recorded in later versions.

---

# 2. Homepage-only Component

The Price Strip is not a global site-wide component.

It is shown on the Homepage only.

It must not automatically appear on:

- About;
- Services;
- Industries;
- Contact;
- generic content pages.

Category and Product pages may later use separate contextual pricing components.

---

# 3. Placement

Frozen homepage sequence:

```text
Header
↓
Hero
↓
Price Strip
↓
Product Showcase
↓
...
```

The Price Strip appears after the Hero and before the Product Showcase.

---

# 4. Not Part of the Header

The Price Strip:

- is not attached to the Header;
- is not a second Header row;
- is not sticky;
- does not remain permanently visible while scrolling.

---

# 5. Business Role

The Price Strip is a:

**Market / Price Signal**

It is intended to show that Ahan Asa is connected to current real market/commercial pricing for selected steel products.

It is NOT:

- a final quotation;
- a guaranteed transaction price;
- an instant-price promise;
- a replacement for RFQ;
- a complete market board.

The primary procurement CTA remains separate.

---

# 6. Public Heading Direction

Preferred Persian heading:

**آخرین قیمت‌های منتخب**

The word "منتخب" is intentional because the Homepage must not attempt to expose the entire commercial catalog.

The word "آخرین" is preferred over an unconditional "قیمت امروز" claim because the actual source timestamp determines how current a quote is.

Exact EN/AR wording remains subject to localization review.

---

# 7. Real Data Only

The component must never display fabricated, seeded, placeholder, demonstration, or guessed prices in production.

If no valid real price items are available:

```text
Price Strip → render nothing
```

No "coming soon" cards or fake examples are permitted.

---

# 8. Feature Flag / Safe Activation

The existing architecture direction remains:

```text
PRICE_STRIP_ENABLED
```

Default/safe behavior is disabled until:

- a real provider is configured;
- mappings are configured;
- public display records are curated;
- real synchronization succeeds;
- data is verified.

The Homepage must remain fully functional when the Price Strip is disabled.

---

# 9. Provider-agnostic Architecture

The public component must not depend on one specific price provider.

Conceptually:

```text
Odoo / Approved External Price Provider
          ↓
Provider Adapter
          ↓
Normalization
          ↓
Product Mapping
          ↓
Public Price Read Model
          ↓
Homepage Price Strip
```

Odoo may be one provider, but the UI must not be coupled directly to the Odoo protocol or payload.

---

# 10. No Live Odoo Dependency

The Homepage must never require a synchronous live Odoo call in order to render the Price Strip.

Required:

```text
Provider / Odoo
↓ sync
D1 / Public Price Read Model
↓
Homepage
```

Prohibited:

```text
Homepage visitor
↓
live Odoo/API request
↓
render price
```

---

# 11. Price Context Is Mandatory

A public price is not treated as a context-free number.

The architecture must preserve the exact configured quote basis, including as applicable:

- product identity;
- unit;
- currency;
- market/location;
- delivery basis;
- source timestamp;
- provider provenance.

Quotes with incompatible basis must not be silently averaged or substituted.

---

# 12. Catalog-authoritative Identity

Public title/link should come from the authoritative catalog/product mapping where possible.

Provider-supplied free-text titles must not become the Website product identity.

Commercial product mapping must be explicit.

---

# 13. Public Display Curation

Homepage price items are intentionally curated.

The existing `price_display_products` direction remains the public display-control layer.

The Homepage must not automatically display every price record received from providers.

Selection logic is addressed in Version 1.1.

---

# 14. Freshness / Stale Data

The last known valid price may be retained when synchronization fails, provided:

- its real timestamp is preserved;
- it is not presented as newly updated;
- stale status can be surfaced clearly where required;
- zero or invented replacement prices are never used.

Exact public stale threshold/treatment remains for a later version.

---

# 15. Homepage vs Category vs Product Pricing

Pricing surfaces are separated conceptually:

```text
Homepage
→ Selected Benchmark Price Strip

Category Page
→ Category-specific Price View

Product Page
→ Contextual Product Price
```

The Homepage Price Strip must not be forced into all price-related page contexts.

---

# 16. No Aggressive Market Ticker Behavior

The Price Strip is not intended to behave like a stock-market ticker.

Preferred direction:

- no auto-running marquee;
- no aggressive continuous animation;
- no attention-grabbing flashing price movements.

Detailed responsive/interaction design will be frozen later.

---

# 17. Version 1.0 Status

**AHAN ASA HOMEPAGE PRICE STRIP V1.0 IS FROZEN.**

Next decision:

**Which prices / benchmark products should be selected for Homepage display?**


---

# 18. Newly Frozen Decision in Version 1.1 — Homepage Benchmark Selection

## 18.1 Stable benchmark basket

Homepage Price Strip uses a deliberately curated and relatively stable benchmark basket.

It must not behave like a real-time "top movers" market board.

The displayed benchmark set should not continuously reshuffle based on daily price movement or short-term RFQ fluctuations.

---

## 18.2 Launch basket size

Target Homepage basket:

- **4 Core benchmark items**
- **up to 2 Optional benchmark items**

Maximum intended display count:

**6 items**

The component should remain quick to scan and should not attempt to represent the full steel catalog.

---

## 18.3 Core benchmark families

The frozen launch direction is:

1. **Rebar / میلگرد**
   - preferred benchmark direction: A3
   - initial benchmark size direction: 16

2. **IPE Beam / تیرآهن**
   - initial benchmark size direction: 16

3. **Black Plate / Sheet / ورق سیاه**
   - preferred benchmark thickness direction: 10 mm
   - chosen partly because it connects naturally to Ahan Asa's processing/fabrication positioning

4. **SHS / Box Section / قوطی**
   - exact benchmark variant must be selected from real published catalog demand and real quote availability

The exact commercial Product/Variant identities are not hardcoded by this document.

---

## 18.4 Optional benchmark families

Optional fifth and sixth benchmark slots may be filled by:

- Angle / نبشی
- Channel / ناودانی
- Industrial Pipe / لوله صنعتی

Selection depends on:

- real public catalog presence;
- reliable price-feed availability;
- customer/RFQ demand;
- strategic business relevance.

A slot may remain unused if no suitable real benchmark exists.

---

## 18.5 No forced category representation

The Homepage must not display one item from every product category merely for visual completeness.

If a category has:

- unreliable price data;
- weak demand;
- unclear quote basis;
- insufficient update frequency;

it should not be shown in the Price Strip.

---

## 18.6 Benchmark identity remains data-driven

The benchmark basket is an owner-curated selection, but commercial Product/Variant identity must remain data-driven.

Conceptually:

```text
Owner benchmark selection
        ↓
price_display_products
        ↓
Published Product / Variant
        ↓
Mapped compatible public price quote
```

Frontend source code must not become the commercial source of truth for exact benchmark SKUs.

---

## 18.7 Benchmark eligibility gate

A product/variant is eligible for Homepage benchmark display only if all applicable conditions are satisfied:

1. it is publicly published in the authoritative Product Catalog;
2. a real and trustworthy public price quote exists;
3. unit is explicit;
4. currency is explicit;
5. market/location basis is explicit where applicable;
6. delivery basis is explicit where applicable;
7. source timestamp is available;
8. customer demand/business relevance is meaningful;
9. the displayed specification is understandable to the target customer;
10. update frequency is sufficient for public display.

---

## 18.8 No speculative raw-material benchmarks

Upstream raw materials such as:

- sponge iron;
- billet;
- ferroalloys;
- other upstream commodities;

must not be added to the Homepage Price Strip merely because market data exists.

They may only be considered later if they become part of Ahan Asa's actual target market, public catalog, and commercial positioning.

---

## 18.9 Stable ordering

Homepage benchmark order should remain relatively stable.

The order must not be automatically rearranged every day based on:

- highest gain;
- highest decline;
- most recent RFQ;
- short-lived page traffic changes.

Stable spatial memory is preferred.

---

## 18.10 Periodic review

Benchmark composition may be reviewed periodically using signals such as:

- RFQ count;
- RFQ tonnage;
- RFQ commercial value;
- Product page traffic;
- valid quote availability;
- quote update frequency;
- strategic business focus.

Preferred governance is periodic owner/business review rather than uncontrolled real-time ranking.

Exact review cadence is not frozen.

---

## 18.11 Homepage is not a market-movers board

The Price Strip must not prioritize:

- biggest daily gainers;
- biggest daily losers;
- flashing market alerts;
- speculative trading-style signals.

The component remains a procurement-oriented benchmark surface.

---

# 19. Frozen Launch Direction

Current preferred benchmark direction:

```text
CORE
1. میلگرد A3 — benchmark size direction: 16
2. تیرآهن IPE — benchmark size direction: 16
3. ورق سیاه — benchmark thickness direction: 10mm
4. قوطی / SHS — exact benchmark from real catalog + demand

OPTIONAL
5. نبشی
6. ناودانی یا لوله صنعتی
```

Exact brand/mill/product variant remains subject to real Product Catalog and quote mapping.

---

# 20. Version 1.1 Status

**AHAN ASA HOMEPAGE PRICE STRIP V1.1 IS FROZEN.**

Next decision:

**What exact information must each Homepage Price Card display?**


---

# 21. Newly Frozen Decision in Version 1.2 — Price Card Information Architecture

## 21.1 Required card information

Each Homepage Price Card must communicate the minimum information required to understand the public benchmark quote.

Required display fields:

1. Product public name
2. Benchmark specification / variant descriptor
3. Current public price
4. Price unit
5. Last-update/source timestamp
6. Market/location basis where applicable
7. Delivery basis where applicable

The card must not present a context-free price number.

---

## 21.2 Example presentation direction

Illustrative structure:

```text
میلگرد A3 سایز 16
36,850 تومان / کیلو
بازار تهران · آخرین بروزرسانی 10:42
```

Another possible structure:

```text
ورق سیاه 10mm
41,200 تومان / کیلو
درب کارخانه · 09:55
```

These examples are illustrative only and are not production data.

---

## 21.3 Catalog-authoritative naming

The displayed product name/specification should come from the authoritative public Product Catalog mapping.

Price-provider free-text naming must not override catalog identity.

---

## 21.4 Unit visibility is mandatory

Price unit must always be visible alongside the price.

Examples may include:

- تومان / کیلو
- تومان / تن
- تومان / شاخه
- تومان / ورق
- other explicitly configured public quote unit

The UI must never rely on the user inferring the unit.

---

## 21.5 Timestamp visibility

The actual source/update timestamp must be available to the user.

The Price Strip must not use wording such as:

- امروز
- لحظه‌ای
- آنلاین

unless the underlying freshness semantics genuinely support that claim.

---

## 21.6 Market / location / delivery basis

Market/location and delivery basis must be displayed when they materially affect interpretation of the quote.

The UI may use a compact secondary metadata line, but the basis must not be silently omitted when omission could mislead the customer.

---

## 21.7 No independent CTA inside each Price Card

Individual Price Cards do not contain a visually competing action button by default.

The Homepage global procurement CTA remains:

**ارسال لیست خرید**

A Price Card itself may function as a navigation link to the relevant Product/Price context where a valid destination exists.

---

## 21.8 Price-change indicator is not mandatory

Daily/periodic price movement is not part of the required Version 1.2 card.

The Homepage must not show green/red arrows merely for visual effect.

---

## 21.9 Strict basis for future price-change calculations

If a future version displays price change, comparison is permitted only when the current and previous quotes match the same configured comparison basis.

At minimum, comparison must preserve:

- same Product/Variant identity;
- same unit;
- same currency;
- same market/location basis;
- same delivery basis;
- compatible quote definition.

Quotes with different commercial basis must not be compared as if they represented market movement.

---

## 21.10 No aggressive trading-style visual language

The Price Card must not use:

- flashing green/red movement;
- stock-ticker styling;
- speculative trading cues;
- oversized percentage movement;
- alarm-like visual treatment.

Ahan Asa remains a procurement platform, not a trading terminal.

---

## 21.11 Information hierarchy

Preferred visual hierarchy:

```text
1. Product / specification
2. Price + unit
3. Secondary quote context
   - market/location
   - delivery basis
   - timestamp
```

The price is visually important, but the context remains legible and available.

---

# 22. Frozen Price Card Direction

Each Homepage benchmark item now follows this conceptual model:

```text
Product name + benchmark specification
Price / Unit
Market/Delivery context · Last updated time
```

No separate card CTA.

No mandatory gain/loss indicator.

---

# 23. Version 1.2 Status

**AHAN ASA HOMEPAGE PRICE STRIP V1.2 IS FROZEN.**

Next decisions remain:

- public freshness/stale treatment;
- visual layout and responsive behavior;
- interaction/link behavior;
- final accessibility/performance acceptance criteria.


---

# 24. Newly Frozen Decision in Version 1.3 — Freshness / Stale Policy

## 24.1 Freshness is publication-cycle based

Public price freshness must be evaluated relative to the expected publication/update cycle of the configured price source.

A universal fixed rule such as:

```text
age < 24h = fresh
```

is not accepted as the general architecture.

Freshness must consider, where applicable:

- expected cadence;
- expected publication time;
- business/market calendar;
- source timestamp;
- last successful synchronization;
- missed expected publication cycles.

---

## 24.2 Freshness states

The public price projection uses the following conceptual states:

### FRESH

The latest expected valid publication cycle is available.

Homepage treatment:

- show normal benchmark price;
- show normal timestamp;
- do not add an oversized "fresh" badge.

### AGING

One expected publication cycle has been missed.

Homepage treatment:

- price may remain visible;
- wording should communicate that it is the latest recorded price;
- real timestamp remains visible;
- do not misrepresent it as today's/new/live price.

Preferred Persian wording direction:

**آخرین قیمت ثبت‌شده**

### STALE

Two or more expected publication cycles have been missed, unless a source-specific approved policy says otherwise.

Homepage treatment:

**hide the benchmark card from the Price Strip.**

Do not display a prominently stale commercial number on the Homepage.

### UNAVAILABLE

No valid quote is available or the quote cannot safely be interpreted.

Examples:

- missing quote;
- broken mapping;
- incompatible unit;
- incompatible market basis;
- incompatible delivery basis;
- provider failure without usable prior quote;
- unpublished Product/Variant.

Homepage treatment:

**do not render the card.**

---

## 24.3 Business-calendar awareness

Weekends and market/public holidays must not automatically make a quote stale solely because wall-clock hours have elapsed.

Freshness calculation should use expected market/publication cycles where practical.

---

## 24.4 Source-specific cadence

The same Price Strip architecture must support sources with different cadences, including:

- intraday;
- daily;
- weekly;
- monthly;

without forcing all providers into one timestamp threshold.

---

## 24.5 Projection calculates freshness

Freshness logic belongs in the integration/public projection layer.

Preferred architecture:

```text
Provider Quote
     ↓
Freshness Policy
     ↓
Public Price Projection
     ↓
FRESH / AGING / STALE / UNAVAILABLE
     ↓
Homepage UI
```

The Homepage presentation component should not become the owner of business-calendar/date-math logic.

---

## 24.6 No unsupported freshness claims

Do not publicly use claims such as:

- زنده
- لحظه‌ای
- آنلاین
- قیمت امروز

unless the configured source cadence and current quote state genuinely support that claim.

---

# 25. Product Cards and Price Strip Are Separate Domains

The Homepage Product Showcase and Homepage Price Strip are distinct components with different purposes.

## Product Cards

Purpose:

**Catalog discovery**

Architecture:

```text
Odoo Product Master
↓
Public Product Projection
↓
Homepage Product Cards / Product Showcase
```

Product Cards are data-driven from publicly published catalog data.

The number and composition of Product Cards must not be maintained as an independent commercial hardcoded frontend product master.

---

## Price Strip

Purpose:

**Selected public benchmark / price signal**

Architecture:

```text
Approved Price Source(s)
+
Published Product Mapping
↓
Public Price Projection
↓
4–6 curated Homepage benchmarks
```

The Price Strip is not a mirror of every Product Card and is not required to represent every product category.

---

# 26. Odoo Ownership of Ahan Asa Commercial Prices

When a public price represents Ahan Asa's own commercial sell/offer price:

**Odoo is the commercial Source of Truth.**

Conceptual flow:

```text
Odoo
Product / Variant
+
Commercial Offer / Price
+
Commercial Basis
↓
Public Price Projection
↓
D1 / Website Read Model
↓
Homepage Price Strip
```

The public Website must not maintain an independent authoritative commercial price for Ahan Asa.

---

# 27. External Market Benchmarks

The architecture may also support approved external price providers.

Conceptual flow:

```text
External Provider
↓
Provider Adapter
↓
Normalization
↓
Product Mapping
↓
Public Price Projection
↓
Homepage Price Strip
```

An external benchmark does not need to be converted into an Ahan Asa sales offer merely to be publicly displayed, provided provenance and quote basis remain correctly modeled.

The Website remains provider-agnostic.

---

# 28. Public Benchmark Governance Model

Homepage benchmark selection should not pollute Product Master with UI-specific concerns.

Preferred conceptual domain:

**Public Price Benchmark / Price Publication**

It may reference, as applicable:

- Product / Variant
- public price source
- enabled / disabled
- display priority
- public mapping
- expected cadence
- market basis
- delivery basis
- public eligibility

Exact Odoo model names and implementation are not frozen in this Website component specification.

The key architecture invariant is:

> Product Master remains authoritative for product identity, while Homepage benchmark publication is controlled by a separate public pricing/publication concern.

---

# 29. No Direct Website Price Editing

The Homepage frontend must not become an admin interface for manually typing production commercial prices.

Production public price values must arrive through approved Odoo/external-provider integration and the Public Price Projection.

---

# 30. Graceful reduction of benchmark count

If a configured benchmark becomes STALE or UNAVAILABLE:

- do not substitute fake data;
- do not resurrect invalid old quotes;
- do not use `0`;
- allow the number of visible benchmark cards to reduce.

Minimum visual render count remains a separate visual-layout decision.

---

# 31. Version 1.3 Status

**AHAN ASA HOMEPAGE PRICE STRIP V1.3 IS FROZEN.**

Frozen distinctions now include:

```text
Product Cards
→ Odoo/Public Product Projection
→ Catalog discovery

Price Strip
→ Curated benchmark publication
→ Odoo commercial price and/or approved external provider
→ Public Price Projection
→ Homepage market/price signal
```

Next decision:

**Visual layout and responsive behavior of the Homepage Price Strip.**


---

# 32. Newly Frozen Decision in Version 1.4 — Visual Layout and Responsive Behavior

## 32.1 Visual character

The Homepage Price Strip is a compact professional B2B price band.

It must not visually resemble:

- a stock-market ticker;
- a retail product carousel;
- an e-commerce promotion strip;
- a flashing market board.

Preferred visual character:

**clean, restrained, procurement-oriented, premium industrial B2B**

---

## 32.2 Section surface

Preferred section surface:

- warm neutral / cream background;
- clear separation from Hero and Product Showcase;
- no strong gradient;
- no dark market-board styling.

Cards use:

- white surface;
- subtle border;
- restrained radius;
- negligible or very light shadow;
- navy typography;
- limited copper accent only where meaningful.

---

## 32.3 Section heading

Preferred Persian heading:

**آخرین قیمت‌های منتخب**

The heading remains relatively compact.

Target visual scale:

approximately 18–20px, subject to optical tuning.

It must not compete with Hero or major Homepage section headings.

---

## 32.4 No "View All Prices" until a real destination exists

Do not render a "مشاهده همه قیمت‌ها" / View All Prices link until an authoritative Prices/Market destination has been designed and implemented.

No dead or placeholder destination may be introduced.

---

## 32.5 Desktop card count

Maximum intended benchmark count:

**6**

At wide desktop widths, up to 6 benchmark cards may appear in a single row when content fit remains comfortable.

---

## 32.6 Medium desktop / tablet behavior

At medium widths, cards must reflow before becoming too narrow.

Preferred direction for approximately 5–6 items around medium desktop widths:

**3 × 2**

Tablet may use:

**2–3 columns**

based on actual content fit.

Responsive behavior must be content-driven rather than blindly tied to one framework breakpoint.

---

## 32.7 Mobile behavior

Mobile uses:

**horizontal user-controlled scrolling + CSS scroll snap**

Preferred experience:

- one main card is comfortably readable;
- a portion of the next card may remain visible to communicate horizontal discoverability;
- user swipes manually.

Do NOT use:

- auto-scroll;
- marquee;
- autoplay carousel;
- forced pagination movement;
- flashing transitions.

Pagination dots are not required.

---

## 32.8 Price Card visual hierarchy

Each card follows this hierarchy:

```text
1. Product name + benchmark specification
2. Price + unit
3. Secondary quote context
   - market/location
   - delivery basis
   - timestamp
```

Price is the strongest element inside the card, but must not visually compete with the Homepage Hero.

---

## 32.9 Indicative sizing targets

These are design targets, not rigid implementation constants:

```text
Desktop card min width: ~180–195px
Card height: ~115–130px
Card padding: ~16px
Product/spec text: ~14–15px
Price: ~20–22px semibold
Unit: ~12–13px
Metadata: ~11–12px
Card gap: ~12px
```

Optical tuning after real rendering is permitted provided information hierarchy and compactness remain intact.

---

## 32.10 Timestamp remains per-card

Timestamp must remain associated with the individual benchmark card.

Do not replace per-item freshness context with one global section timestamp unless all displayed quotes are guaranteed to share the same valid timestamp/basis.

---

## 32.11 Card link behavior

A Price Card may be fully clickable only when it has a valid real destination.

Preferred destination:

relevant Product / Product-price context.

If no valid destination exists:

the card remains informational and must not fabricate a link.

No independent "Buy", "Request", or "Add to cart" button is placed inside each card.

---

## 32.12 Hover behavior

Desktop hover treatment must remain restrained.

Permitted examples:

- slightly stronger border;
- subtle surface shift;
- restrained text/accent change.

Avoid:

- large lift;
- scale animation;
- glow;
- heavy shadow;
- copper-filled card takeover.

---

## 32.13 Fresh / Aging visual treatment

### FRESH

Show normal timestamp presentation.

Example direction:

```text
به‌روزرسانی 10:42
```

No oversized freshness badge is required.

### AGING

Use neutral wording such as:

```text
آخرین قیمت ثبت‌شده
12 شهریور، 14:10
```

Do not use red warning styling solely because a quote is Aging.

### STALE / UNAVAILABLE

Do not render the benchmark card on the Homepage.

---

## 32.14 Minimum visible benchmark count

Homepage Price Strip render threshold:

```text
0 valid benchmark → hide strip
1 valid benchmark → hide strip
2+ valid benchmarks → render strip
```

A single isolated price card is not considered sufficient to justify the Homepage Price Strip.

---

## 32.15 No decorative media

Price Cards do not use:

- product thumbnails;
- factory photos;
- decorative icons;
- promotional badges;
- illustrations.

The component remains price-information focused.

---

## 32.16 No gain/loss visual language

The Version 1.4 visual design does not use:

- green gain arrows;
- red loss arrows;
- percentage-movement prominence;
- trading-terminal conventions.

Future price-change visualization would require a separately approved basis-comparison design.

---

# 33. Frozen Responsive Direction

Conceptually:

```text
WIDE DESKTOP
[1][2][3][4][5][6]

MEDIUM
[1][2][3]
[4][5][6]

TABLET
[1][2][3]  or  [1][2]
             [3][4]

MOBILE
[   Card 1   ][partial Card 2 ...]
      ← user swipe →
```

Exact breakpoint values remain implementation-level and must be validated against real localized content.

---

# 34. Version 1.4 Status

**AHAN ASA HOMEPAGE PRICE STRIP V1.4 IS FROZEN.**

Remaining final topics:

- interaction semantics;
- accessibility;
- performance;
- final acceptance criteria.


---

# 35. Newly Frozen Decision in Version 2.0 — Interaction Semantics

## 35.1 No custom carousel behavior

The Homepage Price Strip is not implemented as an autoplay or JS-driven carousel.

Desktop uses ordinary grid/row layout.

Mobile uses native horizontal scrolling.

Do not introduce:

- autoplay;
- marquee;
- auto-advance;
- custom drag engines;
- forced pagination movement.

---

## 35.2 Semantic structure

Preferred semantic structure:

```html
<section aria-labelledby="selected-prices-heading">
  <h2 id="selected-prices-heading">...</h2>
  <ul>
    <li>...</li>
  </ul>
</section>
```

When a benchmark has a valid destination:

```html
<li>
  <a href="...">...</a>
</li>
```

Do not use clickable generic `<div>` elements for navigation.

Do not introduce inappropriate widget semantics such as:

- `role="menu"`
- `role="listbox"`
- carousel-specific ARIA

unless a future approved implementation genuinely requires them.

---

## 35.3 Card link behavior

A benchmark card may be a single real link only when a valid destination exists.

Do not nest interactive controls inside the card link.

If no valid destination exists, the card remains informational.

---

## 35.4 Hover is optional enhancement only

No price, basis, freshness, timestamp, or other required information may be accessible only on hover.

Hover styling is visual enhancement only.

---

# 36. Accessibility

## 36.1 Keyboard access

All linked Price Cards must be keyboard reachable and operable.

Keyboard focus must remain predictable.

Native horizontal scrolling must not prevent keyboard users from reaching cards outside the current visible region.

---

## 36.2 Focus visibility

Linked cards require a clearly visible `:focus-visible` treatment.

Focus indication must not be removed with `outline: none` unless replaced with an equally or more visible accessible indicator.

Meaningful focus indicator contrast target:

**≥ 3:1**

against adjacent colors where applicable.

---

## 36.3 Contrast

WCAG 2.2 AA targets:

```text
Normal text: >= 4.5:1
Large text: >= 3:1
Meaningful UI/graphical states: >= 3:1
```

Special attention must be given to muted metadata such as:

- timestamps;
- market/location;
- delivery basis;
- Aging wording;
- secondary units.

Muted styling must not make required quote context difficult to read.

---

## 36.4 Reflow and zoom

Each Price Card must remain readable at narrow widths.

The component must be tested for content fit at approximately:

**320 CSS px**

and at:

**200% and 400% zoom**

where applicable.

The user must not need two-dimensional scrolling inside a single card to understand its content.

---

## 36.5 Touch targets

The current V2 design intentionally avoids small controls inside cards.

If future controls are introduced:

- WCAG target-size requirements must be respected;
- preferred Ahan Asa design target remains approximately 44px hit area where practical.

---

## 36.6 DOM and visual reading order

The semantic/DOM order of:

- Product/specification
- Price
- Unit
- Market/delivery context
- Timestamp

must remain understandable and consistent with visual presentation.

Do not rely on CSS positioning that creates a misleading screen-reader reading order.

---

## 36.7 RTL / LTR and bidirectional text

Persian and Arabic:

`dir="rtl"`

English:

`dir="ltr"`

Mixed-direction content such as:

- numbers;
- `mm`;
- product grades;
- technical codes;
- currencies;

must use appropriate bidi isolation where required so text order remains correct.

`bdi`, unicode isolation, or equivalent implementation techniques may be used.

---

## 36.8 Aging state is not color-only

Freshness difference must be communicated textually.

FRESH example direction:

```text
به‌روزرسانی 10:42
```

AGING example direction:

```text
آخرین قیمت ثبت‌شده · 12 شهریور، 14:10
```

Do not communicate Aging solely through color.

---

## 36.9 No aria-live in V2

The Homepage Price Strip does not use `aria-live`.

The V2 architecture does not continuously push live price updates into an already-open page.

If real-time streaming is introduced later, its accessibility behavior requires a new explicit decision.

---

# 37. Performance Architecture

## 37.1 Server-rendered price data

Preferred public flow:

```text
Public Price Read Model
↓
Server render
↓
Initial HTML
```

The Price Strip should either:

- exist in initial HTML;
- or be omitted entirely.

---

## 37.2 No client-side price fetch by default

Do not implement:

```text
Page load
↓
Client JavaScript
↓
fetch prices
↓
insert cards
```

as the normal Homepage architecture.

Client-side price fetching is prohibited by default for this component unless a later architecture decision explicitly changes the model.

---

## 37.3 Zero/near-zero custom interaction JavaScript

The preferred V2 implementation requires no custom JS for basic interaction:

- grid = CSS;
- horizontal scrolling = native browser behavior;
- scroll snap = CSS;
- navigation = anchor;
- hover/focus = CSS.

A `use client` boundary requires a clear technical justification.

---

## 37.4 No live Odoo dependency

The Homepage Price Strip must never require live Odoo availability to render.

Provider/Odoo failures must be isolated behind the public read-model/projection layer.

---

## 37.5 Layout shift

Price Strip visibility is decided before/while server rendering.

Rules:

```text
2+ valid visible benchmarks → render section
0–1 valid benchmark → omit section
```

Do not reserve an empty loading shell and later insert/remove cards through client JS.

---

# 38. Failure Isolation

A pricing failure must never take down the Homepage.

PASS:

```text
Price projection/read-model failure
→ Price Strip omitted
→ Homepage remains healthy
```

FAIL:

```text
Price provider failure
→ Homepage 500/error
```

---

# 39. Data Integrity Gate

A benchmark card must not render unless the required public quote data is valid.

Required data includes, as applicable:

- mapped Product/Variant identity;
- valid price;
- currency;
- unit;
- source timestamp;
- supported freshness state;
- market/location basis where material;
- delivery basis where material.

The UI must not guess missing critical commercial context.

---

# 40. Final Acceptance Criteria

The Homepage Price Strip is approved only if all applicable gates pass.

| Gate | Required Result |
|---|---|
| 2+ valid benchmarks | Strip renders |
| 0 valid benchmarks | Strip hidden |
| 1 valid benchmark | Strip hidden |
| real public prices only | PASS |
| fake/demo/placeholder production prices | FORBIDDEN |
| stale quote on Homepage | HIDDEN |
| Aging quote | Explicit textual state |
| unit visible | REQUIRED |
| timestamp visible | REQUIRED |
| market/delivery basis | REQUIRED where material |
| Product identity | Catalog-authoritative |
| benchmark selection | Curated publication layer |
| Ahan Asa commercial price ownership | Odoo |
| external provider support | Allowed via adapters/projection |
| live Odoo fetch during render | FORBIDDEN |
| client-side price fetch by default | FORBIDDEN |
| SSR/read-model architecture | REQUIRED |
| Provider failure breaks Homepage | FORBIDDEN |
| card CTA button | NONE |
| full-card link | Only with real destination |
| nested interaction | FORBIDDEN |
| autoplay | FORBIDDEN |
| marquee | FORBIDDEN |
| aggressive ticker behavior | FORBIDDEN |
| native mobile horizontal scroll | REQUIRED |
| CSS scroll snap | ALLOWED |
| keyboard access | REQUIRED |
| visible focus | REQUIRED |
| normal text contrast >= 4.5:1 | REQUIRED |
| meaningful UI contrast >= 3:1 | REQUIRED |
| Aging communicated without color-only dependency | REQUIRED |
| 320px content fit | REQUIRED |
| 200% zoom validation | REQUIRED |
| 400% zoom validation | REQUIRED |
| FA layout | REQUIRED |
| AR layout | REQUIRED |
| EN layout | REQUIRED |
| page-level horizontal overflow caused by strip | FORBIDDEN |
| `aria-live` | NOT USED |
| product thumbnails/icons | NOT REQUIRED / default absent |
| custom carousel JS | NOT USED in V2 |
| Header dependency | NONE |

---

# 41. Required Validation Matrix

Before implementation is considered final, validate at least:

## Viewports

```text
320
360
390
768
1024
1280
1440
```

## Locales

```text
FA
AR
EN
```

## Accessibility / interaction

```text
Keyboard-only
200% zoom
400% zoom
reduced-motion environment
```

## Data/failure cases

```text
Price source/read-model failure
0 valid prices
1 valid price
2 valid prices
6 valid prices
FRESH quote
AGING quote
STALE quote
UNAVAILABLE quote
invalid/missing critical quote basis
```

---

# 42. Final Frozen Architecture

## Homepage sequence

```text
Header
↓
Hero
↓
Homepage Price Strip
↓
Product Showcase
↓
...
```

## Product cards

```text
Odoo Product Master
↓
Public Product Projection
↓
Homepage Product Cards
```

## Price Strip

```text
Ahan Asa Commercial Price (Odoo)
and/or
Approved External Market Provider
↓
Adapter / Normalization
↓
Product Mapping
↓
Public Price Projection
↓
Freshness Policy
↓
Curated Homepage Benchmark Publication
↓
Homepage Price Strip
```

---

# 43. Final Frozen Launch Direction

## Benchmark basket

Core direction:

```text
1. میلگرد A3 — benchmark size direction: 16
2. تیرآهن IPE — benchmark size direction: 16
3. ورق سیاه — benchmark thickness direction: 10mm
4. قوطی / SHS — exact variant from real catalog + demand
```

Optional direction:

```text
5. نبشی
6. ناودانی یا لوله صنعتی
```

Exact mill/brand/variant remains data-driven and requires real mapping/quote availability.

---

# 44. Governance

Price Strip V2.0 must not be reopened solely for subjective visual preference.

Revisions require a material reason such as:

- business requirement;
- pricing-model change;
- provider architecture change;
- Product/Odoo architecture change;
- accessibility issue;
- localization issue;
- performance issue;
- validated usability problem;
- legal/compliance requirement.

Any revision must be explicitly versioned.

---

# 45. Version 2.0 Status

**AHAN ASA HOMEPAGE PRICE STRIP V2.0 IS FULLY FROZEN AND APPROVED.**

Versions 1.0 through 1.4 remain historical frozen baselines.

Implementation must now be validated against this Version 2.0 document rather than redesigned from scratch.


---

# 46. Version 2.1 — Trust & Conversion Hardening

Version 2.1 does not redesign the Price Strip.

It strengthens operational trust, cross-channel consistency, provenance, and buyer clarity while preserving every core Version 2.0 rule.

---

# 47. Cross-Channel Price Consistency

## 47.1 One benchmark publication source

Where Ahan Asa controls the digital channel, published benchmark pricing should derive from the same approved Public Price Projection / publication state.

Preferred architecture:

```text
Odoo Commercial Price
and/or
Approved External Provider
        ↓
Normalization / Mapping
        ↓
Public Price Projection
        ↓
Approved Benchmark Publication
        ↓
Website
Other owned digital surfaces
Approved generated content
```

Do not manually maintain contradictory "current benchmark prices" in separate systems.

---

## 47.2 Website benchmark is not automatically the final RFQ price

The Homepage Price Strip is a benchmark/reference surface.

A final RFQ/telephone/commercial quote may legitimately differ because of commercial context including, as applicable:

- exact Product/Variant;
- quantity;
- availability;
- payment terms;
- delivery destination;
- logistics;
- processing/services;
- taxes/charges where applicable;
- quote validity window;
- other explicit commercial conditions.

Therefore this rule is NOT frozen:

```text
Homepage benchmark == every final RFQ price
```

Instead, the frozen trust rule is:

> If a salesperson or RFQ process refers to the public Homepage benchmark, it must use the same underlying benchmark identity/basis or clearly explain the commercial reason for any difference.

Silent unexplained contradiction between public benchmark data and sales-channel communication is unacceptable.

---

# 48. Explicit Buyer Guidance

## 48.1 A lightweight trust note is required

The Homepage Price Strip should include a concise plain-language guidance sentence close to the section heading.

Preferred Persian direction:

**«این قیمت‌ها راهنمای بازار هستند؛ قیمت نهایی به مشخصات، مقدار و شرایط تحویل بستگی دارد.»**

Purpose:

- clarify that benchmark price is not a final invoice/quotation;
- reduce misinterpretation;
- increase trust through explicit limitation disclosure.

This is explanatory copy, not a legal disclaimer.

---

## 48.2 Do not hide critical guidance behind hover-only UI

A small information icon may be used only as a supplemental affordance.

The core meaning must not depend solely on:

- hover tooltip;
- icon-only interaction;
- mouse interaction.

Preferred V2.1 direction:

**short visible helper text**

If a disclosure is used on very constrained layouts, it must be keyboard/touch accessible and have an accessible name/state.

---

# 49. Provenance and Quote Traceability

## 49.1 Internal provenance is mandatory

Every public benchmark card must be traceable internally to its authoritative source record.

The public projection should preserve enough provenance to identify, as applicable:

- provider/source;
- source quote/record identity;
- Product/Variant mapping;
- source timestamp;
- normalization result;
- market/location basis;
- delivery basis;
- publication configuration/version.

This traceability is operational/audit data and need not all be rendered publicly.

---

## 49.2 Public provenance must emphasize useful context

The public UI must continue to expose:

- Product/specification;
- price;
- unit;
- timestamp;
- market/location basis where material;
- delivery basis where material.

A public provider/source name is NOT universally required.

Display the provider/source name only when:

- publication rights allow it;
- it helps the buyer interpret the quote;
- business governance approves it.

Do not expose private supplier identity merely as "provenance."

---

## 49.3 Trust copy direction

A supporting trust message may communicate:

**«زمان و مبنای هر قیمت مشخص است.»**

This may be integrated with the helper text or surrounding section copy.

Avoid duplicating metadata already visible on every card.

---

# 50. No Emotional Market-Gaming

The Version 2.0 prohibition remains fully frozen.

Do not introduce:

- gain/loss theatrics;
- flashing price changes;
- urgency animation;
- fake discounts;
- "hot price" badges;
- speculative market signals.

Trust is built through data quality and consistency, not visual excitement.

---

# 51. Social Proof Is Not Part of the Price Strip

Verified social proof may be useful elsewhere on the Homepage, but it is a separate trust component/domain.

Do NOT place inside individual Price Cards:

- tonnage claims;
- customer counts;
- generic testimonials;
- trust badges;
- "100% guaranteed" claims.

Do NOT make Price Strip validity depend on social-proof data.

If Ahan Asa later displays statements such as:

```text
X tons supplied last month
```

they require:

- real authoritative data;
- a defined measurement period;
- a reproducible calculation;
- appropriate business approval.

Preferred location is a dedicated Trust/Proof component, not the Price Strip itself.

---

# 52. Omnichannel Publication Governance

## 52.1 Owned digital channels

If Ahan Asa later publishes the same benchmark prices in:

- customer portal;
- mobile application;
- other owned websites;
- automated social content;
- generated digital catalogs;

they should consume the same approved benchmark publication source where technically practical.

---

## 52.2 Snapshot channels

Static channels such as:

- print;
- PDF;
- exported catalog;
- social-media image;

cannot remain automatically current after publication.

Any benchmark snapshot must preserve clear context such as:

- publication/generated time;
- quote timestamp where appropriate;
- price basis;
- validity/context wording.

A static snapshot must not later be presented as if it were a live/current benchmark.

---

# 53. Card-to-Next-Step Friction

The existing Version 2.0 rule remains frozen:

- no competing CTA button inside each Price Card;
- full-card navigation is allowed only with a real destination.

When a valid Product/Category context exists, the full-card link is preferred because it provides a low-friction next step without competing with the Homepage primary procurement CTA.

No fake destination may be created merely to make cards clickable.

---

# 54. Plain-Language Trust Standard

Price-strip explanatory copy must use simple commercial language.

Prefer:

- "آخرین قیمت ثبت‌شده"
- "راهنمای بازار"
- "شرایط تحویل"
- "به‌روزرسانی"

Avoid unnecessary legalistic language such as:

- broad disclaimer text;
- liability-style boilerplate;
- intimidating legal phrasing.

Legal/compliance notices, if actually required, belong to the appropriate legal/content architecture and should not overload the Price Strip.

---

# 55. Public Benchmark Review Transparency

## 55.1 Internal governance remains authoritative

The benchmark basket remains periodically curated based on real business and data signals.

---

## 55.2 Public methodology may be added later

A future public pricing/methodology destination may explain that:

- benchmark items are selected intentionally;
- the basket is periodically reviewed;
- price basis/timestamps are preserved;
- public benchmarks are not final RFQ quotations.

However:

- do not create a dead "pricing methodology" link;
- do not add a Footer claim before the process is operationally true;
- do not invent an exact review cadence if none is governed.

When a real Prices/Methodology page exists, the Price Strip may link to it through a low-weight informational link outside individual cards.

---

# 56. No Decorative Trust Badges

The Price Strip must not use generic trust decoration such as:

- "100% guaranteed";
- generic shield icons;
- fake certification-style badges;
- unverifiable "best price" labels;
- generic security logos unrelated to the price data.

Trust signals must come from:

- real data;
- timestamp;
- price basis;
- provenance;
- consistency;
- understandable wording;
- verified business identity.

---

# 57. Operational Consistency Gate

Before a public benchmark is considered operationally trustworthy, the organization should be able to answer:

```text
Which Product/Variant is this?
Which price source produced it?
When was it recorded?
What unit/currency is used?
What market/delivery basis applies?
Why is it Fresh/Aging?
Where else is this benchmark published?
If a final RFQ differs, what commercial basis explains the difference?
```

If these questions cannot be answered from authoritative systems/processes, the benchmark should not be presented as a trusted public reference.

---

# 58. Version 2.1 Additional Acceptance Criteria

The following gates are added to the Version 2.0 acceptance criteria.

| Gate | Required Result |
|---|---|
| Public benchmark treated as final quotation | FORBIDDEN |
| Plain-language benchmark limitation note | REQUIRED |
| Critical explanation available only via hover | FORBIDDEN |
| Internally traceable source/provenance | REQUIRED |
| Public provider name | OPTIONAL / governance-dependent |
| Silent unexplained website-vs-sales benchmark contradiction | FORBIDDEN |
| Owned digital benchmark duplication from independent manual sources | AVOID / migrate to shared publication |
| Static exported benchmark without timestamp/context | FORBIDDEN |
| Social-proof metric inside Price Card | FORBIDDEN |
| Unverified tonnage/customer claim | FORBIDDEN |
| Generic trust badge / "100% guarantee" | FORBIDDEN |
| Full-card link with real destination | ALLOWED / preferred |
| Fake link destination | FORBIDDEN |
| Plain-language explanatory copy | REQUIRED |
| Dead methodology/prices link | FORBIDDEN |

---

# 59. Scope Clarification — What Version 2.1 Did Not Add

The following suggestions were intentionally NOT added as Price Strip features:

## Social-proof line directly inside the Price Strip

Reason:

Social proof is valuable only when verified, but it belongs to a dedicated Trust/Proof component rather than the pricing component.

## Requirement that public benchmark price always equal final RFQ price

Reason:

Final commercial quotation legitimately depends on product, quantity, logistics, payment, processing, availability, and other explicit conditions.

The correct trust requirement is consistent underlying benchmark data plus transparent explanation of commercial differences.

## Mandatory provider-name exposure

Reason:

Source provenance must exist internally, but public provider identity may be commercially private or license-restricted.

## Immediate public "pricing methodology" link

Reason:

No dead/placeholder destination should be created. Add it only when an authoritative methodology page exists.

---

# 60. Final Frozen Architecture — Version 2.1

```text
Odoo Commercial Price
and/or
Approved External Provider
        ↓
Normalization + Product Mapping
        ↓
Internal Provenance / Auditability
        ↓
Public Price Projection
        ↓
Freshness Policy
        ↓
Owner-curated Benchmark Publication
        ↓
┌────────────────────────────────────────┐
│ Homepage Price Strip                   │
│                                        │
│ آخرین قیمت‌های منتخب                  │
│ Plain-language benchmark guidance      │
│                                        │
│ Product + Spec                         │
│ Price / Unit                           │
│ Market / Delivery basis                │
│ Timestamp / Freshness wording          │
└────────────────────────────────────────┘
        ↓
Valid Product/Category context
or
Primary "ارسال لیست خرید" procurement path
```

The Price Strip remains:

- Homepage-only;
- non-sticky;
- non-ticker;
- real-data-only;
- provider-agnostic;
- SSR/read-model based;
- accessible;
- procurement-oriented;
- transparent about quote limitations.

---

# 61. Version 2.1 Status

**AHAN ASA HOMEPAGE PRICE STRIP V2.1 — TRUST & CONVERSION HARDENING — FULLY FROZEN AND APPROVED.**

Version 2.1 supersedes Version 2.0 where the two differ.

Version 2.0 remains the historical final baseline before trust/conversion hardening.

No further subjective visual redesign is authorized without a material business, data, accessibility, localization, performance, legal, or validated usability reason.
