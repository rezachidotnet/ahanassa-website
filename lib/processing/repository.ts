import { getPublicDb } from "@/lib/db/public";
import { ulid } from "@/lib/rfq/ulid";
import type { ProcessingLocale } from "./odoo-api-client";
import type { ExistingProcessingGroup, ProcessingGroupUpsert } from "./sync";

/**
 * DB_PUBLIC-backed repository for the Processing sync path ONLY — never
 * called from a public route (mirrors `lib/catalog/repository.ts`'s role
 * for the Catalog sync path exactly). Public reads live in
 * `lib/processing/public-repository.ts` instead, matching the Catalog
 * module's own `repository.ts` (sync) / `editorial-repository.ts` (public
 * reads) split.
 *
 * Security allow-list (task §6/§28): every statement below names its
 * columns explicitly — `code`, `name`, `sequence`, `source_updated_at`, plus
 * sync bookkeeping. An unexpected upstream JSON key (e.g. a hypothetical
 * `supplier_cost`) has no column to land in even if it reached this far;
 * `lib/processing/sync.ts`'s planner only ever produces a `ProcessingGroupUpsert`
 * (`code`/`name`/`sequence`/`sourceUpdatedAt`), so there is structurally no
 * path for an extra upstream field to reach D1 — see
 * `repository-allowlist.test.ts` for the explicit proof.
 */

interface ProcessingGroupRow {
  id: string;
  code: string;
  locale: ProcessingLocale;
  name: string;
  sequence: number;
  is_active: number;
  source_updated_at: string | null;
}

function mapRow(row: ProcessingGroupRow): ExistingProcessingGroup {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sequence: row.sequence,
    isActive: row.is_active === 1,
    sourceUpdatedAt: row.source_updated_at,
  };
}

/** Every row (active or withdrawn) for one locale — the sync orchestrator's diffing input. Never call from a public route. */
export async function getAllProcessingGroupsForSync(locale: ProcessingLocale): Promise<ExistingProcessingGroup[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT id, code, locale, name, sequence, is_active, source_updated_at FROM public_processing_groups WHERE locale = ?`)
    .bind(locale)
    .all<ProcessingGroupRow>();
  return (result.results ?? []).map(mapRow);
}

/** Inserts one new (code, locale) row. */
export async function createProcessingGroup(locale: ProcessingLocale, input: ProcessingGroupUpsert): Promise<void> {
  const db = getPublicDb();
  const id = ulid();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO public_processing_groups (id, code, locale, name, sequence, is_active, source_updated_at, synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    )
    .bind(id, input.code, locale, input.name, input.sequence, input.sourceUpdatedAt, now, now, now)
    .run();
}

/** Updates an existing row's Odoo-owned fields and unconditionally reactivates it (task §11 "republish" — mirrors `lib/catalog/repository.ts#updateVariantCommercialFields`'s own `is_active = 1` convention on every commercial update). */
export async function updateProcessingGroup(id: string, patch: ProcessingGroupUpsert): Promise<void> {
  const db = getPublicDb();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE public_processing_groups
       SET name = ?, sequence = ?, source_updated_at = ?, is_active = 1, synced_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(patch.name, patch.sequence, patch.sourceUpdatedAt, now, now, id)
    .run();
}

/** Soft-withdraws rows (task §11) — never DELETEs, mirrors `lib/catalog/repository.ts#deactivateVariants` exactly. */
export async function withdrawProcessingGroups(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getPublicDb();
  const now = new Date().toISOString();
  const placeholders = ids.map(() => "?").join(",");
  await db.prepare(`UPDATE public_processing_groups SET is_active = 0, synced_at = ?, updated_at = ? WHERE id IN (${placeholders})`).bind(now, now, ...ids).run();
}
