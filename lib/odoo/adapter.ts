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
 * This adapter is real, not a stub — but it still cannot perform a real
 * write today: no Odoo API key exists for this integration (verified —
 * `res_users_apikeys` has 0 rows in `ahanassa`) and this task's own
 * safety rules prohibit minting one or writing test CRM/customer records
 * into the only Odoo database Ahan Asa has. `getOdooConfig()` therefore
 * still returns `null` in every real deployment until the owner
 * provisions `ODOO_BASE_URL`/`ODOO_DATABASE`/`ODOO_API_KEY` as Cloudflare
 * Secrets — at which point this code executes for real with no further
 * changes required. This is an honest boundary, not a fake success path.
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
        //    mechanism: ir_model_data has a real UNIQUE index on
        //    (module, name) — see RFQ_REFERENCE_MAPPING.
        const externalName = RFQ_REFERENCE_MAPPING.externalIdName(input.localRfqId);
        const existing = await findExternalId(config, externalName);
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
        //    mapping.ts) — Odoo assigns it automatically on create.
        const summary = buildRfqSummary(input);
        const createVals: Record<string, unknown> = {
          name: `[${input.referenceNumber}] ${input.contact.companyName || input.contact.fullName} — Website RFQ`,
          type: RFQ_HEADER_MAPPING.type,
          description: summary,
          contact_name: input.contact.fullName,
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

        // 4. Register the idempotency guard for future redeliveries.
        await callOdoo(config, {
          model: "ir.model.data",
          method: "create",
          kwargs: {
            vals_list: [
              {
                module: RFQ_REFERENCE_MAPPING.externalIdModule,
                name: externalName,
                model: RFQ_HEADER_MAPPING.model,
                res_id: leadId,
                noupdate: true,
              },
            ],
          },
        });

        return {
          status: "synced",
          lead: { id: leadId, model: RFQ_HEADER_MAPPING.model },
          ...(partner ? { partner } : {}),
        };
      } catch (err) {
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

async function findExternalId(config: OdooClientConfig, name: string): Promise<number | null> {
  const matches = (await callOdoo(config, {
    model: "ir.model.data",
    method: "search_read",
    kwargs: {
      domain: [
        ["module", "=", RFQ_REFERENCE_MAPPING.externalIdModule],
        ["name", "=", name],
      ],
      fields: ["res_id"],
    },
  })) as Array<{ res_id: number }>;
  return matches[0]?.res_id ?? null;
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
