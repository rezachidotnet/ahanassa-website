import type { Locale } from "../../config/locales.ts";
import { PUBLISHED_INDICATOR_COLUMNS, PUBLISHED_INDICATOR_POINT_COLUMNS, type PublishedIndicatorPointRow, type PublishedIndicatorRow } from "../contracts/snapshot-indicators.ts";
import { allowedIndicatorTexts, bareAttribution, DRIVERS_COPY, driversItems, INDICATOR_ATTRIBUTE, INDICATOR_COPY, INDICATOR_LINE_ATTRIBUTE, indicatorsFromRows, presentIndicator, type Indicator } from "../indicators/presentation.ts";
import { fileLocale } from "./leak-scan.ts";
import { elementsWithAttribute, residue, visibleText } from "./price-gate.ts";

/**
 * W18.2 indicator gate — run by the artifact gate on every artifact (lib/static/artifact-gate.ts). Pure.
 *
 * 1. Private snapshot: `published_indicators` / `published_indicator_points` rows carry exactly their columns.
 * 2. Every element that shows ONE indicator (`data-aa-indicator="<code>"`, any locale) names an indicator of the
 *    snapshot and carries the locale's «reference index — not an Ahan Assa selling price» label, its source (the
 *    attribution) and its date — and nothing else than that indicator's own texts and values (lib/indicators/
 *    presentation.ts allowedIndicatorTexts).
 * 3. The fa drivers line (`data-aa-indicator-line="<code> …"`): fa pages only; every code is in the snapshot; it
 *    carries the reference label and every listed indicator's attribution, and nothing else than their texts.
 *
 * The price gate keeps indicator elements out of its "amount outside a price element" rule (an index value can
 * never look like a price leak), and the leak scan still runs over them like any other text.
 */
export interface IndicatorFinding {
  file: string;
  kind: "indicator_field_not_allowed" | "indicator_unknown" | "indicator_label_missing" | "indicator_text_not_allowed" | "indicator_line_not_allowed";
  match: string;
}

export interface IndicatorGateInput {
  indicators: Map<string, Indicator>;
  findings: IndicatorFinding[];
}

export function indicatorGateInput(snapshot: unknown): IndicatorGateInput {
  const tables = (snapshot as { tables?: Record<string, unknown[]> } | null)?.tables ?? {};
  const findings: IndicatorFinding[] = [];
  const check = (table: string, columns: readonly string[]) => {
    for (const raw of (tables[table] ?? []) as Record<string, unknown>[]) for (const key of Object.keys(raw ?? {})) if (!columns.includes(key)) findings.push({ file: "private-snapshot/snapshot.json", kind: "indicator_field_not_allowed", match: `${table}.${key}` });
  };
  check("published_indicators", PUBLISHED_INDICATOR_COLUMNS);
  check("published_indicator_points", PUBLISHED_INDICATOR_POINT_COLUMNS);
  const list = indicatorsFromRows((tables.published_indicators ?? []) as PublishedIndicatorRow[], (tables.published_indicator_points ?? []) as PublishedIndicatorPointRow[]);
  return { indicators: new Map(list.map((i) => [i.code, i])), findings };
}

export function scanIndicators(files: ReadonlyArray<{ path: string; content: string }>, input: IndicatorGateInput): IndicatorFinding[] {
  const findings: IndicatorFinding[] = [...input.findings];
  for (const { path, content } of files) {
    if (!path.endsWith(".html")) continue;
    const locale: Locale = fileLocale(path) ?? "fa";
    const t = INDICATOR_COPY[locale];
    for (const el of elementsWithAttribute(content, [INDICATOR_ATTRIBUTE])) {
      const indicator = input.indicators.get(el.value);
      if (!indicator) {
        findings.push({ file: path, kind: "indicator_unknown", match: `${INDICATOR_ATTRIBUTE}="${el.value}"` });
        continue;
      }
      const text = visibleText(el.html);
      const v = presentIndicator(locale, indicator);
      for (const [what, needed] of [["reference label", t.reference], ["source", v.attribution], ["date", v.stamp]] as const) if (!text.includes(needed)) findings.push({ file: path, kind: "indicator_label_missing", match: `${el.value}: no ${what}` });
      const left = residue(text, allowedIndicatorTexts(locale, indicator));
      if (left) findings.push({ file: path, kind: "indicator_text_not_allowed", match: `${el.value}: ${left.slice(0, 120)}` });
    }
    for (const el of elementsWithAttribute(content, [INDICATOR_LINE_ATTRIBUTE])) {
      if (locale !== "fa") {
        findings.push({ file: path, kind: "indicator_line_not_allowed", match: `${INDICATOR_LINE_ATTRIBUTE} on a ${locale} page` });
        continue;
      }
      const codes = el.value.split(/\s+/).filter(Boolean);
      const listed = codes.map((c) => input.indicators.get(c));
      if (codes.length === 0 || listed.some((i) => !i)) {
        findings.push({ file: path, kind: "indicator_unknown", match: `${INDICATOR_LINE_ATTRIBUTE}="${el.value}"` });
        continue;
      }
      const indicators = listed as Indicator[];
      const text = visibleText(el.html);
      if (!text.includes(INDICATOR_COPY.fa.reference)) findings.push({ file: path, kind: "indicator_label_missing", match: `drivers line: no reference label` });
      for (const i of indicators) if (!text.includes(bareAttribution("fa", i.attributions.fa))) findings.push({ file: path, kind: "indicator_label_missing", match: `drivers line: no source of ${i.code}` });
      const allowed = [DRIVERS_COPY.fa.lead, DRIVERS_COPY.fa.sources, INDICATOR_COPY.fa.reference, ...driversItems("fa", indicators).map((d) => d.text), ...indicators.map((i) => bareAttribution("fa", i.attributions.fa))];
      const left = residue(text, allowed);
      if (left) findings.push({ file: path, kind: "indicator_text_not_allowed", match: `drivers line: ${left.slice(0, 120)}` });
    }
  }
  return findings;
}
