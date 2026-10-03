/**
 * W4 E25 — synthetic intake calls that NEVER create an RFQ, for CPU measurement with the W3 method
 * (`wrangler tail` cpuTime per invocation). Each call is a valid rfq_submit.v1 body with a NEW
 * idempotency key and an INVALID Turnstile token, so the Worker runs CORS -> JSON -> contract ->
 * validation/fingerprint -> early idempotency lookup (first D1 use, DB_OPS) -> Turnstile Siteverify
 * and stops with 403 before the rate limiter, the variant query and any write. No Worker config change
 * (TURNSTILE_TEST_MODE stays off), so the variant-index query itself is not reachable without an RFQ.
 *
 *   node scripts/rfq/intake-cpu-probe.ts --out <file.jsonl> [--n 25] [--gap-ms 3000] [--snapshot snap-…] [--variant CVAR-…]
 */
import fs from "node:fs";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const out = args.get("out");
if (!out) throw new Error("--out <file.jsonl> is required");
const n = Number(args.get("n") ?? 25);
const gap = Number(args.get("gap-ms") ?? 3000);
const API = "https://api-staging.ahanassa.com/api/rfqs";
const ORIGIN = "https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev";
const LOCALES = ["en", "fa", "ar"] as const;

for (let i = 1; i <= n; i++) {
  const locale = LOCALES[(i - 1) % LOCALES.length];
  const body = {
    idempotencyKey: crypto.randomUUID(), locale, fullName: `W4 CPU probe ${i}`, email: `w4-cpu-probe-${i}@example.invalid`,
    phoneCountry: "IR", phoneLocal: "9120000000",
    items: [{ catalogVariantXid: args.get("variant") ?? "CVAR-000007", quantityText: "12", unit: "ton" }],
    message: `W4 CPU probe #${i} (invalid Turnstile token; never stored)`, website: "", formRenderedAt: Date.now() - 60_000,
    turnstileToken: "w4-cpu-probe-invalid-token", catalogSnapshotVersion: args.get("snapshot") ?? null,
  };
  const started = Date.now();
  const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(body) });
  const text = await r.text();
  const row = { i, at: new Date(started).toISOString(), status: r.status, ms: Date.now() - started, code: (() => { try { return (JSON.parse(text) as { code?: string; error?: string }).code ?? (JSON.parse(text) as { error?: string }).error; } catch { return text.slice(0, 60); } })() };
  fs.appendFileSync(out, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
  if (r.status === 201 || r.status === 200) throw new Error("probe unexpectedly accepted — stop");
  await new Promise((res) => setTimeout(res, gap));
}
