import type { Locale } from "@/config/locales";

/**
 * RFQ submission contract. Shape follows the canonical `RfqItemInput`
 * (01-sources/TECHNICAL_ARCHITECTURE.md §12.2) adapted to what the current
 * approved RFQ form (components/contact/enquiry-form.tsx) actually
 * collects: exactly one item per submission, quantity as a single freeform
 * string rather than a structured number+unit pair. The schema still
 * supports multiple items server-side so a future richer form can submit
 * more than one line without a backend change.
 */
export interface RfqItemInput {
  /**
   * Real Catalog commercial identity (`product_variant_xid`) — Catalog ->
   * RFQ Variant Preselection, DOCUMENT_AUDIT_REPORT.md DAR-039,
   * docs/CATALOG_RFQ_INTEGRATION.md. Advisory only: the client sends
   * nothing else Catalog-related (no name/grade/dimensions/SKU/UOM) — the
   * server resolves every displayable/persisted field itself from
   * DB_PUBLIC at submission time. Mutually exclusive with `productSlug`/
   * `freeformTitle`; when present, those two are ignored.
   */
  catalogVariantXid?: string;
  /** Sample-catalog product slug, or "other" — never treated as a real catalog/product ID (CLAUDE.md §11, DAR-020). */
  productSlug?: string;
  /** Human-readable product name snapshot, required when productSlug is absent or "other". */
  freeformTitle?: string;
  categoryLabel?: string;
  gradeOrStandard?: string;
  /** Raw customer-entered quantity, e.g. "200 تن". Required — the approved form always collects this as free text. */
  quantityText: string;
  /**
   * The structured RFQ Launch UoM code (`lib/rfq/uom.ts#RfqUomCode`) —
   * required, sent alongside `quantityText` (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md).
   * Raw/unchecked at the wire boundary, like `catalogVariantXid`; format-
   * and policy-validated server-side (`lib/rfq/validation.ts`,
   * `lib/rfq/service.ts`) before ever being trusted. `quantityText` still
   * carries a human-readable localized unit word for continuity/display —
   * this field is the deterministic, structured value the Odoo mapping
   * actually serializes, never re-inferred from `quantityText` for a new
   * submission.
   */
  unit?: string;
  description?: string;
}

/**
 * The final, fully-resolved shape of one RFQ line ready for D1 persistence
 * — produced by `lib/rfq/service.ts` after format validation (lib/rfq/validation.ts)
 * and, for a Catalog-linked item, real DB_PUBLIC resolution
 * (lib/catalog/editorial-repository.ts#resolveRfqCatalogVariant). Every
 * field here is either server-derived-and-trusted or a plain customer-typed
 * string — never a raw, unvalidated client value. This is what
 * `lib/rfq/repository.ts#createRfq` actually persists into `rfq_items`; it
 * is intentionally a distinct, richer type from `RfqItemInput` (the wire
 * payload) and from `ValidationResult`'s item shape (format-checked only,
 * not yet Catalog-resolved).
 */
export interface RfqItemRecord {
  source: "selected" | "freeform";
  categoryRef: string | null;
  productRef: string | null;
  variantRef: string | null;
  unitRef: string | null;
  categoryLabel: string | null;
  productLabel: string | null;
  variantLabel: string | null;
  unitLabel: string | null;
  freeformTitle: string | null;
  sizeText: string | null;
  quantityText: string;
  quantityValue: number | null;
  quantityScale: number | null;
  description: string | null;
  /** Canonical SKU snapshot at submission time — always server-resolved, never the (nonexistent) client-supplied value; null for a freeform item. */
  skuSnapshot: string | null;
}

/** Header fields (already format-validated) + fully-resolved items — the exact shape `lib/rfq/repository.ts#createRfq` accepts. */
export interface RfqSubmissionRecord {
  idempotencyKey: string;
  locale: Locale;
  fullName: string;
  companyName: string;
  email: string;
  /** ISO-3166-1 alpha-2, e.g. "IR" — server-resolved, never trusted from a client-composed value (lib/rfq/phone-server.ts). */
  phoneIso2: string | null;
  /** ITU calling code without the leading "+", e.g. "98" — resolved from `phoneIso2` via libphonenumber-js metadata, never a client-supplied dial code. */
  phoneCallingCode: string | null;
  phoneNational: string | null;
  phoneE164: string | null;
  deliveryLocation: string | null;
  message: string | null;
  items: RfqItemRecord[];
}

export interface RfqSubmissionInput {
  idempotencyKey: string;
  locale: Locale;
  fullName: string;
  companyName: string;
  email: string;
  /** ISO-3166-1 alpha-2 country selected by the customer, e.g. "IR" — the client never sends a dial code or a composed number; the server resolves/validates/composes E.164 authoritatively (lib/rfq/phone-server.ts). */
  phoneCountry?: string;
  /** Raw local-number digits as typed (Persian/Arabic/Latin numerals accepted, normalized server-side). */
  phoneLocal?: string;
  deliveryLocation?: string;
  message?: string;
  items: RfqItemInput[];
  /** Honeypot — must be empty. Not rendered visibly; a filled value indicates automated submission. */
  website?: string;
  /** Client timestamp (ms) when the form was first rendered/focused — used only for a soft minimum-completion-time signal. */
  formRenderedAt?: number;
  /** Cloudflare Turnstile response token — verified server-side (lib/security/turnstile.ts), never trusted by presence alone. Not persisted. */
  turnstileToken?: string;
}

export type RfqErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "VERIFICATION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "SERVICE_UNAVAILABLE";

export type RfqResponse =
  | { ok: true; reference: string; status: "received" }
  | { ok: false; code: RfqErrorCode; fieldErrors?: Record<string, string[]> };

export interface RfqRecord {
  id: string;
  referenceNumber: string;
  status: string;
  syncStatus: string;
  createdAt: string;
}
