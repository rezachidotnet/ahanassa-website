/**
 * POLICY_BOOTSTRAP diff guard — docs/release/RELEASE_POLICY.md §Phase 15.
 *
 * The task that first stands up release governance (this one) is itself
 * governance-sensitive, but bootstrap must not become a loophole for
 * shipping application changes under cover of "policy work". A bootstrap
 * diff may contain only policy documents, CLAUDE.md governance
 * instructions, classifier/enforcement helpers and their tests, CI/release
 * governance workflow changes, and ledger/bootstrap evidence — never
 * application runtime feature code (RFQ runtime code, catalog runtime
 * feature changes, or any other unrelated UI/application behavior change).
 */

const BOOTSTRAP_ALLOWED_DIRS = ["docs", "lib/ci", ".github/workflows"] as const;
const BOOTSTRAP_ALLOWED_FILES = new Set<string>(["CLAUDE.md", "PROJECT_OVERRIDES.md", "DOCS_INDEX.md", "DOCUMENT_AUDIT_REPORT.md"]);

function underAny(path: string, dirs: readonly string[]): boolean {
  return dirs.some((d) => path === d || path.startsWith(`${d}/`));
}

export function isBootstrapAllowedPath(path: string): boolean {
  return BOOTSTRAP_ALLOWED_FILES.has(path) || underAny(path, BOOTSTRAP_ALLOWED_DIRS);
}

export type BootstrapDiffCheck =
  | { ok: true }
  | { ok: false; code: "BOOTSTRAP_RUNTIME_CODE_FORBIDDEN"; violatingPaths: string[] };

/**
 * Checks a POLICY_BOOTSTRAP diff's changed-file paths. Any path outside the
 * allowed governance surface fails the check — the caller (a bootstrap
 * registration workflow/script) must stop rather than register the diff.
 */
export function checkPolicyBootstrapDiff(paths: readonly string[]): BootstrapDiffCheck {
  const violatingPaths = paths.filter((p) => !isBootstrapAllowedPath(p));
  if (violatingPaths.length > 0) {
    return { ok: false, code: "BOOTSTRAP_RUNTIME_CODE_FORBIDDEN", violatingPaths };
  }
  return { ok: true };
}
