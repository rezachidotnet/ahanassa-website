// RELEASE_POLICY.md §20.3 + §20.8 (owner decision W9.7, 2026-10-09) — the ledger row a v11 release earns,
// appended by the release watch as a bot pull request (never pushed to the ledger branch directly).
//
//   node v11-ledger-append.mjs append --manifest <PRODUCTION_DEPLOYMENT_MANIFEST.md> --resolver <release-ledger.ts>
//       --watch <watch.json> --state STABLE_100|ROLLED_BACK --watch-run-id <id> [--rollback <rollback.json>]
//     Appends exactly one row to the RELEASE_SHA table (nothing else in the file changes), then re-validates the
//     whole file with the strict resolver read from the ledger branch: STABLE_100 must make the release
//     BASE_PRODUCTION_SHA; ROLLED_BACK must leave BASE_PRODUCTION_SHA unchanged. Exit 0 appended, 3 already
//     present (nothing to do), 1 refused, 2 could not run. Writes the PR body to --body when given.
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FULL_SHA = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RUN_URL = (id) => `https://github.com/rezachidotnet/ahanassa-website/actions/runs/${id}`;

/** A ledger cell: backticked identifier, `-` for none; never a pipe or a newline (it would split the row). */
const code = (v) => (v ? `\`${v}\`` : "-");
const text = (v) => String(v).replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
const secondIso = (iso) => new Date(iso).toISOString().replace(/\.\d+Z$/, "Z");

/** Pure: the row for a release whose observation PASSED (§20.3 mapping). */
export function stableRow(watch, watchRunId) {
  const e = watch.event;
  const o = watch.observation;
  if (watch.action !== "stable" || e?.kind !== "release" || o?.state !== "PASSED") throw new Error("not a PASSED release observation");
  if (!FULL_SHA.test(e.code_sha) || !UUID.test(e.deployed_worker_version_id ?? "") || !UUID.test(e.previous_worker_version_id ?? "")) throw new Error("the release record lacks its SHA or Worker versions");
  const gaps = o.gaps.length ? o.gaps.map((g) => `${g.from} to ${g.to ?? "now"} (${g.minutes} min, covered by the next run)`).join("; ") : "none over 30 min";
  const notes = text(
    `v11 static release (RELEASE_POLICY.md §20), ${e.risk} (W9.7 classifier). Published by content-publish.yml run ${e.run_id} (snapshot ${e.snapshot_version}); PROMOTION_RUN_ID = that run (§20.3 substitute). ` +
      `Observation ${o.observation_started_at} to ${o.observation_ended_at}: ${o.runs.length} ops-health production runs (${o.runs[0]?.run_id ?? "-"} … ${o.runs.at(-1)?.run_id ?? "-"}), no ALERT; gaps: ${gaps}. ` +
      `Appended automatically by v11-release-watch.yml run ${watchRunId} (§20.8); the owner's merge of this row is the §12 attestation.`,
  );
  return `| ${code(e.code_sha)} | ${code(e.deployed_worker_version_id)} | STABLE_100 | 100 | ${code(e.run_id)} | ${code(e.run_id)} | ${code(e.run_id)} | ${code(e.previous_worker_version_id)} | ${e.risk} | PASS | ${secondIso(e.live_since)} | ${notes} |`;
}

/** Pure: the row for a release the watch rolled back (the rollback record is the new live state). */
export function rolledBackRow(rollback, watchRunId) {
  const rb = rollback?.rolled_back;
  if (rollback?.kind !== "rollback" || !rb || !FULL_SHA.test(rb.code_sha ?? "")) throw new Error("not a rollback record");
  const notes = text(
    `v11 static release rolled back (RELEASE_POLICY.md §20.1, §20.8): ${rb.reason ?? "rollback"}. ` +
      `The release was published by content-publish.yml run ${rb.run_id}. v11-release-watch.yml run ${rollback.run_id} redeployed Worker version ${rollback.deployed_worker_version_id} and moved the publication pointer back to ${rollback.snapshot_version} (live code ${rollback.code_sha}). ` +
      `Appended automatically by v11-release-watch.yml run ${watchRunId}. This release never becomes STABLE_100.`,
  );
  return `| ${code(rb.code_sha)} | ${code(rb.worker_version_id)} | ROLLED_BACK | 0 | ${code(rb.run_id)} | ${code(rb.run_id)} | - | ${code(rollback.deployed_worker_version_id)} | ${rb.risk ?? "HIGH"} | FAIL | ${secondIso(rollback.live_since)} | ${notes} |`;
}

/** Pure: the manifest with `row` appended to the RELEASE_SHA table; every other line unchanged. */
export function appendRow(markdown, row) {
  const lines = markdown.split("\n");
  const headers = lines.flatMap((l, i) => (/^\s*\|\s*RELEASE_SHA\s*\|/.test(l) ? [i] : []));
  if (headers.length !== 1) throw new Error(`expected exactly one RELEASE_SHA table, found ${headers.length}`);
  let end = headers[0] + 2;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  return [...lines.slice(0, end), row, ...lines.slice(end)].join("\n");
}

export function hasRow(markdown, sha, state) {
  return markdown.split("\n").some((l) => l.startsWith(`| \`${sha}\` |`) && l.split("|")[3]?.trim() === state);
}

export function prBody({ state, watch, rollback, watchRunId }) {
  if (state === "STABLE_100") {
    const e = watch.event;
    const o = watch.observation;
    const runs = o.runs.map((r) => `| [${r.run_id}](${RUN_URL(r.run_id)}) | ${r.started_at} | ${r.conclusion} |`).join("\n");
    return [
      `Automatic ledger row (RELEASE_POLICY.md §20.8): **${e.code_sha.slice(0, 7)}** observed 24 h on www.ahanassa.com with no ops-health production ALERT.`,
      "",
      `- release: content-publish.yml run [${e.run_id}](${RUN_URL(e.run_id)}), risk **${e.risk}**, snapshot \`${e.snapshot_version}\``,
      `- observation: ${o.observation_started_at} → ${o.observation_ended_at}, ${o.runs.length} runs, 0 ALERT`,
      `- gaps over 30 min: ${o.gaps.length ? o.gaps.map((g) => `${g.from} → ${g.to ?? "now"} (${g.minutes} min)`).join("; ") : "none"}`,
      watch.prefix_runs ? `- ⚠️ ${watch.prefix_runs} run(s) of the window ran before the ops-health lookback fix (W9.7): check the gaps above before merging` : null,
      `- watch run: [${watchRunId}](${RUN_URL(watchRunId)})`,
      "",
      "**Merging this PR is the owner's §12 attestation.** After the merge, this release is `BASE_PRODUCTION_SHA`.",
      "",
      "| ops-health run | started | production job |",
      "| --- | --- | --- |",
      runs,
    ]
      .filter((l) => l !== null)
      .join("\n");
  }
  const rb = rollback.rolled_back;
  return [
    `Automatic ledger row (RELEASE_POLICY.md §20.8): release **${rb.code_sha.slice(0, 7)}** was rolled back.`,
    "",
    `- reason: ${rb.reason ?? "rollback"}`,
    `- rollback run: [${rollback.run_id}](${RUN_URL(rollback.run_id)}): Worker version \`${rollback.deployed_worker_version_id}\`, pointer \`${rollback.snapshot_version}\`, live code \`${rollback.code_sha}\``,
    `- watch run: [${watchRunId}](${RUN_URL(watchRunId)})`,
    "",
    "Merge to record it. The release never becomes STABLE_100; a fix is a new release.",
  ].join("\n");
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  if (argv[0] !== "append") throw new Error(`unknown mode ${JSON.stringify(argv[0])} (append)`);
  const state = arg(argv, "state");
  const manifestFile = arg(argv, "manifest");
  const watchRunId = arg(argv, "watch-run-id");
  const before = readFileSync(manifestFile, "utf8");
  // The strict resolver, read from the ledger branch by the caller (never from a candidate).
  const dir = mkdtempSync(path.join(tmpdir(), "v11-ledger-"));
  const resolverFile = path.join(dir, "release-ledger.ts");
  writeFileSync(resolverFile, readFileSync(arg(argv, "resolver"), "utf8"));
  const { resolveBaseProductionShaFromManifest } = await import(pathToFileURL(resolverFile).href);
  const baseBefore = resolveBaseProductionShaFromManifest(before);

  let row;
  let sha;
  let watch = null;
  let rollback = null;
  if (state === "STABLE_100") {
    watch = JSON.parse(readFileSync(arg(argv, "watch"), "utf8"));
    sha = watch.event?.code_sha;
    row = stableRow(watch, watchRunId);
  } else if (state === "ROLLED_BACK") {
    rollback = JSON.parse(readFileSync(arg(argv, "rollback"), "utf8"));
    sha = rollback.rolled_back?.code_sha;
    row = rolledBackRow(rollback, watchRunId);
  } else throw new Error(`--state must be STABLE_100 or ROLLED_BACK (got ${state})`);
  if (hasRow(before, sha, state)) {
    console.log(`the ledger already has a ${state} row for ${sha}; nothing to append`);
    return 3;
  }
  const after = appendRow(before, row);
  const baseAfter = resolveBaseProductionShaFromManifest(after);
  if (!baseAfter.ok) {
    console.log(`::error title=ALERT: ledger row refused::the appended ledger does not validate: ${baseAfter.code}: ${baseAfter.reason}`);
    return 1;
  }
  if (state === "STABLE_100" && baseAfter.releaseSha !== sha) {
    console.log(`::error title=ALERT: ledger row refused::after the append BASE_PRODUCTION_SHA is ${baseAfter.releaseSha}, expected ${sha}`);
    return 1;
  }
  if (state === "ROLLED_BACK" && (!baseBefore.ok || baseAfter.releaseSha !== baseBefore.releaseSha)) {
    console.log("::error title=ALERT: ledger row refused::a ROLLED_BACK row must not change BASE_PRODUCTION_SHA");
    return 1;
  }
  writeFileSync(manifestFile, after);
  if (arg(argv, "body")) writeFileSync(arg(argv, "body"), prBody({ state, watch, rollback, watchRunId }) + "\n");
  console.log(`appended a ${state} row for ${sha}; BASE_PRODUCTION_SHA ${baseBefore.ok ? baseBefore.releaseSha : "-"} -> ${baseAfter.releaseSha}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (c) => process.exit(c),
    (err) => {
      console.error(`v11-ledger-append could not run: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
