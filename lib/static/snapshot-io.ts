import crypto from "node:crypto";
import fs from "node:fs";
import { snapshotV1, SNAPSHOT_TABLES, SNAPSHOT_SCHEMA_VERSION, type SnapshotV1, type SnapshotTableName } from "../contracts/snapshot-v1.ts";

/**
 * snapshot.v1 file I/O (Node only — build/CI tooling, never bundled into a
 * Worker or the browser). The content hash is SHA-256 over the canonical
 * tables JSON (tables in SNAPSHOT_TABLES order, keys sorted, rows sorted by
 * their JSON text), so the same data always yields the same hash.
 *
 * - Legacy (pre-W4 fixture): `snapshot_version` = `snap-` + the first 16 hex
 *   chars of that hash.
 * - Pipeline (W4): `snapshot_version` is assigned and monotonic
 *   (lib/content-pipeline/version.ts) and `content_sha256` carries the hash.
 */
const OMIT_WHEN_EMPTY: ReadonlySet<string> = new Set(["published_prices", "published_price_history", "published_articles"]);

export function canonicalTablesJson(tables: SnapshotV1["tables"]): string {
  const ordered: Record<string, unknown[]> = {};
  for (const name of Object.keys(SNAPSHOT_TABLES) as SnapshotTableName[]) {
    // W9.4: an empty optional table is left out, so every snapshot made before it existed keeps its hash/version.
    if (OMIT_WHEN_EMPTY.has(name) && !(tables[name] ?? []).length) continue;
    const rows = (tables[name] ?? []).map((r) => {
      const keys = Object.keys(r).sort();
      return JSON.stringify(Object.fromEntries(keys.map((k) => [k, (r as Record<string, unknown>)[k]])));
    });
    ordered[name] = rows.sort().map((t) => JSON.parse(t));
  }
  return JSON.stringify(ordered);
}

export function computeContentSha256(tables: SnapshotV1["tables"]): string {
  return crypto.createHash("sha256").update(canonicalTablesJson(tables)).digest("hex");
}

export function computeSnapshotVersion(tables: SnapshotV1["tables"]): string {
  return `snap-${computeContentSha256(tables).slice(0, 16)}`;
}

/** Validates the schema and proves the content (content_sha256, or the legacy content-derived version). */
export function parseSnapshot(raw: unknown): SnapshotV1 {
  const parsed = snapshotV1.parse(raw);
  if (parsed.content_sha256 !== undefined) {
    const expected = computeContentSha256(parsed.tables);
    if (parsed.content_sha256 !== expected) throw new Error(`content_sha256 ${parsed.content_sha256} does not match its content (${expected})`);
    return parsed;
  }
  const expected = computeSnapshotVersion(parsed.tables);
  if (parsed.snapshot_version !== expected) {
    throw new Error(`snapshot_version ${parsed.snapshot_version} does not match its content (${expected})`);
  }
  return parsed;
}

export function readSnapshotFile(path: string): SnapshotV1 {
  return parseSnapshot(JSON.parse(fs.readFileSync(path, "utf8")));
}

export function buildSnapshot(tables: SnapshotV1["tables"], source: SnapshotV1["source"], createdAt = new Date().toISOString()): SnapshotV1 {
  return parseSnapshot({ schema_version: SNAPSHOT_SCHEMA_VERSION, snapshot_version: computeSnapshotVersion(tables), created_at: createdAt, source, tables });
}

/** A pipeline snapshot (W4): assigned monotonic version, content proven by `content_sha256`. */
export function buildVersionedSnapshot(tables: SnapshotV1["tables"], source: SnapshotV1["source"], snapshotVersion: string, createdAt: string): SnapshotV1 {
  return parseSnapshot({ schema_version: SNAPSHOT_SCHEMA_VERSION, snapshot_version: snapshotVersion, content_sha256: computeContentSha256(tables), created_at: createdAt, source, tables });
}
