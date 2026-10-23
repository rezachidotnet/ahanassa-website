/**
 * W32 (W29 P2 §3.4): which captcha guards POST /api/rfqs on this deployment, and how its token is checked.
 *
 *   turnstile (default)  the Cloudflare RFQ Worker (api(-staging).ahanassa.com) — unchanged behaviour
 *   arcaptcha            the domestic RFQ intake on iransrv (lib/rfq-node) — MCI cannot reach Cloudflare
 *
 * The provider is a property of the API, not of the page: GET /api/rfqs/capabilities tells the form which widget to
 * load (lib/rfq-worker/capabilities.ts). If Arvan's origin for api.ahanassa.ir is ever set back to the Worker, the
 * form switches back to Turnstile by itself. An unknown CAPTCHA_PROVIDER value is a misconfiguration: 503, never "no
 * captcha" (fail closed).
 */
import { verifyTurnstileToken, type TurnstileOutcome } from "./turnstile.ts";
import { verifyArCaptchaToken } from "./arcaptcha.ts";

export type RfqCaptchaProvider = "turnstile" | "arcaptcha";

export interface RfqCaptchaEnv {
  CAPTCHA_PROVIDER?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  ARCAPTCHA_SITE_KEY?: string;
  ARCAPTCHA_SECRET_KEY?: string;
}

/** The configured provider; null = an unknown value (misconfiguration). */
export function rfqCaptchaProvider(env: RfqCaptchaEnv): RfqCaptchaProvider | null {
  const value = (env.CAPTCHA_PROVIDER ?? "").trim();
  if (value === "" || value === "turnstile") return "turnstile";
  if (value === "arcaptcha") return "arcaptcha";
  return null;
}

const csv = (value: string | undefined) => (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function verifyRfqCaptcha(env: RfqCaptchaEnv, token: unknown, options: { remoteIp?: string; fetchImpl?: typeof fetch }): Promise<TurnstileOutcome> {
  const provider = rfqCaptchaProvider(env);
  if (provider === "arcaptcha") return verifyArCaptchaToken(token, { siteKey: env.ARCAPTCHA_SITE_KEY ?? "", secret: env.ARCAPTCHA_SECRET_KEY ?? "", fetchImpl: options.fetchImpl });
  if (provider === "turnstile") {
    return verifyTurnstileToken(token, {
      secret: env.TURNSTILE_SECRET_KEY ?? "",
      expectedHostnames: csv(env.TURNSTILE_EXPECTED_HOSTNAMES),
      requireAction: true,
      remoteIp: options.remoteIp,
      fetchImpl: options.fetchImpl,
    });
  }
  return { ok: false, reason: "unavailable" };
}
