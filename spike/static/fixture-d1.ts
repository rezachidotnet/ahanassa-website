/**
 * Spike S1 — build-time DB_PUBLIC adapter.
 *
 * A minimal D1Database-compatible object backed by an in-memory node:sqlite
 * database loaded from the read-only staging export fixture
 * (spike/fixture/db-public.json). It lets every existing repository
 * function (lib/catalog/editorial-repository.ts, lib/processing/...) run
 * UNCHANGED at static-export time: the same SQL, the same predicates — no
 * query logic is duplicated. Only used by the SPIKE_STATIC_EXPORT build;
 * never bundled into any Worker.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;

function open(): DatabaseSync {
  const fixturePath = process.env.SPIKE_FIXTURE ?? path.resolve(process.cwd(), "spike/fixture/db-public.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as {
    schema: string[];
    tables: Record<string, { columns: string[]; rows: unknown[][] }>;
  };
  const db = new DatabaseSync(":memory:");
  for (const sql of fixture.schema) db.exec(sql);
  for (const [name, t] of Object.entries(fixture.tables)) {
    if (t.rows.length === 0) continue;
    const stmt = db.prepare(`INSERT INTO "${name}" (${t.columns.map((c) => `"${c}"`).join(",")}) VALUES (${t.columns.map(() => "?").join(",")})`);
    for (const r of t.rows) stmt.run(...(r as never[]));
  }
  return db;
}

let shared: DatabaseSync | null = null;
const getDb = () => (shared ??= open());

class FixtureStatement {
  constructor(private readonly sql: string, private readonly params: unknown[] = []) {}
  bind(...params: unknown[]) {
    return new FixtureStatement(this.sql, params);
  }
  private stmt() {
    return getDb().prepare(this.sql);
  }
  async all<T = Row>() {
    const results = this.stmt().all(...(this.params as never[])) as T[];
    return { results, success: true, meta: {} };
  }
  async first<T = Row>(column?: string) {
    const row = this.stmt().get(...(this.params as never[])) as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
  async raw<T = unknown[]>() {
    const s = this.stmt();
    s.setReturnArrays?.(true);
    return s.all(...(this.params as never[])) as T[];
  }
  async run() {
    throw new Error("Spike fixture DB_PUBLIC is read-only at build time");
  }
}

export function createFixtureD1() {
  return {
    prepare: (sql: string) => new FixtureStatement(sql),
    batch: async (stmts: FixtureStatement[]) => Promise.all(stmts.map((s) => s.all())),
    exec: async () => {
      throw new Error("Spike fixture DB_PUBLIC is read-only at build time");
    },
  } as unknown as D1Database;
}
