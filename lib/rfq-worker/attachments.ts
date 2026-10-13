import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { RFQ_KEY_HEADER_NAME, checkFileHead, createContainerScanner, MAX_RFQ_FILE_BYTES, MAX_RFQ_FILES, RFQ_FILE_EXTENSIONS, RFQ_FILE_HEAD_BYTES, type ByteFinder, type RfqFileExtension, type RfqFileRejection } from "../rfq/attachment-policy.ts";
import { hashIdempotencyKey, isValidIdempotencyKey } from "../rfq/idempotency.ts";
import { getClientIp, hashRateLimitKey } from "../security/rate-limit.ts";
import { corsHeaders, isAllowedOrigin } from "./cors.ts";
import { csv, filesEnabled, type RfqWorkerEnv } from "./config.ts";

/**
 * RFQ file upload (owner decision D-RFQ-FILE; docs/RFQ_FILE_UPLOAD.md).
 *
 *   GET     /api/rfqs/files                      capability: is upload on, limits, extensions
 *   OPTIONS /api/rfqs/files/<reference>/<slot>   CORS preflight
 *   PUT     /api/rfqs/files/<reference>/<slot>   the bytes of one file declared with the RFQ
 *
 * The RFQ itself (POST /api/rfqs) passed Turnstile, the rate limit and the
 * declared-file policy, and is already durably saved with one `pending`
 * rfq_attachments row per file. A PUT is accepted only for such a row, and
 * only with the request's own idempotency key in `X-RFQ-Key` (the browser
 * still holds it; D1 holds only its SHA-256) — so no new secret and no new
 * Turnstile token per file. Each PUT is rate-limited per client IP
 * (fail-closed, the RFQ limiter with its own key space).
 *
 * The body is streamed straight into the PRIVATE R2 bucket (RFQ_FILES) under
 * `rfq-files/<reference>/<slot>.<ext>`: the first RFQ_FILE_HEAD_BYTES are checked
 * against the extension (magic bytes) before anything is written, and Office
 * containers are scanned chunk by chunk for macro/archive markers while they
 * stream; a failed check aborts the write and deletes the key.
 * Every stored byte is hashed on the way (SHA-256, sent to Odoo, contract v1.2).
 *
 * Any failure after the RFQ was saved never touches the RFQ: the row becomes
 * `failed` with a failure_code and the delivery reports the file to Odoo as
 * NOT RECEIVED. The response never echoes file content or the filename.
 */

const REFERENCE = /^AA-RFQ-[0-9A-HJKMNP-TV-Z]{1,40}$/;
const PATH = /^\/api\/rfqs\/files\/([^/]+)\/([1-9])$/;
export const FILES_PATH = "/api/rfqs/files";
export const RFQ_KEY_HEADER = RFQ_KEY_HEADER_NAME;

const json = (status: number, body: unknown, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store", ...headers } });

/** node:buffer's native search (nodejs_compat) — no per-byte JavaScript over a 15 MB upload. */
const nativeFind: ByteFinder = (haystack, needle) => Buffer.from(haystack.buffer, haystack.byteOffset, haystack.byteLength).indexOf(needle) !== -1;

export function isFilesPath(pathname: string): boolean {
  return pathname === FILES_PATH || pathname.startsWith(`${FILES_PATH}/`);
}

export function filesPreflight(request: Request, allowed: readonly string[]): Response {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, allowed)) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, PUT", "Access-Control-Allow-Headers": `content-type, ${RFQ_KEY_HEADER}`, "Access-Control-Max-Age": "86400", Vary: "Origin" },
  });
}

/** The form asks once whether to show the upload field (the static page is identical on staging and production, r4). */
export function filesCapability(request: Request, env: RfqWorkerEnv): Response {
  const cors = corsHeaders(request.headers.get("origin"), csv(env.ALLOWED_ORIGINS));
  const enabled = filesEnabled(env);
  const body = enabled ? { ok: true, enabled, maxFiles: MAX_RFQ_FILES, maxFileBytes: MAX_RFQ_FILE_BYTES, extensions: RFQ_FILE_EXTENSIONS } : { ok: true, enabled };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "Cache-Control": "public, max-age=300", ...cors } });
}

interface SlotRow {
  id: string;
  rfq_id: string;
  object_key: string;
  extension: string;
  mime_declared: string;
  byte_size: number;
  upload_status: string;
  attachments_frozen_at: string | null;
  sync_status: string;
}

/** Pass-through that enforces the exact declared length (workerd: FixedLengthStream; Node tests: a counting stand-in). */
function exactLengthStream(length: number): TransformStream<Uint8Array, Uint8Array> {
  const Fixed = (globalThis as { FixedLengthStream?: new (n: number) => TransformStream<Uint8Array, Uint8Array> }).FixedLengthStream;
  if (Fixed) return new Fixed(length);
  let seen = 0;
  return new TransformStream({
    transform(chunk, controller) {
      seen += chunk.byteLength;
      if (seen > length) throw new RangeError("body longer than declared");
      controller.enqueue(chunk);
    },
    flush() {
      if (seen !== length) throw new RangeError("body shorter than declared");
    },
  });
}

/** Releases the RFQ to delivery as soon as no declared file is still pending (else the 10-minute wait ends it). */
function releaseStatement(db: D1Database, rfqId: string, now: string) {
  return db
    .prepare(
      `UPDATE integration_outbox SET available_at = ?
       WHERE aggregate_type = 'rfq' AND aggregate_id = ? AND status = 'pending' AND available_at > ?
         AND NOT EXISTS (SELECT 1 FROM rfq_attachments WHERE rfq_id = ? AND upload_status = 'pending')`,
    )
    .bind(now, rfqId, now, rfqId);
}

async function markFailed(db: D1Database, row: SlotRow, code: RfqFileRejection | "storage_error", now: string): Promise<void> {
  try {
    await db.batch([
      db
        .prepare(`UPDATE rfq_attachments SET upload_status = 'failed', failure_code = ?, upload_attempts = upload_attempts + 1, updated_at = ? WHERE id = ? AND upload_status IN ('pending', 'failed')`)
        .bind(code, now, row.id),
      releaseStatement(db, row.rfq_id, now),
    ]);
  } catch (err) {
    // The row stays pending; the delivery marks it not received after the wait. The RFQ is unaffected.
    console.error(JSON.stringify({ operation: "rfq.file", result: "mark_failed_error", errorClass: err instanceof Error ? err.name : "unknown" }));
  }
}

async function readHead(reader: ReadableStreamDefaultReader<Uint8Array>, want: number): Promise<{ head: Uint8Array; chunks: Uint8Array[]; done: boolean }> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < want) {
    const { value, done } = await reader.read();
    if (done) return { head: joinChunks(chunks, total), chunks, done: true };
    chunks.push(value);
    total += value.byteLength;
  }
  return { head: joinChunks(chunks, total), chunks, done: false };
}

function joinChunks(chunks: Uint8Array[], total: number): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export interface UploadDeps {
  now?: () => Date;
}

export async function handleFileUpload(request: Request, env: RfqWorkerEnv, url: URL, deps: UploadDeps = {}): Promise<Response> {
  const allowed = csv(env.ALLOWED_ORIGINS);
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin, allowed);
  if (request.method !== "PUT") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED" }, { ...cors, Allow: "GET, PUT, OPTIONS" });
  if (!filesEnabled(env)) return json(404, { ok: false, code: "UPLOADS_DISABLED" }, cors);
  if (!isAllowedOrigin(origin, allowed)) return json(403, { ok: false, code: "VERIFICATION_FAILED" }, { Vary: "Origin" });

  const match = PATH.exec(url.pathname);
  const key = request.headers.get(RFQ_KEY_HEADER);
  // One answer for every "no such upload" case, so the endpoint is no oracle for references.
  const notFound = () => json(404, { ok: false, code: "NOT_FOUND" }, cors);
  if (!match || !REFERENCE.test(match[1]) || Number(match[2]) > MAX_RFQ_FILES || !isValidIdempotencyKey(key)) return notFound();
  const [, reference, slotText] = match;

  const lengthHeader = request.headers.get("content-length");
  const length = lengthHeader !== null && /^\d{1,9}$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
  if (!Number.isFinite(length)) return json(411, { ok: false, code: "LENGTH_REQUIRED" }, cors);
  if (length > MAX_RFQ_FILE_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, cors);
  if (length === 0 || !request.body) return json(422, { ok: false, code: "FILE_REJECTED", reason: "empty_file" }, cors);

  // Rate limit per client IP — fail CLOSED, like POST /api/rfqs; own key space so files never use up the RFQ budget.
  if (!env.RFQ_RATE_LIMITER) return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  try {
    const outcome = await env.RFQ_RATE_LIMITER.limit({ key: `files:${await hashRateLimitKey(getClientIp(request))}` });
    if (!outcome.success) return json(429, { ok: false, code: "RATE_LIMITED" }, { ...cors, "Retry-After": "60" });
  } catch {
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  }

  const db = env.DB_OPS;
  let row: SlotRow | null;
  try {
    row = await db
      .prepare(
        `SELECT a.id, a.rfq_id, a.object_key, a.extension, a.mime_declared, a.byte_size, a.upload_status, r.attachments_frozen_at, r.sync_status
         FROM rfq_attachments a JOIN rfqs r ON r.id = a.rfq_id
         WHERE r.reference_number = ? AND r.idempotency_key_hash = ? AND a.slot = ?`,
      )
      .bind(reference, await hashIdempotencyKey(key), Number(slotText))
      .first<SlotRow>();
  } catch {
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
  }
  if (!row) return notFound();
  if (row.upload_status === "uploaded") return json(200, { ok: true, status: "received" }, cors);
  // Once the first delivery attempt froze the file list, Odoo already has it: no late file can join.
  if (row.attachments_frozen_at || !["pending", "queued"].includes(row.sync_status) || !["pending", "failed"].includes(row.upload_status)) return json(409, { ok: false, code: "UPLOAD_CLOSED" }, cors);
  if (length !== row.byte_size) return json(422, { ok: false, code: "FILE_REJECTED", reason: "size_mismatch" }, cors);

  const now = () => (deps.now?.() ?? new Date()).toISOString();
  const ext = row.extension as RfqFileExtension;
  const reader = request.body.getReader();
  const reject = async (reason: RfqFileRejection) => {
    await markFailed(db, row, reason, now());
    console.log(JSON.stringify({ operation: "rfq.file", rfqId: row.rfq_id, slot: Number(slotText), result: "rejected", reason }));
    return json(422, { ok: false, code: "FILE_REJECTED", reason }, cors);
  };

  // 1. Head check (magic bytes) before a single byte is stored.
  let first: Awaited<ReturnType<typeof readHead>>;
  try {
    first = await readHead(reader, RFQ_FILE_HEAD_BYTES);
  } catch {
    return json(400, { ok: false, code: "UPLOAD_INTERRUPTED" }, cors);
  }
  const head = checkFileHead(first.head.subarray(0, RFQ_FILE_HEAD_BYTES), ext);
  if (!head.ok) {
    await reader.cancel().catch(() => {});
    return reject(head.reason);
  }

  // 2. Stream into R2. Every chunk is hashed (SHA-256 of the stored bytes, sent to Odoo with contract
  // v1.2); Office containers are also scanned on the way.
  const scanner = createContainerScanner(ext, nativeFind);
  const hash = createHash("sha256");
  const pipe = exactLengthStream(row.byte_size);
  const put = env.RFQ_FILES.put(row.object_key, pipe.readable, {
    httpMetadata: { contentType: row.mime_declared, contentDisposition: `attachment; filename="${slotText}.${ext}"` },
    customMetadata: { reference, slot: slotText },
  });
  let verdict: ReturnType<typeof scanner.verdict> = { ok: true };
  let streamError = false;
  try {
    const writer = pipe.writable.getWriter();
    const forward = async (chunk: Uint8Array) => {
      if (scanner.needed) scanner.push(chunk);
      hash.update(chunk);
      await writer.write(chunk);
    };
    for (const chunk of first.chunks) await forward(chunk);
    for (let done = first.done; !done; ) {
      const next = await reader.read();
      done = next.done;
      if (next.value) await forward(next.value);
    }
    // The verdict comes before close; a refused container is aborted and its key deleted below.
    verdict = scanner.verdict();
    if (verdict.ok) await writer.close();
    else await writer.abort(new Error(verdict.reason));
  } catch {
    streamError = true;
  }

  let stored: R2Object | null = null;
  try {
    stored = await put;
  } catch {
    stored = null;
  }
  // Refused or failed: delete the key unconditionally once the write has settled. An aborted stream
  // does not reliably fail the put (workerd wrote the object anyway in local testing), so a
  // rejected put is no proof that nothing was stored.
  if (!verdict.ok) {
    await env.RFQ_FILES.delete(row.object_key).catch(() => {});
    return reject(verdict.reason);
  }
  if (!stored || streamError) {
    await env.RFQ_FILES.delete(row.object_key).catch(() => {});
    await markFailed(db, row, "storage_error", now());
    console.error(JSON.stringify({ operation: "rfq.file", rfqId: row.rfq_id, slot: Number(slotText), result: "storage_error" }));
    return json(503, { ok: false, code: "STORAGE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
  }

  // 3. Record it — guarded: if the delivery froze the list meanwhile, the late object is removed again.
  const at = now();
  try {
    const [update] = await db.batch([
      db
        .prepare(
          `UPDATE rfq_attachments SET upload_status = 'uploaded', mime_detected = ?, r2_etag = ?, checksum_sha256 = ?, failure_code = NULL, upload_attempts = upload_attempts + 1, uploaded_at = ?, updated_at = ?
           WHERE id = ? AND upload_status IN ('pending', 'failed') AND EXISTS (SELECT 1 FROM rfqs WHERE id = ? AND attachments_frozen_at IS NULL)`,
        )
        .bind(row.mime_declared, stored.etag ?? null, hash.digest("hex"), at, at, row.id, row.rfq_id),
      releaseStatement(db, row.rfq_id, at),
    ]);
    if (!update.meta?.changes) {
      await env.RFQ_FILES.delete(row.object_key).catch(() => {});
      return json(409, { ok: false, code: "UPLOAD_CLOSED" }, cors);
    }
  } catch {
    // The object exists but D1 does not say so: the delivery reports it as not received; staff can still find it by key.
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
  }
  console.log(JSON.stringify({ operation: "rfq.file", rfqId: row.rfq_id, slot: Number(slotText), result: "stored", bytes: row.byte_size }));
  return json(201, { ok: true, status: "received" }, cors);
}
