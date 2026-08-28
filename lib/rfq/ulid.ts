/**
 * Minimal ULID generator (Crockford Base32, 26 characters: 48-bit UTC
 * millisecond timestamp + 80 bits of crypto-random entropy).
 *
 * Hand-rolled rather than a dependency — this repo stays dependency-minimal
 * (see package.json), and the ULID spec is small enough to implement
 * correctly without a library. Internal IDs use ULIDs per
 * 01-sources/DATABASE_SCHEMA.md §3.1/§3.3 (sortable, non-sequential to
 * visitors, safe to generate at the edge — no coordination required).
 */

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(time: number, length: number): string {
  let out = "";
  let t = time;
  for (let i = length - 1; i >= 0; i--) {
    out = CROCKFORD_ALPHABET[t % 32] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CROCKFORD_ALPHABET[bytes[i] % 32];
  }
  return out;
}

/** Generates a new 26-character ULID using the current time. */
export function ulid(time: number = Date.now()): string {
  return encodeTime(time, 10) + encodeRandom(16);
}
