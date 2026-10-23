import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Migration } from "./migrations.ts";

/**
 * W32 (W29 P2 §3.1): the D1Database the RFQ Worker's modules expect, over `node:sqlite` (Node 24), for the domestic
 * intake on iransrv. The test stand-in lib/testing/sqlite-d1.ts is the model; this one is the production adapter:
 *
 *  - a FILE in WAL mode with `synchronous=FULL`: a 201 is sent only after the commit is on disk (an accepted RFQ is
 *    durable before the answer, as on D1);
 *  - `busy_timeout`: the intake and the forwarder are two processes on one file;
 *  - `batch()` = ONE `BEGIN IMMEDIATE … COMMIT` (ROLLBACK on any error) — D1's documented batch atomicity, and no
 *    read→write lock upgrade between the two processes;
 *  - migrations: the SAME `migrations/*.sql` files as D1, applied once each and recorded in `d1_migrations` (the table
 *    name wrangler uses), so a restart never re-applies one; the IR-only tables come from lib/rfq-node/migrations/.
 *  - `.first(column)`, `.all()`, `.run()` answer in D1's shapes (`meta.changes`, `results`).
 *
 * Foreign keys are on (node:sqlite's default, as on D1).
 */
type Param = string | number | null | boolean | undefined | bigint;
const norm = (params: Param[]) => params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p)) as never[];

export interface NodeD1Options {
  busyTimeoutMs?: number;
}

export class NodeD1 {
  readonly sqlite: DatabaseSync;
  readonly file: string;
  /** Number of batch() calls (the delivery's "all post-delivery writes in ONE batch" test reads it). */
  batchCalls = 0;
  constructor(file: string, migrations: readonly Migration[] = [], options: NodeD1Options = {}) {
    this.file = file;
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    this.sqlite = new DatabaseSync(file);
    this.sqlite.exec(`PRAGMA busy_timeout = ${Math.max(0, Math.trunc(options.busyTimeoutMs ?? 10_000))}`);
    if (file !== ":memory:") {
      this.sqlite.exec("PRAGMA journal_mode = WAL");
      this.sqlite.exec("PRAGMA synchronous = FULL");
      fs.chmodSync(file, 0o600);
    }
    this.migrate(migrations);
  }

  /** Applies every migration not yet recorded, in name order, each in its own transaction. Returns the names applied. */
  migrate(migrations: readonly Migration[]): string[] {
    this.sqlite.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT NOT NULL)`);
    const done = new Set((this.sqlite.prepare(`SELECT name FROM d1_migrations`).all() as { name: string }[]).map((r) => r.name));
    const applied: string[] = [];
    for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
      if (done.has(m.name)) continue;
      this.sqlite.exec("BEGIN IMMEDIATE");
      try {
        // W35: the intake and the forwarder open the same file at the same moment (rfq-units starts both). The other
        // process may have applied this migration while we waited for the write lock: re-check under the lock.
        if (this.sqlite.prepare(`SELECT 1 FROM d1_migrations WHERE name = ?`).get(m.name)) {
          this.sqlite.exec("COMMIT");
          continue;
        }
        this.sqlite.exec(m.sql);
        this.sqlite.prepare(`INSERT INTO d1_migrations (name, applied_at) VALUES (?, ?)`).run(m.name, new Date().toISOString());
        this.sqlite.exec("COMMIT");
      } catch (err) {
        this.sqlite.exec("ROLLBACK");
        throw new Error(`migration ${m.name} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      applied.push(m.name);
    }
    return applied;
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
        return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) }, results: [] };
      },
      exec: () => db.prepare(sql).run(...norm(params)),
    });
    return stmt([]);
  }

  async batch(statements: { exec: () => unknown }[]) {
    this.batchCalls++;
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const out = statements.map((s) => s.exec());
      this.sqlite.exec("COMMIT");
      return out.map((r) => ({ success: true, meta: { changes: Number((r as { changes?: number | bigint } | undefined)?.changes ?? 0) }, results: [] }));
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }

  async exec(sql: string) {
    this.sqlite.exec(sql);
    return { count: 0, duration: 0 };
  }

  /** Synchronous helper (tests, the admin view, the maintenance jobs). */
  q<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
    return this.sqlite.prepare(sql).all(...norm(params)).map((r) => ({ ...r })) as T[];
  }

  close(): void {
    this.sqlite.close();
  }

  asD1(): D1Database {
    return this as unknown as D1Database;
  }
}
