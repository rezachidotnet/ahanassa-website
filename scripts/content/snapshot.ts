/**
 * Step 3 (architecture V1.1 §7.1 step 4, §5.1): the snapshot.v1 file with a
 * MONOTONIC `snapshot_version` (lib/content-pipeline/version.ts) — newer than
 * every pipeline version DB_PUBLIC has recorded — and the full content hash.
 * Deterministic: the same fetch gives the same tables and content_sha256;
 * only the version (and created_at, the version's own time) differ.
 *
 *   node scripts/content/snapshot.ts --work <dir>
 */
import { assembleSnapshotTables } from "../../lib/content-pipeline/assemble.ts";
import type { D1Source } from "../../lib/content-pipeline/d1-source.ts";
import type { OdooSource } from "../../lib/content-pipeline/odoo-source.ts";
import { nextSnapshotVersion, versionTimestamp } from "../../lib/content-pipeline/version.ts";
import { buildVersionedSnapshot } from "../../lib/static/snapshot-io.ts";
import { log as logger, parseArgs, paths, readJson, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const log = logger("snapshot");

await runStep("snapshot", async () => {
  const p = paths(workDir(args.get("work")));
  const validation = readJson<{ ok: boolean }>(p.validation);
  if (!validation.ok) throw new Error("validation.json is not ok; refusing to build a snapshot");
  const odoo = readJson<OdooSource>(p.odoo);
  const d1 = readJson<D1Source>(p.d1);
  const tables = assembleSnapshotTables(odoo, d1, odoo.fetched_at);
  const version = nextSnapshotVersion(new Date(), d1.publication.versions.map((v) => v.version));
  const snapshot = buildVersionedSnapshot(
    tables,
    { kind: "odoo_full_fetch", description: `Odoo ${odoo.base_url} full fetch (${odoo.requests.length} GET) + DB_PUBLIC editorial layer`, fetched_at: odoo.fetched_at },
    version,
    versionTimestamp(version),
  );
  writeJson(p.snapshot, snapshot);
  log(`${version} content_sha256 ${snapshot.content_sha256}`);
  summary(`### Content snapshot\n- \`${version}\` (monotonic; previous ${d1.publication.versions.map((v) => `\`${v.version}\``).join(", ") || "none"})\n- content_sha256 \`${snapshot.content_sha256}\``);
});
