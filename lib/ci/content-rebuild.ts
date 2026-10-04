/**
 * CONTENT_REBUILD eligibility — docs/release/RELEASE_POLICY.md §19
 * (architecture V1.1 §7.3; owner decision D4, 2026-10-04,
 * docs/OWNER_DECISIONS.md).
 *
 * A content publication to production may run WITHOUT manual approval only
 * when it is a CONTENT_REBUILD:
 *
 *   1. the artifact's code_sha equals BASE_PRODUCTION_SHA — the RELEASE_SHA of
 *      the latest STABLE_100 ledger row (the last production code release that
 *      is 100% stable), resolved by the strict ledger validator;
 *   2. only static assets + the snapshot change: a content-pipeline artifact
 *      (private `pipeline` block present) built for the production target, with
 *      no executable or Worker configuration in public-assets/;
 *   3. every §7.1 gate passed, and the automatic smoke + automatic rollback of
 *      the publish job stay in force (they replace the manual approval).
 *
 * Manual approval is required (APPROVAL_REQUIRED) when the decrease gate was
 * overridden (allow_decrease, or any recorded overridden decrease) or a gate
 * failed. Anything else is REFUSED as a content rebuild: it is a code release
 * and takes the deploy-production.yml path (exact SHA, staging provenance,
 * HIGH canary). Pure: the CLI (content-rebuild-cli.ts) supplies the inputs.
 */
import { artifactManifest } from "../contracts/artifact-v1.ts";
import { resolveBaseProductionShaFromManifest } from "./release-ledger.ts";

export type ContentRebuildRefusal =
  | "LEDGER_MISSING"
  | "BASE_PRODUCTION_SHA_UNRESOLVED"
  | "MANIFEST_INVALID"
  | "NOT_A_CONTENT_PIPELINE_ARTIFACT"
  | "TARGET_NOT_PRODUCTION"
  | "CODE_SHA_MISMATCH"
  | "NOT_STATIC_ONLY";

export type ContentRebuildDecision =
  | { result: "AUTO"; codeSha: string; baseProductionSha: string; snapshotVersion: string; reasons: string[] }
  | { result: "APPROVAL_REQUIRED"; codeSha: string; baseProductionSha: string; snapshotVersion: string; reasons: string[] }
  | { result: "REFUSED"; code: ContentRebuildRefusal; reasons: string[]; codeSha: string | null; baseProductionSha: string | null; snapshotVersion: string | null };

export interface ContentRebuildInput {
  /** Parsed private manifest.json of the artifact. */
  manifest: unknown;
  /** docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md from the trusted ref, or null when it could not be read. */
  ledgerMarkdown: string | null;
  /** All §7.1 gates of the build (validate, publication/leak gate, checks) passed. */
  gatesPassed: boolean;
}

/** Public-assets paths that would make the deploy more than static assets (a script, routing or Worker config). */
export function nonStaticPublicPath(p: string): string | null {
  const base = p.split("/").pop() ?? p;
  if (base === "_worker.js" || p.startsWith("_worker.js/")) return "Worker script (_worker.js)";
  if (base === "_routes.json") return "routing config (_routes.json)";
  if (/^wrangler\.(jsonc?|toml)$/.test(base)) return "Worker configuration";
  if (p.startsWith("functions/")) return "Functions directory";
  return null;
}

export function evaluateContentRebuild(input: ContentRebuildInput): ContentRebuildDecision {
  const refused = (code: ContentRebuildRefusal, reasons: string[], extra: Partial<{ codeSha: string; baseProductionSha: string; snapshotVersion: string }> = {}): ContentRebuildDecision => ({
    result: "REFUSED",
    code,
    reasons,
    codeSha: extra.codeSha ?? null,
    baseProductionSha: extra.baseProductionSha ?? null,
    snapshotVersion: extra.snapshotVersion ?? null,
  });

  if (input.ledgerMarkdown === null) return refused("LEDGER_MISSING", ["the production release ledger could not be read"]);
  const base = resolveBaseProductionShaFromManifest(input.ledgerMarkdown);
  if (!base.ok) return refused("BASE_PRODUCTION_SHA_UNRESOLVED", [`${base.code}: ${base.reason}`]);
  const baseProductionSha = base.releaseSha;

  const parsed = artifactManifest.safeParse(input.manifest);
  if (!parsed.success) return refused("MANIFEST_INVALID", parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`), { baseProductionSha });
  const m = parsed.data;
  const ids = { codeSha: m.code_sha, baseProductionSha, snapshotVersion: m.snapshot_version };
  if (!m.pipeline) return refused("NOT_A_CONTENT_PIPELINE_ARTIFACT", ["manifest.json has no pipeline block (not built by the content pipeline)"], ids);
  if (m.environment !== "production") return refused("TARGET_NOT_PRODUCTION", [`artifact built for the ${m.environment} target`], ids);
  if (m.code_sha !== baseProductionSha) {
    return refused("CODE_SHA_MISMATCH", [`code_sha ${m.code_sha} is not the latest STABLE_100 release ${baseProductionSha}: this is a code release (deploy-production.yml, HIGH canary path)`], ids);
  }
  const nonStatic = m.public_assets.flatMap((f) => {
    const why = nonStaticPublicPath(f.path);
    return why ? [`public-assets/${f.path}: ${why}`] : [];
  });
  if (nonStatic.length) return refused("NOT_STATIC_ONLY", nonStatic, ids);

  const approval: string[] = [];
  if (m.pipeline.allow_decrease) approval.push("the decrease gate was overridden (allow_decrease)");
  if (m.pipeline.overridden_decreases.length) approval.push(`overridden decreases: ${m.pipeline.overridden_decreases.map((d) => `${d.key} ${d.previous}→${d.current}`).join(", ")}`);
  if (!input.gatesPassed) approval.push("a §7.1 gate failed");
  if (approval.length) return { result: "APPROVAL_REQUIRED", ...ids, reasons: approval };
  return { result: "AUTO", ...ids, reasons: ["code_sha is the latest STABLE_100 release; static assets + snapshot only; all gates passed"] };
}
