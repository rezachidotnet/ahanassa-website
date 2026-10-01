// Spike S1: per-class CPU table from `wrangler tail --format json` of the spike RFQ Worker.
import { parseTail } from "./parse-tail.mjs";
const objs = parseTail(process.argv[2]);
const cls = (o) => {
  const u = o.event?.request?.url ?? "";
  const m = u.match(/[?&]c=([a-z]+)/);
  if (m) return `${o.event?.request?.method ?? ""} ${m[1]}`;
  return `${o.event?.request?.method ?? o.eventType} ${u.replace(/^https:\/\/[^/]+/, "").split("?")[0]}`;
};
const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] : null);
const groups = {};
for (const o of objs) {
  const k = cls(o);
  (groups[k] ??= { n: 0, outcomes: {}, cpu: [], wall: [] }).n++;
  groups[k].outcomes[o.outcome] = (groups[k].outcomes[o.outcome] ?? 0) + 1;
  if (typeof o.cpuTime === "number") groups[k].cpu.push(o.cpuTime);
  if (typeof o.wallTime === "number") groups[k].wall.push(o.wallTime);
}
const rows = Object.entries(groups).map(([k, g]) => {
  g.cpu.sort((a, b) => a - b); g.wall.sort((a, b) => a - b);
  return { class: k, n: g.n, outcomes: g.outcomes, cpu_p50: q(g.cpu, 0.5), cpu_p95: q(g.cpu, 0.95), cpu_p99: q(g.cpu, 0.99), cpu_max: g.cpu.at(-1) ?? null, wall_p50: q(g.wall, 0.5), wall_max: g.wall.at(-1) ?? null };
});
const allRfq = objs.filter((o) => /\/api\/rfqs/.test(o.event?.request?.url ?? "") && o.event?.request?.method === "POST").map((o) => o.cpuTime).filter((x) => typeof x === "number").sort((a, b) => a - b);
console.log(JSON.stringify({ events: objs.length, exceededCpu: objs.filter((o) => o.outcome === "exceededCpu").length, exceptions: objs.flatMap((o) => o.exceptions ?? []).length, rows, allPostRfqs: { n: allRfq.length, p50: q(allRfq, 0.5), p95: q(allRfq, 0.95), p99: q(allRfq, 0.99), max: allRfq.at(-1), over7: allRfq.filter((x) => x > 7).length, over10: allRfq.filter((x) => x > 10).length } }, null, 1));
