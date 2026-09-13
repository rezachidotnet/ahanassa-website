# PROJECT_OVERRIDES.md

## Ahan Asa Website — Current Binding Cross-Project Overrides

**Project:** Ahan Asa | آهن آسا
**Domain:** `https://www.ahanassa.com`
**ERP:** `https://odoo.ahanassa.com`
**Document role:** Highest-authority record of confirmed decisions that supersede conflicting statements anywhere in the active `01-sources/` corpus or older historical source-layer references
**Status:** Active — owner sign-off received on the findings this file previously flagged as unconfirmed; homepage visual reference registered; customer account/portal future-phase architecture registered 2026-08-28; Odoo RFQ-path version/mapping verified against the live environment 2026-08-28; production D1 jurisdiction (EU) confirmed and production D1 provisioned 2026-08-29; §7.2 phone status corrected 2026-09-13 to reflect the already-live 2026-09-02 owner confirmation (FOOTER-P1)
**Version:** 2.4.1
**Last updated:** 2026-09-13

---

## 0. How this file came to exist

**HISTORICAL / SUPERSEDED CONTEXT:** this file was originally reconstructed (v1.0.0) from an earlier three-layer source export that used `03-sources > 02-sources > 01-sources` precedence. That historical precedence model is no longer active. The current authority order is `PROJECT_OVERRIDES.md` → `CLAUDE.md` → `01-sources/` → verified implementation facts.

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

**Status:** OWNER-CONFIRMED 2026-08-26. The Ahan Asa website will launch in Persian, English, and Arabic. Persian is the primary/default language. This requirement is authoritative anywhere older documentation still describes a Persian-only launch — see `DOCUMENT_AUDIT_REPORT.md` DAR-008, now closed.

**Supersedes:** the Persian-only launch requirement in `01-sources/PROJECT_BRIEF.md` §6.1, `01-sources/README.md`, ADR-003 in `01-sources/DECISIONS.md`, and any "future locale reservation" framing in the current `01-sources/` SEO, metadata, structured-data, internal-linking, sitemap/robots, testing, and SEO-QA documents. All of the above are **SUPERSEDED** on this specific point; their non-locale content is unaffected.

**Binding requirement:** the locale architecture (routing, content model, CMS publication states, metadata, SEO, forms/RFQ, QA) must be designed from the beginning for `fa`/`en`/`ar` — not retrofitted later.

**Do not fabricate content to satisfy this:** do not create machine-generated or fake "final" English/Arabic translations merely to populate the site. Missing approved English or Arabic content is an acknowledged **content-production dependency**, not a reason to publish placeholder/machine-translated text as if it were final copy. Build the multilingual architecture now; gate publication of a given locale/page on real approved content per `01-sources/CMS_ARCHITECTURE.md`'s publication-state model.

**hreflang:** `x-default` → the unprefixed Persian route. Historical/reference mockup material already modeled fa/en/ar hreflang alternates and a language switcher; use that only as reference, not as a source of final copy or business facts.

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

- Vercel hosting references in older/current documentation are superseded by the confirmed Cloudflare Workers + Static Assets production platform.
- Any active instruction selecting `@opennextjs/cloudflare` or OpenNext for launch is superseded. The live scaffold has already chosen `vinext` — a fact on the ground, not an open decision. See `DOCUMENT_AUDIT_REPORT.md` DAR-005.

---

## 3. Commercial architecture — Odoo, D1, R2, Queues

```text
ODOO_IS_INTENDED_COMMERCIAL_SOURCE_OF_TRUTH  = true   (where appropriate — see scope note below)
ODOO_VERSION_CONFIRMED                       = true   (19.0-20260528 — verified 2026-08-28, RFQ sync path only; see below)
PUBLIC_RENDERING_SYNCHRONOUS_ODOO_DEPENDENCY = false
RFQ_DURABLE_FIRST_CAPTURE                    = true   (D1 + transactional outbox, before Odoo sync)
DATABASE                                     = Cloudflare D1 (two production databases: DB_PUBLIC, DB_OPS)
OBJECT_STORAGE                               = Cloudflare R2 (separate public-media and private-attachment buckets)
ASYNC_INTEGRATION                            = Cloudflare Queues + Dead Letter Queue
NO_PUBLIC_DATABASE_AT_LAUNCH (ADR-011)       = SUPERSEDED
```

**Status:** OWNER-CONFIRMED 2026-08-26 (Odoo's role and scope boundary). RFQ-path version/module/protocol/mapping details verified 2026-08-28 by read-only audit of the live `odoo.ahanassa.com` environment. Closes `DOCUMENT_AUDIT_REPORT.md` DAR-013 for the RFQ sync path (DAR-026); catalog/pricing sync mapping remains a separate, still-open future gate.

**Odoo's role, as confirmed by the owner:** `odoo.ahanassa.com` is the project's ERP integration endpoint. Odoo is intended to own the appropriate business-domain data — customers, CRM, quotations, sales, and commercial product/price data — where appropriate. The website owns presentation, SEO, and RFQ intake. Public rendering must never synchronously depend on Odoo; an accepted RFQ must be durably persisted in D1 before Odoo sync.

**Verified 2026-08-28 (`DOCUMENT_AUDIT_REPORT.md` DAR-026, read-only live-environment audit — full evidence in `lib/odoo/mapping.ts`):**

- Odoo deployed version: **19.0-20260528**, database `ahanassa` (container `odoo-ahantorob`, confirmed the actual target of `odoo.ahanassa.com` via the reverse-proxy chain — the container's own name is not indicative).
- Installed modules relevant to RFQ sync: `base`, `contacts`, `crm`, `sale`, `sale_management`, `sale_crm`, `product`, `uom`, `mail`, `portal`, `website`, `website_crm`, `rpc`, `api_doc`, plus custom `cyan_crm_reference`/`cyan_crm_reference_account`/`cyan_crm_reference_sale` — verified against the live database's `ir_module_module`, not assumed from addon files present on the shared host disk (several present-but-not-installed modules were found, confirming the two can genuinely diverge on this host).
- API/integration protocol: `POST /json/2/<model>/<method>`, `auth='bearer'` — the real Odoo 19 "JSON-2" external API (module `rpc`, installed). This corrects, not merely confirms, the prior documentation's guessed `/api/v2/call` envelope.
- Odoo model/field mapping for the RFQ sync path (customer, RFQ header, RFQ lines, public reference, idempotency): verified — see `lib/odoo/mapping.ts` for the complete evidence-annotated matrix and `DOCUMENT_AUDIT_REPORT.md` DAR-026 for the summary table.

**Still genuinely unconfirmed — do not assume, do not guess:**

- Catalog/product/price sync model/field mapping (`pullCatalog`/`pullPublicPrices`) — out of the RFQ-only scope of the 2026-08-28 audit; `product`/`uom` modules are confirmed installed but their field-level mapping was not investigated.
- Whether/when a dedicated Odoo integration user and API key will be provisioned — none exists today (verified: `res_users_apikeys` is empty); creating one is an infrastructure step for the owner/Odoo admin, not something this project's code can or should do itself.
- Which `crm.team` should own website RFQs — the only team named "Website" is verified **inactive**; only "Sales" is active. `ODOO_CRM_TEAM_ID` is left unconfigured pending that decision (`lib/odoo/mapping.ts` `RFQ_HEADER_MAPPING.openDecisions`).

**Source:** `01-sources/PROJECT_BRIEF.md`, `01-sources/TECHNICAL_ARCHITECTURE.md`, `01-sources/DATA_ARCHITECTURE(1).md`, `01-sources/DATABASE_SCHEMA.md`. Older static, database-free, Odoo-free brochure/lead-gen statements (`ADR-011`; `ADR-007`: CMS deferred) are superseded per §4 below and `DOCUMENT_AUDIT_REPORT.md` DAR-003/DAR-004.

---

## 4. Public product and pricing catalog — OWNER-CONFIRMED

```text
PUBLIC_PRODUCT_CATALOG = confirmed
PUBLIC_PRICING         = confirmed
PRICE_DATA_SOURCE      = Odoo, synchronized/cached into the Cloudflare website data layer (D1)
PRICE_RENDERING        = from the cached/synchronized D1 projection — never a synchronous live Odoo call
```

**Status:** OWNER-CONFIRMED 2026-08-26. The website will include a public steel product/catalog and public pricing architecture. This explicitly **supersedes** the older `01-sources` prohibition on a public price catalog (`01-sources/ROUTES.md` §4.5 banned `/prices`, `/daily-prices`, `/live-prices`; `01-sources/SEO_KEYWORD_MAP.md` §12 excluded live-price keyword territory entirely). Those prohibitions are now **SUPERSEDED**.

**What this does not change:** public rendering must still never depend on a synchronous live Odoo request (§3 above). Public product/price data must be synchronized or cached into the Cloudflare D1 layer per the approved architecture (`01-sources/TECHNICAL_ARCHITECTURE.md` §11, `01-sources/DATABASE_SCHEMA.md` catalog/price tables) — never fetched live from Odoo on the request path. Freshness/staleness rules, price qualification, and "never fabricate price/stock" rules from `CLAUDE.md` remain fully in force.

**Route-naming note (still open, not resolved by this sign-off):** `01-sources/ROUTES.md` uses `/steel-products/[category-slug]` while the 02-layer catalog documents use `/steel/{category}/{product}/{variant}` — this naming reconciliation is unrelated to the scope confirmation above and remains open. See `DOCUMENT_AUDIT_REPORT.md` DAR-016.

**Source of the original scope-expansion finding:** `01-sources/DATABASE_SCHEMA.md`: *"If an older document says that the website has no database... or excludes catalog/pricing/RFQ persistence, that statement is superseded by the approved Cloudflare + Odoo architecture described here."* Closes `DOCUMENT_AUDIT_REPORT.md` DAR-003's "flagged for owner visibility" note.

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

- **`/logo/` is immutable, same as `01-sources/`.** Do not modify, redraw, recreate, or substitute these originals.
- Do not treat the absence of a favicon/OG/optimized derivative as license to regenerate the logo from scratch — derive from these source files only.
- Production derivatives (optimized formats, sizes, favicon, OG image, etc.) may be generated later under `/public/brand/` if format conversion or optimization is required for the live site. That derivative-generation step is implementation work, not a documentation concern, and is not part of this sign-off.

### 6.2 AI-generated and licensed media

Unchanged from v1.0.0 — corroborated independently by `01-sources/MEDIA_GUIDELINES.md` §29 (non-evidentiary conceptual AI imagery allowed; never presented as a real completed project/employee/facility). Historical `03-sources` references to this point are superseded as active authority.

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

**Status:** OWNER-CONFIRMED 2026-08-26. Use the Persian form as the primary source wording; the English form is a reference translation for the `en` locale. This closes the address portion of `DOCUMENT_AUDIT_REPORT.md` DAR-001 — the value was previously flagged only as an unverified candidate sourced from a design mockup; the owner has now confirmed it directly.

### 7.2 Phone — OWNER-CONFIRMED 2026-09-02

```text
CONTACT_PHONE_E164 = +989120656528   (confirmed for production use)
```

**Status:** OWNER-CONFIRMED 2026-09-02, in-session, during an RFQ/UX polish task — recorded directly in `lib/content/contact-channels.ts` at the time. This entry was not updated when that confirmation happened; it still described the number as open until this narrow correction (FOOTER-P1, `docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md`), which closes only that documentation-currency gap and changes nothing else in this file.

**Superseded historical candidate (never confirmed, never published):** `۰۳۱۳۵۱۳۴`, sourced from the same design mockup as the address (§7.1) — an 8-digit fragment (short for a standard Isfahan landline), kept here only as historical context, not as a live value.

**Single source of truth:** `lib/content/contact-channels.ts` (`CONTACT_PHONE_E164 = "+989120656528"`). Reused — never re-hardcoded — by Hero, Header, the mobile nav drawer, `FinalCta`, and, as of FOOTER-P1, `SiteFooter`. Import the constant; do not duplicate the value.

**Known remaining drift, not resolved by this entry:** §10 below still lists the phone number among "Explicitly NOT confirmed" items. That line is now stale and is left untouched here deliberately — reconciling §10 is a separate, still-open documentation task, out of this narrow correction's scope.

---

## 8. Attachment security

```text
ATTACHMENT_SCANNING_BLOCKS_FOUNDATION = false
ATTACHMENT_SCANNING_BLOCKS_PRODUCTION_UPLOADS = true
```

**Status:** OWNER-CONFIRMED 2026-08-26. Attachment malware/content scanning for RFQ file uploads is **not** a blocker for foundation implementation (routing, forms UI, D1/R2 scaffolding, non-upload-enabled pages). It **remains a required security decision** that must be resolved — provider selected, pipeline implemented and approved — before production RFQ file uploads are actually enabled. Per `CLAUDE.md` §19 and `01-sources` security guidelines: if the attachment security pipeline is not approved/implemented when this feature is reached, attachments must remain disabled rather than shipped insecurely. This is a phase-gate on a specific feature, not a foundation blocker.

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

**Immutability:** `/design-reference/` is immutable, same as `01-sources/` and `/logo/` — never modify, replace, or regenerate `homepage-desktop-v1.png` itself. A new approved version would arrive as a new versioned file with a new owner decision, not an edit to this one.

**Superseded 2026-08-28 — see §8b below.** This section is kept as the historical record of the 2026-08-26 decision; it no longer states the active visual authority.

---

## 8b. Visual source of truth — SUPERSEDED to the approved v0 implementation — OWNER-CONFIRMED

```text
VISUAL_AUTHORITY                  = /Users/reza/Developer/ahanassa-v0  (local reference project, not deployed)
VISUAL_AUTHORITY_STATUS           = ACTIVE, OWNER APPROVED, 2026-08-28
VISUAL_AUTHORITY_SCOPE            = Whole public site — homepage, header, footer, interior pages, product pages, CTA visual treatment, responsive behavior
SUPERSEDES                        = §8a (design-reference/homepage-desktop-v1.png)
homepage-desktop-v1.png STATUS    = HISTORICAL / REFERENCE ONLY — not the active visual target, not deleted
```

**Status:** OWNER-CONFIRMED 2026-08-28. The owner has explicitly approved the current implementation at `/Users/reza/Developer/ahanassa-v0` as the authoritative visual/UI reference for the Ahan Asa website, superseding §8a. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-021 (and DAR-020 for the prior fabricated-content findings that still apply unchanged).

**The approved v0 implementation governs:** overall visual language, homepage composition, header appearance, footer appearance, section layout, spacing, card style, border treatment, typography hierarchy, color application, imagery treatment, buttons, interaction patterns, responsive visual behavior, interior-page visual patterns, product-page visual patterns, and CTA visual treatment — for the whole site, not homepage-only.

**v0 is explicitly NOT authoritative for:** company facts, legal entity details, phone numbers, email addresses, business statistics, product catalog data, prices, markets served, years of experience, tonnage, customer counts, certifications, service claims, RFQ behavior, or commercial promises. Those remain governed by canonical documentation exactly as before (§10 below, `CLAUDE.md` §7). `ahanassa-v0`'s own content layer (`lib/site.ts`) was already found to fabricate exactly these categories of fact — see `DOCUMENT_AUDIT_REPORT.md` DAR-020 — and that finding is unchanged by this visual-authority decision. Never reintroduce content DAR-020 removed merely to match v0's appearance more closely; adapt the presentation of canonical content into the v0 visual block instead.

**Precedence, restated for this scope:**

- Visual/UI/layout/styling conflict → the approved v0 implementation wins.
- Business/functional/content/architecture/localization/SEO/RFQ/security/backend/Odoo conflict → canonical documentation wins, unchanged.
- Cloudflare/vinext/Workers/Vite/wrangler, `app/[locale]/` localized routing, and SEO infrastructure (metadata, robots, sitemap, structured data, server-rendered HTML) remain governed by the canonical repository regardless of v0's own Vercel/Next.js/flat-routing setup — only v0's *visual output* is authoritative, never its stack.

**Allowed adaptations (do not require further owner approval):** responsive/RTL/LTR adaptation, accessibility, Core Web Vitals, semantic markup, SEO, browser-compatibility, and fa/en/ar content-length adaptations that preserve — not replace — the approved v0 visual direction; adapting canonical content into a v0 visual block when the fit isn't exact.

**Not allowed without further owner approval:** reintroducing the pre-2026-08-28 (PNG-based) homepage composition where it conflicts with v0, inventing a visual concept not present in v0, or reproducing any of v0's fabricated business content.

**Immutability unchanged:** `/design-reference/homepage-desktop-v1.png` is still never modified, replaced, regenerated, or deleted — it is simply no longer the active visual target.

**Superseded (portability only) 2026-08-28 — see §8c below.** §8c does not change anything stated above; it removes this section's dependency on the external `ahanassa-v0` path existing. Every rule above still applies, read with "the approved v0 implementation" now meaning "the current canonical implementation, frozen from that source."

---

## 8c. Visual baseline frozen into the repository — external `ahanassa-v0` no longer required — OWNER-CONFIRMED

```text
VISUAL_AUTHORITY                  = this repository's current implementation (app/, components/) + design-reference/v0-approved/
VISUAL_AUTHORITY_STATUS           = ACTIVE, OWNER APPROVED, 2026-08-28
FROZEN_FROM                       = ahanassa-v0 (external, historical source input — path no longer required to exist)
FROZEN_FROM_MIGRATION_COMMITS     = 0d07d0b, b1d0841
PORTABLE_BASELINE_LOCATION        = design-reference/v0-approved/ (screenshots + README.md)
```

**Status:** OWNER-CONFIRMED 2026-08-28, same day as §8b. §8b established that the *approved v0 implementation* governs visual authority. This section confirms the same visual direction, now that it is fully integrated and validated in this repository (commits `0d07d0b`, `b1d0841`), is **frozen as a portable, version-controlled baseline** so no future task, agent, or CI environment needs the external `/Users/reza/Developer/ahanassa-v0` directory to exist.

**What changed:** nothing about the approved visual direction itself, its scope, or its precedence relative to business/functional/technical/SEO/localization/RFQ/Odoo documentation — all of §8b's rules stand unchanged. What changed is *where the authority lives*: previously "the approved v0 implementation" meant an external, local-only folder; it now means this repository's own `app/`/`components/` implementation, backed by the screenshot baseline in `design-reference/v0-approved/` (see that directory's `README.md` for capture methodology, viewport sizes, and what does/doesn't count as a regression).

**Practical effect for future work:**

- Do not require, reference as a dependency, or instruct an agent to read `/Users/reza/Developer/ahanassa-v0` — it may not exist in a given environment (a fresh clone, a CI runner, a different machine).
- To see the approved visual direction, read this repository's current implementation and/or `design-reference/v0-approved/`.
- `ahanassa-v0` remains documented as the historical origin of the design direction (§8b, `DOCUMENT_AUDIT_REPORT.md` DAR-020/DAR-021/DAR-022) — that history is not erased, only no longer a live dependency.

**Full audit trail:** `DOCUMENT_AUDIT_REPORT.md` DAR-022.

---

## 9. Governance and reading order

```text
READING_ORDER = PROJECT_OVERRIDES.md → CLAUDE.md → DOCS_INDEX.md → DOCUMENT_AUDIT_REPORT.md → relevant 01-sources specification → verified implementation facts
```

This override file controls only the decisions explicitly listed above. For everything else, consult `DOCS_INDEX.md` to find the correct `01-sources/` document(s), then verify implementation-sensitive facts against the repository before acting.

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

`01-sources/PROJECT_BRIEF.md` lists most of these as open `TBD` items requiring the owner. Treat every item above as unresolved until the project owner supplies it directly.

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

Update this file only when a new cross-project decision is explicitly confirmed by the project owner, or when a conflict between the root control layer, `01-sources/`, and verified implementation facts is newly discovered and resolved. Do not duplicate specialist-document detail here — this file holds only the decisions that must be visible before any specialist document is read.

---

## 13. Customer account, portal, and pricing/domain-separation architecture — OWNER-CONFIRMED, future-phase

```text
CUSTOMER_ACCOUNT_ARCHITECTURE_STATUS = ACCEPTED, future-phase — not a Phase 1 implementation authorization
CUSTOMER_PORTAL_STATUS               = ACCEPTED, future-phase — not a Phase 1 implementation authorization
GUEST_RFQ_REGISTRATION_REQUIRED      = false, permanently (not only until account phase ships)
RFQ_SCHEMA_CHANGE_MADE_BY_THIS_ENTRY = false — additive `account_id`/`customer_id` migration deferred to account phase
AUTHENTICATION_PROVIDER_SELECTED     = false — remains an open future decision
ODOO_IS_PRICING_SOURCE_OF_TRUTH      = true (reaffirms §4, unchanged)
PORTAL_LIVE_ODOO_READ_DEPENDENCY     = false, by architecture
PHYSICAL_DATABASE_SPLIT_AUTHORIZED   = false — logical domain separation only (DB_PUBLIC/DB_OPS unchanged)
```

**Status:** OWNER-CONFIRMED 2026-08-28. The project owner approved the future-phase conceptual architecture for customer identity/accounts, guest-RFQ-to-account linking, Odoo customer mapping, a Customer Portal, public-pricing read-model/edge-caching, and logical data-domain separation. Full detail lives in two new specialist documents: `01-sources/CUSTOMER_ACCOUNT_ARCHITECTURE.md` and `01-sources/CUSTOMER_PORTAL.md`. Formal decision record: `01-sources/DECISIONS.md` ADR-017.

**This is architecture, not an implementation authorization.** It does not move customer accounts or a portal into Phase 1 — `01-sources/PROJECT_BRIEF.md` §25 and `01-sources/DECISIONS.md` ADR-002 continue to exclude them from the current implementation phase. No authentication provider is selected, no schema migration is made, no Cloudflare resources are provisioned, and no UI is built by this entry. Its purpose is to let the already-implemented RFQ/catalog/pricing foundation (see §3–§4 above, `DOCUMENT_AUDIT_REPORT.md` DAR-023/DAR-024) avoid a disruptive redesign once the account/portal phase is eventually scoped.

**Binding highlights (full detail in the two specialist documents):**

- Guest RFQ submission requires no account and must never require one, permanently — not a temporary Phase 1 accommodation.
- Historical RFQ-to-account linking requires verified ownership of the RFQ's submitted contact channel; the RFQ reference number alone is never sufficient authorization (IDOR prevention).
- Identity is modeled as four distinct concepts (Auth Identity → Website Account → Customer → Odoo Partner mapping), not collapsed into one row, without prescribing physical table names now.
- The current RFQ schema (`migrations/0001_rfq_ops_schema.sql`) is confirmed compatible with a future nullable account link via a plain additive migration; that migration is not performed by this entry.
- A future Website Customer maps to Odoo `res.partner` through the existing `integration_mappings` mechanism and existing deduplication rule (§3 above) — a new Odoo partner must never be created on every RFQ.
- Customer Portal MVP scope (profile, RFQ history, RFQ detail/status) is explicitly separated from future capabilities (quotations, orders, invoices, documents, repeat RFQ, saved details); only the MVP list is even eligible for a first implementation milestone once approved.
- The portal must never depend on live/synchronous Odoo reads — it follows the same D1-read-model-plus-async-sync pattern already used for RFQ intake and public pricing.
- Odoo remains the single pricing source of truth (reaffirms §4); public price pages continue to render from the D1 read model behind Cloudflare edge cache, with granular (`price:<variant-id>`/`product:<product-id>`/category) invalidation preferred over global purge.
- Logical data-domain separation (RFQ/ops, catalog, pricing, content) is reaffirmed; `DB_PUBLIC`/`DB_OPS` remain two physical databases — no further physical split is authorized now.
- The staging D1 database's default `WEUR` placement remains explicitly **not** a production jurisdiction decision (reaffirms `DOCUMENT_AUDIT_REPORT.md` DAR-024); production D1/R2 jurisdiction remains an open gate, and the staging database must never be promoted to production. **Superseded 2026-08-29 — see §14 below: the owner has now confirmed the production jurisdiction.** This bullet is kept as the historical record of the gate that was open at the time this section (§13) was written.

**Not confirmed by this entry — do not invent:** the authentication provider; the exact account/customer physical schema; the exact Odoo `res.partner` mapping mechanics (still gated on Odoo module inspection, §3/DAR-013); the production D1/R2 jurisdiction policy; any multi-contact/company-account UI.

**Source:** `01-sources/CUSTOMER_ACCOUNT_ARCHITECTURE.md`, `01-sources/CUSTOMER_PORTAL.md`, `01-sources/DECISIONS.md` ADR-017. Full audit trail: `DOCUMENT_AUDIT_REPORT.md` DAR-025.

---

## 14. Production data jurisdiction — OWNER-CONFIRMED

```text
PRODUCTION_D1_JURISDICTION                    = eu
FUTURE_CUSTOMER_ATTACHMENT_R2_JURISDICTION    = eu   (policy only — bucket not yet created)
STAGING_WEUR_PLACEMENT_IS_PRODUCTION_POLICY   = false, was never true (reaffirmed, not reversed)
```

**Status:** OWNER-CONFIRMED 2026-08-29. The project owner has approved `eu` as the production D1 jurisdiction, closing the gate that `DATABASE_SCHEMA.md` §18 ("Data location") and `DOCUMENT_AUDIT_REPORT.md` DAR-024/DAR-031 left explicitly open. The same `eu` policy is approved in advance for the future customer-upload R2 bucket (`RFQ_ATTACHMENTS`) — but that bucket is **not** created by this decision; attachment upload remains gated on the separate, still-unresolved scanning-pipeline decision (`PROJECT_OVERRIDES.md` §8, unchanged).

**What this closes:** production `DB_OPS` may now be provisioned under `eu` jurisdiction — and has been: `ahanassa-ops-production` (UUID `7240a6a7-c293-4e6e-baf3-95838a3c2944`, `running_in_region: EEUR`, verified `jurisdiction: eu` via `wrangler d1 info`) was created and migrated per `DOCUMENT_AUDIT_REPORT.md` DAR-032. This is a **new, empty database** — never a promotion, rename, or data copy of the staging D1 (`ahanassa-ops-staging`, no jurisdiction set, automatic `WEUR` placement). Cloudflare D1 jurisdiction is immutable after creation; this decision cannot be silently revised later without recreating the database.

**What this does not close:** the future R2 bucket itself (not created — attachment scanning remains unapproved, §8); production Queue/DLQ producer-consumer wiring to a deployed Worker (no production Worker has been deployed); production secrets (`ODOO_API_KEY`, `TURNSTILE_SECRET_KEY` — not provisioned for `env.production`); the unrelated `ahanassa-odoo-backups` R2 bucket (Odoo-server-side backup infrastructure, outside this website-storage decision, not affected by or relevant to this jurisdiction policy).

**Source:** owner decision recorded via this task's instructions, 2026-08-29. Full audit trail and provisioning evidence: `DOCUMENT_AUDIT_REPORT.md` DAR-032 (supersedes DAR-031's "returned to owner" jurisdiction gate with the approved decision, without rewriting DAR-031's own historical record).

---

**End of `PROJECT_OVERRIDES.md`**
