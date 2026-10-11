// W11.2 (owner requirement 2026-10-11) — the daily production content publish is never silently skipped.
//
// GitHub `schedule` is best-effort and on this repository drops most events (2026-10-11: the 08:00 UTC content
// publish never fired; ops-health fired 2 of 36 scheduled slots between 00:00 and 09:00 UTC). So the daily publish
// has three independent ways in, all behind one guard — "today's (Tehran date) content publish already succeeded":
//   - daily-content.yml schedules 08:00, 08:20, 08:40 UTC (backups of each other);
//   - daily-content.yml dispatched by Odoo right after the owner publishes prices (workflow_dispatch, source=odoo);
//   - the watchdog job of ops-health.yml: at/after 09:00 UTC with no publish today it dispatches daily-content.yml
//     once (source=watchdog) and ALERTs.
// daily-content.yml never builds anything itself: when needed it dispatches content-publish.yml target=daily-content,
// which builds the code LIVE on www and publishes only on CONTENT_REBUILD AUTO (no approval). A no-op therefore never
// takes content-publish's concurrency slot (a newer pending run would cancel a pending merge run).
//
// "Today's content publish succeeded" = a trusted `v11-live-release` record of kind `content` (a finalized production
// publish of the live code: the AUTO job, or a production-prep of the same code) whose live_since is today, Tehran
// date. That also caps AUTO publishes at one per Tehran day.
//
//   node v11-daily-content.mjs status                 published=true|false (+ run_id) to $GITHUB_OUTPUT
//   node v11-daily-content.mjs entry --source <name>  dispatch content-publish.yml target=daily-content when needed
//   node v11-daily-content.mjs watchdog               exit 1 = ALERT (dispatches daily-content.yml at most once a day)
// Exit 2 = could not run (fail closed: nothing is dispatched, the job fails visibly).
// Needs GITHUB_TOKEN (actions: read; actions: write for entry/watchdog) and GITHUB_REPOSITORY.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { RECORD_ARTIFACT, RECORD_FILE, githubClient, recordProblems, trustedRun, unzipEntry } from "./v11-live-release.mjs";

export const TEHRAN = "Asia/Tehran";
export const CONTENT_WORKFLOW = "content-publish.yml";
export const ENTRY_WORKFLOW = "daily-content.yml";
/** The watchdog's deadline: 09:00 UTC (12:30 Tehran) of the Tehran day. */
export const WATCHDOG_DEADLINE_UTC = "09:00";
/** Environments production-v11-content / staging allow `main` only. */
export const DISPATCH_REF = "main";
/** run-name of a content-publish.yml run with target=daily-content (keep in sync with content-publish.yml). */
export const DAILY_TITLE = /^daily-content \(/;
export const SOURCE = /^[a-z][a-z0-9-]{0,19}$/;

// Dates -----------------------------------------------------------------------------------------------------------

const tehranDay = new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN, year: "numeric", month: "2-digit", day: "2-digit" });
const tehranOffset = new Intl.DateTimeFormat("en-US", { timeZone: TEHRAN, timeZoneName: "longOffset" });

/** YYYY-MM-DD in Tehran. */
export function tehranDate(d) {
  return tehranDay.format(new Date(d));
}

/** Minutes east of UTC in Tehran at instant d (+210 since Iran dropped DST in 2022). */
function offsetMinutes(d) {
  const v = tehranOffset.formatToParts(new Date(d)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(v);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** The UTC instant (ms) at which Tehran date `date` begins. */
export function tehranDayStart(date) {
  const noon = Date.parse(`${date}T12:00:00Z`);
  return Date.parse(`${date}T00:00:00Z`) - offsetMinutes(noon) * 60_000;
}

/** The watchdog deadline (ms) of the Tehran day `now` falls in. Late evening UTC is already the next Tehran day. */
export function watchdogDeadline(now) {
  return Date.parse(`${tehranDate(now)}T${WATCHDOG_DEADLINE_UTC}:00Z`);
}

// Decisions (pure) ------------------------------------------------------------------------------------------------

/** The newest content record that went live today (Tehran date of `now`), else null. */
export function todaysContentPublish(records, now) {
  const today = tehranDate(now);
  return (
    records
      .filter((r) => r.kind === "content" && tehranDate(r.live_since) === today)
      .sort((a, b) => (a.live_since < b.live_since ? 1 : -1))[0] ?? null
  );
}

const open = (r) => r.status !== "completed";

/** A daily-content publish of content-publish.yml that has not finished (queued, pending, running, waiting). */
export function dailyInFlight(contentRuns) {
  return contentRuns.find((r) => open(r) && DAILY_TITLE.test(r.display_title ?? "")) ?? null;
}

/**
 * What a daily-content entry run does.
 *   none      published today already, or a daily-content publish is already under way
 *   blocked   another content-publish run is pending: a new run would cancel it (one pending run per concurrency
 *             group), so nothing is dispatched; the next backup schedule or the watchdog tries again
 *   dispatch  dispatch content-publish.yml target=daily-content
 */
export function decideEntry({ published, contentRuns, now }) {
  const date = tehranDate(now);
  if (published) return { action: "none", reason: `today's (${date} Tehran) content publish already succeeded: run ${published.run_id}, live since ${published.live_since}` };
  const inFlight = dailyInFlight(contentRuns);
  if (inFlight) return { action: "none", reason: `a daily-content publish is already under way: run ${inFlight.id} (${inFlight.status})`, run_id: String(inFlight.id) };
  const pending = contentRuns.find((r) => r.status === "pending");
  if (pending) {
    return { action: "blocked", reason: `content-publish run ${pending.id} ("${pending.display_title}") is pending; dispatching now would cancel it — not dispatched (the next backup or the 09:00 UTC watchdog tries again)` };
  }
  return { action: "dispatch", reason: `no content publish has succeeded today (${date} Tehran)` };
}

/**
 * What the watchdog does. Before the deadline: nothing (and no API call is needed). After it, with no content publish
 * today: ALERT on every run until one succeeds, and dispatch daily-content.yml once — not when the watchdog already
 * dispatched it today, nor while a daily-content entry or publish is still running.
 */
export function decideWatchdog({ published, contentRuns = [], entryRuns = [], now }) {
  const deadline = watchdogDeadline(now);
  const date = tehranDate(now);
  if (new Date(now).getTime() < deadline) return { state: "before-deadline", alert: false, dispatch: false, reason: `before ${new Date(deadline).toISOString()} (${date} Tehran)` };
  if (published) return { state: "published", alert: false, dispatch: false, reason: `today's (${date} Tehran) content publish succeeded: run ${published.run_id}, live since ${published.live_since}` };
  const dispatched = entryRuns.find((r) => /\(watchdog\)/.test(r.display_title ?? "") && Date.parse(r.created_at) >= deadline);
  const inFlight = dailyInFlight(contentRuns) ?? entryRuns.find(open) ?? null;
  const missing = `no content publish has succeeded today (${date} Tehran) by ${WATCHDOG_DEADLINE_UTC} UTC`;
  if (dispatched) return { state: "missing", alert: true, dispatch: false, reason: `${missing}; the watchdog already dispatched daily-content today (run ${dispatched.id}, ${dispatched.status}${dispatched.conclusion ? `/${dispatched.conclusion}` : ""})` };
  if (inFlight) return { state: "missing", alert: true, dispatch: false, reason: `${missing}; a daily-content run is still under way (run ${inFlight.id}, ${inFlight.status})` };
  return { state: "missing", alert: true, dispatch: true, reason: `${missing}; dispatching daily-content (source=watchdog)` };
}

// GitHub ----------------------------------------------------------------------------------------------------------

/** Trusted content records whose artifact was created on or after `since` (ms). */
export async function recordsSince(gh, since) {
  const out = [];
  const cache = new Map();
  for (let page = 1; page <= 3; page++) {
    const { artifacts } = await gh.json(`/actions/artifacts?name=${RECORD_ARTIFACT}&per_page=100&page=${page}`);
    for (const a of artifacts) {
      if (a.expired || a.name !== RECORD_ARTIFACT || Date.parse(a.created_at) < since) continue;
      const runId = String(a.workflow_run?.id ?? "");
      if (!(await trustedRun(gh, runId, cache))) continue;
      const text = unzipEntry(await gh.download(a.id), RECORD_FILE);
      if (!text) continue;
      const r = JSON.parse(text);
      if (recordProblems(r).length || r.run_id !== runId) continue;
      out.push(r);
    }
    // Newest first: stop once a page reaches back before `since`.
    if (artifacts.length < 100 || artifacts.some((a) => Date.parse(a.created_at) < since)) break;
  }
  return out;
}

export async function todaysPublish(gh, now) {
  // An artifact is uploaded after its record's live_since, so none of today's records is older than the day start
  // (an hour of margin); the date filter itself is on live_since.
  return todaysContentPublish(await recordsSince(gh, tehranDayStart(tehranDate(now)) - 3_600_000), now);
}

export async function workflowRuns(gh, workflow, { since = null, perPage = 30 } = {}) {
  const created = since === null ? "" : `&created=%3E%3D${new Date(since).toISOString().replace(/\.\d+Z$/, "Z")}`;
  const { workflow_runs } = await gh.json(`/actions/workflows/${workflow}/runs?per_page=${perPage}${created}`);
  return workflow_runs
    .filter((r) => r.head_branch === DISPATCH_REF)
    .map((r) => ({ id: r.id, status: r.status, conclusion: r.conclusion, display_title: r.display_title, created_at: r.created_at, event: r.event }));
}

export function githubDispatcher({ token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY, fetchImpl = fetch } = {}) {
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  return async (workflow, inputs) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: DISPATCH_REF, inputs }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`GitHub API ${res.status} dispatching ${workflow}`);
  };
}

/** The dispatch API returns before the run exists: wait (up to ~60 s) until it is listed, so the next caller sees it. */
async function waitForRun(gh, workflow, title, after, { tries = 12, delayMs = 5_000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const run = (await workflowRuns(gh, workflow, { since: after - 60_000 })).find((r) => title.test(r.display_title ?? ""));
    if (run) return run;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

// CLI -------------------------------------------------------------------------------------------------------------

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
function output(values) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${String(v ?? "").replace(/\n/g, " ")}\n`).join(""));
}
function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.map((l) => `${l}\n`).join(""));
}

export async function main(argv, { gh = null, dispatch = null, now = new Date(), waitOptions } = {}) {
  const mode = argv[0];
  if (!["status", "entry", "watchdog"].includes(mode)) throw new Error(`unknown mode ${JSON.stringify(mode)} (status | entry | watchdog)`);
  const date = tehranDate(now);

  if (mode === "watchdog" && now.getTime() < watchdogDeadline(now)) {
    const d = decideWatchdog({ published: null, now });
    console.log(JSON.stringify(d));
    output({ alert: false, state: d.state });
    summary([`- daily-content watchdog: ${d.reason} — nothing to check yet`]);
    return 0;
  }

  const api = gh ?? githubClient();
  const published = await todaysPublish(api, now);

  if (mode === "status") {
    console.log(JSON.stringify({ date, published }));
    output({ published: Boolean(published), run_id: published?.run_id ?? "" });
    summary([published ? `- daily content: today's (${date} Tehran) publish already succeeded (run ${published.run_id}, live since ${published.live_since}) — **no-op**` : `- daily content: no content publish yet today (${date} Tehran)`]);
    return 0;
  }

  const contentRuns = await workflowRuns(api, CONTENT_WORKFLOW);
  const send = dispatch ?? githubDispatcher();

  if (mode === "entry") {
    const source = arg(argv, "source") || "manual";
    if (!SOURCE.test(source)) throw new Error(`invalid --source ${JSON.stringify(source)}`);
    const d = decideEntry({ published, contentRuns, now });
    let run = null;
    if (d.action === "dispatch") {
      const at = Date.now();
      await send(CONTENT_WORKFLOW, { target: "daily-content", source });
      run = await waitForRun(api, CONTENT_WORKFLOW, DAILY_TITLE, at, waitOptions);
      if (!run) console.log(`::warning title=daily-content run not listed yet::dispatched ${CONTENT_WORKFLOW}, but the run did not appear within the wait`);
    }
    if (d.action === "blocked") console.log(`::warning title=daily content not dispatched::${d.reason}`);
    console.log(JSON.stringify({ ...d, source, run_id: run?.id ?? d.run_id ?? null }));
    output({ action: d.action, run_id: run?.id ?? d.run_id ?? "" });
    summary([`- daily-content (${source}): **${d.action}** — ${d.reason}${run ? ` → content-publish run ${run.id}` : ""}`]);
    return 0;
  }

  const entryRuns = await workflowRuns(api, ENTRY_WORKFLOW, { since: tehranDayStart(date) });
  const d = decideWatchdog({ published, contentRuns, entryRuns, now });
  if (d.dispatch) await send(ENTRY_WORKFLOW, { source: "watchdog" });
  console.log(JSON.stringify(d));
  output({ alert: d.alert, state: d.state });
  summary([`- daily-content watchdog: **${d.alert ? "ALERT" : "OK"}** — ${d.reason}`]);
  if (d.alert) {
    console.log(`::error title=ALERT: daily content publish missing::${d.reason}`);
    return 1;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.log(`::error title=daily-content check could not run::${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
