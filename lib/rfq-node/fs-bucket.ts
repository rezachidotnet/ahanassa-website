import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";

/**
 * W32 (W29 P2 §3.1): the subset of R2Bucket that lib/rfq-worker/attachments.ts, admin.ts and file-retention.ts use,
 * on the domestic server's disk: `/var/lib/ahanassa-rfq/<env>/files/<object key>`, files 0600, dirs 0700.
 *
 * `put` streams to a temp file in the same directory and renames it into place only when the whole stream arrived,
 * so a half-written upload is never visible under its key. Like the Worker's R2 binding, an aborted stream rejects
 * the put; the caller deletes the key either way. Keys are the contract v1.2 keys (`rfq-files/<reference>/<slot>.<ext>`);
 * anything that could leave the root (`..`, absolute, backslash) is refused.
 */
const KEY = /^rfq-files\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

export interface FsObject {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
}

export class FsBucket {
  readonly root: string;
  constructor(root: string) {
    this.root = path.resolve(root);
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
  }

  /** Absolute path of a key; throws for a key outside the allowed shape. */
  pathOf(key: string): string {
    if (!KEY.test(key) || key.includes("..")) throw new Error("invalid object key");
    return path.join(this.root, ...key.split("/"));
  }

  async put(key: string, value: ReadableStream<Uint8Array> | Uint8Array | string, _options?: unknown): Promise<FsObject> {
    const target = this.pathOf(key);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    const tmp = `${target}.part-${process.pid}-${Date.now()}`;
    const hash = createHash("md5");
    let size = 0;
    const fd = fs.openSync(tmp, "wx", 0o600);
    try {
      const write = (chunk: Uint8Array) => {
        hash.update(chunk);
        size += chunk.byteLength;
        fs.writeSync(fd, chunk);
      };
      if (typeof value === "string") write(new TextEncoder().encode(value));
      else if (value instanceof Uint8Array) write(value);
      else for await (const chunk of value as unknown as AsyncIterable<Uint8Array>) write(chunk);
      fs.fsyncSync(fd);
    } catch (err) {
      fs.closeSync(fd);
      fs.rmSync(tmp, { force: true });
      throw err;
    }
    fs.closeSync(fd);
    fs.renameSync(tmp, target);
    return { key, size, etag: hash.digest("hex"), uploaded: new Date() };
  }

  async head(key: string): Promise<FsObject | null> {
    try {
      const st = fs.statSync(this.pathOf(key));
      return { key, size: st.size, etag: "", uploaded: st.mtime };
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<(FsObject & { body: ReadableStream<Uint8Array> }) | null> {
    const head = await this.head(key);
    if (!head) return null;
    return { ...head, body: Readable.toWeb(fs.createReadStream(this.pathOf(key))) as unknown as ReadableStream<Uint8Array> };
  }

  async delete(key: string): Promise<void> {
    fs.rmSync(this.pathOf(key), { force: true });
    // Empty per-RFQ directories go too (no file names on disk longer than needed).
    let dir = path.dirname(this.pathOf(key));
    while (dir.startsWith(this.root) && dir !== this.root) {
      try {
        fs.rmdirSync(dir);
      } catch {
        break;
      }
      dir = path.dirname(dir);
    }
  }

  /** SHA-256 of the stored bytes (the forwarder re-checks a file before it leaves the server). */
  sha256(key: string): string | null {
    try {
      return createHash("sha256").update(fs.readFileSync(this.pathOf(key))).digest("hex");
    } catch {
      return null;
    }
  }

  asR2(): R2Bucket {
    return this as unknown as R2Bucket;
  }
}
