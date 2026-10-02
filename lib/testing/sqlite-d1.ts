import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Test-only D1Database over node:sqlite with the REAL migrations applied.
 * `batch()` is a real transaction (BEGIN … COMMIT, ROLLBACK on any error),
 * matching D1's documented batch semantics, so atomicity is actually tested.
 */
type Param = string | number | null | boolean | undefined;
const norm = (params: Param[]) => params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p)) as never[];

export class SqliteD1 {
  readonly sqlite: DatabaseSync;
  batchCalls = 0;
  constructor(migrationDirs: string[]) {
    this.sqlite = new DatabaseSync(":memory:");
    for (const dir of migrationDirs) {
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) this.sqlite.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    }
  }
  prepare(sql: string) {
    const db = this.sqlite;
    const stmt = (params: Param[]) => ({
      sql,
      params,
      bind: (...p: Param[]) => stmt(p),
      async first<T>(column?: string) {
        const row = db.prepare(sql).get(...norm(params)) as Record<string, unknown> | undefined;
        if (!row) return null;
        return (column ? row[column] : { ...row }) as T;
      },
      async all<T>() {
        return { results: db.prepare(sql).all(...norm(params)).map((r) => ({ ...r })) as T[], success: true, meta: {} };
      },
      async run() {
        const r = db.prepare(sql).run(...norm(params));
        return { success: true, meta: { changes: Number(r.changes) }, results: [] };
      },
      exec: () => db.prepare(sql).run(...norm(params)),
    });
    return stmt([]);
  }
  async batch(statements: { exec: () => unknown }[]) {
    this.batchCalls++;
    this.sqlite.exec("BEGIN");
    try {
      const out = statements.map((s) => s.exec());
      this.sqlite.exec("COMMIT");
      return out.map(() => ({ success: true, meta: {}, results: [] }));
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /** Synchronous helper for assertions. */
  q<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
    return this.sqlite.prepare(sql).all(...norm(params)).map((r) => ({ ...r })) as T[];
  }
  asD1(): D1Database {
    return this as unknown as D1Database;
  }
}

export const OPS_MIGRATIONS = path.resolve(import.meta.dirname, "../../migrations");
export const PUBLIC_MIGRATIONS = path.resolve(import.meta.dirname, "../../migrations_public");
