# AHAN ASA — HOMEPAGE PRODUCT SHOWCASE
## Frozen Decisions Report — Version 1.0

**Project:** Ahan Asa / آهن آسا  
**Component:** Homepage Product Showcase  
**Status:** FROZEN BASELINE  
**Version:** 2.0  
**Date:** 2026-09-04  

---

# 1. Purpose

This document freezes the first-stage architecture and scope of the Ahan Asa Homepage Product Showcase.

The Homepage Product Showcase is a catalog-discovery surface.

It is not:

- the full catalog;
- a SKU browser;
- a price board;
- a checkout surface;
- an RFQ form;
- a variant-selection interface.

---

# 2. Source of Truth

Product identity and commercial catalog structure remain owned by:

**Odoo Product Master**

Public Website flow:

```text
Odoo Product Master
↓
Public Product Projection
↓
Homepage Product Showcase
```

The Website must not maintain an independent hardcoded commercial product master.

---

# 3. Homepage Display Level

The Homepage displays:

**Product Family / Public Category**

It does NOT display individual:

- SKU;
- variant;
- grade;
- size;
- mill;
- technical combination;
- commercial offer.

Those belong to deeper Catalog/Product contexts.

---

# 4. No Frontend Hardcoded Commercial Product List

Commercial Homepage product cards must not be sourced from a standalone frontend array such as:

```text
["میلگرد", "تیرآهن", "ورق", ...]
```

as the authoritative catalog.

Frontend presentation configuration may consume public projection data, but commercial product-family identity remains data-driven.

---

# 5. Homepage Publication Control

Not every product/family present in Odoo must automatically appear on the Homepage.

The architecture requires a separate public/Homepage eligibility concern.

Conceptually:

```text
Product Family
↓
Publicly published?
↓
Homepage eligible?
↓
Homepage display priority
↓
Homepage Product Showcase
```

Exact Odoo field/model names are not frozen in this Website specification.

Possible concepts include:

- public publication state;
- homepage eligibility;
- homepage display priority.

The key invariant is that Homepage merchandising is controlled, not accidental.

---

# 6. Catalog Completeness Is Not Homepage Completeness

The Homepage is not required to display every published catalog family.

If the public catalog grows significantly, the Homepage remains intentionally curated.

Therefore:

**Catalog completeness ≠ Homepage merchandising**

---

# 7. Maximum Homepage Product Cards

Target maximum:

**8 Product Family cards**

If more than 8 eligible families exist:

- use configured Homepage display priority;
- show the highest-priority eligible families;
- provide a real "view all products" path to `/products`.

Do not allow Homepage product-card count to grow without limit.

---

# 8. Minimum Count

Unlike the Price Strip, the Product Showcase has no minimum-card threshold.

If at least one valid publicly eligible Product Family exists, the section may render.

No fake cards are added to visually fill the grid.

---

# 9. Launch Direction

Current preferred launch direction includes the main steel families:

- میلگرد
- تیرآهن
- نبشی
- ناودانی
- قوطی
- ورق
- لوله

These names are the intended business direction only.

They must not become a hardcoded frontend source of truth.

Only real Product Families that exist in the Public Product Projection and are eligible for Homepage publication may render.

---

# 10. Product Showcase Role

Each Homepage Product Card exists for:

**Catalog discovery**

The expected user action is to enter the relevant Product Family/Category context.

The card does not attempt to complete the commercial transaction.

---

# 11. No Price Inside Product Cards

Homepage Product Cards do not display benchmark/current price.

Pricing remains a separate domain:

```text
Homepage Price Strip
→ selected price benchmarks

Homepage Product Showcase
→ catalog discovery
```

The same family may appear in both areas for different purposes, but the two components remain logically and visually separate.

---

# 12. No Transaction Controls

Homepage Product Cards do not include:

- Add to Cart;
- Buy Now;
- quantity selector;
- unit selector;
- RFQ line editor;
- instant checkout controls.

Primary procurement action remains handled through the broader RFQ/request architecture.

---

# 13. No Deep Technical Detail on Homepage

Do not overload Product Cards with:

- grade trees;
- size matrices;
- dimensional combinations;
- standards;
- mill selection;
- individual product codes.

These belong to Product/Category pages.

---

# 14. Real Destination Required

Each Product Card should link to a real valid Product Family/Category destination.

Do not create fake or placeholder routes merely to make cards clickable.

If a Family cannot map to a valid public destination, it should not be presented as a normal clickable Homepage Product Card until routing is resolved.

---

# 15. Independence from Price Strip

Homepage Product Showcase and Homepage Price Strip are independently governed.

Example:

```text
Price Strip:
4–6 selected benchmark prices

Product Showcase:
up to 8 Product Families
```

A product family does not need a Homepage benchmark price in order to appear in Product Showcase.

Likewise, benchmark publication rules must not control catalog visibility.

---

# 16. Version 1.0 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.0 IS FROZEN.**

Next decision:

**What exact information and visual treatment should each Homepage Product Card contain?**


---

# 17. Newly Frozen Decision in Version 1.1 — Product Card Content and Visual Treatment

## 17.1 Card purpose

Each Homepage Product Card exists to make the Product Family quickly recognizable and easy to enter.

The card is a discovery surface, not a transactional or detailed technical surface.

---

## 17.2 Required card elements

Preferred card structure:

1. standardized representative Product Family image;
2. Product Family title;
3. optional one-line public descriptor / subcategory hint;
4. restrained directional affordance;
5. full-card link to a real Product Family/Category destination.

---

## 17.3 Image is required by default

Homepage Product Cards should use a representative visual.

Preferred image direction:

**standardized photorealistic / studio-style industrial product visual**

The image should depict the actual product form clearly.

Examples of intended subject direction:

- Rebar → recognizable ribbed bars;
- IPE beam → recognizable I-section members;
- Angle → recognizable L-sections;
- Channel → recognizable U/C-sections;
- SHS/RHS → square/rectangular hollow sections;
- Plate/Sheet → stacked steel plate/sheet;
- Pipe → recognizable steel pipes.

---

## 17.4 Standardized visual language

All Product Family visuals should use a consistent image system where practical:

- similar neutral/light background;
- similar lighting;
- similar camera angle;
- similar crop;
- similar material realism;
- no embedded text.

The Homepage must not become a collection of unrelated warehouse/factory photographs with inconsistent lighting and quality.

---

## 17.5 Product identity and media ownership are separate

Product Family identity remains data-driven from:

```text
Odoo Product Master
↓
Public Product Projection
```

Presentation media may be owned by the Website/CMS/public presentation layer and linked through a stable Product Family identity/code.

Conceptually:

```text
Odoo Product Family identity
        +
Approved public presentation media
        ↓
Homepage Product Card
```

Website media does not become the commercial Product Master.

---

## 17.6 No factory/lifestyle imagery as default card visual

Default Homepage Product Cards should not use:

- factory landscape photographs;
- warehouse scenes;
- trucks/logistics images;
- workers;
- generic construction photography;
- lifestyle imagery.

The product itself is the primary visual subject.

---

## 17.7 Product title

Card title is the public Product Family name.

Examples:

- میلگرد
- تیرآهن
- ورق

The frontend must not independently redefine commercial family identity.

---

## 17.8 Optional subtitle

A card may show one short descriptor/subcategory hint.

Target:

**maximum one concise line**

Examples of content direction:

```text
میلگرد
آجدار و ساده
```

```text
قوطی
مربع و مستطیل
```

The subtitle must be data/editorial-driven and truthful.

If no appropriate subtitle exists:

**render title only.**

Do not invent filler copy.

---

## 17.9 Child-category hints

If used, child-category hints should represent no more than approximately 2–3 simple concepts in one concise public descriptor.

Do not expose:

- size lists;
- dimensional matrices;
- grade lists;
- mill lists;
- SKU counts.

---

## 17.10 No price

Product Cards do not contain price.

Pricing remains in the separate Homepage Price Strip and deeper pricing contexts.

---

## 17.11 No card CTA button

Do not add separate buttons such as:

- مشاهده
- خرید
- استعلام قیمت
- افزودن به سبد

inside each Homepage Product Card.

The whole card may be the navigation link.

---

## 17.12 Whole-card link

When a valid public category/family destination exists:

**the whole card should function as one real link.**

Do not nest other interactive controls inside that link.

If no valid destination exists, the card must not fabricate one.

---

## 17.13 Directional affordance

A small restrained arrow/chevron may be used to communicate navigation.

It must not become a large competing CTA.

RTL/LTR direction should behave logically.

---

## 17.14 Card proportion

Preferred visual proportion:

approximately **4:3 or 5:4**

The card should not resemble a tall consumer e-commerce product tile.

Preferred internal balance:

```text
~60–65% visual
~35–40% title / descriptor
```

Exact dimensions remain subject to responsive layout and optical validation.

---

## 17.15 Card surface

Preferred visual system:

- white card;
- subtle border;
- restrained radius;
- little or no shadow;
- navy title;
- muted secondary text;
- limited copper accent where useful.

Avoid soft consumer-style card decoration.

---

## 17.16 Hover behavior

Hover is optional enhancement.

Preferred treatment:

- slightly stronger border;
- optional extremely subtle image scale, approximately <= 1.02.

Avoid:

- large lift;
- glow;
- heavy shadow;
- dramatic zoom;
- copper-filled takeover.

No required information may appear only on hover.

---

## 17.17 Explicitly prohibited card elements

Homepage Product Cards do not display:

- price;
- discount;
- "best seller" badge;
- "new" badge;
- stock availability;
- mill/factory name;
- SKU count;
- star rating;
- Add to Cart;
- Buy Now;
- generic trust badges;
- multiple CTA buttons;
- long descriptive paragraphs;
- promotional gradients;
- text embedded into product images.

---

# 18. Product Showcase Section Heading

Preferred Persian section heading:

**محصولات**

This aligns with the primary Header terminology and keeps the navigation vocabulary consistent.

---

## 18.1 Section helper copy

A short helper sentence may appear near the section heading.

Preferred Persian direction:

**«محصول موردنظر را انتخاب کنید و مشخصات، ابعاد و گزینه‌های تأمین را بررسی کنید.»**

Exact EN/AR wording remains subject to localization review.

The helper text should remain concise and should not duplicate full catalog explanatory copy.

---

# 19. View All Products

Unlike the Price Strip, Product Showcase has an authoritative real destination:

`/products`

Therefore a low-weight:

**مشاهده همه محصولات**

link is approved.

It should not compete visually with the site's primary procurement CTA.

---

# 20. Version 1.1 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.1 IS FROZEN.**

Next decision:

**Grid, responsive behavior, ordering, and treatment of the current 7-card launch set.**


---

# 21. Newly Frozen Decision in Version 1.2 — Catalog vs Availability vs Inventory

## 21.1 Three separate concepts

The architecture must treat the following as separate concerns:

```text
PRODUCT CATALOG
What Ahan Asa supplies as part of its business assortment

AVAILABILITY / SOURCING
Whether the product can currently be sourced and under what conditions

INVENTORY
Whether a specific warehouse currently has physical stock and how much
```

These concepts must not be collapsed into one boolean.

---

## 21.2 Product Family visibility is not stock-driven

Homepage Product Family visibility must NOT be driven by current warehouse quantity.

The following rule is explicitly frozen:

```text
qty_available = 0
≠
hide Homepage Product Family
```

A Product Family may remain publicly visible even when:

- Ahan Asa's own inventory is zero;
- current warehouse stock is zero;
- the product is currently sourced from suppliers;
- commercial availability requires an RFQ;
- the product is sourceable but not stocked.

---

## 21.3 Marketplace/procurement interpretation

The Homepage Product Card communicates:

**Ahan Asa supplies / sources this Product Family**

It does NOT communicate:

**This exact product is physically in Ahan Asa's warehouse right now**

Therefore Product Family cards should not expose simplistic Homepage-level labels such as:

- موجود
- ناموجود

as the basis for whether the card exists.

---

## 21.4 Removal conditions

A Homepage Product Family card should be removed only when the authoritative catalog/publication state indicates that the family is no longer intended to be publicly offered.

Examples:

- Product Family archived/retired;
- public publication disabled;
- Homepage eligibility disabled;
- Product Family removed from Ahan Asa's actual assortment;
- invalid/broken public mapping preventing safe publication.

Temporary zero inventory is not a removal condition.

---

## 21.5 Public Product Family Projection

Homepage Product Showcase consumes a stable public Product Family projection.

Preferred architecture:

```text
Odoo Product Master
↓
Public Product Family Projection
↓
Homepage publication eligibility / priority
↓
Homepage Product Showcase
```

It does NOT directly consume:

```text
Current warehouse stock
↓
Homepage visibility
```

---

## 21.6 Odoo-driven does not mean unstable

Odoo remains the Source of Truth for Product Family identity.

This does not imply the Homepage should constantly change.

Product Families may remain unchanged for years while:

- stock fluctuates;
- supplier offers change;
- variants expand;
- sourcing conditions change.

Variant changes do not automatically create new Homepage cards.

---

## 21.7 Future availability model direction

Deeper Catalog/Product/RFQ contexts may later distinguish concepts such as:

- In Stock;
- Sourceable;
- Request Required;
- Temporarily Unavailable;
- Discontinued.

Exact terminology and implementation are not frozen in this Homepage specification.

The architecture invariant is:

**Sourcing availability and physical inventory are different domains.**

---

# 22. Homepage Ordering

## 22.1 Stable, explicit priority

Homepage ordering comes from an authoritative public/homepage publication priority.

Conceptually:

```text
homepage_eligible
homepage_priority
stable tie-break
```

Exact field names remain implementation-level.

Frontend layout must not independently decide business priority.

---

## 22.2 Demand-informed, owner-approved ordering

Signals may inform future priority reviews, including:

- RFQ count;
- RFQ tonnage;
- RFQ commercial value;
- Product page demand;
- strategic business focus.

However:

**automatic real-time reordering is not approved.**

Homepage spatial order should remain stable until an explicit approved priority change occurs.

---

## 22.3 Deterministic tie-break

Equal-priority Product Families must still produce deterministic ordering.

Preferred concept:

```text
homepage_priority
then
stable Product Family sequence/code
```

Database-return order must not create random Homepage rearrangement.

---

# 23. Launch Ordering Direction

Until sufficient real demand data exists, preferred launch direction is:

```text
1. میلگرد
2. تیرآهن
3. ورق
4. قوطی
5. نبشی
6. ناودانی
7. لوله
```

This is a launch business direction, not a frontend hardcoded product master.

The authoritative ordering should ultimately come from the Product Family/publication projection.

---

# 24. Maximum Homepage Count

Homepage Product Showcase displays at most:

**8 eligible Product Family cards**

If more than 8 eligible Product Families exist:

```text
eligible families
↓
approved priority
↓
stable ordering
↓
first 8
↓
Homepage
```

All valid public families remain available through:

`/products`

---

# 25. Complete Wide-Desktop Layout Matrix

The Homepage must handle dynamic counts from 0 through 8 intentionally.

## 0 cards

```text
Product Showcase → hidden
```

No placeholder/skeleton/fake family.

## 1 card

```text
        [1]
```

One standard-width card centered.

## 2 cards

```text
      [1] [2]
```

Two standard-width cards centered.

## 3 cards

```text
    [1] [2] [3]
```

Three standard-width cards centered.

## 4 cards

```text
[1] [2] [3] [4]
```

One full four-card row.

## 5 cards

Preferred:

```text
  [1] [2] [3]
     [4] [5]
```

**3 + 2 centered**

Avoid:

```text
[1] [2] [3] [4]
       [5]
```

when a balanced 3+2 composition is practical.

## 6 cards

Preferred:

```text
[1] [2] [3]
[4] [5] [6]
```

**3 + 3**

## 7 cards

Preferred:

```text
[1] [2] [3] [4]
   [5] [6] [7]
```

**4 + 3 centered**

## 8 cards

Preferred:

```text
[1] [2] [3] [4]
[5] [6] [7] [8]
```

**4 + 4**

---

# 26. Card Width Stability

The card's visual identity must not radically change based on count.

Fewer products should produce more whitespace, not oversized consumer-style cards.

Do NOT stretch:

```text
2 cards
→ each card becomes ~50% container width
```

solely to fill space.

Maintain a coherent preferred Product Card width and center smaller sets.

---

# 27. Wide-Desktop Column Limit

Preferred maximum:

**4 columns**

This preserves:

- recognizable product imagery;
- readable title/subtitle;
- premium spacing;
- non-retail character.

Do not force 7–8 cards into one row.

---

# 28. Medium-Width Behavior

As available width decreases, reduce the number of columns before cards become cramped.

Preferred direction:

```text
Wide Desktop → max 4 columns
Medium → max 3 columns
Tablet → max 2 columns
Small Mobile → 1 column if required
```

Breakpoints are based on actual content fit, not blindly on framework defaults.

---

# 29. Balance Over Orphan Rows

Where practical, choose a balanced composition rather than creating a visually dominant lone orphan card.

Examples:

```text
5 cards
→ 3 + 2
```

preferred over:

```text
4 + 1
```

and:

```text
6 cards
→ 3 + 3
```

preferred over:

```text
4 + 2
```

when medium/wide layout allows it.

---

# 30. Tablet Layout

Tablet uses a maximum of:

**2 columns**

Examples:

```text
2 → 2

3 →
[1][2]
  [3]

4 →
[1][2]
[3][4]

5 →
[1][2]
[3][4]
  [5]

6 →
[1][2]
[3][4]
[5][6]

7 →
[1][2]
[3][4]
[5][6]
  [7]

8 →
[1][2]
[3][4]
[5][6]
[7][8]
```

A lone final card remains standard card width and centered.

It must not become double-width solely because it is last.

---

# 31. Mobile Layout

Product Showcase does NOT use horizontal swipe/carousel behavior.

Preferred mobile behavior:

```text
Normal mobile when cards fit comfortably
→ 2 columns

Narrow mobile / content-fit failure
→ 1 column
```

The layout must switch to one column before:

- image recognition suffers;
- titles clip;
- subtitle becomes unreadable;
- cards feel cramped.

---

# 32. No Horizontal Product Carousel

Unlike the Homepage Price Strip:

```text
Price Strip → horizontal swipe on mobile
```

Product Showcase uses:

```text
responsive grid
```

Core Product Families should not be hidden primarily behind horizontal scrolling.

---

# 33. Logical Reading Order

Responsive visual layout must preserve the authoritative Product Family order.

Do not reorder Product Families merely to improve row symmetry.

In RTL:

- visual flow follows logical RTL direction.

In LTR:

- visual flow follows logical LTR direction.

Business priority sequence remains unchanged.

---

# 34. Dynamic Add/Remove Behavior

## New family added

If a new Product Family becomes:

- publicly published;
- Homepage eligible;
- within top-8 priority;

the Homepage layout adjusts automatically.

Example:

```text
7 eligible
→ 4 + 3

new eligible family
→ 8 eligible
→ 4 + 4
```

No frontend commercial list edit is required.

---

## Family unpublished/retired

If one of 8 families is legitimately unpublished:

```text
8
→ 7
→ 4 + 3
```

No:

- empty placeholder;
- disabled ghost card;
- "not available" filler.

---

# 35. Zero-Family Failure State

If the Public Product Family Projection returns zero valid Homepage families:

```text
Product Showcase omitted
```

The public UI must not fabricate product cards.

However, this condition should be observable operationally because zero Product Families may indicate:

- sync failure;
- publication configuration error;
- projection issue;
- legitimate temporary configuration state.

Homepage failure is still not permitted.

---

# 36. One-Family State

Unlike the Price Strip, one Product Family is sufficient to render the Product Showcase.

Reason:

The Product Showcase represents catalog discovery, not a multi-item market benchmark strip.

The single card remains standard-width and centered.

---

# 37. Version 1.2 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.2 IS FROZEN.**

Frozen architecture now explicitly separates:

```text
Catalog
Availability / Sourcing
Inventory
```

and provides deterministic responsive behavior for:

```text
0 through 8 Homepage Product Family cards
```

Next decision:

**Product Family image/media governance, asset preservation, reuse, fallback, and Odoo/Website ownership.**


---

# 38. Newly Frozen Decision in Version 1.3 — Product Family Media Governance

## 38.1 Hybrid Odoo → Public Media architecture

Product Family imagery uses a hybrid architecture.

Odoo is the authoring/source system for Product Family images.

The public Website does NOT hotlink or depend on live Odoo image delivery.

Preferred flow:

```text
Odoo Product Family
+ source/authoring image
        ↓
Public Product Sync
        ↓
Does an approved public asset already exist?
   ├─ YES → reuse approved public asset
   └─ NO  → fetch source image from Odoo
              ↓
           validate
              ↓
        normalize/optimize
              ↓
      copy to Public Media Storage
              ↓
        register mapping
              ↓
      serve from Website/CDN
```

---

## 38.2 Odoo role

Odoo owns:

- Product Family identity;
- Product Family source image;
- source image authoring/maintenance;
- relationship between Product Family and source image.

Odoo is NOT the runtime browser-delivery dependency for Homepage Product Card imagery.

---

## 38.3 Public media role

The Website/Public Media layer owns:

- optimized public delivery copy;
- public URL;
- image version;
- checksum/source checksum;
- public publication status;
- delivery/cache behavior;
- responsive derivatives if needed.

The Browser consumes the public Website/CDN copy.

---

# 39. Stable Family Mapping

Media must map to a stable Product Family identity/code.

Do NOT map by localized display name.

Prohibited pattern:

```text
if name == "میلگرد"
→ use rebar.jpg
```

Preferred concept:

```text
family_code = REBAR
role = homepage_card
→ approved public media asset
```

Exact Family codes must come from the authoritative Product Master/public projection.

---

# 40. First-Sync Import Rule

If a newly published Homepage-eligible Product Family has:

- a valid Odoo source image;
- no existing approved public media asset;

the sync/import process may create the first public Website asset automatically through the approved processing pipeline.

Concept:

```text
New family
+
No public asset
+
Valid Odoo image
↓
Import source
↓
Validate
↓
Optimize
↓
Create public asset v1
↓
Register mapping
```

The Website then serves the copied public asset, not the original Odoo image endpoint.

---

# 41. Existing Public Asset Reuse

If an approved public asset already exists for the Product Family and media role:

```text
family_code = REBAR
role = homepage_card
```

normal catalog sync must reuse that asset.

Do not repeatedly download/recreate the same image on every sync.

Stock changes, supplier changes, Variant additions, and ordinary Product updates do not invalidate the Homepage Family media asset.

---

# 42. Source Image Change Policy

If the Odoo source image changes after an approved public asset already exists:

**do not silently overwrite the currently published public asset.**

Preferred flow:

```text
Odoo source checksum changed
↓
New media candidate detected
↓
Create candidate / next version
↓
Validation
↓
Approval
↓
Publish new public version
```

Until approval:

the current approved Website asset remains active.

---

# 43. Immutable / Versioned Public Assets

Preferred public-media model:

```text
homepage-v1
homepage-v2
homepage-v3
```

A later approved version changes the active mapping.

Previous public versions may remain archived/retained for:

- audit;
- historical documents;
- rollback;
- referenced content.

Do not blindly overwrite history in place when versioning is practical.

---

# 44. Media Status

Minimum conceptual media lifecycle:

```text
DRAFT / CANDIDATE
APPROVED
RETIRED / ARCHIVED
```

Homepage Product Showcase consumes only:

**APPROVED**

public media.

The exact Odoo/Website model and state names remain implementation-level.

---

# 45. Current Approved Images Must Be Preserved

Before Product Showcase implementation replaces existing frontend structures, current approved Product Family images must be inventoried.

Required migration intent:

```text
Existing approved Website Product Family images
↓
identify Product Family
↓
assign stable family identity
↓
preserve as approved public asset
```

A redesign must not accidentally discard already-approved Product Family imagery.

---

# 46. Variant Independence

Homepage Product Family media is tied to the Family, not to a random Product Variant.

Example:

```text
REBAR
├── 12mm
├── 14mm
├── 16mm
├── 18mm
```

Homepage:

```text
REBAR
→ approved family homepage image
```

Adding or removing Variants does not automatically change the Homepage Family image.

---

# 47. Inventory Independence

Media selection is not affected by physical stock.

The following must not trigger a media change:

- zero inventory;
- warehouse transfer;
- supplier offer expiry;
- replenishment;
- sourcing-state changes.

Catalog/media identity remains separate from inventory.

---

# 48. Missing Media Fallback

If a valid Homepage Product Family has no approved public media asset and no valid Odoo source image:

the Product Family must not be replaced with a misleading image.

Prohibited:

- use another Family's image;
- random stock image;
- automatic public AI generation;
- broken image icon;
- fake placeholder claiming to depict the product.

Preferred fallback:

**safe text-first Product Card with neutral media surface**

The Catalog remains accessible even when media is temporarily missing.

---

# 49. AI-generated Media Policy

AI-generated Product Family imagery is permitted only through a controlled workflow:

```text
AI-generated candidate
↓
technical/visual review
↓
human approval
↓
public asset
```

Automatic generation + immediate public publication is forbidden.

Industrial geometry, cross-section, surface, and product form must be reviewed before approval.

---

# 50. Media Roles

A Product Family may have different media assets for different contexts.

Conceptual examples:

```text
homepage_card
category_hero
family_card
social
```

Do not assume one source asset is automatically suitable for every channel/context.

Version 1.3 only freezes the need for role-aware media architecture; exact role names remain implementation-level.

---

# 51. Public Storage / Delivery

For the current small launch set, repository/static public assets are acceptable.

Example conceptual launch state:

```text
Website repository/static assets
→ approved 7–8 family images
```

At larger scale, architecture should allow migration to:

```text
Cloudflare R2 / CDN / DAM
```

without changing Product Family identity or Product Card architecture.

Storage backend is not frozen in Version 1.3.

---

# 52. No Live Odoo Image Dependency

Prohibited public runtime:

```text
Visitor
↓
Homepage
↓
Odoo image endpoint
```

Preferred:

```text
Visitor
↓
Homepage
↓
Public Website/CDN media
```

An Odoo outage must not cause approved Product Family images to disappear from the public Website.

---

# 53. Media Validation Pipeline

Before an imported source image becomes an approved public Website asset, the processing pipeline should validate, as applicable:

- supported file type;
- decodable image;
- reasonable dimensions;
- reasonable source size;
- aspect/crop suitability;
- public-use rights/provenance where required;
- technical/product-family correctness.

Then:

```text
normalize
optimize
generate public derivative
store
register checksum/mapping
publish
```

---

# 54. Media Provenance

Each public media asset should retain enough metadata to identify:

- source;
- source Product Family;
- source checksum;
- creator/provider where known;
- generated/photo/manual origin where applicable;
- rights/license status where relevant;
- approval state;
- approval/version date;
- public asset checksum.

Do not publish externally sourced imagery without a valid rights/governance basis.

---

# 55. Multi-language Media

Product Family media should not contain embedded Persian, Arabic, or English labels.

The same approved image may be reused across:

- FA;
- AR;
- EN.

Localized Product Family name/descriptor remains HTML/content data, not baked into the image.

---

# 56. Accessibility of Product Card Images

When the image is purely representative/decorative and the linked card already exposes the Product Family name in adjacent text:

preferred accessible treatment may be:

```html
<img alt="">
```

to avoid duplicate screen-reader output.

If an image conveys additional information not present in the card text, appropriate alt text is required.

Alt behavior must be context-aware, not blindly generated from Product name.

---

# 57. Image Performance

Product Card media must use web-appropriate delivery.

Required direction:

- explicit intrinsic dimensions/aspect ratio;
- responsive image sizing;
- optimized public derivative;
- lazy loading for below-fold content where appropriate;
- no unnecessary multi-megabyte originals delivered to the Browser.

---

# 58. Layout Stability

Product Card media area must reserve its dimensions before the image loads.

Preferred direction:

```text
fixed/declared aspect ratio
→ image load
→ no disruptive card jump
```

---

# 59. Product Geometry Preservation

Because the visual purpose is Product Family recognition, aggressive cropping is discouraged.

Preferred default:

**contain / controlled crop**

rather than blind `cover` when `cover` would cut off the recognizable geometry of:

- IPE;
- Angle;
- Channel;
- Pipe;
- SHS/RHS;
- Rebar;
- Plate/Sheet.

---

# 60. Image Load Failure

If a public media file fails to load:

- Product title/link remains usable;
- broken-image icon should not become the visual experience;
- neutral fallback surface may be shown.

Media failure must not remove access to the Product Family.

---

# 61. Retired Family Media

If a Product Family is retired/unpublished:

its historic media asset does not need to be physically deleted.

It may be retained/archive for:

- historical pages;
- documents;
- audit;
- prior order references;
- rollback.

Public active mapping is removed/disabled as appropriate.

---

# 62. Final Frozen Media Flow

```text
Odoo Product Family
+ Source Image
        ↓
Public Product Sync
        ↓
Stable Family Identity
        ↓
Public Media Registry

No approved asset?
→ Fetch Odoo source once
→ Validate
→ Optimize
→ Store public copy
→ Approve/Publish

Approved asset exists?
→ Reuse it

Odoo source changes?
→ Detect checksum change
→ Create new candidate/version
→ Human approval
→ Switch active public mapping
```

---

# 63. Version 1.3 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.3 IS FROZEN.**

Frozen media principle:

> **Odoo is the Product Family image authoring/source system; the Website imports and owns a stable optimized public delivery copy. Existing public assets are reused, and Odoo image changes never silently overwrite approved Website media.**

Next decision:

**Interaction + Accessibility + Performance + Final Acceptance Gate for Product Showcase.**


---

# 64. Newly Frozen Decision in Version 1.4 — Motion / Display System

## 64.1 Immediate product visibility

Product Family discovery must remain immediate.

The Product Showcase must not depend on the user completing a scroll-driven storytelling sequence in order to discover all visible Product Families.

All Product Cards must become available immediately when the section is rendered/entered.

---

## 64.2 No sticky product storytelling

The Product Showcase does NOT use:

- sticky/pinned Product Cards;
- step-by-step product replacement on scroll;
- scroll hijacking;
- forced scroll narratives;
- pinned horizontal product scenes.

Sticky storytelling is considered more appropriate for future process/story sections, not Catalog discovery.

---

## 64.3 Soft section reveal

A restrained section entrance animation is approved as progressive enhancement.

Preferred direction:

```text
Heading/helper:
opacity ~0.92 → 1
translateY ~4–6px → 0
duration ~180–220ms
```

Exact values remain subject to optical tuning.

The section must remain understandable and visible without animation.

---

## 64.4 Micro-staggered card reveal

Product Cards may use a very short stagger when the section first enters the viewport.

Preferred direction:

```text
Card 1:   0ms
Card 2:  ~30ms
Card 3:  ~60ms
Card 4:  ~90ms
...
```

The total visual reveal sequence should remain approximately within:

**~180–220ms**

for the visible set.

The user must not feel that Product discovery is delayed by animation.

---

## 64.5 Reveal once

Entrance reveal should happen only once per normal page visit/session state where practical.

Preferred behavior:

```text
first section entry
→ reveal

scroll away
→ scroll back
→ cards stay visible
```

Repeated fade-out/fade-in on every scroll pass is not approved.

---

## 64.6 Product image reveal

A very subtle image settling/reveal is permitted.

Preferred direction:

```text
image opacity ~0.92 → 1
```

Avoid:

- large blur;
- grayscale-to-color theatrics;
- brightness flash;
- metallic glow;
- fake reflective animation.

The steel product should appear realistic from the start.

---

## 64.7 Desktop hover

Approved restrained hover direction:

```text
Card border:
slightly stronger

Image:
scale 1.00 → approximately 1.015

Directional arrow:
~2px movement in logical navigation direction
```

Preferred timing:

**~150–180ms**

No required information may depend on hover.

---

## 64.8 Product-window framing

The preferred visual metaphor is a clean Product Window:

```text
┌─────────────────────────┐
│                         │
│      PRODUCT IMAGE      │
│                         │
├─────────────────────────┤
│ Product Family          │
│ Short descriptor     →  │
└─────────────────────────┘
```

Motion emphasizes the product image subtly, not the entire card dramatically.

---

## 64.9 Mobile motion

Mobile motion is even more restrained.

Preferred direction:

- optional soft section-level fade;
- Product Cards appear directly;
- no noticeable card-by-card waiting sequence;
- no hover-dependent behavior;
- tap navigates immediately.

---

## 64.10 Reduced motion

When:

```css
prefers-reduced-motion: reduce
```

is active:

- section/cards appear immediately;
- translate motion is removed;
- image scaling/motion is removed;
- no stagger is required.

The Product Showcase remains fully usable.

---

## 64.11 Progressive enhancement

Baseline HTML/CSS state must keep Product Cards visible.

Approved architecture:

```text
Server-rendered visible cards
↓
optional enhancement capability
↓
soft one-time reveal
```

Do NOT use a baseline state in which cards are permanently `opacity: 0` until JavaScript executes.

JavaScript failure must never hide Product Families.

---

## 64.12 No motion dependency

The following are forbidden as requirements for basic Product Showcase usability:

- animation library dependency;
- custom scroll engine;
- WebGL;
- heavy scroll measurement;
- browser-specific scroll-timeline behavior.

Native/CSS behavior is preferred.

---

# 65. Explicitly Rejected Motion Patterns

The following are not approved for Product Showcase V1.4:

- Sticky Product Scroll
- Scroll Hijacking
- Parallax Product Cards
- 3D Tilt
- Flip Cards
- Large Card Lift
- Dramatic Glow
- Heavy Blur Reveal
- Long Stagger Sequences
- Autoplay Carousel
- Repeated Reveal on Scroll
- Motion required to discover products

---

# 66. Frozen Display Philosophy

The Product Showcase follows this hierarchy:

```text
Immediate Product Visibility
        +
Strong Product Recognition
        +
Direct Whole-Card Navigation
        +
Minimal Entrance Motion
        +
Restrained Hover Feedback
        +
No Scroll Obstruction
```

Motion supports Product discovery.

Motion never becomes the primary experience.

---

# 67. Version 1.4 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.4 IS FROZEN.**

Next decision:

**Final Interaction / Accessibility / Performance / Failure Isolation / Acceptance Criteria Gate.**


---

# 68. Newly Frozen Decision in Version 1.5 — Homepage Display Control and Ordering

## 68.1 No automated scoring system in current phase

The current implementation does NOT require a complex 100-point ranking engine.

Homepage Product Family ordering is controlled through a simple explicit merchandising/publication configuration.

Preferred conceptual controls:

```text
show_on_homepage
homepage_sequence
```

Exact technical field/model names remain implementation-level.

---

## 68.2 Ordering belongs to Odoo/Public Publication governance

Homepage ordering must not be hardcoded in frontend source code.

Prohibited pattern:

```text
REBAR = 1
IPE = 2
PLATE = 3
```

inside Website business logic as the authoritative merchandising order.

Preferred:

```text
Odoo / Public Product Family Publication
↓
show_on_homepage
homepage_sequence
↓
Public Product Family Projection
↓
Website
```

---

## 68.3 Sequence values should allow insertion

Preferred operational sequence style:

```text
10
20
30
40
...
```

rather than tightly packed:

```text
1
2
3
4
```

Reason:

A newly added Product Family can be inserted without renumbering every existing Family.

Example:

```text
REBAR   10
IPE     20
STRIP   25
PLATE   30
```

---

## 68.4 Deterministic ordering

Public projection ordering should follow:

```text
homepage_sequence
then
stable Product Family tie-break
```

Equal sequence values must not create random Website ordering.

---

## 68.5 New Product Family behavior

A new Product Family appears on Homepage only when:

- it exists in authoritative Product Master;
- it is publicly published;
- it is Homepage-enabled;
- it falls within the first 8 eligible items after approved ordering.

Conceptual example:

```text
STRIP / تسمه
Public = yes
Show on Homepage = yes
Sequence = 45
Source Image = valid
```

Then:

```text
Public sync
↓
Product Family projection updated
↓
Media asset imported only if missing
↓
Homepage card appears automatically
```

No frontend commercial card addition is required.

---

## 68.6 Variant additions do not create Homepage cards

Adding Product Variants under an existing Family does not affect Homepage Family-card count.

Example:

```text
REBAR
├── 16mm
├── 18mm
├── 20mm
```

Homepage still contains:

```text
one REBAR Family card
```

---

## 68.7 Product Family removal / unpublication

If a Product Family is:

- archived/retired;
- publicly unpublished;
- or `show_on_homepage` is disabled;

the Product Card is removed from Homepage after projection sync.

The associated public media asset may remain archived for history/rollback and must not be blindly deleted.

---

## 68.8 Inventory does not affect display ordering or visibility

Current physical inventory does not control Homepage Product Family visibility or sequence.

Explicit invariant:

```text
inventory = 0
→ Product Family may remain visible
```

Homepage reflects Ahan Asa's public supply assortment, not a warehouse-only stock list.

---

## 68.9 Media behavior remains independent

For a new Homepage Product Family:

```text
no existing public asset
+
valid Odoo source image
↓
import once
↓
optimize
↓
public asset
↓
reuse thereafter
```

For an existing Product Family with an approved public asset:

```text
reuse existing asset
```

No repeated image import is required during ordinary catalog sync.

---

## 68.10 Future data-assisted recommendations

A future version may calculate demand-based recommendations using:

- RFQ demand;
- tonnage/value;
- page demand;
- sourcing reliability;
- strategic importance.

However:

**data may recommend; owner/business governance approves.**

Automatic real-time reordering is not part of V1.5.

---

# 69. Frozen Ordering Model

```text
ODOO / PUBLIC PRODUCT FAMILY GOVERNANCE

Product Family
├── public publication state
├── show_on_homepage
├── homepage_sequence
└── source image
        ↓
PUBLIC SYNC
        ↓
Public Product Family Projection
        ↓
sort by sequence + stable tie-break
        ↓
first 8 eligible
        ↓
Homepage Product Showcase
```

Frontend layout determines only spatial presentation.

Frontend does not determine commercial/business priority.

---

# 70. Version 1.5 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V1.5 IS FROZEN.**

Next decision:

**Final Interaction / Accessibility / Performance / Failure Isolation / Acceptance Criteria Gate, leading to Product Showcase Final Frozen V2.0.**


---

# 71. Final Interaction / Accessibility / Performance / Failure Isolation Gate

Version 2.0 closes the Product Showcase architecture and acceptance criteria.

No subjective redesign is authorized after this point unless a material business, catalog, accessibility, localization, performance, media, or validated usability reason exists.

---

# 72. Final Interaction Semantics

## 72.1 Whole-card navigation

When a real Product Family/Category destination exists, the whole Product Card is one semantic link.

Preferred structure:

```html
<section aria-labelledby="products-heading">
  <h2 id="products-heading">...</h2>
  <ul>
    <li>
      <a href="...">
        ...
      </a>
    </li>
  </ul>
</section>
```

Do not use clickable generic `<div>` elements.

Do not nest additional interactive controls inside the Product Card link.

---

## 72.2 No internal CTA competition

Homepage Product Cards do not contain:

- Buy Now;
- Add to Cart;
- Request Price;
- multiple CTA buttons.

The Product Card itself provides discovery navigation.

The site-wide procurement CTA remains separate.

---

# 73. Final Responsive Matrix

## 73.1 Wide desktop

```text
0 → hide

1 →
        [1]

2 →
      [1] [2]

3 →
    [1] [2] [3]

4 →
[1] [2] [3] [4]

5 →
  [1] [2] [3]
     [4] [5]

6 →
[1] [2] [3]
[4] [5] [6]

7 →
[1] [2] [3] [4]
   [5] [6] [7]

8 →
[1] [2] [3] [4]
[5] [6] [7] [8]

>8 →
sort approved eligible Product Families
→ first 8
```

---

## 73.2 Responsive direction

```text
Wide Desktop → max 4 columns
Medium → max 3 columns
Tablet → max 2 columns
Mobile → 2 columns while comfortably readable
Small Mobile → 1 column before content becomes cramped
```

No horizontal Product carousel is used.

A lone final card must not become full-width merely to fill a row.

---

# 74. Final Catalog / Availability / Inventory Invariants

The following remain independent:

```text
CATALOG
AVAILABILITY / SOURCING
INVENTORY
```

Critical regression invariant:

```text
inventory = 0
+
Product Family publicly published
+
show_on_homepage = true
↓
Product Family card remains visible
```

Physical stock must not determine Homepage catalog presence.

---

# 75. Final Ordering Architecture

Preferred publication model:

```text
Product Family
├── public publication state
├── show_on_homepage
├── homepage_sequence
└── source image
```

Then:

```text
Public Product Family Projection
↓
sort by homepage_sequence
↓
stable tie-break
↓
first 8 eligible
↓
Homepage
```

Frontend does not hardcode business order.

A complex automated ranking engine is not required in Version 2.0.

Future analytics may recommend sequence changes, but owner/business governance approves them.

---

# 76. Final Media Architecture

## 76.1 Odoo source image

Odoo is the source/authoring location for Product Family image input.

## 76.2 Public delivery asset

The Website imports/copies an optimized public version and serves it from Website/CDN/Public Media Storage.

Browser delivery must not depend on live Odoo image endpoints.

---

## 76.3 New Product Family media

```text
New Family
+
No public asset
+
Valid Odoo source image
↓
fetch once
↓
validate
↓
optimize
↓
store public version
↓
register mapping
↓
use thereafter
```

---

## 76.4 Existing Product Family media

```text
Approved public asset exists
↓
reuse existing asset
```

Do not repeatedly import the same source image.

---

## 76.5 Odoo image changed

```text
source checksum changes
↓
create new candidate/version
↓
validate
↓
approval
↓
switch active public asset
```

No silent overwrite of approved Website media.

---

## 76.6 Missing media

```text
Valid Family
+
No approved public image
↓
safe text-first card
```

Do not use:

- another Family's image;
- random stock photo;
- automatic AI publication;
- broken image icon.

---

# 77. Final Motion / Display System

Approved:

- immediate Product visibility;
- very soft section reveal;
- short micro-stagger;
- subtle image hover;
- tiny logical arrow movement;
- one-time reveal;
- reduced-motion support.

Rejected:

- sticky product storytelling;
- pinned Product sequence;
- parallax;
- scroll hijacking;
- 3D tilt;
- flip cards;
- dramatic glow;
- heavy blur;
- long stagger;
- autoplay;
- repeated reveal.

Progressive enhancement rule:

```text
JavaScript failure
→ Product Cards remain visible and usable
```

Animation must never be required for discovery.

---

# 78. Accessibility Gate

PASS requires:

- semantic section/list/link structure;
- whole-card link when destination exists;
- keyboard reachability;
- Enter navigation;
- visible focus;
- no nested conflicting controls;
- normal text contrast >= 4.5:1;
- meaningful UI/focus contrast >= 3:1;
- correct RTL/LTR;
- 320 CSS px usable layout;
- 200% zoom usable;
- 400% zoom usable;
- reduced-motion support.

Representative/decorative Product images may use:

```html
<img alt="">
```

when the adjacent Product Family text already communicates the same information.

If an image conveys additional information, meaningful alt text is required.

---

# 79. Performance Gate

Preferred architecture:

```text
Odoo
↓ sync
Public Product Family Projection
↓
Server-rendered Homepage
```

Not:

```text
Visitor loads Homepage
↓
client JS fetches Product Families
```

Version 2.0 requires:

- no live Odoo request for Homepage Product Cards;
- no client-side Product fetch by default;
- Product Family names/links in initial HTML;
- minimal/near-zero Product Showcase-specific JavaScript;
- CSS/native layout where practical;
- explicit image dimensions/aspect ratio;
- responsive image delivery;
- optimized public derivative;
- lazy loading for below-fold media where appropriate;
- no unnecessary multi-megabyte image delivery;
- no disruptive CLS from image loading.

---

# 80. Failure Isolation

## 80.1 Odoo unavailable

If Odoo is temporarily unavailable:

the latest valid Public Product Family Projection may continue serving the public Website.

Product Cards must not disappear merely because Odoo is temporarily offline.

---

## 80.2 Projection read failure

If Public Product Family Projection cannot be safely read:

```text
Product Showcase omitted
↓
Homepage remains healthy
```

Homepage must not return 500 because of Product Showcase failure.

---

## 80.3 Media failure

If a public image fails:

```text
Product Card remains
Product title remains
Product link remains
Neutral fallback may appear
```

Media failure does not become Catalog failure.

---

# 81. Critical Regression Tests

The implementation must protect at least the following invariants.

## 81.1 Zero inventory

```text
stock = 0
+
public = true
+
show_on_homepage = true
↓
Card remains
```

## 81.2 New Product Family

```text
New Family
+
public = true
+
show_on_homepage = true
+
valid sequence
↓
Public projection
↓
Card appears automatically
```

If no public media exists and valid Odoo media exists:

the first public media asset is imported according to the frozen media policy.

---

## 81.3 Variant addition

```text
new Variant under existing Family
↓
Homepage Family-card count unchanged
```

---

## 81.4 Family unpublished

```text
public/homepage publication disabled
↓
Card removed after projection sync
```

---

## 81.5 Odoo source image changed

```text
source checksum changed
↓
candidate/new version
↓
current approved public asset remains active
until approval
```

---

# 82. Final Acceptance Matrix

| Gate | Required Result |
|---|---|
| Product identity owner | Odoo Product Master |
| Website Product source | Public Product Family Projection |
| Frontend commercial Family hardcode | FORBIDDEN |
| Inventory controls visibility | FORBIDDEN |
| Zero stock removes Family | FORBIDDEN |
| Homepage display control | Public/Homepage publication governance |
| Homepage ordering | homepage_sequence + stable tie-break |
| Automated real-time ranking | NOT REQUIRED / NOT ACTIVE |
| Maximum Homepage cards | 8 |
| 0 cards | Section hidden |
| 1 card | Standard-width centered |
| 2 cards | Centered pair |
| 3 cards | Centered 3 |
| 4 cards | 4 |
| 5 cards | 3 + 2 centered |
| 6 cards | 3 + 3 |
| 7 cards | 4 + 3 centered |
| 8 cards | 4 + 4 |
| >8 cards | First 8 by approved ordering |
| Product carousel | FORBIDDEN |
| Whole-card link | REQUIRED when destination exists |
| Internal CTA buttons | NONE |
| Price in Product Card | FORBIDDEN |
| Stock label in Homepage Card | NOT REQUIRED / default absent |
| SKU/grade/size/mill data | FORBIDDEN in Homepage Card |
| Odoo source image | ALLOWED / AUTHORING SOURCE |
| Browser loads image from live Odoo | FORBIDDEN |
| Existing public asset | REUSE |
| New Family image | Import once if missing |
| Source image update | No silent overwrite |
| Missing image | Safe text-first fallback |
| Wrong/random substitute image | FORBIDDEN |
| AI immediate auto-publish | FORBIDDEN |
| Responsive images | REQUIRED |
| Explicit aspect ratio/dimensions | REQUIRED |
| Broken image degrades safely | REQUIRED |
| Immediate product visibility | REQUIRED |
| Sticky Product scroll | FORBIDDEN |
| Scroll hijacking | FORBIDDEN |
| Motion required for usability | FORBIDDEN |
| Reduced motion | REQUIRED |
| Keyboard navigation | REQUIRED |
| Visible focus | REQUIRED |
| WCAG AA text contrast | REQUIRED |
| RTL/LTR | REQUIRED |
| 320px usability | REQUIRED |
| 200% zoom | REQUIRED |
| 400% zoom | REQUIRED |
| Live Odoo Product request | FORBIDDEN |
| Client Product fetch by default | FORBIDDEN |
| SSR/initial HTML Product links | REQUIRED |
| Homepage failure on Product/media issue | FORBIDDEN |
| `/products` View All | REAL LINK |

---

# 83. Required Validation Matrix

Before implementation receives final PASS, validate at least:

## Locales

```text
FA
AR
EN
```

## Viewports

```text
320
360
390
430
768
1024
1280
1440
```

## Product-count states

```text
0
1
2
3
4
5
6
7
8
>8
```

## Catalog states

```text
zero inventory
new Family
new Variant
retired/unpublished Family
missing media
failed media load
changed Odoo image
Odoo unavailable
Projection read failure
```

## Accessibility / interaction

```text
Keyboard-only
200% zoom
400% zoom
prefers-reduced-motion
```

---

# 84. Final Frozen Homepage Product Showcase Architecture

```text
ODOO PRODUCT MASTER
        ↓
Product Family identity
Public publication state
Homepage eligibility
Homepage sequence
Source image
        ↓
PUBLIC PRODUCT SYNC
        ↓
Public Product Family Projection
        +
Public Media Registry
        ↓
Server-rendered Homepage
        ↓
PRODUCT SHOWCASE

0–8 curated Family Cards
Stable ordering
Responsive balanced grid
Approved public imagery
Direct Category navigation
No price
No stock-driven disappearance
No retail checkout controls
```

---

# 85. Governance

Product Showcase Version 2.0 must not be reopened solely for subjective visual preference.

A revision requires a material reason such as:

- actual business assortment change;
- Product Master architecture change;
- public publication model change;
- validated usability problem;
- accessibility failure;
- localization issue;
- performance issue;
- media architecture change;
- legal/compliance requirement.

All revisions must be explicitly versioned.

---

# 86. Version 2.0 Status

**AHAN ASA HOMEPAGE PRODUCT SHOWCASE V2.0 IS FULLY FROZEN AND APPROVED.**

Versions 1.0 through 1.5 remain historical frozen baselines.

Implementation must be validated against this Version 2.0 document rather than redesigned from scratch.
