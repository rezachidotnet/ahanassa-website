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
 *    product variant highlight) — headless Chrome.
 *
 *   node scripts/content/checks.ts --work <dir> [--skip-hydration]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CONTACT_PHONE_E164 } from "../../lib/content/contact-channels.ts";
import { listFiles, runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { checkLinks } from "../../lib/static/link-check.ts";
import { log as logger, parseArgs, paths, repoRoot, runStep, summary, workDir } from "./common.ts";

const args = parseArgs();
const log = logger("checks");

/** Interactive pages (form, filters): zero console errors required. */
const INTERACTIVE_PAGES = ["/contact", "/en/contact", "/ar/contact", "/products", "/en/products", "/ar/products", "/products/category/rebar", "/en/products/category/beam", "/ar/products/category/pipe"];

await runStep("checks", async () => {
  const p = paths(workDir(args.get("work")));
  const publicDir = path.join(p.artifact, "public-assets");

  const gate = runArtifactGate(p.artifact, { companyPhones: [CONTACT_PHONE_E164] });
  if (gate.failures.length) throw new Error(`artifact gate failed:\n${gate.failures.slice(0, 50).join("\n")}`);
  log(`gate: pass (${gate.stats.publicFiles} public files)`);

  const files = listFiles(publicDir);
  const links = checkLinks(files, (f) => fs.readFileSync(path.join(publicDir, f), "utf8"));
  if (links.length) throw new Error(`link/image check failed (${links.length}):\n${links.slice(0, 50).map((l) => `${l.kind} in ${l.file}: ${l.target}`).join("\n")}`);
  log(`links/images/hreflang/sitemap: pass (${files.filter((f) => f.endsWith(".html")).length} HTML files)`);

  let hydration = "skipped";
  if (!args.has("skip-hydration")) {
    const all = spawnSync("node", ["scripts/static/hydration-check.ts", publicDir, "--all"], { cwd: repoRoot, encoding: "utf8" });
    process.stdout.write(all.stdout.split("\n").filter((l) => !l.startsWith("PASS")).join("\n"));
    if (all.status !== 0) throw new Error(`hydration/no-RSC check failed:\n${all.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`);
    const strict = spawnSync("node", ["scripts/static/hydration-check.ts", publicDir, "--pages", INTERACTIVE_PAGES.join(","), "--strict-console"], { cwd: repoRoot, encoding: "utf8" });
    process.stdout.write(strict.stdout);
    if (strict.status !== 0) throw new Error(`interactive pages have console errors:\n${strict.stdout.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`);
    hydration = `${/hydration: (\d+\/\d+)/.exec(all.stdout)?.[1]} pages clean; interactive ${/hydration: (\d+\/\d+)/.exec(strict.stdout)?.[1]} with zero console errors`;
  }
  summary(`### Content checks: PASS\n- artifact gate (incl. publication gate, Persian leak scan): pass\n- links, images, canonical/hreflang reciprocity, sitemap: pass\n- hydration/no-RSC: ${hydration}`);
});
