import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQueryString, buildTemplateFilterConditions, dedupeClassificationRefs, parseCatalogFilterParams, toggleFilterQueryValue } from "./catalog-filters.ts";

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
