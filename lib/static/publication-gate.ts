import { publicManifest, publicRfqCatalog, publicRfqCatalogItem } from "../contracts/artifact-v1.ts";

/**
 * Publication gate (architecture V1.1 §7.1 step 3, §8.2, §12; W4) — the
 * field-level half of the leak scan, run by the artifact gate on every
 * artifact. Pure: the caller passes public file contents and the private
 * snapshot. Persian-text and forbidden-key/contact scanning live in
 * leak-scan.ts; this module adds:
 *
 * 1. Public JSON: only the known public JSON files exist, and every object
 *    key in them is on that file's allowlist (derived from the strict
 *    public contracts). Any other field — cost, supplier, margin, stock,
 *    purchase price, partner data, internal ids — blocks.
 * 2. JSON-LD in HTML: only the allowed schema.org types and properties
 *    (Organization, WebSite, BreadcrumbList, Product WITHOUT offers/price).
 * 3. Internal ids: no DB_PUBLIC row id and no legacy Odoo XID
 *    (`ahanassa_marketplace.…`) anywhere in public text. The only public
 *    identities are canonical_id (CVAR) and canonical_template_id (CTMPL).
 * 4. Empty Odoo fields are not rendered (§8.2): no "null", "undefined",
 *    "NaN" or "[object Object]" in visible HTML text or public JSON values.
 */
export interface PublicationFinding {
  file: string;
  kind: "json_file_not_allowed" | "json_field_not_allowed" | "jsonld_type_not_allowed" | "jsonld_field_not_allowed" | "internal_id" | "empty_value_rendered";
  match: string;
}

const keysOf = (schema: { shape: Record<string, unknown> }) => new Set(Object.keys(schema.shape));

/** Public JSON files and the object keys allowed in each (from the strict contracts in lib/contracts/artifact-v1.ts). */
export const PUBLIC_JSON_ALLOWLIST: ReadonlyArray<{ pattern: RegExp; keys: ReadonlySet<string> }> = [
  { pattern: /^data\/rfq-catalog\.(fa|en|ar)\.json$/, keys: new Set([...keysOf(publicRfqCatalog), ...keysOf(publicRfqCatalogItem)]) },
  { pattern: /^manifest\.public\.json$/, keys: keysOf(publicManifest) },
];

export const JSONLD_ALLOWED_TYPES: ReadonlySet<string> = new Set(["Organization", "WebSite", "BreadcrumbList", "ListItem", "PostalAddress", "ContactPoint", "Product"]);
export const JSONLD_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "@context", "@graph", "@id", "@type",
  "name", "alternateName", "url", "logo", "description", "publisher",
  "address", "streetAddress", "addressLocality", "addressCountry",
  "contactPoint", "telephone", "contactType", "areaServed",
  "itemListElement", "position", "item",
]);

const LEGACY_XID = /ahanassa_marketplace\.[a-z0-9_]+/g;
const EMPTY_TOKENS = /\b(null|undefined|NaN)\b|\[object Object\]/g;

function walkJson(value: unknown, visit: (key: string, child: unknown) => void): void {
  if (Array.isArray(value)) value.forEach((v) => walkJson(v, visit));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      visit(k, v);
      walkJson(v, visit);
    }
  }
}

/** Visible text of an HTML document: scripts, styles and tags removed. */
export function visibleHtmlText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

export function jsonLdBlocks(html: string): string[] {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

/** DB_PUBLIC row ids from a snapshot.v1 document (tolerates partial/empty documents). */
export function internalIdsFromSnapshot(snapshot: unknown): Set<string> {
  const ids = new Set<string>();
  const tables = (snapshot as { tables?: Record<string, { id?: unknown }[]> } | null)?.tables ?? {};
  for (const rows of Object.values(tables)) for (const r of rows ?? []) if (typeof r?.id === "string" && r.id.length >= 8) ids.add(r.id);
  return ids;
}

export function scanPublication(files: ReadonlyArray<{ path: string; content: string }>, internalIds: ReadonlySet<string>): PublicationFinding[] {
  const findings: PublicationFinding[] = [];
  for (const { path, content } of files) {
    // 1. Public JSON allowlist (files and keys) + no empty-value tokens in JSON values.
    if (path.endsWith(".json")) {
      const rule = PUBLIC_JSON_ALLOWLIST.find((r) => r.pattern.test(path));
      if (!rule) findings.push({ file: path, kind: "json_file_not_allowed", match: path });
      else {
        try {
          walkJson(JSON.parse(content), (key, child) => {
            if (!rule.keys.has(key)) findings.push({ file: path, kind: "json_field_not_allowed", match: key });
            if (typeof child === "string" && /^(null|undefined|NaN|\[object Object\])$/.test(child.trim())) findings.push({ file: path, kind: "empty_value_rendered", match: `${key}=${child}` });
          });
        } catch {
          findings.push({ file: path, kind: "json_file_not_allowed", match: "unparseable JSON" });
        }
      }
    }
    // 2. JSON-LD types and properties.
    if (path.endsWith(".html")) {
      for (const block of jsonLdBlocks(content)) {
        let data: unknown;
        try {
          data = JSON.parse(block);
        } catch {
          findings.push({ file: path, kind: "jsonld_field_not_allowed", match: "unparseable JSON-LD" });
          continue;
        }
        walkJson(data, (key, child) => {
          if (!JSONLD_ALLOWED_KEYS.has(key)) findings.push({ file: path, kind: "jsonld_field_not_allowed", match: key });
          if (key === "@type" && (typeof child !== "string" || !JSONLD_ALLOWED_TYPES.has(child))) findings.push({ file: path, kind: "jsonld_type_not_allowed", match: String(child) });
          if (key === "@context" && child !== "https://schema.org") findings.push({ file: path, kind: "jsonld_field_not_allowed", match: `@context=${String(child)}` });
        });
      }
      // 4. Empty fields rendered as text.
      for (const m of visibleHtmlText(content).matchAll(EMPTY_TOKENS)) findings.push({ file: path, kind: "empty_value_rendered", match: m[0] });
    }
    // 3. Internal ids, in every public text file (JS/CSS included).
    for (const m of content.matchAll(LEGACY_XID)) findings.push({ file: path, kind: "internal_id", match: m[0] });
    for (const id of internalIds) if (content.includes(id)) findings.push({ file: path, kind: "internal_id", match: id });
  }
  return findings;
}
