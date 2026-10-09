import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { channelKgPerMetre, en10219CornerRadii, equalAngleKgPerMetre, hollowSectionKgPerMetre, kgPerMetreFromArea, pipeKgPerMetre, plateKg, plateKgPerSquareMetre, rebarKgPerMetre } from "./formulas.ts";
import { EN10365_IPE_KG_M, EN10365_IPN_KG_M, STEEL_DENSITY_KG_M3 } from "./standards.ts";

/**
 * W10.1 — every formula and table row against the values of the standard it
 * cites, and against the catalog snapshot (Odoo Product Master nominal
 * weights) wherever the catalog has the same size. Reference values below
 * are transcribed from the cited standards' mass tables.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures/snapshot/staging-2026-10-01.snapshot.json"), "utf8")) as {
  tables: { product_variants: { form_code: string; commercial_size: string; dimensions_json: string; nominal_weight_json: string }[] };
};
const catalog = (form: string) =>
  SNAPSHOT.tables.product_variants
    .filter((v) => v.form_code === form)
    .map((v) => ({ size: v.commercial_size, d: JSON.parse(v.dimensions_json) as Record<string, number>, w: JSON.parse(v.nominal_weight_json) as Record<string, number> }));
const rel = (a: number, b: number) => Math.abs(a / b - 1);
const within = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(rel(actual, expected) <= tolerance, `${label}: ${actual.toFixed(4)} vs ${expected} (${(rel(actual, expected) * 100).toFixed(2)} % > ${(tolerance * 100).toFixed(2)} %)`);

test("density: 7850 kg/m³; 1 mm² × 1 m of steel = 0.00785 kg", () => {
  assert.equal(STEEL_DENSITY_KG_M3, 7850);
  assert.equal(kgPerMetreFromArea(1000), 7.85);
  assert.ok(Number.isNaN(kgPerMetreFromArea(0)));
});

// --- rebar: ISO 6935-2 / INSO 3132, d²/162 ------------------------------------------

/** ISO 6935-2 nominal mass per metre (kg/m) by nominal diameter (mm). */
const ISO6935_NOMINAL_MASS: Record<number, number> = { 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.21, 16: 1.58, 18: 2.0, 20: 2.47, 22: 2.98, 25: 3.85, 28: 4.83, 32: 6.31, 36: 7.99, 40: 9.86, 50: 15.4 };

test("rebar d²/162 matches every ISO 6935-2 nominal mass within 0.5 %", () => {
  assert.equal(rebarKgPerMetre(18), 2);
  for (const [d, mass] of Object.entries(ISO6935_NOMINAL_MASS)) within(rebarKgPerMetre(Number(d)), mass, 0.005, `Ø${d}`);
  assert.ok(Number.isNaN(rebarKgPerMetre(0)) && Number.isNaN(rebarKgPerMetre(-8)));
});

test("rebar: every catalog row (ribbed and plain) is within 0.15 % of d²/162 (the catalog uses π/4·d²·7.85)", () => {
  const rows = [...catalog("RIBBED_REBAR"), ...catalog("PLAIN_REBAR")];
  assert.equal(rows.length, 45);
  for (const r of rows) within(rebarKgPerMetre(r.d.diameter_mm), r.w.kg_m, 0.0015, r.size);
});

// --- plate / sheet: EN 10029 / EN 10051, t × w × l × 7.85 ----------------------------

test("plate/sheet t×w×l×7.85 reproduces every catalog sheet weight and kg/m² (74 rows)", () => {
  assert.equal(plateKg(10, 1.5, 6), 706.5);
  assert.equal(plateKgPerSquareMetre(10), 78.5);
  const rows = [...catalog("HOT_ROLLED_PLATE"), ...catalog("HOT_ROLLED_SHEET")];
  assert.equal(rows.length, 74);
  for (const r of rows) {
    assert.ok(Math.abs(plateKg(r.d.thickness_mm, r.d.width_mm / 1000, r.d.length_mm / 1000) - r.w.per_sheet) < 0.001, r.size);
    assert.ok(Math.abs(plateKgPerSquareMetre(r.d.thickness_mm) - r.w.kg_m2) < 1e-9, r.size);
  }
  assert.ok(Number.isNaN(plateKg(0, 1, 1)));
});

// --- hollow sections: EN 10219-2 Annex B ----------------------------------------------

test("EN 10219-2 Annex B corner radii by wall thickness", () => {
  assert.deepEqual(en10219CornerRadii(4), { ro: 8, ri: 4 });
  assert.deepEqual(en10219CornerRadii(6), { ro: 12, ri: 6 });
  assert.deepEqual(en10219CornerRadii(8), { ro: 20, ri: 12 });
  assert.deepEqual(en10219CornerRadii(12), { ro: 36, ri: 24 });
});

/** EN 10219-2 mass per metre (kg/m): [H, B, t, mass]. */
const EN10219_MASS: [number, number, number, number][] = [
  [40, 40, 2.5, 2.82],
  [100, 100, 4, 11.7],
  [200, 200, 10, 57.0],
  [100, 50, 3, 6.6],
  [200, 100, 6, 26.4],
];

test("hollow section formula matches the EN 10219-2 table masses within 0.5 %", () => {
  for (const [h, b, t, mass] of EN10219_MASS) within(hollowSectionKgPerMetre(h, b, t), mass, 0.005, `${h}×${b}×${t}`);
  assert.ok(Number.isNaN(hollowSectionKgPerMetre(40, 40, 20)), "wall thicker than half the side");
});

test("FINDING (reported in W10.1): catalog SHS/RHS weights follow the EN 10210-2 hot-finished corner radii, 1–6 % above the EN 10219-2 formula", () => {
  const rows = [...catalog("SHS_FORM"), ...catalog("RHS_FORM")];
  assert.equal(rows.length, 67);
  for (const r of rows) {
    const { height_mm: h, width_mm: b, thickness_mm: t } = r.d;
    const en10219 = hollowSectionKgPerMetre(h, b, t);
    const en10210 = kgPerMetreFromArea(2 * t * (b + h - 2 * t) - (4 - Math.PI) * ((1.5 * t) ** 2 - t ** 2));
    assert.ok(r.w.kg_m > en10219 && rel(r.w.kg_m, en10219) <= 0.06, `${r.size}: above EN 10219-2 by ≤ 6 %`);
    within(r.w.kg_m, en10210, 0.012, `${r.size} vs EN 10210-2 radii (catalog rounded to 0.1 kg/m)`);
  }
});

// --- pipe: ASME B36.10M ------------------------------------------------------------------

/** ASME B36.10M, Schedule 40, plain-end mass (kg/m) by [OD, wall] — the standard's exact metric dimensions (the catalog carries the same). */
const ASME_SCH40: [number, number, number][] = [
  [21.336, 2.769, 1.27], [26.67, 2.87, 1.69], [33.401, 3.378, 2.5], [42.164, 3.556, 3.39], [48.26, 3.683, 4.05], [60.325, 3.912, 5.44],
  [73.025, 5.156, 8.63], [88.9, 5.486, 11.29], [114.3, 6.02, 16.07], [141.3, 6.553, 21.77], [168.275, 7.112, 28.26], [219.075, 8.179, 42.55],
];

test("pipe 0.0246615·(D − t)·t matches every ASME B36.10M SCH40 mass within 0.3 % (or the table's 0.01 kg/m rounding)", () => {
  within(pipeKgPerMetre(114.3, 6.02), 0.0246615 * (114.3 - 6.02) * 6.02, 1e-5, "formula identity");
  for (const [od, t, mass] of ASME_SCH40) {
    const kg = pipeKgPerMetre(od, t);
    assert.ok(Math.abs(kg - mass) <= Math.max(0.006, 0.003 * mass), `${od}×${t}: ${kg.toFixed(4)} vs ${mass}`);
  }
  assert.ok(Number.isNaN(pipeKgPerMetre(20, 10)));
});

test("FINDING (reported): catalog seamless-pipe weights are 0.23–0.28 % under ASME B36.10M", () => {
  const rows = catalog("SEAMLESS_PIPE_FORM");
  assert.equal(rows.length, 12);
  for (const r of rows) {
    const asme = pipeKgPerMetre(r.d.outside_diameter_mm, r.d.wall_thickness_mm);
    assert.ok(r.w.kg_m < asme && rel(r.w.kg_m, asme) <= 0.003, r.size);
  }
});

// --- angles: EN 10056-1 --------------------------------------------------------------------

/** EN 10056-1 equal angles: [b, t, mass kg/m]. */
const EN10056_MASS: [number, number, number][] = [[50, 5, 3.77], [60, 6, 5.42], [75, 7, 7.94], [80, 8, 9.63], [100, 10, 15.0]];

test("equal angle sharp-corner formula is at most 1.5 % under the EN 10056-1 masses (radii omitted) and the catalog", () => {
  for (const [b, t, mass] of EN10056_MASS) {
    const kg = equalAngleKgPerMetre(b, t);
    assert.ok(kg < mass && rel(kg, mass) <= 0.015, `L${b}×${t}`);
  }
  for (const r of catalog("EQUAL_ANGLE")) {
    const kg = equalAngleKgPerMetre(r.d.width_mm, r.d.thickness_mm);
    assert.ok(kg < r.w.kg_m && rel(kg, r.w.kg_m) <= 0.015, r.size);
  }
});

// --- channels: EN 10365 dimensions --------------------------------------------------------

/** EN 10365 channels: [name, h, b, tw, tf, r, mass kg/m]. */
const EN10365_CHANNELS: [string, number, number, number, number, number, number][] = [
  ["UPN 80", 80, 45, 6, 8, 8, 8.64],
  ["UPN 100", 100, 50, 6, 8.5, 8.5, 10.6],
  ["UPN 120", 120, 55, 7, 9, 9, 13.4],
  ["UPN 140", 140, 60, 7, 10, 10, 16.0],
  ["UPN 160", 160, 65, 7.5, 10.5, 10.5, 18.8],
  ["UPN 180", 180, 70, 8, 11, 11, 22.0],
  ["UPN 200", 200, 75, 8.5, 11.5, 11.5, 25.3],
  ["UPE 80", 80, 50, 4, 7, 10, 7.9],
  ["UPE 100", 100, 55, 4.5, 7.5, 10, 9.82],
  ["UPE 120", 120, 60, 5, 8, 12, 12.1],
  ["UPE 140", 140, 65, 5, 9, 12, 14.5],
  ["UPE 160", 160, 70, 5.5, 9.5, 12, 17.0],
  ["UPE 180", 180, 75, 5.5, 10.5, 12, 19.7],
  ["UPE 200", 200, 80, 6, 11, 13, 22.8],
];

test("channel formula: UPN (tapered, mean tf, r = 0) and UPE (parallel, with r) within 1 % of EN 10365; every row matches the catalog mass", () => {
  const catalogMass = new Map([...catalog("UPN"), ...catalog("UPE")].map((r) => [r.size, r.w.kg_m]));
  for (const [name, h, b, tw, tf, r, mass] of EN10365_CHANNELS) {
    within(channelKgPerMetre(h, b, tw, tf, name.startsWith("UPE") ? r : 0), mass, 0.01, name);
    within(catalogMass.get(name)!, mass, 0.005, `${name} catalog`);
  }
  assert.ok(Number.isNaN(channelKgPerMetre(100, 50, 60, 8)), "web wider than the flange");
  assert.ok(Number.isNaN(channelKgPerMetre(100, 50, 6, 8, -1)), "negative radius");
});

// --- beams: EN 10365 table ---------------------------------------------------------------

test("IPE/IPN tables: every row exists in the catalog snapshot and agrees with its nominal weight within 1 %", () => {
  for (const [form, table, prefix] of [["IPE", EN10365_IPE_KG_M, "IPE"], ["INP", EN10365_IPN_KG_M, "IPN"]] as const) {
    const rows = new Map(catalog(form).map((r) => [r.size, r.w.kg_m]));
    assert.equal(Object.keys(table).length, rows.size, `${form}: the table covers exactly the catalog range`);
    for (const [h, kg] of Object.entries(table)) {
      const cat = rows.get(`${prefix} ${h}`);
      assert.ok(cat !== undefined, `${prefix} ${h} in the catalog`);
      within(cat, kg, 0.01, `${prefix} ${h}`);
    }
  }
});

test("tables are strictly increasing with height (a transcription slip would break the order)", () => {
  for (const table of [EN10365_IPE_KG_M, EN10365_IPN_KG_M]) {
    const values = Object.entries(table).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, v]) => v);
    values.slice(1).forEach((v, i) => assert.ok(v > values[i]));
  }
});
