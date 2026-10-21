import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapModuleIsLowPriority, raiseBootstrapModulePriority, raiseBootstrapModulePriorityInDir } from "./postprocess.ts";

/**
 * W25.2 — /contact on a slow network: the page's entry module is fetched with the other chunks, not last.
 * Measured (W25_2 report): cold 3G form-usable 17.0 s → 14.8 s. The browser half is that measurement;
 * this is the rule that keeps it.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const ENTRY = "/_next/static/chunks/index-D92HTxcY.js";
const page = (extra = "") =>
  `<head><link rel="modulepreload" fetchPriority="low" href="${ENTRY}"/><link rel="modulepreload" fetchPriority="low" href="/_next/static/chunks/other.js"/>${extra}</head>` +
  `<body><script type="module" src="${ENTRY}" id="_R_" async=""></script><link rel="modulepreload" href="${ENTRY}" /></body>`;

test("the bootstrap module's preload loses React's fetchPriority=low; nothing else changes", () => {
  const out = raiseBootstrapModulePriority(page());
  assert.ok(out.includes(`<link rel="modulepreload" href="${ENTRY}"/>`));
  assert.ok(!out.includes(`fetchPriority="low" href="${ENTRY}"`));
  assert.ok(out.includes(`<link rel="modulepreload" fetchPriority="low" href="/_next/static/chunks/other.js"/>`), "only the entry");
  assert.equal(out.length, page().length - ' fetchPriority="low"'.length);
  assert.equal(raiseBootstrapModulePriority(out), out, "idempotent");
  assert.equal(raiseBootstrapModulePriority("<html><body>no entry</body></html>"), "<html><body>no entry</body></html>");
});

test("the static build applies it to every HTML file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w252-"));
  fs.mkdirSync(path.join(dir, "en"));
  fs.writeFileSync(path.join(dir, "contact.html"), page());
  fs.writeFileSync(path.join(dir, "en/contact.html"), page());
  fs.writeFileSync(path.join(dir, "data.json"), page());
  assert.equal(raiseBootstrapModulePriorityInDir(dir), 2);
  assert.ok(!fs.readFileSync(path.join(dir, "en/contact.html"), "utf8").includes(`fetchPriority="low" href="${ENTRY}"`));
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), page(), "non-HTML untouched");
  assert.match(read("scripts/static/build.ts"), /raiseBootstrapModulePriorityInDir\(publicDir\)/);
});

test("the artifact gate refuses a page whose entry module is still low priority (e.g. React changed its markup)", () => {
  assert.equal(bootstrapModuleIsLowPriority(page()), true);
  assert.equal(bootstrapModuleIsLowPriority(raiseBootstrapModulePriority(page())), false);
  const reordered = page().replace(`<link rel="modulepreload" fetchPriority="low" href="${ENTRY}"/>`, `<link fetchpriority="low" rel="modulepreload" href="${ENTRY}">`);
  assert.equal(raiseBootstrapModulePriority(reordered), reordered, "the rewrite does not match this markup…");
  assert.equal(bootstrapModuleIsLowPriority(reordered), true, "…so the gate catches it");
  assert.equal(bootstrapModuleIsLowPriority("<html><body>no entry</body></html>"), false);
  assert.match(read("lib/static/artifact-gate.ts"), /if \(bootstrapModuleIsLowPriority\(html\)\) failures\.push/);
});
