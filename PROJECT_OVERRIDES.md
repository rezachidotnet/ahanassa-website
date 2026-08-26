# PROJECT_OVERRIDES.md

## Ahan Asa Website — Current Binding Cross-Project Overrides

**Project:** Ahan Asa | آهن آسا
**Domain:** `https://www.ahanassa.com`
**ERP:** `https://odoo.ahanassa.com`
**Document role:** Highest-authority record of confirmed decisions that supersede conflicting statements anywhere in `01-sources/`, `02-sources/`, or `03-sources/`
**Status:** Active — owner sign-off received on the findings this file previously flagged as unconfirmed; homepage visual reference registered
**Version:** 2.1.0
**Last updated:** 2026-08-26

---

## 0. How this file came to exist

No file named `PROJECT_OVERRIDES.md` exists anywhere in `01-sources/`, `02-sources/`, or `03-sources/`, even though `03-sources/CLAUDE(1).md` and `03-sources/DOCS_INDEX.md` both refer to it repeatedly as the top-priority document. This file was originally reconstructed (v1.0.0) from the newest explicit statements found across the three source directories, applying `03-sources > 02-sources > 01-sources`. Several of its entries were flagged as reconstructed-but-unconfirmed, pending explicit project-owner sign-off.

**v2.0.0 update:** the project owner has now explicitly reviewed and confirmed the flagged findings. Every entry below marked **OWNER-CONFIRMED** was sign-off received on 2026-08-26; it is no longer provisional. Entries not marked OWNER-CONFIRMED were not part of the sign-off round and retain their original evidence/status. See `DOCUMENT_AUDIT_REPORT.md` for the full reasoning trail and finding-by-finding disposition.

This file must be read first, before `CLAUDE.md`, for any implementation task. It controls only the decisions explicitly listed here — it does not silently replace unrelated content in specialist documents.

---

## 1. Languages and locale routing — OWNER-CONFIRMED

```text
SUPPORTED_LANGUAGES = fa, en, ar
DEFAULT_LANGUAGE    = fa   (unprefixed, primary language)
EN_PREFIX           = /en
AR_PREFIX           = /ar

FA_DIRECTION = rtl
AR_DIRECTION = rtl
EN_DIRECTION = ltr
```

**Status:** OWNER-CONFIRMED 2026-08-26. The Ahan Asa website will launch in Persian, English, and Arabic. Persian is the primary/default language. This requirement is authoritative even where older SEO documentation (both `01-sources` and, notably, several `02-sources` documents dated a day later) still describes a Persian-only launch — see `DOCUMENT_AUDIT_REPORT.md` DAR-008, now closed.

**Supersedes:** the Persian-only launch requirement in `01-sources/PROJECT_BRIEF.md` §6.1, `01-sources/README.md`, ADR-003 in `01-sources/DECISIONS.md`, and the "future locale reservation" framing in `02-sources/METADATA_SPEC.md`, `02-sources/STRUCTURED_DATA.md`, `02-sources/INTERNAL_LINKING.md`, `02-sources/SITEMAP_ROBOTS_SPEC.md`, `02-sources/TESTING_STRATEGY.md`, and `02-sources/SEO_QA_CHECKLIST.md`. All of the above are **SUPERSEDED** on this specific point; their non-locale content is unaffected.

**Binding requirement:** the locale architecture (routing, content model, CMS publication states, metadata, SEO, forms/RFQ, QA) must be designed from the beginning for `fa`/`en`/`ar` — not retrofitted later.

**Do not fabricate content to satisfy this:** do not create machine-generated or fake "final" English/Arabic translations merely to populate the site. Missing approved English or Arabic content is an acknowledged **content-production dependency**, not a reason to publish placeholder/machine-translated text as if it were final copy. Build the multilingual architecture now; gate publication of a given locale/page on real approved content per `01-sources/CMS_ARCHITECTURE.md`'s publication-state model.

**hreflang:** `x-default` → the unprefixed Persian route. Reference implementation already exists in `02-sources/ahan-asa-homepage-control.html` (fa/en/ar hreflang alternates, working language switcher).

**Structural readiness (already true before this sign-off):** `01-sources/CONTENT_MODEL.md` §6.1 already types `LocalizedText` as `{fa: required, en?: string, ar?: string}`, and its TypeScript contract (§15) already defines `type Locale = "fa" | "en" | "ar"`. Extending these to reflect fa/en/ar as launch-required (not optional-future) is a policy update, not a structural rewrite.

---

## 2. Production hosting and framework adapter

```text
PRODUCTION_PLATFORM = Cloudflare Workers + Static Assets
FRAMEWORK           = Next.js App Router (via vinext)
ADAPTER             = vinext (confirmed — NOT @opennextjs/cloudflare)
VERCEL_HOSTING      = prohibited
```

Not part of this sign-off round; unchanged from v1.0.0.

**Source:** confirmed by the actual initialized repository — `package.json` scripts (`vinext dev`, `vinext build`, `vinext-cloudflare deploy`), dependencies (`vinext`, `@vinext/cloudflare`, `@cloudflare/vite-plugin`), and `wrangler.jsonc` (`main: "vinext/server/fetch-handler"`, D1/R2/Images/cache bindings scaffolded). `npm run build` currently passes on this scaffold.

**Conflicts this resolves:**

- All of `01-sources` (Vercel hosting, "Locked direction") is superseded — confirmed by `02-sources/DEPLOYMENT_ARCHITECTURE.md` itself: *"It replaces the former Vercel deployment baseline"* and lists Vercel hosting as *"no longer approved."*
- `02-sources` internally disagreed with itself on the adapter (`02-sources/STACK.md` locked `@opennextjs/cloudflare`; `02-sources/TECHNICAL_ARCHITECTURE.md` preferred `vinext`). The live scaffold has already chosen `vinext` — a fact on the ground, not an open decision. See `DOCUMENT_AUDIT_REPORT.md` DAR-005.

---

## 3. Commercial architecture — Odoo, D1, R2, Queues

```text
ODOO_IS_INTENDED_COMMERCIAL_SOURCE_OF_TRUTH  = true   (where appropriate — see scope note below)
ODOO_VERSION_CONFIRMED                       = false  (integration-phase gate, not a foundation blocker)
PUBLIC_RENDERING_SYNCHRONOUS_ODOO_DEPENDENCY = false
RFQ_DURABLE_FIRST_CAPTURE                    = true   (D1 + transactional outbox, before Odoo sync)
DATABASE                                     = Cloudflare D1 (two production databases: DB_PUBLIC, DB_OPS)
OBJECT_STORAGE                               = Cloudflare R2 (separate public-media and private-attachment buckets)
ASYNC_INTEGRATION                            = Cloudflare Queues + Dead Letter Queue
NO_PUBLIC_DATABASE_AT_LAUNCH (ADR-011)       = SUPERSEDED
```

**Status:** OWNER-CONFIRMED 2026-08-26 (Odoo's role and scope boundary; version/module/protocol details remain explicitly open — see below). Closes `DOCUMENT_AUDIT_REPORT.md` DAR-013 as "confirmed non-blocking gate," not resolved-in-full.

**Odoo's role, as confirmed by the owner:** `odoo.ahanassa.com` is the project's ERP integration endpoint. Odoo is intended to own the appropriate business-domain data — customers, CRM, quotations, sales, and commercial product/price data — where appropriate. The website owns presentation, SEO, and RFQ intake. Public rendering must never synchronously depend on Odoo; an accepted RFQ must be durably persisted in D1 before Odoo sync.

**Explicitly still unconfirmed — do not assume, do not guess:**

- Odoo deployed version
- Installed Odoo modules
- Exact API/integration protocol
- Exact Odoo model/field mapping

These remain a genuine **integration-phase gate** to be resolved by verification against the live `odoo.ahanassa.com` instance — the owner has explicitly confirmed this is *not* a blocker for Phase 1 foundation work (routing, design system, content architecture, D1/R2/Queues scaffolding, catalog/pricing UI against placeholder or synchronized-but-unmapped data). It only blocks the specific work of wiring the real Odoo adapter/protocol/field mapping. Do not convert the Odoo 19 JSON-2 API preference noted in `02-sources/STACK.md`/`02-sources/TECHNICAL_ARCHITECTURE.md` into an assumption that the deployed server is actually Odoo 19.

**Source:** `02-sources/PROJECT_BRIEF.md`, `02-sources/TECHNICAL_ARCHITECTURE.md`, `02-sources/DATA_ARCHITECTURE(1).md`, `02-sources/DATABASE_SCHEMA.md`. `01-sources` (the entire 63-document baseline) described a static, database-free, Odoo-free brochure/lead-gen website (`ADR-011`; `ADR-007`: CMS deferred) — this is superseded per §4 below and `DOCUMENT_AUDIT_REPORT.md` DAR-003/DAR-004.

---

## 4. Public product and pricing catalog — OWNER-CONFIRMED

```text
PUBLIC_PRODUCT_CATALOG = confirmed
PUBLIC_PRICING         = confirmed
PRICE_DATA_SOURCE      = Odoo, synchronized/cached into the Cloudflare website data layer (D1)
PRICE_RENDERING        = from the cached/synchronized D1 projection — never a synchronous live Odoo call
```

**Status:** OWNER-CONFIRMED 2026-08-26. The website will include a public steel product/catalog and public pricing architecture. This explicitly **supersedes** the older `01-sources` prohibition on a public price catalog (`01-sources/ROUTES.md` §4.5 banned `/prices`, `/daily-prices`, `/live-prices`; `01-sources/SEO_KEYWORD_MAP.md` §12 excluded live-price keyword territory entirely). Those prohibitions are now **SUPERSEDED**.

**What this does not change:** public rendering must still never depend on a synchronous live Odoo request (§3 above). Public product/price data must be synchronized or cached into the Cloudflare D1 layer per the approved architecture (`02-sources/TECHNICAL_ARCHITECTURE.md` §11, `02-sources/DATABASE_SCHEMA.md` catalog/price tables) — never fetched live from Odoo on the request path. Freshness/staleness rules, price qualification, and "never fabricate price/stock" rules from `CLAUDE.md` remain fully in force.

**Route-naming note (still open, not resolved by this sign-off):** `01-sources/ROUTES.md` uses `/steel-products/[category-slug]` while the 02-layer catalog documents use `/steel/{category}/{product}/{variant}` — this naming reconciliation is unrelated to the scope confirmation above and remains open. See `DOCUMENT_AUDIT_REPORT.md` DAR-016.

**Source of the original scope-expansion finding:** `02-sources/DATABASE_SCHEMA.md`: *"If an older document says that the website has no database... or excludes catalog/pricing/RFQ persistence, that statement is superseded by the approved Cloudflare + Odoo architecture described here."* Closes `DOCUMENT_AUDIT_REPORT.md` DAR-003's "flagged for owner visibility" note.

---

## 5. Analytics and search — OWNER-CONFIRMED

```text
GSC_REQUIRED = true
GTM_REQUIRED = true
SEO_MEASUREMENT_ARCHITECTURE_REQUIRED = true
```

**Status:** OWNER-CONFIRMED 2026-08-26 as an architectural requirement. Closes `DOCUMENT_AUDIT_REPORT.md` DAR-009.

The implementation must support Google Tag Manager, Google Search Console, and SEO measurement architecture from the start (environment-driven GTM configuration, sitemap/index readiness for GSC, etc.). **Specific values remain configuration, not architecture, and remain pending:** the actual GTM container ID, GA4 property ID, and Search Console verification value are not yet supplied and must not be invented or hardcoded — treat them as environment variables to be populated when the owner provides them.

---

## 6. Media and brand assets

```text
LOGO_SOURCE_ASSETS_AVAILABLE = true   (see below — source assets only, confirmed 2026-08-26)
AI_IMAGES_ALLOWED             = true   (non-evidentiary conceptual artwork only — never real clients/projects/facilities)
LICENSED_MEDIA_ALLOWED        = true
```

### 6.1 Logo — OWNER-CONFIRMED

Official Ahan Asa brand/logo assets exist at repository root under `/logo/` (`AhanAsa logo-13.jpg`, `AhanAsa logo-14.jpg`). They are the **authoritative source assets** — closes the "final logo asset files" line in the prior "not confirmed" list.

Binding rules:

- **`/logo/` is immutable, same as `01-sources/`, `02-sources/`, `03-sources/`.** Do not modify, redraw, recreate, or substitute these originals.
- Do not treat the absence of a favicon/OG/optimized derivative as license to regenerate the logo from scratch — derive from these source files only.
- Production derivatives (optimized formats, sizes, favicon, OG image, etc.) may be generated later under `/public/brand/` if format conversion or optimization is required for the live site. That derivative-generation step is implementation work, not a documentation concern, and is not part of this sign-off.

### 6.2 AI-generated and licensed media

Unchanged from v1.0.0 — corroborated independently by `01-sources/MEDIA_GUIDELINES.md` §29 (non-evidentiary conceptual AI imagery allowed; never presented as a real completed project/employee/facility) as well as `03-sources/CLAUDE(1).md` §21.

**Brand palette — confirmed stable across every layer, no override needed:**

```text
Steel Navy   #0B2545
Forge Copper #B04A2F
White        #FFFFFF
```

**Primary conversion model — confirmed stable across every layer:** invoice/BOM/material-list submission (`ارسال فاکتور / لیست خرید`), not cart/checkout. Ahan Asa remains a procurement-management partner, not a commodity marketplace.

---

## 7. Company contact facts

### 7.1 Address — OWNER-CONFIRMED

```text
ADDRESS_FA (primary/canonical wording) = اصفهان، خیابان هزارجریب، کوی آزادگان
ADDRESS_EN (reference translation)     = Isfahan, Hezar Jarib Street, Kooy Azadegan
```

**Status:** OWNER-CONFIRMED 2026-08-26. Use the Persian form as the primary source wording; the English form is a reference translation for the `en` locale. This closes the address portion of `DOCUMENT_AUDIT_REPORT.md` DAR-001 — the value was previously flagged only as an unverified candidate sourced from a design mockup (`02-sources/ahan-asa-homepage-control.html`); the owner has now confirmed it directly.

### 7.2 Phone — STILL OPEN, not production-confirmed

```text
PHONE_CANDIDATE = ۰۳۱۳۵۱۳۴   (NOT confirmed for production use)
```

**Status:** OPEN. A candidate value exists (`۰۳۱۳۵۱۳۴`), sourced from the same design mockup as the address. The owner has explicitly **not** confirmed this as a final production phone number — it may be incomplete (it is only 8 digits total including the `031` area code; a standard Isfahan landline needs `031` plus 8 further digits). **Do not publish this number anywhere in production** (footer, contact page, structured data, `tel:` links) until the owner supplies the complete number. Keep phone publishing as a genuinely open item.

---

## 8. Attachment security

```text
ATTACHMENT_SCANNING_BLOCKS_FOUNDATION = false
ATTACHMENT_SCANNING_BLOCKS_PRODUCTION_UPLOADS = true
```

**Status:** OWNER-CONFIRMED 2026-08-26. Attachment malware/content scanning for RFQ file uploads is **not** a blocker for foundation implementation (routing, forms UI, D1/R2 scaffolding, non-upload-enabled pages). It **remains a required security decision** that must be resolved — provider selected, pipeline implemented and approved — before production RFQ file uploads are actually enabled. Per `CLAUDE.md` §19 and `01-sources`/`02-sources` security guidelines: if the attachment security pipeline is not approved/implemented when this feature is reached, attachments must remain disabled rather than shipped insecurely. This is a phase-gate on a specific feature, not a foundation blocker.

---

## 8a. Homepage visual source of truth — OWNER-CONFIRMED

```text
HOMEPAGE_DESKTOP_VISUAL_REFERENCE = /design-reference/homepage-desktop-v1.png
VISUAL_REFERENCE_STATUS           = ACTIVE, OWNER APPROVED
VISUAL_REFERENCE_SCOPE            = Desktop homepage visual implementation only
```

**Status:** OWNER-CONFIRMED 2026-08-26. `/design-reference/homepage-desktop-v1.png` is the approved visual source of truth for the desktop homepage. The homepage implementation must reproduce this approved visual direction rather than inventing a new design.

**The reference image governs:** overall visual composition, section order and hierarchy, layout proportions, spacing rhythm, typography scale and hierarchy, color relationships, CTA placement, visual density, and general desktop presentation.

**Precedence:** this visual reference has higher authority than older textual design descriptions (`01-sources/DESIGN_DIRECTION.md`, `01-sources/HOMEPAGE_SPEC.md`, `01-sources/DESIGN_SYSTEM.md`, etc.) **specifically for homepage visual appearance**, wherever there is a direct visual conflict between the image and that older text. Those documents remain SUPERSEDED on visual-appearance points only, never wholesale.

**Textual requirements remain authoritative regardless of the visual reference** for: actual content, routing, SEO, accessibility, semantic HTML, localization, performance, functionality, data architecture, RFQ behavior, and Odoo integration. The image controls what the homepage looks like; the specialist documents (via `DOCS_INDEX.md`) still control what it says, how it's built, and how it behaves.

**Allowed adaptations (do not require owner approval):**

- Responsive adaptation for tablet, mobile, and other viewport widths — the reference is desktop-only.
- Technical adaptations required for accessibility, Core Web Vitals, responsive behavior, semantic markup, SEO, browser compatibility, or content-length differences between Persian/English/Arabic.
- All such adaptations must preserve the approved visual direction, not replace it.

**Not allowed without owner approval:** redesigning the homepage, inventing a different visual concept, changing the overall section hierarchy without a documented functional reason, substituting a generic template, reinterpreting the brand direction, or replacing the approved composition with a framework starter design.

**Immutability:** `/design-reference/` is immutable, same as `01-sources/`, `02-sources/`, `03-sources/`, and `/logo/` — never modify, replace, or regenerate `homepage-desktop-v1.png` itself. A new approved version would arrive as a new versioned file with a new owner decision, not an edit to this one.

---

## 9. Governance and reading order

```text
READING_ORDER = PROJECT_OVERRIDES.md → CLAUDE.md → DOCS_INDEX.md → DOCUMENT_AUDIT_REPORT.md → relevant source specification (03 > 02 > 01)
```

This override file controls only the decisions explicitly listed above. For everything else, apply the precedence rule directly: consult `DOCS_INDEX.md` to find the correct source document(s), and where more than one layer covers the same subject, the newest layer wins per document, reconciled by subject.

---

## 10. Explicitly NOT confirmed — do not invent

The following remain genuinely unresolved after the 2026-08-26 owner sign-off round. Per `CLAUDE.md`, Claude Code must never invent business facts, contact data, or credentials for any of these:

- Company phone number (candidate exists, not confirmed — §7.2), email, WhatsApp, business hours
- Company legal entity name, registration/tax ID, invoicing identity
- Board/leadership information
- Odoo deployed version, installed modules, exact API protocol, exact model/field mapping (§3 — confirmed as an integration-phase gate, not a blocker, but the values themselves remain unknown)
- Attachment-scanning provider/pipeline (§8 — confirmed as a pre-production gate, not a foundation blocker, but unselected)
- Final Persian/Arabic font family licensing (font architecture itself needs redesign — see `DOCUMENT_AUDIT_REPORT.md` DAR-017)
- Analytics provider specifics: GTM container ID, GA4 property ID, Search Console verification value (§5 — architecture confirmed required, values still pending)
- Any customer testimonial, project case study, or evidence asset

`01-sources/PROJECT_BRIEF.md` §21 and `02-sources/PROJECT_BRIEF.md` §29 list most of these as open `TBD` items requiring the owner. Treat every item above as unresolved until the project owner supplies it directly.

---

## 11. Phase 1 foundation — blocker classification

**Status:** OWNER-CONFIRMED 2026-08-26. Per the owner's explicit sign-off, the following are **not blockers** for Phase 1 foundation implementation (routing/locale architecture, design system, content model, D1/R2/Queues scaffolding, catalog/pricing UI, RFQ intake UI, CMS structure):

- Multilingual (fa/en/ar) architecture — §1
- Public catalog architecture — §4
- Public pricing architecture — §4
- Company address — §7.1 (confirmed)
- Odoo's existence and intended role as commercial system of record — §3
- GTM/GSC architectural requirement — §5
- Logo source-asset location (`/logo/`) — §6.1
- Attachment-scanning implementation (deferred to a pre-production gate) — §8
- Homepage desktop visual direction — §8a (`/design-reference/homepage-desktop-v1.png` is now the approved reference; homepage implementation is not yet authorized to begin under this decision alone — see `CLAUDE.md` for the read-before-implementing requirement)

**Only genuinely unresolved information required for the immediate implementation phase should be treated as a blocker.** As of this sign-off, that means:

- The specific values behind confirmed-required architecture (GTM container ID, Odoo version/mapping, attachment scanning provider) block only the narrow feature/integration work that needs the actual value — not the surrounding foundation.
- Company phone (§7.2) blocks only production *publication* of a phone number, not foundation work.
- Missing approved English/Arabic content (§1) blocks *publishing* those locale pages, not building the locale architecture that will serve them.
- The `/steel-products` vs `/steel` route-naming reconciliation (`DOCUMENT_AUDIT_REPORT.md` DAR-016) blocks finalizing that specific route pattern, not the rest of the foundation.

---

## 12. Maintenance rule

Update this file only when a new cross-project decision is explicitly confirmed by the project owner, or when a conflict between source layers is newly discovered and resolved by precedence. Do not duplicate specialist-document detail here — this file holds only the decisions that must be visible before any specialist document is read.

---

**End of `PROJECT_OVERRIDES.md`**
