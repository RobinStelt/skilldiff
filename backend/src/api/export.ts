import type { Pool } from "pg";
import { fetchStoredRunResults, listSkillCategoryPairs } from "../aggregation/repo.js";
import { aggregateExecutionGroups, type SkillCategoryMetrics } from "../aggregation/metrics.js";

/**
 * Read-only export of aggregated numbers only — never raw records, never
 * plaintext content_ref/content (briefing point 6 / acceptance criterion).
 * This is the recomputability basis from plan section 7 ("Vertrauens-
 * prinzip"): anyone can pull this and re-derive the marketplace's own
 * displayed numbers.
 */
export async function getAllSkillMetrics(appPool: Pool): Promise<SkillCategoryMetrics[]> {
  const pairs = await listSkillCategoryPairs(appPool);
  const results: SkillCategoryMetrics[] = [];
  for (const pair of pairs) {
    const records = await fetchStoredRunResults(appPool, pair.skillId, pair.category);
    results.push(...aggregateExecutionGroups(pair.skillId, pair.category, records));
  }
  return results;
}

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const CSV_HEADER = [
  "skill_id",
  "category",
  "agent",
  "model",
  "reasoning_effort",
  "sample_size",
  "success_delta_median",
  "success_delta_ci_low",
  "success_delta_ci_high",
  "tokens_delta_median",
  "tokens_delta_ci_low",
  "tokens_delta_ci_high",
  "duration_delta_median",
  "duration_delta_ci_low",
  "duration_delta_ci_high",
  "security_delta_median",
  "security_delta_ci_low",
  "security_delta_ci_high",
  "security_delta_sample_size",
];

export function toCsv(metrics: readonly SkillCategoryMetrics[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const m of metrics) {
    lines.push(
      [
        csvCell(m.skillId),
        csvCell(m.category),
        csvCell(m.execution?.agent ?? "claude"),
        csvCell(m.execution?.model ?? "unknown"),
        csvCell(m.execution?.reasoning_effort ?? ""),
        csvCell(m.sampleSize),
        csvCell(m.successDelta.medianDelta ?? ""),
        csvCell(m.successDelta.confidenceInterval?.low ?? ""),
        csvCell(m.successDelta.confidenceInterval?.high ?? ""),
        csvCell(m.tokensDelta.medianDelta ?? ""),
        csvCell(m.tokensDelta.confidenceInterval?.low ?? ""),
        csvCell(m.tokensDelta.confidenceInterval?.high ?? ""),
        csvCell(m.durationDelta.medianDelta ?? ""),
        csvCell(m.durationDelta.confidenceInterval?.low ?? ""),
        csvCell(m.durationDelta.confidenceInterval?.high ?? ""),
        csvCell(m.securityDelta?.medianDelta ?? ""),
        csvCell(m.securityDelta?.confidenceInterval?.low ?? ""),
        csvCell(m.securityDelta?.confidenceInterval?.high ?? ""),
        csvCell(m.securityDelta?.sampleSize ?? ""),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}
