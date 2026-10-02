import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest, publicManifest, publicRfqCatalog, PRIVATE_DIR, PUBLIC_DIR, type ArtifactFileEntry } from "../contracts/artifact-v1.ts";
import { scanPublicFile, type LeakFinding } from "./leak-scan.ts";

/**
 * artifact.v1 gate (architecture V1.1 §7.1 step 6, docs/contracts/ARTIFACT_V1.md).
 * A deploy MUST be refused unless `runArtifactGate` returns no failures.
 */
export const PRODUCTION_ORIGIN = "https://www.ahanassa.com";
export const REQUIRED_PUBLIC_FILES = [
  "index.html",
  "404.html",
  "en/404.html",
  "ar/404.html",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "_redirects",
  ".assetsignore",
  "manifest.public.json",
  "data/rfq-catalog.fa.json",
  "data/rfq-catalog.en.json",
  "data/rfq-catalog.ar.json",
] as const;

export interface GateResult {
  failures: string[];
  leaks: LeakFinding[];
  stats: { publicFiles: number; privateFiles: number; htmlPages: number; largestPublicFile: { path: string; bytes: number } | null };
}

export function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(path.relative(dir, p).split(path.sep).join("/"));
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort();
}

export function describeFiles(dir: string): ArtifactFileEntry[] {
  return listFiles(dir).map((p) => ({ path: p, bytes: fs.statSync(path.join(dir, p)).size, sha256: sha256File(path.join(dir, p)) }));
}

/** Paths that must never exist in public-assets/ (§7.1 step 6, appendix D V8). */
export function forbiddenPublicPath(p: string): string | null {
  if (p.endsWith(".sql")) return "SQL file";
  if (p.endsWith(".rsc")) return "RSC payload (.rsc files are not published, A1)";
  if (p.split("/").includes(".vite")) return ".vite build metadata";
  if (p.split("/").includes(PRIVATE_DIR)) return "private-snapshot path";
  if (p === "manifest.json" || p.endsWith("/manifest.json")) return "private manifest";
  return null;
}

export function runArtifactGate(artifactDir: string, options: { companyPhones?: readonly string[] } = {}): GateResult {
  const failures: string[] = [];
  const publicDir = path.join(artifactDir, PUBLIC_DIR);
  const privateDir = path.join(artifactDir, PRIVATE_DIR);
  const manifestPath = path.join(artifactDir, "manifest.json");
  for (const p of [publicDir, privateDir, manifestPath]) if (!fs.existsSync(p)) failures.push(`missing ${path.relative(artifactDir, p)}`);
  if (failures.length) return { failures, leaks: [], stats: { publicFiles: 0, privateFiles: 0, htmlPages: 0, largestPublicFile: null } };

  // 1. Manifest: schema + every file listed with matching bytes/sha, and nothing unlisted.
  const parsed = artifactManifest.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const publicEntries = describeFiles(publicDir);
  const privateEntries = describeFiles(privateDir);
  if (!parsed.success) failures.push(`manifest.json invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  else {
    const compare = (label: string, listed: ArtifactFileEntry[], actual: ArtifactFileEntry[]) => {
      const byPath = new Map(actual.map((e) => [e.path, e]));
      for (const e of listed) {
        const a = byPath.get(e.path);
        if (!a) failures.push(`${label}: listed but missing: ${e.path}`);
        else if (a.sha256 !== e.sha256 || a.bytes !== e.bytes) failures.push(`${label}: checksum mismatch: ${e.path}`);
      }
      const listedPaths = new Set(listed.map((e) => e.path));
      for (const a of actual) if (!listedPaths.has(a.path)) failures.push(`${label}: not in manifest: ${a.path}`);
    };
    compare(PUBLIC_DIR, parsed.data.public_assets, publicEntries);
    compare(PRIVATE_DIR, parsed.data.private_snapshot, privateEntries);
  }

  // 2. Separation: nothing private, no SQL/RSC/.vite in public-assets.
  const privateHashes = new Set(privateEntries.map((e) => e.sha256));
  for (const e of publicEntries) {
    const why = forbiddenPublicPath(e.path);
    if (why) failures.push(`${PUBLIC_DIR}/${e.path}: forbidden (${why})`);
    if (privateHashes.has(e.sha256)) failures.push(`${PUBLIC_DIR}/${e.path}: identical to a ${PRIVATE_DIR} file`);
  }

  // 3. Required public files and their schemas.
  const publicPaths = new Set(publicEntries.map((e) => e.path));
  for (const f of REQUIRED_PUBLIC_FILES) if (!publicPaths.has(f)) failures.push(`${PUBLIC_DIR}: required file missing: ${f}`);
  for (const loc of ["en", "ar"]) if (!publicPaths.has(`${loc}.html`) && !publicPaths.has(`${loc}/index.html`)) failures.push(`${PUBLIC_DIR}: ${loc} home page missing`);
  const readPublic = (p: string) => fs.readFileSync(path.join(publicDir, p), "utf8");
  if (publicPaths.has("manifest.public.json")) {
    const pm = publicManifest.safeParse(JSON.parse(readPublic("manifest.public.json")));
    if (!pm.success) failures.push("manifest.public.json does not match artifact.public.v1");
    else if (parsed.success && pm.data.snapshot_version !== parsed.data.snapshot_version) failures.push("manifest.public.json snapshot_version differs from manifest.json");
  }
  for (const loc of ["fa", "en", "ar"] as const) {
    const p = `data/rfq-catalog.${loc}.json`;
    if (!publicPaths.has(p)) continue;
    const c = publicRfqCatalog.safeParse(JSON.parse(readPublic(p)));
    if (!c.success) failures.push(`${p} does not match rfq-catalog.v1: ${c.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    else if (c.data.locale !== loc || (parsed.success && c.data.snapshot_version !== parsed.data.snapshot_version)) failures.push(`${p}: wrong locale or snapshot_version`);
  }

  // 4. SEO: canonical/hreflang always point at production (staging never self-canonical, R2-4); robots headers per environment.
  const htmlFiles = publicEntries.filter((e) => e.path.endsWith(".html"));
  for (const e of htmlFiles) {
    const html = readPublic(e.path);
    for (const m of html.matchAll(/<link\b[^>]*rel="(canonical|alternate)"[^>]*>/gi)) {
      const href = /href="([^"]*)"/.exec(m[0])?.[1] ?? "";
      if (!href.startsWith(`${PRODUCTION_ORIGIN}/`) && href !== PRODUCTION_ORIGIN) failures.push(`${e.path}: ${m[1]} not on ${PRODUCTION_ORIGIN}: ${href}`);
    }
  }
  if (publicPaths.has("_headers") && parsed.success) {
    const headers = readPublic("_headers");
    const noindex = /X-Robots-Tag:\s*noindex, nofollow/.test(headers);
    if (parsed.data.environment === "staging" && !noindex) failures.push("_headers: staging must send X-Robots-Tag: noindex, nofollow");
    if (parsed.data.environment === "production" && /noindex/i.test(headers)) failures.push("_headers: production must not send noindex");
  }

  // 5. Leak scan over every public text file.
  const leaks: LeakFinding[] = [];
  for (const e of publicEntries) {
    if (!/\.(html|json|txt|xml|js|css)$/.test(e.path) && !e.path.startsWith("_") && e.path !== ".assetsignore") continue;
    leaks.push(...scanPublicFile(e.path, readPublic(e.path), options.companyPhones ?? []));
  }
  for (const l of leaks) failures.push(`leak ${l.kind} in ${l.file}: ${l.match}`);

  const largest = publicEntries.reduce<ArtifactFileEntry | null>((a, b) => (!a || b.bytes > a.bytes ? b : a), null);
  return { failures, leaks, stats: { publicFiles: publicEntries.length, privateFiles: privateEntries.length, htmlPages: htmlFiles.length, largestPublicFile: largest ? { path: largest.path, bytes: largest.bytes } : null } };
}
