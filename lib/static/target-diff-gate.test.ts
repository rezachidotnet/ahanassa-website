import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describeFiles } from "./artifact-gate.ts";
import { compareTargetArtifacts, normalizeForTarget } from "./target-diff-gate.ts";
import { STATIC_TARGETS } from "./targets.ts";

// r4 §2 — the allowlisted-diff gate between the staging and production artifacts of one build.
const S = STATIC_TARGETS.staging;
const P = STATIC_TARGETS.production;
type Target = "staging" | "production";

const write = (dir: string, rel: string, content: string | Buffer) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
};

function page(target: Target, robots: string) {
  const t = STATIC_TARGETS[target];
  return `<html><head><meta name="robots" content="${robots}"/></head><body><form data-key="${t.turnstileSiteKey}" action="${t.rfqApiOrigin}/api/rfqs"></form><script>self.rsc.push("3:[[\\"$\\",\\"meta\\",\\"2\\",{\\"name\\":\\"robots\\",\\"content\\":\\"${robots}\\"}],{\\"turnstileSiteKey\\":\\"${t.turnstileSiteKey}\\",\\"rfqEndpoint\\":\\"${t.rfqApiOrigin}/api/rfqs\\"}]")</script></body></html>`;
}

/** A minimal staging/production pair that differs only in allowlisted places. */
function pair() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "target-diff-"));
  const dirs = { staging: path.join(root, "staging"), production: path.join(root, "production") };
  for (const target of ["staging", "production"] as const) {
    const pub = path.join(dirs[target], "public-assets");
    const priv = path.join(dirs[target], "private-snapshot");
    write(pub, "contact.html", page(target, target === "production" ? "index, follow" : "noindex, follow"));
    write(pub, "404.html", page(target, "noindex, nofollow").replace(/<form.*<\/form>/, ""));
    write(pub, "about.html", `<meta name="robots" content="${target === "production" ? "index, follow" : "noindex, follow"}"/><p>same</p>`);
    write(pub, "_next/static/chunk.js", "console.log(1)");
    write(pub, "images/a.png", Buffer.from([1, 2, 3]));
    write(pub, "robots.txt", target === "production" ? "User-Agent: *\nAllow: /\n" : "User-Agent: *\nDisallow: /\n");
    write(pub, "sitemap.xml", target === "production" ? "<urlset><url/></urlset>" : "<urlset/>");
    write(pub, "_headers", `/*\n  connect-src 'self' ${STATIC_TARGETS[target].rfqApiOrigin}\n`);
    write(pub, "manifest.public.json", JSON.stringify({ schema_version: "artifact.public.v1", snapshot_version: "snap-2026100407093900", generated_at: "t", locales: ["fa"] }));
    write(priv, "snapshot.json", "{}");
  }
  const seal = (target: Target, overrides: Record<string, unknown> = {}) =>
    fs.writeFileSync(
      path.join(dirs[target], "manifest.json"),
      JSON.stringify({
        schema_version: "artifact.v1",
        code_sha: "a".repeat(40),
        snapshot_version: "snap-2026100407093900",
        environment: target,
        generated_at: target,
        counts: { sitemap_urls: target === "production" ? 90 : 6, rfq_variant_index_rows: 768 },
        public_assets: describeFiles(path.join(dirs[target], "public-assets")),
        private_snapshot: describeFiles(path.join(dirs[target], "private-snapshot")),
        ...overrides,
      }),
    );
  seal("staging");
  seal("production");
  const edit = (target: Target, rel: string, fn: (s: string) => string) => {
    const f = path.join(dirs[target], "public-assets", rel);
    fs.writeFileSync(f, fn(fs.readFileSync(f, "utf8")));
    seal(target);
  };
  const run = () => compareTargetArtifacts(dirs.staging, dirs.production);
  return { dirs, seal, edit, run, write };
}

test("each allowed difference passes: robots meta (HTML + RSC), Turnstile/API pair, robots.txt, sitemap.xml, _headers, sitemap_urls", () => {
  const r = pair().run();
  assert.deepEqual(r.failures, []);
  assert.deepEqual(r.stats.wholeFileAllowed.sort(), ["_headers", "robots.txt", "sitemap.xml"]);
  assert.equal(r.stats.normalizedEqual, 3, "contact.html, about.html, 404.html");
  assert.equal(r.stats.identical, 3, "chunk, image, manifest.public.json");
});

test("manifest.public.json may differ only by the target label", () => {
  const a = pair();
  a.edit("production", "manifest.public.json", (s) => JSON.stringify({ ...JSON.parse(s), target: "production" }));
  assert.deepEqual(a.run().failures, []);
  const b = pair();
  b.edit("production", "manifest.public.json", (s) => JSON.stringify({ ...JSON.parse(s), locales: ["fa", "en"] }));
  assert.ok(b.run().failures.some((f) => f.includes("manifest.public.json differs beyond the target label")));
});

test("any other byte difference fails: page text, a JS chunk, a binary, a file only on one side", () => {
  const a = pair();
  a.edit("production", "about.html", (s) => s.replace("same", "same!"));
  assert.ok(a.run().failures.some((f) => f.startsWith("about.html: difference outside the allowlist")));
  const b = pair();
  b.edit("production", "_next/static/chunk.js", (s) => s.replace("1", "2"));
  assert.ok(b.run().failures.some((f) => f.startsWith("_next/static/chunk.js: difference outside the allowlist")));
  const c = pair();
  c.write(path.join(c.dirs.production, "public-assets"), "images/a.png", Buffer.from([9]));
  c.seal("production");
  assert.ok(c.run().failures.some((f) => f.includes("images/a.png: binary file differs")));
  const d = pair();
  d.write(path.join(d.dirs.production, "public-assets"), "extra.html", "x");
  d.seal("production");
  assert.ok(d.run().failures.some((f) => f === "only in production: extra.html"));
});

test("an unregistered robots value is not normalized away", () => {
  const a = pair();
  a.edit("production", "about.html", (s) => s.replace("index, follow", "index, follow, noarchive"));
  assert.ok(a.run().failures.some((f) => f.startsWith("about.html:")));
});

test("swapped or mixed Turnstile/API pairs fail", () => {
  // Swapped: each artifact carries the other target's pair.
  const a = pair();
  a.edit("staging", "contact.html", () => page("production", "noindex, follow"));
  a.edit("production", "contact.html", () => page("staging", "index, follow"));
  const fa = a.run().failures;
  assert.ok(fa.some((f) => f.includes(`staging artifact contains the production value ${P.turnstileSiteKey}`)));
  assert.ok(fa.some((f) => f.includes(`production artifact contains the staging value ${S.turnstileSiteKey}`)));
  // Mixed: production Turnstile key with the staging API origin.
  const b = pair();
  b.edit("production", "contact.html", (s) => s.split(P.rfqApiOrigin).join(S.rfqApiOrigin));
  assert.ok(b.run().failures.some((f) => f.includes(`production artifact contains the staging value ${S.rfqApiOrigin}`)));
  // Even in an otherwise identical file.
  const c = pair();
  for (const t of ["staging", "production"] as const) c.edit(t, "_next/static/chunk.js", () => `fetch("${S.rfqApiOrigin}")`);
  assert.ok(c.run().failures.some((f) => f.includes("_next/static/chunk.js: production artifact contains the staging value")));
});

test("manifest identity: code_sha, snapshot_version, pipeline, counts, private-snapshot and environments must match", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ code_sha: "b".repeat(40) }, /code_sha differs/],
    [{ snapshot_version: "snap-2026100407093901" }, /snapshot_version differs/],
    [{ counts: { sitemap_urls: 90, rfq_variant_index_rows: 767 } }, /count rfq_variant_index_rows differs/],
    [{ environment: "staging" }, /production artifact is built for staging/],
  ];
  for (const [override, expected] of cases) {
    const a = pair();
    a.seal("production", override);
    assert.ok(a.run().failures.some((f) => expected.test(f)), String(expected));
  }
  const b = pair();
  b.write(path.join(b.dirs.production, "private-snapshot"), "snapshot.json", '{"x":1}');
  b.seal("production");
  assert.ok(b.run().failures.some((f) => f.includes("private-snapshot differs")));
});

test("normalizeForTarget only replaces the target's own registered values", () => {
  assert.equal(normalizeForTarget(`k=${S.turnstileSiteKey} o=${S.rfqApiOrigin}`, "staging"), "k=@TURNSTILE_SITE_KEY@ o=@RFQ_API_ORIGIN@");
  assert.equal(normalizeForTarget(`k=${S.turnstileSiteKey}`, "production"), `k=${S.turnstileSiteKey}`);
});

test("the WhatsApp link (same build-time number on both targets) needs no allowlist entry", () => {
  const a = pair();
  const link = '<a href="https://wa.me/989000000000?text=Hello" target="_blank" rel="noopener noreferrer">Send drawings via WhatsApp</a>';
  for (const t of ["staging", "production"] as const) a.edit(t, "contact.html", (s) => s.replace("<body>", `<body>${link}`));
  assert.deepEqual(a.run().failures, []);
  const b = pair();
  b.edit("staging", "contact.html", (s) => s.replace("<body>", `<body>${link}`));
  b.edit("production", "contact.html", (s) => s.replace("<body>", `<body>${link.replace("989000000000", "989000000001")}`));
  assert.ok(b.run().failures.some((f) => f.startsWith("contact.html: difference outside the allowlist")));
});
