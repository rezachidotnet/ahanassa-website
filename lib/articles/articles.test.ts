import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FrontmatterError, parseFrontmatter, parseYaml } from "./frontmatter.ts";
import { MarkdownError, parseMarkdown, parseInline, readingMinutes } from "./markdown.ts";
import { ARTICLE_AUTHOR, checkArticleFiles, coverFindings, enPriceFindings, type ArticleCheckContext, type ArticleSourceFile } from "./validate.ts";
import { articleListingPath, pageCount, ARTICLES_PER_PAGE } from "./routes.ts";
import { normalizeRtlCover, rasterizeCover } from "./cover-raster.ts";
import { fetchArticlesSource, readContentTree } from "../content-pipeline/articles-source.ts";
import { snapshotV1 } from "../contracts/snapshot-v1.ts";
import type { ArticleLocale } from "../contracts/snapshot-articles.ts";

/**
 * W11.1 — articles: frontmatter + Markdown parsing, the website's per-article checks, routes, covers and
 * the content-repository fetch. All fixtures are SYNTHETIC (this repository is public): no article, cover
 * or name from the private content repository.
 */
const COVER = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0B2545"/><text x="80" y="300" font-family="Estedad" font-size="54" fill="#FBF5EB">Ahan Asa</text></svg>`;
const CATEGORY = "استاندارد و مشخصات";
const BODY: Record<ArticleLocale, string> = {
  fa: "مقدمهٔ مقاله دربارهٔ وزن میلگرد.\n\n## بخش اول\n\nمتن با [محصول](/products/rebar-a) و [تماس](/contact) و [همه محصولات](/products).\n\n| قطر | وزن |\n|---|---|\n| ۸ | ۰٫۳۹۵ |\n\n## بخش دوم\n\n- یک\n- دو\n",
  ar: "مقدمة المقال حول وزن حديد التسليح.\n\n## القسم الأول\n\nنص مع [منتج](/ar/products/rebar-a) و[تواصل](/ar/contact) و[المنتجات](/ar/products).\n",
  en: "An introduction about rebar weight.\n\n## First section\n\nText with [a product](/en/products/rebar-a), [contact](/en/contact) and [all products](/en/products).\n",
};

function article(locale: ArticleLocale, opts: { slug?: string; body?: string; translations?: Partial<Record<ArticleLocale, string | null>>; extra?: string; title?: string; date?: string } = {}): ArticleSourceFile {
  const slug = opts.slug ?? "rebar-weight";
  const date = opts.date ?? "2026-10-09";
  const tr = { fa: "rebar-weight", ar: null, en: null, ...opts.translations, [locale]: slug };
  const yaml = (v: string | null) => (v === null ? "null" : v);
  const content = `---
title: "${opts.title ?? (locale === "en" ? "Rebar weight table for site work" : locale === "ar" ? "جدول وزن حديد التسليح" : "جدول وزن میلگرد برای کارگاه")}"
slug: ${slug}
description: "${locale === "en" ? "A synthetic description of the rebar weight table article used only by the website's unit tests." : locale === "ar" ? "وصف تجريبي للمقال" : "توضیح آزمایشی"}"
date: ${date}
updated: ${date}
lang: ${locale}
category: ${CATEGORY}
tags: [a1, b2]
related_products: [CTMPL-000001]
faq:
  - q: "${locale === "en" ? "How heavy is a bar?" : locale === "ar" ? "سؤال تجريبي؟" : "سؤال آزمایشی؟"}"
    a: "${locale === "en" ? "About two kilograms per metre for a typical size." : locale === "ar" ? "إجابة تجريبية عن السؤال." : "پاسخ آزمایشی برای سؤال."}"
sources:
  - title: "Synthetic source"
    url: "https://example.org/source"
    accessed: ${date}
author: ${ARTICLE_AUTHOR[locale]}
reviewed_by:
  editor: editor-agent
  date: ${date}
translations:
  fa: ${yaml(tr.fa)}
  ar: ${yaml(tr.ar)}
  en: ${yaml(tr.en)}
topic_reason:
  type: calendar
  summary: "internal, never stored"
${opts.extra ?? ""}---

${opts.body ?? BODY[locale]}`;
  return { path: `articles/${locale}/${date.slice(0, 4)}/${date.slice(5, 7)}/${slug}.md`, content };
}
const cover = (faSlug = "rebar-weight", locale: ArticleLocale = "fa", svg = COVER): ArticleSourceFile => ({ path: `assets/articles/${faSlug}/cover${locale === "fa" ? "" : `.${locale}`}.svg`, content: svg });

function ctx(over: Partial<ArticleCheckContext> = {}): ArticleCheckContext {
  const routes = new Set(["/", "/contact", "/products", "/products/rebar-a"]);
  return { routes: { fa: routes, ar: routes, en: routes }, templates: new Set(["CTMPL-000001"]), priceNames: ["کارخانه نمونه", "انبار نمونه"], priceAmounts: [85300, 853000], sourceNames: null, ...over };
}
const reasons = (r: ReturnType<typeof checkArticleFiles>, file: string) => r.excluded.find((e) => e.file === file)?.reasons.join(" | ") ?? "";

// --- frontmatter ---------------------------------------------------------------------------------

test("frontmatter: maps, flow and block sequences, sequences of maps, quoting, null and numbers; dates stay strings", () => {
  const v = parseYaml(`a: 1\nb: "x: y"\nc: [p, "q, r", 'it''s']\nd:\n  - k: v\n    n: null\ne: 2026-10-09\nf: ~\n`) as Record<string, unknown>;
  assert.deepEqual(v, { a: 1, b: "x: y", c: ["p", "q, r", "it's"], d: [{ k: "v", n: null }], e: "2026-10-09", f: null });
});

test("frontmatter: anchors, flow mappings, tabs, duplicate keys and an unclosed block are errors", () => {
  for (const bad of ["a: &x 1\n", "a: {b: 1}\n", "a:\n\t- 1\n", "a: 1\na: 2\n"]) assert.throws(() => parseYaml(bad), FrontmatterError, bad);
  assert.throws(() => parseFrontmatter("---\na: 1\n"), FrontmatterError);
  assert.deepEqual(parseFrontmatter("---\na: 1\n---\nbody\n"), { data: { a: 1 }, body: "body\n" });
});

// --- markdown ------------------------------------------------------------------------------------

test("markdown: headings get stable ids and h2s make the table of contents; tables, lists, quotes, links", () => {
  const md = parseMarkdown("Intro **bold** and *em*.\n\n## One\n\ntext [a](/x)\n\n### Sub\n\n| A | B |\n|:--|--:|\n| 1 | 2 |\n\n1. x\n2. y\n\n> quote\n\n## Two\n");
  assert.deepEqual(md.toc, [{ id: "section-1", text: "One" }, { id: "section-3", text: "Two" }]);
  assert.deepEqual(md.links, ["/x"]);
  assert.deepEqual(md.blocks.map((b) => b.t), ["p", "heading", "p", "heading", "table", "list", "quote", "heading"]);
  const table = md.blocks.find((b) => b.t === "table");
  assert.ok(table && table.t === "table" && table.align[0] === "start" && table.align[1] === "end");
});

test("markdown: images, raw HTML, H1, code fences and reference links are refused (the article is not published)", () => {
  for (const bad of ["![x](https://cdn.example.org/a.png)", "<script>alert(1)</script>", "<img src=x>", "# Title", "```\ncode\n```", "[a]: https://x.example"]) assert.throws(() => parseMarkdown(bad), MarkdownError, bad);
  assert.doesNotThrow(() => parseMarkdown("قطر < ۱۶ و 2 > 1"));
});

test("markdown: inline escapes and nested emphasis inside links; snake_case words are not emphasis", () => {
  assert.deepEqual(parseInline("\\*not em\\*"), [{ t: "text", v: "*not em*" }]);
  assert.deepEqual(parseInline("[**b**](/p)")[0], { t: "link", href: "/p", c: [{ t: "strong", c: [{ t: "text", v: "b" }] }] });
  assert.deepEqual(parseInline("a_b_c"), [{ t: "text", v: "a_b_c" }]);
  assert.equal(readingMinutes("word ".repeat(450)), 2);
  assert.equal(readingMinutes(""), 1);
});

// --- per-article checks --------------------------------------------------------------------------

test("checks: a valid fa/ar/en trio publishes with reciprocal translations and internal fields dropped", () => {
  const tr = { fa: "rebar-weight", ar: "rebar-weight-ar", en: "rebar-weight-en" };
  const r = checkArticleFiles([article("fa", { translations: tr }), article("ar", { slug: "rebar-weight-ar", translations: tr }), article("en", { slug: "rebar-weight-en", translations: tr }), cover(), cover("rebar-weight", "ar"), cover("rebar-weight", "en")], ctx());
  assert.deepEqual(r.excluded, []);
  assert.deepEqual(r.rows.map((x) => `${x.locale}:${x.slug}`), ["ar:rebar-weight-ar", "en:rebar-weight-en", "fa:rebar-weight"]);
  for (const row of r.rows) {
    assert.deepEqual(JSON.parse(row.translations_json), tr);
    assert.equal(row.category, "standards");
    assert.ok(!JSON.stringify(row).includes("internal, never stored") && !JSON.stringify(row).includes("editor-agent"));
  }
});

test("checks: en with a currency, a price-sized number, a snapshot amount or a number in a price sentence is not published", () => {
  for (const [body, why] of [
    ["Rebar costs 85,300 Toman per kg today.", "currency"],
    ["Today 853,000 is quoted.", "price-sized"],
    ["The board shows 85300 for this size.", "snapshot"],
    ["The price moved 3 points this week.", "sentence about prices"],
  ] as const) {
    const r = checkArticleFiles([article("en", { slug: "en-only", translations: { fa: "rebar-weight" }, body: `${BODY.en}\n${body}\n` }), cover()], ctx());
    assert.equal(r.rows.length, 0, body);
    assert.match(reasons(r, "articles/en/2026/10/en-only.md"), new RegExp(why === "currency" ? "currency" : why === "price-sized" ? "price-sized" : why === "snapshot" ? "snapshot" : "sentence about prices"), body);
  }
  // Not a price: sizes, weights, standards and years in a price sentence.
  assert.deepEqual(enPriceFindings(["The price of IPE 140 is quoted for 12 m bars to EN 10365 in 2026; 28 sizes carry a price."], [85300]), []);
});

test("checks: ar naming a factory or delivery location of the price snapshot is not published; Persian letters on ar or Arabic script on en are leaks", () => {
  const r1 = checkArticleFiles([article("ar", { slug: "ar-only", translations: { fa: "rebar-weight" }, body: `${BODY.ar}\nالسعر من كارخانه نمونه.\n` }), cover()], ctx({ priceNames: ["كارخانه نمونه"] }));
  assert.match(reasons(r1, "articles/ar/2026/10/ar-only.md"), /factory or delivery location/);
  const r2 = checkArticleFiles([article("ar", { slug: "ar-only", translations: { fa: "rebar-weight" }, body: `${BODY.ar}\nکلمهٔ فارسی گچ.\n` }), cover()], ctx());
  assert.match(reasons(r2, "articles/ar/2026/10/ar-only.md"), /persian_on_ar/);
  const r3 = checkArticleFiles([article("en", { slug: "en-only", translations: { fa: "rebar-weight" }, body: `${BODY.en}\nميلگرد\n` }), cover()], ctx());
  assert.match(reasons(r3, "articles/en/2026/10/en-only.md"), /persian_on_en/);
});

test("checks: a private price-source name anywhere (text or cover) is refused, and the reason never repeats the name", () => {
  const r = checkArticleFiles([article("fa", { body: `${BODY.fa}\nاز سایت examplemarket.test\n` }), cover()], ctx({ sourceNames: ["example-market.test"] }));
  assert.match(reasons(r, "articles/fa/2026/10/rebar-weight.md"), /price source \(name #1/);
  assert.ok(!reasons(r, "articles/fa/2026/10/rebar-weight.md").includes("example"));
  const r2 = checkArticleFiles([article("fa"), cover("rebar-weight", "fa", COVER.replace("Ahan Asa", "Example Market"))], ctx({ sourceNames: ["example-market.test"] }));
  assert.equal(r2.rows.length, 0);
});

test("checks: links must stay in the locale and resolve; a refused article takes the articles linking to it out too", () => {
  const broken = checkArticleFiles([article("fa", { body: `${BODY.fa}\n[x](/products/missing)\n` }), article("fa", { slug: "second", body: `${BODY.fa}\n[اولی](/articles/rebar-weight)\n` }), cover(), cover("second")], ctx());
  assert.equal(broken.rows.length, 0);
  assert.match(reasons(broken, "articles/fa/2026/10/second.md"), /\/articles\/rebar-weight/);
  const other = checkArticleFiles([article("ar", { slug: "ar-only", translations: { fa: "rebar-weight" }, body: `${BODY.ar}\n[x](/products/rebar-a)\n` }), cover()], ctx());
  assert.match(reasons(other, "articles/ar/2026/10/ar-only.md"), /not in \/ar\//);
  const js = checkArticleFiles([article("fa", { body: `${BODY.fa}\n[x](javascript:alert(1))\n` }), cover()], ctx());
  assert.match(reasons(js, "articles/fa/2026/10/rebar-weight.md"), /only http\(s\)/);
  const ok = checkArticleFiles([article("fa", { body: `${BODY.fa}\n[ext](https://example.org/a) [site](https://www.ahanassa.com/contact) [cat](/articles/category/standards)\n` }), cover()], ctx());
  assert.equal(ok.rows.length, 1, JSON.stringify(ok.excluded));
});

test("checks: a translation that is missing or does not point back is dropped (no hreflang), the article still publishes", () => {
  const r = checkArticleFiles([article("fa", { translations: { en: "ghost" } }), cover()], ctx());
  assert.equal(r.rows.length, 1);
  assert.deepEqual(JSON.parse(r.rows[0].translations_json), { fa: "rebar-weight", ar: null, en: null });
  assert.ok(r.notes.some((n) => n.includes("en:ghost")));
});

test("checks: path/lang/date/slug mismatches, reserved slugs, a wrong author, an unknown category and a missing or unsafe cover are refused", () => {
  const wrongLang = article("fa");
  const r = checkArticleFiles(
    [
      { ...wrongLang, path: "articles/en/2026/10/rebar-weight.md" },
      article("fa", { slug: "page" }),
      article("fa", { slug: "late", date: "2026-11-01" }),
      { ...article("fa", { slug: "late" }), path: "articles/fa/2026/09/late.md" },
      { ...article("fa", { slug: "author" }), content: article("fa", { slug: "author" }).content.replace(ARTICLE_AUTHOR.fa, "Someone") },
      { ...article("fa", { slug: "cat" }), content: article("fa", { slug: "cat" }).content.replace(CATEGORY, "دسته ناشناخته") },
      article("fa", { slug: "nocover", translations: { fa: "nocover" } }),
      cover(),
      cover("page"),
      cover("late"),
      cover("author"),
      cover("cat"),
    ],
    ctx(),
  );
  assert.match(reasons(r, "articles/en/2026/10/rebar-weight.md"), /lang "fa" does not match/);
  assert.match(reasons(r, "articles/fa/2026/10/page.md"), /reserved/);
  assert.match(reasons(r, "articles/fa/2026/09/late.md"), /does not match the folder/);
  assert.match(reasons(r, "articles/fa/2026/10/author.md"), /author must be/);
  assert.match(reasons(r, "articles/fa/2026/10/cat.md"), /unknown category/);
  assert.match(reasons(r, "articles/fa/2026/10/nocover.md"), /missing cover/);
  for (const bad of [COVER.replace("<rect", '<image href="https://cdn.example.org/a.png"/><rect'), COVER.replace("<rect", "<script>1</script><rect"), COVER.replace('fill="#0B2545"', 'fill="url(https://x.example/p)"'), "not svg"]) assert.ok(coverFindings(bad).length > 0, bad);
  assert.deepEqual(coverFindings(COVER), []);
});

test("checks: ar/en use their own cover, else the fa cover (noted)", () => {
  const r = checkArticleFiles([article("en", { slug: "en-only", translations: { fa: "rebar-weight" } }), cover()], ctx());
  assert.equal(r.rows.length, 1);
  assert.ok(r.notes.some((n) => n.includes("using the fa cover")));
});

test("snapshot.v1: published_articles must be unique per (locale, slug) with reciprocal translations", () => {
  const tr = { fa: "rebar-weight", ar: "rebar-weight-ar", en: null };
  const rows = checkArticleFiles([article("fa", { translations: tr }), article("ar", { slug: "rebar-weight-ar", translations: tr }), cover(), cover("rebar-weight", "ar")], ctx()).rows;
  const base = { schema_version: "snapshot.v1", snapshot_version: "snap-0000000000000000", created_at: "2026-10-09T00:00:00.000Z", source: { kind: "odoo_full_fetch", description: "test", fetched_at: "2026-10-09T00:00:00.000Z" } };
  const tables = { catalog_public_categories: [], catalog_products: [], product_variants: [], product_seo_contents: [], public_processing_groups: [] };
  assert.ok(snapshotV1.safeParse({ ...base, tables: { ...tables, published_articles: rows } }).success);
  const broken = rows.map((r) => (r.locale === "ar" ? { ...r, translations_json: JSON.stringify({ fa: null, ar: "rebar-weight-ar", en: null }) } : r));
  assert.ok(!snapshotV1.safeParse({ ...base, tables: { ...tables, published_articles: broken } }).success);
  assert.ok(!snapshotV1.safeParse({ ...base, tables: { ...tables, published_articles: [rows[0], rows[0]] } }).success);
});

// --- routes ----------------------------------------------------------------------------------------

test("routes: listing pages and category pages; page 1 has no /page/1", () => {
  assert.equal(articleListingPath(1), "/articles");
  assert.equal(articleListingPath(3), "/articles/page/3");
  assert.equal(articleListingPath(1, "market-analysis"), "/articles/category/market-analysis");
  assert.equal(articleListingPath(2, "market-analysis"), "/articles/category/market-analysis/page/2");
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(ARTICLES_PER_PAGE + 1), 2);
});

// --- covers ----------------------------------------------------------------------------------------

test("cover: an RTL cover is normalized for resvg — anchors swapped, one <text> per title line, RLM-led runs", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" direction="rtl"><text x="1120" y="80" text-anchor="start">دسته</text><text x="1120" y="250" text-anchor="start"><tspan x="1120" y="250">خط یک</tspan><tspan x="1120" dy="70">خط دو</tspan></text><text x="80" y="604" text-anchor="end">۱۷ مهر</text></svg>`;
  const out = normalizeRtlCover(svg);
  assert.equal((out.match(/<text\b/g) ?? []).length, 4);
  assert.ok(out.includes('y="320"'), "the second line moved down by its dy");
  assert.ok(!out.includes("<tspan"));
  assert.equal((out.match(/text-anchor="end"/g) ?? []).length, 3);
  assert.equal((out.match(/\u200F/g) ?? []).length, 4);
  assert.equal(normalizeRtlCover(COVER), COVER, "LTR covers are untouched");
});

test("cover: rasterized deterministically to a 1200×630 PNG and a WebP, with the committed fonts only", async () => {
  const a = await rasterizeCover(COVER);
  const b = await rasterizeCover(COVER);
  assert.deepEqual(a.png, b.png);
  assert.deepEqual(a.webp, b.webp);
  assert.equal(a.png.subarray(1, 4).toString(), "PNG");
  assert.equal(a.png.readUInt32BE(16), 1200);
  assert.equal(a.png.readUInt32BE(20), 630);
  assert.equal(a.webp.subarray(8, 12).toString(), "WEBP");
});

// --- fetch -----------------------------------------------------------------------------------------

test("fetch: a checkout is read ONLY in articles/*.md and assets/articles/*.svg — never editorial/ or anything else", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aa-content-"));
  const write = (p: string, c = "x") => {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), c);
  };
  write("articles/fa/2026/10/a.md");
  write("articles/fa/2026/10/notes.txt");
  write("assets/articles/a/cover.svg");
  write("assets/templates/cover.svg");
  write("editorial/banned.txt", "secret");
  write("README.md");
  fs.symlinkSync(path.join(root, "editorial/banned.txt"), path.join(root, "articles/fa/2026/10/link.md"));
  assert.deepEqual(readContentTree(root).map((f) => f.path), ["articles/fa/2026/10/a.md", "assets/articles/a/cover.svg"]);
  const s = fetchArticlesSource(root, { AHANASSA_CONTENT_DIR: root });
  assert.equal(s.status, "ok");
  assert.ok(!JSON.stringify(s).includes("secret"));
  fs.rmSync(root, { recursive: true, force: true });
});

test("fetch: nothing configured → not_configured; a bad ref → failed; errors never carry the token", () => {
  assert.equal(fetchArticlesSource(os.tmpdir(), {}).status, "not_configured");
  assert.equal(fetchArticlesSource(os.tmpdir(), { AHANASSA_CONTENT_REPO_TOKEN: "t", AHANASSA_CONTENT_REF: "--upload-pack=x" }).status, "failed");
  const failed = fetchArticlesSource(os.tmpdir(), { AHANASSA_CONTENT_DIR: path.join(os.tmpdir(), "does-not-exist-aa") });
  assert.equal(failed.status, "failed");
});
