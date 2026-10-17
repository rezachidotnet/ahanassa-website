/**
 * W17.2 — section drawings from catalog dimensions (Download Center).
 *
 * One drawing per section size whose COMPLETE cross-section is in the catalog's `dimensions_json`. Nothing is
 * assumed: a rolled section's root/toe radii, a tapered flange's slope and a hollow section's corner radius change
 * the shape, so a size without them is skipped (and logged by the build), never drawn with sharp corners.
 *
 * W20.5 — Odoo (ahanassa_marketplace 19.0.54) serves the full EN 10365 / EN 10056-1 / EN 10219-2 geometry, so
 * tapered-flange IPN (14 %) and UPN (8 % / 5 %) are drawn too. Every outline is a polygon whose corners carry
 * fillets tangent to both edges (root, toe and corner radii), and every drawing is checked against the catalog:
 * the outline's own area at 7850 kg/m³ must be within ±2 % of the variant's nominal kg/m, or the size is skipped.
 *
 * Geometry is in millimetres, y up, the section's bounding box at the origin. `planSectionDrawing` returns
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
  /** The catalog's nominal kg/m: the drawn area must match it within MASS_TOLERANCE. Absent = not checked. */
  kgPerM?: number | null;
}

export interface SectionDrawing {
  /** File base name, e.g. "pipe-114.3x6.02" → pipe-114.3x6.02.dxf / .svg. */
  slug: string;
  title: string;
  layers: Record<DrawingLayer, Primitive[]>;
  /** Extents of everything drawn, [min, max]. */
  extents: [Point, Point];
  /** Cross-section area of the OUTLINE layer, mm² (outlineArea). */
  areaMm2: number;
}

export type SectionPlan = { status: "drawn"; drawing: SectionDrawing } | { status: "skipped"; slug: string; formCode: string; reason: string };

type ShapeKind = "angle" | "hollow" | "tube" | "i" | "u";
interface ShapeSpec {
  prefix: string;
  label: string;
  shape: ShapeKind;
  /** Canonical dimension keys the shape needs; each may also be given under one of its aliases. */
  required: readonly string[];
  /**
   * Tapered flanges: where the standard measures tf, as the distance from the flange tip, for a flange slope
   * (in %) — or null when the standard has no such slope for the family.
   */
  tfFromTip?: (b: number, tw: number, slopePct: number) => number | null;
}

/** Steel density for the drawing-vs-catalog mass check (as Odoo's W20.5 verification gate). */
export const DENSITY_KG_M3 = 7850;
/** Largest accepted deviation of the drawn area's mass from the catalog kg/m. */
export const MASS_TOLERANCE = 0.02;

/** Accepted key aliases for the keys Odoo does not send yet (canonical name first). */
export const DIMENSION_KEY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  web_thickness_mm: ["tw_mm"],
  flange_thickness_mm: ["tf_mm"],
  root_radius_mm: ["r_mm", "r1_mm"],
  toe_radius_mm: ["r2_mm"],
  outer_radius_mm: ["ro_mm"],
  inner_radius_mm: ["ri_mm"],
};

const I_KEYS = ["height_mm", "width_mm", "web_thickness_mm", "flange_thickness_mm", "root_radius_mm"] as const;
const TAPERED_KEYS = [...I_KEYS, "toe_radius_mm", "flange_slope_pct"] as const;
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
  // EN 10365 tapered flanges: IPN 14 % with tf at b/4 from the tip; UPN 8 % with tf at b/2 (h ≤ 300) or 5 % with
  // tf at (b − tw)/2 (h > 300), as the standard's UPN table prints them.
  INP: { prefix: "ipn", label: "IPN", shape: "i", required: TAPERED_KEYS, tfFromTip: (b, _tw, pct) => (pct === 14 ? b / 4 : null) },
  UPN: { prefix: "upn", label: "UPN", shape: "u", required: TAPERED_KEYS, tfFromTip: (b, tw, pct) => (pct === 8 ? b / 2 : pct === 5 ? (b - tw) / 2 : null) },
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
  const missing = spec.required.filter((k) => dim(input.dimensions, k) === undefined);
  if (missing.length) return { status: "skipped", slug, formCode: input.formCode, reason: `missing ${missing.join(", ")}` };
  const v = (k: string) => dim(input.dimensions, k) as number;
  const skip = (reason: string): SectionPlan => ({ status: "skipped", slug, formCode: input.formCode as string, reason });
  const g = new Builder();
  try {
    switch (spec.shape) {
      case "tube":
        tube(g, v("outside_diameter_mm"), v("wall_thickness_mm"));
        break;
      case "hollow":
        hollow(g, v("width_mm"), v("height_mm"), v("thickness_mm"), v("outer_radius_mm"), dim(input.dimensions, "inner_radius_mm"));
        break;
      case "angle":
        angle(g, v("width_mm"), v("height_mm"), v("thickness_mm"), v("root_radius_mm"), v("toe_radius_mm"));
        break;
      case "i":
      case "u": {
        let taper: Taper | undefined;
        if (spec.tfFromTip) {
          const pct = v("flange_slope_pct");
          const u = spec.tfFromTip(v("width_mm"), v("web_thickness_mm"), pct);
          if (u === null) return skip(`flange slope ${fmt(pct)} % is not in the standard's ${spec.label} table`);
          taper = { pct, u };
        }
        flanged(g, spec.shape, v("height_mm"), v("width_mm"), v("web_thickness_mm"), v("flange_thickness_mm"), v("root_radius_mm"), dim(input.dimensions, "toe_radius_mm") ?? 0, taper);
        break;
      }
    }
  } catch (e) {
    if (e instanceof GeometryError) return skip(e.message);
    throw e;
  }
  const areaMm2 = outlineArea(g.layers.OUTLINE);
  const kg = input.kgPerM;
  if (typeof kg === "number" && kg > 0) {
    const computed = (areaMm2 * DENSITY_KG_M3) / 1e6;
    const dev = (computed - kg) / kg;
    if (Math.abs(dev) > MASS_TOLERANCE) return skip(`drawn area ${fmt(areaMm2)} mm² gives ${fmt(computed)} kg/m, ${fmt(dev * 100)} % from the catalog's ${fmt(kg)} kg/m`);
  }
  const size = (input.commercialSize ?? slug.slice(spec.prefix.length + 1)).replace(/×/g, "x").replace(/[^\x20-\x7E]/g, "").trim();
  const title = size.toUpperCase().startsWith(spec.label) ? size : `${spec.label} ${size}`;
  g.titleBlock([title, ...(input.standard ? [`Standard: ${input.standard.replace(/[^\x20-\x7E]/g, "")}`] : []), "Dimensions in mm. Nominal dimensions from the Ahan Asa catalog.", "www.ahanassa.com"]);
  return { status: "drawn", drawing: { slug, title, layers: g.layers, extents: g.extents(), areaMm2: round(areaMm2) } };
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

/** Dimensions that do not make a valid outline (e.g. radii larger than the edges they round): the size is skipped. */
class GeometryError extends Error {}

/** A tapered flange: slope in %, and tf's distance from the flange tip. */
interface Taper {
  pct: number;
  u: number;
}

const deg = (rad: number) => (rad * 180) / Math.PI;
const unit = (x: number, y: number): Point => {
  const l = Math.hypot(x, y);
  return [x / l, y / l];
};
/** Angle in [0, 360), rounded like the coordinates. */
const angleDeg = (c: Point, p: Point) => {
  const a = round(deg(Math.atan2(p[1] - c[1], p[0] - c[0])));
  return a < 0 ? a + 360 : a >= 360 ? a - 360 : a;
};

type Corner = readonly [x: number, y: number, r?: number];
type Arc = Extract<Primitive, { kind: "arc" }>;

/**
 * A closed outline through `corners` (counter-clockwise), each corner with an optional fillet of radius r that is
 * tangent to both of its edges: root fillets, toe rounds and hollow-section corners alike, on square or sloped
 * edges. Returns the arcs in corner order (undefined where r = 0), for the leaders.
 */
function roundedPolygon(g: Builder, corners: readonly Corner[]): Array<Arc | undefined> {
  const n = corners.length;
  const fillets = corners.map(([x, y, r = 0], i) => {
    const p: Point = [x, y];
    if (r <= 0) return { a: p, b: p, d: 0, arc: undefined };
    const prev = corners[(i + n - 1) % n];
    const next = corners[(i + 1) % n];
    const u1 = unit(prev[0] - x, prev[1] - y);
    const u2 = unit(next[0] - x, next[1] - y);
    const half = Math.acos(Math.min(1, Math.max(-1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;
    const d = r / Math.tan(half);
    const bis = unit(u1[0] + u2[0], u1[1] + u2[1]);
    const c: Point = [round(x + (bis[0] * r) / Math.sin(half)), round(y + (bis[1] * r) / Math.sin(half))];
    const a: Point = [round(x + u1[0] * d), round(y + u1[1] * d)];
    const b: Point = [round(x + u2[0] * d), round(y + u2[1] * d)];
    let start = angleDeg(c, a);
    let end = angleDeg(c, b);
    if ((((end - start) % 360) + 360) % 360 > 180) [start, end] = [end, start];
    return { a, b, d, arc: { kind: "arc", c, r, start, end } as Arc };
  });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const len = Math.hypot(corners[j][0] - corners[i][0], corners[j][1] - corners[i][1]);
    if (fillets[i].d + fillets[j].d > len + 1e-6) throw new GeometryError(`radii ${fmt(corners[i][2] ?? 0)} and ${fmt(corners[j][2] ?? 0)} do not fit an edge of ${fmt(len)} mm`);
  }
  for (let i = 0; i < n; i++) {
    const f = fillets[i];
    if (f.arc) g.outline(f.arc);
    const to = fillets[(i + 1) % n].a;
    if (Math.hypot(to[0] - f.b[0], to[1] - f.b[1]) > 1e-6) g.outline({ kind: "line", a: f.b, b: to });
  }
  return fillets.map((f) => f.arc);
}

/** The midpoint of a fillet arc: where its leader points. */
function arcMid(a: Arc): Point {
  const sweep = (((a.end - a.start) % 360) + 360) % 360;
  const m = ((a.start + sweep / 2) * Math.PI) / 180;
  return [a.c[0] + a.r * Math.cos(m), a.c[1] + a.r * Math.sin(m)];
}

/**
 * Area (mm²) enclosed by an OUTLINE layer, from the primitives themselves: lines and arcs are chained into closed
 * loops (arcs sampled at ≤ 1°), circles are loops of their own; the largest loop is the section, every other
 * loop a hole. Throws when the outline does not close, so a drawing whose area is checked is also a closed one.
 */
export function outlineArea(outline: readonly Primitive[]): number {
  const segments: Point[][] = [];
  const loops: number[] = [];
  for (const p of outline) {
    if (p.kind === "line") segments.push([p.a, p.b]);
    else if (p.kind === "circle") loops.push(Math.PI * p.r * p.r);
    else if (p.kind === "arc") {
      const sweep = (((p.end - p.start) % 360) + 360) % 360 || 360;
      const steps = Math.max(2, Math.ceil(sweep));
      segments.push(Array.from({ length: steps + 1 }, (_, k) => {
        const t = ((p.start + (sweep * k) / steps) * Math.PI) / 180;
        return [p.c[0] + p.r * Math.cos(t), p.c[1] + p.r * Math.sin(t)] as Point;
      }));
    }
  }
  const near = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;
  while (segments.length) {
    const loop = [...(segments.shift() as Point[])];
    while (!near(loop[0], loop[loop.length - 1])) {
      const end = loop[loop.length - 1];
      const i = segments.findIndex((s) => near(s[0], end) || near(s[s.length - 1], end));
      if (i < 0) throw new Error(`outline does not close at (${fmt(end[0])}, ${fmt(end[1])})`);
      const [s] = segments.splice(i, 1);
      loop.push(...(near(s[0], end) ? s : [...s].reverse()).slice(1));
    }
    let twice = 0;
    for (let k = 0; k < loop.length - 1; k++) twice += loop[k][0] * loop[k + 1][1] - loop[k + 1][0] * loop[k][1];
    loops.push(Math.abs(twice) / 2);
  }
  loops.sort((a, b) => b - a);
  return loops.reduce((sum, a, i) => (i === 0 ? a : sum - a), 0);
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

function hollow(g: Builder, w: number, h: number, t: number, ro: number, ri = Math.max(ro - t, 0)) {
  g.setSize(w, h);
  const rect = (x: number, y: number, rw: number, rh: number, r: number) =>
    roundedPolygon(g, [[x, y, r], [x + rw, y, r], [x + rw, y + rh, r], [x, y + rh, r]]);
  rect(0, 0, w, h, ro);
  rect(t, t, w - 2 * t, h - 2 * t, ri);
  g.linear([0, 0], [w, 0], -g.th * 2.5, `B ${fmt(w)}`);
  g.linear([0, 0], [0, h], -g.th * 2.5, `H ${fmt(h)}`);
  g.leader([w, h / 2], [w + g.th * 2.5, h / 2 + g.th * 2], `t ${fmt(t)}`);
  g.leader([w - ro * (1 - Math.SQRT1_2), h - ro * (1 - Math.SQRT1_2)], [w + g.th * 2.5, h + g.th * 1.5], `ro ${fmt(ro)}  ri ${fmt(ri)}`);
}

function angle(g: Builder, b: number, h: number, t: number, r1: number, r2: number) {
  g.setSize(b, h);
  // Outer corner at the origin; legs along +x (width b) and +y (height h); root fillet r1, toe rounds r2.
  const [, , root] = roundedPolygon(g, [[0, 0], [b, 0], [b, t, r2], [t, t, r1], [t, h, r2], [0, h]]);
  g.linear([0, 0], [b, 0], -g.th * 2.5, `B ${fmt(b)}`);
  g.linear([0, 0], [0, h], -g.th * 2.5, `H ${fmt(h)}`);
  g.leader([b, t / 2], [b + g.th * 2, t / 2 + g.th * 2], `t ${fmt(t)}`);
  g.leader(arcMid(root as Arc), [b * 0.6, h * 0.55], `r1 ${fmt(r1)}  r2 ${fmt(r2)}`);
}

/**
 * I (symmetric) or U (web on the left) section: root fillets r1, toe rounds r2 (0 = square toe, as EN 10365's
 * parallel-flange IPE/UPE), and parallel flanges or — with `taper` — tapered ones whose thickness is tf at u from
 * the tip, growing by slope % towards the web.
 */
function flanged(g: Builder, shape: "i" | "u", h: number, b: number, tw: number, tf: number, r1: number, r2: number, taper?: Taper) {
  g.setSize(b, h);
  const webL = shape === "i" ? (b - tw) / 2 : 0;
  const webR = webL + tw;
  const out = b - webR; // one flange outstand
  const s = taper ? taper.pct / 100 : 0;
  const u = taper ? taper.u : 0;
  const tTip = tf - s * u; // flange thickness at the tip
  const tWeb = tf + s * (out - u); // … and where it meets the web
  if (tTip <= 0 || 2 * tWeb >= h) throw new GeometryError("flange slope does not fit the section");
  // Counter-clockwise from the bottom-left corner: bottom flange, right side, top flange, (I: left side).
  const right: Corner[] = [[b, 0], [b, tTip, r2], [webR, tWeb, r1], [webR, h - tWeb, r1], [b, h - tTip, r2], [b, h]];
  const left: Corner[] = shape === "i" ? [[0, h], [0, h - tTip, r2], [webL, h - tWeb, r1], [webL, tWeb, r1], [0, tTip, r2], [0, 0]] : [[0, h], [0, 0]];
  const arcs = roundedPolygon(g, [...left.slice(-1), ...right, ...left.slice(0, -1)]);
  const [toe, root] = [arcs[2], arcs[3]];
  const th = g.th;
  g.linear([0, 0], [b, 0], -th * 2.5, `B ${fmt(b)}`);
  g.linear([0, 0], [0, h], -th * 2.5, `H ${fmt(h)}`);
  g.leader([webR, h / 2], [b + th * 2, h / 2], `tw ${fmt(tw)}`);
  // tf where the standard measures it: at the tip for parallel flanges, u from the tip for tapered ones.
  const tfX = b - u;
  g.leader([tfX, h - tf / 2], [b + th * 2, h + th], `tf ${fmt(tf)}`);
  if (root) g.leader(arcMid(root), [b + th * 2, tWeb + th * 3], `${r2 ? "r1" : "r"} ${fmt(r1)}`);
  if (toe) g.leader(arcMid(toe), [b + th * 2, tTip + th * 0.8], `r2 ${fmt(r2)}`);
  if (taper) {
    const mid = webR + out / 2;
    const y = h - (tf + s * (b - mid - u));
    g.leader([mid, y], [b + th * 2, h - tWeb - th * 3], `slope ${fmt(taper.pct)}%`);
  }
}
