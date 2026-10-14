/**
 * Standalone RFQ Worker (architecture V1.1 §4.3, §6; A4) — api(-staging).ahanassa.com.
 * Imports NO vinext / Next.js module: lib/rfq-worker, lib/rfq, lib/contracts,
 * lib/security, lib/odoo payload mapping only.
 *
 *   OPTIONS/POST /api/rfqs     rfq_submit.v1 intake (CORS: exact allow-list)
 *   GET/OPTIONS/PUT /api/rfqs/files[/<reference>/<slot>]  RFQ file upload (D-RFQ-FILE, lib/rfq-worker/attachments.ts)
 *   OPTIONS/POST /api/rfqs/extract  read a picture/PDF list into draft rows before submit (W13.3, lib/rfq-worker/extract.ts)
 *   GET          /healthz      liveness (no D1)
 *   /__admin/*                 §15 manual-review tool + reconcile trigger (lib/rfq-worker/admin.ts)
 *   queue                      one message = one RFQ (max_batch_size 1)
 *   scheduled                  cron reconciler: one due RFQ per run; then the RFQ-file R2 retention sweep
 *
 * Two entries build from this factory: index.ts (production — no test code)
 * and index.staging.ts (adds the staging test routes). W3, C1.
 */
import { handleRfqSubmit } from "../../lib/rfq-worker/submit.ts";
import { preflightResponse } from "../../lib/rfq-worker/cors.ts";
import { filesCapability, filesPreflight, handleFileUpload, isFilesPath, FILES_PATH } from "../../lib/rfq-worker/attachments.ts";
import { consumeOne, reconcileOnce, type QueueMessageLike } from "../../lib/rfq-worker/runners.ts";
import { EXTRACT_PATH, extractPreflight, handleExtract } from "../../lib/rfq-worker/extract.ts";
import { sweepRfqFiles } from "../../lib/rfq-worker/file-retention.ts";
import { handleAdmin, type AdminExtension } from "../../lib/rfq-worker/admin.ts";
import { csv, type RfqWorkerEnv } from "../../lib/rfq-worker/config.ts";
import type { OdooSyncEvent } from "../../lib/queue/types.ts";

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

export interface RfqWorkerOptions {
  /** Extra authenticated /__admin/* routes — staging test routes only. */
  adminExtension?: AdminExtension;
  /** Staging only: may swap the Turnstile verification (test path) for one request. */
  prepareSubmit?: (env: RfqWorkerEnv) => { env: RfqWorkerEnv; fetchImpl?: typeof fetch };
  /** Staging only: the same for POST /api/rfqs/extract (W13.3). */
  prepareExtract?: (env: RfqWorkerEnv) => { env: RfqWorkerEnv; fetchImpl?: typeof fetch };
}

export function createRfqWorker(options: RfqWorkerOptions = {}) {
  return {
    async fetch(request: Request, env: RfqWorkerEnv, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === "/api/rfqs") {
        if (request.method === "OPTIONS") return preflightResponse(request, csv(env.ALLOWED_ORIGINS));
        const prepared = options.prepareSubmit?.(env) ?? { env };
        return handleRfqSubmit(request, prepared.env, {
          fetchImpl: prepared.fetchImpl,
          afterCommit: async (event) => {
            ctx.waitUntil(queueHandoff(env, event));
          },
        });
      }
      if (url.pathname === EXTRACT_PATH) {
        if (request.method === "OPTIONS") return extractPreflight(request, csv(env.ALLOWED_ORIGINS));
        const prepared = options.prepareExtract?.(env) ?? { env };
        return handleExtract(request, prepared.env, { fetchImpl: prepared.fetchImpl });
      }
      if (isFilesPath(url.pathname)) {
        if (request.method === "OPTIONS") return filesPreflight(request, csv(env.ALLOWED_ORIGINS));
        if (url.pathname === FILES_PATH && request.method === "GET") return filesCapability(request, env);
        return handleFileUpload(request, env, url);
      }
      if (url.pathname === "/healthz" && request.method === "GET") return json(200, { ok: true });
      if (url.pathname.startsWith("/__admin/")) return handleAdmin(request, env, url, options.adminExtension);
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
      // RFQ files past their retention (lib/rfq-worker/file-retention.ts); never blocks the reconciler.
      try {
        await sweepRfqFiles(env, new Date());
      } catch (err) {
        console.error(JSON.stringify({ operation: "rfq.file_retention", result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
      }
    },
  };
}
