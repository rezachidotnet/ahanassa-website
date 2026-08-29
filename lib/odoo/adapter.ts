import { getOdooConfig } from "../env.ts";
import { callOdoo, OdooRequestError, type OdooClientConfig } from "./client.ts";
import { PARTNER_MAPPING, RFQ_HEADER_MAPPING, RFQ_REFERENCE_MAPPING } from "./mapping.ts";
import type { OdooContactInput, OdooGateway, OdooRef, OdooRfqInput, OdooRfqResult, IntegrationHealth } from "./types.ts";

/**
 * Concrete OdooGateway implementation.
 *
 * DAR-013/DAR-026 (DOCUMENT_AUDIT_REPORT.md): Odoo version, installed
 * modules, and field mapping were unresolved, non-blocking discovery
 * gates until 2026-08-28's read-only live-environment audit against the
 * real `ahanassa` database (Odoo 19.0-20260528). That audit resolved the
 * mapping this file uses — see lib/odoo/mapping.ts for the verified
 * evidence behind every model/field name below.
 *
 * DAR-027 (2026-08-29): the RFQ-level idempotency guard originally used
 * `ir.model.data` (Odoo's XML-data external-ID table). That mechanism was
 * abandoned before any credential was ever issued: in this install, only
 * `base.group_erp_manager` ("Access Rights" — a 29-model technical/admin
 * group covering `res.groups`, `ir.model.access`, `ir.model.fields`,
 * `res.users`, etc.) grants any access to `ir.model.data`, and handing a
 * website integration API key that group was rejected as a disproportionate
 * blast radius for a narrow idempotency check. The RFQ-path idempotency
 * guard is now `crm.lead.x_website_rfq_reference` (Char, unique, readonly),
 * added by the small dedicated `odoo-modules/ahanassa_website_rfq` module —
 * a real Postgres UNIQUE constraint, same guarantee strength as the
 * `ir.model.data` approach, but the integration user only ever needs
 * ordinary `sales_team.group_sale_salesman`-level `crm.lead`/`res.partner`
 * access to use it (no elevated technical group). See RFQ_REFERENCE_MAPPING
 * below and that module's README for the full rationale.
 *
 * This adapter is real, not a stub, and (as of DAR-027's staging
 * provisioning) a real Cloudflare-staging-scoped API key exists for a
 * dedicated, minimum-permission Odoo user — but no RFQ write test has been
 * run against it yet; that is a deliberately separate, still-pending phase.
 */
export function createOdooAdapter(): OdooGateway {
  return {
    async upsertContact(input: OdooContactInput): Promise<OdooRef | null> {
      const config = getOdooConfig();
      if (!config) return null;
      try {
        return await resolveOrCreatePartner(config, input);
      } catch {
        // Dedup/create failure — never guess a partner. Caller (upsertRfq)
        // surfaces this as a sync failure, which is safe: the RFQ stays
        // durably `pending`/`retry` in D1 (lib/queue/consumer.ts), never
        // silently dropped or falsely marked synced.
        return null;
      }
    },

    async upsertRfq(input: OdooRfqInput): Promise<OdooRfqResult> {
      const config = getOdooConfig();
      if (!config) {
        return { status: "not_configured", reasonCode: "ODOO_CREDENTIALS_NOT_SET" };
      }

      try {
        // 1. Idempotency guard, independent of D1 state. lib/queue/consumer.ts
        //    already checks integration_mappings before ever calling this
        //    adapter (the primary guard); this is defense-in-depth against
        //    the narrow window where a lead was created but the D1 mapping
        //    write never landed (e.g. a crash between the two). Verified
        //    mechanism: crm.lead.x_website_rfq_reference has a real Postgres
        //    UNIQUE constraint (odoo-modules/ahanassa_website_rfq) — see
        //    RFQ_REFERENCE_MAPPING.
        const existing = await findLeadByWebsiteReference(config, input.referenceNumber);
        if (existing) {
          return { status: "synced", lead: { id: existing, model: RFQ_HEADER_MAPPING.model } };
        }

        // 2. Resolve or create the contact/partner first — a lead should
        //    never be created without a linked partner when contact data
        //    is available, and customer dedup must run before RFQ creation
        //    per 01-sources/TECHNICAL_ARCHITECTURE.md §14.3 ("A new Odoo
        //    partner MUST NOT be created on every RFQ").
        const partner = await resolveOrCreatePartner(config, input.contact);

        // 3. Create the crm.lead. Never write opportunity_no (see
        //    mapping.ts) — Odoo assigns it automatically on create. Setting
        //    x_website_rfq_reference here is both the staff-visible
        //    reference and the idempotency guard (step 1) in one write — no
        //    separate registration call is needed (contrast the old
        //    ir.model.data design, which needed a second create()).
        const summary = buildRfqSummary(input);
        const createVals: Record<string, unknown> = {
          name: `[${input.referenceNumber}] ${input.contact.companyName || input.contact.fullName} — Website RFQ`,
          type: RFQ_HEADER_MAPPING.type,
          description: summary,
          contact_name: input.contact.fullName,
          [RFQ_REFERENCE_MAPPING.field]: input.referenceNumber,
        };
        if (partner) createVals.partner_id = partner.id;
        if (input.contact.email) createVals.email_from = input.contact.email;
        if (input.contact.phone) createVals.phone = input.contact.phone;
        const teamId = getOdooCrmTeamId();
        if (teamId !== undefined) createVals.team_id = teamId;

        const leadIds = (await callOdoo(config, {
          model: RFQ_HEADER_MAPPING.model,
          method: "create",
          kwargs: { vals_list: [createVals] },
        })) as number[];
        const leadId = leadIds[0];
        if (typeof leadId !== "number") {
          return { status: "failed", reasonCode: "ODOO_CREATE_RETURNED_NO_ID" };
        }

        return {
          status: "synced",
          lead: { id: leadId, model: RFQ_HEADER_MAPPING.model },
          ...(partner ? { partner } : {}),
        };
      } catch (err) {
        // A concurrent redelivery losing the race against the UNIQUE
        // constraint above lands here as a 4xx ODOO_REQUEST_REJECTED
        // "failed" result — never a false "synced". lib/queue/consumer.ts
        // marks the RFQ `retry`; the next delivery's step-1 lookup finds
        // the winning side's row and returns `synced` correctly. No special
        // constraint-violation handling is needed for correctness, same as
        // the ir.model.data design this replaces.
        return { status: "failed", reasonCode: classifyOdooError(err) };
      }
    },

    async getHealth(): Promise<IntegrationHealth> {
      const config = getOdooConfig();
      if (!config) {
        return { configured: false, reasonCode: "ODOO_CREDENTIALS_NOT_SET" };
      }
      try {
        // Cheapest possible authenticated read — confirms the bearer key
        // and route are reachable without touching business data.
        await callOdoo(config, { model: PARTNER_MAPPING.model, method: "search_count", kwargs: { domain: [] } });
        return { configured: true };
      } catch (err) {
        return { configured: false, reasonCode: classifyOdooError(err) };
      }
    },
  };
}

/**
 * Deterministic, conservative dedup: match only on a lowercase+trimmed
 * email against Odoo's own `email_normalized`. Phone-based matching is
 * deliberately NOT attempted — see PARTNER_MAPPING.dedup for why
 * reimplementing Odoo's phone_sanitized (E.164 + country context)
 * client-side would risk a false match, which is worse than creating a
 * new partner. Ambiguous (>1) matches never auto-merge.
 */
async function resolveOrCreatePartner(config: OdooClientConfig, contact: OdooContactInput): Promise<OdooRef | null> {
  const normalizedEmail = contact.email?.trim().toLowerCase();
  if (normalizedEmail) {
    const matches = (await callOdoo(config, {
      model: PARTNER_MAPPING.model,
      method: "search_read",
      kwargs: { domain: [["email_normalized", "=", normalizedEmail]], fields: ["id"] },
    })) as Array<{ id: number }>;
    if (matches.length === 1) {
      return { id: matches[0].id, model: PARTNER_MAPPING.model };
    }
    if (matches.length > 1) {
      // Ambiguous — never guess which existing partner is correct.
      return null;
    }
  }

  const createVals: Record<string, unknown> = { name: contact.fullName };
  if (contact.email) createVals.email = contact.email;
  if (contact.phone) createVals.phone = contact.phone;
  if (contact.companyName) createVals.function = undefined; // company handled via name only in this phase — see mapping.ts limitations
  if (contact.companyName) createVals.name = `${contact.fullName} (${contact.companyName})`;

  const ids = (await callOdoo(config, {
    model: PARTNER_MAPPING.model,
    method: "create",
    kwargs: { vals_list: [createVals] },
  })) as number[];
  const id = ids[0];
  if (typeof id !== "number") return null;
  return { id, model: PARTNER_MAPPING.model };
}

/**
 * `active_test: false` is required here: Odoo's ORM implicitly adds
 * `active = True` to every search domain on a model with an `active` field
 * (`odoo/orm/models.py` `_search`, verified live in the container, DAR-028)
 * unless the caller's context says otherwise. Without this, archiving a
 * synced crm.lead (e.g. Odoo's own "Mark Lost" CRM action, which sets
 * `active = False`) would make this idempotency lookup silently stop
 * finding it — a later redelivery would then attempt `create()` again,
 * which the real Postgres UNIQUE constraint would still reject (so no
 * duplicate row can ever exist), but the RFQ would incorrectly land in
 * `failed`/retry/DLQ instead of correctly resolving to `synced`.
 */
async function findLeadByWebsiteReference(config: OdooClientConfig, referenceNumber: string): Promise<number | null> {
  const matches = (await callOdoo(config, {
    model: RFQ_HEADER_MAPPING.model,
    method: "search_read",
    context: { active_test: false },
    kwargs: {
      domain: [[RFQ_REFERENCE_MAPPING.field, "=", referenceNumber]],
      fields: ["id"],
    },
  })) as Array<{ id: number }>;
  return matches[0]?.id ?? null;
}

function buildRfqSummary(input: OdooRfqInput): string {
  // Plaintext only (crm.lead.description is HTML but plain text renders
  // safely) — D1 rfq_items remains authoritative, see RFQ_LINE_MAPPING.
  const lines = input.items.map((item, i) => `${i + 1}. ${item.label} — ${item.quantityText}${item.description ? ` (${item.description})` : ""}`);
  return [
    `Website RFQ reference: ${input.referenceNumber}`,
    `Locale: ${input.locale}`,
    input.message ? `Message: ${input.message}` : null,
    "Items (see D1 rfq_items for the authoritative structured record — this is a summary only):",
    ...lines,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function classifyOdooError(err: unknown): string {
  if (err instanceof OdooRequestError) {
    if (err.statusCategory === "network_error") return "ODOO_NETWORK_ERROR";
    if (err.httpStatus === 401 || err.httpStatus === 403) return "ODOO_AUTH_FAILED";
    return err.statusCategory === "5xx" ? "ODOO_SERVER_ERROR" : "ODOO_REQUEST_REJECTED";
  }
  return "ODOO_UNKNOWN_ERROR";
}

/**
 * crm.team to assign website RFQs to. Deliberately unset by default —
 * see RFQ_HEADER_MAPPING.openDecisions.teamId: the only team named
 * "Website" in the live database is inactive, and guessing an ID risks
 * silently misfiling every RFQ into the wrong pipeline. Set
 * ODOO_CRM_TEAM_ID only after the owner/Odoo admin confirms the correct
 * team.
 */
function getOdooCrmTeamId(): number | undefined {
  const raw = process.env.ODOO_CRM_TEAM_ID;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
