-- Skill versioning proxy (RunResult.skill_content_hash, schema/src/schema.ts,
-- cli/src/skill/contentHash.ts). skill_id alone never changes when a skill's
-- author updates its content, which would otherwise let measurements from
-- different, unrelated versions of a skill silently aggregate together
-- under one skill_id with no way to tell.
--
-- Deliberately NOT part of the aggregation grouping key yet (still grouped
-- by skill_id + category, see aggregation/repo.ts) — splitting aggregation
-- by exact content hash would fragment already-small sample sizes across
-- every trivial skill edit. For now this is tracked and surfaced
-- (SkillCategoryMetrics.distinctContentHashCount) as a transparency signal,
-- not used to partition the numbers — a harder split is a decision for
-- later, once real data shows how much drift actually happens in practice.
--
-- Existing rows predate this column and have no real hash to backfill —
-- '' marks "unknown/pre-versioning", never a value a real hash can produce
-- (sha256 hex is always 64 chars), so it can never collide with genuine data.
ALTER TABLE run_results ADD COLUMN IF NOT EXISTS skill_content_hash text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS run_results_skill_hash_idx
  ON run_results (skill_id, skill_content_hash);
