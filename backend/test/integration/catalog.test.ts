import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { createPgSkillMetadataStore } from "../../src/admin/skillMetadataStore.js";
import { getSkillDetail, listSkills } from "../../src/api/publicApi.js";

const databaseUrl = process.env.TEST_DATABASE_URL_APP_ROLE;
describe.skipIf(!databaseUrl)("public catalog and editable metadata (Postgres)", () => {
  let pool: Pool;
  let client: PoolClient;
  let queryPool: Pool;
  const prefix = `zz_catalog_test_${randomUUID()}`;
  const adminId = randomUUID();

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    client = await pool.connect();
    queryPool = client as unknown as Pool;
    await client.query("BEGIN");
    await client.query("INSERT INTO admin_users (id, username, password_hash) VALUES ($1,$2,$3)", [
      adminId,
      prefix,
      "unused-test-hash",
    ]);
  });
  afterAll(async () => {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    if (pool) await pool.end();
  });

  it("makes a metadata-only skill available without inventing measured categories", async () => {
    const store = createPgSkillMetadataStore(queryPool);
    await store.upsert({
      skillId: prefix,
      name: "Catalog-only skill",
      declaredCategory: "marketing",
      githubStars: 0,
      createdBy: adminId,
    });
    const result = await listSkills(queryPool, store, { cursor: `${prefix.slice(0, -1)}` });
    expect(result.skills.find((skill) => skill.skillId === prefix)).toMatchObject({
      categories: [],
      metadata: { githubStars: 0 },
    });
    const detail = await getSkillDetail(queryPool, store, prefix, "https://example.com/source");
    expect(detail).toMatchObject({ categories: [], metadata: { name: "Catalog-only skill" } });
    const filtered = await listSkills(queryPool, store, {
      category: "marketing",
      cursor: `${prefix.slice(0, -1)}`,
    });
    expect(filtered.skills.some((skill) => skill.skillId === prefix)).toBe(false);
  });

  it("preserves fetched stars on unrelated edits and clears stale stars when the repository changes", async () => {
    const store = createPgSkillMetadataStore(queryPool);
    const input = {
      skillId: `${prefix}_stars`,
      name: "Stars",
      githubUrl: "https://github.com/example/original",
      createdBy: adminId,
    };
    await store.upsert(input);
    await store.setGithubStars(input.skillId, 123, new Date("2026-09-06T00:00:00Z"));
    expect(await store.upsert({ ...input, name: "Renamed" })).toMatchObject({
      githubStars: 123,
      githubStarsFetchedAt: "2026-09-06T00:00:00.000Z",
    });
    expect(await store.upsert({ ...input, githubStars: 0 })).toMatchObject({
      githubStars: 0,
      githubStarsFetchedAt: null,
    });
    await store.setGithubStars(input.skillId, 456, new Date());
    expect(await store.upsert({ ...input, githubUrl: "https://github.com/example/different" })).toMatchObject(
      { githubStars: null, githubStarsFetchedAt: null },
    );
  });
});
