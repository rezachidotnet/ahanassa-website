# 00 — V0 Master

> Ahan Asa | آهن آسا — v0 Documentation Package
> Canonical semantic consolidation of the current cleaned Ahan Asa documentation (`PROJECT_OVERRIDES.md` → `CLAUDE.md` → `01-sources/` → verified implementation facts), rebuilt as a **self-contained** package for v0-style code generation. This package requires no other repository document to be read.
> Rebuilt: 2026-08-27. Source snapshot: `PROJECT_OVERRIDES.md` v2.1.0, `CLAUDE.md` v1.1.0, `DOCS_INDEX.md` v1.2.0, `DOCUMENT_AUDIT_REPORT.md` v2.1.0.

---

## 1. What this package is

Seven files, read together:

| File | Owns |
|---|---|
| `00_V0_MASTER.md` (this file) | Product truth, architecture summary, precedence, cross-file map, global rules, consolidated open-decision index |
| `01_UX_UI_DESIGN.md` | Brand identity, design tokens, component library, motion, responsive rules, accessibility standard, header/footer shells |
| `02_RFQ_CONVERSION_UX.md` | Primary conversion model, CTA system, the user-facing request/RFQ flow (steps, fields, copy, states) |
| `03_CONTENT_ROUTES_LOCALIZATION.md` | Information architecture, route/URL contracts, redirects, content model, content strategy, media rules, fa/en/ar localization architecture |
| `04_SEO_PERFORMANCE_ANALYTICS.md` | SEO architecture, metadata/structured-data/hreflang, performance budgets, caching principles, GTM/GSC analytics |
| `05_TECH_DATA_CLOUDFLARE.md` | Cloudflare Workers + vinext + Vite + TypeScript architecture, folder/component conventions, environment/secrets, deployment, security, testing/QA gates, coding standards |
| `06_PRODUCTS_CMS_ODOO_RFQ.md` | System-of-record ownership, D1/R2/Queues data architecture, catalog/pricing data flow, CMS, RFQ backend durability, Odoo integration contract |
| `homepage-desktop-v1.png` | Visual authority for the desktop homepage (byte-identical copy of `/design-reference/homepage-desktop-v1.png`) |

**Consolidation method:** this is a canonical semantic rebuild, not a concatenation of the 87-document `01-sources/` corpus. Every current valid requirement is preserved; duplication and historical noise (stale Vercel-era instructions, stale Persian-only framing, superseded architecture ADRs) are removed; superseded statements are explicitly marked as superseded rather than silently dropped or silently reproduced as current guidance; genuinely unresolved items are marked **`OPEN DECISION — DO NOT INVENT`** rather than resolved by assumption.

---

## 2. Product truth (stable across every file)

Ahan Asa is a **premium B2B steel procurement and sourcing partner** — a professional purchasing manager, not a commodity marketplace, discount retailer, price board, or cart-first e-commerce store.

- Approved brand promise: **«ما مراقب سرمایه شما هستیم.»** ("We protect your capital.")
- **Primary website conversion — canonical CTA label for this package: «ارسال لیست خرید»** (send purchase list). This is the short public-facing form of the fuller concept documented throughout the underlying specifications as **«ارسال فاکتور یا لیست خرید»** (send invoice or purchase list) — a visitor may begin with an existing invoice, a material/purchase list, a bill of quantities, a project document, or a written requirement; all of these enter the same canonical request flow. Standardize on **«ارسال لیست خرید»** as the button-label constant across the site; supporting copy may still describe the fuller accepted-input set so the promise stays accurate. Full CTA system and flow: `02_RFQ_CONVERSION_UX.md` §1–§3.
- Flow: request submission → review/qualification → purchasing proposal → sourcing/delivery coordination.
- Never invent live prices, stock, supplier relationships, testimonials, case studies, certifications, or statistics without approved evidence.
- **Owner-confirmed (2026-08-26):** the site includes a public product catalog and public pricing. This does not reverse the "not a price board" positioning — prices must be qualified, timestamped, sourced from the synchronized Cloudflare data layer (never a live Odoo call), and presented as part of the procurement-manager experience, not as a commodity-trading ticker or cart-first storefront. Full data flow: `06_PRODUCTS_CMS_ODOO_RFQ.md` §4.
- **Owner-confirmed (2026-08-26):** the site launches in **fa (default), en, ar** — not Persian-only with future locales. Full locale architecture: `03_CONTENT_ROUTES_LOCALIZATION.md` §7.

### 2.1 Brand constants

| Item | Value |
|---|---|
| Persian name | آهن آسا |
| English name | Ahan Asa |
| Domain | `ahanassa.com` |
| Canonical production origin | `https://www.ahanassa.com` (confirmed — see §7.9 below; **not** an open decision) |
| ERP origin | `https://odoo.ahanassa.com` |
| Steel Navy | `#0B2545` |
| Forge Copper | `#B04A2F` |
| White | `#FFFFFF` |
| Warm Cream | `#FBF5EB` |
| Legal entity name | paya tejarat foolad iranian |

Master logo geometry, the four brand colors above, the Persian-first RTL launch direction, and the primary conversion model are protected — do not alter without an explicit, target-specific owner decision. Full design-token and brand-asset rules: `01_UX_UI_DESIGN.md` §3–§4.

---

## 3. Confirmed architecture (one paragraph)

```text
Visitor / Search engine
        ↓
   Cloudflare Edge
        ↓
Next.js App Router via vinext, on Cloudflare Workers + Static Assets
        ↓
D1 (DB_PUBLIC, DB_OPS) · R2 (public media, private RFQ attachments) · Queues + DLQ
        ↓
Server-only Odoo adapter (never called from a request handler)
        ↓
odoo.ahanassa.com
```

**Confirmed as a fact on the ground** (verified against `package.json`/`wrangler.jsonc`, not a preference): the runtime is **Cloudflare Workers + Static Assets**, **Next.js App Router via `vinext`** (`@vinext/cloudflare`, `@cloudflare/vite-plugin`, `@vitejs/plugin-rsc`) on **Vite**, deployed with **`wrangler`**, in **TypeScript**. Vercel hosting, `@opennextjs/cloudflare`, and `@cloudflare/next-on-pages` are explicitly superseded — do not reintroduce them even where an older source document still names them. D1/R2/Queues are the confirmed target data layer (scaffolded in `wrangler.jsonc`, not fully built out yet). **System of record:** Odoo owns commercial truth (customers, CRM, products/variants/UOM, prices, quotations, sales). The website owns presentation, SEO, and RFQ intake. Public rendering must never synchronously depend on Odoo. An accepted RFQ must be durably persisted in D1 before Odoo sync — Odoo downtime must never lose a lead.

Full technical architecture, deployment, security, and testing: `05_TECH_DATA_CLOUDFLARE.md`. Full data/CMS/Odoo contract: `06_PRODUCTS_CMS_ODOO_RFQ.md`.

---

## 4. Documentation precedence (for this package)

```text
1. The project owner's latest explicit instruction
2. Legal, security, privacy, and safety requirements
3. PROJECT_OVERRIDES.md decisions (as consolidated into this package)
4. This v0 package (00 → 01–06, in the order a task actually touches)
5. Verified implementation facts (package.json, wrangler.jsonc, actual repo state)
```

Within this package, no file overrides another silently — each file names the companion file that owns an adjacent topic instead of duplicating it (e.g. `02` owns RFQ UX, `06` owns RFQ backend durability; `01` owns visual design tokens, `04` owns the performance budgets that consume those tokens). If a task surfaces a genuine contradiction between two files in this package, treat it as a documentation defect to flag, not something to silently resolve — see §9 (consistency check) for confirmation that no unflagged contradiction exists as of this rebuild.

**Never silently invent a business fact, contact detail, credential, Odoo field, price, or statistic.** Where the source corpus leaves something genuinely unresolved, this package marks it **`OPEN DECISION — DO NOT INVENT`** in the owning file and again in the consolidated index below (§8).

---

## 5. Homepage visual authority

**Before implementing or materially modifying the homepage, `homepage-desktop-v1.png` (in this same directory) must be inspected.** It is the owner-approved visual source of truth for the **desktop** homepage: overall composition, section order/hierarchy, layout proportions, spacing rhythm, typography scale, color relationships, CTA placement, and visual density. SHA-256 verified byte-identical to `/design-reference/homepage-desktop-v1.png` (see the rebuild report for the hash).

- The image governs **appearance**. Text specifications in this package (`01`–`06`) govern **business behavior, content, routing, SEO, accessibility, semantics, localization, performance, RFQ behavior, security, and Odoo integration** — neither side overrides the other within its own domain.
- The screenshot's authority is visual only: it governs composition, section hierarchy, layout proportions, spacing rhythm, typography proportions, color relationships, CTA placement, visual density, and visual treatment of components. Text embedded in the screenshot is **not** authoritative content. Do not copy screenshot CTA labels, navigation labels, headings, body copy, phone numbers, email addresses, WhatsApp details, business hours, legal/business facts, statistics, claims, prices, or supplier/customer information unless independently confirmed by this Markdown package. The Markdown package controls CTA copy, routes/navigation, contact facts, and all other textual or business decisions. In particular, unconfirmed contact details in the screenshot are reference placeholders only; the confirmed company address is usable because it is independently confirmed in the documentation, not because it appears in the image.
- For homepage implementation, the canonical primary CTA text is **ارسال لیست خرید** in the header, hero, and pre-footer/final CTA. The canonical outlined header and hero secondary educational CTA is **آشنایی با فرآیند خرید**; **تماس با ما** remains the general support/navigation action. Do not use screenshot wording such as **ثبت درخواست خرید**, **مشاهده فرآیند همکاری**, or **تماس سریع** as canonical CTA labels.
- The PNG is a **visual reconstruction target**, not an implementation artifact. Rebuild it as a real responsive interface using semantic HTML, real headings/body text, real links/buttons/anchors, accessible interactive controls, reusable responsive components, real media assets, server-rendered content where appropriate, CSS layout/design tokens, and locale-aware RTL/LTR behavior. Never implement it as a full-page screenshot, full-page/background image containing UI or text, rasterized sections, image map, canvas replica, sliced screenshot, baked-in image text, static substitute for HTML/buttons/navigation, or an accessibility-hidden visual layer with invisible controls over it. Essential meaning, navigation, headings, CTA actions, and RFQ entry must remain available and meaningful if CSS fails, nonessential JavaScript fails, animations are disabled, or images fail.
- Responsive adaptation (the reference is desktop-only) and technical adaptations for accessibility, Core Web Vitals, semantic markup, browser compatibility, or fa/en/ar content-length differences are expected and must **preserve, not replace**, the approved direction.
- Redesigning the homepage, inventing a different visual concept, changing section hierarchy without a documented functional reason, or substituting a generic template requires explicit owner approval — it is not authorized by this package alone.
- The homepage's **visual composition** is specified only by the PNG; its **content/functional requirements** (page-type patterns, content hierarchy, IA position) are specified in `03_CONTENT_ROUTES_LOCALIZATION.md` §8. `01_UX_UI_DESIGN.md` and `02_RFQ_CONVERSION_UX.md` supply the component/CTA rules both layers draw on.
- The PNG is immutable — never modify, replace, or regenerate it within this package.

---

## 6. Global cross-cutting rules

These apply everywhere in the package and are not repeated file-by-file:

1. **fa/en/ar from day one.** Locale architecture, content model, routing, metadata, RFQ flow, and QA must all be designed for all three locales now — even though actual approved English/Arabic *copy* is a separate, acknowledged content-production dependency (never fabricate it; gate publication per-locale, per-page, on real approved content).
2. **No synchronous Odoo dependency.** No public page render, no RFQ acknowledgment, ever waits on a live Odoo call. Odoo is reached only by background sync workers and async delivery consumers.
3. **Durable-first RFQ capture.** An RFQ is durably persisted (D1 + outbox event, one transaction) before the visitor is told "received." Everything after that is async and retried.
4. **Never fabricate.** No invented prices, stock, testimonials, case studies, certifications, statistics, contact details, Odoo fields/modules/versions, legal text, or performance numbers not evidenced in this package or the underlying source corpus.
5. **WCAG 2.2 AA** is the accessibility conformance target for every public page and flow — release gate, not a post-launch pass (`01` §12).
6. **Security by default.** Server-side validation is authoritative everywhere; secrets never reach the browser; private data (RFQ contents, uploaded documents, contact PII) never enters public caches, static output, client storage, page URLs, or analytics payloads (`05` §4/§6, `06` §5).
7. **Scope discipline.** Do not opportunistically redesign, refactor, or migrate dependencies. Do not build excluded Phase-1 features (cart/checkout, live price feed, customer accounts/portal, supplier marketplace, autonomous quotation) unless a later approved decision changes scope.
8. **Mark, don't guess.** A genuinely unresolved item is marked `OPEN DECISION — DO NOT INVENT` in its owning file and listed in §8 below — never silently resolved by assumption, however plausible.

---

## 7. Confirmed owner decisions preserved in this package

All confirmed 2026-08-26 unless noted; each traces to a specific section of the owning file.

1. **Multilingual launch — fa/en/ar, fa default/unprefixed/RTL, en `/en` LTR, ar `/ar` RTL, `x-default` → unprefixed fa.** (`03` §2.2/§7, `04` §2.2–§2.4)
2. **Public product catalog and public pricing are in scope**, superseding the older no-public-catalog / no-price-page prohibitions — always rendered from the synchronized D1 layer, never a live Odoo call, always qualified/timestamped. (`03` §2.3, `04` §1.4/§3/§5.6, `06` §4)
3. **Cloudflare Workers + Static Assets + vinext + Vite + TypeScript** is the confirmed production runtime, superseding Vercel and `@opennextjs/cloudflare`/`@cloudflare/next-on-pages` framing wherever an older document still names them. (`05` §1–§2)
4. **Odoo's role and non-blocking status**: intended commercial system of record where appropriate; version/modules/protocol/mapping remain a genuine integration-phase discovery gate that does **not** block Phase 1 foundation work. (`06` §7.2)
5. **GTM and GSC are required launch architecture** (not the specific IDs, which remain open — see §8). (`04` §7.1)
6. **Company address confirmed**: اصفهان، خیابان هزارجریب، کوی آزادگان (Isfahan, Hezar Jarib Street, Kooy Azadegan) — Persian form primary. (`03` §9)
7. **Logo source assets confirmed**: `/logo/` holds the authoritative source files (immutable, outside this package's scope to reproduce or regenerate). (`01` §3)
8. **Attachment-scanning phasing confirmed**: not a foundation blocker, but production file upload must stay disabled until a scanning pipeline is selected and implemented. (`02` §5/§9, `05` §6, `06` §5.3)
9. **Canonical production origin confirmed**: `https://www.ahanassa.com`. The apex domain may redirect to `www`, but the canonical/public SEO identity is `https://www.ahanassa.com`.
10. **Homepage desktop visual reference registered and approved**: `/design-reference/homepage-desktop-v1.png`. (§5 above)

---

## 8. Consolidated open-decision index

Every item below is genuinely unresolved in the underlying source corpus. **Do not invent a value for any of these.** Each is detailed in its owning file; this table exists so no single open item is missed when scanning only one file.

| # | Open decision | Owning file(s) |
|---|---|---|
| 1 | Top-level information architecture / hub naming (source documents propose different structures — Procurement/Materials/Industries vs. Services/Products/Guides, etc.) | `03` §1.1/§9 |
| 2 | Catalog/material route naming: flat (`/{catalog}/[category-slug]`) vs. hierarchical (`/{catalog}/{category}/{product}/{variant}`), plus the hub label itself | `03` §2.4/§9, `04` §1.5/§9, `06` §4.4/§11 |
| 3 | `/terms` vs. `/terms-of-use` | `03` §2.6/§9 |
| 4 | Exact launch material-category inventory, industry list, and whether the evidence/case-study hub can launch publicly (zero verified cases exist currently) | `03` §9 |
| 5 | Localized-slug policy: whether en/ar reuse the Persian Latin slug segment or get market-specific slugs | `03` §2.2/§9 |
| 6 | Language-switcher fallback when a locale-equivalent page doesn't exist (disable vs. omit vs. link elsewhere) | `03` §7.6 |
| 7 | Precise Arabic market/BCP-47 tag (neutral `ar` vs. `ar-IQ`/`ar-OM`), Persian calendar usage scope for dated content | `03` §9 |
| 8 | Company phone number, email, WhatsApp, business hours (address and legal entity name are confirmed — see §7.6) | `03` §9, `02` §9 |
| 9 | Final Persian/English/Arabic legal copy (Privacy, Terms) — requires legal review | `03` §9 |
| 10 | Preferred production Persian commercial font family, Arabic type family, and the multi-locale (fa+en+ar concurrent) font byte budget redesign | `04` §6.5/§9, `01` §5/§16 |
| 11 | GTM container ID / GA4 Measurement ID / GSC verification value (the *requirement* to support them is confirmed — only the literal values are open) | `04` §7.1/§9 |
| 12 | Final numeric performance/Core Web Vitals budgets beyond the Good/Internal targets already stated | `04` §6.1/§9 |
| 13 | Public price freshness/staleness display threshold per category | `04` §9, `06` §4.3/§11 |
| 14 | Odoo deployed version, installed modules, exact API/integration protocol, exact model/field mapping (a preference for Odoo 19 JSON-2 API is unverified, not confirmed) | `06` §7.2/§11, `05` §7 |
| 15 | Attachment-scanning provider and pipeline selection | `06` §5.3/§11, `02` §5/§9, `05` §6 |
| 16 | Whether RFQ line items land in a real custom Odoo model vs. a temporary structured fallback | `06` §7.2/§11 |
| 17 | Exact retry counts, backoff cadence, and per-failure alert SLAs for sync/queue failure handling | `06` §8/§11 |
| 18 | A single reconciled role-to-permission matrix (three overlapping illustrative role lists exist, not one taxonomy) | `06` §9/§11 |
| 19 | Final outlined Persian wordmark asset and exact lockup measurements | `01` §3/§16 |
| 20 | File upload limits/retention periods, privacy-notice legal text/version, verified contact channels, public response-time promise, public reference-number format, CAPTCHA provider, public request-tracking mechanism — implementation defaults stated, not yet signed off | `02` §9 |
| 21 | Odoo integration authentication/credential scope and final delivery details beyond the confirmed Odoo business-system role | `02` §9, `05` §7, `06` §7.2 |
| 22 | Exact env-var/binding names beyond the naming discrepancy already flagged (R2 bucket binding names differ between two source documents), and final CI/performance gate numbers | `05` §1.2/§4 |
| 23 | Full supporting neutral/semantic color palette beyond the starter tokens already listed; dark mode is explicitly **not** approved (a decision, not an open item) | `01` §16 |
| 24 | Approved photography/evidence library (verified people/projects/facilities and usage rights) | `01` §16, `03` §9 |

**Canonical host:** resolved. The production canonical/public SEO identity is `https://www.ahanassa.com`; the apex may permanently redirect to `www` in one hop. Do not carry forward older apex-vs-`www` open-decision wording.

---

## 9. Consistency check (performed across all seven files)

| Check | Result |
|---|---|
| fa/en/ar, Persian default/unprefixed/RTL | ✅ Consistent in `00`, `03` (§2.2, §7), `04` (§1.2/§2.2–2.4); assumed correctly in `01`/`02`/`05`/`06` where locale-dependent behavior is mentioned |
| Cloudflare Workers + vinext + Vite + TypeScript | ✅ Consistent in `00`, `05` (§1–§2); correctly deferred to `05` (not restated in full) by `01`–`04`, `06` |
| Primary CTA = «ارسال لیست خرید» | ✅ Used as the canonical label in `00`, `01` (§9), `02` (§1–§3), `03` (§1); `04`/`05`/`06` correctly defer CTA copy to `02` rather than restating it |
| Homepage visual authority (PNG) | ✅ Stated in `00` and `01` §2; `03` correctly separates visual (image) from content/functional requirements (§8) and does not duplicate the image's authority claim |
| RFQ upload + manual/written-description entry | ✅ Consistent across `02` §4.4/§5 (UX) and `06` §5 (backend) — accepted requirement paths include an existing purchase-list document/image, meaningful written description, or manual purchase-list lines supporting product/category, size/variant, grade/standard where relevant, unit, and quantity |
| Mobile RFQ CTA | ✅ `01` §13–14 (header/footer shell rules) and `02` §6 agree: sticky CTA suppressed while the Request form is active, safe-area respected |
| Public catalog/pricing | ✅ Consistent across `03` §2.3, `04` §1.4/§3/§5.6, `06` §4 — always D1-sourced, never live Odoo, always qualified/timestamped; `06` is the single source for the data model, `03`/`04` correctly defer to it |
| D1/R2/Queues | ✅ `05` §1–§3 owns the general Cloudflare/runtime framing; `06` §3 owns the specific database split, buckets, and queue classes — no duplication or contradiction found (one minor binding-name discrepancy between two source documents is flagged as open in `05` §1.2, not silently resolved) |
| Odoo boundaries | ✅ "Never synchronous, server-only adapter, durable-first capture" stated consistently in `00`, `05` §1/§7, `06` §1/§7; `02` §8 correctly limits itself to the user-facing consequence (success only after server confirmation) without restating the backend contract |
| CMS responsibility | ✅ `06` §6 is the sole owner; `03` §4 references it for the publication-state model without restating CMS internals |
| SEO | ✅ `04` is the sole owner of metadata/structured-data/hreflang mechanics; `03` correctly limits itself to route/IA implications |
| Accessibility | ✅ `01` §12 is the sole detailed owner; `02` §7 correctly adds only RFQ-flow-specific requirements without contradicting the baseline |
| Security | ✅ `05` §6 owns general security; `06` §5.3/§7.3 correctly restates only the attachment-scanning and credential-boundary points relevant to RFQ/Odoo data, consistently with `05`'s framing |
| Performance | ✅ `04` §6 is the sole owner of budgets; `01`/`03` do not restate numeric targets |
| Unresolved decisions | ✅ Every `OPEN DECISION — DO NOT INVENT` flagged in `01`–`06` is captured in the §8 index above; no file resolves an item another file marks open |

**No unflagged contradiction was found between package files.**

---

## 10. What this package explicitly does not do

- Does not modify application code, `01-sources/`, `logo/`, `design-reference/`, or the root canonical documentation (`PROJECT_OVERRIDES.md`, `CLAUDE.md`, `DOCS_INDEX.md`, `DOCUMENT_AUDIT_REPORT.md`).
- Does not invent any of the items listed in §8.
- Does not resolve the open route-naming, font, Odoo-mapping, integration-detail, upload-security, or role-matrix questions — it surfaces them precisely so a v0 build can proceed on everything that *is* settled without silently guessing on what isn't.
- Is not committed and does not deploy anything.
