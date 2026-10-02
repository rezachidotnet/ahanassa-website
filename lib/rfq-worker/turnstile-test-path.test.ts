import { test } from "node:test";
import assert from "node:assert/strict";
import { stagingTurnstileTestPath } from "../../workers/rfq/test-routes.ts";
import type { RfqWorkerEnv } from "./config.ts";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const env = { TURNSTILE_SECRET_KEY: "real-secret", TURNSTILE_EXPECTED_HOSTNAMES: "static.example" } as unknown as RfqWorkerEnv;

test("staging Turnstile test path: off unless TURNSTILE_TEST_MODE=1; accepts ONLY Cloudflare testing-key results", async () => {
  assert.deepEqual(stagingTurnstileTestPath(env), { env });
  const realFetch = globalThis.fetch;
  try {
    const sent: string[] = [];
    let next: Record<string, unknown> = {};
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(String(init?.body ?? ""));
      return Response.json(next);
    }) as typeof fetch;
    const p = stagingTurnstileTestPath({ ...env, TURNSTILE_TEST_MODE: "1" });
    assert.equal(p.env.TURNSTILE_SECRET_KEY, "1x0000000000000000000000000000000AA");
    next = { success: true, hostname: "example.com", metadata: { result_with_testing_key: true } };
    assert.deepEqual(await (await p.fetchImpl!(SITEVERIFY, { method: "POST", body: "x" })).json(), { ...next, hostname: "static.example", action: "rfq_submit" });
    next = { success: true, hostname: "static.example", action: "rfq_submit" }; // a real-key result is NOT accepted on this path
    assert.equal(((await (await p.fetchImpl!(SITEVERIFY, { method: "POST" })).json()) as { success: boolean }).success, false);
    next = { success: false, metadata: { result_with_testing_key: true } };
    assert.equal(((await (await p.fetchImpl!(SITEVERIFY, { method: "POST" })).json()) as { success: boolean }).success, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});
