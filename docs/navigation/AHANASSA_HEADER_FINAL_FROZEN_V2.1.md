# AHAN ASA — Header & Processing Architecture
## Final Frozen Header — Version 2.1

**Project:** Ahan Asa / آهن آسا  
**Document type:** Frozen Architecture & UX Decisions  
**Status:** FINAL FROZEN — UPDATED  
**Version:** 2.1  
**Date:** 2026-09-05

---

## 1. Purpose

This document records only decisions explicitly approved and frozen during the component-by-component redesign of Ahan Asa.

From this point forward:

- these decisions are the current architectural baseline;
- future decisions must be published in a new version;
- frozen decisions must not be silently overwritten;
- any revision must explicitly identify the superseded decision.

This document is not an implementation authorization by itself.

---

# 2. Global Header — Frozen Decisions

## 2.1 Primary navigation

The current top-level navigation remains:

1. **محصولات**
2. **خدمات**
3. **بازارها**
4. **درباره ما**
5. **تماس با ما**

### Frozen rule

No additional top-level navigation item is introduced at this stage.

Items such as «مدیریت خرید»، «فرآیند خرید» and «دانش خرید» are **not** currently added to the primary Header.

---

# 3. Products Navigation — Frozen Architecture

## 3.1 Products remains a real landing-page link

The top-level item **محصولات** continues to link to:

`/products`

The Products landing page remains a permanent first-class catalog entry point.

## 3.2 Hybrid Products navigation

Products uses a hybrid pattern:

- **محصولات** remains a real link to `/products`;
- a compact disclosure/dropdown provides shortcuts to public product families/categories;
- the dropdown assists navigation and does not replace `/products`.

```text
محصولات
├── /products
└── Product Family shortcuts
```

## 3.3 No retail-style mega menu

The Products menu must remain compact and procurement-oriented.

It must not become a large retail/e-commerce mega menu containing large numbers of SKUs, variants, sizes, grades, brands, or technical options.

## 3.4 Product navigation level

The Header may show:

- Product Families
- Public Product Categories

The Header must not show:

- individual SKUs;
- sizes;
- grades;
- variants;
- technical attribute combinations.

---

# 4. Product Source of Truth — Frozen Architecture Rule

## 4.1 Odoo is the commercial source of truth

All commercial product definitions originate from Odoo, including as applicable:

- product;
- variant;
- family/category;
- attributes;
- units;
- grades;
- standards;
- publication status.

The website must not maintain a second independent commercial product master.

## 4.2 Hardcoded commercial products are prohibited

Commercial product names and product-family lists must not be maintained in frontend code as the source of truth.

Prohibited pattern:

```ts
const products = [
  "میلگرد",
  "تیرآهن",
  "ورق",
]
```

The same applies to hidden hardcoding inside navigation configuration, homepage components, catalog configuration, route-specific product arrays, or featured-product constants.

## 4.3 Shared public product projection

Target data flow:

```text
Odoo
  ↓
Commercial Product Master
  ↓
Public Product Projection
  ↓
Website Read Model / Cache
  ↓
Header / Homepage / Catalog / Product Detail
```

Header product navigation, Homepage product components, Product Catalog and Product Detail pages must ultimately consume the same public product projection.

## 4.4 No synchronous rendering dependency on Odoo

Public page rendering must not require a live synchronous Odoo request.

Preferred:

```text
Odoo
  ↓ sync
Public Read Model / Cache
  ↓
Website
```

Not:

```text
Browser Request
  ↓
Website
  ↓
Live Odoo API
  ↓
Render
```

## 4.5 Product navigation publication controls

The architecture should support public-navigation metadata such as:

- publication status;
- navigation visibility;
- stable navigation order;
- localized public name;
- slug;
- parent/category relationship.

Exact model/field implementation is not frozen in Version 1.0.

## 4.6 Stable navigation ordering

Header product-family order should remain relatively stable.

Real-time demand, RFQ volume or popularity must not continuously reshuffle Header navigation. Popularity may later influence controlled ordering decisions, while Homepage ranking may use more dynamic demand signals.

---

# 5. Processing & Services — Frozen Architecture

The earlier concept of **Services as only a content/capability page** is superseded.

Services are treated as a real business and order-processing domain.

---

# 6. Three Core Domain Concepts

The following concepts are explicitly separate.

## 6.1 Material

Raw or purchased steel material.

Examples:

- ورق
- میلگرد
- مقطع
- لوله

## 6.2 Processing Operation

A single transformation or processing activity.

Examples:

- برش
- سوراخکاری
- پانچ
- خم
- رزوه
- ماشینکاری

## 6.3 Finished Requirement

The end-result requested by the customer.

Examples:

- ورق سوراخ‌شده
- بیس‌پلیت
- بولت
- قطعه طبق نقشه

### Frozen rule

Material, Processing Operation and Finished Requirement must not be modeled as the same conceptual entity.

---

# 7. Processing Routes

Processing may be single-operation or multi-operation.

Example:

```text
میلگرد
  ↓
برش
  ↓
خم
  ↓
رزوه
  ↓
بولت
```

Another example:

```text
ورق
  ↓
برش
  ↓
سوراخکاری
  ↓
پلیسه‌گیری
  ↓
بیس‌پلیت
```

The architecture must support ordered multi-step Processing Routes.

---

# 8. Customer Does Not Need to Know the Manufacturing Method

Frozen UX rule:

> The customer must not be forced to know which manufacturing method is technically appropriate.

For example, a customer may request **ورق سوراخ‌شده طبق نقشه** without knowing whether the suitable method is Punching, CNC drilling, or another supported method.

The system must support:

- customer specifies the method;
- customer does not specify the method;
- method is resolved during Technical Review;
- method is constrained by drawing/specification.

---

# 9. Technical Review

Technical Review is a first-class part of the future RFQ architecture.

Example unresolved requirement:

```text
Requested outcome: Hole making
Preferred method: Unspecified
Technical review: Required
```

The selected processing method and route may be finalized later by Ahan Asa or the responsible technical/sourcing workflow.

---

# 10. Supported Order Modes

The architecture must support all of the following:

## 10.1 Material Only

Customer purchases material without processing.

## 10.2 Material + Processing

Ahan Asa supplies the material and arranges one or more processing operations.

## 10.3 Processing Only

Customer supplies the material and requests only processing.

## 10.4 Finished Part

Customer orders an end-result that may internally require material sourcing plus a Processing Route.

Example:

```text
500 بولت طبق نقشه
```

The customer should not be required to manually construct the underlying process chain.

---

# 11. Material Source

Processing RFQs must support:

- material supplied by Ahan Asa;
- material supplied by customer;
- material supplied directly by vendor;
- material sourced by one supplier and processed by another.

---

# 12. Website RFQ Must Not Directly Create Manufacturing Orders

Frozen rule:

```text
Website RFQ
   ↓
Technical Requirement
   ↓
Technical Resolution
   ↓
Sourcing / Commercial Resolution
   ↓
Confirmed Processing Route
   ↓
Execution in Odoo
```

A website RFQ must not directly create a Manufacturing Order merely because a fabricated item was requested.

---

# 13. Native Odoo Execution — Preferred Direction

After technical and commercial confirmation, native Odoo capabilities should be used where appropriate for:

- Purchase;
- Subcontracting;
- Manufacturing;
- BoM/operations;
- Work-order sequencing;
- Inventory movements.

The website must not become a replacement manufacturing engine.

Exact Odoo implementation is not frozen in Version 1.0.

---

# 14. Processing Master vs Product Master

Processing is a separate domain from the commercial steel Product Master.

```text
Product Master
     +
Processing Master
     ↓
    RFQ
```

Processing concepts must not be mixed indiscriminately into Product Master.

A dedicated Ahan Asa processing domain/module is the preferred architecture direction. Exact Odoo model names are not yet frozen.

---

# 15. Supplier Capability

A Processing Operation and a Supplier Capability are separate concepts.

Example:

```text
Operation: CNC drilling
Supplier A capability: up to X thickness
Supplier B capability: up to Y thickness
```

### Frozen rule

Supplier-specific capability limitations must not be stored as if they were the universal definition of the Processing Operation.

---

# 16. Processing Compatibility

The architecture must support compatibility constraints between relevant technical dimensions such as:

- material family;
- product geometry;
- thickness;
- diameter;
- dimensions;
- hole size;
- tolerance;
- processing method.

The customer-facing UI should use these rules to avoid technically impossible or irrelevant options.

Exact rule schema is not frozen.

---

# 17. Drawings as First-Class RFQ Data

Drawings are not merely generic attachments for processing orders.

For many fabricated requests, the drawing is a central part of the specification.

The architecture must support drawings/files at **RFQ line/item level**.

```text
RFQ
├── Line 1
│   └── drawing-A.dxf
├── Line 2
│   └── drawing-B.pdf
└── Line 3
    ├── rev-A.dwg
    └── rev-B.dwg
```

Revision history must be preservable rather than silently overwriting previous revisions.

Potential file types may include PDF, DXF, DWG, STEP, spreadsheet/BOM and image. Exact supported formats are not frozen.

---

# 18. Scrap vs Usable Remainder

These are distinct concepts.

## 18.1 Process Loss / Scrap

Examples:

- kerf loss;
- chips;
- unusable waste;
- rejected material.

## 18.2 Usable Remainder / Offcut

A usable remaining portion after processing.

An offcut may:

- belong to customer;
- belong to Ahan Asa;
- remain saleable;
- be reusable;
- generate a commercial credit.

### Frozen rule

Usable remainder must not automatically be classified as scrap.

---

# 19. Commercial Transparency of Material and Processing

A processed order must be able to distinguish commercially between:

- raw material;
- processing/service;
- logistics;
- process loss;
- usable remainder;
- scrap credit where applicable.

The customer must be able to understand that a processed item may involve both:

1. purchasing raw material;
2. paying for one or more processing services.

---

# 20. Internal Cost vs Customer Quote

The architecture must allow:

```text
Internal Cost Breakdown
```

to differ from:

```text
Customer Quote Breakdown
```

Ahan Asa does not need to expose every internal costing detail to the customer, while still allowing clear commercial separation of material and processing when required.

---

# 21. Processing Pricing Basis

Processing pricing cannot assume a single unit such as kg.

The architecture must be able to support pricing bases such as:

- per kg;
- per ton;
- per meter;
- per cut;
- per hole;
- per bend;
- per piece;
- per machine hour;
- setup fee;
- flat fee;
- combinations of multiple pricing bases.

Exact pricing-engine implementation is not frozen.

---

# 22. Public Services Taxonomy — Frozen Direction

Customer-facing Services must not simply expose the raw internal operation master.

Two discovery models are required on `/services`.

## 22.1 By Material

Customer starts from the material/product family.

Examples may include:

- ورق;
- میلگرد;
- مقاطع;
- لوله.

This list should ultimately be data-driven from Odoo/product families combined with processing compatibility.

It must not become an independent hardcoded commercial taxonomy.

## 22.2 By Need / Processing Intent

Current frozen top-level intent families:

1. **برش و اندازه‌سازی**
2. **سوراخکاری و ایجاد حفره**
3. **خمکاری و شکل‌دهی**
4. **رزوه و آماده‌سازی انتها**
5. **ساخت قطعه طبق نقشه**

Lower-level manufacturing methods remain data-driven and may include CNC drilling, punching, laser cutting, plasma cutting, sawing, threading, bending, etc.

These lower-level operations are not intended to be Header items.

---

# 23. Drawing / Technical Review Entry Point

The Services experience must prominently support:

> **نقشه دارم؛ روش مناسب را پیشنهاد دهید.**

This is a first-class entry path, not a fallback error state.

---

# 24. Products and Services Must Cross-Link

Products and Services must not become separate information silos.

Product pages should be able to show compatible processing capabilities, and Service pages should be able to identify compatible material/product families.

Compatibility must come from the shared domain/read model, not manually maintained duplicate frontend lists.

---

# 25. Processing Source of Truth

Commercial/operational processing definitions belong to the Odoo-side Processing Domain.

This may include:

- service families;
- operations;
- methods;
- routes;
- compatibility;
- supplier capability;
- commercial availability;
- publication status.

Website content remains responsible for presentation/SEO material such as:

- public explanatory copy;
- SEO title/description;
- FAQs;
- buying guidance;
- method comparisons;
- images;
- structured content.

Conceptually:

```text
Odoo = operational/commercial truth
Website = public presentation/content
```

---

# 26. Hardcoded Commercial Services Are Prohibited

The same architecture rule used for Products applies to Services.

Frontend code must not become the source of truth for commercial processing services.

Prohibited pattern:

```ts
const services = [
  "برش",
  "خم",
  "سوراخکاری",
]
```

Target flow:

```text
Odoo Processing Master
  ↓
Public Processing Projection
  ↓
Website Read Model / Cache
  ↓
Header / Services / Product Detail / RFQ
```

---

# 27. Header Services — Frozen Decision

The Header Services item changes from a simple-only navigation item to a **hybrid navigation item**.

The word **خدمات** remains a real link to:

`/services`

A compact disclosure provides service-family shortcuts.

Frozen public Header grouping:

```text
خدمات
├── فرآوری ورق
├── فرآوری میلگرد، مقاطع و لوله
├── ساخت قطعات طبق نقشه
└── مشاهده همه خدمات
```

### Important

The Header must not expose the full technical operation list such as CNC, punching, drilling, plasma, laser, threading, etc.

Those belong deeper in the Services experience.

The groups themselves must ultimately come from the Public Processing Projection and not become frontend commercial source-of-truth data.

---

# 28. Current Frozen Header Structure

At Version 1.0 the conceptual Header is:

```text
محصولات ▾
خدمات ▾
بازارها
درباره ما
تماس با ما
```

Products:

```text
محصولات
├── Public Product Families (Odoo-driven)
└── مشاهده همه محصولات → /products
```

Services:

```text
خدمات
├── فرآوری ورق
├── فرآوری میلگرد، مقاطع و لوله
├── ساخت قطعات طبق نقشه
└── مشاهده همه خدمات → /services
```

The remaining top-level items:

- بازارها
- درباره ما
- تماس با ما

have **not yet been fully re-audited or frozen beyond their current presence in primary navigation**.

---

# 29. Decisions Explicitly NOT Frozen Yet

The following remain open for later versions:

- exact Header visual design;
- Header height;
- background color;
- sticky behavior;
- phone presentation;
- language selector;
- final RFQ CTA treatment;
- exact disclosure interaction;
- exact Products dropdown visual layout;
- exact Services dropdown visual layout;
- exact public Service page routes/slugs;
- exact Odoo processing model names;
- exact processing compatibility schema;
- exact pricing engine;
- exact Technical Review workflow;
- exact public product-navigation fields;
- Markets navigation decision;
- About navigation decision;
- Contact navigation decision.

---

# 30. Versioning Policy

This file is the first frozen baseline.

Future redesign decisions should be recorded in a new version, for example:

- Version 1.1
- Version 1.2
- Version 2.0

A new version should:

1. preserve the previous file;
2. identify newly frozen decisions;
3. explicitly identify any superseded frozen decision;
4. never silently rewrite architectural history.

---

# 31. Baseline Status

**Version 1.0 is FROZEN.**

The next Header/component decisions will be added through a new version rather than modifying this baseline invisibly.


---

# 32. Newly Frozen Decision in Version 1.1 — Industries Navigation

## 32.1 “بازارها” is superseded

The previously present top-level navigation label:

**بازارها**

is superseded by:

**صنایع**

This change is intentional and architectural, not merely cosmetic.

---

## 32.2 Canonical route

The canonical destination becomes:

`/industries`

The pre-launch `/markets` route must not become the canonical public route for this intent.

Because the current site has not yet been deployed, the preferred direction is to correct the route before launch rather than create avoidable SEO migration debt.

---

## 32.3 Purpose of the Industries section

The Industries section answers:

> Ahan Asa is suitable for which industries, project types, and use cases?

It is conceptually separate from:

- Product discovery;
- Processing/Services;
- Geographic/export markets;
- Buyer roles.

The conceptual separation is:

```text
PRODUCT
What material/product is required?

SERVICE
What processing/work is required?

INDUSTRY
For what industry / project / use case?
```

---

## 32.4 Header behavior

At Version 1.1:

```text
صنایع → /industries
```

remains a direct navigation link.

No Industries dropdown is introduced yet.

A dropdown may be considered later only when several substantive, real, independently valuable industry pages exist.

Placeholder or thin industry pages must not be created merely to populate navigation.

---

## 32.5 Industry taxonomy ownership

Industry taxonomy is primarily a Website/CMS content and use-case taxonomy.

It must not be treated as part of the Odoo commercial Product Master.

It may reference:

- Product Projection;
- Processing Projection;
- relevant use cases;
- buying guidance;
- FAQs;
- evidence/content.

Conceptually:

```text
Website Industry Taxonomy
        │
        ├── Product references → Public Product Projection
        └── Service references → Public Processing Projection
```

---

## 32.6 Industry is not Buyer Role

The following concepts are explicitly separate:

### Industry / Use Case
Examples:
- construction;
- steel fabrication;
- industrial manufacturing;
- infrastructure.

### Buyer Role
Examples:
- contractor;
- EPC;
- project owner;
- procurement manager;
- manufacturer.

Frozen rule:

> Industry and Buyer Role must not be modeled as the same taxonomy.

A buyer role may appear across multiple industries.

---

## 32.7 Industry is not Geographic Market

The term “Markets” may be used later for a separate geographic/export-market domain, for example:

- Iran;
- Iraq;
- Oman;
- GCC;
- other export regions.

That future concept must remain separate from Industries.

Frozen rule:

> Geographic Markets and Industries are different domains and must not share the same semantic route or taxonomy.

---

## 32.8 Current Header after Version 1.1

The frozen conceptual top-level Header is now:

```text
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
```

Where:

```text
محصولات → /products
خدمات → /services
صنایع → /industries
```

Products and Services retain their previously frozen hybrid-navigation architecture.

Industries remains a direct link with no dropdown at this stage.

---

# 33. Version 1.1 Status

**Version 1.1 is FROZEN.**

New decisions after this point must be recorded in Version 1.2 or a later version.

Version 1.0 remains preserved as the original frozen baseline.


---

# 34. Newly Frozen Decision in Version 1.2 — About Navigation

## 34.1 Header label and route

The top-level navigation item remains:

**درباره ما**

and links directly to:

`/about`

---

## 34.2 No dropdown

The About navigation item remains a simple direct link.

No dropdown, mega menu, team submenu, history submenu, mission submenu, or similar secondary navigation is introduced at this stage.

---

## 34.3 Role of the About page

`/about` is defined as the primary **Company + Trust Hub**.

Its purpose is to answer questions such as:

- Who is Ahan Asa?
- What is its real operating model?
- What role does it play between customers, suppliers, processors, and logistics providers?
- What responsibilities does Ahan Asa actually take in the transaction?
- What verified legal/company identity stands behind the brand?

---

## 34.4 Business-model transparency

The About page must clearly explain the real operating model.

Ahan Asa must not imply that partner-owned factories, equipment, processing facilities, inventory, or capabilities are company-owned if they are not.

The relationship between:

```text
Customer
   ↓
Ahan Asa
   ↓
Supplier / Processor / Logistics
```

should be presented truthfully and clearly where relevant.

---

## 34.5 Content ownership

About content belongs primarily to the Website/CMS content domain.

Odoo is not the source of truth for:

- About copy;
- company narrative;
- SEO content;
- explanatory sections;
- trust content;
- images.

Product and Processing projections may be referenced where useful, but they do not own the About page.

---

## 34.6 Verified identity only

Legal/company information displayed publicly must be verified.

Potential public information may include:

- brand identity;
- confirmed legal entity name;
- verified office information;
- verified contact information;
- verified registration/company identifiers where appropriate.

Unverified or assumed legal details must not be published.

---

## 34.7 Verified metrics only

Numbers such as:

- years of experience;
- number of customers;
- order volume;
- supplied tonnage;
- geographic coverage;
- number of projects;

must only be displayed if they are verified and defensible.

No approximate, invented, placeholder, or marketing-only metrics are permitted.

---

## 34.8 No generic mission/vision filler

Generic sections such as:

- “ماموریت ما”
- “چشم‌انداز ما”
- “ارزش‌های ما”

should not be used merely as conventional corporate filler.

Operational trust content is preferred, including:

- how procurement is managed;
- how suppliers/processors are selected;
- how processing is coordinated;
- how quotations are structured;
- how orders are followed through;
- what Ahan Asa is and is not responsible for.

---

## 34.9 Team content

No separate Team navigation item or Team dropdown is introduced.

A compact management/key-team section may be included inside `/about` if it materially improves trust.

A standalone Team page is not required at this stage.

---

## 34.10 About vs Contact

The domains remain distinct:

### About
Answers:

> Who are you and how do you work?

### Contact
Answers:

> How can I reach you or submit a request?

A brief legal/contact reference may appear in About, but `/about` must not replace `/contact`.

---

# 35. Current Header after Version 1.2

The current frozen conceptual top-level navigation is:

```text
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
```

Routes currently frozen:

```text
محصولات → /products
خدمات → /services
صنایع → /industries
درباره ما → /about
```

The Contact item remains to be fully re-audited and frozen in a subsequent version.

---

# 36. Version 1.2 Status

**Version 1.2 is FROZEN.**

Version 1.0 and Version 1.1 remain preserved as historical frozen baselines.
New decisions must be recorded in Version 1.3 or later.


---

# 37. Newly Frozen Decision in Version 1.3 — Contact Navigation & Direct Contact Utility

## 37.1 Header label and route

The top-level navigation item remains:

**تماس با ما**

and links directly to:

`/contact`

---

## 37.2 No dropdown

The Contact navigation item remains a simple direct link.

No dropdown, office submenu, WhatsApp submenu, email submenu, or contact-method mega menu is introduced.

---

## 37.3 Direct phone contact in Desktop Header

The Desktop Header should also expose the verified primary business phone number as a low-weight utility action.

The phone is not a second primary CTA.

Conceptually:

```text
[Navigation]        Phone        Language        [Primary RFQ CTA]
```

The phone number should use a direct `tel:` action.

---

## 37.4 Mobile direct contact

The Mobile Header should provide a compact phone action, preferably as a phone icon with an accessible label.

The full phone number does not need to consume permanent horizontal space in the mobile Header.

---

## 37.5 WhatsApp and email are not Header utilities

WhatsApp and email should not be added as permanent Header actions at this stage.

They may be exposed on:

- `/contact`;
- contextually relevant conversion areas;
- Footer;
- other approved contact surfaces.

This avoids turning the Header into a general communications toolbar.

---

## 37.6 Contact and RFQ are separate intents

The architecture explicitly separates:

```text
Procurement / RFQ intent
```

from:

```text
General contact / inquiry intent
```

A general inquiry must not automatically be treated as a steel procurement RFQ.

Conceptually:

```text
Contact Intent
    ├── Procurement / RFQ
    │       ↓
    │      RFQ
    │
    └── General Inquiry
            ↓
          CRM / Contact
```

Exact backend implementation is not frozen in this version.

---

## 37.7 No duplicate generic contact form by default

The Contact page should not automatically contain a second generic form that substantially duplicates the procurement/RFQ form.

Primary commercial requests should use the main RFQ/request workflow.

General contact can initially be handled through verified direct contact methods unless a separate general-inquiry workflow is later justified.

---

## 37.8 Central Verified Business Identity

Verified business contact information should come from one centrally managed source.

This source may include:

- brand name;
- verified legal name;
- phone;
- email;
- address;
- WhatsApp;
- working hours;
- approved social URLs.

Consumers may include:

```text
Header
Footer
Contact
About
Structured Data
```

Frozen rule:

> Contact/business identity information must not be independently duplicated and maintained in multiple frontend components.

Exact implementation technology is not frozen.

---

## 37.9 Structured data consistency

Organization/contact structured data must consume the same verified business identity source used by the public UI.

Telephone, email, address, and identity details must not diverge between:

- Header;
- Contact page;
- Footer;
- About;
- structured data.

---

## 37.10 Contact page information hierarchy

The Contact page should make direct contact information discoverable before requiring the user to inspect a long form.

The previously approved layout direction remains:

```text
Direct Contact / Intro
        ↓
Full-width RFQ / Request Component
        ↓
Next Steps
        ↓
Main Office
```

The Main Office component remains after Next Steps.

---

## 37.11 Phone is secondary to the primary procurement CTA

The Header phone is a human-trust and direct-contact utility.

The primary procurement/RFQ action remains visually dominant.

The Header should not use two visually equal CTA buttons for:

- Call;
- RFQ.

---

## 37.12 Primary CTA wording remains open

The exact text of the primary Header CTA is **not frozen in Version 1.3**.

Because the platform now supports broader needs including:

- material purchase;
- material + processing;
- processing only;
- drawing-based fabricated parts;

the previous phrase **ارسال لیست خرید** must be reviewed separately.

---

# 38. Current Header after Version 1.3

The frozen conceptual Header structure is now:

```text
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
```

Utility/conversion layer:

```text
Verified Phone
Language Selector
Primary RFQ / Request CTA
```

The exact Primary CTA wording remains the next item for review.

---

# 39. Version 1.3 Status

**Version 1.3 is FROZEN.**

Versions 1.0 through 1.2 remain preserved as historical frozen baselines.
New decisions must be recorded in Version 1.4 or later.


---

# 40. Newly Frozen Decision in Version 1.4 — Primary Header CTA

## 40.1 Primary CTA remains “ارسال لیست خرید”

The primary global Header CTA remains:

**ارسال لیست خرید**

The previously discussed alternative **درخواست قیمت** is not adopted as the global primary CTA.

---

## 40.2 CTA route

The CTA continues to lead to the primary request/RFQ entry route:

`/request`

Exact internal form-flow implementation may evolve in later phases.

---

## 40.3 “Purchase List” describes the entry concept, not the input format

The phrase **ارسال لیست خرید** must not be interpreted as limiting the customer to a typed table.

The future request-entry architecture may accept inputs such as:

- manual structured entry;
- Excel;
- PDF;
- photo of a purchase list;
- scanned purchase list;
- drawing;
- image;
- other approved document formats;
- future voice input.

These inputs may later be transformed into a structured RFQ.

---

## 40.4 Future AI-assisted extraction

The architecture direction explicitly supports future AI-assisted intake.

Conceptually:

```text
Customer Input
   ↓
Photo / Scan / File / Text / Drawing / Voice
   ↓
AI Extraction / Interpretation
   ↓
Structured Draft RFQ
   ↓
Customer Review / Confirmation
   ↓
RFQ
   ↓
Odoo
```

AI-generated extraction must not silently become a confirmed order without user review/confirmation where interpretation is required.

Exact AI implementation is not frozen in this version.

---

## 40.5 Services and drawing-based requests remain supported

Keeping the CTA label **ارسال لیست خرید** does not remove support for:

- processing-only requests;
- material + processing;
- fabricated parts;
- drawing-based requests;
- requests where the appropriate processing method is unknown.

The `/request` experience must eventually support these broader request types even though the global CTA retains the simpler purchase-list label.

---

## 40.6 Contextual CTAs may differ

The global Header CTA is frozen as:

**ارسال لیست خرید**

Context-specific areas may use more specific actions when appropriate, for example:

- ارسال نقشه;
- ثبت درخواست خدمات;
- ارسال فایل;
- بررسی فنی.

These contextual actions may still resolve into the same RFQ/request domain.

---

## 40.7 Phone remains secondary

The previously frozen hierarchy remains:

```text
Primary:
ارسال لیست خرید

Secondary utility:
Phone / direct contact
```

The phone must not visually compete with the primary CTA.

---

## 40.8 Localization wording is not fully frozen

The Persian primary CTA is frozen.

Exact English and Arabic CTA wording remains subject to a later localization/UX review and should not be assumed to be a literal translation.

---

# 41. Current Header after Version 1.4

The current frozen conceptual Header is:

```text
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
```

Utility/conversion layer:

```text
Verified Phone
Language Selector
[ ارسال لیست خرید ]
```

The next Header item to review is the **Language Selector**.

---

# 42. Version 1.4 Status

**Version 1.4 is FROZEN.**

Versions 1.0 through 1.3 remain preserved as historical frozen baselines.
New decisions must be recorded in Version 1.5 or later.


---

# 43. Newly Frozen Decision in Version 1.5 — Language Selector

## 43.1 Supported public languages

The website language selector supports:

- فارسی
- English
- العربية

Language names should be displayed in their own native writing system.

---

## 43.2 Desktop behavior

Desktop uses a compact current-language selector with a disclosure/dropdown.

Example in Persian:

```text
فارسی ▾
```

Dropdown:

```text
فارسی
English
العربية
```

The selector is a utility control, not a primary CTA.

---

## 43.3 No country flags

Country flags are not used to represent languages.

Frozen rule:

> Language and country must not be conflated in Header navigation.

---

## 43.4 Locale-specific URLs

Public localized content should use explicit locale URLs.

Conceptually:

```text
/fa/...
/en/...
/ar/...
```

The exact routing implementation remains governed by the website localization architecture.

---

## 43.5 Preserve the current page where possible

Changing language should preserve the user's current content context whenever an equivalent localized route exists.

Example:

```text
/fa/products/...
↕
/en/products/...
↕
/ar/products/...
```

The selector should not unnecessarily send users back to the homepage.

---

## 43.6 Hreflang and language metadata

Localized equivalents should be connected with appropriate `hreflang` metadata.

Document language/direction should correspond to locale:

```text
fa → lang="fa", dir="rtl"
ar → lang="ar", dir="rtl"
en → lang="en", dir="ltr"
```

---

## 43.7 No forced IP-based locale redirect

The website must not force a language solely based on visitor IP/geographic location.

Browser language may be used as a hint for first-entry behavior, but it must not override an explicitly selected localized URL.

---

## 43.8 URL remains authoritative

If a user opens an explicit locale URL, that URL determines the language of that request.

Stored language preference may assist future entry/navigation but must not contradict an explicit URL.

---

## 43.9 Shared Header implementation

The site must not maintain separate manually divergent Header implementations for FA, EN, and AR.

One shared Header architecture should support both RTL and LTR layouts using locale data and logical layout behavior.

---

## 43.10 Mobile behavior

The mobile Header does not require a permanent language icon.

Language selection should live inside the mobile navigation drawer/menu.

Conceptually:

```text
زبان
فارسی
English
العربية
```

---

## 43.11 Accessibility

The language selector must support:

- keyboard operation;
- visible focus;
- appropriate accessible naming;
- disclosure state;
- Escape-to-close where applicable;
- correct focus return;
- language metadata on destination links where useful.

---

# 44. Current Frozen Header after Version 1.5

Conceptually:

```text
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
```

Utility/conversion layer:

```text
Verified Phone
Current Language ▾
[ ارسال لیست خرید ]
```

Mobile:

```text
Logo     Phone     Menu
```

with language selection inside the menu drawer.

---

# 45. Version 1.5 Status

**Version 1.5 is FROZEN.**

Versions 1.0 through 1.4 remain preserved as historical frozen baselines.
New decisions must be recorded in Version 1.6 or later.


---

# 46. Newly Frozen Decision in Version 1.6 — Header Geometry & Visual Shell

## 46.1 Desktop header height

The default desktop Header height is frozen at:

**80px**

This is the primary desktop shell height.

---

## 46.2 Mobile header height

The mobile Header height is frozen at:

**72px**

---

## 46.3 Compact sticky height

A compact sticky/scrolled desktop height of approximately:

**68px**

remains the intended target, but its exact scroll behavior is deferred to the next Header behavior review.

---

## 46.4 Header logo

The Header uses the approved official horizontal Ahan Asa logo/lockup only.

No explanatory tagline or secondary descriptive line is placed beside or beneath the Header logo.

---

## 46.5 Logo size

Desktop logo visual width should target approximately:

**140px**

with optical adjustment within the previously accepted approximate range:

**120–152px**

The exact rendered width should be finalized against the real SVG/logo lockup rather than treated as an arbitrary fixed branding number.

---

## 46.6 Global container

The Header aligns to the same global content container used by the rest of the website.

Target maximum content width:

**1280px / 80rem**

The Header content must not be independently stretched from viewport edge to viewport edge on large displays.

---

## 46.7 Desktop layout zones

The desktop Header is divided conceptually into three zones:

```text
Brand | Primary Navigation | Utilities + Primary CTA
```

For Persian/Arabic RTL:

```text
Logo → Navigation → Phone → Language → Primary CTA
```

For English LTR the shared component mirrors logically.

Navigation must be optically balanced through normal Grid/Flex layout rather than absolutely centered to the viewport.

---

## 46.8 Header surface

The primary Header surface is frozen as:

**White**

Warm cream remains available elsewhere in the design system but is not the primary Header background.

---

## 46.9 Border and shadow direction

The default Header uses a subtle bottom boundary.

Heavy shadows, glassmorphism, decorative blur, and visually dominant elevation are not part of the Header direction.

Exact border/shadow tokens remain implementation-level tuning.

---

## 46.10 Navigation typography

Primary navigation should target approximately:

**15px, medium weight**

Navigation items should not all be bold.

Final typography must use the project design tokens and optical testing with the approved font.

---

## 46.11 Navigation spacing

Navigation spacing should begin around:

**24–28px gap**

with final optical tuning based on actual localized labels.

This is a design target rather than a requirement to hardcode raw pixel values outside the design system.

---

## 46.12 Primary CTA geometry

The global Header CTA remains:

**ارسال لیست خرید**

Target height:

**48px**

The CTA is the only visually dominant button in the desktop Header.

---

## 46.13 Phone utility

The verified phone number is presented as a low-weight text utility with phone affordance.

Example concept:

```text
☎ 03135134
```

Mixed-direction phone content must be isolated correctly in RTL layouts.

---

## 46.14 Language utility

The current-language selector is a text utility, not a pill/button competing with the primary CTA.

Example:

```text
فارسی ▾
```

---

## 46.15 Mobile shell

The frozen mobile Header shell is:

```text
Logo     Phone     Menu
```

The primary CTA does not need to remain permanently visible inside the narrow mobile top bar.

The primary CTA must be clearly available inside the mobile navigation drawer.

Tablet/broader responsive behavior may display the CTA when layout space safely permits.

---

# 47. Current Frozen Header after Version 1.6

Desktop conceptual structure:

```text
[Logo]
محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما
Phone
Language ▾
[ ارسال لیست خرید ]
```

Primary shell:

```text
Height: 80px
Max content width: 1280px
Surface: White
Primary CTA height: 48px
```

Mobile conceptual structure:

```text
[Logo]    [Phone]    [Menu]
```

with language and primary CTA available within the drawer.

---

# 48. Version 1.6 Status

**Version 1.6 is FROZEN.**

Versions 1.0 through 1.5 remain preserved as historical frozen baselines.

The next Header review covers:

- sticky/scrolled behavior;
- active navigation state;
- hover/focus states;
- dropdown/disclosure interaction behavior.


---

# 49. Newly Frozen Decision in Version 1.7 — Sticky, Scroll, Hover & Active Behavior

## 49.1 Sticky Header

The Header remains visible while scrolling.

Target behavior:

```text
position: sticky
top: 0
```

The Header must not hide on downward scroll.

---

## 49.2 Desktop scroll states

Default desktop state:

```text
Height: 80px
Surface: White
Boundary: subtle bottom border
```

Compact scrolled state:

```text
Height: approximately 68px
Surface: White
Boundary: slightly stronger subtle border / very light shadow
```

The Header should transition into the compact state after a modest amount of scroll rather than immediately at the first pixel.

Exact scroll threshold remains implementation-level tuning.

---

## 49.3 Logo behavior on scroll

The Header logo may reduce modestly in size when the compact state is activated.

Target relationship:

```text
Default: ~140px
Scrolled: ~128px
```

The transition must remain restrained and non-decorative.

---

## 49.4 No dramatic scroll effects

The Header must not use:

- hide-on-scroll behavior;
- strong blur;
- glassmorphism;
- dramatic background-color changes;
- large shadows;
- decorative logo animation.

---

## 49.5 Active navigation state

The active top-level navigation item should use:

- slightly stronger text emphasis;
- a thin copper underline/accent.

The active state must not become a pill, large filled tab, or button-like block.

`aria-current="page"` should be used where applicable.

---

## 49.6 Hover state

Hover treatment should remain subtle.

It may use a restrained text-color change or similar low-weight cue.

Hover must remain visually distinguishable from the persistent active-route state.

---

## 49.7 Products and Services remain hybrid controls

For both Products and Services:

- the label remains a real navigation link;
- the adjacent chevron/disclosure control opens or closes the submenu.

Conceptually:

```text
محصولات        ▾
   │           │
 /products   toggle
```

and:

```text
خدمات          ▾
   │           │
 /services   toggle
```

---

## 49.8 Desktop submenu opening methods

Desktop submenu interaction must support:

- hover as a convenience;
- click/tap on the disclosure control;
- keyboard activation.

Hover must not be the only way to access the submenu.

---

## 49.9 Keyboard behavior

The dropdown/disclosure interaction must support:

- Tab navigation;
- Enter / Space activation of the disclosure control;
- Escape to close;
- focus restoration to the disclosure control after Escape.

Visible focus states are mandatory.

---

## 49.10 Dropdown closing behavior

A submenu should close on:

- Escape;
- outside click;
- successful navigation/route change;
- selection of a submenu link;
- appropriate focus exit.

Pointer movement from the top-level control into the submenu must not cause immediate flicker.

A short pointer-exit tolerance/delay may be used.

---

## 49.11 Mobile interaction

Mobile uses accordion/disclosure behavior.

No hover interaction is used on mobile.

Conceptually:

```text
محصولات        +
خدمات          +
صنایع
درباره ما
تماس با ما
```

The Products and Services labels remain navigation links while the adjacent disclosure control expands or collapses their children.

---

## 49.12 Reduced motion

Header transitions and submenu interactions must respect `prefers-reduced-motion`.

---

# 50. Current Header Behavior after Version 1.7

Desktop:

```text
Sticky
80px default
68px compact scrolled
White surface
Subtle active underline
Hybrid Products/Services links + disclosure
Hover + click + keyboard submenu access
```

Mobile:

```text
Logo + Phone + Menu
Products/Services as link + accordion toggle
No hover
```

---

# 51. Version 1.7 Status

**Version 1.7 is FROZEN.**

Versions 1.0 through 1.6 remain preserved as historical frozen baselines.

The next review covers the visual design of the Products and Services dropdown panels.


---

# 52. Newly Frozen Decision in Version 1.8 — Products & Services Dropdown Visual Design

## 52.1 Dropdown type

Products and Services use compact floating navigation panels.

They do not use full-width mega menus.

---

## 52.2 Products panel

The Products panel may use one or two columns depending on the number and length of published navigation families.

The layout must adapt to data rather than assume a fixed hardcoded family count.

---

## 52.3 Services panel

The Services panel is expected to remain simpler and usually use one column for its current top-level public service groups.

---

## 52.4 No decorative media inside Header dropdowns

Header dropdowns do not include:

- product thumbnails;
- service illustrations;
- large icons;
- marketing imagery;
- multi-line promotional descriptions;
- decorative badges.

The dropdown exists for fast navigation, not merchandising.

---

## 52.5 Item content

A normal dropdown item should primarily contain the public navigation label.

Small hierarchy/disclosure affordances may be used later if a justified deeper navigation level is introduced.

Large descriptive copy belongs on landing pages, not in the Header dropdown.

---

## 52.6 Public Projection remains the data source

Products dropdown content comes from the Public Product Projection.

Services dropdown content comes from the Public Processing Projection.

Frontend code must not maintain independent hardcoded commercial lists.

---

## 52.7 Navigation visibility controls scale the Header

If the total public product/service catalog grows, the Header must not automatically expose every available record.

Published navigation controls such as `show_in_navigation` or equivalent are used to determine which top-level families are appropriate for Header discovery.

Exact field names remain implementation-level.

---

## 52.8 No live fetch on dropdown open

Opening a Header dropdown must not trigger a live dependency on:

- Odoo;
- public API;
- database query initiated by hover;
- asynchronous menu loading.

Target behavior:

```text
Server-rendered / cached navigation data
        ↓
Header HTML/state already available
        ↓
Dropdown opens immediately
```

---

## 52.9 No loading UI inside Header dropdowns

No spinner or skeleton is shown inside Products/Services Header dropdowns under normal operation.

---

## 52.10 Empty/failure-safe behavior

If no valid child navigation data is available:

- the top-level Products or Services link remains usable;
- the disclosure chevron/toggle should not expose an empty broken menu.

Conceptually:

```text
No children → direct top-level link only
```

---

## 52.11 “View all” footer link

Each dropdown ends with a distinct low-weight navigation link:

- مشاهده همه محصولات → `/products`
- مشاهده همه خدمات → `/services`

This is an emphasized text link, not a second large copper CTA.

---

## 52.12 Panel visual treatment

The panel uses:

- white surface;
- subtle border;
- restrained radius;
- very light shadow/elevation;
- clean spacing;
- no glassmorphism;
- no heavy blur.

Exact token values remain part of implementation/design-system tuning.

---

## 52.13 RTL/LTR alignment

Dropdown positioning and alignment must use logical layout behavior and support both RTL and LTR.

Hardcoded physical left/right assumptions should be avoided.

The panel must also avoid viewport overflow through appropriate collision/position handling.

---

## 52.14 Item states

Dropdown items support:

- subtle hover state;
- clearly visible keyboard focus;
- restrained active/current indication where applicable.

Keyboard focus must be more explicit than a mouse-only hover cue.

---

# 53. Current Dropdown Direction after Version 1.8

Products:

```text
Compact panel
1–2 columns
Data-driven public product families
No images
No marketing copy
View all products link
```

Services:

```text
Compact panel
Usually 1 column
Data-driven public service groups
No technical-operation dump
View all services link
```

---

# 54. Version 1.8 Status

**Version 1.8 is FROZEN.**

Versions 1.0 through 1.7 remain preserved as historical frozen baselines.

Two Header review items remain:

1. Mobile navigation drawer
2. Final responsive/accessibility/acceptance criteria


---

# 55. Newly Frozen Decision in Version 1.9 — Mobile Navigation Drawer

## 55.1 Drawer direction

The mobile navigation drawer opens from logical inline-start:

- RTL (Persian/Arabic): from the right;
- LTR (English): from the left.

The implementation must remain shared and direction-aware rather than using separate locale-specific components.

---

## 55.2 Drawer width

Target width:

```text
min(88vw, 360px)
```

A full-screen drawer is not the default.

Very small viewports may use a broader/full-width treatment if required for usability.

---

## 55.3 Drawer content order

The frozen content hierarchy is:

```text
Logo / Close

Primary Navigation

Phone

Language selection

Primary CTA
```

Conceptually:

```text
[Logo]                  [Close]

محصولات                 +
خدمات                   +
صنایع
درباره ما
تماس با ما

────────────

☎ Verified Phone

────────────

فارسی
English
العربية

────────────

[ ارسال لیست خرید ]
```

---

## 55.4 Products and Services remain hybrid controls

For mobile Products and Services:

- the text label remains a direct link;
- the adjacent disclosure control expands/collapses child navigation.

No hover behavior exists on mobile.

---

## 55.5 Accordion depth

Mobile drawer navigation exposes at most one child navigation level.

Deep trees such as:

```text
Products
  → Rebar
    → Grade
      → Size
```

are not allowed inside the Header drawer.

Deeper discovery belongs to catalog/service pages.

---

## 55.6 Accordion open behavior

Preferred behavior is a single-open accordion model:

- opening Products closes Services;
- opening Services closes Products.

This keeps the drawer compact and prevents excessive vertical growth.

---

## 55.7 Context-aware expansion

When the current route is inside a child section, the relevant parent accordion may open automatically when the drawer opens.

Example:

```text
/products/rebar
→ Products section may open
```

---

## 55.8 CTA placement

The primary CTA remains:

**ارسال لیست خرید**

and should remain prominently available at the bottom of the drawer.

Preferred direction:

- drawer content scrolls independently;
- CTA remains sticky/fixed within the drawer bottom area when technically safe.

---

## 55.9 Phone utility

The verified primary phone appears inside the drawer as a direct `tel:` action.

This duplicates the quick phone affordance in the mobile top bar intentionally.

---

## 55.10 Language selection

Mobile does not use a nested language dropdown.

All supported languages are displayed directly:

- فارسی
- English
- العربية

The active language is visibly indicated.

Country flags are not used.

---

## 55.11 Body scroll lock

When the drawer is open, background document scrolling must be locked.

The page behind the drawer must not continue to scroll independently.

---

## 55.12 Focus management

The open drawer must implement appropriate modal-navigation focus behavior:

- focus remains within the drawer;
- Escape closes the drawer;
- after close, focus returns to the menu trigger;
- background content is not keyboard-interactive while the drawer is open.

---

## 55.13 Close triggers

The drawer closes on:

- close button;
- Escape;
- overlay click/tap;
- navigation selection;
- route change.

---

## 55.14 Overlay

The drawer uses a restrained dark overlay behind the panel.

The overlay exists to provide visual separation and enable tap-to-close.

Heavy blur/glass effects are not used.

---

## 55.15 Motion

Drawer motion uses a short restrained slide transition, approximately:

**150–200ms**

where motion is allowed.

`prefers-reduced-motion` must be respected.

No bounce/spring/decorative motion is required.

---

## 55.16 Touch targets

Interactive controls must provide approximately:

**44px minimum touch target**

even where the visible icon itself is smaller.

This includes:

- phone;
- menu trigger;
- close;
- accordion toggles;
- language links;
- CTA.

---

## 55.17 Visual treatment

The mobile drawer continues the Header design system:

- white surface;
- navy typography;
- restrained copper accents;
- subtle dividers;
- no decorative navigation cards;
- no unnecessary icons;
- no promotional imagery;
- no gradients.

---

# 56. Current Mobile Header after Version 1.9

Top bar:

```text
Logo     Phone     Menu
```

Drawer:

```text
Primary Navigation
Products/Services accordion
Phone
Direct language choices
Sticky primary CTA
```

---

# 57. Version 1.9 Status

**Version 1.9 is FROZEN.**

Versions 1.0 through 1.8 remain preserved as historical frozen baselines.

One Header review item remains:

**Final Responsive / Accessibility / Acceptance Criteria Gate**


---

# 58. Final Header Acceptance Criteria — Version 2.0

The Header is considered fully approved only if all applicable gates below pass.

## 58.1 Required desktop structure

Desktop must contain:

```text
Logo

محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما

Verified Phone
Language Selector
[ ارسال لیست خرید ]
```

Frozen routes:

```text
محصولات → /products
خدمات → /services
صنایع → /industries
درباره ما → /about
تماس با ما → /contact
ارسال لیست خرید → /request
```

No new primary navigation item may be introduced without a new approved architecture decision.

---

## 58.2 Product data gate

Commercial product navigation must ultimately come from:

```text
Odoo
↓
Public Product Projection
↓
Website Header
```

A frontend-maintained commercial product-family master is prohibited.

A commercial product list hardcoded into the Header or independent frontend configuration is a FAIL.

---

## 58.3 Services data gate

Commercial processing/service navigation must ultimately come from:

```text
Odoo Processing Domain
↓
Public Processing Projection
↓
Website Header
```

The Header must not become the source of truth for commercial services.

---

## 58.4 No synchronous Odoo dependency

Public Header rendering must not require a live synchronous Odoo response.

PASS:

```text
Odoo
↓ sync
Read Model / Cache
↓
Header
```

FAIL:

```text
Page request
↓
Live Odoo call
↓
Header render
```

---

## 58.5 Desktop geometry gate

Target desktop geometry:

```text
Default Header height: 80px
Compact scrolled height: ~68px
Global max content width: 1280px / 80rem
Primary CTA height: 48px
Default logo width: ~140px
Compact logo width: ~128px
```

Final logo sizing remains optically tuned against the real approved lockup.

---

## 58.6 Locale layout gate

The Header must pass in:

- Persian;
- Arabic;
- English.

No locale may create:

- unintended wrapping;
- overlapping controls;
- clipped CTA;
- logo collision;
- phone/language collision;
- horizontal overflow.

---

## 58.7 RTL / LTR gate

Persian and Arabic use RTL.

English uses LTR.

The same Header architecture must support both directions.

Direction-aware layout should use logical CSS/layout behavior rather than unnecessary duplicated left/right implementations.

---

## 58.8 Language selector gate

Supported labels:

- فارسی
- English
- العربية

Country flags are not used.

Changing language should preserve the current equivalent route whenever possible.

Localized pages should expose correct language/direction metadata and appropriate hreflang relationships.

---

## 58.9 Products / Services hybrid-control gate

For both Products and Services:

- the text label remains a real navigation link;
- the adjacent disclosure control independently opens the submenu.

If the label becomes only a button and no longer provides direct `/products` or `/services` navigation, the implementation FAILS.

---

## 58.10 Dropdown gate

Header dropdowns must:

- remain compact;
- not become full-width mega menus;
- contain no promotional imagery;
- contain no large decorative icons;
- contain no long marketing copy;
- contain no loading spinner or skeleton;
- not fetch data from Odoo/API on hover/open.

Products may use 1–2 columns depending on valid published navigation data.

Services normally use a simpler one-column structure.

---

## 58.11 Dropdown fallback gate

If no valid child navigation is available:

- top-level link remains functional;
- disclosure control is removed/disabled appropriately;
- no empty dropdown is shown.

---

## 58.12 Sticky behavior gate

Header remains sticky.

It must not:

- disappear on downward scroll;
- apply strong blur;
- switch to dramatic alternate colors;
- create a heavy shadow;
- cause distracting layout instability.

Compact transition should remain restrained.

---

## 58.13 Active navigation gate

Active route uses:

- slightly stronger text;
- restrained copper underline/accent;
- semantic current-route metadata such as `aria-current` where applicable.

No large pill, filled tab, or button-style active treatment.

---

## 58.14 Keyboard gate

Core Header navigation must be fully usable without a mouse.

Required support includes:

- Tab;
- Enter;
- Space where appropriate;
- Escape;
- visible focus.

Dropdown/disclosure controls must be keyboard-accessible.

Escape must close open menu state and restore focus appropriately.

---

## 58.15 Focus visibility gate

Visible focus is mandatory for:

- primary nav links;
- disclosure controls;
- phone;
- language selector;
- primary CTA;
- mobile menu trigger;
- mobile close button;
- accordion controls;
- child links.

Hidden or effectively invisible keyboard focus is a FAIL.

---

## 58.16 Mobile top-bar gate

Frozen mobile top bar:

```text
Logo     Phone     Menu
```

The narrow mobile bar does not permanently include:

- language selector;
- full primary CTA;
- WhatsApp;
- email;
- search.

---

## 58.17 Mobile drawer gate

Mobile drawer must support:

- RTL opening from the right;
- LTR opening from the left;
- target width around `min(88vw, 360px)`;
- background scroll lock;
- appropriate focus containment;
- Escape close;
- overlay close;
- route-change close;
- focus restoration to trigger.

---

## 58.18 Mobile Products / Services gate

Products and Services remain:

```text
Label = Link
Adjacent control = Accordion toggle
```

Only one child navigation level is permitted inside Header mobile navigation.

SKU, size, grade, and deep technical trees inside the Header drawer are a FAIL.

---

## 58.19 Touch-target gate

Interactive mobile controls must provide approximately 44×44px minimum hit area.

This applies especially to:

- phone;
- hamburger/menu;
- close;
- accordion toggles;
- language choices;
- primary CTA.

---

## 58.20 Mobile CTA gate

The primary CTA remains:

**ارسال لیست خرید**

It must remain clearly accessible within the mobile drawer.

Preferred treatment is a sticky drawer-bottom CTA when it does not create layout/accessibility problems.

---

## 58.21 Phone gate

Phone data comes from the Central Verified Business Identity source.

Header must not maintain an independent phone number.

Direct phone action must use a correct `tel:` target.

---

## 58.22 Business identity consistency gate

The following public business-identity data should come from a shared verified source:

- phone;
- email;
- address;
- legal identity;
- approved WhatsApp contact;
- related structured-data identity fields.

Header, Footer, About, Contact, and structured data must not contradict each other.

---

## 58.23 Performance gate

The Header must avoid unnecessary runtime weight.

The implementation should not require:

- heavy animation framework solely for Header behavior;
- oversized mega-menu dependency;
- live Odoo calls;
- unnecessary repeated layout measurement;
- excessive scroll-listener work.

Header interactions should remain lightweight.

---

## 58.24 Layout-shift gate

Sticky/compact transition must not create disruptive layout shift.

Logo intrinsic dimensions/aspect ratio should be defined.

The Header must not visibly jump while loading.

---

## 58.25 Reduced-motion gate

Header, drawer, and submenu transitions must respect:

`prefers-reduced-motion`

Decorative motion must be reduced or removed where requested by the user environment.

---

## 58.26 Responsive breakpoint gate

Breakpoints must be driven by actual content fit rather than blindly relying on a framework default.

The Header must enter compact/mobile navigation before localized content overlaps.

English label length must be considered during breakpoint selection.

---

## 58.27 Horizontal-overflow gate

Header must not cause horizontal document scrolling at common viewport widths including approximately:

```text
320
360
375
390
430
768
1024
1280
1440
```

for FA, AR, and EN.

---

## 58.28 Content-failure gate

Header must never visibly expose:

- `undefined`;
- raw translation keys;
- placeholder text;
- empty broken dropdowns;
- fake contact data;
- loading copy.

Graceful fallback is required when optional projection data is unavailable.

---

## 58.29 Semantic HTML gate

Expected semantic structure includes appropriate use of:

```html
<header>
<nav>
<a>
<button>
```

Navigation links must remain anchors/links.

Interactive disclosure actions must use proper controls.

Clickable generic `<div>` elements must not replace semantic navigation controls.

---

## 58.30 Visual-character gate

The Header must visually communicate:

**Premium Industrial B2B**

The Header should not resemble:

- consumer retail e-commerce;
- SaaS dashboard;
- generic corporate template;
- glassmorphism UI;
- marketplace merchandising mega menu.

Frozen design direction:

```text
White surface
Navy typography
Restrained copper accents
One dominant primary CTA
```

---

# 59. Header Final Approval

When all applicable Version 2.0 acceptance criteria pass:

**HEADER = APPROVED / FROZEN**

The Header must not be reopened for subjective visual preference alone.

A frozen Header decision may be revised only when a material reason exists, such as:

- new business requirement;
- architecture change;
- validated usability problem;
- accessibility failure;
- localization issue;
- performance issue;
- data-model change;
- regulatory/legal requirement.

Any such revision must be explicitly versioned.

---

# 60. Final Frozen Header — Version 2.0

## Desktop

```text
[Official Ahan Asa Logo]

محصولات ▾
خدمات ▾
صنایع
درباره ما
تماس با ما

Verified Phone
Current Language ▾
[ ارسال لیست خرید ]
```

## Mobile top bar

```text
Logo     Phone     Menu
```

## Mobile drawer

```text
Products link + accordion
Services link + accordion
Industries
About
Contact
Phone
Direct language choices
[ ارسال لیست خرید ]
```

---

# 61. Historical Checkpoint — Version 2.0 — SUPERSEDED

**Historical checkpoint:** HEADER VERSION 2.0 WAS FULLY FROZEN AND APPROVED.

Versions 1.0 through 2.0 remain preserved for architectural history.

This checkpoint is superseded by the Version 2.1 hardening rules below.


---

# 62. Version 2.1 — Consolidated Accessibility, UX & Conversion Hardening

Version 2.1 reviews the consolidated improvement backlog against the already-frozen Header architecture.

It does **not** reopen:

- the five top-level navigation items;
- their frozen routes;
- the Products / Services hybrid link + disclosure pattern;
- the 80px / ~68px / 72px Header geometry;
- the Public Product / Processing Projection architecture;
- the Primary CTA wording;
- the mobile drawer hierarchy;
- the global container width.

This version adds explicit implementation contracts where ambiguity could create accessibility, UX, SEO, or interaction inconsistency.

---

# 63. Disclosure Navigation Semantics

## 63.1 Required pattern

Products and Services use the **Disclosure Navigation** pattern for ordinary website navigation.

The adjacent chevron control must be a real button.

Conceptually:

```html
<a href="/products">محصولات</a>

<button
  type="button"
  aria-expanded="false"
  aria-controls="products-nav-panel"
>
  ...
</button>
```

The same architecture applies to Services.

---

## 63.2 Prohibited ARIA menu semantics

Typical Header navigation must NOT use:

```text
role="menu"
role="menubar"
role="menuitem"
```

unless a future implementation intentionally adopts the full application-style Menu/Menubar interaction model.

For the current Header, that complexity is neither required nor approved.

---

## 63.3 Disclosure state

Required:

```text
aria-expanded="false|true"
aria-controls="<panel-id>"
```

`aria-haspopup` is not required for the current Disclosure Navigation pattern.

The visual chevron state must remain synchronized with `aria-expanded`.

---

## 63.4 Accessible name for the chevron button

The icon-only disclosure button must have a localized accessible name.

Preferred stable-name direction:

```text
FA: گزینه‌های بیشتر محصولات
FA: گزینه‌های بیشتر خدمات

EN: More product navigation
EN: More service navigation

AR: localized equivalent
```

The expanded/collapsed state is already communicated programmatically by `aria-expanded`.

A dynamic “open/close” accessible label MAY be used, but it is not required and must never conflict with the `aria-expanded` state.

A nameless icon-only button is a FAIL.

---

## 63.5 Exact-page aria-current

`aria-current="page"` is used only on the link that represents the exact current page.

A parent section may receive a visual active indication for section context, but it must not receive a false `aria-current="page"` merely because a child route is active.

---

# 64. Mobile Drawer Modal Semantics

The already-frozen focus containment, body scroll lock, Escape close, overlay close, and focus restoration remain mandatory.

Version 2.1 makes the modal semantics explicit.

---

## 64.1 Drawer container

The mobile drawer must behave as a modal navigation surface.

Preferred implementation choices:

```text
native <dialog>
```

or:

```text
role="dialog"
aria-modal="true"
accessible dialog label
```

The navigation itself remains semantic `<nav>` content inside that modal surface.

---

## 64.2 Initial focus

When the drawer opens, focus must move into the drawer.

Preferred initial focus:

- Close button; or
- another deliberately selected first meaningful control.

Do not leave keyboard focus on an interactive element behind the overlay.

---

## 64.3 Background inertness

While the modal drawer is open, background page content must not remain interactive.

Preferred modern implementation:

```text
inert
```

or an equivalent validated mechanism.

This complements the already-frozen body scroll lock.

---

## 64.4 Close and focus return

On:

- Escape;
- Close button;
- overlay dismissal;
- route selection / route change;

the drawer closes and focus returns to the menu trigger when the user remains on the same document.

---

# 65. Skip-to-Main-Content Gate

Every normal public page must provide a mechanism to bypass repeated Header/navigation content.

Preferred implementation:

```html
<a class="skip-link" href="#main-content">
  Skip to main content
</a>

<main id="main-content">
```

Localized visible wording is required for FA / AR / EN.

The Skip Link:

- must be among the earliest keyboard focus targets;
- may be visually hidden at rest;
- must become clearly visible on keyboard focus;
- must move focus/navigation to the main content target.

A Header implementation that forces keyboard users through the entire repeated navigation on every page without a bypass mechanism FAILS the accessibility gate.

---

# 66. Navigation Landmark Naming

Multiple navigation landmarks are named by **purpose**, not by device type.

Preferred conceptual labels:

```text
Primary navigation
Language navigation / language selection
Footer navigation
```

Do NOT rely on labels such as:

```text
Desktop navigation
Mobile navigation
```

as the primary semantic distinction.

If responsive desktop and mobile versions represent the same Primary Navigation:

- only the currently active/visible version should participate in the accessibility tree;
- equivalent navigation landmarks may use the same purpose-based label.

Different simultaneous navigation regions must have distinguishable purpose-based labels.

---

# 67. Contrast Acceptance

The Header now has explicit numeric contrast gates.

Required:

```text
Normal text                  >= 4.5:1
Large text                   >= 3:1
Meaningful UI/focus graphics >= 3:1
```

This applies to relevant states including:

- navigation text;
- phone utility;
- language selector;
- dropdown item text;
- Primary CTA text;
- Secondary/utility outlines when their boundary is required for identification;
- disclosure control;
- keyboard focus indicator;
- active underline/accent where it conveys meaningful state.

Color-token QA should be automated where practical, but rendered-state testing remains required.

---

# 68. Localization / SEO Hardening

## 68.1 Context preservation is already frozen

Version 2.0 already requires the language selector to preserve the equivalent current route whenever possible.

Version 2.1 makes this a regression gate rather than introducing a new rule.

FAIL example:

```text
/fa/products/rebar
→ user chooses English
→ forced to /en/
```

when a valid equivalent English content route exists.

---

## 68.2 hreflang x-default

The global localization/SEO layer should emit:

```text
hreflang="x-default"
```

for unmatched language/locale users.

The destination must follow the authoritative root/default-locale policy.

The Header component must not independently guess or invent the `x-default` destination.

This is a global page-metadata responsibility consumed consistently across localized pages.

---

# 69. Structured Data Boundary

Structured data is **not owned by the Header component itself**.

The already-frozen Central Verified Business Identity remains the source for shared organization/contact facts.

Preferred ownership:

```text
Organization / WebSite
→ global page/site metadata layer

ContactPoint / PostalAddress
→ same verified identity source

BreadcrumbList
→ page/breadcrumb domain
```

The Header must not emit duplicate or conflicting schema fragments merely because it displays phone/contact identity.

Structured data and visible Header identity must remain consistent.

---

# 70. Sticky Header Anchor Offset

Because the Header is sticky, in-page anchor targets must not be hidden underneath it.

Preferred site-level rule:

```css
[id] {
  scroll-margin-block-start:
    calc(var(--header-default-height) + var(--anchor-safe-gap));
}
```

or an equivalent scoped strategy.

The offset must account for the maximum relevant sticky Header height rather than assume the compact state only.

This is a site-level navigation rule, not a reason to hardcode one-off margins into content sections.

---

# 71. Frozen Interaction Tuning Values

Version 2.1 resolves three previously open interaction-tuning values.

## 71.1 Compact Header activation threshold

Target:

```text
24 CSS px vertical scroll
```

The Header must not switch to compact mode on the first pixel of scroll.

Implementation may use a low-overhead sentinel / observer strategy where appropriate.

---

## 71.2 Header compact transition

Target:

```text
~180ms
restrained ease-out / shared motion token
```

Applies to appropriate compact-state visual changes such as:

- shell height/padding;
- logo size;
- boundary emphasis.

No bounce, overshoot, spring theatrics, or delayed sticky behavior.

`prefers-reduced-motion` remains authoritative.

---

## 71.3 Pointer-exit tolerance

Desktop hover convenience may use:

```text
~180ms pointer-exit grace
```

to prevent flicker when moving from the top-level control into the dropdown panel.

This delay applies only to pointer-exit convenience.

It must NOT delay:

- Escape close;
- click selection;
- focus-driven closure;
- route change;
- explicit toggle action.

---

# 72. Dropdown Shortcut Capacity

## 72.1 Compact-panel ceiling

The Header may expose a maximum of:

```text
8 direct child shortcuts per dropdown panel
```

before relying on the existing:

```text
View all products
View all services
```

destination.

Selection remains controlled through public navigation metadata such as:

```text
show_in_navigation
navigation_sequence
```

or equivalent.

---

## 72.2 Rationale

The ceiling exists to preserve:

- compact panel geometry;
- fast scanning;
- localization resilience;
- mobile/desktop consistency;
- Header role as shortcut navigation rather than complete catalog.

This limit is **not justified by Miller's 7±2 memory rule**.

Recognition-based menus do not require users to memorize every visible option, and “7±2” is not accepted as a universal menu-item limit.

---

# 73. Primary CTA Visual Isolation

The Primary Header CTA:

**ارسال لیست خرید**

must remain the only visually dominant solid-filled button/control in the Header shell.

Other Header elements must not compete with it through an equally strong filled treatment.

Specifically:

- Phone remains utility-weight;
- Language Selector remains utility-weight;
- active navigation remains text + restrained accent;
- dropdown “View all” remains a text/navigation link;
- disclosure controls remain low-weight.

Exact CTA color comes from the approved semantic design token.

Frozen principle:

```text
One dominant filled Header action
```

---

# 74. Industries Navigation Position

The frozen top-level order remains:

```text
محصولات
خدمات
صنایع
درباره ما
تماس با ما
```

Version 2.1 does NOT reorder Industries based solely on a generic Serial Position Effect argument.

Reasons:

- the current order already expresses the approved Information Architecture;
- SEO importance is not determined by Header position alone;
- Industries can receive stronger discoverability through Homepage modules, contextual links, Footer, sitemap/internal-link architecture, and substantive landing pages.

A future reorder requires actual navigation/usability or business evidence.

---

# 75. Container / Fitts-Law Decision

No additional “keep CTA close to the viewport edge” rule is added.

The existing architecture already provides:

```text
global max content width: 1280px
+
shared responsive page gutters
```

Fitts's Law does not justify moving the Header CTA toward a physical screen edge in this layout.

The Header should remain aligned to the global content container.

The implementation must preserve comfortable responsive inline gutters, but no independent Header-only viewport-edge geometry is introduced.

---

# 76. Phone Action Regression Gate

Clickable phone behavior was already frozen in earlier versions.

Version 2.1 records it as an explicit regression gate:

```text
Desktop verified phone → real tel: link
Mobile top-bar phone    → real tel: action
Drawer verified phone   → real tel: link
```

All surfaces consume the same Central Verified Business Identity.

A phone number rendered as non-actionable plain text where the design presents it as a direct contact utility is a FAIL.

Correct bidi isolation remains required in FA / AR.

---

# 77. Global Search — Explicit Deferred Decision

Global Header Search is:

**NOT YET / FUTURE CONSIDERATION**

It is intentionally absent from Header V2.1.

Do not add a permanent Search icon/control without a new approved Header version.

Reconsider search when evidence demonstrates material need, such as:

- substantial catalog/service growth;
- findability problems;
- meaningful internal-search demand;
- usability testing showing navigation is insufficient.

The absence of Search at launch is therefore an explicit decision, not an undocumented omission.

---

# 78. Browser / Hardware Back and Drawer History

Version 2.1 does NOT require opening the mobile drawer to push a synthetic browser-history entry.

Default rule:

```text
Opening Header drawer
→ must not manipulate browser history merely to intercept Back
```

Reason:

the drawer is a transient navigation surface, not a navigated application route.

If a native `<dialog>` / browser environment provides appropriate platform dismissal behavior, it may be used.

If a future PWA/app-shell architecture requires hardware-Back integration, that behavior must be specified and tested in a separate version.

Do not compromise normal browser Back semantics solely to close the Header drawer.

---

# 79. Psychology / Heuristic Governance

Psychological laws may inform design review but do not override tested Information Architecture, accessibility, or business rules.

Version 2.1 records the following interpretation:

- **Hick-Hyman:** fewer/clearer choices can reduce decision time, but there is no universal “5–7 is optimal” Header count.
- **Miller 7±2:** not used as a hard menu-length rule.
- **Von Restorff / visual isolation:** supports the one-dominant-CTA rule, without adopting unsupported numeric visibility multipliers.
- **Serial Position Effect:** does not justify reordering approved IA without evidence.
- **Aesthetic-Usability:** supports polished, consistent motion and visual finish, but does not substitute for usability.
- **Recognition over Recall / Jakob-style convention:** supports predictable website navigation patterns and the frozen hybrid disclosure architecture.

---

# 80. Consolidated Improvement Adjudication

| Improvement | V2.1 Decision |
|---|---|
| 1. Explicit Disclosure Navigation ARIA | **ADDED — REQUIRED** |
| 2. Chevron accessible name | **ADDED — REQUIRED** |
| 3. Drawer focus trap / focus return | **ALREADY FROZEN; strengthened with modal semantics + inert** |
| 4. Body scroll lock | **ALREADY FROZEN; regression-protected** |
| 5. Skip to Main Content | **ADDED — REQUIRED** |
| 6. Multiple `<nav>` landmark labels | **ADDED with purpose-based labeling correction** |
| 7. Numeric contrast gates | **ADDED — REQUIRED** |
| 8. `hreflang x-default` | **ADDED at global SEO layer** |
| 9. Preserve page when switching locale | **ALREADY FROZEN; regression-protected** |
| 10. Structured data | **CLARIFIED: global metadata concern, not Header-owned** |
| 11. Sticky anchor offset | **ADDED — REQUIRED site-level behavior** |
| Compact-state threshold | **FROZEN: 24px** |
| Pointer-exit tolerance | **FROZEN: ~180ms** |
| Dropdown maximum | **FROZEN: max 8 shortcuts; NOT based on Miller** |
| 12. `tel:` phone action | **ALREADY FROZEN; regression-protected** |
| 13. Primary CTA visual uniqueness | **ADDED — REQUIRED** |
| 14. Move Industries due Serial Position | **REJECTED without evidence** |
| 15. Global Search | **EXPLICITLY DEFERRED / NOT YET** |
| 16. Browser/Hardware Back closes Drawer | **NOT REQUIRED; no synthetic history by default** |
| Fitts-based edge positioning | **REJECTED as an additional Header rule** |
| Smooth compact transition | **ADDED: ~180ms restrained easing** |

---

# 81. Version 2.1 Acceptance Addendum

Header V2.1 PASS requires all Version 2.0 criteria plus:

- disclosure controls use semantic buttons;
- `aria-expanded` is always synchronized with panel state;
- disclosure buttons have localized accessible names;
- `role="menu"`, `menubar`, and `menuitem` are not used for ordinary site navigation;
- mobile drawer has explicit modal semantics;
- background is non-interactive/inert while modal drawer is open;
- Skip Link bypasses repeated Header content;
- multiple navigation landmarks are named by purpose;
- normal text contrast >= 4.5:1;
- meaningful UI/focus graphics >= 3:1;
- `x-default` follows the authoritative global locale policy;
- same-page locale context is preserved where an equivalent route exists;
- structured data consumes the Central Verified Business Identity but is not duplicated inside the Header component;
- anchored content is not hidden by the sticky Header;
- compact-state threshold is ~24px;
- compact transition is restrained at ~180ms;
- pointer-exit grace is ~180ms and never delays explicit actions;
- Header dropdowns expose at most 8 direct shortcuts;
- the Primary CTA is the only dominant solid-filled Header action;
- phone actions remain real `tel:` targets;
- Global Search remains absent unless a later architecture version approves it;
- opening the drawer does not create synthetic history solely to intercept browser Back.

---

# 82. Current Authoritative Status

**AHAN ASA HEADER FINAL FROZEN V2.1 — CONSOLIDATED ACCESSIBILITY, UX & CONVERSION HARDENING — APPROVED**

Version 2.1 supersedes Version 2.0 only where it adds or clarifies the rules above.

All Product / Processing source-of-truth architecture, frozen Header Information Architecture, route decisions, responsive geometry, disclosure layout, mobile-drawer hierarchy, and primary CTA wording from Version 2.0 remain in force unless explicitly superseded here.

Future Header changes require a new explicitly versioned document.
