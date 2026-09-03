import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Test A: Homepage source test — production Product Showcase must not
// import/depend on sampleProducts.
// Test J: Sample catalog isolation — sample data may exist in the repo, but
// production homepage/product pages must not depend on it.
//
// Deliberately a static-source-text check rather than a runtime import test
// — `components/home/product-showcase.tsx` is a Next.js Server Component
// (imports `next/image`, JSX) that cannot be loaded under plain
// `node --test` at all; reading its source text is the only way to pin this
// invariant at this layer without a bundler. This mirrors the "validated
// live" convention this repo already uses for anything that genuinely can't
// run under plain Node (D1-touching repositories) — here the untestable-under-Node
// dependency is Next.js/JSX, not `cloudflare:workers`, but the resolution is
// the same: verify the fact a different way instead of skipping it.

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Matches a real `import ... from ".../catalog-sample"` statement only — deliberately not a bare substring check, since this repo's own doc comments legitimately name the file by path when explaining what must NOT be imported (e.g. this very test suite's file header). */
const CATALOG_SAMPLE_IMPORT_PATTERN = /import\s[^;]*from\s+["'][^"']*catalog-sample["']/;

test("components/home/product-showcase.tsx does not import lib/content/catalog-sample", () => {
  const source = readSource("components/home/product-showcase.tsx");
  assert.ok(!CATALOG_SAMPLE_IMPORT_PATTERN.test(source), "ProductShowcase must never import the sample catalog module");
});

test("components/home/product-showcase.tsx does not hardcode a featured-slug array", () => {
  const source = readSource("components/home/product-showcase.tsx");
  assert.ok(!/const\s+featured\s*=\s*\[/.test(source), "ProductShowcase must not contain a hardcoded featured-slug list");
});

test("components/home/product-showcase.tsx receives its product data as a prop, never fetches sample data itself", () => {
  const source = readSource("components/home/product-showcase.tsx");
  assert.ok(source.includes("items: HomepageProductCandidate[]"), "ProductShowcase must be prop-driven by real HomepageProductCandidate data");
});

test("app/[locale]/products/page.tsx does not import lib/content/catalog-sample", () => {
  const source = readSource("app/[locale]/products/page.tsx");
  assert.ok(!CATALOG_SAMPLE_IMPORT_PATTERN.test(source));
});

test("app/[locale]/products/[slug]/page.tsx does not import lib/content/catalog-sample", () => {
  const source = readSource("app/[locale]/products/[slug]/page.tsx");
  assert.ok(!CATALOG_SAMPLE_IMPORT_PATTERN.test(source));
});

test("app/[locale]/page.tsx (homepage) does not import lib/content/catalog-sample", () => {
  const source = readSource("app/[locale]/page.tsx");
  assert.ok(!CATALOG_SAMPLE_IMPORT_PATTERN.test(source));
});

test("lib/content/catalog-sample.ts still exists and remains explicitly marked as sample-only data (dev/testing isolation, not deleted)", () => {
  const source = readSource("lib/content/catalog-sample.ts");
  assert.ok(/sample/i.test(source), "the sample dataset's own file header must still self-identify as sample data");
});
