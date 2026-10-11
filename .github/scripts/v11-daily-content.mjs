// W11.2 (owner requirements 2026-10-11) — the production content publish is never silently skipped, and it runs
// whenever Odoo has approved prices newer than the ones live on www.ahanassa.com (a no-op otherwise).
//
// GitHub `schedule` is best-effort and on this repository drops most events (2026-10-11: the 08:00 UTC content
// publish never fired; ops-health fired 2 of 36 scheduled slots between 00:00 and 09:00 UTC). So the publish has
// several independent ways in, all behind one guard:
//   - the Odoo-server timer ahanassa-ops-dispatch (primary): dispatches daily-content.yml at 08:00, 08:20 and 08:40 UTC;
//   - Odoo, right after the owner publishes prices: dispatches daily-content.yml (source=odoo);
//   - daily-content.yml's own GitHub schedules at the same times (backup only);
//   - the watchdog job of ops-health.yml: from 09:00 UTC, newer prices still not live 45 min after they were published
//     → it dispatches daily-content.yml once for those prices (source=watchdog) and ALERTs.
// daily-content.yml never builds anything itself: when needed it dispatches content-publish.yml target=daily-content,
// which builds the code LIVE on www and publishes on CONTENT_REBUILD AUTO only (no approval). A no-op therefore never
// takes content-publish's concurrency slot (a newer pending run would cancel a pending merge run).
//
// The guard ("newer approved prices exist"):
//   Odoo:  the newest published_at_utc among the numeric prices of GET https://odoo.ahanassa.com/api/v1/pricing/current
//          (public; the endpoint the content pipeline itself reads).
//   live:  when the Odoo fetch of the snapshot www serves began — the content_fetched_at of the production publish
//          record of that snapshot (v11-live-release, W11.2); for an older record, the start of its run's
//          "5. Fetch" step (earlier still, so it errs towards publishing).
//   needed = Odoo's newest price was published after that fetch began. A price the pipeline drops cannot make it
//   publish forever (the next fetch starts after it); a price published during a fetch costs at most one extra publish.
//   Live state unknown → needed (fail towards fresh prices; visible in the summary). Odoo unreachable → exit 2.
//
//   node v11-daily-content.mjs status                 needed=true|false (+ odoo_newest, live_fetched_at) to $GITHUB_OUTPUT
//   node v11-daily-content.mjs entry --source <name>  dispatch content-publish.yml target=daily-content when needed
//   node v11-daily-content.mjs watchdog               exit 1 = ALERT
// Exit 2 = could not run (fail closed: nothing is dispatched, the job fails visibly).
// Needs GITHUB_TOKEN (actions: read; actions: write for entry/watchdog) and GITHUB_REPOSITORY.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { collectRecords, githubClient, recordForSnapshot, wwwSnapshot } from "./v11-live-release.mjs";

export const TEHRAN = "Asia/Tehran";
export const CONTENT_WORKFLOW = "content-publish.yml";
export const ENTRY_WORKFLOW = "daily-content.yml";
export const ODOO_PRICING_URL = "https://odoo.ahanassa.com/api/v1/pricing/current";
/** The watchdog's deadline: 09:00 UTC (12:30 Tehran) of the Tehran day. */
export const WATCHDOG_DEADLINE_UTC = "09:00";
/** A publish takes ~15 min: newer prices younger than this are not late yet. */
export const WATCHDOG_GRACE_MS = 45 * 60_000;
/** Environments production-v11-content / staging allow `main` only. */
export const DISPATCH_REF = "main";
/** run-name of a content-publish.yml run with target=daily-content (keep in sync with content-publish.yml). */
export const DAILY_TITLE = /^daily-content \(/;
export const SOURCE = /^[a-z][a-z0-9-]{0,19}$/;
const FETCH_STEP = "5. Fetch";

// Dates -----------------------------------------------------------------------------------------------------------

const tehranDay = new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Tehran. */
export function tehranDate(d) {
  return tehranDay.format(new Date(d));
}

/** The watchdog deadline (ms) of the Tehran day `now` falls in. After 20:30 UTC it is already the next Tehran day. */
export function watchdogDeadline(now) {
  return Date.parse(`${tehranDate(now)}T${WATCHDOG_DEADLINE_UTC}:00Z`);
}

// Decisions (pure) ------------------------------------------------------------------------------------------------

/** Newest published_at_utc among the numeric prices of a pricing/current body (same rule as ops-health W9.4). */
export function newestPublishedPriceAt(body) {
  const data = body?.data;
  if (!Array.isArray(data)) throw new Error("pricing response is not {data: [...]}");
  let newest = null;
  for (const r of data) {
    if (r?.price_on_request !== false || typeof r.published_at_utc !== "string" || Number.isNaN(Date.parse(r.published_at_utc))) continue;
    if (newest === null || Date.parse(r.published_at_utc) > Date.parse(newest)) newest = r.published_at_utc;
  }
  return newest;
}

/** Whether a publish is needed: Odoo has a price published after the live snapshot's fetch began. */
export function decideNeeded({ odooNewest, liveFetchedAt }) {
  if (!odooNewest) return { needed: false, reason: "Odoo has no published numeric price" };
  if (!liveFetchedAt) return { needed: true, reason: `the live snapshot's fetch time is unknown; Odoo's newest price ${odooNewest} — publishing` };
  if (Date.parse(odooNewest) > Date.parse(liveFetchedAt)) return { needed: true, reason: `Odoo has a price published ${odooNewest}, after the live snapshot's fetch began (${liveFetchedAt})` };
  return { needed: false, reason: `www already has Odoo's newest prices (newest ${odooNewest}; live snapshot fetched from ${liveFetchedAt})` };
}

const open = (r) => r.status !== "completed";

/** A daily-content publish of content-publish.yml that has not finished (queued, pending, running, waiting). */
export function dailyInFlight(contentRuns) {
  return contentRuns.find((r) => open(r) && DAILY_TITLE.test(r.display_title ?? "")) ?? null;
}

/**
 * What a daily-content entry run does.
 *   none      not needed, or a daily-content publish is already under way
 *   blocked   another content-publish run is pending: a new run would cancel it (one pending run per concurrency
 *             group), so nothing is dispatched; the next trigger or the watchdog tries again
 *   dispatch  dispatch content-publish.yml target=daily-content
 */
export function decideEntry({ need, contentRuns }) {
  if (!need.needed) return { action: "none", reason: need.reason };
  const inFlight = dailyInFlight(contentRuns);
  if (inFlight) return { action: "none", reason: `${need.reason}; a daily-content publish is already under way: run ${inFlight.id} (${inFlight.status})`, run_id: String(inFlight.id) };
  const pending = contentRuns.find((r) => r.status === "pending");
  if (pending) {
    return { action: "blocked", reason: `${need.reason}; but content-publish run ${pending.id} ("${pending.display_title}") is pending and dispatching now would cancel it — not dispatched (the next trigger or the watchdog tries again)` };
  }
  return { action: "dispatch", reason: need.reason };
}

/**
 * What the watchdog does. Before 09:00 UTC of the Tehran day: nothing (no API call). After it: ALERT while newer
 * prices have been waiting more than WATCHDOG_GRACE_MS, and dispatch daily-content.yml once for those prices — not
 * when the watchdog already dispatched it after they were published, nor while a daily-content entry or publish runs.
 */
export function decideWatchdog({ need, odooNewest, contentRuns = [], entryRuns = [], now }) {
  const deadline = watchdogDeadline(now);
  const t = new Date(now).getTime();
  if (t < deadline) return { state: "before-deadline", alert: false, dispatch: false, reason: `before ${new Date(deadline).toISOString()} (${tehranDate(now)} Tehran)` };
  if (!need.needed) return { state: "live", alert: false, dispatch: false, reason: need.reason };
  const since = odooNewest ? Date.parse(odooNewest) : null;
  if (since !== null && t - since < WATCHDOG_GRACE_MS) return { state: "due", alert: false, dispatch: false, reason: `${need.reason}; within the ${WATCHDOG_GRACE_MS / 60_000} min grace` };
  const dispatched = entryRuns.find((r) => /\(watchdog\)/.test(r.display_title ?? "") && (since === null ? Date.parse(r.created_at) >= deadline : Date.parse(r.created_at) >= since));
  const inFlight = dailyInFlight(contentRuns) ?? entryRuns.find(open) ?? null;
  const late = `newer prices are not live on www: ${need.reason}`;
  if (dispatched) return { state: "late", alert: true, dispatch: false, reason: `${late}; the watchdog already dispatched daily-content for them (run ${dispatched.id}, ${dispatched.status}${dispatched.conclusion ? `/${dispatched.conclusion}` : ""})` };
  if (inFlight) return { state: "late", alert: true, dispatch: false, reason: `${late}; a daily-content run is under way (run ${inFlight.id}, ${inFlight.status})` };
  return { state: "late", alert: true, dispatch: true, reason: `${late}; dispatching daily-content (source=watchdog)` };
}

// Live state ------------------------------------------------------------------------------------------------------

export async function odooNewestPrice(fetchImpl = fetch, url = ODOO_PRICING_URL) {
  const res = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "ahanassa-daily-content/1" }, signal: AbortSignal.timeout(30_000) });
  if (res.status !== 200) throw new Error(`${url} returned HTTP ${res.status}`);
  return newestPublishedPriceAt(await res.json());
}

/**
 * When the Odoo fetch of the snapshot www serves began: content_fetched_at of the publish record that put that
 * snapshot live (rollback records re-serve an older snapshot and are skipped), else that run's fetch step start.
 */
export async function liveFetchedAt(gh, snapshot) {
  const publishing = (rs) => rs.filter((r) => r.kind !== "rollback");
  const records = await collectRecords(gh, { enough: (rs) => Boolean(recordForSnapshot(publishing(rs), snapshot)) });
  const record = recordForSnapshot(publishing(records), snapshot);
  if (!record) return { at: null, source: `no production publish record names the live snapshot ${snapshot}` };
  if (record.content_fetched_at) return { at: record.content_fetched_at, source: `record of run ${record.run_id}` };
  const { jobs } = await gh.json(`/actions/runs/${record.run_id}/jobs?per_page=50`);
  const step = jobs.filter((j) => j.name.startsWith("build")).flatMap((j) => j.steps ?? []).find((s) => s.name.startsWith(FETCH_STEP) && s.started_at);
  if (step) return { at: step.started_at.replace(/\.\d+Z$/, "Z"), source: `fetch step of run ${record.run_id}` };
  return { at: null, source: `run ${record.run_id} has no fetch step` };
}

export async function currentNeed(gh, { fetchImpl = fetch, snapshot = null } = {}) {
  const odooNewest = await odooNewestPrice(fetchImpl);
  const snap = snapshot ?? (await wwwSnapshot(fetchImpl));
  const live = await liveFetchedAt(gh, snap);
  return { odooNewest, snapshot: snap, live, need: decideNeeded({ odooNewest, liveFetchedAt: live.at }) };
}

// GitHub ----------------------------------------------------------------------------------------------------------

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
    const run = (await workflowRuns(gh, workflow, { since: after - 60_000 })).find((r) => open(r) && title.test(r.display_title ?? ""));
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

export async function main(argv, { gh = null, dispatch = null, fetchImpl = fetch, now = new Date(), waitOptions } = {}) {
  const mode = argv[0];
  if (!["status", "entry", "watchdog"].includes(mode)) throw new Error(`unknown mode ${JSON.stringify(mode)} (status | entry | watchdog)`);

  if (mode === "watchdog" && now.getTime() < watchdogDeadline(now)) {
    const d = decideWatchdog({ need: { needed: false }, now });
    console.log(JSON.stringify(d));
    output({ alert: false, state: d.state });
    summary([`- content watchdog: ${d.reason} — nothing to check yet`]);
    return 0;
  }

  const api = gh ?? githubClient();
  const cur = await currentNeed(api, { fetchImpl });
  const facts = `Odoo newest price \`${cur.odooNewest ?? "none"}\`; www \`${cur.snapshot}\` fetched from \`${cur.live.at ?? "unknown"}\` (${cur.live.source})`;

  if (mode === "status") {
    console.log(JSON.stringify(cur));
    output({ needed: cur.need.needed, odoo_newest: cur.odooNewest ?? "", live_fetched_at: cur.live.at ?? "" });
    summary([`- daily content: **${cur.need.needed ? "newer prices — publish" : "no-op"}** — ${cur.need.reason}`, `  - ${facts}`]);
    return 0;
  }

  const contentRuns = await workflowRuns(api, CONTENT_WORKFLOW);
  const send = dispatch ?? githubDispatcher();

  if (mode === "entry") {
    const source = arg(argv, "source") || "manual";
    if (!SOURCE.test(source)) throw new Error(`invalid --source ${JSON.stringify(source)}`);
    const d = decideEntry({ need: cur.need, contentRuns });
    let run = null;
    if (d.action === "dispatch") {
      const at = Date.now();
      await send(CONTENT_WORKFLOW, { target: "daily-content", source });
      run = await waitForRun(api, CONTENT_WORKFLOW, DAILY_TITLE, at, waitOptions);
      if (!run) console.log(`::warning title=daily-content run not listed yet::dispatched ${CONTENT_WORKFLOW}, but the run did not appear within the wait`);
    }
    if (d.action === "blocked") console.log(`::warning title=daily content not dispatched::${d.reason}`);
    console.log(JSON.stringify({ ...d, source, run_id: run?.id ?? d.run_id ?? null, odoo_newest: cur.odooNewest, live: cur.live }));
    output({ action: d.action, run_id: run?.id ?? d.run_id ?? "" });
    summary([`- daily-content (${source}): **${d.action}** — ${d.reason}${run ? ` → content-publish run ${run.id}` : ""}`, `  - ${facts}`]);
    return 0;
  }

  const since = cur.odooNewest ? Math.min(Date.parse(cur.odooNewest), watchdogDeadline(now)) : watchdogDeadline(now);
  const entryRuns = await workflowRuns(api, ENTRY_WORKFLOW, { since: since - 60_000 });
  const d = decideWatchdog({ need: cur.need, odooNewest: cur.odooNewest, contentRuns, entryRuns, now });
  if (d.dispatch) await send(ENTRY_WORKFLOW, { source: "watchdog" });
  console.log(JSON.stringify(d));
  output({ alert: d.alert, state: d.state });
  summary([`- content watchdog: **${d.alert ? "ALERT" : "OK"}** (${d.state}) — ${d.reason}`, `  - ${facts}`]);
  if (d.alert) {
    console.log(`::error title=ALERT: newer prices not published::${d.reason}`);
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
