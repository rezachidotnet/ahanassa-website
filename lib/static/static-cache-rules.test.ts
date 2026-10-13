import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHeadersFile, checkStaticCacheRules, headerRuleCount, IMMUTABLE_CACHE_CONTROL, MAX_HEADER_RULES } from "./static-rules.ts";
import { STATIC_TARGETS } from "./targets.ts";

/**
 * W10.6: publish #34's staging 404 for a new chunk carried
 * `Cache-Control: public, max-age=31536000, immutable`, because the `/_next/static/*` rule applies to the 404
 * response of a missing path too. The immutable rule now names each file the build wrote.
 */
const FILES = ["/_next/static/chunks/SiteHeader-Ci44OmZV.js", "/_next/static/chunks/vinext-pjwgzdxh.js", "/_next/static/css/app-1.css"];
const blocks = (headers: string) => {
  const m = new Map<string, string[]>();
  let cur: string[] = [];
  for (const l of headers.split("\n")) {
    if (l.startsWith("/")) m.set(l, (cur = []));
    else if (l.trim()) cur.push(l.trim());
  }
  return m;
};

test("immutable Cache-Control is one rule per built /_next/static/ file — never a wildcard that also covers 404s", () => {
  for (const env of ["staging", "production"] as const) {
    const headers = buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin, [...FILES].reverse());
    const b = blocks(headers);
    assert.ok(!b.has("/_next/static/*"), `${env}: no wildcard rule`);
    assert.ok(![...b].some(([rule, lines]) => rule.includes("*") && lines.some((l) => /immutable/.test(l))), `${env}: no immutable wildcard`);
    for (const f of FILES) assert.deepEqual(b.get(f), [`Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`], `${env}: ${f}`);
    // Sorted, so the same build always writes the same file.
    assert.deepEqual([...b.keys()].filter((k) => k.startsWith("/_next/")), [...FILES].sort());
    assert.deepEqual(b.get("/data/*")?.[0], "Cache-Control: public, max-age=300");
    assert.deepEqual(checkStaticCacheRules(headers, FILES.map((f) => f.slice(1))), []);
  }
});

test("the gate rejects the old wildcard, a missing file rule, a rule for a file not in the artifact, and too many rules", () => {
  const paths = FILES.map((f) => f.slice(1));
  const legacy = "/*\n  X-Frame-Options: DENY\n\n/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n";
  const r = checkStaticCacheRules(legacy, paths);
  assert.ok(r.some((f) => /wildcard rule \(\/_next\/static\/\*\) also caches 404s/.test(f)));
  assert.equal(r.filter((f) => /has no immutable Cache-Control rule/.test(f)).length, FILES.length);

  const stray = buildHeadersFile("staging", STATIC_TARGETS.staging.rfqApiOrigin, [...FILES, "/_next/static/chunks/gone.js"]);
  assert.deepEqual(checkStaticCacheRules(stray, paths), ["_headers: immutable rule for /_next/static/chunks/gone.js, which is not in the artifact"]);

  const many = Array.from({ length: MAX_HEADER_RULES }, (_, i) => `/_next/static/chunks/c${i}.js`);
  assert.throws(() => buildHeadersFile("production", STATIC_TARGETS.production.rfqApiOrigin, many), /exceed Cloudflare's limit of 100/);
  const tooMany = many.map((p) => `${p}\n  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`).join("\n") + "\n/*\n  X-Frame-Options: DENY\n";
  assert.equal(headerRuleCount(tooMany), MAX_HEADER_RULES + 1);
  assert.ok(checkStaticCacheRules(tooMany, many.map((p) => p.slice(1))).some((f) => /exceed Cloudflare's limit/.test(f)));
});

test("only concrete /_next/static/ file paths become immutable rules", () => {
  for (const bad of ["/_next/static/*", "/images/a.png", "_next/static/a.js", "/_next/static/a b.js", "/_next/static/:hash/a.js"]) {
    assert.throws(() => buildHeadersFile("staging", STATIC_TARGETS.staging.rfqApiOrigin, [bad]), /not a concrete \/_next\/static\/ file path/, bad);
  }
});
