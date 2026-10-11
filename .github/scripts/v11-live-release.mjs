// RELEASE_POLICY.md §20 (owner decision W9.7, 2026-10-09) — which code is LIVE on www.ahanassa.com, and how the
// release that put it there is observed.
//
// The "production publish state" is the set of records the production jobs leave behind:
//   - `v11-live-release` artifacts (live-release.json, schema v11-live-release.v1), written by every production job
//     of content-publish.yml after its finalize step and by v11-release-watch.yml after a rollback;
//   - for the releases before W9.7, the `production-prep-evidence-<run>` / `production-content-evidence-<run>`
//     artifacts (content-rebuild.json: codeSha + snapshotVersion; publish-state.production.json: finalized, Worker
//     versions, previous pointer).
// Only artifacts of runs of the two trusted workflow files on `main` count. The live record is the newest one whose
// snapshot_version is the snapshot www.ahanassa.com serves right now (/manifest.public.json, public, no token), so
// a record can never name code that is not what visitors get.
//
//   node v11-live-release.mjs live --app <checkout, full history> --ledger-ref <ref> [--expect-snapshot <snap>]
//     Prints { ok, sha, snapshot, stable_sha, eligible, reason, record, event } and writes sha/eligible/reason/
//     snapshot/risk to $GITHUB_OUTPUT. eligible = the live code is a v11 release on <ref>'s history at or after the
//     latest STABLE_100 (never a downgrade). --expect-snapshot: exit 1 unless www still serves that snapshot (the
//     pre-write guard of a production job: no rollback or other publish since the build). Exit 0 when it could
//     decide, 2 when it could not run.
//   node v11-live-release.mjs content-check --artifact <dir> --live-sha <sha> [--decision-file <out>]
//     CONTENT_REBUILD (§19) against the LIVE code: exit 0 AUTO, 3 APPROVAL_REQUIRED, 1 REFUSED, 2 could not run.
//   node v11-live-release.mjs record --out <file> --kind release|content --code-sha <sha> --publish-state <file>
//       --previous-code-sha <sha|""> --risk LOW|HIGH|NONE --run-id <id> --switched-at <iso>
//     Writes live-release.json for a production job that finalized.
//   node v11-live-release.mjs watch --app <checkout> --ledger-ref <ref> [--operation watch|rollback] [--out <file>]
//     The observation decision for the current release (see observe()); writes action=… to $GITHUB_OUTPUT.
//
// Needs GITHUB_TOKEN (actions: read) and GITHUB_REPOSITORY for the record lookups.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveStableRelease } from "./v11-stable-release.mjs";

export const RECORD_ARTIFACT = "v11-live-release";
export const RECORD_FILE = "live-release.json";
export const RECORD_SCHEMA = "v11-live-release.v1";
export const LEGACY_EVIDENCE = /^production-(prep|content)-evidence-\d+$/;
export const TRUSTED_WORKFLOWS = [".github/workflows/content-publish.yml", ".github/workflows/v11-release-watch.yml"];
export const PRODUCTION_ORIGIN = "https://www.ahanassa.com";
export const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";
/** §20.2: MINIMUM_OBSERVATION_DURATION (v11). */
export const OBSERVATION_MS = 24 * 3_600_000;
/** An ops-health run's window reaches back at most 24 h (scripts/ops/health/config.ts WINDOW.maxMinutes). */
export const MAX_COVERED_GAP_MS = 24 * 3_600_000;
export const HEALTH_WORKFLOW = "ops-health.yml";
export const HEALTH_PRODUCTION_JOB = "health (production-prep)";

const FULL_SHA = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SNAPSHOT = /^snap-\d{16}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Records ---------------------------------------------------------------------------------------------------------

/** Pure: live-release.json for a production job that finalized (publish-state.production.json + the job's facts). */
export function makeRecord({ kind, codeSha, publishState, previousCodeSha, risk, runId, switchedAt, rolledBack = null }) {
  if (!["release", "content", "rollback"].includes(kind)) throw new Error(`kind ${JSON.stringify(kind)}`);
  if (!FULL_SHA.test(codeSha ?? "")) throw new Error(`code sha ${JSON.stringify(codeSha)}`);
  if (kind !== "rollback" && !publishState?.steps?.includes("finalized")) throw new Error("the publish state is not finalized: nothing went live");
  const r = {
    schema: RECORD_SCHEMA,
    kind,
    code_sha: codeSha,
    snapshot_version: publishState.version,
    deployed_worker_version_id: publishState.deployed_worker_version_id ?? null,
    previous_worker_version_id: publishState.previous_worker_version_id ?? null,
    previous_snapshot_version: publishState.previous_active_version ?? null,
    previous_code_sha: FULL_SHA.test(previousCodeSha ?? "") ? previousCodeSha : null,
    risk: kind === "release" ? (risk === "LOW" ? "LOW" : "HIGH") : null,
    run_id: String(runId),
    live_since: switchedAt,
    rolled_back: rolledBack,
  };
  const problems = recordProblems(r);
  if (problems.length) throw new Error(`invalid record: ${problems.join("; ")}`);
  return r;
}

export function recordProblems(r) {
  const p = [];
  if (r?.schema !== RECORD_SCHEMA) p.push("schema");
  if (!["release", "content", "rollback", null].includes(r?.kind ?? null)) p.push("kind");
  if (!FULL_SHA.test(r?.code_sha ?? "")) p.push("code_sha");
  if (!SNAPSHOT.test(r?.snapshot_version ?? "")) p.push("snapshot_version");
  if (!UUID.test(r?.deployed_worker_version_id ?? "")) p.push("deployed_worker_version_id");
  if (r?.previous_worker_version_id !== null && !UUID.test(r?.previous_worker_version_id ?? "")) p.push("previous_worker_version_id");
  if (r?.previous_snapshot_version !== null && !SNAPSHOT.test(r?.previous_snapshot_version ?? "")) p.push("previous_snapshot_version");
  if (r?.previous_code_sha !== null && !FULL_SHA.test(r?.previous_code_sha ?? "")) p.push("previous_code_sha");
  if (!/^\d+$/.test(r?.run_id ?? "")) p.push("run_id");
  if (!ISO.test(r?.live_since ?? "")) p.push("live_since");
  return p;
}

/** Pure: a pre-W9.7 production evidence artifact as a record (kind unknown; derived from the chain). */
export function legacyRecord({ contentRebuild, publishState, runId, switchedAt }) {
  if (!publishState?.steps?.includes("finalized") || !publishState.switched) return null;
  if (!FULL_SHA.test(contentRebuild?.codeSha ?? "") || contentRebuild.snapshotVersion !== publishState.version) return null;
  const r = {
    schema: RECORD_SCHEMA,
    kind: null,
    code_sha: contentRebuild.codeSha,
    snapshot_version: publishState.version,
    deployed_worker_version_id: publishState.deployed_worker_version_id ?? null,
    previous_worker_version_id: publishState.previous_worker_version_id ?? null,
    previous_snapshot_version: publishState.previous_active_version ?? null,
    previous_code_sha: null,
    risk: null,
    run_id: String(runId),
    live_since: switchedAt,
    rolled_back: null,
    legacy: true,
  };
  return recordProblems(r).length ? null : r;
}

const byTimeDesc = (a, b) => (a.live_since === b.live_since ? Number(b.run_id) - Number(a.run_id) : a.live_since < b.live_since ? 1 : -1);

/** Pure: the newest record that put `snapshot` on www. */
export function recordForSnapshot(records, snapshot) {
  return [...records].sort(byTimeDesc).find((r) => r.snapshot_version === snapshot) ?? null;
}

/**
 * Pure: release | content | rollback | unknown, deriving it for a legacy record from the record of its previous
 * snapshot. A legacy record whose previous record is not among the collected ones is "unknown" (never guessed as a
 * release: its rollback target could be a content publish of the same code).
 */
export function kindOf(record, records) {
  if (record.kind) return record.kind;
  if (!record.previous_snapshot_version) return "release";
  const prev = recordForSnapshot(records.filter((r) => r.live_since < record.live_since), record.previous_snapshot_version);
  if (!prev) return "unknown";
  return prev.code_sha === record.code_sha ? "content" : "release";
}

/** Pure: the previous live code of a record (its own field, else the record of its previous snapshot). */
export function previousCodeOf(record, records) {
  if (record.previous_code_sha) return record.previous_code_sha;
  const prev = record.previous_snapshot_version ? recordForSnapshot(records.filter((r) => r.live_since < record.live_since), record.previous_snapshot_version) : null;
  return prev?.code_sha ?? null;
}

/**
 * Pure: the event that made the live code live — the newest release or rollback record, walking back from the live
 * record through records of the same code (content publishes). null when the collected records do not reach it.
 */
export function currentEvent(records, live) {
  const sorted = [...records].sort(byTimeDesc).filter((r) => r.live_since <= live.live_since);
  for (const r of sorted) {
    // Another code before any release of this one: the chain is broken (e.g. a publish raced a rollback) — the owner decides.
    if (r.code_sha !== live.code_sha) return { ...live, kind: "unknown", reason: `no release record of ${live.code_sha} before a record of other code (${r.code_sha}, run ${r.run_id})` };
    const kind = kindOf(r, records);
    if (kind === "unknown") return { ...r, kind, reason: `record of run ${r.run_id}: its previous snapshot's record is not available` };
    if (kind === "release" || kind === "rollback") return { ...r, kind, previous_code_sha: previousCodeOf(r, records), risk: r.risk ?? (kind === "release" ? "HIGH" : null) };
  }
  return null;
}

// GitHub ----------------------------------------------------------------------------------------------------------

export function githubClient({ token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY, fetchImpl = fetch } = {}) {
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  return {
    async json(p) {
      const res = await fetchImpl(`https://api.github.com/repos/${repo}${p}`, { headers, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`GitHub API ${res.status} for ${p.split("?")[0]}`);
      return res.json();
    },
    /** The artifact's zip (the redirect to storage drops the Authorization header). */
    async download(id) {
      const res = await fetchImpl(`https://api.github.com/repos/${repo}/actions/artifacts/${id}/zip`, { headers, redirect: "follow", signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`GitHub API ${res.status} downloading artifact ${id}`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}

/** One file of a zip (unzip -p; ubuntu and macOS runners have it). null when the entry is absent. */
export function unzipEntry(zip, entry) {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-artifact-"));
  try {
    const file = path.join(dir, "a.zip");
    writeFileSync(file, zip);
    const list = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n");
    if (!list.includes(entry)) return null;
    return execFileSync("unzip", ["-p", file, entry], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function trustedRun(gh, runId, cache) {
  if (!cache.has(runId)) {
    const run = await gh.json(`/actions/runs/${runId}`);
    cache.set(runId, run);
  }
  const run = cache.get(runId);
  return run.head_branch === "main" && TRUSTED_WORKFLOWS.includes(run.path?.split("@")[0]) && ["schedule", "workflow_dispatch", "workflow_run"].includes(run.event) ? run : null;
}

/** Switch completion of a legacy production job (the "12. Switch production" step), else the job's completion. */
async function legacySwitchedAt(gh, runId) {
  const { jobs } = await gh.json(`/actions/runs/${runId}/jobs?per_page=50`);
  for (const j of jobs) {
    if (!j.name.startsWith("publish-production")) continue;
    const step = (j.steps ?? []).find((s) => s.name.startsWith("12. Switch production") && s.conclusion === "success");
    if (step?.completed_at) return step.completed_at.replace(/\.\d+Z$/, "Z");
  }
  return null;
}

/**
 * Every record reachable: new-style artifacts (by name) and, walking content-publish.yml runs newest first, the
 * legacy evidence until `enough(records)` holds or maxLegacyRuns runs were read.
 */
export async function collectRecords(gh, { enough = () => false, maxLegacyRuns = 40, maxRecords = 60 } = {}) {
  const runs = new Map();
  const records = [];
  // Newest first (the API order); stop as soon as the chain is complete, so an hourly watch reads a handful of
  // artifacts, not all of the last 90 days (GITHUB_TOKEN rate limit).
  outer: for (let page = 1; page <= 3; page++) {
    const { artifacts } = await gh.json(`/actions/artifacts?name=${RECORD_ARTIFACT}&per_page=100&page=${page}`);
    for (const a of artifacts) {
      if (a.expired || a.name !== RECORD_ARTIFACT) continue;
      const runId = String(a.workflow_run?.id ?? "");
      if (!(await trustedRun(gh, runId, runs))) continue;
      const text = unzipEntry(await gh.download(a.id), RECORD_FILE);
      if (!text) continue;
      const r = JSON.parse(text);
      if (recordProblems(r).length || r.run_id !== runId) continue;
      records.push(r);
      if (enough(records) || records.length >= maxRecords) break outer;
    }
    if (artifacts.length < 100) break;
  }
  if (enough(records)) return records;
  const { workflow_runs } = await gh.json(`/actions/workflows/content-publish.yml/runs?status=completed&per_page=${maxLegacyRuns}`);
  for (const run of workflow_runs) {
    if (records.some((r) => r.run_id === String(run.id))) continue;
    if (!(await trustedRun(gh, String(run.id), runs.set(String(run.id), run)))) continue;
    const { artifacts } = await gh.json(`/actions/runs/${run.id}/artifacts?per_page=100`);
    const ev = artifacts.find((a) => LEGACY_EVIDENCE.test(a.name) && !a.expired);
    if (!ev) continue;
    const zip = await gh.download(ev.id);
    const contentRebuild = JSON.parse(unzipEntry(zip, "content-rebuild.json") ?? "null");
    const publishState = JSON.parse(unzipEntry(zip, "publish-state.production.json") ?? "null");
    if (!publishState?.steps?.includes("finalized")) continue;
    const switchedAt = await legacySwitchedAt(gh, run.id);
    const r = switchedAt ? legacyRecord({ contentRebuild, publishState, runId: run.id, switchedAt }) : null;
    if (r) records.push(r);
    if (enough(records)) break;
  }
  return records;
}

export async function wwwSnapshot(fetchImpl = fetch, origin = PRODUCTION_ORIGIN) {
  const res = await fetchImpl(`${origin}/manifest.public.json?ts=${Date.now()}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(20_000) });
  if (res.status !== 200) throw new Error(`${origin}/manifest.public.json returned HTTP ${res.status}`);
  const v = (await res.json()).snapshot_version;
  if (!SNAPSHOT.test(v ?? "")) throw new Error(`${origin}/manifest.public.json has no valid snapshot_version`);
  return v;
}

/** Records are "enough" once the live record and the event that made its code live are both present. */
export function chainComplete(snapshot) {
  return (records) => {
    const live = recordForSnapshot(records, snapshot);
    if (!live) return false;
    const event = currentEvent(records, live);
    // "unknown" is not complete: keep reading (an older record may name the previous snapshot).
    return Boolean(event && event.kind !== "unknown" && (event.kind !== "release" || event.previous_code_sha || !event.previous_snapshot_version));
  };
}

function git(app, args) {
  return execFileSync("git", args, { cwd: app, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}
function gitOk(app, args) {
  try {
    execFileSync("git", args, { cwd: app, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * The live code. Refused (eligible false) when no record names the snapshot www serves, the SHA is not on the ledger
 * branch, has no content pipeline, or is OLDER than the latest STABLE_100 (that would be a downgrade).
 */
export async function resolveLive({ app, ledgerRef, gh, snapshot, records, allowUnreachable = false }) {
  let s = snapshot;
  let unreachable = null;
  if (!s) {
    try {
      s = await wwwSnapshot();
    } catch (error) {
      if (!allowUnreachable) throw error;
      unreachable = error instanceof Error ? error.message : String(error);
    }
  }
  // www unreachable (the watch only): the newest production record is taken as live, so a release that broke www can
  // still be rolled back. The rollback itself then reads the production pointer instead of www.
  const recs = records ?? (await collectRecords(gh, { enough: s ? chainComplete(s) : (rs) => rs.length >= 10 }));
  if (!s) s = [...recs].sort(byTimeDesc)[0]?.snapshot_version ?? null;
  const record = recordForSnapshot(recs, s);
  const stable = await resolveStableRelease(app, ledgerRef);
  const base = { snapshot: s, stable_sha: stable.sha ?? null };
  if (!record) return { ok: false, eligible: false, sha: null, ...base, record: null, event: null, reason: `no trusted production publish record names the snapshot www serves (${s})` };
  const event = currentEvent(recs, record);
  const sha = record.code_sha;
  const out = { ok: true, sha, ...base, record, event, www_unreachable: unreachable };
  const ref = git(app, ["rev-parse", "--verify", `${ledgerRef}^{commit}`]);
  if (!gitOk(app, ["merge-base", "--is-ancestor", sha, ref])) return { ...out, eligible: false, reason: `live code ${sha} is not on ${ledgerRef}'s history` };
  if (!gitOk(app, ["cat-file", "-e", `${sha}:scripts/content/publish.ts`])) return { ...out, eligible: false, reason: `live code ${sha} has no content pipeline` };
  if (!stable.ok || !stable.sha) return { ...out, eligible: false, reason: `the ledger has no usable STABLE_100 row (${stable.reason})` };
  if (!gitOk(app, ["merge-base", "--is-ancestor", stable.sha, sha])) {
    return { ...out, eligible: false, reason: `live code ${sha} does not contain the latest STABLE_100 ${stable.sha}: building it would be a downgrade` };
  }
  return { ...out, eligible: true, reason: `www serves ${s} from live code ${sha} (${event ? `${event.kind} run ${event.run_id}` : "event not found"}); latest STABLE_100 ${stable.sha} is contained in it` };
}

// CONTENT_REBUILD against the live code (§19 as amended by W9.7) ----------------------------------------------------

export function nonStaticPublicPath(p) {
  const base = p.split("/").pop() ?? p;
  if (base === "_worker.js" || p.startsWith("_worker.js/")) return "Worker script (_worker.js)";
  if (base === "_routes.json") return "routing config (_routes.json)";
  if (/^wrangler\.(jsonc?|toml)$/.test(base)) return "Worker configuration";
  if (p.startsWith("functions/")) return "Functions directory";
  return null;
}

/** Pure: AUTO | APPROVAL_REQUIRED | REFUSED for a production artifact manifest and the live code SHA. */
export function evaluateContentRebuild(manifest, liveSha) {
  const ids = { codeSha: manifest?.code_sha ?? null, liveSha: liveSha ?? null, snapshotVersion: manifest?.snapshot_version ?? null };
  const refused = (code, reasons) => ({ result: "REFUSED", code, reasons, ...ids });
  if (!FULL_SHA.test(liveSha ?? "")) return refused("LIVE_CODE_UNRESOLVED", ["the live code could not be resolved"]);
  if (manifest?.schema_version !== "artifact.v1" || !FULL_SHA.test(manifest?.code_sha ?? "") || !Array.isArray(manifest?.public_assets)) return refused("MANIFEST_INVALID", ["manifest.json is not an artifact.v1 manifest"]);
  if (!manifest.pipeline) return refused("NOT_A_CONTENT_PIPELINE_ARTIFACT", ["manifest.json has no pipeline block"]);
  if (manifest.environment !== "production") return refused("TARGET_NOT_PRODUCTION", [`artifact built for the ${manifest.environment} target`]);
  if (manifest.code_sha !== liveSha) return refused("CODE_SHA_NOT_LIVE", [`code_sha ${manifest.code_sha} is not the live code ${liveSha}: a code release (production-prep, owner approval)`]);
  const nonStatic = manifest.public_assets.flatMap((f) => (nonStaticPublicPath(f.path) ? [`public-assets/${f.path}: ${nonStaticPublicPath(f.path)}`] : []));
  if (nonStatic.length) return refused("NOT_STATIC_ONLY", nonStatic);
  const approval = [];
  if (manifest.pipeline.allow_decrease) approval.push("the decrease gate was overridden (allow_decrease)");
  if (manifest.pipeline.overridden_decreases?.length) approval.push(`overridden decreases: ${manifest.pipeline.overridden_decreases.length}`);
  if (approval.length) return { result: "APPROVAL_REQUIRED", reasons: approval, ...ids };
  return { result: "AUTO", reasons: ["code_sha is the live code; static assets + snapshot only; all gates passed"], ...ids };
}

// Observation (§20.2) --------------------------------------------------------------------------------------------

/**
 * Production ops-health outcomes since `since`: [{ run_id, started_at, conclusion }] of the health-production job.
 * A completed successful run means its production job passed (started ≈ run start); any other run is read job by job
 * (per-job concurrency: the production job can finish while the staging job of the same run is still waiting).
 */
export async function productionHealthRuns(gh, since) {
  const out = [];
  const created = new Date(Date.parse(since) - 30 * 60_000).toISOString().replace(/\.\d+Z$/, "Z");
  for (let page = 1; page <= 10; page++) {
    const { workflow_runs } = await gh.json(`/actions/workflows/${HEALTH_WORKFLOW}/runs?created=%3E%3D${created}&per_page=100&page=${page}`);
    for (const run of workflow_runs) {
      if (run.head_branch !== "main") continue;
      if (run.status === "completed" && run.conclusion === "success") {
        out.push({ run_id: String(run.id), started_at: run.run_started_at, conclusion: "success" });
        continue;
      }
      const { jobs } = await gh.json(`/actions/runs/${run.id}/jobs?per_page=20`);
      const job = jobs.find((j) => j.name === HEALTH_PRODUCTION_JOB);
      // A health job that hung until its timeout may be the symptom itself: it counts as an ALERT.
      if (job && job.status === "completed" && ["success", "failure", "timed_out"].includes(job.conclusion) && job.started_at) {
        out.push({ run_id: String(run.id), started_at: job.started_at, conclusion: job.conclusion === "success" ? "success" : "failure" });
      }
    }
    if (workflow_runs.length < 100) break;
  }
  return out.filter((r) => r.started_at > since).sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
}

/**
 * Pure. state:
 *   ALERT      a production health job of the window failed (the window ends with the first job that starts at or
 *              after live_since + 24 h, which still reports on the end of the window);
 *   OBSERVING  no job has started after the end yet;
 *   GAP        two consecutive jobs (or live_since and the first job) are more than 24 h apart: no run covers it;
 *   PASSED     24 h covered, no ALERT.
 */
export function observe(liveSince, runs, now = new Date()) {
  const start = Date.parse(liveSince);
  const end = start + OBSERVATION_MS;
  const after = runs.filter((r) => Date.parse(r.started_at) > start).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  const coverIdx = after.findIndex((r) => Date.parse(r.started_at) >= end);
  const window = coverIdx === -1 ? after : after.slice(0, coverIdx + 1);
  const alerts = window.filter((r) => r.conclusion === "failure");
  const gaps = [];
  let prev = start;
  for (const r of window) {
    const t = Date.parse(r.started_at);
    if (t - prev > 30 * 60_000) gaps.push({ from: new Date(prev).toISOString(), to: r.started_at, minutes: Math.round((t - prev) / 60_000), covered: t - prev <= MAX_COVERED_GAP_MS });
    prev = t;
  }
  if (coverIdx === -1 && now.getTime() - prev > 30 * 60_000) gaps.push({ from: new Date(prev).toISOString(), to: null, minutes: Math.round((now.getTime() - prev) / 60_000), covered: now.getTime() - prev <= MAX_COVERED_GAP_MS });
  const base = { observation_started_at: new Date(start).toISOString(), observation_ends_at: new Date(end).toISOString(), runs: window, alerts, gaps };
  if (alerts.length) return { state: "ALERT", ...base };
  if (gaps.some((g) => !g.covered)) return { state: "GAP", ...base };
  if (coverIdx === -1) return { state: "OBSERVING", ...base };
  return { state: "PASSED", ...base, observation_ended_at: window.at(-1).started_at };
}

/** Rows of the ledger table on the ledger ref: [{ sha, state }] (lenient read; the append step validates strictly). */
export function ledgerRows(markdown) {
  const lines = markdown.split("\n");
  const h = lines.findIndex((l) => /^\s*\|\s*RELEASE_SHA\s*\|/.test(l));
  if (h < 0) return [];
  const rows = [];
  for (let i = h + 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const c = lines[i].split("|").slice(1, -1).map((x) => x.trim().replace(/^`|`$/g, ""));
    rows.push({ sha: c[0], state: c[2] });
  }
  return rows;
}

/**
 * Pure: what the watch does now.
 *   none          nothing to do (no code event, or already recorded)
 *   observing     the release is in its 24 h window, no ALERT
 *   stable        PASSED: append the STABLE_100 row (bot PR)
 *   rollback      LOW release + ALERT (or operation=rollback): roll back, then the ROLLED_BACK row
 *   alert         HIGH release + ALERT: the owner decides (§20.2); nothing automatic
 *   gap           an uncovered monitoring gap: the owner decides
 *   rolled-back   the live code is a rollback whose ROLLED_BACK row is missing: append it
 */
export function decide({ event, observation, rows, operation = "watch" }) {
  if (!event) return { action: "none", reason: "the event that made the live code live is not in the collected records" };
  if (event.kind === "unknown") return { action: "unknown", reason: `the live code's release cannot be identified (${event.reason}); nothing automatic — the owner decides` };
  if (event.kind === "rollback") {
    if (operation === "rollback") return { action: "none", reason: "the live code is already a rollback; a rollback is never rolled back" };
    const rb = event.rolled_back;
    if (rb && !rows.some((r) => r.sha === rb.code_sha && r.state === "ROLLED_BACK")) return { action: "rolled-back", reason: `ROLLED_BACK row for ${rb.code_sha} is missing` };
    return { action: "none", reason: "live code is a rollback; recorded" };
  }
  const target = event.previous_worker_version_id && event.previous_snapshot_version && event.previous_code_sha;
  if (operation === "rollback") {
    if (!target) return { action: "none", reason: "the release has no complete recorded rollback target (Worker version, snapshot, code)", refused: true };
    if (rows.some((r) => r.sha === event.code_sha && r.state === "STABLE_100")) return { action: "none", reason: `${event.code_sha} is already STABLE_100: rolling it back is an EMERGENCY_ROLLBACK (§13), not this path`, refused: true };
    return { action: "rollback", reason: `owner-dispatched rollback of ${event.code_sha}` };
  }
  if (rows.some((r) => r.sha === event.code_sha && r.state === "STABLE_100")) return { action: "none", reason: `${event.code_sha} already has a STABLE_100 row` };
  switch (observation.state) {
    case "ALERT":
      if (event.risk === "LOW" && target) return { action: "rollback", reason: `LOW release ${event.code_sha}: ops-health production ALERT in the window (${observation.alerts.map((a) => a.run_id).join(", ")})` };
      return { action: "alert", reason: `${event.risk} release ${event.code_sha}: ops-health production ALERT in the window (${observation.alerts.map((a) => a.run_id).join(", ")}) — the owner decides: rollback or fix (§20.2)` };
    case "GAP":
      return { action: "gap", reason: "a monitoring gap no ops-health run covers; the owner decides (§20.2)" };
    case "OBSERVING":
      return { action: "observing", reason: `observation until ${observation.observation_ends_at}` };
    case "PASSED":
      return { action: "stable", reason: `24 h observed (${observation.runs.length} ops-health production runs, no ALERT)` };
    default:
      throw new Error(`unknown observation state ${observation.state}`);
  }
}

/**
 * Pure: whether this watch run should fail to e-mail the owner about a state that needs them (a rollback always does,
 * in the workflow). Throttled, as the watch runs hourly: an ALERT when its newest failed run is under 75 min old (each
 * new failed ops-health run e-mails once more); a gap or an unidentified release once a day (the 08:52 UTC watch).
 */
export function shouldNotify(d, observation, now = new Date()) {
  if (d.action === "alert") {
    const newest = Math.max(...(observation?.alerts ?? []).map((a) => Date.parse(a.started_at)));
    return now.getTime() - newest < 75 * 60_000;
  }
  if (d.action === "gap" || d.action === "unknown") return now.getUTCHours() === 8;
  return false;
}

// CLI -------------------------------------------------------------------------------------------------------------

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${String(v ?? "").replace(/\n/g, " ")}\n`).join(""));
}

async function main(argv) {
  const mode = argv[0];
  const app = arg(argv, "app") ?? ".";
  if (mode === "live") {
    const r = await resolveLive({ app, ledgerRef: arg(argv, "ledger-ref"), gh: githubClient() });
    console.log(JSON.stringify(r));
    output({ sha: r.sha, eligible: r.eligible, reason: r.reason, snapshot: r.snapshot, risk: r.event?.risk ?? "" });
    const expect = arg(argv, "expect-snapshot");
    if (expect !== undefined && r.snapshot !== expect) {
      console.log(`::error title=ALERT: production changed since the build::www.ahanassa.com serves ${r.snapshot}, the build saw ${expect || "nothing"} (a rollback or another publish ran in between) — nothing was written; run it again`);
      return 1;
    }
    return 0;
  }
  if (mode === "content-check") {
    const manifest = JSON.parse(readFileSync(path.join(arg(argv, "artifact"), "manifest.json"), "utf8"));
    const d = evaluateContentRebuild(manifest, arg(argv, "live-sha"));
    console.log(JSON.stringify(d));
    if (arg(argv, "decision-file")) writeFileSync(arg(argv, "decision-file"), JSON.stringify(d, null, 1) + "\n");
    return d.result === "AUTO" ? 0 : d.result === "APPROVAL_REQUIRED" ? 3 : 1;
  }
  if (mode === "record") {
    const r = makeRecord({
      kind: arg(argv, "kind"),
      codeSha: arg(argv, "code-sha"),
      publishState: JSON.parse(readFileSync(arg(argv, "publish-state"), "utf8")),
      previousCodeSha: arg(argv, "previous-code-sha") || null,
      risk: arg(argv, "risk"),
      runId: arg(argv, "run-id"),
      switchedAt: arg(argv, "switched-at"),
    });
    writeFileSync(arg(argv, "out"), JSON.stringify(r, null, 1) + "\n");
    console.log(JSON.stringify(r));
    return 0;
  }
  if (mode === "watch") {
    const ledgerRef = arg(argv, "ledger-ref");
    const gh = githubClient();
    const live = await resolveLive({ app, ledgerRef, gh, allowUnreachable: true });
    const rows = ledgerRows(git(app, ["show", `${ledgerRef}:${LEDGER_PATH}`]));
    const event = live.ok ? live.event : null;
    const observation = event && event.kind === "release" ? observe(event.live_since, await productionHealthRuns(gh, event.live_since)) : null;
    const d = live.ok ? decide({ event, observation, rows, operation: arg(argv, "operation") ?? "watch" }) : { action: "none", reason: live.reason, unresolved: true };
    const result = { ...d, notify: shouldNotify(d, observation), live: { ok: live.ok, sha: live.sha, snapshot: live.snapshot, eligible: live.eligible, reason: live.reason, www_unreachable: live.www_unreachable ?? null }, event, observation };
    console.log(JSON.stringify(result));
    if (arg(argv, "out")) writeFileSync(arg(argv, "out"), JSON.stringify(result, null, 1) + "\n");
    output({ action: d.action, reason: d.reason, risk: event?.risk ?? "", code_sha: event?.code_sha ?? "", notify: result.notify });
    return 0;
  }
  throw new Error(`unknown mode ${JSON.stringify(mode)} (live | content-check | record | watch)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`v11-live-release could not run: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
