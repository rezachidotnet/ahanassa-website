/**
 * W20.3 redesign — the «open now» / «opens Saturday 8:00» line of the homepage expert section, computed in the
 * browser (components/home/expert-open-status.tsx) in Asia/Tehran time from company.ts WORKING_HOURS. Pure and
 * import-free, so the one client island stays tiny and the rules are unit-testable under `node --test`.
 * A day missing from the hours (Friday) is closed.
 */

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningSpec {
  readonly dayOfWeek: readonly Weekday[];
  /** "HH:MM", Tehran time. */
  readonly opens: string;
  readonly closes: string;
}

export type OpenState = { open: true; closes: string } | { open: false; day: Weekday; when: "today" | "tomorrow" | "later"; opens: string };

/** The labels the island renders; `{time}` and `{day}` are filled in. Plain data, so a server component can pass them. */
export interface OpenStateLabels {
  open: string;
  closed: string;
  today: string;
  tomorrow: string;
  days: Record<Weekday, string>;
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The weekday and minute of the day in Tehran (Iran has kept UTC+3:30 all year since 2022; Intl applies the zone either way). */
export function tehranClock(now: Date): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: get("weekday") as Weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Open now (until when), or the next opening: later today, tomorrow, or a named day. */
export function openState(now: Date, hours: readonly OpeningSpec[]): OpenState | null {
  const { day, minutes } = tehranClock(now);
  const start = WEEKDAYS.indexOf(day);
  if (start < 0) return null;
  for (let offset = 0; offset < 8; offset++) {
    const d = WEEKDAYS[(start + offset) % 7];
    const spec = hours.find((h) => h.dayOfWeek.includes(d));
    if (!spec) continue;
    if (offset === 0) {
      if (minutes >= minutesOf(spec.opens) && minutes < minutesOf(spec.closes)) return { open: true, closes: spec.closes };
      if (minutes >= minutesOf(spec.opens)) continue;
    }
    return { open: false, day: d, when: offset === 0 ? "today" : offset === 1 ? "tomorrow" : "later", opens: spec.opens };
  }
  return null;
}

/** "08:00" → fa «۸» (whole hours, Persian digits, like company.ts fa hours), en/ar «8:00». */
export function formatTime(hhmm: string, locale: "fa" | "en" | "ar"): string {
  const h = String(Number(hhmm.slice(0, 2)));
  const m = hhmm.slice(3, 5);
  if (locale !== "fa") return `${h}:${m}`;
  return (m === "00" ? h : `${h}:${m}`).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)]);
}

/** The visible line for a state. */
export function openStateText(state: OpenState, labels: OpenStateLabels, locale: "fa" | "en" | "ar"): string {
  if (state.open) return labels.open.replace("{time}", formatTime(state.closes, locale));
  const day = state.when === "today" ? labels.today : state.when === "tomorrow" ? labels.tomorrow : labels.days[state.day];
  return labels.closed.replace("{day}", day).replace("{time}", formatTime(state.opens, locale));
}
