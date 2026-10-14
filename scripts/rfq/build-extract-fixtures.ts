/**
 * Renders the W13.3 PICTURE fixtures used for the model measurements (docs/RFQ_INSTANT_EXTRACT.md):
 *   node scripts/rfq/build-extract-fixtures.ts <out-dir>
 *
 * Not committed (binary files outside the approved asset directories make a release AMBIGUOUS); the
 * real model transcripts of these pictures are recorded in lib/rfq/extract-match.test.ts and
 * lib/rfq-worker/extract.test.ts. Typed fixtures are built in memory: lib/rfq/extract/test-fixtures.ts.
 *
 *   phone-photo.fa.jpg       a photo of a printed Persian table: tilted, grey paper, soft
 *   handwritten-photo.fa.jpg a handwriting-STYLE list (Nastaliq font, uneven lines, blue ink on ruled
 *                            paper). Synthetic: real handwriting reads worse.
 *   scanned-list.fa.pdf      a scanned page: the PDF holds only a JPEG picture of the table
 *   (+ the typed fixtures, written as files for trying them in a browser)
 *
 * Invented lists only. Needs macOS system fonts (Geeza Pro, Noto Nastaliq Urdu) through sharp's SVG renderer.
 */
import fs from "node:fs";
import path from "node:path";
import sharpModule from "sharp";
import { AR_CSV, faCp1256Csv, FREE_TEXT, scannedPdf, typedPdf, typedXlsx } from "../../lib/rfq/extract/test-fixtures.ts";

// sharp's types do not resolve under this tsconfig (see lib/articles/cover-raster.ts); the chain used here only.
interface SharpChain {
  png(): SharpChain;
  jpeg(o: { quality: number }): SharpChain;
  grayscale(): SharpChain;
  blur(sigma: number): SharpChain;
  modulate(o: { brightness: number }): SharpChain;
  rotate(angle: number, o: { background: string }): SharpChain;
  extend(o: { top: number; bottom: number; left: number; right: number; background: string }): SharpChain;
  resize(o: { width: number }): SharpChain;
  toBuffer(): Promise<Buffer>;
}
const sharp = sharpModule as unknown as (input: Buffer) => SharpChain;

const OUT = path.resolve(process.argv[2] ?? "w13-3-fixtures");
fs.mkdirSync(OUT, { recursive: true });
const write = (name: string, data: Uint8Array | string) => {
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(`${path.join(OUT, name)} ${fs.statSync(path.join(OUT, name)).size} B`);
};

// --- pictures ------------------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const TABLE = [
  ["ردیف", "شرح کالا", "سایز", "مقدار", "واحد"],
  ["۱", "میلگرد آجدار A3", "۱۶", "۲۰", "تن"],
  ["۲", "تیرآهن IPE", "۱۸۰", "۴۰", "شاخه"],
  ["۳", "نبشی", "۵۰×۵۰×۵", "۳۵۰۰", "کیلوگرم"],
  ["۴", "ورق سیاه ST37", "۱۰×۱۵۰۰×۶۰۰۰", "۵", "تن"],
  ["۵", "قوطی", "۴۰×۴۰×۲", "۲٫۵", "تن"],
];

function tableSvg(width: number, height: number, paper: string): string {
  // Columns right to left: ردیف | شرح کالا | سایز | مقدار | واحد
  const xs = [width - 60, width - 140, width - 520, width - 790, width - 950];
  const rowH = 70;
  const top = 200;
  const lines = TABLE.map((row, r) =>
    row.map((cell, c) => `<text x="${xs[c]}" y="${top + r * rowH}" font-family="Geeza Pro" font-size="${r === 0 ? 34 : 32}" font-weight="${r === 0 ? 700 : 400}" direction="rtl" fill="#1b1b1b">${esc(cell)}</text>`).join(""),
  ).join("");
  const rules = TABLE.map((_, r) => `<line x1="50" x2="${width - 40}" y1="${top + r * rowH + 22}" y2="${top + r * rowH + 22}" stroke="#444" stroke-width="2"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${paper}"/><text x="${width - 60}" y="110" font-family="Geeza Pro" font-size="40" font-weight="700" direction="rtl">لیست اقلام درخواستی</text>${rules}${lines}</svg>`;
}

async function phonePhoto(): Promise<Uint8Array> {
  const page = await sharp(Buffer.from(tableSvg(1100, 700, "#efece4"))).png().toBuffer();
  return new Uint8Array(
    await sharp(page)
      .rotate(-3.5, { background: "#7a756c" })
      .extend({ top: 60, bottom: 90, left: 70, right: 50, background: "#6f6a62" })
      .blur(0.8)
      .modulate({ brightness: 0.93 })
      .resize({ width: 1280 })
      .jpeg({ quality: 72 })
      .toBuffer(),
  );
}

async function scanPage(): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  const width = 1240;
  const height = 1754;
  const svg = tableSvg(width, height, "#ffffff");
  const jpeg = await sharp(Buffer.from(svg)).grayscale().jpeg({ quality: 70 }).toBuffer();
  return { jpeg: new Uint8Array(jpeg), width, height };
}

const HANDWRITTEN = ["لیست خرید", "میلگرد ۱۴ آجدار A3 - ۱۲ تن", "ناودانی UPN ۱۲ - ۳۰ شاخه", "لوله مانیسمان ۴ اینچ - ۲۰ شاخه", "نبشی ۸۰×۸۰×۸ - ۲ تن"];

async function handwrittenPhoto(): Promise<Uint8Array> {
  const width = 1000;
  const height = 900;
  const ruled = Array.from({ length: 12 }, (_, i) => `<line x1="0" x2="${width}" y1="${120 + i * 70}" y2="${118 + i * 70 + (i % 3)}" stroke="#9cc3e6" stroke-width="2"/>`).join("");
  const offsets = [[0, 0, -1.5], [22, 4, 1.2], [8, -3, -0.8], [30, 6, 1.8], [12, -2, -1]];
  const text = HANDWRITTEN.map((line, i) => {
    const [dx, dy, rot] = offsets[i];
    const x = width - 70 - dx;
    const y = 165 + i * 140 + dy;
    return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="Noto Nastaliq Urdu" font-size="${i === 0 ? 44 : 40}" direction="rtl" fill="#1d3a8a">${esc(line)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fbfaf4"/>${ruled}<line x1="${width - 40}" x2="${width - 40}" y1="0" y2="${height}" stroke="#e3a1a1" stroke-width="2"/>${text}</svg>`;
  const page = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(await sharp(page).rotate(2, { background: "#8d877c" }).blur(0.6).jpeg({ quality: 75 }).toBuffer());
}

write("typed-list.fa.xlsx", typedXlsx());
write("list.ar.csv", AR_CSV);
write("list.fa-1256.csv", faCp1256Csv());
write("free-text.fa.txt", FREE_TEXT);
write("typed-list.en.pdf", typedPdf());
const scan = await scanPage();
write("scanned-list.fa.pdf", scannedPdf(scan.jpeg, scan.width, scan.height));
write("phone-photo.fa.jpg", await phonePhoto());
write("handwritten-photo.fa.jpg", await handwrittenPhoto());
