import type { Category, SecurityDelta, SeverityCounts } from "@marktplatz/schema";
import { addSeverityCounts, emptySeverityCounts } from "./severityCounts.js";
import { scanWithBandit, scanWithNpmAudit, scanWithSemgrep } from "./scanners.js";

/** Code-adjacent categories that are scanned at all (plan section 4). */
const CODE_ADJACENT_CATEGORIES: ReadonlySet<Category> = new Set(["debugging", "feature", "refactoring"]);

export function isScanRelevant(category: Category): boolean {
  return CODE_ADJACENT_CATEGORIES.has(category);
}

/**
 * Combines every applicable scanner (Semgrep as the cross-language base,
 * npm audit/bandit as extras) into a single severity count for ONE
 * directory. The same scanner set for "with" and "without" is mandatory
 * (plan section 5C) — that's why this function is called identically for
 * both conditions, never configured differently.
 */
export async function scanDirectory(dir: string): Promise<SeverityCounts> {
  const [semgrep, npmAudit, bandit] = await Promise.all([
    scanWithSemgrep(dir),
    scanWithNpmAudit(dir),
    scanWithBandit(dir),
  ]);
  return [semgrep, npmAudit, bandit].reduce(addSeverityCounts, emptySeverityCounts());
}

/**
 * Determines `security_delta` for a RunResult. `null` if the category is
 * not code-adjacent (marketing/docs/other) — no scan is even attempted
 * there, not just the result discarded.
 */
export async function determineSecurityDelta(params: {
  category: Category;
  withSkillDir: string;
  withoutSkillDir: string;
}): Promise<SecurityDelta> {
  if (!isScanRelevant(params.category)) {
    return null;
  }
  const [with_skill, without_skill] = await Promise.all([
    scanDirectory(params.withSkillDir),
    scanDirectory(params.withoutSkillDir),
  ]);
  return { with_skill, without_skill };
}
