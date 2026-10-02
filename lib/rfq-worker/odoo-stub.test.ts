import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { SqliteD1 } from "../testing/sqlite-d1.ts";
import stub from "../../workers/odoo-stub/index.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonOf = async (r: Response): Promise<any> => r.json();

const STUB_DIR = path.resolve(import.meta.dirname, "../../workers/odoo-stub");
const env = () => ({ STUB_DB: new SqliteD1([STUB_DIR]).asD1(), STUB_BEARER: "b", CONTROL_TOKEN: "c" });
const payload = (extra: Record<string, unknown> = {}) => ({ locale: "en", customer: { name: "A", email: "a@example.com" }, items: [{ description: "x", quantity: 1, uom: "kg" }], ...extra });
const call = (e: ReturnType<typeof env>, body: unknown, headers: Record<string, string> = {}) =>
  stub.fetch(new Request("https://stub/api/v1/rfq", { method: "POST", headers: { authorization: "Bearer b", "content-type": "application/json", "idempotency-key": "rfq-01J000000000000000000000AA", ...headers }, body: JSON.stringify(body) }), e);

test("stub: 401 without bearer, 415 non-JSON, 400 invalid key / unknown field", async () => {
  const e = env();
  assert.equal((await call(e, payload(), { authorization: "" })).status, 401);
  assert.equal((await call(e, payload(), { "content-type": "text/plain" })).status, 415);
  assert.equal((await call(e, payload(), { "idempotency-key": "bad key!" })).status, 400);
  const unknown = await call(e, payload({ extra: 1 }));
  assert.equal(unknown.status, 400);
  assert.equal((await jsonOf(unknown)).error.code, "invalid_payload");
});

test("stub: received_at > 5 min in the future or before 2026-01-01 -> 400 invalid_received_at; old but valid is accepted (no maximum age)", async () => {
  const e = env();
  const future = new Date(Date.now() + 10 * 60_000).toISOString();
  assert.equal((await jsonOf(await call(e, payload({ received_at: future })))).error.code, "invalid_received_at");
  assert.equal((await call(e, payload({ received_at: "2025-12-31T23:59:59Z" }), { "idempotency-key": "k2" })).status, 400);
  assert.equal((await call(e, payload({ received_at: "2026-01-02T00:00:00+03:30" }), { "idempotency-key": "k3" })).status, 201);
});

test("stub: 201 first, 200 replay (same fingerprint, even with an equivalent offset), 409 on a different payload", async () => {
  const e = env();
  const first = await call(e, payload({ received_at: "2026-10-02T03:41:07+03:30", website_reference: "AA-RFQ-K3QW9T2H" }));
  assert.equal(first.status, 201);
  const ref = (await jsonOf(first)).data.reference;
  const replay = await call(e, payload({ received_at: "2026-10-02T00:11:07Z", website_reference: "AA-RFQ-K3QW9T2H" }));
  assert.equal(replay.status, 200);
  assert.equal((await jsonOf(replay)).data.reference, ref);
  assert.equal((await call(e, payload({ notes: "changed" }))).status, 409);
});

test("stub: control forces 500/503/429 for the next N calls, then normal", async () => {
  const e = env();
  const ctl = await stub.fetch(new Request("https://stub/__control", { method: "POST", headers: { authorization: "Bearer c" }, body: JSON.stringify({ mode: "503", remaining: 2 }) }), e);
  assert.equal(ctl.status, 200);
  assert.equal((await call(e, payload())).status, 503);
  assert.equal((await call(e, payload())).status, 503);
  assert.equal((await call(e, payload())).status, 201);
  const stats = await jsonOf(await stub.fetch(new Request("https://stub/__stats", { headers: { authorization: "Bearer c" } }), e));
  assert.equal(stats.rfqs.length, 1);
  assert.equal((await stub.fetch(new Request("https://stub/__stats"), e)).status, 404, "control endpoints need the control token");
});
