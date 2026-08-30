/**
 * Verified Odoo object mapping — closes DOCUMENT_AUDIT_REPORT.md DAR-013
 * for the RFQ → Odoo path. Every fact below was checked directly against
 * the live `ahanassa` database (Odoo 19.0-20260528, container
 * `odoo-ahantorob`) on 2026-08-28 — see DAR-026 for the full evidence
 * trail (installed-module query, `ir_model_fields` inspection, `ir_model`
 * search for any existing RFQ/request/inquiry model). Nothing here is
 * carried over unverified from the pre-audit provisional table.
 *
 * Updated 2026-08-29 (DAR-027, staging connectivity provisioning):
 * RFQ_REFERENCE_MAPPING was redesigned from the ir.model.data mechanism
 * DAR-026 verified to a dedicated crm.lead field + real Postgres UNIQUE
 * constraint, specifically to avoid granting the integration user
 * `base.group_erp_manager`. See RFQ_REFERENCE_MAPPING below and
 * odoo-modules/ahanassa_website_rfq/ for the full rationale and live
 * verification trail.
 *
 * Centralized per 01-sources/DATA_ARCHITECTURE(1).md §21 ("Do not
 * hardcode these mappings across the application") — lib/odoo/adapter.ts
 * is the only file that should import from here.
 */

/** Installed, verified against `ir_module_module.state = 'installed'` in `ahanassa`. */
export const VERIFIED_INSTALLED_MODULES = [
  "base",
  "contacts",
  "crm",
  "sale",
  "sale_management",
  "sale_crm",
  "product",
  "uom",
  "mail",
  "portal",
  "website",
  "website_crm",
  "rpc", // provides the /json/2/<model>/<method> bearer-auth API this adapter uses
  "api_doc",
  "cyan_crm_reference", // custom: permanent crm.lead.opportunity_no sequence, prefix "AHT-OPP-%(year)s-"
  "cyan_crm_reference_account",
  "cyan_crm_reference_sale",
  "ahanassa_weekly_backup", // custom: unrelated to this integration (backup tooling)
  "ahanassa_website_rfq", // custom: this project's own module (odoo-modules/ahanassa_website_rfq); installed 2026-08-29, DAR-027 — see RFQ_REFERENCE_MAPPING
] as const;

/**
 * Present on disk under /opt/odoo/addons on the shared host but NOT
 * installed in `ahanassa` — confirmed via `ir_module_module`, not assumed
 * from filesystem presence (the task's own stated trap). Do not treat
 * these as available.
 */
export const PRESENT_BUT_NOT_INSTALLED = [
  "crm_lead_contacts", // "multiple contacts per opportunity" — belongs to a different tenant (author: SiPanel)
  "cyan_crm_reference_project",
  "dms",
  "enhanced_document_management",
  "message_center",
  "odoo_sms_batch",
  "sms_gateway",
  "contact_whatsapp",
  "product_percentage_price",
] as const;

/**
 * Customer/person-or-company mapping — VERIFIED.
 * Model: res.partner (contacts, installed).
 *
 * Verified fields (ir_model_fields, model='res.partner'): name,
 * display_name, is_company, company_type, parent_id, commercial_partner_id,
 * phone, email, email_normalized (computed), phone_sanitized (computed),
 * lang, country_id, state_id, city, street, active, ref (Char, INDEXED —
 * Odoo's native "Reference" field, an appropriate existing place for a
 * future website-issued customer identifier; not required for RFQ-only
 * sync and not written to by this phase), function, comment, category_id,
 * vat, company_registry, type, website.
 *
 * NOT present on this res.partner (verified by omission from a targeted
 * field query — do not assume it exists because base Odoo usually has
 * it): `mobile`. Only `phone` exists. Any future UI/API field named
 * "mobile" maps to Odoo `phone`, not a second Odoo field.
 */
export const PARTNER_MAPPING = {
  model: "res.partner",
  fields: {
    fullName: "name",
    email: "email",
    phone: "phone", // verified: this install has no separate `mobile` field
    parentCompany: "parent_id",
    isCompany: "is_company",
    externalReference: "ref", // available, not written in this phase
  },
  dedup: {
    // Odoo-maintained computed fields, verified present. Matching strategy
    // deliberately does not attempt to replicate Odoo's phone_sanitized
    // (E.164 + country-context) algorithm client-side — that would be a
    // guess, and a wrong guess risks a FALSE match (merging two different
    // customers), which is worse than the safe fallback of creating a new
    // partner. Email is matched via a conservative lowercase+trim
    // normalization only (Odoo's own email_normalized is stable and
    // well-documented for this case). Ambiguous (>1) or absent-email
    // matches never auto-merge — see lib/odoo/adapter.ts.
    strategy: "email_normalized (best-effort lowercase+trim) only; phone is not auto-matched",
    unresolvedGate: "Exact Odoo email_normalized/phone_sanitized normalization algorithms were not re-derived from source in this pass — treat any phone-based matching as a future enhancement, not a Phase-1 capability.",
  },
} as const;

/**
 * RFQ parent record mapping — VERIFIED model, with two OPEN staff-workflow
 * decisions (not blockers for a safe adapter — see below).
 * Model: crm.lead (crm + sale_crm + website_crm installed).
 *
 * Verified: crm.lead.type is required; the only value present in the
 * live database today is "opportunity" (1 existing record, 0 "lead").
 * crm.lead.opportunity_no (custom, from cyan_crm_reference) is
 * readonly/permanent/unique/indexed and is Odoo's OWN internal reference
 * (format "AHT-OPP-<year>-NNNNNN") — the adapter must never attempt to
 * write it; `create()` silently overwrites any supplied value with the
 * next sequence number unless called with an internal backfill context
 * this integration must never use.
 */
export const RFQ_HEADER_MAPPING = {
  model: "crm.lead",
  type: "opportunity", // verified: the only type value in active use in this database
  fields: {
    name: "name", // required; adapter embeds the website reference here for staff visibility
    partnerId: "partner_id",
    contactName: "contact_name",
    email: "email_from",
    phone: "phone",
    description: "description", // HTML; human-readable RFQ summary only, see RFQ_LINE_MAPPING
    teamId: "team_id", // RESOLVED for staging — see below
  },
  openDecisions: {
    teamId:
      'RESOLVED for staging, 2026-08-29 (DAR-027): crm.team "Website" (id 2) remains INACTIVE and was not reactivated per this task\'s explicit instruction; crm.team "Sales" (id 1, verified active) was configured as ODOO_CRM_TEAM_ID for the staging Cloudflare Worker (wrangler.jsonc env.staging.vars). getOdooCrmTeamId() (adapter.ts) still treats this as optional config — when unset, team_id is omitted and Odoo applies its own default. Revisit only if the owner later wants a dedicated "Website" pipeline reactivated.',
    leadVsOpportunity:
      'This database has never used crm.lead.type="lead" (only "opportunity", and only 1 record total) — it is unclear whether this business intentionally skips the Leads pipeline stage or whether Leads simply are not yet enabled as a feature. Defaulting to "opportunity" matches observed usage; revisit if the owner enables a Leads-first qualification workflow.',
  },
} as const;

/**
 * RFQ line-item mapping — genuinely UNRESOLVED as a structured Odoo store.
 * Verified: no model anywhere in `ir_model` has "rfq", "request",
 * "inquiry", or "enquiry" in its technical name (excluding unrelated
 * matches: base.module.install.request, crm.iap.lead.mining.request,
 * stock.request.count). No structured line-item model exists, native or
 * custom, in the live database.
 *
 * Per 01-sources/TECHNICAL_ARCHITECTURE.md §14.3 ("Free-text CRM notes
 * are not an acceptable final store for all RFQ lines. Any approved
 * temporary fallback MUST keep structured JSON in D1 and include a
 * migration path") this is exactly that pre-approved fallback, not an
 * ad hoc decision: D1 `rfq_items` remains the sole authoritative
 * structured store; Odoo receives only a human-readable plaintext
 * summary in crm.lead.description, explicitly labeled as non-structured.
 * Do NOT build a custom Odoo line model in this pass — see the module
 * proposal below for what that would require if ever approved.
 */
export const RFQ_LINE_MAPPING = {
  status: "REQUIRES_CUSTOM_MODEL — not built; documented fallback in use",
  fallback:
    "Human-readable plaintext line summary appended to crm.lead.description. D1 rfq_items is the sole authoritative structured source; Odoo staff needing structured line data must use the website reference to look up the RFQ, not crm.lead itself.",
} as const;

/**
 * Public RFQ reference + idempotency — RESOLVED via a dedicated custom
 * field, deployed 2026-08-29 (DAR-027, supersedes the earlier
 * ir.model.data-based design below).
 *
 * History: the first verified design (DAR-026, 2026-08-28) used Odoo's
 * native `ir_model_data` external-ID table (a real UNIQUE index on
 * (module, name)) since crm.lead/res.partner had zero `x_...` custom
 * fields at the time. That design was abandoned before any credential was
 * issued: in this install, only `base.group_erp_manager` ("Access
 * Rights") grants any access to `ir.model.data`, and that group also
 * grants full CRUD (including unlink) on 28 other technical/admin models
 * (res.groups, ir.model.access, ir.model.fields, res.users, res.company,
 * ...) — a disproportionate blast radius for a website-integration API
 * key whose only real need was one narrow idempotency check.
 *
 * Current design: `odoo-modules/ahanassa_website_rfq` (deployed and
 * installed live, verified via `pg_constraint`) adds
 * `crm.lead.x_website_rfq_reference` (Char, readonly, indexed) with a
 * real Postgres UNIQUE constraint (`crm_lead_uniq_x_website_rfq_reference`
 * — Odoo 19 uses `models.Constraint`, not the deprecated
 * `_sql_constraints` list; see that module's README for the live
 * confirmation trail). The adapter sets this field to the website's public
 * `AA-RFQ-...` reference at create time and searches on it first — same
 * idempotency guarantee strength as the old ir_model_data design (a real
 * DB-level UNIQUE constraint, safe under Cloudflare Queues' at-least-once
 * redelivery even if the D1-side `integration_mappings` check, the
 * primary guard in lib/queue/consumer.ts, were ever bypassed by a partial
 * failure) — but the integration user only needs ordinary
 * `sales_team.group_sale_salesman`-level crm.lead access to use it, no
 * elevated technical group.
 *
 * Improvement over the old design: this field IS staff-visible/searchable
 * in the normal CRM UI (a real crm.lead field, not a Developer-Mode-only
 * technical table), not just embedded as unstructured text in `name`/
 * `description` as the old design's documented fallback required.
 */
export const RFQ_REFERENCE_MAPPING = {
  status: "RESOLVED — dedicated crm.lead field + Postgres UNIQUE constraint, verified live 2026-08-29 (DAR-027)",
  model: RFQ_HEADER_MAPPING.model,
  field: "x_website_rfq_reference",
  module: "ahanassa_website_rfq",
  constraintName: "crm_lead_uniq_x_website_rfq_reference",
  staffVisibleFallback: "Reference also embedded in crm.lead.name and crm.lead.description as readable (non-constrained) text, same as before.",
} as const;

/**
 * Catalog mapping — REMOVED (DOCUMENT_AUDIT_REPORT.md DAR-034), superseding
 * DAR-033's `CATALOG_CATEGORY_MAPPING`/`CATALOG_PRODUCT_MAPPING`/
 * `PRODUCT_VARIANT_MAPPING`/`UOM_MAPPING`/`ATTRIBUTE_MAPPING`/
 * `MANUFACTURER_MAPPING` constants, which mapped generic Odoo ORM models
 * (`product.category`/`product.template`/`product.product`/`uom.uom`) for
 * use with the JSON-2 `search_read` transport below. That approach is now
 * both unnecessary and architecturally forbidden for catalog data: a
 * dedicated, deliberate Odoo Public Catalog API v1 exists
 * (docs/integrations/odoo/catalog-v1/) and is the sole authoritative
 * integration boundary for catalog sync — see lib/catalog/odoo-api-client.ts
 * (the HTTP client) and lib/catalog/sync.ts (the sync-planning logic) for
 * the real mapping between that API's fields and the Website Catalog model.
 * This file (`lib/odoo/mapping.ts`) remains scoped to the RFQ sync path
 * only, unchanged by this removal.
 */
