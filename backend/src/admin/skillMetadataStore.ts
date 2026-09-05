import type { Pool } from "pg";

export interface SkillMetadata {
  skillId: string;
  name: string;
  description: string | null;
  githubUrl: string | null;
  license: string | null;
  maintainer: string | null;
  /** Catalog/browse category — separate from the auto-detected run category that drives aggregation (see db/migrations/003, comment on skill_metadata.declared_category). */
  declaredCategory: string | null;
  githubStars: number | null;
  githubStarsFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSkillMetadataInput {
  skillId: string;
  name: string;
  description?: string | null;
  githubUrl?: string | null;
  license?: string | null;
  maintainer?: string | null;
  declaredCategory?: string | null;
  createdBy: string;
}

function rowToMetadata(row: Record<string, unknown>): SkillMetadata {
  return {
    skillId: row.skill_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    githubUrl: (row.github_url as string | null) ?? null,
    license: (row.license as string | null) ?? null,
    maintainer: (row.maintainer as string | null) ?? null,
    declaredCategory: (row.declared_category as string | null) ?? null,
    githubStars: (row.github_stars as number | null) ?? null,
    githubStarsFetchedAt: row.github_stars_fetched_at ? new Date(row.github_stars_fetched_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export interface SkillMetadataStore {
  get(skillId: string): Promise<SkillMetadata | null>;
  listAll(): Promise<SkillMetadata[]>;
  /** Create-or-replace (admin UI has one form for both — briefing-less feature, kept simple on purpose). */
  upsert(input: UpsertSkillMetadataInput): Promise<SkillMetadata>;
  delete(skillId: string): Promise<void>;
  setGithubStars(skillId: string, stars: number, fetchedAt: Date): Promise<void>;
}

export function createPgSkillMetadataStore(pool: Pool): SkillMetadataStore {
  return {
    async get(skillId) {
      const { rows } = await pool.query(`SELECT * FROM skill_metadata WHERE skill_id = $1`, [skillId]);
      return rows[0] ? rowToMetadata(rows[0]) : null;
    },

    async listAll() {
      const { rows } = await pool.query(`SELECT * FROM skill_metadata ORDER BY skill_id`);
      return rows.map(rowToMetadata);
    },

    async upsert(input) {
      const { rows } = await pool.query(
        `INSERT INTO skill_metadata (skill_id, name, description, github_url, license, maintainer, declared_category, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (skill_id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           github_url = EXCLUDED.github_url,
           license = EXCLUDED.license,
           maintainer = EXCLUDED.maintainer,
           declared_category = EXCLUDED.declared_category,
           updated_at = now()
         RETURNING *`,
        [
          input.skillId,
          input.name,
          input.description ?? null,
          input.githubUrl ?? null,
          input.license ?? null,
          input.maintainer ?? null,
          input.declaredCategory ?? null,
          input.createdBy,
        ],
      );
      return rowToMetadata(rows[0]);
    },

    async delete(skillId) {
      await pool.query(`DELETE FROM skill_metadata WHERE skill_id = $1`, [skillId]);
    },

    async setGithubStars(skillId, stars, fetchedAt) {
      await pool.query(`UPDATE skill_metadata SET github_stars = $2, github_stars_fetched_at = $3 WHERE skill_id = $1`, [
        skillId,
        stars,
        fetchedAt,
      ]);
    },
  };
}
