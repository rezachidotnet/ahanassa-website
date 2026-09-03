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
 * only frequency (how many qualifying RFQs) and distinct-demand (how many
 * distinct RFQs, which is the same count here since one signal = one RFQ
 * line already deduplicated per RFQ by the aggregation source query) — so a
 * single very-large-tonnage RFQ can never dominate the ranking over many
 * smaller, more frequent ones.
 */

export interface DemandSignal {
  templateXid: string;
  /** When the qualifying RFQ was accepted (`rfqs.created_at`) — ISO 8601 UTC. */
  occurredAt: string;
}

export interface DemandWeights {
  /** Weight applied to the decayed RFQ-frequency component. */
  frequencyWeight: number;
  /** Weight applied to the decayed distinct-RFQ-count component (kept as a separate, explicit term per this task's "Recent Distinct Demand" even though, at the current one-signal-per-RFQ-per-template granularity, it tracks frequency closely — the separation leaves room for a future stronger "distinct customer" signal without a scoring-formula rewrite). */
  distinctWeight: number;
}

/** Explicit, documented, conservative defaults — not fitted against real traffic (no real traffic exists yet). Equal weighting: frequency and distinctness are treated as equally informative until real data suggests otherwise. */
export const DEFAULT_DEMAND_WEIGHTS: DemandWeights = { frequencyWeight: 1, distinctWeight: 1 };

export interface DemandScoreResult {
  templateXid: string;
  score: number;
}

/**
 * Aggregates raw signals into one decayed demand score per template.
 * `nowMs` is caller-supplied (never `Date.now()` internally) so this stays
 * deterministically unit-testable. A template with zero signals never
 * appears in the result (callers treat "absent" as demand score 0 — see
 * `lib/ranking/score.ts`), which keeps the output stable rather than
 * padding it with synthetic zero-rows.
 */
export function aggregateDemandSignals(signals: DemandSignal[], nowMs: number, weights: DemandWeights = DEFAULT_DEMAND_WEIGHTS): DemandScoreResult[] {
  const byTemplate = new Map<string, { frequencyWeightSum: number; distinctRfqCount: number }>();

  for (const signal of signals) {
    const age = ageInDaysSince(signal.occurredAt, nowMs);
    const decay = exponentialDecayWeight(age);
    const bucket = byTemplate.get(signal.templateXid) ?? { frequencyWeightSum: 0, distinctRfqCount: 0 };
    bucket.frequencyWeightSum += decay;
    bucket.distinctRfqCount += decay; // one signal == one already-deduplicated-per-RFQ-per-template row (see aggregation-orchestrator.ts) — same decayed unit as frequency at this granularity
    byTemplate.set(signal.templateXid, bucket);
  }

  return [...byTemplate.entries()]
    .map(([templateXid, bucket]) => ({
      templateXid,
      score: bucket.frequencyWeightSum * weights.frequencyWeight + bucket.distinctRfqCount * weights.distinctWeight,
    }))
    .sort((a, b) => a.templateXid.localeCompare(b.templateXid)); // deterministic output order, independent of Map iteration/insertion order
}
