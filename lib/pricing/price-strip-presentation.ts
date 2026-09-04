/**
 * Pure presentation logic for the Homepage Price Strip (PRICE-P4,
 * docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md). Split out of
 * `components/home/price-strip.tsx` for the same reason
 * `lib/catalog/specification-presenter.ts` is split out of any single
 * component: `components/home/price-strip.tsx` imports `next/link`, which
 * has no real resolvable package in this repo (vinext provides it only at
 * build time via Vite) — it structurally cannot be imported under plain
 * `node --test`/`tsx --test`. This module has zero React/Next dependency,
 * so the actual wording/threshold/conditional-formatting DECISIONS the
 * component makes are independently unit-testable; only the JSX/markup
 * shell itself is left untestable-under-Node, and that shell is instead
 * pinned by a static source-text test
 * (lib/pricing/price-strip-static.test.ts) and verified by a real browser
 * (PRICE_P4_FINAL_UI_VERIFICATION_REPORT.md).
 */

import type { Locale } from "@/config/locales";
import type { PublicPriceStripItem } from "./types.ts";

const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };

/**
 * Frozen render threshold (PRICE-P4 §4): a lone benchmark is never shown in
 * visual isolation. The read model's own cap
 * (lib/pricing/price-strip-config.ts#MAX_HOMEPAGE_PRICE_STRIP_ITEMS) is the
 * separate upper bound; this is the lower-bound gate the component itself
 * owns.
 */
export function shouldRenderPriceStrip(itemCount: number): boolean {
  return itemCount >= 2;
}

export function formatToman(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale]).format(value);
}

/** Falls back to the raw ISO string on a malformed timestamp rather than throwing — a rendering concern must never crash the Homepage. */
export function formatEffectiveTimestamp(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_NUMERALS_FOR[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Market/location and delivery basis render only when materially present, joined by a locale-neutral middle dot — never a literal "undefined"/"null"/"-" for an absent value (task §10). */
export function buildCommercialContextLine(marketOrLocation: string | undefined, deliveryBasis: string | undefined): string {
  return [marketOrLocation, deliveryBasis].filter((value): value is string => Boolean(value)).join(" · ");
}

export interface FreshnessCopy {
  updatedPrefix: string;
  agingPrefix: string;
}

/**
 * FRESH -> "{updatedPrefix} {timestamp}" (e.g. "به‌روزرسانی 10:42").
 * AGING -> "{agingPrefix} · {timestamp}" (e.g. "آخرین قیمت ثبت‌شده · 12
 * شهریور، 14:10") — Frozen V2.1 §36.8. The real timestamp is always present
 * in both cases; freshness is communicated by wording, never color alone.
 * STALE/UNAVAILABLE are unreachable here — `PublicPriceStripItem.freshnessState`
 * is typed as `"fresh" | "aging"` only (PRICE-P3).
 */
export function buildFreshnessLine(freshnessState: PublicPriceStripItem["freshnessState"], timestampLabel: string, copy: FreshnessCopy): string {
  return freshnessState === "aging" ? `${copy.agingPrefix} · ${timestampLabel}` : `${copy.updatedPrefix} ${timestampLabel}`;
}
