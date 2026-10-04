/**
 * Thin-content report (W5, D6) — report only, exit 0 whatever it finds.
 *
 *   node scripts/content/thin-content.ts --snapshot <snapshot.v1.json> [--json <out.json>]
 */
import fs from "node:fs";
import { thinContentMarkdown, thinContentReport } from "../../lib/content-pipeline/thin-content.ts";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { parseArgs } from "./common.ts";

const args = parseArgs();
const file = args.get("snapshot");
if (!file) {
  console.error("usage: thin-content.ts --snapshot <snapshot.v1.json> [--json <out.json>]");
  process.exit(2);
}
const report = thinContentReport(readSnapshotFile(file));
if (args.get("json")) fs.writeFileSync(args.get("json")!, JSON.stringify(report, null, 1) + "\n");
console.log(thinContentMarkdown(report));
