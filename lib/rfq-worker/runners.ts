import { deliverOne, pickDueRfq, type DeliveryConfig, type DeliveryResult } from "./delivery.ts";
import { flag, type RfqWorkerEnv } from "./config.ts";
import type { OdooSyncEvent } from "../queue/types.ts";

/**
 * The three delivery runners (architecture V1.1 §4.3, §6.4). Each handles at
 * most ONE RFQ per invocation and calls the same `deliverOne`.
 */
export function deliveryConfigFromEnv(env: RfqWorkerEnv, overrides: Partial<DeliveryConfig> = {}): DeliveryConfig {
  return { odooBaseUrl: env.ODOO_BASE_URL ?? "", token: env.ODOO_RFQ_API_TOKEN ?? null, intakeV11: flag(env.ODOO_INTAKE_V11), ...overrides };
}

export interface QueueMessageLike {
  body: unknown;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

const QUEUE_MAX_DELAY_SECONDS = 12 * 60 * 60;

/** Queue consumer: max_batch_size 1 (wrangler.jsonc) — one message, one RFQ. */
export async function consumeOne(message: QueueMessageLike, env: RfqWorkerEnv, cfg = deliveryConfigFromEnv(env)): Promise<DeliveryResult | null> {
  const event = message.body as Partial<OdooSyncEvent>;
  if (!event || typeof event.aggregate_id !== "string") {
    message.ack();
    return null;
  }
  if (!flag(env.DELIVERY_ON_QUEUE)) {
    // Delivery disabled on the Worker (CPU budget not met, §4.3): the reconciler path delivers instead.
    message.ack();
    return null;
  }
  const result = await deliverOne(env.DB_OPS, event.aggregate_id, cfg);
  if (result.status === "done" && result.nextAttemptAt) {
    const delaySeconds = Math.min(QUEUE_MAX_DELAY_SECONDS, Math.max(1, Math.round((Date.parse(result.nextAttemptAt) - Date.now()) / 1000)));
    message.retry({ delaySeconds });
  } else {
    message.ack();
  }
  return result;
}

export interface ReconcileOutcome {
  picked: string | null;
  action: "none" | "enqueued" | "delivered" | "disabled";
  result?: DeliveryResult;
}

/**
 * Cron reconciler (§6.4): picks ONE due RFQ from rfqs.sync_status. With the
 * Queue path enabled it re-enqueues it (cheap); otherwise it delivers it
 * directly when DELIVERY_ON_CRON is on; otherwise it does nothing and the CI
 * reconciler (scripts/rfq/ci-reconciler.ts) is the delivery path.
 */
export async function reconcileOnce(env: RfqWorkerEnv, now = new Date(), cfg = deliveryConfigFromEnv(env)): Promise<ReconcileOutcome> {
  const picked = await pickDueRfq(env.DB_OPS, now);
  if (!picked) return { picked: null, action: "none" };
  if (flag(env.DELIVERY_ON_QUEUE) && env.RFQ_QUEUE) {
    await env.RFQ_QUEUE.send({ event_id: `reconcile-${picked}`, event_type: "rfq.created", aggregate_id: picked, aggregate_version: 1, occurred_at: now.toISOString(), schema_version: 1, correlation_id: `reconcile-${picked}` } satisfies OdooSyncEvent);
    return { picked, action: "enqueued" };
  }
  if (!flag(env.DELIVERY_ON_CRON)) return { picked, action: "disabled" };
  return { picked, action: "delivered", result: await deliverOne(env.DB_OPS, picked, cfg) };
}
