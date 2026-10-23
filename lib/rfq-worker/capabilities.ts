import { MAX_RFQ_FILE_BYTES, MAX_RFQ_FILES, RFQ_FILE_EXTENSIONS } from "../rfq/attachment-policy.ts";
import { ALTCHA_CHALLENGE_PATH, rfqCaptchaProvider } from "../security/rfq-captcha.ts";
import { corsHeaders } from "./cors.ts";
import { csv, extractEnabled, extractListsEnabled, filesEnabled, type RfqWorkerEnv } from "./config.ts";

/**
 * GET /api/rfqs/capabilities (W32, W29 P2 §3.4; W35) — what this RFQ API offers the form, in one answer:
 *
 *   {ok, captcha: {provider: "turnstile"} | {provider: "altcha", challengePath},
 *    files: {enabled, maxFiles?, maxFileBytes?, extensions?}, extract: {lists, pictures}}
 *
 * Served by the Cloudflare RFQ Worker (always Turnstile) AND by the domestic intake on iransrv (ALTCHA). The form
 * loads only the named provider's widget, so the captcha follows wherever Arvan sends api.ahanassa.ir — and an old
 * Worker without this route (404) means Turnstile (lib/rfq/capabilities-client.ts). The Turnstile site key is baked
 * into the page at build time and is not repeated here. ALTCHA has no key: the form fetches a fresh challenge from
 * `challengePath` on this same API host (lib/rfq-node/altcha.ts).
 *
 * A misconfigured provider (unknown, or ALTCHA without its verifier) answers 503: the form then treats the API as
 * unreachable rather than guessing a widget. Short browser cache (60 s): after an origin switch the form follows
 * within a minute.
 */
export const CAPABILITIES_PATH = "/api/rfqs/capabilities";

export function rfqCapabilities(request: Request, env: RfqWorkerEnv): Response {
  const cors = corsHeaders(request.headers.get("origin"), csv(env.ALLOWED_ORIGINS));
  if (request.method !== "GET") return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { "content-type": "application/json", "Cache-Control": "no-store", Allow: "GET", ...cors } });
  const provider = rfqCaptchaProvider(env);
  if (!provider || (provider === "altcha" && !env.ALTCHA)) {
    return new Response(JSON.stringify({ ok: false, code: "SERVICE_UNAVAILABLE" }), { status: 503, headers: { "content-type": "application/json", "Cache-Control": "no-store", "Retry-After": "30", ...cors } });
  }
  const enabled = filesEnabled(env);
  const body = {
    ok: true,
    captcha: provider === "altcha" ? { provider, challengePath: ALTCHA_CHALLENGE_PATH } : { provider },
    files: enabled ? { enabled, maxFiles: MAX_RFQ_FILES, maxFileBytes: MAX_RFQ_FILE_BYTES, extensions: RFQ_FILE_EXTENSIONS } : { enabled },
    extract: { lists: extractListsEnabled(env), pictures: extractEnabled(env) },
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "Cache-Control": "public, max-age=60", ...cors } });
}
