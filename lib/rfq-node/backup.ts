import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { backup as sqliteBackup } from "node:sqlite";
import { createHash } from "node:crypto";
import type { NodeD1 } from "./sqlite-d1.ts";
import type { S3Client } from "./s3.ts";

/**
 * W32 (D-IR-9): backups of the domestic buffer, encrypted with `age` to the OWNER's public key (the private key
 * never touches the server), so a backup file is useless to whoever holds the disk or the bucket.
 *
 *   hourly  `rfq-ir.mjs backup`        consistent online copy (node:sqlite backup API) → age → <dir>/hourly/
 *                                      (24 kept); the first copy of each UTC day is also kept in <dir>/daily/ (7 kept)
 *   daily   `rfq-ir.mjs backup --offsite`   + that day's copy and a tar of the files of UNDELIVERED RFQs only
 *                                      (delivered ones are already in R2/Odoo) → Arvan Object Storage (domestic,
 *                                      reachable during a cutoff; IPv4)
 *
 * The plaintext copy exists only in a 0700 work dir for the seconds `age` needs, then is removed. A missing `age` or
 * recipient is an error, never an unencrypted backup.
 */
export interface BackupConfig {
  dir: string;
  ageRecipient: string;
  ageBinary?: string;
  keepHourly?: number;
  keepDaily?: number;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").slice(0, 13); // YYYYMMDDTHH

function encrypt(cfg: BackupConfig, input: string, output: string): void {
  if (!/^age1[0-9a-z]{20,}$/.test(cfg.ageRecipient)) throw new Error("backup: age recipient missing or not an age1… public key");
  execFileSync(cfg.ageBinary ?? "age", ["-r", cfg.ageRecipient, "-o", `${output}.part`, input], { stdio: ["ignore", "ignore", "pipe"] });
  fs.chmodSync(`${output}.part`, 0o600);
  fs.renameSync(`${output}.part`, output);
}

function prune(dir: string, keep: number): void {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".age")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.rmSync(path.join(dir, f));
}

export interface BackupResult {
  hourly: string;
  daily: string | null;
}

export async function backupHourly(db: NodeD1, cfg: BackupConfig, now: Date = new Date()): Promise<BackupResult> {
  const work = path.join(cfg.dir, ".work");
  const hourlyDir = path.join(cfg.dir, "hourly");
  const dailyDir = path.join(cfg.dir, "daily");
  for (const d of [cfg.dir, work, hourlyDir, dailyDir]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  const plain = path.join(work, `ops-${stamp(now)}.sqlite`);
  fs.rmSync(plain, { force: true });
  try {
    await sqliteBackup(db.sqlite, plain);
    const hourly = path.join(hourlyDir, `ops-${stamp(now)}.sqlite.age`);
    encrypt(cfg, plain, hourly);
    let daily: string | null = path.join(dailyDir, `ops-${stamp(now).slice(0, 8)}.sqlite.age`);
    if (fs.existsSync(daily)) daily = null;
    else fs.copyFileSync(hourly, daily);
    prune(hourlyDir, cfg.keepHourly ?? 24);
    prune(dailyDir, cfg.keepDaily ?? 7);
    return { hourly, daily };
  } finally {
    fs.rmSync(plain, { force: true });
  }
}

/** The files of RFQs not yet confirmed by Odoo — the only files that exist nowhere else. */
export function undeliveredFileKeys(db: NodeD1): string[] {
  return db
    .q<{ object_key: string }>(
      `SELECT a.object_key FROM rfq_attachments a JOIN rfqs r ON r.id = a.rfq_id
       WHERE a.upload_status = 'uploaded' AND a.deleted_at IS NULL AND r.odoo_rfq_reference IS NULL ORDER BY a.object_key`,
    )
    .map((r) => r.object_key);
}

export async function backupOffsite(db: NodeD1, cfg: BackupConfig, filesRoot: string, s3: S3Client, env: string, now: Date = new Date()): Promise<{ uploaded: string[] }> {
  const { hourly } = await backupHourly(db, cfg, now);
  const work = path.join(cfg.dir, ".work");
  const day = stamp(now).slice(0, 8);
  const uploads: { key: string; file: string }[] = [{ key: `ahanassa-rfq/${env}/${day}/ops.sqlite.age`, file: hourly }];
  const keys = undeliveredFileKeys(db);
  const tarPlain = path.join(work, `files-${day}.tar`);
  const tarAge = path.join(work, `files-${day}.tar.age`);
  try {
    if (keys.length) {
      execFileSync("tar", ["-cf", tarPlain, "-C", filesRoot, ...keys], { stdio: ["ignore", "ignore", "pipe"] });
      encrypt(cfg, tarPlain, tarAge);
      uploads.push({ key: `ahanassa-rfq/${env}/${day}/undelivered-files.tar.age`, file: tarAge });
    }
    const done: string[] = [];
    for (const u of uploads) {
      const body = fs.readFileSync(u.file);
      const sha256 = createHash("sha256").update(body).digest("hex");
      const put = await s3.put(u.key, body, { contentType: "application/octet-stream", sha256 });
      if (put.status < 200 || put.status > 299) throw new Error(`backup: offsite upload of ${u.key} answered ${put.status}`);
      const head = await s3.head(u.key);
      if (head.status !== 200 || head.size !== body.length) throw new Error(`backup: offsite copy of ${u.key} not verified`);
      done.push(u.key);
    }
    return { uploaded: done };
  } finally {
    fs.rmSync(tarPlain, { force: true });
    fs.rmSync(tarAge, { force: true });
  }
}
