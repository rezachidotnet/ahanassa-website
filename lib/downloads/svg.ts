import { DRAWING_LAYERS, textWidth, type DrawingLayer, type SectionDrawing } from "./sections.ts";

/**
 * W17.2 — the SVG preview of a section drawing: the same primitives as the DXF (sections.ts), y flipped for
 * SVG, brand colours (outline Steel Navy, dimensions Forge Copper). Self-contained: no fonts, scripts or
 * external references; text uses the generic sans-serif family.
 */
const STROKE: Record<DrawingLayer, string> = { OUTLINE: "#0b2545", DIM: "#b04a2f", TEXT: "#0b2545" };

const n = (v: number) => String(Math.round(v * 100) / 100);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function writeSvg(drawing: SectionDrawing): string {
  const [[minX, minY], [maxX, maxY]] = drawing.extents;
  const pad = Math.max(maxX - minX, maxY - minY) * 0.04;
  const x0 = minX - pad;
  const w = maxX - minX + 2 * pad;
  const h = maxY - minY + 2 * pad;
  const Y = (y: number) => maxY + pad - y; // flipped: drawing y up -> SVG y down, top = 0
  const X = (x: number) => x - x0;
  const strokeW = Math.max(w, h) / 400;
  const parts: string[] = [];
  for (const layer of DRAWING_LAYERS) {
    const color = STROKE[layer];
    const items: string[] = [];
    for (const p of drawing.layers[layer]) {
      switch (p.kind) {
        case "line":
          items.push(`<line x1="${n(X(p.a[0]))}" y1="${n(Y(p.a[1]))}" x2="${n(X(p.b[0]))}" y2="${n(Y(p.b[1]))}"/>`);
          break;
        case "circle":
          items.push(`<circle cx="${n(X(p.c[0]))}" cy="${n(Y(p.c[1]))}" r="${n(p.r)}"/>`);
          break;
        case "arc": {
          const rad = (d: number) => (d * Math.PI) / 180;
          const sx = p.c[0] + p.r * Math.cos(rad(p.start));
          const sy = p.c[1] + p.r * Math.sin(rad(p.start));
          const ex = p.c[0] + p.r * Math.cos(rad(p.end));
          const ey = p.c[1] + p.r * Math.sin(rad(p.end));
          const sweep = (((p.end - p.start) % 360) + 360) % 360;
          // Counter-clockwise in drawing space = clockwise once y is flipped (sweep-flag 0).
          items.push(`<path d="M${n(X(sx))} ${n(Y(sy))}A${n(p.r)} ${n(p.r)} 0 ${sweep > 180 ? 1 : 0} 0 ${n(X(ex))} ${n(Y(ey))}"/>`);
          break;
        }
        case "solid":
          items.push(`<polygon points="${p.points.map((q) => `${n(X(q[0]))},${n(Y(q[1]))}`).join(" ")}" fill="${color}" stroke="none"/>`);
          break;
        case "text": {
          // Same anchor rule as the DXF: left = start at `at`; center = middle at `at`. Width fitted to the DXF estimate.
          const anchor = p.align === "center" ? "middle" : "start";
          items.push(`<text x="${n(X(p.at[0]))}" y="${n(Y(p.at[1]))}" font-size="${n(p.height * 1.25)}" text-anchor="${anchor}" textLength="${n(textWidth(p.text, p.height))}" lengthAdjust="spacingAndGlyphs">${esc(p.text)}</text>`);
          break;
        }
      }
    }
    const attrs = layer === "TEXT" ? `fill="${color}" stroke="none" font-family="Arial, Helvetica, sans-serif"` : `fill="none" stroke="${color}" stroke-width="${n(layer === "OUTLINE" ? strokeW * 1.6 : strokeW)}" stroke-linecap="round"`;
    parts.push(`<g id="${layer}" ${attrs}>${items.join("")}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" role="img" aria-label="${esc(drawing.title)}"><title>${esc(drawing.title)}</title><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>\n`;
}
