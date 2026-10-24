import { getAppBaseUrl } from "../env.ts";
import type { Locale } from "../../config/locales.ts";

/**
 * Brand facts stable across every documentation layer this session
 * (PROJECT_OVERRIDES.md, CLAUDE.md §7). Do not add unapproved facts here —
 * see PROJECT_OVERRIDES.md §10 for what remains genuinely unconfirmed.
 */
export const siteConfig = {
  name: "آهن آسا",
  legalOwner: "Cyan Sanat Iranian Co. LTD",
  /** W44 (owner, 2026-10-24; PROJECT_OVERRIDES.md §18): the Latin brand everywhere on the site. */
  latinName: "Ahan Assa",
  /**
   * W44: the Latin spelling used until 2026-10-24. It survives only as a JSON-LD `alternateName`, so search
   * engines link the old name to the brand; never in visible copy (lib/static/brand-name-gate.ts).
   */
  legacyLatinName: "Ahan Asa",
  tagline: "ما مراقب سرمایه شما هستیم.",
  get baseUrl() {
    return getAppBaseUrl();
  },
};

/**
 * W16.3 (D-SEO, keyword map §2.2 #6): the brand in a page's `<title>` suffix — the Latin "Ahan Assa" on en
 * (its titles ended in Persian script before), «آهن آسا» on fa and ar.
 */
export function titleBrand(locale: Locale): string {
  return locale === "en" ? siteConfig.latinName : siteConfig.name;
}

/**
 * W44: the brand nodes' (Organization, LocalBusiness, WebSite) `name` and `alternateName` — one entity across
 * locales, so the same on every page: the Latin brand as `name`, the Persian name and the legacy Latin spelling
 * as `alternateName`.
 */
export const BRAND_SCHEMA_NAMES = {
  name: siteConfig.latinName,
  alternateName: [siteConfig.name, siteConfig.legacyLatinName],
};

const LEGACY_LATIN_BRAND = /\bAhan[ -]?Asa(?!s)\b/g;

/**
 * W44: text this repository does not own (the content repo's articles and covers, written before 2026-10-24)
 * shown with the current Latin brand. A transition aid until those sources carry «Ahan Assa» themselves.
 */
export function withCurrentLatinBrand(text: string): string {
  return text.replace(LEGACY_LATIN_BRAND, siteConfig.latinName);
}
