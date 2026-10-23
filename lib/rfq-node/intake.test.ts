import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { makeWorld, ORIGIN, ALTCHA_KEY, PNG } from "../testing/rfq-ir-world.ts";
import { trustedClientIp } from "./server.ts";
import { rfqCapabilities } from "../rfq-worker/capabilities.ts";
import { rfqCaptchaProvider, verifyRfqCaptcha } from "../security/rfq-captcha.ts";
import { altchaService, ALTCHA_ALGORITHM, ALTCHA_COST, ALTCHA_COUNTER, ALTCHA_TTL_S } from "./altcha.ts";
import { NodeD1 } from "./sqlite-d1.ts";
import { loadMigrations } from "./migrations.ts";
import { solveChallenge, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { createRfqWorker } from "../../workers/rfq/app.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";

/** W32/W35: the domestic intake's own surface — HTTP front, client IP, capabilities, ALTCHA, admin view. */

const get = (w: { base: string }, path: string, headers: Record<string, string> = {}) =>
  new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = http.request(`${w.base}${path}`, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });

const opsDb = () => {
  const m = loadMigrations();
  return new NodeD1(":memory:", [...m.ops, ...m.ir.map((x) => ({ ...x, name: `ir/${x.name}` }))]);
};
const encode = (challenge: Challenge, solution: unknown) => Buffer.from(JSON.stringify({ challenge: { parameters: challenge.parameters, signature: challenge.signature }, solution })).toString("base64");
const solved = async (svc: { challenge(): Promise<Challenge> }) => {
  const challenge = await svc.challenge();
  return { challenge, solution: (await solveChallenge({ challenge, deriveKey }))! };
};

test("capabilities on the domestic intake: ALTCHA + its challenge path on this host, files on, extract off, exact-origin CORS, 60 s cache", async () => {
  const w = await makeWorld();
  try {
    const r = await get(w, "/api/rfqs/capabilities", { origin: ORIGIN });
    assert.equal(r.status, 200);
    assert.equal(r.headers["access-control-allow-origin"], ORIGIN);
    assert.equal(r.headers["cache-control"], "public, max-age=60");
    const body = JSON.parse(r.body);
    assert.deepEqual(body.captcha, { provider: "altcha", challengePath: "/api/rfqs/captcha-challenge" });
    assert.equal(body.files.enabled, true);
    assert.deepEqual(body.extract, { lists: false, pictures: false });
    const other = await get(w, "/api/rfqs/capabilities", { origin: "https://www.ahanassa.com" });
    assert.equal(other.headers["access-control-allow-origin"], undefined);
  } finally {
    await w.close();
  }
});

test("challenge route: a signed PBKDF2/SHA-256 challenge, no-store, exact-origin CORS, expiry ≤ 10 min; only GET", async () => {
  const w = await makeWorld();
  try {
    const r = await get(w, "/api/rfqs/captcha-challenge", { origin: ORIGIN });
    assert.equal(r.status, 200);
    assert.equal(r.headers["cache-control"], "no-store");
    assert.equal(r.headers["access-control-allow-origin"], ORIGIN);
    const c = JSON.parse(r.body) as Challenge;
    assert.match(c.signature ?? "", /^[0-9a-f]{64}$/);
    assert.equal(c.parameters.algorithm, ALTCHA_ALGORITHM);
    assert.equal(c.parameters.cost, ALTCHA_COST);
    assert.ok(c.parameters.keySignature, "deterministic mode: the server verifies with one HMAC");
    const ttl = (c.parameters.expiresAt ?? 0) - Date.now() / 1000;
    assert.ok(ttl > ALTCHA_TTL_S - 5 && ttl <= ALTCHA_TTL_S, `ttl ${ttl}`);
    assert.equal((await get(w, "/api/rfqs/captcha-challenge", { origin: "https://evil.example" })).headers["access-control-allow-origin"], undefined);
    const post = await fetch(`${w.base}/api/rfqs/captcha-challenge`, { method: "POST", headers: { origin: ORIGIN } });
    assert.equal(post.status, 405);
    // Two challenges never share a signature (random nonce + salt).
    assert.notEqual(JSON.parse((await get(w, "/api/rfqs/captcha-challenge")).body).signature, c.signature);
  } finally {
    await w.close();
  }
});

test("difficulty: the counter is 500–1000 tries of PBKDF2 × 1000 — solved, and verified in ~1 HMAC", async () => {
  const svc = altchaService({ hmacKey: ALTCHA_KEY, db: opsDb() })!;
  const t = performance.now();
  const { challenge, solution } = await solved(svc);
  const ms = performance.now() - t;
  assert.ok(solution.counter >= ALTCHA_COUNTER.min && solution.counter <= ALTCHA_COUNTER.max, String(solution.counter));
  const v = performance.now();
  assert.deepEqual(await svc.verify(encode(challenge, solution)), { ok: true });
  console.log(JSON.stringify({ altcha_solve_ms_this_machine: Math.round(ms), counter: solution.counter, verify_ms: +(performance.now() - v).toFixed(2) }));
});

test("ALTCHA verify: single use (replay → invalid), tampered / foreign-key / expired / malformed → invalid; store error → unavailable", async () => {
  const db = opsDb();
  const svc = altchaService({ hmacKey: ALTCHA_KEY, db })!;
  const { challenge, solution } = await solved(svc);
  const token = encode(challenge, solution);
  assert.deepEqual(await svc.verify(token), { ok: true });
  assert.deepEqual(await svc.verify(token), { ok: false, reason: "invalid" }, "the same solution twice is a replay");
  assert.equal(db.q(`SELECT 1 FROM ir_captcha_used`).length, 1);

  const fresh = await solved(svc);
  assert.deepEqual(await svc.verify(encode(fresh.challenge, { ...fresh.solution, counter: fresh.solution.counter + 1, derivedKey: "00".repeat(32) })), { ok: false, reason: "invalid" }, "wrong key");
  assert.deepEqual(await svc.verify(encode({ ...fresh.challenge, parameters: { ...fresh.challenge.parameters, cost: 1 } }, fresh.solution)), { ok: false, reason: "invalid" }, "tampered parameters");
  const other = altchaService({ hmacKey: "another-key-0123456789abcdef0123456789", db: opsDb() })!;
  assert.deepEqual(await other.verify(encode(fresh.challenge, fresh.solution)), { ok: false, reason: "invalid" }, "a challenge signed by another key");
  assert.deepEqual(await svc.verify(encode(fresh.challenge, fresh.solution)), { ok: true }, "the untouched one still passes");

  const past = altchaService({ hmacKey: ALTCHA_KEY, db, now: () => new Date(Date.now() - 11 * 60_000) })!;
  const old = await solved(past);
  assert.deepEqual(await svc.verify(encode(old.challenge, old.solution)), { ok: false, reason: "invalid" }, "expired after 10 min");

  for (const bad of ["", "not base64!", Buffer.from("{}").toString("base64"), Buffer.from("[1]").toString("base64"), "A".repeat(3000), 42, null, undefined]) assert.deepEqual(await svc.verify(bad), { ok: false, reason: "invalid" }, String(bad).slice(0, 20));

  const broken = altchaService({ hmacKey: ALTCHA_KEY, db: new NodeD1(":memory:", []) })!; // no ir_captcha_used table
  const b = await solved(broken);
  assert.deepEqual(await broken.verify(encode(b.challenge, b.solution)), { ok: false, reason: "unavailable" });

  // Expired rows are dropped on the next verify.
  db.sqlite.prepare(`UPDATE ir_captcha_used SET expires_at = 1`).run();
  const n = await solved(svc);
  await svc.verify(encode(n.challenge, n.solution));
  assert.equal(db.q(`SELECT 1 FROM ir_captcha_used`).length, 1);
});

test("no ALTCHA key (or a short one) → no service: capabilities, challenge and submit all 503 (fail closed), nothing stored", async () => {
  assert.equal(altchaService({ hmacKey: "short", db: opsDb() }), null);
  assert.equal(altchaService({ hmacKey: null, db: opsDb() }), null);
  const w = await makeWorld({ altchaKey: null });
  try {
    assert.equal((await get(w, "/api/rfqs/capabilities", { origin: ORIGIN })).status, 503);
    assert.equal((await get(w, "/api/rfqs/captcha-challenge", { origin: ORIGIN })).status, 503);
    assert.equal((await w.submit(1)).status, 503);
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs`).length, 0);
  } finally {
    await w.close();
  }
});

test("capabilities on the Cloudflare Worker: Turnstile, unchanged; misconfigured provider → 503, never 'no captcha'; the Worker has no challenge route", async () => {
  const worker = createRfqWorker();
  const env = { ALLOWED_ORIGINS: "https://www.ahanassa.com" } as RfqWorkerEnv;
  const req = (p = "/api/rfqs/capabilities") => new Request(`https://api.ahanassa.com${p}`, { headers: { origin: "https://www.ahanassa.com" } });
  const ok = await worker.fetch(req(), env, {} as ExecutionContext);
  assert.equal(ok.status, 200);
  assert.deepEqual(((await ok.json()) as { captcha: unknown }).captcha, { provider: "turnstile" });
  assert.equal((await worker.fetch(req(), { ...env, CAPTCHA_PROVIDER: "none" }, {} as ExecutionContext)).status, 503);
  assert.equal((await worker.fetch(req(), { ...env, CAPTCHA_PROVIDER: "arcaptcha" }, {} as ExecutionContext)).status, 503, "the removed provider is unknown now");
  assert.equal(rfqCapabilities(req(), { ...env, CAPTCHA_PROVIDER: "altcha" } as RfqWorkerEnv).status, 503, "altcha without its verifier binding");
  assert.notEqual((await worker.fetch(req("/api/rfqs/captcha-challenge"), env, {} as ExecutionContext)).status, 200);
  assert.equal(rfqCaptchaProvider({}), "turnstile");
  assert.equal(rfqCaptchaProvider({ CAPTCHA_PROVIDER: "hcaptcha" }), null);
  assert.deepEqual(await verifyRfqCaptcha({ CAPTCHA_PROVIDER: "hcaptcha" }, "t", {}), { ok: false, reason: "unavailable" });
  assert.deepEqual(await verifyRfqCaptcha({ CAPTCHA_PROVIDER: "altcha" }, "t", {}), { ok: false, reason: "unavailable" });
});

test("submit fails closed on ALTCHA: a bogus token → 403, a reused solution under a NEW idempotency key → 403; nothing stored for either", async () => {
  const w = await makeWorld();
  try {
    assert.equal((await w.submit(1, [], { turnstileToken: "bad-token" })).status, 403);
    const token = await w.token();
    assert.equal((await w.submit(2, [], { turnstileToken: token })).status, 201);
    assert.equal((await w.submit(3, [], { turnstileToken: token })).status, 403, "replay of a used solution");
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs`).length, 1);
  } finally {
    await w.close();
  }
});

test("submit + replay over HTTP: 201, then the same request → 200 with the same reference, without a second captcha call; a changed payload under the same key → 409", async () => {
  const w = await makeWorld();
  try {
    const a = await w.submit(7, [PNG]);
    const b = await w.submit(7, [PNG]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal(b.reference, a.reference);
    assert.equal(w.captchaCalls, 1);
    assert.equal((await w.submit(7, [PNG], { message: "changed" })).status, 409);
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs`).length, 1);
  } finally {
    await w.close();
  }
});

test("client IP: X-Ahanassa-Client-IP is trusted only from a loopback peer; spoofed CF-Connecting-IP / X-Real-IP never reach the shared code", () => {
  assert.equal(trustedClientIp("127.0.0.1", "5.6.7.8"), "5.6.7.8");
  assert.equal(trustedClientIp("::1", "2a01::1"), "2a01::1");
  assert.equal(trustedClientIp("::ffff:127.0.0.1", "5.6.7.8"), "5.6.7.8");
  assert.equal(trustedClientIp("10.0.0.9", "5.6.7.8"), "10.0.0.9", "a non-loopback peer cannot pick its IP");
  assert.equal(trustedClientIp("127.0.0.1", "5.6.7.8, 1.2.3.4"), "127.0.0.1", "a list is not an IP literal");
  assert.equal(trustedClientIp("::ffff:9.9.9.9", undefined), "9.9.9.9");
});

test("rate limit keys come from the trusted header: 20 per 60 s per visitor, the 21st is 429 even with rotating spoofed CF-Connecting-IP / X-Real-IP; another visitor is unaffected", async () => {
  const w = await makeWorld();
  try {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await w.submit(200 + i, [], {}, { "x-ahanassa-client-ip": "8.8.8.8", "cf-connecting-ip": `1.1.1.${i}`, "x-real-ip": `2.2.2.${i}` })).status);
    assert.deepEqual(statuses.slice(0, 20), Array(20).fill(201));
    assert.equal(statuses[20], 429);
    assert.equal((await w.submit(300, [], {}, { "x-ahanassa-client-ip": "9.9.9.9" })).status, 201);
  } finally {
    await w.close();
  }
});

test("GET /healthz: ok + outbox_due + oldest_due_min, no personal data", async () => {
  const w = await makeWorld();
  try {
    await w.submit(3);
    const r = await get(w, "/healthz");
    const body = JSON.parse(r.body);
    assert.equal(body.ok, true);
    assert.equal(body.outbox_due, 1);
    assert.equal(typeof body.oldest_due_min, "number");
    assert.ok(!/Buyer|example\.com|AA-RFQ/.test(r.body));
  } finally {
    await w.close();
  }
});

test("domestic admin view: page has no data; the list needs ADMIN_TOKEN (404 otherwise), shows contact + items + files, and is access-logged", async () => {
  const w = await makeWorld();
  try {
    const { reference } = await w.submit(9, [PNG]);
    const page = await get(w, "/__admin/ir/");
    assert.equal(page.status, 200);
    assert.ok(!page.body.includes(reference));
    assert.equal((await get(w, "/__admin/ir/rfqs")).status, 404);
    assert.equal((await get(w, "/__admin/ir/rfqs", { authorization: "Bearer wrong" })).status, 404);
    const ok = await get(w, "/__admin/ir/rfqs?status=undelivered", { authorization: "Bearer admin-secret", "x-admin-actor": "staff1" });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers["cache-control"], "no-store");
    const rfq = JSON.parse(ok.body).rfqs[0];
    assert.equal(rfq.reference_number, reference);
    assert.equal(rfq.full_name, "Buyer 9");
    assert.equal(rfq.files[0].upload_status, "uploaded");
    assert.equal(rfq.items.length, 1);
    assert.deepEqual(w.ops.q(`SELECT actor, action FROM ir_admin_access_log`), [{ actor: "staff1", action: "list:undelivered:1" }]);
    // The file itself comes from the Worker's own admin download route, from this server's disk.
    const dl = await get(w, `/__admin/attachments/${rfq.files[0].id}`, { authorization: "Bearer admin-secret" });
    assert.equal(dl.status, 200);
  } finally {
    await w.close();
  }
});
