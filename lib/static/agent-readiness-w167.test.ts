import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildHeadersFile, CONTENT_SIGNAL, renderRobotsTxt } from "./static-rules.ts";
import { headerBlocks, PRODUCTION_ROBOTS_TXT, STAGING_ROBOTS_TXT } from "./indexing-gate.ts";
import { acceptsMarkdown, checkAgentTexts, checkMarkdownMirrors, htmlToMarkdown, MARKDOWN_REWRITE_RULES, markdownFileFor, markdownPathForPage, markdownRequestPath } from "./markdown-mirror.ts";
import { buildLlmsFullTxt, buildLlmsTxt, type LlmsPage } from "./llms-txt.ts";
import { pageH1 } from "./agent-files.ts";
import { fileLocale, scanPublicFile } from "./leak-scan.ts";
import { visibleText } from "./price-gate.ts";
import { startStaticServer } from "../../scripts/static/serve.ts";
import { STATIC_TARGETS } from "./targets.ts";

/** W16.7 — agent readiness: Content Signals, llms.txt, Markdown mirrors and Accept negotiation. */

// --- 1. Content Signals ---------------------------------------------------------------------------------

test("robots.txt: every group carries the owner's Content-Signal (search, ai-input, ai-train all yes); rules and sitemap kept", () => {
  assert.equal(CONTENT_SIGNAL, "search=yes, ai-input=yes, ai-train=yes");
  assert.equal(PRODUCTION_ROBOTS_TXT, ["User-Agent: *", `Content-Signal: ${CONTENT_SIGNAL}`, "Allow: /", "Disallow: /api/", "Disallow: /static-404", "Disallow: /*?", "", "Sitemap: https://www.ahanassa.com/sitemap.xml", ""].join("\n"));
  assert.equal(STAGING_ROBOTS_TXT, `User-Agent: *\nContent-Signal: ${CONTENT_SIGNAL}\nDisallow: /\n`, "staging stays disallow-all");
  const two = renderRobotsTxt({ rules: [{ userAgent: "*", allow: "/" }, { userAgent: "ExampleBot", disallow: "/" }] });
  assert.equal(two.match(/^Content-Signal: /gm)?.length, 2, "one line per user-agent group");
});

test("_headers: Content-Signal and Vary: Accept on every path; the .md mirrors are noindex on production", () => {
  for (const env of ["staging", "production"] as const) {
    const blocks = headerBlocks(buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin, []));
    assert.ok(blocks.get("/*")?.includes(`Content-Signal: ${CONTENT_SIGNAL}`), `${env}: Content-Signal on /*`);
    assert.ok(blocks.get("/*")?.includes("Vary: Accept"), `${env}: Vary: Accept on /* (HTML and Markdown share a URL)`);
  }
  const production = headerBlocks(buildHeadersFile("production", STATIC_TARGETS.production.rfqApiOrigin, []));
  assert.deepEqual(production.get("/*.md"), ["X-Robots-Tag: noindex"], "the HTML page stays the one indexed URL");
  assert.ok(!production.get("/*")?.some((l) => /^X-Robots-Tag/i.test(l)), "production pages are never noindex");
  assert.ok(!production.get("/*")?.some((l) => /^Content-Type/i.test(l)), "the asset server types .md itself (text/markdown; charset=utf-8)");
});

// --- 3. Markdown mirrors ----------------------------------------------------------------------------------

const PAGE = `<!DOCTYPE html><html lang="en" dir="ltr"><head><title>Steel beams | Ahan Asa</title><link rel="canonical" href="https://www.ahanassa.com/en/products/category/beam"/></head><body>
<header><nav>Header menu</nav></header>
<main id="main-content"><nav aria-label="Breadcrumb"><ol><li><a href="/en">Home</a></li><li>Beams</li></ol></nav>
<h1>Steel beams</h1><p>IPE &amp; IPN beams to <strong>EN 10365</strong>.<!-- --> See <a href="/en/tools/weight-calculator">the calculator</a>.</p>
<span class="sr-only">Screen-reader only</span><div hidden="">Hidden block</div><div aria-hidden="true">Decoration</div>
<script>window.secret = "x"</script><svg><text>Icon</text></svg>
<form><label>Your name</label><input name="n"/><button>Send</button></form>
<table><caption>Sizes</caption><thead><tr><th>Size</th><th>kg/m</th></tr></thead><tbody><tr><td>IPE 100</td><td>8.1</td></tr><tr><td>A|B</td><td><span>1</span><span>2</span></td></tr></tbody></table>
<ul><li>First</li><li>Second<ul><li>Nested</li></ul></li></ul></main>
<footer>Footer text</footer></body></html>`;

test("htmlToMarkdown: <main> only, headings/lists/tables/links, hidden and interactive parts dropped, front matter", () => {
  const md = htmlToMarkdown(PAGE);
  assert.ok(md.startsWith('---\ntitle: "Steel beams | Ahan Asa"\nurl: https://www.ahanassa.com/en/products/category/beam\nlang: en\n---\n\n'));
  assert.match(md, /^# Steel beams$/m);
  assert.match(md, /IPE & IPN beams to \*\*EN 10365\*\*\. See \[the calculator\]\(https:\/\/www\.ahanassa\.com\/en\/tools\/weight-calculator\)\./);
  assert.match(md, /^1\. \[Home\]\(https:\/\/www\.ahanassa\.com\/en\)\n2\. Beams$/m);
  assert.match(md, /Sizes\n\n\| Size \| kg\/m \|\n\| --- \| --- \|\n\| IPE 100 \| 8\.1 \|\n\| A\\\|B \| 1 2 \|/);
  assert.match(md, /^- First\n- Second\n {2}- Nested$/m);
  for (const gone of ["Header menu", "Footer text", "Screen-reader only", "Hidden block", "Decoration", "secret", "Icon", "Your name", "Send"]) assert.ok(!md.includes(gone), `${gone} is not in the Markdown`);
  assert.equal(pageH1(PAGE), "Steel beams");
});

test("Markdown paths: X.html ↔ X.md, the home page is /index.md, the 404s have none", () => {
  assert.equal(markdownFileFor("index.html"), "index.md");
  assert.equal(markdownFileFor("en.html"), "en.md");
  assert.equal(markdownFileFor("ar/products/ipe-beam.html"), "ar/products/ipe-beam.md");
  for (const nf of ["404.html", "en/404.html", "ar/404.html", "llms.txt"]) assert.equal(markdownFileFor(nf), null);
  assert.equal(markdownPathForPage("/"), "/index.md");
  assert.equal(markdownPathForPage("/en"), "/en.md");
  assert.equal(markdownPathForPage("/prices/rebar"), "/prices/rebar.md");
  for (const none of ["/about/", "/about.md", "/llms.txt", "/_next/static/chunks/a", "/images/x.webp"]) assert.equal(markdownPathForPage(none), null, none);
});

test("Accept negotiation: HTML by default and for browsers; Markdown only when text/markdown is asked for", () => {
  const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
  for (const accept of [undefined, null, "", "*/*", browser, "text/markdown;q=0", "text/plain"]) assert.equal(acceptsMarkdown(accept), false, String(accept));
  for (const accept of ["text/markdown", "Text/Markdown", "text/markdown;q=0.9, text/html;q=0.8", "text/html, text/markdown; charset=utf-8"]) assert.equal(acceptsMarkdown(accept), true, accept);
  assert.equal(markdownRequestPath("/about", browser), "/about");
  assert.equal(markdownRequestPath("/about", "text/markdown"), "/about.md");
  assert.equal(markdownRequestPath("/", "text/markdown"), "/index.md");
  assert.equal(markdownRequestPath("/about.md", undefined), "/about.md", "a .md URL is served as is");
  assert.equal(markdownRequestPath("/_next/static/chunks/a.js", "text/markdown"), "/_next/static/chunks/a.js");
});

test("the zone's Rewrite URL rules match markdownRequestPath (the rules are Cloudflare Free features: lower, any, concat, starts_with, ends_with)", () => {
  assert.equal(MARKDOWN_REWRITE_RULES.length, 2);
  const [home, pages] = MARKDOWN_REWRITE_RULES;
  assert.equal(home.rewritePath.static, "/index.md");
  assert.equal(pages.rewritePath.dynamic, 'concat(http.request.uri.path, ".md")');
  for (const r of MARKDOWN_REWRITE_RULES) assert.match(r.expression, /^any\(lower\(http\.request\.headers\["accept"\]\[\*\]\)\[\*\] contains "text\/markdown"\)/);
  // The same decision, evaluated the way the two expressions read.
  const rule = (p: string) => (p === "/" ? "/index.md" : !p.endsWith("/") && !p.endsWith(".md") && !p.startsWith("/_next/") && !p.includes(".") ? `${p}.md` : p);
  for (const p of ["/", "/en", "/ar/prices", "/products/ipe-beam", "/about/", "/about.md", "/llms.txt", "/_next/static/chunks/a.js"]) assert.equal(rule(p), markdownRequestPath(p, "text/markdown"), p);
  assert.ok(!/regex_replace|wildcard_replace/.test(JSON.stringify(MARKDOWN_REWRITE_RULES)), "no function a Free zone lacks");
});

test("local static server: HTML by default, Markdown on Accept: text/markdown or a .md URL, Vary: Accept on both", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "w167-serve-"));
  fs.writeFileSync(path.join(root, "index.html"), "<html><main><h1>Home</h1></main></html>");
  fs.writeFileSync(path.join(root, "index.md"), "# Home\n");
  fs.writeFileSync(path.join(root, "about.html"), "<html><main><h1>About</h1></main></html>");
  fs.writeFileSync(path.join(root, "about.md"), "# About\n");
  const { url, close } = await startStaticServer(root);
  try {
    const get = async (p: string, accept?: string) => {
      const r = await fetch(`${url}${p}`, { headers: accept ? { accept } : {} });
      return { status: r.status, type: r.headers.get("content-type"), vary: r.headers.get("vary"), body: await r.text() };
    };
    const html = await get("/about", "text/html,*/*;q=0.8");
    assert.deepEqual([html.status, html.type, html.vary], [200, "text/html; charset=utf-8", "Accept"]);
    assert.match(html.body, /<h1>About<\/h1>/);
    const md = await get("/about", "text/markdown");
    assert.deepEqual([md.status, md.type, md.vary, md.body], [200, "text/markdown; charset=utf-8", "Accept", "# About\n"]);
    assert.equal((await get("/", "text/markdown")).body, "# Home\n");
    assert.equal((await get("/about?x=1", "text/markdown")).body, "# About\n", "query string ignored");
    assert.equal((await get("/about.md")).type, "text/markdown; charset=utf-8");
    assert.match((await get("/")).body, /<h1>Home<\/h1>/, "no Accept header: HTML");
  } finally {
    close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// --- gate ------------------------------------------------------------------------------------------------

test("gate: a Markdown mirror may only say what its HTML page shows; an orphan .md fails", () => {
  const md = htmlToMarkdown(PAGE);
  const html = { path: "en/products/category/beam.html", content: PAGE };
  assert.deepEqual(checkMarkdownMirrors([html, { path: "en/products/category/beam.md", content: md }], visibleText), []);
  const injected = checkMarkdownMirrors([html, { path: "en/products/category/beam.md", content: `${md}\nToday's price 45,000 Toman\n` }], visibleText);
  assert.equal(injected.length, 1);
  assert.match(injected[0], /has text its HTML page does not show/);
  assert.deepEqual(checkMarkdownMirrors([{ path: "orphan.md", content: "# x" }], visibleText), ["markdown: orphan.md has no HTML page"]);
});

test("gate: llms*.txt and en Markdown carry no snapshot price amount or factory/place; ar Markdown no factory/place", () => {
  const rows = [{ price_irr_per_kg: 489470, factory_name_fa: "کارخانه آزمایشی الف", location_fa: "درب کارخانه" }];
  assert.deepEqual(checkAgentTexts([{ path: "llms.txt", content: "# Ahan Asa\nPhone: 031-35134\n" }], rows), []);
  assert.match(checkAgentTexts([{ path: "llms.txt", content: "Rebar 48,947 today" }], rows)[0], /price amount/);
  assert.match(checkAgentTexts([{ path: "en/prices.md", content: "rebar ۴۸۹٬۴۷۰" }], rows)[0], /price amount/, "IRR in Persian digits");
  assert.match(checkAgentTexts([{ path: "llms.txt", content: "Prices in Toman" }], rows)[0], /currency/);
  assert.match(checkAgentTexts([{ path: "en/tools/weight-calculator.md", content: "A cost estimate is rounded to the nearest 1,000 Toman." }], rows)[0], /currency/, "no currency word on an en page");
  assert.deepEqual(checkAgentTexts([{ path: "en/about.md", content: "Building materials and industrial pipe" }], rows), [], "a word containing 'rial' is not a currency");
  assert.match(checkAgentTexts([{ path: "ar/prices.md", content: "٤٨٬٩٤٧ کارخانه آزمایشی الف" }], rows)[0], /factory or delivery location/);
  assert.deepEqual(checkAgentTexts([{ path: "ar/prices.md", content: "سعر اليوم ٤٨٬٩٤٧ تومان/كغ" }], rows), [], "ar: price + date is allowed");
  assert.deepEqual(checkAgentTexts([{ path: "prices.md", content: "۴۸٬۹۴۷ تومان کارخانه آزمایشی الف درب کارخانه" }], rows), [], "fa: full price display is allowed");
});

test("the leak, publication and source-name scans read .md files in their page's language", () => {
  assert.equal(fileLocale("en.md"), "en");
  assert.equal(fileLocale("en/about.md"), "en");
  assert.equal(fileLocale("ar.md"), "ar");
  assert.equal(fileLocale("ar/prices.md"), "ar");
  assert.equal(fileLocale("about.md"), "fa");
  assert.ok(scanPublicFile("en/about.md", "# About\nقیمت روز").some((f) => f.kind === "persian_on_en"));
  const gate = fs.readFileSync(path.join(import.meta.dirname, "artifact-gate.ts"), "utf8");
  assert.match(gate, /\.\(html\|json\|txt\|xml\|js\|css\|md\)\$/, "leak scan file types include .md");
  assert.match(gate, /const textFiles = publicEntries\.filter\(\(e\) => \/\\\.\(html\|json\|txt\|xml\|js\|css\|md\)\$\//, "publication, price, article and source-name scans include .md");
  assert.match(gate, /checkMarkdownMirrors\(textFiles, visibleText\)/);
  assert.match(gate, /checkAgentTexts\(textFiles, priceGateInput\(snapshotDoc\)\.rows\)/);
});

// --- 2. llms.txt -----------------------------------------------------------------------------------------

const PAGES: LlmsPage[] = [
  ...["index.html", "en.html", "ar.html", "about.html", "en/about.html", "ar/about.html", "contact.html", "en/contact.html", "ar/contact.html", "en/products.html", "prices.html", "ar/prices.html", "en/tools/weight-calculator.html", "en/raw-materials.html", "en/raw-materials/billet.html", "en/export.html"].map((file) => ({ file, h1: "Page" })),
  { file: "en/products/category/rebar.html", h1: "Rebar" },
  { file: "en/products/rebar-aj400.html", h1: "Ribbed Rebar Aj400 (A3)" },
  { file: "prices/rebar.html", h1: "قیمت روز میلگرد — ۱۶ مهر ۱۴۰۵" },
  { file: "ar/prices/rebar.html", h1: "سعر حديد التسليح اليوم — ٨ أكتوبر ٢٠٢٦" },
];

test("llms.txt: company, products, fa/ar prices, calculator, raw materials, export, how to request, contact — links only to built pages", () => {
  const llms = buildLlmsTxt(PAGES);
  assert.ok(llms.startsWith("# Ahan Asa (آهن آسا)\n\n> Ahan Asa is a B2B steel procurement partner in Iran"));
  for (const heading of ["Company", "Products (specifications)", "Daily prices (Persian and Arabic only)", "Tools", "Steel raw materials (quote on request only)", "Export", "How to request a quote", "Contact"]) assert.match(llms, new RegExp(`^## ${heading.replace(/[()]/g, "\\$&")}$`, "m"));
  for (const link of ["/en/about", "/en/products/category/rebar", "/en/products/rebar-aj400", "/prices", "/ar/prices", "/prices/rebar", "/ar/prices/rebar", "/en/tools/weight-calculator", "/en/raw-materials/billet", "/en/export", "/en/contact", "/contact", "/ar/contact"]) assert.ok(llms.includes(`(https://www.ahanassa.com${link})`), link);
  assert.ok(!llms.includes("/en/raw-materials/dri"), "no link to a page the artifact does not have");
  assert.ok(!llms.includes("/tools/weight-calculator)") || llms.includes("(https://www.ahanassa.com/en/tools/weight-calculator)"));
  assert.match(llms, /- \[Rebar prices \(Persian\)\]\(https:\/\/www\.ahanassa\.com\/prices\/rebar\)/, "a hub is named by family, not its dated H1");
  assert.ok(!/۱۴۰۵|٢٠٢٦|2026/.test(llms), "no date: the file is the same every day and on both targets");
  assert.match(llms, /Phone: 031-35134/);
  assert.match(llms, /Head office: Hezar Jarib Street, Kooy Azadegan, No\. 6, Isfahan, Iran/);
  assert.match(llms, /Business hours: Saturday to Wednesday, 8:00–17:00; Thursday, 8:00–12:00 \(Iran time\)/);
  assert.match(llms, /Fazasazeh Naghsh-e Jahan group \(https:\/\/fazasazeh\.ir\)/);
  assert.match(llms, /English pages carry no prices/);
  assert.match(llms, /Where the form offers file upload, attach the list as Excel, PDF or a photo; otherwise send files on WhatsApp/, "upload is offered only when the RFQ Worker enables it");
  assert.match(llms, /`Accept: text\/markdown`/);
});

test("llms.txt / llms-full.txt: no price amount, currency, factory or price word with a number", () => {
  const llms = buildLlmsTxt(PAGES);
  assert.ok(!/\b(tomans?|rials?|irr)\b|تومان|ریال|﷼|\$/i.test(llms));
  assert.ok(!/\d{1,3}([,٬]\d{3})+/.test(llms.replace(/1454954166/, "")), "no grouped amount");
  assert.ok(!/factory|کارخانه|mill name/i.test(llms));
  const full = buildLlmsFullTxt(llms, PAGES, (md) => (md.startsWith("en") ? `# ${md}\n` : "# fa page with ۴۸٬۹۴۷ تومان\n"));
  assert.ok(full.startsWith(llms.trimEnd()));
  assert.ok(full.includes("# en/about.md") && full.includes("# en.md"), "the English pages follow");
  assert.ok(!full.includes("تومان"), "only English (price-free) pages are appended");
});

test("en weight calculator: no currency in the text the page shows (fa/ar keep their Toman wording)", async () => {
  const { WEIGHT_CALCULATOR_COPY } = await import("../weight-calculator/copy.ts");
  // priceUnit / priceLabel / priceDisclaimer render only beside a cost estimate, which en never has (no price data).
  const { priceUnit: _unit, priceLabel: _label, priceDisclaimer: _disclaimer, ...shown } = WEIGHT_CALCULATOR_COPY.en;
  assert.ok(!/\b(tomans?|rials?|irr)\b|\$/i.test(JSON.stringify(shown)), "en calculator text names no currency");
  for (const l of ["fa", "ar"] as const) assert.match(JSON.stringify(WEIGHT_CALCULATOR_COPY[l]), /تومان/, `${l} unchanged`);
});
