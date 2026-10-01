/**
 * Spike S1 — standalone RFQ Worker (architecture V1.1-RC1 §4.3/§6).
 *
 * Imports NO vinext / Next.js runtime module: only lib/rfq, lib/security,
 * lib/queue, lib/odoo and lib/db. Routes:
 *   OPTIONS/POST /api/rfqs           RFQ intake (CORS for the spike static origin)
 *   POST /__spike/reconcile          direct reconciler run (admin token)
 *   GET  /__spike/odoo-reachability  Part D probe (admin token; removed before deletion)
 *
 * Odoo delivery is pointed at ODOO_BASE_URL=https://odoo-stub.spike.invalid,
 * answered in-process by a stub below — it can never reach the real Odoo.
 */
import { ulid } from "@/lib/rfq/ulid";
import { MAX_BODY_BYTES } from "@/lib/rfq/validation";
import { checkRfqRateLimit, getClientIp } from "@/lib/security/rate-limit-binding";
import { getOpsDb } from "@/lib/db/ops";
import { spikeSubmitRfq } from "./service";
import { spikeReconcile } from "./reconciler";

interface SpikeEnv {
  ALLOWED_ORIGIN?: string;
  SPIKE_ADMIN_TOKEN?: string;
  ENABLE_REACHABILITY_ROUTE?: string;
}

const STUB_ORIGIN = "https://odoo-stub.spike.invalid";
const realFetch = globalThis.fetch.bind(globalThis);
let stubSeq = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(STUB_ORIGIN)) {
    stubSeq++;
    return Response.json({ data: { reference: `STUB-${Date.now()}-${stubSeq}` }, verification_session: null }, { status: 201 });
  }
  return realFetch(input, init);
}) as typeof fetch;

function cors(env: SpikeEnv, request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (origin && env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) {
    return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
  }
  return {};
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function handleRfq(request: Request, env: SpikeEnv): Promise<Response> {
  const corsHeaders = cors(env, request);
  const correlationId = ulid();
  const origin = request.headers.get("origin");
  if (origin && origin !== env.ALLOWED_ORIGIN && origin !== new URL(request.url).origin) {
    return json(403, { ok: false, code: "VERIFICATION_FAILED" });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json(415, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["unsupported_content_type"] } }, corsHeaders);
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, corsHeaders);
  const rate = await checkRfqRateLimit(request);
  if (!rate.allowed) return json(429, { ok: false, code: "RATE_LIMITED" }, { "Retry-After": "60", ...corsHeaders });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, corsHeaders);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["invalid_json"] } }, corsHeaders);
  }
  try {
    const clientIp = getClientIp(request);
    const { status, body: out } = await spikeSubmitRfq(body, { correlationId, clientIp: clientIp === "unknown" ? undefined : clientIp });
    return json(status, out, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ operation: "rfq.submit", correlationId, result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
    return json(500, { ok: false, code: "SERVICE_UNAVAILABLE" }, corsHeaders);
  }
}

async function reachability(): Promise<Response> {
  const probe = async (label: string, init: RequestInit & { url: string }) => {
    const t0 = Date.now();
    try {
      const r = await realFetch(init.url, init);
      await r.body?.cancel();
      return { label, status: r.status, ms: Date.now() - t0 };
    } catch (e) {
      return { label, status: null, error: e instanceof Error ? e.name : "error", ms: Date.now() - t0 };
    }
  };
  return json(200, {
    from: "cloudflare-worker",
    results: [
      await probe("GET /api/v1/catalog/meta", { url: "https://odoo.ahanassa.com/api/v1/catalog/meta", method: "GET" }),
      // No Authorization header, empty JSON body: cannot create anything without the secret.
      await probe("POST /api/v1/rfq (unauthenticated, empty body)", { url: "https://odoo.ahanassa.com/api/v1/rfq", method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    ],
  });
}

export default {
  async fetch(request: Request, env: SpikeEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/rfqs") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { ...cors(env, request), "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "content-type", "Access-Control-Max-Age": "86400" } });
      }
      if (request.method === "POST") return handleRfq(request, env);
      return json(405, { ok: false });
    }
    const admin = Boolean(env.SPIKE_ADMIN_TOKEN) && request.headers.get("authorization") === `Bearer ${env.SPIKE_ADMIN_TOKEN}`;
    if (pathname === "/__spike/reconcile" && request.method === "POST" && admin) {
      return json(200, await spikeReconcile(getOpsDb(), 3));
    }
    if (pathname === "/__spike/odoo-reachability" && request.method === "GET" && admin && env.ENABLE_REACHABILITY_ROUTE === "1") {
      return reachability();
    }
    return json(404, { ok: false });
  },
};
