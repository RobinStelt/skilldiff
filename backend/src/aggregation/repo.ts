import type { Pool } from "pg";
import type { Category } from "@marktplatz/schema";
import type { StoredRunResult } from "./metrics.js";

/** Every distinct (skill_id, category) pair that has at least one record — drives both the per-skill metrics endpoint and the export job. */
export async function listSkillCategoryPairs(
  appPool: Pool,
  skillId?: string,
): Promise<Array<{ skillId: string; category: Category }>> {
  const { rows } = skillId
    ? await appPool.query(
        `SELECT DISTINCT skill_id, category FROM run_results WHERE skill_id = $1 ORDER BY skill_id, category`,
        [skillId],
      )
    : await appPool.query(`SELECT DISTINCT skill_id, category FROM run_results ORDER BY skill_id, category`);
  return rows.map((row) => ({ skillId: row.skill_id, category: row.category as Category }));
}

export async function fetchStoredRunResults(
  appPool: Pool,
  skillId: string,
  category: Category,
): Promise<StoredRunResult[]> {
  const { rows } = await appPool.query(
    `SELECT run_id, skill_id, category, isolation_tier, weight, with_skill, without_skill, security_delta
     FROM run_results WHERE skill_id = $1 AND category = $2`,
    [skillId, category],
  );
  return rows.map((row) => ({
    runId: row.run_id,
    skillId: row.skill_id,
    category: row.category,
    isolationTier: row.isolation_tier,
    weight: Number(row.weight),
    withSkill: row.with_skill,
    withoutSkill: row.without_skill,
    securityDelta: row.security_delta,
  }));
}
