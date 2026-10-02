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

/** `/manifest.public.json` — artifact.v1 publicManifest. */
export const PUBLIC_MANIFEST_PATH = "/manifest.public.json";
