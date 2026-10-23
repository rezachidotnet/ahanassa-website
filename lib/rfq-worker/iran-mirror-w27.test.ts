import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRfqWorker } from "../../workers/rfq/app.ts";
import { RFQ_SUBMIT_ALLOWED_ORIGINS } from "../contracts/rfq-submit-v1.ts";
import { verifyTurnstileToken } from "../security/turnstile.ts";
import { csv, type RfqWorkerEnv } from "./config.ts";

/**
 * W27 Iran mirror (owner 2026-10-22): the static site is also served as www.ahanassa.ir / ahanassa.ir (ArvanCloud CDN
 * → www.ahanassa.com) and its form posts to api.ahanassa.ir (Arvan → api.ahanassa.com). The RFQ Worker's production
 * CORS allow-list and Turnstile hostnames must therefore carry both .ir hosts; staging has no .ir host.
 */

/** JSONC → JSON, string-aware ("//" inside a URL string is not a comment), trailing commas dropped. */
function stripJsonc(src: string): string {
  let out = "";
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2) + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

type Vars = Record<string, string>;
const config = JSON.parse(stripJsonc(readFileSync(new URL("../../workers/rfq/wrangler.jsonc", import.meta.url), "utf8"))) as { env: Record<string, { vars: Vars }> };
const production = config.env.production.vars;
const staging = config.env.staging.vars;

const MIRROR_ORIGINS = ["https://www.ahanassa.ir", "https://ahanassa.ir", "https://new.ahanassa.ir"];

test("W27: production ALLOWED_ORIGINS = the rfq_submit.v1 contract, incl. both Iran mirror origins; staging unchanged", () => {
  assert.deepEqual(csv(production.ALLOWED_ORIGINS), [...RFQ_SUBMIT_ALLOWED_ORIGINS.production]);
  for (const origin of MIRROR_ORIGINS) assert.ok(csv(production.ALLOWED_ORIGINS).includes(origin), origin);
  assert.deepEqual(csv(staging.ALLOWED_ORIGINS), [...RFQ_SUBMIT_ALLOWED_ORIGINS.staging]);
  assert.ok(!staging.ALLOWED_ORIGINS.includes(".ir"));
});

test("W27: production TURNSTILE_EXPECTED_HOSTNAMES = the hosts of the allowed origins; staging unchanged", () => {
  assert.deepEqual(csv(production.TURNSTILE_EXPECTED_HOSTNAMES), csv(production.ALLOWED_ORIGINS).map((o) => new URL(o).hostname));
  assert.deepEqual(csv(staging.TURNSTILE_EXPECTED_HOSTNAMES), ["ahanassa-v11-static-staging.nova-b1e6f0.workers.dev"]);
});

const worker = createRfqWorker();
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
// Only the vars the CORS paths read; the bucket/AI fakes make GET /files report upload as on, as in production.
const env = { ...production, RFQ_FILES: {}, AI: { run: async () => ({}) } } as unknown as RfqWorkerEnv;
// The Worker sees api.ahanassa.com: Arvan forwards api.ahanassa.ir with Host api.ahanassa.com.
const at = (path: string, init: RequestInit) => worker.fetch(new Request(`https://api.ahanassa.com${path}`, init), env, ctx);

test("W27: preflight for submit, files and extract answers the Iran mirror origins with exact-origin CORS", async () => {
  for (const origin of ["https://www.ahanassa.com", ...MIRROR_ORIGINS]) {
    for (const path of ["/api/rfqs", "/api/rfqs/files", "/api/rfqs/files/AA-1/1", "/api/rfqs/extract"]) {
      const res = await at(path, { method: "OPTIONS", headers: { origin, "access-control-request-method": "POST" } });
      assert.equal(res.status, 204, `${origin} ${path}`);
      assert.equal(res.headers.get("access-control-allow-origin"), origin, `${origin} ${path}`);
    }
  }
});

test("W27: GET /api/rfqs/files (the form's capability check) carries CORS for a .ir page", async () => {
  for (const origin of MIRROR_ORIGINS) {
    const res = await at("/api/rfqs/files", { method: "GET", headers: { origin } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), origin);
    assert.equal(((await res.json()) as { enabled: boolean }).enabled, true);
  }
});

test("W27: look-alike origins are still refused (exact match, no suffix/wildcard)", async () => {
  for (const origin of ["http://www.ahanassa.ir", "https://evil.ahanassa.ir", "https://www.ahanassa.ir.evil.example", "https://wwwahanassa.ir", "https://api.ahanassa.ir"]) {
    const res = await at("/api/rfqs", { method: "OPTIONS", headers: { origin } });
    assert.equal(res.status, 403, origin);
    assert.equal(res.headers.get("access-control-allow-origin"), null, origin);
  }
});

test("W27: a Turnstile token solved on www.ahanassa.ir / ahanassa.ir passes the production hostname check; others do not", async () => {
  const siteverify = (hostname: string) => (async () => Response.json({ success: true, action: "rfq_submit", hostname })) as typeof fetch;
  const verify = (hostname: string) => verifyTurnstileToken("token", { secret: "s", fetchImpl: siteverify(hostname), expectedHostnames: csv(production.TURNSTILE_EXPECTED_HOSTNAMES), requireAction: true });
  for (const hostname of ["www.ahanassa.com", "www.ahanassa.ir", "ahanassa.ir", "new.ahanassa.ir"]) assert.deepEqual(await verify(hostname), { ok: true }, hostname);
  for (const hostname of ["evil.ahanassa.ir", "ahanassa.com", "api.ahanassa.ir"]) assert.deepEqual(await verify(hostname), { ok: false, reason: "invalid" }, hostname);
});
