/**
 * Builds a snapshot.v1 file from a READ-ONLY `wrangler d1 export` of DB_PUBLIC
 * (fixture/dev path; the production pipeline builds snapshots from the Odoo
 * full fetch, architecture §7.1). Validates against lib/contracts/snapshot-v1.ts.
 *
 *   node scripts/static/snapshot-from-d1-export.ts <export.sql> <out.json> "<description>"
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { SNAPSHOT_TABLES, type SnapshotV1 } from "../../lib/contracts/snapshot-v1.ts";
import { buildSnapshot } from "../../lib/static/snapshot-io.ts";

const [sqlPath, outPath, description] = process.argv.slice(2);
if (!sqlPath || !outPath || !description) throw new Error("usage: snapshot-from-d1-export.ts <export.sql> <out.json> <description>");
const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(sqlPath, "utf8"));
const tables: Record<string, unknown[]> = {};
for (const name of Object.keys(SNAPSHOT_TABLES)) {
  const columns = Object.keys((SNAPSHOT_TABLES as Record<string, { shape: Record<string, unknown> }>)[name].shape);
  tables[name] = db.prepare(`SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${name}" ORDER BY rowid`).all().map((r) => ({ ...r }));
}
const fetchedAt = fs.statSync(sqlPath).mtime.toISOString();
const snapshot = buildSnapshot(tables as SnapshotV1["tables"], { kind: "d1_export", description, fetched_at: fetchedAt }, fetchedAt);
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 1) + "\n");
console.log(JSON.stringify({ snapshot_version: snapshot.snapshot_version, counts: Object.fromEntries(Object.entries(snapshot.tables).map(([k, v]) => [k, v.length])) }));
