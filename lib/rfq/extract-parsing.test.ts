import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { editDistance, matchKey, normText, numbersIn } from "./extract/normalize.ts";
import { formatQuantity, parseQuantity, quantityWithUnit, unitCode } from "./extract/units.ts";
import { findHeader, headerField, rowsToLines, stripPrices, textToLines, transcriptToLines } from "./extract/lines.ts";
import { decodeText, readCsv, ReadError, readTxt, readXlsx } from "./extract/readers.ts";
import { readListFile, extractKindFor, requestExtract, extractEndpointFor } from "./extract/browser.ts";
import { AiAnswerInvalid, parseExtractedLines, validateAiAnswer } from "./extract/ai-answer.ts";
import { enhanceForReading, readingSize, READ_MAX_SIDE } from "./extract/enhance.ts";
import { buildExtractEvent } from "./extract/analytics.ts";
import { AR_CSV, faCp1256Csv, FREE_TEXT, typedXlsx } from "./extract/test-fixtures.ts";

/** W13.3 — deterministic reading of customer lists (docs/RFQ_INSTANT_EXTRACT.md). Fixtures: lib/rfq/extract/test-fixtures.ts (built in memory). */
const FIXTURES: Record<string, () => Uint8Array> = {
  "typed-list.fa.xlsx": typedXlsx,
  "list.ar.csv": () => AR_CSV,
  "list.fa-1256.csv": faCp1256Csv,
  "free-text.fa.txt": () => FREE_TEXT,
};
const fixture = (name: string) => FIXTURES[name]();

test("normText/matchKey: Persian and Arabic digits, ي/ك, ZWNJ, × and آ variants read alike", () => {
  assert.equal(normText("  ۱۲٫۵ تن  "), "12.5 تن");
  assert.equal(normText("حديد تسليح ٥٠×٥٠"), "حدید تسلیح 50x50");
  assert.equal(normText("نبشی‌ها"), "نبشی ها");
  assert.equal(matchKey("تیر آهن"), matchKey("تیراهن"));
  assert.equal(matchKey("تيرآهن"), "تیراهن");
  assert.deepEqual(numbersIn("100×50×۵"), [100, 50, 5]);
  assert.equal(editDistance("مبلگرد", "میلگرد", 1), 1);
  assert.ok(editDistance("ناودانی", "میلگرد", 1) > 1);
});

test("units: unit words in fa/ar/en, quantities with Persian separators, the last «number unit» pair", () => {
  for (const [text, code] of [["تن", "ton"], ["طن", "ton"], ["Kg", "kg"], ["کیلوگرم", "kg"], ["كيلو", "kg"], ["شاخه", "branch"], ["قضبان", "branch"], ["ورق", "sheet"], ["متر", "meter"], ["عدد", "piece"], ["کلاف", "coil"], ["وزن (کیلوگرم)", "kg"]] as const) {
    assert.equal(unitCode(text), code, text);
  }
  assert.equal(unitCode("سایز"), null);
  assert.equal(parseQuantity("۳٬۵۰۰"), 3500);
  assert.equal(parseQuantity("1,250"), 1250);
  assert.equal(parseQuantity("2,5"), 2.5);
  assert.equal(parseQuantity("۲٫۵"), 2.5);
  assert.equal(parseQuantity("0"), null);
  assert.equal(parseQuantity("1.2.3"), null);
  assert.equal(parseQuantity(12), 12);
  assert.deepEqual(quantityWithUnit("میلگرد ۱۶ A3 ۲۰ تن"), { quantity: 20, unit: "ton", matched: "20 تن" });
  assert.equal(quantityWithUnit("20t").unit, "ton");
  assert.equal(quantityWithUnit("شاخه ۱۲ متری").quantity, null, "«۱۲ متری» is a length, not 12 metres");
  assert.equal(quantityWithUnit("ورق 5 mm").quantity, null, "mm is not a unit of quantity");
  assert.equal(formatQuantity(2.5), "2.5");
  assert.equal(formatQuantity(1250), "1250");
});

test("stripPrices: money phrases leave the customer's text, sizes and quantities stay", () => {
  assert.equal(stripPrices("قوطی ۴۰×۴۰ ضخامت ۲ مقدار ۲٫۵ تن فی ۴۵۰۰۰ تومان"), "قوطی ۴۰×۴۰ ضخامت ۲ مقدار ۲٫۵ تن");
  assert.equal(stripPrices("rebar 16 - 20 ton, price: 1,200 USD"), "rebar 16 - 20 ton");
  assert.equal(stripPrices("angle 50x50x5 $450"), "angle 50x50x5");
  assert.equal(stripPrices("میلگرد ۱۶ | ۲۰ | تن | ۹۸۷۶۵۴ ریال"), "میلگرد ۱۶ | ۲۰ | تن");
  assert.equal(stripPrices("حديد 14 السعر 300 دولار 15 طن"), "حديد 14 15 طن");
});

test("headers: Persian/Arabic/English column names; a price column is never a field", () => {
  assert.equal(headerField("شرح کالا"), "product");
  assert.equal(headerField("الكمية"), "quantity");
  assert.equal(headerField("Qty"), "quantity");
  assert.equal(headerField("وزن (تن)"), "quantity");
  assert.equal(headerField("قیمت واحد (ریال)"), null);
  assert.equal(headerField("مبلغ کل"), null);
  assert.equal(headerField("Unit price"), null);
  assert.equal(findHeader([["title"], ["ردیف", "شرح کالا", "مقدار", "واحد"]])?.index, 1);
  assert.equal(findHeader([["foo", "bar"]]), null);
});

test("typed Excel fixture: merged cells filled, hidden sheet skipped, price column and total row ignored, Persian digits read", async () => {
  const tables = await readXlsx(fixture("typed-list.fa.xlsx"));
  assert.equal(tables.length, 1, "the hidden sheet is not read");
  const lines = rowsToLines(tables[0]);
  assert.deepEqual(
    lines.map((l) => [l.product, l.size, l.thickness, l.grade, l.quantity, l.unit]),
    [
      ["میلگرد آجدار", "۱۶", null, "A3", 20, "ton"],
      ["نبشی", "۵۰×۵۰", "۵", "ST37", 3500, "kg"],
      ["نبشی", "۶۰×۶۰", "۶", null, 120, "branch"],
      ["تیرآهن IPE", "۱۸۰", null, null, 40, "branch"],
      ["ورق سیاه", "۱۰×۱۵۰۰×۶۰۰۰", null, "ST37", 5, "ton"],
      ["قوطی", "۴۰×۴۰", "۲", null, 2.5, "ton"],
      ["سنگ آهن کنسانتره", null, null, null, 1000, "ton"],
    ],
  );
  const everything = JSON.stringify(lines);
  for (const price of ["987654", "123456", "111111", "قیمت"]) assert.ok(!everything.includes(price), `price data leaked: ${price}`);
  assert.ok(!lines.some((l) => /^[۱-۷] \|/.test(l.rawText)), "the row-number column is not part of rawText");
  assert.equal(lines[2].rawText, "نبشی | ۶۰×۶۰ | ۶ | 120 | شاخه");
});

test("CSV fixtures: Arabic UTF-8 with BOM and semicolons; Persian in Windows-1256 with Arabic ي/ك", () => {
  const ar = rowsToLines(readCsv(fixture("list.ar.csv"))[0]);
  assert.deepEqual(ar.map((l) => [l.product, l.size, l.quantity, l.unit]), [
    ["حديد تسليح A3", "16", 15, "ton"],
    ["زاوية 50×50×5", null, 200, "kg"],
    ["أنبوب سيملس 4 بوصة", null, 20, "branch"],
  ]);
  const fa = rowsToLines(readCsv(fixture("list.fa-1256.csv"))[0]);
  assert.equal(fa.length, 2);
  assert.equal(normText(fa[0].product), "میلگرد اجدار a3".replace("ا", "آ"));
  assert.deepEqual([fa[1].size, fa[1].quantity, fa[1].unit], ["120", 30, "branch"]);
  assert.equal(decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00])), "A");
});

test("free text: greetings skipped, bullets removed, «تعداد ۱۲۰ شاخه» and a price phrase handled", () => {
  const { tables, text } = readTxt(fixture("free-text.fa.txt"));
  assert.equal(tables.length, 0);
  const lines = textToLines(text);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => [l.quantity, l.unit, l.grade]), [[20, "ton", "a3"], [120, "branch", null], [2.5, "ton", null]]);
  assert.equal(lines[1].thickness, "5");
  assert.ok(!lines[2].rawText.includes("۴۵۰۰۰") && !lines[2].rawText.includes("تومان"), "the price phrase is gone");
  // tab-separated .txt is a table
  const tsv = readTxt(new TextEncoder().encode("شرح کالا\tمقدار\tواحد\nمیلگرد ۱۶\t۲۰\tتن\nنبشی ۵۰\t۳\tتن\n"));
  assert.equal(rowsToLines(tsv.tables[0]).length, 2);
});

test("vision transcripts: a ' | ' table goes through header guessing, any column order; free lines are text", () => {
  // Recorded from @cf/meta/llama-4-scout-17b-16e-instruct and @cf/mistralai/mistral-small-3.1-24b-instruct on 2026-10-13.
  const scout = "لیست اقلام درخواستی\nردیف شرح کالا | سایز | مقدار | واحد\n-------------------------\n۱ میلگرد آجدار A3 | ۱۶ | ۲۰ | تن\n۲ تیرآهن IPE | ۱۸ | ۴۰ | شاخه";
  assert.deepEqual(transcriptToLines(scout).map((l) => [l.product, l.size, l.quantity, l.unit]), [["میلگرد آجدار A3", "۱۶", 20, "ton"], ["تیرآهن IPE", "۱۸", 40, "branch"]]);
  const reversed = "واحد | مقدار | سایز | ردیف شرح کالا\nتن | ۲ | ۱۶ | میلگرد آجدار A3 | ۱";
  assert.deepEqual(transcriptToLines(reversed).map((l) => [l.size, l.quantity, l.unit]), [["۱۶", 2, "ton"]]);
  const handwritten = "لیست خرید\nمیله گرد ۱۲ آجدار A3 - ۱۲تن\nنبشی -۸×۸۰×۸۰ - ۲تن";
  assert.deepEqual(transcriptToLines(handwritten).map((l) => [l.quantity, l.unit]), [[12, "ton"], [2, "ton"]]);
});

test("readers refuse broken input instead of guessing: not a zip, an oversized entry", async () => {
  await assert.rejects(readXlsx(new TextEncoder().encode("not a zip at all, just text")), ReadError);
  // A zip whose workbook claims 30 MB uncompressed (zip-bomb guard).
  const data = zlib.deflateRawSync(Buffer.alloc(1000));
  const name = Buffer.from("xl/workbook.xml");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(30 * 1024 * 1024, 22);
  local.writeUInt16LE(name.length, 26);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(8, 10);
  dir.writeUInt32LE(data.length, 20);
  dir.writeUInt32LE(30 * 1024 * 1024, 24);
  dir.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + name.length, 12);
  end.writeUInt32LE(30 + name.length + data.length, 16);
  await assert.rejects(readXlsx(new Uint8Array(Buffer.concat([local, name, data, dir, name, end]))), ReadError);
});

test("browser entry: which files are read where; a broken list file is 'unreadable', never a throw", async () => {
  assert.equal(extractKindFor("لیست.XLSX"), "list");
  assert.equal(extractKindFor("a.csv"), "list");
  assert.equal(extractKindFor("photo.jpeg"), "picture");
  assert.equal(extractKindFor("IMG_1.HEIC"), "picture");
  assert.equal(extractKindFor("scan.pdf"), "pdf");
  assert.equal(extractKindFor("old.xls"), null);
  assert.equal(extractKindFor("letter.docx"), null);
  const ok = await readListFile(new Blob([fixture("typed-list.fa.xlsx") as BlobPart]), "typed-list.fa.xlsx");
  assert.ok(ok.ok && ok.lines.length === 7 && ok.source === "spreadsheet");
  assert.deepEqual(await readListFile(new Blob([new Uint8Array([1, 2, 3])]), "broken.xlsx"), { ok: false, reason: "unreadable" });
});

test("AI answer: strict JSON only — repaired never; prices stripped; capped", () => {
  const line = { product: "میلگرد", size: "۱۶", thickness: null, grade: "A3", standard: null, quantity: 20, unit: "تن", raw_text: "میلگرد ۱۶ A3 - ۲۰ تن - فی ۳۵۰۰۰ تومان" };
  const [read] = validateAiAnswer({ lines: [line] });
  assert.deepEqual([read.quantity, read.unit, read.rawText], [20, "ton", "میلگرد ۱۶ A3 - ۲۰ تن"]);
  assert.equal(validateAiAnswer(JSON.stringify({ lines: [line] })).length, 1, "a JSON string answer is accepted");
  assert.equal(validateAiAnswer("```json\n" + JSON.stringify({ lines: [] }) + "\n```").length, 0);
  assert.equal(validateAiAnswer({ lines: [{ ...line, quantity: "۲۰" }] })[0].quantity, 20);
  for (const bad of [
    "{not json",
    [],
    { lines: [], extra: 1 },
    { items: [] },
    { lines: [{ ...line, price: 35000 }] },
    { lines: [{ ...line, raw_text: "" }] },
    { lines: [{ ...line, quantity: true }] },
    { lines: [{ ...line, product: { x: 1 } }] },
    { lines: [{ ...line, product: "x".repeat(200) }] },
    { lines: Array.from({ length: 201 }, () => line) },
  ]) {
    assert.throws(() => validateAiAnswer(bad), AiAnswerInvalid, JSON.stringify(bad).slice(0, 60));
  }
});

test("the browser re-checks the Worker's answer: wrong types, unknown units or oversize text are refused whole", () => {
  const good = { rawText: "میلگرد ۱۶", product: "میلگرد", size: "16", thickness: null, grade: null, standard: null, length: null, quantity: 2, unit: "ton", unitText: "تن" };
  assert.equal(parseExtractedLines([good])?.length, 1);
  assert.equal(parseExtractedLines("x"), null);
  assert.equal(parseExtractedLines([{ ...good, unit: "barrel" }]), null);
  assert.equal(parseExtractedLines([{ ...good, quantity: -1 }]), null);
  assert.equal(parseExtractedLines([{ ...good, rawText: "<b>".repeat(400) }]), null);
  assert.equal(parseExtractedLines([{ ...good, product: 5 }]), null);
});

test("picture preparation: long side ≤ READ_MAX_SIDE; grey with the contrast stretched; transparent → white", () => {
  assert.deepEqual(readingSize(4032, 3024), { width: READ_MAX_SIDE, height: 1200 });
  assert.deepEqual(readingSize(800, 600), { width: 800, height: 600 });
  // a dim, low-contrast picture: values 100..140 become 0..255
  const pixels = new Uint8ClampedArray(4 * 100);
  for (let i = 0; i < 100; i++) pixels.set([100 + (i % 41), 100 + (i % 41), 100 + (i % 41), 255], i * 4);
  enhanceForReading(pixels);
  const greys = [...Array(100).keys()].map((i) => pixels[i * 4]);
  assert.equal(Math.min(...greys), 0);
  assert.equal(Math.max(...greys), 255);
  assert.ok([...Array(100).keys()].every((i) => pixels[i * 4] === pixels[i * 4 + 1] && pixels[i * 4 + 3] === 255));
  const clear = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
  enhanceForReading(clear);
  assert.ok(clear[0] > clear[4], "a transparent pixel is paper (white), an opaque black pixel stays dark");
});

test("analytics: only allowlisted keys and short tokens — a file name or read text never reaches the dataLayer", () => {
  assert.deepEqual(buildExtractEvent("rfq_extract", { extract_result: "ok", row_count: 5, review_count: 2, file_type: "jpg", extract_seconds: 6.2 }), { event: "rfq_extract", extract_result: "ok", row_count: 5, review_count: 2, file_type: "jpg", extract_seconds: 6.2 });
  const leaky = buildExtractEvent("rfq_extract", { extract_result: "میلگرد ۱۶", file_type: "لیست خرید.xlsx", ...({ file_name: "x" } as object) });
  assert.deepEqual(leaky, { event: "rfq_extract" });
  assert.deepEqual(buildExtractEvent("file_upload", { file_count: 2, file_type: "pdf" }), { event: "file_upload", file_count: 2, file_type: "pdf" });
});

test("requestExtract: transcript → rows here; validated lines; every failure is a reason, never a throw", async () => {
  assert.equal(extractEndpointFor("https://api.example/api/rfqs/"), "https://api.example/api/rfqs/extract");
  const seen: { headers: Headers; body: unknown }[] = [];
  const answer = (status: number, body: unknown) => (async (_u: unknown, init: RequestInit) => (seen.push({ headers: new Headers(init.headers), body: init.body }), Response.json(body, { status }))) as unknown as typeof fetch;
  const ok = await requestExtract("u", new Blob(["x"]), "jpg", "tok", { fetchImpl: answer(200, { ok: true, source: "image", transcript: "شرح کالا | مقدار | واحد\nمیلگرد ۱۶ | ۲۰ | تن" }) });
  assert.ok(ok.ok && ok.lines.length === 1 && ok.lines[0].quantity === 20 && ok.source === "image");
  assert.equal(seen[0].headers.get("x-turnstile-token"), "tok");
  assert.equal(seen[0].headers.get("x-file-ext"), "jpg");
  const lines = await requestExtract("u", new Blob(["x"]), "pdf", "tok", { fetchImpl: answer(200, { ok: true, source: "pdf_text", lines: [{ rawText: "a 2 ton", product: "a", quantity: 2, unit: "ton" }] }) });
  assert.ok(lines.ok && lines.source === "pdf_text" && lines.lines[0].quantity === 2);
  const cases: [number, unknown, string][] = [
    [429, { ok: false, code: "RATE_LIMITED" }, "rate_limited"],
    [403, { ok: false, code: "VERIFICATION_FAILED" }, "verification"],
    [504, { ok: false, code: "EXTRACT_TIMEOUT" }, "timeout"],
    [502, { ok: false, code: "EXTRACT_FAILED", reason: "ai_error" }, "failed"],
    [503, { ok: false }, "unavailable"],
    [404, { ok: false, code: "EXTRACT_DISABLED" }, "unavailable"],
    [422, { ok: false, code: "FILE_REJECTED" }, "unsupported"],
    [200, { ok: true, lines: [{ rawText: 5 }] }, "failed"],
    [200, { ok: true, transcript: "x".repeat(20_001) }, "failed"],
  ];
  for (const [status, body, reason] of cases) assert.deepEqual(await requestExtract("u", new Blob(["x"]), "jpg", "t", { fetchImpl: answer(status, body) }), { ok: false, reason }, `${status} ${JSON.stringify(body).slice(0, 40)}`);
  const offline = (async () => { throw new TypeError("offline"); }) as typeof fetch;
  assert.deepEqual(await requestExtract("u", new Blob(["x"]), "jpg", "t", { fetchImpl: offline }), { ok: false, reason: "failed" });
  const hang = ((_u: unknown, init: RequestInit) => new Promise((_r, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
  assert.deepEqual(await requestExtract("u", new Blob(["x"]), "jpg", "t", { fetchImpl: hang, timeoutMs: 20 }), { ok: false, reason: "timeout" });
});
