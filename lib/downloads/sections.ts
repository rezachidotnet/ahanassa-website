/**
 * W17.2 — section drawings from catalog dimensions (Download Center).
 *
 * One drawing per section size whose COMPLETE cross-section is in the catalog's `dimensions_json`. Nothing is
 * assumed: a rolled section's root/toe radii and a hollow section's corner radius change the shape, so a size
 * without them is skipped (and logged by the build), never drawn with sharp corners. Tapered-flange sections
 * (IPN/INP, UPN) are always skipped: the catalog has no flange-slope geometry.
 *
 * Geometry is in millimetres, y up, the section's bounding box at the origin. `buildSectionDrawing` returns
 * layered primitives (OUTLINE / DIM / TEXT) that the DXF and SVG writers render as they are, so both files
 * always show the same drawing.
 */

export type Point = readonly [number, number];
export type Primitive =
  | { kind: "line"; a: Point; b: Point }
  | { kind: "arc"; c: Point; r: number; /** degrees, counter-clockwise */ start: number; end: number }
  | { kind: "circle"; c: Point; r: number }
  | { kind: "solid"; points: readonly [Point, Point, Point] }
  | { kind: "text"; at: Point; height: number; text: string; align: "left" | "center" };

export type DrawingLayer = "OUTLINE" | "DIM" | "TEXT";
export const DRAWING_LAYERS: readonly DrawingLayer[] = ["OUTLINE", "DIM", "TEXT"];

export interface SectionInput {
  formCode: string | null;
  /** Odoo's commercial size, e.g. "114.3×6.02 SCH40" — the drawing's title. */
  commercialSize: string | null;
  dimensions: Record<string, number> | null;
  /** Standard as printed, e.g. "ASME B36.10M". */
  standard: string | null;
}

export interface SectionDrawing {
  /** File base name, e.g. "pipe-114.3x6.02" → pipe-114.3x6.02.dxf / .svg. */
  slug: string;
  title: string;
  layers: Record<DrawingLayer, Primitive[]>;
  /** Extents of everything drawn, [min, max]. */
  extents: [Point, Point];
}

export type SectionPlan = { status: "drawn"; drawing: SectionDrawing } | { status: "skipped"; slug: string; formCode: string; reason: string };

type ShapeKind = "angle" | "hollow" | "tube" | "i" | "u" | "tapered";
interface ShapeSpec {
  prefix: string;
  label: string;
  shape: ShapeKind;
  /** Canonical dimension keys the shape needs; each may also be given under one of its aliases. */
  required: readonly string[];
}

/** Accepted key aliases for the keys Odoo does not send yet (canonical name first). */
export const DIMENSION_KEY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  web_thickness_mm: ["tw_mm"],
  flange_thickness_mm: ["tf_mm"],
  root_radius_mm: ["r_mm", "r1_mm"],
  toe_radius_mm: ["r2_mm"],
  outer_radius_mm: ["ro_mm"],
};

const I_KEYS = ["height_mm", "width_mm", "web_thickness_mm", "flange_thickness_mm", "root_radius_mm"] as const;
/** Section forms (Odoo `form_code`) that have a cross-section drawing. Every other form (rebar, sheet, coil…) is not a section. */
export const SECTION_SHAPES: Readonly<Record<string, ShapeSpec>> = {
  EQUAL_ANGLE: { prefix: "angle", label: "EQUAL ANGLE", shape: "angle", required: ["width_mm", "height_mm", "thickness_mm", "root_radius_mm", "toe_radius_mm"] },
  UNEQUAL_ANGLE: { prefix: "angle", label: "UNEQUAL ANGLE", shape: "angle", required: ["width_mm", "height_mm", "thickness_mm", "root_radius_mm", "toe_radius_mm"] },
  SHS_FORM: { prefix: "shs", label: "SHS", shape: "hollow", required: ["width_mm", "height_mm", "thickness_mm", "outer_radius_mm"] },
  RHS_FORM: { prefix: "rhs", label: "RHS", shape: "hollow", required: ["width_mm", "height_mm", "thickness_mm", "outer_radius_mm"] },
  SEAMLESS_PIPE_FORM: { prefix: "pipe", label: "SEAMLESS PIPE", shape: "tube", required: ["outside_diameter_mm", "wall_thickness_mm"] },
  IPE: { prefix: "ipe", label: "IPE", shape: "i", required: I_KEYS },
  HEA: { prefix: "hea", label: "HEA", shape: "i", required: I_KEYS },
  HEB: { prefix: "heb", label: "HEB", shape: "i", required: I_KEYS },
  UPE: { prefix: "upe", label: "UPE", shape: "u", required: I_KEYS },
  INP: { prefix: "ipn", label: "IPN", shape: "tapered", required: [] },
  UPN: { prefix: "upn", label: "UPN", shape: "tapered", required: [] },
};

export function isSectionForm(formCode: string | null): boolean {
  return formCode !== null && formCode in SECTION_SHAPES;
}

function dim(d: Record<string, number> | null, key: string): number | undefined {
  if (!d) return undefined;
  for (const k of [key, ...(DIMENSION_KEY_ALIASES[key] ?? [])]) {
    const v = d[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return undefined;
}

/** "114.3" not "114.30"; never exponent notation. */
export function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** File slug from the dimensions themselves (never from free text): e.g. shs-100x100x4, ipe-200, pipe-114.3x6.02. */
function sizeSlug(spec: ShapeSpec, d: Record<string, number> | null): string {
  const v = (k: string) => {
    const n = dim(d, k);
    return n === undefined ? "na" : fmt(n);
  };
  switch (spec.shape) {
    case "angle":
      return `${spec.prefix}-${v("height_mm")}x${v("width_mm")}x${v("thickness_mm")}`;
    case "hollow":
      return `${spec.prefix}-${v("height_mm")}x${v("width_mm")}x${v("thickness_mm")}`;
    case "tube":
      return `${spec.prefix}-${v("outside_diameter_mm")}x${v("wall_thickness_mm")}`;
    default:
      return `${spec.prefix}-${v("height_mm")}`;
  }
}

/** The drawing of one catalog size, or why it has none. `null` = not a section form at all. */
export function planSectionDrawing(input: SectionInput): SectionPlan | null {
  const spec = input.formCode ? SECTION_SHAPES[input.formCode] : undefined;
  if (!spec || !input.formCode) return null;
  const slug = sizeSlug(spec, input.dimensions);
  if (spec.shape === "tapered") return { status: "skipped", slug, formCode: input.formCode, reason: "tapered-flange section: flange slope and radii are not in the catalog" };
  const missing = spec.required.filter((k) => dim(input.dimensions, k) === undefined);
  if (missing.length) return { status: "skipped", slug, formCode: input.formCode, reason: `missing ${missing.join(", ")}` };
  const v = (k: string) => dim(input.dimensions, k) as number;
  const g = new Builder();
  switch (spec.shape) {
    case "tube":
      tube(g, v("outside_diameter_mm"), v("wall_thickness_mm"));
      break;
    case "hollow":
      hollow(g, v("width_mm"), v("height_mm"), v("thickness_mm"), v("outer_radius_mm"));
      break;
    case "angle":
      angle(g, v("width_mm"), v("height_mm"), v("thickness_mm"), v("root_radius_mm"), v("toe_radius_mm"));
      break;
    case "i":
    case "u":
      flanged(g, spec.shape, v("height_mm"), v("width_mm"), v("web_thickness_mm"), v("flange_thickness_mm"), v("root_radius_mm"));
      break;
  }
  const size = (input.commercialSize ?? slug.slice(spec.prefix.length + 1)).replace(/×/g, "x").replace(/[^\x20-\x7E]/g, "").trim();
  const title = size.toUpperCase().startsWith(spec.label) ? size : `${spec.label} ${size}`;
  g.titleBlock([title, ...(input.standard ? [`Standard: ${input.standard.replace(/[^\x20-\x7E]/g, "")}`] : []), "Dimensions in mm. Nominal dimensions from the Ahan Asa catalog.", "www.ahanassa.com"]);
  return { status: "drawn", drawing: { slug, title, layers: g.layers, extents: g.extents() } };
}

// --- geometry ------------------------------------------------------------------------------------------------

class Builder {
  layers: Record<DrawingLayer, Primitive[]> = { OUTLINE: [], DIM: [], TEXT: [] };
  /** Outline extents (the section), for scaling dimension text. */
  private size = 0;
  private minY = 0;

  outline(p: Primitive) {
    this.layers.OUTLINE.push(p);
  }
  setSize(w: number, h: number) {
    this.size = Math.max(w, h);
  }
  /** Text height and arrow size scale with the section, so every drawing reads the same at "zoom extents". */
  get th() {
    return Math.max(1.8, Math.round(this.size * 0.045 * 10) / 10);
  }

  polyline(points: Point[], closed = true) {
    for (let i = 0; i < points.length - (closed ? 0 : 1); i++) this.outline({ kind: "line", a: points[i], b: points[(i + 1) % points.length] });
  }

  /** Linear dimension between a and b (horizontal or vertical), its line `offset` away (signed: -y below / -x left). */
  linear(a: Point, b: Point, offset: number, text: string) {
    const horizontal = a[1] === b[1];
    const th = this.th;
    const arrow = th * 0.9;
    const L = this.layers.DIM;
    if (horizontal) {
      const y = a[1] + offset;
      const s = Math.sign(offset) || -1;
      L.push({ kind: "line", a: [a[0], a[1] + s * th * 0.3], b: [a[0], y + s * th * 0.5] });
      L.push({ kind: "line", a: [b[0], b[1] + s * th * 0.3], b: [b[0], y + s * th * 0.5] });
      L.push({ kind: "line", a: [a[0], y], b: [b[0], y] });
      L.push({ kind: "solid", points: [[a[0], y], [a[0] + arrow, y + arrow / 3], [a[0] + arrow, y - arrow / 3]] });
      L.push({ kind: "solid", points: [[b[0], y], [b[0] - arrow, y + arrow / 3], [b[0] - arrow, y - arrow / 3]] });
      this.layers.TEXT.push({ kind: "text", at: [(a[0] + b[0]) / 2, y + th * 0.4], height: th, text, align: "center" });
      this.minY = Math.min(this.minY, y - th);
    } else {
      const x = a[0] + offset;
      const s = Math.sign(offset) || -1;
      L.push({ kind: "line", a: [a[0] + s * th * 0.3, a[1]], b: [x + s * th * 0.5, a[1]] });
      L.push({ kind: "line", a: [b[0] + s * th * 0.3, b[1]], b: [x + s * th * 0.5, b[1]] });
      L.push({ kind: "line", a: [x, a[1]], b: [x, b[1]] });
      L.push({ kind: "solid", points: [[x, a[1]], [x - arrow / 3, a[1] + arrow], [x + arrow / 3, a[1] + arrow]] });
      L.push({ kind: "solid", points: [[x, b[1]], [x - arrow / 3, b[1] - arrow], [x + arrow / 3, b[1] - arrow]] });
      // Vertical dimension text stays horizontal (readable without rotating), beside the dimension line.
      const tx = s < 0 ? x - th * 0.5 - textWidth(text, th) : x + th * 0.5;
      this.layers.TEXT.push({ kind: "text", at: [tx, (a[1] + b[1]) / 2 - th / 2], height: th, text, align: "left" });
    }
  }

  /** A leader from a point on the outline to a label. */
  leader(from: Point, to: Point, text: string) {
    const th = this.th;
    this.layers.DIM.push({ kind: "line", a: from, b: to });
    const dx = to[0] >= from[0] ? 1 : -1;
    const end: Point = [to[0] + dx * th * 0.6, to[1]];
    this.layers.DIM.push({ kind: "line", a: to, b: end });
    const arrow = th * 0.9;
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const ux = (to[0] - from[0]) / len;
    const uy = (to[1] - from[1]) / len;
    this.layers.DIM.push({ kind: "solid", points: [from, [from[0] + ux * arrow - uy * arrow / 3, from[1] + uy * arrow + ux * arrow / 3], [from[0] + ux * arrow + uy * arrow / 3, from[1] + uy * arrow - ux * arrow / 3]] });
    const x = dx > 0 ? end[0] + th * 0.3 : end[0] - th * 0.3 - textWidth(text, th);
    this.layers.TEXT.push({ kind: "text", at: [x, to[1] - th / 2], height: th, text, align: "left" });
  }

  titleBlock(lines: string[]) {
    const th = this.th;
    let y = this.minY - th * 2.2;
    lines.forEach((line, i) => {
      const h = i === 0 ? th * 1.25 : th * 0.8;
      this.layers.TEXT.push({ kind: "text", at: [0, y], height: h, text: line, align: "left" });
      y -= h * 1.7;
    });
  }

  extents(): [Point, Point] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const add = (x: number, y: number) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    };
    for (const layer of DRAWING_LAYERS)
      for (const p of this.layers[layer]) {
        if (p.kind === "line") { add(...p.a); add(...p.b); }
        else if (p.kind === "circle" || p.kind === "arc") { add(p.c[0] - p.r, p.c[1] - p.r); add(p.c[0] + p.r, p.c[1] + p.r); }
        else if (p.kind === "solid") p.points.forEach((q) => add(...q));
        else { const w = textWidth(p.text, p.height); const x0 = p.align === "center" ? p.at[0] - w / 2 : p.at[0]; add(x0, p.at[1]); add(x0 + w, p.at[1] + p.height); }
      }
    return [[round(minX), round(minY)], [round(maxX), round(maxY)]];
  }
}

/** Approximate width of a TXT-font string (≈ 0.75 × height per character): only used to place labels. */
export function textWidth(text: string, height: number): number {
  return text.length * height * 0.75;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** A rounded rectangle (corner radius r ≥ 0) as lines + arcs, counter-clockwise from the bottom edge. */
function roundedRect(g: Builder, x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0) return g.polyline([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  g.outline({ kind: "line", a: [x + r, y], b: [x + w - r, y] });
  g.outline({ kind: "arc", c: [x + w - r, y + r], r, start: 270, end: 360 });
  g.outline({ kind: "line", a: [x + w, y + r], b: [x + w, y + h - r] });
  g.outline({ kind: "arc", c: [x + w - r, y + h - r], r, start: 0, end: 90 });
  g.outline({ kind: "line", a: [x + w - r, y + h], b: [x + r, y + h] });
  g.outline({ kind: "arc", c: [x + r, y + h - r], r, start: 90, end: 180 });
  g.outline({ kind: "line", a: [x, y + h - r], b: [x, y + r] });
  g.outline({ kind: "arc", c: [x + r, y + r], r, start: 180, end: 270 });
}

function tube(g: Builder, od: number, t: number) {
  const R = od / 2;
  g.setSize(od, od);
  g.outline({ kind: "circle", c: [R, R], r: R });
  g.outline({ kind: "circle", c: [R, R], r: R - t });
  g.linear([0, R], [od, R], -(R + g.th * 2.5), `OD ${fmt(od)}`);
  const a = Math.PI / 4;
  g.leader([R + R * Math.cos(a), R + R * Math.sin(a)], [od + g.th * 2, od + g.th * 0.5], `t ${fmt(t)}`);
}

function hollow(g: Builder, w: number, h: number, t: number, ro: number) {
  g.setSize(w, h);
  roundedRect(g, 0, 0, w, h, ro);
  roundedRect(g, t, t, w - 2 * t, h - 2 * t, Math.max(ro - t, 0));
  g.linear([0, 0], [w, 0], -g.th * 2.5, `B ${fmt(w)}`);
  g.linear([0, 0], [0, h], -g.th * 2.5, `H ${fmt(h)}`);
  g.leader([w, h / 2], [w + g.th * 2.5, h / 2 + g.th * 2], `t ${fmt(t)}`);
  g.leader([w - ro * (1 - Math.SQRT1_2), h - ro * (1 - Math.SQRT1_2)], [w + g.th * 2.5, h + g.th * 1.5], `ro ${fmt(ro)}`);
}

function angle(g: Builder, b: number, h: number, t: number, r1: number, r2: number) {
  g.setSize(b, h);
  // Outer corner at the origin; legs along +x (width b) and +y (height h); root fillet r1, toe fillets r2.
  g.outline({ kind: "line", a: [0, 0], b: [b, 0] });
  g.outline({ kind: "line", a: [b, 0], b: [b, t - r2] });
  g.outline({ kind: "arc", c: [b - r2, t - r2], r: r2, start: 0, end: 90 });
  g.outline({ kind: "line", a: [b - r2, t], b: [t + r1, t] });
  g.outline({ kind: "arc", c: [t + r1, t + r1], r: r1, start: 180, end: 270 });
  g.outline({ kind: "line", a: [t, t + r1], b: [t, h - r2] });
  g.outline({ kind: "arc", c: [t - r2, h - r2], r: r2, start: 0, end: 90 });
  g.outline({ kind: "line", a: [t - r2, h], b: [0, h] });
  g.outline({ kind: "line", a: [0, h], b: [0, 0] });
  g.linear([0, 0], [b, 0], -g.th * 2.5, `B ${fmt(b)}`);
  g.linear([0, 0], [0, h], -g.th * 2.5, `H ${fmt(h)}`);
  g.leader([b, t / 2], [b + g.th * 2, t / 2 + g.th * 2], `t ${fmt(t)}`);
  g.leader([t + r1 * (1 - Math.SQRT1_2), t + r1 * (1 - Math.SQRT1_2)], [b * 0.6, h * 0.55], `r1 ${fmt(r1)}  r2 ${fmt(r2)}`);
}

/** Parallel-flange I (symmetric) or U (web on the left) section with root fillets r. */
function flanged(g: Builder, shape: "i" | "u", h: number, b: number, tw: number, tf: number, r: number) {
  g.setSize(b, h);
  const webL = shape === "i" ? (b - tw) / 2 : 0;
  const webR = webL + tw;
  const P = (x: number, y: number): Point => [round(x), round(y)];
  // Bottom flange, right side up the web to the top flange, then back along the left side.
  g.outline({ kind: "line", a: P(0, 0), b: P(b, 0) });
  g.outline({ kind: "line", a: P(b, 0), b: P(b, tf) });
  g.outline({ kind: "line", a: P(b, tf), b: P(webR + r, tf) });
  g.outline({ kind: "arc", c: P(webR + r, tf + r), r, start: 180, end: 270 });
  g.outline({ kind: "line", a: P(webR, tf + r), b: P(webR, h - tf - r) });
  g.outline({ kind: "arc", c: P(webR + r, h - tf - r), r, start: 90, end: 180 });
  g.outline({ kind: "line", a: P(webR + r, h - tf), b: P(b, h - tf) });
  g.outline({ kind: "line", a: P(b, h - tf), b: P(b, h) });
  g.outline({ kind: "line", a: P(b, h), b: P(0, h) });
  if (shape === "i") {
    g.outline({ kind: "line", a: P(0, h), b: P(0, h - tf) });
    g.outline({ kind: "line", a: P(0, h - tf), b: P(webL - r, h - tf) });
    g.outline({ kind: "arc", c: P(webL - r, h - tf - r), r, start: 0, end: 90 });
    g.outline({ kind: "line", a: P(webL, h - tf - r), b: P(webL, tf + r) });
    g.outline({ kind: "arc", c: P(webL - r, tf + r), r, start: 270, end: 360 });
    g.outline({ kind: "line", a: P(webL - r, tf), b: P(0, tf) });
    g.outline({ kind: "line", a: P(0, tf), b: P(0, 0) });
  } else g.outline({ kind: "line", a: P(0, h), b: P(0, 0) });
  g.linear([0, 0], [b, 0], -g.th * 2.5, `B ${fmt(b)}`);
  g.linear([0, 0], [0, h], -g.th * 2.5, `H ${fmt(h)}`);
  g.leader([webR, h / 2], [b + g.th * 2, h / 2], `tw ${fmt(tw)}`);
  g.leader([b, h - tf / 2], [b + g.th * 2, h + g.th], `tf ${fmt(tf)}`);
  g.leader([webR + r * (1 - Math.SQRT1_2), tf + r * (1 - Math.SQRT1_2)], [b + g.th * 2, tf + g.th * 3], `r ${fmt(r)}`);
}
