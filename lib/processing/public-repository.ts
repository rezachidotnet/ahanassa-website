import { getPublicDb } from "@/lib/db/public";
import type { Locale } from "@/config/locales";

/**
 * Server-only Processing Group PUBLIC read model (task §16/§17) — the ONLY
 * module a future Header (P6) may read Processing data from. Reads
 * DB_PUBLIC only; never imports `lib/processing/odoo-api-client.ts` or any
 * other network-capable module, and issues no `fetch()` call of its own —
 * see `network-isolation.test.ts` for a static proof of this file's actual
 * import graph and source text, not just a design intention documented in
 * prose. This is the dependency boundary task §26 asks for:
 *
 *   Header/P6 -> lib/processing/public-repository.ts -> D1
 *
 *   NEVER: Header -> lib/processing/odoo-api-client.ts (or any Odoo adapter)
 *
 * Mirrors `lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`'s
 * own shape/role exactly (locale-scoped, publication-gated, minimal return
 * type) — this repo's already-established pattern for "Header dropdown data
 * source," reused rather than reinvented.
 */

export interface PublicProcessingGroup {
  id: string;
  name: string;
  sequence: number;
}

/**
 * Frozen Header V2.1 §72.1 hard cap — shared with
 * `lib/catalog/editorial-repository.ts#MAX_HEADER_PRODUCT_SHORTCUTS`
 * conceptually (both dropdown panels are capped at 8 direct shortcuts),
 * kept as a separate constant here rather than a shared import since the
 * two read models are independent domains with independent evolution
 * paths — a future change to one cap must not silently change the other.
 */
export const MAX_HEADER_SERVICE_SHORTCUTS = 8;

interface PublicProcessingGroupRow {
  code: string;
  name: string;
  sequence: number;
}

/**
 * Deterministic `sequence, code` ordering (task §16 — the trailing `code`
 * tiebreak makes ordering fully deterministic even if two groups ever share
 * a `sequence` value, never relying on SQLite's unspecified row order for
 * ties). Filters `is_active = 0` (withdrawn) rows. An empty array is a
 * valid result (task §16 "empty array is valid") — never a hardcoded
 * fallback list (§16 "no frontend hardcode fallback"; the prohibited
 * pattern task §26 of docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md itself
 * describes, and exactly what the current `lib/content/nav.ts#headerServiceGroups`
 * constant is — see this task's own §19 inventory note, not touched here).
 *
 * No Odoo network access — see file header. `id` in the returned shape is
 * the Processing Group's stable `code` (task §17's minimal target shape
 * names the field `id`; DB_PUBLIC's own column is named `code` to avoid
 * colliding with the table's internal ULID `id` primary key — mapped here).
 */
export async function listPublicProcessingGroups(locale: Locale): Promise<PublicProcessingGroup[]> {
  const db = getPublicDb();
  const result = await db
    .prepare(`SELECT code, name, sequence FROM public_processing_groups WHERE locale = ? AND is_active = 1 ORDER BY sequence ASC, code ASC`)
    .bind(locale)
    .all<PublicProcessingGroupRow>();

  return (result.results ?? []).map((row) => ({ id: row.code, name: row.name, sequence: row.sequence })).slice(0, MAX_HEADER_SERVICE_SHORTCUTS);
}
