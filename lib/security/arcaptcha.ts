/**
 * W32 (W29 P2 §3.4): server-side arCaptcha verification, used by the domestic RFQ intake on iransrv
 * (api(-staging|-new).ahanassa.ir). Never by the Cloudflare RFQ Worker, which stays on Turnstile.
 *
 * The endpoint and fields are arCaptcha's own, taken from its official SDK (PyPI `arcaptcha` 1.0.0,
 * `Arcaptcha.verify`): POST https://api.arcaptcha.ir/arcaptcha/api/verify with the JSON body
 * `{site_key, secret_key, challenge_id}` → `{success: boolean, "error-codes"?: string[]}`. P0 (2026-10-22)
 * reached it from iransrv over IPv4 (`{}` → `{"success":false,"error-codes":["missing-input-sitekey"]}`).
 * The browser widget (widget.arcaptcha.ir/1/api.js) gives the token to its callback; the form sends it in the
 * contract's existing `turnstileToken` field (the captcha token of whichever provider the API names).
 *
 * Fails closed exactly like lib/security/turnstile.ts: a bad token is `invalid` (403), an unreachable or
 * misconfigured verifier is `unavailable` (503). Only `success === true` passes — the SDK's own "has a success key"
 * check would accept `{"success": false}`.
 */
import type { TurnstileOutcome } from "./turnstile.ts";

export const ARCAPTCHA_VERIFY_URL = "https://api.arcaptcha.ir/arcaptcha/api/verify";
export { ARCAPTCHA_WIDGET_URL } from "./arcaptcha-widget.ts";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2048;

export interface VerifyArCaptchaOptions {
  siteKey: string;
  secret: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function verifyArCaptchaToken(token: unknown, options: VerifyArCaptchaOptions): Promise<TurnstileOutcome> {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "invalid" };
  if (!options.siteKey || !options.secret) return { ok: false, reason: "unavailable" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(ARCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site_key: options.siteKey, secret_key: options.secret, challenge_id: token }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const data = (await response.json()) as { success?: unknown; "error-codes"?: unknown };
    if (data.success === true) return { ok: true };
    // A key problem on OUR side is an outage, not the visitor's fault (fail closed with 503, alertable).
    const codes = Array.isArray(data["error-codes"]) ? data["error-codes"].map(String) : [];
    if (codes.some((c) => /sitekey|secret/i.test(c))) return { ok: false, reason: "unavailable" };
    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
