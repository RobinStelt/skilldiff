import { legacyExecution, matchesExecution, type Execution, type ExecutionFilter } from "@skilldiff/schema";
import type { Pool } from "pg";
import type { Category } from "@skilldiff/schema";
import { fetchStoredRunResults, listSkillCategoryPairs } from "../aggregation/repo.js";
import { aggregateExecutionGroups, aggregateSkillCategory } from "../aggregation/metrics.js";
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
    categories: Array<{ category: Category; sampleSize: number; execution?: Execution }>;
    metadata: PublicSkillMetadata | null;
  }>;
  nextCursor: string | null;
}

export async function listSkills(
  appPool: Pool,
  skillMetadataStore: SkillMetadataStore,
  options: { category?: Category; cursor?: string | null } & ExecutionFilter,
): Promise<SkillListResponse> {
  // Catalog visibility is independent of measurement aggregation. Category
  // filters still refer exclusively to measured task categories.
  const { rows: ids } = await appPool.query(
    `WITH visible_skills AS (
       SELECT skill_id FROM run_results WHERE ($1::text IS NULL OR category = $1) AND ($3::text IS NULL OR execution->>'agent' = $3) AND ($4::text IS NULL OR execution->>'model' = $4) AND ($5::text IS NULL OR COALESCE(execution->>'reasoning_effort', '') = $5)
       UNION
       SELECT skill_id FROM skill_metadata WHERE $1::text IS NULL AND $3::text IS NULL AND $4::text IS NULL AND $5::text IS NULL
     )
     SELECT skill_id FROM visible_skills
     WHERE ($2::text IS NULL OR skill_id > $2)
     ORDER BY skill_id LIMIT 21`,
    [options.category ?? null, options.cursor ?? null, options.agent ?? null, options.model ?? null, options.reasoning_effort ?? null],
  );
  const page: string[] = ids.slice(0, 20).map((row) => row.skill_id as string);
  const nextCursor = ids.length > 20 ? page[page.length - 1]! : null;
  if (page.length === 0) return { skills: [], nextCursor: null };
  const { rows } = await appPool.query(
    `SELECT skill_id, category, execution - 'agent_version' AS execution, COUNT(*) AS sample_size FROM run_results
     WHERE skill_id = ANY($1::text[]) AND ($2::text IS NULL OR execution->>'agent' = $2) AND ($3::text IS NULL OR execution->>'model' = $3) AND ($4::text IS NULL OR COALESCE(execution->>'reasoning_effort', '') = $4)
     GROUP BY skill_id, category, execution - 'agent_version' ORDER BY skill_id, category`,
    [page, options.agent ?? null, options.model ?? null, options.reasoning_effort ?? null],
  );
  const skills = page.map((skillId) => ({
    skillId,
    categories: rows
      .filter((row) => row.skill_id === skillId)
      .map((row) => ({
        category: row.category as Category,
        sampleSize: Number(row.sample_size),
        execution: { ...row.execution, agent_version: "multiple" },
      })),
  }));
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
  filter: ExecutionFilter = {},
): Promise<SkillDetailResponse | null> {
  const pairs = await listSkillCategoryPairs(appPool, skillId);
  const metadata = await toPublicMetadata(skillMetadataStore)(skillId);
  if (pairs.length === 0 && !metadata) return null;

  const categories = [];
  for (const pair of pairs) {
    const records = await fetchStoredRunResults(appPool, pair.skillId, pair.category);
    categories.push(...aggregateExecutionGroups(pair.skillId, pair.category, records.filter((r) => matchesExecution(r.execution ?? legacyExecution, filter))));
  }
  return { skillId, categories, aggregationSourceUrl, metadata };
}

export function exportUrlFor(skillId: string, category: Category, execution?: Execution): string {
  const query = new URLSearchParams({ category });
  if (execution) { query.set("agent", execution.agent); query.set("model", execution.model); query.set("reasoning_effort", execution.reasoning_effort ?? ""); }
  return `/api/skills/${encodeURIComponent(skillId)}/export?${query}`;
}

/**
 * Raw, unaggregated records behind one skill+category slice — briefing
 * point 6 ("Nachrechenbarkeit"): a third party must be able to spot-check
 * the displayed aggregate against the actual data, not just trust it.
 * Still excludes plaintext content (content_ref/content lives only in the
 * access-restricted run_result_content table and is never joined in here).
 */
export interface RawExportRecord {
  execution?: Execution;
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
  filter: ExecutionFilter = {},
): Promise<RawExportRecord[]> {
  const records = await fetchStoredRunResults(appPool, skillId, category);
  return records.filter((r) => matchesExecution(r.execution ?? legacyExecution, filter)).map((r) => ({
    execution: r.execution ?? legacyExecution,
    runId: r.runId,
    accountId: r.accountId,
    isolationTier: r.isolationTier,
    weight: r.weight,
    withSkill: r.withSkill,
    withoutSkill: r.withoutSkill,
    securityDelta: r.securityDelta,
  }));
}
