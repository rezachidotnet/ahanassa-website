/**
 * Locale registry — single source of truth for supported locales.
 *
 * fa is the primary/default language and is unprefixed (`/`).
 * en and ar are explicitly prefixed (`/en`, `/ar`).
 *
 * Binding: PROJECT_OVERRIDES.md §1 (owner-confirmed 2026-08-26).
 */

export const locales = ["fa", "en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

export type Direction = "ltr" | "rtl";

interface LocaleConfig {
  /** BCP 47 language tag used in <html lang> and hreflang. */
  languageTag: string;
  direction: Direction;
  /** Native label for locale switchers. */
  label: string;
  /** Path prefix; empty string for the unprefixed default locale. */
  urlPrefix: string;
}

export const localeConfig: Record<Locale, LocaleConfig> = {
  fa: { languageTag: "fa-IR", direction: "rtl", label: "فارسی", urlPrefix: "" },
  en: { languageTag: "en", direction: "ltr", label: "English", urlPrefix: "/en" },
  ar: { languageTag: "ar", direction: "rtl", label: "العربية", urlPrefix: "/ar" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): Direction {
  return localeConfig[locale].direction;
}

/** Builds a locale-prefixed path (empty prefix for the default locale). */
export function localizedPath(locale: Locale, path: string = "/"): string {
  const prefix = localeConfig[locale].urlPrefix;
  if (path === "/") return prefix || "/";
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}
