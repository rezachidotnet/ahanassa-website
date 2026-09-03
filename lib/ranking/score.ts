/**
 * Homepage Score composition + ranking-mode kill switch — this task's §13-20.
 * Pure, no D1/env dependency; `resolveHomepageRankingMode` is the one place
 * an arbitrary `env.HOMEPAGE_RANKING_MODE` string value is validated, so
 * every caller gets the same safe-default behavior.
 */

export type HomepageRankingMode = "base" | "auto";

/**
 * Missing or any unrecognized value safely falls back to `"base"`
 * (deterministic-only) — this task's explicit "must default safely to base
 * on missing/invalid config" requirement. Never throws.
 */
export function resolveHomepageRankingMode(raw: string | undefined): HomepageRankingMode {
  return raw === "auto" ? "auto" : "base";
}

export interface HomepageScoreInput {
  mode: HomepageRankingMode;
  /** Deterministic, editorially-set base priority (`homepage_product_rank.base_priority`, default 0 for a template with no row yet). */
  basePriority: number;
  /** Decayed RFQ-demand score (`lib/ranking/demand-aggregation.ts`) — ignored entirely in `"base"` mode, never merely zeroed-but-computed (defense in depth: a caller that forgets to skip the aggregation query in base mode still gets a correct score here). */
  demandScore: number;
  /** Simple editorial override, independent of raw demand — applied in both modes (an editorial pin/demotion is a presentation decision, not a demand signal). */
  manualBoost: number;
}

/** `Homepage Score = Base Priority + Recent Qualified RFQ Demand + Recent Distinct Demand + Optional Manual Boost` (this task's own formula) — `demandScore` here is already the combined frequency+distinct term from `aggregateDemandSignals`. */
export function computeHomepageScore(input: HomepageScoreInput): number {
  const demandTerm = input.mode === "auto" ? input.demandScore : 0;
  return input.basePriority + demandTerm + input.manualBoost;
}

export interface RankableCandidate {
  templateXid: string;
  score: number;
}

/**
 * Deterministic, stable ordering — highest score first; ties broken by
 * `templateXid` ascending (never by insertion/D1-scan order), so a
 * zero-demand catalog (every score identical) still produces a stable,
 * reproducible order across renders/requests (this task's Ranking
 * Stability requirement, Test H).
 */
export function sortByHomepageScore<T extends RankableCandidate>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => b.score - a.score || a.templateXid.localeCompare(b.templateXid));
}
