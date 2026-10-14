import type { Locale } from "../../config/locales.ts";

/**
 * W17.2 — Download Center URLs. Files are locale-agnostic paths (the language is in the file name), so
 * /downloads/... is the same URL from /, /en and /ar. Every catalog link on the site (footer "Full catalog",
 * the /downloads cards) uses the PDF of the page's own locale.
 */
export const DOWNLOADS_ROUTE = "/downloads";
export const DOWNLOADS_DIR = "downloads";

export const sectionsCatalogPath = (locale: Locale) => `/${DOWNLOADS_DIR}/catalogs/ahanassa-catalog-steel-products-${locale}.pdf`;
export const rawMaterialsCatalogPath = (locale: Locale) => `/${DOWNLOADS_DIR}/catalogs/ahanassa-catalog-raw-materials-${locale}.pdf`;
/** `segment`: the category's listing segment (lib/catalog/public-categories.ts#categoryPathSegment), e.g. "box-section". */
export const specSheetPath = (segment: string, locale: Locale) => `/${DOWNLOADS_DIR}/spec-sheets/ahanassa-spec-${segment}-${locale}.pdf`;
export const drawingPath = (slug: string, ext: "dxf" | "svg") => `/${DOWNLOADS_DIR}/drawings/${slug}.${ext}`;

/** The catalog PDF the footer's "Full catalog" link opens: the sections & steel products catalog of that locale. */
export const fullCatalogPath = sectionsCatalogPath;

/** Every PDF must stay under this size (subset fonts, vector art). */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
