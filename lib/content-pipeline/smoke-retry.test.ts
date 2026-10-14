import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CHROME_START_ATTEMPTS, CONTACT_HYDRATION_RETRY, withRetries } from "./smoke-retry.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(repo, f), "utf8");

test("withRetries: a first success runs once and never sleeps", async () => {
  const slept: number[] = [];
  let runs = 0;
  assert.equal(await withRetries(async () => ++runs, { attempts: 3, delayMs: 30_000, sleep: async (ms) => void slept.push(ms) }), 1);
  assert.equal(runs, 1);
  assert.deepEqual(slept, []);
});

test("withRetries: a flake is retried after the delay and the later success is returned", async () => {
  const slept: number[] = [];
  const retried: number[] = [];
  const result = await withRetries(
    async (attempt) => {
      if (attempt < 3) throw new Error(`flake ${attempt}`);
      return "ok";
    },
    { attempts: 3, delayMs: 2000, sleep: async (ms) => void slept.push(ms), onRetry: (a) => retried.push(a) },
  );
  assert.equal(result, "ok");
  assert.deepEqual(retried, [1, 2]);
  assert.deepEqual(slept, [2000, 2000]);
});

test("withRetries: when every attempt fails, the LAST error is thrown unchanged (same object, same message)", async () => {
  const errors: Error[] = [];
  let runs = 0;
  await assert.rejects(
    withRetries(
      async () => {
        runs++;
        const e = new Error("could not start Chrome at google-chrome");
        errors.push(e);
        throw e;
      },
      { attempts: CHROME_START_ATTEMPTS, sleep: async () => {} },
    ),
    (e) => e === errors.at(-1) && (e as Error).message === "could not start Chrome at google-chrome",
  );
  assert.equal(runs, 3);
});

test("withRetries: the /contact retry is exactly one more run, 30 s later", async () => {
  assert.deepEqual({ ...CONTACT_HYDRATION_RETRY }, { attempts: 2, delayMs: 30_000 });
  assert.equal(CHROME_START_ATTEMPTS, 3);
  const slept: number[] = [];
  let runs = 0;
  await assert.rejects(
    withRetries(
      async () => {
        runs++;
        throw new Error("smoke /contact form: FAIL /ar/contact — not hydrated");
      },
      { ...CONTACT_HYDRATION_RETRY, sleep: async (ms) => void slept.push(ms) },
    ),
    /^Error: smoke \/contact form: FAIL \/ar\/contact — not hydrated$/,
  );
  assert.equal(runs, 2);
  assert.deepEqual(slept, [30_000]);
  await assert.rejects(withRetries(async () => 1, { attempts: 0 }), /positive integer/);
});

test("hydration-check.ts starts Chrome through withRetries (fresh port and profile per start) and keeps its failure message", () => {
  const src = read("scripts/static/hydration-check.ts");
  const start = src.indexOf("const wsUrl = await withRetries(");
  assert.ok(start > 0, "Chrome start is wrapped");
  const block = src.slice(start, src.indexOf("const ws = new WebSocket(wsUrl);"));
  assert.match(block, /profile = fs\.mkdtempSync/);
  assert.match(block, /const port = 9400 \+ Math\.floor\(Math\.random\(\) \* 400\);/);
  assert.match(block, /await stopChrome\(chrome\);\s*removeProfile\(profile\);\s*throw new Error\(`could not start Chrome at \$\{chromePath\}`\);/);
  assert.match(block, /attempts: CHROME_START_ATTEMPTS/);
  assert.equal((src.match(/could not start Chrome at/g) ?? []).length, 1, "one message, unchanged");
});

test("publish.ts re-runs the /contact hydration check once after 30 s, with the unchanged failure message", () => {
  const src = read("scripts/content/publish.ts");
  const start = src.indexOf("await withRetries(");
  assert.ok(start > 0);
  const block = src.slice(start, src.indexOf("lines.push(`/contact fa/en/ar hydrated", start));
  assert.match(block, /spawnSync\("node", \["scripts\/static\/hydration-check\.ts", "--base-url", STATIC_BASE_URL, "--pages", "\/contact,\/en\/contact,\/ar\/contact", "--expect-snapshot", version\]/);
  assert.ok(block.includes('throw new Error(`smoke /contact form: ${form.stdout.split("\\n").filter((l) => l.startsWith("FAIL")).join(" | ") || form.stderr.slice(-400)}`);'));
  assert.match(block, /\.\.\.CONTACT_HYDRATION_RETRY/);
  assert.equal((src.match(/smoke \/contact form:/g) ?? []).length, 1);
});
