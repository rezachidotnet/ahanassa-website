import { test } from "node:test";
import assert from "node:assert/strict";
import { countExpectedPublicationDaysBetween, countMissedExpectedCycles, isoWeekdayInTimezone, validateProviderPublicationPolicy, type ProviderPublicationPolicy } from "./provider-policy.ts";

// --- validateProviderPublicationPolicy: representing every required cadence kind (task §22) ---

test("represents an intraday source (e.g. every 4 hours) without a provider-specific branch", () => {
  const result = validateProviderPublicationPolicy({ providerId: "market-intraday", cadenceKind: "intraday", cadenceIntervalCount: 4, cadenceIntervalUnit: "hours", timezone: "Asia/Tehran" });
  assert.equal(result.ok, true);
});

test("represents a plain daily source (every calendar day, no weekday restriction)", () => {
  const result = validateProviderPublicationPolicy({ providerId: "market-daily", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", timezone: "Asia/Tehran" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.policy.publicationWeekdays, null);
});

test("represents a business-daily source (Mon-Fri only)", () => {
  const result = validateProviderPublicationPolicy({
    providerId: "odoo",
    cadenceKind: "daily",
    cadenceIntervalCount: 1,
    cadenceIntervalUnit: "days",
    publicationWeekdays: [1, 2, 3, 4, 5],
    timezone: "Asia/Tehran",
  });
  assert.equal(result.ok, true);
});

test("represents a weekly source", () => {
  const result = validateProviderPublicationPolicy({ providerId: "market-weekly", cadenceKind: "weekly", cadenceIntervalCount: 1, cadenceIntervalUnit: "weeks", timezone: "Asia/Tehran" });
  assert.equal(result.ok, true);
});

test("represents a monthly source", () => {
  const result = validateProviderPublicationPolicy({ providerId: "market-monthly", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", timezone: "UTC" });
  assert.equal(result.ok, true);
});

// --- malformed policy fails closed ---

test("rejects a missing provider_id", () => {
  const result = validateProviderPublicationPolicy({ providerId: "", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "missing_provider_id");
});

test("rejects an unknown cadence kind", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "hourly", cadenceIntervalCount: 1, cadenceIntervalUnit: "hours", timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_cadence_kind");
});

test("rejects a zero interval count", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 0, cadenceIntervalUnit: "days", timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_cadence_interval_count");
});

test("rejects a negative interval count", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: -1, cadenceIntervalUnit: "days", timezone: "UTC" });
  assert.equal(result.ok, false);
});

test("rejects a non-integer interval count", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1.5, cadenceIntervalUnit: "days", timezone: "UTC" });
  assert.equal(result.ok, false);
});

test("rejects an unknown interval unit", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "fortnights", timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_cadence_interval_unit");
});

test("rejects an out-of-range publication weekday (0)", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [0, 1], timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_publication_weekday");
});

test("rejects an out-of-range publication weekday (8)", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [8], timezone: "UTC" });
  assert.equal(result.ok, false);
});

test("rejects an explicit empty publication_weekdays array (nonsensical — use null instead)", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [], timezone: "UTC" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "empty_publication_weekdays");
});

// --- invalid timezone fails closed ---

test("rejects an unknown/unvalidated timezone identifier", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", timezone: "Mars/Olympus_Mons" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "unknown_timezone");
});

test("rejects an empty timezone string", () => {
  const result = validateProviderPublicationPolicy({ providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", timezone: "" });
  assert.equal(result.ok, false);
});

// --- isoWeekdayInTimezone: timezone correctness, not host/UTC-only ---

test("isoWeekdayInTimezone reads the weekday in the DECLARED timezone, not raw UTC", () => {
  // 2026-09-04T21:00:00Z is Friday in UTC, but 2026-09-05T00:30 (past
  // midnight) in Asia/Tehran (UTC+3:30) — a genuinely different calendar
  // day/weekday in the two zones, proving the function is timezone-aware
  // rather than silently defaulting to UTC or host time.
  const instant = new Date("2026-09-04T21:00:00.000Z");
  assert.equal(isoWeekdayInTimezone(instant, "UTC"), 5); // Friday
  assert.equal(isoWeekdayInTimezone(instant, "Asia/Tehran"), 6); // Saturday
});

// --- Critical architectural test (task §23): weekend must not count as missed cycles ---

function businessDailyPolicy(): ProviderPublicationPolicy {
  return { providerId: "odoo", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [1, 2, 3, 4, 5], timezone: "UTC" };
}

test("weekend schedule: Friday -> Saturday -> Sunday -> Monday counts exactly ONE expected publication day (Monday), never three", () => {
  const policy = businessDailyPolicy();
  // Friday 2026-09-04 00:00 UTC through Monday 2026-09-07 23:59 UTC.
  const friday = new Date("2026-09-04T00:00:00.000Z");
  const mondayEnd = new Date("2026-09-07T23:59:59.000Z");
  assert.equal(countExpectedPublicationDaysBetween(policy, friday, mondayEnd), 1, "only Monday is an expected publication day in this window — Sat/Sun must not count");
});

test("weekend schedule: Friday -> Saturday alone counts ZERO expected publication days", () => {
  const policy = businessDailyPolicy();
  const friday = new Date("2026-09-04T00:00:00.000Z");
  const saturday = new Date("2026-09-05T12:00:00.000Z");
  assert.equal(countExpectedPublicationDaysBetween(policy, friday, saturday), 0);
});

test("a plain daily source (no weekday restriction) DOES count Saturday and Sunday", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: null, timezone: "UTC" };
  const friday = new Date("2026-09-04T00:00:00.000Z");
  const mondayEnd = new Date("2026-09-07T23:59:59.000Z");
  assert.equal(countExpectedPublicationDaysBetween(policy, friday, mondayEnd), 3, "Sat, Sun, and Mon all count when there is no weekday restriction");
});

test("Monday-to-Tuesday within one business week counts exactly one expected day", () => {
  const policy = businessDailyPolicy();
  const monday = new Date("2026-09-07T00:00:00.000Z");
  const tuesday = new Date("2026-09-08T12:00:00.000Z");
  assert.equal(countExpectedPublicationDaysBetween(policy, monday, tuesday), 1);
});

test("no elapsed time (to <= from) counts zero", () => {
  const policy = businessDailyPolicy();
  const now = new Date("2026-09-07T00:00:00.000Z");
  assert.equal(countExpectedPublicationDaysBetween(policy, now, now), 0);
});

// --- No-sync passage-of-time demonstration (task §24): FRESH -> AGING -> STALE
// derivable purely from (fixed source_timestamp, advancing "now", persisted
// policy) with ZERO database write between calls — no schema field blocks this. ---

test("expected-cycle count increases purely with the passage of time, no new data/DB write required between calls", () => {
  const policy = businessDailyPolicy();
  const sourceTimestamp = new Date("2026-09-03T09:00:00.000Z"); // Thursday morning
  const nowJustAfterPublish = new Date("2026-09-03T10:00:00.000Z"); // same day
  const nowNextDay = new Date("2026-09-04T09:00:00.000Z"); // Friday — 1 cycle
  const nowAfterWeekend = new Date("2026-09-08T09:00:00.000Z"); // next Tuesday — Fri+Mon+Tue = 3 cycles (weekend excluded)

  // Each call is completely independent — same fixed sourceTimestamp and
  // policy, only `now` advances — proving the classification PRICE-P2 will
  // build can be derived at read time with no persisted freshness_state
  // and no new sync required (ARCHITECTURE_DECISIONS.md §E).
  const cyclesAtT0 = countExpectedPublicationDaysBetween(policy, sourceTimestamp, nowJustAfterPublish);
  const cyclesAtT1 = countExpectedPublicationDaysBetween(policy, sourceTimestamp, nowNextDay);
  const cyclesAtT2 = countExpectedPublicationDaysBetween(policy, sourceTimestamp, nowAfterWeekend);

  assert.equal(cyclesAtT0, 0, "still within the same publication cycle — FRESH");
  assert.equal(cyclesAtT1, 1, "one cycle missed — AGING territory");
  assert.equal(cyclesAtT2, 3, "multiple cycles missed — STALE territory — computed with zero DB writes between t0/t1/t2");
  assert.ok(cyclesAtT2 > cyclesAtT1 && cyclesAtT1 > cyclesAtT0, "strictly increasing purely from wall-clock advancement");
});

// --- countMissedExpectedCycles (PRICE-P2): the generic dispatcher every cadence kind flows through ---

test("countMissedExpectedCycles delegates 'days' to the weekday-aware day-stepping walk (dispatches on cadenceIntervalUnit, not cadenceKind)", () => {
  const policy: ProviderPublicationPolicy = { providerId: "odoo", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "days", publicationWeekdays: [1, 2, 3, 4, 5], timezone: "UTC" };
  const friday = new Date("2026-09-04T00:00:00.000Z");
  const mondayEnd = new Date("2026-09-07T23:59:59.000Z");
  assert.equal(countMissedExpectedCycles(policy, friday, mondayEnd), countExpectedPublicationDaysBetween(policy, friday, mondayEnd));
  assert.equal(countMissedExpectedCycles(policy, friday, mondayEnd), 1);
});

test("intraday (every 2 hours): within one cycle -> 0, one missed -> 1, two missed -> 2 (task §21)", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market-intraday", cadenceKind: "intraday", cadenceIntervalCount: 2, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const t0 = new Date("2026-09-04T10:00:00.000Z");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-04T11:30:00.000Z")), 0, "1.5h elapsed, within the 2h cycle");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-04T12:30:00.000Z")), 1, "2.5h elapsed — one missed cycle");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-04T14:30:00.000Z")), 2, "4.5h elapsed — two missed cycles");
});

test("intraday every 4 hours — a different interval count is respected independently", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market-intraday-4h", cadenceKind: "intraday", cadenceIntervalCount: 4, cadenceIntervalUnit: "hours", publicationWeekdays: null, timezone: "UTC" };
  const t0 = new Date("2026-09-04T00:00:00.000Z");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-04T03:59:00.000Z")), 0);
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-04T04:01:00.000Z")), 1);
});

test("intraday ignores a (nonsensical, but not schema-forbidden) publicationWeekdays restriction — task §10: business-day rules must never break valid intraday behavior", () => {
  // Saturday in UTC — if weekday filtering were incorrectly applied to an
  // intraday cadence, this would misclassify; it must not.
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "intraday", cadenceIntervalCount: 2, cadenceIntervalUnit: "hours", publicationWeekdays: [1, 2, 3, 4, 5], timezone: "UTC" };
  const saturdayMorning = new Date("2026-09-05T06:00:00.000Z");
  const saturdayLater = new Date("2026-09-05T08:30:00.000Z");
  assert.equal(countMissedExpectedCycles(policy, saturdayMorning, saturdayLater), 1, "plain 2h-interval arithmetic must apply regardless of the (irrelevant here) weekday list");
});

test("weekly: within one week -> 0, one missed week -> 1, two missed weeks -> 2", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market-weekly", cadenceKind: "weekly", cadenceIntervalCount: 1, cadenceIntervalUnit: "weeks", publicationWeekdays: null, timezone: "UTC" };
  const t0 = new Date("2026-09-04T00:00:00.000Z");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-08T00:00:00.000Z")), 0, "4 days elapsed, within one week");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-12T00:00:00.000Z")), 1, "8 days elapsed — one missed week");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-25T00:00:00.000Z")), 3, "21 days elapsed — three missed weeks");
});

test("weekly with a 2-week interval respects the declared count", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "weekly", cadenceIntervalCount: 2, cadenceIntervalUnit: "weeks", publicationWeekdays: null, timezone: "UTC" };
  const t0 = new Date("2026-09-04T00:00:00.000Z");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-11T00:00:00.000Z")), 0, "7 days — within the 14-day cycle");
  assert.equal(countMissedExpectedCycles(policy, t0, new Date("2026-09-25T00:00:00.000Z")), 1, "21 days — one 14-day cycle missed");
});

// --- monthly: genuine calendar-month semantics, never a fixed 30-day approximation (task §11) ---

test("monthly: same calendar month, different day -> 0 missed cycles", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market-monthly", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-01T00:00:00.000Z"), new Date("2026-09-28T00:00:00.000Z")), 0);
});

test("monthly: crossing a single calendar-month boundary counts as ONE missed cycle even though only ~1 day of wall-clock time elapsed (the case a fixed-30-day approximation would get wrong)", () => {
  const policy: ProviderPublicationPolicy = { providerId: "market-monthly", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  // Aug 31 -> Sep 1: genuinely 1 calendar day of elapsed time, but a real
  // month boundary — a fixed-30-day-window approximation would say 0.
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-08-31T12:00:00.000Z"), new Date("2026-09-01T06:00:00.000Z")), 1);
});

test("monthly: exactly one full calendar month later (Sep -> Oct) is one missed cycle, not zero even though it's ~30 days, and not two", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-05T00:00:00.000Z"), new Date("2026-10-05T00:00:00.000Z")), 1);
});

test("monthly: two calendar months later is two missed cycles", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-05T00:00:00.000Z"), new Date("2026-11-06T00:00:00.000Z")), 2);
});

test("monthly with a 2-month interval respects the declared count", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 2, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-05T00:00:00.000Z"), new Date("2026-10-05T00:00:00.000Z")), 0, "1 calendar month elapsed — within the 2-month cycle");
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-05T00:00:00.000Z"), new Date("2026-11-06T00:00:00.000Z")), 1, "2 calendar months elapsed — exactly one 2-month cycle");
});

test("monthly crosses a calendar-YEAR boundary correctly (Dec -> Jan)", () => {
  const policy: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-12-20T00:00:00.000Z"), new Date("2027-01-05T00:00:00.000Z")), 1);
});

test("countMissedExpectedCycles returns null for an unrecognized cadenceIntervalUnit (defensive — validateProviderPublicationPolicy already prevents this shape upstream)", () => {
  const policy = { providerId: "p", cadenceKind: "daily", cadenceIntervalCount: 1, cadenceIntervalUnit: "fortnights", publicationWeekdays: null, timezone: "UTC" } as unknown as ProviderPublicationPolicy;
  assert.equal(countMissedExpectedCycles(policy, new Date("2026-09-01T00:00:00.000Z"), new Date("2026-09-10T00:00:00.000Z")), null);
});

test("countMissedExpectedCycles returns 0 for no elapsed time regardless of cadence unit", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const monthly: ProviderPublicationPolicy = { providerId: "p", cadenceKind: "monthly", cadenceIntervalCount: 1, cadenceIntervalUnit: "months", publicationWeekdays: null, timezone: "UTC" };
  assert.equal(countMissedExpectedCycles(monthly, now, now), 0);
});
