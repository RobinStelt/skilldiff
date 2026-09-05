import type { Pool } from "pg";
import type { Category } from "@marktplatz/schema";
import { fetchStoredRunResults, listSkillCategoryPairs, listSkillSummaries } from "../aggregation/repo.js";
import { aggregateSkillCategory } from "../aggregation/metrics.js";
import type { SkillMetadataStore } from "../admin/skillMetadataStore.js";

/**
 * Response shapes for `GET /api/skills` and `GET /api/skills/:skillId` —
 * kept in exact field-for-field sync with `frontend/src/api/types.ts`
 * (`SkillListResponse`, `SkillDetail`). Two independent copies rather than
 * a shared package because the frontend intentionally has no runtime
 * dependency on the backend (see frontend/README.md) — if these ever
 * drift, the frontend's fixtures/tests are the trip-wire.
 */

/** Display-safe subset of skill_metadata — no admin-only fields (created_by etc.). `null` when the skill has runs but was never catalogued by an admin. */
export interface PublicSkillMetadata {
  name: string;
  description: string | null;
  githubUrl: string | null;
  license: string | null;
  maintainer: string | null;
  declaredCategory: string | null;
  githubStars: number | null;
}

function toPublicMetadata(store: SkillMetadataStore) {
  return async (skillId: string): Promise<PublicSkillMetadata | null> => {
    const metadata = await store.get(skillId);
    if (!metadata) return null;
    return {
      name: metadata.name,
      description: metadata.description,
      githubUrl: metadata.githubUrl,
      license: metadata.license,
      maintainer: metadata.maintainer,
      declaredCategory: metadata.declaredCategory,
      githubStars: metadata.githubStars,
    };
  };
}

export interface SkillListResponse {
  skills: Array<{
    skillId: string;
    categories: Array<{ category: Category; sampleSize: number }>;
    metadata: PublicSkillMetadata | null;
  }>;
  nextCursor: string | null;
}

export async function listSkills(
  appPool: Pool,
  skillMetadataStore: SkillMetadataStore,
  options: { category?: Category; cursor?: string | null },
): Promise<SkillListResponse> {
  const { skills, nextCursor } = await listSkillSummaries(appPool, options);
  const getMetadata = toPublicMetadata(skillMetadataStore);
  const withMetadata = await Promise.all(
    skills.map(async (skill) => ({ ...skill, metadata: await getMetadata(skill.skillId) })),
  );
  return { skills: withMetadata, nextCursor };
}

export interface SkillDetailResponse {
  skillId: string;
  categories: Awaited<ReturnType<typeof aggregateSkillCategory>>[];
  aggregationSourceUrl: string;
  metadata: PublicSkillMetadata | null;
}

export async function getSkillDetail(
  appPool: Pool,
  skillMetadataStore: SkillMetadataStore,
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
  const metadata = await toPublicMetadata(skillMetadataStore)(skillId);
  return { skillId, categories, aggregationSourceUrl, metadata };
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
