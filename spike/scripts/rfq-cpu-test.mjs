// Spike S1: controlled RFQ test traffic against the SPIKE RFQ Worker only.
// Synthetic data only (example.invalid addresses, test phone numbers),
// Turnstile dummy token (the Worker uses Cloudflare's always-pass TEST secret).
// Each request carries ?c=<class> so `wrangler tail` events can be classified.
//   node rfq-cpu-test.mjs <baseUrl> <outJson> [rounds=3] [validPerRound=30] [spacingMs=2000]
import fs from "node:fs";
import crypto from "node:crypto";

const [BASE, OUT, roundsArg, perRoundArg, spacingArg] = process.argv.slice(2);
const ROUNDS = Number(roundsArg ?? 3), PER = Number(perRoundArg ?? 30), SPACING = Number(spacingArg ?? 2000);
const index = JSON.parse(fs.readFileSync(new URL("../out/rfq-variant-index.json", import.meta.url)));
const SNAP = index.snapshot_version;
const ORIGIN = "https://ahanassa-spike-s1-static.nova-b1e6f0.workers.dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unitFor = (g) => (g === "SHEET_PLATE" ? "ton" : g === "REBAR" ? "ton" : "kg");
const variants = index.rows.filter((r) => r.locale === "en");
let n = 0;

function payload(seq, overrides = {}) {
  const locale = ["fa", "en", "ar"][seq % 3];
  const v1 = variants[(seq * 7) % variants.length];
  const v2 = variants[(seq * 13 + 5) % variants.length];
  return {
    idempotencyKey: `spike-${crypto.randomUUID()}`,
    locale,
    fullName: "Spike Test Buyer",
    companyName: "Spike S1 synthetic",
    email: `spike+${seq}@example.invalid`,
    phoneCountry: "IR",
    phoneLocal: "9120000000",
    message: `Spike S1 synthetic RFQ ${seq}`,
    items: [
      { catalogVariantXid: v1.variant_xid, quantityText: "12", unit: unitFor(v1.group_code) },
      { catalogVariantXid: v2.variant_xid, quantityText: "3.5", unit: unitFor(v2.group_code) },
      { freeformTitle: "Custom steel item", quantityText: "500", unit: "kg" },
    ],
    website: "",
    formRenderedAt: Date.now() - 20000,
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
    catalogSnapshotVersion: SNAP,
    ...overrides,
  };
}
async function send(cls, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/rfqs?c=${cls}&n=${++n}`, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  return { cls, n, status: res.status, code: json?.code ?? null, reference: json?.reference ?? null, ms: Date.now() - t0, at: new Date().toISOString() };
}
const results = [];
const log = (r) => { results.push(r); console.log(JSON.stringify(r)); };

let seq = 0;
const validBodies = [];
for (let round = 1; round <= ROUNDS; round++) {
  for (let i = 0; i < PER; i++) {
    const body = payload(++seq);
    validBodies.push(body);
    log({ round, ...(await send("valid", body)) });
    await sleep(SPACING);
  }
}
const invalids = [
  { fullName: "" }, { email: "not-an-email" }, { items: [] }, { phoneLocal: "" }, { locale: "de" },
  { items: [{ catalogVariantXid: "CVAR-999999", quantityText: "1", unit: "ton" }] },
  { items: [{ catalogVariantXid: "CVAR-000007", quantityText: "1", unit: "sheet" }] },
  { website: "http://bot.example" }, { idempotencyKey: "short" }, { items: [{ freeformTitle: "x", quantityText: "", unit: "kg" }] },
];
for (const o of invalids) { log(await send("invalid", payload(++seq, o))); await sleep(SPACING); }
for (let i = 0; i < 5; i++) { log(await send("replay", validBodies[i % validBodies.length])); await sleep(SPACING); }
for (let i = 0; i < 5; i++) { log(await send("conflict", { ...validBodies[(5 + i) % validBodies.length], message: `changed payload ${i}` })); await sleep(SPACING); }
for (let i = 0; i < 3; i++) {
  const body = payload(++seq);
  const pair = await Promise.all([send("concurrent", body), send("concurrent", body)]);
  pair.forEach(log);
  await sleep(SPACING);
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
const by = {};
for (const r of results) { const k = `${r.cls}:${r.status}${r.code ? ":" + r.code : ""}`; by[k] = (by[k] ?? 0) + 1; }
console.log("SUMMARY", JSON.stringify(by));
