// W17.3 (owner decision 2026-10-14, RELEASE_POLICY.md §21) — a deployment that has waited for the owner's approval for
// 6 h is approved automatically. It replaces only the human wait: every gate inside the run (the release policy gate,
// the v11 guards, smoke, automatic rollback), the canary and the observation are unchanged, and a Reject within the
// 6 h still stops the release.
//
// Every run of auto-approve.yml (every 30 min + on demand):
//   1. lists the workflow runs with status=waiting;
//   2. per run: the jobs of its latest attempt and its pending deployments;
//   3. approves the pending deployments whose wait started ≥ 6 h ago, with the comment COMMENT — only when every
//      completed job of the run succeeded (a skipped job is not a failure: a condition was false). A run with a
//      failed, cancelled or timed-out job is never approved.
// Wait start = the latest of the environment's wait_timer_started_at and the created_at of the run's waiting jobs
// (GitHub creates a job when its `needs` are met, i.e. when its environment wait begins). Unknown → never approved.
// Idempotent: an approved run is no longer "waiting". A run that changed state between the read and the approval
// (the owner approved or rejected it) is reported, not an error.
//
//   node auto-approve.mjs [--dry-run]
// Env: AUTO_APPROVE_TOKEN (the owner's fine-grained PAT: Actions read + Deployments write; the owner must be a
// required reviewer of the environments). Missing → a warning and nothing else (exit 0). GITHUB_REPOSITORY.
// Exit 1 = an approval failed (the job fails, GitHub e-mails the owner); exit 2 = could not run.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const WAIT_MS = 6 * 3_600_000;
export const COMMENT = "auto-approved after 6 h per owner decision";
/** Conclusions of a completed job that do not block an approval. */
export const OK_CONCLUSIONS = new Set(["success", "skipped"]);

const ms = (iso) => (typeof iso === "string" && !Number.isNaN(Date.parse(iso)) ? Date.parse(iso) : null);

function fmtWait(waitMs) {
  const m = Math.floor(waitMs / 60_000);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** When the run's wait for `pending` began (ms), or null when nothing tells. The latest candidate wins: never early. */
export function waitStartedAt(pending, jobs) {
  const candidates = [ms(pending?.wait_timer_started_at), ...jobs.filter((j) => j.status === "waiting").map((j) => ms(j.created_at))].filter((t) => t !== null);
  return candidates.length ? Math.max(...candidates) : null;
}

/**
 * The decision for one waiting run: { approve: [environment ids], decisions: [{ environment, action, reason }] }.
 * action = approve | wait | refuse.
 */
export function decideRun({ run, jobs, pending, now = new Date() }) {
  const t = now.getTime();
  const all = (action, reason) => ({ approve: [], decisions: (pending.length ? pending : [{ environment: { name: "-" } }]).map((p) => ({ environment: p.environment?.name ?? "-", action, reason })) });
  if (run.status !== "waiting") return all("wait", `run is ${run.status}, not waiting`);
  const bad = jobs.filter((j) => j.status === "completed" && !OK_CONCLUSIONS.has(j.conclusion));
  if (bad.length) return all("refuse", `earlier job not successful: ${bad.map((j) => `${j.name} (${j.conclusion})`).join(", ")}`);
  if (!pending.length) return all("wait", "no pending deployment");

  const approve = [];
  const decisions = pending.map((p) => {
    const environment = p.environment?.name ?? "-";
    if (typeof p.environment?.id !== "number") return { environment, action: "refuse", reason: "pending deployment without an environment id" };
    if (p.current_user_can_approve !== true) return { environment, action: "refuse", reason: "the token's user is not a reviewer of this environment" };
    const since = waitStartedAt(p, jobs);
    if (since === null) return { environment, action: "refuse", reason: "wait start unknown" };
    const waited = t - since;
    if (waited < WAIT_MS) return { environment, action: "wait", reason: `waiting ${fmtWait(Math.max(0, waited))} since ${new Date(since).toISOString()} (< 6 h)` };
    approve.push(p.environment.id);
    return { environment, action: "approve", reason: `waiting ${fmtWait(waited)} since ${new Date(since).toISOString()} (≥ 6 h)` };
  });
  return { approve, decisions };
}

// GitHub ----------------------------------------------------------------------------------------------------------

export function githubClient({ token, repo, fetchImpl = fetch }) {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const call = async (method, p, body) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${p}`, {
      method,
      headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${method} ${p.split("?")[0]}`);
    return res.json();
  };
  return { json: (p) => call("GET", p), post: (p, body) => call("POST", p, body) };
}

export async function waitingRuns(gh, maxPages = 3) {
  const runs = [];
  for (let page = 1; page <= maxPages; page++) {
    const { workflow_runs } = await gh.json(`/actions/runs?status=waiting&per_page=100&page=${page}`);
    runs.push(...workflow_runs);
    if (workflow_runs.length < 100) break;
  }
  return runs;
}

// CLI -------------------------------------------------------------------------------------------------------------

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export async function main(argv, { env = process.env, gh = null, now = new Date(), log = console.log, summary = null } = {}) {
  const dryRun = argv.includes("--dry-run");
  const write = summary ?? ((lines) => env.GITHUB_STEP_SUMMARY && appendFileSync(env.GITHUB_STEP_SUMMARY, lines.map((l) => `${l}\n`).join("")));
  const head = [`## Auto-approve (≥ 6 h waiting)${dryRun ? " — dry run" : ""}`, ""];

  if (!gh && !env.AUTO_APPROVE_TOKEN) {
    log("::warning title=auto-approve not configured::secret AUTO_APPROVE_TOKEN is not set; nothing was checked or approved");
    write([...head, "⚠️ secret `AUTO_APPROVE_TOKEN` is not set — nothing was checked or approved."]);
    return 0;
  }
  if (!gh && !env.GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY is not set");
  const api = gh ?? githubClient({ token: env.AUTO_APPROVE_TOKEN, repo: env.GITHUB_REPOSITORY });

  const runs = await waitingRuns(api);
  const rows = [];
  let failed = 0;
  for (const run of runs) {
    const { jobs } = await api.json(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
    const pending = await api.json(`/actions/runs/${run.id}/pending_deployments`);
    const d = decideRun({ run, jobs, pending, now });
    let outcome = "";
    if (d.approve.length && !dryRun) {
      try {
        await api.post(`/actions/runs/${run.id}/pending_deployments`, { environment_ids: d.approve, state: "approved", comment: COMMENT });
        outcome = "approved";
      } catch (error) {
        // Approved or rejected by someone else since the read: not an error.
        const again = await api.json(`/actions/runs/${run.id}`).catch(() => null);
        if (again && again.status !== "waiting") outcome = `not approved: run is now ${again.status} (handled meanwhile)`;
        else {
          failed++;
          outcome = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
          log(`::error title=auto-approve failed::run ${run.id} (${run.name}): ${outcome}`);
        }
      }
    } else if (d.approve.length) outcome = "dry run: would approve";
    for (const x of d.decisions) {
      const result = x.action === "approve" ? outcome : x.action;
      rows.push(`| [${run.id}](${run.html_url ?? ""}) | ${cell(run.name ?? "")} | ${cell(x.environment)} | ${cell(result)} | ${cell(x.reason)} |`);
      log(JSON.stringify({ run_id: run.id, workflow: run.name, environment: x.environment, action: x.action, result, reason: x.reason }));
    }
  }

  write([
    ...head,
    runs.length ? `${runs.length} waiting run(s) at ${now.toISOString()}.` : `No waiting run at ${now.toISOString()}.`,
    ...(rows.length ? ["", "| Run | Workflow | Environment | Decision | Reason |", "|---|---|---|---|---|", ...rows] : []),
    "",
  ]);
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.log(`::error title=auto-approve could not run::${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
