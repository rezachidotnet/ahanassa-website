/**
 * Release-time policy gate — docs/release/RELEASE_POLICY.md §0.2.
 *
 * Wires the tested engine (release-ledger.ts + release-risk-classifier.ts)
 * into a single fail-closed decision for one deploy-production.yml run:
 *
 *   BASE_PRODUCTION_SHA   <- latest STABLE_100 ledger row (strict read)
 *   changed files         <- git diff --name-status -z -M -C BASE..CANDIDATE
 *   COMPUTED_MINIMUM_RISK <- classifyDiff (AMBIGUOUS stops the release)
 *   FINAL_RISK            <- max(DECLARED_RISK, COMPUTED_MINIMUM_RISK)
 *   release path          <- the rollout/staging requirements FINAL_RISK allows
 *
 * This module holds no path taxonomy of its own — every path decision is
 * classifyDiff's. Git and the ledger are injected (ReleaseGateDeps) so the
 * logic is testable without a repository; release-gate-cli.ts supplies the
 * real implementations.
 *
 * Two decisions sit alongside the taxonomy, both fail-closed:
 *
 *   - Staging provenance is mandatory for every OPERATION_TYPE RELEASE at
 *     every FINAL_RISK (DAR-059). There is no break-glass for a normal
 *     release; skip_staging_provenance is refused outright.
 *   - A proven, append-only, historical ledger row addition is removed from
 *     risk computation (DAR-060) by ledger-append-exemption.ts — and only by
 *     it. Any other ledger change stays HIGH or stops the release.
 *
 * OPERATION_TYPE is always RELEASE here. EMERGENCY_ROLLBACK (§13) is a
 * distinct operation with its own validator (emergency-rollback.ts) and is
 * never routed through, or blocked by, this gate — removing the release
 * break-glass does not change, weaken or substitute for it.
 */

import { classifyDiff, classifyPath, computeFinalRisk, riskAtLeast, type ChangedFile, type RiskLevel } from "./release-risk-classifier.ts";
import { resolveBaseProductionShaFromManifest, type LedgerRow } from "./release-ledger.ts";
import {
  LEDGER_PATH,
  evaluateLedgerAppendExemption,
  type AppendedRowSummary,
  type LedgerAppendValidationCode,
} from "./ledger-append-exemption.ts";

export const RISK_LEVELS: readonly RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

/** Values deploy-production.yml's rollout_percentage input can carry at all. */
export const ROLLOUT_INPUT_VALUES = ["10", "50", "100"] as const;

/**
 * Rollout percentages each FINAL_RISK may use in deploy-production.yml —
 * exactly the release paths of RELEASE_POLICY.md §5:
 *   LOW / MEDIUM -> "direct 100%"  (canary not required)
 *   HIGH         -> "10% canary", then verify-production.yml, observation
 *                   (§12) and promote-production.yml (§11) — never direct 100%.
 * No policy path uses 50%, so no FINAL_RISK permits it. An operator who wants
 * a canary for a LOW/MEDIUM diff escalates DECLARED_RISK to HIGH (§6), which
 * keeps "every canary is a HIGH-path canary" true for promote-production.yml.
 */
export const PERMITTED_ROLLOUTS: Record<RiskLevel, readonly string[]> = {
  LOW: ["100"],
  MEDIUM: ["100"],
  HIGH: ["10"],
};

export const EXPECTED_RELEASE_PATH: Record<RiskLevel, string> = {
  LOW: "DIRECT_100: CI PASS -> staging validation -> production approval -> direct 100% -> production smoke (canary not required, RELEASE_POLICY.md §5)",
  MEDIUM:
    "DIRECT_100: CI PASS -> exact-SHA staging -> staging verification -> production approval -> direct 100% -> production smoke (canary not required, RELEASE_POLICY.md §5)",
  HIGH:
    "CANARY_10_THEN_PROMOTE: CI PASS -> exact-SHA staging -> staging provenance -> production approval -> 10% canary (this run) -> verify-production.yml -> observation record (§12) -> owner promotion approval -> promote-production.yml 100% (§11) -> production smoke",
};

export type BlockCode =
  | "CANDIDATE_SHA_INVALID"
  | "DECLARED_RISK_INVALID"
  | "ROLLOUT_INVALID"
  | "SKIP_STAGING_PROVENANCE_INVALID"
  | "LEDGER_UNREADABLE"
  | "LEDGER_MALFORMED"
  | "BASE_PRODUCTION_SHA_UNRESOLVED"
  | "BASE_COMMIT_MISSING"
  | "CANDIDATE_COMMIT_MISSING"
  | "CHANGESET_UNREADABLE"
  | "LEDGER_INTEGRITY_VIOLATION"
  | "CLASSIFICATION_REQUIRED"
  | "ROLLOUT_NOT_PERMITTED_FOR_RISK"
  | "STAGING_PROVENANCE_REQUIRED";

export interface ChangedFileRecord {
  status: string;
  path: string;
  old_path?: string;
  /** "EXEMPT" is only ever the validated historical ledger append (§7.1). */
  risk: RiskLevel | "AMBIGUOUS" | "EXEMPT";
  rule: string;
  reason: string;
}

/** The audit record — RELEASE_POLICY.md §15. Field names are the policy's own. */
export interface ReleasePolicyDecision {
  OPERATION_TYPE: "RELEASE";
  RESULT: "PERMITTED" | "BLOCKED";
  BLOCK_CODE: BlockCode | null;
  BLOCK_REASONS: string[];
  BASE_PRODUCTION_SHA: string | null;
  BASE_LEDGER_ROW: LedgerRow | null;
  BASE_IS_ANCESTOR_OF_CANDIDATE: boolean | null;
  CANDIDATE_SHA: string;
  DECLARED_RISK: RiskLevel | null;
  DECLARED_RISK_INPUT: string;
  COMPUTED_MINIMUM_RISK: RiskLevel | null;
  FINAL_RISK: RiskLevel | null;
  CLASSIFICATION_RESULT: "CLASSIFIED" | "CLASSIFICATION_REQUIRED" | "NOT_EVALUATED";
  TRIGGERED_RISK_RULES: string[];
  CHANGED_FILES: ChangedFileRecord[];
  /** DAR-060 audit fields — RELEASE_POLICY.md §7.1/§15. */
  LEDGER_CHANGE_PRESENT: boolean;
  LEDGER_APPEND_EXEMPTION_APPLIED: boolean;
  LEDGER_APPEND_VALIDATION_RESULT: LedgerAppendValidationCode | "NOT_EVALUATED";
  LEDGER_APPEND_REASONS: string[];
  LEDGER_APPENDED_ROWS: AppendedRowSummary[];
  ROLLOUT_PERCENTAGE: string;
  PERMITTED_ROLLOUT_PERCENTAGES: string[];
  CANARY_REQUIRED: boolean | null;
  /** Always true for OPERATION_TYPE RELEASE — LOW, MEDIUM and HIGH alike (DAR-059). */
  STAGING_PROVENANCE_REQUIRED: true;
  SKIP_STAGING_PROVENANCE: boolean | null;
  STAGING_PROVENANCE_RUN_ID: string;
  EXPECTED_RELEASE_PATH: string | null;
}

export interface ReleaseGateInput {
  candidateSha: string;
  declaredRisk: string | undefined;
  rolloutPercentage: string | undefined;
  skipStagingProvenance: string | undefined;
}

export interface ReleaseGateDeps {
  /** The authoritative ledger markdown, or null if it could not be read. */
  readLedger(): string | null;
  commitExists(sha: string): boolean;
  isAncestor(ancestor: string, descendant: string): boolean;
  /** Reads a repository file at a commit; null when it does not exist there. */
  readFileAtCommit(sha: string, filePath: string): string | null;
  /** Raw `git diff --name-status -z -M -C <base> <candidate>` output; throws on failure. */
  diffNameStatusZ(base: string, candidate: string): string;
}

const FULL_SHA = /^[0-9a-f]{40}$/;

export function parseDeclaredRisk(raw: string | undefined): { ok: true; risk: RiskLevel } | { ok: false; reason: string } {
  if (raw === undefined || raw === "") {
    return { ok: false, reason: "declared_risk is missing — an explicit LOW, MEDIUM, or HIGH declaration is required" };
  }
  if ((RISK_LEVELS as readonly string[]).includes(raw)) return { ok: true, risk: raw as RiskLevel };
  return { ok: false, reason: `declared_risk "${raw}" is not exactly one of LOW, MEDIUM, HIGH` };
}

/**
 * Parses NUL-delimited `git diff --name-status -z -M -C` output. -z is used
 * so paths are never C-quoted (a quoted path would misclassify). Any status
 * this gate does not understand (U unmerged, X unknown, B broken pair) or a
 * truncated record fails closed rather than being dropped.
 */
export function parseNameStatusZ(raw: string): { ok: true; files: ChangedFile[] } | { ok: false; reason: string } {
  const tokens = raw.split("\0");
  if (tokens[tokens.length - 1] === "") tokens.pop();
  const files: ChangedFile[] = [];
  let i = 0;
  while (i < tokens.length) {
    const status = tokens[i]!;
    if (/^[AMDT]$/.test(status)) {
      const path = tokens[i + 1];
      if (!path) return { ok: false, reason: `status "${status}" at token ${i} has no path` };
      files.push({ status: status as ChangedFile["status"], path });
      i += 2;
    } else if (/^[RC][0-9]{1,3}$/.test(status)) {
      const oldPath = tokens[i + 1];
      const newPath = tokens[i + 2];
      if (!oldPath || !newPath) return { ok: false, reason: `status "${status}" at token ${i} is missing its source or destination path` };
      files.push({ status: status[0] as ChangedFile["status"], path: newPath, oldPath });
      i += 3;
    } else {
      return { ok: false, reason: `unrecognized change status "${status}" at token ${i}` };
    }
  }
  return { ok: true, files };
}

function ruleFor(file: ChangedFile, risk: RiskLevel | "AMBIGUOUS"): string {
  const to = classifyPath(file.path);
  if (file.oldPath === undefined) return to.category;
  const from = classifyPath(file.oldPath);
  if (from.risk === risk && to.risk !== risk) return from.category;
  if (to.risk === risk && from.risk !== risk) return to.category;
  return from.category === to.category ? to.category : `${from.category}->${to.category}`;
}

export function evaluateReleaseGate(input: ReleaseGateInput, deps: ReleaseGateDeps): ReleasePolicyDecision {
  const d: ReleasePolicyDecision = {
    OPERATION_TYPE: "RELEASE",
    RESULT: "BLOCKED",
    BLOCK_CODE: null,
    BLOCK_REASONS: [],
    BASE_PRODUCTION_SHA: null,
    BASE_LEDGER_ROW: null,
    BASE_IS_ANCESTOR_OF_CANDIDATE: null,
    CANDIDATE_SHA: input.candidateSha,
    DECLARED_RISK: null,
    DECLARED_RISK_INPUT: input.declaredRisk ?? "",
    COMPUTED_MINIMUM_RISK: null,
    FINAL_RISK: null,
    CLASSIFICATION_RESULT: "NOT_EVALUATED",
    TRIGGERED_RISK_RULES: [],
    CHANGED_FILES: [],
    LEDGER_CHANGE_PRESENT: false,
    LEDGER_APPEND_EXEMPTION_APPLIED: false,
    LEDGER_APPEND_VALIDATION_RESULT: "NOT_EVALUATED",
    LEDGER_APPEND_REASONS: [],
    LEDGER_APPENDED_ROWS: [],
    ROLLOUT_PERCENTAGE: input.rolloutPercentage ?? "",
    PERMITTED_ROLLOUT_PERCENTAGES: [],
    CANARY_REQUIRED: null,
    STAGING_PROVENANCE_REQUIRED: true,
    SKIP_STAGING_PROVENANCE: null,
    STAGING_PROVENANCE_RUN_ID: "PENDING_A2",
    EXPECTED_RELEASE_PATH: null,
  };
  const block = (code: BlockCode, ...reasons: string[]): ReleasePolicyDecision => {
    d.RESULT = "BLOCKED";
    d.BLOCK_CODE = code;
    d.BLOCK_REASONS = reasons;
    return d;
  };

  // --- Inputs (format only) ---
  if (!FULL_SHA.test(input.candidateSha)) {
    return block("CANDIDATE_SHA_INVALID", `candidate "${input.candidateSha}" is not a full 40-character lowercase commit SHA`);
  }
  const declared = parseDeclaredRisk(input.declaredRisk);
  if (!declared.ok) return block("DECLARED_RISK_INVALID", declared.reason);
  d.DECLARED_RISK = declared.risk;

  if (!(ROLLOUT_INPUT_VALUES as readonly string[]).includes(input.rolloutPercentage ?? "")) {
    return block("ROLLOUT_INVALID", `rollout_percentage "${input.rolloutPercentage ?? ""}" is not one of ${ROLLOUT_INPUT_VALUES.join(", ")}`);
  }
  // DAR-059: deploy-production.yml no longer exposes a skip_staging_provenance
  // input at all, so the gate normally sees "false" or nothing. The value is
  // still parsed (and "true" still refused below, after classification, so the
  // audit record names the FINAL_RISK it was refused for) purely as defense in
  // depth against the input being reintroduced.
  if (input.skipStagingProvenance !== undefined && input.skipStagingProvenance !== "" && input.skipStagingProvenance !== "true" && input.skipStagingProvenance !== "false") {
    return block("SKIP_STAGING_PROVENANCE_INVALID", `skip_staging_provenance "${input.skipStagingProvenance}" is not exactly "true" or "false"`);
  }
  d.SKIP_STAGING_PROVENANCE = input.skipStagingProvenance === "true";

  // --- Baseline (RELEASE_POLICY.md §2) ---
  const ledger = deps.readLedger();
  if (ledger === null) return block("LEDGER_UNREADABLE", "the release ledger could not be read from the trusted policy ref");
  const base = resolveBaseProductionShaFromManifest(ledger);
  if (!base.ok) return block(base.code, base.reason);
  d.BASE_PRODUCTION_SHA = base.releaseSha;
  d.BASE_LEDGER_ROW = base.row;

  if (!deps.commitExists(base.releaseSha)) {
    return block("BASE_COMMIT_MISSING", `BASE_PRODUCTION_SHA ${base.releaseSha} (latest STABLE_100 ledger row) is not present in this repository's git history`);
  }
  if (!deps.commitExists(input.candidateSha)) {
    return block("CANDIDATE_COMMIT_MISSING", `candidate ${input.candidateSha} is not present in this repository's git history`);
  }
  d.BASE_IS_ANCESTOR_OF_CANDIDATE = deps.isAncestor(base.releaseSha, input.candidateSha);

  // --- Change set (RELEASE_POLICY.md §10) ---
  let raw: string;
  try {
    raw = deps.diffNameStatusZ(base.releaseSha, input.candidateSha);
  } catch (e) {
    return block("CHANGESET_UNREADABLE", `git diff ${base.releaseSha}..${input.candidateSha} failed: ${(e as Error).message}`);
  }
  const parsed = parseNameStatusZ(raw);
  if (!parsed.ok) return block("CHANGESET_UNREADABLE", parsed.reason);

  // --- Validated historical ledger append (RELEASE_POLICY.md §7.1, DAR-060) ---
  // Evaluated BEFORE classification, because the only thing it can do is
  // remove one proven append-only ledger change from the set classifyDiff
  // sees. It never reclassifies anything, and it never lowers any other
  // file's risk.
  const ledgerAppend = evaluateLedgerAppendExemption({
    changedFiles: parsed.files,
    baseProductionSha: base.releaseSha,
    candidateSha: input.candidateSha,
    readFileAtCommit: deps.readFileAtCommit,
  });
  d.LEDGER_CHANGE_PRESENT = ledgerAppend.ledgerChangePresent;
  d.LEDGER_APPEND_EXEMPTION_APPLIED = ledgerAppend.exemptionApplied;
  d.LEDGER_APPEND_VALIDATION_RESULT = ledgerAppend.code;
  d.LEDGER_APPEND_REASONS = ledgerAppend.reasons;
  d.LEDGER_APPENDED_ROWS = ledgerAppend.appendedRows;
  if (ledgerAppend.failClosed) {
    return block(
      "LEDGER_INTEGRITY_VIOLATION",
      `the candidate's release ledger cannot be trusted (${ledgerAppend.code}) — no risk level can be assigned safely (RELEASE_POLICY.md §7.1)`,
      ...ledgerAppend.reasons,
    );
  }

  // --- Classification (RELEASE_POLICY.md §6/§9) ---
  const exemptIndex = ledgerAppend.exemptionApplied ? parsed.files.findIndex((f) => f.path === LEDGER_PATH) : -1;
  const classifiable = parsed.files.filter((_, i) => i !== exemptIndex);
  const classification = classifyDiff(classifiable);
  const records: ChangedFileRecord[] = [];
  let ei = 0;
  for (let i = 0; i < parsed.files.length; i += 1) {
    if (i === exemptIndex) {
      records.push({
        status: parsed.files[i]!.status,
        path: LEDGER_PATH,
        risk: "EXEMPT",
        rule: "VALIDATED_HISTORICAL_LEDGER_APPEND",
        reason: ledgerAppend.reasons[0] ?? "validated append-only historical ledger row addition (RELEASE_POLICY.md §7.1)",
      });
      continue;
    }
    const file = parsed.files[i]!;
    const e = classification.evidence[ei]!;
    ei += 1;
    const record: ChangedFileRecord = { status: e.status, path: e.path, risk: e.risk, rule: ruleFor(file, e.risk), reason: e.reason };
    if (e.oldPath !== undefined) record.old_path = e.oldPath;
    records.push(record);
  }
  d.CHANGED_FILES = records;

  if (classification.status === "AMBIGUOUS") {
    d.CLASSIFICATION_RESULT = "CLASSIFICATION_REQUIRED";
    d.TRIGGERED_RISK_RULES = [...new Set(d.CHANGED_FILES.filter((f) => f.risk === "AMBIGUOUS").map((f) => f.rule))].sort();
    return block(
      "CLASSIFICATION_REQUIRED",
      "the diff contains path(s) the policy does not classify deterministically — resolved only by the operator or a RELEASE_POLICY.md amendment, never by picking a class (RELEASE_POLICY.md §9)",
      ...classification.reasons,
    );
  }

  d.CLASSIFICATION_RESULT = "CLASSIFIED";
  d.COMPUTED_MINIMUM_RISK = classification.risk;
  const finalRisk = computeFinalRisk(declared.risk, classification.risk);
  d.FINAL_RISK = finalRisk;
  const rules = new Set(d.CHANGED_FILES.filter((f) => f.risk === classification.risk).map((f) => f.rule));
  if (!riskAtLeast(classification.risk, declared.risk)) rules.add(`DECLARED_RISK_ESCALATION:${declared.risk}`);
  d.TRIGGERED_RISK_RULES = [...rules].sort();
  d.PERMITTED_ROLLOUT_PERCENTAGES = [...PERMITTED_ROLLOUTS[finalRisk]];
  d.CANARY_REQUIRED = finalRisk === "HIGH";
  d.EXPECTED_RELEASE_PATH = EXPECTED_RELEASE_PATH[finalRisk];

  // --- Release-path enforcement (RELEASE_POLICY.md §5) ---
  if (!PERMITTED_ROLLOUTS[finalRisk].includes(d.ROLLOUT_PERCENTAGE)) {
    return block(
      "ROLLOUT_NOT_PERMITTED_FOR_RISK",
      finalRisk === "HIGH"
        ? `FINAL_RISK is HIGH: rollout_percentage must be 10 (the canary entry leg). A HIGH release never goes directly to ${d.ROLLOUT_PERCENTAGE}% — it reaches 100% only through verify-production.yml, an observation record and promote-production.yml (RELEASE_POLICY.md §5/§11/§12)`
        : `FINAL_RISK is ${finalRisk}: its policy path is a direct 100% release, so rollout_percentage must be 100 (got ${d.ROLLOUT_PERCENTAGE}). To run a canary, re-dispatch with declared_risk HIGH (RELEASE_POLICY.md §6 escalation)`,
    );
  }
  if (d.SKIP_STAGING_PROVENANCE) {
    return block(
      "STAGING_PROVENANCE_REQUIRED",
      `FINAL_RISK is ${finalRisk}: staging provenance is mandatory for every OPERATION_TYPE RELEASE — LOW, MEDIUM and HIGH alike. A normal release has no staging-provenance bypass (RELEASE_POLICY.md §5, DOCUMENT_AUDIT_REPORT.md DAR-059)`,
      "EMERGENCY_ROLLBACK (RELEASE_POLICY.md §13) is a separate operation with its own recorded-target contract — it is not a release-risk or staging bypass, and this input is never repurposed as one",
    );
  }

  d.RESULT = "PERMITTED";
  return d;
}

// ---------------------------------------------------------------------------
// Rendering — GitHub Job Summary (markdown) and workflow outputs.
// ---------------------------------------------------------------------------

const SUMMARY_FILE_LIMIT = 300;

function mdCell(v: string): string {
  return v.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function renderDecisionMarkdown(d: ReleasePolicyDecision): string {
  const code = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "-" : `\`${mdCell(v)}\``);
  const out: string[] = [];
  out.push("### Release policy gate (RELEASE_POLICY.md §0.2)", "");
  out.push(d.RESULT === "PERMITTED" ? "**RESULT: PERMITTED**" : `**RESULT: BLOCKED — \`${d.BLOCK_CODE}\`**`, "");
  out.push("| field | value |", "| --- | --- |");
  const rows: Array<[string, string]> = [
    ["OPERATION_TYPE", code(d.OPERATION_TYPE)],
    ["BASE_PRODUCTION_SHA", code(d.BASE_PRODUCTION_SHA)],
    ["CANDIDATE_SHA", code(d.CANDIDATE_SHA)],
    ["BASE_IS_ANCESTOR_OF_CANDIDATE", code(d.BASE_IS_ANCESTOR_OF_CANDIDATE === null ? null : String(d.BASE_IS_ANCESTOR_OF_CANDIDATE))],
    ["DECLARED_RISK", code(d.DECLARED_RISK ?? (d.DECLARED_RISK_INPUT ? `INVALID: ${d.DECLARED_RISK_INPUT}` : null))],
    ["COMPUTED_MINIMUM_RISK", code(d.COMPUTED_MINIMUM_RISK)],
    ["FINAL_RISK", code(d.FINAL_RISK)],
    ["CLASSIFICATION_RESULT", code(d.CLASSIFICATION_RESULT)],
    ["TRIGGERED_RISK_RULES", d.TRIGGERED_RISK_RULES.length ? d.TRIGGERED_RISK_RULES.map((r) => code(r)).join(", ") : "-"],
    ["ROLLOUT_PERCENTAGE", code(d.ROLLOUT_PERCENTAGE)],
    ["PERMITTED_ROLLOUT_PERCENTAGES", d.PERMITTED_ROLLOUT_PERCENTAGES.length ? d.PERMITTED_ROLLOUT_PERCENTAGES.map((r) => code(r)).join(", ") : "-"],
    ["CANARY_REQUIRED", code(d.CANARY_REQUIRED === null ? null : String(d.CANARY_REQUIRED))],
    ["LEDGER_CHANGE_PRESENT", code(String(d.LEDGER_CHANGE_PRESENT))],
    ["LEDGER_APPEND_EXEMPTION_APPLIED", code(String(d.LEDGER_APPEND_EXEMPTION_APPLIED))],
    ["LEDGER_APPEND_VALIDATION_RESULT", code(d.LEDGER_APPEND_VALIDATION_RESULT)],
    ["STAGING_PROVENANCE_REQUIRED", code(String(d.STAGING_PROVENANCE_REQUIRED))],
    ["SKIP_STAGING_PROVENANCE", code(d.SKIP_STAGING_PROVENANCE === null ? null : String(d.SKIP_STAGING_PROVENANCE))],
    ["STAGING_PROVENANCE_RUN_ID", code(d.STAGING_PROVENANCE_RUN_ID)],
    ["EXPECTED_RELEASE_PATH", code(d.EXPECTED_RELEASE_PATH)],
    ["CHANGED_FILES", String(d.CHANGED_FILES.length)],
  ];
  for (const [k, v] of rows) out.push(`| ${k} | ${v} |`);
  if (d.LEDGER_CHANGE_PRESENT && d.LEDGER_APPEND_REASONS.length) {
    out.push("", `**Ledger append (\`${mdCell(d.LEDGER_APPEND_VALIDATION_RESULT)}\`):**`, "");
    for (const r of d.LEDGER_APPEND_REASONS) out.push(`- ${r}`);
  }
  if (d.BLOCK_REASONS.length) {
    out.push("", "**Block reasons:**", "");
    for (const r of d.BLOCK_REASONS) out.push(`- ${r}`);
  }
  if (d.CHANGED_FILES.length) {
    out.push("", `<details><summary>CHANGED_FILES (${d.CHANGED_FILES.length})</summary>`, "");
    out.push("| status | path | risk | rule |", "| --- | --- | --- | --- |");
    for (const f of d.CHANGED_FILES.slice(0, SUMMARY_FILE_LIMIT)) {
      const p = f.old_path !== undefined ? `${f.old_path} -> ${f.path}` : f.path;
      out.push(`| ${f.status} | \`${mdCell(p)}\` | ${f.risk} | ${mdCell(f.rule)} |`);
    }
    if (d.CHANGED_FILES.length > SUMMARY_FILE_LIMIT) {
      out.push("", `(${d.CHANGED_FILES.length - SUMMARY_FILE_LIMIT} more — the full list is in the release-policy-audit artifact)`);
    }
    out.push("", "</details>");
  }
  out.push("");
  return out.join("\n");
}

export function decisionOutputs(d: ReleasePolicyDecision): Record<string, string> {
  return {
    result: d.RESULT,
    block_code: d.BLOCK_CODE ?? "",
    base_production_sha: d.BASE_PRODUCTION_SHA ?? "",
    candidate_sha: d.CANDIDATE_SHA,
    declared_risk: d.DECLARED_RISK ?? "",
    computed_minimum_risk: d.COMPUTED_MINIMUM_RISK ?? "",
    final_risk: d.FINAL_RISK ?? "",
    classification_result: d.CLASSIFICATION_RESULT,
    ledger_change_present: String(d.LEDGER_CHANGE_PRESENT),
    ledger_append_exemption_applied: String(d.LEDGER_APPEND_EXEMPTION_APPLIED),
    ledger_append_validation_result: d.LEDGER_APPEND_VALIDATION_RESULT,
    expected_release_path: d.EXPECTED_RELEASE_PATH ?? "",
  };
}
