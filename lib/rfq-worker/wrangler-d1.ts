import { spawnSync } from "node:child_process";

/**
 * A minimal D1Database-compatible adapter that runs SQL through
 * `wrangler d1 execute --remote --json` — the CI fallback reconciler's
 * database access (architecture V1.1 §4.3). Parameters are inlined as SQL
 * literals by `inlineParams` (strings quoted with '' escaping; numbers,
 * booleans, NULL), and a batch is sent as ONE multi-statement command.
 * Node/CI only; never bundled into a Worker.
 */
export type SqlParam = string | number | boolean | null | undefined;

export function sqlLiteral(value: SqlParam): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite SQL parameter");
    return String(value);
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Replaces `?` and `?NNN` placeholders outside string literals with literals. */
export function inlineParams(sql: string, params: SqlParam[]): string {
  let out = "";
  let next = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      const end = sql.indexOf("'", i + 1);
      out += sql.slice(i, end + 1);
      i = end;
      continue;
    }
    if (ch === "?") {
      const m = /^\?(\d+)/.exec(sql.slice(i));
      if (m) {
        out += sqlLiteral(params[Number(m[1]) - 1]);
        i += m[0].length - 1;
      } else {
        out += sqlLiteral(params[next++]);
      }
      continue;
    }
    out += ch;
  }
  return out;
}

export interface WranglerD1Options {
  database: string;
  config: string;
  env?: string;
  cwd?: string;
}

interface WranglerResult {
  results: Record<string, unknown>[];
  meta?: { changes?: number };
  success?: boolean;
}

function execute(options: WranglerD1Options, sql: string): WranglerResult[] {
  const args = ["wrangler", "d1", "execute", options.database, "--remote", "--json", "--config", options.config, "--command", sql];
  if (options.env) args.push("--env", options.env);
  const proc = spawnSync("npx", args, { cwd: options.cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (proc.status !== 0) throw new Error(`wrangler d1 execute failed: ${(proc.stderr || proc.stdout).slice(0, 500)}`);
  const start = proc.stdout.indexOf("[");
  return JSON.parse(proc.stdout.slice(start)) as WranglerResult[];
}

class Statement {
  private readonly options: WranglerD1Options;
  readonly sql: string;
  readonly params: SqlParam[];
  constructor(options: WranglerD1Options, sql: string, params: SqlParam[] = []) {
    this.options = options;
    this.sql = sql;
    this.params = params;
  }
  bind(...params: SqlParam[]) {
    return new Statement(this.options, this.sql, params);
  }
  toSql() {
    return inlineParams(this.sql, this.params);
  }
  async all<T = Record<string, unknown>>() {
    const [r] = execute(this.options, this.toSql());
    return { results: (r?.results ?? []) as T[], success: true, meta: r?.meta ?? {} };
  }
  async first<T = Record<string, unknown>>(column?: string) {
    const { results } = await this.all<Record<string, unknown>>();
    const row = results[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
  async run() {
    const [r] = execute(this.options, this.toSql());
    return { success: true, meta: r?.meta ?? {}, results: [] };
  }
}

export function wranglerD1(options: WranglerD1Options): D1Database {
  return {
    prepare: (sql: string) => new Statement(options, sql),
    batch: async (statements: Statement[]) => {
      const results = execute(options, statements.map((s) => s.toSql().trim().replace(/;$/, "")).join(";\n"));
      return results.map((r) => ({ success: true, results: r.results ?? [], meta: r.meta ?? {} }));
    },
  } as unknown as D1Database;
}
