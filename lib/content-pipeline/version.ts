import { SNAPSHOT_VERSION_PATTERN } from "../contracts/snapshot-version.ts";

/**
 * Monotonic snapshot versions (architecture V1.1 §5.1). The format stays
 * `snap-<16 hex chars>` (SNAPSHOT_VERSION_PATTERN; the RFQ Worker, the
 * publication_state CHECK and rfq_submit.v1 are unchanged), but a pipeline
 * version uses only decimal digits: `snap-YYYYMMDDHHMMSSnn` (UTC time of the
 * publish + a 2-digit sequence). Lexical order = numeric order = time order.
 *
 * The pre-W4 fixture version (`snap-e55d81c754270c1f`, content-derived) is
 * not part of this sequence; `isPipelineVersion` tells them apart.
 */
const PIPELINE_VERSION = /^snap-(\d{16})$/;

export function isPipelineVersion(version: string): boolean {
  return PIPELINE_VERSION.test(version);
}

export function nextSnapshotVersion(now: Date, existing: readonly string[]): string {
  const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  let candidate = BigInt(`${stamp}00`);
  for (const v of existing) {
    const m = PIPELINE_VERSION.exec(v);
    if (m && BigInt(m[1]) >= candidate) candidate = BigInt(m[1]) + BigInt(1);
  }
  const version = `snap-${candidate.toString().padStart(16, "0")}`;
  if (!SNAPSHOT_VERSION_PATTERN.test(version) || version.length !== 21) throw new Error(`cannot derive a snapshot version from ${now.toISOString()}`);
  return version;
}

/** The ISO time a pipeline version encodes (seconds precision), used as the snapshot's created_at. */
export function versionTimestamp(version: string): string {
  const m = PIPELINE_VERSION.exec(version);
  if (!m) throw new Error(`not a pipeline snapshot version: ${version}`);
  const d = m[1];
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}.000Z`;
}
