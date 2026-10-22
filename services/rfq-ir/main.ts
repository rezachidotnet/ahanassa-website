/**
 * W32 (W29 P2) — the domestic RFQ intake on iransrv, one program with five commands, each run by its own systemd
 * unit (deploy/iran/systemd/ahanassa-rfq*):
 *
 *   rfq-ir.mjs serve    <config>   HTTP intake on loopback (the RFQ Worker's own code, Node bindings); SIGHUP reloads
 *                                  the release's variant index (the activator sends one after each activation)
 *   rfq-ir.mjs forward  <config>   outbox → Odoo over IPv6, files → .ir R2 bucket first; one RFQ at a time, forever
 *   rfq-ir.mjs maintain <config>   daily: PII clear, local file retention, purge 30 days after Odoo confirmed (D-IR-1)
 *   rfq-ir.mjs backup   <config> [--offsite]   hourly age-encrypted DB copy; daily + undelivered files → Arvan S3
 *   rfq-ir.mjs health   <config>   status.json + state-change Bale alerts
 *
 * Built into ONE file by scripts/iran/build-rfq-service.ts (esbuild, migrations embedded) and shipped inside the
 * signed domestic bundle; there is no npm on the server. From source: `node services/rfq-ir/main.ts <cmd> <config>`.
 */
import fs from "node:fs";
import path from "node:path";
import { credential, loadConfig, s3Credential, type IrConfig } from "../../lib/rfq-node/config.ts";
import { intakeEnv, openStores } from "../../lib/rfq-node/env.ts";
import { createIntake, listen } from "../../lib/rfq-node/server.ts";
import { loadVariantIndex } from "../../lib/rfq-node/public-index.ts";
import { forwardOnce, reclaimOnStart, sendNotices } from "../../lib/rfq-node/forwarder.ts";
import { familyFetch } from "../../lib/rfq-node/family-fetch.ts";
import { s3Client } from "../../lib/rfq-node/s3.ts";
import { baleSender } from "../../lib/rfq-node/bale.ts";
import { maintain } from "../../lib/rfq-node/retention.ts";
import { backupHourly, backupOffsite } from "../../lib/rfq-node/backup.ts";
import { alertOnChange, diskFreeRatio, healthStatus } from "../../lib/rfq-node/health.ts";

const log = (event: string, fields: Record<string, unknown> = {}) => console.log(JSON.stringify({ operation: "ir.service", event, ...fields }));
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((r) => { const t = setTimeout(r, ms); signal?.addEventListener("abort", () => (clearTimeout(t), r()), { once: true }); });

function bale(cfg: IrConfig) {
  return cfg.bale ? baleSender({ token: credential("bale-token"), chatId: cfg.bale.chat_id }, familyFetch(4)) : undefined;
}

function reloadIndex(cfg: IrConfig, stores: ReturnType<typeof openStores>): void {
  const file = path.join(cfg.release_dir, "private", "rfq-variant-index.json");
  try {
    const r = loadVariantIndex(stores.pub, file);
    log("variant_index", { version: r.version, rows: r.rows, changed: r.changed, kept: r.kept.length });
  } catch (err) {
    // The previous index stays; a visitor's catalog line then resolves against the last good snapshot.
    log("variant_index_error", { error: err instanceof Error ? err.message : "unknown" });
  }
}

async function serve(cfg: IrConfig): Promise<void> {
  const stores = openStores(cfg.data_dir);
  reloadIndex(cfg, stores);
  const env = intakeEnv(cfg, stores, { adminToken: credential("admin-token"), arcaptchaSecret: credential("arcaptcha-secret") });
  const intake = createIntake({ env, db: stores.ops, publicOrigin: cfg.public_origin });
  const server = await listen(intake, cfg.listen.host, cfg.listen.port);
  log("listening", { env: cfg.env, port: cfg.listen.port, captcha: cfg.captcha.provider, files: cfg.files_enabled });
  process.on("SIGHUP", () => reloadIndex(cfg, stores));
  const stop = () => {
    log("stopping");
    server.close(() => void intake.drain().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 20_000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

async function forward(cfg: IrConfig): Promise<void> {
  const stores = openStores(cfg.data_dir);
  const r2Key = s3Credential("r2-ir");
  const v6 = familyFetch(6);
  const deps = {
    db: stores.ops,
    bucket: stores.bucket,
    r2: cfg.r2 && r2Key ? s3Client({ ...cfg.r2, ...r2Key }, v6) : null,
    odooBaseUrl: cfg.odoo.base_url,
    odooToken: credential("odoo-token"),
    intakeV11: cfg.odoo.intake_v11,
    odooFetch: v6,
    r2WaitMs: cfg.r2_wait_ms,
    filesStorageHint: cfg.files_storage_hint,
    env: cfg.env,
    notify: bale(cfg),
  };
  if (!deps.odooToken) log("no_odoo_token", { note: "every attempt will be 401 → retry + alert" });
  reclaimOnStart(stores.ops, new Date());
  const controller = new AbortController();
  for (const s of ["SIGTERM", "SIGINT"] as const) process.on(s, () => controller.abort());
  const heartbeat = path.join(cfg.data_dir, "forwarder.heartbeat");
  while (!controller.signal.aborted) {
    fs.writeFileSync(heartbeat, new Date().toISOString());
    await sendNotices(deps).catch(() => 0);
    let step;
    try {
      step = await forwardOnce(deps);
    } catch (err) {
      log("forward_error", { errorClass: err instanceof Error ? err.name : "unknown" });
      step = { action: "idle" as const };
    }
    // Busy while anything is due (a deferred RFQ waiting for R2 never blocks the next one: it is not due for a
    // minute); a short sleep only when nothing is due (a new RFQ waits at most 15 s).
    if (step.action === "idle") await sleep(15_000, controller.signal);
  }
  log("stopped");
}

async function main(argv: string[]): Promise<number> {
  const [cmd, configFile, ...rest] = argv;
  if (!cmd || !configFile) {
    console.error("usage: rfq-ir.mjs serve|forward|maintain|backup|health <config.json> [--offsite]");
    return 2;
  }
  const cfg = loadConfig(configFile);
  switch (cmd) {
    case "serve":
      await serve(cfg);
      return -1;
    case "forward":
      await forward(cfg);
      return 0;
    case "maintain": {
      const stores = openStores(cfg.data_dir);
      await maintain(stores.ops, stores.bucket, new Date());
      return 0;
    }
    case "backup": {
      if (!cfg.backup) throw new Error("backup is not configured");
      const stores = openStores(cfg.data_dir);
      const b = { dir: cfg.backup.dir, ageRecipient: cfg.backup.age_recipient };
      if (rest.includes("--offsite")) {
        const key = s3Credential("backup-s3");
        if (!cfg.backup.offsite || !key) throw new Error("offsite backup is not configured (backup.offsite + backup-s3 credential)");
        const r = await backupOffsite(stores.ops, b, stores.bucket.root, s3Client({ ...cfg.backup.offsite, ...key }, familyFetch(4)), cfg.env);
        log("backup_offsite", { uploaded: r.uploaded.length });
      } else {
        const r = await backupHourly(stores.ops, b);
        log("backup", { file: path.basename(r.hourly), daily: Boolean(r.daily) });
      }
      return 0;
    }
    case "health": {
      const stores = openStores(cfg.data_dir);
      const intakeUp = await fetch(`http://${cfg.listen.host === "::1" ? "[::1]" : cfg.listen.host}:${cfg.listen.port}/healthz`, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok, () => false);
      let forwarderAgeMs: number | null = null;
      try {
        forwarderAgeMs = Date.now() - Date.parse(fs.readFileSync(path.join(cfg.data_dir, "forwarder.heartbeat"), "utf8"));
      } catch {}
      const status = healthStatus({ db: stores.ops, now: new Date(), intakeUp, forwarderAgeMs, diskFreeRatio: diskFreeRatio(cfg.data_dir) });
      fs.writeFileSync(path.join(cfg.data_dir, "status.json"), `${JSON.stringify(status, null, 1)}\n`);
      const sent = await alertOnChange(stores.ops, status, cfg.env, bale(cfg));
      log("health", { ok: status.ok, conditions: status.conditions, alerts: sent.length });
      return 0;
    }
    default:
      console.error(`unknown command ${cmd}`);
      return 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code >= 0) process.exit(code);
  },
  (err) => {
    console.error(JSON.stringify({ operation: "ir.service", event: "fatal", error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  },
);
