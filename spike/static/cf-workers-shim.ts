/**
 * Spike S1 — replaces the `cloudflare:workers` module for the Node-only
 * static-export build (vite.config.ts aliases it here when
 * SPIKE_STATIC_EXPORT=1). Exposes only what public page rendering reads:
 * DB_PUBLIC (fixture-backed) and the plain vars. DB_OPS / Queue / rate
 * limiter are deliberately absent — no public page may touch them.
 */
import { createFixtureD1 } from "./fixture-d1";

export const env = {
  DB_PUBLIC: createFixtureD1(),
  APP_ENV: process.env.APP_ENV ?? "staging",
  PRICE_STRIP_ENABLED: "false",
  ENABLED_PRICE_PROVIDERS: "",
  HOMEPAGE_RANKING_MODE: "base",
};
