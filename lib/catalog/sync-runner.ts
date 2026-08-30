import { fetchCatalogProductsPage } from "./odoo-api-client";
import { planCatalogV1Sync, slugifyFromSku } from "./sync";
import { createVariant, deactivateVariants, ensureCatalogProduct, getAllVariantsForSync, updateVariantCommercialFields } from "./repository";
import type { CatalogApiProduct } from "./odoo-api-client";

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
}

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

/** Extracts the last dot-separated segment of a template xid (e.g. "ahanassa_marketplace.product_tmpl_rb_aj340" -> "product_tmpl_rb_aj340") as slug material — never the Persian name. */
function slugifyTemplateXid(templateXid: string): string {
  const tail = templateXid.split(".").pop() ?? templateXid;
  return tail.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function applyPlan(apiProducts: CatalogApiProduct[], isFullPull: boolean): Promise<CatalogSyncResult> {
  const existing = await getAllVariantsForSync();
  const plan = planCatalogV1Sync(apiProducts, existing, isFullPull);

  for (const item of plan.toCreate) {
    const productId = await ensureCatalogProduct(
      item.templateXid,
      item.commercialTemplateName,
      item.commercialTemplateName, // catalog_products.name_fa bootstrap — website-owned, editable later, never touched again by sync
      slugifyTemplateXid(item.templateXid),
    );
    await createVariant(productId, item, item.commercialName, slugifyFromSku(item.sku));
  }

  for (const { id, patch } of plan.toUpdate) {
    await updateVariantCommercialFields(id, patch);
  }

  await deactivateVariants(plan.toDeactivate);

  return {
    status: "ok",
    totalSeen: apiProducts.length,
    created: plan.toCreate.length,
    updated: plan.toUpdate.length,
    deactivated: plan.toDeactivate.length,
    unchanged: plan.unchanged.length,
  };
}

/** Full reconciliation — paginates the entire active catalog and detects deactivations. Safe to run repeatedly (idempotent). */
export async function runFullCatalogSync(): Promise<CatalogSyncResult> {
  const pulled = await fetchAllPages();
  if (pulled.status !== "ok") {
    return { status: pulled.status, totalSeen: 0, created: 0, updated: 0, deactivated: 0, unchanged: 0, reasonCode: pulled.reasonCode };
  }
  return applyPlan(pulled.items, true);
}

/** Uses `updated_since` — cheaper, but cannot detect deactivations (the API never returns archived records at all, incrementally or otherwise). Run a full sync periodically to reconcile those. */
export async function runIncrementalCatalogSync(updatedSince: string): Promise<CatalogSyncResult> {
  const pulled = await fetchAllPages(updatedSince);
  if (pulled.status !== "ok") {
    return { status: pulled.status, totalSeen: 0, created: 0, updated: 0, deactivated: 0, unchanged: 0, reasonCode: pulled.reasonCode };
  }
  return applyPlan(pulled.items, false);
}
