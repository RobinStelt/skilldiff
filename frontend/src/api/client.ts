import type { Category, SkillDetail, SkillListResponse } from "./types.js";

export interface MarketplaceApiClient {
  listSkills(params: { category?: Category; cursor?: string | null }): Promise<SkillListResponse>;
  getSkill(skillId: string): Promise<SkillDetail>;
}

/**
 * Real HTTP client against the future backend endpoints. Paths follow the
 * contract documented in `../../README.md` — the backend doesn't serve
 * these yet (no `src/server.ts` in `backend/` at the time this was
 * written), so this client can't be exercised end-to-end until that lands.
 * Everything else in this app is built and tested against
 * `createMockApiClient` instead.
 */
export function createHttpApiClient(baseUrl: string): MarketplaceApiClient {
  return {
    async listSkills({ category, cursor }) {
      const url = new URL("/api/skills", baseUrl);
      if (category) url.searchParams.set("category", category);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
      return (await response.json()) as SkillListResponse;
    },

    async getSkill(skillId) {
      const url = new URL(`/api/skills/${encodeURIComponent(skillId)}`, baseUrl);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
      return (await response.json()) as SkillDetail;
    },
  };
}
