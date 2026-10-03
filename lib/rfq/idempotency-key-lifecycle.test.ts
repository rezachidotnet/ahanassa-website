import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createIdempotencyKeyLifecycle } from "./idempotency-key-lifecycle.ts";
import { submitRfqWithRetry } from "./submit-with-retry.ts";

function counter() {
  let n = 0;
  return () => `key-${String(++n).padStart(16, "0")}`;
}

/** Mirrors EnquiryForm.handleSubmit: read the key, submit, on a non-ok answer only reset Turnstile. */
async function attempt(lc: ReturnType<typeof createIdempotencyKeyLifecycle>, answers: Response[], tokens: string[]) {
  const seen: { key: string; token: string }[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    seen.push({ key: b.idempotencyKey, token: b.turnstileToken });
    return answers.shift()!;
  }) as unknown as typeof fetch;
  const token = tokens.shift()!;
  const out = await submitRfqWithRetry("https://api/x", { idempotencyKey: lc.current(), turnstileToken: token }, { fetchImpl, sleep: async () => {}, random: () => 0.5 });
  return { out, seen };
}
const j = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

test("error -> try again -> same key, fresh token", async () => {
  const lc = createIdempotencyKeyLifecycle(counter());
  const k = lc.current();
  const a = await attempt(lc, [j(503, { ok: false, code: "SERVICE_UNAVAILABLE" }), j(503, { ok: false }), j(503, { ok: false })], ["t1"]);
  assert.equal(a.out.status, 503);
  const b = await attempt(lc, [j(201, { ok: true, reference: "AA-RFQ-1", status: "received" })], ["t2"]);
  assert.equal(b.out.status, 201);
  assert.deepEqual([...a.seen, ...b.seen].map((s) => s.key), [k, k, k, k]);
  assert.equal(b.seen[0].token, "t2");
});

test("403 Turnstile failure -> same key kept (widget reset only), retry sends same key", async () => {
  const lc = createIdempotencyKeyLifecycle(counter());
  const k = lc.current();
  const a = await attempt(lc, [j(403, { ok: false, code: "VERIFICATION_FAILED" })], ["t1"]);
  assert.equal(a.out.status, 403);
  assert.equal(a.seen.length, 1, "4xx is not retried");
  assert.equal(lc.current(), k);
  const b = await attempt(lc, [j(200, { ok: true, reference: "AA-RFQ-1", status: "received" })], ["t2"]);
  assert.equal(b.seen[0].key, k);
});

test("network error after retries -> same key", async () => {
  const lc = createIdempotencyKeyLifecycle(counter());
  const k = lc.current();
  const fetchImpl = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  await assert.rejects(submitRfqWithRetry("https://api/x", { idempotencyKey: lc.current() }, { fetchImpl, sleep: async () => {}, random: () => 0.5 }));
  assert.equal(lc.current(), k);
});

test("field edit -> new key", () => {
  const lc = createIdempotencyKeyLifecycle(counter());
  const k = lc.current();
  lc.payloadEdited();
  assert.notEqual(lc.current(), k);
});

test("success -> next request gets a new key", async () => {
  const lc = createIdempotencyKeyLifecycle(counter());
  const k = lc.current();
  const a = await attempt(lc, [j(201, { ok: true, reference: "AA-RFQ-1", status: "received" })], ["t1"]);
  assert.equal(a.out.status, 201);
  assert.equal(lc.current(), k, "key is stable until the customer starts a new request");
  lc.startNewRequest();
  assert.notEqual(lc.current(), k);
});

test("EnquiryForm wiring: the key is rotated only by payload edits and startNewRequest, never in the error path", () => {
  const src = readFileSync(new URL("../../components/contact/enquiry-form.tsx", import.meta.url), "utf8");
  const submit = src.slice(src.indexOf("async function handleSubmit"), src.indexOf("function startNewRequest"));
  assert.doesNotMatch(submit, /payloadEdited|startNewRequest|generateIdempotencyKey|regenerateIdempotencyKey/);
  assert.match(submit, /idempotencyKeyRef\.current\.current\(\)/);
  const start = src.slice(src.indexOf("function startNewRequest"), src.indexOf("if (status === \"success\""));
  assert.match(start, /idempotencyKeyRef\.current\.startNewRequest\(\)/);
});
