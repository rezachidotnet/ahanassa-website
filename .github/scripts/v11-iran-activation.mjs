// W30 (W29 P1 §1.2; RELEASE_POLICY.md §20.11 draft) — the activation record of the domestic copy (iransrv,
// deploy/iran/ on the application branch). CI writes it AFTER www.ahanassa.com is final, signs it with the job
// environment's ed25519 key (`ssh-keygen -Y sign -n ahanassa-ir-release`) and uploads it next to the bundle. The server
// pulls it, verifies the signature (principal ci-<env>), the seq and every sha256, and only then serves the bundle.
//
//   node v11-iran-activation.mjs make     --env <env> --summary <iran-bundle.json> --manifest <manifest.json> --run-id <id> --out <dir>
//   node v11-iran-activation.mjs rollback --from <activation.json> --out <dir>             (reason "rollback", new seq)
//   node v11-iran-activation.mjs match    --dir <dir of */activation.json> --snapshot <snap> [--code <sha>]
//   node v11-iran-activation.mjs previous --dir <dir of */activation.json>                  (the newest with another bundle)
//
// The schema is the server's (deploy/iran/lib/ahanassa_iran.py parse_activation): exact keys, the same formats. Nothing
// here can block www.ahanassa.com: every workflow step that runs it is continue-on-error.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ACTIVATION_SCHEMA = "iran-activation.v1";
export const BUNDLE_SCHEMA = "iran-bundle.v1";
export const SIGNING_NAMESPACE = "ahanassa-ir-release";
export const ENVS = ["production", "staging"];
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SNAPSHOT = /^snap-[0-9a-z-]{4,64}$/;
const KEYS = ["schema", "env", "seq", "reason", "run_id", "code_sha", "snapshot_version", "manifest_sha256", "bundle_sha256", "bundle_bytes", "bundle_artifact", "created_at"];

export const bundleArtifactName = (env, snapshot) => `iran-bundle-${env}-${snapshot}`;
export const activationArtifactName = (env) => `iran-activation-${env}`;

/** Problems of an activation record against the server's schema ([] = valid). */
export function activationProblems(a, env) {
  const p = [];
  if (!a || typeof a !== "object" || Array.isArray(a)) return ["not an object"];
  const keys = Object.keys(a).sort();
  if (keys.join() !== [...KEYS].sort().join()) p.push(`keys differ from ${ACTIVATION_SCHEMA}`);
  if (a.schema !== ACTIVATION_SCHEMA) p.push("schema");
  if (!ENVS.includes(a.env) || (env && a.env !== env)) p.push("env");
  if (!Number.isSafeInteger(a.seq) || a.seq <= 0) p.push("seq");
  if (!["publish", "rollback"].includes(a.reason)) p.push("reason");
  if (!Number.isSafeInteger(a.run_id) || a.run_id <= 0) p.push("run_id");
  if (!HEX40.test(a.code_sha ?? "")) p.push("code_sha");
  if (!SNAPSHOT.test(a.snapshot_version ?? "")) p.push("snapshot_version");
  if (!HEX64.test(a.manifest_sha256 ?? "")) p.push("manifest_sha256");
  if (!HEX64.test(a.bundle_sha256 ?? "")) p.push("bundle_sha256");
  if (!Number.isSafeInteger(a.bundle_bytes) || a.bundle_bytes <= 0 || a.bundle_bytes > 2 * 1024 ** 3) p.push("bundle_bytes");
  if (a.bundle_artifact !== bundleArtifactName(a.env, a.snapshot_version)) p.push("bundle_artifact");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(a.created_at ?? "")) p.push("created_at");
  return p;
}

function assertValid(a, env) {
  const p = activationProblems(a, env);
  if (p.length) throw new Error(`activation invalid: ${p.join(", ")}`);
  return a;
}

/**
 * A publish activation from the build's bundle summary (scripts/iran/bundle.ts iran-bundle.json) and the artifact's
 * manifest.json bytes — the same manifest www.ahanassa.com was published from. They must agree.
 */
export function makeActivation({ env, summary, manifestBytes, runId, now = new Date(), seq = now.getTime() }) {
  const manifestSha = createHash("sha256").update(manifestBytes).digest("hex");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (summary?.schema !== BUNDLE_SCHEMA) throw new Error(`bundle summary is not ${BUNDLE_SCHEMA}`);
  if (summary.environment !== env || manifest.environment !== env) throw new Error(`environment mismatch: want ${env}, bundle ${summary.environment}, manifest ${manifest.environment}`);
  if (summary.manifest_sha256 !== manifestSha) throw new Error("the bundle was not built from this manifest.json");
  if (summary.code_sha !== manifest.code_sha || summary.snapshot_version !== manifest.snapshot_version) throw new Error("bundle and manifest name different code/snapshot");
  return assertValid(
    {
      schema: ACTIVATION_SCHEMA,
      env,
      seq,
      reason: "publish",
      run_id: Number(runId),
      code_sha: manifest.code_sha,
      snapshot_version: manifest.snapshot_version,
      manifest_sha256: manifestSha,
      bundle_sha256: summary.bundle_sha256,
      bundle_bytes: summary.bundle_bytes,
      bundle_artifact: bundleArtifactName(env, manifest.snapshot_version),
      created_at: now.toISOString().replace(/\.\d+Z$/, "Z"),
    },
    env,
  );
}

/**
 * Point the domestic copy back at an earlier, already-published bundle (after a www rollback, or the owner's
 * domestic-only reactivation). Same bundle fields and the run that built it; reason "rollback"; a NEW, larger seq, so
 * the server applies it (it refuses any seq it has seen). The server usually still holds the bundle and needs no download.
 */
export function rollbackActivation(previous, { now = new Date(), seq = now.getTime() } = {}) {
  assertValid(previous);
  if (seq <= previous.seq) throw new Error(`new seq ${seq} must be newer than ${previous.seq}`);
  return assertValid({ ...previous, seq, reason: "rollback", created_at: now.toISOString().replace(/\.\d+Z$/, "Z") });
}

/** The newest activation (by seq) for a snapshot (and code, when given) — the one www returned to. */
export function matchActivation(list, { snapshot, code }) {
  return [...list].filter((a) => a.snapshot_version === snapshot && (!code || a.code_sha === code)).sort((x, y) => y.seq - x.seq)[0] ?? null;
}

/** The newest activation whose bundle differs from the newest one's (the release before the current). */
export function previousActivation(list) {
  const sorted = [...list].sort((x, y) => y.seq - x.seq);
  return sorted.find((a) => a.bundle_sha256 !== sorted[0]?.bundle_sha256) ?? null;
}

function readActivations(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const f = join(dir, name, "activation.json");
    try {
      if (!statSync(f).isFile()) continue;
      const a = JSON.parse(readFileSync(f, "utf8"));
      if (!activationProblems(a).length) out.push(a);
    } catch {
      // an unreadable or foreign file is not a candidate
    }
  }
  return out;
}

function write(dir, a) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "activation.json"), JSON.stringify(a));
  return a;
}

function args(argv) {
  const m = new Map();
  for (let i = 0; i < argv.length; i += 2) m.set(argv[i].replace(/^--/, ""), argv[i + 1]);
  return m;
}

function main([cmd, ...rest]) {
  const a = args(rest);
  if (cmd === "make") {
    const act = makeActivation({ env: a.get("env"), summary: JSON.parse(readFileSync(a.get("summary"), "utf8")), manifestBytes: readFileSync(a.get("manifest")), runId: a.get("run-id") });
    console.log(JSON.stringify(write(a.get("out"), act)));
  } else if (cmd === "rollback") {
    console.log(JSON.stringify(write(a.get("out"), rollbackActivation(JSON.parse(readFileSync(a.get("from"), "utf8"))))));
  } else if (cmd === "match" || cmd === "previous") {
    const list = readActivations(a.get("dir"));
    const hit = cmd === "match" ? matchActivation(list, { snapshot: a.get("snapshot"), code: a.get("code") }) : previousActivation(list);
    if (!hit) {
      console.error(`no activation found (${list.length} read)`);
      process.exit(3);
    }
    console.log(JSON.stringify(hit));
  } else {
    console.error("usage: v11-iran-activation.mjs make|rollback|match|previous …");
    process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2));
