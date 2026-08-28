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
 * Scoped to the RFQ sync path only. The full canonical interface
 * (TECHNICAL_ARCHITECTURE.md §14.1) also declares `pullCatalog` and
 * `pullPublicPrices` for the scheduled catalog/price sync — deliberately
 * not implemented here since that is a separate, not-yet-scoped task.
 */
export interface OdooGateway {
  upsertContact(input: OdooContactInput): Promise<OdooRef | null>;
  upsertRfq(input: OdooRfqInput): Promise<OdooRfqResult>;
  getHealth(): Promise<IntegrationHealth>;
}
