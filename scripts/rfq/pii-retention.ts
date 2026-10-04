/**
 * Website-side PII retention step of the CI reconciler job (architecture
 * V1.1 §13.4; owner decision 2026-10-04; docs/RFQ_PII_RETENTION.md). Not a
 * Worker cron: the account is at 5/5 triggers. One bounded batch per run.
 *
 *   node scripts/rfq/pii-retention.ts --config workers/rfq/wrangler.jsonc --env staging --database DB_OPS \
 *     [--retention-days 30] [--batch 25] [--dry-run true]
 *
 * Output: counts only (never an RFQ id, reference or any personal field), as
 * JSON on stdout and a table in $GITHUB_STEP_SUMMARY. Exit 1 only when the
 * step itself fails.
 */
import fs from "node:fs";
import { PII_RETENTION_DEFAULTS, piiRetentionSummaryMarkdown, runPiiRetention } from "../../lib/rfq/pii-retention.ts";
import { wranglerD1 } from "../../lib/rfq-worker/wrangler-d1.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const config = args.get("config") ?? "workers/rfq/wrangler.jsonc";
const env = args.get("env");
const database = args.get("database") ?? "DB_OPS";
const dryRunArg = args.get("dry-run") ?? "false";
if (dryRunArg !== "true" && dryRunArg !== "false") throw new Error("--dry-run must be true or false");

const result = await runPiiRetention(wranglerD1({ database, config, env }), {
  now: new Date(),
  retentionDays: Number(args.get("retention-days") ?? PII_RETENTION_DEFAULTS.retentionDays),
  batch: Number(args.get("batch") ?? PII_RETENTION_DEFAULTS.batch),
  dryRun: dryRunArg === "true",
});
console.log(JSON.stringify({ operation: "rfq.pii_retention", env: env ?? "local", ...result }));
const summary = piiRetentionSummaryMarkdown(result, env ?? "local");
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
else console.log(summary);
