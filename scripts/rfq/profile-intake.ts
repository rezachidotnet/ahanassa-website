/**
 * RFQ intake CPU profile (W3, architecture V1.1 §4.3). Local only; never
 * deployed. Each sample runs in a FRESH Node process with
 * `--single-threaded` (no background compile/GC threads, like the isolate's
 * single CPU budget), so "first use" really is first use:
 *
 *   module     evaluation of the wrangler Worker bundle (global scope)
 *   steps      first and second call of each intake component, in pipeline order
 *   requests   12 full POST /api/rfqs through worker.fetch; CPU spent inside
 *              the local SQLite stand-in for D1 is subtracted (D1 is I/O in workerd)
 *
 *   node scripts/rfq/profile-intake.ts [--runs 7] [--wrangler-bundle <dry-run index.js>] [--out <json>]
 *
 * Numbers are Node CPU milliseconds on this machine: use them to compare
 * before/after and to rank cost centres; the staging tail is the acceptance source.
 */
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SELF = fileURLToPath(import.meta.url);

function cpuMs(start: NodeJS.CpuUsage): number {
  const d = process.cpuUsage(start);
  return (d.user + d.system) / 1000;
}

async function measure<T>(fn: () => Promise<T> | T): Promise<{ ms: number; value: T }> {
  const start = process.cpuUsage();
  const value = await fn();
  return { ms: cpuMs(start), value };
}

const SNAP = "snap-e55d81c754270c1f";
const ORIGIN = "https://static.example";

function body(i: number) {
  return {
    idempotencyKey: `profile-key-${String(i).padStart(4, "0")}-0123456789`,
    locale: "en",
    fullName: "Profile Buyer",
    email: "buyer@example.com",
    phoneCountry: "IR",
    phoneLocal: "9121234567",
    items: [
      { catalogVariantXid: "CVAR-000001", quantityText: "12", unit: "ton" },
      { freeformTitle: "Free text line", quantityText: "5", unit: "kg" },
    ],
    website: "",
    formRenderedAt: Date.now() - 60_000,
    turnstileToken: "token",
    catalogSnapshotVersion: SNAP,
  };
}

/** Wraps a D1 stand-in so the CPU spent inside it is accumulated (and later subtracted). */
function meteredD1(db: D1Database, meter: { ms: number }): D1Database {
  const timed = <F extends (...a: never[]) => unknown>(fn: F) =>
    (async (...args: Parameters<F>) => {
      const start = process.cpuUsage();
      try {
        return await fn(...args);
      } finally {
        meter.ms += cpuMs(start);
      }
    }) as unknown as F;
  const wrapStmt = (stmt: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(stmt, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver);
        if (prop === "bind") return (...a: unknown[]) => wrapStmt((v as (...x: unknown[]) => D1PreparedStatement).apply(target, a));
        if (prop === "first" || prop === "all" || prop === "run" || prop === "raw") return timed((v as (...x: never[]) => unknown).bind(target));
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  return new Proxy(db, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (prop === "prepare") return (sql: string) => wrapStmt((v as (s: string) => D1PreparedStatement).call(target, sql));
      if (prop === "batch") return timed((v as (...x: never[]) => unknown).bind(target));
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

async function child(mode: string, bundle: string): Promise<unknown> {
  // Everything that is NOT the Worker (test D1, fetch stub) is prepared before any measurement.
  const { SqliteD1, OPS_MIGRATIONS, PUBLIC_MIGRATIONS } = await import(pathToFileURL(path.join(ROOT, "lib/testing/sqlite-d1.ts")).href);
  globalThis.fetch = (async () => Response.json({ success: true, action: "rfq_submit", hostname: "static.example" })) as typeof fetch;

  if (mode === "module") {
    const m = await measure(() => import(pathToFileURL(bundle).href));
    return { moduleEvalMs: m.ms };
  }

  const mod = await measure(() => import(pathToFileURL(bundle).href));
  const P = mod.value;
  if (mode === "steps") {
    const b = body(1);
    const out: Record<string, number> = { moduleEvalMs: mod.ms };
    const twice = async (name: string, fn: () => unknown) => {
      out[`${name}.first`] = (await measure(fn)).ms;
      out[`${name}.second`] = (await measure(fn)).ms;
    };
    await twice("webcrypto.getRandomValues(runtime init)", () => crypto.getRandomValues(new Uint8Array(16)));
    await twice("webcrypto.subtle.digest(runtime init)", () => crypto.subtle.digest("SHA-256", new Uint8Array(4)));
    await twice("ulid", () => P.ulid());
    await twice("phone(libphonenumber)", () => P.validateAndComposeE164("IR", "9121234567"));
    await twice("contractCheck(checkRfqSubmitRequest)", () => P.checkRfqSubmitRequest(b));
    await twice("serverValidator(validateRfqSubmission)", () => P.validateRfqSubmission(b));
    await twice("sha256(fingerprint)", () => P.sha256Hex(P.stableStringify(b)));
    await twice("hashIdempotencyKey", () => P.hashIdempotencyKey(b.idempotencyKey));
    return out;
  }

  // requests
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const pub = new SqliteD1([PUBLIC_MIGRATIONS]);
  const now = new Date().toISOString();
  pub.sqlite.prepare(`INSERT INTO publication_state (version, created_at, status, updated_at) VALUES (?, ?, 'active', ?)`).run(SNAP, now, now);
  pub.sqlite.prepare(`INSERT INTO publication_pointer (id, active_version, updated_at) VALUES (1, ?, ?)`).run(SNAP, now);
  pub.sqlite
    .prepare(`INSERT INTO rfq_variant_index VALUES (?, 'en', 'CVAR-000001', 'CTMPL-000007', 'REBAR', '["kg","ton","branch"]', ?)`)
    .run(SNAP, JSON.stringify({ variantXid: "CVAR-000001", templateXid: "CTMPL-000007", sku: "SKU-1", variantSpecLabel: "Ø16", productLabel: "Rebar", templateSlug: "rebar", categoryCode: "LONG", categoryLabel: "Long", groupCode: "REBAR" }));
  const meter = { ms: 0 };
  const env = {
    DB_OPS: meteredD1(ops.asD1(), meter),
    DB_PUBLIC: meteredD1(pub.asD1(), meter),
    RFQ_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ALLOWED_ORIGINS: ORIGIN,
    TURNSTILE_EXPECTED_HOSTNAMES: "static.example",
    TURNSTILE_SECRET_KEY: "secret",
    ODOO_BASE_URL: "https://stub.example",
    ODOO_RFQ_API_TOKEN: "bearer",
    ODOO_INTAKE_V11: "1",
    QUEUE_FAST_PATH: "0",
  };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const requests: { status: number; ms: number; dbMs: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const req = new Request("https://api.example/api/rfqs", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(body(i)) });
    meter.ms = 0;
    const r = await measure(() => P.worker.fetch(req, env, ctx) as Promise<Response>);
    requests.push({ status: r.value.status, ms: +(r.ms - meter.ms).toFixed(3), dbMs: +meter.ms.toFixed(3) });
  }
  return { moduleEvalMs: mod.ms, requests };
}

function pct(values: number[], p: number): number {
  const a = [...values].sort((x, y) => x - y);
  return +a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)].toFixed(2);
}
const median = (v: number[]) => pct(v, 50);

async function main() {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  if (args.get("child")) {
    process.stdout.write(JSON.stringify(await child(args.get("child")!, args.get("bundle")!)));
    return;
  }
  const runs = Number(args.get("runs") ?? 7);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rfq-profile-"));
  const profileBundle = path.join(dir, "profile.mjs");
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [path.join(ROOT, "scripts/rfq/profile-entry.ts"), "--bundle", "--format=esm", "--platform=neutral", "--conditions=workerd,worker,browser", "--main-fields=module,main", "--external:node:*", "--external:cloudflare:*", `--outfile=${profileBundle}`, "--log-level=warning"], { stdio: "inherit" });
  const run = (mode: string, bundle: string) => {
    const r = spawnSync(process.execPath, ["--single-threaded", "--no-warnings", SELF, "--child", mode, "--bundle", bundle], { encoding: "utf8", cwd: ROOT });
    if (r.status !== 0) throw new Error(`${mode} child failed: ${r.stderr}`);
    return JSON.parse(r.stdout);
  };
  const result: Record<string, unknown> = { runs, node: process.version };
  const wranglerBundle = args.get("wrangler-bundle");
  if (wranglerBundle) {
    const evals = Array.from({ length: runs }, () => run("module", wranglerBundle).moduleEvalMs as number);
    result.wranglerBundle = { path: wranglerBundle, bytes: fs.statSync(wranglerBundle).size, moduleEvalMs: { median: median(evals), max: pct(evals, 100) } };
  }
  const steps = Array.from({ length: runs }, () => run("steps", profileBundle) as Record<string, number>);
  result.steps = Object.fromEntries(Object.keys(steps[0]).map((k) => [k, { median: median(steps.map((s) => s[k])), max: pct(steps.map((s) => s[k]), 100) }]));
  const reqRuns = Array.from({ length: runs }, () => run("requests", profileBundle) as { moduleEvalMs: number; requests: { status: number; ms: number; dbMs: number }[] });
  const first = reqRuns.map((r) => r.requests[0].ms);
  const steady = reqRuns.flatMap((r) => r.requests.slice(2).map((q) => q.ms));
  result.requests = {
    statuses: [...new Set(reqRuns.flatMap((r) => r.requests.map((q) => q.status)))],
    firstRequestMs: { median: median(first), max: pct(first, 100) },
    secondRequestMs: { median: median(reqRuns.map((r) => r.requests[1].ms)) },
    steadyMs: { p50: pct(steady, 50), p95: pct(steady, 95), max: pct(steady, 100) },
    dbStandInMsSubtracted: { median: median(reqRuns.flatMap((r) => r.requests.map((q) => q.dbMs))) },
  };
  fs.rmSync(dir, { recursive: true, force: true });
  const text = JSON.stringify(result, null, 1);
  if (args.get("out")) fs.writeFileSync(args.get("out")!, text);
  console.log(text);
}

await main();
