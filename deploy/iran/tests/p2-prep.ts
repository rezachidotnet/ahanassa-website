/**
 * W32 Docker rehearsal, host side (docker-rehearsal-p2.sh): everything the container needs, built from this checkout.
 *
 *   node deploy/iran/tests/p2-prep.ts <work dir>
 *
 * <work>/artifact     a small STAGING artifact with the real _headers/_redirects builders (scripts/iran/test-fixture.ts)
 * <work>/bundle       the signed-to-be domestic bundle — WITH rfq/rfq-ir.mjs, exactly as CI builds it
 * <work>/p2-stubs.mjs the Odoo / R2 / arCaptcha / Bale stubs (deploy/iran/tests/p2-stubs.ts), one file
 * <work>/files        a PNG and a PDF the drills upload (their sha256 is checked at the R2 stub)
 */
import fs from "node:fs";
import path from "node:path";
import { buildSync } from "esbuild";
import { makeFixtureArtifact } from "../../../scripts/iran/test-fixture.ts";
import { buildBundle } from "../../../scripts/iran/bundle.ts";

const work = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("usage: p2-prep.ts <work dir>");
const artifact = makeFixtureArtifact("staging", { "ar.html": "<!DOCTYPE html><html><body>ar</body></html>" });
fs.cpSync(artifact, path.join(work, "artifact"), { recursive: true });
fs.rmSync(artifact, { recursive: true, force: true });
const summary = buildBundle(path.join(work, "artifact"), path.join(work, "bundle"));
buildSync({
  entryPoints: [path.resolve(import.meta.dirname, "p2-stubs.ts")],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: path.join(work, "p2-stubs.mjs"),
  loader: { ".sql": "text" },
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  logLevel: "error",
});
fs.mkdirSync(path.join(work, "files"), { recursive: true });
const png = Buffer.alloc(6008, 0x41);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
for (let i = 8; i < png.length; i++) png[i] = (i * 7) % 251;
fs.writeFileSync(path.join(work, "files", "list.png"), png);
fs.writeFileSync(path.join(work, "files", "list.pdf"), Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(5000, 0x42)]));
console.log(JSON.stringify(summary));
