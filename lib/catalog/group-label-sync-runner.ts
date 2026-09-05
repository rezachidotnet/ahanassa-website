import { fetchGroupLabelsForLocale } from "./group-label-sync.ts";
import { upsertCatalogGroupLabels } from "./repository.ts";
import type { CatalogLocale } from "./odoo-api-client.ts";

/**
 * NAV-P1 sync orchestrator — the only place that wires
 * `group-label-sync.ts` (fetch) → `repository.ts#upsertCatalogGroupLabels`
 * (persist), mirroring `lib/catalog/sync-runner.ts`'s own fetch → plan →
 * apply wiring role for the main catalog sync. Deliberately independent of
 * that sync's lease/watermark state machine: this is a small, side-effect-
 * safe upsert-only operation (never deactivates/deletes a row), so it
 * needs none of the main sync's deactivation-reconciliation safeguards —
 * a partial or failed run here can never corrupt or reconcile-away
 * existing Catalog data, and simply leaves `catalog_group_labels` at its
 * previous (already-safe) state for the failed locale.
 *
 * Not unit-tested directly (it touches real D1 + real network) — matches
 * `lib/catalog/sync-runner.ts`'s own established convention for this
 * class of orchestration code; `group-label-sync.ts`'s fetch logic
 * underneath it is fully unit-tested, and `repository.ts#upsertCatalogGroupLabels`
 * was verified live against local D1 as part of NAV-P1.
 */

const LOCALES: CatalogLocale[] = ["fa", "en", "ar"];

export interface GroupLabelSyncSummary {
  locale: CatalogLocale;
  status: "ok" | "not_configured" | "failed";
  labelCount: number;
  reasonCode?: string;
}

/**
 * Syncs Product group labels for every supported locale, independently —
 * one locale's failure (network error, upstream 5xx, not_configured) never
 * prevents another locale's labels from being fetched/persisted. Intended
 * to run on the existing daily full-reconciliation cron (no new Cron
 * Trigger — this codebase's Workers Free-plan 5-trigger cap is already
 * documented elsewhere, e.g. lib/processing/scheduled-sync.ts's own file
 * header), since Product group taxonomy changes far less often than
 * individual variant prices/stock.
 */
export async function runGroupLabelSync(): Promise<GroupLabelSyncSummary[]> {
  const summaries: GroupLabelSyncSummary[] = [];
  for (const locale of LOCALES) {
    try {
      const result = await fetchGroupLabelsForLocale(locale);
      if (result.status === "ok") {
        await upsertCatalogGroupLabels(locale, result.labels);
      }
      summaries.push({ locale, status: result.status, labelCount: result.labels.length, reasonCode: result.reasonCode });
    } catch (error) {
      // A thrown error (never expected from fetchGroupLabelsForLocale/upsertCatalogGroupLabels
      // themselves, both of which return typed results rather than throw) is
      // still caught here defensively so one locale's unexpected failure can
      // never prevent the next locale in this loop from running.
      summaries.push({ locale, status: "failed", labelCount: 0, reasonCode: error instanceof Error ? error.message : "CATALOG_GROUP_LABEL_SYNC_UNEXPECTED_ERROR" });
    }
  }
  console.log("CATALOG_GROUP_LABEL_SYNC", JSON.stringify({ summaries }));
  return summaries;
}
