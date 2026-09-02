import { test } from "node:test";
import assert from "node:assert/strict";
import { getHomepagePriceStrip } from "./repository.ts";

/**
 * `getHomepagePriceStrip` dynamically `import()`s its `cloudflare:workers`-
 * touching dependencies (lib/db/public.ts, lib/catalog/editorial-repository.ts)
 * only once `PRICE_STRIP_ENABLED === "true"` — `cloudflare:workers` cannot
 * be resolved by plain Node at all (outside the actual Workers runtime),
 * so the flag-off path is exactly what's unit-testable here; the
 * DB-touching path (flag on, a real D1 binding) is validated live, same
 * established convention as lib/catalog/sync-runner.ts in this codebase.
 * The actual selection policy is exhaustively covered, D1-free, in
 * lib/pricing/quote-selection.test.ts.
 */

function fakeEnv(overrides: Record<string, unknown> = {}): CloudflareEnv {
  return { ...overrides } as unknown as CloudflareEnv;
}

test("PRICE_STRIP_ENABLED off (unset) returns [] without importing any DB-touching module", async () => {
  const result = await getHomepagePriceStrip(fakeEnv(), "fa");
  assert.deepEqual(result, []);
});

test("PRICE_STRIP_ENABLED explicitly 'false' also returns [] without importing any DB-touching module", async () => {
  const result = await getHomepagePriceStrip(fakeEnv({ PRICE_STRIP_ENABLED: "false" }), "fa");
  assert.deepEqual(result, []);
});

test("PRICE_STRIP_ENABLED as any value other than the exact string 'true' is treated as off", async () => {
  const result = await getHomepagePriceStrip(fakeEnv({ PRICE_STRIP_ENABLED: "1" }), "fa");
  assert.deepEqual(result, []);
});

test("the legitimate-empty-result (flag off) path never logs an error", async () => {
  const originalError = console.error;
  const errorCalls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    errorCalls.push(args);
  };
  try {
    await getHomepagePriceStrip(fakeEnv(), "fa");
    assert.equal(errorCalls.length, 0);
  } finally {
    console.error = originalError;
  }
});
