/**
 * DB_PUBLIC load SQL for one artifact (architecture V1.1 §5.1, §7.1 steps 7–8):
 * the snapshot.v1 tables, the rfq_variant_index rows, a publication_state row
 * (manifest SHA-256, counts) and — with --activate — the active pointer.
 * Idempotent (INSERT OR REPLACE), so a failed load can simply be re-run.
 *
 *   node scripts/static/snapshot-load-sql.ts <artifactDir> <out.sql> [--activate]
 *   npx wrangler d1 execute DB_PUBLIC --remote --config <cfg> --env staging --file <out.sql>
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest } from "../../lib/contracts/artifact-v1.ts";
import { parseSnapshot } from "../../lib/static/snapshot-io.ts";
import { sqlLiteral } from "../../lib/rfq-worker/wrangler-d1.ts";

const [artifactDir, outFile] = process.argv.slice(2);
const activate = process.argv.includes("--activate");
if (!artifactDir || !outFile) throw new Error("usage: snapshot-load-sql.ts <artifactDir> <out.sql> [--activate]");
const manifestText = fs.readFileSync(path.join(artifactDir, "manifest.json"), "utf8");
const manifest = artifactManifest.parse(JSON.parse(manifestText));
const snapshot = parseSnapshot(JSON.parse(fs.readFileSync(path.join(artifactDir, "private-snapshot/snapshot.json"), "utf8")));
if (snapshot.snapshot_version !== manifest.snapshot_version) throw new Error("snapshot/manifest version mismatch");

const lines: string[] = [];
for (const [table, rows] of Object.entries(snapshot.tables)) {
  for (const row of rows as Record<string, unknown>[]) {
    const cols = Object.keys(row);
    lines.push(`INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => sqlLiteral(row[c] as never)).join(", ")});`);
  }
}
lines.push(...fs.readFileSync(path.join(artifactDir, "private-snapshot/rfq-variant-index.sql"), "utf8").trim().split("\n").map((l) => l.replace(/^INSERT INTO/, "INSERT OR REPLACE INTO")));
const now = new Date().toISOString();
const manifestSha = crypto.createHash("sha256").update(manifestText).digest("hex");
lines.push(
  `INSERT OR REPLACE INTO publication_state (version, manifest_sha256, created_at, source_counts, status, updated_at) VALUES (${[snapshot.snapshot_version, manifestSha, snapshot.created_at, JSON.stringify(manifest.counts), activate ? "active" : "staged", now].map((v) => sqlLiteral(v)).join(", ")});`,
);
if (activate) {
  lines.push(`UPDATE publication_state SET status = 'superseded', updated_at = ${sqlLiteral(now)} WHERE status = 'active' AND version <> ${sqlLiteral(snapshot.snapshot_version)};`);
  lines.push(`INSERT INTO publication_pointer (id, active_version, updated_at) VALUES (1, ${sqlLiteral(snapshot.snapshot_version)}, ${sqlLiteral(now)}) ON CONFLICT(id) DO UPDATE SET active_version = excluded.active_version, updated_at = excluded.updated_at;`);
}
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(JSON.stringify({ snapshot_version: snapshot.snapshot_version, statements: lines.length, activate, manifest_sha256: manifestSha }));
