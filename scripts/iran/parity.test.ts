import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildRedirectsFile } from "../../lib/static/static-rules.ts";
import { startStaticServer } from "../static/serve.ts";
import { buildRequestMatrix, compareObserved, normalizeHeader, pageUrl, runParity, type Observed } from "./parity.ts";
import { makeFixtureArtifact } from "./test-fixture.ts";

test("W30 parity: page URLs as the static Worker serves them (fa unprefixed)", () => {
  assert.equal(pageUrl("index.html"), "/");
  assert.equal(pageUrl("about.html"), "/about");
  assert.equal(pageUrl("en.html"), "/en");
  assert.equal(pageUrl("en/products/index.html"), "/en/products");
});

test("W30 parity: the request matrix covers files, page variants, every _redirects source, unknown paths and a missing chunk — deterministically", () => {
  const paths = ["index.html", "about.html", "404.html", "en/404.html", "_next/static/chunks/a.js", "data/x.json"];
  const redirects = buildRedirectsFile([], []);
  const m = buildRequestMatrix(paths, redirects, { unknown: 5, seed: 7 });
  const has = (method: string, p: string) => m.some((r) => r.method === method && r.path === p);
  for (const p of ["/about", "/about/", "/about.html", "/about?ahanassa-parity=1", "/_next/static/chunks/a.js", "/404.html", "/fa", "/fa/ahanassa-parity", "/fa/", "/request", "/request?x=1", "/_next/static/chunks/ahanassa-parity-missing.js", "/en", "/data"]) assert.ok(has("GET", p), p);
  assert.ok(has("HEAD", "/about"));
  assert.equal(m.filter((r) => r.why === "unknown path").length, 15);
  assert.deepEqual(buildRequestMatrix(paths, redirects, { unknown: 5, seed: 7 }), m);
  assert.notDeepEqual(buildRequestMatrix(paths, redirects, { unknown: 5, seed: 8 }), m);
  assert.equal(new Set(m.map((r) => `${r.method} ${r.path}`)).size, m.length, "no duplicate request");
});

test("W30 parity: normalisation — Location by path, Content-Type spacing, Cache-Control order, Vary without Accept-Encoding", () => {
  assert.equal(normalizeHeader("location", "https://new.ahanassa.ir/about?x=1", "new.ahanassa.ir"), "/about?x=1");
  assert.equal(normalizeHeader("location", "/about?x=1", "www.ahanassa.com"), "/about?x=1");
  assert.equal(normalizeHeader("location", "https://evil.example/", "new.ahanassa.ir"), "https://evil.example/");
  assert.equal(normalizeHeader("content-type", "text/html; charset=UTF-8", "h"), "text/html;charset=utf-8");
  assert.equal(normalizeHeader("cache-control", "must-revalidate, public, max-age=0", "h"), normalizeHeader("cache-control", "public, max-age=0, must-revalidate", "h"));
  assert.equal(normalizeHeader("vary", "Accept-Encoding, Accept", "h"), "accept");
  assert.equal(normalizeHeader("vary", "Accept-Encoding", "h"), null);
});

test("W30 parity: compare reports status, header and body differences; an explanation marks one as explained", () => {
  const base: Observed = { status: 200, headers: { "content-type": "text/html", "cache-control": "public, max-age=0, must-revalidate" }, bodySha256: "a" };
  const req = { method: "GET" as const, path: "/x", why: "page" };
  const hosts = { a: "www.ahanassa.com", b: "new.ahanassa.ir" };
  assert.deepEqual(compareObserved(req, base, { ...base }, hosts), []);
  const d = compareObserved(req, base, { status: 200, headers: { "content-type": "text/html", "cache-control": "public, max-age=31536000, immutable", "x-robots-tag": "noindex" }, bodySha256: "b" }, hosts);
  assert.deepEqual(d.map((x) => x.field).sort(), ["body sha256", "cache-control", "x-robots-tag"]);
  const e = compareObserved(req, base, { ...base, status: 404 }, hosts, [{ field: "status", path: "^/x$", reason: "test" }]);
  assert.equal(e[0].explained, "test");
});

test("W30 parity: end to end against two local servers — identical copies give zero differences; a changed page is found", async () => {
  const artifact = makeFixtureArtifact();
  const pub = path.join(artifact, "public-assets");
  const copy = makeFixtureArtifact();
  const [a, b] = await Promise.all([startStaticServer(pub), startStaticServer(path.join(copy, "public-assets"))]);
  try {
    const same = await runParity({ a: a.url, b: b.url, publicDir: pub, unknown: 3 });
    assert.equal(same.comparable, true);
    assert.deepEqual(same.differences, []);
    fs.writeFileSync(path.join(copy, "public-assets/about.html"), "<html>changed</html>");
    const changed = await runParity({ a: a.url, b: b.url, publicDir: pub, unknown: 3 });
    assert.ok(changed.differences.some((x) => x.path === "/about" && x.field === "body sha256"));
    fs.writeFileSync(path.join(copy, "public-assets/manifest.public.json"), JSON.stringify({ snapshot_version: "snap-other00000000" }));
    const other = await runParity({ a: a.url, b: b.url, publicDir: pub, unknown: 3 });
    assert.equal(other.comparable, false);
  } finally {
    a.close();
    b.close();
  }
});
