import { env } from "cloudflare:workers";
import { ServiceUnavailableError } from "@/lib/db/ops";

/**
 * DB_PUBLIC access helper. Public catalog/SEO projection data only — never
 * RFQ/contact/integration data (01-sources/DATABASE_SCHEMA.md §2.1). Mirrors
 * lib/db/ops.ts's getOpsDb() exactly; reuses the same ServiceUnavailableError
 * class rather than duplicating it.
 *
 * No production DB_PUBLIC resource has been provisioned yet
 * (DOCUMENT_AUDIT_REPORT.md DAR-033) — this binding is currently only
 * simulated in local dev (wrangler.jsonc top-level, placeholder database_id,
 * same bootstrap pattern DB_OPS used before staging existed).
 */
export function getPublicDb(): D1Database {
  const db = (env as CloudflareEnv).DB_PUBLIC;
  if (!db) {
    throw new ServiceUnavailableError("DB_PUBLIC binding is not configured");
  }
  return db;
}
