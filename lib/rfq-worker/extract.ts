import { Buffer } from "node:buffer";
import { checkFileHead, MAX_RFQ_FILE_BYTES, RFQ_FILE_HEAD_BYTES, RFQ_FILE_TYPES, type RfqFileExtension } from "../rfq/attachment-policy.ts";
import { AI_LINES_SCHEMA, AiAnswerInvalid, validateAiAnswer } from "../rfq/extract/ai-answer.ts";
import type { ExtractedLine } from "../rfq/extract/lines.ts";
import { verifyTurnstileToken } from "../security/turnstile.ts";
import { TURNSTILE_EXTRACT_ACTION } from "../security/turnstile-action.ts";
import { getClientIp, hashRateLimitKey } from "../security/rate-limit.ts";
import { corsHeaders, isAllowedOrigin } from "./cors.ts";
import { csv, extractEnabled, type AiBinding, type RfqWorkerEnv } from "./config.ts";

/**
 * POST /api/rfqs/extract — W13.3 instant item extraction (docs/RFQ_INSTANT_EXTRACT.md).
 *
 * The RFQ form sends ONE picture or PDF of the customer's list before the RFQ
 * is submitted, and gets back draft item lines to pre-fill its rows. Typed
 * lists (xlsx, csv, txt) never come here: the browser reads them itself
 * (lib/rfq/extract/readers.ts), with no upload and no Worker CPU.
 *
 * Nothing is stored: the bytes live in this request only, go to Workers AI
 * (Cloudflare, same account) and are dropped. The original file is still
 * uploaded with the RFQ afterwards (W13.1, private R2) for Odoo staff.
 *
 * Checks, cheapest first; nothing reaches Workers AI before all of them pass:
 *   1. method / switch (RFQ_EXTRACT_ENABLED + AI + upload on)  → 405 / 404
 *   2. CORS origin (exact allow-list)                          → 403
 *   3. X-File-Ext ∈ jpg/jpeg/png/webp/pdf; Content-Length      → 415 / 411 / 413 / 422
 *   4. per-IP rate limit, own binding, fail-closed              → 429 / 503
 *   5. Turnstile, action rfq_extract, our hostname              → 403 / 503
 *   6. body length = Content-Length; magic bytes = extension    → 422 (same checks as W13.1)
 *   7. extraction within EXTRACT_TIMEOUT_MS                      → 504 / 502
 * Two answers, both plain data (docs/RFQ_INSTANT_EXTRACT.md "Worker CPU"):
 *   - `transcript`: the vision model's text of a list or table (or a PDF's
 *     text layer), control characters removed, capped. The BROWSER turns it
 *     into rows with the same deterministic parser it uses for spreadsheets
 *     (lib/rfq/extract/lines.ts transcriptToLines) — that parser compiles
 *     ~100 regular expressions, too much CPU for a Workers Free request;
 *   - `lines`: when the text does not look like a list (prose), the text
 *     model's strict JSON, validated here (lib/rfq/extract/ai-answer.ts).
 * Prices are removed by the parser / the validation; logs carry sizes,
 * timings and counts, never content.
 */

export const EXTRACT_PATH = "/api/rfqs/extract";
export const EXTRACT_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"] as const satisfies readonly RfqFileExtension[];
export type ExtractExtension = (typeof EXTRACT_EXTENSIONS)[number];
export const TURNSTILE_HEADER = "x-turnstile-token";
export const FILE_EXT_HEADER = "x-file-ext";
/** The whole extraction, both model calls included. The form gives up a little later and keeps the file attached. */
export const EXTRACT_TIMEOUT_MS = 25_000;
/** A typed PDF's text layer shorter than this (letters + digits) is a scan. */
const MIN_PDF_TEXT_CHARS = 25;
/** At most this many page pictures of a scanned PDF are read (latency, cost). */
const MAX_PDF_PAGES = 2;
const MIN_PAGE_JPEG_BYTES = 8 * 1024;
const MAX_TEXT_CHARS = 20_000;
/** The longest transcript returned to the browser. */
export const MAX_TRANSCRIPT_CHARS = 20_000;

export const DEFAULT_VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
export const DEFAULT_TEXT_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

// The same prompts as the Odoo W13.2 intake (lib/workers_ai.py), so a picture reads alike on both sides.
export const TRANSCRIBE_PROMPT =
  "This picture is a customer's request for steel products (a typed or handwritten list, a table, or a photo of " +
  "one). Transcribe every piece of text on it exactly as written, in its own language (Persian, Arabic or English) " +
  "and with its own digits. Write each table row or list item on its own line, with ' | ' between the cells of a " +
  "row. Do not translate, correct, summarize or add anything. Output only the transcription.";
export const EXTRACT_PROMPT =
  "You read customers' requests for quotation for steel products (rebar, beams, angles, channels, hollow sections, " +
  "pipes, sheets, plates, coils, billets, iron ore). From the text below, list every requested item. For each item " +
  "give: raw_text = the customer's own words for that item, copied exactly (same language, same digits); product " +
  "= the product name; size, thickness, grade, standard = as written, or null; quantity = a number, or null; unit " +
  "= the customer's unit word (ton, kg, branch, sheet, meter, piece, coil, ...), or null. Never invent an item, a " +
  "size or a quantity that the text does not state; never convert units; skip greetings, addresses, prices and " +
  'signatures. Answer with JSON only: {"lines": [...]}.';

export type ExtractSourceKind = "image" | "pdf_text";
export type ExtractFailure = "ai_error" | "invalid_answer" | "unreadable" | "empty";

export class ExtractError extends Error {
  readonly reason: ExtractFailure;
  constructor(reason: ExtractFailure) {
    super(reason);
    this.reason = reason;
  }
}

const json = (status: number, body: unknown, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store", ...headers } });

export function extractPreflight(request: Request, allowed: readonly string[]): Response {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, allowed)) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": `content-type, ${TURNSTILE_HEADER}, ${FILE_EXT_HEADER}`, "Access-Control-Max-Age": "86400", Vary: "Origin" },
  });
}

// ---------------------------------------------------------------------------
// PDF helpers (byte search only — nothing is parsed or rendered)
// ---------------------------------------------------------------------------

const find = (hay: Buffer, needle: string | number[], from = 0) => hay.indexOf(typeof needle === "string" ? Buffer.from(needle, "latin1") : Buffer.from(needle), from);

/**
 * The JPEG page pictures of a scanned PDF: a scanner or a phone "scan to PDF"
 * stores each page as one DCTDecode image stream, whose bytes ARE a JPEG.
 * Returns up to `max` of them (≥ MIN_PAGE_JPEG_BYTES, so logos and stamps are
 * skipped), in document order. Native Buffer search: no per-byte JavaScript.
 */
export function pdfPageJpegs(bytes: Uint8Array, max = MAX_PDF_PAGES): Uint8Array[] {
  const pdf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Uint8Array[] = [];
  for (let at = find(pdf, "/DCTDecode"); at !== -1 && out.length < max; at = find(pdf, "/DCTDecode", at + 10)) {
    const stream = find(pdf, "stream", at);
    if (stream === -1) break;
    let start = stream + 6;
    if (pdf[start] === 0x0d) start++;
    if (pdf[start] === 0x0a) start++;
    const end = find(pdf, "endstream", start);
    if (end === -1) break;
    let stop = end;
    while (stop > start && (pdf[stop - 1] === 0x0a || pdf[stop - 1] === 0x0d)) stop--;
    const jpeg = bytes.subarray(start, stop);
    if (jpeg.length >= MIN_PAGE_JPEG_BYTES && jpeg[0] === 0xff && jpeg[1] === 0xd8 && jpeg[2] === 0xff) out.push(jpeg);
    at = end;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Workers AI
// ---------------------------------------------------------------------------

export interface ExtractModels {
  vision: string;
  text: string;
}

export type ExtractOutcome = {
  source: ExtractSourceKind;
  /** Model calls made (for the log and the measurements). */
  calls: number;
} & ({ structured: "parser"; transcript: string } | { structured: "text_model"; lines: ExtractedLine[] });

/** Control characters out (newlines and tabs kept), capped. */
export function cleanTranscript(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").slice(0, MAX_TRANSCRIPT_CHARS);
}

/**
 * Cheap test (one regular expression, no parsing): does the text look like an item list — table rows
 * («… | … | …»), or a number followed by a unit word («۲۰ تن», «40 branches»)? Then the browser's parser
 * reads it; otherwise the text model does.
 */
const LIST_LIKE = /\|[^|\n]*\||[0-9\u0660-\u0669\u06F0-\u06F9]\s*(?:تن|طن|کیلو|كيلو|کیلوگرم|kg|ton|tons|t\b|شاخه|شاخ|ورق|متر|عدد|branch|bar|sheet|meter|piece|pcs|قضيب|لوح|متر)/i;
export const looksLikeList = (text: string): boolean => LIST_LIKE.test(text);

/**
 * A transcription or a PDF text layer: a list goes back as text for the browser's parser (no extra time,
 * no Worker CPU); prose goes to the text model (strict JSON). Measured 2026-10-13: the text model adds
 * 8–16 s and rewrote raw_text — the parser neither (docs/RFQ_INSTANT_EXTRACT.md).
 */
async function fromText(ai: AiBinding, model: string, text: string, source: ExtractSourceKind, calls: number): Promise<ExtractOutcome> {
  if (looksLikeList(text)) return { source, structured: "parser", transcript: cleanTranscript(text), calls };
  return { source, structured: "text_model", lines: await structureLines(ai, model, text), calls: calls + 1 };
}

function answerText(result: unknown): unknown {
  if (result && typeof result === "object" && "response" in result) return (result as { response: unknown }).response;
  return undefined;
}

async function run(ai: AiBinding, model: string, inputs: unknown): Promise<unknown> {
  try {
    return answerText(await ai.run(model, inputs));
  } catch {
    throw new ExtractError("ai_error");
  }
}

/** All text of one picture, as plain text (vision model). */
export async function transcribeImage(ai: AiBinding, model: string, bytes: Uint8Array, mime: string): Promise<string> {
  const url = `data:${mime};base64,${Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64")}`;
  const text = await run(ai, model, {
    messages: [{ role: "user", content: [{ type: "text", text: TRANSCRIBE_PROMPT }, { type: "image_url", image_url: { url } }] }],
    max_tokens: 2048,
    temperature: 0,
  });
  if (typeof text !== "string" || !text.trim()) throw new ExtractError("empty");
  return text.trim();
}

/** Strict JSON lines for a transcription or a PDF text layer (text model, JSON mode), validated. */
export async function structureLines(ai: AiBinding, model: string, text: string): Promise<ExtractedLine[]> {
  const answer = await run(ai, model, {
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      { role: "user", content: text.slice(0, MAX_TEXT_CHARS) },
    ],
    response_format: { type: "json_schema", json_schema: AI_LINES_SCHEMA },
    max_tokens: 4096,
    temperature: 0,
  });
  if (answer === undefined || answer === null || answer === "") throw new ExtractError("empty");
  try {
    return validateAiAnswer(answer);
  } catch (err) {
    if (err instanceof AiAnswerInvalid) throw new ExtractError("invalid_answer");
    throw err;
  }
}

/** A typed PDF's text layer (Workers AI Markdown conversion; free for PDFs), or "" for a scan. */
export async function pdfText(ai: AiBinding, bytes: Uint8Array): Promise<string> {
  if (!ai.toMarkdown) return "";
  try {
    const result = await ai.toMarkdown([{ name: "list.pdf", blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) }]);
    const first = Array.isArray(result) ? result[0] : result;
    const data = first && first.format !== "error" && typeof first.data === "string" ? first.data : "";
    return pdfLayerText(data);
  } catch {
    return "";
  }
}

/**
 * The page text of a toMarkdown result, or "" when there is none (a scan): the converter writes
 * «# <name>», a «## Metadata» list and «## Contents» with «### Page N» headings — only the lines under
 * Contents that are not headings are the customer's text.
 */
export function pdfLayerText(markdown: string): string {
  const at = markdown.indexOf("## Contents");
  const body = (at >= 0 ? markdown.slice(at + "## Contents".length) : markdown)
    .split(/\r?\n/)
    .filter((l) => !/^#{1,6}\s/.test(l))
    .join("\n")
    .trim();
  return (body.match(/[A-Za-zÀ-ɏء-يٮ-ۓەۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9٠-٩۰-۹]/gu) ?? []).length >= MIN_PDF_TEXT_CHARS ? body : "";
}

export async function extractLines(ai: AiBinding, models: ExtractModels, bytes: Uint8Array, ext: ExtractExtension): Promise<ExtractOutcome> {
  if (ext === "pdf") {
    const text = await pdfText(ai, bytes);
    if (text) return fromText(ai, models.text, text, "pdf_text", 1);
    const pages = pdfPageJpegs(bytes);
    if (!pages.length) throw new ExtractError("unreadable");
    const transcripts = await Promise.all(pages.map((page) => transcribeImage(ai, models.vision, page, "image/jpeg")));
    return fromText(ai, models.text, transcripts.join("\n"), "image", 1 + pages.length);
  }
  const transcript = await transcribeImage(ai, models.vision, bytes, RFQ_FILE_TYPES[ext].mime);
  return fromText(ai, models.text, transcript, "image", 1);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([promise, new Promise<"timeout">((resolve) => (timer = setTimeout(() => resolve("timeout"), ms)))]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// handler
// ---------------------------------------------------------------------------

export interface ExtractDeps {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

export async function handleExtract(request: Request, env: RfqWorkerEnv, deps: ExtractDeps = {}): Promise<Response> {
  const allowed = csv(env.ALLOWED_ORIGINS);
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin, allowed);
  const now = deps.now ?? (() => Date.now());
  const started = now();
  if (request.method !== "POST") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED" }, { ...cors, Allow: "POST, OPTIONS" });
  if (!extractEnabled(env)) return json(404, { ok: false, code: "EXTRACT_DISABLED" }, cors);
  if (!isAllowedOrigin(origin, allowed)) return json(403, { ok: false, code: "VERIFICATION_FAILED" }, { Vary: "Origin" });

  const ext = (request.headers.get(FILE_EXT_HEADER) ?? "").toLowerCase();
  if (!(EXTRACT_EXTENSIONS as readonly string[]).includes(ext)) return json(415, { ok: false, code: "UNSUPPORTED_TYPE" }, cors);
  const lengthHeader = request.headers.get("content-length");
  const length = lengthHeader !== null && /^\d{1,9}$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
  if (!Number.isFinite(length)) return json(411, { ok: false, code: "LENGTH_REQUIRED" }, cors);
  if (length > MAX_RFQ_FILE_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, cors);
  if (length === 0 || !request.body) return json(422, { ok: false, code: "FILE_REJECTED", reason: "empty_file" }, cors);

  // Rate limit per client IP — its own binding (a reading costs model time, an RFQ does not), fail CLOSED.
  const clientIp = getClientIp(request);
  if (!env.RFQ_EXTRACT_RATE_LIMITER) return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  try {
    const outcome = await env.RFQ_EXTRACT_RATE_LIMITER.limit({ key: `extract:${await hashRateLimitKey(clientIp)}` });
    if (!outcome.success) return json(429, { ok: false, code: "RATE_LIMITED" }, { ...cors, "Retry-After": "60" });
  } catch {
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  }

  const turnstile = await verifyTurnstileToken(request.headers.get(TURNSTILE_HEADER), {
    secret: env.TURNSTILE_SECRET_KEY ?? "",
    expectedHostnames: csv(env.TURNSTILE_EXPECTED_HOSTNAMES),
    requireAction: true,
    expectedAction: TURNSTILE_EXTRACT_ACTION,
    remoteIp: clientIp === "unknown" ? undefined : clientIp,
    fetchImpl: deps.fetchImpl,
  });
  if (!turnstile.ok) {
    if (turnstile.reason === "unavailable") return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
    return json(403, { ok: false, code: "VERIFICATION_FAILED" }, cors);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return json(400, { ok: false, code: "UPLOAD_INTERRUPTED" }, cors);
  }
  if (bytes.length !== length) return json(422, { ok: false, code: "FILE_REJECTED", reason: "size_mismatch" }, cors);
  const head = checkFileHead(bytes.subarray(0, RFQ_FILE_HEAD_BYTES), ext as ExtractExtension);
  if (!head.ok) return json(422, { ok: false, code: "FILE_REJECTED", reason: head.reason }, cors);

  const models: ExtractModels = { vision: env.EXTRACT_VISION_MODEL || DEFAULT_VISION_MODEL, text: env.EXTRACT_TEXT_MODEL || DEFAULT_TEXT_MODEL };
  const log = (result: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ operation: "rfq.extract", result, ext, bytes: length, ms: now() - started, ...extra }));
  try {
    const outcome = await withTimeout(extractLines(env.AI!, models, bytes, ext as ExtractExtension), deps.timeoutMs ?? EXTRACT_TIMEOUT_MS);
    if (outcome === "timeout") {
      log("timeout");
      return json(504, { ok: false, code: "EXTRACT_TIMEOUT" }, cors);
    }
    if (outcome.structured === "parser") {
      log("ok", { source: outcome.source, structured: outcome.structured, chars: outcome.transcript.length, calls: outcome.calls });
      return json(200, { ok: true, source: outcome.source, transcript: outcome.transcript }, cors);
    }
    log("ok", { source: outcome.source, structured: outcome.structured, lines: outcome.lines.length, calls: outcome.calls });
    return json(200, { ok: true, source: outcome.source, lines: outcome.lines }, cors);
  } catch (err) {
    const reason: ExtractFailure = err instanceof ExtractError ? err.reason : "ai_error";
    log("failed", { reason });
    return json(502, { ok: false, code: "EXTRACT_FAILED", reason }, cors);
  }
}
