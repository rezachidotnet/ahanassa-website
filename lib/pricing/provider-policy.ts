/**
 * Provider publication-cadence policy — pure, D1-free domain model
 * (`price_provider_policies`, migrations_public/0008). Frozen decisions
 * this implements: PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md §G/§H, task
 * PRICE-P1 §7-10.
 *
 * Scope note: this module is the P1 "domain infrastructure" the frozen
 * decisions explicitly allow ("this phase may create the pure domain
 * infrastructure needed by PRICE-P2, but must not make a persisted
 * freshness state authoritative" — task §12) — NOT the full FRESH / AGING
 * / STALE / UNAVAILABLE classifier itself, which is PRICE-P2's job. What
 * this module proves, concretely: (1) a single policy shape can represent
 * intraday/daily/weekly/monthly cadences without any provider-specific
 * code branch, fail-closed on malformed input; (2) the shape and the
 * `countExpectedPublicationDaysBetween` function below are sufficient to
 * correctly answer the frozen weekend rule (a Mon-Fri business-daily
 * source does not treat an ordinary Saturday/Sunday as a missed
 * publication cycle) — the specific, named "critical architectural test"
 * (task §23) — using only already-persisted policy inputs and a `now`
 * value, with zero DB write, proving PRICE-P2's read-time
 * FRESH->AGING->STALE derivation is unblocked by this schema (task §24).
 */

export type CadenceKind = "intraday" | "daily" | "weekly" | "monthly";
export type CadenceIntervalUnit = "hours" | "days" | "weeks" | "months";

export interface ProviderPublicationPolicy {
  providerId: string;
  cadenceKind: CadenceKind;
  cadenceIntervalCount: number;
  cadenceIntervalUnit: CadenceIntervalUnit;
  /** ISO-8601 weekday numbers (1=Monday..7=Sunday) that count as an expected publication day. `null` = every calendar day counts (the correct default for intraday/weekly/monthly cadences, where day-of-week is not the constraining factor). */
  publicationWeekdays: number[] | null;
  /** IANA timezone identifier — day/schedule boundaries are always evaluated in this zone, never the Worker runtime's or a browser's (task §10). */
  timezone: string;
}

const VALID_CADENCE_KINDS: readonly CadenceKind[] = ["intraday", "daily", "weekly", "monthly"];
const VALID_INTERVAL_UNITS: readonly CadenceIntervalUnit[] = ["hours", "days", "weeks", "months"];

/**
 * A deliberately small, explicit allow-list of real IANA identifiers this
 * project's actual sources plausibly need — NOT an attempt at a full IANA
 * database (over-engineering for a single-country/regional B2B site, and
 * this repo stays dependency-minimal — no timezone-data package). An
 * unrecognized value fails closed rather than being silently accepted as
 * an unvalidated string; extending this list for a real future provider
 * is a one-line, low-risk change, never done speculatively.
 */
const KNOWN_TIMEZONES = new Set(["Asia/Tehran", "UTC"]);

export interface ProviderPublicationPolicyInput {
  providerId: string;
  cadenceKind: string;
  cadenceIntervalCount: number;
  cadenceIntervalUnit: string;
  publicationWeekdays?: number[] | null;
  timezone: string;
}

export type PolicyValidationResult = { ok: true; policy: ProviderPublicationPolicy } | { ok: false; reason: string };

/** Fail-closed validation — every malformed shape below is rejected explicitly, never coerced or guessed. */
export function validateProviderPublicationPolicy(input: ProviderPublicationPolicyInput): PolicyValidationResult {
  if (!input.providerId || !input.providerId.trim()) {
    return { ok: false, reason: "missing_provider_id" };
  }
  if (!VALID_CADENCE_KINDS.includes(input.cadenceKind as CadenceKind)) {
    return { ok: false, reason: "invalid_cadence_kind" };
  }
  if (!Number.isInteger(input.cadenceIntervalCount) || input.cadenceIntervalCount <= 0) {
    return { ok: false, reason: "invalid_cadence_interval_count" };
  }
  if (!VALID_INTERVAL_UNITS.includes(input.cadenceIntervalUnit as CadenceIntervalUnit)) {
    return { ok: false, reason: "invalid_cadence_interval_unit" };
  }
  if (input.publicationWeekdays != null) {
    if (input.publicationWeekdays.length === 0) {
      // An explicit empty list would mean "no day is ever a valid publication
      // day" — nonsensical for an active policy; use `null` ("every day
      // counts") instead of an empty array to express "no weekday restriction."
      return { ok: false, reason: "empty_publication_weekdays" };
    }
    for (const day of input.publicationWeekdays) {
      if (!Number.isInteger(day) || day < 1 || day > 7) {
        return { ok: false, reason: "invalid_publication_weekday" };
      }
    }
  }
  if (!KNOWN_TIMEZONES.has(input.timezone)) {
    return { ok: false, reason: "unknown_timezone" };
  }

  return {
    ok: true,
    policy: {
      providerId: input.providerId,
      cadenceKind: input.cadenceKind as CadenceKind,
      cadenceIntervalCount: input.cadenceIntervalCount,
      cadenceIntervalUnit: input.cadenceIntervalUnit as CadenceIntervalUnit,
      publicationWeekdays: input.publicationWeekdays ?? null,
      timezone: input.timezone,
    },
  };
}

// --- Timezone-aware weekday arithmetic ------------------------------------

const WEEKDAY_TO_ISO: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

/**
 * The ISO-8601 weekday (1=Monday..7=Sunday) of `date` AS OBSERVED IN
 * `timeZone` — never the host runtime's local time. Uses only the
 * standard-library `Intl.DateTimeFormat` (no date/timezone-data
 * dependency added).
 */
export function isoWeekdayInTimezone(date: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date);
  const iso = WEEKDAY_TO_ISO[formatted];
  if (iso === undefined) {
    throw new Error(`isoWeekdayInTimezone: unrecognized weekday "${formatted}" for timezone "${timeZone}"`);
  }
  return iso;
}

/**
 * Counts how many of the policy's expected publication days fall strictly
 * after `from` and up to and including `to`, evaluated in the policy's own
 * timezone. Meaningful for day-granularity ("daily") cadences with a
 * `publicationWeekdays` restriction — this is the specific function that
 * proves a Mon-Fri business-daily source's Friday->Monday gap counts as
 * exactly one missed cycle (Monday), never three (Fri/Sat/Sun) or zero.
 *
 * Steps in fixed 24-hour UTC increments rather than a full DST-aware
 * calendar-day walk — a deliberate, documented simplification (task's own
 * "do not over-engineer" instruction): correct for this project's actual
 * timezone (`Asia/Tehran`, no DST since 2022) and for `UTC`, and each
 * step's weekday is still read correctly in the policy's declared
 * timezone via `isoWeekdayInTimezone`, so the specific frozen weekend
 * scenario this function exists to prove is answered correctly regardless.
 */
export function countExpectedPublicationDaysBetween(policy: ProviderPublicationPolicy, from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;

  let count = 0;
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Start at the first whole day boundary strictly after `from`.
  let cursor = new Date(Math.floor(from.getTime() / oneDayMs) * oneDayMs + oneDayMs);

  while (cursor.getTime() <= to.getTime()) {
    const weekday = isoWeekdayInTimezone(cursor, policy.timezone);
    if (!policy.publicationWeekdays || policy.publicationWeekdays.includes(weekday)) {
      count += 1;
    }
    cursor = new Date(cursor.getTime() + oneDayMs);
  }

  return count;
}

// --- Generic missed-expected-cycle counting (PRICE-P2) ---------------------
//
// `countMissedExpectedCycles` is the single entry point
// `lib/pricing/freshness.ts#classifyQuoteFreshness` calls — it dispatches on
// `policy.cadenceIntervalUnit` (never `policy.cadenceKind`, and never
// `policy.providerId` — no provider-specific branch anywhere in this file).
// `cadenceKind` remains a purely descriptive/audit label (its own frozen
// concept, distinct from "interval/count" — PRICE-P1's own design note);
// `cadenceIntervalUnit` is what actually determines the arithmetic, so a
// policy's `cadenceKind` need not perfectly correspond to it for the
// classification to remain correct.
//
//   'hours' / 'weeks' -> a genuinely fixed-length cycle (N hours, N weeks) —
//     plain elapsed-time division is exact and correct; a weekday
//     restriction is deliberately NOT applied here (task §10: "Do not apply
//     business-day calendar rules in a way that breaks valid intraday
//     behavior" — the same reasoning extends to weekly).
//   'days' -> reuses `countExpectedPublicationDaysBetween` (the
//     weekday-aware day-stepping walk above) — the one unit where a
//     `publicationWeekdays` restriction is meaningful and honored.
//   'months' -> genuine CALENDAR-month stepping (task §11: "do not
//     approximate one month as an arbitrary fixed 30-day constant") — counts
//     how many calendar-month boundaries, in the policy's own timezone, fall
//     between `from` and `to`, divided by `cadenceIntervalCount`. Crossing
//     from the last day of one month into the first day of the next counts
//     as one elapsed month even though only ~24h of wall-clock time passed —
//     intentional, matching how a real "published once per calendar month"
//     source actually behaves, not a duration approximation.
//
// Returns `null` (never a fabricated number) for an unrecognized
// `cadenceIntervalUnit` — defensive; `validateProviderPublicationPolicy`
// already rejects this before a policy can ever reach here, but the
// classifier fails closed on `null` (UNAVAILABLE) rather than assuming its
// input was always pre-validated, matching the same discipline applied to
// timestamp parsing throughout this module.
export function countMissedExpectedCycles(policy: ProviderPublicationPolicy, from: Date, to: Date): number | null {
  if (to.getTime() <= from.getTime()) return 0;

  switch (policy.cadenceIntervalUnit) {
    case "days":
      return countExpectedPublicationDaysBetween(policy, from, to);
    case "hours":
      return countFixedLengthCyclesBetween(from, to, policy.cadenceIntervalCount * 60 * 60 * 1000);
    case "weeks":
      return countFixedLengthCyclesBetween(from, to, policy.cadenceIntervalCount * 7 * 24 * 60 * 60 * 1000);
    case "months":
      return countCalendarMonthCyclesBetween(policy, from, to);
    default:
      return null;
  }
}

function countFixedLengthCyclesBetween(from: Date, to: Date, cycleLengthMs: number): number {
  return Math.floor((to.getTime() - from.getTime()) / cycleLengthMs);
}

function yearMonthInTimezone(date: Date, timeZone: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value); // 1-12
  return { year, month };
}

function countCalendarMonthCyclesBetween(policy: ProviderPublicationPolicy, from: Date, to: Date): number {
  const fromYm = yearMonthInTimezone(from, policy.timezone);
  const toYm = yearMonthInTimezone(to, policy.timezone);
  const monthsElapsed = (toYm.year * 12 + toYm.month) - (fromYm.year * 12 + fromYm.month);
  return Math.floor(Math.max(0, monthsElapsed) / policy.cadenceIntervalCount);
}
