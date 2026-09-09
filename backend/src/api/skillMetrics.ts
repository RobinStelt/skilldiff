import type { Pool } from "pg";
import { fetchStoredRunResults, listSkillCategoryPairs } from "../aggregation/repo.js";
import { aggregateExecutionGroups, type SkillCategoryMetrics } from "../aggregation/metrics.js";

/**
 * "Aggregations-Query für einen Skill liefert Ergebnisse pro Kategorie
 * getrennt" — one entry per category the skill has data for, never merged.
 * Structural, not a UI convention: callers get an array keyed by category,
 * there is no code path anywhere that sums across categories into one
 * number (briefing point 3 / acceptance criterion).
 */
export async function getSkillMetrics(appPool: Pool, skillId: string): Promise<SkillCategoryMetrics[]> {
  const pairs = await listSkillCategoryPairs(appPool, skillId);
  const results: SkillCategoryMetrics[] = [];
  for (const pair of pairs) {
    const records = await fetchStoredRunResults(appPool, pair.skillId, pair.category);
    results.push(...aggregateExecutionGroups(pair.skillId, pair.category, records));
  }
  return results;
}
