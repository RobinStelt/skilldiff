import type { Pool } from "pg";
import type { Category } from "@marktplatz/schema";
import { fetchStoredRunResults, listSkillCategoryPairs, listSkillSummaries } from "../aggregation/repo.js";
import { aggregateSkillCategory } from "../aggregation/metrics.js";

/**
 * Response shapes for `GET /api/skills` and `GET /api/skills/:skillId` —
 * kept in exact field-for-field sync with `frontend/src/api/types.ts`
 * (`SkillListResponse`, `SkillDetail`). Two independent copies rather than
 * a shared package because the frontend intentionally has no runtime
 * dependency on the backend (see frontend/README.md) — if these ever
 * drift, the frontend's fixtures/tests are the trip-wire.
 */

export interface SkillListResponse {
  skills: Array<{ skillId: string; categories: Array<{ category: Category; sampleSize: number }> }>;
  nextCursor: string | null;
}

export async function listSkills(
  appPool: Pool,
  options: { category?: Category; cursor?: string | null },
): Promise<SkillListResponse> {
  const { skills, nextCursor } = await listSkillSummaries(appPool, options);
  return { skills, nextCursor };
}

export interface SkillDetailResponse {
  skillId: string;
  categories: Awaited<ReturnType<typeof aggregateSkillCategory>>[];
  aggregationSourceUrl: string;
}

export async function getSkillDetail(
  appPool: Pool,
  skillId: string,
  aggregationSourceUrl: string,
): Promise<SkillDetailResponse | null> {
  const pairs = await listSkillCategoryPairs(appPool, skillId);
  if (pairs.length === 0) return null;

  const categories = [];
  for (const pair of pairs) {
    const records = await fetchStoredRunResults(appPool, pair.skillId, pair.category);
    categories.push(aggregateSkillCategory(pair.skillId, pair.category, records));
  }
  return { skillId, categories, aggregationSourceUrl };
}

export function exportUrlFor(skillId: string, category: Category): string {
  return `/api/skills/${encodeURIComponent(skillId)}/export?category=${encodeURIComponent(category)}`;
}

/**
 * Raw, unaggregated records behind one skill+category slice — briefing
 * point 6 ("Nachrechenbarkeit"): a third party must be able to spot-check
 * the displayed aggregate against the actual data, not just trust it.
 * Still excludes plaintext content (content_ref/content lives only in the
 * access-restricted run_result_content table and is never joined in here).
 */
export interface RawExportRecord {
  runId: string;
  accountId: string;
  isolationTier: string;
  weight: number;
  withSkill: unknown;
  withoutSkill: unknown;
  securityDelta: unknown;
}

export async function getRawExportRecords(
  appPool: Pool,
  skillId: string,
  category: Category,
): Promise<RawExportRecord[]> {
  const records = await fetchStoredRunResults(appPool, skillId, category);
  return records.map((r) => ({
    runId: r.runId,
    accountId: r.accountId,
    isolationTier: r.isolationTier,
    weight: r.weight,
    withSkill: r.withSkill,
    withoutSkill: r.withoutSkill,
    securityDelta: r.securityDelta,
  }));
}
