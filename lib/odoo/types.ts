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
 * Raw Odoo `product.category` row shape, as returned by `search_read`
 * (only the fields this project's mapping actually reads — DOCUMENT_AUDIT_REPORT.md
 * DAR-033, lib/odoo/mapping.ts CATALOG_CATEGORY_MAPPING).
 */
export interface OdooCatalogCategoryRow {
  id: number;
  name: string;
  parent_id: [number, string] | false;
  complete_name: string;
  /** Odoo's ORM active-record default filter — omitted rows never appear unless queried with `active_test: false`. */
  active: boolean;
}

/** Raw Odoo `product.template` row shape (never includes `list_price`/`standard_price` — pricing is out of scope). */
export interface OdooCatalogProductRow {
  id: number;
  name: string;
  default_code: string | false;
  categ_id: [number, string] | false;
  sale_ok: boolean;
  active: boolean;
  uom_id: [number, string] | false;
  write_date: string;
}

/** Raw Odoo `product.product` row shape (never includes `lst_price`/`standard_price`). */
export interface OdooProductVariantRow {
  id: number;
  product_tmpl_id: [number, string];
  default_code: string | false;
  active: boolean;
  write_date: string;
}

/** Raw Odoo `uom.uom` row shape. `name` is JSON-translated in this install (verified: `{"en_US": "...", "fa_IR": "...", "ar_001": "..."}`); other locales may be absent. */
export interface OdooUomRow {
  id: number;
  name: Partial<Record<"en_US" | "fa_IR" | "ar_001", string>> | string;
  active: boolean;
  /** Verified: this install's `uom.uom` has no classic `category_id` — units relate via `relative_uom_id`/`relative_factor` instead (DAR-033). */
  relative_uom_id: number | false;
}

export type CatalogPullStatus = "pulled" | "not_configured" | "failed";

export interface CatalogPullResult {
  status: CatalogPullStatus;
  categories: OdooCatalogCategoryRow[];
  products: OdooCatalogProductRow[];
  variants: OdooProductVariantRow[];
  units: OdooUomRow[];
  /** Safe operational reason code only, present when status !== "pulled" — never a raw provider error body. */
  reasonCode?: string;
}

/**
 * Scoped to the RFQ sync path plus catalog discovery/pull
 * (DOCUMENT_AUDIT_REPORT.md DAR-033). The full canonical interface
 * (TECHNICAL_ARCHITECTURE.md §14.1) also declares `pullPublicPrices` for
 * the scheduled price sync — deliberately not implemented here; pricing is
 * an explicitly separate, not-yet-scoped concern (CLAUDE.md, this task's
 * own boundary).
 */
export interface OdooGateway {
  upsertContact(input: OdooContactInput): Promise<OdooRef | null>;
  upsertRfq(input: OdooRfqInput): Promise<OdooRfqResult>;
  getHealth(): Promise<IntegrationHealth>;
  /** Read-only. Never mutates Odoo. Returns empty arrays, never throws, when not configured — mirrors upsertRfq's `not_configured` honesty. */
  pullCatalog(): Promise<CatalogPullResult>;
}
