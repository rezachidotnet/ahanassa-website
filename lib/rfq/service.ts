import { hashIdempotencyKey } from "@/lib/rfq/idempotency";
import { createRfq } from "@/lib/rfq/repository";
import { validateRfqSubmission } from "@/lib/rfq/validation";
import type { RfqResponse } from "@/lib/rfq/types";
import { ServiceUnavailableError } from "@/lib/db/ops";

export interface SubmitRfqOptions {
  correlationId: string;
  /** Minimum plausible human-completion time in ms; requests faster than this are treated as automated (best-effort, passive signal only). */
  minCompletionMs?: number;
}

const DEFAULT_MIN_COMPLETION_MS = 1500;

export async function submitRfq(rawBody: unknown, options: SubmitRfqOptions): Promise<{ status: number; body: RfqResponse }> {
  const result = validateRfqSubmission(rawBody);
  if (!result.ok || !result.value) {
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: result.fieldErrors } };
  }

  const body = rawBody as Record<string, unknown>;
  const minCompletionMs = options.minCompletionMs ?? DEFAULT_MIN_COMPLETION_MS;
  if (typeof body.formRenderedAt === "number" && Date.now() - body.formRenderedAt < minCompletionMs) {
    // Passive timing signal only (FORM_ARCHITECTURE.md §18.3: "Use passive
    // controls first"). Rejected the same way as a normal validation error
    // so the signal itself is not revealed to an automated client.
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["rejected"] } } };
  }

  const idempotencyKeyHash = await hashIdempotencyKey(result.value.idempotencyKey);

  try {
    const { reference } = await createRfq(result.value, idempotencyKeyHash, options.correlationId);
    return { status: 201, body: { ok: true, reference, status: "received" } };
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    }
    throw err;
  }
}
