/**
 * Browser side of W13.3 instant extraction (docs/RFQ_INSTANT_EXTRACT.md).
 *
 *   - A picture's or PDF's text comes back from the Worker as a transcript and
 *     is turned into rows here, with the spreadsheet parser.
 *   - Typed lists (xlsx, csv, txt) are read right here, from the file already
 *     in memory: nothing is sent, no Worker time is used.
 *   - Pictures (jpg, png, webp; heic where the browser can decode it) are
 *     shrunk to READ_MAX_SIDE and made grey/contrasted (enhance.ts), then sent
 *     with a fresh Turnstile token to POST <rfq-origin>/api/rfqs/extract.
 *     PDFs are sent as they are (the Worker reads the text layer, or the page
 *     pictures of a scan).
 *   - xls and docx are not read here: they stay attached and Odoo reads them.
 *
 * The answer is checked again (parseExtractedLines) before any of it reaches
 * the form; whatever happens, the file itself stays attached to the RFQ.
 */
import { fileExtension } from "../attachment-policy.ts";
import { parseExtractedLines } from "./ai-answer.ts";
import { enhanceForReading, readingSize } from "./enhance.ts";
import { rowsToLines, textToLines, transcriptToLines, type ExtractedLine } from "./lines.ts";
import { readCsv, readTxt, readXlsx } from "./readers.ts";
import type { ExtractSource } from "./to-rows.ts";

export type ExtractKind = "list" | "picture" | "pdf";

/** How a file can be read, or null (xls, docx, anything else: attached only). */
export function extractKindFor(name: string): ExtractKind | null {
  const ext = fileExtension(name);
  if (ext === "xlsx" || ext === "csv" || ext === "txt") return "list";
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || ext === "heic") return "picture";
  if (ext === "pdf") return "pdf";
  return null;
}

export type ExtractFailureReason = "unsupported" | "unreadable" | "timeout" | "rate_limited" | "verification" | "unavailable" | "failed";

export type ExtractResult = { ok: true; lines: ExtractedLine[]; source: ExtractSource } | { ok: false; reason: ExtractFailureReason };

/** Reads a typed list in the browser. */
export async function readListFile(file: Blob, name: string): Promise<ExtractResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = fileExtension(name);
  try {
    if (ext === "xlsx") return { ok: true, source: "spreadsheet", lines: (await readXlsx(bytes)).flatMap((table) => rowsToLines(table)) };
    if (ext === "csv") return { ok: true, source: "spreadsheet", lines: readCsv(bytes).flatMap((table) => rowsToLines(table)) };
    const txt = readTxt(bytes);
    return { ok: true, source: "text", lines: txt.tables.length ? txt.tables.flatMap((table) => rowsToLines(table)) : textToLines(txt.text) };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

/** The copy of a picture sent for reading: upright, ≤ READ_MAX_SIDE, grey and contrasted, JPEG. Null when the browser cannot decode it (e.g. HEIC outside Safari). */
export async function preparePicture(file: Blob): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const { width, height } = readingSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    enhanceForReading(pixels.data);
    context.putImageData(pixels, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85));
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

export const EXTRACT_CLIENT_TIMEOUT_MS = 35_000;
/** Same cap as the Worker's (lib/rfq-worker/extract.ts MAX_TRANSCRIPT_CHARS). */
const MAX_TRANSCRIPT_CHARS = 20_000;

/** `.../api/rfqs` → `.../api/rfqs/extract`. */
export const extractEndpointFor = (rfqEndpoint: string) => `${rfqEndpoint.replace(/\/+$/, "")}/extract`;

/** POST one picture/PDF for reading. Never throws. */
export async function requestExtract(
  endpoint: string,
  body: Blob,
  ext: "jpg" | "png" | "webp" | "pdf",
  turnstileToken: string,
  deps: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<ExtractResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? EXTRACT_CLIENT_TIMEOUT_MS);
  try {
    const res = await (deps.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { "content-type": "application/octet-stream", "x-turnstile-token": turnstileToken, "x-file-ext": ext },
      body,
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; source?: string; lines?: unknown; transcript?: unknown } | null;
    if (res.ok && data?.ok) {
      const source = data.source === "pdf_text" ? "pdf_text" : "image";
      // A list's text: read here with the spreadsheet parser (no Worker CPU). Prose: the Worker's validated lines.
      if (typeof data.transcript === "string") return data.transcript.length <= MAX_TRANSCRIPT_CHARS ? { ok: true, lines: transcriptToLines(data.transcript), source } : { ok: false, reason: "failed" };
      const lines = parseExtractedLines(data.lines);
      if (!lines) return { ok: false, reason: "failed" };
      return { ok: true, lines, source };
    }
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (res.status === 403) return { ok: false, reason: "verification" };
    if (res.status === 504 || data?.code === "EXTRACT_TIMEOUT") return { ok: false, reason: "timeout" };
    if (res.status === 404 || res.status === 503) return { ok: false, reason: "unavailable" };
    if (res.status === 415 || res.status === 422) return { ok: false, reason: "unsupported" };
    return { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? "timeout" : "failed" };
  } finally {
    clearTimeout(timer);
  }
}
