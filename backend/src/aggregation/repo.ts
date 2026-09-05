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
    `SELECT r.run_id, r.skill_id, r.category, r.isolation_tier, r.weight,
            r.with_skill, r.without_skill, r.security_delta,
            r.account_id, a.is_seed_account
     FROM run_results r
     JOIN accounts a ON a.account_id = r.account_id
     WHERE r.skill_id = $1 AND r.category = $2`,
    [skillId, category],
  );
  return rows.map((row) => ({
    runId: row.run_id,
    accountId: row.account_id,
    isSeedAccount: row.is_seed_account,
    skillId: row.skill_id,
    category: row.category,
    isolationTier: row.isolation_tier,
    weight: Number(row.weight),
    withSkill: row.with_skill,
    withoutSkill: row.without_skill,
    securityDelta: row.security_delta,
  }));
}

export interface SkillSummaryRow {
  skillId: string;
  categories: Array<{ category: Category; sampleSize: number }>;
}

/**
 * Keyset-paginated list of skills that have at least one run, optionally
 * filtered to one category, for `GET /api/skills` (frontend contract,
 * `frontend/src/api/types.ts`). Ordered by skill_id so `cursor` (the last
 * skill_id seen) is stable across pages even as new runs land.
 */
export async function listSkillSummaries(
  appPool: Pool,
  options: { category?: Category; cursor?: string | null; limit?: number },
): Promise<{ skills: SkillSummaryRow[]; nextCursor: string | null }> {
  const limit = options.limit ?? 20;

  // Step 1: page through distinct skill_ids matching the filter (paginate on
  // skills, not on skill+category rows — a skill must not be split across pages).
  const idConditions: string[] = [];
  const idParams: unknown[] = [];
  if (options.category) {
    idParams.push(options.category);
    idConditions.push(`category = $${idParams.length}`);
  }
  if (options.cursor) {
    idParams.push(options.cursor);
    idConditions.push(`skill_id > $${idParams.length}`);
  }
  const idWhere = idConditions.length > 0 ? `WHERE ${idConditions.join(" AND ")}` : "";
  idParams.push(limit + 1); // fetch one extra to know whether another page follows

  const { rows: idRows } = await appPool.query(
    `SELECT DISTINCT skill_id FROM run_results ${idWhere} ORDER BY skill_id LIMIT $${idParams.length}`,
    idParams,
  );
  const allSkillIds: string[] = idRows.map((row) => row.skill_id);
  const page = allSkillIds.slice(0, limit);
  const nextCursor = allSkillIds.length > limit ? page[page.length - 1]! : null;

  if (page.length === 0) {
    return { skills: [], nextCursor: null };
  }

  // Step 2: full per-category breakdown for exactly the skills on this page
  // — unfiltered by `category`, since a skill's summary always lists every
  // category it has data in (the frontend applies the category filter to
  // which *skills* are listed, not to hiding a listed skill's own categories).
  const { rows: categoryRows } = await appPool.query(
    `SELECT skill_id, category, COUNT(*) AS sample_size
     FROM run_results
     WHERE skill_id = ANY($1::text[])
     GROUP BY skill_id, category`,
    [page],
  );

  const bySkill = new Map<string, Array<{ category: Category; sampleSize: number }>>();
  for (const row of categoryRows) {
    const list = bySkill.get(row.skill_id) ?? [];
    list.push({ category: row.category as Category, sampleSize: Number(row.sample_size) });
    bySkill.set(row.skill_id, list);
  }

  return {
    skills: page.map((skillId) => ({ skillId, categories: bySkill.get(skillId) ?? [] })),
    nextCursor,
  };
}
