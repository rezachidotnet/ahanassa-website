import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkIndexingPolicy, pageUrl, parseSitemap, PRODUCTION_ROBOTS_TXT, STAGING_ROBOTS_TXT } from "./indexing-gate.ts";
import { buildHeadersFile, renderSitemapXml } from "./static-rules.ts";
import { STATIC_TARGETS } from "./targets.ts";
import { NON_INDEXABLE, PRODUCTION_ROBOTS_DISALLOW } from "../seo/indexing-policy.ts";
import { thinContentReport } from "../content-pipeline/thin-content.ts";
import { readSnapshotFile } from "./snapshot-io.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const O = "https://www.ahanassa.com";

/** A small production-shaped public-assets tree: 2 pages × 3 locales + the 404s. */
function site(env: "staging" | "production") {
  const files = new Map<string, string>();
  const paths = { "": ["index.html", "en.html", "ar.html"], "/about": ["about.html", "en/about.html", "ar/about.html"] } as const;
  const urlOf = (locale: string, p: string) => `${O}${locale === "fa" ? p : `/${locale}${p}`}`;
  const sitemap = [];
  for (const [p, [fa, en, ar]] of Object.entries(paths)) {
    const languages = { fa: urlOf("fa", p), en: urlOf("en", p), ar: urlOf("ar", p), "x-default": urlOf("fa", p) };
    const links = Object.entries(languages).map(([l, h]) => `<link rel="alternate" hrefLang="${l}" href="${h}"/>`).join("");
    for (const [locale, file] of [["fa", fa], ["en", en], ["ar", ar]] as const) {
      files.set(file, `<head><meta name="robots" content="index, follow"/><link rel="canonical" href="${urlOf(locale, p)}"/>${links}</head>`);
      sitemap.push({ url: urlOf(locale, p), lastModified: "2026-10-01T00:00:00.000Z", alternates: { languages } });
    }
  }
  for (const f of ["404.html", "en/404.html", "ar/404.html"]) files.set(f, '<meta name="robots" content="noindex, nofollow"/>');
  files.set("_headers", buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin));
  files.set("robots.txt", env === "production" ? PRODUCTION_ROBOTS_TXT : STAGING_ROBOTS_TXT);
  files.set("sitemap.xml", renderSitemapXml(sitemap));
  const check = () => checkIndexingPolicy(env, [...files.keys()], (f) => files.get(f)!);
  return { files, check };
}

test("D6 policy: robots disallows only the technical paths; every non-indexable class has a reason", () => {
  assert.deepEqual([...PRODUCTION_ROBOTS_DISALLOW], ["/api/", "/static-404", "/*?"]);
  assert.equal(PRODUCTION_ROBOTS_TXT, "User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /static-404\nDisallow: /*?\n\nSitemap: https://www.ahanassa.com/sitemap.xml\n");
  for (const n of NON_INDEXABLE) assert.ok(n.what && n.how && n.why);
  assert.equal(STAGING_ROBOTS_TXT, "User-Agent: *\nDisallow: /\n");
});

test("pageUrl maps files to public URLs and excludes the 404 pages", () => {
  assert.equal(pageUrl("index.html"), O);
  assert.equal(pageUrl("en.html"), `${O}/en`);
  assert.equal(pageUrl("ar/products/category/rebar.html"), `${O}/ar/products/category/rebar`);
  assert.equal(pageUrl("en/404.html"), null);
  assert.equal(pageUrl("data/rfq-catalog.fa.json"), null);
});

test("a policy-conformant production site passes; a staging site passes the staging rules", () => {
  assert.deepEqual(site("production").check(), []);
  assert.deepEqual(site("staging").check(), []);
});

test("staging is never indexable: robots allow-all or a missing X-Robots-Tag fails", () => {
  const a = site("staging");
  a.files.set("robots.txt", PRODUCTION_ROBOTS_TXT);
  assert.ok(a.check().some((f) => f.includes("staging robots.txt must be exactly disallow-all")));
  const b = site("staging");
  b.files.set("_headers", buildHeadersFile("production", STATIC_TARGETS.production.rfqApiOrigin));
  assert.ok(b.check().some((f) => f.includes("staging _headers /* must send X-Robots-Tag: noindex, nofollow")));
});

test("production: a noindex page, a wrong canonical or a missing hreflang fails", () => {
  const a = site("production");
  a.files.set("en/about.html", a.files.get("en/about.html")!.replace("index, follow", "noindex, follow"));
  assert.ok(a.check().some((f) => f.includes('en/about.html must be "index, follow"')));
  const b = site("production");
  b.files.set("about.html", b.files.get("about.html")!.replace(`canonical" href="${O}/about"`, `canonical" href="${O}/en/about"`));
  assert.ok(b.check().some((f) => f.includes("about.html canonical must be")));
  const c = site("production");
  c.files.set("ar.html", c.files.get("ar.html")!.replace(/<link rel="alternate"[^>]*hrefLang="x-default"[^>]*>/, ""));
  assert.ok(c.check().some((f) => f.includes("ar.html hreflang must include itself and x-default")));
  const d = site("production");
  d.files.set("404.html", "<meta name=\"robots\" content=\"index, follow\"/>");
  assert.ok(d.check().some((f) => f.includes("404.html (404) must be noindex")));
});

test("production: robots, page headers and data headers are checked", () => {
  const a = site("production");
  a.files.set("robots.txt", "User-Agent: *\nAllow: /\n");
  assert.ok(a.check().some((f) => f.includes("production robots.txt must be exactly")));
  const b = site("production");
  b.files.set("_headers", b.files.get("_headers")!.replace("/*\n", "/*\n  X-Robots-Tag: noindex\n"));
  assert.ok(b.check().some((f) => f.includes("on /* (pages must never be noindex)")));
  const c = site("production");
  c.files.set("_headers", c.files.get("_headers")!.replace("max-age=300\n  X-Robots-Tag: noindex\n", "max-age=300\n"));
  assert.ok(c.check().some((f) => f.includes("must mark /data/* X-Robots-Tag: noindex")));
});

test("production sitemap: exactly the indexable pages, with lastmod and reciprocal alternates equal to the page's", () => {
  const entries = parseSitemap(site("production").files.get("sitemap.xml")!);
  assert.equal(entries.length, 6);
  assert.ok(entries.every((e) => e.lastmod && e.alternates.size === 4));
  const missing = site("production");
  missing.files.set("sitemap.xml", renderSitemapXml(entries.slice(1).map((e) => ({ url: e.loc, lastModified: e.lastmod!, alternates: { languages: Object.fromEntries(e.alternates) } }))));
  const failures = missing.check();
  assert.ok(failures.some((f) => f.includes(`indexable page missing from sitemap: ${O}`)));
  assert.ok(failures.some((f) => f.includes("is not in the sitemap")));
  const extra = site("production");
  extra.files.set("sitemap.xml", renderSitemapXml([...entries.map((e) => ({ url: e.loc, lastModified: e.lastmod!, alternates: { languages: Object.fromEntries(e.alternates) } })), { url: `${O}/products?x=1`, lastModified: "2026-10-01T00:00:00Z", alternates: { languages: {} } }]));
  assert.ok(extra.check().some((f) => f.includes(`sitemap URL is not an indexable page: ${O}/products?x=1`)));
  const noLastmod = site("production");
  noLastmod.files.set("sitemap.xml", renderSitemapXml(entries.map((e) => ({ url: e.loc, alternates: { languages: Object.fromEntries(e.alternates) } }))));
  assert.ok(noLastmod.check().some((f) => f.includes("without a valid lastmod")));
  const wrongAlt = site("production");
  wrongAlt.files.set("sitemap.xml", renderSitemapXml(entries.map((e) => ({ url: e.loc, lastModified: e.lastmod!, alternates: { languages: { ...Object.fromEntries(e.alternates), en: `${O}/en` } } }))));
  assert.ok(wrongAlt.check().some((f) => f.includes("differ from the page's hreflang")));
});

test("renderSitemapXml declares xhtml only with alternates and escapes hrefs", () => {
  const xml = renderSitemapXml([{ url: `${O}/a`, lastModified: "2026-10-01T00:00:00Z", alternates: { languages: { en: `${O}/en/a?x=1&y=2` } } }]);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<xhtml:link rel="alternate" hreflang="en" href="https:\/\/www\.ahanassa\.com\/en\/a\?x=1&amp;y=2"\/>/);
  assert.doesNotMatch(renderSitemapXml([{ url: `${O}/a` }]), /xhtml/);
});

test("the pages use the D6 policy; staging keeps the pre-D6 values", () => {
  const pages = ["app/[locale]/page.tsx", "app/[locale]/about/page.tsx", "app/[locale]/contact/page.tsx", "app/[locale]/industries/page.tsx", "app/[locale]/markets/page.tsx", "app/[locale]/services/page.tsx", "app/[locale]/products/page.tsx", "app/[locale]/products/category/[category]/page.tsx"];
  for (const p of pages) {
    const src = fs.readFileSync(path.join(ROOT, p), "utf8");
    assert.match(src, /indexable: publicPageIndexable\(\)/, p);
    assert.doesNotMatch(src, /indexable: false/, p);
  }
  assert.match(fs.readFileSync(path.join(ROOT, "app/[locale]/products/[slug]/page.tsx"), "utf8"), /indexable: publicPageIndexable\(entry\.seo\.indexStatus === "index"\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "app/[locale]/static-404/page.tsx"), "utf8"), /robots: \{ index: false, follow: false \}/);
  assert.match(fs.readFileSync(path.join(ROOT, "app/sitemap.ts"), "utf8"), /if \(!isIndexableTarget\(\)\) return editorialSitemap\(\);/);
});

test("thin-content report (report only): fixture snapshot lists the templates without grade", () => {
  const report = thinContentReport(readSnapshotFile(path.join(ROOT, "fixtures/snapshot/staging-2026-10-01.snapshot.json")));
  assert.equal(report.publishedTemplates, 16);
  assert.ok(report.rows.every((r) => r.odooDescription === "not provided by the Odoo API"));
  const noGrade = report.rows.filter((r) => r.gradeMissing === "all").map((r) => r.templateXid);
  assert.ok(noGrade.includes("CTMPL-000002"), "IPE beam has no grade in Odoo");
  assert.ok(report.rows.some((r) => r.gradeMissing === "none"));
});
