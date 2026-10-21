/**
 * W11.6 — the website's en/ar article text rules on raw content-repository article files, for the content
 * repository (rezachidotnet/ahanassa-content) to run before a merge: the same `enPriceFindings` / `arPlaceFindings`
 * the website's validate step and artifact gate run (lib/articles/validate.ts `articleTextFindings`), so an article
 * that passes here does not fail the website on its text. Every finding quotes the offending sentence.
 *
 *   node scripts/articles/check-article-text.ts [--prices <file.json>] [--json] <article.md | directory>...
 *
 * - A file must sit at `…/articles/{fa,ar,en}/YYYY/MM/<slug>.md` (the locale comes from the path); a directory is
 *   searched for such files. fa files have no text rule here and always pass.
 * - `--prices`: a snapshot.v1 file or a JSON array of published_prices rows — adds the snapshot-amount (en) and
 *   factory/location (ar) rules. Without it those two rules have nothing to compare.
 * - `--json`: one JSON object `{ ok, files, findings: [{ file, finding }] }` on stdout.
 *
 * Exit 0 = clean, 1 = findings, 2 = usage or read error. Run from a checkout of this repository after `npm ci`.
 */
import fs from "node:fs";
import path from "node:path";
import { articleTextFindings } from "../../lib/articles/validate.ts";
import { irrToToman, type PublishedPriceRow } from "../../lib/contracts/snapshot-prices.ts";

const ARTICLE = /(?:^|\/)(articles\/(?:fa|ar|en)\/\d{4}\/\d{2}\/[^/]+\.md)$/;

function usage(message: string): never {
  console.error(`${message}\nusage: node scripts/articles/check-article-text.ts [--prices <file.json>] [--json] <article.md | directory>...`);
  process.exit(2);
}

const argv = process.argv.slice(2);
let pricesFile: string | undefined;
let json = false;
const targets: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json") json = true;
  else if (argv[i] === "--prices") pricesFile = argv[++i] ?? usage("--prices needs a file");
  else if (argv[i].startsWith("--")) usage(`unknown option ${argv[i]}`);
  else targets.push(argv[i]);
}
if (!targets.length) usage("no article file or directory given");

let priceAmounts: number[] = [];
let priceNames: string[] = [];
if (pricesFile) {
  const doc = JSON.parse(fs.readFileSync(pricesFile, "utf8")) as PublishedPriceRow[] | { tables?: { published_prices?: PublishedPriceRow[] } };
  const rows = Array.isArray(doc) ? doc : (doc.tables?.published_prices ?? usage(`${pricesFile}: no published_prices rows`));
  priceAmounts = [...new Set(rows.flatMap((p) => [irrToToman(p.price_irr_per_kg), p.price_irr_per_kg]))];
  priceNames = [...new Set(rows.flatMap((p) => [p.factory_name_fa, p.location_fa]))];
}

const files: { shown: string; contentPath: string; abs: string }[] = [];
const add = (abs: string) => {
  const m = ARTICLE.exec(abs.split(path.sep).join("/"));
  if (!m) usage(`${abs}: not an article file (articles/{fa,ar,en}/YYYY/MM/<slug>.md)`);
  files.push({ shown: path.relative(process.cwd(), abs) || abs, contentPath: m[1], abs });
};
for (const t of targets) {
  const abs = path.resolve(t);
  if (!fs.existsSync(abs)) usage(`${t}: not found`);
  if (fs.statSync(abs).isDirectory()) {
    for (const f of fs.readdirSync(abs, { recursive: true }) as string[]) if (ARTICLE.test(path.join(abs, f).split(path.sep).join("/"))) add(path.join(abs, f));
  } else add(abs);
}
files.sort((a, b) => a.contentPath.localeCompare(b.contentPath));

const findings = files.flatMap((f) => articleTextFindings({ path: f.contentPath, content: fs.readFileSync(f.abs, "utf8") }, { priceAmounts, priceNames }).map((finding) => ({ file: f.shown, finding })));
if (json) console.log(JSON.stringify({ ok: findings.length === 0, files: files.length, findings }, null, 1));
else {
  for (const f of findings) console.log(`FAIL ${f.file}: ${f.finding}`);
  console.log(`${files.length} article file(s) checked: ${findings.length ? `${findings.length} finding(s)` : "clean"}`);
}
process.exit(findings.length ? 1 : 0);
