import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { buildRfqService } from "./build-rfq-service.ts";

/**
 * W32: the one-file domestic RFQ intake. Built twice → identical bytes; then RUN from an empty directory (no
 * node_modules, no repository) with the embedded migrations: serve answers /healthz and /api/rfqs/capabilities.
 */
test("rfq-ir.mjs: deterministic, self-contained (runs from an empty dir), embedded migrations, no test code", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rfq-ir-bundle-"));
  try {
    const a = buildRfqService(path.join(dir, "a", "rfq-ir.mjs"));
    const b = buildRfqService(path.join(dir, "b", "rfq-ir.mjs"));
    assert.equal(a.sha256, b.sha256);
    const code = fs.readFileSync(path.join(dir, "a", "rfq-ir.mjs"), "utf8");
    for (const marker of ["stagingTestRoutes", "stagingTurnstileTestPath"]) assert.ok(!code.includes(marker), marker);
    assert.ok(code.includes("0009_rfq_attachments.sql") && code.includes("0001_ir_buffer.sql"), "migrations embedded");

    const run = path.join(dir, "run");
    const release = path.join(run, "release");
    fs.mkdirSync(path.join(release, "private"), { recursive: true });
    fs.copyFileSync(path.join(dir, "a", "rfq-ir.mjs"), path.join(run, "rfq-ir.mjs"));
    fs.writeFileSync(path.join(release, "private", "rfq-variant-index.json"), JSON.stringify({ snapshot_version: "snap-0123456789abcdef", rows: [] }));
    const port = 18700 + Math.floor(Math.random() * 200);
    const cfg = {
      env: "staging",
      listen: { host: "127.0.0.1", port },
      public_origin: "https://api-staging.ahanassa.ir",
      allowed_origins: ["https://staging.ahanassa.ir"],
      data_dir: path.join(run, "data"),
      release_dir: release,
      captcha: { provider: "arcaptcha", site_key: "site-key-1" },
      files_enabled: true,
      odoo: { base_url: "https://odoo.ahanassa.com", intake_v11: true },
      r2: null,
      r2_wait_ms: 7_200_000,
      files_storage_hint: "held on the domestic server",
      bale: null,
      backup: null,
    };
    fs.writeFileSync(path.join(run, "rfq.json"), JSON.stringify(cfg));
    const child = spawn(process.execPath, [path.join(run, "rfq-ir.mjs"), "serve", path.join(run, "rfq.json")], { cwd: run, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    try {
      for (let i = 0; i < 50 && !out.includes('"listening"'); i++) await new Promise((r) => setTimeout(r, 100));
      assert.match(out, /"event":"listening"/);
      assert.match(out, /"event":"variant_index","version":"snap-0123456789abcdef"/);
      const health = (await (await fetch(`http://127.0.0.1:${port}/healthz`)).json()) as { ok: boolean; outbox_due: number };
      assert.deepEqual(health, { ok: true, outbox_due: 0, oldest_due_min: null });
      const caps = (await (await fetch(`http://127.0.0.1:${port}/api/rfqs/capabilities`, { headers: { origin: "https://staging.ahanassa.ir" } })).json()) as { captcha: unknown };
      assert.deepEqual(caps.captcha, { provider: "arcaptcha", siteKey: "site-key-1" });
    } finally {
      child.kill("SIGTERM");
      await new Promise((r) => child.on("exit", r));
    }
    const names = fs.readdirSync(path.join(run, "data")).sort();
    assert.ok(names.includes("ops.sqlite") && names.includes("public.sqlite") && names.includes("files"), names.join(","));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
