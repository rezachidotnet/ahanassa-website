import type { Locale } from "../../config/locales.ts";
import { RFQ_UOM_CODES, RFQ_UOM_LABELS } from "./uom.ts";
import { LAUNCH_DEFERRED_UOMS } from "./uom-policy.ts";

/**
 * The downloadable item-list template (D-RFQ-FILE): one .xlsx per locale
 * with the columns product, size, thickness, grade/standard, quantity, unit.
 * No macros, no formulas, no example data (nothing invented); the Unit
 * column offers the Launch units as a dropdown but accepts any text.
 *
 * Built here, byte-for-byte deterministic (fixed zip timestamps, stored
 * entries), by scripts/rfq/build-item-list-template.ts into
 * public/downloads/; lib/rfq/item-list-template.test.ts proves the committed
 * files equal this output and pass the upload policy themselves.
 */

export { ITEM_LIST_TEMPLATE_PATH } from "./attachment-policy.ts";

export const ITEM_LIST_COLUMNS: Record<Locale, readonly [string, string, string, string, string, string]> = {
  fa: ["محصول", "سایز", "ضخامت", "گرید / استاندارد", "مقدار", "واحد"],
  en: ["Product", "Size", "Thickness", "Grade / standard", "Quantity", "Unit"],
  ar: ["المنتج", "المقاس", "السماكة", "الدرجة / المعيار", "الكمية", "الوحدة"],
};
const SHEET_NAME: Record<Locale, string> = { fa: "لیست اقلام", en: "Item list", ar: "قائمة الأصناف" };
const WIDTHS = [32, 16, 14, 22, 14, 14];
const DATA_ROWS = 200;

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;

function sheetXml(locale: Locale): string {
  const rtl = locale !== "en";
  const cols = WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const header = ITEM_LIST_COLUMNS[locale].map((label, i) => `<c r="${String.fromCharCode(65 + i)}1" t="inlineStr" s="1"><is><t>${xml(label)}</t></is></c>`).join("");
  const units = RFQ_UOM_CODES.filter((u) => !LAUNCH_DEFERRED_UOMS.includes(u)).map((u) => RFQ_UOM_LABELS[locale][u]);
  return (
    HEAD +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView ${rtl ? 'rightToLeft="1" ' : ""}tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData><row r="1" ht="22" customHeight="1">${header}</row></sheetData>` +
    // errorStyle information: the list is a suggestion, any other unit can still be typed.
    `<dataValidations count="1"><dataValidation type="list" errorStyle="information" allowBlank="1" showErrorMessage="0" sqref="F2:F${DATA_ROWS + 1}"><formula1>"${xml(units.join(","))}"</formula1></dataValidation></dataValidations>` +
    `</worksheet>`
  );
}

function parts(locale: Locale): [string, string][] {
  return [
    [
      "[Content_Types].xml",
      HEAD +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    ],
    [
      "_rels/.rels",
      HEAD +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    ],
    [
      "xl/workbook.xml",
      HEAD +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<bookViews><workbookView/></bookViews>` +
        `<sheets><sheet name="${xml(SHEET_NAME[locale])}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      HEAD +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    ],
    [
      "xl/styles.xml",
      HEAD +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font></fonts>` +
        `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A44"/><bgColor indexed="64"/></patternFill></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", sheetXml(locale)],
  ];
}

// --- minimal deterministic zip (stored entries, fixed 1980-01-01 timestamp) ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: [string, Uint8Array][]): Uint8Array {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const n = enc.encode(name);
    const crc = crc32(data);
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true); // UTF-8 names
    header.setUint16(8, 0, true); // stored
    header.setUint16(10, 0, true);
    header.setUint16(12, 0x21, true); // 1980-01-01
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, n.length, true);
    local.push(new Uint8Array(header.buffer), n, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, n.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let at = 0;
  for (const c of all) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export function buildItemListTemplate(locale: Locale): Uint8Array {
  const enc = new TextEncoder();
  return zip(parts(locale).map(([name, text]) => [name, enc.encode(text)]));
}
