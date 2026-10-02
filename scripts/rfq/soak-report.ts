/**
 * W3.1 soak report (architecture V1.1 r3 §8.1/§8.2): run AFTER the soak ended.
 *  1. reads <soak-dir>/soak.jsonl (+ soak-summary.json);
 *  2. queries Cloudflare GraphQL analytics for ahanassa-v11-rfq-staging over the soak window
 *     (invocations by status incl. exceededCpu, errors, CPU quantiles; 1102 = exceededCpu);
 *  3. checks in ahanassa-v11-ops-staging that every soak RFQ is synced to the stub;
 *  4. turns TURNSTILE_TEST_MODE back off by redeploying the committed staging config (unless --no-redeploy);
 *  5. writes AHANASSA_WEBSITE_SOAK_RESULT_<UTC>.md with PASS/FAIL.
 *
 *   node scripts/rfq/soak-report.ts --dir /Users/reza/claude-reports/ahanassa/w3_1-soak [--report-dir /Users/reza/claude-reports/ahanassa] [--no-redeploy]
 * Auth: CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) or the local wrangler OAuth login.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const flagSet = new Set<string>(argv.filter((a) => a === "--no-redeploy"));
const args = new Map<string, string>();
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--") && !flagSet.has(argv[i])) args.set(argv[i].slice(2), argv[++i]);
const dir = args.get("dir") ?? "/Users/reza/claude-reports/ahanassa/w3_1-soak";
const reportDir = args.get("report-dir") ?? path.dirname(dir);
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "a9fdf8a6e87898b9313fc31a0ad1a2a4";
const SCRIPT = "ahanassa-v11-rfq-staging";
const OPS_DB = "ahanassa-v11-ops-staging";

const rows = fs.readFileSync(path.join(dir, "soak.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { n: number; at: string; status: number | null; reference: string | null; latencyMs: number; code?: string });
const expected = Number(JSON.parse(fs.existsSync(path.join(dir, "soak-summary.json")) ? fs.readFileSync(path.join(dir, "soak-summary.json"), "utf8") : "{}").total ?? 24);
const winStart = new Date(new Date(rows[0].at).getTime() - 60_000).toISOString();
const winEnd = new Date(new Date(rows[rows.length - 1].at).getTime() + 20 * 60_000).toISOString(); // + cron delivery tail

function token(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const toml = fs.readFileSync(path.join(os.homedir(), "Library/Preferences/.wrangler/config/default.toml"), "utf8");
  const m = /oauth_token\s*=\s*"([^"]+)"/.exec(toml);
  if (!m) throw new Error("no Cloudflare credentials (set CLOUDFLARE_API_TOKEN or run wrangler login)");
  return m[1];
}

async function gql(query: string, variables: object) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const j = (await r.json()) as { data?: any; errors?: { message: string }[] };
  if (j.errors?.length) throw new Error(`GraphQL: ${j.errors.map((e) => e.message).join("; ")}`);
  return j.data;
}

// 1) Cloudflare analytics (not tail)
const data = await gql(
  `query($acc:String!,$script:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$acc}){
     byStatus: workersInvocationsAdaptive(limit:100, filter:{scriptName:$script, datetime_geq:$s, datetime_leq:$e}){ dimensions{status} sum{requests errors subrequests} }
     cpu: workersInvocationsAdaptive(limit:1, filter:{scriptName:$script, datetime_geq:$s, datetime_leq:$e}){ sum{requests errors} quantiles{cpuTimeP50 cpuTimeP99 cpuTimeP999} }
  }}}`,
  { acc: ACCOUNT_ID, script: SCRIPT, s: winStart, e: winEnd },
);
const acct = data.viewer.accounts[0];
const byStatus: Record<string, number> = {};
for (const r of acct.byStatus) byStatus[r.dimensions.status] = (byStatus[r.dimensions.status] ?? 0) + r.sum.requests;
const errorsTotal = acct.byStatus.reduce((a: number, r: any) => a + r.sum.errors, 0);
const q = acct.cpu[0]?.quantiles ?? {};
const exceededCpu = byStatus["exceededCpu"] ?? 0; // Cloudflare error 1102 = Worker exceeded CPU time limit
const invocations = Object.values(byStatus).reduce((a, b) => a + b, 0);

// 2) Delivery to the stub
const refs = rows.map((r) => r.reference).filter((x): x is string => !!x);
const sql = `SELECT reference_number, sync_status, odoo_rfq_reference FROM rfqs WHERE reference_number IN (${refs.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")})`;
const d1 = spawnSync("npx", ["wrangler", "d1", "execute", OPS_DB, "--remote", "--json", "--command", sql, "--config", "workers/rfq/wrangler.jsonc", "--env", "staging"], { encoding: "utf8" });
if (d1.status !== 0) throw new Error(`D1 query failed: ${d1.stderr}`);
const d1rows = (JSON.parse(d1.stdout)[0]?.results ?? []) as { reference_number: string; sync_status: string; odoo_rfq_reference: string | null }[];
const delivered = d1rows.filter((r) => r.sync_status === "synced" && r.odoo_rfq_reference && r.odoo_rfq_reference.startsWith("STUB-"));
const notDelivered = refs.filter((r) => !delivered.some((d) => d.reference_number === r));

// 3) Turn test mode back off: redeploy the committed config (which has no TURNSTILE_TEST_MODE var)
let redeploy = "skipped (--no-redeploy)";
if (!flagSet.has("--no-redeploy")) {
  const dep = spawnSync("npx", ["wrangler", "deploy", "--config", "workers/rfq/wrangler.jsonc", "--env", "staging"], { encoding: "utf8" });
  const ver = /Current Version ID:\s*(\S+)/.exec(dep.stdout + dep.stderr)?.[1];
  redeploy = dep.status === 0 ? `ok, version ${ver ?? "?"}` : `FAILED: ${(dep.stderr || dep.stdout).slice(-300)}`;
}

// 4) Verdict vs r3 §8.1
const lat = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
const checks = [
  ["all requests were submitted", rows.length === expected, `${rows.length}/${expected}`],
  ["all responses 201", rows.every((r) => r.status === 201), `${rows.filter((r) => r.status === 201).length}/${rows.length}`],
  ["zero exceededCpu (analytics)", exceededCpu === 0, String(exceededCpu)],
  ["zero 1102 (= exceededCpu; no other Worker-limit errors)", exceededCpu === 0 && !("exceededResources" in byStatus), JSON.stringify(byStatus)],
  ["all soak RFQs synced to the stub", notDelivered.length === 0 && refs.length === rows.length, `${delivered.length}/${rows.length}`],
  ["Turnstile test mode switched off again", redeploy.startsWith("ok") || flagSet.has("--no-redeploy"), redeploy],
] as const;
const pass = checks.every((c) => c[1]);

const utc = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const file = path.join(reportDir, `AHANASSA_WEBSITE_SOAK_RESULT_${utc}.md`);
const us = (v: unknown) => (typeof v === "number" ? `${(v / 1000).toFixed(2)} ms` : "n/a");
fs.writeFileSync(
  file,
  `# Ahan Asa website — W3.1 soak result (r3 §8.1)

**Verdict: ${pass ? "PASS" : "FAIL"}**

Window: ${rows[0].at} → ${rows[rows.length - 1].at} (analytics window ${winStart} → ${winEnd}). Worker: ${SCRIPT}.

| Check | Result | Value |
|---|---|---|
${checks.map((c) => `| ${c[0]} | ${c[1] ? "PASS" : "FAIL"} | ${c[2]} |`).join("\n")}

## Cloudflare analytics (workersInvocationsAdaptive)
- Invocations by status: ${JSON.stringify(byStatus)} (total ${invocations}; errors ${errorsTotal})
- CPU quantiles over all invocations (incl. cron): p50 ${us(q.cpuTimeP50)}, p99 ${us(q.cpuTimeP99)}, p99.9 ${us(q.cpuTimeP999)}
- exceededCpu / 1102: ${exceededCpu}

## Client side (soak.jsonl)
- Latency (wall, incl. network): min ${lat[0]} ms, median ${lat[Math.floor(lat.length / 2)]} ms, max ${lat[lat.length - 1]} ms
- Non-201: ${JSON.stringify(rows.filter((r) => r.status !== 201).map((r) => ({ n: r.n, status: r.status, code: r.code })))}

## Delivery to the Odoo stub (${OPS_DB})
- synced with STUB reference: ${delivered.length}/${rows.length}
- not delivered: ${JSON.stringify(notDelivered)}

## Cleanup
- TURNSTILE_TEST_MODE → off: ${redeploy}
`,
);
console.log(file);
console.log(pass ? "PASS" : "FAIL");
