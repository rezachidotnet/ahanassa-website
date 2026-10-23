import { createHash, createHmac } from "node:crypto";
import type { FetchLike } from "./family-fetch.ts";

/**
 * W32: a minimal S3 client (AWS Signature V4, path-style) for the object stores the domestic intake writes to. W35
 * (owner, 2026-10-23): both are ArvanCloud Object Storage in Iran, `s3.ir-thr-at1.arvanstorage.ir` (region
 * `ir-thr-at1`, IPv4 — no AAAA there; a domestic hop):
 *  - the .ir RFQ-files bucket `ahanassa-rfq-files-ir` (+ `-staging`), which Odoo abroad reads (D-IR-4);
 *  - the backup bucket `ahanassa-backup-ir` (D-IR-9).
 * The signing is the same algorithm as deploy/iran/lib/ahanassa_iran.py `s3_signed_headers` and is pinned by the
 * same AWS documented example (lib/rfq-node/s3.test.ts). The payload hash is the real SHA-256 of the body, so the
 * store itself rejects a body that changed on the way.
 */
export interface S3Target {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hex = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export function signS3(method: string, url: string, target: Pick<S3Target, "region" | "accessKeyId" | "secretAccessKey">, payloadSha256: string, now: Date = new Date(), extra: Record<string, string> = {}): Record<string, string> {
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const u = new URL(url);
  const headers: Record<string, string> = { host: u.host, "x-amz-content-sha256": payloadSha256, "x-amz-date": amzDate };
  for (const [k, v] of Object.entries(extra)) headers[k.toLowerCase()] = v;
  const names = Object.keys(headers).sort();
  const signed = names.join(";");
  const query = [...u.searchParams].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  const canonicalPath = u.pathname.split("/").map((seg) => enc(decodeURIComponent(seg))).join("/") || "/";
  const canonical = [method, canonicalPath, query, ...names.map((k) => `${k}:${headers[k].trim()}`), "", signed, payloadSha256].join("\n");
  const scope = `${day}/${target.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(canonical)].join("\n");
  let key: Buffer = createHmac("sha256", `AWS4${target.secretAccessKey}`).update(day).digest();
  for (const part of [target.region, "s3", "aws4_request"]) key = createHmac("sha256", key).update(part).digest();
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  const out: Record<string, string> = {};
  for (const k of names) if (k !== "host") out[k] = headers[k];
  out.Authorization = `AWS4-HMAC-SHA256 Credential=${target.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`;
  return out;
}

export function objectUrl(target: S3Target, key: string): string {
  return `${target.endpoint.replace(/\/+$/, "")}/${enc(target.bucket)}/${key.split("/").map(enc).join("/")}`;
}

export interface S3Client {
  put(key: string, body: Buffer, meta?: { contentType?: string; sha256?: string }): Promise<{ status: number }>;
  head(key: string): Promise<{ status: number; size: number | null; sha256: string | null }>;
}

export function s3Client(target: S3Target, fetchImpl: FetchLike, timeoutMs = 60_000, now: () => Date = () => new Date()): S3Client {
  const call = async (method: string, key: string, body: Buffer | null, extra: Record<string, string>) => {
    const url = objectUrl(target, key);
    const headers = signS3(method, url, target, hex(body ?? Buffer.alloc(0)), now(), extra);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { method, headers, body: (body ?? undefined) as BodyInit | undefined, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    async put(key, body, meta = {}) {
      const extra: Record<string, string> = { "content-type": meta.contentType ?? "application/octet-stream" };
      if (meta.sha256) extra["x-amz-meta-sha256"] = meta.sha256;
      const res = await call("PUT", key, body, extra);
      await res.arrayBuffer().catch(() => null);
      return { status: res.status };
    },
    async head(key) {
      const res = await call("HEAD", key, null, {});
      const len = res.headers.get("content-length");
      return { status: res.status, size: len === null ? null : Number(len), sha256: res.headers.get("x-amz-meta-sha256") };
    },
  };
}
