import { BUILD_ONLY_SNAPSHOT_TABLES, SNAPSHOT_TABLES, type SnapshotV1 } from "../contracts/snapshot-v1.ts";

/**
 * The DB_PUBLIC side of a publish, read READ-ONLY before the build:
 *
 * 1. The Website-owned editorial layer (owner decision 2026-10-03; ownership
 *    per docs/CATALOG_EDITORIAL_PUBLICATION.md §1): SEO/page rows, publish
 *    state, `is_public` switches, `name_fa`/`slug_fa`, redirects, homepage
 *    rank — and the stable row ids the previous publications used. Odoo does
 *    not supply any of it; scripts/catalog-editorial.ts writes it.
 * 2. The publication state: the active pointer and every retained version
 *    with its recorded counts (for the decrease gate and version ordering).
 */
export const D1_SOURCE_SCHEMA = "d1-source.v1" as const;

export interface PublicationVersionRow {
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
  manifest_sha256: string | null;
  source_counts: Record<string, number>;
}

export interface D1Source {
  schema: typeof D1_SOURCE_SCHEMA;
  read_at: string;
  /** DB_PUBLIC has no `published_prices` (W9.4: build-only snapshot table, fetched from Odoo every run). */
  tables: Omit<SnapshotV1["tables"], "published_prices" | "published_price_history">;
  publication: { active_version: string | null; versions: PublicationVersionRow[] };
}

/**
 * Tables read from DB_PUBLIC: every snapshot table that EXISTS in DB_PUBLIC (categories are re-fetched from
 * Odoo but read for completeness). Build-only snapshot tables (W9.4 `published_prices`) have no DB_PUBLIC
 * table — they come from Odoo on every run — and are never read here (run 37937272256: "no such table").
 */
export const D1_SOURCE_TABLES = (Object.keys(SNAPSHOT_TABLES) as (keyof typeof SNAPSHOT_TABLES)[]).filter((t) => !BUILD_ONLY_SNAPSHOT_TABLES.has(t));

export function selectTableSql(table: keyof typeof SNAPSHOT_TABLES): string {
  const columns = Object.keys((SNAPSHOT_TABLES[table] as unknown as { shape: Record<string, unknown> }).shape);
  return `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${table}"`;
}

export async function readD1Source(db: D1Database): Promise<D1Source> {
  const tables = {} as Record<string, unknown[]>;
  for (const table of D1_SOURCE_TABLES) {
    const { results } = await db.prepare(selectTableSql(table)).all();
    tables[table] = results.map((r) => ({ ...r }));
  }
  const pointer = await db.prepare(`SELECT active_version FROM publication_pointer WHERE id = 1`).first<{ active_version: string }>();
  const { results: versions } = await db
    .prepare(`SELECT version, status, created_at, updated_at, manifest_sha256, source_counts FROM publication_state ORDER BY created_at, version`)
    .all<{ version: string; status: string; created_at: string; updated_at: string; manifest_sha256: string | null; source_counts: string }>();
  return {
    schema: D1_SOURCE_SCHEMA,
    read_at: new Date().toISOString(),
    tables: tables as D1Source["tables"],
    publication: {
      active_version: pointer?.active_version ?? null,
      versions: versions.map((v) => ({ ...v, source_counts: parseCounts(v.source_counts) })),
    },
  };
}

function parseCounts(text: string): Record<string, number> {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(([, n]) => typeof n === "number")) as Record<string, number>;
  } catch {
    return {};
  }
}

export function activeCounts(source: D1Source): Record<string, number> | null {
  const active = source.publication.versions.find((v) => v.version === source.publication.active_version);
  return active ? active.source_counts : null;
}
