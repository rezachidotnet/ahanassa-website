/**
 * Determinism check (W4): compares the public-assets of two artifacts.
 * Every file must be byte-identical, except files whose ONLY difference is
 * the version stamp (each artifact's snapshot_version and the matching
 * created_at): after replacing those with a placeholder they must be
 * byte-identical too. Exit 1 on any other difference.
 *
 *   node scripts/content/compare-artifacts.ts <artifactA> <artifactB> [--json <out>]
 */
import fs from "node:fs";
import path from "node:path";
import { artifactManifest } from "../../lib/contracts/artifact-v1.ts";
import { compareArtifacts } from "../../lib/content-pipeline/compare.ts";
import { parseArgs } from "./common.ts";

const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const args = parseArgs();
if (!a || !b) throw new Error("usage: compare-artifacts.ts <artifactA> <artifactB> [--json <out>]");
const load = (dir: string) => {
  const manifest = artifactManifest.parse(JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")));
  const snapshot = JSON.parse(fs.readFileSync(path.join(dir, "private-snapshot/snapshot.json"), "utf8")) as { created_at: string; content_sha256?: string };
  return { dir, manifest, createdAt: snapshot.created_at, contentSha256: snapshot.content_sha256 ?? null, read: (p: string) => fs.readFileSync(path.join(dir, "public-assets", p)) };
};
const result = compareArtifacts(load(a), load(b));
if (args.get("json")) fs.writeFileSync(args.get("json")!, JSON.stringify(result, null, 1) + "\n");
console.log(JSON.stringify({ ...result, stamp_only_files: result.stamp_only_files }, null, 1));
process.exit(result.identical_except_stamp ? 0 : 1);
