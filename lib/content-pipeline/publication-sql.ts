import type { RfqVariantIndexRow, SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { sqlLiteral, type SqlParam } from "../rfq-worker/wrangler-d1.ts";

/**
 * DB_PUBLIC publication SQL (architecture V1.1 §5.1, §7.1 step 7, §7.2).
 * Pure builders; scripts/content/* execute each returned string as ONE
 * multi-statement `wrangler d1 execute --command` (one D1 /query call, which
 * is atomic: W2 evidence wrangler-batch-atomicity.txt). Strings stay under
 * `maxBytes` so they fit D1's statement limit and a single argv entry.
 *
 * The schema the RFQ Worker reads (publication_state, publication_pointer,
 * rfq_variant_index; migrations_public/0012) is NOT changed.
 */
export const DEFAULT_MAX_BATCH_BYTES = 90_000;

function insert(table: string, row: Record<string, SqlParam>, verb = "INSERT"): string {
  const cols = Object.keys(row);
  return `${verb} INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => sqlLiteral(row[c])).join(", ")})`;
}

/** Groups statements into `;`-joined batches of at most maxBytes (a single statement is never split). */
export function batchStatements(statements: readonly string[], maxBytes = DEFAULT_MAX_BATCH_BYTES): string[] {
  const batches: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const s of statements) {
    const bytes = Buffer.byteLength(s) + 2;
    if (bytes > maxBytes) throw new Error(`statement of ${bytes} bytes exceeds the ${maxBytes}-byte batch limit`);
    if (size + bytes > maxBytes && current.length) {
      batches.push(current.join(";\n") + ";");
      current = [];
      size = 0;
    }
    current.push(s);
    size += bytes;
  }
  if (current.length) batches.push(current.join(";\n") + ";");
  return batches;
}

/** Step 7a: the version's publication_state row, status `staged` (never touches the pointer). */
export function stagedStateSql(input: { version: string; manifestSha256: string; createdAt: string; counts: Record<string, number>; now: string }): string {
  // ON CONFLICT DO NOTHING: an existing row for this version is never overwritten (versions are unique and monotonic).
  return `${insert("publication_state", { version: input.version, manifest_sha256: input.manifestSha256, created_at: input.createdAt, source_counts: JSON.stringify(input.counts), status: "staged", updated_at: input.now })} ON CONFLICT(version) DO NOTHING;`;
}

/** Step 7b: rfq_variant_index rows for the staged version, batched. */
export function variantIndexBatches(rows: readonly RfqVariantIndexRow[], maxBytes = DEFAULT_MAX_BATCH_BYTES): string[] {
  return batchStatements(
    rows.map((r) => insert("rfq_variant_index", { snapshot_version: r.snapshot_version, locale: r.locale, canonical_variant_id: r.canonical_variant_id, template_id: r.template_id, group_code: r.group_code, allowed_units: JSON.stringify(r.allowed_units), selection_json: r.selection_json }, "INSERT OR REPLACE")),
    maxBytes,
  );
}

/**
 * Step 7d: the pointer switch — atomic. Guarded: the new version must be `staged` and the pointer must
 * still be on `expectedActive` (no concurrent publish); otherwise nothing changes (0 rows).
 */
export function switchPointerSql(version: string, expectedActive: string | null, now: string): string {
  const v = sqlLiteral(version);
  const t = sqlLiteral(now);
  const guard = `EXISTS (SELECT 1 FROM publication_state WHERE version = ${v} AND status = 'staged') AND ${expectedActive === null ? "NOT EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1)" : `EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1 AND active_version = ${sqlLiteral(expectedActive)})`}`;
  return [
    `UPDATE publication_state SET status = 'superseded', updated_at = ${t} WHERE status = 'active' AND version <> ${v} AND ${guard}`,
    `INSERT INTO publication_pointer (id, active_version, updated_at) SELECT 1, ${v}, ${t} WHERE ${guard} ON CONFLICT(id) DO UPDATE SET active_version = excluded.active_version, updated_at = excluded.updated_at`,
    `UPDATE publication_state SET status = 'active', updated_at = ${t} WHERE version = ${v} AND status = 'staged' AND EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1 AND active_version = ${v})`,
  ].join(";\n") + ";";
}

/** §7.2: smoke failed after the switch — the pointer returns to the previous version, the new one is `failed`. */
export function restorePointerSql(previous: string, failed: string, now: string): string {
  const t = sqlLiteral(now);
  return [
    `UPDATE publication_pointer SET active_version = ${sqlLiteral(previous)}, updated_at = ${t} WHERE id = 1 AND EXISTS (SELECT 1 FROM publication_state WHERE version = ${sqlLiteral(previous)})`,
    `UPDATE publication_state SET status = 'active', updated_at = ${t} WHERE version = ${sqlLiteral(previous)}`,
    `UPDATE publication_state SET status = 'failed', updated_at = ${t} WHERE version = ${sqlLiteral(failed)}`,
  ].join(";\n") + ";";
}

/** §7.2: failure BEFORE the switch — the staged version is marked failed and its index rows removed; the pointer is not touched. */
export function failStagedSql(version: string, now: string): string {
  return [
    `UPDATE publication_state SET status = 'failed', updated_at = ${sqlLiteral(now)} WHERE version = ${sqlLiteral(version)} AND status = 'staged'`,
    `DELETE FROM rfq_variant_index WHERE snapshot_version = ${sqlLiteral(version)} AND NOT EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1 AND active_version = ${sqlLiteral(version)})`,
  ].join(";\n") + ";";
}

/**
 * §5.1 retention: keep the newest `retain` USABLE versions (active/superseded/staged, by created_at, then
 * version) plus the active one; `failed` versions never count and are always removed; everything else is
 * deleted (state row + index rows). Pure selection; run only AFTER a successful switch.
 */
export function versionsToPrune(versions: ReadonlyArray<{ version: string; created_at: string; status: string }>, active: string, retain: number): string[] {
  const ordered = [...versions].sort((a, b) => (a.created_at === b.created_at ? (a.version < b.version ? 1 : -1) : a.created_at < b.created_at ? 1 : -1));
  const keep = new Set(ordered.filter((v) => v.status !== "failed").slice(0, retain).map((v) => v.version));
  keep.add(active);
  return ordered.filter((v) => !keep.has(v.version)).map((v) => v.version);
}

export function pruneSql(versions: readonly string[], active: string): string | null {
  const doomed = versions.filter((v) => v !== active);
  if (!doomed.length) return null;
  const list = doomed.map((v) => sqlLiteral(v)).join(", ");
  return [`DELETE FROM rfq_variant_index WHERE snapshot_version IN (${list})`, `DELETE FROM publication_state WHERE version IN (${list}) AND status <> 'active'`].join(";\n") + ";";
}

/**
 * After the switch: the DB_PUBLIC catalog tables (build INPUTS only, §5.1 — no page or Worker reads
 * them) mirror the published snapshot, so the next publish starts from them. ONLY Odoo-owned columns
 * and sync bookkeeping are written; Website-owned editorial columns/tables are never overwritten
 * (a new row is inserted whole, with the not-public defaults). Categories are replaced per locale.
 */
const VARIANT_ODOO_COLUMNS = ["product_id", "xid", "sku", "commercial_name", "commercial_size", "section_size", "schedule", "family_code", "family_name", "group_code", "group_name", "form_code", "form_name", "grade_code", "grade_name", "standard_code", "standard_name", "dimensions_json", "nominal_weight_json", "allowed_commercial_units", "inventory_uom", "catalog_updated_at", "is_active", "sync_status", "sync_version", "last_synced_at", "updated_at"];
const PRODUCT_ODOO_COLUMNS = ["template_xid", "is_active", "sync_status", "last_synced_at", "updated_at"];
const GROUP_ODOO_COLUMNS = ["name", "sequence", "is_active", "source_updated_at", "synced_at", "updated_at"];

function upsert(table: string, row: Record<string, SqlParam>, updateColumns: readonly string[]): string {
  return `${insert(table, row)} ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((c) => `"${c}" = excluded."${c}"`).join(", ")}`;
}

export function mirrorStatements(tables: SnapshotV1["tables"]): string[] {
  const statements: string[] = [];
  for (const p of tables.catalog_products) statements.push(upsert("catalog_products", p as unknown as Record<string, SqlParam>, PRODUCT_ODOO_COLUMNS));
  for (const v of tables.product_variants) statements.push(upsert("product_variants", v as unknown as Record<string, SqlParam>, VARIANT_ODOO_COLUMNS));
  for (const g of tables.public_processing_groups) statements.push(upsert("public_processing_groups", g as unknown as Record<string, SqlParam>, GROUP_ODOO_COLUMNS));
  return statements;
}

/** Categories: one atomic replace per locale (delete + insert in the same batch, like the former category sync). */
export function categoryReplaceBatches(tables: SnapshotV1["tables"], maxBytes = DEFAULT_MAX_BATCH_BYTES): string[] {
  const out: string[] = [];
  for (const locale of ["fa", "en", "ar"] as const) {
    const rows = tables.catalog_public_categories.filter((c) => c.locale === locale);
    if (!rows.length) continue;
    const batch = batchStatements([`DELETE FROM catalog_public_categories WHERE locale = ${sqlLiteral(locale)}`, ...rows.map((r) => insert("catalog_public_categories", r as unknown as Record<string, SqlParam>))], maxBytes);
    if (batch.length !== 1) throw new Error(`categories ${locale} do not fit one atomic batch`);
    out.push(batch[0]);
  }
  return out;
}
