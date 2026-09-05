import type { Category, IsolationTier } from "@marktplatz/schema";

/**
 * API contract this frontend is built against. The backend (Phase 3) does
 * not expose an HTTP layer yet — only the internal aggregation modules
 * (`backend/src/aggregation/*`) exist. This type mirrors
 * `backend/src/aggregation/metrics.ts` (`DeltaStats`, `SkillCategoryMetrics`)
 * field-for-field where that overlaps, and adds the fields this phase's
 * briefing requires that aggregation doesn't compute yet — see
 * `../../README.md`, section "Backend gap", for exactly what's missing and
 * why each field is needed.
 */

export interface ConfidenceInterval {
  low: number;
  high: number;
}

export interface DeltaStats {
  medianDelta: number | null;
  confidenceInterval: ConfidenceInterval | null;
  sampleSize: number;
}

export interface IsolationTierBreakdown {
  A: number;
  B: number;
  C: number;
}

export interface SkillCategoryDetail {
  category: Category;
  sampleSize: number;
  successDelta: DeltaStats;
  tokensDelta: DeltaStats;
  durationDelta: DeltaStats;
  /** `null` when no record in this skill+category has a non-null security_delta (e.g. category isn't code-adjacent). */
  securityDelta: DeltaStats | null;
  isolationTierBreakdown: IsolationTierBreakdown;
  distinctAccountCount: number;
  /** True when most of this category's sample came from Phase 6 seed data, not organic community runs. */
  seedDataMajority: boolean;
  /** Points at the raw, unaggregated records backing this exact category slice (briefing point 6). */
  exportUrl: string;
}

export interface SkillDetail {
  skillId: string;
  categories: SkillCategoryDetail[];
  /** Link to the open-source aggregation logic itself (briefing point 6) — not just an internal claim. */
  aggregationSourceUrl: string;
}

export interface SkillSummaryCategory {
  category: Category;
  sampleSize: number;
}

export interface SkillSummary {
  skillId: string;
  categories: SkillSummaryCategory[];
}

export interface SkillListResponse {
  skills: SkillSummary[];
  nextCursor: string | null;
}

/** Minimum runs in a category before a numeric delta is shown prominently (briefing point 2). */
export const MIN_SAMPLE_SIZE = 20;

/** Below this many distinct contributing accounts, diversity is flagged regardless of sample size (briefing point 4). */
export const LOW_ACCOUNT_DIVERSITY_THRESHOLD = 5;

export function hasEnoughData(sampleSize: number): boolean {
  return sampleSize >= MIN_SAMPLE_SIZE;
}

export function hasLowAccountDiversity(distinctAccountCount: number): boolean {
  return distinctAccountCount < LOW_ACCOUNT_DIVERSITY_THRESHOLD;
}

export const ALL_CATEGORIES: Category[] = ["debugging", "feature", "refactoring", "docs", "marketing", "other"];

export type { Category, IsolationTier };
