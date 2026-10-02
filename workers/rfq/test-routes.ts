/**
 * STAGING-ONLY admin test routes (imported only by index.staging.ts; never by
 * the production entry). Authenticated by the same bearer as every
 * /__admin/* route and additionally gated by TEST_HOOKS=1.
 *
 *   POST /__admin/test/deliver?rfq=<id>[&kill_after_post=1]   deliver now; optionally crash after the POST
 *   POST /__admin/test/deliver-real-401?rfq=<id>              CPU probe: real Odoo, NO Authorization -> 401
 *
 * Also the staging Turnstile TEST PATH (stagingTurnstileTestPath), used only
 * for CPU measurement windows when TURNSTILE_TEST_MODE=1 (W3 A4: the real
 * widget stopped issuing tokens to the automated measurement browser).
 */
import { deliverOne } from "../../lib/rfq-worker/delivery.ts";
import { deliveryConfigFromEnv } from "../../lib/rfq-worker/runners.ts";
import { flag, type RfqWorkerEnv } from "../../lib/rfq-worker/config.ts";

/** The only real Odoo host the 401 probe may call — unauthenticated, so nothing can be created there. */
const REAL_ODOO_BASE_URL = "https://odoo.ahanassa.com";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store" } });

export async function stagingTestRoutes(request: Request, env: RfqWorkerEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/__admin/test/") || !flag(env.TEST_HOOKS)) return null;
  if (request.method !== "POST") return json(405, { ok: false });
  const rfqId = url.searchParams.get("rfq") ?? "";
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(rfqId)) return json(400, { ok: false, error: "rfq id required" });
  if (url.pathname === "/__admin/test/deliver") {
    const kill = url.searchParams.get("kill_after_post") === "1";
    try {
      const afterPost = kill
        ? () => {
            throw new Error("TEST_KILL_AFTER_POST");
          }
        : undefined;
      return json(200, await deliverOne(env.DB_OPS, rfqId, deliveryConfigFromEnv(env, { afterPost })));
    } catch (err) {
      return json(500, { ok: false, error: err instanceof Error ? err.message : "error" });
    }
  }
  if (url.pathname === "/__admin/test/deliver-real-401") {
    return json(200, await deliverOne(env.DB_OPS, rfqId, deliveryConfigFromEnv(env, { odooBaseUrl: REAL_ODOO_BASE_URL, token: null })));
  }
  return null;
}

/** Cloudflare's documented always-pass Turnstile test secret (public; not a credential). */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * STAGING ONLY, TURNSTILE_TEST_MODE=1: verify with the test secret against the
 * REAL Siteverify endpoint, and accept only a response Cloudflare flags as
 * `metadata.result_with_testing_key`, completing it with our expected
 * hostname and the rfq_submit action. Every other intake step is unchanged.
 */
export function stagingTurnstileTestPath(env: RfqWorkerEnv): { env: RfqWorkerEnv; fetchImpl?: typeof fetch } {
  if (!flag(env.TURNSTILE_TEST_MODE)) return { env };
  const hostname = (env.TURNSTILE_EXPECTED_HOSTNAMES ?? "").split(",")[0]?.trim() ?? "";
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    if (String(input) !== SITEVERIFY || !response.ok) return response;
    const body = (await response.json()) as { success?: boolean; metadata?: { result_with_testing_key?: boolean } } & Record<string, unknown>;
    if (body.success === true && body.metadata?.result_with_testing_key === true) return Response.json({ ...body, hostname, action: "rfq_submit" });
    return Response.json({ ...body, success: false });
  }) as typeof fetch;
  return { env: { ...env, TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET }, fetchImpl };
}
