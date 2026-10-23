import fs from "node:fs";
import { deliverOne, freezeAttachments, pickDueRfq, type DeliveryResult } from "../rfq-worker/delivery.ts";
import { OUTBOUND_KEY_PREFIX_IR } from "../odoo/rfq-payload-mapper.ts";
import type { AttachmentChannel } from "../rfq/attachment-notes.ts";
import type { FetchLike } from "./family-fetch.ts";
import type { FsBucket } from "./fs-bucket.ts";
import type { NodeD1 } from "./sqlite-d1.ts";
import type { S3Client } from "./s3.ts";
import { newRfqNotice, type BaleSend } from "./bale.ts";

/**
 * W32 (W29 P2 §3.3): the domestic outbox → Odoo forwarder (`rfq-ir.mjs forward`, its own systemd service so a stuck
 * Odoo call never slows intake). It reuses the Worker's delivery module unchanged in substance — `pickDueRfq`, the
 * conditional claim, `deliverOne`, the classification and the ONE result batch — with these domestic settings:
 *
 *  - Odoo over IPv6 ONLY (`familyFetch(6)`; P0: IPv4 to *.ahanassa.com is SNI-filtered);
 *  - `Idempotency-Key: rfq-ir-<ulid>` and a first `notes` line `[website-ir]`;
 *  - oldest first (`pickDueRfq` orders by submitted_at), ONE in flight (one process, one RFQ per step);
 *  - retries `min(60, 2^n)` min with NO maximum attempts and NO maximum age (Odoo O-1.1 accepts an old
 *    `received_at` and marks it delivery_delayed). When an attempt succeeds after an outage, RFQs that failed only on
 *    the network are made due at once instead of waiting out their backoff;
 *  - files first: the list is frozen, each received file is copied to the .ir R2 bucket (S3 API, IPv6) and checked
 *    (HEAD size + the stored SHA-256 as object metadata) BEFORE the RFQ goes out with contract v1.2 `attachments`.
 *    If R2 cannot be reached for IR_R2_WAIT_MS while the RFQ is otherwise ready, it goes on the `notes` channel
 *    instead, naming the domestic admin view; the channel is then kept for every retry (same payload, same key);
 *  - a `syncing` row found at start belongs to a dead run of this same (only) forwarder: it is made due at once
 *    (the Worker waits STALE_SYNCING_MS because several runners may exist there). A crash after Odoo's answer and
 *    before the result batch therefore costs one 200 replay, never a duplicate.
 *
 * During a total cutoff every step fails fast and nothing changes but attempt counters; nothing is ever dropped.
 */
export const DEFAULT_R2_WAIT_MS = 2 * 60 * 60 * 1000;
const DEFER_STEP_MS = 60_000;
const NETWORK_ERRORS = ["ODOO_TIMEOUT", "ODOO_NETWORK_ERROR"];

export interface ForwarderDeps {
  db: NodeD1;
  bucket: FsBucket;
  /** The .ir R2 bucket client (IPv6), or null when not configured (files then reach Odoo on the notes channel). */
  r2: S3Client | null;
  odooBaseUrl: string;
  odooToken: string | null;
  intakeV11?: boolean;
  /** Pinned to IPv6 in production (lib/rfq-node/family-fetch.ts). */
  odooFetch: FetchLike;
  odooTimeoutMs?: number;
  r2WaitMs?: number;
  filesStorageHint: string;
  env: string;
  notify?: BaleSend;
  now?: () => Date;
  random?: () => number;
  /** Tests only: runs after Odoo answered, before the result batch (a crash there). */
  afterPost?: () => void;
}

export type ForwardStep =
  | { action: "idle" }
  | { action: "waiting_for_r2"; rfqId: string; filesPending: number }
  | { action: "delivered"; rfqId: string; result: DeliveryResult; channel: AttachmentChannel | null; madeDue: number };

const at = (deps: ForwarderDeps) => deps.now?.() ?? new Date();

/** At start: a `syncing` row is this forwarder's own dead run — due again now. */
export function reclaimOnStart(db: NodeD1, now: Date): number {
  const iso = now.toISOString();
  const ids = db.q<{ id: string }>(`SELECT id FROM rfqs WHERE sync_status = 'syncing' AND odoo_rfq_reference IS NULL`).map((r) => r.id);
  for (const id of ids) {
    db.sqlite.prepare(`UPDATE rfqs SET sync_status = 'retry', updated_at = ? WHERE id = ? AND sync_status = 'syncing'`).run(iso, id);
    db.sqlite.prepare(`UPDATE integration_outbox SET available_at = ? WHERE aggregate_type = 'rfq' AND aggregate_id = ?`).run(iso, id);
  }
  if (ids.length) console.log(JSON.stringify({ operation: "ir.forward", event: "reclaimed_stale_claims", count: ids.length }));
  return ids.length;
}

interface FileRow {
  id: string;
  object_key: string;
  byte_size: number;
  checksum_sha256: string | null;
  mime_declared: string;
  verified_at: string | null;
  first_attempt_at: string | null;
}

const errorClass = (err: unknown) => (err instanceof Error ? (err.name === "AbortError" || err.name === "TimeoutError" ? "r2_timeout" : "r2_network") : "r2_network");

/** Copies every received, not yet verified file of one RFQ to R2. Returns the rows still unverified. */
export async function copyFilesToR2(deps: ForwarderDeps, rfqId: string): Promise<FileRow[]> {
  const { db, bucket, r2 } = deps;
  const read = () =>
    db.q<FileRow>(
      `SELECT a.id, a.object_key, a.byte_size, a.checksum_sha256, a.mime_declared, f.verified_at, f.first_attempt_at
       FROM rfq_attachments a LEFT JOIN ir_file_remote f ON f.attachment_id = a.id
       WHERE a.rfq_id = ? AND a.upload_status = 'uploaded' AND a.deleted_at IS NULL ORDER BY a.slot`,
      rfqId,
    );
  for (const row of read().filter((r) => !r.verified_at)) {
    const now = at(deps).toISOString();
    db.sqlite.prepare(`INSERT INTO ir_file_remote (attachment_id, remote_key, first_attempt_at) VALUES (?, ?, ?) ON CONFLICT(attachment_id) DO NOTHING`).run(row.id, row.object_key, now);
    let error: string | null = null;
    if (!r2) error = "r2_not_configured";
    else if (!row.checksum_sha256 || bucket.sha256(row.object_key) !== row.checksum_sha256) error = "local_checksum_mismatch";
    else {
      try {
        const body = fs.readFileSync(bucket.pathOf(row.object_key));
        const put = await r2.put(row.object_key, body, { contentType: row.mime_declared, sha256: row.checksum_sha256 });
        if (put.status < 200 || put.status > 299) error = `r2_http_${put.status}`;
        else {
          const head = await r2.head(row.object_key);
          if (head.status !== 200) error = `r2_head_${head.status}`;
          else if (head.size !== row.byte_size) error = "r2_size_mismatch";
          else if (head.sha256 !== row.checksum_sha256) error = "r2_sha256_mismatch";
        }
      } catch (err) {
        error = errorClass(err);
      }
    }
    db.sqlite
      .prepare(`UPDATE ir_file_remote SET attempts = attempts + 1, last_attempt_at = ?, last_error = ?, verified_at = CASE WHEN ? IS NULL THEN ? ELSE verified_at END WHERE attachment_id = ?`)
      .run(now, error, error, now, row.id);
    console.log(JSON.stringify({ operation: "ir.r2_copy", rfqId, attachmentId: row.id, result: error ?? "verified" }));
  }
  return read().filter((r) => !r.verified_at);
}

/** One forwarder step: at most ONE RFQ. */
export async function forwardOnce(deps: ForwarderDeps): Promise<ForwardStep> {
  const { db } = deps;
  const now = at(deps);
  const rfqId = await pickDueRfq(db.asD1(), now);
  if (!rfqId) return { action: "idle" };

  const header = db.q<{ attachment_count: number | null; attachments_channel: AttachmentChannel | null }>(`SELECT attachment_count, attachments_channel FROM rfqs WHERE id = ?`, rfqId)[0];
  let attachmentChannel: AttachmentChannel | undefined;
  if ((header?.attachment_count ?? 0) > 0) {
    // Same freeze as deliverOne (which repeats it idempotently): no late file joins a list on its way to R2/Odoo.
    await freezeAttachments(db.asD1(), rfqId, now);
    if (!header.attachments_channel) {
      const pending = await copyFilesToR2(deps, rfqId);
      if (pending.length) {
        const waitMs = deps.r2WaitMs ?? DEFAULT_R2_WAIT_MS;
        const since = Math.min(...pending.map((r) => Date.parse(r.first_attempt_at ?? now.toISOString())));
        const waited = at(deps).getTime() - since;
        if (deps.r2 && waited < waitMs) {
          const next = new Date(at(deps).getTime() + Math.min(DEFER_STEP_MS, waitMs - waited)).toISOString();
          db.sqlite.prepare(`UPDATE integration_outbox SET available_at = ? WHERE aggregate_type = 'rfq' AND aggregate_id = ?`).run(next, rfqId);
          return { action: "waiting_for_r2", rfqId, filesPending: pending.length };
        }
        // R2 unreachable for IR_R2_WAIT_MS (or not configured): the files stay on this server, the list goes in notes.
        attachmentChannel = "notes";
      }
    }
  }

  const result = await deliverOne(db.asD1(), rfqId, {
    odooBaseUrl: deps.odooBaseUrl,
    token: deps.odooToken,
    intakeV11: deps.intakeV11 ?? true,
    fetchImpl: deps.odooFetch as typeof fetch,
    timeoutMs: deps.odooTimeoutMs ?? 20_000,
    now: deps.now,
    random: deps.random,
    afterPost: deps.afterPost,
    idempotencyKeyPrefix: OUTBOUND_KEY_PREFIX_IR,
    notesOrigin: "[website-ir]",
    attachmentChannel,
    filesStorageHint: deps.filesStorageHint,
  });

  let madeDue = 0;
  if (result.status === "done" && result.classification === "DELIVERED") {
    // The link is back: RFQs that failed only on the network need not wait out their backoff.
    const iso = at(deps).toISOString();
    const r = db.sqlite
      .prepare(`UPDATE integration_outbox SET available_at = ? WHERE status = 'retry' AND available_at > ? AND last_error IN (${NETWORK_ERRORS.map(() => "?").join(", ")})`)
      .run(iso, iso, ...NETWORK_ERRORS);
    madeDue = Number(r.changes);
  }
  const channel = db.q<{ attachments_channel: AttachmentChannel | null }>(`SELECT attachments_channel FROM rfqs WHERE id = ?`, rfqId)[0]?.attachments_channel ?? null;
  console.log(JSON.stringify({ operation: "ir.forward", rfqId, result: result.status === "done" ? result.classification : result.reason, httpStatus: result.status === "done" ? result.httpStatus : null, attempt: result.status === "done" ? result.attempt : null, channel, madeDue }));
  return { action: "delivered", rfqId, result, channel, madeDue };
}

/** New-RFQ notices to the staff Bale group: reference + counts only (D-IR-7). Never blocks delivery. */
export async function sendNotices(deps: Pick<ForwarderDeps, "db" | "notify" | "env" | "now">, limit = 5): Promise<number> {
  if (!deps.notify) return 0;
  const rows = deps.db.q<{ id: string; reference_number: string; items: number; files: number }>(
    `SELECT r.id, r.reference_number,
            (SELECT count(*) FROM rfq_items i WHERE i.rfq_id = r.id) AS items,
            COALESCE(r.attachment_count, 0) AS files
     FROM rfqs r LEFT JOIN ir_notices n ON n.rfq_id = r.id
     WHERE n.rfq_id IS NULL OR (n.sent_at IS NULL AND n.attempts < 20)
     ORDER BY r.submitted_at ASC LIMIT ?`,
    limit,
  );
  let sent = 0;
  for (const r of rows) {
    const ok = await deps.notify(newRfqNotice(deps.env, r.reference_number, r.items, r.files));
    deps.db.sqlite
      .prepare(`INSERT INTO ir_notices (rfq_id, sent_at, attempts) VALUES (?, ?, 1) ON CONFLICT(rfq_id) DO UPDATE SET attempts = attempts + 1, sent_at = COALESCE(sent_at, excluded.sent_at)`)
      .run(r.id, ok ? (deps.now?.() ?? new Date()).toISOString() : null);
    if (ok) sent++;
  }
  return sent;
}
