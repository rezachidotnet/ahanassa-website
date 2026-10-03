/**
 * Shared helpers for the content publication steps (scripts/content/*,
 * architecture V1.1 §7.1). Every step runs identically locally and in CI:
 *
 *   node scripts/content/<step>.ts --work <dir> [...]
 *
 * `--work` must be OUTSIDE the repository (fetched Odoo data, snapshots and
 * artifacts are never committed). Steps exchange files only through it.
 */
import fs from "node:fs";
import path from "node:path";
import { wranglerD1 } from "../../lib/rfq-worker/wrangler-d1.ts";

export const repoRoot = path.resolve(import.meta.dirname, "../..");

export function parseArgs(argv = process.argv.slice(2)): { get: (k: string) => string | undefined; has: (k: string) => boolean } {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(key, next);
      i++;
    } else flags.add(key);
  }
  return { get: (k) => values.get(k), has: (k) => flags.has(k) || values.get(k) === "true" };
}

/** The work directory; refuses any path inside the repository. */
export function workDir(arg: string | undefined): string {
  if (!arg) throw new Error("--work <dir> is required (a directory outside the repository)");
  const dir = path.resolve(arg);
  const rel = path.relative(repoRoot, dir);
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) throw new Error(`--work ${dir} is inside the repository; fetched data and artifacts must never be committed`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const paths = (work: string) => ({
  odoo: path.join(work, "source/odoo.json"),
  d1: path.join(work, "source/d1.json"),
  fetchReport: path.join(work, "source/fetch-report.json"),
  validation: path.join(work, "validation.json"),
  snapshot: path.join(work, "snapshot.json"),
  artifact: path.join(work, "artifact"),
  publish: path.join(work, "publish-state.json"),
});

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 1) + "\n");
}

/** Appends to the GitHub job summary when running in Actions; always echoes to stdout. */
export function summary(markdown: string): void {
  console.log(markdown);
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, markdown + "\n");
}

export const log = (step: string) => (msg: string) => console.log(`[content:${step}] ${msg}`);

/** DB_PUBLIC (staging) through `wrangler d1 execute --remote` — the same adapter the CI reconciler uses. */
export function publicDb(args: ReturnType<typeof parseArgs>): D1Database {
  return wranglerD1({ database: "DB_PUBLIC", config: args.get("d1-config") ?? "workers/rfq/wrangler.jsonc", env: args.get("env") ?? "staging", cwd: repoRoot });
}

/** Runs a step body; a thrown error becomes a clear job-summary line and exit 1. */
export async function runStep(step: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary(`### ❌ content ${step} failed\n\n\`\`\`\n${message}\n\`\`\``);
    process.exit(1);
  }
}
