import { env } from "cloudflare:workers";

/**
 * DB_OPS access helper. Operational data only (RFQs, contacts, integration
 * reliability tables) — never public page bodies (01-sources/DATABASE_SCHEMA.md
 * §2.1). Uses the vinext-documented `cloudflare:workers` binding-access
 * pattern; no custom worker entry is required for this (only the Queue
 * consumer needs one — see workers/entry.ts).
 */
export function getOpsDb(): D1Database {
  const db = (env as CloudflareEnv).DB_OPS;
  if (!db) {
    throw new ServiceUnavailableError("DB_OPS binding is not configured");
  }
  return db;
}

/** Thrown when a required Cloudflare binding/integration is not configured in the current environment. */
export class ServiceUnavailableError extends Error {}
