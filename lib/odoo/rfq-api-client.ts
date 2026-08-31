import { getOdooRfqApiConfig } from "../env.ts";
import type { RfqApiErrorBody, RfqApiOutcome, RfqApiRequest, RfqApiSuccessBody } from "./rfq-api-types.ts";

/**
 * Dedicated Odoo Public RFQ Intake API v1 client — `POST /api/v1/rfq` only
 * (docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md,
 * DOCUMENT_AUDIT_REPORT.md DAR-041). This is a narrow, typed client for
 * exactly this one route — never generic Odoo ORM/model access (that
 * remains `lib/odoo/client.ts`, scoped to the legacy, no-longer-used-for-
 * RFQ-delivery `crm.lead` path — see docs/ODOO_RFQ_API_INTEGRATION.md).
 *
 * Server-to-server only, matching the contract's own stated boundary — this
 * file is never imported by any client component or browser-reachable code
 * path; only `lib/queue/consumer.ts` calls it.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BODY_SIZE_BYTES = 512 * 1024;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export interface PostRfqOptions {
  timeoutMs?: number;
  /** Injectable for tests — defaults to the real global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Posts one RFQ to Odoo. `idempotencyKey` must already be the SAME stable
 * key across every retry of the same Website RFQ
 * (`lib/odoo/rfq-payload-mapper.ts#buildOutboundRfqIdempotencyKey`) — this
 * function never generates or alters it. Never logs the bearer token, the
 * request body, or `verification_session` — the caller (`lib/queue/consumer.ts`)
 * must not log them either.
 */
export async function postRfqToOdoo(payload: RfqApiRequest, idempotencyKey: string, options: PostRfqOptions = {}): Promise<RfqApiOutcome> {
  if (idempotencyKey.length === 0 || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH || !/^[\x21-\x7E]+$/.test(idempotencyKey)) {
    // Defensive only — lib/odoo/rfq-payload-mapper.ts's own builder always
    // produces a value satisfying this; a caller bug must never silently
    // send a malformed key to Odoo.
    return { status: "invalid_payload", reasonCode: "RFQ_CLIENT_INVALID_IDEMPOTENCY_KEY" };
  }

  const config = getOdooRfqApiConfig();
  if (!config) {
    return { status: "not_configured", reasonCode: "ODOO_RFQ_API_NOT_CONFIGURED" };
  }

  const body = JSON.stringify(payload);
  if (new TextEncoder().encode(body).length > MAX_BODY_SIZE_BYTES) {
    // Fails closed before ever reaching the network — the Website's own
    // MAX_ITEMS cap should make this unreachable in practice, but a
    // corrupted/oversized snapshot must never be sent regardless.
    return { status: "payload_too_large", reasonCode: "RFQ_CLIENT_PAYLOAD_TOO_LARGE" };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const url = `${config.baseUrl.replace(/\/+$/, "")}/api/v1/rfq`;
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "Idempotency-Key": idempotencyKey,
      },
      body,
      signal: controller.signal,
    });

    return await parseResponse(response);
  } catch (err) {
    if (err instanceof RfqApiClientError) throw err; // unreachable — parseResponse never throws this; defensive only
    return { status: "network_error", reasonCode: "ODOO_RFQ_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

class RfqApiClientError extends Error {}

async function parseResponse(response: Response): Promise<RfqApiOutcome> {
  if (response.status === 201 || response.status === 200) {
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { status: "malformed_response", reasonCode: "ODOO_RFQ_MALFORMED_SUCCESS_RESPONSE" };
    }
    if (!isSuccessBody(json)) {
      return { status: "malformed_response", reasonCode: "ODOO_RFQ_UNEXPECTED_SUCCESS_SHAPE" };
    }
    if (response.status === 201) {
      return { status: "created", reference: json.data.reference, verificationSession: json.verification_session };
    }
    // 200: idempotent replay — meta.idempotent_replay is expected true, but
    // the reference itself (not this flag) is what the caller must trust
    // and reconcile against any already-persisted mapping.
    return { status: "replayed", reference: json.data.reference };
  }

  switch (response.status) {
    case 400:
      return { status: "invalid_payload", reasonCode: await safeErrorCode(response, "ODOO_RFQ_INVALID_PAYLOAD") };
    case 401:
      return { status: "unauthorized", reasonCode: "ODOO_RFQ_UNAUTHORIZED" };
    case 409:
      return { status: "idempotency_conflict", reasonCode: await safeErrorCode(response, "ODOO_RFQ_IDEMPOTENCY_CONFLICT") };
    case 413:
      return { status: "payload_too_large", reasonCode: "ODOO_RFQ_PAYLOAD_TOO_LARGE" };
    case 415:
      return { status: "unsupported_media_type", reasonCode: "ODOO_RFQ_UNSUPPORTED_MEDIA_TYPE" };
    default:
      if (response.status >= 500) return { status: "server_error", reasonCode: "ODOO_RFQ_SERVER_ERROR" };
      return { status: "invalid_payload", reasonCode: `ODOO_RFQ_UNEXPECTED_STATUS_${response.status}` };
  }
}

/** Reads the safe `{error:{code,...}}` envelope's `code` only — never the `message` (may echo request content) and never logged/forwarded raw, per RFQ_API_CONTRACT_V1.md's own "never expose stack traces, models, SQL, or PII". Falls back to a generic code on any parse failure. */
async function safeErrorCode(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as unknown;
    if (isErrorBody(json) && /^[A-Za-z0-9_]{1,64}$/.test(json.error.code)) {
      return `ODOO_RFQ_${json.error.code}`;
    }
  } catch {
    // fall through
  }
  return fallback;
}

function isSuccessBody(value: unknown): value is RfqApiSuccessBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.data !== "object" || v.data === null) return false;
  const data = v.data as Record<string, unknown>;
  return typeof data.reference === "string" && data.reference.length > 0;
}

function isErrorBody(value: unknown): value is RfqApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.error !== "object" || v.error === null) return false;
  const error = v.error as Record<string, unknown>;
  return typeof error.code === "string";
}
