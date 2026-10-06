// RELEASE_POLICY.md §20.5 (owner decisions D-DAR-063 + D-SCHEDULE, 2026-10-06) — the scheduled production
// content build (07:00 UTC) builds BASE_PRODUCTION_SHA, never the application branch tip.
//
//   node v11-stable-release.mjs resolve --app <checkout> --ledger-ref <ref>
//     Reads docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md AND the strict resolver lib/ci/release-ledger.ts from
//     <ref> (the trusted ledger branch; never from the working tree or the candidate) and prints JSON:
//       { ok, sha, eligible, reason }
//     eligible = the latest STABLE_100 row resolves, its RELEASE_SHA is on <ref>'s history and is a v11 release
//     (its tree has the content pipeline, scripts/content/publish.ts). Writes sha/eligible/reason to
//     $GITHUB_OUTPUT when set. Exit 0 whenever it could decide (eligible or not), 2 when it could not run.
//
//   node v11-stable-release.mjs check-config --app <checkout at the STABLE_100 SHA, after npm ci>
//     The release's own static Worker config, env production, must declare the www.ahanassa.com custom domain
//     and workers_dev false (W9.1: a pre-cutover release would re-enable workers.dev and smoke the wrong host).
//     Exit 0 OK, 1 not OK (the job fails: a v11 STABLE_100 release without the www binding is an alert).
//
// Lives on `main` with the workflow (the app branch may not change the code that selects the app code).
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const LEDGER_PATH = "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md";
export const RESOLVER_PATH = "lib/ci/release-ledger.ts";
export const PIPELINE_MARKER = "scripts/content/publish.ts";
export const STATIC_CONFIG = "workers/static/wrangler.jsonc";
export const PRODUCTION_WORKER = "ahanassa-v11-static-production";
export const PRODUCTION_HOST = "www.ahanassa.com";

function git(app, args) {
  return execFileSync("git", args, { cwd: app, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function gitOk(app, args) {
  try {
    execFileSync("git", args, { cwd: app, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function resolveStableRelease(app, ledgerRef) {
  const ref = git(app, ["rev-parse", "--verify", `${ledgerRef}^{commit}`]).trim();
  const markdown = git(app, ["show", `${ref}:${LEDGER_PATH}`]);
  // The resolver is taken from the same trusted commit as the ledger, exactly as the release gate does (§0.2).
  const dir = mkdtempSync(path.join(tmpdir(), "v11-stable-"));
  const resolverFile = path.join(dir, "release-ledger.ts");
  writeFileSync(resolverFile, git(app, ["show", `${ref}:${RESOLVER_PATH}`]));
  const { resolveBaseProductionShaFromManifest } = await import(pathToFileURL(resolverFile).href);
  const base = resolveBaseProductionShaFromManifest(markdown);
  const ledger = `${ledgerRef} (${ref})`;
  if (!base.ok) return { ok: false, sha: null, eligible: false, ledger, reason: `${base.code}: ${base.reason}` };
  const sha = base.releaseSha;
  if (!gitOk(app, ["merge-base", "--is-ancestor", sha, ref])) {
    return { ok: true, sha, eligible: false, ledger, reason: `latest STABLE_100 ${sha} is not on ${ledgerRef}'s history (not a v11 release)` };
  }
  if (!gitOk(app, ["cat-file", "-e", `${sha}:${PIPELINE_MARKER}`])) {
    return { ok: true, sha, eligible: false, ledger, reason: `latest STABLE_100 ${sha} has no ${PIPELINE_MARKER}: not a v11 release (no v11 STABLE_100 row yet)` };
  }
  return { ok: true, sha, eligible: true, ledger, reason: `latest STABLE_100 ${sha} is a v11 release` };
}

export function checkProductionConfig(config) {
  const problems = [];
  if (config.name !== PRODUCTION_WORKER) problems.push(`env production name is ${JSON.stringify(config.name)}, expected ${PRODUCTION_WORKER}`);
  if (config.workers_dev !== false) problems.push(`env production workers_dev is ${JSON.stringify(config.workers_dev)}, expected false`);
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const www = routes.filter((r) => typeof r === "object" && r && r.pattern === PRODUCTION_HOST && r.custom_domain === true);
  if (www.length !== 1) problems.push(`env production does not declare ${PRODUCTION_HOST} as a custom domain`);
  if (routes.length !== www.length) problems.push(`env production declares other routes: ${JSON.stringify(routes)}`);
  return problems;
}

function readProductionConfig(app) {
  const require = createRequire(path.join(path.resolve(app), "package.json"));
  const { unstable_readConfig } = require("wrangler");
  const c = unstable_readConfig({ config: path.join(app, STATIC_CONFIG), env: "production" });
  return { name: c.name, workers_dev: c.workers_dev, routes: c.routes };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv) {
  const mode = argv[0];
  const app = arg(argv, "app") ?? ".";
  if (mode === "resolve") {
    const ledgerRef = arg(argv, "ledger-ref");
    if (!ledgerRef) throw new Error("--ledger-ref is required");
    const r = await resolveStableRelease(app, ledgerRef);
    console.log(JSON.stringify(r));
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `sha=${r.sha ?? ""}\neligible=${r.eligible}\nreason=${r.reason.replace(/\n/g, " ")}\n`);
    }
    return 0;
  }
  if (mode === "check-config") {
    const config = readProductionConfig(app);
    const problems = checkProductionConfig(config);
    console.log(JSON.stringify({ config, problems }));
    return problems.length ? 1 : 0;
  }
  throw new Error(`unknown mode ${JSON.stringify(mode)} (resolve | check-config)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`v11-stable-release could not run: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    },
  );
}
