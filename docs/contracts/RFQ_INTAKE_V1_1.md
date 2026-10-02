# rfq_intake v1.1 — website → Odoo (mirror)

**Authority:** Odoo. This document mirrors, and must never contradict, the Odoo contract:

| Field | Value |
|---|---|
| Source repository | `ahanassa-odoo` (local `/Users/reza/Developer/ahanassa-odoo`), branch `o1/security-rfq-intake` |
| Source document | `docs/contracts/RFQ_API_CONTRACT_V1_1.md` |
| Commit read | `bfd732d4890f130fe56d4f48413af7de397b803c` (2026-10-02 10:32 +03:30, "fix(rfq-api): no maximum age for received_at; delay visibility (O-1.1)") |
| SHA-256 of the document read | `25c46b26f0bfbab916327d8348f861a7e35466b9cea5e24ffb7255937bc91ce8` |
| Previously read (O-1) | commit `264347a447b055188d39a77da2d60aa16421b8c6`, SHA-256 `289e6c768381e01afca02761ffff301740e580602545dea6ee75b5c0cbeec87d` — stated a 30-day maximum age; superseded by O-1.1 |
| Odoo module | `ahanassa_marketplace` 19.0.46.1.0 — implemented, **not yet deployed** |

Code twin: `lib/contracts/rfq-intake-v1-1.ts` (schema, canonical JSON, fingerprint, classification).
Fingerprint test vectors are produced by Python's own `json.dumps`
(`scripts/contracts/rfq-intake-fingerprint-vectors.py` → `lib/contracts/fixtures/rfq-intake-fingerprint-vectors.json`)
and the TypeScript mirror must reproduce them byte for byte (`lib/contracts/contracts.test.ts`).

**Website status (W0):** the RFQ consumer still sends v1 payloads (no `received_at`, no
`website_reference`). Sending them is W2. Nothing in the running RFQ path imports this module yet.

## 1. Request

`POST {ODOO_BASE_URL}/api/v1/rfq`, server-to-server only (never a browser).

| Header | Rule |
|---|---|
| `Authorization: Bearer <secret>` | Required. Odoo accepts the `current` and `next` secret (rotation, Odoo §6). Website secret: `ODOO_RFQ_API_TOKEN` (RFQ Worker). |
| `Content-Type: application/json` | Required. |
| `Idempotency-Key` | `^[A-Za-z0-9._~-]{1,128}$`. The website sends `rfq-<rfq_id>` (stable for the life of the RFQ). |

Body: UTF-8 JSON object ≤ 512 KiB; unknown keys at any level → 400 `invalid_payload`.

| Key | Rule |
|---|---|
| `locale` | `fa` \| `en` \| `ar`; absent → `fa` |
| `customer` | `{name (1–200), company? (≤200), phone? (≤80), email? (≤254), country? (≤2), city? (≤120)}`; phone or email required |
| `items` | 1–200 lines: `{product_variant_xid? (≤256), sku? (≤128), description? (≤2000), quantity (finite, > 0, ≤ 1e12), uom (kg, ton, branch, sheet, meter; case-insensitive), length_mm? (> 0, ≤ 1e6, null = absent), notes? (≤10000)}`; a line without `product_variant_xid` needs a non-empty `description` |
| `notes` | ≤ 20000; absent/null → `""` |
| `consent`, `source` | objects, passed through |
| `received_at` (v1.1, optional) | ISO 8601 date-time **with** offset or `Z`, ≤ 64 chars. **No maximum age.** Not more than **5 minutes in the future** (Odoo clock). Not earlier than **2026-01-01T00:00:00Z**. Same rules for first submissions and replays. Stored as `website_received_at`. |
| `website_reference` (v1.1, optional) | `^AA-RFQ-[0-9A-HJKMNP-TV-Z]{8,57}$` — the reference the customer saw |

`null` for an optional key is the same as absent.

Website side of `received_at`: the RFQ's D1 commit time (`rfqs.received_at`, architecture §5.2), sent
unchanged on every retry — it is part of the fingerprint. Because there is no maximum age, an RFQ
delivered after a long outage is accepted; Odoo marks it `delivery_delayed` (`delivery_delay_seconds >
ahanassa.rfq_delivery_delay_threshold_seconds`, default 3600) instead of refusing it.

## 2. Fingerprint (idempotency)

`request_fingerprint = sha256_hex(utf8(json.dumps(N, ensure_ascii=False, sort_keys=True, separators=(",", ":"))))`,
where `N` is the normalized payload:

1. the request object as sent;
2. `locale` absent → `"fa"`; `notes` absent/null → `""`; `customer` as sent;
3. each item as sent, except `quantity` → float, `uom` → lower case, `length_mm` null → removed, otherwise float;
4. `received_at` absent/null → removed; otherwise the canonical UTC text `YYYY-MM-DDTHH:MM:SSZ`
   (`.ffffff` only when microseconds are non-zero) — `…T03:41:07+03:30` ≡ `…T00:11:07Z`;
5. `website_reference` absent/null → removed;
6. `consent`, `source` as sent.

Python floats serialize as `12.0`, `1e+16`, `1e-05` (`pythonFloatRepr`). A retry must resend the same
`received_at` instant and `website_reference`; changing either with the same key is 409.

## 3. Idempotency

| Situation | Odoo result |
|---|---|
| New key | 201, new RFQ |
| Same key, same fingerprint | 200, same reference, `meta.idempotent_replay = true`, nothing created (however old `received_at` is) |
| Same key, different fingerprint | 409 `idempotency_conflict` |
| Simultaneous first submissions, same key | one 201; the other 200 or 409 — never 500 |
| Contention persists | 503 `concurrency_retry`, `Retry-After: 1`, nothing stored |

## 4. Responses and website classification (architecture §6.2)

Success (201 / 200): `{"data": {"reference", "status", "received_at", "website_received_at"?, "website_reference"?, "verification_session"? (201 only)}, "meta": {"idempotent_replay"}}` — timestamps ISO 8601 UTC `Z`.

| HTTP | `error.code` | Website state |
|---|---|---|
| 201 / 200 | — | `DELIVERED` (persist `data.reference`) |
| 400 | `invalid_idempotency_key`, `invalid_payload`, `invalid_received_at` | `MANUAL_REVIEW` |
| 401 | `unauthorized` | `RETRY_PENDING` + immediate alert (configuration, not customer data) |
| 403 | — (not issued by Odoo today) | `RETRY_PENDING` + immediate alert |
| 409 | `idempotency_conflict` | `MANUAL_REVIEW` |
| 413 | `payload_too_large` | `MANUAL_REVIEW` |
| 415 | `unsupported_media_type` | `MANUAL_REVIEW` |
| 429 | — | `RETRY_PENDING` with backoff |
| 500 | `internal_error` | `RETRY_PENDING` with backoff |
| 503 | `concurrency_retry` | `RETRY_PENDING` with backoff |
| network error / timeout | — | `RETRY_PENDING` with backoff |

Backoff: `min(60, 2^n)` minutes with jitter (architecture §6.2). Error bodies
`{"error": {"code", "message", "line"?}}` — the website stores only `code`, never `message`.

## 5. Changelog

| Version | Change |
|---|---|
| v1 | `docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md` |
| v1.1 (mirror created W0, 2026-10-02) | `received_at`, `website_reference` (optional, part of the fingerprint); `data.received_at` (+ optional `website_received_at`, `website_reference`); 400 `invalid_received_at`; race-safe idempotency, 503 `concurrency_retry`; secret rotation. O-1.1: no maximum age, 2026-01-01 floor, 5-minute future limit, same rules for replays, `delivery_delay_seconds`/`delivery_delayed` on the Odoo RFQ. |
