export interface AdminSkillRecord {
  skillId: string;
  name: string;
  description: string | null;
  githubUrl: string | null;
  license: string | null;
  maintainer: string | null;
  declaredCategory: string | null;
  githubStars: number | null;
}

export interface AdminSkillInput {
  name: string;
  description?: string | null;
  githubUrl?: string | null;
  license?: string | null;
  maintainer?: string | null;
  declaredCategory?: string | null;
  githubStars?: number | null;
}

export interface AdminApiClient {
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  listSkills(): Promise<AdminSkillRecord[]>;
  upsertSkill(skillId: string, input: AdminSkillInput): Promise<AdminSkillRecord>;
  deleteSkill(skillId: string): Promise<void>;
}

/** `credentials: "include"` on every call — the session lives in an HttpOnly cookie (backend/src/api/adminRoutes.ts), never in JS-readable storage. */
export function createAdminApiClient(baseUrl: string): AdminApiClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(new URL(path, baseUrl), { ...init, credentials: "include" });
  }

  return {
    async login(username, password) {
      const response = await request("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error("Invalid username or password");
    },

    async logout() {
      await request("/api/admin/logout", { method: "POST" });
    },

    async isAuthenticated() {
      const response = await request("/api/admin/me");
      return response.ok;
    },

    async listSkills() {
      const response = await request("/api/admin/skills");
      if (!response.ok) throw new Error("Not authenticated");
      const body = (await response.json()) as { skills: Array<Record<string, unknown>> };
      return body.skills.map((s) => ({
        skillId: s.skillId as string,
        name: s.name as string,
        description: (s.description as string | null) ?? null,
        githubUrl: (s.githubUrl as string | null) ?? null,
        license: (s.license as string | null) ?? null,
        maintainer: (s.maintainer as string | null) ?? null,
        declaredCategory: (s.declaredCategory as string | null) ?? null,
        githubStars: (s.githubStars as number | null) ?? null,
      }));
    },

    async upsertSkill(skillId, input) {
      const response = await request(`/api/admin/skills/${encodeURIComponent(skillId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to save skill");
      }
      const body = (await response.json()) as { skill: AdminSkillRecord };
      return body.skill;
    },

    async deleteSkill(skillId) {
      const response = await request(`/api/admin/skills/${encodeURIComponent(skillId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete skill");
    },
  };
}
