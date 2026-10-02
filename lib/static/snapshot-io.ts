import crypto from "node:crypto";
import fs from "node:fs";
import { snapshotV1, SNAPSHOT_TABLES, SNAPSHOT_SCHEMA_VERSION, type SnapshotV1, type SnapshotTableName } from "../contracts/snapshot-v1.ts";

/**
 * snapshot.v1 file I/O (Node only — build/CI tooling, never bundled into a
 * Worker or the browser). `snapshot_version` is derived from the content:
 * `snap-` + the first 16 hex chars of SHA-256 over the canonical tables
 * JSON (tables in SNAPSHOT_TABLES order, keys sorted, rows sorted by their
 * JSON text), so the same data always yields the same version.
 */
export function canonicalTablesJson(tables: SnapshotV1["tables"]): string {
  const ordered: Record<string, unknown[]> = {};
  for (const name of Object.keys(SNAPSHOT_TABLES) as SnapshotTableName[]) {
    const rows = (tables[name] ?? []).map((r) => {
      const keys = Object.keys(r).sort();
      return JSON.stringify(Object.fromEntries(keys.map((k) => [k, (r as Record<string, unknown>)[k]])));
    });
    ordered[name] = rows.sort().map((t) => JSON.parse(t));
  }
  return JSON.stringify(ordered);
}

export function computeSnapshotVersion(tables: SnapshotV1["tables"]): string {
  return `snap-${crypto.createHash("sha256").update(canonicalTablesJson(tables)).digest("hex").slice(0, 16)}`;
}

export function parseSnapshot(raw: unknown): SnapshotV1 {
  const parsed = snapshotV1.parse(raw);
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
