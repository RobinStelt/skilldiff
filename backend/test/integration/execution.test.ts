import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { createPgAccountStore } from "../../src/accounts/accountStore.js";
import { createPgRunResultRepo } from "../../src/ingestion/runResultRepo.js";
import { ingestRunResult } from "../../src/ingestion/ingestRunResult.js";
import { createPgSkillMetadataStore } from "../../src/admin/skillMetadataStore.js";
import { getSkillDetail, getRawExportRecords, listSkills, exportUrlFor } from "../../src/api/publicApi.js";
import { buildSignedRunResult } from "../helpers/fixtures.js";
import { createFakeContentRepo } from "../helpers/fakeRepos.js";

const url = process.env.TEST_DATABASE_URL_APP_ROLE;
describe.skipIf(!url)("execution cohorts (Postgres)", () => {
  let pool: Pool; let client: PoolClient; let db: Pool;
  beforeAll(async () => { pool = new Pool({ connectionString: url }); client = await pool.connect(); db = client as unknown as Pool; await client.query("BEGIN"); });
  afterAll(async () => { if (client) { await client.query("ROLLBACK"); client.release(); } if (pool) await pool.end(); });

  it("accepts signed Codex and legacy runs and isolates list, detail and raw exports", async () => {
    const accountId = randomUUID(); const skillId = `execution-${randomUUID()}`;
    const accountStore = createPgAccountStore(db);
    await accountStore.register(accountId, "test-secret");
    const deps = { accountStore, runResultRepo: createPgRunResultRepo(db), contentRepo: createFakeContentRepo(), trustedHashes: new Set<string>() };
    const execution = { agent: "codex" as const, model: "test-model", agent_version: "test", reasoning_effort: "medium" };
    const shared = { account_id: accountId, skill_id: skillId, content_opt_in: false, content_ref: null };
    const codex = buildSignedRunResult("test-secret", { ...shared, run_id: randomUUID(), claude_version: undefined, execution });
    const legacy = buildSignedRunResult("test-secret", { ...shared, run_id: randomUUID() });
    expect((await ingestRunResult(codex, deps)).ok).toBe(true);
    expect((await ingestRunResult(legacy, deps)).ok).toBe(true);
    const tampered = { ...codex, run_id: randomUUID(), execution: { ...execution, model: "tampered" } };
    expect(await ingestRunResult(tampered, deps)).toMatchObject({ ok: false, error: "invalid_signature" });
    const metadata = createPgSkillMetadataStore(db);
    const detail = await getSkillDetail(db, metadata, skillId, "https://example.com/source");
    expect(detail?.categories).toHaveLength(2);
    expect(detail?.categories.map((c) => c.sampleSize)).toEqual([1, 1]);
    const filtered = await getSkillDetail(db, metadata, skillId, "https://example.com/source", { agent: "codex", model: "test-model" });
    expect(filtered?.categories).toHaveLength(1);
    expect(filtered?.categories[0]?.execution).toEqual(execution);
    const listed = await listSkills(db, metadata, { agent: "codex", model: "test-model" });
    expect(listed.skills.find((s) => s.skillId === skillId)?.categories).toHaveLength(1);
    const raw = await getRawExportRecords(db, skillId, "feature", { agent: "codex", model: "test-model", reasoning_effort: "medium" });
    expect(raw).toHaveLength(1); expect(raw[0]?.runId).toBe(codex.run_id);
    expect(exportUrlFor(skillId, "feature", execution)).toContain("reasoning_effort=medium");
    expect(JSON.stringify(raw)).not.toMatch(/signing_secret|content_ref/);
  });
});
