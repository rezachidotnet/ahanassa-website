import assert from "node:assert/strict";
import test from "node:test";
import { RETRY_DELAYS_MS, submitRfqWithRetry } from "./submit-with-retry.ts";

const ok = (status: number) => new Response(JSON.stringify({ ok: true, reference: "AA-RFQ-01ABC", status: "received" }), { status });
const err = (status: number, code = "SERVICE_UNAVAILABLE") => new Response(JSON.stringify({ ok: false, code }), { status });

function harness(steps: Array<Response | Error>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const delays: number[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const step = steps[calls.length - 1];
    if (!step) throw new Error("unexpected extra attempt");
    if (step instanceof Error) throw step;
    return step;
  }) as unknown as typeof fetch;
  return { calls, delays, deps: { fetchImpl, sleep: async (ms: number) => void delays.push(ms), random: () => 0.5 } };
}
const payload = { idempotencyKey: "key-aaaaaaaaaaaaaaaa", fullName: "X" };

test("network error then 201 -> success after one retry", async () => {
  const h = harness([new TypeError("fetch failed"), ok(201)]);
  const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
  assert.equal(r.status, 201);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.delays, [1000]);
});

test("503, 503, 201 -> success after two retries (1 s then 3 s)", async () => {
  const h = harness([err(503), err(503), ok(201)]);
  const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
  assert.equal(r.status, 201);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.delays, [...RETRY_DELAYS_MS]);
});

test("503 x3 -> last failure returned (normal error), exactly 3 attempts", async () => {
  const h = harness([err(503), err(503), err(503)]);
  const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
  assert.equal(r.status, 503);
  assert.equal(r.body?.ok, false);
  assert.equal(h.calls.length, 3);
});

test("network error x3 -> throws the last error after 3 attempts", async () => {
  const h = harness([new TypeError("a"), new TypeError("b"), new TypeError("c")]);
  await assert.rejects(submitRfqWithRetry("https://api/x", payload, h.deps), /c/);
  assert.equal(h.calls.length, 3);
});

test("4xx is never retried", async () => {
  for (const status of [400, 403, 409, 422, 429]) {
    const h = harness([err(status, "VALIDATION_ERROR")]);
    const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
    assert.equal(r.status, status);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.delays, []);
  }
});

test("non-JSON 5xx body is retried, not thrown", async () => {
  const h = harness([new Response("<html>bad gateway</html>", { status: 502 }), ok(201)]);
  const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
  assert.equal(r.status, 201);
});

test("identical body (same idempotencyKey) on every attempt", async () => {
  const h = harness([err(503), new TypeError("x"), ok(201)]);
  await submitRfqWithRetry("https://api/x", payload, h.deps);
  const bodies = h.calls.map((c) => c.init.body);
  assert.equal(new Set(bodies).size, 1);
  assert.equal(JSON.parse(String(bodies[0])).idempotencyKey, payload.idempotencyKey);
});

test("200 replay after a retry is success with the returned reference", async () => {
  const h = harness([err(503), ok(200)]);
  const r = await submitRfqWithRetry("https://api/x", payload, h.deps);
  assert.equal(r.status, 200);
  assert.equal(r.body && r.body.ok && r.body.reference, "AA-RFQ-01ABC");
});
