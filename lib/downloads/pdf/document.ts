import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Font as FontkitFont } from "@pdf-lib/fontkit";
import type { Locale } from "../../../config/locales.ts";
import { drawLine, drawParagraph, wrapText, type PdfFontFace } from "./text.ts";
import { BRAND_MARK_COPPER_POINTS, BRAND_MARK_NAVY_POINTS, BRAND_MARK_VIEWBOX } from "./brand-mark.ts";

/**
 * W17.2 — the branded PDF frame shared by the spec sheets and the catalogs: A4, Estedad (OFL-1.1, the site's
 * own family per FONT_STRATEGY / docs/TYPOGRAPHY_ESTEDAD_IMPLEMENTATION.md; static instances from
 * lib/fonts/cover/, embedded as subsets), brand colours (styles/tokens.css), the vector brand mark
 * (components/layout/brand-mark.tsx), RTL page flow for fa/ar.
 *
 * Deterministic: no creation time from the clock (the caller passes the snapshot date), fixed font subset
 * names, so the same catalog data always gives the same bytes (the static build's W4 determinism).
 */

export const COLORS = {
  navy: rgb(0x0b / 255, 0x25 / 255, 0x45 / 255),
  copper: rgb(0xb0 / 255, 0x4a / 255, 0x2f / 255),
  cream: rgb(0xfb / 255, 0xf5 / 255, 0xeb / 255),
  accentOnNavy: rgb(0xe9 / 255, 0xa5 / 255, 0x8f / 255),
  white: rgb(1, 1, 1),
  text: rgb(0x10 / 255, 0x18 / 255, 0x28 / 255),
  muted: rgb(0x47 / 255, 0x54 / 255, 0x67 / 255),
  border: rgb(0xea / 255, 0xec / 255, 0xf0 / 255),
  zebra: rgb(0xf9 / 255, 0xfa / 255, 0xfb / 255),
} as const;

export const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const HEADER_H = 34;
const FOOTER_H = 30;

const FONT_DIR = path.resolve(import.meta.dirname, "../../fonts/cover");
const FONT_FILES = { regular: "Estedad-Regular.ttf", bold: "Estedad-Bold.ttf", extraBold: "Estedad-ExtraBold.ttf" } as const;
type Weight = keyof typeof FONT_FILES;
const fontBytes = new Map<string, Uint8Array>();
function readFont(file: string): Uint8Array {
  let bytes = fontBytes.get(file);
  if (!bytes) fontBytes.set(file, (bytes = fs.readFileSync(path.join(FONT_DIR, file))));
  return bytes;
}

export interface DocMeta {
  locale: Locale;
  title: string;
  subject: string;
  /** Content date (the snapshot's), never the clock. */
  date: Date;
  /** Running header text on every page after the cover. */
  runningTitle: string;
  /** Footer text, start side (the site and phone). */
  footer: string;
}

export class BrandDocument {
  readonly doc: PDFDocument;
  readonly fonts: Record<Weight, PdfFontFace>;
  readonly meta: DocMeta;
  readonly dir: "rtl" | "ltr";
  /** Pages that get the running header/footer and a page number (all but the cover). */
  private framed = new Set<PDFPage>();
  page!: PDFPage;
  /** Every string drawn, in order: the build scans it (no price, no price-source name) before publishing. */
  readonly texts: string[] = [];
  /** Baseline cursor: the top of the free space on the current page. */
  y = 0;

  private constructor(doc: PDFDocument, fonts: Record<Weight, PdfFontFace>, meta: DocMeta) {
    this.doc = doc;
    this.fonts = fonts;
    this.meta = meta;
    this.dir = meta.locale === "en" ? "ltr" : "rtl";
  }

  static async create(meta: DocMeta): Promise<BrandDocument> {
    const doc = await PDFDocument.create({ updateMetadata: false });
    doc.registerFontkit(fontkit);
    const fonts = {} as Record<Weight, PdfFontFace>;
    for (const [weight, file] of Object.entries(FONT_FILES) as [Weight, string][]) {
      // Fixed subset tag (pdf-lib would add a random suffix): deterministic bytes.
      const pdf = await doc.embedFont(readFont(file), { subset: true, customName: `AHANAS+${file.replace(/\.ttf$/, "")}` });
      fonts[weight] = { pdf, fk: (pdf as unknown as { embedder: { font: FontkitFont } }).embedder.font };
    }
    doc.setTitle(meta.title, { showInWindowTitleBar: true });
    doc.setSubject(meta.subject);
    doc.setAuthor("Ahan Asa (ahanassa.com)");
    doc.setCreator("ahanassa.com download center");
    doc.setProducer("ahanassa.com");
    doc.setLanguage(meta.locale === "fa" ? "fa-IR" : meta.locale);
    doc.setCreationDate(meta.date);
    doc.setModificationDate(meta.date);
    return new BrandDocument(doc, fonts, meta);
  }

  // --- geometry -----------------------------------------------------------------------------------------------
  get left() {
    return MARGIN;
  }
  get right() {
    return A4[0] - MARGIN;
  }
  get width() {
    return A4[0] - 2 * MARGIN;
  }
  get top() {
    return A4[1] - MARGIN - HEADER_H;
  }
  get bottom() {
    return MARGIN + FOOTER_H;
  }
  /** The x of the reading-start edge (right in RTL) and the alignment that goes with it. */
  get start() {
    return this.dir === "rtl" ? { x: this.right, align: "right" as const } : { x: this.left, align: "left" as const };
  }

  // --- pages --------------------------------------------------------------------------------------------------
  /** A bare page (no running header/footer): the cover. */
  addBarePage(): PDFPage {
    this.page = this.doc.addPage(A4);
    return this.page;
  }

  /** A content page with the running header/footer; the cursor moves to its top. */
  addPage(): PDFPage {
    this.page = this.doc.addPage(A4);
    this.framed.add(this.page);
    this.y = this.top;
    return this.page;
  }

  /** Inserts an empty framed page at `index` (the contents page, filled once the body's page numbers are known). */
  insertPage(index: number): PDFPage {
    const page = this.doc.insertPage(index, A4);
    this.framed.add(page);
    return page;
  }

  pageIndex(page: PDFPage = this.page): number {
    return this.doc.getPages().indexOf(page);
  }

  /** Makes sure `height` points fit below the cursor, starting a new page otherwise. Returns true on a new page. */
  ensure(height: number): boolean {
    if (this.y - height >= this.bottom) return false;
    this.addPage();
    return true;
  }

  // --- text ---------------------------------------------------------------------------------------------------
  line(text: string, o: { size: number; weight?: Weight; color?: RGB; x?: number; align?: "left" | "right" | "center"; y?: number; page?: PDFPage }) {
    const start = this.start;
    return this.drawText(o.page ?? this.page, text, o.x ?? start.x, o.y ?? this.y, { face: this.fonts[o.weight ?? "regular"], size: o.size, color: o.color ?? COLORS.text, dir: this.dir, align: o.align ?? start.align });
  }

  /** A wrapped paragraph at the cursor (breaking pages between lines); moves the cursor below it. */
  paragraph(text: string, o: { size: number; weight?: Weight; color?: RGB; lineHeight?: number; gapAfter?: number; width?: number }) {
    const lh = o.lineHeight ?? o.size * 1.75;
    const face = this.fonts[o.weight ?? "regular"];
    const width = o.width ?? this.width;
    for (const l of wrapText(face, text, o.size, width, this.dir)) {
      this.ensure(lh);
      this.y -= o.size;
      this.line(l, { size: o.size, weight: o.weight, color: o.color });
      this.y -= lh - o.size;
    }
    this.y -= o.gapAfter ?? 0;
  }

  /** A section heading with a copper rule on the start side. */
  heading(text: string, level: 1 | 2): void {
    const size = level === 1 ? 17 : 12.5;
    this.ensure(size * 3.2);
    this.y -= size + 4;
    this.line(text, { size, weight: level === 1 ? "extraBold" : "bold", color: COLORS.navy });
    if (level === 1) {
      const ruleX = this.dir === "rtl" ? this.right - 36 : this.left;
      this.page.drawRectangle({ x: ruleX, y: this.y - 9, width: 36, height: 2.5, color: COLORS.copper });
      this.y -= 22;
    } else this.y -= 8;
  }

  /** Label/value lines ("Standard: EN 10219-2"). */
  facts(rows: Array<[string, string]>, size = 9) {
    for (const [label, value] of rows) {
      this.ensure(size * 1.9);
      this.y -= size;
      this.line(`${label}: ${value}`, { size, color: COLORS.muted });
      this.y -= size * 0.85;
    }
  }

  /**
   * A table with a navy header row, repeated on every page it continues to. Columns are given in reading
   * order and laid out right-to-left in RTL. Cells are single-line (values are short sizes and numbers).
   */
  table(columns: Array<{ label: string; weight: number; align?: "start" | "center" }>, rows: string[][], o: { size?: number } = {}) {
    const size = o.size ?? 8;
    const rowH = size * 2.1;
    const total = columns.reduce((s, c) => s + c.weight, 0);
    const widths = columns.map((c) => (c.weight / total) * this.width);
    // Column left edges in reading order.
    const lefts: number[] = [];
    let acc = 0;
    for (const w of widths) {
      lefts.push(this.dir === "rtl" ? this.right - acc - w : this.left + acc);
      acc += w;
    }
    const headerLines = columns.map((c, i) => wrapText(this.fonts.bold, c.label, size - 0.5, widths[i] - 8, this.dir).slice(0, 2));
    const headerH = Math.max(...headerLines.map((l) => l.length)) * (size + 3) + 9;
    const cellX = (i: number, align: "start" | "center") =>
      align === "center" ? { x: lefts[i] + widths[i] / 2, align: "center" as const } : this.dir === "rtl" ? { x: lefts[i] + widths[i] - 5, align: "right" as const } : { x: lefts[i] + 5, align: "left" as const };
    const drawHeader = () => {
      this.page.drawRectangle({ x: this.left, y: this.y - headerH, width: this.width, height: headerH, color: COLORS.navy });
      headerLines.forEach((lines, i) => {
        const pos = cellX(i, columns[i].align ?? "center");
        lines.forEach((l, k) => this.line(l, { size: size - 0.5, weight: "bold", color: COLORS.white, x: pos.x, align: pos.align, y: this.y - 6 - (size - 0.5) - k * (size + 3) }));
      });
      this.y -= headerH;
    };
    this.ensure(headerH + rowH * Math.min(rows.length, 3));
    drawHeader();
    rows.forEach((row, r) => {
      if (this.ensure(rowH)) drawHeader();
      if (r % 2 === 1) this.page.drawRectangle({ x: this.left, y: this.y - rowH, width: this.width, height: rowH, color: COLORS.zebra });
      row.forEach((cell, i) => {
        const pos = cellX(i, columns[i].align ?? "center");
        this.line(cell, { size, x: pos.x, align: pos.align, y: this.y - rowH / 2 - size * 0.35, color: COLORS.text });
      });
      this.page.drawLine({ start: { x: this.left, y: this.y - rowH }, end: { x: this.right, y: this.y - rowH }, thickness: 0.5, color: COLORS.border });
      this.y -= rowH;
    });
  }

  // --- brand --------------------------------------------------------------------------------------------------
  /** The brand mark (vector) with its top-left at (x, yTop), `width` wide. */
  mark(page: PDFPage, x: number, yTop: number, width: number, colors: { body: RGB; diamond: RGB }) {
    const [vx, vy, vw] = BRAND_MARK_VIEWBOX;
    const scale = width / vw;
    const path = (points: string) =>
      `M${points
        .split(" ")
        .map((p) => p.split(",").map(Number))
        .map(([px, py]) => `${px - vx},${py - vy}`)
        .join(" L")} Z`;
    page.drawSvgPath(path(BRAND_MARK_NAVY_POINTS), { x, y: yTop, scale, color: colors.body, borderWidth: 0 });
    page.drawSvgPath(path(BRAND_MARK_COPPER_POINTS), { x, y: yTop, scale, color: colors.diamond, borderWidth: 0 });
  }

  /** Draws the running header/footer and "n / N" on every framed page. Call once, after all pages exist. */
  finish() {
    const pages = this.doc.getPages();
    const total = pages.length;
    pages.forEach((page, i) => {
      if (!this.framed.has(page)) return;
      const headerY = A4[1] - MARGIN;
      const markW = 20;
      const markX = this.dir === "rtl" ? this.right - markW : this.left;
      this.mark(page, markX, headerY + 2, markW, { body: COLORS.navy, diamond: COLORS.copper });
      const titleX = this.dir === "rtl" ? this.right - markW - 8 : this.left + markW + 8;
      this.drawText(page, this.meta.runningTitle, titleX, headerY - 12, { face: this.fonts.bold, size: 8.5, color: COLORS.navy, dir: this.dir, align: this.dir === "rtl" ? "right" : "left" });
      page.drawLine({ start: { x: this.left, y: headerY - 22 }, end: { x: this.right, y: headerY - 22 }, thickness: 0.75, color: COLORS.border });
      const footY = MARGIN - 4;
      page.drawLine({ start: { x: this.left, y: MARGIN + 12 }, end: { x: this.right, y: MARGIN + 12 }, thickness: 0.75, color: COLORS.border });
      const startX = this.dir === "rtl" ? this.right : this.left;
      const endX = this.dir === "rtl" ? this.left : this.right;
      this.drawText(page, this.meta.footer, startX, footY, { face: this.fonts.regular, size: 7.5, color: COLORS.muted, dir: this.dir, align: this.dir === "rtl" ? "right" : "left" });
      this.drawText(page, `${i + 1} / ${total}`, endX, footY, { face: this.fonts.bold, size: 7.5, color: COLORS.navy, dir: "ltr", align: this.dir === "rtl" ? "left" : "right" });
    });
  }

  private drawText(page: PDFPage, text: string, x: number, y: number, o: Parameters<typeof drawLine>[4]): number {
    this.texts.push(text);
    return drawLine(page, text, x, y, o);
  }

  async save(): Promise<Uint8Array> {
    this.finish();
    return this.doc.save({ useObjectStreams: true });
  }

  /** Paragraph helper for fixed boxes (cover, contact page): no page breaks. */
  box(page: PDFPage, text: string, o: { x: number; y: number; width: number; size: number; weight?: Weight; color: RGB; lineHeight?: number; align?: "left" | "right" | "center" }): number {
    this.texts.push(text);
    return drawParagraph(page, text, { x: o.x, y: o.y, width: o.width, lineHeight: o.lineHeight ?? o.size * 1.6 }, { face: this.fonts[o.weight ?? "regular"], size: o.size, color: o.color, dir: this.dir, align: o.align });
  }
}
