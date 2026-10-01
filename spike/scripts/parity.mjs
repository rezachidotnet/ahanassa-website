// Spike S1: parity between the static export (STATIC base) and the current
// SSR output rendered locally from the same fixture (SSR base). Compares,
// per page: normalized visible text, <title>, meta description, canonical,
// hreflang set, JSON-LD, <html lang/dir>.
import fs from "node:fs";

const [STATIC, SSR, OUT] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(new URL("../../dist/client/data/manifest.json", import.meta.url)));
const pages = manifest.files.map((f) => f.path).filter((p) => p.endsWith(".html") && !p.endsWith("404.html"));
const toUrl = (p) => {
  let u = p.replace(/\.html$/, "").replace(/\/index$/, "/");
  if (u === "/index") u = "/";
  return u;
};
const ssrUrl = (u) => {
  const m = u.match(/^(\/(?:en|ar))?\/products\/category\/([a-z-]+)$/);
  if (m) return `${m[1] ?? ""}/products?category=${m[2].toUpperCase().replace(/-/g, "_")}`;
  return u;
};
const pick = (html, re) => (html.match(re) ?? [])[1] ?? null;
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const decode = (s) => s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html) =>
  decode(
    html
      .replace(/<head[\s\S]*?<\/head>/i, " ")
      .replace(/<title>[\s\S]*?<\/title>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<template[\s\S]*?<\/template>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
const facts = (html) => ({
  lang: pick(html, /<html[^>]*\blang="([^"]*)"/),
  dir: pick(html, /<html[^>]*\bdir="([^"]*)"/),
  title: decode(pick(html, /<title>([\s\S]*?)<\/title>/)),
  description: decode(pick(html, /<meta name="description" content="([^"]*)"/)),
  canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
  hreflang: [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/gi)]
    .map((m) => `${pick(m[0], /hreflang="([^"]*)"/i)} ${pick(m[0], /href="([^"]*)"/)}`)
    .sort(),
  metadataInHead: /<head[\s\S]*<title>[\s\S]*<\/head>/i.test(html),
  robots: pick(html, /<meta name="robots" content="([^"]*)"/),
  jsonld: all(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
});
const wordDiff = (a, b) => {
  const A = a.split(" "), B = b.split(" ");
  const ca = new Map(); for (const w of A) ca.set(w, (ca.get(w) ?? 0) + 1);
  const cb = new Map(); for (const w of B) cb.set(w, (cb.get(w) ?? 0) + 1);
  const onlyA = [], onlyB = [];
  for (const [w, n] of ca) if ((cb.get(w) ?? 0) < n) onlyA.push(`${w}×${n - (cb.get(w) ?? 0)}`);
  for (const [w, n] of cb) if ((ca.get(w) ?? 0) < n) onlyB.push(`${w}×${n - (ca.get(w) ?? 0)}`);
  return { onlyStatic: onlyA, onlySsr: onlyB };
};

const rows = [];
for (const p of pages) {
  const u = toUrl(p);
  const [s, r] = await Promise.all([fetch(STATIC + u), fetch(SSR + ssrUrl(u))]);
  const [sh, rh] = [await s.text(), await r.text()];
  const fs_ = facts(sh), fr = facts(rh);
  const diffs = {};
  for (const k of Object.keys(fs_)) if (JSON.stringify(fs_[k]) !== JSON.stringify(fr[k])) diffs[k] = { static: fs_[k], ssr: fr[k] };
  const ts = text(sh), tr = text(rh);
  const textEqual = ts === tr;
  if (!textEqual) diffs.text = wordDiff(ts, tr);
  rows.push({ page: u, ssr: ssrUrl(u), staticStatus: s.status, ssrStatus: r.status, textEqual, textLen: [ts.length, tr.length], diffKeys: Object.keys(diffs), diffs });
}
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
const summary = {};
for (const row of rows) for (const k of row.diffKeys) summary[k] = (summary[k] ?? 0) + 1;
console.log(JSON.stringify({ pages: rows.length, identicalAll: rows.filter((r) => r.diffKeys.length === 0).length, diffCountsByField: summary, non200: rows.filter((r) => r.staticStatus !== 200 || r.ssrStatus !== 200).map((r) => r.page) }));
