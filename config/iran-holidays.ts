/**
 * Iran's official holidays besides Fridays — the one list the daily price bulletin (lib/price-channel/) and the
 * site's stale-price rule (W31, lib/pricing/price-staleness.ts) share. Fixed solar-calendar holidays are listed by
 * Jalali month-day; the lunar ones move every year, so the owner adds their Gregorian dates (YYYY-MM-DD) to
 * `dates`. A missed entry is harmless for the bulletin (a day without validated prices gets no bulletin anyway);
 * for the stale-price rule it only makes the notice appear up to one day early.
 */
export const HOLIDAYS = {
  jalali: ["01-01", "01-02", "01-03", "01-04", "01-12", "01-13", "03-14", "03-15", "11-22", "12-29"],
  dates: [] as string[],
} as const;
