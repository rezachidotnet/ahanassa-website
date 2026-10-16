import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, openState, openStateText, tehranClock } from "./expert-open-state.ts";
import { WORKING_HOURS } from "./company.ts";
import { homeExpertCopy } from "./home-expert.ts";

/** W20.3 redesign — the expert section's live open-now line, in Asia/Tehran time (UTC+3:30, no DST since 2022). */

// 2026-10-17 is a Saturday. Tehran = UTC + 3:30.
const tehran = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCMinutes(h * 60 + m - 210);
  return utc;
};

test("Tehran clock: the zone is applied, not the machine's (UTC 04:30 = 08:00 Tehran)", () => {
  assert.deepEqual(tehranClock(new Date("2026-10-17T04:30:00Z")), { day: "Saturday", minutes: 480 });
  assert.deepEqual(tehranClock(new Date("2026-10-16T21:00:00Z")), { day: "Saturday", minutes: 30 }, "Friday 21:00 UTC is already Saturday in Tehran");
});

test("Saturday–Wednesday 8:00–17:00: open inside, closed at the edges", () => {
  assert.deepEqual(openState(tehran("2026-10-17", "08:00"), WORKING_HOURS), { open: true, closes: "17:00" });
  assert.deepEqual(openState(tehran("2026-10-21", "16:59"), WORKING_HOURS), { open: true, closes: "17:00" }, "Wednesday");
  assert.deepEqual(openState(tehran("2026-10-17", "07:59"), WORKING_HOURS), { open: false, day: "Saturday", when: "today", opens: "08:00" });
  assert.deepEqual(openState(tehran("2026-10-18", "17:00"), WORKING_HOURS), { open: false, day: "Monday", when: "tomorrow", opens: "08:00" }, "Sunday 17:00");
});

test("Thursday 8:00–12:00, as company.ts says", () => {
  assert.deepEqual(
    WORKING_HOURS.find((h) => (h.dayOfWeek as readonly string[]).includes("Thursday")),
    { dayOfWeek: ["Thursday"], opens: "08:00", closes: "12:00" },
  );
  assert.deepEqual(openState(tehran("2026-10-22", "11:59"), WORKING_HOURS), { open: true, closes: "12:00" });
  assert.deepEqual(openState(tehran("2026-10-22", "12:00"), WORKING_HOURS), { open: false, day: "Saturday", when: "later", opens: "08:00" });
  assert.deepEqual(openState(tehran("2026-10-21", "17:30"), WORKING_HOURS), { open: false, day: "Thursday", when: "tomorrow", opens: "08:00" }, "Wednesday evening");
});

test("Friday is closed all day and the next opening is Saturday 8:00", () => {
  for (const hhmm of ["00:00", "09:00", "12:00", "23:59"]) {
    assert.deepEqual(openState(tehran("2026-10-23", hhmm), WORKING_HOURS), { open: false, day: "Saturday", when: "tomorrow", opens: "08:00" }, hhmm);
  }
});

test("no hours at all: no state (nothing rendered)", () => {
  assert.equal(openState(new Date(), []), null);
});

test("labels: fa Persian digits and whole hours, en/ar 8:00; today / tomorrow / weekday", () => {
  assert.equal(formatTime("08:00", "fa"), "۸");
  assert.equal(formatTime("17:00", "fa"), "۱۷");
  assert.equal(formatTime("08:30", "fa"), "۸:۳۰");
  assert.equal(formatTime("08:00", "en"), "8:00");
  const text = (locale: "fa" | "en" | "ar", date: string, hhmm: string) => openStateText(openState(tehran(date, hhmm), WORKING_HOURS)!, homeExpertCopy[locale].status, locale);
  assert.equal(text("fa", "2026-10-17", "10:00"), "اکنون در ساعات کاری · تا ساعت ۱۷");
  assert.equal(text("fa", "2026-10-22", "13:00"), "خارج از ساعات کاری · از شنبه ساعت ۸");
  assert.equal(text("en", "2026-10-22", "10:00"), "Open now · until 12:00");
  assert.equal(text("en", "2026-10-23", "10:00"), "Closed · opens tomorrow 8:00");
  assert.equal(text("en", "2026-10-17", "06:00"), "Closed · opens today 8:00");
  assert.equal(text("ar", "2026-10-22", "13:00"), "مغلق · يفتح السبت 8:00");
  assert.equal(text("ar", "2026-10-17", "10:00"), "مفتوح الآن · حتى 17:00");
});
