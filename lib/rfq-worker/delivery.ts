import { mapRfqToApiPayload, buildOutboundRfqIdempotencyKey, type RfqSnapshotItem } from "../odoo/rfq-payload-mapper.ts";
import { classifyIntakeStatus, type DeliveryClassification } from "../contracts/rfq-intake-status.ts";
import { ulid } from "../rfq/ulid.ts";
import { buildV12Attachments, FILE_ONLY_PLACEHOLDER, notesWithAttachments, preferredChannel, type AttachmentChannel, type AttachmentNoteRow } from "../rfq/attachment-notes.ts";
import { isV12UnsupportedAnswer } from "../contracts/rfq-intake-v1-2.ts";
import { addDays, ATTACHMENT_RETENTION_CONFIRMED_DAYS } from "../rfq/intake-store.ts";

/**
 * RFQ delivery to Odoo (architecture V1.1 §6.2–§6.4, A5) — ONE module used by
 * the Queue consumer, the cron reconciler and the CI reconciler
 * (scripts/rfq/ci-reconciler.ts), so all three behave identically.
 *
 *  - exactly ONE RFQ per call (`deliverOne`);
 *  - a conditional claim (`sync_status -> syncing`) first, so two concurrent
 *    runners never deliver the same RFQ at once;
 *  - POST {ODOO_BASE}/api/v1/rfq, `Idempotency-Key: rfq-<id>`, body per
 *    docs/contracts/RFQ_INTAKE_V1_1.md; with `intakeV11` it also carries
 *    `received_at` (= rfqs.submitted_at, the acceptance time, identical on
 *    every retry) and `website_reference` (the reference the customer saw);
 *  - classification `classifyIntakeStatus` (§6.2);
 *  - D-RFQ-FILE: an RFQ with declared files first FREEZES its file list
 *    (`attachments_frozen_at`; still-pending files become `failed` /
 *    `not_received`). Received files go to Odoo as contract-v1.2
 *    `attachments`; if Odoo answers that it does not support v1.2, the same
 *    attempt re-sends the list in `notes` instead (lib/rfq/attachment-notes.ts),
 *    and `rfqs.attachments_channel` keeps that choice for every retry. Frozen
 *    list + kept channel = an identical payload on every retry, as the
 *    Idempotency-Key requires. A file-only RFQ gets one marked placeholder
 *    line (Odoo requires a line). A v1.2 delivery shortens the R2 retention
 *    of its files to 30 days (lib/rfq-worker/file-retention.ts);
 *  - ALL post-delivery writes (rfq status, Odoo reference, attempt row,
 *    outbox bookkeeping) in ONE db.batch. If the run is cut off after the
 *    POST and before that batch, the next run re-sends the same key + same
 *    payload and Odoo answers 200 replay: delay, never a duplicate.
 */

export interface DeliveryConfig {
  odooBaseUrl: string;
  /** Bearer secret; null = send NO Authorization header (real-Odoo 401 probe: nothing can be created). */
  token: string | null;
  intakeV11: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
  random?: () => number;
  /** Runs after the POST, before the result batch. Only the staging test routes set it (to simulate a crash there). */
  afterPost?: () => void;
  /** Set by the Queue consumer: a `queued` RFQ is claimable before its reconciler grace period ends. */
  fromQueue?: boolean;
  /**
   * W32 (domestic intake, lib/rfq-node/forwarder.ts) — all three default to the Worker's behaviour:
   *  - `idempotencyKeyPrefix`: `rfq-ir-` instead of `rfq-` (lib/odoo/rfq-payload-mapper.ts);
   *  - `notesOrigin`: a first `notes` line naming the origin (`[website-ir]`), identical on every retry;
   *  - `attachmentChannel`: the channel of a FIRST attempt (`notes` when the files could not reach the .ir files
   *    store within files_store_wait_ms — W35: Arvan Object Storage); a channel already kept by an earlier attempt always wins;
   *  - `filesStorageHint`: where staff open the files on the `notes` channel (the domestic admin view).
   */
  idempotencyKeyPrefix?: string;
  notesOrigin?: string;
  attachmentChannel?: AttachmentChannel;
  filesStorageHint?: string;
}

export type DeliveryResult =
  | { status: "skipped"; rfqId: string; reason: "not_due_or_claimed" | "not_found" }
  | { status: "done"; rfqId: string; classification: DeliveryClassification; httpStatus: number | null; errorCode: string | null; reference: string | null; attempt: number; nextAttemptAt: string | null };

/** Stale `syncing` claims (a run that died mid-delivery) become due again after this (§6.4). */
export const STALE_SYNCING_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Due-work predicate shared by pickDueRfq and the claim (architecture §6.4:
 * rfqs.sync_status is the source). Three positional parameters: (now, fromQueue, staleBefore).
 * A Queue message may claim a `queued` RFQ immediately: the handoff defers
 * `available_at` only so that the CRON does not re-drive what the Queue is
 * already delivering (W2 staging finding: without this the consumer skipped
 * its own message). Plain `?` only (no `?NNN`), so the same SQL runs on D1,
 * SQLite and the CI adapter.
 */
const DUE_PREDICATE = `r.odoo_rfq_reference IS NULL AND (
    (r.sync_status IN ('pending', 'queued', 'retry') AND o.available_at <= ?)
    OR (r.sync_status = 'queued' AND ? = 1)
    OR (r.sync_status = 'syncing' AND r.updated_at <= ?)
  )`;
const dueParams = (now: Date, fromQueue = false) => [now.toISOString(), fromQueue ? 1 : 0, new Date(now.getTime() - STALE_SYNCING_MS).toISOString()];

/** Backoff after the n-th failed attempt: min(60, 2^n) minutes, ±20 % jitter (§6.2). Returns milliseconds. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const minutes = Math.min(60, 2 ** Math.max(1, attempt));
  return Math.round(minutes * 60_000 * (0.8 + 0.4 * random()));
}

/** The oldest due, undelivered RFQ — at most one per run. */
export async function pickDueRfq(db: D1Database, now: Date): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT r.id FROM rfqs r JOIN integration_outbox o ON o.aggregate_type = 'rfq' AND o.aggregate_id = r.id
       WHERE ${DUE_PREDICATE}
       ORDER BY r.submitted_at ASC, r.id ASC LIMIT 1`,
    )
    .bind(...dueParams(now))
    .first<{ id: string }>();
  return row?.id ?? null;
}

async function claim(db: D1Database, rfqId: string, now: Date, fromQueue: boolean): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE rfqs SET sync_status = 'syncing', updated_at = ?
       WHERE id = ? AND EXISTS (SELECT 1 FROM rfqs r JOIN integration_outbox o ON o.aggregate_type = 'rfq' AND o.aggregate_id = r.id WHERE r.id = ? AND ${DUE_PREDICATE})`,
    )
    .bind(now.toISOString(), rfqId, rfqId, ...dueParams(now, fromQueue))
    .run();
  return (result.meta?.changes ?? 0) === 1;
}

/**
 * Freezes an RFQ's file list once (first attempt): still-pending files become `failed` / `not_received`. Idempotent.
 * Exported for the domestic forwarder (lib/rfq-node/forwarder.ts), which freezes the list BEFORE copying the
 * received files to R2, so no late upload can join a list that is already on its way.
 */
export async function freezeAttachments(db: D1Database, rfqId: string, now: Date): Promise<void> {
  const frozenAt = now.toISOString();
  await db.batch([
    db.prepare(`UPDATE rfqs SET attachments_frozen_at = ? WHERE id = ? AND attachments_frozen_at IS NULL`).bind(frozenAt, rfqId),
    db.prepare(`UPDATE rfq_attachments SET upload_status = 'failed', failure_code = 'not_received', updated_at = ? WHERE rfq_id = ? AND upload_status = 'pending'`).bind(frozenAt, rfqId),
  ]);
}

const httpCategory = (status: number | null) => (status === null ? "network_error" : `${Math.floor(status / 100)}xx`);

export async function deliverOne(db: D1Database, rfqId: string, cfg: DeliveryConfig): Promise<DeliveryResult> {
  const now = cfg.now?.() ?? new Date();
  if (!(await claim(db, rfqId, now, Boolean(cfg.fromQueue)))) return { status: "skipped", rfqId, reason: "not_due_or_claimed" };

  const header = await db
    .prepare(
      `SELECT r.id, r.reference_number, r.submitted_at, r.locale, r.company_name, r.message, r.attachment_count,
              c.full_name, c.email_normalized, c.phone_e164, c.phone_national,
              o.event_id, o.attempt_count, o.correlation_id
       FROM rfqs r JOIN rfq_contacts c ON c.rfq_id = r.id
       JOIN integration_outbox o ON o.aggregate_type = 'rfq' AND o.aggregate_id = r.id
       WHERE r.id = ?`,
    )
    .bind(rfqId)
    .first<{ id: string; reference_number: string; submitted_at: string; locale: string; company_name: string | null; message: string | null; attachment_count: number | null; full_name: string; email_normalized: string | null; phone_e164: string | null; phone_national: string | null; event_id: string; attempt_count: number; correlation_id: string }>();
  if (!header) return { status: "skipped", rfqId, reason: "not_found" };

  const { results: itemRows } = await db
    .prepare(
      `SELECT line_number, variant_ref, sku_snapshot, freeform_title, description, quantity_text, quantity_value, quantity_scale, unit_ref, length_mm, unpublished_at_receipt
       FROM rfq_items WHERE rfq_id = ? ORDER BY line_number ASC`,
    )
    .bind(rfqId)
    .all<{ line_number: number; variant_ref: string | null; sku_snapshot: string | null; freeform_title: string | null; description: string | null; quantity_text: string; quantity_value: number | null; quantity_scale: number | null; unit_ref: string | null; length_mm: number | null; unpublished_at_receipt: number | null }>();

  // Freeze the file list once (first attempt), then read it — the same rows on every retry.
  // (Only RFQs with files touch the migration-0009 columns, so a file-less delivery never depends on them.)
  let attachmentRows: AttachmentNoteRow[] = [];
  let keptChannel: AttachmentChannel | null = null;
  if ((header.attachment_count ?? 0) > 0) {
    await freezeAttachments(db, rfqId, now);
    attachmentRows = (
      await db
        .prepare(`SELECT slot, original_filename, byte_size, upload_status, failure_code, object_key, extension, mime_declared, checksum_sha256 FROM rfq_attachments WHERE rfq_id = ? ORDER BY slot ASC`)
        .bind(rfqId)
        .all<AttachmentNoteRow>()
    ).results;
    keptChannel = (await db.prepare(`SELECT attachments_channel FROM rfqs WHERE id = ?`).bind(rfqId).first<{ attachments_channel: AttachmentChannel | null }>())?.attachments_channel ?? null;
  }
  // The channel of an earlier attempt is kept, so a retry re-sends the same payload (same Idempotency-Key).
  let channel: AttachmentChannel | null = attachmentRows.length ? (keptChannel ?? cfg.attachmentChannel ?? preferredChannel(attachmentRows)) : null;

  const items: RfqSnapshotItem[] = itemRows.map((i) => ({
    lineNumber: i.line_number,
    variantRef: i.variant_ref,
    skuSnapshot: i.sku_snapshot,
    freeformTitle: i.freeform_title,
    description: i.description,
    quantityText: i.quantity_text,
    quantityValue: i.quantity_value,
    quantityScale: i.quantity_scale,
    unitCode: i.unit_ref,
    lengthMm: i.length_mm,
  }));
  // File-only RFQ: Odoo needs one line — a marked placeholder, never read from the file.
  if (!items.length && attachmentRows.length) {
    items.push({ lineNumber: 1, variantRef: null, skuSnapshot: null, freeformTitle: FILE_ONLY_PLACEHOLDER.title, description: FILE_ONLY_PLACEHOLDER.notes, quantityText: String(FILE_ONLY_PLACEHOLDER.quantity), quantityValue: FILE_ONLY_PLACEHOLDER.quantity, quantityScale: 0, unitCode: FILE_ONLY_PLACEHOLDER.uom, lengthMm: null });
  }
  const attempt = (header.attempt_count ?? 0) + 1;
  const startedAt = now.toISOString();
  // Flag a line whose variant left the active snapshot between form load and submit (§6.1).
  const unpublishedLines = new Set(itemRows.filter((i) => i.unpublished_at_receipt === 1).map((i) => i.line_number));

  const buildPayload = (ch: AttachmentChannel | null) => {
    const body = ch ? notesWithAttachments(header.message, attachmentRows, ch, cfg.filesStorageHint) : header.message;
    const message = cfg.notesOrigin ? [cfg.notesOrigin, body].filter(Boolean).join("\n") : body;
    const mapping = mapRfqToApiPayload({ locale: header.locale, fullName: header.full_name, companyName: header.company_name, phone: header.phone_e164 ?? header.phone_national, email: header.email_normalized, message, items });
    if (!mapping.ok) return mapping;
    const payload: Record<string, unknown> = { ...mapping.payload };
    if (unpublishedLines.size) {
      payload.items = (mapping.payload.items as unknown as Record<string, unknown>[]).map((item, idx) =>
        unpublishedLines.has(itemRows[idx].line_number) ? { ...item, notes: [item.notes, "[website] variant unpublished at receipt"].filter(Boolean).join(" ") } : item,
      );
    }
    if (cfg.intakeV11) {
      payload.received_at = header.submitted_at;
      payload.website_reference = header.reference_number;
    }
    if (ch === "odoo_v12") payload.attachments = buildV12Attachments(attachmentRows);
    return { ok: true as const, payload };
  };

  const post = async (payload: Record<string, unknown>): Promise<{ status: number; text: string } | { failure: "timeout" | "network_error" }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", "Idempotency-Key": buildOutboundRfqIdempotencyKey(rfqId, cfg.idempotencyKeyPrefix) };
      if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
      const response = await (cfg.fetchImpl ?? fetch)(`${cfg.odooBaseUrl.replace(/\/+$/, "")}/api/v1/rfq`, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
      return { status: response.status, text: await response.text() };
    } catch (err) {
      return { failure: err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error" };
    } finally {
      clearTimeout(timer);
    }
  };
  const parse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  let classification: DeliveryClassification;
  let httpStatus: number | null = null;
  let errorCode: string | null = null;
  let reference: string | null = null;
  let fellBack = false;

  let built = buildPayload(channel);
  if (!built.ok) {
    classification = "MANUAL_REVIEW";
    errorCode = `RFQ_MAPPING_${built.reason}`;
  } else {
    let answer = await post(built.payload);
    // Odoo without contract v1.2 (no ahanassa_rfq_file_intake) refuses the `attachments` key and stores
    // nothing, so the same key is still free: send the list in `notes` instead, in this same attempt.
    if (channel === "odoo_v12" && "status" in answer && isV12UnsupportedAnswer(answer.status, parse(answer.text))) {
      channel = "notes";
      fellBack = true;
      built = buildPayload(channel);
      if (built.ok) answer = await post(built.payload);
      console.log(JSON.stringify({ operation: "rfq.deliver", rfqId, attachments: "v1_2_unsupported_notes_fallback" }));
    }
    if (!built.ok) {
      classification = "MANUAL_REVIEW";
      errorCode = `RFQ_MAPPING_${built.reason}`;
    } else if ("failure" in answer) {
      classification = classifyIntakeStatus(answer.failure);
      errorCode = answer.failure === "timeout" ? "ODOO_TIMEOUT" : "ODOO_NETWORK_ERROR";
    } else {
      httpStatus = answer.status;
      classification = classifyIntakeStatus(answer.status);
      const body = parse(answer.text) as { data?: { reference?: unknown }; error?: { code?: unknown } } | null;
      if (classification === "DELIVERED") {
        const ref = body?.data?.reference;
        if (typeof ref === "string" && ref.length > 0) reference = ref;
        else {
          classification = "RETRY_PENDING";
          errorCode = "ODOO_MALFORMED_SUCCESS";
        }
      } else {
        // Only the stable error.code is kept — never Odoo's message text (may echo customer data).
        const code = String(body?.error?.code ?? "");
        errorCode = `ODOO_${answer.status}${/^[a-z_]{1,64}$/.test(code) ? `_${code}` : ""}`;
      }
    }
    cfg.afterPost?.();
  }

  const finishedAt = (cfg.now?.() ?? new Date()).toISOString();
  const retrying = classification === "RETRY_PENDING" || classification === "RETRY_PENDING_ALERT";
  const nextAttemptAt = retrying ? new Date(now.getTime() + backoffMs(attempt, cfg.random)).toISOString() : null;
  if (classification === "RETRY_PENDING_ALERT") {
    // Configuration problem (401/403), not customer data — alert immediately (§6.2, §15).
    console.error(JSON.stringify({ operation: "rfq.deliver", alert: "ODOO_AUTH", rfqId, httpStatus }));
  }

  const rfqUpdate =
    classification === "DELIVERED"
      ? db.prepare(`UPDATE rfqs SET sync_status = 'synced', odoo_rfq_reference = ?, last_synced_at = ?, last_sync_error_code = NULL, updated_at = ? WHERE id = ?`).bind(reference, finishedAt, finishedAt, rfqId)
      : db.prepare(`UPDATE rfqs SET sync_status = ?, last_sync_error_code = ?, updated_at = ? WHERE id = ?`).bind(retrying ? "retry" : "manual_review", errorCode, finishedAt, rfqId);
  const outboxUpdate = db
    .prepare(
      `UPDATE integration_outbox SET status = ?, attempt_count = ?, last_attempt_at = ?, last_error = ?, available_at = COALESCE(?, available_at),
              published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END
       WHERE event_id = ?`,
    )
    .bind(classification === "DELIVERED" ? "published" : retrying ? "retry" : "dead", attempt, finishedAt, errorCode, nextAttemptAt, classification === "DELIVERED" ? "published" : "", finishedAt, header.event_id);
  const attemptInsert = db
    .prepare(
      `INSERT INTO integration_attempts (id, event_id, provider, attempt_number, started_at, finished_at, http_status_category, outcome, error_code, correlation_id)
       VALUES (?, ?, 'odoo', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(ulid(), header.event_id, attempt, startedAt, finishedAt, httpCategory(httpStatus), classification === "DELIVERED" ? "success" : retrying ? "transient_failure" : "permanent_failure", errorCode, header.correlation_id);
  const fileUpdates: D1PreparedStatement[] = [];
  // The channel that reached Odoo (or that Odoo told us to use) is kept for every retry.
  if (channel && (classification === "DELIVERED" || fellBack)) {
    fileUpdates.push(db.prepare(`UPDATE rfqs SET attachments_channel = COALESCE(attachments_channel, ?) WHERE id = ?`).bind(channel, rfqId));
  }
  // Odoo confirmed the v1.2 attachments: the R2 copies are kept 30 more days, then deleted (owner decision 2026-10-13).
  if (classification === "DELIVERED" && channel === "odoo_v12") {
    fileUpdates.push(
      db
        .prepare(
          `UPDATE rfq_attachments SET odoo_confirmed_at = ?, retention_until = ?, updated_at = ?
           WHERE rfq_id = ? AND upload_status = 'uploaded' AND checksum_sha256 IS NOT NULL AND odoo_confirmed_at IS NULL AND deleted_at IS NULL`,
        )
        .bind(finishedAt, addDays(finishedAt, ATTACHMENT_RETENTION_CONFIRMED_DAYS), finishedAt, rfqId),
    );
  }
  await db.batch([rfqUpdate, outboxUpdate, attemptInsert, ...fileUpdates]);

  return { status: "done", rfqId, classification, httpStatus, errorCode, reference, attempt, nextAttemptAt };
}
