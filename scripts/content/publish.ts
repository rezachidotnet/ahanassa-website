/**
 * Staging publish and rollback (architecture V1.1 §7.1 step 7, §7.2, §5.1).
 * One subcommand per workflow step; state shared through <work>/publish-state.json.
 *
 *   node scripts/content/publish.ts <load|deploy|smoke|switch|finalize|rollback> --work <dir> [--env staging]
 *
 *   load      gate + checksums; publication_state row `staged`; rfq_variant_index rows (atomic batches).
 *             Refuses if the version is not newer than every pipeline version or the pointer moved.
 *   deploy    copies public-assets (checksum-verified) to .artifact/public-assets and deploys the
 *             assets-only static Worker; records the previous Worker version for rollback.
 *   smoke     staging hostname checks (pages fa/en/ar, sitemap, robots, 404, manifest/catalog version,
 *             /contact form version in Chrome), RFQ Worker health, variant dry run on the NEW version.
 *   switch    atomic, guarded pointer switch; re-checks the pointer and a dry run through the active path.
 *   finalize  mirrors Odoo-owned catalog columns into DB_PUBLIC; prunes versions beyond retention.
 *   rollback  §7.2: before the switch -> staged version failed, pointer untouched; after deploy ->
 *             previous Worker version redeployed (its exact asset bytes) and verified; after the switch
 *             -> pointer restored. Always writes a job summary.
 *
 * Test-only: CONTENT_SMOKE_FORCE_FAIL=1 makes `smoke` fail after the deploy (rollback proof, W4 E23).
 * Honoured only with --env staging; the workflow exposes it only on the staging job.
 *
 * --env production (W8.0, r4): publishes <work>/artifact-production — the production-target twin built in the
 * same run — to the PRODUCTION-PREP targets: the assets-only Worker ahanassa-v11-static-production on
 * workers.dev and the v11 production DB_PUBLIC (publication state + rfq_variant_index only; no catalog
 * mirror: nothing reads it). `load` additionally requires (r4 §2.3) that the staging twin is the ACTIVE
 * version on staging and that the allowlisted-diff gate passes again; no Odoo fetch, no build.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { artifactManifest, type ArtifactManifest } from "../../lib/contracts/artifact-v1.ts";
import { rfqVariantIndexRow, type RfqVariantIndexRow } from "../../lib/contracts/snapshot-v1.ts";
import { COMPANY_PUBLIC_NUMBERS } from "../../lib/content/contact-channels.ts";
import { PIPELINE_CONFIG } from "../../lib/content-pipeline/config.ts";
import { categoryReplaceBatches, batchStatements, clearFirstPointerSql, failStagedSql, mirrorStatements, pruneSql, restorePointerSql, stagedStateSql, switchPointerSql, variantIndexBatches, versionsToPrune } from "../../lib/content-pipeline/publication-sql.ts";
import { isPipelineVersion } from "../../lib/content-pipeline/version.ts";
import { describeFiles, runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { resolveVariantsFromIndex } from "../../lib/rfq-worker/variant-index.ts";
import { compareTargetArtifacts } from "../../lib/static/target-diff-gate.ts";
import { PRODUCTION_ROBOTS_TXT, STAGING_ROBOTS_TXT } from "../../lib/static/indexing-gate.ts";
import { STATIC_TARGETS } from "../../lib/static/targets.ts";
import { annotate, log as logger, parseArgs, paths, publicDb, readJson, repoRoot, runStep, summary, workDir, writeJson } from "./common.ts";

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));
const log = logger(`publish:${command}`);
const env = args.get("env") ?? "staging";
if (env !== "staging" && env !== "production") throw new Error(`--env must be staging or production (got ${env})`);

/** Per-target publish targets. Production = www.ahanassa.com since the W8.1 cutover (2026-10-05); its workers.dev URL is disabled. */
const TARGET = {
  staging: {
    worker: "ahanassa-v11-static-staging",
    baseUrl: "https://ahanassa-v11-static-staging.nova-b1e6f0.workers.dev",
    /** The origin the static /contact page posts to (lib/static/targets.ts). */
    formApiOrigin: STATIC_TARGETS.staging.rfqApiOrigin,
    /** Where the smoke reaches that RFQ Worker's /healthz. */
    rfqHealthUrl: `${STATIC_TARGETS.staging.rfqApiOrigin}/healthz`,
    robotsTxt: STAGING_ROBOTS_TXT,
    pageRobots: null as RegExp | null,
  },
  production: {
    worker: "ahanassa-v11-static-production",
    baseUrl: "https://www.ahanassa.com",
    formApiOrigin: STATIC_TARGETS.production.rfqApiOrigin,
    rfqHealthUrl: `${STATIC_TARGETS.production.rfqApiOrigin}/healthz`,
    robotsTxt: PRODUCTION_ROBOTS_TXT,
    pageRobots: /<meta name="robots" content="index, follow"/,
  },
}[env];
const STATIC_CONFIG = "workers/static/wrangler.jsonc";
const STATIC_BASE_URL = TARGET.baseUrl;
const RFQ_API_ORIGIN = TARGET.formApiOrigin;
const DEPLOY_DIR = path.join(repoRoot, ".artifact/public-assets");

interface PublishState {
  version: string;
  previous_active_version: string | null;
  steps: string[];
  previous_worker_version_id?: string | null;
  deployed_worker_version_id?: string | null;
  switched?: boolean;
  rolled_back?: string[];
}

const work = workDir(args.get("work"));
const paths0 = paths(work);
// The artifact this target publishes; `p.artifact` below always means "this target's artifact".
const p = { ...paths0, artifact: env === "production" ? paths0.artifactProduction : paths0.artifact, publish: env === "production" ? paths0.publishProduction : paths0.publish };
const manifestPath = path.join(p.artifact, "manifest.json");
const manifest: ArtifactManifest = artifactManifest.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
const version = manifest.snapshot_version;
const now = () => new Date().toISOString();
if (manifest.environment !== env) throw new Error(`the ${env} publish got an artifact built for ${manifest.environment}`);
// Production: previous_active_version is the PRODUCTION pointer, read when `load` starts (below).
const state: PublishState = fs.existsSync(p.publish) ? readJson<PublishState>(p.publish) : { version, previous_active_version: env === "staging" ? (manifest.pipeline?.previous_active_version ?? null) : null, steps: [] };
if (state.version !== version) throw new Error(`publish-state.json is for ${state.version}, the artifact is ${version}`);
const save = (step?: string) => {
  if (step) state.steps.push(step);
  writeJson(p.publish, state);
};

function wrangler(argv: string[], options: { allowFail?: boolean } = {}): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("npx", ["wrangler", ...argv], { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !options.allowFail) throw new Error(`wrangler ${argv.slice(0, 3).join(" ")} failed: ${(r.stderr || r.stdout).slice(-800)}`);
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

/** One atomic multi-statement D1 execution (DB_PUBLIC, --remote). */
function d1Exec(sql: string): { changes: number }[] {
  const r = wrangler(["d1", "execute", "DB_PUBLIC", "--remote", "--json", "--config", args.get("d1-config") ?? "workers/rfq/wrangler.jsonc", "--env", env, "--command", sql]);
  const parsed = JSON.parse(r.stdout.slice(r.stdout.indexOf("["))) as { meta?: { changes?: number } }[];
  return parsed.map((x) => ({ changes: x.meta?.changes ?? 0 }));
}

const db = () => publicDb(args);
async function pointer(): Promise<string | null> {
  return (await db().prepare(`SELECT active_version FROM publication_pointer WHERE id = 1`).first<string>("active_version")) ?? null;
}
async function stateRows(): Promise<{ version: string; status: string; created_at: string }[]> {
  return (await db().prepare(`SELECT version, status, created_at FROM publication_state`).all<{ version: string; status: string; created_at: string }>()).results;
}

function verifyArtifact(): void {
  const gate = runArtifactGate(p.artifact, { companyPhones: COMPANY_PUBLIC_NUMBERS });
  if (gate.failures.length) throw new Error(`artifact gate refused the deploy:\n${gate.failures.slice(0, 30).join("\n")}`);
}

function indexRows(): RfqVariantIndexRow[] {
  const doc = JSON.parse(fs.readFileSync(path.join(p.artifact, "private-snapshot/rfq-variant-index.json"), "utf8")) as { snapshot_version: string; rows: unknown[] };
  if (doc.snapshot_version !== version) throw new Error("rfq-variant-index.json version mismatch");
  return doc.rows.map((r) => rfqVariantIndexRow.parse(r));
}

function currentWorkerVersionId(): string | null {
  const r = wrangler(["deployments", "list", "--config", STATIC_CONFIG, "--env", env, "--json"], { allowFail: true });
  if (r.status !== 0) return null;
  const list = JSON.parse(r.stdout.slice(r.stdout.indexOf("["))) as { versions: { version_id: string; percentage: number }[] }[];
  return list.at(-1)?.versions.find((v) => v.percentage === 100)?.version_id ?? null;
}

async function fetchText(url: string): Promise<{ status: number; text: string; headers: Headers }> {
  const r = await fetch(url, { redirect: "manual", headers: { "cache-control": "no-cache" } });
  return { status: r.status, text: await r.text(), headers: r.headers };
}

async function waitForServedVersion(expected: string, timeoutMs = 90_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < until) {
    const r = await fetchText(`${STATIC_BASE_URL}/manifest.public.json?ts=${Date.now()}`).catch(() => null);
    if (r?.status === 200) {
      last = (JSON.parse(r.text) as { snapshot_version: string }).snapshot_version;
      if (last === expected) return;
    }
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`${env} still serves ${last || "nothing"} instead of ${expected}`);
}

/** Variant validation dry run: the RFQ Worker's own one-query resolver against DB_PUBLIC; no RFQ is created. */
async function variantDryRun(submittedVersion: string | null, expectFrom: string): Promise<string[]> {
  const rows = indexRows();
  const lines: string[] = [];
  for (const locale of ["fa", "en", "ar"] as const) {
    const sample = rows.filter((r) => r.locale === locale).slice(0, 3).map((r) => r.canonical_variant_id);
    const unknown = "CVAR-999999";
    const res = await resolveVariantsFromIndex(db(), locale, [...sample, unknown], submittedVersion);
    for (const id of sample) {
      const v = res.variants.get(id);
      if (!v || v.snapshotVersion !== expectFrom) throw new Error(`dry run ${locale}: ${id} resolved from ${v?.snapshotVersion ?? "nothing"}, expected ${expectFrom}`);
    }
    if (res.variants.has(unknown)) throw new Error(`dry run ${locale}: unknown variant resolved`);
    lines.push(`${locale}: ${sample.length}/${sample.length} resolved from ${expectFrom}, unknown rejected (active ${res.activeVersion})`);
  }
  return lines;
}

/** First publication only: the staged rfq_variant_index rows of this version, compared with the artifact. */
async function stagedIndexCheck(): Promise<string> {
  const rows = indexRows();
  const parts: string[] = [];
  for (const locale of ["fa", "en", "ar"] as const) {
    const expected = rows.filter((r) => r.locale === locale);
    const sample = expected.slice(0, 3);
    const got = await db()
      .prepare(`SELECT canonical_variant_id, selection_json FROM rfq_variant_index WHERE snapshot_version = ? AND locale = ? AND canonical_variant_id IN (?, ?, ?)`)
      .bind(version, locale, ...sample.map((r) => r.canonical_variant_id))
      .all<{ canonical_variant_id: string; selection_json: string }>();
    for (const r of sample) {
      const hit = got.results.find((g) => g.canonical_variant_id === r.canonical_variant_id);
      if (!hit || hit.selection_json !== r.selection_json) throw new Error(`staged index ${locale}: ${r.canonical_variant_id} missing or different`);
    }
    const n = await db().prepare(`SELECT COUNT(*) AS n FROM rfq_variant_index WHERE snapshot_version = ? AND locale = ?`).bind(version, locale).first<number>("n");
    if (n !== expected.length) throw new Error(`staged index ${locale}: ${n} rows, artifact has ${expected.length}`);
    parts.push(`${locale} ${n} rows, 3/3 samples = artifact`);
  }
  return `staged rfq_variant_index ${parts.join("; ")}`;
}

await runStep(`publish ${command}`, async () => {
  switch (command) {
    case "load": {
      verifyArtifact();
      if (env === "production") {
        // r4 §2.3: the staging twin went live on staging, and the twins differ only in allowlisted places.
        const stagingActive = await publicDb({ get: (k: string) => (k === "env" ? "staging" : args.get(k)), has: (k: string) => args.has(k) }).prepare(`SELECT active_version FROM publication_pointer WHERE id = 1`).first<string>("active_version");
        if (stagingActive !== version) throw new Error(`the staging twin is not active on staging (staging active_version ${stagingActive}, this artifact ${version}); refusing`);
        const diff = compareTargetArtifacts(paths0.artifact, paths0.artifactProduction);
        if (diff.failures.length) throw new Error(`allowlisted-diff gate (r4) failed:\n${diff.failures.slice(0, 20).join("\n")}`);
        if (!state.steps.length) state.previous_active_version = await pointer();
        summary(`### Publish (production-prep): preconditions\n- staging twin \`${version}\` is active on staging\n- r4 allowlisted-diff gate: pass (${diff.stats.identical} identical, ${diff.stats.normalizedEqual} allowlisted, ${diff.stats.wholeFileAllowed.join(", ")})\n- production pointer before: \`${state.previous_active_version}\``);
      }
      const rows = await stateRows();
      if (rows.some((r) => r.version === version)) throw new Error(`${version} already exists in publication_state`);
      const newer = rows.filter((r) => isPipelineVersion(r.version) && r.version >= version);
      if (newer.length) throw new Error(`not monotonic: DB_PUBLIC already has ${newer.map((r) => r.version).join(", ")} >= ${version}`);
      const active = await pointer();
      if (active !== state.previous_active_version) throw new Error(`active_version moved since the fetch (${state.previous_active_version} -> ${active}); refusing`);
      const index = indexRows();
      const manifestSha = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(manifestPath)).digest("hex");
      const snapshot = readSnapshotFile(path.join(p.artifact, "private-snapshot/snapshot.json"));
      d1Exec(stagedStateSql({ version, manifestSha256: manifestSha, createdAt: snapshot.created_at, counts: manifest.counts, now: now() }));
      save("staged_state");
      const batches = variantIndexBatches(index);
      for (const [i, b] of batches.entries()) {
        d1Exec(b);
        log(`index batch ${i + 1}/${batches.length}`);
      }
      const loaded = await db().prepare(`SELECT COUNT(*) AS n FROM rfq_variant_index WHERE snapshot_version = ?`).bind(version).first<number>("n");
      if (loaded !== index.length) throw new Error(`rfq_variant_index has ${loaded} rows for ${version}, expected ${index.length}`);
      save("staged_index");
      summary(`### Publish: load\n- \`${version}\` staged in DB_PUBLIC: publication_state \`staged\`, ${loaded} rfq_variant_index rows in ${batches.length} atomic batch(es); pointer untouched (\`${active}\`)`);
      break;
    }
    case "deploy": {
      verifyArtifact();
      state.previous_worker_version_id = currentWorkerVersionId();
      if (!state.previous_worker_version_id) throw new Error("cannot read the current static Worker version; refusing to deploy without a rollback target");
      save("deploy_started");
      fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
      fs.cpSync(path.join(p.artifact, "public-assets"), DEPLOY_DIR, { recursive: true });
      const copied = describeFiles(DEPLOY_DIR);
      const expected = JSON.stringify(manifest.public_assets);
      if (JSON.stringify(copied) !== expected) throw new Error("deploy copy does not match the manifest checksums");
      if (copied.some((f) => f.path.endsWith(".sql") || f.path.split("/").includes("private-snapshot"))) throw new Error("refused: private file in public-assets");
      const r = wrangler(["deploy", "--config", STATIC_CONFIG, "--env", env]);
      state.deployed_worker_version_id = /Current Version ID:\s*([0-9a-f-]{36})/.exec(r.stdout)?.[1] ?? currentWorkerVersionId();
      save("deployed");
      await waitForServedVersion(version);
      summary(`### Publish: deploy\n- static Worker \`${TARGET.worker}\`: version \`${state.deployed_worker_version_id}\` (previous \`${state.previous_worker_version_id}\`), ${copied.length} files, checksums = manifest\n- ${STATIC_BASE_URL}/manifest.public.json serves \`${version}\``);
      break;
    }
    case "smoke": {
      const lines: string[] = [];
      const snapshot = readSnapshotFile(path.join(p.artifact, "private-snapshot/snapshot.json"));
      const productSlug = (locale: string) => snapshot.tables.product_seo_contents.find((s) => s.locale === locale && s.entity_type === "product" && s.content_quality_status === "approved" && s.published_at && s.h1)?.slug;
      const categorySlug = (locale: string) => snapshot.tables.catalog_public_categories.find((c) => c.locale === locale)!.code.toLowerCase().replace(/_/g, "-");
      const prefix = (l: string) => (l === "fa" ? "" : `/${l}`);
      const pages: [string, RegExp][] = [];
      for (const l of ["fa", "en", "ar"]) {
        pages.push([prefix(l) || "/", new RegExp(`<html[^>]*lang="${l}"`)]);
        pages.push([`${prefix(l)}/products`, /<html/]);
        pages.push([`${prefix(l)}/products/category/${categorySlug(l)}`, /<html/]);
        pages.push([`${prefix(l)}/products/${productSlug(l)}`, /"@type":"Product"/]);
        pages.push([`${prefix(l)}/contact`, new RegExp(`${RFQ_API_ORIGIN.replace(/\./g, "\\.")}/api/rfqs`)]);
      }
      for (const [page, must] of pages) {
        const r = await fetchText(`${STATIC_BASE_URL}${page}`);
        if (r.status !== 200 || !must.test(r.text)) throw new Error(`smoke ${page}: HTTP ${r.status}${r.status === 200 ? `, missing ${must}` : ""}`);
        if (env === "staging" && !/noindex/.test(r.headers.get("x-robots-tag") ?? "")) throw new Error(`smoke ${page}: staging X-Robots-Tag noindex missing`);
        if (TARGET.pageRobots && !TARGET.pageRobots.test(r.text)) throw new Error(`smoke ${page}: production page is not <meta name="robots" content="index, follow">`);
      }
      lines.push(
        env === "staging"
          ? `${pages.length} pages 200 (home, products, category, product with Product JSON-LD, contact × fa/en/ar), X-Robots-Tag noindex`
          : `${pages.length} pages 200 (home, products, category, product with Product JSON-LD, contact × fa/en/ar), each <meta robots "index, follow">; contact posts to ${RFQ_API_ORIGIN}`,
      );
      // /data/* is edge-cached for 300 s (lib/static/static-rules.ts), so a copy fetched shortly before the
      // deploy (e.g. by ops-health) is served until it expires (W8.1). Poll the exact visitor URL — no
      // cache-buster, so this checks what the browser form will load — for up to 330 s.
      const dataUntil = Date.now() + 330_000;
      for (const l of ["fa", "en", "ar"]) {
        for (;;) {
          const r = await fetchText(`${STATIC_BASE_URL}/data/rfq-catalog.${l}.json`);
          const v = r.status === 200 ? (JSON.parse(r.text) as { snapshot_version: string }).snapshot_version : null;
          if (v === version) break;
          if (Date.now() >= dataUntil) throw new Error(`smoke rfq-catalog.${l}.json: ${r.status} ${v}`);
          await new Promise((resolve) => setTimeout(resolve, 15_000));
        }
      }
      lines.push(`data/rfq-catalog.{fa,en,ar}.json carry ${version}`);
      const sitemap = await fetchText(`${STATIC_BASE_URL}/sitemap.xml`);
      if (sitemap.status !== 200 || !/<urlset/.test(sitemap.text)) throw new Error(`smoke sitemap.xml: ${sitemap.status}`);
      const robots = await fetchText(`${STATIC_BASE_URL}/robots.txt`);
      if (robots.status !== 200 || robots.text !== TARGET.robotsTxt) throw new Error(`smoke robots.txt: ${robots.status}, not the ${env} policy file`);
      const sitemapUrls = (sitemap.text.match(/<loc>/g) ?? []).length;
      if (sitemapUrls !== manifest.counts.sitemap_urls) throw new Error(`smoke sitemap.xml: ${sitemapUrls} URLs, the artifact has ${manifest.counts.sitemap_urls}`);
      for (const nf of ["/w4-smoke-missing-page", "/en/w4-smoke-missing-page", "/ar/products/w4-smoke-missing"]) {
        const r = await fetchText(`${STATIC_BASE_URL}${nf}`);
        if (r.status !== 404) throw new Error(`smoke ${nf}: expected 404, got ${r.status}`);
      }
      lines.push(`sitemap.xml (${sitemapUrls} URLs = artifact), robots.txt = the ${env} policy file, 404 × 3`);
      const form = spawnSync("node", ["scripts/static/hydration-check.ts", "--base-url", STATIC_BASE_URL, "--pages", "/contact,/en/contact,/ar/contact", "--expect-snapshot", version], { cwd: repoRoot, encoding: "utf8" });
      process.stdout.write(form.stdout);
      if (form.status !== 0) throw new Error(`smoke /contact form: ${form.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join(" | ") || form.stderr.slice(-400)}`);
      lines.push(`/contact fa/en/ar hydrated in Chrome; the form loads catalog_snapshot_version ${version}`);
      const health = await fetchText(TARGET.rfqHealthUrl);
      if (health.status !== 200) throw new Error(`smoke RFQ Worker /healthz: ${health.status}`);
      lines.push(`RFQ Worker ${TARGET.rfqHealthUrl} 200`);
      if (state.previous_active_version === null) {
        // First publication of this DB_PUBLIC: no publication_pointer row exists yet, and the RFQ Worker's
        // resolver reads through it, so it cannot resolve anything before the switch (by design). Check the
        // staged rows directly here; `switch` then runs the Worker's own resolver through the active path.
        const staged = await stagedIndexCheck();
        lines.push(`first publication (no pointer yet): ${staged}; the Worker's resolver runs right after the switch`);
      } else lines.push(...(await variantDryRun(version, version)).map((l) => `variant dry run (submitted ${version}) ${l}`));
      if (env === "staging" && process.env.CONTENT_SMOKE_FORCE_FAIL === "1") throw new Error("CONTENT_SMOKE_FORCE_FAIL=1: forced smoke failure after deploy (rollback test)");
      save("smoke_passed");
      summary(`### Publish: smoke PASS\n${lines.map((l) => `- ${l}`).join("\n")}`);
      break;
    }
    case "switch": {
      if (!state.steps.includes("smoke_passed")) throw new Error("smoke has not passed; refusing to switch");
      d1Exec(switchPointerSql(version, state.previous_active_version, now()));
      const active = await pointer();
      if (active !== version) throw new Error(`pointer switch did not apply (active ${active}); the pointer was moved or the version is not staged`);
      state.switched = true;
      save("switched");
      const dry = await variantDryRun(null, version);
      summary(`### Publish: switch\n- active_version \`${state.previous_active_version}\` -> \`${version}\`\n${dry.map((l) => `- variant dry run (no submitted version -> active) ${l}`).join("\n")}`);
      break;
    }
    case "finalize": {
      if (!state.switched) throw new Error("not switched");
      const snapshot = readSnapshotFile(path.join(p.artifact, "private-snapshot/snapshot.json"));
      // Production DB_PUBLIC holds publication state + rfq_variant_index only (the RFQ Worker's A8 reads); no mirror.
      const mirror = env === "production" ? [] : [...categoryReplaceBatches(snapshot.tables), ...batchStatements(mirrorStatements(snapshot.tables))];
      for (const b of mirror) d1Exec(b);
      const rows = await stateRows();
      const prune = versionsToPrune(rows, version, PIPELINE_CONFIG.retainVersions);
      const sql = pruneSql(prune, version);
      if (sql) d1Exec(sql);
      save("finalized");
      const after = await stateRows();
      summary(`### Publish: finalize\n- ${env === "production" ? "production DB_PUBLIC: no catalog mirror (not read by anything)" : `DB_PUBLIC catalog mirror updated (${mirror.length} atomic batches; Odoo-owned columns only)`}\n- retention ${PIPELINE_CONFIG.retainVersions}: pruned ${prune.length ? prune.map((v) => `\`${v}\``).join(", ") : "none"}; kept ${after.map((r) => `\`${r.version}\` ${r.status}`).join(", ")}`);
      break;
    }
    case "rollback": {
      const actions: string[] = [];
      state.rolled_back = actions;
      if (state.switched) {
        if (state.previous_active_version) {
          d1Exec(restorePointerSql(state.previous_active_version, version, now()));
          actions.push(`pointer restored to \`${state.previous_active_version}\`; \`${version}\` marked failed`);
        } else {
          d1Exec(clearFirstPointerSql(version, now()));
          actions.push(`first publication: the pointer row was removed (nothing published again); \`${version}\` marked failed`);
        }
      } else if (state.steps.includes("staged_state")) {
        d1Exec(failStagedSql(version, now()));
        actions.push(`staged \`${version}\` marked failed and its index rows removed; pointer untouched`);
      }
      if (state.steps.includes("deploy_started")) {
        const prev = state.previous_worker_version_id;
        if (!prev) throw new Error("no previous static Worker version recorded; cannot redeploy the previous artifact");
        if (currentWorkerVersionId() !== prev) {
          wrangler(["versions", "deploy", `${prev}@100%`, "--config", STATIC_CONFIG, "--env", env, "--yes", "--message", `content-publish rollback of ${version}`]);
          actions.push(`static Worker redeployed to previous version \`${prev}\` (the previous artifact's exact assets)`);
        } else actions.push(`static Worker already on previous version \`${prev}\``);
        if (state.previous_active_version) await waitForServedVersion(state.previous_active_version);
        actions.push(`${env} serves \`${state.previous_active_version}\` again (manifest.public.json)`);
      }
      const active = await pointer();
      if (active !== state.previous_active_version) throw new Error(`after rollback the pointer is ${active}, expected ${state.previous_active_version}`);
      actions.push(`verified: active_version = \`${active}\``);
      save("rolled_back");
      summary(`### ⚠️ Publish rolled back (\`${version}\`)\n${actions.map((a) => `- ${a}`).join("\n") || "- nothing was written; nothing to roll back"}`);
      annotate("error", "ALERT: content publish rolled back", `${version} rolled back; active_version ${active}`);
      break;
    }
    default:
      throw new Error(`unknown subcommand ${command}`);
  }
});
