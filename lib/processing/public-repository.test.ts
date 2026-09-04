import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * `listPublicProcessingGroups` transitively imports `getPublicDb` ->
 * `cloudflare:workers`, which cannot be loaded under plain `node --test`
 * outside the real Workers runtime — the same constraint every other
 * D1-touching repository in this repo has (see
 * `lib/catalog/upsert-editorial-draft-atomicity.test.ts`'s file header for
 * the fullest explanation of this repo's established convention: pin the
 * SQL/structure as a source-text invariant here, verify the real behavior
 * live).
 *
 * The live verification for THIS migration/query was actually performed
 * (not merely asserted) while building this task, against real local D1
 * (`npx wrangler d1 migrations apply DB_PUBLIC --local`, then fixture rows
 * inserted and queried via `npx wrangler d1 execute DB_PUBLIC --local`
 * using this exact SQL) — confirmed: locale scoping (`fa` vs `en` rows
 * returned independently), inactive-row filtering (a withdrawn `is_active=0`
 * row correctly excluded), deterministic `sequence, code` ordering, an
 * empty-locale (`ar`, no rows yet) returning `[]` rather than erroring, and
 * the `UNIQUE(code, locale)` constraint rejecting a duplicate insert. The
 * fixture rows were deleted afterward; `.wrangler/state` is gitignored and
 * carries no state forward. This test file pins the same query/shape
 * facts structurally so a later edit can't silently drift from what was
 * actually proven to work.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

const SOURCE = readSource("lib/processing/public-repository.ts");

test("listPublicProcessingGroups filters to the requested locale", () => {
  assert.match(SOURCE, /WHERE locale = \?/);
});

test("listPublicProcessingGroups filters out withdrawn (is_active = 0) rows", () => {
  assert.match(SOURCE, /AND is_active = 1/);
});

test("listPublicProcessingGroups orders deterministically by sequence then code (task §16)", () => {
  assert.match(SOURCE, /ORDER BY sequence ASC, code ASC/);
});

test("listPublicProcessingGroups never falls back to '?? [ ... hardcoded ... ]' — only '?? []' (empty array is valid, task §16)", () => {
  assert.match(SOURCE, /result\.results \?\? \[\]/);
  assert.ok(!/\?\?\s*\[\s*\{/.test(SOURCE), "must never fall back to a hardcoded literal array of objects");
});

test("PublicProcessingGroup return shape is minimal: id, name, sequence only (task §17)", () => {
  assert.match(SOURCE, /export interface PublicProcessingGroup \{\s*id: string;\s*name: string;\s*sequence: number;\s*\}/);
});

test("public-repository.ts is the only module in lib/processing/ that exports listPublicProcessingGroups", () => {
  const grepable = readSource("lib/processing/sync-runner.ts") + readSource("lib/processing/repository.ts");
  assert.ok(!grepable.includes("listPublicProcessingGroups"), "the public read function must be defined in exactly one place");
});
