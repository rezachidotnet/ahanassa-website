import { publicRfqCatalogPath, RFQ_CATALOG_ASSET_PATTERN, type PublicLocale } from "../contracts/public-paths.ts";

/** Set by scripts/static/build.ts for the static export: `{"fa": "/data/rfq-catalog.fa.<hash>.json", …}`. */
export const RFQ_CATALOG_ASSETS_ENV = "AHANASSA_RFQ_CATALOG_ASSETS";
/** Set by scripts/static/build.ts: the snapshot.v1 version the artifact is built from. */
export const SNAPSHOT_VERSION_ENV = "AHANASSA_SNAPSHOT_VERSION";

/**
 * W25 — which catalog file the /contact form loads, decided when the page is
 * rendered: on the static build, the locale's compact, content-hashed
 * rfq-catalog.v2 file and the build's snapshot version (sent with the RFQ;
 * docs/contracts/RFQ_SUBMIT_V1.md). Anywhere else (the legacy SSR runtime,
 * `vinext dev`) the v1 `/data/rfq-catalog.<locale>.json` and no version —
 * the form then takes the v1 file's own `snapshot_version`.
 */
export function rfqCatalogSource(locale: PublicLocale, env: Record<string, string | undefined> | undefined = globalThis.process?.env): { path: string; snapshotVersion: string | null } {
  let assets: Record<string, unknown> = {};
  try {
    assets = JSON.parse(env?.[RFQ_CATALOG_ASSETS_ENV] ?? "{}") as Record<string, unknown>;
  } catch {
    // Not the static build.
  }
  const asset = assets[locale];
  if (typeof asset === "string" && RFQ_CATALOG_ASSET_PATTERN.exec(asset)?.[1] === locale) return { path: asset, snapshotVersion: env?.[SNAPSHOT_VERSION_ENV] ?? null };
  return { path: publicRfqCatalogPath(locale), snapshotVersion: null };
}
