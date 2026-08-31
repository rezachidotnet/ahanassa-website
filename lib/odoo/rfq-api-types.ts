/**
 * Odoo Public RFQ Intake API v1 — request/response contract types.
 *
 * Source of truth, in this exact precedence
 * (docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md's own stated
 * order): 1) RFQ_API_CONTRACT_V1.md, 2) the verified Phase 6B report
 * (AHANASSA_MARKETPLACE_PHASE6B_RFQ_API_REPORT.md), 3) the OpenAPI artifact
 * (known less complete than the deployed runtime), 4) historical Website
 * assumptions (lowest, never authoritative on its own). These types
 * describe ONLY `POST /api/v1/rfq` — no other Odoo route.
 * DOCUMENT_AUDIT_REPORT.md DAR-041.
 */

export type RfqApiLocale = "fa" | "en" | "ar";

/** The 8 UoM codes the deployed API currently accepts (RFQ_API_CONTRACT_V1.md, RFQ_BACKEND_ARCHITECTURE.md) — never an Odoo integer uom.uom ID. */
export const RFQ_API_UOM_CODES = ["kg", "ton", "branch", "sheet", "meter", "coil", "bundle", "piece"] as const;
export type RfqApiUomCode = (typeof RFQ_API_UOM_CODES)[number];

export interface RfqApiCustomer {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  /** ISO country code — the Website does not currently capture this per-customer (see docs/ODOO_RFQ_API_INTEGRATION.md); omitted, never fabricated. */
  country?: string;
  city?: string;
}

export interface RfqApiCatalogItem {
  product_variant_xid: string;
  /** Audit/display snapshot only — XID remains the sole relational identity; a stale/mismatched SKU never selects a different product (RFQ_API_CONTRACT_V1.md). */
  sku?: string;
  quantity: number;
  uom: RfqApiUomCode;
  notes?: string;
  description?: string;
}

export interface RfqApiFreeTextItem {
  product_variant_xid?: null;
  quantity: number;
  uom: RfqApiUomCode;
  description: string;
  notes?: string;
}

export type RfqApiItem = RfqApiCatalogItem | RfqApiFreeTextItem;

export interface RfqApiConsent {
  contact?: boolean;
  privacy_version?: string;
}

export interface RfqApiSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface RfqApiRequest {
  locale: RfqApiLocale;
  customer: RfqApiCustomer;
  items: RfqApiItem[];
  notes?: string;
  /** Omitted entirely, never fabricated, when the Website has no real captured consent state — see docs/ODOO_RFQ_API_INTEGRATION.md. */
  consent?: RfqApiConsent;
  source?: RfqApiSource;
}

export interface RfqApiSuccessData {
  reference: string;
  status: string;
}

export interface RfqApiSuccessMeta {
  idempotent_replay: boolean;
}

export interface RfqApiSuccessBody {
  data: RfqApiSuccessData;
  meta: RfqApiSuccessMeta;
  /**
   * Present on a genuine 201 creation per docs/integrations/odoo/rfq-v1/RFQ_BACKEND_ARCHITECTURE.md
   * ("only the opaque token is returned to the trusted caller") — absent
   * from RFQ_API_CONTRACT_V1.md's own abbreviated worked example. Typed as
   * optional so this client is correct either way. Treated as sensitive
   * opaque material throughout this codebase: never logged, never
   * persisted, never returned to the browser — see
   * docs/ODOO_RFQ_API_INTEGRATION.md "verification_session boundary".
   */
  verification_session?: string;
}

export interface RfqApiErrorBody {
  error: {
    code: string;
    message: string;
    line?: number;
  };
}

export type RfqApiOutcome =
  | { status: "created"; reference: string; verificationSession?: string }
  | { status: "replayed"; reference: string }
  | { status: "invalid_payload"; reasonCode: string }
  | { status: "unauthorized"; reasonCode: string }
  | { status: "idempotency_conflict"; reasonCode: string }
  | { status: "payload_too_large"; reasonCode: string }
  | { status: "unsupported_media_type"; reasonCode: string }
  | { status: "server_error"; reasonCode: string }
  | { status: "network_error"; reasonCode: string }
  | { status: "malformed_response"; reasonCode: string }
  | { status: "not_configured"; reasonCode: string };
