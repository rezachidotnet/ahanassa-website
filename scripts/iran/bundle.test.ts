import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { acceptedReason, buildBundle, criticalPathExternals } from "./bundle.ts";
import { checkNginxInclude } from "./render-nginx.ts";
import { makeFixtureArtifact } from "./test-fixture.ts";
import { writeZip } from "./zip.ts";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "w30-bundle-"));
const sha256 = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
const unzipList = (zip: string) => spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });

test("W30: the bundle is deterministic — the same artifact gives the same bytes (one sha256 for GitHub and the mirror)", () => {
  const artifact = makeFixtureArtifact();
  const a = buildBundle(artifact, tmp());
  const b = buildBundle(artifact, tmp());
  assert.equal(a.bundle_sha256, b.bundle_sha256);
  assert.equal(a.manifest_sha256, sha256(fs.readFileSync(path.join(artifact, "manifest.json"))));
});

test("W30: bundle layout — bundle.json, manifest.json unchanged, nginx/*, the variant index only, public/* byte for byte", () => {
  const artifact = makeFixtureArtifact();
  const out = tmp();
  const s = buildBundle(artifact, out);
  const zip = path.join(out, "iran-bundle.zip");
  assert.equal(s.bundle_sha256, sha256(fs.readFileSync(zip)));
  const list = unzipList(zip);
  if (list.status !== 0) return; // no unzip binary on this host; the Python activator test reads the zip instead
  const names = list.stdout.trim().split("\n");
  assert.deepEqual(names.slice(0, 2), ["bundle.json", "manifest.json"]);
  assert.ok(names.includes("private/rfq-variant-index.json"));
  assert.ok(!names.some((n) => n.includes("snapshot.json") || n.endsWith(".sql")));
  for (const f of ["redirects-308.map", "headers.conf", "cache-control.map", "robots.map", "notfound.map"]) assert.ok(names.includes(`nginx/${f}`), f);
  const manifest = JSON.parse(fs.readFileSync(path.join(artifact, "manifest.json"), "utf8")) as { public_assets: { path: string }[] };
  assert.deepEqual(names.filter((n) => n.startsWith("public/")).sort(), manifest.public_assets.map((f) => `public/${f.path}`).sort());
  const bundleJson = JSON.parse(spawnSync("unzip", ["-p", zip, "bundle.json"], { encoding: "utf8" }).stdout);
  assert.equal(bundleJson.manifest_sha256, s.manifest_sha256);
  for (const n of bundleJson.nginx) {
    const text = spawnSync("unzip", ["-p", zip, `nginx/${n.path}`], { encoding: "utf8" }).stdout;
    assert.equal(crypto.createHash("sha256").update(text).digest("hex"), n.sha256);
    assert.deepEqual(checkNginxInclude(n.path, text), []);
  }
  assert.equal(spawnSync("unzip", ["-tq", zip]).status, 0);
});

test("W30: a public file that differs from manifest.json, or is not listed in it, refuses the bundle", () => {
  const changed = makeFixtureArtifact();
  fs.writeFileSync(path.join(changed, "public-assets/about.html"), "tampered");
  assert.throws(() => buildBundle(changed, tmp()), /about\.html does not match manifest\.json/);
  const extra = makeFixtureArtifact();
  fs.writeFileSync(path.join(extra, "public-assets/stray.txt"), "x");
  assert.throws(() => buildBundle(extra, tmp()), /does not list: stray\.txt/);
  assert.throws(() => buildBundle(makeFixtureArtifact("production", { "x.js.gz": "x" }), tmp()), /collides/);
});

test("W30: critical path — foreign scripts, stylesheets, preloads, images and CSS urls are found; links and metadata are not", () => {
  const html = [
    '<link rel="canonical" href="https://www.ahanassa.com/"><link rel="alternate" hreflang="en" href="https://www.ahanassa.com/en">',
    '<meta property="og:image" content="https://www.ahanassa.com/x.png"><a href="https://wa.me/1">wa</a>',
    '<script src="/_next/a.js"></script><script src="https://cdn.example/x.js" async></script>',
    "<link rel='stylesheet' href='//fonts.example/css'><link rel=preload as=script href=https://challenges.cloudflare.com/turnstile/v0/api.js>",
    '<img src="/i.webp" srcset="/a.webp 1x, https://img.example/b.webp 2x"><iframe src="https://www.openstreetmap.org/export/embed.html"></iframe>',
    '<style>@import url("https://fonts.example/f.css");</style><div style="background:url(https://img.example/bg.png)"></div>',
  ].join("");
  const found = criticalPathExternals("contact.html", html).map((f) => `${f.kind} ${f.url}`);
  assert.deepEqual(found.sort(), [
    "<style> @import https://fonts.example/f.css",
    "<style> url() https://fonts.example/f.css",
    "iframe src https://www.openstreetmap.org/export/embed.html",
    "img srcset https://img.example/b.webp",
    "link rel=preload https://challenges.cloudflare.com/turnstile/v0/api.js",
    "link rel=stylesheet //fonts.example/css",
    "script src https://cdn.example/x.js",
    "style attribute url() https://img.example/bg.png",
  ].sort());
  assert.deepEqual(criticalPathExternals("a.css", "@font-face{src:url(/fonts/x.woff2)} .b{background:url('https://x.example/y.png')}").map((f) => f.url), ["https://x.example/y.png"]);
  // Only the known Turnstile preload on /contact is accepted; the same origin elsewhere or as a script is not.
  assert.ok(acceptedReason({ file: "en/contact.html", kind: "link rel=preload", url: "https://challenges.cloudflare.com/turnstile/v0/api.js" }));
  assert.equal(acceptedReason({ file: "index.html", kind: "link rel=preload", url: "https://challenges.cloudflare.com/turnstile/v0/api.js" }), null);
  assert.equal(acceptedReason({ file: "contact.html", kind: "script src", url: "https://challenges.cloudflare.com/turnstile/v0/api.js" }), null);
});

test("W30: the zip writer refuses unsafe or duplicate names", () => {
  const f = path.join(tmp(), "x.zip");
  for (const name of ["/abs", "../up", "a//b", "a/./b", ""]) assert.throws(() => writeZip(f, [{ name, data: Buffer.from("x") }]), /unsafe/, name);
  assert.throws(() => writeZip(f, [{ name: "a", data: Buffer.from("x") }, { name: "a", data: Buffer.from("y") }]), /duplicate/);
});
