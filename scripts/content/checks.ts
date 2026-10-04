/**
 * Step 5 (architecture V1.1 §7.1 step 5): checks on the built artifact.
 * Typecheck and unit tests are separate workflow steps (`npx tsc --noEmit`,
 * `npm test`); this script runs, in order:
 *
 * 1. artifact gate again (separation, checksums, SEO, Persian/leak scan,
 *    publication gate) — the same gate the deploy step re-runs;
 * 2. internal links, image references, canonical/hreflang reciprocity,
 *    sitemap (lib/static/link-check.ts);
 * 3. hydration + no-RSC on every page, and ZERO console errors on the
 *    interactive pages (contact form, product listing/category filters,
 *    product variant highlight) — headless Chrome;
 * 4. the thin-content report (W5, D6) — report only, never fails the step.
 *
 *   node scripts/content/checks.ts --work <dir> [--skip-hydration]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { COMPANY_PUBLIC_NUMBERS } from "../../lib/content/contact-channels.ts";
import { listFiles, runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { checkLinks } from "../../lib/static/link-check.ts";
import { thinContentMarkdown, thinContentReport } from "../../lib/content-pipeline/thin-content.ts";
import { readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import { log as logger, parseArgs, paths, repoRoot, runStep, summary, workDir } from "./common.ts";

const args = parseArgs();
const log = logger("checks");

/** Interactive pages (form, filters): zero console errors required. */
const INTERACTIVE_PAGES = ["/contact", "/en/contact", "/ar/contact", "/products", "/en/products", "/ar/products", "/products/category/rebar", "/en/products/category/beam", "/ar/products/category/pipe"];

await runStep("checks", async () => {
  const p = paths(workDir(args.get("work")));
  const publicDir = path.join(p.artifact, "public-assets");

  const productionPublicDir = path.join(p.artifactProduction, "public-assets");
  for (const [target, dir] of [["staging", p.artifact], ["production", p.artifactProduction]] as const) {
    const gate = runArtifactGate(dir, { companyPhones: COMPANY_PUBLIC_NUMBERS });
    if (gate.failures.length) throw new Error(`artifact gate failed (${target}):\n${gate.failures.slice(0, 50).join("\n")}`);
    log(`gate ${target}: pass (${gate.stats.publicFiles} public files)`);
    const pub = path.join(dir, "public-assets");
    const files = listFiles(pub);
    const links = checkLinks(files, (f) => fs.readFileSync(path.join(pub, f), "utf8"));
    if (links.length) throw new Error(`link/image check failed (${target}, ${links.length}):\n${links.slice(0, 50).map((l) => `${l.kind} in ${l.file}: ${l.target}`).join("\n")}`);
    log(`links/images/hreflang/sitemap ${target}: pass (${files.filter((f) => f.endsWith(".html")).length} HTML files)`);
  }

  let hydration = "skipped";
  if (!args.has("skip-hydration")) {
    const all = spawnSync("node", ["scripts/static/hydration-check.ts", publicDir, "--all"], { cwd: repoRoot, encoding: "utf8" });
    process.stdout.write(all.stdout.split("\n").filter((l) => !l.startsWith("PASS")).join("\n"));
    if (all.status !== 0) throw new Error(`hydration/no-RSC check failed:\n${all.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`);
    const strict = spawnSync("node", ["scripts/static/hydration-check.ts", publicDir, "--pages", INTERACTIVE_PAGES.join(","), "--strict-console"], { cwd: repoRoot, encoding: "utf8" });
    process.stdout.write(strict.stdout);
    if (strict.status !== 0) throw new Error(`interactive pages have console errors:\n${strict.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`);
    // Production twin (r4): hydration on every page. Not --strict-console: its Turnstile key only accepts www.ahanassa.com.
    const prod = spawnSync("node", ["scripts/static/hydration-check.ts", productionPublicDir, "--all"], { cwd: repoRoot, encoding: "utf8" });
    if (prod.status !== 0) throw new Error(`production hydration/no-RSC check failed:\n${prod.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`);
    hydration = `staging ${/hydration: (\d+\/\d+)/.exec(all.stdout)?.[1]} pages clean; interactive ${/hydration: (\d+\/\d+)/.exec(strict.stdout)?.[1]} with zero console errors; production ${/hydration: (\d+\/\d+)/.exec(prod.stdout)?.[1]} pages clean`;
  }
  // Report only (D6): what Google will index with thin Odoo data. Never throws.
  try {
    summary(thinContentMarkdown(thinContentReport(readSnapshotFile(p.snapshot))));
  } catch (err) {
    log(`thin-content report skipped: ${err instanceof Error ? err.message : String(err)}`);
  }
  summary(`### Content checks: PASS\n- artifact gate (incl. publication gate, Persian leak scan, indexing gate), staging + production: pass\n- links, images, canonical/hreflang reciprocity, sitemap, staging + production: pass\n- hydration/no-RSC: ${hydration}`);
});
