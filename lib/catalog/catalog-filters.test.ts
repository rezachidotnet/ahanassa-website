import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as filters from "./catalog-filters.ts";
import { groupCodeSetClause } from "./catalog-filters.ts";

test("groupCodeSetClause: no category selected -> no restriction", () => {
  assert.equal(groupCodeSetClause(undefined), null);
});

test("groupCodeSetClause: an unknown category (empty group set) matches nothing, never everything", () => {
  assert.deepEqual(groupCodeSetClause([]), { sql: "0 = 1", params: [] });
});

test("groupCodeSetClause: one placeholder per group code; values only as parameters", () => {
  assert.deepEqual(groupCodeSetClause(["RHS", "SHS"]), { sql: "pv.group_code IN (?, ?)", params: ["RHS", "SHS"] });
});

test("A3: the query-string facet code paths are deleted, not hidden", () => {
  for (const removed of ["buildTemplateFilterConditions", "computeConditionalFacets", "toggleFilterQueryValue", "buildQueryString", "parseCatalogFilterParams", "selectCategoryQuery", "dedupeClassificationRefs", "CATALOG_FILTER_QUERY_KEYS"]) {
    assert.equal(removed in filters, false, `${removed} must not exist`);
  }
  const repo = fs.readFileSync(new URL("./editorial-repository.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(repo, /getPublicCatalogFilterFacets|getPublishedCatalogProducts|pv\.\$\{column\}/);
  const bar = fs.readFileSync(new URL("../../components/products/catalog-filter-bar.tsx", import.meta.url), "utf8");
  for (const facet of ["family", "form", "grade", "standard"]) assert.doesNotMatch(bar, new RegExp(`\\b${facet}\\b\\s*:`), `filter bar must not offer a ${facet} facet`);
});
