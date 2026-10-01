// Spike S1: convert a read-only `wrangler d1 export` of DB_PUBLIC into a JSON fixture
// { exported_at, source, schema: [CREATE ...], tables: { name: { columns, rows } } }.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

const [, , sqlPath, outPath, source] = process.argv;
const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(sqlPath, "utf8"));
const objs = db
  .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND tbl_name != 'd1_migrations' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name")
  .all();
const tables = {};
for (const o of objs.filter((o) => o.type === "table")) {
  const columns = db.prepare(`SELECT name FROM pragma_table_info('${o.name}')`).all().map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM "${o.name}"`).all().map((r) => columns.map((c) => r[c]));
  tables[o.name] = { columns, rows };
}
fs.writeFileSync(outPath, JSON.stringify({ exported_at: new Date().toISOString(), source, schema: objs.map((o) => o.sql), tables }));
for (const [n, t] of Object.entries(tables)) console.log(n, t.rows.length);
