import { getOpsDb } from "@/lib/db/ops";
import { tryPublishOutboxEvent } from "@/lib/queue/outbox";
import type { RfqSubmissionRecord } from "@/lib/rfq/types";
import { persistRfq } from "@/lib/rfq/intake-store";

export interface CreateRfqResult {
  reference: string;
  /** True when this call created a new RFQ; false when an existing one with the same idempotency key was found. */
  created: boolean;
}

/**
 * Legacy SSR route (`app/api/rfqs`) entry: the transactional write lives in
 * lib/rfq/intake-store.ts (shared with the standalone RFQ Worker); this
 * wrapper binds DB_OPS from `cloudflare:workers` and keeps the best-effort
 * Queue fast path after commit (lib/queue/outbox.ts). Behaviour and SQL are
 * unchanged from before V1.1.
 */
export async function createRfq(input: RfqSubmissionRecord, idempotencyKeyHash: string, correlationId: string): Promise<CreateRfqResult> {
  const result = await persistRfq(getOpsDb(), input, idempotencyKeyHash, correlationId);
  if (result.created && result.event) await tryPublishOutboxEvent(result.event);
  return { reference: result.reference, created: result.created };
}
