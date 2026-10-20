import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DENSITY_KG_M3, MASS_TOLERANCE, outlineArea, planSectionDrawing, SECTION_SHAPES, type Primitive, type SectionInput } from "./sections.ts";
import { writeDxf } from "./dxf.ts";
import { catalogChapters, planDrawings, sortBySize } from "./model.ts";
import { catalogFromSnapshot, type VariantOverlay } from "./test-fixtures.ts";
import { renderSpecSheet } from "./pdf/render.ts";
import { MAX_PDF_BYTES } from "./paths.ts";
import { dimensionColumnLabel, normalizeVariantDimensions } from "../catalog/specification-presenter.ts";
import { locales } from "../../config/locales.ts";

/**
 * W20.5 — the Download Center against the full section geometry Odoo serves since ahanassa_marketplace 19.0.54
 * (EN 10365:2017 cl. 5, EN 10056-1:2017, EN 10219-2:2006 Annex B): every public section variant gets a drawing,
 * tapered flanges and radii are drawn as the standard defines them, and each drawing's own area is within ±2 % of
 * the catalog's kg/m (the gate the build applies too).
 */

const repo = path.resolve(import.meta.dirname, "../..");
const FIXTURE = path.join(repo, "fixtures/snapshot/w98-flat-2026-10-14.snapshot.json");
const OVERLAY = (JSON.parse(fs.readFileSync(path.join(repo, "lib/downloads/fixtures/w205-sections.json"), "utf8")) as { variants: VariantOverlay }).variants;

const catalog = (locale: (typeof locales)[number] = "fa") => catalogFromSnapshot(FIXTURE, locale, OVERLAY);
const sectionVariants = () =>
  catalogChapters(catalog())
    .flatMap((c) => c.templates.flatMap((t) => t.variants))
    .filter((v) => v.formCode !== null && v.formCode in SECTION_SHAPES);
const arcs = (outline: readonly Primitive[]) => outline.filter((p): p is Extract<Primitive, { kind: "arc" }> => p.kind === "arc");
const lines = (outline: readonly Primitive[]) => outline.filter((p): p is Extract<Primitive, { kind: "line" }> => p.kind === "line");
const draw = (input: SectionInput) => {
  const p = planSectionDrawing(input);
  assert.ok(p?.status === "drawn", p?.status === "skipped" ? p.reason : "not a section");
  return p.drawing;
};

test("W20.5 coverage: every public section variant of the snapshot is drawn, per family", () => {
  const variants = sectionVariants();
  const perFamily: Record<string, number> = {};
  for (const v of variants) perFamily[v.formCode as string] = (perFamily[v.formCode as string] ?? 0) + 1;
  assert.deepEqual(perFamily, { EQUAL_ANGLE: 5, INP: 21, IPE: 18, RHS_FORM: 38, SEAMLESS_PIPE_FORM: 12, SHS_FORM: 29, UPE: 7, UPN: 7 }, "the families in the snapshot");
  const plan = planDrawings(catalog());
  assert.deepEqual(plan.skipped, []);
  assert.equal(plan.drawn.length, variants.length, "one drawing per variant (no two share a slug)");
  // Every other locale's catalog draws the same files.
  for (const locale of locales) assert.deepEqual(planDrawings(catalog(locale)).drawn.map((d) => d.slug).sort(), plan.drawn.map((d) => d.slug).sort(), locale);
});

test("W20.5 gate: each drawing's own area at 7850 kg/m³ is within ±2 % of the catalog kg/m", () => {
  let worst = 0;
  for (const v of sectionVariants()) {
    const d = draw({ formCode: v.formCode, commercialSize: v.size, dimensions: v.dimensions, standard: v.standard, kgPerM: v.nominalWeight?.kg_m });
    const kg = v.nominalWeight?.kg_m;
    assert.ok(kg, `${v.sku}: catalog kg/m`);
    const dev = ((outlineArea(d.layers.OUTLINE) * DENSITY_KG_M3) / 1e6 - kg) / kg;
    assert.ok(Math.abs(dev) <= MASS_TOLERANCE, `${v.sku}: ${(dev * 100).toFixed(2)} %`);
    worst = Math.max(worst, Math.abs(dev));
  }
  assert.ok(worst < 0.01, `worst deviation ${(worst * 100).toFixed(2)} % (Odoo's own check: 0.68 %)`);
});

test("W20.5 gate: the build skips a drawing whose area does not match the catalog kg/m, or whose radii do not fit", () => {
  const ipe200 = { height_mm: 200, width_mm: 100, web_thickness_mm: 5.6, flange_thickness_mm: 8.5, root_radius_mm: 12 };
  assert.equal(planSectionDrawing({ formCode: "IPE", commercialSize: "IPE 200", standard: null, dimensions: ipe200, kgPerM: 22.4 })?.status, "drawn");
  const off = planSectionDrawing({ formCode: "IPE", commercialSize: "IPE 200", standard: null, dimensions: ipe200, kgPerM: 26.2 });
  assert.match(off?.status === "skipped" ? off.reason : "", /^drawn area 2848\.\d+ mm² gives 22\.36 kg\/m, -14\.656 % from the catalog's 26\.2 kg\/m$/);
  const tooRound = planSectionDrawing({ formCode: "SHS_FORM", commercialSize: "40×40×3", standard: null, dimensions: { width_mm: 40, height_mm: 40, thickness_mm: 3, outer_radius_mm: 25 } });
  assert.match(tooRound?.status === "skipped" ? tooRound.reason : "", /do not fit/);
  const badSlope = planSectionDrawing({ formCode: "UPN", commercialSize: "UPN 100", standard: null, dimensions: { height_mm: 100, width_mm: 50, web_thickness_mm: 6, flange_thickness_mm: 8.5, root_radius_mm: 8.5, toe_radius_mm: 4.5, flange_slope_pct: 14 } });
  assert.equal(badSlope?.status === "skipped" && badSlope.reason, "flange slope 14 % is not in the standard's UPN table");
});

/** The inner flange faces: the outline lines that are neither horizontal nor vertical. */
const sloped = (outline: readonly Primitive[]) => lines(outline).filter((l) => l.a[0] !== l.b[0] && l.a[1] !== l.b[1]);
const slopeOf = (l: { a: readonly number[]; b: readonly number[] }) => Math.abs((l.b[1] - l.a[1]) / (l.b[0] - l.a[0]));
/** y of the bottom flange's inner face at x (the sloped line spanning x, below mid-height). */
const faceY = (outline: readonly Primitive[], x: number) => {
  const l = sloped(outline).find((s) => Math.min(s.a[0], s.b[0]) <= x && x <= Math.max(s.a[0], s.b[0]) && s.a[1] < 50);
  assert.ok(l, `a sloped face at x = ${x}`);
  return l.a[1] + ((l.b[1] - l.a[1]) * (x - l.a[0])) / (l.b[0] - l.a[0]);
};

test("W20.5 tapered flanges: IPN 14 % with tf at b/4 from the tip; UPN 8 % with tf at b/2 (h ≤ 300), 5 % with tf at (b − tw)/2", () => {
  // IPN 200 (EN 10365): h 200, b 90, tw 7.5, tf 11.3, r1 7.5, r2 4.5.
  const ipn = draw({ formCode: "INP", commercialSize: "IPN 200", standard: null, dimensions: { height_mm: 200, width_mm: 90, web_thickness_mm: 7.5, flange_thickness_mm: 11.3, root_radius_mm: 7.5, toe_radius_mm: 4.5, flange_slope_pct: 14 }, kgPerM: 26.2 });
  assert.equal(sloped(ipn.layers.OUTLINE).length, 4, "four sloped flange faces");
  for (const l of sloped(ipn.layers.OUTLINE)) assert.ok(Math.abs(slopeOf(l) - 0.14) < 1e-3, `slope ${slopeOf(l)}`);
  assert.ok(Math.abs(faceY(ipn.layers.OUTLINE, 90 - 90 / 4) - 11.3) < 0.01, "tf at b/4 from the tip");
  const ipnArcs = arcs(ipn.layers.OUTLINE);
  assert.equal(ipnArcs.filter((a) => a.r === 7.5).length, 4, "four root fillets r1");
  assert.equal(ipnArcs.filter((a) => a.r === 4.5).length, 4, "four toe rounds r2");
  // UPN 100: 8 %, tf at b/2.
  const upn100 = draw({ formCode: "UPN", commercialSize: "UPN 100", standard: null, dimensions: { height_mm: 100, width_mm: 50, web_thickness_mm: 6, flange_thickness_mm: 8.5, root_radius_mm: 8.5, toe_radius_mm: 4.5, flange_slope_pct: 8 }, kgPerM: 10.6 });
  assert.equal(sloped(upn100.layers.OUTLINE).length, 2);
  for (const l of sloped(upn100.layers.OUTLINE)) assert.ok(Math.abs(slopeOf(l) - 0.08) < 1e-3);
  assert.ok(Math.abs(faceY(upn100.layers.OUTLINE, 50 - 25) - 8.5) < 0.01, "tf at b/2 from the tip");
  assert.equal(arcs(upn100.layers.OUTLINE).length, 4, "two root fillets, two toe rounds");
  // UPN 400 (not in today's catalog): 5 %, tf at (b − tw)/2; its EN 10365 kg/m is 71.8.
  const upn400 = draw({ formCode: "UPN", commercialSize: "UPN 400", standard: null, dimensions: { height_mm: 400, width_mm: 110, web_thickness_mm: 14, flange_thickness_mm: 18, root_radius_mm: 18, toe_radius_mm: 9, flange_slope_pct: 5 }, kgPerM: 71.8 });
  for (const l of sloped(upn400.layers.OUTLINE)) assert.ok(Math.abs(slopeOf(l) - 0.05) < 1e-3);
  assert.ok(Math.abs(faceY(upn400.layers.OUTLINE, 110 - 48) - 18) < 0.01, "tf at (b − tw)/2 from the tip");
  // The drawn areas match the areas EN 10365 tables print (IPN 200: 33.4 cm², UPN 100: 13.5, UPN 400: 91.5) within 0.5 %.
  for (const [d, printed] of [[ipn, 3340], [upn100, 1350], [upn400, 9150]] as const) assert.ok(Math.abs(d.areaMm2 / printed - 1) < 0.005, `${d.title}: ${d.areaMm2} mm²`);
  const labels = (d: typeof ipn) => d.layers.TEXT.flatMap((p) => (p.kind === "text" ? [p.text] : []));
  for (const t of ["B 90", "H 200", "tw 7.5", "tf 11.3", "r1 7.5", "r2 4.5", "slope 14%"]) assert.ok(labels(ipn).includes(t), t);
  assert.ok(labels(upn400).includes("slope 5%"));
});

test("W20.5 radii: every fillet is tangent to both edges it joins (no gaps, no kinks); hollow sections use Odoo's ri", () => {
  const near = (p: readonly number[], q: readonly number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.002;
  for (const v of sectionVariants()) {
    const d = draw({ formCode: v.formCode, commercialSize: v.size, dimensions: v.dimensions, standard: v.standard });
    const ls = lines(d.layers.OUTLINE);
    for (const a of arcs(d.layers.OUTLINE)) {
      for (const angle of [a.start, a.end]) {
        const t = (angle * Math.PI) / 180;
        const end = [a.c[0] + a.r * Math.cos(t), a.c[1] + a.r * Math.sin(t)];
        const line = ls.find((l) => near(l.a, end) || near(l.b, end));
        assert.ok(line, `${v.sku}: arc end (${end}) meets a line`);
        // Tangent: the line is perpendicular to the radius at the joint.
        const dir = [line.b[0] - line.a[0], line.b[1] - line.a[1]];
        const cos = (dir[0] * Math.cos(t) + dir[1] * Math.sin(t)) / Math.hypot(dir[0], dir[1]);
        assert.ok(Math.abs(cos) < 1e-3, `${v.sku}: tangent at ${angle}°`);
      }
    }
  }
  // SHS 100×100×8 (6 < t ≤ 10): EN 10219-2 ro 2.5t = 20, ri 1.5t = 12.
  const shs = draw({ formCode: "SHS_FORM", commercialSize: "100×100×8", standard: null, dimensions: { width_mm: 100, height_mm: 100, thickness_mm: 8, outer_radius_mm: 20, inner_radius_mm: 12 } });
  assert.deepEqual(arcs(shs.layers.OUTLINE).map((a) => a.r).sort((x, y) => x - y), [12, 12, 12, 12, 20, 20, 20, 20]);
  // Equal angle 100×100×10: r1 12, r2 6 (EN 10056-1).
  const angle = draw({ formCode: "EQUAL_ANGLE", commercialSize: "100X100X10", standard: null, dimensions: { width_mm: 100, height_mm: 100, thickness_mm: 10, root_radius_mm: 12, toe_radius_mm: 6 }, kgPerM: 15 });
  assert.deepEqual(arcs(angle.layers.OUTLINE).map((a) => a.r).sort((x, y) => x - y), [6, 6, 12]);
});

test("W20.5 DXF: every drawing is a closed outline written as LINE/ARC/CIRCLE only; deterministic", () => {
  for (const d of planDrawings(catalog()).drawn) {
    const dxf = writeDxf(d);
    assert.ok(outlineArea(d.layers.OUTLINE) > 0, d.slug);
    assert.equal(d.areaMm2, Math.round(outlineArea(d.layers.OUTLINE) * 1000) / 1000);
    assert.ok(/\r\n0\r\nARC\r\n|\r\n0\r\nCIRCLE\r\n/.test(dxf), `${d.slug}: radii as arcs`);
    assert.equal(writeDxf(d), dxf);
  }
});

test("W20.5 spec sheets: every section family in fa/en/ar lists each variant with the new geometry columns, labelled", async () => {
  const expected: Record<string, string[]> = {
    IPE: ["web_thickness_mm", "flange_thickness_mm", "root_radius_mm"],
    INP: ["web_thickness_mm", "flange_thickness_mm", "root_radius_mm", "toe_radius_mm", "flange_slope_pct"],
    UPE: ["web_thickness_mm", "flange_thickness_mm", "root_radius_mm"],
    UPN: ["web_thickness_mm", "flange_thickness_mm", "root_radius_mm", "toe_radius_mm", "flange_slope_pct"],
    EQUAL_ANGLE: ["root_radius_mm", "toe_radius_mm"],
    SHS_FORM: ["outer_radius_mm", "inner_radius_mm"],
    RHS_FORM: ["outer_radius_mm", "inner_radius_mm"],
  };
  for (const locale of locales) {
    const cat = catalog(locale);
    const seen = new Set<string>();
    for (const category of cat.categories) {
      const forms = new Set(category.templates.flatMap((t) => t.variants.map((v) => v.formCode as string)));
      const keys = [...forms].flatMap((f) => expected[f] ?? []);
      if (!keys.length) continue;
      const pdf = await renderSpecSheet(category, locale, new Date(cat.contentDate));
      assert.ok(pdf.bytes.byteLength < MAX_PDF_BYTES);
      // A header wraps over lines, each its own drawn text: join with spaces to read the label back.
      const text = pdf.texts.join(" ");
      for (const k of keys) assert.ok(text.includes(dimensionColumnLabel(k, locale)), `${locale} ${category.code}: ${dimensionColumnLabel(k, locale)}`);
      assert.ok(!/Pct|Radius Mm|Thickness Mm/.test(text), `${locale} ${category.code}: no humanized raw key`);
      for (const t of category.templates) for (const v of sortBySize(t.variants)) if (v.formCode && v.formCode in expected) {
        assert.ok(text.includes(v.size), `${locale}: ${v.size}`);
        seen.add(v.sku);
      }
    }
    assert.equal(seen.size, 125, `${locale}: all 125 W20.5 variants appear in a spec sheet`);
  }
});

test("W20.5 presenter: the new keys have fa/en/ar labels; the flange slope is a percentage, never mm", () => {
  const rows = normalizeVariantDimensions({ dimensions: { height_mm: 80, flange_slope_pct: 14, toe_radius_mm: 2.3 } }, "fa");
  assert.deepEqual(rows.map((r) => [r.label, r.value]), [["ارتفاع", "80 mm"], ["شعاع لبه", "2.3 mm"], ["شیب بال", "14 %"]]);
  assert.equal(dimensionColumnLabel("flange_slope_pct", "en"), "Flange slope (%)");
  assert.equal(dimensionColumnLabel("web_thickness_mm", "ar"), "سماكة الجذع (mm)");
});
