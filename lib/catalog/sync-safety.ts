/**
 * Full-reconciliation safety guards — pure, D1-free (DOCUMENT_AUDIT_REPORT.md
 * DAR-040, docs/CATALOG_SYNC_OPERATIONS.md "Empty / implausible snapshot
 * guard"). `lib/catalog/sync-runner.ts#runFullCatalogSync` calls
 * `evaluateFullSyncPlausibility` before ever applying a plan's deactivations
 * — a full reconciliation whose upstream fetch is technically `status: "ok"`
 * but returns catastrophically fewer items than the currently-known active
 * catalog is treated as an implausible/untrustworthy snapshot, not a real
 * mass-deactivation event.
 *
 * Deliberately NOT a hardcoded "237" check — the catalog is allowed to
 * legitimately grow or shrink over time; the guard is a *ratio* against
 * whatever the currently-known active count actually is at the moment the
 * guard runs, so it stays correct as the real catalog changes.
 */

export interface FullSyncPlausibilityInput {
  /** Total items the upstream Public Catalog API actually returned across every page of this full pull. */
  upstreamCount: number;
  /** Count of product_variants rows currently is_active=1 in DB_PUBLIC, before this reconciliation is applied. */
  currentActiveCount: number;
}

export type FullSyncImplausibilityReason = "empty_upstream" | "implausible_drop";

export type FullSyncPlausibilityResult = { plausible: true } | { plausible: false; reason: FullSyncImplausibilityReason };

/**
 * Below this, the current catalog is small enough that the guard has
 * nothing meaningful to protect — a brand-new/near-empty catalog legitimately
 * fluctuates by 100% in relative terms on its very first few real syncs.
 */
const MIN_CATALOG_SIZE_FOR_GUARD = 5;

/**
 * A full reconciliation returning less than this fraction of the
 * currently-known active count is treated as implausible. 0.5 is a
 * deliberately conservative floor: for a real, static-ish steel Product
 * Master (13 templates / ~237 variants at the time this guard was written),
 * losing more than half the catalog in one sync cycle is far more likely to
 * indicate an upstream outage/misconfiguration/partial-filter bug than a
 * genuine, simultaneous mass-discontinuation.
 */
const CATASTROPHIC_DROP_RATIO = 0.5;

export function evaluateFullSyncPlausibility(input: FullSyncPlausibilityInput): FullSyncPlausibilityResult {
  const { upstreamCount, currentActiveCount } = input;

  if (currentActiveCount < MIN_CATALOG_SIZE_FOR_GUARD) {
    return { plausible: true };
  }
  if (upstreamCount === 0) {
    return { plausible: false, reason: "empty_upstream" };
  }
  if (upstreamCount < currentActiveCount * CATASTROPHIC_DROP_RATIO) {
    return { plausible: false, reason: "implausible_drop" };
  }
  return { plausible: true };
}

/**
 * Default replay-safe overlap margin for the incremental watermark
 * (docs/CATALOG_SYNC_OPERATIONS.md "Watermark safety"). Subtracted from the
 * maximum `updated_at` actually observed in a successful incremental pull
 * before it is stored as the next run's `updated_since` — protects against
 * two real risks: (1) more than one upstream record sharing the exact same
 * timestamp, where a hard cutoff at that exact value could permanently skip
 * a sibling record depending on whether the API's filter is inclusive or
 * exclusive; (2) minor clock skew between Odoo and the value it reports.
 * 5 minutes is generous relative to either risk and cheap to reprocess —
 * the sync is fully idempotent (sync.test.ts), so re-seeing a handful of
 * already-synced records on the next run costs nothing but a few
 * "unchanged" outcomes.
 */
export const INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS = 300;

/**
 * Applies the overlap margin to a raw observed max timestamp (already
 * normalized UTC ISO-8601, e.g. from `lib/catalog/sync.ts#normalizeCatalogTimestamp`).
 * Pure string/Date arithmetic — never touches D1 or the network.
 */
export function applyIncrementalWatermarkMargin(observedMaxUpdatedAt: string, marginSeconds: number = INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS): string {
  const date = new Date(observedMaxUpdatedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`applyIncrementalWatermarkMargin: not a valid timestamp: ${observedMaxUpdatedAt}`);
  }
  return new Date(date.getTime() - marginSeconds * 1000).toISOString();
}
