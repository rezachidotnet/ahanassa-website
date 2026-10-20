import { PDFDocument, StandardFonts } from "pdf-lib";
import { DIMENSION_KEY_ALIASES, fmt, textWidth, type SectionDrawing } from "../sections.ts";
import { primitivesPath } from "../outline-path.ts";
import { A4, COLORS } from "./document.ts";
import type { RenderedPdf } from "./render.ts";

/**
 * W20.8 — the per-size PDF drawing sheet of the Download Center: one A4 page per section size with the same
 * drawing as the DXF/SVG (lib/downloads/sections.ts, all three layers), its dimension table and nominal kg/m.
 * Language-neutral like the DXF (Latin symbols and digits, the PDF standard Helvetica, no embedded font), so
 * one file serves fa/en/ar. No price field reaches this module.
 *
 * Deterministic: creation/modification date = the catalog's content date, never the clock.
 */

export interface DrawingSheetInput {
  drawing: SectionDrawing;
  dimensions: Record<string, number> | null;
  kgPerM: number | null;
  /** Content date (the snapshot's). */
  date: Date;
}

/** Dimension rows in drawing order: catalog key (canonical; aliases accepted), symbol, name. */
const DIMENSION_ROWS: ReadonlyArray<readonly [key: string, symbol: string, name: string, unit: string]> = [
  ["outside_diameter_mm", "D", "Outside diameter", "mm"],
  ["wall_thickness_mm", "T", "Wall thickness", "mm"],
  ["height_mm", "h", "Height", "mm"],
  ["width_mm", "b", "Width", "mm"],
  ["web_thickness_mm", "tw", "Web thickness", "mm"],
  ["flange_thickness_mm", "tf", "Flange thickness", "mm"],
  ["thickness_mm", "t", "Thickness", "mm"],
  ["root_radius_mm", "r1", "Root radius", "mm"],
  ["toe_radius_mm", "r2", "Toe radius", "mm"],
  ["outer_radius_mm", "ro", "Outer corner radius", "mm"],
  ["inner_radius_mm", "ri", "Inner corner radius", "mm"],
  ["flange_slope_pct", "", "Flange slope", "%"],
];

function lookup(d: Record<string, number> | null, key: string): number | undefined {
  if (!d) return undefined;
  for (const k of [key, ...(DIMENSION_KEY_ALIASES[key] ?? [])]) if (typeof d[k] === "number" && Number.isFinite(d[k]) && d[k] > 0) return d[k];
  return undefined;
}

export function drawingSheetRows(input: Pick<DrawingSheetInput, "dimensions" | "kgPerM" | "drawing">): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = [];
  for (const [key, symbol, name, unit] of DIMENSION_ROWS) {
    const v = lookup(input.dimensions, key);
    if (v !== undefined) rows.push([symbol, name, `${fmt(v)} ${unit}`]);
  }
  rows.push(["A", "Cross-section area (drawn)", `${fmt(Math.round(input.drawing.areaMm2) / 100)} cm²`]);
  if (input.kgPerM) rows.push(["G", "Nominal mass", `${fmt(input.kgPerM)} kg/m`]);
  return rows;
}

const M = 48;

export async function renderDrawingSheet(input: DrawingSheetInput): Promise<RenderedPdf> {
  const { drawing } = input;
  const texts: string[] = [];
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(`${drawing.title} - section drawing`);
  doc.setSubject("Section drawing, dimensions in mm");
  doc.setAuthor("Ahan Asa");
  doc.setCreator("ahanassa.com download center");
  doc.setProducer("ahanassa.com");
  doc.setCreationDate(input.date);
  doc.setModificationDate(input.date);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  const [W, H] = A4;
  const text = (s: string, x: number, y: number, size: number, font = regular, color = COLORS.text) => {
    texts.push(s);
    page.drawText(s, { x, y, size, font, color });
  };

  // Header band.
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: COLORS.navy });
  text("AHAN ASA  |  SECTION DRAWING", M, H - M + 4, 9, bold, COLORS.copper);
  text(drawing.title, M, H - M - 24, 22, bold, COLORS.navy);

  // Drawing box: everything the DXF has, fitted and centred.
  const box = { x: M, top: H - M - 48, w: W - 2 * M, h: 430 };
  page.drawRectangle({ x: box.x, y: box.top - box.h, width: box.w, height: box.h, borderColor: COLORS.border, borderWidth: 0.75 });
  const [[minX, minY], [maxX, maxY]] = drawing.extents;
  const pad = 18;
  const k = Math.min((box.w - 2 * pad) / (maxX - minX || 1), (box.h - 2 * pad) / (maxY - minY || 1));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2;
  const oy = box.top - (box.h - (maxY - minY) * k) / 2; // PDF y of the drawing's maxY
  // drawSvgPath: origin at (ox, oy), SVG y down; drawing y up → (maxY - y) * k.
  const t = { x: (x: number) => (x - minX) * k, y: (y: number) => (maxY - y) * k, k, digits: 2 };
  const outline = primitivesPath(drawing.layers.OUTLINE, t);
  const dims = primitivesPath(drawing.layers.DIM.filter((p) => p.kind !== "solid"), t);
  const arrows = primitivesPath(drawing.layers.DIM.filter((p) => p.kind === "solid"), t);
  if (dims) page.drawSvgPath(dims, { x: ox, y: oy, borderColor: COLORS.copper, borderWidth: 0.6 });
  if (arrows) page.drawSvgPath(arrows, { x: ox, y: oy, color: COLORS.copper, borderWidth: 0 });
  if (outline) page.drawSvgPath(outline, { x: ox, y: oy, borderColor: COLORS.navy, borderWidth: 1.4 });
  for (const p of drawing.layers.TEXT) {
    if (p.kind !== "text") continue;
    // Same anchors as the DXF/SVG; the font size is fitted to the DXF's estimated width.
    const target = textWidth(p.text, p.height) * k;
    const size = Math.max(4, Math.min(p.height * 1.25 * k, target / Math.max(regular.widthOfTextAtSize(p.text, 1), 0.01)));
    const w = regular.widthOfTextAtSize(p.text, size);
    const x = ox + (p.at[0] - minX) * k - (p.align === "center" ? w / 2 : 0);
    text(p.text, x, oy - (maxY - p.at[1]) * k, size, regular, COLORS.navy);
  }

  // Dimension table.
  let y = box.top - box.h - 34;
  text("Dimensions", M, y, 12, bold, COLORS.navy);
  y -= 10;
  const col = [M, M + 50, W - M - 120];
  const rowH = 18;
  for (const [i, [symbol, name, value]] of drawingSheetRows(input).entries()) {
    // Each row owns the band [y - rowH, y]; the baseline sits inside it, so no band covers another row's text.
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: COLORS.zebra });
    const baseline = y - 12.5;
    if (symbol) text(symbol, col[0] + 6, baseline, 10, bold, COLORS.navy);
    text(name, col[1], baseline, 10);
    text(value, col[2], baseline, 10, bold);
    y -= rowH;
  }

  // Footer.
  page.drawLine({ start: { x: M, y: M + 14 }, end: { x: W - M, y: M + 14 }, thickness: 0.5, color: COLORS.border });
  text("Nominal dimensions from the Ahan Asa catalog. Dimensions in mm.", M, M, 8, regular, COLORS.muted);
  text("www.ahanassa.com", W - M - bold.widthOfTextAtSize("www.ahanassa.com", 8), M, 8, bold, COLORS.navy);

  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, texts, pages: 1 };
}
