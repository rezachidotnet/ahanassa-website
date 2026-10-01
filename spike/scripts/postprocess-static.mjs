// Spike S1 — post-export step for the fully static site (dist/client).
//
// 1. Loads the app's OWN modules through Vite SSR (same aliases, same
//    fixture-backed DB_PUBLIC shim) — no query logic duplicated — and emits:
//      /data/rfq-catalog.<locale>.json   (listRfqSelectableCatalogItems)
//      /robots.txt                       (app/robots.ts)
//      /sitemap.xml                      (app/sitemap.ts)
//      spike/out/rfq-variant-index.json  (rows for the RFQ Worker's index table; not public)
// 2. Moves the fa locale to the root (fa has no visible prefix).
// 3. Writes _headers (security headers; staging X-Robots-Tag) and _redirects.
// 4. Writes /data/manifest.json with SHA-256 of every file.
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "dist/client");
const appEnv = process.env.APP_ENV ?? "staging";
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const fixturePath = path.join(root, "spike/fixture/db-public.json");
const snapshotVersion = `snap-${sha(fs.readFileSync(fixturePath)).slice(0, 16)}`;

const vite = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  resolve: { alias: { "@": root, "cloudflare:workers": path.join(root, "spike/static/cf-workers-shim.ts") } },
});
const load = (p) => vite.ssrLoadModule(path.join(root, p));
const repo = await load("lib/catalog/editorial-repository.ts");
const { locales } = await load("config/locales.ts");
const robots = (await load("app/robots.ts")).default;
const sitemap = (await load("app/sitemap.ts")).default;

fs.mkdirSync(path.join(out, "data"), { recursive: true });
const indexRows = [];
const counts = {};
for (const locale of locales) {
  const items = await repo.listRfqSelectableCatalogItems(locale);
  counts[`rfq_variants_${locale}`] = items.length;
  fs.writeFileSync(path.join(out, `data/rfq-catalog.${locale}.json`), JSON.stringify({ snapshot_version: snapshotVersion, locale, items }));
  for (const item of items) {
    const { publicCategoryCode, publicCategoryLabel, ...selection } = item;
    indexRows.push({ snapshot_version: snapshotVersion, locale, variant_xid: item.variantXid, template_xid: item.templateXid, group_code: item.groupCode, selection_json: JSON.stringify(selection) });
  }
}
fs.mkdirSync(path.join(root, "spike/out"), { recursive: true });
fs.writeFileSync(path.join(root, "spike/out/rfq-variant-index.json"), JSON.stringify({ snapshot_version: snapshotVersion, rows: indexRows }));

// robots.txt / sitemap.xml from the app's own metadata route functions.
const r = robots();
const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
let robotsTxt = rules.map((rule) => [`User-Agent: ${rule.userAgent}`, ...[].concat(rule.allow ?? []).map((a) => `Allow: ${a}`), ...[].concat(rule.disallow ?? []).map((d) => `Disallow: ${d}`)].join("\n")).join("\n\n");
if (r.sitemap) robotsTxt += `\n\nSitemap: ${r.sitemap}`;
fs.writeFileSync(path.join(out, "robots.txt"), robotsTxt + "\n");
const sm = await sitemap();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm.map((e) => `<url><loc>${esc(e.url)}</loc>${e.lastModified ? `<lastmod>${esc(new Date(e.lastModified).toISOString())}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`,
);
counts.sitemap_urls = sm.length;
await vite.close();

// Localized static 404 pages from the build-only static-404 route.
for (const locale of locales) {
  const src = path.join(out, locale, "static-404.html");
  const dest = locale === "fa" ? path.join(out, "404.html") : path.join(out, locale, "404.html");
  fs.renameSync(src, dest);
  fs.rmSync(path.join(out, locale, "static-404.rsc"), { force: true });
}

// fa at the root: fa.html -> index.html, fa/* -> /*.
fs.renameSync(path.join(out, "fa.html"), path.join(out, "index.html"));
fs.renameSync(path.join(out, "fa.rsc"), path.join(out, "index.rsc"));
for (const entry of fs.readdirSync(path.join(out, "fa"))) {
  if (entry === "404.html") continue;
  fs.renameSync(path.join(out, "fa", entry), path.join(out, entry));
}
fs.rmdirSync(path.join(out, "fa"));

// Static replacements for proxy.ts.
const security = [
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  X-Frame-Options: DENY",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  `  Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com${process.env.SPIKE_RFQ_ENDPOINT ? " " + new URL(process.env.SPIKE_RFQ_ENDPOINT).origin : ""}; frame-src 'self' https://challenges.cloudflare.com; upgrade-insecure-requests`,
];
if (appEnv !== "production") security.push("  X-Robots-Tag: noindex, nofollow");
fs.writeFileSync(
  path.join(out, "_headers"),
  ["/*", ...security, "", "/_next/static/*", "  Cache-Control: public, max-age=31536000, immutable", "", "/data/*", "  Cache-Control: public, max-age=300", ""].join("\n"),
);
fs.writeFileSync(
  path.join(out, "_redirects"),
  ["/fa /  308", "/fa/* /:splat 308", "/request /contact 308", "/en/request /en/contact 308", "/ar/request /ar/contact 308", ""].join("\n"),
);

// Manifest with SHA-256 of every file (artifact identity).
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(out);
const fileEntries = files.map((f) => ({ path: "/" + path.relative(out, f), bytes: fs.statSync(f).size, sha256: sha(fs.readFileSync(f)) })).sort((a, b) => a.path.localeCompare(b.path));
const codeSha = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
fs.writeFileSync(
  path.join(out, "data/manifest.json"),
  JSON.stringify({ snapshot_version: snapshotVersion, code_sha: codeSha, app_env: appEnv, generated_at: new Date().toISOString(), counts, file_count: fileEntries.length + 1, files: fileEntries }, null, 1),
);
console.log(JSON.stringify({ snapshotVersion, counts, files: fileEntries.length + 1, largest: fileEntries.reduce((a, b) => (b.bytes > a.bytes ? b : a)) }));
