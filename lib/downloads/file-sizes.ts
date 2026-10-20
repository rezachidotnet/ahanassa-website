import fs from "node:fs";
import type { DownloadsReport } from "./generate.ts";

/**
 * W20.8 — the byte size of every generated download, for the /downloads buttons. The static build writes the
 * files BEFORE the page is rendered (scripts/static/build.ts) and records them in a manifest outside the public
 * output; `AHANASSA_DOWNLOADS_MANIFEST` names it. Without it (dev server, tests) the page shows no sizes.
 */
export const DOWNLOADS_MANIFEST_ENV = "AHANASSA_DOWNLOADS_MANIFEST";

export type DownloadSizes = ReadonlyMap<string, number>;

export function downloadsManifestJson(report: Pick<DownloadsReport, "files">): string {
  return `${JSON.stringify({ files: report.files.map((f) => ({ path: f.path, bytes: f.bytes })) })}\n`;
}

export function loadDownloadSizes(file = process.env[DOWNLOADS_MANIFEST_ENV]): DownloadSizes {
  if (!file) return new Map();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { files?: Array<{ path?: unknown; bytes?: unknown }> };
    return new Map((parsed.files ?? []).flatMap((f) => (typeof f.path === "string" && typeof f.bytes === "number" ? [[f.path, f.bytes] as const] : [])));
  } catch {
    return new Map();
  }
}
