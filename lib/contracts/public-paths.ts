/**
 * Public artifact paths shared by pages, the SSR route and the static
 * emitter. Dependency-free so client components can import it without
 * pulling zod into the browser bundle.
 */
export type PublicLocale = "fa" | "en" | "ar";

/** `/data/rfq-catalog.<locale>.json` — artifact.v1 publicRfqCatalog. */
export function publicRfqCatalogPath(locale: PublicLocale): string {
  return `/data/rfq-catalog.${locale}.json`;
}

/**
 * W25: `/data/rfq-catalog.<locale>.<hash>.json` — the compact rfq-catalog.v2
 * the static /contact form loads (lib/rfq/catalog-wire.ts). `hash` is the
 * first 16 hex digits of the file's SHA-256, so the URL changes exactly when
 * the content does and the file is cached as immutable.
 */
export function publicRfqCatalogAssetPath(locale: PublicLocale, hash: string): string {
  return `/data/rfq-catalog.${locale}.${hash}.json`;
}
export const RFQ_CATALOG_ASSET_PATTERN = /^\/data\/rfq-catalog\.(fa|en|ar)\.([0-9a-f]{16})\.json$/;

/** `/manifest.public.json` — artifact.v1 publicManifest. */
export const PUBLIC_MANIFEST_PATH = "/manifest.public.json";
