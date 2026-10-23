/**
 * W30 test helper: a small but complete artifact directory (manifest.json, public-assets/, private-snapshot/) whose
 * `_headers` / `_redirects` come from the real builders. Used by the bundle, parity and Python-activator tests.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describeFiles } from "../../lib/static/artifact-gate.ts";
import { buildHeadersFile, buildRedirectsFile } from "../../lib/static/static-rules.ts";
import { STATIC_TARGETS } from "../../lib/static/targets.ts";

export const FIXTURE_CODE_SHA = "0123456789abcdef0123456789abcdef01234567";
export const FIXTURE_SNAPSHOT = "snap-0123456789abcdef";

export function makeFixtureArtifact(environment: "staging" | "production" = "production", extraPublic: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w30-artifact-"));
  const pub = path.join(dir, "public-assets");
  const priv = path.join(dir, "private-snapshot");
  const chunk = "/_next/static/chunks/main-AbC123.js";
  const files: Record<string, string> = {
    "index.html": '<!DOCTYPE html><html lang="fa"><head><link rel="canonical" href="https://www.ahanassa.com/"/><script type="module" src="/_next/static/chunks/main-AbC123.js"></script></head><body>خانه</body></html>',
    "about.html": "<!DOCTYPE html><html><body>about</body></html>",
    "contact.html": "<!DOCTYPE html><html><body>contact</body></html>",
    "404.html": "<!DOCTYPE html><html><body>404</body></html>",
    "en.html": "<!DOCTYPE html><html><body>en</body></html>",
    "en/404.html": "<!DOCTYPE html><html><body>en 404</body></html>",
    "en/products/index.html": "<!DOCTYPE html><html><body>en products</body></html>",
    "ar/404.html": "<!DOCTYPE html><html><body>ar 404</body></html>",
    "index.md": "# home\n",
    "robots.txt": "User-Agent: *\nAllow: /\n\nSitemap: https://www.ahanassa.com/sitemap.xml\n",
    "manifest.public.json": JSON.stringify({ schema_version: "artifact.public.v1", snapshot_version: FIXTURE_SNAPSHOT }),
    "data/rfq-catalog.fa.json": "{}",
    [chunk.slice(1)]: "console.log(1)",
    "_headers": buildHeadersFile(environment, STATIC_TARGETS[environment].rfqApiOrigin, [chunk], []),
    "_redirects": buildRedirectsFile([], []),
    ".assetsignore": "manifest.json\n",
    ...extraPublic,
  };
  for (const [p, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(pub, p)), { recursive: true });
    fs.writeFileSync(path.join(pub, p), body);
  }
  fs.mkdirSync(priv, { recursive: true });
  fs.writeFileSync(path.join(priv, "rfq-variant-index.json"), JSON.stringify({ snapshot_version: FIXTURE_SNAPSHOT, rows: [] }));
  fs.writeFileSync(path.join(priv, "snapshot.json"), "{}");
  const manifest = { schema_version: "artifact.v1", code_sha: FIXTURE_CODE_SHA, snapshot_version: FIXTURE_SNAPSHOT, environment, generated_at: "2026-10-22T00:00:00.000Z", counts: {}, public_assets: describeFiles(pub), private_snapshot: describeFiles(priv) };
  fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
  return dir;
}
