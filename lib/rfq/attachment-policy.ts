/**
 * RFQ file upload policy (owner decision D-RFQ-FILE, 2026-10-12;
 * docs/RFQ_FILE_UPLOAD.md). Pure and shared: the /contact form runs it in the
 * browser before submit (clear, localized errors), and the RFQ Worker runs it
 * again on the bytes it receives (lib/rfq-worker/attachments.ts) — the server
 * verdict is the only one that counts.
 *
 *   - allow-list by extension: jpg, jpeg, png, webp, heic, pdf, xlsx, xls, csv, docx, txt;
 *   - at most MAX_RFQ_FILES files of at most MAX_RFQ_FILE_BYTES each;
 *   - the extension AND the content's magic bytes must agree;
 *   - executables, archives and macro files are refused, also when renamed
 *     (an .xlsm renamed .xlsx still carries `vbaProject.bin`; a .zip renamed
 *     .xlsx has no `[Content_Types].xml`; an .exe renamed .pdf has no `%PDF-`).
 *
 * Nothing here renders, parses or opens a document — it only reads bytes.
 */

export const MAX_RFQ_FILES = 5;
/** The downloadable item-list template (lib/rfq/item-list-template.ts builds it into public/downloads/). */
export const ITEM_LIST_TEMPLATE_PATH = (locale: "fa" | "en" | "ar") => `/downloads/ahanassa-item-list-${locale}.xlsx`;
export const MAX_RFQ_FILE_BYTES = 15 * 1024 * 1024;
/** Longest original filename kept (confidential display metadata, never used as a storage key). */
export const MAX_RFQ_FILENAME_LENGTH = 120;
/** Header carrying the RFQ's own idempotency key on a file PUT (the upload credential). */
export const RFQ_KEY_HEADER_NAME = "x-rfq-key";
/** Bytes the head check needs (the HEIC `ftyp` box and the text sniff fit in it). */
export const RFQ_FILE_HEAD_BYTES = 4096;

export type RfqFileKind = "jpeg" | "png" | "webp" | "heic" | "pdf" | "ooxml-xlsx" | "ooxml-docx" | "cfb-xls" | "text";

export const RFQ_FILE_TYPES = {
  jpg: { kind: "jpeg", mime: "image/jpeg" },
  jpeg: { kind: "jpeg", mime: "image/jpeg" },
  png: { kind: "png", mime: "image/png" },
  webp: { kind: "webp", mime: "image/webp" },
  heic: { kind: "heic", mime: "image/heic" },
  pdf: { kind: "pdf", mime: "application/pdf" },
  xlsx: { kind: "ooxml-xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  xls: { kind: "cfb-xls", mime: "application/vnd.ms-excel" },
  csv: { kind: "text", mime: "text/csv" },
  docx: { kind: "ooxml-docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  txt: { kind: "text", mime: "text/plain" },
} as const satisfies Record<string, { kind: RfqFileKind; mime: string }>;

export type RfqFileExtension = keyof typeof RFQ_FILE_TYPES;
export const RFQ_FILE_EXTENSIONS = Object.keys(RFQ_FILE_TYPES) as RfqFileExtension[];
/** `accept` attribute for the file input: extensions only (MIME types from the OS are unreliable, e.g. HEIC, CSV). */
export const RFQ_FILE_ACCEPT = RFQ_FILE_EXTENSIONS.map((e) => `.${e}`).join(",");

/**
 * Why a file is refused. The form maps each code to a localized message;
 * the server stores it as `rfq_attachments.failure_code`.
 */
export type RfqFileRejection =
  | "too_many_files"
  | "empty_file"
  | "file_too_large"
  | "extension_not_allowed"
  | "macro_file"
  | "executable_or_archive"
  | "content_mismatch";

/** Extensions refused with a specific reason, not just "not allowed". */
const MACRO_EXTENSIONS = new Set(["xlsm", "xltm", "xlsb", "xlam", "docm", "dotm", "pptm", "potm", "ppsm", "ppam", "sldm"]);
const EXECUTABLE_OR_ARCHIVE_EXTENSIONS = new Set([
  "exe", "dll", "com", "scr", "msi", "msix", "bat", "cmd", "ps1", "vbs", "vbe", "js", "jse", "wsf", "hta", "jar", "apk", "app", "dmg", "pkg", "deb", "rpm", "sh", "bin", "elf", "lnk", "iso", "img",
  "zip", "rar", "7z", "gz", "tgz", "bz2", "xz", "tar", "cab", "arj", "lz", "lzh", "zst",
]);

/** Lower-cased final extension without the dot ("" when there is none). */
export function fileExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** The allowed extension of `name`, or the rejection for it. */
export function classifyExtension(name: string): { ok: true; ext: RfqFileExtension } | { ok: false; reason: RfqFileRejection } {
  const ext = fileExtension(name);
  if (Object.hasOwn(RFQ_FILE_TYPES, ext)) return { ok: true, ext: ext as RfqFileExtension };
  if (MACRO_EXTENSIONS.has(ext)) return { ok: false, reason: "macro_file" };
  if (EXECUTABLE_OR_ARCHIVE_EXTENSIONS.has(ext)) return { ok: false, reason: "executable_or_archive" };
  return { ok: false, reason: "extension_not_allowed" };
}

/** Declared-metadata check (name + size) — the part the RFQ submit itself can verify. */
export function checkDeclaredFile(file: { name: string; size: number }): { ok: true; ext: RfqFileExtension } | { ok: false; reason: RfqFileRejection } {
  const ext = classifyExtension(file.name);
  if (!ext.ok) return ext;
  if (!Number.isInteger(file.size) || file.size <= 0) return { ok: false, reason: "empty_file" };
  if (file.size > MAX_RFQ_FILE_BYTES) return { ok: false, reason: "file_too_large" };
  return ext;
}

/**
 * Filename kept for staff (D1, Odoo notes): path stripped, control and
 * bidi-override characters removed, whitespace collapsed, at most
 * MAX_RFQ_FILENAME_LENGTH characters with the extension kept. Never used to
 * build a storage key or a header.
 */
export function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = [...base];
  if (chars.length <= MAX_RFQ_FILENAME_LENGTH) return base || "file";
  const ext = fileExtension(base);
  const keep = ext ? MAX_RFQ_FILENAME_LENGTH - ext.length - 1 : MAX_RFQ_FILENAME_LENGTH;
  return `${chars.slice(0, keep).join("").trimEnd()}${ext ? `.${ext}` : ""}`;
}

// ---------------------------------------------------------------------------
// Content checks
// ---------------------------------------------------------------------------

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const utf16le = (s: string) => Uint8Array.from([...s].flatMap((c) => [c.charCodeAt(0), 0]));
const startsWith = (b: Uint8Array, sig: readonly number[], offset = 0) => b.length >= offset + sig.length && sig.every((x, i) => b[offset + i] === x);

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** Magic numbers of executables and archives — refused whatever the extension says. */
const FORBIDDEN_SIGNATURES: { sig: number[]; offset?: number }[] = [
  { sig: [0x4d, 0x5a] }, // MZ: Windows PE / DOS
  { sig: [0x7f, 0x45, 0x4c, 0x46] }, // ELF
  { sig: [0xfe, 0xed, 0xfa, 0xce] }, { sig: [0xfe, 0xed, 0xfa, 0xcf] }, { sig: [0xce, 0xfa, 0xed, 0xfe] }, { sig: [0xcf, 0xfa, 0xed, 0xfe] }, // Mach-O
  { sig: [0xca, 0xfe, 0xba, 0xbe] }, // Mach-O fat / Java class
  { sig: [0x23, 0x21] }, // "#!" script
  { sig: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] }, // Rar!
  { sig: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] }, // 7z
  { sig: [0x1f, 0x8b] }, // gzip
  { sig: [0x42, 0x5a, 0x68] }, // bzip2
  { sig: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00] }, // xz
  { sig: [0x28, 0xb5, 0x2f, 0xfd] }, // zstd
  { sig: [0x4d, 0x53, 0x43, 0x46] }, // MSCF (cab)
  { sig: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257 }, // tar "ustar"
  { sig: [0x43, 0x44, 0x30, 0x30, 0x31], offset: 0x8001 }, // ISO 9660 (beyond the head; harmless when absent)
];
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);

function forbiddenSignature(head: Uint8Array): boolean {
  return FORBIDDEN_SIGNATURES.some(({ sig, offset }) => startsWith(head, sig, offset ?? 0));
}

/**
 * Plain text: no NUL byte and almost no C0 control characters in the head.
 * UTF-16 (Excel "Unicode text") is accepted only with its byte-order mark.
 */
function looksLikeText(head: Uint8Array): boolean {
  if (startsWith(head, [0xff, 0xfe]) || startsWith(head, [0xfe, 0xff])) return true;
  let control = 0;
  for (const b of head) {
    if (b === 0) return false;
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d && b !== 0x0c) control++;
  }
  return control <= head.length / 100;
}

/**
 * The first RFQ_FILE_HEAD_BYTES (or the whole file if shorter) against the
 * extension's kind. Containers (OOXML zip, legacy CFB) also need the full
 * byte scan below before they are accepted.
 */
export function checkFileHead(head: Uint8Array, ext: RfqFileExtension): { ok: true } | { ok: false; reason: RfqFileRejection } {
  const kind = RFQ_FILE_TYPES[ext].kind;
  if (head.length === 0) return { ok: false, reason: "empty_file" };
  if (forbiddenSignature(head)) return { ok: false, reason: "executable_or_archive" };
  const isZip = startsWith(head, ZIP);
  const isCfb = startsWith(head, CFB);
  let ok: boolean;
  switch (kind) {
    case "jpeg": ok = startsWith(head, [0xff, 0xd8, 0xff]); break;
    case "png": ok = startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); break;
    case "webp": ok = startsWith(head, [...ascii("RIFF")]) && startsWith(head, [...ascii("WEBP")], 8); break;
    case "heic": ok = startsWith(head, [...ascii("ftyp")], 4) && HEIC_BRANDS.has(String.fromCharCode(...head.slice(8, 12))); break;
    case "pdf": ok = startsWith(head, [...ascii("%PDF-")]); break;
    case "ooxml-xlsx":
    case "ooxml-docx": ok = isZip; break;
    case "cfb-xls": ok = isCfb; break;
    case "text": ok = !isZip && !isCfb && looksLikeText(head); break;
  }
  if (!ok) return { ok: false, reason: isZip && kind !== "ooxml-xlsx" && kind !== "ooxml-docx" ? "executable_or_archive" : "content_mismatch" };
  return { ok: true };
}

/** Byte-sequence search; the RFQ Worker passes a native one (node:buffer `indexOf`). */
export type ByteFinder = (haystack: Uint8Array, needle: Uint8Array) => boolean;

export const findBytes: ByteFinder = (haystack, needle) => {
  const first = needle[0];
  const last = haystack.length - needle.length;
  outer: for (let i = haystack.indexOf(first); i !== -1 && i <= last; i = haystack.indexOf(first, i + 1)) {
    for (let j = 1; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
};

/**
 * Container markers. Zip entry names sit uncompressed in every local file
 * header, and CFB storage names in the directory sectors (UTF-16LE), so a
 * plain byte scan finds them without unpacking anything. Limit: legacy
 * Excel 4.0 (XLM) macro sheets in an .xls have no storage of their own and
 * are not detected here — the files are never opened on the website, and
 * staff open them in Odoo/Excel with macros disabled (docs/RFQ_FILE_UPLOAD.md).
 */
const MARKERS = {
  contentTypes: ascii("[Content_Types].xml"),
  vbaProject: ascii("vbaProject.bin"),
  vbaData: ascii("vbaData.xml"),
  xlPart: ascii("xl/workbook"),
  wordPart: ascii("word/document"),
  cfbVba: utf16le("_VBA_PROJECT_CUR"),
  cfbWorkbook: utf16le("Workbook"),
  cfbBook: utf16le("Book"),
};
const LONGEST_MARKER = Math.max(...Object.values(MARKERS).map((m) => m.length));

/**
 * Streaming scan of a zip/CFB container, chunk by chunk (the Worker never
 * holds a whole upload in memory). Chunks overlap by the longest marker so a
 * name split between two chunks is still found.
 */
export function createContainerScanner(ext: RfqFileExtension, find: ByteFinder = findBytes) {
  const kind = RFQ_FILE_TYPES[ext].kind;
  const seen = new Set<keyof typeof MARKERS>();
  const wanted = (Object.keys(MARKERS) as (keyof typeof MARKERS)[]).filter((k) => (kind === "cfb-xls" ? k.startsWith("cfb") : !k.startsWith("cfb")));
  let carry = new Uint8Array(0);
  return {
    get needed(): boolean {
      return kind === "ooxml-xlsx" || kind === "ooxml-docx" || kind === "cfb-xls";
    },
    push(chunk: Uint8Array): void {
      if (!this.needed) return;
      const view = carry.length ? concat(carry, chunk) : chunk;
      for (const k of wanted) if (!seen.has(k) && find(view, MARKERS[k])) seen.add(k);
      carry = view.slice(Math.max(0, view.length - (LONGEST_MARKER - 1)));
    },
    verdict(): { ok: true } | { ok: false; reason: RfqFileRejection } {
      if (kind === "ooxml-xlsx" || kind === "ooxml-docx") {
        if (seen.has("vbaProject") || seen.has("vbaData")) return { ok: false, reason: "macro_file" };
        // A zip that is not an Office document is an archive.
        if (!seen.has("contentTypes")) return { ok: false, reason: "executable_or_archive" };
        if (!seen.has(kind === "ooxml-xlsx" ? "xlPart" : "wordPart")) return { ok: false, reason: "content_mismatch" };
      }
      if (kind === "cfb-xls") {
        if (seen.has("cfbVba")) return { ok: false, reason: "macro_file" };
        if (!seen.has("cfbWorkbook") && !seen.has("cfbBook")) return { ok: false, reason: "content_mismatch" };
      }
      return { ok: true };
    },
  };
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Whole-file check in one call (the browser pre-check; the tests). The Worker streams the same steps. */
export function checkFileBytes(bytes: Uint8Array, name: string, find: ByteFinder = findBytes): { ok: true; ext: RfqFileExtension } | { ok: false; reason: RfqFileRejection } {
  const declared = checkDeclaredFile({ name, size: bytes.length });
  if (!declared.ok) return declared;
  const head = checkFileHead(bytes.subarray(0, RFQ_FILE_HEAD_BYTES), declared.ext);
  if (!head.ok) return head;
  const scanner = createContainerScanner(declared.ext, find);
  scanner.push(bytes);
  const verdict = scanner.verdict();
  return verdict.ok ? declared : verdict;
}
