import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Static safety-net for the Cloudflare environment configuration, in the
// same spirit as workflow-invariants.test.ts in this directory: cheap,
// parse-based checks over wrangler.jsonc that catch the specific dangerous
// drifts this project has actually hit before — a staging environment
// silently re-inheriting production's cron list (DAR-053, the 2026-09-03
// Workers Free 5-trigger-cap incident), and any bleed of production
// resource identities into the staging block.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

// wrangler.jsonc is JSONC: line/block comments and trailing commas. Parsed
// with a string-aware scanner rather than a regex so a "//" or "/*" inside
// a JSON string value can never be mistaken for a comment.
function stripJsonc(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

interface D1Binding {
  binding: string;
  database_name: string;
  database_id: string;
}

interface WranglerEnv {
  name: string;
  triggers?: { crons?: string[] };
  d1_databases?: D1Binding[];
  queues?: { producers?: { queue: string }[]; consumers?: { queue: string }[] };
  vars?: Record<string, string>;
}

function readConfig(): { env: Record<string, WranglerEnv> } {
  return JSON.parse(stripJsonc(readFileSync(path.join(repoRoot, "wrangler.jsonc"), "utf8")));
}

function readEntry(): string {
  return readFileSync(path.join(repoRoot, "workers", "entry.ts"), "utf8");
}

// The single cron `workers/entry.ts#scheduled()` routes to Processing
// Groups sync. Staging registers exactly this one and nothing else.
const PROCESSING_SYNC_CRON = "0 */3 * * *";

test("staging registers exactly the one cron that drives Processing Groups sync", () => {
  const staging = readConfig().env.staging;
  assert.deepEqual(
    staging.triggers?.crons,
    [PROCESSING_SYNC_CRON],
    "env.staging must register exactly the Processing-sync cron — never an empty list (Processing sync would never run) and never production's full list (DAR-053 trigger-cap incident)",
  );
});

test("the staging cron string matches the handler constant it must route to", () => {
  const staging = readConfig().env.staging;
  const entry = readEntry();
  const match = entry.match(/const CATALOG_INCREMENTAL_CRON = "([^"]+)";/);
  assert.ok(match, "workers/entry.ts must declare CATALOG_INCREMENTAL_CRON");
  assert.equal(
    staging.triggers?.crons?.[0],
    match![1],
    "env.staging's cron must be byte-identical to the handler constant — otherwise Cloudflare fires a cron that falls through to the default (RFQ outbox) branch and Processing sync silently never runs",
  );
  assert.ok(
    entry.includes("runScheduledProcessingSync()"),
    "the scheduled handler must still invoke runScheduledProcessingSync()",
  );
});

test("production cron triggers are unchanged by staging cron work", () => {
  const production = readConfig().env.production;
  assert.deepEqual(
    production.triggers?.crons,
    ["*/5 * * * *", "0 */3 * * *", "30 2 * * *"],
    "env.production's three cron triggers must not be altered",
  );
});

test("total registered cron triggers stay within the account's 5-trigger cap", () => {
  const cfg = readConfig();
  const total = Object.values(cfg.env).reduce((sum, e) => sum + (e.triggers?.crons?.length ?? 0), 0);
  assert.ok(
    total <= 5,
    `wrangler.jsonc declares ${total} cron triggers across all environments; the account's Workers Free cap is 5 (exceeding it broke a staging deploy on 2026-09-03, DAR-053)`,
  );
});

test("staging and production never share a Worker, D1 database, or queue", () => {
  const { staging, production } = readConfig().env;

  assert.notEqual(staging.name, production.name, "staging and production must be separate Workers");

  const names = (e: WranglerEnv) => (e.d1_databases ?? []).map((d) => d.database_name).sort();
  const ids = (e: WranglerEnv) => (e.d1_databases ?? []).map((d) => d.database_id).sort();
  const queues = (e: WranglerEnv) =>
    [...(e.queues?.producers ?? []).map((q) => q.queue), ...(e.queues?.consumers ?? []).map((q) => q.queue)].sort();

  for (const [label, of] of [
    ["database_name", names],
    ["database_id", ids],
    ["queue", queues],
  ] as const) {
    const shared = of(staging).filter((v) => of(production).includes(v));
    assert.deepEqual(shared, [], `staging and production must not share any ${label}: ${shared.join(", ")}`);
  }
});

test("no value under env.staging names the live environment", () => {
  const staging = readConfig().env.staging;
  const offenders: string[] = [];
  (function walk(node: unknown, trail: string): void {
    if (typeof node === "string") {
      if (/production/i.test(node)) offenders.push(`${trail} = ${node}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${trail}[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (/production/i.test(k)) offenders.push(`${trail}.${k} (key)`);
        walk(v, `${trail}.${k}`);
      }
    }
  })(staging, "env.staging");
  assert.deepEqual(offenders, [], "env.staging must not reference the live environment anywhere");
  assert.equal(staging.vars?.APP_ENV, "staging", "env.staging must declare APP_ENV=staging");
});
