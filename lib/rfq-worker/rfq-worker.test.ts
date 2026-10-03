import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SqliteD1, OPS_MIGRATIONS, PUBLIC_MIGRATIONS } from "../testing/sqlite-d1.ts";
import { handleRfqSubmit } from "./submit.ts";
import { preflightResponse } from "./cors.ts";
import { backoffMs, deliverOne, pickDueRfq, STALE_SYNCING_MS, type DeliveryConfig } from "./delivery.ts";
import { reconcileOnce, consumeOne } from "./runners.ts";
import { inlineParams, sqlLiteral } from "./wrangler-d1.ts";
import { persistRfq } from "../rfq/intake-store.ts";
import { validateRfqSubmission } from "../rfq/validation.ts";
import type { RfqWorkerEnv } from "./config.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonOf = async (r: Response): Promise<any> => r.json();

const ORIGIN = "https://static.example";
const SNAP = "snap-e55d81c754270c1f";
const PREV = "snap-0000000000000001";
const OTHER = "snap-0000000000000002";

function selection(id: string, group = "REBAR") {
  return JSON.stringify({ variantXid: id, templateXid: "CTMPL-000007", sku: `SKU-${id}`, variantSpecLabel: "Ø16", productLabel: "Rebar", templateSlug: "rebar", categoryCode: "LONG", categoryLabel: "محصولات طویل", groupCode: group });
}

function setup(overrides: Partial<RfqWorkerEnv> = {}) {
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const pub = new SqliteD1([PUBLIC_MIGRATIONS]);
  const now = new Date().toISOString();
  for (const v of [SNAP, PREV]) pub.sqlite.prepare(`INSERT INTO publication_state (version, created_at, status, updated_at) VALUES (?, ?, ?, ?)`).run(v, now, v === SNAP ? "active" : "superseded", now);
  pub.sqlite.prepare(`INSERT INTO publication_pointer (id, active_version, updated_at) VALUES (1, ?, ?)`).run(SNAP, now);
  const index = (version: string, id: string) => pub.sqlite.prepare(`INSERT INTO rfq_variant_index VALUES (?, 'en', ?, 'CTMPL-000007', 'REBAR', '["kg","ton","branch"]', ?)`).run(version, id, selection(id));
  index(SNAP, "CVAR-000001");
  index(PREV, "CVAR-000001");
  index(PREV, "CVAR-000099"); // removed from the active snapshot
  const limiter = { calls: 0, limit: async () => ({ success: true }) };
  const env: RfqWorkerEnv = {
    DB_OPS: ops.asD1(),
    DB_PUBLIC: pub.asD1(),
    RFQ_RATE_LIMITER: limiter,
    ALLOWED_ORIGINS: ORIGIN,
    TURNSTILE_EXPECTED_HOSTNAMES: "static.example",
    TURNSTILE_SECRET_KEY: "secret",
    ODOO_BASE_URL: "https://stub.example",
    ODOO_RFQ_API_TOKEN: "bearer",
    ODOO_INTAKE_V11: "1",
    DELIVERY_ON_CRON: "1",
    DELIVERY_ON_QUEUE: "1",
    ...overrides,
  };
  return { ops, pub, env };
}

const turnstileOk = (extra: Record<string, unknown> = {}) => (async () => Response.json({ success: true, action: "rfq_submit", hostname: "static.example", ...extra })) as typeof fetch;

function body(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
    locale: "en",
    fullName: "Test Buyer",
    email: "buyer@example.com",
    phoneCountry: "IR",
    phoneLocal: "9121234567",
    items: [{ catalogVariantXid: "CVAR-000001", quantityText: "12", unit: "ton" }],
    website: "",
    formRenderedAt: Date.now() - 60_000,
    turnstileToken: "token",
    catalogSnapshotVersion: SNAP,
    ...overrides,
  };
}

function post(payload: unknown, headers: Record<string, string> = {}) {
  return new Request("https://api.example/api/rfqs", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers }, body: typeof payload === "string" ? payload : JSON.stringify(payload) });
}

// --- CORS / preflight ------------------------------------------------------------

test("preflight: allowed origin -> 204 with exact-origin CORS headers; other origin -> 403 without any Allow-Origin", () => {
  const ok = preflightResponse(new Request("https://api.example/api/rfqs", { method: "OPTIONS", headers: { origin: ORIGIN } }), [ORIGIN]);
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(ok.headers.get("access-control-allow-methods"), "POST");
  const bad = preflightResponse(new Request("https://api.example/api/rfqs", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), [ORIGIN]);
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("POST from a non-allowed or missing Origin is 403 and never reaches Turnstile or D1", async () => {
  const { env, ops } = setup();
  let siteverify = 0;
  const fetchImpl = (async () => (siteverify++, Response.json({ success: true }))) as typeof fetch;
  for (const headers of [{ origin: "https://evil.example" }, { origin: "" }]) {
    const res = await handleRfqSubmit(post(body(), headers), env, { fetchImpl });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  }
  assert.equal(siteverify, 0);
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 0);
});

test("method / content-type / size / JSON are checked first: 405, 415, 413, 400", async () => {
  const { env } = setup();
  assert.equal((await handleRfqSubmit(new Request("https://api.example/api/rfqs", { method: "GET", headers: { origin: ORIGIN } }), env)).status, 405);
  assert.equal((await handleRfqSubmit(post(body(), { "content-type": "text/plain" }), env)).status, 415);
  assert.equal((await handleRfqSubmit(post(body(), { "content-length": "20001" }), env)).status, 413);
  assert.equal((await handleRfqSubmit(post(JSON.stringify(body()).padEnd(20_100, " ")), env)).status, 413);
  assert.equal((await handleRfqSubmit(post("{not json"), env, { fetchImpl: turnstileOk() })).status, 400);
});

// --- Turnstile / rate limit ------------------------------------------------------

test("Turnstile: failure, hostname mismatch and a missing action are 403; Siteverify outage is 503", async () => {
  const { env } = setup();
  for (const verdict of [{ success: false }, { hostname: "evil.example" }, { action: undefined }, { action: "other" }]) {
    const res = await handleRfqSubmit(post(body()), env, { fetchImpl: turnstileOk(verdict) });
    assert.equal(res.status, 403, JSON.stringify(verdict));
  }
  const outage = await handleRfqSubmit(post(body()), env, { fetchImpl: (async () => new Response("x", { status: 500 })) as typeof fetch });
  assert.equal(outage.status, 503);
});

test("rate limit fails CLOSED: missing binding or a binding error -> 503 Retry-After; over the limit -> 429", async () => {
  const missing = setup({ RFQ_RATE_LIMITER: undefined });
  const r1 = await handleRfqSubmit(post(body()), missing.env, { fetchImpl: turnstileOk() });
  assert.equal(r1.status, 503);
  assert.ok(r1.headers.get("retry-after"));
  const broken = setup({ RFQ_RATE_LIMITER: { limit: async () => { throw new Error("down"); } } });
  assert.equal((await handleRfqSubmit(post(body()), broken.env, { fetchImpl: turnstileOk() })).status, 503);
  const limited = setup({ RFQ_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  const r3 = await handleRfqSubmit(post(body()), limited.env, { fetchImpl: turnstileOk() });
  assert.equal(r3.status, 429);
  assert.equal(r3.headers.get("retry-after"), "60");
  assert.equal(limited.ops.q("SELECT count(*) n FROM rfqs")[0].n, 0);
});

// --- schema / numbers -----------------------------------------------------------------

test("strict schema: an unknown field is 422 unknown_field; an uninterpretable quantity is 422 invalid_number", async () => {
  const { env } = setup();
  const unknown = await handleRfqSubmit(post(body({ extra: 1 })), env, { fetchImpl: turnstileOk() });
  assert.equal(unknown.status, 422);
  assert.deepEqual((await jsonOf(unknown)).fieldErrors._, ["unknown_field"]);
  const words = await handleRfqSubmit(post(body({ items: [{ catalogVariantXid: "CVAR-000001", quantityText: "about ten", unit: "ton" }] })), env, { fetchImpl: turnstileOk() });
  assert.equal(words.status, 422);
  assert.deepEqual((await jsonOf(words)).fieldErrors["items[0].quantityText"], ["invalid_number"]);
});

// --- variants ------------------------------------------------------------------------------

test("variants: current snapshot -> 201; previous retained snapshot -> 201 flagged unpublished_at_receipt; unknown -> 422; unretained version -> active", async () => {
  const { env, ops } = setup();
  const current = await handleRfqSubmit(post(body()), env, { fetchImpl: turnstileOk() });
  assert.equal(current.status, 201);
  const prev = await handleRfqSubmit(post(body({ idempotencyKey: "prev-snapshot-key-0001", catalogSnapshotVersion: PREV, items: [{ catalogVariantXid: "CVAR-000099", quantityText: "3", unit: "ton" }] })), env, { fetchImpl: turnstileOk() });
  assert.equal(prev.status, 201);
  assert.deepEqual(ops.q("SELECT variant_ref, unpublished_at_receipt FROM rfq_items ORDER BY created_at, line_number"), [
    { variant_ref: "CVAR-000001", unpublished_at_receipt: 0 },
    { variant_ref: "CVAR-000099", unpublished_at_receipt: 1 },
  ]);
  const unknown = await handleRfqSubmit(post(body({ idempotencyKey: "unknown-variant-key-01", items: [{ catalogVariantXid: "CVAR-424242", quantityText: "3", unit: "ton" }] })), env, { fetchImpl: turnstileOk() });
  assert.equal(unknown.status, 422);
  const fallback = await handleRfqSubmit(post(body({ idempotencyKey: "unretained-version-key", catalogSnapshotVersion: OTHER })), env, { fetchImpl: turnstileOk() });
  assert.equal(fallback.status, 201, "a no-longer-retained version falls back to the active snapshot");
  const stored = ops.q<{ catalog_snapshot_version: string; payload_fingerprint: string }>("SELECT catalog_snapshot_version, payload_fingerprint FROM rfqs ORDER BY created_at");
  assert.deepEqual(stored.map((r) => r.catalog_snapshot_version), [SNAP, PREV, OTHER]);
  assert.ok(stored.every((r) => /^[0-9a-f]{64}$/.test(r.payload_fingerprint)));
});

test("the variant check is ONE query on DB_PUBLIC", async () => {
  const { env, pub } = setup();
  let queries = 0;
  const counting = { prepare: (sql: string) => (queries++, pub.prepare(sql)) } as unknown as D1Database;
  const res = await handleRfqSubmit(post(body({ items: [{ catalogVariantXid: "CVAR-000001", quantityText: "1", unit: "ton" }, { catalogVariantXid: "CVAR-000001", quantityText: "2", unit: "kg" }] })), { ...env, DB_PUBLIC: counting }, { fetchImpl: turnstileOk() });
  assert.equal(res.status, 201);
  assert.equal(queries, 1);
});

// --- idempotency / atomicity -----------------------------------------------------------------

test("idempotency: same key + same payload -> 200 with the original reference; different payload -> 409", async () => {
  const { env, ops } = setup();
  const first = await handleRfqSubmit(post(body()), env, { fetchImpl: turnstileOk() });
  const ref = (await jsonOf(first)).reference;
  const replay = await handleRfqSubmit(post(body({ formRenderedAt: 1 })), env, { fetchImpl: turnstileOk() });
  assert.equal(replay.status, 200, "formRenderedAt/turnstileToken are not part of the fingerprint");
  assert.equal((await jsonOf(replay)).reference, ref);
  const conflict = await handleRfqSubmit(post(body({ message: "changed" })), env, { fetchImpl: turnstileOk() });
  assert.equal(conflict.status, 409);
  assert.equal((await jsonOf(conflict)).code, "IDEMPOTENCY_CONFLICT");
  assert.equal(ops.q("SELECT count(*) n FROM rfqs")[0].n, 1);
});

test("concurrent same-key requests: the loser hits the unique index and returns the winner's result, never 500", async () => {
  const { env, ops } = setup();
  const first = await handleRfqSubmit(post(body()), env, { fetchImpl: turnstileOk() });
  const ref = (await jsonOf(first)).reference;
  // Simulate the race: the loser's pre-insert lookup saw nothing (row committed in between).
  let blind = true;
  const racing = {
    prepare: (sql: string) => {
      const stmt = ops.prepare(sql);
      if (blind && sql.startsWith("SELECT reference_number, payload_fingerprint FROM rfqs")) {
        blind = false;
        return { bind: () => ({ first: async () => null }) };
      }
      return stmt;
    },
    batch: (s: never[]) => ops.batch(s),
  } as unknown as D1Database;
  const same = await handleRfqSubmit(post(body()), { ...env, DB_OPS: racing }, { fetchImpl: turnstileOk() });
  assert.equal(same.status, 200);
  assert.equal((await jsonOf(same)).reference, ref);
  blind = true;
  const different = await handleRfqSubmit(post(body({ message: "other" })), { ...env, DB_OPS: racing }, { fetchImpl: turnstileOk() });
  assert.equal(different.status, 409);
});

// --- W3.2: early idempotency lookup (before Turnstile) --------

test("W3.2: replay (same key + same fingerprint) returns 200 without calling Turnstile", async () => {
  const { env } = setup();
  let turnstileCalls = 0;
  const fetchImplWrapper = (async () => {
    turnstileCalls++;
    return Response.json({ success: true, action: "rfq_submit", hostname: "static.example" });
  }) as typeof fetch;

  // First request: creates RFQ, Turnstile is called.
  const first = await handleRfqSubmit(post(body()), env, { fetchImpl: fetchImplWrapper });
  assert.equal(first.status, 201);
  const ref = (await jsonOf(first)).reference;
  assert.equal(turnstileCalls, 1, "first request calls Turnstile");

  // Second request (replay): same body, different turnstileToken and formRenderedAt.
  // Should return 200 without calling Turnstile (early lookup catches it).
  const replay = await handleRfqSubmit(
    post(body({ turnstileToken: "invalid-token-should-not-be-used", formRenderedAt: 1 })),
    env,
    { fetchImpl: fetchImplWrapper },
  );
  assert.equal(replay.status, 200, "replay returns 200");
  assert.equal((await jsonOf(replay)).reference, ref);
  assert.equal(turnstileCalls, 1, "replay does not call Turnstile (caught by early lookup)");
});

test("W3.2: conflict (same key + different fingerprint) returns 409 without calling Turnstile", async () => {
  const { env } = setup();
  let turnstileCalls = 0;
  const fetchImplWrapper = (async () => {
    turnstileCalls++;
    return Response.json({ success: true, action: "rfq_submit", hostname: "static.example" });
  }) as typeof fetch;

  // First request: creates RFQ.
  const first = await handleRfqSubmit(post(body()), env, { fetchImpl: fetchImplWrapper });
  assert.equal(first.status, 201);
  assert.equal(turnstileCalls, 1);

  // Second request (conflict): same key but changed message.
  // Should return 409 without calling Turnstile.
  const conflict = await handleRfqSubmit(
    post(body({ message: "different message", turnstileToken: "another-token" })),
    env,
    { fetchImpl: fetchImplWrapper },
  );
  assert.equal(conflict.status, 409);
  assert.equal((await jsonOf(conflict)).code, "IDEMPOTENCY_CONFLICT");
  assert.equal(turnstileCalls, 1, "conflict does not call Turnstile (caught by early lookup)");
});

test("W3.2: invalid idempotencyKey is rejected before contract check", async () => {
  const { env } = setup();
  let turnstileCalls = 0;
  const fetchImplWrapper = (async () => {
    turnstileCalls++;
    return Response.json({ success: true, action: "rfq_submit", hostname: "static.example" });
  }) as typeof fetch;

  for (const badKey of ["short", "", "x".repeat(200), "invalid!key"]) {
    const res = await handleRfqSubmit(post(body({ idempotencyKey: badKey })), env, { fetchImpl: fetchImplWrapper });
    assert.equal(res.status, 422);
    assert((await jsonOf(res)).fieldErrors.idempotencyKey?.length > 0);
  }
  // No Turnstile calls for invalid keys.
  assert.equal(turnstileCalls, 0);
});

test("the intake write is one atomic batch: a failing statement leaves no RFQ, line, contact or outbox row", async () => {
  const ops = new SqliteD1([OPS_MIGRATIONS]);
  const validated = validateRfqSubmission(body());
  assert.ok(validated.ok && validated.value);
  const failing = {
    prepare: (sql: string) => ops.prepare(sql),
    batch: (stmts: { exec: () => unknown }[]) => ops.batch([...stmts, { exec: () => { throw new Error("injected failure"); } }]),
  } as unknown as D1Database;
  const record = { ...validated.value, items: [{ source: "freeform", categoryRef: null, productRef: null, variantRef: null, unitRef: "kg", categoryLabel: null, productLabel: "x", variantLabel: null, unitLabel: "kg", freeformTitle: "x", sizeText: null, quantityText: "1", quantityValue: 1, quantityScale: 0, description: null, skuSnapshot: null, lengthMm: null }] } as never;
  await assert.rejects(persistRfq(failing, record, "h".repeat(64), "c", { payloadFingerprint: "f".repeat(64), catalogSnapshotVersion: null }), /injected failure/);
  for (const table of ["rfqs", "rfq_items", "rfq_contacts", "rfq_status_history", "integration_outbox"]) assert.equal(ops.q(`SELECT count(*) n FROM ${table}`)[0].n, 0, table);
});

// --- delivery ----------------------------------------------------------------------------------

async function seedRfq(env: RfqWorkerEnv, key = "seed-key-000000000001") {
  const res = await handleRfqSubmit(post(body({ idempotencyKey: key })), env, { fetchImpl: turnstileOk() });
  assert.equal(res.status, 201);
  return (env.DB_OPS as unknown as SqliteD1).q<{ id: string; reference_number: string; submitted_at: string }>("SELECT id, reference_number, submitted_at FROM rfqs WHERE idempotency_key_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1")[0];
}

function odoo(responses: (Response | Error)[], seen: { headers: Headers; body: Record<string, unknown> }[] = []) {
  return (async (_url: string, init: RequestInit) => {
    seen.push({ headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
    const next = responses.shift() ?? Response.json({ data: { reference: "RFQ-X" } }, { status: 201 });
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
}
const cfg = (env: RfqWorkerEnv, extra: Partial<DeliveryConfig> = {}): DeliveryConfig => ({ odooBaseUrl: env.ODOO_BASE_URL!, token: "bearer", intakeV11: true, random: () => 0.5, ...extra });

test("delivery classification for every Odoo status, written in ONE batch per attempt", async () => {
  const cases: [Response | Error, string, string, string][] = [
    [Response.json({ data: { reference: "RFQ-1" } }, { status: 201 }), "DELIVERED", "synced", "published"],
    [Response.json({ data: { reference: "RFQ-1" }, meta: { idempotent_replay: true } }, { status: 200 }), "DELIVERED", "synced", "published"],
    [Response.json({ error: { code: "invalid_payload" } }, { status: 400 }), "MANUAL_REVIEW", "manual_review", "dead"],
    [Response.json({ error: { code: "invalid_received_at" } }, { status: 400 }), "MANUAL_REVIEW", "manual_review", "dead"],
    [Response.json({ error: { code: "unauthorized" } }, { status: 401 }), "RETRY_PENDING_ALERT", "retry", "retry"],
    [new Response("", { status: 403 }), "RETRY_PENDING_ALERT", "retry", "retry"],
    [Response.json({ error: { code: "idempotency_conflict" } }, { status: 409 }), "MANUAL_REVIEW", "manual_review", "dead"],
    [Response.json({ error: { code: "payload_too_large" } }, { status: 413 }), "MANUAL_REVIEW", "manual_review", "dead"],
    [Response.json({ error: { code: "unsupported_media_type" } }, { status: 415 }), "MANUAL_REVIEW", "manual_review", "dead"],
    [new Response("", { status: 429 }), "RETRY_PENDING", "retry", "retry"],
    [Response.json({ error: { code: "internal_error" } }, { status: 500 }), "RETRY_PENDING", "retry", "retry"],
    [Response.json({ error: { code: "concurrency_retry" } }, { status: 503 }), "RETRY_PENDING", "retry", "retry"],
    [new TypeError("network down"), "RETRY_PENDING", "retry", "retry"],
    [Object.assign(new Error("aborted"), { name: "AbortError" }), "RETRY_PENDING", "retry", "retry"],
    [Response.json({ data: {} }, { status: 201 }), "RETRY_PENDING", "retry", "retry"],
  ];
  for (const [response, classification, syncStatus, outboxStatus] of cases) {
    const { env, ops } = setup();
    const rfq = await seedRfq(env);
    const before = ops.batchCalls;
    const result = await deliverOne(env.DB_OPS, rfq.id, cfg(env, { fetchImpl: odoo([response]) }));
    assert.equal(result.status, "done");
    if (result.status !== "done") continue;
    assert.equal(result.classification, classification, `${response instanceof Error ? response.name : response.status}`);
    assert.equal(ops.batchCalls - before, 1, "all post-delivery writes in one batch");
    const row = ops.q<{ sync_status: string; odoo_rfq_reference: string | null; last_sync_error_code: string | null }>("SELECT sync_status, odoo_rfq_reference, last_sync_error_code FROM rfqs WHERE id = ?", rfq.id)[0];
    assert.equal(row.sync_status, syncStatus);
    const outbox = ops.q<{ status: string; attempt_count: number; last_attempt_at: string | null; last_error: string | null; available_at: string }>("SELECT status, attempt_count, last_attempt_at, last_error, available_at FROM integration_outbox")[0];
    assert.equal(outbox.status, outboxStatus);
    assert.equal(outbox.attempt_count, 1);
    assert.ok(outbox.last_attempt_at);
    assert.equal(ops.q("SELECT count(*) n FROM integration_attempts")[0].n, 1);
    if (classification === "DELIVERED") assert.equal(row.odoo_rfq_reference, "RFQ-1");
    else assert.ok(row.last_sync_error_code && !/[\s{]/.test(row.last_sync_error_code), "a short code, never an Odoo message");
  }
});

test("backoff: min(60, 2^n) minutes with ±20 % jitter", () => {
  assert.equal(backoffMs(1, () => 0.5), 2 * 60_000);
  assert.equal(backoffMs(3, () => 0.5), 8 * 60_000);
  assert.equal(backoffMs(6, () => 0.5), 60 * 60_000);
  assert.equal(backoffMs(20, () => 0.5), 60 * 60_000);
  assert.equal(backoffMs(3, () => 0), Math.round(8 * 60_000 * 0.8));
  assert.equal(backoffMs(3, () => 1), Math.round(8 * 60_000 * 1.2));
});

test("received_at (= acceptance time) and website_reference are sent only with ODOO_INTAKE_V11, unchanged on every retry; key is rfq-<id>", async () => {
  const { env, ops } = setup();
  const rfq = await seedRfq(env);
  const seen: { headers: Headers; body: Record<string, unknown> }[] = [];
  const first = await deliverOne(env.DB_OPS, rfq.id, cfg(env, { fetchImpl: odoo([Response.json({}, { status: 503 })], seen) }));
  assert.equal(first.status === "done" && first.classification, "RETRY_PENDING");
  ops.sqlite.exec("UPDATE integration_outbox SET available_at = '2000-01-01T00:00:00.000Z'");
  await deliverOne(env.DB_OPS, rfq.id, cfg(env, { fetchImpl: odoo([], seen) }));
  assert.equal(seen.length, 2);
  for (const s of seen) {
    assert.equal(s.body.received_at, rfq.submitted_at);
    assert.equal(s.body.website_reference, rfq.reference_number);
    assert.equal(s.headers.get("idempotency-key"), `rfq-${rfq.id}`);
    assert.equal(s.headers.get("authorization"), "Bearer bearer");
  }
  assert.deepEqual(seen[0].body, seen[1].body, "a retry resends the identical payload");
  const v1 = setup();
  const r2 = await seedRfq(v1.env);
  const seenV1: { headers: Headers; body: Record<string, unknown> }[] = [];
  await deliverOne(v1.env.DB_OPS, r2.id, cfg(v1.env, { intakeV11: false, token: null, fetchImpl: odoo([], seenV1) }));
  assert.ok(!("received_at" in seenV1[0].body) && !("website_reference" in seenV1[0].body));
  assert.equal(seenV1[0].headers.get("authorization"), null, "token null = no Authorization header (real-Odoo 401 probe)");
});

test("one RFQ per run: three due RFQs, one reconcile delivers exactly one (the oldest)", async () => {
  const { env, ops } = setup({ DELIVERY_ON_QUEUE: "0" });
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await seedRfq(env, `one-per-run-key-000${i}`)).id);
  ids.forEach((id, i) => ops.sqlite.prepare("UPDATE rfqs SET submitted_at = ? WHERE id = ?").run(`2026-10-02T08:0${i}:00.000Z`, id));
  let posts = 0;
  const fetchImpl = (async () => (posts++, Response.json({ data: { reference: "RFQ-1" } }, { status: 201 }))) as typeof fetch;
  const outcome = await reconcileOnce(env, new Date(), cfg(env, { fetchImpl }));
  assert.equal(outcome.action, "delivered");
  assert.equal(posts, 1);
  assert.equal(outcome.picked, ids[0]);
  assert.deepEqual(ops.q("SELECT sync_status, count(*) n FROM rfqs GROUP BY sync_status ORDER BY sync_status"), [{ sync_status: "pending", n: 2 }, { sync_status: "synced", n: 1 }]);
});

test("reconciler: with the Queue path enabled it only enqueues; with both paths disabled it does nothing (CI reconciler owns delivery)", async () => {
  const sent: unknown[] = [];
  const queued = setup({ RFQ_QUEUE: { send: async (m: unknown) => void sent.push(m) } as unknown as Queue });
  await seedRfq(queued.env);
  assert.equal((await reconcileOnce(queued.env)).action, "enqueued");
  assert.equal(sent.length, 1);
  const off = setup({ DELIVERY_ON_QUEUE: "0", DELIVERY_ON_CRON: "0" });
  await seedRfq(off.env);
  assert.equal((await reconcileOnce(off.env)).action, "disabled");
});

test("queue consumer: one message = one RFQ; retryable outcomes are retried with a delay; DELIVERY_ON_QUEUE=0 acks without delivering", async () => {
  const { env } = setup();
  const rfq = await seedRfq(env);
  const calls: string[] = [];
  const msg = (id: string) => ({ body: { aggregate_id: id }, attempts: 1, ack: () => calls.push("ack"), retry: (o?: { delaySeconds?: number }) => calls.push(`retry:${o?.delaySeconds}`) });
  await consumeOne(msg(rfq.id), env, cfg(env, { fetchImpl: odoo([Response.json({}, { status: 503 })]) }));
  assert.match(calls[0], /^retry:\d+$/);
  const off = setup({ DELIVERY_ON_QUEUE: "0" });
  const r2 = await seedRfq(off.env);
  const offCalls: string[] = [];
  await consumeOne({ ...msg(r2.id), ack: () => offCalls.push("ack") }, off.env);
  assert.deepEqual(offCalls, ["ack"]);
});

test("kill after POST, before the result batch: the RFQ stays claimed, becomes due after 15 min, and re-delivery is a replay — no duplicate", async () => {
  const { env, ops } = setup();
  const rfq = await seedRfq(env);
  const stub = new Map<string, string>(); // idempotency key -> stored fingerprint (payload JSON)
  const odooStub = (async (_u: string, init: RequestInit) => {
    const key = new Headers(init.headers).get("idempotency-key")!;
    const existing = stub.get(key);
    if (existing === undefined) {
      stub.set(key, String(init.body));
      return Response.json({ data: { reference: "STUB-1" } }, { status: 201 });
    }
    return existing === String(init.body) ? Response.json({ data: { reference: "STUB-1" }, meta: { idempotent_replay: true } }, { status: 200 }) : Response.json({ error: { code: "idempotency_conflict" } }, { status: 409 });
  }) as typeof fetch;
  await assert.rejects(deliverOne(env.DB_OPS, rfq.id, cfg(env, { fetchImpl: odooStub, afterPost: () => { throw new Error("TEST_KILL_AFTER_POST"); } })), /TEST_KILL_AFTER_POST/);
  assert.equal(ops.q("SELECT sync_status FROM rfqs")[0].sync_status, "syncing");
  assert.equal(await pickDueRfq(env.DB_OPS, new Date()), null, "not due while the claim is fresh");
  const later = new Date(Date.now() + STALE_SYNCING_MS + 60_000);
  assert.equal(await pickDueRfq(env.DB_OPS, later), rfq.id);
  const result = await deliverOne(env.DB_OPS, rfq.id, cfg(env, { fetchImpl: odooStub, now: () => later }));
  assert.equal(result.status === "done" && result.httpStatus, 200);
  assert.equal(result.status === "done" && result.classification, "DELIVERED");
  assert.equal(stub.size, 1, "Odoo holds exactly one RFQ for this key");
  assert.equal(ops.q("SELECT odoo_rfq_reference FROM rfqs")[0].odoo_rfq_reference, "STUB-1");
});

// --- CI reconciler parity ------------------------------------------------------------------------

test("CI reconciler: wrangler adapter inlines ?/?NNN parameters as safe literals (quotes escaped, NULLs, numbers)", () => {
  assert.equal(sqlLiteral("O'Brien"), "'O''Brien'");
  assert.equal(sqlLiteral(null), "NULL");
  assert.equal(sqlLiteral(12.5), "12.5");
  assert.equal(inlineParams("SELECT ? , ?2, ?1, 'a?b' WHERE x = ?", ["x", "y", 3]), "SELECT 'x' , 'y', 'x', 'a?b' WHERE x = 'y'");
});

test("CI reconciler parity: the same deliverOne over an inlined-SQL adapter gives the same rows as the Worker binding", async () => {
  const run = async (inlined: boolean) => {
    const { env, ops } = setup();
    const rfq = await seedRfq(env);
    const db = inlined
      ? ({
          prepare: (sql: string) => {
            const make = (params: unknown[]) => {
              const literal = inlineParams(sql, params as never);
              return { bind: (...p: unknown[]) => make(p), first: () => ops.prepare(literal).first(), all: () => ops.prepare(literal).all(), run: () => ops.prepare(literal).run(), exec: () => ops.prepare(literal).exec() };
            };
            return make([]);
          },
          batch: (s: never[]) => ops.batch(s),
        } as unknown as D1Database)
      : env.DB_OPS;
    const res = await deliverOne(db, rfq.id, cfg(env, { fetchImpl: odoo([]), now: () => new Date("2026-10-02T08:00:00.000Z") }));
    const rows = ops.q("SELECT sync_status, odoo_rfq_reference FROM rfqs").concat(ops.q("SELECT status, attempt_count, last_error FROM integration_outbox"));
    return { classification: res.status === "done" ? res.classification : res.status, rows };
  };
  assert.deepEqual(await run(true), await run(false));
  const script = fs.readFileSync(new URL("../../scripts/rfq/ci-reconciler.ts", import.meta.url), "utf8");
  assert.match(script, /import \{ deliverOne, pickDueRfq \} from "\.\.\/\.\.\/lib\/rfq-worker\/delivery\.ts";/);
});

test("the RFQ Worker entry imports no vinext/Next module", () => {
  const files = ["../../workers/rfq/index.ts", "../../workers/rfq/index.staging.ts", "../../workers/rfq/app.ts", "../../workers/rfq/test-routes.ts", "./admin.ts", "./submit.ts", "./delivery.ts", "./runners.ts", "./cors.ts", "./variant-index.ts", "./config.ts"];
  for (const f of files) assert.doesNotMatch(fs.readFileSync(new URL(f, import.meta.url), "utf8"), /from "(vinext|next)(\/[^"]*)?"|@vinext|cloudflare:workers/, f);
});

test("queue handoff: a QUEUED RFQ is delivered by its Queue message at once, while the cron waits for the grace period", async () => {
  const { env, ops } = setup();
  const rfq = await seedRfq(env);
  // What workers/rfq/app.ts queueHandoff does after a successful send.
  ops.sqlite.prepare("UPDATE rfqs SET sync_status = 'queued' WHERE id = ?").run(rfq.id);
  ops.sqlite.prepare("UPDATE integration_outbox SET status = 'published', available_at = ?").run(new Date(Date.now() + 120_000).toISOString());
  assert.equal(await pickDueRfq(env.DB_OPS, new Date()), null, "the cron does not re-drive a freshly queued RFQ");
  const calls: string[] = [];
  const result = await consumeOne({ body: { aggregate_id: rfq.id }, attempts: 1, ack: () => calls.push("ack"), retry: () => calls.push("retry") }, env, cfg(env, { fetchImpl: odoo([]) }));
  assert.equal(result?.status === "done" && result.classification, "DELIVERED");
  assert.deepEqual(calls, ["ack"]);
  assert.equal(ops.q("SELECT sync_status FROM rfqs")[0].sync_status, "synced");
});
