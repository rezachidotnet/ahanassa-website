import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCatalogMedia } from "./media-registry.ts";

// Test F: Media fallback — override wins, then family/group default, then
// generic fallback.

test("resolveCatalogMedia: a verified live group code resolves to its group default image", () => {
  const resolved = resolveCatalogMedia({ templateXid: "unknown_template", groupCode: "REBAR", familyCode: "LONG_PRODUCTS" });
  assert.equal(resolved.source, "group_default");
  assert.equal(resolved.src, "/images/products/rebar.png");
});

test("resolveCatalogMedia: an unmapped group code (e.g. SHS, which has no dedicated photo yet) falls through to the generic fallback, never borrows an unrelated product's photo", () => {
  const resolved = resolveCatalogMedia({ templateXid: "unknown_template", groupCode: "SHS", familyCode: "HOLLOW_SECTIONS_PROFILES" });
  assert.equal(resolved.source, "generic_fallback");
  assert.equal(resolved.src, "/images/products/steel-placeholder.svg");
});

test("resolveCatalogMedia: no group or family code at all still resolves safely to the generic fallback, never throws, never a broken/empty src", () => {
  const resolved = resolveCatalogMedia({ templateXid: "unknown_template", groupCode: null, familyCode: null });
  assert.equal(resolved.source, "generic_fallback");
  assert.ok(resolved.src.length > 0);
});

test("resolveCatalogMedia: every resolution always returns a non-empty src (no broken images allowed)", () => {
  const subjects = [
    { templateXid: "a", groupCode: "REBAR", familyCode: "LONG_PRODUCTS" },
    { templateXid: "b", groupCode: "SHEET_PLATE", familyCode: "FLAT_PRODUCTS" },
    { templateXid: "c", groupCode: "BEAMS", familyCode: "LONG_PRODUCTS" },
    { templateXid: "d", groupCode: "SEAMLESS_PIPE", familyCode: "PIPES_TUBES" },
    { templateXid: "e", groupCode: "RHS", familyCode: "HOLLOW_SECTIONS_PROFILES" },
    { templateXid: "f", groupCode: "UNKNOWN_GROUP", familyCode: "UNKNOWN_FAMILY" },
  ];
  for (const subject of subjects) {
    const resolved = resolveCatalogMedia(subject);
    assert.ok(resolved.src.startsWith("/images/products/"), `unexpected src for ${JSON.stringify(subject)}: ${resolved.src}`);
  }
});
