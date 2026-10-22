/**
 * Iran's official holidays besides Fridays — the one list the daily price bulletin (lib/price-channel/) and the
 * site's stale-price rule (W31, lib/pricing/price-staleness.ts) share. Fixed solar-calendar holidays are listed by
 * Jalali month-day; the lunar ones move every year, so their Gregorian dates (YYYY-MM-DD) go in `dates`. A missed
 * entry is harmless for the bulletin (a day without validated prices gets no bulletin anyway); for the stale-price
 * rule it only makes the notice appear up to one day early.
 *
 * Source of `dates`: ONLY the official calendar of the University of Tehran Institute of Geophysics Calendar Center
 * (مرکز تقویم مؤسسه ژئوفیزیک دانشگاه تهران), «تعطیلات رسمی سال ۱۴۰۵»:
 * https://calendar.ut.ac.ir/documents/2139738/7092644/Holiday-1405.pdf (fetched 2026-10-22). Each Jalali date of that
 * list was converted with Intl's Persian calendar and its weekday checked against the list's «روز هفته» column.
 * Moving holidays that fall on a fixed entry of `jalali` (Eid al-Fitr on 1–2 Farvardin, Ghadir on 14 Khordad) are
 * not repeated. Lunar holidays may still be moved by an official announcement (moon sighting): update from the
 * same source.
 *
 * TODO(1406 SH, 2027-03-21 → 2028-03-19): the Calendar Center's page for 1406 says «تقویم سال ۱۴۰۶ در دست اقدام
 * می‌باشد» (still in preparation, checked 2026-10-22) — add its lunar holidays from Holiday-1406.pdf once
 * published. Not guessed here.
 */
export const HOLIDAYS = {
  jalali: ["01-01", "01-02", "01-03", "01-04", "01-12", "01-13", "03-14", "03-15", "11-22", "12-29"],
  dates: [
    // 1405 SH — moving (lunar) official holidays.
    "2026-04-14", // 25 Farvardin — martyrdom of Imam Ja'far Sadiq
    "2026-05-27", // 6 Khordad — Eid al-Adha
    "2026-06-24", // 3 Tir — Tasua
    "2026-06-25", // 4 Tir — Ashura
    "2026-08-04", // 13 Mordad — Arbaeen
    "2026-08-12", // 21 Mordad — demise of the Prophet, martyrdom of Imam Hasan
    "2026-08-13", // 22 Mordad — martyrdom of Imam Reza
    "2026-08-21", // 30 Mordad (Friday) — martyrdom of Imam Hasan Askari
    "2026-08-30", // 8 Shahrivar — birth of the Prophet and Imam Ja'far Sadiq
    "2026-11-13", // 22 Aban (Friday) — martyrdom of Fatima Zahra
    "2026-12-23", // 2 Dey — birth of Imam Ali
    "2027-01-06", // 16 Dey — Mab'ath
    "2027-01-24", // 4 Bahman — 15 Sha'ban
    "2027-02-28", // 9 Esfand — martyrdom of Imam Ali
    "2027-03-10", // 19 Esfand — Eid al-Fitr
    "2027-03-11", // 20 Esfand — Eid al-Fitr holiday
  ] as string[],
} as const;
