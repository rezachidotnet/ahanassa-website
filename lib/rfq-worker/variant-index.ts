import type { RfqCatalogSelection } from "../catalog/editorial-repository.ts";

export interface ResolvedVariant {
  selection: RfqCatalogSelection;
  /** The snapshot the variant was resolved from. */
  snapshotVersion: string;
  /** In the submitted snapshot but not in the active one — accepted and flagged (architecture §6.1). */
  unpublishedAtReceipt: boolean;
}

export interface VariantResolution {
  activeVersion: string | null;
  variants: Map<string, ResolvedVariant>;
}

/**
 * Resolves every catalog variant of one RFQ with ONE indexed query on
 * DB_PUBLIC `rfq_variant_index` (architecture V1.1 §6.1, A8): rows of the
 * submitted snapshot version AND of the active version are read together.
 * The submitted version wins while it is retained; a variant present only in
 * the submitted version is accepted with `unpublishedAtReceipt`; a variant
 * in neither is unknown. A submitted version that is no longer retained
 * falls back to the active version.
 */
export async function resolveVariantsFromIndex(db: D1Database, locale: string, variantIds: string[], submittedVersion: string | null): Promise<VariantResolution> {
  const unique = [...new Set(variantIds)];
  const placeholders = unique.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT p.active_version, i.canonical_variant_id, i.snapshot_version, i.selection_json
       FROM publication_pointer p
       LEFT JOIN rfq_variant_index i
         ON i.locale = ? AND i.snapshot_version IN (?, p.active_version)${unique.length ? ` AND i.canonical_variant_id IN (${placeholders})` : " AND 0"}
       WHERE p.id = 1`,
    )
    .bind(locale, submittedVersion ?? "", ...unique)
    .all<{ active_version: string; canonical_variant_id: string | null; snapshot_version: string | null; selection_json: string | null }>();

  const activeVersion = results[0]?.active_version ?? null;
  const byId = new Map<string, { submitted?: string; active?: string }>();
  for (const r of results) {
    if (!r.canonical_variant_id || !r.selection_json) continue;
    const entry = byId.get(r.canonical_variant_id) ?? {};
    if (submittedVersion && r.snapshot_version === submittedVersion) entry.submitted = r.selection_json;
    if (r.snapshot_version === r.active_version) entry.active = r.selection_json;
    byId.set(r.canonical_variant_id, entry);
  }
  const variants = new Map<string, ResolvedVariant>();
  for (const [id, entry] of byId) {
    const json = entry.submitted ?? entry.active;
    if (!json) continue;
    variants.set(id, {
      selection: JSON.parse(json) as RfqCatalogSelection,
      snapshotVersion: entry.submitted ? (submittedVersion as string) : (activeVersion as string),
      unpublishedAtReceipt: Boolean(entry.submitted && !entry.active),
    });
  }
  return { activeVersion, variants };
}
