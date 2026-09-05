import { describe, expect, it } from "vitest";
import { bootstrapMedianConfidenceInterval, computeDeltaStats, weightedMedian } from "../src/aggregation/stats.js";

describe("weightedMedian", () => {
  it("matches the plain median when all weights are equal", () => {
    const values = [1, 5, 3, 2, 4].map((value) => ({ value, weight: 1 }));
    expect(weightedMedian(values)).toBe(3);
  });

  it("is null for an empty input", () => {
    expect(weightedMedian([])).toBeNull();
  });

  it("pulls the result toward higher-weight values", () => {
    const values = [
      { value: 1, weight: 100 },
      { value: 100, weight: 1 },
    ];
    expect(weightedMedian(values)).toBe(1);
  });
});

describe("bootstrapMedianConfidenceInterval", () => {
  it("brackets the point estimate for a deterministic rng", () => {
    const values = [1, 2, 3, 4, 5].map((value) => ({ value, weight: 1 }));
    const rng = (() => {
      let seed = 0;
      return () => {
        seed = (seed + 0.137) % 1;
        return seed;
      };
    })();
    const ci = bootstrapMedianConfidenceInterval(values, { iterations: 200, rng });
    expect(ci).not.toBeNull();
    expect(ci!.low).toBeLessThanOrEqual(ci!.high);
  });

  it("is null for an empty input", () => {
    expect(bootstrapMedianConfidenceInterval([])).toBeNull();
  });
});

describe("computeDeltaStats", () => {
  it("reports sample size alongside median and CI", () => {
    const values = [1, 2, 3].map((value) => ({ value, weight: 1 }));
    const stats = computeDeltaStats(values, { iterations: 50 });
    expect(stats.sampleSize).toBe(3);
    expect(stats.medianDelta).toBe(2);
    expect(stats.confidenceInterval).not.toBeNull();
  });
});
