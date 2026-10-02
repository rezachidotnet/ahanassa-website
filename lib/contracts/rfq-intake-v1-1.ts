import { z } from "zod";

/**
 * rfq_intake v1.1 — website (RFQ Worker / reconciler) -> Odoo `POST /api/v1/rfq`.
 *
 * Mirror of the Odoo-owned contract (docs/contracts/RFQ_INTAKE_V1_1.md records
 * the exact Odoo document path, commit and SHA-256 it mirrors). Odoo is the
 * authority; this module exists so website code can build, validate and
 * fingerprint a request exactly as Odoo will.
 *
 * NOTE (W0): the website does not send `received_at` / `website_reference`
 * yet — the delivery path is changed in W2. Nothing imports this module
 * from the running RFQ code in this task.
 */

export const RFQ_INTAKE_CONTRACT_VERSION = "v1.1" as const;
export const RFQ_INTAKE_UOMS = ["kg", "ton", "branch", "sheet", "meter"] as const;
export const RFQ_INTAKE_MAX_LINES = 200;
export const RFQ_INTAKE_MAX_BODY_BYTES = 512 * 1024;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;
export const WEBSITE_REFERENCE_PATTERN = /^AA-RFQ-[0-9A-HJKMNP-TV-Z]{8,57}$/;
/** received_at limits (Odoo O-1.1): no maximum age; at most 5 min in the future; floor 2026-01-01T00:00:00Z. */
export const RECEIVED_AT_MAX_FUTURE_MS = 5 * 60 * 1000;
export const RECEIVED_AT_FLOOR = "2026-01-01T00:00:00Z";

const text = (max: number) => z.string().max(max);
// Odoo `_text()` treats a `null` text field exactly like an absent one (controllers/rfq_api.py), so every
// optional text field below is `.nullable()`; the fingerprint still keeps a sent `null` "as sent".
const RECEIVED_AT_SHAPE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/i;

export const rfqIntakeItem = z
  .object({
    product_variant_xid: text(256).nullable().optional(),
    sku: text(128).nullable().optional(),
    description: text(2000).nullable().optional(),
    quantity: z.number().positive().max(1e12),
    uom: z.string().refine((u) => (RFQ_INTAKE_UOMS as readonly string[]).includes(u.toLowerCase()), "unsupported uom"),
    length_mm: z.number().positive().max(1e6).nullable().optional(),
    notes: text(10000).nullable().optional(),
  })
  .strict()
  .refine((i) => Boolean(i.product_variant_xid) || Boolean(i.description?.trim()), "free-text description is required without product_variant_xid");

export const rfqIntakeRequest = z
  .object({
    locale: z.enum(["fa", "en", "ar"]).optional(),
    customer: z
      .object({
        name: text(200).min(1),
        company: text(200).nullable().optional(),
        phone: text(80).nullable().optional(),
        email: text(254).nullable().optional(),
        country: text(2).nullable().optional(),
        city: text(120).nullable().optional(),
      })
      .strict()
      .refine((c) => Boolean(c.phone) || Boolean(c.email), "phone or email required"),
    items: z.array(rfqIntakeItem).min(1).max(RFQ_INTAKE_MAX_LINES),
    notes: text(20000).nullable().optional(),
    consent: z.record(z.string(), z.unknown()).optional(),
    source: z.record(z.string(), z.unknown()).optional(),
    received_at: z.string().max(64).regex(RECEIVED_AT_SHAPE).nullable().optional(),
    website_reference: z.string().max(64).regex(WEBSITE_REFERENCE_PATTERN).nullable().optional(),
  })
  .strict();
export type RfqIntakeRequest = z.infer<typeof rfqIntakeRequest>;

export const rfqIntakeSuccess = z.object({
  data: z.object({
    reference: z.string().min(1),
    status: z.string(),
    received_at: z.string(),
    website_received_at: z.string().optional(),
    website_reference: z.string().optional(),
    verification_session: z.string().optional(),
  }),
  meta: z.object({ idempotent_replay: z.boolean() }).optional(),
});

/** Odoo error code -> HTTP status -> website classification (architecture §6.2). */
export const RFQ_INTAKE_ERRORS = [
  { http: 400, code: "invalid_idempotency_key", classification: "MANUAL_REVIEW" },
  { http: 400, code: "invalid_payload", classification: "MANUAL_REVIEW" },
  { http: 400, code: "invalid_received_at", classification: "MANUAL_REVIEW" },
  { http: 401, code: "unauthorized", classification: "RETRY_PENDING_ALERT" },
  { http: 409, code: "idempotency_conflict", classification: "MANUAL_REVIEW" },
  { http: 413, code: "payload_too_large", classification: "MANUAL_REVIEW" },
  { http: 415, code: "unsupported_media_type", classification: "MANUAL_REVIEW" },
  { http: 500, code: "internal_error", classification: "RETRY_PENDING" },
  { http: 503, code: "concurrency_retry", classification: "RETRY_PENDING" },
] as const;

export type DeliveryClassification = "DELIVERED" | "RETRY_PENDING" | "RETRY_PENDING_ALERT" | "MANUAL_REVIEW";

/** Architecture §6.2: 201/200 delivered; 5xx/429/network/timeout retry; 401/403 retry + alert; 400/409/413/415 manual review. */
export function classifyIntakeStatus(status: number | "network_error" | "timeout"): DeliveryClassification {
  if (status === "network_error" || status === "timeout") return "RETRY_PENDING";
  if (status === 200 || status === 201) return "DELIVERED";
  if (status === 401 || status === 403) return "RETRY_PENDING_ALERT";
  if (status === 429 || status >= 500) return "RETRY_PENDING";
  return "MANUAL_REVIEW";
}

/** Canonical UTC text of a received_at value (Odoo `canonical_utc`): `YYYY-MM-DDTHH:MM:SSZ`, `.ffffff` only when microseconds are non-zero. */
export function canonicalReceivedAt(value: string): string {
  const m = RECEIVED_AT_SHAPE.exec(value);
  if (!m) throw new Error("received_at must be ISO 8601 with an offset or Z");
  const [, y, mo, d, h, mi, s, frac = "", tz] = m;
  const micros = Number(frac.padEnd(6, "0") || "0");
  let offsetMinutes = 0;
  if (tz.toUpperCase() !== "Z") {
    const sign = tz.startsWith("-") ? -1 : 1;
    offsetMinutes = sign * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(4, 6)));
  }
  const utcMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) - offsetMinutes * 60_000;
  const base = new Date(utcMs).toISOString().slice(0, 19);
  return micros ? `${base}.${String(micros).padStart(6, "0")}Z` : `${base}Z`;
}

/** Python `repr(float)` — what `json.dumps` writes for a float (12 -> "12.0", 1e16 -> "1e+16"). */
export function pythonFloatRepr(n: number): string {
  if (!Number.isFinite(n)) throw new Error("non-finite float");
  if (Object.is(n, -0)) return "-0.0";
  const exp = n === 0 ? 0 : Math.floor(Math.log10(Math.abs(n)));
  if (n !== 0 && (exp >= 16 || exp < -4)) {
    // Python: shortest round-trip digits in exponent form, mantissa keeps ".0"-free digits, exponent with sign and >= 2 digits.
    const [mant, e] = n.toExponential().split("e");
    const expNum = Number(e);
    return `${mant}e${expNum < 0 ? "-" : "+"}${String(Math.abs(expNum)).padStart(2, "0")}`;
  }
  const s = String(n);
  if (s.includes("e")) {
    // JS uses exponent form for < 1e-6, which Python would already have handled above; defensive.
    return n.toFixed(20).replace(/0+$/, "");
  }
  return s.includes(".") ? s : `${s}.0`;
}

/** Python `json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))`. `floatPaths` marks values Python holds as float. */
export function pythonCanonicalJson(value: unknown, isFloat: (path: string[]) => boolean = () => false, path: string[] = []): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return isFloat(path) ? pythonFloatRepr(value) : Number.isInteger(value) ? String(value) : pythonFloatRepr(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v, i) => pythonCanonicalJson(v, isFloat, [...path, String(i)])).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Python sorts by code point; JS default sort compares UTF-16 units — identical for BMP keys (all keys here are ASCII).
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${pythonCanonicalJson(obj[k], isFloat, [...path, k])}`).join(",")}}`;
  }
  throw new Error(`unsupported JSON value at ${path.join(".")}`);
}

/** Odoo's normalized payload N (contract §3): defaults, float quantity/length_mm, lower-case uom, canonical received_at, null-removal. */
export function normalizeIntakePayload(payload: RfqIntakeRequest): Record<string, unknown> {
  const n: Record<string, unknown> = { ...payload };
  n.locale = payload.locale ?? "fa";
  n.notes = payload.notes ?? "";
  n.customer = { ...payload.customer };
  n.items = payload.items.map((item) => {
    const out: Record<string, unknown> = { ...item, quantity: item.quantity, uom: item.uom.toLowerCase() };
    if ("length_mm" in item && (item.length_mm === null || item.length_mm === undefined)) delete out.length_mm;
    return out;
  });
  if (payload.received_at === null || payload.received_at === undefined) delete n.received_at;
  else n.received_at = canonicalReceivedAt(payload.received_at);
  if (payload.website_reference === null || payload.website_reference === undefined) delete n.website_reference;
  return n;
}

const FLOAT_PATH = (p: string[]) => p.length === 3 && p[0] === "items" && (p[2] === "quantity" || p[2] === "length_mm");

export function intakeCanonicalJson(payload: RfqIntakeRequest): string {
  return pythonCanonicalJson(normalizeIntakePayload(payload), FLOAT_PATH);
}

/** request_fingerprint = sha256_hex(utf8(canonical JSON of N)). */
export async function intakeFingerprint(payload: RfqIntakeRequest): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(intakeCanonicalJson(payload)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
