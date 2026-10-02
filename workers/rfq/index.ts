/**
 * Standalone RFQ Worker (architecture V1.1 §4.3, §6; A4) — api(-staging).ahanassa.com.
 * Imports NO vinext / Next.js module: lib/rfq-worker, lib/rfq, lib/contracts,
 * lib/security, lib/odoo payload mapping only.
 *
 *   OPTIONS/POST /api/rfqs     rfq_submit.v1 intake (CORS: exact allow-list)
 *   GET          /healthz      liveness (no D1)
 *   POST         /__admin/*    bearer ADMIN_TOKEN: reconcile once; staging-only test hooks (TEST_HOOKS=1)
 *   queue                      one message = one RFQ (max_batch_size 1)
 *   scheduled                  cron reconciler: one due RFQ per run
 */
import { handleRfqSubmit } from "../../lib/rfq-worker/submit.ts";
import { preflightResponse } from "../../lib/rfq-worker/cors.ts";
import { consumeOne, deliveryConfigFromEnv, reconcileOnce, type QueueMessageLike } from "../../lib/rfq-worker/runners.ts";
import { deliverOne } from "../../lib/rfq-worker/delivery.ts";
import { csv, flag, type RfqWorkerEnv } from "../../lib/rfq-worker/config.ts";
import type { OdooSyncEvent } from "../../lib/queue/types.ts";

/** The only real Odoo host the 401 probe may call — unauthenticated, so nothing can be created there. */
const REAL_ODOO_BASE_URL = "https://odoo.ahanassa.com";
const QUEUE_HANDOFF_GRACE_MS = 2 * 60 * 1000;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store" } });

async function queueHandoff(env: RfqWorkerEnv, event: OdooSyncEvent): Promise<void> {
  if (!env.RFQ_QUEUE || env.QUEUE_FAST_PATH === "0") return;
  try {
    await env.RFQ_QUEUE.send(event);
    const now = new Date();
    // QUEUED (§6.3); the reconciler re-drives it only if the Queue has not delivered within the grace period.
    await env.DB_OPS.batch([
      env.DB_OPS.prepare(`UPDATE rfqs SET sync_status = 'queued', updated_at = ? WHERE id = ? AND sync_status = 'pending'`).bind(now.toISOString(), event.aggregate_id),
      env.DB_OPS.prepare(`UPDATE integration_outbox SET status = 'published', published_at = ?, available_at = ? WHERE event_id = ? AND status = 'pending'`).bind(now.toISOString(), new Date(now.getTime() + QUEUE_HANDOFF_GRACE_MS).toISOString(), event.event_id),
    ]);
  } catch (err) {
    // Never affects acceptance: the outbox row stays pending and the reconciler delivers it (§6.1 step 6).
    console.error(JSON.stringify({ operation: "rfq.queue_handoff", rfqId: event.aggregate_id, result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
  }
}

async function admin(request: Request, env: RfqWorkerEnv, url: URL): Promise<Response> {
  if (!env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) return json(404, { ok: false });
  if (request.method !== "POST") return json(405, { ok: false });
  if (url.pathname === "/__admin/reconcile") return json(200, await reconcileOnce(env));
  if (!flag(env.TEST_HOOKS)) return json(404, { ok: false });
  const rfqId = url.searchParams.get("rfq") ?? "";
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(rfqId)) return json(400, { ok: false, error: "rfq id required" });
  if (url.pathname === "/__admin/deliver") {
    // Test hook: optionally die after the POST and before the result batch (re-delivery must not duplicate).
    try {
      return json(200, await deliverOne(env.DB_OPS, rfqId, deliveryConfigFromEnv(env, { killAfterPost: url.searchParams.get("kill_after_post") === "1" })));
    } catch (err) {
      return json(500, { ok: false, error: err instanceof Error ? err.message : "error" });
    }
  }
  if (url.pathname === "/__admin/deliver-real-401") {
    // CPU probe against the REAL Odoo endpoint WITHOUT any Authorization header: Odoo answers 401 and creates nothing.
    return json(200, await deliverOne(env.DB_OPS, rfqId, deliveryConfigFromEnv(env, { odooBaseUrl: REAL_ODOO_BASE_URL, token: null })));
  }
  return json(404, { ok: false });
}

export default {
  async fetch(request: Request, env: RfqWorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/rfqs") {
      if (request.method === "OPTIONS") return preflightResponse(request, csv(env.ALLOWED_ORIGINS));
      return handleRfqSubmit(request, env, {
        afterCommit: async (event) => {
          ctx.waitUntil(queueHandoff(env, event));
        },
      });
    }
    if (url.pathname === "/healthz" && request.method === "GET") return json(200, { ok: true });
    if (url.pathname.startsWith("/__admin/")) return admin(request, env, url);
    return json(404, { ok: false });
  },

  async queue(batch: MessageBatch<unknown>, env: RfqWorkerEnv): Promise<void> {
    if (batch.queue.endsWith("-dlq")) {
      // The D1 outbox is authoritative (§6.4): a dead-lettered message changes nothing — the reconciler re-drives the RFQ.
      for (const message of batch.messages) {
        console.error(JSON.stringify({ operation: "rfq.dlq", aggregateId: (message.body as Partial<OdooSyncEvent>)?.aggregate_id ?? null, attempts: message.attempts }));
        message.ack();
      }
      return;
    }
    for (const message of batch.messages) {
      try {
        await consumeOne(message as unknown as QueueMessageLike, env);
      } catch (err) {
        console.error(JSON.stringify({ operation: "rfq.consume", result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
        message.retry({ delaySeconds: 60 });
      }
    }
  },

  async scheduled(_event: ScheduledController, env: RfqWorkerEnv): Promise<void> {
    const outcome = await reconcileOnce(env);
    if (outcome.picked) console.log(JSON.stringify({ operation: "rfq.reconcile", ...outcome, result: outcome.result?.status === "done" ? outcome.result.classification : outcome.result?.status ?? null }));
  },
};
