import { test } from "node:test";
import assert from "node:assert/strict";
import { runDemandAggregation, type DemandAggregationDeps } from "./aggregation-orchestrator.ts";

/**
 * Failure-isolation / full-reconciliation tests for the D1-touching
 * orchestrator, using a minimal in-memory fake D1 — mirrors
 * `lib/pricing/sync-orchestrator.test.ts`'s own established convention for
 * exactly this class of code (an orchestrator with injectable deps whose
 * REAL D1 SQL shape was validated live, but whose orchestration-FLOW
 * guarantees — full reconciliation to zero, base_priority/manual_boost
 * preservation, atomic all-or-nothing failure — are proven here without a
 * live database).
 */

interface HomepageRankRow {
  catalog_product_id: string;
  base_priority: number;
  manual_boost: number;
  demand_score: number;
  demand_computed_at: string | null;
}

interface FakeOpsD1Options {
  signals: { product_ref: string; created_at: string }[];
}

function makeFakeOpsDb(options: FakeOpsD1Options): D1Database {
  return {
    prepare() {
      const statement = {
        bind: () => statement,
        async all<T>() {
          return { results: options.signals as unknown as T[] };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

interface FakePublicD1Options {
  /** template_xid -> catalog_product_id, the full known catalog universe. */
  catalogProducts: Map<string, string>;
  /** Pre-existing homepage_product_rank rows, keyed by catalog_product_id. */
  initialRank?: Map<string, HomepageRankRow>;
  failBatch?: boolean;
}

class FakePublicDb {
  catalogProducts: Map<string, string>;
  rank: Map<string, HomepageRankRow>;
  failBatch: boolean;
  batchCallCount = 0;

  constructor(options: FakePublicD1Options) {
    this.catalogProducts = options.catalogProducts;
    this.rank = new Map(options.initialRank ?? []);
    this.failBatch = options.failBatch ?? false;
  }

  private templateXidFor(catalogProductId: string): string | undefined {
    for (const [xid, id] of this.catalogProducts) if (id === catalogProductId) return xid;
    return undefined;
  }

  prepare(sql: string) {
    const self = this;
    let boundArgs: unknown[] = [];
    const statement = {
      sql,
      __isFakeStatement: true,
      bind(...args: unknown[]) {
        boundArgs = args;
        return statement;
      },
      async all<T>() {
        if (sql.includes("FROM homepage_product_rank hpr JOIN catalog_products cp")) {
          const results = [...self.rank.keys()]
            .map((catalogProductId) => ({ catalog_product_id: catalogProductId, template_xid: self.templateXidFor(catalogProductId) }))
            .filter((r) => r.template_xid !== undefined);
          return { results: results as unknown as T[] };
        }
        if (sql.includes("FROM catalog_products WHERE template_xid IN")) {
          const requestedXids = boundArgs as string[];
          const results = requestedXids.filter((xid) => self.catalogProducts.has(xid)).map((xid) => ({ id: self.catalogProducts.get(xid), template_xid: xid }));
          return { results: results as unknown as T[] };
        }
        return { results: [] as T[] };
      },
      __applyInsert() {
        // INSERT INTO homepage_product_rank (id, catalog_product_id, base_priority, manual_boost, demand_score, demand_computed_at, created_at, updated_at)
        // VALUES (?, ?, 0, 0, ?, ?, ?, ?) ON CONFLICT(catalog_product_id) DO UPDATE SET demand_score=..., demand_computed_at=..., updated_at=...
        const [, catalogProductId, demandScore, demandComputedAt] = boundArgs as [string, string, number, string, string, string];
        const existing = self.rank.get(catalogProductId as string);
        if (existing) {
          // ON CONFLICT DO UPDATE — only these three fields change; base_priority/manual_boost are NEVER touched.
          self.rank.set(catalogProductId as string, { ...existing, demand_score: demandScore, demand_computed_at: demandComputedAt });
        } else {
          // Fresh INSERT — base_priority/manual_boost start at the literal 0/0 the statement itself specifies (never any pre-existing value, since none exists yet).
          self.rank.set(catalogProductId as string, { catalog_product_id: catalogProductId as string, base_priority: 0, manual_boost: 0, demand_score: demandScore, demand_computed_at: demandComputedAt });
        }
      },
    };
    return statement;
  }

  async batch(statements: { __applyInsert: () => void }[]) {
    this.batchCallCount++;
    if (this.failBatch) throw new Error("FakePublicDb: forced batch failure");
    // Real D1 batch semantics: all-or-nothing. Since failBatch is checked
    // BEFORE any mutation above, no statement here ever partially applies.
    for (const s of statements) s.__applyInsert();
    return [];
  }
}

function deps(opsSignals: FakeOpsD1Options["signals"], publicOptions: FakePublicD1Options, nowMs: number): { deps: DemandAggregationDeps; publicDb: FakePublicDb } {
  const publicDb = new FakePublicDb(publicOptions);
  return {
    deps: {
      getOpsDb: () => makeFakeOpsDb({ signals: opsSignals }),
      getPublicDb: () => publicDb as unknown as D1Database,
      now: () => nowMs,
    },
    publicDb,
  };
}

const NOW = Date.parse("2026-06-01T00:00:00.000Z");

test("runDemandAggregation: a template with real current demand gets a positive demand_score", async () => {
  const catalogProducts = new Map([["tmpl-a", "cp-a"]]);
  const { deps: d, publicDb } = deps([{ product_ref: "tmpl-a", created_at: "2026-05-31T00:00:00.000Z" }], { catalogProducts }, NOW);

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "ok");
  assert.equal(summary.templatesReconciled, 1);
  assert.ok(publicDb.rank.get("cp-a")!.demand_score > 0);
});

test("runDemandAggregation: a template that PREVIOUSLY had demand but has NO current qualifying signal is reconciled to demand_score = 0, not left stale", async () => {
  const catalogProducts = new Map([["tmpl-a", "cp-a"]]);
  const initialRank = new Map([["cp-a", { catalog_product_id: "cp-a", base_priority: 0, manual_boost: 0, demand_score: 7.5, demand_computed_at: "2026-01-01T00:00:00.000Z" }]]);
  // No current signals at all for tmpl-a (e.g. its only RFQ was later marked spam).
  const { deps: d, publicDb } = deps([], { catalogProducts, initialRank }, NOW);

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "ok");
  assert.equal(summary.templatesReconciled, 1, "the stale row must still be reconciled (written), not skipped");
  assert.equal(publicDb.rank.get("cp-a")!.demand_score, 0);
});

test("runDemandAggregation: an entirely empty current signal set still clears every previously-tracked row, rather than returning early leaving stale values", async () => {
  const catalogProducts = new Map([
    ["tmpl-a", "cp-a"],
    ["tmpl-b", "cp-b"],
  ]);
  const initialRank = new Map([
    ["cp-a", { catalog_product_id: "cp-a", base_priority: 0, manual_boost: 0, demand_score: 3, demand_computed_at: "2026-01-01T00:00:00.000Z" }],
    ["cp-b", { catalog_product_id: "cp-b", base_priority: 0, manual_boost: 0, demand_score: 9, demand_computed_at: "2026-01-01T00:00:00.000Z" }],
  ]);
  const { deps: d, publicDb } = deps([], { catalogProducts, initialRank }, NOW);

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "ok");
  assert.equal(summary.templatesReconciled, 2);
  assert.equal(publicDb.rank.get("cp-a")!.demand_score, 0);
  assert.equal(publicDb.rank.get("cp-b")!.demand_score, 0);
  assert.equal(publicDb.batchCallCount, 1, "the clearing write must happen — this must NOT be the true no-op path");
});

test("runDemandAggregation: a genuine true no-op (zero current signals AND nothing ever previously tracked) never calls batch at all", async () => {
  const { deps: d, publicDb } = deps([], { catalogProducts: new Map() }, NOW);

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "ok");
  assert.equal(summary.templatesReconciled, 0);
  assert.equal(publicDb.batchCallCount, 0, "nothing whose demand_score could possibly be stale exists — no write should be attempted");
});

test("runDemandAggregation: base_priority and manual_boost are NEVER overwritten by a reconciliation run, for either a fresh or an existing row", async () => {
  const catalogProducts = new Map([
    ["tmpl-a", "cp-a"], // fresh row this run
    ["tmpl-b", "cp-b"], // pre-existing row with real editorial values
  ]);
  const initialRank = new Map([["cp-b", { catalog_product_id: "cp-b", base_priority: 42, manual_boost: -3, demand_score: 1, demand_computed_at: "2026-01-01T00:00:00.000Z" }]]);
  const { deps: d, publicDb } = deps(
    [
      { product_ref: "tmpl-a", created_at: "2026-05-31T00:00:00.000Z" },
      { product_ref: "tmpl-b", created_at: "2026-05-31T00:00:00.000Z" },
    ],
    { catalogProducts, initialRank },
    NOW,
  );

  await runDemandAggregation(d);

  assert.equal(publicDb.rank.get("cp-a")!.base_priority, 0, "a brand-new row starts at the schema default, never fabricated");
  assert.equal(publicDb.rank.get("cp-a")!.manual_boost, 0);
  assert.equal(publicDb.rank.get("cp-b")!.base_priority, 42, "an existing editorial base_priority must survive a demand reconciliation run untouched");
  assert.equal(publicDb.rank.get("cp-b")!.manual_boost, -3, "an existing editorial manual_boost must survive a demand reconciliation run untouched");
  assert.ok(publicDb.rank.get("cp-b")!.demand_score > 0, "demand_score itself IS refreshed");
});

test("runDemandAggregation: a failure during the DB_PUBLIC write leaves the previous valid aggregate state completely untouched (atomic, not partial)", async () => {
  const catalogProducts = new Map([
    ["tmpl-a", "cp-a"],
    ["tmpl-b", "cp-b"],
  ]);
  const initialRank = new Map([
    ["cp-a", { catalog_product_id: "cp-a", base_priority: 0, manual_boost: 0, demand_score: 5, demand_computed_at: "2026-01-01T00:00:00.000Z" }],
    ["cp-b", { catalog_product_id: "cp-b", base_priority: 0, manual_boost: 0, demand_score: 5, demand_computed_at: "2026-01-01T00:00:00.000Z" }],
  ]);
  const { deps: d, publicDb } = deps(
    [{ product_ref: "tmpl-a", created_at: "2026-05-31T00:00:00.000Z" }], // tmpl-b would be reconciled to 0 this run, if the batch succeeded
    { catalogProducts, initialRank, failBatch: true },
    NOW,
  );

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "failed");
  assert.equal(summary.templatesReconciled, 0);
  // Neither row changed AT ALL — not even cp-a, whose score legitimately
  // would have changed had the batch succeeded.
  assert.equal(publicDb.rank.get("cp-a")!.demand_score, 5);
  assert.equal(publicDb.rank.get("cp-b")!.demand_score, 5);
});

test("runDemandAggregation: a signal referencing a templateXid with no matching catalog_products row is safely skipped, never crashes", async () => {
  const { deps: d, publicDb } = deps([{ product_ref: "unknown-template", created_at: "2026-05-31T00:00:00.000Z" }], { catalogProducts: new Map() }, NOW);

  const summary = await runDemandAggregation(d);
  assert.equal(summary.status, "ok");
  assert.equal(summary.templatesReconciled, 0);
  assert.equal(publicDb.batchCallCount, 0);
});

test("runDemandAggregation: a DB_OPS read failure is caught, logged, and returns failed without ever touching DB_PUBLIC", async () => {
  const originalError = console.error;
  const errorLogs: unknown[][] = [];
  console.error = (...args: unknown[]) => errorLogs.push(args);
  try {
    const publicDb = new FakePublicDb({ catalogProducts: new Map() });
    const summary = await runDemandAggregation({
      getOpsDb: () => {
        throw new Error("DB_OPS binding is not configured");
      },
      getPublicDb: () => publicDb as unknown as D1Database,
      now: () => NOW,
    });
    assert.equal(summary.status, "failed");
    assert.equal(publicDb.batchCallCount, 0);
    assert.equal(errorLogs.length, 1);
  } finally {
    console.error = originalError;
  }
});
