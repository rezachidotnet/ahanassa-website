/**
 * W3.1 soak (architecture V1.1 r3 §8.1): every INTERVAL minutes for HOURS hours
 * (defaults 15 min / 6 h = 24 RFQs) submit ONE RFQ to the staging RFQ Worker.
 * Needs TURNSTILE_TEST_MODE=1 on ahanassa-v11-rfq-staging for the window
 * (the dummy token is accepted only by the staging test path). Synthetic data,
 * delivery goes to the Odoo contract stub only. Logs carry no PII.
 *
 *   node scripts/rfq/soak.ts --out <dir> [--interval-min 15] [--hours 6] [--api https://api-staging.ahanassa.com/api/rfqs]
 * Writes <out>/soak.jsonl (one row per request) and <out>/soak-summary.json at the end.
 */
import fs from "node:fs";
import path from "node:path";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const out = args.get("out");
if (!out) throw new Error("--out <dir> is required");
const intervalMs = Number(args.get("interval-min") ?? 15) * 60_000;
const hours = Number(args.get("hours") ?? 6);
const API = args.get("api") ?? "https://api-staging.ahanassa.com/api/rfqs";
const ORIGIN = "https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev";
const total = Math.round((hours * 3_600_000) / intervalMs);
const LOCALES = ["en", "fa", "ar"] as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(out, { recursive: true });
const logFile = path.join(out, "soak.jsonl");
const startedAt = new Date();
const rows: Record<string, unknown>[] = [];

for (let n = 1; n <= total; n++) {
  const target = startedAt.getTime() + (n - 1) * intervalMs;
  if (n > 1) await sleep(Math.max(0, target - Date.now()));
  const locale = LOCALES[(n - 1) % LOCALES.length];
  const body = {
    idempotencyKey: crypto.randomUUID(), locale, fullName: `W3.1 Soak ${n}`, email: `w3-1-soak-${n}@example.invalid`,
    phoneCountry: "IR", phoneLocal: "9120000000",
    items: [{ catalogVariantXid: "CVAR-000007", quantityText: "12", unit: "ton" }, { freeformTitle: `W3.1 soak line ${n}`, quantityText: "5", unit: "kg" }],
    message: `W3.1 soak #${n}`, website: "", formRenderedAt: Date.now() - 60_000,
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX", catalogSnapshotVersion: "snap-e55d81c754270c1f",
  };
  const t = Date.now();
  let row: Record<string, unknown>;
  try {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { reference?: string; code?: string };
    row = { n, at: new Date(t).toISOString(), locale, status: r.status, reference: j.reference ?? null, code: j.code ?? null, latencyMs: Date.now() - t };
  } catch (err) {
    row = { n, at: new Date(t).toISOString(), locale, status: null, reference: null, error: String(err).slice(0, 120), latencyMs: Date.now() - t };
  }
  rows.push(row);
  fs.appendFileSync(logFile, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}

const ok = rows.filter((r) => r.status === 201).length;
const summary = {
  startedAt: startedAt.toISOString(), endedAt: new Date().toISOString(), total, submitted: rows.length, created201: ok,
  failures: rows.filter((r) => r.status !== 201).map((r) => ({ n: r.n, status: r.status, code: r.code ?? r.error })),
  references: rows.map((r) => r.reference).filter(Boolean),
};
fs.writeFileSync(path.join(out, "soak-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ done: true, ...summary, references: undefined }));
