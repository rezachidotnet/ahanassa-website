import { beginText, endText, PDFHexString, setFillingRgbColor, setFontAndSize, setTextMatrix, showText, type PDFFont, type PDFName, type PDFPage, type RGB } from "pdf-lib";
import type { Font as FontkitFont, Glyph, GlyphPosition, GlyphRun } from "@pdf-lib/fontkit";

/**
 * W17.2 — shaped, bidirectional text for the build-time PDFs (spec sheets, catalogs).
 *
 * pdf-lib's own `drawText` shapes Persian/Arabic through fontkit but drops each glyph's GPOS offset, so
 * Estedad's mark glyphs (the dots of ن, ب, پ…) are drawn at the pen position, or not at all. This module
 * draws every glyph at its own position (one text matrix per glyph), with the glyph registered in pdf-lib's
 * font subset exactly as pdf-lib's `encodeText` would — so the embedded font stays a subset (small PDFs)
 * and the ToUnicode map stays correct.
 *
 * Bidi is the small subset these documents need, not the full UBA: a paragraph has a base direction (fa/ar
 * RTL, en LTR); its text is split into strong-RTL (Arabic script), strong-LTR (Latin) and number runs;
 * a neutral (space, punctuation) between two runs of the same direction joins them, any other neutral takes
 * the base direction; a number keeps its separators («031-35134», «0.4×1000», «62–64٪»). In an RTL
 * paragraph the run order is reversed; fontkit shapes and orders each run (RTL runs reversed and mirrored).
 */

export interface PdfFontFace {
  pdf: PDFFont;
  fk: FontkitFont;
}

type Dir = "rtl" | "ltr";
type Kind = "R" | "L" | "EN" | "N";

const RTL_CHAR = /[֐-׿؀-ٟ٭-ۯۺ-ۿݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿‌‏]/;
const DIGIT = /[0-9٠-٩۰-۹]/;
const LTR_CHAR = /[A-Za-zÀ-ɏ²³µØø‎]/;
/** Characters that stay inside a number run when they sit between digits (or follow one, for the percent signs). */
const NUMBER_INFIX = /[.,:/×\-–+٫٬]/;
const NUMBER_SUFFIX = /[%٪]/;

function kindOf(ch: string): Kind {
  if (DIGIT.test(ch)) return "EN";
  if (RTL_CHAR.test(ch)) return "R";
  if (LTR_CHAR.test(ch)) return "L";
  return "N";
}

export interface BidiRun {
  text: string;
  dir: Dir;
}

/** Splits logical text into directional runs, in VISUAL order (left to right) for the given base direction. */
export function bidiRuns(text: string, base: Dir): BidiRun[] {
  const chars = [...text];
  const kinds = chars.map(kindOf);
  // Number separators and suffixes join the number they belong to.
  for (let i = 0; i < chars.length; i++) {
    if (kinds[i] !== "N") continue;
    if (NUMBER_INFIX.test(chars[i]) && kinds[i - 1] === "EN" && kinds[i + 1] === "EN") kinds[i] = "EN";
    else if (NUMBER_SUFFIX.test(chars[i]) && kinds[i - 1] === "EN") kinds[i] = "EN";
  }
  // Resolve each character to a direction: numbers and Latin are LTR, Arabic script RTL, neutrals by context.
  const strong = kinds.map((k): Dir | null => (k === "R" ? "rtl" : k === "L" || k === "EN" ? "ltr" : null));
  resolveBracketPairs(chars, kinds, strong, base);
  const dirs: Dir[] = new Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    if (strong[i]) {
      dirs[i] = strong[i] as Dir;
      continue;
    }
    let j = i;
    while (j < chars.length && !strong[j]) j++;
    const before = i > 0 ? dirs[i - 1] : null;
    const after = j < chars.length ? strong[j] : null;
    const d: Dir = before && after && before === after ? before : base;
    for (let k = i; k < j; k++) dirs[k] = d;
    i = j - 1;
  }
  const logical: BidiRun[] = [];
  for (let i = 0; i < chars.length; i++) {
    const last = logical[logical.length - 1];
    if (last && last.dir === dirs[i]) last.text += chars[i];
    else logical.push({ text: chars[i], dir: dirs[i] });
  }
  return base === "rtl" ? logical.reverse() : logical;
}

const OPENING: Record<string, string> = { "(": ")", "[": "]", "{": "}", "«": "»" };
const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "«": "»", "»": "«", "<": ">", ">": "<", "≤": "≥", "≥": "≤" };

/**
 * UBA rule N0, simplified: both brackets of a pair take one direction — the base direction when the pair
 * holds base-direction text; the opposite direction when it holds only opposite text AND the text before the
 * opening bracket is opposite too («Aj340 (A2)» in a Persian line stays "(A2)"); otherwise they stay neutral.
 * Numbers count as RTL here, as in the UBA.
 */
function resolveBracketPairs(chars: string[], kinds: Kind[], strong: Array<Dir | null>, base: Dir) {
  // UBA W7: a number after Latin text (searching back to the paragraph start) is Latin; otherwise it counts as RTL.
  const enAfterLatin = (i: number) => {
    for (let k = i - 1; k >= 0; k--) if (kinds[k] === "L" || kinds[k] === "R") return kinds[k] === "L";
    return base === "ltr";
  };
  const n0 = (i: number): Dir | null => (kinds[i] === "R" ? "rtl" : kinds[i] === "L" ? "ltr" : kinds[i] === "EN" ? (enAfterLatin(i) ? "ltr" : "rtl") : null);
  const stack: number[] = [];
  const pairs: Array<[number, number]> = [];
  chars.forEach((ch, i) => {
    if (OPENING[ch]) stack.push(i);
    else {
      const open = [...stack].reverse().find((j) => OPENING[chars[j]] === ch);
      if (open !== undefined) {
        stack.length = stack.lastIndexOf(open);
        pairs.push([open, i]);
      }
    }
  });
  for (const [open, close] of pairs.sort((a, b) => a[0] - b[0])) {
    const inside = new Set<Dir>();
    for (let k = open + 1; k < close; k++) {
      const d = n0(k);
      if (d) inside.add(d);
    }
    let dir: Dir | null = null;
    if (inside.has(base)) dir = base;
    else if (inside.size) {
      const opposite: Dir = base === "rtl" ? "ltr" : "rtl";
      let before: Dir = base;
      for (let k = open - 1; k >= 0; k--) {
        const d = kinds[k] === "N" ? strong[k] : n0(k);
        if (d) {
          before = d;
          break;
        }
      }
      dir = before === opposite ? opposite : base;
    }
    if (dir) strong[open] = strong[close] = dir;
  }
}

// fontkit's runtime `layout` also takes script, language and direction; its typings declare only the first two.
type FullLayout = (text: string, features: undefined, script: string, language: undefined, direction: Dir) => GlyphRun;

interface PlacedGlyph {
  glyph: Glyph;
  x: number;
  y: number;
}

export interface ShapedLine {
  glyphs: PlacedGlyph[];
  /** Advance width in points. */
  width: number;
}

/** Shapes one line (no wrapping) into positioned glyphs, origin at the left end of the baseline. */
export function shapeLine(face: PdfFontFace, text: string, size: number, base: Dir): ShapedLine {
  const scale = size / face.fk.unitsPerEm;
  const out: PlacedGlyph[] = [];
  let pen = 0;
  for (const run of bidiRuns(text, base)) {
    // fontkit reverses an RTL run but does not mirror (Bidi_Mirrored): swap the paired glyphs first.
    const runText = run.dir === "rtl" ? [...run.text].map((ch) => MIRROR[ch] ?? ch).join("") : run.text;
    const layout = (face.fk as unknown as { layout: FullLayout }).layout(runText, undefined, run.dir === "rtl" ? "arab" : "latn", undefined, run.dir);
    layout.glyphs.forEach((glyph: Glyph, i: number) => {
      const p: GlyphPosition = layout.positions[i];
      out.push({ glyph, x: pen + p.xOffset * scale, y: p.yOffset * scale });
      pen += p.xAdvance * scale;
    });
  }
  return { glyphs: out, width: pen };
}

export function textWidth(face: PdfFontFace, text: string, size: number, base: Dir): number {
  return shapeLine(face, text, size, base).width;
}

/** Greedy word wrap in logical order; a word longer than the width gets a line of its own. */
export function wrapText(face: PdfFontFace, text: string, size: number, maxWidth: number, base: Dir): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(face, candidate, size, base) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
  }
  return lines;
}

// pdf-lib keeps the glyph subset on the font's (private) embedder; these are the fields its own encodeText uses.
interface SubsetEmbedder {
  subset: { includeGlyph(glyph: Glyph): number };
  glyphs: Glyph[];
  glyphIdMap: Map<number, number>;
  glyphCache: { invalidate(): void };
}

function subsetGlyphHex(font: PDFFont, glyph: Glyph): string {
  const embedder = (font as unknown as { embedder: SubsetEmbedder }).embedder;
  if (!embedder?.subset) throw new Error("PDF fonts must be embedded with { subset: true }");
  const id = embedder.subset.includeGlyph(glyph);
  embedder.glyphs[id - 1] = glyph;
  embedder.glyphIdMap.set(glyph.id, id);
  embedder.glyphCache.invalidate();
  return id.toString(16).padStart(4, "0");
}

const fontKeys = new WeakMap<PDFPage, Map<PDFFont, PDFName>>();
function fontKey(page: PDFPage, font: PDFFont): PDFName {
  let keys = fontKeys.get(page);
  if (!keys) fontKeys.set(page, (keys = new Map()));
  let key = keys.get(font);
  if (!key) keys.set(font, (key = page.node.newFontDictionary(font.name, font.ref)));
  return key;
}

export interface DrawTextOptions {
  face: PdfFontFace;
  size: number;
  color: RGB;
  dir: Dir;
  /** Where `x` is: the line's left edge, right edge or centre. */
  align?: "left" | "right" | "center";
}

/** Draws one line at baseline `y`. Returns the drawn width. */
export function drawLine(page: PDFPage, text: string, x: number, y: number, o: DrawTextOptions): number {
  if (!text) return 0;
  const line = shapeLine(o.face, text, o.size, o.dir);
  const left = o.align === "right" ? x - line.width : o.align === "center" ? x - line.width / 2 : x;
  const ops = [beginText(), setFillingRgbColor(o.color.red, o.color.green, o.color.blue), setFontAndSize(fontKey(page, o.face.pdf), o.size)];
  for (const g of line.glyphs) {
    ops.push(setTextMatrix(1, 0, 0, 1, round(left + g.x), round(y + g.y)), showText(PDFHexString.of(subsetGlyphHex(o.face.pdf, g.glyph))));
  }
  ops.push(endText());
  page.pushOperators(...ops);
  return line.width;
}

/** Draws wrapped text from the top line's baseline `y` downwards; returns the baseline after the last line. */
export function drawParagraph(page: PDFPage, text: string, box: { x: number; y: number; width: number; lineHeight: number }, o: DrawTextOptions): number {
  let y = box.y;
  const anchor = o.dir === "rtl" ? box.x + box.width : box.x;
  for (const line of wrapText(o.face, text, o.size, box.width, o.dir)) {
    drawLine(page, line, o.align === "center" ? box.x + box.width / 2 : anchor, y, { ...o, align: o.align ?? (o.dir === "rtl" ? "right" : "left") });
    y -= box.lineHeight;
  }
  return y;
}

const round = (n: number) => Math.round(n * 100) / 100;
