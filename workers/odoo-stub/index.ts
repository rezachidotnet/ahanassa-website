/**
 * Odoo RFQ intake STUB for staging (architecture V1.1 §6.7: staging never
 * delivers to production Odoo). Implements docs/contracts/RFQ_INTAKE_V1_1.md
 * (mirror of Odoo RFQ_API_CONTRACT_V1_1.md @ 487a07e, sha256 25c46b26…) with the same schema
 * and fingerprint code the website uses:
 *   401 without the bearer · 415 non-JSON · 400 invalid_idempotency_key /
 *   invalid_payload / invalid_received_at (> 5 min future, < 2026-01-01, no
 *   maximum age) · 201 first · 200 replay (same fingerprint) · 409
 *   idempotency_conflict (different fingerprint).
 * Control (bearer CONTROL_TOKEN): POST /__control {mode: normal|500|503|429|timeout, remaining}
 * forces the next `remaining` intake calls; GET /__stats returns what was stored.
 * State lives in a tiny D1 (STUB_DB) so behaviour is deterministic across isolates.
 * It stores only test payload metadata (key, fingerprint, reference, received_at), never bodies.
 */
import { canonicalReceivedAt, IDEMPOTENCY_KEY_PATTERN, intakeFingerprint, RECEIVED_AT_FLOOR, RECEIVED_AT_MAX_FUTURE_MS, rfqIntakeRequest } from "../../lib/contracts/rfq-intake-v1-1.ts";

interface StubEnv {
  STUB_DB: D1Database;
  STUB_BEARER?: string;
  CONTROL_TOKEN?: string;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const error = (status: number, code: string, message: string, headers: Record<string, string> = {}) => json(status, { error: { code, message } }, headers);

async function forcedMode(env: StubEnv): Promise<string> {
  const row = await env.STUB_DB.prepare(`SELECT mode, remaining FROM stub_control WHERE id = 1`).first<{ mode: string; remaining: number }>();
  if (!row || row.mode === "normal" || row.remaining <= 0) return "normal";
  await env.STUB_DB.prepare(`UPDATE stub_control SET remaining = remaining - 1, updated_at = ? WHERE id = 1`).bind(new Date().toISOString()).run();
  return row.mode;
}

async function log(env: StubEnv, key: string | null, status: number, hasV11: boolean) {
  await env.STUB_DB.prepare(`INSERT INTO stub_requests (at, key, status, has_v11) VALUES (?, ?, ?, ?)`).bind(new Date().toISOString(), key, status, hasV11 ? 1 : 0).run();
}

async function intake(request: Request, env: StubEnv): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.STUB_BEARER || auth !== `Bearer ${env.STUB_BEARER}`) return error(401, "unauthorized", "missing or invalid bearer");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return error(415, "unsupported_media_type", "application/json required");
  const key = request.headers.get("idempotency-key") ?? "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) return error(400, "invalid_idempotency_key", "Idempotency-Key missing or invalid");

  const mode = await forcedMode(env);
  if (mode === "timeout") {
    await new Promise((r) => setTimeout(r, 15_000));
    return error(504, "timeout", "forced timeout");
  }
  if (mode === "500") return error(500, "internal_error", "forced");
  if (mode === "503") return error(503, "concurrency_retry", "forced", { "Retry-After": "1" });
  if (mode === "429") return error(429, "rate_limited", "forced", { "Retry-After": "1" });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return error(400, "invalid_payload", "invalid JSON");
  }
  const parsed = rfqIntakeRequest.safeParse(raw);
  if (!parsed.success) return error(400, "invalid_payload", "payload does not match contract v1.1");
  const payload = parsed.data;
  const hasV11 = Boolean(payload.received_at || payload.website_reference);
  if (payload.received_at) {
    const at = Date.parse(canonicalReceivedAt(payload.received_at));
    if (at > Date.now() + RECEIVED_AT_MAX_FUTURE_MS || at < Date.parse(RECEIVED_AT_FLOOR)) {
      await log(env, key, 400, hasV11);
      return error(400, "invalid_received_at", "received_at outside the accepted window");
    }
  }
  const fingerprint = await intakeFingerprint(payload);
  const lookup = () => env.STUB_DB.prepare(`SELECT fingerprint, reference FROM stub_rfqs WHERE idempotency_key = ?`).bind(key).first<{ fingerprint: string; reference: string }>();
  const replayOrConflict = async (existing: { fingerprint: string; reference: string }) => {
    const status = existing.fingerprint === fingerprint ? 200 : 409;
    await log(env, key, status, hasV11);
    if (status === 409) return error(409, "idempotency_conflict", "same key, different payload");
    return json(200, { data: { reference: existing.reference, status: "received", received_at: new Date().toISOString() }, meta: { idempotent_replay: true } });
  };
  const existing = await lookup();
  if (existing) return replayOrConflict(existing);
  const reference = `STUB-RFQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const insert = await env.STUB_DB.prepare(`INSERT OR IGNORE INTO stub_rfqs (idempotency_key, fingerprint, reference, received_at, website_reference, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(key, fingerprint, reference, payload.received_at ? canonicalReceivedAt(payload.received_at) : null, payload.website_reference ?? null, now)
    .run();
  if ((insert.meta?.changes ?? 0) === 0) {
    // Lost a same-key race: answer as replay/conflict, never 500.
    const winner = await lookup();
    if (winner) return replayOrConflict(winner);
  }
  await log(env, key, 201, hasV11);
  return json(201, { data: { reference, status: "received", received_at: now, ...(payload.received_at ? { website_received_at: canonicalReceivedAt(payload.received_at) } : {}), ...(payload.website_reference ? { website_reference: payload.website_reference } : {}) }, meta: { idempotent_replay: false } });
}

export default {
  async fetch(request: Request, env: StubEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/v1/rfq" && request.method === "POST") return intake(request, env);
    const control = Boolean(env.CONTROL_TOKEN) && request.headers.get("authorization") === `Bearer ${env.CONTROL_TOKEN}`;
    if (url.pathname === "/__control" && request.method === "POST" && control) {
      const body = (await request.json()) as { mode?: string; remaining?: number };
      const mode = ["normal", "500", "503", "429", "timeout"].includes(body.mode ?? "") ? body.mode! : "normal";
      await env.STUB_DB.prepare(`INSERT INTO stub_control (id, mode, remaining, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, remaining = excluded.remaining, updated_at = excluded.updated_at`)
        .bind(mode, Math.max(0, Math.min(100, Number(body.remaining ?? 1))), new Date().toISOString())
        .run();
      return json(200, { ok: true, mode });
    }
    if (url.pathname === "/__stats" && request.method === "GET" && control) {
      const rfqs = await env.STUB_DB.prepare(`SELECT idempotency_key, reference, received_at, website_reference, created_at FROM stub_rfqs ORDER BY created_at`).all();
      const requests = await env.STUB_DB.prepare(`SELECT key, status, has_v11, at FROM stub_requests ORDER BY id`).all();
      return json(200, { rfqs: rfqs.results, requests: requests.results });
    }
    return error(404, "not_found", "not found");
  },
};
