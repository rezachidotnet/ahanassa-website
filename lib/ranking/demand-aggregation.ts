import { ageInDaysSince, exponentialDecayWeight } from "./decay.ts";

/**
 * Pure demand-aggregation logic — this task's §13-22. Operates strictly at
 * Product/Template level (a `DemandSignal.templateXid` is always a
 * `catalog_products.template_xid`/`rfq_items.product_ref` value — never a
 * variant xid; the aggregation orchestrator that calls this never passes
 * variant-level signals, so "rebar Ø16" and "rebar Ø18" are always the same
 * demand bucket, per this task's explicit "never rank per-variant"
 * requirement).
 *
 * Deliberately does NOT accept or use requested quantity/tonnage anywhere —
 * only how many distinct, qualifying, recency-decayed RFQs reference a
 * template — so a single very-large-tonnage RFQ can never dominate the
 * ranking over many smaller, more frequent ones.
 *
 * v1 is deliberately a SINGLE signal (code-review hardening pass, DAR-054):
 * one exponentially-decayed count of distinct accepted RFQs per template
 * (a `DemandSignal` is already deduplicated to one row per (rfq_id,
 * templateXid) by the aggregation source query —
 * `lib/ranking/aggregation-orchestrator.ts#fetchRfqDemandSignals`). An
 * earlier version accumulated the same decayed value into two identically-
 * computed fields ("RFQ frequency" and "distinct RFQ count") and summed
 * them — that was double-counting one observation under two names, not two
 * independent signals. A real, independent "distinct CUSTOMER demand"
 * signal (this task's originally-envisioned second term) would need a safe
 * verified customer identity to group by; no such identity exists in the
 * current RFQ schema without inventing customer fingerprinting or using IP
 * (both explicitly out of scope) — deferred until a real, privacy-safe
 * identity is available, rather than faked by re-weighting the same count.
 */

export interface DemandSignal {
  templateXid: string;
  /** When the qualifying RFQ was accepted (`rfqs.created_at`) — ISO 8601 UTC. */
  occurredAt: string;
}

/** Explicit, documented, conservative default — not fitted against real traffic (none exists yet). */
export const DEFAULT_DEMAND_WEIGHT = 1;

export interface DemandScoreResult {
  templateXid: string;
  score: number;
}

/**
 * Aggregates raw signals into one decayed demand score per template.
 * `nowMs` is caller-supplied (never `Date.now()` internally) so this stays
 * deterministically unit-testable. A template with zero signals never
 * appears in the result — the orchestrator (`lib/ranking/aggregation-orchestrator.ts`)
 * is responsible for full reconciliation (explicitly setting `demand_score = 0`
 * for any previously-tracked template absent here), not this pure function.
 */
export function aggregateDemandSignals(signals: DemandSignal[], nowMs: number, weight: number = DEFAULT_DEMAND_WEIGHT): DemandScoreResult[] {
  const byTemplate = new Map<string, number>();

  for (const signal of signals) {
    const age = ageInDaysSince(signal.occurredAt, nowMs);
    const decay = exponentialDecayWeight(age);
    byTemplate.set(signal.templateXid, (byTemplate.get(signal.templateXid) ?? 0) + decay);
  }

  return [...byTemplate.entries()]
    .map(([templateXid, weightSum]) => ({ templateXid, score: weightSum * weight }))
    .sort((a, b) => a.templateXid.localeCompare(b.templateXid)); // deterministic output order, independent of Map iteration/insertion order
}
