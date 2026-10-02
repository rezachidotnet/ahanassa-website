import type { Locale } from "@/config/locales";
import { listRfqSelectableCatalogItems } from "@/lib/catalog/editorial-repository";
import { toPublicRfqCatalogItem } from "@/lib/rfq/catalog-selector";
import type { PublicRfqCatalog } from "@/lib/contracts/artifact-v1";

/**
 * The `/data/rfq-catalog.<locale>.json` document (artifact.v1
 * publicRfqCatalog): the same `listRfqSelectableCatalogItems` read the
 * /contact page used to embed, minus server-only fields
 * (`toPublicRfqCatalogItem` drops `categoryLabel`, architecture V1.1 A6).
 * Written to a static file by the static build; served by
 * app/data/[file]/route.ts on the legacy SSR runtime.
 */
export async function buildPublicRfqCatalog(locale: Locale, snapshotVersion: string | null): Promise<PublicRfqCatalog> {
  const items = await listRfqSelectableCatalogItems(locale);
  return { schema_version: "rfq-catalog.v1", snapshot_version: snapshotVersion, locale, items: items.map(toPublicRfqCatalogItem) };
}
