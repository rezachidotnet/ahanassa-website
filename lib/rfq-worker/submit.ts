import { checkRfqSubmitRequest, RFQ_SUBMIT_MAX_BODY_BYTES } from "../contracts/rfq-submit-v1-check.ts";
import { validateRfqSubmission } from "../rfq/validation.ts";
import { hashIdempotencyKey, isValidIdempotencyKey } from "../rfq/idempotency.ts";
import { buildCatalogItemRecord, buildFreeformItemRecord } from "../rfq/catalog-preselection.ts";
import { RFQ_UOM_LABELS } from "../rfq/uom.ts";
import { isUomAllowedForCatalogGroup } from "../rfq/uom-policy.ts";
import type { RfqItemRecord, RfqSubmissionRecord } from "../rfq/types.ts";
import { persistRfq, type PersistRfqResult } from "../rfq/intake-store.ts";
import { verifyTurnstileToken } from "../security/turnstile.ts";
import { getClientIp, hashRateLimitKey } from "../security/rate-limit.ts";
import { ulid } from "../rfq/ulid.ts";
import { corsHeaders, isAllowedOrigin } from "./cors.ts";
import { resolveVariantsFromIndex } from "./variant-index.ts";
import { csv, type RfqWorkerEnv } from "./config.ts";
import type { OdooSyncEvent } from "../queue/types.ts";

/**
 * POST /api/rfqs — rfq_submit.v1 (docs/contracts/RFQ_SUBMIT_V1.md,
 * architecture V1.1 §6.1). Checks run in this order, cheapest first, and a
 * rejected request never reaches D1:
 *   1. method / content-type / size        -> 405 / 415 / 413
 *   2. CORS origin (exact allow-list)       -> 403
 *   3. body read + JSON                     -> 413 / 400
 *   4. idempotency key lite-validate        -> 422
 *   5. contract schema check (server-safe)  -> 422
 *   6. early idempotency lookup (key+fingerprint) before Turnstile
 *                                           -> 200 replay / 409 conflict
 *   7. Turnstile (only if key unknown)      -> 403 (503 if unavailable)
 *   8. rate limit (fail-closed)             -> 429 / 503 + Retry-After
 *   9. full server validator + normalization -> 422
 *   10. numeric quantities strictly valid   -> 422
 *   11. variants: ONE rfq_variant_index query for catalogSnapshotVersion
 *      (fallback: active version)            -> 422
 *   12. transactional write (if not a replay)
 *                                           -> 201 new
 * The response is sent only after the D1 commit; the optional Queue send
 * happens after it (ctx.waitUntil) and never changes the answer.
 * W3.2: idempotency lookup moved before Turnstile so replays skip token consumption.
 */

const MIN_COMPLETION_MS = 1500;

export interface SubmitDeps {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Called after a successful commit (Queue fast path); never awaited before responding. */
  afterCommit?: (event: OdooSyncEvent) => Promise<void>;
}

/** Result of early idempotency lookup (before Turnstile). */
interface EarlyIdempotencyCheckResult {
  /** True if idempotency key exists in DB. */
  exists: boolean;
  /** True if payload fingerprint matches the stored one (replay). */
  isReplay: boolean;
  /** The stored reference number (for replay or conflict response). */
  reference?: string;
}

type Body = Record<string, unknown>;

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "Cache-Control": "no-store", ...headers } });
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Contract issues -> fieldErrors (`items[0].unit`: [code]); `unrecognized_keys` is reported as `unknown_field`. */
export function contractFieldErrors(issues: { path: PropertyKey[]; code: string }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map((p) => (typeof p === "number" ? `[${p}]` : String(p))).join(".").replace(/\.\[/g, "[") || "_";
    (out[key] ??= []).push(issue.code === "unrecognized_keys" ? "unknown_field" : issue.code);
  }
  return out;
}

/** Early idempotency check before Turnstile (W3.2).
 * Returns whether a matching RFQ exists and if so, whether it's a replay or conflict.
 * Queries DB_OPS for one indexed lookup. */
async function checkIdempotencyEarly(
  db: D1Database,
  idempotencyKeyHash: string,
  payloadFingerprint: string,
): Promise<EarlyIdempotencyCheckResult> {
  try {
    const row = await db
      .prepare(`SELECT reference_number, payload_fingerprint FROM rfqs WHERE idempotency_key_hash = ? LIMIT 1`)
      .bind(idempotencyKeyHash)
      .first<{ reference_number: string; payload_fingerprint: string | null }>();
    if (!row) return { exists: false, isReplay: false };
    const isReplay = row.payload_fingerprint === payloadFingerprint;
    return { exists: true, isReplay, reference: row.reference_number };
  } catch {
    // If lookup fails, continue to Turnstile (fail open on infrastructure error).
    return { exists: false, isReplay: false };
  }
}

export async function handleRfqSubmit(request: Request, env: RfqWorkerEnv, deps: SubmitDeps = {}): Promise<Response> {
  const allowed = csv(env.ALLOWED_ORIGINS);
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin, allowed);
  const correlationId = ulid();

  // 1. method / content-type / size
  if (request.method !== "POST") return json(405, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["method_not_allowed"] } }, { ...cors, Allow: "POST, OPTIONS" });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(415, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["unsupported_content_type"] } }, cors);
  }
  if (Number(request.headers.get("content-length") ?? "0") > RFQ_SUBMIT_MAX_BODY_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, cors);

  // 2. CORS origin — exact match, no wildcard; a request without an allowed Origin is refused.
  if (!isAllowedOrigin(origin, allowed)) return json(403, { ok: false, code: "VERIFICATION_FAILED" }, { Vary: "Origin" });

  // 3. body
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["unreadable_body"] } }, cors);
  }
  if (new TextEncoder().encode(raw).length > RFQ_SUBMIT_MAX_BODY_BYTES) return json(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, cors);
  let body: Body;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Body;
  } catch {
    return json(400, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["invalid_json"] } }, cors);
  }

  // 4. idempotency key lite-validate (just the field, not full contract yet).
  if (!isValidIdempotencyKey(body.idempotencyKey)) {
    return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { idempotencyKey: ["invalid"] } }, cors);
  }

  // 5. contract schema check (server-safe).
  const contract = checkRfqSubmitRequest(body);
  if (!contract.success) return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors: contractFieldErrors(contract.issues) }, cors);

  // 6. full validation early (to compute fingerprint before Turnstile).
  const validated = validateRfqSubmission(body);
  if (!validated.ok || !validated.value) return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors: validated.fieldErrors }, cors);
  const now = deps.now?.() ?? new Date();
  if (typeof body.formRenderedAt === "number" && now.getTime() - body.formRenderedAt < MIN_COMPLETION_MS) {
    return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["rejected"] } }, cors);
  }

  // Compute fingerprint and do early idempotency check (before Turnstile).
  const { idempotencyKey, ...normalized } = validated.value;
  const snapshotVersion = (contract.data.catalogSnapshotVersion as string | null | undefined) ?? null;
  const payloadFingerprint = await sha256Hex(stableStringify({ ...normalized, catalogSnapshotVersion: snapshotVersion }));
  const idempotencyKeyHash = await hashIdempotencyKey(idempotencyKey);
  const idempotencyCheck = await checkIdempotencyEarly(env.DB_OPS, idempotencyKeyHash, payloadFingerprint);

  // 6a. idempotency early lookup result — before Turnstile.
  if (idempotencyCheck.exists && idempotencyCheck.isReplay) {
    // Replay: return stored response immediately, no Turnstile, no rate limit.
    return json(200, { ok: true, reference: idempotencyCheck.reference, status: "received" }, cors);
  }
  if (idempotencyCheck.exists && !idempotencyCheck.isReplay) {
    // Conflict: same key, different payload.
    return json(409, { ok: false, code: "IDEMPOTENCY_CONFLICT" }, cors);
  }

  // 7. numeric quantities: an uninterpretable quantity is rejected, never accepted for manual review (§6.1).
  const quantityErrors: Record<string, string[]> = {};
  validated.value.items.forEach((item, i) => {
    if (item.quantityValue === null || !Number.isFinite(item.quantityValue) || item.quantityValue <= 0) quantityErrors[`items[${i}].quantityText`] = ["invalid_number"];
  });
  if (Object.keys(quantityErrors).length) return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors: quantityErrors }, cors);

  // 8. Turnstile: Siteverify must report our static host and action rfq_submit.
  const clientIp = getClientIp(request);
  const turnstile = await verifyTurnstileToken(body.turnstileToken, {
    secret: env.TURNSTILE_SECRET_KEY ?? "",
    expectedHostnames: csv(env.TURNSTILE_EXPECTED_HOSTNAMES),
    requireAction: true,
    remoteIp: clientIp === "unknown" ? undefined : clientIp,
    fetchImpl: deps.fetchImpl,
  });
  if (!turnstile.ok) {
    if (turnstile.reason === "unavailable") return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
    return json(403, { ok: false, code: "VERIFICATION_FAILED" }, cors);
  }

  // 9. rate limit — fail CLOSED: no binding, or the binding errors -> 503 (retry with the same key).
  if (!env.RFQ_RATE_LIMITER) return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  try {
    const outcome = await env.RFQ_RATE_LIMITER.limit({ key: await hashRateLimitKey(clientIp) });
    if (!outcome.success) return json(429, { ok: false, code: "RATE_LIMITED" }, { ...cors, "Retry-After": "60" });
  } catch {
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "30" });
  }

  // 11. variants — ONE query against rfq_variant_index.
  const locale = validated.value.locale;
  const variantIds = validated.value.items.map((i) => i.catalogVariantXid).filter((x): x is string => Boolean(x));
  const resolution = variantIds.length ? await resolveVariantsFromIndex(env.DB_PUBLIC, locale, variantIds, snapshotVersion) : null;

  // 12. build item records from variants.
  const records: RfqItemRecord[] = [];
  const unpublished = new Set<number>();
  const fieldErrors: Record<string, string[]> = {};
  validated.value.items.forEach((item, index) => {
    const unit = { code: item.unit, label: RFQ_UOM_LABELS[locale][item.unit] };
    if (item.catalogVariantXid) {
      const hit = resolution?.variants.get(item.catalogVariantXid);
      if (!hit) return void (fieldErrors[`items[${index}].catalogVariantXid`] ??= []).push("unavailable");
      if (!isUomAllowedForCatalogGroup(hit.selection.groupCode, item.unit)) return void (fieldErrors[`items[${index}].unit`] ??= []).push("unsupported_for_product");
      if (hit.unpublishedAtReceipt) unpublished.add(index);
      records.push(buildCatalogItemRecord(hit.selection, { quantityText: item.quantityText, quantityValue: item.quantityValue, quantityScale: item.quantityScale }, item.description, unit, item.lengthMm));
    } else {
      records.push(
        buildFreeformItemRecord(
          { productRef: item.productRef, productLabel: item.productLabel, categoryLabel: item.categoryLabel, freeformTitle: item.freeformTitle, sizeText: item.sizeText, quantityText: item.quantityText, quantityValue: item.quantityValue, quantityScale: item.quantityScale, description: item.description, lengthMm: item.lengthMm },
          unit,
        ),
      );
    }
  });
  if (Object.keys(fieldErrors).length) return json(422, { ok: false, code: "VALIDATION_ERROR", fieldErrors }, cors);

  // 13. transactional write (W3.2: replay/conflict already detected early, but persist for consistency).
  const record: RfqSubmissionRecord = { ...validated.value, items: records };
  let result: PersistRfqResult;
  try {
    result = await persistRfq(env.DB_OPS, record, idempotencyKeyHash, correlationId, { payloadFingerprint, catalogSnapshotVersion: snapshotVersion, unpublishedLineIndexes: unpublished }, () => now);
  } catch (err) {
    console.error(JSON.stringify({ operation: "rfq.submit", correlationId, result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
    return json(503, { ok: false, code: "SERVICE_UNAVAILABLE" }, { ...cors, "Retry-After": "10" });
  }
  if (result.conflict) return json(409, { ok: false, code: "IDEMPOTENCY_CONFLICT" }, cors);
  if (result.created && result.event && deps.afterCommit) void deps.afterCommit(result.event);
  return json(result.created ? 201 : 200, { ok: true, reference: result.reference, status: "received" }, cors);
}
