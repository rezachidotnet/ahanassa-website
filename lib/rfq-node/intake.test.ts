import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { makeWorld, ORIGIN, ARC_SITE_KEY, PNG } from "../testing/rfq-ir-world.ts";
import { trustedClientIp } from "./server.ts";
import { rfqCapabilities } from "../rfq-worker/capabilities.ts";
import { verifyArCaptchaToken, ARCAPTCHA_VERIFY_URL } from "../security/arcaptcha.ts";
import { rfqCaptchaProvider, verifyRfqCaptcha } from "../security/rfq-captcha.ts";
import { createRfqWorker } from "../../workers/rfq/app.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";

/** W32: the domestic intake's own surface — HTTP front, client IP, capabilities, arCaptcha, admin view. */

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

test("capabilities on the domestic intake: arCaptcha + its site key, files on, extract off, exact-origin CORS, 60 s cache", async () => {
  const w = await makeWorld();
  try {
    const r = await get(w, "/api/rfqs/capabilities", { origin: ORIGIN });
    assert.equal(r.status, 200);
    assert.equal(r.headers["access-control-allow-origin"], ORIGIN);
    assert.equal(r.headers["cache-control"], "public, max-age=60");
    const body = JSON.parse(r.body);
    assert.deepEqual(body.captcha, { provider: "arcaptcha", siteKey: ARC_SITE_KEY });
    assert.equal(body.files.enabled, true);
    assert.deepEqual(body.extract, { lists: false, pictures: false });
    const other = await get(w, "/api/rfqs/capabilities", { origin: "https://www.ahanassa.com" });
    assert.equal(other.headers["access-control-allow-origin"], undefined);
  } finally {
    await w.close();
  }
});

test("capabilities on the Cloudflare Worker: Turnstile (no site key repeated); misconfigured provider → 503, never 'no captcha'", async () => {
  const worker = createRfqWorker();
  const env = { ALLOWED_ORIGINS: "https://www.ahanassa.com" } as RfqWorkerEnv;
  const req = () => new Request("https://api.ahanassa.com/api/rfqs/capabilities", { headers: { origin: "https://www.ahanassa.com" } });
  const ok = await worker.fetch(req(), env, {} as ExecutionContext);
  assert.equal(ok.status, 200);
  assert.deepEqual(((await ok.json()) as { captcha: unknown }).captcha, { provider: "turnstile" });
  assert.equal((await worker.fetch(req(), { ...env, CAPTCHA_PROVIDER: "none" }, {} as ExecutionContext)).status, 503);
  assert.equal(rfqCapabilities(req(), { ...env, CAPTCHA_PROVIDER: "arcaptcha" } as RfqWorkerEnv).status, 503, "arcaptcha without a site key");
  assert.equal(rfqCaptchaProvider({}), "turnstile");
  assert.equal(rfqCaptchaProvider({ CAPTCHA_PROVIDER: "hcaptcha" }), null);
  assert.deepEqual(await verifyRfqCaptcha({ CAPTCHA_PROVIDER: "hcaptcha" }, "t", {}), { ok: false, reason: "unavailable" });
});

test("arCaptcha verify: arCaptcha's documented body; only success === true passes; our key errors and outages are 'unavailable' (503)", async () => {
  const seen: { url: string; body: unknown }[] = [];
  const answer = (data: unknown, status = 200) => (async (url: string, init: RequestInit) => (seen.push({ url, body: JSON.parse(String(init.body)) }), new Response(JSON.stringify(data), { status }))) as unknown as typeof fetch;
  const o = (fetchImpl: typeof fetch) => ({ siteKey: "site", secret: "sec", fetchImpl });
  assert.deepEqual(await verifyArCaptchaToken("tok", o(answer({ success: true }))), { ok: true });
  assert.deepEqual(seen[0], { url: ARCAPTCHA_VERIFY_URL, body: { site_key: "site", secret_key: "sec", challenge_id: "tok" } });
  assert.deepEqual(await verifyArCaptchaToken("tok", o(answer({ success: false }))), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyArCaptchaToken("tok", o(answer({ success: "true" }))), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyArCaptchaToken("tok", o(answer({ success: false, "error-codes": ["invalid-input-secret"] }))), { ok: false, reason: "unavailable" });
  assert.deepEqual(await verifyArCaptchaToken("tok", o(answer({}, 502))), { ok: false, reason: "unavailable" });
  assert.deepEqual(await verifyArCaptchaToken("tok", o((async () => { throw new TypeError("fetch failed"); }) as typeof fetch)), { ok: false, reason: "unavailable" });
  assert.deepEqual(await verifyArCaptchaToken("", o(answer({ success: true }))), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyArCaptchaToken("tok", { siteKey: "", secret: "sec" }), { ok: false, reason: "unavailable" });
});

test("submit fails closed on arCaptcha: rejected token → 403, verifier unreachable → 503; nothing stored", async () => {
  const w = await makeWorld({ arcaptchaOk: false });
  try {
    assert.equal((await w.submit(1)).status, 403);
    w.cut(true);
    assert.equal((await w.submit(2)).status, 503);
    assert.equal(w.ops.q(`SELECT 1 FROM rfqs`).length, 0);
    assert.equal(w.captchaCalls, 2);
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
