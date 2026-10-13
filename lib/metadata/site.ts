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
  alternateName: "Ahan Asa",
  tagline: "ما مراقب سرمایه شما هستیم.",
  get baseUrl() {
    return getAppBaseUrl();
  },
};

/**
 * W16.3 (D-SEO, keyword map §2.2 #6): the brand in a page's `<title>` suffix — the Latin "Ahan Asa" on en
 * (its titles ended in Persian script before), «آهن آسا» on fa and ar.
 */
export function titleBrand(locale: Locale): string {
  return locale === "en" ? siteConfig.alternateName : siteConfig.name;
}
