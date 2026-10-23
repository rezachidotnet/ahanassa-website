import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildHeadersFile, buildRedirectsFile, DATA_CACHE_CONTROL, IMMUTABLE_CACHE_CONTROL, LEGACY_PERMANENT_RULES } from "../../lib/static/static-rules.ts";
import { STATIC_TARGETS } from "../../lib/static/targets.ts";
import { buildSecurityHeaders } from "../../lib/security/headers.ts";
import { rfqApiMirrorOrigins } from "../../lib/mirror/iran-mirror.ts";
import { checkNginxInclude, headerPathKey, NGINX_INCLUDE_FILES, parseHeaders, parseRedirects, renderArvanRealIp, renderHeaderIncludes, renderNginxIncludes, renderNotFoundMap, renderRedirectMaps } from "./render-nginx.ts";

/**
 * W30 (W29 P1 §2.2–§2.3): the domestic copy's nginx includes are rendered from the artifact's own `_redirects` /
 * `_headers`. Fixtures are the real builders' output (buildRedirectsFile / buildHeadersFile), so a change to the
 * Worker rules either renders the same behaviour on nginx or fails here.
 */
const CHUNKS = ["/_next/static/chunks/main-AbC123.js", "/_next/static/css/app-X1.css"];
const CATALOG = ["/data/rfq-catalog.fa.0123456789abcdef.json"];
const ROUTE_REDIRECTS = [
  { locale: "fa" as const, old_path: "/products/old-rebar", target_path: "/products/rebar-a3", status_code: 308 as const },
  { locale: "en" as const, old_path: "/products/old-beam", target_path: "/products/ipe-180", status_code: 302 as const },
  { locale: "ar" as const, old_path: "/products/gone", target_path: null, status_code: 410 as const },
];
const PUBLIC_PATHS = ["index.html", "404.html", "en/404.html", "ar/404.html", "en/products/x.html", "_headers"];

test("W30: _redirects → maps — the legacy /fa splat is the one regex; every other rule an exact key under its status", () => {
  const maps = renderRedirectMaps(parseRedirects(buildRedirectsFile(ROUTE_REDIRECTS, ["rebar-a3-12"])));
  assert.match(maps["redirects-308.map"], /^"\/fa" "\/";$/m);
  assert.match(maps["redirects-308.map"], /^"~\^\/fa\/\(\.\*\)\$" "\/\$1";$/m);
  assert.match(maps["redirects-308.map"], /^"\/request" "\/contact";$/m);
  assert.match(maps["redirects-308.map"], /^"\/products\/old-rebar" "\/products\/rebar-a3";$/m);
  assert.match(maps["redirects-302.map"], /^"\/en\/products\/old-beam" "\/en\/products\/ipe-180";$/m);
  assert.match(maps["redirects-302.map"], /^"\/en\/prices\/chart\/rebar-a3-12" "\/en\/products";$/m);
  assert.doesNotMatch(Object.values(maps).join(""), /gone/); // a 410 row has no static rule (404 page answers, as on the Worker)
  assert.equal(maps["redirects-301.map"], "");
  assert.equal(maps["redirects-307.map"], "");
  // Every rule of the Worker file is on nginx exactly once.
  const rules = parseRedirects(buildRedirectsFile(ROUTE_REDIRECTS, ["rebar-a3-12"]));
  const lines = Object.values(maps).join("").split("\n").filter(Boolean);
  assert.equal(lines.length, new Set(rules.map((r) => r.source)).size);
  for (const legacy of LEGACY_PERMANENT_RULES) assert.ok(rules.some((r) => `${r.source} ${r.target} ${r.code}` === legacy), legacy);
});

test("W30: redirect rendering refuses what nginx would do differently from the Worker", () => {
  assert.throws(() => renderRedirectMaps(parseRedirects("/a/* /b/:splat 308\n/a/x /c 308\n")), /after a splat/);
  assert.throws(() => renderRedirectMaps(parseRedirects("/a/:id /b/:id 308\n")), /placeholder/);
  assert.throws(() => renderRedirectMaps(parseRedirects("/a/*/b /c 308\n")), /trailing \/\* splat/);
  assert.throws(() => renderRedirectMaps(parseRedirects("/a/* /b 308\n")), /end its target in :splat/);
  assert.throws(() => parseRedirects("/a /b 200\n"), /no nginx equivalent/);
  // Duplicate sources: Cloudflare takes the top-most; so does the rendering.
  assert.equal(renderRedirectMaps(parseRedirects("/a /b 308\n/a /c 302\n"))["redirects-302.map"], "");
  // Default status is 302, as on Cloudflare.
  assert.equal(renderRedirectMaps(parseRedirects("/a /b\n"))["redirects-302.map"], '"/a" "/b";\n');
});

test("W30: _headers (production) → headers.conf = the /* security headers; per-file immutable + 5-min catalog; production noindex paths", () => {
  const origin = STATIC_TARGETS.production.rfqApiOrigin;
  const out = renderHeaderIncludes(parseHeaders(buildHeadersFile("production", origin, CHUNKS, CATALOG)));
  for (const [name, value] of buildSecurityHeaders([origin, ...rfqApiMirrorOrigins(origin)])) assert.ok(out["headers.conf"].includes(`add_header ${name} "${value}" always;\n`), name);
  assert.match(out["headers.conf"], /^add_header Content-Signal "search=yes, ai-input=yes, ai-train=yes" always;$/m);
  assert.match(out["headers.conf"], /^add_header Vary "Accept" always;$/m);
  assert.doesNotMatch(out["headers.conf"], /X-Robots-Tag|Cache-Control/);
  for (const p of [...CHUNKS, ...CATALOG]) assert.ok(out["cache-control.map"].includes(`"${p}" "${IMMUTABLE_CACHE_CONTROL}";`), p);
  assert.match(out["cache-control.map"], new RegExp(`^"/data/rfq-catalog\\.fa\\.json" "${DATA_CACHE_CONTROL}";$`, "m"));
  assert.doesNotMatch(out["cache-control.map"], /~/); // never a wildcard (W10.6: a missing chunk's 404 must not be cached a year)
  assert.deepEqual(out["robots.map"].trim().split("\n").sort(), ['"/manifest.public.json" "noindex";', '"~^/.*\\.md$" "noindex";', '"~^/data/" "noindex";'].sort());
});

test("W30: _headers (staging) → noindex, nofollow on every path, as the Worker's /* rule", () => {
  const out = renderHeaderIncludes(parseHeaders(buildHeadersFile("staging", STATIC_TARGETS.staging.rfqApiOrigin, CHUNKS, CATALOG)));
  assert.equal(out["robots.map"], '"~^/" "noindex, nofollow";\n');
  assert.match(out["headers.conf"], /connect-src 'self' https:\/\/challenges\.cloudflare\.com https:\/\/api-staging\.ahanassa\.com /);
});

test("W30: header rendering refuses rules nginx would answer differently", () => {
  assert.throws(() => renderHeaderIncludes(parseHeaders("/x/*\n  Cache-Control: public, max-age=300\n")), /wildcard/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/x\n  Cache-Control: no-store\n")), /allowed set/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/x\n  X-Frame-Options: DENY\n")), /not supported/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/*\n  Set-Cookie: a=b\n")), /not in the allowed list/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/*\n  Vary: $http_host\n")), /interpret/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/*\n  ! Vary\n")), /removal/);
  assert.throws(() => renderHeaderIncludes(parseHeaders("/*\n  X-Robots-Tag: noindex\n/data/*\n  X-Robots-Tag: noindex\n")), /joined/);
  assert.equal(headerPathKey("/data/*"), '"~^/data/"');
  assert.equal(headerPathKey("/*.md"), '"~^/.*\\.md$"');
  assert.equal(headerPathKey("/manifest.public.json"), '"/manifest.public.json"');
});

test("W30: the nearest 404 page — one prefix per non-root 404.html, deepest first; the root is the template default", () => {
  assert.equal(renderNotFoundMap(["404.html", "en/404.html", "ar/404.html", "ar/products/404.html", "en/x.html"]), ['"~^/ar/products/" "/ar/products/404.html";', '"~^/ar/" "/ar/404.html";', '"~^/en/" "/en/404.html";', ""].join("\n"));
});

test("W30: the whole rendering — every file present and inside its own grammar", () => {
  const files = renderNginxIncludes({ redirects: buildRedirectsFile(ROUTE_REDIRECTS, ["rebar-a3-12"]), headers: buildHeadersFile("production", STATIC_TARGETS.production.rfqApiOrigin, CHUNKS, CATALOG), publicPaths: PUBLIC_PATHS });
  assert.deepEqual(Object.keys(files).sort(), [...NGINX_INCLUDE_FILES].sort());
  for (const [name, text] of Object.entries(files)) assert.deepEqual(checkNginxInclude(name, text), [], name);
});

test("W30: strict include grammar — the shared cases (the Python activator runs the same file)", () => {
  const cases = JSON.parse(fs.readFileSync(new URL("../../deploy/iran/tests/grammar-cases.json", import.meta.url), "utf8")) as { accept: [string, string][]; reject: [string, string, string][] };
  for (const [file, line] of cases.accept) assert.deepEqual(checkNginxInclude(file, `${line}\n`), [], `${file}: ${line}`);
  for (const [file, line, why] of cases.reject) assert.notDeepEqual(checkNginxInclude(file, `${line}\n`), [], `${file}: ${line} (${why})`);
  assert.notDeepEqual(checkNginxInclude("headers.conf", 'add_header Vary "Accept" always;\r\n'), []);
});

test("W30: deploy/iran/nginx/snippets/ahanassa-arvan-real-ip.conf is the rendering of config/arvan-ip-ranges.ts", () => {
  const committed = fs.readFileSync(new URL("../../deploy/iran/nginx/snippets/ahanassa-arvan-real-ip.conf", import.meta.url), "utf8");
  assert.equal(committed, renderArvanRealIp());
  assert.equal(committed.match(/^set_real_ip_from /gm)?.length, 14);
});
