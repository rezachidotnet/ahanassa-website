import vinextHandler from "vinext/server/fetch-handler";
import { handleOdooSyncBatch, type QueueBatchLike, type QueueMessageLike } from "@/lib/queue/consumer";
import { dispatchPendingOutboxEvents } from "@/lib/queue/outbox";
import { runScheduledCatalogSync } from "@/lib/catalog/scheduled-sync";

/**
 * Custom Worker entry. Delegates all HTTP traffic to vinext unchanged
 * (per node_modules/vinext/dist/server/fetch-handler.d.ts's own documented
 * delegation pattern) and adds the Worker-level handlers vinext itself does
 * not provide: a Queue consumer (`queue`) and a shared `scheduled` handler
 * routing THREE distinct Cron triggers (wrangler.jsonc `triggers.crons`) —
 * the pre-existing RFQ outbox reconciliation sweep, plus Catalog
 * incremental sync and full reconciliation (DOCUMENT_AUDIT_REPORT.md
 * DAR-040, docs/CATALOG_SYNC_OPERATIONS.md). Binding ACCESS from route
 * handlers/server components still uses `cloudflare:workers` directly per
 * vinext's own convention — this file exists only for handlers Cloudflare
 * requires at the top-level Worker export.
 *
 * Routing is entirely by the literal cron expression string Cloudflare
 * reports on `event.cron` — never by any request/user input, matching this
 * task's own "do not base behavior on user input" requirement (there is no
 * request at all for a scheduled invocation). `triggers.crons` is a
 * top-level (shared) config key, not per-environment — but each named
 * environment (`ahanassa-bootstrap-staging`/`ahanassa-production`) is a
 * physically separate deployed Worker with its own D1/Queue bindings, so
 * the identical cron *expressions* firing on each one only ever touch that
 * environment's own bound DB_PUBLIC/DB_OPS — never the other's.
 *
 * wrangler.jsonc's "main" points here instead of directly at
 * "vinext/server/fetch-handler".
 */

const RFQ_OUTBOX_CRON = "*/5 * * * *";
const CATALOG_INCREMENTAL_CRON = "0 */3 * * *";
const CATALOG_FULL_RECONCILIATION_CRON = "30 2 * * *";

export default {
  // Temporary Deployment Stage 1 preview Basic Auth protection
  // (docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md §7) removed here at Stage 2B
  // production cutover (docs/GO_LIVE_CUTOVER_RUNBOOK.md §3,
  // DOCUMENT_AUDIT_REPORT.md DAR-050) — the public www.ahanassa.com
  // domain must never be gated behind a Basic Auth prompt. Public-mode
  // request handling delegates directly to vinext, unchanged from before
  // preview-auth.ts existed. Turnstile, rate limiting, honeypot,
  // same-origin checks, security headers, and RFQ server-side validation
  // are all independent of this gate and remain fully intact.
  fetch: vinextHandler.fetch,

  async queue(batch: QueueBatchLike, env: CloudflareEnv): Promise<void> {
    await handleOdooSyncBatch(batch, env);
  },

  async scheduled(event: ScheduledController, _env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    switch (event.cron) {
      case CATALOG_INCREMENTAL_CRON:
        ctx.waitUntil(runScheduledCatalogSync("incremental"));
        return;
      case CATALOG_FULL_RECONCILIATION_CRON:
        ctx.waitUntil(runScheduledCatalogSync("full"));
        return;
      case RFQ_OUTBOX_CRON:
      default:
        // Any unrecognized cron string (should not happen — only the three
        // above are ever configured) falls back to the original, narrower
        // RFQ outbox sweep rather than silently doing nothing.
        ctx.waitUntil(dispatchPendingOutboxEvents());
        return;
    }
  },
};
