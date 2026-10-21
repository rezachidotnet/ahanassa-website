import { createHash } from "node:crypto";
import { RFQ_CATALOG_ASSET_PATTERN } from "../contracts/public-paths.ts";

/**
 * W10.6 — the publish smoke's wait for a fresh deploy's /_next/static/ files.
 *
 * Content publish #34 (2026-10-13) deployed new code and opened /contact in Chrome about 20 s later; the new
 * SiteHeader chunk could not be fetched yet and the form never hydrated, although the artifact held the
 * chunk and the same artifact hydrated cleanly when served locally. Newly uploaded assets can take a few
 * seconds to be reachable after `wrangler deploy`. So before the browser check, every /_next/static/ file
 * of the artifact must be served with exactly the artifact's bytes (sha256) — no cache-buster, so this is
 * what a visitor's browser gets — polled until a deadline. A file still wrong at the deadline fails the
 * smoke with its path and last status (and the publish rolls back as before).
 */
export interface StaticAssetEntry {
  path: string;
  sha256: string;
}
export interface StaticAssetWaitOptions {
  fetchBytes: (url: string) => Promise<{ status: number; bytes: Uint8Array }>;
  deadlineMs: number;
  intervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  concurrency?: number;
}
export interface StaticAssetWaitResult {
  ok: boolean;
  checked: number;
  rounds: number;
  waitedMs: number;
  /** Files still not served correctly when the wait ended (empty when ok). */
  pending: { path: string; last: string }[];
}

export const STATIC_ASSET_WAIT = { deadlineMs: 180_000, intervalMs: 5_000 } as const;

/** The /_next/static/ files, and (W25) the hashed rfq-catalog.v2 files /contact loads — immutable-cached the same way. */
export function nextStaticEntries(publicAssets: readonly StaticAssetEntry[]): StaticAssetEntry[] {
  return publicAssets.filter((e) => e.path.startsWith("_next/static/") || RFQ_CATALOG_ASSET_PATTERN.test(`/${e.path}`));
}

export async function waitForStaticAssets(baseUrl: string, entries: readonly StaticAssetEntry[], options: StaticAssetWaitOptions): Promise<StaticAssetWaitResult> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const concurrency = options.concurrency ?? 8;
  const start = now();
  const last = new Map<string, string>();
  let pending = [...entries];
  let rounds = 0;
  for (;;) {
    rounds++;
    const stillPending: StaticAssetEntry[] = [];
    for (let i = 0; i < pending.length; i += concurrency) {
      await Promise.all(
        pending.slice(i, i + concurrency).map(async (e) => {
          try {
            const r = await options.fetchBytes(`${baseUrl}/${e.path}`);
            if (r.status !== 200) {
              last.set(e.path, `HTTP ${r.status}`);
              stillPending.push(e);
              return;
            }
            const sha = createHash("sha256").update(r.bytes).digest("hex");
            if (sha !== e.sha256) {
              last.set(e.path, `HTTP 200, sha256 ${sha.slice(0, 12)} ≠ artifact ${e.sha256.slice(0, 12)}`);
              stillPending.push(e);
            }
          } catch (err) {
            last.set(e.path, `fetch error: ${err instanceof Error ? err.message : String(err)}`);
            stillPending.push(e);
          }
        }),
      );
    }
    pending = stillPending;
    const waitedMs = now() - start;
    if (!pending.length) return { ok: true, checked: entries.length, rounds, waitedMs, pending: [] };
    if (waitedMs + options.intervalMs > options.deadlineMs) {
      return { ok: false, checked: entries.length, rounds, waitedMs, pending: pending.map((e) => ({ path: e.path, last: last.get(e.path) ?? "never fetched" })) };
    }
    await sleep(options.intervalMs);
  }
}
