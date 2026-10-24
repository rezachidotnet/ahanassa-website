import type { Locale } from "../../config/locales.ts";
import { INDICATOR_CODES, type IndicatorCode, type PublishedIndicatorPointRow, type PublishedIndicatorRow } from "../contracts/snapshot-indicators.ts";
import { formatPersianDate } from "../pricing/price-block-presentation.ts";

/**
 * W18.2 — market indicators on the website: copy and formatting. Pure; build time only (dates and numbers travel
 * as strings). The data is the snapshot's build-only `published_indicators` / `published_indicator_points`
 * (lib/contracts/snapshot-indicators.ts), read by lib/indicators/repository.ts.
 *
 * Owner rules (W18.2):
 * - Every indicator, wherever it shows, carries INDICATOR_COPY[locale].reference ("reference index — not an Ahan
 *   Asa selling price"), its source (the series' attribution, linked to its public page) and its date (a monthly
 *   value shows its DATA MONTH, so the publication lag is not read as stale data). The gate checks it
 *   (lib/static/indicator-gate.ts).
 * - Signals only: the last value and its change against the previous one. Never a forecast, never "buy now".
 * - en: no Ahan Assa price anywhere, and no ▲/▼ (the price gate keeps both off en): the change reads "+0.4%".
 * - ar: Arabic letters only (ي ك), Arabic-Indic digits, like the ar price cells.
 * - Indicators are neutral in colour (no green/red): a market move is not a recommendation.
 */

export interface IndicatorPoint {
  /** YYYY-MM-DD; a monthly value is dated the 1st of its data month. */
  date: string;
  value: number;
  preliminary: boolean;
}

/** One indicator as the pages render it (camelCase: no snapshot/API field name reaches a public payload). */
export interface Indicator {
  code: IndicatorCode;
  seriesCode: string;
  isFallback: boolean;
  frequency: "daily" | "monthly";
  /** Odoo's (English) unit text; `indicatorUnit` localizes the known ones. */
  unit: string;
  sourceHref: string;
  names: Record<Locale, string>;
  attributions: Record<Locale, string>;
  /** Oldest first; never empty. */
  points: IndicatorPoint[];
}

export interface IndicatorCopy {
  /** The label every indicator carries. */
  reference: string;
  source: string;
  dataMonth: string;
  date: string;
  preliminary: string;
  /** After the change: what it is measured against. */
  vsPrevious: string;
  unchanged: string;
  /** Monthly series: how often and with what lag they are published. */
  monthlyNote: string;
  dailyNote: string;
  /** Strip / page note: signals only. */
  note: string;
  /** The fallback series is shown (the primary has no newer data). */
  fallback: string;
  tableDate: string;
  tableValue: string;
  /** The values table's summary, and the note of a daily series' table (one value per month). */
  valuesTitle: string;
  monthEnd: string;
  /** The chart's accessible name: «<name>, last 12 months». */
  chartLabel: (name: string) => string;
}

export const INDICATOR_COPY: Record<Locale, IndicatorCopy> = {
  fa: {
    reference: "شاخص مرجع — نه قیمت فروش آهن آسا",
    source: "منبع",
    dataMonth: "ماه داده",
    date: "تاریخ",
    preliminary: "مقدماتی",
    vsPrevious: "نسبت به مقدار قبلی",
    unchanged: "بدون تغییر",
    monthlyNote: "ماهانه؛ هر ماه با حدود ۴ تا ۶ هفته تأخیر منتشر می‌شود.",
    dailyNote: "روزانه، در روزهای کاری.",
    note: "این اعداد شاخص‌های مرجع بازار جهانی و نرخ ارز هستند، نه قیمت فروش آهن آسا؛ فقط برای آگاهی از روند بازار. پیش‌بینی یا توصیه خرید نیستند.",
    fallback: "سری جایگزین (سری اصلی داده تازه‌تری ندارد)",
    tableDate: "تاریخ",
    tableValue: "مقدار",
    valuesTitle: "جدول مقادیر",
    monthEnd: "آخرین مقدار هر ماه",
    chartLabel: (name) => `نمودار ${name} در ۱۲ ماه اخیر`,
  },
  en: {
    reference: "Reference index — not an Ahan Assa selling price",
    source: "Source",
    dataMonth: "Data month",
    date: "Date",
    preliminary: "preliminary",
    vsPrevious: "vs the previous value",
    unchanged: "unchanged",
    monthlyNote: "Monthly; each month is published about 4–6 weeks later.",
    dailyNote: "Daily, on working days.",
    note: "These figures are reference indices of the global market and the exchange rate, not Ahan Assa selling prices. They show market direction only and are not a forecast or buying advice.",
    fallback: "fallback series (the primary series has no newer data)",
    tableDate: "Date",
    tableValue: "Value",
    valuesTitle: "Values",
    monthEnd: "the last value of each month",
    chartLabel: (name) => `${name}, last 12 months`,
  },
  ar: {
    reference: "مؤشر مرجعي — ليس سعر بيع لدى آهن آسا",
    source: "المصدر",
    dataMonth: "شهر البيانات",
    date: "التاريخ",
    preliminary: "أولي",
    vsPrevious: "مقارنة بالقيمة السابقة",
    unchanged: "دون تغيير",
    monthlyNote: "شهري؛ يُنشر كل شهر بعد نحو ٤ إلى ٦ أسابيع.",
    dailyNote: "يومي، في أيام العمل.",
    note: "هذه الأرقام مؤشرات مرجعية للسوق العالمية وسعر الصرف، وليست أسعار بيع لدى آهن آسا. تبيّن اتجاه السوق فقط، وليست توقعًا أو نصيحة بالشراء.",
    fallback: "سلسلة بديلة (لا تتوفر بيانات أحدث في السلسلة الأساسية)",
    tableDate: "التاريخ",
    tableValue: "القيمة",
    valuesTitle: "جدول القيم",
    monthEnd: "آخر قيمة في كل شهر",
    chartLabel: (name) => `${name}، آخر ١٢ شهرًا`,
  },
};

/** Short names for the fa drivers line (by served series), so one line stays readable. */
export const INDICATOR_SHORT_NAMES: Record<string, Record<Locale, string>> = {
  usd_irr_official_cbi: { fa: "دلار (نرخ مرکز مبادله)", en: "US dollar (Exchange Center rate)", ar: "الدولار (سعر مركز التبادل)" },
  iron_ore_wb: { fa: "سنگ آهن جهانی", en: "Iron ore", ar: "خام الحديد" },
  iron_ore_imf: { fa: "سنگ آهن جهانی", en: "Iron ore", ar: "خام الحديد" },
  us_ppi_hot_rolled: { fa: "شاخص فولاد نوردگرم آمریکا", en: "US hot-rolled steel index", ar: "مؤشر الصلب المدرفل على الساخن الأمريكي" },
  us_ppi_steel_mill: { fa: "شاخص محصولات فولادی آمریکا", en: "US steel mill products index", ar: "مؤشر منتجات الصلب الأمريكي" },
};

/** Odoo's known unit texts, localized. Any other unit is shown as Odoo wrote it (Latin, in an LTR run). */
const UNITS: Record<string, Record<Locale, string>> = {
  "IRR per USD": { fa: "ریال برای هر دلار", en: "IRR per USD", ar: "ريال لكل دولار" },
  "USD/dmtu": { fa: "دلار برای هر واحد تن متریک خشک (dmtu)", en: "USD per dry metric tonne unit (dmtu)", ar: "دولار لكل وحدة طن متري جاف (dmtu)" },
  "USD/t": { fa: "دلار برای هر تن", en: "USD per tonne", ar: "دولار لكل طن" },
  "index, 1982-06 = 100": { fa: "شاخص (ژوئن ۱۹۸۲ = ۱۰۰)", en: "index (June 1982 = 100)", ar: "مؤشر (يونيو ١٩٨٢ = ١٠٠)" },
  "index, 1982 = 100": { fa: "شاخص (۱۹۸۲ = ۱۰۰)", en: "index (1982 = 100)", ar: "مؤشر (١٩٨٢ = ١٠٠)" },
};

export function indicatorUnit(locale: Locale, unit: string): { text: string; known: boolean } {
  const known = UNITS[unit]?.[locale];
  return known ? { text: known, known: true } : { text: unit, known: false };
}

export function indicatorShortName(locale: Locale, indicator: Pick<Indicator, "seriesCode" | "names">): string {
  return INDICATOR_SHORT_NAMES[indicator.seriesCode]?.[locale] ?? indicator.names[locale];
}

const NUMERALS: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

/** Decimals per indicator: the rate in whole rials; prices and indices to one decimal. */
export function indicatorDecimals(code: IndicatorCode): number {
  return code === "usd_irr_official_cbi" ? 0 : 1;
}

export function formatIndicatorValue(locale: Locale, code: IndicatorCode, value: number): string {
  const d = indicatorDecimals(code);
  return new Intl.NumberFormat(NUMERALS[locale], { minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
}

/**
 * The date of a value: a daily value its day (fa: Persian calendar, «۱۵ مهر ۱۴۰۵»; en «7 Oct 2026»; ar «٧ أكتوبر
 * ٢٠٢٦»); a monthly value its data month, Gregorian (fa «اوت ۲۰۲۶», en «Aug 2026», ar «أغسطس ٢٠٢٦»).
 */
export function indicatorDateLabel(locale: Locale, frequency: "daily" | "monthly", date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (frequency === "monthly") {
    const tag = locale === "fa" ? "fa-IR-u-ca-gregory" : locale === "ar" ? "ar-EG" : "en-GB";
    return new Intl.DateTimeFormat(tag, { month: locale === "en" ? "short" : "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
  if (locale === "fa") return formatPersianDate(d);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: locale === "en" ? "short" : "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** «ماه داده: اوت ۲۰۲۶» / «تاریخ: ۱۵ مهر ۱۴۰۵» — the label next to every shown value. */
export function indicatorStamp(locale: Locale, frequency: "daily" | "monthly", date: string): string {
  const t = INDICATOR_COPY[locale];
  return `${frequency === "monthly" ? t.dataMonth : t.date}: ${indicatorDateLabel(locale, frequency, date)}`;
}

export interface IndicatorChange {
  direction: "up" | "down" | "none";
  /** Absolute change in percent, one decimal. */
  percent: number;
}

/** The last value against the previous one; null with fewer than two values. */
export function indicatorChange(points: readonly IndicatorPoint[]): IndicatorChange | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1].value;
  const previous = points[points.length - 2].value;
  if (!(previous > 0)) return null;
  const rounded = Math.round(((last - previous) / previous) * 1000) / 10;
  if (rounded === 0) return { direction: "none", percent: 0 };
  return { direction: rounded > 0 ? "up" : "down", percent: Math.abs(rounded) };
}

/** What a screen reader hears instead of ▲/▼ (fa/ar; en writes + / − in the text itself). */
export const INDICATOR_CHANGE_WORDS: Record<Locale, { up: string; down: string }> = {
  fa: { up: "افزایش", down: "کاهش" },
  en: { up: "up", down: "down" },
  ar: { up: "ارتفاع", down: "انخفاض" },
};

/** fa «▲ ۰٫۴٪», ar «▲ ٠٫٤٪», en «+0.4%» (no glyph on en); «بدون تغییر» / "unchanged" when flat. `word`: the glyph read aloud. */
export function formatIndicatorChange(locale: Locale, change: IndicatorChange | null): { glyph: string | null; text: string; word: string | null } | null {
  if (!change) return null;
  const t = INDICATOR_COPY[locale];
  if (change.direction === "none") return { glyph: null, text: t.unchanged, word: null };
  const n = new Intl.NumberFormat(NUMERALS[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(change.percent);
  if (locale === "en") return { glyph: null, text: `${change.direction === "up" ? "+" : "−"}${n}%`, word: null };
  return { glyph: change.direction === "up" ? "▲" : "▼", text: `${n}٪`, word: INDICATOR_CHANGE_WORDS[locale][change.direction] };
}

/** The attribution without a leading «منبع:» / "Source:" (the drivers line lists several after one word). */
export function bareAttribution(locale: Locale, attribution: string): string {
  const word = INDICATOR_COPY[locale].source;
  return attribution.startsWith(word) ? attribution.slice(word.length).replace(/^\s*[:：]\s*/, "") : attribution;
}

/** «منبع: <attribution>» — the attribution as Odoo wrote it when it already starts with the word. */
export function sourceLine(locale: Locale, attribution: string): string {
  const word = INDICATOR_COPY[locale].source;
  return attribution.startsWith(word) ? attribution : `${word}: ${attribution}`;
}

/** One indicator, ready to render (every string already localized). */
export interface IndicatorView {
  code: IndicatorCode;
  name: string;
  shortName: string;
  value: string;
  unit: { text: string; known: boolean };
  stamp: string;
  /** ISO date of the shown value (`<time dateTime>`). */
  dateTime: string;
  preliminary: boolean;
  change: { glyph: string | null; text: string; word: string | null } | null;
  attribution: string;
  /** «منبع: …» (sourceLine). */
  source: string;
  sourceHref: string;
  fallback: boolean;
  monthly: boolean;
}

export function presentIndicator(locale: Locale, indicator: Indicator): IndicatorView {
  const last = indicator.points[indicator.points.length - 1];
  return {
    code: indicator.code,
    name: indicator.names[locale],
    shortName: indicatorShortName(locale, indicator),
    value: formatIndicatorValue(locale, indicator.code, last.value),
    unit: indicatorUnit(locale, indicator.unit),
    stamp: indicatorStamp(locale, indicator.frequency, last.date),
    dateTime: indicator.frequency === "monthly" ? last.date.slice(0, 7) : last.date,
    preliminary: last.preliminary,
    change: formatIndicatorChange(locale, indicatorChange(indicator.points)),
    attribution: indicator.attributions[locale],
    source: sourceLine(locale, indicator.attributions[locale]),
    sourceHref: indicator.sourceHref,
    fallback: indicator.isFallback,
    monthly: indicator.frequency === "monthly",
  };
}

/** The drivers line's items: short name + change + date, «دلار (نرخ مرکز مبادله) ▲ ۰٫۴٪ (۱۵ مهر ۱۴۰۵)». */
export function driversItems(locale: Locale, indicators: readonly Indicator[]): { code: IndicatorCode; text: string }[] {
  return indicators.map((i) => {
    const v = presentIndicator(locale, i);
    const change = v.change ? ` ${v.change.glyph ? `${v.change.glyph} ` : ""}${v.change.text}` : "";
    return { code: i.code, text: `${v.shortName}${change} (${indicatorDateLabel(locale, i.frequency, i.points[i.points.length - 1].date)})` };
  });
}

/** The fa decision block's drivers line lead and its closing note. */
export const DRIVERS_COPY = {
  fa: { lead: "عوامل مرجع بازار", sources: "منابع" },
} as const;

/**
 * Every visible string an indicator element of `locale` may contain (the gate's allow-list for
 * `data-aa-indicator` elements): the copy, the indicator's names, unit, attribution, values and dates.
 */
export function allowedIndicatorTexts(locale: Locale, indicator: Indicator): string[] {
  const t = INDICATOR_COPY[locale];
  const v = presentIndicator(locale, indicator);
  const out = [t.reference, t.source, t.dataMonth, t.date, t.preliminary, t.vsPrevious, t.unchanged, t.monthlyNote, t.dailyNote, t.fallback, t.tableDate, t.tableValue, t.valuesTitle, t.monthEnd, v.name, v.shortName, v.unit.text, v.stamp, v.attribution, v.source, ...(v.change ? [v.change.text, ...(v.change.glyph ? [v.change.glyph] : []), ...(v.change.word ? [v.change.word] : [])] : [])];
  for (const p of indicator.points) out.push(formatIndicatorValue(locale, indicator.code, p.value), indicatorDateLabel(locale, indicator.frequency, p.date));
  return out;
}

/**
 * The marks the gate reads (lib/static/indicator-gate.ts): an element showing ONE indicator carries
 * `data-aa-indicator="<code>"`; the fa drivers line carries `data-aa-indicator-line="<code> <code> …"`.
 */
export const INDICATOR_ATTRIBUTE = "data-aa-indicator";
export const INDICATOR_LINE_ATTRIBUTE = "data-aa-indicator-line";

/** Snapshot rows → the indicators as pages render them, in the owner's order (USD/IRR, iron ore, the US index). Pure. */
export function indicatorsFromRows(rows: readonly PublishedIndicatorRow[], points: readonly PublishedIndicatorPointRow[]): Indicator[] {
  const byCode = new Map(rows.map((r) => [r.code, r]));
  return INDICATOR_CODES.flatMap((code) => {
    const r = byCode.get(code);
    const own = points.filter((p) => p.code === code).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!r || own.length === 0) return [];
    return [
      {
        code,
        seriesCode: r.series_code,
        isFallback: r.is_fallback === 1,
        frequency: r.frequency,
        unit: r.unit,
        sourceHref: r.source_url,
        names: { fa: r.name_fa, en: r.name_en, ar: r.name_ar },
        attributions: { fa: r.attribution_fa, en: r.attribution_en, ar: r.attribution_ar },
        points: own.map((p) => ({ date: p.date, value: p.value, preliminary: p.preliminary === 1 })),
      },
    ];
  });
}
