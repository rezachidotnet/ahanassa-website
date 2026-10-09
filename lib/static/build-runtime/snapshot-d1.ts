import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { PUBLISHED_PRICE_HISTORY_BUILD_DDL, PUBLISHED_PRICES_BUILD_DDL } from "../../contracts/snapshot-prices.ts";

/**
 * Build-time DB_PUBLIC for the static export (architecture V1.1 §7.1 step 4).
 *
 * Applies the REAL DB_PUBLIC schema (migrations_public/*.sql, in order) to an
 * in-memory SQLite database and loads one snapshot.v1 file into it, so every
 * page renders through the unchanged repository SQL — no query logic is
 * duplicated. Read-only: any write is an error. Node only; never bundled
 * into a Worker (the static build aliases `cloudflare:workers` to
 * ./cloudflare-workers.ts, which uses this).
 */
type Row = Record<string, unknown>;

export function openSnapshotDatabase(snapshotFile: string, migrationsDir: string): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  for (const file of fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  // W9.4: build-only snapshot table (never a DB_PUBLIC migration; lib/contracts/snapshot-prices.ts).
  db.exec(PUBLISHED_PRICES_BUILD_DDL);
  db.exec(PUBLISHED_PRICE_HISTORY_BUILD_DDL);
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8")) as { tables: Record<string, Row[]> };
  db.exec("BEGIN");
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    for (const row of rows) {
      const columns = Object.keys(row);
      db.prepare(`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(...(columns.map((c) => row[c]) as never[]));
    }
  }
  db.exec("COMMIT");
  return db;
}

const READ_ONLY = () => {
  throw new Error("DB_PUBLIC is read-only during the static build");
};

class SnapshotStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}
  bind(...params: unknown[]) {
    return new SnapshotStatement(this.db, this.sql, params);
  }
  async all<T = Row>() {
    return { results: this.db.prepare(this.sql).all(...(this.params as never[])) as T[], success: true, meta: {} };
  }
  async first<T = Row>(column?: string) {
    const row = this.db.prepare(this.sql).get(...(this.params as never[])) as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
  async raw<T = unknown[]>() {
    const statement = this.db.prepare(this.sql);
    statement.setReturnArrays(true);
    return statement.all(...(this.params as never[])) as T[];
  }
  run = READ_ONLY;
}

/** A D1Database-compatible, read-only view of the snapshot database (prepare/bind/all/first/raw/batch). */
export function createSnapshotD1(db: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => new SnapshotStatement(db, sql),
    batch: async (statements: SnapshotStatement[]) => Promise.all(statements.map((s) => s.all())),
    exec: READ_ONLY,
    dump: READ_ONLY,
    withSession: READ_ONLY,
  } as unknown as D1Database;
}
