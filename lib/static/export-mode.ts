import { locales } from "@/config/locales";

/**
 * Spike S1 — static export helpers.
 *
 * vinext 1.0.0-beta.8 resolves a page's static params from its OWN
 * `generateStaticParams` (plus ancestor DYNAMIC segments only); the
 * `[locale]` layout's function is not inherited by sibling pages such as
 * `/:locale/about`, so each locale page re-exports this one.
 */
export const isStaticExport = process.env.SPIKE_STATIC_EXPORT === "1";

export function localeStaticParams() {
  return locales.map((locale) => ({ locale }));
}
