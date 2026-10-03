import { test } from "node:test";
import assert from "node:assert/strict";
import { internalIdsFromSnapshot, scanPublication } from "./publication-gate.ts";
import { checkLinks, resolvePublicPath } from "./link-check.ts";
import { rewriteStatic404Links } from "./postprocess.ts";

const catalog = (item: Record<string, unknown>) => JSON.stringify({ schema_version: "rfq-catalog.v1", snapshot_version: "snap-2026100322470500", locale: "en", items: [item] });
const goodItem = { variantXid: "CVAR-000001", templateXid: "CTMPL-000001", sku: "S", variantSpecLabel: "10", productLabel: "Rebar", templateSlug: "rebar", categoryCode: "LONG", groupCode: "REBAR", publicCategoryCode: "REBAR", publicCategoryLabel: "Rebar" };
const ld = (data: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head><body><main>ok</main></body></html>`;

test("publication gate: public JSON — only allowlisted files and fields", () => {
  assert.deepEqual(scanPublication([{ path: "data/rfq-catalog.en.json", content: catalog(goodItem) }], new Set()), []);
  for (const field of ["cost_price", "supplier", "margin", "stock", "purchase_price", "partner_id", "id", "template_id", "family_name"]) {
    const f = scanPublication([{ path: "data/rfq-catalog.en.json", content: catalog({ ...goodItem, [field]: 1 }) }], new Set());
    assert.ok(f.some((x) => x.kind === "json_field_not_allowed" && x.match === field), field);
  }
  assert.equal(scanPublication([{ path: "data/extra.json", content: "{}" }], new Set())[0].kind, "json_file_not_allowed");
});

test("publication gate: JSON-LD — allowed types/properties only; Product never carries offers or price", () => {
  const product = { "@context": "https://schema.org", "@graph": [{ "@type": "Product", "@id": "https://www.ahanassa.com/en/products/x#product", name: "X", url: "https://www.ahanassa.com/en/products/x" }] };
  assert.deepEqual(scanPublication([{ path: "en/products/x.html", content: ld(product) }], new Set()), []);
  const priced = structuredClone(product) as { "@graph": Record<string, unknown>[] };
  priced["@graph"][0].offers = { "@type": "Offer", price: "1", priceCurrency: "IRR" };
  const kinds = scanPublication([{ path: "en/products/x.html", content: ld(priced) }], new Set()).map((f) => `${f.kind}:${f.match}`);
  for (const k of ["jsonld_field_not_allowed:offers", "jsonld_type_not_allowed:Offer", "jsonld_field_not_allowed:price", "jsonld_field_not_allowed:priceCurrency"]) assert.ok(kinds.includes(k), k);
});

test("publication gate: internal ids (DB_PUBLIC row ids, legacy Odoo XIDs) and rendered empty values block", () => {
  const ids = internalIdsFromSnapshot({ tables: { product_variants: [{ id: "01M19CWBRZY8SVG6K969Q8ZEJN" }], catalog_products: [{ id: "cp-CTMPL-000001" }] } });
  const html = `<main><tr data-k="01M19CWBRZY8SVG6K969Q8ZEJN"></tr>ahanassa_marketplace.product_tmpl_rb <td>null</td><td>undefined</td></main>`;
  const found = scanPublication([{ path: "en/products/x.html", content: html }], ids).map((f) => `${f.kind}:${f.match}`);
  assert.ok(found.includes("internal_id:01M19CWBRZY8SVG6K969Q8ZEJN"));
  assert.ok(found.includes("internal_id:ahanassa_marketplace.product_tmpl_rb"));
  assert.ok(found.includes("empty_value_rendered:null") && found.includes("empty_value_rendered:undefined"));
  assert.deepEqual(scanPublication([{ path: "en/x.html", content: "<main>CVAR-000001 CTMPL-000001 nullable-free</main>" }], ids), [], "canonical ids are public");
  assert.ok(scanPublication([{ path: "data/rfq-catalog.en.json", content: catalog({ ...goodItem, productLabel: "undefined" }) }], ids).some((f) => f.kind === "empty_value_rendered"));
});

test("link check: Static Assets resolution, _redirects sources, broken links/images, hreflang reciprocity, sitemap", () => {
  const files = new Map<string, string>([
    ["index.html", `<link rel="canonical" href="https://www.ahanassa.com/"><link rel="alternate" hreflang="en" href="https://www.ahanassa.com/en"><a href="/en">en</a><a href="/request">r</a><img src="/images/a.png">`],
    ["en.html", `<link rel="canonical" href="https://www.ahanassa.com/en"><link rel="alternate" hreflang="fa" href="https://www.ahanassa.com/"><a href="/en/missing">x</a><img src="/images/missing.png">`],
    ["en/contact.html", `<meta name="robots" content="noindex"><link rel="alternate" hreflang="fa" href="https://www.ahanassa.com/">`],
    ["images/a.png", ""],
    ["_redirects", "/request /contact 308\n"],
    ["sitemap.xml", "<urlset><url><loc>https://www.ahanassa.com/en</loc></url><url><loc>https://www.ahanassa.com/en/contact</loc></url><url><loc>https://www.ahanassa.com/gone</loc></url></urlset>"],
  ]);
  const findings = checkLinks([...files.keys()], (f) => files.get(f)!).map((f) => `${f.kind} ${f.file} ${f.target}`);
  assert.deepEqual(findings.sort(), [
    "broken_image en.html /images/missing.png",
    "broken_link en.html /en/missing",
    "hreflang_not_reciprocal /en/contact fa -> /",
    "sitemap_bad_url sitemap.xml https://www.ahanassa.com/en/contact (noindex page)",
    "sitemap_bad_url sitemap.xml https://www.ahanassa.com/gone",
  ]);
  const set = new Set(["index.html", "en.html", "en/products/x.html"]);
  assert.equal(resolvePublicPath("/", set), "index.html");
  assert.equal(resolvePublicPath("/en?x=1#y", set), "en.html");
  assert.equal(resolvePublicPath("/en/products/x", set), "en/products/x.html");
});

test("404 pages: language-switcher links to the build-only static-404 route point at each locale's home", () => {
  const html = `<a href="/static-404">fa</a><a href="/en/static-404">en</a><a href="/ar/static-404">ar</a><script>push("\\"/en/static-404\\"")</script>`;
  const out = rewriteStatic404Links(html, ["fa", "en", "ar"], "fa");
  assert.equal(out, `<a href="/">fa</a><a href="/en">en</a><a href="/ar">ar</a><script>push("\\"/en\\"")</script>`);
});
