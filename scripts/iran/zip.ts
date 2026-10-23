/**
 * W30: a minimal, deterministic ZIP writer (no dependency): the same inputs always give the same bytes, so the bundle's
 * sha256 is a property of its content. Entries in the given order, no directory entries, fixed DOS time 1980-01-01,
 * Unix mode 0644 regular files, UTF-8 names (flag bit 11). DEFLATE for text, STORE for already-compressed media.
 * No ZIP64: the writer refuses anything past the 4 GiB / 65,535-entry limits instead of writing a broken archive.
 * Read by Python's zipfile on the server (deploy/iran/lib/ahanassa_iran.py).
 */
import fs from "node:fs";
import zlib from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/** Extensions whose bytes are already compressed: stored, not deflated (saves CI time, same size). */
const STORED = /\.(?:avif|webp|png|jpe?g|gif|ico|woff2?|mp4|m4s|webm|zip|xlsx|docx|pdf|gz|br)$/i;
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
const DOS_TIME = 0;
const MAX32 = 0xffffffff;

export function writeZip(file: string, entries: readonly ZipEntry[]): void {
  if (entries.length > 0xffff) throw new Error(`zip: ${entries.length} entries exceed the non-ZIP64 limit`);
  const names = new Set<string>();
  const fd = fs.openSync(file, "w");
  const central: Buffer[] = [];
  let offset = 0;
  const write = (b: Buffer) => {
    fs.writeSync(fd, b);
    offset += b.length;
  };
  try {
    for (const e of entries) {
      if (names.has(e.name)) throw new Error(`zip: duplicate entry ${e.name}`);
      if (!e.name || e.name.startsWith("/") || e.name.split("/").some((s) => s === "" || s === "." || s === "..")) throw new Error(`zip: unsafe entry name ${e.name}`);
      names.add(e.name);
      const name = Buffer.from(e.name, "utf8");
      const method = STORED.test(e.name) ? 0 : 8;
      const body = method === 8 ? zlib.deflateRawSync(e.data, { level: 9 }) : e.data;
      const crc = zlib.crc32(e.data) >>> 0;
      if (e.data.length > MAX32 || body.length > MAX32 || offset > MAX32) throw new Error("zip: archive exceeds 4 GiB (no ZIP64)");
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4); // version needed
      local.writeUInt16LE(0x0800, 6); // UTF-8 names
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(DOS_TIME, 10);
      local.writeUInt16LE(DOS_DATE, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(e.data.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix
      header.writeUInt16LE(20, 6);
      header.writeUInt16LE(0x0800, 8);
      header.writeUInt16LE(method, 10);
      header.writeUInt16LE(DOS_TIME, 12);
      header.writeUInt16LE(DOS_DATE, 14);
      header.writeUInt32LE(crc, 16);
      header.writeUInt32LE(body.length, 20);
      header.writeUInt32LE(e.data.length, 24);
      header.writeUInt16LE(name.length, 28);
      header.writeUInt32LE(((0o100644 << 16) >>> 0) as number, 38); // regular file, 0644
      header.writeUInt32LE(offset, 42);
      central.push(Buffer.concat([header, name]));
      write(local);
      write(name);
      write(body);
    }
    const cdStart = offset;
    for (const c of central) write(c);
    if (offset > MAX32) throw new Error("zip: archive exceeds 4 GiB (no ZIP64)");
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(offset - cdStart, 12);
    end.writeUInt32LE(cdStart, 16);
    write(end);
  } finally {
    fs.closeSync(fd);
  }
}
