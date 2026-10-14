/**
 * W13.3 test files, built in memory (deterministic, invented data — no customer, producer or price-source
 * names; the xlsx price column holds made-up numbers so the tests prove a price column is never read).
 * Built here instead of committed as files: binary/xlsx/csv/pdf files outside the approved asset
 * directories make a release AMBIGUOUS under docs/release/RELEASE_POLICY.md. Used by the tests only.
 *
 *   typedXlsx()       typed Excel: merged title row, header in row 3, a product cell merged over two rows,
 *                     Persian digits and separators, a price column, a total row, a hidden sheet
 *                     (deflated entries + sharedStrings, like Excel writes)
 *   AR_CSV            Arabic header and units, semicolon separated, UTF-8 with BOM
 *   faCp1256Csv()     Persian, comma separated, Windows-1256 (an old Excel "CSV" export)
 *   FREE_TEXT         a message pasted as text, with a price phrase
 *   typedPdf()        a PDF with a text layer (English)
 *   scannedPdf(jpeg)  a scanned page: only a JPEG picture (DCTDecode), no text layer
 *   syntheticJpeg(n)  bytes that pass the JPEG checks (the photos themselves: scripts/rfq/build-extract-fixtures.ts)
 */
import { Buffer } from "node:buffer";
import zlib from "node:zlib";

// --- zip (deflated, fixed timestamp) ------------------------------------------------------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function zip(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Buffer[] = [];
  const dirs: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const data = enc.encode(text);
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const n = enc.encode(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(n.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc32(data), 16);
    dir.writeUInt32LE(packed.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(n.length, 28);
    dir.writeUInt32LE(offset, 42);
    locals.push(local, Buffer.from(n), packed);
    dirs.push(dir, Buffer.from(n));
    offset += 30 + n.length + packed.length;
  }
  const dirBytes = Buffer.concat(dirs);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dirBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, dirBytes, end]));
}

// --- typed Excel ------------------------------------------------------------------------------
export function typedXlsx(): Uint8Array {
  const rows: (string | number | null)[][] = [
    ["لیست درخواست خرید پروژه نمونه", null, null, null, null, null, null, null],
    [],
    ["ردیف", "شرح کالا", "سایز", "ضخامت", "گرید", "مقدار", "واحد", "قیمت واحد (ریال)"],
    ["۱", "میلگرد آجدار", "۱۶", null, "A3", "۲۰", "تن", 987654],
    ["۲", "نبشی", "۵۰×۵۰", "۵", "ST37", "۳٬۵۰۰", "کیلوگرم", 123456],
    ["۳", null, "۶۰×۶۰", "۶", null, 120, "شاخه", null],
    ["۴", "تیرآهن IPE", "۱۸۰", null, null, 40, "شاخه", null],
    ["۵", "ورق سیاه", "۱۰×۱۵۰۰×۶۰۰۰", null, "ST37", "۵", "تن", null],
    ["۶", "قوطی", "۴۰×۴۰", "۲", null, "۲٫۵", "تن", null],
    ["۷", "سنگ آهن کنسانتره", null, null, null, 1000, "تن", null],
    ["جمع", null, null, null, null, null, null, 111111],
  ];
  const shared: string[] = [];
  const index = (s: string) => (shared.includes(s) ? shared.indexOf(s) : shared.push(s) - 1);
  const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const col = (i: number) => String.fromCharCode(65 + i);
  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          if (v === null || v === undefined) return "";
          const ref = `${col(c)}${r + 1}`;
          return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${index(v)}</v></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  // «نبشی» written once for two sizes (B5:B6, row ۳ has no product cell); the title merged over the table width (A1:H1).
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetData>${sheetRows}</sheetData><mergeCells count="2"><mergeCell ref="A1:H1"/><mergeCell ref="B5:B6"/></mergeCells></worksheet>`;
  const hidden = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>شرح کالا</t></is></c><c r="B1" t="inlineStr"><is><t>مقدار</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>میلگرد ۲۵ پنهان</t></is></c><c r="B2"><v>99</v></c></row></sheetData></worksheet>`;
  const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((s) => `<si><t>${xml(s)}</t></si>`).join("")}</sst>`;
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="درخواست" sheetId="1" r:id="rId1"/><sheet name="قدیمی" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
    ["xl/sharedStrings.xml", sst],
    ["xl/worksheets/sheet1.xml", sheet],
    ["xl/worksheets/sheet2.xml", hidden],
  ]);
}

// --- CSV / text ----------------------------------------------------------------------------------
function cp1256(text: string): Uint8Array {
  const decoder = new TextDecoder("windows-1256");
  const map = new Map<string, number>();
  for (let b = 0; b < 256; b++) map.set(decoder.decode(new Uint8Array([b])), b);
  // Windows-1256 has the Arabic ي/ك only — an old export writes them for Persian ی/ک (the reader's normalization unifies them).
  return Uint8Array.from([...text.replace(/ی/g, "ي").replace(/ک/g, "ك")].map((ch) => {
    const b = map.get(ch);
    if (b === undefined) throw new Error(`not in Windows-1256: ${ch}`);
    return b;
  }));
}

// --- PDF ---------------------------------------------------------------------------------------
function pdf(objects: (string | Uint8Array)[][]): Uint8Array {
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets: number[] = [];
  let length = parts[0].length;
  objects.forEach((chunks, i) => {
    offsets.push(length);
    const body = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), ...chunks.map((c) => (typeof c === "string" ? Buffer.from(c, "latin1") : Buffer.from(c))), Buffer.from("\nendobj\n", "latin1")]);
    parts.push(body);
    length += body.length;
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "latin1"));
  return new Uint8Array(Buffer.concat(parts));
}

export function typedPdf(): Uint8Array {
  const lines = ["Request for quotation - sample project", "1. Rebar A3 diameter 16 - 20 ton", "2. Equal angle 50x50x5 - 3500 kg", "3. IPE 180 beam - 40 branches", "Thank you"];
  const content = `BT /F1 12 Tf 60 780 Td 18 TL ${lines.map((l) => `(${l}) Tj T*`).join(" ")} ET`;
  return pdf([
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
    ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"],
  ]);
}

export function scannedPdf(jpeg: Uint8Array, width = 1240, height = 1754): Uint8Array {
  const content = `q 595 0 0 842 0 0 cm /Im1 Do Q`;
  return pdf([
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>"],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
    [`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"],
  ]);
}

export const AR_CSV = new TextEncoder().encode("\ufeffالبند;المقاس;الكمية;الوحدة\nحديد تسليح A3;16;15;طن\nزاوية 50×50×5;;200;كيلو\nأنبوب سيملس 4 بوصة;;20;قضيب\n");
export const faCp1256Csv = () => cp1256("شرح کالا,سایز,مقدار,واحد\r\nمیلگرد آجدار A3,14,12,تن\r\nناودانی UPN,120,30,شاخه\r\n");
export const FREE_TEXT = new TextEncoder().encode("سلام\nلیست مورد نیاز:\n1- میلگرد آجدار ۱۶ A3 ۲۰ تن\n2- نبشی ۵۰×۵۰ ضخامت ۵ تعداد ۱۲۰ شاخه\n3- قوطی ۴۰×۴۰ ضخامت ۲ مقدار ۲٫۵ تن فی ۴۵۰۰۰ تومان\nممنون\n");

/** `size` bytes that pass the JPEG magic-byte check and the page-picture search (SOI … EOI). */
export function syntheticJpeg(size = 20_000): Uint8Array {
  const out = new Uint8Array(size).map((_, i) => (i * 31) % 251);
  out.set([0xff, 0xd8, 0xff, 0xe0], 0);
  out.set([0xff, 0xd9], size - 2);
  return out;
}
