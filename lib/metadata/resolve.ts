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
  /** W11.1: an absolute og:image/twitter:image (an article cover PNG on the production origin). */
  image?: { url: string; width: number; height: number; alt: string };
  /** W11.1: an article's dates (og:type article). */
  article?: { publishedTime: string; modifiedTime: string };
  /**
   * W11.1: the page renders its own robots <meta> (`robotsMetaContent`) as the LAST element of an isolated
   * async boundary instead of in the metadata. Needed where the metadata is long (articles: og image,
   * dates, hreflang): React Flight outlines an element once its row passes 3200 serialized bytes, and the
   * robots value is the one byte-length difference between the staging and production builds — placed
   * before the page slot it can tip that decision and break the r4 allowlisted-diff gate.
   */
  robotsInPage?: boolean;
}

/** The robots <meta> content of a page: the same value the metadata would carry. */
export function robotsMetaContent(indexable: boolean | undefined): string {
  return indexable === false ? "noindex, follow" : "index, follow";
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
    ...(input.robotsInPage
      ? {}
      : {
          robots:
            input.indexable === false
              ? { index: false, follow: true }
              : { index: true, follow: true },
        }),
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: localeConfig[input.locale].languageTag,
      ...(input.article ? { type: "article" as const, publishedTime: input.article.publishedTime, modifiedTime: input.article.modifiedTime } : { type: "website" as const }),
      ...(input.image ? { images: [input.image] } : {}),
    },
    ...(input.image ? { twitter: { card: "summary_large_image" as const, title: input.title, description: input.description, images: [input.image.url] } } : {}),
  };
}
