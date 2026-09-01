import { getAppBaseUrl } from "../env.ts";

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
