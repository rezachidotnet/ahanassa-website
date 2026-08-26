import type { Metadata } from "next";
import { locales, defaultLocale, localeConfig, localizedPath, type Locale } from "@/config/locales";
import { siteConfig } from "./site";

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
}

/** Reciprocal hreflang map, including x-default pointing at the default locale. */
export function buildLanguageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${siteConfig.baseUrl}${localizedPath(locale, path)}`;
  }
  languages["x-default"] = `${siteConfig.baseUrl}${localizedPath(defaultLocale, path)}`;
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
      languages: buildLanguageAlternates(input.path),
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
