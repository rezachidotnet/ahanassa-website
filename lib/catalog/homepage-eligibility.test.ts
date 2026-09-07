import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildSetHomepageEligibilitySql } from "./editorial-cli.ts";

/**
 * P1-2 — the distinct "Homepage eligible?" step
 * (docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md §5,
 * §68.1/§69/§75's `show_on_homepage`), added by
 * `migrations_public/0010_homepage_eligibility.sql`.
 *
 * The eligibility rule itself is SQL executed against D1, which cannot be
 * imported under plain `node --test` (`editorial-repository.ts` reaches
 * `cloudflare:workers`). These tests therefore pin the SQL's SHAPE — which
 * is exactly where the dangerous mistakes live — and the truth table is
 * additionally evaluated against a real SQLite database in the P1 compliance
 * report's HOMEPAGE ELIGIBILITY section, using the local D1 file.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function homepageQueryBody(): string {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const start = source.indexOf("export async function listHomepageProductCandidates");
  const end = source.indexOf("export interface PublishedLocaleSlug");
  assert.ok(start !== -1 && end > start, "listHomepageProductCandidates must be locatable");
  return source.slice(start, end);
}

// ---------------------------------------------------------------------------
// The NULL-safe LEFT JOIN rule — the single most dangerous detail here
// ---------------------------------------------------------------------------

test("a template with no homepage_product_rank row is eligible — the LEFT JOIN must not become an implicit exclusion", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const condition = /const HOMEPAGE_ELIGIBILITY_WHERE_CONDITION = "([^"]+)"/.exec(source);
  assert.ok(condition, "the Homepage eligibility condition must be declared as a named constant");

  const sql = condition![1];
  assert.ok(sql.includes("hpr.show_on_homepage IS NULL"), "an absent ranking row (NULL) must be treated as eligible — this is the backward-compatibility guarantee");
  assert.ok(sql.includes("hpr.show_on_homepage = 1"), "an explicit 1 must be eligible");
  assert.ok(/^\(.*\)$/.test(sql), "the OR must be parenthesised, or it would bind loosely against the other ANDed conditions and corrupt the whole gate");

  // The exact bug this guards: a bare equality silently turns the LEFT JOIN
  // into an INNER JOIN and hides every never-ranked product.
  assert.ok(!/^hpr\.show_on_homepage = 1$/.test(sql.trim()), "a bare equality check would hide every unranked product");
});

test("the homepage query still LEFT JOINs the ranking overlay, not an INNER JOIN", () => {
  const body = homepageQueryBody();
  assert.ok(body.includes("LEFT JOIN homepage_product_rank hpr"), "the ranking overlay must stay a LEFT JOIN");
  assert.ok(!/\bINNER JOIN homepage_product_rank\b/.test(body), "an INNER JOIN would drop every template without a ranking row");
});

test("the homepage query applies the shared publication gate PLUS the homepage-only gate", () => {
  const body = homepageQueryBody();
  assert.ok(body.includes("...TEMPLATE_PUBLICATION_WHERE_CONDITIONS"), "must spread the shared publication gate");
  assert.ok(body.includes("HOMEPAGE_ELIGIBILITY_WHERE_CONDITION"), "must add the homepage-only eligibility gate");
});

test("the homepage-only gate is NOT inside the shared constant — /products must be unaffected by homepage curation", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const shared = /const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = (\[[^\]]*\])/.exec(source);
  assert.ok(shared, "the shared publication gate must still exist");
  assert.ok(!shared![1].includes("show_on_homepage"), "excluding a product from the Homepage must never unpublish it from /products or 404 its detail page");

  // The shared constant must still be declared exactly once and still be used
  // by the catalog listing (the property homepage-projection-invariants.test.ts
  // also guards — asserted here from the eligibility angle).
  const declarations = source.match(/const TEMPLATE_PUBLICATION_WHERE_CONDITIONS = \[[^\]]*\]/g) ?? [];
  assert.equal(declarations.length, 1, "the shared gate must not be forked into a homepage-specific copy");
});

// ---------------------------------------------------------------------------
// Eligibility is independent of price and inventory (§21.2 / §74 / §81.1)
// ---------------------------------------------------------------------------

test("homepage eligibility is never derived from price or inventory", () => {
  const body = homepageQueryBody();
  for (const forbidden of ["qty_available", "inventory", "stock", "is_price_public", "price", "currency"]) {
    assert.ok(!body.toLowerCase().includes(forbidden), `the homepage candidate query must not reference ${forbidden} — a card must not appear or vanish for a stock/price reason`);
  }
});

test("the migration defaults existing rows to eligible so nothing silently disappears", () => {
  const migration = readSource("migrations_public/0010_homepage_eligibility.sql");

  assert.ok(/ALTER TABLE\s+homepage_product_rank/i.test(migration), "must alter the ranking overlay table");
  assert.ok(/ADD COLUMN\s+show_on_homepage/i.test(migration), "must add the show_on_homepage column");
  assert.ok(/DEFAULT\s+1/i.test(migration), "must default to eligible — a default of 0 would blank the Homepage on deploy");

  // Strictly additive: no destructive statement anywhere in the file.
  for (const destructive of [/\bDROP\s+TABLE\b/i, /\bDROP\s+COLUMN\b/i, /\bDELETE\s+FROM\b/i, /\bTRUNCATE\b/i, /\bCREATE\s+TABLE\b/i]) {
    assert.ok(!destructive.test(migration), `migration 0010 must be additive only — found ${destructive}`);
  }
});

// ---------------------------------------------------------------------------
// Operator control
// ---------------------------------------------------------------------------

test("the CLI upsert preserves ranking values when toggling homepage eligibility", () => {
  const sql = buildSetHomepageEligibilitySql({ id: "01TESTULID", catalogProductId: "P01", showOnHomepage: false, now: "2026-09-07T00:00:00.000Z" });

  assert.ok(sql.includes("INSERT INTO homepage_product_rank"), "must insert when no overlay row exists yet");
  assert.ok(sql.includes("ON CONFLICT(catalog_product_id) DO UPDATE SET"), "must upsert against the unique index from migration 0005");

  const updateClause = sql.slice(sql.indexOf("DO UPDATE SET"));
  assert.ok(updateClause.includes("show_on_homepage = excluded.show_on_homepage"), "must update the eligibility flag");
  assert.ok(updateClause.includes("updated_at = excluded.updated_at"), "must stamp updated_at");
  for (const preserved of ["base_priority", "manual_boost", "demand_score", "demand_computed_at"]) {
    assert.ok(!updateClause.includes(preserved), `toggling homepage eligibility must not overwrite ${preserved} on an existing row`);
  }
});

test("the CLI renders the eligibility flag as a bound-safe SQL literal, both directions", () => {
  const off = buildSetHomepageEligibilitySql({ id: "A", catalogProductId: "P", showOnHomepage: false, now: "T" });
  const on = buildSetHomepageEligibilitySql({ id: "A", catalogProductId: "P", showOnHomepage: true, now: "T" });

  assert.ok(off.includes(", 0, "), "false must render as the integer literal 0");
  assert.ok(on.includes(", 1, "), "true must render as the integer literal 1");
  assert.ok(!off.includes("false") && !on.includes("true"), "must never emit a JS boolean literal into SQL");
});

test("the CLI exposes operator commands for both directions, and only writes website-owned columns", () => {
  const cli = readSource("scripts/catalog-editorial.ts");

  assert.ok(cli.includes('case "include-on-homepage"'), "an include command must exist");
  assert.ok(cli.includes('case "exclude-from-homepage"'), "an exclude command must exist");
  assert.ok(cli.includes("buildSetHomepageEligibilitySql"), "the commands must go through the shared SQL builder, not raw inline SQL");

  // Same write safeguards every other mutating command already carries.
  const fn = cli.slice(cli.indexOf("function cmdSetHomepageEligibility"), cli.indexOf("function cmdBatch"));
  assert.ok(fn.includes("resolveWriteEnvironment"), "must require an explicit --env, with production needing --confirm-production");
  assert.ok(fn.includes("dryRun"), "must support --dry-run like every other write command");
  assert.ok(fn.includes("printAudit"), "must emit an audit line");
});
