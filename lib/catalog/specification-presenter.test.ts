import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeVariantDimensions, normalizeVariantNominalWeight, normalizeVariantSpecifications } from "./specification-presenter.ts";

/**
 * Fixtures mirror real dimensions_json/nominal_weight_json shapes verified
 * live 2026-08-30 against staging DB_PUBLIC for all 6 groups currently
 * present (DOCUMENT_AUDIT_REPORT.md DAR-037) — never touches D1/network.
 */

test("normalizeVariantDimensions: REBAR (diameter_mm, length_mm)", () => {
  const rows = normalizeVariantDimensions({ dimensions: { diameter_mm: 10, length_mm: 12000 } }, "en");
  assert.deepEqual(rows, [
    { key: "diameter_mm", label: "Diameter", value: "10 mm" },
    { key: "length_mm", label: "Length", value: "12000 mm" },
  ]);
});

test("normalizeVariantDimensions: BEAMS (height_mm, length_mm)", () => {
  const rows = normalizeVariantDimensions({ dimensions: { height_mm: 100, length_mm: 12000 } }, "fa");
  assert.deepEqual(rows, [
    { key: "height_mm", label: "ارتفاع", value: "100 mm" },
    { key: "length_mm", label: "طول", value: "12000 mm" },
  ]);
});

test("normalizeVariantDimensions: RHS (width_mm, height_mm, thickness_mm, length_mm) — preferred order applied", () => {
  const rows = normalizeVariantDimensions({ dimensions: { length_mm: 6000, thickness_mm: 3, width_mm: 50, height_mm: 100 } }, "en");
  assert.deepEqual(
    rows.map((r) => r.key),
    ["width_mm", "height_mm", "thickness_mm", "length_mm"],
  );
});

test("normalizeVariantDimensions: SHS (width_mm, height_mm, thickness_mm, length_mm)", () => {
  const rows = normalizeVariantDimensions({ dimensions: { width_mm: 100, height_mm: 100, thickness_mm: 4, length_mm: 6000 } }, "ar");
  assert.equal(rows.length, 4);
  assert.equal(rows[0].label, "العرض");
});

test("normalizeVariantDimensions: SEAMLESS_PIPE (outside_diameter_mm, wall_thickness_mm, length_mm)", () => {
  const rows = normalizeVariantDimensions({ dimensions: { outside_diameter_mm: 114.3, wall_thickness_mm: 6.02, length_mm: 6000 } }, "en");
  assert.deepEqual(
    rows.map((r) => r.key),
    ["outside_diameter_mm", "wall_thickness_mm", "length_mm"],
  );
  assert.equal(rows[0].value, "114.3 mm");
});

test("normalizeVariantDimensions: SHEET_PLATE (width_mm, thickness_mm, length_mm)", () => {
  const rows = normalizeVariantDimensions({ dimensions: { width_mm: 1500, thickness_mm: 10, length_mm: 6000 } }, "en");
  assert.deepEqual(
    rows.map((r) => r.key),
    ["width_mm", "thickness_mm", "length_mm"],
  );
});

test("normalizeVariantDimensions: null dimensions returns an empty array, never throws", () => {
  assert.deepEqual(normalizeVariantDimensions({ dimensions: null }, "en"), []);
});

test("normalizeVariantDimensions: unrecognized key degrades to a humanized label instead of crashing", () => {
  const rows = normalizeVariantDimensions({ dimensions: { coil_od_mm: 900 } }, "en");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, "coil_od_mm");
  assert.equal(rows[0].label, "Coil Od");
  assert.equal(rows[0].value, "900 mm");
});

test("normalizeVariantDimensions: unrecognized non-mm key still renders a bare value rather than guessing a unit", () => {
  const rows = normalizeVariantDimensions({ dimensions: { turns_per_meter: 12 } }, "en");
  assert.equal(rows[0].label, "Turns Per Meter");
  assert.equal(rows[0].value, "12");
});

// --- nominal weight ---

test("normalizeVariantNominalWeight: REBAR (kg_m, per_branch)", () => {
  const rows = normalizeVariantNominalWeight({ nominalWeight: { kg_m: 0.61654, per_branch: 7.39845 } }, "en");
  assert.deepEqual(
    rows.map((r) => r.key),
    ["kg_m", "per_branch"],
  );
  assert.equal(rows[0].value, "0.61654 kg");
});

test("normalizeVariantNominalWeight: SHEET_PLATE (kg_m2, per_sheet)", () => {
  const rows = normalizeVariantNominalWeight({ nominalWeight: { kg_m2: 78.5, per_sheet: 706.5 } }, "en");
  assert.deepEqual(
    rows.map((r) => r.key),
    ["kg_m2", "per_sheet"],
  );
});

test("normalizeVariantNominalWeight: null returns an empty array, never throws", () => {
  assert.deepEqual(normalizeVariantNominalWeight({ nominalWeight: null }, "en"), []);
});

test("normalizeVariantNominalWeight: unrecognized key degrades safely", () => {
  const rows = normalizeVariantNominalWeight({ nominalWeight: { kg_coil: 1850 } }, "en");
  assert.equal(rows[0].label, "Kg Coil");
  assert.equal(rows[0].value, "1850 kg");
});

// --- combined entry point ---

test("normalizeVariantSpecifications returns both dimensions and nominalWeight together", () => {
  const result = normalizeVariantSpecifications({ dimensions: { diameter_mm: 10, length_mm: 12000 }, nominalWeight: { kg_m: 0.6, per_branch: 7.2 } }, "en");
  assert.equal(result.dimensions.length, 2);
  assert.equal(result.nominalWeight.length, 2);
});

test("normalizeVariantSpecifications handles a variant with neither dimensions nor nominal weight (never assume both are present)", () => {
  const result = normalizeVariantSpecifications({ dimensions: null, nominalWeight: null }, "en");
  assert.deepEqual(result, { dimensions: [], nominalWeight: [] });
});
