import { test } from "node:test";
import assert from "node:assert/strict";
import { planProcessingGroupsSync, validateProcessingGroupsBatch } from "./sync.ts";
import { fetchProcessingGroups } from "./odoo-api-client.ts";
import type { ProcessingGroupApiItem } from "./odoo-api-client.ts";

/**
 * Task §28 — "Add a test preventing accidental persistence of unexpected
 * upstream keys" (the example given: an upstream item smuggling
 * `supplier_cost`). Proves the allow-list end to end through the REAL
 * pipeline functions (transport parsing -> domain validation -> diff
 * planning) rather than asserting against `lib/processing/repository.ts`'s
 * SQL text — the repository's `INSERT`/`UPDATE` statements already name
 * every bound column explicitly (see that file's own header), so the only
 * way a rogue field could ever reach D1 is by surviving into the
 * `ProcessingGroupUpsert` object the planner hands the repository. This
 * test proves it cannot.
 */

function mockFetch(handler: () => Response): typeof fetch {
  return (async () => handler()) as typeof fetch;
}

test("a rogue upstream field (e.g. supplier_cost) never survives into a create-plan object", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.ODOO_BASE_URL;
  process.env.ODOO_BASE_URL = "https://odoo.ahanassa.com";
  try {
    const rogueItem = {
      id: "SHEET_PROCESSING",
      name: "فرآوری ورق",
      sequence: 10,
      active: true,
      updated_at: "2026-09-01 10:00:00",
      // Not part of the documented allow-list (task §6/§28) — a
      // hypothetical private/commercial field that must never reach
      // DB_PUBLIC.
      supplier_cost: 123,
      internal_margin_percent: 40,
    };
    globalThis.fetch = mockFetch(() => new Response(JSON.stringify({ data: [rogueItem], meta: { total: 1 } }), { status: 200 }));

    const fetched = await fetchProcessingGroups({ locale: "fa" });
    assert.equal(fetched.status, "ok");
    assert.ok(fetched.items);

    const validated = validateProcessingGroupsBatch(fetched.items as ProcessingGroupApiItem[], fetched.meta!);
    assert.equal(validated.valid, true);
    if (!validated.valid) return;

    const plan = planProcessingGroupsSync(validated.items, []);
    assert.equal(plan.toCreate.length, 1);

    const created = plan.toCreate[0] as unknown as Record<string, unknown>;
    assert.deepEqual(Object.keys(created).sort(), ["code", "name", "sequence", "sourceUpdatedAt"].sort());
    assert.ok(!("supplier_cost" in created), "supplier_cost must never appear on the object handed to the repository layer");
    assert.ok(!("internal_margin_percent" in created));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.ODOO_BASE_URL;
    else process.env.ODOO_BASE_URL = originalBaseUrl;
  }
});

test("repository.ts's write functions bind an explicit, named column list — no spread of an arbitrary object into SQL params", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const source = readFileSync(path.join(repoRoot, "lib/processing/repository.ts"), "utf8");
  assert.ok(!/\.bind\(\s*\.\.\./.test(source), "no bind(...spread) call — every column must be named explicitly");
});
