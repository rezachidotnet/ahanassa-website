import type { RfqCatalogSelection } from "@/lib/catalog/editorial-repository";

export interface ResolvedVariant {
  selection: RfqCatalogSelection;
  /** Snapshot the variant was resolved from. */
  snapshotVersion: string;
  /** Present in the submitted snapshot but no longer in the active one (RC1 §6.1: accept + flag). */
  unpublishedAtReceipt: boolean;
}

/**
 * Spike S1 — resolves every catalog variant of one RFQ with ONE indexed D1
 * query against `rfq_variant_index` (architecture V1.1-RC1 §6.1): rows of
 * the submitted snapshot version AND of the active version are read
 * together; the submitted version wins when it is still retained, otherwise
 * the active version is used.
 */
export async function resolveVariantsFromIndex(
  db: D1Database,
  locale: string,
  xids: string[],
  submittedVersion: string | null,
): Promise<Map<string, ResolvedVariant>> {
  const out = new Map<string, ResolvedVariant>();
  if (xids.length === 0) return out;
  const unique = [...new Set(xids)];
  const placeholders = unique.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT i.variant_xid, i.snapshot_version, i.selection_json, p.active_version
       FROM rfq_variant_index i
       JOIN rfq_snapshot_pointer p ON p.id = 1
       WHERE i.locale = ? AND i.variant_xid IN (${placeholders})
         AND i.snapshot_version IN (?, p.active_version)`,
    )
    .bind(locale, ...unique, submittedVersion ?? "")
    .all<{ variant_xid: string; snapshot_version: string; selection_json: string; active_version: string }>();

  const byXid = new Map<string, { submitted?: string; active?: string; activeVersion: string }>();
  for (const r of results) {
    const e = byXid.get(r.variant_xid) ?? { activeVersion: r.active_version };
    if (submittedVersion && r.snapshot_version === submittedVersion) e.submitted = r.selection_json;
    if (r.snapshot_version === r.active_version) e.active = r.selection_json;
    byXid.set(r.variant_xid, e);
  }
  for (const [xid, e] of byXid) {
    const json = e.submitted ?? e.active;
    if (!json) continue;
    out.set(xid, {
      selection: JSON.parse(json) as RfqCatalogSelection,
      snapshotVersion: e.submitted ? submittedVersion! : e.activeVersion,
      unpublishedAtReceipt: Boolean(e.submitted && !e.active),
    });
  }
  return out;
}
