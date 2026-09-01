import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLanguageAlternatesFromEntries } from "./resolve.ts";

/**
 * Go-Live Readiness Stage H: hreflang alternates for an entity whose route
 * is independent per locale (e.g. a Catalog Product page) must never be
 * fabricated for a locale that has no real published page — see
 * app/[locale]/products/[slug]/page.tsx and
 * lib/catalog/editorial-repository.ts#listPublishedLocalesForProduct.
 */

test("buildLanguageAlternatesFromEntries returns undefined for an empty entry list (never a fabricated map)", () => {
  assert.equal(buildLanguageAlternatesFromEntries([]), undefined);
});

test("buildLanguageAlternatesFromEntries only includes the supplied locales, never all supported locales", () => {
  const result = buildLanguageAlternatesFromEntries([{ locale: "fa", path: "/products/rebar-aj340" }]);
  assert.ok(result);
  assert.equal(Object.keys(result).sort().join(","), "fa,x-default");
  assert.equal(result.en, undefined);
  assert.equal(result.ar, undefined);
});

test("buildLanguageAlternatesFromEntries uses each locale's own path, not the default locale's path", () => {
  const result = buildLanguageAlternatesFromEntries([
    { locale: "fa", path: "/products/rebar-aj340" },
    { locale: "en", path: "/products/ribbed-rebar-aj340" },
  ]);
  assert.ok(result);
  assert.match(result.fa, /\/products\/rebar-aj340$/);
  assert.match(result.en, /\/en\/products\/ribbed-rebar-aj340$/);
});

test("buildLanguageAlternatesFromEntries points x-default at the default locale (fa) when present", () => {
  const result = buildLanguageAlternatesFromEntries([
    { locale: "en", path: "/products/ribbed-rebar-aj340" },
    { locale: "fa", path: "/products/rebar-aj340" },
  ]);
  assert.ok(result);
  assert.equal(result["x-default"], result.fa);
});

test("buildLanguageAlternatesFromEntries falls back x-default to the first entry when the default locale is absent", () => {
  const result = buildLanguageAlternatesFromEntries([{ locale: "en", path: "/products/ribbed-rebar-aj340" }]);
  assert.ok(result);
  assert.equal(result["x-default"], result.en);
});
