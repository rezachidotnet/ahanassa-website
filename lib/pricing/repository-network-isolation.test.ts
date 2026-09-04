import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * PRICE-P3 §20: prove the Homepage Price Strip's public read path
 * (lib/pricing/repository.ts + the pure lib/pricing/price-strip-item.ts it
 * delegates to) reaches only DB_PUBLIC — never a live network fetch, the
 * Odoo adapter, a provider adapter, or the sync orchestrator. A static
 * source-text check rather than a runtime import-graph test — mirrors
 * lib/catalog/homepage-source-isolation.test.ts's own established
 * rationale (this file's own runtime import graph is already exercised by
 * lib/pricing/repository.test.ts's "flag off" tests; a *positive*
 * assertion that specific dangerous imports/calls are ABSENT is most
 * directly verified by reading the source text itself).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

const FILES_UNDER_TEST = ["lib/pricing/repository.ts", "lib/pricing/price-strip-item.ts"];

test("the Price Strip read path never calls fetch()", () => {
  for (const file of FILES_UNDER_TEST) {
    const source = readSource(file);
    assert.ok(!/\bfetch\s*\(/.test(source), `${file} must never call fetch() directly`);
  }
});

test("the Price Strip read path never imports a provider adapter, the Odoo adapter, or the sync orchestrator", () => {
  const forbiddenImportPattern = /from\s+["'][^"']*(?:providers\/|odoo-price-provider|odoo-api-client|sync-orchestrator)[^"']*["']/;
  for (const file of FILES_UNDER_TEST) {
    const source = readSource(file);
    assert.ok(!forbiddenImportPattern.test(source), `${file} must never import a provider/Odoo/sync-orchestrator module`);
  }
});

test("lib/pricing/repository.ts's only D1-touching dependencies are the documented three (lib/db/public.ts, lib/catalog/editorial-repository.ts, lib/pricing/provider-policy-repository.ts) — no other dynamic import exists", () => {
  const source = readSource("lib/pricing/repository.ts");
  const dynamicImports = [...source.matchAll(/await\s+import\(["']([^"']+)["']\)/g)].map((m) => m[1]);
  const allowed = new Set(["../db/public.ts", "../catalog/editorial-repository.ts", "./provider-policy-repository.ts"]);
  assert.ok(dynamicImports.length > 0, "expected at least one dynamic import (the flag-gate pattern)");
  for (const spec of dynamicImports) {
    assert.ok(allowed.has(spec), `unexpected dynamic import in lib/pricing/repository.ts: "${spec}"`);
  }
});

test("lib/pricing/price-strip-item.ts (the pure selection/assembly module) has no cloudflare:workers dependency at all — verified by its own static imports containing no D1/env-touching module", () => {
  const source = readSource("lib/pricing/price-strip-item.ts");
  assert.ok(!source.includes("cloudflare:workers"));
  assert.ok(!/from\s+["'][^"']*db\/public/.test(source), "the pure module must never import the D1 binding accessor directly");
});
