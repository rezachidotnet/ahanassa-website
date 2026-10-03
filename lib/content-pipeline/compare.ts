import type { ArtifactManifest } from "../contracts/artifact-v1.ts";

/**
 * Determinism comparison of two artifacts' public-assets (W4, §7.1: same
 * Odoo input → byte-identical public files except the version stamp). Pure:
 * the caller supplies manifests and a file reader.
 */
export interface ComparableArtifact {
  manifest: ArtifactManifest;
  /** snapshot.created_at — the version's own time, part of the stamp. */
  createdAt: string;
  contentSha256: string | null;
  read: (publicPath: string) => Buffer;
}

export interface ArtifactComparison {
  versions: [string, string];
  content_sha256: [string | null, string | null];
  same_content: boolean;
  public_files: [number, number];
  identical_files: number;
  stamp_only_files: string[];
  other_differences: string[];
  identical_except_stamp: boolean;
}

const PLACEHOLDER = "__SNAPSHOT_STAMP__";

export function stripStamp(text: string, version: string, createdAt: string): string {
  return text.split(version).join(PLACEHOLDER).split(createdAt).join(PLACEHOLDER);
}

export function compareArtifacts(a: ComparableArtifact, b: ComparableArtifact): ArtifactComparison {
  const mapA = new Map(a.manifest.public_assets.map((e) => [e.path, e.sha256]));
  const mapB = new Map(b.manifest.public_assets.map((e) => [e.path, e.sha256]));
  const stampOnly: string[] = [];
  const other: string[] = [];
  let identical = 0;
  for (const [p, sha] of mapA) {
    const shaB = mapB.get(p);
    if (shaB === undefined) {
      other.push(`only in A: ${p}`);
      continue;
    }
    if (sha === shaB) {
      identical++;
      continue;
    }
    const ta = stripStamp(a.read(p).toString("utf8"), a.manifest.snapshot_version, a.createdAt);
    const tb = stripStamp(b.read(p).toString("utf8"), b.manifest.snapshot_version, b.createdAt);
    (ta === tb ? stampOnly : other).push(p);
  }
  for (const p of mapB.keys()) if (!mapA.has(p)) other.push(`only in B: ${p}`);
  return {
    versions: [a.manifest.snapshot_version, b.manifest.snapshot_version],
    content_sha256: [a.contentSha256, b.contentSha256],
    same_content: a.contentSha256 !== null && a.contentSha256 === b.contentSha256,
    public_files: [mapA.size, mapB.size],
    identical_files: identical,
    stamp_only_files: stampOnly.sort(),
    other_differences: other.sort(),
    identical_except_stamp: other.length === 0,
  };
}
