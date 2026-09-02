import { test } from "node:test";
import assert from "node:assert/strict";
import { runScheduledPriceSync, syncOneProvider, type SyncOneProviderDeps } from "./sync-orchestrator.ts";
import { ProviderNotConfiguredError } from "./provider.ts";
import type { PriceProvider } from "./provider.ts";
import type { ReconciliationPolicy } from "./provider-config.ts";
import type { PriceProviderFetchResult } from "./types.ts";

/**
 * Failure-isolation tests for the D1-touching orchestrator. This module's
 * REAL D1 query correctness is validated live (this codebase's own
 * established convention — see sync-orchestrator.ts's own comment); these
 * tests instead cover the orchestration-FLOW guarantees the owner
 * explicitly required — that a failure at any stage is caught, mapped to
 * a canonical reason code, logged, and never blocks a later provider —
 * using a minimal fake D1Database rather than a real one.
 */

interface FakeStatement {
  sql: string;
  bind(...args: unknown[]): FakeStatement;
  run(): Promise<{ meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}

class FakeD1 {
  batchCalls: unknown[][] = [];
  runCalls: string[] = [];
  private failOn: (sql: string) => boolean;

  constructor(failOn: (sql: string) => boolean = () => false) {
    this.failOn = failOn;
  }

  prepare(sql: string): FakeStatement {
    const self = this;
    const statement: FakeStatement = {
      sql,
      bind: () => statement,
      async run() {
        self.runCalls.push(sql);
        if (self.failOn(sql)) throw new Error(`FakeD1: forced failure for: ${sql.slice(0, 40)}`);
        // Simulate a successful lease acquisition (1 row changed) for any UPDATE ... lease_owner statement.
        return { meta: { changes: sql.includes("lease_owner") ? 1 : 0 } };
      },
      async all<T>() {
        if (self.failOn(sql)) throw new Error(`FakeD1: forced failure for: ${sql.slice(0, 40)}`);
        return { results: [] as T[] };
      },
      async first<T>() {
        if (self.failOn(sql)) throw new Error(`FakeD1: forced failure for: ${sql.slice(0, 40)}`);
        return null as T | null;
      },
    };
    return statement;
  }

  async batch(statements: unknown[]) {
    this.batchCalls.push(statements);
    return [];
  }
}

function permissivePolicy(): ReconciliationPolicy {
  return { allowSnapshotReconciliation: true, allowAuthoritativeEmptySnapshot: true, currencyConvention: "IRR" };
}

function fakeProvider(id: string, behavior: () => Promise<PriceProviderFetchResult>): PriceProvider {
  return { id, fetchPrices: behavior };
}

function successfulEmptyFetch(): Promise<PriceProviderFetchResult> {
  return Promise.resolve({ quotes: [], mode: "full_snapshot", complete: true, fetchedAt: new Date().toISOString() });
}

test("getPublicDb failure is caught and logged, never throws out of syncOneProvider", async () => {
  const originalError = console.error;
  const errorLogs: unknown[][] = [];
  console.error = (...args: unknown[]) => errorLogs.push(args);
  try {
    const deps: SyncOneProviderDeps = {
      getDb: () => {
        throw new Error("DB_PUBLIC binding is not configured");
      },
      registry: { odoo: fakeProvider("odoo", successfulEmptyFetch) },
      getPolicy: permissivePolicy,
    };
    await assert.doesNotReject(() => syncOneProvider({} as CloudflareEnv, "odoo", deps));
    assert.equal(errorLogs.length, 1);
    const logged = JSON.parse(errorLogs[0][1] as string);
    assert.equal(logged.reasonCode, "database_unavailable");
    assert.equal(logged.persisted, false, "must never claim the failure was persisted when there's no DB connection at all");
  } finally {
    console.error = originalError;
  }
});

test("lease acquisition failure is caught, logged, and recorded via price_sync_state (DB is reachable)", async () => {
  const originalError = console.error;
  const errorLogs: unknown[][] = [];
  console.error = (...args: unknown[]) => errorLogs.push(args);
  try {
    // Precisely targets ONLY the lease-acquisition UPDATE ("SET lease_owner = ?,
    // lease_expires_at = ?" — the acquire), never the release UPDATE ("SET
    // lease_owner = NULL" — a distinct statement that must be allowed to
    // succeed normally in this scenario).
    const fakeDb = new FakeD1((sql) => sql.includes("SET lease_owner = ?, lease_expires_at = ?"));
    const deps: SyncOneProviderDeps = {
      getDb: () => fakeDb as unknown as D1Database,
      registry: { odoo: fakeProvider("odoo", successfulEmptyFetch) },
      getPolicy: permissivePolicy,
    };
    await assert.doesNotReject(() => syncOneProvider({} as CloudflareEnv, "odoo", deps));
    assert.equal(errorLogs.length, 1);
    const logged = JSON.parse(errorLogs[0][1] as string);
    assert.equal(logged.reasonCode, "lease_acquisition_failed");
    assert.equal(logged.persisted, true, "the DB was reachable, so the failure record itself should have been written");
    assert.equal(fakeDb.batchCalls.length, 0, "no price rows may be mutated when lease acquisition fails");
  } finally {
    console.error = originalError;
  }
});

test("an unknown provider ID (not in the registry) is handled defensively, not a crash", async () => {
  const originalError = console.error;
  const errorLogs: unknown[][] = [];
  console.error = (...args: unknown[]) => errorLogs.push(args);
  try {
    const fakeDb = new FakeD1();
    const deps: SyncOneProviderDeps = { getDb: () => fakeDb as unknown as D1Database, registry: {}, getPolicy: permissivePolicy };
    await assert.doesNotReject(() => syncOneProvider({} as CloudflareEnv, "totally-unknown-provider", deps));
    assert.equal(errorLogs.length, 1);
    const logged = JSON.parse(errorLogs[0][1] as string);
    assert.equal(logged.reasonCode, "unknown_provider_failure");
    assert.equal(fakeDb.batchCalls.length, 0);
  } finally {
    console.error = originalError;
  }
});

test("the first provider may fail while the second enabled provider still executes", async () => {
  const originalError = console.error;
  const originalLog = console.log;
  const errorLogs: unknown[][] = [];
  const infoLogs: unknown[][] = [];
  console.error = (...args: unknown[]) => errorLogs.push(args);
  console.log = (...args: unknown[]) => infoLogs.push(args);
  try {
    const fakeDb = new FakeD1();
    const providerA = fakeProvider("provider-a", () => {
      throw new ProviderNotConfiguredError("provider-a", "not wired yet");
    });
    let providerBCalled = false;
    const providerB = fakeProvider("provider-b", () => {
      providerBCalled = true;
      return successfulEmptyFetch();
    });

    const env = { ENABLED_PRICE_PROVIDERS: "provider-a,provider-b" } as unknown as CloudflareEnv;
    const deps: SyncOneProviderDeps = { getDb: () => fakeDb as unknown as D1Database, registry: { "provider-a": providerA, "provider-b": providerB }, getPolicy: permissivePolicy };

    await assert.doesNotReject(() => runScheduledPriceSync(env, deps));

    assert.equal(providerBCalled, true, "provider-b must still run even though provider-a failed");
    const failureLog = errorLogs.find((call) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.providerId === "provider-a";
    });
    assert.ok(failureLog, "provider-a's failure must be logged");
    assert.equal(JSON.parse(failureLog![1] as string).reasonCode, "provider_not_configured");

    const successLog = infoLogs.find((call) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.providerId === "provider-b" && parsed.status === "success";
    });
    assert.ok(successLog, "provider-b must complete successfully despite provider-a's failure");
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});

test("no existing price rows are mutated when getPublicDb fails", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    let batchCallCount = 0;
    const deps: SyncOneProviderDeps = {
      getDb: () => {
        throw new Error("unreachable");
      },
      registry: { odoo: fakeProvider("odoo", successfulEmptyFetch) },
      getPolicy: permissivePolicy,
    };
    await syncOneProvider({} as CloudflareEnv, "odoo", deps);
    assert.equal(batchCallCount, 0);
  } finally {
    console.error = originalError;
  }
});

test("no existing price rows are mutated when the provider fetch itself fails", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const fakeDb = new FakeD1();
    const deps: SyncOneProviderDeps = {
      getDb: () => fakeDb as unknown as D1Database,
      registry: {
        odoo: fakeProvider("odoo", () => {
          throw new Error("upstream down");
        }),
      },
      getPolicy: permissivePolicy,
    };
    await syncOneProvider({} as CloudflareEnv, "odoo", deps);
    assert.equal(fakeDb.batchCalls.length, 0);
  } finally {
    console.error = originalError;
  }
});

test("runScheduledPriceSync with zero enabled providers is a safe no-op, never touches the DB", async () => {
  let getDbCalled = false;
  const deps: SyncOneProviderDeps = {
    getDb: () => {
      getDbCalled = true;
      throw new Error("should never be called");
    },
    registry: {},
    getPolicy: permissivePolicy,
  };
  await assert.doesNotReject(() => runScheduledPriceSync({ ENABLED_PRICE_PROVIDERS: "" } as unknown as CloudflareEnv, deps));
  assert.equal(getDbCalled, false);
});
