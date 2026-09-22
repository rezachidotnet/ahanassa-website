/**
 * Deterministic release-risk classifier — docs/release/RELEASE_POLICY.md.
 *
 * Classifies a changed-file set (git diff --name-status shape) into exactly
 * one of LOW / MEDIUM / HIGH, or AMBIGUOUS when the diff touches something
 * this module does not recognize. Classification is PATH-BASED ONLY:
 * no file count, no line count, no commit message, no semantic diff
 * interpretation. See RELEASE_POLICY.md §6/§7/§9/§10/§11 for the policy
 * text this module implements; every path group below is derived from a
 * real, audited directory in this repository (docs/release/
 * RELEASE_POLICY_IMPLEMENTATION_REPORT.md records the audit), never
 * invented.
 *
 * A path/category this module fails to anticipate does NOT silently become
 * MEDIUM — it is either caught by an explicit HIGH trigger, sits inside one
 * of the LOW/MEDIUM recognized trees below, or (the safety net) is outside
 * every recognized top-level entry and returns AMBIGUOUS.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export function riskAtLeast(a: RiskLevel, b: RiskLevel): boolean {
  return RISK_ORDER[a] >= RISK_ORDER[b];
}

export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Path taxonomy — the single source of truth for HIGH/LOW/MEDIUM/recognized
// membership. Keep this the ONLY place path lists live; everything else in
// this file is pure logic over these lists.
// ---------------------------------------------------------------------------

/** Directory prefixes are matched as `path === dir || path.startsWith(dir + "/")`. */
function underAny(path: string, dirs: readonly string[]): boolean {
  return dirs.some((d) => path === d || path.startsWith(`${d}/`));
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function extname(path: string): string {
  const b = basename(path);
  const i = b.lastIndexOf(".");
  return i === -1 ? "" : b.slice(i).toLowerCase();
}

// --- HIGH trigger groups (Phase 7 / RELEASE_POLICY.md §7) ------------------

/** RFQ submission / persistence / server-contract / critical UI paths. */
export const HIGH_RFQ_PATHS = [
  "app/api/rfqs",
  "app/[locale]/request",
  "app/[locale]/contact",
  "components/contact",
  "lib/rfq",
  "lib/queue",
  "lib/db",
] as const;

/**
 * Odoo website-client / API-contract paths. Includes the explicit contract
 * documentation directory CLAUDE.md §6 names as "the sole authoritative
 * catalog integration boundary" (docs/integrations/odoo/), plus every
 * catalog/processing sync file that writes data sourced from the Odoo Public
 * Catalog API v1 (CLAUDE.md §5, §6) into D1.
 */
export const HIGH_ODOO_CLIENT_PATHS = [
  "lib/odoo",
  "docs/integrations/odoo",
] as const;

/** Exact files (not directories) that are Odoo-client/sync-adjacent inside otherwise-MEDIUM directories. */
const HIGH_ODOO_CLIENT_FILES = new Set<string>([
  "lib/catalog/odoo-api-client.ts",
  "lib/catalog/odoo-api-client.test.ts",
  "lib/catalog/sync.ts",
  "lib/catalog/sync.test.ts",
  "lib/catalog/sync-runner.ts",
  "lib/catalog/sync-sql.ts",
  "lib/catalog/sync-sql.test.ts",
  "lib/catalog/sync-safety.ts",
  "lib/catalog/sync-safety.test.ts",
  "lib/catalog/sync-state-repository.ts",
  "lib/catalog/sync-health.ts",
  "lib/catalog/sync-health.test.ts",
  "lib/catalog/scheduled-sync.ts",
  "lib/catalog/group-label-sync.ts",
  "lib/catalog/group-label-sync.test.ts",
  "lib/catalog/group-label-sync-runner.ts",
  "lib/processing/odoo-api-client.ts",
  "lib/processing/odoo-api-client.test.ts",
  "lib/processing/sync.ts",
  "lib/processing/sync.test.ts",
  "lib/processing/sync-runner.ts",
  "lib/processing/sync-state-repository.ts",
  "lib/processing/scheduled-sync.ts",
  "lib/processing/repository.ts",
  "lib/processing/public-repository.ts",
  "lib/processing/public-repository.test.ts",
  "lib/processing/network-isolation.test.ts",
  "lib/pricing/sync-orchestrator.ts",
  "lib/pricing/sync-orchestrator.test.ts",
  "lib/pricing/sync-safety.ts",
  "lib/pricing/sync-safety.test.ts",
  "lib/pricing/repository-network-isolation.test.ts",
  "scripts/catalog-sync.ts",
]);

/** D1 schema/persistence/access layers not already covered by the RFQ or Odoo-client groups above. */
export const HIGH_PERSISTENCE_PATHS = [
  "migrations",
  "migrations_public",
] as const;

const HIGH_PERSISTENCE_FILES = new Set<string>([
  "lib/catalog/repository.ts",
  "lib/catalog/editorial-repository.ts",
  "lib/catalog/editorial-cli.ts",
  "lib/catalog/editorial-cli.test.ts",
  "lib/catalog/upsert-editorial-draft-atomicity.test.ts",
  "lib/pricing/repository.ts",
  "lib/pricing/repository.test.ts",
  "lib/pricing/provider-policy-repository.ts",
  "scripts/catalog-editorial.ts",
]);

/** Auth/anti-abuse security implementation paths gating RFQ submission and other write paths. */
export const HIGH_SECURITY_PATHS = ["lib/security"] as const;

/** Routing/canonical infrastructure configuration (locale rewrite + canonical locale routing table). */
const HIGH_ROUTING_CONFIG_FILES = new Set<string>(["proxy.ts", "config/locales.ts"]);

/** Worker/runtime infrastructure configuration, secret/binding configuration, and dependency manifest. */
const HIGH_RUNTIME_CONFIG_FILES = new Set<string>([
  "wrangler.jsonc",
  "vite.config.ts",
  "next.config.ts",
  "worker-configuration.d.ts",
  "package.json",
  "package-lock.json",
]);
export const HIGH_RUNTIME_CONFIG_PATHS = ["workers"] as const;

/** Release/deployment machinery: workflows, classifier code, invariant tests, and the ledger/policy documents themselves. */
export const HIGH_RELEASE_PATHS = [".github/workflows", "lib/ci"] as const;
const HIGH_RELEASE_FILES = new Set<string>([
  "docs/release/RELEASE_POLICY.md",
  "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md",
]);

/** Root governance/control-layer documents — CLAUDE.md §2's precedence system. */
export const HIGH_GOVERNANCE_PATHS = ["01-sources"] as const;
const HIGH_GOVERNANCE_FILES = new Set<string>([
  "CLAUDE.md",
  "PROJECT_OVERRIDES.md",
  "DOCS_INDEX.md",
  "DOCUMENT_AUDIT_REPORT.md",
]);

// --- LOW allowlist (Phase 6 / RELEASE_POLICY.md §6) -------------------------

/** Approved static-asset directories — a binary asset here is LOW; the same extension elsewhere is AMBIGUOUS. */
export const LOW_STATIC_ASSET_DIRS = ["public", "logo", "design-reference", "lib/fonts"] as const;

/** Content-only directories — copy/text data modules and the frozen-spec invariant tests guarding their shape. */
export const LOW_CONTENT_DIRS = ["lib/content"] as const;

/** Non-governance editorial/historical documentation and reference material. */
export const LOW_DOC_DIRS = ["docs", "v0-package"] as const;
/** Exceptions inside docs/ that are NOT non-governance editorial docs (already HIGH via HIGH_ODOO_CLIENT_PATHS/HIGH_RELEASE_FILES). */
const LOW_DOC_EXCEPTIONS = ["docs/integrations/odoo", "docs/release/RELEASE_POLICY.md", "docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md"];

/** Repository/editor tooling with no effect on the built/deployed artifact. */
export const LOW_TOOLING_DIRS = [".vscode", ".claude"] as const;
const LOW_TOOLING_FILES = new Set<string>([".gitignore", ".env.example", ".DS_Store", "tsconfig.tsbuildinfo"]);

/** Root-level editorial/report documents. */
const LOW_ROOT_DOC_FILES = new Set<string>([
  "README.md",
  "AHANASSA_HEADER_FINAL_FROZEN_V2.0.md",
  "V0_PACKAGE_VALIDATION.md",
  "PUSH_MANIFEST.md",
  "REPORT_BUNDLE_MANIFEST.txt",
]);

/**
 * Odoo server/module deployment is explicitly out of this policy's scope
 * (CLAUDE.md, RELEASE_POLICY.md §Scope) — odoo-modules/** never enters the
 * Cloudflare Worker build, so a change there carries zero website release
 * risk under this classifier. A separate Odoo release policy governs it.
 */
const OUT_OF_SCOPE_DIRS = ["odoo-modules"] as const;

const STATIC_ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".avif",
]);

const CSS_EXTENSION = ".css";

/** Every extension this classifier knows how to reason about at all. Anything else is AMBIGUOUS (Phase 5 — "opaque file types not covered by policy"). */
const KNOWN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".css",
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".sql",
  ".tsbuildinfo",
  ...STATIC_ASSET_EXTENSIONS,
]);

/** Recognized top-level directories — anything outside this set is a "new/unrecognized top-level directory" (AMBIGUOUS). */
const RECOGNIZED_TOP_LEVEL_DIRS = new Set([
  "app",
  "components",
  "config",
  "design-reference",
  "docs",
  "lib",
  "logo",
  "migrations",
  "migrations_public",
  "odoo-modules",
  "public",
  "scripts",
  "styles",
  "v0-package",
  "workers",
  ".github",
  "01-sources",
  ".claude",
  ".vscode",
]);

const RECOGNIZED_TOP_LEVEL_FILES = new Set([
  "CLAUDE.md",
  "PROJECT_OVERRIDES.md",
  "DOCS_INDEX.md",
  "DOCUMENT_AUDIT_REPORT.md",
  "README.md",
  "AHANASSA_HEADER_FINAL_FROZEN_V2.0.md",
  "V0_PACKAGE_VALIDATION.md",
  "PUSH_MANIFEST.md",
  "REPORT_BUNDLE_MANIFEST.txt",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.tsbuildinfo",
  "next.config.ts",
  "vite.config.ts",
  "postcss.config.mjs",
  "proxy.ts",
  "wrangler.jsonc",
  "worker-configuration.d.ts",
  ".gitignore",
  ".env.example",
  ".DS_Store",
]);

function topLevelEntry(path: string): string {
  return path.split("/")[0] ?? path;
}

/** True iff `path` sits inside a repository location this classifier has ever heard of — the AMBIGUOUS gate. */
export function isRecognizedTopLevel(path: string): boolean {
  const top = topLevelEntry(path);
  if (RECOGNIZED_TOP_LEVEL_FILES.has(path) && !path.includes("/")) return true;
  return RECOGNIZED_TOP_LEVEL_DIRS.has(top);
}

export interface PathClassification {
  risk: RiskLevel | "AMBIGUOUS";
  category: string;
  reason: string;
}

/**
 * Classifies a single repository-relative path in isolation. Order matches
 * RELEASE_POLICY.md §Phase 18 exactly: LOW allowlist -> explicit HIGH
 * triggers -> recognized app/runtime tree (MEDIUM) -> AMBIGUOUS.
 *
 * NOTE: per RELEASE_POLICY.md §6, "Any HIGH trigger forces HIGH" is an
 * absolute rule with no exception carved out for an otherwise-LOW-looking
 * path — the HIGH and LOW path groups above are curated to never overlap,
 * so evaluating LOW first is safe and matches the policy's literal
 * ordering without weakening the "HIGH always wins" guarantee.
 */
export function classifyPath(path: string): PathClassification {
  if (!isRecognizedTopLevel(path)) {
    return { risk: "AMBIGUOUS", category: "UNRECOGNIZED_TOP_LEVEL", reason: `"${topLevelEntry(path)}" is not a recognized top-level repository entry` };
  }

  if (underAny(path, OUT_OF_SCOPE_DIRS)) {
    return { risk: "LOW", category: "OUT_OF_SCOPE_ODOO_SERVER", reason: "odoo-modules/** never enters the Cloudflare Worker build — out of this policy's scope (governed by a separate Odoo release policy)" };
  }

  const ext = extname(path);
  if (ext !== "" && !KNOWN_EXTENSIONS.has(ext)) {
    return { risk: "AMBIGUOUS", category: "OPAQUE_FILE_TYPE", reason: `extension "${ext}" is not a recognized/covered file type` };
  }

  // --- LOW allowlist ---
  if (LOW_TOOLING_FILES.has(path) || underAny(path, LOW_TOOLING_DIRS)) {
    return { risk: "LOW", category: "REPO_TOOLING", reason: "repository/editor tooling configuration with no effect on the built/deployed artifact" };
  }
  if (LOW_ROOT_DOC_FILES.has(path)) {
    return { risk: "LOW", category: "ROOT_EDITORIAL_DOC", reason: "root-level editorial/report document" };
  }
  if (ext === CSS_EXTENSION) {
    return { risk: "LOW", category: "CSS_ONLY", reason: "CSS-only styling change" };
  }
  if (STATIC_ASSET_EXTENSIONS.has(ext)) {
    if (underAny(path, LOW_STATIC_ASSET_DIRS)) {
      return { risk: "LOW", category: "STATIC_ASSET", reason: "static asset inside an approved asset directory" };
    }
    return { risk: "AMBIGUOUS", category: "BINARY_OUTSIDE_APPROVED_ASSETS", reason: `binary asset "${path}" is outside every approved static-asset directory` };
  }
  if (underAny(path, LOW_CONTENT_DIRS)) {
    return { risk: "LOW", category: "CONTENT_ONLY", reason: "copy/text content module or its frozen-spec invariant test" };
  }
  if (underAny(path, LOW_DOC_DIRS) && !LOW_DOC_EXCEPTIONS.some((ex) => path === ex || path.startsWith(`${ex}/`))) {
    return { risk: "LOW", category: "NON_GOVERNANCE_DOC", reason: "non-governance editorial/historical documentation" };
  }

  // --- HIGH triggers ---
  if (underAny(path, HIGH_RFQ_PATHS)) {
    return { risk: "HIGH", category: "HIGH_RFQ_PATHS", reason: "RFQ submission/persistence/server-contract/critical-UI path" };
  }
  if (underAny(path, HIGH_ODOO_CLIENT_PATHS) || HIGH_ODOO_CLIENT_FILES.has(path)) {
    return { risk: "HIGH", category: "HIGH_ODOO_CLIENT_PATHS", reason: "Odoo website-client / API-contract path" };
  }
  if (underAny(path, HIGH_PERSISTENCE_PATHS) || HIGH_PERSISTENCE_FILES.has(path)) {
    return { risk: "HIGH", category: "HIGH_PERSISTENCE_PATHS", reason: "D1 schema/persistence/access-layer path" };
  }
  if (underAny(path, HIGH_SECURITY_PATHS) || basename(path).toLowerCase().includes("security")) {
    return { risk: "HIGH", category: "HIGH_SECURITY_PATHS", reason: "auth/security implementation path" };
  }
  if (HIGH_ROUTING_CONFIG_FILES.has(path)) {
    return { risk: "HIGH", category: "HIGH_ROUTING_CONFIG_PATHS", reason: "routing/canonical infrastructure configuration" };
  }
  if (HIGH_RUNTIME_CONFIG_FILES.has(path) || underAny(path, HIGH_RUNTIME_CONFIG_PATHS)) {
    return { risk: "HIGH", category: "HIGH_RUNTIME_CONFIG_PATHS", reason: "Worker/runtime infrastructure configuration or dependency manifest" };
  }
  if (underAny(path, HIGH_RELEASE_PATHS) || HIGH_RELEASE_FILES.has(path)) {
    return { risk: "HIGH", category: "HIGH_RELEASE_PATHS", reason: "release/deployment/classifier/workflow machinery" };
  }
  if (underAny(path, HIGH_GOVERNANCE_PATHS) || HIGH_GOVERNANCE_FILES.has(path)) {
    return { risk: "HIGH", category: "HIGH_GOVERNANCE_PATHS", reason: "root control-layer governance document" };
  }

  // --- Recognized application/runtime tree, no HIGH trigger ---
  if (underAny(path, ["app", "components", "lib", "config", "scripts", "styles"])) {
    return { risk: "MEDIUM", category: "RECOGNIZED_APP_RUNTIME", reason: "recognized application/runtime code with no HIGH trigger" };
  }

  // A recognized top-level entry with no more specific rule (e.g. a stray
  // root config file inside a recognized dir this module didn't anticipate)
  // is deliberately NOT defaulted to MEDIUM — Phase 18 only grants MEDIUM to
  // a *known* app/runtime tree, and falling through this far means the path
  // matched none of them.
  return { risk: "AMBIGUOUS", category: "UNRECOGNIZED_WITHIN_KNOWN_TOP_LEVEL", reason: "no recognized category claims this path" };
}

// ---------------------------------------------------------------------------
// Diff-level classification — RELEASE_POLICY.md §10 (mixed-diff highest-risk
// wins) and §11 (renames/deletions inspect git change status, not only the
// final pathname).
// ---------------------------------------------------------------------------

/** `git diff --name-status -M -C` change-status letters. */
export type ChangeStatus = "A" | "M" | "D" | "R" | "C" | "T";

export interface ChangedFile {
  /** The current/destination path. For a delete (D), this is the deleted path. */
  path: string;
  status: ChangeStatus;
  /** Present only for renames/copies (R/C). */
  oldPath?: string;
}

export interface FileEvidence {
  path: string;
  oldPath?: string;
  status: ChangeStatus;
  risk: RiskLevel | "AMBIGUOUS";
  reason: string;
}

/** Classifies one changed file, honoring rename/delete status per §11. */
export function classifyChangedFile(file: ChangedFile): FileEvidence {
  if (file.status === "D") {
    const c = classifyPath(file.path);
    if (c.risk === "HIGH") {
      return { path: file.path, status: file.status, risk: "HIGH", reason: `deletion of a HIGH-governed path: ${c.reason}` };
    }
    return { path: file.path, status: file.status, risk: c.risk, reason: `deletion — ${c.reason}` };
  }

  if (file.status === "R" || file.status === "C") {
    const oldPath = file.oldPath ?? file.path;
    const from = classifyPath(oldPath);
    const to = classifyPath(file.path);

    if (from.risk === "HIGH" || to.risk === "HIGH") {
      const side = from.risk === "HIGH" ? "source" : "destination";
      return {
        path: file.path,
        oldPath: file.oldPath,
        status: file.status,
        risk: "HIGH",
        reason: `rename/copy touching a HIGH-governed path on the ${side} side (${from.risk === "HIGH" ? from.reason : to.reason})`,
      };
    }
    if (from.risk === "AMBIGUOUS" || to.risk === "AMBIGUOUS") {
      return {
        path: file.path,
        oldPath: file.oldPath,
        status: file.status,
        risk: "AMBIGUOUS",
        reason: `rename/copy crosses a recognized/unrecognized boundary — source "${oldPath}" (${from.category}) vs destination "${file.path}" (${to.category})`,
      };
    }
    // Neither side is HIGH or AMBIGUOUS — take the higher of LOW/MEDIUM.
    const risk = maxRisk(from.risk as RiskLevel, to.risk as RiskLevel);
    return { path: file.path, oldPath: file.oldPath, status: file.status, risk, reason: `rename/copy, ${from.category} -> ${to.category}` };
  }

  // A / M / T — plain path classification.
  const c = classifyPath(file.path);
  return { path: file.path, status: file.status, risk: c.risk, reason: c.reason };
}

export type DiffClassification =
  | { status: "AMBIGUOUS"; reasons: string[]; evidence: FileEvidence[] }
  | { status: "CLASSIFIED"; risk: RiskLevel; triggeredBy: FileEvidence[]; evidence: FileEvidence[] };

/**
 * Classifies an entire diff. Highest risk wins across the whole file set
 * (§10 — "no majority vote or file-count weighting"). ANY file resolving to
 * AMBIGUOUS stops the whole classification — CLASSIFICATION_REQUIRED — even
 * if every other file in the diff is LOW.
 */
export function classifyDiff(files: ChangedFile[]): DiffClassification {
  const evidence = files.map(classifyChangedFile);
  const ambiguous = evidence.filter((e) => e.risk === "AMBIGUOUS");
  if (ambiguous.length > 0) {
    return { status: "AMBIGUOUS", reasons: ambiguous.map((e) => `${e.path}: ${e.reason}`), evidence };
  }
  if (evidence.length === 0) {
    // No changed files is not itself a real release; treat as the lowest risk with no triggers.
    return { status: "CLASSIFIED", risk: "LOW", triggeredBy: [], evidence: [] };
  }
  let risk: RiskLevel = "LOW";
  for (const e of evidence) risk = maxRisk(risk, e.risk as RiskLevel);
  const triggeredBy = evidence.filter((e) => e.risk === risk);
  return { status: "CLASSIFIED", risk, triggeredBy, evidence };
}

// ---------------------------------------------------------------------------
// Declared vs. computed risk — RELEASE_POLICY.md §9. Operator may escalate,
// may never downgrade the machine-computed minimum.
// ---------------------------------------------------------------------------

export function computeFinalRisk(declaredRisk: RiskLevel | undefined, computedMinimumRisk: RiskLevel): RiskLevel {
  if (declaredRisk === undefined) return computedMinimumRisk;
  return maxRisk(declaredRisk, computedMinimumRisk);
}

// ---------------------------------------------------------------------------
// git diff --name-status parsing helper (used by CI; exercised with
// synthetic fixtures in tests, never real live identifiers).
// ---------------------------------------------------------------------------

/**
 * Parses `git diff --name-status -M -C <base>..<candidate>` output into
 * ChangedFile records. Rename/copy lines look like `R100\told\tnew` (a
 * similarity percentage after the letter, old path, new path, tab-separated).
 */
export function parseNameStatus(output: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const line of output.split("\n")) {
    if (line.trim() === "") continue;
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const status = rawStatus[0] as ChangeStatus;
    if (status === "R" || status === "C") {
      const [, oldPath, newPath] = parts;
      if (!oldPath || !newPath) continue;
      files.push({ path: newPath, status, oldPath });
    } else {
      const [, path] = parts;
      if (!path) continue;
      files.push({ path, status });
    }
  }
  return files;
}
