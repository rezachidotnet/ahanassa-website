/**
 * W30 (W29 P1 §2.2, go/no-go 1) — parity of the domestic copy with the static Worker, over HTTP:
 *
 *   node scripts/iran/parity.ts --a https://www.ahanassa.com --b https://new.ahanassa.ir --artifact <public-assets dir>
 *        [--out report.json] [--concurrency 4] [--unknown 30] [--seed 1] [--explain explained.json]
 *
 * Staging: --a https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev --b https://staging.ahanassa.ir
 *
 * Both hosts must serve the artifact's snapshot_version (manifest.public.json); otherwise nothing is compared (exit 2).
 * The request matrix: every artifact path; each page as /x, /x/, /x.html and /x?query; every `_redirects` source (+ a
 * splat example, + a query); unknown paths per locale; an unknown chunk name; HEAD for every page. Compared: status,
 * Location (path + query), Content-Type, Cache-Control, X-Robots-Tag, the `/*` security headers (CSP exactly — P1 serves
 * the same `_headers`), Content-Signal, Vary (ignoring Accept-Encoding) and the sha256 of the decoded body.
 * Exit 0 = zero unexplained differences (the P1 gate), 1 = differences (see the report), 2 = not comparable.
 * Read-only GETs/HEADs; polite concurrency. Run from outside Iran AND from an Iranian network (RUNBOOK_P1.md §7).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { listFiles } from "../../lib/static/artifact-gate.ts";
import { parseRedirects } from "./render-nginx.ts";

export interface ParityRequest {
  method: "GET" | "HEAD";
  path: string;
  why: string;
}

export const COMPARED_HEADERS = [
  "location",
  "content-type",
  "cache-control",
  "x-robots-tag",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "content-security-policy-report-only",
  "content-security-policy",
  "content-signal",
  "vary",
] as const;

/** Deterministic PRNG (mulberry32): the same seed gives the same "random" unknown paths, so a rerun compares the same matrix. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The clean URL of an exported HTML file (fa unprefixed: index.html -> /, about.html -> /about, en/x/index.html -> /en/x). */
export function pageUrl(file: string): string {
  const p = `/${file.replace(/\.html$/, "")}`.replace(/\/index$/, "");
  return p === "" || p === "/index" ? "/" : p;
}

export function buildRequestMatrix(publicPaths: readonly string[], redirects: string, opts: { unknown?: number; seed?: number } = {}): ParityRequest[] {
  const out: ParityRequest[] = [];
  const seen = new Set<string>();
  const add = (method: "GET" | "HEAD", p: string, why: string) => {
    const key = `${method} ${p}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ method, path: p, why });
    }
  };
  for (const f of publicPaths) add("GET", `/${f.split("/").map(encodeURIComponent).join("/")}`, "artifact file");
  for (const f of publicPaths.filter((p) => p.endsWith(".html") && !p.endsWith("404.html"))) {
    const u = pageUrl(f);
    add("GET", u, "page");
    add("HEAD", u, "page (HEAD)");
    add("GET", `${u}?ahanassa-parity=1`, "page + query");
    if (u !== "/") {
      add("GET", `${u}/`, "page + trailing slash");
      add("GET", `${u}.html`, "page + .html");
    }
  }
  // Directories that hold pages but have no page of their own (html_handling: /d -> /d/ or 404).
  const dirs = new Set(publicPaths.filter((p) => p.includes("/")).map((p) => `/${p.slice(0, p.lastIndexOf("/"))}`));
  for (const d of [...dirs].sort()) add("GET", d, "directory");
  for (const r of parseRedirects(redirects)) {
    if (r.source.endsWith("/*")) {
      add("GET", `${r.source.slice(0, -1)}ahanassa-parity`, "_redirects splat");
      add("GET", `${r.source.slice(0, -1)}ahanassa-parity?x=1`, "_redirects splat + query");
      add("GET", r.source.slice(0, -1), "_redirects splat, empty");
    } else {
      add("GET", r.source, "_redirects source");
      add("GET", `${r.source}?x=1`, "_redirects source + query");
    }
  }
  const rnd = prng(opts.seed ?? 1);
  const word = () => Array.from({ length: 6 + Math.floor(rnd() * 8) }, () => "abcdefghijklmnopqrstuvwxyz0123456789-"[Math.floor(rnd() * 37)]).join("");
  for (const prefix of ["", "/en", "/ar"]) {
    for (let i = 0; i < (opts.unknown ?? 30); i++) add("GET", `${prefix}/${i % 3 === 2 ? `${word()}/${word()}` : word()}${i % 5 === 4 ? ".html" : ""}`, "unknown path");
  }
  add("GET", "/_next/static/chunks/ahanassa-parity-missing.js", "unknown chunk");
  return out;
}

export interface Observed {
  status: number;
  headers: Record<string, string>;
  bodySha256: string | null;
}

/** Comparable value of one header (null = absent). */
export function normalizeHeader(name: string, value: string | undefined, host: string): string | null {
  if (value === undefined) return null;
  const v = value.trim();
  if (name === "location") {
    try {
      const u = new URL(v, `https://${host}`);
      return u.host === host ? `${u.pathname}${u.search}` : u.toString();
    } catch {
      return v;
    }
  }
  if (name === "content-type") return v.toLowerCase().replace(/\s+/g, "");
  if (name === "cache-control") return v.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean).sort().join(", ");
  if (name === "vary") {
    const tokens = v.toLowerCase().split(",").map((s) => s.trim()).filter((t) => t && t !== "accept-encoding");
    return tokens.length ? [...new Set(tokens)].sort().join(", ") : null;
  }
  return v;
}

export interface Difference {
  method: string;
  path: string;
  field: string;
  a: string | number | null;
  b: string | number | null;
  explained?: string;
}

export interface Explanation {
  field: string;
  path?: string;
  reason: string;
}

export function compareObserved(req: ParityRequest, a: Observed, b: Observed, hosts: { a: string; b: string }, explain: readonly Explanation[] = []): Difference[] {
  const diffs: Difference[] = [];
  if (a.status !== b.status) diffs.push({ method: req.method, path: req.path, field: "status", a: a.status, b: b.status });
  for (const h of COMPARED_HEADERS) {
    const va = normalizeHeader(h, a.headers[h], hosts.a);
    const vb = normalizeHeader(h, b.headers[h], hosts.b);
    if (va !== vb) diffs.push({ method: req.method, path: req.path, field: h, a: va, b: vb });
  }
  if (req.method === "GET" && a.bodySha256 !== b.bodySha256 && a.status === b.status && a.status < 300) diffs.push({ method: req.method, path: req.path, field: "body sha256", a: a.bodySha256, b: b.bodySha256 });
  for (const d of diffs) {
    const e = explain.find((x) => x.field === d.field && (!x.path || new RegExp(x.path).test(d.path)));
    if (e) d.explained = e.reason;
  }
  return diffs;
}

async function observe(base: string, req: ParityRequest): Promise<Observed> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${base}${req.path}`, { method: req.method, redirect: "manual", headers: { "user-agent": "ahanassa-parity/1 (W30)" }, signal: AbortSignal.timeout(30_000) });
      const body = req.method === "GET" ? Buffer.from(await res.arrayBuffer()) : null;
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      return { status: res.status, headers, bodySha256: body ? crypto.createHash("sha256").update(body).digest("hex") : null };
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { status: 0, headers: { "x-parity-error": String(last) }, bodySha256: null };
}

export async function runParity(opts: { a: string; b: string; publicDir: string; concurrency?: number; unknown?: number; seed?: number; explain?: Explanation[] }) {
  const a = opts.a.replace(/\/+$/, "");
  const b = opts.b.replace(/\/+$/, "");
  const want = JSON.parse(fs.readFileSync(path.join(opts.publicDir, "manifest.public.json"), "utf8")).snapshot_version as string;
  const snap = async (base: string) => ((await (await fetch(`${base}/manifest.public.json`, { signal: AbortSignal.timeout(30_000) })).json()) as { snapshot_version?: string }).snapshot_version;
  const [sa, sb] = await Promise.all([snap(a), snap(b)]);
  if (sa !== want || sb !== want) return { comparable: false as const, reason: `snapshot_version: artifact ${want}, ${a} ${sa}, ${b} ${sb}`, differences: [] as Difference[], requests: 0 };
  const paths = listFiles(opts.publicDir);
  const matrix = buildRequestMatrix(paths, fs.readFileSync(path.join(opts.publicDir, "_redirects"), "utf8"), { unknown: opts.unknown, seed: opts.seed });
  const hosts = { a: new URL(a).host, b: new URL(b).host };
  const differences: Difference[] = [];
  let next = 0;
  const worker = async () => {
    while (next < matrix.length) {
      const req = matrix[next++];
      const [oa, ob] = await Promise.all([observe(a, req), observe(b, req)]);
      differences.push(...compareObserved(req, oa, ob, hosts, opts.explain));
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 4 }, worker));
  return { comparable: true as const, snapshot_version: want, requests: matrix.length, differences };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  const [a, b, publicDir] = [args.get("a"), args.get("b"), args.get("artifact")];
  if (!a || !b || !publicDir) {
    console.error("usage: parity.ts --a <https://host> --b <https://host> --artifact <public-assets> [--out f.json] [--concurrency n] [--unknown n] [--seed n] [--explain f.json]");
    process.exit(2);
  }
  const explain = args.get("explain") ? (JSON.parse(fs.readFileSync(args.get("explain")!, "utf8")) as Explanation[]) : [];
  const report = await runParity({ a, b, publicDir, concurrency: Number(args.get("concurrency") ?? 4), unknown: Number(args.get("unknown") ?? 30), seed: Number(args.get("seed") ?? 1), explain });
  const unexplained = report.differences.filter((d) => !d.explained);
  const out = { a, b, at: new Date().toISOString(), ...report, unexplained: unexplained.length };
  if (args.get("out")) fs.writeFileSync(args.get("out")!, `${JSON.stringify(out, null, 1)}\n`);
  if (!report.comparable) {
    console.error(`[parity] not comparable: ${report.reason}`);
    process.exit(2);
  }
  const byField = new Map<string, number>();
  for (const d of unexplained) byField.set(d.field, (byField.get(d.field) ?? 0) + 1);
  console.log(`[parity] ${report.snapshot_version}: ${report.requests} requests, ${report.differences.length} difference(s), ${unexplained.length} unexplained`);
  for (const [f, n] of byField) console.log(`  ${f}: ${n}`);
  for (const d of unexplained.slice(0, 25)) console.log(`  ${d.method} ${d.path} ${d.field}: ${JSON.stringify(d.a)} vs ${JSON.stringify(d.b)}`);
  process.exit(unexplained.length ? 1 : 0);
}
