import { z } from "zod";
import { RFQ_SUBMIT_LIMITS as L } from "./rfq-submit-v1-check.ts";

/**
 * rfq_submit.v1 — browser -> RFQ Worker (`POST https://api.ahanassa.com/api/rfqs`,
 * architecture V1.1 §6.1). docs/contracts/RFQ_SUBMIT_V1.md is the prose
 * version. Limits come from RFQ_SUBMIT_LIMITS (rfq-submit-v1-check.ts, which
 * imports them from the server validator), shared with the RFQ Worker's
 * zod-free checker so the two cannot drift.
 *
 * The schema is STRICT (unknown keys rejected) as architecture §6.1
 * requires of the RFQ Worker. The CURRENT endpoint (app/api/rfqs) still
 * ignores unknown keys; it moves to this schema in W2.
 */
export const RFQ_SUBMIT_CONTRACT_VERSION = "rfq_submit.v1" as const;

export const rfqSubmitItem = z
  .object({
    catalogVariantXid: z.string().max(L.item.catalogVariantXid.max).regex(L.item.catalogVariantXid.pattern).optional(),
    productSlug: z.string().max(L.item.productSlug.max).optional(),
    freeformTitle: z.string().max(L.item.freeformTitle.max).optional(),
    categoryLabel: z.string().max(L.item.categoryLabel.max).optional(),
    gradeOrStandard: z.string().max(L.item.gradeOrStandard.max).optional(),
    quantityText: z.string().min(L.item.quantityText.min).max(L.item.quantityText.max),
    unit: z.enum(L.item.units),
    description: z.string().max(L.item.description.max).optional(),
    lengthMm: z.number().int().positive().max(L.item.lengthMm.max).nullable().optional(),
  })
  .strict();

export const rfqSubmitRequest = z
  .object({
    /** Browser-generated, stable for one "new request"; the server stores only SHA-256(key). */
    idempotencyKey: z.string().min(L.idempotencyKey.min).max(L.idempotencyKey.max).regex(L.idempotencyKey.pattern),
    locale: z.enum(L.locales),
    fullName: z.string().min(L.fullName.min).max(L.fullName.max),
    companyName: z.string().max(L.companyName.max).optional(),
    email: z.string().max(L.email.max).regex(L.email.pattern),
    phoneCountry: z.string().length(L.phoneCountry.length),
    phoneLocal: z.string().min(L.phoneLocal.min).max(L.phoneLocal.max),
    deliveryLocation: z.string().max(L.deliveryLocation.max).optional(),
    message: z.string().max(L.message.max).optional(),
    items: z.array(rfqSubmitItem).min(L.items.min).max(L.items.max),
    /** Honeypot — must be empty. */
    website: z.string().max(L.website.max).optional(),
    formRenderedAt: z.number().int().optional(),
    /** Cloudflare Turnstile response token (action `rfq_submit`). */
    turnstileToken: z.string().min(L.turnstileToken.min).max(L.turnstileToken.max),
    /** snapshot.v1 version of the static catalog JSON the selector was built from (null on the SSR runtime). */
    catalogSnapshotVersion: z.string().regex(L.catalogSnapshotVersion.pattern).nullable().optional(),
  })
  .strict();
export type RfqSubmitRequest = z.infer<typeof rfqSubmitRequest>;

export { RFQ_SUBMIT_MAX_BODY_BYTES } from "./rfq-submit-v1-check.ts";

export const rfqSubmitSuccess = z.object({ ok: z.literal(true), reference: z.string().regex(/^AA-RFQ-[0-9A-HJKMNP-TV-Z]+$/), status: z.literal("received") }).strict();
export const rfqSubmitError = z
  .object({
    ok: z.literal(false),
    code: z.enum(["VALIDATION_ERROR", "RATE_LIMITED", "VERIFICATION_FAILED", "PAYLOAD_TOO_LARGE", "SERVICE_UNAVAILABLE", "IDEMPOTENCY_CONFLICT"]),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict();

/** Status -> body. 200 = replay of an accepted request (same key + same fingerprint). */
export const RFQ_SUBMIT_RESPONSES = [
  { http: 201, body: "success", when: "new RFQ durably committed (RFQ + lines + outbox in one D1 batch)" },
  { http: 200, body: "success", when: "replay: same idempotency key, same payload fingerprint — the original reference" },
  { http: 400, body: "VALIDATION_ERROR", when: "body is not JSON / unreadable" },
  { http: 403, body: "VERIFICATION_FAILED", when: "Turnstile rejected, or Origin not allowed" },
  { http: 409, body: "IDEMPOTENCY_CONFLICT", when: "same idempotency key, different payload fingerprint" },
  { http: 413, body: "PAYLOAD_TOO_LARGE", when: "body > 20,000 bytes (Content-Length or actual)" },
  { http: 415, body: "VALIDATION_ERROR", when: "Content-Type is not application/json" },
  { http: 422, body: "VALIDATION_ERROR", when: "schema/field/catalog/UoM validation failed (fieldErrors)" },
  { http: 429, body: "RATE_LIMITED", when: "rate limit exceeded (Retry-After: 60)" },
  { http: 503, body: "SERVICE_UNAVAILABLE", when: "D1, Turnstile Siteverify or the rate-limit binding unavailable (fail closed; retry with the same key)" },
] as const;

/** Allowed browser Origins per environment (exact match; no wildcard). */
export const RFQ_SUBMIT_ALLOWED_ORIGINS = {
  production: ["https://www.ahanassa.com"],
  // The v11 static staging site (assets-only Worker, W2).
  staging: ["https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev"],
} as const;
