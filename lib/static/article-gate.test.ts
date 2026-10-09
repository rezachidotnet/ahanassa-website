import { test } from "node:test";
import assert from "node:assert/strict";
import { externalImages, mainTextBlocks, scanArticlePages } from "./article-gate.ts";
import { priceGateInput, scanPrices } from "./price-gate.ts";
import { renderedAmount } from "../pricing/product-page-price.ts";
import { ARTICLE_TEXT_ATTRIBUTE } from "../articles/routes.ts";
import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/** W11.1 — the article gate and the price gate on article pages. Synthetic data only. */
const ROW: PublishedPriceRow = {
  canonical_variant_id: "CVAR-000031",
  price_irr_per_kg: 853_000,
  vat_included: 1,
  factory_name_fa: "کارخانه نمونه",
  location_fa: "انبار نمونه",
  published_at: "2026-10-09T07:18:28Z",
  previous_price_irr_per_kg: null,
  previous_published_at: null,
};
const page = (main: string, head = "") => `<html><head>${head}</head><body><header>03135134 Contact</header><main id="main-content">${main}</main><footer>FOB CIF</footer></body></html>`;
const kinds = (files: { path: string; content: string }[]) => scanArticlePages(files, [ROW]).map((f) => `${f.kind}:${f.file}`);

test("en article pages: no currency, price-sized number, snapshot amount or number in a price sentence — site chrome is not scanned", () => {
  assert.deepEqual(kinds([{ path: "en/articles/a.html", content: page("<h1>Rebar</h1><p>The board covers 28 sizes; IPE 140 weighs 12.9 kg/m.</p><p>3 min read</p><h2>Prices today</h2>") }]), []);
  for (const bad of ["<p>Rebar is 85,300 Toman per kg.</p>", "<p>Quoted at 853000.</p>", "<p>Today 85300 was the figure.</p>", "<p>The price rose 4 points.</p>"]) {
    assert.deepEqual([...new Set(kinds([{ path: "en/articles/a.html", content: page(bad) }]))], ["article_price_on_en:en/articles/a.html"], bad);
  }
  assert.deepEqual(mainTextBlocks(page("<p>a</p><p>b</p>")), ["a", "b"]);
});

test("ar article pages: no factory or delivery location of the price snapshot", () => {
  assert.deepEqual(kinds([{ path: "ar/articles/a.html", content: page("<p>السعر اليوم</p>") }]), []);
  assert.deepEqual(kinds([{ path: "ar/articles/a.html", content: page(`<p>${ROW.factory_name_fa}</p>`) }]), ["article_place_on_ar:ar/articles/a.html"]);
});

test("article pages: every image is a file of this site; no JSON-LD; other pages are not scanned by this gate", () => {
  const ok = page('<picture><source srcSet="/images/articles/fa/a.webp"/><img src="/images/articles/fa/a.png"/></picture>', '<meta property="og:image" content="https://www.ahanassa.com/images/articles/fa/a.png"/>');
  assert.deepEqual(kinds([{ path: "articles/a.html", content: ok }]), []);
  assert.deepEqual(externalImages('<img src="https://cdn.example.org/x.png"><meta property="og:image" content="//cdn.example.org/y.png"><div style="background:url(https://x.example/z.png)">'), ["https://cdn.example.org/x.png", "//cdn.example.org/y.png", "https://x.example/z.png"]);
  assert.deepEqual(kinds([{ path: "articles/a.html", content: page('<img src="https://cdn.example.org/x.png">') }]), ["article_external_image:articles/a.html"]);
  assert.deepEqual(kinds([{ path: "articles/a.html", content: page('<script type="application/ld+json">{}</script>') }]), ["article_json_ld:articles/a.html"]);
  assert.deepEqual(kinds([{ path: "products/x.html", content: page('<img src="https://cdn.example.org/x.png">') }]), []);
});

test("price gate: a fa/ar article's own text may quote a price; the same amount elsewhere on the page, or anywhere on en, fails", () => {
  const input = priceGateInput({ tables: { published_prices: [ROW], product_variants: [{ xid: ROW.canonical_variant_id, commercial_size: "Ø16" }] } });
  const fa = renderedAmount(ROW, "fa");
  const ar = renderedAmount(ROW, "ar");
  const region = (text: string) => `<div ${ARTICLE_TEXT_ATTRIBUTE}="body"><p>${text}</p></div>`;
  const run = (path: string, html: string) => scanPrices([{ path, content: html }], input).map((f) => f.kind);
  assert.deepEqual(run("articles/a.html", page(region(`قیمت امروز ${fa} تومان`))), []);
  assert.deepEqual(run("ar/articles/a.html", page(region(`السعر ${ar}`))), []);
  assert.deepEqual(run("articles/a.html", page(`${region("متن")}<p>${fa}</p>`)), ["price_outside_markup"], "outside the article text");
  assert.deepEqual(run("products/x.html", page(region(`${fa}`))), ["price_outside_markup"], "the exemption is for article pages only");
  assert.ok(run("en/articles/a.html", page(region(`${fa}`))).includes("price_on_en_page"), "never on en");
  assert.ok(run("ar/articles/a.html", page(region(ROW.factory_name_fa))).includes("price_fa_field_on_ar_page"), "ar never names the factory, even in article text");
});
