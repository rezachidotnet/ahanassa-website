import { getTurnstileSecret } from "../env.ts";
import { TURNSTILE_RFQ_ACTION } from "./turnstile-action.ts";

/**
 * Server-side Cloudflare Turnstile verification (POST Siteverify —
 * https://challenges.cloudflare.com/turnstile/v0/siteverify).
 *
 * Presence of a client-supplied token proves nothing by itself; this is the
 * only check that counts. Outcomes are deliberately split into two reasons
 * so the caller can distinguish a visitor-side failure (bad/expired/missing
 * token, action mismatch) from an operational failure (Siteverify
 * unreachable/timed out/misconfigured) — both fail closed (no RFQ may be
 * persisted either way), but only the second is a "temporary service"
 * condition worth a different status code/message (CLAUDE.md "Fail Closed").
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "unavailable" };

interface SiteverifyResponse {
  success?: boolean;
  action?: string;
  ["error-codes"]?: string[];
}

export interface VerifyTurnstileOptions {
  /** Cloudflare-provided client IP (CF-Connecting-IP) — best-effort signal, optional per the Siteverify contract. */
  remoteIp?: string;
  timeoutMs?: number;
  /** Injectable for tests — defaults to the real global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests — defaults to getTurnstileSecret(). */
  secret?: string;
}

export async function verifyTurnstileToken(token: unknown, options: VerifyTurnstileOptions = {}): Promise<TurnstileOutcome> {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "invalid" };
  }

  const secret = options.secret ?? getTurnstileSecret();
  if (!secret) {
    // Fail closed: verification cannot be performed at all in this
    // environment (no Turnstile secret provisioned yet — see
    // PROJECT_OVERRIDES.md §10 / README.md "RFQ abuse protection").
    return { ok: false, reason: "unavailable" };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (options.remoteIp) body.set("remoteip", options.remoteIp);

    const response = await fetchFn(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "unavailable" };
    }

    const data = (await response.json()) as SiteverifyResponse;
    if (data.success !== true) {
      return { ok: false, reason: "invalid" };
    }
    if (data.action !== undefined && data.action !== TURNSTILE_RFQ_ACTION) {
      return { ok: false, reason: "invalid" };
    }

    return { ok: true };
  } catch {
    // Network failure, abort/timeout, or malformed (non-JSON) response —
    // all classified as "unavailable", never surfaced to the visitor as
    // internal detail (never the fetch error, never error-codes[]).
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
