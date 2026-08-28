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
  /** Sample-catalog product slug, or "other" — never treated as a real catalog/product ID (CLAUDE.md §11, DAR-020). */
  productSlug?: string;
  /** Human-readable product name snapshot, required when productSlug is absent or "other". */
  freeformTitle?: string;
  categoryLabel?: string;
  gradeOrStandard?: string;
  /** Raw customer-entered quantity, e.g. "200 تن". Required — the approved form always collects this as free text. */
  quantityText: string;
  description?: string;
}

export interface RfqSubmissionInput {
  idempotencyKey: string;
  locale: Locale;
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  deliveryLocation?: string;
  message?: string;
  items: RfqItemInput[];
  /** Honeypot — must be empty. Not rendered visibly; a filled value indicates automated submission. */
  website?: string;
  /** Client timestamp (ms) when the form was first rendered/focused — used only for a soft minimum-completion-time signal. */
  formRenderedAt?: number;
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
