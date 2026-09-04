import { getOdooProcessingApiBaseUrl } from "../env.ts";

/**
 * Client for the Odoo Public Processing API — `GET /api/v1/processing/groups`
 * (P5, "Website — DB_PUBLIC Processing read model + background sync").
 *
 * UNVERIFIED CONTRACT — see `lib/env.ts#getOdooProcessingApiBaseUrl`'s file
 * comment: no `docs/integrations/odoo/processing-v1/` document exists in
 * this repository. This client implements the JSON shape given to the
 * website-side task, not a live-verified API the way
 * `lib/catalog/odoo-api-client.ts` was (that file's header documents two
 * real discrepancies found by live testing against the actual Catalog API —
 * no equivalent verification has happened here). Shape/type validation
 * below is deliberately strict specifically because the contract is
 * unverified: a real upstream drift is far more likely to surface here than
 * on the already-proven Catalog client, and this client must fail closed
 * (never guess) when it does.
 *
 * Mirrors `lib/catalog/odoo-api-client.ts`'s transport shape (timeout/abort,
 * conditional GET via If-None-Match, minimal hand-rolled structural
 * validation, `CatalogApiStatus`-style result union) rather than reinventing
 * a second transport pattern — the one genuinely new piece is ETag/304
 * handling actually being exercised (the Catalog sync path supports it at
 * this same transport layer but its `sync-runner.ts` never passes
 * `ifNoneMatch`; Processing's `sync-runner.ts` does, since P5 requires it).
 *
 * Deliberately does NOT use `lib/odoo/client.ts` (the generic JSON-2 RPC
 * transport) for the same reason the Catalog client doesn't — a dedicated,
 * narrow, documented-contract HTTP client only, never generic Odoo ORM
 * access from the website (CLAUDE.md catalog/pricing row, DAR-034).
 */

const DEFAULT_TIMEOUT_MS = 8_000;

export type ProcessingLocale = "fa" | "en" | "ar";

/** One Processing Group row as the upstream API returns it. `id` is the stable code identity (e.g. "SHEET_PROCESSING") — never an Odoo integer ID (task §3: "Do NOT use Odoo integer IDs. Do NOT invent another identity."). */
export interface ProcessingGroupApiItem {
  id: string;
  name: string;
  sequence: number;
  active: boolean;
  updated_at: string;
}

export interface ProcessingGroupsApiMeta {
  total: number;
}

export type ProcessingApiStatus = "ok" | "not_modified" | "not_configured" | "failed";

export interface ProcessingApiResult {
  status: ProcessingApiStatus;
  items?: ProcessingGroupApiItem[];
  meta?: ProcessingGroupsApiMeta;
  etag?: string;
  reasonCode?: string;
}

export interface ProcessingFetchOptions {
  locale: ProcessingLocale;
  ifNoneMatch?: string | null;
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Fetches the complete Processing Groups list for one locale. The contract
 * given to this task has no pagination parameters (unlike the Catalog
 * API's `page`/`page_size`) — a single request is the complete authoritative
 * set for that locale, matching the "three rows" scale this feeds
 * (task §14: "do not invent an unnecessarily complex ... pipeline for three
 * rows").
 */
export async function fetchProcessingGroups(options: ProcessingFetchOptions): Promise<ProcessingApiResult> {
  const baseUrl = getOdooProcessingApiBaseUrl();
  if (!baseUrl) {
    return { status: "not_configured", reasonCode: "PROCESSING_API_BASE_URL_NOT_SET" };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/processing/groups?locale=${encodeURIComponent(options.locale)}`;
    const headers: Record<string, string> = {};
    if (options.ifNoneMatch) headers["If-None-Match"] = options.ifNoneMatch;

    const response = await fetchFn(url, { method: "GET", headers, signal: controller.signal });

    if (response.status === 304) {
      // Never an error (task §12: "Do NOT treat 304 as an error") — the
      // caller (sync-runner.ts) treats this as a genuine success that
      // simply performs no DB_PUBLIC mutation.
      return { status: "not_modified", etag: options.ifNoneMatch ?? undefined };
    }
    if (!response.ok) {
      return { status: "failed", reasonCode: response.status >= 500 ? "PROCESSING_API_SERVER_ERROR" : "PROCESSING_API_REQUEST_REJECTED" };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { status: "failed", reasonCode: "PROCESSING_API_MALFORMED_JSON" };
    }

    const shape = validateEnvelopeShape(body);
    if (!shape.valid) {
      return { status: "failed", reasonCode: shape.reasonCode };
    }

    return {
      status: "ok",
      items: shape.items,
      meta: shape.meta,
      etag: response.headers.get("etag") ?? undefined,
    };
  } catch {
    // Covers network failure and the AbortController timeout firing —
    // neither is distinguishable after the fact via a plain try/catch, and
    // both must be treated identically: "failed", never silently empty.
    return { status: "failed", reasonCode: "PROCESSING_API_NETWORK_OR_TIMEOUT" };
  } finally {
    clearTimeout(timeout);
  }
}

// --- Minimal structural validation --------------------------------------
// Deliberately hand-rolled (matches lib/catalog/odoo-api-client.ts and
// lib/rfq/validation.ts's own precedent) rather than a schema-validation
// dependency, for a small, stable shape. This is the FIRST of two
// validation layers — this layer only proves the HTTP envelope/JSON shape
// is well-formed; `lib/processing/sync.ts#validateProcessingGroupsPayload`
// applies the stricter domain rules (duplicate identity, empty-string
// fields, non-finite sequence, etc.) the sync orchestrator needs before
// ever touching DB_PUBLIC.

interface EnvelopeShapeResult {
  valid: true;
  items: ProcessingGroupApiItem[];
  meta: ProcessingGroupsApiMeta;
}
interface EnvelopeShapeInvalid {
  valid: false;
  reasonCode: string;
}

function validateEnvelopeShape(body: unknown): EnvelopeShapeResult | EnvelopeShapeInvalid {
  if (typeof body !== "object" || body === null) {
    return { valid: false, reasonCode: "PROCESSING_API_UNEXPECTED_SHAPE" };
  }
  const envelope = body as Record<string, unknown>;
  if (!Array.isArray(envelope.data)) {
    return { valid: false, reasonCode: "PROCESSING_API_UNEXPECTED_SHAPE" };
  }
  const meta = envelope.meta;
  if (typeof meta !== "object" || meta === null || typeof (meta as Record<string, unknown>).total !== "number") {
    return { valid: false, reasonCode: "PROCESSING_API_UNEXPECTED_SHAPE" };
  }

  const items: ProcessingGroupApiItem[] = [];
  for (const raw of envelope.data) {
    if (!isStructurallyValidItem(raw)) {
      return { valid: false, reasonCode: "PROCESSING_API_MALFORMED_RECORD" };
    }
    items.push(raw);
  }

  return { valid: true, items, meta: meta as ProcessingGroupsApiMeta };
}

function isStructurallyValidItem(value: unknown): value is ProcessingGroupApiItem {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    p.id.trim().length > 0 &&
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    typeof p.sequence === "number" &&
    Number.isFinite(p.sequence) &&
    typeof p.active === "boolean" &&
    typeof p.updated_at === "string" &&
    p.updated_at.trim().length > 0
  );
}
