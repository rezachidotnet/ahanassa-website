import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQueryString, buildTemplateFilterConditions, computeConditionalFacets, dedupeClassificationRefs, parseCatalogFilterParams, toggleFilterQueryValue, type ClassificationRow } from "./catalog-filters.ts";

test("buildTemplateFilterConditions returns nothing for an empty filter object", () => {
  assert.deepEqual(buildTemplateFilterConditions({}), []);
});

test("buildTemplateFilterConditions maps each recognized filter key to its DB column", () => {
  const result = buildTemplateFilterConditions({ familyCode: "LONG_PRODUCTS", groupCode: "REBAR", formCode: "RIBBED_REBAR", gradeCode: "AJ340", standardCode: "INSO3132" });
  assert.deepEqual(result, [
    { column: "family_code", value: "LONG_PRODUCTS" },
    { column: "group_code", value: "REBAR" },
    { column: "form_code", value: "RIBBED_REBAR" },
    { column: "grade_code", value: "AJ340" },
    { column: "standard_code", value: "INSO3132" },
  ]);
});

test("buildTemplateFilterConditions only includes keys that are actually present", () => {
  const result = buildTemplateFilterConditions({ groupCode: "SHS" });
  assert.deepEqual(result, [{ column: "group_code", value: "SHS" }]);
});

test("buildTemplateFilterConditions ignores an empty-string value (never matches everything by accident)", () => {
  assert.deepEqual(buildTemplateFilterConditions({ groupCode: "" }), []);
});

// --- dedupeClassificationRefs ---

test("dedupeClassificationRefs removes duplicate codes, keeping the first occurrence", () => {
  const result = dedupeClassificationRefs([
    { code: "REBAR", name: "Rebar" },
    { code: "REBAR", name: "Rebar (duplicate row)" },
    { code: "SHS", name: "Square Hollow Section" },
  ]);
  assert.deepEqual(result, [
    { code: "REBAR", name: "Rebar" },
    { code: "SHS", name: "Square Hollow Section" },
  ]);
});

test("dedupeClassificationRefs drops entries with a null code (real data: grade/standard are null for e.g. structural beams)", () => {
  const result = dedupeClassificationRefs([
    { code: null, name: null },
    { code: "S235JR", name: "S235JR" },
  ]);
  assert.deepEqual(result, [{ code: "S235JR", name: "S235JR" }]);
});

test("dedupeClassificationRefs sorts deterministically by code, not by row/insertion order", () => {
  const result = dedupeClassificationRefs([
    { code: "SHS", name: "Square Hollow Section" },
    { code: "REBAR", name: "Rebar" },
    { code: "RHS", name: "Rectangular Hollow Section" },
  ]);
  assert.deepEqual(
    result.map((r) => r.code),
    ["REBAR", "RHS", "SHS"],
  );
});

test("dedupeClassificationRefs returns an empty array for an empty input, never throws", () => {
  assert.deepEqual(dedupeClassificationRefs([]), []);
});

// --- parseCatalogFilterParams ---

test("parseCatalogFilterParams reads only the recognized query-param names", () => {
  const result = parseCatalogFilterParams({ family: "LONG_PRODUCTS", group: "REBAR", unrelated: "ignored" });
  assert.deepEqual(result, { familyCode: "LONG_PRODUCTS", groupCode: "REBAR", formCode: undefined, gradeCode: undefined, standardCode: undefined });
});

test("parseCatalogFilterParams silently ignores the legacy sample-catalog ?category= param instead of crashing", () => {
  const result = parseCatalogFilterParams({ category: "long" });
  assert.deepEqual(result, { familyCode: undefined, groupCode: undefined, formCode: undefined, gradeCode: undefined, standardCode: undefined });
});

test("parseCatalogFilterParams takes the first value when a param repeats", () => {
  const result = parseCatalogFilterParams({ group: ["REBAR", "SHS"] });
  assert.equal(result.groupCode, "REBAR");
});

// --- toggleFilterQueryValue / buildQueryString ---

test("toggleFilterQueryValue adds a value that is not currently active", () => {
  assert.deepEqual(toggleFilterQueryValue({}, "group", "REBAR"), { group: "REBAR" });
});

test("toggleFilterQueryValue clears a value that is already active (click again to deselect)", () => {
  assert.deepEqual(toggleFilterQueryValue({ group: "REBAR" }, "group", "REBAR"), {});
});

test("toggleFilterQueryValue replaces a different value in the same dimension rather than adding a second", () => {
  assert.deepEqual(toggleFilterQueryValue({ group: "REBAR" }, "group", "SHS"), { group: "SHS" });
});

test("toggleFilterQueryValue leaves other dimensions untouched", () => {
  assert.deepEqual(toggleFilterQueryValue({ family: "LONG_PRODUCTS", group: "REBAR" }, "form", "RIBBED_REBAR"), {
    family: "LONG_PRODUCTS",
    group: "REBAR",
    form: "RIBBED_REBAR",
  });
});

test("buildQueryString returns an empty string for no active filters", () => {
  assert.equal(buildQueryString({}), "");
});

test("buildQueryString produces a deterministic key order regardless of input object order", () => {
  assert.equal(buildQueryString({ standard: "INSO3132", family: "LONG_PRODUCTS" }), "?family=LONG_PRODUCTS&standard=INSO3132");
});

test("buildQueryString URL-encodes values", () => {
  assert.equal(buildQueryString({ group: "A B" }), "?group=A%20B");
});

// --- computeConditionalFacets (Go-Live Readiness catalog-filter audit) ---
//
// Fixture mirrors the real 3-template production launch set: Ribbed Rebar
// Aj340 (REBAR/RIBBED_REBAR/AJ340/INSO3132), Hot Rolled Plate S355JR
// (SHEET_PLATE/HOT_ROLLED_PLATE/S355JR/EN10029), Square Hollow Section
// (SHS/SHS_FORM, no grade, EN10219-2) — one row per real published variant.

const rebarRow: ClassificationRow = {
  familyCode: "LONG_PRODUCTS",
  familyName: "Long Products",
  groupCode: "REBAR",
  groupName: "Rebar",
  formCode: "RIBBED_REBAR",
  formName: "Ribbed Rebar",
  gradeCode: "AJ340",
  gradeName: "Aj340 (market A2)",
  standardCode: "INSO3132",
  standardName: "INSO 3132",
};

const plateRow: ClassificationRow = {
  familyCode: "FLAT_PRODUCTS",
  familyName: "Flat Products",
  groupCode: "SHEET_PLATE",
  groupName: "Sheet & Plate",
  formCode: "HOT_ROLLED_PLATE",
  formName: "Hot Rolled Plate",
  gradeCode: "S355JR",
  gradeName: "S355JR",
  standardCode: "EN10029",
  standardName: "EN 10029",
};

const shsRow: ClassificationRow = {
  familyCode: "HOLLOW_SECTIONS_PROFILES",
  familyName: "Hollow Sections & Profiles",
  groupCode: "SHS",
  groupName: "Square Hollow Section",
  formCode: "SHS_FORM",
  formName: "Square Hollow Section",
  gradeCode: null,
  gradeName: null,
  standardCode: "EN10219-2",
  standardName: "EN 10219-2",
};

const productionFixtureRows: ClassificationRow[] = [rebarRow, plateRow, shsRow];

test("computeConditionalFacets with no active filters returns every dimension's full marginal set (unfiltered listing)", () => {
  const result = computeConditionalFacets(productionFixtureRows, {});
  assert.deepEqual(
    result.group.map((r) => r.code),
    ["REBAR", "SHEET_PLATE", "SHS"],
  );
  assert.deepEqual(
    result.grade.map((r) => r.code),
    ["AJ340", "S355JR"],
  );
});

test("computeConditionalFacets reproduces, then fixes, the real production dead-end: selecting group=REBAR must never leave grade=S355JR selectable", () => {
  const result = computeConditionalFacets(productionFixtureRows, { groupCode: "REBAR" });
  assert.deepEqual(
    result.grade.map((r) => r.code),
    ["AJ340"],
  );
  assert.ok(!result.grade.some((r) => r.code === "S355JR"), "S355JR must not appear as a grade option once group=REBAR is active");
});

test("computeConditionalFacets: selecting grade=S355JR narrows group down to only SHEET_PLATE", () => {
  const result = computeConditionalFacets(productionFixtureRows, { gradeCode: "S355JR" });
  assert.deepEqual(
    result.group.map((r) => r.code),
    ["SHEET_PLATE"],
  );
});

test("computeConditionalFacets: a dimension's own active value still appears in its own option list (excluded from its own filter)", () => {
  const result = computeConditionalFacets(productionFixtureRows, { groupCode: "REBAR" });
  assert.deepEqual(
    result.group.map((r) => r.code),
    ["REBAR", "SHEET_PLATE", "SHS"],
    "the group dimension's own list still shows every group — only OTHER dimensions narrow around the active group",
  );
});

test("computeConditionalFacets: every combination of two links from the resulting facets always matches at least one real row", () => {
  const base = computeConditionalFacets(productionFixtureRows, {});
  for (const groupOption of base.group) {
    const narrowed = computeConditionalFacets(productionFixtureRows, { groupCode: groupOption.code ?? undefined });
    for (const gradeOption of narrowed.grade) {
      const matches = productionFixtureRows.some((r) => r.groupCode === groupOption.code && r.gradeCode === gradeOption.code);
      assert.ok(matches, `group=${groupOption.code}&grade=${gradeOption.code} must match at least one real row`);
    }
  }
});

test("computeConditionalFacets: SHS's null grade never surfaces as a fake grade option", () => {
  const result = computeConditionalFacets(productionFixtureRows, { groupCode: "SHS" });
  assert.deepEqual(result.grade, []);
});
