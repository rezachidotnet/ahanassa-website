import fs from "node:fs";
import path from "node:path";
import { artifactManifest, PUBLIC_DIR, type ArtifactManifest } from "../contracts/artifact-v1.ts";
import { STATIC_TARGETS } from "./targets.ts";

/**
 * Allowlisted-diff gate — architecture V1.1 r4 §2 (owner-approved 2026-10-04,
 * docs/OWNER_DECISIONS.md). Every build makes a staging and a production
 * artifact from ONE code_sha and ONE snapshot; the production artifact may be
 * published only when it differs from its staging twin in nothing but:
 *
 *   - the whole files robots.txt, sitemap.xml, _headers (each still checked by
 *     its own target's artifact/indexing gate);
 *   - the value of <meta name="robots"> (HTML and its serialized RSC copy) —
 *     X-Robots-Tag lives in _headers;
 *   - the public Turnstile site key and the RFQ API origin, ONLY as the
 *     registered pair of each target (lib/static/targets.ts) — a staging value
 *     in the production artifact, or the reverse, fails (swapped/mixed pairs);
 *   - the target label (`target`) in manifest.public.json and `environment` in
 *     the private manifest (plus what follows from the allowed files: their
 *     checksums and the `sitemap_urls` count).
 *
 * Any other difference — one byte — fails. Changing this list is a governance
 * change and a HIGH release (r4 §3).
 */
export const WHOLE_FILE_ALLOWED = ["robots.txt", "sitemap.xml", "_headers"] as const;
export const ROBOTS_META_VALUES = ["index, follow", "noindex, follow", "noindex, nofollow"] as const;
/** Manifest counts that are derived from a whole-file-allowed file. */
export const COUNTS_ALLOWED_TO_DIFFER = ["sitemap_urls"] as const;

type Target = "staging" | "production";
const other = (t: Target): Target => (t === "staging" ? "production" : "staging");
const TEXT = /\.(html|js|mjs|css|json|txt|xml|svg|webmanifest)$/;

export interface TargetDiffResult {
  failures: string[];
  stats: { files: number; identical: number; normalizedEqual: number; wholeFileAllowed: string[] };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ROBOTS_ALT = ROBOTS_META_VALUES.map(escapeRe).join("|");
const ROBOTS_HTML = new RegExp(`(<meta name="robots" content=")(?:${ROBOTS_ALT})("/?>)`, "g");
const ROBOTS_RSC = new RegExp(`(\\\\"name\\\\":\\\\"robots\\\\",\\\\"content\\\\":\\\\")(?:${ROBOTS_ALT})(\\\\")`, "g");
const ROBOTS_JSON = new RegExp(`("name":"robots","content":")(?:${ROBOTS_ALT})(")`, "g");

/** Replaces exactly the allowlisted, target-specific values with placeholders. */
export function normalizeForTarget(content: string, target: Target): string {
  const { turnstileSiteKey, rfqApiOrigin } = STATIC_TARGETS[target];
  let out = content.replace(ROBOTS_HTML, "$1@ROBOTS@$2").replace(ROBOTS_RSC, "$1@ROBOTS@$2").replace(ROBOTS_JSON, "$1@ROBOTS@$2");
  if (turnstileSiteKey) out = out.split(turnstileSiteKey).join("@TURNSTILE_SITE_KEY@");
  return out.split(rfqApiOrigin).join("@RFQ_API_ORIGIN@");
}

/** Target-specific values of the OTHER target that must never appear in this target's artifact. */
export function foreignValues(target: Target): string[] {
  const { turnstileSiteKey, rfqApiOrigin } = STATIC_TARGETS[other(target)];
  return [turnstileSiteKey, rfqApiOrigin].filter((v): v is string => Boolean(v));
}

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ctx = (s: string) => JSON.stringify(s.slice(Math.max(0, i - 30), i + 50));
  return `at char ${i}: staging ${ctx(a)} vs production ${ctx(b)}`;
}

function readManifest(dir: string, label: Target, failures: string[]): ArtifactManifest | null {
  try {
    const parsed = artifactManifest.safeParse(JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")));
    if (parsed.success) return parsed.data;
    failures.push(`${label} manifest.json invalid`);
  } catch {
    failures.push(`${label} manifest.json missing or unreadable`);
  }
  return null;
}

const stable = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

export function compareTargetArtifacts(stagingDir: string, productionDir: string): TargetDiffResult {
  const failures: string[] = [];
  const stats: TargetDiffResult["stats"] = { files: 0, identical: 0, normalizedEqual: 0, wholeFileAllowed: [] };
  const s = readManifest(stagingDir, "staging", failures);
  const p = readManifest(productionDir, "production", failures);
  if (!s || !p) return { failures, stats };

  // Private manifest: only `environment`, the allowed files' checksums and derived counts may differ.
  if (s.environment !== "staging") failures.push(`staging artifact is built for ${s.environment}`);
  if (p.environment !== "production") failures.push(`production artifact is built for ${p.environment}`);
  if (s.code_sha !== p.code_sha) failures.push(`code_sha differs: ${s.code_sha} vs ${p.code_sha}`);
  if (s.snapshot_version !== p.snapshot_version) failures.push(`snapshot_version differs: ${s.snapshot_version} vs ${p.snapshot_version}`);
  if (stable(s.pipeline ?? null) !== stable(p.pipeline ?? null)) failures.push("pipeline block differs");
  const countKeys = new Set([...Object.keys(s.counts), ...Object.keys(p.counts)]);
  for (const k of countKeys) if (!(COUNTS_ALLOWED_TO_DIFFER as readonly string[]).includes(k) && s.counts[k] !== p.counts[k]) failures.push(`count ${k} differs: ${s.counts[k]} vs ${p.counts[k]}`);
  if (stable(s.private_snapshot) !== stable(p.private_snapshot)) failures.push("private-snapshot differs (must be byte-identical)");

  const sFiles = new Map(s.public_assets.map((f) => [f.path, f]));
  const pFiles = new Map(p.public_assets.map((f) => [f.path, f]));
  for (const f of sFiles.keys()) if (!pFiles.has(f)) failures.push(`only in staging: ${f}`);
  for (const f of pFiles.keys()) if (!sFiles.has(f)) failures.push(`only in production: ${f}`);

  const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, PUBLIC_DIR, f), "utf8");
  for (const [f, se] of sFiles) {
    const pe = pFiles.get(f);
    if (!pe) continue;
    stats.files++;
    const textual = TEXT.test(f) || f.startsWith("_") || f === ".assetsignore";
    // Swapped/mixed pairs: the other target's values never appear, even in an otherwise identical file.
    if (textual) {
      const sText = read(stagingDir, f);
      const pText = read(productionDir, f);
      for (const v of foreignValues("staging")) if (sText.includes(v)) failures.push(`${f}: staging artifact contains the production value ${v}`);
      for (const v of foreignValues("production")) if (pText.includes(v)) failures.push(`${f}: production artifact contains the staging value ${v}`);
    }
    if (se.sha256 === pe.sha256 && se.bytes === pe.bytes) {
      stats.identical++;
      continue;
    }
    if ((WHOLE_FILE_ALLOWED as readonly string[]).includes(f)) {
      stats.wholeFileAllowed.push(f);
      continue;
    }
    if (f === "manifest.public.json") {
      const strip = (t: string) => {
        const { target: _t, ...rest } = JSON.parse(t) as Record<string, unknown>;
        return stable(rest);
      };
      if (strip(read(stagingDir, f)) === strip(read(productionDir, f))) stats.normalizedEqual++;
      else failures.push("manifest.public.json differs beyond the target label");
      continue;
    }
    if (!textual) {
      failures.push(`${f}: binary file differs`);
      continue;
    }
    const a = normalizeForTarget(read(stagingDir, f), "staging");
    const b = normalizeForTarget(read(productionDir, f), "production");
    if (a === b) stats.normalizedEqual++;
    else failures.push(`${f}: difference outside the allowlist ${firstDifference(a, b)}`);
  }
  return { failures, stats };
}

/** Fixed location of the production twin next to the staging artifact in a pipeline work dir. */
export const PRODUCTION_ARTIFACT_DIR = "artifact-production";
