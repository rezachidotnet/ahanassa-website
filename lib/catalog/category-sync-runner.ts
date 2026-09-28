import { fetchPublicCategoriesForLocale } from "./category-sync.ts";
import { replaceCatalogPublicCategories } from "./repository.ts";
import type { CatalogLocale } from "./odoo-api-client.ts";

/**
 * Public-category sync orchestrator — wires `category-sync.ts` (fetch) →
 * `repository.ts#replaceCatalogPublicCategories` (persist), mirroring
 * `group-label-sync-runner.ts`. Each locale is independent: one locale's
 * failure leaves that locale's previous snapshot in place and never blocks
 * the others. Not unit-tested directly (real D1 + real network), per the
 * same convention as `group-label-sync-runner.ts`/`sync-runner.ts`.
 *
 * Scheduled from `workers/entry.ts` on the every-3-hours catalog trigger —
 * the one cron both staging and production register (wrangler.jsonc), so
 * a category change in Odoo reaches the site within ~3h on either. Manual
 * path: `node scripts/catalog-sync.ts categories --env <env>`.
 */

const LOCALES: CatalogLocale[] = ["fa", "en", "ar"];

export interface CategorySyncSummary {
  locale: CatalogLocale;
  status: "ok" | "not_configured" | "failed";
  categoryCount: number;
  reasonCode?: string;
}

export async function runCatalogCategorySync(): Promise<CategorySyncSummary[]> {
  const summaries: CategorySyncSummary[] = [];
  for (const locale of LOCALES) {
    try {
      const result = await fetchPublicCategoriesForLocale(locale);
      if (result.status === "ok") {
        await replaceCatalogPublicCategories(locale, result.categories);
      }
      summaries.push({ locale, status: result.status, categoryCount: result.categories.length, reasonCode: result.reasonCode });
    } catch (error) {
      summaries.push({ locale, status: "failed", categoryCount: 0, reasonCode: error instanceof Error ? error.message : "CATALOG_CATEGORY_SYNC_UNEXPECTED_ERROR" });
    }
  }
  console.log("CATALOG_CATEGORY_SYNC", JSON.stringify({ summaries }));
  return summaries;
}
