import { executionKey, legacyExecution, type Execution } from "@skilldiff/schema";
import type { Category, IsolationTier, RunOutcome, SecurityDelta, SeverityCounts } from "@skilldiff/schema";
import { computeDeltaStats, type DeltaStats } from "./stats.js";

export interface StoredRunResult {
  execution?: Execution;
  runId: string;
  accountId: string;
  /** Briefing 06 point 4 — drives `seedDataMajority` below, kept separate from reputation/weight. */
  isSeedAccount: boolean;
  skillId: string;
  /** '' for rows stored before this column existed (migration 004) — never a real hash, which is always 64 hex chars. */
  skillContentHash: string;
  category: Category;
  isolationTier: IsolationTier;
  weight: number;
  withSkill: RunOutcome;
  withoutSkill: RunOutcome;
  securityDelta: SecurityDelta;
}

export interface IsolationTierBreakdown {
  A: number;
  B: number;
  C: number;
}

export interface SkillCategoryMetrics {
  execution?: Execution;
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
  /** Raw counts by isolation tier — transparency requirement from the frontend contract, not derived from the weight. */
  isolationTierBreakdown: IsolationTierBreakdown;
  /** Distinct contributing accounts — the "selektive Aufgabenwahl"/diversity signal from plan section 7. */
  distinctAccountCount: number;
  /** True when more than half of this slice's sample_size came from Phase-5 seed accounts (briefing 06 point 4). */
  seedDataMajority: boolean;
  /**
   * How many distinct `skill_content_hash` values contributed to this
   * slice — 1 means every measurement really was the same skill content;
   * >1 means this skill_id was measured across at least two different
   * versions of the skill, aggregated together anyway (see migration
   * 004's comment for why this is surfaced, not yet split on). A pure
   * transparency signal, same spirit as `isolationTierBreakdown`.
   */
  distinctContentHashCount: number;
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
  if (new Set(records.map((r) => executionKey(r.execution ?? legacyExecution))).size > 1) throw new Error("Cannot aggregate different agents, models or reasoning settings together");
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

  const isolationTierBreakdown: IsolationTierBreakdown = { A: 0, B: 0, C: 0 };
  for (const r of records) isolationTierBreakdown[r.isolationTier] += 1;

  const distinctAccountCount = new Set(records.map((r) => r.accountId)).size;

  const seedCount = records.filter((r) => r.isSeedAccount).length;
  const seedDataMajority = records.length > 0 && seedCount / records.length > 0.5;

  const distinctContentHashCount = new Set(records.map((r) => r.skillContentHash)).size;

  return {
    skillId,
    category,
    sampleSize: records.length,
    successDelta: computeDeltaStats(successValues, bootstrapOptions),
    tokensDelta: computeDeltaStats(tokensValues, bootstrapOptions),
    durationDelta: computeDeltaStats(durationValues, bootstrapOptions),
    securityDelta: securityValues.length > 0 ? computeDeltaStats(securityValues, bootstrapOptions) : null,
    isolationTierBreakdown,
    distinctAccountCount,
    seedDataMajority,
    distinctContentHashCount,
  };
}

/** Keep model cohorts separate even when no API filter is selected. */
export function aggregateExecutionGroups(skillId: string, category: Category, records: readonly StoredRunResult[]): SkillCategoryMetrics[] {
  const groups = new Map<string, StoredRunResult[]>();
  for (const record of records) {
    const key = executionKey(record.execution ?? legacyExecution);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.values()].map((group) => ({
    ...aggregateSkillCategory(skillId, category, group),
    execution: { ...(group[0]!.execution ?? legacyExecution), agent_version: new Set(group.map((r) => r.execution?.agent_version ?? "unknown")).size === 1 ? group[0]!.execution?.agent_version ?? "unknown" : "multiple" },
  }));
}
