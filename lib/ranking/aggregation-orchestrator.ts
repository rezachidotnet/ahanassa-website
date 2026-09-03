import { ulid } from "../rfq/ulid.ts";
import { aggregateDemandSignals, type DemandSignal } from "./demand-aggregation.ts";

/**
 * DB_OPS -> aggregate-only -> DB_PUBLIC demand orchestrator — this task's
 * §21-22 privacy boundary. The ONLY thing ever read from DB_OPS here is
 * `rfq_items.product_ref` (already-existing catalog identity, populated at
 * submission time — see `lib/rfq/catalog-preselection.ts#buildCatalogItemRecord`)
 * and `rfqs.created_at`; NOTHING else — no email, phone, customer name, IP,
 * notes, quantity, or any other RFQ content ever leaves DB_OPS. The ONLY
 * thing ever written to DB_PUBLIC is a numeric `demand_score` +
 * `demand_computed_at` on the existing `homepage_product_rank` row (or a new
 * one with base_priority=0/manual_boost=0 defaults) keyed by
 * `catalog_products.id` — never a raw RFQ row, never anything
 * customer-identifying.
 *
 * Deliberately NOT wired into `workers/entry.ts`'s cron switch or
 * `wrangler.jsonc`'s `triggers.crons` in this pass — mirrors
 * `lib/pricing/sync-orchestrator.ts#runScheduledPriceSync`'s own precedent
 * (that function is also written/tested/documented but not cron-wired until
 * a real provider exists). Here, the reason is symmetric: ranking only
 * matters once `HOMEPAGE_RANKING_MODE=auto` is actually turned on for a real
 * launch, so wiring a cron trigger for it now would run real D1 work for a
 * mode nothing currently uses. The one-line cron wiring
 * (`case DEMAND_AGGREGATION_CRON: ctx.waitUntil(runDemandAggregation(env))`)
 * is a deferred manual step for that later moment.
 */

export interface DemandAggregationDeps {
  getOpsDb: () => D1Database;
  getPublicDb: () => D1Database;
  now: () => number;
}

export interface DemandAggregationSummary {
  status: "ok" | "failed";
  templatesScored: number;
  signalsSeen: number;
  reasonCode?: string;
}

interface RfqDemandRow {
  product_ref: string;
  created_at: string;
}

interface CatalogProductIdRow {
  id: string;
  template_xid: string;
}

/**
 * Reads only currently-accepted RFQ demand (`status NOT IN ('spam',
 * 'cancelled')` — the same safe "accepted" set `lib/rfq/repository.ts`'s own
 * schema comment identifies; abuse-filtered upstream by the existing
 * Turnstile/rate-limit layers at submission time, never re-checked or
 * duplicated here). `SELECT DISTINCT rfq_id, product_ref` deduplicates
 * multiple line items referencing the same template within one RFQ into a
 * single demand signal — this task's own "distinct-accepted-RFQs" framing,
 * never inflated by how many lines of the same product one customer typed.
 */
async function fetchRfqDemandSignals(db: D1Database): Promise<DemandSignal[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT ri.rfq_id, ri.product_ref, r.created_at
       FROM rfq_items ri
       JOIN rfqs r ON r.id = ri.rfq_id
       WHERE ri.product_ref IS NOT NULL AND r.status NOT IN ('spam', 'cancelled')`,
    )
    .all<RfqDemandRow & { rfq_id: string }>();

  return (result.results ?? []).map((row) => ({ templateXid: row.product_ref, occurredAt: row.created_at }));
}

/**
 * Runs one full demand-aggregation pass: DB_OPS read -> pure decay/aggregate
 * (`lib/ranking/demand-aggregation.ts`, no D1 involved) -> DB_PUBLIC write.
 * Never throws — any failure is caught, logged distinctly, and returns
 * `status: "failed"`; existing `homepage_product_rank` rows are left
 * untouched on failure (the write step is all-or-nothing via `.batch()`).
 */
export async function runDemandAggregation(deps: DemandAggregationDeps): Promise<DemandAggregationSummary> {
  try {
    const opsDb = deps.getOpsDb();
    const signals = await fetchRfqDemandSignals(opsDb);
    const scores = aggregateDemandSignals(signals, deps.now());

    if (scores.length === 0) {
      return { status: "ok", templatesScored: 0, signalsSeen: signals.length };
    }

    const publicDb = deps.getPublicDb();
    const placeholders = scores.map(() => "?").join(",");
    const catalogRows = await publicDb
      .prepare(`SELECT id, template_xid FROM catalog_products WHERE template_xid IN (${placeholders})`)
      .bind(...scores.map((s) => s.templateXid))
      .all<CatalogProductIdRow>();
    const catalogProductIdByTemplateXid = new Map((catalogRows.results ?? []).map((row) => [row.template_xid, row.id]));

    const now = new Date().toISOString();
    const statements = scores
      .filter((s) => catalogProductIdByTemplateXid.has(s.templateXid))
      .map((s) => {
        const catalogProductId = catalogProductIdByTemplateXid.get(s.templateXid)!;
        return publicDb
          .prepare(
            `INSERT INTO homepage_product_rank (id, catalog_product_id, base_priority, manual_boost, demand_score, demand_computed_at, created_at, updated_at)
             VALUES (?, ?, 0, 0, ?, ?, ?, ?)
             ON CONFLICT(catalog_product_id) DO UPDATE SET demand_score = excluded.demand_score, demand_computed_at = excluded.demand_computed_at, updated_at = excluded.updated_at`,
          )
          .bind(ulid(), catalogProductId, s.score, now, now, now);
      });

    if (statements.length > 0) {
      await publicDb.batch(statements);
    }

    return { status: "ok", templatesScored: statements.length, signalsSeen: signals.length };
  } catch (error) {
    console.error("DEMAND_AGGREGATION_FAILED", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
    return { status: "failed", templatesScored: 0, signalsSeen: 0, reasonCode: "aggregation_error" };
  }
}
