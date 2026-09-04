import type { ProcessingGroupApiItem, ProcessingGroupsApiMeta } from "./odoo-api-client.ts";

/**
 * Odoo Public Processing API -> DB_PUBLIC sync planning — pure functions
 * only (no D1, no live API call), mirroring `lib/catalog/sync.ts`'s own
 * pure/impure split (P5 §5 architectural decision: reuse the shared
 * D1-access/lease/repository *pattern*, but Processing's domain validation
 * and diffing are their own small adapter — see `lib/processing/sync-runner.ts`
 * file header for the full "why not reuse catalog/sync-safety.ts's ratio
 * guard unchanged" reasoning).
 *
 * Two validation layers exist, matching `lib/catalog/odoo-api-client.ts` +
 * `lib/catalog/sync.ts`'s own split: `odoo-api-client.ts#fetchProcessingGroups`
 * already rejects a structurally malformed envelope/item (wrong types,
 * empty-string identity, non-finite sequence) before this module ever sees
 * it. This module owns the DOMAIN rules that require seeing the whole batch
 * at once — duplicate identity across items, `meta.total` consistency — which
 * a single-item structural check cannot express.
 */

export interface ExistingProcessingGroup {
  /** DB_PUBLIC `public_processing_groups.id` (ULID) — never the sync identity itself. */
  id: string;
  /** Stable Processing Group code (task §3: never an Odoo integer ID). */
  code: string;
  name: string;
  sequence: number;
  isActive: boolean;
  sourceUpdatedAt: string | null;
}

export interface ProcessingGroupUpsert {
  code: string;
  name: string;
  sequence: number;
  sourceUpdatedAt: string;
}

export interface ProcessingSyncPlan {
  toCreate: ProcessingGroupUpsert[];
  toUpdate: Array<{ id: string; patch: ProcessingGroupUpsert }>;
  /** Existing DB_PUBLIC row ids to soft-withdraw (task §11 "soft withdrawal", never a DELETE — mirrors `lib/catalog/repository.ts#deactivateVariants`). */
  toWithdraw: string[];
  unchanged: string[];
}

export type ProcessingValidationResult = { valid: true; items: ProcessingGroupApiItem[] } | { valid: false; reasonCode: string };

/**
 * Domain-level validation across the whole batch (task §21). A structurally
 * malformed individual item never reaches here at all — rejected earlier by
 * `odoo-api-client.ts`'s per-item shape check — so this only needs to catch
 * batch-level inconsistencies a single-item check cannot see.
 *
 * A validated empty batch (`items: []`, `meta.total: 0`) passes both checks
 * below trivially and is returned as `valid: true` — this is the task §10
 * "authoritative empty response" distinction, enforced structurally rather
 * than via a special case: an empty batch is exactly as valid as a
 * non-empty one once it passes the same consistency rule every batch must
 * pass. See `sync.test.ts` for the explicit test proving this.
 */
export function validateProcessingGroupsBatch(items: ProcessingGroupApiItem[], meta: ProcessingGroupsApiMeta): ProcessingValidationResult {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      return { valid: false, reasonCode: "PROCESSING_DUPLICATE_IDENTITY" };
    }
    seen.add(item.id);
  }
  if (meta.total !== items.length) {
    return { valid: false, reasonCode: "PROCESSING_META_TOTAL_MISMATCH" };
  }
  return { valid: true, items };
}

/**
 * Diffs a validated upstream batch against DB_PUBLIC's currently-known rows
 * for ONE locale (the caller fetches/plans/applies per locale — the
 * upstream API itself is locale-scoped, task §3/§7). Never called with an
 * unvalidated batch — `sync-runner.ts` always calls
 * `validateProcessingGroupsBatch` first and only reaches this on `valid: true`.
 *
 * `existing` must be every row currently stored for this locale (active or
 * withdrawn) — a withdrawn row whose code reappears in a fresh valid batch
 * is republished via the same `toUpdate` path as any other change (task §11
 * "republish"), never a separate code path — its patch simply carries the
 * fresh name/sequence/timestamp and the repository layer's UPDATE
 * unconditionally sets `is_active = 1`, mirroring
 * `lib/catalog/repository.ts#updateVariantCommercialFields`'s own
 * `is_active = 1` convention on every commercial update.
 */
export function planProcessingGroupsSync(apiItems: ProcessingGroupApiItem[], existing: ExistingProcessingGroup[]): ProcessingSyncPlan {
  const byCode = new Map(existing.map((g) => [g.code, g]));
  const seenCodes = new Set<string>();

  const toCreate: ProcessingGroupUpsert[] = [];
  const toUpdate: ProcessingSyncPlan["toUpdate"] = [];
  const unchanged: string[] = [];

  for (const item of apiItems) {
    seenCodes.add(item.id);
    const sourceUpdatedAt = normalizeProcessingTimestamp(item.updated_at);
    const current = byCode.get(item.id);

    if (!current) {
      toCreate.push({ code: item.id, name: item.name, sequence: item.sequence, sourceUpdatedAt });
      continue;
    }

    const changed = !current.isActive || current.name !== item.name || current.sequence !== item.sequence || current.sourceUpdatedAt !== sourceUpdatedAt;
    if (!changed) {
      unchanged.push(current.id);
      continue;
    }

    toUpdate.push({ id: current.id, patch: { code: item.id, name: item.name, sequence: item.sequence, sourceUpdatedAt } });
  }

  const toWithdraw = existing.filter((g) => g.isActive && !seenCodes.has(g.code)).map((g) => g.id);

  return { toCreate, toUpdate, toWithdraw, unchanged };
}

/**
 * Best-effort normalization only — unlike `lib/catalog/sync.ts#normalizeCatalogTimestamp`
 * (whose raw Odoo format was verified live), the Processing API's actual
 * `updated_at` wire format is unverified (see `odoo-api-client.ts` file
 * header). This defensively handles both an already-ISO timestamp and
 * Odoo's known naive-UTC "YYYY-MM-DD HH:MM:SS" style (the Catalog API's
 * confirmed format) — re-verify against a real live response before this
 * is trusted further.
 */
export function normalizeProcessingTimestamp(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;
  return `${trimmed.replace(" ", "T")}.000Z`;
}
