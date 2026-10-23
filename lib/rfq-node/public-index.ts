import fs from "node:fs";
import { rfqVariantIndexRow } from "../contracts/snapshot-v1.ts";
import { SNAPSHOT_VERSION_PATTERN } from "../contracts/snapshot-version.ts";
import type { NodeD1 } from "./sqlite-d1.ts";

/**
 * W32 (W29 P2 §3.1): DB_PUBLIC for the domestic intake. The Worker reads `rfq_variant_index` + `publication_pointer`
 * from D1, which content-publish fills from the artifact's private-snapshot/rfq-variant-index.json. On iransrv the
 * same file arrives inside the signed bundle (`current/private/rfq-variant-index.json`, deploy/iran) and is loaded
 * here into a local SQLite file built from the SAME migrations_public/ — at start and on SIGHUP (the activator sends
 * one after each activation).
 *
 * The last `keep` snapshot versions stay (by load order), so a visitor whose page is a few publishes old still has
 * their variants resolved against the snapshot they saw — the D1 retention behaviour (variant-index.ts). The loaded
 * version becomes the active one, as the pointer switch does on www.
 */
export const KEEP_VERSIONS = 5;

export interface LoadResult {
  version: string;
  rows: number;
  kept: string[];
  changed: boolean;
}

export function loadVariantIndex(db: NodeD1, file: string, now: Date = new Date(), keep = KEEP_VERSIONS): LoadResult {
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { snapshot_version?: unknown; rows?: unknown };
  const version = String(doc.snapshot_version ?? "");
  if (!SNAPSHOT_VERSION_PATTERN.test(version) || !Array.isArray(doc.rows)) throw new Error("rfq-variant-index.json: not a snapshot.v1 variant index");
  const rows = doc.rows.map((r) => rfqVariantIndexRow.parse(r));
  if (rows.some((r) => r.snapshot_version !== version)) throw new Error("rfq-variant-index.json: a row names another snapshot version");
  const at = now.toISOString();
  const sql = db.sqlite;
  const active = (sql.prepare(`SELECT active_version FROM publication_pointer WHERE id = 1`).get() as { active_version?: string } | undefined)?.active_version;
  const known = sql.prepare(`SELECT 1 FROM publication_state WHERE version = ?`).get(version);
  if (active === version && known) return { version, rows: rows.length, kept: listVersions(db), changed: false };
  sql.exec("BEGIN IMMEDIATE");
  try {
    sql.prepare(`UPDATE publication_state SET status = 'superseded', updated_at = ? WHERE status = 'active'`).run(at);
    sql.prepare(`INSERT INTO publication_state (version, created_at, status, updated_at) VALUES (?, ?, 'active', ?) ON CONFLICT(version) DO UPDATE SET status = 'active', updated_at = excluded.updated_at`).run(version, at, at);
    sql.prepare(`DELETE FROM rfq_variant_index WHERE snapshot_version = ?`).run(version);
    const ins = sql.prepare(`INSERT INTO rfq_variant_index (snapshot_version, locale, canonical_variant_id, template_id, group_code, allowed_units, selection_json) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const r of rows) ins.run(r.snapshot_version, r.locale, r.canonical_variant_id, r.template_id, r.group_code ?? null, JSON.stringify(r.allowed_units), r.selection_json);
    sql.prepare(`INSERT INTO publication_pointer (id, active_version, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET active_version = excluded.active_version, updated_at = excluded.updated_at`).run(version, at);
    // Keep the newest `keep` versions (by the time this server loaded them); older rows go.
    const old = (sql.prepare(`SELECT version FROM publication_state ORDER BY updated_at DESC, version DESC LIMIT -1 OFFSET ?`).all(keep) as { version: string }[]).map((r) => r.version).filter((v) => v !== version);
    for (const v of old) {
      sql.prepare(`DELETE FROM rfq_variant_index WHERE snapshot_version = ?`).run(v);
      sql.prepare(`DELETE FROM publication_state WHERE version = ?`).run(v);
    }
    sql.exec("COMMIT");
  } catch (err) {
    sql.exec("ROLLBACK");
    throw err;
  }
  return { version, rows: rows.length, kept: listVersions(db), changed: true };
}

export function listVersions(db: NodeD1): string[] {
  return db.q<{ version: string }>(`SELECT version FROM publication_state ORDER BY updated_at DESC, version DESC`).map((r) => r.version);
}
