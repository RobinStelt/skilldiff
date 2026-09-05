import type { Category, IsolationTier, RunOutcome, SecurityDelta, SeverityCounts } from "@marktplatz/schema";
import { computeDeltaStats, type DeltaStats } from "./stats.js";

export interface StoredRunResult {
  runId: string;
  skillId: string;
  category: Category;
  isolationTier: IsolationTier;
  weight: number;
  withSkill: RunOutcome;
  withoutSkill: RunOutcome;
  securityDelta: SecurityDelta;
}

export interface SkillCategoryMetrics {
  skillId: string;
  category: Category;
  sampleSize: number;
  /** Success-rate delta, 1/0/excluded-if-null (briefing point 3 — universal metric A). */
  successDelta: DeltaStats;
  /** Positive = with_skill used fewer tokens than without. */
  tokensDelta: DeltaStats;
  /** Positive = with_skill was faster than without. */
  durationDelta: DeltaStats;
  /**
   * Severity-weighted vulnerability count delta, positive = skill reduced
   * findings. Aggregated completely separately from success/tokens/duration
   * — "Security-Delta separat aggregiert ..., nicht in den Erfolgs-Score
   * verrechnet" (briefing point 3). `null` when no record in this
   * skill+category has a non-null security_delta (e.g. category is not
   * code-adjacent).
   */
  securityDelta: DeltaStats | null;
}

/** critical > high > medium > low — same relative weighting used for the SAST-scan delta everywhere else in this project. */
const SEVERITY_WEIGHT: Record<keyof SeverityCounts, number> = {
  critical: 8,
  high: 4,
  medium: 2,
  low: 1,
};

function severityScore(counts: SeverityCounts): number {
  return (
    counts.critical * SEVERITY_WEIGHT.critical +
    counts.high * SEVERITY_WEIGHT.high +
    counts.medium * SEVERITY_WEIGHT.medium +
    counts.low * SEVERITY_WEIGHT.low
  );
}

/**
 * Aggregates one already-filtered batch (single skill + single category —
 * callers must never pass mixed categories in, that's what would produce
 * the forbidden global single score, briefing point 3) into the four
 * independent metric classes.
 */
export function aggregateSkillCategory(
  skillId: string,
  category: Category,
  records: readonly StoredRunResult[],
  bootstrapOptions?: { iterations?: number; alpha?: number; rng?: () => number },
): SkillCategoryMetrics {
  const successValues = records
    .filter((r) => r.withSkill.success !== null && r.withoutSkill.success !== null)
    .map((r) => ({
      value: Number(r.withSkill.success) - Number(r.withoutSkill.success),
      weight: r.weight,
    }));

  const tokensValues = records.map((r) => ({
    value: r.withoutSkill.tokens - r.withSkill.tokens,
    weight: r.weight,
  }));

  const durationValues = records.map((r) => ({
    value: r.withoutSkill.duration_sec - r.withSkill.duration_sec,
    weight: r.weight,
  }));

  const securityRecords = records.filter(
    (r): r is StoredRunResult & { securityDelta: NonNullable<SecurityDelta> } => r.securityDelta !== null,
  );
  const securityValues = securityRecords.map((r) => ({
    value: severityScore(r.securityDelta.without_skill) - severityScore(r.securityDelta.with_skill),
    weight: r.weight,
  }));

  return {
    skillId,
    category,
    sampleSize: records.length,
    successDelta: computeDeltaStats(successValues, bootstrapOptions),
    tokensDelta: computeDeltaStats(tokensValues, bootstrapOptions),
    durationDelta: computeDeltaStats(durationValues, bootstrapOptions),
    securityDelta: securityValues.length > 0 ? computeDeltaStats(securityValues, bootstrapOptions) : null,
  };
}
