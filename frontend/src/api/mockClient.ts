import { legacyExecution, matchesExecution } from "@skilldiff/schema";
import type { MarketplaceApiClient } from "./client.js";
import type { SkillDetail, SkillSummary } from "./types.js";

/**
 * In-memory implementation of `MarketplaceApiClient`, used for local
 * development and every test in this package while the real backend HTTP
 * layer doesn't exist yet. Data shape matches the documented API contract
 * exactly, so swapping in `createHttpApiClient` later is a one-line change
 * in `main.tsx`.
 */
export function createMockApiClient(skills: SkillDetail[]): MarketplaceApiClient {
  return {
    async listSkills({ category, ...filter }) {
      const summaries: SkillSummary[] = skills.map((skill) => ({
        skillId: skill.skillId,
        metadata: skill.metadata,
        categories: skill.categories
          .filter((c) => (!category || c.category === category) && matchesExecution(c.execution ?? legacyExecution, filter))
          .map((c) => ({ category: c.category, sampleSize: c.sampleSize, execution: c.execution })),
      }));
      return {
        skills: summaries.filter((s) => s.categories.length > 0 || (!category && !filter.agent && !filter.model && s.metadata !== null)),
        nextCursor: null,
      };
    },

    async getSkill(skillId, filter = {}) {
      const found = skills.find((s) => s.skillId === skillId);
      if (!found) throw new Error(`Unknown skill: ${skillId}`);
      return { ...found, categories: found.categories.filter((c) => matchesExecution(c.execution ?? legacyExecution, filter)) };
    },
  };
}
