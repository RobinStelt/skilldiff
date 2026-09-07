import { randomUUID } from "node:crypto";
import type { AdminUser, AdminUserStore } from "../../src/admin/adminUserStore.js";
import type { AdminSessionStore } from "../../src/admin/sessions.js";
import type {
  SkillMetadata,
  SkillMetadataStore,
  UpsertSkillMetadataInput,
} from "../../src/admin/skillMetadataStore.js";
import { hashPassword } from "../../src/admin/passwords.js";

export function createFakeAdminUserStore(
  users: AdminUser[] = [],
): AdminUserStore & { users: Map<string, AdminUser> } {
  const byUsername = new Map(users.map((u) => [u.username, u]));
  return {
    users: byUsername,
    async getByUsername(username) {
      return byUsername.get(username) ?? null;
    },
  };
}

/** Convenience for tests that just need one known admin with a known password. */
export function createFakeAdminUserStoreWithOneUser(
  username: string,
  password: string,
): AdminUserStore & { userId: string } {
  const id = randomUUID();
  const store = createFakeAdminUserStore([{ id, username, passwordHash: hashPassword(password) }]);
  return { ...store, userId: id };
}

export function createFakeAdminSessionStore(): AdminSessionStore & { tokens: Map<string, string> } {
  const tokens = new Map<string, string>(); // token -> adminUserId
  return {
    tokens,
    async create(adminUserId) {
      const token = randomUUID();
      tokens.set(token, adminUserId);
      return { token, expiresAt: new Date(Date.now() + 1000 * 60 * 60) };
    },
    async verify(token) {
      const adminUserId = tokens.get(token);
      return adminUserId ? { adminUserId } : null;
    },
    async revoke(token) {
      tokens.delete(token);
    },
  };
}

export function createFakeSkillMetadataStore(
  seed: SkillMetadata[] = [],
): SkillMetadataStore & { rows: Map<string, SkillMetadata> } {
  const rows = new Map(seed.map((s) => [s.skillId, s]));
  return {
    rows,
    async get(skillId) {
      return rows.get(skillId) ?? null;
    },
    async listAll() {
      return [...rows.values()];
    },
    async upsert(input: UpsertSkillMetadataInput) {
      const now = new Date().toISOString();
      const existing = rows.get(input.skillId);
      const metadata: SkillMetadata = {
        skillId: input.skillId,
        name: input.name,
        description: input.description ?? null,
        githubUrl: input.githubUrl ?? null,
        license: input.license ?? null,
        maintainer: input.maintainer ?? null,
        declaredCategory: input.declaredCategory ?? null,
        githubStars:
          input.githubStars !== undefined
            ? input.githubStars
            : existing?.githubUrl !== (input.githubUrl ?? null)
              ? null
              : (existing?.githubStars ?? null),
        githubStarsFetchedAt:
          input.githubStars !== undefined || existing?.githubUrl !== (input.githubUrl ?? null)
            ? null
            : (existing?.githubStarsFetchedAt ?? null),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      rows.set(input.skillId, metadata);
      return metadata;
    },
    async delete(skillId) {
      rows.delete(skillId);
    },
    async setGithubStars(skillId, stars, fetchedAt) {
      const existing = rows.get(skillId);
      if (existing) {
        existing.githubStars = stars;
        existing.githubStarsFetchedAt = fetchedAt.toISOString();
      }
    },
  };
}
