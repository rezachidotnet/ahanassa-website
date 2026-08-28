import { ulid } from "@/lib/rfq/ulid";
import { MAX_BODY_BYTES } from "@/lib/rfq/validation";
import { submitRfq } from "@/lib/rfq/service";
import type { RfqResponse } from "@/lib/rfq/types";

/**
 * POST /api/rfqs — canonical RFQ submission endpoint
 * (01-sources/TECHNICAL_ARCHITECTURE.md §12.1/§16).
 *
 * Contract: accepts structured JSON, validates and normalizes server-side,
 * persists RFQ + items + outbox event atomically in D1, and returns a
 * minimal response — never a D1 ID, Odoo ID, stack trace, or Queue detail
 * (§12.4). Other HTTP methods on this route 405 automatically (only POST is
 * exported).
 */

function jsonResponse(status: number, body: RfqResponse): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isSameOriginOrAbsent(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Not all legitimate same-site requests send Origin; absence is not itself proof of forgery.
  // Compare against the incoming request's own origin, not a static
  // configured base URL — the latter defaults to the production canonical
  // origin (lib/env.ts) and would reject every legitimate same-origin
  // request in local/preview/staging environments.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = ulid();

  if (!isSameOriginOrAbsent(request)) {
    return jsonResponse(403, { ok: false, code: "VERIFICATION_FAILED" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(415, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["unsupported_content_type"] } });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["unreadable_body"] } });
  }

  if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["invalid_json"] } });
  }

  try {
    const { status, body: responseBody } = await submitRfq(body, { correlationId });
    return jsonResponse(status, responseBody);
  } catch (err) {
    // Safe structured log only — no request body, no PII, no stack trace in
    // the response (01-sources/TECHNICAL_ARCHITECTURE.md §23).
    console.error(
      JSON.stringify({
        operation: "rfq.submit",
        correlationId,
        result: "error",
        errorClass: err instanceof Error ? err.name : "unknown",
      }),
    );
    return jsonResponse(500, { ok: false, code: "SERVICE_UNAVAILABLE" });
  }
}
