import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Test B: Publication eligibility — unpublished/inactive/missing-locale-
// editorial/unapproved content must never appear on the homepage.
// Test C: Route integrity — every homepage candidate's canonical localized
// slug resolves through the SAME product resolver as /products/[slug].
//
// Both are pinned as source-text invariants rather than a live D1 query
// test, for the same reason as homepage-source-isolation.test.ts:
// `lib/catalog/editorial-repository.ts` imports `getPublicDb` ->
// `cloudflare:workers`, which cannot be resolved under plain `node --test`
// at all (this repo's own established convention — repository/sync code is
// "validated live" against real D1 instead, see sync-runner.ts's own file
// header). This module's actual SQL correctness against real DB_PUBLIC data
// was verified live during implementation (13 templates / 237 variants /
// 3 currently published — see the task's final report).

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("listHomepageProductCandidates uses the exact same TEMPLATE_PUBLICATION_WHERE_CONDITIONS constant as listPublishedCatalogTemplates — not a separately duplicated condition list", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");

  const constDeclarations = source.match(/const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = \[[^\]]*\]/g) ?? [];
  assert.equal(constDeclarations.length, 1, "the publication-gate condition array must be declared exactly once, not duplicated");

  const listPublishedFn = source.slice(source.indexOf("export async function listPublishedCatalogTemplates"), source.indexOf("export async function listPublishedCatalogTemplates") + 1000);
  assert.ok(listPublishedFn.includes("TEMPLATE_PUBLICATION_WHERE_CONDITIONS"), "listPublishedCatalogTemplates must reference the shared constant");

  const listHomepageFn = source.slice(source.indexOf("export async function listHomepageProductCandidates"));
  assert.ok(listHomepageFn.includes("TEMPLATE_PUBLICATION_WHERE_CONDITIONS"), "listHomepageProductCandidates must reference the exact same shared constant, proving it uses the identical publication rule");
});

test("the shared publication-gate constant enforces active+public+approved+published+non-null-h1 — the full eligibility rule, not a partial subset", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const match = source.match(/const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = (\[[^\]]*\])/);
  assert.ok(match, "constant must be found");
  const arrayLiteral = match![1];
  for (const requiredFragment of ["cp.is_active = 1", "cp.is_public = 1", "s.content_quality_status = 'approved'", "s.published_at IS NOT NULL", "s.h1 IS NOT NULL"]) {
    assert.ok(arrayLiteral.includes(requiredFragment), `missing required eligibility condition: ${requiredFragment}`);
  }
});

test("listHomepageProductCandidates reads a candidate's slug from product_seo_contents.slug (s.slug) — the identical column /products/[slug] resolves against, never a separate/guessed slug source", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const fnBody = source.slice(source.indexOf("export async function listHomepageProductCandidates"), source.indexOf("export interface PublishedLocaleSlug"));
  assert.ok(fnBody.includes("s.slug as seo_slug"), "must select slug from the product_seo_contents join, not any other source");
  assert.ok(fnBody.includes("FROM catalog_products cp"), "must join through catalog_products, the same entity getPublishedCatalogTemplateBySlug resolves");
  assert.ok(fnBody.includes("JOIN product_seo_contents s ON s.entity_type = 'product'"), "must join product_seo_contents at entity_type='product', matching /products/[slug]'s own resolver");
});

test("ProductShowcase builds every card href from the candidate's own slug field via the standard /products/{slug} path — never a guessed/hardcoded/sample slug", () => {
  const source = readSource("components/home/product-showcase.tsx");
  assert.ok(source.includes("localizedPath(locale, `/products/${p.slug}`)"), "href must be built from p.slug (the real HomepageProductCandidate field), matching the detail route pattern exactly");
});

// PS-P3 (docs/homepage/PRODUCT_SHOWCASE_STAGING_DEFECT_FIX_REPORT.md):
// diagnosed root cause for the EN/AR Homepage Product Showcase being absent
// in staging was NOT a query defect — `product_seo_contents` genuinely has
// zero en/ar rows (verified live against staging DB_PUBLIC). The shared
// publication gate's `s.locale = ?` condition is exactly correct: content is
// only eligible for a locale once an APPROVED, PUBLISHED row exists for
// that specific locale. This is a permanent regression guard against a
// well-intentioned future "fix" that decouples eligibility from locale —
// doing so would either show unapproved content or silently leak another
// locale's (Persian) title/text into an EN/AR page, both explicitly
// forbidden (CLAUDE.md — never fabricate/leak business content).
test("the shared publication gate requires an approved, published SEO content row for the EXACT requested locale — eligibility must never be decoupled from locale", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const match = source.match(/const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = (\[[^\]]*\])/);
  assert.ok(match, "constant must be found");
  const arrayLiteral = match![1];
  assert.ok(arrayLiteral.includes("s.locale = ?"), "eligibility must require product_seo_contents.locale to match the requested locale — removing this would let one locale's content leak into another's page");
});
