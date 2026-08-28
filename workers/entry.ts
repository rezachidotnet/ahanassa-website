import vinextHandler from "vinext/server/fetch-handler";
import { handleOdooSyncBatch, type QueueBatchLike, type QueueMessageLike } from "@/lib/queue/consumer";
import { dispatchPendingOutboxEvents } from "@/lib/queue/outbox";

/**
 * Custom Worker entry. Delegates all HTTP traffic to vinext unchanged
 * (per node_modules/vinext/dist/server/fetch-handler.d.ts's own documented
 * delegation pattern) and adds the two Worker-level handlers vinext itself
 * does not provide: a Queue consumer (`queue`) and a scheduled outbox
 * reconciliation sweep (`scheduled`). Binding ACCESS from route
 * handlers/server components still uses `cloudflare:workers` directly per
 * vinext's own convention — this file exists only for handlers Cloudflare
 * requires at the top-level Worker export.
 *
 * wrangler.jsonc's "main" points here instead of directly at
 * "vinext/server/fetch-handler".
 */
export default {
  fetch: vinextHandler.fetch,

  async queue(batch: QueueBatchLike, env: CloudflareEnv): Promise<void> {
    await handleOdooSyncBatch(batch, env);
  },

  async scheduled(_event: ScheduledController, _env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(dispatchPendingOutboxEvents());
  },
};
