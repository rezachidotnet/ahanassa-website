import { test } from "node:test";
import assert from "node:assert/strict";
import { externalImages, mainTextBlocks, markdownTextBlocks, scanArticlePages } from "./article-gate.ts";
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

test("en article .md mirror: checked like its HTML page — the text, not the link targets (content run of 2026-10-16)", () => {
  // The cited source of the 2026-10-16 article: a wiki archive timestamp in the URL, the HTML page's href.
  const source = "- [Guidance Note 8.01: Preparing for effective corrosion protection](https://www.steelconstruction.info/upload/Wiki-Files/archive/f/fc/20151125111353%21GN_8-01.pdf) — The Steel Construction Institute";
  const md = (body: string) => `---\ntitle: Steel storage on site\nurl: https://www.ahanassa.com/en/articles/steel-storage-on-site\nlang: en\n---\n\n# Steel storage on site\n\n${body}\n`;
  assert.deepEqual(kinds([{ path: "en/articles/steel-storage-on-site.md", content: md(`## Sources\n\n${source}`) }]), []);
  assert.deepEqual(kinds([{ path: "en/articles/steel-storage-on-site.html", content: page(`<ul><li><a href="https://www.steelconstruction.info/upload/Wiki-Files/archive/f/fc/20151125111353%21GN_8-01.pdf">Guidance Note 8.01</a></li></ul>`) }]), [], "same as the HTML page");
  // The text of a .md mirror is still scanned in full: prose, link text and lines outside a link.
  for (const bad of ["Quoted at 853000.", "[Report 20151125111353](https://example.org/a)", "Rebar is 85,300 Toman per kg, see [this](https://example.org/b).", "https://example.org/archive/20151125111353 plain URL text"]) {
    assert.deepEqual([...new Set(kinds([{ path: "en/articles/a.md", content: md(bad) }]))], ["article_price_on_en:en/articles/a.md"], bad);
  }
});

test("ar article pages: no factory or delivery location of the price snapshot", () => {
  assert.deepEqual(kinds([{ path: "ar/articles/a.html", content: page("<p>السعر اليوم</p>") }]), []);
  assert.deepEqual(kinds([{ path: "ar/articles/a.html", content: page(`<p>${ROW.factory_name_fa}</p>`) }]), ["article_place_on_ar:ar/articles/a.html"]);
});

test("article pages: every image is a file of this site; JSON-LD only breadcrumb + FAQ; other pages are not scanned by this gate", () => {
  const ok = page('<picture><source srcSet="/images/articles/fa/a.webp"/><img src="/images/articles/fa/a.png"/></picture>', '<meta property="og:image" content="https://www.ahanassa.com/images/articles/fa/a.png"/>');
  assert.deepEqual(kinds([{ path: "articles/a.html", content: ok }]), []);
  assert.deepEqual(externalImages('<img src="https://cdn.example.org/x.png"><meta property="og:image" content="//cdn.example.org/y.png"><div style="background:url(https://x.example/z.png)">'), ["https://cdn.example.org/x.png", "//cdn.example.org/y.png", "https://x.example/z.png"]);
  assert.deepEqual(kinds([{ path: "articles/a.html", content: page('<img src="https://cdn.example.org/x.png">') }]), ["article_external_image:articles/a.html"]);
  const ld = (data: unknown) => page(`<script type="application/ld+json">${JSON.stringify(data)}</script>`);
  const crumbs = { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "خانه", item: "https://www.ahanassa.com/" }] };
  const faq = { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "q", acceptedAnswer: { "@type": "Answer", text: "a" } }] };
  assert.deepEqual(kinds([{ path: "articles/a.html", content: ld({ "@context": "https://schema.org", "@graph": [crumbs, faq] }) }]), []);
  assert.deepEqual(kinds([{ path: "articles/a.html", content: ld({ "@context": "https://schema.org", "@graph": [crumbs, { "@type": "Article", headline: "x" }] }) }]), ["article_json_ld:articles/a.html"]);
  assert.deepEqual(kinds([{ path: "articles/a.html", content: page('<script type="application/ld+json">{oops</script>') }]), ["article_json_ld:articles/a.html"]);
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

/**
 * W11.6 — the exact text of the incident of 2026-10-19/20 (content repo 36f622f703a8, rendered en .md mirrors): the
 * en article rebar-price-factors failed the gate on its own URL and its contents list, and four other en articles on
 * their "Related articles" card for it. Every content publish (prices too) was refused for two days.
 */
const INCIDENT_OWN_PAGE = `---
title: "What Moves Rebar Prices in Iran? A Buyer's Guide to Reading the Market | Ahan Asa"
url: https://www.ahanassa.com/en/articles/rebar-price-factors
lang: en
---

1. [Home](https://www.ahanassa.com/en)
2. [Articles](https://www.ahanassa.com/en/articles)
3. [Market analysis](https://www.ahanassa.com/en/articles/category/market-analysis)

Market analysis

# What Moves Rebar Prices in Iran? A Buyer's Guide to Reading the Market

What drives Iranian rebar prices: billet and the production chain, power and gas limits at steel mills, construction and export demand, and product specs.

Published:

19 October 2026

Updated:

19 October 2026

4 min read

Contents

1. The production chain: from iron ore to rebar
2. Energy: summer power, winter gas
3. Demand: domestic construction and export markets
4. Why the same bar size can be priced differently
5. How to read a price change
6. Summary

Importers and contractors who buy Iranian rebar notice that prices can sit still for days and then change several times in a week. This guide explains the main rebar price factors in plain terms, so you can see what may lie behind a move and compare quotations more accurately. It is not a price forecast; it is a guide to reading the market.
`;
const INCIDENT_RELATED_CARDS = `---
title: "IPE vs IPN Beams: Key Differences and Which One to Choose | Ahan Asa"
url: https://www.ahanassa.com/en/articles/ipe-vs-ipn-beam
lang: en
---

## Related articles

- [Buying guide How to Buy Rebar for a Residential Building: From Drawings to Delivery Rebar buying guide: read grade and bar sizes from the drawings, turn the bar schedule into tonnes, check the quotation and inspect the delivery on site. 15 October 2026 4 min read](https://www.ahanassa.com/en/articles/rebar-buying-guide)
- [Market analysis What Moves Rebar Prices in Iran? A Buyer's Guide to Reading the Market What drives Iranian rebar prices: billet and the production chain, power and gas limits at steel mills, construction and export demand, and product specs. 19 October 2026 4 min read](https://www.ahanassa.com/en/articles/rebar-price-factors)
- [Standards & specifications S235JR vs S355JR steel sheet (ST37 vs ST52): differences and typical uses S235JR vs S355JR hot-rolled sheet and plate, known in Iran as ST37 and ST52: yield strength, chemistry, weldability, toughness class and weight compared. 18 October 2026 4 min read](https://www.ahanassa.com/en/articles/s235jr-vs-s355jr-steel-sheet)
`;

test("W11.6 incident 2026-10-19/20: the exact en .md mirrors pass — own URL/slug, reading time, dates, contents list, related cards", () => {
  assert.deepEqual(scanArticlePages([{ path: "en/articles/rebar-price-factors.md", content: INCIDENT_OWN_PAGE }], [ROW]), []);
  assert.deepEqual(scanArticlePages([{ path: "en/articles/ipe-vs-ipn-beam.md", content: INCIDENT_RELATED_CARDS }], [ROW]), []);
  // Before W11.6 the mirror was one text: these were the joined "sentences" the gate refused.
  const blocks = markdownTextBlocks(INCIDENT_OWN_PAGE);
  assert.ok(blocks.includes("What Moves Rebar Prices in Iran? A Buyer's Guide to Reading the Market | Ahan Asa"), "the title is text");
  assert.ok(!blocks.some((b) => b.includes("https://www.ahanassa.com/en/articles/rebar-price-factors")), "the url line is not text");
  assert.ok(blocks.includes("Why the same bar size can be priced differently") && blocks.includes("4 min read"), "one block per list item and paragraph");
  assert.equal(markdownTextBlocks(INCIDENT_RELATED_CARDS).filter((b) => b.endsWith("min read")).length, 3, "one block per card");
});

test("W11.6: the en .md rule stays strict for real prices — currency, price-sized number, snapshot amount, number + price word in one sentence, table cell, card", () => {
  const md = (body: string) => `---\ntitle: "Rebar"\nurl: https://www.ahanassa.com/en/articles/rebar-price-factors\nlang: en\n---\n\n${body}\n`;
  const bad: Array<[string, RegExp]> = [
    ["Rebar sold at 85,300 Toman per kg last week.", /currency/],
    ["Quoted at 853000 for the week.", /price-sized number 853000/],
    ["Today 85300 was the figure.", /amount of this run's price snapshot \(85300\)/],
    ["Rebar prices rose 4 points in October.", /number 4 in a sentence about prices: "Rebar prices rose 4 points in October\."/],
    ["- The price moved 7 times this week", /number 7/],
    ["| Grade | Price |\n| --- | --- |\n| A3 | price 62 |", /number 62/],
    ["- [Market analysis Rebar prices rose 9 points 19 October 2026 4 min read](https://www.ahanassa.com/en/articles/x)", /number 9/],
    ["See https://www.ahanassa.com/en/articles/rebar-price-factors — the price rose 3 points.", /number 3/],
  ];
  for (const [body, message] of bad) {
    const findings = scanArticlePages([{ path: "en/articles/rebar-price-factors.md", content: md(body) }], [ROW]);
    assert.ok(findings.length > 0 && findings.every((f) => f.kind === "article_price_on_en"), body);
    assert.ok(findings.some((f) => message.test(f.match)), `${body} → ${findings.map((f) => f.match).join(" | ")}`);
  }
  // A real sentence with a price word and an exempt number still passes.
  for (const ok of ["The price list covers 28 sizes.", "Prices were checked on 19 October 2026 and on October 20, 2026.", "Prices of 2026-10-19 (4 min read).", "Read [the rebar price guide](https://www.ahanassa.com/en/articles/rebar-price-factors) first."]) {
    assert.deepEqual(scanArticlePages([{ path: "en/articles/a.md", content: md(ok) }], [ROW]), [], ok);
  }
});

test("W11.6: every article finding quotes the offending text (truncated), en and ar", () => {
  const long = `The price rose 4 points ${"and kept rising ".repeat(20)}.`;
  const [f] = scanArticlePages([{ path: "en/articles/a.html", content: page(`<p>${long}</p>`) }], [ROW]);
  assert.match(f.match, /^en: number 4 in a sentence about prices: "The price rose 4 points and kept rising .*…"$/);
  assert.ok(f.match.length < 220, "truncated");
  const [ar] = scanArticlePages([{ path: "ar/articles/a.html", content: page(`<p>يتم التسليم من ${ROW.factory_name_fa} كل يوم</p>`) }], [ROW]);
  assert.match(ar.match, /^ar names a factory or delivery location of the price snapshot \("کارخانه نمونه"\): ".*کارخانه نمونه.*"$/);
});
