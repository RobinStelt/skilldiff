import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createInMemoryAccountStore } from "../src/accounts/accountStore.js";
import { createFakeContentRepo, createFakeRunResultRepo } from "./helpers/fakeRepos.js";
import { buildSignedRunResult } from "./helpers/fixtures.js";
import type { SkillCategoryMetrics } from "../src/aggregation/metrics.js";

function makeApp() {
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
      { skillId: "skill_x", category: "debugging", sampleSize: 5, successDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 5 }, tokensDelta: { medianDelta: 10, confidenceInterval: null, sampleSize: 5 }, durationDelta: { medianDelta: 2, confidenceInterval: null, sampleSize: 5 }, securityDelta: null },
      { skillId: "skill_x", category: "docs", sampleSize: 3, successDelta: { medianDelta: 0, confidenceInterval: null, sampleSize: 3 }, tokensDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 3 }, durationDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 3 }, securityDelta: null },
    ];
    const accountStore = createInMemoryAccountStore();
    const app = buildApp({
      accountStore,
      runResultRepo: createFakeRunResultRepo(),
      contentRepo: createFakeContentRepo(),
      trustedHashes: new Set(),
      getSkillMetrics: async () => metricsByCategory,
      getAllSkillMetrics: async () => [],
    });

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
