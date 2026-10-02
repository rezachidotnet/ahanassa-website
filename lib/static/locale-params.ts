import { locales, type Locale } from "@/config/locales";

/**
 * Shared `generateStaticParams` for every `app/[locale]/<page>` route
 * (architecture V1.1 appendix D, V2). vinext 1.0.0-beta.8 resolves a page's
 * params from the page's OWN `generateStaticParams` plus ancestor DYNAMIC
 * segments only — the `[locale]` layout's function is not inherited by
 * sibling pages — so each locale page re-exports this one:
 *
 *   export { generateLocaleStaticParams as generateStaticParams } from "@/lib/static/locale-params";
 */
export function generateLocaleStaticParams(): { locale: Locale }[] {
  return locales.map((locale) => ({ locale }));
}

/** True only inside the static export build (scripts/static/build.ts sets it). */
export function isStaticExportBuild(): boolean {
  return process.env.AHANASSA_STATIC_EXPORT === "1";
}
