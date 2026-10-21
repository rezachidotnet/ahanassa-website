import type { PublicRfqCatalogItem } from "./catalog-selector.ts";

/**
 * W25 — `rfq-catalog.v2`, the compact form of the locale's RFQ catalog that
 * the static /contact page loads (`/data/rfq-catalog.<locale>.<hash>.json`,
 * docs/contracts/ARTIFACT_V1.md). Same items, same order, same values as
 * `rfq-catalog.v1` (`/data/rfq-catalog.<locale>.json`, which stays for the
 * pipeline and the legacy SSR route) — only the repetition is gone: every
 * Variant row of v1 repeated its product's label/slug/group and its category's
 * label, so each product and category is listed once and a Variant points at
 * them by index. Positional arrays, not objects: 256 Variants × 5 keys is most
 * of what the short form saves. The snapshot version is NOT in the file — the
 * page carries it (the URL is the content hash, so a price-only snapshot keeps
 * the same file and the visitor's cached copy).
 *
 *   categories: [publicCategoryCode, publicCategoryLabel][]
 *   templates:  [templateXid, productLabel, templateSlug, groupCode, categoryCode][]
 *   variants:   [variantXid, sku, variantSpecLabel, templateIndex, categoryIndex][]
 *
 * Dependency-free (type-only import), so the browser bundle pulls in nothing.
 */
export const RFQ_CATALOG_WIRE_SCHEMA = "rfq-catalog.v2" as const;

export type RfqCatalogWireCategory = [code: string | null, label: string | null];
export type RfqCatalogWireTemplate = [templateXid: string, productLabel: string, templateSlug: string, groupCode: string | null, categoryCode: string | null];
export type RfqCatalogWireVariant = [variantXid: string, sku: string, variantSpecLabel: string, templateIndex: number, categoryIndex: number];

export interface RfqCatalogWire {
  schema_version: typeof RFQ_CATALOG_WIRE_SCHEMA;
  locale: "fa" | "en" | "ar";
  categories: RfqCatalogWireCategory[];
  templates: RfqCatalogWireTemplate[];
  variants: RfqCatalogWireVariant[];
}

export function encodeRfqCatalog(locale: RfqCatalogWire["locale"], items: readonly PublicRfqCatalogItem[]): RfqCatalogWire {
  const categories: RfqCatalogWireCategory[] = [];
  const templates: RfqCatalogWireTemplate[] = [];
  const categoryIndex = new Map<string, number>();
  const templateIndex = new Map<string, number>();
  const indexOf = <T>(list: T[], index: Map<string, number>, entry: T) => {
    const key = JSON.stringify(entry);
    let i = index.get(key);
    if (i === undefined) {
      i = list.push(entry) - 1;
      index.set(key, i);
    }
    return i;
  };
  const variants = items.map((item): RfqCatalogWireVariant => [
    item.variantXid,
    item.sku,
    item.variantSpecLabel,
    indexOf(templates, templateIndex, [item.templateXid, item.productLabel, item.templateSlug, item.groupCode, item.categoryCode]),
    indexOf(categories, categoryIndex, [item.publicCategoryCode, item.publicCategoryLabel]),
  ]);
  return { schema_version: RFQ_CATALOG_WIRE_SCHEMA, locale, categories, templates, variants };
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

/**
 * The fetched catalog document as the flat Variant list the form uses, or
 * `null` when it is not a catalog. Reads v2 and — for the legacy SSR route —
 * v1, whose `snapshot_version` is passed through (v2 has none; see above).
 */
export function decodeRfqCatalog(doc: unknown): { items: PublicRfqCatalogItem[]; snapshotVersion: string | null } | null {
  if (!doc || typeof doc !== "object") return null;
  const d = doc as Record<string, unknown>;
  if (d.schema_version === "rfq-catalog.v1") {
    return Array.isArray(d.items) ? { items: d.items as PublicRfqCatalogItem[], snapshotVersion: isStr(d.snapshot_version) ? d.snapshot_version : null } : null;
  }
  if (d.schema_version !== RFQ_CATALOG_WIRE_SCHEMA || !Array.isArray(d.categories) || !Array.isArray(d.templates) || !Array.isArray(d.variants)) return null;
  const categories = d.categories as unknown[];
  const templates = d.templates as unknown[];
  const items: PublicRfqCatalogItem[] = [];
  for (const v of d.variants as unknown[]) {
    if (!Array.isArray(v) || !isStr(v[0]) || !isStr(v[1]) || !isStr(v[2])) return null;
    const t = templates[v[3] as number];
    const c = categories[v[4] as number];
    if (!Array.isArray(t) || !isStr(t[0]) || !isStr(t[1]) || !isStr(t[2]) || !isStrOrNull(t[3]) || !isStrOrNull(t[4])) return null;
    if (!Array.isArray(c) || !isStrOrNull(c[0]) || !isStrOrNull(c[1])) return null;
    items.push({
      variantXid: v[0],
      templateXid: t[0],
      sku: v[1],
      variantSpecLabel: v[2],
      productLabel: t[1],
      templateSlug: t[2],
      categoryCode: t[4],
      groupCode: t[3],
      publicCategoryCode: c[0],
      publicCategoryLabel: c[1],
    });
  }
  return { items, snapshotVersion: null };
}
