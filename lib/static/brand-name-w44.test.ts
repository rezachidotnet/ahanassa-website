import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkBrandName, LEGACY_LATIN_BRAND, scanBrandName } from "./brand-name-gate.ts";
import { BRAND_SCHEMA_NAMES, siteConfig, titleBrand, withCurrentLatinBrand } from "../metadata/site.ts";
import { buildPageMetadata } from "../metadata/resolve.ts";
import { localBusinessSchema, organizationSchema, websiteSchema } from "../seo/schema.ts";

/**
 * W44 (owner D-W44-BRAND, 2026-10-24; PROJECT_OVERRIDES.md §18): the Latin brand is «Ahan Assa». The legacy
 * «Ahan Asa» survives only as a JSON-LD alternateName. The artifact gate scans the built output
 * (lib/static/brand-name-gate.ts); the source scan below also covers what the gate cannot read as text (PDF
 * pages, share images, the price-channel and owner messages).
 */
const REPO = path.resolve(import.meta.dirname, "../..");

test("W44 gate: the legacy spelling in a title, meta, body, manifest, llms.txt or DXF fails", () => {
  const files = [
    { path: "en.html", content: "<title>Steel beams | Ahan Asa</title>" },
    { path: "en/about.md", content: "# About AhanAsa" },
    { path: "llms.txt", content: "# Ahan-Asa" },
    { path: "manifest.webmanifest", content: '{"name":"Ahan Asa"}' },
    { path: "downloads/ipe.dxf", content: "AHAN ASA  |  SECTION DRAWING" },
  ];
  assert.deepEqual(scanBrandName(files).map((f) => f.file), files.map((f) => f.path));
  assert.match(checkBrandName(files)[0], /^brand: legacy Latin name «Ahan Asa» in en\.html/);
});

test("W44 gate: the new name, file names/identifiers and a JSON-LD alternateName (plain or in the RSC payload) pass", () => {
  const ld = JSON.stringify({ "@type": "Organization", ...BRAND_SCHEMA_NAMES });
  const files = [
    { path: "en.html", content: `<title>Steel beams | Ahan Assa</title><img src="/brand/ahan-asa-mark-jpg-512w.jpg"><style>:root{--font-ahan-asa:x}</style><script type="application/ld+json">${ld}</script><script>self.__next_f.push([1,${JSON.stringify(ld)}])</script>` },
    { path: "llms.txt", content: "# Ahan Assa (آهن آسا)" },
    { path: "about.html", content: '{"alternateName":"Ahan Asa","name":"Ahan Assa"}' },
    // Not a scanned type: client JS may carry siteConfig.legacyLatinName without rendering it.
    { path: "assets/chunk.js", content: 'legacyLatinName:"Ahan Asa"' },
  ];
  assert.deepEqual(scanBrandName(files), []);
  // …but the legacy name next to an alternateName, outside it, still fails.
  assert.equal(scanBrandName([{ path: "x.html", content: `${ld} Ahan Asa` }]).length, 1);
});

test("W44 JSON-LD: Organization, LocalBusiness and WebSite are «Ahan Assa», alternateName «آهن آسا» and «Ahan Asa», on every locale", () => {
  assert.deepEqual(BRAND_SCHEMA_NAMES, { name: "Ahan Assa", alternateName: ["آهن آسا", "Ahan Asa"] });
  for (const locale of ["fa", "en", "ar"] as const) {
    for (const node of [organizationSchema(locale), localBusinessSchema(locale), websiteSchema()]) {
      assert.equal(node.name, "Ahan Assa");
      assert.deepEqual(node.alternateName, ["آهن آسا", "Ahan Asa"]);
    }
  }
});

test("W44 metadata: en title suffix and og:site_name are «Ahan Assa»; fa/ar keep «آهن آسا»", () => {
  assert.equal(siteConfig.name, "آهن آسا");
  assert.equal(titleBrand("en"), "Ahan Assa");
  assert.equal(titleBrand("fa"), "آهن آسا");
  for (const [locale, site] of [["en", "Ahan Assa"], ["fa", "آهن آسا"], ["ar", "آهن آسا"]] as const) {
    const meta = buildPageMetadata({ locale, path: "/about", title: "t", description: "d" });
    assert.equal((meta.openGraph as { siteName?: string }).siteName, site);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO, "app/manifest.webmanifest"), "utf8"));
  assert.equal(manifest.name, "Ahan Assa");
  assert.equal(manifest.short_name, "Ahan Assa");
});

test("W44 withCurrentLatinBrand: every legacy variant becomes «Ahan Assa»; «Ahan Assa» and identifiers are untouched", () => {
  assert.equal(withCurrentLatinBrand("Ahan Asa, AhanAsa and Ahan-Asa"), "Ahan Assa, Ahan Assa and Ahan Assa");
  assert.equal(withCurrentLatinBrand("Ahan Assa /brand/ahan-asa-mark.jpg"), "Ahan Assa /brand/ahan-asa-mark.jpg");
});

/** Source files whose strings reach a page, a PDF/DXF, a share image, an e-mail, a manifest or a channel post. */
const SOURCE_DIRS = ["app", "components", "config", "lib", "scripts", "styles", "public", "deploy/iran", "workers", "services"];
const SOURCE_FILE = /\.(tsx?|mjs|js|json|webmanifest|css|md|txt|svg|html|xml|py|service|timer|path)$/;
/** The definitions of the legacy spelling itself (and this gate's own messages) — nowhere else. */
const LEGACY_ALLOWED = new Set(["lib/metadata/site.ts", "lib/articles/validate.ts", "lib/static/brand-name-gate.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "_originals") walk(p, out);
    } else if (SOURCE_FILE.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

test("W44 source: no user-facing source (copy, PDFs, captions, e-mail, manifest, Iran mirror) spells the brand «Ahan Asa»", () => {
  const hits: string[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(REPO, dir))) {
      const rel = path.relative(REPO, file).split(path.sep).join("/");
      if (LEGACY_ALLOWED.has(rel)) continue;
      const text = fs.readFileSync(file, "utf8");
      // The immutable logo originals' file names (logo/AhanAsa logo-13.jpg) are a path, not the brand.
      for (const m of text.matchAll(LEGACY_LATIN_BRAND)) if (!text.startsWith("logo/", m.index! - 5)) hits.push(`${rel}: ${text.slice(Math.max(0, m.index! - 30), m.index! + 30)}`);
    }
  }
  assert.deepEqual(hits, []);
  // The allowed files hold it only where intended.
  assert.equal(siteConfig.legacyLatinName, "Ahan Asa");
});
