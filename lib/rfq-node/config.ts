import fs from "node:fs";
import path from "node:path";

/**
 * W32: configuration of one domestic intake environment (staging | production) on iransrv.
 *
 *   /etc/ahanassa/rfq-<env>.json            non-secret settings (deploy/iran/etc/rfq.json.example), root 0644
 *   $CREDENTIALS_DIRECTORY/<name>           secrets, given to each unit by systemd `LoadCredential=` from
 *                                           /etc/ahanassa/credentials/ (root 0600) — never in the JSON, the
 *                                           environment of a shell, the repo or a log:
 *       admin-token        ADMIN_TOKEN of /__admin (intake)
 *       altcha-hmac-key    W35: the ALTCHA challenge HMAC key (intake) — generated ON the server by install.sh rfq-dirs,
 *                          never pasted, never leaves it
 *       odoo-token         the iransrv bearer for POST /api/v1/rfq (forwarder; Odoo's third slot, D-IR-5)
 *       files-s3           W35: {"access_key_id","secret_access_key"} of the Arvan machine user ahanassa-iransrv on the
 *                          .ir RFQ-files bucket (forwarder: PUT + HEAD)
 *       bale-token         Bale bot token (forwarder, health)
 *       backup-s3          {"access_key_id","secret_access_key"} — the same machine user, on the Arvan backup bucket (backup)
 * A process reads only the secrets its own unit was given.
 */
export interface S3Settings {
  endpoint: string;
  bucket: string;
  region: string;
}

export interface IrConfig {
  env: "staging" | "production";
  listen: { host: string; port: number };
  public_origin: string;
  allowed_origins: string[];
  data_dir: string;
  release_dir: string;
  /** W35: ALTCHA only — the domestic intake issues and verifies its own challenges (lib/rfq-node/altcha.ts). */
  captcha: { provider: "altcha" };
  files_enabled: boolean;
  odoo: { base_url: string; intake_v11: boolean };
  /**
   * W35: the object store the forwarder copies RFQ files to before Odoo gets them — the Arvan bucket in Iran
   * (`https://s3.ir-thr-at1.arvanstorage.ir`, ahanassa-rfq-files-ir[-staging]); Odoo abroad reads it. null = none
   * (files then reach Odoo as a notes list after files_store_wait_ms).
   */
  files_store: S3Settings | null;
  files_store_wait_ms: number;
  files_storage_hint: string;
  bale: { chat_id: string } | null;
  backup: { dir: string; age_recipient: string; offsite: S3Settings | null } | null;
}

const ORIGIN = /^https:\/\/[a-z0-9.-]+$/;

export function loadConfig(file: string): IrConfig {
  const c = JSON.parse(fs.readFileSync(file, "utf8")) as IrConfig;
  const fail = (m: string) => {
    throw new Error(`${file}: ${m}`);
  };
  if (c.env !== "staging" && c.env !== "production") fail("env must be staging or production");
  if (c.listen?.host !== "127.0.0.1" && c.listen?.host !== "::1") fail("listen.host must be loopback (nginx is the only client)");
  if (!Number.isInteger(c.listen.port) || c.listen.port < 1024 || c.listen.port > 65535) fail("listen.port");
  if (!ORIGIN.test(c.public_origin ?? "")) fail("public_origin");
  if (!Array.isArray(c.allowed_origins) || !c.allowed_origins.length || c.allowed_origins.some((o) => !ORIGIN.test(o))) fail("allowed_origins");
  for (const k of ["data_dir", "release_dir"] as const) if (!path.isAbsolute(c[k] ?? "")) fail(`${k} must be absolute`);
  if (c.captcha?.provider !== "altcha") fail("captcha.provider must be altcha (W35)");
  if (!/^https:\/\//.test(c.odoo?.base_url ?? "")) fail("odoo.base_url");
  if (!Number.isFinite(c.files_store_wait_ms) || c.files_store_wait_ms < 60_000) fail("files_store_wait_ms (≥ 60000)");
  if (c.files_store === undefined) fail("files_store (an S3 endpoint/bucket/region, or null)");
  if (c.files_store && (!/^https:\/\//.test(c.files_store.endpoint) || !c.files_store.bucket || !c.files_store.region)) fail("files_store");
  return c;
}

/** One systemd credential (LoadCredential=) or null when this unit was not given it. */
export function credential(name: string, dir = process.env.CREDENTIALS_DIRECTORY): string | null {
  if (!dir || !/^[a-z0-9-]+$/.test(name)) return null;
  try {
    const v = fs.readFileSync(path.join(dir, name), "utf8").trim();
    return v || null;
  } catch {
    return null;
  }
}

export function s3Credential(name: string, dir?: string): { accessKeyId: string; secretAccessKey: string } | null {
  const raw = credential(name, dir);
  if (!raw) return null;
  const v = JSON.parse(raw) as { access_key_id?: string; secret_access_key?: string };
  return v.access_key_id && v.secret_access_key ? { accessKeyId: v.access_key_id, secretAccessKey: v.secret_access_key } : null;
}
