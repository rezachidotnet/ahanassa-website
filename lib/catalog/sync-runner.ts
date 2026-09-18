import { fetchCatalogProductsPage } from "./odoo-api-client";
import { normalizeCatalogTimestamp, planCatalogV1Sync, slugifyFromSku, slugifyTemplateXid } from "./sync";
import { createVariant, deactivateVariants, ensureCatalogProduct, getAllVariantsForSync, updateVariantCommercialFields } from "./repository";
import { evaluateFullSyncPlausibility } from "./sync-safety";
import type { CatalogApiProduct } from "./odoo-api-client";
import type { ProductVariant } from "./types";

/**
 * Sync orchestrator — the only place that wires fetch (odoo-api-client) →
 * plan (sync.ts) → apply (repository.ts). Not exposed as an HTTP route
 * (CLAUDE.md "Do NOT create an unauthenticated public sync endpoint") — a
 * scheduled Worker trigger or an authenticated internal admin action are
 * the intended future callers; for this phase, invoke directly via a
 * script/REPL against local D1 (see README.md "Product catalog sync").
 * DOCUMENT_AUDIT_REPORT.md DAR-034.
 *
 * Not unit-tested directly (it touches real D1) — matches this repo's
 * existing convention for D1-writing orchestration code (lib/rfq/service.ts,
 * lib/queue/consumer.ts are likewise untested by `node --test`); `sync.ts`'s
 * pure planning logic underneath it is fully unit-tested, and this
 * orchestrator was proven against the real live API into local D1 as part
 * of this task (DAR-034) rather than by a mock-based unit test.
 */

const MAX_PAGES = 200; // 237 records / up to page_size 100 = 3 pages today; generous ceiling against a misbehaving upstream, never a silent truncation of a legitimately larger catalog
const DEFAULT_PAGE_SIZE = 100;

export interface CatalogSyncResult {
  status: "ok" | "not_configured" | "failed";
  totalSeen: number;
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  reasonCode?: string;
  /** The maximum `updated_at` observed across every item this pull actually returned (normalized UTC ISO-8601) — the raw material for the next incremental watermark. Undefined when totalSeen is 0 or the run did not reach applyPlan. */
  maxObservedUpdatedAt?: string;
}

/** Reason codes a caller (the scheduled-sync coordinator, the manual CLI) may want to branch/log on specifically. */
export const CATALOG_SYNC_EMPTY_UPSTREAM = "CATALOG_SYNC_EMPTY_UPSTREAM";
export const CATALOG_SYNC_IMPLAUSIBLE_DROP = "CATALOG_SYNC_IMPLAUSIBLE_DROP";

async function fetchAllPages(updatedSince?: string): Promise<{ status: "ok" | "not_configured" | "failed"; items: CatalogApiProduct[]; reasonCode?: string }> {
  const items: CatalogApiProduct[] = [];
  let page = 1;

  for (; page <= MAX_PAGES; page++) {
    const result = await fetchCatalogProductsPage({ page, pageSize: DEFAULT_PAGE_SIZE, updatedSince, locale: "fa" });
    if (result.status === "not_configured") return { status: "not_configured", items: [] };
    if (result.status !== "ok" || !result.data) {
      return { status: "failed", items: [], reasonCode: result.reasonCode ?? "CATALOG_SYNC_LIST_FAILED" };
    }
    items.push(...result.data.items);
    if (page >= result.data.meta.pages) break;
  }

  return { status: "ok", items };
}

async function applyPlan(apiProducts: CatalogApiProduct[], isFullPull: boolean, prefetchedExisting?: ProductVariant[]): Promise<CatalogSyncResult> {
  const existing = prefetchedExisting ?? (await getAllVariantsForSync());
  const plan = planCatalogV1Sync(apiProducts, existing, isFullPull);

  // DAR-056 migration reconciliation pass — runs once per distinct template
  // for EVERY row this pull touched (create AND update), so an already-synced
  // legacy template's `catalog_products.template_xid` self-heals to the
  // canonical value the moment its Odoo data changes, not just on first sync.
  // See lib/catalog/sync.ts file header "MIGRATION SAFETY".
  const templateIdByCanonical = new Map<string, string>();
  for (const t of plan.templateIdentity) {
    const productId = await ensureCatalogProduct(t.canonicalTemplateXid, t.legacyTemplateXid, t.commercialTemplateName, t.commercialTemplateName, slugifyTemplateXid(t.canonicalTemplateXid));
    templateIdByCanonical.set(t.canonicalTemplateXid, productId);
  }

  for (const item of plan.toCreate) {
    const productId = templateIdByCanonical.get(item.templateXid);
    if (!productId) throw new Error(`Catalog sync invariant violated: no reconciled product id for template ${item.templateXid}`);
    await createVariant(productId, item, item.commercialName, slugifyFromSku(item.sku));
  }

  for (const { id, patch } of plan.toUpdate) {
    await updateVariantCommercialFields(id, patch);
  }

  await deactivateVariants(plan.toDeactivate);

  const maxObservedUpdatedAt = apiProducts.length > 0 ? apiProducts.map((p) => normalizeCatalogTimestamp(p.updated_at)).sort().at(-1) : undefined;

  return {
    status: "ok",
    totalSeen: apiProducts.length,
    created: plan.toCreate.length,
    updated: plan.toUpdate.length,
    deactivated: plan.toDeactivate.length,
    unchanged: plan.unchanged.length,
    maxObservedUpdatedAt,
  };
}

/**
 * Full reconciliation — paginates the entire active catalog and detects
 * deactivations. Safe to run repeatedly (idempotent).
 *
 * A partial pagination failure never reaches this point at all —
 * `fetchAllPages` returns `status: "failed"` (with `items` discarded, never
 * partially applied) the moment any single page fails, and this function
 * returns immediately without ever calling `applyPlan` — see
 * docs/CATALOG_SYNC_OPERATIONS.md "Failure semantics".
 *
 * Before applying any deactivation, a completed, `status: "ok"` pull is
 * still checked against `evaluateFullSyncPlausibility` (lib/catalog/sync-safety.ts)
 * — a technically-successful fetch that returns catastrophically fewer
 * items than the currently-known active catalog is refused rather than
 * treated as a real mass-deactivation event ("Empty-Upstream Catastrophe
 * Protection").
 */
export async function runFullCatalogSync(): Promise<CatalogSyncResult> {
  const pulled = await fetchAllPages();
  if (pulled.status !== "ok") {
    return { status: pulled.status, totalSeen: 0, created: 0, updated: 0, deactivated: 0, unchanged: 0, reasonCode: pulled.reasonCode };
  }

  const existing = await getAllVariantsForSync();
  const currentActiveCount = existing.filter((v) => v.isActive).length;
  const plausibility = evaluateFullSyncPlausibility({ upstreamCount: pulled.items.length, currentActiveCount });
  if (!plausibility.plausible) {
    return {
      status: "failed",
      totalSeen: pulled.items.length,
      created: 0,
      updated: 0,
      deactivated: 0,
      unchanged: 0,
      reasonCode: plausibility.reason === "empty_upstream" ? CATALOG_SYNC_EMPTY_UPSTREAM : CATALOG_SYNC_IMPLAUSIBLE_DROP,
    };
  }

  return applyPlan(pulled.items, true, existing);
}

/** Uses `updated_since` — cheaper, but cannot detect deactivations (the API never returns archived records at all, incrementally or otherwise). Run a full sync periodically to reconcile those. */
export async function runIncrementalCatalogSync(updatedSince: string): Promise<CatalogSyncResult> {
  const pulled = await fetchAllPages(updatedSince);
  if (pulled.status !== "ok") {
    return { status: pulled.status, totalSeen: 0, created: 0, updated: 0, deactivated: 0, unchanged: 0, reasonCode: pulled.reasonCode };
  }
  return applyPlan(pulled.items, false);
}
