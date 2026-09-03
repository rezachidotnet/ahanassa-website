import { ulid } from "../rfq/ulid.ts";
import { aggregateDemandSignals, type DemandSignal } from "./demand-aggregation.ts";

/**
 * DB_OPS -> aggregate-only -> DB_PUBLIC demand orchestrator — this task's
 * §21-22 privacy boundary. The ONLY thing ever read from DB_OPS here is
 * `rfq_items.product_ref` (already-existing catalog identity, populated at
 * submission time — see `lib/rfq/catalog-preselection.ts#buildCatalogItemRecord`)
 * and `rfqs.created_at`; NOTHING else — no email, phone, customer name, IP,
 * notes, quantity, or any other RFQ content ever leaves DB_OPS. The ONLY
 * columns this module ever writes to DB_PUBLIC are `demand_score` +
 * `demand_computed_at` on `homepage_product_rank` — never a raw RFQ row,
 * never anything customer-identifying, and never `base_priority`/
 * `manual_boost` (those are editorial-owned; this module's own writes
 * always list `demand_score`/`demand_computed_at`/`updated_at` explicitly,
 * never a bare `*`/`INSERT ... SELECT`).
 *
 * FULL RECONCILIATION semantics (code-review hardening pass, DAR-054): a
 * successful run represents the CURRENT aggregate truth, not merely an
 * additive update. Every template this orchestrator has ever scored before
 * (i.e. every row currently in `homepage_product_rank`) is re-evaluated
 * every run — a template with signals today gets its fresh decayed score;
 * a template that PREVIOUSLY had signals but has none today (e.g. its only
 * qualifying RFQ was later marked spam/cancelled by staff) is explicitly
 * reset to `demand_score = 0`, not left at its last nonzero value. An
 * entirely empty current signal set is therefore NOT treated as "nothing to
 * do" — it still clears every previously-tracked template's score to 0 if
 * any such rows exist; only a run with BOTH zero current signals AND zero
 * previously-tracked rows is a true no-op. The whole reconciliation (every
 * upsert/zero-out this run decides on) is applied in ONE D1 `.batch()` —
 * atomic: a failure partway through leaves `homepage_product_rank`
 * completely untouched, never partially updated (same "all pass or all
 * fail" discipline as `lib/catalog/editorial-repository.ts#upsertEditorialDraft`'s
 * atomic slug+redirect write).
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
  /** Every `homepage_product_rank` row written this run — both freshly (re-)scored templates and previously-tracked templates explicitly zeroed out. */
  templatesReconciled: number;
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

interface TrackedRankRow {
  catalog_product_id: string;
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
 * A qualifying RFQ that is LATER marked spam/cancelled by staff simply
 * stops appearing here on the next run — see the full-reconciliation
 * contract above for how that is reflected in `homepage_product_rank`.
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

/** Every template this orchestrator has previously written a `homepage_product_rank` row for — the set that MUST be re-evaluated (and zeroed, if absent from this run's fresh signals) for full reconciliation. */
async function fetchPreviouslyTrackedTemplates(publicDb: D1Database): Promise<Map<string, string>> {
  const result = await publicDb
    .prepare(`SELECT hpr.catalog_product_id as catalog_product_id, cp.template_xid as template_xid FROM homepage_product_rank hpr JOIN catalog_products cp ON cp.id = hpr.catalog_product_id`)
    .all<TrackedRankRow>();
  return new Map((result.results ?? []).map((row) => [row.template_xid, row.catalog_product_id]));
}

/**
 * Runs one full demand-aggregation pass: DB_OPS read -> pure decay/aggregate
 * (`lib/ranking/demand-aggregation.ts`, no D1 involved) -> DB_PUBLIC full
 * reconciliation write. Never throws — any failure is caught, logged
 * distinctly, and returns `status: "failed"`; existing `homepage_product_rank`
 * rows are left completely untouched on failure (the write step is
 * all-or-nothing via `.batch()`).
 */
export async function runDemandAggregation(deps: DemandAggregationDeps): Promise<DemandAggregationSummary> {
  try {
    const opsDb = deps.getOpsDb();
    const signals = await fetchRfqDemandSignals(opsDb);
    const scores = aggregateDemandSignals(signals, deps.now());
    const scoreByTemplateXid = new Map(scores.map((s) => [s.templateXid, s.score]));

    const publicDb = deps.getPublicDb();
    const previouslyTracked = await fetchPreviouslyTrackedTemplates(publicDb);

    // Full reconciliation set: every template with a current signal, UNION
    // every template this orchestrator has ever scored before (so a
    // now-signal-less template is reconciled to 0, not left stale).
    const templateXidsToReconcile = new Set<string>([...scoreByTemplateXid.keys(), ...previouslyTracked.keys()]);

    if (templateXidsToReconcile.size === 0) {
      // True no-op: no current signals AND nothing was ever previously
      // tracked — there is nothing whose demand_score could possibly be
      // stale. Distinct from "scores is empty but previouslyTracked is
      // not", which still proceeds below to zero out the stale rows.
      return { status: "ok", templatesReconciled: 0, signalsSeen: signals.length };
    }

    const newlySeenTemplateXids = [...templateXidsToReconcile].filter((xid) => !previouslyTracked.has(xid));
    const freshLookup = new Map<string, string>();
    if (newlySeenTemplateXids.length > 0) {
      const placeholders = newlySeenTemplateXids.map(() => "?").join(",");
      const catalogRows = await publicDb
        .prepare(`SELECT id, template_xid FROM catalog_products WHERE template_xid IN (${placeholders})`)
        .bind(...newlySeenTemplateXids)
        .all<CatalogProductIdRow>();
      for (const row of catalogRows.results ?? []) freshLookup.set(row.template_xid, row.id);
    }

    const catalogProductIdByTemplateXid = new Map<string, string>([...previouslyTracked, ...freshLookup]);

    const now = new Date().toISOString();
    const statements = [...templateXidsToReconcile]
      .filter((templateXid) => catalogProductIdByTemplateXid.has(templateXid))
      .map((templateXid) => {
        const catalogProductId = catalogProductIdByTemplateXid.get(templateXid)!;
        // demand_score is set to the fresh score when present, explicitly
        // 0 otherwise (a previously-tracked template with no current
        // signal) — never left out of the reconciliation set. base_priority/
        // manual_boost are never referenced here at all: the INSERT's
        // literal 0/0 only ever applies to a genuinely brand-new row (the
        // table has no existing values to preserve yet), and the ON
        // CONFLICT clause updates ONLY demand_score/demand_computed_at/
        // updated_at — an existing row's base_priority/manual_boost are
        // structurally impossible for this statement to touch.
        const score = scoreByTemplateXid.get(templateXid) ?? 0;
        return publicDb
          .prepare(
            `INSERT INTO homepage_product_rank (id, catalog_product_id, base_priority, manual_boost, demand_score, demand_computed_at, created_at, updated_at)
             VALUES (?, ?, 0, 0, ?, ?, ?, ?)
             ON CONFLICT(catalog_product_id) DO UPDATE SET demand_score = excluded.demand_score, demand_computed_at = excluded.demand_computed_at, updated_at = excluded.updated_at`,
          )
          .bind(ulid(), catalogProductId, score, now, now, now);
      });

    if (statements.length > 0) {
      await publicDb.batch(statements);
    }

    return { status: "ok", templatesReconciled: statements.length, signalsSeen: signals.length };
  } catch (error) {
    console.error("DEMAND_AGGREGATION_FAILED", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
    return { status: "failed", templatesReconciled: 0, signalsSeen: 0, reasonCode: "aggregation_error" };
  }
}
