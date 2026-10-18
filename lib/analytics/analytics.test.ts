import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ANALYTICS_EVENTS, articleCtaLocation, basketAddSource, buildEvent, calculatorEntry, clickEventFor, familyFromPath, funnelPage, isRfqHref, rfqCtaLocation, sameOriginReferrerPath, trackEvent } from "./events.ts";
import { gtmScriptUrl, shouldLoadGtm, startGtm } from "./gtm.ts";
import { buildCspReportOnly } from "../security/headers.ts";
import { GA4_MEASUREMENT_ID, GA4_MEASUREMENT_ID_PATTERN, GTM_CONTAINER_ID, gtmContainerId } from "../../config/analytics.ts";

test("events: the seven D-SEO events + the D-ARTICLE-METRICS article and product-funnel events + the W18.2 chart events + the W20.3 expert-section events, each with a fixed parameter allowlist", () => {
  assert.deepEqual(Object.keys(ANALYTICS_EVENTS).sort(), ["article_cta_click", "article_read", "basket_add", "calculator_open", "calculator_use", "chart_range_change", "chart_to_rfq", "chart_view", "download_file", "download_filter", "download_to_rfq", "download_zip", "expert_call_click", "expert_chat_click", "expert_rfq_click", "expert_whatsapp_click", "file_upload", "gauge_view", "indicator_page_view", "phone_click", "price_page_view", "product_view", "rfq_cta_click", "rfq_submit", "whatsapp_click"]);
  assert.deepEqual(ANALYTICS_EVENTS.basket_add, ["basket_size", "product_family", "product_slug", "add_source"]);
  assert.deepEqual(ANALYTICS_EVENTS.product_view, ["product_family", "product_slug"]);
  assert.deepEqual(ANALYTICS_EVENTS.rfq_cta_click, ["cta_location", "product_family"]);
  assert.deepEqual(ANALYTICS_EVENTS.calculator_open, ["calculator_entry"]);
  assert.deepEqual(ANALYTICS_EVENTS.article_read, ["article_slug", "article_lang"]);
  assert.deepEqual(ANALYTICS_EVENTS.article_cta_click, ["article_slug", "article_lang", "cta_location"]);
  assert.deepEqual(ANALYTICS_EVENTS.rfq_submit, ["rfq_tracking_number"], "rfq_submit carries the tracking number only");
});

test("buildEvent: unknown keys are dropped; values that could be personal data never pass", () => {
  assert.deepEqual(buildEvent("rfq_submit", { rfq_tracking_number: "AA-RFQ-20261013-0042" }), { event: "rfq_submit", rfq_tracking_number: "AA-RFQ-20261013-0042" });
  const leaky = { rfq_tracking_number: "AA-1", email: "a@b.co", phone: "09121234567", name: "Ali" } as Record<string, string>;
  assert.deepEqual(buildEvent("rfq_submit", leaky), { event: "rfq_submit", rfq_tracking_number: "AA-1" });
  for (const bad of ["a@b.co", "+989121234567", "Ali Rezaei", "x".repeat(65), "<script>", ""]) assert.deepEqual(buildEvent("rfq_submit", { rfq_tracking_number: bad }), { event: "rfq_submit" }, bad);
  assert.deepEqual(buildEvent("file_upload", { file_count: 2, file_type: "pdf" }), { event: "file_upload", file_count: 2, file_type: "pdf" });
  assert.deepEqual(buildEvent("file_upload", { file_count: Number.NaN, file_type: "invoice of mr x.pdf" }), { event: "file_upload" });
  assert.deepEqual(buildEvent("calculator_use", { calculator_product_group: "REBAR", calculator_mode: "pieces" }), { event: "calculator_use", calculator_product_group: "REBAR", calculator_mode: "pieces" });
});

test("trackEvent: pushes to window.dataLayer, creating it; a no-op without window", () => {
  trackEvent("phone_click", { link_location: "header" }); // no window in node: must not throw
  const g = globalThis as { window?: { dataLayer?: unknown[] } };
  g.window = {};
  try {
    trackEvent("phone_click", { link_location: "header" });
    trackEvent("price_page_view", { price_date: "2026-10-13" });
    assert.deepEqual(g.window.dataLayer, [{ event: "phone_click", link_location: "header" }, { event: "price_page_view", price_date: "2026-10-13" }]);
  } finally {
    delete g.window;
  }
});

test("clickEventFor: tel: and WhatsApp links only", () => {
  assert.equal(clickEventFor("tel:+983135134"), "phone_click");
  assert.equal(clickEventFor("https://wa.me/989121234567?text=x"), "whatsapp_click");
  assert.equal(clickEventFor("https://api.whatsapp.com/send?phone=1"), "whatsapp_click");
  assert.equal(clickEventFor("/contact"), null);
  assert.equal(clickEventFor("https://evil.example/wa.me/1"), null);
});

test("GTM: loads on the production hostname, or anywhere with ?gtm_debug=; never with a missing/malformed ID", () => {
  assert.equal(shouldLoadGtm("www.ahanassa.com", ""), true);
  assert.equal(shouldLoadGtm("staging.ahanassa.com", ""), false);
  assert.equal(shouldLoadGtm("127.0.0.1", "?gtm_debug=x&a=1"), true);
  assert.equal(gtmContainerId("GTM-ABC123"), "GTM-ABC123");
  for (const bad of ["", "GTM-", "gtm-abc123", "G-ABC123", "GTM-ABC123\"><script>", null]) assert.equal(gtmContainerId(bad), null, String(bad));
  assert.equal(gtmScriptUrl("GTM-ABC123"), "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123");

  const appended: { async: boolean; src: string }[] = [];
  const fakeWindow = (hostname: string) =>
    ({ location: { hostname, search: "" }, document: { createElement: () => ({ async: false, src: "" }), head: { appendChild: (s: { async: boolean; src: string }) => appended.push(s) } } }) as unknown as Window & { dataLayer?: unknown[] };
  const prod = fakeWindow("www.ahanassa.com");
  assert.equal(startGtm(prod, "GTM-ABC123"), true);
  assert.equal(startGtm(prod, "GTM-ABC123"), false, "once per page");
  assert.equal(appended.length, 1);
  assert.deepEqual({ async: appended[0].async, src: appended[0].src }, { async: true, src: "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123" });
  assert.equal((prod.dataLayer![0] as { event: string }).event, "gtm.js");
  assert.equal(startGtm(fakeWindow("staging.ahanassa.com"), "GTM-ABC123"), false);
  assert.equal(startGtm(fakeWindow("www.ahanassa.com"), null), false);
});

test("config: the owner-supplied IDs (2026-10-13), well-formed", () => {
  assert.equal(GTM_CONTAINER_ID, "GTM-TFN25VZQ");
  assert.equal(gtmContainerId(GTM_CONTAINER_ID), GTM_CONTAINER_ID);
  assert.equal(GA4_MEASUREMENT_ID, "G-C8MZB6DXPZ");
  assert.ok(GA4_MEASUREMENT_ID_PATTERN.test(GA4_MEASUREMENT_ID));
});

test("GA4 loads only through GTM: no gtag.js and no G- measurement ID in any site source", () => {
  const files: string[] = [];
  const walk = (dir: URL) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = new URL(`${e.name}${e.isDirectory() ? "/" : ""}`, dir);
      if (e.isDirectory()) walk(child);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(child.pathname);
    }
  };
  for (const dir of ["app/", "components/", "lib/"]) walk(new URL(`../../${dir}`, import.meta.url));
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(code, /gtag\/js|gtag\(|G-C8MZB6DXPZ|GA4_MEASUREMENT_ID/, `${file}: GA4 must be configured inside GTM only (double counting)`);
  }
});

test("wiring: rfq_submit sends the tracking number only; the layout mounts the runtime once", () => {
  const form = fs.readFileSync(new URL("../../components/contact/enquiry-form.tsx", import.meta.url), "utf8");
  const calls = [...form.matchAll(/trackEvent\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(calls, ['"file_upload", { file_count: next.length, file_type: verdict.ext }', '"rfq_submit", { rfq_tracking_number: body.reference }']);
  // file_type is the attachment policy's allowlisted extension (checkFileBytes), never derived from the file name.
  assert.match(form, /const verdict = checkFileBytes\(/);
  const staticForm = fs.readFileSync(new URL("../../components/contact/static-enquiry-form.tsx", import.meta.url), "utf8");
  const basketCall = /if \(result\.outcome === "added"\)\s*trackEvent\("basket_add", \{([^}]*)\}\);/.exec(staticForm);
  assert.ok(basketCall, "only a real add counts (not a duplicate or a full list)");
  assert.equal(staticForm.match(/trackEvent\(/g)?.length, 1);
  // The keys and their only sources: the resolved catalog item (never a raw URL value) and the same-origin referrer path.
  assert.deepEqual(basketCall[1].split("\n").map((l) => l.trim()).filter(Boolean), [
    "basket_size: rows.filter((r) => !isRfqRowEmpty(r.fields)).length,",
    "product_family: preselection.publicCategoryCode ?? undefined,",
    "product_slug: preselection.templateSlug,",
    "add_source: basketAddSource(sameOriginReferrerPath(document.referrer, window.location.origin)) ?? undefined,",
  ]);
  const layout = fs.readFileSync(new URL("../../app/[locale]/layout.tsx", import.meta.url), "utf8");
  assert.equal(layout.match(/<AnalyticsRuntime /g)?.length, 1);
});

test("CSP allows GTM and GA4 (script, image beacon, fetch/sendBeacon), so an enforced policy keeps analytics", () => {
  const csp = Object.fromEntries(buildCspReportOnly(["https://api.ahanassa.com"]).split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.ok(csp["script-src"].includes("https://*.googletagmanager.com"));
  for (const origin of ["https://*.google-analytics.com", "https://*.googletagmanager.com"]) assert.ok(csp["img-src"].includes(origin), origin);
  for (const origin of ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"]) assert.ok(csp["connect-src"].includes(origin), origin);
  assert.ok(!csp["script-src"].includes("'unsafe-inline'") && !csp["script-src"].includes("'unsafe-eval'"));
});

test("article events (D-ARTICLE-METRICS): the slug passes, a title never does", () => {
  assert.deepEqual(buildEvent("article_read", { article_slug: "rebar-weight-table", article_lang: "fa" }), { event: "article_read", article_slug: "rebar-weight-table", article_lang: "fa" });
  assert.deepEqual(buildEvent("article_cta_click", { article_slug: "rebar-weight-table", article_lang: "en", cta_location: "product_card" }), { event: "article_cta_click", article_slug: "rebar-weight-table", article_lang: "en", cta_location: "product_card" });
  for (const title of ["جدول وزن میلگرد", "Rebar weight table", "x".repeat(65)]) assert.deepEqual(buildEvent("article_read", { article_slug: title, article_lang: "fa" }), { event: "article_read", article_lang: "fa" }, title);
  const leaky = { article_slug: "a-b", article_lang: "fa", article_title: "x" } as Record<string, string>;
  assert.deepEqual(buildEvent("article_read", leaky), { event: "article_read", article_slug: "a-b", article_lang: "fa" });
});

test("isRfqHref: /contact and /request in every locale, with a query or fragment; nothing else", () => {
  for (const href of ["/contact", "/en/contact", "/ar/contact/", "/contact?product=REBAR#form", "/request", "/en/request", "https://www.ahanassa.com/contact", "https://ahanassa.com/ar/contact"]) assert.equal(isRfqHref(href), true, href);
  for (const href of ["/contacts", "/products/rebar", "/articles/contact", "/en/contact-us", "https://evil.example/contact", "tel:+983135134", "#contact", ""]) assert.equal(isRfqHref(href), false, href);
});

test("articleCtaLocation: the nearest data-article-cta mark; an unmarked or unknown mark is inline", () => {
  const link = (mark: string | null) => ({ closest: () => (mark === null ? null : { getAttribute: () => mark }) }) as unknown as Element;
  assert.equal(articleCtaLocation(link("bottom")), "bottom");
  assert.equal(articleCtaLocation(link("product_card")), "product_card");
  assert.equal(articleCtaLocation(link(null)), "inline");
  assert.equal(articleCtaLocation(link("sidebar")), "inline");
});

test("wiring: the article page marks its RFQ CTAs and mounts the 75% sentinel inside the body wrapper", () => {
  const page = fs.readFileSync(new URL("../../app/[locale]/articles/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<div className="relative mt-10">\s*<ArticleBody blocks=\{a\.body\.blocks\} \/>\s*<ArticleAnalytics slug=\{a\.slug\} lang=\{locale\} \/>\s*<\/div>/, "the sentinel is positioned against the body only");
  assert.equal(page.match(/<ArticleAnalytics /g)?.length, 1);
  assert.match(page, /<div data-article-cta="bottom" className=\{cardVariants/, "the RFQ box is the bottom CTA");
  assert.match(page, /<ButtonLink href=\{localizedPath\(locale, "\/contact"\)\}[^>]*data-article-cta="product_card">/, "the RFQ button under the product cards");
  assert.equal(page.match(/data-article-cta=/g)?.length, 2, "body links stay unmarked (inline)");
  const component = fs.readFileSync(new URL("../../components/analytics/article-analytics.tsx", import.meta.url), "utf8");
  assert.match(component, /new IntersectionObserver\(/);
  // A jump past the sentinel (End key, contents link) never shows it on screen: the root reaches far above the viewport.
  assert.match(component, /const REACHED_MARGIN = "1000000px 0px 0px 0px";/);
  assert.match(component, /\{ rootMargin: REACHED_MARGIN \}/);
  assert.doesNotMatch(component, /"scroll"|onscroll|scrollY|pageYOffset/i, "no scroll listeners");
  assert.match(component, /top-3\/4/, "the sentinel sits at 75% of the body");
  assert.match(component, /export function ArticleAnalytics\(\{ slug, lang \}: \{ slug: string; lang: string \}\)/, "slug and language only: the title never reaches the component");
});

test("funnelPage: home, product, category (listing), price, calculator and (W20.8) downloads pages in every locale; nothing else", () => {
  const cases: [string, string | null][] = [
    ["/", "home"], ["/en", "home"], ["/ar/", "home"], ["/index.html", "home"], ["/fa", "home"],
    ["/products/rebar-aj340", "product"], ["/en/products/ipe-beam.html", "product"],
    ["/products", "category"], ["/products/category/box-section", "category"], ["/ar/products/category/rebar/", "category"],
    ["/prices", "price"], ["/prices/rebar", "price"], ["/ar/prices", "price"],
    ["/tools/weight-calculator", "calculator"], ["/en/tools/weight-calculator.html", "calculator"],
    ["/downloads", "downloads"], ["/ar/downloads.html", "downloads"], ["/downloads/drawings/ipe-200.dxf", null],
    ["/contact", null], ["/articles/rebar-weight-table", null], ["/about", null], ["/products/a/b", null], ["/english", null],
  ];
  for (const [path, page] of cases) assert.equal(funnelPage(path), page, path);
});

test("referrer: the same-origin path only; basket add_source and calculator_entry from it", () => {
  const origin = "https://www.ahanassa.com";
  assert.equal(sameOriginReferrerPath("https://www.ahanassa.com/products/rebar-aj340?variant=CVAR-1#x", origin), "/products/rebar-aj340");
  for (const ref of ["", "https://www.google.com/search?q=x", "https://staging.ahanassa.com/products/x", "not a url"]) assert.equal(sameOriginReferrerPath(ref, origin), null, ref);
  assert.equal(basketAddSource("/products/rebar-aj340"), "product");
  assert.equal(basketAddSource("/ar/prices/rebar"), "price");
  assert.equal(basketAddSource("/en/tools/weight-calculator"), "calculator");
  for (const p of [null, "/", "/contact", "/products/category/rebar", "/articles/x"]) assert.equal(basketAddSource(p), null, String(p));
  assert.equal(calculatorEntry("/"), "home_cta");
  assert.equal(calculatorEntry("/en"), "home_cta");
  assert.equal(calculatorEntry("/products/category/rebar"), "category");
  assert.equal(calculatorEntry("/products/rebar-aj340"), "product");
  assert.equal(calculatorEntry("/prices"), "price");
  for (const p of [null, "/about", "/tools/weight-calculator", "/articles/x"]) assert.equal(calculatorEntry(p), "direct", String(p));
});

test("familyFromPath: the category listing and price hub URLs name a family code; other URLs do not", () => {
  assert.equal(familyFromPath("/products/category/box-section"), "BOX_SECTION");
  assert.equal(familyFromPath("/ar/prices/rebar"), "REBAR");
  assert.equal(familyFromPath("/en/products/category/sheet-plate.html"), "SHEET_PLATE");
  for (const p of ["/prices", "/products", "/products/rebar-aj340", "/contact", "/prices/rebar/x"]) assert.equal(familyFromPath(p), null, p);
});

test("rfqCtaLocation: header and mobile menu → header; in <main> the page kind; footer or other pages → null", () => {
  const link = (landmark: string | null) => ({ closest: (sel: string) => (landmark && sel.includes(landmark) ? {} : null) }) as unknown as Element;
  assert.equal(rfqCtaLocation(link("header"), "/products/rebar-aj340"), "header");
  assert.equal(rfqCtaLocation(link('[role="dialog"]'), "/"), "header");
  assert.equal(rfqCtaLocation(link("main"), "/"), "home");
  assert.equal(rfqCtaLocation(link("main"), "/en/products/rebar-aj340"), "product");
  assert.equal(rfqCtaLocation(link("main"), "/prices/rebar"), "price");
  assert.equal(rfqCtaLocation(link("main"), "/products/category/rebar"), "category");
  assert.equal(rfqCtaLocation(link("main"), "/tools/weight-calculator"), "calculator");
  assert.equal(rfqCtaLocation(link("main"), "/about"), null);
  assert.equal(rfqCtaLocation(link("footer"), "/products/rebar-aj340"), null);
});

test("funnel events: codes, slugs and tokens pass; a Persian label or a product title never does", () => {
  assert.deepEqual(buildEvent("product_view", { product_family: "REBAR", product_slug: "rebar-aj340" }), { event: "product_view", product_family: "REBAR", product_slug: "rebar-aj340" });
  assert.deepEqual(buildEvent("basket_add", { basket_size: 2, product_family: "BEAM", product_slug: "ipe-beam", add_source: "calculator" }), { event: "basket_add", basket_size: 2, product_family: "BEAM", product_slug: "ipe-beam", add_source: "calculator" });
  assert.deepEqual(buildEvent("product_view", { product_family: "میلگرد", product_slug: "میلگرد آجدار A3" }), { event: "product_view" });
  assert.deepEqual(buildEvent("rfq_cta_click", { cta_location: "header", product_family: undefined }), { event: "rfq_cta_click", cta_location: "header" });
  assert.deepEqual(buildEvent("calculator_open", { calculator_entry: "home_cta" }), { event: "calculator_open", calculator_entry: "home_cta" });
});

test("wiring: product_view on the product page, calculator_open + family on the calculator, rfq_cta_click in the runtime", () => {
  const product = fs.readFileSync(new URL("../../app/[locale]/products/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(product, /<TrackOnView event="product_view" params=\{\{ product_family: family \?\? undefined, product_slug: slug \}\} \/>/);
  assert.match(product, /async function ProductAnalytics\([^)]*\) \{\n  await Promise\.resolve\(\);/, "its own Flight row (r4)");
  assert.equal(product.match(/<ProductAnalytics /g)?.length, 1);
  const calc = fs.readFileSync(new URL("../../components/tools/weight-calculator.tsx", import.meta.url), "utf8");
  assert.match(calc, /trackEvent\("calculator_open", \{ calculator_entry: calculatorEntry\(sameOriginReferrerPath\(document\.referrer, window\.location\.origin\)\) \}\);\n  \}, \[\]\);/, "once per page load, from the referrer path only");
  assert.match(calc, /data-product-family=\{\(product\.groupCode && families\?\.\[product\.groupCode\]\) \|\| undefined\}/);
  const runtime = fs.readFileSync(new URL("../../components/analytics/analytics-runtime.tsx", import.meta.url), "utf8");
  assert.match(runtime, /isRfqHref\(link\.getAttribute\("href"\) \?\? ""\) && !link\.closest\(ARTICLE_SCOPE\)/, "articles report article_cta_click instead");
  assert.match(runtime, /const ARTICLE_SCOPE = '\[data-analytics-scope="article"\]';/);
  const article = fs.readFileSync(new URL("../../app/[locale]/articles/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(article, /<article data-analytics-scope="article">/);
});
