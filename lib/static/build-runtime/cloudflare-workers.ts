import { createSnapshotD1, openSnapshotDatabase } from "./snapshot-d1.ts";

/**
 * `cloudflare:workers` for the static export build ONLY (aliased by
 * scripts/static/vite.config.static.ts). Public page rendering needs
 * DB_PUBLIC (the snapshot) and plain vars; DB_OPS, Queues and the rate
 * limiter are deliberately absent — no public page may touch them.
 * Inputs come from scripts/static/build.ts via environment variables.
 */
const snapshotFile = process.env.AHANASSA_SNAPSHOT_FILE;
const migrationsDir = process.env.AHANASSA_MIGRATIONS_DIR;
if (!snapshotFile || !migrationsDir) throw new Error("static build runtime: AHANASSA_SNAPSHOT_FILE and AHANASSA_MIGRATIONS_DIR are required");

export const env = {
  DB_PUBLIC: createSnapshotD1(openSnapshotDatabase(snapshotFile, migrationsDir)),
  APP_ENV: process.env.APP_ENV,
  PRICE_STRIP_ENABLED: "false",
  ENABLED_PRICE_PROVIDERS: "",
  HOMEPAGE_RANKING_MODE: "base",
};
