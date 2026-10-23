import path from "node:path";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";
import type { IrConfig } from "./config.ts";
import { FsBucket } from "./fs-bucket.ts";
import { loadMigrations } from "./migrations.ts";
import { SlidingWindowLimiter } from "./rate-limiter.ts";
import { NodeD1 } from "./sqlite-d1.ts";

/**
 * W32: the RFQ Worker's bindings, built from Node parts (W29 P2 §3.1):
 *
 *   DB_OPS            <data_dir>/ops.sqlite      — migrations/ (D1's) + lib/rfq-node/migrations/ (IR-only)
 *   DB_PUBLIC         <data_dir>/public.sqlite   — migrations_public/, filled from the release's variant index
 *   RFQ_FILES         <data_dir>/files/          — FsBucket
 *   RFQ_RATE_LIMITER  in-process, 20 / 60 s      — SlidingWindowLimiter
 *   no RFQ_QUEUE (QUEUE_FAST_PATH=0), no AI (extract off), delivery only by the forwarder process
 */
export interface OpenedStores {
  ops: NodeD1;
  pub: NodeD1;
  bucket: FsBucket;
}

export function openStores(dataDir: string): OpenedStores {
  const m = loadMigrations();
  return {
    ops: new NodeD1(path.join(dataDir, "ops.sqlite"), [...m.ops, ...m.ir.map((x) => ({ ...x, name: `ir/${x.name}` }))]),
    pub: new NodeD1(path.join(dataDir, "public.sqlite"), m.public),
    bucket: new FsBucket(path.join(dataDir, "files")),
  };
}

export function intakeEnv(cfg: IrConfig, stores: OpenedStores, secrets: { adminToken: string | null; arcaptchaSecret: string | null }): RfqWorkerEnv {
  return {
    DB_OPS: stores.ops.asD1(),
    DB_PUBLIC: stores.pub.asD1(),
    RFQ_RATE_LIMITER: new SlidingWindowLimiter(20, 60_000),
    RFQ_FILES: stores.bucket.asR2(),
    RFQ_FILES_ENABLED: cfg.files_enabled ? "1" : "0",
    APP_ENV: cfg.env,
    ALLOWED_ORIGINS: cfg.allowed_origins.join(","),
    CAPTCHA_PROVIDER: cfg.captcha.provider,
    ARCAPTCHA_SITE_KEY: cfg.captcha.site_key,
    ARCAPTCHA_SECRET_KEY: secrets.arcaptchaSecret ?? undefined,
    ADMIN_TOKEN: secrets.adminToken ?? undefined,
    QUEUE_FAST_PATH: "0",
    DELIVERY_ON_QUEUE: "0",
    DELIVERY_ON_CRON: "0",
    RFQ_EXTRACT_ENABLED: "0",
  };
}
