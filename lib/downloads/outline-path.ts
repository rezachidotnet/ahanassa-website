import type { Point, Primitive, SectionDrawing } from "./sections.ts";

/**
 * W20.8 — SVG path data for a drawing's line/arc/circle primitives, through a caller's transform (drawing mm,
 * y up → target units, y down). The /downloads row preview (outline only) and the per-size PDF sheet both draw
 * from it, so they show the same geometry as the DXF and the SVG file (lib/downloads/sections.ts).
 */
export interface PathTransform {
  x: (x: number) => number;
  y: (y: number) => number;
  /** Length scale (radii). */
  k: number;
  /** Decimal places kept. */
  digits: number;
}

export function primitivesPath(primitives: readonly Primitive[], t: PathTransform): string {
  const f = 10 ** t.digits;
  const n = (v: number) => {
    const r = Math.round(v * f) / f;
    return Object.is(r, -0) ? "0" : String(r);
  };
  const out: string[] = [];
  const rad = (d: number) => (d * Math.PI) / 180;
  // The pen position as written: a segment that starts where the last one ended needs no "M" (smaller paths).
  let pen = "";
  const move = (x: number, y: number) => {
    const at = `${n(t.x(x))} ${n(t.y(y))}`;
    if (at !== pen) out.push(`M${at}`);
  };
  for (const p of primitives) {
    if (p.kind === "line") {
      move(p.a[0], p.a[1]);
      pen = `${n(t.x(p.b[0]))} ${n(t.y(p.b[1]))}`;
      out.push(`L${pen}`);
    } else if (p.kind === "arc") {
      const s: Point = [p.c[0] + p.r * Math.cos(rad(p.start)), p.c[1] + p.r * Math.sin(rad(p.start))];
      const e: Point = [p.c[0] + p.r * Math.cos(rad(p.end)), p.c[1] + p.r * Math.sin(rad(p.end))];
      const sweep = (((p.end - p.start) % 360) + 360) % 360;
      const r = n(p.r * t.k);
      move(s[0], s[1]);
      pen = `${n(t.x(e[0]))} ${n(t.y(e[1]))}`;
      // Counter-clockwise in drawing space = clockwise once y is flipped (sweep-flag 0), as lib/downloads/svg.ts.
      out.push(`A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${pen}`);
    } else if (p.kind === "circle") {
      const r = n(p.r * t.k);
      const cy = n(t.y(p.c[1]));
      out.push(`M${n(t.x(p.c[0] + p.r))} ${cy}A${r} ${r} 0 1 0 ${n(t.x(p.c[0] - p.r))} ${cy}A${r} ${r} 0 1 0 ${n(t.x(p.c[0] + p.r))} ${cy}`);
      pen = "";
    } else if (p.kind === "solid") {
      out.push(`M${p.points.map((q) => `${n(t.x(q[0]))} ${n(t.y(q[1]))}`).join("L")}Z`);
      pen = "";
    }
  }
  return out.join("");
}

/** Bounding box of the OUTLINE layer only (the section itself), [min, max] in mm. */
export function outlineExtents(drawing: SectionDrawing): [Point, Point] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const p of drawing.layers.OUTLINE) {
    if (p.kind === "line") { add(...p.a); add(...p.b); }
    else if (p.kind === "arc" || p.kind === "circle") { add(p.c[0] - p.r, p.c[1] - p.r); add(p.c[0] + p.r, p.c[1] + p.r); }
    else if (p.kind === "solid") p.points.forEach((q) => add(...q));
  }
  return [[minX, minY], [maxX, maxY]];
}

/** The /downloads row preview: the outline in a `size`×`size` viewBox, centred, 6 % padding, 1 decimal. */
export function outlinePreview(drawing: SectionDrawing, size = 48): { viewBox: string; d: string } {
  const [[minX, minY], [maxX, maxY]] = outlineExtents(drawing);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const k = (size * 0.88) / span;
  const ox = (size - (maxX - minX) * k) / 2;
  const oy = (size - (maxY - minY) * k) / 2;
  const d = primitivesPath(drawing.layers.OUTLINE, { x: (x) => ox + (x - minX) * k, y: (y) => oy + (maxY - y) * k, k, digits: 1 });
  return { viewBox: `0 0 ${size} ${size}`, d };
}
