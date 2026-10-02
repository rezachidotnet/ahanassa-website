import { z } from "zod";
import { SNAPSHOT_VERSION_PATTERN } from "./snapshot-v1.ts";

/**
 * artifact.v1 — the immutable static-site build output
 * (docs/contracts/ARTIFACT_V1.md, architecture V1.1 §7.1 step 6):
 *
 *   <artifact>/
 *     manifest.json            PRIVATE: every file of both parts + code_sha, snapshot_version, counts
 *     public-assets/           the ONLY directory deployed to the assets-only Worker
 *       manifest.public.json   public: snapshot_version, generated_at, locales — no internals
 *       ...HTML, _next/, images, data/*.json, _headers, _redirects, .assetsignore, robots.txt, sitemap.xml
 *     private-snapshot/        CI only, never served
 *       snapshot.json          the snapshot.v1 file the build used
 *       rfq-variant-index.json rfq_variant_index rows (snapshot.v1 rfqVariantIndexRow)
 *       rfq-variant-index.sql  INSERTs for DB_PUBLIC
 */
export const ARTIFACT_SCHEMA_VERSION = "artifact.v1" as const;
export const PUBLIC_DIR = "public-assets" as const;
export const PRIVATE_DIR = "private-snapshot" as const;

const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/);
const relPath = z.string().regex(/^[^/].*/).refine((p) => !p.split("/").includes(".."), "no '..' segments");

export const artifactFileEntry = z.object({ path: relPath, bytes: z.number().int().nonnegative(), sha256: sha256Hex }).strict();
export type ArtifactFileEntry = z.infer<typeof artifactFileEntry>;

export const artifactManifest = z
  .object({
    schema_version: z.literal(ARTIFACT_SCHEMA_VERSION),
    code_sha: z.string().regex(/^[0-9a-f]{40}$/),
    snapshot_version: z.string().regex(SNAPSHOT_VERSION_PATTERN),
    environment: z.enum(["staging", "production"]),
    generated_at: z.string(),
    counts: z.record(z.string(), z.number().int().nonnegative()),
    public_assets: z.array(artifactFileEntry),
    private_snapshot: z.array(artifactFileEntry),
  })
  .strict();
export type ArtifactManifest = z.infer<typeof artifactManifest>;

/** Deliberately minimal: what a browser may learn about the deployed content version. */
export const publicManifest = z
  .object({
    schema_version: z.literal("artifact.public.v1"),
    snapshot_version: z.string().regex(SNAPSHOT_VERSION_PATTERN),
    generated_at: z.string(),
    locales: z.array(z.enum(["fa", "en", "ar"])),
  })
  .strict();
export type PublicManifest = z.infer<typeof publicManifest>;

/**
 * `/data/rfq-catalog.<locale>.json` — the static /contact page's Variant list
 * (architecture V1.1 §4.2/§6.1). STRICT: `categoryLabel` (Persian-only
 * Product Master family) is server-side data and must never appear (A6).
 * `snapshot_version` is null only when served by the legacy SSR runtime.
 */
export const publicRfqCatalogItem = z
  .object({
    variantXid: z.string().min(1),
    templateXid: z.string().min(1),
    sku: z.string().min(1),
    variantSpecLabel: z.string(),
    productLabel: z.string(),
    templateSlug: z.string(),
    categoryCode: z.string().nullable(),
    groupCode: z.string().nullable(),
    publicCategoryCode: z.string().nullable(),
    publicCategoryLabel: z.string().nullable(),
  })
  .strict();

export const publicRfqCatalog = z
  .object({
    schema_version: z.literal("rfq-catalog.v1"),
    snapshot_version: z.string().regex(SNAPSHOT_VERSION_PATTERN).nullable(),
    locale: z.enum(["fa", "en", "ar"]),
    items: z.array(publicRfqCatalogItem),
  })
  .strict();
export type PublicRfqCatalog = z.infer<typeof publicRfqCatalog>;

export { publicRfqCatalogPath, PUBLIC_MANIFEST_PATH } from "./public-paths.ts";
