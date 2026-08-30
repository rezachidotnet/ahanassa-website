/**
 * Odoo adapter boundary — 01-sources/TECHNICAL_ARCHITECTURE.md §14.1.
 * UI, routes, and domain rules must never know whether the adapter uses
 * JSON-2, an older supported API, or an approved custom controller; they
 * only see this interface.
 */

export interface OdooRef {
  id: number;
  model: string;
}

export interface OdooContactInput {
  fullName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OdooRfqItemInput {
  label: string;
  quantityText: string;
  description?: string | null;
}

export interface OdooRfqInput {
  /** Internal RFQ ULID — becomes the idempotency key for upsert (never the Odoo record ID). */
  localRfqId: string;
  referenceNumber: string;
  contact: OdooContactInput;
  items: OdooRfqItemInput[];
  message?: string | null;
  locale: string;
  correlationId: string;
}

export type OdooResultStatus = "synced" | "not_configured" | "failed";

export interface OdooRfqResult {
  status: OdooResultStatus;
  lead?: OdooRef;
  partner?: OdooRef;
  /** Safe operational reason code only — never a raw provider error body (TECHNICAL_ARCHITECTURE.md §23). */
  reasonCode?: string;
}

export interface IntegrationHealth {
  configured: boolean;
  reasonCode?: string;
}

/**
 * Catalog discovery/pull was REMOVED from this gateway (DOCUMENT_AUDIT_REPORT.md
 * DAR-034), superseding DAR-033's `pullCatalog()`. That method used the
 * generic JSON-2 `search_read` RPC transport (`callOdoo` below) against raw
 * Odoo models — exactly the "generic Odoo ORM/model access" the now-live
 * dedicated Odoo Public Catalog API v1 (docs/integrations/odoo/catalog-v1/)
 * makes both unnecessary and architecturally forbidden for catalog data.
 * All catalog sync now goes through `lib/catalog/odoo-api-client.ts`
 * exclusively — a dedicated public HTTP client, not this generic gateway.
 * This `OdooGateway` remains scoped to the RFQ sync path only.
 */
export interface OdooGateway {
  upsertContact(input: OdooContactInput): Promise<OdooRef | null>;
  upsertRfq(input: OdooRfqInput): Promise<OdooRfqResult>;
  getHealth(): Promise<IntegrationHealth>;
}
