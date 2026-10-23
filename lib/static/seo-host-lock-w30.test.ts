import test from "node:test";
import assert from "node:assert/strict";
import { checkPageSeoHosts, checkRobotsSeoHosts, checkSeoHostLock, checkSitemapSeoHosts, SEO_HOST_LOCK_ORIGIN } from "./seo-host-lock.ts";
import { PRODUCTION_ORIGIN } from "./indexing-gate.ts";
import { getAppBaseUrl } from "../env.ts";
import { CANONICAL_SITE_HOST } from "../mirror/iran-mirror.ts";
import { renderRobotsTxt, renderSitemapXml } from "./static-rules.ts";

/**
 * W30 hard rule (owner 2026-10-22): canonical, hreflang, og:url, JSON-LD and sitemaps stay exactly www.ahanassa.com on
 * BOTH hosts (.com and the domestic .ir copy). The SEO split (W29 P3) is out of scope.
 */
const page = (head: string) => `<!DOCTYPE html><html lang="fa"><head>${head}</head><body></body></html>`;
const GOOD = page(
  [
    '<link rel="canonical" href="https://www.ahanassa.com/prices"/>',
    '<link rel="alternate" hreflang="fa-IR" href="https://www.ahanassa.com/prices"/>',
    '<link rel="alternate" hreflang="ar" href="https://www.ahanassa.com/ar/prices"/>',
    '<link rel="alternate" hreflang="x-default" href="https://www.ahanassa.com/prices"/>',
    '<link rel="alternate" type="text/markdown" href="/prices.md"/>',
    '<meta property="og:url" content="https://www.ahanassa.com/prices"/>',
    '<script type="application/ld+json">{"@id":"https://www.ahanassa.com/#organization","url":"https://www.ahanassa.com","email":"sales@ahanassa.com","sameAs":["https://instagram.com/x"]}</script>',
  ].join(""),
);

test("W30: the lock is www.ahanassa.com — the same origin as canonical URLs, the indexing gate and the mirror's canonical host", () => {
  assert.equal(SEO_HOST_LOCK_ORIGIN, "https://www.ahanassa.com");
  // The static build deletes APP_BASE_URL (scripts/static/build.ts), so pages use the default origin.
  const saved = process.env.APP_BASE_URL;
  delete process.env.APP_BASE_URL;
  assert.equal(getAppBaseUrl(), SEO_HOST_LOCK_ORIGIN);
  if (saved !== undefined) process.env.APP_BASE_URL = saved;
  assert.equal(PRODUCTION_ORIGIN, SEO_HOST_LOCK_ORIGIN);
  assert.equal(`https://${CANONICAL_SITE_HOST}`, SEO_HOST_LOCK_ORIGIN);
});

test("W30: a page whose canonical, hreflang, og:url and JSON-LD name www.ahanassa.com passes", () => {
  assert.deepEqual(checkPageSeoHosts("prices.html", GOOD), []);
});

test("W30: a canonical or hreflang host change fails — to the .ir copy, the apex, http or any other host", () => {
  for (const bad of ["https://www.ahanassa.ir/prices", "https://new.ahanassa.ir/prices", "https://ahanassa.com/prices", "http://www.ahanassa.com/prices", "https://www.ahanassa.com.evil.example/prices", "/prices"]) {
    const canonical = GOOD.replace('rel="canonical" href="https://www.ahanassa.com/prices"', `rel="canonical" href="${bad}"`);
    assert.match(checkPageSeoHosts("prices.html", canonical).join("\n"), /canonical not on https:\/\/www\.ahanassa\.com/, bad);
    const hreflang = GOOD.replace('hreflang="ar" href="https://www.ahanassa.com/ar/prices"', `hreflang="ar" href="${bad.replace("/prices", "/ar/prices")}"`);
    assert.match(checkPageSeoHosts("prices.html", hreflang).join("\n"), /hreflang ar not on/, bad);
  }
  // Attribute order does not hide it.
  assert.equal(checkPageSeoHosts("x.html", page('<link href="https://www.ahanassa.ir/" rel="canonical"/>')).length, 1);
});

test("W30: og:url and JSON-LD site URLs on another host fail; e-mail addresses and other sites do not", () => {
  assert.match(checkPageSeoHosts("x.html", GOOD.replace('content="https://www.ahanassa.com/prices"', 'content="https://www.ahanassa.ir/prices"')).join(), /og:url/);
  assert.match(checkPageSeoHosts("x.html", GOOD.replace('"url":"https://www.ahanassa.com"', '"url":"https://www.ahanassa.ir"')).join(), /JSON-LD URL not on/);
  assert.match(checkPageSeoHosts("x.html", GOOD.replace('"url":"https://www.ahanassa.com"', '"url":"https:\\u002F\\u002Fnew.ahanassa.ir\\u002F"')).join(), /JSON-LD URL not on/);
  assert.deepEqual(checkPageSeoHosts("x.html", GOOD.replace("sales@ahanassa.com", "sales@ahanassa.ir")), []);
});

test("W30: sitemap <loc>/alternates and the robots.txt Sitemap line are locked too", () => {
  const good = renderSitemapXml([{ url: "https://www.ahanassa.com/", alternates: { languages: { "fa-IR": "https://www.ahanassa.com/", en: "https://www.ahanassa.com/en" } } }]);
  assert.deepEqual(checkSitemapSeoHosts(good), []);
  assert.equal(checkSitemapSeoHosts(good.replace("<loc>https://www.ahanassa.com/", "<loc>https://www.ahanassa.ir/")).length, 1);
  assert.equal(checkSitemapSeoHosts(good.replace('href="https://www.ahanassa.com/en"', 'href="https://www.ahanassa.ir/en"')).length, 1);
  const robots = renderRobotsTxt({ rules: { userAgent: "*", allow: "/" }, sitemap: "https://www.ahanassa.com/sitemap.xml" });
  assert.deepEqual(checkRobotsSeoHosts(robots), []);
  assert.equal(checkRobotsSeoHosts(robots.replace("www.ahanassa.com", "www.ahanassa.ir")).length, 1);
});

test("W30: the tree check covers every .html page plus sitemap.xml and robots.txt", () => {
  const files: Record<string, string> = { "index.html": GOOD, "en/about.html": GOOD.replace('rel="canonical" href="https://www.ahanassa.com/prices"', 'rel="canonical" href="https://www.ahanassa.ir/en/about"'), "sitemap.xml": renderSitemapXml([{ url: "https://www.ahanassa.com/" }]), "robots.txt": "Sitemap: https://new.ahanassa.ir/sitemap.xml\n" };
  const failures = checkSeoHostLock(Object.keys(files), (p) => files[p]);
  assert.equal(failures.length, 2);
  assert.ok(failures.some((f) => f.startsWith("en/about.html: canonical")));
  assert.ok(failures.some((f) => f.startsWith("robots.txt:")));
});
