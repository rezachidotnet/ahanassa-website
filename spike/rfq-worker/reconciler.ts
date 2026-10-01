import { handleOdooSyncBatch, type QueueMessageLike } from "@/lib/queue/consumer";

/**
 * Spike S1 — direct reconciler (architecture V1.1-RC1 §6.4): works without
 * any Queue. Picks at most `max` undelivered RFQs whose outbox row is due —
 * driven by rfqs.sync_status, not only by the outbox status — and runs each
 * through the SAME consumer logic the Queue path uses
 * (lib/queue/consumer.ts handleOdooSyncBatch), via in-memory messages.
 */
export async function spikeReconcile(db: D1Database, max = 3): Promise<{ picked: number; acked: number; retried: number }> {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT o.event_id, o.payload_json, o.attempt_count
       FROM integration_outbox o JOIN rfqs r ON r.id = o.aggregate_id
       WHERE r.odoo_rfq_reference IS NULL
         AND r.sync_status IN ('pending', 'retry')
         AND o.available_at <= ?
       ORDER BY o.available_at ASC
       LIMIT ?`,
    )
    .bind(now, max)
    .all<{ event_id: string; payload_json: string; attempt_count: number }>();

  let acked = 0;
  let retried = 0;
  const outcomes: { eventId: string; acked: boolean; attempts: number }[] = [];
  const messages: QueueMessageLike[] = results.map((row) => {
    const outcome = { eventId: row.event_id, acked: false, attempts: row.attempt_count };
    outcomes.push(outcome);
    return {
      id: row.event_id,
      body: JSON.parse(row.payload_json),
      attempts: row.attempt_count + 1,
      ack: () => {
        outcome.acked = true;
      },
      retry: () => {
        outcome.acked = false;
      },
    };
  });
  if (messages.length === 0) return { picked: 0, acked: 0, retried: 0 };
  await handleOdooSyncBatch({ queue: "spike-direct-reconciler", messages }, { DB_OPS: db });

  const stmts = outcomes.map((o) => {
    if (o.acked) {
      acked++;
      return db.prepare(`UPDATE integration_outbox SET status = 'published', published_at = ? WHERE event_id = ?`).bind(now, o.eventId);
    }
    retried++;
    const backoffMin = Math.min(60, 2 ** (o.attempts + 1));
    return db
      .prepare(`UPDATE integration_outbox SET status = 'retry', attempt_count = ?, available_at = ?, last_error_code = 'DIRECT_DELIVERY_FAILED' WHERE event_id = ?`)
      .bind(o.attempts + 1, new Date(Date.now() + backoffMin * 60_000).toISOString(), o.eventId);
  });
  await db.batch(stmts);
  return { picked: messages.length, acked, retried };
}
