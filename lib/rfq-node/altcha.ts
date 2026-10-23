import { createHmac, randomInt } from "node:crypto";
import { createChallenge, verifySolution, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { ALTCHA_CHALLENGE_PATH, type RfqCaptchaVerifier } from "../security/rfq-captcha.ts";
import type { TurnstileOutcome } from "../security/turnstile.ts";
import { corsHeaders } from "../rfq-worker/cors.ts";
import type { NodeD1 } from "./sqlite-d1.ts";

/**
 * W35 (owner decision 2026-10-23: no arCaptcha, no external captcha service on .ir): the domestic intake's own
 * captcha — ALTCHA proof of work (MIT; altcha-lib 2.6.0 here, the altcha 3.3.0 widget in the form). Nothing leaves
 * iransrv: the challenge is issued AND verified by this Node service, with an HMAC key from a systemd credential
 * (`altcha-hmac-key`, generated on the server by `install.sh rfq-dirs`).
 *
 *   GET /api/rfqs/captcha-challenge   a fresh signed challenge (no-store, exact-origin CORS like the rest of the API)
 *   POST /api/rfqs                    the widget's payload in `turnstileToken`; verified here (lib/security/rfq-captcha.ts)
 *
 * The challenge is ALTCHA v2 "deterministic": the server picks the counter and signs the derived key, so the browser
 * must try every counter up to it, and verifying costs ONE HMAC (no key derivation on the server, ~0.1 ms).
 * Difficulty (measured 2026-10-23): PBKDF2/SHA-256, 1000 iterations per try, counter 500–1000 → ~25 ms on one
 * Apple M core; a low-end phone (~20× slower per core, the widget runs up to 4 workers) ~0.6–1.2 s. The widget adds
 * no delay of its own beyond its 500 ms minimum.
 *
 * Fails closed: no key (or one under 32 characters) → no service → capabilities and submit answer 503. A payload is
 * accepted once: its challenge signature is recorded in `ir_captcha_used` until the challenge expires (≤ 10 min), so
 * the same solution again is `invalid` (403). Expired, tampered, foreign-key or malformed payloads are `invalid`; a
 * store error is `unavailable` (503). The visitor then ticks the box again (the form resets the widget).
 */
export const ALTCHA_ALGORITHM = "PBKDF2/SHA-256";
export const ALTCHA_COST = 1000;
export const ALTCHA_COUNTER = { min: 500, max: 1000 } as const;
/** Challenge lifetime (owner rule: ≤ 10 min). */
export const ALTCHA_TTL_S = 600;
export const ALTCHA_MIN_KEY_LENGTH = 32;
const MAX_TOKEN_LENGTH = 2048;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const HEX64 = /^[0-9a-f]{64}$/;

export interface AltchaService extends RfqCaptchaVerifier {
  challenge(): Promise<Challenge>;
}

export interface AltchaOptions {
  /** The `altcha-hmac-key` credential. */
  hmacKey: string | null;
  db: NodeD1;
  now?: () => Date;
  ttlSeconds?: number;
}

/** Two independent secrets from the one credential: the challenge signature and the derived-key signature. */
const subKey = (key: string, label: string) => createHmac("sha256", key).update(`ahanassa-altcha-${label}-v1`).digest("hex");

export function altchaService(options: AltchaOptions): AltchaService | null {
  const key = options.hmacKey?.trim() ?? "";
  if (key.length < ALTCHA_MIN_KEY_LENGTH) return null;
  const signatureSecret = subKey(key, "signature");
  const keySignatureSecret = subKey(key, "key-signature");
  const now = () => options.now?.() ?? new Date();
  const ttl = Math.min(options.ttlSeconds ?? ALTCHA_TTL_S, ALTCHA_TTL_S);
  const { db } = options;

  return {
    challenge: () =>
      createChallenge({
        algorithm: ALTCHA_ALGORITHM,
        cost: ALTCHA_COST,
        counter: randomInt(ALTCHA_COUNTER.min, ALTCHA_COUNTER.max + 1),
        deriveKey,
        expiresAt: Math.floor(now().getTime() / 1000) + ttl,
        hmacSignatureSecret: signatureSecret,
        hmacKeySignatureSecret: keySignatureSecret,
      }),

    async verify(token: unknown): Promise<TurnstileOutcome> {
      const payload = decodePayload(token);
      if (!payload) return { ok: false, reason: "invalid" };
      const { challenge, solution } = payload;
      const expiresAt = challenge.parameters.expiresAt;
      if (typeof expiresAt !== "number" || !challenge.parameters.keySignature) return { ok: false, reason: "invalid" };
      let verified: boolean;
      try {
        // Expiry, the challenge signature (our key) and the derived-key signature — altcha-lib's own checks.
        verified = (await verifySolution({ challenge, solution, deriveKey, hmacSignatureSecret: signatureSecret, hmacKeySignatureSecret: keySignatureSecret })).verified;
      } catch {
        return { ok: false, reason: "invalid" };
      }
      if (!verified) return { ok: false, reason: "invalid" };
      try {
        const nowS = Math.floor(now().getTime() / 1000);
        db.sqlite.prepare(`DELETE FROM ir_captcha_used WHERE expires_at < ?`).run(nowS);
        const r = db.sqlite.prepare(`INSERT INTO ir_captcha_used (signature, expires_at) VALUES (?, ?) ON CONFLICT(signature) DO NOTHING`).run(challenge.signature as string, expiresAt);
        // Already recorded = this solution was used before (a replay).
        return Number(r.changes) === 1 ? { ok: true } : { ok: false, reason: "invalid" };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
  };
}

interface Payload {
  challenge: Challenge;
  solution: { counter: number; derivedKey: string; time?: number };
}

/** The widget's payload: base64 of `{challenge: {parameters, signature}, solution: {counter, derivedKey, time}}`. */
function decodePayload(token: unknown): Payload | null {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH || !BASE64.test(token)) return null;
  try {
    const p = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as Partial<Payload>;
    const params = p.challenge?.parameters;
    if (!params || typeof params !== "object" || typeof p.challenge?.signature !== "string" || !HEX64.test(p.challenge.signature)) return null;
    if (!p.solution || typeof p.solution !== "object" || typeof p.solution.counter !== "number" || typeof p.solution.derivedKey !== "string") return null;
    return { challenge: { parameters: params, signature: p.challenge.signature }, solution: { counter: p.solution.counter, derivedKey: p.solution.derivedKey } };
  } catch {
    return null;
  }
}

/** GET /api/rfqs/captcha-challenge — handled by the domestic intake's HTTP front only (lib/rfq-node/server.ts). */
export async function handleAltchaChallenge(request: Request, allowedOrigins: readonly string[], service: AltchaService | null): Promise<Response> {
  const cors = corsHeaders(request.headers.get("origin"), allowedOrigins);
  const headers = { "content-type": "application/json", "Cache-Control": "no-store", ...cors };
  if (request.method !== "GET") return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { ...headers, Allow: "GET" } });
  if (!service) return new Response(JSON.stringify({ ok: false, code: "SERVICE_UNAVAILABLE" }), { status: 503, headers: { ...headers, "Retry-After": "30" } });
  return new Response(JSON.stringify(await service.challenge()), { status: 200, headers });
}

export { ALTCHA_CHALLENGE_PATH };
