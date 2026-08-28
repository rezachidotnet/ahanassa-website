/**
 * Idempotency key hashing. The client-supplied idempotency key is never
 * stored raw (01-sources/DATABASE_SCHEMA.md §6.1: "raw key is not stored") —
 * only its SHA-256 hash, which is looked up via the `uq_rfqs_idempotency_key_hash`
 * unique index before insert.
 */
export async function hashIdempotencyKey(rawKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Client-supplied idempotency keys must be a plausible opaque token, not attacker-controlled structure. */
export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}
