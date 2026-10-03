/**
 * Gate tests on LOCAL COPIES only (W4 Part E 21/22) — never touches Odoo or D1.
 *
 *   node scripts/content/simulate.ts remove-family --from <work> --to <work2> --family <CODE>
 *     Copies a fetched work dir and removes every product of one family, as Odoo would publish it
 *     (categories left without products disappear, §8.1; the others' counts are recomputed).
 *     Then: node scripts/content/validate.ts --work <work2> [--allow-decrease]
 *
 *   node scripts/content/simulate.ts inject-leak --from <artifactDir> --to <artifactDir2>
 *     Copies an artifact, injects a forbidden field (`cost_price`) into data/rfq-catalog.en.json and
 *     a Persian sentence into en/about.html, and re-writes the manifest checksums (so only the leak
 *     scan, not the checksum check, can catch them). Then: npm run static:gate -- <artifactDir2>
 */
import fs from "node:fs";
import path from "node:path";
import { artifactManifest } from "../../lib/contracts/artifact-v1.ts";
import type { OdooSource } from "../../lib/content-pipeline/odoo-source.ts";
import { describeFiles } from "../../lib/static/artifact-gate.ts";
import { parseArgs, paths, readJson, workDir, writeJson } from "./common.ts";

const mode = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (mode === "remove-family") {
  const from = paths(workDir(args.get("from")));
  const toDir = workDir(args.get("to"));
  const to = paths(toDir);
  const family = args.get("family");
  if (!family) throw new Error("--family <CODE> is required");
  fs.cpSync(path.dirname(from.odoo), path.dirname(to.odoo), { recursive: true });
  const odoo = readJson<OdooSource>(to.odoo);
  const before = odoo.products.length;
  odoo.products = odoo.products.filter((p) => p.classification.family.code !== family);
  odoo.products_reported_total = odoo.products.length;
  for (const locale of ["fa", "en", "ar"] as const) {
    odoo.categories[locale] = odoo.categories[locale]
      .map((c) => {
        const inCat = odoo.products.filter((p) => p.classification.group.code && c.group_codes.includes(p.classification.group.code));
        return { ...c, variant_count: inCat.length, template_count: new Set(inCat.map((p) => p.canonical_template_id)).size };
      })
      .filter((c) => c.variant_count > 0);
  }
  writeJson(to.odoo, odoo);
  console.log(JSON.stringify({ family, products_before: before, products_after: odoo.products.length, categories_after: odoo.categories.fa.map((c) => c.code) }));
} else if (mode === "inject-leak") {
  const from = path.resolve(args.get("from") ?? "");
  const to = path.resolve(args.get("to") ?? "");
  if (!fs.existsSync(path.join(from, "manifest.json"))) throw new Error("--from must be an artifact directory");
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  const catalogPath = path.join(to, "public-assets/data/rfq-catalog.en.json");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as { items: Record<string, unknown>[] };
  catalog.items[0] = { ...catalog.items[0], cost_price: 1234 };
  fs.writeFileSync(catalogPath, JSON.stringify(catalog));
  const aboutPath = path.join(to, "public-assets/en/about.html");
  fs.writeFileSync(aboutPath, fs.readFileSync(aboutPath, "utf8").replace("</main>", "<p>قیمت خرید تامین کننده</p></main>"));
  const manifestPath = path.join(to, "manifest.json");
  const manifest = artifactManifest.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  manifest.public_assets = describeFiles(path.join(to, "public-assets"));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  console.log(JSON.stringify({ injected: ["data/rfq-catalog.en.json: cost_price", "en/about.html: «قیمت خرید تامین کننده»"], artifact: to }));
} else {
  throw new Error("usage: simulate.ts remove-family|inject-leak ...");
}
