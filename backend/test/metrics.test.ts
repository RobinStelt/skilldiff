import { describe, expect, it } from "vitest";
import { aggregateSkillCategory, aggregateExecutionGroups, type StoredRunResult } from "../src/aggregation/metrics.js";

function baseRecord(overrides: Partial<StoredRunResult> = {}): StoredRunResult {
  return {
    runId: "r1",
    accountId: "acct_1",
    isSeedAccount: false,
    skillId: "skill_x",
    skillContentHash: "hash_1",
    category: "debugging",
    isolationTier: "A",
    weight: 1,
    withSkill: { success: true, tokens: 100, duration_sec: 10 },
    withoutSkill: { success: true, tokens: 150, duration_sec: 20 },
    securityDelta: null,
    ...overrides,
  };
}

describe("aggregateSkillCategory", () => {
  it("never mixes categories — output is scoped to exactly the category passed in", () => {
    const result = aggregateSkillCategory("skill_x", "debugging", [baseRecord()]);
    expect(result.category).toBe("debugging");
    expect(result.skillId).toBe("skill_x");
  });

  it("computes tokens/duration deltas as without_skill minus with_skill (positive = skill helped)", () => {
    const result = aggregateSkillCategory("skill_x", "debugging", [baseRecord()], { iterations: 20 });
    expect(result.tokensDelta.medianDelta).toBe(50);
    expect(result.durationDelta.medianDelta).toBe(10);
  });

  it("excludes null success values from the success delta instead of treating them as failure", () => {
    const records = [
      baseRecord({ runId: "r1", withSkill: { success: null, tokens: 1, duration_sec: 1 }, withoutSkill: { success: null, tokens: 1, duration_sec: 1 } }),
      baseRecord({ runId: "r2", withSkill: { success: true, tokens: 1, duration_sec: 1 }, withoutSkill: { success: false, tokens: 1, duration_sec: 1 } }),
    ];
    const result = aggregateSkillCategory("skill_x", "debugging", records, { iterations: 20 });
    expect(result.successDelta.sampleSize).toBe(1);
  });

  it("aggregates security_delta separately and never folds it into success (briefing point 3)", () => {
    const records = [
      baseRecord({
        runId: "r1",
        securityDelta: {
          with_skill: { critical: 0, high: 0, medium: 1, low: 0 },
          without_skill: { critical: 1, high: 0, medium: 0, low: 0 },
        },
      }),
    ];
    const result = aggregateSkillCategory("skill_x", "debugging", records, { iterations: 20 });
    // without_skill score (8) - with_skill score (2) = 6, positive = skill reduced findings.
    expect(result.securityDelta?.medianDelta).toBe(6);
    // success/tokens/duration stats are untouched by the security numbers.
    expect(result.tokensDelta.medianDelta).toBe(50);
  });

  it("returns null security delta when no record in this skill+category has one", () => {
    const result = aggregateSkillCategory("skill_x", "docs", [baseRecord({ category: "docs" })]);
    expect(result.securityDelta).toBeNull();
  });

  it("weights records by their trust weight, not just counting them equally", () => {
    const records = [
      baseRecord({ runId: "r1", weight: 100, withSkill: { success: true, tokens: 0, duration_sec: 0 }, withoutSkill: { success: true, tokens: 10, duration_sec: 0 } }),
      baseRecord({ runId: "r2", weight: 1, withSkill: { success: true, tokens: 0, duration_sec: 0 }, withoutSkill: { success: true, tokens: 1000, duration_sec: 0 } }),
    ];
    const result = aggregateSkillCategory("skill_x", "debugging", records, { iterations: 20 });
    expect(result.tokensDelta.medianDelta).toBe(10);
  });

  it("counts records by isolation tier and distinct accounts", () => {
    const records = [
      baseRecord({ runId: "r1", accountId: "acct_a", isolationTier: "A" }),
      baseRecord({ runId: "r2", accountId: "acct_a", isolationTier: "A" }),
      baseRecord({ runId: "r3", accountId: "acct_b", isolationTier: "B" }),
      baseRecord({ runId: "r4", accountId: "acct_c", isolationTier: "C" }),
    ];
    const result = aggregateSkillCategory("skill_x", "debugging", records, { iterations: 20 });
    expect(result.isolationTierBreakdown).toEqual({ A: 2, B: 1, C: 1 });
    expect(result.distinctAccountCount).toBe(3);
  });

  it("flags seedDataMajority only once more than half the sample is from seed accounts", () => {
    const majoritySeed = [
      baseRecord({ runId: "r1", isSeedAccount: true }),
      baseRecord({ runId: "r2", isSeedAccount: true }),
      baseRecord({ runId: "r3", isSeedAccount: false }),
    ];
    const minoritySeed = [
      baseRecord({ runId: "r1", isSeedAccount: true }),
      baseRecord({ runId: "r2", isSeedAccount: false }),
      baseRecord({ runId: "r3", isSeedAccount: false }),
    ];
    expect(aggregateSkillCategory("skill_x", "debugging", majoritySeed).seedDataMajority).toBe(true);
    expect(aggregateSkillCategory("skill_x", "debugging", minoritySeed).seedDataMajority).toBe(false);
  });

  it("counts distinct content hashes so a skill measured across multiple versions is visible, not silently merged", () => {
    const sameVersion = [baseRecord({ runId: "r1" }), baseRecord({ runId: "r2" })];
    expect(aggregateSkillCategory("skill_x", "debugging", sameVersion).distinctContentHashCount).toBe(1);

    const mixedVersions = [
      baseRecord({ runId: "r1", skillContentHash: "hash_1" }),
      baseRecord({ runId: "r2", skillContentHash: "hash_2" }),
    ];
    expect(aggregateSkillCategory("skill_x", "debugging", mixedVersions).distinctContentHashCount).toBe(2);
  });
});


it("separates agents, models and reasoning settings, including legacy unknown models", () => {
  const execution = { agent: "codex" as const, model: "model-a", agent_version: "1", reasoning_effort: "medium" };
  const records = [baseRecord(), baseRecord({ execution }), baseRecord({ execution: { ...execution, model: "model-b" } }), baseRecord({ execution: { ...execution, reasoning_effort: "high" } })];
  expect(aggregateExecutionGroups("skill_x", "debugging", records).map((group) => group.sampleSize)).toEqual([1, 1, 1, 1]);
  expect(() => aggregateSkillCategory("skill_x", "debugging", records)).toThrow(/Cannot aggregate/);
});
