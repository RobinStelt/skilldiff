import type { Category, RunOutcome } from "@marktplatz/schema";
import { readTestCoverage } from "./coverage.js";
import { countLintErrors } from "./lint.js";
import { computeDiffSize, estimateCyclomaticComplexity } from "./complexity.js";
import { computeReadabilityScore } from "./readability.js";

function ciStatus(success: boolean | null): "pass" | "fail" | "n/a" {
  if (success === null) return "n/a";
  return success ? "pass" : "fail";
}

interface ConditionContext {
  workDirCopy: string;
  runOutcome: RunOutcome;
}

/**
 * Builds `category_metrics` for ONE condition (with_skill OR
 * without_skill), matching the detected category (plan section 4, table).
 * Returns `null` for marketing/other — the schema has no automated signal
 * there.
 */
export async function determineCategoryMetricsForCondition(
  category: Category,
  originalWorkDir: string,
  condition: ConditionContext,
): Promise<Record<string, unknown> | null> {
  switch (category) {
    case "debugging":
    case "feature":
      return {
        test_coverage_pct: readTestCoverage(condition.workDirCopy),
        lint_errors: await countLintErrors(condition.workDirCopy),
        ci_status: ciStatus(condition.runOutcome.success),
      };
    case "refactoring":
      return {
        cyclomatic_complexity_before: estimateCyclomaticComplexity(originalWorkDir),
        cyclomatic_complexity_after: estimateCyclomaticComplexity(condition.workDirCopy),
        diff_size_loc: await computeDiffSize(originalWorkDir, condition.workDirCopy),
      };
    case "docs":
      return { readability_score: computeReadabilityScore(condition.workDirCopy) };
    case "marketing":
    case "other":
      return null;
  }
}
