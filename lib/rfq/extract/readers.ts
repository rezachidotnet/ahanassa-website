/**
 * Deterministic readers for the typed list formats (W13.3): xlsx, csv, txt.
 * Each returns tables (a table is rows of cell strings) with merged cells
 * filled with the merged range's value, like the Odoo W13.2 readers.
 *
 * Runs in the visitor's browser (the RFQ form), never in the RFQ Worker:
 * the file is already in memory there, nothing is sent and no Worker CPU is
 * used (docs/RFQ_INSTANT_EXTRACT.md). Nothing is evaluated — a formula cell
 * is read as the value the customer's program last saved — and nothing is
 * rendered: only text comes out.
 *
 * The xlsx reader is a minimal zip + SpreadsheetML reader on the platform's
 * own DecompressionStream("deflate-raw") (browsers, Node ≥ 18, workerd). A
 * legacy .xls (binary BIFF) is not read here: the file is still attached and
 * Odoo reads it.
 */

export const MAX_TABLE_ROWS = 2000;
export const MAX_TABLE_COLUMNS = 40;
/** A zip entry inflating past this is refused (zip bomb guard); a real item list is a few hundred KB. */
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

export class ReadError extends Error {}

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

/** Bytes of a text file → string: UTF-16 (BOM), UTF-8 (with or without BOM), else Windows-1256 (Persian/Arabic Excel CSV). */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

const DELIMITERS = [",", ";", "\t", "|", "،"];

/** The delimiter that splits the first lines into the most equal, > 1 column counts. */
function sniffDelimiter(sample: string): string {
  const lines = sample.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best = ",";
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const frequency = new Map<number, number>();
    for (const l of lines) {
      const n = splitCsvLine(l, d).length;
      frequency.set(n, (frequency.get(n) ?? 0) + 1);
    }
    // The most common column count, and how many lines have it.
    const [mode, times] = [...frequency.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? [1, 0];
    const score = mode > 1 ? times * mode : 0;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (ch === delimiter) {
      out.push(cell);
      cell = "";
    } else cell += ch;
  }
  out.push(cell);
  return out.map((c) => c.trim());
}

function trimTable(table: string[][]): string[][] {
  const rows = table.slice(0, MAX_TABLE_ROWS).map((r) => r.slice(0, MAX_TABLE_COLUMNS));
  while (rows.length && !rows.at(-1)!.some(Boolean)) rows.pop();
  return rows;
}

export function readCsv(bytes: Uint8Array): string[][][] {
  const text = decodeText(bytes).replace(/^﻿/, "");
  const delimiter = sniffDelimiter(text.slice(0, 4096));
  // A quoted cell may span lines: join physical lines while a quote is open.
  const rows: string[][] = [];
  let pending = "";
  for (const line of text.split(/\r?\n/)) {
    pending = pending ? `${pending}\n${line}` : line;
    if ((pending.match(/"/g) ?? []).length % 2 === 1) continue;
    rows.push(splitCsvLine(pending, delimiter));
    pending = "";
    if (rows.length >= MAX_TABLE_ROWS) break;
  }
  const table = trimTable(rows);
  return table.length ? [table] : [];
}

/** A .txt: tab-separated lines are a table; anything else is free text. */
export function readTxt(bytes: Uint8Array): { tables: string[][][]; text: string } {
  const text = decodeText(bytes).replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length && lines.filter((l) => l.includes("\t")).length >= Math.max(2, Math.floor(lines.length / 2))) {
    return { tables: [trimTable(lines.map((l) => l.split("\t").map((c) => c.trim())))], text: "" };
  }
  return { tables: [], text };
}

// ---------------------------------------------------------------------------
// zip
// ---------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

function zipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ReadError("not a zip");
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw new ReadError("bad central directory");
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    entries.set(name, { name, method: view.getUint16(at + 10, true), compressedSize: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true) });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_ENTRY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new ReadError("entry too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry | undefined): Promise<string | null> {
  if (!entry) return null;
  if (entry.size > MAX_ENTRY_BYTES) throw new ReadError("entry too large");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new ReadError("bad local header");
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const data = bytes.subarray(start, start + entry.compressedSize);
  let raw: Uint8Array;
  if (entry.method === 0) raw = data;
  else if (entry.method === 8) raw = await inflateRaw(data);
  else throw new ReadError("unsupported compression");
  return new TextDecoder().decode(raw);
}

// ---------------------------------------------------------------------------
// SpreadsheetML
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function xmlText(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

/** All `<t>` text of an element, phonetic runs (`<rPh>`) left out. */
function runText(xml: string): string {
  return [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xmlText(m[1])).join("");
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

/** "BC12" → [row 11, column 54] (zero-based). */
function cellRef(ref: string): [number, number] | null {
  const m = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [Number(m[2]) - 1, col - 1];
}

function sheetTable(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const put = (r: number, c: number, v: string) => {
    if (r >= MAX_TABLE_ROWS || c >= MAX_TABLE_COLUMNS || r < 0 || c < 0) return;
    while (rows.length <= r) rows.push([]);
    const row = rows[r];
    while (row.length <= c) row.push("");
    row[c] = v;
  };
  const data = /<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/.exec(xml)?.[1] ?? "";
  let nextRow = 0;
  for (const rowMatch of data.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rAttr = attr(rowMatch[1], "r");
    const r = rAttr ? Number(rAttr) - 1 : nextRow;
    nextRow = r + 1;
    if (r >= MAX_TABLE_ROWS) break;
    let nextCol = 0;
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cellMatch[1], "r");
      const pos = ref ? cellRef(ref) : [r, nextCol];
      const c = pos ? pos[1] : nextCol;
      nextCol = c + 1;
      const type = attr(cellMatch[1], "t");
      const inner = cellMatch[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = "";
      if (type === "s") value = v !== undefined ? (shared[Number(v)] ?? "") : "";
      else if (type === "inlineStr") value = runText(inner);
      else if (type === "b") value = v === "1" ? "TRUE" : v === "0" ? "FALSE" : "";
      else if (type === "e") value = "";
      else if (v !== undefined) {
        value = xmlText(v);
        if (type !== "str" && /^-?\d+(?:\.\d+)?(?:E[+-]?\d+)?$/i.test(value)) {
          const n = Number(value);
          value = Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
        }
      }
      if (value) put(r, c, value.replace(/\s+/g, " ").trim());
    }
  }
  // Merged ranges take the value of their top-left cell (a product name written once for several sizes).
  for (const m of xml.matchAll(/<mergeCell\b[^>]*\sref="([A-Z]+\d+):([A-Z]+\d+)"/g)) {
    const a = cellRef(m[1]);
    const b = cellRef(m[2]);
    if (!a || !b) continue;
    const value = rows[a[0]]?.[a[1]] ?? "";
    if (!value) continue;
    for (let r = a[0]; r <= Math.min(b[0], MAX_TABLE_ROWS - 1); r++) for (let c = a[1]; c <= Math.min(b[1], MAX_TABLE_COLUMNS - 1); c++) put(r, c, value);
  }
  return trimTable(rows.map((row) => row.map((cell) => cell ?? "")));
}

/** The visible sheets of an .xlsx as tables, in workbook order. */
export async function readXlsx(bytes: Uint8Array): Promise<string[][][]> {
  const entries = zipEntries(bytes);
  const workbook = await readEntry(bytes, entries.get("xl/workbook.xml"));
  if (!workbook) throw new ReadError("no workbook");
  const rels = (await readEntry(bytes, entries.get("xl/_rels/workbook.xml.rels"))) ?? "";
  const targets = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) targets.set(id, target.replace(/^\/?(?:xl\/)?/, "xl/"));
  }
  const sharedXml = (await readEntry(bytes, entries.get("xl/sharedStrings.xml"))) ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => runText(m[1]));
  const tables: string[][][] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const state = attr(m[0], "state");
    if (state === "hidden" || state === "veryHidden") continue;
    const id = attr(m[0], "r:id");
    const target = id ? targets.get(id) : undefined;
    const sheet = await readEntry(bytes, target ? entries.get(target) : undefined);
    if (!sheet) continue;
    const table = sheetTable(sheet, shared);
    if (table.length) tables.push(table);
  }
  return tables;
}
