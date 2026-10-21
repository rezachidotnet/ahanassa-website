/**
 * W23 — Tehran dates and times for the bulletin. Iran has kept UTC+03:30 all year since 2022, but every value here
 * goes through Intl with the Asia/Tehran zone, so the runner's own time zone never matters.
 */
import { HOLIDAYS } from "../../config/price-channel.ts";

const TZ = "Asia/Tehran";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const jalaliNum = new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric" });
const jalaliFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, year: "numeric", month: "long", day: "numeric", weekday: "long" });

/** The Tehran calendar day (Gregorian YYYY-MM-DD) of an instant. */
export function tehranDate(at: Date | string): string {
  return dayFmt.format(new Date(at));
}

/** «HH:MM», Tehran. */
export function tehranTime(at: Date | string): string {
  return timeFmt.format(new Date(at));
}

/** Noon Tehran of a Tehran day — a safe instant to format that day with. */
export function dayInstant(day: string): Date {
  return new Date(`${day}T08:30:00Z`);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function weekday(day: string): "Sat" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" {
  return weekdayFmt.format(dayInstant(day)) as ReturnType<typeof weekday>;
}

/** Jalali month-day «MM-DD» of a Tehran day. */
export function jalaliMonthDay(day: string): string {
  const parts = Object.fromEntries(jalaliNum.formatToParts(dayInstant(day)).map((p) => [p.type, p.value]));
  return `${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** «چهارشنبه ۲۹ مهر ۱۴۰۵». */
export function persianDayLabel(day: string): string {
  const p = Object.fromEntries(jalaliFa.formatToParts(dayInstant(day)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export type DayKind = "price-day" | "friday" | "holiday";

/** Saturday–Thursday are price days, except the configured holidays. */
export function dayKind(day: string, holidays: { jalali: readonly string[]; dates: readonly string[] } = HOLIDAYS): DayKind {
  if (weekday(day) === "Fri") return "friday";
  if (holidays.dates.includes(day) || holidays.jalali.includes(jalaliMonthDay(day))) return "holiday";
  return "price-day";
}

/** Minutes since Tehran midnight of «HH:MM». */
export const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
