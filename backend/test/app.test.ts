import { describe, expect, it } from "vitest";
import { buildApp, type AppDeps } from "../src/app.js";
import { createInMemoryAccountStore } from "../src/accounts/accountStore.js";
import { createFakeContentRepo, createFakeRunResultRepo } from "./helpers/fakeRepos.js";
import { buildSignedRunResult } from "./helpers/fixtures.js";
import type { SkillCategoryMetrics } from "../src/aggregation/metrics.js";

const NO_TIER_BREAKDOWN = { A: 0, B: 0, C: 0 };

function defaultPublicApiDeps(): Pick<AppDeps, "listSkills" | "getSkillDetail" | "getRawExportRecords"> {
  return {
    listSkills: async () => ({ skills: [], nextCursor: null }),
    getSkillDetail: async () => null,
    getRawExportRecords: async () => [],
  };
}

function makeApp(overrides: Partial<AppDeps> = {}) {
  const accountStore = createInMemoryAccountStore();
  const runResultRepo = createFakeRunResultRepo();
  const contentRepo = createFakeContentRepo();
  const app = buildApp({
    accountStore,
    runResultRepo,
    contentRepo,
    trustedHashes: new Set(),
    getSkillMetrics: async () => [],
    getAllSkillMetrics: async () => [],
    ...defaultPublicApiDeps(),
    ...overrides,
  });
  return { app, accountStore, runResultRepo, contentRepo };
}

describe("POST /v1/accounts", () => {
  it("registers a new account", async () => {
    const { app } = makeApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/accounts",
      payload: { account_id: "acct_1", signing_secret: "secret" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("rejects re-registration with a different secret", async () => {
    const { app } = makeApp();
    await app.inject({ method: "POST", url: "/v1/accounts", payload: { account_id: "acct_1", signing_secret: "secret" } });
    const res = await app.inject({
      method: "POST",
      url: "/v1/accounts",
      payload: { account_id: "acct_1", signing_secret: "different" },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("POST /v1/run-results", () => {
  it("rejects an invalid signature with 401 (acceptance criterion)", async () => {
    const { app } = makeApp();
    await app.inject({ method: "POST", url: "/v1/accounts", payload: { account_id: "acct_5b7d21", signing_secret: "s3cret" } });

    const runResult = buildSignedRunResult("s3cret");
    const tampered = { ...runResult, cli_version: "tampered" };
    const res = await app.inject({ method: "POST", url: "/v1/run-results", payload: tampered });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("invalid_signature");
  });

  it("rejects a schema-invalid payload with 400 (acceptance criterion)", async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: "POST", url: "/v1/run-results", payload: { not: "a run result" } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_payload");
  });

  it("accepts a valid signed run result from a registered account", async () => {
    const { app } = makeApp();
    await app.inject({ method: "POST", url: "/v1/accounts", payload: { account_id: "acct_5b7d21", signing_secret: "s3cret" } });
    const runResult = buildSignedRunResult("s3cret");
    const res = await app.inject({ method: "POST", url: "/v1/run-results", payload: runResult });
    expect(res.statusCode).toBe(201);
  });
});

describe("GET /v1/skills/:skillId/metrics", () => {
  it("returns results keyed by category, never a single merged score (acceptance criterion)", async () => {
    const metricsByCategory: SkillCategoryMetrics[] = [
      {
        skillId: "skill_x",
        category: "debugging",
        sampleSize: 5,
        successDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 5 },
        tokensDelta: { medianDelta: 10, confidenceInterval: null, sampleSize: 5 },
        durationDelta: { medianDelta: 2, confidenceInterval: null, sampleSize: 5 },
        securityDelta: null,
        isolationTierBreakdown: NO_TIER_BREAKDOWN,
        distinctAccountCount: 1,
        seedDataMajority: false,
      },
      {
        skillId: "skill_x",
        category: "docs",
        sampleSize: 3,
        successDelta: { medianDelta: 0, confidenceInterval: null, sampleSize: 3 },
        tokensDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 3 },
        durationDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 3 },
        securityDelta: null,
        isolationTierBreakdown: NO_TIER_BREAKDOWN,
        distinctAccountCount: 1,
        seedDataMajority: false,
      },
    ];
    const { app } = makeApp({ getSkillMetrics: async () => metricsByCategory });

    const res = await app.inject({ method: "GET", url: "/v1/skills/skill_x/metrics" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.metrics_by_category)).toBe(true);
    expect(body.metrics_by_category).toHaveLength(2);
    expect(new Set(body.metrics_by_category.map((m: SkillCategoryMetrics) => m.category))).toEqual(
      new Set(["debugging", "docs"]),
    );
    expect(body).not.toHaveProperty("score");
    expect(body).not.toHaveProperty("overall_score");
  });
});

describe("GET /api/skills", () => {
  it("passes category and cursor through to listSkills", async () => {
    let received: unknown;
    const { app } = makeApp({
      listSkills: async (options) => {
        received = options;
        return { skills: [{ skillId: "skill_x", categories: [{ category: "debugging", sampleSize: 5 }] }], nextCursor: null };
      },
    });
    const res = await app.inject({ method: "GET", url: "/api/skills?category=debugging&cursor=skill_a" });
    expect(res.statusCode).toBe(200);
    expect(received).toEqual({ category: "debugging", cursor: "skill_a" });
    expect(res.json().skills[0].skillId).toBe("skill_x");
  });

  it("ignores an invalid category instead of erroring", async () => {
    let received: unknown;
    const { app } = makeApp({
      listSkills: async (options) => {
        received = options;
        return { skills: [], nextCursor: null };
      },
    });
    await app.inject({ method: "GET", url: "/api/skills?category=not-a-real-category" });
    expect((received as { category?: string }).category).toBeUndefined();
  });
});

describe("GET /api/skills/:skillId", () => {
  it("404s for an unknown skill", async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: "GET", url: "/api/skills/does-not-exist" });
    expect(res.statusCode).toBe(404);
  });

  it("adds a per-category exportUrl and passes through the seed/tier/diversity fields", async () => {
    const { app } = makeApp({
      getSkillDetail: async (skillId) => ({
        skillId,
        aggregationSourceUrl: "https://example.com/agg",
        categories: [
          {
            skillId,
            category: "debugging",
            sampleSize: 5,
            successDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 5 },
            tokensDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 5 },
            durationDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 5 },
            securityDelta: null,
            isolationTierBreakdown: { A: 3, B: 1, C: 1 },
            distinctAccountCount: 4,
            seedDataMajority: true,
          },
        ],
      }),
    });
    const res = await app.inject({ method: "GET", url: "/api/skills/skill_x" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.aggregationSourceUrl).toBe("https://example.com/agg");
    expect(body.categories[0].exportUrl).toBe("/api/skills/skill_x/export?category=debugging");
    expect(body.categories[0].isolationTierBreakdown).toEqual({ A: 3, B: 1, C: 1 });
    expect(body.categories[0].distinctAccountCount).toBe(4);
    expect(body.categories[0].seedDataMajority).toBe(true);
  });
});

describe("GET /api/skills/:skillId/export", () => {
  it("requires a category query parameter", async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: "GET", url: "/api/skills/skill_x/export" });
    expect(res.statusCode).toBe(400);
  });

  it("returns the raw records behind one skill+category slice, no content_ref", async () => {
    const { app } = makeApp({
      getRawExportRecords: async () => [
        {
          runId: "run_1",
          accountId: "acct_1",
          isolationTier: "A",
          weight: 0.8,
          withSkill: { success: true, tokens: 10, duration_sec: 1 },
          withoutSkill: { success: true, tokens: 20, duration_sec: 2 },
          securityDelta: null,
        },
      ],
    });
    const res = await app.inject({ method: "GET", url: "/api/skills/skill_x/export?category=debugging" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.records).toHaveLength(1);
    expect(body.records[0]).not.toHaveProperty("content_ref");
    expect(body.records[0]).not.toHaveProperty("contentRef");
  });
});
