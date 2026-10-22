// W30 (W29 P1 §1.6; RELEASE_POLICY.md §20.2b draft) — does the domestic copy serve what www serves?
//
//   node v11-iran-copy.mjs check --pairs "https://www.ahanassa.com=https://new.ahanassa.ir …" [--live-release <file>]
//                                [--max-drift-min 45] [--fallback-drift-min 180]
//
// Per pair (source = the Cloudflare host, copy = the Arvan host), from /manifest.public.json (public, no token):
//   OK                  same snapshot_version
//   PENDING             a different snapshot, younger than the limit (the copy follows within minutes of www's finalize)
//   IR_COPY_DRIFT       ALERT: a different snapshot for longer than --max-drift-min since www switched to it (the switch
//                       time is the live-release.json record's live_since when it names www's snapshot; otherwise the
//                       manifest's generated_at with the looser --fallback-drift-min, e.g. for staging)
//   IR_UNREACHABLE      ALERT: the copy did not answer (3 tries) — from GitHub's runners, i.e. from abroad
//   SOURCE_UNREACHABLE  reported only: the source is down — ops-health's own production job covers www
//
// Both ALERTs belong to the domestic-copy incident class (§20.2b): ops-health runs this as its own job, `iran-copy`,
// which v11-release-watch.yml never reads (it reads only `health (production-prep)`), so a domestic-copy incident is
// e-mailed (failed run) but never rolls a release back and never blocks a STABLE_100 row.
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const ALERTS = ["IR_COPY_DRIFT", "IR_UNREACHABLE"];
export const JOB_NAME = "iran-copy (domestic copy; not a release check, §20.2b)";

export function parsePairs(text) {
  return (text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const [source, copy] = p.split("=");
      for (const u of [source, copy]) if (!/^https:\/\/[a-z0-9.-]+$/.test(u ?? "")) throw new Error(`bad pair ${p} (https origins expected)`);
      return { source, copy };
    });
}

/** Pure: one pair's state. */
export function evaluatePair({ source, copy, sourceManifest, copyManifest, sourceError, copyError, live, now = new Date(), maxDriftMin = 45, fallbackDriftMin = 180 }) {
  const base = { source, copy, source_snapshot: sourceManifest?.snapshot_version ?? null, copy_snapshot: copyManifest?.snapshot_version ?? null };
  if (sourceError) return { ...base, state: "SOURCE_UNREACHABLE", detail: `${source}: ${sourceError}` };
  if (copyError) return { ...base, state: "IR_UNREACHABLE", detail: `${copy}: ${copyError}` };
  if (base.source_snapshot === base.copy_snapshot) return { ...base, state: "OK", detail: "same snapshot" };
  const fromLive = live && live.snapshot_version === base.source_snapshot && live.live_since;
  const since = fromLive ? live.live_since : sourceManifest?.generated_at;
  const limit = fromLive ? maxDriftMin : fallbackDriftMin;
  const age = since ? Math.floor((now.getTime() - Date.parse(since)) / 60_000) : null;
  if (age === null || Number.isNaN(age)) return { ...base, state: "IR_COPY_DRIFT", detail: "different snapshot and no time to measure from" };
  const detail = `copy serves ${base.copy_snapshot}, ${source} serves ${base.source_snapshot} since ${since} (${age} min; limit ${limit} min, ${fromLive ? "www switch time" : "snapshot time"})`;
  return { ...base, state: age > limit ? "IR_COPY_DRIFT" : "PENDING", detail, age_min: age };
}

async function manifest(origin, fetchImpl, tries = 3) {
  let last = "";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchImpl(`${origin}/manifest.public.json`, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "ahanassa-ops-health/iran-copy" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const m = await res.json();
      if (typeof m?.snapshot_version !== "string") throw new Error("no snapshot_version");
      return { manifest: m };
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  return { error: last };
}

export async function checkPairs(pairs, { live = null, fetchImpl = fetch, now = new Date(), maxDriftMin, fallbackDriftMin } = {}) {
  return Promise.all(
    pairs.map(async ({ source, copy }) => {
      const [s, c] = await Promise.all([manifest(source, fetchImpl), manifest(copy, fetchImpl)]);
      return evaluatePair({ source, copy, sourceManifest: s.manifest, copyManifest: c.manifest, sourceError: s.error, copyError: c.error, live, now, maxDriftMin, fallbackDriftMin });
    }),
  );
}

async function main([cmd, ...rest]) {
  if (cmd !== "check") {
    console.error("usage: v11-iran-copy.mjs check --pairs <a=b …> [--live-release f] [--max-drift-min n] [--fallback-drift-min n]");
    process.exit(2);
  }
  const a = new Map();
  for (let i = 0; i < rest.length; i += 2) a.set(rest[i].replace(/^--/, ""), rest[i + 1]);
  let live = null;
  try {
    if (a.get("live-release")) live = JSON.parse(readFileSync(a.get("live-release"), "utf8"));
  } catch {
    live = null;
  }
  const results = await checkPairs(parsePairs(a.get("pairs")), { live, maxDriftMin: Number(a.get("max-drift-min") ?? 45), fallbackDriftMin: Number(a.get("fallback-drift-min") ?? 180) });
  const summary = ["### Domestic copy (§20.2b — not a release check)", "", "| copy | source | state | detail |", "|---|---|---|---|", ...results.map((r) => `| ${r.copy} | ${r.source} | **${r.state}** | ${r.detail} |`), ""];
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`);
  console.log(summary.join("\n"));
  for (const r of results) {
    if (ALERTS.includes(r.state)) console.log(`::error title=ALERT: ${r.state}::${r.copy}: ${r.detail}`);
    else if (r.state === "SOURCE_UNREACHABLE") console.log(`::warning title=source unreachable::${r.detail}`);
  }
  process.exit(results.some((r) => ALERTS.includes(r.state)) ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main(process.argv.slice(2));
