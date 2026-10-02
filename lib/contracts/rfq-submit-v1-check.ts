import { MAX_ITEMS } from "../rfq/item-row-validation.ts";
import { MAX_BODY_BYTES, MAX_LENGTH_MM } from "../rfq/validation.ts";
import { RFQ_UOM_CODES } from "../rfq/uom.ts";
import { SNAPSHOT_VERSION_PATTERN } from "./snapshot-version.ts";

/**
 * rfq_submit.v1 strict check WITHOUT zod — the RFQ Worker's copy of
 * `rfqSubmitRequest` (lib/contracts/rfq-submit-v1.ts), W3 intake-CPU work
 * (architecture V1.1 §4.3): zod's core and locale tables were two thirds of
 * the Worker bundle and most of its first-request CPU.
 *
 * It reports the same issues as zod v4 for this schema — same paths, codes
 * and order (type mismatch aborts a field; every string check runs; a
 * non-integer aborts an int field; array length is checked after the
 * elements; unknown keys come last, in input order).
 * lib/contracts/rfq-submit-v1-check.test.ts proves it against the zod schema
 * on the contract vectors and a generated set of invalid inputs. Limits live
 * here and the zod schema is built from them, so the two cannot drift.
 */

export const RFQ_SUBMIT_MAX_BODY_BYTES = MAX_BODY_BYTES;

export const RFQ_SUBMIT_LIMITS = {
  idempotencyKey: { min: 16, max: 128, pattern: /^[A-Za-z0-9_-]+$/ },
  locales: ["fa", "en", "ar"] as const,
  fullName: { min: 2, max: 100 },
  companyName: { max: 160 },
  email: { max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phoneCountry: { length: 2 },
  phoneLocal: { min: 1, max: 20 },
  deliveryLocation: { max: 200 },
  message: { max: 3000 },
  items: { min: 1, max: MAX_ITEMS },
  website: { max: 0 },
  turnstileToken: { min: 1, max: 2048 },
  catalogSnapshotVersion: { pattern: SNAPSHOT_VERSION_PATTERN },
  item: {
    catalogVariantXid: { max: 200, pattern: /^[A-Za-z0-9_.-]+$/ },
    productSlug: { max: 200 },
    freeformTitle: { max: 160 },
    categoryLabel: { max: 100 },
    gradeOrStandard: { max: 100 },
    quantityText: { min: 1, max: 100 },
    units: RFQ_UOM_CODES,
    description: { max: 1000 },
    lengthMm: { max: MAX_LENGTH_MM },
  },
} as const;

export interface ContractIssue {
  path: (string | number)[];
  code: string;
}

export type RfqSubmitCheck = { success: true; data: Record<string, unknown> } | { success: false; issues: ContractIssue[] };

type Path = (string | number)[];
interface StrRule {
  min?: number;
  max?: number;
  length?: number;
  pattern?: RegExp;
}

/**
 * zod v4 length checks carry a `when` (input not nullish and has `.length`),
 * so they still run after a type mismatch (e.g. an array given for a string);
 * format checks do not. Comparisons are zod's own (`>=`, `<=`, `===`).
 */
function lengthChecks(v: unknown, rule: { min?: number; max?: number; length?: number }, path: Path, out: ContractIssue[]): void {
  if (v === null || v === undefined) return;
  const len = (v as { length?: unknown }).length as number;
  if (len === undefined) return;
  if (rule.min !== undefined && !(len >= rule.min)) out.push({ path, code: "too_small" });
  if (rule.max !== undefined && !(len <= rule.max)) out.push({ path, code: "too_big" });
  if (rule.length !== undefined && len !== rule.length) out.push({ path, code: len > rule.length ? "too_big" : "too_small" });
}

function str(v: unknown, rule: StrRule, path: Path, out: ContractIssue[]): void {
  const typeOk = typeof v === "string";
  if (!typeOk) out.push({ path, code: "invalid_type" });
  lengthChecks(v, rule, path, out);
  if (typeOk && rule.pattern && !rule.pattern.test(v)) out.push({ path, code: "invalid_format" });
}

/** z.number().int() [+ .positive()] [+ .max(n)] */
function int(v: unknown, rule: { positive?: boolean; max?: number }, path: Path, out: ContractIssue[]): void {
  if (typeof v !== "number" || !Number.isFinite(v)) return void out.push({ path, code: "invalid_type" });
  if (!Number.isInteger(v)) return void out.push({ path, code: "invalid_type" });
  if (v > Number.MAX_SAFE_INTEGER) out.push({ path, code: "too_big" });
  else if (v < Number.MIN_SAFE_INTEGER) out.push({ path, code: "too_small" });
  if (rule.positive && v <= 0) out.push({ path, code: "too_small" });
  if (rule.max !== undefined && v > rule.max) out.push({ path, code: "too_big" });
}

function oneOf(v: unknown, values: readonly string[], path: Path, out: ContractIssue[]): void {
  if (typeof v !== "string" || !values.includes(v)) out.push({ path, code: "invalid_value" });
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function unknownKeys(obj: Record<string, unknown>, known: readonly string[], path: Path, out: ContractIssue[]): void {
  if (Object.keys(obj).some((k) => !known.includes(k))) out.push({ path, code: "unrecognized_keys" });
}

const ITEM_KEYS = ["catalogVariantXid", "productSlug", "freeformTitle", "categoryLabel", "gradeOrStandard", "quantityText", "unit", "description", "lengthMm"] as const;
const REQUEST_KEYS = ["idempotencyKey", "locale", "fullName", "companyName", "email", "phoneCountry", "phoneLocal", "deliveryLocation", "message", "items", "website", "formRenderedAt", "turnstileToken", "catalogSnapshotVersion"] as const;

function checkItem(item: unknown, path: Path, out: ContractIssue[]): void {
  if (!isPlainObject(item)) return void out.push({ path, code: "invalid_type" });
  const L = RFQ_SUBMIT_LIMITS.item;
  const opt = (key: string, rule: StrRule) => item[key] !== undefined && str(item[key], rule, [...path, key], out);
  opt("catalogVariantXid", L.catalogVariantXid);
  opt("productSlug", L.productSlug);
  opt("freeformTitle", L.freeformTitle);
  opt("categoryLabel", L.categoryLabel);
  opt("gradeOrStandard", L.gradeOrStandard);
  str(item.quantityText, L.quantityText, [...path, "quantityText"], out);
  oneOf(item.unit, L.units, [...path, "unit"], out);
  opt("description", L.description);
  if (item.lengthMm !== undefined && item.lengthMm !== null) int(item.lengthMm, { positive: true, max: L.lengthMm.max }, [...path, "lengthMm"], out);
  unknownKeys(item, ITEM_KEYS, path, out);
}

/** Same verdict and issues as `rfqSubmitRequest.safeParse(body)`; `data` is the input (the schema is strict and transforms nothing). */
export function checkRfqSubmitRequest(body: unknown): RfqSubmitCheck {
  const out: ContractIssue[] = [];
  if (!isPlainObject(body)) return { success: false, issues: [{ path: [], code: "invalid_type" }] };
  const L = RFQ_SUBMIT_LIMITS;
  const opt = (key: string, rule: StrRule) => body[key] !== undefined && str(body[key], rule, [key], out);
  str(body.idempotencyKey, L.idempotencyKey, ["idempotencyKey"], out);
  oneOf(body.locale, L.locales, ["locale"], out);
  str(body.fullName, L.fullName, ["fullName"], out);
  opt("companyName", L.companyName);
  str(body.email, L.email, ["email"], out);
  str(body.phoneCountry, L.phoneCountry, ["phoneCountry"], out);
  str(body.phoneLocal, L.phoneLocal, ["phoneLocal"], out);
  opt("deliveryLocation", L.deliveryLocation);
  opt("message", L.message);
  const items = body.items;
  if (!Array.isArray(items)) out.push({ path: ["items"], code: "invalid_type" });
  else items.forEach((item, i) => checkItem(item, ["items", i], out));
  lengthChecks(items, L.items, ["items"], out);
  opt("website", L.website);
  if (body.formRenderedAt !== undefined) int(body.formRenderedAt, {}, ["formRenderedAt"], out);
  str(body.turnstileToken, L.turnstileToken, ["turnstileToken"], out);
  if (body.catalogSnapshotVersion !== undefined && body.catalogSnapshotVersion !== null) str(body.catalogSnapshotVersion, L.catalogSnapshotVersion, ["catalogSnapshotVersion"], out);
  unknownKeys(body, REQUEST_KEYS, [], out);
  return out.length ? { success: false, issues: out } : { success: true, data: body };
}
