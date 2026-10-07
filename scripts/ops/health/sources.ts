/**
 * Read-only data sources for the ops health checks (W6). Plain `fetch`, no dependencies, so the
 * workflow needs no `npm ci`. Every call is a read:
 *   - Cloudflare GraphQL Analytics (token: Account › Account Analytics › Read)
 *   - D1 REST `query` with a single SELECT (token: Account › D1 › Read)
 *   - GitHub REST (GITHUB_TOKEN, `actions: read`)
 *   - Odoo GET /api/v1/catalog/meta (no credentials)
 * Errors carry API messages only — never a token or a response body with data.
 */
import type { HttpGroup, InvocationGroup, OdooProbe, ScheduledRun } from "./checks.ts";

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

async function gh<T>(auth: GitHubAuth, path: string): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${auth.repo}${path}`, {
    headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

interface Run {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  run_started_at: string;
  created_at: string;
}

/** Start of this workflow's previous run (any outcome but cancelled/skipped), excluding the current run. */
export async function previousRunStart(auth: GitHubAuth, workflow: string, currentRunId: string | undefined): Promise<string | null> {
  const { workflow_runs } = await gh<{ workflow_runs: Run[] }>(auth, `/actions/workflows/${workflow}/runs?per_page=10`);
  const prev = workflow_runs.find((r) => String(r.id) !== currentRunId && r.status === "completed" && r.conclusion !== "cancelled" && r.conclusion !== "skipped");
  return prev?.run_started_at ?? null;
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
export async function lastSuccessfulPublish(auth: GitHubAuth, workflow: string, jobPrefix: string, proofStep: string): Promise<string | null> {
  // completed, not only success: a run whose publish finalized but a later step (evidence upload) failed still published.
  const { workflow_runs } = await gh<{ workflow_runs: Run[] }>(auth, `/actions/workflows/${workflow}/runs?status=completed&per_page=30`);
  for (const run of workflow_runs) {
    const { jobs } = await gh<{ jobs: Job[] }>(auth, `/actions/runs/${run.id}/jobs?per_page=50`);
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
