import { describe, expect, it } from "vitest";
import { toCsv } from "../src/api/export.js";
import type { SkillCategoryMetrics } from "../src/aggregation/metrics.js";

describe("toCsv", () => {
  it("emits only aggregated numbers, never raw run_id/account_id/content_ref (acceptance criterion)", () => {
    const metrics: SkillCategoryMetrics[] = [
      {
        skillId: "skill_x",
        category: "debugging",
        sampleSize: 12,
        successDelta: { medianDelta: 1, confidenceInterval: { low: 0.5, high: 1 }, sampleSize: 12 },
        tokensDelta: { medianDelta: 500, confidenceInterval: { low: 100, high: 900 }, sampleSize: 12 },
        durationDelta: { medianDelta: 30, confidenceInterval: { low: 10, high: 50 }, sampleSize: 12 },
        securityDelta: { medianDelta: 2, confidenceInterval: { low: 0, high: 4 }, sampleSize: 8 },
      },
    ];
    const csv = toCsv(metrics);
    expect(csv).toContain("skill_x,debugging,12");
    expect(csv).toContain("500");
    expect(csv.split("\n")[0]).toBe(
      "skill_id,category,sample_size,success_delta_median,success_delta_ci_low,success_delta_ci_high,tokens_delta_median,tokens_delta_ci_low,tokens_delta_ci_high,duration_delta_median,duration_delta_ci_low,duration_delta_ci_high,security_delta_median,security_delta_ci_low,security_delta_ci_high,security_delta_sample_size",
    );
    // No field named after a raw identifier anywhere in the output.
    expect(csv).not.toMatch(/run_id|account_id|content_ref/);
  });

  it("handles a skill+category with no security data gracefully", () => {
    const metrics: SkillCategoryMetrics[] = [
      {
        skillId: "skill_y",
        category: "docs",
        sampleSize: 4,
        successDelta: { medianDelta: null, confidenceInterval: null, sampleSize: 0 },
        tokensDelta: { medianDelta: 5, confidenceInterval: null, sampleSize: 4 },
        durationDelta: { medianDelta: 1, confidenceInterval: null, sampleSize: 4 },
        securityDelta: null,
      },
    ];
    expect(() => toCsv(metrics)).not.toThrow();
  });
});
