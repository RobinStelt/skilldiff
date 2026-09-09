import type { ExecutionFilter } from "@skilldiff/schema";
import type { Category, SkillDetail, SkillListResponse } from "./types.js";

export interface MarketplaceApiClient {
  listSkills(params: { category?: Category; cursor?: string | null } & ExecutionFilter): Promise<SkillListResponse>;
  getSkill(skillId: string, filter?: ExecutionFilter): Promise<SkillDetail>;
}

/** HTTP client for the public marketplace API. */
export function createHttpApiClient(baseUrl: string): MarketplaceApiClient {
  return {
    async listSkills({ category, cursor, agent, model }) {
      const url = new URL("/api/skills", baseUrl);
      if (agent) url.searchParams.set("agent", agent);
      if (model) url.searchParams.set("model", model);
      if (category) url.searchParams.set("category", category);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
      return (await response.json()) as SkillListResponse;
    },

    async getSkill(skillId, filter = {}) {
      const url = new URL(`/api/skills/${encodeURIComponent(skillId)}`, baseUrl);
      if (filter.agent) url.searchParams.set("agent", filter.agent);
      if (filter.model) url.searchParams.set("model", filter.model);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
      return (await response.json()) as SkillDetail;
    },
  };
}
