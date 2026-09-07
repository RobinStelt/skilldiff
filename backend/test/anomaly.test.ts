import { describe, expect, it } from "vitest";
import {
  ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS,
  ANOMALY_UPLOAD_BURST_SAME_SKILL,
  detectAnomalies,
  type RunRecordForAnomalyCheck,
} from "../src/anomaly/detect.js";
import type { Category } from "@skilldiff/schema";

function record(overrides: Partial<RunRecordForAnomalyCheck> & { runId: string }): RunRecordForAnomalyCheck {
  return {
    accountId: "acct_perfect",
    skillId: "skill_x",
    category: "feature",
    withSkillSuccess: true,
    ...overrides,
  };
}

describe("detectAnomalies", () => {
  it("flags a fresh account with 50 perfect uploads for the same skill (acceptance criterion)", () => {
    const categories: Category[] = ["debugging", "feature", "refactoring", "docs", "marketing"];
    const records: RunRecordForAnomalyCheck[] = Array.from({ length: 50 }, (_, i) =>
      record({
        runId: `run_${i}`,
        accountId: "acct_perfect",
        skillId: "skill_x",
        category: categories[i % categories.length]!,
        withSkillSuccess: true,
      }),
    );

    const { accountFlags, recordFlags } = detectAnomalies(records);

    expect(accountFlags.get("acct_perfect")).toEqual(
      expect.arrayContaining([ANOMALY_PERFECT_SUCCESS_HETEROGENEOUS, ANOMALY_UPLOAD_BURST_SAME_SKILL]),
    );
    // Every one of the 50 records is still present, just flagged for review
    // — nothing is dropped (briefing point 5).
    expect(recordFlags.size).toBe(50);
  });

  it("does not flag heterogeneous, imperfect, organic-looking usage", () => {
    const records: RunRecordForAnomalyCheck[] = [
      record({ runId: "r1", category: "debugging", withSkillSuccess: true }),
      record({ runId: "r2", category: "feature", withSkillSuccess: false }),
      record({ runId: "r3", category: "docs", withSkillSuccess: true }),
    ];
    const { accountFlags, recordFlags } = detectAnomalies(records);
    expect(accountFlags.size).toBe(0);
    expect(recordFlags.size).toBe(0);
  });

  it("does not flag perfect success in a single category (could just be an easy category)", () => {
    const records: RunRecordForAnomalyCheck[] = Array.from({ length: 15 }, (_, i) =>
      record({ runId: `r${i}`, category: "docs", withSkillSuccess: true }),
    );
    const { accountFlags } = detectAnomalies(records);
    expect(accountFlags.size).toBe(0);
  });

  it("does not flag a small number of uploads for the same skill", () => {
    const records: RunRecordForAnomalyCheck[] = Array.from({ length: 5 }, (_, i) =>
      record({ runId: `r${i}`, skillId: "skill_y", accountId: "acct_normal", withSkillSuccess: i % 2 === 0 }),
    );
    const { accountFlags } = detectAnomalies(records);
    expect(accountFlags.has("acct_normal")).toBe(false);
  });
});
