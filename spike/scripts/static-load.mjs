// Spike S1: sustained load on STATIC assets only (spike static Worker).
// The 2026-09-30 66-page mix: 11 pages x fa/en/ar x desktop/mobile UA.
//   node static-load.mjs <base> <outJson> [durationSec=600] [concurrency=8]
import fs from "node:fs";
const [BASE, OUT, durArg, concArg] = process.argv.slice(2);
const DURATION = Number(durArg ?? 600) * 1000, CONC = Number(concArg ?? 8);
const pages = ["/", "/products", "/products/category/beam", "/products/category/box-section", "/products/category/sheet-plate", "/products/rectangular-hollow-section-rhs", "/products/square-hollow-section-shs", "/products/ipn-inp-beam", "/products/hot-rolled-plate-s235jr", "/products/hot-rolled-plate-s355jr", "/contact"];
const UA = { desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 SpikeS1Load", mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 SpikeS1Load" };
const mix = [];
for (const loc of ["", "/en", "/ar"]) for (const p of pages) for (const ua of ["desktop", "mobile"]) mix.push({ url: `${BASE}${loc}${p === "/" && loc ? "" : p}`, ua });
const status = {}, lat = [];
let i = 0, total = 0, bytes = 0;
const end = Date.now() + DURATION;
async function worker() {
  while (Date.now() < end) {
    const m = mix[i++ % mix.length];
    const t0 = performance.now();
    try {
      const r = await fetch(m.url, { headers: { "user-agent": UA[m.ua] } });
      const buf = await r.arrayBuffer();
      bytes += buf.byteLength;
      status[r.status] = (status[r.status] ?? 0) + 1;
    } catch (e) {
      status.error = (status.error ?? 0) + 1;
    }
    lat.push(performance.now() - t0);
    total++;
  }
}
const started = new Date().toISOString();
await Promise.all(Array.from({ length: CONC }, worker));
lat.sort((a, b) => a - b);
const q = (p) => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * p))]);
const res = { started, ended: new Date().toISOString(), mixSize: mix.length, concurrency: CONC, total, status, rps: +(total / (DURATION / 1000)).toFixed(1), mb: +(bytes / 1e6).toFixed(1), latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: Math.round(lat.at(-1)) } };
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
