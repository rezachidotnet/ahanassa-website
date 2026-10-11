// RELEASE_POLICY.md §20.1 / §20.8 (owner decision W9.7, 2026-10-09) — roll www.ahanassa.com back from the current
// release to the state it replaced: the previous static Worker version (its exact assets) + the publication pointer
// back to the previous snapshot. Run from a checkout of the application (wrangler + workers/*/wrangler.jsonc, after
// npm ci) with the production content deploy token.
//
//   node v11-rollback.mjs run --app <checkout> --watch <watch.json> --run-id <id> --out <live-release.json>
//
// Order: every precondition is read first and nothing is written when one fails (the previous snapshot must still be
// in DB_PUBLIC publication_state, the pointer must be the snapshot www serves, the Worker must not already be on the
// target). Then: Worker version -> pointer (guarded on its current value) -> verify (Worker, pointer, www). A failure
// after the first write is an ALERT for the owner (exit 1) — never a silent retry.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { makeRecord, wwwSnapshot } from "./v11-live-release.mjs";

export const STATIC_WORKER = "ahanassa-v11-static-production";
export const STATIC_CONFIG = "workers/static/wrangler.jsonc";
export const D1_CONFIG = "workers/rfq/wrangler.jsonc";

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const SNAPSHOT = /^snap-\d{16}$/;

/** Pure: the guarded pointer move `from` -> `to` (only if the pointer is still `from` and `to` is a kept version). */
export function pointerRollbackSql(from, to, now) {
  if (!SNAPSHOT.test(from) || !SNAPSHOT.test(to)) throw new Error("snapshot versions expected");
  const guard = `EXISTS (SELECT 1 FROM publication_state WHERE version = ${lit(to)})`;
  return [
    `UPDATE publication_pointer SET active_version = ${lit(to)}, updated_at = ${lit(now)} WHERE id = 1 AND active_version = ${lit(from)} AND ${guard}`,
    `UPDATE publication_state SET status = 'superseded', updated_at = ${lit(now)} WHERE status = 'active' AND version <> ${lit(to)} AND EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1 AND active_version = ${lit(to)})`,
    `UPDATE publication_state SET status = 'active', updated_at = ${lit(now)} WHERE version = ${lit(to)} AND EXISTS (SELECT 1 FROM publication_pointer WHERE id = 1 AND active_version = ${lit(to)})`,
  ].join(";\n") + ";";
}

/** Pure: what a rollback of `event` needs, or why it cannot run. */
export function rollbackPlan(event, liveSnapshot) {
  const problems = [];
  if (event?.kind !== "release") problems.push("the current event is not a release");
  if (!event?.previous_worker_version_id) problems.push("no recorded previous Worker version");
  if (!SNAPSHOT.test(event?.previous_snapshot_version ?? "")) problems.push("no recorded previous snapshot");
  if (!/^[0-9a-f]{40}$/.test(event?.previous_code_sha ?? "")) problems.push("the previous live code is unknown (its record could not be written)");
  if (!SNAPSHOT.test(liveSnapshot ?? "")) problems.push("the live snapshot is unknown");
  if (problems.length) return { ok: false, problems };
  return { ok: true, targetVersionId: event.previous_worker_version_id, from: liveSnapshot, to: event.previous_snapshot_version, codeSha: event.previous_code_sha };
}

function makeTools(app) {
  const wrangler = (argv) => {
    const r = spawnSync("npx", ["wrangler", ...argv], { cwd: app, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`wrangler ${argv.slice(0, 3).join(" ")} failed: ${(r.stderr || r.stdout).slice(-600)}`);
    return r.stdout;
  };
  const d1 = (sql) => {
    const out = wrangler(["d1", "execute", "DB_PUBLIC", "--remote", "--json", "--config", D1_CONFIG, "--env", "production", "--command", sql]);
    return JSON.parse(out.slice(out.indexOf("[")));
  };
  return {
    wrangler,
    pointer: () => d1("SELECT active_version FROM publication_pointer WHERE id = 1")[0]?.results?.[0]?.active_version ?? null,
    stateHas: (v) => (d1(`SELECT COUNT(*) AS n FROM publication_state WHERE version = ${lit(v)}`)[0]?.results?.[0]?.n ?? 0) > 0,
    exec: (sql) => d1(sql),
    currentVersion: () => {
      const out = wrangler(["deployments", "list", "--config", STATIC_CONFIG, "--env", "production", "--json"]);
      const list = JSON.parse(out.slice(out.indexOf("[")));
      // Newest deployment by its time (wrangler lists oldest first today; not relied on).
      const newest = [...list].sort((a, b) => String(a.created_on ?? "").localeCompare(String(b.created_on ?? ""))).at(-1);
      return newest?.versions?.find((v) => v.percentage === 100)?.version_id ?? null;
    },
  };
}

async function waitFor(fn, timeoutMs, stepMs = 5000) {
  const until = Date.now() + timeoutMs;
  let last;
  while (Date.now() < until) {
    last = await fn().catch(() => null);
    if (last) return last;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return null;
}

export async function runRollback({ app, watch, runId, tools = makeTools(app), snapshotOf = wwwSnapshot, now = () => new Date().toISOString(), log = console.log }) {
  const event = watch.event;
  // www unreachable (a release that broke it): the production pointer stands in for the snapshot www should serve.
  const fromWww = await snapshotOf().catch(() => null);
  const pointer = tools.pointer();
  const liveSnapshot = fromWww ?? pointer;
  if (!fromWww) log(`www.ahanassa.com is unreachable; using the production pointer ${pointer} as the live snapshot`);
  const plan = rollbackPlan(event, liveSnapshot);
  if (!plan.ok) throw new Error(`rollback refused before any write: ${plan.problems.join("; ")}`);
  if (watch.live?.snapshot && watch.live.snapshot !== liveSnapshot) throw new Error(`rollback refused before any write: www moved from ${watch.live.snapshot} to ${liveSnapshot} since the decision`);
  if (pointer !== plan.from) throw new Error(`rollback refused before any write: the production pointer is ${pointer}, www serves ${plan.from}`);
  if (!tools.stateHas(plan.to)) throw new Error(`rollback refused before any write: ${plan.to} is no longer in production publication_state (retention); roll back by hand`);
  const before = tools.currentVersion();
  if (!before) throw new Error("rollback refused before any write: cannot read the current static Worker version");
  if (before === plan.targetVersionId) throw new Error(`rollback refused before any write: the static Worker already runs ${before}`);

  log(`rolling back ${event.code_sha} (run ${event.run_id}): Worker ${before} -> ${plan.targetVersionId}, pointer ${plan.from} -> ${plan.to}`);
  tools.wrangler(["versions", "deploy", `${plan.targetVersionId}@100%`, "--config", STATIC_CONFIG, "--env", "production", "--yes", "--message", `v11-release-watch rollback of ${event.code_sha.slice(0, 12)} (run ${runId})`]);
  tools.exec(pointerRollbackSql(plan.from, plan.to, now()));
  const switchedAt = now().replace(/\.\d+Z$/, "Z");

  const problems = [];
  if (tools.currentVersion() !== plan.targetVersionId) problems.push(`the static Worker does not run ${plan.targetVersionId}`);
  if (tools.pointer() !== plan.to) problems.push(`the production pointer is not ${plan.to}`);
  const served = await waitFor(async () => ((await snapshotOf()) === plan.to ? plan.to : null), 120_000);
  if (!served) problems.push(`www.ahanassa.com does not serve ${plan.to}`);
  if (problems.length) throw new Error(`ALERT: rollback incomplete after its writes: ${problems.join("; ")} — finish it by hand (RELEASE_POLICY.md §20.1)`);

  return makeRecord({
    kind: "rollback",
    codeSha: plan.codeSha,
    publishState: { version: plan.to, deployed_worker_version_id: plan.targetVersionId, previous_worker_version_id: before, previous_active_version: plan.from, steps: ["rolled_back"] },
    previousCodeSha: event.code_sha,
    risk: null,
    runId,
    switchedAt,
    rolledBack: { code_sha: event.code_sha, run_id: event.run_id, snapshot_version: plan.from, worker_version_id: event.deployed_worker_version_id, risk: event.risk, reason: watch.reason },
  });
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  if (argv[0] !== "run") throw new Error(`unknown mode ${JSON.stringify(argv[0])} (run)`);
  const record = await runRollback({ app: arg(argv, "app") ?? ".", watch: JSON.parse(readFileSync(arg(argv, "watch"), "utf8")), runId: arg(argv, "run-id") });
  writeFileSync(arg(argv, "out"), JSON.stringify(record, null, 1) + "\n");
  console.log(JSON.stringify(record));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (c) => process.exit(c),
    (err) => {
      console.log(`::error title=ALERT: v11 rollback failed::${(err instanceof Error ? err.message : String(err)).replace(/\r?\n/g, " ")}`);
      process.exit(1);
    },
  );
}
