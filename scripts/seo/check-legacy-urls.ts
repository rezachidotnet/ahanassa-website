/**
 * Legacy URL check (W16.2, docs/seo/LEGACY_REDIRECT_MAP.md): every pre-v11 URL must end on its v11 page.
 * Run it BEFORE the legacy cleanup (and again after):
 *
 *   node scripts/seo/check-legacy-urls.ts --base https://www.ahanassa.com     # the live site, hop by hop
 *   node scripts/seo/check-legacy-urls.ts --artifact .artifact/public-assets  # a built artifact, offline
 *
 * A row passes when the chain is only permanent redirects (301/308) and ends 200 on the expected path.
 * `browser_replace` rows (?category=) check that the target page answers 200; `zone` rows (apex/http)
 * are checked live only. Exit 1 on any failure.
 */
import fs from "node:fs";
import path from "node:path";
import { legacyUrlInventory, parseRedirectRules, resolveRedirects, type LegacyUrl } from "../../lib/seo/legacy-urls.ts";
import { resolveAsset } from "../static/serve.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const base = args.get("base")?.replace(/\/$/, "");
const artifact = args.get("artifact");
if (!base === !artifact) {
  console.error("usage: check-legacy-urls.ts --base https://www.ahanassa.com | --artifact <public-assets dir>");
  process.exit(2);
}

const PERMANENT = new Set([301, 308]);
type Result = { row: LegacyUrl; ok: boolean; detail: string };

async function checkLive(row: LegacyUrl): Promise<Result> {
  let url = row.via === "browser_replace" ? `${base}${row.to}` : /^https?:/.test(row.from) ? row.from : `${base}${row.from}`;
  const chain: string[] = [];
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "ahanassa-legacy-url-check/1" } });
    chain.push(String(res.status));
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (!PERMANENT.has(res.status)) return { row, ok: false, detail: `temporary ${res.status} (${chain.join("→")})` };
      url = new URL(location, url).toString();
      continue;
    }
    const final = new URL(url);
    const want = new URL(row.to, base);
    const ok = res.status === 200 && final.host === want.host && final.pathname.replace(/\/$/, "") === want.pathname.replace(/\/$/, "");
    return { row, ok, detail: `${chain.join("→")} ${final.pathname}` };
  }
  return { row, ok: false, detail: `too many hops (${chain.join("→")})` };
}

function checkArtifact(row: LegacyUrl, root: string, rules: ReturnType<typeof parseRedirectRules>): Result {
  if (row.via === "zone") return { row, ok: true, detail: "zone rule (live check only)" };
  const start = row.via === "browser_replace" ? row.to : row.from;
  const { path: final, statuses } = resolveRedirects(start, rules);
  if (statuses.some((s) => !PERMANENT.has(s))) return { row, ok: false, detail: `temporary redirect in chain (${statuses.join("→")})` };
  const { status } = resolveAsset(root, final);
  return { row, ok: status === 200 && final === row.to, detail: `${[...statuses, status].join("→")} ${final}` };
}

const rows = legacyUrlInventory();
let results: Result[];
if (artifact) {
  const root = path.resolve(artifact);
  const rules = parseRedirectRules(fs.readFileSync(path.join(root, "_redirects"), "utf8"));
  results = rows.map((r) => checkArtifact(r, root, rules));
} else {
  results = [];
  for (const row of rows) results.push(await checkLive(row).catch((e: unknown) => ({ row, ok: false, detail: String(e) })));
}
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.row.via.padEnd(15)} ${r.row.from}  ->  ${r.row.to}   [${r.detail}]`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} legacy URLs land on their v11 page.`);
process.exit(failed.length ? 1 : 0);
