import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ArticleSourceFile } from "../articles/validate.ts";

/**
 * W11.1 — the build-time fetch of the articles merged into the PRIVATE content repository
 * (`rezachidotnet/ahanassa-content`, branch `main`), for the content pipeline's fetch step
 * (scripts/content/fetch.ts). docs/ARTICLES.md §Fetch.
 *
 * ONLY `articles/**` (*.md) and `assets/articles/**` (*.svg) are ever read. The clone is sparse AND
 * blob-filtered, so no other file of that repository — in particular `editorial/banned.txt`, the
 * private list of price-source sites — is downloaded, let alone copied into this public repository,
 * an artifact or a log.
 *
 * Configuration (environment; the CI wiring is W9.7 — this step never changes a workflow):
 *
 *   AHANASSA_CONTENT_DIR              a local checkout of the content repo (development, or a CI checkout
 *                                     made with the deploy key); only its two article folders are read
 *   AHANASSA_CONTENT_REPO_TOKEN            a READ-ONLY token for that one repository (fine-grained PAT or GitHub
 *                                     App token, `contents: read`); sent as an HTTP header, never in a URL
 *   AHANASSA_CONTENT_DEPLOY_KEY_FILE  path to a READ-ONLY SSH deploy key of that repository
 *   AHANASSA_CONTENT_REPO             owner/name (default rezachidotnet/ahanassa-content)
 *   AHANASSA_CONTENT_REF              branch (default main: only merged articles publish)
 *
 * Nothing configured → status `not_configured`. Never throws: `status` records what happened and the
 * validate step decides (lib/content-pipeline/articles.ts: blocked only when the live site has articles).
 */
export const CONTENT_ENV = {
  dir: "AHANASSA_CONTENT_DIR",
  token: "AHANASSA_CONTENT_REPO_TOKEN",
  deployKeyFile: "AHANASSA_CONTENT_DEPLOY_KEY_FILE",
  repo: "AHANASSA_CONTENT_REPO",
  ref: "AHANASSA_CONTENT_REF",
} as const;
export const DEFAULT_CONTENT_REPO = "rezachidotnet/ahanassa-content";
export const DEFAULT_CONTENT_REF = "main";
/** The only folders read, and the only file types kept from them. */
export const CONTENT_READ_PATHS = [{ dir: "articles", ext: ".md" }, { dir: "assets/articles", ext: ".svg" }] as const;
export const CONTENT_LIMITS = { maxFiles: 20_000, maxFileBytes: 512 * 1024, maxTotalBytes: 200 * 1024 * 1024 } as const;

export interface ArticlesSource {
  status: "ok" | "not_configured" | "failed";
  mode: "dir" | "token" | "deploy_key" | null;
  repo: string | null;
  ref: string | null;
  /** Commit the files were read at (null when unknown, e.g. a directory without git). */
  commit: string | null;
  fetched_at: string;
  error?: string;
  files: ArticleSourceFile[];
}

type Env = Record<string, string | undefined>;

/** Reads the two article folders of a checkout. Throws on a limit breach. */
export function readContentTree(root: string): ArticleSourceFile[] {
  const files: ArticleSourceFile[] = [];
  let total = 0;
  for (const { dir, ext } of CONTENT_READ_PATHS) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isSymbolicLink()) continue; // never follow a link out of the folder
        if (e.isDirectory()) walk(p);
        else if (e.isFile() && e.name.endsWith(ext)) {
          const size = fs.statSync(p).size;
          if (size > CONTENT_LIMITS.maxFileBytes) throw new Error(`${path.relative(root, p)} is larger than ${CONTENT_LIMITS.maxFileBytes} bytes`);
          total += size;
          if (total > CONTENT_LIMITS.maxTotalBytes || files.length >= CONTENT_LIMITS.maxFiles) throw new Error("content repository exceeds the article size limits");
          files.push({ path: path.relative(root, p).split(path.sep).join("/"), content: fs.readFileSync(p, "utf8") });
        }
      }
    };
    walk(base);
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function git(args: string[], options: { cwd?: string; env?: Env } = {}): string {
  const r = spawnSync("git", args, { cwd: options.cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...options.env }, encoding: "utf8", timeout: 120_000 });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed (exit ${r.status ?? r.signal}): ${(r.stderr || r.error?.message || "").trim().split("\n").slice(-2).join(" ")}`);
  return r.stdout.trim();
}

/**
 * Sparse, shallow, blob-filtered clone of `ref` into `dest`: only the blobs under the two article
 * folders are fetched. Auth goes through GIT_CONFIG_* / GIT_SSH_COMMAND (never argv or the URL).
 */
export function sparseClone(repo: string, ref: string, dest: string, auth: { token?: string; deployKeyFile?: string }): void {
  fs.rmSync(dest, { recursive: true, force: true });
  const env: Env = {};
  let url: string;
  if (auth.token) {
    url = `https://github.com/${repo}.git`;
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
    env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${auth.token}`).toString("base64")}`;
  } else {
    url = `git@github.com:${repo}.git`;
    env.GIT_SSH_COMMAND = `ssh -i ${JSON.stringify(auth.deployKeyFile)} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes`;
  }
  git(["clone", "--quiet", "--depth", "1", "--single-branch", "--branch", ref, "--filter=blob:none", "--no-checkout", url, dest], { env });
  git(["sparse-checkout", "set", "--no-cone", ...CONTENT_READ_PATHS.map((p) => `/${p.dir}/`)], { cwd: dest, env });
  git(["checkout", "--quiet", ref], { cwd: dest, env });
}

const redact = (message: string, secret: string | undefined) => (secret ? message.split(secret).join("***") : message);

/** Never throws. `workDir` holds the temporary clone (outside the repository; removed afterwards). */
export function fetchArticlesSource(workDir: string, env: Env = process.env, now: () => Date = () => new Date()): ArticlesSource {
  const repo = env[CONTENT_ENV.repo] || DEFAULT_CONTENT_REPO;
  const ref = env[CONTENT_ENV.ref] || DEFAULT_CONTENT_REF;
  const fetchedAt = now().toISOString();
  const base = { repo, ref, fetched_at: fetchedAt };
  const dir = env[CONTENT_ENV.dir];
  const token = env[CONTENT_ENV.token];
  const deployKeyFile = env[CONTENT_ENV.deployKeyFile];
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[\w./-]+$/.test(ref) || ref.startsWith("-")) return { ...base, status: "failed", mode: null, commit: null, error: "invalid AHANASSA_CONTENT_REPO or AHANASSA_CONTENT_REF", files: [] };
  try {
    if (dir) {
      const root = path.resolve(dir);
      if (!fs.existsSync(path.join(root, "articles")) && !fs.existsSync(path.join(root, "assets/articles"))) throw new Error(`${CONTENT_ENV.dir} has no articles/ folder`);
      let commit: string | null = null;
      try {
        commit = git(["rev-parse", "HEAD"], { cwd: root });
      } catch {}
      return { ...base, repo: `local ${path.basename(root)}`, ref: null, status: "ok", mode: "dir", commit, files: readContentTree(root) };
    }
    if (!token && !deployKeyFile) return { ...base, status: "not_configured", mode: null, commit: null, files: [] };
    const dest = path.join(workDir, "content-repo");
    try {
      sparseClone(repo, ref, dest, { token, deployKeyFile });
      const commit = git(["rev-parse", "HEAD"], { cwd: dest });
      return { ...base, status: "ok", mode: token ? "token" : "deploy_key", commit, files: readContentTree(dest) };
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  } catch (error) {
    return { ...base, status: "failed", mode: dir ? "dir" : token ? "token" : "deploy_key", commit: null, error: redact(error instanceof Error ? error.message : String(error), token), files: [] };
  }
}
