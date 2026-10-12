import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeclaredFile, checkFileBytes, classifyExtension, createContainerScanner, fileExtension, MAX_RFQ_FILE_BYTES, RFQ_FILE_ACCEPT, sanitizeFilename } from "./attachment-policy.ts";
import { buildAttachmentNotes, formatFileSize } from "./attachment-notes.ts";

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const utf16 = (s: string) => Uint8Array.from([...s].flatMap((c) => [c.charCodeAt(0), 0]));
const join = (...parts: (string | number[] | Uint8Array)[]) => {
  const chunks = parts.map((p) => (typeof p === "string" ? ascii(p) : Uint8Array.from(p)));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) out.set(c, (at += c.length) - c.length);
  return out;
};
const pad = (n: number, byte = 0x20) => new Uint8Array(n).fill(byte);
const CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const verdict = (bytes: Uint8Array, name: string) => {
  const r = checkFileBytes(bytes, name);
  return r.ok ? "ok" : r.reason;
};

test("allow-list: exactly the 11 owner-approved extensions, case-insensitive; macro, executable/archive and other types refused with their reason", () => {
  assert.equal(RFQ_FILE_ACCEPT, ".jpg,.jpeg,.png,.webp,.heic,.pdf,.xlsx,.xls,.csv,.docx,.txt");
  for (const name of ["a.jpg", "a.JPEG", "a.png", "a.webp", "a.HEIC", "a.pdf", "a.xlsx", "a.xls", "a.csv", "a.docx", "a.txt"]) assert.equal(classifyExtension(name).ok, true, name);
  const reason = (n: string) => {
    const r = classifyExtension(n);
    return r.ok ? "ok" : r.reason;
  };
  for (const n of ["a.xlsm", "a.docm", "a.xlsb", "a.dotm", "a.xltm"]) assert.equal(reason(n), "macro_file", n);
  for (const n of ["a.exe", "a.zip", "a.rar", "a.7z", "a.js", "a.bat", "a.msi", "a.tar", "a.gz", "a.apk"]) assert.equal(reason(n), "executable_or_archive", n);
  for (const n of ["a.svg", "a.html", "a.doc", "a.gif", "noext", ".pdf", "a.pdf.", "a"]) assert.equal(reason(n), "extension_not_allowed", n);
  assert.equal(fileExtension("dir/sub\\list.final.XLSX"), "xlsx");
});

test("declared size: 1 byte .. 15 MB", () => {
  assert.equal(checkDeclaredFile({ name: "a.pdf", size: MAX_RFQ_FILE_BYTES }).ok, true);
  assert.deepEqual(checkDeclaredFile({ name: "a.pdf", size: MAX_RFQ_FILE_BYTES + 1 }), { ok: false, reason: "file_too_large" });
  assert.deepEqual(checkDeclaredFile({ name: "a.pdf", size: 0 }), { ok: false, reason: "empty_file" });
  assert.deepEqual(checkDeclaredFile({ name: "a.exe", size: 0 }), { ok: false, reason: "executable_or_archive" }, "the type is reported first");
});

test("magic bytes: every allowed kind accepted with its own signature, refused with another", () => {
  const jpeg = join([0xff, 0xd8, 0xff, 0xe0], pad(100));
  const png = join([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d], "IHDR", pad(100, 0));
  const webp = join("RIFF", [1, 2, 3, 4], "WEBPVP8 ", pad(100));
  const heic = join([0, 0, 0, 0x18], "ftypheic", pad(100));
  const heicMif1 = join([0, 0, 0, 0x18], "ftypmif1", pad(100));
  const mp4 = join([0, 0, 0, 0x18], "ftypisom", pad(100));
  const pdf = join("%PDF-1.4\n", pad(100));
  const xlsx = join([0x50, 0x4b, 3, 4], pad(30), "[Content_Types].xml", pad(30), "xl/workbook.xml");
  const docx = join([0x50, 0x4b, 3, 4], pad(30), "[Content_Types].xml", pad(30), "word/document.xml");
  const xls = join(CFB, pad(500, 0), utf16("Workbook"), pad(100, 0));
  const csv = ascii("product,size,qty\r\nrebar,16,12\r\n");
  const csvPersian = new TextEncoder().encode("محصول,سایز\nمیلگرد,۱۶\n");
  const txtUtf16 = join([0xff, 0xfe], utf16("rebar 16"));
  assert.equal(verdict(jpeg, "a.jpg"), "ok");
  assert.equal(verdict(png, "a.png"), "ok");
  assert.equal(verdict(webp, "a.webp"), "ok");
  assert.equal(verdict(heic, "a.heic"), "ok");
  assert.equal(verdict(heicMif1, "a.heic"), "ok");
  assert.equal(verdict(mp4, "a.heic"), "content_mismatch");
  assert.equal(verdict(pdf, "a.pdf"), "ok");
  assert.equal(verdict(xlsx, "a.xlsx"), "ok");
  assert.equal(verdict(docx, "a.docx"), "ok");
  assert.equal(verdict(xls, "a.xls"), "ok");
  assert.equal(verdict(csv, "a.csv"), "ok");
  assert.equal(verdict(csvPersian, "a.csv"), "ok");
  assert.equal(verdict(txtUtf16, "a.txt"), "ok");
  // Wrong pairings.
  assert.equal(verdict(png, "a.jpg"), "content_mismatch");
  assert.equal(verdict(pdf, "a.png"), "content_mismatch");
  assert.equal(verdict(jpeg, "a.pdf"), "content_mismatch");
  assert.equal(verdict(docx, "a.xlsx"), "content_mismatch");
  assert.equal(verdict(xlsx, "a.docx"), "content_mismatch");
  assert.equal(verdict(xlsx, "a.csv"), "executable_or_archive");
  assert.equal(verdict(png, "a.txt"), "content_mismatch");
  assert.equal(verdict(xls, "a.txt"), "content_mismatch");
});

test("executables and archives are refused whatever the extension claims", () => {
  const cases: [Uint8Array, string][] = [
    [join("MZ", [0x90, 0], pad(200, 0)), "a.pdf"],
    [join([0x7f], "ELF", pad(200, 0)), "a.png"],
    [join([0xcf, 0xfa, 0xed, 0xfe], pad(200, 0)), "a.jpg"],
    [join("#!/bin/sh\nrm -rf /\n"), "a.txt"],
    [join("Rar!", [0x1a, 0x07, 0], pad(100)), "a.xlsx"],
    [join([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], pad(100)), "a.docx"],
    [join([0x1f, 0x8b, 8], pad(100)), "a.csv"],
    [join(pad(257, 0x61), "ustar", pad(300, 0x61)), "a.txt"],
    [join([0x50, 0x4b, 3, 4], pad(30), "drawings/plan.dwg"), "a.xlsx"],
  ];
  for (const [bytes, name] of cases) assert.equal(verdict(bytes, name), "executable_or_archive", `${name} ${bytes.slice(0, 4)}`);
});

test("macro files renamed to an allowed extension are refused (OOXML vbaProject.bin / vbaData.xml, legacy _VBA_PROJECT_CUR)", () => {
  const xlsm = join([0x50, 0x4b, 3, 4], pad(30), "[Content_Types].xml", pad(30), "xl/workbook.xml", pad(10), "xl/vbaProject.bin");
  const docm = join([0x50, 0x4b, 3, 4], pad(30), "[Content_Types].xml", pad(30), "word/document.xml", pad(10), "word/vbaData.xml");
  const xlsMacro = join(CFB, pad(500, 0), utf16("Workbook"), pad(100, 0), utf16("_VBA_PROJECT_CUR"));
  assert.equal(verdict(xlsm, "prices.xlsx"), "macro_file");
  assert.equal(verdict(docm, "letter.docx"), "macro_file");
  assert.equal(verdict(xlsMacro, "old.xls"), "macro_file");
});

test("binary data in a .txt/.csv is refused; a few stray control characters are tolerated", () => {
  assert.equal(verdict(join("abc", [0], "def"), "a.txt"), "content_mismatch");
  assert.equal(verdict(join(pad(50, 1), "abc"), "a.csv"), "content_mismatch");
  assert.equal(verdict(join("a\tb\r\nc", [0x0c], pad(200, 0x41)), "a.txt"), "ok");
});

test("container scan works across chunk boundaries (a marker split between two network chunks is still found)", () => {
  const data = join([0x50, 0x4b, 3, 4], pad(30), "[Content_Types].xml", pad(30), "xl/workbook.xml", pad(10), "xl/vbaProject.bin", pad(30));
  const split = data.length - 30 - 7; // inside "vbaProject.bin"
  for (const cut of [split, split - 3, 5, 40]) {
    const scanner = createContainerScanner("xlsx");
    scanner.push(data.subarray(0, cut));
    scanner.push(data.subarray(cut));
    assert.deepEqual(scanner.verdict(), { ok: false, reason: "macro_file" }, `cut ${cut}`);
  }
  const images = createContainerScanner("png");
  assert.equal(images.needed, false);
  assert.deepEqual(images.verdict(), { ok: true });
});

test("sanitizeFilename: path, control and bidi characters removed, long names cut with the extension kept", () => {
  assert.equal(sanitizeFilename("C:\\Users\\x\\لیست خرید.xlsx"), "لیست خرید.xlsx");
  assert.equal(sanitizeFilename("../../etc/pas\u0000swd.txt"), "passwd.txt");
  assert.equal(sanitizeFilename("invoice\u202Efdp.exe.pdf"), "invoicefdp.exe.pdf");
  assert.equal(sanitizeFilename('a"<b>|c.pdf'), "abc.pdf");
  assert.equal(sanitizeFilename("   "), "file");
  const long = sanitizeFilename(`${"ب".repeat(300)}.xlsx`);
  assert.equal([...long].length, 120);
  assert.ok(long.endsWith(".xlsx"));
});

test("Odoo notes: received files with their private key, missing ones flagged FILE NOT RECEIVED with the reason", () => {
  assert.equal(buildAttachmentNotes([]), null);
  const notes = buildAttachmentNotes([
    { slot: 2, original_filename: "photo.png", byte_size: 2_500_000, upload_status: "failed", failure_code: "storage_error", object_key: "rfq/AA-RFQ-1/2.png" },
    { slot: 1, original_filename: "list.xlsx", byte_size: 900, upload_status: "uploaded", failure_code: null, object_key: "rfq/AA-RFQ-1/1.xlsx" },
  ]);
  assert.equal(
    notes,
    [
      "[website] Files with this request: 1 received, 1 NOT RECEIVED (private storage; open with the RFQ admin tool, /__admin/attachments):",
      "1. list.xlsx — 1 KB — received — rfq/AA-RFQ-1/1.xlsx",
      "2. photo.png — 2.4 MB — FILE NOT RECEIVED (not received — storage error)",
    ].join("\n"),
  );
  assert.equal(formatFileSize(15 * 1024 * 1024), "15.0 MB");
});
