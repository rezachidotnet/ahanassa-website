import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLedgerTable, resolveBaseProductionSha, type LedgerRow } from "./release-ledger.ts";

// docs/release/RELEASE_POLICY.md Phase 19 tests 24-27. Every identifier
// below is synthetic — never a real historical Worker Version ID or SHA
// (those belong only in historical reports / the real ledger file).

function row(overrides: Partial<LedgerRow>): LedgerRow {
  return {
    releaseSha: "synthetic-sha",
    workerVersionId: "synthetic-version-id",
    releaseState: "STABLE_100",
    finalTrafficPercent: 100,
    stagingRunId: "synthetic-staging-run",
    productionRunId: "synthetic-production-run",
    promotionRunId: null,
    rollbackVersionId: null,
    finalRisk: "LOW",
    result: "PASS",
    timestamp: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("24. empty ledger -> BASE_PRODUCTION_SHA_UNRESOLVED", () => {
  const result = resolveBaseProductionSha([]);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "BASE_PRODUCTION_SHA_UNRESOLVED");
});

test("25. ledger without any STABLE_100 row -> BASE_PRODUCTION_SHA_UNRESOLVED", () => {
  const rows: LedgerRow[] = [
    row({ releaseSha: "synthetic-sha-canary-1", releaseState: "CANARY_ACTIVE", finalTrafficPercent: 10 }),
  ];
  const result = resolveBaseProductionSha(rows);
  assert.equal(result.ok, false);
  assert.equal((result as any).code, "BASE_PRODUCTION_SHA_UNRESOLVED");
});

test("26. an active canary does not replace the prior STABLE_100 as BASE_PRODUCTION_SHA", () => {
  const rows: LedgerRow[] = [
    row({ releaseSha: "synthetic-sha-stable-1", releaseState: "STABLE_100" }),
    row({ releaseSha: "synthetic-sha-canary-2", releaseState: "CANARY_ACTIVE", finalTrafficPercent: 10 }),
  ];
  const result = resolveBaseProductionSha(rows);
  assert.equal(result.ok, true);
  assert.equal((result as any).releaseSha, "synthetic-sha-stable-1");
});

test("27. the latest verified STABLE_100 row resolves correctly across multiple promotions", () => {
  const rows: LedgerRow[] = [
    row({ releaseSha: "synthetic-sha-stable-1", releaseState: "STABLE_100", timestamp: "2026-01-01T00:00:00Z" }),
    row({ releaseSha: "synthetic-sha-superseded", releaseState: "SUPERSEDED", timestamp: "2026-01-01T00:00:00Z" }),
    row({ releaseSha: "synthetic-sha-canary-2", releaseState: "CANARY_ACTIVE", timestamp: "2026-02-01T00:00:00Z" }),
    row({ releaseSha: "synthetic-sha-stable-2", releaseState: "STABLE_100", timestamp: "2026-02-15T00:00:00Z" }),
  ];
  const result = resolveBaseProductionSha(rows);
  assert.equal(result.ok, true);
  assert.equal((result as any).releaseSha, "synthetic-sha-stable-2");
});

test("parseLedgerTable parses a synthetic ledger markdown table into rows in file order", () => {
  const markdown = [
    "## Ledger",
    "",
    "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    "| `synthetic-sha-1` | `synthetic-version-1` | STABLE_100 | 100 | `111` | `222` | - | - | LOW | PASS | 2026-01-01T00:00:00Z |",
    "| `synthetic-sha-2` | `synthetic-version-2` | CANARY_ACTIVE | 10 | `333` | `444` | - | `synthetic-version-1` | HIGH | PASS | 2026-02-01T00:00:00Z |",
    "",
  ].join("\n");

  const rows = parseLedgerTable(markdown);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    releaseSha: "synthetic-sha-1",
    workerVersionId: "synthetic-version-1",
    releaseState: "STABLE_100",
    finalTrafficPercent: 100,
    stagingRunId: "111",
    productionRunId: "222",
    promotionRunId: null,
    rollbackVersionId: null,
    finalRisk: "LOW",
    result: "PASS",
    timestamp: "2026-01-01T00:00:00Z",
  });
  assert.equal(rows[1].releaseState, "CANARY_ACTIVE");
  assert.equal(rows[1].rollbackVersionId, "synthetic-version-1");

  const resolved = resolveBaseProductionSha(rows);
  assert.equal(resolved.ok, true);
  assert.equal((resolved as any).releaseSha, "synthetic-sha-1");
});

test("parseLedgerTable returns an empty array when no Ledger table is present", () => {
  assert.deepEqual(parseLedgerTable("# Some other document\n\nNo table here.\n"), []);
});
