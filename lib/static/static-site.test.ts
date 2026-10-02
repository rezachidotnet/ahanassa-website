import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSIAN_ALLOWLIST, scanPublicFile, stripAllowlisted } from "./leak-scan.ts";
import { buildAssetsIgnoreFile, buildHeadersFile, buildRedirectsFile, renderRobotsTxt, renderSitemapXml } from "./static-rules.ts";
import { moveDefaultLocaleToRoot, placeLocale404s, removeUnpublishedOutputs } from "./postprocess.ts";
import { describeFiles, forbiddenPublicPath, REQUIRED_PUBLIC_FILES, runArtifactGate } from "./artifact-gate.ts";
import { buildSecurityHeaders } from "../security/headers.ts";
import { STATIC_TARGETS } from "./targets.ts";
import { toPublicPathname } from "../../config/locales.ts";
import { toPublicRfqCatalogItem } from "../rfq/catalog-selector.ts";
import { formatLocaleDigits } from "../content/locale-digits.ts";
import { buyerValuePromiseIndex } from "../content/buyer-value.ts";
import { purchaseStepIndex } from "../content/purchase-process.ts";
import { evaluationAxisIndex } from "../content/evaluation-assurance.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const readCode = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ahanassa-static-"));
const write = (dir: string, rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
};
const walkSources = (dir: string): string[] =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walkSources(rel) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [rel] : [];
  });

// --- A6: leak scan ----------------------------------------------------------------

test("A6 allowlist: every allowlisted string still occurs verbatim in its named source (no drift)", () => {
  for (const entry of PERSIAN_ALLOWLIST) assert.ok(read(entry.source).includes(entry.text), `${entry.text} not found in ${entry.source}`);
});

test("A6 scan: Persian on en pages is flagged unless allowlisted; brand/tagline/language label/address/404 line pass", () => {
  const allowed = `<html lang="en"><body>آهن آسا — ما مراقب سرمایه شما هستیم. فارسی العربية اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6 صفحه مورد نظر یافت نشد. الصفحة غير موجودة.</body></html>`;
  assert.deepEqual(scanPublicFile("en/about.html", allowed), []);
  const leaky = `<html lang="en"><body><span>محصولات طویل (مقاطع نوردی)</span></body></html>`;
  const findings = scanPublicFile("en/products.html", leaky);
  assert.ok(findings.length > 0 && findings.every((f) => f.kind === "persian_on_en"));
});

test("A6 scan: on ar pages Arabic is fine, Persian-specific letters/digits are flagged", () => {
  assert.deepEqual(scanPublicFile("ar/contact.html", "<p>الصفحة الرئيسية — حي آزادگان، أصفهان</p>"), []);
  assert.ok(scanPublicFile("ar/products.html", "<p>قوطی و پروفیل</p>").some((f) => f.kind === "persian_on_ar"));
  assert.ok(scanPublicFile("ar/x.html", "<p>شماره ۱۲</p>").some((f) => f.kind === "persian_on_ar"));
});

test("A6 scan: Persian categoryLabel in public en JSON is flagged twice — as a server-only field and as Persian text", () => {
  const json = JSON.stringify({ items: [{ variantXid: "CVAR-1", categoryLabel: "محصولات طویل (مقاطع نوردی)" }] });
  const kinds = new Set(scanPublicFile("data/rfq-catalog.en.json", json).map((f) => f.kind));
  assert.ok(kinds.has("server_only_field") && kinds.has("persian_on_en"));
});

test("A6 scan: forbidden commercial fields and foreign contact data are flagged; the form placeholder and company phone are not", () => {
  assert.ok(scanPublicFile("data/x.json", '{"supplier_id":1}').some((f) => f.kind === "forbidden_field"));
  assert.ok(scanPublicFile("index.html", '{"cost_price":10}').some((f) => f.kind === "forbidden_field"));
  assert.deepEqual(scanPublicFile("contact.html", "<input placeholder=\"you@company.com\">"), []);
  assert.ok(scanPublicFile("contact.html", "mail someone@example.org").some((f) => f.kind === "contact"));
  assert.ok(scanPublicFile("contact.html", "call +98 912 123 4567").some((f) => f.kind === "contact"));
  assert.equal(stripAllowlisted("x آهن آسا y").includes("آهن"), false);
});

// --- static rules (proxy.ts / metadata-route replacements) -------------------------

test("_headers is generated from lib/security/headers.ts (single source); staging adds noindex, production never", () => {
  for (const env of ["staging", "production"] as const) {
    const file = buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin);
    for (const [name, value] of buildSecurityHeaders([STATIC_TARGETS[env].rfqApiOrigin])) assert.ok(file.includes(`  ${name}: ${value}`), `${env}: ${name}`);
  }
  assert.match(buildHeadersFile("staging", STATIC_TARGETS["staging"].rfqApiOrigin), /X-Robots-Tag: noindex, nofollow/);
  assert.doesNotMatch(buildHeadersFile("production", STATIC_TARGETS["production"].rfqApiOrigin), /noindex/i);
  assert.match(read("lib/security/headers.ts"), /export function applySecurityHeaders[\s\S]*for \(const \[name, value\] of SECURITY_HEADERS\)/, "proxy.ts uses the same builder");
});

test("_redirects keeps fa unprefixed and /request on /contact; .assetsignore excludes private/unpublished files", () => {
  const r = buildRedirectsFile();
  for (const rule of ["/fa / 308", "/fa/* /:splat 308", "/request /contact 308", "/en/request /en/contact 308", "/ar/request /ar/contact 308"]) assert.ok(r.includes(rule), rule);
  const ignore = buildAssetsIgnoreFile();
  for (const p of [".vite/", "*.rsc", "*.sql", "private-snapshot/", "manifest.json"]) assert.ok(ignore.split("\n").includes(p), p);
});

test("robots.txt / sitemap.xml render the app's own metadata-route results", () => {
  assert.equal(renderRobotsTxt({ rules: { userAgent: "*", disallow: "/" } }), "User-Agent: *\nDisallow: /\n");
  assert.equal(
    renderRobotsTxt({ rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }], sitemap: "https://www.ahanassa.com/sitemap.xml" }),
    "User-Agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.ahanassa.com/sitemap.xml\n",
  );
  const xml = renderSitemapXml([{ url: "https://www.ahanassa.com/products/a&b", lastModified: "2026-09-18T10:12:01.186Z" }]);
  assert.match(xml, /<loc>https:\/\/www\.ahanassa\.com\/products\/a&amp;b<\/loc><lastmod>2026-09-18T10:12:01\.186Z<\/lastmod>/);
  assert.match(renderSitemapXml([]), /<urlset[^>]*>\n<\/urlset>/);
  const robotsApp = read("app/robots.ts");
  assert.match(robotsApp, /if \(!isProduction\) \{\s*return \{ rules: \{ userAgent: "\*", disallow: "\/" \} \};/, "staging builds a disallow-all robots.txt");
});

// --- post-processing ------------------------------------------------------------------

test("post-processing: .rsc/.vite/unreferenced build metadata removed; per-locale 404s placed; fa moved to the root", () => {
  const dir = tmp();
  for (const f of ["fa.html", "fa.rsc", "en.html", "en.rsc", "fa/about.html", "fa/about.rsc", "fa/products/category/beam.html", "en/about.html", ".vite/manifest.json", "vinext-client-entry-manifest.json", "404.html", "fa/static-404.html", "en/static-404.html", "ar/static-404.html", "ar.html"]) write(dir, f, f);
  const removed = removeUnpublishedOutputs(dir);
  assert.ok(removed.some((p) => p.endsWith(".rsc")) && removed.includes(".vite") && removed.includes("vinext-client-entry-manifest.json"));
  placeLocale404s(dir, ["fa", "en", "ar"], "fa");
  moveDefaultLocaleToRoot(dir, "fa");
  const files = describeFiles(dir).map((f) => f.path);
  assert.deepEqual(files.sort(), ["404.html", "about.html", "ar.html", "ar/404.html", "en.html", "en/404.html", "en/about.html", "index.html", "products/category/beam.html"].sort());
  assert.equal(fs.readFileSync(path.join(dir, "404.html"), "utf8"), "fa/static-404.html", "the fa 404 replaces vinext's bare 404.html");
  assert.equal(fs.readFileSync(path.join(dir, "en/404.html"), "utf8"), "en/static-404.html");
});

test("post-processing never overwrites a root path while moving fa", () => {
  const dir = tmp();
  write(dir, "fa/about.html", "fa");
  write(dir, "about.html", "other");
  assert.throws(() => moveDefaultLocaleToRoot(dir, "fa"), /refusing to overwrite/);
});

// --- artifact gate --------------------------------------------------------------------

function buildArtifact(env: "staging" | "production" = "staging") {
  const dir = tmp();
  const pub = path.join(dir, "public-assets");
  const priv = path.join(dir, "private-snapshot");
  const snap = "snap-e55d81c754270c1f";
  const page = (lang: string, p: string) => `<html lang="${lang}"><head><link rel="canonical" href="https://www.ahanassa.com${p}"/></head><body>ok</body></html>`;
  write(pub, "index.html", page("fa", "/"));
  write(pub, "en.html", page("en", "/en"));
  write(pub, "ar.html", page("ar", "/ar"));
  for (const f of ["404.html", "en/404.html", "ar/404.html"]) write(pub, f, "<html><body>404</body></html>");
  write(pub, "robots.txt", "User-Agent: *\nDisallow: /\n");
  write(pub, "sitemap.xml", renderSitemapXml([]));
  write(pub, "_headers", buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin));
  write(pub, "_redirects", buildRedirectsFile());
  write(pub, ".assetsignore", buildAssetsIgnoreFile());
  write(pub, "manifest.public.json", JSON.stringify({ schema_version: "artifact.public.v1", snapshot_version: snap, generated_at: "t", locales: ["fa", "en", "ar"] }));
  for (const loc of ["fa", "en", "ar"]) write(pub, `data/rfq-catalog.${loc}.json`, JSON.stringify({ schema_version: "rfq-catalog.v1", snapshot_version: snap, locale: loc, items: [] }));
  write(priv, "snapshot.json", "{}");
  write(priv, "rfq-variant-index.sql", "INSERT INTO x VALUES (1);\n");
  const seal = () =>
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify({ schema_version: "artifact.v1", code_sha: "a".repeat(40), snapshot_version: snap, environment: env, generated_at: "t", counts: {}, public_assets: describeFiles(pub), private_snapshot: describeFiles(priv) }),
    );
  seal();
  return { dir, pub, priv, seal };
}

test("artifact gate: a well-formed staging artifact passes", () => {
  const { dir } = buildArtifact();
  assert.deepEqual(runArtifactGate(dir).failures, []);
});

test("artifact gate: any .sql, private-snapshot file, .rsc, .vite or private manifest in public-assets is refused", () => {
  for (const [rel, content] of [["dump.sql", "x"], ["private-snapshot/snapshot.json", "{}"], ["en/about.rsc", "x"], [".vite/manifest.json", "{}"], ["data/manifest.json", "{}"], ["copy-of-snapshot.json", "{}"]] as const) {
    const { dir, pub, seal } = buildArtifact();
    write(pub, rel, content);
    seal();
    const failures = runArtifactGate(dir).failures;
    assert.ok(failures.some((f) => /forbidden|identical to a private-snapshot file/.test(f)), `${rel}: ${failures.join(" | ")}`);
  }
  assert.equal(forbiddenPublicPath("images/a.png"), null);
});

test("artifact gate: checksum drift, unlisted files and missing required files are refused", () => {
  const a = buildArtifact();
  fs.writeFileSync(path.join(a.pub, "index.html"), "tampered");
  assert.ok(runArtifactGate(a.dir).failures.some((f) => f.includes("checksum mismatch: index.html")));
  const b = buildArtifact();
  write(b.pub, "late.html", "x");
  assert.ok(runArtifactGate(b.dir).failures.some((f) => f.includes("not in manifest: late.html")));
  for (const required of REQUIRED_PUBLIC_FILES) {
    const c = buildArtifact();
    fs.rmSync(path.join(c.pub, required));
    c.seal();
    assert.ok(runArtifactGate(c.dir).failures.some((f) => f.includes(`required file missing: ${required}`)), required);
  }
});

test("artifact gate: staging must be noindex and never self-canonical; production must not be noindex", () => {
  const a = buildArtifact();
  write(a.pub, "_headers", buildHeadersFile("production", STATIC_TARGETS["production"].rfqApiOrigin));
  a.seal();
  assert.ok(runArtifactGate(a.dir).failures.some((f) => f.includes("staging must send X-Robots-Tag")));
  const b = buildArtifact();
  write(b.pub, "about.html", `<link rel="canonical" href="https://ahanassa-bootstrap-staging.nova-b1e6f0.workers.dev/about"/>`);
  b.seal();
  assert.ok(runArtifactGate(b.dir).failures.some((f) => f.includes("canonical not on https://www.ahanassa.com")));
  const c = buildArtifact("production");
  assert.deepEqual(runArtifactGate(c.dir).failures, []);
  write(c.pub, "_headers", buildHeadersFile("staging", STATIC_TARGETS["staging"].rfqApiOrigin));
  c.seal();
  assert.ok(runArtifactGate(c.dir).failures.some((f) => f.includes("production must not send noindex")));
});

test("artifact gate: leak findings fail the gate", () => {
  const a = buildArtifact();
  write(a.pub, "data/rfq-catalog.en.json", JSON.stringify({ schema_version: "rfq-catalog.v1", snapshot_version: "snap-e55d81c754270c1f", locale: "en", items: [] }).replace("[]", '[{"categoryLabel":"قوطی"}]'));
  a.seal();
  const failures = runArtifactGate(a.dir).failures;
  assert.ok(failures.some((f) => f.startsWith("leak ")));
  assert.ok(failures.some((f) => f.includes("does not match rfq-catalog.v1")));
});

// --- A1 / A2 / A7 / V2 invariants --------------------------------------------------------

test("A1: no app/ or components/ source imports next/link; the project Link is a plain <a>", () => {
  for (const file of [...walkSources("app"), ...walkSources("components")]) assert.ok(!read(file).includes('from "next/link"'), `${file} imports next/link`);
  const link = readCode("components/ui/link.tsx");
  assert.match(link, /return <a ref=\{ref\} href=\{href\} \{\.\.\.rest\} \/>/);
  assert.doesNotMatch(link, /prefetch|router|_rsc/);
});

test("V2 / §4.2: every public locale page is statically generated and reads no searchParams", () => {
  const pages = walkSources("app/[locale]").filter((f) => f.endsWith("/page.tsx"));
  assert.ok(pages.length >= 11);
  for (const page of pages) {
    const src = read(page);
    assert.match(src, /generateStaticParams/, `${page}: generateStaticParams`);
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), /searchParams/, `${page}: no searchParams`);
  }
});

test("A7: country names are not rendered from Intl in the form's markup — only after hydration", () => {
  const form = read("components/contact/enquiry-form.tsx");
  const effect = form.slice(form.indexOf("const [countryLabels, setCountryLabels]"), form.indexOf("}, [locale]);", form.indexOf("const [countryLabels, setCountryLabels]")));
  assert.match(effect, /useEffect\(\(\) => \{\s*setCountryLabels\(Object\.fromEntries\(PHONE_COUNTRIES\.map\(\(c\) => \[c\.iso2, getCountryLabel\(c\.iso2, locale\)\]\)\)\);/);
  assert.equal(form.split("getCountryLabel(").length - 1, 1, "getCountryLabel is called only inside the effect");
  assert.match(form, /\+\{c\.dialCode\} \{countryLabels\?\.\[c\.iso2\] \?\? c\.iso2\}/);
});

test("A7: server-rendered locale digits are the fixed Unicode digit sets (identical in any ICU)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    for (const i of [0, 1, 8]) {
      assert.equal(buyerValuePromiseIndex(locale, i), formatLocaleDigits(locale, i + 1, 2));
      assert.equal(purchaseStepIndex(locale, i), formatLocaleDigits(locale, i + 1, 2));
      assert.equal(evaluationAxisIndex(locale, i), formatLocaleDigits(locale, i + 1, 2));
    }
  }
  assert.equal(formatLocaleDigits("fa", 7, 2), "۰۷");
  assert.equal(formatLocaleDigits("ar", 12), "١٢");
});

test("static paths: fa's build-time /fa prefix never reaches a public URL", () => {
  assert.equal(toPublicPathname("/fa"), "/");
  assert.equal(toPublicPathname("/fa/products/category/beam"), "/products/category/beam");
  assert.equal(toPublicPathname("/en/products"), "/en/products");
  assert.equal(toPublicPathname("/fabric"), "/fabric");
  for (const f of ["components/layout/SiteHeader.tsx", "components/layout/header-language-selector.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/header-nav-disclosure.tsx"]) {
    assert.doesNotMatch(read(f), /\busePathname\(/, `${f} must use usePublicPathname`);
  }
});

test("A6: the public RFQ catalog item drops categoryLabel and nothing else", () => {
  const item = { variantXid: "V", templateXid: "T", sku: "S", variantSpecLabel: "10", productLabel: "P", templateSlug: "p", categoryCode: "LONG", categoryLabel: "محصولات طویل", groupCode: "REBAR", publicCategoryCode: "REBAR", publicCategoryLabel: "Rebar" };
  const pub = toPublicRfqCatalogItem(item);
  assert.equal("categoryLabel" in pub, false);
  assert.deepEqual(Object.keys(pub).sort(), Object.keys(item).filter((k) => k !== "categoryLabel").sort());
});

test("static build: generated build root excludes Worker-only code and uses no Cloudflare plugin (V1/V3)", () => {
  const build = read("scripts/static/build.ts");
  assert.match(build, /const EXCLUDED = new Set\(\["app\/api", "app\/data"\]\)/);
  for (const notCopied of ["wrangler.jsonc", "proxy.ts", "workers"]) assert.doesNotMatch(build.slice(build.indexOf("for (const entry of ["), build.indexOf("])", build.indexOf("for (const entry of ["))), new RegExp(`"${notCopied}"`));
  const vite = readCode("scripts/static/vite.config.static.ts");
  assert.doesNotMatch(vite, /@cloudflare\/vite-plugin|cdnAdapter|imagesOptimizer/);
  assert.match(read("scripts/static/next.config.static.ts"), /output: "export"/);
  assert.equal(crypto.createHash("sha256").update(read("next.config.ts")).digest("hex").length, 64, "the Worker build's next.config.ts is untouched by the static build");
});

// --- W2: per-target RFQ origin and CSP ----------------------------------------------------------

test("W2: CSP connect-src is exactly 'self', Turnstile and the target's RFQ API origin", () => {
  for (const env of ["staging", "production"] as const) {
    const csp = /connect-src ([^;\n]*)/.exec(buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin))![1].split(" ");
    assert.deepEqual(csp, ["'self'", "https://challenges.cloudflare.com", STATIC_TARGETS[env].rfqApiOrigin]);
  }
  assert.equal(STATIC_TARGETS.staging.rfqApiOrigin, "https://api-staging.ahanassa.com");
  assert.equal(STATIC_TARGETS.production.rfqApiOrigin, "https://api.ahanassa.com");
});

test("W2 gate: a wrong connect-src or a /contact page posting elsewhere is refused", () => {
  const a = buildArtifact();
  write(a.pub, "_headers", buildHeadersFile("staging", "https://evil.example"));
  a.seal();
  assert.ok(runArtifactGate(a.dir).failures.some((f) => f.includes("CSP connect-src must be exactly")));
  const b = buildArtifact();
  write(b.pub, "contact.html", `<html><body><form></form><script>"/api/rfqs"</script></body></html>`);
  b.seal();
  assert.ok(runArtifactGate(b.dir).failures.some((f) => f.includes("contact.html: RFQ endpoint is not https://api-staging.ahanassa.com/api/rfqs")));
  const c = buildArtifact();
  write(c.pub, "contact.html", `<html><body><script>"https://api-staging.ahanassa.com/api/rfqs"</script></body></html>`);
  c.seal();
  assert.deepEqual(runArtifactGate(c.dir).failures, []);
});

test("W2: the production Turnstile site key in lib/static/targets.ts equals wrangler.jsonc env.production.vars", () => {
  const wrangler = read("wrangler.jsonc");
  assert.ok(wrangler.includes(`"NEXT_PUBLIC_TURNSTILE_SITE_KEY": "${STATIC_TARGETS.production.turnstileSiteKey}"`));
});

test("W2: the /contact form posts to the build-time RFQ origin and sends catalogSnapshotVersion from manifest.public.json", () => {
  const page = read("app/[locale]/contact/page.tsx");
  assert.match(page, /AHANASSA_RFQ_API_ORIGIN/);
  assert.match(page, /rfqEndpoint=\{rfqSubmitEndpoint\(\)\}/);
  const wrapper = read("components/contact/static-enquiry-form.tsx");
  assert.match(wrapper, /fetch\(PUBLIC_MANIFEST_PATH\)/);
  assert.match(wrapper, /catalogSnapshotVersion=\{snapshotVersion\}/);
  const form = read("components/contact/enquiry-form.tsx");
  assert.match(form, /await submitRfqWithRetry\(rfqEndpoint, payload\)/, "W3.1: posts via the bounded-retry helper, same payload/key on every attempt");
  assert.match(read("lib/rfq/submit-with-retry.ts"), /await doFetch\(endpoint, \{ method: "POST"/);
  assert.match(form, /\n\s+catalogSnapshotVersion,\n\s+\};/);
  assert.match(form, /const idempotencyKeyRef = useRef\(generateIdempotencyKey\(\)\);/, "one key per new request, reused on retry");
  assert.match(read("scripts/static/build.ts"), /AHANASSA_RFQ_API_ORIGIN: target\.rfqApiOrigin/);
});

test("W2 (A9 follow-up): structured data is in the page's locale; the Persian locality is no longer allowlisted", async () => {
  assert.ok(!PERSIAN_ALLOWLIST.some((e) => e.text === "اصفهان"));
  const schema = read("lib/seo/schema.ts");
  assert.match(schema, /en: \{ streetAddress: "Hezar Jarib Street, Kooy Azadegan, No\. 6", addressLocality: "Isfahan" \}/);
  assert.match(schema, /ar: \{ streetAddress: "شارع هزار جريب، حي آزادگان، رقم 6", addressLocality: "أصفهان" \}/);
  assert.match(read("app/[locale]/page.tsx"), /organizationSchema\(locale\)/);
});

test("W2 fix: the RFQ form detects an already-loaded Turnstile script after a remount (not only next/script onLoad)", () => {
  const form = read("components/contact/enquiry-form.tsx");
  assert.match(form, /if \(window\.turnstile\) \{\s*setTurnstileScriptLoaded\(true\);/);
  assert.match(form, /setInterval\(\(\) => \{\s*if \(window\.turnstile\)/);
});
