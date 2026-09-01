import type { Metadata } from "next";
import { locales, defaultLocale, localeConfig, localizedPath, type Locale } from "../../config/locales.ts";
import { siteConfig } from "./site.ts";

/**
 * Foundation metadata resolver.
 *
 * Phase 1 has no CMS/translation-status data source yet, so this operates on
 * caller-supplied fields rather than a content record. A later phase should
 * route real pages through a resolver that reads translation/publication
 * state (CMS_ARCHITECTURE.md) before deciding whether to emit alternates for
 * a given locale — see DOCS_INDEX.md §3a / METADATA_SPEC.md.
 */
export interface PageMetadataInput {
  locale: Locale;
  /** Locale-neutral path, e.g. "/" or "/about". */
  path: string;
  title: string;
  description: string;
  /** false for pages that must not be indexed yet (e.g. structural placeholders). */
  indexable?: boolean;
  /**
   * Override the default "same path in every locale" hreflang map — required
   * for any entity whose route/slug is independent per locale (e.g. a
   * Catalog Product page, where `product_seo_contents.slug` is a distinct
   * value per `(entity, locale)` row and a locale may not be published at
   * all yet). Build with `buildLanguageAlternatesFromEntries`. When omitted,
   * falls back to the uniform-path behavior of `buildLanguageAlternates`.
   */
  languageAlternates?: Record<string, string>;
}

/** Reciprocal hreflang map, including x-default pointing at the default locale. Only valid when the same path exists in every locale. */
export function buildLanguageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${siteConfig.baseUrl}${localizedPath(locale, path)}`;
  }
  languages["x-default"] = `${siteConfig.baseUrl}${localizedPath(defaultLocale, path)}`;
  return languages;
}

/**
 * Reciprocal hreflang map built from an explicit, per-locale-verified list of
 * (locale, path) entries — never assumes a locale is available just because
 * it's a supported locale. x-default points at the default locale's entry
 * when present, otherwise the first supplied entry (never a fabricated URL
 * for a locale that has no real published page).
 */
export function buildLanguageAlternatesFromEntries(entries: { locale: Locale; path: string }[]): Record<string, string> | undefined {
  if (entries.length === 0) return undefined;
  const languages: Record<string, string> = {};
  for (const { locale, path } of entries) {
    languages[locale] = `${siteConfig.baseUrl}${localizedPath(locale, path)}`;
  }
  const defaultEntry = entries.find((entry) => entry.locale === defaultLocale) ?? entries[0];
  languages["x-default"] = `${siteConfig.baseUrl}${localizedPath(defaultEntry.locale, defaultEntry.path)}`;
  return languages;
}

export function buildCanonicalUrl(locale: Locale, path: string): string {
  return `${siteConfig.baseUrl}${localizedPath(locale, path)}`;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = buildCanonicalUrl(input.locale, input.path);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: input.languageAlternates ?? buildLanguageAlternates(input.path),
    },
    robots:
      input.indexable === false
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: localeConfig[input.locale].languageTag,
      type: "website",
    },
  };
}
