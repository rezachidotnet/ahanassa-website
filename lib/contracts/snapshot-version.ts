/**
 * snapshot.v1 version pattern, zod-free so the RFQ Worker can check
 * `catalogSnapshotVersion` without pulling the snapshot schema (W3).
 * `snap-` + 16 lowercase hex chars (first 64 bits of the SHA-256 of the canonical tables JSON).
 */
export const SNAPSHOT_VERSION_PATTERN = /^snap-[0-9a-f]{16}$/;
