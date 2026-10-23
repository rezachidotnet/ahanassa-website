/**
 * Read-only data sources for the ops health checks (W6). Plain `fetch`, no dependencies, so the
 * workflow needs no `npm ci`. Every call is a read:
 *   - Cloudflare GraphQL Analytics (token: Account › Account Analytics › Read)
 *   - D1 REST `query` with a single SELECT (token: Account › D1 › Read)
 *   - GitHub REST (GITHUB_TOKEN, `actions: read`; W17.3: `checks: read` for the previous job's annotations)
 *   - Odoo GET /api/v1/catalog/meta and (W9.4, when enabled) GET /api/v1/pricing/current (no credentials)
 * Errors carry API messages only — never a token or a response body with data.
 */
import { newestPublishedPriceAt, type HttpGroup, type InvocationGroup, type OdooProbe, type ScheduledRun } from "./checks.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

export interface CloudflareAuth {
  token: string;
  accountId: string;
}

async function cfJson(url: string, auth: CloudflareAuth, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => null)) as { errors?: { message?: string; code?: number }[] | null; success?: boolean } | null;
  const errors = json?.errors?.filter(Boolean) ?? [];
  if (!res.ok || errors.length) {
    throw new Error(`Cloudflare API ${res.status}: ${errors.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ") || "no error detail"}`);
  }
  return json;
}

export async function graphql<T>(auth: CloudflareAuth, query: string, variables: Record<string, unknown>): Promise<T> {
  const json = (await cfJson(`${CF_API}/graphql`, auth, { query, variables: { accountTag: auth.accountId, ...variables } })) as { data: T };
  return json.data;
}

/** One read-only SELECT; anything else is refused before it leaves the runner. */
export async function d1Select(auth: CloudflareAuth, databaseId: string, sql: string): Promise<Record<string, unknown>[]> {
  if (!/^\s*SELECT\b/i.test(sql) || sql.includes(";")) throw new Error("d1Select accepts a single SELECT only");
  const json = (await cfJson(`${CF_API}/accounts/${auth.accountId}/d1/database/${databaseId}/query`, auth, { sql })) as { result: { results: Record<string, unknown>[] }[] };
  return json.result[0]?.results ?? [];
}

// Workers analytics ------------------------------------------------------------------------------

type Accounts<T> = { viewer: { accounts: T[] } };

/** Most recent scheduled invocation of `script` in [from, to). */
export async function lastScheduledRun(auth: CloudflareAuth, script: string, from: Date, to: Date): Promise<string | null> {
  const data = await graphql<Accounts<{ runs: { datetime: string }[] }>>(
    auth,
    `query($accountTag:String!,$script:String!,$from:Time!,$to:Time!){ viewer{ accounts(filter:{accountTag:$accountTag}){
      runs: workersInvocationsScheduled(limit:1, orderBy:[datetime_DESC], filter:{scriptName:$script, datetime_geq:$from, datetime_lt:$to}){ datetime }
    }}}`,
    { script, from: from.toISOString(), to: to.toISOString() },
  );
  return data.viewer.accounts[0]?.runs[0]?.datetime ?? null;
}

/**
 * W28: whether `workersInvocationsScheduled` holds any row for the whole account in [from, to). False = the dataset
 * itself is empty (on 2026-10-20 it went empty account-wide at 19:40:11Z while the crons kept running).
 */
export async function scheduledAnalyticsHasRows(auth: CloudflareAuth, from: Date, to: Date): Promise<boolean> {
  const data = await graphql<Accounts<{ runs: { datetime: string }[] }>>(
    auth,
    `query($accountTag:String!,$from:Time!,$to:Time!){ viewer{ accounts(filter:{accountTag:$accountTag}){
      runs: workersInvocationsScheduled(limit:1, filter:{datetime_geq:$from, datetime_lt:$to}){ datetime }
    }}}`,
    { from: from.toISOString(), to: to.toISOString() },
  );
  return (data.viewer.accounts[0]?.runs.length ?? 0) > 0;
}

/**
 * W28: start of the newest 5-minute bucket with an invocation of `script` of any kind (cron, HTTP, queue) in
 * [from, to), from `workersInvocationsAdaptive` — the second source when the scheduled dataset is empty.
 */
export async function lastInvocationBucket(auth: CloudflareAuth, script: string, from: Date, to: Date): Promise<string | null> {
  const data = await graphql<Accounts<{ inv: { dimensions: { datetimeFiveMinutes: string }; sum: { requests: number } }[] }>>(
    auth,
    `query($accountTag:String!,$script:String!,$from:Time!,$to:Time!){ viewer{ accounts(filter:{accountTag:$accountTag}){
      inv: workersInvocationsAdaptive(limit:1, orderBy:[datetimeFiveMinutes_DESC], filter:{scriptName:$script, datetime_geq:$from, datetime_lt:$to}){
        dimensions{ datetimeFiveMinutes } sum{ requests } }
    }}}`,
    { script, from: from.toISOString(), to: to.toISOString() },
  );
  const newest = data.viewer.accounts[0]?.inv[0];
  return newest && newest.sum.requests > 0 ? newest.dimensions.datetimeFiveMinutes : null;
}

export async function workerCpu(auth: CloudflareAuth, script: string, from: Date, to: Date): Promise<{ groups: InvocationGroup[]; scheduled: ScheduledRun[] }> {
  const data = await graphql<
    Accounts<{
      inv: { dimensions: { status: string }; sum: { requests: number }; quantiles: { cpuTimeP99: number }; max: { cpuTime: number } }[];
      sch: ScheduledRun[];
    }>
  >(
    auth,
    `query($accountTag:String!,$script:String!,$from:Time!,$to:Time!){ viewer{ accounts(filter:{accountTag:$accountTag}){
      inv: workersInvocationsAdaptive(limit:100, filter:{scriptName:$script, datetime_geq:$from, datetime_lt:$to}){
        dimensions{ status } sum{ requests } quantiles{ cpuTimeP99 } max{ cpuTime } }
      sch: workersInvocationsScheduled(limit:1000, orderBy:[datetime_ASC], filter:{scriptName:$script, datetime_geq:$from, datetime_lt:$to}){
        datetime status cpuTimeUs }
    }}}`,
    { script, from: from.toISOString(), to: to.toISOString() },
  );
  const a = data.viewer.accounts[0];
  return {
    groups: (a?.inv ?? []).map((g) => ({ status: g.dimensions.status, requests: g.sum.requests, cpuTimeP99Us: g.quantiles.cpuTimeP99, cpuTimeMaxUs: g.max.cpuTime })),
    scheduled: a?.sch ?? [],
  };
}

/** Edge HTTP responses for one hostname (account-scoped adaptive HTTP analytics). */
export async function httpByHost(auth: CloudflareAuth, host: string, from: Date, to: Date): Promise<HttpGroup[]> {
  const data = await graphql<Accounts<{ http: { count: number; dimensions: { edgeResponseStatus: number; clientRequestPath: string; clientRequestHTTPMethodName: string } }[] }>>(
    auth,
    `query($accountTag:String!,$host:String!,$from:Time!,$to:Time!){ viewer{ accounts(filter:{accountTag:$accountTag}){
      http: httpRequestsAdaptiveGroups(limit:1000, filter:{clientRequestHTTPHost:$host, datetime_geq:$from, datetime_lt:$to}){
        count dimensions{ edgeResponseStatus clientRequestPath clientRequestHTTPMethodName } }
    }}}`,
    { host, from: from.toISOString(), to: to.toISOString() },
  );
  return (data.viewer.accounts[0]?.http ?? []).map((g) => ({
    status: g.dimensions.edgeResponseStatus,
    path: g.dimensions.clientRequestPath,
    method: g.dimensions.clientRequestHTTPMethodName,
    count: g.count,
  }));
}

// GitHub -----------------------------------------------------------------------------------------

export interface GitHubAuth {
  token: string;
  repo: string;
}

/**
 * W37: a GitHub API failure. `transient` = worth retrying and may be bridged by another source: a 5xx, a 429, a
 * timeout or a network error. A 4xx (bad token, missing workflow) is a configuration error and never transient.
 */
export class GitHubApiError extends Error {
  readonly transient: boolean;
  constructor(message: string, transient: boolean) {
    super(message);
    this.name = "GitHubApiError";
    this.transient = transient;
  }
}

export function isTransientGitHubError(error: unknown): boolean {
  return error instanceof GitHubApiError && error.transient;
}

/** W37 (after run 39918757832, "GitHub API 502"): 3 retries after the first try, with these waits (backoff). */
export const GITHUB_RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;

export interface GitHubDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  delaysMs: readonly number[];
}

const defaultGitHubDeps: GitHubDeps = { fetch: (...a) => fetch(...a), sleep: (ms) => new Promise((r) => setTimeout(r, ms)), delaysMs: GITHUB_RETRY_DELAYS_MS };

/** One GET of the GitHub REST API; a transient failure is retried `delaysMs.length` times, then thrown. */
export async function ghRequest<T>(auth: GitHubAuth, path: string, deps: GitHubDeps = defaultGitHubDeps): Promise<T> {
  const where = path.split("?")[0];
  for (let attempt = 0; ; attempt++) {
    let error: GitHubApiError;
    try {
      const res = await deps.fetch(`https://api.github.com/repos/${auth.repo}${path}`, {
        headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return (await res.json()) as T;
      error = new GitHubApiError(`GitHub API ${res.status} for ${where}`, res.status >= 500 || res.status === 429);
    } catch (e) {
      // fetch throws only for a timeout, an abort or a network failure: all transient.
      const name = e instanceof Error ? e.name : "Error";
      error = new GitHubApiError(`GitHub API ${name === "TimeoutError" ? "timeout" : `network error (${name})`} for ${where}`, true);
    }
    if (!error.transient || attempt >= deps.delaysMs.length) {
      if (attempt > 0) error.message += ` (after ${attempt + 1} attempts)`;
      throw error;
    }
    await deps.sleep(deps.delaysMs[attempt]);
  }
}

async function gh<T>(auth: GitHubAuth, path: string): Promise<T> {
  return ghRequest<T>(auth, path);
}

interface Run {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  run_started_at: string;
  created_at: string;
}

interface RunJob {
  id?: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
}

/**
 * Start of the previous run of THIS target's job (`jobName`) that completed with success or failure, excluding the
 * current run; null when there is none since `notBefore` (the caller then checks the full maximum window).
 *
 * W9.7 fix (W9.1c finding): the old lookup read only the last 10 runs of the workflow and skipped every run that
 * was not "completed" — 10 runs cancelled or held behind a stuck staging job collapsed the window to 15 min, and
 * hours of analytics were never evaluated. Now: newest first, page by page back to `notBefore`; a successful run
 * counts as is; any other run is read job by job (per-job concurrency: this job can finish while the other job of
 * the same run is still waiting, or was cancelled).
 */
export async function previousJobStart(auth: GitHubAuth, workflow: string, jobName: string, currentRunId: string | undefined, notBefore: Date, maxPages = 10): Promise<string | null> {
  return (await findPreviousJob(auth, workflow, jobName, currentRunId, notBefore, maxPages, false))?.startedAt ?? null;
}

/**
 * W17.3: the same previous job as previousJobStart, plus its job id (= its check run id), so a check can read what
 * that job reported (its annotations). Ops health keeps no state of its own: the previous completed run is the state.
 * jobId is null only when a successful run does not list the job.
 */
export async function previousJob(
  auth: GitHubAuth,
  workflow: string,
  jobName: string,
  currentRunId: string | undefined,
  notBefore: Date,
  maxPages = 10,
): Promise<{ startedAt: string; jobId: number | null } | null> {
  return findPreviousJob(auth, workflow, jobName, currentRunId, notBefore, maxPages, true);
}

async function findPreviousJob(
  auth: GitHubAuth,
  workflow: string,
  jobName: string,
  currentRunId: string | undefined,
  notBefore: Date,
  maxPages: number,
  needJobId: boolean,
): Promise<{ startedAt: string; jobId: number | null } | null> {
  for (let page = 1; page <= maxPages; page++) {
    const { workflow_runs } = await gh<{ workflow_runs: Run[] }>(auth, `/actions/workflows/${workflow}/runs?per_page=100&page=${page}`);
    for (const r of workflow_runs) {
      if (String(r.id) === currentRunId) continue;
      if (Date.parse(r.run_started_at) < notBefore.getTime()) return null;
      const success = r.status === "completed" && r.conclusion === "success";
      if (success && !needJobId) return { startedAt: r.run_started_at, jobId: null };
      const { jobs } = await gh<{ jobs: RunJob[] }>(auth, `/actions/runs/${r.id}/jobs?per_page=20`);
      const job = jobs.find((j) => j.name === jobName);
      if (success) return { startedAt: r.run_started_at, jobId: job?.id ?? null };
      if (job?.status === "completed" && (job.conclusion === "success" || job.conclusion === "failure") && job.started_at) return { startedAt: job.started_at, jobId: job.id ?? null };
    }
    if (workflow_runs.length < 100) return null;
  }
  return null;
}

export interface Annotation {
  annotation_level: string;
  title: string | null;
  message: string;
}

/** W17.3: the annotations a job reported (its check run's). Needs `checks: read`. */
export async function jobAnnotations(auth: GitHubAuth, jobId: number): Promise<Annotation[]> {
  return gh<Annotation[]>(auth, `/check-runs/${jobId}/annotations?per_page=100`);
}

export interface JobStep {
  name: string;
  conclusion: string | null;
  completed_at?: string | null;
}

export interface Job {
  name: string;
  conclusion: string | null;
  completed_at: string | null;
  steps?: JobStep[];
}

/**
 * W9.1: when a job of this run ACTUALLY published, the completion time of its proof step; otherwise null.
 * "Actually published" = a job whose name starts with jobPrefix and whose proof step (e.g. "12. Finalize")
 * concluded "success". The job's own conclusion is not enough: the scheduled production job ends "success"
 * when CONTENT_REBUILD is REFUSED or APPROVAL_REQUIRED, with every publish step skipped. A dry run (publish job
 * skipped) never counts.
 */
export function publishedAt(jobs: readonly Job[], jobPrefix: string, proofStep: string): string | null {
  let latest: string | null = null;
  for (const j of jobs) {
    if (!j.name.startsWith(jobPrefix)) continue;
    const step = (j.steps ?? []).find((s) => s.name.startsWith(proofStep) && s.conclusion === "success");
    const at = step ? (step.completed_at ?? j.completed_at) : null;
    if (at && (latest === null || at > latest)) latest = at;
  }
  return latest;
}

/** Completion time of the newest actual publish (publishedAt) among the workflow's recent completed runs. */
export async function lastSuccessfulPublish(auth: GitHubAuth, workflow: string, jobPrefix: string, proofStep: string, deps?: GitHubDeps): Promise<string | null> {
  // completed, not only success: a run whose publish finalized but a later step (evidence upload) failed still published.
  const { workflow_runs } = await ghRequest<{ workflow_runs: Run[] }>(auth, `/actions/workflows/${workflow}/runs?status=completed&per_page=30`, deps);
  for (const run of workflow_runs) {
    const { jobs } = await ghRequest<{ jobs: Job[] }>(auth, `/actions/runs/${run.id}/jobs?per_page=50`, deps);
    const at = publishedAt(jobs, jobPrefix, proofStep);
    if (at) return at;
  }
  return null;
}

export async function lastRunStart(auth: GitHubAuth, workflow: string): Promise<string | null> {
  const { workflow_runs } = await gh<{ workflow_runs: Run[] }>(auth, `/actions/workflows/${workflow}/runs?per_page=1`);
  return workflow_runs[0]?.run_started_at ?? null;
}

// Odoo -------------------------------------------------------------------------------------------

/** GET only; the body is discarded unread beyond what fetch buffers. */
export async function probeOdoo(url: string, timeoutMs: number): Promise<OdooProbe> {
  const started = performance.now();
  try {
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json", "User-Agent": "ahanassa-ops-health/1" }, signal: AbortSignal.timeout(timeoutMs) });
    await res.arrayBuffer();
    return { httpStatus: res.status, latencyMs: performance.now() - started };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    return { httpStatus: null, latencyMs: performance.now() - started, error: name === "TimeoutError" ? `timeout ${timeoutMs} ms` : name };
  }
}

/** W9.4: newest published_at_utc of the current published prices (GET only; any non-200 is an error). */
export async function newestPublishedPrice(url: string, timeoutMs: number): Promise<string | null> {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json", "User-Agent": "ahanassa-ops-health/1" }, signal: AbortSignal.timeout(timeoutMs) });
  if (res.status !== 200) {
    await res.arrayBuffer().catch(() => undefined);
    throw new Error(`GET /api/v1/pricing/current returned HTTP ${res.status}`);
  }
  return newestPublishedPriceAt(await res.json());
}
