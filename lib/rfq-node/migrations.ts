import fs from "node:fs";
import path from "node:path";

/**
 * W32: the SQL the domestic intake applies — the SAME files D1 gets (migrations/ for DB_OPS, migrations_public/ for
 * DB_PUBLIC), plus the IR-only buffer tables in lib/rfq-node/migrations/ (never applied to D1).
 *
 * Read from the repository when run from source (tests, `node services/rfq-ir/main.ts`). The bundled service
 * (scripts/iran/build-rfq-service.ts) replaces this module with the same files embedded as strings, so the server
 * needs no repository checkout and carries exactly the migrations of the code_sha it was built from.
 */
export interface Migration {
  name: string;
  sql: string;
}

const ROOT = path.resolve(import.meta.dirname, "../..");
export const MIGRATION_DIRS = {
  ops: path.join(ROOT, "migrations"),
  public: path.join(ROOT, "migrations_public"),
  ir: path.join(ROOT, "lib/rfq-node/migrations"),
} as const;

export function readMigrationDir(dir: string): Migration[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: fs.readFileSync(path.join(dir, name), "utf8") }));
}

/** Set by scripts/iran/build-rfq-service.ts (esbuild `define`): the migrations embedded in the one-file service. */
declare const __RFQ_IR_MIGRATIONS__: { ops: Migration[]; public: Migration[]; ir: Migration[] } | undefined;

export function loadMigrations(): { ops: Migration[]; public: Migration[]; ir: Migration[] } {
  if (typeof __RFQ_IR_MIGRATIONS__ !== "undefined") return __RFQ_IR_MIGRATIONS__;
  return { ops: readMigrationDir(MIGRATION_DIRS.ops), public: readMigrationDir(MIGRATION_DIRS.public), ir: readMigrationDir(MIGRATION_DIRS.ir) };
}
