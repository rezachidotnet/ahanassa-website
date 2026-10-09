// node --test ".github/scripts/*.test.mjs"  — W9.7 price-source name scan of the tracked tree. Synthetic names only
// (example.test spellings): the real list never enters this public repository.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadNames, nameVariants, scanFiles } from "./v11-source-names.mjs";

const NAMES = ["example-market.test", "https://www.sample-steel.test/prices", "# a comment", "", "ab"];

test("variants: host, first label, separators removed", () => {
  assert.deepEqual(nameVariants("https://www.example-market.test/x"), ["example-market.test", "example-market", "examplemarkettest", "examplemarket"]);
});

test("scan: findings name the file and the list line, never the name; a path holding a name is redacted", () => {
  const names = ["example-market.test", "sample-steel.test"];
  const f = scanFiles(
    [
      { path: "docs/a.md", content: "Visit Example Market today" },
      { path: "docs/clean.md", content: "nothing here" },
      { path: "fixtures/sample-steel/page.html", content: "<html></html>" },
    ],
    names,
  );
  assert.deepEqual(f, [
    { file: "docs/a.md", index: 1 },
    { file: "<path redacted: it contains a listed name>", index: 2 },
  ]);
  assert.ok(!JSON.stringify(f).toLowerCase().includes("example"), "no name in the output");
});

test("CLI: fails on a finding, passes clean, warns (and passes) without a list", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-names-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  g("init", "-q");
  writeFileSync(path.join(dir, "a.md"), "clean");
  g("add", "-A");
  const list = path.join(tmpdir(), `names-${process.pid}.txt`);
  writeFileSync(list, NAMES.join("\n"));
  t.after(() => rmSync(list, { force: true }));
  const cli = new URL("./v11-source-names.mjs", import.meta.url).pathname;
  const run = (env) => {
    try {
      return { status: 0, out: execFileSync("node", [cli, "scan-tree", "--app", dir], { encoding: "utf8", env: { ...process.env, ...env } }) };
    } catch (e) {
      return { status: e.status, out: e.stdout };
    }
  };
  assert.equal(run({ AHANASSA_PRICE_SOURCE_NAMES_FILE: list }).status, 0);
  writeFileSync(path.join(dir, "b.md"), "prices from samplesteel");
  g("add", "-A");
  const hit = run({ AHANASSA_PRICE_SOURCE_NAMES_FILE: list });
  assert.equal(hit.status, 1);
  assert.match(hit.out, /b\.md \(name #2 of the private list\)/);
  assert.ok(!/sample|example/i.test(hit.out), "the log never shows a name");
  const none = run({ AHANASSA_PRICE_SOURCE_NAMES_FILE: "" });
  assert.equal(none.status, 0);
  assert.match(none.out, /scan not run/);
  assert.deepEqual(loadNames({ AHANASSA_PRICE_SOURCE_NAMES_FILE: list }), ["example-market.test", "https://www.sample-steel.test/prices"]);
});
