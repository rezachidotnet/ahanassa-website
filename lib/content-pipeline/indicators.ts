import {
  INDICATOR_CODES,
  INDICATOR_RULES,
  INDICATOR_SOURCE_HOSTS,
  isIndicatorCode,
  publishedIndicatorPointRow,
  publishedIndicatorRow,
  type IndicatorCode,
  type PublishedIndicatorPointRow,
  type PublishedIndicatorRow,
} from "../contracts/snapshot-indicators.ts";
import { namesIn } from "../static/source-name-scan.ts";
import type { PricingSource } from "./pricing.ts";

/**
 * W18.2 — Odoo W18.1 market indicators (`GET /api/v1/catalog/indicators`, contract ahanassa-odoo
 * addons/ahanassa_market_indicators/docs/PUBLIC_INDICATORS_API_V1.md) for the content pipeline:
 * fetch (lib/content-pipeline/odoo-source.ts, one GET per locale) → validate (here) → snapshot
 * (lib/contracts/snapshot-indicators.ts).
 *
 * Owner rules (W18.2):
 * - Indicators NEVER block a publish: a failed fetch, a 404 or an invalid envelope gives no indicators and one
 *   warning; an invalid indicator is dropped alone, with a warning. The catalog and the prices publish as before.
 * - Strict schema: every documented key is listed below; any other key is IGNORED (never stored), reported.
 * - Only INDICATOR_CODES are kept. IME (`group: "ime"`) is never stored, whatever Odoo's switch says; neither is
 *   any other code (a free-market series included).
 * - A text or link that names a listed price-source website (the private list, AHANASSA_PRICE_SOURCE_NAMES_FILE)
 *   drops the indicator; the warning never repeats the name.
 * - en texts carry no Arabic script and ar texts no Persian-only letters or digits (the leak scan's own rule), so
 *   an indicator can never turn a page's leak scan red.
 *
 * Pure: no I/O, no clock (the caller passes the fetch time and the name list).
 */
export const INDICATORS_LOCALES = ["fa", "en", "ar"] as const;
export type IndicatorsLocale = (typeof INDICATORS_LOCALES)[number];
/** One year of history (the en/ar page charts 12 months; the fa drivers line needs the last two values). */
export const INDICATORS_DAYS = 365;
export const indicatorsPath = (locale: IndicatorsLocale) => `/api/v1/catalog/indicators?locale=${locale}&days=${INDICATORS_DAYS}`;

export type IndicatorsSource = Partial<Record<IndicatorsLocale, PricingSource>>;

export const INDICATOR_ENTRY_KEYS = new Set(["code", "series", "fallback", "group", "name", "label", "kind", "unit", "frequency", "attribution", "source_url", "licence", "last", "previous", "change", "history", "latest_session"]);
export const INDICATOR_POINT_KEYS = new Set(["date", "period", "value", "preliminary"]);
export const INDICATOR_LABEL_KEYS = new Set(["kind", "text"]);
export const INDICATOR_CHANGE_KEYS = new Set(["absolute", "percent"]);
export const INDICATOR_META_KEYS = new Set(["locale", "days", "count"]);
const ENVELOPE_KEYS = new Set(["data", "meta"]);

/** A value older than this (days before the fetch) is not shown: an old number must never read as today's. Parameter. */
export const INDICATOR_MAX_AGE_DAYS: Record<"daily" | "monthly", number> = { daily: 14, monthly: 200 };

const PERSIAN_SPECIFIC = /[پچژگکی۰-۹]/;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type IndicatorsOutcome = "published" | "empty_not_deployed" | "empty_fetch_failed" | "empty_invalid" | "empty_none";

export interface IndicatorsValidation {
  rows: PublishedIndicatorRow[];
  points: PublishedIndicatorPointRow[];
  warnings: string[];
  ignored: string[];
  outcome: IndicatorsOutcome;
  /** One line for the run summary. */
  summary: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nonBlank = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function unknownKeys(where: string, value: Record<string, unknown>, allowed: ReadonlySet<string>, ignored: Set<string>): void {
  for (const k of Object.keys(value)) if (!allowed.has(k)) ignored.add(`${where}.${k}`);
}

interface Point {
  date: string;
  value: number;
  preliminary: boolean;
}

/** One API point → a point, or an error string. */
function readPoint(raw: unknown, frequency: "daily" | "monthly", ignored: Set<string>): Point | string {
  if (!isObject(raw)) return "a point is not an object";
  unknownKeys("indicator.point", raw, INDICATOR_POINT_KEYS, ignored);
  const { date, value, preliminary, period } = raw;
  if (typeof date !== "string" || !ISO_DAY.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return `date ${JSON.stringify(date)} is not YYYY-MM-DD`;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return `${date}: value ${JSON.stringify(value)} is not a positive number`;
  if (typeof preliminary !== "boolean") return `${date}: preliminary must be true or false`;
  if (frequency === "monthly" && (period !== date.slice(0, 7) || !date.endsWith("-01"))) return `${date}: a monthly value must be dated the 1st of its period (period ${JSON.stringify(period)})`;
  return { date, value, preliminary };
}

/** The checked, locale-independent part of one entry, or an error string. */
interface Entry {
  code: IndicatorCode;
  series: string;
  fallback: boolean;
  unit: string;
  sourceUrl: string;
  name: string;
  attribution: string;
  points: Point[];
}

function readEntry(raw: Record<string, unknown>, code: IndicatorCode, fetchedAt: string, ignored: Set<string>): Entry | string {
  const rule = INDICATOR_RULES[code];
  unknownKeys("indicator", raw, INDICATOR_ENTRY_KEYS, ignored);
  if (typeof raw.series !== "string" || !rule.series.includes(raw.series)) return `series ${JSON.stringify(raw.series)} is not a known series of it`;
  if (typeof raw.fallback !== "boolean" || raw.fallback !== (raw.series !== code)) return "fallback does not match the served series";
  if (!isObject(raw.label)) return "label is not an object";
  unknownKeys("indicator.label", raw.label, INDICATOR_LABEL_KEYS, ignored);
  if (raw.label.kind !== rule.labelKind) return `label.kind ${JSON.stringify(raw.label.kind)} is not ${rule.labelKind}`;
  if (raw.kind !== rule.kind) return `kind ${JSON.stringify(raw.kind)} is not ${rule.kind}`;
  if (raw.frequency !== rule.frequency) return `frequency ${JSON.stringify(raw.frequency)} is not ${rule.frequency}`;
  if (!nonBlank(raw.unit)) return "unit is empty";
  if (!nonBlank(raw.name)) return "name is empty";
  if (!nonBlank(raw.attribution)) return "attribution is empty";
  if (typeof raw.source_url !== "string") return "source_url is missing";
  let host: string;
  try {
    const url = new URL(raw.source_url);
    if (url.protocol !== "https:") return "source_url is not https";
    host = url.host;
  } catch {
    return "source_url is not a URL";
  }
  if (!(INDICATOR_SOURCE_HOSTS as readonly string[]).includes(host)) return `source_url host ${host} is not an allowed source`;
  if (isObject(raw.change)) unknownKeys("indicator.change", raw.change, INDICATOR_CHANGE_KEYS, ignored);
  if (!Array.isArray(raw.history)) return "history is not an array";
  const points: Point[] = [];
  for (const p of raw.history) {
    const point = readPoint(p, rule.frequency, ignored);
    if (typeof point === "string") return point;
    points.push(point);
  }
  if (points.some((p, i) => i > 0 && p.date <= points[i - 1].date)) return "history is not oldest first without duplicates";
  if (points.length === 0 || raw.last === null || raw.last === undefined) return "no values yet";
  const last = readPoint(raw.last, rule.frequency, ignored);
  if (typeof last === "string") return `last: ${last}`;
  const newest = points[points.length - 1];
  if (last.date !== newest.date || last.value !== newest.value) return "last is not the newest history point";
  if (raw.previous !== null && raw.previous !== undefined) {
    const previous = readPoint(raw.previous, rule.frequency, ignored);
    if (typeof previous === "string") return `previous: ${previous}`;
  }
  const fetchedDay = fetchedAt.slice(0, 10);
  const ageDays = (Date.parse(`${fetchedDay}T00:00:00Z`) - Date.parse(`${newest.date}T00:00:00Z`)) / 86_400_000;
  if (ageDays < -1) return `the newest value (${newest.date}) is in the future`;
  if (ageDays > INDICATOR_MAX_AGE_DAYS[rule.frequency]) return `the newest value (${newest.date}) is older than ${INDICATOR_MAX_AGE_DAYS[rule.frequency]} days`;
  return { code, series: raw.series, fallback: raw.fallback, unit: raw.unit.trim(), sourceUrl: raw.source_url, name: raw.name.trim(), attribution: raw.attribution.trim(), points };
}

/** The entries of one locale's response by code (known codes only), or the reason the envelope is unusable. */
function readLocale(source: PricingSource | undefined, locale: IndicatorsLocale, ignored: Set<string>, notes: Set<string>): Map<string, Record<string, unknown>> | string {
  if (!source || source.status === "not_deployed") return `not_deployed:${locale}: ${indicatorsPath(locale)} is not deployed (HTTP ${source?.http_status ?? "not fetched"})`;
  if (source.status === "failed") return `failed:${locale}: GET ${indicatorsPath(locale)} failed (${source.error ?? `HTTP ${source.http_status ?? "?"}`})`;
  const body = source.body;
  if (!isObject(body) || !Array.isArray(body.data) || !isObject(body.meta)) return `invalid:${locale}: the response is not {data: [...], meta: {...}}`;
  unknownKeys("indicators.response", body, ENVELOPE_KEYS, ignored);
  unknownKeys("indicators.meta", body.meta, INDICATOR_META_KEYS, ignored);
  if (body.meta.locale !== locale) return `invalid:${locale}: meta.locale is ${JSON.stringify(body.meta.locale)}`;
  const byCode = new Map<string, Record<string, unknown>>();
  for (const raw of body.data) {
    if (!isObject(raw) || typeof raw.code !== "string") return `invalid:${locale}: an entry has no code`;
    // IME is off on the website (owner, W18.2): never read, whatever Odoo serves.
    if (raw.group === "ime") {
      notes.add(`IME indicator ${raw.code} ignored (IME is not shown on the website)`);
      continue;
    }
    if (!isIndicatorCode(raw.code)) {
      notes.add(`indicator ${raw.code} ignored (not one the website shows)`);
      continue;
    }
    if (byCode.has(raw.code)) return `invalid:${locale}: duplicate indicator ${raw.code}`;
    byCode.set(raw.code, raw);
  }
  return byCode;
}

/**
 * Validates the three locale responses and returns the snapshot rows. `sourceNames`: the private list of
 * price-source website names (null when not configured).
 */
export function validateIndicators(source: IndicatorsSource | undefined, fetchedAt: string, sourceNames: readonly string[] | null = null): IndicatorsValidation {
  const ignored = new Set<string>();
  const notes = new Set<string>();
  const warnings: string[] = [];
  const empty = (outcome: IndicatorsOutcome, why: string): IndicatorsValidation => {
    const summary = `NO MARKET INDICATORS: ${why}; the indicator strip, decision-block drivers line and indicators page are left out (catalog and prices publish normally)`;
    return { rows: [], points: [], warnings: [`indicators: ${summary}`], ignored: [...ignored].sort(), outcome, summary };
  };
  const locales = new Map<IndicatorsLocale, Map<string, Record<string, unknown>>>();
  for (const locale of INDICATORS_LOCALES) {
    const read = readLocale(source?.[locale], locale, ignored, notes);
    if (typeof read === "string") {
      const [kind, ...rest] = read.split(":");
      return empty(kind === "not_deployed" ? "empty_not_deployed" : kind === "failed" ? "empty_fetch_failed" : "empty_invalid", rest.join(":").trim());
    }
    locales.set(locale, read);
  }

  const rows: PublishedIndicatorRow[] = [];
  const points: PublishedIndicatorPointRow[] = [];
  for (const code of INDICATOR_CODES) {
    const raws = INDICATORS_LOCALES.map((l) => locales.get(l)!.get(code));
    if (raws.every((r) => !r)) continue; // Odoo does not serve it (yet)
    const drop = (why: string) => warnings.push(`indicators: ${code}: ${why}; not shown`);
    if (raws.some((r) => !r)) {
      drop(`missing in ${INDICATORS_LOCALES.filter((_, i) => !raws[i]).join("/")}`);
      continue;
    }
    const entries = raws.map((r) => readEntry(r!, code, fetchedAt, ignored));
    const bad = entries.findIndex((e) => typeof e === "string");
    if (bad >= 0) {
      drop(`${INDICATORS_LOCALES[bad]}: ${entries[bad] as string}`);
      continue;
    }
    const [fa, en, ar] = entries as Entry[];
    if (en.series !== fa.series || ar.series !== fa.series || JSON.stringify(en.points) !== JSON.stringify(fa.points) || JSON.stringify(ar.points) !== JSON.stringify(fa.points) || en.sourceUrl !== fa.sourceUrl || ar.sourceUrl !== fa.sourceUrl || en.unit !== fa.unit || ar.unit !== fa.unit) {
      drop("the fa/en/ar responses disagree (series, values, unit or source); published between the requests?");
      continue;
    }
    if (ARABIC_SCRIPT.test(en.name) || ARABIC_SCRIPT.test(en.attribution) || ARABIC_SCRIPT.test(fa.unit)) {
      drop("the English name, attribution or unit holds Arabic-script text");
      continue;
    }
    if (PERSIAN_SPECIFIC.test(ar.name) || PERSIAN_SPECIFIC.test(ar.attribution)) {
      drop("the Arabic name or attribution holds Persian-only letters or digits");
      continue;
    }
    if (sourceNames?.length && namesIn([fa.name, en.name, ar.name, fa.attribution, en.attribution, ar.attribution, fa.sourceUrl, fa.unit].join("\n"), sourceNames).length) {
      drop("a text or link names a listed price-source website");
      continue;
    }
    const row = publishedIndicatorRow.safeParse({
      code,
      series_code: fa.series,
      is_fallback: fa.fallback ? 1 : 0,
      kind: INDICATOR_RULES[code].kind,
      label_kind: INDICATOR_RULES[code].labelKind,
      unit: fa.unit,
      frequency: INDICATOR_RULES[code].frequency,
      source_url: fa.sourceUrl,
      name_fa: fa.name,
      name_en: en.name,
      name_ar: ar.name,
      attribution_fa: fa.attribution,
      attribution_en: en.attribution,
      attribution_ar: ar.attribution,
    });
    if (!row.success) {
      drop(`schema: ${row.error.issues.map((i) => i.message).join("; ")}`);
      continue;
    }
    const pointRows = fa.points.map((p) => publishedIndicatorPointRow.safeParse({ code, date: p.date, value: p.value, preliminary: p.preliminary ? 1 : 0 }));
    if (pointRows.some((p) => !p.success)) {
      drop("a history point does not fit the snapshot schema");
      continue;
    }
    rows.push(row.data);
    points.push(...pointRows.map((p) => p.data!));
  }
  const ignoredList = [...ignored].sort();
  if (ignoredList.length) warnings.push(`indicators: ignored ${ignoredList.length} field(s) the website does not know (never stored or rendered): ${ignoredList.join(", ")}`);
  if (rows.length === 0) {
    const summary = `NO MARKET INDICATORS: none of ${INDICATOR_CODES.join(", ")} is usable${notes.size ? ` (${[...notes].join("; ")})` : ""}; the indicator surfaces are left out (catalog and prices publish normally)`;
    return { rows, points, warnings: [...warnings, `indicators: ${summary}`], ignored: ignoredList, outcome: "empty_none", summary };
  }
  return {
    rows,
    points,
    warnings,
    ignored: ignoredList,
    outcome: "published",
    summary: `${rows.length} indicator(s) (${rows.map((r) => `${r.code}${r.is_fallback ? ` via ${r.series_code}` : ""}`).join(", ")}), ${points.length} point(s)${notes.size ? `; ${[...notes].join("; ")}` : ""}`,
  };
}
