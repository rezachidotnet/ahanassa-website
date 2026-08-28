/**
 * Verified Odoo object mapping — closes DOCUMENT_AUDIT_REPORT.md DAR-013
 * for the RFQ → Odoo path. Every fact below was checked directly against
 * the live `ahanassa` database (Odoo 19.0-20260528, container
 * `odoo-ahantorob`) on 2026-08-28 — see DAR-026 for the full evidence
 * trail (installed-module query, `ir_model_fields` inspection, `ir_model`
 * search for any existing RFQ/request/inquiry model). Nothing here is
 * carried over unverified from the pre-audit provisional table.
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
    teamId: "team_id", // OPEN — see below
  },
  openDecisions: {
    teamId:
      'crm.team "Website" (id verified to exist) is INACTIVE in the live database; crm.team "Sales" is the only currently-active team. Reactivating "Website" or explicitly choosing "Sales" is an Odoo configuration decision, not something Stage A read-only discovery or this adapter may decide silently. ODOO_CRM_TEAM_ID is left unset by default — when unset, team_id is omitted from the create call and Odoo applies its own default assignment for the integration user. Set it only after the owner/Odoo admin confirms which team should own website RFQs.',
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
 * Public RFQ reference + idempotency — RESOLVED via a native mechanism
 * plus a documented custom-field follow-up.
 *
 * Verified: crm.lead and res.partner have ZERO `x_...` custom fields (a
 * direct `ir_model_fields` query for `name LIKE 'x_%'` on both models
 * returned 0 rows) — there is no existing field to hold the website's
 * AA-RFQ-... reference or a raw idempotency key. `opportunity_no` cannot
 * be (ab)used — see RFQ_HEADER_MAPPING above.
 *
 * Verified native mechanism: `ir_model_data` has a real UNIQUE index on
 * (module, name) — `ir_model_data_module_name_uniq_index` — confirmed via
 * `pg_indexes`. This is Odoo's own external-ID system (the same
 * mechanism XML data files and import tooling use for idempotent
 * upsert). Using module="ahanassa_website", name=`rfq_<localRfqId>` gives
 * a genuinely idempotent, uniquely-constrained, zero-schema-change
 * lookup: "does a lead already exist for this RFQ?" — safe under
 * Cloudflare Queues' at-least-once redelivery even if the D1-side
 * `integration_mappings` check (the primary guard, already implemented in
 * lib/queue/consumer.ts) were ever bypassed by a partial failure.
 *
 * Limitation, documented rather than hidden: ir_model_data is not
 * surfaced in the normal CRM UI (only visible via Settings → Technical →
 * External Identifiers, developer mode). It satisfies "searchable" and
 * "suitable for idempotent lookup" but NOT "visible to sales staff" on
 * its own — the adapter also embeds the reference in the human-visible
 * `name` (title) and `description` fields as a readable, though not
 * uniquely-constrained, staff-visible copy.
 *
 * Recommended follow-up (not built in this pass — do not build without
 * separate approval, per the task's Custom Odoo Module Decision
 * section): a tiny module (concept name `ahanassa_website_rfq`) adding a
 * single field `crm.lead.x_website_rfq_reference` (Char, unique,
 * indexed, readonly-after-set) purely for staff-facing search — the
 * ir_model_data mechanism below remains sufficient for correctness
 * without it.
 */
export const RFQ_REFERENCE_MAPPING = {
  status: "RESOLVED — native ir.model.data external-ID mechanism, verified",
  externalIdModule: "ahanassa_website",
  externalIdName: (localRfqId: string) => `rfq_${localRfqId}`,
  staffVisibleFallback: "Reference embedded in crm.lead.name and crm.lead.description (readable, not uniquely constrained).",
  futureCustomField: {
    proposedModule: "ahanassa_website_rfq",
    proposedField: "x_website_rfq_reference (crm.lead, Char, unique, indexed, readonly-after-set)",
    justification: "Staff-facing exact search/filter by the website's AA-RFQ-... reference without Developer Mode.",
  },
} as const;

/** Products/variants/UOM — verified installed (product, uom) but out of scope: this task is RFQ-only, not catalog sync. Recorded for completeness only, not used by the adapter. */
export const CATALOG_MAPPING_OUT_OF_SCOPE = {
  product: { model: "product.template", verified: "module installed" },
  variant: { model: "product.product", verified: "module installed" },
  unit: { model: "uom.uom", verified: "module installed" },
} as const;
