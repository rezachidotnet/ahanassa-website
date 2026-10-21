import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nextStaticEntries, STATIC_ASSET_WAIT, waitForStaticAssets } from "./static-asset-wait.ts";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const BASE = "https://static.example";
const bytes = (s: string) => new TextEncoder().encode(s);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** A fake deploy: each path becomes reachable (with its bytes) at a given time; before that it 404s. */
function fakeHost(files: Record<string, { body: string; readyAt: number }>, clock: { t: number }) {
  const requests: string[] = [];
  const fetchBytes = async (url: string) => {
    requests.push(url);
    const f = files[url.slice(BASE.length + 1)];
    if (!f || clock.t < f.readyAt) return { status: 404, bytes: bytes("<!doctype html>not found") };
    return { status: 200, bytes: bytes(f.body) };
  };
  return { fetchBytes, requests, now: () => clock.t, sleep: async (ms: number) => void (clock.t += ms) };
}

test("publish #34 race: a new chunk that 404s for the first seconds after deploy is waited for, not reported as a failure", async () => {
  const clock = { t: 0 };
  const host = fakeHost({ "_next/static/chunks/vinext-new.js": { body: "entry", readyAt: 0 }, "_next/static/chunks/SiteHeader-new.js": { body: "header", readyAt: 12_000 } }, clock);
  const entries = [
    { path: "_next/static/chunks/vinext-new.js", sha256: sha("entry") },
    { path: "_next/static/chunks/SiteHeader-new.js", sha256: sha("header") },
  ];
  const r = await waitForStaticAssets(BASE, entries, { ...STATIC_ASSET_WAIT, ...host });
  assert.equal(r.ok, true);
  assert.equal(r.rounds, 4, "0 s, 5 s, 10 s still 404; 15 s served");
  assert.equal(r.waitedMs, 15_000);
  // A served file is not fetched again; only the pending one is re-polled.
  assert.equal(host.requests.filter((u) => u.endsWith("vinext-new.js")).length, 1);
  assert.equal(host.requests.filter((u) => u.endsWith("SiteHeader-new.js")).length, 4);
});

test("a chunk still missing at the deadline fails with its path and last status", async () => {
  const clock = { t: 0 };
  const host = fakeHost({ "_next/static/chunks/a.js": { body: "a", readyAt: 0 } }, clock);
  const r = await waitForStaticAssets(BASE, [{ path: "_next/static/chunks/a.js", sha256: sha("a") }, { path: "_next/static/chunks/missing.js", sha256: sha("m") }], { ...STATIC_ASSET_WAIT, ...host });
  assert.equal(r.ok, false);
  assert.deepEqual(r.pending, [{ path: "_next/static/chunks/missing.js", last: "HTTP 404" }]);
  assert.ok(r.waitedMs <= STATIC_ASSET_WAIT.deadlineMs);
  assert.ok(r.waitedMs + STATIC_ASSET_WAIT.intervalMs > STATIC_ASSET_WAIT.deadlineMs, "it waited until the deadline");
});

test("a 200 with other bytes (an old version still served) is not accepted; neither is a network error", async () => {
  const clock = { t: 0 };
  let calls = 0;
  const r = await waitForStaticAssets(BASE, [{ path: "_next/static/chunks/x.js", sha256: sha("new") }], {
    deadlineMs: 10_000,
    intervalMs: 5_000,
    now: () => clock.t,
    sleep: async (ms) => void (clock.t += ms),
    fetchBytes: async () => {
      calls++;
      if (calls === 1) throw new Error("ECONNRESET");
      return { status: 200, bytes: bytes(calls === 2 ? "old" : "new") };
    },
  });
  assert.equal(r.ok, true);
  assert.equal(r.rounds, 3);
  const stale = await waitForStaticAssets(BASE, [{ path: "_next/static/chunks/x.js", sha256: sha("new") }], { deadlineMs: 0, intervalMs: 5_000, fetchBytes: async () => ({ status: 200, bytes: bytes("old") }) });
  assert.match(stale.pending[0].last, /^HTTP 200, sha256 [0-9a-f]{12} ≠ artifact [0-9a-f]{12}$/);
});

test("only /_next/static/ files and the hashed rfq-catalog files (W25) are waited for", () => {
  const entries = nextStaticEntries([
    { path: "index.html", sha256: "a" },
    { path: "_next/static/chunks/a.js", sha256: "b" },
    { path: "_next/static/css/app.css", sha256: "c" },
    { path: "data/rfq-catalog.fa.json", sha256: "d" },
    { path: "data/rfq-catalog.fa.0123456789abcdef.json", sha256: "e" },
  ]);
  assert.deepEqual(entries.map((e) => e.path), ["_next/static/chunks/a.js", "_next/static/css/app.css", "data/rfq-catalog.fa.0123456789abcdef.json"]);
});

test("the publish smoke waits for the artifact's /_next/static/ files before it opens /contact in Chrome", () => {
  const source = readFileSync(path.join(ROOT, "scripts/content/publish.ts"), "utf8");
  const wait = source.indexOf("await waitForStaticAssets(STATIC_BASE_URL, nextStaticEntries(manifest.public_assets)");
  const chrome = source.indexOf('spawnSync("node", ["scripts/static/hydration-check.ts", "--base-url"');
  assert.ok(wait > 0 && chrome > wait, "wait comes first");
  assert.match(source.slice(wait, chrome), /if \(!assets\.ok\) throw new Error/);
});
