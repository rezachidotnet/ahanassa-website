/**
 * W30 (W29 P1 §1.2) — the domestic-copy bundle of ONE built artifact (staging or production twin):
 *
 *   node scripts/iran/bundle.ts --artifact <dir with manifest.json, public-assets/, private-snapshot/> --out <dir>
 *
 * Writes <out>/iran-bundle.zip and <out>/iran-bundle.json (a summary for the CI log). The zip holds:
 *   bundle.json                       schema, environment, code_sha, snapshot_version, manifest_sha256, the nginx
 *                                     files' sha256 list and the critical-path report (below)
 *   manifest.json                     the artifact's manifest, UNCHANGED (its sha256 is the one the build prints as
 *                                     "production twin manifest.json sha256" — the identity with www.ahanassa.com)
 *   public/**                         public-assets/ unchanged, byte for byte
 *   private/rfq-variant-index.json    the only private file (W29 P2 reads it; never snapshot.json, never under public/)
 *   nginx/*                           scripts/iran/render-nginx.ts output (maps + headers.conf, strict grammar)
 *
 * The zip is deterministic (scripts/iran/zip.ts): the same artifact gives the same bytes, so the sha256 CI signs is
 * the same whether the server fetches the zip from the GitHub artifact or from the R2/Arvan mirror. The bundle is
 * built from the artifact, never the other way round: nothing here changes what www.ahanassa.com serves.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest, PRIVATE_DIR, PUBLIC_DIR } from "../../lib/contracts/artifact-v1.ts";
import { listFiles } from "../../lib/static/artifact-gate.ts";
import { renderNginxIncludes, NGINX_INCLUDE_FILES } from "./render-nginx.ts";
import { writeZip, type ZipEntry } from "./zip.ts";

export const BUNDLE_SCHEMA = "iran-bundle.v1";
/** The one private file the domestic copy carries. */
export const BUNDLE_PRIVATE_FILES = ["rfq-variant-index.json"] as const;
/** Files the activator derives next to text assets on the server; an artifact file with these extensions would collide. */
export const DERIVED_EXTENSIONS = [".gz", ".br"] as const;

const sha256 = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");

export interface CriticalPathFinding {
  file: string;
  kind: string;
  url: string;
  /** Set when the load is a known, accepted one (ACCEPTED_EXTERNAL_LOADS); null = unexplained, reported as a warning. */
  accepted?: string | null;
}

/**
 * Loads from a foreign host that are known and accepted on the domestic copy. During a cutoff they fail without
 * blocking the page: a `preload` never blocks rendering, and the form's own fallback answers (W27).
 */
export const ACCEPTED_EXTERNAL_LOADS: ReadonlyArray<{ origin: string; files: RegExp; kinds: RegExp; reason: string }> = [
  {
    origin: "https://challenges.cloudflare.com",
    files: /^(?:(?:en|ar)\/)?contact\.html$/,
    kinds: /^link rel=preload$/,
    reason: "Turnstile preload on /contact (P1 still submits through the RFQ Worker); non-blocking, and on a mirror host the form offers phone / e-mail / WhatsApp when Turnstile has not loaded after 8 s (lib/mirror/iran-mirror.ts)",
  },
];

export function acceptedReason(f: CriticalPathFinding): string | null {
  let origin: string;
  try {
    origin = new URL(f.url.startsWith("//") ? `https:${f.url}` : f.url).origin;
  } catch {
    return null;
  }
  return ACCEPTED_EXTERNAL_LOADS.find((a) => a.origin === origin && a.files.test(f.file) && a.kinds.test(f.kind))?.reason ?? null;
}

/**
 * Absolute http(s) URLs a page or stylesheet loads BEFORE it can render or work: scripts, stylesheets, preloads,
 * icons/manifest, images/media, iframes present in the HTML, CSS url()/@import. On the domestic copy during an
 * international cutoff each of these would be a request to a foreign (or Cloudflare-only) host on the critical path.
 * The site is self-hosted (fonts, images, scripts), so the expected result is empty. Links (<a href>), canonical /
 * hreflang / og: metadata and JSON-LD are not loads and are not reported. Runtime-only origins (GTM/GA4, Turnstile,
 * the RFQ API, live chat) are started by the page's own scripts, never by the HTML, and fail silently.
 */
export function criticalPathExternals(file: string, text: string): CriticalPathFinding[] {
  const out: CriticalPathFinding[] = [];
  const absolute = (u: string) => /^(?:https?:)?\/\//i.test(u.trim());
  const add = (kind: string, url: string) => {
    if (absolute(url)) out.push({ file, kind, url: url.trim() });
  };
  const css = (body: string, where: string) => {
    for (const m of body.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) add(`${where} url()`, m[1].replace(/&quot;/g, ""));
    for (const m of body.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) add(`${where} @import`, m[1]);
  };
  if (file.endsWith(".css")) {
    css(text, "css");
    return out;
  }
  const attr = (tag: string, name: string) => new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find((v) => v !== undefined);
  for (const m of text.matchAll(/<(script|link|img|source|video|audio|iframe|embed|object|track|image|use)\b[^>]*>/gi)) {
    const tag = m[0];
    const name = m[1].toLowerCase();
    if (name === "link") {
      const rel = (attr(tag, "rel") ?? "").toLowerCase().split(/\s+/);
      if (!rel.some((r) => ["stylesheet", "preload", "modulepreload", "icon", "apple-touch-icon", "manifest", "prefetch", "preconnect", "dns-prefetch"].includes(r))) continue;
      add(`link rel=${rel.join(" ")}`, attr(tag, "href") ?? "");
      continue;
    }
    for (const a of ["src", "poster", "data", "href", "xlink:href"]) {
      const v = attr(tag, a);
      if (v !== undefined && (a !== "href" || name === "use" || name === "image")) add(`${name} ${a}`, v);
    }
    for (const a of ["srcset", "imagesrcset"]) {
      const v = attr(tag, a);
      if (v) for (const part of v.split(",")) add(`${name} ${a}`, part.trim().split(/\s+/)[0] ?? "");
    }
  }
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) css(m[1], "<style>");
  for (const m of text.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) css(m[1], "style attribute");
  return out;
}

export interface BundleSummary {
  schema: typeof BUNDLE_SCHEMA;
  environment: "staging" | "production";
  code_sha: string;
  snapshot_version: string;
  manifest_sha256: string;
  bundle_sha256: string;
  bundle_bytes: number;
  files: number;
  critical_path_externals: CriticalPathFinding[];
}

export function buildBundle(artifactDir: string, outDir: string): BundleSummary {
  const manifestBytes = fs.readFileSync(path.join(artifactDir, "manifest.json"));
  const manifest = artifactManifest.parse(JSON.parse(manifestBytes.toString("utf8")));
  const read = (dir: string, p: string) => fs.readFileSync(path.join(artifactDir, dir, p));
  // The artifact as the manifest describes it — and nothing else (a stray file would be refused on the server anyway).
  const entries: ZipEntry[] = [];
  const publicFiles = new Map<string, Buffer>();
  for (const f of manifest.public_assets) {
    const data = read(PUBLIC_DIR, f.path);
    if (data.length !== f.bytes || sha256(data) !== f.sha256) throw new Error(`bundle: ${PUBLIC_DIR}/${f.path} does not match manifest.json`);
    if (DERIVED_EXTENSIONS.some((x) => f.path.endsWith(x))) throw new Error(`bundle: ${f.path} collides with the server's precompressed files (${DERIVED_EXTENSIONS.join(", ")})`);
    publicFiles.set(f.path, data);
  }
  const extra = listFiles(path.join(artifactDir, PUBLIC_DIR)).filter((p) => !publicFiles.has(p));
  if (extra.length) throw new Error(`bundle: ${PUBLIC_DIR} holds files manifest.json does not list: ${extra.slice(0, 5).join(", ")}`);
  const privateEntries = manifest.private_snapshot.filter((f) => (BUNDLE_PRIVATE_FILES as readonly string[]).includes(f.path));
  if (privateEntries.length !== BUNDLE_PRIVATE_FILES.length) throw new Error(`bundle: ${PRIVATE_DIR} lacks ${BUNDLE_PRIVATE_FILES.join(", ")}`);

  const nginx = renderNginxIncludes({ redirects: publicFiles.get("_redirects")?.toString("utf8") ?? "", headers: publicFiles.get("_headers")?.toString("utf8") ?? "", publicPaths: [...publicFiles.keys()] });
  const critical = [...publicFiles]
    .filter(([p]) => p.endsWith(".html") || p.endsWith(".css"))
    .flatMap(([p, b]) => criticalPathExternals(p, b.toString("utf8")))
    .map((f) => ({ ...f, accepted: acceptedReason(f) }));
  const manifestSha = sha256(manifestBytes);
  const bundleJson = {
    schema: BUNDLE_SCHEMA,
    environment: manifest.environment,
    code_sha: manifest.code_sha,
    snapshot_version: manifest.snapshot_version,
    manifest_sha256: manifestSha,
    nginx: NGINX_INCLUDE_FILES.map((name) => ({ path: name, bytes: Buffer.byteLength(nginx[name]), sha256: sha256(nginx[name]) })),
    private: privateEntries,
    critical_path_externals: critical,
  };
  entries.push({ name: "bundle.json", data: Buffer.from(`${JSON.stringify(bundleJson, null, 1)}\n`) });
  entries.push({ name: "manifest.json", data: manifestBytes });
  for (const name of NGINX_INCLUDE_FILES) entries.push({ name: `nginx/${name}`, data: Buffer.from(nginx[name]) });
  for (const f of privateEntries) {
    const data = read(PRIVATE_DIR, f.path);
    if (data.length !== f.bytes || sha256(data) !== f.sha256) throw new Error(`bundle: ${PRIVATE_DIR}/${f.path} does not match manifest.json`);
    entries.push({ name: `private/${f.path}`, data });
  }
  for (const p of [...publicFiles.keys()].sort()) entries.push({ name: `public/${p}`, data: publicFiles.get(p)! });

  fs.mkdirSync(outDir, { recursive: true });
  const zipFile = path.join(outDir, "iran-bundle.zip");
  writeZip(zipFile, entries);
  const zipBytes = fs.readFileSync(zipFile);
  const summary: BundleSummary = {
    schema: BUNDLE_SCHEMA,
    environment: manifest.environment,
    code_sha: manifest.code_sha,
    snapshot_version: manifest.snapshot_version,
    manifest_sha256: manifestSha,
    bundle_sha256: sha256(zipBytes),
    bundle_bytes: zipBytes.length,
    files: entries.length,
    critical_path_externals: critical,
  };
  fs.writeFileSync(path.join(outDir, "iran-bundle.json"), `${JSON.stringify(summary, null, 1)}\n`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  const artifact = args.get("artifact");
  const out = args.get("out");
  if (!artifact || !out) {
    console.error("usage: bundle.ts --artifact <artifact dir> --out <dir>");
    process.exit(2);
  }
  const s = buildBundle(path.resolve(artifact), path.resolve(out));
  console.log(`[iran] ${s.environment} bundle ${s.snapshot_version} (code ${s.code_sha.slice(0, 12)}): ${s.files} entries, ${s.bundle_bytes} B, sha256 ${s.bundle_sha256}; manifest sha256 ${s.manifest_sha256}`);
  const unexplained = s.critical_path_externals.filter((f) => !f.accepted);
  const accepted = s.critical_path_externals.length - unexplained.length;
  if (unexplained.length) {
    // Reported, not fatal: the www publish never waits for the domestic copy. The cutoff drill (RUNBOOK_P1.md §8) decides.
    console.log(`::warning title=domestic copy: foreign host on the critical path::${unexplained.length} load(s), e.g. ${unexplained.slice(0, 3).map((f) => `${f.file} ${f.kind} ${f.url}`).join("; ")}`);
  } else console.log(`[iran] critical path: no unexplained foreign host in any page or stylesheet (${accepted} accepted, non-blocking load(s))`);
}
