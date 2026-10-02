import { reconcileOnce } from "./runners.ts";
import { ulid } from "../rfq/ulid.ts";
import type { RfqWorkerEnv } from "./config.ts";

/**
 * RFQ Worker admin routes (architecture V1.1 §15, W3) — the MANUAL_REVIEW
 * tool and the manual reconcile trigger, nothing else:
 *
 *   GET  /__admin/manual-review?status=manual_review|retry|failed|pending|queued|syncing&limit=50
 *   POST /__admin/manual-review/retry   {"rfqId": "...", "reason": "..."}
 *   POST /__admin/manual-review/close   {"rfqId": "...", "reason": "..."}
 *   POST /__admin/reconcile             {"reason": "..."}
 *
 * Bearer ADMIN_TOKEN (a separate Worker secret per environment), compared in
 * constant time; a missing/wrong bearer gets the same 404 as an unknown path.
 * Every mutating action needs a reason (1–500 chars) and is written to
 * rfq_admin_actions in the same D1 batch as the change, and logged.
 * `x-admin-actor` names the operator in the log (free text, never a credential).
 *
 * Test-only routes (crash/401 probes) are NOT here: the staging entry
 * (workers/rfq/index.staging.ts) passes them in as `extension`, so they are
 * never compiled into the production bundle.
 */

export type AdminExtension = (request: Request, env: RfqWorkerEnv, url: URL) => Promise<Response | null>;

const LISTABLE = ["manual_review", "retry", "failed", "pending", "queued", "syncing"] as const;
const RETRYABLE = ["manual_review", "retry", "failed"];
const CLOSABLE = ["manual_review", "retry"];
const RFQ_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const ACTOR = /^[A-Za-z0-9._@ -]{1,64}$/;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store" } });

async function digest(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Constant-time bearer check: both sides are hashed to 32 bytes, then compared without early exit. */
export async function bearerMatches(authorization: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  const presented = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const [a, b] = await Promise.all([digest(presented), digest(secret)]);
  let diff = presented.length === 0 ? 1 : 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function readAction(request: Request): Promise<{ rfqId: string | null; reason: string } | { error: string }> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { error: "json object required" };
    body = parsed as Record<string, unknown>;
  } catch {
    return { error: "json object required" };
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 1 || reason.length > 500) return { error: "reason (1-500 chars) required" };
  const rfqId = typeof body.rfqId === "string" ? body.rfqId : null;
  if (rfqId !== null && !RFQ_ID.test(rfqId)) return { error: "invalid rfqId" };
  return { rfqId, reason };
}

function logAction(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ operation: "rfq.admin", ...entry }));
}

async function listManualReview(env: RfqWorkerEnv, url: URL): Promise<Response> {
  const status = url.searchParams.get("status") ?? "manual_review";
  if (!(LISTABLE as readonly string[]).includes(status)) return json(400, { ok: false, error: `status must be one of ${LISTABLE.join(", ")}` });
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));
  const { results } = await env.DB_OPS.prepare(
    `SELECT r.id, r.reference_number, r.sync_status, r.last_sync_error_code, r.submitted_at, r.updated_at,
            o.status AS outbox_status, o.attempt_count, o.last_error, o.available_at
     FROM rfqs r JOIN integration_outbox o ON o.aggregate_type = 'rfq' AND o.aggregate_id = r.id
     WHERE r.sync_status = ? ORDER BY r.submitted_at ASC, r.id ASC LIMIT ?`,
  )
    .bind(status, limit)
    .all();
  return json(200, { ok: true, status, count: results.length, rfqs: results });
}

/** retry / close: guarded UPDATEs + the audit row in ONE batch; the audit row exists only if the RFQ really changed. */
async function transition(env: RfqWorkerEnv, action: "retry" | "close", rfqId: string, reason: string, actor: string): Promise<Response> {
  const current = await env.DB_OPS.prepare(`SELECT sync_status FROM rfqs WHERE id = ?`).bind(rfqId).first<{ sync_status: string }>();
  if (!current) return json(404, { ok: false, error: "rfq not found" });
  const allowed = action === "retry" ? RETRYABLE : CLOSABLE;
  if (!allowed.includes(current.sync_status)) return json(409, { ok: false, error: `cannot ${action} an RFQ in sync_status ${current.sync_status}`, syncStatus: current.sync_status });

  const now = new Date().toISOString();
  const next = action === "retry" ? "retry" : "failed";
  const db = env.DB_OPS;
  const rfqUpdate =
    action === "retry"
      ? db.prepare(`UPDATE rfqs SET sync_status = 'retry', updated_at = ? WHERE id = ? AND sync_status = ?`).bind(now, rfqId, current.sync_status)
      : db.prepare(`UPDATE rfqs SET sync_status = 'failed', last_sync_error_code = 'CLOSED_BY_ADMIN', updated_at = ? WHERE id = ? AND sync_status = ?`).bind(now, rfqId, current.sync_status);
  const changed = `EXISTS (SELECT 1 FROM rfqs WHERE id = ? AND sync_status = ? AND updated_at = ?)`;
  const outboxUpdate =
    action === "retry"
      ? db.prepare(`UPDATE integration_outbox SET status = 'retry', available_at = ? WHERE aggregate_type = 'rfq' AND aggregate_id = ? AND ${changed}`).bind(now, rfqId, rfqId, next, now)
      : db.prepare(`UPDATE integration_outbox SET status = 'dead' WHERE aggregate_type = 'rfq' AND aggregate_id = ? AND ${changed}`).bind(rfqId, rfqId, next, now);
  const audit = db
    .prepare(
      `INSERT INTO rfq_admin_actions (id, action, rfq_id, reason, actor, previous_sync_status, new_sync_status, result, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, 'ok', ? WHERE ${changed}`,
    )
    .bind(ulid(), action, rfqId, reason, actor, current.sync_status, next, now, rfqId, next, now);
  const [first] = await db.batch([rfqUpdate, outboxUpdate, audit]);
  if (!first.meta?.changes) return json(409, { ok: false, error: "rfq changed concurrently; reload and retry" });
  logAction({ action, rfqId, actor, reason, previous: current.sync_status, next });
  return json(200, { ok: true, action, rfqId, previousSyncStatus: current.sync_status, syncStatus: next });
}

async function manualReconcile(env: RfqWorkerEnv, reason: string, actor: string): Promise<Response> {
  const outcome = await reconcileOnce(env);
  const result = outcome.result?.status === "done" ? outcome.result.classification : outcome.action;
  await env.DB_OPS.prepare(
    `INSERT INTO rfq_admin_actions (id, action, rfq_id, reason, actor, previous_sync_status, new_sync_status, result, created_at) VALUES (?, 'reconcile', ?, ?, ?, NULL, NULL, ?, ?)`,
  )
    .bind(ulid(), outcome.picked, reason, actor, result, new Date().toISOString())
    .run();
  logAction({ action: "reconcile", rfqId: outcome.picked, actor, reason, result });
  return json(200, { ok: true, ...outcome });
}

export async function handleAdmin(request: Request, env: RfqWorkerEnv, url: URL, extension?: AdminExtension): Promise<Response> {
  if (!(await bearerMatches(request.headers.get("authorization"), env.ADMIN_TOKEN))) return json(404, { ok: false });
  const actorHeader = request.headers.get("x-admin-actor") ?? "";
  const actor = ACTOR.test(actorHeader) ? actorHeader : "admin";

  if (url.pathname === "/__admin/manual-review") {
    if (request.method !== "GET") return json(405, { ok: false });
    return listManualReview(env, url);
  }
  const isRetry = url.pathname === "/__admin/manual-review/retry";
  const isClose = url.pathname === "/__admin/manual-review/close";
  if (isRetry || isClose || url.pathname === "/__admin/reconcile") {
    if (request.method !== "POST") return json(405, { ok: false });
    const input = await readAction(request);
    if ("error" in input) return json(400, { ok: false, error: input.error });
    if (!isRetry && !isClose) return manualReconcile(env, input.reason, actor);
    if (!input.rfqId) return json(400, { ok: false, error: "rfqId required" });
    return transition(env, isRetry ? "retry" : "close", input.rfqId, input.reason, actor);
  }
  return (await extension?.(request, env, url)) ?? json(404, { ok: false });
}
