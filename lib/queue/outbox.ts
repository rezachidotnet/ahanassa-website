import { env } from "cloudflare:workers";
import { ulid } from "@/lib/rfq/ulid";
import type { OdooSyncEvent } from "@/lib/queue/types";

/**
 * Transactional outbox helpers. The outbox row is written in the same D1
 * batch as the RFQ it describes (see lib/rfq/repository.ts) — this file
 * only builds the event envelope and performs best-effort dispatch after
 * that transaction has already committed successfully.
 *
 * 01-sources/TECHNICAL_ARCHITECTURE.md §12.3: "Immediate Queue publish MAY
 * be a fast path; the outbox remains the recovery mechanism." A failed
 * publish here is not a request failure — the RFQ is already durably
 * stored and `dispatchPendingOutboxEvents` (invoked on a schedule, see
 * workers/entry.ts `scheduled()`) recovers it.
 */

export function buildRfqCreatedEvent(rfqId: string, correlationId: string): { event: OdooSyncEvent; row: OutboxRow } {
  const eventId = ulid();
  const occurredAt = new Date().toISOString();
  const event: OdooSyncEvent = {
    event_id: eventId,
    event_type: "rfq.created",
    aggregate_id: rfqId,
    aggregate_version: 1,
    occurred_at: occurredAt,
    schema_version: 1,
    correlation_id: correlationId,
  };
  const row: OutboxRow = {
    eventId,
    aggregateType: "rfq",
    aggregateId: rfqId,
    aggregateVersion: 1,
    eventType: "rfq.created",
    schemaVersion: 1,
    correlationId,
    payloadJson: JSON.stringify(event),
    availableAt: occurredAt,
    createdAt: occurredAt,
  };
  return { event, row };
}

export interface OutboxRow {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  eventType: string;
  schemaVersion: number;
  correlationId: string;
  payloadJson: string;
  availableAt: string;
  createdAt: string;
}

/** Best-effort immediate publish. Never throws — caller must not fail the request if this fails. */
export async function tryPublishOutboxEvent(event: OdooSyncEvent): Promise<boolean> {
  const queue = (env as CloudflareEnv).ODOO_SYNC_QUEUE;
  if (!queue) return false;
  try {
    await queue.send(event);
    await markOutboxPublished(event.event_id);
    return true;
  } catch {
    return false;
  }
}

async function markOutboxPublished(eventId: string): Promise<void> {
  const db = (env as CloudflareEnv).DB_OPS;
  if (!db) return;
  await db
    .prepare(`UPDATE integration_outbox SET status = 'published', published_at = ? WHERE event_id = ? AND status != 'published'`)
    .bind(new Date().toISOString(), eventId)
    .run();
}

const MAX_DISPATCH_BATCH = 25;

/**
 * Reconciliation sweep: republishes outbox rows still `pending`/`retry`
 * after the immediate-publish fast path failed or was skipped. Invoked on
 * a schedule (workers/entry.ts `scheduled()`), never blocks a request.
 */
export async function dispatchPendingOutboxEvents(): Promise<{ dispatched: number; failed: number }> {
  const db = (env as CloudflareEnv).DB_OPS;
  const queue = (env as CloudflareEnv).ODOO_SYNC_QUEUE;
  if (!db || !queue) return { dispatched: 0, failed: 0 };

  const now = new Date().toISOString();
  const due = await db
    .prepare(
      `SELECT event_id, aggregate_id, aggregate_version, event_type, schema_version, correlation_id, payload_json, attempt_count
       FROM integration_outbox
       WHERE status IN ('pending', 'retry') AND available_at <= ?
       ORDER BY available_at ASC
       LIMIT ?`,
    )
    .bind(now, MAX_DISPATCH_BATCH)
    .all<{
      event_id: string;
      payload_json: string;
      attempt_count: number;
    }>();

  let dispatched = 0;
  let failed = 0;

  for (const row of due.results ?? []) {
    try {
      const event = JSON.parse(row.payload_json);
      await queue.send(event);
      await db
        .prepare(`UPDATE integration_outbox SET status = 'published', published_at = ? WHERE event_id = ?`)
        .bind(new Date().toISOString(), row.event_id)
        .run();
      dispatched++;
    } catch {
      const nextAttempt = (row.attempt_count ?? 0) + 1;
      // Bounded exponential backoff, capped at ~1 hour (01-sources/TECHNICAL_ARCHITECTURE.md §14.5).
      const backoffMinutes = Math.min(60, 2 ** nextAttempt);
      const availableAt = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      await db
        .prepare(
          `UPDATE integration_outbox SET status = 'retry', attempt_count = ?, available_at = ?, last_error_code = 'DISPATCH_FAILED' WHERE event_id = ?`,
        )
        .bind(nextAttempt, availableAt, row.event_id)
        .run();
      failed++;
    }
  }

  return { dispatched, failed };
}
