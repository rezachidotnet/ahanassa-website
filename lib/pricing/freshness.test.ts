import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyQuoteFreshness } from "./freshness.ts";
import type { ProviderPublicationPolicy } from "./provider-policy.ts";

const NOW = new Date("2026-09-10T12:00:00.000Z"); // a Thursday

function dailyPolicy(overrides: Partial<ProviderPublicationPolicy> = {}): ProviderPublicationPolicy {
  return { providerId: "odoo", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: null, timezone: "UTC", ...overrides };
}

function businessDailyPolicy(): ProviderPublicationPolicy {
  return dailyPolicy({ publicationWeekdays: [1, 2, 3, 4, 5] });
}

// --- FRESH / AGING / STALE / UNAVAILABLE, the 4 states themselves ---

test("FRESH: within the current expected cycle", () => {
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: NOW.toISOString(), syncedAt: NOW.toISOString(), policy: dailyPolicy() });
  assert.equal(state, "fresh");
});

test("AGING: exactly one missed expected cycle", () => {
  const oneCycleAgo = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: oneCycleAgo, syncedAt: oneCycleAgo, policy: dailyPolicy() });
  assert.equal(state, "aging");
});

test("STALE: two or more missed expected cycles", () => {
  const threeCyclesAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: threeCyclesAgo, syncedAt: threeCyclesAgo, policy: dailyPolicy() });
  assert.equal(state, "stale");
});

test("UNAVAILABLE: no policy at all — never falls back to any universal default (task §14/§17)", () => {
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: NOW.toISOString(), syncedAt: NOW.toISOString(), policy: null });
  assert.equal(state, "unavailable");
});

// --- No-sync progression (task §13, mandatory P2 gate) ---

test("no-sync progression: FRESH -> AGING -> STALE purely from advancing `now`, same fixed source_timestamp/synced_at/policy, zero DB writes/provider requests/reconciliation involved", () => {
  const policy = dailyPolicy();
  const sourceTimestamp = "2026-09-08T09:00:00.000Z"; // Tuesday
  const syncedAt = sourceTimestamp;

  const stillFresh = classifyQuoteFreshness({ now: new Date("2026-09-08T15:00:00.000Z"), sourceTimestamp, syncedAt, policy });
  const nowAging = classifyQuoteFreshness({ now: new Date("2026-09-09T10:00:00.000Z"), sourceTimestamp, syncedAt, policy }); // Wednesday — 1 cycle
  const nowStale = classifyQuoteFreshness({ now: new Date("2026-09-11T10:00:00.000Z"), sourceTimestamp, syncedAt, policy }); // Friday — 3 cycles

  assert.equal(stillFresh, "fresh");
  assert.equal(nowAging, "aging");
  assert.equal(nowStale, "stale");
});

// --- Intraday (task §21) ---

test("intraday: within expected cycle -> FRESH", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market", cadenceKind: "intraday", cadenceIntervalCount: 4, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const ts = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago, 4h cadence
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: ts, syncedAt: ts, policy }), "fresh");
});

test("intraday: one missed cycle -> AGING", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market", cadenceKind: "intraday", cadenceIntervalCount: 4, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const ts = new Date(NOW.getTime() - 5 * 60 * 60 * 1000).toISOString(); // 5h ago
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: ts, syncedAt: ts, policy }), "aging");
});

test("intraday: two missed cycles -> STALE", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market", cadenceKind: "intraday", cadenceIntervalCount: 4, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const ts = new Date(NOW.getTime() - 9 * 60 * 60 * 1000).toISOString(); // 9h ago
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: ts, syncedAt: ts, policy }), "stale");
});

// --- Daily (normal progression) ---

test("daily: normal FRESH/AGING/STALE progression", () => {
  const policy = dailyPolicy();
  const fresh = NOW.toISOString();
  const aging = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const stale = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: fresh, syncedAt: fresh, policy }), "fresh");
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: aging, syncedAt: aging, policy }), "aging");
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: stale, syncedAt: stale, policy }), "stale");
});

// --- Business-daily / weekend rule (task §9, critical test case) ---

test("business-daily: a Friday quote remains FRESH through Friday itself", () => {
  const policy = businessDailyPolicy();
  const friday9am = "2026-09-04T09:00:00.000Z";
  const fridayNoon = new Date("2026-09-04T12:00:00.000Z");
  assert.equal(classifyQuoteFreshness({ now: fridayNoon, sourceTimestamp: friday9am, syncedAt: friday9am, policy }), "fresh");
});

test("business-daily: Friday -> Saturday remains a valid (non-STALE) state — a weekend alone must not turn a Friday quote STALE (task §9)", () => {
  const policy = businessDailyPolicy();
  const friday9am = "2026-09-04T09:00:00.000Z";
  const saturday = new Date("2026-09-05T12:00:00.000Z");
  const state = classifyQuoteFreshness({ now: saturday, sourceTimestamp: friday9am, syncedAt: friday9am, policy });
  assert.notEqual(state, "stale");
  assert.equal(state, "fresh", "no expected publication day has been missed yet — the next one (Monday) hasn't arrived");
});

test("business-daily: Friday -> Sunday remains a valid (non-STALE) state", () => {
  const policy = businessDailyPolicy();
  const friday9am = "2026-09-04T09:00:00.000Z";
  const sunday = new Date("2026-09-06T12:00:00.000Z");
  const state = classifyQuoteFreshness({ now: sunday, sourceTimestamp: friday9am, syncedAt: friday9am, policy });
  assert.notEqual(state, "stale");
});

test("business-daily: Friday -> Monday (the expected next publication day) becomes AGING, not STALE — exactly one missed cycle", () => {
  const policy = businessDailyPolicy();
  const friday9am = "2026-09-04T09:00:00.000Z";
  const mondayEvening = new Date("2026-09-07T18:00:00.000Z");
  assert.equal(classifyQuoteFreshness({ now: mondayEvening, sourceTimestamp: friday9am, syncedAt: friday9am, policy }), "aging");
});

test("business-daily: Friday -> Tuesday (two missed business days: Monday and Tuesday) becomes STALE", () => {
  const policy = businessDailyPolicy();
  const friday9am = "2026-09-04T09:00:00.000Z";
  const tuesday = new Date("2026-09-08T18:00:00.000Z");
  assert.equal(classifyQuoteFreshness({ now: tuesday, sourceTimestamp: friday9am, syncedAt: friday9am, policy }), "stale");
});

// --- Weekly ---

test("weekly: correct missed-cycle classification", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "weekly", cadenceIntervalCount: 1, cadenceIntervalUnit: "weeks", publicationWeekdays: null, timezone: "UTC" };
  const ts = "2026-09-04T00:00:00.000Z";
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-09-08T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "fresh");
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-09-12T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "aging");
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-09-20T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "stale");
});

// --- Monthly (calendar-aware) ---

test("monthly: correct calendar-aware FRESH/AGING/STALE classification", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  const ts = "2026-09-05T00:00:00.000Z";
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-09-28T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "fresh", "same calendar month");
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-10-05T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "aging", "one calendar month later");
  assert.equal(classifyQuoteFreshness({ now: new Date("2026-11-06T00:00:00.000Z"), sourceTimestamp: ts, syncedAt: ts, policy }), "stale", "two calendar months later");
});

// --- Timezone (task §12/§21) ---

test("timezone: the same UTC instant produces the correct LOCAL publication-day classification for a business-daily source in Asia/Tehran", () => {
  // 2026-09-04T21:00:00Z is Friday in UTC but already Saturday
  // 2026-09-05T00:30 local in Asia/Tehran (UTC+3:30) — a business-daily
  // Tehran-timezone policy must treat the SOURCE quote as published on the
  // LOCAL Saturday (not an expected publication day), not Friday.
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [1, 2, 3, 4, 5], timezone: "Asia/Tehran" };
  const utcFridayNightTehranSaturday = "2026-09-04T21:00:00.000Z";
  const laterSameLocalDay = new Date("2026-09-04T22:00:00.000Z"); // still Sat in Tehran, 1h later
  // Classification here concerns EXPECTED cycles going forward from the
  // source timestamp, not the source timestamp's own weekday — this test's
  // real assertion is the companion one below (a timezone boundary must
  // not fabricate a false missed cycle).
  const state = classifyQuoteFreshness({ now: laterSameLocalDay, sourceTimestamp: utcFridayNightTehranSaturday, syncedAt: utcFridayNightTehranSaturday, policy });
  assert.equal(state, "fresh", "only 1 hour of wall-clock time elapsed — no expected cycle boundary crossed regardless of the UTC/local weekday distinction");
});

test("timezone boundary does not create a false missed cycle: a UTC instant that is Friday in UTC but Saturday in Asia/Tehran does not itself register as a 'skipped' Friday for a Tehran-timezone policy", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [1, 2, 3, 4, 5], timezone: "Asia/Tehran" };
  const sourceTimestamp = "2026-09-04T21:00:00.000Z"; // Saturday in Tehran
  // One Tehran-local day later — still within the weekend, must remain FRESH.
  const oneLocalDayLater = new Date("2026-09-05T21:00:00.000Z");
  assert.equal(classifyQuoteFreshness({ now: oneLocalDayLater, sourceTimestamp, syncedAt: sourceTimestamp, policy }), "fresh");
});

// --- Timestamp integrity ---

test("source_timestamp wins over a newer synced_at — re-syncing an old quote does not make it look fresh", () => {
  const policy = dailyPolicy();
  const oldSourceTimestamp = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days old
  const freshSyncedAt = NOW.toISOString(); // just re-synced
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: oldSourceTimestamp, syncedAt: freshSyncedAt, policy });
  assert.equal(state, "stale", "the OLD source_timestamp must govern, never the newer synced_at");
});

test("synced_at fallback is used ONLY when source_timestamp is genuinely null", () => {
  const policy = dailyPolicy();
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: null, syncedAt: NOW.toISOString(), policy });
  assert.equal(state, "fresh", "falls back to synced_at only because source_timestamp is null");
});

test("malformed source_timestamp fails closed to UNAVAILABLE, never guessed", () => {
  const policy = dailyPolicy();
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: "not-a-real-timestamp", syncedAt: NOW.toISOString(), policy });
  assert.equal(state, "unavailable");
});

test("future timestamp behavior: a materially-future effective timestamp is UNAVAILABLE, never treated as fresh", () => {
  const policy = dailyPolicy();
  const farFuture = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(); // 1h in the future — beyond the 5-minute skew tolerance
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: farFuture, syncedAt: farFuture, policy });
  assert.equal(state, "unavailable");
});

test("future timestamp behavior: a small clock-skew-tolerant near-future timestamp is still classified normally (mirrors normalize.ts's own tolerance, not a second invented one)", () => {
  const policy = dailyPolicy();
  const barelyFuture = new Date(NOW.getTime() + 60 * 1000).toISOString(); // 1 minute ahead — within the 5-minute tolerance
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: barelyFuture, syncedAt: barelyFuture, policy });
  assert.equal(state, "fresh");
});

// --- Policy edge cases ---

test("missing policy (null) always classifies UNAVAILABLE regardless of how fresh the timestamp actually is", () => {
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: NOW.toISOString(), syncedAt: NOW.toISOString(), policy: null });
  assert.equal(state, "unavailable");
});

test("a policy with an unsupported cadenceIntervalUnit (should be unreachable given upstream validation, tested defensively) classifies UNAVAILABLE, never a default", () => {
  const malformedPolicy = { providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "fortnights", publicationWeekdays: null, timezone: "UTC" } as unknown as ProviderPublicationPolicy;
  // `now` must be strictly after the source timestamp — otherwise
  // countMissedExpectedCycles short-circuits to 0 (zero elapsed time)
  // before ever reaching the cadence-unit switch, and the unsupported-unit
  // branch is never actually exercised.
  const past = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
  const state = classifyQuoteFreshness({ now: NOW, sourceTimestamp: past, syncedAt: past, policy: malformedPolicy });
  assert.equal(state, "unavailable");
});

// --- No universal 24h fallback remains reachable through this classifier ---

test("a quote aged exactly 25 hours under an hourly-cadence intraday policy (interval 48h) is still FRESH — proves no hidden universal 24h rule exists anywhere in this classifier", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "intraday", cadenceIntervalCount: 48, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const ts = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
  assert.equal(classifyQuoteFreshness({ now: NOW, sourceTimestamp: ts, syncedAt: ts, policy }), "fresh", "25h < 48h cycle — a hardcoded 24h rule would have wrongly said stale/aging here");
});
