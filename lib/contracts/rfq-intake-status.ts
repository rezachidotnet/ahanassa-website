/**
 * rfq_intake v1.1 response classification, zod-free so the RFQ Worker's
 * delivery path does not bundle zod (W3, architecture V1.1 §4.3).
 * Re-exported unchanged by rfq-intake-v1-1.ts.
 */

/** Odoo error code -> HTTP status -> website classification (architecture §6.2). */
export const RFQ_INTAKE_ERRORS = [
  { http: 400, code: "invalid_idempotency_key", classification: "MANUAL_REVIEW" },
  { http: 400, code: "invalid_payload", classification: "MANUAL_REVIEW" },
  { http: 400, code: "invalid_received_at", classification: "MANUAL_REVIEW" },
  { http: 401, code: "unauthorized", classification: "RETRY_PENDING_ALERT" },
  { http: 409, code: "idempotency_conflict", classification: "MANUAL_REVIEW" },
  { http: 413, code: "payload_too_large", classification: "MANUAL_REVIEW" },
  { http: 415, code: "unsupported_media_type", classification: "MANUAL_REVIEW" },
  { http: 500, code: "internal_error", classification: "RETRY_PENDING" },
  { http: 503, code: "concurrency_retry", classification: "RETRY_PENDING" },
] as const;

export type DeliveryClassification = "DELIVERED" | "RETRY_PENDING" | "RETRY_PENDING_ALERT" | "MANUAL_REVIEW";

/** Architecture §6.2: 201/200 delivered; 5xx/429/network/timeout retry; 401/403 retry + alert; 400/409/413/415 manual review. */
export function classifyIntakeStatus(status: number | "network_error" | "timeout"): DeliveryClassification {
  if (status === "network_error" || status === "timeout") return "RETRY_PENDING";
  if (status === 200 || status === 201) return "DELIVERED";
  if (status === 401 || status === 403) return "RETRY_PENDING_ALERT";
  if (status === 429 || status >= 500) return "RETRY_PENDING";
  return "MANUAL_REVIEW";
}
