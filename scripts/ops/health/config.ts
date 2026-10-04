/**
 * Ops health checks (architecture V1.1 §15 + r3 "بند جدید در ۱۵", website W6) — the ONE place
 * for targets and thresholds. Read by run.ts (the scheduled check), replay-cron-gap.ts and the tests.
 *
 * Alerting never depends on what it watches: the checks run in GitHub Actions (ops-health.yml on
 * `main`), read Cloudflare analytics / D1 through the API with a read-only token, and an ALERT fails
 * the job — GitHub e-mails the failed run (docs/OPS_ALERTS.md). No Worker cron is involved.
 */

export type OpsEnv = "staging" | "production";

export interface OpsTarget {
  env: OpsEnv;
  /** false = prepared for W8; run.ts refuses a disabled target. */
  enabled: boolean;
  /** v11 Workers with a cron trigger (cron liveness), and the RFQ Worker (CPU / 1102). */
  cronWorkers: string[];
  rfqWorker: string | null;
  /** The RFQ Worker's custom domain (intake status codes come from zone HTTP analytics by host). */
  apiHost: string | null;
  intakePath: string;
  /** D1 database UUIDs (read-only queries through the D1 REST API). */
  dbOpsId: string | null;
  dbPublicId: string | null;
  /** GitHub workflow files on `main` and the job-name prefix that proves an actual publish. */
  contentPublishWorkflow: string;
  contentPublishJobPrefix: string;
  reconcilerWorkflow: string;
  /** This check's own workflow (the window starts where its previous run started). */
  opsHealthWorkflow: string;
  /** false = a stale content publish is reported (INFO), not alerted — W8.0 production-prep publishes only on dispatch. */
  contentStaleAlert: boolean;
}

export const OPS_TARGETS: Record<OpsEnv, OpsTarget> = {
  staging: {
    env: "staging",
    enabled: true,
    cronWorkers: ["ahanassa-v11-rfq-staging"],
    rfqWorker: "ahanassa-v11-rfq-staging",
    apiHost: "api-staging.ahanassa.com",
    intakePath: "/api/rfqs",
    // workers/rfq/wrangler.jsonc env.staging
    dbOpsId: "938579c2-c28a-4765-a7da-86d9c198072f",
    dbPublicId: "8902191f-3dd6-4714-a785-ac0149657ac3",
    contentPublishWorkflow: "content-publish.yml",
    contentPublishJobPrefix: "publish",
    reconcilerWorkflow: "rfq-ci-reconciler.yml",
    opsHealthWorkflow: "ops-health.yml",
    contentStaleAlert: true,
  },
  // W8.0 production-prep (workers.dev only; workers/rfq/wrangler.jsonc env.production). Read with its own
  // read-only monitor token (GitHub environment production-v11-monitor). W8.1 (cutover) changes:
  //   cronWorkers -> ["ahanassa-v11-rfq-production"] once its */5 cron exists; apiHost -> "api.ahanassa.com"
  //   once the custom domain is attached; contentStaleAlert -> true once the daily production publish runs.
  production: {
    env: "production",
    enabled: true,
    cronWorkers: [],
    rfqWorker: "ahanassa-v11-rfq-production",
    apiHost: null,
    intakePath: "/api/rfqs",
    dbOpsId: "72b8fb96-43c5-45bd-8f1e-b0f2a3a2fa9a",
    dbPublicId: "6e74ff59-9961-40f2-b8e5-8a9619f45776",
    contentPublishWorkflow: "content-publish.yml",
    contentPublishJobPrefix: "publish-production",
    reconcilerWorkflow: "rfq-ci-reconciler.yml",
    opsHealthWorkflow: "ops-health.yml",
    contentStaleAlert: false,
  },
};

export interface Thresholds {
  /** Last scheduled invocation older than this → ALERT "cron silent". */
  cronSilentMinutes: number;
  /** Oldest undelivered (pending/queued/syncing/retry) RFQ older than this → ALERT. */
  rfqUndeliveredMaxAgeMinutes: number;
  /** RFQs in a terminal failure state (manual_review, or failed not closed by an admin) above this → ALERT. */
  rfqTerminalFailureMax: number;
  /** exceededCpu / exceededResources (1102) invocations in the window above this → ALERT (r3). */
  cpuExceededMax: number;
  /** Cron cpuTime above this is reported as WATCH (Free ceiling 10 ms; r3 watch item 10.49 ms). */
  cronCpuWatchMs: number;
  /** 5xx responses on the API host in the window above this → ALERT. */
  intake5xxMax: number;
  /** 400 + 422 responses on POST intake in the window above this → ALERT. */
  intake4xxMax: number;
  /** Last successful content publish older than this → ALERT. */
  contentPublishMaxAgeHours: number;
  /** Odoo GET /api/v1/catalog/meta: abort after, and ALERT above, these. */
  odooTimeoutMs: number;
  odooMaxLatencyMs: number;
  /** INFO only: reported, never fails the job (GitHub does not guarantee schedule times). */
  reconcilerInfoMaxAgeHours: number;
}

export const THRESHOLDS: Thresholds = {
  cronSilentMinutes: 15,
  rfqUndeliveredMaxAgeMinutes: 45,
  rfqTerminalFailureMax: 0,
  cpuExceededMax: 0,
  cronCpuWatchMs: 10,
  intake5xxMax: 0,
  intake4xxMax: 10,
  contentPublishMaxAgeHours: 30,
  odooTimeoutMs: 10_000,
  odooMaxLatencyMs: 10_000,
  reconcilerInfoMaxAgeHours: 3,
};

/**
 * Analytics window: from the previous ops-health run's start minus an overlap (ingestion lag), so no
 * gap opens when GitHub delays or drops scheduled runs; clamped. Cron liveness looks back cronLookback.
 */
export const WINDOW = { minMinutes: 15, maxMinutes: 24 * 60, overlapMinutes: 5, cronLookbackHours: 24 };

export const ODOO_META_URL = "https://odoo.ahanassa.com/api/v1/catalog/meta";

/**
 * STAGING TEST ONLY (Part C alert test): a workflow_dispatch input picks one check and these
 * test thresholds force it to ALERT against real data. Never honoured for production or on schedule.
 */
export const TEST_FORCE = {
  cron: { cronSilentMinutes: -1 },
  rfq: { rfqTerminalFailureMax: -1 },
  cpu: { cpuExceededMax: -1 },
  intake: { intake5xxMax: -1 },
  content: { contentPublishMaxAgeHours: 0 },
  odoo: { odooMaxLatencyMs: 0 },
} satisfies Record<string, Partial<Thresholds>>;

export type ForceKey = keyof typeof TEST_FORCE;

export function thresholdsFor(env: OpsEnv, force: string | undefined, eventName: string | undefined): Thresholds {
  if (!force || force === "none") return { ...THRESHOLDS };
  if (env !== "staging") throw new Error(`test threshold override "${force}" is staging-only`);
  if (eventName === "schedule") throw new Error("test threshold override is ignored on schedule; refusing to run with it");
  if (!(force in TEST_FORCE)) throw new Error(`unknown test override "${force}" (expected one of ${Object.keys(TEST_FORCE).join(", ")})`);
  return { ...THRESHOLDS, ...TEST_FORCE[force as ForceKey] };
}
