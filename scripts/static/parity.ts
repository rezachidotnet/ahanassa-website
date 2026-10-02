/**
 * Static-vs-SSR parity (architecture V1.1 §17.1; W1 item 11). For every
 * exported page, compares the static HTML (public-assets via a local static
 * server) with the current SSR output rendered from the same snapshot, and
 * classifies each difference against the accepted causes (A1–A3, A6, A7):
 *
 *   node scripts/static/parity.ts <public-assets> <ssr-base-url> <out.json>
 */
import fs from "node:fs";
import { startStaticServer } from "./serve.ts";

const [root, SSR, OUT] = process.argv.slice(2);
const server = await startStaticServer(root);
const STATIC = server.url;

const pages = fs
  .readdirSync(root, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".html") && !f.endsWith("404.html"))
  .map((f) => `/${f.replace(/\.html$/, "").replace(/(^|\/)index$/, "")}`.replace(/\/$/, "") || "/")
  .sort();

const ssrUrl = (u: string) => {
  const m = /^(\/(?:en|ar))?\/products\/category\/([a-z-]+)$/.exec(u);
  return m ? `${m[1] ?? ""}/products?category=${m[2].toUpperCase().replace(/-/g, "_")}` : u;
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pick = (h: string, re: RegExp) => (re.exec(h) ?? [])[1] ?? null;
const text = (html: string) =>
  decode(
    html
      .replace(/<head[\s\S]*?<\/head>/i, " ")
      .replace(/<title>[\s\S]*?<\/title>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
const withoutFilterBar = (html: string) => html.replace(/<fieldset[\s\S]*?<\/fieldset>/gi, " ");
const withoutForm = (html: string) => html.replace(/<form[\s\S]*?<\/form>/gi, " ");
const countryOptions = (html: string) => [...html.matchAll(/<option value="([A-Z]{2})"[^>]*>([\s\S]*?)<\/option>/g)].map((m) => [m[1], decode(m[2].replace(/<!-- -->/g, "")).replace(/\s+/g, " ").trim()]);
const facts = (html: string) => ({
  lang: pick(html, /<html[^>]*\blang="([^"]*)"/),
  dir: pick(html, /<html[^>]*\bdir="([^"]*)"/),
  title: decode(pick(html, /<title>([\s\S]*?)<\/title>/) ?? ""),
  description: decode(pick(html, /<meta name="description" content="([^"]*)"/) ?? ""),
  canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
  hreflang: [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/gi)].map((m) => `${pick(m[0], /hreflang="([^"]*)"/i)} ${pick(m[0], /href="([^"]*)"/)}`).sort(),
  robots: pick(html, /<meta name="robots" content="([^"]*)"/),
  jsonld: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]),
  metadataInHead: /<head[\s\S]*<title>[\s\S]*<\/head>/i.test(html),
});
const kind = (u: string) => (/\/products\/category\//.test(u) ? "category" : /\/products$/.test(u) ? "products" : /\/contact$/.test(u) ? "contact" : /\/products\//.test(u) ? "product" : "content");

const rows = [];
for (const page of pages) {
  const [s, r] = await Promise.all([fetch(STATIC + page), fetch(SSR + ssrUrl(page))]);
  const [sh, rh] = [await s.text(), await r.text()];
  const fs_ = facts(sh), fr = facts(rh);
  const diffFields = Object.keys(fs_).filter((k) => JSON.stringify(fs_[k as keyof typeof fs_]) !== JSON.stringify(fr[k as keyof typeof fr]));
  const textEqual = text(sh) === text(rh);
  if (!textEqual) diffFields.push("text");
  const k = kind(page);
  const explained: Record<string, string> = {};
  if (diffFields.includes("metadataInHead")) explained.metadataInHead = "STATIC-EXPORT: export puts <title>/meta/hreflang in <head>; SSR streams them at the end of <body> (same values)";
  if (k === "category") {
    for (const f of ["title", "canonical", "hreflang"]) if (diffFields.includes(f)) explained[f] = "A2: own static URL /products/category/<segment> (canonical, hreflang and title name the category)";
  }
  if (diffFields.includes("text") && (k === "category" || k === "products")) {
    if (text(withoutFilterBar(sh)) === text(withoutFilterBar(rh))) explained.text = "A3: identical once the filter bar is removed — only the family/form/grade/standard facets are gone";
  }
  if (diffFields.includes("text") && k === "contact") {
    const outside = text(withoutForm(sh)) === text(withoutForm(rh));
    const so = countryOptions(sh), ro = countryOptions(rh);
    const sameCountries = so.length === ro.length && so.every(([iso], i) => ro[i][0] === iso);
    const staticIsoOnly = so.every(([iso, label]) => new RegExp(`^\\+\\d+ ${iso}$`).test(label));
    if (outside && sameCountries && staticIsoOnly) explained.text = "A7 + static /contact: identical outside the form; inside it, country options are '+<dial> <ISO>' until hydration (no Intl text in static HTML) and the catalog selects fill from /data/rfq-catalog.<locale>.json after hydration";
  }
  const unexplained = diffFields.filter((f) => !explained[f]);
  rows.push({ page, ssr: ssrUrl(page), kind: k, staticStatus: s.status, ssrStatus: r.status, diffFields, explained, unexplained, ...(unexplained.length ? { static: Object.fromEntries(unexplained.filter((f) => f !== "text").map((f) => [f, fs_[f as keyof typeof fs_]])), ssrValue: Object.fromEntries(unexplained.filter((f) => f !== "text").map((f) => [f, fr[f as keyof typeof fr]])) } : {}) });
}
server.close();
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
const summary: Record<string, { pages: number; identicalExceptPlacement: number; unexplained: number }> = {};
for (const r of rows) {
  const s = (summary[r.kind] ??= { pages: 0, identicalExceptPlacement: 0, unexplained: 0 });
  s.pages++;
  if (r.diffFields.every((f) => f === "metadataInHead")) s.identicalExceptPlacement++;
  if (r.unexplained.length) s.unexplained++;
}
console.log(JSON.stringify({ pages: rows.length, non200: rows.filter((r) => r.staticStatus !== 200 || r.ssrStatus !== 200).map((r) => r.page), summary, unexplainedPages: rows.filter((r) => r.unexplained.length).map((r) => `${r.page}: ${r.unexplained.join(",")}`) }, null, 1));
