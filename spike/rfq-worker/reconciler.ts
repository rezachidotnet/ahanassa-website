import { handleOdooSyncBatch, type QueueMessageLike } from "@/lib/queue/consumer";
import { mapRfqToApiPayload, buildOutboundRfqIdempotencyKey } from "@/lib/odoo/rfq-payload-mapper";
import { postRfqToOdoo } from "@/lib/odoo/rfq-api-client";

/** Spike profiling only: same reads + mapping (+ optional stub POST) as the consumer, no writes. */
async function profileReadMap(db: D1Database, rfqId: string, post: boolean): Promise<void> {
  const rfq = await db
    .prepare(`SELECT r.id, r.company_name, r.message, r.locale, c.full_name, c.email_normalized, c.phone_e164, c.phone_national FROM rfqs r JOIN rfq_contacts c ON c.rfq_id = r.id WHERE r.id = ?`)
    .bind(rfqId)
    .first<{ id: string; company_name: string | null; message: string | null; locale: string; full_name: string; email_normalized: string | null; phone_e164: string | null; phone_national: string | null }>();
  if (!rfq) return;
  const { results } = await db
    .prepare(`SELECT line_number, variant_ref, sku_snapshot, freeform_title, description, quantity_text, quantity_value, quantity_scale, unit_ref, length_mm FROM rfq_items WHERE rfq_id = ? ORDER BY line_number ASC`)
    .bind(rfqId)
    .all<Record<string, never>>();
  const mapping = mapRfqToApiPayload({
    locale: rfq.locale,
    fullName: rfq.full_name,
    companyName: rfq.company_name,
    phone: rfq.phone_e164 ?? rfq.phone_national,
    email: rfq.email_normalized,
    message: rfq.message,
    items: results.map((i: Record<string, never>) => ({ lineNumber: i.line_number, variantRef: i.variant_ref, skuSnapshot: i.sku_snapshot, freeformTitle: i.freeform_title, description: i.description, quantityText: i.quantity_text, quantityValue: i.quantity_value, quantityScale: i.quantity_scale, unitCode: i.unit_ref, lengthMm: i.length_mm })),
  });
  if (post && mapping.ok) await postRfqToOdoo(mapping.payload, buildOutboundRfqIdempotencyKey(rfq.id));
}

/**
 * Spike S1 — direct reconciler (architecture V1.1-RC1 §6.4): works without
 * any Queue. Picks at most `max` undelivered RFQs whose outbox row is due —
 * driven by rfqs.sync_status, not only by the outbox status — and runs each
 * through the SAME consumer logic the Queue path uses
 * (lib/queue/consumer.ts handleOdooSyncBatch), via in-memory messages.
 */
export async function spikeReconcile(db: D1Database, max = 3, selectOnly = false, profileMode: "map" | "post" | null = null): Promise<{ picked: number; acked: number; retried: number }> {
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

  if (selectOnly) return { picked: results.length, acked: 0, retried: 0 };
  if (profileMode) {
    for (const row of results) await profileReadMap(db, (JSON.parse(row.payload_json) as { aggregate_id: string }).aggregate_id, profileMode === "post");
    return { picked: results.length, acked: 0, retried: 0 };
  }
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
