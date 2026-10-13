/**
 * Standalone RFQ Worker environment (architecture V1.1 §4.3, §6). Bindings
 * and vars come from workers/rfq/wrangler.jsonc; secrets via `wrangler secret`.
 * Nothing here imports vinext/Next.
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface RfqWorkerEnv {
  DB_OPS: D1Database;
  /** Read-only use: rfq_variant_index + publication_pointer (A8). */
  DB_PUBLIC: D1Database;
  RFQ_QUEUE?: Queue;
  RFQ_RATE_LIMITER?: RateLimiter;
  APP_ENV?: string;
  /** Comma-separated exact origins allowed to POST /api/rfqs (CORS). */
  ALLOWED_ORIGINS?: string;
  /** Comma-separated hostnames Turnstile Siteverify must report (the static site's host). */
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  TURNSTILE_SECRET_KEY?: string;
  ODOO_BASE_URL?: string;
  ODOO_RFQ_API_TOKEN?: string;
  /** "1" = send received_at + website_reference (rfq_intake v1.1). Default off. */
  ODOO_INTAKE_V11?: string;
  /** "1" = the Queue consumer delivers (architecture §4.3 budget permitting). */
  DELIVERY_ON_QUEUE?: string;
  /** "1" = the cron reconciler delivers directly when no Queue is used. */
  DELIVERY_ON_CRON?: string;
  /** "0" disables the post-commit Queue send (reconciler-only mode). */
  QUEUE_FAST_PATH?: string;
  /** Bearer for /__admin/* (§15 manual-review tool); a separate secret per environment. */
  ADMIN_TOKEN?: string;
  /** "1" enables the test routes — which exist only in the staging entry (index.staging.ts). */
  TEST_HOOKS?: string;
  /** "1" = Turnstile test path (staging entry only; measurement windows). */
  TURNSTILE_TEST_MODE?: string;
  /** D-RFQ-FILE: PRIVATE R2 bucket for RFQ files (no public access, no custom domain). */
  RFQ_FILES?: R2Bucket;
  /** "1" = the form offers file upload and the Worker accepts files. Needs RFQ_FILES too. */
  RFQ_FILES_ENABLED?: string;
}

/** File upload is on only with BOTH the bucket binding and the flag (docs/RFQ_FILE_UPLOAD.md). */
export const filesEnabled = (env: RfqWorkerEnv): env is RfqWorkerEnv & { RFQ_FILES: R2Bucket } => Boolean(env.RFQ_FILES) && env.RFQ_FILES_ENABLED === "1";

export const csv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const flag = (value: string | undefined): boolean => value === "1";
