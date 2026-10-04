/**
 * Static site build (architecture V1.1 §7.1 steps 4–6; contracts
 * docs/contracts/SNAPSHOT_V1.md and ARTIFACT_V1.md).
 *
 *   npm run build:static -- --snapshot <snapshot.v1.json> --target staging|production [--out .artifact] [--pipeline <info.json>]
 *
 * 1. Validates the snapshot (zod + content-derived version).
 * 2. Generates .static-build/ — a copy of the app WITHOUT wrangler.jsonc,
 *    proxy.ts, workers/, app/api and app/data, with the static Vite/Next
 *    configs (appendix D V1, V3). vinext builds it with `output: 'export'`;
 *    `cloudflare:workers` resolves to the snapshot-backed build runtime.
 * 3. Post-processes into <out>/public-assets (HTML, assets, public JSON,
 *    robots/sitemap from the app's own functions, _headers/_redirects/
 *    .assetsignore, manifest.public.json) and <out>/private-snapshot
 *    (snapshot.json, rfq_variant_index), plus <out>/manifest.json.
 * 4. Runs the artifact gate; any failure exits non-zero.
 */
import { spawnSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { snapshotCounts, rfqVariantIndexRow, type RfqVariantIndexRow } from "../../lib/contracts/snapshot-v1.ts";
import { artifactManifest, artifactPipelineInfo, publicManifest, publicRfqCatalog, PUBLIC_DIR, PRIVATE_DIR, ARTIFACT_SCHEMA_VERSION } from "../../lib/contracts/artifact-v1.ts";
import { buildAssetsIgnoreFile, buildHeadersFile, buildRedirectsFile, renderRobotsTxt, renderSitemapXml, type StaticEnvironment } from "../../lib/static/static-rules.ts";
import { moveDefaultLocaleToRoot, placeLocale404s, removeUnpublishedOutputs } from "../../lib/static/postprocess.ts";
import { describeFiles, runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { getAllowedUomsForCatalogGroup } from "../../lib/rfq/uom-policy.ts";
import { STATIC_TARGETS } from "../../lib/static/targets.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const snapshotArg = args.get("snapshot");
// `--target`, not `--env`: this is a build flag (robots/noindex/Turnstile key), never a deploy target.
const environment = args.get("target") as StaticEnvironment | undefined;
const outDir = path.resolve(repo, args.get("out") ?? ".artifact");
if (!snapshotArg || (environment !== "staging" && environment !== "production")) {
  console.error("usage: build.ts --snapshot <snapshot.v1.json> --target staging|production [--out <dir>]");
  process.exit(2);
}
const snapshotFile = path.resolve(repo, snapshotArg);
const snapshot = readSnapshotFile(snapshotFile);
const codeSha = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
const generatedAt = new Date().toISOString();
// Content pipeline (W4, scripts/content/export.ts): provenance + source counts recorded in the PRIVATE manifest.
const pipelineArg = args.get("pipeline");
const pipeline = pipelineArg ? (JSON.parse(fs.readFileSync(path.resolve(repo, pipelineArg), "utf8")) as { info: unknown; counts: Record<string, number> }) : null;
const pipelineInfo = pipeline ? artifactPipelineInfo.parse(pipeline.info) : undefined;
const log = (msg: string) => console.log(`[static] ${msg}`);
log(`snapshot ${snapshot.snapshot_version} (${snapshot.source.kind}); target ${environment}; code ${codeSha}`);

// --- 2. generated build root -------------------------------------------------
const buildRoot = path.join(repo, ".static-build");
fs.rmSync(buildRoot, { recursive: true, force: true });
fs.mkdirSync(buildRoot);
const EXCLUDED = new Set(["app/api", "app/data"]);
for (const entry of ["app", "components", "config", "lib", "public", "styles", "migrations_public", "package.json", "tsconfig.json", "postcss.config.mjs"]) {
  if (!fs.existsSync(path.join(repo, entry))) continue;
  fs.cpSync(path.join(repo, entry), path.join(buildRoot, entry), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(repo, src).split(path.sep).join("/");
      return !EXCLUDED.has(rel) && !/\.test\.tsx?$/.test(rel);
    },
  });
}
fs.copyFileSync(path.join(repo, "scripts/static/vite.config.static.ts"), path.join(buildRoot, "vite.config.ts"));
fs.copyFileSync(path.join(repo, "scripts/static/next.config.static.ts"), path.join(buildRoot, "next.config.ts"));
fs.symlinkSync(path.join(repo, "node_modules"), path.join(buildRoot, "node_modules"), "dir");

// Per-target public values (lib/static/targets.ts): RFQ Worker origin and Turnstile site key.
const target = STATIC_TARGETS[environment];
const turnstileSiteKey = target.turnstileSiteKey;

const buildEnv: NodeJS.ProcessEnv = {
  ...process.env,
  AHANASSA_STATIC_EXPORT: "1",
  AHANASSA_SNAPSHOT_FILE: snapshotFile,
  AHANASSA_MIGRATIONS_DIR: path.join(buildRoot, "migrations_public"),
  APP_ENV: environment,
  AHANASSA_RFQ_API_ORIGIN: target.rfqApiOrigin,
  // Deterministic vinext build id (next.config.static.ts#generateBuildId): same code -> same chunk names.
  AHANASSA_STATIC_BUILD_ID: `static-${codeSha.slice(0, 12)}`,
  __VINEXT_IMAGE_UNOPTIMIZED: "true",
};
delete buildEnv.APP_BASE_URL; // canonical URLs always use the production origin (§4.2, R2-4)
if (turnstileSiteKey) buildEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = turnstileSiteKey;
else delete buildEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
Object.assign(process.env, buildEnv);

log("vinext build (output: export) in .static-build/");
const build = spawnSync("npx", ["vinext", "build"], { cwd: buildRoot, env: buildEnv, stdio: "inherit" });
if (build.status !== 0) throw new Error(`vinext build failed (exit ${build.status})`);

// --- 3. post-process ---------------------------------------------------------
fs.rmSync(outDir, { recursive: true, force: true });
const publicDir = path.join(outDir, PUBLIC_DIR);
const privateDir = path.join(outDir, PRIVATE_DIR);
fs.mkdirSync(privateDir, { recursive: true });
fs.cpSync(path.join(buildRoot, "dist/client"), publicDir, { recursive: true });

const { locales, defaultLocale } = await import("../../config/locales.ts");
const removed = removeUnpublishedOutputs(publicDir);
log(`removed ${removed.length} unpublished outputs (.rsc/.vite)`);
placeLocale404s(publicDir, locales, defaultLocale);
moveDefaultLocaleToRoot(publicDir, defaultLocale);

// The app's own modules, loaded through Vite SSR with the same aliases the build used.
const vite = await createServer({
  root: buildRoot,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  resolve: { alias: { "@": buildRoot, "cloudflare:workers": path.join(buildRoot, "lib/static/build-runtime/cloudflare-workers.ts") } },
});
const load = (p: string) => vite.ssrLoadModule(path.join(buildRoot, p));
const { buildPublicRfqCatalog } = await load("lib/catalog/public-rfq-catalog.ts");
const { listRfqSelectableCatalogItems } = await load("lib/catalog/editorial-repository.ts");
const robots = (await load("app/robots.ts")).default;
const sitemap = (await load("app/sitemap.ts")).default;
const { COMPANY_PUBLIC_NUMBERS } = await load("lib/content/contact-channels.ts");

fs.mkdirSync(path.join(publicDir, "data"), { recursive: true });
const indexRows: RfqVariantIndexRow[] = [];
const counts: Record<string, number> = { ...snapshotCounts(snapshot), ...(pipeline?.counts ?? {}) };
for (const locale of locales) {
  const catalog = publicRfqCatalog.parse(await buildPublicRfqCatalog(locale, snapshot.snapshot_version));
  fs.writeFileSync(path.join(publicDir, `data/rfq-catalog.${locale}.json`), JSON.stringify(catalog));
  counts[`rfq_catalog_${locale}`] = catalog.items.length;
  for (const item of await listRfqSelectableCatalogItems(locale)) {
    const { publicCategoryCode: _a, publicCategoryLabel: _b, ...selection } = item;
    indexRows.push(
      rfqVariantIndexRow.parse({
        snapshot_version: snapshot.snapshot_version,
        locale,
        canonical_variant_id: item.variantXid,
        template_id: item.templateXid,
        group_code: item.groupCode,
        allowed_units: [...getAllowedUomsForCatalogGroup(item.groupCode)],
        selection_json: JSON.stringify(selection),
      }),
    );
  }
}
fs.writeFileSync(path.join(publicDir, "robots.txt"), renderRobotsTxt(robots()));
const sitemapEntries = await sitemap();
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), renderSitemapXml(sitemapEntries));
counts.sitemap_urls = sitemapEntries.length;
await vite.close();

fs.writeFileSync(path.join(publicDir, "_headers"), buildHeadersFile(environment, target.rfqApiOrigin));
fs.writeFileSync(path.join(publicDir, "_redirects"), buildRedirectsFile());
fs.writeFileSync(path.join(publicDir, ".assetsignore"), buildAssetsIgnoreFile());
// generated_at = the snapshot's own time, so the same snapshot always gives byte-identical public files (W4 determinism).
fs.writeFileSync(
  path.join(publicDir, "manifest.public.json"),
  JSON.stringify(publicManifest.parse({ schema_version: "artifact.public.v1", snapshot_version: snapshot.snapshot_version, generated_at: snapshot.created_at, locales: [...locales] })),
);

// private-snapshot/
fs.copyFileSync(snapshotFile, path.join(privateDir, "snapshot.json"));
fs.writeFileSync(path.join(privateDir, "rfq-variant-index.json"), JSON.stringify({ snapshot_version: snapshot.snapshot_version, rows: indexRows }));
const sqlText = (v: unknown) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
fs.writeFileSync(
  path.join(privateDir, "rfq-variant-index.sql"),
  indexRows
    .map((r) => `INSERT INTO rfq_variant_index (snapshot_version, locale, canonical_variant_id, template_id, group_code, allowed_units, selection_json) VALUES (${[r.snapshot_version, r.locale, r.canonical_variant_id, r.template_id, r.group_code, JSON.stringify(r.allowed_units), r.selection_json].map(sqlText).join(", ")});`)
    .join("\n") + "\n",
);
counts.rfq_variant_index_rows = indexRows.length;

const manifest = artifactManifest.parse({
  schema_version: ARTIFACT_SCHEMA_VERSION,
  code_sha: codeSha,
  snapshot_version: snapshot.snapshot_version,
  environment,
  generated_at: generatedAt,
  counts,
  ...(pipelineInfo ? { pipeline: pipelineInfo } : {}),
  public_assets: describeFiles(publicDir),
  private_snapshot: describeFiles(privateDir),
});
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");

// --- 4. gate -----------------------------------------------------------------
const gate = runArtifactGate(outDir, { companyPhones: COMPANY_PUBLIC_NUMBERS });
log(`artifact: ${gate.stats.publicFiles} public files (${gate.stats.htmlPages} HTML), ${gate.stats.privateFiles} private files; largest ${gate.stats.largestPublicFile?.path} (${gate.stats.largestPublicFile?.bytes} B)`);
if (gate.failures.length) {
  for (const f of gate.failures) console.error(`[static] GATE FAIL: ${f}`);
  process.exit(1);
}
log(`gate passed -> ${path.relative(repo, outDir)}`);
