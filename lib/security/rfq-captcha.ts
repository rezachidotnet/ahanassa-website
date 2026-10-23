/**
 * W32 (W29 P2 §3.4), W35: which captcha guards POST /api/rfqs on this deployment, and how its token is checked.
 *
 *   turnstile (default)  the Cloudflare RFQ Worker (api(-staging).ahanassa.com) — unchanged behaviour
 *   altcha               the domestic RFQ intake on iransrv (lib/rfq-node) — MCI cannot reach Cloudflare, and the
 *                        owner rule (2026-10-23) is no external captcha service on .ir: ALTCHA proof of work, the
 *                        challenge issued and verified by the domestic Node service itself (lib/rfq-node/altcha.ts)
 *
 * The provider is a property of the API, not of the page: GET /api/rfqs/capabilities tells the form which widget to
 * load (lib/rfq-worker/capabilities.ts). If Arvan's origin for api.ahanassa.ir is ever set back to the Worker, the
 * form switches back to Turnstile by itself. An unknown CAPTCHA_PROVIDER value, or `altcha` without its verifier
 * binding, is a misconfiguration: 503, never "no captcha" (fail closed).
 */
import { verifyTurnstileToken, type TurnstileOutcome } from "./turnstile.ts";

export type RfqCaptchaProvider = "turnstile" | "altcha";

/** W35: where the domestic intake hands out ALTCHA challenges (lib/rfq-node/altcha.ts; nginx proxies only this path). */
export const ALTCHA_CHALLENGE_PATH = "/api/rfqs/captcha-challenge";

/** W35: the ALTCHA verifier binding — set only by the domestic intake (lib/rfq-node/env.ts), never on the Worker. */
export interface RfqCaptchaVerifier {
  verify(token: unknown): Promise<TurnstileOutcome>;
}

export interface RfqCaptchaEnv {
  CAPTCHA_PROVIDER?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  ALTCHA?: RfqCaptchaVerifier;
}

/** The configured provider; null = an unknown value (misconfiguration). */
export function rfqCaptchaProvider(env: RfqCaptchaEnv): RfqCaptchaProvider | null {
  const value = (env.CAPTCHA_PROVIDER ?? "").trim();
  if (value === "" || value === "turnstile") return "turnstile";
  if (value === "altcha") return "altcha";
  return null;
}

const csv = (value: string | undefined) => (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function verifyRfqCaptcha(env: RfqCaptchaEnv, token: unknown, options: { remoteIp?: string; fetchImpl?: typeof fetch }): Promise<TurnstileOutcome> {
  const provider = rfqCaptchaProvider(env);
  if (provider === "altcha") return env.ALTCHA ? env.ALTCHA.verify(token) : { ok: false, reason: "unavailable" };
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
