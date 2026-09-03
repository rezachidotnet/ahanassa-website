import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateDemandSignals, DEFAULT_DEMAND_WEIGHT, type DemandSignal } from "./demand-aggregation.ts";
import { DEMAND_HALF_LIFE_DAYS } from "./decay.ts";

// Test I: Demand decay — more recent equivalent demand weighted higher.
// Test H (ranking-stability side): zero demand -> stable, deterministic
// (empty) output, never a crash/undefined behavior.

function isoDaysAgo(nowMs: number, days: number): string {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();
}

test("aggregateDemandSignals returns an empty array for zero signals", () => {
  const result = aggregateDemandSignals([], Date.now());
  assert.deepEqual(result, []);
});

test("aggregateDemandSignals: one recent RFQ scores higher than one equally-old-count but older RFQ for a different template", () => {
  const now = Date.now();
  const signals: DemandSignal[] = [
    { templateXid: "recent-tmpl", occurredAt: isoDaysAgo(now, 1) },
    { templateXid: "old-tmpl", occurredAt: isoDaysAgo(now, DEMAND_HALF_LIFE_DAYS * 3) },
  ];
  const result = aggregateDemandSignals(signals, now);
  const recent = result.find((r) => r.templateXid === "recent-tmpl")!;
  const old = result.find((r) => r.templateXid === "old-tmpl")!;
  assert.ok(recent.score > old.score, "a recent single RFQ must outscore a much older single RFQ");
});

test("aggregateDemandSignals: more frequent (recent) RFQs for one template outscore fewer for another, all else equal", () => {
  const now = Date.now();
  const signals: DemandSignal[] = [
    { templateXid: "popular", occurredAt: isoDaysAgo(now, 1) },
    { templateXid: "popular", occurredAt: isoDaysAgo(now, 2) },
    { templateXid: "popular", occurredAt: isoDaysAgo(now, 3) },
    { templateXid: "rare", occurredAt: isoDaysAgo(now, 1) },
  ];
  const result = aggregateDemandSignals(signals, now);
  const popular = result.find((r) => r.templateXid === "popular")!;
  const rare = result.find((r) => r.templateXid === "rare")!;
  assert.ok(popular.score > rare.score);
});

test("aggregateDemandSignals is deterministic and stably ordered by templateXid, independent of input order", () => {
  const now = Date.now();
  const a: DemandSignal[] = [
    { templateXid: "zzz", occurredAt: isoDaysAgo(now, 1) },
    { templateXid: "aaa", occurredAt: isoDaysAgo(now, 1) },
  ];
  const b: DemandSignal[] = [...a].reverse();
  const resultA = aggregateDemandSignals(a, now);
  const resultB = aggregateDemandSignals(b, now);
  assert.deepEqual(
    resultA.map((r) => r.templateXid),
    resultB.map((r) => r.templateXid),
  );
  assert.deepEqual(resultA.map((r) => r.templateXid), ["aaa", "zzz"]);
});

test("aggregateDemandSignals never uses a quantity/tonnage field — the DemandSignal type carries none, so scoring cannot be dominated by large tonnage", () => {
  const now = Date.now();
  const signals: DemandSignal[] = [{ templateXid: "t1", occurredAt: isoDaysAgo(now, 1) }];
  // TypeScript itself enforces this (DemandSignal has no quantity field) —
  // this test documents/pins the intent so a future refactor cannot
  // silently reintroduce a tonnage-weighted term.
  const result = aggregateDemandSignals(signals, now, DEFAULT_DEMAND_WEIGHT);
  assert.equal(result.length, 1);
});

test("aggregateDemandSignals respects a custom weight", () => {
  const now = Date.now();
  const signals: DemandSignal[] = [{ templateXid: "t1", occurredAt: isoDaysAgo(now, 0) }];
  const doubled = aggregateDemandSignals(signals, now, 2);
  const normal = aggregateDemandSignals(signals, now, 1);
  assert.ok(Math.abs(doubled[0].score - normal[0].score * 2) < 1e-9);
});

test("aggregateDemandSignals: two distinct accepted RFQs for the same template are counted once each (one honest signal), not doubled under two names", () => {
  const now = Date.now();
  const signals: DemandSignal[] = [
    { templateXid: "t1", occurredAt: isoDaysAgo(now, 0) },
    { templateXid: "t1", occurredAt: isoDaysAgo(now, 0) },
  ];
  const singleSignalResult = aggregateDemandSignals([signals[0]], now);
  const twoSignalResult = aggregateDemandSignals(signals, now);
  // Exactly double the single-signal score (each signal contributes its own
  // decay weight exactly once) — never quadruple, which the old
  // frequencyWeightSum+distinctRfqCount double-accumulation would have
  // produced for the same two signals.
  assert.ok(Math.abs(twoSignalResult[0].score - singleSignalResult[0].score * 2) < 1e-9);
});
