/**
 * Public RFQ reference generator — customer-facing, e.g. `AA-RFQ-K3QW9T2H`.
 *
 * Deliberately NOT derived from the internal ULID/primary key and NOT
 * sequential: 01-sources/DATABASE_SCHEMA.md §3.3 requires "Public IDs must
 * not reveal RFQ counts or business volume." (This also resolves a
 * documentation conflict — 01-sources/DATA_ARCHITECTURE(1).md §18 shows a
 * sequential-looking example `AA-RFQ-2026-000123`; DATABASE_SCHEMA.md is
 * treated as authoritative for the physical format since it is the
 * designated physical-schema document and states the anti-enumeration rule
 * explicitly — see DOCUMENT_AUDIT_REPORT.md.)
 *
 * Collision-safety is structural (8 chars from a 32-symbol alphabet ≈ 1.1
 * trillion combinations) but the repository layer still enforces and
 * retries on the DB UNIQUE constraint rather than trusting probability
 * alone.
 */

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REFERENCE_PREFIX = "AA-RFQ-";
const REFERENCE_RANDOM_LENGTH = 8;

export function generateRfqReference(): string {
  const bytes = new Uint8Array(REFERENCE_RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < REFERENCE_RANDOM_LENGTH; i++) {
    suffix += CROCKFORD_ALPHABET[bytes[i] % 32];
  }
  return `${REFERENCE_PREFIX}${suffix}`;
}
