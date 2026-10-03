/**
 * Step 2 (architecture V1.1 §7.1 step 2): schema, relations and counts of the
 * fetched source, plus the DECREASE GATE against the active publication
 * (threshold: lib/content-pipeline/config.ts). A gated decrease stops the run
 * unless `--allow-decrease` (workflow_dispatch input allow_decrease=true) is
 * given; the override is recorded in validation.json and later in the manifest.
 *
 *   node scripts/content/validate.ts --work <dir> [--allow-decrease]
 */
import { assembleSnapshotTables } from "../../lib/content-pipeline/assemble.ts";
import { PIPELINE_CONFIG } from "../../lib/content-pipeline/config.ts";
import { activeCounts, type D1Source } from "../../lib/content-pipeline/d1-source.ts";
import type { OdooSource } from "../../lib/content-pipeline/odoo-source.ts";
import { decreaseFindings, describeDecrease, validateSource } from "../../lib/content-pipeline/validate.ts";
import { log as logger, parseArgs, paths, readJson, runStep, summary, workDir, writeJson } from "./common.ts";

const args = parseArgs();
const log = logger("validate");

await runStep("validate", async () => {
  const p = paths(workDir(args.get("work")));
  const allowDecrease = args.has("allow-decrease");
  const odoo = readJson<OdooSource>(p.odoo);
  const d1 = readJson<D1Source>(p.d1);
  const tables = assembleSnapshotTables(odoo, d1, odoo.fetched_at);
  const result = validateSource(odoo, tables);
  const previous = activeCounts(d1);
  const decrease = decreaseFindings(result.counts, previous);
  const blockedByDecrease = decrease.length > 0 && !allowDecrease;
  const ok = result.errors.length === 0 && !blockedByDecrease;
  writeJson(p.validation, {
    ok,
    errors: result.errors,
    warnings: result.warnings,
    counts: result.counts,
    previous_active_version: d1.publication.active_version,
    previous_counts: previous,
    decrease_threshold: PIPELINE_CONFIG.decreaseThreshold,
    decrease,
    allow_decrease: allowDecrease,
  });
  for (const w of result.warnings) log(`warning: ${w}`);
  summary(
    [
      `### Content validate: ${ok ? "PASS" : "BLOCKED"}`,
      `- counts: \`${JSON.stringify(result.counts)}\``,
      `- previous active \`${d1.publication.active_version}\`: \`${JSON.stringify(previous)}\``,
      ...result.warnings.map((w) => `- ⚠️ ${w}`),
      ...result.errors.map((e) => `- ❌ ${e}`),
      decrease.length ? (allowDecrease ? `- ⚠️ decrease gate OVERRIDDEN by allow_decrease=true (recorded): ${decrease.map((d) => `${d.key} ${d.previous}->${d.current}`).join(", ")}` : `\n\`\`\`\n${describeDecrease(decrease)}\n\`\`\``) : "- decrease gate: pass",
    ].join("\n"),
  );
  if (result.errors.length) throw new Error(`validation failed with ${result.errors.length} error(s); the active version is untouched:\n${result.errors.join("\n")}`);
  if (blockedByDecrease) throw new Error(describeDecrease(decrease));
});
