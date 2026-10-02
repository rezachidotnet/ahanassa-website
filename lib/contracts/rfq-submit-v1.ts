import { z } from "zod";
import { MAX_ITEMS } from "../rfq/item-row-validation.ts";
import { MAX_BODY_BYTES, MAX_LENGTH_MM } from "../rfq/validation.ts";
import { RFQ_UOM_CODES } from "../rfq/uom.ts";
import { SNAPSHOT_VERSION_PATTERN } from "./snapshot-v1.ts";

/**
 * rfq_submit.v1 — browser -> RFQ Worker (`POST https://api.ahanassa.com/api/rfqs`,
 * architecture V1.1 §6.1). docs/contracts/RFQ_SUBMIT_V1.md is the prose
 * version. Limits are imported from the existing server validator
 * (lib/rfq/validation.ts, item-row-validation.ts, uom.ts) so the contract
 * and the running code cannot drift on them.
 *
 * The schema is STRICT (unknown keys rejected) as architecture §6.1
 * requires of the RFQ Worker. The CURRENT endpoint (app/api/rfqs) still
 * ignores unknown keys; it moves to this schema in W2.
 */
export const RFQ_SUBMIT_CONTRACT_VERSION = "rfq_submit.v1" as const;

export const rfqSubmitItem = z
  .object({
    catalogVariantXid: z.string().max(200).regex(/^[A-Za-z0-9_.-]+$/).optional(),
    productSlug: z.string().max(200).optional(),
    freeformTitle: z.string().max(160).optional(),
    categoryLabel: z.string().max(100).optional(),
    gradeOrStandard: z.string().max(100).optional(),
    quantityText: z.string().min(1).max(100),
    unit: z.enum(RFQ_UOM_CODES),
    description: z.string().max(1000).optional(),
    lengthMm: z.number().int().positive().max(MAX_LENGTH_MM).nullable().optional(),
  })
  .strict();

export const rfqSubmitRequest = z
  .object({
    /** Browser-generated, stable for one "new request"; the server stores only SHA-256(key). */
    idempotencyKey: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
    locale: z.enum(["fa", "en", "ar"]),
    fullName: z.string().min(2).max(100),
    companyName: z.string().max(160).optional(),
    email: z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    phoneCountry: z.string().length(2),
    phoneLocal: z.string().min(1).max(20),
    deliveryLocation: z.string().max(200).optional(),
    message: z.string().max(3000).optional(),
    items: z.array(rfqSubmitItem).min(1).max(MAX_ITEMS),
    /** Honeypot — must be empty. */
    website: z.string().max(0).optional(),
    formRenderedAt: z.number().int().optional(),
    /** Cloudflare Turnstile response token (action `rfq_submit`). */
    turnstileToken: z.string().min(1).max(2048),
    /** snapshot.v1 version of the static catalog JSON the selector was built from (null on the SSR runtime). */
    catalogSnapshotVersion: z.string().regex(SNAPSHOT_VERSION_PATTERN).nullable().optional(),
  })
  .strict();
export type RfqSubmitRequest = z.infer<typeof rfqSubmitRequest>;

export const RFQ_SUBMIT_MAX_BODY_BYTES = MAX_BODY_BYTES;

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
