import { test } from "node:test";
import assert from "node:assert/strict";
import { SqliteD1, OPS_MIGRATIONS, PUBLIC_MIGRATIONS } from "../testing/sqlite-d1.ts";
import { bearerMatches } from "./admin.ts";
import { pickDueRfq } from "./delivery.ts";
import { persistRfq } from "../rfq/intake-store.ts";
import { validateRfqSubmission } from "../rfq/validation.ts";
import { buildFreeformItemRecord } from "../rfq/catalog-preselection.ts";
import { hashIdempotencyKey } from "../rfq/idempotency.ts";
import productionWorker from "../../workers/rfq/index.ts";
import stagingWorker from "../../workers/rfq/index.staging.ts";
import type { RfqWorkerEnv } from "./config.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonOf = async (r: Response): Promise<any> => r.json();
const TOKEN = "admin-secret-for-tests";
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

function setup(overrides: Partial<RfqWorkerEnv> = {}) {
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const env: RfqWorkerEnv = { DB_OPS: ops.asD1(), DB_PUBLIC: new SqliteD1([PUBLIC_MIGRATIONS]).asD1(), ADMIN_TOKEN: TOKEN, ODOO_BASE_URL: "https://stub.example", ODOO_RFQ_API_TOKEN: "b", ODOO_INTAKE_V11: "1", DELIVERY_ON_CRON: "0", ...overrides };
  return { ops, env };
}

async function seed(env: RfqWorkerEnv, tag: string, syncStatus = "manual_review"): Promise<string> {
  const key = `admin-test-${tag}-0123456789`;
  const v = validateRfqSubmission({ idempotencyKey: key, locale: "en", fullName: "Admin Test", email: "admin-test@example.invalid", phoneCountry: "IR", phoneLocal: "9120000000", items: [{ freeformTitle: `T ${tag}`, quantityText: "5", unit: "kg" }] });
  assert.ok(v.ok && v.value);
  const items = v.value.items.map((i) => buildFreeformItemRecord({ productRef: i.productRef, productLabel: i.productLabel, categoryLabel: i.categoryLabel, freeformTitle: i.freeformTitle, sizeText: i.sizeText, quantityText: i.quantityText, quantityValue: i.quantityValue, quantityScale: i.quantityScale, description: i.description, lengthMm: i.lengthMm }, { code: i.unit, label: "kg" }));
  const res = await persistRfq(env.DB_OPS, { ...v.value, items }, await hashIdempotencyKey(key), `t-${tag}`, { payloadFingerprint: "0".repeat(64), catalogSnapshotVersion: null });
  const ops = env.DB_OPS as unknown as SqliteD1;
  ops.sqlite.prepare(`UPDATE rfqs SET sync_status = ?, last_sync_error_code = 'ODOO_400_invalid_payload' WHERE id = ?`).run(syncStatus, res.rfqId!);
  ops.sqlite.prepare(`UPDATE integration_outbox SET status = ? WHERE aggregate_id = ?`).run(syncStatus === "retry" ? "retry" : "dead", res.rfqId!);
  return res.rfqId!;
}

const call = (worker: { fetch: (r: Request, e: RfqWorkerEnv, c: ExecutionContext) => Promise<Response> }, env: RfqWorkerEnv, path: string, init: { method?: string; body?: unknown; token?: string | null; actor?: string } = {}) =>
  worker.fetch(
    new Request(`https://api.example${path}`, {
      method: init.method ?? "POST",
      headers: { ...(init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` }), ...(init.actor ? { "x-admin-actor": init.actor } : {}), "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
    env,
    ctx,
  );

test("admin auth: constant-time bearer check; missing/wrong bearer or no ADMIN_TOKEN -> the same 404 as an unknown path", async () => {
  assert.equal(await bearerMatches(`Bearer ${TOKEN}`, TOKEN), true);
  for (const h of [null, "", "Bearer ", `Bearer ${TOKEN}x`, `bearer ${TOKEN}`, TOKEN, `Bearer ${TOKEN.slice(0, -1)}`]) assert.equal(await bearerMatches(h, TOKEN), false, String(h));
  assert.equal(await bearerMatches(`Bearer ${TOKEN}`, undefined), false);
  assert.equal(await bearerMatches("Bearer ", ""), false);
  const { env } = setup();
  for (const token of [null, "wrong"]) {
    const r = await call(productionWorker, env, "/__admin/manual-review", { method: "GET", token });
    assert.equal(r.status, 404);
  }
  assert.equal((await call(productionWorker, setup({ ADMIN_TOKEN: undefined }).env, "/__admin/manual-review", { method: "GET", token: "" })).status, 404);
});

test("manual-review list: status filter, no customer PII in the rows", async () => {
  const { env } = setup();
  const a = await seed(env, "a");
  await seed(env, "b", "retry");
  const r = await call(productionWorker, env, "/__admin/manual-review", { method: "GET" });
  assert.equal(r.status, 200);
  const body = await jsonOf(r);
  assert.equal(body.count, 1);
  assert.equal(body.rfqs[0].id, a);
  assert.doesNotMatch(JSON.stringify(body), /admin-test@example|Admin Test|912/);
  assert.equal((await jsonOf(await call(productionWorker, env, "/__admin/manual-review?status=retry", { method: "GET" }))).count, 1);
  assert.equal((await call(productionWorker, env, "/__admin/manual-review?status=synced", { method: "GET" })).status, 400);
});

test("close: manual_review/retry -> failed + outbox dead + audit row with reason; never picked again; closing twice -> 409", async () => {
  const { env, ops } = setup();
  const id = await seed(env, "close", "retry");
  ops.sqlite.prepare(`UPDATE integration_outbox SET available_at = '2026-01-01T00:00:00.000Z'`).run();
  assert.equal(await pickDueRfq(env.DB_OPS, new Date()), id);
  const r = await call(productionWorker, env, "/__admin/manual-review/close", { body: { rfqId: id, reason: "W2 test artefact" }, actor: "owner" });
  assert.equal(r.status, 200);
  assert.deepEqual(await jsonOf(r), { ok: true, action: "close", rfqId: id, previousSyncStatus: "retry", syncStatus: "failed" });
  assert.deepEqual(ops.q("SELECT sync_status, last_sync_error_code FROM rfqs WHERE id = ?", id), [{ sync_status: "failed", last_sync_error_code: "CLOSED_BY_ADMIN" }]);
  assert.equal(ops.q("SELECT status FROM integration_outbox WHERE aggregate_id = ?", id)[0].status, "dead");
  assert.deepEqual(ops.q("SELECT action, rfq_id, reason, actor, previous_sync_status, new_sync_status, result FROM rfq_admin_actions"), [
    { action: "close", rfq_id: id, reason: "W2 test artefact", actor: "owner", previous_sync_status: "retry", new_sync_status: "failed", result: "ok" },
  ]);
  assert.equal(await pickDueRfq(env.DB_OPS, new Date()), null);
  const again = await call(productionWorker, env, "/__admin/manual-review/close", { body: { rfqId: id, reason: "again" } });
  assert.equal(again.status, 409);
  assert.equal(ops.q("SELECT count(*) n FROM rfq_admin_actions")[0].n, 1);
});

test("retry: manual_review -> retry, due now (the reconciler picks it), audited; a reason and a valid rfqId are required", async () => {
  const { env, ops } = setup();
  const id = await seed(env, "retry");
  assert.equal(await pickDueRfq(env.DB_OPS, new Date()), null, "manual_review is never auto-picked");
  for (const body of [{ rfqId: id }, { rfqId: id, reason: "" }, { rfqId: id, reason: "x".repeat(501) }, { rfqId: "nope", reason: "r" }, { reason: "r" }]) {
    assert.equal((await call(productionWorker, env, "/__admin/manual-review/retry", { body })).status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.equal((await call(productionWorker, env, "/__admin/manual-review/retry", { body: { rfqId: "01ARZ3NDEKTSV4RRFFQ69G5FAV", reason: "r" } })).status, 404);
  const r = await call(productionWorker, env, "/__admin/manual-review/retry", { body: { rfqId: id, reason: "stub fixed" } });
  assert.equal(r.status, 200);
  assert.equal(ops.q("SELECT sync_status FROM rfqs WHERE id = ?", id)[0].sync_status, "retry");
  assert.equal(ops.q("SELECT status FROM integration_outbox WHERE aggregate_id = ?", id)[0].status, "retry");
  assert.equal(await pickDueRfq(env.DB_OPS, new Date(Date.now() + 1000)), id);
  assert.equal(ops.q("SELECT action, reason FROM rfq_admin_actions")[0].reason, "stub fixed");
  assert.equal((await call(productionWorker, env, "/__admin/manual-review/retry", { method: "GET" })).status, 405);
});

test("reconcile trigger: needs a reason, runs one reconcile, audited", async () => {
  const { env, ops } = setup();
  assert.equal((await call(productionWorker, env, "/__admin/reconcile", { body: {} })).status, 400);
  const r = await call(productionWorker, env, "/__admin/reconcile", { body: { reason: "manual check" } });
  assert.equal(r.status, 200);
  assert.deepEqual(await jsonOf(r), { ok: true, picked: null, action: "none" });
  assert.deepEqual(ops.q("SELECT action, rfq_id, reason, result FROM rfq_admin_actions"), [{ action: "reconcile", rfq_id: null, reason: "manual check", result: "none" }]);
});

test("test routes exist only in the staging entry: the production Worker answers 404 even with the bearer and TEST_HOOKS=1", async () => {
  const { env } = setup({ TEST_HOOKS: "1" });
  const id = await seed(env, "probe", "retry");
  const prod = await call(productionWorker, env, `/__admin/test/deliver?rfq=${id}&kill_after_post=1`);
  assert.equal(prod.status, 404);
  const staged = await call(stagingWorker, setup({ TEST_HOOKS: "0" }).env, `/__admin/test/deliver?rfq=${id}`);
  assert.equal(staged.status, 404, "staging test routes also need TEST_HOOKS=1");
  const unauth = await call(stagingWorker, env, `/__admin/test/deliver?rfq=${id}`, { token: "wrong" });
  assert.equal(unauth.status, 404, "and the admin bearer");
});
