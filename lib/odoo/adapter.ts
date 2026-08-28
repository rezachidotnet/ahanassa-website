import { getOdooConfig } from "@/lib/env";
import type { OdooContactInput, OdooGateway, OdooRef, OdooRfqInput, OdooRfqResult, IntegrationHealth } from "@/lib/odoo/types";

/**
 * Concrete OdooGateway implementation for this phase.
 *
 * DAR-013 (DOCUMENT_AUDIT_REPORT.md) confirms Odoo version, installed
 * modules, exact API surface, and field mapping remain a genuine,
 * owner-confirmed-as-non-blocking discovery gate — not something to guess.
 * `upsertRfq`/`upsertContact` therefore always return `not_configured`
 * rather than attempting a real call: even if `ODOO_BASE_URL`/`ODOO_API_KEY`
 * happened to be set, the *model* to call (`crm.lead` vs. a dedicated custom
 * RFQ model — 01-sources/TECHNICAL_ARCHITECTURE.md §14.3, "Gate:
 * Module/field inspection") is still unresolved, and guessing it risks
 * writing malformed data into a real Odoo instance. This is an honest,
 * safe stub, not a fake success — see the task's explicit "Do not fake
 * success" instruction.
 *
 * lib/odoo/client.ts already implements the real JSON-2 transport
 * mechanics so that wiring the real integration, once the mapping is
 * approved, is a mapping change here — not a new client.
 */
export function createOdooAdapter(): OdooGateway {
  return {
    async upsertContact(_input: OdooContactInput): Promise<OdooRef | null> {
      return null;
    },

    async upsertRfq(_input: OdooRfqInput): Promise<OdooRfqResult> {
      const config = getOdooConfig();
      if (!config) {
        return { status: "not_configured", reasonCode: "ODOO_CREDENTIALS_NOT_SET" };
      }
      // Credentials present but the model mapping is still an unresolved
      // discovery gate (DAR-013) — do not guess which Odoo model/fields to
      // write to. Resolve this once 01-sources/TECHNICAL_ARCHITECTURE.md
      // §14.3's "Module/field inspection" gate is actually closed.
      return { status: "not_configured", reasonCode: "MODEL_MAPPING_UNRESOLVED" };
    },

    async getHealth(): Promise<IntegrationHealth> {
      const config = getOdooConfig();
      if (!config) {
        return { configured: false, reasonCode: "ODOO_CREDENTIALS_NOT_SET" };
      }
      return { configured: false, reasonCode: "MODEL_MAPPING_UNRESOLVED" };
    },
  };
}
