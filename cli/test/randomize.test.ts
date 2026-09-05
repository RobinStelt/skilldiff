import { describe, expect, it } from "vitest";
import { randomizeOrder } from "../src/orchestration/randomize.js";

describe("randomizeOrder", () => {
  it("puts with_skill first when rng < 0.5", () => {
    const r = randomizeOrder(() => 0.1);
    expect(r.first).toBe("with_skill");
    expect(r.second).toBe("without_skill");
    expect(r.randomized).toBe(true);
  });

  it("puts without_skill first when rng >= 0.5", () => {
    const r = randomizeOrder(() => 0.9);
    expect(r.first).toBe("without_skill");
    expect(r.second).toBe("with_skill");
  });

  it("produces both conditions as first over many runs (no bias from an implementation bug)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(randomizeOrder(Math.random).first);
    }
    expect(results.has("with_skill")).toBe(true);
    expect(results.has("without_skill")).toBe(true);
  });
});
