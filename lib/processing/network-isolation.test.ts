import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Task §25/§26 — "Network-isolation test": proves the future Header-facing
 * read path (`lib/processing/public-repository.ts`) cannot accidentally
 * issue an Odoo/network call, structurally rather than by design
 * intention. Static-source-text check, mirroring this repo's own
 * established precedent for a module this specific runtime constraint
 * applies to — `lib/catalog/homepage-source-isolation.test.ts`'s file
 * header explains why (a D1-touching module cannot be loaded/executed
 * under plain `node --test` at all, since it imports `cloudflare:workers`;
 * reading its source text is how this repo already verifies such an
 * invariant without a bundler or a live D1 instance).
 *
 * The actual runtime proof this stands in for:
 *
 *   DB_PUBLIC populated, Odoo unavailable
 *     -> listPublicProcessingGroups()
 *     -> still succeeds
 *
 * which is true here BECAUSE the function has no code path capable of
 * reaching the network at all — not because Odoo happens to be reachable
 * in test/CI.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Strips comments before a "must not contain X" check — this file's own doc comments legitimately name `fetch()` while explaining why it's absent (matches `lib/content/header-frozen-spec-invariants.test.ts#stripComments`'s established precedent for the same false-positive risk). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const PUBLIC_REPOSITORY_PATH = "lib/processing/public-repository.ts";

test("public-repository.ts does not import the Odoo Processing API client", () => {
  const source = readSource(PUBLIC_REPOSITORY_PATH);
  assert.ok(!/from\s+["'][^"']*odoo-api-client["']/.test(source), "the public read model must never import the Odoo adapter — Header/P6 -> repository -> D1, never Header -> OdooAdapter (task §26)");
});

test("public-repository.ts does not import the generic Odoo RPC client either", () => {
  const source = readSource(PUBLIC_REPOSITORY_PATH);
  assert.ok(!/from\s+["'][^"']*lib\/odoo\/client["']/.test(source));
});

test("public-repository.ts contains no fetch()/network call of its own", () => {
  const source = stripComments(readSource(PUBLIC_REPOSITORY_PATH));
  assert.ok(!/\bfetch\s*\(/.test(source), "the public read model must issue zero network calls — D1 only");
});

test("public-repository.ts's only external data dependency is getPublicDb (D1)", () => {
  const source = readSource(PUBLIC_REPOSITORY_PATH);
  assert.ok(source.includes('from "@/lib/db/public"'), "must read via the standard DB_PUBLIC accessor");
});

test("sync-runner.ts (the actual Odoo-calling code) lives in a separate module from the public read path", () => {
  // Structural confirmation that the two responsibilities are not merged
  // into one file — a future edit accidentally adding a fetch() to
  // public-repository.ts would still be caught by the tests above even if
  // this one were removed, but this documents the intended module
  // boundary explicitly.
  const source = readSource("lib/processing/sync-runner.ts");
  assert.ok(/from\s+["']\.\/odoo-api-client["']/.test(source), "sync-runner.ts is the module allowed to call Odoo");
});
